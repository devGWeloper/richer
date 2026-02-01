from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.broker.adapter import BrokerAdapter
from app.models.trade import Trade


async def execute_buy(
    db: AsyncSession,
    broker: BrokerAdapter,
    session_id: int,
    user_id: int,
    stock_code: str,
    stock_name: str,
    quantity: int,
    signal_reason: str,
) -> Trade:
    trade = Trade(
        session_id=session_id,
        user_id=user_id,
        stock_code=stock_code,
        stock_name=stock_name,
        side="BUY",
        order_type="MARKET",
        quantity=quantity,
        status="submitted",
        signal_reason=signal_reason,
    )
    db.add(trade)
    await db.flush()

    try:
        result = await broker.buy_market(stock_code, quantity)
        trade.kis_order_no = result.get("order_no", "")
        trade.filled_price = result.get("filled_price")
        trade.filled_quantity = result.get("filled_quantity", quantity)
        trade.status = "filled"
        logger.bind(category="order").info(
            f"BUY filled: {stock_code} x{quantity} @ {trade.filled_price}"
        )
    except Exception as e:
        trade.status = "rejected"
        logger.bind(category="order").error(f"BUY failed: {stock_code} - {e}")

    await db.flush()
    return trade


async def execute_sell(
    db: AsyncSession,
    broker: BrokerAdapter,
    session_id: int,
    user_id: int,
    stock_code: str,
    stock_name: str,
    quantity: int,
    signal_reason: str,
) -> Trade:
    trade = Trade(
        session_id=session_id,
        user_id=user_id,
        stock_code=stock_code,
        stock_name=stock_name,
        side="SELL",
        order_type="MARKET",
        quantity=quantity,
        status="submitted",
        signal_reason=signal_reason,
    )
    db.add(trade)
    await db.flush()

    try:
        result = await broker.sell_market(stock_code, quantity)
        trade.kis_order_no = result.get("order_no", "")
        trade.filled_price = result.get("filled_price")
        trade.filled_quantity = result.get("filled_quantity", quantity)
        trade.status = "filled"
        logger.bind(category="order").info(
            f"SELL filled: {stock_code} x{quantity} @ {trade.filled_price}"
        )
    except Exception as e:
        trade.status = "rejected"
        logger.bind(category="order").error(f"SELL failed: {stock_code} - {e}")

    await db.flush()
    return trade
