# DEV_A_COMPLETE_GUIDE.md — Frontend Developer
> **For AI Agents assisting Dev A**: You are helping the React/TypeScript frontend developer. Your counterpart is Dev B (Rust/backend). Read PROJECT_CONTEXT.md first. Check PROJECT_LOG.md for current status before suggesting any work. Never modify files in `src-tauri/` — that is Dev B's domain.

---

## Your Role

**Dev A** owns everything in `src/` — the React application. You build what users see and interact with. Dev B builds the data layer and exposes Tauri commands. You consume those commands via `invoke()` wrappers in `src/lib/tauri-commands.ts`.

**Golden rule**: Never call `invoke()` with a command that Dev B hasn't implemented yet. Check `SCHEMA_REFERENCE.md` and Dev B's current progress in `PROJECT_LOG.md` before building a screen that depends on backend commands.

---

## Technology You Own

- React 18 + TypeScript
- Tailwind CSS v4 + shadcn/ui components
- Zustand (state stores in `src/store/`)
- react-router-dom (routing)
- @tanstack/react-query (for future API calls)
- Recharts (charts in reports)
- date-fns + Intl.DateTimeFormat (dates and Hijri)
- The `src/types/index.ts` file (TypeScript interfaces — shared with Dev B's struct definitions)

---

## How to Call Backend Commands

All Tauri commands are wrapped in `src/lib/tauri-commands.ts`. Always use the wrapper, never call `invoke()` directly in components.

```typescript
// src/lib/tauri-commands.ts — example
import { invoke } from '@tauri-apps/api/core';
import type { Product, Invoice, Customer } from '../types';

export const getProducts = (query: string, categoryId?: string) =>
  invoke<Product[]>('get_products', { query, categoryId });

export const createInvoice = (payload: NewInvoice) =>
  invoke<Invoice>('create_invoice', { payload });
```

---

## Full Task List with Dependencies

---

### ═══ PHASE 0 — Environment Setup (3–5 days) ═══
**Start: Day 1 | Full parallel with Dev B**

---

#### Task 0.1 — Project Scaffolding
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev B**: ✅ Yes

**What to do:**
1. Install: Rust toolchain (`rustup`), Node.js 20+, pnpm
2. Scaffold project: `pnpm create tauri-app` → choose React + TypeScript
3. Configure `tauri.conf.json`:
   - `productName`: your app name
   - `identifier`: `sa.yourcompany.pos`
   - Window size: minimum 1280×800
4. Create Git repo, push to GitHub/GitLab
5. Create branches: `main` and `develop`
6. Set branch protection: no direct push to `main`
7. Create folder structure (see PROJECT_CONTEXT.md section 4)
8. Push to repo so Dev B can clone

**Deliverable**: `pnpm tauri dev` opens a blank window

**Communicate to Dev B**: Share the repo URL immediately after push.

---

#### Task 0.2 — Frontend Toolchain Configuration
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev B**: ✅ Yes (starts after 0.1 is pushed)

**What to do:**
1. Install Tailwind CSS v4: `pnpm add -D tailwindcss @tailwindcss/vite`
2. Set `<html dir="rtl" lang="ar">` in `index.html`
3. Install shadcn/ui: `pnpm dlx shadcn@latest init`
4. Add Cairo font to `index.html`:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
   ```
   Set in CSS: `font-family: 'Cairo', sans-serif;`
5. Create `src/styles/tokens.css` with color tokens (primary, background, border, etc.)
6. Create `src/styles/base.css` with RTL reset (reset margins, flip flex directions)
7. Install: `pnpm add zustand react-router-dom date-fns @tanstack/react-query recharts`
8. Create `src/contexts/LanguageProvider.tsx` with Arabic as default
9. Create `src/types/index.ts` with stub interfaces (fill in as Dev B defines structs):
   ```typescript
   export interface Product { id: string; nameAr: string; barcode?: string; sellPrice: number; vatRate: number; /* ... */ }
   export interface Invoice { /* ... */ }
   export interface Customer { /* ... */ }
   export interface User { id: string; nameAr: string; role: 'admin' | 'manager' | 'cashier'; branchId: string; }
   ```

**Deliverable**: A styled "مرحباً بك في نقطة البيع" screen with Arabic text renders correctly in RTL

**Communicate to Dev B**: Share the TypeScript interfaces in `src/types/index.ts`. Dev B needs these to match their Rust structs.

---

### ═══ PHASE 1 — Auth & Shell (4–6 days) ═══
**Start: After Phase 0 | Parallel with Dev B**
**Depends on**: Phase 0 complete, Dev B's `login_user` command ready

---

#### Task 1.1 — Login Screen (PIN-based)
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev B**: ✅ Yes (build UI; wire up when Dev B's 1.2 is done)

**What to do:**
1. Create `src/pages/LoginPage.tsx` — full-screen PIN entry
2. Build a numpad component: 12 buttons (0-9, ⌫, ✓), 44px minimum touch targets
3. Display 4 dots showing entered digits (hide actual digits)
4. On submit: call `invoke('login_user', { pin })` — check `src/lib/tauri-commands.ts`
5. On success: save user object to `useAuthStore`, navigate to `/pos`
6. On failure: shake animation + error message "رقم التعريف غير صحيح"
7. Lock after 5 failed attempts for 30 seconds (countdown shown)
8. Auto-lock: set up a global idle timer — if no mouse/keyboard for 5 min, clear `useAuthStore`, return to `/login` (do NOT clear the cart — only clear auth)

**Build the idle timer in `src/lib/idleTimer.ts`:**
```typescript
export function startIdleTimer(onIdle: () => void, timeoutMs = 300_000) {
  let timer: ReturnType<typeof setTimeout>;
  const reset = () => { clearTimeout(timer); timer = setTimeout(onIdle, timeoutMs); };
  ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach(e => window.addEventListener(e, reset));
  reset();
  return () => { clearTimeout(timer); };
}
```

**Deliverable**: Cashier can log in with PIN 1234 (from seed data), their name appears in the header

---

#### Task 1.2 — App Shell & Navigation Layout
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev B**: ✅ Yes (after 1.1 complete)

**What to do:**
1. Create `src/components/AppShell.tsx` — the outer layout wrapper
2. **Right sidebar** (RTL means this is visually on the right):
   - Navigation links: لوحة التحكم | المبيعات | المخزون | التقارير | الإعدادات
   - Use react-router-dom `<NavLink>` with active state styling
3. **Top bar**: branch name (from `useAuthStore`) | logged-in user name | clock | logout button
4. **Main content area**: `<Outlet />` from react-router-dom
5. Set up routes in `src/App.tsx`:
   ```tsx
   /login          → <LoginPage />
   /pos            → <POSPage />         (protected)
   /inventory      → <InventoryPage />   (protected, manager+)
   /customers      → <CustomersPage />   (protected)
   /reports        → <ReportsPage />     (protected, manager+)
   /settings       → <SettingsPage />    (protected, admin)
   ```
6. Create `<ProtectedRoute>` component: if no session in `useAuthStore`, redirect to `/login`
7. Create placeholder pages for all routes (just "Coming soon" text for now)

**Deliverable**: Navigation works between all placeholder pages; top bar shows logged-in user

**⛔ WAIT POINT**: Before proceeding to Phase 2, confirm Dev B has completed Tasks 2.1 and 2.3 (product commands + inventory commands). You can start building the UI shells in Phase 2 without them but cannot wire data.

---

### ═══ PHASE 2 — Product Management (5–7 days) ═══
**Start: After Phase 1 | Dev A has 1-day lag behind Dev B**
**Depends on**: Phase 1 complete, Dev B's Task 2.1 commands ready

---

#### Task 2.1 — Product Management UI
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev B**: ⛓️ Start 1 day after Dev B begins 2.1

**What to do:**
1. Build `src/pages/InventoryPage.tsx`:
   - Searchable table (input → calls `getProducts(query)`)
   - Filterable by category dropdown
   - Table columns: باركود | الاسم | الفئة | السعر | الضريبة | المخزون | الحالة
   - Row action buttons: تعديل (edit) | تعطيل/تفعيل (toggle active)
   - Pagination: 50 items per page
2. Build `<ProductModal>` (shadcn Dialog):
   - Fields: name_ar (required), name_en, barcode, SKU (auto-generate if empty), category, unit, cost_price, sell_price, vat_rate (default 15%)
   - Barcode field: text input that also accepts scanner input (scan = auto-fill)
   - Validation: sell_price > 0 required; show Arabic error messages
3. Build inline category mini-CRUD (add/rename category inline in the modal)
4. Wire all to commands from `src/lib/tauri-commands.ts`

**Deliverable**: Owner can add 20 products manually and see them in a searchable list

---

### ═══ PHASE 3 — POS Sales Screen (10–14 days) ═══
**Start: After Phase 2 | Critical path — longest phase**
**Depends on**: Phase 2 complete

---

#### Task 3.1 — Cart State Management (Zustand)
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev B**: ✅ Yes (start immediately at Phase 3 start)

**What to do:**
Create `src/store/useCartStore.ts` with this exact interface:

```typescript
interface CartItem {
  productId: string;
  productNameAr: string;
  qty: number;
  unitPrice: number;
  discountPct: number;  // 0–100
  vatRate: number;      // 0.15
  lineTotal: number;    // computed: (unitPrice * qty) * (1 - discountPct/100) + vat
  vatAmount: number;    // computed: (unitPrice * qty * (1 - discountPct/100)) * vatRate
}

interface CartStore {
  items: CartItem[];
  customerId: string | null;
  invoiceDiscount: number;  // invoice-level % discount (0–100)
  parkedInvoices: ParkedInvoice[];  // max 5

  // Actions
  addItem: (product: Product) => void;        // if exists, increment qty
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;  // qty=0 removes item
  setItemDiscount: (productId: string, pct: number) => void;
  setCustomer: (customerId: string | null) => void;
  setInvoiceDiscount: (pct: number) => void;
  clearCart: () => void;
  parkCurrentCart: (label?: string) => void;
  resumeParkedCart: (id: string) => void;
  removeParkedCart: (id: string) => void;

  // Computed getters
  subtotal: () => number;       // sum of line totals before VAT
  totalDiscount: () => number;  // sum of all discounts
  totalVat: () => number;       // sum of all VAT amounts
  grandTotal: () => number;     // final amount due
}
```

**Important**: All computed values must recalculate on every state change. Use Zustand's `computed` pattern or recalculate in selectors.

**Deliverable**: Cart store unit-tested; adding/removing items correctly updates all totals

---

#### Task 3.2 — Product Search & Barcode Scanner Integration
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev B**: ✅ Yes (parallel with 3.1)

**What to do:**
1. Build `<ProductSearchBar>` component:
   - Arabic placeholder: "ابحث عن منتج أو امسح الباركود..."
   - On typing (debounced 300ms): call `getProducts(query)` → show dropdown
   - Dropdown: product name + price + stock qty
   - Click / Enter on result: call `cartStore.addItem(product)`, clear search, refocus input
2. **Barcode scanner detection** (critical — scanners emulate keyboard typing):
   - A real barcode scanner types 8+ characters and presses Enter within ~50ms
   - Detect: track time between keystrokes; if ≥8 chars arrive in <200ms → it's a scan
   - On scan: call `getProductByBarcode(barcode)` → if found, add to cart; if not found: show red toast "باركود غير موجود"
   - Implementation hint:
     ```typescript
     let scanBuffer = '';
     let scanTimer: ReturnType<typeof setTimeout>;
     const handleKeyDown = (e: KeyboardEvent) => {
       if (e.key === 'Enter' && scanBuffer.length >= 8) {
         handleBarcodeScan(scanBuffer);
         scanBuffer = '';
       } else {
         clearTimeout(scanTimer);
         scanBuffer += e.key;
         scanTimer = setTimeout(() => { scanBuffer = ''; }, 200);
       }
     };
     ```

**Deliverable**: Cashier can add products by typing OR by scanning a barcode

---

#### Task 3.3 — Cart UI Component
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev B**: ⛓️ Needs Task 3.1 complete

**What to do:**
1. Build `<CartPanel>` (center of POS screen):
   - Table: # | اسم المنتج | الكمية (inline editable) | السعر | الخصم % | الإجمالي | حذف
   - Inline qty editing: click qty cell → number input → blur/Enter saves to cart store
   - Inline discount: "%" badge per item, click to open a small popover input
   - Empty state: cart icon + "السلة فارغة" text
2. Build `<InvoiceSummaryPanel>` (bottom section):
   - المجموع الفرعي (subtotal)
   - الخصم (discount amount)
   - ضريبة القيمة المضافة ١٥٪
   - **الإجمالي** (grand total — large, bold, prominent)
   - Invoice-level discount: text input + "تطبيق" button
3. Build `<CustomerSelector>`:
   - "+" button opens a search modal
   - Shows selected customer name + type badge:
     - "فاتورة مبسطة" (simplified) for B2C
     - "فاتورة ضريبية" (standard) for B2B
4. Build `<SuspendedInvoicesDrawer>`:
   - "تعليق الفاتورة" button → calls `cartStore.parkCurrentCart()`
   - Badge showing count of parked invoices
   - Clicking badge opens a side drawer showing each parked invoice:
     - عدد الأصناف | الإجمالي | وقت التعليق
     - Click to restore: calls `cartStore.resumeParkedCart(id)`, clears current cart

**Deliverable**: Full interactive cart — add/edit/remove items, live totals, park/resume

---

#### Task 3.4 — Payment Modal
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev B**: ⛓️ Needs 3.3 complete

**What to do:**
1. "إتمام البيع" button opens full-screen shadcn Dialog
2. Payment method tabs (4 options): نقدي | فيزا | CLIQ | نقدي + فيزا
3. **Cash flow**:
   - Large number input: "المبلغ المدفوع"
   - Show change: `change = paid - grandTotal` — display in green if positive
   - On-screen numpad with big buttons
4. **Mixed payment flow** (نقدي + فيزا):
   - Two inputs: مبلغ نقدي + مبلغ فيزا
   - Must sum to grand total (show validation error if not)
5. "تأكيد البيع" button:
   - Disabled until valid payment
   - On click: call `createInvoice(payload)` — see payload structure in SCHEMA_REFERENCE.md
   - Show loading spinner + disable button during call
   - On success: call `cartStore.clearCart()`, show green success animation, call `printReceipt(invoice.id)`
   - On error: show red toast with the error message
6. Handle printer failure gracefully: if `printReceipt` fails, show a "فشل الطباعة" toast with a "إعادة الطباعة" retry button — do NOT cancel the sale

**Deliverable**: Complete payment flow — invoice saved, cart cleared, receipt printing triggered

---

#### Task 3.5 — Refund Mode
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev B**: ⛓️ Needs Task 3.4 complete (and Dev B's refund command)

**What to do:**
1. "وضع الإرجاع" toggle button on POS toolbar
2. In refund mode, the cart search becomes invoice search:
   - Input: "رقم الفاتورة أو امسح الباركود..."
   - Calls `getInvoice(invoiceNumber)` → shows original invoice items
3. Checkboxes per item for selection; qty input (can partially refund)
4. "تأكيد الإرجاع" button:
   - Calls `createRefundInvoice(originalInvoiceId, lines)` (Dev B's command)
   - On success: shows a refund receipt, exits refund mode
   - Inventory is restocked automatically (handled by Dev B in the command)
5. Show which payment method the refund goes back to (cash back / card reversal label)

**Deliverable**: Cashier can process a full or partial refund; inventory restocks correctly

---

### ═══ PHASE 4 — Customer Management (4–5 days) ═══
**Start: After Phase 3 | Full parallel with Dev B**
**Depends on**: Phase 3 complete

---

#### Task 4.1 — Customer Management UI
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev B**: ✅ Yes (after Dev B's 4.1 is done)

**What to do:**
1. Build `src/pages/CustomersPage.tsx`:
   - Searchable table: الاسم | الهاتف | رقم الضريبة | الرصيد | حد الائتمان
2. Build `<CustomerModal>`:
   - Fields: name_ar (required), phone, vat_number, cr_number, credit_limit
   - Toggle: B2C (فرد) vs B2B (شركة)
3. Build `<CustomerDetailPage>` (click on a customer row):
   - Invoice history: date | invoice # | total | status
   - Credit account: progress bar showing (balance / credit_limit)
   - "تسجيل دفعة" button for credit account payments
4. Update the POS customer selector (Task 3.3) to use the real `getCustomers()` command

**Deliverable**: Cashier can search and select a B2B customer on POS; invoice gets buyer's VAT number

---

### ═══ PHASE 5 — Basic Reporting (4–5 days) ═══
**Start: After Phase 3 | Full parallel with Dev B**
**Depends on**: Phase 3 complete (needs real invoice data)

---

#### Task 5.1 — Reports UI
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev B**: ✅ Yes (after Dev B's 5.1 queries are done)

**What to do:**
Build `src/pages/ReportsPage.tsx` with 4 tabs:

**Tab 1 — التقرير اليومي (Daily)**:
- Date picker (defaults to today, uses date-fns)
- 3 KPI cards: إجمالي المبيعات | ضريبة القيمة المضافة | عدد الفواتير
- Pie chart (Recharts `<PieChart>`): payment method breakdown (cash/card/CLIQ)
- Top 5 products table: اسم المنتج | الكمية | الإيراد

**Tab 2 — تقرير المخزون (Inventory)**:
- Table with columns: المنتج | الكمية | حد التنبيه | قيمة المخزون
- Rows with qty < low_stock_threshold highlighted in red
- Stock value total at bottom

**Tab 3 — تقرير الفترة (Period)**:
- Date range picker (from/to)
- Line chart (Recharts `<LineChart>`): مبيعات يومية over the period
- Summary: إجمالي المبيعات | إجمالي الضريبة المحصلة

**Tab 4 — تقرير المناوبة (Session)**:
- Shows current open session info
- Sales list for this session
- Cash reconciliation: رصيد بداية المناوبة + مبيعات نقدية = المتوقع vs الفعلي

**Export button on each tab**: calls the relevant CSV export command → triggers file download using `<a download>` trick

**Deliverable**: Reports page with real data from seed invoices; CSV export works

---

### ═══ PHASE 6 — ZATCA (6–8 days) ═══
**Start: After Phase 3 | Dev A's role is limited here**
**Dev B owns Tasks 6.1–6.4. Dev A owns 6.5 only.**

> ⚠️ **During Phase 6, Dev A should work on Phase 7 (Settings UI) in parallel.** Phase 7 is unblocked after Phase 3 per the dependency graph. Do not wait for ZATCA to finish before starting Settings.

---

#### Task 6.1 — ZATCA UI Status & QR (Dev A's ZATCA work)
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev B**: ✅ Yes (parallel with 6.2–6.4)

**What to do:**
1. In the invoice list / history screen, add a ZATCA status badge per invoice:
   - 🟢 مُبلَّغ (reported) — green
   - 🟡 معلق (pending) — yellow
   - 🔴 مرفوض (rejected) — red with attention icon
2. In the receipt printing flow (Task 3.4 payment modal → print), replace the QR placeholder with the real QR image:
   - After `createInvoice()` resolves, call `getInvoiceQr(invoice.id)` → returns base64 PNG
   - Pass this base64 to the `printReceipt()` command (Dev B embeds it in ESC/POS stream)
   - Also display the QR code on the success screen after sale (scannable on screen)
3. In Settings page (Phase 7), ZATCA section:
   - Show CSID status: active / expired / not registered
   - Button: "تسجيل الجهاز" → triggers `registerZatcaDevice()` command (Dev B)
   - Button: "إعادة إرسال الفواتير المعلقة" → triggers `retryZatcaQueue()` command (Dev B)

**Deliverable**: QR code prints and is scannable; ZATCA status visible per invoice in the UI

---

### ═══ PHASE 7 — Settings (3–4 days) ═══
**Start: After Phase 3 (unblocked) — START THIS DURING Phase 6 ZATCA**
**Parallel with Dev B**: ✅ Yes

---

#### Task 7.1 — Settings Screen UI
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel with Dev B**: ✅ Yes

Build `src/pages/SettingsPage.tsx` with sections:

**معلومات المتجر (Store Info)**:
- Store name (Arabic + English text inputs)
- Logo: file upload input → preview image
- Address, VAT number, CR number
- Live receipt header preview component

**الطابعة (Printer)**:
- Printer type: USB / Serial COM port (radio buttons)
- COM port dropdown: calls `getAvailablePorts()` command → list of detected ports
- "طباعة تجريبية" test print button → calls `printTestPage()` command
- Paper size: 80mm (default)

**المستخدمون (Users)** — visible to managers and above only:
- User list table: الاسم | الدور | الحالة
- "إضافة مستخدم" button → modal with name_ar, role dropdown, PIN (twice for confirmation)
- Edit user: change name/role/PIN
- Deactivate (soft disable only — never delete users)

**الضرائب (Tax)**:
- Default VAT rate (prefilled 15%, read-only for non-admins)
- Per-category VAT overrides

**ZATCA** section (from Task 6.1):
- CSID status display
- Register device button
- Retry queue button

**Deliverable**: Store info saved and reflected in receipt header; printer can be selected; users managed

---

### ═══ PHASE 8 — Demo Polish & QA (4–5 days) ═══
**Start: After all phases | Final push before demo**

---

#### Task 8.1 — Error Handling & UX Polish
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev B**: ✅ Yes

**What to do:**
1. **Global error boundary**: wrap the entire app in a React error boundary:
   ```tsx
   class ErrorBoundary extends React.Component {
     componentDidCatch(error, info) { /* log to audit */ }
     render() { return this.state.hasError ? <ArabicErrorScreen /> : this.props.children; }
   }
   ```
2. **Toast system** (shadcn Toast):
   - Every Tauri command success → green toast
   - Every Tauri command failure → red toast with Arabic error message
   - Create a `useToast` hook that all pages use consistently
3. **Loading states**: every button that calls a Tauri command must:
   - Show a spinner (shadcn `<Spinner>`)
   - Be `disabled` during the async call
4. **Empty states**: every table/list has:
   - An icon + Arabic message + an action button (e.g., "أضف منتجاً")
5. **Offline indicator**: check connectivity every 30 seconds:
   ```typescript
   setInterval(() => {
     if (!navigator.onLine) showBanner('غير متصل بالإنترنت — البيانات محفوظة محلياً');
   }, 30_000);
   ```
6. **Form validation**: all validation messages must be in Arabic
7. **RTL audit**: review every screen — nothing should appear left-aligned, no English placeholders

**Deliverable**: App never shows white screen; all actions have visual feedback; no English text in UI

---

#### Task 8.2 — End-to-End Demo Walkthrough (Joint Task with Dev B)
**Status**: ⬜ | **Difficulty**: ⭐⭐ | **Parallel**: ❌ Must be joint

Run through this script together:
1. Open app → PIN login (PIN: 1234)
2. Scan 3 barcodes → products appear in cart
3. Apply 5% discount to one item
4. Select a B2B customer
5. Apply 2% invoice-level discount
6. Confirm sale: mixed payment (cash + VISA)
7. Print receipt → verify QR code scans in ZATCA Fatoora app
8. Show daily report with the sale
9. Show inventory decreased for sold products
10. Demo a refund for one item
11. Demo parked invoice (park → serve another → resume)
12. Show settings screen

Fix all bugs found during this walkthrough.

**Deliverable**: 30-minute uninterrupted demo with zero errors

---

## Dev A — Merge Points with Dev B

| When | What to Merge / Sync |
|------|---------------------|
| End of Phase 0 | Sync TypeScript interfaces (`src/types/index.ts`) with Dev B's Rust structs |
| End of Phase 1 | Dev B's `login_user` command must be working before wiring Task 1.1 |
| Start of Phase 2 | Dev B must have `get_products`, `create_product` commands ready |
| Start of Phase 3 | Dev B must have `create_invoice` transaction command ready before testing Phase 3.4 |
| Phase 3 complete | Dev B must have `print_receipt` working so payment flow is end-to-end |
| Phase 6 (ZATCA) | Dev B gives Dev A the QR base64 format so Task 6.1 can display/print it |
| Phase 7 | Dev B must have `get_available_ports` command before printer settings UI works |
| Phase 8 | Both present for joint walkthrough and bug fixes |

---

## Dev A — Parallel Work Opportunities

When you are waiting for a Dev B dependency, here is what you can safely build in advance:

| Waiting for... | Build in advance... |
|----------------|-------------------|
| Dev B Task 2.1 (product commands) | Build the product list UI with hardcoded mock data |
| Dev B Task 3.4 (invoice save) | Build the cart UI and payment modal, use `console.log` instead of invoke |
| Dev B Task 6.1–6.4 (ZATCA engine) | Start Phase 7 Settings UI — fully unblocked after Phase 3 |
| Dev B Task 5.1 (report queries) | Build the charts/tables with static dummy data |

**Pattern to follow**: Build UI with mock/hardcoded data first, then swap in real `invoke()` calls when Dev B's commands are ready.
