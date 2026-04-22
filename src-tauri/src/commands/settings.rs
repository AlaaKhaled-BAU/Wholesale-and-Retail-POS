use crate::lib::AppSettings;
use crate::AppState;
use rusqlite::params;
use tauri::State;

// ============================================================
// Task 7.1.1 — get_setting + set_setting
// ============================================================
#[tauri::command]
pub fn get_setting(key: String, state: State<AppState>) -> Result<Option<String>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let value: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            [&key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(value)
}

#[tauri::command]
pub fn set_setting(
    key: String,
    value: String,
    state: State<AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now')) \
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
        params![&key, &value],
    )
    .map_err(|e| e.to_string())?;

    // Update cached settings in AppState if present
    if let Ok(mut cached) = state.settings.lock() {
        if let Some(ref mut settings) = *cached {
            match key.as_str() {
                "vat_rate" => settings.vat_rate = value,
                "printer_port" => settings.printer_port = value,
                "printer_type" => settings.printer_type = value,
                "branch_name_ar" => settings.branch_name_ar = value,
                "invoice_note" => settings.invoice_note = value,
                "numerals" => settings.numerals = value,
                "auto_lock_minutes" => settings.auto_lock_minutes = value,
                _ => {}
            }
        }
    }

    Ok(())
}

// ============================================================
// Task 7.1.2 — get_all_settings
// ============================================================
pub fn get_all_settings_inner(conn: &rusqlite::Connection) -> Result<AppSettings, String> {
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;

    let mut map = std::collections::HashMap::new();
    for row in rows {
        let (k, v) = row.map_err(|e| e.to_string())?;
        map.insert(k, v);
    }

    Ok(AppSettings {
        vat_rate: map.get("vat_rate").cloned().unwrap_or_else(|| "0.15".to_string()),
        printer_port: map.get("printer_port").cloned().unwrap_or_default(),
        printer_type: map.get("printer_type").cloned().unwrap_or_else(|| "usb".to_string()),
        branch_name_ar: map
            .get("branch_name_ar")
            .cloned()
            .unwrap_or_else(|| "الفرع الرئيسي".to_string()),
        invoice_note: map
            .get("invoice_note")
            .cloned()
            .unwrap_or_else(|| "شكراً لزيارتكم — يُرجى الاحتفاظ بالفاتورة".to_string()),
        numerals: map.get("numerals").cloned().unwrap_or_else(|| "western".to_string()),
        auto_lock_minutes: map
            .get("auto_lock_minutes")
            .cloned()
            .unwrap_or_else(|| "5".to_string()),
    })
}

#[tauri::command]
pub fn get_all_settings(state: State<AppState>) -> Result<AppSettings, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_all_settings_inner(&conn)
}

// ============================================================
// Task 8.1.2 — seed_demo_data (debug builds only)
// ============================================================
#[tauri::command]
pub async fn seed_demo_data(state: State<'_, AppState>) -> Result<(), String> {
    #[cfg(debug_assertions)]
    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        let sql = include_str!("../db/seed_demo.sql");
        conn.execute_batch(sql).map_err(|e| e.to_string())?;
        Ok(())
    }

    #[cfg(not(debug_assertions))]
    {
        Err("غير مسموح في الإصدار النهائي".to_string())
    }
}
