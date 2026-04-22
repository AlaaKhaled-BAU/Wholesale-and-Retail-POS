# Phase 0 — Environment Setup (3–5 days)
> **Start: Day 1 | Full parallel with Dev A**

---

## Phase 0 Overview

This phase establishes the foundation: SQLite schema, Rust dependencies, command module architecture, and TypeScript bindings. Everything built here is required by all subsequent phases.

**Merge Point: MP-0** — End of Phase 0. Dev A needs `src/types/index.ts` and `src/lib/tauri-commands.ts` stubs to match Rust structs.

---

## Task 0.1.1 — Create `src-tauri/src/db/schema.sql`
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Create the full SQLite database schema with all MVP tables, constraints, foreign keys, and performance indexes.

### Files to Create
- `src-tauri/src/db/schema.sql`

### Steps

1. Create the directory if it doesn't exist:
   ```bash
   mkdir -p src-tauri/src/db
   ```

2. Create `src-tauri/src/db/schema.sql` with this **exact** content (copy every line):

```sql
-- ========================================
-- Branches
-- ========================================
CREATE TABLE IF NOT EXISTS branches (
  id          TEXT PRIMARY KEY,
  name_ar     TEXT NOT NULL,
  name_en     TEXT,
  address     TEXT,
  vat_number  TEXT,
  cr_number   TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- Users (cashiers, managers, admins)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  branch_id   TEXT REFERENCES branches(id),
  name_ar     TEXT NOT NULL,
  role        TEXT NOT NULL CHECK(role IN ('admin','manager','cashier')),
  pin_hash    TEXT NOT NULL,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- Product Categories
-- ========================================
CREATE TABLE IF NOT EXISTS categories (
  id        TEXT PRIMARY KEY,
  name_ar   TEXT NOT NULL,
  name_en   TEXT
);

-- ========================================
-- Products
-- ========================================
CREATE TABLE IF NOT EXISTS products (
  id           TEXT PRIMARY KEY,
  sku          TEXT UNIQUE NOT NULL,
  barcode      TEXT,
  name_ar      TEXT NOT NULL,
  name_en      TEXT,
  category_id  TEXT REFERENCES categories(id),
  unit         TEXT DEFAULT 'piece',
  cost_price   REAL DEFAULT 0,
  sell_price   REAL NOT NULL,
  vat_rate     REAL DEFAULT 0.15,
  is_active    INTEGER DEFAULT 1,
  created_at   TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- Inventory (stock levels per branch + product)
-- ========================================
CREATE TABLE IF NOT EXISTS inventory (
  id                  TEXT PRIMARY KEY,
  branch_id           TEXT REFERENCES branches(id),
  product_id          TEXT REFERENCES products(id),
  qty_on_hand         REAL DEFAULT 0,
  low_stock_threshold REAL DEFAULT 5,
  last_updated        TEXT DEFAULT (datetime('now')),
  UNIQUE(branch_id, product_id)
);

-- ========================================
-- Customers
-- ========================================
CREATE TABLE IF NOT EXISTS customers (
  id            TEXT PRIMARY KEY,
  name_ar       TEXT NOT NULL,
  phone         TEXT,
  vat_number    TEXT,
  cr_number     TEXT,
  credit_limit  REAL DEFAULT 0,
  balance       REAL DEFAULT 0,
  customer_type TEXT DEFAULT 'b2c' CHECK(customer_type IN ('b2c', 'b2b')),
  created_at    TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- Cashier Sessions (shift management)
-- ========================================
CREATE TABLE IF NOT EXISTS cashier_sessions (
  id             TEXT PRIMARY KEY,
  user_id        TEXT REFERENCES users(id),
  branch_id      TEXT REFERENCES branches(id),
  opened_at      TEXT NOT NULL,
  closed_at      TEXT,
  opening_float  REAL DEFAULT 0,
  closing_cash   REAL,
  status         TEXT DEFAULT 'open' CHECK(status IN ('open','closed'))
);

-- ========================================
-- Invoices (sale headers)
-- ========================================
CREATE TABLE IF NOT EXISTS invoices (
  id               TEXT PRIMARY KEY,
  uuid             TEXT UNIQUE NOT NULL,
  branch_id        TEXT REFERENCES branches(id),
  session_id       TEXT REFERENCES cashier_sessions(id),
  cashier_id       TEXT REFERENCES users(id),
  customer_id      TEXT REFERENCES customers(id),
  invoice_number   TEXT UNIQUE NOT NULL,
  invoice_type     TEXT DEFAULT 'simplified' CHECK(invoice_type IN ('simplified','standard','credit_note')),
  status           TEXT DEFAULT 'draft' CHECK(status IN ('draft','confirmed','cancelled')),
  subtotal         REAL NOT NULL,
  discount_amount  REAL DEFAULT 0,
  vat_amount       REAL NOT NULL,
  total            REAL NOT NULL,
  payment_method   TEXT,
  notes            TEXT,
  invoice_hash     TEXT,
  zatca_status     TEXT DEFAULT 'pending' CHECK(zatca_status IN ('pending','reported','rejected','not_required')),
  zatca_response   TEXT,
  qr_code          TEXT,
  created_at       TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- Invoice Lines (items per invoice)
-- ========================================
CREATE TABLE IF NOT EXISTS invoice_lines (
  id               TEXT PRIMARY KEY,
  invoice_id       TEXT REFERENCES invoices(id),
  product_id       TEXT REFERENCES products(id),
  product_name_ar  TEXT NOT NULL,
  qty              REAL NOT NULL,
  unit_price       REAL NOT NULL,
  discount_pct     REAL DEFAULT 0,
  vat_rate         REAL DEFAULT 0.15,
  vat_amount       REAL NOT NULL,
  line_total       REAL NOT NULL
);

-- ========================================
-- Payments (supports split payment)
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT REFERENCES invoices(id),
  method      TEXT NOT NULL CHECK(method IN ('cash','card','cliq')),
  amount      REAL NOT NULL,
  reference   TEXT,
  paid_at     TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- Audit Log (immutable — never DELETE from this table)
-- ========================================
CREATE TABLE IF NOT EXISTS audit_log (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    TEXT,
  payload      TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- Settings (key-value store)
-- ========================================
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- ZATCA Submission Queue
-- ========================================
CREATE TABLE IF NOT EXISTS zatca_queue (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT REFERENCES invoices(id),
  queued_at   TEXT DEFAULT (datetime('now')),
  attempts    INTEGER DEFAULT 0,
  last_error  TEXT,
  urgent      INTEGER DEFAULT 0
);

-- ========================================
-- Performance Indexes
-- ========================================
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name_ar);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_branch ON invoices(branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_session ON invoices(session_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch_product ON inventory(branch_id, product_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_cashier_sessions_user ON cashier_sessions(user_id, status);
```

