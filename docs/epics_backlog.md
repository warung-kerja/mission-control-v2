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
- `[ ]` **Dashboard Truth Rules:** Define and implement strict display rules for what counts as active, recent, stale, and missing across agents, projects, and operational status.

## 🟢 Epic 3: Deployment Pipeline & CI (Completed)

**Goal:** Achieve a flawless "Zero-Error" autonomous release pipeline so updates can be shipped identically and safely.

- `[x]` Debug and fix 100% of workspace-level ESLint parsing issues breaking pre-commit hooks.
- `[x]` Ensure `turbo run build` caching is configured and completing successfully.
- `[x]` **Release Hand-off Tuning:** Fix the `latest-ui-release-one-pass.sh` generation logic and operator brief assertions so the full UI one-pass sequence succeeds clean end-to-end.

## 🟡 Epic 4: V3 Control-Room Surfaces (Current Focus)

**Goal:** Finish the V3 surface reset so each module has one clear operational job and avoids fake state.

- `[x]` **Memories Browser:** Full two-tab UI — canonical _Shared_Memory files (default) and Runtime DB records. Searchable, category-filtered, click-to-read-full-file modal. `useCanonicalMemories` hook wires `/api/canonical/memories` to the file tab.
- `[x]` **Office Visualization:** A virtual "layout" view showcasing live team presence, status, and active subagent workspaces.
  - `[x]` Real-time presence: `useOfficeRealtime` hook wires `user:online`, `user:offline`, `presence:update` socket events to immediate query invalidation — status changes no longer wait for the 60 s poll.
  - `[x]` Live connection badge: "Live / Polling" badge in Office header reflects actual socket connection state.
  - `[x]` Improved UI: per-status glow shadows, coloured accent stripes, staggered entrance animations, pulsing avatar rings, smooth workload bar transitions, activity feed with live badge.
  - `[x]` New Tailwind keyframes: `slide-in-left`, `scale-in`, `glow-pulse` added to `tailwind.config.js`.
  - `[x]` Subagent workspaces dimension: canonical subagents mapped to parent runtime lanes with explicit no-runtime / no-active-task states.
- `[x]` **Collaboration / Coordination Watch:** Read-only routing and awareness surface. Shows communication routing rules, active project owner lanes, runtime presence telemetry, canonical crew groups, and recent activity. It is explicitly not an in-app chat clone or second source of truth.
- `[~]` **Analytics Expansion:** Canonical "Project Registry Health" section added — live status distribution, priority split, and recently-updated list from `_registry/projects.json`. DB task/productivity panels remain in place for runtime data.
- `[x]` **Cron Health Surface:** `openclawClient.ts` bridged to live data via the OpenClaw CLI (`openclaw cron list --json`). This pattern is more robust than HTTP polling as it leverages the official WebSocket protocol and auth logic. Dashboard "Cron Health" panel now shows live job cards.

## 🔴 Epic 5: Advanced Real-time Integrations (Future)

**Goal:** Finalize the transformation of MC-V2 into a living "nervous system."

- `[~]` **Live WebSockets:** Replace polling with fully reliable Socket.io push events for real-time notification of status shifts (e.g., when an agent finishes a task or goes OFFLINE).
  - `[x]` Office presence events wired (user:online, user:offline, presence:update → immediate query invalidation).
  - `[x]` Activity feed listens for `activity:new` event.
  - `[ ]` Remaining: Dashboard and Team are still poll-only and should adopt the same socket-invalidation pattern.
- `[ ]` **Runtime Truth Adapters:** Add API adapters for OpenClaw runtime truth, especially agent/session state, subagent activity, and cron status so Dashboard and Office can reflect live operational reality.
- `[ ]` **Plugin Architecture:** (If applicable) Expose a plugin structure enabling other agents or tools to securely connect to Mission Control.
- `[ ]` **Legacy Migration:** Sunset and fully replace the V1.4 Data Bridge tools.

---

### Weekly Focus Plan (Integrated 2026-04-12)

#### Must Do
1. **Runtime visibility expansion**
   - expose agent/session/subagent live status more clearly in Dashboard and Team without inventing unavailable state
2. **Team/Office model drift checks**
   - keep canonical roster models aligned with actual runtime assignments and blocked-model rules
3. **Final V3 verification**
   - run lint/type-check/build and route/shell review before merge to `main`

#### Should Do
5. **Memories Browser refinement**
   - improve canonical memory browsing usefulness without adding fake summaries
6. **Dashboard + Team real-time pass**
   - extend the socket invalidation pattern beyond Office
7. **Signals refinement**
   - keep pattern detection useful while preserving explicit source labels

#### Product Guardrails
- Premium/login work should be stabilised before broad new feature branching.
- Collaboration remains deprioritised.
- Mission Control should prefer trustworthy visibility over decorative but inaccurate panels.

#### Delegation Guidance
- **Jen-first:** bounded implementation slices like cron status cards, dashboard UI cleanup, analytics data plumbing, and page-level audits.
- **Noona-only:** truth-model decisions, runtime adapter architecture, cron/status integration design, release-sensitive changes, and final sign-off.
