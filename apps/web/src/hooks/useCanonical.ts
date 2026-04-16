import { useQuery } from '@tanstack/react-query'
import { canonicalApi } from '../services/api'

// ---------------------------------------------------------------------------
// Types (mirrored from API — keep in sync with canonicalSources.ts)
// ---------------------------------------------------------------------------

export interface CanonicalTeamMember {
  name: string
  role: string
  model: string
  agentPath?: string
  group: 'independent' | 'subagent'
  parentAgent?: string
}

export interface CanonicalProject {
  id: string
  name: string
  owner: string
  team: string[]
  status: string
  priority: string
  currentPhase: string
  nextStep: string
  updatedAt: string
}

export interface CanonicalProjectMeta {
  lastUpdated: string
  version: number
  note?: string
}

export interface CanonicalSourceHealth {
  key: 'teamRoster' | 'projectRegistry'
  label: string
  path: string
  exists: boolean
  readable: boolean
  modifiedAt: string | null
  itemCount: number
  status: 'healthy' | 'missing' | 'invalid'
  error?: string
}

export interface CanonicalStatus {
  overallStatus: 'healthy' | 'degraded'
  teamRosterExists: boolean
  projectRegistryExists: boolean
  teamRosterPath: string
  projectRegistryPath: string
  teamRoster: CanonicalSourceHealth
  projectRegistry: CanonicalSourceHealth
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Fetch canonical team roster from AGENTS_ROSTER.md via the API. */
export function useCanonicalTeam() {
  return useQuery({
    queryKey: ['canonical', 'team'],
    queryFn: async () => {
      const response = await canonicalApi.team()
      return response.data.data as CanonicalTeamMember[]
    },
    staleTime: 5 * 60 * 1000, // 5 min — file changes are infrequent
  })
}

/** Fetch canonical project registry via the API. */
export function useCanonicalProjects() {
  return useQuery({
    queryKey: ['canonical', 'projects'],
    queryFn: async () => {
      const response = await canonicalApi.projects()
      return {
        data: response.data.data as CanonicalProject[],
        meta: response.data.meta as CanonicalProjectMeta | undefined,
        source: response.data.source as string,
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

/** Diagnostic: source-of-truth health, parseability, and item counts. */
export function useCanonicalStatus() {
  return useQuery({
    queryKey: ['canonical', 'status'],
    queryFn: async () => {
      const response = await canonicalApi.status()
      return response.data.data as CanonicalStatus
    },
    staleTime: 60 * 1000, // 1 min
  })
}
