import { FC, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  Flag,
  Loader2,
  Search,
  Target,
  UserRound,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { tasksApi } from '../../services/api'

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

function formatStatus(status: Task['status']) {
  return status.replace('_', ' ').toLowerCase()
}

function isOverdue(dateString: string | null, status: Task['status']) {
  if (!dateString || status === 'DONE') return false
  return new Date(dateString).getTime() < Date.now()
}

function formatDue(dateString: string | null) {
  if (!dateString) return 'No due date'
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  })
}

function taskScore(task: Task) {
  const priorityScore = task.priority === 'URGENT' ? 5 : task.priority === 'HIGH' ? 4 : task.priority === 'MEDIUM' ? 3 : 2
  const statusScore = task.status === 'IN_PROGRESS' ? 4 : task.status === 'TODO' ? 3 : task.status === 'DONE' ? 1 : 0
  const dueScore = isOverdue(task.dueDate, task.status) ? 3 : task.dueDate ? 1 : 0
  const assigneePenalty = task.assignee ? 0 : 1
  return priorityScore + statusScore + dueScore + assigneePenalty
}

const statusTone: Record<Task['status'], string> = {
  TODO: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  IN_PROGRESS: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  DONE: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  CANCELLED: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
}

const priorityTone: Record<Task['priority'], string> = {
  LOW: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  MEDIUM: 'border-blue-400/20 bg-blue-400/10 text-blue-300',
  HIGH: 'border-orange-400/20 bg-orange-400/10 text-orange-300',
  URGENT: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
}

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

  const taskList = tasks ?? []

  const summary = useMemo(() => {
    const inProgress = taskList.filter((task) => task.status === 'IN_PROGRESS').length
    const todo = taskList.filter((task) => task.status === 'TODO').length
    const overdue = taskList.filter((task) => isOverdue(task.dueDate, task.status)).length
    const unassigned = taskList.filter((task) => !task.assignee).length
    return { total: taskList.length, inProgress, todo, overdue, unassigned }
  }, [taskList])

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return taskList
      .filter((task) => {
        const matchesSearch = !query || `${task.title} ${task.description ?? ''} ${task.project?.name ?? ''} ${task.assignee?.name ?? ''}`.toLowerCase().includes(query)
        const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter
        return matchesSearch && matchesPriority
      })
      .sort((a, b) => taskScore(b) - taskScore(a))
  }, [priorityFilter, searchQuery, taskList])

  const focusTasks = useMemo(
    () => filteredTasks.filter((task) => task.status !== 'DONE').slice(0, 3),
    [filteredTasks],
  )

  const tabs: { label: string; value: TaskStatus; count: number }[] = [
    { label: 'All', value: 'ALL', count: summary.total },
    { label: 'To Do', value: 'TODO', count: summary.todo },
    { label: 'In Progress', value: 'IN_PROGRESS', count: summary.inProgress },
    { label: 'Done', value: 'DONE', count: taskList.filter((task) => task.status === 'DONE').length },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="mb-2 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.22em]">
            <span className="border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-cyan-300">runtime truth</span>
            <span className="border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-amber-300">execution focus</span>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Execution board</h3>
              <p className="mt-1 max-w-2xl text-sm text-mission-muted">
                Active work first, overdue pressure visible, and unassigned tasks surfaced before they disappear into the list.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">In progress</p>
              <p className="mt-2 text-3xl font-semibold text-cyan-300">{summary.inProgress}</p>
            </div>
            <div className="rounded-2xl border border-slate-400/15 bg-slate-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-100/80">To do</p>
              <p className="mt-2 text-3xl font-semibold text-slate-200">{summary.todo}</p>
            </div>
            <div className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-rose-100/80">Overdue</p>
              <p className="mt-2 text-3xl font-semibold text-rose-300">{summary.overdue}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">Unassigned</p>
              <p className="mt-2 text-3xl font-semibold text-amber-300">{summary.unassigned}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-2 text-white">
            <Target className="h-4 w-4 text-cyan-300" />
            <h3 className="text-lg font-semibold">Focus now</h3>
          </div>
          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-mission-muted" />
              </div>
            ) : focusTasks.length > 0 ? (
              focusTasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${priorityTone[task.priority]}`}>
                      {task.priority}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusTone[task.status]}`}>
                      {formatStatus(task.status)}
                    </span>
                  </div>
                  <p className="mt-3 font-medium text-white">{task.title}</p>
                  <p className="mt-1 text-xs text-mission-muted">{task.project?.name ?? 'No project'}</p>
                  <p className="mt-3 text-sm text-mission-text">{task.description || 'No task description recorded.'}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-4 text-sm text-mission-muted">
                No active focus tasks in this view.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === tab.value ? 'bg-cyan-400/15 text-cyan-300' : 'bg-white/[0.04] text-mission-muted hover:text-mission-text'}`}
              >
                {tab.label} <span className="ml-1 text-[10px] opacity-80">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mission-muted" />
              <input
                type="text"
                placeholder="Search tasks, projects, assignees..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-white/8 bg-[#07111f]/70 py-2.5 pl-10 pr-4 text-sm text-mission-text placeholder:text-mission-muted focus:border-cyan-400/40 focus:outline-none"
              />
            </div>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as TaskPriority)}
              className="rounded-xl border border-white/8 bg-[#07111f]/70 px-3 py-2.5 text-sm text-mission-text focus:border-cyan-400/40 focus:outline-none"
            >
              <option value="ALL">All priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-mission-muted" />
            </div>
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const overdue = isOverdue(task.dueDate, task.status)

              return (
                <article key={task.id} className="rounded-2xl border border-white/8 bg-[#07111f]/80 p-4 transition-colors hover:border-white/15">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`font-medium ${task.status === 'DONE' ? 'text-mission-muted line-through' : 'text-white'}`}>
                          {task.title}
                        </p>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase ${statusTone[task.status]}`}>
                          {formatStatus(task.status)}
                        </span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${priorityTone[task.priority]}`}>
                          {task.priority}
                        </span>
                        {overdue && (
                          <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-[11px] font-medium text-rose-300">
                            Overdue
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm text-mission-muted">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-mission-muted/70">Project</p>
                          <p className="mt-1 text-mission-text">{task.project?.name ?? 'No project'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-mission-muted/70">Assignee</p>
                          <p className="mt-1 text-mission-text">{task.assignee?.name ?? 'Unassigned'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-mission-muted/70">Due</p>
                          <p className={`mt-1 ${overdue ? 'text-rose-300' : 'text-mission-text'}`}>{formatDue(task.dueDate)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-mission-muted/70">Created</p>
                          <p className="mt-1 text-mission-text">{formatDue(task.createdAt)}</p>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-mission-muted">
                        {task.description || 'No task description recorded.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                      <div className="rounded-full border border-white/8 bg-white/[0.03] p-2 text-mission-muted">
                        {task.assignee ? task.assignee.name.charAt(0).toUpperCase() : <UserRound className="h-4 w-4" />}
                      </div>
                      {overdue ? <AlertTriangle className="h-4 w-4 text-rose-300" /> : <Calendar className="h-4 w-4 text-mission-muted" />}
                    </div>
                  </div>
                </article>
              )
            })
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#07111f]/60 p-6 text-center">
              <Flag className="h-8 w-8 text-mission-muted" />
              <p className="mt-3 text-sm text-mission-text">No tasks match this view.</p>
              <p className="mt-1 text-xs text-mission-muted">Try widening the search or changing the filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
