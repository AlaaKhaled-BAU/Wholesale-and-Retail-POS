# PROJECT_LOG.md
> **For AI Agents**: This file is the live state of the project. Read this before doing ANYTHING. Update this file when tasks are completed, bugs are found, or decisions are made. This is how you "remember" what happened in previous sessions.

---

## Current Status

| Field | Value |
|-------|-------|
| **Current Phase** | Phase 0 — Not started |
| **Last Updated** | — |
| **Active Dev** | — |
| **Blocking Issue** | None |

---

## Phase Status Tracker

| Phase | Name | Dev A Status | Dev B Status | Overall | Notes |
|-------|------|-------------|-------------|---------|-------|
| 0 | Setup & Foundations | ⬜ Not started | ⬜ Not started | ⬜ | |
| 1 | Auth & Shell | ⬜ Not started | ⬜ Not started | ⬜ | |
| 2 | Product Management | ⬜ Not started | ⬜ Not started | ⬜ | |
| 3 | POS Sales Screen | ⬜ Not started | ⬜ Not started | ⬜ | |
| 4 | Customer Management | ⬜ Not started | ⬜ Not started | ⬜ | |
| 5 | Reporting | ⬜ Not started | ⬜ Not started | ⬜ | |
| 6 | ZATCA Compliance | ⬜ Not started | ⬜ Not started | ⬜ | |
| 7 | Settings | ⬜ Not started | ⬜ Not started | ⬜ | |
| 8 | Demo Polish & QA | ⬜ Not started | ⬜ Not started | ⬜ | |

**Status Key**: ⬜ Not started | 🔄 In progress | ✅ Complete | ❌ Blocked | ⚠️ Has issues

---

## Ready Commands (Dev B → Dev A)

These Tauri commands are implemented and available for Dev A to use. Dev B updates this list when a command is ready.

| Command Name | Phase | Status | Notes |
|-------------|-------|--------|-------|
| *(none yet)* | — | — | — |

**Template for Dev B to use when adding:**
`| get_products | Phase 2 | ✅ Ready | Returns Vec<Product>, limit 50 |`

---

## Task Completion Log

Add an entry every time a task is completed.

```
Format:
### [Date] — Task [X.X] — [Task Name]
**Owner**: Dev A / Dev B
**Duration**: X days
**Deliverable achieved**: Yes / Partial
**Notes**: Any deviations from the guide, shortcuts taken, or things the next session should know.
```

*(No entries yet — project not started)*

---

## Decision Log

Record every significant technical decision made during development. This helps any AI agent understand WHY something was built a certain way.

```
Format:
### [Date] — Decision: [Short title]
**Context**: Why this decision came up
**Decision**: What was decided
**Alternatives considered**: What else was considered
**Impact**: Which files/tasks are affected
```

### Pre-project — Decision: Tauri over Electron
**Context**: Desktop framework selection
**Decision**: Using Tauri 2.0 with Rust backend
**Alternatives considered**: Electron (Node.js backend), NW.js
**Impact**: All backend logic must be in Rust; no Node.js in `src-tauri/`

### Pre-project — Decision: SQLite only for MVP (no central server)
**Context**: Multi-branch sync is complex; MVP is single-branch demo
**Decision**: MVP uses local SQLite only. No Fastify/PostgreSQL server.
**Alternatives considered**: PostgreSQL + Fastify from day 1
**Impact**: No `sync_` commands needed in MVP; multi-branch sync is Phase 2

### Pre-project — Decision: Simplified ZATCA invoices only for MVP
**Context**: B2B standard invoices require real-time clearance (harder); B2C simplified invoices only require reporting within 24 hours
**Decision**: MVP implements simplified (B2C) invoices only. Standard (B2B) is Phase 2.
**Impact**: Task 6.2 XML must set `InvoiceTypeCode name="0100000"` (simplified); clearance API not needed

### Pre-project — Decision: Suspended invoices in memory only
**Context**: Parked carts could be stored in SQLite as `draft` invoices, but that adds complexity
**Decision**: Parked invoices are stored in Zustand persist (localStorage) for MVP. Max 5.
**Alternatives considered**: SQLite draft invoices (more reliable but more complex)
**Impact**: If app crashes, parked invoices are lost. Acceptable for demo; fix in Phase 2.

