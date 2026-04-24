# Phase 4 — Customer Management (4–5 days)
> **Start: After Phase 3 | Full parallel with Dev A**

---

## Phase 4 Overview

This phase implements customer CRUD, credit account tracking, and invoice history. Can run in parallel with Phase 3 and 5.

**Merge Point: MP-4** — Task 4.1.5 complete. Dev A wires Customer Management UI.

---

## Task 4.1.1 — `get_customers` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Search customers by name, phone, or VAT number.

### Files to Edit
- `src-tauri/src/commands/customers.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/main.rs`

### Steps

1. Replace `src-tauri/src/commands/customers.rs` with:

```rust
use crate::lib::Customer;
use tauri_plugin_sql::TauriSql;

#[tauri::command]
pub async fn get_customers(
    query: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<Vec<Customer>, String> {
    let customers: Vec<Customer> = db
        .query(
            "SELECT id, name_ar, phone, vat_number, cr_number, credit_limit, balance, customer_type, created_at FROM customers WHERE name_ar LIKE '%' || ? || '%' OR phone = ? OR vat_number = ? ORDER BY name_ar LIMIT 50",
            [query.clone(), query.clone(), query],
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(customers)
}
```

2. Register in `main.rs`.

### Verification
1. Call `get_customers("")` → returns all seeded customers
2. Call `get_customers("شركة")` → returns matching B2B customers

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_customers | Phase 4 | ✅ Ready | Returns Vec<Customer>, limit 50 |
```

---

## Task 4.1.2 — `create_customer` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Create a new customer record.

### Files to Edit
- `src-tauri/src/commands/customers.rs`

### Steps

1. Append to `src-tauri/src/commands/customers.rs`:

```rust
use crate::lib::NewCustomer;
use uuid::Uuid;

