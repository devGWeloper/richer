import { create } from 'zustand'
import type { WSMessage } from '@/lib/types'

interface WSState {
  connected: boolean
  messages: WSMessage[]
  setConnected: (connected: boolean) => void
  addMessage: (message: WSMessage) => void
  clearMessages: () => void
}

export const useWSStore = create<WSState>((set) => ({
  connected: false,
  messages: [],
  setConnected: (connected) => set({ connected }),
  addMessage: (message) =>
    set((state) => ({
      messages: [message, ...state.messages].slice(0, 100),
    })),
  clearMessages: () => set({ messages: [] }),
}))
