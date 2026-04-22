# Wholesale Retail POS — Frontend Master Plan
## Dev A · Frontend / UI · Saudi Arabia Market

---

## Document Legend

| Symbol | Meaning |
|--------|---------|
| ✅ PARALLEL | Work freely — no dependency on your partner |
| ⛔ WAIT | You must wait for the listed dependency first |
| 🔄 SYNC | Sync meeting or Slack check-in needed with partner |
| 🔀 MERGE | Code merge or PR review point — do it together |

---

## 1. Project Overview

**Project Name:** Wholesale Retail POS System  
**Framework:** Tauri 2.0 + React 19 + TypeScript  
**UI Library:** shadcn/ui + Tailwind CSS v4  
**State Management:** Zustand  
**Routing:** React Router v6  
**Layout:** RTL (Right-to-Left) — Arabic Primary  
**Target Market:** Saudi Arabia — ZATCA Compliant  
**Scope:** Multi-branch from Day One (MVP supports single, architecture ready for multi)

**Note:** You (Dev A) own the entire Frontend. Dev B handles all Rust/Tauri backend commands, SQLite schema, and ZATCA crypto. This plan covers every screen, component, button, store, and integration point you need to build.

---

## 2. Tech Stack & Dependencies

### Core Stack
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Desktop Framework | Tauri | 2.0 | Lightweight native app shell |
| Frontend Framework | React | 19 | UI rendering |
| Language | TypeScript | 5.x | Type safety |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| UI Components | shadcn/ui | latest | Accessible, customizable components |
| State Management | Zustand | latest | Simple, boilerplate-free stores |
| Routing | react-router-dom | v6 | Client-side navigation |
| Dates | date-fns | latest | Date manipulation + Hijri support |
| Charts | Recharts | latest | Reports visualizations |
| Icons | Lucide React | latest | Consistent iconography |
| Query | @tanstack/react-query | latest | Server state caching |

### Tauri Plugins (Frontend Side)
- `tauri-plugin-shell` — for printer commands
- `tauri-plugin-store` — local settings persistence (fallback)

### Fonts
- **Primary Arabic:** Cairo (Google Fonts)
- **Fallback:** system-ui, -apple-system, sans-serif

---

## 3. Folder Structure

```
wholesale-pos/
├── .github/
│   └── workflows/           # CI/CD (future)
├── src/
│   ├── components/
│   │   ├── ui/             # shadcn/ui components (auto-installed)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   ├── select.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── ... (add as needed)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx        # Main app wrapper (sidebar + topbar + content)
│   │   │   ├── Sidebar.tsx         # Right sidebar navigation
│   │   │   ├── TopBar.tsx          # Header: branch, user, settings, logout
│   │   │   └── RouteGuard.tsx      # Auth redirect wrapper
│   │   ├── pos/
│   │   │   ├── CartPanel.tsx       # Left cart display + totals
│   │   │   ├── CartItemRow.tsx     # Single cart line item
│   │   │   ├── ProductSearch.tsx   # Search bar + dropdown results
│   │   │   ├── BarcodeInput.tsx    # Hidden input for scanner detection
│   │   │   ├── InvoiceSummary.tsx  # Subtotal, discount, VAT, total display
│   │   │   ├── CustomerSelector.tsx # Select/add customer in POS
│   │   │   ├── DiscountModal.tsx   # Invoice-level discount input
│   │   │   ├── PaymentModal.tsx    # Full-screen payment flow
│   │   │   ├── PaymentCash.tsx     # Cash payment panel
│   │   │   ├── PaymentCard.tsx     # Card payment panel
│   │   │   ├── PaymentMixed.tsx    # Mixed payment panel
│   │   │   ├── PaymentCliq.tsx     # CLIQ payment panel
│   │   │   ├── SuspendedInvoicesDrawer.tsx # Parked invoices list
│   │   │   ├── RefundMode.tsx      # Refund search + item selection
│   │   │   ├── Numpad.tsx          # Reusable numeric keypad
│   │   │   └── ReceiptPreview.tsx  # Receipt preview before print
│   │   ├── inventory/
│   │   │   ├── ProductList.tsx     # Paginated product table
│   │   │   ├── ProductFilters.tsx  # Search + category filter
│   │   │   ├── ProductModal.tsx    # Add/Edit product dialog
│   │   │   ├── CategoryManager.tsx # Inline category CRUD
│   │   │   └── ProductPagination.tsx # Page controls
│   │   ├── customers/
│   │   │   ├── CustomerList.tsx    # Searchable customer table
│   │   │   ├── CustomerModal.tsx   # Add/Edit customer dialog
│   │   │   ├── CustomerDetail.tsx  # Customer profile + history
│   │   │   ├── CustomerSearchPopup.tsx # Quick-search in POS
│   │   │   └── CreditPaymentModal.tsx # Record payment against credit
│   │   ├── reports/
│   │   │   ├── DailyReport.tsx     # KPIs + pie chart + top products
│   │   │   ├── InventoryReport.tsx # Low stock + stock value
│   │   │   ├── PeriodReport.tsx    # Date range + line chart
│   │   │   ├── ShiftReport.tsx     # Session summary + reconciliation
│   │   │   ├── ReportDatePicker.tsx # Hijri/Gregorian date picker
│   │   │   └── ExportButton.tsx    # CSV download trigger
│   │   ├── settings/
│   │   │   ├── StoreInfoSection.tsx    # Name, logo, address, VAT, CR
│   │   │   ├── PrinterSection.tsx      # Printer config + test print
│   │   │   ├── UsersSection.tsx        # User list + add/edit/disable
│   │   │   ├── TaxSection.tsx          # VAT rate + category overrides
│   │   │   ├── BarcodeSection.tsx      # Scanner timeout config
│   │   │   └── ZATCASection.tsx        # CSID status + device reg + retry
│   │   └── common/
│   │       ├── EmptyState.tsx      # Icon + Arabic message + action
│   │       ├── LoadingSpinner.tsx  # Centered spinner overlay
│   │       ├── ErrorBoundary.tsx   # Global error fallback
│   │       ├── OfflineBanner.tsx   # Connectivity warning
│   │       ├── ArabicToast.tsx     # Custom toast with Arabic text
│   │       ├── HijriDate.tsx       # Display both Gregorian and Hijri
│   │       ├── CurrencyDisplay.tsx # Format SAR amounts
│   │       ├── BranchBadge.tsx     # Show current branch
│   │       └── UserAvatar.tsx      # User initials avatar
│   ├── pages/
│   │   ├── LoginPage.tsx           # PIN entry screen
│   │   ├── POSPage.tsx             # Main sales screen
│   │   ├── InventoryPage.tsx       # Product management
│   │   ├── CustomersPage.tsx       # Customer management
│   │   ├── ReportsPage.tsx         # Analytics dashboard
│   │   └── SettingsPage.tsx        # Configuration
│   ├── store/
│   │   ├── useAuthStore.ts         # Session, user, login/logout, inactivity
│   │   ├── useCartStore.ts         # Cart items, customer, discounts, totals
│   │   ├── useProductStore.ts      # Products cache, search, filters
│   │   ├── useCustomerStore.ts     # Customers cache, selected customer
│   │   ├── useInvoiceStore.ts      # Invoices, suspended/parked carts
│   │   ├── useSettingsStore.ts     # Store settings, printer, ZATCA
│   │   └── useSyncStore.ts         # Offline queue status (UI only)
│   ├── hooks/
│   │   ├── useTauriInvoke.ts       # Typed wrapper for tauri invoke
│   │   ├── useBarcodeScanner.ts    # Detect scan events (8+ chars + Enter)
│   │   ├── useInactivityTimer.ts   # Auto-lock after 5 min idle
│   │   ├── useOnlineStatus.ts      # Connectivity check every 30s
│   │   ├── useDebounce.ts          # Debounce hook for search
│   │   ├── usePrinter.ts           # Printer detection + commands
│   │   └── useHijriDate.ts         # Format dates in Hijri
│   ├── lib/
│   │   ├── tauri.ts                # Centralized invoke() helpers
│   │   ├── formatters.ts           # Currency, numbers, dates
│   │   ├── validators.ts           # Form validation rules
│   │   ├── constants.ts            # App-wide constants
│   │   └── utils.ts                # General utilities
│   ├── types/
│   │   ├── index.ts                # Export all types
│   │   ├── product.ts              # Product, Category, PriceTier types
│   │   ├── cart.ts                 # CartItem, CartStore types
│   │   ├── invoice.ts              # Invoice, InvoiceLine, Payment types
│   │   ├── customer.ts             # Customer, CreditAccount types
│   │   ├── user.ts                 # User, Role, Session types
│   │   ├── settings.ts             # StoreSettings, PrinterConfig types
│   │   └── reports.ts              # Report data types
│   ├── styles/
│   │   ├── tokens.css              # Design tokens: colors, spacing, radius
│   │   └── base.css                # RTL reset + global styles
│   ├── App.tsx                     # Root component + router
│   ├── main.tsx                    # Entry point
│   └── index.html                  # HTML template with Cairo font
├── public/
│   └── logo.svg                    # Store logo placeholder
├── src-tauri/
│   ├── src/
│   │   └── main.rs                 # Rust entry (Dev B owns this)
│   ├── Cargo.toml                  # Rust dependencies
│   └── tauri.conf.json             # Window config, permissions
├── tests/
│   └── cartStore.test.ts           # Zustand store unit tests
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── pnpm-lock.yaml
```

