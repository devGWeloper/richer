import pandas as pd
from ta.momentum import RSIIndicator

from app.engine.signals import Signal
from app.strategies.base import BaseStrategy


class RSIStrategy(BaseStrategy):
    name = "rsi"
    description = "RSI 전략 - RSI가 과매도 기준 이하이면 매수, 과매수 기준 이상이면 매도"

    def validate_parameters(self) -> None:
        self.rsi_period = int(self.parameters.get("rsi_period", 14))
        self.oversold = float(self.parameters.get("oversold", 30))
        self.overbought = float(self.parameters.get("overbought", 70))
        if self.oversold >= self.overbought:
            raise ValueError("oversold must be less than overbought")

    def evaluate(
        self,
        current_price: float,
        ohlcv_df: pd.DataFrame,
        holdings: dict | None,
    ) -> Signal:
        if len(ohlcv_df) < self.rsi_period + 1:
            self._last_reason = f"Insufficient data: need {self.rsi_period + 1} candles"
            return Signal.HOLD

        close = ohlcv_df["close"].astype(float)
        rsi = RSIIndicator(close, window=self.rsi_period).rsi()
        current_rsi = rsi.iloc[-1]

        if pd.isna(current_rsi):
            self._last_reason = "RSI value not available"
            return Signal.HOLD

        if current_rsi <= self.oversold:
            self._last_reason = f"RSI oversold: {current_rsi:.1f} <= {self.oversold}"
            return Signal.BUY

        if current_rsi >= self.overbought:
            self._last_reason = f"RSI overbought: {current_rsi:.1f} >= {self.overbought}"
            return Signal.SELL

        self._last_reason = f"RSI neutral: {current_rsi:.1f}"
        return Signal.HOLD

    @classmethod
    def parameter_schema(cls) -> dict:
        return {
            "rsi_period": {
                "type": "integer",
                "default": 14,
                "min": 2,
                "max": 50,
                "description": "RSI 기간",
            },
            "oversold": {
                "type": "number",
                "default": 30,
                "min": 10,
                "max": 50,
                "description": "과매도 기준 (이하이면 매수)",
            },
            "overbought": {
                "type": "number",
                "default": 70,
                "min": 50,
                "max": 90,
                "description": "과매수 기준 (이상이면 매도)",
            },
        }
