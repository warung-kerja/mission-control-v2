import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../middleware/auth.js'
import { getIO } from '../index.js'

const router = Router()
const prisma = new PrismaClient()

// Get all memories with filters
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { category, search, archived, tags } = req.query
    
    const where: any = {}
    
    if (category && category !== 'all') {
      where.category = category
    }
    
    if (archived !== undefined) {
      where.archived = archived === 'true'
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { content: { contains: search as string } },
      ]
    }
    
    if (tags) {
      const tagList = (tags as string).split(',')
      where.tags = { contains: tagList[0] } // Simple tag filtering
    }
    
    const memories = await prisma.memory.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    
    res.json({ memories })
  } catch (error) {
    console.error('Get memories error:', error)
    res.status(500).json({ error: 'Failed to fetch memories' })
  }
})

// Get memory categories
router.get('/categories', authMiddleware, async (_req, res) => {
  try {
    const categories = await prisma.memory.groupBy({
      by: ['category'],
      _count: { category: true },
    })
    
    res.json({ categories: categories.map(c => ({
      name: c.category,
      count: c._count.category,
    })) })
  } catch (error) {
    console.error('Get categories error:', error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

// Get memory statistics
router.get('/stats', authMiddleware, async (_req, res) => {
  try {
    const [total, archivedCount, recent] = await Promise.all([
      prisma.memory.count(),
      prisma.memory.count({ where: { archived: true } }),
      prisma.memory.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])
    
    res.json({
      total,
      archived: archivedCount,
      recent,
      active: total - archivedCount,
    })
  } catch (error) {
    console.error('Get memory stats error:', error)
    res.status(500).json({ error: 'Failed to fetch memory stats' })
  }
})

// Get single memory
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    
    const memory = await prisma.memory.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    })
    
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' })
    }
    
    res.json({ memory })
  } catch (error) {
    console.error('Get memory error:', error)
    res.status(500).json({ error: 'Failed to fetch memory' })
  }
})

// Create memory
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, content, category, tags, source, sourceId, importance } = req.body
    const userId = (req as any).user?.id
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' })
    }
    
    const memory = await prisma.memory.create({
      data: {
        title,
        content,
        category: category || 'general',
        tags: tags ? JSON.stringify(tags) : null,
        source,
        sourceId,
        importance: importance || 1,
        userId,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    })
    
    // Broadcast real-time event
    const io = getIO()
    if (io) {
      io.emit('memory:created', { memory })
    }
    
    res.status(201).json({ memory })
  } catch (error) {
    console.error('Create memory error:', error)
    res.status(500).json({ error: 'Failed to create memory' })
  }
})

// Update memory
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { title, content, category, tags, importance, archived } = req.body
    
    const memory = await prisma.memory.update({
      where: { id },
      data: {
        title,
        content,
        category,
        tags: tags ? JSON.stringify(tags) : undefined,
        importance,
        archived,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    })
    
    // Broadcast real-time event
    const io = getIO()
    if (io) {
      io.emit('memory:updated', { memory })
    }
    
    res.json({ memory })
  } catch (error) {
    console.error('Update memory error:', error)
    res.status(500).json({ error: 'Failed to update memory' })
  }
})

// Delete memory
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    
    await prisma.memory.delete({
      where: { id },
    })
    
    // Broadcast real-time event
    const io = getIO()
    if (io) {
      io.emit('memory:deleted', { memoryId: id })
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('Delete memory error:', error)
    res.status(500).json({ error: 'Failed to delete memory' })
  }
})

// Search memories
router.get('/search/:query', authMiddleware, async (req, res) => {
  try {
    const { query } = req.params
    
    const memories = await prisma.memory.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
        ],
        archived: false,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { importance: 'desc' },
      take: 20,
    })
    
    res.json({ memories })
  } catch (error) {
    console.error('Search memories error:', error)
    res.status(500).json({ error: 'Failed to search memories' })
  }
})

export default router
