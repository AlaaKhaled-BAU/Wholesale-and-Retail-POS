use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "initial_schema",
        sql: include_str!("schema.sql"),
        kind: MigrationKind::Up,
    }]
}

#[cfg(debug_assertions)]
pub fn seed_if_empty(conn: &rusqlite::Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM branches", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if count > 0 {
        return Ok(());
    }

    conn.execute(
        "INSERT INTO branches (id, name_ar, vat_number, cr_number) VALUES (?1, ?2, ?3, ?4)",
        ["BR1", "الفرع الرئيسي", "310123456700003", "1010123456"],
    ).map_err(|e| e.to_string())?;

    let admin_hash = bcrypt::hash("0000", bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO users (id, branch_id, name_ar, role, pin_hash) VALUES (?1, ?2, ?3, ?4, ?5)",
        ["USR-001", "BR1", "المدير", "admin", &admin_hash],
    ).map_err(|e| e.to_string())?;

    let cashier_hash = bcrypt::hash("1234", bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO users (id, branch_id, name_ar, role, pin_hash) VALUES (?1, ?2, ?3, ?4, ?5)",
        ["USR-002", "BR1", "الكاشير", "cashier", &cashier_hash],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO categories (id, name_ar) VALUES (?1, ?2)",
        ["CAT-001", "مواد غذائية"],
    ).map_err(|e| e.to_string())?;

    let products = vec![
        ("PRD-001", "6281035931206", "أرز بسمتي ٥ كيلو", "CAT-001", 45.00),
        ("PRD-002", "6281001304614", "زيت طبخ نخيل ٢ لتر", "CAT-001", 28.50),
        ("PRD-003", "6291041502380", "مياه معدنية ١.٥ لتر", "CAT-001", 1.50),
    ];

    for (id, barcode, name, cat_id, price) in products {
        let sku = format!("SKU-{}", id.split('-').nth(1).unwrap_or(id));
        conn.execute(
            "INSERT INTO products (id, sku, barcode, name_ar, category_id, sell_price) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            [id, &sku, barcode, name, cat_id, &price.to_string()],
        ).map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO inventory (id, branch_id, product_id, qty_on_hand) VALUES (?1, ?2, ?3, ?4)",
            [&format!("INV-{}", id), "BR1", id, "100"],
        ).map_err(|e| e.to_string())?;
    }

    let defaults = [
        ("vat_rate", "0.15"),
        ("printer_port", ""),
        ("printer_type", "usb"),
        ("branch_name_ar", "الفرع الرئيسي"),
        ("invoice_note", "شكراً لزيارتكم — يُرجى الاحتفاظ بالفاتورة"),
        ("numerals", "western"),
        ("auto_lock_minutes", "5"),
    ];

    for (key, value) in &defaults {
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
            [*key, *value],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[cfg(not(debug_assertions))]
pub fn seed_if_empty(_conn: &rusqlite::Connection) -> Result<(), String> {
    Ok(())
}
