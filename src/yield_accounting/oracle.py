from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class YieldRange:
    minimum_pct: float
    maximum_pct: float


@dataclass
class OracleUpdateEvent:
    process_type: str
    old_range: YieldRange | None
    new_range: YieldRange
    actor: str
    reason: str
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class YieldStandardsOracle:
    def __init__(self) -> None:
        self._ranges: dict[str, YieldRange] = {}
        self._history: list[OracleUpdateEvent] = []

    def set_range(
        self, process_type: str, minimum_pct: float, maximum_pct: float, actor: str, reason: str
    ) -> None:
        if minimum_pct < 0 or maximum_pct > 100 or minimum_pct >= maximum_pct:
            raise ValueError("invalid yield range")
        old = self._ranges.get(process_type)
        new = YieldRange(minimum_pct=minimum_pct, maximum_pct=maximum_pct)
        self._ranges[process_type] = new
        self._history.append(
            OracleUpdateEvent(
                process_type=process_type,
                old_range=old,
                new_range=new,
                actor=actor,
                reason=reason,
            )
        )

    def get_range(self, process_type: str) -> YieldRange:
        try:
            return self._ranges[process_type]
        except KeyError as exc:
            raise KeyError(f"no oracle range configured for process_type={process_type}") from exc

    @property
    def history(self) -> list[OracleUpdateEvent]:
        return list(self._history)

