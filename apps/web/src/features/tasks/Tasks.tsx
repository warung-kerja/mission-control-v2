import { FC, useMemo, useState } from 'react'
import {
  ArrowRight,
  Clock,
  GitCommit,
  Loader2,
  Radio,
  Target,
  TrendingUp,
  Wrench,
  Zap,
  ZapOff,
} from 'lucide-react'
import {
  useCanonicalProjects,
  useCanonicalTeam,
} from '../../hooks/useCanonical'
import { useCronJobs } from '../../hooks/useSystem'
import type { CanonicalProject } from '../../hooks/useCanonical'
import type { CronJob } from '../../hooks/useSystem'

// ── helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

type MovementUrgency = 'now' | 'soon' | 'idle'

function classifyMovement(project: CanonicalProject): MovementUrgency {
  const priority = project.priority.toLowerCase()
  const status = project.status.toLowerCase()
  if (priority === 'urgent' || priority === 'high') return 'now'
  if (status === 'in-progress' || status === 'active') return 'soon'
  const age = daysSince(project.updatedAt)
  if (age !== null && age > 14) return 'idle'
  return 'soon'
}

const movementTone: Record<MovementUrgency, string> = {
  now: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  soon: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  idle: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
}

const movementLabel: Record<MovementUrgency, string> = {
  now: 'Move now',
  soon: 'Keep moving',
  idle: 'Check on this',
}

const statusTone: Record<string, string> = {
  'in-progress': 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  active: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  planned: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  paused: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  complete: 'border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300',
}

const cronStatusTone: Record<string, string> = {
  success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  failure: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  running: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  skipped: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  pending: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
}


function getJobAgent(job: CronJob): string {
  return job.agentId || 'unassigned'
}

function formatAgentLabel(agentId: string): string {
  return agentId === 'unassigned' ? 'Unassigned' : agentId
}

// ── component ────────────────────────────────────────────────────────

