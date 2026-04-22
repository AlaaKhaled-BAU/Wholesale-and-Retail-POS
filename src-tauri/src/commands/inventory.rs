use crate::lib::InventoryItem;
use crate::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

fn map_inventory_row(row: &rusqlite::Row) -> Result<InventoryItem, rusqlite::Error> {
    Ok(InventoryItem {
        id: row.get(0)?,
        branch_id: row.get(1)?,
        product_id: row.get(2)?,
        product_name_ar: row.get(3)?,
        sku: row.get(4)?,
        barcode: row.get(5)?,
        qty_on_hand: row.get(6)?,
        low_stock_threshold: row.get(7)?,
        stock_value: row.get(8)?,
        is_low_stock: row.get(9)?,
        last_updated: row.get(10)?,
    })
}

#[tauri::command]
pub fn get_inventory(
    branch_id: String,
    state: State<AppState>,
) -> Result<Vec<InventoryItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT i.id, i.branch_id, i.product_id, \
             p.name_ar as product_name_ar, p.sku, p.barcode, \
             i.qty_on_hand, i.low_stock_threshold, \
             (i.qty_on_hand * p.cost_price) as stock_value, \
             (i.qty_on_hand <= i.low_stock_threshold) as is_low_stock, \
             i.last_updated \
             FROM inventory i \
             JOIN products p ON p.id = i.product_id \
             WHERE i.branch_id = ?1 \
             ORDER BY p.name_ar"
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![&branch_id], map_inventory_row)
        .and_then(|rows| rows.collect())
        .map_err(|e| e.to_string())?;

    Ok(items)
}

#[tauri::command]
pub fn adjust_inventory(
    branch_id: String,
    product_id: String,
    new_qty: f64,
    reason: String,
    user_id: String,
    state: State<AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Get old quantity
    let old_qty: f64 = conn
        .query_row(
            "SELECT qty_on_hand FROM inventory WHERE branch_id = ?1 AND product_id = ?2",
            params![&branch_id, &product_id],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    conn.execute(
        "UPDATE inventory SET qty_on_hand = ?1, last_updated = datetime('now') \
         WHERE branch_id = ?2 AND product_id = ?3",
        params![&new_qty, &branch_id, &product_id],
    )
    .map_err(|e| e.to_string())?;

    // Audit log
    conn.execute(
        "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, payload) \
         VALUES (?1, ?2, 'inventory_adjusted', 'inventory', ?3, ?4)",
        params![
            format!("AUD-{}", Uuid::new_v4()),
            &user_id,
            &product_id,
            format!(
                "{{\"old_qty\":{},\"new_qty\":{},\"reason\":\"{}\"}}",
                old_qty, new_qty, reason
            ),
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_inventory_by_product(
    branch_id: String,
    product_id: String,
    state: State<AppState>,
) -> Result<Option<InventoryItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let item = conn
        .query_row(
            "SELECT i.id, i.branch_id, i.product_id, \
             p.name_ar as product_name_ar, p.sku, p.barcode, \
             i.qty_on_hand, i.low_stock_threshold, \
             (i.qty_on_hand * p.cost_price) as stock_value, \
             (i.qty_on_hand <= i.low_stock_threshold) as is_low_stock, \
             i.last_updated \
             FROM inventory i \
             JOIN products p ON p.id = i.product_id \
             WHERE i.branch_id = ?1 AND i.product_id = ?2",
            params![&branch_id, &product_id],
            map_inventory_row,
        )
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(item)
}
