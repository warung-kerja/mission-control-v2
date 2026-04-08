#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_LOG_DIR="$(cd "$ROOT_DIR/../.." && pwd)/work-logs"
mkdir -p "$WORK_LOG_DIR"

TIMESTAMP_LOCAL="$(TZ=Australia/Sydney date +"%Y-%m-%d %I:%M %p (%Z)")"
TIMESTAMP_ISO="$(TZ=Australia/Sydney date +"%Y-%m-%dT%H:%M:%S%z")"
FILE_STAMP="$(TZ=Australia/Sydney date +"%Y-%m-%d-%H%M")"
LOG_FILE="$WORK_LOG_DIR/${FILE_STAMP}-ui-release-readiness-report.md"
JSON_FILE="$WORK_LOG_DIR/${FILE_STAMP}-ui-release-readiness-report.json"
LATEST_JSON_FILE="$WORK_LOG_DIR/latest-ui-release-readiness.json"
LATEST_MD_REPORT_FILE="$WORK_LOG_DIR/latest-ui-release-readiness-report.md"
LATEST_JSON_REPORT_FILE="$WORK_LOG_DIR/latest-ui-release-readiness-report.json"

cd "$ROOT_DIR"

failures=0
interactive_terminal_ok=false
libnspr4_ok=false
playwright_package_ok=false
playwright_runtime_ok=false

declare -a CHECK_LINES=()
declare -a NOTE_LINES=()

record_check() {
  local label="$1"
  local state="$2"
  local details="$3"

  CHECK_LINES+=("- ${label}: ${state}")
  if [[ -n "$details" ]]; then
    NOTE_LINES+=("- ${label}: ${details}")
  fi

  echo "- ${label}: ${state}"
}

echo "[ui-release-readiness] Checking UI release gate prerequisites..."

if [[ -t 0 ]]; then
  interactive_terminal_ok=true
  record_check "interactive-terminal" "✅ detected" ""
else
  record_check "interactive-terminal" "❌ missing" "Run from a real terminal/TTY before release:ui-gate."
  failures=$((failures + 1))
fi

if command -v dpkg >/dev/null 2>&1; then
  if dpkg -s libnspr4 >/dev/null 2>&1; then
    libnspr4_ok=true
    record_check "libnspr4" "✅ installed" ""
  else
    record_check "libnspr4" "❌ missing" "Run npm run deps:playwright-host in an interactive elevated terminal."
    failures=$((failures + 1))
  fi
else
  record_check "libnspr4" "⚠️ skipped" "dpkg unavailable; verify Chromium host dependencies manually for this OS."
fi

if node -e "import('@playwright/test').then(()=>process.exit(0)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
  playwright_package_ok=true
  record_check "@playwright/test" "✅ available" ""
else
  record_check "@playwright/test" "❌ missing" "Run npm install in apps/web."
  failures=$((failures + 1))
fi

if npm run -s verify:playwright-runtime >/dev/null 2>&1; then
  playwright_runtime_ok=true
  record_check "playwright-runtime-launch" "✅ pass" ""
else
  record_check "playwright-runtime-launch" "❌ fail" "Host runtime deps still blocked (typically libnspr4 / Playwright Linux deps bundle)."
  failures=$((failures + 1))
fi

if (( failures > 0 )); then
  RESULT_LINE="[ui-release-readiness] RESULT: NOT READY (${failures} blocking check(s))"
  STATUS="NOT_READY"
else
  RESULT_LINE="[ui-release-readiness] RESULT: READY"
  STATUS="READY"
fi

echo "$RESULT_LINE"

{
  echo "# UI Release Readiness Report"
  echo
  echo "- Timestamp: $TIMESTAMP_LOCAL"
  echo "- Working directory: \`apps/web\`"
  echo
  echo "## Checks"
  echo
  for line in "${CHECK_LINES[@]}"; do
    echo "$line"
  done
  echo
  echo "## Result"
  echo
  echo "- $RESULT_LINE"
  if ((${#NOTE_LINES[@]} > 0)); then
    echo
    echo "## Remediation Notes"
    echo
    for line in "${NOTE_LINES[@]}"; do
      echo "$line"
    done
  fi
} > "$LOG_FILE"

cat > "$JSON_FILE" <<EOF
{
  "timestamp": "$TIMESTAMP_ISO",
  "status": "$STATUS",
  "blockingChecks": $failures,
  "checks": {
    "interactiveTerminal": $interactive_terminal_ok,
    "libnspr4": $libnspr4_ok,
    "playwrightPackage": $playwright_package_ok,
    "playwrightRuntimeLaunch": $playwright_runtime_ok
  },
  "paths": {
    "markdownReport": "$(basename "$LOG_FILE")",
    "jsonReport": "$(basename "$JSON_FILE")",
    "latestMarkdownReport": "$(basename "$LATEST_MD_REPORT_FILE")",
    "latestJsonReport": "$(basename "$LATEST_JSON_REPORT_FILE")",
    "latestReadinessSnapshot": "$(basename "$LATEST_JSON_FILE")"
  }
}
EOF

cp "$LOG_FILE" "$LATEST_MD_REPORT_FILE"
cp "$JSON_FILE" "$LATEST_JSON_REPORT_FILE"
cp "$JSON_FILE" "$LATEST_JSON_FILE"

echo "[ui-release-readiness] Evidence saved: $LOG_FILE"
echo "[ui-release-readiness] JSON saved: $JSON_FILE"
echo "[ui-release-readiness] Latest markdown report: $LATEST_MD_REPORT_FILE"
echo "[ui-release-readiness] Latest JSON report: $LATEST_JSON_REPORT_FILE"
echo "[ui-release-readiness] Latest JSON snapshot: $LATEST_JSON_FILE"

if (( failures > 0 )); then
  exit 1
fi
