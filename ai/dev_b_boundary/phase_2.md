# Phase 2 — Product Management (5–7 days)
> **Start: After Phase 1 | Dev B leads, 1-day head start on Dev A**

---

## Phase 2 Overview

This phase implements product CRUD, category management, and inventory tracking. Dev B has a 1-day head start before Dev A begins their UI work.

**Merge Point: MP-2** — Task 2.1.6 complete. Dev A wires Product Management UI.

---

## Task 2.1.1 — `get_products` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes (Dev A starts 1 day after you)

### Objective
Search products by name, barcode, or SKU. Join with categories and inventory for stock info. Limit to 50 results.

### Files to Edit
- `src-tauri/src/commands/products.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/main.rs`

### Steps

1. Replace `src-tauri/src/commands/products.rs` with:

```rust
use crate::lib::Product;
use tauri_plugin_sql::TauriSql;

#[tauri::command]
pub async fn get_products(
    query: String,
    category_id: Option<String>,
    branch_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<Vec<Product>, String> {
    let sql = format!(
        "SELECT 
            p.id, p.sku, p.barcode, p.name_ar, p.name_en, 
            p.category_id, c.name_ar as category_name, 
            p.unit, p.cost_price, p.sell_price, p.vat_rate, 
            p.is_active, COALESCE(i.qty_on_hand, 0) as stock, 
            p.created_at
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?
        WHERE p.is_active = 1
          AND (p.name_ar LIKE '%' || ? || '%' OR p.barcode = ? OR p.sku = ?)
          {}
        ORDER BY p.name_ar
        LIMIT 50",
        if category_id.is_some() { "AND p.category_id = ?" } else { "" }
    );

    let mut params: Vec<String> = vec![
        branch_id,
        query.clone(),
        query.clone(),
        query,
    ];

    if let Some(cat_id) = category_id {
        params.push(cat_id);
    }

    let products: Vec<Product> = db
        .query(&sql, params)
        .await
        .map_err(|e| e.to_string())?;

    Ok(products)
}
```

2. Register in `main.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    commands::products::get_products,
])
```

