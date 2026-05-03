# Mission Control V3

A live control room for Raz's OpenClaw agent system — one place to see what exists, what is running, what is scheduled, what matters now, and what needs attention.

**Status:** Active development on `v3-control-room-reset`  
**GitHub:** https://github.com/warung-kerja/mission-control-v2  
**Local path:** `D:\Warung Kerja 1.0\03_Active_Projects\Mission Control\mission-control-v2`

---

## What It Is

Mission Control answers one question: **"What is my AI crew doing, what matters today, and what should move next?"**

It's not a generic project management dashboard. It's a personal operator console wired directly to real workspace data — canonical agent rosters, project registries, live cron jobs, memory files, and runtime signals.

## Product Principles

1. **Truth over decoration** — every panel reflects canonical truth, runtime truth, or an explicit fallback state
2. **No mock data** — uses real OpenClaw/workspace data from day one
3. **Each screen answers one question** — Tasks, Calendar, Projects, Memory, Team each have a clear job
4. **Status is obvious** — live, stale, missing, disabled, blocked, and healthy states are visually distinct
5. **Smaller truthful dashboard > broader fake one**

## Core Screens (V3)

### Control Room (`/`)
The home surface. Answers: *What is live, what needs attention, and what should move next?* — aggregates canonical source health, project momentum, cron pulse, and crew snapshot into one scan.

### Tasks — Execution Board (`/tasks`)
Answers: *What should move next and is automation healthy?* Three truth layers:
- **Project movement board** — every canonical project's `nextStep` ranked by urgency (Move now / Keep moving / Check on this)
- **Automation pulse** — live cron status from OpenClaw runtime
- **Crew lineup** — canonical agent roster grouped by reporting structure

### Calendar — Automation Audit (`/calendar`)
Answers: *What is scheduled and is it healthy?* — live cron jobs with name, schedule, status, last run, duration, and error visibility. Recurring vs one-shot vs disabled are visually distinct.

### Projects — Movement Board (`/projects`)
Answers: *Which project should move next?* — canonical project registry surfaced with status, priority, current phase, next step, team, owner, and staleness indicators.

### Memory Vault (`/memories`)
Answers: *What do we already know?* — canonical shared memory files (AGENTS_ROSTER.md, USER.md, Business_Plans, etc.) as a browsable, searchable surface.

### Team (`/team`)
Answers: *Who exists in the system and how are they organised?* — crew structure from the canonical roster, with drift detection against the expected org chart.

### Office (`/office`)
Answers: *Who is active right now and what are they doing?* — runtime presence and activity, with real-time WebSocket updates.

### Collaboration — Coordination Watch (`/collaboration`)
Answers: *Who looks live, what moved recently, and which project lanes are active?* — read-only coordination surface using canonical projects, crew, and runtime presence.

### Signals (`/analytics`)
Answers: *What patterns are worth noticing without losing truth?* — analytics-style visibility backed by canonical/runtime data.

---

## Data Sources (Real, Not Mock)

- `/mnt/d/Warung Kerja 1.0/06_Agents/_Shared_Memory/AGENTS_ROSTER.md` — canonical team roster
- `/mnt/d/Warung Kerja 1.0/03_Active_Projects/_registry/projects.json` — canonical project registry
- OpenClaw cron/runtime API — live automation status
- Workspace memory files (`MEMORY.md`, `memory/YYYY-MM-DD.md`, `USER.md`, etc.)

When a surface can't be fully truthful, it shows an explicit fallback state and labels what's missing — it never implies certainty the system doesn't have.

---

## Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS
- **Data Fetching:** TanStack Query + Axios
- **Routing:** React Router v6
- **Icons:** Lucide React
- **Real-time:** Socket.io (WebSocket client)

### Backend
- **Runtime:** Node.js 20+ + TypeScript
- **Framework:** Express.js
- **Database:** SQLite (Prisma ORM) — used for auth only; core data is file-system/canonical
- **Real-time:** Socket.io
- **Auth:** JWT

### Development
- **Monorepo:** Turborepo
- **Linting:** ESLint
- **Type Checking:** TypeScript strict
- **Testing:** Vitest

---

## Project Structure

```
mission-control-v2/
├── apps/
│   ├── web/                 # React frontend
│   │   └── src/
│   │       ├── components/  # Layout (shell, nav), shared UI
│   │       ├── features/    # Feature modules (one per screen)
│   │       ├── hooks/       # Custom React hooks (canonical, system, presence)
│   │       └── services/    # API client (canonical, system, auth)
│   └── api/                 # Express backend
│       └── src/
│           ├── routes/      # API routes (canonical, system, auth, tasks, etc.)
│           ├── lib/         # Canonical source parsers, OpenClaw client
│           └── middleware/  # Auth middleware
├── packages/
│   ├── shared-types/        # Common TypeScript types
│   ├── ui-components/       # Shared component library
│   └── eslint-config/       # Shared ESLint config
└── docs/                    # Project documentation, epics, handoff notes
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- npm 10+

### Setup

```bash
# Install dependencies
npm install

# Start dev servers (frontend + backend)
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3001

---

## Validation Gates

Every commit on `v3-control-room-reset` passes:

```bash
npm run lint       # ESLint — zero warnings
npm run type-check # TypeScript strict — no errors
npm run build      # Full Turborepo production build
```

---

## Working Branch: `v3-control-room-reset`

All V3 work ships as bounded, validated commits on this branch. The `main` branch holds the last stable V2 state. V3 will be merged to `main` when the control-room reset is complete.

### Recent Commits (all validated clean)

| Commit | Description |
|--------|-------------|
| `888d9a7` | feat: rebuild tasks as execution visibility board |
| `d9cd998` | chore: add shell metadata for v3 routes |
| `40b56f6` | chore: mark legacy v2 surfaces in shell |
| `2a7d600` | chore: point dashboard route to v3 control room |
| `3514cbd` | chore: align v3 shell labels |
| `c3f7fd8` | feat: refocus collaboration around coordination watch |
| `8d774db` | feat: add v3 signals view |
| `452a744` | feat: add v3 memory vault |
| `715407e` | feat: add v3 control room home |
| `b0a6053` | feat: refocus projects around next moves |
| `903fa6f` | feat: turn calendar into automation audit |
| `baf725e` | feat: reset mission control shell for v3 |

---

## Org Structure

```
Raz (human)
├── Baro (Creative Lead) — Kimi 2.6 (Ollama)
│   └── Haji (Creative) — Kimi 2.6 (Ollama)
├── Noona (Tech Lead) — GPT-5.4 (OpenAI Codex)
│   └── Jen (Coding) — Gemma 4 31B (Ollama)
└── Obey (Agent) — GLM 5.1 (Ollama)

Ecosystem: Bob (Research), SOBA-1 (Ops)
```

---

## License

MIT
