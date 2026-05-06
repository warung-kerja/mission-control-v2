import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { canonicalSourceStatus } from '../lib/canonicalSources.js'
import { getAutomationStatus } from '../lib/automationStatus.js'
import { fetchCronJobs, fetchOpenClawRuntime } from '../lib/openclawClient.js'

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

router.get('/automation-status', async (_req, res) => {
  try {
    res.json({
      success: true,
      data: await getAutomationStatus(),
    })
  } catch (error) {
    console.error('Automation status error:', error)
    res.status(500).json({ error: 'Failed to read automation status' })
  }
})

// GET /api/system/cron-jobs
// Attempts to fetch live job data from the OpenClaw gateway.
// Always returns 200 — the client checks result.ok to distinguish live vs error state.
router.get('/cron-jobs', async (_req, res) => {
  try {
    const result = await fetchCronJobs()
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('Cron jobs fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch cron jobs' })
  }
})

// GET /api/system/openclaw-runtime
// Summarises local OpenClaw runtime truth from the official CLI.
// Always returns 200 — the client checks result.ok and warnings for partial data.
router.get('/openclaw-runtime', async (_req, res) => {
  try {
    const result = await fetchOpenClawRuntime()
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('OpenClaw runtime fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch OpenClaw runtime status' })
  }
})

export default router
