# Phase 8 — Demo Polish & QA (4–5 days)
> **Start: After all phases | Final push before demo**

---

## Phase 8 Overview

This phase is the final QA push: demo data seeding, performance tuning, database indexes, and joint end-to-end walkthrough with Dev A.

**Merge Point: MP-8** — Phase 8 start. Both devs required for joint walkthrough.

---

## Task 8.1.1 — Create `seed_demo.sql`
**Status**: ⬜ | **Difficulty**: ⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Create a comprehensive SQL file with realistic demo data for the customer demo.

### Files to Create
- `src-tauri/src/db/seed_demo.sql`

### Content

Create `src-tauri/src/db/seed_demo.sql` with this exact content:

```sql
-- ========================================
-- Demo Data Seed (Phase 8)
-- ========================================
-- WARNING: This will clear existing data!

DELETE FROM payments;
DELETE FROM invoice_lines;
DELETE FROM invoices;
DELETE FROM inventory;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM customers;
DELETE FROM cashier_sessions;
DELETE FROM users WHERE id NOT IN ('USR-001', 'USR-002');
DELETE FROM audit_log;

-- Categories
INSERT INTO categories (id, name_ar, name_en) VALUES
('CAT-001', 'مواد غذائية', 'Food'),
('CAT-002', 'منظفات', 'Cleaning'),
('CAT-003', 'مشروبات', 'Beverages'),
('CAT-004', 'مستلزمات مكتبية', 'Stationery'),
('CAT-005', 'أخرى', 'Other');

-- Products (50 items)
INSERT INTO products (id, sku, barcode, name_ar, category_id, unit, cost_price, sell_price, vat_rate) VALUES
('PRD-001', 'SKU-001', '6281035931206', 'أرز بسمتي ٥ كيلو', 'CAT-001', 'piece', 35.00, 45.00, 0.15),
('PRD-002', 'SKU-002', '6281001304614', 'زيت طبخ نخيل ٢ لتر', 'CAT-001', 'piece', 22.00, 28.50, 0.15),
('PRD-003', 'SKU-003', '6291041502380', 'مياه معدنية ١.٥ لتر', 'CAT-003', 'piece', 1.10, 1.50, 0.15),
('PRD-004', 'SKU-004', '6281007016183', 'صابون يدين سائل', 'CAT-002', 'piece', 9.50, 12.75, 0.15),
('PRD-005', 'SKU-005', '6223005015007', 'دفتر ملاحظات A4', 'CAT-004', 'piece', 6.00, 8.00, 0.15),
('PRD-006', 'SKU-006', '6281035931207', 'سكر ٥ كيلو', 'CAT-001', 'piece', 18.00, 23.00, 0.15),
('PRD-007', 'SKU-007', '6281001304615', 'دقيق ١ كيلو', 'CAT-001', 'piece', 3.50, 4.50, 0.15),
('PRD-008', 'SKU-008', '6291041502381', 'عصير برتقال ١ لتر', 'CAT-003', 'piece', 5.50, 7.00, 0.15),
('PRD-009', 'SKU-009', '6281007016184', 'منظف زجاج', 'CAT-002', 'piece', 7.00, 9.50, 0.15),
('PRD-010', 'SKU-010', '6223005015008', 'قلم حبر جاف', 'CAT-004', 'piece', 1.50, 2.50, 0.15);

-- Continue with 40 more products...
-- (For brevity, add 40 more rows following the same pattern)

-- Inventory for all products
INSERT INTO inventory (id, branch_id, product_id, qty_on_hand, low_stock_threshold)
SELECT 
    'INV-' || p.id,
    'BR1',
    p.id,
    100 + ABS(RANDOM() % 200),
    10
FROM products p;

-- Customers (5 B2B + 5 B2C)
INSERT INTO customers (id, name_ar, phone, vat_number, cr_number, credit_limit, balance, customer_type) VALUES
('CUS-001', 'أحمد محمد', '0501234567', NULL, NULL, 0, 0, 'b2c'),
('CUS-002', 'شركة النور', '0559876543', '300123456700003', '1010654321', 50000, 12500, 'b2b'),
('CUS-003', 'فاطمة علي', '0561112233', NULL, NULL, 0, 0, 'b2c'),
('CUS-004', 'مؤسسة السلام', '0574445566', '300987654300009', '1010987654', 100000, 45000, 'b2b'),
('CUS-005', 'خالد عبدالله', '0587778899', NULL, NULL, 0, 0, 'b2c'),
('CUS-006', 'شركة الرياض', '0593334444', '300456789000001', '1010456789', 75000, 0, 'b2b'),
('CUS-007', 'نورة سعد', '0505556666', NULL, NULL, 0, 0, 'b2c'),
('CUS-008', 'مؤسسة الصفا', '0512223333', '300111222300005', '1010111222', 30000, 8000, 'b2b'),
('CUS-009', 'محمد سليم', '0528889999', NULL, NULL, 0, 0, 'b2c'),
('CUS-010', 'شركة الفجر', '0534445555', '300777888900007', '1010777888', 60000, 22000, 'b2b');

-- Cashier Sessions (2 open sessions for demo)
INSERT INTO cashier_sessions (id, user_id, branch_id, opened_at, opening_float, status) VALUES
('SES-001', 'USR-002', 'BR1', datetime('now', '-7 days'), 1000.00, 'closed'),
('SES-002', 'USR-002', 'BR1', datetime('now', '-1 days'), 1500.00, 'open');

-- 30 Invoices over past 7 days
INSERT INTO invoices (id, uuid, branch_id, session_id, cashier_id, customer_id, invoice_number, invoice_type, status, subtotal, discount_amount, vat_amount, total, payment_method, zatca_status, created_at)
SELECT 
    'INV-' || lower(hex(randomblob(16))),
    lower(hex(randomblob(16))),
    'BR1',
    'SES-001',
    'USR-002',
    CASE WHEN RANDOM() % 3 = 0 THEN 'CUS-00' || (1 + ABS(RANDOM() % 10)) ELSE NULL END,
    'BR1-' || printf('%06d', row_number() OVER ()),
    'simplified',
    'confirmed',
    ROUND(50 + ABS(RANDOM() % 500), 2),
    0,
    ROUND((50 + ABS(RANDOM() % 500)) * 0.15, 2),
    ROUND((50 + ABS(RANDOM() % 500)) * 1.15, 2),
    CASE WHEN RANDOM() % 3 = 0 THEN 'cash' WHEN RANDOM() % 3 = 1 THEN 'card' ELSE 'mixed' END,
    'pending',
    datetime('now', '-' || ABS(RANDOM() % 7) || ' days')
FROM generate_series(1, 30);

-- Invoice lines for each invoice
INSERT INTO invoice_lines (id, invoice_id, product_id, product_name_ar, qty, unit_price, vat_rate, vat_amount, line_total)
SELECT 
    'ILN-' || lower(hex(randomblob(16))),
    i.id,
    p.id,
    p.name_ar,
    1 + ABS(RANDOM() % 5),
    p.sell_price,
    p.vat_rate,
    ROUND(p.sell_price * (1 + ABS(RANDOM() % 5)) * p.vat_rate, 2),
    ROUND(p.sell_price * (1 + ABS(RANDOM() % 5)) * (1 + p.vat_rate), 2)
FROM invoices i
JOIN products p ON p.id = 'PRD-00' || (1 + ABS(RANDOM() % 10))
WHERE i.invoice_number LIKE 'BR1-%';

-- Payments for each invoice
INSERT INTO payments (id, invoice_id, method, amount)
SELECT 
    'PAY-' || lower(hex(randomblob(16))),
    i.id,
    i.payment_method,
    i.total
FROM invoices i
WHERE i.payment_method != 'mixed';
```

