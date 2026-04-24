# Phase 6 — ZATCA Compliance (6–8 days)
> **Start: After Phase 3 | Hardest phase — Dev B sequential, Dev A works on Phase 7 in parallel**

---

## Phase 6 Overview

This phase implements Saudi ZATCA e-invoicing compliance: device registration, UBL 2.1 XML generation, ECDSA cryptographic signing, TLV QR code generation, and API submission with retry queue.

**⚠️ Tasks 6.1–6.4 must be done sequentially. Dev A has limited work here (Task 6.5 in their guide). Dev A should work on Phase 7 Settings UI in parallel.**

**Merge Points:**
- **MP-6** — Task 6.3.1 complete. Dev A displays/prints QR code.

---

## Task 6.1.1 — Generate ECDSA P-256 Private Key
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐⭐ | **Sequential**: Must be done before 6.1.2

### Objective
Generate an ECDSA P-256 private key for ZATCA invoice signing.

### Files to Edit
- `src-tauri/src/commands/zatca.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/main.rs`

### Prerequisites
- `ring` crate (or `openssl`) in `Cargo.toml`
- `tauri-plugin-stronghold` initialized

### Steps

1. Replace `src-tauri/src/commands/zatca.rs` with key generation:

```rust
use ring::signature::EcdsaKeyPair;
use ring::rand::SystemRandom;

fn generate_private_key() -> Result<Vec<u8>, String> {
    let rng = SystemRandom::new();
    let pkcs8_bytes = EcdsaKeyPair::generate_pkcs8(
        &ring::signature::ECDSA_P256_SHA256_FIXED_SIGNING,
        &rng,
    )
    .map_err(|e| format!("فشل توليد المفتاح: {:?}", e))?;

    Ok(pkcs8_bytes.as_ref().to_vec())
}
```

