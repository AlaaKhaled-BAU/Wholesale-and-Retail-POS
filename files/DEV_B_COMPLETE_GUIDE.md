# DEV_B_COMPLETE_GUIDE.md — Backend Developer
> **For AI Agents assisting Dev B**: You are helping the Rust/Tauri backend developer. Your counterpart is Dev A (React/frontend). Read PROJECT_CONTEXT.md first. Check PROJECT_LOG.md for current status before suggesting any work. Never modify files in `src/` unless you are adding to `src/lib/tauri-commands.ts` or `src/types/index.ts` (and always tell Dev A when you do).

---

## Your Role

**Dev B** owns everything in `src-tauri/` — the Rust application. You build the data layer, Tauri commands, SQLite transactions, ZATCA cryptographic signing, and receipt printing. Dev A's React components call your Rust commands via `invoke()`.

**Golden rule**: When you implement a new Tauri command, immediately add its TypeScript wrapper to `src/lib/tauri-commands.ts` and the corresponding interface to `src/types/index.ts`. Dev A cannot build their UI until you expose the command correctly.

**Communication protocol**: When a command is ready to use, add it to PROJECT_LOG.md under "Ready Commands." Dev A checks this list before wiring up their UI.

---

## Technology You Own

- Rust (stable toolchain via `rustup`)
- Tauri 2.0 runtime and plugin system
- `tauri-plugin-sql` with SQLite
- `tauri-plugin-stronghold` (encrypted key storage for ZATCA)
- `tauri-plugin-shell` (for printing and port detection)
- Rust crates: `bcrypt`, `uuid`, `chrono`, `quick-xml`, `ring` (or `openssl`), `qrcode`, `escpos-rs`, `reqwest`
- SQLite schema design and migrations
- ZATCA Fatoora API integration

---

## Rust Project Structure

```
src-tauri/src/
├── main.rs                  ← app entry point, register all commands
├── lib.rs                   ← (optional) shared types
├── db/
│   ├── mod.rs               ← initialize DB connection, run schema
│   └── schema.sql           ← full DDL (see SCHEMA_REFERENCE.md)
└── commands/
    ├── products.rs          ← get_products, create_product, etc.
    ├── invoices.rs          ← create_invoice, get_invoice, create_refund_invoice
    ├── users.rs             ← login_user, open_cashier_session, close_cashier_session
    ├── inventory.rs         ← get_inventory, adjust_inventory
    ├── customers.rs         ← get_customers, create_customer, etc.
    ├── reports.rs           ← get_daily_summary, get_sales_by_period, export_csv
    ├── zatca.rs             ← ZATCA device registration, XML gen, signing, submission
    ├── printing.rs          ← print_receipt, print_test_page, get_available_ports
    └── settings.rs          ← get_setting, set_setting
```

---

## How to Expose a Tauri Command

In your `commands/products.rs`:
```rust
#[tauri::command]
pub async fn get_products(
    query: String,
    category_id: Option<String>,
    db: tauri::State<'_, DbPool>,
) -> Result<Vec<Product>, String> {
    // ... your SQL logic
    Ok(products)
}
```

Register in `main.rs`:
```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        commands::products::get_products,
        commands::products::create_product,
        // ...
    ])
```

