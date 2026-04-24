use pos::{CashierSession, SessionToken};
use pos::AppState;
use pos::error::PosError;
use pos::auth::RateLimiter;
use rusqlite::OptionalExtension;
use bcrypt::verify;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn login_user(pin: String, state: State<AppState>) -> Result<SessionToken, PosError> {
    let rate_limiter: &RateLimiter = &state.rate_limiter;
    let conn = state.db.lock().map_err(|_e| PosError::InternalError)?;

    let mut stmt = conn
        .prepare("SELECT id, branch_id, name_ar, role, pin_hash FROM users WHERE is_active = 1")
        .map_err(|_e| PosError::InternalError)?;

    let users: Vec<(String, String, String, String, String)> = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|_e| PosError::InternalError)?
        .filter_map(|r| r.ok())
        .collect();

    let mut matched_user: Option<(String, String, String, String)> = None;

    for (id, branch_id, name_ar, role, pin_hash) in &users {
        if let Err(e) = rate_limiter.check(id) {
            if matches!(e, PosError::AccountLocked(_)) {
                return Err(e);
            }
        }

        if verify(pin.trim(), pin_hash).map_err(|_e| PosError::InternalError)? {
            matched_user = Some((id.clone(), branch_id.clone(), name_ar.clone(), role.clone()));
            break;
        }
    }

    match matched_user {
        Some((id, branch_id, name_ar, role)) => {
            rate_limiter.record_success(&id);
            Ok(SessionToken {
                user_id: id,
                name_ar,
                role,
                branch_id,
                session_id: String::new(),
            })
        }
        None => {
            for (id, _, _, _, _) in &users {
                rate_limiter.record_failure(id);
            }
            Err(PosError::InvalidCredentials("رقم التعريف غير صحيح".to_string()))
        }
    }
}

#[tauri::command]
pub fn open_cashier_session(
    user_id: String,
    opening_float: f64,
    state: State<AppState>,
) -> Result<String, PosError> {
    let conn = state.db.lock().map_err(|_| PosError::InternalError)?;

    // Check for existing open session
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM cashier_sessions WHERE user_id = ?1 AND status = 'open'",
            [&user_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|_| PosError::InternalError)?;

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
        .map_err(|_| PosError::NotFound("المستخدم غير موجود".to_string()))?;

    let session_id = format!("SES-{}", Uuid::new_v4());

    conn.execute(
        "INSERT INTO cashier_sessions (id, user_id, branch_id, opened_at, opening_float, status) VALUES (?1, ?2, ?3, datetime('now'), ?4, 'open')",
        params![&session_id, &user_id, &branch_id, &opening_float],
    )
    .map_err(|_| PosError::InternalError)?;

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
    .map_err(|_| PosError::InternalError)?;

    Ok(session_id)
}

#[tauri::command]
pub fn close_cashier_session(
    session_id: String,
    closing_cash: f64,
    user_id: String,
    state: State<AppState>,
) -> Result<(), PosError> {
    let conn = state.db.lock().map_err(|_| PosError::InternalError)?;

    conn.execute(
        "UPDATE cashier_sessions SET closed_at = datetime('now'), closing_cash = ?1, status = 'closed' WHERE id = ?2",
        params![&closing_cash, &session_id],
    )
    .map_err(|_| PosError::InternalError)?;

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
    .map_err(|_| PosError::InternalError)?;

    Ok(())
}

#[tauri::command]
pub fn get_current_session(
    user_id: String,
    state: State<AppState>,
) -> Result<Option<CashierSession>, PosError> {
    let conn = state.db.lock().map_err(|_| PosError::InternalError)?;

    let session = conn
        .query_row(
            "SELECT cs.id, cs.user_id, cs.branch_id, u.name_ar, u.role, cs.opened_at, cs.closed_at, cs.opening_float, cs.closing_cash, cs.status \
             FROM cashier_sessions cs JOIN users u ON cs.user_id = u.id \
             WHERE cs.user_id = ?1 AND cs.status = 'open'",
            [&user_id],
            |row| {
                Ok(CashierSession {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    branch_id: row.get(2)?,
                    user_name_ar: row.get(3)?,
                    role: row.get(4)?,
                    opened_at: row.get(5)?,
                    closed_at: row.get(6)?,
                    opening_float: row.get(7)?,
                    closing_cash: row.get(8)?,
                    status: row.get(9)?,
                })
            },
        )
        .optional()
        .map_err(|_| PosError::InternalError)?;

    Ok(session)
}

#[tauri::command]
pub fn logout_user(state: State<AppState>) -> Result<bool, PosError> {
    // Clear current session from AppState
    if let Ok(mut guard) = state.current_session.lock() {
        *guard = None;
    }
    Ok(true)
}
