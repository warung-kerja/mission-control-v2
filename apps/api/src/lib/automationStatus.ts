import fs from 'fs'

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

export function getAutomationStatus(): AutomationStatus {
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

  blockers.push('Dashboard does not yet read live job status, last run, or next run from the runtime.')

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
    nextStep: adapterConfigured
      ? 'Use the configured Gateway connection to fetch cron jobs and surface live health in the dashboard.'
      : 'Configure Gateway URL and token in apps/api/.env, then wire runtime cron reads into the API.',
  }
}
