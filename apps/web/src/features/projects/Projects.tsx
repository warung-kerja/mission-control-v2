import { FC, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  FolderKanban,
  PauseCircle,
  Search,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import { useCanonicalProjects, type CanonicalProject } from '../../hooks/useCanonical'

type StatusFilter = 'ALL' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'

interface RankedProject extends CanonicalProject {
  rank: number
  urgencyLabel: string
}

const priorityTone: Record<string, string> = {
  urgent: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  high: 'border-orange-400/20 bg-orange-400/10 text-orange-300',
  medium: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  low: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
}

const statusTone: Record<string, string> = {
  active: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  'in-progress': 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  paused: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  completed: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
  archived: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatRelative(value: string) {
  const now = Date.now()
  const target = new Date(value).getTime()
  const diffMs = now - target
  const hours = Math.round(diffMs / 3600000)
  const days = Math.round(diffMs / 86400000)

  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function scoreProject(project: CanonicalProject) {
  const priority = project.priority.toLowerCase()
  const status = project.status.toLowerCase()

  const priorityScore = priority === 'urgent' ? 5 : priority === 'high' ? 4 : priority === 'medium' ? 3 : 2
  const statusScore = status === 'active' ? 5 : status === 'in-progress' ? 4 : status === 'paused' ? 2 : status === 'completed' ? 1 : 0
  const missingNextStepPenalty = project.nextStep.trim() ? 0 : -2
  const staleDays = Math.floor((Date.now() - new Date(project.updatedAt).getTime()) / 86400000)
  const freshnessScore = staleDays <= 3 ? 2 : staleDays <= 7 ? 1 : 0

  return priorityScore + statusScore + freshnessScore + missingNextStepPenalty
}

function labelUrgency(project: CanonicalProject) {
  const priority = project.priority.toLowerCase()
  const status = project.status.toLowerCase()

  if (!project.nextStep.trim()) return 'Needs next step'
  if (priority === 'urgent') return 'Urgent priority'
  if (status === 'paused') return 'Paused but still tracked'
  if (status === 'active' || status === 'in-progress') return 'Active focus'
  return 'Monitor'
}

function matchesStatusFilter(project: CanonicalProject, filter: StatusFilter) {
  const status = project.status.toLowerCase()

  if (filter === 'ALL') return status !== 'archived'
  if (filter === 'ACTIVE') return status === 'active' || status === 'in-progress'
  if (filter === 'PAUSED') return status === 'paused'
  if (filter === 'COMPLETED') return status === 'completed'
  return true
}

export const Projects: FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const { data: canonicalProjects, isLoading } = useCanonicalProjects()

  const rankedProjects = useMemo<RankedProject[]>(() => {
    const projects = canonicalProjects?.data ?? []

    return [...projects]
      .filter((project) => matchesStatusFilter(project, statusFilter))
      .filter((project) => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) return true
        return `${project.name} ${project.currentPhase} ${project.nextStep} ${project.owner}`.toLowerCase().includes(query)
      })
      .map((project) => ({
        ...project,
        rank: scoreProject(project),
        urgencyLabel: labelUrgency(project),
      }))
      .sort((a, b) => b.rank - a.rank || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [canonicalProjects, searchQuery, statusFilter])

  const topProjects = rankedProjects.slice(0, 3)

  const summary = useMemo(() => {
    const allProjects = canonicalProjects?.data ?? []
    const live = allProjects.filter((project) => ['active', 'in-progress'].includes(project.status.toLowerCase())).length
    const urgent = allProjects.filter((project) => ['urgent', 'high'].includes(project.priority.toLowerCase())).length
    const paused = allProjects.filter((project) => project.status.toLowerCase() === 'paused').length
    const needsNextStep = allProjects.filter((project) => !project.nextStep.trim()).length

    return { live, urgent, paused, needsNextStep }
  }, [canonicalProjects])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.22em]">
                <span className="border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-fuchsia-300">canonical truth</span>
                <span className="border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-cyan-300">what moves next</span>
              </div>
              <h2 className="text-xl font-semibold text-white">Projects</h2>
              <h3 className="text-sm font-medium text-mission-muted mt-1">Project focus board — what moves next</h3>
              <p className="mt-1 max-w-2xl text-sm text-mission-muted">
                Canonical project registry, ranked for attention instead of buried in a flat list.
              </p>
            </div>

            <div className="text-xs text-mission-muted">
              {canonicalProjects?.meta?.lastUpdated ? `Registry updated ${formatDate(canonicalProjects.meta.lastUpdated)}` : 'Waiting for registry metadata'}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Live now</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-300">{summary.live}</p>
            </div>
            <div className="rounded-2xl border border-orange-400/15 bg-orange-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-orange-100/80">High priority</p>
              <p className="mt-2 text-3xl font-semibold text-orange-300">{summary.urgent}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">Paused</p>
              <p className="mt-2 text-3xl font-semibold text-amber-300">{summary.paused}</p>
            </div>
            <div className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-rose-100/80">Missing next step</p>
              <p className="mt-2 text-3xl font-semibold text-rose-300">{summary.needsNextStep}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <h3 className="text-lg font-semibold text-white">Next movers</h3>
          <div className="mt-4 space-y-3">
            {topProjects.length > 0 ? topProjects.map((project, index) => (
              <div key={project.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                <div className="flex items-center gap-2 text-xs text-mission-muted">
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                  <span>Priority slot {index + 1}</span>
                </div>
                <h4 className="mt-2 text-base font-semibold text-white">{project.name}</h4>
                <p className="mt-1 text-sm text-mission-muted">{project.urgencyLabel}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-mission-muted/70">Next step</p>
                <p className="mt-1 text-sm text-mission-text">{project.nextStep || 'No next step recorded yet'}</p>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted">
                No ranked projects yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              ['ALL', 'All live'],
              ['ACTIVE', 'Active'],
              ['PAUSED', 'Paused'],
              ['COMPLETED', 'Completed'],
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
              type="text"
              placeholder="Search by project, phase, next step, owner..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-white/8 bg-[#07111f]/70 py-2.5 pl-10 pr-4 text-sm text-mission-text placeholder:text-mission-muted focus:border-cyan-400/40 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {isLoading ? (
            <div className="col-span-full flex min-h-[260px] items-center justify-center text-mission-muted">
              Loading canonical projects...
            </div>
          ) : rankedProjects.length > 0 ? (
            rankedProjects.map((project) => {
              const priorityKey = project.priority.toLowerCase()
              const statusKey = project.status.toLowerCase()

              return (
                <article key={project.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-5 transition-colors hover:border-white/15">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                          <FolderKanban className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white">{project.name}</h4>
                          <p className="text-sm text-mission-muted">Owner: {project.owner}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium">
                        <span className={`rounded-full border px-2.5 py-1 capitalize ${statusTone[statusKey] ?? statusTone.archived}`}>
                          {project.status}
                        </span>
                        <span className={`rounded-full border px-2.5 py-1 capitalize ${priorityTone[priorityKey] ?? priorityTone.low}`}>
                          {project.priority}
                        </span>
                        <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-mission-muted">
                          Score {project.rank}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-mission-muted/70">
                            <Target className="h-3.5 w-3.5" />
                            Current phase
                          </p>
                          <p className="mt-2 text-sm text-mission-text">{project.currentPhase || 'No current phase recorded'}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-mission-muted/70">
                            <ArrowRight className="h-3.5 w-3.5" />
                            What moves next
                          </p>
                          <p className="mt-2 text-sm text-mission-text">{project.nextStep || 'Needs explicit next step'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row gap-2 lg:flex-col lg:items-end">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-right">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-mission-muted/70">Updated</p>
                        <p className="mt-1 text-sm text-white">{formatRelative(project.updatedAt)}</p>
                        <p className="text-xs text-mission-muted">{formatDate(project.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/8 pt-4 text-xs text-mission-muted">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {project.team.length} teammates
                    </span>
                    {project.status.toLowerCase() === 'paused' && (
                      <span className="flex items-center gap-1.5 text-amber-300">
                        <PauseCircle className="h-3.5 w-3.5" />
                        Paused state
                      </span>
                    )}
                    {!project.nextStep.trim() && (
                      <span className="flex items-center gap-1.5 text-rose-300">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Missing next step
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" />
                      Source: {canonicalProjects?.source ?? 'canonical registry'}
                    </span>
                  </div>
                </article>
              )
            })
          ) : (
            <div className="col-span-full flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-6 text-center">
              <Search className="h-8 w-8 text-mission-muted" />
              <p className="mt-3 text-sm text-mission-text">No projects match this view.</p>
              <p className="mt-1 text-xs text-mission-muted">Try widening the search or changing the filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
