import { useEffect, useCallback, useState } from 'react'
import { useWebSocket } from './useWebSocket'
import { apiClient } from '../services/api'

export interface Notification {
  id: string
  type: 'task_assigned' | 'task_completed' | 'task_due_soon' | 'project_invite' | 'mention' | 'system'
  title: string
  message: string
  link?: string
  read: boolean
  createdAt: string
  metadata?: Record<string, unknown>
}

export function useNotifications() {
  const { on } = useWebSocket()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Fetch initial notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await apiClient.get('/notifications')
        setNotifications(response.data.data || [])
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    const fetchUnreadCount = async () => {
      try {
        const response = await apiClient.get('/notifications/unread-count')
        setUnreadCount(response.data.count || 0)
      } catch (error) {
        console.error('Failed to fetch unread count:', error)
      }
    }

    fetchNotifications()
    fetchUnreadCount()
  }, [])

  // Listen for real-time notifications
  useEffect(() => {
    const unsubscribe = on<Notification>('notification:new', (notification) => {
      setNotifications((prev) => [notification, ...prev])
      setUnreadCount((prev) => prev + 1)
    })

    return () => {
      unsubscribe?.()
    }
  }, [on])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.patch('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }, [])

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await apiClient.delete(`/notifications/${notificationId}`)
      setNotifications((prev) => {
        const notification = prev.find((n) => n.id === notificationId)
        const filtered = prev.filter((n) => n.id !== notificationId)
        if (notification && !notification.read) {
          setUnreadCount((count) => Math.max(0, count - 1))
        }
        return filtered
      })
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }, [])

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}
