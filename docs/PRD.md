# PRD: Kerf

## Problem
Prompt-to-video tools return a finished file. Anything wrong means re-rolling. Pro editors (Premiere, Resolve, CapCut) are precise but slow for transcript-heavy, long-form-to-short workflows. Kerf joins the two: natural-language intent, deterministic editable output.

## Principle
**AI proposes, the timeline disposes.** Every AI action is a reviewable, undoable set of timeline operations.

## Users
1. Solo creator / podcaster: long recording → polished episode + Shorts.
2. Marketer / agency editor: cut variants fast, keep manual control.
3. Founder / educator: talking-head content, needs captions, B-roll, cleanup.

## Core jobs
- "Tighten the first 15 seconds." "Remove repeated takes." "Add B-roll where I talk about X." "Make three Shorts." "Cut it like this reference (pace and caption style only)."

## Scope (v1)
| Area | Requirement |
|---|---|
| Upload | Resumable, multi-GB, parallel multipart, survives refresh/network loss |
| Index | Transcript (word-level), speakers, scenes, visual captions, embeddings; async, 3 h footage |
| Timeline | Multi-track (video, audio, captions, music, overlay), trim/split/move/ripple, markers, transitions, keyframed transform/volume |
| Agent | Prompt → plan → ops → preview → accept/reject; undo as one unit |
| Media insert | Stock/library B-roll, user images, generative image/video via provider interface |
| Layers | Captions (styled, word-highlight), audio cleanup (denoise, loudness, silence), music (ducking) |
| Versions | Op log + snapshots, named versions, restore, branch-from-version |
| Render | Async chunked render, progress, multiple presets (16:9, 9:16, 1:1), retry-safe |

## Non-goals (v1)
Real-time multi-user co-editing (design is CRDT-ready, not shipped). Mobile editing. Color grading suite. Plugin marketplace. Full motion graphics.

## AI features
1. Multimodal footage understanding (what is on screen + what is said).
2. Prompt → edit plan → ops.
3. Auto chapters, hooks, highlights (scored, explainable).
4. Short-form extraction with 9:16 reframing and captions.
5. Reference-style analysis → `StyleProfile` (numbers, not assets).

## Success metrics
- Time from upload to first usable edit < 10 min for 1 h footage (proxy ready first, index streams in).
- Agent plan validity rate ≥ 98% (ops pass validation without repair).
- Accepted-changeset rate ≥ 60% on eval prompts.
- See `BENCHMARKS.md` for engineering targets.

## Naming
**Kerf** (primary): the cut a blade leaves; short, ownable verb-adjacent, visual motif. Alternates: Cutlist, Splicewright, Tracksmith, Rushes. Check trademark/domain before launch.
