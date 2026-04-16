import { useQuery } from '@tanstack/react-query'
import { dashboardApi, teamApi, tasksApi, canonicalApi, projectsApi } from '../services/api'

export interface DashboardStats {
  activeProjects: number
  tasksCompleted: number
  hoursLogged: number | null
  hoursLoggedAvailable?: boolean
  teamMembers: number
}

export interface ActivityItem {
  id: string
  type: string
  description: string
  user: {
    id: string
    name: string
    avatar: string | null
  }
  createdAt: string
  metadata: Record<string, unknown> | null
}

export interface ProjectSummary {
  id: string
  name: string
  status: string
  progress: number
  taskCount: number
  completedTasks: number
  currentPhase?: string
  nextStep?: string
}

export interface TaskSummary {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  project: {
    id: string
    name: string
  }
  assignee: {
    id: string
    name: string
    avatar: string | null
  } | null
}

// Fetch dashboard stats
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await dashboardApi.stats()
      return response.data.data as DashboardStats
    },
  })
}

// Fetch recent activity
export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: async () => {
      const response = await dashboardApi.activity()
      return response.data.data as ActivityItem[]
    },
  })
}

// Fetch team activity feed (alternative to dashboard activity)
export function useTeamActivityFeed(limit = 10) {
  return useQuery({
    queryKey: ['team', 'activity-feed', limit],
    queryFn: async () => {
      const response = await teamApi.activityFeed()
      return response.data.data as ActivityItem[]
    },
  })
}

// Fetch active projects summary
export function useActiveProjects(limit = 5) {
  return useQuery({
    queryKey: ['projects', 'active', 'canonical', limit],
    queryFn: async () => {
      const response = await canonicalApi.projects()
      const projects = (response.data.data || []) as Array<{
        id: string
        name: string
        status: string
        currentPhase: string
        nextStep: string
        updatedAt: string
      }>

      return projects
        .filter((p) => p.status.toLowerCase() !== 'archived')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, limit)
        .map(
          (project) =>
            ({
              id: project.id,
              name: project.name,
              status: project.status,
              progress: 0,
              taskCount: 0,
              completedTasks: 0,
              currentPhase: project.currentPhase,
              nextStep: project.nextStep,
            }) satisfies ProjectSummary,
        )
    },
  })
}

// Fetch tasks assigned to current user
export function useMyTasks(status?: string) {
  return useQuery({
    queryKey: ['tasks', 'my-tasks', status],
    queryFn: async () => {
      const response = await tasksApi.list(status ? { status } : undefined)
      return response.data.data as TaskSummary[]
    },
  })
}

// Fetch team members with workload
export function useTeamMembers() {
  return useQuery({
    queryKey: ['team', 'members'],
    queryFn: async () => {
      const response = await teamApi.list()
      return response.data.data
    },
  })
}

// Fetch all projects
export function useProjects() {
  return useQuery({
    queryKey: ['projects', 'all'],
    queryFn: async () => {
      const response = await projectsApi.list()
      return response.data.data as Array<{
        id: string
        name: string
        status: string
        description?: string
      }>
    },
  })
}
