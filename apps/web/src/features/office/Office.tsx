import { FC } from 'react'
import { useWorkspace, type WorkspaceMember } from '../../hooks/useOffice'
import { Loader2, Users, Circle, Clock, MinusCircle } from 'lucide-react'

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'ONLINE':
      return 'bg-emerald-500'
    case 'BUSY':
      return 'bg-rose-500'
    case 'AWAY':
      return 'bg-amber-500'
    default:
      return 'bg-slate-500'
  }
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'ONLINE':
      return 'Online'
    case 'BUSY':
      return 'Busy'
    case 'AWAY':
      return 'Away'
    default:
      return 'Offline'
  }
}

const getWorkloadLevel = (member: WorkspaceMember): { label: string; color: string } => {
  const total = member.workload?.total || 0
  const overdue = member.workload?.overdue || 0

  if (overdue > 0) return { label: 'Overdue', color: 'text-rose-400' }
  if (total > 10) return { label: 'Heavy', color: 'text-amber-400' }
  if (total > 5) return { label: 'Moderate', color: 'text-blue-400' }
  return { label: 'Light', color: 'text-emerald-400' }
}

export const Office: FC = () => {
  const { data: workspace, isLoading, error } = useWorkspace()

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-mission-text">Office</h2>
          <p className="text-mission-muted">Virtual office visualization</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-mission-text">Office</h2>
          <p className="text-mission-muted">Virtual office visualization</p>
        </div>
        <div className="bg-mission-card border border-mission-border rounded-xl p-8 text-center">
          <p className="text-rose-400">Failed to load workspace data</p>
          <p className="text-sm text-mission-muted mt-2">{error.message}</p>
        </div>
      </div>
    )
  }

  const members = workspace?.members || []
  const stats = {
    total: workspace?.totalMembers || 0,
    online: workspace?.onlineCount || 0,
    busy: workspace?.busyCount || 0,
    away: workspace?.awayCount || 0,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-mission-text">Office</h2>
          <p className="text-mission-muted">Virtual office visualization</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-mission-muted" />
            <span className="text-mission-text">{stats.total} members</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="w-3 h-3 text-emerald-500 fill-emerald-500" />
            <span className="text-mission-text">{stats.online} online</span>
          </div>
          <div className="flex items-center gap-2">
            <MinusCircle className="w-3 h-3 text-rose-500" />
            <span className="text-mission-text">{stats.busy} busy</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-amber-500" />
            <span className="text-mission-text">{stats.away} away</span>
          </div>
        </div>
      </div>

      <div className="bg-mission-card border border-mission-border rounded-xl p-6">
        {members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-mission-muted mx-auto mb-4" />
            <p className="text-mission-muted">No team members found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {members.map((member) => {
              const workload = getWorkloadLevel(member)
              const initials = member.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)

              return (
                <div
                  key={member.id}
                  className="bg-mission-bg border border-mission-border rounded-xl p-4 hover:border-primary-500/50 transition-all hover:shadow-lg hover:shadow-primary-500/5 group"
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    {/* Avatar with presence */}
                    <div className="relative">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-mission-border group-hover:border-primary-500/30 transition-colors"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-primary-600/20 flex items-center justify-center border-2 border-mission-border group-hover:border-primary-500/30 transition-colors">
                          <span className="text-primary-400 font-bold text-lg">
                            {initials}
                          </span>
                        </div>
                      )}
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-mission-bg ${getStatusColor(member.status)}`}
                        title={getStatusLabel(member.status)}
                      />
                    </div>

                    {/* Member info */}
                    <div className="space-y-1">
                      <h3 className="font-medium text-mission-text text-sm truncate max-w-[120px]">
                        {member.name}
                      </h3>
                      <p className="text-xs text-mission-muted capitalize">
                        {member.role.toLowerCase()}
                      </p>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(member.status)}`} />
                      <span className="text-xs text-mission-muted">
                        {getStatusLabel(member.status)}
                      </span>
                    </div>

                    {/* Workload indicator */}
                    <div className="pt-2 border-t border-mission-border w-full">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-mission-muted">Workload</span>
                        <span className={workload.color}>{workload.label}</span>
                      </div>
                      <div className="mt-1.5 flex gap-0.5">
                        {member.workload?.total > 0 ? (
                          <>
                            <div
                              className="h-1.5 rounded-full bg-emerald-500"
                              style={{
                                width: `${((member.workload.byStatus.DONE || 0) / member.workload.total) * 100}%`,
                              }}
                            />
                            <div
                              className="h-1.5 rounded-full bg-blue-500"
                              style={{
                                width: `${((member.workload.byStatus.IN_PROGRESS || 0) / member.workload.total) * 100}%`,
                              }}
                            />
                            <div
                              className="h-1.5 rounded-full bg-amber-500"
                              style={{
                                width: `${((member.workload.byStatus.TODO || 0) / member.workload.total) * 100}%`,
                              }}
                            />
                          </>
                        ) : (
                          <div className="h-1.5 w-full rounded-full bg-mission-border" />
                        )}
                      </div>
                      <p className="text-xs text-mission-muted mt-1">
                        {member.workload?.total || 0} tasks
                        {member.workload?.overdue > 0 && (
                          <span className="text-rose-400 ml-1">
                            ({member.workload.overdue} overdue)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
