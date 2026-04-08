import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { validateBody, validateQuery } from '../validation/middleware.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import {
  updateUserSchema,
  updateUserRoleSchema,
  paginationSchema,
} from '../validation/schemas.js'

const router = Router()
const prisma = new PrismaClient()

// All routes require authentication
router.use(authMiddleware)

// GET /api/users - List all users (admin/manager only)
router.get('/', requireRole('ADMIN', 'MANAGER'), validateQuery(paginationSchema), async (req: AuthRequest, res) => {
  try {
    const { page, limit } = req.query as unknown as { page: number; limit: number }
    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              ownedProjects: true,
              tasks: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.user.count(),
    ])

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('List users error:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const currentUserId = req.user!.id
    const currentUserRole = req.user!.role

    // Users can view their own profile, admins/managers can view any
    const allowedRoles = ['ADMIN', 'MANAGER'];
    if (id !== currentUserId && !allowedRoles.includes(currentUserRole)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        ownedProjects: {
          select: {
            id: true,
            name: true,
            status: true,
            _count: {
              select: { tasks: true },
            },
          },
        },
        tasks: {
          where: { status: { not: 'DONE' } },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            project: {
              select: { id: true, name: true },
            },
          },
          orderBy: { dueDate: 'asc' },
          take: 10,
        },
        _count: {
          select: {
            tasks: true,
            createdTasks: true,
          },
        },
      },
    })

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    res.json({ success: true, data: user })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// PUT /api/users/:id - Update user profile
router.put('/:id', validateBody(updateUserSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const data = req.body
    const currentUserId = req.user!.id

    // Users can only update their own profile
    if (id !== currentUserId) {
      res.status(403).json({ error: 'You can only update your own profile' })
      return
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    })
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// PUT /api/users/:id/role - Update user role (admin only)
router.put('/:id/role', requireRole('ADMIN'), validateBody(updateUserRoleSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { role } = req.body
    const adminId = req.user!.id

    // Prevent admins from changing their own role
    if (id === adminId) {
      res.status(400).json({ error: 'You cannot change your own role' })
      return
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'USER_ROLE_CHANGED',
        metadata: JSON.stringify({
          userId: id,
          userName: user.name,
          newRole: role,
        }),
        userId: adminId,
      },
    })

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user,
    })
  } catch (error) {
    console.error('Update user role error:', error)
    res.status(500).json({ error: 'Failed to update user role' })
  }
})

// GET /api/users/:id/workload - Get user workload
router.get('/:id/workload', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const currentUserId = req.user!.id
    const currentUserRole = req.user!.role

    // Users can view their own workload, admins/managers can view any
    const allowedRoles = ['ADMIN', 'MANAGER'];
    if (id !== currentUserId && !allowedRoles.includes(currentUserRole)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    })

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Get task statistics
    const [taskStats, upcomingTasks, recentTasks] = await Promise.all([
      prisma.task.groupBy({
        by: ['status'],
        where: { assigneeId: id },
        _count: { status: true },
      }),
      prisma.task.findMany({
        where: {
          assigneeId: id,
          status: { not: 'DONE' },
          dueDate: { gte: new Date() },
        },
        include: {
          project: {
            select: { id: true, name: true },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.task.findMany({
        where: {
          assigneeId: id,
        },
        include: {
          project: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ])

    // Calculate workload metrics
    const totalTasks = taskStats.reduce((sum, stat) => sum + stat._count.status, 0)
    const completedTasks = taskStats.find(s => s.status === 'DONE')?._count.status || 0
    const inProgressTasks = taskStats.find(s => s.status === 'IN_PROGRESS')?._count.status || 0
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    res.json({
      success: true,
      data: {
        user,
        summary: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          completionRate,
        },
        taskBreakdown: taskStats,
        upcomingTasks,
        recentTasks,
      },
    })
  } catch (error) {
    console.error('Get user workload error:', error)
    res.status(500).json({ error: 'Failed to fetch workload' })
  }
})

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const adminId = req.user!.id

    // Prevent admins from deleting themselves
    if (id === adminId) {
      res.status(400).json({ error: 'You cannot delete your own account' })
      return
    }

    // Check if user has owned projects
    const ownedProjects = await prisma.project.count({
      where: { ownerId: id },
    })

    if (ownedProjects > 0) {
      res.status(400).json({
        error: 'Cannot delete user who owns projects. Transfer ownership first.',
      })
      return
    }

    await prisma.user.delete({
      where: { id },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'USER_DELETED',
        metadata: JSON.stringify({ userId: id }),
        userId: adminId,
      },
    })

    res.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

export default router
