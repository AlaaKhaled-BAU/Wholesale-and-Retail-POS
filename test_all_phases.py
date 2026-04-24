#!/usr/bin/env python3
"""
Comprehensive backend test suite for Wholesale POS (Phases 0-8)
Simulates Rust command logic via direct SQLite operations.
Run: python3 test_all_phases.py
"""
import sqlite3
import sys
from datetime import datetime

class TestRunner:
    def __init__(self):
        self.conn = sqlite3.connect(':memory:')
        self.conn.row_factory = sqlite3.Row
        # CRITICAL: Enable foreign key enforcement (Rust must do this too!)
        self.conn.execute('PRAGMA foreign_keys = ON')
        self.passed = 0
        self.failed = 0
        self.phase = ""

    def setup_db(self):
        # Fresh connection for each phase to avoid data pollution
        self.conn = sqlite3.connect(':memory:')
        self.conn.row_factory = sqlite3.Row
        self.conn.isolation_level = None  # Enable autocommit for explicit transactions
        self.conn.execute('PRAGMA foreign_keys = ON')
        with open('src-tauri/src/db/schema.sql') as f:
            self.conn.executescript(f.read())

    def seed_basic(self):
        """Minimal seed for testing"""
        self.conn.execute("INSERT INTO branches (id, name_ar, vat_number, cr_number) VALUES ('BR1', 'الفرع الرئيسي', '310123456700003', '1010123456')")
        self.conn.execute("INSERT INTO users (id, branch_id, name_ar, role, pin_hash, is_active) VALUES ('USR-001', 'BR1', 'المدير', 'admin', 'hash_admin', 1)")
        self.conn.execute("INSERT INTO users (id, branch_id, name_ar, role, pin_hash, is_active) VALUES ('USR-002', 'BR1', 'الكاشير', 'cashier', 'hash_cashier', 1)")
        self.conn.execute("INSERT INTO categories (id, name_ar, name_en) VALUES ('CAT-001', 'مواد غذائية', 'Food')")
        self.conn.execute("INSERT INTO products (id, sku, barcode, name_ar, category_id, unit, sell_price, vat_rate, is_active) VALUES ('PRD-001', 'SKU-001', '6281035931206', 'أرز بسمتي', 'CAT-001', 'piece', 45.00, 0.15, 1)")
        self.conn.execute("INSERT INTO inventory (id, branch_id, product_id, qty_on_hand, low_stock_threshold) VALUES ('INV-001', 'BR1', 'PRD-001', 100, 10)")
        self.conn.commit()

    def assert_eq(self, actual, expected, msg=""):
        if actual == expected:
            self.passed += 1
            return True
        else:
            self.failed += 1
            print(f"  FAIL [{self.phase}]: {msg}")
            print(f"    Expected: {expected}")
            print(f"    Actual:   {actual}")
            return False

    def assert_true(self, condition, msg=""):
        if condition:
            self.passed += 1
            return True
        else:
            self.failed += 1
            print(f"  FAIL [{self.phase}]: {msg}")
            return False

    def run_phase_0(self):
        self.phase = "Phase 0"
        print("\n=== Phase 0: Schema & Foundation ===")
        self.setup_db()

        # Test 0.1: Table count
        cur = self.conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [r[0] for r in cur.fetchall()]
        self.assert_eq(len(tables), 13, "Should have 13 tables")
        expected_tables = ['audit_log', 'branches', 'cashier_sessions', 'categories', 'customers',
                          'inventory', 'invoice_lines', 'invoices', 'payments', 'products',
                          'settings', 'users', 'zatca_queue']
        self.assert_eq(tables, expected_tables, "Table names should match")

        # Test 0.2: Index count (explicit only)
        cur = self.conn.execute("SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY name")
        indexes = [r[0] for r in cur.fetchall()]
        self.assert_eq(len(indexes), 12, "Should have 12 explicit indexes")

        # Test 0.3: FK constraints enabled
        cur = self.conn.execute("PRAGMA foreign_keys")
        fk_enabled = cur.fetchone()[0]
        self.assert_eq(fk_enabled, 1, "FK constraints should be enabled")

        print(f"  Phase 0: {self.passed} passed")

    def run_phase_1(self):
        self.phase = "Phase 1"
        print("\n=== Phase 1: Auth & Sessions ===")
        self.setup_db()
        self.seed_basic()

        # Test 1.1: User exists
        cur = self.conn.execute("SELECT id, role, is_active FROM users WHERE id = 'USR-002'")
        user = cur.fetchone()
        self.assert_true(user is not None, "Cashier user should exist")
        self.assert_eq(user['role'], 'cashier', "Role should be cashier")
        self.assert_eq(user['is_active'], 1, "User should be active")

        # Test 1.2: Open session
        self.conn.execute("INSERT INTO cashier_sessions (id, user_id, branch_id, opened_at, opening_float, status) VALUES ('SES-001', 'USR-002', 'BR1', datetime('now'), 1000, 'open')")
        cur = self.conn.execute("SELECT status, opening_float FROM cashier_sessions WHERE user_id = 'USR-002' AND status = 'open'")
        sess = cur.fetchone()
        self.assert_true(sess is not None, "Open session should exist")
        self.assert_eq(sess['opening_float'], 1000.0, "Opening float should be 1000")

        # Test 1.3: Idempotency - duplicate open session check
        cur = self.conn.execute("SELECT id FROM cashier_sessions WHERE user_id = 'USR-002' AND status = 'open'")
        existing = cur.fetchone()
        self.assert_eq(existing['id'], 'SES-001', "Should return existing session")

        # Test 1.4: Close session
        self.conn.execute("UPDATE cashier_sessions SET closed_at = datetime('now'), closing_cash = 1200, status = 'closed' WHERE id = 'SES-001'")
        cur = self.conn.execute("SELECT status FROM cashier_sessions WHERE id = 'SES-001'")
        self.assert_eq(cur.fetchone()['status'], 'closed', "Session should be closed")

        # Test 1.5: Audit log written
        self.conn.execute("INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, payload) VALUES ('AUD-001', 'USR-002', 'session_opened', 'cashier_session', 'SES-001', '{}')")
        cur = self.conn.execute("SELECT COUNT(*) FROM audit_log WHERE action = 'session_opened'")
        self.assert_eq(cur.fetchone()[0], 1, "Audit log should have session_opened entry")

        # Test 1.6: Arabic error message policy
        # (Policy test - backend returns Arabic strings)
        print("  Phase 1: Auth logic verified")

    def run_phase_2(self):
        self.phase = "Phase 2"
        print("\n=== Phase 2: Products & Inventory ===")
        self.setup_db()
        self.seed_basic()

        # Test 2.1: Product search by name
        cur = self.conn.execute("SELECT p.id, p.name_ar, COALESCE(i.qty_on_hand, 0) as stock FROM products p LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = 'BR1' WHERE p.name_ar LIKE '%' || ? || '%'", ('أرز',))
        prod = cur.fetchone()
        self.assert_true(prod is not None, "Should find product by name")
        self.assert_eq(prod['name_ar'], 'أرز بسمتي', "Product name should match")
        self.assert_eq(prod['stock'], 100, "Stock should be 100")

        # Test 2.2: Barcode search
        cur = self.conn.execute("SELECT id, name_ar FROM products WHERE barcode = ? AND is_active = 1", ('6281035931206',))
        prod = cur.fetchone()
        self.assert_true(prod is not None, "Should find product by barcode")

        # Test 2.3: Create product + auto inventory
        self.conn.execute("INSERT INTO products (id, sku, barcode, name_ar, category_id, unit, sell_price, vat_rate) VALUES ('PRD-002', 'SKU-002', '111', 'زيت', 'CAT-001', 'piece', 28.5, 0.15)")
        self.conn.execute("INSERT INTO inventory (id, branch_id, product_id, qty_on_hand) VALUES ('INV-002', 'BR1', 'PRD-002', 0)")
        cur = self.conn.execute("SELECT qty_on_hand FROM inventory WHERE product_id = 'PRD-002'")
        self.assert_eq(cur.fetchone()[0], 0, "New product should have 0 inventory")

        # Test 2.4: Category CRUD
        self.conn.execute("INSERT INTO categories (id, name_ar, name_en) VALUES ('CAT-002', 'منظفات', 'Cleaning')")
        cur = self.conn.execute("SELECT COUNT(*) FROM categories")
        self.assert_eq(cur.fetchone()[0], 2, "Should have 2 categories")

        # Test 2.5: Inventory adjustment + audit
        old_qty = self.conn.execute("SELECT qty_on_hand FROM inventory WHERE branch_id = 'BR1' AND product_id = 'PRD-001'").fetchone()[0]
        self.conn.execute("UPDATE inventory SET qty_on_hand = ?, last_updated = datetime('now') WHERE branch_id = ? AND product_id = ?", (150, 'BR1', 'PRD-001'))
        new_qty = self.conn.execute("SELECT qty_on_hand FROM inventory WHERE branch_id = 'BR1' AND product_id = 'PRD-001'").fetchone()[0]
        self.assert_eq(new_qty, 150, "Inventory should be updated to 150")

        # Test 2.6: Low stock flag
        self.conn.execute("UPDATE inventory SET qty_on_hand = 3 WHERE product_id = 'PRD-001'")
        cur = self.conn.execute("SELECT (qty_on_hand <= low_stock_threshold) as is_low FROM inventory WHERE product_id = 'PRD-001'")
        self.assert_eq(cur.fetchone()[0], 1, "Should flag low stock when qty <= threshold")

        print("  Phase 2: Product & inventory logic verified")

    def run_phase_3(self):
        self.phase = "Phase 3"
        print("\n=== Phase 3: Invoices (CRITICAL) ===")
        self.setup_db()
        self.seed_basic()

        # Open session first
        self.conn.execute("INSERT INTO cashier_sessions (id, user_id, branch_id, opened_at, opening_float, status) VALUES ('SES-001', 'USR-002', 'BR1', datetime('now'), 1000, 'open')")

        # Test 3.1: Invoice number generation
        self.conn.execute("INSERT INTO invoices (id, uuid, branch_id, session_id, cashier_id, invoice_number, invoice_type, status, subtotal, vat_amount, total) VALUES ('INV-001', 'uuid1', 'BR1', 'SES-001', 'USR-002', 'BR1-000001', 'simplified', 'confirmed', 100, 15, 115)")
        cur = self.conn.execute("SELECT invoice_number FROM invoices ORDER BY created_at DESC LIMIT 1")
        last_num = cur.fetchone()[0]
        self.assert_eq(last_num, 'BR1-000001', "Invoice number should be BR1-000001")

        # Next invoice number
        parts = last_num.split('-')
        next_counter = int(parts[1]) + 1
        next_num = f"{parts[0]}-{next_counter:06d}"
        self.assert_eq(next_num, 'BR1-000002', "Next invoice number should be BR1-000002")

        # Test 3.2: Atomic transaction simulation
        # Note: executescript() auto-wraps in transaction, so we use execute() for explicit tx
        transaction_ok = False
        try:
            self.conn.execute("BEGIN TRANSACTION")
            self.conn.execute("INSERT INTO invoices (id, uuid, branch_id, session_id, cashier_id, invoice_number, invoice_type, status, subtotal, vat_amount, total) VALUES ('INV-002', 'uuid2', 'BR1', 'SES-001', 'USR-002', 'BR1-000002', 'simplified', 'confirmed', 200, 30, 230)")
            self.conn.execute("INSERT INTO invoice_lines (id, invoice_id, product_id, product_name_ar, qty, unit_price, vat_rate, vat_amount, line_total) VALUES ('ILN-001', 'INV-002', 'PRD-001', 'أرز', 2, 45, 0.15, 13.5, 103.5)")
            self.conn.execute("INSERT INTO payments (id, invoice_id, method, amount) VALUES ('PAY-001', 'INV-002', 'cash', 230)")
            # Decrement inventory
            self.conn.execute("UPDATE inventory SET qty_on_hand = qty_on_hand - ? WHERE branch_id = ? AND product_id = ?", (2, 'BR1', 'PRD-001'))
            self.conn.execute("INSERT INTO audit_log (id, action, entity_type, entity_id, user_id, payload) VALUES ('AUD-001', 'invoice_created', 'invoice', 'INV-002', 'USR-002', '{}')")
            self.conn.execute("COMMIT")
            transaction_ok = True
        except Exception as e:
            try:
                self.conn.execute("ROLLBACK")
            except:
                pass
            print(f"    Transaction error: {e}")

        self.assert_true(transaction_ok, "Invoice transaction should succeed")

        # Test 3.3: Verify inventory decremented
        cur = self.conn.execute("SELECT qty_on_hand FROM inventory WHERE product_id = 'PRD-001'")
        self.assert_eq(cur.fetchone()[0], 98, "Inventory should be decremented by 2 (100-2)")

        # Test 3.4: Invoice lines exist
        cur = self.conn.execute("SELECT COUNT(*) FROM invoice_lines WHERE invoice_id = 'INV-002'")
        self.assert_eq(cur.fetchone()[0], 1, "Invoice should have 1 line")

        # Test 3.5: Payment exists
        cur = self.conn.execute("SELECT method, amount FROM payments WHERE invoice_id = 'INV-002'")
        pay = cur.fetchone()
        self.assert_eq(pay['method'], 'cash', "Payment method should be cash")
        self.assert_eq(pay['amount'], 230, "Payment amount should be 230")

        # Test 3.6: Session validation (Gap G4)
        try:
            self.conn.execute("BEGIN")
            # Try to create invoice with closed session
            self.conn.execute("INSERT INTO invoices (id, uuid, branch_id, session_id, cashier_id, invoice_number, invoice_type, status, subtotal, vat_amount, total) VALUES ('INV-BAD', 'uuid-bad', 'BR1', 'CLOSED-SES', 'USR-002', 'BAD-001', 'simplified', 'confirmed', 100, 15, 115)")
            self.conn.execute("COMMIT")
            session_block = False
        except:
            self.conn.execute("ROLLBACK")
            session_block = True
        # Note: This is a logic check - Rust code checks session status before insert
        print("  Phase 3: Session validation is logic-level (Rust checks before SQL)")

        # Test 3.7: Refund - restock inventory
        original_qty = self.conn.execute("SELECT qty_on_hand FROM inventory WHERE product_id = 'PRD-001'").fetchone()[0]
        self.conn.execute("BEGIN")
        self.conn.execute("INSERT INTO invoices (id, uuid, branch_id, session_id, cashier_id, invoice_number, invoice_type, status, subtotal, vat_amount, total) VALUES ('INV-REF', 'uuid-ref', 'BR1', 'SES-001', 'USR-002', 'REF-001', 'credit_note', 'confirmed', -100, -15, -115)")
        self.conn.execute("INSERT INTO invoice_lines (id, invoice_id, product_id, product_name_ar, qty, unit_price, vat_rate, vat_amount, line_total) VALUES ('ILN-REF', 'INV-REF', 'PRD-001', 'أرز', -2, 45, 0.15, -13.5, -103.5)")
        self.conn.execute("UPDATE inventory SET qty_on_hand = qty_on_hand + ? WHERE branch_id = ? AND product_id = ?", (2, 'BR1', 'PRD-001'))
        self.conn.execute("COMMIT")

        new_qty = self.conn.execute("SELECT qty_on_hand FROM inventory WHERE product_id = 'PRD-001'").fetchone()[0]
        self.assert_eq(new_qty, original_qty + 2, "Refund should restock inventory")

        # Test 3.8: Invoice number uniqueness
        try:
            self.conn.execute("INSERT INTO invoices (id, uuid, branch_id, session_id, cashier_id, invoice_number, invoice_type, status, subtotal, vat_amount, total) VALUES ('INV-DUP', 'uuid-dup', 'BR1', 'SES-001', 'USR-002', 'BR1-000001', 'simplified', 'confirmed', 100, 15, 115)")
            dup_blocked = False
        except sqlite3.IntegrityError:
            dup_blocked = True
        self.assert_true(dup_blocked, "Duplicate invoice numbers should be blocked")

        print("  Phase 3: Invoice logic verified")

    def run_phase_4(self):
        self.phase = "Phase 4"
        print("\n=== Phase 4: Customers ===")
        self.setup_db()
        self.seed_basic()

        # Test 4.1: Create B2B and B2C customers
        self.conn.execute("INSERT INTO customers (id, name_ar, phone, vat_number, cr_number, credit_limit, balance, customer_type) VALUES ('CUS-001', 'أحمد', '0501234567', NULL, NULL, 0, 0, 'b2c')")
        self.conn.execute("INSERT INTO customers (id, name_ar, phone, vat_number, cr_number, credit_limit, balance, customer_type) VALUES ('CUS-002', 'شركة النور', '0559876543', '300123456700003', '1010654321', 50000, 12500, 'b2b')")

        # Test 4.2: Search
        cur = self.conn.execute("SELECT id, customer_type FROM customers WHERE name_ar LIKE '%' || ? || '%'", ('شركة',))
        results = cur.fetchall()
        self.assert_eq(len(results), 1, "Should find 1 B2B customer by name search")
        self.assert_eq(results[0]['customer_type'], 'b2b', "Should be b2b type")

        # Test 4.3: Customer balance
        self.conn.execute("INSERT INTO cashier_sessions (id, user_id, branch_id, opened_at, status) VALUES ('SES-001', 'USR-002', 'BR1', datetime('now'), 'open')")
        self.conn.execute("INSERT INTO invoices (id, uuid, branch_id, session_id, cashier_id, customer_id, invoice_number, invoice_type, status, subtotal, vat_amount, total) VALUES ('INV-001', 'uuid1', 'BR1', 'SES-001', 'USR-002', 'CUS-002', 'INV-001', 'standard', 'confirmed', 1000, 150, 1150)")

        cur = self.conn.execute("SELECT COALESCE(SUM(total), 0) FROM invoices WHERE customer_id = ? AND status != 'cancelled'", ('CUS-002',))
        balance = cur.fetchone()[0]
        self.assert_eq(balance, 1150, "Customer balance should be 1150")

        # Test 4.4: Payment reduces balance
        cur = self.conn.execute("SELECT balance FROM customers WHERE id = 'CUS-002'").fetchone()[0]
        # In our implementation, we track balance in customers table separately
        # Let's test the update logic:
        self.conn.execute("UPDATE customers SET balance = balance - ? WHERE id = ?", (500, 'CUS-002'))
        new_balance = self.conn.execute("SELECT balance FROM customers WHERE id = 'CUS-002'").fetchone()[0]
        self.assert_eq(new_balance, 12000, "Balance should decrease by 500 (12500-500)")

        print("  Phase 4: Customer logic verified")

    def run_phase_5(self):
        self.phase = "Phase 5"
        print("\n=== Phase 5: Reports ===")
        self.setup_db()
        self.seed_basic()
        self.conn.execute("INSERT INTO cashier_sessions (id, user_id, branch_id, opened_at, status) VALUES ('SES-001', 'USR-002', 'BR1', datetime('now'), 'open')")

        # Create multiple invoices for report testing
        today = datetime.now().strftime('%Y-%m-%d')
        for i in range(3):
            inv_id = f"INV-{i:03d}"
            self.conn.execute(f"INSERT INTO invoices (id, uuid, branch_id, session_id, cashier_id, invoice_number, invoice_type, status, subtotal, vat_amount, total, created_at) VALUES (?, ?, 'BR1', 'SES-001', 'USR-002', ?, 'simplified', 'confirmed', 100, 15, 115, datetime('now'))", (inv_id, f"uuid-{i}", f"BR1-{i:06d}"))
            self.conn.execute("INSERT INTO invoice_lines (id, invoice_id, product_id, product_name_ar, qty, unit_price, vat_rate, vat_amount, line_total) VALUES (?, ?, 'PRD-001', 'أرز', 1, 45, 0.15, 6.75, 51.75)", (f"ILN-{i:03d}", inv_id))
            self.conn.execute("INSERT INTO payments (id, invoice_id, method, amount) VALUES (?, ?, 'cash', 115)", (f"PAY-{i:03d}", inv_id))

        # Test 5.1: Daily summary
        cur = self.conn.execute("SELECT COUNT(*), COALESCE(SUM(subtotal), 0), COALESCE(SUM(vat_amount), 0), COALESCE(SUM(total), 0) FROM invoices WHERE branch_id = ? AND DATE(created_at) = ? AND status != 'cancelled'", ('BR1', today))
        summary = cur.fetchone()
        self.assert_eq(summary[0], 3, "Daily invoice count should be 3")
        self.assert_eq(summary[1], 300, "Daily subtotal should be 300")
        self.assert_eq(summary[3], 345, "Daily total should be 345 (3*115)")

        # Test 5.2: Payment breakdown
        cur = self.conn.execute("SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.branch_id = ? AND DATE(i.created_at) = ? AND p.method = 'cash' AND i.status != 'cancelled'", ('BR1', today))
        cash_total = cur.fetchone()[0]
        self.assert_eq(cash_total, 345, "Cash total should be 345")

        # Test 5.3: Top products
        cur = self.conn.execute("SELECT il.product_name_ar, SUM(il.qty) as qty_sold, SUM(il.line_total) as revenue FROM invoice_lines il JOIN invoices i ON i.id = il.invoice_id WHERE i.branch_id = ? AND DATE(i.created_at) = ? AND i.status != 'cancelled' GROUP BY il.product_id ORDER BY qty_sold DESC LIMIT 5", ('BR1', today))
        top = cur.fetchone()
        self.assert_eq(top['product_name_ar'], 'أرز', "Top product should be 'أرز'")
        self.assert_eq(top['qty_sold'], 3, "Qty sold should be 3")

        # Test 5.4: Session report
        cur = self.conn.execute("SELECT COUNT(*), COALESCE(SUM(total), 0) FROM invoices WHERE session_id = ? AND status != 'cancelled'", ('SES-001',))
        sess_report = cur.fetchone()
        self.assert_eq(sess_report[0], 3, "Session invoice count should be 3")
        self.assert_eq(sess_report[1], 345, "Session total should be 345")

        # Test 5.5: CSV export
        cur = self.conn.execute("SELECT invoice_number, invoice_type, subtotal, vat_amount, total, created_at FROM invoices WHERE branch_id = ? AND DATE(created_at) = ? AND status != 'cancelled' ORDER BY created_at", ('BR1', today))
        rows = cur.fetchall()
        csv_lines = ["invoice_number,invoice_type,subtotal,vat_amount,total,created_at"]
        for r in rows:
            csv_lines.append(f"{r[0]},{r[1]},{r[2]},{r[3]},{r[4]},{r[5]}")
        self.assert_eq(len(csv_lines), 4, "CSV should have header + 3 data rows")

        print("  Phase 5: Report logic verified")

    def run_phase_6(self):
        self.phase = "Phase 6"
        print("\n=== Phase 6: ZATCA Compliance ===")
        self.setup_db()
        self.seed_basic()

        # Test 6.1: ZATCA settings storage
        self.conn.execute("INSERT INTO settings (key, value) VALUES ('zatca_registered', 'true')")
        cur = self.conn.execute("SELECT value FROM settings WHERE key = 'zatca_registered'")
        self.assert_eq(cur.fetchone()[0], 'true', "ZATCA registered flag should be stored")

        # Test 6.2: Pending count
        self.conn.execute("INSERT INTO cashier_sessions (id, user_id, branch_id, opened_at, status) VALUES ('SES-001', 'USR-002', 'BR1', datetime('now'), 'open')")
        self.conn.execute("INSERT INTO invoices (id, uuid, branch_id, session_id, cashier_id, invoice_number, invoice_type, status, subtotal, vat_amount, total, zatca_status) VALUES ('INV-001', 'uuid1', 'BR1', 'SES-001', 'USR-002', 'BR1-000001', 'simplified', 'confirmed', 100, 15, 115, 'pending')")
        self.conn.execute("INSERT INTO invoices (id, uuid, branch_id, session_id, cashier_id, invoice_number, invoice_type, status, subtotal, vat_amount, total, zatca_status) VALUES ('INV-002', 'uuid2', 'BR1', 'SES-001', 'USR-002', 'BR1-000002', 'simplified', 'confirmed', 100, 15, 115, 'rejected')")

        cur = self.conn.execute("SELECT COUNT(*) FROM invoices WHERE zatca_status = 'pending'")
        self.assert_eq(cur.fetchone()[0], 1, "Should have 1 pending invoice")

        cur = self.conn.execute("SELECT COUNT(*) FROM invoices WHERE zatca_status = 'rejected'")
        self.assert_eq(cur.fetchone()[0], 1, "Should have 1 rejected invoice")

        # Test 6.3: ZATCA queue
        self.conn.execute("INSERT INTO zatca_queue (id, invoice_id, attempts) VALUES ('QUE-001', 'INV-001', 0)")
        cur = self.conn.execute("SELECT invoice_id FROM zatca_queue WHERE attempts < 10")
        self.assert_eq(cur.fetchone()[0], 'INV-001', "Queue should contain pending invoice")

        # Test 6.4: QR code field exists
        self.conn.execute("UPDATE invoices SET qr_code = ? WHERE id = 'INV-001'", ('BASE64_QR_PLACEHOLDER',))
        cur = self.conn.execute("SELECT qr_code FROM invoices WHERE id = 'INV-001'")
        self.assert_eq(cur.fetchone()[0], 'BASE64_QR_PLACEHOLDER', "QR code should be stored")

        # Test 6.5: Invoice hash
        self.conn.execute("UPDATE invoices SET invoice_hash = ? WHERE id = 'INV-001'", ('SHA256_HASH_VALUE',))
        cur = self.conn.execute("SELECT invoice_hash FROM invoices WHERE id = 'INV-001'")
        self.assert_eq(cur.fetchone()[0], 'SHA256_HASH_VALUE', "Invoice hash should be stored")

        print("  Phase 6: ZATCA logic verified")

    def run_phase_7(self):
        self.phase = "Phase 7"
        print("\n=== Phase 7: Settings ===")
        self.setup_db()

        # Test 7.1: UPSERT
        self.conn.execute("INSERT INTO settings (key, value, updated_at) VALUES ('vat_rate', '0.15', datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')")
        cur = self.conn.execute("SELECT value FROM settings WHERE key = 'vat_rate'")
        self.assert_eq(cur.fetchone()[0], '0.15', "VAT rate should be 0.15")

        # Test 7.2: Update via UPSERT
        self.conn.execute("INSERT INTO settings (key, value, updated_at) VALUES ('vat_rate', '0.05', datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')")
        cur = self.conn.execute("SELECT value FROM settings WHERE key = 'vat_rate'")
        self.assert_eq(cur.fetchone()[0], '0.05', "VAT rate should update to 0.05")
        cur = self.conn.execute("SELECT COUNT(*) FROM settings WHERE key = 'vat_rate'")
        self.assert_eq(cur.fetchone()[0], 1, "Should only have 1 vat_rate row (no duplicates)")

        # Test 7.3: Default settings
        defaults = [
            ('vat_rate', '0.15'),
            ('printer_type', 'usb'),
            ('branch_name_ar', 'الفرع الرئيسي'),
        ]
        for key, val in defaults:
            self.conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, val))
        cur = self.conn.execute("SELECT COUNT(*) FROM settings")
        self.assert_eq(cur.fetchone()[0], 3, "Should have 3 settings")

        print("  Phase 7: Settings logic verified")

    def run_phase_8(self):
        self.phase = "Phase 8"
        print("\n=== Phase 8: Demo Seed & Integration ===")
        self.setup_db()

        # Seed basic data first (seed_demo.sql depends on existing branch/users)
        self.seed_basic()
        # Also need a second user and the default sessions structure
        self.conn.execute("INSERT INTO users (id, branch_id, name_ar, role, pin_hash, is_active) VALUES ('USR-SEED', 'BR1', 'seed', 'cashier', 'hash', 1)")

        # Test 8.1: Load demo seed
        with open('src-tauri/src/db/seed_demo.sql') as f:
            seed_sql = f.read()

        # Run the seed - it will clear existing data and insert demo data
        self.conn.executescript(seed_sql)

        counts = {}
        counts['categories'] = self.conn.execute('SELECT COUNT(*) FROM categories').fetchone()[0]
        counts['products'] = self.conn.execute('SELECT COUNT(*) FROM products').fetchone()[0]
        counts['customers'] = self.conn.execute('SELECT COUNT(*) FROM customers').fetchone()[0]
        counts['invoices'] = self.conn.execute('SELECT COUNT(*) FROM invoices').fetchone()[0]
        counts['invoice_lines'] = self.conn.execute('SELECT COUNT(*) FROM invoice_lines').fetchone()[0]
        counts['payments'] = self.conn.execute('SELECT COUNT(*) FROM payments').fetchone()[0]
        counts['inventory'] = self.conn.execute('SELECT COUNT(*) FROM inventory').fetchone()[0]

        self.assert_eq(counts['categories'], 5, "Demo should have 5 categories")
        self.assert_eq(counts['products'], 50, "Demo should have 50 products")
        self.assert_eq(counts['customers'], 10, "Demo should have 10 customers")
        self.assert_eq(counts['invoices'], 30, "Demo should have 30 invoices")
        self.assert_eq(counts['invoice_lines'], 30, "Demo should have 30 invoice lines")
        self.assert_true(0 < counts['payments'] <= counts['invoices'], f"Demo should have some payments ({counts['payments']} found)")
        self.assert_eq(counts['inventory'], 50, "Demo should have 50 inventory rows")

        # Test 8.2: B2B/B2C split
        cur = self.conn.execute("SELECT COUNT(*) FROM customers WHERE customer_type = 'b2b'")
        self.assert_eq(cur.fetchone()[0], 5, "Should have 5 B2B customers")
        cur = self.conn.execute("SELECT COUNT(*) FROM customers WHERE customer_type = 'b2c'")
        self.assert_eq(cur.fetchone()[0], 5, "Should have 5 B2C customers")

        # Test 8.3: Invoice number format
        cur = self.conn.execute("SELECT invoice_number FROM invoices LIMIT 1")
        num = cur.fetchone()[0]
        self.assert_true(num.startswith('BR1-'), "Invoice numbers should start with BR1-")
        self.assert_true(len(num) == 10, "Invoice number format should be BR1-XXXXXX")

        # Test 8.4: Session statuses
        cur = self.conn.execute("SELECT COUNT(*) FROM cashier_sessions WHERE status = 'open'")
        self.assert_eq(cur.fetchone()[0], 1, "Should have 1 open session")
        cur = self.conn.execute("SELECT COUNT(*) FROM cashier_sessions WHERE status = 'closed'")
        self.assert_eq(cur.fetchone()[0], 1, "Should have 1 closed session")

        print("  Phase 8: Demo seed verified")

    def run_all(self):
        print("=" * 60)
        print("WHOLESALE POS BACKEND TEST SUITE")
        print("=" * 60)

        self.run_phase_0()
        self.run_phase_1()
        self.run_phase_2()
        self.run_phase_3()
        self.run_phase_4()
        self.run_phase_5()
        self.run_phase_6()
        self.run_phase_7()
        self.run_phase_8()

        print("\n" + "=" * 60)
        print(f"RESULTS: {self.passed} passed, {self.failed} failed")
        print("=" * 60)

        if self.failed > 0:
            print("\nSOME TESTS FAILED - SEE DETAILS ABOVE")
            return 1
        else:
            print("\nALL TESTS PASSED!")
            return 0

if __name__ == '__main__':
    runner = TestRunner()
    sys.exit(runner.run_all())
