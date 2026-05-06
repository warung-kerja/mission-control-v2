# Mission Control V3 - Epic List & Backlog

This document tracks the Mission Control V3 control-room reset inside the existing `mission-control-v2` repo. The current goal is not broad PM breadth — it is truthful operational visibility for Raz's OpenClaw crew.

## 🟢 Epic 1: Repository & Foundation (Completed)

**Goal:** Establish the rock-solid monorepo architecture needed for V2 scalability.

- `[x]` Split out a standalone V2 repository from the nested directories.
- `[x]` Scaffold Turborepo workspace (React/Vite UI + Express/Node API).
- `[x]` Establish Prisma Database Schema and basic SQLite or PostgreSQL runtime.
- `[x]` Set up overarching workspace scripts (build, dev, lint, type-check).
- `[x]` Implement foundational JWT Authentication and Route Protection.
- `[x]` Establish UI component library structure (Tailwind, Radix, Lucide).

## 🟢 Epic 2: Truth Alignment (Mostly Complete)

**Goal:** Strip out all temporary "demo" scaffolding and wire the UI state directly to authentic "Source of Truth" data (like markdown files and external registries).

- `[x]` Create API-layer adapter (`canonicalSources.ts`) to parse flat files into typed DB models.
- `[x]` **Team Truth:** Hook up `/api/canonical/team` to read directly from `AGENTS_ROSTER.md`.
- `[x]` Segregate the `Team` UI view to cleanly distinguish Canonical Data vs Runtime Workload Data.
- `[x]` **Projects Truth:** Migrate the project list from the in-repo bootstrap file (`docs/projects.registry.bootstrap.json`) to the final external true registry at `/mnt/d/Warung Kerja 1.0/03_Active_Projects/_registry/projects.json`.
- `[x]` **V3 Surface Truth Audit:** Control Room, Tasks, Calendar, Projects, Memory Vault, Team, Office, Collaboration, and Signals now each declare a clear canonical/runtime/fallback truth posture in the shell and UI copy.
- `[x]` **Projects Registry Completion:** Updated `/mnt/d/Warung Kerja 1.0/03_Active_Projects/_registry/projects.json` to version 3 with Mission Control V3, Handover, Handover Research Feedback UI, Framer workstreams, and maintained Mission Control substreams.
- `[x]` **Dashboard Truth Rules:** Dashboard now exposes strict registry-backed rules for active, recent, stale, and missing project state, with explicit copy that excludes demo activity, guessed progress, and stale DB records.

## 🟢 Epic 3: Deployment Pipeline & CI (Completed)

**Goal:** Achieve a flawless "Zero-Error" autonomous release pipeline so updates can be shipped identically and safely.

- `[x]` Debug and fix 100% of workspace-level ESLint parsing issues breaking pre-commit hooks.
- `[x]` Ensure `turbo run build` caching is configured and completing successfully.
- `[x]` **Release Hand-off Tuning:** Fix the `latest-ui-release-one-pass.sh` generation logic and operator brief assertions so the full UI one-pass sequence succeeds clean end-to-end.

## 🟢 Epic 4: V3 Control-Room Surfaces (Completed — V3 merge-ready)

**Goal:** Finish the V3 surface reset so each module has one clear operational job and avoids fake state.

- `[x]` **Memories Browser:** Full two-tab UI — canonical _Shared_Memory files (default) and Runtime DB records. Searchable, category-filtered, click-to-read-full-file modal. `useCanonicalMemories` hook wires `/api/canonical/memories` to the file tab.
- `[x]` **Office Visualization:** A virtual "layout" view showcasing live team presence, status, and active subagent workspaces.
  - `[x]` Real-time presence: `useOfficeRealtime` hook wires `user:online`, `user:offline`, `presence:update` socket events to immediate query invalidation — status changes no longer wait for the 60 s poll.
  - `[x]` Live connection badge: "Live / Polling" badge in Office header reflects actual socket connection state.
  - `[x]` Improved UI: per-status glow shadows, coloured accent stripes, staggered entrance animations, pulsing avatar rings, smooth workload bar transitions, activity feed with live badge.
  - `[x]` New Tailwind keyframes: `slide-in-left`, `scale-in`, `glow-pulse` added to `tailwind.config.js`.
  - `[x]` Subagent workspaces dimension: canonical subagents mapped to parent runtime lanes with explicit no-runtime / no-active-task states.
