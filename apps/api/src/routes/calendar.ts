import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Get calendar events (tasks with due dates) for a date range
router.get('/events', async (req, res) => {
  try {
    const { startDate, endDate, projectId } = req.query

    const where: {
      dueDate?: { gte?: Date; lte?: Date }
      projectId?: string
    } = {}

    if (startDate || endDate) {
      where.dueDate = {}
      if (startDate) {
        where.dueDate.gte = new Date(startDate as string)
      }
      if (endDate) {
        where.dueDate.lte = new Date(endDate as string)
      }
    }

    if (projectId) {
      where.projectId = projectId as string
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    })

    // Transform tasks into calendar events
    const events = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      date: task.dueDate?.toISOString().split('T')[0],
      time: task.dueDate?.toISOString().split('T')[1].slice(0, 5),
      status: task.status,
      priority: task.priority,
      type: 'TASK',
      project: task.project,
      assignee: task.assignee,
    }))

    res.json({
      success: true,
      data: events,
    })
  } catch (error) {
    console.error('Calendar events error:', error)
    res.status(500).json({ error: 'Failed to fetch calendar events' })
  }
})

// Get calendar summary for a month
router.get('/summary', async (req, res) => {
  try {
    const { year, month, projectId } = req.query

    const targetYear = year ? parseInt(year as string) : new Date().getFullYear()
    const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1)
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59)

    const where: {
      dueDate?: { gte: Date; lte: Date }
      projectId?: string
    } = {
      dueDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    }

    if (projectId) {
      where.projectId = projectId as string
    }

    const tasks = await prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
      },
    })

    // Group by date
    const summary: Record<string, { count: number; tasks: typeof tasks }> = {}

    tasks.forEach((task) => {
      if (task.dueDate) {
        const dateKey = task.dueDate.toISOString().split('T')[0]
        if (!summary[dateKey]) {
          summary[dateKey] = { count: 0, tasks: [] }
        }
        summary[dateKey].count++
        summary[dateKey].tasks.push(task)
      }
    })

    res.json({
      success: true,
      data: {
        year: targetYear,
        month: targetMonth,
        summary,
        totalTasks: tasks.length,
      },
    })
  } catch (error) {
    console.error('Calendar summary error:', error)
    res.status(500).json({ error: 'Failed to fetch calendar summary' })
  }
})

export default router
