# /ship-agent-feature
1. Write the eval cases first in `evals/agent/` (prompt, footage fixture, assertions on resulting timeline).
2. Implement planner prompt/tool changes.
3. Run `uv run python -m kerf.evals --suite agent`; require no regression in validity rate and task-success score.
4. Confirm changeset preview, accept, reject, and one-click undo all work in the UI.
5. Record trace links in the PR.
6. Run `/commit-task` to commit this work immediately.
