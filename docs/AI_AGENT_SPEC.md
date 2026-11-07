# AI Agent Spec

## Pipeline
```
User prompt + selection + playhead
   → 1 Intent parse (structured: goal, scope range, constraints, deliverables)
   → 2 Context retrieval (transcript, scenes, speakers, timeline summary, assets)
   → 3 Plan (LLM → Plan JSON: ordered steps with rationale and target handles)
   → 4 Compile (deterministic: steps → ops, resolves handles, uses analyzers)
   → 5 Shadow apply + validate (repair loop ≤ 2 tries)
   → 6 Changeset preview (diff, rationale per step, confidence)
   → 7 User accept / partial accept / reject / refine
```
The LLM never emits raw ops for clips it has not seen. It emits **steps** referencing **handles**; the compiler and deterministic analyzers produce ops.

## Handles
`@clip:<n>`, `@seg:<id>` (transcript segment), `@scene:<id>`, `@range:<start>-<end>`, `@marker:<id>`, `@asset:<id>`. Context given to the LLM is a compact table keyed by handles, not full JSON.

## Plan schema (abridged)
```json
{ "intent": "tighten_intro|remove_repeats|add_broll|make_shorts|chapters|style_match|cleanup_audio|...",
  "steps": [
    { "id":"s1","action":"remove_silence","target":"@range:0-15000000","params":{"max_pause_ms":350},"why":"..." },
    { "id":"s2","action":"dedupe_takes","target":"@asset:A1","params":{"keep":"best"},"why":"..." },
    { "id":"s3","action":"insert_broll","target":"@seg:t_41","params":{"query":"barista pouring latte","dur_ms":3500},"why":"..." },
    { "id":"s4","action":"extract_short","params":{"count":3,"max_s":45,"aspect":"9:16","captions":true},"why":"..." } ],
  "needs_confirmation": false }
```

## Deterministic analyzers (do the precise work; LLM does the judgment)
| Analyzer | Method |
|---|---|
| `tighten` | Word-timestamp gaps, filler detection (um/uh/like + audio energy), pause shortening to target; cut on zero-crossings/word boundaries with 40-80 ms handles |
| `dedupe_takes` | Sentence segmentation → embeddings + normalized edit distance → cluster near-duplicate spans within a sliding window; choose best by: completeness (reaches end of sentence), fluency (fewer fillers/false starts), audio quality (SNR, clipping), recency bias (later take wins ties) |
| `broll_match` | Transcript segment → noun/visual query → library search (embedding) + generative fallback; place over talking-head with J/L-cut overlap, avoid covering key on-screen text/face when speaker emphasis detected |
| `highlights` | Score windows by: hook strength (question/claim/number in first 3 s), emotional/energy peaks (audio), topic completeness, speaker change density, LLM rubric; return top-K non-overlapping with start/end snapped to sentence boundaries |
| `reframe_9x16` | Face/speaker tracking → smoothed crop keyframes (`set_keyframes` on transform), min-jerk filter, safe-area for captions |
| `chapters` | Topic segmentation on transcript embeddings + LLM titling → `add_marker(kind=chapter)` |
| `style_profile` | See below |

## Reference-style analysis (no asset copying)
Input: a reference video the user supplies. Output `StyleProfile`:
```json
{ "avg_shot_len_s": 2.4, "shot_len_p10_p90":[0.8,5.1], "cuts_per_min": 25,
  "caption": {"position":"lower_third","max_words_per_line":4,"emphasis":"word_highlight","case":"upper"},
  "music_bpm": 112, "music_loudness_lufs": -20, "voice_loudness_lufs": -14,
  "zoom_punch_in_rate_per_min": 6, "transition_mix": {"cut":0.9,"dissolve":0.1},
  "luma_contrast": 0.62, "saturation": 0.55 }
```
Reference media is analyzed ephemerally and not stored, embedded, or referenced by generated output. The profile maps to parameters of existing analyzers/ops (e.g. target pause length, caption preset, B-roll cadence).

## Tools exposed to the planner LLM
`search_transcript(query)`, `get_segments(range)`, `get_scenes(range)`, `describe_frame(t)`, `get_timeline_summary()`, `find_repeats(range)`, `score_highlights(range,k)`, `search_media(query)`, `estimate_effect(step)`. Read-only; mutation happens only via compile+commit.

## Streaming UX contract
Agent emits events over WS: `plan.step.started|done`, `ops.batch`, `preview.ready`, `needs_input`, `error`. Ops stream in batches so the timeline visibly changes while the plan executes (the demo moment). All streamed ops belong to one pending changeset and render as ghosts until accepted.

## Safety and trust
- Confirmation required for destructive scope (> 20% duration removed, track deletion, audio replacement).
- Every step carries `why` and `confidence`; low-confidence steps are pre-unchecked in the changeset list.
- Partial accept: user can toggle individual steps; the changeset is recompiled from selected steps.
- Provenance on generated media; license metadata on stock.
- Prompt-injection hygiene: transcript text and on-screen text are data, quoted in context blocks, never instructions.

## Evals (`evals/agent/`)
Suites: `tighten`, `dedupe`, `broll`, `shorts`, `chapters`, `style`.
Metrics: plan validity (pass first try), op validity after repair, task success (programmatic assertions: e.g. duration delta in range, no duplicate sentence remains, short ≤ max length and starts at sentence boundary), human-rated quality (sampled), latency p50/p95, cost per changeset. Fixtures: synthetic scripted recordings with known repeated takes (generated by TTS) so ground truth exists. Gate merges on no-regression.

## Providers
LLM (planning + titling), Vision (frame description, face boxes, shot type), ASR (word timestamps + diarization), Embedding. All behind interfaces in `kerf/ai/providers.py`; pick vendors by config. Cache keyed by `(asset_id, stage, model_version)`.
