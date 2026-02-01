from abc import ABC, abstractmethod

import pandas as pd

from app.engine.signals import Signal


class BaseStrategy(ABC):
    """Abstract base class for all trading strategies."""

    name: str = ""
    description: str = ""

    def __init__(self, parameters: dict):
        self.parameters = parameters
        self._last_reason = ""
        self.validate_parameters()

    @abstractmethod
    def validate_parameters(self) -> None:
        """Validate that the provided parameters are correct."""
        ...

    @abstractmethod
    def evaluate(
        self,
        current_price: float,
        ohlcv_df: pd.DataFrame,
        holdings: dict | None,
    ) -> Signal:
        """Evaluate market data and return a trading signal."""
        ...

    def get_signal_reason(self) -> str:
        return self._last_reason

    @classmethod
    @abstractmethod
    def parameter_schema(cls) -> dict:
        """Return a dict describing the strategy parameters."""
        ...
