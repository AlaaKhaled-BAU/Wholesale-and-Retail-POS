use pos::{Invoice, InvoiceLine, NewInvoice, Payment, RefundLine};
use pos::AppState;
use pos::auth::{require_role, Role};
use pos::error::PosError;
use rusqlite::OptionalExtension;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

fn map_invoice_row(row: &rusqlite::Row) -> Result<Invoice, rusqlite::Error> {
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
}

fn map_line_row(row: &rusqlite::Row) -> Result<InvoiceLine, rusqlite::Error> {
    Ok(InvoiceLine {
        id: row.get(0)?,
        invoice_id: row.get(1)?,
        product_id: row.get(2)?,
        product_name_ar: row.get(3)?,
        qty: row.get(4)?,
        unit_price: row.get(5)?,
        discount_pct: row.get(6)?,
        vat_rate: row.get(7)?,
        vat_amount: row.get(8)?,
        line_total: row.get(9)?,
    })
}

fn map_payment_row(row: &rusqlite::Row) -> Result<Payment, rusqlite::Error> {
    Ok(Payment {
        id: row.get(0)?,
        invoice_id: row.get(1)?,
        method: row.get(2)?,
        amount: row.get(3)?,
        reference: row.get(4)?,
        paid_at: row.get(5)?,
    })
}

