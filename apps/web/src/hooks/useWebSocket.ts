import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../stores/authStore'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001'

interface WebSocketOptions {
  autoConnect?: boolean
  onConnect?: () => void
  onDisconnect?: (reason: string) => void
  onError?: (error: Error) => void
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const { autoConnect = true, onConnect, onDisconnect, onError } = options
  const socketRef = useRef<Socket | null>(null)
  const token = useAuthStore((state) => state.token)

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      console.log('[WebSocket] Connected:', socket.id)
      onConnect?.()
    })

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason)
      onDisconnect?.(reason)
    })

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error)
      onError?.(error)
    })

    socketRef.current = socket
  }, [token, onConnect, onDisconnect, onError])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
    socketRef.current = null
  }, [])

  const emit = useCallback(<T = unknown>(event: string, data: T) => {
    socketRef.current?.emit(event, data)
  }, [])

  const on = useCallback(<T = unknown>(event: string, callback: (data: T) => void) => {
    socketRef.current?.on(event, callback)
    return () => {
      socketRef.current?.off(event, callback)
    }
  }, [])

  const off = useCallback((event: string) => {
    socketRef.current?.off(event)
  }, [])

  useEffect(() => {
    if (autoConnect && token) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, token, connect, disconnect])

  return {
    socket: socketRef.current,
    connect,
    disconnect,
    emit,
    on,
    off,
    isConnected: socketRef.current?.connected ?? false,
  }
}
