# AGENTS.md — working on this repository

This file is the entry point for an AI assistant or a new engineer. It states
what the project is, how it is put together, how to run and verify it, and —
most importantly — the invariants and traps that will bite you.

Read this before editing anything. For a fresh clone, start with `MINIMAX-HANDOFF.md`.

The portable library helper is `tools/gamekit-agent/gamekit.py`; use bounded
queries against the existing optional Minimax library. No library installation
is required to run this game. The older prerender prototype and generated
fallback-art manifest are historical tooling, not the primary 3D pipeline.

## User-requested agent roles

- **Mavis (`mavis`)** is the daily driver and default general-purpose helper for delegated implementation, fixes, verification, and documentation.
- **Explore (`explore`)** locates code, assets, or symbols across many files. Use it for broad discovery before implementation; keep its work read-only.
- Use these names when creating or reusing helpers. The primary agent coordinates ownership, integrates results, and communicates with the user.
- Both roles inherit the current model and reasoning settings unless the user requests otherwise. Definitions are in `.codex/agents/`.

## Current presentation update — 2026-10-10

The primary presentation now uses actual 3D models from the user's existing
`atiffhussainkhan/Image` library. Read
`docs/SPEC-AMENDMENT-002-library-3d.md` and `docs/ASSET-SELECTION.md` alongside
Amendment 001. No new AI artwork is allowed for this work.

Serve over HTTP (`python3 -m http.server 4173 --bind 127.0.0.1`). Three.js is
vendored locally. `src/render/world3d.js` is a native ES module reading the same
positions as the 2D fallback. `assets/models/manifest.json` defines source
models, scale, orientation and animation; provenance and licences accompany
the files. `assets.html` previews selected objects live.

The original script load order below governs simulation and the fallback.
Native WebGL modules are excluded from JavaScriptCore's `MODULES` list: model
integrity gates and actual browser inspection verify them separately. The
headless runner supports JavaScriptCore or Node and dispatches input through
main.js. `bash tools/run_all.sh` is the complete verification command.

Scoring now counts accepted forward hops; elapsed-time scoring is fixed. Stage
ten clears before a fresh Endless board; Endless deaths and retries stay in
that mode. Raster cropping/size defects below apply only to legacy fallback
artwork, not normalised 3D models.

---

## 1. What this is

**Hopper** — a lane-crossing arcade game in the Crossy Road genre, played in the
browser. Ten stages. Hop forward, dodge traffic, reach the white line before the
90-second clock runs out. You have four lives per stage.

Static browser files with no build step, bundler or npm installation. The
Three.js runtime is vendored under `vendor/three/`; all shipped models,
textures, buffers and fallback sprites are included in this repository. The
external Image library is not needed to run a clone.

Serve the repository over HTTP, then open `index.html`; direct `file://` opening
does not reliably load native modules and glTF resources. Simulation and the
fallback use classic scripts in load order. The 3D scene and model gallery use
native ES modules and the import maps in their HTML entry points.

- **Play:** `index.html`
- **Character picker:** `select.html` (24 characters; the choice is stored in
  `localStorage.chosenCharacter`)
- **The spec:** `docs/SPEC-AMENDMENT-001-shipped-product.md` defines the campaign;
  `docs/SPEC-AMENDMENT-002-library-3d.md` updates presentation, scoring and
  Endless behavior and takes precedence where they differ.
  `docs/REQUIREMENTS-FINAL.md` is the original design record and is **largely
  superseded** — see §7.
- **Portable handoff:** `MINIMAX-HANDOFF.md` gives clone-independent run and
  verification instructions.

### Also in this repository

| Path | What it is |
|---|---|
| `art/stage-references/` | The ten stage looksheets, `stage01-Suburb` … `stage10-Volcano`. The visual target each stage in `src/stages.js` is describing. |
| `docs/verification/` | Campaign sweeps over 1000 seeds, a ten-run validation log, board/death-beat screenshots, and an early character-picker prototype. Evidence for the solvability and pacing claims. |
| `docs/licensing/CC0-licence.txt` | Licence notice for the legacy fallback sprite art. |
| `assets/models/licenses/` | Original CC0/MIT notices for the selected 3D models; `assets/models/provenance.json` records per-file source and SHA-256 evidence. |
| `vendor/three/LICENSE` | MIT licence for the shipped Three.js runtime. |

---

## 2. Architecture

Positions live in the simulation, never in the renderer. The renderer reads them
and draws them where they are. One owner, two readers. If the view and the
simulation ever disagreed, a car would appear one tile from the player and kill
someone standing still on it.

