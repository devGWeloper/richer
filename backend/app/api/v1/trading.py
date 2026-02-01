from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.broker.kis_broker import KISBroker
from app.core.database import get_db
from app.core.exceptions import AppException, NotFoundError
from app.engine.manager import trading_manager
from app.engine.state import SessionState, can_transition
from app.models.strategy import Strategy
from app.models.trade_session import TradeSession
from app.models.user import User
from app.schemas.trading import SessionResponse, TradingStartRequest
from app.services.account_service import get_account, get_decrypted_credentials
from app.strategies.registry import get_strategy
from app.ws.manager import ws_manager

router = APIRouter()


@router.post("/start", response_model=SessionResponse)
async def start_trading(
    body: TradingStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate account
    account = await get_account(db, body.account_id, current_user.id)
    if not account:
        raise NotFoundError("Account not found")

    # Validate strategy
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == body.strategy_id, Strategy.user_id == current_user.id
        )
    )
    strategy_model = result.scalar_one_or_none()
    if not strategy_model:
        raise NotFoundError("Strategy not found")

    # Create session
    session = TradeSession(
        user_id=current_user.id,
        account_id=body.account_id,
        strategy_id=body.strategy_id,
        stock_code=body.stock_code,
        stock_name=body.stock_name or body.stock_code,
        status=SessionState.RUNNING,
        config=strategy_model.parameters,
        started_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)

    # Create broker and strategy instances
    creds = get_decrypted_credentials(account)
    broker = KISBroker(**creds)
    await broker.connect()

    strategy = get_strategy(strategy_model.strategy_type, strategy_model.parameters)

    # Start engine
    trading_manager.start_session(
        session_id=session.id,
        user_id=current_user.id,
        broker=broker,
        strategy=strategy,
        stock_code=body.stock_code,
        stock_name=body.stock_name or body.stock_code,
        interval_seconds=body.interval_seconds,
    )

    await ws_manager.send_to_user(
        current_user.id,
        "session.started",
        "trading",
        {"session_id": session.id, "stock_code": body.stock_code},
    )

    return session


@router.post("/stop/{session_id}", response_model=SessionResponse)
async def stop_trading(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session(db, session_id, current_user.id)
    if not can_transition(SessionState(session.status), SessionState.STOPPED):
        raise AppException(f"Cannot stop session in '{session.status}' state")

    trading_manager.stop_session(session_id)
    session.status = SessionState.STOPPED
    session.stopped_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(session)

    await ws_manager.send_to_user(
        current_user.id,
        "session.stopped",
        "trading",
        {"session_id": session_id},
    )
    return session


@router.post("/pause/{session_id}", response_model=SessionResponse)
async def pause_trading(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session(db, session_id, current_user.id)
    if not can_transition(SessionState(session.status), SessionState.PAUSED):
        raise AppException(f"Cannot pause session in '{session.status}' state")

    trading_manager.pause_session(session_id)
    session.status = SessionState.PAUSED
    await db.flush()
    await db.refresh(session)
    return session


@router.post("/resume/{session_id}", response_model=SessionResponse)
async def resume_trading(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session(db, session_id, current_user.id)
    if not can_transition(SessionState(session.status), SessionState.RUNNING):
        raise AppException(f"Cannot resume session in '{session.status}' state")

    trading_manager.resume_session(session_id)
    session.status = SessionState.RUNNING
    await db.flush()
    await db.refresh(session)
    return session


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TradeSession)
        .where(TradeSession.user_id == current_user.id)
        .order_by(TradeSession.created_at.desc())
        .limit(50)
    )
    return list(result.scalars().all())


@router.get("/active", response_model=list[SessionResponse])
async def list_active_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TradeSession).where(
            TradeSession.user_id == current_user.id,
            TradeSession.status.in_(
                [SessionState.RUNNING, SessionState.PAUSED, SessionState.PENDING]
            ),
        )
    )
    return list(result.scalars().all())


async def _get_session(
    db: AsyncSession, session_id: int, user_id: int
) -> TradeSession:
    result = await db.execute(
        select(TradeSession).where(
            TradeSession.id == session_id, TradeSession.user_id == user_id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Session not found")
    return session
