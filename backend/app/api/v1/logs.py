from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.trade import Trade
from app.models.trade_log import TradeLog
from app.models.user import User
from app.schemas.trading import TradeResponse

router = APIRouter()


@router.get("/trades", response_model=list[TradeResponse])
async def list_trades(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * size
    result = await db.execute(
        select(Trade)
        .where(Trade.user_id == current_user.id)
        .order_by(Trade.created_at.desc())
        .offset(offset)
        .limit(size)
    )
    return list(result.scalars().all())


@router.get("/logs")
async def list_logs(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    category: str | None = Query(None),
    level: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(TradeLog).where(TradeLog.user_id == current_user.id)
    if category:
        query = query.where(TradeLog.category == category)
    if level:
        query = query.where(TradeLog.level == level)
    query = query.order_by(TradeLog.created_at.desc()).offset((page - 1) * size).limit(size)

    result = await db.execute(query)
    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "session_id": log.session_id,
            "level": log.level,
            "category": log.category,
            "message": log.message,
            "metadata": log.metadata_json,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
