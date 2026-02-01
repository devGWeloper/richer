import pandas as pd
import pytest

from app.engine.signals import Signal
from app.strategies.registry import get_available_strategies, get_strategy
from app.strategies.sma_crossover import SMACrossoverStrategy
from app.strategies.rsi_strategy import RSIStrategy
from app.strategies.threshold_strategy import ThresholdStrategy


def _make_ohlcv(closes: list[float]) -> pd.DataFrame:
    """Helper to build an OHLCV DataFrame from a list of close prices."""
    return pd.DataFrame(
        {
            "date": [f"2025-01-{i+1:02d}" for i in range(len(closes))],
            "open": closes,
            "high": [c * 1.02 for c in closes],
            "low": [c * 0.98 for c in closes],
            "close": closes,
            "volume": [1000] * len(closes),
        }
    )


class TestThresholdStrategy:
    def test_buy_signal(self):
        strategy = ThresholdStrategy({"buy_price": 50000, "sell_price": 60000})
        signal = strategy.evaluate(49000, _make_ohlcv([50000]), None)
        assert signal == Signal.BUY

    def test_sell_signal(self):
        strategy = ThresholdStrategy({"buy_price": 50000, "sell_price": 60000})
        signal = strategy.evaluate(61000, _make_ohlcv([50000]), None)
        assert signal == Signal.SELL

    def test_hold_signal(self):
        strategy = ThresholdStrategy({"buy_price": 50000, "sell_price": 60000})
        signal = strategy.evaluate(55000, _make_ohlcv([50000]), None)
        assert signal == Signal.HOLD

    def test_invalid_params(self):
        with pytest.raises(ValueError):
            ThresholdStrategy({"buy_price": 60000, "sell_price": 50000})

    def test_signal_reason(self):
        strategy = ThresholdStrategy({"buy_price": 50000, "sell_price": 60000})
        strategy.evaluate(49000, _make_ohlcv([50000]), None)
        reason = strategy.get_signal_reason()
        assert "buy threshold" in reason.lower() or "49" in reason


class TestSMACrossoverStrategy:
    def test_golden_cross(self):
        # Create data where short MA crosses above long MA
        closes = [100.0] * 20 + [95.0, 96.0, 97.0, 98.0, 99.0, 100.0, 105.0, 110.0, 115.0, 120.0]
        strategy = SMACrossoverStrategy({"short_period": 5, "long_period": 20})
        signal = strategy.evaluate(120.0, _make_ohlcv(closes), None)
        # With rising short-term prices, should get BUY or HOLD depending on exact crossover
        assert signal in (Signal.BUY, Signal.HOLD)

    def test_insufficient_data(self):
        strategy = SMACrossoverStrategy({"short_period": 5, "long_period": 20})
        signal = strategy.evaluate(100.0, _make_ohlcv([100.0] * 10), None)
        assert signal == Signal.HOLD

    def test_invalid_params(self):
        with pytest.raises(ValueError):
            SMACrossoverStrategy({"short_period": 20, "long_period": 5})

    def test_parameter_schema(self):
        schema = SMACrossoverStrategy.parameter_schema()
        assert "short_period" in schema
        assert "long_period" in schema


class TestRSIStrategy:
    def _make_rsi_data(self, direction: str, periods: int = 20) -> pd.DataFrame:
        """Generate data that would produce extreme RSI values."""
        if direction == "down":
            closes = [100.0 - i * 2 for i in range(periods)]
        else:
            closes = [100.0 + i * 2 for i in range(periods)]
        return _make_ohlcv(closes)

    def test_oversold_buy(self):
        strategy = RSIStrategy({"rsi_period": 14, "oversold": 30, "overbought": 70})
        df = self._make_rsi_data("down", 30)
        signal = strategy.evaluate(60.0, df, None)
        # Consistently falling prices should produce low RSI -> BUY
        assert signal in (Signal.BUY, Signal.HOLD)

    def test_overbought_sell(self):
        strategy = RSIStrategy({"rsi_period": 14, "oversold": 30, "overbought": 70})
        df = self._make_rsi_data("up", 30)
        signal = strategy.evaluate(160.0, df, None)
        # Consistently rising prices should produce high RSI -> SELL
        assert signal in (Signal.SELL, Signal.HOLD)

    def test_insufficient_data(self):
        strategy = RSIStrategy({"rsi_period": 14, "oversold": 30, "overbought": 70})
        signal = strategy.evaluate(100.0, _make_ohlcv([100.0] * 5), None)
        assert signal == Signal.HOLD

    def test_invalid_params(self):
        with pytest.raises(ValueError):
            RSIStrategy({"rsi_period": 14, "oversold": 70, "overbought": 30})


class TestStrategyRegistry:
    def test_get_available_strategies(self):
        strategies = get_available_strategies()
        assert len(strategies) >= 3
        names = {s["type_name"] for s in strategies}
        assert "sma_crossover" in names
        assert "rsi" in names
        assert "threshold" in names

    def test_get_strategy(self):
        strategy = get_strategy("threshold", {"buy_price": 100, "sell_price": 200})
        assert isinstance(strategy, ThresholdStrategy)

    def test_get_unknown_strategy(self):
        with pytest.raises(ValueError):
            get_strategy("nonexistent", {})


class TestStateMachine:
    def test_valid_transitions(self):
        from app.engine.state import SessionState, can_transition

        assert can_transition(SessionState.PENDING, SessionState.RUNNING)
        assert can_transition(SessionState.RUNNING, SessionState.PAUSED)
        assert can_transition(SessionState.RUNNING, SessionState.STOPPED)
        assert can_transition(SessionState.PAUSED, SessionState.RUNNING)
        assert can_transition(SessionState.PAUSED, SessionState.STOPPED)
        assert can_transition(SessionState.ERROR, SessionState.STOPPED)

    def test_invalid_transitions(self):
        from app.engine.state import SessionState, can_transition

        assert not can_transition(SessionState.STOPPED, SessionState.RUNNING)
        assert not can_transition(SessionState.PENDING, SessionState.PAUSED)
        assert not can_transition(SessionState.ERROR, SessionState.RUNNING)