3. Verify the file contains:
   - 11 tables
   - 12 CREATE INDEX statements
   - All FOREIGN KEY references are correct
   - No syntax errors (every statement ends with `;`)

### Verification
- Count tables: `grep -c "CREATE TABLE" src-tauri/src/db/schema.sql` should return `11`
- Count indexes: `grep -c "CREATE INDEX" src-tauri/src/db/schema.sql` should return `12`

### TS Bindings
None (this is internal DB setup).

### Log Update
None yet — log after Task 0.1.2 when DB initializes.

---

## Task 0.1.2 — Create `src-tauri/src/db/mod.rs` + Register Migrations
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Create the Rust module that loads the schema via `tauri-plugin-sql` migrations on app startup.

### Files to Create
- `src-tauri/src/db/mod.rs`

### Files to Edit
- `src-tauri/src/main.rs`

### Steps

1. Create `src-tauri/src/db/mod.rs`:

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

2. In `src-tauri/src/main.rs`, add the DB plugin initialization inside `tauri::Builder`:

```rust
fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:pos.db", db::get_migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

3. In `src-tauri/src/main.rs`, add `mod db;` at the top of the file:

```rust
mod db;
```

### Verification
1. Run `cargo check` from `src-tauri/`
2. Expected: no compilation errors
3. Run the app (`pnpm tauri dev`)
4. Check the app data directory for `pos.db` file creation:
   - Windows: `%APPDATA%/pos/pos.db`
   - macOS: `~/Library/Application Support/pos/pos.db`
   - Linux: `~/.local/share/pos/pos.db`
5. Open `pos.db` in a SQLite browser and verify all 11 tables exist.

### TS Bindings
None.

### Log Update
None yet.

---

## Task 0.1.3 — Configure `Cargo.toml`
**Status**: ⬜ | **Difficulty**: ⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Add all required Rust dependencies for the MVP.

### Files to Edit
- `src-tauri/Cargo.toml`

### Steps

1. Open `src-tauri/Cargo.toml`
2. Ensure the `[dependencies]` section contains:

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
quick-xml = "0.31"
ring = "0.17"
qrcode = "0.14"
escpos-rs = "0.5"
reqwest = { version = "0.11", features = ["json"] }
```

