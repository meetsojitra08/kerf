# Timeline Spec (core contract)

All time values are integer **microseconds (us)**. All IDs are ULIDs.

## Entities
```ts
Timeline { id, project_id, revision: int, fps: {num,den}, resolution: {w,h}, sample_rate,
           tracks: Track[], markers: Marker[], meta }
Track    { id, kind: 'video'|'audio'|'caption'|'overlay'|'music', name, order, locked, muted, solo,
           height?, clips: Clip[] }                 // clips sorted by start, non-overlapping unless transition
Clip     { id, track_id, asset_id|null, start, duration,        // position on timeline
           source_in, source_out,                               // range in asset (null for generated/text)
           speed=1, enabled=true, label?, tags?: string[],
           transform?: Transform, audio?: AudioProps, effects: Effect[],
           caption?: CaptionProps, provenance?: Provenance, link_group?: id }
Transition { id, between: [clip_id, clip_id], kind, duration, easing }
Keyframe { property_path, t (clip-relative us), value, easing }
Marker { id, t, kind: 'chapter'|'hook'|'highlight'|'note', label, source: 'user'|'agent' }
Changeset { id, project_id, origin: 'user'|'agent'|'system', base_revision, ops: Op[],
            summary, plan_id?, status: 'pending'|'committed'|'rejected'|'undone', created_at }
```
`link_group` ties A/V pairs so move/trim/split act on both.

## Op envelope
```ts
Op { op: string, id: ULID, params: object, ripple?: 'none'|'track'|'all_tracks' }
```
Every op has: **preconditions** (validated), **effects** (reducer), **inverse** (computed during apply, captured state).

## Op catalog (v1)
| Op | Params | Notes |
|---|---|---|
| `add_track` | kind, name, index | |
| `remove_track` | track_id | inverse restores clips |
| `reorder_track` | track_id, index | |
| `set_track_props` | track_id, patch | mute/solo/lock/name |
| `insert_clip` | track_id, asset_id, start, source_in, source_out, link? | `ripple` shifts later clips |
| `remove_clip` | clip_id | `ripple` closes gap |
| `move_clip` | clip_id, to_track_id, start | collision check |
| `trim_clip` | clip_id, edge:'in'\|'out', delta | |
| `split_clip` | clip_id, at | produces two clips, deterministic new ID for right side from op id |
| `merge_clips` | left_id, right_id | inverse of split |
| `ripple_delete_range` | track_ids, start, end | cuts across tracks, closes gap |
| `set_clip_props` | clip_id, patch | speed, enabled, label, transform base |
| `set_keyframes` | clip_id, property_path, keyframes | replace set |
| `add_effect` / `remove_effect` / `set_effect_params` | clip_id, effect | e.g. denoise, loudnorm, crop, blur |
| `set_transition` / `remove_transition` | between, kind, duration | |
| `add_caption_track_from_transcript` | asset_id, style_id, range? | generates caption clips |
| `edit_caption_clip` | clip_id, text, words? | |
| `add_marker` / `remove_marker` / `move_marker` | | |
| `insert_generated_clip` | track_id, start, duration, gen_job_id | placeholder until media ready |
| `replace_clip_asset` | clip_id, asset_id, source_in | swap B-roll option |
| `set_music_ducking` | music_track_id, under_track_ids, depth_db, attack_ms, release_ms | |
| `group_ops_marker` | label | no-op boundary for UI grouping |

Adding an op: use `/new-op`.

## Invariants (validated every apply)
1. Clips on a track do not overlap (except inside a transition span).
2. `0 ≤ source_in < source_out ≤ asset.duration`; `duration == (source_out - source_in)/speed` (rounded, deterministic).
3. Track `clips` sorted by `start`.
4. Linked clips keep identical `start` and `duration` unless unlinked.
5. Caption clips lie within the timeline duration.
6. Revision increments by exactly 1 per committed changeset.

## Concurrency and rebase
Client sends `{base_revision, ops}`. If `base_revision == server.revision` commit. Otherwise server tries **rebase**: transform ops against intervening committed ops using clip-ID addressing (ID-addressed ops rarely conflict). Time-addressed ops (`ripple_delete_range`) are re-resolved by ID anchors. Unresolvable conflict → reject with `conflict` and the client reconciles. (Single-user v1 conflicts mostly arise between a user edit and a pending agent changeset.)

## Undo / history
- Local undo stack = changesets (user ops grouped by gesture, ≤ 400 ms coalescing for drags).
- **Agent changeset = one undo step.** Undo applies the stored inverse list in reverse.
- Server history: append-only `ops` + `snapshots` every 200 ops. "Restore version X" = new changeset (non-destructive).
- Named versions: label + pointer to revision. Branch-from-version creates a new project timeline copy.

## Shadow apply (agent preview)
Server applies agent ops on a copy → validates → returns `ChangesetPreview { ops, diff }`. `diff` = `{added_clips, removed_clips, moved_clips, trimmed_clips, duration_delta, per_track}`. UI renders ghost clips from `diff`. Accept = commit same ops with the same `base_revision` (or rebase).

## Performance requirements
- Per-track interval tree for O(log n) overlap checks; ops apply in O(k log n).
- Batch apply 500 ops < 250 ms on 400-clip timeline; emit **one** patch set to the UI per batch.
- Reducer is pure, side-effect free, and has no DOM or time dependencies.

## Golden fixtures
`fixtures/golden/<op>/<case>.json`:
```json
{ "before": {...timeline...}, "ops": [...], "after": {...}, "inverse_after": {...equals before...}, "error": null }
```
Include error cases (expected error code). Both reducers must match byte-for-byte after canonical JSON serialization (sorted keys, integer us).
