# AGENTS.md — working on this repository

This file is the entry point for an AI assistant or a new engineer. It states
what the project is, how it is put together, how to run and verify it, and —
most importantly — the invariants and traps that will bite you.

Read this before editing anything.

---

## 0. The asset library — USE THIS, DO NOT GENERATE ART

**All game art comes from the user's shared library. Never generate, redraw, or
substitute placeholder art.**

```
/Users/mac/.minimax/asset-library/
```

That directory is **not** part of this repository and belongs to no game. It
holds 855MB: a catalogue of 114,852 2D images classified by game role, 1,760
preview atlases that make every one of them viewable, 12 downloaded 3D packs
(1,909 models, 791 animation clips, 11 rigged characters), and the scripts that
query and rebuild all of it. Read `/Users/mac/.minimax/asset-library/README.md`
first — it carries the licensing rules and two 3D traps that are expensive to
rediscover.

Query it from anywhere; the tools resolve paths against the library, not your
working directory:

```bash
L=/Users/mac/.minimax/asset-library
python3 $L/tools/image_search.py character     # search 30 packs
python3 $L/tools/image_search.py --3d --cc0    # 3D models, CC0/MIT only
python3 $L/tools/image_search.py --storage     # the TRUE upstream size
python3 $L/tools/build_3d_catalogue.py         # rebuild the 3D catalogue
```

Upstream is `github.com/atiffhussainkhan/Image`, **13.32GB** — 12.94GB across 65
files in GitHub *Releases* plus 395MB of git. GitHub's `repo.size` reports only
the 395MB and has never counted a Release asset; sizing anything from it is
planning for one-thirtieth of the real footprint. **The bytes are in Releases,
not git.**

**Two hard boundaries:**

- **Licensing is unresolved and is not ours to settle.** `license_status` is
  `unverified` across the whole 114,852-image set, and the four user-supplied
  artwork archives (2.08GB) are excluded from the import path entirely. 29 of
  30 *packs* are CC0-1.0 or MIT and are safe to ship. Do not redistribute
  anything the library marks unverified.
- **A `.glb` cannot be drawn by this renderer.** `src/main.js` calls
  `getContext("2d")` and `Iso.projectS()` returns `[x, y]` — two numbers. There
  is no WebGL, no scene graph, no camera; every "3D" thing here is a filled 2D
  polygon. A glTF model is a mesh hierarchy with a skeleton and animation clips.

So a 3D asset must be **pre-rendered offline to sprite sheets** and drawn as
2D, or the renderer has to be replaced with a real 3D one. That is a renderer
decision to confirm with the user, not an import to perform.

---

## 1. What this is

**Hopper** — a lane-crossing arcade game in the Crossy Road genre, played in the
browser. Ten stages. Hop forward, dodge traffic, reach the white line before the
90-second clock runs out. You have four lives per stage.

Pure static files. No build step, no bundler, no framework, no dependencies. Open
`index.html` and it runs. Everything under `src/` is plain ES5-style JavaScript
loaded by `<script>` tags in load order.

- **Play:** `index.html`
- **Character picker:** `select.html` (24 characters; the choice is stored in
  `localStorage.chosenCharacter`)
- **The spec:** `docs/SPEC-AMENDMENT-001-shipped-product.md` is authoritative.
  `docs/REQUIREMENTS-FINAL.md` is the original design record and is **largely
  superseded** — see §7.

### Also in this repository

| Path | What it is |
|---|---|
| `art/stage-references/` | The ten stage looksheets, `stage01-Suburb` … `stage10-Volcano`. The visual target each stage in `src/stages.js` is describing. |
| `docs/verification/` | Campaign sweeps over 1000 seeds, a ten-run validation log, board/death-beat screenshots, and an early character-picker prototype. Evidence for the solvability and pacing claims. |
| `docs/licensing/CC0-licence.txt` | **The licence covering the third-party sprite art.** The Knight/Princess/Dragon sheets and the 24 roster images derive from CC0 cartoon art. Read this before redistributing the assets or swapping in art of your own. |

---

## 2. Architecture

Positions live in the simulation, never in the renderer. The renderer reads them
and draws them where they are. One owner, two readers. If the view and the
simulation ever disagreed, a car would appear one tile from the player and kill
someone standing still on it.

```
index.html          loads the modules below, in this exact order
select.html         character picker

src/stages.js       the 10 stage definitions (lanes, palette, hazard kinds)
src/tiles.js        Tiles.laneOf(row, laneMix, key) — the ONE source of truth
                    for what a row is. Road / rail / water / grass.
src/hazards.js      hazard generation, movement, collision, solvability
src/sim-core.js     the game state machine, fixed-timestep tick, lives, phases
src/roster.js       the 24 characters: motion profile + fallback art

src/render/iso.js   the isometric projection. Everything draws through this.
src/render/scene.js the board: tiles, scenery, props, hazards, the vignette
src/render/character.js  draws one character (sprite if it has one, else procedural)
src/render/sprite.js     loads and slices the sprite sheets
src/render/deathfx.js    the death beat: boom, then soul

assets/characters/  24 roster sprites (.webp) + 24 source .jpg
src/sprites/        Knight / Princess / Dragon animated WebP sheets
```

