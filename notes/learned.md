# Learned from videos

Takeaways from analyzed videos. Read before writing new scripts.

## 2026-11-22 — "How to Make Viral Animated Shorts Using Claude" (Mr omi, 1.3M views)
https://youtu.be/OtbLL6OBNE4 · repo: https://github.com/mromidev/claude-animated-shorts (MIT)
- Format: 55-70 s vertical story short, 2D cartoon characters in a colourful 3D world (three.js + Remotion), no AI video generator.
- Method: download ~20 top shorts of a reference channel, study them frame by frame, write a numeric "style bible", then build and compare own frames against it (agents per topic: motion, depth, textures, characters, lighting, outlines, grade).
- Script formula (20/20 reference shorts):
  1. Hook = paradox stated as fact, first sentence, 10-16 words, no intro.
  2. Setting in 1-2 lines (year, place, named everyman, numbers).
  3. Escalation 3-6 beats, people doubt/mock, 1-2 exaggeration jokes.
  4. Mystery beat ("Wait...?").
  5. Pivot "You see," -> real mechanism via everyday analogy.
  6. Ironic payoff, video ends on the last word. No outro, no CTA.
- Voice: one steady narrator, 3.5-4.1 words/s, almost no pauses. Loudness -14 LUFS.
- Picture: every sentence illustrated literally; camera holds ~80% with slow push-ins, ease-out moves, almost no hard cuts.
- Topic choice: one surprising TRUE story with a visible physical cause and effect (e.g. soldiers marching broke Broughton bridge, 1831).
- Apply to our channel: rewrite scripts to this formula; drop "Follow for more" ending.

### Same video — what the author said out loud (from auto-captions)
- Make Claude MEASURE at 30 fps (contact sheets, camera tracking, brightness/contrast/saturation per shot). "You can't recreate an opinion, you can recreate a number."
- Before picking a topic: check the topic isn't already a viral short in this style (his first topic was already done with 5.7M views → dropped).
- Verify every fact before writing; facts become jokes ("Luckily the river was only 2 ft deep. Unluckily, the river was only 2 ft deep.").
- Lighting follows the story: warm/bright for setup → deep night blue when the explanation starts.
- Check STILLS before rendering video: he found camera inside a house, teal trees, a chain in front of faces.
- Why his first version looked cheap: no ink lines (blur pass wiped them), pastel/flat colours, plain textures (need painted grain + dark gaps), sharp backgrounds (need blur), characters with circle heads, chunky limbs, under 3 heads tall → looked like clip art pasted on top.
- Camera: never snap in 3 frames; glide ~23 frames, slow in/slow out. Camera moves in ~65% of frames (slow push-ins), his first tool missed it.
- Colour: no pure black anywhere; sunset shadows purple, not brown.
- Characters must be lit by the scene and cast shadows.
- Many agents: split FILES, not just jobs (each agent its own copy + own files, merge file by file).
- He gave Claude ~10 hours for the full learn + make cycle.
- Next video teaser: render smaller then upscale → cut render 7.5 h → 1 h (useful for our CPU-only render).
