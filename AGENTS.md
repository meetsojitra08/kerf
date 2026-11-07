# AGENTS.md: Kerf

You are working on Kerf, an AI-native video editor whose AI outputs **timeline operations, never final video**. Read `docs/TIMELINE_SPEC.md` before touching anything timeline-related. Read `docs/DESIGN_SYSTEM.md` before touching any UI.

## Non-negotiables
1. **The timeline is the product.** Every AI edit must be expressed as validated ops in `packages/schema`. No code path may have the LLM produce pixels, clip IDs it invented, or direct DB writes.
2. **Every mutation is invertible.** An op without a correct inverse does not ship. Undo of an agent changeset is one action.
3. **Server is authoritative; client is optimistic.** Ops carry `base_revision`. Rebase or reject, never silently merge.
4. **Two reducers, one truth.** `packages/timeline-core` (TS) and `apps/api/kerf/timeline` (Python) must both pass `fixtures/golden/*.json`. Change one, change both, update fixtures.
5. **Main thread stays free.** Timeline reducer, waveform decode, and search run in workers. A long task > 50 ms in the editor is a bug.
6. **Time is integer microseconds** (`us`) everywhere. Never floats for time. Snap to frames only at render and display.
7. **Never block on media.** Uploads, indexing, and rendering are async jobs with progress over WebSocket.
8. **No generic AI aesthetic.** No purple/blue gradients, sparkle icons, glassmorphism, centered hero chat, or default shadcn look. Follow the design system.
9. **Reference-style analysis extracts parameters (pace, caption style, grade stats, BPM), never copies assets.**

## Stack
React 18, TypeScript (strict), Vite, Zustand + Immer patches, Comlink workers, Canvas/WebGL timeline rendering. FastAPI, Pydantic v2, SQLAlchemy 2 + Alembic, PostgreSQL 16 + pgvector, Redis 7, arq workers, FFmpeg 7, S3-compatible storage (MinIO local), WebSockets. See ADRs in `docs/ARCHITECTURE.md` (note ADR-003 on BullMQ).

## Commit after every task
Commit each roadmap task **immediately** after its acceptance checks pass, one task per commit, using `/commit-task <id>`. Format: `feat(2.2): summary`. Never start the next task with uncommitted work. Full rules: `.agent/rules/05-commit-discipline.md`.

## Conventions
- TS: `strict`, no `any`, no default exports except route components, zod at boundaries. Python: type-hinted, `ruff` + `mypy --strict` on `kerf/timeline` and `kerf/agent`.
- Schema changes start in `packages/schema`, then run `pnpm codegen`. Never hand-edit generated files.
- Tests: Vitest (web, core), pytest (api, worker). Every op has: reducer test (TS), reducer test (Py), inverse round-trip property test, golden fixture.
- Commits: conventional commits. One roadmap task per PR. Update docs in the same PR when behavior changes.
- Logging: structured JSON, include `project_id`, `job_id`, `changeset_id`.
- Secrets only via env. Never commit keys. LLM/vision providers sit behind `kerf/ai/providers.py` interfaces so they are swappable and mockable.

## Definition of done
Task committed (`/commit-task`), tests green, golden fixtures pass in both languages, no new long tasks in the perf harness, UI reviewed with `/ui-review`, docs updated, inverse op verified.

## Working style for agents
Plan first in an artifact, list files you will touch, then implement in small verified steps. If a spec is ambiguous, propose the decision as an ADR entry rather than guessing. Never mark a roadmap item done without running its acceptance checks, and commit it right away.
