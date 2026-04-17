import fs from 'fs'
import { fetchCronJobs } from './openclawClient.js'

const OPENCLAW_BINARY_CANDIDATES = [
  '/home/baro/.npm-global/bin/openclaw',
  '/usr/local/bin/openclaw',
  '/usr/bin/openclaw',
]

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

function safeGatewayHost(rawUrl?: string): string | null {
  if (!rawUrl) return null

  try {
    return new URL(rawUrl).host
  } catch {
    return 'invalid-url'
  }
}

function isCliDetected() {
  return OPENCLAW_BINARY_CANDIDATES.some((candidate) => fs.existsSync(candidate))
}

export async function getAutomationStatus(): Promise<AutomationStatus> {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL?.trim()
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN?.trim()

  const gatewayUrlConfigured = Boolean(gatewayUrl)
  const gatewayTokenConfigured = Boolean(gatewayToken)
  const adapterConfigured = gatewayUrlConfigured && gatewayTokenConfigured
  const cliDetected = isCliDetected()

  const blockers: string[] = []

  if (!gatewayUrlConfigured) {
    blockers.push('OPENCLAW_GATEWAY_URL is not configured in the API environment.')
  }

  if (!gatewayTokenConfigured) {
    blockers.push('OPENCLAW_GATEWAY_TOKEN is not configured in the API environment.')
  }

  if (!cliDetected) {
    blockers.push('OpenClaw CLI binary was not detected on expected host paths.')
  }

  if (!adapterConfigured || !cliDetected) {
    return {
      integrationReady: false,
      provider: 'openclaw-cron',
      visibility: 'config-audit',
      lastCheckedAt: new Date().toISOString(),
      adapterConfigured,
      gatewayUrlConfigured,
      gatewayTokenConfigured,
      cliDetected,
      configuredGatewayHost: safeGatewayHost(gatewayUrl),
      blockers,
      nextStep: 'Configure the Gateway URL and token in apps/api/.env and make sure the OpenClaw CLI is available on the host.',
    }
  }

  const runtime = await fetchCronJobs()

  if (runtime.ok) {
    return {
      integrationReady: true,
      provider: 'openclaw-cron',
      visibility: 'runtime-integrated',
      lastCheckedAt: runtime.fetchedAt,
      adapterConfigured,
      gatewayUrlConfigured,
      gatewayTokenConfigured,
      cliDetected,
      configuredGatewayHost: safeGatewayHost(gatewayUrl),
      blockers: [],
      nextStep: runtime.jobs.length > 0
        ? 'Live cron data is connected. Keep the dashboard aligned with real job state and use disabled jobs as intentional signals, not failures.'
        : 'Gateway is reachable but no jobs were returned. Check whether cron jobs are intentionally absent or filtered upstream.',
    }
  }

  blockers.push(runtime.error)

  return {
    integrationReady: false,
    provider: 'openclaw-cron',
    visibility: 'config-audit',
    lastCheckedAt: runtime.fetchedAt,
    adapterConfigured,
    gatewayUrlConfigured,
    gatewayTokenConfigured,
    cliDetected,
    configuredGatewayHost: safeGatewayHost(gatewayUrl),
    blockers,
    nextStep: 'Gateway config is present, but live runtime fetch failed. Check gateway reachability, token validity, and the OpenClaw CLI response path.',
  }
}
