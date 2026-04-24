use pos::{Invoice, PosError};
use pos::AppState;
use rusqlite::OptionalExtension;
use tauri::State;
use std::io::Write;

/// Reads the configured printer port from settings and writes raw bytes to it.
/// On Linux this is typically /dev/usb/lp0 or /dev/ttyUSB0.
/// On Windows this is typically COM3 or \\.\COM3.
fn send_to_printer(conn: &rusqlite::Connection, data: &[u8]) -> Result<(), PosError> {
    let port: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'printer_port'",
            [],
            |row| row.get(0),
        )
        .optional()?;

    let port = match port {
        Some(p) if !p.is_empty() => p,
        _ => {
            return Err(PosError::ValidationError(
                "لم يتم تحديد منفذ الطابعة — اذهب إلى الإعدادات واختر المنفذ".to_string(),
            ));
        }
    };

    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .open(&port)
        .map_err(|e| {
            log::error!(target: "pos::printing", "Failed to open printer port {}: {:?}", port, e);
            PosError::BusinessRule(format!(
                "فشل الاتصال بالطابعة على المنفذ {}. تأكد من توصيل الطابعة",
                port
            ))
        })?;

    file.write_all(data).map_err(|e| {
        log::error!(target: "pos::printing", "Failed to write to printer: {:?}", e);
        PosError::BusinessRule("فشل إرسال البيانات للطابعة".to_string())
    })?;

    file.flush().map_err(|e| {
        log::error!(target: "pos::printing", "Failed to flush printer: {:?}", e);
        PosError::BusinessRule("فشل إتمام الطباعة".to_string())
    })?;

    log::info!(target: "pos::printing", "Sent {} bytes to printer on {}", data.len(), port);
    Ok(())
}

#[tauri::command]
pub fn print_receipt(
    invoice_id: String,
    state: State<AppState>,
) -> Result<(), PosError> {
    let conn = state.db.lock()?;
    let invoice: Invoice = conn
        .query_row(
            "SELECT i.id, i.uuid, i.branch_id, i.session_id, i.cashier_id, i.customer_id, \
             c.name_ar as customer_name_ar, i.invoice_number, i.invoice_type, i.status, \
             i.subtotal, i.discount_amount, i.vat_amount, i.total, i.payment_method, \
             i.notes, i.zatca_status, i.qr_code, i.created_at \
             FROM invoices i \
             LEFT JOIN customers c ON c.id = i.customer_id \
             WHERE i.id = ?1",
            [&invoice_id],
            |row| {
                Ok(Invoice {
                    id: row.get(0)?,
                    uuid: row.get(1)?,
                    branch_id: row.get(2)?,
                    session_id: row.get(3)?,
                    cashier_id: row.get(4)?,
                    customer_id: row.get(5)?,
                    customer_name_ar: row.get(6)?,
                    invoice_number: row.get(7)?,
                    invoice_type: row.get(8)?,
                    status: row.get(9)?,
                    subtotal: row.get(10)?,
                    discount_amount: row.get(11)?,
                    vat_amount: row.get(12)?,
                    total: row.get(13)?,
                    payment_method: row.get(14)?,
                    notes: row.get(15)?,
                    zatca_status: row.get(16)?,
                    qr_code: row.get(17)?,
                    lines: None,
                    payments: None,
                    created_at: row.get(18)?,
                })
            },
        )
        .map_err(|_| PosError::NotFound("الفاتورة غير موجودة".to_string()))?;

    // Fetch branch name for the receipt header
    let branch_name: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'branch_name_ar'",
            [],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "متجر الجملة".to_string());

    let mut lines_stmt = conn
        .prepare("SELECT product_name_ar, qty, unit_price, line_total FROM invoice_lines WHERE invoice_id = ?1")?;
    let lines: Vec<(String, f64, f64, f64)> = lines_stmt
        .query_map([&invoice_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, f64>(1)?,
                row.get::<_, f64>(2)?,
                row.get::<_, f64>(3)?,
            ))
        })
        .and_then(|rows| rows.collect())?;

    let mut payments_stmt = conn
        .prepare("SELECT method, amount FROM payments WHERE invoice_id = ?1")?;
    let payments: Vec<(String, f64)> = payments_stmt
        .query_map([&invoice_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
        })
        .and_then(|rows| rows.collect())?;

    // Build ESC/POS receipt bytes
    let mut receipt: Vec<u8> = Vec::new();
    // Initialize printer
    receipt.extend_from_slice(&[0x1B, 0x40]);
    // Center alignment
    receipt.extend_from_slice(&[0x1B, 0x61, 0x01]);
    receipt.extend_from_slice(branch_name.as_bytes());
    receipt.push(b'\n');
    receipt.extend_from_slice(b"----------------\n");
    // Left alignment
    receipt.extend_from_slice(&[0x1B, 0x61, 0x00]);
    receipt.extend_from_slice(format!("رقم الفاتورة: {}\n", invoice.invoice_number).as_bytes());
    receipt.extend_from_slice(format!("التاريخ: {}\n", invoice.created_at).as_bytes());
    receipt.extend_from_slice(format!("الكاشير: {}\n", invoice.cashier_id).as_bytes());
    receipt.extend_from_slice(b"----------------\n");

    for (name, qty, price, total) in &lines {
        receipt.extend_from_slice(format!("{}\n", name).as_bytes());
        receipt.extend_from_slice(format!("{} x {:.2} = {:.2}\n", qty, price, total).as_bytes());
    }

    receipt.extend_from_slice(b"----------------\n");
    receipt.extend_from_slice(format!("المجموع: {:.2}\n", invoice.subtotal).as_bytes());
    receipt.extend_from_slice(format!("الخصم: {:.2}\n", invoice.discount_amount).as_bytes());
    receipt.extend_from_slice(format!("ضريبة القيمة المضافة: {:.2}\n", invoice.vat_amount).as_bytes());
    // Bold on
    receipt.extend_from_slice(&[0x1B, 0x45, 0x01]);
    receipt.extend_from_slice(format!("الإجمالي: {:.2} ر.س\n", invoice.total).as_bytes());
    // Bold off
    receipt.extend_from_slice(&[0x1B, 0x45, 0x00]);
    receipt.extend_from_slice(b"----------------\n");

    for (method, amount) in &payments {
        let method_ar = match method.as_str() {
            "cash" => "نقدي",
            "card" => "بطاقة",
            "cliq" => "CLIQ",
            _ => method.as_str(),
        };
        receipt.extend_from_slice(format!("{}: {:.2}\n", method_ar, amount).as_bytes());
    }

    if invoice.qr_code.is_some() {
        receipt.extend_from_slice(b"----------------\n");
        receipt.extend_from_slice(&[0x1B, 0x61, 0x01]);
        receipt.extend_from_slice(b"[QR CODE]\n");
        receipt.extend_from_slice(&[0x1B, 0x61, 0x00]);
    }

    // Footer
    receipt.extend_from_slice(&[0x1B, 0x61, 0x01]);
    receipt.extend_from_slice("شكراً لزيارتكم\n".as_bytes());
    // Feed + cut
    receipt.extend_from_slice(&[0x1B, 0x64, 0x04]); // Feed 4 lines
    receipt.extend_from_slice(&[0x1D, 0x56, 0x00]); // Full cut

    // Send to the actual printer device
    send_to_printer(&conn, &receipt)?;

    log::info!(target: "pos::printing", "Receipt printed ({} bytes) for invoice_id={}", receipt.len(), invoice_id);
    Ok(())
}

