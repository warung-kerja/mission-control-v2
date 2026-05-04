import { FC, useState } from 'react'
import { TrendingUp, Users, CheckCircle, Loader2, Calendar, AlertTriangle, FolderOpen, Database } from 'lucide-react'
import {
  useTeamAnalytics,
  useTeamProductivity,
  useTeamMembersWithWorkload,
  useProjectBreakdown,
  type ProjectBreakdown,
} from '../../hooks/useAnalytics'
import { useCanonicalProjects, type CanonicalProject } from '../../hooks'

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  DONE:        'bg-emerald-500',
  IN_PROGRESS: 'bg-blue-500',
  TODO:        'bg-slate-400',
  BACKLOG:     'bg-purple-500',
  CANCELLED:   'bg-red-500',
}

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: 'text-red-400',
  HIGH:   'text-orange-400',
  MEDIUM: 'text-yellow-400',
  LOW:    'text-green-400',
}

const PROJECT_STATUS_BADGE: Record<string, string> = {
  ACTIVE:    'bg-emerald-500/10 text-emerald-400',
  PAUSED:    'bg-amber-500/10 text-amber-400',
  COMPLETED: 'bg-blue-500/10 text-blue-400',
  ARCHIVED:  'bg-slate-500/10 text-slate-400',
}

const getStatusLabel = (s: string) => s.toLowerCase().replace('_', ' ')

const CANONICAL_STATUS_COLOR: Record<string, string> = {
  active:      'bg-emerald-500/10 text-emerald-400',
  'in-progress':'bg-blue-500/10 text-blue-400',
  paused:      'bg-amber-500/10 text-amber-400',
  completed:   'bg-slate-500/10 text-slate-400',
  archived:    'bg-slate-500/10 text-slate-500',
}

const CANONICAL_STATUS_BAR: Record<string, string> = {
  active:      'bg-emerald-500',
  'in-progress':'bg-blue-500',
  paused:      'bg-amber-500',
  completed:   'bg-slate-400',
  archived:    'bg-slate-600',
}

const CANONICAL_PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400',
  high:     'bg-orange-500/10 text-orange-400',
  medium:   'bg-yellow-500/10 text-yellow-400',
  low:      'bg-green-500/10 text-green-400',
}

const CANONICAL_PRIORITY_BAR: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-green-500',
}

const formatDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return formatDateShort(iso)
}

// ─── Canonical Project Registry Health ───────────────────────────────────────

