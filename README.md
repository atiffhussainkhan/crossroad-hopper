# Hopper Game

An original lane-crossing arcade game in the Crossy Road genre, specified from a
ten-dossier research programme covering twenty games.

## What is here

| File | What it is |
|---|---|
| `docs/DEVELOPMENT-PLAN.md` | **Read third, then build from this.** Seven phases from spec remediation to release, with 10 build gates, acceptance thresholds, a risk register, and a definition of done |
| `docs/STAGE-DESIGN.md` | **The campaign.** Ten stages, the difficulty ladder, lives, two-player mode, and every requirement the stage design changes |
| `docs/REQUIREMENTS-FINAL.md` | **The single final requirements document.** 35,653 words: the consolidated specification, the superseded base spec, and all ten dossiers, with a generated contents list and requirement index |
| `docs/SENIOR-REVIEW.md` | An independent senior-engineer review finding 12 blocking defects. Phase 0 of the plan exists to close them |
| `docs/mega-requirements.md` | Part 1, standalone: 77 consolidated requirements, 6 resolved conflicts, 19 corrections |
| `docs/genre-requirements.md` | Part 2, superseded in part: the base spec the research began from |
| `docs/dossiers/01`–`10` | Part 3: ten research dossiers, 117 harvested requirements |
| `docs/review-01`–`03` | The three underlying reviews, by lens: completeness, consistency, delivery risk |
| `tools/build_final_doc.py` | Regenerates the final document and self-checks its stated counts |
| `index.html` | The playable. Open it in any browser |
| `src/stages.js` | The ten stages as a data table: palette, baseline, lane mix, hazards |
| `src/sim-core.js` | Pure-JS core: rng, player, pursuer, and the stage state machine |
| `src/main.js` | DOM only: rendering, input, fixed-timestep loop, phases |
| `src/style.css` | Shell styles, including reduced-motion fallback |
| `tools/simulate.js` | JXA wrapper that drives the real modules from a temp file of seeds |
| `tools/check_vertical_slice.py` | Stage-loop gate: 1000 campaigns plus structural probes |
| `tools/run_all.sh` | One command, every gate. `bash tools/run_all.sh` |

## Reading order

1. `STAGE-DESIGN.md` — what the game actually is
2. `SENIOR-REVIEW.md` — what was wrong with the original specification
3. `REQUIREMENTS-FINAL.md` — the specification itself
4. `DEVELOPMENT-PLAN.md` — how to get to a shipped build

## Status

| Phase | Status |
|---|---|
| 0 — Spec remediation (12 defects) | **Complete** |
| 1 — Stage campaign + vertical slice | **Complete** |
| 2 — Hazards: three lane classes, six tile types | Pending |
| 3 — Generation and solvability | Pending |
| 4 — Economy, roster, stat cards | Pending |
| 5 — Scenery rendering, particles, audio, accessibility pass | Pending |
| 6 — Release | Pending |

**Phase 1, what works now.** Open `index.html`:

- Ten stages, each a different scene and palette, all driven by one data table
- A 90-second clock and a 40-row goal line; reach the line before time out
- Difficulty climbing every 15 seconds, on top of a per-stage baseline
- Four lives per player; dying costs a life and respawns you instantly
- Running out of lives retries **that stage**, never the campaign
- A one/two-player toggle; both players hop at once on a shared clock
- Clearing stage 10 unlocks Endless mode, which scores on distance forever

**The one test the gate cannot run** is the death-to-restart interval. Play
until you die, and the HUD shows it. The plan's threshold is median under
300 ms, worst case under 1000 ms; the deterministic parts are gated, the
number itself is yours to read.

## Research programme

Ten agents each took two games and produced a dossier containing verified
mechanics, distinctive requirements, causes, browser-buildability ratings,
conflicts, and a ranked harvest list. Every claim that could not be traced to a
credible source was marked UNVERIFIED rather than asserted, and that discipline
mattered: verification overturned nineteen claims, including the base spec's
central commercial argument.

Notable results are written up in the corrections table at the top of
`docs/mega-requirements.md`. Three are worth knowing before reading further:

- **Shooty Skies is not Hipster Whale and not isometric.** It is Mighty Games, a
  sister studio whose founders Hipster Whale's Matt Hall and Andy Sum co-direct.
  The shared-engine thesis does not hold.
- **Piffle has no paddles.** It is a ball-breaker with angle-only aiming. Its
  harvestable mechanic is finite ammunition replenished by defeating a hazard.
- **The Crossy Town failure story is untraceable.** The base spec's whole case
  against cloning rested on it, and its only source is a dead URL with no
  archive capture.

## The game the requirements describe

A discrete isometric hopper where a distance-gated pursuer that cannot be fought
pressures the player forward, a depleting gauge replenished by a specific tile
supplies the difficulty ramp without any numeric curve, and per-tile type tags
rewrite the rules of a row rather than its spacing.

Three properties set it apart from the genre, each traceable to a harvested
mechanism rather than to invention: the difficulty curve is spatial rather than
temporal; stalling is bounded by an unblockable pursuer rather than a stopwatch;
and the ammunition economy is closed, tying offence to survival.

## Buildable scope

Everything specified is buildable on a static HTML, CSS and JavaScript stack
with no build step, no server and no third-party SDK. Two requirements are not:
a community collection bar and a submitted rival score, both of which need a
backend. Neither changes the core loop, and both are marked X-class deferrals in
the mega document.

## Status

Research complete. Not started: the build. The first buildable increment is
defined at the end of `docs/genre-requirements.md` and consists of the Tier A
movement, board, pressure and restart requirements, and nothing else.
