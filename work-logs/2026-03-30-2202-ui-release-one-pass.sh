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
if ! sudo -n true >/dev/null 2>&1; then
  echo '[ui-release-one-pass] ERROR: Non-interactive sudo pre-auth check failed for host dependency install.'
  echo '[ui-release-one-pass] Run sudo -v in this terminal first, then rerun this one-pass script.'
  exit 1
fi
echo '[ui-release-one-pass] Verified sudo pre-authenticated for host dependency install.'
npm run deps:playwright-host
npm run release:ui-readiness
npm run release:ui-handoff-verify
PRE_GATE_READINESS_REFRESH_EPOCH=$(date +%s)
npm run release:ui-readiness
READINESS_REFRESH_MTIME_EPOCH=$(stat -c %Y work-logs/latest-ui-release-readiness.json 2>/dev/null || echo 0)
if [[ ! "$PRE_GATE_READINESS_REFRESH_EPOCH" =~ ^[0-9]{10}$ || ! "$READINESS_REFRESH_MTIME_EPOCH" =~ ^[0-9]{10}$ ]]; then
  echo '[ui-release-one-pass] ERROR: Invalid readiness refresh epoch format for pre-gate freshness assertion.'
  echo "[ui-release-one-pass] refreshStart=$PRE_GATE_READINESS_REFRESH_EPOCH readinessMtime=$READINESS_REFRESH_MTIME_EPOCH"
  echo '[ui-release-one-pass] Ensure date/stat return 10-digit unix epoch seconds before freshness validation.'
  exit 1
fi
echo '[ui-release-one-pass] Verified readiness refresh epoch format for pre-gate evidence.'
if (( READINESS_REFRESH_MTIME_EPOCH < PRE_GATE_READINESS_REFRESH_EPOCH )); then
  echo '[ui-release-one-pass] ERROR: Readiness snapshot file was not refreshed by the pre-gate release:ui-readiness run.'
  echo "[ui-release-one-pass] readinessMtime=$READINESS_REFRESH_MTIME_EPOCH refreshStart=$PRE_GATE_READINESS_REFRESH_EPOCH"
  echo '[ui-release-one-pass] Re-run release:ui-readiness and ensure latest-ui-release-readiness.json updates.'
  exit 1
fi
echo '[ui-release-one-pass] Verified readiness snapshot freshness for current pre-gate refresh.'
READINESS_REPORT_JSON_MTIME_EPOCH=$(stat -c %Y work-logs/latest-ui-release-readiness-report.json 2>/dev/null || echo 0)
READINESS_REPORT_MD_MTIME_EPOCH=$(stat -c %Y work-logs/latest-ui-release-readiness-report.md 2>/dev/null || echo 0)
if [[ ! "$READINESS_REPORT_JSON_MTIME_EPOCH" =~ ^[0-9]{10}$ || ! "$READINESS_REPORT_MD_MTIME_EPOCH" =~ ^[0-9]{10}$ ]]; then
  echo '[ui-release-one-pass] ERROR: Invalid readiness report mtime epoch format for pre-gate freshness assertion.'
  echo "[ui-release-one-pass] readinessReportJsonMtime=$READINESS_REPORT_JSON_MTIME_EPOCH readinessReportMarkdownMtime=$READINESS_REPORT_MD_MTIME_EPOCH"
  echo '[ui-release-one-pass] Ensure readiness report artifacts exist and stat returns 10-digit unix epoch seconds before freshness validation.'
  exit 1
fi
if (( READINESS_REPORT_JSON_MTIME_EPOCH < PRE_GATE_READINESS_REFRESH_EPOCH || READINESS_REPORT_MD_MTIME_EPOCH < PRE_GATE_READINESS_REFRESH_EPOCH )); then
  echo '[ui-release-one-pass] ERROR: Readiness report artifacts were not refreshed by the pre-gate release:ui-readiness run.'
  echo "[ui-release-one-pass] reportJsonMtime=$READINESS_REPORT_JSON_MTIME_EPOCH reportMarkdownMtime=$READINESS_REPORT_MD_MTIME_EPOCH refreshStart=$PRE_GATE_READINESS_REFRESH_EPOCH"
  echo '[ui-release-one-pass] Re-run release:ui-readiness and ensure latest readiness report JSON + markdown artifacts update before gate execution.'
  exit 1