**Load order is load-bearing.** `sim-core.js` reads `Stages`' constants at
definition time, and `character.js` reads `Iso` at definition time. If you add a
module, add it to `index.html` *and* to the `MODULES` list in
`tools/playtest.py`, or the headless harness will not see it.

---

## 2b. SEEING the game

Structural tests prove structure. They do not prove appearance — a canvas that
renders black passes every one of them. There is now a browser:

```bash
export PATH="$HOME/.local/node/bin:$PATH"
python3 -m http.server 8765 --bind 127.0.0.1     # from the project root
node tools/shoot.js http://localhost:8765/select.html /tmp --play
```

Writes `/tmp/shot_*.png`, reports console errors, and prints a canvas pixel
histogram. Node 22.14.0 lives in `~/.local/node`, Playwright in `~/.local/pw`;
both are local, free, and removable by deleting those folders.

**When a change is visual, verify it with a picture.** Report `unverified`
rather than inferring appearance from a clean console.

## 3. Running and verifying it

There is no browser automation in this environment (no Chrome, no Node). The game
is verified by driving the real source in **JavaScriptCore**.

```
python3 tools/playtest.py 10
```

This is the gate. It:

- concatenates the real `src/*.js` in `index.html`'s order,
- runs ten randomised playthroughs through the shipped `SimCore`,
- boots `src/main.js` and steps its own `requestAnimationFrame` loop for 600
  frames,
- renders all 24 characters across all 10 stages,
- syntax-checks `main.js`,
- and reports `RESULT: NO ERRORS` or a list of failures.

Expected on a healthy tree:

```
sprites resolved: 24/24   loader ready: true
main.js: booted=true  frames=600
forward-only policy: 2/10 cleared a stage   (non-zero — proves it is beatable)
RESULT: NO ERRORS
```

**`forward-only policy: 0/10` is a red flag**, not a pass. It means a naive
player can no longer finish, which usually means a lane has become unclearable.

### Writing a new probe

```bash
python3 tools/build_bundle.py tools/probes/my_probe.js /tmp/b.js
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc /tmp/b.js
```

JavaScriptCore has **no `console`** — use `print()`.

---

## 4. Traps. Read these; they will cost you an hour otherwise.

**A probe bundle EMBEDS THE SOURCE TEXT.** `build_bundle.py` writes the modules
inline. If you edit `src/` and re-run an old `/tmp/b.js`, you are measuring the
code from *before* the edit — and it will cheerfully report that your change did
nothing. Always regenerate. This happened during development and produced one
confidently wrong measurement.

**There is no `PHASES.FINISHED`.** The phases are `READY, RUNNING, DEAD,
STAGE_CLEAR, STAGE_FAILED, GAME_OVER, ENDLESS`. Reaching the goal is
`STAGE_CLEAR`. Comparing against `PHASES.FINISHED` compares against `undefined`,
matches nothing, and reports a clean win as a loss.

**`createGame()` always opens on stage 0.** To test another stage call the
exported `game.startStage(index)`. Skip that and you will compare one stage's
hazards against another stage's lane mix and manufacture a screenful of
fictional "lane mismatch" bugs.

**A canvas silently drops a `drawImage` with NaN arguments and logs nothing.**
That is how a character vanishes with a clean console. The `Ctx` stub in
`tools/playtest.py` deliberately *throws* on any non-finite coordinate. Use it
rather than trusting a visual.

**Milliseconds and seconds.** `tick(dtMs)` takes **milliseconds**. Hazard speed
is tiles per **second**. Getting this wrong is silent and catastrophic — see the
geyser clock in §6.

**`Hazards.isStaged()` / `isTelegraphing()` matter everywhere.** A hazard that
is on the board but not yet armed is a car the player can see that cannot hurt
them, which is the one thing this must never be. Collision, rendering and the
solvability sweep must all check it.

---

## 5. Invariants — do not break these

1. **One direction during the read.** Every hazard armed at t=0 points the same
   way (`READ_DIR`). The opposite direction is what arrives at 15s. If you
   randomise per row, there is no "then they start coming from the other side",
   because there was never a side to begin with.

2. **Rail hazards telegraph for 1200ms** before they can hit anything. That is
   longer than the 600ms hop cadence and the 550ms traverse window. Without the
   warning the lane is not hard, it is unclearable.

3. **`ensureSolvable()` judges at SPRINT speed, not the easy opening speed.** A
   gap that only exists at 1.0× is not a gap. It must judge the *same board the
   game runs*: same wrap period, same columns the player can occupy (4–9), same
   hit margin. It got this wrong once — wrap at 12 tiles against the game's 17,
   columns 0–8 against the real band — and 88 of 813 rows were certified
   crossable and were not.

4. **Lawn never carries traffic.** A car on ground the renderer drew as lawn is
   the "looks walkable, is lethal" defect. `pickKind()` returns null for grass
   for exactly this reason.

