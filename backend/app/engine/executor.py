import asyncio
from datetime import datetime, timezone, timedelta

import pandas as pd
from loguru import logger

from app.broker.adapter import BrokerAdapter
from app.engine.signals import Signal
from app.strategies.base import BaseStrategy
from app.ws.manager import ws_manager


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


def _get_market_status() -> dict:
    """Get current market status information."""
    now = datetime.now(KST)
    is_open = _is_market_open()

    if now.weekday() >= 5:
        reason = "weekend"
        next_open = "월요일 09:00"
    elif (now.hour, now.minute) < MARKET_OPEN:
        reason = "before_open"
        next_open = "오늘 09:00"
    elif (now.hour, now.minute) > MARKET_CLOSE:
        reason = "after_close"
        next_open = "내일 09:00"
    else:
        reason = "open"
        next_open = None

    return {
        "is_open": is_open,
        "reason": reason,
        "next_open": next_open,
        "current_time": now.strftime("%H:%M:%S"),
    }


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
                    await self._send_status_update("paused", "일시정지 중")
                    while self._paused.is_set() and not self._stopped.is_set():
                        await asyncio.sleep(1)
                    if self._stopped.is_set():
                        break
                    log.info(f"[Session {self.session_id}] Resumed")
                    await self._send_status_update("running", "재개됨")

                # Check market hours
                market_status = _get_market_status()
                if not market_status["is_open"]:
                    log.debug(f"[Session {self.session_id}] Market closed, waiting")
                    await self._send_status_update(
                        "waiting_market",
                        "장 시간 대기 중",
                        market_status=market_status,
                    )
                    await asyncio.sleep(30)
                    continue

                try:
                    await self._execute_cycle()
                except Exception as e:
                    log.error(f"[Session {self.session_id}] Cycle error: {e}")
                    await self._send_status_update("error", f"오류: {str(e)[:50]}")

                # Wait for next cycle
                next_check = datetime.now(KST) + timedelta(seconds=self.interval_seconds)
                await self._send_status_update(
                    "running",
                    f"다음 체크: {next_check.strftime('%H:%M:%S')}",
                    next_check_at=next_check.isoformat(),
                )

                try:
                    await asyncio.wait_for(
                        self._stopped.wait(), timeout=self.interval_seconds
                    )
                    break  # stopped was set
                except asyncio.TimeoutError:
                    pass  # normal timeout, continue loop
        finally:
            log.info(f"[Session {self.session_id}] Executor stopped")
            await self._send_status_update("stopped", "중지됨")

    async def _execute_cycle(self) -> None:
        log = logger.bind(category="strategy")

        await self._send_status_update("checking", "시세 조회 중...")

        # Fetch data
        price_data = await self.broker.get_current_price(self.stock_code)
        current_price = price_data.get("current_price", 0)
        if current_price <= 0:
            log.warning(f"[Session {self.session_id}] Invalid price: {current_price}")
            await self._send_status_update("error", "시세 조회 실패")
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

        await self._send_status_update("evaluating", "전략 평가 중...")

        # Evaluate strategy
        signal = self.strategy.evaluate(current_price, ohlcv_df, holdings)
        reason = self.strategy.get_signal_reason()
        log.info(
            f"[Session {self.session_id}] {self.stock_code} "
            f"price={current_price:,.0f} signal={signal.value} reason={reason}"
        )

        # Send signal result
        await self._send_status_update(
            "evaluated",
            reason,
            current_price=current_price,
            signal=signal.value,
            signal_reason=reason,
            last_checked_at=datetime.now(KST).isoformat(),
        )

        # Execute order if needed
        if signal == Signal.BUY:
            await self._send_status_update("ordering", "매수 주문 중...")
            await self._execute_buy(current_price, reason)
        elif signal == Signal.SELL:
            await self._send_status_update("ordering", "매도 주문 중...")
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

    async def _send_status_update(
        self,
        status: str,
        message: str,
        **extra_data,
    ) -> None:
        """Send status update via WebSocket."""
        payload = {
            "session_id": self.session_id,
            "stock_code": self.stock_code,
            "stock_name": self.stock_name,
            "status": status,
            "message": message,
            "timestamp": datetime.now(KST).isoformat(),
            **extra_data,
        }
        await ws_manager.send_to_user(
            self.user_id,
            "session.status",
            "trading",
            payload,
        )

    @property
    def is_running(self) -> bool:
        return self._running.is_set() and not self._stopped.is_set()

    @property
    def is_paused(self) -> bool:
        return self._paused.is_set()
