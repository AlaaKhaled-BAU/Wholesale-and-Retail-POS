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
  cost_price   REAL DEFAULT 0 CHECK(cost_price >= 0),
  sell_price   REAL NOT NULL CHECK(sell_price >= 0),
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
  qty_on_hand         REAL DEFAULT 0 CHECK(qty_on_hand >= 0),
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
  credit_limit  REAL DEFAULT 0 CHECK(credit_limit >= 0),
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
  subtotal         REAL NOT NULL CHECK(subtotal >= 0),
  discount_amount  REAL DEFAULT 0 CHECK(discount_amount >= 0),
  vat_amount       REAL NOT NULL CHECK(vat_amount >= 0),
  total            REAL NOT NULL CHECK(total >= 0),
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
  qty              REAL NOT NULL CHECK(qty > 0),
  unit_price       REAL NOT NULL CHECK(unit_price >= 0),
  discount_pct     REAL DEFAULT 0 CHECK(discount_pct >= 0 AND discount_pct <= 100),
  vat_rate         REAL DEFAULT 0.15,
  vat_amount       REAL NOT NULL CHECK(vat_amount >= 0),
  line_total       REAL NOT NULL CHECK(line_total >= 0)
);

-- ========================================
-- Payments (supports split payment)
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT REFERENCES invoices(id),
  method      TEXT NOT NULL CHECK(method IN ('cash','card','cliq')),
  amount      REAL NOT NULL CHECK(amount >= 0),
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
-- Invoice Number Counters (atomic numbering per branch)
-- ========================================
CREATE TABLE IF NOT EXISTS invoice_counters (
  branch_id    TEXT PRIMARY KEY REFERENCES branches(id),
  last_number  INTEGER DEFAULT 0
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
