-- ======================================== 
-- Demo Data Seed (Phase 8)
-- ========================================
-- WARNING: This will clear existing sales data!
-- Only users USR-001 and USR-002 are preserved.

DELETE FROM zatca_queue;
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

-- ========================================
-- Categories
-- ========================================
INSERT INTO categories (id, name_ar, name_en) VALUES
('CAT-001', 'مواد غذائية', 'Food'),
('CAT-002', 'منظفات', 'Cleaning'),
('CAT-003', 'مشروبات', 'Beverages'),
('CAT-004', 'مستلزمات مكتبية', 'Stationery'),
('CAT-005', 'أخرى', 'Other');

-- ========================================
-- Products (50 items)
-- ========================================
INSERT INTO products (id, sku, barcode, name_ar, category_id, unit, cost_price, sell_price, vat_rate) VALUES
-- Food (CAT-001) — 20 items
('PRD-001', 'SKU-001', '6281035931206', 'أرز بسمتي ٥ كيلو', 'CAT-001', 'piece', 35.00, 45.00, 0.15),
('PRD-002', 'SKU-002', '6281001304614', 'زيت طبخ نخيل ٢ لتر', 'CAT-001', 'piece', 22.00, 28.50, 0.15),
('PRD-003', 'SKU-003', '6281001304620', 'سكر ٥ كيلو', 'CAT-001', 'piece', 18.00, 23.00, 0.15),
('PRD-004', 'SKU-004', '6281001304615', 'دقيق ١ كيلو', 'CAT-001', 'piece', 3.50, 4.50, 0.15),
('PRD-005', 'SKU-005', '6281001304621', 'معكرونة سباغيتي ٥٠٠ جرام', 'CAT-001', 'piece', 4.00, 5.50, 0.15),
('PRD-006', 'SKU-006', '6281001304622', 'حليب طويل الأجل ١ لتر', 'CAT-001', 'piece', 5.00, 6.50, 0.15),
('PRD-007', 'SKU-007', '6281001304623', 'جبن شيدر ٤٠٠ جرام', 'CAT-001', 'piece', 14.00, 18.00, 0.15),
('PRD-008', 'SKU-008', '6281001304624', 'زبادي طبيعي', 'CAT-001', 'piece', 1.80, 2.50, 0.15),
('PRD-009', 'SKU-009', '6281001304625', 'بيض طازج ٣٠ حبة', 'CAT-001', 'piece', 16.00, 21.00, 0.15),
('PRD-010', 'SKU-010', '6281001304626', 'دجاج مجمد ١ كيلو', 'CAT-001', 'piece', 19.00, 25.00, 0.15),
('PRD-011', 'SKU-011', '6281001304627', 'لحم بقري مفروم ٥٠٠ جرام', 'CAT-001', 'piece', 24.00, 32.00, 0.15),
('PRD-012', 'SKU-012', '6281001304628', 'سمك فيليه مجمد', 'CAT-001', 'piece', 28.00, 37.00, 0.15),
('PRD-013', 'SKU-013', '6281001304629', 'فول مدمس', 'CAT-001', 'piece', 3.00, 4.00, 0.15),
('PRD-014', 'SKU-014', '6281001304630', 'حمص', 'CAT-001', 'piece', 3.50, 4.50, 0.15),
('PRD-015', 'SKU-015', '6281001304631', 'طحينة', 'CAT-001', 'piece', 8.00, 11.00, 0.15),
('PRD-016', 'SKU-016', '6281001304632', 'خبز توست', 'CAT-001', 'piece', 4.50, 6.00, 0.15),
('PRD-017', 'SKU-017', '6281001304633', 'تمر سكري ١ كيلو', 'CAT-001', 'piece', 30.00, 40.00, 0.15),
('PRD-018', 'SKU-018', '6281001304634', 'شاي أخضر ١٠٠ كيس', 'CAT-001', 'piece', 12.00, 16.00, 0.15),
('PRD-019', 'SKU-019', '6281001304635', 'قهوة تركية ٢٥٠ جرام', 'CAT-001', 'piece', 15.00, 20.00, 0.15),
('PRD-020', 'SKU-020', '6281001304636', 'كاتشاب', 'CAT-001', 'piece', 6.00, 8.00, 0.15),

