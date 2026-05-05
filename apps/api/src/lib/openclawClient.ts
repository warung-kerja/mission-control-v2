import { execFileSync } from 'child_process'
import fs from 'fs'

/**
 * openclawClient.ts
 *
 * Bridge to the OpenClaw gateway.
 *
 * Strategy: instead of HTTP fetch (which requires guessing undocumented REST endpoints
 * on a primarily WebSocket gateway), we call the official OpenClaw CLI with the --json flag.
 * This ensures we always use the official protocol and authentication logic.
 */

export interface CronJob {
  id: string
  name: string
  schedule: string
  status: 'success' | 'failure' | 'running' | 'skipped' | 'pending' | 'disabled' | string
  lastRunAt: string | null
  nextRunAt: string | null
  durationMs: number | null
  error: string | null
  tags: string[]
  agentId: string | null
}

export type CronJobsResult =
  | { ok: true; jobs: CronJob[]; fetchedAt: string; source: string }
  | { ok: false; jobs: []; fetchedAt: string; source: string; error: string; httpStatus?: number }

const OPENCLAW_BINARY_CANDIDATES = [
  '/home/baro/.npm-global/bin/openclaw',
  '/usr/local/bin/openclaw',
  '/usr/bin/openclaw',
]

interface RawCronState {
  lastRunStatus?: string
  lastStatus?: string
  lastRunAtMs?: number
  nextRunAtMs?: number
  lastDurationMs?: number
  lastError?: string
  error?: string
}

interface RawCronSchedule {
  expr?: string
  kind?: string
  everyMs?: number
}

interface RawCronJob {
  id?: unknown
  name?: unknown
  enabled?: boolean
  schedule?: string | RawCronSchedule
  state?: RawCronState
  tags?: unknown[]
  agentId?: unknown
}

interface ExecFailure {
  message?: string
  stdout?: string | Buffer
  stderr?: string | Buffer
}

function findOpenClawBinary(): string | null {
  for (const candidate of OPENCLAW_BINARY_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function normaliseJob(raw: RawCronJob): CronJob {
  const state = raw.state || {}
  const enabled = raw.enabled !== false

  const rawStatus = !enabled
    ? 'disabled'
    : state.lastRunStatus || state.lastStatus || 'pending'

  const status =
    rawStatus === 'ok'
      ? 'success'
      : rawStatus === 'error'
        ? 'failure'
        : rawStatus

  let schedule = '—'
  if (raw.schedule) {
    if (typeof raw.schedule === 'string') schedule = raw.schedule
    else if (raw.schedule.expr) schedule = raw.schedule.expr
    else if (raw.schedule.kind === 'every' && raw.schedule.everyMs) {
      const hours = raw.schedule.everyMs / 3600000
      schedule = Number.isInteger(hours) ? `every ${hours}h` : `every ${raw.schedule.everyMs}ms`
    }
  }

  return {
    id: String(raw.id || raw.name || 'unknown'),
    name: String(raw.name || 'Unnamed job'),
    schedule,
    status,
    lastRunAt: state.lastRunAtMs ? new Date(state.lastRunAtMs).toISOString() : null,
    nextRunAt: state.nextRunAtMs ? new Date(state.nextRunAtMs).toISOString() : null,
    durationMs: state.lastDurationMs != null ? Number(state.lastDurationMs) : null,
    error: state.lastError || state.error || null,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    agentId: raw.agentId ? String(raw.agentId) : null,
  }
}

export async function fetchCronJobs(): Promise<CronJobsResult> {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL?.trim()
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN?.trim()
  const fetchedAt = new Date().toISOString()

  if (!gatewayUrl) {
    return {
      ok: false,
      jobs: [],
      fetchedAt,
      source: 'not-configured',
      error: 'OPENCLAW_GATEWAY_URL is not set. Setup the gateway URL in apps/api/.env.',
    }
  }

  const binary = findOpenClawBinary()
  if (!binary) {
    return {
      ok: false,
      jobs: [],
      fetchedAt,
      source: 'CLI',
      error: 'OpenClaw CLI binary not found at candidate paths. Live cron visibility requires the CLI to be installed on the host.',
    }
  }

  const wsUrl = gatewayUrl.replace(/^http/, 'ws')
  const args = [
    'cron',
    'list',
    '--all',
    '--json',
    '--timeout',
    '30000',
    '--url',
    wsUrl,
    ...(gatewayToken ? ['--token', gatewayToken] : []),
  ]

  try {
    const stdout = execFileSync(binary, args, {
      encoding: 'utf8',
      timeout: 40000,
      maxBuffer: 5 * 1024 * 1024,
    })

    const data = JSON.parse(stdout)
    const rawJobs = Array.isArray(data.jobs) ? data.jobs : []
    const jobs = rawJobs.map(normaliseJob)

    return {
      ok: true,
      jobs,
      fetchedAt,
      source: `CLI: ${wsUrl}`,
    }
  } catch (err: unknown) {
    const failure = err as ExecFailure
    let message = `Failed to fetch cron jobs via CLI: ${failure.message || 'unknown error'}`

    const stdout = typeof failure.stdout === 'string' ? failure.stdout : undefined
    const stderr = typeof failure.stderr === 'string' ? failure.stderr : undefined

    if (stdout) {
      try {
        const errorData = JSON.parse(stdout) as { message?: string }
        if (errorData.message) message = errorData.message
      } catch {
        if (stderr) message = stderr.trim()
      }
    }

    return {
      ok: false,
      jobs: [],
      fetchedAt,
      source: `CLI: ${wsUrl}`,
      error: message,
    }
  }
}
