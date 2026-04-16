import fs from 'fs'
import path from 'path'


// ---------------------------------------------------------------------------
// Canonical source paths
// ---------------------------------------------------------------------------

export const CANONICAL_TEAM_ROSTER_PATH =
  '/mnt/d/Warung Kerja 1.0/06_Agents/_Shared_Memory/AGENTS_ROSTER.md'

export const CANONICAL_PROJECT_REGISTRY_PATH =
  '/mnt/d/Warung Kerja 1.0/03_Active_Projects/_registry/projects.json'

export const canonicalSourcePaths = {
  teamRoster: CANONICAL_TEAM_ROSTER_PATH,
  projectRegistry: CANONICAL_PROJECT_REGISTRY_PATH,
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

// ---------------------------------------------------------------------------
// Status helper (used by /api/system/source-truth-status)
// ---------------------------------------------------------------------------

function getCanonicalSourceHealth(
  key: CanonicalSourceHealth['key'],
  label: string,
  filePath: string,
  countItems: (raw: string) => number,
): CanonicalSourceHealth {
  if (!fs.existsSync(filePath)) {
    return {
      key,
      label,
      path: filePath,
      exists: false,
      readable: false,
      modifiedAt: null,
      itemCount: 0,
      status: 'missing',
      error: 'File not found',
    }
  }

  try {
    const stat = fs.statSync(filePath)
    const raw = fs.readFileSync(filePath, 'utf-8')
    const itemCount = countItems(raw)

    return {
      key,
      label,
      path: filePath,
      exists: true,
      readable: true,
      modifiedAt: stat.mtime.toISOString(),
      itemCount,
      status: 'healthy',
    }
  } catch (err) {
    return {
      key,
      label,
      path: filePath,
      exists: true,
      readable: false,
      modifiedAt: null,
      itemCount: 0,
      status: 'invalid',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export const canonicalSourceStatus = () => {
  const teamRoster = getCanonicalSourceHealth(
    'teamRoster',
    'Team roster',
    CANONICAL_TEAM_ROSTER_PATH,
    (raw) => parseTeamRoster(raw).length,
  )
  const projectRegistry = getCanonicalSourceHealth(
    'projectRegistry',
    'Project registry',
    CANONICAL_PROJECT_REGISTRY_PATH,
    (raw) => {
      const registry: CanonicalProjectRegistry = JSON.parse(raw)
      return Array.isArray(registry.projects) ? registry.projects.length : 0
    },
  )

  return {
    overallStatus:
      teamRoster.status === 'healthy' && projectRegistry.status === 'healthy'
        ? 'healthy'
        : 'degraded',
    teamRosterExists: teamRoster.exists,
    projectRegistryExists: projectRegistry.exists,
    teamRosterPath: teamRoster.path,
    projectRegistryPath: projectRegistry.path,
    teamRoster,
    projectRegistry,
  }
}

// ---------------------------------------------------------------------------
// Types
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

export interface CanonicalProjectRegistry {
  projects: CanonicalProject[]
  lastUpdated: string
  version: number
  note?: string
}

// ---------------------------------------------------------------------------
// Team roster parser
//
// Expected format:
//   # Agent Roster (Canonical - YYYY-MM-DD)
//
//   Independent:
//   - Name: Role (model) - /path/
//
//   Parent's Subagents:
//   - Name: Role (model)
// ---------------------------------------------------------------------------

export function parseTeamRoster(raw: string): CanonicalTeamMember[] {
  const members: CanonicalTeamMember[] = []
  const lines = raw.split('\n')

  let currentGroup: 'independent' | 'subagent' = 'independent'
  let currentParent: string | undefined

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect group headers
    if (/^independent/i.test(trimmed)) {
      currentGroup = 'independent'
      currentParent = undefined
      continue
    }

    // e.g. "Baro's Subagents:" or "Noona's Subagent:"
    const subagentHeader = trimmed.match(/^(.+?)['']s\s+Subagents?:/i)
    if (subagentHeader) {
      currentGroup = 'subagent'
      currentParent = subagentHeader[1].trim()
      continue
    }

    // Parse member lines: "- Name: Role (model)" with optional "- /path/"
    const memberMatch = trimmed.match(
      /^-\s+(.+?):\s+(.+?)\s+\((.+?)\)(?:\s*-\s*(\S+))?$/,
    )
    if (memberMatch) {
      members.push({
        name: memberMatch[1].trim(),
        role: memberMatch[2].trim(),
        model: memberMatch[3].trim(),
        agentPath: memberMatch[4]?.trim(),
        group: currentGroup,
        parentAgent: currentParent,
      })
    }
  }

  return members
}

// ---------------------------------------------------------------------------
// Read canonical team
// ---------------------------------------------------------------------------

export function readCanonicalTeam(): {
  ok: boolean
  data: CanonicalTeamMember[]
  error?: string
  source: string
} {
  const source = CANONICAL_TEAM_ROSTER_PATH
  try {
    if (!fs.existsSync(source)) {
      return { ok: false, data: [], error: 'Team roster file not found', source }
    }
    const raw = fs.readFileSync(source, 'utf-8')
    const data = parseTeamRoster(raw)
    return { ok: true, data, source }
  } catch (err) {
    return {
      ok: false,
      data: [],
      error: err instanceof Error ? err.message : String(err),
      source,
    }
  }
}

// ---------------------------------------------------------------------------
// Read canonical projects
// ---------------------------------------------------------------------------

export function readCanonicalProjects(): {
  ok: boolean
  data: CanonicalProject[]
  meta?: { lastUpdated: string; version: number; note?: string }
  error?: string
  source: string
} {
  const source = CANONICAL_PROJECT_REGISTRY_PATH
  try {
    if (!fs.existsSync(source)) {
      return { ok: false, data: [], error: 'Project registry file not found', source }
    }
    const raw = fs.readFileSync(source, 'utf-8')
    const registry: CanonicalProjectRegistry = JSON.parse(raw)
    return {
      ok: true,
      data: registry.projects,
      meta: {
        lastUpdated: registry.lastUpdated,
        version: registry.version,
        note: registry.note,
      },
      source,
    }
  } catch (err) {
    return {
      ok: false,
      data: [],
      error: err instanceof Error ? err.message : String(err),
      source,
    }
  }
}

// ---------------------------------------------------------------------------
// Canonical memory files
// ---------------------------------------------------------------------------

export const CANONICAL_SHARED_MEMORY_PATH =
  '/mnt/d/Warung Kerja 1.0/06_Agents/_Shared_Memory'

export interface CanonicalMemoryFile {
  /** Relative path from the shared memory root, e.g. "USER.md" or "Business_Plans/Amazon.md" */
  relativePath: string
  /** Filename without directory */
  filename: string
  /** Top-level category derived from the first path segment (or "root") */
  category: string
  /** Raw markdown content */
  content: string
  /** File size in bytes */
  sizeBytes: number
  /** Last modified timestamp (ISO string) */
  modifiedAt: string
}

/** Recursively walk a directory and collect all .md files */
function collectMdFiles(dir: string, rootDir: string): CanonicalMemoryFile[] {
  const results: CanonicalMemoryFile[] = []
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(fullPath, rootDir))
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/')
      const parts = relativePath.split('/')
      const category = parts.length > 1 ? parts[0] : 'root'
      try {
        const stat = fs.statSync(fullPath)
        const content = fs.readFileSync(fullPath, 'utf-8')
        results.push({
          relativePath,
          filename: entry.name,
          category,
          content,
          sizeBytes: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        })
      } catch {
        // skip unreadable files
      }
    }
  }
  return results
}

export function readCanonicalMemories(): {
  ok: boolean
  data: CanonicalMemoryFile[]
  error?: string
  source: string
} {
  const source = CANONICAL_SHARED_MEMORY_PATH
  try {
    if (!fs.existsSync(source)) {
      return { ok: false, data: [], error: 'Shared memory directory not found', source }
    }
    const data = collectMdFiles(source, source)
    return { ok: true, data, source }
  } catch (err) {
    return {
      ok: false,
      data: [],
      error: err instanceof Error ? err.message : String(err),
      source,
    }
  }
}