3. Save and run `cargo check` to verify dependencies resolve.

### Verification
- `cargo check` completes without errors
- All crates download successfully

### TS Bindings
None.

### Log Update
None.

---

## Task 0.1.4 — Seed Data on First Launch
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Insert initial data on first app launch: 1 branch, 2 users, 3 sample products, 1 category.

### Files to Edit
- `src-tauri/src/db/mod.rs`

### Steps

1. Open `src-tauri/src/db/mod.rs`
2. Replace the contents with:

```rust
use tauri_plugin_sql::{Migration, MigrationKind, TauriSql};
use tauri::Manager;

pub fn get_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "initial_schema",
        sql: include_str!("schema.sql"),
        kind: MigrationKind::Up,
    }]
}

pub async fn seed_if_empty(db: &TauriSql) -> Result<(), String> {
    let count: Option<i64> = db
        .query_one("SELECT COUNT(*) FROM branches", [])
        .await
        .map_err(|e| e.to_string())?;

    if count.unwrap_or(0) > 0 {
        return Ok(());
    }

    // Seed branch
    db.execute(
        "INSERT INTO branches (id, name_ar, vat_number, cr_number) VALUES (?, ?, ?, ?)",
        ["BR1", "الفرع الرئيسي", "310123456700003", "1010123456"],
    )
    .await
    .map_err(|e| e.to_string())?;

    // Seed admin user (PIN: 0000)
    let admin_hash = bcrypt::hash("0000", bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO users (id, branch_id, name_ar, role, pin_hash) VALUES (?, ?, ?, ?, ?)",
        ["USR-001", "BR1", "المدير", "admin", &admin_hash],
    )
    .await
    .map_err(|e| e.to_string())?;

    // Seed cashier user (PIN: 1234)
    let cashier_hash = bcrypt::hash("1234", bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO users (id, branch_id, name_ar, role, pin_hash) VALUES (?, ?, ?, ?, ?)",
        ["USR-002", "BR1", "الكاشير", "cashier", &cashier_hash],
    )
    .await
    .map_err(|e| e.to_string())?;

    // Seed category
    db.execute(
        "INSERT INTO categories (id, name_ar) VALUES (?, ?)",
        ["CAT-001", "مواد غذائية"],
    )
    .await
    .map_err(|e| e.to_string())?;

    // Seed products
    let products = vec![
        ("PRD-001", "6281035931206", "أرز بسمتي ٥ كيلو", "CAT-001", 45.00),
        ("PRD-002", "6281001304614", "زيت طبخ نخيل ٢ لتر", "CAT-001", 28.50),
        ("PRD-003", "6291041502380", "مياه معدنية ١.٥ لتر", "CAT-001", 1.50),
    ];

    for (id, barcode, name, cat_id, price) in products {
        let sku = format!("SKU-{}", id.split('-').nth(1).unwrap_or(id));
        db.execute(
            "INSERT INTO products (id, sku, barcode, name_ar, category_id, sell_price) VALUES (?, ?, ?, ?, ?, ?)",
            [id, &sku, barcode, name, cat_id, &price.to_string()],
        )
        .await
        .map_err(|e| e.to_string())?;

        db.execute(
            "INSERT INTO inventory (id, branch_id, product_id, qty_on_hand) VALUES (?, ?, ?, ?)",
            [format!("INV-{}", id), "BR1", id, "100"],
        )
        .await
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
```

3. In `src-tauri/src/main.rs`, call `seed_if_empty` during app setup. Update `main.rs`:

```rust
use tauri_plugin_sql::TauriSql;

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:pos.db", db::get_migrations())
                .build(),
        )
        .setup(|app| {
            let handle = app.handle();
            tauri::async_runtime::spawn(async move {
                let db = handle.state::<TauriSql>();
                if let Err(e) = db::seed_if_empty(&db).await {
                    eprintln!("Seed error: {}", e);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Verification
1. Delete existing `pos.db` (to simulate first launch)
2. Run `pnpm tauri dev`
3. Open `pos.db` in SQLite browser
4. Verify:
   - 1 row in `branches`
   - 2 rows in `users`
   - 1 row in `categories`
   - 3 rows in `products`
   - 3 rows in `inventory`

### TS Bindings
None.

### Log Update
Add to `PROJECT_LOG.md` "Task Completion Log":
```markdown
### [Date] — Task 0.1 — Schema & Seed
**Owner**: Dev B
**Duration**: X days
**Deliverable achieved**: Yes
**Notes**: SQLite schema created with 11 tables and 12 indexes. Seed data includes 1 branch, 2 users, 3 products.
```

---

## Task 0.2.1 — Create Command Module Stubs
**Status**: ⬜ | **Difficulty**: ⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Create empty Rust module files for all command categories.

### Files to Create
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/commands/products.rs`
- `src-tauri/src/commands/invoices.rs`
- `src-tauri/src/commands/users.rs`
- `src-tauri/src/commands/inventory.rs`
- `src-tauri/src/commands/customers.rs`
- `src-tauri/src/commands/reports.rs`
- `src-tauri/src/commands/zatca.rs`
- `src-tauri/src/commands/printing.rs`
- `src-tauri/src/commands/settings.rs`

### Steps

1. Create `src-tauri/src/commands/mod.rs`:

```rust
pub mod products;
pub mod invoices;
pub mod users;
pub mod inventory;
pub mod customers;
pub mod reports;
pub mod zatca;
pub mod printing;
pub mod settings;
```

2. Create each command file with a placeholder comment. Example for `products.rs`:

```rust
// src-tauri/src/commands/products.rs
// Task 2.1 — Product CRUD commands will be implemented here
```

Repeat this pattern for all 9 command files.

3. In `src-tauri/src/main.rs`, add:

```rust
mod commands;
```

### Verification
- `cargo check` passes
- All files exist in `src-tauri/src/commands/`

### TS Bindings
None yet.

### Log Update
None.

---

## Task 0.2.2 — Define Rust Structs
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Define all data structs that will be serialized across the Tauri bridge. These must match `src/types/index.ts` exactly.

### Files to Create
- `src-tauri/src/lib.rs` (or `src-tauri/src/types.rs` if you prefer)

### Steps

1. Create `src-tauri/src/lib.rs`:

```rust
use serde::{Deserialize, Serialize};

// ============================================================
// Core entities — must match TypeScript interfaces exactly
// ============================================================

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Branch {
    pub id: String,
    pub name_ar: String,
    pub name_en: Option<String>,
    pub address: Option<String>,
    pub vat_number: Option<String>,
    pub cr_number: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct User {
    pub id: String,
    pub branch_id: String,
    pub name_ar: String,
    pub role: String,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SessionToken {
    pub user_id: String,
    pub name_ar: String,
    pub role: String,
    pub branch_id: String,
    pub session_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Category {
    pub id: String,
    pub name_ar: String,
    pub name_en: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Product {
    pub id: String,
    pub sku: String,
    pub barcode: Option<String>,
    pub name_ar: String,
    pub name_en: Option<String>,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    pub unit: String,
    pub cost_price: f64,
    pub sell_price: f64,
    pub vat_rate: f64,
    pub is_active: bool,
    pub stock: Option<f64>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NewProduct {
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub name_ar: String,
    pub name_en: Option<String>,
    pub category_id: Option<String>,
    pub unit: Option<String>,
    pub cost_price: Option<f64>,
    pub sell_price: f64,
    pub vat_rate: Option<f64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InventoryItem {
    pub id: String,
    pub branch_id: String,
    pub product_id: String,
    pub product_name_ar: String,
    pub sku: String,
    pub barcode: Option<String>,
    pub qty_on_hand: f64,
    pub low_stock_threshold: f64,
    pub stock_value: f64,
    pub is_low_stock: bool,
    pub last_updated: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Customer {
    pub id: String,
    pub name_ar: String,
    pub phone: Option<String>,
    pub vat_number: Option<String>,
    pub cr_number: Option<String>,
    pub credit_limit: f64,
    pub balance: f64,
    pub customer_type: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NewCustomer {
    pub name_ar: String,
    pub phone: Option<String>,
    pub vat_number: Option<String>,
    pub cr_number: Option<String>,
    pub credit_limit: Option<f64>,
    pub customer_type: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CashierSession {
    pub id: String,
    pub user_id: String,
    pub branch_id: String,
    pub opened_at: String,
    pub closed_at: Option<String>,
    pub opening_float: f64,
    pub closing_cash: Option<f64>,
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Invoice {
    pub id: String,
    pub uuid: String,
    pub branch_id: String,
    pub session_id: String,
    pub cashier_id: String,
    pub customer_id: Option<String>,
    pub customer_name_ar: Option<String>,
    pub invoice_number: String,
    pub invoice_type: String,
    pub status: String,
    pub subtotal: f64,
    pub discount_amount: f64,
    pub vat_amount: f64,
    pub total: f64,
    pub payment_method: String,
    pub notes: Option<String>,
    pub zatca_status: String,
    pub qr_code: Option<String>,
    pub lines: Option<Vec<InvoiceLine>>,
    pub payments: Option<Vec<Payment>>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InvoiceLine {
    pub id: String,
    pub invoice_id: String,
    pub product_id: String,
    pub product_name_ar: String,
    pub qty: f64,
    pub unit_price: f64,
    pub discount_pct: f64,
    pub vat_rate: f64,
    pub vat_amount: f64,
    pub line_total: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Payment {
    pub id: String,
    pub invoice_id: String,
    pub method: String,
    pub amount: f64,
    pub reference: Option<String>,
    pub paid_at: String,
}

// Invoice creation payload (from React to Rust)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NewInvoiceLine {
    pub product_id: String,
    pub product_name_ar: String,
    pub qty: f64,
    pub unit_price: f64,
    pub discount_pct: f64,
    pub vat_rate: f64,
    pub vat_amount: f64,
    pub line_total: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NewPayment {
    pub method: String,
    pub amount: f64,
    pub reference: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NewInvoice {
    pub branch_id: String,
    pub branch_prefix: String,
    pub cashier_id: String,
    pub session_id: String,
    pub customer_id: Option<String>,
    pub invoice_type: String,
    pub lines: Vec<NewInvoiceLine>,
    pub payments: Vec<NewPayment>,
    pub subtotal: f64,
    pub discount_amount: f64,
    pub vat_amount: f64,
    pub total: f64,
    pub notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RefundLine {
    pub product_id: String,
    pub product_name_ar: String,
    pub qty: f64,
    pub unit_price: f64,
    pub vat_rate: f64,
}

// Report types
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DailySummary {
    pub date: String,
    pub invoice_count: i64,
    pub total_sales: f64,
    pub total_vat: f64,
    pub grand_total: f64,
    pub by_payment_method: PaymentMethodBreakdown,
    pub top_products: Vec<TopProduct>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PaymentMethodBreakdown {
    pub cash: f64,
    pub card: f64,
    pub cliq: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TopProduct {
    pub name_ar: String,
    pub qty_sold: f64,
    pub revenue: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DailySales {
    pub sale_date: String,
    pub invoice_count: i64,
    pub total_sales: f64,
    pub total_vat: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InventoryReportRow {
    pub product_id: String,
    pub name_ar: String,
    pub sku: String,
    pub qty_on_hand: f64,
    pub low_stock_threshold: f64,
    pub stock_value: f64,
    pub is_low_stock: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SessionReport {
    pub session: CashierSession,
    pub invoice_count: i64,
    pub total_sales: f64,
    pub by_payment_method: PaymentMethodBreakdown,
    pub expected_cash: f64,
    pub discrepancy: f64,
}

// ZATCA types
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ZatcaStatusInfo {
    pub registered: bool,
    pub csid_status: String,
    pub pending_count: i64,
    pub rejected_count: i64,
    pub urgent_count: i64,
}

// Settings
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppSettings {
    pub vat_rate: String,
    pub printer_port: String,
    pub printer_type: String,
    pub branch_name_ar: String,
    pub invoice_note: String,
    pub numerals: String,
    pub auto_lock_minutes: String,
}

// Application state (managed by Tauri)
pub struct AppState {
    pub current_session: std::sync::Mutex<Option<CashierSession>>,
}
```

2. In `src-tauri/src/main.rs`, ensure `lib.rs` is included:

```rust
mod lib;
```

### Verification
- `cargo check` passes with no errors
- All structs derive `Serialize, Deserialize, Debug, Clone`

