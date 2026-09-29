# Genre Technique: Isometric / Voxel-Arcade Rendering Craft

For `tools/iso.py` and `tools/render_art.py`. Technique only — no assets reproduced. Every figure is
**sourced** (a URL in §9 I actually fetched) or **Derived** (my reasoning, so labelled). Source
disagreements are stated, not smoothed over.

## 1. Projection

1.1. The genre uses **dimetric, not true isometric**: `arctan(sin 30°) ≈ 26.565°`, giving a **2:1
    pixel ratio**; only two of the three axis angles match. [S1] That justifies `TILE_W = 64,
    TILE_H = 32` in `iso.py` — exactly 2:1. Screaming Brain's transforms are also 2:1. [S3]

## 2. Isometric lighting: the three face values

2.1. **Ramp A (mix with black + white):** highlights = base + **40% white**, shades = base +
    **50% black** → roughly `1.40 / 1.00 / 0.50`. **Ramp B (black only):** top face unmodified, two
    front faces = base + **30% black** and **60% black** → literally `1.00 : 0.70 : 0.40` on sRGB
    channels. Both from [S2].

2.2. **Ramp C (pixel-art rule):** main wall = **no shade**, side wall = **shaded**, top wall/edge =
    **lightened**. [S3] If floor and main wall share a texture, leave the *floor* untouched and
    darken the *main wall*, so they stay distinguishable. [S3]

2.3. **Shade contrast encodes material:** low = ambient only (self-emissive), medium = ordinary
    matte, high = reflective. [S2]

**Light direction — sources disagree.** Screaming Brain's example is captioned **"Lit from
Southwest"** [S3]. Highrise Create: *"the light source on an object is from the front, top left"*
(shifting it can flatten form) [S4]. freedom251: *"above and to the left... top planes receive the
brightest color, left-facing planes are moderately lit, and right-facing planes are darker"* [S5].
Dino: *"most often at the top right or top left, as your light source is most often the sun"* [S6].
**GraphicDesign.SE dissents:** *"I wouldn't say that there is a real convention for the direction of
light... different light directions are common"* [S2].

**Synthesis:** unanimous on *top brightest, one side mid, other side darkest*; a majority (S3/S4/S5)
on **left mid / right dark** = top-front-left light. S2 is right that no rule is universal. All
sources agree on consistency — S5 lists inconsistent light as a top-four failure mode.

**Recommendation.** Current `LIGHT_TOP = 1.00, LIGHT_LEFT = 0.74, LIGHT_RIGHT = 0.54` is slightly
weak against the sourced `1.00 : 0.70 : 0.40` and `1.00 : 0.70 : 0.50`.
**Set `LIGHT_TOP = 1.12, LIGHT_LEFT = 0.72, LIGHT_RIGHT = 0.46`.**

2.4. `shade()` multiplies raw sRGB — the same space the S2 percentages were authored in. Do **not**
    linearise the ramp or it reads weak. The `_linearise` / `luminance` helpers are for contrast
    checks and should stay linear.

2.5. The `> 1.0` branch of `shade()` is **dead code**, because `LIGHT_TOP == 1.00` exactly. S2 and S3
    both make the top face *lighter than base*; `1.12` makes it live. **Test visually** — every tile
    and prop top face brightens.

2.6. **Avoid** *pillow shading* and the "light is at bottom-right so bottom-right is bright" error —
    a distant source lights flat surfaces *uniformly*. [S6]

## 3. Shadows and edge treatment

3.1. **Cast shadows are standard, not optional.** S3 publishes a dedicated isometric-shadow workflow;
    pre-baked 2D shadows save memory vs real-time. S5: *"Contact shadows under walls, feet, wheels,
    and furniture legs make assets feel less than stickers and more like objects occupying space"* —
    *"a dark, semi-flat shape that follows the isometric ground direction"*, on the **same plane as
    the tile beneath**. [S5]

3.2. Baked recipe [S3] (only if you bake rather than generate): equal tile dimensions; flip the
    object tile vertically; grayscale; blend with **Grain Merge** (multiply minus 128, so
    `RGB(128,128,128)` is neutral); **Contrast 30–40**; delete the background so the ground shows
    *through* the shadow.

