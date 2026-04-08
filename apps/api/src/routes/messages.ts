import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import { io } from '../index.js'
import { broadcastProjectEvent } from '../services/websocket.js'

const router = Router()
const prisma = new PrismaClient()

// All routes require authentication
router.use(authMiddleware)

// Get messages for a project
router.get('/project/:projectId', async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params
    const { limit = '50', before } = req.query

    // Verify user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: req.user!.id },
          { members: { some: { userId: req.user!.id } } },
        ],
      },
    })

    if (!project) {
      return res.status(403).json({ error: 'Access denied to this project' })
    }

    const messages = await prisma.message.findMany({
      where: {
        projectId,
        ...(before ? { createdAt: { lt: new Date(before as string) } } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit as string),
    })

    res.json({
      success: true,
      data: messages.reverse(), // Return oldest first
    })
  } catch (error) {
    console.error('Get messages error:', error)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

// Send a message to a project
router.post('/project/:projectId', async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params
    const { content } = req.body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' })
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters)' })
    }

    // Verify user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: req.user!.id },
          { members: { some: { userId: req.user!.id } } },
        ],
      },
    })

    if (!project) {
      return res.status(403).json({ error: 'Access denied to this project' })
    }

    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId: req.user!.id,
        projectId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            status: true,
          },
        },
      },
    })

    // Broadcast to project room via WebSocket
    broadcastProjectEvent(io, projectId, 'message:created', message)

    res.status(201).json({
      success: true,
      data: message,
    })
  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// Get recent messages across all user's projects (for general feed)
router.get('/recent', async (req: AuthRequest, res) => {
  try {
    const { limit = '20' } = req.query

    const messages = await prisma.message.findMany({
      where: {
        project: {
          OR: [
            { ownerId: req.user!.id },
            { members: { some: { userId: req.user!.id } } },
          ],
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            status: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit as string),
    })

    res.json({
      success: true,
      data: messages.reverse(),
    })
  } catch (error) {
    console.error('Get recent messages error:', error)
    res.status(500).json({ error: 'Failed to fetch recent messages' })
  }
})

// Delete a message (only sender or project owner)
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            ownerId: true,
          },
        },
      },
    })

    if (!message) {
      return res.status(404).json({ error: 'Message not found' })
    }

    // Only sender or project owner can delete
    if (message.senderId !== req.user!.id && message.project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to delete this message' })
    }

    await prisma.message.delete({
      where: { id },
    })

    // Broadcast deletion to project room
    broadcastProjectEvent(io, message.projectId, 'message:deleted', { id })

    res.json({
      success: true,
      message: 'Message deleted',
    })
  } catch (error) {
    console.error('Delete message error:', error)
    res.status(500).json({ error: 'Failed to delete message' })
  }
})

export default router
