import { FC } from 'react'
import {
  Loader2,
  Briefcase,
  CheckCircle,
  Clock,
  AlertCircle,
  BookUser,
  ChevronRight,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { teamApi } from '../../services/api'
import { Badge, Avatar } from '../../components/common/ui'
import { useCanonicalTeam, type CanonicalTeamMember } from '../../hooks'

// ---------------------------------------------------------------------------
// DB-backed types (runtime/workload data)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const GroupLabel: FC<{ label: string }> = ({ label }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wider text-mission-muted mb-3 mt-6 first:mt-0">
    {label}
  </h3>
)

const CanonicalMemberCard: FC<{ member: CanonicalTeamMember }> = ({ member }) => (
  <div className="flex items-center gap-3 p-3 bg-mission-bg border border-mission-border rounded-lg hover:border-primary-500/30 transition-colors">
    <Avatar fallback={member.name} size="md" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-mission-text">{member.name}</span>
        {member.parentAgent && (
          <span className="text-xs text-mission-muted">
            via {member.parentAgent}
          </span>
        )}
      </div>
      <p className="text-xs text-mission-muted truncate">{member.role}</p>
      <p className="text-xs text-mission-muted/60 truncate font-mono">{member.model}</p>
    </div>
    <Badge className={
      member.group === 'independent'
        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
        : 'bg-mission-border text-mission-muted'
    }>
      {member.group === 'independent' ? 'Independent' : 'Subagent'}
    </Badge>
  </div>
)

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const Team: FC = () => {
  const { data: members, isLoading: dbLoading } = useQuery({
    queryKey: ['team', 'members'],
    queryFn: async () => {
      const response = await teamApi.list()
      return response.data.data as TeamMember[]
    },
  })

  const { data: canonicalTeam, isLoading: canonicalLoading } = useCanonicalTeam()

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      ADMIN: { className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', label: 'Admin' },
      MANAGER: { className: 'bg-green-500/10 text-green-400 border border-green-500/20', label: 'Manager' },
      AGENT: { className: 'bg-mission-border text-mission-muted', label: 'Agent' },
    }
    const config = variants[role] || { className: 'bg-mission-border text-mission-muted', label: role }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getWorkloadStats = (member: TeamMember) => {
    const total = member._count?.tasks || 0
    const completed = member.workload?.byStatus?.DONE || 0
    const inProgress = member.workload?.byStatus?.IN_PROGRESS || 0
    const overdue = member.workload?.overdue || 0
    return { total, completed, inProgress, overdue }
  }

  // Group canonical members
  const independentAgents = canonicalTeam?.filter((m) => m.group === 'independent') ?? []
  const subagents = canonicalTeam?.filter((m) => m.group === 'subagent') ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-mission-text">Team</h2>
        <p className="text-sm text-mission-muted">Canonical roster and runtime workload</p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Canonical Roster section — truth from AGENTS_ROSTER.md              */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-mission-card border border-mission-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookUser className="w-4 h-4 text-primary-400" />
          <h3 className="font-semibold text-mission-text">Canonical Roster</h3>
          <span className="ml-auto text-xs text-mission-muted">AGENTS_ROSTER.md</span>
        </div>

        {canonicalLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
          </div>
        ) : canonicalTeam && canonicalTeam.length > 0 ? (
          <>
            {independentAgents.length > 0 && (
              <>
                <GroupLabel label="Independent" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {independentAgents.map((m) => (
                    <CanonicalMemberCard key={m.name} member={m} />
                  ))}
                </div>
              </>
            )}
            {subagents.length > 0 && (
              <>
                <GroupLabel label="Subagents" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {subagents.map((m) => (
                    <CanonicalMemberCard key={m.name} member={m} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <p className="text-sm text-mission-muted text-center py-6">
            Canonical roster unavailable — AGENTS_ROSTER.md not found
          </p>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Runtime workload section — from DB                                  */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="w-4 h-4 text-mission-muted" />
          <h3 className="font-semibold text-mission-text">Runtime Workload</h3>
          <ChevronRight className="w-3 h-3 text-mission-muted" />
          <span className="text-xs text-mission-muted">Live DB</span>
        </div>

        {dbLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
          </div>
        ) : members && members.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map((member) => {
              const workload = getWorkloadStats(member)
              return (
                <div
                  key={member.id}
                  className="bg-mission-card border border-mission-border rounded-xl p-5 hover:border-primary-500/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <Avatar
                      fallback={member.name}
                      size="lg"
                      status={member.status.toLowerCase() as 'online' | 'away' | 'busy' | 'offline'}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-mission-text">{member.name}</h4>
                        {getRoleBadge(member.role)}
                      </div>
                      <p className="text-sm text-mission-muted truncate">{member.email}</p>

                      {/* Workload Stats */}
                      <div className="flex items-center gap-4 mt-3 text-xs">
                        <span className="flex items-center gap-1 text-mission-muted" title="Total tasks">
                          <Briefcase className="w-3 h-3" />
                          {workload.total}
                        </span>
                        <span className="flex items-center gap-1 text-green-400" title="Completed">
                          <CheckCircle className="w-3 h-3" />
                          {workload.completed}
                        </span>
                        <span className="flex items-center gap-1 text-yellow-400" title="In progress">
                          <Clock className="w-3 h-3" />
                          {workload.inProgress}
                        </span>
                        {workload.overdue > 0 && (
                          <span className="flex items-center gap-1 text-red-400" title="Overdue">
                            <AlertCircle className="w-3 h-3" />
                            {workload.overdue}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-mission-card border border-mission-border rounded-xl">
            <Briefcase className="w-8 h-8 text-mission-muted mx-auto mb-3" />
            <p className="text-sm text-mission-muted">No runtime workload data — DB may be empty</p>
          </div>
        )}
      </div>
    </div>
  )
}
