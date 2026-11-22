# Frame-by-frame breakdown: "How America Bought Louisiana" (GeoGlobeTales, 18.8M views)

Source analysed: 1080x1920, 30 fps, 100.9 s (downloaded on the owner's Mac, `~/Documents/youtube/louisiana.mp4`).
Contact sheets at 2 fps + 30 fps strips of key effects. Hard cuts: only ~5 (11.8 s, 12.5 s, 40.5 s, 53.6 s, 58.9 s). Everything else is ONE continuous camera over a map.

## Core rule: a new visual action on every caption phrase (~every 1-1.5 s)
The video never holds a static frame for more than ~1.5 s. Each 2-4 word phrase gets its own action: a zoom, a recolour, a pop-in icon, a character reaction.

## Map look
- Base: vintage world map. Sea = muted teal with paper/noise texture and faint swirls. Land = beige with **hillshade relief** (mountains visible as shading) — this is what makes it look rich.
- Country fills: flat saturated colours (Britain red, France blue, USA teal, Spain orange, Haiti green) with a paper texture multiplied on top; **thick black border** (~3 px at 1080); slightly darker inner edge.
- Country labels: serif (Times/Georgia-like), off-white with soft drop shadow, placed inside the shape, slightly rotated along it, scale with the map.
- At 0:00 the USA is drawn **with thin white state (admin-1) borders inside** — precision cue. Later, with countries only, internal borders are gone.
- Close zoom (Caribbean, 0:28-0:40) switches to **satellite imagery** with the coloured territories overlaid semi-transparently — map style changes with zoom level.

## Territory effects (the "borders on colours" language)
| Effect | Where | How it moves |
|---|---|---|
| Territory appears | 0:08 Louisiana | blue shape flies in from the right with heavy motion blur (3-4 frames), settles with small overshoot (~6 frames) |
| Highlight a region | 0:23 | region lightens toward pale; yellow hand-drawn ellipse is drawn on (stroke animation); yellow serif label + arrow above |
| Pulse / glow | 0:24, 0:31 | radial glow + white arrows bursting outward from the region; orange spark glow on Haiti |
| Ownership change | 0:46 Haiti | France blue → darker "Revolutionary territory" blue, label crossfades |
| New owner | 0:59 | Haiti recoloured green + new name |
| Merge into another state | 1:36 | icons on it shrink to 0 (8 f) → both territories fade to **paper-white** (4 f) → hold white (~8 f, camera eases out) → fade into USA teal (~10 f) |
| River as border | 1:07 | Mississippi drawn as **glowing electric white-blue line** (flicker), yellow italic label, white arrow pointing; barrels float down it to New Orleans |
| Flag planted | 1:13 | small flag pops on a city with bounce |
| Stat pop | 1:39 | "4" + coin flips in + "/acre" types in, yellow with outline |

## Camera
- Continuous smooth zooms/pans between places (USA → across the Atlantic following a ship → France). Ease in/out.
- Year card: huge serif "1802" centred, then slides off with the pan.
- Punch-zoom on a label (0:33 "Saint-Domingue (Haiti)" whips toward camera).
- Thought-bubble reveal (0:25): the current map view shrinks into a cloud-shaped bubble while the camera zooms out to reveal Napoleon's head below it.
- Rewind gag (0:11.5-12.5): ◀◀◀ icon + dark vignette, previous shots replay backward fast with blur, ending on the start of the story.

## Characters
- Chibi "doll" figures: big round head, no visible limbs most of the time; cartoon glove hands appear only when needed (pointing, holding).
- They stand ON the map at their country and scale with the map zoom.
- Comedy exaggeration: diplomats' mouths stretch down to their chest in shock (0:10, 1:29).
- Entrances/exits slide with motion blur.
- Group actions read clearly: handshake, pointing stick, hands with super-long arms stretching across the ocean ("too far away to defend").
- Real painted portrait of Napoleon cut out and slid in from the left on "made no sense" — mixing real art with cartoons.

## Diorama scenes (the only hard cuts)
- 0:40-0:45 plantation, 0:53-0:58 beach: **photoreal backgrounds** (AI-generated photos) with depth blur + the same chibi characters; camera dolly with motion blur.
- Gag on words: "working there for free. Yeah, slavery." → close-up, then ball and chain; "yellow fever" → soldiers' faces turn yellow, then they fall over.

## Props and icons (each tied to a word)
ship sailing along a route, easel with a map, briefcase, price tag "$10M" → "$15M", stacks of money on Haiti, plantation icons, people pictograms multiplying ("hundreds of thousands"), baguette for "French Empire", barrels on the river, FOR SALE → SOLD sign, joke billboard "BIG LAND. BIG DISCOUNTS. www.BuyLouisiana1803", coin.

## Captions
**Small** white sans-serif phrase captions (2-4 words) in the lower middle with a soft shadow, fading in per phrase. NOT big karaoke words. The visuals carry the video; captions are a quiet helper.

## Script
Hook paradox (0-11 s, with the punchline image) → rewind "let's start from the beginning" → cause chain with dates → dry jokes → last line = a number ("4 cents an acre"). Ends instantly, no CTA.

## What we need to add to our engine (priority)
1. Historical borders as polygons we can recolour/merge/highlight: `aourednik/historical-basemaps` (GeoJSON world borders by year, e.g. 1200/1300) on raw.githubusercontent.com.
2. Hillshade relief on land (Natural Earth shaded relief raster or our own from a DEM) + paper texture.
3. Territory animation kit: fly-in with motion blur, highlight + drawn ellipse, recolour crossfade, white-flash merge, glowing river line, flag pop, stat pop.
4. Camera rig: continuous zoom/pan between places, year card, punch-zoom, rewind gag, thought-bubble reveal.
5. Small phrase captions (replace our big word captions for this style).
6. Props library generated once in Figma (ship, briefcase, price tag, flag, money, sign) + photoreal backgrounds for diorama beats.
7. Characters: chibi doll rig with mouth stretch for shock, glove hands, slide-in with blur. Keep our own character design (not their dolls).
