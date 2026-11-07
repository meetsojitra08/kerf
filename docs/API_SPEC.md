# API Spec (REST + WebSocket)

Base: `/v1`. Auth: bearer JWT. Errors: `{code, message, details}`. Idempotency via `Idempotency-Key` header on POST.

## Assets & upload
| Method | Path | Purpose |
|---|---|---|
| POST | `/projects/{p}/assets/uploads` | start multipart; returns `upload_id`, `part_size`, presigned URLs |
| GET | `/assets/uploads/{id}` | parts completed (resume) |
| POST | `/assets/uploads/{id}/parts` | more presigned URLs |
| POST | `/assets/uploads/{id}/complete` | finalize, enqueue ingest |
| GET | `/assets/{id}` | status + index progress |
| GET | `/assets/{id}/transcript?from=&to=` | segments (paged) |
| GET | `/assets/{id}/scenes` | scenes |
| GET | `/projects/{p}/search?q=&mode=transcript\|visual\|hybrid` | search index |

## Timeline
| Method | Path | Purpose |
|---|---|---|
| GET | `/projects/{p}/timeline` | latest snapshot + revision |
| POST | `/projects/{p}/changesets` | commit `{base_revision, ops, origin}` → `{revision}` or `409 conflict` |
| GET | `/projects/{p}/changesets?after=` | op log |
| POST | `/projects/{p}/changesets/{c}/undo` | applies inverse as new changeset |
| GET/POST | `/projects/{p}/versions` | list / name a version |
| POST | `/projects/{p}/versions/{v}/restore` | restore as new changeset |

## Agent
| Method | Path | Purpose |
|---|---|---|
| POST | `/projects/{p}/agent/runs` | `{prompt, selection?, playhead?, reference_asset_id?}` → `run_id` (events stream on WS) |
| GET | `/agent/runs/{id}` | plan, status, preview diff |
| POST | `/agent/runs/{id}/accept` | `{steps: [ids]?}` commit selected steps |
| POST | `/agent/runs/{id}/reject` | discard |
| POST | `/agent/runs/{id}/refine` | follow-up prompt on same run |

## Render
| Method | Path | Purpose |
|---|---|---|
| POST | `/projects/{p}/renders` | `{revision?, preset, range?}` |
| GET | `/renders/{id}` | status, segments done, output URL (presigned) |
| DELETE | `/renders/{id}` | cancel |

## WebSocket `/v1/projects/{p}/ws`
Envelope `{v:1, type, ts, trace_id, data}`.
Server → client: `timeline.committed {revision, ops}`, `agent.step {run_id, step, status}`, `agent.ops {run_id, ops}`, `agent.preview {run_id, diff}`, `agent.needs_input`, `job.progress {job_id, stage, pct}`, `asset.ready_for_edit`, `asset.indexed`, `render.progress {render_id, segments_done, segments}`, `render.done`.
Client → server: `ping`, `presence`, `timeline.ops {base_revision, ops}` (optional low-latency path equal to POST changesets).
Reconnect: client sends `last_revision`; server replays missed commits or instructs full resync.
