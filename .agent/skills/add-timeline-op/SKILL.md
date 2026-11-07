---
name: add-timeline-op
description: Add or modify a timeline operation across schema, TS reducer, Python reducer, inverse, fixtures, and agent catalog. Use whenever editing ops.
---
# Add a timeline op
Follow `.agent/workflows/new-op.md`. Pitfalls:
- Ripple behavior must be explicit (`ripple: none | track | all_tracks`), never implicit.
- The inverse of a split is a merge that restores the original clip ID and properties; store prior state in the inverse payload.
- Operate on integer microseconds. Rounding bugs break parity between reducers.
- Ops touching multiple tracks must be atomic inside a changeset.