#[tauri::command]
pub async fn create_customer(
    customer: NewCustomer,
    db: tauri::State<'_, TauriSql>,
) -> Result<Customer, String> {
    let id = format!("CUS-{}", Uuid::new_v4());

    db.execute(
        "INSERT INTO customers (id, name_ar, phone, vat_number, cr_number, credit_limit, balance, customer_type) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
        [
            &id,
            &customer.name_ar,
            &customer.phone.unwrap_or_default(),
            &customer.vat_number.unwrap_or_default(),
            &customer.cr_number.unwrap_or_default(),
            &customer.credit_limit.unwrap_or(0.0).to_string(),
            &customer.customer_type,
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(Customer {
        id,
        name_ar: customer.name_ar,
        phone: customer.phone,
        vat_number: customer.vat_number,
        cr_number: customer.cr_number,
        credit_limit: customer.credit_limit.unwrap_or(0.0),
        balance: 0.0,
        customer_type: customer.customer_type,
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}
```

2. Register in `main.rs`.

### Verification
1. Create a B2C customer → returns customer with balance=0
2. Create a B2B customer with VAT → returns customer with vat_number set

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| create_customer | Phase 4 | ✅ Ready | Returns Customer |
```

---

## Task 4.1.3 — `update_customer` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Update an existing customer's details.

### Files to Edit
- `src-tauri/src/commands/customers.rs`

### Steps

1. Append to `src-tauri/src/commands/customers.rs`:

```rust
#[tauri::command]
pub async fn update_customer(
    id: String,
    data: NewCustomer,
    db: tauri::State<'_, TauriSql>,
) -> Result<Customer, String> {
    db.execute(
        "UPDATE customers SET name_ar = ?, phone = ?, vat_number = ?, cr_number = ?, credit_limit = ?, customer_type = ? WHERE id = ?",
        [
            &data.name_ar,
            &data.phone.unwrap_or_default(),
            &data.vat_number.unwrap_or_default(),
            &data.cr_number.unwrap_or_default(),
            &data.credit_limit.unwrap_or(0.0).to_string(),
            &data.customer_type,
            &id,
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    let updated: Customer = db
        .query_one(
            "SELECT id, name_ar, phone, vat_number, cr_number, credit_limit, balance, customer_type, created_at FROM customers WHERE id = ?",
            [&id],
        )
        .await
        .map_err(|e| e.to_string())?
        .ok_or("العميل غير موجود")?;

    Ok(updated)
}
```

2. Register in `main.rs`.

### Verification
1. Update a customer's phone number
2. Verify the change in `customers` table

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| update_customer | Phase 4 | ✅ Ready | Returns updated Customer |
```

---

## Task 4.1.4 — `get_customer_invoices` + `get_customer_balance` Commands
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Fetch a customer's invoice history and current balance.

### Files to Edit
- `src-tauri/src/commands/customers.rs`

### Steps

1. Append to `src-tauri/src/commands/customers.rs`:

```rust
use crate::lib::Invoice;

#[tauri::command]
pub async fn get_customer_invoices(
    customer_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<Vec<Invoice>, String> {
    let invoices: Vec<Invoice> = db
        .query(
            "SELECT id, uuid, branch_id, session_id, cashier_id, customer_id, invoice_number, invoice_type, status, subtotal, discount_amount, vat_amount, total, payment_method, notes, zatca_status, qr_code, created_at FROM invoices WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50",
            [&customer_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(invoices)
}

#[tauri::command]
pub async fn get_customer_balance(
    customer_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<f64, String> {
    let balance: Option<f64> = db
        .query_one(
            "SELECT COALESCE(SUM(total), 0) FROM invoices WHERE customer_id = ? AND status != 'paid'",
            [&customer_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(balance.unwrap_or(0.0))
}
```

2. Register both in `main.rs`.

### Verification
1. `get_customer_invoices` → returns invoices for that customer
2. `get_customer_balance` → returns sum of unpaid invoice totals

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_customer_invoices | Phase 4 | ✅ Ready | Returns Vec<Invoice>, limit 50 |
| get_customer_balance | Phase 4 | ✅ Ready | Returns f64 (unpaid total) |
```

---

## Task 4.1.5 — `record_customer_payment` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Record a payment against a customer's credit account.

### Files to Edit
- `src-tauri/src/commands/customers.rs`

### Steps

1. Append to `src-tauri/src/commands/customers.rs`:

```rust
#[tauri::command]
pub async fn record_customer_payment(
    customer_id: String,
    amount: f64,
    user_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<(), String> {
    // Update customer balance
    db.execute(
        "UPDATE customers SET balance = balance - ? WHERE id = ?",
        [&amount.to_string(), &customer_id],
    )
    .await
    .map_err(|e| e.to_string())?;

    // Audit log
    db.execute(
        "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, payload) VALUES (?, ?, 'settings_changed', 'customer', ?, ?)",
        [
            format!("AUD-{}", Uuid::new_v4()),
            user_id,
            customer_id,
            format!("{{\"payment_amount\":{}}}", amount),
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
```

2. Register in `main.rs`.

### Verification
1. Record payment of 100.0
2. Verify `customers.balance` decreased by 100
3. Verify `audit_log` has entry

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| record_customer_payment | Phase 4 | ✅ Ready | Updates balance + audit_log |
```

---

## 🛑 MERGE POINT: MP-4 — TASK 4.1.5 COMPLETE

**This is a merge point. Sync with Dev A before proceeding.**

### What Dev A Needs From You
1. `get_customers` — they can build customer search
2. `create_customer` — they can build "Add Customer" modal
3. `update_customer` — they can build "Edit Customer"
4. `get_customer_invoices` — they can show invoice history
5. `get_customer_balance` — they can show credit account
6. `record_customer_payment` — they can add payment recording

### After Merge
- Dev A works on Phase 4 UI (Customers page)
- You proceed to Phase 5 (`phase_5.md`) — Reporting
- Phase 5 can also run in parallel with Phase 4

---

(End of Phase 4)
