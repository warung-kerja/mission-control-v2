import { Router } from 'express'
import {
  readCanonicalTeam,
  readCanonicalProjects,
  canonicalSourceStatus,
} from '../lib/canonicalSources.js'

const router = Router()

// --------------------------------------------------------------------
// Public endpoints — canonical truth should be queryable without auth
// so the dashboard can hydrate before user login flow (if needed).
// Guard with auth later if desired.
// --------------------------------------------------------------------

// GET /api/canonical/team — canonical team roster from AGENTS_ROSTER.md
router.get('/team', (_req, res) => {
  try {
    const result = readCanonicalTeam()
    res.json({
      success: result.ok,
      data: result.data,
      source: result.source,
      ...(result.error && { error: result.error }),
    })
  } catch (error) {
    console.error('Canonical team read error:', error)
    res.status(500).json({ error: 'Failed to read canonical team roster' })
  }
})

// GET /api/canonical/projects — canonical project registry (bootstrap)
router.get('/projects', (_req, res) => {
  try {
    const result = readCanonicalProjects()
    res.json({
      success: result.ok,
      data: result.data,
      meta: result.meta,
      source: result.source,
      ...(result.error && { error: result.error }),
    })
  } catch (error) {
    console.error('Canonical projects read error:', error)
    res.status(500).json({ error: 'Failed to read canonical project registry' })
  }
})

// GET /api/canonical/status — source-of-truth diagnostic
router.get('/status', (_req, res) => {
  try {
    res.json({
      success: true,
      data: canonicalSourceStatus(),
    })
  } catch (error) {
    console.error('Canonical source status error:', error)
    res.status(500).json({ error: 'Failed to read source-of-truth status' })
  }
})

export default router
