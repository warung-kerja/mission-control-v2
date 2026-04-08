import { PrismaClient } from '@prisma/client'
import type { Server } from 'socket.io'
import { broadcastToUser } from './websocket.js'

const prisma = new PrismaClient()

// Notification types
export type NotificationType = 
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED'
  | 'TASK_DUE_SOON'
  | 'PROJECT_INVITE'
  | 'PROJECT_UPDATE'
  | 'MENTION'
  | 'SYSTEM'

interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, unknown>
  link?: string
}

// Create and send notification
export async function createNotification(
  io: Server,
  input: CreateNotificationInput
) {
  const { userId, type, title, message, metadata, link } = input
  
  // Save to database
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
      link,
      read: false,
    },
  })
  
  // Send real-time notification
  broadcastToUser(io, userId, 'notification:new', {
    id: notification.id,
    type,
    title,
    message,
    metadata,
    link,
    createdAt: notification.createdAt,
  })
  
  return notification
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })
  
  if (!notification) {
    throw new Error('Notification not found')
  }
  
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  })
}

// Mark all notifications as read for user
export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  })
}

// Get unread count for user
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  })
}

// Get notifications for user
export async function getUserNotifications(userId: string, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// Notification helpers for common events
export async function notifyTaskAssigned(
  io: Server,
  assigneeId: string,
  taskTitle: string,
  projectName: string,
  taskId: string
) {
  return createNotification(io, {
    userId: assigneeId,
    type: 'TASK_ASSIGNED',
    title: 'New Task Assigned',
    message: `You've been assigned to "${taskTitle}" in ${projectName}`,
    metadata: { taskId },
    link: `/tasks/${taskId}`,
  })
}

export async function notifyTaskCompleted(
  io: Server,
  creatorId: string,
  assigneeName: string,
  taskTitle: string,
  projectName: string,
  taskId: string
) {
  return createNotification(io, {
    userId: creatorId,
    type: 'TASK_COMPLETED',
    title: 'Task Completed',
    message: `${assigneeName} completed "${taskTitle}" in ${projectName}`,
    metadata: { taskId },
    link: `/tasks/${taskId}`,
  })
}

export async function notifyProjectInvite(
  io: Server,
  inviteeId: string,
  inviterName: string,
  projectName: string,
  projectId: string
) {
  return createNotification(io, {
    userId: inviteeId,
    type: 'PROJECT_INVITE',
    title: 'Project Invitation',
    message: `${inviterName} invited you to join ${projectName}`,
    metadata: { projectId },
    link: `/projects/${projectId}`,
  })
}

export async function notifyMention(
  io: Server,
  mentionedUserId: string,
  mentionerName: string,
  content: string,
  context: 'task' | 'message',
  contextId: string
) {
  const link = context === 'task' ? `/tasks/${contextId}` : `/messages/${contextId}`
  return createNotification(io, {
    userId: mentionedUserId,
    type: 'MENTION',
    title: 'New Mention',
    message: `${mentionerName} mentioned you: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
    metadata: { context, contextId },
    link,
  })
}

// Check for due tasks and send reminders (call this from a cron job)
export async function sendDueTaskReminders(io: Server) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  
  const dayAfter = new Date(tomorrow)
  dayAfter.setDate(dayAfter.getDate() + 1)
  
  const dueTasks = await prisma.task.findMany({
    where: {
      dueDate: {
        gte: tomorrow,
        lt: dayAfter,
      },
      status: {
        not: 'DONE',
      },
      assigneeId: {
        not: null,
      },
    },
    include: {
      assignee: true,
      project: true,
    },
  })
  
  for (const task of dueTasks) {
    if (task.assigneeId) {
      await createNotification(io, {
        userId: task.assigneeId,
        type: 'TASK_DUE_SOON',
        title: 'Task Due Tomorrow',
        message: `"${task.title}" in ${task.project.name} is due tomorrow`,
        metadata: { taskId: task.id },
        link: `/tasks/${task.id}`,
      })
    }
  }
  
  return dueTasks.length
}