---

## 4. Complete UI Specification

### 4.1 Login Page (`/login`)

**Layout:** Full-screen, centered, no sidebar

| Element | Type | Spec |
|---------|------|------|
| PIN Display | Text | 4 circles, fill as digits entered |
| Numpad | Grid 3×4 | Buttons 1-9, clear (C), 0, backspace (⌫) |
| Button Size | Touch target | Minimum 44×44px |
| Error State | Animation | Shake + red border + Arabic error text |
| Lockout | Timer | After 5 fails, 30-second countdown |
| Background | Style | Subtle pattern or solid brand color |
| Language | Text | All Arabic |

**Buttons:**
- `1` through `9` — append digit
- `0` — append zero
- `C` (clear) — clear all digits
- `⌫` (backspace) — remove last digit

**Actions:**
- On 4th digit entered: call `invoke('login_user', { pin })`
- Success: store session in `useAuthStore`, redirect to `/pos`
- Failure: increment fail counter, shake animation, show `الرمز غير صحيح`

**Integration:**
- ⛔ WAIT: Dev B must provide `login_user` command
- Until ready: mock with PIN `1234`

---

### 4.2 App Shell (All Authenticated Pages)

#### Sidebar (`<Sidebar />`) — Right Side

| Nav Item | Icon | Route | Role Access |
|----------|------|-------|-------------|
| لوحة التحكم | LayoutDashboard | /pos | All |
| المبيعات | ShoppingCart | /pos | All |
| المخزون | Package | /inventory | Manager, Admin, Stock |
| العملاء | Users | /customers | Manager, Admin |
| التقارير | BarChart3 | /reports | Manager, Admin, Accountant |
| الإعدادات | Settings | /settings | Manager, Admin |

- Active route: highlighted with primary color + left border
- Collapsible on mobile (hamburger menu)

#### Top Bar (`<TopBar />`)

| Element | Position | Content |
|---------|----------|---------|
| Branch Name | Right | `فرع الرياض` (from settings) |
| User Name | Center | `أحمد محمد` |
| User Role Badge | Next to name | `كاشير` / `مدير` / `مسؤول` |
| Settings Icon | Left | Gear icon → `/settings` |
| Logout Button | Far left | Power icon → clear auth → `/login` |

---

### 4.3 POS Page (`/pos`) — PRIMARY SCREEN

**Layout:** Two-column on desktop
- **Right column (60%):** Product search + barcode + results
- **Left column (40%):** Cart panel + invoice summary

#### Right Panel — Product Search

