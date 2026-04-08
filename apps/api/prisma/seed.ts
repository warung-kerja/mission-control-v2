import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@missioncontrol.local',
      name: 'System Admin',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ONLINE',
    },
  })
  console.log('✅ Created admin user:', admin.email)

  // Create manager user
  const managerPassword = await bcrypt.hash('manager123', 10)
  const manager = await prisma.user.create({
    data: {
      email: 'manager@missioncontrol.local',
      name: 'Project Manager',
      password: managerPassword,
      role: 'MANAGER',
      status: 'ONLINE',
    },
  })
  console.log('✅ Created manager user:', manager.email)

  // Create agent users
  const agentPassword = await bcrypt.hash('agent123', 10)
  const agents = await Promise.all([
    prisma.user.create({
      data: {
        email: 'noona@missioncontrol.local',
        name: 'Noona',
        password: agentPassword,
        role: 'AGENT',
        status: 'ONLINE',
      },
    }),
    prisma.user.create({
      data: {
        email: 'jen@missioncontrol.local',
        name: 'Jen',
        password: agentPassword,
        role: 'AGENT',
        status: 'AWAY',
      },
    }),
    prisma.user.create({
      data: {
        email: 'baro@missioncontrol.local',
        name: 'Baro',
        password: agentPassword,
        role: 'AGENT',
        status: 'OFFLINE',
      },
    }),
  ])
  console.log('✅ Created', agents.length, 'agent users')

  // Create sample projects
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: 'Mission Control V2.0',
        description: 'Next-generation dashboard with real-time collaboration',
        status: 'ACTIVE',
        priority: 'HIGH',
        progress: 25,
        ownerId: admin.id,
        members: {
          create: [
            { userId: manager.id, role: 'LEAD' },
            { userId: agents[0].id, role: 'MEMBER' },
            { userId: agents[1].id, role: 'MEMBER' },
          ],
        },
      },
    }),
    prisma.project.create({
      data: {
        name: 'Workspace Explorer',
        description: 'File navigation and workspace management tool',
        status: 'PLANNING',
        priority: 'MEDIUM',
        progress: 10,
        ownerId: manager.id,
        members: {
          create: [
            { userId: agents[0].id, role: 'MEMBER' },
          ],
        },
      },
    }),
    prisma.project.create({
      data: {
        name: 'Memories Browser',
        description: 'Agent memory visualization and search',
        status: 'COMPLETED',
        priority: 'HIGH',
        progress: 100,
        ownerId: agents[2].id,
        members: {
          create: [
            { userId: admin.id, role: 'MEMBER' },
            { userId: agents[0].id, role: 'MEMBER' },
          ],
        },
      },
    }),
  ])
  console.log('✅ Created', projects.length, 'projects')

  // Create sample tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Set up database schema',
        description: 'Create Prisma schema and initial migrations',
        status: 'DONE',
        priority: 'HIGH',
        projectId: projects[0].id,
        assigneeId: agents[0].id,
        creatorId: admin.id,
        estimatedHours: 4,
        actualHours: 3,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Implement authentication API',
        description: 'JWT-based auth with login/register endpoints',
        status: 'DONE',
        priority: 'HIGH',
        projectId: projects[0].id,
        assigneeId: agents[0].id,
        creatorId: admin.id,
        estimatedHours: 6,
        actualHours: 5,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Create dashboard UI components',
        description: 'Build reusable components for the dashboard',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        projectId: projects[0].id,
        assigneeId: agents[1].id,
        creatorId: manager.id,
        estimatedHours: 8,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Set up WebSocket server',
        description: 'Implement Socket.io for real-time updates',
        status: 'TODO',
        priority: 'MEDIUM',
        projectId: projects[0].id,
        assigneeId: agents[0].id,
        creatorId: manager.id,
        estimatedHours: 6,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Design file tree component',
        description: 'Create hierarchical file browser UI',
        status: 'TODO',
        priority: 'MEDIUM',
        projectId: projects[1].id,
        assigneeId: agents[0].id,
        creatorId: manager.id,
        estimatedHours: 4,
      },
    }),
  ])
  console.log('✅ Created', tasks.length, 'tasks')

  // Create sample activities
  const activities = await Promise.all([
    prisma.activity.create({
      data: {
        type: 'PROJECT_CREATED',
        metadata: JSON.stringify({ projectId: projects[0].id, projectName: projects[0].name }),
        userId: admin.id,
      },
    }),
    prisma.activity.create({
      data: {
        type: 'TASK_COMPLETED',
        metadata: JSON.stringify({ taskId: tasks[0].id, taskTitle: tasks[0].title }),
        userId: agents[0].id,
      },
    }),
    prisma.activity.create({
      data: {
        type: 'USER_JOINED',
        metadata: JSON.stringify({ userId: agents[1].id, userName: agents[1].name }),
        userId: agents[1].id,
      },
    }),
  ])
  console.log('✅ Created', activities.length, 'activities')

  // Create sample memories
  const memories = await Promise.all([
    prisma.memory.create({
      data: {
        title: 'V2.0 Architecture Decision',
        content: 'Decided to use React 18 + TypeScript + Vite for frontend, Node.js + Express + Socket.io for backend, and SQLite for development database. This stack provides type safety, real-time capabilities, and easy deployment.',
        category: 'decision',
        tags: JSON.stringify(['architecture', 'v2.0', 'tech-stack']),
        source: 'conversation',
        importance: 5,
        userId: admin.id,
      },
    }),
    prisma.memory.create({
      data: {
        title: 'Team Member Onboarding - Noona',
        content: 'Noona joined as tech lead. Responsible for architecture decisions, code reviews, and mentoring junior developers. Strong skills in React, TypeScript, and system design.',
        category: 'milestone',
        tags: JSON.stringify(['team', 'onboarding', 'noona']),
        source: 'system',
        importance: 4,
        userId: admin.id,
      },
    }),
    prisma.memory.create({
      data: {
        title: 'Database Schema Design Notes',
        content: 'Key models: User (auth, profile), Project (with members), Task (assignable), Message (project chat), Activity (audit log), Notification (user alerts), Memory (this feature). Using Prisma for type-safe ORM.',
        category: 'file',
        tags: JSON.stringify(['database', 'schema', 'prisma']),
        source: 'file',
        importance: 4,
        userId: agents[0].id,
      },
    }),
    prisma.memory.create({
      data: {
        title: 'WebSocket Implementation Pattern',
        content: 'Use room-based subscriptions: project rooms for project updates, task rooms for task-specific events, user rooms for personal notifications. Improves scalability and reduces broadcast overhead.',
        category: 'conversation',
        tags: JSON.stringify(['websocket', 'real-time', 'architecture']),
        source: 'conversation',
        importance: 4,
        userId: agents[0].id,
      },
    }),
    prisma.memory.create({
      data: {
        title: 'V1.4 Migration Strategy',
        content: 'Migration script created to transfer data from JSON files to database. Includes dry-run mode for testing. All V1.4 data (team, projects, tasks, activities) can be migrated with ID mapping preserved.',
        category: 'milestone',
        tags: JSON.stringify(['migration', 'v1.4', 'data']),
        source: 'system',
        importance: 3,
        userId: manager.id,
      },
    }),
    prisma.memory.create({
      data: {
        title: 'UI Component Library Decisions',
        content: 'Using Tailwind CSS with custom design tokens. Created shared UI components: Button, Badge, Avatar, Toast. Following consistent color scheme: primary (indigo), success (green), warning (amber), error (rose).',
        category: 'decision',
        tags: JSON.stringify(['ui', 'tailwind', 'components']),
        source: 'conversation',
        importance: 3,
        userId: agents[1].id,
      },
    }),
    prisma.memory.create({
      data: {
        title: 'React Query Best Practices',
        content: 'Use staleTime: 30s for most queries, refetchInterval: 60s for real-time data. Always invalidate related queries on mutations. Use enabled option to conditionally fetch.',
        category: 'general',
        tags: JSON.stringify(['react-query', 'frontend', 'patterns']),
        source: 'file',
        importance: 3,
        userId: agents[0].id,
      },
    }),
    prisma.memory.create({
      data: {
        title: 'Team Velocity Metrics',
        content: 'Current sprint velocity: 15 story points. Average task completion time: 3.2 days. Bottleneck identified in code review process. Recommendation: implement pair programming for complex features.',
        category: 'system',
        tags: JSON.stringify(['metrics', 'velocity', 'sprint']),
        source: 'system',
        importance: 4,
        userId: manager.id,
      },
    }),
  ])
  console.log('✅ Created', memories.length, 'memories')

  console.log('\n🎉 Database seed completed successfully!')
  console.log('\n📋 Sample login credentials:')
  console.log('  Admin:    admin@missioncontrol.local / admin123')
  console.log('  Manager:  manager@missioncontrol.local / manager123')
  console.log('  Agents:   [name]@missioncontrol.local / agent123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
