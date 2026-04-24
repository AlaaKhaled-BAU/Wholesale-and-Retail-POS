# Phase 5 — Reporting (4–5 days)
> **Start: After Phase 3 | Full parallel with Dev A**

---

## Phase 5 Overview

This phase implements SQL queries for reports: daily summary, period sales, inventory status, cashier session reports, and CSV export.

**Merge Point: MP-5** — Task 5.1.5 complete. Dev A wires Reports UI with charts.

---

## Task 5.1.1 — `get_daily_summary` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Return daily sales KPIs, payment method breakdown, and top 5 products.

### Files to Edit
- `src-tauri/src/commands/reports.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/main.rs`

### Steps

1. Replace `src-tauri/src/commands/reports.rs` with:

```rust
use crate::lib::{DailySummary, PaymentMethodBreakdown, TopProduct};
use tauri_plugin_sql::TauriSql;

#[tauri::command]
pub async fn get_daily_summary(
    branch_id: String,
    date: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<DailySummary, String> {
    // Main KPIs
    let row: (Option<i64>, Option<f64>, Option<f64>, Option<f64>) = db
        .query_one(
            "SELECT COUNT(*), SUM(subtotal), SUM(vat_amount), SUM(total) FROM invoices WHERE branch_id = ? AND DATE(created_at) = ? AND status != 'cancelled'",
            [&branch_id, &date],
        )
        .await
        .map_err(|e| e.to_string())?
        .unwrap_or((Some(0), Some(0.0), Some(0.0), Some(0.0)));

    // Payment method breakdown
    let cash: Option<f64> = db
        .query_one(
            "SELECT COALESCE(SUM(amount), 0) FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.branch_id = ? AND DATE(i.created_at) = ? AND p.method = 'cash' AND i.status != 'cancelled'",
            [&branch_id, &date],
        )
        .await
        .map_err(|e| e.to_string())?;

    let card: Option<f64> = db
        .query_one(
            "SELECT COALESCE(SUM(amount), 0) FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.branch_id = ? AND DATE(i.created_at) = ? AND p.method = 'card' AND i.status != 'cancelled'",
            [&branch_id, &date],
        )
        .await
        .map_err(|e| e.to_string())?;

    let cliq: Option<f64> = db
        .query_one(
            "SELECT COALESCE(SUM(amount), 0) FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.branch_id = ? AND DATE(i.created_at) = ? AND p.method = 'cliq' AND i.status != 'cancelled'",
            [&branch_id, &date],
        )
        .await
        .map_err(|e| e.to_string())?;

    // Top 5 products
    let top_products: Vec<TopProduct> = db
        .query(
            "SELECT il.product_name_ar, SUM(il.qty) as qty_sold, SUM(il.line_total) as revenue FROM invoice_lines il JOIN invoices i ON i.id = il.invoice_id WHERE i.branch_id = ? AND DATE(i.created_at) = ? AND i.status != 'cancelled' GROUP BY il.product_id ORDER BY qty_sold DESC LIMIT 5",
            [&branch_id, &date],
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(DailySummary {
        date,
        invoice_count: row.0.unwrap_or(0),
        total_sales: row.1.unwrap_or(0.0),
        total_vat: row.2.unwrap_or(0.0),
        grand_total: row.3.unwrap_or(0.0),
        by_payment_method: PaymentMethodBreakdown {
            cash: cash.unwrap_or(0.0),
            card: card.unwrap_or(0.0),
            cliq: cliq.unwrap_or(0.0),
        },
        top_products,
    })
}
```

2. Register in `main.rs`.

### Verification
1. Create 2 invoices today
2. Call `get_daily_summary("BR1", "2026-04-22")`
3. Verify: invoice_count=2, total_sales matches, payment breakdown sums correctly, top products populated

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_daily_summary | Phase 5 | ✅ Ready | Returns DailySummary with KPIs + top 5 |
```

---

## Task 5.1.2 — `get_sales_by_period` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Return daily aggregated sales data for a date range (for line charts).

### Files to Edit
- `src-tauri/src/commands/reports.rs`

### Steps

1. Append to `src-tauri/src/commands/reports.rs`:

```rust
use crate::lib::DailySales;

