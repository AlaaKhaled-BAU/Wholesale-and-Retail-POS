use pos::{
    CashierSession, DailySales, DailySummary, InventoryReportRow, PaymentMethodBreakdown,
    SessionReport, TopProduct,
};
use pos::AppState;
use rusqlite::params;
use tauri::State;

// ============================================================
// Task 5.1.1 — get_daily_summary
// ============================================================
#[tauri::command]
pub fn get_daily_summary(
    branch_id: String,
    date: String,
    state: State<AppState>,
) -> Result<DailySummary, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Main KPIs
    let (invoice_count, total_sales, total_vat, grand_total): (i64, f64, f64, f64) = conn
        .query_row(
            "SELECT COUNT(*), COALESCE(SUM(subtotal), 0), COALESCE(SUM(vat_amount), 0), COALESCE(SUM(total), 0) \
             FROM invoices WHERE branch_id = ?1 AND DATE(created_at) = ?2 AND status != 'cancelled'",
            params![&branch_id, &date],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .unwrap_or((0, 0.0, 0.0, 0.0));

    // Payment method breakdown
    let cash: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(p.amount), 0) FROM payments p \
             JOIN invoices i ON i.id = p.invoice_id \
             WHERE i.branch_id = ?1 AND DATE(i.created_at) = ?2 AND p.method = 'cash' AND i.status != 'cancelled'",
            params![&branch_id, &date],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let card: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(p.amount), 0) FROM payments p \
             JOIN invoices i ON i.id = p.invoice_id \
             WHERE i.branch_id = ?1 AND DATE(i.created_at) = ?2 AND p.method = 'card' AND i.status != 'cancelled'",
            params![&branch_id, &date],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let cliq: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(p.amount), 0) FROM payments p \
             JOIN invoices i ON i.id = p.invoice_id \
             WHERE i.branch_id = ?1 AND DATE(i.created_at) = ?2 AND p.method = 'cliq' AND i.status != 'cancelled'",
            params![&branch_id, &date],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    // Top 5 products
    let mut stmt = conn
        .prepare(
            "SELECT il.product_name_ar, SUM(il.qty) as qty_sold, SUM(il.line_total) as revenue \
             FROM invoice_lines il \
             JOIN invoices i ON i.id = il.invoice_id \
             WHERE i.branch_id = ?1 AND DATE(i.created_at) = ?2 AND i.status != 'cancelled' \
             GROUP BY il.product_id \
             ORDER BY qty_sold DESC LIMIT 5",
        )
        .map_err(|e| e.to_string())?;

    let top_products: Vec<TopProduct> = stmt
        .query_map(params![&branch_id, &date], |row| {
            Ok(TopProduct {
                name_ar: row.get(0)?,
                qty_sold: row.get(1)?,
                revenue: row.get(2)?,
            })
        })
        .and_then(|rows| rows.collect())
        .map_err(|e| e.to_string())?;

    Ok(DailySummary {
        date,
        invoice_count,
        total_sales,
        total_vat,
        grand_total,
        by_payment_method: PaymentMethodBreakdown { cash, card, cliq },
        top_products,
    })
}

// ============================================================
// Task 5.1.2 — get_sales_by_period
// ============================================================
#[tauri::command]
pub fn get_sales_by_period(
    branch_id: String,
    from_date: String,
    to_date: String,
    state: State<AppState>,
) -> Result<Vec<DailySales>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT DATE(created_at) as sale_date, COUNT(*) as invoice_count, \
             COALESCE(SUM(total), 0) as total_sales, COALESCE(SUM(vat_amount), 0) as total_vat \
             FROM invoices \
             WHERE branch_id = ?1 AND DATE(created_at) BETWEEN ?2 AND ?3 AND status != 'cancelled' \
             GROUP BY DATE(created_at) \
             ORDER BY sale_date",
        )
        .map_err(|e| e.to_string())?;

    let sales: Vec<DailySales> = stmt
        .query_map(params![&branch_id, &from_date, &to_date], |row| {
            Ok(DailySales {
                sale_date: row.get(0)?,
                invoice_count: row.get(1)?,
                total_sales: row.get(2)?,
                total_vat: row.get(3)?,
            })
        })
        .and_then(|rows| rows.collect())
        .map_err(|e| e.to_string())?;

    Ok(sales)
}