- `[x]` **Collaboration / Coordination Watch:** Read-only routing and awareness surface. Shows communication routing rules, active project owner lanes, runtime presence telemetry, canonical crew groups, and recent activity. It is explicitly not an in-app chat clone or second source of truth.
- `[x]` **Analytics Expansion:** Canonical "Project Registry Health" section added — live status distribution, priority split, and recently-updated list from `_registry/projects.json`. DB task/productivity panels remain in place for runtime data.
- `[x]` **Cron Health Surface:** `openclawClient.ts` bridged to live data via the OpenClaw CLI (`openclaw cron list --json`). This pattern is more robust than HTTP polling as it leverages the official WebSocket protocol and auth logic. Dashboard "Cron Health" panel now shows live job cards.

## 🟡 Epic 5: Advanced Real-time Integrations (Future / Non-blocking after V3 merge-ready gate)

**Goal:** Finalize the transformation of MC-V2 into a living "nervous system."

- `[x]` **Live WebSockets:** Socket.io invalidation now covers the active V3 surfaces that need runtime freshness.
  - `[x]` Office presence events wired (user:online, user:offline, presence:update → immediate query invalidation).
  - `[x]` Activity feed listens for `activity:new` event.
  - `[x]` Dashboard and Team now subscribe to shared real-time invalidation for task, activity, presence, and runtime snapshot updates.
- `[x]` **Runtime Truth Adapters:** OpenClaw cron status and Team runtime snapshot now use CLI-backed truth. `/api/system/openclaw-runtime` summarises recent sessions, subagent task records, and gateway presence without inventing workload. Decision: Team + Control Room runtime coverage is enough for V3 merge; Dashboard stays registry/cron/truth-rule focused and receives socket invalidation.
- `[ ]` **Plugin Architecture:** (If applicable) Expose a plugin structure enabling other agents or tools to securely connect to Mission Control.
- `[ ]` **Legacy Migration:** Sunset and fully replace the V1.4 Data Bridge tools.

---

### Weekly Focus Plan (Integrated 2026-04-12)

#### Must Do — Completed for V3 merge-ready gate
1. **Runtime visibility expansion** ✅
   - Team exposes OpenClaw session/subagent/gateway snapshot without inventing unavailable state; Dashboard remains registry/cron/truth-rule focused.
2. **Team/Office model drift checks** ✅
   - canonical roster, runtime-only badges, and restricted-model watch are in place.
3. **Final V3 verification** ✅
   - route/shell audit passed; `npm run lint`, `npm run type-check`, `npm run build`, and `npm run predeploy:check` pass on a clean tree.

#### Should Do — V3 disposition
5. **Memories Browser refinement** ✅
   - canonical Shared Memory files are the default tab; Runtime DB remains explicitly labeled.
6. **Dashboard + Team real-time pass** ✅
   - shared socket invalidation now extends beyond Office to Dashboard and Team.
7. **Signals refinement** ✅
   - Signals keeps explicit source labels and canonical/runtime/fallback posture.

#### Product Guardrails
- Premium/login work should be stabilised before broad new feature branching.
- Collaboration remains deprioritised.
- Mission Control should prefer trustworthy visibility over decorative but inaccurate panels.

#### Delegation Guidance
- **Jen-first:** bounded implementation slices like cron status cards, dashboard UI cleanup, analytics data plumbing, and page-level audits.
- **Noona-only:** truth-model decisions, runtime adapter architecture, cron/status integration design, release-sensitive changes, and final sign-off.
---

## ✅ V3 Merge-Ready Status — 2026-05-07

Mission Control V3 is complete and merge-ready on branch `v3-control-room-reset`.

Final accepted commits after the completion sprint:
- `cf43b51` — Dashboard Truth Rules
- `d8f8a83` — OpenClaw runtime snapshot
- `81be645` — Dashboard + Team real-time invalidation pass

Final gate passed on a clean working tree:
- `npm run lint` ✅
- `npm run type-check` ✅
- `npm run build` ✅
- `npm run predeploy:check` ✅

Merge posture: ready to merge `v3-control-room-reset` into `main` when Raz/Baro want the release promoted.