export const Tasks: FC = () => {
  const [cronAgentFilter, setCronAgentFilter] = useState('all')

  // Data
  const { data: canonicalProjects, isLoading: projectsLoading } = useCanonicalProjects()
  const { data: canonicalTeam, isLoading: teamLoading } = useCanonicalTeam()
  const { data: cronResult, isLoading: cronLoading } = useCronJobs()

  // Derived
  const projects = useMemo(() => canonicalProjects?.data ?? [], [canonicalProjects])
  const team = useMemo(() => canonicalTeam ?? [], [canonicalTeam])
  const cronJobs = useMemo(
    () => (cronResult?.ok ? cronResult.jobs : []) as CronJob[],
    [cronResult],
  )
  const cronError = cronResult && !cronResult.ok ? cronResult.error : null
  const cronAgentOptions = useMemo(
    () => Array.from(new Set(cronJobs.map(getJobAgent))).sort((a, b) => a.localeCompare(b)),
    [cronJobs],
  )
  const filteredCronJobs = useMemo(
    () => cronJobs.filter((job) => cronAgentFilter === 'all' || getJobAgent(job) === cronAgentFilter),
    [cronAgentFilter, cronJobs],
  )

  // ── project movement board ──
  const movement = useMemo(() => {
    const withMoves = projects
      .filter((p) => p.nextStep)
      .map((p) => ({ ...p, urgency: classifyMovement(p) }))

    return {
      now: withMoves.filter((p) => p.urgency === 'now'),
      soon: withMoves.filter((p) => p.urgency === 'soon'),
      idle: withMoves.filter((p) => p.urgency === 'idle'),
      noNextStep: projects.filter((p) => !p.nextStep),
    }
  }, [projects])

  // ── cron pulse ──
  const cronPulse = useMemo(() => {
    const total = filteredCronJobs.length
    const healthy = filteredCronJobs.filter((j) => j.status === 'success').length
    const failing = filteredCronJobs.filter((j) => j.status === 'failure').length
    const pending = filteredCronJobs.filter((j) => j.status === 'pending').length
    const running = filteredCronJobs.filter((j) => j.status === 'running').length
    return { total, healthy, failing, pending, running }
  }, [filteredCronJobs])

  // ── team snapshot ──
  const teamIndependent = useMemo(
    () => team.filter((m) => m.group === 'independent'),
    [team],
  )
  const teamSubagents = useMemo(
    () => team.filter((m) => m.group === 'subagent'),
    [team],
  )

  const isLoading = projectsLoading || teamLoading || cronLoading

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── page heading ── */}
      <div>
        <h2 className="text-2xl font-bold text-mission-text">Tasks</h2>
        <p className="text-mission-muted">Canonical task registry, execution board</p>
      </div>

      {/* ── header ── */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em]">
        <span className="border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-fuchsia-300">
          canonical truth
        </span>
        <span className="border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-cyan-300">
          runtime truth
        </span>
        <span className="border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-amber-300">
          execution board
        </span>
      </div>

      {/* ── top stat line ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-100/80">Projects</p>
          <p className="mt-2 text-3xl font-semibold text-fuchsia-300">{projects.length}</p>
          <p className="mt-1 text-xs text-fuchsia-100/60">
            {movement.now.length} need movement now
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Cron pulse</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-300">
            {cronPulse.healthy}/{cronPulse.total}
          </p>
          <p className="mt-1 text-xs text-cyan-100/60">
            {cronPulse.failing > 0 ? `${cronPulse.failing} failing · ` : ''}
            {cronPulse.running > 0 ? `${cronPulse.running} running · ` : ''}
            healthy
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Crew</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">
            {teamIndependent.length}
          </p>
          <p className="mt-1 text-xs text-emerald-100/60">Independent agents</p>
        </div>
        <div className="rounded-2xl border border-purple-400/15 bg-purple-400/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-purple-100/80">Sub-agents</p>
          <p className="mt-2 text-3xl font-semibold text-purple-300">
            {teamSubagents.length}
          </p>
          <p className="mt-1 text-xs text-purple-100/60">Specialised crew</p>
        </div>
      </div>

      {/* ── main grid: movement board + cron watch ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ── PROJECT MOVEMENT BOARD ── */}
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2.5">
            <Target className="h-4 w-4 text-rose-300" />
            <h2 className="text-lg font-semibold text-white">What should move next?</h2>
          </div>
          <p className="mt-1 text-sm text-mission-muted">
            Every project in the canonical registry with a concrete next step, ranked by urgency.
            Projects without a next step are flagged below.
          </p>

          {isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-mission-muted" />
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {/* Move now */}
              {movement.now.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-medium text-rose-300">
                    <Zap className="h-3.5 w-3.5" />
                    Move now
                    <span className="rounded-full border border-rose-400/20 px-2 py-0.5 text-[11px] text-rose-300/80">
                      {movement.now.length}
                    </span>
                  </h3>
                  <div className="mt-2 space-y-2">
                    {movement.now.map((project) => (
                      <ProjectMoveCard key={project.id} project={project} />
                    ))}
                  </div>
                </section>
              )}

              {/* Keep moving */}
              {movement.soon.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-medium text-cyan-300">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Keep moving
                    <span className="rounded-full border border-cyan-400/20 px-2 py-0.5 text-[11px] text-cyan-300/80">
                      {movement.soon.length}
                    </span>
                  </h3>
                  <div className="mt-2 space-y-2">
                    {movement.soon.map((project) => (
                      <ProjectMoveCard key={project.id} project={project} />
                    ))}
                  </div>
                </section>
              )}

              {/* Check on this */}
              {movement.idle.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-medium text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    Check on this
                    <span className="rounded-full border border-slate-400/20 px-2 py-0.5 text-[11px] text-slate-400/80">
                      {movement.idle.length}
                    </span>
                  </h3>
                  <div className="mt-2 space-y-2">
                    {movement.idle.map((project) => (
                      <ProjectMoveCard key={project.id} project={project} />
                    ))}
                  </div>
                </section>
              )}

              {/* No next step */}
              {movement.noNextStep.length > 0 && (
                <section className="rounded-2xl border border-dashed border-amber-400/20 bg-amber-400/[0.04] p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-amber-300/80">
                    <Wrench className="h-3.5 w-3.5" />
                    Missing next step — needs triage
                  </p>
                  <ul className="mt-2 space-y-1">
                    {movement.noNextStep.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 text-sm text-amber-100/70">
                        <ArrowRight className="h-3 w-3 shrink-0 opacity-50" />
                        <span>{p.name}</span>
                        <span className="text-[11px] text-amber-100/40">
                          ({p.owner} · {p.status})
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {movement.now.length === 0 && movement.soon.length === 0 && movement.idle.length === 0 && (
                <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-6">
                  <p className="text-sm text-mission-muted">
                    No project movement data available. Check that the canonical project registry is reachable.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CRON AUTOMATION WATCH ── */}
        <div className="space-y-5">
          <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-2.5">
              <Radio className="h-4 w-4 text-cyan-300" />
              <h2 className="text-lg font-semibold text-white">Automation pulse</h2>
            </div>
            <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <p className="text-sm text-mission-muted">
                Live cron status from OpenClaw runtime.
              </p>
              <div className="w-full sm:w-44">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.2em] text-mission-muted/70" htmlFor="tasks-cron-agent-filter">
                  Agent
                </label>
                <select
                  id="tasks-cron-agent-filter"
                  value={cronAgentFilter}
                  onChange={(event) => setCronAgentFilter(event.target.value)}
                  className="w-full rounded-xl border border-white/8 bg-[#07111f]/70 px-3 py-2 text-xs text-mission-text focus:border-cyan-400/40 focus:outline-none"
                >
                  <option value="all">All agents</option>
                  {cronAgentOptions.map((agentId) => (
                    <option key={agentId} value={agentId}>
                      {formatAgentLabel(agentId)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {cronLoading ? (
              <div className="flex min-h-[120px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-mission-muted" />
              </div>
            ) : cronError ? (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-rose-300">
                  <ZapOff className="h-3.5 w-3.5" />
                  Cron unreachable
                </p>
                <p className="mt-1 text-xs text-rose-200/70">{cronError}</p>
              </div>
            ) : filteredCronJobs.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted">
                No cron jobs match the selected agent filter.
              </div>
            ) : (
              <div className="mt-4 space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
                {filteredCronJobs.map((job) => {
                  const tone = cronStatusTone[job.status] ?? cronStatusTone.pending
                  return (
                    <div
                      key={job.id}
                      className="rounded-xl border border-white/8 bg-[#07111f]/80 p-3 transition-colors hover:border-white/12"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{job.name}</p>
                          <p className="mt-0.5 text-[11px] text-mission-muted">{job.schedule}</p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-cyan-200/70">Agent: {formatAgentLabel(getJobAgent(job))}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${tone}`}>
                          {job.status}
                        </span>
                      </div>
                      {job.lastRunAt && (
                        <p className="mt-2 flex items-center gap-1 text-[11px] text-mission-muted">
                          <GitCommit className="h-3 w-3" />
                          Last run {formatDate(job.lastRunAt)}
                          {job.durationMs != null && ` · ${job.durationMs}ms`}
                        </p>
                      )}
                      {job.error && (
                        <p className="mt-1 text-[11px] text-rose-300/80 truncate">{job.error}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── CREW LINEUP ── */}
          <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-2.5">
              <Target className="h-4 w-4 text-purple-300" />
              <h2 className="text-lg font-semibold text-white">Crew lineup</h2>
            </div>
            <p className="mt-1 text-sm text-mission-muted">
              Agent roster from canonical source, grouped by reporting structure.
            </p>

            {teamLoading ? (
              <div className="flex min-h-[80px] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-mission-muted" />
              </div>
            ) : team.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted">
                No crew data loaded from canonical roster.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {/* Independent */}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-purple-300/80">
                    Independent — {teamIndependent.length}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {teamIndependent.map((member) => (
                      <li key={member.name} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-400/10 text-[11px] font-semibold text-purple-300">
                          {member.name.charAt(0)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-white">{member.name}</p>
                          <p className="text-[11px] text-mission-muted">
                            {member.role} · {member.model}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Subagents */}
                {teamSubagents.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-purple-300/80">
                      Sub-agents — {teamSubagents.length}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {teamSubagents.map((member) => (
                        <li key={member.name} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-400/10 text-[11px] font-semibold text-purple-300">
                            {member.name.charAt(0)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-white">
                              {member.name}
                              {member.parentAgent && (
                                <span className="ml-1.5 text-[11px] text-mission-muted">
                                  → {member.parentAgent}
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-mission-muted">
                              {member.role} · {member.model}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── sub-component: project movement card ─────────────────────────────

const ProjectMoveCard: FC<{
  project: CanonicalProject & { urgency: MovementUrgency }
}> = ({ project }) => {
  const age = daysSince(project.updatedAt)
  const tone = movementTone[project.urgency]

  return (
    <div className="rounded-xl border border-white/8 bg-[#07111f]/80 p-4 transition-colors hover:border-white/12">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${tone}`}>
          {movementLabel[project.urgency]}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusTone[project.status] ?? statusTone.planned}`}
        >
          {project.status}
        </span>
        <span className="text-[11px] text-mission-muted">{project.priority}</span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <p className="font-medium text-white">{project.name}</p>
          <p className="mt-1 text-sm text-mission-text">{project.currentPhase}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-[11px] text-mission-muted sm:text-right">
          <span>{project.owner}</span>
          {age !== null && (
            <span className={age > 7 ? 'text-amber-300' : ''}>
              Updated {age === 0 ? 'today' : age === 1 ? 'yesterday' : `${age}d ago`}
            </span>
          )}
        </div>
      </div>

      {/* Next step — the core execution signal */}
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-cyan-400/10 bg-cyan-400/[0.04] p-3">
        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
        <p className="text-sm text-cyan-100/90">{project.nextStep}</p>
      </div>

      <p className="mt-2 text-[11px] text-mission-muted">
        Team: {project.team.join(', ')}
      </p>
    </div>
  )
}
