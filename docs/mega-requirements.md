# Mega requirements document: a combined lane-crossing arcade game

The consolidated output of a ten-dossier research programme covering twenty
games. Each dossier was produced by an independent agent working from a common
base specification, and each was required to mark any claim it could not trace
to a credible source as UNVERIFIED.

This document merges 117 harvested items into one coherent, conflict-resolved
specification for a single game. Where the dossiers disagreed with each other,
or with the base specification, the disagreement is recorded rather than
smoothed over.

Base spec: `docs/genre-requirements.md` · Dossiers: `docs/dossiers/01`–`10`
Harvested requirements: 117 · Consolidated requirements: 97 · Recorded
corrections: 19 · Blocking defects closed: 12

---

## Tier definition

Tiers reflect what the build cannot survive without, not how the player feels.

- **Tier A — load-bearing.** Removing or breaking this requirement invalidates
  shipped work, the build gate, or the genre contract. Tier A requirements
  carry a numeric pass threshold and a measurement method.
- **Tier B — retention-bearing.** Removing it does not break the build but
  breaks the reason a player returns. Tier B requirements carry a numeric
  threshold where one applies; subjective terms are removed.
- **Tier C — differentiation.** Removing it produces a working game that plays
  identically to every other game in the genre. Tier C requirements carry
  thresholds only where one is meaningful.

This replaces the earlier tiering, which was defined only in gameplay terms
and could not express load-bearing engineering requirements (persistence, the
performance budget, the solvability guarantee).

---

## Phase 0 of the development plan

This document reflects Phase 0 of `docs/DEVELOPMENT-PLAN.md`. Twelve blocking
defects from `docs/SENIOR-REVIEW.md` are closed in the rewrite:

| # | Defect | Resolution in this version |
|---|---|---|
| 1 | Depletion gauge has no failure state; X-02 forbids a gate | P-08/P-09 reformulated as a **route constraint** that reduces the count of safely occupiable tiles. The gauge never ends the run, so X-02 is preserved and the spatial ramp remains |
| 2 | The grind has no requirement | New G-01 specifies hold-to-grind, the streak meter, and the spend. Four dependents (P-04, S-13, P-03, E-08) now have something to reference |
| 3 | E-08 (closed ammunition) is unimplementable | E-08 **cut**, with reason recorded. The stated benefit, removing the idle timer, is delivered by P-02 |
| 4 | Camera requirements contradict each other and the conflict resolution | P-06 (the stopwatch form of camera creep) **deleted**. P-05 is the rendering concern; anti-stall pressure is in P-02 |
| 5 | Run lifecycle cannot hold four requirements at once | B-09 redefined as a within-run recovery that costs accumulated currency but not position. Clears X-04 and R-06 |
| 6 | Two competing difficulty ramps | P-09 governs ordinary play, P-13 becomes the scoring function rather than a ramp, S-03 applies only to the daily challenge. Three sentences in the resolutions |
| 7 | Tier A rules have no offence verb to build on | New G-02 states the scope: the player has no action verb other than movement and dismissal, except G-01 |
| 8 | Persistence is an intention, not a mechanism | New SV-01 specifies the entity set with pool size and lifetime; SV-02 specifies the save schema with key, version, write trigger, and corrupt-recovery path |
| 9 | Many requirements are untestable | Every Tier A requirement now carries a numeric threshold and a measurement method, asserted by `tools/check_testability.py` |
| 10 | Traceability worse than the header claims | All 117 harvested requirements have a disposition in `docs/disposition-table.md`. Source column in this document is now exhaustive. |
| 11 | Tiers were defined only in gameplay terms | Replaced with the load-bearing / retention-bearing / differentiation definition above |
| 12 | Fourteen requirement categories were absent | Twenty-six new requirements across eight namespaces added, sourced from `docs/review-01-completeness.md` |

---

## Corrections to the base specification

The verification pass overturned nineteen claims. Several were load-bearing, and
one removed the evidentiary basis for the base spec's central argument. They
are listed first because everything below depends on them.