### Verification
1. Open `seed_demo.sql` and verify it contains:
   - 5 categories
   - At least 10 products (extend to 50 as needed)
   - 10 customers (5 B2B + 5 B2C)
   - 30 invoices
   - Invoice lines for each invoice
   - Payments for each invoice

---

## Task 8.1.2 — `seed_demo_data` Tauri Command
**Status**: ⬜ | **Difficulty**: ⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Expose a Tauri command that runs the demo seed SQL. Only available in debug builds.

### Files to Edit
- `src-tauri/src/commands/settings.rs` (or create a new `demo.rs`)
- `src-tauri/src/main.rs`

### Steps

1. Append to `src-tauri/src/commands/settings.rs`:

```rust
#[tauri::command]
pub async fn seed_demo_data(
    db: tauri::State<'_, TauriSql>,
) -> Result<(), String> {
    #[cfg(debug_assertions)]
    {
        let sql = include_str!("../db/seed_demo.sql");
        db.execute(sql, [])
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    
    #[cfg(not(debug_assertions))]
    {
        Err("غير مسموح في الإصدار النهائي".to_string())
    }
}
```

2. Register in `main.rs`.

### Verification
1. Run app in debug mode
2. Call `seed_demo_data()` → data seeded
3. Verify counts: 50 products, 30 invoices, 10 customers
4. Try in release mode → error "غير مسموح في الإصدار النهائي"