### Verification
1. Call `get_products("أرز", None, "BR1")` → returns the seeded "أرز بسمتي" product
2. Call `get_products("6281035931206", None, "BR1")` → returns the same product (barcode match)
3. Call `get_products("", None, "BR1")` → returns all 3 seeded products
4. Verify `stock` field is populated from inventory join

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_products | Phase 2 | ✅ Ready | Returns Vec<Product>, limit 50, joins inventory |
```

---

## Task 2.1.2 — `get_product_by_barcode` Command
**Status**: ⬜ | **Difficulty**: ⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Fetch a single product by exact barcode match. Must be fast (<50ms) for scanner use.

### Files to Edit
- `src-tauri/src/commands/products.rs`

### Steps

1. Append to `src-tauri/src/commands/products.rs`:

```rust
#[tauri::command]
pub async fn get_product_by_barcode(
    barcode: String,
    branch_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<Option<Product>, String> {
    let product: Option<Product> = db
        .query_one(
            "SELECT 
                p.id, p.sku, p.barcode, p.name_ar, p.name_en, 
                p.category_id, c.name_ar as category_name, 
                p.unit, p.cost_price, p.sell_price, p.vat_rate, 
                p.is_active, COALESCE(i.qty_on_hand, 0) as stock, 
                p.created_at
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?
            WHERE p.barcode = ? AND p.is_active = 1",
            [branch_id, barcode],
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(product)
}
```

2. Register in `main.rs`.

### Verification
1. Call `get_product_by_barcode("6281035931206", "BR1")` → returns "أرز بسمتي"
2. Call `get_product_by_barcode("9999999999999", "BR1")` → returns `null`
3. Time the call — should be <50ms

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_product_by_barcode | Phase 2 | ✅ Ready | Returns Option<Product>, <50ms |
```

---

## Task 2.1.3 — `create_product` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Create a new product. Auto-generate UUID, auto-generate SKU if empty, auto-create inventory row.

### Files to Edit
- `src-tauri/src/commands/products.rs`

### Steps

1. Append to `src-tauri/src/commands/products.rs`:

```rust
use crate::lib::NewProduct;
use chrono::Utc;
use uuid::Uuid;

#[tauri::command]
pub async fn create_product(
    product: NewProduct,
    branch_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<Product, String> {
    let id = format!("PRD-{}", Uuid::new_v4());
    let sku = product.sku.unwrap_or_else(|| {
        format!("SKU-{}", Utc::now().timestamp())
    });
    let vat_rate = product.vat_rate.unwrap_or(0.15);
    let unit = product.unit.unwrap_or_else(|| "piece".to_string());
    let cost_price = product.cost_price.unwrap_or(0.0);

    db.execute(
        "INSERT INTO products (id, sku, barcode, name_ar, name_en, category_id, unit, cost_price, sell_price, vat_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            &id,
            &sku,
            &product.barcode.unwrap_or_default(),
            &product.name_ar,
            &product.name_en.unwrap_or_default(),
            &product.category_id.unwrap_or_default(),
            &unit,
            &cost_price.to_string(),
            &product.sell_price.to_string(),
            &vat_rate.to_string(),
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    // Auto-create inventory row
    let inv_id = format!("INV-{}", Uuid::new_v4());
    db.execute(
        "INSERT INTO inventory (id, branch_id, product_id, qty_on_hand) VALUES (?, ?, ?, 0)",
        [&inv_id, &branch_id, &id],
    )
    .await
    .map_err(|e| e.to_string())?;

    // Audit log
    db.execute(
        "INSERT INTO audit_log (id, action, entity_type, entity_id, payload) VALUES (?, 'product_created', 'product', ?, ?)",
        [
            format!("AUD-{}", Uuid::new_v4()),
            id.clone(),
            format!("{{\"sku\":\"{}\"}}", sku),
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    // Return the created product
    let created: Product = db
        .query_one(
            "SELECT p.id, p.sku, p.barcode, p.name_ar, p.name_en, p.category_id, c.name_ar as category_name, p.unit, p.cost_price, p.sell_price, p.vat_rate, p.is_active, COALESCE(i.qty_on_hand, 0) as stock, p.created_at FROM products p LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ? WHERE p.id = ?",
            [branch_id, id],
        )
        .await
        .map_err(|e| e.to_string())?
        .ok_or("فشل إنشاء المنتج")?;

    Ok(created)
}
```

2. Register in `main.rs`.

### Verification
1. Call `create_product` with `name_ar="تفاح"`, `sell_price=10.0` → returns product with auto-generated SKU
2. Verify `products` table has the new row
3. Verify `inventory` table has a row with `qty_on_hand=0`
4. Verify `audit_log` has `product_created` entry

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| create_product | Phase 2 | ✅ Ready | Auto-generates SKU and inventory row |
```

---

## Task 2.1.4 — `update_product` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Update an existing product's fields.

### Files to Edit
- `src-tauri/src/commands/products.rs`

### Steps

1. Append to `src-tauri/src/commands/products.rs`:

```rust
#[tauri::command]
pub async fn update_product(
    id: String,
    product: NewProduct,
    branch_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<Product, String> {
    db.execute(
        "UPDATE products SET name_ar = ?, name_en = ?, barcode = ?, category_id = ?, unit = ?, cost_price = ?, sell_price = ?, vat_rate = ? WHERE id = ?",
        [
            &product.name_ar,
            &product.name_en.unwrap_or_default(),
            &product.barcode.unwrap_or_default(),
            &product.category_id.unwrap_or_default(),
            &product.unit.unwrap_or_else(|| "piece".to_string()),
            &product.cost_price.unwrap_or(0.0).to_string(),
            &product.sell_price.to_string(),
            &product.vat_rate.unwrap_or(0.15).to_string(),
            &id,
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    // Audit log
    db.execute(
        "INSERT INTO audit_log (id, action, entity_type, entity_id) VALUES (?, 'product_updated', 'product', ?)",
        [format!("AUD-{}", Uuid::new_v4()), id.clone()],
    )
    .await
    .map_err(|e| e.to_string())?;

    // Return updated product
    let updated: Product = db
        .query_one(
            "SELECT p.id, p.sku, p.barcode, p.name_ar, p.name_en, p.category_id, c.name_ar as category_name, p.unit, p.cost_price, p.sell_price, p.vat_rate, p.is_active, COALESCE(i.qty_on_hand, 0) as stock, p.created_at FROM products p LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ? WHERE p.id = ?",
            [branch_id, id],
        )
        .await
        .map_err(|e| e.to_string())?
        .ok_or("المنتج غير موجود")?;

    Ok(updated)
}
```

2. Register in `main.rs`.

### Verification
1. Update a product's price
2. Verify the change in `products` table
3. Verify `audit_log` has `product_updated` entry

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| update_product | Phase 2 | ✅ Ready | Returns updated Product |
```

---

## Task 2.1.5 — `toggle_product_active` Command
**Status**: ⬜ | **Difficulty**: ⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Soft-delete / restore a product by toggling its `is_active` flag.

### Files to Edit
- `src-tauri/src/commands/products.rs`

### Steps

1. Append to `src-tauri/src/commands/products.rs`:

```rust
#[tauri::command]
pub async fn toggle_product_active(
    id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<(), String> {
    db.execute(
        "UPDATE products SET is_active = NOT is_active WHERE id = ?",
        [&id],
    )
    .await
    .map_err(|e| e.to_string())?;

    // Audit log
    db.execute(
        "INSERT INTO audit_log (id, action, entity_type, entity_id) VALUES (?, 'product_updated', 'product', ?)",
        [format!("AUD-{}", Uuid::new_v4()), id],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
```

2. Register in `main.rs`.

### Verification
1. Toggle a product → `is_active` flips from 1 to 0
2. Toggle again → flips back to 1
3. Verify `get_products` no longer returns inactive products

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| toggle_product_active | Phase 2 | ✅ Ready | Soft delete / restore |
```

---

## Task 2.1.6 — `get_categories` + `create_category` Commands
**Status**: ⬜ | **Difficulty**: ⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
CRUD for product categories.

### Files to Edit
- `src-tauri/src/commands/products.rs`

### Steps

1. Append to `src-tauri/src/commands/products.rs`:

```rust
use crate::lib::Category;

#[tauri::command]
pub async fn get_categories(db: tauri::State<'_, TauriSql>) -> Result<Vec<Category>, String> {
    let categories: Vec<Category> = db
        .query("SELECT id, name_ar, name_en FROM categories ORDER BY name_ar", [])
        .await
        .map_err(|e| e.to_string())?;

    Ok(categories)
}

#[tauri::command]
pub async fn create_category(
    name_ar: String,
    name_en: Option<String>,
    db: tauri::State<'_, TauriSql>,
) -> Result<Category, String> {
    let id = format!("CAT-{}", Uuid::new_v4());

    db.execute(
        "INSERT INTO categories (id, name_ar, name_en) VALUES (?, ?, ?)",
        [&id, &name_ar, &name_en.unwrap_or_default()],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(Category {
        id,
        name_ar,
        name_en,
    })
}
```

2. Register both in `main.rs`.

### Verification
1. `get_categories()` → returns seeded "مواد غذائية" category
2. `create_category("منظفات", Some("Cleaning"))` → returns new category
3. `get_categories()` again → now returns 2 categories

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_categories | Phase 2 | ✅ Ready | Returns Vec<Category> |
| create_category | Phase 2 | ✅ Ready | Returns Category |
```

---

## Task 2.2.1 — `get_inventory` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes (parallel with 2.1)

### Objective
Get inventory levels for a branch, including stock value calculation.

### Files to Edit
- `src-tauri/src/commands/inventory.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/main.rs`

### Steps

1. Replace `src-tauri/src/commands/inventory.rs` with:

```rust
use crate::lib::InventoryItem;
use tauri_plugin_sql::TauriSql;

#[tauri::command]
pub async fn get_inventory(
    branch_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<Vec<InventoryItem>, String> {
    let items: Vec<InventoryItem> = db
        .query(
            "SELECT 
                i.id, i.branch_id, i.product_id, 
                p.name_ar as product_name_ar, p.sku, p.barcode,
                i.qty_on_hand, i.low_stock_threshold,
                (i.qty_on_hand * p.cost_price) as stock_value,
                (i.qty_on_hand <= i.low_stock_threshold) as is_low_stock,
                i.last_updated
            FROM inventory i
            JOIN products p ON p.id = i.product_id
            WHERE i.branch_id = ?
            ORDER BY p.name_ar",
            [branch_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(items)
}
```

2. Register in `main.rs`.

### Verification
1. Call `get_inventory("BR1")` → returns 3 items with `stock_value` calculated
2. Verify `is_low_stock` is `false` for qty=100, threshold=5

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_inventory | Phase 2 | ✅ Ready | Returns Vec<InventoryItem> with stock_value |
```

---

## Task 2.2.2 — `adjust_inventory` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Manually adjust inventory quantity. Must write to `audit_log`.

### Files to Edit
- `src-tauri/src/commands/inventory.rs`

### Steps

1. Append to `src-tauri/src/commands/inventory.rs`:

```rust
use uuid::Uuid;

#[tauri::command]
pub async fn adjust_inventory(
    branch_id: String,
    product_id: String,
    new_qty: f64,
    reason: String,
    user_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<(), String> {
    // Get old quantity
    let old_qty: Option<f64> = db
        .query_one(
            "SELECT qty_on_hand FROM inventory WHERE branch_id = ? AND product_id = ?",
            [&branch_id, &product_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    let old_qty = old_qty.unwrap_or(0.0);

    db.execute(
        "UPDATE inventory SET qty_on_hand = ?, last_updated = datetime('now') WHERE branch_id = ? AND product_id = ?",
        [&new_qty.to_string(), &branch_id, &product_id],
    )
    .await
    .map_err(|e| e.to_string())?;

    // Audit log
    db.execute(
        "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, payload) VALUES (?, ?, 'inventory_adjusted', 'inventory', ?, ?)",
        [
            format!("AUD-{}", Uuid::new_v4()),
            user_id,
            product_id.clone(),
            format!("{{\"old_qty\":{},\"new_qty\":{},\"reason\":\"{}\"}}", old_qty, new_qty, reason),
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
```

2. Register in `main.rs`.

### Verification
1. Adjust a product from 100 to 150
2. Verify `inventory` table shows new qty
3. Verify `audit_log` has `inventory_adjusted` with old/new qty and reason

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| adjust_inventory | Phase 2 | ✅ Ready | Updates qty + writes audit_log |
```

---

## Task 2.2.3 — `get_inventory_by_product` Command
**Status**: ⬜ | **Difficulty**: ⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Get inventory for a single product. Used during sale to check stock before completing transaction.

### Files to Edit
- `src-tauri/src/commands/inventory.rs`

### Steps

1. Append to `src-tauri/src/commands/inventory.rs`:

```rust
#[tauri::command]
pub async fn get_inventory_by_product(
    branch_id: String,
    product_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<Option<InventoryItem>, String> {
    let item: Option<InventoryItem> = db
        .query_one(
            "SELECT 
                i.id, i.branch_id, i.product_id, 
                p.name_ar as product_name_ar, p.sku, p.barcode,
                i.qty_on_hand, i.low_stock_threshold,
                (i.qty_on_hand * p.cost_price) as stock_value,
                (i.qty_on_hand <= i.low_stock_threshold) as is_low_stock,
                i.last_updated
            FROM inventory i
            JOIN products p ON p.id = i.product_id
            WHERE i.branch_id = ? AND i.product_id = ?",
            [branch_id, product_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(item)
}
```

2. Register in `main.rs`.

### Verification
1. Call `get_inventory_by_product("BR1", "PRD-001")` → returns inventory item
2. Call with non-existent product → returns `null`

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_inventory_by_product | Phase 2 | ✅ Ready | Returns Option<InventoryItem> |
```

---

## 🛑 MERGE POINT: MP-2 — TASK 2.1.6 COMPLETE

**This is a merge point. Sync with Dev A before proceeding.**

### What Dev A Needs From You
1. `get_products` — they can build the searchable product table
2. `get_product_by_barcode` — they can wire the barcode scanner
3. `create_product` — they can build the "Add Product" modal
4. `update_product` — they can build the "Edit Product" modal
5. `toggle_product_active` — they can add enable/disable toggle
6. `get_categories` + `create_category` — they can build category dropdown
7. `get_inventory`, `adjust_inventory` — they can build the inventory page

### After Merge
- Dev A works on Phase 2 UI (Inventory page, product CRUD)
- You proceed to Phase 3 (`phase_3.md`) — Invoice & Sales
- Dev A will start Phase 3 UI ~1 day after you

---

(End of Phase 2)