### Verification
1. Call `generate_private_key()` in a test
2. Verify it returns 138+ bytes (PKCS#8 format)

---

## Task 6.1.2 — Create CSR with ZATCA OID Extensions
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐⭐ | **Sequential**: Must be done after 6.1.1

### Objective
Generate a Certificate Signing Request with ZATCA-specific X.509 extensions.

### Required OIDs
| OID | Meaning | Value |
|-----|---------|-------|
| 1.2.840.113549.1.9.1 | emailAddress | (optional) |
| 2.16.840.1.114564.1.1.1.1 | CR Number | From `branches.cr_number` |
| 2.16.840.1.114564.1.1.1.2 | Invoice type | "1000" (simplified) |
| 2.16.840.1.114564.1.1.1.3 | Location code | Branch address or "0000" |
| 2.16.840.1.114564.1.1.1.4 | Branch name | From `branches.name_ar` |
| 2.16.840.1.114564.1.1.1.5 | Device serial | Generate or use machine ID |

### Implementation Note
Use the `openssl` crate or call `openssl req` via `tauri-plugin-shell`. The CSR must be base64-encoded and submitted to ZATCA.

```rust
// Simplified CSR generation using openssl crate
use openssl::req::{Req, X509ReqBuilder};
use openssl::pkey::PKey;
use openssl::nid::Nid;
use openssl::x509::X509NameBuilder;

fn generate_csr(private_key_pem: &[u8], branch: &Branch) -> Result<String, String> {
    // This requires the openssl crate with more detailed implementation
    // Refer to ZATCA developer documentation for exact CSR format
    todo!("Implement CSR generation with ZATCA OIDs")
}
```

### Verification
1. Generate CSR
2. Inspect with `openssl req -in csr.pem -text -noout`
3. Verify all 5 ZATCA OIDs are present

---

## Task 6.1.3 — Compliance Check API Call
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐ | **Sequential**: Must be done after 6.1.2

### Objective
Submit CSR to ZATCA compliance check API.

### API Endpoint
```
POST https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/compliance
Authorization: Basic <base64(OTP)>
Content-Type: application/json

Body:
{
  "csr": "<base64-encoded CSR>"
}
```

### Steps

1. Implement compliance check:

```rust
use reqwest;
use base64;

#[tauri::command]
pub async fn check_zatca_compliance(
    otp: String,
    csr_base64: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/compliance")
        .header("Authorization", format!("Basic {}", base64::encode(&otp)))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "csr": csr_base64 }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    
    match body.get("dispositionMessage").and_then(|v| v.as_str()) {
        Some("ISSUED") => Ok(body.get("requestID").and_then(|v| v.as_str()).unwrap_or("").to_string()),
        _ => Err(format!("فشل التحقق: {:?}", body)),
    }
}
```

### Verification
1. Obtain OTP from ZATCA sandbox portal
2. Call compliance check → returns requestID

---

## Task 6.1.4 — Retrieve and Store CSID
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐ | **Sequential**: Must be done after 6.1.3

### Objective
Get CSID (Cryptographic Stamp Identifier) from ZATCA and store securely.

### API Endpoint
```
POST https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/compliance/seals
Authorization: Basic <base64(OTP)>
Content-Type: application/json

Body:
{
  "requestID": "..."
}
```

### Steps

1. Implement CSID retrieval:

```rust
#[tauri::command]
pub async fn get_csid(
    otp: String,
    request_id: String,
) -> Result<(String, String), String> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/compliance/seals")
        .header("Authorization", format!("Basic {}", base64::encode(&otp)))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "requestID": request_id }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    
    let token = body.get("binarySecurityToken")
        .and_then(|v| v.as_str())
        .ok_or("binarySecurityToken not found")?;
    
    let secret = body.get("secret")
        .and_then(|v| v.as_str())
        .ok_or("secret not found")?;

    Ok((token.to_string(), secret.to_string()))
}
```

2. Store in Stronghold:

```rust
use tauri_plugin_stronghold::Stronghold;

async fn store_zatca_credentials(
    stronghold: &Stronghold,
    csid: &str,
    secret: &str,
    private_key: &[u8],
) -> Result<(), String> {
    stronghold.insert("zatca_csid", csid.as_bytes())
        .await
        .map_err(|e| e.to_string())?;
    
    stronghold.insert("zatca_secret", secret.as_bytes())
        .await
        .map_err(|e| e.to_string())?;
    
    stronghold.insert("zatca_private_key", private_key)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
```

### Verification
1. Call `get_csid` → returns (token, secret)
2. Store in Stronghold
3. Retrieve and verify they match

---

## Task 6.1.5 — `register_zatca_device` + `get_zatca_status` Commands
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐ | **Sequential**: Must be done after 6.1.4

### Objective
Combine all registration steps into a single Tauri command.

### Steps

1. Append to `src-tauri/src/commands/zatca.rs`:

```rust
use crate::lib::ZatcaStatusInfo;

#[tauri::command]
pub async fn register_zatca_device(
    otp: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<(), String> {
    // 1. Generate private key
    let private_key = generate_private_key()?;
    
    // 2. Get branch info for CSR
    let branch: crate::lib::Branch = db
        .query_one("SELECT * FROM branches LIMIT 1", [])
        .await
        .map_err(|e| e.to_string())?
        .ok_or("لا يوجد فرع")?;
    
    // 3. Generate CSR (simplified — actual implementation needs openssl)
    let csr = generate_csr(&private_key, &branch)?;
    let csr_base64 = base64::encode(&csr);
    
    // 4. Compliance check
    let request_id = check_zatca_compliance(otp.clone(), csr_base64).await?;
    
    // 5. Get CSID
    let (csid, secret) = get_csid(otp, request_id).await?;
    
    // 6. Store in Stronghold (requires stronghold handle)
    // store_zatca_credentials(...).await?;
    
    // 7. Mark as registered in settings
    db.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('zatca_registered', 'true')",
        [],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_zatca_status(
    db: tauri::State<'_, TauriSql>,
) -> Result<ZatcaStatusInfo, String> {
    let registered: Option<String> = db
        .query_one("SELECT value FROM settings WHERE key = 'zatca_registered'", [])
        .await
        .map_err(|e| e.to_string())?;

    let pending: Option<i64> = db
        .query_one("SELECT COUNT(*) FROM invoices WHERE zatca_status = 'pending'", [])
        .await
        .map_err(|e| e.to_string())?;

    let rejected: Option<i64> = db
        .query_one("SELECT COUNT(*) FROM invoices WHERE zatca_status = 'rejected'", [])
        .await
        .map_err(|e| e.to_string())?;

    let urgent: Option<i64> = db
        .query_one(
            "SELECT COUNT(*) FROM zatca_queue q JOIN invoices i ON i.id = q.invoice_id WHERE JULIANDAY('now') - JULIANDAY(i.created_at) > 0.9",
            [],
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(ZatcaStatusInfo {
        registered: registered.as_deref() == Some("true"),
        csid_status: if registered.is_some() { "active".to_string() } else { "not_registered".to_string() },
        pending_count: pending.unwrap_or(0),
        rejected_count: rejected.unwrap_or(0),
        urgent_count: urgent.unwrap_or(0),
    })
}
```

2. Register both in `main.rs`.

### Verification
1. Call `register_zatca_device(otp)` with valid sandbox OTP
2. Verify settings has `zatca_registered=true`
3. Call `get_zatca_status()` → returns `registered=true`

### TS Bindings
Already in `src/lib/tauri-commands.ts`.

### Log Update
```markdown
| register_zatca_device | Phase 6 | ✅ Ready | One-step registration with Stronghold |
| get_zatca_status | Phase 6 | ✅ Ready | Returns ZatcaStatusInfo |
```

---

## Task 6.2.1 — `generate_invoice_xml` (UBL 2.1 Simplified)
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐⭐ | **Depends on**: 6.1.5 complete

### Objective
Generate ZATCA-compliant UBL 2.1 XML for simplified invoices.

### Required XML Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>{invoice_number}</cbc:ID>
  <cbc:UUID>{invoice_uuid}</cbc:UUID>
  <cbc:IssueDate>{YYYY-MM-DD}</cbc:IssueDate>
  <cbc:IssueTime>{HH:MM:SS}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>{store_name}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>{vat_number}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">{vat_amount}</cbc:TaxAmount>
  </cac:TaxTotal>
  
  <cac:LegalMonetaryTotal>
    <cbc:TaxInclusiveAmount currencyID="SAR">{total}</cbc:TaxInclusiveAmount>
  </cac:LegalMonetaryTotal>
  
  <!-- Invoice lines -->
</Invoice>
```

### Steps

1. Implement XML generation using `quick-xml`:

```rust
use quick_xml::events::{BytesEnd, BytesStart, Event};
use quick_xml::Writer;
use std::io::Cursor;

fn generate_invoice_xml(invoice: &Invoice, branch: &Branch) -> Result<String, String> {
    let mut writer = Writer::new(Cursor::new(Vec::new()));
    
    // XML declaration
    writer.write_event(Event::Decl(quick_xml::events::BytesDecl::new("1.0", Some("UTF-8"), None)))
        .map_err(|e| e.to_string())?;
    
    // Root element
    let mut root = BytesStart::new("Invoice");
    root.push_attribute(("xmlns", "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"));
    root.push_attribute(("xmlns:cac", "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"));
    root.push_attribute(("xmlns:cbc", "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"));
    writer.write_event(Event::Start(root)).map_err(|e| e.to_string())?;
    
    // ProfileID
    writer.write_event(Event::Start(BytesStart::new("cbc:ProfileID"))).map_err(|e| e.to_string())?;
    writer.write_event(Event::Text(quick_xml::events::BytesText::new("reporting:1.0"))).map_err(|e| e.to_string())?;
    writer.write_event(Event::End(BytesEnd::new("cbc:ProfileID"))).map_err(|e| e.to_string())?;
    
    // ID
    writer.write_event(Event::Start(BytesStart::new("cbc:ID"))).map_err(|e| e.to_string())?;
    writer.write_event(Event::Text(quick_xml::events::BytesText::new(&invoice.invoice_number))).map_err(|e| e.to_string())?;
    writer.write_event(Event::End(BytesEnd::new("cbc:ID"))).map_err(|e| e.to_string())?;
    
    // ... (complete all required fields)
    
    writer.write_event(Event::End(BytesEnd::new("Invoice"))).map_err(|e| e.to_string())?;
    
    let result = writer.into_inner().into_inner();
    String::from_utf8(result).map_err(|e| e.to_string())
}
```

### Verification
1. Generate XML for a test invoice
2. Validate against ZATCA's online XML validator
3. Compare with ZATCA sample XMLs

---

## Task 6.2.2 — XML Unit Tests
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Parallel with Dev A**: ✅ Yes

### Objective
Write unit tests to verify XML generation.

### Steps

1. Add tests in `src-tauri/src/commands/zatca.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_invoice_xml() {
        let invoice = Invoice {
            id: "test".to_string(),
            uuid: "123e4567-e89b-12d3-a456-426614174000".to_string(),
            invoice_number: "BR1-000001".to_string(),
            invoice_type: "simplified".to_string(),
            subtotal: 100.0,
            discount_amount: 0.0,
            vat_amount: 15.0,
            total: 115.0,
            ..Default::default()
        };
        
        let branch = Branch {
            name_ar: "متجر الجملة".to_string(),
            vat_number: Some("310123456700003".to_string()),
            ..Default::default()
        };
        
        let xml = generate_invoice_xml(&invoice, &branch).unwrap();
        assert!(xml.contains("<cbc:ID>BR1-000001</cbc:ID>"));
        assert!(xml.contains("<cbc:ProfileID>reporting:1.0</cbc:ProfileID>"));
    }
}
```

### Verification
1. Run `cargo test` in `src-tauri/`
2. All ZATCA XML tests pass

---

## Task 6.3.1 — XML Canonicalization + SHA-256 Hash
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐⭐ | **Depends on**: 6.2.2 complete

### Objective
Canonicalize XML (C14N), hash with SHA-256, base64 encode = `invoice_hash`.

### Steps

1. Implement signing:

```rust
use ring::digest::{digest, SHA256};
use base64;

