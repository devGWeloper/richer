import asyncio
from datetime import datetime, timezone, timedelta

import pandas as pd
from loguru import logger

from app.broker.adapter import BrokerAdapter
from app.engine.signals import Signal
from app.strategies.base import BaseStrategy


# KST = UTC+9
KST = timezone(timedelta(hours=9))
MARKET_OPEN = (9, 0)
MARKET_CLOSE = (15, 30)


def _is_market_open() -> bool:
    now = datetime.now(KST)
    if now.weekday() >= 5:  # Saturday or Sunday
        return False
    t = (now.hour, now.minute)
    return MARKET_OPEN <= t <= MARKET_CLOSE


class StrategyExecutor:
    """Runs the strategy evaluation loop for a single trading session."""

    def __init__(
        self,
        session_id: int,
        user_id: int,
        broker: BrokerAdapter,
        strategy: BaseStrategy,
        stock_code: str,
        stock_name: str = "",
        interval_seconds: int = 60,
        order_quantity: int = 1,
    ):
        self.session_id = session_id
        self.user_id = user_id
        self.broker = broker
        self.strategy = strategy
        self.stock_code = stock_code
        self.stock_name = stock_name
        self.interval_seconds = interval_seconds
        self.order_quantity = order_quantity

        self._running = asyncio.Event()
        self._stopped = asyncio.Event()
        self._paused = asyncio.Event()
        self._running.set()

    async def run(self) -> None:
        log = logger.bind(category="engine")
        log.info(f"[Session {self.session_id}] Executor started for {self.stock_code}")

        try:
            while self._running.is_set() and not self._stopped.is_set():
                # Check if paused
                if self._paused.is_set():
                    log.info(f"[Session {self.session_id}] Paused, waiting for resume")
                    while self._paused.is_set() and not self._stopped.is_set():
                        await asyncio.sleep(1)
                    if self._stopped.is_set():
                        break
                    log.info(f"[Session {self.session_id}] Resumed")

                # Check market hours
                if not _is_market_open():
                    log.debug(f"[Session {self.session_id}] Market closed, waiting")
                    await asyncio.sleep(30)
                    continue

                try:
                    await self._execute_cycle()
                except Exception as e:
                    log.error(f"[Session {self.session_id}] Cycle error: {e}")

                # Wait for next cycle
                try:
                    await asyncio.wait_for(
                        self._stopped.wait(), timeout=self.interval_seconds
                    )
                    break  # stopped was set
                except asyncio.TimeoutError:
                    pass  # normal timeout, continue loop
        finally:
            log.info(f"[Session {self.session_id}] Executor stopped")

    async def _execute_cycle(self) -> None:
        log = logger.bind(category="strategy")

        # Fetch data
        price_data = await self.broker.get_current_price(self.stock_code)
        current_price = price_data.get("current_price", 0)
        if current_price <= 0:
            log.warning(f"[Session {self.session_id}] Invalid price: {current_price}")
            return

        ohlcv_data = await self.broker.get_ohlcv(self.stock_code, "D", 60)
        ohlcv_df = pd.DataFrame(ohlcv_data) if ohlcv_data else pd.DataFrame()

        holdings_list = await self.broker.get_holdings()
        holdings = None
        for h in holdings_list:
            code = h.get("pdno", h.get("stock_code", ""))
            if code == self.stock_code:
                holdings = h
                break

        # Evaluate strategy
        signal = self.strategy.evaluate(current_price, ohlcv_df, holdings)
        reason = self.strategy.get_signal_reason()
        log.info(
            f"[Session {self.session_id}] {self.stock_code} "
            f"price={current_price:,.0f} signal={signal.value} reason={reason}"
        )

        # Execute order if needed
        if signal == Signal.BUY:
            await self._execute_buy(current_price, reason)
        elif signal == Signal.SELL:
            await self._execute_sell(current_price, reason)

    async def _execute_buy(self, price: float, reason: str) -> None:
        log = logger.bind(category="order")
        try:
            result = await self.broker.buy_market(self.stock_code, self.order_quantity)
            log.info(
                f"[Session {self.session_id}] BUY {self.stock_code} "
                f"x{self.order_quantity} @ ~{price:,.0f} | {reason} | order={result}"
            )
        except Exception as e:
            log.error(f"[Session {self.session_id}] BUY failed: {e}")

    async def _execute_sell(self, price: float, reason: str) -> None:
        log = logger.bind(category="order")
        try:
            result = await self.broker.sell_market(self.stock_code, self.order_quantity)
            log.info(
                f"[Session {self.session_id}] SELL {self.stock_code} "
                f"x{self.order_quantity} @ ~{price:,.0f} | {reason} | order={result}"
            )
        except Exception as e:
            log.error(f"[Session {self.session_id}] SELL failed: {e}")

    def pause(self) -> None:
        self._paused.set()

    def resume(self) -> None:
        self._paused.clear()

    def stop(self) -> None:
        self._stopped.set()
        self._running.clear()
        self._paused.clear()  # unblock if paused

    @property
    def is_running(self) -> bool:
        return self._running.is_set() and not self._stopped.is_set()

    @property
    def is_paused(self) -> bool:
        return self._paused.is_set()
