# Architecture

```
Browser (React/TS)
 ├─ UI thread: shell, panels, canvas timeline painter, preview compositor
 ├─ Timeline Worker: reducer, op queue, interval index, undo stack (Comlink)
 ├─ Media Worker: peaks, thumbnails sprites, search over local transcript index
 └─ WS client ←→ API
FastAPI (apps/api)
 ├─ REST: projects, assets, timeline, changesets, renders
 ├─ WS: op broadcast, job progress, agent streaming
 ├─ Timeline service (authoritative reducer, rebase, versioning)
 ├─ Agent service (retrieve → plan → compile → shadow-apply)
 └─ enqueues jobs → Redis
Workers (services/worker, arq)
 ├─ ingest: probe, proxy, audio extract, peaks, sprites
 ├─ index: ASR+diarization, scenes, vision captions, embeddings
 ├─ render: chunk render, concat, mux
 └─ gen: generative media jobs
Postgres 16 (+pgvector) · Redis 7 (queues, pubsub, locks) · S3/MinIO (media, proxies, renders)
```

## Key flows
1. **Upload** → presigned multipart (S3) with a client-side resumable manifest → `asset.created` → ingest job.
2. **Ingest** produces a playable proxy within minutes; indexing runs in parallel and streams partial results (transcript segments appear as ready).
3. **Edit** → ops to Timeline Worker (instant, optimistic) → batched to API with `base_revision` → ack with canonical revision or rebase.
4. **Agent** → API retrieves context, LLM emits plan, compiler emits ops, shadow-apply validates → client receives a **Changeset (pending)** and shows ghost clips → user accepts → ops commit as one group.
5. **Render** → timeline revision pinned → render graph → chunks fan out to N workers → concat → upload → WS notifies.

## ADRs

**ADR-001 Time representation.** Integer microseconds. Rational frame rates handled at render. Avoids float drift and reducer divergence.

**ADR-002 Two reducers with golden fixtures.** Client needs instant optimism; server must be authoritative. Both implement the same ops; `fixtures/golden` is the contract; CI fails on divergence. Alternative (run TS reducer server-side) rejected to keep API Python-native and avoid a Node dependency in the hot path.

**ADR-003 Queue: arq instead of BullMQ (decision needed).** BullMQ is Node-only; FastAPI cannot enqueue to it cleanly. Options: (A) **arq** (Redis, async, Python): recommended, one language for workers/FFmpeg/ML. (B) BullMQ with a small Node "jobs gateway" that FastAPI calls over HTTP: keeps BullMQ's dashboard/flows but adds a service and a hop. Default = A. If you want BullMQ on the resume, take B and keep gateway ≤ 200 LOC. Job semantics below are queue-agnostic.

**ADR-004 Ops, not states, are the unit of sync.** Op log is append-only per project; snapshots every 200 ops or 5 min. Enables undo, version history, agent audit, and later CRDT/OT.

**ADR-005 Preview uses proxies composited client-side** (WebCodecs/`<video>` + canvas), not server-rendered preview. Final render uses originals through FFmpeg. A "preview parity test" compares frames from both on fixtures.

**ADR-006 Chunked render.** Render graph split into GOP-aligned segments (default 10 s), rendered in parallel, concatenated losslessly where codec params match; audio mixed in one pass for continuity.

**ADR-007 Provider interfaces.** `ASRProvider`, `VisionProvider`, `LLMProvider`, `EmbeddingProvider`, `GenMediaProvider`, `StockProvider`. Everything mockable for tests/evals.

**ADR-008 Realtime.** WebSocket per project, Redis pub/sub fan-out across API instances. Messages are versioned envelopes.

**ADR-009 Search.** pgvector for visual/transcript embeddings; Postgres FTS for lexical transcript search; hybrid rerank in the agent retrieval step.

**ADR-010 Observability.** OpenTelemetry traces (API→queue→worker propagate `trace_id`), Prometheus metrics, structured logs. Needed to produce the benchmark numbers honestly.

**ADR-011 Development object storage (MinIO distribution and CORS).**
- *Context:* Browser-originated multipart uploads require an S3-compatible store with strict CORS compliance (exposing `ETag` on `PUT` requests, supporting `OPTIONS` preflight, and accepting multi-part assemblies). Docker Hub deprecated unauthenticated public pulls for `minio/minio` and `minio/mc`.
- *Alternatives evaluated:*
  - (A) LocalStack: Feature-complete AWS emulator, but heavier resource footprint, slower cold start in CI, and overkill for S3-only local storage.
  - (B) Moto / fake-s3 / filesystem mock: Inadequate fidelity for browser-originated presigned multipart uploads and CORS header propagation.
  - (C) Pinned GHCR MinIO distribution (`ghcr.io/coollabsio/minio` by SHA-256 digest) with bundled `mc` client: Fast, lightweight, zero-credential public pull, exact S3 multipart API parity.
- *Decision:* Option C. The local development environment uses `ghcr.io/coollabsio/minio@sha256:69b55a1c1c5dc285ce04db96689f5b2102317fc77a50680a1874ca6efd1c87f9` with auto-provisioned bucket `kerf-media` and verified CORS exposition (`ETag` exposed in `Access-Control-Expose-Headers`, `PUT` in `Access-Control-Allow-Methods`, configured via `MINIO_API_CORS_ALLOW_ORIGIN`).

## Scaling notes
- API stateless; sticky not required (Redis pub/sub).
- Workers scale horizontally by queue; separate queues: `ingest`, `index`, `render`, `gen`. GPU optional for ASR/vision.
- Idempotency keys on every job (`asset_id+stage+version`) so retries are safe.
- Large objects never pass through API (presigned URLs both ways).

## Infrastructure & Distribution Notes
- **MinIO Distribution & Digest Pinning (TODO)**: Docker Hub deprecated unauthenticated public pulls for `minio/minio` and `minio/mc`. The local development image is pinned by immutable digest to `ghcr.io/coollabsio/minio@sha256:69b55a1c1c5dc285ce04db96689f5b2102317fc77a50680a1874ca6efd1c87f9` in `docker-compose.yml`. No `:latest` tags are permitted. `minio-init` executes `/usr/bin/mc` from this pinned image to auto-provision the `kerf-media` bucket. TODO: Migrate to official upstream pinned release tag once public access or org registry mirrors are finalized.

