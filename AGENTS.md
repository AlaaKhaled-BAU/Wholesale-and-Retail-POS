# AGENTS.md

## Dev Commands

```bash
pnpm tauri dev      # Full stack (Rust compile + React + Tauri hot reload)
pnpm run build      # Frontend only (tsc -b && vite build)
pnpm run lint       # ESLint
```

- `pnpm tauri dev` compiles Rust on first run (slow; ~minutes). Subsequent runs are fast.
- Tauri build config: `beforeBuildCommand` = `pnpm run build`, `frontendDist` = `dist/`

## Stack

- **Tauri 2.0** (Rust backend + React frontend)
- **pnpm** package manager
- **Tailwind CSS v4** with `@tailwindcss/vite` plugin (not the classic CLI)
- **shadcn/ui** via `components.json` — components at `@/components/ui`
- **Zustand** for state with `persist` middleware (localStorage)
- **SQLite** via `rusqlite` (Rust) + `tauri-plugin-sql`
- **POS Error system**: All 40+ Rust commands return `Result<T, PosError>` — structured JSON errors parsed by `extractErrorMessage()` in `src/lib/tauri-commands.ts`

## Architecture Notes

- Frontend never touches SQLite directly. All DB access via `invoke()` commands in `src-tauri/src/commands/`.
- All typed wrappers: `src/lib/tauri-commands.ts`
- DB path: `%APPDATA%/pos/pos.db` (Windows), `~/Library/Application Support/pos/pos.db` (Mac)
- Schema file: `src-tauri/src/db/schema.sql` (Rust `include_str!` at runtime)
- All Rust command handlers registered in `src-tauri/src/main.rs` and use `db/` state managed via `AppState`.
- Default branch hardcoded as `BR1` in `src/lib/tauri-commands.ts` — single branch MVP.
- `AppState.current_session` holds `Option<SessionToken>` (not `CashierSession`) for RBAC checks.

## Key Quirks

- **RTL**: App is Arabic RTL (`<html dir="rtl" lang="ar">`), but `components.json` has `rtl: false` (shadcn setting only, does not affect the app's own RTL direction).
- **Numbers**: Western Arabic numerals (1,2,3) — NOT Eastern Arabic.
- **Session storage**: Active session stored in `localStorage` as `pos-session` (not Zustand persist).
- **Invoice numbering**: Format `BR1-000001` — uses atomic INSERT ON CONFLICT DO UPDATE (not MAX query).
- **Seed users**: Admin PIN `1234`, Cashier PIN `0000` — debug builds only (first-run wizard in release).
- **ZATCA queue**: Background retry every 10 minutes in Rust (see `main.rs`).
- **Database backups**: Auto-VACUUM daily at 02:00, kept 7 days.
- **Invoice creation**: Server-side total recalculation; rejects if frontend total differs by > 0.01. Stock guard validates `qty_on_hand` before decrement.
- **RBAC**: All commands enforce role checks via `require_role()`, `require_session()` in `src-tauri/src/auth.rs`.
- **Rate limiter**: 5 failed PIN attempts → 5-minute lock. Messages in Arabic.
- **Secret storage**: ZATCA keys stored via OS credential manager (`keyring` crate) with `0600` file fallback.
- **CSP**: Restrictive Content-Security-Policy in `tauri.conf.json`. No `shell:default` or `sql:default` capabilities.
- **Tauri capabilities**: Restricted to `core:default` + window controls only in `src-tauri/capabilities/default.json`.
- **WAL mode**: `PRAGMA journal_mode = WAL` + `PRAGMA synchronous = NORMAL` on every DB open.

## Important File Locations

| File | Purpose |
|------|---------|
| `src-tauri/src/main.rs` | Rust entry, all command registrations, background tasks |
| `src-tauri/src/commands/` | One file per domain (users, products, invoices, zatca, etc.) |
| `src-tauri/src/auth.rs` | RBAC middleware (`require_role`, `require_session`) and `RateLimiter` |
| `src-tauri/src/error.rs` | `PosError` enum — all 40+ commands return `Result<T, PosError>` |
| `src-tauri/src/secret_store.rs` | ZATCA credential storage via OS keyring |
| `src-tauri/src/db/schema.sql` | SQLite DDL |
| `src/lib/tauri-commands.ts` | All `invoke()` wrappers + `extractErrorMessage()` |
| `src/types/index.ts` | TypeScript interfaces (must match Rust structs) |
| `src/styles/base.css` | Tailwind v4 CSS config with `@theme` blocks |
| `ai/SCHEMA_REFERENCE.md` | DB schema + TS types + VAT rules (source of truth) |
| `ai/PROJECT_CONTEXT.md` | Architecture overview, ZATCA flow, team split |

## Commands / Workflow Order

1. `pnpm run lint` → `pnpm run build` (lint must pass before build)
2. No separate typecheck command — `build` includes `tsc -b`
3. Tauri commands are `async` Rust functions tagged `#[tauri::command]`

## Team Split

- **Dev A**: React frontend (`src/`) — UI, components, Zustand stores
- **Dev B**: Rust backend (`src-tauri/`) — Tauri commands, SQLite, ZATCA, printing

## Rust Code Conventions

- All command files return `Result<T, PosError>` — never `Result<T, String>`
- `PosError` enum variants: `DatabaseError`, `AuthenticationError`, `InvalidCredentials`, `AccountLocked`, `SessionExpired`, `Unauthorized`, `ValidationError`, `NotFound`, `BusinessRule`, `InternalError`
- Struct serialization: `#[serde(rename_all = "camelCase")]` on all IPC-facing types
- `AppState` fields: `db: Mutex<Connection>`, `current_session: Mutex<Option<SessionToken>>`, `settings: Mutex<Option<AppSettings>>`, `rate_limiter: RateLimiter`
