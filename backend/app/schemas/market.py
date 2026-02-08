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


class IndexData(BaseModel):
    """주가 지수 데이터"""
    index_code: str
    index_name: str
    current_value: float
    change: float
    change_rate: float
    volume: int
    trade_value: int  # 거래대금 (백만)
    high: float
    low: float
    open_value: float


class IndexChartItem(BaseModel):
    """지수 차트 데이터 아이템"""
    time: str
    value: float


class IndexResponse(BaseModel):
    """지수 응답 (차트 데이터 포함)"""
    index: IndexData
    chart: List[IndexChartItem] = []


class PopularStockItem(BaseModel):
    """인기 종목 아이템"""
    rank: int
    stock_code: str
    stock_name: str
    current_price: float
    change: float
    change_rate: float
    volume: int
    trade_value: int  # 거래대금 (백만)
    market: str


class PopularStocksResponse(BaseModel):
    """인기 종목 응답"""
    category: str  # "volume" | "gainers" | "losers"
    stocks: List[PopularStockItem]
