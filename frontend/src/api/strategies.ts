import client from './client'
import type { Strategy, StrategyTypeInfo } from '@/lib/types'

export const strategiesApi = {
  list: () => client.get<Strategy[]>('/strategies'),

  types: () => client.get<StrategyTypeInfo[]>('/strategies/types'),

  create: (data: { name: string; strategy_type: string; parameters: Record<string, any> }) =>
    client.post<Strategy>('/strategies', data),

  update: (id: number, data: { name?: string; parameters?: Record<string, any>; is_active?: boolean }) =>
    client.put<Strategy>(`/strategies/${id}`, data),

  delete: (id: number) => client.delete(`/strategies/${id}`),
}
