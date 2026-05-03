import { FC, ReactNode, useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Database,
  FolderKanban,
  Loader2,
  Radio,
  Signal,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import { useCanonicalProjects, useCanonicalStatus, useCanonicalTeam } from '../../hooks/useCanonical'
import { useCanonicalMemories } from '../../hooks/useCanonicalMemories'
import { useTeamActivityFeed } from '../../hooks/useDashboard'
import { useAutomationStatus, useCronJobs } from '../../hooks/useSystem'

function formatRelative(value: string | null | undefined) {
  if (!value) return '—'
  const diffMs = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(diffMs / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function ageDays(value: string | null | undefined) {
  if (!value) return null
  return Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)
}

export const Signals: FC = () => {
  const { data: canonicalStatus, isLoading: canonicalLoading } = useCanonicalStatus()
  const { data: canonicalProjects, isLoading: projectsLoading } = useCanonicalProjects()
  const { data: canonicalTeam, isLoading: teamLoading } = useCanonicalTeam()
  const { data: canonicalMemories, isLoading: memoriesLoading } = useCanonicalMemories()
  const { data: activity, isLoading: activityLoading } = useTeamActivityFeed(8)
  const { data: automationStatus, isLoading: automationLoading } = useAutomationStatus()
  const { data: cronJobs, isLoading: cronLoading } = useCronJobs()

  const projects = canonicalProjects?.data ?? []
  const team = canonicalTeam ?? []
  const memories = canonicalMemories ?? []
  const cronVisible = cronJobs?.ok ? cronJobs.jobs : []

  const projectSignal = useMemo(() => {
    const active = projects.filter((project) => ['active', 'in-progress'].includes(project.status.toLowerCase()))
    const highPriority = projects.filter((project) => ['urgent', 'high'].includes(project.priority.toLowerCase()))
    const stale = projects.filter((project) => {
      const age = ageDays(project.updatedAt)
      return age !== null && age > 14
    })
    const missingNext = projects.filter((project) => !project.nextStep)
    return { active, highPriority, stale, missingNext }
  }, [projects])

  const crewSignal = useMemo(() => ({
    independent: team.filter((member) => member.group === 'independent'),
    subagents: team.filter((member) => member.group === 'subagent'),
    ecosystem: team.filter((member) => member.group === 'ecosystem'),
  }), [team])

  const memorySignal = useMemo(() => {
    const categories = memories.reduce<Record<string, number>>((acc, memory) => {
      acc[memory.category] = (acc[memory.category] ?? 0) + 1
      return acc
    }, {})
    const recent = memories.filter((memory) => {
      const age = ageDays(memory.modifiedAt)
      return age !== null && age <= 7
    })
    return { categories, recent }
  }, [memories])

  const cronSignal = useMemo(() => ({
    total: cronVisible.length,
    failed: cronVisible.filter((job) => job.status === 'failure'),
    running: cronVisible.filter((job) => job.status === 'running'),
    pending: cronVisible.filter((job) => job.status === 'pending'),
    healthy: cronVisible.filter((job) => job.status === 'success'),
  }), [cronVisible])

  const attentionItems = useMemo(() => {
    const items: { title: string; body: string; tone: 'amber' | 'rose' | 'cyan' }[] = []
    if (canonicalStatus?.overallStatus === 'degraded') {
      items.push({ title: 'Canonical source degraded', body: 'A source-of-truth file is missing or unreadable.', tone: 'rose' })
    }
    if (!cronJobs?.ok) {
      items.push({ title: 'Cron runtime unavailable', body: cronJobs?.error ?? 'OpenClaw cron truth did not return live data.', tone: 'rose' })
    }
    if (cronSignal.failed.length > 0) {
      items.push({ title: 'Automation failure', body: `${cronSignal.failed.length} cron job${cronSignal.failed.length === 1 ? '' : 's'} currently report failure.`, tone: 'rose' })
    }
    if (projectSignal.missingNext.length > 0) {
      items.push({ title: 'Project next-step gap', body: `${projectSignal.missingNext.length} project${projectSignal.missingNext.length === 1 ? '' : 's'} need a recorded next move.`, tone: 'amber' })
    }
    if (projectSignal.stale.length > 0) {
      items.push({ title: 'Project staleness', body: `${projectSignal.stale.length} project${projectSignal.stale.length === 1 ? '' : 's'} have not moved in more than two weeks.`, tone: 'amber' })
    }
    if (items.length === 0) {
      items.push({ title: 'No major warning', body: 'Current canonical and runtime signals look calm.', tone: 'cyan' })
    }
    return items
  }, [canonicalStatus, cronJobs, cronSignal.failed.length, projectSignal.missingNext.length, projectSignal.stale.length])

  const isLoading = canonicalLoading || projectsLoading || teamLoading || memoriesLoading || automationLoading || cronLoading

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-white/[0.03] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(217,70,239,0.09),transparent_32%)]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.22em]">
              <span className="border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-fuchsia-300">canonical truth</span>
              <span className="border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-cyan-300">runtime pulse</span>
              <span className="border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-amber-300">signal watch</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">Signals</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-mission-muted">
              A compact pattern detector for truth-source health, project movement, automation pulse, memory activity, and crew composition.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Database className="h-4 w-4" />} label="Truth" value={canonicalStatus?.overallStatus ?? '—'} tone="text-fuchsia-300" />
            <Metric icon={<FolderKanban className="h-4 w-4" />} label="Active projects" value={projectSignal.active.length} tone="text-cyan-300" />
            <Metric icon={<Zap className="h-4 w-4" />} label="Cron jobs" value={cronSignal.total} tone="text-emerald-300" />
            <Metric icon={<Users className="h-4 w-4" />} label="Crew" value={team.length} tone="text-amber-300" />
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-white/8 bg-white/[0.03]">
          <Loader2 className="h-7 w-7 animate-spin text-mission-muted" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-6">
            <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
              <SectionTitle icon={<Sparkles className="h-4 w-4 text-amber-300" />} title="Attention stack" subtitle="Only the signals worth interrupting Raz for." />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {attentionItems.map((item) => (
                  <SignalCard key={item.title} title={item.title} body={item.body} tone={item.tone} />
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
              <SectionTitle icon={<FolderKanban className="h-4 w-4 text-cyan-300" />} title="Project movement" subtitle="Momentum signals from the canonical project registry." />
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <CountTile label="Active" value={projectSignal.active.length} tone="cyan" />
                <CountTile label="High priority" value={projectSignal.highPriority.length} tone="amber" />
                <CountTile label="Stale" value={projectSignal.stale.length} tone="rose" />
                <CountTile label="Missing next step" value={projectSignal.missingNext.length} tone="slate" />
              </div>
              <div className="mt-4 space-y-2">
                {projectSignal.highPriority.slice(0, 4).map((project) => (
                  <div key={project.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-white">{project.name}</p>
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-300">{project.priority}</span>
                    </div>
                    <p className="mt-2 text-sm text-mission-text">{project.nextStep || 'No next step recorded'}</p>
                    <p className="mt-1 text-xs text-mission-muted">Owner: {project.owner} · updated {formatRelative(project.updatedAt)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
              <SectionTitle icon={<Activity className="h-4 w-4 text-emerald-300" />} title="Recent coordination signals" subtitle="Latest runtime activity events, kept read-only." />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {activityLoading ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted md:col-span-2">Loading activity feed...</div>
                ) : activity && activity.length > 0 ? activity.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                    <div className="flex items-start gap-3">
                      <span className="rounded-xl bg-cyan-400/10 p-2 text-cyan-300"><Radio className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-mission-text">{item.description}</p>
                        <p className="mt-1 text-xs text-mission-muted">{item.user.name} · {formatRelative(item.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted md:col-span-2">No recent activity signal.</div>
                )}
              </div>
            </section>
          </main>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
              <SectionTitle icon={<Database className="h-4 w-4 text-fuchsia-300" />} title="Truth sources" subtitle="File-backed canonical inputs." compact />
              <div className="mt-4 space-y-3">
                {[canonicalStatus?.teamRoster, canonicalStatus?.projectRegistry].filter(Boolean).map((source) => (
                  <div key={source!.key} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-white">{source!.label}</p>
                      <StatusPill ok={source!.status === 'healthy'} label={source!.status} />
                    </div>
                    <p className="mt-2 text-xs text-mission-muted">{source!.itemCount} items · updated {formatRelative(source!.modifiedAt)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
              <SectionTitle icon={<Signal className="h-4 w-4 text-cyan-300" />} title="Automation pulse" subtitle="OpenClaw runtime visibility." compact />
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                  <p className="text-sm text-white">{automationStatus?.visibility ?? 'unknown'}</p>
                  <p className="mt-1 text-xs text-mission-muted">Provider: {automationStatus?.provider ?? '—'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <CountTile label="Healthy" value={cronSignal.healthy.length} tone="emerald" compact />
                  <CountTile label="Failed" value={cronSignal.failed.length} tone="rose" compact />
                  <CountTile label="Running" value={cronSignal.running.length} tone="cyan" compact />
                  <CountTile label="Pending" value={cronSignal.pending.length} tone="slate" compact />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
              <SectionTitle icon={<Brain className="h-4 w-4 text-purple-300" />} title="Memory signal" subtitle="Canonical memory files." compact />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <CountTile label="Files" value={memories.length} tone="purple" compact />
                <CountTile label="Recent" value={memorySignal.recent.length} tone="cyan" compact />
              </div>
              <div className="mt-4 space-y-2">
                {Object.entries(memorySignal.categories).slice(0, 5).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between rounded-xl border border-white/6 bg-[#07111f]/70 px-3 py-2 text-sm">
                    <span className="text-mission-text">{category}</span>
                    <span className="text-mission-muted tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
              <SectionTitle icon={<Users className="h-4 w-4 text-amber-300" />} title="Crew composition" subtitle="Canonical roster grouping." compact />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <CountTile label="Peer" value={crewSignal.independent.length} tone="fuchsia" compact />
                <CountTile label="Sub" value={crewSignal.subagents.length} tone="cyan" compact />
                <CountTile label="Eco" value={crewSignal.ecosystem.length} tone="purple" compact />
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}

const Metric: FC<{ icon: ReactNode; label: string; value: string | number; tone: string }> = ({ icon, label, value, tone }) => (
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

const SignalCard: FC<{ title: string; body: string; tone: 'amber' | 'rose' | 'cyan' }> = ({ title, body, tone }) => {
  const className = tone === 'rose'
    ? 'border-rose-400/20 bg-rose-400/[0.06] text-rose-100'
    : tone === 'amber'
      ? 'border-amber-400/20 bg-amber-400/[0.06] text-amber-100'
      : 'border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-100'
  return (
    <div className={`rounded-2xl border p-4 ${className}`}>
      <div className="flex items-center gap-2">
        {tone === 'cyan' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <p className="font-medium">{title}</p>
      </div>
      <p className="mt-2 text-sm opacity-80">{body}</p>
    </div>
  )
}

const CountTile: FC<{ label: string; value: number; tone: 'cyan' | 'amber' | 'rose' | 'slate' | 'emerald' | 'purple' | 'fuchsia'; compact?: boolean }> = ({ label, value, tone, compact }) => {
  const tones = {
    cyan: 'border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300',
    amber: 'border-amber-400/15 bg-amber-400/[0.06] text-amber-300',
    rose: 'border-rose-400/15 bg-rose-400/[0.06] text-rose-300',
    slate: 'border-slate-400/15 bg-slate-400/[0.06] text-slate-300',
    emerald: 'border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300',
    purple: 'border-purple-400/15 bg-purple-400/[0.06] text-purple-300',
    fuchsia: 'border-fuchsia-400/15 bg-fuchsia-400/[0.06] text-fuchsia-300',
  }
  return (
    <div className={`rounded-2xl border ${compact ? 'p-3' : 'p-4'} ${tones[tone]}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] opacity-80">{label}</p>
      <p className={`mt-1 font-semibold tabular-nums ${compact ? 'text-xl' : 'text-3xl'}`}>{value}</p>
    </div>
  )
}

const StatusPill: FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ok ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-rose-400/20 bg-rose-400/10 text-rose-300'}`}>
    {label}
  </span>
)
