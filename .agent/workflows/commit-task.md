# /commit-task <roadmap-id>
1. Re-read the task's acceptance criteria in `docs/ROADMAP.md`.
2. Run: `pnpm lint && pnpm typecheck && pnpm test && uv run ruff check && uv run mypy && uv run pytest`. Run golden-fixture parity if timeline code changed. Run `/perf-check` if perf-sensitive.
3. Review `git status` and `git diff`; confirm only task-related files are staged.
4. Commit: `<type>(<id>): <summary>` with body listing checks run and results, footer `Refs: docs/ROADMAP.md#<id>`.
5. Tick the checkbox in `docs/ROADMAP.md` and commit `docs(<id>): mark done` (or include it in step 4).
6. Report the commit hash and move to the next task only after this succeeds.
