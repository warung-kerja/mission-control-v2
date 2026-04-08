import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { memoriesApi } from '../services/api.js'
import { toast } from '../components/common/Toast.js'

export interface Memory {
  id: string
  title: string
  content: string
  category: string
  tags?: string[]
  source?: string
  sourceId?: string
  importance: number
  archived: boolean
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    name: string
    avatar?: string
  }
}

export interface MemoryCategory {
  name: string
  count: number
}

export interface MemoryStats {
  total: number
  archived: number
  recent: number
  active: number
}

export function useMemories(filters?: {
  category?: string
  search?: string
  archived?: boolean
  tags?: string[]
}) {
  return useQuery({
    queryKey: ['memories', filters],
    queryFn: async () => {
      const response = await memoriesApi.list(filters)
      return response.data.memories as Memory[]
    },
    staleTime: 30000,
    refetchInterval: 60000,
    meta: {
      errorMessage: 'Failed to load memories',
    },
  })
}

export function useMemoryCategories() {
  return useQuery({
    queryKey: ['memory-categories'],
    queryFn: async () => {
      const response = await memoriesApi.categories()
      return response.data.categories as MemoryCategory[]
    },
    staleTime: 300000, // 5 minutes
  })
}

export function useMemoryStats() {
  return useQuery({
    queryKey: ['memory-stats'],
    queryFn: async () => {
      const response = await memoriesApi.stats()
      return response.data as MemoryStats
    },
    staleTime: 30000,
    refetchInterval: 60000,
  })
}

export function useMemory(id: string) {
  return useQuery({
    queryKey: ['memory', id],
    queryFn: async () => {
      const response = await memoriesApi.get(id)
      return response.data.memory as Memory
    },
    enabled: !!id,
  })
}

export function useCreateMemory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      title: string
      content: string
      category?: string
      tags?: string[]
      source?: string
      sourceId?: string
      importance?: number
    }) => {
      const response = await memoriesApi.create(data)
      return response.data.memory as Memory
    },
    onSuccess: () => {
      toast.success('Memory created successfully')
      queryClient.invalidateQueries({ queryKey: ['memories'] })
      queryClient.invalidateQueries({ queryKey: ['memory-stats'] })
      queryClient.invalidateQueries({ queryKey: ['memory-categories'] })
    },
    onError: (error: { userMessage?: string }) => {
      toast.error(error.userMessage || 'Failed to create memory')
    },
  })
}

export function useUpdateMemory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<Memory>
    }) => {
      const response = await memoriesApi.update(id, data)
      return response.data.memory as Memory
    },
    onSuccess: (_, variables) => {
      toast.success('Memory updated successfully')
      queryClient.invalidateQueries({ queryKey: ['memories'] })
      queryClient.invalidateQueries({ queryKey: ['memory', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['memory-stats'] })
    },
    onError: (error: { userMessage?: string }) => {
      toast.error(error.userMessage || 'Failed to update memory')
    },
  })
}

export function useDeleteMemory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      await memoriesApi.delete(id)
      return id
    },
    onSuccess: () => {
      toast.success('Memory deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['memories'] })
      queryClient.invalidateQueries({ queryKey: ['memory-stats'] })
      queryClient.invalidateQueries({ queryKey: ['memory-categories'] })
    },
    onError: (error: { userMessage?: string }) => {
      toast.error(error.userMessage || 'Failed to delete memory')
    },
  })
}

export function useSearchMemories(query: string) {
  return useQuery({
    queryKey: ['memories-search', query],
    queryFn: async () => {
      if (!query.trim()) return []
      const response = await memoriesApi.search(query)
      return response.data.memories as Memory[]
    },
    enabled: query.length >= 2,
    staleTime: 60000,
  })
}
