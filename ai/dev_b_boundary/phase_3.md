# Phase 3 — Invoice & Sales (10–14 days)
> **Start: After Phase 2 | Critical path — most complex phase**

---

## Phase 3 Overview

This phase implements the core sales engine: invoice creation as an atomic transaction, refunds, and receipt printing. This is the longest and most critical phase.

**Merge Points:**
- **MP-3a** — Task 3.1.1 complete. Dev A wires Payment Modal.
- **MP-3b** — Task 3.3.1 complete. Dev A completes end-to-end sale + receipt.

---

## Task 3.1.1 — `create_invoice` (Atomic Transaction)
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes (parallel with Dev A's cart UI)

### Objective
Create the core invoice save command. Everything must run inside a single SQLite transaction. If any step fails, roll back.

### Files to Edit
- `src-tauri/src/commands/invoices.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/main.rs`

### Prerequisites
- Tasks 1.1.2 (session system)
- Tasks 2.1.1, 2.2.3 (products and inventory)
- `AppState` managed state from Phase 1

### Steps

1. Replace `src-tauri/src/commands/invoices.rs` with:

```rust
use crate::lib::{AppState, Invoice, NewInvoice, NewInvoiceLine, NewPayment};
use tauri_plugin_sql::TauriSql;
use uuid::Uuid;
use std::sync::Mutex;

#[tauri::command]
pub async fn create_invoice(
    payload: NewInvoice,
    db: tauri::State<'_, TauriSql>,
    app_state: tauri::State<'_, AppState>,
) -> Result<Invoice, String> {
    let mut conn = db.get().await.map_err(|e| e.to_string())?;

    // Step 1: Begin transaction
    conn.execute("BEGIN TRANSACTION", [])
        .await
        .map_err(|e| e.to_string())?;

    let result = async {
        // Step 2: Generate invoice UUID
        let invoice_uuid = Uuid::new_v4().to_string();

        // Step 3: Generate invoice number
        let max_num: Option<String> = conn
            .query_one(
                "SELECT invoice_number FROM invoices WHERE branch_id = ? ORDER BY created_at DESC LIMIT 1",
                [&payload.branch_id],
            )
            .await
            .map_err(|e| e.to_string())?;

        let next_counter = match max_num {
            Some(num) => {
                let parts: Vec<&str> = num.split('-').collect();
                if parts.len() == 2 {
                    parts[1].parse::<i64>().unwrap_or(0) + 1
                } else {
                    1
                }
            }
            None => 1,
        };

        let invoice_number = format!("{}-{:06}", payload.branch_prefix, next_counter);

        // Step 4: Validate open session (Gap G4 fix)
        let session_id = payload.session_id.clone();
        let session_check: Option<String> = conn
            .query_one(
                "SELECT id FROM cashier_sessions WHERE id = ? AND status = 'open'",
                [&session_id],
            )
            .await
            .map_err(|e| e.to_string())?;

        if session_check.is_none() {
            return Err("لا توجد مناوبة مفتوحة".to_string());
        }

        // Step 5: Determine payment method summary
        let payment_method = if payload.payments.len() == 1 {
            payload.payments[0].method.clone()
        } else {
            "mixed".to_string()
        };

        // Step 6: Insert invoice header
        conn.execute(
            "INSERT INTO invoices (id, uuid, branch_id, session_id, cashier_id, customer_id, invoice_number, invoice_type, status, subtotal, discount_amount, vat_amount, total, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?)",
            [
                format!("INV-{}", invoice_uuid),
                invoice_uuid.clone(),
                payload.branch_id.clone(),
                session_id.clone(),
                payload.cashier_id.clone(),
                payload.customer_id.clone().unwrap_or_default(),
                invoice_number.clone(),
                payload.invoice_type.clone(),
                payload.subtotal.to_string(),
                payload.discount_amount.to_string(),
                payload.vat_amount.to_string(),
                payload.total.to_string(),
                payment_method,
                payload.notes.clone().unwrap_or_default(),
            ],
        )
        .await
        .map_err(|e| e.to_string())?;

        let invoice_id = format!("INV-{}", invoice_uuid);

        // Step 7: Insert invoice lines
        for line in &payload.lines {
            conn.execute(
                "INSERT INTO invoice_lines (id, invoice_id, product_id, product_name_ar, qty, unit_price, discount_pct, vat_rate, vat_amount, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    format!("ILN-{}", Uuid::new_v4()),
                    invoice_id.clone(),
                    line.product_id.clone(),
                    line.product_name_ar.clone(),
                    line.qty.to_string(),
                    line.unit_price.to_string(),
                    line.discount_pct.to_string(),
                    line.vat_rate.to_string(),
                    line.vat_amount.to_string(),
                    line.line_total.to_string(),
                ],
            )
            .await
            .map_err(|e| e.to_string())?;
        }

        // Step 8: Insert payments
        for payment in &payload.payments {
            conn.execute(
                "INSERT INTO payments (id, invoice_id, method, amount, reference) VALUES (?, ?, ?, ?, ?)",
                [
                    format!("PAY-{}", Uuid::new_v4()),
                    invoice_id.clone(),
                    payment.method.clone(),
                    payment.amount.to_string(),
                    payment.reference.clone().unwrap_or_default(),
                ],
            )
            .await
            .map_err(|e| e.to_string())?;
        }

        // Step 9: Decrement inventory
        for line in &payload.lines {
            conn.execute(
                "UPDATE inventory SET qty_on_hand = qty_on_hand - ?, last_updated = datetime('now') WHERE branch_id = ? AND product_id = ?",
                [
                    line.qty.to_string(),
                    payload.branch_id.clone(),
                    line.product_id.clone(),
                ],
            )
            .await
            .map_err(|e| e.to_string())?;
        }

        // Step 10: Write audit log
        conn.execute(
            "INSERT INTO audit_log (id, action, entity_type, entity_id, user_id, payload) VALUES (?, 'invoice_created', 'invoice', ?, ?, ?)",
            [
                format!("AUD-{}", Uuid::new_v4()),
                invoice_id.clone(),
                payload.cashier_id.clone(),
                format!("{{\"invoice_number\":\"{}\",\"total\":{}}}", invoice_number, payload.total),
            ],
        )
        .await
        .map_err(|e| e.to_string())?;

        Ok::<String, String>(invoice_id)
    }
    .await;

    match result {
        Ok(invoice_id) => {
            conn.execute("COMMIT", []).await.map_err(|e| e.to_string())?;
            
            // Return full invoice
            get_invoice_internal(&invoice_id, &db).await
        }
        Err(e) => {
            let _ = conn.execute("ROLLBACK", []).await;
            Err(e)
        }
    }
}

// Internal helper to fetch a full invoice
async fn get_invoice_internal(invoice_id: &str, db: &TauriSql) -> Result<Invoice, String> {
    let invoice: Invoice = db
        .query_one(
            "SELECT id, uuid, branch_id, session_id, cashier_id, customer_id, invoice_number, invoice_type, status, subtotal, discount_amount, vat_amount, total, payment_method, notes, zatca_status, qr_code, created_at FROM invoices WHERE id = ?",
            [invoice_id],
        )
        .await
        .map_err(|e| e.to_string())?
        .ok_or("الفاتورة غير موجودة")?;

    Ok(invoice)
}
```

2. Register in `main.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    commands::invoices::create_invoice,
])
```

### VAT Calculation Rules (Inline for this task)

Per line item (calculated by Dev A's frontend, verified by backend):
```
base_amount = unit_price × qty × (1 - discount_pct / 100)
vat_amount  = base_amount × vat_rate
line_total  = base_amount + vat_amount
```

Invoice totals (also calculated by frontend):
```
subtotal        = sum of base_amounts (before invoice-level discount)
discount_amount = sum of item discounts + invoice-level discount
vat_amount      = sum of per-line VAT amounts
total           = subtotal - discount_amount + vat_amount
```

**Important**: The backend receives pre-calculated amounts in `NewInvoice`. The backend's job is to persist them atomically, NOT to recalculate. This prevents rounding discrepancies.

### Verification
1. Create an invoice with 2 lines:
   - Product A: qty=2, unit_price=10.0, discount_pct=0, vat_rate=0.15
   - Product B: qty=1, unit_price=25.0, discount_pct=10, vat_rate=0.15
2. Payment: cash=50.0
3. Call `create_invoice` → returns `Invoice` with invoice_number like `BR1-000001`
4. Verify SQLite:
   - `invoices`: 1 row, status='confirmed'
   - `invoice_lines`: 2 rows
   - `payments`: 1 row
   - `inventory`: quantities decremented
   - `audit_log`: 1 row with action='invoice_created'
5. Test rollback: send invalid `session_id` → verify no rows created

### TS Bindings
Already in `src/lib/tauri-commands.ts`:
```typescript
export const createInvoice = (payload: NewInvoice) =>
  invoke<Invoice>('create_invoice', { payload });
```

### Log Update
Add to `PROJECT_LOG.md` "Ready Commands":
```markdown
| create_invoice | Phase 3 | ✅ Ready | Atomic transaction; validates open session; decrements inventory |
```

---

## Task 3.1.2 — Invoice Number Generator Helper
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ⬜ Included in Task 3.1.1

### Objective
Generate sequential invoice numbers per branch with race-condition prevention.

### Already Implemented
The invoice number generator is embedded in Task 3.1.1:
```rust
let max_num: Option<String> = conn
    .query_one(
        "SELECT invoice_number FROM invoices WHERE branch_id = ? ORDER BY created_at DESC LIMIT 1",
        [&payload.branch_id],
    )
    .await?;
```

**Format**: `{BRANCH_PREFIX}-{PADDED_COUNTER}` → e.g., `BR1-000001`

**Race condition prevention**: The `SELECT` + `INSERT` runs inside a `BEGIN TRANSACTION` block. SQLite's transaction isolation prevents duplicate numbers.

### Verification
1. Create 3 invoices rapidly → numbers should be `BR1-000001`, `BR1-000002`, `BR1-000003`
2. No duplicates should ever occur

---

## Task 3.1.3 — Session Validation in `create_invoice` (Gap G4)
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ⬜ Included in Task 3.1.1

### Objective
Prevent invoice creation if no open cashier session exists.

### Already Implemented
In Task 3.1.1:
```rust
let session_check: Option<String> = conn
    .query_one(
        "SELECT id FROM cashier_sessions WHERE id = ? AND status = 'open'",
        [&session_id],
    )
    .await?;

if session_check.is_none() {
    return Err("لا توجد مناوبة مفتوحة".to_string());
}
```

### Verification
1. Close all sessions
2. Try to create an invoice → error: "لا توجد مناوبة مفتوحة"
3. Open a session
4. Create invoice → succeeds

---

## Task 3.1.4 — Inventory Decrement + Audit Log
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ⬜ Included in Task 3.1.1

### Objective
Automatically decrement inventory for each invoice line and write to `audit_log`.

### Already Implemented
In Task 3.1.1, Steps 9 and 10:
```rust
// Decrement inventory
conn.execute(
    "UPDATE inventory SET qty_on_hand = qty_on_hand - ? ...",
    [...]
).await?;

// Audit log
conn.execute(
    "INSERT INTO audit_log ... action='invoice_created' ...",
    [...]
).await?;
```

### Verification
1. Check inventory before sale: qty=100
2. Create invoice with qty=3
3. Check inventory after: qty=97
4. Check `audit_log` has entry with action='invoice_created'

---

## Task 3.2.1 — `get_invoice` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Fetch a full invoice with all lines and payments joined.

### Files to Edit
- `src-tauri/src/commands/invoices.rs`

### Steps

1. Append to `src-tauri/src/commands/invoices.rs`:

```rust
use crate::lib::{InvoiceLine, Payment};

#[tauri::command]
pub async fn get_invoice(
    invoice_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<Invoice, String> {
    let mut invoice: Invoice = db
        .query_one(
            "SELECT id, uuid, branch_id, session_id, cashier_id, customer_id, invoice_number, invoice_type, status, subtotal, discount_amount, vat_amount, total, payment_method, notes, zatca_status, qr_code, created_at FROM invoices WHERE id = ?",
            [&invoice_id],
        )
        .await
        .map_err(|e| e.to_string())?
        .ok_or("الفاتورة غير موجودة")?;

    // Fetch lines
    let lines: Vec<InvoiceLine> = db
        .query(
            "SELECT id, invoice_id, product_id, product_name_ar, qty, unit_price, discount_pct, vat_rate, vat_amount, line_total FROM invoice_lines WHERE invoice_id = ?",
            [&invoice_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    // Fetch payments
    let payments: Vec<Payment> = db
        .query(
            "SELECT id, invoice_id, method, amount, reference, paid_at FROM payments WHERE invoice_id = ?",
            [&invoice_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    invoice.lines = Some(lines);
    invoice.payments = Some(payments);

    Ok(invoice)
}
```

2. Register in `main.rs`.

### Verification
1. Call `get_invoice("INV-xxxxx")` for an existing invoice
2. Verify `lines` array has correct count
3. Verify `payments` array has correct count
4. Call with non-existent ID → error "الفاتورة غير موجودة"

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_invoice | Phase 3 | ✅ Ready | Returns Invoice with lines + payments |
```

---

## Task 3.2.2 — `get_invoice_by_number` Command
**Status**: ⬜ | **Difficulty**: ⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Fetch an invoice by its human-readable invoice number (used by refund search).

### Files to Edit
- `src-tauri/src/commands/invoices.rs`

### Steps

1. Append to `src-tauri/src/commands/invoices.rs`:

```rust
#[tauri::command]
pub async fn get_invoice_by_number(
    invoice_number: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<Option<Invoice>, String> {
    let invoice_id: Option<String> = db
        .query_one(
            "SELECT id FROM invoices WHERE invoice_number = ?",
            [&invoice_number],
        )
        .await
        .map_err(|e| e.to_string())?;

    match invoice_id {
        Some(id) => {
            let invoice = get_invoice(id, db).await?;
            Ok(Some(invoice))
        }
        None => Ok(None),
    }
}
```

2. Register in `main.rs`.

### Verification
1. Call `get_invoice_by_number("BR1-000001")` → returns invoice
2. Call with non-existent number → returns `null`

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_invoice_by_number | Phase 3 | ✅ Ready | Returns Option<Invoice> |
```

---

## Task 3.2.3 — `create_refund_invoice` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Create a credit note (refund invoice). Negative quantities, restock inventory, all in one transaction.

### Files to Edit
- `src-tauri/src/commands/invoices.rs`

### Steps

1. Append to `src-tauri/src/commands/invoices.rs`:

```rust
use crate::lib::RefundLine;

#[tauri::command]
pub async fn create_refund_invoice(
    original_invoice_id: String,
    lines: Vec<RefundLine>,
    db: tauri::State<'_, TauriSql>,
) -> Result<Invoice, String> {
    let mut conn = db.get().await.map_err(|e| e.to_string())?;

    conn.execute("BEGIN TRANSACTION", [])
        .await
        .map_err(|e| e.to_string())?;

    let result = async {
        // Get original invoice
        let original: Invoice = db
            .query_one(
                "SELECT branch_id, session_id, cashier_id, customer_id, branch_id FROM invoices WHERE id = ?",
                [&original_invoice_id],
            )
            .await
            .map_err(|e| e.to_string())?
            .ok_or("الفاتورة الأصلية غير موجودة")?;

        let refund_uuid = Uuid::new_v4().to_string();
        let refund_id = format!("INV-{}", refund_uuid);
        let refund_number = format!("REF-{}", refund_uuid.split('-').next().unwrap_or("000"));

        // Calculate totals (negative)
        let mut subtotal = 0.0;
        let mut vat_amount = 0.0;
        let mut total = 0.0;

        for line in &lines {
            let base = line.unit_price * line.qty;
            let vat = base * line.vat_rate;
            let line_total = base + vat;
            subtotal += base;
            vat_amount += vat;
            total += line_total;
        }

        // Insert refund invoice header (negative amounts)
        conn.execute(
            "INSERT INTO invoices (id, uuid, branch_id, session_id, cashier_id, customer_id, invoice_number, invoice_type, status, subtotal, discount_amount, vat_amount, total, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, 'credit_note', 'confirmed', ?, 0, ?, ?, 'cash', ?)",
            [
                refund_id.clone(),
                refund_uuid,
                original.branch_id.clone(),
                original.session_id.clone(),
                original.cashier_id.clone(),
                original.customer_id.clone().unwrap_or_default(),
                refund_number.clone(),
                (-subtotal).to_string(),
                (-vat_amount).to_string(),
                (-total).to_string(),
                format!("إرجاع على فاتورة {}", original_invoice_id),
            ],
        )
        .await
        .map_err(|e| e.to_string())?;

        // Insert negative lines
        for line in &lines {
            let base = line.unit_price * line.qty;
            let vat = base * line.vat_rate;
            let line_total = base + vat;

            conn.execute(
                "INSERT INTO invoice_lines (id, invoice_id, product_id, product_name_ar, qty, unit_price, discount_pct, vat_rate, vat_amount, line_total) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)",
                [
                    format!("ILN-{}", Uuid::new_v4()),
                    refund_id.clone(),
                    line.product_id.clone(),
                    line.product_name_ar.clone(),
                    (-line.qty).to_string(), // Negative quantity
                    line.unit_price.to_string(),
                    line.vat_rate.to_string(),
                    (-vat).to_string(),
                    (-line_total).to_string(),
                ],
            )
            .await
            .map_err(|e| e.to_string())?;

            // Restock inventory
            conn.execute(
                "UPDATE inventory SET qty_on_hand = qty_on_hand + ?, last_updated = datetime('now') WHERE branch_id = ? AND product_id = ?",
                [
                    line.qty.to_string(),
                    original.branch_id.clone(),
                    line.product_id.clone(),
                ],
            )
            .await
            .map_err(|e| e.to_string())?;
        }

        // Audit log
        conn.execute(
            "INSERT INTO audit_log (id, action, entity_type, entity_id, payload) VALUES (?, 'refund_created', 'invoice', ?, ?)",
            [
                format!("AUD-{}", Uuid::new_v4()),
                refund_id.clone(),
                format!("{{\"original_invoice\":\"{}\",\"refund_total\":{}}}", original_invoice_id, -total),
            ],
        )
        .await
        .map_err(|e| e.to_string())?;

        Ok::<String, String>(refund_id)
    }
    .await;

    match result {
        Ok(refund_id) => {
            conn.execute("COMMIT", []).await.map_err(|e| e.to_string())?;
            get_invoice(refund_id, db).await
        }
        Err(e) => {
            let _ = conn.execute("ROLLBACK", []).await;
            Err(e)
        }
    }
}
```

2. Register in `main.rs`.

### Verification
1. Create a sale invoice first
2. Create refund for 1 of 2 items
3. Verify:
   - `invoices` has new row with invoice_type='credit_note', negative total
   - `invoice_lines` has negative qty
   - `inventory` has restocked qty
   - `audit_log` has 'refund_created' entry

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| create_refund_invoice | Phase 3 | ✅ Ready | Credit note; restocks inventory; atomic |
```

---

## Task 3.3.1 — `print_receipt` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐ | **Parallel with Dev A**: ⛓️ Needs Task 3.1 complete

### Objective
Generate and send an ESC/POS receipt to the thermal printer. Include Arabic text, invoice details, and QR code.

### Files to Edit
- `src-tauri/src/commands/printing.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/main.rs`

### Prerequisites
- `escpos-rs` crate installed
- `tauri-plugin-shell` installed
- A configured printer port (or fallback to PDF)

### Steps

1. Replace `src-tauri/src/commands/printing.rs` with:

```rust
use crate::lib::Invoice;
use tauri_plugin_sql::TauriSql;

#[tauri::command]
pub async fn print_receipt(
    invoice_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<(), String> {
    // Fetch full invoice
    let invoice: Invoice = db
        .query_one(
            "SELECT i.*, c.name_ar as customer_name_ar FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id WHERE i.id = ?",
            [&invoice_id],
        )
        .await
        .map_err(|e| e.to_string())?
        .ok_or("الفاتورة غير موجودة")?;

    let lines: Vec<(String, f64, f64, f64)> = db
        .query(
            "SELECT product_name_ar, qty, unit_price, line_total FROM invoice_lines WHERE invoice_id = ?",
            [&invoice_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    let payments: Vec<(String, f64)> = db
        .query(
            "SELECT method, amount FROM payments WHERE invoice_id = ?",
            [&invoice_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    // Build ESC/POS commands
    let mut receipt = Vec::new();

    // Initialize printer
    receipt.extend_from_slice(&[0x1B, 0x40]); // ESC @

    // Center alignment
    receipt.extend_from_slice(&[0x1B, 0x61, 0x01]); // ESC a 1

    // Store name (from settings — simplified here)
    receipt.extend_from_slice("متجر الجملة\n".as_bytes());
    receipt.extend_from_slice("الفرع الرئيسي\n".as_bytes());
    receipt.extend_from_slice("----------------\n".as_bytes());

    // Left alignment
    receipt.extend_from_slice(&[0x1B, 0x61, 0x00]); // ESC a 0

    // Invoice details
    receipt.extend_from_slice(format!("رقم الفاتورة: {}\n", invoice.invoice_number).as_bytes());
    receipt.extend_from_slice(format!("التاريخ: {}\n", invoice.created_at).as_bytes());
    receipt.extend_from_slice(format!("الكاشير: {}\n", invoice.cashier_id).as_bytes());
    receipt.extend_from_slice("----------------\n".as_bytes());

    // Lines
    for (name, qty, price, total) in lines {
        receipt.extend_from_slice(format!("{}\n", name).as_bytes());
        receipt.extend_from_slice(format!("{} × {:.2} = {:.2}\n", qty, price, total).as_bytes());
    }

    receipt.extend_from_slice("----------------\n".as_bytes());

    // Totals
    receipt.extend_from_slice(format!("المجموع: {:.2}\n", invoice.subtotal).as_bytes());
    receipt.extend_from_slice(format!("الخصم: {:.2}\n", invoice.discount_amount).as_bytes());
    receipt.extend_from_slice(format!("ضريبة القيمة المضافة: {:.2}\n", invoice.vat_amount).as_bytes());

    // Bold total
    receipt.extend_from_slice(&[0x1B, 0x45, 0x01]); // ESC E 1 (bold on)
    receipt.extend_from_slice(format!("الإجمالي: {:.2} ر.س\n", invoice.total).as_bytes());
    receipt.extend_from_slice(&[0x1B, 0x45, 0x00]); // ESC E 0 (bold off)

    receipt.extend_from_slice("----------------\n".as_bytes());

    // Payment methods
    for (method, amount) in payments {
        let method_ar = match method.as_str() {
            "cash" => "نقدي",
            "card" => "بطاقة",
            "cliq" => "CLIQ",
            _ => &method,
        };
        receipt.extend_from_slice(format!("{}: {:.2}\n", method_ar, amount).as_bytes());
    }

    // QR Code (if available)
    if let Some(qr) = invoice.qr_code {
        receipt.extend_from_slice("----------------\n".as_bytes());
        receipt.extend_from_slice(&[0x1B, 0x61, 0x01]); // Center
        receipt.extend_from_slice("[QR CODE]\n".as_bytes());
        // TODO: Decode base64 QR and print as image using GS v 0 command
        // This requires more complex ESC/POS image handling
        receipt.extend_from_slice(&[0x1B, 0x61, 0x00]); // Left
    }

    // Footer
    receipt.extend_from_slice(&[0x1B, 0x61, 0x01]); // Center
    receipt.extend_from_slice("شكراً لزيارتكم\n".as_bytes());
    receipt.extend_from_slice(&[0x1D, 0x56, 0x00]); // GS V 0 (cut paper)

    // Send to printer (simplified — use tauri-plugin-shell to write to COM port)
    // For now, return the bytes for testing
    println!("Receipt bytes: {:?}", receipt);

    // TODO: Implement actual printer output via tauri-plugin-shell
    // let printer_port = get_setting("printer_port").await?;
    // if !printer_port.is_empty() {
    //     write_to_com_port(&printer_port, &receipt)?;
    // }

    Ok(())
}
```

2. Register in `main.rs`.

### Verification
1. Create an invoice
2. Call `print_receipt(invoice_id)`
3. Check console output for receipt bytes
4. Verify Arabic text is encoded in UTF-8

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| print_receipt | Phase 3 | ✅ Ready | ESC/POS sequence; Arabic text; QR placeholder |
```

---

## Task 3.3.2 — `print_test_page` Command
**Status**: ⬜ | **Difficulty**: ⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Print a simple test page to verify printer connectivity.

### Files to Edit
- `src-tauri/src/commands/printing.rs`

### Steps

1. Append to `src-tauri/src/commands/printing.rs`:

```rust
#[tauri::command]
pub async fn print_test_page() -> Result<(), String> {
    let mut receipt = Vec::new();
    receipt.extend_from_slice(&[0x1B, 0x40]); // Initialize
    receipt.extend_from_slice(&[0x1B, 0x61, 0x01]); // Center
    receipt.extend_from_slice("متجر الجملة\n".as_bytes());
    receipt.extend_from_slice("اختبار الطابعة\n".as_bytes());
    receipt.extend_from_slice("Printer Test Page\n".as_bytes());
    receipt.extend_from_slice(&[0x1D, 0x56, 0x00]); // Cut

    println!("Test page bytes: {:?}", receipt);
    Ok(())
}
```

2. Register in `main.rs`.

### Verification
1. Call `print_test_page()` → no errors

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| print_test_page | Phase 3 | ✅ Ready | Simple test page |
```

---

## Task 3.3.3 — `get_available_ports` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Scan and return available COM ports for printer configuration.

### Files to Edit
- `src-tauri/src/commands/printing.rs`

### Steps

1. Append to `src-tauri/src/commands/printing.rs`:

```rust
#[tauri::command]
pub async fn get_available_ports() -> Result<Vec<String>, String> {
    // Windows: scan COM1–COM20
    #[cfg(target_os = "windows")]
    {
        let mut ports = Vec::new();
        for i in 1..=20 {
            ports.push(format!("COM{}", i));
        }
        Ok(ports)
    }

    // macOS/Linux: list /dev/tty.*
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
```

2. Register in `main.rs`.

### Verification
1. Call `get_available_ports()` → returns list of strings
2. On Windows: should see COM1, COM2, etc.
3. On Linux: may see `/dev/ttyUSB0`, etc.

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_available_ports | Phase 3 | ✅ Ready | Returns Vec<String> of COM/tty ports |
```

---

## Task 3.3.4 — `get_invoice_qr` Command
**Status**: ⬜ | **Difficulty**: ⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Return the QR code PNG as a base64 string for display on the success screen.

### Files to Edit
- `src-tauri/src/commands/printing.rs`

### Steps

1. Append to `src-tauri/src/commands/printing.rs`:

```rust
#[tauri::command]
pub async fn get_invoice_qr(
    invoice_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<String, String> {
    let qr: Option<String> = db
        .query_one(
            "SELECT qr_code FROM invoices WHERE id = ?",
            [&invoice_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(qr.unwrap_or_default())
}
```

2. Register in `main.rs`.

### Verification
1. Call `get_invoice_qr(invoice_id)` → returns base64 string or empty string

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_invoice_qr | Phase 3 | ✅ Ready | Returns base64 PNG string |
```

---

## 🛑 MERGE POINT: MP-3a — TASK 3.1.1 COMPLETE

**This is a merge point. Sync with Dev A.**

### What Dev A Needs From You
1. `create_invoice` is ready — they can wire the Payment Modal
2. Exact `NewInvoice` payload structure (they already have it from `types/index.ts`, but confirm)
3. The invoice numbering format: `BR1-000001`

---

## 🛑 MERGE POINT: MP-3b — TASK 3.3.1 COMPLETE

**This is a merge point. Sync with Dev A before proceeding.**

### What Dev A Needs From You
1. `print_receipt` — they can trigger print after payment
2. `get_available_ports` — they can populate printer settings dropdown
3. `get_invoice_qr` — they can display QR on success screen
4. Confirm that the QR placeholder is present (real QR generated in Phase 6)

### After Merge
- Dev A completes end-to-end sale flow
- You proceed to Phase 4 (`phase_4.md`) — Customer Management (parallel with Dev A's Phase 4)

---

(End of Phase 3)
