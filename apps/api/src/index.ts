import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

import authRoutes from './routes/auth.js'
import projectRoutes from './routes/projects.js'
import taskRoutes from './routes/tasks.js'
import userRoutes from './routes/users.js'
import notificationRoutes from './routes/notifications.js'
import teamRoutes from './routes/team.js'
import calendarRoutes from './routes/calendar.js'
import messageRoutes from './routes/messages.js'
import memoryRoutes from './routes/memories.js'
import systemRoutes from './routes/system.js'
import { initializeWebSocket } from './services/websocket.js'

dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

export const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(compression())
app.use(express.json())

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  })
})

// Public routes
app.use('/api/auth', authRoutes)

// Protected routes (require authentication)
app.use('/api/projects', projectRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/users', userRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/memories', memoryRoutes)
app.use('/api/system', systemRoutes)

// Dashboard routes
app.get('/api/dashboard/stats', async (_req, res) => {
  try {
    const [activeProjects, tasksCompleted, teamMembers] = await Promise.all([
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.task.count({ where: { status: 'DONE' } }),
      prisma.user.count(),
    ])

    res.json({
      success: true,
      data: {
        activeProjects,
        tasksCompleted,
        hoursLogged: 0, // TODO: Implement time tracking
        teamMembers,
      },
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

app.get('/api/dashboard/activity', async (_req, res) => {
  try {
    const activities = await prisma.activity.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    })

    res.json({
      success: true,
      data: activities,
    })
  } catch (error) {
    console.error('Dashboard activity error:', error)
    res.status(500).json({ error: 'Failed to fetch activity' })
  }
})

// Initialize WebSocket services (presence, real-time events)
initializeWebSocket(io)

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

server.listen(PORT, () => {
  console.log(`🚀 Mission Control API V2.0 running on port ${PORT}`)
  console.log(`📡 WebSocket server initialized`)
})

// Export io getter for use in routes
export function getIO() {
  return io
}

export { app, io }
