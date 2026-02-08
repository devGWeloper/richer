import { useQuery } from '@tanstack/react-query'
import { marketApi } from '@/api/market'

export function useMarketIndex(indexType: 'kospi' | 'kosdaq') {
  return useQuery({
    queryKey: ['market', 'index', indexType],
    queryFn: () => marketApi.index(indexType).then((r) => r.data),
    refetchInterval: 60000, // 1분마다 갱신
    staleTime: 30000,
    retry: 1,
    retryDelay: 2000,
  })
}

export function usePopularStocks(
  category: 'volume' | 'gainers' | 'losers' = 'volume',
  market: 'all' | 'kospi' | 'kosdaq' = 'all',
  limit: number = 5
) {
  return useQuery({
    queryKey: ['market', 'popular', category, market, limit],
    queryFn: () => marketApi.popularStocks(category, market, limit).then((r) => r.data),
    refetchInterval: 120000, // 2분마다 갱신 (API 호출 줄이기)
    staleTime: 60000,
    retry: 1,
    retryDelay: 3000,
  })
}