fi
echo '[ui-release-one-pass] Verified readiness report freshness for current pre-gate refresh.'
READINESS_REPORT_JSON_SHA256=$(sha256sum work-logs/latest-ui-release-readiness-report.json 2>/dev/null | awk "{print \$1}" || echo unknown)
READINESS_REPORT_MD_SHA256=$(sha256sum work-logs/latest-ui-release-readiness-report.md 2>/dev/null | awk "{print \$1}" || echo unknown)
if [[ ! "$READINESS_REPORT_JSON_SHA256" =~ ^[a-f0-9]{64}$ || ! "$READINESS_REPORT_MD_SHA256" =~ ^[a-f0-9]{64}$ ]]; then
  echo '[ui-release-one-pass] ERROR: Invalid readiness report SHA-256 format for pre-gate drift assertion.'
  echo "[ui-release-one-pass] capturedReportJsonSha256=$READINESS_REPORT_JSON_SHA256 capturedReportMarkdownSha256=$READINESS_REPORT_MD_SHA256"
  echo '[ui-release-one-pass] Ensure readiness report JSON + markdown artifacts exist and return valid SHA-256 values before drift validation.'
  exit 1
fi
CURRENT_READINESS_REPORT_JSON_MTIME_EPOCH=$(stat -c %Y work-logs/latest-ui-release-readiness-report.json 2>/dev/null || echo 0)
CURRENT_READINESS_REPORT_MD_MTIME_EPOCH=$(stat -c %Y work-logs/latest-ui-release-readiness-report.md 2>/dev/null || echo 0)
if [[ ! "$CURRENT_READINESS_REPORT_JSON_MTIME_EPOCH" =~ ^[0-9]{10}$ || ! "$CURRENT_READINESS_REPORT_MD_MTIME_EPOCH" =~ ^[0-9]{10}$ ]]; then
  echo '[ui-release-one-pass] ERROR: Invalid readiness report mtime epoch format for pre-gate drift assertion.'
  echo "[ui-release-one-pass] currentReportJsonMtime=$CURRENT_READINESS_REPORT_JSON_MTIME_EPOCH currentReportMarkdownMtime=$CURRENT_READINESS_REPORT_MD_MTIME_EPOCH"
  echo '[ui-release-one-pass] Ensure readiness report artifacts exist and stat returns 10-digit unix epoch seconds before drift validation.'
  exit 1
fi
if [[ "$CURRENT_READINESS_REPORT_JSON_MTIME_EPOCH" != "$READINESS_REPORT_JSON_MTIME_EPOCH" || "$CURRENT_READINESS_REPORT_MD_MTIME_EPOCH" != "$READINESS_REPORT_MD_MTIME_EPOCH" ]]; then
  echo '[ui-release-one-pass] ERROR: Pre-gate readiness report mtime drift detected before release gate execution.'
  echo "[ui-release-one-pass] capturedReportJsonMtime=$READINESS_REPORT_JSON_MTIME_EPOCH currentReportJsonMtime=$CURRENT_READINESS_REPORT_JSON_MTIME_EPOCH capturedReportMarkdownMtime=$READINESS_REPORT_MD_MTIME_EPOCH currentReportMarkdownMtime=$CURRENT_READINESS_REPORT_MD_MTIME_EPOCH"
  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff to recapture stable readiness report artifacts before gate execution.'
  exit 1