| Element | Type | Spec |
|---------|------|------|
| Search Input | Text | Placeholder: `ابحث بالاسم أو الباركود...` |
| Debounce | Delay | 300ms after typing stops |
| Results Dropdown | List | Shows: name + price + stock |
| Barcode Hidden Input | Hidden | Auto-focus, captures scanner input |
| Scan Detection | Logic | 8+ chars + Enter within 200ms = scan |

**Buttons:**
- `🔍` (search icon) — visual only
- Result row — click to add to cart
- `باركود غير موجود` toast — red, auto-dismiss 3s

#### Left Panel — Cart (`<CartPanel />`)

**Cart Table Columns:**
| # | Product Name | Qty | Unit Price | Disc % | Line Total | Delete |
|---|-------------|-----|-----------|--------|-----------|--------|

- Qty: inline editable (click to edit, +/- buttons, or type)
- Disc %: inline editable (0-100)
- Delete: 🗑️ icon button
- Empty state: cart icon + `السلة فارغة` + `ابدأ بمسح المنتجات`

**Cart Buttons:**
- `+` / `-` — increment/decrement quantity (qty=0 removes item)
- `🗑️` — remove item from cart
- `تعليق الفاتورة` — save cart to suspended invoices
- `وضع الإرجاع` — toggle refund mode
- `👤 +` — open customer selector
- `💳 الدفع` — open payment modal (primary CTA, large)

#### Invoice Summary Panel

| Field | Style | Calculation |
|-------|-------|-------------|
| المجموع الفرعي | Normal | sum of line totals |
| الخصم على الفاتورة | Editable | user input or 0 |
| ضريبة القيمة المضافة (15%) | Normal | (subtotal - discount) × 0.15 |
| الإجمالي | **Large, Bold** | subtotal - discount + VAT |

**Customer Display:**
- Default: `عميل نقدي` (Cash customer)
- Selected: Company name + `B2B` badge + VAT number

---

### 4.4 Payment Modal (`<PaymentModal />`)

**Layout:** Full-screen overlay (shadcn Dialog), blocks all interaction

**Payment Type Buttons (Top):**
| Button | Icon | Value |
|--------|------|-------|
| `نقدي` | Banknote | cash |
| `فيزا` | CreditCard | card |
| `CLIQ` | Smartphone | cliq |
| `فيزا + نقدي` | Split | mixed |

**Cash Panel (`<PaymentCash />`):**
| Element | Type | Spec |
|---------|------|------|
| Amount Input | Number | Large font, SAR suffix |
| Numpad | Grid | 0-9, 00, 500, 1000 quick buttons |
| Change Display | Text | `الباقي: 45.00 ر.س` in green if ≥0 |
| Confirm Button | Primary | `تأكيد البيع` — disabled if paid < total |

**Card Panel (`<PaymentCard />`):**
- Simple confirm: amount = total
- `تأكيد الدفع بالبطاقة`

**CLIQ Panel (`<PaymentCliq />`):**
- Reference number input
- `تأكيد الدفع عبر CLIQ`

**Mixed Panel (`<PaymentMixed />`):**
| Field | Type | Validation |
|-------|------|------------|
| Cash Amount | Number | cash + card = total |
| Card Amount | Number | auto-calculated |
| Error | Text | `المبلغ غير صحيح` if sum ≠ total |

**All Panels:**
- `إلغاء` button — close modal, return to POS
- On confirm: call `invoke('create_invoice', { cartData })`
- Success: show green toast `تمت العملية بنجاح`, clear cart, trigger print

**Integration:**
- ⛔ WAIT: Dev B must provide `create_invoice` command

---

### 4.5 Suspended Invoices (`<SuspendedInvoicesDrawer />`)

**Trigger:** `تعليق الفاتورة` button on POS

**Drawer Content:**
| Field | Display |
|-------|---------|
| Invoice Label | `فاتورة معلقة #1` |
| Item Count | `5 منتجات` |
| Total | `1,250.00 ر.س` |
| Time Parked | `منذ 10 دقائق` |

**Buttons:**
- Each row: `استعادة` — load into current cart
- `حذف` — remove from suspended (max 5)

**Rules:**
- Max 5 suspended simultaneously
- Persisted in `useInvoiceStore` with Zustand persist

---

### 4.6 Refund Mode (`<RefundMode />`)

**Trigger:** `وضع الإرجاع` button on POS

**Layout:** Replaces normal POS with refund interface

| Element | Type | Spec |
|---------|------|------|
| Search Input | Text | `رقم الفاتورة أو باركود الإيصال...` |
| Invoice Results | List | Original invoice items |
| Item Selection | Checkbox + qty | Select items to return |
| Return Qty | Number | Cannot exceed original qty |

**Buttons:**
- `بحث` — search invoice
- `تأكيد الإرجاع` — call `create_refund_invoice`
- `إلغاء` — exit refund mode
- Refund method: `استرداد نقدي` / `إعادة إلى البطاقة`

**Integration:**
- ⛔ WAIT: Dev B must provide `create_refund_invoice` command

---

### 4.7 Inventory Page (`/inventory`)

**Layout:** Full-width table with filters above

#### Filters Bar
| Element | Type | Spec |
|---------|------|------|
| Search Input | Text | `ابحث بالاسم أو الباركود...` |
| Category Select | Dropdown | All categories + `+ إضافة فئة` |
| Status Toggle | Switch | Active / Inactive |

#### Product Table

| Barcode | Name (AR) | Category | Price | VAT | Stock | Active | Actions |
|---------|-----------|----------|-------|-----|-------|--------|---------|
| 123456 | تفاح أحمر | فواكه | 15.00 | 15% | 45 | ⏻ | ✏️ |

**Pagination:** 50 products per page

**Buttons:**
- `+ إضافة منتج` — open add modal
- `✏️` (per row) — open edit modal
- `⏻` (per row) — toggle active/inactive
- `📂 إدارة الفئات` — inline category CRUD

#### Add/Edit Product Modal (`<ProductModal />`)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Barcode | Text | Yes | Unique |
| Name (AR) | Text | Yes | Min 2 chars |
| Name (EN) | Text | No | — |
| Category | Select | Yes | — |
| Unit | Select | Yes | piece / carton / pallet |
| Sell Price | Number | Yes | > 0 |
| Cost Price | Number | Yes | > 0 |
| VAT Rate | Select | Yes | 0% / 15% (default) |
| Stock Qty | Number | Yes | ≥ 0 |
| Min Stock | Number | No | Alert threshold |
| Active | Switch | — | Default true |
| Wholesale Tiers | Array | No | min_qty + price rows |

