use pos::{Category, NewProduct, PosError, Product};
use pos::AppState;
use rusqlite::OptionalExtension;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

fn map_product_row(row: &rusqlite::Row) -> Result<Product, rusqlite::Error> {
    Ok(Product {
        id: row.get(0)?,
        sku: row.get(1)?,
        barcode: row.get(2)?,
        name_ar: row.get(3)?,
        name_en: row.get(4)?,
        category_id: row.get(5)?,
        category_name: row.get(6)?,
        unit: row.get(7)?,
        cost_price: row.get(8)?,
        sell_price: row.get(9)?,
        vat_rate: row.get(10)?,
        is_active: row.get(11)?,
        stock: row.get(12)?,
        created_at: row.get(13)?,
    })
}

#[tauri::command]
pub fn get_products(
    query: String,
    category_id: Option<String>,
    branch_id: String,
    state: State<AppState>,
) -> Result<Vec<Product>, PosError> {
    let conn = state.db.lock().map_err(|_| PosError::InternalError)?;

    let mut sql = String::from(
        "SELECT p.id, p.sku, p.barcode, p.name_ar, p.name_en, \
         p.category_id, c.name_ar as category_name, \
         p.unit, p.cost_price, p.sell_price, p.vat_rate, \
         p.is_active, COALESCE(i.qty_on_hand, 0) as stock, \
         p.created_at \
         FROM products p \
         LEFT JOIN categories c ON c.id = p.category_id \
         LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?1 \
         WHERE (p.name_ar LIKE '%' || ?2 || '%' OR p.barcode = ?3 OR p.sku = ?4)"
    );

    if category_id.is_some() {
        sql.push_str(" AND p.category_id = ?5");
    }
    sql.push_str(" ORDER BY p.name_ar LIMIT 50");

    let mut stmt = conn.prepare(&sql).map_err(|_| PosError::InternalError)?;

    let products: Result<Vec<Product>, rusqlite::Error> = if let Some(ref cat_id) = category_id {
        stmt.query_map(params![&branch_id, &query, &query, &query, cat_id], map_product_row)
            .and_then(|rows| rows.collect())
    } else {
        stmt.query_map(params![&branch_id, &query, &query, &query], map_product_row)
            .and_then(|rows| rows.collect())
    };

    products.map_err(|_| PosError::InternalError)
}

#[tauri::command]
pub fn get_product_by_barcode(
    barcode: String,
    branch_id: String,
    state: State<AppState>,
) -> Result<Option<Product>, PosError> {
    let conn = state.db.lock().map_err(|_| PosError::InternalError)?;

    let product = conn
        .query_row(
            "SELECT p.id, p.sku, p.barcode, p.name_ar, p.name_en, \
             p.category_id, c.name_ar as category_name, \
             p.unit, p.cost_price, p.sell_price, p.vat_rate, \
             p.is_active, COALESCE(i.qty_on_hand, 0) as stock, \
             p.created_at \
             FROM products p \
             LEFT JOIN categories c ON c.id = p.category_id \
             LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?1 \
             WHERE p.barcode = ?2 AND p.is_active = 1",
            params![&branch_id, &barcode],
            map_product_row,
        )
        .optional()
        .map_err(|_| PosError::InternalError)?;

    Ok(product)
}

#[tauri::command]
pub fn create_product(
    product: NewProduct,
    branch_id: String,
    cashier_id: String,
    session_id: String,
    state: State<AppState>,
) -> Result<Product, PosError> {
    let conn = state.db.lock().map_err(|_| PosError::InternalError)?;

    // Validate active session
    if let Err(e) = pos::auth::validate_session(&conn, &session_id, &cashier_id) {
        return Err(e);
    }

    // Require admin or manager role
    if let Err(e) = pos::auth::require_role_db(&conn, &cashier_id, &[pos::auth::Role::Admin, pos::auth::Role::Manager]) {
        return Err(e);
    }

    // Validate prices
    if product.sell_price < 0.0 {
        return Err(PosError::ValidationError("سعر البيع لا يمكن أن يكون سالباً".to_string()));
    }

    let id = format!("PRD-{}", Uuid::new_v4());
    let sku = product.sku.unwrap_or_else(|| format!("SKU-{}", Uuid::new_v4()));
    let vat_rate = product.vat_rate.unwrap_or(0.15);
    let unit = product.unit.unwrap_or_else(|| "piece".to_string());
    let cost_price = product.cost_price.unwrap_or(0.0);

    conn.execute(
        "INSERT INTO products (id, sku, barcode, name_ar, name_en, category_id, unit, cost_price, sell_price, vat_rate) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            &id,
            &sku,
            &product.barcode.unwrap_or_default(),
            &product.name_ar,
            &product.name_en.unwrap_or_default(),
            &product.category_id.unwrap_or_default(),
            &unit,
            &cost_price,
            &product.sell_price,
            &vat_rate,
        ],
    )?;

    // Auto-create inventory row
    let inv_id = format!("INV-{}", Uuid::new_v4());
    conn.execute(
        "INSERT INTO inventory (id, branch_id, product_id, qty_on_hand) VALUES (?1, ?2, ?3, 0)",
        params![&inv_id, &branch_id, &id],
    )?;

    // Audit log
    conn.execute(
        "INSERT INTO audit_log (id, action, entity_type, entity_id, payload) \
         VALUES (?1, 'product_created', 'product', ?2, ?3)",
        params![
            format!("AUD-{}", Uuid::new_v4()),
            &id,
            format!("{{\"sku\":\"{}\"}}", sku),
        ],
    )?;

    // Return the created product
    let created = conn
        .query_row(
            "SELECT p.id, p.sku, p.barcode, p.name_ar, p.name_en, p.category_id, \
             c.name_ar as category_name, p.unit, p.cost_price, p.sell_price, p.vat_rate, \
             p.is_active, COALESCE(i.qty_on_hand, 0) as stock, p.created_at \
             FROM products p \
             LEFT JOIN categories c ON c.id = p.category_id \
             LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?1 \
             WHERE p.id = ?2",
            params![&branch_id, &id],
            map_product_row,
        )
        .map_err(|_| PosError::InternalError)?;

    Ok(created)
}

