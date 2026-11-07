# Pipelines: upload, indexing, render

## 1. Resumable upload
- Client splits file into **8-16 MiB parts**, 4-6 parallel, using S3 multipart with presigned part URLs from `POST /assets/uploads`.
- Client persists `{upload_id, part_etags[], file_fingerprint}` in IndexedDB. On reload/offline, it calls `GET /assets/uploads/{id}` to reconcile parts already stored, then continues.
- Fingerprint = size + mtime + SHA-256 of first/last 1 MiB (fast); full checksum verified server-side after complete.
- Per-part retry with exponential backoff + jitter; adaptive concurrency on throughput.
- `POST /assets/uploads/{id}/complete` → creates `asset`, enqueues `ingest`.
- UX: global upload tray, per-file pause/resume, speed and ETA, survives navigation.

## 2. Ingest (queue `ingest`)
1. `ffprobe` → streams, duration, fps, codecs. Reject unsupported with a clear reason.
2. **Proxy** 960×540 H.264, all-intra-ish short GOP (1 s) for scrubbing, + 128 kbps AAC. Priority job: user can start editing when this lands.
3. Audio extract → 16 kHz mono WAV for ASR; 48 kHz stereo kept for mix.
4. **Peaks** (waveform JSON/binary at multiple zoom levels), **thumbnail sprite** every 1 s (low-res), poster frame.
5. Emit `asset.ready_for_edit` over WS.

## 3. Index (queue `index`), parallel to editing
Target: **3 h raw footage indexed asynchronously**, partial results stream in.
- **Chunking:** split audio into ~5 min windows with 5 s overlap; stitch via overlap alignment. Chunks are independent jobs (parallel across workers).
- **ASR:** word-level timestamps, language detect, punctuation. **Diarization:** speaker turns + embeddings; map to named speakers on user confirmation.
- **Scenes:** shot-boundary detection (content/adaptive threshold) on proxy; per scene: keyframes (1-3).
- **Visual understanding:** vision model captions keyframes (what, who, setting, on-screen text, shot type); batch and cache.
- **Audio events:** silence, music, applause, loudness curve, clipping.
- **Embeddings:** transcript segments (sentence-level) and keyframes → pgvector. FTS index for lexical search.
- **Derived:** repeated-span candidates, filler map, highlight candidates (cheap pre-score), chapters (lazy, on demand).
- Stage order by value: transcript first (unlocks most agent features), then scenes, then vision.
- Idempotent per `(asset, stage, model_version)`. Progress events `index.progress {stage, pct}`.

## 4. Render (queue `render`)
1. **Pin** timeline revision; build **render graph** (tracks → layers, effects, audio mix graph, caption raster/ASS).
2. **Segment** at GOP-aligned boundaries (default 10 s; shorter near transitions so a transition never straddles a seam).
3. **Fan-out**: each segment = one job using original media (seek with `-ss` before `-i` + accurate trim), output intermediate (mezzanine H.264 CRF 14 or ProRes optional) with identical encode params.
4. **Audio** mixed once for the whole timeline (loudnorm, ducking, effects) to avoid seam artifacts, then muxed.
5. **Concat** segments (concat demuxer, stream copy), final encode only if preset requires (e.g. target bitrate), mux, upload, finalize.
6. Retry per segment with idempotency key; job heartbeats; stuck jobs reclaimed.
7. Presets: `master-1080p`, `web-1080p`, `shorts-1080x1920`, `square-1080`, `draft-540p`.
8. Captions burned via ASS/libass for fidelity (or soft sub option).
9. Output verification: duration match ±1 frame, audio sync check, black-frame/silence detector.

## Queues and priorities
`ingest` (high: proxy), `index`, `render` (interactive > export), `gen`. Per-project concurrency caps. Autoscale on queue depth and oldest-job age.

## Job envelope
```json
{ "job_id":"", "type":"render.segment", "project_id":"", "idempotency_key":"", "trace_id":"",
  "attempt":1, "payload":{...}, "enqueued_at":"" }
```
Metrics per job: `queue_wait_ms`, `run_ms`, `bytes_in/out`, `attempts`.