**Buttons:**
- `حفظ` — save product
- `إلغاء` — close modal
- `مسح الباركود` — focus barcode input for scanner

**Integration:**
- ⛔ WAIT: Dev B must provide product CRUD commands
- Until ready: mock with local state

---

### 4.8 Customers Page (`/customers`)

#### Customer List

| Name | Phone | VAT Number | Credit Limit | Balance | Actions |
|------|-------|-----------|-------------|---------|---------|
| شركة الأمل | 0501234567 | 3111111111 | 50,000 | 12,500 | ✏️ 👁️ 💰 |

**Buttons:**
- `+ إضافة عميل` — open add modal
- `✏️` — edit customer
- `👁️` — view detail
- `💰` — add payment (credit customers only)

#### Add/Edit Customer Modal

| Field | Type | Required |
|-------|------|----------|
| Name (AR) | Text | Yes |
| Phone | Text | No |
| VAT Number | Text | No |
| CR Number | Text | No |
| Credit Limit | Number | No |
| Address | Text | No |

#### Customer Detail View

| Section | Content |
|---------|---------|
| Profile | All fields + `B2B` badge if VAT present |
| Credit Bar | Progress bar: balance / credit limit |
| Purchase History | Table of invoices |
| Add Payment Button | Record payment against balance |

**Integration:**
- ⛔ WAIT: Dev B must provide customer CRUD commands

---

### 4.9 Reports Page (`/reports`)

**Layout:** Tabs at top, content below

#### Tab 1: التقرير اليومي (Daily Report)

| Element | Type |
|---------|------|
| Date Picker | Single date (default today) |
| KPI Cards | Total Sales | Total Invoices | Avg Invoice | Total VAT |
| Payment Pie Chart | Recharts — Cash / Card / CLIQ / Mixed |
| Top 5 Products | Bar chart or table |
| Export Button | CSV download |

#### Tab 2: تقرير المخزون (Inventory Report)

| Element | Type |
|---------|------|
| Low Stock Table | Items below threshold (red text) |
| Stock Value Card | Total inventory value |
| Category Breakdown | Optional chart |
| Export Button | CSV download |

#### Tab 3: تقرير الفترة (Period Report)

| Element | Type |
|---------|------|
| Date Range | From / To picker |
| Sales Line Chart | Daily sales over period |
| Total VAT | Summary card |
| Total Sales | Summary card |
| Export Button | CSV download |

#### Tab 4: تقرير المناوبة (Shift Report)

| Element | Type |
|---------|------|
| Session Info | Cashier name, open time, close time |
| Sales Summary | Count, total, by payment method |
| Cash Reconciliation | Expected vs actual cash |
| Discrepancy | Highlight if difference |
| Export Button | CSV or print |

**Integration:**
- ⛔ WAIT: Dev B must provide report query commands

---

### 4.10 Settings Page (`/settings`)

#### Section: معلومات المتجر (Store Info)

| Field | Type |
|-------|------|
| Store Name (AR) | Text |
| Store Name (EN) | Text |
| Logo Upload | File input (preview thumbnail) |
| Address | Textarea |
| VAT Number | Text |
| CR Number | Text |

**Live Preview:** Receipt header preview updates in real-time

#### Section: الطابعة (Printer)

| Field | Type | Options |
|-------|------|---------|
| Printer Type | Select | USB / Serial |
| COM Port | Select | COM1–COM9 |
| Paper Width | Select | 58mm / 80mm |

**Buttons:**
- `اختبار الطباعة` — send test page
- `البحث التلقائي` — scan COM1–COM9

#### Section: المستخدمون (Users)

| Column | Content |
|--------|---------|
| Name | User name |
| Role | Cashier / Manager / Admin |
| Branch | Assigned branch |
| Status | Active / Inactive |
| Actions | ✏️ / ⏻ (disable, never delete) |

**Buttons:**
- `+ إضافة مستخدم` — name, role, branch, PIN
- Only visible to Admin/Manager

#### Section: الضرائب (Taxes)

| Field | Type | Spec |
|-------|------|------|
| Default VAT Rate | Select | 15% (locked unless admin) |
| Category Overrides | Table | Category + custom rate |

#### Section: الباركود (Barcode)

| Field | Type | Range |
|-------|------|-------|
| Scanner Timeout | Slider | 100ms – 300ms |

#### Section: ZATCA

| Element | Type |
|---------|------|
| CSID Status | Badge: `نشط` (green) / `منتهي` (red) |
| Device Registration | Button: `تسجيل الجهاز` |
| Retry Queue | Button: `إعادة إرسال الفواتور المعلقة` |
| Pending Count | Badge showing pending invoices |

**Integration:**
- ⛔ WAIT: Dev B must provide settings persistence commands
- Until ready: use local state + localStorage fallback

---

## 5. State Management (Zustand Stores)

### 5.1 useAuthStore

```typescript
interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  login: (pin: string) => Promise<void>;
  logout: () => void;
  lockScreen: () => void;
  unlockScreen: (pin: string) => Promise<void>;
}
```

**Features:**
- Persist session to localStorage
- Auto-lock after 5 minutes inactivity (`useInactivityTimer`)
- Failed attempt counter (reset on success)

---

### 5.2 useCartStore

```typescript
interface CartItem {
  productId: string;
  name: string;
  barcode: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  vatRate: number;
  lineTotal: number; // computed
}

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  invoiceDiscount: number;
  subtotal: number;      // computed
  totalVat: number;      // computed
  grandTotal: number;    // computed
  addItem: (product: Product) => void;
  updateQty: (productId: string, qty: number) => void;
  updateDiscount: (productId: string, percent: number) => void;
  removeItem: (productId: string) => void;
  setCustomer: (customer: Customer | null) => void;
  setInvoiceDiscount: (amount: number) => void;
  clearCart: () => void;
}
```

