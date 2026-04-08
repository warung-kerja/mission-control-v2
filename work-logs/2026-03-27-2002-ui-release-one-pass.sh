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
npm run release:ui-readiness
if [[ ! -f work-logs/latest-ui-release-readiness.json ]]; then
  echo '[ui-release-one-pass] ERROR: Missing readiness snapshot after refresh: work-logs/latest-ui-release-readiness.json'
  exit 1
fi
READINESS_STATUS_AFTER=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.status||\"UNKNOWN\"));" work-logs/latest-ui-release-readiness.json)
BLOCKING_CHECKS_AFTER=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.blockingChecks ?? \"NA\"));" work-logs/latest-ui-release-readiness.json)
if [[ "$READINESS_STATUS_AFTER" != "READY" || "$BLOCKING_CHECKS_AFTER" != "0" ]]; then
  echo '[ui-release-one-pass] ERROR: Readiness is not READY after pre-gate refresh.'
  echo "[ui-release-one-pass] status=$READINESS_STATUS_AFTER blockingChecks=$BLOCKING_CHECKS_AFTER"
  echo '[ui-release-one-pass] Resolve blockers before running release:ui-gate.'
  exit 1
fi
echo '[ui-release-one-pass] Readiness confirmed READY (0 blockers) before release gate.'
RELEASE_GATE_START_EPOCH=$(date +%s)
RELEASE_GATE_RUN_TOKEN="one-pass-${RELEASE_GATE_START_EPOCH}-$RANDOM"
export RELEASE_GATE_RUN_TOKEN
echo "[ui-release-one-pass] Release gate run token: $RELEASE_GATE_RUN_TOKEN"
npm run release:ui-gate
if [[ ! -f /mnt/d/Warung\ Kerja\ 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/latest-ui-smoke-release-gate.md ]]; then
  echo '[ui-release-one-pass] ERROR: Missing smoke evidence file: work-logs/latest-ui-smoke-release-gate.md'
  echo '[ui-release-one-pass] release:ui-gate may have failed before writing stable evidence.'
  exit 1
fi
SMOKE_EVIDENCE_MTIME_EPOCH=$(stat -c %Y work-logs/latest-ui-smoke-release-gate.md 2>/dev/null || echo 0)
if (( SMOKE_EVIDENCE_MTIME_EPOCH < RELEASE_GATE_START_EPOCH )); then
  echo '[ui-release-one-pass] ERROR: Smoke evidence file was not refreshed by this release:ui-gate run.'
  echo "[ui-release-one-pass] evidenceMtime=$SMOKE_EVIDENCE_MTIME_EPOCH gateStart=$RELEASE_GATE_START_EPOCH"
  echo '[ui-release-one-pass] Re-run release:ui-gate and ensure latest-ui-smoke-release-gate.md updates.'
  exit 1
fi
if ! grep -Fq "Gate run token: \\`$RELEASE_GATE_RUN_TOKEN\\`" work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence token mismatch for this release:ui-gate run.'
  echo "[ui-release-one-pass] expectedToken=$RELEASE_GATE_RUN_TOKEN"
  echo '[ui-release-one-pass] Ensure run-ui-smoke-release.sh records Gate run token and retry.'
  exit 1
fi
if ! grep -q UI\ release\ gate:\ ✅\ PASS /mnt/d/Warung\ Kerja\ 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence does not contain PASS marker.'
  echo '[ui-release-one-pass] Inspect work-logs/latest-ui-smoke-release-gate.md before closing release gate.'
  exit 1
fi
echo '[ui-release-one-pass] Verified smoke evidence freshness for current gate run.'
echo '[ui-release-one-pass] Verified gate run token match in smoke evidence.'
echo '[ui-release-one-pass] Verified PASS evidence: work-logs/latest-ui-smoke-release-gate.md'
