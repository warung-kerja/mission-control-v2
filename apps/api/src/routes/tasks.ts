import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { validateBody, validateQuery } from '../validation/middleware.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  assignTaskSchema,
  paginationSchema,
  taskFilterSchema,
} from '../validation/schemas.js'
import { io } from '../index.js'
import { broadcastProjectEvent, broadcastTaskEvent } from '../services/websocket.js'
import { notifyTaskAssigned, notifyTaskCompleted } from '../services/notifications.js'

const router = Router()
const prisma = new PrismaClient()

// All routes require authentication
router.use(authMiddleware)

// GET /api/tasks - List all tasks with filters
router.get('/', validateQuery(paginationSchema.merge(taskFilterSchema)), async (req: AuthRequest, res) => {
  try {
    const { page, limit, projectId, assigneeId, status, priority } = req.query as unknown as {
      page: number
      limit: number
      projectId?: string
      assigneeId?: string
      status?: string
      priority?: string
    }
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (assigneeId) where.assigneeId = assigneeId
    if (status) where.status = status
    if (priority) where.priority = priority

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        include: {
          assignee: {
            select: { id: true, name: true, avatar: true },
          },
          creator: {
            select: { id: true, name: true, avatar: true },
          },
          project: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.task.count({ where }),
    ])

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('List tasks error:', error)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

// GET /api/tasks/:id - Get task by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true, email: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true, email: true },
        },
        project: {
          select: { id: true, name: true, status: true },
        },
      },
    })

    if (!task) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    res.json({ success: true, data: task })
  } catch (error) {
    console.error('Get task error:', error)
    res.status(500).json({ error: 'Failed to fetch task' })
  }
})

// POST /api/tasks - Create new task
router.post('/', validateBody(createTaskSchema), async (req: AuthRequest, res) => {
  try {
    const data = req.body
    const userId = req.user!.id

    // Verify user has access to the project
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: data.projectId,
        userId,
      },
    })

    if (!membership && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'You do not have access to this project' })
      return
    }

    const task = await prisma.task.create({
      data: {
        ...data,
        creatorId: userId,
      },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'TASK_CREATED',
        metadata: JSON.stringify({
          taskId: task.id,
          taskTitle: task.title,
          projectId: task.projectId,
        }),
        userId,
      },
    })

    // Broadcast to project room
    broadcastProjectEvent(io, task.projectId, 'task:created', {
      task,
      createdBy: req.user!.id,
    })

    // Notify assignee if different from creator
    if (task.assigneeId && task.assigneeId !== userId) {
      await notifyTaskAssigned(io, task.assigneeId, task.title, task.project.name, task.id)
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    })
  } catch (error) {
    console.error('Create task error:', error)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// PUT /api/tasks/:id - Update task
router.put('/:id', validateBody(updateTaskSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const data = req.body
    const userId = req.user!.id

    // Get the task to check permissions
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    })

    if (!existingTask) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    // Check permissions: task creator, assignee, project owner/admin, or system admin
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: existingTask.projectId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })

    const canEdit =
      existingTask.creatorId === userId ||
      existingTask.assigneeId === userId ||
      membership ||
      req.user!.role === 'ADMIN'

    if (!canEdit) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const task = await prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'TASK_UPDATED',
        metadata: JSON.stringify({
          taskId: task.id,
          taskTitle: task.title,
          projectId: task.projectId,
        }),
        userId,
      },
    })

    // Broadcast update to project room and task room
    broadcastProjectEvent(io, task.projectId, 'task:updated', {
      task,
      updatedBy: req.user!.id,
    })
    broadcastTaskEvent(io, task.id, 'task:updated', {
      task,
      updatedBy: req.user!.id,
    })

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    })
  } catch (error) {
    console.error('Update task error:', error)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

// POST /api/tasks/:id/status - Update task status
router.post('/:id/status', validateBody(updateTaskStatusSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const userId = req.user!.id

    // Get the task to check permissions
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    })

    if (!existingTask) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    // Check permissions
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: existingTask.projectId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })

    const canUpdate =
      existingTask.creatorId === userId ||
      existingTask.assigneeId === userId ||
      membership ||
      req.user!.role === 'ADMIN'

    if (!canUpdate) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const task = await prisma.task.update({
      where: { id },
      data: { status },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'TASK_STATUS_CHANGED',
        metadata: JSON.stringify({
          taskId: task.id,
          taskTitle: task.title,
          oldStatus: existingTask.status,
          newStatus: status,
          projectId: task.projectId,
        }),
        userId,
      },
    })

    // Broadcast status change
    broadcastProjectEvent(io, task.projectId, 'task:status-changed', {
      taskId: task.id,
      oldStatus: existingTask.status,
      newStatus: status,
      changedBy: req.user!.id,
    })

    // If task completed, notify creator
    if (status === 'DONE' && existingTask.status !== 'DONE' && task.creatorId !== userId) {
      const assignee = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })
      if (assignee) {
        await notifyTaskCompleted(io, task.creatorId, assignee.name, task.title, task.project.name, task.id)
      }
    }

    res.json({
      success: true,
      message: 'Task status updated successfully',
      data: task,
    })
  } catch (error) {
    console.error('Update task status error:', error)
    res.status(500).json({ error: 'Failed to update task status' })
  }
})

