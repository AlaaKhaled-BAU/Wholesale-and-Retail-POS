# Phase 1 — Authentication (4–6 days)
> **Start: After Phase 0 | Parallel with Dev A**

---

## Phase 1 Overview

This phase implements the PIN-based login system and cashier session management. All commands are required before Dev A can wire the login screen.

**Merge Point: MP-1** — Task 1.1.4 complete. Dev A wires PIN login screen and session state.

---

## Task 1.1.1 — `login_user` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Implement PIN verification against bcrypt-hashed passwords. Return a session token on success.

### Files to Edit
- `src-tauri/src/commands/users.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/main.rs`

### Prerequisites
- Task 0.1.4 (seed data with hashed PINs)
- `bcrypt` crate in `Cargo.toml`

### Steps

1. Open `src-tauri/src/commands/users.rs` and replace with:

```rust
use crate::lib::{SessionToken, User};
use bcrypt::verify;
use tauri_plugin_sql::TauriSql;

#[tauri::command]
pub async fn login_user(pin: String, db: tauri::State<'_, TauriSql>) -> Result<SessionToken, String> {
    let users: Vec<User> = db
        .query("SELECT id, branch_id, name_ar, role, pin_hash FROM users WHERE is_active = 1", [])
        .await
        .map_err(|e| e.to_string())?;

    for user in users {
        if verify(&pin, &user.pin_hash).map_err(|e| e.to_string())? {
            return Ok(SessionToken {
                user_id: user.id.clone(),
                name_ar: user.name_ar,
                role: user.role,
                branch_id: user.branch_id,
                session_id: String::new(), // filled by open_cashier_session
            });
        }
    }

    Err("رقم التعريف غير صحيح".to_string())
}
```

2. In `src-tauri/src/commands/mod.rs`, ensure `users` is exported:

```rust
pub mod users;
```

3. In `src-tauri/src/main.rs`, register the command:

```rust
.invoke_handler(tauri::generate_handler![
    commands::users::login_user,
    // ... other commands will be added here
])
```

### Verification
1. Run `cargo check`
2. Test via Dev A's debug UI or a Rust test:
   ```rust
   // Test: login_user("1234") should return a SessionToken
   // Test: login_user("9999") should return Err("رقم التعريف غير صحيح")
   ```
3. Verify the Arabic error message is returned for invalid PINs.

### TS Bindings
Already in `src/lib/tauri-commands.ts`:
```typescript
export const loginUser = (pin: string) =>
  invoke<SessionToken>('login_user', { pin });
```

### Log Update
Add to `PROJECT_LOG.md` "Ready Commands":
```markdown
| login_user | Phase 1 | ✅ Ready | Returns SessionToken; error message in Arabic |
```

---

## Task 1.1.2 — `open_cashier_session` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Open a new cashier shift session. Prevent duplicate open sessions for the same user.

### Files to Edit
- `src-tauri/src/commands/users.rs`

### Steps

1. Append to `src-tauri/src/commands/users.rs`:

```rust
use uuid::Uuid;

#[tauri::command]
pub async fn open_cashier_session(
    user_id: String,
    opening_float: f64,
    db: tauri::State<'_, TauriSql>,
) -> Result<String, String> {
    // Check for existing open session
    let existing: Option<String> = db
        .query_one(
            "SELECT id FROM cashier_sessions WHERE user_id = ? AND status = 'open'",
            [&user_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    if let Some(session_id) = existing {
        return Ok(session_id);
    }

    // Get user's branch
    let branch_id: String = db
        .query_one("SELECT branch_id FROM users WHERE id = ?", [&user_id])
        .await
        .map_err(|e| e.to_string())?
        .ok_or("المستخدم غير موجود")?;

    let session_id = format!("SES-{}", Uuid::new_v4());

    db.execute(
        "INSERT INTO cashier_sessions (id, user_id, branch_id, opened_at, opening_float, status) VALUES (?, ?, ?, datetime('now'), ?, 'open')",
        [&session_id, &user_id, &branch_id, &opening_float.to_string()],
    )
    .await
    .map_err(|e| e.to_string())?;

    // Write to audit_log
    db.execute(
        "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, payload) VALUES (?, ?, 'session_opened', 'cashier_session', ?, ?)",
        [
            format!("AUD-{}", Uuid::new_v4()),
            user_id.clone(),
            session_id.clone(),
            format!("{{\"opening_float\":{}}}", opening_float),
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(session_id)
}
```

