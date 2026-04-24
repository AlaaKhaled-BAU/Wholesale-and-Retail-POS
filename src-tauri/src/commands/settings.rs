use pos::{AppSettings, PosError};
use pos::AppState;
use rusqlite::OptionalExtension;
use rusqlite::params;
use tauri::State;
use bcrypt::{hash, DEFAULT_COST};
use uuid::Uuid;

#[tauri::command]
pub fn get_setting(key: String, state: State<AppState>) -> Result<Option<String>, PosError> {
    let conn = state.db.lock()?;
    let value: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            [&key],
            |row| row.get(0),
        )
        .optional()?;
    Ok(value)
}

#[tauri::command]
pub fn set_setting(
    key: String,
    value: String,
    state: State<AppState>,
) -> Result<(), PosError> {
    let conn = state.db.lock()?;
    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now')) \
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
        params![&key, &value],
    )?;
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

pub fn get_all_settings_inner(conn: &rusqlite::Connection) -> Result<AppSettings, PosError> {
    let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;
    let mut map = std::collections::HashMap::new();
    for row in rows {
        let (k, v) = row?;
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
pub fn get_all_settings(state: State<AppState>) -> Result<AppSettings, PosError> {
    let conn = state.db.lock()?;
    get_all_settings_inner(&conn)
}

#[tauri::command]
pub async fn seed_demo_data(state: State<'_, AppState>) -> Result<(), PosError> {
    #[cfg(debug_assertions)]
    {
        let conn = state.db.lock()?;
        let sql = include_str!("../db/seed_demo.sql");
        conn.execute_batch(sql)?;
        Ok(())
    }
    #[cfg(not(debug_assertions))]
    {
        Err(PosError::BusinessRule("غير مسموح في الإصدار النهائي".to_string()))
    }
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupPayload {
    branch_name_ar: String,
    vat_number: Option<String>,
    cr_number: Option<String>,
    address: Option<String>,
    admin_name: String,
    admin_pin: String,
    #[allow(dead_code)]
    branch_prefix: String,
}

#[tauri::command]
pub fn complete_setup(
    payload: SetupPayload,
    state: State<AppState>,
) -> Result<(), PosError> {
    let conn = state.db.lock()?;
    let already_setup: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'setup_complete'",
            [],
            |row| row.get(0),
        )
        .optional()?;
    if already_setup.is_some() {
        return Err(PosError::BusinessRule("النظام sudah diatur".to_string()));
    }
    let branch_id = format!("BR-{}", Uuid::new_v4());
    conn.execute(
        "INSERT INTO branches (id, name_ar, vat_number, cr_number, address) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![&branch_id, &payload.branch_name_ar, &payload.vat_number, &payload.cr_number, &payload.address],
    )?;
    let pin_hash = hash(&payload.admin_pin, DEFAULT_COST)
        .map_err(|_| PosError::InternalError)?;
    let user_id = format!("USR-{}", Uuid::new_v4());
    conn.execute(
        "INSERT INTO users (id, branch_id, name_ar, role, pin_hash, is_active) VALUES (?1, ?2, ?3, 'admin', ?4, 1)",
        params![&user_id, &branch_id, &payload.admin_name, &pin_hash],
    )?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('setup_complete', 'true')",
        [],
    )?;
    let default_settings = [
        ("vat_rate", "0.15"),
        ("printer_type", "usb"),
        ("branch_name_ar", &payload.branch_name_ar),
        ("invoice_note", "شكراً لزيارتكم — يُرجى الاحتفاظ بالفاتورة"),
        ("numerals", "western"),
        ("auto_lock_minutes", "5"),
    ];
    for (key, value) in default_settings {
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
    }
    if let Ok(mut cached) = state.settings.lock() {
        *cached = get_all_settings_inner(&conn).ok();
    }
    log::info!(target: "pos::setup", "First-time setup completed for branch={}", payload.branch_name_ar);
    Ok(())
}