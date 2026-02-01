from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.engine.state import SessionState
from app.models.trade import Trade
from app.models.trade_session import TradeSession


async def get_active_session_count(db: AsyncSession, user_id: int) -> int:
    result = await db.execute(
        select(func.count(TradeSession.id)).where(
            TradeSession.user_id == user_id,
            TradeSession.status == SessionState.RUNNING,
        )
    )
    return result.scalar() or 0


async def get_today_trade_count(db: AsyncSession, user_id: int) -> int:
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    result = await db.execute(
        select(func.count(Trade.id)).where(
            Trade.user_id == user_id,
            Trade.created_at >= today_start,
        )
    )
    return result.scalar() or 0


async def get_recent_trades(
    db: AsyncSession, user_id: int, limit: int = 20
) -> list[Trade]:
    result = await db.execute(
        select(Trade)
        .where(Trade.user_id == user_id)
        .order_by(Trade.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
