import { FC } from 'react'
import { Mail, Loader2, Briefcase, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { teamApi } from '../../services/api'
import { Badge, Avatar } from '../../components/common/ui'

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

export const Team: FC = () => {
  const { data: members, isLoading } = useQuery({
    queryKey: ['team', 'members'],
    queryFn: async () => {
      const response = await teamApi.list()
      return response.data.data as TeamMember[]
    },
  })

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      ADMIN: { className: 'bg-blue-100 text-blue-800', label: 'Admin' },
      MANAGER: { className: 'bg-green-100 text-green-800', label: 'Manager' },
      AGENT: { className: 'bg-gray-100 text-gray-800', label: 'Agent' },
    }
    const config = variants[role] || { className: 'bg-gray-100 text-gray-800', label: role }
    return <Badge className={config.className}>{config.label}</Badge>
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
      {/* Header - Responsive */}
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-mission-text">Team</h2>
        <p className="text-sm text-mission-muted">Manage team members and view workload</p>
      </div>

      {/* Team Grid - Responsive: 1 col mobile, 2 cols tablet+ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-mission-muted" />
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
                  {/* Avatar */}
                  <Avatar
                    fallback={member.name}
                    size="lg"
                    status={member.status.toLowerCase() as 'online' | 'away' | 'busy' | 'offline'}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-mission-text">{member.name}</h3>
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

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <a
                        href={`mailto:${member.email}`}
                        className="p-1.5 text-mission-muted hover:text-mission-text hover:bg-mission-border/50 rounded transition-colors"
                        title="Send email"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-mission-card border border-mission-border flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-mission-muted" />
          </div>
          <h3 className="text-lg font-medium text-mission-text mb-1">No team members</h3>
          <p className="text-mission-muted">Team members will appear here once added</p>
        </div>
      )}
    </div>
  )
}