fn hash_invoice_xml(xml: &str) -> String {
    let hash = digest(&SHA256, xml.as_bytes());
    base64::encode(hash.as_ref())
}
```

2. Store hash in database:

```rust
conn.execute(
    "UPDATE invoices SET invoice_hash = ? WHERE id = ?",
    [&hash, &invoice_id],
)
.await?;
```

### Verification
1. Generate XML, hash it
2. Verify hash matches expected SHA-256 output

---

## Task 6.3.2 — ECDSA Signing
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐⭐ | **Sequential**: After 6.3.1

### Objective
Sign the invoice hash with ECDSA P-256 private key.

### Steps

```rust
use ring::signature::EcdsaKeyPair;

fn sign_invoice_hash(hash: &[u8], private_key_pkcs8: &[u8]) -> Result<String, String> {
    let key_pair = EcdsaKeyPair::from_pkcs8(
        &ring::signature::ECDSA_P256_SHA256_FIXED_SIGNING,
        private_key_pkcs8,
    )
    .map_err(|e| e.to_string())?;

    let rng = ring::rand::SystemRandom::new();
    let signature = key_pair.sign(&rng, hash)
        .map_err(|e| e.to_string())?;

    Ok(base64::encode(signature.as_ref()))
}
```

### Verification
1. Sign a test hash
2. Verify signature is valid base64
3. Verify it can be verified with the public key

---

## Task 6.3.3 — TLV Encoding (Tags 1–9)
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐ | **Sequential**: After 6.3.2

### Objective
Build TLV (Tag-Length-Value) structure for ZATCA QR code.

### TLV Tags
| Tag | Field | Type |
|-----|-------|------|
| 1 | Seller name | String |
| 2 | Seller VAT number | String |
| 3 | Invoice timestamp | String (ISO 8601) |
| 4 | Total with VAT | Decimal |
| 5 | VAT total | Decimal |
| 6 | Invoice hash (SHA-256) | Base64 |
| 7 | ECDSA signature | Base64 |
| 8 | Public key (ECDSA) | Base64 |
| 9 | Certificate signature timestamp | String |

### Steps

```rust
fn build_zatca_tlv(
    seller_name: &str,
    seller_vat: &str,
    timestamp: &str,
    total: f64,
    vat: f64,
    invoice_hash: &str,
    signature: &str,
    public_key: &str,
    cert_timestamp: &str,
) -> Vec<u8> {
    let mut tlv = Vec::new();
    
    tlv.extend(encode_tlv(1, seller_name.as_bytes()));
    tlv.extend(encode_tlv(2, seller_vat.as_bytes()));
    tlv.extend(encode_tlv(3, timestamp.as_bytes()));
    tlv.extend(encode_tlv(4, format!("{:.2}", total).as_bytes()));
    tlv.extend(encode_tlv(5, format!("{:.2}", vat).as_bytes()));
    tlv.extend(encode_tlv(6, invoice_hash.as_bytes()));
    tlv.extend(encode_tlv(7, signature.as_bytes()));
    tlv.extend(encode_tlv(8, public_key.as_bytes()));
    tlv.extend(encode_tlv(9, cert_timestamp.as_bytes()));
    
    tlv
}

