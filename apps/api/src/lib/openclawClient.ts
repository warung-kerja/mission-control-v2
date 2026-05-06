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

interface RawSession {
  key?: unknown
  agentId?: unknown
  kind?: unknown
  model?: unknown
  updatedAt?: unknown
  ageMs?: unknown
  totalTokens?: unknown
}

interface RawSubagentTask {
  taskId?: unknown
  label?: unknown
  task?: unknown
  status?: unknown
  agentId?: unknown
  childSessionKey?: unknown
  updatedAt?: unknown
  updatedAtMs?: unknown
  createdAt?: unknown
}

interface RawPresenceEntry {
  host?: unknown
  mode?: unknown
  reason?: unknown
  text?: unknown
  ts?: unknown
}

function findOpenClawBinary(): string | null {
  for (const candidate of OPENCLAW_BINARY_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function runOpenClawJson<T>(binary: string, args: string[], timeout = 30000): T {
  const stdout = execFileSync(binary, args, {
    encoding: 'utf8',
    timeout,
    maxBuffer: 5 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  return JSON.parse(stdout) as T
}

function dateFromUnknown(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString()
  if (typeof value === 'string' && value.trim()) return value
  return null
}

function numberFromUnknown(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
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


function normaliseSession(raw: RawSession): OpenClawSessionSummary {
  return {
    key: String(raw.key || 'unknown-session'),
    agentId: raw.agentId ? String(raw.agentId) : null,
    kind: raw.kind ? String(raw.kind) : null,
    model: raw.model ? String(raw.model) : null,
    updatedAt: dateFromUnknown(raw.updatedAt),
    ageMs: numberFromUnknown(raw.ageMs),
    totalTokens: numberFromUnknown(raw.totalTokens),
  }
}

function normaliseSubagentTask(raw: RawSubagentTask): OpenClawSubagentTaskSummary {
  return {
    taskId: String(raw.taskId || 'unknown-task'),
    label: String(raw.label || raw.task || 'Unnamed subagent task'),
    status: raw.status ? String(raw.status) : null,
    agentId: raw.agentId ? String(raw.agentId) : null,
    childSessionKey: raw.childSessionKey ? String(raw.childSessionKey) : null,
    updatedAt: dateFromUnknown(raw.updatedAt ?? raw.updatedAtMs ?? raw.createdAt),
  }
}

function normalisePresence(raw: RawPresenceEntry): OpenClawPresenceSummary {
  return {
    host: String(raw.host || 'unknown-host'),
    mode: raw.mode ? String(raw.mode) : null,
    reason: raw.reason ? String(raw.reason) : null,
    text: raw.text ? String(raw.text) : null,
    ts: dateFromUnknown(raw.ts),
  }
}

function errorMessage(error: unknown): string {
  const failure = error as ExecFailure
  const stderr = typeof failure.stderr === 'string' ? failure.stderr.trim() : ''
  return stderr || failure.message || 'unknown error'
}

export async function fetchOpenClawRuntime(): Promise<OpenClawRuntimeResult> {
  const fetchedAt = new Date().toISOString()
  const binary = findOpenClawBinary()

  if (!binary) {
    return {
      ok: false,
      fetchedAt,
      source: 'CLI',
      activeSessions: [],
      subagentTasks: [],
      presence: [],
      counts: { activeSessions: 0, subagentTasks: 0, presence: 0 },
      warnings: [],
      error: 'OpenClaw CLI binary not found at candidate paths. Runtime visibility requires the CLI to be installed on the host.',
    }
  }

  const warnings: string[] = []
  let activeSessions: OpenClawSessionSummary[] = []
  let subagentTasks: OpenClawSubagentTaskSummary[] = []
  let presence: OpenClawPresenceSummary[] = []

  try {
    const sessionsPayload = runOpenClawJson<{ sessions?: RawSession[] }>(binary, [
      'sessions',
      '--all-agents',
      '--active',
      '360',
      '--json',
    ])
    activeSessions = Array.isArray(sessionsPayload.sessions) ? sessionsPayload.sessions.map(normaliseSession) : []
  } catch (error) {
    warnings.push(`sessions unavailable: ${errorMessage(error)}`)
  }

  try {
    const tasksPayload = runOpenClawJson<{ tasks?: RawSubagentTask[] }>(binary, [
      'tasks',
      'list',
      '--runtime',
      'subagent',
      '--json',
    ])
    subagentTasks = Array.isArray(tasksPayload.tasks) ? tasksPayload.tasks.slice(0, 20).map(normaliseSubagentTask) : []
  } catch (error) {
    warnings.push(`subagent tasks unavailable: ${errorMessage(error)}`)
  }

  try {
    const presencePayload = runOpenClawJson<RawPresenceEntry[]>(binary, [
      'system',
      'presence',
      '--json',
      '--timeout',
      '5000',
    ], 10000)
    presence = Array.isArray(presencePayload) ? presencePayload.slice(0, 20).map(normalisePresence) : []
  } catch (error) {
    warnings.push(`presence unavailable: ${errorMessage(error)}`)
  }

  const counts = {
    activeSessions: activeSessions.length,
    subagentTasks: subagentTasks.length,
    presence: presence.length,
  }

  return {
    ok: warnings.length < 3,
    fetchedAt,
    source: `CLI: ${binary}`,
    activeSessions,
    subagentTasks,
    presence,
    counts,
    warnings,
    ...(warnings.length >= 3 ? { error: 'OpenClaw runtime commands were unavailable.' } : {}),
  }
}
