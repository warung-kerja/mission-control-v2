import { FC, ReactNode, useMemo } from 'react'
import {
  Activity,
  ArrowRight,
  ExternalLink,
  FolderKanban,
  Loader2,
  MessageSquare,
  Radio,
  Route,
  Users,
  Wifi,
} from 'lucide-react'
import { useCanonicalProjects, useCanonicalTeam, type CanonicalTeamMember } from '../../hooks/useCanonical'
import { useTeamActivityFeed } from '../../hooks/useDashboard'
import { usePresence } from '../../hooks/usePresence'

const formatRelative = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(diffMs / 60_000))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(value).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
}

const communicationRules = [
  {
    label: 'Human direction',
    channel: 'Telegram / direct chat',
    note: 'Raz gives direction here. Mission Control observes; it does not replace the conversation.',
  },
  {
    label: 'Agent execution',
    channel: 'OpenClaw sessions',
    note: 'Work is routed through active agent sessions and validated through commits, builds, and runtime evidence.',
  },
  {
    label: 'Project truth',
    channel: 'Canonical registry + memory files',
    note: 'Project next moves and crew structure stay file-backed so the dashboard can stay honest.',
  },
]

export const Collaboration: FC = () => {
  const { data: canonicalTeam, isLoading: teamLoading } = useCanonicalTeam()
  const { data: canonicalProjects, isLoading: projectsLoading } = useCanonicalProjects()
  const { data: activity, isLoading: activityLoading } = useTeamActivityFeed(10)
  const { onlineCount, userStatuses } = usePresence()

  const projects = canonicalProjects?.data ?? []
  const team = canonicalTeam ?? []

  const activeProjects = useMemo(
    () => projects.filter((project) => ['active', 'in-progress'].includes(project.status.toLowerCase())),
    [projects],
  )

  const laneSummary = useMemo(() => {
    const byOwner = new Map<string, typeof activeProjects>()
    for (const project of activeProjects) {
      const owner = project.owner || 'Unassigned'
      byOwner.set(owner, [...(byOwner.get(owner) ?? []), project])
    }
    return Array.from(byOwner.entries()).map(([owner, ownerProjects]) => ({ owner, projects: ownerProjects }))
  }, [activeProjects])

  const statusSummary = useMemo(() => {
    const counts = { online: 0, away: 0, busy: 0, offline: 0 }
    for (const status of userStatuses.values()) counts[status] += 1
    return counts
  }, [userStatuses])

  const crewGroups = useMemo(() => ({
    independent: team.filter((member) => member.group === 'independent'),
    subagents: team.filter((member) => member.group === 'subagent'),
    ecosystem: team.filter((member) => member.group === 'ecosystem'),
  }), [team])

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-white/[0.03] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_30%)]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.22em]">
              <span className="border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-cyan-300">external comms first</span>
              <span className="border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-300">read-only watch</span>
              <span className="border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-fuchsia-300">canonical routing</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">Coordination watch</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-mission-muted">
              A routing surface for collaboration awareness: where communication should happen, which lanes are active, and what moved recently.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Users className="h-4 w-4" />} label="Crew" value={team.length} tone="text-cyan-300" />
            <Metric icon={<Wifi className="h-4 w-4" />} label="Presence" value={onlineCount} tone="text-emerald-300" />
            <Metric icon={<FolderKanban className="h-4 w-4" />} label="Lanes" value={activeProjects.length} tone="text-fuchsia-300" />
            <Metric icon={<Activity className="h-4 w-4" />} label="Events" value={activity?.length ?? 0} tone="text-amber-300" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-6">
          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <SectionTitle icon={<MessageSquare className="h-4 w-4 text-cyan-300" />} title="Communication routing" subtitle="This is the rulebook. Mission Control observes; real conversations stay in the right channel." />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {communicationRules.map((rule) => (
                <article key={rule.label} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                  <div className="flex items-center gap-2 text-white">
                    <Route className="h-4 w-4 text-cyan-300" />
                    <p className="font-medium">{rule.label}</p>
                  </div>
                  <p className="mt-2 text-sm text-cyan-100/90">{rule.channel}</p>
                  <p className="mt-2 text-xs leading-5 text-mission-muted">{rule.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <SectionTitle icon={<FolderKanban className="h-4 w-4 text-fuchsia-300" />} title="Active coordination lanes" subtitle="Project lanes grouped by owner, from the canonical project registry." />
            <div className="mt-4 space-y-4">
              {projectsLoading ? (
                <LoadingBox label="Loading project lanes..." />
              ) : laneSummary.length > 0 ? laneSummary.map((lane) => (
                <article key={lane.owner} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">{lane.owner}</p>
                      <p className="mt-0.5 text-xs text-mission-muted">{lane.projects.length} active lane{lane.projects.length === 1 ? '' : 's'}</p>
                    </div>
                    <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-[11px] text-fuchsia-300">owner lane</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {lane.projects.map((project) => (
                      <div key={project.id} className="rounded-xl border border-white/6 bg-white/[0.03] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-white">{project.name}</p>
                          <span className="text-[11px] text-mission-muted">{project.status} · {project.priority}</span>
                        </div>
                        <p className="mt-2 flex items-start gap-2 text-sm text-mission-text">
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                          <span>{project.nextStep || 'No next step recorded'}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              )) : (
                <EmptyBox label="No active project lanes visible." />
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <SectionTitle icon={<Activity className="h-4 w-4 text-amber-300" />} title="Recent coordination signals" subtitle="Runtime activity feed, shown as evidence rather than chat replacement." />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {activityLoading ? (
                <LoadingBox label="Loading activity feed..." span />
              ) : activity && activity.length > 0 ? activity.map((item) => (
                <article key={item.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                  <div className="flex items-start gap-3">
                    <span className="rounded-xl bg-cyan-400/10 p-2 text-cyan-300"><Radio className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-mission-text">{item.description}</p>
                      <p className="mt-1 text-xs text-mission-muted">{item.user.name} · {formatRelative(item.createdAt)}</p>
                    </div>
                  </div>
                </article>
              )) : (
                <EmptyBox label="No recent coordination events visible." span />
              )}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <SectionTitle icon={<Wifi className="h-4 w-4 text-emerald-300" />} title="Presence telemetry" subtitle="Runtime status counts only." compact />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <CountTile label="Online" value={statusSummary.online} tone="emerald" />
              <CountTile label="Busy" value={statusSummary.busy} tone="rose" />
              <CountTile label="Away" value={statusSummary.away} tone="amber" />
              <CountTile label="Offline" value={statusSummary.offline} tone="slate" />
            </div>
            <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-3 text-xs leading-5 text-mission-muted">
              Presence is telemetry only. Crew identity and reporting structure come from canonical roster files.
            </p>
          </section>

          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <SectionTitle icon={<Users className="h-4 w-4 text-fuchsia-300" />} title="Crew routing" subtitle="Canonical group composition." compact />
            {teamLoading ? (
              <div className="flex min-h-[150px] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-mission-muted" /></div>
            ) : (
              <div className="mt-4 space-y-4">
                <CrewMiniGroup title="Peer agents" members={crewGroups.independent} tone="fuchsia" />
                <CrewMiniGroup title="Sub-agents" members={crewGroups.subagents} tone="cyan" />
                <CrewMiniGroup title="Ecosystem" members={crewGroups.ecosystem} tone="purple" />
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <SectionTitle icon={<ExternalLink className="h-4 w-4 text-amber-300" />} title="Non-goal" subtitle="What this screen intentionally avoids." compact />
            <div className="mt-4 space-y-2 text-sm text-mission-text">
              <p className="rounded-xl border border-white/8 bg-[#07111f]/80 p-3">No in-app chat clone.</p>
              <p className="rounded-xl border border-white/8 bg-[#07111f]/80 p-3">No fake collaboration state.</p>
              <p className="rounded-xl border border-white/8 bg-[#07111f]/80 p-3">No second source of truth.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

const Metric: FC<{ icon: ReactNode; label: string; value: number; tone: string }> = ({ icon, label, value, tone }) => (
  <div className="rounded-2xl border border-white/8 bg-[#07111f]/70 px-4 py-3">
    <div className={`flex items-center gap-2 text-xs ${tone}`}>{icon}{label}</div>
    <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
  </div>
)

const SectionTitle: FC<{ icon: ReactNode; title: string; subtitle: string; compact?: boolean }> = ({ icon, title, subtitle, compact }) => (
  <div>
    <h3 className={`flex items-center gap-2 font-semibold text-white ${compact ? 'text-base' : 'text-lg'}`}>{icon}{title}</h3>
    <p className="mt-1 text-sm text-mission-muted">{subtitle}</p>
  </div>
)

const CountTile: FC<{ label: string; value: number; tone: 'emerald' | 'rose' | 'amber' | 'slate' }> = ({ label, value, tone }) => {
  const classes = {
    emerald: 'border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300',
    rose: 'border-rose-400/15 bg-rose-400/[0.06] text-rose-300',
    amber: 'border-amber-400/15 bg-amber-400/[0.06] text-amber-300',
    slate: 'border-slate-400/15 bg-slate-400/[0.06] text-slate-300',
  }
  return (
    <div className={`rounded-2xl border p-3 ${classes[tone]}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] opacity-80">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

const CrewMiniGroup: FC<{ title: string; members: CanonicalTeamMember[]; tone: 'fuchsia' | 'cyan' | 'purple' }> = ({ title, members, tone }) => {
  const toneClass = tone === 'fuchsia' ? 'text-fuchsia-300' : tone === 'cyan' ? 'text-cyan-300' : 'text-purple-300'
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-mission-muted/70">
        <span>{title}</span>
        <span className={toneClass}>{members.length}</span>
      </div>
      <div className="space-y-1.5">
        {members.length > 0 ? members.map((member) => (
          <div key={member.name} className="rounded-xl border border-white/6 bg-[#07111f]/70 px-3 py-2">
            <p className="text-sm text-white">{member.name}</p>
            <p className="text-[10px] text-mission-muted truncate">{member.role}{member.parentAgent ? ` · ${member.parentAgent}` : ''}</p>
          </div>
        )) : <p className="rounded-xl border border-dashed border-white/8 px-3 py-2 text-xs text-mission-muted">No entries</p>}
      </div>
    </div>
  )
}

const LoadingBox: FC<{ label: string; span?: boolean }> = ({ label, span }) => (
  <div className={`rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted ${span ? 'md:col-span-2' : ''}`}>
    {label}
  </div>
)

const EmptyBox: FC<{ label: string; span?: boolean }> = ({ label, span }) => (
  <div className={`rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted ${span ? 'md:col-span-2' : ''}`}>
    {label}
  </div>
)
