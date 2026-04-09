# Mission Control V2 - Agent Handoff

This is the shared dynamic handoff document for Noona, Cursor, Antigravity, or any other coding agent working on Mission Control V2.

## Working Rules
- Keep this document curated, not verbose.
- Update it after meaningful progress, blockers, or handoff-worthy decisions.
- Do not dump raw transcripts here.
- Leave the project easier for the next agent to pick up.

## Canonical Project Info
- **Canonical repo:** `/mnt/d/Warung Kerja 1.0/03_Active_Projects/Mission Control/mission-control-v2`
- **GitHub repo:** `https://github.com/warung-kerja/mission-control-v2`
- **Legacy V1 repo:** `/mnt/d/Warung Kerja 1.0/03_Active_Projects/Mission Control/mission-control`
- **Current goal:** full production-ready ship
- **Current deployment posture:** local-first for now

## Current Phase
**Phase 5.5 - Stabilisation, truth-alignment, and deployment readiness**

## Overall Progress
**~76%** `████████░░`

## What Is Working
- Standalone V2 repo has been created, cleaned up, and pushed to GitHub.
- `npm run build` was repaired and made functional from the canonical V2 repo.
- `npm run dev` startup path was stabilised from the standalone repo.
- Seed/demo data was refreshed to reflect the canonical current team and Mission Control context.
- Frontend truth-alignment passes removed multiple stale/demo identity assumptions.
- Source-of-truth planning doc exists: `docs/source-of-truth-plan.md`.
- Bootstrap project registry exists: `docs/projects.registry.bootstrap.json`.
- API canonical source helper exists: `apps/api/src/lib/canonicalSources.ts`.
- API route exists for source-of-truth status: `/api/system/source-truth-status`.
- UI release readiness reached **READY** status after manual terminal step and host dependency install.

## Current Blockers
- Final UI release tooling is still not fully clean.
- Most recent release-gate blocker: operator brief / handoff verification expectations are still being tightened.
- The environment blocker is gone; the remaining blockers are now script/handoff correctness issues.

## Canonical Data Direction
### Team truth
Primary source:
- `/mnt/d/Warung Kerja 1.0/06_Agents/_Shared_Memory/AGENTS_ROSTER.md`

### Project truth
Target long-term source:
- `/mnt/d/Warung Kerja 1.0/03_Active_Projects/_registry/projects.json`

Temporary in-repo bootstrap source:
- `docs/projects.registry.bootstrap.json`

### Runtime truth
- OpenClaw runtime/session state where useful

### Memory / context truth
- `memory/*.md`
- project memory / docs as needed

## Current Best Next Tasks
1. Finish the release-handoff / operator-brief verification cleanup so the UI release path is fully clean.
2. Wire canonical source-of-truth adapters more directly into the API layer for projects and team.
3. Continue removing remaining demo/prototype assumptions from frontend and data flow.
4. Move from bootstrap project registry toward the final external canonical registry when safe.
5. Keep V2 documentation/handoff clean for multi-agent work.

## Release Context
Most useful files for release state:
- `work-logs/latest-ui-release-readiness-report.md`
- `work-logs/latest-ui-release-handoff.md`
- `work-logs/latest-ui-release-operator-brief.md`
- `work-logs/latest-ui-release-one-pass.sh`

Important note:
- The manual terminal dependency was already cleared once via WSL + `sudo -v`.
- Remaining release issues are now in the generated handoff/verification chain, not host readiness.

## Latest Meaningful Progress
- Created and pushed standalone V2 repo as canonical active Mission Control codebase.
- Clarified README and repo purpose.
- Fixed standalone build/dev setup.
- Updated seed data to canonical current roster and project reality.
- Aligned sidebar and dashboard fallback identity text away from stale persona assumptions.
- Added source-of-truth plan and bootstrap project registry.
- Added API-side canonical source path helper and source-truth status endpoint.
- Progress summaries and hourly cron behavior were refined for Telegram readability.

## Handoff Notes
### 2026-04-09 - Noona
- V2 is the only active Mission Control repo now.
- If another agent picks this up, start by reading:
  1. `README.md`
  2. `docs/source-of-truth-plan.md`
  3. this file
  4. latest release artifacts in `work-logs/`
- Current work is less about raw feature building and more about making V2 fully truthful, clean, and production-ready.
- Jen is the default implementation helper when work is bounded and implementation-heavy.
- Noona should stay primary for architecture, release logic, integration, and sign-off.

## Update Template
Use this when leaving a new handoff note:

### YYYY-MM-DD - Agent Name
- What changed:
- Validation:
- Blocker:
- Next recommended step:
