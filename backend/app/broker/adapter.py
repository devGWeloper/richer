from abc import ABC, abstractmethod
from typing import Any


class BrokerAdapter(ABC):
    """Abstract base class for broker implementations."""

    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection to the broker. Returns True on success."""
        ...

    @abstractmethod
    async def get_balance(self) -> dict[str, Any]:
        """Retrieve account balance information."""
        ...

    @abstractmethod
    async def get_holdings(self) -> list[dict[str, Any]]:
        """Retrieve current stock holdings."""
        ...

    @abstractmethod
    async def get_current_price(self, stock_code: str) -> dict[str, Any]:
        """Retrieve the current price for a given stock code."""
        ...

    @abstractmethod
    async def get_ohlcv(
        self, stock_code: str, period: str = "D", count: int = 60
    ) -> list[dict[str, Any]]:
        """Retrieve OHLCV (Open/High/Low/Close/Volume) data."""
        ...

    @abstractmethod
    async def buy_market(self, stock_code: str, quantity: int) -> dict[str, Any]:
        """Place a market buy order."""
        ...

    @abstractmethod
    async def sell_market(self, stock_code: str, quantity: int) -> dict[str, Any]:
        """Place a market sell order."""
        ...

    @abstractmethod
    async def buy_limit(
        self, stock_code: str, quantity: int, price: int
    ) -> dict[str, Any]:
        """Place a limit buy order."""
        ...

    @abstractmethod
    async def sell_limit(
        self, stock_code: str, quantity: int, price: int
    ) -> dict[str, Any]:
        """Place a limit sell order."""
        ...
