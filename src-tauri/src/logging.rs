use fern::FormatCallback;
use log::Record;
use std::path::PathBuf;

pub fn setup_logging(app_dir: &PathBuf) -> Result<(), fern::InitError> {
    let log_dir = app_dir.join("logs");
    std::fs::create_dir_all(&log_dir).ok();

    let log_file = log_dir.join("pos.log");
    let error_log = log_dir.join("pos_error.log");

    let dispatch = fern::Dispatch::new()
        .format(|out: FormatCallback, message: &std::fmt::Arguments, record: &Record| {
            out.finish(format_args!(
                "{} [{}] [{}] {}: {}",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f"),
                record.level(),
                record.target(),
                record.line().unwrap_or(0),
                message
            ))
        })
        .level(log::LevelFilter::Info)
        .level_for("pos", log::LevelFilter::Debug)
        .level_for("tauri", log::LevelFilter::Warn)
        .level_for("rustls", log::LevelFilter::Warn)
        .level_for("hyper", log::LevelFilter::Warn)
        .chain(std::io::stdout())
        .chain(fern::log_file(&log_file).map_err(|e| {
            eprintln!("Failed to create log file: {}", e);
            fern::InitError::Io(e)
        })?)
        .chain(
            fern::Dispatch::new()
                .level(log::LevelFilter::Error)
                .chain(fern::log_file(&error_log).map_err(|e| {
                    eprintln!("Failed to create error log file: {}", e);
                    fern::InitError::Io(e)
                })?),
        );

    dispatch.apply()?;

    log::info!("Logging initialized. Log file: {:?}", log_file);
    Ok(())
}

pub fn log_command(command: &str, user_id: &str, result: &str) {
    log::info!(
        target: "pos::commands",
        "command={} user={} result={}",
        command, user_id, result
    );
}

pub fn log_db_error(operation: &str, error: &str) {
    log::error!(
        target: "pos::db",
        "operation={} error={}",
        operation, error
    );
}

pub fn log_zatca_event(event: &str, invoice_id: &str, status: &str) {
    log::info!(
        target: "pos::zatca",
        "event={} invoice={} status={}",
        event, invoice_id, status
    );
}
