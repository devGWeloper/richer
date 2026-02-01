import { create } from 'zustand'
import type { TradeSession } from '@/lib/types'

interface TradingState {
  activeSessions: TradeSession[]
  setActiveSessions: (sessions: TradeSession[]) => void
  updateSession: (session: TradeSession) => void
  removeSession: (sessionId: number) => void
}

export const useTradingStore = create<TradingState>((set) => ({
  activeSessions: [],
  setActiveSessions: (sessions) => set({ activeSessions: sessions }),
  updateSession: (session) =>
    set((state) => ({
      activeSessions: state.activeSessions.map((s) =>
        s.id === session.id ? session : s
      ),
    })),
  removeSession: (sessionId) =>
    set((state) => ({
      activeSessions: state.activeSessions.filter((s) => s.id !== sessionId),
    })),
}))
