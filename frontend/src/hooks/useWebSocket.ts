import { useEffect, useRef, useCallback } from 'react'
import { useWSStore } from '@/stores/wsStore'
import type { WSMessage } from '@/lib/types'

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const { connected, setConnected, addMessage } = useWSStore()

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`)

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      // Reconnect after 5 seconds
      setTimeout(() => connect(), 5000)
    }
    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        addMessage(message)
      } catch { /* ignore parse errors */ }
    }

    wsRef.current = ws
  }, [setConnected, addMessage])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return { connected }
}
