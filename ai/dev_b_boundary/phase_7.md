# Phase 7 — Settings (3–4 days)
> **Start: After Phase 3 (can be started during Phase 6 ZATCA) | Parallel with Dev A**

---

## Phase 7 Overview

This phase implements settings persistence: store info, printer config, users, VAT rate. Can be done in parallel with Phase 6.

**Merge Point: MP-7** — Task 7.1.3 complete. Dev A wires Settings UI.

---

## Task 7.1.1 — `get_setting` + `set_setting` Commands
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Read and write key-value settings with UPSERT logic.

### Files to Edit
- `src-tauri/src/commands/settings.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/main.rs`

### Steps

1. Replace `src-tauri/src/commands/settings.rs` with:

```rust
use tauri_plugin_sql::TauriSql;

#[tauri::command]
pub async fn get_setting(
    key: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<Option<String>, String> {
    let value: Option<String> = db
        .query_one("SELECT value FROM settings WHERE key = ?", [&key])
        .await
        .map_err(|e| e.to_string())?;

    Ok(value)
}

#[tauri::command]
pub async fn set_setting(
    key: String,
    value: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<(), String> {
    db.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
        [&key, &value],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
```

2. Register in `main.rs`.

### Verification
1. `set_setting("vat_rate", "0.15")` → succeeds
2. `get_setting("vat_rate")` → returns "0.15"
3. `set_setting("vat_rate", "0.05")` → updates to "0.05"
4. `get_setting("missing")` → returns `null`

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_setting | Phase 7 | ✅ Ready | Returns Option<String> |
| set_setting | Phase 7 | ✅ Ready | UPSERT with timestamp |
```

---

## Task 7.1.2 — `get_all_settings` + Defaults Seed
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Load all settings at once and seed defaults on first launch.

### Files to Edit
- `src-tauri/src/commands/settings.rs`
- `src-tauri/src/db/mod.rs` (seed defaults)

### Steps

1. Append to `src-tauri/src/commands/settings.rs`:

```rust
use crate::lib::AppSettings;

#[tauri::command]
pub async fn get_all_settings(
    db: tauri::State<'_, TauriSql>,
) -> Result<AppSettings, String> {
    let settings: Vec<(String, String)> = db
        .query("SELECT key, value FROM settings", [])
        .await
        .map_err(|e| e.to_string())?;

    let mut map = std::collections::HashMap::new();
    for (k, v) in settings {
        map.insert(k, v);
    }

    Ok(AppSettings {
        vat_rate: map.get("vat_rate").cloned().unwrap_or_else(|| "0.15".to_string()),
        printer_port: map.get("printer_port").cloned().unwrap_or_default(),
        printer_type: map.get("printer_type").cloned().unwrap_or_else(|| "usb".to_string()),
        branch_name_ar: map.get("branch_name_ar").cloned().unwrap_or_else(|| "الفرع الرئيسي".to_string()),
        invoice_note: map.get("invoice_note").cloned().unwrap_or_else(|| "شكراً لزيارتكم — يُرجى الاحتفاظ بالفاتورة".to_string()),
        numerals: map.get("numerals").cloned().unwrap_or_else(|| "western".to_string()),
        auto_lock_minutes: map.get("auto_lock_minutes").cloned().unwrap_or_else(|| "5".to_string()),
    })
}
```

2. Add default seeding to `src-tauri/src/db/mod.rs` in the `seed_if_empty` function:

```rust
// Seed default settings
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
    db.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
        [*key, *value],
    )
    .await
    .map_err(|e| e.to_string())?;
}
```

3. Register `get_all_settings` in `main.rs`.

### Verification
1. Delete `pos.db` to simulate fresh install
2. Run app → defaults seeded
3. Call `get_all_settings()` → returns AppSettings with all defaults

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| get_all_settings | Phase 7 | ✅ Ready | Returns AppSettings with defaults |
```

---

## Task 7.1.3 — Load Settings into `AppState` on Startup
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Cache settings in Tauri managed state for fast access without DB queries.

### Files to Edit
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`

### Steps

1. In `src-tauri/src/lib.rs`, add to `AppState`:

```rust
pub struct AppState {
    pub current_session: std::sync::Mutex<Option<CashierSession>>,
    pub settings: std::sync::Mutex<Option<AppSettings>>,
}
```

2. In `src-tauri/src/main.rs`, update setup to load settings:

```rust
.setup(|app| {
    let handle = app.handle();
    tauri::async_runtime::spawn(async move {
        let db = handle.state::<TauriSql>();
        
        // Seed if empty
        if let Err(e) = db::seed_if_empty(&db).await {
            eprintln!("Seed error: {}", e);
        }
        
        // Load settings into state
        let settings = commands::settings::get_all_settings(db).await.ok();
        if let Some(state) = handle.try_state::<AppState>() {
            if let Ok(mut guard) = state.settings.lock() {
                *guard = settings;
            }
        }
    });
    Ok(())
})
```

### Verification
1. Start app
2. Access `app_state.settings` in any command → returns cached settings

---

## 🛑 MERGE POINT: MP-7 — TASK 7.1.3 COMPLETE

**This is a merge point. Sync with Dev A before proceeding.**

### What Dev A Needs From You
1. `get_all_settings` — they can load settings on app start
2. `set_setting` — they can save changes from Settings UI
3. Default values confirmed:
   - VAT rate: 15%
   - Printer type: USB
   - Branch name: "الفرع الرئيسي"
   - Auto-lock: 5 minutes

### After Merge
- Dev A completes Settings UI
- You proceed to Phase 8 (`phase_8.md`) — Demo Polish

---

(End of Phase 7)