Then add to `src/lib/tauri-commands.ts` (Dev A's file — add this yourself or tell Dev A):
```typescript
export const getProducts = (query: string, categoryId?: string) =>
  invoke<Product[]>('get_products', { query, categoryId });
```

---

## Full Task List with Dependencies

---

### ═══ PHASE 0 — Environment Setup (3–5 days) ═══
**Start: Day 1 | Full parallel with Dev A**

---

#### Task 0.1 — SQLite Schema & Tauri Plugin Setup
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes

**What to do:**
1. Clone the repo that Dev A created in their Task 0.1
2. Add to `Cargo.toml`:
   ```toml
   [dependencies]
   tauri = { version = "2", features = [] }
   tauri-plugin-sql = { version = "2", features = ["sqlite"] }
   tauri-plugin-stronghold = "2"
   tauri-plugin-shell = "2"
   bcrypt = "0.15"
   uuid = { version = "1", features = ["v4"] }
   chrono = { version = "0.4", features = ["serde"] }
   serde = { version = "1", features = ["derive"] }
   serde_json = "1"
   tokio = { version = "1", features = ["full"] }
   ```
3. Create `src-tauri/src/db/schema.sql` — full schema is in `SCHEMA_REFERENCE.md`. Copy it exactly.
4. Create `src-tauri/src/db/mod.rs`:
   ```rust
   use tauri_plugin_sql::{Migration, MigrationKind};

   pub fn get_migrations() -> Vec<Migration> {
       vec![Migration {
           version: 1,
           description: "initial_schema",
           sql: include_str!("schema.sql"),
           kind: MigrationKind::Up,
       }]
   }
   ```
5. In `main.rs`, initialize DB on startup:
   ```rust
   tauri::Builder::default()
       .plugin(tauri_plugin_sql::Builder::new()
           .add_migrations("sqlite:pos.db", db::get_migrations())
           .build())
       .run(...)
   ```
6. Seed data (add a separate `seed.sql` or inline in Rust on first launch check):
   - 1 branch: `{ id: "BR1", name_ar: "الفرع الرئيسي", vat_number: "...", cr_number: "..." }`
   - 1 admin user: `{ name_ar: "المدير", role: "admin", pin_hash: bcrypt("0000") }`
   - 1 cashier: `{ name_ar: "الكاشير", role: "cashier", pin_hash: bcrypt("1234") }`
   - 3 sample products with barcodes

**Deliverable**: App launches; SQLite file created; seed data queryable via DB browser tool

**Communicate to Dev A**: When done, confirm DB is working and share the exact column names from each table. Dev A needs these to build the TypeScript interfaces.

---

#### Task 0.2 — Tauri Command Architecture & TypeScript Bindings
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes (after 0.1)

**What to do:**
1. Create all command module files (even if empty):
   ```
   src-tauri/src/commands/products.rs
   src-tauri/src/commands/invoices.rs
   src-tauri/src/commands/users.rs
   src-tauri/src/commands/inventory.rs
   src-tauri/src/commands/customers.rs
   src-tauri/src/commands/reports.rs
   src-tauri/src/commands/zatca.rs
   src-tauri/src/commands/printing.rs
   src-tauri/src/commands/settings.rs
   ```
2. Define Rust structs for all data types (with `#[derive(Serialize, Deserialize, Debug)]`):
   ```rust
   // In src-tauri/src/lib.rs or a types.rs file
   pub struct Product { pub id: String, pub sku: String, pub barcode: Option<String>,
     pub name_ar: String, pub name_en: Option<String>, pub sell_price: f64,
     pub vat_rate: f64, pub is_active: bool, /* ... */ }
   pub struct Invoice { /* ... */ }
   pub struct Customer { /* ... */ }
   pub struct User { pub id: String, pub name_ar: String, pub role: String, pub branch_id: String }
   pub struct SessionToken { pub user_id: String, pub name_ar: String, pub role: String, pub branch_id: String, pub session_id: String }
   ```
3. Write `src/lib/tauri-commands.ts` stubs — one exported function per command you'll implement. Dev A uses this file exclusively to call your commands.
4. Write `src/types/index.ts` — TypeScript interfaces matching your Rust structs exactly.

**Deliverable**: `invoke('get_products', { query: '' })` returns the 3 seeded products; TypeScript types compile without errors

---

### ═══ PHASE 1 — Authentication (4–6 days) ═══
**Start: After Phase 0 | Parallel with Dev A**

---

#### Task 1.1 — Authentication Rust Commands
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes

**What to do:**

Implement in `src-tauri/src/commands/users.rs`:

**`login_user(pin: String) -> Result<SessionToken, String>`**:
1. Hash the input PIN using `bcrypt::verify()` against all active users
2. Query `SELECT * FROM users WHERE is_active = 1`
3. For each user, check `bcrypt::verify(&pin, &user.pin_hash)`
4. If match found: create a session token struct and return it
5. If no match: return `Err("رقم التعريف غير صحيح".to_string())`

**`open_cashier_session(user_id: String, opening_float: f64) -> Result<String, String>`**:
1. Check no open session exists: `SELECT id FROM cashier_sessions WHERE user_id = ? AND status = 'open'`
2. If exists: return the existing session ID (or error — your choice)
3. If not: INSERT new row, return session ID

**`close_cashier_session(session_id: String, closing_cash: f64, user_id: String) -> Result<(), String>`**:
*(This command is not in the original roadmap but is required for end-of-day Z-report — Gap G1)*
1. UPDATE cashier_sessions SET closed_at = datetime('now'), closing_cash = ?, status = 'closed' WHERE id = ?
2. Write to audit_log: `{ action: 'session_closed', entity_id: session_id, user_id }`
3. Return Ok(())

**`get_current_session(user_id: String) -> Result<Option<SessionInfo>, String>`**:
- SELECT from cashier_sessions WHERE user_id = ? AND status = 'open'

Store the active session in Tauri managed state:
```rust
pub struct AppState { pub current_session: Mutex<Option<SessionInfo>> }
// Register in main.rs: .manage(AppState { current_session: Mutex::new(None) })
```

**Deliverable**: `login_user("1234")` returns user data; session stored in managed state

**Communicate to Dev A**: When done, update `src/lib/tauri-commands.ts` with `loginUser`, `openCashierSession`, `closeCashierSession`. Tell Dev A it's ready.

---

### ═══ PHASE 2 — Product Management (5–7 days) ═══
**Start: After Phase 1 | Dev B leads, 1-day head start on Dev A**

---

#### Task 2.1 — Product CRUD Commands
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes (Dev A starts their UI 1 day after you start)

Implement in `src-tauri/src/commands/products.rs`:

**`get_products(query: String, category_id: Option<String>) -> Result<Vec<Product>>`**:
```sql
SELECT p.*, c.name_ar as category_name,
       COALESCE(i.qty_on_hand, 0) as stock
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?
WHERE p.is_active = 1
  AND (p.name_ar LIKE '%' || ? || '%' OR p.barcode = ? OR p.sku = ?)
  [AND p.category_id = ? IF category_id provided]
ORDER BY p.name_ar
LIMIT 50
```

**`get_product_by_barcode(barcode: String) -> Result<Option<Product>>`**:
- Used by barcode scanner; must return in <50ms

**`create_product(product: NewProduct) -> Result<Product>`**:
- Generate UUID for id
- If SKU is empty, auto-generate: `SKU-{timestamp}`
- Auto-create inventory row: `INSERT INTO inventory(id, branch_id, product_id, qty_on_hand) VALUES (uuid, current_branch, product_id, 0)`

**`update_product(id: String, product: UpdateProduct) -> Result<Product>`**

**`toggle_product_active(id: String) -> Result<()>`**:
- `UPDATE products SET is_active = NOT is_active WHERE id = ?`

**`get_categories() -> Result<Vec<Category>>`**

**`create_category(name_ar: String, name_en: Option<String>) -> Result<Category>`**

**Deliverable**: All commands functional; test via Dev A's debug UI or a Rust unit test

---

#### Task 2.2 — Inventory Level Commands
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes (parallel with 2.1)

Implement in `src-tauri/src/commands/inventory.rs`:

**`get_inventory(branch_id: String) -> Result<Vec<InventoryItem>>`**:
```sql
SELECT p.id, p.name_ar, p.sku, p.barcode, i.qty_on_hand,
       i.low_stock_threshold, (i.qty_on_hand * p.cost_price) as stock_value
FROM inventory i
JOIN products p ON p.id = i.product_id
WHERE i.branch_id = ?
ORDER BY p.name_ar
```

**`adjust_inventory(branch_id: String, product_id: String, new_qty: f64, reason: String, user_id: String) -> Result<()>`**:
1. UPDATE inventory SET qty_on_hand = ?, last_updated = datetime('now') WHERE branch_id = ? AND product_id = ?
2. INSERT into audit_log: `{ action: 'inventory_adjusted', entity_type: 'inventory', entity_id: product_id, payload: JSON({old_qty, new_qty, reason}), user_id }`

**`get_inventory_by_product(branch_id: String, product_id: String) -> Result<InventoryItem>`**:
- Used during sale to check stock before completing transaction

**Deliverable**: Inventory table populated; adjustments write to audit_log

---

### ═══ PHASE 3 — Invoice & Sales (10–14 days) ═══
**Start: After Phase 2 | Critical path — most complex phase**

---

#### Task 3.1 — Invoice Save Command (Critical)
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes (parallel with Dev A's cart UI)

Implement `create_invoice` in `src-tauri/src/commands/invoices.rs`.

**This entire function must run inside a single SQLite transaction.** If any step fails, everything rolls back.

```rust
#[tauri::command]
pub async fn create_invoice(payload: NewInvoice, db: State<'_, DbPool>, app_state: State<'_, AppState>) -> Result<Invoice, String> {
    let mut conn = db.get().await.map_err(|e| e.to_string())?;
    
    conn.execute("BEGIN TRANSACTION", []).await?;
    
    // Step 1: Generate IDs
    let invoice_uuid = Uuid::new_v4().to_string();
    
    // Step 2: Generate invoice number (branch prefix + padded counter)
    let max_num: Option<String> = conn.query_one(
        "SELECT invoice_number FROM invoices WHERE branch_id = ? ORDER BY created_at DESC LIMIT 1",
        [&payload.branch_id]
    ).await?;
    let next_counter = parse_counter(&max_num) + 1;
    let invoice_number = format!("{}-{:06}", payload.branch_prefix, next_counter);
    // e.g., "BR1-000001"
    
    // Step 3: Validate open session
    let session = app_state.current_session.lock().unwrap();
    let session_id = session.as_ref().ok_or("لا توجد مناوبة مفتوحة")?.session_id.clone();
    drop(session);
    
    // Step 4: Insert invoice header
    conn.execute("INSERT INTO invoices (...) VALUES (...)", [...]).await?;
    
    // Step 5: Insert invoice lines
    for line in &payload.lines {
        conn.execute("INSERT INTO invoice_lines (...) VALUES (...)", [...]).await?;
    }
    
    // Step 6: Insert payments
    for payment in &payload.payments {
        conn.execute("INSERT INTO payments (...) VALUES (...)", [...]).await?;
    }
    
    // Step 7: Decrement inventory for each line
    for line in &payload.lines {
        conn.execute(
            "UPDATE inventory SET qty_on_hand = qty_on_hand - ?, last_updated = datetime('now') WHERE branch_id = ? AND product_id = ?",
            [line.qty, &payload.branch_id, &line.product_id]
        ).await?;
    }
    
    // Step 8: Write audit log
    conn.execute("INSERT INTO audit_log (...) VALUES (...)", [...]).await?;
    
    conn.execute("COMMIT", []).await?;
    
    // Return full invoice
    get_invoice_by_id(invoice_uuid, db).await
}
```

The `NewInvoice` payload struct that Dev A sends:
```rust
pub struct NewInvoice {
    pub branch_id: String,
    pub branch_prefix: String,   // "BR1"
    pub cashier_id: String,
    pub customer_id: Option<String>,
    pub invoice_type: String,    // "simplified" or "standard"
    pub lines: Vec<NewInvoiceLine>,
    pub payments: Vec<NewPayment>,
    pub subtotal: f64,
    pub discount_amount: f64,
    pub vat_amount: f64,
    pub total: f64,
    pub notes: Option<String>,
}
```

**Deliverable**: Creating a sale from the UI: invoice appears in SQLite with all lines; inventory decremented; all inside one atomic transaction

---

#### Task 3.2 — Additional Invoice Commands
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes

**`get_invoice(invoice_id: String) -> Result<Invoice>`** — full invoice with lines and payments

**`get_invoice_by_number(invoice_number: String) -> Result<Option<Invoice>>`** — used by refund search

**`create_refund_invoice(original_invoice_id: String, lines: Vec<RefundLine>) -> Result<Invoice>`**:
1. Look up original invoice
2. For each refund line: create a negative invoice line (qty and amounts are negative)
3. Restock inventory (inverse of sale): `UPDATE inventory SET qty_on_hand = qty_on_hand + ? WHERE ...`
4. Set `invoice_type = 'credit_note'` and `invoice.subtotal` as negative
5. All in one transaction
6. Write to audit_log

**`get_suspended_invoices()` is NOT needed** — Dev A handles parked carts entirely in memory (Zustand). No DB involvement until final sale.

---

#### Task 3.3 — Receipt Printing Command
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐ | **Parallel with Dev A**: ⛓️ Needs Task 3.1 complete

Implement in `src-tauri/src/commands/printing.rs`:

**`print_receipt(invoice_id: String) -> Result<(), String>`**:
1. Fetch full invoice from DB (with all lines, payments, customer, branch info)
2. Build ESC/POS command sequence using `escpos-rs`:
   ```
   [Center] Store name (Arabic) + logo if configured
   [Center] Branch name + address
   [Left] VAT Number: xxx | CR: xxx
   [Line separator]
   [Left] Invoice #: BR1-000001
   [Left] Date: DD/MM/YYYY (+ Hijri date)
   [Left] Cashier: علاء
   [Line separator]
   For each line:
     [Right] product name_ar
     [Right] qty × unit_price = line_total
     [Right] Discount if any
   [Line separator]
   [Right] Subtotal: xx.xx
   [Right] VAT (15%): xx.xx
   [Bold Right] TOTAL: xx.xx SAR
   [Line separator]
   [Right] Payment: [method]
   [Right] Change: xx.xx  (if cash)
   [Line separator]
   [Center] QR Code (if available, as PNG via GS v 0 command)
   [Center] شكراً لزيارتكم
   [Cut paper]
   ```
3. Send to printer: use `tauri-plugin-shell` to run the ESC/POS commands via a named COM port or USB device path
4. **Fallback**: if no printer configured, generate a PDF preview instead (use a simple HTML→PDF approach)

**`print_test_page() -> Result<(), String>`** — prints a test page with just store name and date

**`get_available_ports() -> Result<Vec<String>, String>`**:
```rust
// On Windows, scan registry or try COM1–COM20
// Return list of available COM ports
// Also check for USB ESC/POS printers via USB enumeration
```

**`get_invoice_qr(invoice_id: String) -> Result<String, String>`**:
- Returns the QR code PNG as base64 string
- Dev A displays this in the post-sale success screen

**Deliverable**: Physical receipt prints correctly; QR placeholder present (real QR added in Phase 6)

---

### ═══ PHASE 4 — Customer Management (4–5 days) ═══
**Start: After Phase 3 | Full parallel with Dev A**

---

#### Task 4.1 — Customer CRUD Commands
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

Implement in `src-tauri/src/commands/customers.rs`:

**`get_customers(query: String) -> Result<Vec<Customer>>`**:
```sql
SELECT * FROM customers
WHERE name_ar LIKE '%' || ? || '%' OR phone = ? OR vat_number = ?
ORDER BY name_ar LIMIT 50
```

**`create_customer(customer: NewCustomer) -> Result<Customer>`**

**`update_customer(id: String, data: UpdateCustomer) -> Result<Customer>`**

**`get_customer_invoices(customer_id: String) -> Result<Vec<Invoice>>`**:
```sql
SELECT id, invoice_number, total, status, created_at
FROM invoices WHERE customer_id = ?
ORDER BY created_at DESC LIMIT 50
```

**`get_customer_balance(customer_id: String) -> Result<f64>`**:
```sql
-- Balance = sum of unpaid invoice totals
SELECT COALESCE(SUM(total), 0) FROM invoices
WHERE customer_id = ? AND status != 'paid'
```

**`record_customer_payment(customer_id: String, amount: f64, user_id: String) -> Result<()>`**:
- Update customer.balance
- Write to audit_log

**Deliverable**: All commands functional; B2B customer selected in POS gets their VAT number on the invoice

---

### ═══ PHASE 5 — Reporting (4–5 days) ═══
**Start: After Phase 3 | Full parallel with Dev A**

---

#### Task 5.1 — Report Query Commands
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes

Implement in `src-tauri/src/commands/reports.rs`:

**`get_daily_summary(branch_id: String, date: String) -> Result<DailySummary>`**:
```sql
SELECT
  COUNT(*) as invoice_count,
  SUM(subtotal) as total_sales,
  SUM(vat_amount) as total_vat,
  SUM(total) as grand_total
FROM invoices
WHERE branch_id = ? AND DATE(created_at) = ? AND status != 'cancelled'
```
Plus a second query for payment method breakdown.
Plus a query for top 5 products by qty sold that day.

**`get_sales_by_period(branch_id: String, from_date: String, to_date: String) -> Result<Vec<DailySales>>`**:
```sql
SELECT DATE(created_at) as sale_date,
       COUNT(*) as invoice_count, SUM(total) as total_sales, SUM(vat_amount) as total_vat
FROM invoices
WHERE branch_id = ? AND DATE(created_at) BETWEEN ? AND ?
GROUP BY DATE(created_at)
ORDER BY sale_date
```

**`get_inventory_report(branch_id: String) -> Result<Vec<InventoryReportRow>>`**:
```sql
SELECT p.name_ar, p.sku, i.qty_on_hand, i.low_stock_threshold,
       (i.qty_on_hand * p.cost_price) as stock_value,
       (i.qty_on_hand <= i.low_stock_threshold) as is_low_stock
FROM inventory i JOIN products p ON p.id = i.product_id
WHERE i.branch_id = ?
ORDER BY is_low_stock DESC, p.name_ar
```

**`get_cashier_session_report(session_id: String) -> Result<SessionReport>`**:
```sql
SELECT cs.*, SUM(i.total) as total_sales, COUNT(i.id) as invoice_count
FROM cashier_sessions cs
LEFT JOIN invoices i ON i.session_id = cs.id
WHERE cs.id = ?
GROUP BY cs.id
```
Plus per-payment-method breakdown for this session.

**`export_invoices_csv(branch_id: String, from_date: String, to_date: String) -> Result<String>`**:
- Returns CSV string with header row + one row per invoice
- Dev A triggers browser download from this string

**Deliverable**: All queries verified against seed data; results match expected totals

---

### ═══ PHASE 6 — ZATCA (6–8 days) ═══
**Start: After Phase 3 | This is the hardest phase — Dev B sequential, Dev A works on Phase 7 in parallel**

> ⚠️ Tasks 6.1 through 6.4 must be done sequentially (each depends on the previous). This will take 6–8 days. Dev A has limited work in this phase (only Task 6.5 — about 2 days). Dev A should work on Phase 7 Settings UI during this time.

---

#### Task 6.1 — ZATCA Device Registration (One-Time Setup)
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐⭐ | **Sequential**: ❌ Must be done before 6.2

**Resources**:
- ZATCA developer docs: https://zatca.gov.sa/en/E-Invoicing
- Sandbox portal: https://fatoora.zatca.gov.sa (create an account)
- API: `https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/`

**What to do:**

**Step 1 — Generate ECDSA P-256 private key + CSR**:
```rust
// Use the openssl crate or call openssl CLI via tauri-plugin-shell
// The CSR must include ZATCA-specific OID extensions:
// OID 2.16.840.1.114564.1.1.1.1 = CR Number (السجل التجاري)
// OID 2.16.840.1.114564.1.1.1.2 = Invoice type ("1000" for simplified, "0100" for standard)
// OID 2.16.840.1.114564.1.1.1.3 = Location code
// OID 2.16.840.1.114564.1.1.1.4 = Branch name
// OID 2.16.840.1.114564.1.1.1.5 = Device serial number
```

**Step 2 — Compliance check API call**:
```
POST https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/compliance
Authorization: Basic <OTP>  (one-time password from ZATCA portal)
Body: { "csr": "<base64-encoded CSR>" }
Response: { "requestID": "...", "dispositionMessage": "ISSUED" }
```

**Step 3 — Get CSID**:
```
POST https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/compliance/seals
Body: { "requestID": "..." }
Response: { "binarySecurityToken": "...", "secret": "...", "tokenType": "..." }
```

**Step 4 — Store credentials in Stronghold** (never in plaintext):
```rust
// Use tauri-plugin-stronghold
stronghold.store("zatca_csid", csid_value);
stronghold.store("zatca_secret", secret_value);
stronghold.store("zatca_private_key", private_key_pem);
```

Add a `register_zatca_device(otp: String) -> Result<(), String>` command that Dev A's Settings screen can call.

**Deliverable**: CSID obtained in ZATCA sandbox; stored securely in Stronghold; `get_zatca_status()` command returns "registered"

---

#### Task 6.2 — UBL 2.1 XML Invoice Generation
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐⭐ | **Depends on**: 6.1 complete

**What to do:**
Using the `quick-xml` crate, implement `generate_invoice_xml(invoice: &Invoice) -> Result<String>`:

Required UBL 2.1 structure (simplified invoice):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" ...>
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>{invoice_number}</cbc:ID>
  <cbc:UUID>{invoice_uuid}</cbc:UUID>
  <cbc:IssueDate>{YYYY-MM-DD}</cbc:IssueDate>
  <cbc:IssueTime>{HH:MM:SS}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>
  <!-- seller info -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="CRN">{cr_number}</cbc:ID></cac:PartyIdentification>
      <cac:PostalAddress>...</cac:PostalAddress>
      <cac:PartyTaxScheme><cbc:CompanyID>{vat_number}</cbc:CompanyID></cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>{store_name}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <!-- buyer info (for B2B only) -->
  <!-- invoice lines -->
  <!-- tax totals -->
  <!-- monetary totals -->
</Invoice>
```

Write unit tests: generate XML for a test invoice, validate against ZATCA's sample XMLs from their developer portal.

**Deliverable**: XML output for a test invoice passes ZATCA's online XML validator tool

---

#### Task 6.3 — Cryptographic Signing & QR Code Generation
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐⭐ | **Depends on**: 6.2 complete

**What to do:**

**Invoice signing:**
1. Canonicalize the XML (C14N)
2. SHA-256 hash the canonical XML → base64 encode = `invoice_hash`
3. ECDSA P-256 sign the hash using private key from Stronghold → `signature_value`
4. Embed in XML: `<ds:SignatureValue>{signature_value}</ds:SignatureValue>`
5. Store `invoice_hash` in `invoices.qr_code` column for later use

**QR Code (TLV format)**:
```rust
fn build_zatca_qr(invoice: &Invoice, seller_name: &str, seller_vat: &str, signature: &str, public_key: &str) -> Vec<u8> {
    let mut tlv = Vec::new();
    tlv.extend(encode_tlv(1, seller_name.as_bytes()));             // Tag 1: Seller name
    tlv.extend(encode_tlv(2, seller_vat.as_bytes()));              // Tag 2: Seller VAT
    tlv.extend(encode_tlv(3, invoice.created_at.as_bytes()));      // Tag 3: Timestamp
    tlv.extend(encode_tlv(4, invoice.total.to_string().as_bytes())); // Tag 4: Total with VAT
    tlv.extend(encode_tlv(5, invoice.vat_amount.to_string().as_bytes())); // Tag 5: VAT amount
    tlv.extend(encode_tlv(6, invoice_hash.as_bytes()));            // Tag 6: Invoice hash
    tlv.extend(encode_tlv(7, signature.as_bytes()));               // Tag 7: ECDSA signature
    tlv.extend(encode_tlv(8, public_key.as_bytes()));              // Tag 8: Public key
    tlv.extend(encode_tlv(9, cert_timestamp.as_bytes()));          // Tag 9: Cert timestamp
    tlv
}

fn encode_tlv(tag: u8, value: &[u8]) -> Vec<u8> {
    let mut result = vec![tag, value.len() as u8];
    result.extend_from_slice(value);
    result
}
```

Then base64-encode the TLV bytes → generate PNG QR code using `qrcode` crate.
Store QR code PNG as base64 in `invoices.qr_code`.

Update `invoices` table: add `invoice_hash TEXT` column to schema.

**Deliverable**: Generated QR code is scannable with ZATCA Fatoora mobile app; shows correct invoice details

---

#### Task 6.4 — ZATCA API Submission
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐ | **Depends on**: 6.3 complete

Implement `submit_to_zatca(invoice_id: String) -> Result<ZatcaResponse, String>` using `reqwest`:

```
POST https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/reporting/single
Authorization: Basic {base64(csid:secret)}
Content-Type: application/json
Accept-Version: V2
Accept-Language: en

Body:
{
  "invoiceHash": "{invoice_hash}",
  "uuid": "{invoice_uuid}",
  "invoice": "{base64(signed_xml)}"
}
```

Handle responses:
- 200: accepted → `UPDATE invoices SET zatca_status = 'reported' WHERE id = ?`
- 400: validation error → store error JSON in `invoices.zatca_response`, set status = 'rejected'
- 503 / network error → queue for retry

**Implement retry queue**:
```sql
CREATE TABLE IF NOT EXISTS zatca_queue (
  id TEXT PRIMARY KEY,
  invoice_id TEXT REFERENCES invoices(id),
  queued_at TEXT DEFAULT (datetime('now')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT
);
```

Background Rust task (use `tokio::spawn` + sleep loop):
```rust
tokio::spawn(async move {
    loop {
        tokio::time::sleep(Duration::from_secs(600)).await; // 10 minutes
        retry_zatca_queue(&db, &stronghold).await;
    }
});
```

Flag invoices approaching the 24-hour deadline:
```sql
-- In the queue check, flag urgently
SELECT * FROM zatca_queue q
JOIN invoices i ON i.id = q.invoice_id
WHERE JULIANDAY('now') - JULIANDAY(i.created_at) > 0.9 -- 21.6 hours
```

Add commands: `retry_zatca_queue() -> Result<()>` and `get_zatca_status() -> Result<ZatcaStatusInfo>`

**Deliverable**: Test B2C invoice submitted to ZATCA sandbox → accepted response received

---

### ═══ PHASE 7 — Settings (3–4 days) ═══
**Start: After Phase 3 (can be started during Phase 6 ZATCA)**

---

#### Task 7.1 — Settings Persistence Commands
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

Add `settings` table to schema (see SCHEMA_REFERENCE.md — it's already included).

Implement in `src-tauri/src/commands/settings.rs`:

**`get_setting(key: String) -> Result<Option<String>>`**

**`set_setting(key: String, value: String) -> Result<()>`**:
- UPDATE if exists, INSERT if not
- Update timestamp

**`get_all_settings() -> Result<HashMap<String, String>>`**:
- Called on app startup to load all settings into managed state for fast access

**Pre-populate defaults** (on first launch check):
```rust
let defaults = [
    ("vat_rate", "0.15"),
    ("printer_port", ""),
    ("printer_type", "usb"),
    ("branch_name_ar", "الفرع الرئيسي"),
    ("invoice_note", "شكراً لزيارتكم — يُرجى الاحتفاظ بالفاتورة"),
    ("numerals", "western"),    // "western" or "arabic"
    ("auto_lock_minutes", "5"),
];
```

Load settings on startup into `tauri::State<AppSettings>` for fast access without a DB query on each invoice.

**Deliverable**: Settings persist across restarts; VAT rate change reflects in new invoice calculations

---

### ═══ PHASE 8 — Demo Polish & QA (4–5 days) ═══

---

#### Task 8.1 — Demo Data Seeding
**Status**: ⬜ | **Difficulty**: ⭐ | **Parallel with Dev A**: ✅ Yes

Create `src-tauri/src/db/seed_demo.sql`:
- 5 categories: مواد غذائية | منظفات | مشروبات | مستلزمات مكتبية | أخرى
- 50 products with Arabic names, realistic barcodes (EAN-13), prices
- 10 customers: 5 B2B (with VAT numbers) + 5 B2C
- 30 invoices over the past 7 days (so reports look real)
- Invoice lines for each invoice
- 2 users: admin (PIN: 0000) and cashier (PIN: 1234)

Implement `seed_demo_data() -> Result<()>` Tauri command.

Add a "Reset to Demo" button in Settings — visible only when a debug flag is set in the build config.

**Deliverable**: Fresh install shows realistic demo data in <5 seconds

---

#### Task 8.2 — Performance & DB Indexes
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes

Add these indexes to `schema.sql` (as a migration or in the initial schema):
```sql
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name_ar);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_branch ON invoices(branch_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch_product ON inventory(branch_id, product_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
```

Performance targets to test:
- Product search (10,000 products): `get_products("apple")` → <100ms
- Invoice save: `create_invoice(50 lines)` → <500ms including inventory updates
- App startup (Phase 0 → POS screen): <3 seconds
- Receipt print: <3 seconds from payment confirmation
- Stress test: add 500 items to cart, confirm — app should not crash

**Deliverable**: All performance targets met; no crashes after 4 hours continuous operation

---

#### Task 8.3 — End-to-End Demo Walkthrough (Joint with Dev A)
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel**: ❌ Must be joint

Same script as in Dev A's guide — run together, fix all bugs found.

---

## Dev B — Merge Points with Dev A

| When | What to Sync |
|------|-------------|
| End of Phase 0 | Share TypeScript interfaces + Rust struct definitions — must match exactly |
| Task 1.1 done | Tell Dev A: `login_user`, `open_cashier_session`, `close_cashier_session` are ready |
| Task 2.1 done | Tell Dev A: `get_products`, `create_product`, `get_categories` are ready |
| Task 3.1 done | Tell Dev A: `create_invoice` is ready — provide the full `NewInvoice` payload type |
| Task 3.3 done | Tell Dev A: `print_receipt`, `get_available_ports`, `get_invoice_qr` are ready |
| Task 6.3 done | Tell Dev A: QR code format is base64 PNG stored in `invoices.qr_code` |
| Phase 7 done | Tell Dev A: settings commands ready — `get_all_settings`, `set_setting` |
| Phase 8 | Both present for joint walkthrough |

---

## Dev B — What to Do When Waiting

| Situation | Do This |
|-----------|---------|
| Waiting for Dev A to finish Phase 0 scaffolding | Set up your local Rust environment and study `tauri-plugin-sql` docs |
| Finished Phase 1 early | Start Phase 2 product commands immediately — Dev A will catch up in 1 day |
| Dev A is testing and finding bugs | Fix bugs from PROJECT_LOG.md bug list |
| ZATCA Phase 6 is running (your longest stretch) | Keep Dev A updated daily on progress; they're working on Phase 7 independently |
