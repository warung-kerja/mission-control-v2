#!/usr/bin/env bash
set -euo pipefail

cd /mnt/d/Warung\ Kerja\ 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/apps/web
npm run deps:playwright-host
npm run release:ui-readiness
npm run release:ui-gate
