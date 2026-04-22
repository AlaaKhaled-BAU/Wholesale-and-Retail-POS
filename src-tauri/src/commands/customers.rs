use crate::lib::{Customer, Invoice, NewCustomer};
use crate::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

fn map_customer_row(row: &rusqlite::Row) -> Result<Customer, rusqlite::Error> {
    Ok(Customer {
        id: row.get(0)?,
        name_ar: row.get(1)?,
        phone: row.get(2)?,
        vat_number: row.get(3)?,
        cr_number: row.get(4)?,
        credit_limit: row.get(5)?,
        balance: row.get(6)?,
        customer_type: row.get(7)?,
        created_at: row.get(8)?,
    })
}

fn map_invoice_row_short(row: &rusqlite::Row) -> Result<Invoice, rusqlite::Error> {
    Ok(Invoice {
        id: row.get(0)?,
        uuid: row.get(1)?,
        branch_id: row.get(2)?,
        session_id: row.get(3)?,
        cashier_id: row.get(4)?,
        customer_id: row.get(5)?,
        customer_name_ar: None,
        invoice_number: row.get(6)?,
        invoice_type: row.get(7)?,
        status: row.get(8)?,
        subtotal: row.get(9)?,
        discount_amount: row.get(10)?,
        vat_amount: row.get(11)?,
        total: row.get(12)?,
        payment_method: row.get(13)?,
        notes: row.get(14)?,
        zatca_status: row.get(15)?,
        qr_code: row.get(16)?,
        lines: None,
        payments: None,
        created_at: row.get(17)?,
    })
}

// ============================================================
// Task 4.1.1 — get_customers
// ============================================================
#[tauri::command]
pub fn get_customers(query: String, state: State<AppState>) -> Result<Vec<Customer>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name_ar, phone, vat_number, cr_number, credit_limit, balance, customer_type, created_at \
             FROM customers \
             WHERE name_ar LIKE '%' || ?1 || '%' OR phone = ?2 OR vat_number = ?3 \
             ORDER BY name_ar LIMIT 50",
        )
        .map_err(|e| e.to_string())?;

    let customers = stmt
        .query_map(params![&query, &query, &query], map_customer_row)
        .and_then(|rows| rows.collect())
        .map_err(|e| e.to_string())?;

    Ok(customers)
}

// ============================================================
// Task 4.1.2 — create_customer
// ============================================================
#[tauri::command]
pub fn create_customer(
    customer: NewCustomer,
    state: State<AppState>,
) -> Result<Customer, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let id = format!("CUS-{}", Uuid::new_v4());
    let credit_limit = customer.credit_limit.unwrap_or(0.0);

    conn.execute(
        "INSERT INTO customers (id, name_ar, phone, vat_number, cr_number, credit_limit, balance, customer_type) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
        params![
            &id,
            &customer.name_ar,
            &customer.phone.unwrap_or_default(),
            &customer.vat_number.unwrap_or_default(),
            &customer.cr_number.unwrap_or_default(),
            &credit_limit,
            &customer.customer_type,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Customer {
        id,
        name_ar: customer.name_ar,
        phone: customer.phone,
        vat_number: customer.vat_number,
        cr_number: customer.cr_number,
        credit_limit,
        balance: 0.0,
        customer_type: customer.customer_type,
        created_at: chrono::Local::now().to_rfc3339(),
    })
}

// ============================================================
// Task 4.1.3 — update_customer
// ============================================================
#[tauri::command]
pub fn update_customer(
    id: String,
    data: NewCustomer,
    state: State<AppState>,
) -> Result<Customer, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE customers SET name_ar = ?1, phone = ?2, vat_number = ?3, cr_number = ?4, \
         credit_limit = ?5, customer_type = ?6 WHERE id = ?7",
        params![
            &data.name_ar,
            &data.phone.unwrap_or_default(),
            &data.vat_number.unwrap_or_default(),
            &data.cr_number.unwrap_or_default(),
            &data.credit_limit.unwrap_or(0.0),
            &data.customer_type,
            &id,
        ],
    )
    .map_err(|e| e.to_string())?;

    let updated = conn
        .query_row(
            "SELECT id, name_ar, phone, vat_number, cr_number, credit_limit, balance, customer_type, created_at \
             FROM customers WHERE id = ?1",
            [&id],
            map_customer_row,
        )
        .map_err(|_| "العميل غير موجود".to_string())?;

    Ok(updated)
}

// ============================================================
// Task 4.1.4 — get_customer_invoices + get_customer_balance
// ============================================================
#[tauri::command]
pub fn get_customer_invoices(
    customer_id: String,
    state: State<AppState>,
) -> Result<Vec<Invoice>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, uuid, branch_id, session_id, cashier_id, customer_id, invoice_number, \
             invoice_type, status, subtotal, discount_amount, vat_amount, total, payment_method, \
             notes, zatca_status, qr_code, created_at \
             FROM invoices \
             WHERE customer_id = ?1 \
             ORDER BY created_at DESC LIMIT 50",
        )
        .map_err(|e| e.to_string())?;

    let invoices = stmt
        .query_map([&customer_id], map_invoice_row_short)
        .and_then(|rows| rows.collect())
        .map_err(|e| e.to_string())?;

    Ok(invoices)
}

#[tauri::command]
pub fn get_customer_balance(
    customer_id: String,
    state: State<AppState>,
) -> Result<f64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let balance: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(total), 0) FROM invoices WHERE customer_id = ?1 AND status != 'cancelled'",
            [&customer_id],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    Ok(balance)
}

// ============================================================
// Task 4.1.5 — record_customer_payment
// ============================================================
#[tauri::command]
pub fn record_customer_payment(
    customer_id: String,
    amount: f64,
    user_id: String,
    state: State<AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Update customer balance
    conn.execute(
        "UPDATE customers SET balance = balance - ?1 WHERE id = ?2",
        params![&amount, &customer_id],
    )
    .map_err(|e| e.to_string())?;

    // Audit log
    conn.execute(
        "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, payload) \
         VALUES (?1, ?2, 'settings_changed', 'customer', ?3, ?4)",
        params![
            format!("AUD-{}", Uuid::new_v4()),
            &user_id,
            &customer_id,
            format!("{{\"payment_amount\":{}}}", amount),
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
