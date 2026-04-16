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
