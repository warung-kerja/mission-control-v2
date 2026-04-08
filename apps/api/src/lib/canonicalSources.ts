import fs from 'fs'
import path from 'path'

export const CANONICAL_TEAM_ROSTER_PATH =
  '/mnt/d/Warung Kerja 1.0/06_Agents/_Shared_Memory/AGENTS_ROSTER.md'

export const BOOTSTRAP_PROJECT_REGISTRY_PATH = path.resolve(
  process.cwd(),
  '../../docs/projects.registry.bootstrap.json',
)

export const canonicalSourcePaths = {
  teamRoster: CANONICAL_TEAM_ROSTER_PATH,
  projectRegistryBootstrap: BOOTSTRAP_PROJECT_REGISTRY_PATH,
}

export const canonicalSourceStatus = () => ({
  teamRosterExists: fs.existsSync(CANONICAL_TEAM_ROSTER_PATH),
  projectRegistryBootstrapExists: fs.existsSync(BOOTSTRAP_PROJECT_REGISTRY_PATH),
  teamRosterPath: CANONICAL_TEAM_ROSTER_PATH,
  projectRegistryBootstrapPath: BOOTSTRAP_PROJECT_REGISTRY_PATH,
})
