# =============================================================================
#  test_warrantyshield.py - WarrantyShield Contract Unit Test Suite
# =============================================================================

import sys
import os
import json
import unittest
import py_compile
from unittest.mock import MagicMock

# --- Mocking structure to simulate the GenLayer SDK runtime ------------------
class MockContractBase:
    def __new__(cls, *args, **kwargs):
        instance = super().__new__(cls)
        for name, type_hint in getattr(cls, '__annotations__', {}).items():
            if 'dict' in str(type_hint) or 'TreeMap' in str(type_hint):
                setattr(instance, name, dict())
        return instance

class MockMessage:
    def __init__(self, sender="0x1111111111111111111111111111111111111111", value=0):
        self.sender_address = sender
        self.value = value

class MockWeb:
    def __init__(self):
        self.url_to_content = {}
        self.fail_on_next = False
    def render(self, url):
        if self.fail_on_next:
            raise Exception("Simulated page render failure")
        if "404" in url:
            raise Exception("404 Evidence Page Not Found")
        if "empty" in url:
            return ""
        return self.url_to_content.get(url, "Official hardware warranty policy: Covers all factory defects out of box for 12 months.")

class MockNondet:
    def __init__(self):
        self.web = MockWeb()
        self.exec_prompt_responses = []
        self.response_index = 0
    def exec_prompt(self, prompt):
        if self.exec_prompt_responses:
            res = self.exec_prompt_responses[self.response_index % len(self.exec_prompt_responses)]
            self.response_index += 1
            if isinstance(res, Exception):
                raise res
            return res
        return json.dumps({
            "is_faulty": True,
            "fault_score": 90,
            "audit_reasoning": "Confirmed factory hardware defect."
        })

class MockVM:
    def run_nondet_unsafe(self, leader_fn, validator_fn):
        leader_res = leader_fn()
        valid = validator_fn(leader_res)
        if not valid:
            return json.dumps({"error": "VALIDATOR_REJECTED_CONSENSUS"})
        return leader_res

class MockContractRef:
    def __init__(self, addr, tracker=None):
        self.addr = str(addr)
        self.tracker = tracker
    def emit_transfer(self, value=0):
        if self.tracker is not None:
            self.tracker.append({"target": self.addr, "value": int(value)})
        return True

class MockGL:
    def __init__(self):
        self.Contract = MockContractBase
        self.message = MockMessage()
        self.nondet = MockNondet()
        self.vm = MockVM()
        self.transfers_log = []
        self.public = MagicMock()
        self.public.write = lambda f: f
        self.public.write.payable = lambda f: f
        self.public.view = lambda f: f
    def get_contract_at(self, addr):
        return MockContractRef(addr, self.transfers_log)

class MockAddress:
    def __init__(self, val):
        self.val = str(val)
    def __str__(self):
        return self.val
    def __repr__(self):
        return f"Address('{self.val}')"

mock_gl = MockGL()
mock_gl.gl = mock_gl
sys.modules['genlayer'] = mock_gl
mock_gl.Contract = MockContractBase
mock_gl.Address = MockAddress
mock_gl.bigint = lambda v: int(v)
mock_gl.TreeMap = dict

# Add contracts directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../contracts')))
import warrantyshield

