---
trigger: glob
globs: apps/web/**, packages/ui/**
---
# UI quality
- Use tokens from `packages/ui/tokens`. No raw hex, no spacing outside the 4 px scale.
- Every interactive element: hover, focus-visible, active, disabled, loading. Keyboard path documented.
- Motion uses the named curves/durations in the design system; respect `prefers-reduced-motion`.
- Agent output is always shown as a reviewable changeset on the timeline (ghost clips + diff), never as chat text alone.
- Empty, loading, error and partial states are designed, not defaulted.
- Run `/ui-review` and attach screenshots at 1280, 1728 and 2560 widths to the PR.
