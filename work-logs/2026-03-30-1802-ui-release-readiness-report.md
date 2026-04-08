# UI Release Readiness Report

- Timestamp: 2026-03-30 06:02 PM (AEDT)
- Working directory: `apps/web`

## Checks

- interactive-terminal: ❌ missing
- libnspr4: ❌ missing
- @playwright/test: ✅ available
- playwright-runtime-launch: ❌ fail

## Result

- [ui-release-readiness] RESULT: NOT READY (3 blocking check(s))

## Remediation Notes

- interactive-terminal: Run from a real terminal/TTY before release:ui-gate.
- libnspr4: Run npm run deps:playwright-host in an interactive elevated terminal.
- playwright-runtime-launch: Host runtime deps still blocked (typically libnspr4 / Playwright Linux deps bundle).