#[tauri::command]
pub fn print_test_page(
    state: State<AppState>,
) -> Result<(), PosError> {
    let conn = state.db.lock()?;

    let mut receipt: Vec<u8> = Vec::new();
    receipt.extend_from_slice(&[0x1B, 0x40]);
    receipt.extend_from_slice(&[0x1B, 0x61, 0x01]);
    receipt.extend_from_slice("متجر الجملة\n".as_bytes());
    receipt.extend_from_slice("اختبار الطابعة\n".as_bytes());
    receipt.extend_from_slice(b"Printer Test Page\n");
    receipt.extend_from_slice(b"1234567890\n");
    receipt.extend_from_slice(b"----------------\n");
    receipt.extend_from_slice("إذا ظهرت هذه الصفحة فالطابعة تعمل بشكل صحيح\n".as_bytes());
    receipt.extend_from_slice(&[0x1B, 0x64, 0x04]);
    receipt.extend_from_slice(&[0x1D, 0x56, 0x00]);

    send_to_printer(&conn, &receipt)?;

    log::info!(target: "pos::printing", "Test page printed ({} bytes)", receipt.len());
    Ok(())
}

#[tauri::command]
pub fn get_available_ports() -> Result<Vec<String>, PosError> {
    let mut ports = Vec::new();

    #[cfg(target_os = "windows")]
    {
        for i in 1..=20 {
            let path = format!("COM{}", i);
            if std::fs::metadata(&format!("\\\\.\\{}", path)).is_ok() {
                ports.push(path);
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        use std::fs;
        // USB printers
        if let Ok(entries) = fs::read_dir("/dev/usb") {
            for entry in entries.flatten() {
                if let Ok(name) = entry.file_name().into_string() {
                    if name.starts_with("lp") {
                        ports.push(format!("/dev/usb/{}", name));
                    }
                }
            }
        }
        // Serial ports
        if let Ok(entries) = fs::read_dir("/dev") {
            for entry in entries.flatten() {
                if let Ok(name) = entry.file_name().into_string() {
                    if name.starts_with("ttyUSB") || name.starts_with("ttyACM") {
                        ports.push(format!("/dev/{}", name));
                    }
                }
            }
        }
    }

    log::info!(target: "pos::printing", "Detected {} printer ports", ports.len());
    Ok(ports)
}

#[tauri::command]
pub fn get_invoice_qr(
    invoice_id: String,
    state: State<AppState>,
) -> Result<String, PosError> {
    let conn = state.db.lock()?;
    let qr: Option<String> = conn
        .query_row(
            "SELECT qr_code FROM invoices WHERE id = ?1",
            [&invoice_id],
            |row| row.get(0),
        )
        .optional()?;
    Ok(qr.unwrap_or_default())
}