// POST /api/tasks/:id/assign - Assign task to user
router.post('/:id/assign', validateBody(assignTaskSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { assigneeId } = req.body
    const userId = req.user!.id

    // Get the task to check permissions
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    })

    if (!existingTask) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    // Check permissions (only project owners/admins or system admins can assign)
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: existingTask.projectId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })

    if (!membership && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    // If assigning to someone, verify they are a project member
    if (assigneeId) {
      const assigneeMembership = await prisma.projectMember.findFirst({
        where: {
          projectId: existingTask.projectId,
          userId: assigneeId,
        },
      })

      if (!assigneeMembership) {
        res.status(400).json({ error: 'Assignee is not a member of this project' })
        return
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: { assigneeId },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'TASK_ASSIGNED',
        metadata: JSON.stringify({
          taskId: task.id,
          taskTitle: task.title,
          assigneeId,
          projectId: task.projectId,
        }),
        userId,
      },
    })

    // Broadcast assignment
    broadcastProjectEvent(io, task.projectId, 'task:assigned', {
      taskId: task.id,
      assigneeId,
      assignedBy: req.user!.id,
    })

    // Notify new assignee
    if (assigneeId && assigneeId !== userId) {
      await notifyTaskAssigned(io, assigneeId, task.title, task.project.name, task.id)
    }

    res.json({
      success: true,
      message: assigneeId ? 'Task assigned successfully' : 'Task unassigned',
      data: task,
    })
  } catch (error) {
    console.error('Assign task error:', error)
    res.status(500).json({ error: 'Failed to assign task' })
  }
})

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Get the task to check permissions
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    })

    if (!existingTask) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    // Check permissions: task creator, project owner/admin, or system admin
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: existingTask.projectId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })

    const canDelete =
      existingTask.creatorId === userId ||
      membership ||
      req.user!.role === 'ADMIN'

    if (!canDelete) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    await prisma.task.delete({
      where: { id },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'TASK_DELETED',
        metadata: JSON.stringify({
          taskId: id,
          taskTitle: existingTask.title,
          projectId: existingTask.projectId,
        }),
        userId,
      },
    })

    // Broadcast deletion
    broadcastProjectEvent(io, existingTask.projectId, 'task:deleted', {
      taskId: id,
      deletedBy: req.user!.id,
    })

    res.json({
      success: true,
      message: 'Task deleted successfully',
    })
  } catch (error) {
    console.error('Delete task error:', error)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

export default router
