#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;

use tauri::Manager;
use chrono::Timelike;

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:pos.db", db::get_migrations())
                .build(),
        )
        .plugin(tauri_plugin_stronghold::Builder::new(|password| {
            use argon2::{Argon2, PasswordHasher, password_hash::SaltString};
            use rand::rngs::OsRng;
            let salt = SaltString::generate(&mut OsRng);
            let argon2 = Argon2::default();
            let password_hash = argon2
                .hash_password(password.as_bytes(), &salt)
                .expect("Failed to hash password");
            password_hash.hash.unwrap().as_bytes().to_vec()
        }).build())
        .setup(|app| {
            let app_dir = app.path().app_data_dir()
                .expect("could not get app data dir");
            std::fs::create_dir_all(&app_dir)
                .expect("could not create app data dir");
            let db_path = app_dir.join("pos.db");

            let conn = rusqlite::Connection::open(&db_path)
                .expect("could not open database");

            conn.execute("PRAGMA foreign_keys = ON", [])
                .expect("could not enable foreign keys");
            conn.execute("PRAGMA journal_mode = WAL", [])
                .expect("could not enable WAL mode");
            conn.execute("PRAGMA synchronous = NORMAL", [])
                .expect("could not set synchronous mode");

            let schema = include_str!("db/schema.sql");
            conn.execute_batch(schema)
                .expect("could not run schema");

            if let Err(e) = db::seed_if_empty(&conn) {
                eprintln!("Seed error: {}", e);
            }

            app.manage(pos::AppState {
                db: std::sync::Mutex::new(conn),
                current_session: std::sync::Mutex::new(None),
                settings: std::sync::Mutex::new(None),
                rate_limiter: pos::auth::RateLimiter::new(),
            });

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
                loop {
                    let h = handle.clone();
                    let result = tokio::task::spawn(async move {
                        if let Some(state) = h.try_state::<pos::AppState>() {
                            commands::zatca::process_zatca_retry_queue(&state).await;
                        }
                    }).await;

                    if let Err(e) = result {
                        eprintln!("ZATCA queue processor panicked or aborted: {:?}", e);
                    }

                    tokio::time::sleep(tokio::time::Duration::from_secs(600)).await;
                }
            });

            // Daily database backup scheduler (runs at 02:00 every day)
            let handle2 = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    let now = chrono::Local::now();
                    let next_2am = if now.hour() < 2 {
                        now.date_naive().and_hms_opt(2, 0, 0).unwrap()
                    } else {
                        (now + chrono::Duration::days(1)).date_naive().and_hms_opt(2, 0, 0).unwrap()
                    };
                    let duration = (next_2am - now.naive_local()).to_std().unwrap_or(std::time::Duration::from_secs(3600));
                    tokio::time::sleep(tokio::time::Duration::from_secs(duration.as_secs())).await;

                    if let Some(state) = handle2.try_state::<pos::AppState>() {
                        if let Ok(conn) = state.db.lock() {
                            let backup_name = format!(
                                "pos_backup_{}.db",
                                chrono::Local::now().format("%Y%m%d_%H%M%S")
                            );
                            let app_dir = dirs::data_dir()
                                .unwrap_or_default()
                                .join("com.wholesale.pos.app");
                            let backup_path = app_dir.join(&backup_name);
                            let _ = std::fs::create_dir_all(&app_dir);
                            let _ = conn.execute("VACUUM INTO ?1", rusqlite::params![backup_path.to_str().unwrap_or(&backup_name)]);

                            // Clean up backups older than 7 days
                            if let Ok(entries) = std::fs::read_dir(&app_dir) {
                                let mut backups: Vec<_> = entries
                                    .flatten()
                                    .filter(|e| {
                                        e.file_name().to_string_lossy().starts_with("pos_backup_")
                                    })
                                    .collect();
                                backups.sort_by_key(|e| e.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH));
                                if backups.len() > 7 {
                                    for old in backups.iter().take(backups.len() - 7) {
                                        let _ = std::fs::remove_file(old.path());
                                    }
                                }
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::users::login_user,
            commands::users::logout_user,
            commands::users::open_cashier_session,
            commands::users::close_cashier_session,
            commands::users::get_current_session,
            commands::users::create_user,
            commands::products::get_products,
            commands::products::get_product_by_barcode,
            commands::products::create_product,
            commands::products::update_product,
            commands::products::toggle_product_active,
            commands::products::get_categories,
            commands::products::create_category,
            commands::inventory::get_inventory,
            commands::inventory::adjust_inventory,
            commands::inventory::get_inventory_by_product,
            commands::invoices::create_invoice,
            commands::invoices::get_invoice,
            commands::invoices::get_invoice_by_number,
            commands::invoices::create_refund_invoice,
            commands::printing::print_receipt,
            commands::printing::print_test_page,
            commands::printing::get_available_ports,
            commands::printing::get_invoice_qr,
            commands::customers::get_customers,
            commands::customers::create_customer,
            commands::customers::update_customer,
            commands::customers::get_customer_invoices,
            commands::customers::get_customer_balance,
            commands::customers::record_customer_payment,
            commands::reports::get_daily_summary,
            commands::reports::get_sales_by_period,
            commands::reports::get_inventory_report,
            commands::reports::get_cashier_session_report,
            commands::reports::export_invoices_csv,
            commands::zatca::register_zatca_device,
            commands::zatca::get_zatca_status,
            commands::zatca::retry_zatca_queue,
            commands::settings::get_setting,
            commands::settings::set_setting,
            commands::settings::get_all_settings,
            commands::settings::seed_demo_data,
            commands::settings::is_first_run,
            commands::settings::complete_setup,
            commands::settings::backup_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
