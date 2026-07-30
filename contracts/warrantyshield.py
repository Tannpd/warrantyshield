# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# =============================================================================
#  warrantyshield.py - WarrantyShield: E-Commerce Warranty & Refund Escrow
#  GenLayer Intelligent Contract (v0.2.16)
# =============================================================================

from genlayer import *
import json

class UserError(Exception):
    pass

def to_address(val) -> Address:
    """
    Ensures input addresses are represented as pure Address structures,
    protecting against string/int input deserialization issues in GenLayer Studio UI.
    """
    if isinstance(val, Address):
        return val
    if isinstance(val, int):
        return Address(f"0x{val:040x}")
    if isinstance(val, str):
        if val.startswith("0x"):
            return Address(val)
        try:
            return Address(f"0x{int(val):040x}")
        except Exception:
            return Address(val)
    return Address(str(val))

class Contract(gl.Contract):
    """
    WarrantyShield
    ==============
    Automated E-Commerce Warranty & Refund Escrow Protocol on GenLayer.
    Buyers lock purchase funds into an escrow vault when ordering hardware/electronics.
    If a defect occurs, the buyer submits unboxing/defect evidence URL.
    GenLayer AI validators corroborate the evidence against official manufacturer warranty policies.
    If a factory defect is confirmed, funds are automatically refunded to the buyer.
    If user-inflicted physical damage or no defect is found, funds are released to the seller.
    """

    # Monotonic claim registry counter
    claims_count:          bigint

    # Storage Mappings (Pre-initialized by VM)
    claim_buyer:           TreeMap[str, Address]
    claim_seller:          TreeMap[str, Address]
    claim_product_id:      TreeMap[str, str]
    claim_sale_id:         TreeMap[str, str]
    claim_amount:          TreeMap[str, bigint]
    claim_status:          TreeMap[str, str]       # "ACTIVE", "REFUNDED", "RELEASED", "FAILED"
    claim_policy_url:      TreeMap[str, str]
    claim_evidence_url:    TreeMap[str, str]
    claim_is_faulty:       TreeMap[str, bool]
    claim_fault_score:     TreeMap[str, bigint]    # 0 to 100
    claim_reasoning:       TreeMap[str, str]

    # -------------------------------------------------------------------
    # CONSTRUCTOR
    # -------------------------------------------------------------------
    def __init__(self) -> None:
        self.claims_count = bigint(0)

    # -------------------------------------------------------------------
    # PUBLIC WRITE: CREATE WARRANTY ESCROW (BUYER LOCKS FUNDS)
    # -------------------------------------------------------------------
    @gl.public.write.payable
    def create_warranty_escrow(self, seller: str, product_id: str, sale_id: str, policy_url: str) -> int:
        """
        Creates a new warranty escrow vault. The buyer deposits GEN purchase funds
        and binds the seller-approved product ID, sale ID, and manufacturer warranty policy URL on-chain.
        """
        amount = gl.message.value
        if amount <= bigint(0):
            raise UserError("Escrow deposit amount must be greater than zero.")

        if len(seller.strip()) == 0:
            raise UserError("Seller address cannot be empty.")

        if len(product_id.strip()) == 0:
            raise UserError("Seller-approved product ID cannot be empty.")

        if len(sale_id.strip()) == 0:
            raise UserError("Seller-approved sale ID cannot be empty.")

        if len(policy_url.strip()) == 0:
            raise UserError("Manufacturer warranty policy URL cannot be empty.")

        url_lower = policy_url.lower().strip()
        if not (url_lower.startswith("http://") or url_lower.startswith("https://")):
            raise UserError("Invalid policy URL format. Must start with http:// or https://")

        cid = self.claims_count
        cid_str = str(cid)
        buyer = to_address(gl.message.sender_address)
        seller_addr = to_address(seller.strip())

        self.claim_buyer[cid_str] = buyer
        self.claim_seller[cid_str] = seller_addr
        self.claim_product_id[cid_str] = product_id.strip()
        self.claim_sale_id[cid_str] = sale_id.strip()
        self.claim_amount[cid_str] = amount
        self.claim_status[cid_str] = "ACTIVE"
        self.claim_policy_url[cid_str] = policy_url.strip()
        self.claim_evidence_url[cid_str] = ""
        self.claim_is_faulty[cid_str] = False
        self.claim_fault_score[cid_str] = bigint(0)
        self.claim_reasoning[cid_str] = "Warranty escrow created. Purchase funds locked in vault."

        self.claims_count = cid + bigint(1)
        return int(cid)

    # -------------------------------------------------------------------
    # PUBLIC WRITE: FILE WARRANTY CLAIM & AI AUDIT (BUYER FILES CLAIM)
    # -------------------------------------------------------------------
    @gl.public.write
    def file_claim_and_audit(self, claim_id: int, evidence_url: str) -> None:
        """
        Submits unboxing/defect evidence URL to audit an active warranty claim.
        GenLayer AI nodes scrape BOTH the manufacturer warranty policy URL and the evidence report,
        evaluating hardware defect vs physical user damage.
        """
        cid_str = str(claim_id)
        if claim_id < 0 or bigint(claim_id) >= self.claims_count:
            raise UserError("Warranty claim escrow does not exist.")

        status = self.claim_status.get(cid_str, "ACTIVE")
        if status != "ACTIVE" and status != "FAILED":
            raise UserError("Escrow is not in an active state for warranty auditing.")

        if len(evidence_url.strip()) == 0:
            raise UserError("Unboxing/defect evidence URL cannot be empty.")

        url_lower = evidence_url.lower().strip()
        if not (url_lower.startswith("http://") or url_lower.startswith("https://")):
            raise UserError("Invalid evidence URL format. Must start with http:// or https://")

        buyer = to_address(self.claim_buyer.get(cid_str, Address("0x0000000000000000000000000000000000000000")))
        sender = to_address(gl.message.sender_address)
        if str(sender) != str(buyer):
            raise UserError("Only the buyer can file a warranty claim for this escrow.")

        official_policy_url = self.claim_policy_url.get(cid_str, "")
        product_id = self.claim_product_id.get(cid_str, "")
        sale_id = self.claim_sale_id.get(cid_str, "")

        # Update status
        self.claim_evidence_url[cid_str] = evidence_url.strip()
        self.claim_status[cid_str] = "ACTIVE"
        self.claim_reasoning[cid_str] = "AI Hardware Auditors are evaluating unboxing evidence against warranty terms..."

        seller_addr = to_address(self.claim_seller.get(cid_str, Address("0x0000000000000000000000000000000000000000")))

        # Non-Deterministic Consensus Function
        def leader_fn() -> str:
            # 1. Fetch official manufacturer warranty policy
            try:
                raw_policy = gl.nondet.web.render(official_policy_url)
                if isinstance(raw_policy, bytes):
                    policy_text = raw_policy.decode('utf-8', errors='ignore').strip()
                else:
                    policy_text = str(raw_policy).strip()
            except Exception as e:
                # SAFE FAIL: Do NOT refund/slash on fetch failure! Return is_faulty = False
                return json.dumps({
                    "error": f"POLICY_URL_LOAD_FAILED: {str(e)}",
                    "is_faulty": False,
                    "fault_score": 0,
                    "audit_reasoning": f"Audit error: Could not scrape warranty policy at {official_policy_url}."
                })

            # 2. Fetch customer unboxing / defect evidence report
            try:
                raw_ev = gl.nondet.web.render(evidence_url)
                if isinstance(raw_ev, bytes):
                    ev_text = raw_ev.decode('utf-8', errors='ignore').strip()
                else:
                    ev_text = str(raw_ev).strip()
            except Exception as e:
                # SAFE FAIL: Do NOT refund/slash on fetch failure! Return is_faulty = False
                return json.dumps({
                    "error": f"EVIDENCE_URL_LOAD_FAILED: {str(e)}",
                    "is_faulty": False,
                    "fault_score": 0,
                    "audit_reasoning": f"Audit error: Could not scrape defect evidence at {evidence_url}."
                })

            if len(ev_text) < 15:
                return json.dumps({
                    "error": "EMPTY_EVIDENCE_REPORT",
                    "is_faulty": False,
                    "fault_score": 0,
                    "audit_reasoning": "Defect evidence report appeared empty or unparseable."
                })

            policy_excerpt = policy_text[:3000]
            ev_excerpt = ev_text[:4000]

            # 3. AI Senior Hardware Auditor Prompt
            prompt = f"""You are a Senior Hardware Quality & Warranty Auditor for an e-commerce escrow protocol called WarrantyShield.
Your job is to analyze customer unboxing logs, defect photos/video descriptions, and diagnostic reports, comparing them against the official manufacturer warranty policy.
You must verify that the policy and diagnostic material correspond to the seller-approved product (Product ID: {product_id}) and sale (Sale ID: {sale_id}).
You must distinguish between a genuine "Factory Defect" (e.g., dead pixels, DOA motherboard, burnt power IC, defective battery cell out of box) versus "User-Inflicted Damage" (e.g., cracked screen from drop, liquid submersion, unauthorized disassembly, water contact sensor tripped).

Seller-Approved Product ID: {product_id}
Seller-Approved Sale ID: {sale_id}
Official Warranty Policy URL: {official_policy_url}
--- START WARRANTY POLICY TEXT ---
{policy_excerpt}
--- END WARRANTY POLICY TEXT ---

Customer Defect Evidence URL: {evidence_url}
--- START DEFECT EVIDENCE TEXT ---
{ev_excerpt}
--- END DEFECT EVIDENCE TEXT ---

Evaluate:
1. Is there clear evidence of a genuine factory hardware defect covered by the warranty policy for the specified product ({product_id}) and sale ({sale_id})?
2. Estimate a "fault_score" from 0 to 100 (where 0 means 100% user damage/no defect, and 100 means confirmed catastrophic factory defect).
3. If "fault_score" is 50 or above, "is_faulty" MUST be true (entitling buyer to full refund). If "fault_score" is below 50, "is_faulty" MUST be false.
4. Write a concise 2-3 sentence authoritative audit reasoning.

Your output MUST be a single, valid JSON object with EXACTLY the following keys:
{{
  "is_faulty": true | false,
  "fault_score": <int between 0 and 100>,
  "audit_reasoning": "<2-3 sentences of hardware audit analysis>"
}}
Do NOT wrap the JSON in markdown code blocks. Return ONLY raw JSON."""

            try:
                raw_output = gl.nondet.exec_prompt(prompt)
                if isinstance(raw_output, bytes):
                    raw_str = raw_output.decode('utf-8', errors='ignore').strip()
                else:
                    raw_str = str(raw_output).strip()
            except Exception as e:
                return json.dumps({
                    "error": f"LLM_EXECUTION_FAILED: {str(e)}",
                    "is_faulty": False,
                    "fault_score": 0,
                    "audit_reasoning": "LLM hardware auditor failed to resolve."
                })

            cleaned = raw_str.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                inner = []
                for line in lines[1:]:
                    if line.strip() == "```":
                        break
                    inner.append(line)
                cleaned = "\n".join(inner).strip()

            try:
                parsed = json.loads(cleaned)
                raw_faulty = parsed.get("is_faulty")

                # STRICT BOOLEAN TYPE VALIDATION
                if not isinstance(raw_faulty, bool):
                    return json.dumps({
                        "error": "INVALID_BOOLEAN_TYPE",
                        "is_faulty": False,
                        "fault_score": 0,
                        "audit_reasoning": "AI Auditor verdict contained a non-boolean value for is_faulty."
                    })

                score = int(parsed.get("fault_score", 0))
                reasoning = str(parsed.get("audit_reasoning", "No audit details.")).strip()

                if score < 0: score = 0
                if score > 100: score = 100

                # STRICT ENFORCEMENT: Payout verdict (is_faulty) MUST strictly match score threshold (>= 50)
                is_faulty = (score >= 50)

                return json.dumps({
                    "is_faulty": is_faulty,
                    "fault_score": score,
                    "audit_reasoning": reasoning[:1000]
                })
            except Exception as e:
                return json.dumps({
                    "error": f"JSON_PARSE_FAILED: {str(e)}",
                    "is_faulty": False,
                    "fault_score": 0,
                    "audit_reasoning": f"Audit failed: Could not parse LLM output. Raw response: {cleaned}"
                })

        def validator_fn(leader_result: str) -> bool:
            """
            Semantic Validator: Enforces consensus on hardware fault verdict.
            Returns False on any leader or validator error to fail closed.
            """
            try:
                if isinstance(leader_result, bytes):
                    leader_str = leader_result.decode('utf-8', errors='ignore')
                else:
                    leader_str = str(leader_result)
                l_start = leader_str.find('{')
                l_end = leader_str.rfind('}')
                if l_start == -1 or l_end == -1 or l_start > l_end:
                    return False
                cleaned_leader = leader_str[l_start:l_end+1]
                leader_data = json.loads(cleaned_leader)
            except Exception:
                return False

            if "error" in leader_data:
                return False  # Reject consensus on leader error (Fail closed)

            # STRICT BOOLEAN CHECK FOR LEADER RESULT
            leader_faulty_raw = leader_data.get("is_faulty")
            if not isinstance(leader_faulty_raw, bool):
                return False

            # STRICT SCORE THRESHOLD ALIGNMENT CHECK FOR LEADER RESULT
            leader_score = int(leader_data.get("fault_score", 0))
            if leader_faulty_raw != (leader_score >= 50):
                return False

            validator_raw = leader_fn()
            try:
                if isinstance(validator_raw, bytes):
                    val_str = validator_raw.decode('utf-8', errors='ignore')
                else:
                    val_str = str(validator_raw)
                v_start = val_str.find('{')
                v_end = val_str.rfind('}')
                if v_start == -1 or v_end == -1 or v_start > v_end:
                    return False
                cleaned_val = val_str[v_start:v_end+1]
                validator_data = json.loads(cleaned_val)
            except Exception:
                return False

            if "error" in validator_data:
                return False

            # STRICT BOOLEAN CHECK FOR VALIDATOR RESULT
            val_faulty_raw = validator_data.get("is_faulty")
            if not isinstance(val_faulty_raw, bool):
                return False

            # STRICT SCORE THRESHOLD ALIGNMENT CHECK FOR VALIDATOR RESULT
            val_score = int(validator_data.get("fault_score", 0))
            if val_faulty_raw != (val_score >= 50):
                return False

            return leader_faulty_raw == val_faulty_raw

        # Execute Consensus on GenLayer VM
        consensus_json = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        try:
            if isinstance(consensus_json, bytes):
                cons_str = consensus_json.decode('utf-8', errors='ignore')
            else:
                cons_str = str(consensus_json)
            cons_start = cons_str.find('{')
            cons_end = cons_str.rfind('}')
            if cons_start == -1 or cons_end == -1 or cons_start > cons_end:
                raise ValueError("No JSON object found")
            cleaned_cons = cons_str[cons_start:cons_end+1]
            res = json.loads(cleaned_cons)
        except Exception:
            self.claim_status[cid_str] = "FAILED"
            self.claim_reasoning[cid_str] = "Consensus outcome was unparseable JSON."
            return

        if "error" in res:
            self.claim_status[cid_str] = "FAILED"
            self.claim_reasoning[cid_str] = f"Audit Failed: {res.get('error')}. Info: {res.get('audit_reasoning')}"
            return

        # STRICT SETTLEMENT PATH BOOLEAN VALIDATION
        settle_faulty_raw = res.get("is_faulty")
        if not isinstance(settle_faulty_raw, bool):
            self.claim_status[cid_str] = "FAILED"
            self.claim_reasoning[cid_str] = "Audit Failed: Invalid non-boolean value for is_faulty in settlement path."
            return

        score = int(res.get("fault_score", 0))
        if score < 0: score = 0
        if score > 100: score = 100

        # STRICT ENFORCEMENT: Payout verdict (is_faulty) MUST strictly match score threshold (>= 50)
        is_faulty = (score >= 50)
        reasoning = str(res.get("audit_reasoning", "Audit complete."))

        self.claim_is_faulty[cid_str] = is_faulty
        self.claim_fault_score[cid_str] = bigint(score)
        self.claim_reasoning[cid_str] = reasoning

        amount = self.claim_amount.get(cid_str, bigint(0))
        if amount <= bigint(0):
            raise UserError("No locked funds found in this escrow vault.")

        if is_faulty:
            # Reentrancy Protection
            self.claim_amount[cid_str] = bigint(0)
            # Factory Defect Confirmed: Full refund to buyer
            self.claim_status[cid_str] = "REFUNDED"
            other_buyer = gl.get_contract_at(buyer)
            other_buyer.emit_transfer(value=bigint(amount))
        else:
            # User Damage / No Defect: Funds released to seller
            self.claim_amount[cid_str] = bigint(0)
            self.claim_status[cid_str] = "RELEASED"
            other_seller = gl.get_contract_at(seller_addr)
            other_seller.emit_transfer(value=bigint(amount))

    # -------------------------------------------------------------------
    # PUBLIC WRITE: RELEASE TO SELLER (BY BUYER FOR CLEAN NON-FAULTY ITEMS)
    # -------------------------------------------------------------------
    @gl.public.write
    def release_to_seller(self, claim_id: int) -> None:
        """
        Allows the buyer to manually release funds to the seller if the product
        arrives in perfect condition with no defects.
        """
        cid_str = str(claim_id)
        if claim_id < 0 or bigint(claim_id) >= self.claims_count:
            raise UserError("Warranty claim escrow does not exist.")

        buyer = to_address(self.claim_buyer.get(cid_str, Address("0x0000000000000000000000000000000000000000")))
        sender = to_address(gl.message.sender_address)

        if str(sender) != str(buyer):
            raise UserError("Only the buyer can release funds to the seller.")

        status = self.claim_status.get(cid_str, "ACTIVE")
        if status != "ACTIVE":
            raise UserError("Funds can only be released from ACTIVE escrows.")

        amount = self.claim_amount.get(cid_str, bigint(0))
        if amount <= bigint(0):
            raise UserError("No funds available for release.")

        seller_addr = to_address(self.claim_seller.get(cid_str, Address("0x0000000000000000000000000000000000000000")))

        # Reentrancy Protection
        self.claim_amount[cid_str] = bigint(0)
        self.claim_status[cid_str] = "RELEASED"
        self.claim_reasoning[cid_str] = "Buyer manually confirmed product satisfaction and released purchase funds to seller."

        # Transfer funds to seller
        other_seller = gl.get_contract_at(seller_addr)
        other_seller.emit_transfer(value=bigint(amount))

    # -------------------------------------------------------------------
    # READ-ONLY VIEW METHODS
    # -------------------------------------------------------------------
    @gl.public.view
    def get_claim(self, claim_id: int) -> str:
        """
        Returns a JSON-serialized representation of a warranty escrow claim.
        """
        cid_str = str(claim_id)
        if claim_id < 0 or bigint(claim_id) >= self.claims_count:
            return "{}"

        buyer = to_address(self.claim_buyer.get(cid_str, Address("0x0000000000000000000000000000000000000000")))
        seller = to_address(self.claim_seller.get(cid_str, Address("0x0000000000000000000000000000000000000000")))
        product_id = self.claim_product_id.get(cid_str, "")
        sale_id = self.claim_sale_id.get(cid_str, "")
        amount = self.claim_amount.get(cid_str, bigint(0))
        status = self.claim_status.get(cid_str, "ACTIVE")
        policy_url = self.claim_policy_url.get(cid_str, "")
        evidence_url = self.claim_evidence_url.get(cid_str, "")
        is_faulty = bool(self.claim_is_faulty.get(cid_str, False))
        score = int(self.claim_fault_score.get(cid_str, bigint(0)))
        reasoning = self.claim_reasoning.get(cid_str, "")

        return json.dumps({
            "id": claim_id,
            "buyer": str(buyer),
            "seller": str(seller),
            "product_id": product_id,
            "sale_id": sale_id,
            "amount": int(amount),
            "status": status,
            "policy_url": policy_url,
            "evidence_url": evidence_url,
            "is_faulty": is_faulty,
            "fault_score": score,
            "audit_reasoning": reasoning
        })

    @gl.public.view
    def get_claims_count(self) -> int:
        """
        Returns the total number of registered warranty claims.
        """
        return int(self.claims_count)
