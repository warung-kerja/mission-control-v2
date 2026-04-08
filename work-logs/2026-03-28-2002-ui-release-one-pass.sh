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
PRE_GATE_READINESS_REFRESH_EPOCH=$(date +%s)
npm run release:ui-readiness
READINESS_REFRESH_MTIME_EPOCH=$(stat -c %Y work-logs/latest-ui-release-readiness.json 2>/dev/null || echo 0)
if (( READINESS_REFRESH_MTIME_EPOCH < PRE_GATE_READINESS_REFRESH_EPOCH )); then
  echo '[ui-release-one-pass] ERROR: Readiness snapshot file was not refreshed by the pre-gate release:ui-readiness run.'
  echo "[ui-release-one-pass] readinessMtime=$READINESS_REFRESH_MTIME_EPOCH refreshStart=$PRE_GATE_READINESS_REFRESH_EPOCH"
  echo '[ui-release-one-pass] Re-run release:ui-readiness and ensure latest-ui-release-readiness.json updates.'
  exit 1
fi
echo '[ui-release-one-pass] Verified readiness snapshot freshness for current pre-gate refresh.'
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo '[ui-release-one-pass] ERROR: Tracked git changes detected before release gate.'
  echo '[ui-release-one-pass] Commit or stash tracked changes, then rerun.'
  git status --short
  exit 1
fi
echo '[ui-release-one-pass] Git tracked changes clean before release gate.'
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
RELEASE_GATE_EXPECTED_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
RELEASE_GATE_EXPECTED_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.timestamp||\"unknown\"));" work-logs/latest-ui-release-readiness.json 2>/dev/null || echo "unknown")
RELEASE_GATE_EXPECTED_READINESS_STATUS=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.status||\"unknown\"));" work-logs/latest-ui-release-readiness.json 2>/dev/null || echo "unknown")
RELEASE_GATE_EXPECTED_BLOCKING_CHECKS=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.blockingChecks ?? \"unknown\"));" work-logs/latest-ui-release-readiness.json 2>/dev/null || echo "unknown")
RELEASE_GATE_EXPECTED_READINESS_SHA256=$(sha256sum work-logs/latest-ui-release-readiness.json 2>/dev/null | awk "{print \$1}" || echo "unknown")
RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256=$(sha256sum work-logs/latest-ui-release-handoff-bundle-manifest.json 2>/dev/null | awk "{print \$1}" || echo "unknown")
RELEASE_GATE_EXPECTED_HANDOFF_SHA256=$(sha256sum work-logs/latest-ui-release-handoff.md 2>/dev/null | awk "{print \$1}" || echo "unknown")
RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256=$(sha256sum work-logs/latest-ui-release-operator-brief.md 2>/dev/null | awk "{print \$1}" || echo "unknown")
export RELEASE_GATE_RUN_TOKEN RELEASE_GATE_EXPECTED_COMMIT RELEASE_GATE_EXPECTED_BRANCH RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP RELEASE_GATE_EXPECTED_READINESS_STATUS RELEASE_GATE_EXPECTED_BLOCKING_CHECKS RELEASE_GATE_EXPECTED_READINESS_SHA256 RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256 RELEASE_GATE_EXPECTED_HANDOFF_SHA256 RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256
echo "[ui-release-one-pass] Release gate run token: $RELEASE_GATE_RUN_TOKEN"
echo "[ui-release-one-pass] Expected commit for gate evidence: $RELEASE_GATE_EXPECTED_COMMIT"
echo "[ui-release-one-pass] Expected branch for gate evidence: $RELEASE_GATE_EXPECTED_BRANCH"
echo "[ui-release-one-pass] Expected readiness timestamp for gate evidence: $RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP"
echo "[ui-release-one-pass] Expected readiness status for gate evidence: $RELEASE_GATE_EXPECTED_READINESS_STATUS"
echo "[ui-release-one-pass] Expected readiness blocking checks for gate evidence: $RELEASE_GATE_EXPECTED_BLOCKING_CHECKS"
echo "[ui-release-one-pass] Expected readiness snapshot SHA-256 for gate evidence: $RELEASE_GATE_EXPECTED_READINESS_SHA256"
echo "[ui-release-one-pass] Expected handoff bundle manifest SHA-256 for gate evidence: $RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256"
echo "[ui-release-one-pass] Expected handoff markdown SHA-256 for gate evidence: $RELEASE_GATE_EXPECTED_HANDOFF_SHA256"
echo "[ui-release-one-pass] Expected operator brief SHA-256 for gate evidence: $RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256"
echo "[ui-release-one-pass] Expected one-pass script SHA-256 for gate evidence: $RELEASE_GATE_EXPECTED_ONE_PASS_SHA256"
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
if ! grep -Fq "Commit: \\`$RELEASE_GATE_EXPECTED_COMMIT\\`" work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence commit hash mismatch for this release:ui-gate run.'
  echo "[ui-release-one-pass] expectedCommit=$RELEASE_GATE_EXPECTED_COMMIT"
  echo '[ui-release-one-pass] Ensure release gate runs on the intended commit and retry.'
  exit 1
