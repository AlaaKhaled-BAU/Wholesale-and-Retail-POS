use crate::lib::{CashierSession, SessionToken};
use crate::AppState;
use bcrypt::verify;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn login_user(pin: String, state: State<AppState>) -> Result<SessionToken, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, branch_id, name_ar, role, pin_hash FROM users WHERE is_active = 1")
        .map_err(|e| e.to_string())?;

    let users = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for user in users {
        let (id, branch_id, name_ar, role, pin_hash) = user.map_err(|e| e.to_string())?;
        if verify(&pin, &pin_hash).map_err(|e| e.to_string())? {
            return Ok(SessionToken {
                user_id: id,
                name_ar,
                role,
                branch_id,
                session_id: String::new(), // filled by open_cashier_session
            });
        }
    }

    Err("رقم التعريف غير صحيح".to_string())
}

#[tauri::command]
pub fn open_cashier_session(
    user_id: String,
    opening_float: f64,
    state: State<AppState>,
) -> Result<String, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Check for existing open session
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM cashier_sessions WHERE user_id = ?1 AND status = 'open'",
            [&user_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    if let Some(session_id) = existing {
        return Ok(session_id);
    }

    // Get user's branch
    let branch_id: String = conn
        .query_row(
            "SELECT branch_id FROM users WHERE id = ?1",
            [&user_id],
            |row| row.get(0),
        )
        .map_err(|_| "المستخدم غير موجود".to_string())?;

    let session_id = format!("SES-{}", Uuid::new_v4());

    conn.execute(
        "INSERT INTO cashier_sessions (id, user_id, branch_id, opened_at, opening_float, status) VALUES (?1, ?2, ?3, datetime('now'), ?4, 'open')",
        params![&session_id, &user_id, &branch_id, &opening_float],
    )
    .map_err(|e| e.to_string())?;

    // Write to audit_log
    conn.execute(
        "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, payload) VALUES (?1, ?2, 'session_opened', 'cashier_session', ?3, ?4)",
        params![
            format!("AUD-{}", Uuid::new_v4()),
            &user_id,
            &session_id,
            format!("{{\"opening_float\":{}}}", opening_float),
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(session_id)
}

#[tauri::command]
pub fn close_cashier_session(
    session_id: String,
    closing_cash: f64,
    user_id: String,
    state: State<AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE cashier_sessions SET closed_at = datetime('now'), closing_cash = ?1, status = 'closed' WHERE id = ?2",
        params![&closing_cash, &session_id],
    )
    .map_err(|e| e.to_string())?;

    // Write to audit_log
    conn.execute(
        "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, payload) VALUES (?1, ?2, 'session_closed', 'cashier_session', ?3, ?4)",
        params![
            format!("AUD-{}", Uuid::new_v4()),
            &user_id,
            &session_id,
            format!("{{\"closing_cash\":{}}}", closing_cash),
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_current_session(
    user_id: String,
    state: State<AppState>,
) -> Result<Option<CashierSession>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let session = conn
        .query_row(
            "SELECT id, user_id, branch_id, opened_at, closed_at, opening_float, closing_cash, status FROM cashier_sessions WHERE user_id = ?1 AND status = 'open'",
            [&user_id],
            |row| {
                Ok(CashierSession {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    branch_id: row.get(2)?,
                    opened_at: row.get(3)?,
                    closed_at: row.get(4)?,
                    opening_float: row.get(5)?,
                    closing_cash: row.get(6)?,
                    status: row.get(7)?,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(session)
}

#[tauri::command]
pub fn logout_user(state: State<AppState>) -> Result<bool, String> {
    // Clear current session from AppState
    if let Ok(mut guard) = state.current_session.lock() {
        *guard = None;
    }
    Ok(true)
}
