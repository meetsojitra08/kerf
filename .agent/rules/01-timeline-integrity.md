---
trigger: always_on
---
# Timeline integrity
- All timeline mutations go through `apply_ops` (Py) / `applyOps` (TS). No direct state edits.
- Every op: schema entry, forward reducer, inverse generator, validator, golden fixture, property test (`apply(op) then apply(inverse) == identity`).
- Ops are batched in a **Changeset** with `origin` = `user | agent | system`. Agent changesets are previewed in a shadow copy before commit.
- Reject ops that create overlapping clips on one track unless `allow_overlap` (only for transition zones).
- Clip source ranges must stay within asset duration. Validate before commit.
- IDs: ULIDs, generated client- or server-side, never by the LLM. The LLM uses **handles** (`@clip:3`, `@seg:t_0412`) that the compiler resolves.
