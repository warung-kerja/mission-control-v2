import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { markNotificationAsRead, markAllNotificationsAsRead, getUserNotifications, getUnreadNotificationCount } from '../services/notifications.js'

const router = Router()
const prisma = new PrismaClient()

// All routes require authentication
router.use(authMiddleware)

// GET /api/notifications - Get user's notifications
router.get('/', async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const notifications = await getUserNotifications(req.user!.id, limit)
    
    res.json({
      success: true,
      data: notifications,
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', async (req: AuthRequest, res) => {
  try {
    const count = await getUnreadNotificationCount(req.user!.id)
    
    res.json({
      success: true,
      data: { count },
    })
  } catch (error) {
    console.error('Get unread count error:', error)
    res.status(500).json({ error: 'Failed to fetch unread count' })
  }
})

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const notification = await markNotificationAsRead(id, req.user!.id)
    
    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    })
  } catch (error) {
    console.error('Mark notification read error:', error)
    if (error instanceof Error && error.message === 'Notification not found') {
      res.status(404).json({ error: 'Notification not found' })
    } else {
      res.status(500).json({ error: 'Failed to mark notification as read' })
    }
  }
})

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', async (req: AuthRequest, res) => {
  try {
    const result = await markAllNotificationsAsRead(req.user!.id)
    
    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: { count: result.count },
    })
  } catch (error) {
    console.error('Mark all read error:', error)
    res.status(500).json({ error: 'Failed to mark notifications as read' })
  }
})

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    
    // Verify notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user!.id },
    })
    
    if (!notification) {
      res.status(404).json({ error: 'Notification not found' })
      return
    }
    
    await prisma.notification.delete({
      where: { id },
    })
    
    res.json({
      success: true,
      message: 'Notification deleted',
    })
  } catch (error) {
    console.error('Delete notification error:', error)
    res.status(500).json({ error: 'Failed to delete notification' })
  }
})

export default router
