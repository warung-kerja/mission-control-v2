/**
 * useWebSocket — thin hook over the module-level singleton socket.
 *
 * Key fixes vs. old implementation:
 * - No new socket per hook call: all components share one connection via socket.ts
 * - Unmounting a component does NOT disconnect the socket
 * - `on()` safely no-ops if called before the socket is ready
 * - Auth token changes reconnect via the singleton (triggered by authStore listener)
 */

import { useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket'

// ── Bootstrap: connect/disconnect driven by auth state ──────────────────────

/**
 * Mount this once near the app root (e.g. inside ProtectedLayout).
 * It manages the socket lifecycle based on the auth token.
 */
export function useSocketBootstrap() {
  const token = useAuthStore((state) => state.token)

  useEffect(() => {
    if (token) {
      connectSocket(token)
    } else {
      disconnectSocket()
    }
    // No cleanup: the socket stays alive while the user is logged in.
    // Logout (token → null) triggers disconnectSocket above.
  }, [token])
}

// ── Per-component event subscription hook ───────────────────────────────────

export function useWebSocket(_options: { onConnect?: () => void; onDisconnect?: (reason: string) => void } = {}) {
  const { onConnect, onDisconnect } = _options

  // Track callbacks registered by this hook instance so we can clean them up.
  const listenersRef = useRef<Array<() => void>>([])

  // Attach connect/disconnect callbacks to the singleton socket.
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleConnect = () => onConnect?.()
    const handleDisconnect = (reason: string) => onDisconnect?.(reason)

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }, [onConnect, onDisconnect])

  // Cleanup all listeners registered via `on()` when the component unmounts.
  useEffect(() => {
    const cleanupFns = listenersRef.current
    return () => {
      cleanupFns.forEach((fn) => fn())
      listenersRef.current = []
    }
  }, [])

  /**
   * Subscribe to a socket event. Returns an unsubscribe function.
   * Safe to call even when the socket is not yet connected — the listener
   * will fire once the socket delivers the event.
   */
  const on = useCallback(<T = unknown>(event: string, callback: (data: T) => void) => {
    const socket = getSocket()
    if (!socket) {
      // Socket not ready yet — return a noop unsubscribe
      return () => {}
    }
    socket.on(event, callback)
    const off = () => socket.off(event, callback)
    listenersRef.current.push(off)
    return off
  }, [])

  /** Emit an event. Silent noop if disconnected — caller should handle. */
  const emit = useCallback(<T = unknown>(event: string, data?: T) => {
    const socket = getSocket()
    if (!socket?.connected) {
      console.warn(`[Socket] emit('${event}') skipped — not connected`)
      return
    }
    socket.emit(event, data)
  }, [])

  const isConnected = getSocket()?.connected ?? false

  return { on, emit, isConnected, socket: getSocket() }
}
