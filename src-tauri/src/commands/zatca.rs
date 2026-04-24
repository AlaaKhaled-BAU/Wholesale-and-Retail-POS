use pos::{Branch, Invoice, ZatcaStatusInfo};
use pos::AppState;
use pos::auth::{require_role, Role};
use pos::error::PosError;
use pos::secret_store;
use rusqlite::OptionalExtension;
use image::DynamicImage;
use qrcode::QrCode;
use quick_xml::events::{BytesEnd, BytesStart, Event};
use quick_xml::Writer;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;
use std::io::Cursor;
use base64::{Engine as _, engine::general_purpose};

fn generate_private_key() -> Result<Vec<u8>, PosError> {
    let rng = ring::rand::SystemRandom::new();
    let pkcs8_bytes = ring::signature::EcdsaKeyPair::generate_pkcs8(
        &ring::signature::ECDSA_P256_SHA256_FIXED_SIGNING,
        &rng,
    )
    .map_err(|e| format!("فشل توليد المفتاح: {:?}", e))?;
    Ok(pkcs8_bytes.as_ref().to_vec())
}

fn generate_csr(_private_key: &[u8], _branch: &Branch) -> Result<Vec<u8>, PosError> {
    Ok(b"CSR_PLACEHOLDER".to_vec())
}

async fn check_zatca_compliance(otp: &str, csr_base64: &str) -> Result<String, PosError> {
    let client = reqwest::Client::new();
    let base_url = if cfg!(debug_assertions) {
        "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/compliance"
    } else {
        "https://gw-fatoora.zatca.gov.sa/e-invoicing/core/compliance"
    };
    let response = client
        .post(base_url)
        .header("Authorization", format!("Basic {}", general_purpose::STANDARD.encode(otp)))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "csr": csr_base64 }))
        .send()
        .await
        ?;

    let body: serde_json::Value = response.json().await?;

    match body.get("dispositionMessage").and_then(|v| v.as_str()) {
        Some("ISSUED") => Ok(body
            .get("requestID")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string()),
        _ => Err(PosError::BusinessRule(format!("فشل التحقق: {:?}", body))),
    }
}

async fn get_csid(otp: &str, request_id: &str) -> Result<(String, String), PosError> {
    let client = reqwest::Client::new();
    let base_url = if cfg!(debug_assertions) {
        "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/compliance/seals"
    } else {
        "https://gw-fatoora.zatca.gov.sa/e-invoicing/core/compliance/seals"
    };
    let response = client
        .post(base_url)
        .header("Authorization", format!("Basic {}", general_purpose::STANDARD.encode(otp)))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "requestID": request_id }))
        .send()
        .await
        ?;

    let body: serde_json::Value = response.json().await?;

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

