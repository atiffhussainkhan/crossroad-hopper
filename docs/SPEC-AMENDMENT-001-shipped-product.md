# SPEC AMENDMENT 001 — the shipped product is a staged campaign

**Status:** ratified. **Date:** 2026-10-07. **Supersedes:** the requirements in
`REQUIREMENTS-FINAL.md` listed under "Superseded" below.

---

## Why this document exists

A conformance audit compared `REQUIREMENTS-FINAL.md` against the shipping code and
found they describe **different products**.

The specification mandates an *endless, zero-lives, instant-death* grinder with a
hold-to-grind verb, a depleting gauge, a coin economy, a daily challenge and audio.
The shipped game is a **ten-stage timed campaign** with four lives, a ninety-second
clock and a finish line.

That is not drift. It is a fork in the road that was taken knowingly, and it is
recorded here so the next reader does not have to rediscover it by auditing 3,271
lines against a running game.

**The game is authoritative. This amendment updates the specification to match it.**
The requirements below are what the code actually does, stated precisely enough to
be tested. Where the shipped behaviour is arguably worse than what the spec asked
for, that is noted honestly rather than smoothed over.

---

## 1. Superseded requirements

These rows are withdrawn. The product does not do these things and is not going to.

| ID | Original requirement | Disposition |
|----|----------------------|-------------|
| S-01 | World is endless, no finish line, no level completion | **Withdrawn.** The campaign has ten stages and a goal line at `GOAL_ROW_OFFSET = 40`. |
| P-15 | Instant death, no health pool, one collision ends the run | **Withdrawn.** A stage grants `STAGE_START_LIVES = 4`. |
| X-01 | Lives never decrease without a currency spend | **Withdrawn.** No currency system exists; see §4. |
| X-02 | No energy gate and no play timer on the core loop | **Withdrawn.** Each stage runs on a 90-second clock. |
| X-04 | Restart position equals death position | **Withdrawn.** Death restarts the stage at row 0. |
| R-01 | Median death-to-restart < 300ms | **Withdrawn.** The death beat is a deliberate 2,100ms freeze. |
| P-13 | Score is the sum of forward hops | **Withdrawn.** See §3 — this one is a genuine defect and is being fixed, not withdrawn. |
| P-09 | Difficulty must not be a function of wall-clock | **Withdrawn.** A stage escalates on a 15-second beat by design. |
| G-01, G-02 | Hold-to-grind is the player's offensive verb | **Withdrawn.** No grind verb. Hopping forward is the whole verb. |
| P-08, P-11 | A depleting gauge limits occupiable tiles | **Withdrawn.** No gauge. |
| E-01…E-11, S-06 | Coin economy, shop, upgrades, insurance | **Withdrawn.** No economy. |
| AU-01…AU-03 | Audio | **Withdrawn.** The game is silent. |
| S-02, S-03, S-04 | Daily challenge, seeded by date | **Withdrawn.** Seeded by campaign + stage + attempt. |
| NF-04 | Versioned service worker, evicts prior cache | **Withdrawn.** Self-hosted static files; offline is not a deployment target. |

**Honest note.** The game is *more forgiving and more guided* than the spec
demanded, and *less replayable* than it asked for. Both were deliberate trade-offs
for a game that reads clearly on a first play.

---

## 2. The loop that actually ships

1. **READY.** The stage is shown and the world is frozen. Nothing moves. A first
   hop starts the stage — hazards are generated only once `phase === RUNNING`, so
   the player cannot be killed before they have moved.
2. **RUNNING.** The player hops forward one row per input, and left/right within
   their column band (`playMin = 4` … `playMax = 9` on a 14-wide board).
3. **DEAD.** A hit freezes the board and the clock for `DEAD_BEAT_MS = 2100` so the
   player sees what killed them. One life is spent. Any input skips the beat.
4. **STAGE_CLEAR.** Reaching the goal line banks the stage and advances.
5. **STAGE_FAILED.** The clock expired, or lives reached zero.
6. **ENDLESS.** After the tenth stage: no clock, no goal row, difficulty keeps
   climbing, the pursuer never stops. **Traffic still runs and can still kill** —
   an earlier revision returned before the hazard update, which made the mode
   inert (a hop counter on a frozen board).

### The fifteen-second beat

A stage is **six fifteen-second intervals**, and each is louder than the last.
This is the entire difficulty curve:

| Elapsed | What changes |
|---------|--------------|
| 0s | THE READ. One vehicle per row, all travelling the same way (`READ_DIR`). Every hazardous row in rows 1–6 is **guaranteed** to carry traffic. |
| 15s | The second vehicle joins each row, travelling the *opposite* way. |
| 30s | A third per row. |
| 45s | A fourth. |
| 60s | A fifth — the busiest the board gets. |
| 75s | THE SPRINT. Everything already on the board accelerates to 2.2× for the last 15s. Nothing new spawns. |

Speed is a pure function of elapsed time — `speedFactorAt()` — which is what makes
the curve testable without running a game.

