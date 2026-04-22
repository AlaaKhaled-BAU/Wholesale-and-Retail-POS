use crate::lib::{Branch, Invoice, InvoiceLine, Payment, ZatcaStatusInfo};
use crate::AppState;
use image::DynamicImage;
use qrcode::QrCode;
use quick_xml::events::{BytesEnd, BytesStart, Event};
use quick_xml::Writer;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;
use std::io::Cursor;

// ============================================================
// Task 6.1.1 — Generate ECDSA P-256 Private Key
// ============================================================
fn generate_private_key() -> Result<Vec<u8>, String> {
    let rng = ring::rand::SystemRandom::new();
    let pkcs8_bytes = ring::signature::EcdsaKeyPair::generate_pkcs8(
        &ring::signature::ECDSA_P256_SHA256_FIXED_SIGNING,
        &rng,
    )
    .map_err(|e| format!("فشل توليد المفتاح: {:?}", e))?;
    Ok(pkcs8_bytes.as_ref().to_vec())
}

// ============================================================
// Task 6.1.2 — Create CSR with ZATCA OID Extensions
// Simplified: returns a placeholder for MVP.
// Full CSR requires openssl crate with custom OIDs.
// ============================================================
fn generate_csr(_private_key: &[u8], _branch: &Branch) -> Result<Vec<u8>, String> {
    // Placeholder: in production, use openssl to create CSR with ZATCA OIDs
    Ok(b"CSR_PLACEHOLDER".to_vec())
}

// ============================================================
// Task 6.1.3 — Compliance Check API Call
// ============================================================
async fn check_zatca_compliance(otp: &str, csr_base64: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/compliance")
        .header("Authorization", format!("Basic {}", base64::encode(otp)))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "csr": csr_base64 }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    match body.get("dispositionMessage").and_then(|v| v.as_str()) {
        Some("ISSUED") => Ok(body
            .get("requestID")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string()),
        _ => Err(format!("فشل التحقق: {:?}", body)),
    }
}

// ============================================================
// Task 6.1.4 — Retrieve CSID
// ============================================================
async fn get_csid(otp: &str, request_id: &str) -> Result<(String, String), String> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/compliance/seals")
        .header("Authorization", format!("Basic {}", base64::encode(otp)))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "requestID": request_id }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    let token = body
        .get("binarySecurityToken")
        .and_then(|v| v.as_str())
        .ok_or("binarySecurityToken not found")?;

    let secret = body
        .get("secret")
        .and_then(|v| v.as_str())
        .ok_or("secret not found")?;

    Ok((token.to_string(), secret.to_string()))
}

