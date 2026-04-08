#!/usr/bin/env node

import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST_ASSETS_DIR = new URL('../dist/assets/', import.meta.url)
const distAssetsPath = fileURLToPath(DIST_ASSETS_DIR)

const requiredFeatureChunks = [
  'Dashboard',
  'Projects',
  'Tasks',
  'Calendar',
  'Team',
  'Office',
  'Memories',
  'Collaboration',
  'Analytics',
]

const maxMainBundleBytes = 370 * 1024 // 370KB hard cap for main JS bundle

const formatKB = (bytes) => `${(bytes / 1024).toFixed(2)}KB`

try {
  const files = readdirSync(distAssetsPath)

  const jsFiles = files.filter((file) => file.endsWith('.js'))
  if (jsFiles.length === 0) {
    throw new Error('No JS assets found in dist/assets. Run web build first.')
  }

  const missingFeatureChunks = requiredFeatureChunks.filter(
    (feature) => !jsFiles.some((file) => file.toLowerCase().startsWith(`${feature.toLowerCase()}-`))
  )

  if (missingFeatureChunks.length > 0) {
    throw new Error(`Missing lazy route chunks: ${missingFeatureChunks.join(', ')}`)
  }

  const mainBundle = jsFiles.find((file) => file.toLowerCase().startsWith('index-'))
  if (!mainBundle) {
    throw new Error('Main bundle (index-*.js) not found in dist/assets.')
  }

  const mainBundlePath = join(distAssetsPath, mainBundle)
  const mainBundleSize = statSync(mainBundlePath).size

  if (mainBundleSize > maxMainBundleBytes) {
    throw new Error(
      `Main bundle too large: ${formatKB(mainBundleSize)} (limit: ${formatKB(maxMainBundleBytes)}).`
    )
  }

  console.log('✅ Route chunk verification passed')
  console.log(`• Route chunks present: ${requiredFeatureChunks.length}/${requiredFeatureChunks.length}`)
  console.log(`• Main bundle size: ${formatKB(mainBundleSize)} (limit: ${formatKB(maxMainBundleBytes)})`)
} catch (error) {
  console.error('❌ Route chunk verification failed')
  console.error(`• ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