fi
echo '[ui-release-one-pass] Verified pre-gate readiness report mtimes remain stable before gate execution.'
CURRENT_READINESS_REPORT_JSON_SHA256=$(sha256sum work-logs/latest-ui-release-readiness-report.json 2>/dev/null | awk "{print \$1}" || echo unknown)
CURRENT_READINESS_REPORT_MD_SHA256=$(sha256sum work-logs/latest-ui-release-readiness-report.md 2>/dev/null | awk "{print \$1}" || echo unknown)
if [[ ! "$CURRENT_READINESS_REPORT_JSON_SHA256" =~ ^[a-f0-9]{64}$ || ! "$CURRENT_READINESS_REPORT_MD_SHA256" =~ ^[a-f0-9]{64}$ ]]; then
  echo '[ui-release-one-pass] ERROR: Invalid readiness report SHA-256 format for current pre-gate drift assertion.'
  echo "[ui-release-one-pass] currentReportJsonSha256=$CURRENT_READINESS_REPORT_JSON_SHA256 currentReportMarkdownSha256=$CURRENT_READINESS_REPORT_MD_SHA256"
  echo '[ui-release-one-pass] Ensure readiness report artifacts remain present and hashable before gate execution.'
  exit 1
fi
if [[ "$CURRENT_READINESS_REPORT_JSON_SHA256" != "$READINESS_REPORT_JSON_SHA256" || "$CURRENT_READINESS_REPORT_MD_SHA256" != "$READINESS_REPORT_MD_SHA256" ]]; then
  echo '[ui-release-one-pass] ERROR: Pre-gate readiness report SHA-256 drift detected before release gate execution.'
  echo "[ui-release-one-pass] capturedReportJsonSha256=$READINESS_REPORT_JSON_SHA256 currentReportJsonSha256=$CURRENT_READINESS_REPORT_JSON_SHA256 capturedReportMarkdownSha256=$READINESS_REPORT_MD_SHA256 currentReportMarkdownSha256=$CURRENT_READINESS_REPORT_MD_SHA256"
  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff to recapture stable readiness report artifacts before gate execution.'
  exit 1
fi
echo '[ui-release-one-pass] Verified pre-gate readiness report SHA-256 values remain stable before gate execution.'
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
READINESS_TIMESTAMP_AFTER=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.timestamp||\"unknown\"));" work-logs/latest-ui-release-readiness.json)
if [[ "$READINESS_STATUS_AFTER" != "READY" || "$BLOCKING_CHECKS_AFTER" != "0" ]]; then
  echo '[ui-release-one-pass] ERROR: Readiness is not READY after pre-gate refresh.'
  echo "[ui-release-one-pass] status=$READINESS_STATUS_AFTER blockingChecks=$BLOCKING_CHECKS_AFTER"
  echo '[ui-release-one-pass] Resolve blockers before running release:ui-gate.'
  exit 1
fi
echo '[ui-release-one-pass] Readiness confirmed READY (0 blockers) before release gate.'
for REQUIRED_PRE_GATE_ARTIFACT in work-logs/latest-ui-release-readiness.json work-logs/latest-ui-release-readiness-report.json work-logs/latest-ui-release-readiness-report.md work-logs/latest-ui-release-handoff-bundle-manifest.json work-logs/latest-ui-release-handoff.md work-logs/latest-ui-release-operator-brief.md work-logs/latest-ui-release-one-pass.sh; do
  if [[ ! -f "$REQUIRED_PRE_GATE_ARTIFACT" ]]; then
    echo "[ui-release-one-pass] ERROR: Missing required pre-gate artifact: $REQUIRED_PRE_GATE_ARTIFACT"
    echo "[ui-release-one-pass] Re-run release:ui-ready-handoff to regenerate stable artifacts before gate execution."
    exit 1
  fi