### TS Bindings
None yet (these are Rust-internal; TS equivalents are written in Task 0.2.4).

### Log Update
None.

---

## Task 0.2.3 — Write `src/lib/tauri-commands.ts` Stubs
**Status**: ⬜ | **Difficulty**: ⭐ | **Parallel with Dev A**: ✅ Yes (coordinate with Dev A)

### Objective
Create TypeScript wrapper functions for every Tauri command you will implement. Dev A uses this file exclusively to call backend commands.

### Files to Create
- `src/lib/tauri-commands.ts`

### Steps

1. Create `src/lib/tauri-commands.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';
import type {
  Product,
  Invoice,
  Customer,
  User,
  SessionToken,
  Category,
  InventoryItem,
  CashierSession,
  NewProduct,
  NewCustomer,
  NewInvoice,
  DailySummary,
  DailySales,
  InventoryReportRow,
  SessionReport,
  ZatcaStatusInfo,
  AppSettings,
} from '../types';

// ============================================================
// Auth (Phase 1)
// ============================================================
export const loginUser = (pin: string) =>
  invoke<SessionToken>('login_user', { pin });

export const openCashierSession = (userId: string, openingFloat: number) =>
  invoke<string>('open_cashier_session', { userId, openingFloat });

export const closeCashierSession = (sessionId: string, closingCash: number, userId: string) =>
  invoke<void>('close_cashier_session', { sessionId, closingCash, userId });

export const getCurrentSession = (userId: string) =>
  invoke<CashierSession | null>('get_current_session', { userId });

// ============================================================
// Products (Phase 2)
// ============================================================
export const getProducts = (query: string, categoryId?: string) =>
  invoke<Product[]>('get_products', { query, categoryId });

export const getProductByBarcode = (barcode: string) =>
  invoke<Product | null>('get_product_by_barcode', { barcode });

export const createProduct = (product: NewProduct) =>
  invoke<Product>('create_product', { product });

export const updateProduct = (id: string, product: Partial<NewProduct>) =>
  invoke<Product>('update_product', { id, product });

export const toggleProductActive = (id: string) =>
  invoke<void>('toggle_product_active', { id });

export const getCategories = () =>
  invoke<Category[]>('get_categories');

export const createCategory = (nameAr: string, nameEn?: string) =>
  invoke<Category>('create_category', { nameAr, nameEn });

// ============================================================
// Inventory (Phase 2)
// ============================================================
export const getInventory = (branchId: string) =>
  invoke<InventoryItem[]>('get_inventory', { branchId });

export const adjustInventory = (
  branchId: string,
  productId: string,
  newQty: number,
  reason: string,
  userId: string
) =>
  invoke<void>('adjust_inventory', { branchId, productId, newQty, reason, userId });

export const getInventoryByProduct = (branchId: string, productId: string) =>
  invoke<InventoryItem>('get_inventory_by_product', { branchId, productId });

// ============================================================
// Invoices (Phase 3)
// ============================================================
export const createInvoice = (payload: NewInvoice) =>
  invoke<Invoice>('create_invoice', { payload });

export const getInvoice = (invoiceId: string) =>
  invoke<Invoice>('get_invoice', { invoiceId });

export const getInvoiceByNumber = (invoiceNumber: string) =>
  invoke<Invoice | null>('get_invoice_by_number', { invoiceNumber });

export const createRefundInvoice = (originalInvoiceId: string, lines: any[]) =>
  invoke<Invoice>('create_refund_invoice', { originalInvoiceId, lines });

// ============================================================
// Printing (Phase 3)
// ============================================================
export const printReceipt = (invoiceId: string) =>
  invoke<void>('print_receipt', { invoiceId });

export const printTestPage = () =>
  invoke<void>('print_test_page');

export const getAvailablePorts = () =>
  invoke<string[]>('get_available_ports');

export const getInvoiceQr = (invoiceId: string) =>
  invoke<string>('get_invoice_qr', { invoiceId });

// ============================================================
// Customers (Phase 4)
// ============================================================
export const getCustomers = (query: string) =>
  invoke<Customer[]>('get_customers', { query });

export const createCustomer = (customer: NewCustomer) =>
  invoke<Customer>('create_customer', { customer });

export const updateCustomer = (id: string, data: Partial<NewCustomer>) =>
  invoke<Customer>('update_customer', { id, data });

export const getCustomerInvoices = (customerId: string) =>
  invoke<Invoice[]>('get_customer_invoices', { customerId });

export const getCustomerBalance = (customerId: string) =>
  invoke<number>('get_customer_balance', { customerId });

export const recordCustomerPayment = (customerId: string, amount: number, userId: string) =>
  invoke<void>('record_customer_payment', { customerId, amount, userId });

// ============================================================
// Reports (Phase 5)
// ============================================================
export const getDailySummary = (branchId: string, date: string) =>
  invoke<DailySummary>('get_daily_summary', { branchId, date });

export const getSalesByPeriod = (branchId: string, fromDate: string, toDate: string) =>
  invoke<DailySales[]>('get_sales_by_period', { branchId, fromDate, toDate });

export const getInventoryReport = (branchId: string) =>
  invoke<InventoryReportRow[]>('get_inventory_report', { branchId });

export const getCashierSessionReport = (sessionId: string) =>
  invoke<SessionReport>('get_cashier_session_report', { sessionId });

export const exportInvoicesCsv = (branchId: string, fromDate: string, toDate: string) =>
  invoke<string>('export_invoices_csv', { branchId, fromDate, toDate });

// ============================================================
// ZATCA (Phase 6)
// ============================================================
export const registerZatcaDevice = (otp: string) =>
  invoke<void>('register_zatca_device', { otp });

export const getZatcaStatus = () =>
  invoke<ZatcaStatusInfo>('get_zatca_status');

export const retryZatcaQueue = () =>
  invoke<void>('retry_zatca_queue');

// ============================================================
// Settings (Phase 7)
// ============================================================
export const getSetting = (key: string) =>
  invoke<string | null>('get_setting', { key });

export const setSetting = (key: string, value: string) =>
  invoke<void>('set_setting', { key, value });

export const getAllSettings = () =>
  invoke<AppSettings>('get_all_settings');
```

