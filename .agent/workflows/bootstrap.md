# /bootstrap
1. Read `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`.
2. Scaffold the monorepo per README layout (pnpm workspaces, turbo, uv).
3. Add `docker-compose.yml` (postgres+pgvector, redis, minio) and `.env.example`.
4. Create `packages/schema` with timeline + op JSON Schemas; wire `pnpm codegen` to TS and Pydantic.
5. Add CI: lint, typecheck, vitest, pytest, golden-fixture parity job.
6. Open an artifact summarizing what exists; mark ROADMAP Phase 0 items done only if checks pass.
7. Run `/commit-task` to commit this work immediately.
