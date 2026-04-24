use pos::{CashierSession, SessionToken};
use pos::AppState;
use pos::auth::{require_role, require_session, Role};
use pos::error::PosError;
use rusqlite::OptionalExtension;
use bcrypt::verify;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn login_user(pin: String, state: State<AppState>) -> Result<SessionToken, PosError> {
    let conn = state.db.lock()?;

    let mut stmt = conn
        .prepare("SELECT id, branch_id, name_ar, role, pin_hash FROM users WHERE is_active = 1")?;

    let users = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        })?;

    for user in users {
        let (id, branch_id, name_ar, role, pin_hash) = user?;
        
        // Check rate limiter before bcrypt verification
        state.rate_limiter.check(&id)?;

        if verify(pin.trim(), &pin_hash).map_err(|_| PosError::InvalidCredentials("خطأ في التحقق من الرمز".to_string()))? {
            // Success — clear failed attempts
            state.rate_limiter.record_success(&id);

            // Find existing open session for this user
            let session = conn
                .query_row(
                    "SELECT id, user_id, branch_id, opened_at, closed_at, opening_float, closing_cash, status FROM cashier_sessions WHERE user_id = ?1 AND status = 'open'",
                    [&id],
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
                .optional()?;

            let session_id = session.as_ref().map(|s| s.id.clone()).unwrap_or_default();

            let token = SessionToken {
                user_id: id.clone(),
                name_ar: name_ar.clone(),
                role: role.clone(),
                branch_id: branch_id.clone(),
                session_id: session_id.clone(),
            };

            // Store session token in AppState
            if let Ok(mut guard) = state.current_session.lock() {
                *guard = Some(token.clone());
            }

            return Ok(token);
        } else {
            // Failed attempt
            state.rate_limiter.record_failure(&id);
        }
    }

    // Get remaining attempts from the first user (they are all incremented together)
    // If no users, fallback to 0
    let remaining = conn.query_row("SELECT id FROM users WHERE is_active = 1 LIMIT 1", [], |row| {
        let id: String = row.get(0)?;
        Ok(state.rate_limiter.get_remaining_attempts(&id))
    }).unwrap_or(0);

    Err(PosError::InvalidCredentials(format!(
        "الرمز السري غير صحيح. محاولات متبقية: {}",
        remaining
    )))
}

