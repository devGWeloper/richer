from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.deps import get_current_user
from app.broker.kis_broker import KISBroker
from app.config import settings
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.models.user import User
from app.schemas.market import (
    OHLCVResponse,
    PriceResponse,
    SearchResponse,
    IndexResponse,
    IndexData,
    IndexChartItem,
    PopularStocksResponse,
    PopularStockItem,
)
from app.services.account_service import get_decrypted_credentials, get_first_active_account

router = APIRouter()

# 캐시된 공개 데이터용 브로커 (서버 레벨)
_public_broker: Optional[KISBroker] = None


async def _get_public_broker() -> Optional[KISBroker]:
    """서버 환경변수의 KIS 설정으로 공개 데이터용 브로커 생성"""
    global _public_broker

    # 이미 연결된 브로커가 있으면 재사용
    if _public_broker is not None:
        return _public_broker

    # 환경변수에 KIS 설정이 없으면 None
    if not settings.KIS_APP_KEY or not settings.KIS_APP_SECRET:
        return None

    try:
        broker = KISBroker(
            app_key=settings.KIS_APP_KEY,
            app_secret=settings.KIS_APP_SECRET,
            account_no=settings.KIS_ACCOUNT_NO or "00000000",
            environment="vps" if settings.KIS_MOCK else "real",
        )
        await broker.connect()
        _public_broker = broker
        return broker
    except Exception:
        return None


async def _get_broker(db: AsyncSession, user: User) -> KISBroker:
    account = await get_first_active_account(db, user.id)
    if not account:
        raise NotFoundError("No active KIS account. Please add one in Settings.")
    creds = get_decrypted_credentials(account)
    broker = KISBroker(**creds)
    await broker.connect()
    return broker


async def _get_broker_for_market_data(db: AsyncSession, user: User) -> KISBroker:
    """시장 데이터 조회용 브로커 - 공개 브로커 우선, 없으면 사용자 계좌 사용"""
    # 1. 공개 브로커 시도
    public_broker = await _get_public_broker()
    if public_broker:
        return public_broker

    # 2. 사용자 계좌로 시도
    account = await get_first_active_account(db, user.id)
    if not account:
        raise NotFoundError(
            "시장 데이터를 조회할 수 없습니다. "
            "서버에 KIS API가 설정되지 않았고, 등록된 계좌도 없습니다. "
            "설정에서 계좌를 등록해주세요."
        )
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


@router.get("/index/{index_type}", response_model=IndexResponse)
async def get_market_index(
    index_type: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    시장 지수 정보를 조회합니다.
    index_type: "kospi" 또는 "kosdaq"
    """
    if index_type.lower() not in ["kospi", "kosdaq"]:
        raise NotFoundError("Invalid index type. Use 'kospi' or 'kosdaq'.")

    broker = await _get_broker_for_market_data(db, current_user)

    # 지수 데이터 조회
    index_data = await broker.get_index_price(index_type)

    # 차트 데이터 조회
    chart_data = await broker.get_index_chart(index_type, count=20)

    return IndexResponse(
        index=IndexData(**index_data),
        chart=[IndexChartItem(**c) for c in chart_data],
    )


@router.get("/popular-stocks", response_model=PopularStocksResponse)
async def get_popular_stocks(
    category: str = Query("volume", description="volume, gainers, losers"),
    market: str = Query("all", description="all, kospi, kosdaq"),
    limit: int = Query(10, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    인기 종목을 조회합니다.
    category: "volume" (거래량 상위), "gainers" (상승률 상위), "losers" (하락률 상위)
    market: "all", "kospi", "kosdaq"
    """
    if category not in ["volume", "gainers", "losers"]:
        category = "volume"

    broker = await _get_broker_for_market_data(db, current_user)
    stocks = await broker.get_popular_stocks(category, market, limit)

    return PopularStocksResponse(
        category=category,
        stocks=[PopularStockItem(**s) for s in stocks],
    )
