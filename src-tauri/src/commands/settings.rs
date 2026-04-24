use pos::AppSettings;
use pos::AppState;
use pos::auth::{require_role, Role};
use pos::error::PosError;
use rusqlite::OptionalExtension;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub fn get_setting(key: String, state: State<AppState>) -> Result<Option<String>, PosError> {
    let _token = require_role(&state, &[Role::Cashier])?;
    let conn = state.db.lock()?;

    let value: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            [&key],
            |row| row.get(0),
        )
        .optional()
        ?;

    Ok(value)
}

#[tauri::command]
pub fn set_setting(
    key: String,
    value: String,
    state: State<AppState>,
) -> Result<(), PosError> {
    let _token = require_role(&state, &[Role::Admin])?;
    let conn = state.db.lock()?;

    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now')) \
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
        params![&key, &value],
    )
    ?;

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
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        ?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        ?;

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
    let _token = require_role(&state, &[Role::Cashier])?;
    let conn = state.db.lock()?;
    get_all_settings_inner(&conn)
}

#[tauri::command]
pub async fn seed_demo_data(state: State<'_, AppState>) -> Result<(), PosError> {
    #[cfg(debug_assertions)]
    {
        let _token = require_role(&state, &[Role::Admin])?;
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

// ============================================================
// Database Backup
// ============================================================
#[tauri::command]
pub fn backup_database(state: State<AppState>) -> Result<String, PosError> {
    let _token = require_role(&state, &[Role::Manager])?;
    let conn = state.db.lock()?;

    let backup_name = format!(
        "pos_backup_{}.db",
        chrono::Local::now().format("%Y%m%d_%H%M%S")
    );

    let app_dir = dirs::data_dir()
        .ok_or("Could not determine data dir")?
        .join("com.wholesale.pos.app");
    let backup_path = app_dir.join(&backup_name);

    conn.execute(
        "VACUUM INTO ?1",
        params![backup_path.to_str().unwrap_or(&backup_name)],
    )
    ?;

    Ok(backup_path.to_string_lossy().to_string())
}

// ============================================================
// First-run setup command
// ============================================================
#[tauri::command]
pub fn is_first_run(state: State<AppState>) -> Result<bool, PosError> {
    let conn = state.db.lock()?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .unwrap_or(0);
    Ok(count == 0)
}

#[derive(serde::Deserialize)]
pub struct SetupPayload {
    pub branch_name_ar: String,
    pub vat_number: String,
    pub cr_number: String,
    pub address: String,
    pub admin_name: String,
    pub admin_pin: String,
    #[allow(dead_code)]
    pub branch_prefix: String,
}

#[tauri::command]
pub fn complete_setup(
    payload: SetupPayload,
    state: State<AppState>,
) -> Result<(), PosError> {
    let conn = state.db.lock()?;

    let branch_id = "BR1".to_string();

    // Insert branch
    conn.execute(
        "INSERT INTO branches (id, name_ar, vat_number, cr_number, address) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![&branch_id, &payload.branch_name_ar, &payload.vat_number, &payload.cr_number, &payload.address],
    )
    ?;

    // Create admin user
    let admin_id = "USR-001".to_string();
    let pin_hash = bcrypt::hash(&payload.admin_pin, bcrypt::DEFAULT_COST)
        ?;
    conn.execute(
        "INSERT INTO users (id, branch_id, name_ar, role, pin_hash) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![&admin_id, &branch_id, &payload.admin_name, "admin", &pin_hash],
    )
    ?;

    // Insert default settings
    let defaults = [
        ("vat_rate", "0.15"),
        ("printer_port", ""),
        ("printer_type", "usb"),
        ("branch_name_ar", &payload.branch_name_ar),
        ("invoice_note", "شكراً لزيارتكم — يُرجى الاحتفاظ بالفاتورة"),
        ("numerals", "western"),
        ("auto_lock_minutes", "5"),
        ("setup_complete", "true"),
    ];

    for (key, value) in &defaults {
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
            params![*key, *value],
        )
        ?;
    }

    // Seed one default category
    conn.execute(
        "INSERT INTO categories (id, name_ar) VALUES (?1, ?2)",
        params!["CAT-001", "عام"],
    )
    ?;

    Ok(())
}
