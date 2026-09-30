# Resume here

_Last updated 2026-09-30, after the Stage 1 module session._

## What was just done

Stage 1 (Suburb) was built out and made playable, and the session turned into a
hunt for defects that the existing gates could not see. Nine real bugs, most
of them silent.

**Shipped**
- `src/scenery.js` — 26 objects, one per declared name, grouped by biome.
  Suburb gets tree, hedge, mailbox, house, fence, streetlamp, flowerbed,
  parkedcar, bush. Every object casts a height-matched shadow.
- `src/render/iso.js` — added `line()` and a per-object shadow `alpha`.
- `src/render/scene.js` — scenery is now placed from each stage's own declared
  `scenery` list instead of three generic blobs on a fixed hash. Placement
  respects two playability rules: never on a hazard lane, never on the cell
  the player is standing in.
- `src/tiles.js` — now owns `buildLaneCycle` / `laneOf` / `isHazardLane`.
- `stage1.html` — a look sheet. Renders the real board and every Stage 1
  object, and prints any render error **on the page** (Safari will not let a
  headless tool read its console, so an error banner is the only way to see
  one).

**Bugs found and fixed** (all were invisible to the old gates)

| Where | Defect |
|---|---|
| `main.js`, `gallery.html` | Scene literal dropped `laneMix` and `scenery`. The renderer read `undefined` and fell back to its default lane mix — Suburb rendered with water and rail lanes — and placed **zero** scenery, in any stage, ever. |
| `hazards.js` | Picked hazards from a fixed `row % 10` while the renderer drew the lane from `laneMix`. Cars and trains spawned on rows drawn as lawn. All ten stages. |
| `stages.js` | Every `laneMix` summed to 1.0, so every stage had **no standable ground** — nowhere to rest, nowhere for scenery to go. |
| `main.js` | `ctx.scale(1.45, 1.45)` with no pivot scales about (0,0). The camera puts the player at 72% down, so 1.45 pushed it to 104% — **the player has never been visible on screen.** |
| `character.js` | Read `ch.ear`; the roster key is `earColor`. `fillStyle = undefined` is accepted silently by canvas, so all six characters had ears in whatever colour was last set. |
| `check_js_runtime.py` | Its JSC half ended in a bare `out.join(...)`. The `jsc` shell does **not** echo the last expression — only `print()` writes to stdout. The check had never run. |
| `scenery.js` | `reed()` called `Iso.line`, which did not exist. Three polygons were missing a closing `]` — the file did not parse at all. |
| `scenery.js` | `pine()` shaded its bottom tier by `0.30 * i`, painting the lowest tier pure black. |
| `check_vertical_slice.py` | The "hazards are generated" probe ran on stage 1, which is a teaching stage with no lethal hazard by design, and correctly reported "no hazards were ever generated" about a stage that is supposed to be empty. |

## Gates

```
bash tools/run_all.sh
```

Five green. One red:

```
P-12 campaign reachability 13% (target 90%)
  132/1000 campaigns reached ENDLESS
  0 of 868 failures were a clock timeout; all 868 were four lives lost
```

Every new check was proved non-vacuous by reintroducing its defect and
confirming the gate fails.

## The open decision — P-12

This is **not** an implementation bug and has been red since before this
session. It is a design call, and three were on the table:

1. Slow the cars and speed the player up.
2. Shorten the hop from 600ms to ~350ms.
3. Let lives carry across a stage retry instead of resetting.

A note on the target, because it is worth questioning: 90% is measured with an
autoplay bot that looks one row ahead and hops every 600ms. It is a competent
player at best, and it is a poor proxy for a seven-year-old with a thumb. The
90% figure was set as a floor for *solvability*, not as a statement about
human reachability — so before tuning to hit it, decide whether it should stay
a solvability floor or become a human-completion target. Tuning to satisfy a
bot is how you ship a game that is unfair to the people actually playing it.

Note also that fixing the lane-class bug made P-12 *worse* (15% → 3%) before
being corrected, because the old data was accidentally feeding every stage slow
forgiving log/turtle hazards. `src/hazards.js` now scales per-row density by
the share of the board that is actually hazardous, so a road-dense stage is
not automatically the deadliest. That restored it to ~13-15%, i.e. the
pre-existing baseline rather than a new regression.

## Suggested next steps

