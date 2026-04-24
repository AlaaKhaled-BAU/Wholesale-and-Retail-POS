#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;

use futures_util::future::FutureExt;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:pos.db", db::get_migrations())
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir()
                .expect("could not get app data dir");
            std::fs::create_dir_all(&app_dir)
                .expect("could not create app data dir");

            // Initialize structured logging
            if let Err(e) = pos::logging::setup_logging(&app_dir) {
                eprintln!("Failed to initialize logging: {}", e);
            }

            log::info!("POS application starting...");

            let db_path = app_dir.join("pos.db");

            let conn = rusqlite::Connection::open(&db_path)
                .expect("could not open database");

            // Enable WAL mode for better concurrency and crash recovery
            conn.execute_batch(
                "PRAGMA journal_mode = WAL;
                 PRAGMA synchronous = NORMAL;
                 PRAGMA busy_timeout = 5000;
                 PRAGMA foreign_keys = ON;
                 PRAGMA temp_store = MEMORY;
                 PRAGMA mmap_size = 268435456;",
            )
            .expect("could not configure SQLite PRAGMAs");

            // Run schema as safety net
            let schema = include_str!("db/schema.sql");
            conn.execute_batch(schema)
                .expect("could not run schema");

            // Seed if empty (debug builds only — removes hardcoded PINs from production)
            #[cfg(debug_assertions)]
            {
                if let Err(e) = db::seed_if_empty(&conn) {
                    log::error!("Seed error: {}", e);
                }
            }

            app.manage(pos::AppState {
                db: std::sync::Mutex::new(conn),
                current_session: std::sync::Mutex::new(None),
                settings: std::sync::Mutex::new(None),
                rate_limiter: pos::auth::RateLimiter::new(),
            });

            // Load settings into AppState cache
            if let Some(state) = app.try_state::<pos::AppState>() {
                if let Ok(conn) = state.db.lock() {
                    if let Ok(settings) = commands::settings::get_all_settings_inner(&conn) {
                        if let Ok(mut guard) = state.settings.lock() {
                            *guard = Some(settings);
                        }
                    }
                }
            }

            // ZATCA retry queue background task (every 10 minutes) with panic recovery
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(600));
                loop {
                    interval.tick().await;
                    if let Some(state) = handle.try_state::<pos::AppState>() {
                        let result = std::panic::AssertUnwindSafe(
                            commands::zatca::process_zatca_retry_queue(&*state)
                        ).catch_unwind().await;
                        if let Err(panic_err) = result {
                            log::error!("ZATCA queue processor panicked: {:?}", panic_err);
                        }
                    }
                }
            });

            // Daily database backup task (every 24 hours)
            let backup_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Wait 1 hour after startup before first backup
                tokio::time::sleep(tokio::time::Duration::from_secs(3600)).await;
                let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(86400));
                loop {
                    interval.tick().await;
                    if let Some(state) = backup_handle.try_state::<pos::AppState>() {
                        commands::backup::run_daily_backup(&*state);
                    }
                }
            });

            log::info!("POS application initialized successfully");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth (Phase 1)
            commands::users::login_user,
            commands::users::logout_user,
            commands::users::open_cashier_session,
            commands::users::close_cashier_session,
            commands::users::get_current_session,
            // Products (Phase 2)
            commands::products::get_products,
            commands::products::get_product_by_barcode,
            commands::products::create_product,
            commands::products::update_product,
            commands::products::toggle_product_active,
            commands::products::get_categories,
            commands::products::create_category,
            // Inventory (Phase 2)
            commands::inventory::get_inventory,
            commands::inventory::adjust_inventory,
            commands::inventory::get_inventory_by_product,
            // Invoices (Phase 3)
            commands::invoices::create_invoice,
            commands::invoices::get_invoice,
            commands::invoices::get_invoice_by_number,
            commands::invoices::create_refund_invoice,
            // Printing (Phase 3)
            commands::printing::print_receipt,
            commands::printing::print_test_page,
            commands::printing::get_available_ports,
            commands::printing::get_invoice_qr,
            // Customers (Phase 4)
            commands::customers::get_customers,
            commands::customers::create_customer,
            commands::customers::update_customer,
            commands::customers::get_customer_invoices,
            commands::customers::get_customer_balance,
            commands::customers::record_customer_payment,
            // Reports (Phase 5)
            commands::reports::get_daily_summary,
            commands::reports::get_sales_by_period,
            commands::reports::get_inventory_report,
            commands::reports::get_cashier_session_report,
            commands::reports::export_invoices_csv,
            // ZATCA (Phase 6)
            commands::zatca::register_zatca_device,
            commands::zatca::get_zatca_status,
            commands::zatca::retry_zatca_queue,
            // Settings (Phase 7)
            commands::settings::get_setting,
            commands::settings::set_setting,
            commands::settings::get_all_settings,
            commands::settings::complete_setup,
            // Demo (Phase 8)
            commands::settings::seed_demo_data,
            // Backup
            commands::backup::backup_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
