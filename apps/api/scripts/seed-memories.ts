import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Adding sample memories...')

  // Get existing users
  const users = await prisma.user.findMany()
  
  if (users.length === 0) {
    console.log('❌ No users found. Please run main seed first.')
    return
  }

  const admin = users.find(u => u.role === 'ADMIN') || users[0]
  const manager = users.find(u => u.role === 'MANAGER') || users[0]
  const agents = users.filter(u => u.role === 'AGENT')
  const noona = agents.find(u => u.name === 'Noona') || agents[0]

  // Check if memories already exist
  const existingCount = await prisma.memory.count()
  if (existingCount > 0) {
    console.log(`⚠️ ${existingCount} memories already exist. Skipping memory seed.`)
    return
  }

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
        userId: noona.id,
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
        userId: noona.id,
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
        userId: agents[1]?.id || noona.id,
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
        userId: noona.id,
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
  console.log('\n🎉 Memory seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
