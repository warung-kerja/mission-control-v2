#!/usr/bin/env bash
set -euo pipefail

if [[ ! -t 0 ]]; then
  echo '[ui-release-one-pass] ERROR: Interactive terminal required before running release gate prerequisites.'
  echo '[ui-release-one-pass] Re-run this script in an interactive elevated host terminal.'
  exit 1
fi

cd /mnt/d/Warung\ Kerja\ 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/apps/web
if ! command -v sudo >/dev/null 2>&1; then
  echo '[ui-release-one-pass] ERROR: sudo is required to install Playwright host dependencies (libnspr4).'
  echo '[ui-release-one-pass] Re-run on a host with sudo access, then retry.'
  exit 1
fi
echo '[ui-release-one-pass] Pre-authenticating sudo for host dependency install...'
sudo -v
npm run deps:playwright-host
npm run release:ui-readiness
npm run release:ui-handoff-verify
npm run release:ui-gate
if [[ ! -f /mnt/d/Warung\ Kerja\ 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/latest-ui-smoke-release-gate.md ]]; then
  echo '[ui-release-one-pass] ERROR: Missing smoke evidence file: work-logs/latest-ui-smoke-release-gate.md'
  echo '[ui-release-one-pass] release:ui-gate may have failed before writing stable evidence.'
  exit 1
fi
if ! grep -q UI\ release\ gate:\ ✅\ PASS /mnt/d/Warung\ Kerja\ 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence does not contain PASS marker.'
  echo '[ui-release-one-pass] Inspect work-logs/latest-ui-smoke-release-gate.md before closing release gate.'
  exit 1
fi
echo '[ui-release-one-pass] Verified PASS evidence: work-logs/latest-ui-smoke-release-gate.md'