-- Cleaning (CAT-002) — 10 items
('PRD-021', 'SKU-021', '6281007016183', 'صابون يدين سائل', 'CAT-002', 'piece', 9.50, 12.75, 0.15),
('PRD-022', 'SKU-022', '6281007016184', 'منظف زجاج', 'CAT-002', 'piece', 7.00, 9.50, 0.15),
('PRD-023', 'SKU-023', '6281007016185', 'منظف أرضيات', 'CAT-002', 'piece', 10.00, 13.50, 0.15),
('PRD-024', 'SKU-024', '6281007016186', 'معطر جو', 'CAT-002', 'piece', 12.00, 16.00, 0.15),
('PRD-025', 'SKU-025', '6281007016187', 'مسحوق غسيل ٣ كيلو', 'CAT-002', 'piece', 28.00, 37.00, 0.15),
('PRD-026', 'SKU-026', '6281007016188', 'منعم ملابس', 'CAT-002', 'piece', 14.00, 18.50, 0.15),
('PRD-027', 'SKU-027', '6281007016189', 'صابون غسيل', 'CAT-002', 'piece', 5.00, 7.00, 0.15),
('PRD-028', 'SKU-028', '6281007016190', 'مناديل ورقية', 'CAT-002', 'piece', 8.00, 10.50, 0.15),
('PRD-029', 'SKU-029', '6281007016191', 'منظف مطبخ', 'CAT-002', 'piece', 11.00, 14.50, 0.15),
('PRD-030', 'SKU-030', '6281007016192', 'كلوركس', 'CAT-002', 'piece', 6.50, 8.50, 0.15),

-- Beverages (CAT-003) — 10 items
('PRD-031', 'SKU-031', '6291041502380', 'مياه معدنية ١.٥ لتر', 'CAT-003', 'piece', 1.10, 1.50, 0.15),
('PRD-032', 'SKU-032', '6291041502381', 'عصير برتقال ١ لتر', 'CAT-003', 'piece', 5.50, 7.00, 0.15),
('PRD-033', 'SKU-033', '6291041502382', 'كولا ٢.٢٥ لتر', 'CAT-003', 'piece', 4.50, 6.00, 0.15),
('PRD-034', 'SKU-034', '6291041502383', 'عصير تفاح', 'CAT-003', 'piece', 5.00, 6.50, 0.15),
('PRD-035', 'SKU-035', '6291041502384', 'مياه غازية ليمون', 'CAT-003', 'piece', 3.50, 4.50, 0.15),
('PRD-036', 'SKU-036', '6291041502385', 'شاي مثلج', 'CAT-003', 'piece', 4.00, 5.50, 0.15),
('PRD-037', 'SKU-037', '6291041502386', 'عصير مانجو', 'CAT-003', 'piece', 5.50, 7.50, 0.15),
('PRD-038', 'SKU-038', '6291041502387', 'قهوة سريعة الذوبان', 'CAT-003', 'piece', 18.00, 24.00, 0.15),
('PRD-039', 'SKU-039', '6291041502388', 'حليب بنكهة الفانيليا', 'CAT-003', 'piece', 4.00, 5.50, 0.15),
('PRD-040', 'SKU-040', '6291041502389', 'مشروب طاقة', 'CAT-003', 'piece', 6.00, 8.00, 0.15),