1. Resolve P-12 — decide the target's meaning first, then pick an option.
2. Stages 2-10 have never been looked at in a browser. `stage1.html` is
   stage-1-specific; the same treatment for the other nine would be the fastest
   way to find whatever is still wrong in them.
3. The lawn is flat colour. Crossy Road-class ground has texture; it is the
   most visible remaining gap in how the board reads.


---

## UPDATE — stage one made playable (later session)

The player reported stage one was unplayable: **the character could not be
moved, and there were no moving hazards at all.** Both were real, and neither
was a rendering problem.

### Why you could not move

`src/main.js` treated input as a *tap*: the press had to last under **150ms**
and move under **12px**, or it was discarded silently. A human clicking with a
mouse or a trackpad holds for 100-300ms and drifts further than 12px, so
almost every real click was dropped. There was also no lateral control at all
(tap only ever hopped forward) and **no keyboard binding whatsoever**, so the
game could not be played on a laptop even in principle.

Input is now: press = forward, drag = swipe in that direction, arrows/WASD =
the same. All three funnel into one `act()`.

### Why there was nothing to dodge

`src/hazards.js` returned an **empty list for stages one and two** — "teaching
stages carry no lethal hazard at all". That is not a tutorial, it is the
absence of the game. Every stage now spawns lethal hazards, and the first
three rows and the last two are guaranteed clear so the opening hop and the
finish are both decisions rather than reflexes.

Measured per-stage completion by a competent bot, after retuning:

```
stage  1: 98%   2: 78%   3: 75%   4: 63%   5: 68%
stage  6: 93%   7: 75%   8: 55%   9: 38%  10: 73%
```

Stage one at 98% is the number that matters for a first stage. Stage nine
(Storm) at 38% is an outlier and the next thing worth looking at.

### Also found and fixed

- **`player.hop()` never clamped the column.** Lateral input walked the player
  to col -22, off the board, into space with no tile under it and no hazard
  able to reach them.
- **The goal was simulated but never drawn.** You had to reach row 40 with
  nothing on screen saying where row 40 was. There is now a finish band, and a
  GOAL readout in the HUD.
- **`#board` had no CSS size**, so `sizeCanvas()` writing `canvas.width` grew
  the element on every resize until it pushed the timer, the lives and the
  goal readout off the bottom of the screen.
- **The camera centred the player, not the board.** At column 0 that pushed
  two thirds of the board off the right edge, so the lanes ahead were invisible.
- **The surround fill dropped the canvas transform to identity and never
  restored the device-pixel scale**, which rendered the entire board at half
  size in one corner. This one was mine, introduced an hour earlier, and it is
  why several screenshots in this session's history look wrong.
- **`assert_undeclared()` pooled declared names across all files**, so
  `scenery.js` declaring `var I` legitimised an undeclared `I` in `main.js`.
  That reference threw on frame one and killed the render loop. Each file is
  now checked against its own declarations.

### The projection changed

The board was a 2:1 dimetric: lanes ran diagonally away from the viewer, which
crushed the board into one corner and made it impossible to read a whole lane
or judge a vehicle's distance along it. It is now an orthogonal grid — columns
across, rows up, height out of the plane. Lanes are horizontal bands, forward
is up, and the whole nine-column board is always on screen.

**This means `tools/iso.py` has drifted from the browser.** The two were kept in
step deliberately, and they no longer are. `tools/render_art.py` still produces
the old diagonal gallery sheets. The Python side is a preview artefact and
nothing in the gate suite depends on its projection, but the "cannot drift"
claim in `iso.js`'s header is now false and should either be made true or
removed.

### P-12 is very likely mis-specified

The gate asks for **90% completion of the full ten-stage campaign**. With
per-stage rates like the ones above, the product is about 1% — which is what
it now reports. Reaching 90% across ten stages needs every stage at ~99.5%.

The target was almost certainly written to mean *per-stage* solvability. Either
the requirement should be re-worded, or the campaign figure should be
re-baselined to something like 10%. This is a spec question, not a tuning one.


---

## UPDATE — the two things the player reported next

### 1. The eyes were outside the player

`character.js` placed the face from the head's **left edge** plus fixed pixel
offsets (`+-9.2`, and a hard-coded half-tile of `32`) that assumed the old 2:1
dimetric. When the grid became orthogonal the tile got wider, the head's centre
moved 17.9px from where the code expected, and both eyes ended up outside the
silhouette.

