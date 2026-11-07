# Roadmap: agent-sized tasks

Each task = one commit (and PR), with acceptance checks. Work top-down.

**Commit rule:** commit each task immediately after completing it (`/commit-task <id>`), message `feat(<id>): summary`, then tick its checkbox. Never begin the next task with uncommitted work. See `.agent/rules/05-commit-discipline.md`.

## Phase 0: Foundations
- [x] 0.1 Monorepo scaffold, compose (postgres+pgvector, redis, minio), CI. *AC: `pnpm dev` boots all; CI green.*
- [x] 0.2 `packages/schema` + codegen (TS + Pydantic). *AC: schema change regenerates both.*
- [x] 0.3 Auth (simple email/JWT), project CRUD. *AC: e2e create project.*
- [ ] 0.4 Design tokens + shell layout (empty panels, correct resize/collapse). *AC: `/ui-review` pass.*

## Phase 1: Upload and ingest
- [ ] 1.1 Multipart resumable upload (API + client + IndexedDB). *AC: kill tab mid-upload, resume completes; 5 GB file ok.*
- [ ] 1.2 Ingest worker: probe, proxy, peaks, sprites. *AC: proxy playable < real-time/10.*
- [ ] 1.3 WS channel + job progress + upload tray UI.

## Phase 2: Timeline engine (the core)
- [ ] 2.1 Data model + invariants (TS and Py) + golden fixture runner.
- [ ] 2.2 Core ops: insert/remove/move/trim/split/merge/ripple_delete_range + inverses.
- [ ] 2.3 Timeline Worker (Comlink), patches, interval index. *AC: 500 ops < 250 ms.*
- [ ] 2.4 Canvas timeline renderer (virtualized), playhead, snapping, selection.
- [ ] 2.5 Preview compositor (proxy-based) + transport + audio playback sync.
- [ ] 2.6 Commit/rebase API, op log, snapshots, undo/redo, versions.
- [ ] 2.7 Keyframes, effects, transitions, markers.

## Phase 3: Indexing
- [ ] 3.1 ASR + diarization chunked pipeline, partial streaming.
- [ ] 3.2 Scene detection + vision captions + embeddings.
- [ ] 3.3 Transcript panel (text-as-timeline editing), search (hybrid).
- [ ] 3.4 Index benchmark on 3 h dataset.

## Phase 4: Agent
- [ ] 4.1 Provider interfaces + mocks + eval harness.
- [ ] 4.2 Retrieval + handle system + plan schema + compiler skeleton.
- [ ] 4.3 `tighten` analyzer → ops. *AC: eval suite tighten ≥ 95% success.*
- [ ] 4.4 `dedupe_takes` analyzer. *AC: synthetic repeated-take fixtures resolved ≥ 90%.*
- [ ] 4.5 Shadow apply, changeset preview, ghost-clip UI, accept/reject/partial, agent undo.
- [ ] 4.6 B-roll matching + stock/gen providers + `insert_generated_clip` flow.
- [ ] 4.7 Highlights, chapters, hook detection.
- [ ] 4.8 Short extraction + 9:16 reframing + captions.
- [ ] 4.9 Reference-style analysis (`StyleProfile`) wired to analyzers.
- [ ] 4.10 Streaming agent events + cut-line animation polish.

## Phase 5: Layers
- [ ] 5.1 Caption track generation + styles + word highlight.
- [ ] 5.2 Audio cleanup (denoise, loudnorm, silence), music track + ducking.

## Phase 6: Render
- [ ] 6.1 Render graph builder + segmenting. 
- [ ] 6.2 Segment workers, concat, audio mix, mux, verify.
- [ ] 6.3 Render UI (segment tiles per worker), presets, cancel/retry.
- [ ] 6.4 Preview/render parity tests.

## Phase 7: Measure and ship
- [ ] 7.1 Benchmark harness (`bench/*`), OTel + Prometheus + dashboards.
- [ ] 7.2 Scaling runs (workers 1..16), load test queue latency.
- [ ] 7.3 Polish pass on signature moments, accessibility audit.
- [ ] 7.4 Demo project fixture + script rehearsal; README numbers.

## Cut lines if time-boxed
Keep: upload, timeline engine, tighten + dedupe + B-roll + Shorts, versioning/undo, render, benchmarks. Defer: reference-style, generative video, light theme, co-editing.
