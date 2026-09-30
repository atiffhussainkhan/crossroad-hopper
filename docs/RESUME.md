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