3.3. **Derived, applied to `iso.py`.** `tile_shadow()` offsets (+0.06, +0.10) at alpha 38. (a) The
    offset must mirror the light, so a top-left light throws the shadow to the **bottom-right** —
    verify by eye against `project()`. (b) Make **contact shadow** (under the feet) and **cast
    shadow** (offset toward the anti-light side) two separate primitives: S5 treats contact shadow as
    its own, deepest value tier.

3.4. **Ambient light, done correctly.** S6: the second source should *not* share the first's direction,
    or it is "drowned." Critical rule: **"lightening the shadows does not mean that the shadows are
    more clear. For best results, just highlight the edges of the shadowed areas and leave the rest of
    the shadow dark."** So: a 1–2 px rim on the lit-facing edge of the dark face, not a global lift —
    the cheapest single upgrade to perceived volume here.

## 4. Voxel / blocky character design

4.1. **Head-to-body ratio: 1.5 to 2 heads tall.** Explicitly citable: *"a head-to-body ratio of 1.5
    to 2 heads tall results in a cute finish"*, because a large head and small body emphasises
    cuteness and spares you from making the body three-dimensionally convincing. [S7]

4.2. Same source [S7]: **place facial features low and draw the eyes large** (that placement creates
    the adorable read); **omit the nose**; **thick lines and flat colours**; and **exaggerate identity
    parts** — hair flips, accessories, horns made *larger* than realistic so personality survives
    the deformation.

4.3. **Silhouette is the test.** *"A game sprite has a job the moment it appears on screen: the player
    must instantly recognize what it is, often while it is small and moving. That means the
    silhouette — the solid outer shape — has to be readable on its own."* [S8] The source's exercise
    requires a solid single-colour silhouette matching the subject at **85%** — a usable numeric
    acceptance test for the hopper.

4.4. Build order [S8]: solid silhouette, zero interior detail → biggest interior colour regions →
    small details **only if they survive at actual game size** (*"if a detail turns to mush, cut
    it"*). And *"Cohesion is one scale, one palette, one light"* — a 32 px character and a 200 px
    prop at equal detail read as different games.

4.5. **Isometric specifics** [S5]: feet sit on the isometric ground plane, the body must not face a
    flat side-view camera, and a **three-quarter view** with head and torso turned slightly toward the
    viewer is the standard fix. Strong face contrast helps tiny sprites stand out.

4.6. **Keyline.** S5: **outer silhouette darker, internal edges slightly lighter** so they do not
    overpower the form; **never the same black outline everywhere** — coloured outlines read more
    naturally (dark brown wood, deep blue-grey metal, dark green foliage). `CHAR_OUTLINE = "#3a2410"`
    is already a warm brown, the right instinct; the gap is lighter internal plane edges — what §2.5's
    live highlight branch gives you. **Dither sparingly** at small tile sizes. [S5]

## 5. Hazards and safe ground without colour

5.1. **Never use colour as the sole indicator of gameplay-relevant information.** Prevalence: ~**8% of
    men** have some CVD; deuteranopia ~**6% of men**, protanopia ~**1%**, tritanopia **<0.01%**. [S9]
    The fix is **redundant encoding**: every colour distinction must also be carried by **shape,
    pattern, text, size, or position** — circles vs triangles, a number on a health bar, a rarity
    label. It also helps in sunlight on a phone, not only CVD. [S9]

5.2. **Blue–orange** is the safest universally-safe contrast pair (it survives all three CVD types);
    **avoid red-green entirely**. [S9] Relevant here: `TURTCOL` and grass are both green-family —
    that is the risky pair.

5.3. **Derived, no source found.** No source states non-colour conventions specific to *isometric*
    hazards. Synthesised from S9's list: **height/silhouette** (hazard = raised block, `BLOCK_H > 0`;
    safe ground flush at 0 — elevation is a shape cue, already how `iso.py` tells tiles apart);
    **surface pattern** (safe ground flat, hazard carries a repeating motif — chevrons, teeth, gaps,
    lattice); **value separation** (§6); **motion** (lethal surfaces move, safe ground is inert). None
    of these is a quoted isometric standard.

5.4. **Derived, sourced thresholds.** WCAG 2.2: **4.5:1** normal text, **3:1** large text, and
    **1.4.11 requires 3:1 for UI components and graphical objects conveying information**. [S9] That is
    a web-accessibility guide, not game art — use 3:1 as a floor for hazard-vs-ground separation.
    `iso.py` has `contrast_ratio()` / `luminance()`; wire a 3:1 assertion into
    `tools/check_art_assets.py`.

