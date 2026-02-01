import client from './client'
import type { PriceData, OHLCVItem, StockSearchResult } from '@/lib/types'

export const marketApi = {
  price: (code: string) => client.get<PriceData>(`/market/price/${code}`),

  ohlcv: (code: string, period = 'D', count = 60) =>
    client.get<{ stock_code: string; data: OHLCVItem[] }>(`/market/ohlcv/${code}`, {
      params: { period, count },
    }),

  search: (q: string) =>
    client.get<{ results: StockSearchResult[] }>('/market/search', { params: { q } }),
}
