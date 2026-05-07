import { useQuery } from '@tanstack/react-query'
import { systemApi } from '../services/api'

export interface AutomationStatus {
  integrationReady: boolean
  provider: string
  visibility: 'stub' | 'config-audit' | 'runtime-integrated'
  lastCheckedAt: string
  adapterConfigured: boolean
  gatewayUrlConfigured: boolean
  gatewayTokenConfigured: boolean
  cliDetected: boolean
  configuredGatewayHost: string | null
  blockers: string[]
  nextStep: string
}

export interface CronJob {
  id: string
  name: string
  schedule: string
  status: 'success' | 'failure' | 'running' | 'skipped' | 'pending' | string
  lastRunAt: string | null
  nextRunAt: string | null
  durationMs: number | null
  error: string | null
  tags: string[]
  agentId: string | null
}

export type CronJobsResult =
  | { ok: true;  jobs: CronJob[]; fetchedAt: string; source: string }
  | { ok: false; jobs: []; fetchedAt: string; source: string; error: string; httpStatus?: number }

export interface OpenClawSessionSummary {
  key: string
  agentId: string | null
  kind: string | null
  model: string | null
  updatedAt: string | null
  ageMs: number | null
  totalTokens: number | null
}

export interface OpenClawSubagentTaskSummary {
  taskId: string
  label: string
  status: string | null
  agentId: string | null
  childSessionKey: string | null
  updatedAt: string | null
}

export interface OpenClawPresenceSummary {
  host: string
  mode: string | null
  reason: string | null
  text: string | null
  ts: string | null
}

export interface OpenClawRuntimeResult {
  ok: boolean
  fetchedAt: string
  source: string
  activeSessions: OpenClawSessionSummary[]
  subagentTasks: OpenClawSubagentTaskSummary[]
  presence: OpenClawPresenceSummary[]
  counts: {
    activeSessions: number
    subagentTasks: number
    presence: number
  }
  warnings: string[]
  error?: string
}

export interface WorkspaceSignalsResult {
  ok: boolean
  fetchedAt: string
  source: string
  repo: {
    branch: string | null
    head: string | null
    workingTree: 'clean' | 'dirty' | 'unknown'
  }
  cadence: {
    commits7d: number
    commits24h: number
    latestCommitAt: string | null
  }
  recentCommits: Array<{
    hash: string
    subject: string
    author: string
    timestamp: string
  }>
  fileChurn7d: Array<{
    path: string
    touches: number
  }>
  truthFiles: Array<{
    label: string
    path: string
    exists: boolean
    modifiedAt: string | null
    ageHours: number | null
  }>
  warnings: string[]
}

export function useAutomationStatus() {
  return useQuery({
    queryKey: ['system', 'automation-status'],
    queryFn: async () => {
      const response = await systemApi.automationStatus()
      return response.data.data as AutomationStatus
    },
    staleTime: 60 * 1000,
  })
}

export function useCronJobs() {
  return useQuery({
    queryKey: ['system', 'cron-jobs'],
    queryFn: async () => {
      const response = await systemApi.cronJobs()
      return response.data.data as CronJobsResult
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // poll every minute
  })
}


export function useOpenClawRuntime() {
  return useQuery({
    queryKey: ['system', 'openclaw-runtime'],
    queryFn: async () => {
      const response = await systemApi.openClawRuntime()
      return response.data.data as OpenClawRuntimeResult
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useWorkspaceSignals() {
  return useQuery({
    queryKey: ['system', 'workspace-signals'],
    queryFn: async () => {
      const response = await systemApi.workspaceSignals()
      return response.data.data as WorkspaceSignalsResult
    },
    staleTime: 60 * 1000,
    refetchInterval: 120 * 1000,
  })
}
