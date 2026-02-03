import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (type, message, duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, duration }],
    }))
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

// Helper function - safe to call from anywhere
export function showToast(type: ToastType, message: string, duration?: number) {
  // Use setTimeout to ensure store is initialized
  setTimeout(() => {
    useToastStore.getState().addToast(type, message, duration)
  }, 0)
}

// Convenience methods
export const toast = {
  success: (message: string) => showToast('success', message, 3000),
  error: (message: string) => showToast('error', message, 5000),
  info: (message: string) => showToast('info', message, 3000),
  warning: (message: string) => showToast('warning', message, 4000),
}
