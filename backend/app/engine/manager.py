import asyncio
from typing import Any

from loguru import logger

from app.broker.adapter import BrokerAdapter
from app.engine.executor import StrategyExecutor
from app.strategies.base import BaseStrategy


class TradingManager:
    """Manages all active trading sessions (singleton)."""

    _instance: "TradingManager | None" = None

    def __new__(cls) -> "TradingManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._sessions = {}
            cls._instance._tasks = {}
        return cls._instance

    @property
    def sessions(self) -> dict[int, StrategyExecutor]:
        return self._sessions

    def start_session(
        self,
        session_id: int,
        user_id: int,
        broker: BrokerAdapter,
        strategy: BaseStrategy,
        stock_code: str,
        stock_name: str = "",
        interval_seconds: int = 60,
        order_quantity: int = 1,
    ) -> StrategyExecutor:
        if session_id in self._sessions:
            raise ValueError(f"Session {session_id} already active")

        executor = StrategyExecutor(
            session_id=session_id,
            user_id=user_id,
            broker=broker,
            strategy=strategy,
            stock_code=stock_code,
            stock_name=stock_name,
            interval_seconds=interval_seconds,
            order_quantity=order_quantity,
        )
        task = asyncio.create_task(
            self._run_executor(session_id, executor),
            name=f"trading-session-{session_id}",
        )
        self._sessions[session_id] = executor
        self._tasks[session_id] = task
        logger.bind(category="engine").info(f"Session {session_id} started")
        return executor

    async def _run_executor(self, session_id: int, executor: StrategyExecutor) -> None:
        try:
            await executor.run()
        except Exception as e:
            logger.bind(category="engine").error(f"Session {session_id} error: {e}")
        finally:
            self._sessions.pop(session_id, None)
            self._tasks.pop(session_id, None)
            logger.bind(category="engine").info(f"Session {session_id} cleaned up")

    def stop_session(self, session_id: int) -> None:
        executor = self._sessions.get(session_id)
        if executor:
            executor.stop()
            logger.bind(category="engine").info(f"Session {session_id} stop requested")

    def pause_session(self, session_id: int) -> None:
        executor = self._sessions.get(session_id)
        if executor:
            executor.pause()
            logger.bind(category="engine").info(f"Session {session_id} paused")

    def resume_session(self, session_id: int) -> None:
        executor = self._sessions.get(session_id)
        if executor:
            executor.resume()
            logger.bind(category="engine").info(f"Session {session_id} resumed")

    def get_active_session_ids(self) -> list[int]:
        return list(self._sessions.keys())

    def is_active(self, session_id: int) -> bool:
        return session_id in self._sessions


trading_manager = TradingManager()
