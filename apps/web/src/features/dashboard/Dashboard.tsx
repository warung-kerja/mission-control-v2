import { FC } from 'react'
import { Activity, CheckCircle, Clock, Users, Plus, FolderKanban, Calendar, MessageSquare, Loader2, Database } from 'lucide-react'
import { useDashboardStats, useTeamActivityFeed, useActiveProjects, useCanonicalStatus, useCanonicalProjects, useAutomationStatus } from '../../hooks'
import { useAuthStore } from '../../stores/authStore'

export const Dashboard: FC = () => {
  const { user } = useAuthStore()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: activities, isLoading: activitiesLoading } = useTeamActivityFeed(5)
  const { data: projects, isLoading: projectsLoading } = useActiveProjects(4)
  const { data: canonicalStatus, isLoading: canonicalStatusLoading } = useCanonicalStatus()
  const { data: canonicalProjects, isLoading: canonicalProjectsLoading } = useCanonicalProjects()
  const { data: automationStatus, isLoading: automationStatusLoading } = useAutomationStatus()

  const canonicalActiveProjectCount =
    canonicalProjects?.data.filter((project) => project.status.toLowerCase() !== 'archived').length ?? 0

  const statItems = [
    { 
      label: 'Active Projects', 
      value: canonicalActiveProjectCount.toString(), 
      icon: Activity, 
      color: 'text-blue-400', 
      bg: 'bg-blue-400/10',
      loading: canonicalProjectsLoading 
    },
    { 
      label: 'Tasks Completed', 
      value: stats?.tasksCompleted?.toString() || '0', 
      icon: CheckCircle, 
      color: 'text-green-400', 
      bg: 'bg-green-400/10',
      loading: statsLoading 
    },
    { 
      label: 'Hours Logged', 
      value: stats?.hoursLogged?.toString() || '0', 
      icon: Clock, 
      color: 'text-yellow-400', 
      bg: 'bg-yellow-400/10',
      loading: statsLoading 
    },
    { 
      label: 'Team Members', 
      value: stats?.teamMembers?.toString() || '0', 
      icon: Users, 
      color: 'text-purple-400', 
      bg: 'bg-purple-400/10',
      loading: statsLoading 
    },
  ]

  const quickActions = [
    { label: 'New Project', icon: FolderKanban, href: '/projects?action=create' },
    { label: 'Add Task', icon: Plus, href: '/tasks?action=create' },
    { label: 'Schedule Meeting', icon: Calendar, href: '/calendar?action=create' },
    { label: 'Send Message', icon: MessageSquare, href: '/collaboration' },
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'TASK_CREATED':
      case 'TASK_COMPLETED':
        return CheckCircle
      case 'PROJECT_CREATED':
        return FolderKanban
      case 'USER_JOINED':
        return Users
      default:
        return Activity
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'TASK_COMPLETED':
        return 'text-green-400 bg-green-400/10'
      case 'TASK_CREATED':
        return 'text-blue-400 bg-blue-400/10'
      case 'PROJECT_CREATED':
        return 'text-purple-400 bg-purple-400/10'
      default:
        return 'text-primary-400 bg-primary-600/20'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const getProjectStatusBadge = (status: string) => {
    const key = status.toLowerCase()
    if (key === 'active') return 'bg-green-500/10 text-green-400'
    if (key === 'in-progress') return 'bg-blue-500/10 text-blue-400'
    if (key === 'paused') return 'bg-yellow-500/10 text-yellow-400'
    return 'bg-mission-border text-mission-muted'
  }

  const getProjectStatusLabel = (status: string) =>
    status
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-mission-text">Dashboard</h2>
        <p className="text-mission-muted">
          Welcome back{user?.name ? `, ${user.name}` : ''}. Here's what's happening today.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-mission-card border border-mission-border rounded-xl p-4 lg:p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-primary-400" />
                <h3 className="font-semibold text-mission-text">Source of Truth Status</h3>
              </div>
              <p className="text-sm text-mission-muted">
                Canonical roster and project registry health for dashboard truth alignment.
              </p>
            </div>
            {canonicalStatusLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-mission-muted" />
            ) : (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className={`px-2.5 py-1 rounded-full ${canonicalStatus?.teamRosterExists ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  Team roster {canonicalStatus?.teamRosterExists ? 'connected' : 'missing'}
                </span>
                <span className={`px-2.5 py-1 rounded-full ${canonicalStatus?.projectRegistryExists ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  Project registry {canonicalStatus?.projectRegistryExists ? 'connected' : 'missing'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-mission-card border border-mission-border rounded-xl p-4 lg:p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-primary-400" />
                <h3 className="font-semibold text-mission-text">Automation Status</h3>
              </div>
              <p className="text-sm text-mission-muted">
                First-pass cron health visibility, truthful about current integration readiness.
              </p>
            </div>
            {automationStatusLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-mission-muted" />
            ) : (
              <span className={`px-2.5 py-1 rounded-full text-xs ${automationStatus?.integrationReady ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                {automationStatus?.integrationReady ? 'Live cron integration ready' : 'Cron visibility planned'}
              </span>
            )}
          </div>
          {!automationStatusLoading && automationStatus && (
            <div className="mt-3 space-y-2 text-sm text-mission-muted">
              <p>
                Provider: <span className="text-mission-text">{automationStatus.provider}</span>
              </p>
              <p className="line-clamp-2">
                Next step: <span className="text-mission-text">{automationStatus.nextStep}</span>
              </p>
              {automationStatus.blockers[0] && (
                <p className="line-clamp-2">
                  Blocker: <span className="text-mission-text">{automationStatus.blockers[0]}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid - Responsive: 1 col mobile, 2 cols tablet, 4 cols desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map(({ label, value, icon: Icon, color, bg, loading }) => (
          <div key={label} className="bg-mission-card border border-mission-border rounded-xl p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-mission-muted text-sm">{label}</p>
                <p className="text-xl lg:text-2xl font-bold text-mission-text mt-1">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
                  ) : (
                    value
                  )}
                </p>
              </div>
              <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 lg:w-6 lg:h-6 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity & Quick Actions - Responsive: 1 col mobile, 2 cols desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Recent Activity */}
        <div className="bg-mission-card border border-mission-border rounded-xl p-5">
          <h3 className="font-semibold text-mission-text mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
              </div>
            ) : activities && activities.length > 0 ? (
              activities.map((activity) => {
                const Icon = getActivityIcon(activity.type)
                const colorClass = getActivityColor(activity.type)
                return (
                  <div key={activity.id} className="flex items-center gap-3 py-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-mission-text truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-mission-muted">
                        {formatTimeAgo(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-mission-muted text-center py-8">
                No recent activity
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-mission-card border border-mission-border rounded-xl p-4 lg:p-5">
          <h3 className="font-semibold text-mission-text mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="p-3 lg:p-4 bg-mission-bg border border-mission-border rounded-lg text-sm font-medium text-mission-text hover:border-primary-500 hover:bg-primary-600/5 transition-colors text-left group"
              >
                <action.icon className="w-5 h-5 mb-2 text-mission-muted group-hover:text-primary-400 transition-colors" />
                {action.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Active Projects */}
      <div className="bg-mission-card border border-mission-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-mission-text">Active Projects</h3>
          <a href="/projects" className="text-sm text-primary-400 hover:text-primary-300">
            View all
          </a>
        </div>
        {projectsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-mission-muted" />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 bg-mission-bg rounded-lg hover:bg-mission-border/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-mission-text truncate">
                    {project.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getProjectStatusBadge(project.status)}`}>
                      {getProjectStatusLabel(project.status)}
                    </span>
                    <span className="text-xs text-mission-muted truncate max-w-48">
                      {project.nextStep || project.currentPhase || 'Canonical project registry'}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="w-16 h-2 bg-mission-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-mission-muted text-right mt-1">
                    {project.progress}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-mission-muted text-center py-8">
            No active projects
          </p>
        )}
      </div>
    </div>
  )
}
