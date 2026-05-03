import { FC, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  PauseCircle,
  Radio,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'
import { useAutomationStatus, useCronJobs, type CronJob } from '../../hooks'

type StatusFilter = 'all' | 'healthy' | 'failing' | 'disabled'

type JobTone = 'healthy' | 'failing' | 'running' | 'disabled' | 'pending'

function formatDateTime(value: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatRelative(value: string | null) {
  if (!value) return null

  const target = new Date(value)
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()
  const tense = diffMs >= 0 ? 'in' : ''
  const absoluteMs = Math.abs(diffMs)
  const mins = Math.round(absoluteMs / 60000)
  const hours = Math.round(absoluteMs / 3600000)
  const days = Math.round(absoluteMs / 86400000)

  if (mins < 60) {
    return diffMs >= 0 ? `in ${mins}m` : `${mins}m ago`
  }

  if (hours < 48) {
    return diffMs >= 0 ? `${tense} ${hours}h`.trim() : `${hours}h ago`
  }

  return diffMs >= 0 ? `${tense} ${days}d`.trim() : `${days}d ago`
}

function getJobTone(job: CronJob): JobTone {
  if (job.status === 'disabled') return 'disabled'
  if (job.status === 'failure') return 'failing'
  if (job.status === 'running') return 'running'
  if (job.status === 'success') return 'healthy'
  return 'pending'
}

function getScheduleKind(schedule: string) {
  const lower = schedule.toLowerCase()

  if (schedule === '—') return 'unknown'
  if (lower.startsWith('every ')) return 'recurring'
  if (lower.includes('once') || lower.includes('one-shot')) return 'one-shot'
  return 'recurring'
}

const toneClasses: Record<JobTone, string> = {
  healthy: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  failing: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  running: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  disabled: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  pending: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
}

const sourceTone = {
  runtime: 'border border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300',
  fallback: 'border border-amber-400/20 bg-amber-400/10 text-amber-300',
} as const

export const Calendar: FC = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const { data: automationStatus, isLoading: automationStatusLoading } = useAutomationStatus()
  const { data: cronJobs, isLoading: cronJobsLoading } = useCronJobs()

  const jobs = cronJobs?.ok ? cronJobs.jobs : []

  const summary = useMemo(() => {
    const enabled = jobs.filter((job) => job.status !== 'disabled')
    const failing = jobs.filter((job) => job.status === 'failure')
    const running = jobs.filter((job) => job.status === 'running')
    const disabled = jobs.filter((job) => job.status === 'disabled')

    const nextRun = enabled
      .filter((job) => job.nextRunAt)
      .sort((a, b) => new Date(a.nextRunAt ?? 0).getTime() - new Date(b.nextRunAt ?? 0).getTime())[0] ?? null

    return {
      total: jobs.length,
      enabled: enabled.length,
      failing: failing.length,
      running: running.length,
      disabled: disabled.length,
      nextRun,
    }
  }, [jobs])

  const filteredJobs = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase()

    return jobs.filter((job) => {
      const matchesFilter =
        statusFilter === 'all' ||
        (statusFilter === 'healthy' && (job.status === 'success' || job.status === 'running')) ||
        (statusFilter === 'failing' && job.status === 'failure') ||
        (statusFilter === 'disabled' && job.status === 'disabled')

      const matchesQuery = !normalisedQuery || `${job.name} ${job.schedule} ${job.error ?? ''}`.toLowerCase().includes(normalisedQuery)

      return matchesFilter && matchesQuery
    })
  }, [jobs, query, statusFilter])

  const isLoading = automationStatusLoading || cronJobsLoading

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.22em]">
                <span className={sourceTone.runtime}>runtime truth</span>
                <span className={sourceTone.fallback}>fallback aware</span>
              </div>
              <h3 className="text-xl font-semibold text-white">Automation audit</h3>
              <p className="mt-1 max-w-2xl text-sm text-mission-muted">
                This is the screen for proving what is actually scheduled, what is disabled, and what needs attention.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-mission-muted">
              <CalendarClock className="h-4 w-4 text-cyan-300" />
              {cronJobs?.fetchedAt ? `Checked ${formatDateTime(cronJobs.fetchedAt)}` : 'Waiting for runtime data'}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-mission-muted/80">Total jobs</p>
              <p className="mt-2 text-3xl font-semibold text-white">{summary.total}</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">Enabled</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-300">{summary.enabled}</p>
            </div>
            <div className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-rose-200/80">Failing</p>
              <p className="mt-2 text-3xl font-semibold text-rose-300">{summary.failing}</p>
            </div>
            <div className="rounded-2xl border border-slate-400/15 bg-slate-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-200/80">Disabled</p>
              <p className="mt-2 text-3xl font-semibold text-slate-300">{summary.disabled}</p>
            </div>
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Next run</p>
              <p className="mt-2 text-sm font-semibold text-cyan-200">
                {summary.nextRun ? formatRelative(summary.nextRun.nextRunAt) ?? formatDateTime(summary.nextRun.nextRunAt) : '—'}
              </p>
              <p className="mt-1 text-xs text-mission-muted">{summary.nextRun?.name ?? 'No enabled job with a next run'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <h3 className="text-lg font-semibold text-white">Runtime state</h3>

          {isLoading ? (
            <div className="flex min-h-[180px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-mission-muted" />
            </div>
          ) : cronJobs?.ok ? (
            <div className="mt-4 space-y-3 text-sm text-mission-muted">
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="font-medium">Live cron visibility is healthy</p>
                </div>
                <p className="mt-2 text-xs text-emerald-100/80">Source: {cronJobs.source}</p>
              </div>
              <div className="grid gap-2 text-xs">
                <p><span className="text-white">Running now:</span> {summary.running}</p>
                <p><span className="text-white">Failed jobs:</span> {summary.failing}</p>
                <p><span className="text-white">Disabled jobs:</span> {summary.disabled}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3 text-sm text-mission-muted">
              <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] p-4">
                <div className="flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="font-medium">Runtime truth is unavailable</p>
                </div>
                <p className="mt-2 text-xs text-amber-100/80">{cronJobs?.error ?? 'No live cron data returned.'}</p>
              </div>

              {automationStatus && (
                <div className="grid gap-2 text-xs">
                  <p><span className="text-white">Visibility mode:</span> {automationStatus.visibility}</p>
                  <p><span className="text-white">CLI detected:</span> {automationStatus.cliDetected ? 'yes' : 'no'}</p>
                  <p><span className="text-white">Gateway URL:</span> {automationStatus.gatewayUrlConfigured ? 'set' : 'missing'}</p>
                  <p><span className="text-white">Gateway token:</span> {automationStatus.gatewayTokenConfigured ? 'set' : 'missing'}</p>
                  <p><span className="text-white">Next step:</span> {automationStatus.nextStep}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              ['all', 'All jobs'],
              ['healthy', 'Healthy'],
              ['failing', 'Failing'],
              ['disabled', 'Disabled'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === value ? 'bg-cyan-400/15 text-cyan-300' : 'bg-white/[0.04] text-mission-muted hover:text-mission-text'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mission-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter jobs by name or schedule..."
              className="w-full rounded-xl border border-white/8 bg-[#07111f]/70 py-2.5 pl-10 pr-4 text-sm text-mission-text placeholder:text-mission-muted focus:border-cyan-400/40 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-mission-muted" />
            </div>
          ) : filteredJobs.length > 0 ? (
            filteredJobs.map((job) => {
              const tone = getJobTone(job)
              const scheduleKind = getScheduleKind(job.schedule)
              const isFailure = tone === 'failing'
              const isRunning = tone === 'running'

              return (
                <article key={job.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4 transition-colors hover:border-white/15">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold text-white">{job.name}</h4>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${toneClasses[tone]}`}>
                          {job.status}
                        </span>
                        <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-mission-muted">
                          {scheduleKind}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 text-sm text-mission-muted md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-mission-muted/70">Schedule</p>
                          <p className="mt-1 text-mission-text">{job.schedule}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-mission-muted/70">Last run</p>
                          <p className="mt-1 text-mission-text">{formatDateTime(job.lastRunAt)}</p>
                          <p className="text-xs">{formatRelative(job.lastRunAt) ?? 'No prior run recorded'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-mission-muted/70">Next run</p>
                          <p className="mt-1 text-mission-text">{formatDateTime(job.nextRunAt)}</p>
                          <p className="text-xs">{formatRelative(job.nextRunAt) ?? 'No future run scheduled'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-mission-muted/70">Duration</p>
                          <p className="mt-1 text-mission-text">{job.durationMs != null ? `${job.durationMs} ms` : '—'}</p>
                        </div>
                      </div>

                      {job.error && (
                        <div className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] p-3 text-sm text-rose-200">
                          <p className="font-medium text-rose-300">Last error</p>
                          <p className="mt-1 text-xs leading-relaxed">{job.error}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row items-center gap-2 xl:flex-col xl:items-end">
                      {tone === 'healthy' && <CheckCircle2 className="h-5 w-5 text-emerald-300" />}
                      {isFailure && <XCircle className="h-5 w-5 text-rose-300" />}
                      {isRunning && <RefreshCw className="h-5 w-5 animate-spin text-cyan-300" />}
                      {tone === 'disabled' && <PauseCircle className="h-5 w-5 text-slate-300" />}
                      {tone === 'pending' && <Clock3 className="h-5 w-5 text-amber-300" />}
                      <span className="text-xs text-mission-muted">ID: {job.id}</span>
                    </div>
                  </div>
                </article>
              )
            })
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-6 text-center">
              <Radio className="h-8 w-8 text-mission-muted" />
              <p className="mt-3 text-sm text-mission-text">No jobs match this filter right now.</p>
              <p className="mt-1 text-xs text-mission-muted">Change the status filter or widen the search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
