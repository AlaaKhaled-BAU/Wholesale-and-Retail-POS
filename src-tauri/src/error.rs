use serde::Serialize;

/// Typed error enum for all POS backend commands.
/// All variants serialize to a user-facing Arabic message.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum PosError {
    /// Generic database failure — do not leak internals
    DatabaseError,
    /// Authentication / session failure
    AuthenticationError,
    /// PIN or credentials invalid
    InvalidCredentials(String),
    /// Account locked due to too many failed attempts
    AccountLocked(String),
    /// Missing or invalid session token
    SessionExpired,
    /// Caller does not have required role
    Unauthorized,
    /// Input validation failure with safe message
    ValidationError(String),
    /// Entity not found (invoice, product, user, etc.)
    NotFound(String),
    /// Business rule violation
    BusinessRule(String),
    /// Internal/unexpected error — logged, safe message returned
    InternalError,
}

impl std::fmt::Display for PosError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PosError::DatabaseError => write!(f, "خطأ في قاعدة البيانات"),
            PosError::AuthenticationError => write!(f, "خطأ في المصادقة"),
            PosError::InvalidCredentials(msg) => write!(f, "{}", msg),
            PosError::AccountLocked(msg) => write!(f, "{}", msg),
            PosError::SessionExpired => write!(f, "لا يوجد جلسة نشطة"),
            PosError::Unauthorized => write!(f, "غير مصرح"),
            PosError::ValidationError(msg) => write!(f, "{}", msg),
            PosError::NotFound(msg) => write!(f, "{}", msg),
            PosError::BusinessRule(msg) => write!(f, "{}", msg),
            PosError::InternalError => write!(f, "خطأ داخلي"),
        }
    }
}

impl std::error::Error for PosError {}

// Conversions from common error types

impl From<rusqlite::Error> for PosError {
    fn from(err: rusqlite::Error) -> Self {
        // Log the real error internally, return safe message externally
        eprintln!("[DB ERROR] {:?}", err);
        PosError::DatabaseError
    }
}

impl From<String> for PosError {
    fn from(_msg: String) -> Self {
        PosError::InternalError
    }
}

impl From<&str> for PosError {
    fn from(_msg: &str) -> Self {
        PosError::InternalError
    }
}

impl From<bcrypt::BcryptError> for PosError {
    fn from(_: bcrypt::BcryptError) -> Self {
        PosError::InternalError
    }
}

impl From<std::sync::PoisonError<std::sync::MutexGuard<'_, rusqlite::Connection>>> for PosError {
    fn from(_: std::sync::PoisonError<std::sync::MutexGuard<'_, rusqlite::Connection>>) -> Self {
        PosError::InternalError
    }
}

impl From<std::sync::PoisonError<std::sync::MutexGuard<'_, Option<crate::AppSettings>>>> for PosError {
    fn from(_: std::sync::PoisonError<std::sync::MutexGuard<'_, Option<crate::AppSettings>>>) -> Self {
        PosError::InternalError
    }
}

impl From<serde_json::Error> for PosError {
    fn from(_: serde_json::Error) -> Self {
        PosError::InternalError
    }
}

impl From<reqwest::Error> for PosError {
    fn from(_: reqwest::Error) -> Self {
        PosError::InternalError
    }
}

impl From<quick_xml::Error> for PosError {
    fn from(_: quick_xml::Error) -> Self {
        PosError::InternalError
    }
}

impl From<image::ImageError> for PosError {
    fn from(_: image::ImageError) -> Self {
        PosError::InternalError
    }
}

impl From<qrcode::types::QrError> for PosError {
    fn from(_: qrcode::types::QrError) -> Self {
        PosError::InternalError
    }
}

impl From<ring::error::Unspecified> for PosError {
    fn from(_: ring::error::Unspecified) -> Self {
        PosError::InternalError
    }
}

impl From<base64::DecodeError> for PosError {
    fn from(_: base64::DecodeError) -> Self {
        PosError::InternalError
    }
}

impl From<std::string::FromUtf8Error> for PosError {
    fn from(_: std::string::FromUtf8Error) -> Self {
        PosError::InternalError
    }
}

impl From<std::io::Error> for PosError {
    fn from(err: std::io::Error) -> Self {
        eprintln!("[IO ERROR] {:?}", err);
        PosError::InternalError
    }
}

impl From<keyring::Error> for PosError {
    fn from(err: keyring::Error) -> Self {
        eprintln!("[KEYRING ERROR] {:?}", err);
        PosError::InternalError
    }
}
