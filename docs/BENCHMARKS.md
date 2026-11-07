# Benchmarks: measure it

Every number is reported with hardware, dataset, commit SHA, and p50/p95/p99. CI keeps a trend; regressions > 10% fail `/perf-check`.

## 1. 500+ timeline ops without blocking UI
- **Dataset:** `fixtures/perf/long-timeline.json` (400 clips, 12 tracks). Batches: 500, 2 000, 10 000 mixed ops (split, trim, move, ripple_delete, set_props, insert).
- **Metrics:** total apply time (worker), main-thread Long Tasks (PerformanceObserver `longtask`), input latency (INP) during apply, frames dropped during timeline scroll while applying, patch size.
- **Budgets:** 500 ops apply < 250 ms; zero main-thread tasks > 50 ms; INP p95 < 100 ms; canvas ≥ 55 fps during apply; memory growth < 20 MB.
- **Method:** Playwright + Chrome tracing; synthetic scroll/typing during batch; also headless `bench:ops` for reducer throughput (ops/s).
- **Report line:** "Applied 500 ops in X ms (p95 Y), 0 long tasks, INP p95 Z."

## 2. 3 hours raw footage indexed asynchronously
- **Dataset:** 3 h 1080p talking-head + B-roll mix, multi-speaker.
- **Metrics:** time-to-proxy (editable), time-to-transcript, time-to-fully-indexed, real-time factor (RTF = wall / media duration), per-stage throughput, cost per hour, % partial results available at 10/30/60 min, UI responsiveness during ingest.
- **Targets (N workers noted):** proxy < 8 min; transcript < 25 min; full index < 45 min on the reference worker pool; RTF < 0.25.
- **Method:** record per-chunk spans via OpenTelemetry; run with 1, 2, 4, 8 workers to show scaling curve.

## 3. N workers horizontal render scaling
- **Dataset:** 10-min 1080p timeline, 6 tracks, captions, B-roll; also a 60 s Short.
- **Metrics:** wall time vs workers (1,2,4,8,16), speedup and efficiency (speedup/N), CPU utilization, seam artifact check, output verification pass rate.
- **Target:** ≥ 0.7 efficiency up to 8 workers on 10-min timeline; Amdahl overhead breakdown (graph build, concat, mux, upload).
- Plot: speedup curve + stacked time by stage.

## 4. p95 track render & queue latency
- **Queue latency** = `started_at − enqueued_at` per queue; **track render latency** = per-segment run time and per-track composite time.
- **Load:** k6 / custom driver: 1, 10, 50, 100 concurrent projects submitting renders; mix of interactive (Shorts) and export.
- **Budgets:** interactive render queue wait p95 < 2 s at 50 concurrent; segment run p95 < 1.5× median; job failure rate < 0.5% with auto-retry.
- Export Prometheus histograms: `kerf_queue_wait_seconds{queue}`, `kerf_job_run_seconds{type}`, `kerf_render_segment_seconds`.

## 5. AI quality and cost (secondary)
Plan validity rate, task success, time-to-preview (prompt → first ghost clip < 3 s, → full preview < 20 s on 1 h footage), cost per changeset.

## Harness layout
`bench/ops`, `bench/index`, `bench/render`, `bench/load`. Results to `bench/results/<sha>.json`; a small page in the app (`/internal/perf`) charts trends. A README table in the repo root is auto-updated from the latest run (these are the numbers to put in the video and resume).
