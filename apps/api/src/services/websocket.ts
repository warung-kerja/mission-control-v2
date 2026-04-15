import { Server, Socket } from 'socket.io'
import { prisma } from '../index.js'
import jwt from 'jsonwebtoken'

// ── Presence tracking ────────────────────────────────────────────────────────

interface PresenceEntry {
  userId: string
  socketId: string
  status: 'online' | 'away' | 'busy'
  lastActivity: Date
}

// socketId → presence
const presenceMap = new Map<string, PresenceEntry>()
// userId → Set<socketId>  (multi-tab: a user can have many open sockets)
const userSocketsMap = new Map<string, Set<string>>()

function addUserSocket(userId: string, socketId: string): void {
  const existing = userSocketsMap.get(userId) ?? new Set()
  existing.add(socketId)
  userSocketsMap.set(userId, existing)
}

function removeUserSocket(userId: string, socketId: string): boolean {
  const sockets = userSocketsMap.get(userId)
  if (!sockets) return false
  sockets.delete(socketId)
  if (sockets.size === 0) {
    userSocketsMap.delete(userId)
    return true // last socket for this user
  }
  return false // user still has other sockets open
}

function touchActivity(socketId: string): void {
  const entry = presenceMap.get(socketId)
  if (entry) entry.lastActivity = new Date()
}

// ── Initialise ───────────────────────────────────────────────────────────────

export function initializeWebSocket(io: Server) {
  io.on('connection', (socket) => {
    handleConnection(socket).catch((err) => {
      console.error('[WebSocket] Unhandled error in handleConnection:', err)
      socket.disconnect()
    })
  })

  // Cleanup stale ONLINE entries every minute
  setInterval(() => cleanupInactiveUsers(io), 60_000)
}

// ── Connection handler ───────────────────────────────────────────────────────

async function handleConnection(socket: Socket): Promise<void> {
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

  console.log(`[WS] connect  user=${userId} socket=${socket.id}`)

  // Register presence
  presenceMap.set(socket.id, {
    userId,
    socketId: socket.id,
    status: 'online',
    lastActivity: new Date(),
  })
  addUserSocket(userId, socket.id)

  // Persist ONLINE in DB (ignore error — presence is best-effort)
  try {
    await prisma.user.update({ where: { id: userId }, data: { status: 'ONLINE' } })
  } catch (err) {
    console.error('[WS] DB error setting user online:', err)
  }

  // Join personal room
  socket.join(`user:${userId}`)

  // Broadcast online status
  socket.broadcast.emit('user:online', { userId })

  // Send current presence list to this socket
  const onlineUsers = Array.from(presenceMap.values()).map((p) => ({
    userId: p.userId,
    status: p.status,
  }))
  socket.emit('presence:list', onlineUsers)

  // ── Event handlers ─────────────────────────────────────────────────────────

  socket.on('project:join', (projectId: string) => {
    touchActivity(socket.id)
    socket.join(`project:${projectId}`)
  })

  socket.on('project:leave', (projectId: string) => {
    socket.leave(`project:${projectId}`)
  })

  socket.on('presence:update', async (status: 'online' | 'away' | 'busy') => {
    touchActivity(socket.id)
    const entry = presenceMap.get(socket.id)
    if (entry) entry.status = status

    const dbStatus = status === 'online' ? 'ONLINE' : status === 'away' ? 'AWAY' : 'BUSY'
    try {
      await prisma.user.update({ where: { id: userId }, data: { status: dbStatus } })
    } catch (err) {
      console.error('[WS] DB error updating presence:', err)
    }
    socket.broadcast.emit('presence:update', { userId, status })
  })

  socket.on('typing:start', ({ projectId, taskId }: { projectId?: string; taskId?: string }) => {
    touchActivity(socket.id)
    const room = taskId ? `task:${taskId}` : projectId ? `project:${projectId}` : null
    if (room) socket.to(room).emit('typing:start', { userId, taskId, projectId })
  })

  socket.on('typing:stop', ({ projectId, taskId }: { projectId?: string; taskId?: string }) => {
    const room = taskId ? `task:${taskId}` : projectId ? `project:${projectId}` : null
    if (room) socket.to(room).emit('typing:stop', { userId, taskId, projectId })
  })

  socket.on('disconnect', async () => {
    console.log(`[WS] disconnect user=${userId} socket=${socket.id}`)
    presenceMap.delete(socket.id)

    const isLastSocket = removeUserSocket(userId, socket.id)
    if (isLastSocket) {
      // Only mark OFFLINE if no other tabs are connected for this user
      try {
        await prisma.user.update({ where: { id: userId }, data: { status: 'OFFLINE' } })
      } catch (err) {
        console.error('[WS] DB error setting user offline:', err)
      }
      socket.broadcast.emit('user:offline', { userId })
    }
  })
}

// ── Stale presence cleanup ───────────────────────────────────────────────────

async function cleanupInactiveUsers(io: Server): Promise<void> {
  const now = Date.now()
  const awayThreshold = 5 * 60 * 1000 // 5 minutes

  for (const [, entry] of presenceMap) {
    if (entry.status === 'online' && now - entry.lastActivity.getTime() > awayThreshold) {
      entry.status = 'away'
      try {
        await prisma.user.update({ where: { id: entry.userId }, data: { status: 'AWAY' } })
      } catch (err) {
        console.error('[WS] DB error auto-marking away:', err)
      }
      io.emit('presence:update', { userId: entry.userId, status: 'away' })
    }
  }
}

// ── Broadcast helpers ────────────────────────────────────────────────────────

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

export function getUserSocketIds(userId: string): Set<string> {
  return userSocketsMap.get(userId) ?? new Set()
}

export function getPresenceMap(): Map<string, PresenceEntry> {
  return presenceMap
}
