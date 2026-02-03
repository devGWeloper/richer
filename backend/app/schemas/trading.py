from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TradingStartRequest(BaseModel):
    account_id: int
    strategy_id: int
    stock_code: str
    stock_name: Optional[str] = None
    interval_seconds: int = 60
    quantity: int = 1


class AccountInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    account_no_masked: str


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    account_id: int
    strategy_id: int
    stock_code: str
    stock_name: Optional[str] = None
    status: str
    config: Optional[dict] = None
    total_pnl: float
    total_trades: int
    started_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    created_at: datetime
    quantity: int = 1
    account: Optional[AccountInfo] = None


class TradeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    user_id: int
    stock_code: str
    stock_name: Optional[str] = None
    side: str
    order_type: str
    quantity: int
    price: float
    filled_price: Optional[float] = None
    filled_quantity: Optional[int] = None
    status: str
    kis_order_no: Optional[str] = None
    signal_reason: Optional[str] = None
    created_at: datetime


class BuyableQuantityResponse(BaseModel):
    stock_code: str
    stock_name: str
    current_price: int
    available_cash: int
    max_buyable_quantity: int
    message: Optional[str] = None
