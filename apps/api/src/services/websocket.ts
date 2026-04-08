import { Server, Socket } from 'socket.io'
import { prisma } from '../index.js'
import jwt from 'jsonwebtoken'

// Active user presence tracking
interface PresenceUser {
  userId: string
  socketId: string
  status: 'online' | 'away' | 'busy'
  lastActivity: Date
}

const presenceMap = new Map<string, PresenceUser>() // socketId -> PresenceUser
const userSocketMap = new Map<string, string>() // userId -> socketId

// Initialize WebSocket services
export function initializeWebSocket(io: Server) {
  io.on('connection', handleConnection)
  
  // Start presence cleanup interval
  setInterval(() => cleanupInactiveUsers(io), 60000) // Every minute
}

async function handleConnection(socket: Socket) {
  console.log('Client connected:', socket.id)
  
  // Authenticate socket connection
  const token = socket.handshake.auth.token as string
  if (!token) {
    socket.disconnect()
    return
  }
  
  let userId: string
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { userId: string }
    userId = decoded.userId
  } catch {
    socket.disconnect()
    return
  }
  
  // Update user presence
  await setUserOnline(socket.id, userId)
  
  // Join personal room for direct messages
  socket.join(`user:${userId}`)
  
  // Broadcast user online to all clients
  socket.broadcast.emit('user:online', { userId })
  
  // Send current presence list to newly connected user
  const onlineUsers = Array.from(presenceMap.values()).map(p => ({
    userId: p.userId,
    status: p.status,
  }))
  socket.emit('presence:list', onlineUsers)
  
  // Handle room subscriptions
  socket.on('project:join', (projectId: string) => {
    socket.join(`project:${projectId}`)
    console.log(`User ${userId} joined project:${projectId}`)
  })
  
  socket.on('project:leave', (projectId: string) => {
    socket.leave(`project:${projectId}`)
    console.log(`User ${userId} left project:${projectId}`)
  })
  
  // Handle presence updates
  socket.on('presence:update', async (status: 'online' | 'away' | 'busy') => {
    await updateUserPresence(userId, status)
    socket.broadcast.emit('presence:update', { userId, status })
  })
  
  // Handle typing indicators
  socket.on('typing:start', ({ projectId, taskId }: { projectId?: string; taskId?: string }) => {
    const room = taskId ? `task:${taskId}` : projectId ? `project:${projectId}` : null
    if (room) {
      socket.to(room).emit('typing:start', { userId, taskId, projectId })
    }
  })
  
  socket.on('typing:stop', ({ projectId, taskId }: { projectId?: string; taskId?: string }) => {
    const room = taskId ? `task:${taskId}` : projectId ? `project:${projectId}` : null
    if (room) {
      socket.to(room).emit('typing:stop', { userId, taskId, projectId })
    }
  })
  
  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id)
    await setUserOffline(socket.id, userId)
    socket.broadcast.emit('user:offline', { userId })
  })
}

async function setUserOnline(socketId: string, userId: string) {
  presenceMap.set(socketId, {
    userId,
    socketId,
    status: 'online',
    lastActivity: new Date(),
  })
  userSocketMap.set(userId, socketId)
  
  // Update database
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'ONLINE' },
  })
}

async function setUserOffline(socketId: string, userId: string) {
  presenceMap.delete(socketId)
  userSocketMap.delete(userId)
  
  // Update database
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'OFFLINE' },
  })
}

async function updateUserPresence(userId: string, status: 'online' | 'away' | 'busy') {
  const socketId = userSocketMap.get(userId)
  if (socketId) {
    const presence = presenceMap.get(socketId)
    if (presence) {
      presence.status = status
      presence.lastActivity = new Date()
    }
  }
  
  // Map to database status
  const dbStatus = status === 'online' ? 'ONLINE' : status === 'away' ? 'AWAY' : 'BUSY'
  await prisma.user.update({
    where: { id: userId },
    data: { status: dbStatus },
  })
}

async function cleanupInactiveUsers(io: Server) {
  const now = new Date()
  const inactiveThreshold = 5 * 60 * 1000 // 5 minutes
  
  for (const [, presence] of presenceMap) {
    if (now.getTime() - presence.lastActivity.getTime() > inactiveThreshold) {
      if (presence.status === 'online') {
        presence.status = 'away'
        await prisma.user.update({
          where: { id: presence.userId },
          data: { status: 'AWAY' },
        })
        io.emit('presence:update', { userId: presence.userId, status: 'away' })
      }
    }
  }
}

// Event broadcasting helpers
export function broadcastProjectEvent(io: Server, projectId: string, event: string, data: unknown) {
  io.to(`project:${projectId}`).emit(event, data)
}

export function broadcastTaskEvent(io: Server, taskId: string, event: string, data: unknown) {
  io.to(`task:${taskId}`).emit(event, data)
}

export function broadcastToUser(io: Server, userId: string, event: string, data: unknown) {
  io.to(`user:${userId}`).emit(event, data)
}

export function broadcastToAll(io: Server, event: string, data: unknown) {
  io.emit(event, data)
}

// Get user's socket ID for direct messaging
export function getUserSocketId(userId: string): string | undefined {
  return userSocketMap.get(userId)
}

// Export presence map for external access
export function getPresenceMap(): Map<string, PresenceUser> {
  return presenceMap
}
