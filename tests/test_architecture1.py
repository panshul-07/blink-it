from __future__ import annotations

import unittest

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from yield_accounting.engine import EnforcementError, YieldEnforcementEngine
from yield_accounting.ledger import TokenLedger
from yield_accounting.models import ProcessorDDP, SwapRequest, new_id
from yield_accounting.oracle import YieldStandardsOracle


class Architecture1Tests(unittest.TestCase):
    def setUp(self) -> None:
        self.oracle = YieldStandardsOracle()
        self.oracle.set_range(
            process_type="grain_cleaning",
            minimum_pct=82.0,
            maximum_pct=93.0,
            actor="test",
            reason="unit test baseline",
        )
        self.ledger = TokenLedger()
        self.engine = YieldEnforcementEngine(self.oracle, self.ledger)
        self.processor = ProcessorDDP(
            processor_id="proc_test",
            process_authorizations=["grain_cleaning"],
            certification_level="L1",
            equipment_specs="test rig",
        )

    def _mint_and_swap(self, input_qty: float, output_qty: float):
        in_token = new_id("in")
        self.ledger.mint(in_token, self.processor.processor_id, input_qty, {})
        req = SwapRequest(
            processor_id=self.processor.processor_id,
            input_token_id=in_token,
            input_qty=input_qty,
            claimed_output_qty=output_qty,
            process_type="grain_cleaning",
            loss_breakdown={"evaporation": 4.0, "waste": 6.0},
        )
        return self.engine.process_swap(self.processor, req)

    def test_normal_range_swap(self) -> None:
        result = self._mint_and_swap(1000.0, 900.0)
        self.assertEqual(result.status, "SUCCESS")
        self.assertEqual(result.minted_output_qty, 900.0)
        self.assertFalse(result.audit_flagged)

    def test_second_deviation_applies_penalty(self) -> None:
        first = self._mint_and_swap(1000.0, 780.0)
        second = self._mint_and_swap(1000.0, 770.0)
        self.assertIn("warning", first.message)
        self.assertIn("penalty", second.message)
        self.assertEqual(second.minted_output_qty, 731.5)

    def test_claim_above_max_reverts(self) -> None:
        with self.assertRaises(EnforcementError):
            self._mint_and_swap(1000.0, 980.0)


if __name__ == "__main__":
    unittest.main()

