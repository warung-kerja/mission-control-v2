#!/usr/bin/env bash
set -euo pipefail

if [[ ! -t 0 ]]; then
  echo '[ui-release-one-pass] ERROR: Interactive terminal required before running release gate prerequisites.'
  echo '[ui-release-one-pass] Re-run this script in an interactive elevated host terminal.'
  exit 1
fi

cd /mnt/d/Warung\ Kerja\ 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/apps/web
npm run deps:playwright-host
npm run release:ui-readiness
npm run release:ui-gate
