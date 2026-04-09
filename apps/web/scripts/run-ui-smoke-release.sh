#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_LOG_DIR="$(cd "$ROOT_DIR/../.." && pwd)/work-logs"
mkdir -p "$WORK_LOG_DIR"

TIMESTAMP_LOCAL="$(TZ=Australia/Sydney date +"%Y-%m-%d %I:%M %p (%Z)")"
FILE_STAMP="$(TZ=Australia/Sydney date +"%Y-%m-%d-%H%M")"
LOG_FILE="$WORK_LOG_DIR/${FILE_STAMP}-ui-smoke-release-gate.md"
LATEST_SMOKE_LOG_FILE="$WORK_LOG_DIR/latest-ui-smoke-release-gate.md"
GATE_RUN_TOKEN="${RELEASE_GATE_RUN_TOKEN:-not-provided}"
EXPECTED_COMMIT_SHA="${RELEASE_GATE_EXPECTED_COMMIT:-not-provided}"
EXPECTED_BRANCH_NAME="${RELEASE_GATE_EXPECTED_BRANCH:-not-provided}"
EXPECTED_READINESS_TIMESTAMP="${RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP:-not-provided}"
EXPECTED_READINESS_STATUS="${RELEASE_GATE_EXPECTED_READINESS_STATUS:-not-provided}"
EXPECTED_BLOCKING_CHECKS="${RELEASE_GATE_EXPECTED_BLOCKING_CHECKS:-not-provided}"
EXPECTED_READINESS_SHA256="${RELEASE_GATE_EXPECTED_READINESS_SHA256:-not-provided}"
EXPECTED_READINESS_REPORT_JSON_SHA256="${RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256:-not-provided}"
EXPECTED_READINESS_REPORT_MD_SHA256="${RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256:-not-provided}"
EXPECTED_BUNDLE_MANIFEST_SHA256="${RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256:-not-provided}"
EXPECTED_BUNDLE_MANIFEST_PATH="${RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_PATH:-not-provided}"
EXPECTED_HANDOFF_SHA256="${RELEASE_GATE_EXPECTED_HANDOFF_SHA256:-not-provided}"
EXPECTED_OPERATOR_BRIEF_SHA256="${RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256:-not-provided}"
EXPECTED_ONE_PASS_SHA256="${RELEASE_GATE_EXPECTED_ONE_PASS_SHA256:-not-provided}"
EXPECTED_WEB_DIR_PATH="${RELEASE_GATE_EXPECTED_WEB_DIR_PATH:-not-provided}"
REQUIRED_ONE_PASS_METADATA_VARS=(
  RELEASE_GATE_RUN_TOKEN
  RELEASE_GATE_EXPECTED_COMMIT
  RELEASE_GATE_EXPECTED_BRANCH
  RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP
  RELEASE_GATE_EXPECTED_READINESS_STATUS
  RELEASE_GATE_EXPECTED_BLOCKING_CHECKS
  RELEASE_GATE_EXPECTED_READINESS_SHA256
  RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256
  RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256
  RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256
  RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_PATH
  RELEASE_GATE_EXPECTED_HANDOFF_SHA256
  RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256
  RELEASE_GATE_EXPECTED_ONE_PASS_SHA256
  RELEASE_GATE_EXPECTED_WEB_DIR_PATH
)

sync_latest_smoke_log() {
  cp "$LOG_FILE" "$LATEST_SMOKE_LOG_FILE"
}

if [[ ! -t 0 ]]; then
  if [[ "${MC_AGENT_MODE:-}" == "true" ]]; then
    echo "[ui-release-gate] INFO: Bypassing interactive terminal check in MC_AGENT_MODE."
  else
    cat <<'EOF'
[ui-release-gate] ERROR: Interactive terminal required.
[ui-release-gate] This command needs a TTY for potential sudo prompts.
[ui-release-gate] Re-run in an interactive terminal via the prepared one-pass handoff script:
  cd apps/web
  bash ../work-logs/latest-ui-release-one-pass.sh
EOF
    exit 1
  fi
fi

