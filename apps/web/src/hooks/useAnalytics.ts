import { useQuery } from '@tanstack/react-query'
import { teamAnalyticsApi } from '../services/api'

export interface TeamAnalytics {
  tasks: {
    total: number
    completed: number
    completionRate: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
  }
  activities: Record<string, number>
}

export interface ProductivityData {
  period: string
  totalCompleted: number
  byDate: Record<string, number>
  topPerformers: Array<{
    id: string
    name: string
    avatar: string | null
    tasksCompleted: number
  }>
}

export interface TeamMemberWithWorkload {
  id: string
  name: string
  email: string
  avatar: string | null
  role: string
  status: string
  createdAt: string
  workload: {
    total: number
    byStatus: Record<string, number>
    overdue: number
  }
}

export interface ProjectBreakdown {
  id: string
  name: string
  status: string
  memberCount: number
  total: number
  completed: number
  completionRate: number
  byStatus: Record<string, number>
  overdue: number
}

// Fetch team analytics overview, optionally scoped to a project
export function useTeamAnalytics(projectId?: string) {
  return useQuery({
    queryKey: ['team', 'analytics', projectId ?? 'all'],
    queryFn: async () => {
      const response = await teamAnalyticsApi.analytics(projectId ? { projectId } : undefined)
      return response.data.data as TeamAnalytics
    },
  })
}

// Fetch team productivity metrics
export function useTeamProductivity(days = 7) {
  return useQuery({
    queryKey: ['team', 'productivity', days],
    queryFn: async () => {
      const response = await teamAnalyticsApi.productivity({ days })
      return response.data.data as ProductivityData
    },
  })
}

// Fetch team members with workload
export function useTeamMembersWithWorkload() {
  return useQuery({
    queryKey: ['team', 'members-with-workload'],
    queryFn: async () => {
      const response = await teamAnalyticsApi.members()
      return response.data.data as TeamMemberWithWorkload[]
    },
  })
}

// Fetch per-project task breakdown
export function useProjectBreakdown() {
  return useQuery({
    queryKey: ['team', 'analytics', 'projects'],
    queryFn: async () => {
      const response = await teamAnalyticsApi.projectBreakdown()
      return response.data.data as ProjectBreakdown[]
    },
  })
}
