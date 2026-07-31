# 🛡️ WarrantyShield — E-Commerce Warranty & Defect Audit Escrow Protocol

[![GenLayer Version](https://img.shields.io/badge/GenLayer-v0.2.16-10B981?style=for-the-badge)](https://genlayer.com)
[![Status](https://img.shields.io/badge/StudioNet-Deployed-00F0FF?style=for-the-badge)](https://studio.genlayer.com)
[![Live Web](https://img.shields.io/badge/Vercel-Live_App-000000?style=for-the-badge&logo=vercel)](https://warrantyshield-app.vercel.app)
[![CI Build](https://img.shields.io/badge/GitHub_Actions-Passing-22C55E?style=for-the-badge&logo=github)](https://github.com/Tannpd/warrantyshield/actions)
[![License](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)](LICENSE)

> **Autonomous E-Commerce Purchase Escrow with 2-Layer AI Hardware Defect Auditing (Layer 1: Google Gemini 3.6 Flash Vision AI + Layer 2: GenLayer VM On-Chain Consensus v0.2.16).**

---

## 📍 Deployed Network & Production Details

* **Intelligent Contract Address (StudioNet)**: [`0xF4423Ef14b710e9a9103904F0945805275F9ba9B`](https://studio.genlayer.com)
* **Live Production dApp**: [https://warrantyshield-app.vercel.app](https://warrantyshield-app.vercel.app)
* **GitHub Repository**: [https://github.com/Tannpd/warrantyshield](https://github.com/Tannpd/warrantyshield)

---

## 💡 Problem Statement & Real-World Impact

### ❌ The E-Commerce Warranty Dispute Bottleneck
When buyers purchase expensive electronics online (GPUs, Laptops, Smartphones, Drones), warranty disputes are notoriously contentious:
* **The Buyer's Dilemma**: Receives a Dead-on-Arrival (DOA) product, but fears the seller will claim it was broken after unboxing.
* **The Seller's Dilemma**: Ships a flawless device, but fears fraudulent buyers causing liquid submersion or dropping the device, then demanding a full refund.
* **Traditional Platform Inefficiency**: Marketplaces (Amazon, eBay, Shopee) require 2 to 4 weeks of costly, manual human customer support mediation.

### 🚀 The 2-Layer Autonomous AI Solution
**WarrantyShield** locks purchase deposits into smart escrows bound to seller-approved **Product ID** and **Sale ID**. 

```
+-----------------------------------------------------------------------------------+
| LAYER 1: OFF-CHAIN VISION AI INSPECTION                                           |
| 1. Buyer uploads unboxing photo or MP4/WebM video file                            |
| 2. Automatic Video Frame Extractor gets keyframe canvas                            |
| 3. Google Gemini 3.6 Flash Vision AI inspects OLED pixels, water sensors, seals   |
| 4. Backend Proxy (/api/analyze-vision) keeps API Keys 100% secure from client     |
| 5. Generates scrapable Diagnostic Evidence Audit URL (/api/report?data=...)       |
+----------------------------------------+------------------------------------------+
                                         |
                                         v (Passes Evidence URL)
+----------------------------------------+------------------------------------------+
| LAYER 2: ON-CHAIN GENLAYER VM CONSENSUS                                           |
| 1. Buyer executes file_claim_and_audit(claim_id, evidence_url)                    |
| 2. GenLayer AI Nodes scrape evidence URL via gl.nondet.web.render                 |
| 3. LLM Auditor cross-references evidence & warranty policy bound to Product/Sale  |
| 4. Strictly matches fault score threshold (score >= 50 -> 100% Buyer Refund)      |
+-----------------------------------------------------------------------------------+
```

---

## 🏗️ Technical Architecture & GenLayer v0.2.16 Standards

```
                                  +---------------------------------------+
                                  |   Official Warranty Policy URL        |
                                  +-------------------+-------------------+
                                                      |
+---------------------+      create_warranty_escrow() | (Bound on-chain with Product & Sale ID)
|  Buyer Wallet       | ------------------------------+-------------------> +-----------------------------+
+---------------------+  Locks Deposit (GEN)                              |  WarrantyShield Escrow      |
                                                                           |  Contract Vault             |
                                  file_claim_and_audit(evidence_url)      |                             |
                                ----------------------------------------> +--------------+--------------+
                                                                                          |
                                                                                          | gl.vm.run_nondet_unsafe()
                                                                                          v
                                                                           +-----------------------------+
                                                                           | GenLayer AI Validator Nodes |
                                                                           +--------------+--------------+
                                                                                          |
                                           +---------------------------------------------+---------------------------------------------+
                                           |                                                                                           |
                                           v                                                                                           v
                        [is_faulty == true (Score >= 50%)]                                                          [is_faulty == false (Score < 50%)]
                                           |                                                                                           |
                                           v                                                                                           v
                        +------------------------------------+                                                      +------------------------------------+
                        | 100% Refund to Buyer Wallet        |                                                      | Release Funds to Seller Wallet     |
                        | Status: REFUNDED                   |                                                      | Status: RELEASED                   |
                        +------------------------------------+                                                      +------------------------------------+
```

### 🔒 Key Contract Rules & Safety Compliance
1. **Product & Sale ID Binding**:
   - `create_warranty_escrow()` stores and validates `product_id` and `sale_id` state mappings (`TreeMap[str, str]`), ensuring evidence reports cannot be reused across different orders.
2. **Strict Score Threshold Matching**:
   - Enforces payout verdict matching: `is_faulty = (score >= 50)` in Leader, Validator, and Settlement execution paths. Rejects mismatched raw LLM booleans.
3. **Strict Boolean Type Validation**:
   - Evaluates `isinstance(raw_faulty, bool)` in all consensus paths to prevent string coercion exploits (e.g. `"false"`).
4. **Fail-Closed Consensus Security**:
   - If web fetching or LLM execution fails, `validator_fn` returns `False`, causing consensus to fail closed without clearing escrow balances.
5. **Backend API Key Security**:
   - Layer 1 Vision AI requests pass through `/api/analyze-vision` serverless backend proxy, keeping Google Gemini API keys 100% hidden from client-side code and browser F12 inspection.
6. **Access Control & Signer Visibility**:
   - Only the registered buyer (`sender == claim_buyer`) can file claims or trigger manual releases. Active MetaMask Signer is displayed during write transactions.

---

## 🧪 Automated Unit Test Verification

The contract includes a complete `unittest` test suite covering all 8 core execution paths:

```powershell
# Run unit tests inside python virtual environment
cd D:\Gen\WarrantyShield
.venv\Scripts\python -m unittest discover -s tests -p "test_*.py" -v
```

### Test Results Summary (8/8 Passed):
* `test_create_warranty_escrow_payable`: **OK** (Locks deposit & binds product ID, sale ID & policy URL).
* `test_file_claim_factory_defect_refunds_buyer`: **OK** (Factory DOA triggers 100% refund).
* `test_file_claim_user_damage_releases_to_seller`: **OK** (User physical damage releases to seller).
* `test_payout_verdict_strictly_matches_score_threshold`: **OK** (Forces `is_faulty = False` when `score < 50`).
* `test_release_to_seller_buyer_only`: **OK** (Access control enforces buyer-only release).
* `test_failed_fetch_does_not_release_escrow`: **OK** (Fail-closed safety preserves escrow on fetch error).
* `test_strict_boolean_validation_rejects_string`: **OK** (String `"false"` is rejected).
* `test_reproducible_compilation`: **OK** (GenVM contract compilation verified).

---

## 🔗 Live Mock Test Files

Use these pre-hosted endpoints to test the live Web App or GenLayer Studio:

* **Official Warranty Policy**: [https://warrantyshield-app.vercel.app/mock_warranty_policy.txt](https://warrantyshield-app.vercel.app/mock_warranty_policy.txt)
* **Factory Defect Evidence (100% Refund)**: [https://warrantyshield-app.vercel.app/mock_factory_defect_evidence.txt](https://warrantyshield-app.vercel.app/mock_factory_defect_evidence.txt)
* **User Damage Evidence (Release to Seller)**: [https://warrantyshield-app.vercel.app/mock_user_damage_evidence.txt](https://warrantyshield-app.vercel.app/mock_user_damage_evidence.txt)

---

## 💻 Local Development & Build Setup

```bash
# Clone the repository
git clone https://github.com/Tannpd/warrantyshield.git
cd warrantyshield/frontend

# Install dependencies
npm install

# Run local development server
npm run dev

# Build for production
npm run build
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
