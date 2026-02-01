from datetime import datetime
from typing import List

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_balance: float
    total_profit: float
    profit_rate: float
    active_sessions: int
    total_trades_today: int


class HoldingItem(BaseModel):
    stock_code: str
    stock_name: str
    quantity: int
    avg_price: float
    current_price: float
    profit: float
    profit_rate: float


class HoldingsResponse(BaseModel):
    holdings: List[HoldingItem]
    total_evaluation: float


class RecentTradeItem(BaseModel):
    id: int
    stock_code: str
    stock_name: str
    side: str
    quantity: int
    price: float
    filled_price: float
    status: str
    created_at: datetime
