---
trigger: always_on
---
# Commit discipline: commit each task immediately after completing it

- **One roadmap task = one commit (or a tight series on one branch), made the moment its acceptance checks pass.** Never start the next task with uncommitted work.
- Before committing: run lint, typecheck, unit tests, and golden fixtures; run `/perf-check` if the task touches `timeline-core`, the canvas renderer, or WS handlers.
- Commit message format (Conventional Commits), with the roadmap ID in the scope:
  `feat(2.2): add split_clip and merge_clips with inverses`
  Body: what changed, why, acceptance checks run and results. Footer: `Refs: docs/ROADMAP.md#2.2`.
- Types: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `chore`, `ci`.
- Stage only files that belong to the task (`git add -p` or explicit paths). No drive-by changes; put those in their own commit.
- Generated files (codegen output) are committed in the same commit as the schema change that produced them.
- After committing, tick the task's checkbox in `docs/ROADMAP.md` in a follow-up `docs(<id>): mark done` commit, or in the same commit if the checks passed.
- If checks fail, do not commit as done. Either fix, or commit as `wip(<id>)` on a feature branch and say so.
- Never rewrite or force-push shared history. Never commit secrets, `.env`, or media fixtures over 5 MB (use Git LFS).
- Branching: `main` is always green. Work on `task/<id>-<slug>`; merge after the commit passes CI.
