import { FC, CSSProperties, ReactNode } from 'react'
import { useOfficeRealtime, type WorkspaceMember } from '../../hooks/useOffice'
import {
  Loader2, Users, Circle, Clock, MinusCircle,
  Wifi, WifiOff, Zap, Radio, Signal,
} from 'lucide-react'

// ─── Status configuration ────────────────────────────────────────────────────

interface StatusCfg {
  color: string
  dot: string
  label: string
  cardBorder: string
  cardShadow: string
  accentBar: string
  ring: string
  badge: string
  pulsing: boolean
}

const STATUS_CONFIG: Record<string, StatusCfg> = {
  ONLINE: {
    color:      'text-emerald-400',
    dot:        'bg-emerald-500',
    label:      'Online',
    cardBorder: 'border-emerald-500/30',
    cardShadow: 'shadow-lg shadow-emerald-500/10',
    accentBar:  'bg-emerald-500',
    ring:       'ring-2 ring-emerald-500/40',
    badge:      'bg-emerald-500/10 text-emerald-400',
    pulsing:    true,
  },
  BUSY: {
    color:      'text-rose-400',
    dot:        'bg-rose-500',
    label:      'Busy',
    cardBorder: 'border-rose-500/30',
    cardShadow: 'shadow-lg shadow-rose-500/10',
    accentBar:  'bg-rose-500',
    ring:       'ring-2 ring-rose-500/40',
    badge:      'bg-rose-500/10 text-rose-400',
    pulsing:    false,
  },
  AWAY: {
    color:      'text-amber-400',
    dot:        'bg-amber-500',
    label:      'Away',
    cardBorder: 'border-mission-border',
    cardShadow: '',
    accentBar:  'bg-amber-500',
    ring:       '',
    badge:      'bg-amber-500/10 text-amber-400',
    pulsing:    false,
  },
  OFFLINE: {
    color:      'text-slate-500',
    dot:        'bg-slate-600',
    label:      'Offline',
    cardBorder: 'border-mission-border/60',
    cardShadow: '',
    accentBar:  'bg-slate-600',
    ring:       '',
    badge:      'bg-slate-500/10 text-slate-500',
    pulsing:    false,
  },
}

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: 'text-red-400',
  HIGH:   'text-orange-400',
  MEDIUM: 'text-yellow-400',
  LOW:    'text-green-400',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const title   = (meta?.title ?? meta?.taskTitle ?? '') as string
  const project = (meta?.projectName ?? '') as string
  switch (type) {
    case 'TASK_CREATED':    return `created task${title ? ` "${title}"` : ''}${project ? ` in ${project}` : ''}`
    case 'TASK_UPDATED':    return `updated task${title ? ` "${title}"` : ''}`
    case 'TASK_COMPLETED':  return `completed task${title ? ` "${title}"` : ''}${project ? ` in ${project}` : ''}`
    case 'PROJECT_CREATED': return `created project${title ? ` "${title}"` : ''}`
    case 'PROJECT_UPDATED': return `updated project${title ? ` "${title}"` : ''}`
    case 'MEMORY_CREATED':  return `added a memory${title ? ` "${title}"` : ''}`
    case 'MESSAGE_SENT':    return `sent a message${project ? ` in ${project}` : ''}`
    default:                return type.toLowerCase().replace(/_/g, ' ')
  }
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

const Avatar: FC<{ member: WorkspaceMember; size?: 'sm' | 'lg' }> = ({ member, size = 'lg' }) => {
  const isLg = size === 'lg'
  const dim    = isLg ? 'w-14 h-14 text-lg' : 'w-9 h-9 text-sm'
  const dotDim = isLg ? 'w-4 h-4 border-2'  : 'w-3 h-3 border-2'
  const cfg    = STATUS_CONFIG[member.status] ?? STATUS_CONFIG.OFFLINE

  return (
    <div className="relative flex-shrink-0">
      {/* Animated ring for active members */}
      {cfg.ring && (
        <div
          className={`absolute inset-0 rounded-full ${cfg.ring} ${cfg.pulsing ? 'animate-glow-pulse' : ''}`}
        />
      )}

      {member.avatar ? (
        <img
          src={member.avatar}
          alt={member.name}
          className={`${dim} rounded-full object-cover border-2 border-mission-border relative z-10`}
        />
      ) : (
        <div
          className={`${dim} rounded-full bg-primary-600/20 flex items-center justify-center border-2 border-mission-border relative z-10`}
        >
          <span className="text-primary-400 font-bold">{getInitials(member.name)}</span>
        </div>
      )}

      <div
        className={`absolute -bottom-0.5 -right-0.5 ${dotDim} rounded-full border-mission-bg ${cfg.dot} z-10`}
      />
    </div>
  )
}

// ─── Active member card ───────────────────────────────────────────────────────