The whole face is now derived from the head's **projected box** — left, right,
top and bottom measured through `Iso.projectS` — so it is correct in any
projection and cannot drift again when the camera changes. A gate draws all six
characters into a recording context and asserts the eye ellipses land inside
the head box; reintroducing the old placement fails it with exact numbers.

The feet were also 0.7x the body width, which made them poke out from under the
front face as a stray pale wedge. They are now full width.

### 2. The scene reset itself on every hop

This was the big one, and it was also the real cause of the terrible campaign
numbers.

`sim-core.js` kept a 16-row window and, whenever the player advanced far enough
that the window no longer contained the required rows, **regenerated the entire
hazard list**. That happened on *every single hop*. Every car on the board
vanished and a fresh set appeared somewhere else, so the scene visibly reset
under the player's feet. In a timing game that destroys the one thing the whole
design depends on: that what you judged is still there when you commit to it.

Rows are now generated once, on first sight, keyed in `g.generatedRows`, and
then left running. New rows appear ahead, existing cars keep driving, rows
behind are retired. Measured: a tracked hazard survives 120 ticks with **zero
position discontinuities** and moves 3.5 tiles; two frames 2 seconds apart now
differ by **0.6% of pixels** (only the cars move), where before a hop rewrote
the board.

**P-12 went from 1% to 72%** (target 90%) on the fix alone. The autoplay bot
looks one row ahead and hops if it looks clear -- it could never commit to a
decision, because the board changed the instant it did. This was never a
difficulty-tuning problem.

The gate for this one checks hazard **object identity**, not position. With a
per-row seed a full rebuild would place the same cars in the same places, so a
positional check passes while the board is being thrown away and remade -- a
check that looks green and proves nothing.


---

## UPDATE — the player was vanishing, and death had no message

### The player vanished on EVERY hop

`startHop()` read `.col` and `.row` straight off `players[i]`. But
`players[i]` is a player **WRAPPER** -- the row and column live inside the
object its `state()` returns. So the hop's target was `undefined`, the
interpolation was `NaN`, and **a `NaN` transform makes canvas discard the draw
call**. The character was being asked to draw at a position that was not a
number, so it was not drawn at all -- for the whole duration of every hop.

Found by instrumenting the live page and reading the drawn row out through the
document title: `simR5 drawRNaN`. Six frames captured across one hop show the
player present, gone, gone, present, present, present.

This had been present since the hop animation was first added.

### "I can only jump forward"

Arrow keys and WASD always worked. What did not work was **swiping**, and a
swipe was the natural gesture. The handler read the *release* point, so a
quick flick -- which usually ends up back near where it started, because the
hand is already lifting -- was read as a plain tap, and a plain tap is a
forward hop. The direction is now taken from the furthest the finger actually
travelled, and the threshold is 18px rather than 28.

### Death had no message and the scene blinked

`applyDeath()` revived the player on the same tick as the hit, so the board
teleported back to the start line with no feedback at all -- it read as the
game glitching. There is now a short `DEAD` beat (1100ms): the hazards stop,
the pursuer stops, the clock stops, the player is drawn **flattened rather
than removed** (they were being skipped by `if (!ps.alive) continue;`, so they
disappeared at the exact moment you need to see what hit you), and the game
says "You died / Tap or press any key to try again". Any input ends the beat
early.

Note this contradicts requirement R-01 in the spec ("the respawn is immediate,
with no menu and no input-blocking animation"). The player asked for a
message, so the spec line should be amended rather than the behaviour
reverted.

### A knock-on the campaign

The death beat briefly collapsed P-12 to 9%: `simulateCampaign()` had no case
for the new phase and fell through to its default "stop" branch, so every run
ended the moment anything hit the player. DEAD is not terminal -- the driver
ticks through it now. Campaign is back to **62%**. It was 72% before the beat;
the difference is the ~1.1s the world holds still, which is the cost of the
message and a fair trade.

Two more gates, each proved non-vacuous: one refuses a `startHop` that never
resolves the player's `state()` (stripping comments and excluding
`game.state()`, because both otherwise satisfy a naive substring check), and
one asserts the death beat actually freezes the world and puts the player back.


---

## UPDATE — the player is centred, and the motion is smooth

### Why the player was in the corner

Three attempts, each fixing one thing and breaking another:

1. **Centre the board.** The player starts on the board's edge, so they were
   pinned to the left of the frame for the whole stage.
