import client from './client'
import type {
  PriceData,
  OHLCVItem,
  StockSearchResult,
  IndexResponse,
  PopularStocksResponse,
} from '@/lib/types'

export const marketApi = {
  price: (code: string) => client.get<PriceData>(`/market/price/${code}`),

  ohlcv: (code: string, period = 'D', count = 60) =>
    client.get<{ stock_code: string; data: OHLCVItem[] }>(`/market/ohlcv/${code}`, {
      params: { period, count },
    }),

  search: (q: string) =>
    client.get<{ results: StockSearchResult[] }>('/market/search', { params: { q } }),

  // 시장 지수 조회
  index: (indexType: 'kospi' | 'kosdaq') =>
    client.get<IndexResponse>(`/market/index/${indexType}`),

  // 인기 종목 조회
  popularStocks: (
    category: 'volume' | 'gainers' | 'losers' = 'volume',
    market: 'all' | 'kospi' | 'kosdaq' = 'all',
    limit: number = 10
  ) =>
    client.get<PopularStocksResponse>('/market/popular-stocks', {
      params: { category, market, limit },
    }),
}
