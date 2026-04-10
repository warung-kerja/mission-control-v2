import { useQuery } from '@tanstack/react-query'
import { canonicalApi } from '../services/api'

export interface CanonicalMemoryFile {
  relativePath: string
  filename: string
  category: string
  content: string
  sizeBytes: number
  modifiedAt: string
}

export function useCanonicalMemories() {
  return useQuery<CanonicalMemoryFile[], Error>({
    queryKey: ['canonical', 'memories'],
    queryFn: async () => {
      const response = await canonicalApi.memories()
      return response.data.data as CanonicalMemoryFile[]
    },
    staleTime: 60000,
    refetchInterval: 120000,
  })
}
