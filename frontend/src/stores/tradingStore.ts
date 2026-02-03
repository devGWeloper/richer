import { create } from 'zustand'
import type { TradeSession, SessionStatusUpdate } from '@/lib/types'

interface TradingState {
  activeSessions: TradeSession[]
  sessionStatuses: Record<number, SessionStatusUpdate>
  setActiveSessions: (sessions: TradeSession[]) => void
  updateSession: (session: TradeSession) => void
  removeSession: (sessionId: number) => void
  updateSessionStatus: (status: SessionStatusUpdate) => void
  clearSessionStatus: (sessionId: number) => void
}

export const useTradingStore = create<TradingState>((set) => ({
  activeSessions: [],
  sessionStatuses: {},
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
      sessionStatuses: Object.fromEntries(
        Object.entries(state.sessionStatuses).filter(
          ([id]) => Number(id) !== sessionId
        )
      ),
    })),
  updateSessionStatus: (status) =>
    set((state) => ({
      sessionStatuses: {
        ...state.sessionStatuses,
        [status.session_id]: status,
      },
    })),
  clearSessionStatus: (sessionId) =>
    set((state) => ({
      sessionStatuses: Object.fromEntries(
        Object.entries(state.sessionStatuses).filter(
          ([id]) => Number(id) !== sessionId
        )
      ),
    })),
}))
