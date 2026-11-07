---
trigger: glob
globs: apps/api/kerf/agent/**, apps/api/kerf/ai/**
---
# AI agent safety
- Planner output is structured JSON validated by schema; free-form text is never executed.
- The compiler resolves handles; unknown handles abort the plan with an explainable error.
- Destructive intents (delete > 20% of timeline, replace all audio) require explicit confirmation in the changeset UI.
- Log prompt, retrieved context IDs, plan, ops, model/version per changeset for replay and eval.
- Generative media is labeled with provenance (`source: generated`, provider, prompt) on the asset.
- Reference-style analysis returns a `StyleProfile` of numbers and enums only; no frames, audio, or text from the reference are stored or reused.