#[tauri::command]
pub fn open_cashier_session(
    user_id: String,
    opening_float: f64,
    state: State<AppState>,
) -> Result<String, PosError> {
    let conn = state.db.lock()?;

    // Check for existing open session
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM cashier_sessions WHERE user_id = ?1 AND status = 'open'",
            [&user_id],
            |row| row.get(0),
        )
        .optional()?;

    if let Some(session_id) = existing {
        // Get user info for session token
        let (name_ar, role, branch_id): (String, String, String) = conn
            .query_row(
                "SELECT name_ar, role, branch_id FROM users WHERE id = ?1",
                [&user_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|_| PosError::NotFound("المستخدم غير موجود".to_string()))?;

        let token = SessionToken {
            user_id: user_id.clone(),
            name_ar,
            role,
            branch_id,
            session_id: session_id.clone(),
        };
        if let Ok(mut guard) = state.current_session.lock() {
            *guard = Some(token);
        }
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
    )?;

    // Write to audit_log
    conn.execute(
        "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, payload) VALUES (?1, ?2, 'session_opened', 'cashier_session', ?3, ?4)",
        params![
            format!("AUD-{}", Uuid::new_v4()),
            &user_id,
            &session_id,
            format!("{{\"opening_float\":{}}}", opening_float),
        ],
    )?;

    // Get user info for session token
    let (name_ar, role): (String, String) = conn
        .query_row(
            "SELECT name_ar, role FROM users WHERE id = ?1",
            [&user_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| PosError::NotFound("المستخدم غير موجود".to_string()))?;

    let token = SessionToken {
        user_id: user_id.clone(),
        name_ar,
        role,
        branch_id: branch_id.clone(),
        session_id: session_id.clone(),
    };
    if let Ok(mut guard) = state.current_session.lock() {
        *guard = Some(token);
    }

    Ok(session_id)
}

#[tauri::command]
pub fn close_cashier_session(
    session_id: String,
    closing_cash: f64,
    user_id: String,
    state: State<AppState>,
) -> Result<(), PosError> {
    // Validate that the caller owns this session
    let current = require_session(&state)?;
    if current.user_id != user_id {
        return Err(PosError::Unauthorized);
    }

    let conn = state.db.lock()?;

    // Verify the session belongs to this user before closing
    let owner: Option<String> = conn
        .query_row(
            "SELECT user_id FROM cashier_sessions WHERE id = ?1 AND status = 'open'",
            [&session_id],
            |row| row.get(0),
        )
        .optional()?;

    match owner {
        Some(ref uid) if uid == &user_id => {}
        Some(_) => return Err(PosError::BusinessRule("لا يمكن إغلاق مناوبة مستخدم آخر".to_string())),
        None => return Err(PosError::NotFound("المناوبة غير موجودة أو مغلقة بالفعل".to_string())),
    }

    conn.execute(
        "UPDATE cashier_sessions SET closed_at = datetime('now'), closing_cash = ?1, status = 'closed' WHERE id = ?2",
        params![&closing_cash, &session_id],
    )?;

    // Write to audit_log
    conn.execute(
        "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, payload) VALUES (?1, ?2, 'session_closed', 'cashier_session', ?3, ?4)",
        params![
            format!("AUD-{}", Uuid::new_v4()),
            &user_id,
            &session_id,
            format!("{{\"closing_cash\":{}}}", closing_cash),
        ],
    )?;

    // Clear current session from AppState
    if let Ok(mut guard) = state.current_session.lock() {
        *guard = None;
    }

    Ok(())
}

#[tauri::command]
pub fn get_current_session(
    user_id: String,
    state: State<AppState>,
) -> Result<Option<CashierSession>, PosError> {
    // Validate session ownership
    let current = require_session(&state)?;
    if current.user_id != user_id {
        return Err(PosError::Unauthorized);
    }

    let conn = state.db.lock()?;

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
        .optional()?;

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

// ============================================================
// Admin-only commands
// ============================================================

#[tauri::command]
pub fn get_users(state: State<AppState>) -> Result<Vec<pos::User>, PosError> {
    let _token = require_role(&state, &[Role::Admin, Role::Manager])?;
    let conn = state.db.lock()?;
    let mut stmt = conn.prepare("SELECT id, branch_id, name_ar, role, is_active, created_at FROM users WHERE is_active = 1")?;
    let users = stmt.query_map([], |row| {
        Ok(pos::User {
            id: row.get(0)?,
            branch_id: row.get(1)?,
            name_ar: row.get(2)?,
            role: row.get(3)?,
            is_active: row.get::<_, i32>(4)? == 1,
            created_at: row.get(5)?,
        })
    })?.collect::<Result<Vec<_>, _>>()?;
    Ok(users)
}

#[tauri::command]
pub fn delete_user(id: String, state: State<AppState>) -> Result<(), PosError> {
    let _token = require_role(&state, &[Role::Admin])?;
    let conn = state.db.lock()?;
    conn.execute("UPDATE users SET is_active = 0 WHERE id = ?1", params![&id])?;
    Ok(())
}

#[tauri::command]
pub fn create_user(
    name_ar: String,
    role: String,
    pin: String,
    branch_id: String,
    state: State<AppState>,
) -> Result<pos::User, PosError> {
    let _token = require_role(&state, &[Role::Admin])?;

    let conn = state.db.lock()?;

    let id = format!("USR-{}", Uuid::new_v4());
    let pin_hash = bcrypt::hash(pin.trim(), bcrypt::DEFAULT_COST)
        .map_err(|_| PosError::InternalError)?;

    conn.execute(
        "INSERT INTO users (id, branch_id, name_ar, role, pin_hash) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![&id, &branch_id, &name_ar, &role, &pin_hash],
    )?;

    Ok(pos::User {
        id,
        branch_id,
        name_ar,
        role,
        is_active: true,
        created_at: chrono::Local::now().to_rfc3339(),
    })
}