## 6. Palette and value structure

6.1. **3 to 5 values per material**: one highlight, one main colour, one mid-shadow, one deep shadow,
    plus an optional accent for edges and small details. [S5]

6.2. **Value tiers by surface** [S5]:

    | Surface            | Value      |
    |--------------------|------------|
    | Top plane          | Lightest   |
    | Light-facing side  | Mid value  |
    | Shadow-facing side | Darkest    |
    | Contact shadow     | Deep shadow|

    Add the character as a fifth: the thing tracked at speed needs the highest local contrast against
    whatever it stands on.

6.3. **Greyscale is the test.** S8: *"Zoom out to 100% game scale frequently; if a detail turns to
    mush, cut it."* S5: *"A palette that looks good on white may lose readability on grass, water, or
    dark interiors."* `art/greyscale.png` and `art/contrast.png` exist — the gap is making them a
    gate.

6.4. **Derived, no source found.** No source gives numeric value percentages for ground vs hazard vs
    prop. A defensible greyscale allocation: **safe ground 45–60%**, **hazard 20–35% or 70–85%** (pick
    one and commit — darkest, as a pit, reads best against mid ground), **props 30–50%**, **character
    15–25% darkest mass with a 75–90% highlight**. Reasoned, not quoted.

## 7. Animation: the grid hop

7.1. **Frame-rate baselines** (per-animation, not project-wide) [S10]:

    | Rate  | Frame | Best for |
    |-------|-------|----------|
    | 4 fps | 250ms | Idle breathing, subtle effects |
    | 6 fps | 167ms | Casual walks, simple UI |
    | 8 fps | 125ms | Walk/run cycles, most game actions — *industry default* |
    | 12 fps| 83ms  | Fast attacks, impacts, particles |
    | 24 fps| 42ms  | Cinematic motion, large sprites — use sparingly |

7.2. **Varying frame duration is the primary way pixel artists control pace and weight, "without extra
    frames"** — a frame held 42 ms feels fast, the same frame at 250 ms feels slow. [S10]

7.3. **The beats, with sourced frame counts** [S10], antic corroborated by [S11]:
    - **Anticipation** — *"even a 1-frame anticipation before a jump transforms a pop-in sprite into a
      convincing leap"*; S11: *"even two frames can transform the feel."*
    - **Key frames** — draw the extremes first: highest point, deepest compression. **The apex is a key
      frame, not an in-between.**
    - **Squash / stretch** — *"Without squash, a ball hitting the ground reads as a cut, not a
      collision."* Pre-impact it stretches along travel, sometimes to 1–2 trailing pixels.
    - **Landing follow-through** — *"plays for 1–3 frames after the feet touch the ground"*; weighty
      stops use **arrive → overshoot → settle, each stage halving in amplitude and shaving a couple
      frames off the prior stage**. [S11]

7.4. **Settle discipline.** Decay that never stops reads as rubber — **cap the settle at one or two
    bounces**, with **proportional decay** and irregular damping so it is not metronomic. **"Animate
    to time, not just frame count"** — lock accents by timecode, test at 30/60/120 fps. And: *"For
    mobile, tighten holds and avoid micro-spacing that won't survive small screens."* [S11]

7.5. **Derived — the recommended hop.** No source gives a canonical hop duration in ms:

    | Beat           | Frames | Hold (ms) | Cumulative |
    |----------------|--------|-----------|------------|
    | Anticipation   | 1      | 42–83     | ~60        |
    | Launch         | 1      | 42–62     | ~110       |
    | Rising         | 1      | 42–55     | ~155       |
    | Apex (key)     | 1      | 55–83     | ~215       |
    | Falling        | 1      | 42–55     | ~260       |
    | Land + squash  | 1      | 55–83     | ~320       |
    | Follow-through | 1      | 42–62     | ~360       |
    | **Total**      | **7**  |           | **~280–380ms** |

    Reasoning: 7 frames at ~40–83 ms sits between the 8 fps and 12 fps baselines, weighted short
    because S11 says tighten on mobile; antic and follow-through are 1 frame each per S10; the settle
    is one bounce inside the 1–3 frame window, capped per S11. If hops must be faster, **drop the
    falling frame first (6 frames), never the anticipation.** A/B-test this first.

