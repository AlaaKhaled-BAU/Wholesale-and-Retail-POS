# DEV_B_BOUNDARY.md
> **For AI Agents assisting Dev B**: This is your master entry point. You own everything in `src-tauri/` — the Rust backend. Read this file first, then navigate to the phase file matching the current project state. Every task is self-contained: copy the code, follow the steps, verify, and update `PROJECT_LOG.md`.

---

## Dev B Identity & Domain

| Aspect | Detail |
|--------|--------|
| **Developer** | Dev B (Rust / Tauri backend) |
| **Counterpart** | Dev A (React / TypeScript frontend) |
| **Domain** | `src-tauri/` and all Rust code |
| **What you build** | SQLite data layer, Tauri commands, ZATCA crypto, receipt printing |
| **What Dev A builds** | UI screens, components, cart state, routing |

**Golden Rule**: When you implement a new Tauri command, immediately:
1. Add its TypeScript wrapper to `src/lib/tauri-commands.ts`
2. Add/update the corresponding interface in `src/types/index.ts`
3. Update `PROJECT_LOG.md` in the "Ready Commands" table
4. Notify Dev A if this is a **merge point** (see table below)

**Never modify files in `src/` except:**
- `src/lib/tauri-commands.ts`
- `src/types/index.ts`

---

## Locked Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Tauri 2.0 |
| Database | SQLite via `tauri-plugin-sql` |
| Crypto (ZATCA) | `ring` or `openssl` crate |
| XML (ZATCA) | `quick-xml` crate |
| QR Code | `qrcode` crate |
| Printing | `escpos-rs` crate |
| Secure storage | `tauri-plugin-stronghold` |
| HTTP | `reqwest` crate |
| Hashing | `bcrypt` crate |
| Async runtime | `tokio` |
| Serialization | `serde` + `serde_json` |

---

## Phase Dependency Graph

```
Phase 0 (Setup) ──► Phase 1 (Auth) ──► Phase 2 (Products) ──► Phase 3 (Sales) ──► Phase 8 (Demo)
                                              │                    │
                                              ▼                    ▼
                                         Phase 4 (Customers)   Phase 5 (Reports)
                                                                   │
                                                                   ▼
                                                              Phase 6 (ZATCA) ──► Phase 7 (Settings)
```

**Sequential phases**: 0 → 1 → 2 → 3 → 8 (critical path)
**Parallel opportunities**:
- Phase 4 can run in parallel with Phase 3 (after Phase 2)
- Phase 5 can run in parallel with Phase 4 (after Phase 3)
- Phase 6 is sequential for Dev B, but Dev A works on Phase 7 in parallel
- Phase 7 can start after Phase 3

---

## Merge Points Map (Sync with Dev A)

| Merge Point | Phase File | Trigger Task | What Dev A Needs |
|-------------|-----------|--------------|------------------|
| **MP-0** | `phase_0.md` | End of Phase 0 | `src/types/index.ts` + `src/lib/tauri-commands.ts` stubs matching Rust structs |
| **MP-1** | `phase_1.md` | Task 1.1.4 | `login_user`, `open_cashier_session`, `close_cashier_session` commands wired |
| **MP-2** | `phase_2.md` | Task 2.1.6 | `get_products`, `create_product`, `get_categories` commands wired |
| **MP-3a** | `phase_3.md` | Task 3.1.1 | `create_invoice` ready — exact `NewInvoice` payload type shared |
| **MP-3b** | `phase_3.md` | Task 3.3.1 | `print_receipt`, `get_available_ports`, `get_invoice_qr` commands wired |
| **MP-6** | `phase_6.md` | Task 6.3.1 | QR code format confirmed: base64 PNG in `invoices.qr_code` |
| **MP-7** | `phase_7.md` | Task 7.1.3 | `get_all_settings`, `set_setting` commands wired |
| **MP-8** | `phase_8.md` | Phase 8 start | Joint walkthrough — both devs required |