#[tauri::command]
pub fn create_invoice(
    payload: NewInvoice,
    state: State<AppState>,
) -> Result<Invoice, PosError> {
    let token = require_role(&state, &[Role::Cashier])?;

    // Validate that cashier_id matches the current session
    if payload.cashier_id != token.user_id {
        return Err(PosError::Unauthorized);
    }

    let conn = state.db.lock()?;

    // Step 1: Begin transaction
    conn.execute("BEGIN", [])
        ?;

    let result = (|| -> Result<String, rusqlite::Error> {
        // Step 2: Generate invoice UUID
        let invoice_uuid = Uuid::new_v4().to_string();

        // Step 3: Generate invoice number atomically
        let next_counter: i64 = conn.query_row(
            "INSERT INTO invoice_counters (branch_id, last_number) VALUES (?1, 1) \
             ON CONFLICT(branch_id) DO UPDATE SET last_number = last_number + 1 \
             RETURNING last_number",
            [&payload.branch_id],
            |row| row.get(0),
        )?;

        let invoice_number = format!("{}-{:06}", payload.branch_prefix, next_counter);

        // Step 4: Validate open session
        let session_check: Option<String> = conn
            .query_row(
                "SELECT id FROM cashier_sessions WHERE id = ?1 AND status = 'open'",
                [&payload.session_id],
                |row| row.get(0),
            )
            .optional()?;

        if session_check.is_none() {
            return Err(rusqlite::Error::InvalidParameterName(
                "لا توجد مناوبة مفتوحة".to_string(),
            ));
        }

        // Step 5: Server-side total recalculation + stock guard
        let mut calculated_subtotal = 0.0;
        let mut calculated_vat = 0.0;
        let mut calculated_total = 0.0;

        for line in &payload.lines {
            if line.qty <= 0.0 {
                return Err(rusqlite::Error::InvalidParameterName(
                    "الكمية يجب أن تكون أكبر من صفر".to_string(),
                ));
            }
            if line.unit_price < 0.0 {
                return Err(rusqlite::Error::InvalidParameterName(
                    "السعر لا يمكن أن يكون سالباً".to_string(),
                ));
            }

            let base = line.unit_price * line.qty * (1.0 - line.discount_pct / 100.0);
            let vat = base * line.vat_rate;
            let line_total = base + vat;
            calculated_subtotal += base;
            calculated_vat += vat;
            calculated_total += line_total;

            // Stock guard: check available quantity
            let stock: f64 = conn.query_row(
                "SELECT qty_on_hand FROM inventory WHERE branch_id = ?1 AND product_id = ?2",
                params![&payload.branch_id, &line.product_id],
                |row| row.get(0),
            ).unwrap_or(0.0);

            if stock < line.qty {
                return Err(rusqlite::Error::InvalidParameterName(
                    format!("الكمية غير متوفرة للمنتج {}", line.product_name_ar),
                ));
            }
        }

        // Verify frontend totals (allow 0.01 rounding tolerance)
        if (payload.subtotal - calculated_subtotal).abs() > 0.01
            || (payload.vat_amount - calculated_vat).abs() > 0.01
            || (payload.total - calculated_total).abs() > 0.01
        {
            return Err(rusqlite::Error::InvalidParameterName(
                "المجاميع غير متطابقة".to_string(),
            ));
        }

        // Step 6: Determine payment method summary
        let payment_method = if payload.payments.len() == 1 {
            payload.payments[0].method.clone()
        } else {
            "mixed".to_string()
        };

        let invoice_id = format!("INV-{}", invoice_uuid);

        // Step 7: Insert invoice header
        conn.execute(
            "INSERT INTO invoices (id, uuid, branch_id, session_id, cashier_id, customer_id, invoice_number, invoice_type, status, subtotal, discount_amount, vat_amount, total, payment_method, notes) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'confirmed', ?9, ?10, ?11, ?12, ?13, ?14)",
            params![
                &invoice_id,
                &invoice_uuid,
                &payload.branch_id,
                &payload.session_id,
                &payload.cashier_id,
                &payload.customer_id.unwrap_or_default(),
                &invoice_number,
                &payload.invoice_type,
                &payload.subtotal,
                &payload.discount_amount,
                &payload.vat_amount,
                &payload.total,
                &payment_method,
                &payload.notes.unwrap_or_default(),
            ],
        )?;

        // Step 8: Insert invoice lines
        for line in &payload.lines {
            conn.execute(
                "INSERT INTO invoice_lines (id, invoice_id, product_id, product_name_ar, qty, unit_price, discount_pct, vat_rate, vat_amount, line_total) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    format!("ILN-{}", Uuid::new_v4()),
                    &invoice_id,
                    &line.product_id,
                    &line.product_name_ar,
                    &line.qty,
                    &line.unit_price,
                    &line.discount_pct,
                    &line.vat_rate,
                    &line.vat_amount,
                    &line.line_total,
                ],
            )?;
        }

        // Step 9: Insert payments
        for payment in &payload.payments {
            if payment.amount < 0.0 {
                return Err(rusqlite::Error::InvalidParameterName(
                    "مبلغ الدفع لا يمكن أن يكون سالباً".to_string(),
                ));
            }
            conn.execute(
                "INSERT INTO payments (id, invoice_id, method, amount, reference) \
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    format!("PAY-{}", Uuid::new_v4()),
                    &invoice_id,
                    &payment.method,
                    &payment.amount,
                    &payment.reference.clone().unwrap_or_default(),
                ],
            )?;
        }

        // Step 10: Decrement inventory
        for line in &payload.lines {
            conn.execute(
                "UPDATE inventory SET qty_on_hand = qty_on_hand - ?1, last_updated = datetime('now') \
                 WHERE branch_id = ?2 AND product_id = ?3",
                params![&line.qty, &payload.branch_id, &line.product_id],
            )?;
        }

        // Step 11: Write audit log
        conn.execute(
            "INSERT INTO audit_log (id, action, entity_type, entity_id, user_id, payload) \
             VALUES (?1, 'invoice_created', 'invoice', ?2, ?3, ?4)",
            params![
                format!("AUD-{}", Uuid::new_v4()),
                &invoice_id,
                &payload.cashier_id,
                format!(
                    "{{\"invoice_number\":\"{}\",\"total\":{}}}",
                    invoice_number, payload.total
                ),
            ],
        )?;

        Ok(invoice_id)
    })();

    match result {
        Ok(invoice_id) => {
            conn.execute("COMMIT", [])
                ?;

            // Generate ZATCA QR code (non-blocking; errors don't fail the sale)
            let _ = crate::commands::zatca::generate_and_store_invoice_qr(&invoice_id, &conn);

            // Return full invoice
            get_invoice_internal(&invoice_id, &conn)
        }
        Err(e) => {
            let _ = conn.execute("ROLLBACK", []);
            Err(PosError::from(e))
        }
    }
}

