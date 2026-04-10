import { useQuery } from '@tanstack/react-query'
import { teamApi } from '../services/api'

export interface ActiveTask {
  id: string
  title: string
  priority: string
  project: { id: string; name: string }
}

export interface WorkspaceMember {
  id: string
  name: string
  email: string
  avatar: string | null
  role: string
  status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE'
  workload: {
    total: number
    byStatus: Record<string, number>
    overdue: number
  }
  activeTasks: ActiveTask[]
}

export interface ActivityFeedItem {
  id: string
  type: string
  metadata: Record<string, unknown> | null
  createdAt: string
  user: { id: string; name: string; avatar: string | null } | null
}

export interface WorkspaceData {
  members: WorkspaceMember[]
  totalMembers: number
  onlineCount: number
  busyCount: number
  awayCount: number
}

const STALE_TIME = 30000 // 30 seconds
const REFETCH_INTERVAL = 60000 // 1 minute

export const useWorkspace = () => {
  return useQuery<WorkspaceData, Error>({
    queryKey: ['workspace'],
    queryFn: async () => {
      const response = await teamApi.list()
      const members: WorkspaceMember[] = response.data.data || []

      const onlineCount = members.filter((m) => m.status === 'ONLINE').length
      const busyCount = members.filter((m) => m.status === 'BUSY').length
      const awayCount = members.filter((m) => m.status === 'AWAY').length

      return {
        members,
        totalMembers: members.length,
        onlineCount,
        busyCount,
        awayCount,
      }
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  })
}

export const useActivityFeed = (limit = 15) => {
  return useQuery<ActivityFeedItem[], Error>({
    queryKey: ['activityFeed', limit],
    queryFn: async () => {
      const response = await teamApi.activityFeed(limit)
      return response.data.data || []
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  })
}

export const useWorkspaceStats = () => {
  const { data: workspace, isLoading, error } = useWorkspace()

  return {
    stats: workspace
      ? {
          totalMembers: workspace.totalMembers,
          onlineCount: workspace.onlineCount,
          busyCount: workspace.busyCount,
          awayCount: workspace.awayCount,
          offlineCount:
            workspace.totalMembers -
            workspace.onlineCount -
            workspace.busyCount -
            workspace.awayCount,
        }
      : null,
    isLoading,
    error,
  }
}