fn encode_tlv(tag: u8, value: &[u8]) -> Vec<u8> {
    let mut result = vec![tag, value.len() as u8];
    result.extend_from_slice(value);
    result
}
```

### Verification
1. Build TLV for test data
2. Verify byte structure: [tag1, len1, value1, tag2, len2, value2, ...]

---

## Task 6.3.4 — QR PNG Generation
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐ | **Sequential**: After 6.3.3

### Objective
Generate QR code PNG from TLV bytes and store as base64.

### Steps

```rust
use qrcode::QrCode;
use qrcode::render::svg;
use base64;

fn generate_qr_png(tlv_bytes: &[u8]) -> Result<String, String> {
    let base64_tlv = base64::encode(tlv_bytes);
    
    let code = QrCode::new(base64_tlv.as_bytes())
        .map_err(|e| e.to_string())?;
    
    let image = code.render::<svg::Color>()
        .min_dimensions(200, 200)
        .build();
    
    // Convert SVG to PNG or use image crate for direct PNG
    // For MVP, store SVG as base64 or use image crate
    
    Ok(base64::encode(image))
}
```

**Note**: The actual PNG generation may require the `image` crate. For MVP, base64-encoded SVG or a placeholder is acceptable if `qrcode` PNG rendering is complex.

### Verification
1. Generate QR for a test invoice
2. Decode base64 and verify it's a valid image
3. Scan with ZATCA Fatoora mobile app

---

## Task 6.4.1 — `submit_to_zatca` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐ | **Depends on**: 6.3.4 complete

### Objective
Submit signed invoice to ZATCA reporting API.

### API Endpoint
```
POST https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/reporting/single
Authorization: Basic {base64(csid:secret)}
Content-Type: application/json
Accept-Version: V2
Accept-Language: en