**How to handle a merge point:**
1. Complete the trigger task and verify it works
2. Update `PROJECT_LOG.md` "Ready Commands" table
3. Add a log entry in "Task Completion Log"
4. Notify Dev A with the exact command names and payload types
5. Do NOT start the next phase until Dev A confirms they've synced (unless the dependency graph says it's parallel)

---

## File Manifest

| File | Contents | When to Read |
|------|----------|-------------|
| `phase_0.md` | SQLite schema, Cargo.toml, command stubs, TS bindings | Start of project |
| `phase_1.md` | PIN login, session open/close/get | After Phase 0 |
| `phase_2.md` | Product CRUD, category CRUD, inventory commands | After Phase 1 |
| `phase_3.md` | Invoice transaction, refund, receipt printing | After Phase 2 |
| `phase_4.md` | Customer CRUD, balance, payments | Parallel with Phase 3 |
| `phase_5.md` | Daily summary, period sales, inventory report, session report, CSV export | After Phase 3 |
| `phase_6.md` | ZATCA key gen, CSR, registration, UBL XML, signing, QR, submission, retry queue | After Phase 3 |
| `phase_7.md` | Settings persistence, defaults, startup load | After Phase 3 (parallel with Phase 6) |
| `phase_8.md` | Demo seed data, DB indexes, performance tests, joint walkthrough | After all phases |
| `appendix.md` | Full schema.sql, full types/index.ts, VAT rules, seed data, ZATCA API ref, ESC/POS layout | Reference anytime |

---

## How to Use This Boundary (For AI Agents)

1. **Read `PROJECT_LOG.md`** first to understand current project state
2. **Identify the active phase** from the Phase Status Tracker
3. **Open the corresponding `phase_X.md` file**
4. **Find the next uncompleted task** (marked ⬜)
5. **Execute the task**: follow steps, copy code, verify
6. **Mark the task complete** in this boundary file and in `PROJECT_LOG.md`
7. **If it's a merge point**, follow the merge point protocol above
8. **Move to the next task**

**Task Status Key**: ⬜ Not started | 🔄 In progress | ✅ Complete

---

## Communication Protocol with Dev A

### Dev B → Dev A (When a command is ready)

Update `PROJECT_LOG.md` with this template:

```markdown
| Command Name | Phase | Status | Notes |
|-------------|-------|--------|-------|
| get_products | Phase 2 | ✅ Ready | Returns Vec<Product>, limit 50 |
```

Also update the "Task Completion Log":

```markdown
### [Date] — Task [X.X] — [Task Name]
**Owner**: Dev B
**Duration**: X days
**Deliverable achieved**: Yes / Partial
**Notes**: Any deviations, shortcuts, or context for next session
```

### Dev A → Dev B (When they need something)

Dev A will file entries in `PROJECT_LOG.md` under "Blockers & Open Questions" or "Bug Tracker". Check these sections before starting any work.

---

## Dev B — What to Do When Waiting

| Situation | Action |
|-----------|--------|
| Waiting for Dev A Phase 0 scaffolding | Set up local Rust env; study `tauri-plugin-sql` docs |
| Finished a phase early | Start the next phase immediately if dependencies are met |
| Dev A testing and finding bugs | Fix bugs from `PROJECT_LOG.md` bug list first |
| ZATCA Phase 6 running (longest stretch) | Keep Dev A updated daily; they're working on Phase 7 |
| Blocked on a dependency | Add a BLOCKER entry to `PROJECT_LOG.md` |

---

## Critical Constraints (Never Violate)

1. **Never store ZATCA private keys or CSID in plaintext** — always use `tauri-plugin-stronghold`
2. **Never DELETE from `audit_log`** — it is immutable
3. **Every invoice save must be a single SQLite transaction** — use BEGIN/COMMIT/ROLLBACK
4. **Every inventory adjustment must write to `audit_log`**
5. **All user-facing error messages must be in Arabic**
6. **Invoice numbers must never be reused** — counter only increments
7. **Suspended invoices are handled by Dev A in Zustand** — do NOT create a DB table for them

---

(End of master index — navigate to the active phase file to begin work)