**Computed Logic:**
- `subtotal` = Σ(item.qty × item.unitPrice × (1 - item.discountPercent/100))
- `totalVat` = (subtotal - invoiceDiscount) × 0.15
- `grandTotal` = subtotal - invoiceDiscount + totalVat

**Important:** All computed values recalculate on every state change. Use Zustand's `subscribe` or derived state pattern.

---

### 5.3 useProductStore

```typescript
interface ProductState {
  products: Product[];
  categories: Category[];
  searchQuery: string;
  selectedCategory: string | null;
  isLoading: boolean;
  fetchProducts: (query?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  addProduct: (product: ProductInput) => Promise<void>;
  updateProduct: (id: string, product: ProductInput) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
}
```

---

### 5.4 useCustomerStore

```typescript
interface CustomerState {
  customers: Customer[];
  selectedCustomer: Customer | null;
  isLoading: boolean;
  fetchCustomers: () => Promise<void>;
  selectCustomer: (customer: Customer | null) => void;
  addCustomer: (customer: CustomerInput) => Promise<void>;
  addPayment: (customerId: string, amount: number) => Promise<void>;
}
```

---

### 5.5 useInvoiceStore

```typescript
interface InvoiceState {
  invoices: Invoice[];
  suspendedCarts: SuspendedCart[];
  currentInvoice: Invoice | null;
  suspendCart: (label: string) => void;
  restoreCart: (id: string) => void;
  deleteSuspended: (id: string) => void;
  createInvoice: (cartData: CartData) => Promise<Invoice>;
}
```

---

### 5.6 useSettingsStore

```typescript
interface SettingsState {
  storeInfo: StoreInfo;
  printerConfig: PrinterConfig;
  vatRate: number;
  scannerTimeout: number;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<SettingsState>) => Promise<void>;
}
```

---

## 6. Complete Button Inventory

### Global Buttons

| Button | Location | Icon | Action | Color |
|--------|----------|------|--------|-------|
| إعدادات | TopBar | Settings | Navigate /settings | Ghost |
| تسجيل الخروج | TopBar | LogOut | Clear auth, /login | Ghost |

### Login Page Buttons

| Button | Key/Icon | Action |
|--------|----------|--------|
| 0-9 | Digits | Append to PIN |
| مسح | C | Clear all digits |
| حذف | ⌫ | Remove last digit |

### POS Page Buttons

| Button | Icon/Text | Location | Action | Priority |
|--------|-----------|----------|--------|----------|
| البحث | Search | Right panel | Trigger product search | — |
| إضافة للسلة | — | Dropdown result | Add product to cart | — |
| + | Plus | Cart row | Increment qty | — |
| - | Minus | Cart row | Decrement qty | — |
| حذف | Trash2 | Cart row | Remove item | Destructive |
| تعليق الفاتورة | PauseCircle | Cart footer | Save to suspended | Secondary |
| وضع الإرجاع | RotateCcw | Cart footer | Toggle refund mode | Secondary |
| + عميل | UserPlus | Cart footer | Open customer selector | Secondary |
| خصم على الفاتورة | Percent | Cart footer | Open discount modal | Secondary |
| الدفع | CreditCard | Cart footer, large | Open payment modal | Primary |

### Payment Modal Buttons

| Button | Icon | Panel | Action |
|--------|------|-------|--------|
| نقدي | Banknote | Top | Switch to cash panel |
| فيزا | CreditCard | Top | Switch to card panel |
| CLIQ | Smartphone | Top | Switch to CLIQ panel |
| فيزا + نقدي | Split | Top | Switch to mixed panel |
| 0-9 | Digits | Cash numpad | Append to amount |
| 00 | — | Cash numpad | Append double zero |
| 500 | — | Cash numpad | Quick add 500 |
| 1000 | — | Cash numpad | Quick add 1000 |
| تأكيد البيع | Check | Bottom | Submit payment, create invoice | Primary |
| إلغاء | X | Bottom | Close modal, return to POS | Ghost |

### Inventory Page Buttons

| Button | Icon | Action | Priority |
|--------|------|--------|----------|
| + إضافة منتج | Plus | Open add modal | Primary |
| ✏️ | Pencil | Open edit modal | Ghost |
| ⏻ | Power | Toggle active | Ghost |
| 📂 إدارة الفئات | Folder | Open category CRUD | Secondary |
| حفظ | Check | Modal | Save product | Primary |
| إلغاء | X | Modal | Close modal | Ghost |

### Customer Page Buttons

| Button | Icon | Action |
|--------|------|--------|
| + إضافة عميل | Plus | Open add modal |
| ✏️ | Pencil | Edit customer |
| 👁️ | Eye | View detail |
| 💰 | DollarSign | Add credit payment |
| حفظ | Check | Save customer |

### Reports Page Buttons

| Button | Icon | Action |
|--------|------|--------|
| تصدير CSV | Download | Export current report |
| اليوم | Calendar | Set date to today |
| الأسبوع | CalendarRange | Set date range to this week |
| الشهر | CalendarDays | Set date range to this month |

### Settings Page Buttons

| Button | Icon | Section | Action |
|--------|------|---------|--------|
| حفظ | Save | All | Save settings | Primary |
| اختبار الطباعة | Printer | Printer | Send test print | Secondary |
| بحث تلقائي | Search | Printer | Auto-detect printer | Secondary |
| + إضافة مستخدم | Plus | Users | Open add user modal | Primary |
| تسجيل الجهاز | Cpu | ZATCA | Trigger device registration | Primary |
| إعادة إرسال | RefreshCw | ZATCA | Retry pending queue | Secondary |

---

## 7. Tauri Command Integration Points

### Commands You Call (invoke)

