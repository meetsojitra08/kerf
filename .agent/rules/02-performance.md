---
trigger: always_on
---
# Performance budget
- 500 ops applied as one batch: no main-thread task > 50 ms, total apply < 250 ms on a mid-range laptop. Use Immer patches, structural sharing, and an interval index per track.
- Timeline draws on canvas with virtualization. Never render one DOM node per clip beyond the viewport.
- Waveforms and thumbnails come from precomputed peak files and sprite sheets, not client decode of full media.
- Anything > 16 ms on the main thread must move to a worker or be chunked with `scheduler.postTask`.
- Run `/perf-check` before merging changes in `timeline-core`, the canvas renderer, or WS handlers.
