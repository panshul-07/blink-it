from __future__ import annotations

from dataclasses import dataclass

from .ledger import TokenLedger
from .models import OutputMaterialDDP, ProcessorDDP, SwapRequest, new_id
from .oracle import YieldStandardsOracle


class EnforcementError(Exception):
    pass


@dataclass
class SwapResult:
    status: str
    message: str
    output_token_id: str | None
    minted_output_qty: float
    audit_flagged: bool = False


class YieldEnforcementEngine:
    def __init__(self, oracle: YieldStandardsOracle, ledger: TokenLedger) -> None:
        self.oracle = oracle
        self.ledger = ledger
        self.processor_state: dict[str, dict[str, int]] = {}
        self.output_passports: dict[str, OutputMaterialDDP] = {}

    def _violation_count(self, processor_id: str, process_type: str) -> int:
        return self.processor_state.get(processor_id, {}).get(process_type, 0)

    def _increment_violation(self, processor_id: str, process_type: str) -> int:
        self.processor_state.setdefault(processor_id, {})
        self.processor_state[processor_id][process_type] = (
            self.processor_state[processor_id].get(process_type, 0) + 1
        )
        return self.processor_state[processor_id][process_type]

    def process_swap(self, processor: ProcessorDDP, req: SwapRequest) -> SwapResult:
        if processor.suspended:
            raise EnforcementError(f"processor {processor.processor_id} is suspended")
        if req.process_type not in processor.process_authorizations:
            raise EnforcementError("processor not authorized for this process type")
        if req.processor_id != processor.processor_id:
            raise EnforcementError("processor identity mismatch")

        standards = self.oracle.get_range(req.process_type)
        claimed_yield = req.claimed_yield_pct()

        if claimed_yield > standards.maximum_pct:
            raise EnforcementError(
                f"reverted: claimed yield {claimed_yield:.2f}% exceeds max {standards.maximum_pct:.2f}%"
            )

        mint_qty = req.claimed_output_qty
        audit_flagged = False
        message = "swap accepted in normal range"

        if claimed_yield < standards.minimum_pct:
            violation = self._increment_violation(req.processor_id, req.process_type)
            if violation == 1:
                message = "warning: below minimum efficiency, transaction proceeds"
            elif violation == 2:
                mint_qty = round(req.claimed_output_qty * 0.95, 6)
                message = "penalty: second deviation, minting ratio reduced by 5%"
            elif violation == 3:
                mint_qty = round(req.claimed_output_qty * 0.90, 6)
                message = "audit: third deviation flagged, minting ratio reduced by 10%"
                audit_flagged = True
            else:
                processor.suspended = True
                raise EnforcementError("processor suspended due to persistent violations")

        burned_qty = self.ledger.burn(req.input_token_id, req.processor_id)
        if abs(burned_qty - req.input_qty) > 1e-9:
            raise EnforcementError(
                f"input quantity mismatch: token has {burned_qty}, request has {req.input_qty}"
            )

        output_token_id = new_id("out")
        self.ledger.mint(
            token_id=output_token_id,
            owner=req.processor_id,
            quantity=mint_qty,
            metadata={
                "parent_input_token_id": req.input_token_id,
                "process_type": req.process_type,
                "claimed_yield_pct": claimed_yield,
            },
        )

        passport = OutputMaterialDDP(
            token_id=output_token_id,
            parent_input_token_id=req.input_token_id,
            processor_id=req.processor_id,
            process_type=req.process_type,
            output_quantity=mint_qty,
            claimed_yield_pct=claimed_yield,
            actual_yield_pct=(mint_qty / req.input_qty) * 100.0,
            loss_breakdown=req.loss_breakdown,
        )
        self.output_passports[output_token_id] = passport

        return SwapResult(
            status="SUCCESS",
            message=message,
            output_token_id=output_token_id,
            minted_output_qty=mint_qty,
            audit_flagged=audit_flagged,
        )