5. **Rows are generated once, on first sight, and left running.** The old code
   rebuilt the whole window whenever the player advanced a row, so every car
   vanished and reappeared elsewhere — the board visibly reset itself under the
   player's feet. `generatedRows` is the ledger that prevents it.

6. **A hazard arming on top of a player is pushed to the lane entry and drives
   in.** It must not materialise on top of somebody.

7. **Death is a 2100ms freeze, not a teleport.** The board and clock stop so the
   player can see what killed them. Any input skips the beat.

---

## 6. Bugs found and fixed — read before "optimising" these areas

| Bug | Symptom | Fix |
|---|---|---|
| Cycled hazards never cycled | `tickHazards` returned early for `kind:"air"` **before** the cycle advance. A geyser open 1200 of every 3000ms reported itself open for **10,000ms of 10,000ms**. Row-wide and unwarned. | Advance the cycle before the air early-out. |
| Cycle clock units | Seeded in ms, advanced by `dt` (seconds) — 1000× slow. Masked by the bug above. | Advance by `dtMs`. |
| `laneHasGap` judged a different board | 88/813 rows (10.8%) certified crossable and were not. | Filter mirrors `tickHazards` and `hits()` exactly. |
| `ENDLESS` was inert | Returned before the hazard update, discarded the pursuer's kill. Over 600s: hazards 14→14, none moved, 0 deaths, player reached row 1001 on 4 lives. | Mode now runs hazards, collision and the pursuer. |
| Empty stage opening | The density boost lived in `buildHazards()`, which the game never calls — it deals rows via `hazardsForRow()`. Stage 7 started **15%** of its hazardous lanes. | One shared `rowDensity()`. Rows 1–6 guaranteed: **97%** armed at t=0. |
| Checkerboard behind sprites | Source JPGs were flattened over a grey checkerboard. A permanent opaque rectangle behind every character. No matte or cache-bust could remove it — it was in the pixels. | Rebuilt as transparent WebP. 10.5MB → 0.92MB. |
| Permanent cache-buster | `?t=Date.now()` on every sprite re-downloaded 24 files on **every** page load, and never helped. | Removed. Staleness is handled by the filename. |

Note on the sprite pipeline: the source JPGs cannot be repaired by any matte,
because the checkerboard is baked into the pixels. `tools/build_character_pngs.py`
rebuilds them by detecting the two grid tones, classifying pixels on the axis
between them, and flood-filling from the border — connectivity, not colour, is
what protects a grey character from being erased by a grey grid.

---

## 7. Known-open defects — genuine, not fixed

1. ~~Score accrues per elapsed millisecond~~ — **FIXED.** `SCORE_PER_HOP = 10`,
   awarded in `hop()`. Verified: 10s idle scores 0; 10s hopping scores 180.
2. **`char_18` (Chef) is truncated in its source art** — 376 solid pixels on the
   bottom row. Not a crop bug: those pixels do not exist in the original. It
   needs a different source image. The other 23 are clean.
3. **Roster sprites are sized by canvas height, not character height** —
   42.0–44.3px at `drawH: 46`, a 5.5% spread. Minor. `drawH: 46` means "46px of
   canvas", not "46px of character".
4. **~734 nearer-object occlusion inversions per 2956 frames** in the board
   render. Inferred and reproduced with a row-offset test, but never confirmed
   against a real browser rasteriser, because JavaScriptCore has no pixel
   output.
5. **The 24 source `.jpg` files occupy 16.16MB** and ship to no player. They are
   build inputs and must stay for the sprite rebuild to be reproducible — but
   they should probably not be in the deployable tree.

---

## 8. Design intent you should not accidentally destroy

- **The fifteen-second beat is the whole difficulty curve.** One vehicle per row
  at 0s, a second at 15s, a third at 30s, and so on. The sprint (75–90s)
  accelerates what is already on the board to 2.2× and deliberately spawns
  nothing new — a last fifteen seconds that introduces an unseen obstacle is a
  coin flip; one that accelerates what they already know is a test.
- **The opening is denser than it looks.** Rows 1–6 are guaranteed to carry
  traffic, so the player meets the game in their first seconds. Per row it is
  still only ONE vehicle at base speed, against five at 2.2× later — that is
  what lets the 15s doubling read as a change rather than as noise.
- **The board is wider than the view** so the camera can follow the player. This
  is why traffic is confined to the player's column band (4–9): a car in a column
  nobody can enter is neither a threat nor worth rendering.
- **The death beat is deliberate.** It is not a loading pause; it is the moment
  the player learns what killed them.

---

## 9. If you change the simulation

Run `python3 tools/playtest.py 10` and check all of these:

- `RESULT: NO ERRORS`
- `sprites resolved: 24/24`
- `main.js: booted=true`, `frames=600`
- `forward-only policy:` **non-zero**
- `main.js parse check: PASS`

Then re-run the hazard probes, which pin the specific numbers:

```bash
python3 tools/build_bundle.py tools/probes/fix_verify.js /tmp/f.js
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc /tmp/f.js
```

Expect the geyser at roughly `open fraction ~0.45`, all rows crossable, and
`ENDLESS` reporting hazards in motion.