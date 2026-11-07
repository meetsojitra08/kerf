# Design System: "Cutting Room"

## Direction
Kerf should feel like a **precision tool in a dim edit bay**, not a SaaS dashboard and not a chat app with a video attached. Reference mood: a flatbed editor, a darkroom safelight, a well-set technical manual. Dense, calm, exact. Personality comes from one idea, **the cut line**: a thin vermilion rule that appears wherever the agent cuts, where the playhead sits, and where a diff begins.

## Anti-patterns (hard no)
Purple/indigo gradients, glow, glassmorphism, sparkle/magic-wand icons for AI, rounded-2xl card grids, centered hero chatbox, stock illustration empty states, emoji in UI, drop shadows used for decoration, "AI is thinking…" shimmer blobs, Inter-on-gray-900 default look.

## Color (dark primary, light supported)
Warm neutrals (slightly brown-green graphite), never blue-black.
```
--bg-0:   #0E0E0C   app background
--bg-1:   #151512   panels
--bg-2:   #1C1C18   raised / inputs
--bg-3:   #26261F   hover
--rule:   #2F2F27   hairlines (1px)
--text-0: #ECE9DF   primary (warm paper)
--text-1: #B9B5A6   secondary
--text-2: #7E7B6E   tertiary / disabled
--cut:    #FF4A2B   signature accent: playhead, cut line, primary action (use sparingly)
--cut-dim:#FF4A2B22
--agent:  #D8C46A   agent authorship (ochre) used ONLY for agent-originated marks
--ok:     #7FB685  --warn: #E0A53A  --err: #E5584B
Track hues (muted, 4 families): video #6E8FA6, audio #7FA37B, music #A98BB5, caption #C9A36A, overlay #B87C6B
```
Light theme: paper `#F4F1E8` bg, ink `#1A1A16`, same accents, adjusted contrast (check AA on all text, AAA on timecode).
Rule: `--cut` covers < 3% of the pixels on any screen.

## Typography
- UI: **Instrument Sans** (400/500/600). Tight, humanist, not Inter.
- Mono / timecode / numerics: **JetBrains Mono** with tabular figures; timecode always mono, `00:00:15:12`.
- Display (wordmark, empty-state titles only): **Fraunces** (opsz 144, soft 0) at large sizes for editorial contrast.
- Scale: 11/12/13 (UI default 13), 15, 20, 28, 44. Line-height 1.35 UI, 1.15 display. Density-first: 13 px base.

## Spacing, shape, elevation
4 px grid. Radius: 2 px (clips, chips), 4 px (inputs, panels), none on timeline. 1 px hairline rules instead of cards. Elevation only for floating layers (command palette, menus): 1px border + 24px blur black 40%. No shadows on panels.

