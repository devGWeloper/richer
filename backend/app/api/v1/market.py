from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.broker.kis_broker import KISBroker
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.models.user import User
from app.schemas.market import OHLCVResponse, PriceResponse, SearchResponse
from app.services.account_service import get_decrypted_credentials, get_first_active_account

router = APIRouter()


async def _get_broker(db: AsyncSession, user: User) -> KISBroker:
    account = await get_first_active_account(db, user.id)
    if not account:
        raise NotFoundError("No active KIS account. Please add one in Settings.")
    creds = get_decrypted_credentials(account)
    broker = KISBroker(**creds)
    await broker.connect()
    return broker


@router.get("/price/{stock_code}", response_model=PriceResponse)
async def get_price(
    stock_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    broker = await _get_broker(db, current_user)
    data = await broker.get_current_price(stock_code)
    return PriceResponse(**data)


@router.get("/ohlcv/{stock_code}", response_model=OHLCVResponse)
async def get_ohlcv(
    stock_code: str,
    period: str = Query("D", description="D=daily"),
    count: int = Query(60, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    broker = await _get_broker(db, current_user)
    data = await broker.get_ohlcv(stock_code, period, count)
    return OHLCVResponse(stock_code=stock_code, data=data)


@router.get("/search", response_model=SearchResponse)
async def search_stock(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
):
    # Simple in-memory search for popular Korean stocks
    stocks = [
        ("005930", "삼성전자", "KOSPI"),
        ("000660", "SK하이닉스", "KOSPI"),
        ("035420", "NAVER", "KOSPI"),
        ("035720", "카카오", "KOSPI"),
        ("051910", "LG화학", "KOSPI"),
        ("006400", "삼성SDI", "KOSPI"),
        ("068270", "셀트리온", "KOSPI"),
        ("105560", "KB금융", "KOSPI"),
        ("055550", "신한지주", "KOSPI"),
        ("003670", "포스코퓨처엠", "KOSPI"),
        ("000270", "기아", "KOSPI"),
        ("005380", "현대차", "KOSPI"),
        ("012330", "현대모비스", "KOSPI"),
        ("066570", "LG전자", "KOSPI"),
        ("034730", "SK", "KOSPI"),
        ("015760", "한국전력", "KOSPI"),
        ("003550", "LG", "KOSPI"),
        ("032830", "삼성생명", "KOSPI"),
        ("086790", "하나금융지주", "KOSPI"),
        ("259960", "크래프톤", "KOSPI"),
        ("247540", "에코프로비엠", "KOSDAQ"),
        ("086520", "에코프로", "KOSDAQ"),
        ("373220", "LG에너지솔루션", "KOSPI"),
        ("196170", "알테오젠", "KOSDAQ"),
    ]
    q_lower = q.lower()
    results = [
        {"stock_code": code, "stock_name": name, "market": market}
        for code, name, market in stocks
        if q_lower in name.lower() or q_lower in code
    ]
    return SearchResponse(results=results)
