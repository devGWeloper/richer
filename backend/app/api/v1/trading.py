from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.broker.kis_broker import KISBroker
from app.core.database import get_db
from app.core.exceptions import AppException, NotFoundError
from app.engine.manager import trading_manager
from app.engine.state import SessionState, can_transition
from app.models.strategy import Strategy
from app.models.trade_session import TradeSession
from app.models.user import User
from app.schemas.trading import AccountInfo, BuyableQuantityResponse, SessionResponse, TradingStartRequest
from app.services.account_service import get_account, get_decrypted_credentials, mask_account_no
from app.strategies.registry import get_strategy
from app.ws.manager import ws_manager

router = APIRouter()


def _to_session_response(session: TradeSession) -> SessionResponse:
    """TradeSession을 SessionResponse로 변환"""
    account_info = None
    if session.account:
        account_info = AccountInfo(
            id=session.account.id,
            label=session.account.label,
            account_no_masked=mask_account_no(session.account.account_no),
        )
    return SessionResponse(
        id=session.id,
        user_id=session.user_id,
        account_id=session.account_id,
        strategy_id=session.strategy_id,
        stock_code=session.stock_code,
        stock_name=session.stock_name,
        status=session.status,
        config=session.config,
        total_pnl=session.total_pnl,
        total_trades=session.total_trades,
        started_at=session.started_at,
        stopped_at=session.stopped_at,
        created_at=session.created_at,
        quantity=session.quantity,
        account=account_info,
    )


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
        quantity=body.quantity,
        status=SessionState.RUNNING,
        config=strategy_model.parameters,
        started_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.flush()
    await db.refresh(session, ["account"])

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
        order_quantity=body.quantity,
    )

    await ws_manager.send_to_user(
        current_user.id,
        "session.started",
        "trading",
        {"session_id": session.id, "stock_code": body.stock_code},
    )

    return _to_session_response(session)


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
    await db.refresh(session, ["account"])

    await ws_manager.send_to_user(
        current_user.id,
        "session.stopped",
        "trading",
        {"session_id": session_id},
    )
    return _to_session_response(session)


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
    await db.refresh(session, ["account"])
    return _to_session_response(session)


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
    await db.refresh(session, ["account"])
    return _to_session_response(session)


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TradeSession)
        .options(selectinload(TradeSession.account))
        .where(TradeSession.user_id == current_user.id)
        .order_by(TradeSession.created_at.desc())
        .limit(50)
    )
    sessions = result.scalars().all()
    return [_to_session_response(s) for s in sessions]


@router.get("/active", response_model=list[SessionResponse])
async def list_active_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TradeSession)
        .options(selectinload(TradeSession.account))
        .where(
            TradeSession.user_id == current_user.id,
            TradeSession.status.in_(
                [SessionState.RUNNING, SessionState.PAUSED, SessionState.PENDING]
            ),
        )
    )
    sessions = result.scalars().all()
    return [_to_session_response(s) for s in sessions]


@router.get("/buyable/{account_id}/{stock_code}", response_model=BuyableQuantityResponse)
async def get_buyable_quantity(
    account_id: int,
    stock_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """해당 계좌로 특정 종목을 최대 몇 주까지 매수할 수 있는지 조회"""
    account = await get_account(db, account_id, current_user.id)
    if not account:
        raise NotFoundError("Account not found")

    try:
        creds = get_decrypted_credentials(account)
        broker = KISBroker(**creds)
        await broker.connect()

        # 현재가 조회
        price_data = await broker.get_current_price(stock_code)
        current_price = int(price_data.get("current_price", 0))
        stock_name = str(price_data.get("stock_name", stock_code))

        if current_price <= 0:
            raise AppException("현재가를 조회할 수 없습니다. 종목 코드를 확인해주세요.")

        # 잔고 조회 (예수금)
        balance = await broker.get_balance()
        available_cash = int(float(balance.get("dnca_tot_amt", 0) or 0))

        # 매수 가능 수량 계산
        max_quantity = available_cash // current_price if current_price > 0 else 0

        message = None
        if available_cash < current_price:
            message = f"예수금({available_cash:,}원)이 1주 가격({current_price:,}원)보다 적습니다"

        return BuyableQuantityResponse(
            stock_code=stock_code,
            stock_name=stock_name,
            current_price=current_price,
            available_cash=available_cash,
            max_buyable_quantity=max_quantity,
            message=message,
        )
    except AppException:
        raise
    except Exception as e:
        raise AppException(f"매수 가능 수량 조회에 실패했습니다: {str(e)[:50]}")


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
