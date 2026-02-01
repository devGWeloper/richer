import client from './client'
import type { TradeSession } from '@/lib/types'

export const tradingApi = {
  start: (data: {
    account_id: number
    strategy_id: number
    stock_code: string
    stock_name?: string
    interval_seconds?: number
  }) => client.post<TradeSession>('/trading/start', data),

  stop: (sessionId: number) => client.post<TradeSession>(`/trading/stop/${sessionId}`),

  pause: (sessionId: number) => client.post<TradeSession>(`/trading/pause/${sessionId}`),

  resume: (sessionId: number) => client.post<TradeSession>(`/trading/resume/${sessionId}`),

  sessions: () => client.get<TradeSession[]>('/trading/sessions'),

  active: () => client.get<TradeSession[]>('/trading/active'),
}