2. **Centre the player, unclamped.** At column 0 two thirds of the board went
   off the right edge, so the lanes ahead were invisible.
3. **Centre the player, clamped so the board stays inside.** The board came out
   almost exactly as wide as the frame, so the clamp had nowhere to go: it
   pinned the board and the player slid around inside a fixed window, still
   off to one side.

The way out is that a follow camera can only centre the player if there is
**board on both sides of them**, which means the board must be WIDER than the
view. So:

- the board is **14 columns**; the player moves within the middle **6**
  (`playMin` 4, `playMax` 9), and lateral movement is clamped to that band
  rather than to the board;
- the camera fits **6 columns** to the width and pans freely, because a board
  wider than the frame covers the view at any offset;
- traffic is confined to the playable band, so every car on screen is a car
  that can actually hit you. The margin columns are never occupied and never
  appear in frame.

Note the trade-off, honestly: the playable road is now 6 columns wide rather
than 9, so each lane is easier to cross than it was. That is a real difficulty
reduction, not a free camera change -- and it is why P-12 went from 62% to
**96%**, so the gate is now green for the first time in the project's history.
If the curve later reads too flat, widening `playMin`/`playMax` is the dial.

### Why the motion jerked

The camera focused on the **simulated** cell, which moves instantly, while the
character was still animating toward it. The board therefore snapped a whole
row forward on the frame the key was pressed and the character caught up
afterwards -- a jolt, not a step. Measured after the fix, the camera row walks
`3.000 -> 3.233 -> 3.786 -> 4.000` across a hop instead of jumping.

Three changes:

- `playerPose()` computes one shared pose -- position, lift, squash, sway --
  and **both the camera and the character read it**, so the frame moves as one
  thing.
- the interpolation is **eased** with a smoothstep. Linear interpolation starts
  and stops abruptly, which reads as a snap at both ends of every hop. The arc
  deliberately keeps the linear progress so its apex stays mid-hop.
- hop durations came down from 520-700ms to 350-470ms. A slow step cannot hide
  any roughness in the transition, so most of the "jerk" was really "slowness".

### Gates

Two new, each proved non-vacuous: one drives the camera to every column of the
playable band and asserts the board still COVERS the frame and the player is
centred within 2px; one asserts the player starts on a whole cell in the
middle of the playable band. The camera check deliberately asserts the board
*covers* the frame rather than fitting inside it -- those are opposite
requirements, and a check written for one rejects the other.


---

## UPDATE — "a red thing keeps killing me for no reason"

That red thing was the **pursuer** (the eagle), and the player was right on
every count: it was unidentifiable, unexplainable and unavoidable.

**Why it killed constantly.** `createPursuer` set `spawnRow = playerRow` -- the
bird spawned **on the player's own row**, so it had no gap to close. The
instant it finished telegraphing it was already past them. Measured before the
fix: a player standing completely still after row 20 died in **1.13 seconds**,
barely longer than the 1.2s warning. The design intent in the spec is "cannot
be fought, blocked or outlasted, only outrun" -- i.e. it punishes *idling* --
but the implementation made it punish *existing*.

**Why it looked wrong.** It was a red square while hunting and a red triangle
while arriving, drawn at **column 0** while the player stood at column 7. The
kill rule is row-only, so it was drawn nowhere near the player and there was
no way to read what it was or where it would land.

Three fixes:

1. **It now flies in from five rows behind**, so it has to catch up. Measured
   after: a player who stands still is caught after **8.3s**; a player who
   keeps hopping is **never caught** (it falls 6.7 rows behind).
2. **It is drawn as a bird** -- body, two swept wings that rise as it closes,
   a beak, eyes and talons -- over the **player's own column**, because the
   kill is row-only and that is genuinely where it will take you. A ground
   shadow leads it and tightens and darkens as it approaches, so the approach
   is visible and the closing is a readable countdown. While it is still
   arriving there is a shrinking warning ring on the ground.
3. **The hint line says what is happening**: "A bird is coming -- keep moving!"

A player who cannot see a threat cannot avoid it, and a threat they cannot
avoid is not difficulty, it is noise. That was the actual defect behind the
report; the spawn row was the part that made it lethal.

New gate: isolates the pursuer with no traffic, and asserts a hopping player
is never caught while a standing player is caught but not within 3 seconds.
Proved non-vacuous both ways -- restoring `spawnRow = playerRow` fails on the
1.1s grace, and raising its speed above the player's fails on escapability.
