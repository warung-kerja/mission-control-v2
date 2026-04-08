import { useEffect } from 'react'
import { useWebSocket } from './useWebSocket.js'
import { useQueryClient } from '@tanstack/react-query'
import type { Memory } from './useMemories.js'

export function useRealTimeMemories() {
  const { on } = useWebSocket()
  const queryClient = useQueryClient()

  useEffect(() => {
    // Listen for memory creation
    const unsubscribeCreated = on<{ memory: Memory }>('memory:created', (data) => {
      console.log('[RealTime] Memory created:', data.memory.id)
      
      // Update memories list
      queryClient.setQueryData<Memory[]>(['memories'], (old) => {
        if (!old) return [data.memory]
        return [data.memory, ...old]
      })
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['memory-stats'] })
      queryClient.invalidateQueries({ queryKey: ['memory-categories'] })
    })

    // Listen for memory updates
    const unsubscribeUpdated = on<{ memory: Memory }>('memory:updated', (data) => {
      console.log('[RealTime] Memory updated:', data.memory.id)
      
      // Update specific memory cache
      queryClient.setQueryData(['memory', data.memory.id], data.memory)
      
      // Update memories list
      queryClient.setQueryData<Memory[]>(['memories'], (old) => {
        if (!old) return [data.memory]
        return old.map((m) => (m.id === data.memory.id ? data.memory : m))
      })
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['memory-stats'] })
      queryClient.invalidateQueries({ queryKey: ['memory-categories'] })
    })

    // Listen for memory deletion
    const unsubscribeDeleted = on<{ memoryId: string }>('memory:deleted', (data) => {
      console.log('[RealTime] Memory deleted:', data.memoryId)
      
      // Remove from memories list
      queryClient.setQueryData<Memory[]>(['memories'], (old) => {
        if (!old) return []
        return old.filter((m) => m.id !== data.memoryId)
      })
      
      // Remove from individual cache
      queryClient.removeQueries({ queryKey: ['memory', data.memoryId] })
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['memory-stats'] })
      queryClient.invalidateQueries({ queryKey: ['memory-categories'] })
    })

    return () => {
      unsubscribeCreated?.()
      unsubscribeUpdated?.()
      unsubscribeDeleted?.()
    }
  }, [on, queryClient])
}
