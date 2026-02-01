from typing import List, Optional

from pydantic import BaseModel


class PriceResponse(BaseModel):
    stock_code: str
    stock_name: str
    current_price: float
    change: float
    change_rate: float
    volume: int
    high: float
    low: float
    open_price: float


class OHLCVItem(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class OHLCVResponse(BaseModel):
    stock_code: str
    data: List[OHLCVItem]


class StockSearchResult(BaseModel):
    stock_code: str
    stock_name: str
    market: str


class SearchResponse(BaseModel):
    results: List[StockSearchResult]
