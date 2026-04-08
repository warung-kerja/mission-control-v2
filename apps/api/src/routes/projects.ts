import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { validateBody, validateQuery } from '../validation/middleware.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
  paginationSchema,
} from '../validation/schemas.js'

const router = Router()
const prisma = new PrismaClient()

// All routes require authentication
router.use(authMiddleware)

// GET /api/projects - List all projects
router.get('/', validateQuery(paginationSchema), async (req: AuthRequest, res) => {
  try {
    const { page, limit } = req.query as unknown as { page: number; limit: number }
    const skip = (page - 1) * limit

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        skip,
        take: limit,
        include: {
          owner: {
            select: { id: true, name: true, avatar: true },
          },
          _count: {
            select: { tasks: true, members: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.project.count(),
    ])

    res.json({
      success: true,
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('List projects error:', error)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// GET /api/projects/:id - Get project by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, email: true },
            },
          },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
        _count: {
          select: { messages: true },
        },
      },
    })

    if (!project) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    res.json({ success: true, data: project })
  } catch (error) {
    console.error('Get project error:', error)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

// POST /api/projects - Create new project
router.post('/', validateBody(createProjectSchema), async (req: AuthRequest, res) => {
  try {
    const data = req.body
    const userId = req.user!.id

    const project = await prisma.project.create({
      data: {
        ...data,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true },
        },
        _count: {
          select: { tasks: true, members: true },
        },
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'PROJECT_CREATED',
        metadata: JSON.stringify({ projectId: project.id, projectName: project.name }),
        userId,
      },
    })

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project,
    })
  } catch (error) {
    console.error('Create project error:', error)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// PUT /api/projects/:id - Update project
router.put('/:id', validateBody(updateProjectSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const data = req.body
    const userId = req.user!.id

    // Check if user has permission (owner or admin)
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })

    if (!membership && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    const project = await prisma.project.update({
      where: { id },
      data,
      include: {
        owner: {
          select: { id: true, name: true, avatar: true },
        },
        _count: {
          select: { tasks: true, members: true },
        },
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'PROJECT_UPDATED',
        metadata: JSON.stringify({ projectId: project.id, projectName: project.name }),
        userId,
      },
    })

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project,
    })
  } catch (error) {
    console.error('Update project error:', error)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Check if user has permission (owner or admin)
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })

    if (!membership && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    await prisma.project.delete({
      where: { id },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'PROJECT_DELETED',
        metadata: JSON.stringify({ projectId: id }),
        userId,
      },
    })

    res.json({
      success: true,
      message: 'Project deleted successfully',
    })
  } catch (error) {
    console.error('Delete project error:', error)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

// GET /api/projects/:id/members - List project members
router.get('/:id/members', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, email: true, status: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    res.json({ success: true, data: members })
  } catch (error) {
    console.error('List members error:', error)
    res.status(500).json({ error: 'Failed to fetch members' })
  }
})

// POST /api/projects/:id/members - Add member to project
router.post('/:id/members', requireRole('ADMIN', 'MANAGER'), validateBody(addProjectMemberSchema), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { userId, role } = req.body
    const currentUserId = req.user!.id

    // Check if user is already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
    })

    if (existingMember) {
      res.status(400).json({ error: 'User is already a member of this project' })
      return
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId: id,
        userId,
        role,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, email: true },
        },
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'MEMBER_ADDED',
        metadata: JSON.stringify({ projectId: id, userId, role }),
        userId: currentUserId,
      },
    })

    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      data: member,
    })
  } catch (error) {
    console.error('Add member error:', error)
    res.status(500).json({ error: 'Failed to add member' })
  }
})

// DELETE /api/projects/:id/members/:userId - Remove member from project
router.delete('/:id/members/:userId', async (req: AuthRequest, res) => {
  try {
    const { id, userId } = req.params
    const currentUserId = req.user!.id

    // Check if user has permission
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: currentUserId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })

    // Users can remove themselves, or owners/admins can remove others
    if (userId !== currentUserId && !membership && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'MEMBER_REMOVED',
        metadata: JSON.stringify({ projectId: id, userId }),
        userId: currentUserId,
      },
    })

    res.json({
      success: true,
      message: 'Member removed successfully',
    })
  } catch (error) {
    console.error('Remove member error:', error)
    res.status(500).json({ error: 'Failed to remove member' })
  }
})

export default router
