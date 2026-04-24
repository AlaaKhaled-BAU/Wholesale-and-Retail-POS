use crate::{AppState, SessionToken};
use crate::error::PosError;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::State;

// ============================================================
// RBAC Middleware
// ============================================================

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Role {
    Admin,
    Manager,
    Cashier,
}

pub fn require_role(
    state: &State<AppState>,
    required: &[Role],
) -> Result<SessionToken, PosError> {
    let session = state
        .current_session
        .lock()
        .map_err(|_| PosError::InternalError)?;

    let session = session
        .as_ref()
        .ok_or(PosError::SessionExpired)?;

    let role_str = &session.role;
    let has_role = required.iter().any(|r| match r {
        Role::Admin => role_str == "admin",
        Role::Manager => role_str == "manager" || role_str == "admin",
        Role::Cashier => {
            role_str == "cashier" || role_str == "manager" || role_str == "admin"
        }
    });

    if !has_role {
        return Err(PosError::Unauthorized);
    }

    Ok(session.clone())
}

pub fn require_session(state: &State<AppState>) -> Result<SessionToken, PosError> {
    let session = state
        .current_session
        .lock()
        .map_err(|_| PosError::InternalError)?;

    let session = session
        .as_ref()
        .ok_or(PosError::SessionExpired)?;

    Ok(session.clone())
}

pub fn require_session_or_user_id(
    state: &State<AppState>,
    user_id: &str,
) -> Result<SessionToken, PosError> {
    let token = require_session(state)?;
    if token.user_id != user_id {
        return Err(PosError::Unauthorized);
    }
    Ok(token)
}

// ============================================================
// Rate Limiter for PIN Login
// ============================================================

pub struct LoginAttempts {
    attempts: u32,
    last_attempt: Instant,
    locked_until: Option<Instant>,
}

pub struct RateLimiter {
    store: Mutex<HashMap<String, LoginAttempts>>,
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

impl RateLimiter {
    pub fn new() -> Self {
        Self {
            store: Mutex::new(HashMap::new()),
        }
    }

    pub fn check(&self, user_id: &str) -> Result<(), PosError> {
        let mut store = self.store.lock().map_err(|_| PosError::InternalError)?;
        let entry = store.entry(user_id.to_string()).or_insert(LoginAttempts {
            attempts: 0,
            last_attempt: Instant::now(),
            locked_until: None,
        });

        if let Some(locked) = entry.locked_until {
            if Instant::now() < locked {
                let remaining_secs = locked.saturating_duration_since(Instant::now()).as_secs();
                let remaining_minutes = remaining_secs / 60;
                let remaining_seconds = remaining_secs % 60;
                return Err(PosError::AccountLocked(format!(
                    "الحساب مقفل. يُرجى المحاولة بعد {} دقيقة و {} ثانية",
                    remaining_minutes, remaining_seconds
                )));
            }
            entry.locked_until = None;
            entry.attempts = 0;
        }

        if entry.attempts >= 5 {
            let lock_duration = Duration::from_secs(300); // 5 minutes
            entry.locked_until = Some(Instant::now() + lock_duration);
            return Err(PosError::AccountLocked(
                "الحساب مقفل لمدة 5 دقائق".to_string()
            ));
        }

        Ok(())
    }

    pub fn get_remaining_attempts(&self, user_id: &str) -> u32 {
        let store = match self.store.lock() {
            Ok(s) => s,
            Err(_) => return 5,
        };
        let attempts = store.get(user_id).map(|a| a.attempts).unwrap_or(0);
        5_u32.saturating_sub(attempts)
    }

    pub fn record_failure(&self, user_id: &str) {
        let mut store = match self.store.lock() {
            Ok(s) => s,
            Err(_) => return,
        };
        if let Some(entry) = store.get_mut(user_id) {
            entry.attempts += 1;
            entry.last_attempt = Instant::now();
        }
    }

    pub fn record_success(&self, user_id: &str) {
        let mut store = match self.store.lock() {
            Ok(s) => s,
            Err(_) => return,
        };
        store.remove(user_id);
    }
}
