#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR"
WORK_LOG_DIR="$(cd "$ROOT_DIR/../.." && pwd)/work-logs"
READINESS_FILE="$WORK_LOG_DIR/latest-ui-release-readiness.json"
READINESS_REPORT_JSON_FILE="$WORK_LOG_DIR/latest-ui-release-readiness-report.json"
READINESS_REPORT_MD_FILE="$WORK_LOG_DIR/latest-ui-release-readiness-report.md"

mkdir -p "$WORK_LOG_DIR"

FILE_STAMP="$(TZ=Australia/Sydney date +"%Y-%m-%d-%H%M")"
TIMESTAMP_LOCAL="$(TZ=Australia/Sydney date +"%Y-%m-%d %I:%M %p (%Z)")"
HANDOFF_FILE="$WORK_LOG_DIR/${FILE_STAMP}-ui-release-handoff.md"
LATEST_HANDOFF_FILE="$WORK_LOG_DIR/latest-ui-release-handoff.md"
ONE_PASS_SCRIPT_FILE="$WORK_LOG_DIR/${FILE_STAMP}-ui-release-one-pass.sh"
LATEST_ONE_PASS_SCRIPT_FILE="$WORK_LOG_DIR/latest-ui-release-one-pass.sh"
OPERATOR_BRIEF_FILE="$WORK_LOG_DIR/${FILE_STAMP}-ui-release-operator-brief.md"
LATEST_OPERATOR_BRIEF_FILE="$WORK_LOG_DIR/latest-ui-release-operator-brief.md"
BUNDLE_MANIFEST_FILE="$WORK_LOG_DIR/${FILE_STAMP}-ui-release-handoff-bundle-manifest.json"
LATEST_BUNDLE_MANIFEST_FILE="$WORK_LOG_DIR/latest-ui-release-handoff-bundle-manifest.json"

if [[ ! -f "$READINESS_FILE" ]]; then
  cat <<EOF
[ui-release-handoff] ERROR: Missing readiness snapshot: $READINESS_FILE
[ui-release-handoff] Run first:
  cd apps/web
  npm run release:ui-readiness
EOF
  exit 1
fi

read -r READINESS_STATUS BLOCKING_CHECKS INTERACTIVE_OK LIBNSPR4_OK PLAYWRIGHT_OK RUNTIME_OK SNAPSHOT_TIMESTAMP SNAPSHOT_AGE_MINUTES < <(
  node -e "const fs=require('fs');const p=process.argv[1];const d=JSON.parse(fs.readFileSync(p,'utf8'));const c=d.checks||{};const ts=d.timestamp||'';const age=ts?Math.max(0,Math.floor((Date.now()-new Date(ts).getTime())/60000)):999999;console.log([d.status||'UNKNOWN',d.blockingChecks??'0',!!c.interactiveTerminal,!!c.libnspr4,!!c.playwrightPackage,!!c.playwrightRuntimeLaunch,ts||'UNKNOWN',age].join(' '));" "$READINESS_FILE"
)

