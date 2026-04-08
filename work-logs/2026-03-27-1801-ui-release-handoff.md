# UI Release Gate — Operator Handoff

- Generated: 2026-03-27 06:01 PM (AEDT)
- Readiness snapshot: `work-logs/latest-ui-release-readiness.json`
- Latest readiness markdown report: `work-logs/latest-ui-release-readiness-report.md`
- Latest readiness JSON report: `work-logs/latest-ui-release-readiness-report.json`
- Current status: **NOT_READY**
- Blocking checks: **3**
- Snapshot timestamp: **2026-03-27T18:01:35+1100**
- Snapshot age: **0 min** (fresh)
- Previous blocking checks: **3**
- Blocking trend: **unchanged**

## Readiness Snapshot

- Interactive terminal available: false
- libnspr4 installed: false
- @playwright/test installed: true
- Playwright runtime launch: false

## Targeted Remediation Checklist

1. Re-run in an **interactive host terminal** (TTY required).
2. Pre-authenticate sudo and install Playwright host dependencies:
   ```bash
   cd /mnt/d/Warung\ Kerja\ 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/apps/web
   sudo -v
   npm run deps:playwright-host
   ```
4. Recheck runtime after remediation:
   ```bash
   cd /mnt/d/Warung\ Kerja\ 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/apps/web
   npm run release:ui-readiness
   ```

## One-Pass Command Sequence (Copy/Paste)

```bash
cd /mnt/d/Warung\ Kerja\ 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/apps/web
sudo -v
npm run deps:playwright-host
npm run release:ui-readiness
npm run release:ui-handoff-verify
npm run release:ui-readiness
# Assert latest-ui-release-readiness.json => status READY and blockingChecks 0 before gate
npm run release:ui-gate
```

## Handoff Artifacts

- Timestamped handoff path: `/mnt/d/Warung Kerja 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/2026-03-27-1801-ui-release-handoff.md`
- Stable latest handoff path: `/mnt/d/Warung Kerja 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/latest-ui-release-handoff.md`
- Timestamped script path: `/mnt/d/Warung Kerja 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/2026-03-27-1801-ui-release-one-pass.sh`
- Stable latest script path: `/mnt/d/Warung Kerja 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/latest-ui-release-one-pass.sh`
- Stable latest bundle manifest: `/mnt/d/Warung Kerja 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/latest-ui-release-handoff-bundle-manifest.json`
- Run from an interactive elevated host terminal:
  ```bash
  bash /mnt/d/Warung Kerja 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/latest-ui-release-one-pass.sh
  ```

## Run This In Interactive Elevated Host Terminal

```bash
cd /mnt/d/Warung\ Kerja\ 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/apps/web
npm run release:ui-gate
```

## Expected Success Artifact

- Timestamped file: `work-logs/*-ui-smoke-release-gate.md`
- Stable latest file: `work-logs/latest-ui-smoke-release-gate.md`
- Gate result inside artifact: `UI release gate: ✅ PASS`

## If It Fails

1. Resolve reported blocker in the same terminal
2. Re-run `npm run release:ui-gate`
3. Keep the latest artifact for release evidence