MISSING_ONE_PASS_METADATA=()
for required_var in "${REQUIRED_ONE_PASS_METADATA_VARS[@]}"; do
  required_value="${!required_var:-}"
  if [[ -z "$required_value" || "$required_value" == "not-provided" ]]; then
    MISSING_ONE_PASS_METADATA+=("$required_var")
  fi
done

if (( ${#MISSING_ONE_PASS_METADATA[@]} > 0 )); then
  echo "[ui-release-gate] ERROR: Missing one-pass pre-gate metadata: ${MISSING_ONE_PASS_METADATA[*]}"
  echo '[ui-release-gate] Run the prepared handoff script so release evidence is deterministic:'
  echo '  cd apps/web'
  echo '  bash ../work-logs/latest-ui-release-one-pass.sh'
  exit 1
fi

INVALID_ONE_PASS_METADATA=()
[[ "$GATE_RUN_TOKEN" =~ ^one-pass-[0-9]{10}-[0-9]+$ ]] || INVALID_ONE_PASS_METADATA+=("RELEASE_GATE_RUN_TOKEN")
[[ "$EXPECTED_COMMIT_SHA" =~ ^[a-f0-9]{7,40}$ ]] || INVALID_ONE_PASS_METADATA+=("RELEASE_GATE_EXPECTED_COMMIT")
[[ "$EXPECTED_BRANCH_NAME" =~ ^[A-Za-z0-9._/-]+$ ]] || INVALID_ONE_PASS_METADATA+=("RELEASE_GATE_EXPECTED_BRANCH")
[[ "$EXPECTED_READINESS_TIMESTAMP" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([+-][0-9]{4}|Z)$ ]] || INVALID_ONE_PASS_METADATA+=("RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP")
[[ "$EXPECTED_READINESS_STATUS" =~ ^(READY|NOT_READY)$ ]] || INVALID_ONE_PASS_METADATA+=("RELEASE_GATE_EXPECTED_READINESS_STATUS")
[[ "$EXPECTED_BLOCKING_CHECKS" =~ ^[0-9]+$ ]] || INVALID_ONE_PASS_METADATA+=("RELEASE_GATE_EXPECTED_BLOCKING_CHECKS")
[[ "$EXPECTED_READINESS_SHA256" =~ ^[a-f0-9]{64}$ ]] || INVALID_ONE_PASS_METADATA+=("RELEASE_GATE_EXPECTED_READINESS_SHA256")
[[ "$EXPECTED_READINESS_REPORT_JSON_SHA256" =~ ^[a-f0-9]{64}$ ]] || INVALID_ONE_PASS_METADATA+=("RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256")
[[ "$EXPECTED_READINESS_REPORT_MD_SHA256" =~ ^[a-f0-9]{64}$ ]] || INVALID_ONE_PASS_METADATA+=("RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256")
[[ "$EXPECTED_BUNDLE_MANIFEST_SHA256" =~ ^[a-f0-9]{64}$ ]] || INVALID_ONE_PASS_METADATA+=("RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256")
[[ "$EXPECTED_BUNDLE_MANIFEST_PATH" == "work-logs/latest-ui-release-handoff-bundle-manifest.json" ]] || INVALID_ONE_PASS_METADATA+=("RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_PATH")
[[ "$EXPECTED_HANDOFF_SHA256" =~ ^[a-f0-9]{64}$ ]] || INVALID_ONE_PASS_METADATA+=("RELEASE_GATE_EXPECTED_HANDOFF_SHA256")
[[ "$EXPECTED_OPERATOR_BRIEF_SHA256" =~ ^[a-f0-9]{64}$ ]] || INVALID_ONE_PASS_METADATA+=("RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256")
[[ "$EXPECTED_ONE_PASS_SHA256" =~ ^[a-f0-9]{64}$ ]] || INVALID_ONE_PASS_METADATA+=("RELEASE_GATE_EXPECTED_ONE_PASS_SHA256")
[[ "$EXPECTED_WEB_DIR_PATH" == "$ROOT_DIR" ]] || INVALID_ONE_PASS_METADATA+=("RELEASE_GATE_EXPECTED_WEB_DIR_PATH")

if (( ${#INVALID_ONE_PASS_METADATA[@]} > 0 )); then
  echo "[ui-release-gate] ERROR: Invalid one-pass pre-gate metadata format: ${INVALID_ONE_PASS_METADATA[*]}"
  echo '[ui-release-gate] Re-run the prepared handoff script so release evidence metadata is recaptured deterministically:'
  echo '  cd apps/web'
  echo '  bash ../work-logs/latest-ui-release-one-pass.sh'
  exit 1
fi

echo '[ui-release-gate] Verified one-pass pre-gate metadata is present and well-formed before release gate execution.'

cd "$ROOT_DIR"
CURRENT_WEB_DIR_PATH="$(pwd -P)"
[[ "$CURRENT_WEB_DIR_PATH" == "$EXPECTED_WEB_DIR_PATH" ]] || {
  echo "[ui-release-gate] ERROR: Web directory path drift detected before release gate execution."
  echo "[ui-release-gate] expectedWebDir=$EXPECTED_WEB_DIR_PATH currentWebDir=$CURRENT_WEB_DIR_PATH"
  echo '[ui-release-gate] Re-run the prepared handoff script so release gate execution starts from the intended web directory path:'
  echo '  cd apps/web'
  echo '  bash ../work-logs/latest-ui-release-one-pass.sh'
  exit 1
}

echo '[ui-release-gate] Verified web directory path matches one-pass pre-gate expectation before release gate execution.'

EXPECTED_BUNDLE_MANIFEST_ABS_PATH="$ROOT_DIR/$EXPECTED_BUNDLE_MANIFEST_PATH"
[[ -f "$EXPECTED_BUNDLE_MANIFEST_ABS_PATH" ]] || {
  echo "[ui-release-gate] ERROR: Expected handoff bundle manifest file is missing: $EXPECTED_BUNDLE_MANIFEST_ABS_PATH"
  echo '[ui-release-gate] Re-run the prepared handoff script so stable handoff bundle artifacts are regenerated deterministically:'
  echo '  cd apps/web'
  echo '  bash ../work-logs/latest-ui-release-one-pass.sh'
  exit 1
}

CURRENT_BUNDLE_MANIFEST_SHA256="$(sha256sum "$EXPECTED_BUNDLE_MANIFEST_ABS_PATH" 2>/dev/null | awk '{print $1}' || echo 'unknown')"
CURRENT_BUNDLE_MANIFEST_SELF_PATH="$(node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(d.artifacts?.latestBundleManifest?.path||'unknown'));" "$EXPECTED_BUNDLE_MANIFEST_ABS_PATH" 2>/dev/null || echo 'unknown')"

[[ "$CURRENT_BUNDLE_MANIFEST_SHA256" =~ ^[a-f0-9]{64}$ ]] || {
  echo "[ui-release-gate] ERROR: Expected handoff bundle manifest SHA-256 is malformed on disk: $CURRENT_BUNDLE_MANIFEST_SHA256"
  echo '[ui-release-gate] Re-run the prepared handoff script so stable handoff bundle artifacts are regenerated deterministically:'
  echo '  cd apps/web'
  echo '  bash ../work-logs/latest-ui-release-one-pass.sh'
  exit 1
}

[[ "$CURRENT_BUNDLE_MANIFEST_SHA256" == "$EXPECTED_BUNDLE_MANIFEST_SHA256" ]] || {
  echo "[ui-release-gate] ERROR: Expected handoff bundle manifest SHA-256 drift detected before release gate execution."
  echo "[ui-release-gate] expectedManifestSha256=$EXPECTED_BUNDLE_MANIFEST_SHA256 currentManifestSha256=$CURRENT_BUNDLE_MANIFEST_SHA256"
  echo '[ui-release-gate] Re-run the prepared handoff script so stable handoff bundle artifacts are regenerated deterministically:'
  echo '  cd apps/web'
  echo '  bash ../work-logs/latest-ui-release-one-pass.sh'
  exit 1
}

[[ "$CURRENT_BUNDLE_MANIFEST_SELF_PATH" == "$EXPECTED_BUNDLE_MANIFEST_PATH" ]] || {
  echo "[ui-release-gate] ERROR: Expected handoff bundle manifest self-path drift detected before release gate execution."
  echo "[ui-release-gate] expectedManifestPath=$EXPECTED_BUNDLE_MANIFEST_PATH currentManifestSelfPath=$CURRENT_BUNDLE_MANIFEST_SELF_PATH"
  echo '[ui-release-gate] Re-run the prepared handoff script so stable handoff bundle artifacts are regenerated deterministically:'
  echo '  cd apps/web'
  echo '  bash ../work-logs/latest-ui-release-one-pass.sh'
  exit 1
}

echo '[ui-release-gate] Verified stable handoff bundle manifest file, SHA-256, and self-path before release gate execution.'

{
  echo "# UI Smoke Release Gate"
  echo
  echo "- Timestamp: $TIMESTAMP_LOCAL"
  echo "- Working directory: \\`apps/web\\`"
  echo "- Gate run token: \\`$GATE_RUN_TOKEN\\`"
  echo "- Expected commit from one-pass pre-gate check: \\`$EXPECTED_COMMIT_SHA\\`"
  echo "- Expected branch from one-pass pre-gate check: \\`$EXPECTED_BRANCH_NAME\\`"
  echo "- Expected readiness snapshot timestamp from one-pass pre-gate check: \\`$EXPECTED_READINESS_TIMESTAMP\\`"
  echo "- Expected readiness status from one-pass pre-gate check: \\`$EXPECTED_READINESS_STATUS\\`"
  echo "- Expected readiness blocking checks from one-pass pre-gate check: \\`$EXPECTED_BLOCKING_CHECKS\\`"
  echo "- Expected readiness snapshot SHA-256 from one-pass pre-gate check: \\`$EXPECTED_READINESS_SHA256\\`"
  echo "- Expected readiness report JSON SHA-256 from one-pass pre-gate check: \\`$EXPECTED_READINESS_REPORT_JSON_SHA256\\`"
  echo "- Expected readiness report markdown SHA-256 from one-pass pre-gate check: \\`$EXPECTED_READINESS_REPORT_MD_SHA256\\`"
  echo "- Expected handoff bundle manifest SHA-256 from one-pass pre-gate check: \\`$EXPECTED_BUNDLE_MANIFEST_SHA256\\`"
  echo "- Expected handoff bundle manifest path from one-pass pre-gate check: \\`$EXPECTED_BUNDLE_MANIFEST_PATH\\`"
  echo "- Expected handoff markdown SHA-256 from one-pass pre-gate check: \\`$EXPECTED_HANDOFF_SHA256\\`"
  echo "- Expected operator brief SHA-256 from one-pass pre-gate check: \\`$EXPECTED_OPERATOR_BRIEF_SHA256\\`"
  echo "- Expected one-pass script SHA-256 from one-pass pre-gate check: \\`$EXPECTED_ONE_PASS_SHA256\\`"
  echo "- Expected web directory path from one-pass pre-gate check: \\`$EXPECTED_WEB_DIR_PATH\\`"
  echo
  echo "## Command Sequence"
  echo
  echo "1. \\`npm run deps:playwright-host\\`"
  echo "2. \\`npm run smoke:ui\\`"
  echo
  echo "## Results"
  echo
} > "$LOG_FILE"
sync_latest_smoke_log

echo "[ui-release-gate] Running Playwright host dependency installer..."
if npm run deps:playwright-host; then
  echo "- deps:playwright-host: ✅ PASS" >> "$LOG_FILE"
else
  echo "- deps:playwright-host: ❌ FAIL" >> "$LOG_FILE"
  echo >> "$LOG_FILE"
  echo "### Notes" >> "$LOG_FILE"
  echo "- Host dependency install failed. Resolve in interactive elevated shell, then rerun this gate." >> "$LOG_FILE"
  sync_latest_smoke_log
  echo
  echo "[ui-release-gate] FAILED during dependency install. Evidence saved: $LOG_FILE"
  echo "[ui-release-gate] Latest evidence pointer updated: $LATEST_SMOKE_LOG_FILE"
  exit 1
fi

echo "[ui-release-gate] Running UI smoke suite..."
if npm run smoke:ui; then
  echo "- smoke:ui: ✅ PASS" >> "$LOG_FILE"
else
  echo "- smoke:ui: ❌ FAIL" >> "$LOG_FILE"
  echo >> "$LOG_FILE"
  echo "### Notes" >> "$LOG_FILE"
  echo "- Playwright smoke failed. Inspect test output above and fix before release." >> "$LOG_FILE"
  sync_latest_smoke_log
  echo
  echo "[ui-release-gate] FAILED during UI smoke. Evidence saved: $LOG_FILE"
  echo "[ui-release-gate] Latest evidence pointer updated: $LATEST_SMOKE_LOG_FILE"
  exit 1
fi

COMMIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
BRANCH_NAME="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"

[[ "$COMMIT_SHA" =~ ^[a-f0-9]{7,40}$ ]] || {
  echo >> "$LOG_FILE"
  echo "### Notes" >> "$LOG_FILE"
  echo "- Final git commit snapshot was malformed after smoke execution: \\`$COMMIT_SHA\\`." >> "$LOG_FILE"
  sync_latest_smoke_log
  echo "[ui-release-gate] ERROR: Final git commit snapshot is malformed: $COMMIT_SHA"
  exit 1
}

[[ "$BRANCH_NAME" =~ ^[A-Za-z0-9._/-]+$ ]] || {
  echo >> "$LOG_FILE"
  echo "### Notes" >> "$LOG_FILE"
  echo "- Final git branch snapshot was malformed after smoke execution: \\`$BRANCH_NAME\\`." >> "$LOG_FILE"
  sync_latest_smoke_log
  echo "[ui-release-gate] ERROR: Final git branch snapshot is malformed: $BRANCH_NAME"
  exit 1
}

[[ "$COMMIT_SHA" == "$EXPECTED_COMMIT_SHA" ]] || {
  echo >> "$LOG_FILE"
  echo "### Notes" >> "$LOG_FILE"
  echo "- Final git commit snapshot drifted from one-pass pre-gate expectation (expected \\`$EXPECTED_COMMIT_SHA\\`, got \\`$COMMIT_SHA\\`)." >> "$LOG_FILE"
  sync_latest_smoke_log
  echo "[ui-release-gate] ERROR: Final git commit snapshot drifted from expected pre-gate commit."
  exit 1
}

[[ "$BRANCH_NAME" == "$EXPECTED_BRANCH_NAME" ]] || {
  echo >> "$LOG_FILE"
  echo "### Notes" >> "$LOG_FILE"
  echo "- Final git branch snapshot drifted from one-pass pre-gate expectation (expected \\`$EXPECTED_BRANCH_NAME\\`, got \\`$BRANCH_NAME\\`)." >> "$LOG_FILE"
  sync_latest_smoke_log
  echo "[ui-release-gate] ERROR: Final git branch snapshot drifted from expected pre-gate branch."
  exit 1
}

echo '[ui-release-gate] Verified final git commit/branch snapshot remains well-formed and matches one-pass pre-gate expectations.'
echo '[ui-release-gate] Verified web directory path remains anchored to one-pass pre-gate expectation during release gate execution.'

echo >> "$LOG_FILE"
echo "## Release Evidence Snapshot" >> "$LOG_FILE"
echo >> "$LOG_FILE"
echo "- Commit: \\`$COMMIT_SHA\\`" >> "$LOG_FILE"
echo "- Branch: \\`$BRANCH_NAME\\`" >> "$LOG_FILE"
echo "- Web directory path: \\`$CURRENT_WEB_DIR_PATH\\`" >> "$LOG_FILE"
echo "- UI release gate: ✅ PASS" >> "$LOG_FILE"
echo "- Next: attach this log to release evidence and close Phase 5 gate." >> "$LOG_FILE"
sync_latest_smoke_log

echo "[ui-release-gate] PASS. Evidence saved: $LOG_FILE"
echo "[ui-release-gate] Latest evidence pointer updated: $LATEST_SMOKE_LOG_FILE"
