from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.broker.kis_broker import KISBroker
from app.core.database import get_db
from app.models.user import User
from app.schemas.dashboard import (
    DashboardSummary,
    HoldingItem,
    HoldingsResponse,
    RecentTradeItem,
)
from app.services.account_service import get_decrypted_credentials, get_first_active_account
from app.services.dashboard_service import (
    get_active_session_count,
    get_recent_trades,
    get_today_trade_count,
)

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await get_first_active_account(db, current_user.id)

    total_balance = 0.0
    total_profit = 0.0
    profit_rate = 0.0

    if account:
        try:
            creds = get_decrypted_credentials(account)
            broker = KISBroker(**creds)
            await broker.connect()
            balance = await broker.get_balance()
            # Try to extract summary from balance data
            if isinstance(balance, dict):
                total_balance = float(balance.get("tot_evlu_amt", 0) or 0)
                total_profit = float(balance.get("evlu_pfls_smtl_amt", 0) or 0)
                if total_balance > 0:
                    profit_rate = (total_profit / total_balance) * 100
        except Exception:
            pass

    active_sessions = await get_active_session_count(db, current_user.id)
    trades_today = await get_today_trade_count(db, current_user.id)

    return DashboardSummary(
        total_balance=total_balance,
        total_profit=total_profit,
        profit_rate=profit_rate,
        active_sessions=active_sessions,
        total_trades_today=trades_today,
    )


@router.get("/holdings", response_model=HoldingsResponse)
async def get_holdings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await get_first_active_account(db, current_user.id)
    if not account:
        return HoldingsResponse(holdings=[], total_evaluation=0)

    try:
        creds = get_decrypted_credentials(account)
        broker = KISBroker(**creds)
        await broker.connect()
        holdings_raw = await broker.get_holdings()
    except Exception:
        return HoldingsResponse(holdings=[], total_evaluation=0)

    holdings = []
    total_eval = 0.0
    for h in holdings_raw:
        qty = int(h.get("hldg_qty", 0))
        if qty <= 0:
            continue
        avg_price = float(h.get("pchs_avg_pric", 0))
        current_price = float(h.get("prpr", 0))
        eval_amt = float(h.get("evlu_amt", 0))
        profit = float(h.get("evlu_pfls_amt", 0))
        profit_rate = float(h.get("evlu_pfls_rt", 0))
        total_eval += eval_amt

        holdings.append(
            HoldingItem(
                stock_code=str(h.get("pdno", "")),
                stock_name=str(h.get("prdt_name", "")),
                quantity=qty,
                avg_price=avg_price,
                current_price=current_price,
                profit=profit,
                profit_rate=profit_rate,
            )
        )

    return HoldingsResponse(holdings=holdings, total_evaluation=total_eval)


@router.get("/recent-trades", response_model=list[RecentTradeItem])
async def get_recent_trades_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trades = await get_recent_trades(db, current_user.id, limit=20)
    return [
        RecentTradeItem(
            id=t.id,
            stock_code=t.stock_code,
            stock_name=t.stock_name or "",
            side=t.side,
            quantity=t.quantity,
            price=t.price or 0,
            filled_price=t.filled_price or 0,
            status=t.status,
            created_at=t.created_at,
        )
        for t in trades
    ]
