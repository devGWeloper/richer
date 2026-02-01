import pandas as pd
from ta.trend import SMAIndicator

from app.engine.signals import Signal
from app.strategies.base import BaseStrategy


class SMACrossoverStrategy(BaseStrategy):
    name = "sma_crossover"
    description = "이동평균 교차 전략 - 단기 MA가 장기 MA를 상향돌파하면 매수, 하향돌파하면 매도"

    def validate_parameters(self) -> None:
        self.short_period = int(self.parameters.get("short_period", 5))
        self.long_period = int(self.parameters.get("long_period", 20))
        if self.short_period >= self.long_period:
            raise ValueError("short_period must be less than long_period")

    def evaluate(
        self,
        current_price: float,
        ohlcv_df: pd.DataFrame,
        holdings: dict | None,
    ) -> Signal:
        if len(ohlcv_df) < self.long_period + 1:
            self._last_reason = f"Insufficient data: need {self.long_period + 1} candles"
            return Signal.HOLD

        close = ohlcv_df["close"].astype(float)
        short_ma = SMAIndicator(close, window=self.short_period).sma_indicator()
        long_ma = SMAIndicator(close, window=self.long_period).sma_indicator()

        prev_short = short_ma.iloc[-2]
        prev_long = long_ma.iloc[-2]
        curr_short = short_ma.iloc[-1]
        curr_long = long_ma.iloc[-1]

        if pd.isna(prev_short) or pd.isna(prev_long):
            self._last_reason = "MA values not available yet"
            return Signal.HOLD

        # Golden cross: short crosses above long
        if prev_short <= prev_long and curr_short > curr_long:
            self._last_reason = (
                f"Golden cross: SMA{self.short_period}({curr_short:.0f}) > "
                f"SMA{self.long_period}({curr_long:.0f})"
            )
            return Signal.BUY

        # Death cross: short crosses below long
        if prev_short >= prev_long and curr_short < curr_long:
            self._last_reason = (
                f"Death cross: SMA{self.short_period}({curr_short:.0f}) < "
                f"SMA{self.long_period}({curr_long:.0f})"
            )
            return Signal.SELL

        self._last_reason = (
            f"No crossover: SMA{self.short_period}={curr_short:.0f}, "
            f"SMA{self.long_period}={curr_long:.0f}"
        )
        return Signal.HOLD

    @classmethod
    def parameter_schema(cls) -> dict:
        return {
            "short_period": {
                "type": "integer",
                "default": 5,
                "min": 2,
                "max": 50,
                "description": "단기 이동평균 기간",
            },
            "long_period": {
                "type": "integer",
                "default": 20,
                "min": 5,
                "max": 200,
                "description": "장기 이동평균 기간",
            },
        }
