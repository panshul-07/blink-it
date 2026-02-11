from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class TokenEvent:
    event_type: str
    token_id: str
    owner: str
    quantity: float
    timestamp: str
    metadata: dict


class TokenLedger:
    def __init__(self) -> None:
        self._balances: dict[str, tuple[str, float]] = {}
        self._events: list[TokenEvent] = []

    def mint(self, token_id: str, owner: str, quantity: float, metadata: dict | None = None) -> None:
        if quantity <= 0:
            raise ValueError("mint quantity must be positive")
        if token_id in self._balances:
            raise ValueError(f"token already exists: {token_id}")
        self._balances[token_id] = (owner, quantity)
        self._events.append(
            TokenEvent(
                event_type="MINT",
                token_id=token_id,
                owner=owner,
                quantity=quantity,
                timestamp=datetime.now(timezone.utc).isoformat(),
                metadata=metadata or {},
            )
        )

    def burn(self, token_id: str, owner: str) -> float:
        if token_id not in self._balances:
            raise KeyError(f"token not found: {token_id}")
        current_owner, quantity = self._balances[token_id]
        if current_owner != owner:
            raise PermissionError(f"owner mismatch: token owner={current_owner} caller={owner}")
        del self._balances[token_id]
        self._events.append(
            TokenEvent(
                event_type="BURN",
                token_id=token_id,
                owner=owner,
                quantity=quantity,
                timestamp=datetime.now(timezone.utc).isoformat(),
                metadata={},
            )
        )
        return quantity

    def get_balance(self, token_id: str) -> tuple[str, float]:
        return self._balances[token_id]

    @property
    def events(self) -> list[TokenEvent]:
        return list(self._events)