### TS Bindings
Add to `src/lib/tauri-commands.ts`:
```typescript
export const seedDemoData = () =>
  invoke<void>('seed_demo_data');
```

### Log Update
```markdown
| seed_demo_data | Phase 8 | ✅ Ready | Debug only; seeds 50 products, 30 invoices |
```

---

## Task 8.2.1 — Add Performance Indexes to `schema.sql`
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Ensure all performance indexes from SCHEMA_REFERENCE.md are in the schema.

### Already Done
The indexes were included in Task 0.1.1. Verify they exist:

```sql
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

### Verification
1. Open `pos.db` in SQLite browser
2. Check Indexes tab — all 12 indexes should be present

---

## Task 8.2.2 — Performance Validation Tests
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Validate all performance targets.

### Targets
| Metric | Target | How to Test |
|--------|--------|-------------|
| Product search (10K products) | <100ms | Seed 10K products, search |
| Invoice save (50 lines) | <500ms | Create large invoice |
| App startup | <3s | Time from launch to POS |
| Receipt print | <3s | Time from payment to print start |
| 500-item cart stress | No crash | Add 500 items, confirm |
| 4-hour continuous | No crash/leak | Run for 4 hours |

### Steps

1. **Product search test**:
```rust
#[test]
fn test_product_search_performance() {
    // Seed 10,000 products
    // Time get_products("apple")
    // Assert < 100ms
}
```

2. **Invoice save test**:
```rust
#[test]
fn test_invoice_save_performance() {
    // Create invoice with 50 lines
    // Time create_invoice()
    // Assert < 500ms
}
```

3. **Stress test**: Manually add 500 items to cart via UI or script.

4. **4-hour test**: Run app continuously, monitor memory usage.

### Verification
All targets met. Document any failures and optimizations applied.

---

## Task 8.3.1 — End-to-End Demo Walkthrough (Joint with Dev A)
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel**: ❌ Must be joint

### Objective
Run the full demo script together and fix all bugs.

### Demo Script
1. Open app → PIN login (PIN: 1234)
2. Scan 3 barcodes → products appear in cart
3. Apply 5% discount to one item
4. Select a B2B customer
5. Apply 2% invoice-level discount
6. Confirm sale: mixed payment (cash + VISA)
7. Print receipt → verify QR code scans in ZATCA Fatoora app
8. Show daily report with the sale
9. Show inventory decreased for sold products
10. Demo a refund for one item
11. Demo parked invoice (park → serve another → resume)
12. Show settings screen

### Steps
1. Schedule joint session with Dev A
2. Run through script step by step
3. Log every bug in `PROJECT_LOG.md` Bug Tracker
4. Fix bugs immediately or assign owners
5. Repeat until 30-minute uninterrupted demo achieved

### Verification
- Demo runs for 30 minutes with zero errors
- All integration tests in `PROJECT_LOG.md` pass

---

## 🛑 MERGE POINT: MP-8 — PHASE 8 START

**This is the final merge point. Both devs required.**

### What to Do
1. Both devs present for joint walkthrough
2. Run full demo script
3. Fix all integration bugs
4. Verify all `PROJECT_LOG.md` integration test checklist items
5. Update all status columns to ✅ Complete

### After Merge
- Project is demo-ready
- Hand over to QA/customer
- Celebrate!

---

(End of Phase 8 — End of Dev B Boundary)
