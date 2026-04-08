import { useEffect } from 'react'
import { useWebSocket } from './useWebSocket'
import { useQueryClient } from '@tanstack/react-query'

interface UseRealTimeOptions {
  projectId?: string
  taskId?: string
}

export function useRealTimeUpdates(options: UseRealTimeOptions = {}) {
  const { projectId, taskId } = options
  const queryClient = useQueryClient()
  const { on, emit } = useWebSocket()

  useEffect(() => {
    // Join project room for real-time updates
    if (projectId) {
      emit('project:join', { projectId })
    }

    // Join task room for real-time updates
    if (taskId) {
      emit('task:join', { taskId })
    }

    // Listen for project updates
    const unsubscribeProject = on<{ projectId: string }>('project:updated', (data) => {
      console.log('[RealTime] Project updated:', data.projectId)
      queryClient.invalidateQueries({ queryKey: ['projects', data.projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    })

    // Listen for task updates
    const unsubscribeTask = on<{ taskId: string; projectId: string }>('task:updated', (data) => {
      console.log('[RealTime] Task updated:', data.taskId)
      queryClient.invalidateQueries({ queryKey: ['tasks', data.taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['projects', data.projectId, 'tasks'] })
    })

    // Listen for new tasks
    const unsubscribeTaskCreated = on<{ taskId: string; projectId: string }>('task:created', (data) => {
      console.log('[RealTime] Task created:', data.taskId)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['projects', data.projectId, 'tasks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    })

    // Listen for task deletion
    const unsubscribeTaskDeleted = on<{ taskId: string; projectId: string }>('task:deleted', (data) => {
      console.log('[RealTime] Task deleted:', data.taskId)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['projects', data.projectId, 'tasks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    })

    // Listen for activity updates
    const unsubscribeActivity = on('activity:new', () => {
      console.log('[RealTime] New activity')
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'activity'] })
      queryClient.invalidateQueries({ queryKey: ['activities'] })
    })

    return () => {
      unsubscribeProject?.()
      unsubscribeTask?.()
      unsubscribeTaskCreated?.()
      unsubscribeTaskDeleted?.()
      unsubscribeActivity?.()
      
      if (projectId) {
        emit('project:leave', { projectId })
      }
      if (taskId) {
        emit('task:leave', { taskId })
      }
    }
  }, [projectId, taskId, on, emit, queryClient])
}
