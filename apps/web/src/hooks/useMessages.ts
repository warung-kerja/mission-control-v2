import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messagesApi } from '../services/api.js'

export interface Message {
  id: string
  content: string
  createdAt: string
  sender: {
    id: string
    name: string
    avatar: string | null
    status: string
  }
  project?: {
    id: string
    name: string
  }
}

export function useProjectMessages(projectId: string | null) {
  return useQuery({
    queryKey: ['messages', 'project', projectId],
    queryFn: async () => {
      if (!projectId) return []
      const response = await messagesApi.getByProject(projectId)
      return response.data.data as Message[]
    },
    enabled: !!projectId,
  })
}

export function useRecentMessages(limit = 20) {
  return useQuery({
    queryKey: ['messages', 'recent', limit],
    queryFn: async () => {
      const response = await messagesApi.getRecent({ limit })
      return response.data.data as Message[]
    },
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, content }: { projectId: string; content: string }) => {
      const response = await messagesApi.send(projectId, content)
      return response.data.data as Message
    },
    onSuccess: (_, variables) => {
      // Invalidate project messages
      queryClient.invalidateQueries({ queryKey: ['messages', 'project', variables.projectId] })
      // Invalidate recent messages
      queryClient.invalidateQueries({ queryKey: ['messages', 'recent'] })
    },
  })
}

export function useDeleteMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, projectId }: { messageId: string; projectId: string }) => {
      await messagesApi.delete(messageId)
      return { messageId, projectId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'project', data.projectId] })
      queryClient.invalidateQueries({ queryKey: ['messages', 'recent'] })
    },
  })
}
