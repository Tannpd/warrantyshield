# 🛡️ WarrantyShield — E-Commerce Warranty & Defect Audit Escrow Protocol

[![GenLayer Version](https://img.shields.io/badge/GenLayer-v0.2.16-10B981?style=for-the-badge)](https://genlayer.com)
[![Status](https://img.shields.io/badge/StudioNet-Deployed-00F0FF?style=for-the-badge)](https://studio.genlayer.com)
[![Live Web](https://img.shields.io/badge/Vercel-Live_App-000000?style=for-the-badge&logo=vercel)](https://warrantyshield-app.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)](LICENSE)

> **Autonomous E-Commerce Purchase Escrow with Multi-Node AI Hardware Defect Auditing powered by GenLayer Intelligent Contracts v0.2.16.**

---

## 📍 Deployed Network Details

* **Intelligent Contract Address (StudioNet)**: `0x53F19f3b8d3601CB3A4CbF33E43cC22294EDAE41`
* **Live Production dApp**: [https://warrantyshield-app.vercel.app](https://warrantyshield-app.vercel.app)
* **GitHub Repository**: [https://github.com/Tannpd/warrantyshield](https://github.com/Tannpd/warrantyshield)

---

## 💡 Problem Statement & Real-World Impact

### ❌ The E-Commerce Warranty Dispute Bottleneck
When buyers purchase expensive electronics online (GPUs, Laptops, Smartphones, Drones), warranty disputes are notoriously contentious:
* **The Buyer's Dilemma**: Receives a Dead-on-Arrival (DOA) product, but fears the seller will claim it was broken after unboxing.
* **The Seller's Dilemma**: Ships a flawless device, but fears fraudulent buyers causing liquid submersion or dropping the device, then demanding a full refund.
* **Traditional Platform Inefficiency**: Marketplaces (Amazon, eBay, Shopee) require 2 to 4 weeks of costly, manual human customer support mediation.

### 🚀 The GenLayer Autonomous Solution
**WarrantyShield** locks purchase deposits into smart escrows. GenLayer AI validator nodes independently scrape BOTH the official manufacturer warranty policy URL and the customer's unboxing video/defect diagnostic report URL via `gl.nondet.web.render`. A Senior Hardware Quality Auditor LLM prompt distinguishes genuine factory defects from user-inflicted physical/water damage, instantly granting **100% buyer refunds** or **releasing payments to honest sellers**.

---

## 🏗️ Technical Architecture & GenLayer v0.2.16 Standards

```
                                  +---------------------------------------+
                                  |   Official Warranty Policy URL        |
                                  +-------------------+-------------------+
                                                      |
+---------------------+      create_warranty_escrow() | (Bound on-chain)
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
1. **Strict Boolean Type Validation**:
   - Evaluates `isinstance(raw_faulty, bool)` in Leader, Validator, and Settlement execution paths. Rejects string booleans (e.g. `"false"`) to prevent coercion exploits.
2. **Fail-Closed Consensus Security**:
   - If web fetching or LLM execution fails, `validator_fn` returns `False`, causing consensus to fail closed without clearing escrow balances.
3. **Unsuppressed Token Transfers**:
   - Executes `other_contract.emit_transfer(...)` without `try/except` suppression to ensure atomic state reverts on transfer failures.
4. **Access Control & Evidence Binding**:
   - Only the registered buyer (`sender == claim_buyer`) can submit defect evidence or trigger manual releases.

---

## 🧪 Automated Unit Test Verification

The contract includes a complete `unittest` test suite covering all 7 core execution paths:

```powershell
# Run unit tests inside python virtual environment
cd D:\Gen\WarrantyShield
.venv\Scripts\python -m unittest tests/test_warrantyshield.py -v
```

### Test Results Summary:
* `test_create_warranty_escrow_payable`: **OK** (Locks deposit & binds policy URL).
* `test_file_claim_factory_defect_refunds_buyer`: **OK** (Factory DOA triggers 100% refund).
* `test_file_claim_user_damage_releases_to_seller`: **OK** (User physical damage releases to seller).
* `test_release_to_seller_buyer_only`: **OK** (Access control enforces buyer-only release).
* `test_failed_fetch_does_not_release_escrow`: **OK** (Fail-closed safety preserves escrow on fetch error).
* `test_strict_boolean_validation_rejects_string`: **OK** (String `"false"` is rejected).
* `test_reproducible_compilation`: **OK** (Syntax & compilation verified).

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

# Run dev server
npm run dev

# Build for production
npm run build
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