done
echo '[ui-release-one-pass] Verified required pre-gate artifacts exist before metadata capture.'
RELEASE_GATE_START_EPOCH=$(date +%s)
if [[ ! "$RELEASE_GATE_START_EPOCH" =~ ^[0-9]{10}$ ]]; then
  echo '[ui-release-one-pass] ERROR: Invalid release gate start epoch format.'
  echo "[ui-release-one-pass] releaseGateStartEpoch=$RELEASE_GATE_START_EPOCH"
  echo '[ui-release-one-pass] Ensure date +%s resolves to a 10-digit unix epoch before run-token generation.'
  exit 1
fi
echo '[ui-release-one-pass] Verified release gate start epoch format for pre-gate evidence.'
RELEASE_GATE_RUN_TOKEN="one-pass-${RELEASE_GATE_START_EPOCH}-$RANDOM"
if [[ ! "$RELEASE_GATE_RUN_TOKEN" =~ ^one-pass-[0-9]{10}-[0-9]+$ ]]; then
  echo '[ui-release-one-pass] ERROR: Invalid release gate run-token format.'
  echo "[ui-release-one-pass] runToken=$RELEASE_GATE_RUN_TOKEN"
  echo '[ui-release-one-pass] Ensure run token generation matches one-pass-<epoch>-<random> format and retry.'
  exit 1
fi
echo '[ui-release-one-pass] Verified release gate run-token format for pre-gate evidence.'
RELEASE_GATE_EXPECTED_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
RELEASE_GATE_EXPECTED_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.timestamp||\"unknown\"));" work-logs/latest-ui-release-readiness.json 2>/dev/null || echo "unknown")
RELEASE_GATE_EXPECTED_READINESS_STATUS=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.status||\"unknown\"));" work-logs/latest-ui-release-readiness.json 2>/dev/null || echo "unknown")
RELEASE_GATE_EXPECTED_BLOCKING_CHECKS=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.blockingChecks ?? \"unknown\"));" work-logs/latest-ui-release-readiness.json 2>/dev/null || echo "unknown")
RELEASE_GATE_EXPECTED_READINESS_SHA256=$(sha256sum work-logs/latest-ui-release-readiness.json 2>/dev/null | awk "{print \$1}" || echo "unknown")
RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256=$(sha256sum work-logs/latest-ui-release-readiness-report.json 2>/dev/null | awk "{print \$1}" || echo "unknown")
RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256=$(sha256sum work-logs/latest-ui-release-readiness-report.md 2>/dev/null | awk "{print \$1}" || echo "unknown")
RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256=$(sha256sum work-logs/latest-ui-release-handoff-bundle-manifest.json 2>/dev/null | awk "{print \$1}" || echo "unknown")
RELEASE_GATE_EXPECTED_HANDOFF_SHA256=$(sha256sum work-logs/latest-ui-release-handoff.md 2>/dev/null | awk "{print \$1}" || echo "unknown")
RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256=$(sha256sum work-logs/latest-ui-release-operator-brief.md 2>/dev/null | awk "{print \$1}" || echo "unknown")
RELEASE_GATE_EXPECTED_ONE_PASS_SHA256=$(sha256sum work-logs/latest-ui-release-one-pass.sh 2>/dev/null | awk "{print \$1}" || echo "unknown")
export RELEASE_GATE_RUN_TOKEN RELEASE_GATE_EXPECTED_COMMIT RELEASE_GATE_EXPECTED_BRANCH RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP RELEASE_GATE_EXPECTED_READINESS_STATUS RELEASE_GATE_EXPECTED_BLOCKING_CHECKS RELEASE_GATE_EXPECTED_READINESS_SHA256 RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256 RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256 RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256 RELEASE_GATE_EXPECTED_HANDOFF_SHA256 RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256 RELEASE_GATE_EXPECTED_ONE_PASS_SHA256
for REQUIRED_GATE_METADATA_VAR in RELEASE_GATE_EXPECTED_COMMIT RELEASE_GATE_EXPECTED_BRANCH RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP RELEASE_GATE_EXPECTED_READINESS_STATUS RELEASE_GATE_EXPECTED_BLOCKING_CHECKS RELEASE_GATE_EXPECTED_READINESS_SHA256 RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256 RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256 RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256 RELEASE_GATE_EXPECTED_HANDOFF_SHA256 RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256 RELEASE_GATE_EXPECTED_ONE_PASS_SHA256; do
  REQUIRED_GATE_METADATA_VALUE="${!REQUIRED_GATE_METADATA_VAR:-}"
  if [[ -z "$REQUIRED_GATE_METADATA_VALUE" || "$REQUIRED_GATE_METADATA_VALUE" == "unknown" ]]; then
    echo "[ui-release-one-pass] ERROR: Missing deterministic pre-gate metadata for ${REQUIRED_GATE_METADATA_VAR}."
    echo "[ui-release-one-pass] Ensure latest handoff/readiness artifacts exist and retry release:ui-ready-handoff before running gate."
    exit 1
  fi
