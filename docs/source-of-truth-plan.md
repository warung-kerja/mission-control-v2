# Mission Control V2 - Source of Truth Plan

## Goal
Make Mission Control V2 production-ready by separating:
1. canonical static truth
2. live runtime state
3. derived dashboard view models

## Recommended canonical sources

### Team roster
Primary source:
- `/mnt/d/Warung Kerja 1.0/06_Agents/_Shared_Memory/AGENTS_ROSTER.md`

Purpose:
- names
- roles
- reporting relationships
- model assignments
- subagent grouping

### Projects registry
Recommended new primary source:
- `/mnt/d/Warung Kerja 1.0/03_Active_Projects/_registry/projects.json`

Temporary bootstrap inside repo:
- `docs/projects.registry.bootstrap.json`

Purpose:
- project name
- owner
- priority
- current phase
- status
- next step
- updatedAt

### Runtime state
Primary source:
- OpenClaw session/runtime status data

Purpose:
- current activity
- recent work
- live execution state
- presence / recency

### Memory context
Primary sources:
- `memory/*.md`
- project `MEMORY.md`

Purpose:
- historical context
- important decisions
- project summaries

## Architecture direction
Mission Control V2 should:
- ingest canonical sources
- normalize them in the API layer
- expose clean UI-facing models
- avoid treating seed/demo data as production truth

## Implementation order
1. Add project registry file and schema
2. Add API adapters for canonical team roster + project registry
3. Keep runtime state separate from static canonical truth
4. Update frontend to consume normalized API models only
5. Reduce seed data usage to local dev bootstrap only

## Current implementation progress
- Added in-repo bootstrap project registry: `docs/projects.registry.bootstrap.json`
- Added API-side canonical source path helper: `apps/api/src/lib/canonicalSources.ts`

## Production-ready principle
Seed data should help local setup only.
It should not be the long-term source of truth for the dashboard.
