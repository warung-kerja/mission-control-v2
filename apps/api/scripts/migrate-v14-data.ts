/**
 * V1.4 to V2.0 Data Migration Script
 * 
 * This script migrates data from Mission Control V1.4 JSON files to V2.0 database.
 * V1.4 used static JSON files; V2.0 uses PostgreSQL/SQLite with Prisma.
 * 
 * Usage:
 *   npm run db:migrate-v14  (after adding to package.json scripts)
 *   OR
 *   npx ts-node scripts/migrate-v14-data.ts --data-dir=./v14-data
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// ============================================================================
// V1.4 Data Type Definitions
// ============================================================================

interface V14TeamMember {
  id: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'AGENT'
  email?: string
  avatar?: string
  status?: 'ONLINE' | 'AWAY' | 'OFFLINE'
  joinedAt?: string
  skills?: string[]
}

interface V14TeamData {
  members: V14TeamMember[]
  lastUpdated: string
}

interface V14Project {
  id: string
  name: string
  description?: string
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  progress?: number
  startDate?: string
  endDate?: string
  ownerId: string
  memberIds?: string[]
  createdAt?: string
  updatedAt?: string
}

interface V14ProjectsData {
  projects: V14Project[]
  lastUpdated: string
}

interface V14Task {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  projectId: string
  assigneeId?: string
  creatorId: string
  dueDate?: string
  estimatedHours?: number
  actualHours?: number
  createdAt?: string
  updatedAt?: string
}

interface V14TasksData {
  tasks: V14Task[]
  lastUpdated: string
}

interface V14Activity {
  id: string
  type: string
  userId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

interface V14ActivityData {
  activities: V14Activity[]
  lastUpdated: string
}

// ============================================================================
// Migration Configuration
// ============================================================================

interface MigrationConfig {
  dataDir: string
  dryRun: boolean
  skipExisting: boolean
  defaultPassword: string
}

const defaultConfig: MigrationConfig = {
  dataDir: process.env.V14_DATA_DIR || './v14-data',
  dryRun: process.env.DRY_RUN === 'true',
  skipExisting: process.env.SKIP_EXISTING === 'true',
  defaultPassword: process.env.DEFAULT_PASSWORD || 'migration2024',
}

// ============================================================================
// Migration State Tracking
// ============================================================================

interface MigrationResult {
  entity: string
  created: number
  skipped: number
  errors: number
  details: string[]
}

class MigrationLogger {
  private results: MigrationResult[] = []
  private startTime: number = Date.now()

  log(entity: string, message: string, isError = false) {
    const prefix = isError ? '❌' : '✅'
    console.log(`${prefix} [${entity}] ${message}`)
  }

  addResult(result: MigrationResult) {
    this.results.push(result)
  }

  summary() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2)
    console.log('\n' + '='.repeat(60))
    console.log('MIGRATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`Duration: ${duration}s`)
    console.log('')
    
    for (const result of this.results) {
      console.log(`${result.entity}:`)
      console.log(`  Created: ${result.created}`)
      console.log(`  Skipped: ${result.skipped}`)
      console.log(`  Errors:  ${result.errors}`)
      if (result.details.length > 0) {
        console.log(`  Details: ${result.details.join(', ')}`)
      }
    }
    
    const totalCreated = this.results.reduce((sum, r) => sum + r.created, 0)
    const totalErrors = this.results.reduce((sum, r) => sum + r.errors, 0)
    
    console.log('\n' + '-'.repeat(60))
    console.log(`Total Created: ${totalCreated}`)
    console.log(`Total Errors:  ${totalErrors}`)
    console.log('='.repeat(60))
    
    return { totalCreated, totalErrors }
  }
}

// ============================================================================
// Data Loaders
// ============================================================================

function loadJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ File not found: ${filePath}`)
      return null
    }
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error)
    return null
  }
}

function loadV14Data(config: MigrationConfig) {
  const dataDir = config.dataDir
  
  return {
    team: loadJsonFile<V14TeamData>(path.join(dataDir, 'team.json')),
    projects: loadJsonFile<V14ProjectsData>(path.join(dataDir, 'projects.json')),
    tasks: loadJsonFile<V14TasksData>(path.join(dataDir, 'tasks.json')),
    activities: loadJsonFile<V14ActivityData>(path.join(dataDir, 'activities.json')),
  }
}

// ============================================================================
// Migration Functions
// ============================================================================

async function migrateUsers(
  data: V14TeamData | null,
  config: MigrationConfig,
  logger: MigrationLogger
): Promise<Map<string, string>> {
  const result: MigrationResult = {
    entity: 'Users',
    created: 0,
    skipped: 0,
    errors: 0,
    details: [],
  }
  
  const idMapping = new Map<string, string>() // V1.4 ID -> V2.0 ID
  
  if (!data || !data.members) {
    logger.log('Users', 'No team data found to migrate', true)
    result.details.push('No data')
    logger.addResult(result)
    return idMapping
  }

  const hashedPassword = await bcrypt.hash(config.defaultPassword, 10)

  for (const member of data.members) {
    try {
      // Check if user already exists by email
      const existingUser = await prisma.user.findUnique({
        where: { email: member.email || `${member.id}@v14.migrated` },
      })

      if (existingUser && config.skipExisting) {
        logger.log('Users', `Skipped existing: ${member.name}`)
        idMapping.set(member.id, existingUser.id)
        result.skipped++
        continue
      }

      if (existingUser) {
        // Update existing user
        if (!config.dryRun) {
          const updated = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: member.name,
              role: member.role,
              avatar: member.avatar,
              status: member.status || 'OFFLINE',
            },
          })
          idMapping.set(member.id, updated.id)
        }
        logger.log('Users', `Updated: ${member.name}`)
        result.created++
      } else {
        // Create new user
        if (!config.dryRun) {
          const created = await prisma.user.create({
            data: {
              email: member.email || `${member.id}@v14.migrated`,
              name: member.name,
              password: hashedPassword,
              role: member.role,
              avatar: member.avatar,
              status: member.status || 'OFFLINE',
            },
          })
          idMapping.set(member.id, created.id)
        }
        logger.log('Users', `Created: ${member.name}`)
        result.created++
      }
    } catch (error) {
      logger.log('Users', `Error migrating ${member.name}: ${error}`, true)
      result.errors++
    }
  }

  logger.addResult(result)
  return idMapping
}

async function migrateProjects(
  data: V14ProjectsData | null,
  userIdMapping: Map<string, string>,
  config: MigrationConfig,
  logger: MigrationLogger
): Promise<Map<string, string>> {
  const result: MigrationResult = {
    entity: 'Projects',
    created: 0,
    skipped: 0,
    errors: 0,
    details: [],
  }
  
  const idMapping = new Map<string, string>()
  
  if (!data || !data.projects) {
    logger.log('Projects', 'No projects data found to migrate', true)
    result.details.push('No data')
    logger.addResult(result)
    return idMapping
  }

  for (const project of data.projects) {
    try {
      // Map owner ID
      const ownerId = userIdMapping.get(project.ownerId)
      if (!ownerId) {
        logger.log('Projects', `Owner not found for project: ${project.name}`, true)
        result.errors++
        continue
      }

      // Check if project already exists
      const existingProject = await prisma.project.findFirst({
        where: { name: project.name },
      })

      if (existingProject && config.skipExisting) {
        logger.log('Projects', `Skipped existing: ${project.name}`)
        idMapping.set(project.id, existingProject.id)
        result.skipped++
        continue
      }

      // Map member IDs
      const memberIds = project.memberIds || []
      const members = memberIds
        .map(id => userIdMapping.get(id))
        .filter((id): id is string => id !== undefined)

      if (!config.dryRun) {
        const created = await prisma.project.create({
          data: {
            name: project.name,
            description: project.description,
            status: mapProjectStatus(project.status),
            priority: project.priority || 'MEDIUM',
            progress: project.progress || 0,
            startDate: project.startDate ? new Date(project.startDate) : null,
            endDate: project.endDate ? new Date(project.endDate) : null,
            ownerId,
            members: {
              create: members.map(userId => ({
                userId,
                role: 'MEMBER' as const,
              })),
            },
          },
        })
        idMapping.set(project.id, created.id)
      }

      logger.log('Projects', `Created: ${project.name}`)
      result.created++
    } catch (error) {
      logger.log('Projects', `Error migrating ${project.name}: ${error}`, true)
      result.errors++
    }
  }

  logger.addResult(result)
  return idMapping
}

async function migrateTasks(
  data: V14TasksData | null,
  userIdMapping: Map<string, string>,
  projectIdMapping: Map<string, string>,
  config: MigrationConfig,
  logger: MigrationLogger
): Promise<void> {
  const result: MigrationResult = {
    entity: 'Tasks',
    created: 0,
    skipped: 0,
    errors: 0,
    details: [],
  }
  
  if (!data || !data.tasks) {
    logger.log('Tasks', 'No tasks data found to migrate', true)
    result.details.push('No data')
    logger.addResult(result)
    return
  }

  for (const task of data.tasks) {
    try {
      // Map IDs
      const projectId = projectIdMapping.get(task.projectId)
      const creatorId = userIdMapping.get(task.creatorId)
      const assigneeId = task.assigneeId ? userIdMapping.get(task.assigneeId) : null

      if (!projectId) {
        logger.log('Tasks', `Project not found for task: ${task.title}`, true)
        result.errors++
        continue
      }

      if (!creatorId) {
        logger.log('Tasks', `Creator not found for task: ${task.title}`, true)
        result.errors++
        continue
      }

      if (!config.dryRun) {
        await prisma.task.create({
          data: {
            title: task.title,
            description: task.description,
            status: mapTaskStatus(task.status),
            priority: task.priority || 'MEDIUM',
            projectId,
            creatorId,
            assigneeId,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            estimatedHours: task.estimatedHours,
            actualHours: task.actualHours,
          },
        })
      }

      logger.log('Tasks', `Created: ${task.title}`)
      result.created++
    } catch (error) {
      logger.log('Tasks', `Error migrating ${task.title}: ${error}`, true)
      result.errors++
    }
  }

  logger.addResult(result)
}

async function migrateActivities(
  data: V14ActivityData | null,
  userIdMapping: Map<string, string>,
  config: MigrationConfig,
  logger: MigrationLogger
): Promise<void> {
  const result: MigrationResult = {
    entity: 'Activities',
    created: 0,
    skipped: 0,
    errors: 0,
    details: [],
  }
  
  if (!data || !data.activities) {
    logger.log('Activities', 'No activities data found to migrate', true)
    result.details.push('No data')
    logger.addResult(result)
    return
  }

  for (const activity of data.activities) {
    try {
      const userId = activity.userId ? userIdMapping.get(activity.userId) : null

      if (!config.dryRun) {
        await prisma.activity.create({
          data: {
            type: activity.type,
            metadata: activity.metadata ? JSON.stringify(activity.metadata) : null,
            userId,
            createdAt: new Date(activity.createdAt),
          },
        })
      }

      logger.log('Activities', `Created: ${activity.type}`)
      result.created++
    } catch (error) {
      logger.log('Activities', `Error migrating activity: ${error}`, true)
      result.errors++
    }
  }

  logger.addResult(result)
}

// ============================================================================
// Status Mapping Functions
// ============================================================================

function mapProjectStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'PLANNING': 'PLANNING',
    'ACTIVE': 'ACTIVE',
    'ON_HOLD': 'ON_HOLD',
    'COMPLETED': 'COMPLETED',
    'CANCELLED': 'CANCELLED',
    // Legacy mappings
    'IN_PROGRESS': 'ACTIVE',
    'DONE': 'COMPLETED',
  }
  return statusMap[status] || 'PLANNING'
}

function mapTaskStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'TODO': 'TODO',
    'IN_PROGRESS': 'IN_PROGRESS',
    'REVIEW': 'REVIEW',
    'DONE': 'DONE',
    'CANCELLED': 'CANCELLED',
    // Legacy mappings
    'PENDING': 'TODO',
    'BLOCKED': 'REVIEW',
    'COMPLETED': 'DONE',
  }
  return statusMap[status] || 'TODO'
}

// ============================================================================
// Main Migration Function
// ============================================================================

async function runMigration(config: MigrationConfig = defaultConfig) {
  console.log('='.repeat(60))
  console.log('Mission Control V1.4 → V2.0 Data Migration')
  console.log('='.repeat(60))
  console.log(`Data Directory: ${config.dataDir}`)
  console.log(`Dry Run:        ${config.dryRun}`)
  console.log(`Skip Existing:  ${config.skipExisting}`)
  console.log('='.repeat(60) + '\n')

  const logger = new MigrationLogger()

  try {
    // Load V1.4 data
    const v14Data = loadV14Data(config)
    
    if (!v14Data.team && !v14Data.projects && !v14Data.tasks) {
      console.error('❌ No V1.4 data files found. Migration aborted.')
      console.log('\nExpected files in ' + config.dataDir + ':')
      console.log('  - team.json')
      console.log('  - projects.json')
      console.log('  - tasks.json')
      console.log('  - activities.json (optional)')
      process.exit(1)
    }

    // Step 1: Migrate Users
    console.log('🔄 Step 1: Migrating Users...')
    const userIdMapping = await migrateUsers(v14Data.team, config, logger)

    // Step 2: Migrate Projects
    console.log('\n🔄 Step 2: Migrating Projects...')
    const projectIdMapping = await migrateProjects(
      v14Data.projects,
      userIdMapping,
      config,
      logger
    )

    // Step 3: Migrate Tasks
    console.log('\n🔄 Step 3: Migrating Tasks...')
    await migrateTasks(v14Data.tasks, userIdMapping, projectIdMapping, config, logger)

    // Step 4: Migrate Activities
    console.log('\n🔄 Step 4: Migrating Activities...')
    await migrateActivities(v14Data.activities, userIdMapping, config, logger)

    // Print summary
    const { totalCreated, totalErrors } = logger.summary()

    if (totalErrors > 0) {
      console.log('\n⚠️ Migration completed with errors. Review the log above.')
      process.exit(1)
    } else {
      console.log('\n🎉 Migration completed successfully!')
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

function parseArgs(): MigrationConfig {
  const args = process.argv.slice(2)
  const config: MigrationConfig = { ...defaultConfig }

  for (const arg of args) {
    if (arg.startsWith('--data-dir=')) {
      config.dataDir = arg.split('=')[1]
    } else if (arg === '--dry-run') {
      config.dryRun = true
    } else if (arg === '--skip-existing') {
      config.skipExisting = true
    } else if (arg.startsWith('--default-password=')) {
      config.defaultPassword = arg.split('=')[1]
    } else if (arg === '--help') {
      console.log(`
Mission Control V1.4 → V2.0 Data Migration

Usage: npm run db:migrate-v14 -- [options]

Options:
  --data-dir=<path>         Path to V1.4 JSON files (default: ./v14-data)
  --dry-run                 Preview changes without writing to database
  --skip-existing           Skip records that already exist
  --default-password=<pwd>  Default password for migrated users
  --help                    Show this help message

Environment Variables:
  V14_DATA_DIR              Same as --data-dir
  DRY_RUN                   Set to 'true' for dry run
  SKIP_EXISTING             Set to 'true' to skip existing records
  DEFAULT_PASSWORD          Default password for migrated users

Examples:
  npm run db:migrate-v14 -- --data-dir=./legacy-data
  npm run db:migrate-v14 -- --dry-run --skip-existing
      `)
      process.exit(0)
    }
  }

  return config
}

// Run if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  const config = parseArgs()
  runMigration(config)
}

export { runMigration, MigrationConfig }
