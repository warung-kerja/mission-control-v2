import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'

export interface GitCommitSignal {
  hash: string
  subject: string
  author: string
  timestamp: string
}

export interface FileChurnSignal {
  path: string
  touches: number
}

export interface TruthFileSignal {
  label: string
  path: string
  exists: boolean
  modifiedAt: string | null
  ageHours: number | null
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
  recentCommits: GitCommitSignal[]
  fileChurn7d: FileChurnSignal[]
  truthFiles: TruthFileSignal[]
  warnings: string[]
}

const workspaceRoot = '/mnt/d/Warung Kerja 1.0'
const canonicalRepoRoot = path.join(workspaceRoot, '03_Active_Projects/Mission Control/mission-control-v2')
const repoRoot = fs.existsSync(path.join(canonicalRepoRoot, '.git'))
  ? canonicalRepoRoot
  : path.resolve(process.cwd(), '../..')

function runGit(args: string[], fallback: string | null = null): string | null {
  try {
    return execFileSync('git', ['-C', repoRoot, ...args], {
      encoding: 'utf8',
      timeout: 15000,
      maxBuffer: 2 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return fallback
  }
}

function parseCount(value: string | null): number {
  const parsed = Number.parseInt(value || '0', 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function isoFromEpoch(seconds: string | undefined): string | null {
  if (!seconds) return null
  const parsed = Number.parseInt(seconds, 10)
  return Number.isFinite(parsed) ? new Date(parsed * 1000).toISOString() : null
}

function truthFile(label: string, filePath: string): TruthFileSignal {
  try {
    const stat = fs.statSync(filePath)
    const modifiedAt = stat.mtime.toISOString()
    return {
      label,
      path: filePath,
      exists: true,
      modifiedAt,
      ageHours: Math.max(0, Math.round((Date.now() - stat.mtimeMs) / 36_000) / 100),
    }
  } catch {
    return { label, path: filePath, exists: false, modifiedAt: null, ageHours: null }
  }
}

function recentCommits(): GitCommitSignal[] {
  const output = runGit(['log', '-8', '--pretty=format:%h%x1f%ct%x1f%an%x1f%s'], '') || ''
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, timestamp, author, ...subjectParts] = line.split('\x1f')
      return {
        hash: hash || 'unknown',
        timestamp: isoFromEpoch(timestamp) || new Date(0).toISOString(),
        author: author || 'unknown',
        subject: subjectParts.join(' ').trim() || 'No commit subject',
      }
    })
}

function fileChurn7d(): FileChurnSignal[] {
  const output = runGit(['log', '--since=7.days', '--name-only', '--pretty=format:'], '') || ''
  const counts = new Map<string, number>()
  for (const line of output.split('\n')) {
    const file = line.trim()
    if (!file) continue
    counts.set(file, (counts.get(file) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([filePath, touches]) => ({ path: filePath, touches }))
    .sort((a, b) => b.touches - a.touches || a.path.localeCompare(b.path))
    .slice(0, 12)
}

export async function fetchWorkspaceSignals(): Promise<WorkspaceSignalsResult> {
  const warnings: string[] = []
  const branch = runGit(['branch', '--show-current'])
  const head = runGit(['rev-parse', '--short', 'HEAD'])
  const status = runGit(['status', '--porcelain'])
  const commits = recentCommits()

  if (!branch) warnings.push('Git branch could not be read.')
  if (!head) warnings.push('Git HEAD could not be read.')

  return {
    ok: warnings.length === 0,
    fetchedAt: new Date().toISOString(),
    source: `git/fs: ${repoRoot}`,
    repo: {
      branch,
      head,
      workingTree: status == null ? 'unknown' : status.length === 0 ? 'clean' : 'dirty',
    },
    cadence: {
      commits7d: parseCount(runGit(['rev-list', '--count', '--since=7.days', 'HEAD'])),
      commits24h: parseCount(runGit(['rev-list', '--count', '--since=24.hours', 'HEAD'])),
      latestCommitAt: commits[0]?.timestamp ?? null,
    },
    recentCommits: commits,
    fileChurn7d: fileChurn7d(),
    truthFiles: [
      truthFile('Project registry', path.join(workspaceRoot, '03_Active_Projects/_registry/projects.json')),
      truthFile('MC-V3 masterlist', path.join(workspaceRoot, '03_Active_Projects/Mission Control/01_Documentation/MC-V3-PROJECT-MASTER-LIST.md')),
      truthFile('Agent handoff', path.join(repoRoot, 'docs/agent-handoff.md')),
      truthFile('Epics backlog', path.join(repoRoot, 'docs/epics_backlog.md')),
      truthFile('Noona daily memory', path.join(workspaceRoot, '06_Agents/noona/memory/2026-05-07.md')),
    ],
    warnings,
  }
}
