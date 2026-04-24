# PROJECT_CONTEXT.md
> **For AI Agents**: Read this file first. It is the single source of truth for understanding this project. After reading this, read DEV_A_COMPLETE_GUIDE.md or DEV_B_COMPLETE_GUIDE.md depending on which developer you are assisting. Check PROJECT_LOG.md to understand the current state before doing anything.

---

## 1. What This Project Is

A **desktop POS (Point of Sale) system** for a wholesale retail store with **4 branches in Saudi Arabia**.

- Built with **Tauri** (desktop framework wrapping a Rust backend + React frontend)
- **Arabic RTL UI** — all user-facing text is Arabic, direction is right-to-left
- **Offline-first** — the app works without internet; data syncs when connection is restored
- **ZATCA compliant** — Saudi Arabia requires all POS systems to generate cryptographically signed e-invoices (Phase 2)
- The UI style is modeled after EasyPharma POS: item search bar, active cart panel, invoice summary, payment methods, suspended invoices, refund mode

**This is the MVP build.** The goal is a working customer demo at a single branch. Multi-branch sync, advanced reporting, and wholesale pricing tiers are Post-MVP (Phase 2 and 3 of the long-term plan).

---

## 2. Team Structure

| Person | Label | Primary Domain |
|--------|-------|----------------|
| Developer 1 | **Dev A** | React frontend — UI screens, components, state management |
| Developer 2 | **Dev B** | Rust backend — Tauri commands, SQLite, ZATCA, printing |

Both developers are full-stack but split by domain to minimize merge conflicts. Each has a dedicated guide file: `DEV_A_COMPLETE_GUIDE.md` and `DEV_B_COMPLETE_GUIDE.md`.

---

## 3. Tech Stack (Locked Decisions)

| Layer | Technology | Why |
|-------|-----------|-----|
| Desktop framework | **Tauri 2.0** | Rust-based, smaller than Electron, native OS access |
| Frontend | **React 18 + TypeScript** | Ecosystem, component model, good RTL support |
| Styling | **Tailwind CSS v4 + shadcn/ui** | RTL-aware via `dir="rtl"`, Arabic-ready components |
| State management | **Zustand** | Simple, no boilerplate, works with Tauri invoke |
| Routing | **react-router-dom** | Standard React routing |
| Local database | **SQLite via tauri-plugin-sql** | Offline-first, embedded, no server needed |
| HTTP client (frontend) | **@tanstack/react-query** | Server state caching, used for future cloud sync |
| Date utilities | **date-fns** | Gregorian dates; `Intl.DateTimeFormat` for Hijri |
| Charts | **Recharts** | Reports/analytics screens |
| Arabic font | **Cairo (Google Fonts)** | Clean, available, SAR characters supported |
| Rust XML | **quick-xml crate** | ZATCA UBL 2.1 XML generation |
| Rust crypto | **ring or openssl crate** | ECDSA P-256 signing for ZATCA |
| Rust QR | **qrcode crate** | TLV-encoded ZATCA QR code as PNG |
| Rust printing | **escpos-rs crate** | ESC/POS thermal receipt printing |
| Secure storage | **tauri-plugin-stronghold** | ZATCA private key + CSID storage |
| Package manager | **pnpm** | Faster than npm, disk-efficient |

**Not included in MVP** (Post-MVP):
- Central server (Fastify + PostgreSQL) — for multi-branch sync
- MADA/payment terminal integration (Geidea or Tap Payments)
- SQLCipher (at-rest encryption) — should be added in Phase 2

---

## 4. Project Folder Structure

```
pos-app/
├── src/                          ← React frontend (Dev A's domain)
│   ├── components/               ← Reusable UI components
│   ├── pages/                    ← Route-level page components
│   │   ├── LoginPage.tsx
│   │   ├── POSPage.tsx
│   │   ├── InventoryPage.tsx
│   │   ├── CustomersPage.tsx
│   │   ├── ReportsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── store/                    ← Zustand stores
│   │   ├── useAuthStore.ts
│   │   ├── useCartStore.ts
│   │   └── useSettingsStore.ts
│   ├── lib/
│   │   └── tauri-commands.ts     ← Typed wrappers around invoke()
│   ├── types/                    ← Shared TypeScript interfaces
│   │   └── index.ts              ← Product, Invoice, Customer, User, etc.
│   └── styles/
│       ├── tokens.css
│       └── base.css
├── src-tauri/                    ← Rust backend (Dev B's domain)
│   ├── src/
│   │   ├── main.rs
│   │   ├── db/
│   │   │   ├── mod.rs            ← DB init, run schema
│   │   │   └── schema.sql        ← Full SQLite schema
│   │   └── commands/
│   │       ├── products.rs
│   │       ├── invoices.rs
│   │       ├── users.rs
│   │       ├── inventory.rs
│   │       ├── customers.rs
│   │       ├── reports.rs
│   │       ├── zatca.rs
│   │       └── settings.rs
│   └── Cargo.toml
├── PROJECT_CONTEXT.md            ← This file
├── DEV_A_COMPLETE_GUIDE.md       ← Dev A's task guide
├── DEV_B_COMPLETE_GUIDE.md       ← Dev B's task guide
├── PROJECT_LOG.md                ← Running project log
└── SCHEMA_REFERENCE.md           ← Full DB schema + TS types
```

