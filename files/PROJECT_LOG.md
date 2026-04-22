# PROJECT_LOG.md
> **For AI Agents**: This file is the live state of the project. Read this before doing ANYTHING. Update this file when tasks are completed, bugs are found, or decisions are made.

---

## Current Status

| Field | Value |
|-------|-------|
| **Current Phase** | Phase 8 — Complete (waiting for Dev B backend) |
| **Last Updated** | 2026-04-22 |
| **Active Dev** | Dev A (Frontend) — all UI complete |
| **Blocking Issue** | Dev B backend commands not yet delivered |

---

## Phase Status Tracker

| Phase | Name | Dev A Status | Dev B Status | Overall | Notes |
|-------|------|-------------|-------------|---------|-------|
| 0 | Setup & Foundations | ✅ Complete | ⬜ Not started | 🔄 | Frontend ready; Rust backend scaffolded |
| 1 | Auth & Shell | ✅ Complete | ⬜ Not started | 🔄 | Login, idle timer, routing, layout all done |
| 2 | Product Management | ✅ Complete | ⬜ Not started | 🔄 | Inventory UI with mock data |
| 3 | POS Sales Screen | ✅ Complete | ⬜ Not started | 🔄 | Full cart, payment, refund, suspended invoices |
| 4 | Customer Management | ✅ Complete | ⬜ Not started | 🔄 | Customers, credit, B2B selector |
| 5 | Reporting | ✅ Complete | ⬜ Not started | 🔄 | 4 tabs with Recharts, CSV export |
| 6 | ZATCA Compliance | ✅ UI Complete | ⬜ Not started | 🔄 | Badges, QR placeholder, settings ready |
| 7 | Settings | ✅ Complete | ⬜ Not started | 🔄 | Store, printer, users CRUD, tax, barcode, ZATCA |
| 8 | Demo Polish & QA | ✅ Complete | ⬜ Not started | 🔄 | Toasts, error boundary, loading states, offline banner |

**Status Key**: ⬜ Not started | 🔄 In progress | ✅ Complete | ❌ Blocked | ⚠️ Has issues

---

## Ready Commands (Dev B → Dev A)

These Tauri commands are implemented and available for Dev A to use. Dev B updates this list when a command is ready.

| Command Name | Phase | Status | Notes |
|-------------|-------|--------|-------|
| *(none yet)* | — | — | — |

**All 26 invoke() wrappers are ready in `src/lib/tauri-commands.ts`.** Dev A just needs Dev B to implement the Rust side.

---

## Task Completion Log

### 2026-04-22 — Task 0.1 + 0.2 — Project Scaffolding & Toolchain
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: Tauri 2.0 + React 19 + TypeScript + Vite scaffolded. Tailwind v4, Cairo font, RTL layout configured. All dependencies installed. Git repo with main/develop branches.

### 2026-04-22 — Task 1.1 — Login Screen (PIN-based)
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: Full PIN entry with 4-dot indicator, numpad, shake animation, lockout after 5 fails (30s countdown). Mock PINs: 1234 (cashier), 5678 (manager).

### 2026-04-22 — Task 1.2 — App Shell & Navigation
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: Right sidebar (RTL), top bar with user info, RouteGuard, 7 routes: /login, /pos, /inventory, /customers, /invoices, /reports, /settings.

### 2026-04-22 — Task 1.1-ext — Idle Timer
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: useIdleTimer hook auto-locks session after 5 minutes of inactivity. Cart is preserved; only auth is cleared.

### 2026-04-22 — Task 2.1 — Product Management UI
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: Inventory page with search, category filter, pagination (50/page), add/edit modal, active toggle. Mock data: 2 products.

### 2026-04-22 — Task 3.1 — Cart State (Zustand)
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: useCartStore with add/remove/update qty, computed subtotal/VAT/grandTotal, customer selection, invoice discount, clear cart.

### 2026-04-22 — Task 3.2 — Product Search & Barcode Scanner
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: Debounced search (300ms), dropdown results, global barcode detection (8+ chars in <200ms), toast feedback.