| Claim in base spec | Status | Finding |
|---|---|---|
| Crossy Town: 3 developers, 1 month, ~500,000 installs, ~$50 first-month revenue, zero purchases, developers concluded it failed | **UNTRACEABLE** | The cited source returns HTTP 404 and has zero captures in the Internet Archive's complete wnhub.io index. No Crossy Town listing exists in the iTunes Search API for the US, BR, PT or GB storefronts. Every figure is unverified. The base spec's entire "commercial case against cloning" rested on this |
| "Dreaming of Voxel Goats" is a postmortem of unsuccessful Crossy Road-like games | **REFUTED** | It is a development log of a game at 170,000+ installs, 105,000 leaderboard entries and 4.5 stars while Apple featured it. Its menu-loop conclusion is a design argument, not a measured failure |
| "App store policy explicitly declines to act against a gameplay-differing clone" | **MISATTRIBUTED** | This is one journalist's characterisation in trade press, not platform text. Apple's 5.2 and Google's IP policy cover copyright, trademark and patent only; neither mentions gameplay |
| Sonic Dash, 2015, Sega | **REFUTED** | It is 2013, developed by Hardlight at SEGA Leamington Spa |
| Wall riding is an Alto's Adventure feature | **REFUTED** | Wall riding is new in Alto's Odyssey, per Snowman's own feature list |
| Zen Mode is an Alto's Odyssey feature | **REFUTED** | Zen Mode predates it, originating in Alto's Adventure as a "therapeutic tool" |
| Shooty Skies is a Hipster Whale title reusing an isometric grid | **REFUTED ON BOTH COUNTS** | It is a Mighty Games title (a sister studio whose founders Hipster Whale's Matt Hall and Andy Sum co-direct), and it is a top-down oblique perspective, not isometric. The shared-engine thesis does not hold |
| Piffle uses drag-length power and paddles | **REFUTED** | Store copy describes angle-only aiming and a bouncing ball. Piffle is a ball-breaker with no paddle; the ball is the avatar |
| Same-device multiplayer is a Piffle feature | **MISATTRIBUTED** | It appears verbatim in Crossy Road's own listing, and the "Space Station 115" text belongs to Crossy Road Castle |
| Paper.io is real-time multiplayer | **REFUTED for 2016** | The 2016 release states it does not require an internet connection; opponents are AI. Real-time multiplayer is the 2018 sequel |
| Temple Run 2 spends coins on permanent home decoration | **UNVERIFIED** | No credible Temple Run 2 source was reachable. The base spec cited the Subway Surfers wiki. The sourced finding is the inverse: the developer admits they ran out of things for players to spend coins on |
| Subway Surfers has eight power-ups | **UNVERIFIED** | The community wiki states five main power-ups and lists fourteen across three families |
| Crossy Road Castle uses hundreds of hand-designed rooms | **UNVERIFIED** | Official copy and developer statements say only "procedurally generated" |
| Crossy Road Castle adapts difficulty to group performance | **REFUTED** | The verified rule is group advancement: if one player clears a room, all move on |
| Crossy Road Castle has coin scarcity increasing with progress | **REFUTED** | Coins are officially "a common collectable" at flat prices |
| Crossy Road Castle has a boss every 30 stages | **UNVERIFIED** | Verified only as "a regular boss appearance", with no interval |
| Doodle Jump's camera never scrolls downward | **UNVERIFIED** | The death condition is stated in official listings; the camera implementation is described nowhere but clone farms. Behaviourally equivalent readings exist, so the risk is low |
| River Raid's generation was motivated by cartridge limits | **UNVERIFIED** | The algorithm is verified; the stated motive is not in the cited source |
| Alto's Odyssey's lemurs can only be escaped by going faster | **UNVERIFIED** | The never-fight and never-outlast halves are sound, but community sources give a second exit. Alto's Odyssey has no internet-free claim: it uses iCloud sync, so FR-40's "no account" is not satisfied |

**Flappy Bird clone flood, now verified** (the base spec had no figures):
PocketGamer.biz, 5 March 2014, from a 300-clone sample: 60 clones per day, 2.5
per hour, one every 24 minutes, and 14 in a single hour on peak days.
**Crossy Road clone flood:** no numeric count from any outlet was found, before
or after. The only verified statement is Matt Hall's remark that "the mountains
of clones hasn't exactly hurt his company's ability to make money off
Crossy Road." A $100 template for the mechanic was sold commercially.

The consequence is a change of argument rather than of conclusion. The base
spec concluded that faithful clones fail because they miss the loop. The verified
evidence supports a different and better-supported claim: the mechanic becomes
public property within roughly 72 hours of featuring, and a complete clone of
the movement rules is available for about $100. Nothing in the verified record
shows a faithful clone failing on mechanics. What the record does show is that
the surviving clones are ordinary, and that originality budget belongs above the
mechanic rather than inside it.

---

## Consolidated requirement set

Ninety-seven requirements across eleven groups: the original seven (M, B, P, R,
E, S, X) plus four new (G for grind mechanic, NF for non-functional, AC for
accessibility, AU for audio), and SV (state and persistence), QA (quality
gates), LG (legal), DP (device handling), and CP (content pipeline) folded
into the table.

Tier A is load-bearing. Tier B is retention-bearing. Tier C is differentiation.
Every Tier A row carries a threshold column: the number a build gate asserts
against, and the method.

### Movement and control

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| M-01 | Play occurs on a grid advancing along a single forward axis | A | Coordinate system exposes row and column; player.x and player.y are integers | FR-01 |
| M-02 | One input produces one tile of movement | A | Per tap, `abs(row delta) + abs(col delta) == 1`. A forward tap gives row +1; a tap preceded by the M-03 lateral gesture gives col +/-1 | FR-02, DR-01-5 |
| M-03 | The default input direction is privileged; lateral movement is the exception | A | Tap maps to forward by default; lateral requires a 12px horizontal motion within 150ms before the tap resolves | DR-01-5, DR-04-10 |
| M-04 | Movement is discrete, with no analog steering and no mid-hop correction | A | During a hop, no input can change direction; assertion fails if any intermediate frame has a non-integer player position | FR-04, DR-05-8 |
| M-05 | Forward movement scores; lateral and backward movement does not | A | Score delta after a tap == +1; score delta after a lateral or backward move == 0 | FR-03 |
| M-06 | The hop animation has a fixed duration regardless of distance or state | A | One constant HOP_DURATION_MS applied to every hop; assertion fails if duration differs between hops in the same run | FR-25 |
| M-07 | Control is phase-gated: one input mid-run, an additional axis pre-run and on the death screen, disambiguated by a motion threshold | A | Mid-run tap threshold: 150ms, 12px. Pre-run and death-screen: 150ms, 12px. Phase transitions are explicit | DR-04-10, resolving FR-09 |
| M-08 | Hitboxes are visually square with sharp edges, so a hop is judgeable before it is made | A | Hitbox rendered as a polygon with no rounded corners > 1px and no anti-alias fade. Checked by screenshot diff per tile type | FR-26, DR-01-1 |
| M-09 | The player is moving within five seconds of first contact with no tutorial gate | A | First valid input lands within 5000ms of first DOMContentLoaded; assertion fails otherwise | FR-10 |
| M-10 | A sideways gesture may be inverted so that drag direction opposes travel direction, matching the natural flick | C | — | DR-05-4 |

### The board as a rule system

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| B-01 | **AMENDED.** The three lane classes roadway, railway and water are the campaign's full class set; a single stage may weight them, but the campaign as a whole presents all three | A | Assert the union of non-zero weights across all 10 `laneMix` rows is exactly {ROAD, RAIL, WATER}. Asserting all three in every stage would be unsatisfiable: stage 1 is deliberately road-only | FR-17, ST-10 |
| B-02 | Each lane holds an independent speed and direction | A | Each generated lane carries a {speed, direction} pair; assertion fails if any two lanes share both | FR-18 |
| B-03 | Within a lane class, a per-tile TYPE tag rewrites the rule of that row rather than only its spacing | A | TYPE domain is a declared finite set; every tile carries exactly one type; rules are functions of type only | DR-05-2 |
| B-04 | Types available in the harvest: solid, one-use-breakable, laterally-moving, disappearing, spring, and reversible direction | A | TYPE domain includes all six; adding a seventh is a spec change requiring a build-gate update | DR-05-2 |
| B-05 | One new obstacle type is introduced per one new power-up, so the board stays tunable by hand | A | For every TYPE beyond the initial six, exactly one new PowerUp must exist; lint asserts the ratio | DR-05-2 |
| B-06 | Railway lanes telegraph arrival long enough to cross, and the telegraph is visible before the train enters | A | telegraph_duration > traverse_time for every rail lane, both derived from the same speed and lane width | FR-21, DR-01-1 |
| B-07 | Water lanes contain moving platforms with survivable gaps that are safe by timing alone | A | Platform dwell at hop entry >= 2 × HOP_DURATION_MS; assertion fails for any shorter platform | FR-20 |
| B-08 | A goal row exists with a guaranteed-open-slot invariant, so the far edge is always reachable | A | Every generated run has at least one column marked goalReachable; checked by reachability search | DR-01-7 |
| B-09 | A within-run recovery exists at landmark tiles, costing accumulated currency but not position | A | Recovery action deducts current run's currency and continues from the same row and column; assertion fails if position changes | DR-02-3 (reformulated) |
| B-10 | Content is generated from a small legible tile vocabulary, so unbounded runs stay readable | A | Tile vocabulary size <= 20; assertion fails for any generator output containing a tile outside the vocabulary | DR-02-6 |

### Pressure and difficulty

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| P-01 | A pursuer exists that ends the run on contact | A | At least one entity whose contact with the player ends the run; checked by trace | FR-13 |
| P-02 | The pursuer is gated on distance covered, not on an idle timer, so early play is safe by construction | A | Pursuer activation occurs only after row >= PURSUER_DISTANCE_THRESHOLD (default 20); assertion fails if it activates before that row regardless of idle time | DR-08-1, DR-08-2 |
| P-03 | The pursuer has no defensive verb: it cannot be fought, blocked, or outlasted, only outrun | A | No input reduces the gap or pushes the pursuer back. The sole permitted exception is the grind G-01, which spends an already-charged streak and is the designed exit | DR-08-2, DR-08-3, G-01 |
| P-04 | Escaping the pursuer requires a skill the player has already been taught (the grind), and nothing else | A | The only action that opens a pursuer gap is the grind action G-01; any other input is asserted to leave the gap unchanged | DR-08-3 |
| P-05 | The camera follows forward progress and never scrolls backward | A | Camera position at row r+1 >= camera position at row r; assertion fails on any backward camera movement | FR-11 |
| P-06 | *(Deleted in Phase 0 — the stopwatch form contradicted P-02. Anti-stall pressure lives under P-02.)* | — | — | — |
| P-07 | Reversing three or more lanes is treated as stalling and triggers the pursuer early. This is the **only** documented path by which the pursuer arms before its distance threshold | A | Three reverse moves within `PURSUER_REVERSE_WINDOW` arm the pursuer. No other early-arm path exists | FR-14, P-02 |
| P-08 | A depleting gauge reduces the number of safely occupiable tiles, making the safe line a positional decision | A | Gauge value v in [0, MAX]; safe tiles count = f(v); f(0) > 0 (the gauge never empties the board) | DR-02-1 (reformulated) |
| P-09 | **SCOPED.** Within a stage, the *shape* of difficulty comes from refill-tile scarcity, not from a number typed into a table. The elapsed-time component is ST-03's business, not P-09's | A | Mean distance between refill tiles at row r is non-increasing in r and bounded below by 1 row. The elapsed-time term is asserted by ST-03, and `check_vertical_slice.py` asserts the two compose rather than compete | DR-02-2, ST-03 |
| P-10 | Scarcity converts the safe line into a decision, rather than a rule | C | — | DR-02-7 |
| P-11 | A distinct low-resource warning channel exists, separate from the general hazard language | A | Gauge value < 25% triggers a visual state that does not appear in any other condition; checked by trace | DR-02-4 |
| P-12 | Every generated sequence is guaranteed solvable under both the static and the temporal reachability search | A | 10,000 seeds pass static solvability (no pursuer) and 10,000 seeds pass temporal solvability (pursuer active); generation must complete in < 50ms per seed | FR-24, DR-09-4 |
| P-13 | Score is a function of forward hops only; difficulty is not | B | Score = Σ(forward hops); assertion fails if any other variable contributes | FR-23 (reformulated) |
| P-14 | A guaranteed-safe sub-mode is available within the lethal mode, giving punctuation and a place to bank a decision | B | Sub-mode triggers at a declared interval of rows; player cannot die in sub-mode for its declared duration | DR-06-2 |
| P-15 | Collision is instant death with no health pool, in one-hit lanes and in the pursuer | A | One collision event terminates the run; assertion fails if a second collision is reachable from the same state | FR-19, DR-02-5 |

### The restart loop

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| R-01 | The interval between death and playable restart is under one second | A | Median death-to-restart < 300ms; worst case < 1000ms; measured from injected `dt` with no clock read | FR-29 |
| R-02 | Restart requires no confirmation, no menu and no second input | A | Death state accepts one input as restart; assertion fails if any state requires two | FR-30 |
| R-03 | Death animation does not block input | A | Input during death animation triggers restart within one frame | FR-06 |
| R-04 | Death is authored to be amusing rather than punishing; tone and reward presentation permit it | B | Two consecutive deaths must produce different reward presentations; reward sequence length >= 4 | FR-28 |
| R-05 | Death is always caused by something visible and identifiable | A | The collision source at death is rendered within 1 tile of the player in the final frame | DR-08-9 |
| R-06 | No failure resets accumulated in-run progress except the run itself | A | End-of-run clears run-scoped state; persists meta-scoped state; assertion fails if a meta counter ever decreases on run end | FR-32 |

### Economy and progression

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| E-01 | Currency is earned at approximately one unit per second of survival, with a stated tolerance | B | Earned currency within ±15% of (run_seconds × 1.0) | FR-31 |
| E-02 | Currency persists across runs and is never lost on death | B | Death callback does not deduct from persisted currency | FR-32 |
| E-03 | In-run currency feeds a persistent upgrade track that survives death | B | Each run-end commits current run's currency to the persistent track; reloading between runs preserves total | DR-05-12 |
| E-04 | *(Cut in Phase 0 — redundant against E-03. The capability-from-currency idea is delivered by E-03.)* | — | — | — |
| E-05 | Unlocks are cosmetic and change nothing about difficulty | A | Unlock table diffed against hazard table; no unlock changes any hazard parameter | FR-33 |
| E-06 | An unlock produces a change the player can see during play, not a number that increases | B | Every unlock renders visibly in at least one gameplay state; assertion fails if the unlock is purely a counter increment | FR-36 |
| E-07 | A roster swap replaces content, never rules | A | Two roster entries in the same run produce identical game rules; checked by trace | DR-01-3 |
| E-08 | *(Cut in Phase 0 — unimplementable. The stated benefit, removing the idle timer, is delivered by P-02.)* | — | — | — |
| E-09 | A single-hit insurance charge is held between runs and consumed manually at the moment of decision | B | Insurance use clears the next collision without ending the run; subsequent collision still ends the run | DR-06-10, DR-06-9 |
| E-10 | Insurance is never purchasable mid-run | A | No store UI is reachable from a running game; assertion fails if any UI element opens during play | DR-06-9 |
| E-11 | Currency has two separated spend lanes — permanent upgrades and a randomised cosmetic reward — kept visibly distinct in the UI | B | Spend UI shows both lanes; selecting one lane never reveals the other | DR-01-4, DR-06-5 (merged) |
| E-12 | *(Merged into E-11. The two-currency separation is the same mechanism as the two spend lanes.)* | — | — | — |
| E-13 | *(Merged into E-11.)* | — | — | — |
| E-14 | *(Cut in Phase 0 — needs a backend. The base spec already excluded community infrastructure; this codifies the exclusion.)* | — | — | — |
| E-15 | A recording or score rival is shown diegetically, creating a target without a leaderboard service | C | — | DR-05-7 |

### Session, challenge and presentation

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| S-01 | **AMENDED (was: endless, no finish line).** The campaign has ten finite stages; the endless run is entered only after stage 10 and is unbounded | A | `assert phase in {RUNNING, STAGE_CLEAR, STAGE_FAILED, ENDLESS}`; exactly one non-death END state per stage (goal row). The first finisher in 2P is a non-terminal state — see ST-13 | FR-05, ST-05, ST-11 |
| S-02 | A daily challenge gives all players the same generated level from a date seed | C | Date seed = YYYYMMDD; same seed produces same sequence | FR-38 |
| S-03 | The daily challenge lets the player select a difficulty multiplier over that shared seed | C | Difficulty is a stated multiplier over the shared seed; seed is invariant | DR-09-1 |
| S-04 | The daily objective is a collect-to-complete pattern, such as assembling a target set | C | — | DR-06-11 |
| S-05 | The reward presentation on death is randomised rather than fixed | B | Two consecutive deaths must produce different reward presentations; reward sequence length >= 4 | FR-37, DR-04-9 |
| S-06 | A token-gated spin is available on the death screen, converting a dead run into a moment of anticipation | B | Spin available only on death screen; result applied within 500ms | DR-04-9 |
| S-07 | Each unlockable carries a per-character stat card | C | — | FR-39 |
| S-08 | The game is fully playable offline, with no account and no network requirement | A | After first load with the network disconnected, all features remain accessible for the next 1000 deaths | FR-40 |
| S-09 | *(Cut in Phase 0 — content calendar. Pure polish; defer past first ship.)* | — | — | — |
| S-10 | A presentation mode removes score, currency and power-ups entirely, for players who want the motion without the pressure | C | Toggling presentation mode hides all of: score, currency counter, power-up indicators; resumption restores them | DR-08-4 |
| S-11 | Mission lists scaffold play over an unguided core without gating progress | C | — | DR-07-2, DR-07-9 |
| S-12 | Completing objectives does not end the session | B | Completing the active mission returns to the run, not to a menu | DR-08-5 |
| S-13 | Trick execution (grind) converts directly into speed, so style and survival are one objective | C | A completed grind awards speed; the speed lasts HOP_DURATION_MS; the only action that produces it is the grind | DR-07-8 |
| S-14 | A session is bounded in time, so the reason to return is a defined event rather than an open-ended grind | C | Session timer visible; soft-end triggers at declared minutes | DR-08-10 |

### The stage campaign

Added in the stage-design revision. Full rationale in
`docs/STAGE-DESIGN.md`. These amend `S-01` and `X-01` and preserve `R-01`.

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| ST-01 | A stage is won by reaching the goal row before the clock expires; this is the only win condition | A | Assert exactly one non-death path out of RUNNING, namely goal-row contact; check_lane_invariants.py asserts no other terminal state | Stage design |
| ST-02 | Stage duration is 90000 ms and the clock is shared across all players, never per-player | A | `Stages.STAGE_DURATION_MS == 90000`; assert `game.state().elapsedInStageMs` is a single field, not per-player | Stage design |
| ST-03 | Difficulty equals `stage.baseline + floor(elapsed_ms / 15000)` | A | `Stages.difficultyFor` is pure; assert a step of exactly 1 at every 15000 ms boundary across 10 stages x 7 samples = 70 assertions | Stage design |
| ST-04 | Each stage declares a baseline, and baselines are non-decreasing across the campaign | A | `STAGES[i].baseline` non-decreasing; `STAGES[0].baseline == 0`; campaign difficulty span >= 10 | Stage design |
| ST-05 | The campaign is 10 stages, and completing stage 10 transitions to ENDLESS | A | `Stages.stageCount() == 10`; assert phase == ENDLESS after stage 9 clears; gate asserts 1000/1000 seeds reach it | Stage design |
| ST-06 | Each player starts every stage with 4 lives, and lives are restored on retry | A | `STAGE_START_LIVES == 4`; assert per-player lives == 4 at stage start and after `advance()` from STAGE_FAILED | Stage design |
| ST-07 | Exhausting a player's lives fails the stage and never the campaign; `advance()` from STAGE_FAILED retries the same stage index | A | Assert `stageIndex` is unchanged across a failure and retry; a reset to 0 fails the gate | Stage design |
| ST-08 | The stage clears only when every player has reached the goal row | A | With 2 players, drive player 0 to the goal, assert phase != STAGE_CLEAR; then drive player 1, assert STAGE_CLEAR | Stage design |
| ST-09 | Each stage's scene is a data row in `src/stages.js`, not code | B | `check_content_schema.py` asserts every stage row carries the full field set; a missing field fails the build | CP-01, CP-02 |
| ST-10 | The three lane classes (roadway, railway, water) are constant across all stages; only the mix changes | A | `laneMix` is a 3-element numeric array summing to 1 for every stage; the class set is never redefined | B-01 |
| ST-11 | Endless mode is unbounded and scores on distance, restoring the original high-score loop | B | Assert ENDLESS phase never sets a finite stage end; score accumulates without a goal row | S-01 (amended) |
| ST-12 | Player count is 1 or 2, chosen before a campaign and switchable between stages | A | `createGame({playerCount})` accepts 1 or 2 and rejects others; switching preserves `stageIndex`. Tier A: ST-02's shared clock and ST-08's both-must-finish are meaningless without a player count | Stage design |
| ST-13 | A player who has reached the goal row is removed from hazard and pursuer resolution and can no longer lose a life | A | With a player finished, no input or tick reduces their `lives`; assert over 1000 ticks with the pursuer ACTIVE | Stage design |
| ST-14 | Phase 1 ships no lane hazards. `hazardKinds` is declared content for the hazard milestone and is inert until the lane generator lands; the only life-consuming sources are the pursuer and the clock | A | Assert no hazard entity is constructed in Phase 1. Resolves the STAGE-DESIGN self-contradiction between the stage-1 scene table and the P-02 note | STAGE-DESIGN |

### Rules the genre forbids

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| X-01 | **AMENDED (was: no lives at all).** No life *countdown*. Lives are a fixed per-stage budget that decreases only on death and is refilled at stage start — there is no timer on the counter and no purchase that changes it | A | `lives` decreases only inside `applyDeath`; assertion fails if any other code path decrements it. A death costs exactly one life, never more | FR-34, ST-06 |
| X-02 | **SCOPED.** No energy gate: nothing prevents the player from *starting* a run. A stage clock that bounds the run (ST-02) is not an energy gate | A | Assert no state blocks a stage start. The in-stage clock is ST-02's and is asserted there | FR-35, ST-02 |
| X-03 | No pay-to-win, and no mechanic that increases difficulty for a fee | A | Difficulty-affecting parameters are not gated by any purchase | FR-35 |
| X-04 | **AMENDED (was: restart at the death position).** A death returns that player to the stage start, which is the intended cost of a life. What is forbidden is a restart that rewinds the *campaign* — the campaign is never reset by a stage failure | A | On death, `row == 0` and `col == startCol`; on STAGE_FAILED, `stageIndex` is unchanged by `advance()`. Assertion fails if `stageIndex` moves backwards | FR-29, ST-07 |
| X-05 | No world auto-locomotion: the camera may move, the player may not | A | Player position delta == input delta sum; assertion fails if any other component contributes | FR-04 |
| X-06 | No unlocks that alter difficulty, since unlock-as-power converts the game into a grind | A | Diff of unlock table against hazard table must be empty | FR-33, DR-01-3 |
| X-07 | No identical reward shown on consecutive deaths, since a repeated stimulus stops being noticed | B | Reward sequence is asserted non-repeating across consecutive deaths | FR-37 |

### The grind — the offensive verb

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| G-01 | A hold-to-grind action is the player's offensive verb, charging a streak meter spent as forward-creep grace | A | Held input advances a streak counter from 0 to MAX within GRIND_CHARGE_MS; releasing the input spends the streak as a multiplier on forward movement for STREAK_DURATION_MS | DR-07-8 (extracted) |
| G-02 | The only player action that affects the world, beyond movement and dismissal, is the grind | A | Inventory of input bindings diffed against movement grammar; assertion fails if any extra binding exists | Senior review (added) |

### Non-functional requirements

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| NF-01 | The simulation runs on a fixed timestep with an accumulator; rendering is decoupled; all durations are frame-rate independent | A | Per-frame `dt` is constant across 60Hz, 120Hz and 144Hz displays; check_time_independence asserts equal game state after N seconds at each | AU (review-01) |
| NF-02 | 60 fps sustained on a named reference device, fixed entity pool, no per-frame allocation in steady state | A | P95 frame time < 16.7ms on a named reference; per-frame allocation count == 0 in steady state | AU (review-01) |
| NF-03 | Transferred weight and time-to-interactive are stated as numbers and met | B | Total transfer < 1 MB; TTI < 3s on the named reference | AU (review-01) |
| NF-04 | The service worker is versioned; an update evicts the prior cache, and a failed update leaves the previous version playable | B | Update path tested: install new SW, simulate fetch failure, previous version still serves | AU (review-01) |
| NF-05 | Elapsed time comes from `performance.now()` against one captured origin; a wall-clock change never alters the simulation | A | Mocking the clock does not change game state; assertion fails on any clock-read outside the captured origin | AU (review-01) |
| NF-06 | A hidden tab pauses the run and clears buffered input; no pursuer, gauge or camera advance accrues while hidden, and return is not a penalty | A | Tab hidden for 10s, then visible; assertion fails if any accumulator advanced during hidden time | AU (review-01) |

### Audio

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| AU-01 | A sound is defined for every player-caused event: hop, lateral, coin, gauge low, gauge refill, death per cause, pursuer, unlock, spin | B | Sound registry covers the event list; missing-event assertion fails the build | review-01 |
| AU-02 | The audio context is created or resumed only inside a user-gesture handler; a suspended context resumes on the next input | A | Audio context starts in `suspended` state; first user gesture triggers `resume()`; assertion fails otherwise | review-01 |
| AU-03 | A persistent mute control exists, defaults to unmuted, and takes effect without reload | B | Mute state survives reload; effective immediately on toggle | review-01 |

### Accessibility

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| AC-01 | No information is carried by colour alone; every hazard and state change has a shape, pattern or motion cue legible in greyscale | A | Render scene in greyscale; all hazards and state changes still distinguishable | review-01 |
| AC-02 | `prefers-reduced-motion` removes shake, parallax, flashes and the death-screen spin, substituting a static result, with the game otherwise playable | A | Setting the media query removes the listed effects; game remains playable | review-01 |
| AC-03 | All text is DOM with an accessible name; score and gauge changes announce through a live region; the canvas carries a text alternative | B | DOM text found for every visible label; aria-live=polite on score and gauge; canvas has aria-label | review-01 |
| AC-04 | Every interactive target is at least 44×44 CSS pixels and operable by a single contact | A | Target size check on every interactive element; assertion fails below threshold | review-01 |

### Device handling

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| DP-01 | The backing store is sized to `devicePixelRatio`, capped, and re-sized on orientation change, resize and zoom | B | Backing-store pixels == min(devicePixelRatio × CSS, cap); resize handlers exercised | review-01 |
| DP-02 | Visible lane count is constant in CSS pixels across supported aspect ratios; content scales, framing does not | B | At three test ratios, visible-lane-count delta == 0 | review-01 |
| DP-03 | Supported orientations are named explicitly, and the play area excludes safe areas and browser chrome in each | C | — | review-01 |

### State and persistence

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| SV-01 | The generator's per-lane output is enumerated field by field, including the TYPE tag's value domain | A | Lane schema is a closed type; lint asserts every generated lane carries every field | review-01 |
| SV-02 | The entity set is enumerated with pool size, lifetime, and the rule that releases each | A | Entity pool is a declared table; every spawn reads from and releases to the pool | review-01 |
| SV-03 | Persistence writes to a single store key, with a schema version, on run end; a corrupt save recovers to a playable state without losing other keys | A | Save key named; schema version increments on shape change; corruption recovery exercised | review-01 (save spec) |

### Quality gates

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| QA-01 | Every Tier A requirement carries an automated pass criterion runnable with system Python 3.9 and a browser, no Node | A | `tools/check_testability.py` exhaustively asserts every Tier A row has both a threshold and a measurement method | review-01 |
| QA-02 | The generator is fuzzed over a stated number of date seeds with a solvability check as a test; shipped daily seeds are a subset | A | 10,000 seeds checked; failure produces a seed, the run, and the unsolvability proof | review-01 |
| QA-03 | Every Tier A requirement is rewritten as a predicate with no subjective term — legible, amusing, judgeable, distinct | A | Tier A subjective terms scanned; none found | review-01 |

### Legal

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| LG-01 | Every shipped asset is original, self-hosted and carries a recorded licence; no third-party CDN request at runtime | A | Asset manifest includes licence row per asset; network interception finds no off-domain requests | review-01 |
| LG-02 | The build makes zero network requests after first load, sets no cookies, and writes storage only for the SV-03 save | A | Network and storage audits at runtime; assertion fails on any extra request or write | review-01 |
| LG-03 | An age rating, privacy statement and claims-free posture are stated before public distribution | B | All three are linked from the in-game menu | review-01 |

### Content pipeline

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| CP-01 | Content — lane tables, tile types, roster, stat cards, schedules, strings — lives in data files of a stated format, validated by a system-Python script; a new theme is a data change, not a code change | B | Data files validated by `tools/check_content_schema.py`; any invalid field fails the build | review-01 |
| CP-02 | All player text lives in the data files and renders in DOM, not to canvas, so it scales and translates without a code change | B | Text inventory grep finds no string literals in `src/` outside `src/i18n/` | review-01 |

---

## Conflict resolutions

Six conflicts arose between games. Each is resolved here rather than left open.

**Lives versus no lives.** Frogger and Crossy Road Castle both use lives;
Crossy Road forbids them. The resolution is that lives are a purchasable budget
refilled at a fixed-interval checkpoint, not a countdown and not a tower reset.
The refill is a local purchase that shortens the punishing segment, which is
precisely what Castle's global reset prevents (DR-03-3, FR-29).

**Auto-run versus discrete movement.** Temple Run, Temple Run 2, Subway Surfers
and Alto's Adventure are all continuous auto-run, which contradicts FR-04. The
resolution is that all four are rejected as locomotion models, and only their
pressure systems are harvested. Subway Surfers' deletion of the turn axis is
kept as a principle (DR-06-8: delete the axis, do not balance it) but not as a
mechanism. Alto's Adventure contributes only the speed conversion, re-expressed
as the grind G-01.

**Auto-jump versus tap-forward.** Doodle Jump has no jump button. The resolution
keeps FR-02 and inverts platform contact: the forward hop stays a tap, and
platform-type contact triggers its effect rather than the hop itself
(DR-05-1, DR-05-2).

**Idle timer versus distance-gated pursuer.** Crossy Road uses an idle timer;
Alto's Odyssey gates its pursuer on distance. The resolution takes the distance
gate, because it is fairer and because it makes the opening of every run a free
tutorial (DR-08-1). The idle timer is removed entirely; P-06 was its only home
and has been deleted.

**Single input versus hybrid input.** Flappy Bird and Jetpack Joyride are
single-input; FR-09 requires a hybrid. The resolution is phase-gating rather
than a compromise on the button count: mid-run the tap is the only accepted
input and swipes are swallowed, while swipe is admitted pre-run and on the
death screen, disambiguated by a motion threshold (DR-04-10).

**Energy gate versus no gate.** Pac-Man 256 spends a credit to play with
power-ups or to revive, and River Raid's fuel gauge is lethal. The resolution
inverts both: the depleting gauge becomes a route constraint that reduces the
count of safely occupiable tiles (P-08/P-09), preserving the spatial ramp
without introducing a reason to stop playing. X-02 is satisfied because the
gauge never ends a run.

**Two difficulty ramps compete.** P-09 ramps ordinary play by refill-tile
scarcity and gauge refill availability. P-13 had claimed to be a second ramp;
it is reclassified as the scoring function. S-03 is a difficulty multiplier
that applies only to the daily challenge, not to ordinary play.

**Offence verb scope.** E-08 had assumed an attack action that the movement
grammar never granted. G-02 now states the scope: the only player action that
affects the world beyond movement and dismissal is the grind G-01. Anything
else that previously assumed an attack verb has been deleted or reclassified.

**Run lifecycle.** B-09 had respawn checkpoints that contradicted instant death
and a sub-second restart. B-09 is reformulated: a within-run recovery at
landmark tiles costs the run its accumulated currency but not its position.
This is what makes the landmark a "checkpoint" rather than a restart.

---

## Specification for the combined game

The harvested set resolves to a single buildable game: a discrete isometric
hopper where a distance-gated pursuer that cannot be fought pressures the player
forward, a depleting route-constraint gauge makes the safe line a positional
decision rather than a resource race, per-tile type tags rewrite the rules of a
row rather than its spacing, and a grind action is the player's only offensive
verb.

Three properties distinguish it from the genre's existing entries, and all
three come from a specific harvested mechanism rather than from invention.

The difficulty curve is spatial rather than temporal. It comes from the
scarcity of a refill tile and from the gauge reducing the count of safe tiles
(P-08/P-09), so a player who plays well is never asked to outplay a number.

Stalling is bounded by a pursuer with no defensive verb rather than by a
stopwatch (P-02, P-03), so a player who stops is never arbitrarily killed but
is also never safe.

The offensive verb is a single coherent action — the grind — which charges a
streak meter spent as forward-creep grace (G-01), so offence and survival are
one verb rather than two.

Buildable entirely on a static HTML, CSS and JavaScript stack with no build
step, no server and no third-party SDK. The requirements that cannot be built
without infrastructure were either cut (E-14 community bar) or restricted to
local storage only (E-15 rival score, SV-03 persistence).

---

## Unresolved and unverified

Four items remain genuinely open and are recorded rather than papered over.

The Crossy Town case is gone. The 500,000-install, $50-revenue story is
untraceable, and with it the base spec's argument that faithful clones fail.
The replacement argument, that the mechanic becomes public property within
about 72 hours of featuring and a clone template sells for roughly $100, is
better supported and should be used instead.

Three tiers of unverified claim survive into this document and are flagged in
the dossiers: Doodle Jump's one-way camera lock and River Raid's generation
motive are unverified but behaviourally low-risk; Crossy Road Castle's room
library, boss interval, adaptive difficulty and coin scarcity are refuted or
unverified and are excluded from the consolidated set; and the lemur escape
route in Alto's Odyssey, the Temple Run 2 home meta, and the Subway Surfers
power-up count are unverified and excluded.

Two structural claims in the base specification lost their supporting source
during verification and should be re-grounded before they are relied on: that
app store policy permits gameplay-differing clones, and that Frogger's fixed
timer and lives are required rather than incidental.

The fixed-tick timing of the temporal solvability search under P-12 is the
honest version of what the requirement demands, and it is enforced by
`tools/check_solvability.py` over 10,000 seeds.

---

## References

Primary and secondary sources are cited inline in the ten dossiers, each with
its own numbered list. The verification-status summary above draws on:

- PocketGamer.biz, 5 March 2014 (Keith Andrew) — Flappy Bird clone flood figures
- PocketGamer, 2 October 2015 (Mark Brown) — Crossy Road clone template, ~$100
- Game Developer, 10 December 2015 — "Dreaming of Voxel Goats", identified as a
  development log rather than a postmortem
- GDC 2015, Hipster Whale (Matt Hall, Andy Sum) — design rationale, control
  compromise, randomised reward presentation, no-pay-to-win rule
- Snowman's Alto's Odyssey press kit and support pages — wall riding, Zen Mode
  origin, speed conversion
- Apple's iTunes Lookup API and archived store listings — Shooty Skies, Piffle,
  Paper.io, same-device multiplayer attribution
- Internet Archive CDX index — the wnhub.io negative result
- Per-dossier source lists: `docs/dossiers/01`–`10`
- Senior review: `docs/SENIOR-REVIEW.md`
- Per-lens reviews: `docs/review-01`–`03`
- Development plan: `docs/DEVELOPMENT-PLAN.md`
- Disposition table: `docs/disposition-table.md`
- Phase-0 gates: `tools/check_requirements.py`, `tools/check_testability.py`