#[tauri::command]
pub async fn get_sales_by_period(
    branch_id: String,
    from_date: String,
    to_date: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<Vec<DailySales>, String> {
    let sales: Vec<DailySales> = db
        .query(
            "SELECT DATE(created_at) as sale_date, COUNT(*) as invoice_count, SUM(total) as total_sales, SUM(vat_amount) as total_vat FROM invoices WHERE branch_id = ? AND DATE(created_at) BETWEEN ? AND ? AND status != 'cancelled' GROUP BY DATE(created_at) ORDER BY sale_date",
            [&branch_id, &from_date, &to_date],
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(sales)
}
```

2. Register in `main.rs`.

### Verification
1. Create invoices across 3 different days
2. Call with date range covering those days
3. Verify: 3 rows returned, each with correct daily totals

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_sales_by_period | Phase 5 | ✅ Ready | Returns Vec<DailySales> |
```

---

## Task 5.1.3 — `get_inventory_report` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Return inventory levels with low-stock flagging and stock value.

### Files to Edit
- `src-tauri/src/commands/reports.rs`

### Steps

1. Append to `src-tauri/src/commands/reports.rs`:

```rust
use crate::lib::InventoryReportRow;

#[tauri::command]
pub async fn get_inventory_report(
    branch_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<Vec<InventoryReportRow>, String> {
    let rows: Vec<InventoryReportRow> = db
        .query(
            "SELECT p.id as product_id, p.name_ar, p.sku, i.qty_on_hand, i.low_stock_threshold, (i.qty_on_hand * p.cost_price) as stock_value, (i.qty_on_hand <= i.low_stock_threshold) as is_low_stock FROM inventory i JOIN products p ON p.id = i.product_id WHERE i.branch_id = ? ORDER BY is_low_stock DESC, p.name_ar",
            [branch_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(rows)
}
```

2. Register in `main.rs`.

### Verification
1. Set one product's qty below threshold
2. Call `get_inventory_report("BR1")`
3. Verify: low-stock items appear first, stock_value calculated correctly

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_inventory_report | Phase 5 | ✅ Ready | Returns Vec<InventoryReportRow> |
```

---

## Task 5.1.4 — `get_cashier_session_report` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Return a cashier session report with sales totals, payment breakdown, and cash discrepancy.

### Files to Edit
- `src-tauri/src/commands/reports.rs`

### Steps

1. Append to `src-tauri/src/commands/reports.rs`:

```rust
use crate::lib::{CashierSession, SessionReport};

#[tauri::command]
pub async fn get_cashier_session_report(
    session_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<SessionReport, String> {
    let session: CashierSession = db
        .query_one(
            "SELECT id, user_id, branch_id, opened_at, closed_at, opening_float, closing_cash, status FROM cashier_sessions WHERE id = ?",
            [&session_id],
        )
        .await
        .map_err(|e| e.to_string())?
        .ok_or("المناوبة غير موجودة")?;

    let totals: (Option<i64>, Option<f64>) = db
        .query_one(
            "SELECT COUNT(*), SUM(total) FROM invoices WHERE session_id = ? AND status != 'cancelled'",
            [&session_id],
        )
        .await
        .map_err(|e| e.to_string())?
        .unwrap_or((Some(0), Some(0.0)));

    let cash_sales: Option<f64> = db
        .query_one(
            "SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.session_id = ? AND p.method = 'cash' AND i.status != 'cancelled'",
            [&session_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    let card_sales: Option<f64> = db
        .query_one(
            "SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.session_id = ? AND p.method = 'card' AND i.status != 'cancelled'",
            [&session_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    let cliq_sales: Option<f64> = db
        .query_one(
            "SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.session_id = ? AND p.method = 'cliq' AND i.status != 'cancelled'",
            [&session_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    let expected_cash = session.opening_float + cash_sales.unwrap_or(0.0);
    let discrepancy = session.closing_cash.unwrap_or(0.0) - expected_cash;

    Ok(SessionReport {
        session,
        invoice_count: totals.0.unwrap_or(0),
        total_sales: totals.1.unwrap_or(0.0),
        by_payment_method: PaymentMethodBreakdown {
            cash: cash_sales.unwrap_or(0.0),
            card: card_sales.unwrap_or(0.0),
            cliq: cliq_sales.unwrap_or(0.0),
        },
        expected_cash,
        discrepancy,
    })
}
```

2. Register in `main.rs`.

### Verification
1. Open a session with opening_float=500
2. Create 2 cash invoices totaling 300
3. Close session with closing_cash=800
4. Call report → expected_cash=800, discrepancy=0
5. Test with closing_cash=750 → discrepancy=-50

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_cashier_session_report | Phase 5 | ✅ Ready | Returns SessionReport with discrepancy |
```

---

## Task 5.1.5 — `export_invoices_csv` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Generate a CSV string of invoices for a date range. Dev A triggers browser download.

### Files to Edit
- `src-tauri/src/commands/reports.rs`

### Steps

1. Append to `src-tauri/src/commands/reports.rs`:

```rust
#[tauri::command]
pub async fn export_invoices_csv(
    branch_id: String,
    from_date: String,
    to_date: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<String, String> {
    let invoices: Vec<(String, String, String, String, String, String)> = db
        .query(
            "SELECT invoice_number, invoice_type, subtotal, vat_amount, total, created_at FROM invoices WHERE branch_id = ? AND DATE(created_at) BETWEEN ? AND ? AND status != 'cancelled' ORDER BY created_at",
            [&branch_id, &from_date, &to_date],
        )
        .await
        .map_err(|e| e.to_string())?;

    let mut csv = String::from("invoice_number,invoice_type,subtotal,vat_amount,total,created_at\n");

    for (num, typ, sub, vat, total, created) in invoices {
        csv.push_str(&format!("{},{},{},{},{},{}\n", num, typ, sub, vat, total, created));
    }

    Ok(csv)
}
```

2. Register in `main.rs`.

### Verification
1. Create 2 invoices
2. Call export → returns CSV string with header + 2 data rows
3. Verify the CSV opens correctly in a spreadsheet

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| export_invoices_csv | Phase 5 | ✅ Ready | Returns CSV string |
```

---

## 🛑 MERGE POINT: MP-5 — TASK 5.1.5 COMPLETE

**This is a merge point. Sync with Dev A before proceeding.**

### What Dev A Needs From You
1. `get_daily_summary` — they can build Daily Report tab with KPIs and pie chart
2. `get_sales_by_period` — they can build Period Report tab with line chart
3. `get_inventory_report` — they can build Inventory Report tab
4. `get_cashier_session_report` — they can build Session Report tab
5. `export_invoices_csv` — they can add Export buttons

### After Merge
- Dev A completes Reports UI
- You proceed to Phase 6 (`phase_6.md`) — ZATCA Compliance
- Dev A works on Phase 7 (Settings) in parallel during your Phase 6

---

(End of Phase 5)
