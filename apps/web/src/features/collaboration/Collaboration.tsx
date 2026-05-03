import { FC, useMemo } from 'react'
import {
  Activity,
  FolderKanban,
  MessageSquare,
  Radio,
  Users,
  Wifi,
} from 'lucide-react'
import { useCanonicalProjects, useCanonicalTeam } from '../../hooks/useCanonical'
import { useTeamActivityFeed } from '../../hooks/useDashboard'
import { usePresence } from '../../hooks/usePresence'

const formatRelative = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const Collaboration: FC = () => {
  const { data: canonicalTeam, isLoading: teamLoading } = useCanonicalTeam()
  const { data: canonicalProjects, isLoading: projectsLoading } = useCanonicalProjects()
  const { data: activity, isLoading: activityLoading } = useTeamActivityFeed(8)
  const { onlineCount, userStatuses } = usePresence()

  const activeProjects = (canonicalProjects?.data ?? []).filter((project) =>
    ['active', 'in-progress'].includes(project.status.toLowerCase()),
  )

  const statusSummary = useMemo(() => {
    const counts = { online: 0, away: 0, busy: 0, offline: 0 }
    for (const status of userStatuses.values()) {
      counts[status] += 1
    }
    return counts
  }, [userStatuses])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="mb-2 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.22em]">
            <span className="border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-cyan-300">external comms first</span>
            <span className="border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-300">read-only coordination watch</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Collaboration</h3>
          <p className="mt-1 max-w-2xl text-sm text-mission-muted">
            Mission Control should reflect team coordination, not pretend to replace Telegram, Discord, or OpenClaw routing.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Crew tracked</p>
              <p className="mt-2 text-2xl font-semibold text-cyan-300">{canonicalTeam?.length ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Live presence</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">{onlineCount}</p>
            </div>
            <div className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-100/80">Active projects</p>
              <p className="mt-2 text-2xl font-semibold text-fuchsia-300">{activeProjects.length}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">Recent events</p>
              <p className="mt-2 text-2xl font-semibold text-amber-300">{activity?.length ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-white">
            <MessageSquare className="h-4 w-4 text-cyan-300" />
            <h3 className="text-lg font-semibold">Operating note</h3>
          </div>
          <div className="mt-4 space-y-3 text-sm text-mission-text">
            <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
              Primary agent coordination stays in external channels.
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
              This screen is for coordination awareness: who looks live, what moved, and which projects are active.
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4 text-mission-muted">
              No fake in-app chat surface, no parallel source of truth.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-white">
            <Wifi className="h-4 w-4 text-emerald-300" />
            <h3 className="text-lg font-semibold">Presence telemetry</h3>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ['online', statusSummary.online],
              ['away', statusSummary.away],
              ['busy', statusSummary.busy],
              ['offline', statusSummary.offline],
            ].map(([label, count]) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-mission-muted">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{count}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted">
            Presence is runtime telemetry only. Crew names still come from the canonical roster.
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-white">
            <FolderKanban className="h-4 w-4 text-fuchsia-300" />
            <h3 className="text-lg font-semibold">Active project lanes</h3>
          </div>

          <div className="mt-4 space-y-3">
            {projectsLoading ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted">
                Loading project lanes...
              </div>
            ) : activeProjects.length > 0 ? (
              activeProjects.slice(0, 6).map((project) => (
                <div key={project.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{project.name}</p>
                    <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-[11px] text-fuchsia-300">
                      {project.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-mission-text">{project.nextStep || 'No next step recorded'}</p>
                  <p className="mt-1 text-xs text-mission-muted">Owner: {project.owner}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted">
                No active project lanes visible.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)] xl:col-span-2">
          <div className="flex items-center gap-2 text-white">
            <Activity className="h-4 w-4 text-amber-300" />
            <h3 className="text-lg font-semibold">Recent coordination signals</h3>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {activityLoading ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted md:col-span-2">
                Loading activity feed...
              </div>
            ) : activity && activity.length > 0 ? (
              activity.map((item) => (
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
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted md:col-span-2">
                No recent coordination events visible.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)] xl:col-span-2">
          <div className="flex items-center gap-2 text-white">
            <Users className="h-4 w-4 text-cyan-300" />
            <h3 className="text-lg font-semibold">Canonical crew watch</h3>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {teamLoading ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted md:col-span-2 xl:col-span-3">
                Loading canonical crew...
              </div>
            ) : (
              (canonicalTeam ?? []).map((member) => (
                <div key={`${member.name}-${member.role}`} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                  <p className="font-medium text-white">{member.name}</p>
                  <p className="mt-1 text-sm text-mission-text">{member.role}</p>
                  <p className="mt-2 text-xs text-mission-muted">{member.model}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
