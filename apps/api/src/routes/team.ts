import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

// All routes require authentication
router.use(authMiddleware)

// GET /api/team/analytics - Get team analytics overview
router.get('/analytics', async (req: AuthRequest, res) => {
  try {
    const { projectId, startDate, endDate } = req.query
    
    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) dateFilter.gte = new Date(startDate as string)
    if (endDate) dateFilter.lte = new Date(endDate as string)
    
    // Build project filter
    const projectFilter = projectId ? { projectId: projectId as string } : {}
    
    // Get task statistics
    const taskStats = await prisma.task.groupBy({
      by: ['status'],
      where: {
        ...projectFilter,
        ...(Object.keys(dateFilter).length > 0 && {
          createdAt: dateFilter,
        }),
      },
      _count: {
        status: true,
      },
    })
    
    // Get priority distribution
    const priorityStats = await prisma.task.groupBy({
      by: ['priority'],
      where: {
        ...projectFilter,
        ...(Object.keys(dateFilter).length > 0 && {
          createdAt: dateFilter,
        }),
      },
      _count: {
        priority: true,
      },
    })
    
    // Get completion rate (tasks completed vs total)
    const totalTasks = await prisma.task.count({
      where: {
        ...projectFilter,
        ...(Object.keys(dateFilter).length > 0 && {
          createdAt: dateFilter,
        }),
      },
    })
    
    const completedTasks = await prisma.task.count({
      where: {
        ...projectFilter,
        status: 'DONE',
        ...(Object.keys(dateFilter).length > 0 && {
          updatedAt: dateFilter,
        }),
      },
    })
    
    // Get activity counts by type
    const activityStats = await prisma.activity.groupBy({
      by: ['type'],
      where: {
        ...(Object.keys(dateFilter).length > 0 && {
          createdAt: dateFilter,
        }),
      },
      _count: {
        type: true,
      },
    })
    
    res.json({
      success: true,
      data: {
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          byStatus: taskStats.reduce((acc, curr) => {
            acc[curr.status] = curr._count.status
            return acc
          }, {} as Record<string, number>),
          byPriority: priorityStats.reduce((acc, curr) => {
            acc[curr.priority] = curr._count.priority
            return acc
          }, {} as Record<string, number>),
        },
        activities: activityStats.reduce((acc, curr) => {
          acc[curr.type] = curr._count.type
          return acc
        }, {} as Record<string, number>),
      },
    })
  } catch (error) {
    console.error('Team analytics error:', error)
    res.status(500).json({ error: 'Failed to fetch team analytics' })
  }
})

// GET /api/team/members - Get team members with workload
router.get('/members', async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.query
    
    // Get users with their task counts
    const users = await prisma.user.findMany({
      where: {
        role: { not: 'ADMIN' }, // Exclude admin users from team list
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            tasks: true,
            createdTasks: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })
    
    // Get task breakdown per user
    const usersWithWorkload = await Promise.all(
      users.map(async (user) => {
        const taskBreakdown = await prisma.task.groupBy({
          by: ['status'],
          where: {
            assigneeId: user.id,
            ...(projectId && { projectId: projectId as string }),
          },
          _count: {
            status: true,
          },
        })

        const tasksByStatus = taskBreakdown.reduce((acc, curr) => {
          acc[curr.status] = curr._count.status
          return acc
        }, {} as Record<string, number>)

        // Get overdue tasks
        const overdueTasks = await prisma.task.count({
          where: {
            assigneeId: user.id,
            dueDate: { lt: new Date() },
            status: { not: 'DONE' },
            ...(projectId && { projectId: projectId as string }),
          },
        })

        // Get active tasks (IN_PROGRESS) with project context
        const activeTasks = await prisma.task.findMany({
          where: {
            assigneeId: user.id,
            status: 'IN_PROGRESS',
            ...(projectId && { projectId: projectId as string }),
          },
          select: {
            id: true,
            title: true,
            priority: true,
            project: { select: { id: true, name: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 3,
        })

        return {
          ...user,
          workload: {
            total: user._count.tasks,
            byStatus: tasksByStatus,
            overdue: overdueTasks,
          },
          activeTasks,
        }
      })
    )
    
    res.json({
      success: true,
      data: usersWithWorkload,
    })
  } catch (error) {
    console.error('Team members error:', error)
    res.status(500).json({ error: 'Failed to fetch team members' })
  }
})

// GET /api/team/productivity - Get productivity metrics
router.get('/productivity', async (req: AuthRequest, res) => {
  try {
    const { days = '7' } = req.query
    const daysNum = parseInt(days as string)
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysNum)
    
    // Get tasks completed per day
    const completedTasks = await prisma.task.findMany({
      where: {
        status: 'DONE',
        updatedAt: {
          gte: startDate,
        },
      },
      select: {
        updatedAt: true,
        assigneeId: true,
      },
    })
    
    // Group by date
    const byDate: Record<string, number> = {}
    const byUser: Record<string, number> = {}
    
    completedTasks.forEach((task) => {
      const date = task.updatedAt.toISOString().split('T')[0]
      byDate[date] = (byDate[date] || 0) + 1
      
      if (task.assigneeId) {
        byUser[task.assigneeId] = (byUser[task.assigneeId] || 0) + 1
      }
    })
    
    // Get user details for top performers
    const userIds = Object.keys(byUser)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, avatar: true },
    })
    
    const topPerformers = users
      .map((user) => ({
        ...user,
        tasksCompleted: byUser[user.id] || 0,
      }))
      .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
      .slice(0, 5)
    
    res.json({
      success: true,
      data: {
        period: `${daysNum} days`,
        totalCompleted: completedTasks.length,
        byDate,
        topPerformers,
      },
    })
  } catch (error) {
    console.error('Productivity error:', error)
    res.status(500).json({ error: 'Failed to fetch productivity metrics' })
  }
})

// GET /api/team/analytics/projects - Per-project task breakdown
router.get('/analytics/projects', async (_req: AuthRequest, res) => {
  try {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    })

    const breakdown = await Promise.all(
      projects.map(async (project) => {
        const tasksByStatus = await prisma.task.groupBy({
          by: ['status'],
          where: { projectId: project.id },
          _count: { status: true },
        })

        const byStatus = tasksByStatus.reduce((acc, curr) => {
          acc[curr.status] = curr._count.status
          return acc
        }, {} as Record<string, number>)

        const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0)
        const completed = byStatus.DONE || 0

        const overdue = await prisma.task.count({
          where: {
            projectId: project.id,
            dueDate: { lt: new Date() },
            status: { not: 'DONE' },
          },
        })

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          memberCount: project._count.members,
          total,
          completed,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          byStatus,
          overdue,
        }
      })
    )

    res.json({ success: true, data: breakdown })
  } catch (error) {
    console.error('Project analytics error:', error)
    res.status(500).json({ error: 'Failed to fetch project analytics' })
  }
})

// GET /api/team/activity-feed - Get team activity feed
router.get('/activity-feed', async (req: AuthRequest, res) => {
  try {
    const { limit = '20', projectId } = req.query
    const limitNum = parseInt(limit as string)
    
    const activities = await prisma.activity.findMany({
      where: {
        ...(projectId && {
          metadata: {
            contains: `"projectId":"${projectId}"`,
          },
        }),
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limitNum,
    })
    
    // Parse metadata for each activity
    const parsedActivities = activities.map((activity) => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
    }))
    
    res.json({
      success: true,
      data: parsedActivities,
    })
  } catch (error) {
    console.error('Activity feed error:', error)
    res.status(500).json({ error: 'Failed to fetch activity feed' })
  }
})

export default router