---

## 5. Database (SQLite — Single File)

The database file lives at: `%APPDATA%/pos/pos.db` (Windows) or `~/Library/Application Support/pos/pos.db` (Mac)

**Tables (MVP):**
- `branches` — store info (name, VAT number, CR number, address)
- `users` — cashiers and admins (PIN stored as bcrypt hash)
- `categories` — product categories
- `products` — all items for sale (name_ar, barcode, price, VAT rate)
- `inventory` — stock levels per (branch + product)
- `customers` — B2B and B2C customer records
- `cashier_sessions` — open/close sessions per cashier shift
- `invoices` — completed sale headers (includes ZATCA status + QR code)
- `invoice_lines` — line items per invoice
- `payments` — payment records per invoice (supports split payment)
- `audit_log` — immutable event log (never DELETE from this table)
- `settings` — key-value store for app configuration

Full schema with all columns and constraints is in `SCHEMA_REFERENCE.md`.

---

## 6. Key Architectural Decisions

### How Tauri Commands Work
The frontend (React) never touches SQLite directly. It calls Rust commands via `invoke()`:
```typescript
// Frontend (TypeScript)
const products = await invoke<Product[]>('get_products', { query: 'تفاح' });
```
```rust
// Backend (Rust)
#[tauri::command]
async fn get_products(query: String, db: State<DbPool>) -> Result<Vec<Product>> { ... }
```
All Tauri command wrappers live in `src/lib/tauri-commands.ts`.

### How ZATCA Invoices Work (Simplified B2C)
1. Invoice is created and saved in SQLite (status: `draft`)
2. Rust generates UBL 2.1 XML from invoice data
3. Rust signs the XML with ECDSA P-256 (private key stored in Stronghold)
4. Rust generates a TLV-encoded QR code as PNG
5. QR is stored in `invoices.qr_code` (base64)
6. Invoice XML is submitted to ZATCA Fatoora API (status → `reported` or `rejected`)
7. If ZATCA API is unavailable: invoice is queued in `zatca_queue` for retry every 10 minutes
8. ZATCA has a 24-hour window — invoices approaching this deadline are flagged URGENT

### How Suspended Invoices Work
Parked carts are stored in Zustand with `persist` middleware (localStorage). They do NOT touch SQLite until finalized. Max 5 parked invoices at a time.

### How Offline Mode Works (MVP)
For the MVP (single branch), offline mode simply means the app runs normally from SQLite. ZATCA submissions are queued and retried automatically. No multi-branch sync in MVP.

### Invoice Numbering
Format: `[BRANCH_PREFIX]-[PADDED_COUNTER]` → e.g., `BR1-000001`
Counter is derived from MAX(invoice_number) per branch inside a DB transaction to prevent race conditions.

---

## 7. Routes Map

| Path | Page | Auth Required | Role |
|------|------|--------------|------|
| `/login` | PIN login screen | No | — |
| `/pos` | POS terminal (main screen) | Yes | Any |
| `/inventory` | Product list + management | Yes | Manager+ |
| `/customers` | Customer list + detail | Yes | Any |
| `/reports` | Daily/period/session reports | Yes | Manager+ |
| `/settings` | App settings | Yes | Admin only |

---

## 8. Compliance Requirements (ZATCA)

Saudi Arabia mandates **Phase 2 ZATCA e-invoicing** for all POS systems.

- **Simplified Invoice (B2C)**: customer is an individual, no buyer VAT required. Must be reported to ZATCA within 24 hours.
- **Standard Invoice (B2B)**: customer is a business with VAT number. Must be cleared by ZATCA in real-time (synchronous). ← Post-MVP, Phase 2.
- Every invoice requires: ECDSA-signed UBL XML, TLV QR code (Tags 1–9), UUID, sequential invoice number.
- ZATCA Fatoora sandbox: `https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/`
- ZATCA Fatoora production: `https://gw-fatoora.zatca.gov.sa/e-invoicing/core/`
- Device must be registered with ZATCA before any invoice submission (one-time setup, Task 6.1 in Dev B guide).

