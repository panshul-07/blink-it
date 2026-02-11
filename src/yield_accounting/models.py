from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict
from uuid import uuid4


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


@dataclass
class ProcessorDDP:
    processor_id: str
    process_authorizations: list[str]
    certification_level: str
    equipment_specs: str
    compliance_score: float = 1.0
    suspended: bool = False


@dataclass
class InputMaterialDDP:
    token_id: str
    process_type: str
    quantity: float
    origin_farm_hash: str
    quality_grade: str
    moisture_content: float
    created_at: str = field(default_factory=utc_now_iso)


@dataclass
class OutputMaterialDDP:
    token_id: str
    parent_input_token_id: str
    processor_id: str
    process_type: str
    output_quantity: float
    claimed_yield_pct: float
    actual_yield_pct: float
    loss_breakdown: Dict[str, float]
    timestamp: str = field(default_factory=utc_now_iso)


@dataclass
class SwapRequest:
    processor_id: str
    input_token_id: str
    input_qty: float
    claimed_output_qty: float
    process_type: str
    loss_breakdown: Dict[str, float]

    def claimed_yield_pct(self) -> float:
        if self.input_qty <= 0:
            return 0.0
        return (self.claimed_output_qty / self.input_qty) * 100.0