### Verification
- TypeScript compiles: `pnpm tsc --noEmit`
- No import errors
- All return types use the correct interfaces

### Log Update
None yet — update when individual commands are implemented.

---

## Task 0.2.4 — Write `src/types/index.ts`
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes (coordinate with Dev A)

### Objective
Create TypeScript interfaces that exactly match the Rust structs in `src-tauri/src/lib.rs`.

### Files to Create
- `src/types/index.ts`

### Steps

1. Create `src/types/index.ts` with this **exact** content (copy every line):

```typescript
// ============================================================
// Core entities — must match Rust structs in src-tauri/src/
// ============================================================

export interface Branch {
  id: string;
  nameAr: string;
  nameEn?: string;
  address?: string;
  vatNumber?: string;
  crNumber?: string;
  createdAt: string;
}

export interface User {
  id: string;
  branchId: string;
  nameAr: string;
  role: 'admin' | 'manager' | 'cashier';
  isActive: boolean;
  createdAt: string;
}

export interface SessionToken {
  userId: string;
  nameAr: string;
  role: 'admin' | 'manager' | 'cashier';
  branchId: string;
  sessionId: string;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn?: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  nameAr: string;
  nameEn?: string;
  categoryId?: string;
  categoryName?: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  vatRate: number;
  isActive: boolean;
  stock?: number;
  createdAt: string;
}

export interface NewProduct {
  sku?: string;
  barcode?: string;
  nameAr: string;
  nameEn?: string;
  categoryId?: string;
  unit?: string;
  costPrice?: number;
  sellPrice: number;
  vatRate?: number;
}

export interface InventoryItem {
  id: string;
  branchId: string;
  productId: string;
  productNameAr: string;
  sku: string;
  barcode?: string;
  qtyOnHand: number;
  lowStockThreshold: number;
  stockValue: number;
  isLowStock: boolean;
  lastUpdated: string;
}

export interface Customer {
  id: string;
  nameAr: string;
  phone?: string;
  vatNumber?: string;
  crNumber?: string;
  creditLimit: number;
  balance: number;
  customerType: 'b2c' | 'b2b';
  createdAt: string;
}

export interface NewCustomer {
  nameAr: string;
  phone?: string;
  vatNumber?: string;
  crNumber?: string;
  creditLimit?: number;
  customerType: 'b2c' | 'b2b';
}

export interface CashierSession {
  id: string;
  userId: string;
  branchId: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  closingCash?: number;
  status: 'open' | 'closed';
}

export interface Invoice {
  id: string;
  uuid: string;
  branchId: string;
  sessionId: string;
  cashierId: string;
  customerId?: string;
  customerNameAr?: string;
  invoiceNumber: string;
  invoiceType: 'simplified' | 'standard' | 'credit_note';
  status: 'draft' | 'confirmed' | 'cancelled';
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  paymentMethod: string;
  notes?: string;
  zatcaStatus: 'pending' | 'reported' | 'rejected' | 'not_required';
  qrCode?: string;
  lines?: InvoiceLine[];
  payments?: Payment[];
  createdAt: string;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  productId: string;
  productNameAr: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  method: 'cash' | 'card' | 'cliq';
  amount: number;
  reference?: string;
  paidAt: string;
}

// ============================================================
// Invoice creation payload (sent from React to Rust)
// ============================================================

export interface NewInvoiceLine {
  productId: string;
  productNameAr: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
}

export interface NewPayment {
  method: 'cash' | 'card' | 'cliq';
  amount: number;
  reference?: string;
}

export interface NewInvoice {
  branchId: string;
  branchPrefix: string;
  cashierId: string;
  sessionId: string;
  customerId?: string;
  invoiceType: 'simplified' | 'standard';
  lines: NewInvoiceLine[];
  payments: NewPayment[];
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  notes?: string;
}

export interface RefundLine {
  productId: string;
  productNameAr: string;
  qty: number;
  unitPrice: number;
  vatRate: number;
}

// ============================================================
// Report types
// ============================================================

export interface DailySummary {
  date: string;
  invoiceCount: number;
  totalSales: number;
  totalVat: number;
  grandTotal: number;
  byPaymentMethod: {
    cash: number;
    card: number;
    cliq: number;
  };
  topProducts: Array<{
    nameAr: string;
    qtySold: number;
    revenue: number;
  }>;
}

export interface DailySales {
  saleDate: string;
  invoiceCount: number;
  totalSales: number;
  totalVat: number;
}

export interface InventoryReportRow {
  productId: string;
  nameAr: string;
  sku: string;
  qtyOnHand: number;
  lowStockThreshold: number;
  stockValue: number;
  isLowStock: boolean;
}

export interface SessionReport {
  session: CashierSession;
  invoiceCount: number;
  totalSales: number;
  byPaymentMethod: { cash: number; card: number; cliq: number; };
  expectedCash: number;
  discrepancy: number;
}

// ============================================================
// ZATCA types
// ============================================================

export interface ZatcaStatusInfo {
  registered: boolean;
  csidStatus: 'active' | 'expired' | 'not_registered';
  pendingCount: number;
  rejectedCount: number;
  urgentCount: number;
}

// ============================================================
// Settings
// ============================================================

export interface AppSettings {
  vatRate: string;
  printerPort: string;
  printerType: string;
  branchNameAr: string;
  invoiceNote: string;
  numerals: 'western' | 'arabic';
  autoLockMinutes: string;
}
```