fn get_invoice_internal(
    invoice_id: &str,
    conn: &rusqlite::Connection,
) -> Result<Invoice, PosError> {
    let mut invoice: Invoice = conn
        .query_row(
            "SELECT i.id, i.uuid, i.branch_id, i.session_id, i.cashier_id, i.customer_id, \
             c.name_ar as customer_name_ar, i.invoice_number, i.invoice_type, i.status, \
             i.subtotal, i.discount_amount, i.vat_amount, i.total, i.payment_method, \
             i.notes, i.zatca_status, i.qr_code, i.created_at \
             FROM invoices i \
             LEFT JOIN customers c ON c.id = i.customer_id \
             WHERE i.id = ?1",
            [invoice_id],
            map_invoice_row,
        )
        ?;

    let mut lines_stmt = conn
        .prepare(
            "SELECT id, invoice_id, product_id, product_name_ar, qty, unit_price, discount_pct, vat_rate, vat_amount, line_total \
             FROM invoice_lines WHERE invoice_id = ?1"
        )
        ?;

    let lines: Vec<InvoiceLine> = lines_stmt
        .query_map([invoice_id], map_line_row)
        .and_then(|rows| rows.collect())
        ?;

    let mut payments_stmt = conn
        .prepare(
            "SELECT id, invoice_id, method, amount, reference, paid_at \
             FROM payments WHERE invoice_id = ?1"
        )
        ?;

    let payments: Vec<Payment> = payments_stmt
        .query_map([invoice_id], map_payment_row)
        .and_then(|rows| rows.collect())
        ?;

    invoice.lines = Some(lines);
    invoice.payments = Some(payments);

    Ok(invoice)
}

#[tauri::command]
pub fn get_invoice(
    invoice_id: String,
    state: State<AppState>,
) -> Result<Invoice, PosError> {
    let _token = require_role(&state, &[Role::Cashier])?;
    let conn = state.db.lock()?;
    get_invoice_internal(&invoice_id, &conn)
}

