# Killer demo (target 90-120 s)

**Setup:** 25-min talking-head recording with 6 deliberately repeated takes, filler words, a slow intro, topics that map to obvious B-roll. Pre-uploaded proxy, indexing finished in background (also show a clip of live indexing progress).

| Time | Shot | What the viewer sees |
|---|---|---|
| 0:00 | Cold open | Upload tray: a multi-GB file at 60% resumes after a deliberately dropped connection |
| 0:10 | Index fills | Stage bar fills: Proxy ✓ Transcript 62% Scenes… ; user already scrubbing the proxy |
| 0:20 | Prompt | Director's Notes: *"Tighten the first 15 seconds, remove repeated takes, add B-roll, and generate three Shorts."* |
| 0:25 | Plan | 4 steps appear with rationale + confidence; hover highlights ranges on the timeline |
| 0:30 | **Timeline moves** | Cut lines sweep; ghost clips resolve; repeated takes collapse; B-roll lands on V2 with J-cuts; three new Short sequences appear |
| 0:50 | Changeset bar | `−9 takes · −3m 42s · +7 B-roll · 3 Shorts` — user unchecks one B-roll, accepts |
| 1:00 | Manual control | Trim a B-roll by hand, edit caption text, ripple delete via transcript selection: still a real timeline |
| 1:10 | Undo | One click undoes the whole agent edit; redo; open version history v11/v12 |
| 1:20 | Render | Render tiles fill in parallel across 8 workers; p95 latency badge |
| 1:35 | Result + metrics | Play the Short; end card with measured numbers (500 ops in X ms, 3 h indexed in Y min, N-worker speedup curve) |

**Narration rule:** show, don't explain. The line to land: *"The AI never touches your video. It edits your timeline."*
**Capture tips:** 4K screen capture at 60 fps; hide cursor jitter; keep `--cut` visible on every cut for visual rhythm.
