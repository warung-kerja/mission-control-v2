# Mission Control V2 - Epic List & Backlog

This document outlines the high-level Epics for Mission Control V2, distilling the current state (`Phase 5.5`, ~94% complete) into an actionable roadmap of what is finished, what is currently blocking the launch, and what needs to be done to reach 100% feature-complete status.

## 🟢 Epic 1: Repository & Foundation (Completed)

**Goal:** Establish the rock-solid monorepo architecture needed for V2 scalability.

- `[x]` Split out a standalone V2 repository from the nested directories.
- `[x]` Scaffold Turborepo workspace (React/Vite UI + Express/Node API).
- `[x]` Establish Prisma Database Schema and basic SQLite or PostgreSQL runtime.
- `[x]` Set up overarching workspace scripts (build, dev, lint, type-check).
- `[x]` Implement foundational JWT Authentication and Route Protection.
- `[x]` Establish UI component library structure (Tailwind, Radix, Lucide).

## 🟡 Epic 2: Truth Alignment (Current Focus)

**Goal:** Strip out all temporary "demo" scaffolding and wire the UI state directly to authentic "Source of Truth" data (like markdown files and external registries).

- `[x]` Create API-layer adapter (`canonicalSources.ts`) to parse flat files into typed DB models.
- `[x]` **Team Truth:** Hook up `/api/canonical/team` to read directly from `AGENTS_ROSTER.md`.
- `[x]` Segregate the `Team` UI view to cleanly distinguish Canonical Data vs Runtime Workload Data.
- `[x]` **Projects Truth:** Migrate the project list from the in-repo bootstrap file (`docs/projects.registry.bootstrap.json`) to the final external true registry at `/mnt/d/Warung Kerja 1.0/03_Active_Projects/_registry/projects.json`.
- `[~]` **Dashboard Truth Audit:** Audit Dashboard, Projects, Team, Office, and Analytics so every surface clearly uses canonical data, runtime data, or an explicit fallback. Remove stale/demo assumptions and document each page's truth source.
- `[ ]` **Projects Registry Completion:** Update `/mnt/d/Warung Kerja 1.0/03_Active_Projects/_registry/projects.json` so the recognisable active project list matches reality, not just a partial subset.
- `[ ]` **Dashboard Truth Rules:** Define and implement strict display rules for what counts as active, recent, stale, and missing across agents, projects, and operational status.

## 🟢 Epic 3: Deployment Pipeline & CI (Completed)

**Goal:** Achieve a flawless "Zero-Error" autonomous release pipeline so updates can be shipped identically and safely.

- `[x]` Debug and fix 100% of workspace-level ESLint parsing issues breaking pre-commit hooks.
- `[x]` Ensure `turbo run build` caching is configured and completing successfully.
- `[x]` **Release Hand-off Tuning:** Fix the `latest-ui-release-one-pass.sh` generation logic and operator brief assertions so the full UI one-pass sequence succeeds clean end-to-end.

## 🔴 Epic 4: Outstanding Core Modules (Next Up)

**Goal:** Build out the missing feature modules that were scoped for V2.

- `[ ]` **Memories Browser:** Visualization and search tools for querying long-term agent memory and context.
- `[~]` **Office Visualization:** A virtual "layout" view showcasing live team presence, status, and active subagent workspaces.
  - `[x]` Real-time presence: `useOfficeRealtime` hook wires `user:online`, `user:offline`, `presence:update` socket events to immediate query invalidation — status changes no longer wait for the 60 s poll.
  - `[x]` Live connection badge: "Live / Polling" badge in Office header reflects actual socket connection state.
  - `[x]` Improved UI: per-status glow shadows, coloured accent stripes, staggered entrance animations, pulsing avatar rings, smooth workload bar transitions, activity feed with live badge.
  - `[x]` New Tailwind keyframes: `slide-in-left`, `scale-in`, `glow-pulse` added to `tailwind.config.js`.
  - `[ ]` Remaining: subagent workspaces dimension (active subagent context per member).
- `[~]` **Collaboration Tools:** ~~Task tracking, backlog breakdown visuals, and active agent interplay interfaces.~~ **Deprioritised (2026-04-10).** Agent-to-agent and human-to-agent collaboration happens via external comms (not in-platform). The Collaboration tab will remain as a basic stub but will not be built out further.
- `[ ]` **Analytics Expansion:** Drive the Analytics page using deeply integrated real-world data tracking rather than synthesized test stats.
- `[ ]` **Cron Health Surface:** Add a first-class Cron Health / Automation Status module so Raz can see job success, failures, next runs, last runs, and blockers in-app without asking in chat.

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
1. **Truth audit pass**
   - audit Dashboard, Projects, Team, Office, and Analytics page-by-page
   - identify every remaining stale/demo/partial data path
   - document the truth source for each surface
2. **Projects registry cleanup**
   - bring `/mnt/d/Warung Kerja 1.0/03_Active_Projects/_registry/projects.json` fully in line with the real current active project set
3. **Cron status visibility**
   - add API support for OpenClaw cron state
   - surface Cron Health on Dashboard or a dedicated Automation view
4. **Runtime visibility expansion**
   - expose agent/session/subagent live status more clearly in Dashboard, Team, and Office

#### Should Do
5. **Memories Browser refinement**
   - make canonical memory browsing actually useful and trustworthy
6. **Office subagent workspaces dimension**
   - show what each subagent is actively doing on the Office view
7. **Dashboard + Team real-time pass**
   - extend the socket invalidation pattern beyond Office

#### Product Guardrails
- Premium/login work should be stabilised before broad new feature branching.
- Collaboration remains deprioritised.
- Mission Control should prefer trustworthy visibility over decorative but inaccurate panels.

#### Delegation Guidance
- **Jen-first:** bounded implementation slices like cron status cards, dashboard UI cleanup, analytics data plumbing, and page-level audits.
- **Noona-only:** truth-model decisions, runtime adapter architecture, cron/status integration design, release-sensitive changes, and final sign-off.
