from fastapi import APIRouter

from app.api.v1 import accounts, auth, dashboard, logs, market, strategies, trading

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/v1/auth", tags=["auth"])
api_router.include_router(accounts.router, prefix="/v1/accounts", tags=["accounts"])
api_router.include_router(dashboard.router, prefix="/v1/dashboard", tags=["dashboard"])
api_router.include_router(market.router, prefix="/v1/market", tags=["market"])
api_router.include_router(strategies.router, prefix="/v1/strategies", tags=["strategies"])
api_router.include_router(trading.router, prefix="/v1/trading", tags=["trading"])
api_router.include_router(logs.router, prefix="/v1", tags=["logs"])