| Command | Args | Returns | Phase | Status |
|---------|------|---------|-------|--------|
| `login_user` | `{ pin: string }` | `{ token: string, user: User }` | 1 | ⛔ WAIT Dev B |
| `logout_user` | `{ token: string }` | `boolean` | 1 | ⛔ WAIT Dev B |
| `get_products` | `{ query?: string, category?: string, page: number }` | `Product[]` | 2 | ⛔ WAIT Dev B |
| `get_product_by_barcode` | `{ barcode: string }` | `Product` | 3 | ⛔ WAIT Dev B |
| `create_product` | `{ product: ProductInput }` | `Product` | 2 | ⛔ WAIT Dev B |
| `update_product` | `{ id: string, product: ProductInput }` | `Product` | 2 | ⛔ WAIT Dev B |
| `toggle_product_active` | `{ id: string }` | `Product` | 2 | ⛔ WAIT Dev B |
| `get_categories` | — | `Category[]` | 2 | ⛔ WAIT Dev B |
| `create_category` | `{ name: string }` | `Category` | 2 | ⛔ WAIT Dev B |
| `create_invoice` | `{ cartData: CartData }` | `Invoice` | 3 | ⛔ WAIT Dev B |
| `create_refund_invoice` | `{ original_id: string, lines: RefundLine[] }` | `Invoice` | 3 | ⛔ WAIT Dev B |
| `get_customers` | `{ query?: string }` | `Customer[]` | 4 | ⛔ WAIT Dev B |
| `create_customer` | `{ customer: CustomerInput }` | `Customer` | 4 | ⛔ WAIT Dev B |
| `add_customer_payment` | `{ customerId: string, amount: number }` | `Customer` | 4 | ⛔ WAIT Dev B |
| `get_daily_report` | `{ date: string }` | `DailyReportData` | 5 | ⛔ WAIT Dev B |
| `get_inventory_report` | — | `InventoryReportData` | 5 | ⛔ WAIT Dev B |
| `get_period_report` | `{ from: string, to: string }` | `PeriodReportData` | 5 | ⛔ WAIT Dev B |
| `get_shift_report` | `{ sessionId: string }` | `ShiftReportData` | 5 | ⛔ WAIT Dev B |
| `get_invoice_qr` | `{ id: string }` | `Uint8Array` (PNG) | 6 | ⛔ WAIT Dev B |
| `register_zatca_device` | — | `{ status: string }` | 6 | ⛔ WAIT Dev B |
| `retry_zatca_queue` | — | `{ processed: number }` | 6 | ⛔ WAIT Dev B |
| `get_settings` | — | `Settings` | 7 | ⛔ WAIT Dev B |
| `update_settings` | `{ settings: Settings }` | `Settings` | 7 | ⛔ WAIT Dev B |
| `print_receipt` | `{ invoiceId: string }` | `boolean` | 3 | ⛔ WAIT Dev B |
| `detect_printer` | — | `{ port: string, type: string }` | 7 | ⛔ WAIT Dev B |

### Mock Strategy
Until Dev B commands are ready, implement:
1. `src/lib/mockApi.ts` — returns mock data for every command
2. Feature flag `VITE_USE_MOCK=true` in `.env`
3. `useTauriInvoke` hook checks flag, routes to mock or real

---

## 8. RTL & Arabic UI Requirements

### Global Requirements
- `<html dir="rtl" lang="ar">` set in `index.html`
- All user-facing text in Arabic
- Numbers: Western Arabic numerals (1, 2, 3) — NOT Eastern Arabic (١، ٢، ٣)
- Currency: `ر.س` for Arabic context
- VAT Label: `ضريبة القيمة المضافة`

### Typography
- Font: `Cairo` from Google Fonts
- Fallback: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Base size: 16px
- Line height: 1.5

### Layout Mirroring
- Sidebar: RIGHT side (not left)
- Cart panel: LEFT side (not right)
- Text alignment: right by default
- Flex direction: automatically mirrored by `dir="rtl"`
- Margins/Padding: use logical properties (`ms-4`, `me-4`) instead of physical (`ml-4`, `mr-4`)

### Dates
- Display BOTH Gregorian and Hijri on receipts and reports
- Use `Intl.DateTimeFormat` with `calendar: 'islamic-umalqura'`
- Format: `22 أبريل 2026 / 4 شوال 1447`

### Number Formatting
- Thousands separator: `,` (e.g., `10,000`)
- Decimal separator: `.` (e.g., `1,250.50`)
- Currency: always 2 decimal places

---

## 9. Error Handling & UX Patterns

### Global Error Boundary
- Catches all React errors
- Shows friendly Arabic message: `عذراً، حدث خطأ غير متوقع`
- Button: `إعادة تحميل التطبيق`
- Logs error to console for debugging

### Toast System (shadcn Toast)
- **Success:** Green background, checkmark icon, Arabic message
  - `تمت العملية بنجاح` (Operation successful)
  - `تم الحفظ` (Saved successfully)
- **Error:** Red background, X icon, specific Arabic error
  - `الرمز غير صحيح` (Invalid PIN)
  - `باركود غير موجود` (Barcode not found)
  - `المبلغ غير كافٍ` (Insufficient amount)
- **Warning:** Yellow background, alert icon
  - `الكمية غير متوفرة` (Quantity not available)

### Loading States
- Every button that triggers a Tauri command:
  - Shows spinner icon during call
  - Disabled state during call
  - Reverts to normal on completion/error

### Empty States
- Every list/table must have:
  - Relevant icon (e.g., Package for empty inventory)
  - Arabic message: `لا توجد بيانات`
  - Action button: `إضافة جديد` or `تحديث`

### Offline Indicator
- Check connectivity every 30 seconds
- Banner at top: `غير متصل بالإنترنت` (red background)
- All local operations continue working
- Sync queue indicator in settings

---

## 10. Responsive Behavior

### Desktop (Primary Target)
- Minimum resolution: 1280×800
- Two-column POS layout
- Full sidebar always visible

### Tablet (Optional)
- Sidebar collapses to icons-only
- POS layout stacks vertically
- Touch targets minimum 44px

### Print Styles
- Receipt print: 80mm thermal paper width
- Hide all UI chrome (sidebar, buttons)
- Only show receipt content
- Use `@media print` CSS

---

## 11. Accessibility (a11y)

- All interactive elements: keyboard navigable (Tab order)
- Buttons: `aria-label` in Arabic
- Forms: `label` associated with every input
- Color contrast: WCAG AA minimum (4.5:1)
- Focus indicators: visible outline on all focusable elements
- Screen reader: Arabic `aria-live` regions for toasts