### 2026-04-22 — Task 3.3 — Cart UI Component
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: Cart panel with editable qty, delete, line totals, invoice summary, customer selector, discount modal, suspended invoices drawer.

### 2026-04-22 — Task 3.4 — Payment Modal
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: 4 payment methods (cash/card/CLIQ/mixed), change calculation, validation, loading spinner, post-payment success modal with QR placeholder and print button. **Printer failure handled with retry button inline (G2 fixed).**

### 2026-04-22 — Task 3.5 — Refund Mode
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: Toggle refund mode, invoice search, item selection with qty controls, confirm refund.

### 2026-04-22 — Task 4.1 — Customer Management UI
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: Customer table, add/edit modal, detail view with credit progress bar, payment recording. Mock data: 2 customers.

### 2026-04-22 — Task 5.1 — Reports UI
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: 4 tabs (Daily/Inventory/Period/Shift) with Recharts pie/bar/line charts, KPI cards, CSV export with BOM for Arabic.

### 2026-04-22 — Task 6.1 — ZATCA UI Status & QR
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: Invoice list with ZATCA badges (مُبلَّغ/معلق/مرفوض), QR placeholder on success screen and invoice detail, ZATCA settings section.

### 2026-04-22 — Task 7.1 — Settings Screen UI
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: Store info with live receipt preview, printer config, tax settings, barcode timeout slider, ZATCA status.

### 2026-04-22 — Task 7.1-ext — Users CRUD
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: **Full users CRUD in Settings (G5 fixed).** Table with name/role/branch/status, add/edit modal, PIN validation (4 digits, match confirmation), soft disable (never delete).

### 2026-04-22 — Task 8.1 — Error Handling & UX Polish
**Owner**: Dev A
**Duration**: 1 session
**Deliverable achieved**: ✅ Complete
**Notes**: Global error boundary, toast system (4 types, auto-dismiss), loading states on all async buttons, empty states, offline banner, Arabic validation.

---

## Decision Log

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

### 2026-04-22 — Decision: React 19 over React 18
**Context**: Scaffold project with latest stable React
**Decision**: Used React 19.2.5 (latest at setup time)
**Alternatives considered**: React 18 (more stable, more docs)
**Impact**: Access to React 19 features; potential compatibility issues with older libraries (none found so far)
**Logged for**: G7

### 2026-04-22 — Decision: /invoices route added as standalone page
**Context**: ZATCA invoice tracking and receipt re-printing needed a dedicated page
**Decision**: Added `/invoices` route between Customers and Reports in sidebar
**Alternatives considered**: Inline invoice list inside Reports or POS
**Impact**: Separate page with full invoice table, ZATCA badges, detail modal with QR
**Logged for**: G1

### 2026-04-22 — Decision: Custom components instead of shadcn/ui primitives
**Context**: shadcn/ui init failed initially due to missing import alias
**Decision**: All UI components built manually with Tailwind CSS + Lucide icons
**Alternatives considered**: Use shadcn/ui component library
**Impact**: Full control over RTL styling; no dependency on Radix UI primitives. **shadcn/ui CLI installed later (G4 fixed)** for future component additions.

### 2026-04-22 — Decision: Printer failure shows inline retry in success modal
**Context**: DEV_A_COMPLETE_GUIDE Task 3.4 #6 requires graceful printer failure handling
**Decision**: On print failure, success modal shows red error banner + "إعادة المحاولة" button. Sale is NOT cancelled.
**Alternatives considered**: Auto-retry 3 times, or redirect to /invoices
**Impact**: Cashier can retry immediately without leaving the sale flow
**Logged for**: G2

### 2026-04-22 — Decision: Users CRUD built as local state (not placeholder)
**Context**: DEV_A_COMPLETE_GUIDE Task 7.1 requires full user management
**Decision**: Full CRUD in Settings > Users: table, add/edit modal, PIN validation, role dropdown, soft disable
**Alternatives considered**: Placeholder text (was implemented initially)
**Impact**: Manager can add cashiers, set PINs, deactivate users without deletion
**Logged for**: G5

---

## Bug Tracker

*(No critical bugs currently — all builds pass)*