-- Stationery (CAT-004) — 7 items
('PRD-041', 'SKU-041', '6223005015007', 'دفتر ملاحظات A4', 'CAT-004', 'piece', 6.00, 8.00, 0.15),
('PRD-042', 'SKU-042', '6223005015008', 'قلم حبر جاف', 'CAT-004', 'piece', 1.50, 2.50, 0.15),
('PRD-043', 'SKU-043', '6223005015009', 'أقلام ملونة ١٢ لون', 'CAT-004', 'piece', 8.00, 11.00, 0.15),
('PRD-044', 'SKU-044', '6223005015010', 'مسطرة ٣٠ سم', 'CAT-004', 'piece', 2.00, 3.00, 0.15),
('PRD-045', 'SKU-045', '6223005015011', 'مقص مكتبي', 'CAT-004', 'piece', 5.00, 7.00, 0.15),
('PRD-046', 'SKU-046', '6223005015012', 'غراء سائل', 'CAT-004', 'piece', 3.00, 4.50, 0.15),
('PRD-047', 'SKU-047', '6223005015013', 'دباسة', 'CAT-004', 'piece', 7.00, 9.50, 0.15),

-- Other (CAT-005) — 3 items
('PRD-048', 'SKU-048', '6223005015014', 'بطاريات AA', 'CAT-005', 'piece', 10.00, 13.50, 0.15),
('PRD-049', 'SKU-049', '6223005015015', 'شاحن USB', 'CAT-005', 'piece', 18.00, 25.00, 0.15),
('PRD-050', 'SKU-050', '6223005015016', 'كيبل شحن', 'CAT-005', 'piece', 12.00, 16.00, 0.15);

-- ========================================
-- Inventory for all products
-- ========================================
INSERT INTO inventory (id, branch_id, product_id, qty_on_hand, low_stock_threshold)
SELECT 
    'INV-' || p.id,
    'BR1',
    p.id,
    100 + ABS(RANDOM() % 200),
    10
FROM products p;

-- ========================================
-- Customers (5 B2B + 5 B2C)
-- ========================================
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

-- ========================================
-- Cashier Sessions (2 sessions for demo)
-- ========================================
INSERT INTO cashier_sessions (id, user_id, branch_id, opened_at, opening_float, status) VALUES
('SES-001', 'USR-002', 'BR1', datetime('now', '-7 days'), 1000.00, 'closed'),
('SES-002', 'USR-002', 'BR1', datetime('now', '-1 days'), 1500.00, 'open');

-- ========================================
-- 30 Invoices over past 7 days
-- ========================================
WITH RECURSIVE cnt(x) AS (
    SELECT 1
    UNION ALL
    SELECT x+1 FROM cnt WHERE x < 30
)
INSERT INTO invoices (id, uuid, branch_id, session_id, cashier_id, customer_id, invoice_number, invoice_type, status, subtotal, discount_amount, vat_amount, total, payment_method, zatca_status, created_at)
SELECT 
    'INV-' || lower(hex(randomblob(16))),
    lower(hex(randomblob(16))),
    'BR1',
    'SES-001',
    'USR-002',
    CASE WHEN ABS(RANDOM() % 3) = 0 THEN printf('CUS-%03d', 1 + ABS(RANDOM() % 10)) ELSE NULL END,
    'BR1-' || printf('%06d', x),
    'simplified',
    'confirmed',
    ROUND(50 + ABS(RANDOM() % 500), 2),
    0,
    ROUND((50 + ABS(RANDOM() % 500)) * 0.15, 2),
    ROUND((50 + ABS(RANDOM() % 500)) * 1.15, 2),
    CASE WHEN ABS(RANDOM() % 3) = 0 THEN 'cash' WHEN ABS(RANDOM() % 3) = 1 THEN 'card' ELSE 'mixed' END,
    'pending',
    datetime('now', '-' || ABS(RANDOM() % 7) || ' days')
FROM cnt;

-- ========================================
-- Invoice lines for each invoice
-- ========================================
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
JOIN products p ON p.id = printf('PRD-%03d', 1 + ABS(RANDOM() % 50))
WHERE i.invoice_number LIKE 'BR1-%';

-- ========================================
-- Payments for each invoice
-- ========================================
INSERT INTO payments (id, invoice_id, method, amount)
SELECT 
    'PAY-' || lower(hex(randomblob(16))),
    i.id,
    i.payment_method,
    i.total
FROM invoices i
WHERE i.payment_method != 'mixed';
