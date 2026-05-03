import { FC, useMemo } from 'react'
import {
  Activity,
  CheckCircle2,
  Database,
  FolderKanban,
  Loader2,
  Radio,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useCanonicalProjects, useCanonicalStatus, useCanonicalTeam } from '../../hooks/useCanonical'
import { useTeamActivityFeed } from '../../hooks/useDashboard'
import { useAutomationStatus, useCronJobs } from '../../hooks/useSystem'
import { useMemoryStats } from '../../hooks/useMemories'

function formatRelative(value: string | null) {
  if (!value) return '—'
  const now = Date.now()
  const then = new Date(value).getTime()
  const diffMs = now - then
  const hours = Math.round(diffMs / 3600000)
  const days = Math.round(diffMs / 86400000)
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export const Signals: FC = () => {
  const { data: canonicalStatus, isLoading: canonicalLoading } = useCanonicalStatus()
  const { data: canonicalProjects, isLoading: projectsLoading } = useCanonicalProjects()
  const { data: canonicalTeam, isLoading: teamLoading } = useCanonicalTeam()
  const { data: activity } = useTeamActivityFeed(6)
  const { data: automationStatus, isLoading: automationLoading } = useAutomationStatus()
  const { data: cronJobs, isLoading: cronLoading } = useCronJobs()
  const { data: memoryStats, isLoading: memoryLoading } = useMemoryStats()

  const projectData = canonicalProjects?.data ?? []
  const liveProjects = projectData.filter((project) => ['active', 'in-progress'].includes(project.status.toLowerCase()))
  const urgentProjects = projectData.filter((project) => ['urgent', 'high'].includes(project.priority.toLowerCase()))
  const failedJobs = cronJobs?.ok ? cronJobs.jobs.filter((job) => job.status === 'failure') : []

  const attentionItems = useMemo(() => {
    const items: string[] = []
    if (canonicalStatus?.overallStatus === 'degraded') items.push('Canonical truth source degraded')
    if (!cronJobs?.ok) items.push('Runtime cron truth unavailable')
    if (failedJobs.length > 0) items.push(`${failedJobs.length} cron job${failedJobs.length === 1 ? '' : 's'} failing`)
    if ((memoryStats?.archived ?? 0) > (memoryStats?.active ?? 0)) items.push('Archived memory outweighs active memory')
    return items
  }, [canonicalStatus, cronJobs, failedJobs.length, memoryStats])

  const isLoading = canonicalLoading || projectsLoading || teamLoading || automationLoading || cronLoading || memoryLoading

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="mb-2 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.22em]">
            <span className="border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-fuchsia-300">canonical truth</span>
            <span className="border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-cyan-300">runtime signals</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Signals</h3>
          <p className="mt-1 max-w-2xl text-sm text-mission-muted">
            A lighter V3 utility surface for overall system health, signal drift, and what looks worth noticing.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-100/80">Truth status</p>
              <p className="mt-2 text-2xl font-semibold text-fuchsia-300">{canonicalStatus?.overallStatus ?? '—'}</p>
            </div>
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Live projects</p>
              <p className="mt-2 text-2xl font-semibold text-cyan-300">{liveProjects.length}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">High priority</p>
              <p className="mt-2 text-2xl font-semibold text-amber-300">{urgentProjects.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Crew tracked</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">{canonicalTeam?.length ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <h3 className="text-lg font-semibold">Attention stack</h3>
          </div>
          <div className="mt-4 space-y-3">
            {attentionItems.length > 0 ? attentionItems.map((item) => (
              <div key={item} className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-100">
                {item}
              </div>
            )) : (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm text-emerald-100">
                No obvious system-level warning from current signals.
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-mission-muted" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-2 text-white">
              <Database className="h-4 w-4 text-fuchsia-300" />
              <h3 className="text-lg font-semibold">Truth sources</h3>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[canonicalStatus?.teamRoster, canonicalStatus?.projectRegistry].filter(Boolean).map((source) => (
                <div key={source!.key} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                  <p className="font-medium text-white">{source!.label}</p>
                  <p className="mt-2 text-sm text-mission-text">{source!.status}</p>
                  <p className="mt-1 text-xs text-mission-muted">{source!.itemCount} items · updated {formatRelative(source!.modifiedAt)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-2 text-white">
              <Zap className="h-4 w-4 text-cyan-300" />
              <h3 className="text-lg font-semibold">Automation signal</h3>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                <p className="text-sm text-white">Visibility: {automationStatus?.visibility ?? '—'}</p>
                <p className="mt-1 text-xs text-mission-muted">Provider: {automationStatus?.provider ?? '—'}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                <p className="text-sm text-white">Cron runtime</p>
                <p className="mt-1 text-xs text-mission-muted">
                  {cronJobs?.ok ? `${cronJobs.jobs.length} jobs visible` : cronJobs?.error ?? 'No live cron data'}
                </p>
                {failedJobs.length > 0 && (
                  <p className="mt-2 text-xs text-rose-300">Failing: {failedJobs.map((job) => job.name).slice(0, 2).join(', ')}</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-2 text-white">
              <FolderKanban className="h-4 w-4 text-amber-300" />
              <h3 className="text-lg font-semibold">Project pulse</h3>
            </div>
            <div className="mt-4 space-y-3">
              {liveProjects.slice(0, 5).map((project) => (
                <div key={project.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-white">{project.name}</p>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-300">
                      {project.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-mission-text">{project.nextStep || 'No next step recorded'}</p>
                  <p className="mt-1 text-xs text-mission-muted">Updated {formatRelative(project.updatedAt)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-2 text-white">
              <Activity className="h-4 w-4 text-emerald-300" />
              <h3 className="text-lg font-semibold">Recent signals</h3>
            </div>
            <div className="mt-4 space-y-3">
              {activity && activity.length > 0 ? activity.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-white/5 p-2 text-cyan-300">
                      <Radio className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-mission-text">{item.description}</p>
                      <p className="mt-1 text-xs text-mission-muted">{item.user.name} · {formatRelative(item.createdAt)}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted">
                  No recent activity signal.
                </div>
              )}

              <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <p className="font-medium">Memory health</p>
                </div>
                <p className="mt-2 text-sm text-mission-text">{memoryStats?.active ?? 0} active · {memoryStats?.recent ?? 0} recent</p>
                <p className="mt-1 text-xs text-mission-muted">Runtime memory DB summary</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