---

## 9. Arabic / RTL Requirements

- `<html dir="rtl" lang="ar">` is set globally
- Font: Cairo from Google Fonts loaded in `index.html`
- Numbers: Western Arabic numerals (1, 2, 3) — NOT Eastern Arabic (١، ٢، ٣) — with a toggle in settings
- Hijri dates: displayed alongside Gregorian on receipts and invoices
- SAR symbol: `ر.س` in Arabic context, `SAR` in English context
- Prayer time awareness: screen auto-locks after 5 minutes of inactivity (returns to PIN screen, does NOT lose the cart)
- All error messages, toasts, and empty states must be in Arabic

---

## 10. MVP Phases Summary

| Phase | What Gets Built | Duration | Status |
|-------|----------------|----------|--------|
| 0 | Environment setup, DB schema, project scaffolding | 3–5 days | ⬜ Not started |
| 1 | Authentication (PIN login), app shell, navigation | 4–6 days | ⬜ Not started |
| 2 | Product management (CRUD, categories, inventory setup) | 5–7 days | ⬜ Not started |
| 3 | POS sales screen (cart, payment, print, park, refund) | 10–14 days | ⬜ Not started |
| 4 | Customer management (B2B/B2C, credit accounts) | 4–5 days | ⬜ Not started |
| 5 | Basic reporting (daily, period, session, CSV export) | 4–5 days | ⬜ Not started |
| 6 | ZATCA simplified invoice compliance | 6–8 days | ⬜ Not started |
| 7 | Settings screen (store info, printer, users, VAT) | 3–4 days | ⬜ Not started |
| 8 | Demo polish, seed data, QA, performance | 4–5 days | ⬜ Not started |
| **TOTAL** | | **43–59 days** | |

**Update the Status column in PROJECT_LOG.md as phases complete.**

---

## 11. Known Issues & Gaps (Flagged During Review)

These gaps were identified during cross-review of `detailed_plan.md` vs `mvp_roadmap.md`. They do not block the MVP but should be addressed:

| # | Issue | Severity | Recommendation |
|---|-------|----------|----------------|
| G1 | No explicit `close_cashier_session` Rust command defined in the roadmap | Medium | Add to Dev B Phase 1 task 1.2 — needed for end-of-day Z-report |
| G2 | SQLCipher (at-rest DB encryption) mentioned in detailed_plan but absent from MVP roadmap | Medium | Add as a Phase 2 task; flag for security hardening |
| G3 | During Phase 6 (ZATCA), Dev A only has Task 6.5 (~2 days) while Dev B has Tasks 6.1–6.4 (~6–8 days) — Dev A will be idle for 4–6 days | Low | Dev A should begin Phase 7 (Settings UI) during this window — already allowed by dependency graph |
| G4 | The `cashier_sessions` table exists but no "session open" check on the POS screen — cashier can sell without opening a session | Medium | Dev B's `create_invoice` command must validate that an open session exists for the user |
| G5 | Suspended invoices use localStorage/Zustand persist — if the app crashes, they are lost | Low | Acceptable for MVP demo; for production, park to SQLite `draft` invoices |

---

## 12. Glossary

| Term | Meaning |
|------|---------|
| ZATCA | زكاة، ضرائب وجمارك — Saudi Arabia's tax authority |
| Fatoora | Saudi e-invoicing portal / API managed by ZATCA |
| CSID | Cryptographic Stamp Identifier — the ZATCA certificate issued to a POS device |
| CSR | Certificate Signing Request — the file sent to ZATCA during device registration |
| UBL 2.1 | Universal Business Language — the XML standard ZATCA requires for invoices |
| TLV | Tag-Length-Value — binary encoding format used in the ZATCA QR code |
| ECDSA P-256 | The cryptographic signing algorithm ZATCA mandates |
| ESC/POS | Epson command protocol for thermal receipt printers |
| VAT | Value Added Tax — 15% in Saudi Arabia (ضريبة القيمة المضافة) |
| CR Number | Commercial Registration number (السجل التجاري) |
| Hijri | Islamic lunar calendar used officially in Saudi Arabia alongside Gregorian |
| RTL | Right-to-left text direction (Arabic) |
| Tauri Command | A Rust function exposed to the React frontend via `invoke()` |
| Stronghold | Tauri's encrypted secret storage plugin |
| Z-report | End-of-day sales summary printed by cashier at shift close |
| B2B | Business-to-business sale — requires buyer VAT number on invoice |
| B2C | Business-to-consumer sale — simplified invoice, no buyer VAT needed |
| MADA | Saudi local debit card network (Post-MVP) |
| CLIQ | ClickPay — a payment method used in the Gulf |
