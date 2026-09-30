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