## 8. Camera and framing, portrait mobile

8.1. **No source found.** I searched for portrait-mobile isometric camera guidance and found no
    credible technical source, only marketing pages. **All of §8.2 is Derived.**

8.2. From first principles, given 2:1 tiles [S1] and the 100%-scale check [S8]:
    - **28–34 rows visible.** On 2:1 tiles tile *height* limits the portrait frame; at
      `TILE_H = 32` on 1080×2340, that is the count once the board is scaled to fill, before margin.
    - **Board = 80–88% of frame height**, ~6% top for HUD, ~6% bottom for the thumb zone.
      `frame_view_window()` takes `margin` and `bias_y = 0.54`; try `margin ≈ 0.06 × height` and keep
      `bias_y` at 0.50–0.55, so the player sits just below centre with more runway ahead.
    - **10–14 rows ahead, 2–3 behind** — forward visibility is the gameplay-relevant number.
    - **7–9 columns.** Narrower reads as a corridor with no choice; wider shrinks tiles below the size
      where the 85% silhouette test [S8] is meaningful.

## 9. Sources actually fetched

Usage is inline via `[Sn]`; all fetched and read in full.

1. [S1] *Isometric video game graphics* — dimetric, arctan(sin 30°) ≈ 26.565°, 2:1 ratio.
   https://en.wikipedia.org/wiki/Isometric_video_game_graphics
2. [S2] *Isometric color shading rule for pixel art* — the 40%/50% and 30%/60% black-white mixes.
   https://graphicdesign.stackexchange.com/questions/131996/isometric-color-shading-rule-for-pixel-art
3. [S3] *Isometric Lighting* + *Isometric Shadows* — wall-shading rules, "Lit from Southwest", Grain
   Merge, baked-shadow contrast.
   https://screamingbrainstudios.com/isometric-lighting/ ·
   https://screamingbrainstudios.com/isometric-shadows/
4. [S4] Highrise Create, *Light & Shadow* — studio-published light/shadow patterns.
   https://production-create.highrise.game/learn/designer-resources/artguides/light-shadow
5. [S5] *The Complete Guide to Isometric Pixel Art* — lighting ramp, value tiers, shadows, keylines.
   https://freedom251.com/the-complete-guide-to-isometric-pixel-art/
6. [S6] Les Forges, *Chapter 4: Shadow and light* — one light source, ambient via edge highlights.
   https://opengameart.org/content/chapter-4-shadow-and-light
7. [S7] Clip Studio Tips, *How to Draw Chibi Characters* — 1.5–2 heads tall and facial-feature rules.
   https://tips.clip-studio.com/en-us/articles/10561
8. [S8] Wayline, *Making a game-ready sprite* — silhouette-first, 85% match exercise.
   https://www.wayline.io/learn/pixel-art/4
9. [S9] *Visual Accessibility in Games* — redundant encoding, CVD prevalence, WCAG thresholds.
   https://www.abratabia.com/game-accessibility/visual-accessibility.php
10. [S10] Pixel-Editor.com, *Sprite Animation Fundamentals* — frame-rate table, squash, keyframes.
    https://www.pixel-editor.com/articles/sprite-animation-fundamentals
11. [S11] SunStrike Studios, *Timing in Animation* — antic, settle, decay, mobile timing.
    https://sunstrikestudios.com/en/blog/timing_in_animation/

## 10. Honest gaps

- **§5.3, §5.4, §6.4, §7.5 and §8 are Derived.** Non-colour hazard conventions, numeric value
  percentages, hop milliseconds and portrait camera figures have no source here. Do not cite them as
  standards.
- **§7.5 hop timings are the weakest numbers in the document.** The frame counts and the shape of the
  beats are sourced; the milliseconds are my arithmetic on top of them.
- **Light direction is genuinely contested** (§2). S2 says no convention exists; S3/S4/S5 describe
  top-left or south-west in practice. The recommendation follows the majority — a judgement call.
- **Source quality is uneven.** S3, S4, S6, S7 are primary or studio-published; S5, S8, S9, S10 are
  instructional or secondary. S5 is a guide blog whose value-tier table and lighting rule agree with
  S3/S4/S6, but I did not confirm its figures against a shipping title. One candidate (a GameDesignDecal
  "Lab 12" snippet) was discarded: the URL resolves to *Lab 12: UI Asset Creation*.
