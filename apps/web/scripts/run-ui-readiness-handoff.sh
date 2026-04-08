#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "[ui-ready-handoff] Refreshing readiness snapshot..."
READINESS_EXIT=0
npm run release:ui-readiness || READINESS_EXIT=$?
if [[ "$READINESS_EXIT" -ne 0 ]]; then
  echo "[ui-ready-handoff] Readiness is NOT READY (or blocked). Continuing to generate handoff packet with latest snapshot."
fi

echo "[ui-ready-handoff] Generating handoff packet from fresh snapshot..."
npm run release:ui-handoff

echo "[ui-ready-handoff] Verifying stable handoff artifacts..."
npm run release:ui-handoff-verify

if [[ "$READINESS_EXIT" -ne 0 ]]; then
  echo "[ui-ready-handoff] Completed with blockers (readiness exit: $READINESS_EXIT)."
  echo "[ui-ready-handoff] Use the generated handoff packet for interactive elevated follow-up."
else
  echo "[ui-ready-handoff] Done."
fi
