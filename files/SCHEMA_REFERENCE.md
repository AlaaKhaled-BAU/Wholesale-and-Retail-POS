# SCHEMA_REFERENCE.md
> **For AI Agents**: This file is the single source of truth for the database schema and TypeScript types. The SQLite schema lives in `src-tauri/src/db/schema.sql`. The TypeScript interfaces live in `src/types/index.ts`. Both must stay in sync with this document. If you change one, update all three.

---

## SQLite Schema (Full DDL)

Copy this exactly to `src-tauri/src/db/schema.sql`:

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
  pin_hash    TEXT NOT NULL,       -- bcrypt hash, never plaintext
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
  vat_number    TEXT,   -- if B2B
  cr_number     TEXT,   -- if B2B
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
  opening_float  REAL DEFAULT 0,   -- cash in drawer at start
  closing_cash   REAL,             -- cash counted at end
  status         TEXT DEFAULT 'open' CHECK(status IN ('open','closed'))
);

-- ========================================
-- Invoices (sale headers)
-- ========================================
CREATE TABLE IF NOT EXISTS invoices (
  id               TEXT PRIMARY KEY,
  uuid             TEXT UNIQUE NOT NULL,   -- ZATCA UUID (v4)
  branch_id        TEXT REFERENCES branches(id),
  session_id       TEXT REFERENCES cashier_sessions(id),
  cashier_id       TEXT REFERENCES users(id),
  customer_id      TEXT REFERENCES customers(id),
  invoice_number   TEXT UNIQUE NOT NULL,   -- format: BR1-000001
  invoice_type     TEXT DEFAULT 'simplified' CHECK(invoice_type IN ('simplified','standard','credit_note')),
  status           TEXT DEFAULT 'draft' CHECK(status IN ('draft','confirmed','cancelled')),
  subtotal         REAL NOT NULL,
  discount_amount  REAL DEFAULT 0,
  vat_amount       REAL NOT NULL,
  total            REAL NOT NULL,
  payment_method   TEXT,               -- summary: 'cash', 'card', 'cliq', 'mixed'
  notes            TEXT,
  invoice_hash     TEXT,               -- SHA-256 of canonical XML (Base64)
  zatca_status     TEXT DEFAULT 'pending' CHECK(zatca_status IN ('pending','reported','rejected','not_required')),
  zatca_response   TEXT,               -- raw JSON from ZATCA API
  qr_code          TEXT,               -- base64 PNG of the TLV QR code
  created_at       TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- Invoice Lines (items per invoice)
-- ========================================
CREATE TABLE IF NOT EXISTS invoice_lines (
  id               TEXT PRIMARY KEY,
  invoice_id       TEXT REFERENCES invoices(id),
  product_id       TEXT REFERENCES products(id),
  product_name_ar  TEXT NOT NULL,    -- snapshot of name at time of sale
  qty              REAL NOT NULL,
  unit_price       REAL NOT NULL,
  discount_pct     REAL DEFAULT 0,
  vat_rate         REAL DEFAULT 0.15,
  vat_amount       REAL NOT NULL,
  line_total       REAL NOT NULL     -- (unit_price * qty * (1 - discount_pct/100)) + vat_amount
);

-- ========================================
-- Payments (supports split payment)
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT REFERENCES invoices(id),
  method      TEXT NOT NULL CHECK(method IN ('cash','card','cliq')),
  amount      REAL NOT NULL,
  reference   TEXT,                -- card terminal reference number
  paid_at     TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- Audit Log (immutable — never DELETE from this table)
-- ========================================
CREATE TABLE IF NOT EXISTS audit_log (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  action       TEXT NOT NULL,       -- e.g., 'invoice_created', 'inventory_adjusted', 'session_closed'
  entity_type  TEXT,                -- e.g., 'invoice', 'product', 'user'
  entity_id    TEXT,
  payload      TEXT,                -- JSON with before/after state
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
  urgent      INTEGER DEFAULT 0     -- 1 if approaching 24-hour ZATCA deadline
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

---

## TypeScript Interfaces

Copy to `src/types/index.ts`:

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
  categoryName?: string;  // joined from categories table
  unit: string;
  costPrice: number;
  sellPrice: number;
  vatRate: number;       // 0.15 for 15%
  isActive: boolean;
  stock?: number;        // joined from inventory table
  createdAt: string;
}

export interface NewProduct {
  sku?: string;          // auto-generated if empty
  barcode?: string;
  nameAr: string;
  nameEn?: string;
  categoryId?: string;
  unit?: string;
  costPrice?: number;
  sellPrice: number;
  vatRate?: number;      // defaults to 0.15
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
  stockValue: number;    // qtyOnHand * costPrice
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
  qrCode?: string;       // base64 PNG
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
  branchPrefix: string;    // "BR1"
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
  qty: number;             // positive number — function makes it negative
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
  expectedCash: number;    // openingFloat + cash sales
  discrepancy: number;     // closingCash - expectedCash
}

// ============================================================
// ZATCA types
// ============================================================

export interface ZatcaStatusInfo {
  registered: boolean;
  csidStatus: 'active' | 'expired' | 'not_registered';
  pendingCount: number;
  rejectedCount: number;
  urgentCount: number;     // invoices approaching 24h deadline
}

// ============================================================
// Settings
// ============================================================

export interface AppSettings {
  vatRate: string;           // "0.15"
  printerPort: string;       // "COM3" or ""
  printerType: string;       // "usb" or "serial"
  branchNameAr: string;
  invoiceNote: string;
  numerals: 'western' | 'arabic';
  autoLockMinutes: string;   // "5"
}
```

---

## Invoice Number Format

```
BR1-000001
│    └──── 6-digit zero-padded sequential counter (per branch)
└───────── Branch prefix (from branches.id)
```

- Counter resets never — it always increases
- Query: `SELECT MAX(CAST(SUBSTR(invoice_number, 5) AS INTEGER)) FROM invoices WHERE branch_id = ?`
- If NULL (first invoice): start at 1

---

## VAT Calculation Rules

```
For each line item:
  base_amount = unit_price × qty × (1 - discount_pct / 100)
  vat_amount  = base_amount × vat_rate
  line_total  = base_amount + vat_amount

For invoice-level discount:
  Apply AFTER per-item discounts
  invoice_discount_amount = (sum of base_amounts) × (invoice_discount_pct / 100)
  Recalculate VAT on discounted base

Invoice totals:
  subtotal        = sum of base_amounts (before invoice discount)
  discount_amount = sum of item discounts + invoice discount
  vat_amount      = sum of per-line VAT amounts (calculated on discounted base)
  total           = subtotal - discount_amount + vat_amount
```

---

## Audit Log Action Reference

Use these exact action strings in `audit_log.action`:

| Action | Description |
|--------|-------------|
| `invoice_created` | New sale finalized |
| `invoice_cancelled` | Invoice voided |
| `refund_created` | Refund/credit note created |
| `inventory_adjusted` | Manual stock adjustment |
| `inventory_decremented` | Stock reduced by sale |
| `inventory_incremented` | Stock increased by refund |
| `session_opened` | Cashier started shift |
| `session_closed` | Cashier closed shift |
| `user_created` | New user added |
| `user_deactivated` | User soft-deleted |
| `product_created` | New product added |
| `product_updated` | Product details changed |
| `settings_changed` | App settings updated |
| `zatca_reported` | Invoice submitted to ZATCA |
| `zatca_rejected` | ZATCA rejected an invoice |
| `zatca_device_registered` | Device registered with ZATCA |

---

## Seed Data Reference (for Phase 8 demo)

### Users
| Role | Name | PIN | Description |
|------|------|-----|-------------|
| admin | المدير | 0000 | Full access |
| cashier | الكاشير | 1234 | POS access only |

### Branch
| ID | Name AR | VAT Number |
|----|---------|------------|
| BR1 | الفرع الرئيسي | 310123456700003 (test number) |

### Sample Products (first 5)
| Barcode | Name AR | Category | Price | VAT |
|---------|---------|----------|-------|-----|
| 6281035931206 | أرز بسمتي ٥ كيلو | مواد غذائية | 45.00 | 15% |
| 6281001304614 | زيت طبخ نخيل ٢ لتر | مواد غذائية | 28.50 | 15% |
| 6291041502380 | مياه معدنية ١.٥ لتر | مشروبات | 1.50 | 15% |
| 6281007016183 | صابون يدين سائل | منظفات | 12.75 | 15% |
| 6223005015007 | دفتر ملاحظات A4 | مستلزمات مكتبية | 8.00 | 15% |