Body:
{
  "invoiceHash": "{invoice_hash}",
  "uuid": "{invoice_uuid}",
  "invoice": "{base64(signed_xml)}"
}
```

### Steps

```rust
#[tauri::command]
pub async fn submit_to_zatca(
    invoice_id: String,
    db: tauri::State<'_, TauriSql>,
) -> Result<String, String> {
    // Get invoice data
    let invoice: Invoice = db
        .query_one("SELECT * FROM invoices WHERE id = ?", [&invoice_id])
        .await
        .map_err(|e| e.to_string())?
        .ok_or("الفاتورة غير موجودة")?;

    // Get ZATCA credentials from Stronghold
    // let csid = ...;
    // let secret = ...;

    let client = reqwest::Client::new();
    let response = client
        .post("https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/reporting/single")
        .header("Authorization", format!("Basic {}", base64::encode(format!("{}:{}", csid, secret))))
        .header("Content-Type", "application/json")
        .header("Accept-Version", "V2")
        .header("Accept-Language", "en")
        .json(&serde_json::json!({
            "invoiceHash": invoice.invoice_hash.clone().unwrap_or_default(),
            "uuid": invoice.uuid,
            "invoice": base64::encode(&signed_xml),
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    match response.status().as_u16() {
        200 => {
            db.execute("UPDATE invoices SET zatca_status = 'reported' WHERE id = ?", [&invoice_id])
                .await
                .map_err(|e| e.to_string())?;
            Ok("تم الإبلاغ بنجاح".to_string())
        }
        400 => {
            let body = response.text().await.map_err(|e| e.to_string())?;
            db.execute("UPDATE invoices SET zatca_status = 'rejected', zatca_response = ? WHERE id = ?", [&body, &invoice_id])
                .await
                .map_err(|e| e.to_string())?;
            Err(format!("مرفوض: {}", body))
        }
        _ => {
            let body = response.text().await.map_err(|e| e.to_string())?;
            Err(format!("خطأ في الخادم: {}", body))
        }
    }
}
```

### Verification
1. Submit a test invoice to ZATCA sandbox
2. Verify response code 200
3. Check `invoices.zatca_status` = 'reported'

---

## Task 6.4.2 — ZATCA Retry Queue + Background Task
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐⭐ | **Sequential**: After 6.4.1

### Objective
Queue failed submissions and retry every 10 minutes.

### Steps

1. Create `zatca_queue` table (already in schema.sql)
2. Implement queue insertion on failure:

```rust
async fn queue_for_retry(invoice_id: &str, error: &str, db: &TauriSql) -> Result<(), String> {
    db.execute(
        "INSERT INTO zatca_queue (id, invoice_id, last_error) VALUES (?, ?, ?)",
        [format!("QUE-{}", Uuid::new_v4()), invoice_id.to_string(), error.to_string()],
    )
    .await
    .map_err(|e| e.to_string())
}
```

3. Implement background retry loop in `main.rs`:

```rust
use tokio::time::{sleep, Duration};

async fn retry_zatca_queue(db: &TauriSql) {
    let pending: Vec<String> = db
        .query("SELECT invoice_id FROM zatca_queue WHERE attempts < 10", [])
        .await
        .unwrap_or_default();

    for invoice_id in pending {
        let _ = submit_to_zatca(invoice_id.clone(), db).await;
        let _ = db.execute("UPDATE zatca_queue SET attempts = attempts + 1 WHERE invoice_id = ?", [&invoice_id]).await;
    }
}

// In main.rs setup:
tokio::spawn(async move {
    loop {
        sleep(Duration::from_secs(600)).await; // 10 minutes
        retry_zatca_queue(&db).await;
    }
});
```

### Verification
1. Simulate API failure (disconnect internet)
2. Create invoice → queued
3. Verify `zatca_queue` has entry
4. Reconnect → retry succeeds

---

## Task 6.4.3 — 24-Hour Urgency Flag + `retry_zatca_queue` Command
**Status**: ⬜ | **Difficulty**: ⭐⭐⭐ | **Sequential**: After 6.4.2

### Objective
Flag invoices approaching the 24-hour ZATCA deadline and expose manual retry command.

### Steps

```rust
#[tauri::command]
pub async fn retry_zatca_queue(
    db: tauri::State<'_, TauriSql>,
) -> Result<(), String> {
    // Update urgent flag
    db.execute(
        "UPDATE zatca_queue SET urgent = 1 WHERE invoice_id IN (SELECT i.id FROM zatca_queue q JOIN invoices i ON i.id = q.invoice_id WHERE JULIANDAY('now') - JULIANDAY(i.created_at) > 0.9)",
        [],
    )
    .await
    .map_err(|e| e.to_string())?;

    // Retry all pending
    retry_zatca_queue(&db).await;

    Ok(())
}
```

### Verification
1. Create invoice >21.6 hours ago
2. Call `retry_zatca_queue()`
3. Verify `urgent` flag is set to 1

---

## 🛑 MERGE POINT: MP-6 — TASK 6.3.1 COMPLETE

**This is a merge point. Sync with Dev A.**

### What Dev A Needs From You
1. QR code format confirmed: base64 PNG string stored in `invoices.qr_code`
2. `get_invoice_qr` command returns this base64
3. Dev A displays QR on success screen and passes it to `print_receipt`

### After Merge
- Dev A displays QR code in UI
- You complete Phase 6.4 (API submission)
- Dev A continues Phase 7 (Settings) in parallel

---

(End of Phase 6)
