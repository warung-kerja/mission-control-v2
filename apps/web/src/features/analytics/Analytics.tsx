import { FC, useState } from 'react'
import { TrendingUp, Users, CheckCircle, Loader2, Calendar } from 'lucide-react'
import { useTeamAnalytics, useTeamProductivity, useTeamMembersWithWorkload } from '../../hooks/useAnalytics'

export const Analytics: FC = () => {
  const [period, setPeriod] = useState('7')
  const { data: analytics, isLoading: analyticsLoading } = useTeamAnalytics()
  const { data: productivity, isLoading: productivityLoading } = useTeamProductivity(parseInt(period))
  const { data: members, isLoading: membersLoading } = useTeamMembersWithWorkload()

  const stats = analytics?.tasks || { total: 0, completed: 0, completionRate: 0, byStatus: {}, byPriority: {} }
  
  const metrics = [
    { 
      label: 'Total Tasks', 
      value: stats.total.toString(), 
      change: `${stats.completionRate}% completion`, 
      icon: CheckCircle, 
      positive: true 
    },
    { 
      label: 'Completed', 
      value: stats.completed.toString(), 
      change: `${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%`, 
      icon: TrendingUp, 
      positive: true 
    },
    { 
      label: 'Active Users', 
      value: members?.length?.toString() || '0', 
      change: 'team members', 
      icon: Users, 
      positive: true 
    },
    { 
      label: 'Period Total', 
      value: productivity?.totalCompleted?.toString() || '0', 
      change: `${period} days`, 
      icon: Calendar, 
      positive: true 
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'bg-green-500'
      case 'IN_PROGRESS': return 'bg-blue-500'
      case 'TODO': return 'bg-gray-500'
      case 'BACKLOG': return 'bg-purple-500'
      case 'CANCELLED': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-400'
      case 'HIGH': return 'text-orange-400'
      case 'MEDIUM': return 'text-yellow-400'
      case 'LOW': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }

  const getDaysArray = () => {
    const days: string[] = []
    const today = new Date()
    for (let i = parseInt(period) - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      days.push(d.toISOString().split('T')[0])
    }
    return days
  }

  const getProductivityData = () => {
    const days = getDaysArray()
    const byDate = productivity?.byDate || {}
    return days.map(day => ({
      date: day,
      count: byDate[day] || 0,
      label: new Date(day).toLocaleDateString('en-US', { weekday: 'short' })
    }))
  }

  const productivityData = getProductivityData()
  const maxCount = Math.max(...productivityData.map(d => d.count), 1)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-mission-text">Analytics</h2>
          <p className="text-mission-muted">Track performance and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-mission-muted">Period:</span>
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 bg-mission-card border border-mission-border rounded-lg text-sm text-mission-text focus:outline-none focus:border-primary-500"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.map(({ label, value, change, icon: Icon, positive }) => (
          <div key={label} className="bg-mission-card border border-mission-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary-600/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary-400" />
              </div>
              <span className={`text-sm font-medium ${positive ? 'text-green-400' : 'text-red-400'}`}>
                {change}
              </span>
            </div>
            <p className="text-2xl font-bold text-mission-text">
              {analyticsLoading && label !== 'Period Total' ? (
                <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
              ) : (
                value
              )}
            </p>
            <p className="text-sm text-mission-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <div className="bg-mission-card border border-mission-border rounded-xl p-5">
          <h3 className="font-semibold text-mission-text mb-4">Task Status Distribution</h3>
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(stats.byStatus).map(([status, count]) => {
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-mission-text capitalize">{status.toLowerCase().replace('_', ' ')}</span>
                      <span className="text-sm text-mission-muted">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-mission-border rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getStatusColor(status)} rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {Object.keys(stats.byStatus).length === 0 && (
                <p className="text-sm text-mission-muted text-center py-8">No task data available</p>
              )}
            </div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="bg-mission-card border border-mission-border rounded-xl p-5">
          <h3 className="font-semibold text-mission-text mb-4">Priority Distribution</h3>
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(stats.byPriority).map(([priority, count]) => {
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={priority} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm capitalize ${getPriorityColor(priority)}`}>
                        {priority.toLowerCase()}
                      </span>
                      <span className="text-sm text-mission-muted">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-mission-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {Object.keys(stats.byPriority).length === 0 && (
                <p className="text-sm text-mission-muted text-center py-8">No priority data available</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Productivity Chart */}
        <div className="bg-mission-card border border-mission-border rounded-xl p-5">
          <h3 className="font-semibold text-mission-text mb-4">Tasks Completed ({period} Days)</h3>
          {productivityLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
            </div>
          ) : (
            <>
              <div className="h-48 flex items-end justify-around gap-1">
                {productivityData.map((data, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary-600/50 rounded-t hover:bg-primary-500 transition-colors relative group"
                      style={{ height: `${(data.count / maxCount) * 100}%`, minHeight: data.count > 0 ? '4px' : '0' }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-mission-bg border border-mission-border px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {data.count} tasks
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-around mt-2 text-xs text-mission-muted">
                {productivityData.map((data, i) => (
                  <span key={i} className="flex-1 text-center">{data.label}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top Performers */}
        <div className="bg-mission-card border border-mission-border rounded-xl p-5">
          <h3 className="font-semibold text-mission-text mb-4">Top Performers</h3>
          {membersLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
            </div>
          ) : (
            <div className="space-y-3">
              {members?.slice(0, 5).map((member: any) => {
                const completed = member.workload?.byStatus?.DONE || 0
                const total = member.workload?.total || 0
                const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center text-xs font-bold text-primary-400">
                      {member.name?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-mission-text">{member.name}</span>
                        <span className="text-xs text-mission-muted">{completed}/{total} tasks</span>
                      </div>
                      <div className="h-1.5 bg-mission-border rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
              {(!members || members.length === 0) && (
                <p className="text-sm text-mission-muted text-center py-8">No team data available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
