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
