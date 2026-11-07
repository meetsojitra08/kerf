# /perf-check
1. Run `pnpm bench:ops` (500, 2 000, 10 000 op batches on a 400-clip timeline).
2. Run a Playwright trace on the editor with `fixtures/perf/long-timeline.json`; collect Long Tasks.
3. Compare against budgets in `docs/BENCHMARKS.md`; fail on > 10% regression.
4. Post a table (metric, budget, actual, delta) as an artifact.
