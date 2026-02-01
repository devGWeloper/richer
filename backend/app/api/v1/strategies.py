from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.models.strategy import Strategy
from app.models.user import User
from app.schemas.strategy import (
    StrategyCreate,
    StrategyResponse,
    StrategyTypeInfo,
    StrategyUpdate,
)
from app.strategies.registry import get_available_strategies

router = APIRouter()


@router.get("/types", response_model=list[StrategyTypeInfo])
async def list_strategy_types(current_user: User = Depends(get_current_user)):
    return get_available_strategies()


@router.get("", response_model=list[StrategyResponse])
async def list_strategies(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Strategy)
        .where(Strategy.user_id == current_user.id)
        .order_by(Strategy.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=StrategyResponse, status_code=status.HTTP_201_CREATED)
async def create_strategy(
    body: StrategyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate strategy type
    available = {s["type_name"] for s in get_available_strategies()}
    if body.strategy_type not in available:
        raise NotFoundError(f"Unknown strategy type: {body.strategy_type}")

    strategy = Strategy(
        user_id=current_user.id,
        name=body.name,
        strategy_type=body.strategy_type,
        parameters=body.parameters,
    )
    db.add(strategy)
    await db.flush()
    await db.refresh(strategy)
    return strategy


@router.put("/{strategy_id}", response_model=StrategyResponse)
async def update_strategy(
    strategy_id: int,
    body: StrategyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id, Strategy.user_id == current_user.id
        )
    )
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise NotFoundError("Strategy not found")

    if body.name is not None:
        strategy.name = body.name
    if body.parameters is not None:
        strategy.parameters = body.parameters
    if body.is_active is not None:
        strategy.is_active = body.is_active

    await db.flush()
    await db.refresh(strategy)
    return strategy


@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_strategy(
    strategy_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id, Strategy.user_id == current_user.id
        )
    )
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise NotFoundError("Strategy not found")
    await db.delete(strategy)
