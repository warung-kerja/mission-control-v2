import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { canonicalSourceStatus } from '../lib/canonicalSources.js'

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
      data: {
        integrationReady: false,
        provider: 'openclaw-cron',
        visibility: 'planned',
        lastCheckedAt: new Date().toISOString(),
        blockers: [
          'No OpenClaw cron adapter wired into the Mission Control API yet.',
          'Dashboard cannot yet read live job status, last run, or next run from the runtime.',
        ],
        nextStep: 'Add an API adapter for OpenClaw cron state, then surface live job health in Dashboard.',
      },
    })
  } catch (error) {
    console.error('Automation status error:', error)
    res.status(500).json({ error: 'Failed to read automation status' })
  }
})

export default router
