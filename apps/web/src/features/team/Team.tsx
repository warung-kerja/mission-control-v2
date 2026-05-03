import { FC, useMemo } from 'react'
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock3,
  Loader2,
  Radio,
  Users,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { teamApi } from '../../services/api'
import { Badge, Avatar } from '../../components/common/ui'
import { useCanonicalTeam, type CanonicalTeamMember } from '../../hooks'
import { usePresence } from '../../hooks/usePresence'

interface TeamMember {
  id: string
  name: string
  email: string
  avatar: string | null
  role: 'ADMIN' | 'MANAGER' | 'AGENT'
  status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE'
  createdAt: string
  _count: {
    tasks: number
    createdTasks: number
  }
  workload?: {
    total: number
    byStatus: Record<string, number>
    overdue: number
  }
}

function normalizeName(value: string) {
  return value.trim().toLowerCase()
}

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function GroupPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-mission-muted">
      {label}
    </span>
  )
}

function CanonicalNode({ member }: { member: CanonicalTeamMember }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
      <div className="flex items-start gap-3">
        <Avatar fallback={member.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-white">{member.name}</p>
            <Badge className={member.group === 'independent'
              ? 'border border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300'
              : 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-300'}>
              {member.group === 'independent' ? 'Independent' : 'Subagent'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-mission-muted">{member.role}</p>
          <p className="mt-1 text-xs font-mono text-mission-muted/70">{member.model}</p>
          {member.parentAgent && (
            <p className="mt-2 text-xs text-cyan-300">Reports via {member.parentAgent}</p>
          )}
          {member.agentPath && (
            <p className="mt-1 truncate text-[11px] text-mission-muted">{member.agentPath}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export const Team: FC = () => {
  const { data: members, isLoading: runtimeLoading } = useQuery({
    queryKey: ['team', 'members'],
    queryFn: async () => {
      const response = await teamApi.list()
      return response.data.data as TeamMember[]
    },
  })

  const { data: canonicalTeam, isLoading: canonicalLoading } = useCanonicalTeam()
  const { getUserStatus } = usePresence()

  const canonicalSummary = useMemo(() => {
    const roster = canonicalTeam ?? []
    const independents = roster.filter((member) => member.group === 'independent')
    const subagents = roster.filter((member) => member.group === 'subagent')
    const groupedSubagents = subagents.reduce<Record<string, CanonicalTeamMember[]>>((acc, member) => {
      const parent = member.parentAgent || 'Unassigned'
      if (!acc[parent]) acc[parent] = []
      acc[parent].push(member)
      return acc
    }, {})

    return {
      roster,
      independents,
      subagents,
      groupedSubagents,
    }
  }, [canonicalTeam])

  const runtimeSummary = useMemo(() => {
    const roster = members ?? []
    const active = roster.filter((member) => ['ONLINE', 'BUSY', 'AWAY'].includes(member.status)).length
    const overloaded = roster.filter((member) => (member.workload?.overdue || 0) > 0).length
    return { roster, active, overloaded }
  }, [members])

  const mismatchSummary = useMemo(() => {
    const canonicalNames = new Set((canonicalTeam ?? []).map((member) => normalizeName(member.name)))
    const runtimeNames = new Set((members ?? []).map((member) => normalizeName(member.name)))

    const canonicalOnly = (canonicalTeam ?? []).filter((member) => !runtimeNames.has(normalizeName(member.name)))
    const runtimeOnly = (members ?? []).filter((member) => !canonicalNames.has(normalizeName(member.name)))

    return { canonicalOnly, runtimeOnly }
  }, [canonicalTeam, members])

  const getRoleBadge = (role: string) => {
    const variants: Record<string, string> = {
      ADMIN: 'border border-blue-400/20 bg-blue-400/10 text-blue-300',
      MANAGER: 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
      AGENT: 'border border-slate-400/20 bg-slate-400/10 text-slate-300',
    }

    return <Badge className={variants[role] ?? variants.AGENT}>{formatRole(role)}</Badge>
  }

  const getRuntimeStatus = (member: TeamMember) => {
    const live = getUserStatus(member.id)
    if (live && live !== 'offline') return live
    return member.status.toLowerCase() as 'online' | 'away' | 'busy' | 'offline'
  }

  const getWorkloadStats = (member: TeamMember) => {
    const total = member._count?.tasks || 0
    const completed = member.workload?.byStatus?.DONE || 0
    const inProgress = member.workload?.byStatus?.IN_PROGRESS || 0
    const overdue = member.workload?.overdue || 0
    return { total, completed, inProgress, overdue }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.22em]">
            <span className="border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-fuchsia-300">canonical truth</span>
            <span className="border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-cyan-300">runtime roster</span>
          </div>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Crew structure</h3>
              <p className="mt-1 max-w-2xl text-sm text-mission-muted">
                Canonical hierarchy first, then runtime workload and mismatches so the team surface stays honest.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-mission-muted/70">Canonical</p>
                <p className="mt-1 text-2xl font-semibold text-white">{canonicalSummary.roster.length}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-mission-muted/70">Independent</p>
                <p className="mt-1 text-2xl font-semibold text-fuchsia-300">{canonicalSummary.independents.length}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-mission-muted/70">Subagents</p>
                <p className="mt-1 text-2xl font-semibold text-cyan-300">{canonicalSummary.subagents.length}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-mission-muted/70">Runtime live</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-300">{runtimeSummary.active}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <h3 className="text-lg font-semibold">Mismatch watch</h3>
          </div>

          <div className="mt-4 space-y-3 text-sm text-mission-muted">
            <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
              <p className="text-white">Canonical only</p>
              <p className="mt-1 text-xs">{mismatchSummary.canonicalOnly.length} roster entr{mismatchSummary.canonicalOnly.length === 1 ? 'y' : 'ies'} not seen in runtime DB</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
              <p className="text-white">Runtime only</p>
              <p className="mt-1 text-xs">{mismatchSummary.runtimeOnly.length} DB entr{mismatchSummary.runtimeOnly.length === 1 ? 'y' : 'ies'} not represented canonically</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
              <p className="text-white">Overdue workload</p>
              <p className="mt-1 text-xs">{runtimeSummary.overloaded} runtime member{runtimeSummary.overloaded === 1 ? '' : 's'} carrying overdue tasks</p>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-2 text-white">
          <Users className="h-4 w-4 text-fuchsia-300" />
          <h3 className="text-lg font-semibold">Canonical hierarchy</h3>
        </div>

        {canonicalLoading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-mission-muted" />
          </div>
        ) : canonicalSummary.roster.length > 0 ? (
          <div className="mt-4 space-y-5">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <GroupPill label="Independent agents" />
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {canonicalSummary.independents.map((member) => (
                  <CanonicalNode key={member.name} member={member} />
                ))}
              </div>
            </div>

            {Object.entries(canonicalSummary.groupedSubagents).length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <GroupPill label="Subagent groups" />
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {Object.entries(canonicalSummary.groupedSubagents).map(([parent, children]) => (
                    <div key={parent} className="rounded-2xl border border-white/8 bg-[#07111f]/70 p-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-cyan-300" />
                        <p className="font-medium text-white">{parent}</p>
                        <span className="text-xs text-mission-muted">{children.length} subagent{children.length === 1 ? '' : 's'}</span>
                      </div>
                      <div className="mt-3 grid gap-3">
                        {children.map((member) => (
                          <CanonicalNode key={`${parent}-${member.name}`} member={member} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-6 text-center text-sm text-mission-muted">
            Canonical roster unavailable.
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-white">
            <Briefcase className="h-4 w-4 text-cyan-300" />
            <h3 className="text-lg font-semibold">Runtime roster</h3>
          </div>

          {runtimeLoading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-mission-muted" />
            </div>
          ) : runtimeSummary.roster.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {runtimeSummary.roster.map((member) => {
                const runtimeStatus = getRuntimeStatus(member)
                const workload = getWorkloadStats(member)

                return (
                  <div key={member.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                    <div className="flex items-start gap-3">
                      <Avatar
                        fallback={member.name}
                        size="lg"
                        status={runtimeStatus}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">{member.name}</p>
                          {getRoleBadge(member.role)}
                          <Badge className="border border-white/8 bg-white/[0.03] text-mission-muted capitalize">
                            {runtimeStatus}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-mission-muted">{member.email}</p>

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-mission-muted">
                          <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{workload.total} tasks</span>
                          <span className="flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />{workload.completed} done</span>
                          <span className="flex items-center gap-1 text-amber-300"><Clock3 className="h-3.5 w-3.5" />{workload.inProgress} active</span>
                          {workload.overdue > 0 && (
                            <span className="flex items-center gap-1 text-rose-300"><AlertTriangle className="h-3.5 w-3.5" />{workload.overdue} overdue</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-6 text-center text-sm text-mission-muted">
              No runtime team data returned.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-white">
            <Radio className="h-4 w-4 text-amber-300" />
            <h3 className="text-lg font-semibold">Roster gaps</h3>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-mission-muted/70">Canonical only</p>
              <div className="space-y-2">
                {mismatchSummary.canonicalOnly.length > 0 ? mismatchSummary.canonicalOnly.map((member) => (
                  <div key={`canonical-${member.name}`} className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-sm text-amber-100">
                    <p className="font-medium">{member.name}</p>
                    <p className="mt-1 text-xs">Exists in canonical roster, not in runtime DB</p>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-100">
                    Canonical roster is represented in runtime DB.
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-mission-muted/70">Runtime only</p>
              <div className="space-y-2">
                {mismatchSummary.runtimeOnly.length > 0 ? mismatchSummary.runtimeOnly.map((member) => (
                  <div key={`runtime-${member.id}`} className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-sm text-rose-100">
                    <p className="font-medium">{member.name}</p>
                    <p className="mt-1 text-xs">Present in runtime DB, missing from canonical roster</p>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-100">
                    No runtime-only roster drift detected.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