#[tauri::command]
pub fn update_product(
    id: String,
    product: NewProduct,
    branch_id: String,
    cashier_id: String,
    session_id: String,
    state: State<AppState>,
) -> Result<Product, PosError> {
    let conn = state.db.lock().map_err(|_| PosError::InternalError)?;

    // Validate active session
    if let Err(e) = pos::auth::validate_session(&conn, &session_id, &cashier_id) {
        return Err(e);
    }

    // Require admin or manager role
    if let Err(e) = pos::auth::require_role_db(&conn, &cashier_id, &[pos::auth::Role::Admin, pos::auth::Role::Manager]) {
        return Err(e);
    }

    // Validate prices
    if product.sell_price < 0.0 {
        return Err(PosError::ValidationError("سعر البيع لا يمكن أن يكون سالباً".to_string()));
    }

    conn.execute(
        "UPDATE products SET name_ar = ?1, name_en = ?2, barcode = ?3, category_id = ?4, \
         unit = ?5, cost_price = ?6, sell_price = ?7, vat_rate = ?8 WHERE id = ?9",
        params![
            &product.name_ar,
            &product.name_en.unwrap_or_default(),
            &product.barcode.unwrap_or_default(),
            &product.category_id.unwrap_or_default(),
            &product.unit.unwrap_or_else(|| "piece".to_string()),
            &product.cost_price.unwrap_or(0.0),
            &product.sell_price,
            &product.vat_rate.unwrap_or(0.15),
            &id,
        ],
    )?;

    // Audit log
    conn.execute(
        "INSERT INTO audit_log (id, action, entity_type, entity_id) \
         VALUES (?1, 'product_updated', 'product', ?2)",
        params![format!("AUD-{}", Uuid::new_v4()), &id],
    )?;

    // Return updated product
    let updated = conn
        .query_row(
            "SELECT p.id, p.sku, p.barcode, p.name_ar, p.name_en, p.category_id, \
             c.name_ar as category_name, p.unit, p.cost_price, p.sell_price, p.vat_rate, \
             p.is_active, COALESCE(i.qty_on_hand, 0) as stock, p.created_at \
             FROM products p \
             LEFT JOIN categories c ON c.id = p.category_id \
             LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?1 \
             WHERE p.id = ?2",
            params![&branch_id, &id],
            map_product_row,
        )
        .map_err(|_| PosError::NotFound("المنتج غير موجود".to_string()))?;

    Ok(updated)
}

#[tauri::command]
pub fn toggle_product_active(
    id: String,
    cashier_id: String,
    session_id: String,
    state: State<AppState>,
) -> Result<(), PosError> {
    let conn = state.db.lock().map_err(|_| PosError::InternalError)?;

    // Validate active session
    if let Err(e) = pos::auth::validate_session(&conn, &session_id, &cashier_id) {
        return Err(e);
    }

    // Require admin or manager role
    if let Err(e) = pos::auth::require_role_db(&conn, &cashier_id, &[pos::auth::Role::Admin, pos::auth::Role::Manager]) {
        return Err(e);
    }

    conn.execute(
        "UPDATE products SET is_active = NOT is_active WHERE id = ?1",
        params![&id],
    )?;

    // Audit log
    conn.execute(
        "INSERT INTO audit_log (id, action, entity_type, entity_id) \
         VALUES (?1, 'product_updated', 'product', ?2)",
        params![format!("AUD-{}", Uuid::new_v4()), &id],
    )?;

    Ok(())
}

#[tauri::command]
pub fn get_categories(state: State<AppState>) -> Result<Vec<Category>, PosError> {
    let conn = state.db.lock().map_err(|_| PosError::InternalError)?;

    let mut stmt = conn
        .prepare("SELECT id, name_ar, name_en FROM categories ORDER BY name_ar")
        .map_err(|_| PosError::InternalError)?;

    let categories = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name_ar: row.get(1)?,
                name_en: row.get(2)?,
            })
        })
        .and_then(|rows| rows.collect())
        .map_err(|_| PosError::InternalError)?;

    Ok(categories)
}

#[tauri::command]
pub fn create_category(
    name_ar: String,
    name_en: Option<String>,
    cashier_id: String,
    session_id: String,
    state: State<AppState>,
) -> Result<Category, PosError> {
    let conn = state.db.lock().map_err(|_| PosError::InternalError)?;

    // Validate active session
    if let Err(e) = pos::auth::validate_session(&conn, &session_id, &cashier_id) {
        return Err(e);
    }

    // Require admin or manager role
    if let Err(e) = pos::auth::require_role_db(&conn, &cashier_id, &[pos::auth::Role::Admin, pos::auth::Role::Manager]) {
        return Err(e);
    }

    let id = format!("CAT-{}", Uuid::new_v4());

    conn.execute(
        "INSERT INTO categories (id, name_ar, name_en) VALUES (?1, ?2, ?3)",
        params![&id, &name_ar, &name_en.clone().unwrap_or_default()],
    )?;

    Ok(Category {
        id,
        name_ar,
        name_en,
    })
}
