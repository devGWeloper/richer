import client from './client'
import type { DashboardSummary, HoldingItem, Trade } from '@/lib/types'

export const dashboardApi = {
  summary: () => client.get<DashboardSummary>('/dashboard/summary'),

  holdings: () =>
    client.get<{ holdings: HoldingItem[]; total_evaluation: number }>('/dashboard/holdings'),

  recentTrades: () => client.get<Trade[]>('/dashboard/recent-trades'),

  trades: (page = 1, size = 20) =>
    client.get<Trade[]>('/trades', { params: { page, size } }),

  logs: (page = 1, size = 50, category?: string, level?: string) =>
    client.get('/logs', { params: { page, size, category, level } }),
}