### Verification
- TypeScript compiles: `pnpm tsc --noEmit`
- Field names match Rust structs exactly (snake_case in Rust → camelCase in TS)

### Log Update
Add to `PROJECT_LOG.md` "Task Completion Log":
```markdown
### [Date] — Task 0.2 — TS Bindings
**Owner**: Dev B
**Duration**: X days
**Deliverable achieved**: Yes
**Notes**: All TypeScript interfaces created and verified against Rust structs. Dev A can now build UI shells.
```

---

## 🛑 MERGE POINT: MP-0 — END OF PHASE 0

**This is a merge point. Sync with Dev A before proceeding.**

### What Dev A Needs From You
1. `src/types/index.ts` — all interfaces (send the file or confirm it's committed)
2. `src/lib/tauri-commands.ts` — all wrapper stubs
3. Confirmation that `cargo check` passes and `pos.db` is created with seed data

### What You Need From Dev A
1. Confirmation that their `pnpm tauri dev` runs and shows a window
2. Their `src/types/index.ts` matches yours exactly
3. Repo is pushed and you both have the same `main` or `develop` branch state

### After Merge
Proceed to Phase 1 (`phase_1.md`) if Dev A confirms they have the scaffolding. Both of you can work in parallel from here.

---

(End of Phase 0)