---

## 12. Testing Strategy

### Unit Tests (Jest)
- `useCartStore` — add/remove/update totals
- `formatters.ts` — currency, date formatting
- `validators.ts` — form validation rules

### Component Tests (React Testing Library)
- `LoginPage` — PIN entry, validation, lockout
- `CartPanel` — item rendering, qty changes, totals
- `PaymentModal` — button states, validation

### Integration Tests
- Full checkout flow: search → add → payment → print
- Refund flow: search invoice → select items → confirm

### Manual QA Checklist
- [ ] All buttons clickable with mouse
- [ ] All buttons accessible via keyboard
- [ ] RTL layout correct on all screens
- [ ] Arabic text renders correctly (no truncation)
- [ ] Touch targets ≥ 44px on all interactive elements
- [ ] No layout breaks at 1280×800
- [ ] Receipt preview shows correct data
- [ ] Offline banner appears when disconnected

---

## 13. Implementation Phases

### Phase 0 — Setup (3–5 days) ✅ PARALLEL
- [ ] Install Rust, Node.js 20+, pnpm
- [ ] Scaffold Tauri 2.0 with React + TypeScript
- [ ] Configure `tauri.conf.json`: app name, window 1280×800, dir=rtl
- [ ] Setup Git repo: `main` + `develop` branches, branch protection
- [ ] Install Tailwind CSS v4, configure RTL
- [ ] Install shadcn/ui, initialize with base components
- [ ] Add Cairo font to `index.html`
- [ ] Create design tokens (`src/styles/tokens.css`)
- [ ] Create RTL base styles (`src/styles/base.css`)
- [ ] Install dependencies: zustand, react-router-dom, date-fns, recharts, @tanstack/react-query
- [ ] Create folder structure
- [ ] **Deliverable:** `pnpm tauri dev` opens blank window with Arabic RTL layout

### Phase 1 — Auth & Shell (4–6 days) ✅ PARALLEL
- [ ] Build `LoginPage` with PIN pad UI
- [ ] Create `useAuthStore` with session, mock login
- [ ] Implement `AppShell`, `Sidebar`, `TopBar`
- [ ] Setup React Router: `/login`, `/pos`, `/inventory`, `/customers`, `/reports`, `/settings`
- [ ] Implement `RouteGuard` — redirect to `/login` if no session
- [ ] Add inactivity timer hook (5 min auto-lock)
- [ ] **Deliverable:** Login with PIN `1234` → see shell with user name in header

### Phase 2 — Products (5–7 days) ⛔ WAIT
- [ ] ⛔ WAIT for Dev B Task 2.1 (product commands)
- [ ] Build `InventoryPage` with search, filters, pagination
- [ ] Build `ProductList` table with all columns
- [ ] Build `ProductModal` (add/edit) with validation
- [ ] Build `CategoryManager` inline CRUD
- [ ] Connect to real commands when Dev B ready
- [ ] **Deliverable:** Owner can add 20 products manually

### Phase 3 — POS Screen (10–14 days) 🔄 MIXED
- [ ] ✅ `useCartStore` — add, remove, update qty, compute totals
- [ ] ✅ `ProductSearch` — debounced search, dropdown results
- [ ] ✅ `BarcodeInput` — detect scan events (8+ chars + Enter)
- [ ] ⛔ `CartPanel` UI — wait for cart store complete
- [ ] ⛔ `PaymentModal` — wait for cart UI + Dev B create_invoice
- [ ] ⛔ `SuspendedInvoices` — wait for cart UI
- [ ] ⛔ `RefundMode` — wait for payment modal + Dev B refund command
- [ ] 🔄 `ReceiptPreview` — sync with Dev B on print format
- [ ] **Deliverable:** Full sale flow — scan → cart → payment → print

### Phase 4 — Customers (4–5 days) ✅ PARALLEL (mostly)
- [ ] ⛔ WAIT for Dev B Task 4.1 (customer commands)
- [ ] Build `CustomersPage` with searchable table
- [ ] Build `CustomerModal` (add/edit)
- [ ] Build `CustomerDetail` with history
- [ ] Build `CustomerSearchPopup` for POS quick-select
- [ ] **Deliverable:** Select B2B customer on POS, VAT number appears on invoice

### Phase 5 — Reports (4–5 days) ✅ PARALLEL (mostly)
- [ ] ⛔ WAIT for Dev B Task 5.1 (report queries)
- [ ] Build `ReportsPage` with 4 tabs
- [ ] Build `DailyReport` with KPI cards + Recharts pie
- [ ] Build `InventoryReport` with low stock highlighting
- [ ] Build `PeriodReport` with line chart
- [ ] Build `ShiftReport` with reconciliation
- [ ] Add CSV export buttons
- [ ] **Deliverable:** Reports page with real data, CSV export works

### Phase 6 — ZATCA (6–8 days) 🔄 PARTIAL
- [ ] ✅ Build ZATCA section in Settings (UI only)
- [ ] ⛔ WAIT for Dev B Task 6.3 (QR generation)
- [ ] Integrate QR PNG into receipt print
- [ ] Add ZATCA status badges to invoice list
- [ ] **Deliverable:** QR prints on receipt, ZATCA status visible

### Phase 7 — Settings (3–4 days) ✅ PARALLEL
- [ ] Build all settings sections
- [ ] Add receipt header live preview
- [ ] Add printer test functionality
- [ ] ⛔ WAIT for Dev B Task 7.2 (settings persistence)
- [ ] **Deliverable:** Store info saved, printer configured

### Phase 8 — Polish (4–5 days) ✅ PARALLEL
- [ ] Global error boundary
- [ ] Toast system on all actions
- [ ] Loading states on all buttons
- [ ] Empty states on all lists
- [ ] Offline indicator
- [ ] Arabic form validation messages
- [ ] 🔀 Joint demo walkthrough with Dev B
- [ ] **Deliverable:** 30-minute demo runs without errors

---

## 14. Sync Points with Dev B

