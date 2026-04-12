import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { teamApi, teamAnalyticsApi } from '../services/api'
import { getSocket } from '../lib/socket'

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

const STALE_TIME = 30000        // 30 seconds
const REFETCH_INTERVAL = 60000  // 1 minute — socket events trigger earlier invalidations
const FEED_REFETCH = 20000      // 20 seconds for activity feed

export const useWorkspace = () => {
  return useQuery<WorkspaceData, Error>({
    queryKey: ['workspace'],
    queryFn: async () => {
      const response = await teamAnalyticsApi.members()
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
    refetchInterval: FEED_REFETCH,
  })
}

/**
 * Combined hook for the Office page.
 * Wraps useWorkspace + useActivityFeed and adds real-time socket event subscriptions.
 * Socket presence events (user:online, user:offline, presence:update) immediately
 * invalidate the workspace query instead of waiting for the 60 s poll.
 */
export const useOfficeRealtime = (feedLimit = 15) => {
  const queryClient = useQueryClient()
  const [isSocketConnected, setIsSocketConnected] = useState(
    () => getSocket()?.connected ?? false,
  )

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    // Sync initial connection state
    setIsSocketConnected(socket.connected)

    const handleConnect = () => setIsSocketConnected(true)
    const handleDisconnect = () => setIsSocketConnected(false)

    const invalidateWorkspace = () =>
      queryClient.invalidateQueries({ queryKey: ['workspace'] })

    const invalidateActivity = () =>
      queryClient.invalidateQueries({ queryKey: ['activityFeed'] })

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    // Presence events the API already emits
    socket.on('user:online', invalidateWorkspace)
    socket.on('user:offline', invalidateWorkspace)
    socket.on('presence:update', invalidateWorkspace)
    // Opt-in activity events (emitted by broadcastToAll when supported)
    socket.on('activity:new', invalidateActivity)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('user:online', invalidateWorkspace)
      socket.off('user:offline', invalidateWorkspace)
      socket.off('presence:update', invalidateWorkspace)
      socket.off('activity:new', invalidateActivity)
    }
  }, [queryClient])

  const workspace = useWorkspace()
  const feed = useActivityFeed(feedLimit)

  return { workspace, feed, isSocketConnected }
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
