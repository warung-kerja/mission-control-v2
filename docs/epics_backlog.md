# Mission Control V2 - Epic List & Backlog

This document outlines the high-level Epics for Mission Control V2, distilling the current state (`Phase 5.5`, ~76% complete) into an actionable roadmap of what is finished, what is currently blocking the launch, and what needs to be done to reach 100% feature-complete status.

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
- `[ ]` **Projects Truth:** Migrate the project list from the in-repo bootstrap file (`docs/projects.registry.bootstrap.json`) to the final external true registry at `/mnt/d/Warung Kerja 1.0/03_Active_Projects/_registry/projects.json`.
- `[ ]` **Frontend Audit:** Do a holistic sweep of the UI (Analytics, Office, Dashboard) to completely rip out the remaining hardcoded persona and prototype assumptions, replacing them with generic or live data.

## 🟡 Epic 3: Deployment Pipeline & CI (Current Focus)

**Goal:** Achieve a flawless "Zero-Error" autonomous release pipeline so updates can be shipped identically and safely.

- `[x]` Debug and fix 100% of workspace-level ESLint parsing issues breaking pre-commit hooks.
- `[x]` Ensure `turbo run build` caching is configured and completing successfully.
- `[ ]` **Release Hand-off Tuning:** Fix the `latest-ui-release-one-pass.sh` generation logic. The script execution is failing due to strict CI-gate assertions on the "Operator Brief", effectively blocking the UI from deploying.

## 🔴 Epic 4: Outstanding Core Modules (Next Up)

**Goal:** Build out the missing feature modules that were scoped for V2.

- `[ ]` **Memories Browser:** Visualization and search tools for querying long-term agent memory and context.
- `[ ]` **Office Visualization:** A virtual "layout" view showcasing live team presence, status, and active subagent workspaces.
- `[~]` **Collaboration Tools:** ~~Task tracking, backlog breakdown visuals, and active agent interplay interfaces.~~ **Deprioritised (2026-04-10).** Agent-to-agent and human-to-agent collaboration happens via external comms (not in-platform). The Collaboration tab will remain as a basic stub but will not be built out further.
- `[ ]` **Analytics Expansion:** Drive the Analytics page using deeply integrated real-world data tracking rather than synthesized test stats.

## 🔴 Epic 5: Advanced Real-time Integrations (Future)

**Goal:** Finalize the transformation of MC-V2 into a living "nervous system."

- `[ ]` **Live WebSockets:** Replace polling with fully reliable Socket.io push events for real-time notification of status shifts (e.g., when an agent finishes a task or goes OFFLINE).
- `[ ]` **Plugin Architecture:** (If applicable) Expose a plugin structure enabling other agents or tools to securely connect to Mission Control.
- `[ ]` **Legacy Migration:** Sunset and fully replace the V1.4 Data Bridge tools.

---

### Suggested Next Steps

If you want to focus on unblocking the final sprint to ship, we should dive immediately into **Epic 3 (Release Hand-off Tuning)**.
If you prefer expanding the foundation data, we should tackle the remaining items in **Epic 2 (Truth Alignment)**.
