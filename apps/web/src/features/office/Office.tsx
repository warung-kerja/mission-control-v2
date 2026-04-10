import { FC } from 'react'
import { useWorkspace, useActivityFeed, type WorkspaceMember } from '../../hooks/useOffice'
import { Loader2, Users, Circle, Clock, MinusCircle, Wifi, WifiOff, Zap } from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  ONLINE: { color: 'text-emerald-400', dot: 'bg-emerald-500', label: 'Online' },
  BUSY:   { color: 'text-rose-400',    dot: 'bg-rose-500',    label: 'Busy'   },
  AWAY:   { color: 'text-amber-400',   dot: 'bg-amber-500',   label: 'Away'   },
  OFFLINE:{ color: 'text-slate-500',   dot: 'bg-slate-500',   label: 'Offline'},
}

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: 'text-red-400',
  HIGH:   'text-orange-400',
  MEDIUM: 'text-yellow-400',
  LOW:    'text-green-400',
}

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

const formatActivityTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const formatActivityLabel = (type: string, meta: Record<string, unknown> | null): string => {
  const title = (meta?.title ?? meta?.taskTitle ?? '') as string
  const project = (meta?.projectName ?? '') as string
  switch (type) {
    case 'TASK_CREATED':    return `Created task${title ? ` "${title}"` : ''}${project ? ` in ${project}` : ''}`
    case 'TASK_UPDATED':    return `Updated task${title ? ` "${title}"` : ''}`
    case 'TASK_COMPLETED':  return `Completed task${title ? ` "${title}"` : ''}${project ? ` in ${project}` : ''}`
    case 'PROJECT_CREATED': return `Created project${title ? ` "${title}"` : ''}`
    case 'PROJECT_UPDATED': return `Updated project${title ? ` "${title}"` : ''}`
    case 'MEMORY_CREATED':  return `Added a memory${title ? ` "${title}"` : ''}`
    case 'MESSAGE_SENT':    return `Sent a message${project ? ` in ${project}` : ''}`
    default:                return type.toLowerCase().replace(/_/g, ' ')
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const Avatar: FC<{ member: WorkspaceMember; size?: 'sm' | 'lg' }> = ({ member, size = 'lg' }) => {
  const dim = size === 'lg' ? 'w-14 h-14 text-lg' : 'w-9 h-9 text-sm'
  const dotDim = size === 'lg' ? 'w-4 h-4 border-2' : 'w-3 h-3 border-2'
  const cfg = STATUS_CONFIG[member.status] ?? STATUS_CONFIG.OFFLINE

  return (
    <div className="relative flex-shrink-0">
      {member.avatar ? (
        <img src={member.avatar} alt={member.name}
          className={`${dim} rounded-full object-cover border-2 border-mission-border`} />
      ) : (
        <div className={`${dim} rounded-full bg-primary-600/20 flex items-center justify-center border-2 border-mission-border`}>
          <span className="text-primary-400 font-bold">{getInitials(member.name)}</span>
        </div>
      )}
      <div className={`absolute -bottom-0.5 -right-0.5 ${dotDim} rounded-full border-mission-bg ${cfg.dot}`} />
    </div>
  )
}

/** Large card for ONLINE / BUSY members showing their active tasks */
const ActiveMemberCard: FC<{ member: WorkspaceMember }> = ({ member }) => {
  const cfg = STATUS_CONFIG[member.status] ?? STATUS_CONFIG.OFFLINE
  const done = member.workload.byStatus.DONE || 0
  const total = member.workload.total

  return (
    <div className="bg-mission-card border border-mission-border rounded-xl p-5 hover:border-primary-500/40 transition-all">
      {/* Header row */}
      <div className="flex items-start gap-4 mb-4">
        <Avatar member={member} size="lg" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-mission-text truncate">{member.name}</h3>
          <p className="text-xs text-mission-muted capitalize mb-1">{member.role.toLowerCase()}</p>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>
        {member.workload.overdue > 0 && (
          <span className="text-xs px-2 py-1 rounded-full bg-rose-500/10 text-rose-400 flex-shrink-0">
            {member.workload.overdue} overdue
          </span>
        )}
      </div>

      {/* Active tasks */}
      <div className="mb-4">
        <p className="text-xs text-mission-muted uppercase tracking-wide mb-2 flex items-center gap-1">
          <Zap className="w-3 h-3" /> Active workspace
        </p>
        {member.activeTasks.length > 0 ? (
          <ul className="space-y-1.5">
            {member.activeTasks.map((task) => (
              <li key={task.id} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 text-xs font-bold flex-shrink-0 ${PRIORITY_COLOR[task.priority] ?? 'text-mission-muted'}`}>
                  ●
                </span>
                <span className="text-mission-text line-clamp-1 flex-1">{task.title}</span>
                <span className="text-xs text-mission-muted flex-shrink-0 truncate max-w-[90px]">
                  {task.project.name}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-mission-muted italic">No tasks in progress</p>
        )}
      </div>

      {/* Workload bar */}
      <div className="border-t border-mission-border pt-3">
        <div className="flex items-center justify-between text-xs text-mission-muted mb-1.5">
          <span>Workload</span>
          <span>{done}/{total} done</span>
        </div>
        <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-mission-border">
          {total > 0 && (
            <>
              <div className="bg-emerald-500 rounded-full" style={{ width: `${((member.workload.byStatus.DONE || 0) / total) * 100}%` }} />
              <div className="bg-blue-500 rounded-full"    style={{ width: `${((member.workload.byStatus.IN_PROGRESS || 0) / total) * 100}%` }} />
              <div className="bg-amber-500 rounded-full"   style={{ width: `${((member.workload.byStatus.TODO || 0) / total) * 100}%` }} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Compact card for AWAY / OFFLINE members */
const CompactMemberCard: FC<{ member: WorkspaceMember }> = ({ member }) => {
  const cfg = STATUS_CONFIG[member.status] ?? STATUS_CONFIG.OFFLINE
  const total = member.workload.total

  return (
    <div className="bg-mission-bg border border-mission-border rounded-xl p-4 flex items-center gap-3 hover:border-mission-border/70 transition-all">
      <Avatar member={member} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-mission-text truncate">{member.name}</p>
        <p className="text-xs text-mission-muted capitalize">{member.role.toLowerCase()}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
        <span className="text-xs text-mission-muted">{total} tasks</span>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export const Office: FC = () => {
  const { data: workspace, isLoading, error } = useWorkspace()
  const { data: feed } = useActivityFeed(15)

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-mission-text">Office</h2>
          <p className="text-mission-muted">Virtual office visualization</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-mission-text">Office</h2>
          <p className="text-mission-muted">Virtual office visualization</p>
        </div>
        <div className="bg-mission-card border border-mission-border rounded-xl p-8 text-center">
          <p className="text-rose-400">Failed to load workspace data</p>
          <p className="text-sm text-mission-muted mt-2">{error.message}</p>
        </div>
      </div>
    )
  }

  const members = workspace?.members ?? []
  const activeMembers  = members.filter((m) => m.status === 'ONLINE' || m.status === 'BUSY')
  const passiveMembers = members.filter((m) => m.status === 'AWAY'   || m.status === 'OFFLINE')

  const stats = {
    total:   workspace?.totalMembers ?? 0,
    online:  workspace?.onlineCount  ?? 0,
    busy:    workspace?.busyCount    ?? 0,
    away:    workspace?.awayCount    ?? 0,
    offline: (workspace?.totalMembers ?? 0) - (workspace?.onlineCount ?? 0) - (workspace?.busyCount ?? 0) - (workspace?.awayCount ?? 0),
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-mission-text">Office</h2>
          <p className="text-mission-muted">Live team presence and active workspaces</p>
        </div>
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="flex items-center gap-1.5 text-mission-muted">
            <Users className="w-4 h-4" /> {stats.total} members
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Circle className="w-3 h-3 fill-emerald-500 text-emerald-500" /> {stats.online} online
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <Wifi className="w-3 h-3" /> {stats.busy} busy
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <Clock className="w-3 h-3" /> {stats.away} away
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <WifiOff className="w-3 h-3" /> {stats.offline} offline
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
        {/* ── Left: member zones ───────────────────────────────────── */}
        <div className="space-y-6">
          {/* Active now */}
          <section>
            <h3 className="text-sm font-semibold text-mission-text uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Now
              <span className="text-mission-muted font-normal normal-case tracking-normal">
                ({activeMembers.length})
              </span>
            </h3>
            {activeMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeMembers.map((m) => (
                  <ActiveMemberCard key={m.id} member={m} />
                ))}
              </div>
            ) : (
              <div className="bg-mission-card border border-mission-border rounded-xl p-8 text-center">
                <MinusCircle className="w-8 h-8 text-mission-muted mx-auto mb-2" />
                <p className="text-sm text-mission-muted">No agents online right now</p>
              </div>
            )}
          </section>

          {/* Away / Offline */}
          {passiveMembers.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-mission-muted uppercase tracking-wide mb-3">
                Away / Offline ({passiveMembers.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {passiveMembers.map((m) => (
                  <CompactMemberCard key={m.id} member={m} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Right: activity feed ─────────────────────────────────── */}
        <aside className="bg-mission-card border border-mission-border rounded-xl p-4 flex flex-col h-fit">
          <h3 className="text-sm font-semibold text-mission-text mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary-400" />
            Recent Activity
          </h3>
          {!feed || feed.length === 0 ? (
            <p className="text-xs text-mission-muted text-center py-8">No recent activity</p>
          ) : (
            <ul className="space-y-3 overflow-y-auto max-h-[520px] pr-1">
              {feed.map((item) => (
                <li key={item.id} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary-600/20 flex items-center justify-center text-xs font-bold text-primary-400 flex-shrink-0 mt-0.5">
                    {item.user ? getInitials(item.user.name) : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-mission-text leading-snug">
                      <span className="font-medium">{item.user?.name ?? 'System'}</span>{' '}
                      {formatActivityLabel(item.type, item.metadata)}
                    </p>
                    <p className="text-xs text-mission-muted mt-0.5">
                      {formatActivityTime(item.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}
