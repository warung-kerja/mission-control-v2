#!/usr/bin/env bash
set -euo pipefail

echo "[playwright-deps] Installing host dependencies required for Playwright Chromium..."

if ! command -v sudo >/dev/null 2>&1; then
  echo "[playwright-deps] ERROR: sudo is required but not available on this host."
  echo "[playwright-deps] Run manually in an elevated shell: apt-get update && apt-get install -y libnspr4"
  exit 1
fi

if dpkg -s libnspr4 >/dev/null 2>&1; then
  echo "[playwright-deps] libnspr4 is already installed."
  echo "[playwright-deps] Next: npm run smoke:ui"
  exit 0
fi

if ! sudo -n true >/dev/null 2>&1; then
  echo "[playwright-deps] ERROR: sudo requires interactive authentication in this shell."
  echo "[playwright-deps] Re-run this command in an interactive terminal where sudo password prompts are allowed."
  echo "[playwright-deps] Manual commands:"
  echo "  sudo apt-get update && sudo apt-get install -y libnspr4"
  echo "  # optional full bundle: sudo npx playwright install-deps chromium"
  exit 1
fi

sudo apt-get update
sudo apt-get install -y libnspr4

echo "[playwright-deps] Installed libnspr4."
echo "[playwright-deps] Optional full dependency bundle: sudo npx playwright install-deps chromium"
echo "[playwright-deps] Next: npm run smoke:ui"