// ============================================================
// Task 5.1.3 — get_inventory_report
// ============================================================
#[tauri::command]
pub fn get_inventory_report(
    branch_id: String,
    state: State<AppState>,
) -> Result<Vec<InventoryReportRow>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT p.id as product_id, p.name_ar, p.sku, i.qty_on_hand, i.low_stock_threshold, \
             (i.qty_on_hand * p.cost_price) as stock_value, \
             (i.qty_on_hand <= i.low_stock_threshold) as is_low_stock \
             FROM inventory i \
             JOIN products p ON p.id = i.product_id \
             WHERE i.branch_id = ?1 \
             ORDER BY is_low_stock DESC, p.name_ar",
        )
        .map_err(|e| e.to_string())?;

    let rows: Vec<InventoryReportRow> = stmt
        .query_map(params![&branch_id], |row| {
            Ok(InventoryReportRow {
                product_id: row.get(0)?,
                name_ar: row.get(1)?,
                sku: row.get(2)?,
                qty_on_hand: row.get(3)?,
                low_stock_threshold: row.get(4)?,
                stock_value: row.get(5)?,
                is_low_stock: row.get(6)?,
            })
        })
        .and_then(|rows| rows.collect())
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

// ============================================================
// Task 5.1.4 — get_cashier_session_report
// ============================================================
#[tauri::command]
pub fn get_cashier_session_report(
    session_id: String,
    state: State<AppState>,
) -> Result<SessionReport, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let session: CashierSession = conn
        .query_row(
            "SELECT id, user_id, branch_id, opened_at, closed_at, opening_float, closing_cash, status \
             FROM cashier_sessions WHERE id = ?1",
            [&session_id],
            |row| {
                Ok(CashierSession {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    branch_id: row.get(2)?,
                    opened_at: row.get(3)?,
                    closed_at: row.get(4)?,
                    opening_float: row.get(5)?,
                    closing_cash: row.get(6)?,
                    status: row.get(7)?,
                })
            },
        )
        .map_err(|_| "المناوبة غير موجودة".to_string())?;

    let (invoice_count, total_sales): (i64, f64) = conn
        .query_row(
            "SELECT COUNT(*), COALESCE(SUM(total), 0) FROM invoices WHERE session_id = ?1 AND status != 'cancelled'",
            [&session_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap_or((0, 0.0));

    let cash_sales: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(p.amount), 0) FROM payments p \
             JOIN invoices i ON i.id = p.invoice_id \
             WHERE i.session_id = ?1 AND p.method = 'cash' AND i.status != 'cancelled'",
            [&session_id],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let card_sales: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(p.amount), 0) FROM payments p \
             JOIN invoices i ON i.id = p.invoice_id \
             WHERE i.session_id = ?1 AND p.method = 'card' AND i.status != 'cancelled'",
            [&session_id],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let cliq_sales: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(p.amount), 0) FROM payments p \
             JOIN invoices i ON i.id = p.invoice_id \
             WHERE i.session_id = ?1 AND p.method = 'cliq' AND i.status != 'cancelled'",
            [&session_id],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let expected_cash = session.opening_float + cash_sales;
    let discrepancy = session.closing_cash.unwrap_or(0.0) - expected_cash;

    Ok(SessionReport {
        session,
        invoice_count,
        total_sales,
        by_payment_method: PaymentMethodBreakdown {
            cash: cash_sales,
            card: card_sales,
            cliq: cliq_sales,
        },
        expected_cash,
        discrepancy,
    })
}

// ============================================================
// Task 5.1.5 — export_invoices_csv
// ============================================================
#[tauri::command]
pub fn export_invoices_csv(
    branch_id: String,
    from_date: String,
    to_date: String,
    state: State<AppState>,
) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT invoice_number, invoice_type, subtotal, vat_amount, total, created_at \
             FROM invoices \
             WHERE branch_id = ?1 AND DATE(created_at) BETWEEN ?2 AND ?3 AND status != 'cancelled' \
             ORDER BY created_at",
        )
        .map_err(|e| e.to_string())?;

    let mut csv = String::from("\u{FEFF}invoice_number,invoice_type,subtotal,vat_amount,total,created_at\n");

    let rows = stmt
        .query_map(params![&branch_id, &from_date, &to_date], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, f64>(2)?,
                row.get::<_, f64>(3)?,
                row.get::<_, f64>(4)?,
                row.get::<_, String>(5)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for row in rows {
        let (num, typ, sub, vat, total, created) = row.map_err(|e| e.to_string())?;
        csv.push_str(&format!("{},{},{:.2},{:.2},{:.2},{}\n", num, typ, sub, vat, total, created));
    }

    Ok(csv)
}
