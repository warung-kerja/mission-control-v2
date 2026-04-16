import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { canonicalSourceStatus } from '../lib/canonicalSources.js'
import { getAutomationStatus } from '../lib/automationStatus.js'

const router = Router()

router.use(authMiddleware)

router.get('/source-truth-status', (_req, res) => {
  try {
    res.json({
      success: true,
      data: canonicalSourceStatus(),
    })
  } catch (error) {
    console.error('Source truth status error:', error)
    res.status(500).json({ error: 'Failed to read source-of-truth status' })
  }
})

router.get('/automation-status', (_req, res) => {
  try {
    res.json({
      success: true,
      data: getAutomationStatus(),
    })
  } catch (error) {
    console.error('Automation status error:', error)
    res.status(500).json({ error: 'Failed to read automation status' })
  }
})

export default router
