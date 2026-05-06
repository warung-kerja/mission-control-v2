import { FC, useMemo } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  Loader2,
  Radio,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import type { CanonicalProject, CanonicalSourceHealth } from '../../hooks/useCanonical'
import { useCanonicalProjects, useCanonicalStatus, useCanonicalTeam } from '../../hooks/useCanonical'
import type { CronJob } from '../../hooks/useSystem'
import { useAutomationStatus, useCronJobs } from '../../hooks/useSystem'
import { useTeamActivityFeed } from '../../hooks/useDashboard'
import { useAuthStore } from '../../stores/authStore'

function formatRelative(value: string | null) {
  if (!value) return '—'

  const now = Date.now()
  const target = new Date(value).getTime()
  const diffMs = now - target
  const mins = Math.round(diffMs / 60000)
  const hours = Math.round(diffMs / 3600000)
  const days = Math.round(diffMs / 86400000)

  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function scoreProject(project: CanonicalProject) {
  const priority = project.priority.toLowerCase()
  const status = project.status.toLowerCase()
  const priorityScore = priority === 'urgent' ? 5 : priority === 'high' ? 4 : priority === 'medium' ? 3 : 2
  const statusScore = status === 'active' ? 5 : status === 'in-progress' ? 4 : status === 'paused' ? 1 : 0
  const missingNextStepPenalty = project.nextStep.trim() ? 0 : -2
  const staleDays = Math.floor((Date.now() - new Date(project.updatedAt).getTime()) / 86400000)
  const freshnessScore = staleDays <= 2 ? 2 : staleDays <= 7 ? 1 : 0

  return priorityScore + statusScore + freshnessScore + missingNextStepPenalty
}

function getSourceBadge(source: CanonicalSourceHealth) {
  if (source.status === 'healthy') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
  if (source.status === 'invalid') return 'border-amber-400/20 bg-amber-400/10 text-amber-300'
  return 'border-rose-400/20 bg-rose-400/10 text-rose-300'
}

function getJobTone(job: CronJob) {
  if (job.status === 'failure') return 'border-rose-400/20 bg-rose-400/10 text-rose-300'
  if (job.status === 'running') return 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300'
  if (job.status === 'disabled') return 'border-slate-400/20 bg-slate-400/10 text-slate-300'
  if (job.status === 'success') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
  return 'border-amber-400/20 bg-amber-400/10 text-amber-300'
}

export const ControlRoom: FC = () => {
  const { user } = useAuthStore()
  const { data: canonicalProjects, isLoading: canonicalProjectsLoading } = useCanonicalProjects()
  const { data: canonicalStatus, isLoading: canonicalStatusLoading } = useCanonicalStatus()
  const { data: canonicalTeam, isLoading: canonicalTeamLoading } = useCanonicalTeam()
  const { data: automationStatus, isLoading: automationStatusLoading } = useAutomationStatus()
  const { data: cronJobs, isLoading: cronJobsLoading } = useCronJobs()
  const { data: activities, isLoading: activitiesLoading } = useTeamActivityFeed(5)

  const trackedProjects = useMemo(() => {
    const projects = canonicalProjects?.data ?? []

    return [...projects]
      .filter((project) => project.status.toLowerCase() !== 'archived')
      .sort((a, b) => scoreProject(b) - scoreProject(a) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [canonicalProjects])

  const nextProjects = trackedProjects.slice(0, 3)
  const failedJobs = cronJobs?.ok ? cronJobs.jobs.filter((job) => job.status === 'failure') : []
  const runningJobs = cronJobs?.ok ? cronJobs.jobs.filter((job) => job.status === 'running') : []
  const disabledJobs = cronJobs?.ok ? cronJobs.jobs.filter((job) => job.status === 'disabled') : []
  const activeProjects = trackedProjects.filter((project) => ['active', 'in-progress'].includes(project.status.toLowerCase()))
  const missingNextStep = trackedProjects.filter((project) => !project.nextStep.trim())
  const urgentProjects = trackedProjects.filter((project) => ['urgent', 'high'].includes(project.priority.toLowerCase()))

  const attentionItems = [
    failedJobs[0]
      ? `Cron failure: ${failedJobs[0].name}`
      : null,
    canonicalStatus?.overallStatus === 'degraded'
      ? 'A canonical truth source is degraded'
      : null,
    missingNextStep[0]
      ? `${missingNextStep.length} project${missingNextStep.length > 1 ? 's' : ''} missing next step`
      : null,
    !cronJobs?.ok && automationStatus?.adapterConfigured
      ? 'Gateway configured but runtime cron truth is not reachable'
      : null,
  ].filter(Boolean) as string[]

  const liveSummary = [
    `${activeProjects.length} live project${activeProjects.length === 1 ? '' : 's'}`,
    cronJobs?.ok ? `${cronJobs.jobs.length} runtime cron job${cronJobs.jobs.length === 1 ? '' : 's'}` : 'runtime cron truth unavailable',
    `${canonicalTeam?.length ?? 0} crew tracked`,
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em]">
            <span className="border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-fuchsia-300">canonical truth</span>
            <span className="border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-cyan-300">runtime truth</span>
            <span className="border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-amber-300">fallback aware</span>
          </div>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-white">Control Room</h2>
              <p className="mt-2 max-w-2xl text-sm text-mission-muted">
                Welcome back{user?.name ? `, ${user.name}` : ''}. This is the V3 surface for what is live, what needs attention, and what should move next.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-mission-muted">
                {liveSummary.map((item) => (
                  <span key={item} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.2em] text-mission-muted/70">Attention now</p>
              <p className="mt-1 text-3xl font-semibold text-white">{attentionItems.length}</p>
              <p className="text-xs text-mission-muted">real issues worth looking at first</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <h3 className="text-lg font-semibold">Truth pulse</h3>
          </div>
          <div className="mt-4 space-y-3 text-sm text-mission-muted">
            <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-mission-muted/70">Canonical</p>
              <p className="mt-2 text-white">{canonicalStatus?.overallStatus === 'healthy' ? 'Healthy' : 'Needs review'}</p>
              <p className="mt-1 text-xs">Team roster + project registry health</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-mission-muted/70">Runtime</p>
              <p className="mt-2 text-white">{cronJobs?.ok ? 'Connected' : 'Unavailable'}</p>
              <p className="mt-1 text-xs">{cronJobs?.ok ? cronJobs.source : automationStatus?.nextStep ?? 'Waiting for runtime visibility'}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-mission-muted/70">Last activity</p>
              <p className="mt-2 text-white">{activities?.[0] ? formatRelative(activities[0].createdAt) : 'No recent activity'}</p>
              <p className="mt-1 text-xs">Recent team feed signal</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-white">
            <Database className="h-4 w-4 text-fuchsia-300" />
            <h3 className="text-lg font-semibold">What is live</h3>
          </div>

          <div className="mt-4 space-y-3">
            {canonicalStatusLoading || canonicalProjectsLoading || canonicalTeamLoading ? (
              <div className="flex min-h-[220px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-mission-muted" />
              </div>
            ) : (
              <>
                {[canonicalStatus?.teamRoster, canonicalStatus?.projectRegistry].filter(Boolean).map((source) => {
                  const item = source as CanonicalSourceHealth
                  return (
                    <div key={item.key} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-white">{item.label}</p>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] ${getSourceBadge(item)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-mission-muted">{item.itemCount} items · updated {formatRelative(item.modifiedAt)}</p>
                    </div>
                  )
                })}

                <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-white">Crew registry</p>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-300">
                      {canonicalTeam?.length ?? 0} tracked
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-mission-muted">Independent + subagent structure from canonical roster</p>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <h3 className="text-lg font-semibold">Needs attention</h3>
          </div>

          <div className="mt-4 space-y-3">
            {automationStatusLoading || cronJobsLoading ? (
              <div className="flex min-h-[220px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-mission-muted" />
              </div>
            ) : attentionItems.length > 0 ? (
              attentionItems.map((item) => (
                <div key={item} className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-100">
                  {item}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm text-emerald-200">
                No immediate red flags from the current canonical/runtime signals.
              </div>
            )}

            {cronJobs?.ok && cronJobs.jobs.length > 0 && (
              <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-white">Runtime jobs</p>
                  <span className="text-xs text-mission-muted">{cronJobs.jobs.length} total</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-300">
                    {runningJobs.length} running
                  </span>
                  <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-rose-300">
                    {failedJobs.length} failing
                  </span>
                  <span className="rounded-full border border-slate-400/20 bg-slate-400/10 px-2.5 py-1 text-slate-300">
                    {disabledJobs.length} disabled
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-white">
            <ArrowRight className="h-4 w-4 text-cyan-300" />
            <h3 className="text-lg font-semibold">What moves next</h3>
          </div>

          <div className="mt-4 space-y-3">
            {canonicalProjectsLoading ? (
              <div className="flex min-h-[220px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-mission-muted" />
              </div>
            ) : nextProjects.length > 0 ? (
              nextProjects.map((project) => (
                <div key={project.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{project.name}</p>
                      <p className="mt-1 text-xs text-mission-muted">{project.currentPhase || 'No current phase recorded'}</p>
                    </div>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-300">
                      {project.priority}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-mission-text">{project.nextStep || 'Needs an explicit next step'}</p>
                  <p className="mt-2 text-xs text-mission-muted">Updated {formatRelative(project.updatedAt)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted">
                No ranked projects available yet.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-white">
            <Zap className="h-4 w-4 text-cyan-300" />
            <h3 className="text-lg font-semibold">Runtime watch</h3>
          </div>

          <div className="mt-4 space-y-3">
            {cronJobsLoading ? (
              <div className="flex min-h-[180px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-mission-muted" />
              </div>
            ) : cronJobs?.ok ? (
              cronJobs.jobs.slice(0, 4).map((job) => (
                <div key={job.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{job.name}</p>
                      <p className="mt-1 text-xs text-mission-muted">{job.schedule} · next {formatDate(job.nextRunAt)}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] capitalize ${getJobTone(job)}`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-mission-muted">
                    <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />last {formatRelative(job.lastRunAt)}</span>
                    {job.durationMs != null && <span>{job.durationMs} ms</span>}
                  </div>
                  {job.error && <p className="mt-2 text-xs text-rose-300 line-clamp-2">{job.error}</p>}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-100">
                {cronJobs?.error ?? automationStatus?.nextStep ?? 'Runtime cron truth is not available yet.'}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-white">
            <Users className="h-4 w-4 text-fuchsia-300" />
            <h3 className="text-lg font-semibold">Recent activity</h3>
          </div>

          <div className="mt-4 space-y-3">
            {activitiesLoading ? (
              <div className="flex min-h-[180px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-mission-muted" />
              </div>
            ) : activities && activities.length > 0 ? (
              activities.map((activity) => (
                <div key={activity.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-white/5 p-2 text-cyan-300">
                      <Radio className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-mission-text">{activity.description}</p>
                      <p className="mt-1 text-xs text-mission-muted">
                        {activity.user.name} · {formatRelative(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted">
                No recent activity surfaced yet.
              </div>
            )}

            {!activitiesLoading && urgentProjects.length > 0 && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-100">
                {urgentProjects.length} project{urgentProjects.length > 1 ? 's are' : ' is'} marked high/urgent priority in the canonical registry.
              </div>
            )}

            {!activitiesLoading && attentionItems.length === 0 && (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm text-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Control Room is currently reading clean.
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
