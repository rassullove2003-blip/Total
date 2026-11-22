# Project: animated history Shorts channel

Read first: `notes/channel_rules.md` (identity, script formula, comment engine, hard lines) and `notes/learned.md` (lessons from analyzed videos).

## Working rule: improvement loop (owner's standing instruction)
After every render or still, ask "can this be better?" and keep iterating until there is nothing important left to fix:
1. Render stills/clip → look at them (Read the images).
2. Write a numbered critique: what looks cheap, wrong, unreadable, static, or factually off. Compare against the reference shorts in `watch/` when relevant.
3. Fix the top items, re-render, compare before/after.
4. Repeat. Stop only when the remaining issues are minor; then report what changed and what is left.
Save after every round (commit + push).

## Pipeline (2D map style, current)
- `anim/` Remotion project. 2D cut-out compositions are pure DOM/SVG (fast: ~18 fps on 4 CPUs). 3D (`videos/kola`, `videos/bridge`) is slow (~0.2 fps), use only for special videos.
- Characters: generated with Figma `generate_image` (costs the owner's Figma AI credits — keep calls few), background removed, rig points in `*_rig.json` (eyes, mouth, neck).
- Voice: Kokoro `bm_george` (`voices/kokoro-v1.0.onnx`), word timings via faster-whisper, mouth envelope per frame.
- Maps: Natural Earth geojson in `anim/data/` (download from raw.githubusercontent.com/nvkelso/natural-earth-vector), drawn by `anim/concepts/map_styles.js`.
- Render: `COMP=<id> OUT=out/x.mp4 node speed.mjs 0 <lastFrame> 1 3`; stills: `COMP=<id> node stills.mjs out/p_ f1,f2 1`.
