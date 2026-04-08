# UI Release Gate — Operator Handoff

- Generated: 2026-04-05 11:04 AM (AEST)
- Readiness snapshot: `work-logs/latest-ui-release-readiness.json`
- Latest readiness markdown report: `work-logs/latest-ui-release-readiness-report.md`
- Latest readiness JSON report: `work-logs/latest-ui-release-readiness-report.json`
- Current status: **NOT_READY**
- Blocking checks: **3**
- Snapshot timestamp: **2026-04-05T11:03:48+1000**
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
# Assert latest-ui-release-readiness.json file mtime refreshes after pre-gate release:ui-readiness
# Assert latest readiness report JSON + markdown files refresh after pre-gate release:ui-readiness
# Assert readiness report mtimes remain stable before release gate execution
# Assert readiness report SHA-256 values remain stable before release gate execution
# Assert git repository top-level context matches the expected web directory before gate
# Assert current directory is an active git work tree before gate execution
# Assert git common-dir resolves to an existing directory before gate execution
# Assert git dir resolves to an existing directory before gate execution
# Assert resolved git common-dir and git-dir paths remain stable before gate execution
# Assert tracked git changes are clean (git diff + git diff --cached) before gate
# Assert no git operations are in progress (.git/MERGE_HEAD, rebase, cherry-pick, revert, bisect) before gate
# Assert no git index lock file (.git/index.lock) is present before gate execution
# Assert latest-ui-release-readiness.json => status READY and blockingChecks 0 before gate
# Assert required stable pre-gate artifacts exist before metadata/hash capture
# Assert release-gate start epoch metadata uses 10-digit unix epoch format before run-token generation
# Assert all pre-gate evidence metadata values are deterministic (no unknown placeholders)
# Assert pre-gate commit hash metadata uses valid git hash format (7-40 lowercase hex)
# Assert pre-gate branch metadata uses allowed branch-name characters (A-Z, a-z, 0-9, ., _, /, -)
# Assert pre-gate branch is attached (not detached HEAD) before final gate execution
# Assert pre-gate readiness timestamp metadata uses ISO-8601 format (YYYY-MM-DDTHH:MM:SS±HHMM or Z)
# Assert pre-gate readiness timestamp metadata remains stable after pre-gate readiness refresh
# Assert pre-gate readiness status metadata is READY or NOT_READY
# Assert pre-gate readiness status/blocking metadata remains stable after pre-gate readiness refresh
# Assert pre-gate captured readiness metadata remains READY with blockingChecks=0 before gate execution
# Assert pre-gate readiness blocking-check metadata is numeric
# Assert all pre-gate SHA-256 metadata values are valid lowercase 64-char hex strings
# Assert pre-gate handoff bundle manifest SHA-256 remains stable before release gate execution
# Assert stable handoff bundle manifest self-path remains work-logs/latest-ui-release-handoff-bundle-manifest.json before gate execution
# Assert pre-gate operator brief SHA-256 remains stable before release gate execution
# Assert pre-gate one-pass script SHA-256 remains stable before release gate execution
# Assert smoke evidence contains expected readiness snapshot timestamp metadata
# Assert smoke evidence contains expected readiness status metadata
# Assert smoke evidence contains expected readiness blocking-check count metadata
# Assert smoke evidence contains expected readiness snapshot SHA-256 metadata
# Assert smoke evidence contains expected readiness report JSON SHA-256 metadata
# Assert smoke evidence contains expected readiness report markdown SHA-256 metadata
# Assert smoke evidence contains expected handoff bundle manifest SHA-256 metadata
# Assert smoke evidence contains expected handoff markdown SHA-256 metadata
# Assert smoke evidence contains expected operator brief SHA-256 metadata
# Assert smoke evidence contains expected one-pass script SHA-256 metadata
# Assert smoke evidence contains expected web directory path metadata
npm run release:ui-gate
```

## Handoff Artifacts

- Timestamped handoff path: `/mnt/d/Warung Kerja 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/2026-04-05-1104-ui-release-handoff.md`
- Stable latest handoff path: `/mnt/d/Warung Kerja 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/latest-ui-release-handoff.md`
- Timestamped script path: `/mnt/d/Warung Kerja 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/2026-04-05-1104-ui-release-one-pass.sh`
- Stable latest script path: `/mnt/d/Warung Kerja 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/latest-ui-release-one-pass.sh`
- Stable latest bundle manifest: `/mnt/d/Warung Kerja 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/latest-ui-release-handoff-bundle-manifest.json`
- Run from an interactive elevated host terminal:
  ```bash
  bash /mnt/d/Warung Kerja 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/work-logs/latest-ui-release-one-pass.sh
  ```

## Run This In Interactive Elevated Host Terminal

```bash
cd /mnt/d/Warung\ Kerja\ 1.0/06_Agents/noona/projects/mission-control/mission-control-v2/apps/web
bash ../work-logs/latest-ui-release-one-pass.sh
```

## Expected Success Artifact

- Timestamped file: `work-logs/*-ui-smoke-release-gate.md`
- Stable latest file: `work-logs/latest-ui-smoke-release-gate.md`
- Gate result inside artifact: `UI release gate: ✅ PASS`

## If It Fails

1. Resolve reported blocker in the same terminal
2. Re-run `bash ../work-logs/latest-ui-release-one-pass.sh`
3. Keep the latest artifact for release evidence