```
index.html          loads the modules below, in this exact order
select.html         character picker with live 3D previews
assets.html         selected-model gallery

src/stages.js       the 10 stage definitions (lanes, palette, hazard kinds)
src/tiles.js        Tiles.laneOf(row, laneMix, key) — the ONE source of truth
                    for what a row is. Road / rail / water / grass.
src/hazards.js      hazard generation, movement, collision, solvability
src/sim-core.js     the game state machine, fixed-timestep tick, lives, phases
src/roster.js       the 24 characters: motion profile + fallback art

src/main.js         DOM input, fixed-step loop, HUD and renderer bridge
src/scenery.js      the legacy scenery vocabulary
src/render/world3d.js    primary WebGL scene, model loading/fitting/animation
src/render/model-gallery.js  shared live 3D previews for picker and asset gallery
src/render/iso.js   isometric projection for the legacy canvas fallback
src/render/scene.js fallback board: tiles, scenery, props, hazards, vignette
src/render/character.js  draws one character (sprite if it has one, else procedural)
src/render/sprite.js     loads and slices the sprite sheets
src/render/deathfx.js    the death beat: boom, then soul

assets/characters/  24 roster sprites (.webp) + 24 source .jpg
src/sprites/        Knight / Princess / Dragon animated WebP sheets
assets/models/      selected glTF/GLB models, dependencies, manifest and licences
vendor/three/       pinned browser runtime and required loader utilities
```

**Load order is load-bearing.** `sim-core.js` reads `Stages`' constants at
definition time, and `character.js` reads `Iso` at definition time. If you add a
classic simulation/fallback module, add it to `index.html` *and* to the
`MODULES` list in `tools/playtest.py`, or the headless harness will not see it.
Native WebGL modules stay outside that list; model integrity checks and real
browser inspection cover their separate loading and rendering path.

---

## 3. Running and verifying it

Run from the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`. A modern browser with WebGL2 renders the 3D scene;
the legacy canvas presentation remains a fallback if WebGL cannot initialise.

Verification requires Python 3.10+ and JavaScriptCore or Node.js. Pillow enables
checks using real fallback sprite dimensions; install it in the test environment
with `python3 -m pip install Pillow` if absent. Browser play needs none of these
test tools after the static files are served.

```sh
bash tools/run_all.sh
python3 tools/playtest.py 10 --seed 12345
```

JavaScriptCore is selected on supported macOS hosts; Node's global VM is the
portable fallback. Set `JS_ENGINE=node` to force it and `NODE=/path/to/node` if
Node is outside `PATH`. `PYTHON=/path/to/python3 bash tools/run_all.sh` selects
the Python executable.

The complete suite includes model/dependency integrity, forward scoring,
Endless transitions, hazard fairness and 1,000 seeded campaigns. The playtest:

- concatenates the real `src/*.js` in `index.html`'s order,
- runs ten randomised playthroughs through the shipped `SimCore`,
- boots `src/main.js` and steps its own `requestAnimationFrame` loop for 600
  frames,
- renders all 24 characters across all 10 stages,
- syntax-checks `main.js`,
- checks the native input handlers and 3D presentation bridge,
- and reports `RESULT: NO ERRORS` or a list of failures.

Headless stubs do not render WebGL pixels. Inspect the actual browser for
lighting, transparent silhouettes, clipping, camera bounds and animation.

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

For either supported engine, use `python3 tools/js_runtime.py /tmp/b.js` instead
of a platform-specific executable. JavaScriptCore has **no `console`** — use
`print()` in shared probes.

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
| Elapsed-time scoring | Waiting earned points while accepted hops did not. | Successful forward hops now add one point per player; waits and lateral/backward/rejected moves add none. |
| Final-stage and Endless retries | Final clear and death/retry transitions could return to campaign behavior. | Stage ten clears before a fresh Endless board; Endless death/retry remains in that mode. |

Note on the sprite pipeline: the source JPGs cannot be repaired by any matte,
because the checkerboard is baked into the pixels. `tools/build_character_pngs.py`
rebuilds them by detecting the two grid tones, classifying pixels on the axis
between them, and flood-filling from the border — connectivity, not colour, is
what protects a grey character from being erased by a grey grid.

---

## 7. Legacy fallback limitations and retained build inputs

These notes concern the older 2D fallback. Primary 3D models are grounded,
normalised and depth-tested by `world3d.js`.

1. **The fallback Chef sprite touches its file boundary.** Its old crop has no
   padding where the source reaches the edge.
2. **Fallback raster sizing uses canvas height.** Visible character heights can
   differ even when `drawH` is the same. The 3D fitter uses model bounds instead.
3. **The old painter-order probe reported occlusion inversions.** That historical
   canvas result is not a WebGL depth-test result; verify fallback layering in a
   browser if changing it.
4. **The 24 source `.jpg` files are retained build inputs.** Normal play loads the
   WebP fallback sprites or 3D assets, not these source images. Keep them in this
   source migration so the older sprite pipeline stays reproducible.

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
- **The board is wider than the playable column band (4–9).** Keep collision
  geometry and rendered vehicle lengths aligned. The 3D camera clamps horizontal
  movement to retain both lane-entry warnings and follows progress vertically.
- **The death beat is deliberate.** It is not a loading pause; it is the moment
  the player learns what killed them.

---

## 9. If you change the simulation

Run `bash tools/run_all.sh`; use `python3 tools/playtest.py 10 --seed 12345` for
a focused reproducible playtest and check all of these:

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

The portable equivalent for the last line is `python3 tools/js_runtime.py /tmp/f.js`.

Expect the geyser at roughly `open fraction ~0.45`, all rows crossable, and
`ENDLESS` reporting hazards in motion.
