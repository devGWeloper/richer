import pandas as pd

from app.engine.signals import Signal
from app.strategies.base import BaseStrategy


class ThresholdStrategy(BaseStrategy):
    name = "threshold"
    description = "가격 기준 전략 - 현재가가 매수가 이하이면 매수, 매도가 이상이면 매도"

    def validate_parameters(self) -> None:
        self.buy_price = float(self.parameters.get("buy_price", 0))
        self.sell_price = float(self.parameters.get("sell_price", 0))
        if self.buy_price <= 0 or self.sell_price <= 0:
            raise ValueError("buy_price and sell_price must be positive")
        if self.buy_price >= self.sell_price:
            raise ValueError("buy_price must be less than sell_price")

    def evaluate(
        self,
        current_price: float,
        ohlcv_df: pd.DataFrame,
        holdings: dict | None,
    ) -> Signal:
        if current_price <= self.buy_price:
            self._last_reason = (
                f"Price {current_price:,.0f} <= buy threshold {self.buy_price:,.0f}"
            )
            return Signal.BUY

        if current_price >= self.sell_price:
            self._last_reason = (
                f"Price {current_price:,.0f} >= sell threshold {self.sell_price:,.0f}"
            )
            return Signal.SELL

        self._last_reason = (
            f"Price {current_price:,.0f} between "
            f"{self.buy_price:,.0f} and {self.sell_price:,.0f}"
        )
        return Signal.HOLD

    @classmethod
    def parameter_schema(cls) -> dict:
        return {
            "buy_price": {
                "type": "number",
                "description": "매수 기준가 (이하이면 매수)",
            },
            "sell_price": {
                "type": "number",
                "description": "매도 기준가 (이상이면 매도)",
            },
        }
