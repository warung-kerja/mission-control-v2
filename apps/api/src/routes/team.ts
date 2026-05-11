import { Router } from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()


type TokenUsageEntry = {
  agent: string
  date: string
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  totalTokens: number
  turns: number
}

type TokenUsageAttributionWindow = {
  sourceAgent: string
  attributedAgent: string
  startMs: number
  endMs: number
}

type RawTaskRunAttribution = {
  agent_id?: string | null
  child_session_key?: string | null
  started_at?: number | null
  ended_at?: number | null
}

const OPENCLAW_AGENTS_DIR = process.env.OPENCLAW_AGENTS_DIR
  || path.join(process.env.HOME || '/home/baro', '.openclaw', 'agents')
const OPENCLAW_TASK_RUNS_DB = process.env.OPENCLAW_TASK_RUNS_DB
  || path.join(process.env.HOME || '/home/baro', '.openclaw', 'tasks', 'runs.sqlite')
const TOKEN_USAGE_TIMEZONE = process.env.TOKEN_USAGE_TIMEZONE || 'Australia/Sydney'
const TOKEN_USAGE_AGENT_COLORS: Record<string, string> = {
  noona: '#F97316',
  jen: '#14B8A6',
  baro: '#60A5FA',
  main: '#A3E635',
  obey: '#F43F5E',
  haji: '#EAB308',
  lin: '#C084FC',
  claude: '#38BDF8',
  bob: '#FB7185',
  soba: '#34D399',
}

