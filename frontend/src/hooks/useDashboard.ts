import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.summary().then((r) => r.data),
    refetchInterval: 30000,
  })
}

export function useHoldings() {
  return useQuery({
    queryKey: ['dashboard', 'holdings'],
    queryFn: () => dashboardApi.holdings().then((r) => r.data),
    refetchInterval: 30000,
  })
}

export function useRecentTrades() {
  return useQuery({
    queryKey: ['dashboard', 'recent-trades'],
    queryFn: () => dashboardApi.recentTrades().then((r) => r.data),
    refetchInterval: 10000,
  })
}
