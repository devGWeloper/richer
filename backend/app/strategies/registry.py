from app.strategies.base import BaseStrategy
from app.strategies.rsi_strategy import RSIStrategy
from app.strategies.sma_crossover import SMACrossoverStrategy
from app.strategies.threshold_strategy import ThresholdStrategy

_REGISTRY: dict[str, type[BaseStrategy]] = {
    "sma_crossover": SMACrossoverStrategy,
    "rsi": RSIStrategy,
    "threshold": ThresholdStrategy,
}


def get_strategy(strategy_type: str, parameters: dict) -> BaseStrategy:
    cls = _REGISTRY.get(strategy_type)
    if cls is None:
        raise ValueError(f"Unknown strategy type: {strategy_type}")
    return cls(parameters)


def get_available_strategies() -> list[dict]:
    result = []
    for key, cls in _REGISTRY.items():
        result.append(
            {
                "type_name": key,
                "display_name": cls.name,
                "description": cls.description,
                "parameter_schema": cls.parameter_schema(),
            }
        )
    return result
