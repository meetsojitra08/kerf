# /new-op <op_name>
1. Add op to `packages/schema/ops/<op_name>.json` (params, preconditions, effects).
2. `pnpm codegen`.
3. Implement TS reducer + inverse in `packages/timeline-core/src/ops/<op_name>.ts`.
4. Implement Py reducer + inverse in `apps/api/kerf/timeline/ops/<op_name>.py`.
5. Add golden fixture(s) in `fixtures/golden/<op_name>/` (before, ops, after, inverse-after).
6. Add property test: apply then inverse equals identity on random timelines.
7. Register the op in the agent tool catalog (`docs/TIMELINE_SPEC.md` §Op catalog and `docs/AI_AGENT_SPEC.md`).
8. Run `pnpm test && uv run pytest -k golden` and `/perf-check` with a 500-op batch including this op.
9. Run `/commit-task` to commit this work immediately.
