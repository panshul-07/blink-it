#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

from yield_accounting.engine import EnforcementError, YieldEnforcementEngine
from yield_accounting.ledger import TokenLedger
from yield_accounting.models import ProcessorDDP, SwapRequest, new_id
from yield_accounting.oracle import YieldStandardsOracle


def print_result(title: str, payload: dict) -> None:
    print(f"\n{title}")
    print(json.dumps(payload, indent=2))


def run() -> None:
    oracle = YieldStandardsOracle()
    ledger = TokenLedger()
    engine = YieldEnforcementEngine(oracle=oracle, ledger=ledger)

    oracle.set_range(
        process_type="grain_cleaning",
        minimum_pct=82.0,
        maximum_pct=93.0,
        actor="standards_body_v1",
        reason="initial engineering baseline",
    )

    processor = ProcessorDDP(
        processor_id="proc_alpha",
        process_authorizations=["grain_cleaning"],
        certification_level="L2",
        equipment_specs="Optical sorter + rotary cleaner",
    )

    scenarios = [
        ("Normal swap", 1000.0, 900.0, {"evaporation": 3.0, "waste": 7.0}),
        ("Low-efficiency deviation #1", 1000.0, 780.0, {"evaporation": 8.0, "waste": 14.0}),
        ("Low-efficiency deviation #2", 1000.0, 770.0, {"evaporation": 9.0, "waste": 14.0}),
        ("Impossible claim (should revert)", 1000.0, 980.0, {"evaporation": 1.0, "waste": 1.0}),
    ]

    for title, input_qty, out_qty, loss_breakdown in scenarios:
        in_token = new_id("in")
        ledger.mint(
            token_id=in_token,
            owner=processor.processor_id,
            quantity=input_qty,
            metadata={"process_type": "grain_cleaning"},
        )
        req = SwapRequest(
            processor_id=processor.processor_id,
            input_token_id=in_token,
            input_qty=input_qty,
            claimed_output_qty=out_qty,
            process_type="grain_cleaning",
            loss_breakdown=loss_breakdown,
        )
        try:
            result = engine.process_swap(processor, req)
            print_result(
                title,
                {
                    "status": result.status,
                    "message": result.message,
                    "output_token_id": result.output_token_id,
                    "minted_output_qty": result.minted_output_qty,
                    "audit_flagged": result.audit_flagged,
                },
            )
        except EnforcementError as err:
            print_result(title, {"status": "REVERTED", "error": str(err)})


if __name__ == "__main__":
    run()