### Fairness guarantees

- **B-06** — a rail hazard is announced at the lane edge and cannot hit anything
  for `TELEGRAPH_MS = 1200`, which is longer than the 600ms hop cadence and the
  550ms traverse window. A player is never killed by something they could not
  have seen coming.
- **P-12** — `ensureSolvable()` guarantees every generated lane leaves a crossable
  gap, judged at **sprint speed**, not at the easy opening speed. It drops a
  hazard rather than keep a lane nobody can cross. The filter judges the board the
  game actually runs: the same wrap period, the same columns the player can
  occupy, the same hit margin.
- A hazard that is about to arm on top of a player is pushed back to the lane
  entry and **drives in** rather than materialising.

---

## 3. Defects found and fixed under this amendment

| Defect | Symptom | Fix |
|--------|---------|-----|
| **Cycled hazards never cycled.** `tickHazards` returned early for `kind: "air"` before reaching the cycle advance, so a geyser's clock never moved. | Row-wide geysers permanently open and unwarned. Measured: a geyser declaring open-1200-of-every-3000ms reported itself open for **10,000ms of 10,000ms**. | Advance the cycle before the air early-out. Now measures 4,617ms open / 5,383ms closed over 10s. |
| **Cycle clock unit mismatch.** Seeded in milliseconds, advanced by `dt` (seconds). | 1000× too slow — masked by the bug above. | Advance by `dtMs`. |
| **`laneHasGap` judged a different board.** Wrong wrap (12 vs 17 tiles), wrong columns (0–8 vs the real 4–9), wrong margin (0.30 vs 0.28). | **88 of 813 rows (10.8%) were certified crossable and were not.** All 88 carried a sinkhole; 0 of 704 rows without one failed. | Filter now mirrors `tickHazards` and `hits()` exactly. |
| **`ENDLESS` was inert.** Returned before the hazard update and discarded the pursuer's kill. | Over 600s: hazards 14→14, none moved, 0 deaths, player reached row 1001 on 4 lives. | Mode now runs hazards, collision and the pursuer. Lives now drop. |
| **Empty stage opening.** The early-density boost lived only in `buildHazards()`, which the running game never calls — it builds rows via `hazardsForRow()`. | Measured over 40 seeds: stage 1 started 49% of its hazardous lanes, stage 7 started **15%**. A player could stand still through the first 20 seconds. | One shared `rowDensity()`. Rows 1–6 guaranteed: **97% armed at t=0**. |
| **Roster sprites had a checkerboard baked in.** The source JPGs were flattened from transparent PNGs over a grey swatch. | A permanent opaque rectangle behind every character. | Rebuilt as transparent WebP. Alpha round-trips bit-exact. 0.92 MB total. |

**Still open, not fixed:**

- `P-13` — score accrues per elapsed millisecond (`stageScore += players * dt * 0.01`),
  so standing still scores. A hop adds nothing. *Genuine defect; queued.*
- `char_18` (Chef) is severed at its file boundary — the crop clamps to the source
  height, so a sprite touching the edge gets no padding.
- Roster sprites are sized by canvas height, not character height, so members
  render at 37.9–42.2px — a 10.8% spread.
- The 24 original `.jpg` sources occupy 16.16 MB and ship to no player. They are
  build inputs and must stay for `build_character_pngs.py` to be reproducible.

---

## 4. What the game is not

No economy. No shop. No audio. No daily challenge. No grind verb. No gauge.
No save beyond the chosen character. No service worker.

`localStorage` holds exactly one key, `chosenCharacter`. If that is lost the
player picks again and loses nothing but the click.

---

## 5. How to verify this document

Every claim above is checkable headlessly, without a browser:

```
python3 tools/playtest.py 10
```

It concatenates the real `src/*.js` into JavaScriptCore, drives the shipped
`SimCore`/`Scene`/`CharacterRenderer`/`SpriteSheets` through ten randomised
playthroughs, **boots `src/main.js` and steps its own `requestAnimationFrame`
loop** for 600 frames against a canvas stub that throws on any non-finite
coordinate — because a real canvas silently drops a `drawImage` whose arguments
are NaN, which is precisely how a character vanishes with an empty console.

Expect: `RESULT: NO ERRORS`, 24/24 sprites resolved, and a non-zero number of
forward-only runs reaching `STAGE_CLEAR` (proving the board is beatable).

Measurement notes, for anyone repeating the work:

- There is **no `FINISHED` phase**. Reaching the goal is `STAGE_CLEAR`. Keying
  off `PHASES.FINISHED` compares against `undefined`, matches nothing, and
  reports a clean win as a loss.
- `createGame()` always opens on stage 0. Use the exported `game.startStage(i)`
  or you will compare one stage's hazards against another stage's lane mix and
  manufacture a screenful of fictional mismatches.
- A probe bundle **embeds the source text**. Re-running a stale bundle after an
  edit measures the code from before the edit. `tools/build_bundle.py` exists so
  that cannot happen.