PREV_BLOCKING_CHECKS="NA"
BLOCKING_DELTA="unknown"
PREV_READINESS_FILE=""
mapfile -t RECENT_READINESS_JSONS < <(ls -1t "$WORK_LOG_DIR"/*-ui-release-readiness-report.json 2>/dev/null || true)
if (( ${#RECENT_READINESS_JSONS[@]} >= 2 )); then
  PREV_READINESS_FILE="${RECENT_READINESS_JSONS[1]}"
  PREV_BLOCKING_CHECKS="$(node -e "const fs=require('fs');const p=process.argv[1];const d=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write(String(d.blockingChecks ?? 'NA'));" "$PREV_READINESS_FILE")"
  if [[ "$PREV_BLOCKING_CHECKS" =~ ^[0-9]+$ ]] && [[ "$BLOCKING_CHECKS" =~ ^[0-9]+$ ]]; then
    if (( BLOCKING_CHECKS < PREV_BLOCKING_CHECKS )); then
      BLOCKING_DELTA="improved"
    elif (( BLOCKING_CHECKS > PREV_BLOCKING_CHECKS )); then
      BLOCKING_DELTA="regressed"
    else
      BLOCKING_DELTA="unchanged"
    fi
  fi
fi

FRESHNESS_NOTE="fresh"
if [[ "$SNAPSHOT_AGE_MINUTES" =~ ^[0-9]+$ ]] && (( SNAPSHOT_AGE_MINUTES > 120 )); then
  FRESHNESS_NOTE="stale"
fi

HAS_BLOCKERS="false"
if [[ "$INTERACTIVE_OK" != "true" || "$LIBNSPR4_OK" != "true" || "$RUNTIME_OK" != "true" ]]; then
  HAS_BLOCKERS="true"
fi

SHOULD_REFRESH_READINESS="false"
if [[ "$FRESHNESS_NOTE" == "stale" ]]; then
  SHOULD_REFRESH_READINESS="true"
fi

{
  echo '#!/usr/bin/env bash'
  echo 'set -euo pipefail'
  echo
  echo 'if [[ ! -t 0 ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Interactive terminal required before running release gate prerequisites.'"
  echo "  echo '[ui-release-one-pass] Re-run this script in an interactive elevated host terminal.'"
  echo '  exit 1'
  echo 'fi'
  echo
  printf 'cd %q\n' "$WEB_DIR"
  printf 'EXPECTED_WEB_DIR_PATH=%q\n' "$WEB_DIR"
  echo 'CURRENT_WORKING_DIR=$(pwd -P)'
  echo 'if [[ "$CURRENT_WORKING_DIR" != "$EXPECTED_WEB_DIR_PATH" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Working directory path mismatch before release gate prerequisites.'"
  echo '  echo "[ui-release-one-pass] expectedWorkingDir=$EXPECTED_WEB_DIR_PATH currentWorkingDir=$CURRENT_WORKING_DIR"'
  echo "  echo '[ui-release-one-pass] Re-run the prepared one-pass script without changing directories after launch.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified working directory path matches generated web directory before release gate prerequisites.'"
  if [[ "$SHOULD_REFRESH_READINESS" == "true" ]]; then
    echo 'npm run release:ui-readiness'
  fi
  if [[ "$PLAYWRIGHT_OK" != "true" ]]; then
    echo 'npm install'
  fi
  if [[ "$LIBNSPR4_OK" != "true" || "$RUNTIME_OK" != "true" ]]; then
    echo 'if ! command -v sudo >/dev/null 2>&1; then'
    echo "  echo '[ui-release-one-pass] ERROR: sudo is required to install Playwright host dependencies (libnspr4).'"
    echo "  echo '[ui-release-one-pass] Re-run on a host with sudo access, then retry.'"
    echo '  exit 1'
    echo 'fi'
    echo 'if ! sudo -n true >/dev/null 2>&1; then'
    echo "  echo '[ui-release-one-pass] ERROR: Non-interactive sudo pre-auth check failed for host dependency install.'"
    echo "  echo '[ui-release-one-pass] Run sudo -v in this terminal first, then rerun this one-pass script.'"
    echo '  exit 1'
    echo 'fi'
    echo "echo '[ui-release-one-pass] Verified sudo pre-authenticated for host dependency install.'"
    echo 'npm run deps:playwright-host'
    echo 'npm run release:ui-readiness'
  fi
  echo 'npm run release:ui-handoff-verify'
  echo 'PRE_GATE_READINESS_REFRESH_EPOCH=$(date +%s)'
  echo 'npm run release:ui-readiness'
  echo 'READINESS_REFRESH_MTIME_EPOCH=$(stat -c %Y work-logs/latest-ui-release-readiness.json 2>/dev/null || echo 0)'
  echo 'if [[ ! "$PRE_GATE_READINESS_REFRESH_EPOCH" =~ ^[0-9]{10}$ || ! "$READINESS_REFRESH_MTIME_EPOCH" =~ ^[0-9]{10}$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid readiness refresh epoch format for pre-gate freshness assertion.'"
  echo '  echo "[ui-release-one-pass] refreshStart=$PRE_GATE_READINESS_REFRESH_EPOCH readinessMtime=$READINESS_REFRESH_MTIME_EPOCH"'
  echo "  echo '[ui-release-one-pass] Ensure date/stat return 10-digit unix epoch seconds before freshness validation.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified readiness refresh epoch format for pre-gate evidence.'"
  echo 'if (( READINESS_REFRESH_MTIME_EPOCH < PRE_GATE_READINESS_REFRESH_EPOCH )); then'
  echo "  echo '[ui-release-one-pass] ERROR: Readiness snapshot file was not refreshed by the pre-gate release:ui-readiness run.'"
  echo '  echo "[ui-release-one-pass] readinessMtime=$READINESS_REFRESH_MTIME_EPOCH refreshStart=$PRE_GATE_READINESS_REFRESH_EPOCH"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-readiness and ensure latest-ui-release-readiness.json updates.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified readiness snapshot freshness for current pre-gate refresh.'"
  echo 'READINESS_REPORT_JSON_MTIME_EPOCH=$(stat -c %Y work-logs/latest-ui-release-readiness-report.json 2>/dev/null || echo 0)'
  echo 'READINESS_REPORT_MD_MTIME_EPOCH=$(stat -c %Y work-logs/latest-ui-release-readiness-report.md 2>/dev/null || echo 0)'
  echo 'if [[ ! "$READINESS_REPORT_JSON_MTIME_EPOCH" =~ ^[0-9]{10}$ || ! "$READINESS_REPORT_MD_MTIME_EPOCH" =~ ^[0-9]{10}$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid readiness report mtime epoch format for pre-gate freshness assertion.'"
  echo '  echo "[ui-release-one-pass] readinessReportJsonMtime=$READINESS_REPORT_JSON_MTIME_EPOCH readinessReportMarkdownMtime=$READINESS_REPORT_MD_MTIME_EPOCH"'
  echo "  echo '[ui-release-one-pass] Ensure readiness report artifacts exist and stat returns 10-digit unix epoch seconds before freshness validation.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if (( READINESS_REPORT_JSON_MTIME_EPOCH < PRE_GATE_READINESS_REFRESH_EPOCH || READINESS_REPORT_MD_MTIME_EPOCH < PRE_GATE_READINESS_REFRESH_EPOCH )); then'
  echo "  echo '[ui-release-one-pass] ERROR: Readiness report artifacts were not refreshed by the pre-gate release:ui-readiness run.'"
  echo '  echo "[ui-release-one-pass] reportJsonMtime=$READINESS_REPORT_JSON_MTIME_EPOCH reportMarkdownMtime=$READINESS_REPORT_MD_MTIME_EPOCH refreshStart=$PRE_GATE_READINESS_REFRESH_EPOCH"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-readiness and ensure latest readiness report JSON + markdown artifacts update before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified readiness report freshness for current pre-gate refresh.'"
  echo 'READINESS_REPORT_JSON_SHA256=$(sha256sum work-logs/latest-ui-release-readiness-report.json 2>/dev/null | awk "{print \$1}" || echo unknown)'
  echo 'READINESS_REPORT_MD_SHA256=$(sha256sum work-logs/latest-ui-release-readiness-report.md 2>/dev/null | awk "{print \$1}" || echo unknown)'
  echo 'if [[ ! "$READINESS_REPORT_JSON_SHA256" =~ ^[a-f0-9]{64}$ || ! "$READINESS_REPORT_MD_SHA256" =~ ^[a-f0-9]{64}$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid readiness report SHA-256 format for pre-gate drift assertion.'"
  echo '  echo "[ui-release-one-pass] capturedReportJsonSha256=$READINESS_REPORT_JSON_SHA256 capturedReportMarkdownSha256=$READINESS_REPORT_MD_SHA256"'
  echo "  echo '[ui-release-one-pass] Ensure readiness report JSON + markdown artifacts exist and return valid SHA-256 values before drift validation.'"
  echo '  exit 1'
  echo 'fi'
  echo 'CURRENT_READINESS_REPORT_JSON_MTIME_EPOCH=$(stat -c %Y work-logs/latest-ui-release-readiness-report.json 2>/dev/null || echo 0)'
  echo 'CURRENT_READINESS_REPORT_MD_MTIME_EPOCH=$(stat -c %Y work-logs/latest-ui-release-readiness-report.md 2>/dev/null || echo 0)'
  echo 'if [[ ! "$CURRENT_READINESS_REPORT_JSON_MTIME_EPOCH" =~ ^[0-9]{10}$ || ! "$CURRENT_READINESS_REPORT_MD_MTIME_EPOCH" =~ ^[0-9]{10}$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid readiness report mtime epoch format for pre-gate drift assertion.'"
  echo '  echo "[ui-release-one-pass] currentReportJsonMtime=$CURRENT_READINESS_REPORT_JSON_MTIME_EPOCH currentReportMarkdownMtime=$CURRENT_READINESS_REPORT_MD_MTIME_EPOCH"'
  echo "  echo '[ui-release-one-pass] Ensure readiness report artifacts exist and stat returns 10-digit unix epoch seconds before drift validation.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if [[ "$CURRENT_READINESS_REPORT_JSON_MTIME_EPOCH" != "$READINESS_REPORT_JSON_MTIME_EPOCH" || "$CURRENT_READINESS_REPORT_MD_MTIME_EPOCH" != "$READINESS_REPORT_MD_MTIME_EPOCH" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Pre-gate readiness report mtime drift detected before release gate execution.'"
  echo '  echo "[ui-release-one-pass] capturedReportJsonMtime=$READINESS_REPORT_JSON_MTIME_EPOCH currentReportJsonMtime=$CURRENT_READINESS_REPORT_JSON_MTIME_EPOCH capturedReportMarkdownMtime=$READINESS_REPORT_MD_MTIME_EPOCH currentReportMarkdownMtime=$CURRENT_READINESS_REPORT_MD_MTIME_EPOCH"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff to recapture stable readiness report artifacts before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified pre-gate readiness report mtimes remain stable before gate execution.'"
  echo 'CURRENT_READINESS_REPORT_JSON_SHA256=$(sha256sum work-logs/latest-ui-release-readiness-report.json 2>/dev/null | awk "{print \$1}" || echo unknown)'
  echo 'CURRENT_READINESS_REPORT_MD_SHA256=$(sha256sum work-logs/latest-ui-release-readiness-report.md 2>/dev/null | awk "{print \$1}" || echo unknown)'
  echo 'if [[ ! "$CURRENT_READINESS_REPORT_JSON_SHA256" =~ ^[a-f0-9]{64}$ || ! "$CURRENT_READINESS_REPORT_MD_SHA256" =~ ^[a-f0-9]{64}$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid readiness report SHA-256 format for current pre-gate drift assertion.'"
  echo '  echo "[ui-release-one-pass] currentReportJsonSha256=$CURRENT_READINESS_REPORT_JSON_SHA256 currentReportMarkdownSha256=$CURRENT_READINESS_REPORT_MD_SHA256"'
  echo "  echo '[ui-release-one-pass] Ensure readiness report artifacts remain present and hashable before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if [[ "$CURRENT_READINESS_REPORT_JSON_SHA256" != "$READINESS_REPORT_JSON_SHA256" || "$CURRENT_READINESS_REPORT_MD_SHA256" != "$READINESS_REPORT_MD_SHA256" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Pre-gate readiness report SHA-256 drift detected before release gate execution.'"
  echo '  echo "[ui-release-one-pass] capturedReportJsonSha256=$READINESS_REPORT_JSON_SHA256 currentReportJsonSha256=$CURRENT_READINESS_REPORT_JSON_SHA256 capturedReportMarkdownSha256=$READINESS_REPORT_MD_SHA256 currentReportMarkdownSha256=$CURRENT_READINESS_REPORT_MD_SHA256"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff to recapture stable readiness report artifacts before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified pre-gate readiness report SHA-256 values remain stable before gate execution.'"
  echo 'EXPECTED_WEB_DIR=$(pwd -P)'
  echo 'if [[ "$EXPECTED_WEB_DIR" != "$EXPECTED_WEB_DIR_PATH" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Current working directory drifted from generated web directory before release gate.'"
  echo '  echo "[ui-release-one-pass] expectedWorkingDir=$EXPECTED_WEB_DIR_PATH currentWorkingDir=$EXPECTED_WEB_DIR"'
  echo "  echo '[ui-release-one-pass] Re-run the prepared one-pass script from the generated web directory path.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified current working directory still matches generated web directory before release gate.'"
  echo 'CURRENT_GIT_TOPLEVEL=$(git rev-parse --show-toplevel 2>/dev/null || echo "unknown")'
  echo 'if [[ "$CURRENT_GIT_TOPLEVEL" != "$EXPECTED_WEB_DIR" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Git repository context mismatch before release gate.'"
  echo '  echo "[ui-release-one-pass] expectedTopLevel=$EXPECTED_WEB_DIR currentTopLevel=$CURRENT_GIT_TOPLEVEL"'
  echo "  echo '[ui-release-one-pass] Ensure script runs from the intended web repository root, then retry.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified git repository context matches expected web directory before release gate.'"
  echo 'GIT_PREFIX=$(git rev-parse --show-prefix 2>/dev/null || echo "unknown")'
  echo 'if [[ "$GIT_PREFIX" == "unknown" || -n "$GIT_PREFIX" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Git execution context is not repository root before release gate.'"
  echo '  echo "[ui-release-one-pass] gitPrefix=$GIT_PREFIX"'
  echo "  echo '[ui-release-one-pass] cd to the web repository root before running one-pass gate flow.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified git execution context is repository root (no prefix) before release gate.'"
  echo 'if [[ "$(git rev-parse --is-inside-work-tree 2>/dev/null || echo "false")" != "true" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Current directory is not an active git work tree before release gate.'"
  echo "  echo '[ui-release-one-pass] Ensure repository metadata is intact and rerun from the web repository root.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified active git work-tree context before release gate.'"
  echo 'if [[ "$(git rev-parse --is-inside-git-dir 2>/dev/null || echo "false")" == "true" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Git execution context is inside .git directory before release gate.'"
  echo "  echo '[ui-release-one-pass] Run from the repository work-tree root (not inside .git metadata paths), then retry.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified git execution context is outside .git metadata directory before release gate.'"
  echo 'GIT_COMMON_DIR=$(git rev-parse --git-common-dir 2>/dev/null || echo "unknown")'
  echo 'if [[ "$GIT_COMMON_DIR" == "unknown" || ! -d "$GIT_COMMON_DIR" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Git common-dir is missing or invalid before release gate.'"
  echo '  echo "[ui-release-one-pass] gitCommonDir=$GIT_COMMON_DIR"'
  echo "  echo '[ui-release-one-pass] Ensure repository git metadata is intact, then rerun from the web repository root.'"
  echo '  exit 1'
  echo 'fi'
  echo 'RESOLVED_GIT_COMMON_DIR=$(cd "$GIT_COMMON_DIR" && pwd -P)'
  echo "echo '[ui-release-one-pass] Verified git common-dir exists before release gate.'"
  echo 'GIT_DIR=$(git rev-parse --git-dir 2>/dev/null || echo "unknown")'
  echo 'if [[ "$GIT_DIR" == "unknown" || ! -d "$GIT_DIR" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Git dir is missing or invalid before release gate.'"
  echo '  echo "[ui-release-one-pass] gitDir=$GIT_DIR"'
  echo "  echo '[ui-release-one-pass] Ensure repository git dir metadata is intact, then rerun from the web repository root.'"
  echo '  exit 1'
  echo 'fi'
  echo 'RESOLVED_GIT_DIR=$(cd "$GIT_DIR" && pwd -P)'
  echo "echo '[ui-release-one-pass] Verified git dir exists before release gate.'"
  echo 'if ! git diff --quiet || ! git diff --cached --quiet; then'
  echo "  echo '[ui-release-one-pass] ERROR: Tracked git changes detected before release gate.'"
  echo "  echo '[ui-release-one-pass] Commit or stash tracked changes, then rerun.'"
  echo '  git status --short'
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Git tracked changes clean before release gate.'"
  echo 'UNTRACKED_PRE_GATE_FILES=$(git ls-files --others --exclude-standard)'
  echo 'if [[ -n "$UNTRACKED_PRE_GATE_FILES" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Untracked git files detected before release gate.'"
  echo "  echo '[ui-release-one-pass] Commit, stash, or clean untracked files, then rerun.'"
  echo '  printf "%s\n" "$UNTRACKED_PRE_GATE_FILES"'
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Git untracked files clean before release gate.'"
  echo 'if [[ -f .git/MERGE_HEAD || -d .git/rebase-apply || -d .git/rebase-merge || -f .git/CHERRY_PICK_HEAD || -f .git/REVERT_HEAD || -f .git/BISECT_LOG ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Git operation in progress (merge/rebase/cherry-pick/revert/bisect) before release gate.'"
  echo "  echo '[ui-release-one-pass] Complete or abort in-progress git operations, then rerun.'"
  echo '  git status --short --branch'
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified no in-progress git operations before release gate.'"
  echo 'if [[ -f .git/index.lock ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Git index lock detected before release gate (.git/index.lock).'"
  echo "  echo '[ui-release-one-pass] Ensure no concurrent git process is running, remove stale lock, then rerun.'"
  echo '  ls -l .git/index.lock'
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified no git index lock before release gate.'"
  echo 'if [[ ! -f work-logs/latest-ui-release-readiness.json ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Missing readiness snapshot after refresh: work-logs/latest-ui-release-readiness.json'"
  echo '  exit 1'
  echo 'fi'
  echo 'READINESS_STATUS_AFTER=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.status||\"UNKNOWN\"));" work-logs/latest-ui-release-readiness.json)'
  echo 'BLOCKING_CHECKS_AFTER=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.blockingChecks ?? \"NA\"));" work-logs/latest-ui-release-readiness.json)'
  echo 'READINESS_TIMESTAMP_AFTER=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.timestamp||\"unknown\"));" work-logs/latest-ui-release-readiness.json)'
  echo 'if [[ "$READINESS_STATUS_AFTER" != "READY" || "$BLOCKING_CHECKS_AFTER" != "0" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Readiness is not READY after pre-gate refresh.'"
  echo '  echo "[ui-release-one-pass] status=$READINESS_STATUS_AFTER blockingChecks=$BLOCKING_CHECKS_AFTER"'
  echo "  echo '[ui-release-one-pass] Resolve blockers before running release:ui-gate.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Readiness confirmed READY (0 blockers) before release gate.'"
  echo 'for REQUIRED_PRE_GATE_ARTIFACT in work-logs/latest-ui-release-readiness.json work-logs/latest-ui-release-readiness-report.json work-logs/latest-ui-release-readiness-report.md work-logs/latest-ui-release-handoff-bundle-manifest.json work-logs/latest-ui-release-handoff.md work-logs/latest-ui-release-operator-brief.md work-logs/latest-ui-release-one-pass.sh; do'
  echo '  if [[ ! -f "$REQUIRED_PRE_GATE_ARTIFACT" ]]; then'
  echo '    echo "[ui-release-one-pass] ERROR: Missing required pre-gate artifact: $REQUIRED_PRE_GATE_ARTIFACT"'
  echo '    echo "[ui-release-one-pass] Re-run release:ui-ready-handoff to regenerate stable artifacts before gate execution."'
  echo '    exit 1'
  echo '  fi'
  echo 'done'
  echo "echo '[ui-release-one-pass] Verified required pre-gate artifacts exist before metadata capture.'"
  echo 'RELEASE_GATE_START_EPOCH=$(date +%s)'
  echo 'if [[ ! "$RELEASE_GATE_START_EPOCH" =~ ^[0-9]{10}$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid release gate start epoch format.'"
  echo '  echo "[ui-release-one-pass] releaseGateStartEpoch=$RELEASE_GATE_START_EPOCH"'
  echo "  echo '[ui-release-one-pass] Ensure date +%s resolves to a 10-digit unix epoch before run-token generation.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified release gate start epoch format for pre-gate evidence.'"
  echo 'RELEASE_GATE_RUN_TOKEN="one-pass-${RELEASE_GATE_START_EPOCH}-$RANDOM"'
  echo 'if [[ ! "$RELEASE_GATE_RUN_TOKEN" =~ ^one-pass-[0-9]{10}-[0-9]+$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid release gate run-token format.'"
  echo '  echo "[ui-release-one-pass] runToken=$RELEASE_GATE_RUN_TOKEN"'
  echo "  echo '[ui-release-one-pass] Ensure run token generation matches one-pass-<epoch>-<random> format and retry.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified release gate run-token format for pre-gate evidence.'"
  echo 'RELEASE_GATE_EXPECTED_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")'
  echo 'RELEASE_GATE_EXPECTED_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")'
  echo 'RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.timestamp||\"unknown\"));" work-logs/latest-ui-release-readiness.json 2>/dev/null || echo "unknown")'
  echo 'RELEASE_GATE_EXPECTED_READINESS_STATUS=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.status||\"unknown\"));" work-logs/latest-ui-release-readiness.json 2>/dev/null || echo "unknown")'
  echo 'RELEASE_GATE_EXPECTED_BLOCKING_CHECKS=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.blockingChecks ?? \"unknown\"));" work-logs/latest-ui-release-readiness.json 2>/dev/null || echo "unknown")'
  echo 'RELEASE_GATE_EXPECTED_READINESS_SHA256=$(sha256sum work-logs/latest-ui-release-readiness.json 2>/dev/null | awk "{print \$1}" || echo "unknown")'
  echo 'RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256=$(sha256sum work-logs/latest-ui-release-readiness-report.json 2>/dev/null | awk "{print \$1}" || echo "unknown")'
  echo 'RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256=$(sha256sum work-logs/latest-ui-release-readiness-report.md 2>/dev/null | awk "{print \$1}" || echo "unknown")'
  echo 'RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256=$(sha256sum work-logs/latest-ui-release-handoff-bundle-manifest.json 2>/dev/null | awk "{print \$1}" || echo "unknown")'
  echo 'RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_PATH=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.artifacts?.latestBundleManifest?.path||\"unknown\"));" work-logs/latest-ui-release-handoff-bundle-manifest.json 2>/dev/null || echo "unknown")'
  echo 'RELEASE_GATE_EXPECTED_HANDOFF_SHA256=$(sha256sum work-logs/latest-ui-release-handoff.md 2>/dev/null | awk "{print \$1}" || echo "unknown")'
  echo 'RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256=$(sha256sum work-logs/latest-ui-release-operator-brief.md 2>/dev/null | awk "{print \$1}" || echo "unknown")'
  echo 'RELEASE_GATE_EXPECTED_ONE_PASS_SHA256=$(sha256sum work-logs/latest-ui-release-one-pass.sh 2>/dev/null | awk "{print \$1}" || echo "unknown")'
  echo 'RELEASE_GATE_EXPECTED_WEB_DIR_PATH=$(pwd -P)'
  echo 'export RELEASE_GATE_RUN_TOKEN RELEASE_GATE_EXPECTED_COMMIT RELEASE_GATE_EXPECTED_BRANCH RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP RELEASE_GATE_EXPECTED_READINESS_STATUS RELEASE_GATE_EXPECTED_BLOCKING_CHECKS RELEASE_GATE_EXPECTED_READINESS_SHA256 RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256 RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256 RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256 RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_PATH RELEASE_GATE_EXPECTED_HANDOFF_SHA256 RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256 RELEASE_GATE_EXPECTED_ONE_PASS_SHA256 RELEASE_GATE_EXPECTED_WEB_DIR_PATH'
  echo 'for REQUIRED_GATE_METADATA_VAR in RELEASE_GATE_EXPECTED_COMMIT RELEASE_GATE_EXPECTED_BRANCH RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP RELEASE_GATE_EXPECTED_READINESS_STATUS RELEASE_GATE_EXPECTED_BLOCKING_CHECKS RELEASE_GATE_EXPECTED_READINESS_SHA256 RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256 RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256 RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256 RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_PATH RELEASE_GATE_EXPECTED_HANDOFF_SHA256 RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256 RELEASE_GATE_EXPECTED_ONE_PASS_SHA256 RELEASE_GATE_EXPECTED_WEB_DIR_PATH; do'
  echo '  REQUIRED_GATE_METADATA_VALUE="${!REQUIRED_GATE_METADATA_VAR:-}"'
  echo '  if [[ -z "$REQUIRED_GATE_METADATA_VALUE" || "$REQUIRED_GATE_METADATA_VALUE" == "unknown" ]]; then'
  echo '    echo "[ui-release-one-pass] ERROR: Missing deterministic pre-gate metadata for ${REQUIRED_GATE_METADATA_VAR}."'
  echo '    echo "[ui-release-one-pass] Ensure latest handoff/readiness artifacts exist and retry release:ui-ready-handoff before running gate."'
  echo '    exit 1'
  echo '  fi'
  echo 'done'
  echo "echo '[ui-release-one-pass] Verified deterministic pre-gate metadata capture before release gate.'"
  echo 'if [[ ! "$RELEASE_GATE_EXPECTED_COMMIT" =~ ^[a-f0-9]{7,40}$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid commit hash format for pre-gate metadata.'"
  echo '  echo "[ui-release-one-pass] commit=$RELEASE_GATE_EXPECTED_COMMIT"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff and ensure commit metadata is a valid git hash.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified commit hash metadata format for pre-gate evidence.'"
  echo 'if [[ ! "$RELEASE_GATE_EXPECTED_BRANCH" =~ ^[A-Za-z0-9._/-]+$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid branch format for pre-gate metadata.'"
  echo '  echo "[ui-release-one-pass] branch=$RELEASE_GATE_EXPECTED_BRANCH"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff and ensure branch metadata matches git branch naming rules (A-Z, a-z, 0-9, ., _, /, -).'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified branch metadata format for pre-gate evidence.'"
  echo 'if [[ "$RELEASE_GATE_EXPECTED_BRANCH" == "HEAD" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Detached HEAD detected for pre-gate metadata.'"
  echo '  echo "[ui-release-one-pass] branch=$RELEASE_GATE_EXPECTED_BRANCH"'
  echo "  echo '[ui-release-one-pass] Check out a named branch before running release gate assertions.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified branch is attached (not detached HEAD) for pre-gate evidence.'"
  echo 'CURRENT_PRE_GATE_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")'
  echo 'CURRENT_PRE_GATE_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")'
  echo 'CURRENT_RESOLVED_GIT_COMMON_DIR=$(cd "$GIT_COMMON_DIR" && pwd -P 2>/dev/null || echo "unknown")'
  echo 'CURRENT_RESOLVED_GIT_DIR=$(cd "$GIT_DIR" && pwd -P 2>/dev/null || echo "unknown")'
  echo 'if [[ "$CURRENT_PRE_GATE_COMMIT" != "$RELEASE_GATE_EXPECTED_COMMIT" || "$CURRENT_PRE_GATE_BRANCH" != "$RELEASE_GATE_EXPECTED_BRANCH" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Pre-gate git HEAD metadata drift detected before release gate execution.'"
  echo '  echo "[ui-release-one-pass] capturedCommit=$RELEASE_GATE_EXPECTED_COMMIT currentCommit=$CURRENT_PRE_GATE_COMMIT capturedBranch=$RELEASE_GATE_EXPECTED_BRANCH currentBranch=$CURRENT_PRE_GATE_BRANCH"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff to recapture stable git metadata before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified pre-gate git HEAD metadata remains stable before gate execution.'"
  echo 'if [[ "$CURRENT_RESOLVED_GIT_COMMON_DIR" != "$RESOLVED_GIT_COMMON_DIR" || "$CURRENT_RESOLVED_GIT_DIR" != "$RESOLVED_GIT_DIR" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Pre-gate resolved git metadata path drift detected before release gate execution.'"
  echo '  echo "[ui-release-one-pass] capturedGitCommonDir=$RESOLVED_GIT_COMMON_DIR currentGitCommonDir=$CURRENT_RESOLVED_GIT_COMMON_DIR capturedGitDir=$RESOLVED_GIT_DIR currentGitDir=$CURRENT_RESOLVED_GIT_DIR"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff to recapture stable git metadata paths before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified resolved git metadata paths remain stable before gate execution.'"
  echo 'if [[ ! "$RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([+-][0-9]{4}|Z)$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid readiness timestamp format for pre-gate metadata.'"
  echo '  echo "[ui-release-one-pass] readinessTimestamp=$RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff and ensure readiness timestamp uses ISO-8601 format (YYYY-MM-DDTHH:MM:SS±HHMM or Z).'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified readiness timestamp metadata format for pre-gate evidence.'"
  echo 'if [[ "$RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP" != "$READINESS_TIMESTAMP_AFTER" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Pre-gate readiness timestamp metadata drift detected before release gate execution.'"
  echo '  echo "[ui-release-one-pass] expectedTimestamp=$READINESS_TIMESTAMP_AFTER capturedTimestamp=$RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-readiness and release:ui-ready-handoff, then retry once readiness timestamp metadata is stable.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified pre-gate readiness timestamp metadata remains stable before gate execution.'"
  echo 'if [[ ! "$RELEASE_GATE_EXPECTED_READINESS_STATUS" =~ ^(READY|NOT_READY)$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid readiness status format for pre-gate metadata.'"
  echo '  echo "[ui-release-one-pass] readinessStatus=$RELEASE_GATE_EXPECTED_READINESS_STATUS"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff and ensure readiness status metadata is READY or NOT_READY.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified readiness status metadata format for pre-gate evidence.'"
  echo 'if [[ "$RELEASE_GATE_EXPECTED_READINESS_STATUS" != "$READINESS_STATUS_AFTER" || "$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS" != "$BLOCKING_CHECKS_AFTER" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Pre-gate readiness status/blocking metadata drift detected before release gate execution.'"
  echo '  echo "[ui-release-one-pass] expectedStatus=$READINESS_STATUS_AFTER capturedStatus=$RELEASE_GATE_EXPECTED_READINESS_STATUS expectedBlockingChecks=$BLOCKING_CHECKS_AFTER capturedBlockingChecks=$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-readiness and release:ui-ready-handoff, then retry once status/blocking metadata is stable.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified pre-gate readiness status/blocking metadata remains stable before gate execution.'"
  echo 'if [[ "$RELEASE_GATE_EXPECTED_READINESS_STATUS" != "READY" || "$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS" != "0" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Pre-gate readiness metadata drift detected before release gate execution.'"
  echo '  echo "[ui-release-one-pass] readinessStatus=$RELEASE_GATE_EXPECTED_READINESS_STATUS readinessBlockingChecks=$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-readiness and release:ui-ready-handoff, then retry once metadata is READY with zero blockers.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified pre-gate readiness metadata remains READY with zero blockers.'"
  echo 'if [[ ! "$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS" =~ ^[0-9]+$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid readiness blocking-check count format for pre-gate metadata.'"
  echo '  echo "[ui-release-one-pass] readinessBlockingChecks=$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff and ensure blocking-check metadata is numeric.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified readiness blocking-check metadata format for pre-gate evidence.'"
  echo 'for REQUIRED_SHA256_VAR in RELEASE_GATE_EXPECTED_READINESS_SHA256 RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256 RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256 RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256 RELEASE_GATE_EXPECTED_HANDOFF_SHA256 RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256 RELEASE_GATE_EXPECTED_ONE_PASS_SHA256; do'
  echo '  REQUIRED_SHA256_VALUE="${!REQUIRED_SHA256_VAR:-}"'
  echo '  if [[ ! "$REQUIRED_SHA256_VALUE" =~ ^[a-f0-9]{64}$ ]]; then'
  echo '    echo "[ui-release-one-pass] ERROR: Invalid SHA-256 format for ${REQUIRED_SHA256_VAR}."'
  echo '    echo "[ui-release-one-pass] value=$REQUIRED_SHA256_VALUE"'
  echo '    echo "[ui-release-one-pass] Re-run release:ui-ready-handoff and ensure stable artifacts hash correctly before gate execution."'
  echo '    exit 1'
  echo '  fi'
  echo 'done'
  echo "echo '[ui-release-one-pass] Verified SHA-256 metadata format for pre-gate evidence.'"
  echo 'CURRENT_BUNDLE_MANIFEST_SHA256=$(sha256sum work-logs/latest-ui-release-handoff-bundle-manifest.json 2>/dev/null | awk "{print \$1}" || echo "unknown")'
  echo 'if [[ ! "$CURRENT_BUNDLE_MANIFEST_SHA256" =~ ^[a-f0-9]{64}$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid current handoff bundle manifest SHA-256 format for pre-gate drift assertion.'"
  echo '  echo "[ui-release-one-pass] currentManifestSha256=$CURRENT_BUNDLE_MANIFEST_SHA256"'
  echo "  echo '[ui-release-one-pass] Ensure latest-ui-release-handoff-bundle-manifest.json remains present and hashable before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if [[ "$CURRENT_BUNDLE_MANIFEST_SHA256" != "$RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Pre-gate handoff bundle manifest SHA-256 drift detected before release gate execution.'"
  echo '  echo "[ui-release-one-pass] capturedManifestSha256=$RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256 currentManifestSha256=$CURRENT_BUNDLE_MANIFEST_SHA256"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff to recapture stable handoff bundle manifest before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified pre-gate handoff bundle manifest SHA-256 remains stable before gate execution.'"
  echo 'CURRENT_BUNDLE_MANIFEST_PATH=$(node -e "const fs=require(\"fs\");const d=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"));process.stdout.write(String(d.artifacts?.latestBundleManifest?.path||\"unknown\"));" work-logs/latest-ui-release-handoff-bundle-manifest.json 2>/dev/null || echo "unknown")'
  echo 'if [[ "$CURRENT_BUNDLE_MANIFEST_PATH" != "work-logs/latest-ui-release-handoff-bundle-manifest.json" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Stable bundle manifest self-path is invalid before release gate execution.'"
  echo '  echo "[ui-release-one-pass] currentManifestSelfPath=$CURRENT_BUNDLE_MANIFEST_PATH expected=work-logs/latest-ui-release-handoff-bundle-manifest.json"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff to regenerate a stable bundle manifest self-entry before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if [[ "$CURRENT_BUNDLE_MANIFEST_PATH" != "$RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_PATH" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Pre-gate handoff bundle manifest self-path drift detected before release gate execution.'"
  echo '  echo "[ui-release-one-pass] capturedManifestSelfPath=$RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_PATH currentManifestSelfPath=$CURRENT_BUNDLE_MANIFEST_PATH"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff to recapture stable bundle manifest self-entry before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified stable handoff bundle manifest self-path before release gate execution.'"
  echo 'CURRENT_HANDOFF_SHA256=$(sha256sum work-logs/latest-ui-release-handoff.md 2>/dev/null | awk "{print \$1}" || echo "unknown")'
  echo 'if [[ ! "$CURRENT_HANDOFF_SHA256" =~ ^[a-f0-9]{64}$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid current handoff markdown SHA-256 format for pre-gate drift assertion.'"
  echo '  echo "[ui-release-one-pass] currentHandoffSha256=$CURRENT_HANDOFF_SHA256"'
  echo "  echo '[ui-release-one-pass] Ensure latest-ui-release-handoff.md remains present and hashable before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if [[ "$CURRENT_HANDOFF_SHA256" != "$RELEASE_GATE_EXPECTED_HANDOFF_SHA256" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Pre-gate handoff markdown SHA-256 drift detected before release gate execution.'"
  echo '  echo "[ui-release-one-pass] capturedHandoffSha256=$RELEASE_GATE_EXPECTED_HANDOFF_SHA256 currentHandoffSha256=$CURRENT_HANDOFF_SHA256"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff to recapture stable handoff markdown before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified pre-gate handoff markdown SHA-256 remains stable before gate execution.'"
  echo 'CURRENT_OPERATOR_BRIEF_SHA256=$(sha256sum work-logs/latest-ui-release-operator-brief.md 2>/dev/null | awk "{print \$1}" || echo "unknown")'
  echo 'if [[ ! "$CURRENT_OPERATOR_BRIEF_SHA256" =~ ^[a-f0-9]{64}$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid current operator brief SHA-256 format for pre-gate drift assertion.'"
  echo '  echo "[ui-release-one-pass] currentOperatorBriefSha256=$CURRENT_OPERATOR_BRIEF_SHA256"'
  echo "  echo '[ui-release-one-pass] Ensure latest-ui-release-operator-brief.md remains present and hashable before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if [[ "$CURRENT_OPERATOR_BRIEF_SHA256" != "$RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Pre-gate operator brief SHA-256 drift detected before release gate execution.'"
  echo '  echo "[ui-release-one-pass] capturedOperatorBriefSha256=$RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256 currentOperatorBriefSha256=$CURRENT_OPERATOR_BRIEF_SHA256"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff to recapture stable operator brief before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified pre-gate operator brief SHA-256 remains stable before gate execution.'"
  echo 'CURRENT_ONE_PASS_SHA256=$(sha256sum work-logs/latest-ui-release-one-pass.sh 2>/dev/null | awk "{print \$1}" || echo "unknown")'
  echo 'if [[ ! "$CURRENT_ONE_PASS_SHA256" =~ ^[a-f0-9]{64}$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid current one-pass script SHA-256 format for pre-gate drift assertion.'"
  echo '  echo "[ui-release-one-pass] currentOnePassSha256=$CURRENT_ONE_PASS_SHA256"'
  echo "  echo '[ui-release-one-pass] Ensure latest-ui-release-one-pass.sh remains present and hashable before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if [[ "$CURRENT_ONE_PASS_SHA256" != "$RELEASE_GATE_EXPECTED_ONE_PASS_SHA256" ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Pre-gate one-pass script SHA-256 drift detected before release gate execution.'"
  echo '  echo "[ui-release-one-pass] capturedOnePassSha256=$RELEASE_GATE_EXPECTED_ONE_PASS_SHA256 currentOnePassSha256=$CURRENT_ONE_PASS_SHA256"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-ready-handoff to recapture stable one-pass script before gate execution.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified pre-gate one-pass script SHA-256 remains stable before gate execution.'"
  echo 'echo "[ui-release-one-pass] Release gate run token: $RELEASE_GATE_RUN_TOKEN"'
  echo 'echo "[ui-release-one-pass] Expected commit for gate evidence: $RELEASE_GATE_EXPECTED_COMMIT"'
  echo 'echo "[ui-release-one-pass] Expected branch for gate evidence: $RELEASE_GATE_EXPECTED_BRANCH"'
  echo 'echo "[ui-release-one-pass] Expected readiness timestamp for gate evidence: $RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP"'
  echo 'echo "[ui-release-one-pass] Expected readiness status for gate evidence: $RELEASE_GATE_EXPECTED_READINESS_STATUS"'
  echo 'echo "[ui-release-one-pass] Expected readiness blocking checks for gate evidence: $RELEASE_GATE_EXPECTED_BLOCKING_CHECKS"'
  echo 'echo "[ui-release-one-pass] Expected readiness snapshot SHA-256 for gate evidence: $RELEASE_GATE_EXPECTED_READINESS_SHA256"'
  echo 'echo "[ui-release-one-pass] Expected readiness report JSON SHA-256 for gate evidence: $RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256"'
  echo 'echo "[ui-release-one-pass] Expected readiness report markdown SHA-256 for gate evidence: $RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256"'
  echo 'echo "[ui-release-one-pass] Expected handoff bundle manifest SHA-256 for gate evidence: $RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256"'
  echo 'echo "[ui-release-one-pass] Expected handoff markdown SHA-256 for gate evidence: $RELEASE_GATE_EXPECTED_HANDOFF_SHA256"'
  echo 'echo "[ui-release-one-pass] Expected operator brief SHA-256 for gate evidence: $RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256"'
  echo 'echo "[ui-release-one-pass] Expected one-pass script SHA-256 for gate evidence: $RELEASE_GATE_EXPECTED_ONE_PASS_SHA256"'
  echo 'echo "[ui-release-one-pass] Expected web directory path for gate evidence: $RELEASE_GATE_EXPECTED_WEB_DIR_PATH"'
  echo 'npm run release:ui-gate'
  printf 'if [[ ! -f %q ]]; then\n' "$WORK_LOG_DIR/latest-ui-smoke-release-gate.md"
  echo "  echo '[ui-release-one-pass] ERROR: Missing smoke evidence file: work-logs/latest-ui-smoke-release-gate.md'"
  echo "  echo '[ui-release-one-pass] release:ui-gate may have failed before writing stable evidence.'"
  echo '  exit 1'
  echo 'fi'
  echo 'SMOKE_EVIDENCE_MTIME_EPOCH=$(stat -c %Y work-logs/latest-ui-smoke-release-gate.md 2>/dev/null || echo 0)'
  echo 'if [[ ! "$SMOKE_EVIDENCE_MTIME_EPOCH" =~ ^[0-9]{10}$ ]]; then'
  echo "  echo '[ui-release-one-pass] ERROR: Invalid smoke evidence mtime epoch format after release:ui-gate.'"
  echo '  echo "[ui-release-one-pass] smokeEvidenceMtime=$SMOKE_EVIDENCE_MTIME_EPOCH"'
  echo "  echo '[ui-release-one-pass] Ensure stat returns 10-digit unix epoch seconds before freshness verification.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified smoke evidence mtime epoch format for gate freshness check.'"
  echo 'if (( SMOKE_EVIDENCE_MTIME_EPOCH < RELEASE_GATE_START_EPOCH )); then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence file was not refreshed by this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] evidenceMtime=$SMOKE_EVIDENCE_MTIME_EPOCH gateStart=$RELEASE_GATE_START_EPOCH"'
  echo "  echo '[ui-release-one-pass] Re-run release:ui-gate and ensure latest-ui-smoke-release-gate.md updates.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if ! grep -Fq "Gate run token: \\`$RELEASE_GATE_RUN_TOKEN\\`" work-logs/latest-ui-smoke-release-gate.md; then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence token mismatch for this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] expectedToken=$RELEASE_GATE_RUN_TOKEN"'
  echo "  echo '[ui-release-one-pass] Ensure run-ui-smoke-release.sh records Gate run token and retry.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if ! grep -Fq "Commit: \\`$RELEASE_GATE_EXPECTED_COMMIT\\`" work-logs/latest-ui-smoke-release-gate.md; then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence commit hash mismatch for this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] expectedCommit=$RELEASE_GATE_EXPECTED_COMMIT"'
  echo "  echo '[ui-release-one-pass] Ensure release gate runs on the intended commit and retry.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if ! grep -Fq "Branch: \\`$RELEASE_GATE_EXPECTED_BRANCH\\`" work-logs/latest-ui-smoke-release-gate.md; then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence branch mismatch for this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] expectedBranch=$RELEASE_GATE_EXPECTED_BRANCH"'
  echo "  echo '[ui-release-one-pass] Ensure release gate runs on the intended branch and retry.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if ! grep -Fq "Expected readiness snapshot timestamp from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP\\`" work-logs/latest-ui-smoke-release-gate.md; then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence readiness timestamp mismatch for this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] expectedReadinessTimestamp=$RELEASE_GATE_EXPECTED_READINESS_TIMESTAMP"'
  echo "  echo '[ui-release-one-pass] Ensure release gate records expected readiness timestamp metadata and retry.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if ! grep -Fq "Expected readiness status from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_READINESS_STATUS\\`" work-logs/latest-ui-smoke-release-gate.md; then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence readiness status mismatch for this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] expectedReadinessStatus=$RELEASE_GATE_EXPECTED_READINESS_STATUS"'
  echo "  echo '[ui-release-one-pass] Ensure release gate records expected readiness status metadata and retry.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if ! grep -Fq "Expected readiness blocking checks from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS\\`" work-logs/latest-ui-smoke-release-gate.md; then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence readiness blocking-check count mismatch for this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] expectedReadinessBlockingChecks=$RELEASE_GATE_EXPECTED_BLOCKING_CHECKS"'
  echo "  echo '[ui-release-one-pass] Ensure release gate records expected readiness blocking-check metadata and retry.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if ! grep -Fq "Expected readiness snapshot SHA-256 from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_READINESS_SHA256\\`" work-logs/latest-ui-smoke-release-gate.md; then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence readiness snapshot SHA-256 mismatch for this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] expectedReadinessSha256=$RELEASE_GATE_EXPECTED_READINESS_SHA256"'
  echo "  echo '[ui-release-one-pass] Ensure release gate records expected readiness snapshot SHA-256 metadata and retry.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if ! grep -Fq "Expected readiness report JSON SHA-256 from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256\\`" work-logs/latest-ui-smoke-release-gate.md; then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence readiness report JSON SHA-256 mismatch for this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] expectedReadinessReportJsonSha256=$RELEASE_GATE_EXPECTED_READINESS_REPORT_JSON_SHA256"'
  echo "  echo '[ui-release-one-pass] Ensure release gate records expected readiness report JSON SHA-256 metadata and retry.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if ! grep -Fq "Expected readiness report markdown SHA-256 from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256\\`" work-logs/latest-ui-smoke-release-gate.md; then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence readiness report markdown SHA-256 mismatch for this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] expectedReadinessReportMarkdownSha256=$RELEASE_GATE_EXPECTED_READINESS_REPORT_MD_SHA256"'
  echo "  echo '[ui-release-one-pass] Ensure release gate records expected readiness report markdown SHA-256 metadata and retry.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if ! grep -Fq "Expected handoff bundle manifest SHA-256 from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256\\`" work-logs/latest-ui-smoke-release-gate.md; then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence handoff bundle manifest SHA-256 mismatch for this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] expectedManifestSha256=$RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_SHA256"'
  echo "  echo '[ui-release-one-pass] Ensure release gate records expected handoff bundle manifest SHA-256 metadata and retry.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if ! grep -Fq "Expected handoff bundle manifest path from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_PATH\\`" work-logs/latest-ui-smoke-release-gate.md; then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence handoff bundle manifest path mismatch for this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] expectedManifestPath=$RELEASE_GATE_EXPECTED_BUNDLE_MANIFEST_PATH"'
  echo "  echo '[ui-release-one-pass] Ensure release gate records expected handoff bundle manifest path metadata and retry.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if ! grep -Fq "Expected handoff markdown SHA-256 from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_HANDOFF_SHA256\\`" work-logs/latest-ui-smoke-release-gate.md; then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence handoff markdown SHA-256 mismatch for this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] expectedHandoffSha256=$RELEASE_GATE_EXPECTED_HANDOFF_SHA256"'
  echo "  echo '[ui-release-one-pass] Ensure release gate records expected handoff markdown SHA-256 metadata and retry.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if ! grep -Fq "Expected operator brief SHA-256 from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256\\`" work-logs/latest-ui-smoke-release-gate.md; then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence operator brief SHA-256 mismatch for this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] expectedOperatorBriefSha256=$RELEASE_GATE_EXPECTED_OPERATOR_BRIEF_SHA256"'
  echo "  echo '[ui-release-one-pass] Ensure release gate records expected operator brief SHA-256 metadata and retry.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if ! grep -Fq "Expected one-pass script SHA-256 from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_ONE_PASS_SHA256\\`" work-logs/latest-ui-smoke-release-gate.md; then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence one-pass script SHA-256 mismatch for this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] expectedOnePassSha256=$RELEASE_GATE_EXPECTED_ONE_PASS_SHA256"'
  echo "  echo '[ui-release-one-pass] Ensure release gate records expected one-pass script SHA-256 metadata and retry.'"
  echo '  exit 1'
  echo 'fi'
  echo 'if ! grep -Fq "Expected web directory path from one-pass pre-gate check: \\`$RELEASE_GATE_EXPECTED_WEB_DIR_PATH\\`" work-logs/latest-ui-smoke-release-gate.md; then'
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence web directory path mismatch for this release:ui-gate run.'"
  echo '  echo "[ui-release-one-pass] expectedWebDir=$RELEASE_GATE_EXPECTED_WEB_DIR_PATH"'
  echo "  echo '[ui-release-one-pass] Ensure release gate records expected web directory path metadata and retry.'"
  echo '  exit 1'
  echo 'fi'
  printf 'if ! grep -q %q %q; then\n' 'UI release gate: ✅ PASS' "$WORK_LOG_DIR/latest-ui-smoke-release-gate.md"
  echo "  echo '[ui-release-one-pass] ERROR: Smoke evidence does not contain PASS marker.'"
  echo "  echo '[ui-release-one-pass] Inspect work-logs/latest-ui-smoke-release-gate.md before closing release gate.'"
  echo '  exit 1'
  echo 'fi'
  echo "echo '[ui-release-one-pass] Verified smoke evidence freshness for current gate run.'"
  echo "echo '[ui-release-one-pass] Verified gate run token match in smoke evidence.'"
  echo "echo '[ui-release-one-pass] Verified commit hash match in smoke evidence.'"
  echo "echo '[ui-release-one-pass] Verified branch match in smoke evidence.'"
  echo "echo '[ui-release-one-pass] Verified readiness timestamp match in smoke evidence.'"
  echo "echo '[ui-release-one-pass] Verified readiness status match in smoke evidence.'"
  echo "echo '[ui-release-one-pass] Verified readiness blocking-check count match in smoke evidence.'"
  echo "echo '[ui-release-one-pass] Verified readiness snapshot SHA-256 match in smoke evidence.'"
  echo "echo '[ui-release-one-pass] Verified readiness report JSON SHA-256 match in smoke evidence.'"
  echo "echo '[ui-release-one-pass] Verified readiness report markdown SHA-256 match in smoke evidence.'"
  echo "echo '[ui-release-one-pass] Verified handoff bundle manifest SHA-256 match in smoke evidence.'"
  echo "echo '[ui-release-one-pass] Verified handoff bundle manifest path match in smoke evidence.'"
  echo "echo '[ui-release-one-pass] Verified handoff markdown SHA-256 match in smoke evidence.'"
  echo "echo '[ui-release-one-pass] Verified operator brief SHA-256 match in smoke evidence.'"
  echo "echo '[ui-release-one-pass] Verified one-pass script SHA-256 match in smoke evidence.'"
  echo "echo '[ui-release-one-pass] Verified web directory path match in smoke evidence.'"
  echo "echo '[ui-release-one-pass] Verified PASS evidence: work-logs/latest-ui-smoke-release-gate.md'"
} > "$ONE_PASS_SCRIPT_FILE"
chmod +x "$ONE_PASS_SCRIPT_FILE"
cp "$ONE_PASS_SCRIPT_FILE" "$LATEST_ONE_PASS_SCRIPT_FILE"
chmod +x "$LATEST_ONE_PASS_SCRIPT_FILE"

{
  echo "# UI Release Gate — Operator Handoff"
  echo
  echo "- Generated: $TIMESTAMP_LOCAL"
  echo "- Readiness snapshot: \`work-logs/latest-ui-release-readiness.json\`"
  echo "- Latest readiness markdown report: \`work-logs/latest-ui-release-readiness-report.md\`"
  echo "- Latest readiness JSON report: \`work-logs/latest-ui-release-readiness-report.json\`"
  echo "- Current status: **$READINESS_STATUS**"
  echo "- Blocking checks: **$BLOCKING_CHECKS**"
  echo "- Snapshot timestamp: **$SNAPSHOT_TIMESTAMP**"
  echo "- Snapshot age: **${SNAPSHOT_AGE_MINUTES} min** (${FRESHNESS_NOTE})"
  echo "- Previous blocking checks: **$PREV_BLOCKING_CHECKS**"
  echo "- Blocking trend: **$BLOCKING_DELTA**"
  echo
  if [[ "$FRESHNESS_NOTE" == "stale" ]]; then
    echo "> ⚠️ Snapshot is older than 120 minutes. Re-run \`npm run release:ui-readiness\` before executing the gate."
    echo
  fi
  echo "## Readiness Snapshot"
  echo
  echo "- Interactive terminal available: $INTERACTIVE_OK"
  echo "- libnspr4 installed: $LIBNSPR4_OK"
  echo "- @playwright/test installed: $PLAYWRIGHT_OK"
  echo "- Playwright runtime launch: $RUNTIME_OK"
  echo
  if [[ "$HAS_BLOCKERS" == "true" ]]; then
    echo "## Targeted Remediation Checklist"
    echo
    if [[ "$INTERACTIVE_OK" != "true" ]]; then
      echo "1. Re-run in an **interactive host terminal** (TTY required)."
    fi
    if [[ "$LIBNSPR4_OK" != "true" ]]; then
      echo "2. Pre-authenticate sudo and install Playwright host dependencies:"
      echo '   ```bash'
      printf '   cd %q\n' "$WEB_DIR"
      echo '   sudo -v'
      echo '   npm run deps:playwright-host'
      echo '   ```'
    fi
    if [[ "$PLAYWRIGHT_OK" != "true" ]]; then
      echo "3. Install web dependencies:"
      echo '   ```bash'
      printf '   cd %q\n' "$WEB_DIR"
      echo '   npm install'
      echo '   ```'
    fi
    if [[ "$RUNTIME_OK" != "true" ]]; then
      echo "4. Recheck runtime after remediation:"
      echo '   ```bash'
      printf '   cd %q\n' "$WEB_DIR"
      echo '   npm run release:ui-readiness'
      echo '   ```'
    fi
    echo
  fi
  echo "## One-Pass Command Sequence (Copy/Paste)"
  echo
  echo '```bash'
  printf 'cd %q\n' "$WEB_DIR"
  if [[ "$SHOULD_REFRESH_READINESS" == "true" ]]; then
    echo 'npm run release:ui-readiness'
  fi
  if [[ "$PLAYWRIGHT_OK" != "true" ]]; then
    echo 'npm install'
  fi
  if [[ "$LIBNSPR4_OK" != "true" || "$RUNTIME_OK" != "true" ]]; then
    echo 'sudo -v'
    echo 'npm run deps:playwright-host'
    echo 'npm run release:ui-readiness'
  fi
  echo 'npm run release:ui-handoff-verify'
  echo 'npm run release:ui-readiness'
  echo '# Assert latest-ui-release-readiness.json file mtime refreshes after pre-gate release:ui-readiness'
  echo '# Assert latest readiness report JSON + markdown files refresh after pre-gate release:ui-readiness'
  echo '# Assert readiness report mtimes remain stable before release gate execution'
  echo '# Assert readiness report SHA-256 values remain stable before release gate execution'
  echo '# Assert git repository top-level context matches the expected web directory before gate'
  echo '# Assert current directory is an active git work tree before gate execution'
  echo '# Assert git common-dir resolves to an existing directory before gate execution'
  echo '# Assert git dir resolves to an existing directory before gate execution'
  echo '# Assert resolved git common-dir and git-dir paths remain stable before gate execution'
  echo '# Assert tracked git changes are clean (git diff + git diff --cached) before gate'
  echo '# Assert no git operations are in progress (.git/MERGE_HEAD, rebase, cherry-pick, revert, bisect) before gate'
  echo '# Assert no git index lock file (.git/index.lock) is present before gate execution'
  echo '# Assert latest-ui-release-readiness.json => status READY and blockingChecks 0 before gate'
  echo '# Assert required stable pre-gate artifacts exist before metadata/hash capture'
  echo '# Assert release-gate start epoch metadata uses 10-digit unix epoch format before run-token generation'
  echo '# Assert all pre-gate evidence metadata values are deterministic (no unknown placeholders)'
  echo '# Assert pre-gate commit hash metadata uses valid git hash format (7-40 lowercase hex)'
  echo '# Assert pre-gate branch metadata uses allowed branch-name characters (A-Z, a-z, 0-9, ., _, /, -)'
  echo '# Assert pre-gate branch is attached (not detached HEAD) before final gate execution'
  echo '# Assert pre-gate readiness timestamp metadata uses ISO-8601 format (YYYY-MM-DDTHH:MM:SS±HHMM or Z)'
  echo '# Assert pre-gate readiness timestamp metadata remains stable after pre-gate readiness refresh'
  echo '# Assert pre-gate readiness status metadata is READY or NOT_READY'
  echo '# Assert pre-gate readiness status/blocking metadata remains stable after pre-gate readiness refresh'
  echo '# Assert pre-gate captured readiness metadata remains READY with blockingChecks=0 before gate execution'
  echo '# Assert pre-gate readiness blocking-check metadata is numeric'
  echo '# Assert all pre-gate SHA-256 metadata values are valid lowercase 64-char hex strings'
  echo '# Assert pre-gate handoff bundle manifest SHA-256 remains stable before release gate execution'
  echo '# Assert stable handoff bundle manifest self-path remains work-logs/latest-ui-release-handoff-bundle-manifest.json before gate execution'
  echo '# Assert pre-gate operator brief SHA-256 remains stable before release gate execution'
  echo '# Assert pre-gate one-pass script SHA-256 remains stable before release gate execution'
  echo '# Assert smoke evidence contains expected readiness snapshot timestamp metadata'
  echo '# Assert smoke evidence contains expected readiness status metadata'
  echo '# Assert smoke evidence contains expected readiness blocking-check count metadata'
  echo '# Assert smoke evidence contains expected readiness snapshot SHA-256 metadata'
  echo '# Assert smoke evidence contains expected readiness report JSON SHA-256 metadata'
  echo '# Assert smoke evidence contains expected readiness report markdown SHA-256 metadata'
  echo '# Assert smoke evidence contains expected handoff bundle manifest SHA-256 metadata'
  echo '# Assert smoke evidence contains expected handoff markdown SHA-256 metadata'
  echo '# Assert smoke evidence contains expected operator brief SHA-256 metadata'
  echo '# Assert smoke evidence contains expected one-pass script SHA-256 metadata'
  echo '# Assert smoke evidence contains expected web directory path from one-pass pre-gate check'
  echo 'npm run release:ui-gate'
  echo '```'
  echo
  echo "## Handoff Artifacts"
  echo
  echo "- Timestamped handoff path: \`$HANDOFF_FILE\`"
  echo "- Stable latest handoff path: \`$LATEST_HANDOFF_FILE\`"
  echo "- Timestamped script path: \`$ONE_PASS_SCRIPT_FILE\`"
  echo "- Stable latest script path: \`$LATEST_ONE_PASS_SCRIPT_FILE\`"
  echo "- Stable latest bundle manifest: \`$LATEST_BUNDLE_MANIFEST_FILE\`"
  echo '- Run from an interactive elevated host terminal:'
  echo '  ```bash'
  echo "  bash $LATEST_ONE_PASS_SCRIPT_FILE"
  echo '  ```'
  echo
  echo "## Run This In Interactive Elevated Host Terminal"
  echo
  echo '```bash'
  printf 'cd %q\n' "$WEB_DIR"
  echo 'bash ../work-logs/latest-ui-release-one-pass.sh'
  echo '```'
  echo
  echo "## Expected Success Artifact"
  echo
  echo "- Timestamped file: \`work-logs/*-ui-smoke-release-gate.md\`"
  echo "- Stable latest file: \`work-logs/latest-ui-smoke-release-gate.md\`"
  echo "- Gate result inside artifact: \`UI release gate: ✅ PASS\`"
  echo
  echo "## If It Fails"
  echo
  echo "1. Resolve reported blocker in the same terminal"
  echo "2. Re-run \`bash ../work-logs/latest-ui-release-one-pass.sh\`"
  echo "3. Keep the latest artifact for release evidence"
} > "$HANDOFF_FILE"
cp "$HANDOFF_FILE" "$LATEST_HANDOFF_FILE"

{
  echo "# UI Release Operator Brief"
  echo
  echo "- Generated: $TIMESTAMP_LOCAL"
  echo "- Status: **$READINESS_STATUS**"
  echo "- Blocking checks: **$BLOCKING_CHECKS**"
  echo "- Snapshot age: **${SNAPSHOT_AGE_MINUTES} min** (${FRESHNESS_NOTE})"
  echo
  if [[ "$HAS_BLOCKERS" == "true" ]]; then
    echo "## Action Now"
    echo
    echo "Run this in an interactive elevated host terminal:"
    echo
    echo '```bash'
    echo "bash $LATEST_ONE_PASS_SCRIPT_FILE"
    echo '```'
    echo
    echo "Then confirm success in: \`work-logs/latest-ui-smoke-release-gate.md\`"
  else
    echo "## Ready"
    echo
    echo "Run the prepared one-pass handoff script in an interactive elevated host terminal:"
    echo
    echo '```bash'
    printf 'cd %q\n' "$WEB_DIR"
    echo 'bash ../work-logs/latest-ui-release-one-pass.sh'
    echo '```'
  fi
  echo
  echo "## Reference Artifacts"
  echo
  echo "- Full handoff: \`$LATEST_HANDOFF_FILE\`"
  echo "- One-pass script: \`$LATEST_ONE_PASS_SCRIPT_FILE\`"
  echo "- Latest readiness JSON: \`work-logs/latest-ui-release-readiness.json\`"
  echo "- Bundle manifest: \`$LATEST_BUNDLE_MANIFEST_FILE\`"
} > "$OPERATOR_BRIEF_FILE"
cp "$OPERATOR_BRIEF_FILE" "$LATEST_OPERATOR_BRIEF_FILE"

ONE_PASS_SHA256="$(sha256sum "$LATEST_ONE_PASS_SCRIPT_FILE" | awk '{print $1}')"
HANDOFF_SHA256="$(sha256sum "$LATEST_HANDOFF_FILE" | awk '{print $1}')"
OPERATOR_BRIEF_SHA256="$(sha256sum "$LATEST_OPERATOR_BRIEF_FILE" | awk '{print $1}')"
READINESS_SHA256="$(sha256sum "$READINESS_FILE" | awk '{print $1}')"
READINESS_REPORT_JSON_SHA256="$(sha256sum "$READINESS_REPORT_JSON_FILE" | awk '{print $1}')"
READINESS_REPORT_MD_SHA256="$(sha256sum "$READINESS_REPORT_MD_FILE" | awk '{print $1}')"

cat > "$BUNDLE_MANIFEST_FILE" <<EOF
{
  "generatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "readinessStatus": "$READINESS_STATUS",
  "blockingChecks": $BLOCKING_CHECKS,
  "artifacts": {
    "latestReadinessJson": {
      "path": "$READINESS_FILE",
      "sha256": "$READINESS_SHA256"
    },
    "latestReadinessReportJson": {
      "path": "$READINESS_REPORT_JSON_FILE",
      "sha256": "$READINESS_REPORT_JSON_SHA256"
    },
    "latestReadinessReportMarkdown": {
      "path": "$READINESS_REPORT_MD_FILE",
      "sha256": "$READINESS_REPORT_MD_SHA256"
    },
    "latestHandoffMarkdown": {
      "path": "$LATEST_HANDOFF_FILE",
      "sha256": "$HANDOFF_SHA256"
    },
    "latestOnePassScript": {
      "path": "$LATEST_ONE_PASS_SCRIPT_FILE",
      "sha256": "$ONE_PASS_SHA256"
    },
    "latestOperatorBrief": {
      "path": "$LATEST_OPERATOR_BRIEF_FILE",
      "sha256": "$OPERATOR_BRIEF_SHA256"
    }
  }
}
EOF
cp "$BUNDLE_MANIFEST_FILE" "$LATEST_BUNDLE_MANIFEST_FILE"

node - <<'EOF' "$LATEST_BUNDLE_MANIFEST_FILE"
const fs = require('fs');
const manifestPath = process.argv[2];
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.artifacts.latestBundleManifest = {
  path: manifestPath,
  note: 'Self-referential manifest path entry (checksum validated externally by verifier input path)',
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
EOF
cp "$LATEST_BUNDLE_MANIFEST_FILE" "$BUNDLE_MANIFEST_FILE"

echo "[ui-release-handoff] Generated: $HANDOFF_FILE"
echo "[ui-release-handoff] Updated : $LATEST_HANDOFF_FILE"
echo "[ui-release-handoff] Generated: $ONE_PASS_SCRIPT_FILE"
echo "[ui-release-handoff] Updated : $LATEST_ONE_PASS_SCRIPT_FILE"
echo "[ui-release-handoff] Generated: $OPERATOR_BRIEF_FILE"
echo "[ui-release-handoff] Updated : $LATEST_OPERATOR_BRIEF_FILE"
echo "[ui-release-handoff] Generated: $BUNDLE_MANIFEST_FILE"
echo "[ui-release-handoff] Updated : $LATEST_BUNDLE_MANIFEST_FILE"