done
echo '[ui-release-one-pass] Verified deterministic pre-gate metadata capture before release gate.'
if [[ ! "$RELEASE_GATE_EXPECTED_COMMIT" =~ ^[a-f0-9]{7,40}$ ]]; then
  echo '[ui-release-one-pass] ERROR: Invalid commit hash format for pre-gate metadata.'
  echo "[ui-release-one-pass] commit=$RELEASE_GATE_EXPECTED_COMMIT"
  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff and ensure commit metadata is a valid git hash.'
  exit 1
fi
echo '[ui-release-one-pass] Verified commit hash metadata format for pre-gate evidence.'
if [[ ! "$RELEASE_GATE_EXPECTED_BRANCH" =~ ^[A-Za-z0-9._/-]+$ ]]; then
  echo '[ui-release-one-pass] ERROR: Invalid branch format for pre-gate metadata.'
  echo "[ui-release-one-pass] branch=$RELEASE_GATE_EXPECTED_BRANCH"
  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff and ensure branch metadata matches git branch naming rules (A-Z, a-z, 0-9, ., _, /, -).'
  exit 1
fi
echo '[ui-release-one-pass] Verified branch metadata format for pre-gate evidence.'
if [[ ! "$RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([+-][0-9]{4}|Z)$ ]]; then
  echo '[ui-release-one-pass] ERROR: Invalid readiness timestamp format for pre-gate metadata.'
  echo "[ui-release-one-pass] readinessTimestamp=$RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP"
  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff and ensure readiness timestamp uses ISO-8601 format (YYYY-MM-DDTHH:MM:SS±HHMM or Z).'
  exit 1
fi
echo '[ui-release-one-pass] Verified readiness timestamp metadata format for pre-gate evidence.'
if [[ "$RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP" != "$READINESS_TIMESTAMP_AFTER" ]]; then
  echo '[ui-release-one-pass] ERROR: Pre-gate readiness timestamp metadata drift detected before release gate execution.'
  echo "[ui-release-one-pass] expectedTimestamp=$READINESS_TIMESTAMP_AFTER capturedTimestamp=$RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP"
  echo '[ui-release-one-pass] Re-run release:ui-readiness and release:ui-ready-handoff, then retry once readiness timestamp metadata is stable.'
  exit 1
fi
echo '[ui-release-one-pass] Verified pre-gate readiness timestamp metadata remains stable before gate execution.'
if [[ ! "$RELEASE_GATE_EXPECTED_READINESS_STATUS" =~ ^(READY|NOT_READY)$ ]]; then
  echo '[ui-release-one-pass] ERROR: Invalid readiness status format for pre-gate metadata.'
  echo "[ui-release-one-pass] readinessStatus=$RELEASE_GATE_EXPECTED_READINESS_STATUS"
  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff and ensure readiness status metadata is READY or NOT_READY.'
  exit 1
fi
echo '[ui-release-one-pass] Verified readiness status metadata format for pre-gate evidence.'
if [[ "$RELEASE_GATE_EXPECTED_READINESS_STATUS" != "$READINESS_STATUS_AFTER" || "$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS" != "$BLOCKING_CHECKS_AFTER" ]]; then
  echo '[ui-release-one-pass] ERROR: Pre-gate readiness status/blocking metadata drift detected before release gate execution.'
  echo "[ui-release-one-pass] expectedStatus=$READINESS_STATUS_AFTER capturedStatus=$RELEASE_GATE_EXPECTED_READINESS_STATUS expectedBlockingChecks=$BLOCKING_CHECKS_AFTER capturedBlockingChecks=$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS"
  echo '[ui-release-one-pass] Re-run release:ui-readiness and release:ui-ready-handoff, then retry once status/blocking metadata is stable.'
  exit 1
fi
echo '[ui-release-one-pass] Verified pre-gate readiness status/blocking metadata remains stable before gate execution.'
if [[ "$RELEASE_GATE_EXPECTED_READINESS_STATUS" != "READY" || "$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS" != "0" ]]; then
  echo '[ui-release-one-pass] ERROR: Pre-gate readiness metadata drift detected before release gate execution.'
  echo "[ui-release-one-pass] readinessStatus=$RELEASE_GATE_EXPECTED_READINESS_STATUS readinessBlockingChecks=$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS"
  echo '[ui-release-one-pass] Re-run release:ui-readiness and release:ui-ready-handoff, then retry once metadata is READY with zero blockers.'
  exit 1
fi
echo '[ui-release-one-pass] Verified pre-gate readiness metadata remains READY with zero blockers.'
if [[ ! "$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS" =~ ^[0-9]+$ ]]; then
  echo '[ui-release-one-pass] ERROR: Invalid readiness blocking-check count format for pre-gate metadata.'
  echo "[ui-release-one-pass] readinessBlockingChecks=$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS"
  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff and ensure blocking-check metadata is numeric.'
  exit 1
fi
echo '[ui-release-one-pass] Verified readiness blocking-check metadata format for pre-gate evidence.'
for REQUIRED_SHA256_VAR in RELEASE_GATE_EXPECTED_READINESS_SHA256 RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256 RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256 RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256 RELEASE_GATE_EXPECTED_HANDOFF_SHA256 RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256 RELEASE_GATE_EXPECTED_ONE_PASS_SHA256; do
  REQUIRED_SHA256_VALUE="${!REQUIRED_SHA256_VAR:-}"
  if [[ ! "$REQUIRED_SHA256_VALUE" =~ ^[a-f0-9]{64}$ ]]; then
    echo "[ui-release-one-pass] ERROR: Invalid SHA-256 format for ${REQUIRED_SHA256_VAR}."
    echo "[ui-release-one-pass] value=$REQUIRED_SHA256_VALUE"
    echo "[ui-release-one-pass] Re-run release:ui-ready-handoff and ensure stable artifacts hash correctly before gate execution."
    exit 1
  fi
done
echo '[ui-release-one-pass] Verified SHA-256 metadata format for pre-gate evidence.'
CURRENT_BUNDLE_MANIFEST_SHA256=$(sha256sum work-logs/latest-ui-release-handoff-bundle-manifest.json 2>/dev/null | awk "{print \$1}" || echo "unknown")
if [[ ! "$CURRENT_BUNDLE_MANIFEST_SHA256" =~ ^[a-f0-9]{64}$ ]]; then
  echo '[ui-release-one-pass] ERROR: Invalid current handoff bundle manifest SHA-256 format for pre-gate drift assertion.'
  echo "[ui-release-one-pass] currentManifestSha256=$CURRENT_BUNDLE_MANIFEST_SHA256"
  echo '[ui-release-one-pass] Ensure latest-ui-release-handoff-bundle-manifest.json remains present and hashable before gate execution.'
  exit 1
fi
if [[ "$CURRENT_BUNDLE_MANIFEST_SHA256" != "$RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256" ]]; then
  echo '[ui-release-one-pass] ERROR: Pre-gate handoff bundle manifest SHA-256 drift detected before release gate execution.'
  echo "[ui-release-one-pass] capturedManifestSha256=$RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256 currentManifestSha256=$CURRENT_BUNDLE_MANIFEST_SHA256"
  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff to recapture stable handoff bundle manifest before gate execution.'
  exit 1
fi
echo '[ui-release-one-pass] Verified pre-gate handoff bundle manifest SHA-256 remains stable before gate execution.'
echo "[ui-release-one-pass] Release gate run token: $RELEASE_GATE_RUN_TOKEN"
echo "[ui-release-one-pass] Expected commit for gate evidence: $RELEASE_GATE_EXPECTED_COMMIT"
echo "[ui-release-one-pass] Expected branch for gate evidence: $RELEASE_GATE_EXPECTED_BRANCH"
echo "[ui-release-one-pass] Expected readiness timestamp for gate evidence: $RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP"
echo "[ui-release-one-pass] Expected readiness status for gate evidence: $RELEASE_GATE_EXPECTED_READINESS_STATUS"
echo "[ui-release-one-pass] Expected readiness blocking checks for gate evidence: $RELEASE_GATE_EXPECTED_BLOCKING_CHECKS"
echo "[ui-release-one-pass] Expected readiness snapshot SHA-256 for gate evidence: $RELEASE_GATE_EXPECTED_READINESS_SHA256"
echo "[ui-release-one-pass] Expected readiness report JSON SHA-256 for gate evidence: $RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256"
echo "[ui-release-one-pass] Expected readiness report markdown SHA-256 for gate evidence: $RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256"
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
if [[ ! "$SMOKE_EVIDENCE_MTIME_EPOCH" =~ ^[0-9]{10}$ ]]; then
  echo '[ui-release-one-pass] ERROR: Invalid smoke evidence mtime epoch format after release:ui-gate.'
  echo "[ui-release-one-pass] smokeEvidenceMtime=$SMOKE_EVIDENCE_MTIME_EPOCH"
  echo '[ui-release-one-pass] Ensure stat returns 10-digit unix epoch seconds before freshness verification.'
  exit 1
fi
echo '[ui-release-one-pass] Verified smoke evidence mtime epoch format for gate freshness check.'
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
if ! grep -Fq "Expected readiness report JSON SHA-256 from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256\\`" work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence readiness report JSON SHA-256 mismatch for this release:ui-gate run.'
  echo "[ui-release-one-pass] expectedReadinessReportJsonSha256=$RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256"
  echo '[ui-release-one-pass] Ensure release gate records expected readiness report JSON SHA-256 metadata and retry.'
  exit 1
fi
if ! grep -Fq "Expected readiness report markdown SHA-256 from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256\\`" work-logs/latest-ui-smoke-release-gate.md; then
  echo '[ui-release-one-pass] ERROR: Smoke evidence readiness report markdown SHA-256 mismatch for this release:ui-gate run.'
  echo "[ui-release-one-pass] expectedReadinessReportMarkdownSha256=$RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256"
  echo '[ui-release-one-pass] Ensure release gate records expected readiness report markdown SHA-256 metadata and retry.'
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
echo '[ui-release-one-pass] Verified readiness report JSON SHA-256 match in smoke evidence.'
echo '[ui-release-one-pass] Verified readiness report markdown SHA-256 match in smoke evidence.'
echo '[ui-release-one-pass] Verified handoff bundle manifest SHA-256 match in smoke evidence.'
echo '[ui-release-one-pass] Verified handoff markdown SHA-256 match in smoke evidence.'
echo '[ui-release-one-pass] Verified operator brief SHA-256 match in smoke evidence.'
echo '[ui-release-one-pass] Verified one-pass script SHA-256 match in smoke evidence.'
echo '[ui-release-one-pass] Verified PASS evidence: work-logs/latest-ui-smoke-release-gate.md'