## Layout (1728×1117 reference)
```
┌ Top bar 40px: project · version chip · render · share ───────────────┐
├ Left rail 64 ┬ Media/Index panel 320 ┬ Preview (flex) ┬ Director 360 ┤
│ (modes)      │ assets, transcript,   │ 16:9 / 9:16    │ prompt, plan, │
│              │ scenes, search        │ transport      │ changeset     │
├──────────────┴───────────────────────┴────────────────┴───────────────┤
│ Timeline (resizable, min 280): ruler · tracks · minimap                 │
└─────────────────────────────────────────────────────────────────────────┘
```
Timeline gets the most area; panels collapse with `\`; focus mode hides everything but preview + timeline.

## The agent surface: "Director's Notes" (not a chat)
- Prompt field is a **command line** at the top of the right panel with history and `/` commands; supports scope chips (`range`, `selection`, `track`) drawn from the timeline selection.
- Response is a **Plan**: numbered steps, each with a one-line why, a confidence tick, a checkbox, and a hover that highlights its affected range on the timeline.
- Execution streams ops; clips appear as **ghost clips** (ochre outline, diagonal hairline hatching) with the cut line animating at each cut point.
- A sticky **Changeset bar** over the timeline: `+14 clips −9 clips  −38.2 s` · Accept all · Review step by step · Reject. Accepting converts ghosts to solid with a 160 ms settle.
- After commit: one-click **Undo agent edit** toast stays until next action. Version chip increments (`v12 · Agent: remove repeats`).
- Agent-authored clips carry a small ochre notch on their top-left; hover shows prompt + step.

## Timeline craft
- Canvas-rendered, 60 fps, virtualized. Clip bodies: flat fill, 1 px darker top edge, label in 11 px, thumbnails strip only above 36 px height, waveform baseline drawn with hairline.
- Playhead: 1 px `--cut` line with a notched cap; scrubbing shows frame tooltip in mono.
- Snapping: magnetic to cuts, markers, playhead; snap indicator is a brief vermilion tick on the ruler.
- Ripple edits animate the gap closing (120 ms ease-out) so users see cause and effect.
- Multi-select, marquee, lasso over tracks; alt-drag duplicate; `S` split at playhead; `Q/W` ripple trim; `J K L` shuttle; `⌘K` command palette; `⌘Z` undo.
- Zoom: pinch / `⌘scroll`, anchored on cursor; minimap shows index heat (speech, silence, highlights).

## Index panels
Transcript is **editable text-as-timeline**: select words → delete → emits `ripple_delete_range`. Speaker lanes color-coded. Search results highlight in transcript and as ticks on the timeline ruler. Highlights/hook candidates are shown as markers with a score and rationale.

## Upload & processing
Global tray at bottom-left. Each asset shows stages as a segmented bar: `Upload · Proxy · Transcript · Scenes · Vision`. Editing unlocks after Proxy; later stages fill in live ("transcript 62%"). Never a modal spinner.

## Motion
Durations: 90 (micro), 160 (state), 240 (panel), 400 (agent settle). Curves: `ease-out-quart` for entrances, `cubic-bezier(.2,.8,.2,1)` for settle, linear for scrubbing. Motion must explain cause and effect (a gap closes, a ghost solidifies). Reduced-motion: crossfade only.

## Sound and haptics
None by default. Optional subtle tick on snap, off by default.

## Accessibility
Full keyboard operability (timeline included, with `[`/`]` clip focus and arrow nudge, `Shift` for 1 s). Visible focus ring: 2 px `--cut`, 2 px offset. Contrast AA minimum. Screen-reader announcements for agent changeset summary. Do not rely on color alone for track type (icon + label).

## Voice and microcopy
Terse, concrete, editor's vocabulary. "Removed 9 repeated takes (38.2 s)". Not "✨ Done!". Errors say what happened and what to do. Never anthropomorphize the agent ("I think…"); it reports actions and reasons.

## Tokens (implementation)
`packages/ui/tokens.css` (CSS variables) + `tokens.ts`. Tailwind allowed only as a token consumer; no default palette. Icon set: Phosphor (Light/Regular) or custom 1.25px stroke set; no filled icons. AI actions use a **scissors-with-notch / cut-line glyph**, never sparkles.

## Review checklist
- [ ] Uses tokens only; passes contrast
- [ ] One accent per view, `--cut` < 3% area
- [ ] All states: empty/loading/error/partial/agent-preview
- [ ] Keyboard path + focus order
- [ ] Motion matches named durations, reduced-motion works
- [ ] No anti-pattern from the list
- [ ] Looks intentional at 1280, 1728, 2560
- [ ] Squint test: hierarchy readable (preview > timeline > panels)

## Signature moments (polish budget goes here)
1. Agent cut animation: cut lines sweep across the timeline while ghost clips resolve.
2. Changeset accept settle.
3. Transcript-to-timeline selection linking (highlight in text, glow on ruler).
4. Upload stage bar with live index fill.
5. Render view: segments as a strip of tiles filling in parallel per worker (shows horizontal scaling visually).
