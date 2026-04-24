use pos::{AppState, PosError};
use tauri::State;

/// Creates a backup of the database using SQLite's VACUUM INTO.
/// The backup is saved alongside the main database with a timestamped name.
/// Keeps the last 7 backups and deletes older ones.
#[tauri::command]
pub fn backup_database(state: State<AppState>) -> Result<String, PosError> {
    let conn = state.db.lock()?;

    // Get the main database path
    let db_path: String = conn
        .query_row("PRAGMA database_list", [], |row| row.get::<_, String>(2))
        .map_err(|_| PosError::InternalError)?;

    let db_dir = std::path::Path::new(&db_path)
        .parent()
        .ok_or(PosError::InternalError)?;

    let backup_dir = db_dir.join("backups");
    std::fs::create_dir_all(&backup_dir).map_err(|e| {
        log::error!(target: "pos::backup", "Failed to create backup dir: {:?}", e);
        PosError::InternalError
    })?;

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let backup_filename = format!("pos_backup_{}.db", timestamp);
    let backup_path = backup_dir.join(&backup_filename);

    conn.execute("VACUUM INTO ?1", [backup_path.to_str().unwrap_or("")])
        .map_err(|e| {
            log::error!(target: "pos::backup", "VACUUM INTO failed: {:?}", e);
            PosError::BusinessRule("فشل إنشاء النسخة الاحتياطية".to_string())
        })?;

    log::info!(target: "pos::backup", "Database backed up to {}", backup_filename);

    // Cleanup: keep only the last 7 backups
    if let Ok(entries) = std::fs::read_dir(&backup_dir) {
        let mut backups: Vec<std::path::PathBuf> = entries
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.file_name()
                    .to_str()
                    .map(|n| n.starts_with("pos_backup_") && n.ends_with(".db"))
                    .unwrap_or(false)
            })
            .map(|e| e.path())
            .collect();

        backups.sort();
        if backups.len() > 7 {
            let to_delete = backups.len() - 7;
            for path in backups.iter().take(to_delete) {
                if let Err(e) = std::fs::remove_file(path) {
                    log::warn!(target: "pos::backup", "Failed to delete old backup {:?}: {:?}", path, e);
                }
            }
            log::info!(target: "pos::backup", "Cleaned up {} old backups", to_delete);
        }
    }

    Ok(backup_filename)
}

/// Called from the background task in main.rs
pub fn run_daily_backup(state: &AppState) {
    let conn = match state.db.lock() {
        Ok(c) => c,
        Err(_) => {
            log::error!(target: "pos::backup", "Failed to acquire DB lock for backup");
            return;
        }
    };

    let db_path: String = match conn.query_row("PRAGMA database_list", [], |row| row.get::<_, String>(2)) {
        Ok(p) => p,
        Err(_) => return,
    };

    let db_dir = match std::path::Path::new(&db_path).parent() {
        Some(d) => d.to_path_buf(),
        None => return,
    };

    let backup_dir = db_dir.join("backups");
    if std::fs::create_dir_all(&backup_dir).is_err() {
        return;
    }

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let backup_path = backup_dir.join(format!("pos_backup_{}.db", timestamp));

    match conn.execute("VACUUM INTO ?1", [backup_path.to_str().unwrap_or("")]) {
        Ok(_) => log::info!(target: "pos::backup", "Daily backup completed: {:?}", backup_path),
        Err(e) => log::error!(target: "pos::backup", "Daily backup failed: {:?}", e),
    }
}
