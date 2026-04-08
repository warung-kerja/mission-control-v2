import { create } from 'zustand'
import type { User } from '@mission-control/shared-types'

interface DashboardState {
  // Stats
  stats: {
    activeProjects: number
    tasksCompleted: number
    hoursLogged: number
    teamMembers: number
  }
  
  // Recent activity
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    user: User
  }>
  
  // Quick actions
  quickActions: Array<{
    id: string
    label: string
    icon: string
    action: () => void
  }>
  
  // Loading states
  isLoading: boolean
  error: string | null
  
  // Actions
  setStats: (stats: DashboardState['stats']) => void
  setRecentActivity: (activity: DashboardState['recentActivity']) => void
  fetchDashboardData: () => Promise<void>
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  stats: {
    activeProjects: 0,
    tasksCompleted: 0,
    hoursLogged: 0,
    teamMembers: 0,
  },
  recentActivity: [],
  quickActions: [],
  isLoading: false,
  error: null,

  setStats: (stats) => set({ stats }),
  setRecentActivity: (activity) => set({ recentActivity: activity }),

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null })
    try {
      const [statsRes, activityRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/activity'),
      ])

      if (!statsRes.ok || !activityRes.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const stats = await statsRes.json()
      const activity = await activityRes.json()

      set({
        stats: stats.data,
        recentActivity: activity.data,
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch data',
        isLoading: false,
      })
    }
  },
}))
