# Wholesale POS system (نظام نقاط البيع)

A robust, offline-first, desktop Point of Sale (POS) system tailored for wholesale and retail stores in Saudi Arabia. Built with performance, reliability, and local compliance in mind.

## 🌟 Key Features

*   **Arabic RTL Interface:** Fully localized, right-to-left user interface using Google's Cairo font.
*   **Offline-First Native Desktop App:** Runs entirely locally on Windows, macOS, or Linux. No central server dependency for daily operations.
*   **ZATCA e-Invoicing Compliant (Phase 2):** 
    *   Generates Cryptographic Stamps (ECDSA P-256).
    *   Creates UBL 2.1 XML invoices.
    *   Generates TLV-encoded QR codes (printed on receipts).
    *   Includes a background retry queue for offline submission.
*   **High-Performance Point of Sale:** Lightning-fast barcode scanning ($<50ms$), robust cart management, split payments, and comprehensive refund handling via credit notes.
*   **Secure Authentication:** Role-based access (Admin, Manager, Cashier) with bcrypt-hashed fast PIN login, auto-locking, and cashier session tracking.
*   **Inventory Management:** Real-time stock calculation, low-stock warnings, and detailed audit logging of every adjustment.
*   **Atomic Transactions:** Rock-solid SQLite data integrity. Invoices are saved using single atomic transactions (Header → Lines → Payments → Inventory Decrement → Audit Log).

## 🛠 Tech Stack

**Architecture:** Tauri 2.0 (Rust Backend + React Frontend)

**Frontend:**
*   React 18 + TypeScript
*   Tailwind CSS v4 + shadcn/ui (RTL-aware)
*   Zustand (State Management + LocalStorage Persistence)
*   react-router-dom
*   Recharts (Analytics)
*   date-fns

**Backend (Rust):**
*   `rusqlite`: Direct local database access.
*   `quick-xml`: ZATCA XML Generation.
*   `ring`: Elliptic curve cryptography (ECDSA P-256).
*   `qrcode` & `image`: Base64 PNG QR code generation.
*   `escpos-rs`: Thermal receipt printing support.

## 📂 Project Structure

```text
wholesale-pos/
├── src/                  # React Frontend
│   ├── components/       # Reusable UI elements (RTL optimized)
│   ├── pages/            # Route views (POS, Inventory, Reports)
│   ├── store/            # Zustand state (Auth, Cart, Settings)
│   ├── lib/              # Tauri command wrappers (IPC bridge)
│   ├── types/            # TypeScript interfaces
│   └── styles/           # Tailwind base styles
├── src-tauri/            # Rust Backend
│   ├── src/
│   │   ├── commands/     # Tauri IPC command implementations
│   │   ├── db/           # SQLite schema and seeding logic
│   │   └── main.rs       # Application entry point
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri configuration
└── ai/                   # AI Developer Guides and Implementation Logs
```

## 🚀 Getting Started

### Prerequisites
1.  **Node.js** (v18+) and **pnpm** installed.
2.  **Rust** installed (`rustup`).
3.  **OS Dependencies for Tauri**:
    *   *Linux (Debian/Ubuntu):* `sudo apt update && sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev lld`
    *   *Windows:* Visual Studio C++ Build Tools.
    *   *macOS:* Xcode Command Line Tools.

### Installation

1. Clone the repository and navigate into it:
   ```bash
   git clone git@github.com:AlaaKhaled-BAU/Wholesale-and-Retail-POS.git
   cd Wholesale-and-Retail-POS
   ```

2. Install frontend dependencies:
   ```bash
   pnpm install
   ```

3. Start the application in development mode:
   ```bash
   pnpm tauri dev
   ```
   *(Note: The first run will take a few minutes to compile the Rust backend. Subsequent runs will be significantly faster, especially if the `lld` linker is installed).*

### Default Login
If you are running the app with debugging on, database seeding is available. 
Default Admin PIN: **`1234`**
Default Cashier PIN: **`0000`**

## 📚 Documentation
Detailed development guidelines, database schemas, and architectural logs can be found in the `/ai/` directory.
- `PROJECT_CONTEXT.md`: High-level overview and architectural decisions.
- `SCHEMA_REFERENCE.md`: Complete SQLite database schema.
- `PROJECT_LOG.md`: Live tracking of bugs, completed phases, and blockers.

## ⚖️ License
Proprietary software tailored for specific operational use. Not licensed for public distribution.
