import { FC, ReactNode, useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  Bot,
  Clock3,
  GitBranch,
  Loader2,
  Radio,
  Signal,
  UserRound,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'
import { useOfficeRealtime, type WorkspaceMember } from '../../hooks/useOffice'
import { useCanonicalTeam, type CanonicalTeamMember } from '../../hooks/useCanonical'

// ── helpers ──────────────────────────────────────────────────────────

type PresenceStatus = WorkspaceMember['status']

const statusCopy: Record<PresenceStatus, { label: string; dot: string; badge: string; border: string }> = {
  ONLINE: {
    label: 'Online',
    dot: 'bg-emerald-400',
    badge: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    border: 'border-emerald-400/20',
  },
  BUSY: {
    label: 'Busy',
    dot: 'bg-rose-400',
    badge: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
    border: 'border-rose-400/20',
  },
  AWAY: {
    label: 'Away',
    dot: 'bg-amber-400',
    badge: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    border: 'border-amber-400/15',
  },
  OFFLINE: {
    label: 'Offline',
    dot: 'bg-slate-500',
    badge: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
    border: 'border-white/8',
  },
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function normalizeName(value: string) {
  return value.trim().toLowerCase()
}

function formatActivityTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.max(0, Math.floor(diff / 60_000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatActivityLabel(type: string, metadata: Record<string, unknown> | null) {
  const title = (metadata?.title ?? metadata?.taskTitle ?? metadata?.projectName ?? '') as string
  const label = type.toLowerCase().replace(/_/g, ' ')
  return title ? `${label} · ${title}` : label
}

function groupCanonicalCrew(roster: CanonicalTeamMember[]) {
  return {
    independent: roster.filter((member) => member.group === 'independent'),
    subagents: roster.filter((member) => member.group === 'subagent'),
    ecosystem: roster.filter((member) => member.group === 'ecosystem'),
  }
}

// ── component ────────────────────────────────────────────────────────

export const Office: FC = () => {
  const { workspace, feed, isSocketConnected } = useOfficeRealtime(12)
  const { data, isLoading, error } = workspace
  const { data: feedData, isLoading: feedLoading } = feed
  const { data: canonicalTeam, isLoading: canonicalLoading } = useCanonicalTeam()

  const members = data?.members ?? []
  const canonicalRoster = canonicalTeam ?? []

  const stats = useMemo(() => {
    const online = members.filter((member) => member.status === 'ONLINE').length
    const busy = members.filter((member) => member.status === 'BUSY').length
    const away = members.filter((member) => member.status === 'AWAY').length
    const offline = members.filter((member) => member.status === 'OFFLINE').length
    const active = members.filter((member) => member.status === 'ONLINE' || member.status === 'BUSY')
    const passive = members.filter((member) => member.status === 'AWAY' || member.status === 'OFFLINE')
    return { online, busy, away, offline, active, passive }
  }, [members])

  const drift = useMemo(() => {
    const runtimeNames = new Set(members.map((member) => normalizeName(member.name)))
    const canonicalNames = new Set(canonicalRoster.map((member) => normalizeName(member.name)))

    return {
      canonicalOnly: canonicalRoster.filter((member) => !runtimeNames.has(normalizeName(member.name))),
      runtimeOnly: members.filter((member) => !canonicalNames.has(normalizeName(member.name))),
    }
  }, [canonicalRoster, members])

  const canonicalGroups = useMemo(() => groupCanonicalCrew(canonicalRoster), [canonicalRoster])

  const subagentWorkspaces = useMemo(() => {
    return canonicalGroups.subagents.map((subagent) => {
      const parentRuntime = members.find((member) => normalizeName(member.name) === normalizeName(subagent.parentAgent ?? ''))
      const activeTasks = parentRuntime?.activeTasks ?? []

      return {
        subagent,
        parentRuntime,
        activeTasks,
      }
    })
  }, [canonicalGroups.subagents, members])

  const liveState = error
    ? 'Runtime unavailable'
    : isSocketConnected
      ? 'Live socket'
      : 'Polling runtime'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-white/[0.03] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(217,70,239,0.10),transparent_30%)]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.22em]">
              <span className="border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-cyan-300">runtime presence</span>
              <span className="border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-fuchsia-300">canonical roster</span>
              <span className="border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-300">office view</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">Office presence</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-mission-muted">
              Who looks active now, which crew members are missing from runtime presence, and whether the live socket is connected.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Online" value={stats.online} tone="text-emerald-300" icon={<Wifi className="h-4 w-4" />} />
            <Metric label="Busy" value={stats.busy} tone="text-rose-300" icon={<Zap className="h-4 w-4" />} />
            <Metric label="Away" value={stats.away} tone="text-amber-300" icon={<Clock3 className="h-4 w-4" />} />
            <Metric label="Offline" value={stats.offline} tone="text-slate-300" icon={<WifiOff className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-6">
          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
                  Active now
                </h3>
                <p className="mt-1 text-sm text-mission-muted">Runtime members currently online or busy.</p>
              </div>
              <ConnectionBadge connected={isSocketConnected} label={liveState} />
            </div>

            {isLoading ? (
              <OfficeSkeleton />
            ) : error ? (
              <ErrorPanel message={error.message} />
            ) : stats.active.length > 0 ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {stats.active.map((member) => (
                  <PresenceCard key={member.id} member={member} priority="high" />
                ))}
              </div>
            ) : (
              <EmptyPanel title="No one appears live" body="Runtime presence is quiet. The canonical roster is still available in the side panel." />
            )}
          </section>

          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Bot className="h-4 w-4 text-cyan-300" />
                  Subagent workspaces
                </h3>
                <p className="mt-1 text-sm text-mission-muted">Canonical subagents mapped against parent runtime evidence. No invented workload.</p>
              </div>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-300">
                {subagentWorkspaces.length} canonical lanes
              </span>
            </div>

            {canonicalLoading ? (
              <OfficeSkeleton compact />
            ) : subagentWorkspaces.length > 0 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {subagentWorkspaces.map(({ subagent, parentRuntime, activeTasks }) => (
                  <SubagentWorkspaceCard
                    key={`${subagent.parentAgent}-${subagent.name}`}
                    subagent={subagent}
                    parentRuntime={parentRuntime}
                    activeTasks={activeTasks}
                  />
                ))}
              </div>
            ) : (
              <EmptyPanel title="No subagents in roster" body="The canonical roster does not currently define subagent lanes." />
            )}
          </section>


          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Away / offline</h3>
                <p className="mt-1 text-sm text-mission-muted">Lower-priority presence signals, kept compact.</p>
              </div>
              <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-xs text-mission-muted">
                {stats.passive.length} members
              </span>
            </div>

            {isLoading ? (
              <OfficeSkeleton compact />
            ) : stats.passive.length > 0 ? (
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {stats.passive.map((member) => (
                  <PresenceCard key={member.id} member={member} compact />
                ))}
              </div>
            ) : (
              <EmptyPanel title="No passive members" body="Everyone in runtime presence is currently active." compact />
            )}
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Users className="h-4 w-4 text-fuchsia-300" />
              Canonical crew
            </h3>
            <p className="mt-1 text-sm text-mission-muted">Roster truth, separate from live runtime presence.</p>

            {canonicalLoading ? (
              <div className="flex min-h-[160px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-mission-muted" />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <CrewGroup title="Independent" members={canonicalGroups.independent} tone="fuchsia" />
                <CrewGroup title="Sub-agents" members={canonicalGroups.subagents} tone="cyan" />
                <CrewGroup title="Ecosystem" members={canonicalGroups.ecosystem} tone="purple" />
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              Presence drift
            </h3>
            <p className="mt-1 text-sm text-mission-muted">Where canonical roster and runtime presence disagree.</p>

            <div className="mt-4 grid gap-3">
              <DriftBox label="Canonical only" count={drift.canonicalOnly.length} names={drift.canonicalOnly.map((m) => m.name)} />
              <DriftBox label="Runtime only" count={drift.runtimeOnly.length} names={drift.runtimeOnly.map((m) => m.name)} danger />
            </div>
          </section>

          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Activity className="h-4 w-4 text-cyan-300" />
              Recent activity
            </h3>
            <p className="mt-1 text-sm text-mission-muted">Latest runtime activity feed events.</p>

            {feedLoading ? (
              <div className="flex min-h-[160px] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-mission-muted" />
              </div>
            ) : !feedData || feedData.length === 0 ? (
              <EmptyPanel title="No recent activity" body="The runtime feed has no events yet." compact />
            ) : (
              <ul className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {feedData.map((item) => (
                  <li key={item.id} className="flex gap-2.5 rounded-xl border border-white/6 bg-[#07111f]/70 p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-[10px] font-semibold text-cyan-300">
                      {item.user ? getInitials(item.user.name) : 'SYS'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-5 text-mission-text">
                        <span className="font-semibold text-white">{item.user?.name ?? 'System'}</span>{' '}
                        {formatActivityLabel(item.type, item.metadata)}
                      </p>
                      <p className="mt-0.5 text-[10px] tabular-nums text-mission-muted">{formatActivityTime(item.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

// ── sub-components ───────────────────────────────────────────────────

const Metric: FC<{ label: string; value: number; tone: string; icon: ReactNode }> = ({ label, value, tone, icon }) => (
  <div className="rounded-2xl border border-white/8 bg-[#07111f]/70 px-4 py-3">
    <div className={`flex items-center gap-2 text-xs ${tone}`}>{icon}{label}</div>
    <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
  </div>
)

const ConnectionBadge: FC<{ connected: boolean; label: string }> = ({ connected, label }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
    connected
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
      : 'border-amber-400/20 bg-amber-400/10 text-amber-300'
  }`}
  >
    {connected ? <Radio className="h-3 w-3" /> : <Signal className="h-3 w-3" />}
    {label}
  </span>
)

const PresenceCard: FC<{ member: WorkspaceMember; compact?: boolean; priority?: 'high' }> = ({ member, compact }) => {
  const status = statusCopy[member.status] ?? statusCopy.OFFLINE
  const activeTasks = member.activeTasks ?? []
  const total = member.workload?.total ?? 0
  const overdue = member.workload?.overdue ?? 0

  return (
    <article className={`rounded-2xl border ${status.border} bg-[#07111f]/80 p-4 transition-colors hover:border-white/15`}>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-sm font-semibold text-white">
            {member.avatar ? <img src={member.avatar} alt={member.name} className="h-10 w-10 rounded-xl object-cover" /> : getInitials(member.name)}
          </span>
          <span className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#07111f] ${status.dot}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-white truncate">{member.name}</h4>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.badge}`}>{status.label}</span>
          </div>
          <p className="mt-0.5 text-xs capitalize text-mission-muted">{member.role.toLowerCase()}</p>
        </div>
      </div>

      {!compact && (
        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-mission-muted/70">Active workspace</p>
            {activeTasks.length > 0 ? (
              <ul className="space-y-1.5">
                {activeTasks.slice(0, 3).map((task) => (
                  <li key={task.id} className="rounded-lg border border-white/6 bg-white/[0.03] px-2.5 py-2 text-xs text-mission-text">
                    <span className="line-clamp-1">{task.title}</span>
                    <span className="mt-0.5 block text-[10px] text-mission-muted">{task.project.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-white/8 bg-white/[0.02] px-2.5 py-2 text-xs text-mission-muted">
                No active task in runtime DB
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-mission-muted">
            <span className="rounded-full border border-white/8 px-2 py-0.5">{total} total tasks</span>
            {overdue > 0 && <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-rose-300">{overdue} overdue</span>}
          </div>
        </div>
      )}
    </article>
  )
}

const SubagentWorkspaceCard: FC<{
  subagent: CanonicalTeamMember
  parentRuntime?: WorkspaceMember
  activeTasks: WorkspaceMember['activeTasks']
}> = ({ subagent, parentRuntime, activeTasks }) => {
  const parentStatus = parentRuntime ? statusCopy[parentRuntime.status] : undefined

  return (
    <article className="rounded-2xl border border-cyan-400/12 bg-[#07111f]/80 p-4 transition-colors hover:border-cyan-300/25">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/10 text-sm font-semibold text-cyan-200">
          {getInitials(subagent.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-white truncate">{subagent.name}</h4>
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[10px] text-mission-muted">
              {subagent.role}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-mission-muted truncate">{subagent.model}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/6 bg-white/[0.03] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-mission-muted/70">
            <GitBranch className="h-3 w-3" />
            Parent lane
          </p>
          {parentStatus ? (
            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${parentStatus.badge}`}>{parentStatus.label}</span>
          ) : (
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">No runtime</span>
          )}
        </div>
        <p className="mt-2 text-sm text-white">{subagent.parentAgent ?? 'Unassigned parent'}</p>
      </div>

      <div className="mt-3">
        <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-mission-muted/70">Runtime evidence</p>
        {activeTasks && activeTasks.length > 0 ? (
          <ul className="space-y-1.5">
            {activeTasks.slice(0, 2).map((task) => (
              <li key={task.id} className="rounded-lg border border-white/6 bg-white/[0.03] px-2.5 py-2 text-xs text-mission-text">
                <span className="line-clamp-1">{task.title}</span>
                <span className="mt-0.5 block text-[10px] text-mission-muted">via {subagent.parentAgent} · {task.project.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-white/8 bg-white/[0.02] px-2.5 py-2 text-xs leading-5 text-mission-muted">
            No active runtime task linked to the parent lane.
          </p>
        )}
      </div>
    </article>
  )
}


const CrewGroup: FC<{ title: string; members: CanonicalTeamMember[]; tone: 'fuchsia' | 'cyan' | 'purple' }> = ({ title, members, tone }) => {
  const toneClass = tone === 'fuchsia' ? 'text-fuchsia-300' : tone === 'cyan' ? 'text-cyan-300' : 'text-purple-300'
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-mission-muted/70">
        <span>{title}</span>
        <span className={toneClass}>{members.length}</span>
      </div>
      <div className="space-y-1.5">
        {members.length > 0 ? members.map((member) => (
          <div key={member.name} className="flex items-center gap-2 rounded-xl border border-white/6 bg-[#07111f]/70 px-3 py-2">
            <UserRound className={`h-3.5 w-3.5 ${toneClass}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white truncate">{member.name}</p>
              <p className="text-[10px] text-mission-muted truncate">{member.role}{member.parentAgent ? ` · ${member.parentAgent}` : ''}</p>
            </div>
          </div>
        )) : (
          <p className="rounded-xl border border-dashed border-white/8 px-3 py-2 text-xs text-mission-muted">No entries</p>
        )}
      </div>
    </div>
  )
}

const DriftBox: FC<{ label: string; count: number; names: string[]; danger?: boolean }> = ({ label, count, names, danger }) => (
  <div className={`rounded-2xl border p-4 ${danger ? 'border-rose-400/20 bg-rose-400/[0.05]' : 'border-amber-400/20 bg-amber-400/[0.05]'}`}>
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-white">{label}</p>
      <span className={`text-2xl font-semibold tabular-nums ${danger ? 'text-rose-300' : 'text-amber-300'}`}>{count}</span>
    </div>
    <p className="mt-1 text-xs text-mission-muted">
      {names.length > 0 ? names.slice(0, 4).join(', ') + (names.length > 4 ? ` +${names.length - 4}` : '') : 'No drift detected'}
    </p>
  </div>
)

const OfficeSkeleton: FC<{ compact?: boolean }> = ({ compact }) => (
  <div className={`mt-5 grid gap-3 ${compact ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
    {[0, 1, 2].map((item) => (
      <div key={item} className="h-32 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
    ))}
  </div>
)

const EmptyPanel: FC<{ title: string; body: string; compact?: boolean }> = ({ title, body, compact }) => (
  <div className={`rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 text-center ${compact ? 'p-4' : 'p-8'}`}>
    <p className="text-sm font-medium text-mission-text">{title}</p>
    <p className="mt-1 text-xs text-mission-muted">{body}</p>
  </div>
)

const ErrorPanel: FC<{ message: string }> = ({ message }) => (
  <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-5">
    <p className="font-medium text-rose-300">Failed to load runtime presence</p>
    <p className="mt-1 text-sm text-rose-100/70">{message}</p>
  </div>
)
