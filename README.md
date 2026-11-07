# Kerf

> Describe the edit. Keep the timeline.

**Kerf** is an AI-native video editor. You describe an edit in plain English ("tighten the first 15 seconds, remove repeated takes, add B-roll, give me three Shorts"). The agent does not return a black-box MP4. It emits **timeline operations** that mutate a real, multi-track, fully editable timeline. You watch the timeline change, accept or reject the change, undo it, and only then render.

*Name:* a kerf is the slot a saw leaves behind when it cuts. Every edit is a cut, and the name carries the "cut line" visual motif used across the UI. Alternates: **Cutlist**, **Splicewright**, **Tracksmith**, **Rushes** (see `docs/PRD.md` §Naming).

## The one-sentence architecture
`Prompt → context retrieval → edit plan → validated timeline ops → shadow-apply → diff preview → commit (versioned, invertible) → async chunked render`

## Repo layout (monorepo, pnpm + uv)
```
apps/web            React + TS + Vite. Editor UI. Timeline engine runs in a Web Worker.
apps/api            FastAPI. REST + WebSocket. Auth, projects, ops commit, agent orchestration.
services/worker     Python arq workers: ingest, index, render, export. FFmpeg lives here.
packages/timeline-core   TS reducer for ops (client). Golden fixtures shared with Python.
packages/schema     JSON Schema for timeline + ops (single source of truth, codegen to TS + Pydantic).
packages/ui         Design tokens + primitives (see docs/DESIGN_SYSTEM.md).
fixtures/           Golden op/state fixtures, sample media manifests.
docs/               Specs (read in order below).
.agent/             Antigravity rules, workflows, skills.
```

## Read in this order
1. `docs/PRD.md` product, scope, non-goals, naming
2. `docs/ARCHITECTURE.md` system, ADRs, stack decisions
3. `docs/TIMELINE_SPEC.md` **the core contract**: data model + operations + undo
4. `docs/AI_AGENT_SPEC.md` planner, tools, safety, eval
5. `docs/PIPELINES.md` upload, indexing, render
6. `docs/DATA_MODEL.md` Postgres schema
7. `docs/API_SPEC.md` REST + WS
8. `docs/DESIGN_SYSTEM.md` UI/UX direction and tokens
9. `docs/BENCHMARKS.md` what we measure and how
10. `docs/ROADMAP.md` phased, agent-sized tasks
11. `docs/DEMO_SCRIPT.md` the killer demo, shot by shot

## Quickstart (target)
```bash
pnpm i && uv sync
docker compose up -d postgres redis minio
pnpm dev            # web + api + worker via turbo
```

### Running Services & Arq Worker (Phase 1)
- **Redis, Postgres, and MinIO:**
  Run in Docker containers:
  ```bash
  docker compose up -d postgres redis minio
  ```
- **Arq Worker:**
  Run under WSL2 or containerized Linux for Phase 1 ingest and media processing (FFmpeg):
  ```bash
  # Native or WSL2 terminal:
  uv run arq kerf_worker.main.WorkerSettings
  # From Windows PowerShell invoking WSL2:
  wsl -e uv run arq kerf_worker.main.WorkerSettings
  ```
  The worker connects to Redis (`REDIS_URL=redis://localhost:6379/0`) and processes queued jobs from the API (`kerf.queue`). Enqueue health can be verified via `POST /health/worker-smoke`.

## Using Antigravity
Open the repo root. `AGENTS.md` and `.agent/rules/*` load automatically. Start with the `/bootstrap` workflow, then work through `docs/ROADMAP.md` one task at a time. Commit each task immediately after completing it with `/commit-task <id>`. Use `/new-op` for any new timeline operation and `/ui-review` before merging UI.