// ============================================================
// Task 6.1.5 — register_zatca_device + get_zatca_status
// ============================================================
#[tauri::command]
pub async fn register_zatca_device(
    otp: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // 1. Generate private key
    let private_key = generate_private_key()?;

    // 2. Get branch info for CSR
    let branch = conn
        .query_row(
            "SELECT id, name_ar, name_en, address, vat_number, cr_number, created_at FROM branches LIMIT 1",
            [],
            |row| {
                Ok(Branch {
                    id: row.get(0)?,
                    name_ar: row.get(1)?,
                    name_en: row.get(2)?,
                    address: row.get(3)?,
                    vat_number: row.get(4)?,
                    cr_number: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
        .map_err(|_| "لا يوجد فرع".to_string())?;

    // 3. Generate CSR
    let csr = generate_csr(&private_key, &branch)?;
    let csr_base64 = base64::encode(&csr);

    // 4. Compliance check
    let request_id = check_zatca_compliance(&otp, &csr_base64).await?;

    // 5. Get CSID
    let (_csid, _secret) = get_csid(&otp, &request_id).await?;

    // 6. Store in database (production: use Stronghold)
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params!["zatca_private_key", base64::encode(&private_key)],
    )
    .map_err(|e| e.to_string())?;

    // 7. Mark as registered
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('zatca_registered', 'true')",
        [],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_zatca_status(state: State<AppState>) -> Result<ZatcaStatusInfo, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let registered: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'zatca_registered'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let pending: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM invoices WHERE zatca_status = 'pending'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let rejected: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM invoices WHERE zatca_status = 'rejected'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let urgent: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM zatca_queue q \
             JOIN invoices i ON i.id = q.invoice_id \
             WHERE JULIANDAY('now') - JULIANDAY(i.created_at) > 0.9",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(ZatcaStatusInfo {
        registered: registered.as_deref() == Some("true"),
        csid_status: if registered.is_some() {
            "active".to_string()
        } else {
            "not_registered".to_string()
        },
        pending_count: pending,
        rejected_count: rejected,
        urgent_count: urgent,
    })
}

// ============================================================
// Task 6.2.1 — UBL 2.1 XML Generation (Simplified Invoice)
// ============================================================
fn generate_invoice_xml(invoice: &Invoice, branch: &Branch) -> Result<String, String> {
    let mut writer = Writer::new(Cursor::new(Vec::new()));

    writer
        .write_event(Event::Decl(quick_xml::events::BytesDecl::new(
            "1.0",
            Some("UTF-8"),
            None,
        )))
        .map_err(|e| e.to_string())?;

    let mut root = BytesStart::new("Invoice");
    root.push_attribute((
        "xmlns",
        "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    ));
    root.push_attribute((
        "xmlns:cac",
        "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    ));
    root.push_attribute((
        "xmlns:cbc",
        "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    ));
    writer
        .write_event(Event::Start(root))
        .map_err(|e| e.to_string())?;

    write_xml_element(&mut writer, "cbc:ProfileID", "reporting:1.0")?;
    write_xml_element(&mut writer, "cbc:ID", &invoice.invoice_number)?;
    write_xml_element(&mut writer, "cbc:UUID", &invoice.uuid)?;

    let date = &invoice.created_at[..10];
    let time = &invoice.created_at[11..19];
    write_xml_element(&mut writer, "cbc:IssueDate", date)?;
    write_xml_element(&mut writer, "cbc:IssueTime", time)?;
    write_xml_element(&mut writer, "cbc:InvoiceTypeCode", "388")?;
    write_xml_element(&mut writer, "cbc:DocumentCurrencyCode", "SAR")?;
    write_xml_element(&mut writer, "cbc:TaxCurrencyCode", "SAR")?;

    // Supplier
    writer
        .write_event(Event::Start(BytesStart::new("cac:AccountingSupplierParty")))
        .map_err(|e| e.to_string())?;
    writer
        .write_event(Event::Start(BytesStart::new("cac:Party")))
        .map_err(|e| e.to_string())?;
    writer
        .write_event(Event::Start(BytesStart::new("cac:PartyLegalEntity")))
        .map_err(|e| e.to_string())?;
    write_xml_element(&mut writer, "cbc:RegistrationName", &branch.name_ar)?;
    writer
        .write_event(Event::End(BytesEnd::new("cac:PartyLegalEntity")))
        .map_err(|e| e.to_string())?;
    if let Some(ref vat) = branch.vat_number {
        writer
            .write_event(Event::Start(BytesStart::new("cac:PartyTaxScheme")))
            .map_err(|e| e.to_string())?;
        write_xml_element(&mut writer, "cbc:CompanyID", vat)?;
        writer
            .write_event(Event::Start(BytesStart::new("cac:TaxScheme")))
            .map_err(|e| e.to_string())?;
        write_xml_element(&mut writer, "cbc:ID", "VAT")?;
        writer
            .write_event(Event::End(BytesEnd::new("cac:TaxScheme")))
            .map_err(|e| e.to_string())?;
        writer
            .write_event(Event::End(BytesEnd::new("cac:PartyTaxScheme")))
            .map_err(|e| e.to_string())?;
    }
    writer
        .write_event(Event::End(BytesEnd::new("cac:Party")))
        .map_err(|e| e.to_string())?;
    writer
        .write_event(Event::End(BytesEnd::new("cac:AccountingSupplierParty")))
        .map_err(|e| e.to_string())?;

    // TaxTotal
    writer
        .write_event(Event::Start(BytesStart::new("cac:TaxTotal")))
        .map_err(|e| e.to_string())?;
    let mut tax_amount = BytesStart::new("cbc:TaxAmount");
    tax_amount.push_attribute(("currencyID", "SAR"));
    writer
        .write_event(Event::Start(tax_amount))
        .map_err(|e| e.to_string())?;
    writer
        .write_event(Event::Text(quick_xml::events::BytesText::new(
            &format!("{:.2}", invoice.vat_amount),
        )))
        .map_err(|e| e.to_string())?;
    writer
        .write_event(Event::End(BytesEnd::new("cbc:TaxAmount")))
        .map_err(|e| e.to_string())?;
    writer
        .write_event(Event::End(BytesEnd::new("cac:TaxTotal")))
        .map_err(|e| e.to_string())?;

    // LegalMonetaryTotal
    writer
        .write_event(Event::Start(BytesStart::new("cac:LegalMonetaryTotal")))
        .map_err(|e| e.to_string())?;
    let mut total_amount = BytesStart::new("cbc:TaxInclusiveAmount");
    total_amount.push_attribute(("currencyID", "SAR"));
    writer
        .write_event(Event::Start(total_amount))
        .map_err(|e| e.to_string())?;
    writer
        .write_event(Event::Text(quick_xml::events::BytesText::new(
            &format!("{:.2}", invoice.total),
        )))
        .map_err(|e| e.to_string())?;
    writer
        .write_event(Event::End(BytesEnd::new("cbc:TaxInclusiveAmount")))
        .map_err(|e| e.to_string())?;
    writer
        .write_event(Event::End(BytesEnd::new("cac:LegalMonetaryTotal")))
        .map_err(|e| e.to_string())?;

    // Invoice lines
    if let Some(ref lines) = invoice.lines {
        for (idx, line) in lines.iter().enumerate() {
            writer
                .write_event(Event::Start(BytesStart::new("cac:InvoiceLine")))
                .map_err(|e| e.to_string())?;
            write_xml_element(&mut writer, "cbc:ID", &(idx + 1).to_string())?;
            let mut qty_elem = BytesStart::new("cbc:InvoicedQuantity");
            qty_elem.push_attribute(("unitCode", "EA"));
            writer
                .write_event(Event::Start(qty_elem))
                .map_err(|e| e.to_string())?;
            writer
                .write_event(Event::Text(quick_xml::events::BytesText::new(
                    &format!("{:.2}", line.qty),
                )))
                .map_err(|e| e.to_string())?;
            writer
                .write_event(Event::End(BytesEnd::new("cbc:InvoicedQuantity")))
                .map_err(|e| e.to_string())?;

            let mut line_amount = BytesStart::new("cbc:LineExtensionAmount");
            line_amount.push_attribute(("currencyID", "SAR"));
            writer
                .write_event(Event::Start(line_amount))
                .map_err(|e| e.to_string())?;
            writer
                .write_event(Event::Text(quick_xml::events::BytesText::new(
                    &format!("{:.2}", line.line_total),
                )))
                .map_err(|e| e.to_string())?;
            writer
                .write_event(Event::End(BytesEnd::new("cbc:LineExtensionAmount")))
                .map_err(|e| e.to_string())?;

            // Item
            writer
                .write_event(Event::Start(BytesStart::new("cac:Item")))
                .map_err(|e| e.to_string())?;
            write_xml_element(&mut writer, "cbc:Name", &line.product_name_ar)?;
            writer
                .write_event(Event::End(BytesEnd::new("cac:Item")))
                .map_err(|e| e.to_string())?;

            // Price
            writer
                .write_event(Event::Start(BytesStart::new("cac:Price")))
                .map_err(|e| e.to_string())?;
            let mut price_amount = BytesStart::new("cbc:PriceAmount");
            price_amount.push_attribute(("currencyID", "SAR"));
            writer
                .write_event(Event::Start(price_amount))
                .map_err(|e| e.to_string())?;
            writer
                .write_event(Event::Text(quick_xml::events::BytesText::new(
                    &format!("{:.2}", line.unit_price),
                )))
                .map_err(|e| e.to_string())?;
            writer
                .write_event(Event::End(BytesEnd::new("cbc:PriceAmount")))
                .map_err(|e| e.to_string())?;
            writer
                .write_event(Event::End(BytesEnd::new("cac:Price")))
                .map_err(|e| e.to_string())?;

            writer
                .write_event(Event::End(BytesEnd::new("cac:InvoiceLine")))
                .map_err(|e| e.to_string())?;
        }
    }

    writer
        .write_event(Event::End(BytesEnd::new("Invoice")))
        .map_err(|e| e.to_string())?;

    let result = writer.into_inner().into_inner();
    String::from_utf8(result).map_err(|e| e.to_string())
}

fn write_xml_element(writer: &mut Writer<Cursor<Vec<u8>>>, name: &str, value: &str) -> Result<(), String> {
    writer
        .write_event(Event::Start(BytesStart::new(name)))
        .map_err(|e| e.to_string())?;
    writer
        .write_event(Event::Text(quick_xml::events::BytesText::new(value)))
        .map_err(|e| e.to_string())?;
    writer
        .write_event(Event::End(BytesEnd::new(name)))
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================
// Task 6.3.1 — SHA-256 Hash of XML
// ============================================================
fn hash_invoice_xml(xml: &str) -> String {
    let hash = ring::digest::digest(&ring::digest::SHA256, xml.as_bytes());
    base64::encode(hash.as_ref())
}

// ============================================================
// Task 6.3.2 — ECDSA Signing
// ============================================================
fn sign_invoice_hash(hash: &[u8], private_key_pkcs8: &[u8]) -> Result<String, String> {
    let key_pair = ring::signature::EcdsaKeyPair::from_pkcs8(
        &ring::signature::ECDSA_P256_SHA256_FIXED_SIGNING,
        private_key_pkcs8,
    )
    .map_err(|e| format!("فشل تحميل المفتاح: {:?}", e))?;

    let rng = ring::rand::SystemRandom::new();
    let signature = key_pair
        .sign(&rng, hash)
        .map_err(|e| format!("فشل التوقيع: {:?}", e))?;

    Ok(base64::encode(signature.as_ref()))
}

// ============================================================
// Task 6.3.3 — TLV Encoding (Tags 1–5 for simplified invoice)
// ============================================================
fn build_zatca_tlv(
    seller_name: &str,
    seller_vat: &str,
    timestamp: &str,
    total: f64,
    vat: f64,
) -> Vec<u8> {
    let mut tlv = Vec::new();
    tlv.extend(encode_tlv(1, seller_name.as_bytes()));
    tlv.extend(encode_tlv(2, seller_vat.as_bytes()));
    tlv.extend(encode_tlv(3, timestamp.as_bytes()));
    tlv.extend(encode_tlv(4, format!("{:.2}", total).as_bytes()));
    tlv.extend(encode_tlv(5, format!("{:.2}", vat).as_bytes()));
    tlv
}

fn encode_tlv(tag: u8, value: &[u8]) -> Vec<u8> {
    let mut result = vec![tag];
    let len = value.len();
    if len > 255 {
        result.push(0xFF);
        result.extend_from_slice(&(len as u16).to_be_bytes());
    } else {
        result.push(len as u8);
    }
    result.extend_from_slice(value);
    result
}

// ============================================================
// Task 6.3.4 — QR PNG Generation
// ============================================================
fn generate_qr_png(tlv_bytes: &[u8]) -> Result<String, String> {
    let base64_tlv = base64::encode(tlv_bytes);
    let code = QrCode::new(base64_tlv.as_bytes()).map_err(|e| e.to_string())?;
    let image = code.render::<image::Luma<u8>>().build();
    let dynamic = DynamicImage::ImageLuma8(image);
    let mut png_bytes = Vec::new();
    dynamic
        .write_to(&mut Cursor::new(&mut png_bytes), image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    Ok(base64::encode(&png_bytes))
}

// ============================================================
// Public: generate and store QR for an invoice
// ============================================================
pub fn generate_and_store_invoice_qr(
    invoice_id: &str,
    conn: &rusqlite::Connection,
) -> Result<String, String> {
    // Fetch full invoice
    let invoice = conn
        .query_row(
            "SELECT i.id, i.uuid, i.branch_id, i.session_id, i.cashier_id, i.customer_id, \
             c.name_ar as customer_name_ar, i.invoice_number, i.invoice_type, i.status, \
             i.subtotal, i.discount_amount, i.vat_amount, i.total, i.payment_method, \
             i.notes, i.zatca_status, i.qr_code, i.created_at \
             FROM invoices i \
             LEFT JOIN customers c ON c.id = i.customer_id \
             WHERE i.id = ?1",
            [invoice_id],
            |row| {
                Ok(Invoice {
                    id: row.get(0)?,
                    uuid: row.get(1)?,
                    branch_id: row.get(2)?,
                    session_id: row.get(3)?,
                    cashier_id: row.get(4)?,
                    customer_id: row.get(5)?,
                    customer_name_ar: row.get(6)?,
                    invoice_number: row.get(7)?,
                    invoice_type: row.get(8)?,
                    status: row.get(9)?,
                    subtotal: row.get(10)?,
                    discount_amount: row.get(11)?,
                    vat_amount: row.get(12)?,
                    total: row.get(13)?,
                    payment_method: row.get(14)?,
                    notes: row.get(15)?,
                    zatca_status: row.get(16)?,
                    qr_code: row.get(17)?,
                    lines: None,
                    payments: None,
                    created_at: row.get(18)?,
                })
            },
        )
        .map_err(|_| "الفاتورة غير موجودة".to_string())?;

    // Fetch branch
    let branch = conn
        .query_row(
            "SELECT id, name_ar, name_en, address, vat_number, cr_number, created_at FROM branches WHERE id = ?1",
            [&invoice.branch_id],
            |row| {
                Ok(Branch {
                    id: row.get(0)?,
                    name_ar: row.get(1)?,
                    name_en: row.get(2)?,
                    address: row.get(3)?,
                    vat_number: row.get(4)?,
                    cr_number: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
        .map_err(|_| "الفرع غير موجود".to_string())?;

    // Fetch lines
    let mut lines_stmt = conn
        .prepare(
            "SELECT id, invoice_id, product_id, product_name_ar, qty, unit_price, discount_pct, vat_rate, vat_amount, line_total \
             FROM invoice_lines WHERE invoice_id = ?1"
        )
        .map_err(|e| e.to_string())?;
    let lines: Vec<crate::lib::InvoiceLine> = lines_stmt
        .query_map([invoice_id], |row| {
            Ok(crate::lib::InvoiceLine {
                id: row.get(0)?,
                invoice_id: row.get(1)?,
                product_id: row.get(2)?,
                product_name_ar: row.get(3)?,
                qty: row.get(4)?,
                unit_price: row.get(5)?,
                discount_pct: row.get(6)?,
                vat_rate: row.get(7)?,
                vat_amount: row.get(8)?,
                line_total: row.get(9)?,
            })
        })
        .and_then(|rows| rows.collect())
        .map_err(|e| e.to_string())?;

    let mut invoice_with_lines = invoice;
    invoice_with_lines.lines = Some(lines);

    // Generate XML
    let xml = generate_invoice_xml(&invoice_with_lines, &branch)?;

    // Hash XML
    let xml_hash = hash_invoice_xml(&xml);

    // Try to sign (if key exists)
    let _signature = if let Ok(key_b64) = conn.query_row(
        "SELECT value FROM settings WHERE key = 'zatca_private_key'",
        [],
        |row| row.get::<_, String>(0),
    ) {
        let key_bytes = base64::decode(&key_b64).unwrap_or_default();
        sign_invoice_hash(xml_hash.as_bytes(), &key_bytes).ok()
    } else {
        None
    };

    // Generate TLV
    let tlv = build_zatca_tlv(
        &branch.name_ar,
        &branch.vat_number.unwrap_or_default(),
        &invoice_with_lines.created_at,
        invoice_with_lines.total,
        invoice_with_lines.vat_amount,
    );

    // Generate QR
    let qr_base64 = generate_qr_png(&tlv)?;

    // Store hash and QR
    conn.execute(
        "UPDATE invoices SET invoice_hash = ?1, qr_code = ?2 WHERE id = ?3",
        params![&xml_hash, &qr_base64, invoice_id],
    )
    .map_err(|e| e.to_string())?;

    // Queue for ZATCA submission if registered
    let registered: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'zatca_registered'",
            [],
            |row| row.get(0),
        )
        .optional()
        .unwrap_or(None);

    if registered.as_deref() == Some("true") {
        conn.execute(
            "INSERT OR IGNORE INTO zatca_queue (id, invoice_id) VALUES (?1, ?2)",
            params![format!("QUE-{}", Uuid::new_v4()), invoice_id],
        )
        .ok();
    }

    Ok(qr_base64)
}

// ============================================================
// Task 6.4.1 — Submit to ZATCA (simplified for MVP)
// ============================================================
async fn submit_invoice_to_zatca_api(
    invoice_id: &str,
    conn: &rusqlite::Connection,
) -> Result<(), String> {
    // Get credentials
    let csid: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'zatca_csid'",
            [],
            |row| row.get(0),
        )
        .map_err(|_| "لم يتم تسجيل الجهاز".to_string())?;

    let secret: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'zatca_secret'",
            [],
            |row| row.get(0),
        )
        .map_err(|_| "لم يتم تسجيل الجهاز".to_string())?;

    let hash: String = conn
        .query_row(
            "SELECT invoice_hash FROM invoices WHERE id = ?1",
            [invoice_id],
            |row| row.get(0),
        )
        .map_err(|_| "الفاتورة غير موجودة".to_string())?;

    let uuid: String = conn
        .query_row(
            "SELECT uuid FROM invoices WHERE id = ?1",
            [invoice_id],
            |row| row.get(0),
        )
        .map_err(|_| "الفاتورة غير موجودة".to_string())?;

    let client = reqwest::Client::new();
    let response = client
        .post("https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/reporting/single")
        .header("Authorization", format!("Basic {}", base64::encode(format!("{}:{}", csid, secret))))
        .header("Content-Type", "application/json")
        .header("Accept-Version", "V2")
        .header("Accept-Language", "en")
        .json(&serde_json::json!({
            "invoiceHash": hash,
            "uuid": uuid,
            "invoice": "",
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    match response.status().as_u16() {
        200 => {
            conn.execute(
                "UPDATE invoices SET zatca_status = 'reported' WHERE id = ?1",
                [invoice_id],
            )
            .map_err(|e| e.to_string())?;
            conn.execute(
                "DELETE FROM zatca_queue WHERE invoice_id = ?1",
                [invoice_id],
            )
            .ok();
            Ok(())
        }
        400 => {
            let body = response.text().await.map_err(|e| e.to_string())?;
            conn.execute(
                "UPDATE invoices SET zatca_status = 'rejected', zatca_response = ?1 WHERE id = ?2",
                params![&body, invoice_id],
            )
            .map_err(|e| e.to_string())?;
            Err(format!("مرفوض: {}", body))
        }
        _ => {
            let body = response.text().await.map_err(|e| e.to_string())?;
            Err(format!("خطأ في الخادم: {}", body))
        }
    }
}

// ============================================================
// Task 6.4.2 + 6.4.3 — Retry queue processing
// ============================================================
pub async fn process_zatca_retry_queue(conn: &rusqlite::Connection) {
    let pending: Result<Vec<String>, _> = conn
        .prepare("SELECT invoice_id FROM zatca_queue WHERE attempts < 10")
        .and_then(|mut stmt| {
            let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
            rows.collect()
        });

    if let Ok(invoice_ids) = pending {
        for invoice_id in invoice_ids {
            let _ = submit_invoice_to_zatca_api(&invoice_id, conn).await;
            let _ = conn.execute(
                "UPDATE zatca_queue SET attempts = attempts + 1 WHERE invoice_id = ?1",
                [&invoice_id],
            );
        }
    }

    // Update urgent flag for invoices > 21.6 hours old
    let _ = conn.execute(
        "UPDATE zatca_queue SET urgent = 1 WHERE invoice_id IN ( \
         SELECT i.id FROM zatca_queue q JOIN invoices i ON i.id = q.invoice_id \
         WHERE JULIANDAY('now') - JULIANDAY(i.created_at) > 0.9 )",
        [],
    );
}

#[tauri::command]
pub async fn retry_zatca_queue(state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    process_zatca_retry_queue(&conn).await;
    Ok(())
}