fi
if ! grep -Fq "Branch: \\`$RELEASE_GATE_EXPECTED_BRANCH\\`" work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence branch mismatch for this release:ui-gate run.'
  echo "[ui-release-one-pass] expectedBranch=$RELEASE_GATE_EXPECTED_BRANCH"
  echo '[ui-release-one-pass] Ensure release gate runs on the intended branch and retry.'
  exit 1
fi
if ! grep -Fq "Expected readiness snapshot timestamp from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP\\`" work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence readiness timestamp mismatch for this release:ui-gate run.'
  echo "[ui-release-one-pass] expectedReadinessTimestamp=$RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP"
  echo '[ui-release-one-pass] Ensure release gate records expected readiness timestamp metadata and retry.'
  exit 1
fi
if ! grep -Fq "Expected readiness status from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_READINESS_STATUS\\`" work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence readiness status mismatch for this release:ui-gate run.'
  echo "[ui-release-one-pass] expectedReadinessStatus=$RELEASE_GATE_EXPECTED_READINESS_STATUS"
  echo '[ui-release-one-pass] Ensure release gate records expected readiness status metadata and retry.'
  exit 1
fi
if ! grep -Fq "Expected readiness blocking checks from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS\\`" work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence readiness blocking-check count mismatch for this release:ui-gate run.'
  echo "[ui-release-one-pass] expectedReadinessBlockingChecks=$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS"
  echo '[ui-release-one-pass] Ensure release gate records expected readiness blocking-check metadata and retry.'
  exit 1
fi
if ! grep -Fq "Expected readiness snapshot SHA-256 from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_READINESS_SHA256\\`" work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence readiness snapshot SHA-256 mismatch for this release:ui-gate run.'
  echo "[ui-release-one-pass] expectedReadinessSha256=$RELEASE_GATE_EXPECTED_READINESS_SHA256"
  echo '[ui-release-one-pass] Ensure release gate records expected readiness snapshot SHA-256 metadata and retry.'
  exit 1
fi
if ! grep -Fq "Expected handoff bundle manifest SHA-256 from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256\\`" work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence handoff bundle manifest SHA-256 mismatch for this release:ui-gate run.'
  echo "[ui-release-one-pass] expectedManifestSha256=$RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256"
  echo '[ui-release-one-pass] Ensure release gate records expected handoff bundle manifest SHA-256 metadata and retry.'
  exit 1
fi
if ! grep -Fq "Expected handoff markdown SHA-256 from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_HANDOFF_SHA256\\`" work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence handoff markdown SHA-256 mismatch for this release:ui-gate run.'
  echo "[ui-release-one-pass] expectedHandoffSha256=$RELEASE_GATE_EXPECTED_HANDOFF_SHA256"
  echo '[ui-release-one-pass] Ensure release gate records expected handoff markdown SHA-256 metadata and retry.'
  exit 1
fi
if ! grep -Fq "Expected operator brief SHA-256 from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256\\`" work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence operator brief SHA-256 mismatch for this release:ui-gate run.'
  echo "[ui-release-one-pass] expectedOperatorBriefSha256=$RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256"
  echo '[ui-release-one-pass] Ensure release gate records expected operator brief SHA-256 metadata and retry.'
  exit 1
fi
if ! grep -Fq "Expected one-pass script SHA-256 from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_ONE_PASS_SHA256\\`" work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence one-pass script SHA-256 mismatch for this release:ui-gate run.'
  echo "[ui-release-one-pass] expectedOnePassSha256=$RELEASE_GATE_EXPECTED_ONE_PASS_SHA256"
  echo '[ui-release-one-pass] Ensure release gate records expected one-pass script SHA-256 metadata and retry.'
  exit 1
fi
if ! grep -q UI\ release\ gate:\ ✅\ PASS /mnt/d/Warung\ Kerja\ 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence does not contain PASS marker.'
  echo '[ui-release-one-pass] Inspect work-logs/latest-ui-smoke-release-gate.md before closing release gate.'
  exit 1
fi
echo '[ui-release-one-pass] Verified smoke evidence freshness for current gate run.'
echo '[ui-release-one-pass] Verified gate run token match in smoke evidence.'
echo '[ui-release-one-pass] Verified commit hash match in smoke evidence.'
echo '[ui-release-one-pass] Verified branch match in smoke evidence.'
echo '[ui-release-one-pass] Verified readiness timestamp match in smoke evidence.'
echo '[ui-release-one-pass] Verified readiness status match in smoke evidence.'
echo '[ui-release-one-pass] Verified readiness blocking-check count match in smoke evidence.'
echo '[ui-release-one-pass] Verified readiness snapshot SHA-256 match in smoke evidence.'
echo '[ui-release-one-pass] Verified handoff bundle manifest SHA-256 match in smoke evidence.'
echo '[ui-release-one-pass] Verified handoff markdown SHA-256 match in smoke evidence.'
echo '[ui-release-one-pass] Verified operator brief SHA-256 match in smoke evidence.'
echo '[ui-release-one-pass] Verified one-pass script SHA-256 match in smoke evidence.'
echo '[ui-release-one-pass] Verified PASS evidence: work-logs/latest-ui-smoke-release-gate.md'
