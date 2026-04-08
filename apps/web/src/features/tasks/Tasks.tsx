import { FC, useState } from 'react'
import { Plus, Search, Loader2, Calendar, Flag, MoreVertical } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { tasksApi } from '../../services/api'
import { Button } from '../../components/common/ui'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string | null
  projectId: string
  project: {
    id: string
    name: string
  }
  assigneeId: string | null
  assignee: {
    id: string
    name: string
    avatar: string | null
  } | null
  creatorId: string
  createdAt: string
}

type TaskStatus = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE'
type TaskPriority = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export const Tasks: FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority>('ALL')

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', 'list', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'ALL' ? { status: statusFilter } : undefined
      const response = await tasksApi.list(params)
      return response.data.data as Task[]
    },
  })

  const filteredTasks = tasks?.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter
    return matchesSearch && matchesPriority
  })



  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-slate-500/10 text-slate-400',
      MEDIUM: 'bg-blue-500/10 text-blue-400',
      HIGH: 'bg-orange-500/10 text-orange-400',
      URGENT: 'bg-red-500/10 text-red-400',
    }
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[priority] || colors.LOW}`}>
        {priority}
      </span>
    )
  }

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const today = new Date()
    const isOverdue = date < today
    
    return (
      <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-400' : 'text-mission-muted'}`}>
        <Calendar className="w-3 h-3" />
        {date.toLocaleDateString()}
      </span>
    )
  }

  const tabs: { label: string; value: TaskStatus; count?: number }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'To Do', value: 'TODO' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Done', value: 'DONE' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-mission-text">Tasks</h2>
          <p className="text-sm text-mission-muted">Track and manage your tasks</p>
        </div>
        <Button variant="primary" className="w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Filters - Responsive */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-none sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mission-muted" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-mission-card border border-mission-border rounded-lg text-mission-text placeholder-mission-muted focus:outline-none focus:border-primary-500"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as TaskPriority)}
          className="flex-1 sm:flex-none bg-mission-card border border-mission-border rounded-lg px-3 py-2 text-mission-text focus:outline-none focus:border-primary-500"
        >
          <option value="ALL">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {/* Task List */}
      <div className="bg-mission-card border border-mission-border rounded-xl overflow-hidden">
        {/* Tabs - Responsive: horizontal scroll on mobile */}
        <div className="p-4 border-b border-mission-border flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.value
                  ? 'bg-primary-600 text-white'
                  : 'text-mission-muted hover:text-mission-text hover:bg-mission-border/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Task Items */}
        <div className="divide-y divide-mission-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-mission-muted" />
            </div>
          ) : filteredTasks && filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 flex items-center gap-4 hover:bg-mission-bg/50 transition-colors group"
              >
                <input
                  type="checkbox"
                  checked={task.status === 'DONE'}
                  readOnly
                  className="w-5 h-5 rounded border-mission-border bg-mission-bg text-primary-600 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <p className={`font-medium truncate ${
                      task.status === 'DONE' ? 'text-mission-muted line-through' : 'text-mission-text'
                    }`}>
                      {task.title}
                    </p>
                    {task.project && (
                      <span className="text-xs text-mission-muted bg-mission-border/50 px-2 py-0.5 rounded w-fit">
                        {task.project.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-mission-muted truncate hidden sm:block">
                    {task.description || 'No description'}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <div className="hidden sm:block">{formatDueDate(task.dueDate)}</div>
                  {getPriorityBadge(task.priority)}
                  {task.assignee ? (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-600/20 flex items-center justify-center text-xs font-medium text-primary-400" title={task.assignee.name}>
                      {task.assignee.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-mission-border flex items-center justify-center text-xs text-mission-muted">
                      -
                    </div>
                  )}
                  <button className="p-1 text-mission-muted hover:text-mission-text opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <Flag className="w-12 h-12 text-mission-muted mx-auto mb-3" />
              <h3 className="text-lg font-medium text-mission-text mb-1">No tasks found</h3>
              <p className="text-mission-muted">
                {searchQuery || priorityFilter !== 'ALL'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first task'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