const ActiveMemberCard: FC<{ member: WorkspaceMember; index: number }> = ({ member, index }) => {
  const cfg   = STATUS_CONFIG[member.status] ?? STATUS_CONFIG.OFFLINE
  const done  = member.workload.byStatus.DONE       || 0
  const inPrg = member.workload.byStatus.IN_PROGRESS || 0
  const todo  = member.workload.byStatus.TODO        || 0
  const total = member.workload.total

  const pctDone = total > 0 ? (done / total) * 100 : 0
  const pctInPrg = total > 0 ? (inPrg / total) * 100 : 0
  const pctTodo  = total > 0 ? (todo / total) * 100 : 0

  return (
    <div
      className={`relative bg-mission-card border ${cfg.cardBorder} ${cfg.cardShadow}
        rounded-xl p-5 overflow-hidden
        hover:brightness-110 transition-all duration-300 animate-slide-up`}
      style={{ animationDelay: `${index * 70}ms` } as CSSProperties}
    >
      {/* Coloured top accent stripe */}
      <div className={`absolute top-0 inset-x-0 h-0.5 ${cfg.accentBar} opacity-70`} />

      {/* Header row */}
      <div className="flex items-start gap-4 mb-4">
        <Avatar member={member} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-mission-text truncate">{member.name}</h3>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${cfg.pulsing ? 'animate-pulse' : ''}`} />
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-mission-muted capitalize mt-0.5">{member.role.toLowerCase()}</p>
        </div>
        {member.workload.overdue > 0 && (
          <span className="text-xs px-2 py-1 rounded-full bg-rose-500/10 text-rose-400 flex-shrink-0 border border-rose-500/20">
            {member.workload.overdue} overdue
          </span>
        )}
      </div>

      {/* Active tasks */}
      <div className="mb-4">
        <p className="text-xs text-mission-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-primary-400" />
          Active workspace
        </p>
        {member.activeTasks.length > 0 ? (
          <ul className="space-y-1.5">
            {member.activeTasks.map((task) => (
              <li key={task.id} className="flex items-start gap-2 text-sm group">
                <span
                  className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    PRIORITY_COLOR[task.priority]
                      ? task.priority === 'URGENT' ? 'bg-red-400'
                      : task.priority === 'HIGH'   ? 'bg-orange-400'
                      : task.priority === 'MEDIUM' ? 'bg-yellow-400'
                      : 'bg-green-400'
                      : 'bg-mission-muted'
                  }`}
                />
                <span className="text-mission-text/90 line-clamp-1 flex-1 group-hover:text-mission-text transition-colors">
                  {task.title}
                </span>
                <span className="text-xs text-mission-muted flex-shrink-0 truncate max-w-[90px]">
                  {task.project.name}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-mission-muted/70 italic">No tasks in progress</p>
        )}
      </div>

      {/* Workload bar */}
      <div className="border-t border-mission-border/60 pt-3">
        <div className="flex items-center justify-between text-xs text-mission-muted mb-1.5">
          <span>Workload</span>
          <span className="tabular-nums">{done}/{total} done</span>
        </div>
        <div className="flex h-1.5 rounded-full overflow-hidden bg-mission-border/50 gap-px">
          {total > 0 && (
            <>
              <div
                className="bg-emerald-500 rounded-l-full transition-all duration-700"
                style={{ width: `${pctDone}%` }}
              />
              <div
                className="bg-blue-500 transition-all duration-700"
                style={{ width: `${pctInPrg}%` }}
              />
              <div
                className="bg-amber-500/70 rounded-r-full transition-all duration-700"
                style={{ width: `${pctTodo}%` }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Compact (away/offline) card ──────────────────────────────────────────────

const CompactMemberCard: FC<{ member: WorkspaceMember; index: number }> = ({ member, index }) => {
  const cfg   = STATUS_CONFIG[member.status] ?? STATUS_CONFIG.OFFLINE
  const total = member.workload.total

  return (
    <div
      className="bg-mission-bg/60 border border-mission-border/60 rounded-xl p-3.5
        flex items-center gap-3 hover:border-mission-border transition-all duration-200 animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` } as CSSProperties}
    >
      <Avatar member={member} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-mission-text truncate">{member.name}</p>
        <p className="text-xs text-mission-muted capitalize">{member.role.toLowerCase()}</p>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
        <span className="text-xs text-mission-muted tabular-nums">{total} tasks</span>
      </div>
    </div>
  )
}

// ─── Connection badge ─────────────────────────────────────────────────────────

const ConnectionBadge: FC<{ connected: boolean }> = ({ connected }) =>
  connected ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
      <Radio className="w-3 h-3" />
      Live
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
      <Signal className="w-3 h-3" />
      Polling
    </span>
  )

// ─── Main component ───────────────────────────────────────────────────────────

export const Office: FC = () => {
  const { workspace, feed, isSocketConnected } = useOfficeRealtime(15)
  const { data, isLoading, error } = workspace
  const { data: feedData } = feed

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader isSocketConnected={isSocketConnected} />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader isSocketConnected={isSocketConnected} />
        <div className="bg-mission-card border border-mission-border rounded-xl p-8 text-center">
          <p className="text-rose-400 font-medium">Failed to load workspace data</p>
          <p className="text-sm text-mission-muted mt-2">{error.message}</p>
        </div>
      </div>
    )
  }

  const members        = data?.members ?? []
  const activeMembers  = members.filter((m) => m.status === 'ONLINE' || m.status === 'BUSY')
  const passiveMembers = members.filter((m) => m.status === 'AWAY'   || m.status === 'OFFLINE')

  const stats = {
    total:   data?.totalMembers ?? 0,
    online:  data?.onlineCount  ?? 0,
    busy:    data?.busyCount    ?? 0,
    away:    data?.awayCount    ?? 0,
    offline: (data?.totalMembers ?? 0) - (data?.onlineCount ?? 0) - (data?.busyCount ?? 0) - (data?.awayCount ?? 0),
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-mission-text">Office</h2>
          <p className="text-mission-muted text-sm">Live team presence and active workspaces</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ConnectionBadge connected={isSocketConnected} />

          {/* Stats strip */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <StatPill icon={<Users className="w-3.5 h-3.5" />} label={`${stats.total} members`} className="text-mission-muted" />
            <StatPill icon={<Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500" />} label={`${stats.online} online`} className="text-emerald-400" />
            <StatPill icon={<Wifi className="w-3.5 h-3.5" />} label={`${stats.busy} busy`} className="text-rose-400" />
            <StatPill icon={<Clock className="w-3.5 h-3.5" />} label={`${stats.away} away`} className="text-amber-400" />
            <StatPill icon={<WifiOff className="w-3.5 h-3.5" />} label={`${stats.offline} offline`} className="text-slate-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
        {/* ── Left: member zones ───────────────────────────────────── */}
        <div className="space-y-6">
          {/* Active now */}
          <section>
            <h3 className="text-xs font-semibold text-mission-text uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Now
              <span className="text-mission-muted font-normal normal-case tracking-normal ml-1">
                ({activeMembers.length})
              </span>
            </h3>
            {activeMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeMembers.map((m, i) => (
                  <ActiveMemberCard key={m.id} member={m} index={i} />
                ))}
              </div>
            ) : (
              <div className="bg-mission-card border border-mission-border rounded-xl p-10 text-center animate-scale-in">
                <MinusCircle className="w-8 h-8 text-mission-muted/50 mx-auto mb-3" />
                <p className="text-sm text-mission-muted">No agents online right now</p>
              </div>
            )}
          </section>

          {/* Away / Offline */}
          {passiveMembers.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-mission-muted uppercase tracking-widest mb-3">
                Away / Offline ({passiveMembers.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {passiveMembers.map((m, i) => (
                  <CompactMemberCard key={m.id} member={m} index={i} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Right: activity feed ─────────────────────────────────── */}
        <aside className="bg-mission-card border border-mission-border rounded-xl p-4 flex flex-col h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-mission-text uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-primary-400" />
              Activity
            </h3>
            {isSocketConnected && (
              <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </div>

          {!feedData || feedData.length === 0 ? (
            <p className="text-xs text-mission-muted text-center py-10">No recent activity</p>
          ) : (
            <ul className="space-y-3 overflow-y-auto max-h-[540px] pr-1">
              {feedData.map((item, i) => (
                <li
                  key={item.id}
                  className="flex items-start gap-2.5 animate-slide-in-left"
                  style={{ animationDelay: `${i * 40}ms` } as CSSProperties}
                >
                  <div className="w-7 h-7 rounded-full bg-primary-600/20 flex items-center justify-center text-[10px] font-bold text-primary-400 flex-shrink-0 mt-0.5 border border-primary-500/20">
                    {item.user ? getInitials(item.user.name) : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-mission-text/90 leading-snug">
                      <span className="font-semibold text-mission-text">
                        {item.user?.name ?? 'System'}
                      </span>{' '}
                      {formatActivityLabel(item.type, item.metadata)}
                    </p>
                    <p className="text-[10px] text-mission-muted mt-0.5 tabular-nums">
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

// ─── Small helpers ────────────────────────────────────────────────────────────

const StatPill: FC<{ icon: ReactNode; label: string; className?: string }> = ({
  icon, label, className = '',
}) => (
  <span className={`flex items-center gap-1.5 ${className}`}>
    {icon}
    {label}
  </span>
)

const PageHeader: FC<{ isSocketConnected: boolean }> = ({ isSocketConnected }) => (
  <div className="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h2 className="text-2xl font-bold text-mission-text">Office</h2>
      <p className="text-mission-muted text-sm">Live team presence and active workspaces</p>
    </div>
    <ConnectionBadge connected={isSocketConnected} />
  </div>
)