### BUG-1 — shadcn/ui init requires import alias
**Found by**: Dev A
**Phase**: Phase 0
**Severity**: 🟢 Minor
**Reproduced**: Yes
**Steps to reproduce**: Run `pnpm dlx shadcn@latest init` without `paths` in tsconfig.json
**Root cause**: shadcn CLI expects `@/*` alias configured
**Fix**: Added `paths: { "@/*": ["./src/*"] }` to both tsconfig.json and tsconfig.app.json
**Status**: Fixed

---

## Blockers & Open Questions

### BLOCKER-1 — All Tauri commands are mock-only
**Blocking**: Dev A integration testing
**Since**: 2026-04-22
**Resolution needed**: Dev B must implement Rust commands in `src-tauri/src/main.rs`
**Priority order**:
1. `login_user` — unblock real authentication
2. `get_products`, `create_product` — unblock real inventory
3. `create_invoice` — unblock real sales saving
4. `print_receipt` — unblock end-to-end sale flow
5. `get_invoice_qr` — unblock ZATCA QR display

---

## Integration Test Checklist

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
- [x] All screens render correctly in RTL
- [x] No English text visible in the UI (except settings labels that need English)
- [ ] QR code scannable on physical receipt
- [ ] Printer paper-out scenario — app shows Arabic warning, does not freeze
- [x] Auto-lock after 5 minutes — cart preserved, PIN required to resume

### Performance
- [ ] Product search: <100ms for 10,000 products
- [ ] Invoice save (10 lines): <500ms
- [ ] App startup to POS screen: <3 seconds
- [ ] Receipt print: <3 seconds after payment confirm

### Reports
- [ ] Daily report totals match sum of invoices in SQLite
- [ ] VAT total in period report matches invoice VAT amounts
- [x] CSV export opens correctly in Excel/LibreOffice
- [ ] Accountant can verify VAT return totals

---

## Environment & Setup Notes

| Item | Dev A | Dev B |
|------|-------|-------|
| OS | Linux | — |
| Node.js version | 22.22.1 | — |
| Rust version | 1.90.0 | — |
| pnpm version | 10.33.0 | — |
| Tauri CLI version | 2.10.1 | — |
| React version | 19.2.5 | — |
| Tailwind CSS version | 4.2.4 | — |
| Repo URL | Local | — |

---

## Hardware for Testing

| Device | Spec | Status |
|--------|------|--------|
| Thermal printer | Epson TM-T82 or BIXOLON SRP-350 (80mm) | ⬜ Not acquired |
| Barcode scanner | Honeywell/Zebra USB | ⬜ Not acquired |
| Test machine | Linux, 1920×1080 | ✅ Available |

---

## Upcoming Milestones

| Milestone | Target Date | Status |
|-----------|------------|--------|
| Phase 0 complete — project builds and runs | 2026-04-22 | ✅ Done |
| Phase 3 complete — first full sale end-to-end | 2026-04-22 | ✅ Done (mock) |
| Phase 6 complete — ZATCA QR code scans correctly | — | ⬜ Blocked on Dev B |
| Phase 8 complete — 30-minute clean demo run | — | ⬜ Needs Dev B integration |
| **Customer Demo** | — | ⬜ |

---

## Gap Fixes Log

| Gap ID | Description | Fix | Date |
|--------|-------------|-----|------|
| G1 | /invoices route not logged | Added `/invoices` route and documented in Decision Log | 2026-04-22 |
| G2 | Printer failure toast + retry button missing | Added inline retry button in success modal with red error banner. Sale NOT cancelled. | 2026-04-22 |
| G3 | PROJECT_LOG.md outdated | Completely rewritten with all completed phases, tasks, decisions | 2026-04-22 |
| G4 | shadcn/ui not installed | Installed via `pnpm dlx shadcn@latest init`. Added `@/*` alias to tsconfig. | 2026-04-22 |
| G5 | Users section is placeholder | Replaced with full CRUD: table, add/edit modal, PIN validation (4 digits), role dropdown, soft disable | 2026-04-22 |
| G7 | React 19 decision not logged | Added to Decision Log with rationale | 2026-04-22 |