#[tauri::command]
pub async fn register_zatca_device(
    otp: String,
    state: State<'_, AppState>,
) -> Result<(), PosError> {
    let _token = require_role(&state, &[Role::Admin])?;

    let csr_base64 = {
        let conn = state.db.lock()?;

        let private_key = generate_private_key()?;

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
            .map_err(|_| PosError::NotFound("لا يوجد فرع".to_string()).to_string())?;

        let csr = generate_csr(&private_key, &branch)?;
        let csr_b64 = general_purpose::STANDARD.encode(&csr);

        // Store private key in secure secret store instead of plaintext SQLite
        secret_store::store_secret("zatca_private_key", &general_purpose::STANDARD.encode(&private_key))
            .map_err(|e| format!("فشل تخزين المفتاح: {}", e))?;

        csr_b64
    };

    let request_id = check_zatca_compliance(&otp, &csr_base64).await?;
    let (csid, secret) = get_csid(&otp, &request_id).await?;

    // Store CSID and secret securely
    secret_store::store_secret("zatca_csid", &csid)
        .map_err(|e| format!("فشل تخزين CSID: {}", e))?;
    secret_store::store_secret("zatca_secret", &secret)
        .map_err(|e| format!("فشل تخزين Secret: {}", e))?;

    {
        let conn = state.db.lock()?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('zatca_registered', 'true')",
            [],
        )
        ?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_zatca_status(state: State<AppState>) -> Result<ZatcaStatusInfo, PosError> {
    let _token = require_role(&state, &[Role::Manager])?;
    let conn = state.db.lock()?;

    let registered: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'zatca_registered'",
            [],
            |row| row.get(0),
        )
        .optional()
        ?;

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

fn generate_invoice_xml(invoice: &Invoice, branch: &Branch) -> Result<String, PosError> {
    let mut writer = Writer::new(Cursor::new(Vec::new()));

    writer
        .write_event(Event::Decl(quick_xml::events::BytesDecl::new(
            "1.0",
            Some("UTF-8"),
            None,
        )))
        ?;

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
        ?;

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

    writer
        .write_event(Event::Start(BytesStart::new("cac:AccountingSupplierParty")))
        ?;
    writer
        .write_event(Event::Start(BytesStart::new("cac:Party")))
        ?;
    writer
        .write_event(Event::Start(BytesStart::new("cac:PartyLegalEntity")))
        ?;
    write_xml_element(&mut writer, "cbc:RegistrationName", &branch.name_ar)?;
    writer
        .write_event(Event::End(BytesEnd::new("cac:PartyLegalEntity")))
        ?;
    if let Some(ref vat) = branch.vat_number {
        writer
            .write_event(Event::Start(BytesStart::new("cac:PartyTaxScheme")))
            ?;
        write_xml_element(&mut writer, "cbc:CompanyID", vat)?;
        writer
            .write_event(Event::Start(BytesStart::new("cac:TaxScheme")))
            ?;
        write_xml_element(&mut writer, "cbc:ID", "VAT")?;
        writer
            .write_event(Event::End(BytesEnd::new("cac:TaxScheme")))
            ?;
        writer
            .write_event(Event::End(BytesEnd::new("cac:PartyTaxScheme")))
            ?;
    }
    writer
        .write_event(Event::End(BytesEnd::new("cac:Party")))
        ?;
    writer
        .write_event(Event::End(BytesEnd::new("cac:AccountingSupplierParty")))
        ?;

    writer
        .write_event(Event::Start(BytesStart::new("cac:TaxTotal")))
        ?;
    let mut tax_amount = BytesStart::new("cbc:TaxAmount");
    tax_amount.push_attribute(("currencyID", "SAR"));
    writer
        .write_event(Event::Start(tax_amount))
        ?;
    writer
        .write_event(Event::Text(quick_xml::events::BytesText::new(
            &format!("{:.2}", invoice.vat_amount),
        )))
        ?;
    writer
        .write_event(Event::End(BytesEnd::new("cbc:TaxAmount")))
        ?;
    writer
        .write_event(Event::End(BytesEnd::new("cac:TaxTotal")))
        ?;

    writer
        .write_event(Event::Start(BytesStart::new("cac:LegalMonetaryTotal")))
        ?;
    let mut total_amount = BytesStart::new("cbc:TaxInclusiveAmount");
    total_amount.push_attribute(("currencyID", "SAR"));
    writer
        .write_event(Event::Start(total_amount))
        ?;
    writer
        .write_event(Event::Text(quick_xml::events::BytesText::new(
            &format!("{:.2}", invoice.total),
        )))
        ?;
    writer
        .write_event(Event::End(BytesEnd::new("cbc:TaxInclusiveAmount")))
        ?;
    writer
        .write_event(Event::End(BytesEnd::new("cac:LegalMonetaryTotal")))
        ?;

    if let Some(ref lines) = invoice.lines {
        for (idx, line) in lines.iter().enumerate() {
            writer
                .write_event(Event::Start(BytesStart::new("cac:InvoiceLine")))
                ?;
            write_xml_element(&mut writer, "cbc:ID", &(idx + 1).to_string())?;
            let mut qty_elem = BytesStart::new("cbc:InvoicedQuantity");
            qty_elem.push_attribute(("unitCode", "EA"));
            writer
                .write_event(Event::Start(qty_elem))
                ?;
            writer
                .write_event(Event::Text(quick_xml::events::BytesText::new(
                    &format!("{:.2}", line.qty),
                )))
                ?;
            writer
                .write_event(Event::End(BytesEnd::new("cbc:InvoicedQuantity")))
                ?;

            let mut line_amount = BytesStart::new("cbc:LineExtensionAmount");
            line_amount.push_attribute(("currencyID", "SAR"));
            writer
                .write_event(Event::Start(line_amount))
                ?;
            writer
                .write_event(Event::Text(quick_xml::events::BytesText::new(
                    &format!("{:.2}", line.line_total),
                )))
                ?;
            writer
                .write_event(Event::End(BytesEnd::new("cbc:LineExtensionAmount")))
                ?;

            writer
                .write_event(Event::Start(BytesStart::new("cac:Item")))
                ?;
            write_xml_element(&mut writer, "cbc:Name", &line.product_name_ar)?;
            writer
                .write_event(Event::End(BytesEnd::new("cac:Item")))
                ?;

            writer
                .write_event(Event::Start(BytesStart::new("cac:Price")))
                ?;
            let mut price_amount = BytesStart::new("cbc:PriceAmount");
            price_amount.push_attribute(("currencyID", "SAR"));
            writer
                .write_event(Event::Start(price_amount))
                ?;
            writer
                .write_event(Event::Text(quick_xml::events::BytesText::new(
                    &format!("{:.2}", line.unit_price),
                )))
                ?;
            writer
                .write_event(Event::End(BytesEnd::new("cbc:PriceAmount")))
                ?;
            writer
                .write_event(Event::End(BytesEnd::new("cac:Price")))
                ?;

            writer
                .write_event(Event::End(BytesEnd::new("cac:InvoiceLine")))
                ?;
        }
    }

    writer
        .write_event(Event::End(BytesEnd::new("Invoice")))
        ?;

    let result = writer.into_inner().into_inner();
    Ok(String::from_utf8(result)?)
}

fn write_xml_element(writer: &mut Writer<Cursor<Vec<u8>>>, name: &str, value: &str) -> Result<(), PosError> {
    writer
        .write_event(Event::Start(BytesStart::new(name)))
        ?;
    writer
        .write_event(Event::Text(quick_xml::events::BytesText::new(value)))
        ?;
    writer
        .write_event(Event::End(BytesEnd::new(name)))
        ?;
    Ok(())
}

fn hash_invoice_xml(xml: &str) -> String {
    let hash = ring::digest::digest(&ring::digest::SHA256, xml.as_bytes());
    general_purpose::STANDARD.encode(hash.as_ref())
}

fn sign_invoice_hash(hash: &[u8], private_key_pkcs8: &[u8]) -> Result<String, PosError> {
    let rng = ring::rand::SystemRandom::new();
    let key_pair = ring::signature::EcdsaKeyPair::from_pkcs8(
        &ring::signature::ECDSA_P256_SHA256_FIXED_SIGNING,
        private_key_pkcs8,
        &rng,
    )
    .map_err(|e| format!("فشل تحميل المفتاح: {:?}", e))?;

    let signature = key_pair
        .sign(&rng, hash)
        .map_err(|e| format!("فشل التوقيع: {:?}", e))?;

    Ok(general_purpose::STANDARD.encode(signature.as_ref()))
}

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

fn generate_qr_png(tlv_bytes: &[u8]) -> Result<String, PosError> {
    let base64_tlv = general_purpose::STANDARD.encode(tlv_bytes);
    let code = QrCode::new(base64_tlv.as_bytes())?;
    let image = code.render::<image::Luma<u8>>().build();
    let dynamic = DynamicImage::ImageLuma8(image);
    let mut png_bytes = Vec::new();
    dynamic
        .write_to(&mut Cursor::new(&mut png_bytes), image::ImageFormat::Png)
        ?;
    Ok(general_purpose::STANDARD.encode(&png_bytes))
}

pub fn generate_and_store_invoice_qr(
    invoice_id: &str,
    conn: &rusqlite::Connection,
) -> Result<String, PosError> {
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
        .map_err(|_| PosError::NotFound("الفاتورة غير موجودة".to_string()).to_string())?;

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
        .map_err(|_| PosError::NotFound("الفرع غير موجود".to_string()).to_string())?;

    let mut lines_stmt = conn
        .prepare(
            "SELECT id, invoice_id, product_id, product_name_ar, qty, unit_price, discount_pct, vat_rate, vat_amount, line_total \
             FROM invoice_lines WHERE invoice_id = ?1"
        )
        ?;
    let lines: Vec<pos::InvoiceLine> = lines_stmt
        .query_map([invoice_id], |row| {
            Ok(pos::InvoiceLine {
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
        ?;

    let mut invoice_with_lines = invoice;
    invoice_with_lines.lines = Some(lines);

    let xml = generate_invoice_xml(&invoice_with_lines, &branch)?;
    let xml_hash = hash_invoice_xml(&xml);

    // Try to sign using key from secure store
    let _signature = if let Ok(Some(key_b64)) = secret_store::get_secret("zatca_private_key") {
        let key_bytes = general_purpose::STANDARD.decode(&key_b64).unwrap_or_default();
        sign_invoice_hash(xml_hash.as_bytes(), &key_bytes).ok()
    } else {
        None
    };

    let tlv = build_zatca_tlv(
        &branch.name_ar,
        &branch.vat_number.unwrap_or_default(),
        &invoice_with_lines.created_at,
        invoice_with_lines.total,
        invoice_with_lines.vat_amount,
    );

    let qr_base64 = generate_qr_png(&tlv)?;

    conn.execute(
        "UPDATE invoices SET invoice_hash = ?1, qr_code = ?2 WHERE id = ?3",
        params![&xml_hash, &qr_base64, invoice_id],
    )
    ?;

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

async fn submit_invoice_to_zatca_api(
    csid: &str,
    secret: &str,
    hash: &str,
    uuid: &str,
) -> Result<String, PosError> {
    let client = reqwest::Client::new();
    let base_url = if cfg!(debug_assertions) {
        "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/reporting/single"
    } else {
        "https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/reporting/single"
    };
    let response = client
        .post(base_url)
        .header("Authorization", format!("Basic {}", general_purpose::STANDARD.encode(format!("{}:{}", csid, secret))))
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
        ?;

    match response.status().as_u16() {
        200 => Ok("reported".to_string()),
        400 => {
            let body = response.text().await?;
            Err(PosError::BusinessRule(format!("rejected:{}", body)))
        }
        _ => {
            let body = response.text().await?;
            Err(PosError::BusinessRule(format!("error:{}", body)))
        }
    }
}

pub async fn process_zatca_retry_queue(state: &AppState) {
    let invoice_ids = {
        let conn = match state.db.lock() {
            Ok(c) => c,
            Err(_) => return,
        };
        let pending: Result<Vec<String>, _> = conn
            .prepare("SELECT invoice_id FROM zatca_queue WHERE attempts < 10")
            .and_then(|mut stmt| {
                let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
                rows.collect()
            });
        pending.unwrap_or_default()
    };

    for invoice_id in invoice_ids {
        let (csid, secret, hash, uuid) = {
            let conn = match state.db.lock() {
                Ok(c) => c,
                Err(_) => continue,
            };
            let csid = secret_store::get_secret("zatca_csid").ok().flatten();
            let secret = secret_store::get_secret("zatca_secret").ok().flatten();
            let hash = conn
                .query_row("SELECT invoice_hash FROM invoices WHERE id = ?1", [&invoice_id], |row| row.get::<_, String>(0));
            let uuid = conn
                .query_row("SELECT uuid FROM invoices WHERE id = ?1", [&invoice_id], |row| row.get::<_, String>(0));
            match (csid, secret, hash, uuid) {
                (Some(c), Some(s), Ok(h), Ok(u)) => (c, s, h, u),
                _ => continue,
            }
        };

        let result = submit_invoice_to_zatca_api(&csid, &secret, &hash, &uuid).await;

        let _ = {
            let conn = match state.db.lock() {
                Ok(c) => c,
                Err(_) => continue,
            };
            match &result {
                Ok(status) if status == "reported" => {
                    let _ = conn.execute(
                        "UPDATE invoices SET zatca_status = 'reported' WHERE id = ?1",
                        [&invoice_id],
                    );
                    let _ = conn.execute(
                        "DELETE FROM zatca_queue WHERE invoice_id = ?1",
                        [&invoice_id],
                    );
                }
                Err(PosError::BusinessRule(msg)) if msg.starts_with("rejected:") => {
                    let body = msg.strip_prefix("rejected:").unwrap_or("");
                    let _ = conn.execute(
                        "UPDATE invoices SET zatca_status = 'rejected', zatca_response = ?1 WHERE id = ?2",
                        params![body, &invoice_id],
                    );
                }
                _ => {}
            }
            conn.execute(
                "UPDATE zatca_queue SET attempts = attempts + 1 WHERE invoice_id = ?1",
                [&invoice_id],
            )
        };
    }

    let _ = {
        let conn = match state.db.lock() {
            Ok(c) => c,
            Err(_) => return,
        };
        conn.execute(
            "UPDATE zatca_queue SET urgent = 1 WHERE invoice_id IN ( \
             SELECT i.id FROM zatca_queue q JOIN invoices i ON i.id = q.invoice_id \
             WHERE JULIANDAY('now') - JULIANDAY(i.created_at) > 0.9 )",
            [],
        )
    };
}

#[tauri::command]
pub async fn retry_zatca_queue(state: State<'_, AppState>) -> Result<(), PosError> {
    let _token = require_role(&state, &[Role::Manager])?;
    process_zatca_retry_queue(&state).await;
    Ok(())
}