class TestWarrantyShield(unittest.TestCase):
    def setUp(self):
        mock_gl.message = MockMessage(sender="0x1111111111111111111111111111111111111111", value=5000000000000000000)
        mock_gl.nondet = MockNondet()
        mock_gl.transfers_log = []
        self.contract = warrantyshield.Contract()

    def test_reproducible_compilation(self):
        """Verify contract file syntax and compilation."""
        contract_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../contracts/warrantyshield.py'))
        compiled_file = py_compile.compile(contract_path, doraise=True)
        self.assertTrue(os.path.exists(compiled_file))

    def test_reproducible_compilation(self):
        """Verify contract file syntax and compilation."""
        contract_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../contracts/warrantyshield.py'))
        compiled_file = py_compile.compile(contract_path, doraise=True)
        self.assertTrue(os.path.exists(compiled_file))

    def test_create_warranty_escrow_payable(self):
        """Verify create_warranty_escrow locks GEN purchase deposit and binds product_id, sale_id, and policy_url."""
        buyer = "0x1111111111111111111111111111111111111111"
        seller = "0x2222222222222222222222222222222222222222"
        product_id = "PRD-MACBOOK-M3-001"
        sale_id = "SALE-2026-88492"
        policy_url = "https://warrantyshield.vercel.app/mock_warranty_policy.txt"
        mock_gl.message = MockMessage(sender=buyer, value=5000000000000000000)

        cid = self.contract.create_warranty_escrow(seller, product_id, sale_id, policy_url)
        self.assertEqual(cid, 0)

        claim_json = self.contract.get_claim(0)
        claim = json.loads(claim_json)

        self.assertEqual(claim["id"], 0)
        self.assertEqual(claim["buyer"], buyer)
        self.assertEqual(claim["seller"], seller)
        self.assertEqual(claim["product_id"], product_id)
        self.assertEqual(claim["sale_id"], sale_id)
        self.assertEqual(claim["policy_url"], policy_url)
        self.assertEqual(claim["amount"], 5000000000000000000)
        self.assertEqual(claim["status"], "ACTIVE")

    def test_audit_factory_defect_refunds_buyer(self):
        """Verify factory defect audit refunds purchase escrow to buyer."""
        buyer = "0x1111111111111111111111111111111111111111"
        seller = "0x2222222222222222222222222222222222222222"
        product_id = "PRD-MACBOOK-M3-001"
        sale_id = "SALE-2026-88492"
        policy_url = "https://warrantyshield.vercel.app/mock_warranty_policy.txt"
        ev_url = "https://warrantyshield.vercel.app/mock_factory_defect_evidence.txt"

        mock_gl.message = MockMessage(sender=buyer, value=3000000000000000000)
        self.contract.create_warranty_escrow(seller, product_id, sale_id, policy_url)

        mock_gl.nondet.web.url_to_content[policy_url] = "Official policy: Dead pixels out of box guaranteed 100% full refund."
        mock_gl.nondet.web.url_to_content[ev_url] = "Customer report: Unboxing video shows 15 dead pixels across OLED display."

        mock_gl.nondet.exec_prompt_responses = [
            json.dumps({
                "is_faulty": True,
                "fault_score": 95,
                "audit_reasoning": "Confirmed DOA factory OLED screen defect out of box."
            })
        ]

        mock_gl.message = MockMessage(sender=buyer)
        self.contract.file_claim_and_audit(0, ev_url)

        claim_json = self.contract.get_claim(0)
        claim = json.loads(claim_json)

        self.assertTrue(claim["is_faulty"])
        self.assertEqual(claim["fault_score"], 95)
        self.assertEqual(claim["status"], "REFUNDED")
        self.assertEqual(claim["amount"], 0)
        self.assertTrue(any(t["target"] == buyer and t["value"] == 3000000000000000000 for t in mock_gl.transfers_log))

    def test_audit_user_damage_releases_to_seller(self):
        """Verify user physical damage audit releases purchase escrow to seller."""
        buyer = "0x1111111111111111111111111111111111111111"
        seller = "0x2222222222222222222222222222222222222222"
        product_id = "PRD-DRONE-X"
        sale_id = "SALE-2026-1122"
        policy_url = "https://warrantyshield.vercel.app/mock_warranty_policy.txt"
        ev_url = "https://warrantyshield.vercel.app/mock_user_damage_evidence.txt"

        mock_gl.message = MockMessage(sender=buyer, value=4000000000000000000)
        self.contract.create_warranty_escrow(seller, product_id, sale_id, policy_url)

        mock_gl.nondet.web.url_to_content[policy_url] = "Warranty excludes physical drops or water submersion."
        mock_gl.nondet.web.url_to_content[ev_url] = "Report: Drone fell in lake, water contact sensor tripped."

        mock_gl.nondet.exec_prompt_responses = [
            json.dumps({
                "is_faulty": False,
                "fault_score": 10,
                "audit_reasoning": "User physical water damage. Not covered by factory warranty."
            })
        ]

        mock_gl.message = MockMessage(sender=buyer)
        self.contract.file_claim_and_audit(0, ev_url)

        claim_json = self.contract.get_claim(0)
        claim = json.loads(claim_json)

        self.assertFalse(claim["is_faulty"])
        self.assertEqual(claim["status"], "RELEASED")
        self.assertEqual(claim["amount"], 0)
        self.assertTrue(any(t["target"] == seller and t["value"] == 4000000000000000000 for t in mock_gl.transfers_log))

    def test_payout_verdict_strictly_matches_score_threshold(self):
        """Verify that score < 50 forces is_faulty = False even if LLM output returns is_faulty: True."""
        buyer = "0x1111111111111111111111111111111111111111"
        seller = "0x2222222222222222222222222222222222222222"
        product_id = "PRD-PHONE-V2"
        sale_id = "SALE-2026-9900"
        policy_url = "https://warrantyshield.vercel.app/mock_warranty_policy.txt"
        ev_url = "https://warrantyshield.vercel.app/mock_evidence.txt"

        mock_gl.message = MockMessage(sender=buyer, value=1000000000000000000)
        self.contract.create_warranty_escrow(seller, product_id, sale_id, policy_url)

        mock_gl.nondet.web.url_to_content[policy_url] = "Standard policy."
        mock_gl.nondet.web.url_to_content[ev_url] = "Customer report with minor scratches."

        # LLM returns is_faulty = True but fault_score = 30 (< 50)
        mock_gl.nondet.exec_prompt_responses = [
            json.dumps({
                "is_faulty": True,
                "fault_score": 30,
                "audit_reasoning": "Minor cosmetic wear, score is below defect threshold."
            })
        ]

        mock_gl.message = MockMessage(sender=buyer)
        self.contract.file_claim_and_audit(0, ev_url)

        claim_json = self.contract.get_claim(0)
        claim = json.loads(claim_json)

        # Verdict MUST be false (released to seller) because score 30 < 50
        self.assertFalse(claim["is_faulty"])
        self.assertEqual(claim["fault_score"], 30)
        self.assertEqual(claim["status"], "RELEASED")
        self.assertTrue(any(t["target"] == seller for t in mock_gl.transfers_log))

    def test_failed_fetch_does_not_refund(self):
        """Verify failed web fetch returns is_faulty = False and sets FAILED status preserving escrow."""
        buyer = "0x1111111111111111111111111111111111111111"
        seller = "0x2222222222222222222222222222222222222222"
        product_id = "PRD-TEST"
        sale_id = "SALE-TEST"
        policy_url = "https://warrantyshield.vercel.app/mock_warranty_policy.txt"
        ev_url = "https://flaky-server.com/evidence"

        mock_gl.message = MockMessage(sender=buyer, value=2000000000000000000)
        self.contract.create_warranty_escrow(seller, product_id, sale_id, policy_url)

        mock_gl.nondet.web.fail_on_next = True

        mock_gl.message = MockMessage(sender=buyer)
        self.contract.file_claim_and_audit(0, ev_url)

        claim_json = self.contract.get_claim(0)
        claim = json.loads(claim_json)

        # Must fail closed and set status to FAILED, preserving escrow funds
        self.assertEqual(claim["status"], "FAILED")
        self.assertEqual(claim["amount"], 2000000000000000000)

    def test_strict_boolean_validation_rejects_string(self):
        """Verify string boolean 'true' or 'false' in LLM output is rejected as non-boolean."""
        buyer = "0x1111111111111111111111111111111111111111"
        seller = "0x2222222222222222222222222222222222222222"
        product_id = "PRD-TEST"
        sale_id = "SALE-TEST"
        policy_url = "https://warrantyshield.vercel.app/mock_warranty_policy.txt"
        ev_url = "https://fake-link.com/evidence"

        mock_gl.message = MockMessage(sender=buyer, value=1000000000000000000)
        self.contract.create_warranty_escrow(seller, product_id, sale_id, policy_url)

        # LLM returns string "true" instead of boolean true
        mock_gl.nondet.exec_prompt_responses = [
            json.dumps({
                "is_faulty": "true",
                "fault_score": 80,
                "audit_reasoning": "Fake string response"
            })
        ]

        mock_gl.message = MockMessage(sender=buyer)
        self.contract.file_claim_and_audit(0, ev_url)

        claim_json = self.contract.get_claim(0)
        claim = json.loads(claim_json)

        # Contract MUST fail closed and set status to FAILED
        self.assertEqual(claim["status"], "FAILED")

    def test_seller_clean_release(self):
        """Verify buyer can manually release funds to seller for clean items."""
        buyer = "0x1111111111111111111111111111111111111111"
        seller = "0x2222222222222222222222222222222222222222"
        product_id = "PRD-CLEAN-01"
        sale_id = "SALE-CLEAN-01"
        policy_url = "https://warrantyshield.vercel.app/mock_warranty_policy.txt"

        mock_gl.message = MockMessage(sender=buyer, value=6000000000000000000)
        self.contract.create_warranty_escrow(seller, product_id, sale_id, policy_url)

        mock_gl.message = MockMessage(sender=buyer)
        self.contract.release_to_seller(0)

        claim_json = self.contract.get_claim(0)
        claim = json.loads(claim_json)

        self.assertEqual(claim["status"], "RELEASED")
        self.assertEqual(claim["amount"], 0)
        self.assertTrue(any(t["target"] == seller and t["value"] == 6000000000000000000 for t in mock_gl.transfers_log))

if __name__ == '__main__':
    unittest.main()