const formatDateInZone = (date: Date, timeZone = TOKEN_USAGE_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${lookup.year}-${lookup.month}-${lookup.day}`
}

const buildDateWindow = (days: number) => {
  const dates: string[] = []
  const seen = new Set<string>()

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = formatDateInZone(date)
    if (!seen.has(key)) {
      seen.add(key)
      dates.push(key)
    }
  }

  return dates
}

const emptyUsageEntry = (agent: string, date: string): TokenUsageEntry => ({
  agent,
  date,
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  turns: 0,
})

const addUsageEntry = (usage: Map<string, Map<string, TokenUsageEntry>>, agent: string, date: string) => {
  const agentUsage = usage.get(agent) ?? new Map<string, TokenUsageEntry>()
  const entry = agentUsage.get(date) ?? emptyUsageEntry(agent, date)
  usage.set(agent, agentUsage)
  agentUsage.set(date, entry)
  return entry
}

const parseAgentFromSessionKey = (sessionKey?: string | null) => {
  const match = sessionKey?.match(/^agent:([^:]+)/)
  return match?.[1] ?? null
}

const getAttributionAgent = (sourceAgent: string, timestampMs: number, windows: TokenUsageAttributionWindow[]) => {
  const match = windows.find((window) => (
    window.sourceAgent === sourceAgent
    && timestampMs >= window.startMs
    && timestampMs <= window.endMs
  ))
  return match?.attributedAgent ?? sourceAgent
}

const loadTokenUsageAttributionWindows = (startMs: number, endMs: number) => {
  const windows: TokenUsageAttributionWindow[] = []

  try {
    const script = `
import json, sqlite3, sys
path, start_ms, end_ms = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
conn = sqlite3.connect(path)
conn.row_factory = sqlite3.Row
rows = conn.execute('''
  select agent_id, child_session_key, started_at, ended_at
  from task_runs
  where agent_id is not null
    and agent_id != ''
    and started_at is not null
    and ended_at is not null
    and ended_at >= ?
    and started_at <= ?
''', (start_ms, end_ms)).fetchall()
print(json.dumps([dict(row) for row in rows]))
`
    const raw = execFileSync('python3', ['-c', script, OPENCLAW_TASK_RUNS_DB, String(startMs), String(endMs)], {
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const rows = JSON.parse(raw) as RawTaskRunAttribution[]

    for (const row of rows) {
      const attributedAgent = row.agent_id?.trim()
      const sourceAgent = parseAgentFromSessionKey(row.child_session_key)
      const taskStartMs = Number(row.started_at)
      const taskEndMs = Number(row.ended_at)

      if (!attributedAgent || !sourceAgent || attributedAgent === sourceAgent) continue
      if (!Number.isFinite(taskStartMs) || !Number.isFinite(taskEndMs)) continue

      windows.push({
        sourceAgent,
        attributedAgent,
        startMs: Math.max(taskStartMs, startMs),
        endMs: Math.min(taskEndMs, endMs),
      })
    }
  } catch {
    // Task metadata is an enhancement. If sqlite/python is unavailable, raw agent session totals still work.
  }

  return windows
}

const readSessionUsage = async (
  agentId: string,
  sessionsDir: string,
  allowedDates: Set<string>,
  usageByAgent: Map<string, Map<string, TokenUsageEntry>>,
  attributionWindows: TokenUsageAttributionWindow[],
) => {
  let foundUsage = false
  let files: string[] = []

  try {
    files = await fs.readdir(sessionsDir)
  } catch {
    return false
  }

  await Promise.all(files
    .filter((file) => file.endsWith('.jsonl') && !file.endsWith('.trajectory.jsonl'))
    .map(async (file) => {
      const fullPath = path.join(sessionsDir, file)
      let body = ''

      try {
        body = await fs.readFile(fullPath, 'utf8')
      } catch {
        return
      }

      for (const line of body.split('\n')) {
        if (!line.includes('"usage"')) continue

        try {
          const record = JSON.parse(line)
          const message = record?.message
          const usage = message?.usage
          if (!usage) continue

          const rawTimestamp = message.timestamp ?? record.timestamp
          const timestamp = typeof rawTimestamp === 'number'
            ? new Date(rawTimestamp)
            : new Date(String(rawTimestamp))

          if (Number.isNaN(timestamp.getTime())) continue

          const timestampMs = timestamp.getTime()
          const date = formatDateInZone(timestamp)
          if (!allowedDates.has(date)) continue

          const creditedAgent = getAttributionAgent(agentId, timestampMs, attributionWindows)
          const entry = addUsageEntry(usageByAgent, creditedAgent, date)
          const input = Number(usage.input ?? usage.inputTokens ?? 0)
          const output = Number(usage.output ?? usage.outputTokens ?? 0)
          const cacheRead = Number(usage.cacheRead ?? usage.cache_read ?? 0)
          const cacheWrite = Number(usage.cacheWrite ?? usage.cache_write ?? 0)
          const totalTokens = Number(usage.totalTokens ?? usage.total ?? (input + output + cacheRead + cacheWrite))

          entry.input += Number.isFinite(input) ? input : 0
          entry.output += Number.isFinite(output) ? output : 0
          entry.cacheRead += Number.isFinite(cacheRead) ? cacheRead : 0
          entry.cacheWrite += Number.isFinite(cacheWrite) ? cacheWrite : 0
          entry.totalTokens += Number.isFinite(totalTokens) ? totalTokens : 0
          entry.turns += 1
          foundUsage = true
        } catch {
          // Ignore malformed historical log lines.
        }
      }
    }))

  return foundUsage
}

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



// GET /api/team/token-usage - Daily OpenClaw token usage grouped by agent
router.get('/token-usage', async (req: AuthRequest, res) => {
  try {
    const requestedDays = Number.parseInt(String(req.query.days ?? '7'), 10)
    const days = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 1), 60) : 7
    const dates = buildDateWindow(days)
    const allowedDates = new Set(dates)

    let agentDirs: string[] = []
    try {
      agentDirs = await fs.readdir(OPENCLAW_AGENTS_DIR)
    } catch (error) {
      res.json({
        success: true,
        data: {
          days,
          timezone: TOKEN_USAGE_TIMEZONE,
          dates,
          agents: [],
          series: dates.map((date) => ({ date, totalTokens: 0 })),
          totals: [],
          sourceAvailable: false,
          sourcePath: OPENCLAW_AGENTS_DIR,
        },
      })
      return
    }

    const agentUsage = new Map<string, Map<string, TokenUsageEntry>>()
    const windowStartMs = Date.now() - (days + 1) * 24 * 60 * 60 * 1000
    const windowEndMs = Date.now() + 24 * 60 * 60 * 1000
    const attributionWindows = loadTokenUsageAttributionWindows(windowStartMs, windowEndMs)

    for (const agentId of agentDirs) {
      agentUsage.set(agentId, new Map<string, TokenUsageEntry>())
    }
    for (const window of attributionWindows) {
      agentUsage.set(window.attributedAgent, agentUsage.get(window.attributedAgent) ?? new Map<string, TokenUsageEntry>())
    }

    await Promise.all(agentDirs.map(async (agentId) => {
      const sessionsDir = path.join(OPENCLAW_AGENTS_DIR, agentId, 'sessions')
      await readSessionUsage(agentId, sessionsDir, allowedDates, agentUsage, attributionWindows)
    }))

    const agents = [...agentUsage.keys()].sort()
    const series = dates.map((date) => {
      const row: Record<string, string | number> = { date, totalTokens: 0 }
      for (const agent of agents) {
        const total = agentUsage.get(agent)?.get(date)?.totalTokens ?? 0
        row[agent] = total
        row.totalTokens = Number(row.totalTokens) + total
      }
      return row
    })

    const totals = agents
      .map((agent) => {
        const entries = [...(agentUsage.get(agent)?.values() ?? [])]
        const totalTokens = entries.reduce((sum, entry) => sum + entry.totalTokens, 0)
        const turns = entries.reduce((sum, entry) => sum + entry.turns, 0)
        const input = entries.reduce((sum, entry) => sum + entry.input, 0)
        const output = entries.reduce((sum, entry) => sum + entry.output, 0)
        const cacheRead = entries.reduce((sum, entry) => sum + entry.cacheRead, 0)
        const cacheWrite = entries.reduce((sum, entry) => sum + entry.cacheWrite, 0)

        return {
          agent,
          totalTokens,
          input,
          output,
          cacheRead,
          cacheWrite,
          turns,
          averageTokensPerTurn: turns > 0 ? Math.round(totalTokens / turns) : 0,
          color: TOKEN_USAGE_AGENT_COLORS[agent] ?? '#94A3B8',
        }
      })
      .sort((a, b) => b.totalTokens - a.totalTokens)

    res.json({
      success: true,
      data: {
        days,
        timezone: TOKEN_USAGE_TIMEZONE,
        dates,
        agents,
        series,
        totals,
        sourceAvailable: true,
        sourcePath: OPENCLAW_AGENTS_DIR,
        attributionSourcePath: OPENCLAW_TASK_RUNS_DB,
      },
    })
  } catch (error) {
    console.error('Token usage analytics error:', error)
    res.status(500).json({ error: 'Failed to fetch token usage analytics' })
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
