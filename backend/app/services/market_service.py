from app.broker.adapter import BrokerAdapter


async def get_current_price(broker: BrokerAdapter, stock_code: str) -> dict:
    return await broker.get_current_price(stock_code)


async def get_ohlcv(
    broker: BrokerAdapter, stock_code: str, period: str = "D", count: int = 60
) -> list[dict]:
    return await broker.get_ohlcv(stock_code, period, count)
