use serde::{Deserialize, Serialize};

// ============================================================
// Core entities — must match TypeScript interfaces exactly
// ============================================================

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Branch {
    pub id: String,
    pub name_ar: String,
    pub name_en: Option<String>,
    pub address: Option<String>,
    pub vat_number: Option<String>,
    pub cr_number: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: String,
    pub branch_id: String,
    pub name_ar: String,
    pub role: String,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionToken {
    pub user_id: String,
    pub name_ar: String,
    pub role: String,
    pub branch_id: String,
    pub session_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: String,
    pub name_ar: String,
    pub name_en: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Product {
    pub id: String,
    pub sku: String,
    pub barcode: Option<String>,
    pub name_ar: String,
    pub name_en: Option<String>,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    pub unit: String,
    pub cost_price: f64,
    pub sell_price: f64,
    pub vat_rate: f64,
    pub is_active: bool,
    pub stock: Option<f64>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NewProduct {
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub name_ar: String,
    pub name_en: Option<String>,
    pub category_id: Option<String>,
    pub unit: Option<String>,
    pub cost_price: Option<f64>,
    pub sell_price: f64,
    pub vat_rate: Option<f64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InventoryItem {
    pub id: String,
    pub branch_id: String,
    pub product_id: String,
    pub product_name_ar: String,
    pub sku: String,
    pub barcode: Option<String>,
    pub qty_on_hand: f64,
    pub low_stock_threshold: f64,
    pub stock_value: f64,
    pub is_low_stock: bool,
    pub last_updated: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Customer {
    pub id: String,
    pub name_ar: String,
    pub phone: Option<String>,
    pub vat_number: Option<String>,
    pub cr_number: Option<String>,
    pub credit_limit: f64,
    pub balance: f64,
    pub customer_type: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NewCustomer {
    pub name_ar: String,
    pub phone: Option<String>,
    pub vat_number: Option<String>,
    pub cr_number: Option<String>,
    pub credit_limit: Option<f64>,
    pub customer_type: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CashierSession {
    pub id: String,
    pub user_id: String,
    pub branch_id: String,
    pub opened_at: String,
    pub closed_at: Option<String>,
    pub opening_float: f64,
    pub closing_cash: Option<f64>,
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Invoice {
    pub id: String,
    pub uuid: String,
    pub branch_id: String,
    pub session_id: String,
    pub cashier_id: String,
    pub customer_id: Option<String>,
    pub customer_name_ar: Option<String>,
    pub invoice_number: String,
    pub invoice_type: String,
    pub status: String,
    pub subtotal: f64,
    pub discount_amount: f64,
    pub vat_amount: f64,
    pub total: f64,
    pub payment_method: String,
    pub notes: Option<String>,
    pub zatca_status: String,
    pub qr_code: Option<String>,
    pub lines: Option<Vec<InvoiceLine>>,
    pub payments: Option<Vec<Payment>>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceLine {
    pub id: String,
    pub invoice_id: String,
    pub product_id: String,
    pub product_name_ar: String,
    pub qty: f64,
    pub unit_price: f64,
    pub discount_pct: f64,
    pub vat_rate: f64,
    pub vat_amount: f64,
    pub line_total: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Payment {
    pub id: String,
    pub invoice_id: String,
    pub method: String,
    pub amount: f64,
    pub reference: Option<String>,
    pub paid_at: String,
}

// Invoice creation payload (from React to Rust)
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NewInvoiceLine {
    pub product_id: String,
    pub product_name_ar: String,
    pub qty: f64,
    pub unit_price: f64,
    pub discount_pct: f64,
    pub vat_rate: f64,
    pub vat_amount: f64,
    pub line_total: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NewPayment {
    pub method: String,
    pub amount: f64,
    pub reference: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NewInvoice {
    pub branch_id: String,
    pub branch_prefix: String,
    pub cashier_id: String,
    pub session_id: String,
    pub customer_id: Option<String>,
    pub invoice_type: String,
    pub lines: Vec<NewInvoiceLine>,
    pub payments: Vec<NewPayment>,
    pub subtotal: f64,
    pub discount_amount: f64,
    pub vat_amount: f64,
    pub total: f64,
    pub notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RefundLine {
    pub product_id: String,
    pub product_name_ar: String,
    pub qty: f64,
    pub unit_price: f64,
    pub vat_rate: f64,
}

// Report types
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DailySummary {
    pub date: String,
    pub invoice_count: i64,
    pub total_sales: f64,
    pub total_vat: f64,
    pub grand_total: f64,
    pub by_payment_method: PaymentMethodBreakdown,
    pub top_products: Vec<TopProduct>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PaymentMethodBreakdown {
    pub cash: f64,
    pub card: f64,
    pub cliq: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TopProduct {
    pub name_ar: String,
    pub qty_sold: f64,
    pub revenue: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DailySales {
    pub sale_date: String,
    pub invoice_count: i64,
    pub total_sales: f64,
    pub total_vat: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InventoryReportRow {
    pub product_id: String,
    pub name_ar: String,
    pub sku: String,
    pub qty_on_hand: f64,
    pub low_stock_threshold: f64,
    pub stock_value: f64,
    pub is_low_stock: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionReport {
    pub session: CashierSession,
    pub invoice_count: i64,
    pub total_sales: f64,
    pub by_payment_method: PaymentMethodBreakdown,
    pub expected_cash: f64,
    pub discrepancy: f64,
}

// ZATCA types
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ZatcaStatusInfo {
    pub registered: bool,
    pub csid_status: String,
    pub pending_count: i64,
    pub rejected_count: i64,
    pub urgent_count: i64,
}

// Settings
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub vat_rate: String,
    pub printer_port: String,
    pub printer_type: String,
    pub branch_name_ar: String,
    pub invoice_note: String,
    pub numerals: String,
    pub auto_lock_minutes: String,
}

// Application state (managed by Tauri)
pub struct AppState {
    pub db: std::sync::Mutex<rusqlite::Connection>,
    pub current_session: std::sync::Mutex<Option<CashierSession>>,
    pub settings: std::sync::Mutex<Option<AppSettings>>,
}
