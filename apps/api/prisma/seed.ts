import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  const password = await bcrypt.hash('password123', 10)

  // --- ROSTER ---
  // Raz, Baro, Noona, Obey
  // Baro subs: Bob, Lin, SOBA, Haji
  // Noona subs: Jen

  const usersData = [
    { name: 'Raz', email: 'raz@missioncontrol.local', role: 'ADMIN', status: 'ONLINE' },
    { name: 'Baro', email: 'baro@missioncontrol.local', role: 'MANAGER', status: 'ONLINE' },
    { name: 'Noona', email: 'noona@missioncontrol.local', role: 'AGENT', status: 'ONLINE' },
    { name: 'Obey', email: 'obey@missioncontrol.local', role: 'AGENT', status: 'ONLINE' },
    // Baro's subagents
    { name: 'Bob', email: 'bob@missioncontrol.local', role: 'AGENT', status: 'ONLINE' },
    { name: 'Lin', email: 'lin@missioncontrol.local', role: 'AGENT', status: 'ONLINE' },
    { name: 'SOBA', email: 'soba@missioncontrol.local', role: 'AGENT', status: 'ONLINE' },
    { name: 'Haji', email: 'haji@missioncontrol.local', role: 'AGENT', status: 'ONLINE' },
    // Noona's subagent
    { name: 'Jen', email: 'jen@missioncontrol.local', role: 'AGENT', status: 'ONLINE' },
  ]

  const users = await Promise.all(
    usersData.map(u => prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, status: u.status },
      create: { ...u, password }
    }))
  )
  console.log('✅ Created users roster:', users.length)

  const [raz, baro, noona, obey, bob, lin, soba, haji, jen] = users

  // --- PROJECTS ---
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: 'Mission Control V2',
        description: 'The central nervous system for agent orchestration and memory management.',
        status: 'ACTIVE',
        priority: 'HIGH',
        progress: 60,
        ownerId: raz.id,
        members: {
          create: [
            { userId: baro.id, role: 'LEAD' },
            { userId: noona.id, role: 'MEMBER' },
            { userId: jen.id, role: 'MEMBER' },
          ],
        },
      },
    }),
    prisma.project.create({
      data: {
        name: 'Workspace Explorer',
        description: 'Advanced file navigation and semantic mapping for the agent workspace.',
        status: 'ACTIVE',
        priority: 'MEDIUM',
        progress: 30,
        ownerId: baro.id,
        members: {
          create: [
            { userId: noona.id, role: 'MEMBER' },
            { userId: bob.id, role: 'MEMBER' },
          ],
        },
      },
    }),
    prisma.project.create({
      data: {
        name: 'Memories Browser',
        description: 'Visualization and querying interface for long-term agent memory.',
        status: 'PLANNING',
        priority: 'HIGH',
        progress: 10,
        ownerId: noona.id,
        members: {
          create: [
            { userId: raz.id, role: 'MEMBER' },
            { userId: jen.id, role: 'MEMBER' },
          ],
        },
      },
    }),
  ])
  console.log('✅ Created projects:', projects.length)

  // --- TASKS ---
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Refine Seed Data',
        description: 'Update seed.ts to reflect current team roster and MC-V2 reality.',
        status: 'DONE',
        priority: 'HIGH',
        projectId: projects[0].id,
        assigneeId: jen.id,
        creatorId: noona.id,
        estimatedHours: 2,
        actualHours: 1,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Architecture Review',
        description: 'Finalize the integration pattern for the Memories Browser.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        projectId: projects[2].id,
        assigneeId: noona.id,
        creatorId: baro.id,
        estimatedHours: 4,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Workspace Indexing',
        description: 'Implement the initial file system crawler for the Explorer.',
        status: 'TODO',
        priority: 'MEDIUM',
        projectId: projects[1].id,
        assigneeId: bob.id,
        creatorId: baro.id,
        estimatedHours: 8,
      },
    }),
  ])
  console.log('✅ Created tasks:', tasks.length)

  // --- ACTIVITIES ---
  const activities = await Promise.all([
    prisma.activity.create({
      data: {
        type: 'PROJECT_CREATED',
        metadata: JSON.stringify({ projectId: projects[0].id, projectName: projects[0].name }),
        userId: raz.id,
      },
    }),
    prisma.activity.create({
      data: {
        type: 'TASK_COMPLETED',
        metadata: JSON.stringify({ taskId: tasks[0].id, taskTitle: tasks[0].title }),
        userId: jen.id,
      },
    }),
  ])
  console.log('✅ Created activities:', activities.length)

  // --- MEMORIES ---
  const memories = await Promise.all([
    prisma.memory.create({
      data: {
        title: 'MC-V2 Delegation Model',
        content: 'Noona acts as Tech Lead, managing architecture and review. Jen handles primary implementation. Baro directs creative and strategy.',
        category: 'decision',
        tags: JSON.stringify(['architecture', 'delegation', 'team']),
        source: 'conversation',
        importance: 5,
        userId: noona.id,
      },
    }),
    prisma.memory.create({
      data: {
        title: 'Canonical Team Roster',
        content: 'Team: Raz (Boss), Baro (Creative Lead), Noona (Tech Lead), Obey. Sub-agents: Bob, Lin, SOBA, Haji (Baro); Jen (Noona).',
        category: 'milestone',
        tags: JSON.stringify(['team', 'roster']),
        source: 'system',
        importance: 5,
        userId: raz.id,
      },
    }),
    prisma.memory.create({
      data: {
        title: 'Execution Protocol: MVP First',
        content: 'Bias to action. Ship working versions first, then iterate. GitHub commits are the primary proof of work.',
        category: 'decision',
        tags: JSON.stringify(['workflow', 'execution', 'mvp']),
        source: 'conversation',
        importance: 4,
        userId: noona.id,
      },
    }),
  ])
  console.log('✅ Created memories:', memories.length)

  console.log('\n🎉 Database seed completed successfully!')
  console.log('\n📋 Credentials:')
  console.log('  All Users: [email] / password123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
