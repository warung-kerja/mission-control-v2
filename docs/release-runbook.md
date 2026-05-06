# Mission Control V3 — Release Runbook

This runbook standardizes final checks before any production release.

## 1) Pre-Deploy Gate (Required)

From repo root:

```bash
npm run predeploy:check
```

This executes, in order:
1. API type-check
2. API build
3. Web type-check
4. Web smoke (`build` + route chunk verification)
5. Web preview route reachability

### Pass Criteria
- All five checks complete without errors
- Route chunks present: **10 / 10**
- Main web bundle remains under **370 KB** limit

---

## 2) Manual UX Smoke Pass (Required)

Run local preview after a clean web build:

```bash
cd apps/web
npm run build
npm run preview
```

Optional preflight (safe to run in non-interactive environments) to see if the host is ready. It writes both markdown + JSON evidence (`work-logs/latest-ui-release-readiness.json`):

```bash
cd apps/web
npm run release:ui-readiness
```

For the final interaction-level release gate (host deps + UI smoke + evidence file), run:

```bash
cd apps/web
npm run release:ui-gate
```

If another operator will run it, generate a handoff packet from the latest readiness snapshot:

```bash
cd apps/web
npm run release:ui-handoff
```

Recommended handoff command (refreshes readiness, generates packet, and verifies stable artifact pointers):

```bash
cd apps/web
npm run release:ui-ready-handoff
```

You can re-run artifact integrity checks directly with:

```bash
cd apps/web
npm run release:ui-handoff-verify
```

Quick operator summary is always available at:
- `work-logs/latest-ui-release-operator-brief.md`

Open the preview URL and validate the following routes and interactions.

### Route Checklist (10 routes)
- [ ] `/` Control Room loads canonical source health, project momentum, cron pulse, and crew snapshot without console errors
- [ ] `/projects` project search + status filter work; cards render owner/status/progress from canonical registry
- [ ] `/tasks` status tabs + priority filter + search work; overdue highlighting visible; automation status renders
- [ ] `/calendar` month nav, day selection, and project filter work; cron audit panel opens
- [ ] `/team` org chart renders from canonical roster with drift detection; restricted model watch shows policy status
- [ ] `/office` live presence view and subagent workspace lanes render with real-time WebSocket updates
- [ ] `/memories` Memory Vault renders canonical Shared Memory files as browsable, searchable surface
- [ ] `/collaboration` coordination watch loads with routing rules, active lanes, presence telemetry, and recent signals
- [ ] `/analytics` Signals renders truth pattern detector with canonical/runtime-backed signals
- [ ] Legacy surfaces (`/dashboard-v2`, `/memories-db`, `/analytics-db`) preserved for reference only

### Core Interaction Checklist
- [ ] Mobile sidebar opens/closes correctly (hamburger + overlay close)
- [ ] Desktop sidebar navigation remains stable across route transitions
- [ ] No red errors in browser console during navigation across all routes
- [ ] Empty/loading/error states render gracefully where data is unavailable

---

## 3) Release Evidence (Required)

Capture and store before shipping:
- [ ] `npm run predeploy:check` terminal output (success)
- [ ] Manual smoke checklist result (all required checks marked)
- [ ] Current commit SHA and release timestamp

Recommended location: `projects/mission-control/work-logs/` with a dated file.

---

## 4) No-Go Conditions

Do **not** release if any of these occur:
- Any pre-deploy check fails
- Any V3 surface is missing or throws runtime errors
- Main bundle exceeds 370 KB guardrail
- Core nav/mobile interaction is broken

Fix, re-run full gate, and repeat smoke pass before retrying release.

---

## 5) Fast Rollback Plan

If a bad release reaches production:
1. Identify last known good commit SHA
2. Re-deploy previous stable artifact/commit
3. Log incident + root cause in work log
4. Patch in branch and re-run full runbook before redeploy
