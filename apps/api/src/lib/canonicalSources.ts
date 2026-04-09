import fs from 'fs'


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

// ---------------------------------------------------------------------------
// Status helper (used by /api/system/source-truth-status)
// ---------------------------------------------------------------------------

export const canonicalSourceStatus = () => ({
  teamRosterExists: fs.existsSync(CANONICAL_TEAM_ROSTER_PATH),
  projectRegistryExists: fs.existsSync(CANONICAL_PROJECT_REGISTRY_PATH),
  teamRosterPath: CANONICAL_TEAM_ROSTER_PATH,
  projectRegistryPath: CANONICAL_PROJECT_REGISTRY_PATH,
})

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
