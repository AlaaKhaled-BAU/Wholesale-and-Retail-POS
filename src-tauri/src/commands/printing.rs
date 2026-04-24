use pos::Invoice;
use pos::AppState;
use pos::auth::{require_role, Role};
use pos::error::PosError;
use rusqlite::OptionalExtension;
use tauri::State;

#[tauri::command]
pub fn print_receipt(
    invoice_id: String,
    state: State<AppState>,
) -> Result<(), PosError> {
    let _token = require_role(&state, &[Role::Cashier])?;
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
        .map_err(|_| PosError::NotFound("الفاتورة غير موجودة".to_string()).to_string())?;

    let mut lines_stmt = conn
        .prepare(
            "SELECT product_name_ar, qty, unit_price, line_total \
             FROM invoice_lines WHERE invoice_id = ?1"
        )
        ?;

    let lines: Vec<(String, f64, f64, f64)> = lines_stmt
        .query_map([&invoice_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, f64>(1)?,
                row.get::<_, f64>(2)?,
                row.get::<_, f64>(3)?,
            ))
        })
        .and_then(|rows| rows.collect())
        ?;

    let mut payments_stmt = conn
        .prepare(
            "SELECT method, amount FROM payments WHERE invoice_id = ?1"
        )
        ?;

    let payments: Vec<(String, f64)> = payments_stmt
        .query_map([&invoice_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
        })
        .and_then(|rows| rows.collect())
        ?;

    let mut receipt: Vec<u8> = Vec::new();
    receipt.extend_from_slice(&[0x1B, 0x40]);
    receipt.extend_from_slice(&[0x1B, 0x61, 0x01]);
    receipt.extend_from_slice("متجر الجملة\n".as_bytes());
    receipt.extend_from_slice("الفرع الرئيسي\n".as_bytes());
    receipt.extend_from_slice("----------------\n".as_bytes());
    receipt.extend_from_slice(&[0x1B, 0x61, 0x00]);
    receipt.extend_from_slice(format!("رقم الفاتورة: {}\n", invoice.invoice_number).as_bytes());
    receipt.extend_from_slice(format!("التاريخ: {}\n", invoice.created_at).as_bytes());
    receipt.extend_from_slice(format!("الكاشير: {}\n", invoice.cashier_id).as_bytes());
    receipt.extend_from_slice("----------------\n".as_bytes());

    for (name, qty, price, total) in lines {
        receipt.extend_from_slice(format!("{}\n", name).as_bytes());
        receipt.extend_from_slice(
            format!("{} x {:.2} = {:.2}\n", qty, price, total).as_bytes(),
        );
    }

    receipt.extend_from_slice("----------------\n".as_bytes());
    receipt.extend_from_slice(format!("المجموع: {:.2}\n", invoice.subtotal).as_bytes());
    receipt.extend_from_slice(format!("الخصم: {:.2}\n", invoice.discount_amount).as_bytes());
    receipt.extend_from_slice(
        format!("ضريبة القيمة المضافة: {:.2}\n", invoice.vat_amount).as_bytes(),
    );
    receipt.extend_from_slice(&[0x1B, 0x45, 0x01]);
    receipt.extend_from_slice(format!("الإجمالي: {:.2} ر.س\n", invoice.total).as_bytes());
    receipt.extend_from_slice(&[0x1B, 0x45, 0x00]);
    receipt.extend_from_slice("----------------\n".as_bytes());

    for (method, amount) in payments {
        let method_ar = match method.as_str() {
            "cash" => "نقدي",
            "card" => "بطاقة",
            "cliq" => "CLIQ",
            _ => &method,
        };
        receipt.extend_from_slice(format!("{}: {:.2}\n", method_ar, amount).as_bytes());
    }

    if invoice.qr_code.is_some() {
        receipt.extend_from_slice("----------------\n".as_bytes());
        receipt.extend_from_slice(&[0x1B, 0x61, 0x01]);
        receipt.extend_from_slice("[QR CODE]\n".as_bytes());
        receipt.extend_from_slice(&[0x1B, 0x61, 0x00]);
    }

    receipt.extend_from_slice(&[0x1B, 0x61, 0x01]);
    receipt.extend_from_slice("شكراً لزيارتكم\n".as_bytes());
    receipt.extend_from_slice(&[0x1D, 0x56, 0x00]);

    // TODO: Implement actual printer output via serial port
    eprintln!("Receipt bytes ({} bytes)", receipt.len());

    Ok(())
}

#[tauri::command]
pub fn print_test_page() -> Result<(), PosError> {
    let mut receipt: Vec<u8> = Vec::new();
    receipt.extend_from_slice(&[0x1B, 0x40]);
    receipt.extend_from_slice(&[0x1B, 0x61, 0x01]);
    receipt.extend_from_slice("متجر الجملة\n".as_bytes());
    receipt.extend_from_slice("اختبار الطابعة\n".as_bytes());
    receipt.extend_from_slice("Printer Test Page\n".as_bytes());
    receipt.extend_from_slice(&[0x1D, 0x56, 0x00]);

    eprintln!("Test page bytes ({} bytes)", receipt.len());
    Ok(())
}

#[tauri::command]
pub fn get_available_ports() -> Result<Vec<String>, PosError> {
    #[cfg(target_os = "windows")]
    {
        let ports: Vec<String> = (1..=20).map(|i| format!("COM{}", i)).collect();
        Ok(ports)
    }

    #[cfg(not(target_os = "windows"))]
    {
        use std::fs;
        let mut ports = Vec::new();
        if let Ok(entries) = fs::read_dir("/dev") {
            for entry in entries.flatten() {
                if let Ok(name) = entry.file_name().into_string() {
                    if name.starts_with("tty") && (name.contains("USB") || name.contains("serial")) {
                        ports.push(format!("/dev/{}", name));
                    }
                }
            }
        }
        Ok(ports)
    }
}

#[tauri::command]
pub fn get_invoice_qr(
    invoice_id: String,
    state: State<AppState>,
) -> Result<String, PosError> {
    let _token = require_role(&state, &[Role::Cashier])?;
    let conn = state.db.lock()?;

    let qr: Option<String> = conn
        .query_row(
            "SELECT qr_code FROM invoices WHERE id = ?1",
            [&invoice_id],
            |row| row.get(0),
        )
        .optional()
        ?;

    Ok(qr.unwrap_or_default())
}