---

## Bug Tracker

Log all bugs here. Dev B and Dev A both update this.

```
Format:
### BUG-[number] — [Short description]
**Found by**: Dev A / Dev B / QA
**Phase**: [when found]
**Severity**: 🔴 Critical | 🟡 Medium | 🟢 Minor
**Reproduced**: Yes / No
**Steps to reproduce**:
**Root cause**: (fill in when known)
**Fix**: (fill in when fixed)
**Status**: Open / Fixed / Won't fix
```

*(No bugs logged yet)*

---

## Blockers & Open Questions

Active blockers that are preventing progress.

```
Format:
### BLOCKER-[number] — [Description]
**Blocking**: Dev A / Dev B / Both
**Since**: [date]
**Resolution needed**: [what needs to happen to unblock]
**Resolved**: [date + how]
```

*(No blockers currently)*

---

## Integration Test Checklist

To be completed at the end of Phase 8 before the demo.

### ZATCA Compliance
- [ ] Test QR code with official ZATCA Fatoora mobile app — invoice details display correctly
- [ ] Submit 10 test invoices to ZATCA sandbox — all accepted (status 200)
- [ ] Submit 1 invoice with a validation error — error correctly stored, status = 'rejected'
- [ ] Simulate ZATCA API down — invoice queued, retried after 10 min, eventually submitted

### Sales Flow
- [ ] Complete a B2C cash sale — invoice saved, inventory decremented, receipt printed
- [ ] Complete a B2B card sale — customer VAT number appears on invoice
- [ ] Complete a mixed payment sale (cash + VISA)
- [ ] Park an invoice, serve another customer, resume — no data lost
- [ ] Process a full refund — inventory restocked, refund receipt printed
- [ ] Process a partial refund (2 of 5 items)

### Offline & Reliability
- [ ] Disconnect internet — make 3 sales — reconnect — ZATCA submissions retry automatically
- [ ] Cut power during payment confirmation — relaunch app — invoice integrity intact, no duplicate
- [ ] Run app for 4 hours continuously — no memory leaks or crashes

### UI & Arabic
- [ ] All screens render correctly in RTL
- [ ] No English text visible in the UI (except settings labels that need English)
- [ ] QR code scannable on physical receipt
- [ ] Printer paper-out scenario — app shows Arabic warning, does not freeze
- [ ] Auto-lock after 5 minutes — cart preserved, PIN required to resume

### Performance
- [ ] Product search: <100ms for 10,000 products
- [ ] Invoice save (10 lines): <500ms
- [ ] App startup to POS screen: <3 seconds
- [ ] Receipt print: <3 seconds after payment confirm

### Reports
- [ ] Daily report totals match sum of invoices in SQLite
- [ ] VAT total in period report matches invoice VAT amounts
- [ ] CSV export opens correctly in Excel/LibreOffice
- [ ] Accountant can verify VAT return totals

---

## Environment & Setup Notes

*(Fill in during Phase 0 — things like which Node.js version, Rust version, OS, specific config gotchas)*

| Item | Dev A | Dev B |
|------|-------|-------|
| OS | — | — |
| Node.js version | — | — |
| Rust version | — | — |
| pnpm version | — | — |
| Tauri CLI version | — | — |
| Repo URL | — | — |
| SQLite browser tool | — | — |
| ZATCA sandbox account | N/A | — |

---

## Hardware for Testing

| Device | Spec | Status |
|--------|------|--------|
| Thermal printer | Epson TM-T82 or BIXOLON SRP-350 (80mm) | ⬜ Not acquired |
| Barcode scanner | Honeywell/Zebra USB | ⬜ Not acquired |
| Test machine | Windows 10/11, min 1366×768 | ⬜ Not confirmed |

---

## Upcoming Milestones

| Milestone | Target Date | Status |
|-----------|------------|--------|
| Phase 0 complete — project builds and runs | — | ⬜ |
| Phase 3 complete — first full sale end-to-end | — | ⬜ |
| Phase 6 complete — ZATCA QR code scans correctly | — | ⬜ |
| Phase 8 complete — 30-minute clean demo run | — | ⬜ |
| **Customer Demo** | — | ⬜ |