2. Register in `main.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    commands::users::login_user,
    commands::users::open_cashier_session,
])
```

### Verification
1. Call `open_cashier_session("USR-002", 500.0)` → returns a session ID like `SES-xxxxx`
2. Call it again with the same user → returns the same session ID (idempotent)
3. Check `cashier_sessions` table: 1 row with status='open'
4. Check `audit_log`: 1 row with action='session_opened'

### TS Bindings
Already in `src/lib/tauri-commands.ts`:
```typescript
export const openCashierSession = (userId: string, openingFloat: number) =>
  invoke<string>('open_cashier_session', { userId, openingFloat });
```

### Log Update
Add to `PROJECT_LOG.md` "Ready Commands":
```markdown
| open_cashier_session | Phase 1 | ✅ Ready | Returns session ID; idempotent |
```

---

## Task 1.1.3 — `close_cashier_session` Command (Gap G1)
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Close an open cashier session. Required for end-of-day Z-report. This was Gap G1 in PROJECT_CONTEXT.md.

### Files to Edit
- `src-tauri/src/commands/users.rs`

### Steps

1. Append to `src-tauri/src/commands/users.rs`:

```rust
#[tauri::command]
pub async fn close_cashier_session(
    session_id: String,
    closing_cash: f64,
    user_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<(), String> {
    db.execute(
        "UPDATE cashier_sessions SET closed_at = datetime('now'), closing_cash = ?, status = 'closed' WHERE id = ?",
        [&closing_cash.to_string(), &session_id],
    )
    .await
    .map_err(|e| e.to_string())?;

    // Write to audit_log
    db.execute(
        "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, payload) VALUES (?, ?, 'session_closed', 'cashier_session', ?, ?)",
        [
            format!("AUD-{}", Uuid::new_v4()),
            user_id.clone(),
            session_id.clone(),
            format!("{{\"closing_cash\":{}}}", closing_cash),
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
```

2. Register in `main.rs`.

### Verification
1. Open a session (Task 1.1.2)
2. Close it with `close_cashier_session(session_id, 750.0, "USR-002")`
3. Check `cashier_sessions`: status='closed', closed_at is set
4. Check `audit_log`: action='session_closed'

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
Add to `PROJECT_LOG.md` "Ready Commands":
```markdown
| close_cashier_session | Phase 1 | ✅ Ready | Closes session; writes audit_log |
```

---

## Task 1.1.4 — `get_current_session` Command + `AppState`
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Store the active session in Tauri managed state and provide a command to retrieve it.

### Files to Edit
- `src-tauri/src/commands/users.rs`
- `src-tauri/src/main.rs`

### Steps

1. Append to `src-tauri/src/commands/users.rs`:

```rust
use crate::lib::CashierSession;

#[tauri::command]
pub async fn get_current_session(
    user_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<Option<CashierSession>, String> {
    let session: Option<CashierSession> = db
        .query_one(
            "SELECT id, user_id, branch_id, opened_at, closed_at, opening_float, closing_cash, status FROM cashier_sessions WHERE user_id = ? AND status = 'open'",
            [&user_id],
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(session)
}
```

2. In `src-tauri/src/main.rs`, add the AppState managed state:

```rust
use crate::lib::AppState;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            current_session: Mutex::new(None),
        })
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:pos.db", db::get_migrations())
                .build(),
        )
        // ... rest of setup
```

3. Register `get_current_session` in `main.rs`.

### Verification
1. Call `get_current_session("USR-002")` before opening a session → returns `null`
2. Open a session (Task 1.1.2)
3. Call again → returns the session object with status='open'
4. Close the session (Task 1.1.3)
5. Call again → returns `null`

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
Add to `PROJECT_LOG.md` "Ready Commands":
```markdown
| get_current_session | Phase 1 | ✅ Ready | Returns open session or null |
```

---

## 🛑 MERGE POINT: MP-1 — TASK 1.1.4 COMPLETE

**This is a merge point. Sync with Dev A before proceeding.**

### What Dev A Needs From You
1. `login_user` is ready — they can wire the PIN login screen
2. `open_cashier_session` is ready — they can implement session start on login
3. `close_cashier_session` is ready — they can add "End Shift" button
4. `get_current_session` is ready — they can check if a session is already open

### After Merge
- Dev A works on Phase 1 UI (login screen, app shell)
- You proceed to Phase 2 (`phase_2.md`) — Product CRUD
- Dev A will catch up to Phase 2 UI in ~1 day

---

(End of Phase 1)