| When | Action | Who |
|------|--------|-----|
| End of Phase 0 | Merge branches, verify `pnpm tauri dev` works | Both |
| Task 2.1 → 2.2 | Dev B completes Rust product commands | Dev B |
| Task 3.1 → 3.3 | Finish Cart Store before Cart UI | Dev A |
| Task 3.4 → 3.5 | Dev B finishes `create_invoice` | Dev B |
| End of Phase 3 | PR review together | Both |
| Phase 6 (ZATCA) | Dev B provides QR bytes, Dev A renders | Both |
| Phase 8 Task 8.4 | Full joint walkthrough demo | Both |

---

## 15. Quick Reference: All Routes

| Route | Page | Access |
|-------|------|--------|
| `/login` | LoginPage | Public |
| `/pos` | POSPage | All roles |
| `/inventory` | InventoryPage | Manager, Admin, Stock |
| `/customers` | CustomersPage | Manager, Admin |
| `/reports` | ReportsPage | Manager, Admin, Accountant |
| `/settings` | SettingsPage | Manager, Admin |
| `*` | Redirect to `/pos` | — |

---

## 16. Environment Variables

Create `.env` in project root:

```bash
VITE_APP_NAME=Wholesale POS
VITE_APP_VERSION=1.0.0
VITE_DEFAULT_VAT_RATE=15
VITE_CURRENCY=SAR
VITE_DEFAULT_BRANCH_ID=1
VITE_USE_MOCK=true  # Set to false when Dev B commands ready
```

---

## 17. npm/pnpm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint . --ext ts,tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
  }
}
```

---

## 18. Color Palette (Design Tokens)

Define in `src/styles/tokens.css`:

```css
:root {
  /* Primary */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;

  /* Success */
  --color-success-50: #f0fdf4;
  --color-success-500: #22c55e;
  --color-success-600: #16a34a;

  /* Warning */
  --color-warning-50: #fffbeb;
  --color-warning-500: #f59e0b;
  --color-warning-600: #d97706;

  /* Destructive */
  --color-destructive-50: #fef2f2;
  --color-destructive-500: #ef4444;
  --color-destructive-600: #dc2626;

  /* Neutral */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-500: #6b7280;
  --color-gray-700: #374151;
  --color-gray-900: #111827;

  /* Background */
  --color-background: #ffffff;
  --color-foreground: #111827;

  /* Border */
  --color-border: #e5e7eb;

  /* Spacing */
  --spacing-1: 0.25rem;  /* 4px */
  --spacing-2: 0.5rem;   /* 8px */
  --spacing-3: 0.75rem;  /* 12px */
  --spacing-4: 1rem;     /* 16px */
  --spacing-6: 1.5rem;   /* 24px */
  --spacing-8: 2rem;     /* 32px */

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
```

---

## 19. File Naming Conventions

- **Components:** PascalCase (e.g., `CartPanel.tsx`)
- **Pages:** PascalCase + `Page` suffix (e.g., `POSPage.tsx`)
- **Stores:** camelCase + `Store` suffix (e.g., `useCartStore.ts`)
- **Hooks:** camelCase + `use` prefix (e.g., `useBarcodeScanner.ts`)
- **Types:** PascalCase (e.g., `CartItem.ts`)
- **Utils:** camelCase (e.g., `formatters.ts`)
- **Styles:** kebab-case (e.g., `tokens.css`)

---

## 20. Git Workflow

### Branch Strategy
- `main` — production-ready, protected
- `develop` — integration branch, protected
- `feature/phase-X-task-Y` — feature branches (e.g., `feature/phase-1-login`)

### Commit Messages (Arabic/English)
Use English for commits:
```
feat: add PIN login screen with RTL layout
fix: correct cart total calculation for discounts
feat: integrate ZATCA QR code rendering
chore: update design tokens for accessibility
```

### Pull Requests
- All changes via PR to `develop`
- Require 1 review before merge (from Dev B)
- End of Phase 3: merge `develop` → `main` together

---

## 21. Performance Checklist

- [ ] Lazy load routes (`React.lazy` + `Suspense`)
- [ ] Debounce search inputs (300ms)
- [ ] Virtualize long lists (if >100 items)
- [ ] Memoize computed values in Zustand
- [ ] Use `React.memo` for static components
- [ ] Optimize images (logo max 100KB)
- [ ] Bundle size < 5MB (Tauri handles rest)

---

## 22. Security Checklist

- [ ] Never log PINs or tokens to console
- [ ] Sanitize all user inputs before display
- [ ] Validate all numbers (qty, price) on frontend
- [ ] Store session token securely (Tauri secure storage)
- [ ] Clear all stores on logout
- [ ] Disable dev tools in production build

---

## 23. Next Steps (Immediate Action Items)

1. **Verify Dev Environment:**
   - [ ] Run `rustc --version` (should be 1.70+)
   - [ ] Run `node --version` (should be 20+)
   - [ ] Run `pnpm --version` (should be 8+)

2. **Initialize Project:**
   - [ ] Run `pnpm create tauri-app --template react-ts`
   - [ ] Configure `tauri.conf.json` for 1280×800, RTL
   - [ ] Push initial commit to GitHub

3. **Install Dependencies:**
   - [ ] `pnpm add zustand react-router-dom date-fns recharts @tanstack/react-query`
   - [ ] `pnpm dlx shadcn@latest init`
   - [ ] `pnpm dlx shadcn@latest add button dialog input table select toast badge card tabs drawer tooltip`

4. **Setup Foundation:**
   - [ ] Add Cairo font to `index.html`
   - [ ] Create `src/styles/tokens.css` and `src/styles/base.css`
   - [ ] Create folder structure
   - [ ] Setup React Router with placeholder pages

5. **Start Phase 1:**
   - [ ] Build `LoginPage`
   - [ ] Build `AppShell`, `Sidebar`, `TopBar`
   - [ ] Implement `useAuthStore`
   - [ ] Add route guards

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-22  
**Owner:** Dev A (Frontend)  
**Partner:** Dev B (Backend/Rust)

---

*This plan covers every screen, component, button, store, and integration point for the Wholesale Retail POS frontend. Refer to this document throughout development.*