const CanonicalProjectHealth: FC<{ projects: CanonicalProject[] }> = ({ projects }) => {
  const nonArchived = projects.filter(p => p.status.toLowerCase() !== 'archived')
  const total = projects.length

  // Status distribution
  const statusCounts = projects.reduce<Record<string, number>>((acc, p) => {
    const key = p.status.toLowerCase()
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  // Priority distribution (non-archived only)
  const priorityCounts = nonArchived.reduce<Record<string, number>>((acc, p) => {
    const key = p.priority.toLowerCase()
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  // Top 5 recently updated (non-archived)
  const recent = [...nonArchived]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  const statuses = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])
  const priorities = Object.entries(priorityCounts).sort((a, b) => b[1] - a[1])

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-primary-400" />
        <h3 className="text-sm font-semibold text-mission-text uppercase tracking-wide">
          Project Registry Health
        </h3>
        <span className="text-xs text-mission-muted font-normal normal-case tracking-normal">
          — {total} projects · canonical source
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status distribution */}
        <div className="bg-mission-card border border-mission-border rounded-xl p-5">
          <h4 className="text-xs font-semibold text-mission-muted uppercase tracking-wide mb-4">By Status</h4>
          <div className="space-y-3">
            {statuses.map(([status, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              const barCls = CANONICAL_STATUS_BAR[status] ?? 'bg-slate-500'
              const badgeCls = CANONICAL_STATUS_COLOR[status] ?? 'bg-slate-500/10 text-slate-400'
              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded-full capitalize ${badgeCls}`}>{status}</span>
                    <span className="text-mission-muted tabular-nums">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-mission-border rounded-full overflow-hidden">
                    <div className={`h-full ${barCls} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Priority distribution */}
        <div className="bg-mission-card border border-mission-border rounded-xl p-5">
          <h4 className="text-xs font-semibold text-mission-muted uppercase tracking-wide mb-4">By Priority (active)</h4>
          <div className="space-y-3">
            {priorities.length > 0 ? priorities.map(([priority, count]) => {
              const pct = nonArchived.length > 0 ? Math.round((count / nonArchived.length) * 100) : 0
              const barCls = CANONICAL_PRIORITY_BAR[priority] ?? 'bg-slate-500'
              const badgeCls = CANONICAL_PRIORITY_COLOR[priority] ?? 'bg-slate-500/10 text-slate-400'
              return (
                <div key={priority} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded-full capitalize ${badgeCls}`}>{priority}</span>
                    <span className="text-mission-muted tabular-nums">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-mission-border rounded-full overflow-hidden">
                    <div className={`h-full ${barCls} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            }) : (
              <p className="text-xs text-mission-muted text-center py-4">No priority data</p>
            )}
          </div>
        </div>

        {/* Recently updated */}
        <div className="bg-mission-card border border-mission-border rounded-xl p-5">
          <h4 className="text-xs font-semibold text-mission-muted uppercase tracking-wide mb-4">Recently Updated</h4>
          <div className="space-y-3">
            {recent.map(p => {
              const badgeCls = CANONICAL_STATUS_COLOR[p.status.toLowerCase()] ?? 'bg-slate-500/10 text-slate-400'
              return (
                <div key={p.id} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-mission-text truncate">{p.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${badgeCls}`}>{p.status.toLowerCase()}</span>
                      <span className="text-[10px] text-mission-muted">{p.currentPhase || '—'}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-mission-muted flex-shrink-0 tabular-nums mt-1">{timeAgo(p.updatedAt)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Project Breakdown Card ──────────────────────────────────────────────────

const ProjectCard: FC<{ project: ProjectBreakdown }> = ({ project }) => {
  const { total, completed, completionRate, byStatus, overdue, memberCount, status } = project
  const inProgress = byStatus.IN_PROGRESS || 0
  const todo       = byStatus.TODO || 0
  const backlog    = byStatus.BACKLOG || 0

  const badgeCls = PROJECT_STATUS_BADGE[status] ?? PROJECT_STATUS_BADGE.ACTIVE

  return (
    <div className="bg-mission-card border border-mission-border rounded-xl p-5 hover:border-primary-500/40 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-mission-text truncate">{project.name}</h4>
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full capitalize ${badgeCls}`}>
            {getStatusLabel(status)}
          </span>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-mission-text">{completionRate}%</p>
          <p className="text-xs text-mission-muted">done</p>
        </div>
      </div>

      {/* Stacked progress bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-mission-border mb-3 gap-0.5">
        {total > 0 && (
          <>
            <div className="bg-emerald-500 rounded-l-full" style={{ width: `${(completed / total) * 100}%` }} />
            <div className="bg-blue-500"                   style={{ width: `${(inProgress / total) * 100}%` }} />
            <div className="bg-slate-400"                  style={{ width: `${(todo / total) * 100}%` }} />
            <div className="bg-purple-500 rounded-r-full"  style={{ width: `${(backlog / total) * 100}%` }} />
          </>
        )}
      </div>

      {/* Counts row */}
      <div className="flex items-center justify-between text-xs text-mission-muted">
        <div className="flex items-center gap-3">
          <span><span className="text-emerald-400 font-medium">{completed}</span> done</span>
          <span><span className="text-blue-400 font-medium">{inProgress}</span> active</span>
          <span><span className="text-mission-text font-medium">{todo + backlog}</span> queued</span>
        </div>
        <div className="flex items-center gap-2">
          {overdue > 0 && (
            <span className="flex items-center gap-1 text-rose-400">
              <AlertTriangle className="w-3 h-3" /> {overdue}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {memberCount}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export const Analytics: FC = () => {
  const [period, setPeriod]       = useState('7')
  const [projectId, setProjectId] = useState('')

  const { data: projects, isLoading: projectsLoading } = useProjectBreakdown()
  const { data: analytics, isLoading: analyticsLoading } = useTeamAnalytics(projectId || undefined)
  const { data: productivity, isLoading: productivityLoading } = useTeamProductivity(parseInt(period))
  const { data: members, isLoading: membersLoading } = useTeamMembersWithWorkload()
  const { data: canonicalProjectsResult, isLoading: canonicalLoading } = useCanonicalProjects()
  const canonicalProjects = canonicalProjectsResult?.data ?? []

  const stats = analytics?.tasks ?? { total: 0, completed: 0, completionRate: 0, byStatus: {}, byPriority: {} }

  const metrics = [
    {
      label: 'Total Tasks',
      value: stats.total.toString(),
      change: `${stats.completionRate}% completion`,
      icon: CheckCircle,
    },
    {
      label: 'Completed',
      value: stats.completed.toString(),
      change: `${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%`,
      icon: TrendingUp,
    },
    {
      label: 'Active Members',
      value: members?.length?.toString() ?? '0',
      change: 'team members',
      icon: Users,
    },
    {
      label: 'Period Output',
      value: productivity?.totalCompleted?.toString() ?? '0',
      change: `${period} days`,
      icon: Calendar,
    },
  ]

  const getDaysArray = () => {
    const days: string[] = []
    const today = new Date()
    for (let i = parseInt(period) - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      days.push(d.toISOString().split('T')[0])
    }
    return days
  }

  const productivityData = getDaysArray().map((day) => ({
    date: day,
    count: productivity?.byDate?.[day] ?? 0,
    label: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
  }))
  const maxCount = Math.max(...productivityData.map((d) => d.count), 1)

  const selectedProject = projectId
    ? projects?.find((p) => p.id === projectId)
    : null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-mission-text">Signals</h2>
          <p className="text-mission-muted">
            {selectedProject ? `Showing: ${selectedProject.name}` : 'All projects · team performance'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Project filter */}
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="px-3 py-1.5 bg-mission-card border border-mission-border rounded-lg text-sm text-mission-text focus:outline-none focus:border-primary-500"
          >
            <option value="">All projects</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {/* Period filter */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 bg-mission-card border border-mission-border rounded-lg text-sm text-mission-text focus:outline-none focus:border-primary-500"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* ── Canonical Project Registry Health ──────────────────── */}
      {canonicalLoading ? (
        <div className="flex items-center gap-2 text-sm text-mission-muted py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading project registry...
        </div>
      ) : canonicalProjects.length > 0 ? (
        <CanonicalProjectHealth projects={canonicalProjects} />
      ) : null}

      {/* ── DB Task Metrics ────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-2">
        <h3 className="text-sm font-semibold text-mission-text uppercase tracking-wide">
          Task Metrics
        </h3>
        <span className="text-xs text-mission-muted font-normal normal-case tracking-normal">
          — runtime DB
        </span>
      </div>

      {/* ── Metric cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, change, icon: Icon }) => (
          <div key={label} className="bg-mission-card border border-mission-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary-600/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary-400" />
              </div>
              <span className="text-sm font-medium text-emerald-400">{change}</span>
            </div>
            <p className="text-2xl font-bold text-mission-text">
              {analyticsLoading && label !== 'Period Output' ? (
                <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
              ) : value}
            </p>
            <p className="text-sm text-mission-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Status + Priority ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-mission-card border border-mission-border rounded-xl p-5">
          <h3 className="font-semibold text-mission-text mb-4">Task Status Distribution</h3>
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(stats.byStatus).map(([status, count]) => {
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-mission-text capitalize">{getStatusLabel(status)}</span>
                      <span className="text-mission-muted">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-mission-border rounded-full overflow-hidden">
                      <div
                        className={`h-full ${STATUS_COLOR[status] ?? 'bg-slate-500'} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {Object.keys(stats.byStatus).length === 0 && (
                <p className="text-sm text-mission-muted text-center py-8">No task data</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-mission-card border border-mission-border rounded-xl p-5">
          <h3 className="font-semibold text-mission-text mb-4">Priority Distribution</h3>
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(stats.byPriority).map(([priority, count]) => {
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={priority} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`capitalize ${PRIORITY_COLOR[priority] ?? 'text-mission-muted'}`}>
                        {priority.toLowerCase()}
                      </span>
                      <span className="text-mission-muted">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-mission-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {Object.keys(stats.byPriority).length === 0 && (
                <p className="text-sm text-mission-muted text-center py-8">No priority data</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Productivity + Top Performers ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-mission-card border border-mission-border rounded-xl p-5">
          <h3 className="font-semibold text-mission-text mb-4">Tasks Completed ({period} days)</h3>
          {productivityLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
            </div>
          ) : (
            <>
              <div className="h-48 flex items-end justify-around gap-1">
                {productivityData.map((data, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary-600/50 rounded-t hover:bg-primary-500 transition-colors relative group"
                      style={{ height: `${(data.count / maxCount) * 100}%`, minHeight: data.count > 0 ? '4px' : '0' }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-mission-bg border border-mission-border px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {data.count} tasks
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-around mt-2 text-xs text-mission-muted">
                {productivityData.map((data, i) => (
                  <span key={i} className="flex-1 text-center">{data.label}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-mission-card border border-mission-border rounded-xl p-5">
          <h3 className="font-semibold text-mission-text mb-4">Top Performers</h3>
          {membersLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
            </div>
          ) : (
            <div className="space-y-3">
              {members?.slice(0, 5).map((member) => {
                const done  = member.workload?.byStatus?.DONE ?? 0
                const total = member.workload?.total ?? 0
                const pct   = total > 0 ? Math.round((done / total) * 100) : 0
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center text-xs font-bold text-primary-400 flex-shrink-0">
                      {member.name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-mission-text truncate">{member.name}</span>
                        <span className="text-xs text-mission-muted flex-shrink-0 ml-2">{done}/{total}</span>
                      </div>
                      <div className="h-1.5 bg-mission-border rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
              {(!members || members.length === 0) && (
                <p className="text-sm text-mission-muted text-center py-8">No team data</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Project Breakdown ─────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-mission-text uppercase tracking-wide mb-3 flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary-400" />
          Project Breakdown
          {projects && (
            <span className="text-mission-muted font-normal normal-case tracking-normal">
              ({projects.length})
            </span>
          )}
        </h3>
        {projectsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="bg-mission-card border border-mission-border rounded-xl p-8 text-center">
            <p className="text-sm text-mission-muted">No projects found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
