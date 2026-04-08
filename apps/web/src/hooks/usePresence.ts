import { useEffect, useState, useCallback } from 'react'
import { useWebSocket } from './useWebSocket'

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

interface UserPresence {
  userId: string
  status: PresenceStatus
  lastSeen: string
}

export function usePresence() {
  const { on, emit } = useWebSocket()
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [userStatuses, setUserStatuses] = useState<Map<string, PresenceStatus>>(new Map())

  const updateStatus = useCallback((status: PresenceStatus) => {
    emit('presence:update', { status })
  }, [emit])

  const setTyping = useCallback((isTyping: boolean, context?: { projectId?: string; taskId?: string }) => {
    emit('typing', { isTyping, ...context })
  }, [emit])

  useEffect(() => {
    // Listen for presence updates
    const unsubscribe = on<UserPresence>('presence:update', (data) => {
      setUserStatuses((prev) => {
        const next = new Map(prev)
        next.set(data.userId, data.status)
        return next
      })

      setOnlineUsers((prev) => {
        const next = new Set(prev)
        if (data.status === 'offline') {
          next.delete(data.userId)
        } else {
          next.add(data.userId)
        }
        return next
      })
    })

    // Listen for user online/offline events
    const unsubscribeOnline = on<{ userId: string }>('user:online', (data) => {
      setOnlineUsers((prev) => new Set([...prev, data.userId]))
      setUserStatuses((prev) => {
        const next = new Map(prev)
        next.set(data.userId, 'online')
        return next
      })
    })

    const unsubscribeOffline = on<{ userId: string }>('user:offline', (data) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        next.delete(data.userId)
        return next
      })
      setUserStatuses((prev) => {
        const next = new Map(prev)
        next.set(data.userId, 'offline')
        return next
      })
    })

    return () => {
      unsubscribe?.()
      unsubscribeOnline?.()
      unsubscribeOffline?.()
    }
  }, [on])

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.has(userId)
  }, [onlineUsers])

  const getUserStatus = useCallback((userId: string): PresenceStatus => {
    return userStatuses.get(userId) || 'offline'
  }, [userStatuses])

  return {
    onlineUsers,
    userStatuses,
    updateStatus,
    setTyping,
    isUserOnline,
    getUserStatus,
    onlineCount: onlineUsers.size,
  }
}