#[tauri::command]
pub fn get_invoice_by_number(
    invoice_number: String,
    state: State<AppState>,
) -> Result<Option<Invoice>, PosError> {
    let _token = require_role(&state, &[Role::Cashier])?;
    let conn = state.db.lock()?;

    let invoice_id: Option<String> = conn
        .query_row(
            "SELECT id FROM invoices WHERE invoice_number = ?1",
            [&invoice_number],
            |row| row.get(0),
        )
        .optional()
        ?;

    match invoice_id {
        Some(id) => {
            let invoice = get_invoice_internal(&id, &conn)?;
            Ok(Some(invoice))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub fn create_refund_invoice(
    original_invoice_id: String,
    lines: Vec<RefundLine>,
    state: State<AppState>,
) -> Result<Invoice, PosError> {
    let token = require_role(&state, &[Role::Cashier])?;

    let conn = state.db.lock()?;

    conn.execute("BEGIN", [])
        ?;

    let result = (|| -> Result<String, rusqlite::Error> {
        // Get original invoice
        let original = conn
            .query_row(
                "SELECT branch_id, session_id, cashier_id, customer_id, total \
                 FROM invoices WHERE id = ?1",
                [&original_invoice_id],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, Option<String>>(3)?,
                        row.get::<_, f64>(4)?,
                    ))
                },
            )
            .optional()?
            .ok_or_else(|| {
                rusqlite::Error::InvalidParameterName(
                    "الفاتورة الأصلية غير موجودة".to_string(),
                )
            })?;

        let (branch_id, session_id, cashier_id, customer_id, original_total) = original;

        // Calculate refund totals
        let mut subtotal = 0.0;
        let mut vat_amount = 0.0;
        let mut total = 0.0;

        for line in &lines {
            if line.qty <= 0.0 {
                return Err(rusqlite::Error::InvalidParameterName(
                    "الكمية يجب أن تكون أكبر من صفر".to_string(),
                ));
            }
            let base = line.unit_price * line.qty;
            let vat = base * line.vat_rate;
            let line_total = base + vat;
            subtotal += base;
            vat_amount += vat;
            total += line_total;
        }

        // Authorization: cashier can only refund < 100 SAR; manager+ can refund any amount
        if token.role == "cashier" && total.abs() >= 100.0 {
            return Err(rusqlite::Error::InvalidParameterName(
                "يتطلب الإرجاع بقيمة 100 ر.س أو أكثر إذن المدير".to_string(),
            ));
        }

        // Cap refund to original invoice total
        if total.abs() > original_total.abs() + 0.01 {
            return Err(rusqlite::Error::InvalidParameterName(
                "مبلغ الإرجاع يتجاوز إجمالي الفاتورة الأصلية".to_string(),
            ));
        }

        let refund_uuid = Uuid::new_v4().to_string();
        let refund_id = format!("INV-{}", refund_uuid);
        let refund_number = format!("REF-{}", refund_uuid.split('-').next().unwrap_or("000"));

        // Insert refund invoice header (negative amounts)
        conn.execute(
            "INSERT INTO invoices (id, uuid, branch_id, session_id, cashier_id, customer_id, invoice_number, invoice_type, status, subtotal, discount_amount, vat_amount, total, payment_method, notes) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'credit_note', 'confirmed', ?8, 0, ?9, ?10, 'cash', ?11)",
            params![
                &refund_id,
                &refund_uuid,
                &branch_id,
                &session_id,
                &cashier_id,
                &customer_id.unwrap_or_default(),
                &refund_number,
                -&subtotal,
                -&vat_amount,
                -&total,
                format!("إرجاع على فاتورة {}", original_invoice_id),
            ],
        )?;

        // Insert negative lines + restock inventory
        for line in &lines {
            let base = line.unit_price * line.qty;
            let vat = base * line.vat_rate;
            let line_total = base + vat;

            conn.execute(
                "INSERT INTO invoice_lines (id, invoice_id, product_id, product_name_ar, qty, unit_price, discount_pct, vat_rate, vat_amount, line_total) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8, ?9)",
                params![
                    format!("ILN-{}", Uuid::new_v4()),
                    &refund_id,
                    &line.product_id,
                    &line.product_name_ar,
                    -&line.qty,
                    &line.unit_price,
                    &line.vat_rate,
                    -&vat,
                    -&line_total,
                ],
            )?;

            // Restock inventory
            conn.execute(
                "UPDATE inventory SET qty_on_hand = qty_on_hand + ?1, last_updated = datetime('now') \
                 WHERE branch_id = ?2 AND product_id = ?3",
                params![&line.qty, &branch_id, &line.product_id],
            )?;
        }

        // Audit log
        conn.execute(
            "INSERT INTO audit_log (id, action, entity_type, entity_id, payload) \
             VALUES (?1, 'refund_created', 'invoice', ?2, ?3)",
            params![
                format!("AUD-{}", Uuid::new_v4()),
                &refund_id,
                format!(
                    "{{\"original_invoice\":\"{}\",\"refund_total\":{}}}",
                    original_invoice_id, -total
                ),
            ],
        )?;

        Ok(refund_id)
    })();

    match result {
        Ok(refund_id) => {
            conn.execute("COMMIT", [])
                ?;
            get_invoice_internal(&refund_id, &conn)
        }
        Err(e) => {
            let _ = conn.execute("ROLLBACK", []);
            Err(PosError::from(e))
        }
    }
}
