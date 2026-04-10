/**
 * Singleton Socket.io client.
 *
 * Problem: multiple components each calling `io()` create separate connections.
 * One module-level socket instance shared across the whole app fixes that.
 * The socket persists across component mounts/unmounts; only explicit
 * connectSocket / disconnectSocket calls change its lifecycle.
 */

import { io, type Socket } from 'socket.io-client'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001'

let socket: Socket | null = null
let activeToken: string | null = null

/** Return the current socket (may be null before first connect). */
export function getSocket(): Socket | null {
  return socket
}

/**
 * Connect (or reconnect) with the given auth token.
 * If already connected with the same token, returns the existing socket.
 * If the token changed, disconnects the old socket first.
 */
export function connectSocket(token: string): Socket {
  // Already connected with the same token — reuse.
  if (socket && activeToken === token) {
    if (!socket.connected) socket.connect()
    return socket
  }

  // Token changed or first connect — teardown existing connection.
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }

  activeToken = token
  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,   // never give up permanently
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,      // cap backoff at 30 s
    randomizationFactor: 0.3,
  })

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason)
    // If the server closed the connection, manually reconnect after a delay
    // (socket.io reconnection handles transport drops; this covers server-side kicks)
    if (reason === 'io server disconnect') {
      setTimeout(() => socket?.connect(), 2000)
    }
  })

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message)
  })

  return socket
}

/** Fully disconnect and clear the singleton. Call on logout. */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
  activeToken = null
}
