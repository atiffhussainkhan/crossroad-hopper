# Final requirements document

The complete requirements record for an original lane-crossing arcade game, consolidated from a base specification and ten independent research dossiers.

99 consolidated requirements · 117 harvested requirements · 19 recorded corrections · 10 dossiers · 41,897 words

Part 1 is the consolidated specification and the analysis behind it. Parts 2 and 3 are the supporting record: the base specification the research began from, and the ten dossiers in full.

## Contents

- Part 1 — Consolidated requirements and analysis
  - Tier definition
  - Phase 0 of the development plan
  - Corrections to the base specification
  - Consolidated requirement set
    - Requirement index
  - Conflict resolutions
  - Specification for the combined game
  - Unresolved and unverified
- Part 2 — Base specification (superseded in part; see corrections)
- Part 3 — Research dossiers
  - 3.1 Crossy Road and Frogger
  - 3.2 River Raid and Pac-Man 256
  - 3.3 Crossy Road Castle and Disney Crossy Road
  - 3.4 Flappy Bird and Jetpack Joyride
  - 3.5 Doodle Jump and Temple Run
  - 3.6 Temple Run 2 and Subway Surfers
  - 3.7 Sonic Dash and Alto's Adventure
  - 3.8 Alto's Odyssey and Paper.io
  - 3.9 Shooty Skies and Piffle
  - 3.10 Clone failure and synthesis
- Disposition table — every harvested requirement accounted for

---

## Part 1 — Consolidated requirements and analysis

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
| M-02 | One input produces one tile of forward movement | A | Per-tap, row delta == +1 and column delta == 0, with zero exceptions | FR-02, DR-01-5 |
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
| B-01 | At least three lane classes with distinct hazard physics: roadway, railway, water | A | Generator emits at least 3 of {ROAD, RAIL, WATER} in the first 20 rows; class set is a declared constant | FR-17 |
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
| P-03 | The pursuer has no defensive verb at all: it cannot be fought, blocked, or outlasted, only outrun | A | No player action reduces the pursuer gap, freezes it, or pushes it back; assertion fails if any input alters gap unless the player has moved forward | DR-08-2, DR-08-3 |
| P-04 | Escaping the pursuer requires a skill the player has already been taught (the grind), and nothing else | A | The only action that opens a pursuer gap is the grind action G-01; any other input is asserted to leave the gap unchanged | DR-08-3 |
| P-05 | The camera follows forward progress and never scrolls backward | A | Camera position at row r+1 >= camera position at row r; assertion fails on any backward camera movement | FR-11 |
| P-06 | *(Deleted in Phase 0 — the stopwatch form contradicted P-02. Anti-stall pressure lives under P-02.)* | — | — | — |
| P-07 | Reversing three or more lanes is treated as stalling and triggers the pursuer early | A | Three reverse moves within PURSUER_REVERSE_WINDOW activate the pursuer regardless of distance threshold | FR-14 |
| P-08 | A depleting gauge reduces the number of safely occupiable tiles, making the safe line a positional decision | A | Gauge value v in [0, MAX]; safe tiles count = f(v); f(0) > 0 (the gauge never empties the board) | DR-02-1 (reformulated) |
| P-09 | The difficulty ramp is driven by the scarcity of the refill tile and by gauge refill availability, not by elapsed time or by a numeric curve | A | Mean distance between refill tiles at row r is a non-increasing function of r, and bounded below by 1 row; assertion fails if difficulty is a function of wall-clock | DR-02-2 |
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
| S-01 | The world is endless, with no finish line and no level completion | A | No state reachable in which the run terminates other than death; assertion fails if any non-death end state exists | FR-05 |
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

### Rules the genre forbids

| ID | Requirement | Tier | Threshold / measurement method | Source |
|---|---|---|---|---|
| X-01 | No life countdown. Lives, where present, are a budget bought with currency | A | Lives counter never decreases without a corresponding currency spend; assertion fails if any death decrements lives | FR-34, DR-03-3 |
| X-02 | No energy gate and no play timer on the core loop | A | No state in which the player is prevented from starting a run by a timer | FR-35 |
| X-03 | No pay-to-win, and no mechanic that increases difficulty for a fee | A | Difficulty-affecting parameters are not gated by any purchase | FR-35 |
| X-04 | No restart that returns the player to a distant earlier point in the run | A | Restart position equals death position; assertion fails if either changes | FR-29, DR-03-1 |
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

## Requirement index

Generated from the consolidated tables above, so this index cannot drift out of step with the specification it indexes.

**Movement and control**

- `M-01` — Play occurs on a grid advancing along a single forward axis
- `M-02` — One input produces one tile of forward movement
- `M-03` — The default input direction is privileged; lateral movement is the exception
- `M-04` — Movement is discrete, with no analog steering and no mid-hop correction
- `M-05` — Forward movement scores; lateral and backward movement does not
- `M-06` — The hop animation has a fixed duration regardless of distance or state
- `M-07` — Control is phase-gated: one input mid-run, an additional axis pre-run and on the death screen, disambiguated by a motion threshold
- `M-08` — Hitboxes are visually square with sharp edges, so a hop is judgeable before it is made
- `M-09` — The player is moving within five seconds of first contact with no tutorial gate
- `M-10` — A sideways gesture may be inverted so that drag direction opposes travel direction, matching the natural flick

**The board as a rule system**

- `B-01` — At least three lane classes with distinct hazard physics: roadway, railway, water
- `B-02` — Each lane holds an independent speed and direction
- `B-03` — Within a lane class, a per-tile TYPE tag rewrites the rule of that row rather than only its spacing
- `B-04` — Types available in the harvest: solid, one-use-breakable, laterally-moving, disappearing, spring, and reversible direction
- `B-05` — One new obstacle type is introduced per one new power-up, so the board stays tunable by hand
- `B-06` — Railway lanes telegraph arrival long enough to cross, and the telegraph is visible before the train enters
- `B-07` — Water lanes contain moving platforms with survivable gaps that are safe by timing alone
- `B-08` — A goal row exists with a guaranteed-open-slot invariant, so the far edge is always reachable
- `B-09` — A within-run recovery exists at landmark tiles, costing accumulated currency but not position
- `B-10` — Content is generated from a small legible tile vocabulary, so unbounded runs stay readable

**Pressure and difficulty**

- `P-01` — A pursuer exists that ends the run on contact
- `P-02` — The pursuer is gated on distance covered, not on an idle timer, so early play is safe by construction
- `P-03` — The pursuer has no defensive verb at all: it cannot be fought, blocked, or outlasted, only outrun
- `P-04` — Escaping the pursuer requires a skill the player has already been taught (the grind), and nothing else
- `P-05` — The camera follows forward progress and never scrolls backward
- `P-06` — *(Deleted in Phase 0 — the stopwatch form contradicted P-02. Anti-stall pressure lives under P-02.)*
- `P-07` — Reversing three or more lanes is treated as stalling and triggers the pursuer early
- `P-08` — A depleting gauge reduces the number of safely occupiable tiles, making the safe line a positional decision
- `P-09` — The difficulty ramp is driven by the scarcity of the refill tile and by gauge refill availability, not by elapsed time or by a numeric curve
- `P-10` — Scarcity converts the safe line into a decision, rather than a rule
- `P-11` — A distinct low-resource warning channel exists, separate from the general hazard language
- `P-12` — Every generated sequence is guaranteed solvable under both the static and the temporal reachability search
- `P-13` — Score is a function of forward hops only; difficulty is not
- `P-14` — A guaranteed-safe sub-mode is available within the lethal mode, giving punctuation and a place to bank a decision
- `P-15` — Collision is instant death with no health pool, in one-hit lanes and in the pursuer

**The restart loop**

- `R-01` — The interval between death and playable restart is under one second
- `R-02` — Restart requires no confirmation, no menu and no second input
- `R-03` — Death animation does not block input
- `R-04` — Death is authored to be amusing rather than punishing; tone and reward presentation permit it
- `R-05` — Death is always caused by something visible and identifiable
- `R-06` — No failure resets accumulated in-run progress except the run itself

**Economy and progression**

- `E-01` — Currency is earned at approximately one unit per second of survival, with a stated tolerance
- `E-02` — Currency persists across runs and is never lost on death
- `E-03` — In-run currency feeds a persistent upgrade track that survives death
- `E-04` — *(Cut in Phase 0 — redundant against E-03. The capability-from-currency idea is delivered by E-03.)*
- `E-05` — Unlocks are cosmetic and change nothing about difficulty
- `E-06` — An unlock produces a change the player can see during play, not a number that increases
- `E-07` — A roster swap replaces content, never rules
- `E-08` — *(Cut in Phase 0 — unimplementable. The stated benefit, removing the idle timer, is delivered by P-02.)*
- `E-09` — A single-hit insurance charge is held between runs and consumed manually at the moment of decision
- `E-10` — Insurance is never purchasable mid-run
- `E-11` — Currency has two separated spend lanes — permanent upgrades and a randomised cosmetic reward — kept visibly distinct in the UI
- `E-12` — *(Merged into E-11. The two-currency separation is the same mechanism as the two spend lanes.)*
- `E-13` — *(Merged into E-11.)*
- `E-14` — *(Cut in Phase 0 — needs a backend. The base spec already excluded community infrastructure; this codifies the exclusion.)*
- `E-15` — A recording or score rival is shown diegetically, creating a target without a leaderboard service

**Session, challenge and presentation**

- `S-01` — The world is endless, with no finish line and no level completion
- `S-02` — A daily challenge gives all players the same generated level from a date seed
- `S-03` — The daily challenge lets the player select a difficulty multiplier over that shared seed
- `S-04` — The daily objective is a collect-to-complete pattern, such as assembling a target set
- `S-05` — The reward presentation on death is randomised rather than fixed
- `S-06` — A token-gated spin is available on the death screen, converting a dead run into a moment of anticipation
- `S-07` — Each unlockable carries a per-character stat card
- `S-08` — The game is fully playable offline, with no account and no network requirement
- `S-09` — *(Cut in Phase 0 — content calendar. Pure polish; defer past first ship.)*
- `S-10` — A presentation mode removes score, currency and power-ups entirely, for players who want the motion without the pressure
- `S-11` — Mission lists scaffold play over an unguided core without gating progress
- `S-12` — Completing objectives does not end the session
- `S-13` — Trick execution (grind) converts directly into speed, so style and survival are one objective
- `S-14` — A session is bounded in time, so the reason to return is a defined event rather than an open-ended grind

**Rules the genre forbids**

- `X-01` — No life countdown. Lives, where present, are a budget bought with currency
- `X-02` — No energy gate and no play timer on the core loop
- `X-03` — No pay-to-win, and no mechanic that increases difficulty for a fee
- `X-04` — No restart that returns the player to a distant earlier point in the run
- `X-05` — No world auto-locomotion: the camera may move, the player may not
- `X-06` — No unlocks that alter difficulty, since unlock-as-power converts the game into a grind
- `X-07` — No identical reward shown on consecutive deaths, since a repeated stimulus stops being noticed

**The grind — the offensive verb**

- `G-01` — A hold-to-grind action is the player's offensive verb, charging a streak meter spent as forward-creep grace
- `G-02` — The only player action that affects the world, beyond movement and dismissal, is the grind

**Non-functional requirements**

- `NF-01` — The simulation runs on a fixed timestep with an accumulator; rendering is decoupled; all durations are frame-rate independent
- `NF-02` — 60 fps sustained on a named reference device, fixed entity pool, no per-frame allocation in steady state
- `NF-03` — Transferred weight and time-to-interactive are stated as numbers and met
- `NF-04` — The service worker is versioned; an update evicts the prior cache, and a failed update leaves the previous version playable
- `NF-05` — Elapsed time comes from `performance.now()` against one captured origin; a wall-clock change never alters the simulation
- `NF-06` — A hidden tab pauses the run and clears buffered input; no pursuer, gauge or camera advance accrues while hidden, and return is not a penalty

**Audio**

- `AU-01` — A sound is defined for every player-caused event: hop, lateral, coin, gauge low, gauge refill, death per cause, pursuer, unlock, spin
- `AU-02` — The audio context is created or resumed only inside a user-gesture handler; a suspended context resumes on the next input
- `AU-03` — A persistent mute control exists, defaults to unmuted, and takes effect without reload

**Accessibility**

- `AC-01` — No information is carried by colour alone; every hazard and state change has a shape, pattern or motion cue legible in greyscale
- `AC-02` — `prefers-reduced-motion` removes shake, parallax, flashes and the death-screen spin, substituting a static result, with the game otherwise playable
- `AC-03` — All text is DOM with an accessible name; score and gauge changes announce through a live region; the canvas carries a text alternative
- `AC-04` — Every interactive target is at least 44×44 CSS pixels and operable by a single contact

**Device handling**

- `DP-01` — The backing store is sized to `devicePixelRatio`, capped, and re-sized on orientation change, resize and zoom
- `DP-02` — Visible lane count is constant in CSS pixels across supported aspect ratios; content scales, framing does not
- `DP-03` — Supported orientations are named explicitly, and the play area excludes safe areas and browser chrome in each

**State and persistence**

- `SV-01` — The generator's per-lane output is enumerated field by field, including the TYPE tag's value domain
- `SV-02` — The entity set is enumerated with pool size, lifetime, and the rule that releases each
- `SV-03` — Persistence writes to a single store key, with a schema version, on run end; a corrupt save recovers to a playable state without losing other keys

**Quality gates**

- `QA-01` — Every Tier A requirement carries an automated pass criterion runnable with system Python 3.9 and a browser, no Node
- `QA-02` — The generator is fuzzed over a stated number of date seeds with a solvability check as a test; shipped daily seeds are a subset
- `QA-03` — Every Tier A requirement is rewritten as a predicate with no subjective term — legible, amusing, judgeable, distinct

**Legal**

- `LG-01` — Every shipped asset is original, self-hosted and carries a recorded licence; no third-party CDN request at runtime
- `LG-02` — The build makes zero network requests after first load, sets no cookies, and writes storage only for the SV-03 save
- `LG-03` — An age rating, privacy statement and claims-free posture are stated before public distribution

**Content pipeline**

- `CP-01` — Content — lane tables, tile types, roster, stat cards, schedules, strings — lives in data files of a stated format, validated by a system-Python script; a new theme is a data change, not a code change
- `CP-02` — All player text lives in the data files and renders in DOM, not to canvas, so it scales and translates without a code change

---

## Part 2 — Base specification

> Superseded in part. Nineteen claims in this document were overturned during verification. Read the corrections table in Part 1 before relying on anything here.

A requirements dossier on the lane-crossing "hopper" genre: the mechanical
requirements of Crossy Road, the design contribution of eighteen comparable
titles, the structural patterns they share, and the scope that is buildable on a
browser toolchain.

---

## The commercial case against cloning

Crossy Road was released on 20 November 2014 by Hipster Whale, a Melbourne
studio, and published on Android by yodo1 [2][3]. It reached roughly 250 million
players according to its own App Store listing [3], and the studio later claimed
340 million lifetime downloads [4]. Revenue peaked at about $250,000 per day,
with $10 million earned in the first 90 days [5][6]. Of that early $10 million,
roughly $3 million came from video advertising, the figure given by Unity Ads'
head of sales at the GDC session where Crossy Road was presented [5][7][12].

The studio has since been acquired by Atari in a deal reported by games trade
press in June 2026, with an initial payment of $29.3 million rising to $39.3
million, against trailing revenue of $8.28 million and EBITDA of $4.63 million
for the year ended 31 January 2026. That figure is press-reported rather than
confirmed against a filing.

More useful than the revenue numbers is the documented record of what happened
when other people copied it.

Crossy Town was built in about one month by three developers at Niobium in
Brazil. It secured roughly 500,000 installs, helped along by a Chinese
publisher, and generated about $50 in advertising revenue in its first month.
It recorded no purchases, and players did not return. The developers' own
assessment was that the project failed [13].

A separate postmortem reached a different diagnosis. A developer who built
Crossy Road-like games and shipped neither successfully identified the missing
ingredient: the menu loop, and the way the reward system is presented to the
player. Where the original continuously reminds the player what they are
earning and how, clones leave that implicit, and players become "utterly
confused by the mixed messaging and quit" [14].

That finding reframes the problem. The mechanics of Crossy Road are now table
stakes and freely copyable; app store policy explicitly declines to act against
a clone when its gameplay differs in any way [15]. What is not copyable is the
loop structure and the reward presentation, which is why the clone fails and the
original does not.

The market conditions have also moved against the pure advertising-funded clone
model. Mobile game downloads fell 7.2% year on year in 2025, while in-app
purchase revenue grew only 1.3% to $81.75 billion and average cost per install
rose 30% to $0.56 [25]. Rewarded-video eCPM in casual Android titles declined
across three consecutive half-year periods [27]. Casual day-7 retention has been
sliding since early 2022, and hybrid-casual titles have overtaken it [28].

The conclusion is direct: reproduce the structural discipline of the genre, and
differentiate on everything else. A faithful copy of the surface mechanics
targets the part of the market that has already been won.

## Core mechanic requirements

The requirements below are drawn from the observable behaviour of Crossy Road
[1][2][3], the design rationale given by its creators [1][7], and cross-genre
comparison with the titles in the next section. Tier A items are load-bearing:
without them, the result does not read as this genre. Tier B items carry
retention. Tier C items carry identity and are where differentiation happens.

| ID | Requirement | Tier |
|---|---|---|
| FR-01 | Play occurs on a grid; the world advances along a single forward axis | A |
| FR-02 | One forward hop advances exactly one tile | A |
| FR-03 | One forward hop increments the score by one; lateral and backward hops do not score | A |
| FR-04 | Movement is discrete, with no analog steering and no mid-hop correction | A |
| FR-05 | The world is endless; there is no finish line and no level completion | A |
| FR-06 | Death ends the run immediately with no animation blocking input | A |
| FR-07 | A tap moves forward one tile | A |
| FR-08 | A horizontal swipe moves one tile laterally | A |
| FR-09 | Control is a hybrid: tapping is the default, swiping is the exception, because tapping alone is monotonous and swiping alone is tiring [1] | A |
| FR-10 | The player can be moving within five seconds of the first screen, with no tutorial gate | A |
| FR-11 | The camera follows forward progress and never scrolls backward | A |
| FR-12 | The camera advances on its own over time, applying pressure to a stationary player [1][30] | B |
| FR-13 | An idle timer triggers a pursuer that removes the player from the run [1][2] | A |
| FR-14 | Moving backward three or more lanes also triggers the pursuer [2][30] | B |
| FR-15 | The pursuer is telegraphed visually before it strikes, so death is never a surprise [31] | A |
| FR-16 | The pursuer varies with the character in play, so a cosmetic choice changes actual behaviour [2] | C |
| FR-17 | At least three distinct lane classes: roadway with vehicles, railway with trains, water with floating platforms | A |
| FR-18 | Each lane has independent speed and direction | A |
| FR-19 | Collision with any hazard is instantaneous death, with no health pool | A |
| FR-20 | Water lanes contain moving platforms with safe footholds and gaps that are survivable by timing | A |
| FR-21 | Railway lanes have a long telegraph period before a train arrives, long enough to cross | A |
| FR-22 | Levels are generated procedurally and never repeat an identical sequence | A |
| FR-23 | Difficulty scales with score rather than elapsed time, so hesitation is never punished directly | A |
| FR-24 | The generated layout must be solvable; no sequence may produce an uncrossable row | A |
| FR-25 | The hop animation has a fixed, consistent duration regardless of distance or state | A |
| FR-26 | Hitboxes are visually obvious with sharp, square edges, so the player can judge a hop precisely [1] | A |
| FR-27 | The character does not occupy space while airborne for collision purposes beyond a tight, honest window | A |
| FR-28 | Death is designed to be amusing rather than punitive, and is a frequent subject of the game's tone [1] | B |
| FR-29 | The interval between death and a playable restart is under one second | A |
| FR-30 | The restart action requires no confirmation, no menu, and no second input | A |
| FR-31 | Coins or equivalent are earned during a run at roughly one per second of survival | B |
| FR-32 | Currency persists across runs and is never lost on death | B |
| FR-33 | Currency is spent on unlockables, and unlockables are cosmetic only | C |
| FR-34 | There is no life system | A |
| FR-35 | There is no energy gate, play timer, or pay-wall, a rule inherited deliberately from Dota 2's defence against pay-to-win [1] | A |
| FR-36 | Unlocking something produces a change the player can see during play, rather than a number that increases [14] | C |
| FR-37 | The reward presentation on death is randomised rather than fixed, because a repeated stimulus stops being noticed [1] | B |
| FR-38 | A daily challenge exists where all players receive the same generated level, giving a shared comparison point [3] | C |
| FR-39 | Each unlockable carries a per-character stat card [3] | C |
| FR-40 | The game is fully playable offline with no account, no server, and no network requirement [3] | B |

Three items carry more weight than the rest, and the reason is causal rather
than conventional. FR-13 and FR-12 exist because an endless game with no
difficulty ramp lets a player stand still indefinitely and win by default; the
pursuer converts a game about deliberation into a game about commitment. FR-26
exists because a death the player accepts as their own fault produces a retry,
while a death they attribute to unfair hitboxes produces a quit. FR-29 exists
because the entire retention model depends on the player choosing to try again
before their attention moves elsewhere; every other system in the game exists to
feed that one number.

## Comparable titles and their design contributions

The eighteen titles below are grouped by how closely they share Crossy Road's
mechanical structure rather than by popularity. Contribution means the specific
design element the title contributes to the genre vocabulary.

| Title | Year, studio | Contribution |
|---|---|---|
| River Raid | 1982, Activision (Carol Shaw) | Procedural level generation, invented because cartridge space could not hold many hand-built levels; fuel gauge as a depleting pressure clock; one-hit death [21] |
| Frogger | 1981, Konami / Sega / Gremlin | The direct ancestor: discrete hops across discrete lanes, a home row to reach, a fixed time limit, lives, and safe platforms moving against the player [2] |
| Pac-Man 256 | 2015, Hipster Whale with Bandai Namco | Same isometric engine, different meta: power-ups rather than characters, and a pursuer that chases from behind rather than a threat ahead [2] |
| Crossy Road Castle | 2020, Hipster Whale, Apple Arcade | Procedural assembly of hundreds of hand-designed rooms rather than open-ended generation; co-operative play for up to four [2] |
| Disney Crossy Road | 2016, Hipster Whale | Licensed variant; demonstrates that a reskin produces no new mechanic, and has since been discontinued [2] |
| Flappy Bird | 2013, Dong Nguyen | Reduction to a single input with a single success criterion; the origin of the one-button commercial template [1][7] |
| Jetpack Joyride | 2011, Halfbrick | A single control surface where hold and release act on deliberately asymmetric ascent and descent rates; an end-of-run reward machine with a revive option [19][20] |
| Doodle Jump | 2010, Lima Sky | A camera that tracks upward and never scrolls back, making descent fatal; platform types that change the rules per row rather than only the spacing [2] |
| Temple Run | 2012, Imangi | Camera-relative continuous control; a purchase-to-continue model that later titles rejected |
| Temple Run 2 | 2013, Imangi | Coins spent on permanent home decoration, giving an endless run a visible long-term sink [17] |
| Subway Surfers | 2012, Kiloo with SYBO | The removal of turns and of the gyroscope, reducing a runner to a three-lane four-direction swipe; hoverboards as single-hit insurance [16][17][18] |
| Sonic Dash | 2015, Sega | A licensed character roster driving a run-based economy, with missions layered over an endless core [2] |
| Alto's Adventure | 2015, Snowman | Trick execution that converts directly into speed, so style and survival are the same objective [22] |
| Alto's Odyssey | 2018, Snowman | A pursuer that appears only after distance is covered and that can only be escaped by going faster, never by fighting; a Zen mode that removes scoring, currency, and power-ups [22][23][24] |
| Paper.io | 2016, Voodoo | A trail left in open space that is a vulnerability rather than a score, making exposure the central tension [2] |
| Shooty Skies | 2015, Hipster Whale | The same studio applying isometric grid movement to a flight combat loop, with a daily-challenge structure [10] |
| Piffle | 2018, Hipster Whale with Mighty Games | Single-touch aiming and release, and a same-device multiplayer mode as the primary social hook [10] |
| Crossy Town | 2015, Niobium | The documented case of the faithful clone failing commercially despite substantial installs [13] |

Four of these deserve closer reading because they carry transferable design
lessons rather than a mechanic worth importing.

River Raid is the origin of the genre's level design, and the reason is
practical rather than inspired. Carol Shaw wanted more levels than a cartridge
could hold, so she generated them [21]. That decision is the reason every game in
this table can be endless, and it carries a warning that survived forty years:
generated content is only valuable when the generator is constrained. River
Raid's generator produces fair, readable sequences because it is simple.

Pac-Man 256 is the closest available evidence for how this genre behaves when
one variable changes. It reuses the isometric engine and swaps characters for
power-ups, and it also introduced a credits or tokens system that gates
progression [2]. Crossy Road deliberately does the opposite, offering play
without an energy gate while gating only optional rewards [1]. The two
titles together define the design decision that matters most in this genre:
what, if anything, is the player prevented from doing.

Crossy Road Castle shows what happens when the structural requirements are
relaxed. It is a side-scrolling platformer rather than an isometric hopper, it
is built from hand-designed rooms rather than open-ended generation, and death
returns the player to the bottom of the tower [2]. A run that cannot end at the
top cannot be improved, and the reviews treat that loss of a high score as a
weakness in the original formula.

Crossy Town is the control case. It followed the mechanics and missed the loop
[13], which is the evidence that FR-29 through FR-37 are not optional polish.

## Structural patterns across the genre

Ten patterns recur across these titles independently, which is what makes them
structural rather than incidental. Each is stated here with its cause, because
the mechanism is what transfers to a new game; the specific content does not.

The first pattern is that every endless game in this family installs an
anti-stasis mechanism, and the mechanism differs per game while the purpose does
not. Crossy Road applies a pursuer and a forward-pushing camera [1][2]. Alto's
Odyssey applies a pursuer that appears only after two kilometres and can only be
outrun by going faster, never by fighting [22]. River Raid applies a fuel gauge
[21]. Pac-Man 256 applies a pursuer advancing from behind [2]. Doodle Jump
applies a camera that never scrolls downward, so standing still is itself fatal
[2]. The shared purpose is to deny a player the option of stalling indefinitely,
and the transferable lesson is that this pressure must arrive through a
mechanic the player already understands rather than through a new rule.

The second is that the restart interval dominates every other metric. Crossy
Road's creator stated that retention is the most important factor in the game,
and that virality and re-engagement follow from it rather than replacing it [1].
Crossy Road Castle lost that property by making death return the player to the
start of a tower [2]. The restart loop is the product; the content is the
context it is played in.

The third is the control compromise. The design tension was stated directly in
the development presentation: tapping alone is monotonous, swiping alone is
fatiguing, and the answer is to tap for most actions and swipe when needed [1].
A parallel effort started as a one-tap game in the Flappy Bird mould and failed
because the player did not feel in control of the character, before the
swipe-plus-tap hybrid was adopted [1]. Temple Run's gyroscope control drew
sustained criticism for neck strain, and Subway Surfers removed the gyroscope
and the turns entirely [16][17]. The lesson is that a control scheme should be
chosen to match the smallest reliable gesture, and that a device's capabilities
are not a design brief.

The fourth is the use of a randomised reward screen. The end-of-run presentation
in Crossy Road is introduced slowly and is heavily randomised, on the stated
principle that a stimulus shown identically every time stops being perceived [1].
Jetpack Joyride uses a comparable machine at the end of a run, including a
multi-heart revive spin [19][20]. This is variable-ratio reinforcement applied
to a user interface, and it is the mechanism behind a player describing a game
as exciting rather than merely functional.

The fifth is that difficulty is tied to score rather than to elapsed time [1].
Time-based difficulty punishes a player who is thinking; score-based difficulty
rewards a player who is skilled, and only those two reactions should be
producing failure.

The sixth is a menu and reward loop treated as a first-class system rather than
as decoration. The postmortem of unsuccessful clones locates their failure here
specifically: the original reminds the player continuously what they are earning
and what unlocks exist, and the clones do not, so the player never forms a model
of why they are playing [14]. FR-36 and FR-37 exist to prevent this failure,
and it is the single most transferable finding in the genre.

The seventh is forgiving rather than accurate physics. Alto's Odyssey was noted
as refreshing specifically because the character does not lose speed, which
contrasts with titles where realistic deceleration frustrates players [24].
Accuracy is a property of a simulation; forgiveness is a property of an
experience, and the genre rewards the second.

The eighth is that goals scaffold play without gating it. Alto's Odyssey has no
hard stop at the point where a player completes their objectives, by deliberate
design, so the player keeps moving [23]. Contrast this with a conventional level
that unlocks at completion. A goal that ends the session is a goal that costs
retention.

The ninth is a hard rule against pay-to-win. The presentation lists pay-gates
among the mechanics explicitly excluded [1], and the studio's stated goal was
popularity rather than per-user monetisation, with anything that interfered with
popularity discarded [4]. The studio generated $8.28 million of trailing annual
revenue under that constraint. Severity of punishment is what converts a free
game into a resentful one, and the constraint is a design decision, not a
financial inevitability.

The tenth is offline capability as a design requirement rather than a
convenience [3]. In this genre the session is short, the network is often poor,
and an account requirement is a conversion tax applied at the worst possible
moment. This constraint happens to align closely with a browser build, which
places it within reach without a server budget.

## Scope achievable on a browser toolchain

Crossy Road shipped on iOS and Android as a native application. The mechanic set
above is platform-neutral, but the implementation route is not, and specifying
one without acknowledging the other produces a document that cannot be executed.

On a static HTML, CSS and JavaScript build with no build step, no server and no
third-party SDKs, the following translate directly. A dimetric isometric view is
achievable in 2D canvas with a single axis-skew transform, approximating a 2:1
projection, so no 3D engine is required. Pointer events give tap and swipe
detection from one input path. Procedural generation is arithmetic over a lane
list and is roughly two hundred lines. The pursuer, camera creep, coin economy,
daily challenge with a date-seeded generator, and per-character stat cards are
all straightforward state machines. Offline play is a service worker, and
distribution is a static host.

The following do not translate without infrastructure, and are excluded on that
basis rather than on merit. Rewarded video advertising requires an ad network
and a runtime dependency, which also conflicts with a zero-third-party-script
privacy posture. In-app purchase requires a payment surface and a server. Online
leaderboards and real-time multiplayer require a backend. Analytics and
attribution require a runtime beacon. A remote configuration service requires a
server.

The excluded items are the same ones the studio's own revenue depended on, which
means the monetisation model of the original cannot be reproduced by a solo
browser build. Given that pure advertising-funded casual economics have been
deteriorating since 2022 [27][28], that is the correct thing to omit rather than
an inability.

## Initial buildable milestone

The first buildable increment is a single-file playable loop with no meta-layer:
isometric grid, tap-forward and swipe-lateral movement, a camera that follows
and creeps forward, three lane classes with independent speed, an idle and
backward-movement pursuer with a visual telegraph, instant-death collision, score
that counts forward hops only, coins, and a restart that completes in under one
second.

That increment satisfies FR-01 through FR-30 and FR-40, and it is the only part
of the genre that cannot be substituted later. Everything in tier C is a
content layer that can be added once the loop is confirmed to feel right, and
adding content to a loop that does not yet feel right is the most common way this
kind of project stalls.

The honest test for this milestone is a single number: whether a player who dies
restarts within one second without being prompted to. If that is not
automatically true, no amount of content will fix it.

## References

[1] GDC 2015, "Crossy Road" presentation slides, Matt Hall and Andy Sum,
Hipster Whale. https://media.gdcvault.com/gdc2015/presentations/Hall_Matthew_Crossy_Road_Whale.pdf

[2] Wikipedia, "Crossy Road". https://en.wikipedia.org/wiki/Crossy_Road

[3] Apple App Store listing, "Crossy Road". https://apps.apple.com/us/app/crossy-road/id924373886

[4] Thumbsticks, "Crossy Road: How Hipster Whale reinvented free-to-play".
https://www.thumbsticks.com/crossy-road-how-hipster-whale-reinvented-free-to-play/

[5] The Guardian, "Mobile game Crossy Road has made $10m in three months".
https://www.theguardian.com/technology/2015/mar/04/crossy-road-mobile-game-10m-freemium

[6] Polygon, "They wanted to make a phenomenon. They made $10 million."
https://www.polygon.com/2015/3/3/8142247/crossy-road-earnings-10-million-gdc-2015/

[7] Game Developer, "Deconstructing the successful design of Crossy Road".
https://www.gamedeveloper.com/business/video-deconstructing-the-successful-design-of-i-crossy-road-i-_

[8] GDC Vault, "Crossy Road: A Whale of a Time". https://gdcvault.com/play/1021897/Crossy-Road-A-Whale-of

[9] Digital Spy, "Crossy Road sees $10m in revenue and 50 million downloads in 90 days".
https://www.digitalspy.com/gaming/crossy-road-sees-10m-revenue-and-50-million-downloads-in-90-days/

[10] Game Developer, "Dreaming of Voxel Goats". https://www.gamedeveloper.com/audio/dreaming-of-voxel-goats

[11] PocketGamer.biz, "Why Crossy Road focused on sharing and retention, not UA and monetisation".
https://www.pocketgamer.biz/crossy-road-focused-on-sharing-and-retention-not-ua-and-monetisation/

[12] MobileDevMemo, "Crossy Road: A case study in mobile ad monetization".
https://mobiledevmemo.com/crossy-road-a-case-study-in-mobile-ad-monetization/

[13] wnhub, "Pros and cons of cloning games". https://wnhub.io/news/other/item11145

[14] Game Developer, "Dreaming of Voxel Goats", the postmortem of unsuccessful Crossy Road-like projects.
https://www.gamedeveloper.com/audio/dreaming-of-voxel-goats

[15] PocketGamer, "Your game is going to be cloned". https://www.pocketgamer.com/pop-the-lock/your-game-is-going-to-be-cloned/

[16] Game World Observer, "Subway Surfers: a Gameplay Analysis".
https://gameworldobserver.com/2016/06/24/subway-surfers-gameplay-analysis

[17] Subway Surfers Wiki. https://subwaysurf.fandom.com/wiki/Subway_Surfers

[18] Wikipedia, "Subway Surfers". https://en.wikipedia.org/wiki/Subway_Surfers

[19] Wikipedia, "Jetpack Joyride". https://en.wikipedia.org/wiki/Jetpack_Joyride

[20] Game Developer, "Let's Talk About Touching: Making Great Touchscreen Controls".
https://www.gamedeveloper.com/design/let-s-talk-about-touching-making-great-touchscreen-controls

[21] Wikipedia, "River Raid". https://en.wikipedia.org/wiki/River_Raid

[22] Alto's Odyssey press kit. https://altosodyssey.com/press/

[23] MobileSyrup, "Alto's Odyssey Review: Amplifying the endless runner".
https://mobilesyrup.com/2018/02/22/altos-odyssey-review/

[24] AndroidGuys, "Not all endless games are shallow". https://www.androidguys.com/2018/02/22/alto-odyssey-game-review

[25] Sensor Tower, "The State of the Mobile Market in 2026", via GameDevReports.
https://gamedevreports.substack.com/p/sensor-tower-the-state-of-the-mobile

[26] Adjust, "Gaming App Insights Report 2026", via GameDevReports.
https://gamedevreports.substack.com/p/adjust-gaming-app-insights-report

[27] Game Growth Advisor, "Mobile Game Retention Strategies 2026".
https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-retention-strategies-2026/

[28] Game Growth Advisor, "Hybrid Casual Games 2026".
https://gamegrowthadvisor.com/blog/2026-04-16-hybrid-casual-game-design-strategy-2026/

[29] Mistplay, "70+ Key Mobile Gaming Statistics". https://business.mistplay.com/resources/mobile-gaming-statistics

[30] Crossy Road Wiki, "Eagle". https://crossyroad.fandom.com/wiki/Eagle

[31] Crossy Road community tricks guide. https://archive.org/details/crossyroadtricksguide

Several figures that circulate widely about this genre are not supportable and
have been excluded from the requirements above. Claims that Crossy Road has
levels, power-ups, upgradeable items, or a chicken mode are contradicted by the
official feature list [3]. A "78% daily retention" figure attributed to a survey
of 1,000 Indian players, and a "chunk system" that plateaus difficulty after 200
steps, originate from content-farm sites with no primary source. An account of
the game's origin as a 2015 browser puzzle title by a company called YY Inc is
fabricated; the documented origin is a native iOS title from Hipster Whale [2].
Where sources conflict, this document prefers the developer's own presentation
and the App Store listing over secondary analysis: development time is given as
twelve weeks per the GDC listing [8][9] rather than the six weeks reported in
one trade article, and advertising revenue as roughly $3 million of the first
$10 million [5][12] rather than the $6 million reported elsewhere. Two values
remain genuinely undocumented and are presented without false precision: the
exact duration of the idle timer before the pursuer appears is reported
variously as three to five seconds, and no primary source publishes the
procedural generation weight tables, so FR-23 and FR-24 specify the required
behaviour without asserting the original's internal parameters.

---

## Part 3 — Research dossiers

Each dossier was produced by an independent agent working from the Part 2 base specification, covering two games. Every claim that could not be traced to a credible source was marked UNVERIFIED rather than asserted.

### 3.1 Crossy Road and Frogger

*Source: `docs/dossiers/01-crossyroad-frogger.md`*

*Dossier 01 — Crossy Road (2014) and Frogger (1981)*

Transferable requirements for a new lane-crossing hopper, from the genre's anchor
title and its direct ancestor. Requirements use the `DR-01-x` namespace; sources
are numbered locally within this dossier.

---

## A. CROSSY ROAD — Hipster Whale, 20 November 2014

Matt Hall and Andy Sum, Hipster Whale (Victoria, Australia), built on Unity;
Android published by yodo1, 23 December 2014 [1][2]. Stated thesis: "Flappy Bird
+ Frogger" [1]. A six-week project became twelve weeks [1].

### 1. VERIFIED MECHANICS

- **Control.** "Tapping alone is boring, but swiping is tiring… Tapping most of
  the time, and swiping when needed" [1]. Hop forward, swipe left/right/back
  [2]. One hop = one tile.
- **Scoring.** One point per forward hop; "only one life and a single point given for each forward hop", in "one endless level" of generated road and river sections [6].
- **Fail states.** Hazard contact, plus a pursuer: "If you move too slowly a
  bird grabs you and eats you, so you must always be moving forward" [3].
- **Currency.** Coins are "golden-yellow and squarish, with a red C"; 100 buy a
  lottery spin for a character [2]. Piggy Bank doubles gift/ad coins and adds
  red coins worth 5 each [2]. Coin packs are not purchasable [1].
- **Content.** 300+ characters, 28 worlds, daily challenges with leaderboards,
  per-character shiny stat cards, same-device multiplayer, offline play, 250M
  players claimed [4].
- **End screen.** "The end of a game should delight and surprise… 'Banner'
  system is unpredictable… Weeks of work went into developing this system" [1].
- **Economy.** No interstitial ads, no save-me, no energy system, "every
  character plays the same", every character $0.99 [1]. 6M peak DAU, 50M
  downloads in 90 days, 100% organic, $0 UA, $10M in 90 days [1][5].
- **Character effect.** Swaps scenery and hazard vocabulary (Astronaut gives space and asteroids), not rules [2]. Sum: "only cosmetic changes… if someone has played for five minutes then they have the exact same opportunity to get a highscore as someone who has played for 50 hours" [3]. Kuchera: the extra characters "won't make the game easier. They can, in fact, make it harder" [3]. Hall: the gacha exists "to ensure that people will play the game over a longer period of time" [3].
- **Labels.** An endless runner per Wikipedia [2]; an "8-bit endless arcade
  hopper" per the developers [4].

### 2. DISTINCTIVE REQUIREMENTS

**DR-01-1 — Stalling is a distinct, lethal verb.** Death comes not only from
hazard contact but from the *absence* of progress, via a visible pursuer. Frogger
has no equivalent; its only time pressure is a round clock shared with its era.

**DR-01-2 — The reward screen is the product.** A heavily randomised,
unpredictable banner on death, treated as a multi-week engineering effort in its
own right [1]. Frogger's post-level screen is fixed and informational.

**DR-01-3 — Roster swaps content, never rules.** "Every character plays the
same" [1]. Frogger has no roster and one fixed playfield; a new Frogger board is
a speed change, not a theme change.

**DR-01-4 — A discrete gamble consumes accumulated currency.** The 100-coin
lottery machine turns ~100 seconds of survival into one high-variance moment
[2]. Frogger has no economy at all.

**DR-01-5 — Asymmetric input with a privileged default direction.** Tap is the
common case; swipe the exception for lateral and backward moves [1]. Frogger's
four-way joystick is symmetric.

**DR-01-6 — Behavioural theme packs as the retention unit.** 28 worlds, each with
its own visual set and hazard vocabulary [4]. Frogger's only progression axis is
scalar speed.

### 3. THE CAUSE

- **DR-01-1** turns deliberation into commitment without a new rule to read. Cost: an idle death feels arbitrary unless the telegraph is honest.
- **DR-01-2** a stimulus shown identically every time stops being perceived — variable-ratio reinforcement on a UI. Cost: combinatorial authoring; unreadable randomness is noise.
- **DR-01-3** removes the roster balance burden: nothing can be overpowered, so nothing needs nerfing. Cost: no differentiated value to sell.
- **DR-01-4** gives a slow trickle a felt payoff. Cost: a visible loss on a bad spin, and an RNG in a pure-skill game.
- **DR-01-5** matches the cheapest gesture to the dominant verb. Cost: two input paths to build and test.
- **DR-01-6** buys re-engagement from art, not mechanics. Cost: a large art pipeline; "28 worlds" is cumulative, not launch-day.

### 4. TRANSFERABILITY

| DR | Rating | Reason |
|---|---|---|
| DR-01-1 | Easy | One timer, one state machine, one sprite; no pathing, no new input. |
| DR-01-2 | Moderate | Trivial logic; the content is an authoring cost with no shortcut. |
| DR-01-3 | Easy | A theme is a palette swap plus a hazard table. |
| DR-01-4 | Easy | One integer compare and a seeded RNG call. |
| DR-01-5 | Moderate | Pointer Events give both gestures from one path; disambiguation needs tuning. |
| DR-01-6 | Moderate | No server needed, but a large static art payload. |

### 5. CONFLICTS

6. **DR-01-3 vs FR-16.** FR-16 requires the pursuer to vary with the character.
   The developers say the opposite — "Every character plays the same" [1] — while
   also saying characters "can, in fact, make it harder" [3]. Unresolvable here;
   treat FR-16 as weakly evidenced.

---

## B. FROGGER — Konami / Sega / Gremlin, 1981

Developed by Konami, published by Sega for arcades; Sega held all Frogger rights
from Konami by September 1981 [6][10]. Attribution is murky: Konami credited no
individuals, and the widely repeated "Akira Hashimoto saw a frog at a traffic
light" origin story is contradicted by former Konami programmer Masahiro Inoue,
who does not recognise the name and credits Takahide Harima and possibly two
other programmers [9].

### 1. VERIFIED MECHANICS

- **Lives.** Three, five, or seven frogs per machine setting; losing all ends the
  game [6]. DIP switches also expose a **256 Frog** position [7], which the
  museum labels untested.
- **Timer.** "The timer gives 30 seconds to guide each frog into one of the
  homes, and resets back to 60 ticks whenever a life is lost or a frog reaches
  home safely" [6]. The clock is *refunded by progress*.
- **Layout.** Bottom: a road of race cars, dune buggies, trucks and bulldozers in
  opposing lanes. A median strip. Upper half: a river of logs, alligators and
  turtles moving horizontally in opposite directions. Top: five "frog homes", at
  least one always open [6]. Fixed camera; the whole field is always on screen.
- **Goal.** Five frogs homeed = level complete, 1,000 points, next level harder. After five levels difficulty briefly eases, then increases again [6].
- **Scoring.** 10 per forward step; 50 per frog homeed; **10 per unused ½
  second**; 200 for a lady frog homeed; 200 for a fly; bonus frog at 20,000; max
  99,990 before a five-digit rollover [6]. Single-player, or two alternating [6].
- **Death taxonomy.** Run over; into the river; snakes, otters or alligator jaws; **sinking on a diving turtle**; riding a log, alligator or turtle off the side of the screen; into an occupied home or an alligator; into the side of a home or the bush; running out of time [6]. Softline, Nov 1982: "the arcade game with the most ways to die" [6][11].

### 2. DISTINCTIVE REQUIREMENTS

**DR-01-7 — A goal row with a guaranteed-open-slot invariant.** Five homes, at
least one always enterable, and a home filled by a frog is permanently closed for
that level [6]. Crossy Road has no destination at all — it is pure distance.

**DR-01-8 — A round clock that progress refunds.** 30 seconds, reset upward to 60
ticks on a life lost *or* a frog homed [6]. No Crossy Road analogue.

**DR-01-9 — Finite lives, selectable per credit.** 3 / 5 / 7 / 256 via DIP
switches [6][7]. A continue economy — exactly what Crossy Road deleted.

**DR-01-10 — Carriage as the mandatory river verb, with an off-screen edge
kill.** You do not cross the river; you are transported by logs, turtles and
alligators, and riding one off the side kills you [6]. Footholds expire under the
player — diving turtles submerge [6].

**DR-01-11 — A large, distinct death taxonomy.** Nine enumerated causes, each
with its own presentation [6].

**DR-01-12 — Score for time surplus.** 10 points per unused half-second [6].
Score accrues for *not* being pressured — the opposite of Crossy Road, where
every second is a threat.

**DR-01-13 — A non-monotonic difficulty curve.** Eases every fifth level [6].
Neither Crossy Road nor the base spec describes a relief point.

### 3. THE CAUSE

- **DR-01-7** gives the run a shape: a question with an answer, plus a readable safe state. Cost: obliges an endless game to decide what happens after completion.
- **DR-01-8** times the player's own decisions, and the upward reset makes the clock a consequence of performance, not a tax. Cost: still a hard deadline, producing the impatient-thumb behaviour the genre left behind.
- **DR-01-9** a life is a legible resource that cheapens failure. Cost: it dilutes every individual death.
- **DR-01-10** converts a timing problem into a *placement* problem — the player chooses where to stand, not when to press. Cost: a control model that must be taught, and a sinking platform punishes inaction, not error.
- **DR-01-11** makes failure variety cheap content: a gag and a sound per cause. Cost: each needs its own art and fairness audit.
- **DR-01-12** converts speed into score without converting slowness into failure. Cost: complexity in an otherwise trivial scoring system.
- **DR-01-13** avoids a pure ramp, which produces attrition. Cost: a relief point is where skilled players coast.

### 4. TRANSFERABILITY

| DR | Rating | Reason |
|---|---|---|
| DR-01-7 | Easy | Five slots, an occupancy array, one invariant check per tick. |
| DR-01-8 | Moderate | Trivial as a countdown, but correct refunding fights FR-35. |
| DR-01-9 | Easy | An integer and a reset — and the costliest decision here. |
| DR-01-10 | Moderate | Platform-relative movement is easy; player-facing clarity is the work. |
| DR-01-11 | Easy | One branch per cause in the collision handler, one sprite each. |
| DR-01-12 | Easy | A score term computed from frame deltas. |
| DR-01-13 | Easy | A modulus on the level counter feeding the speed table. |

### 5. CONFLICTS

Every item below is a direct contradiction, not a nuance.

1. **DR-01-9 vs FR-34 (no life system).** Frogger is built on 3/5/7 finite lives with a bonus frog at 20,000 [6][7]; Crossy Road has "only one life" [6]. FR-34 is stricter, and removing the life system was a decision, not an oversight [1].
2. **DR-01-8 vs FR-35 (no energy gate, play timer, or pay-wall).** A 30-second round timer is a play timer, the most literal reading of FR-35.
3. **DR-01-7 + DR-01-13 vs FR-05 (endless, no finish line, no level completion).** The five-frog clear *is* level completion, and the curve is keyed to completed levels rather than score [6]; FR-23 requires score-scaled difficulty.
4. **DR-01-7 vs FR-12 (camera advances on its own).** Frogger's camera is fixed and shows the whole board; applying FR-12 would hide the goal row. A goal row is only readable if the camera does not creep.
5. **DR-01-12 vs FR-03 (only forward hops score).** Frogger pays 10 per unused ½ second [6] — score accrues for standing still, which FR-03 forbids.
6. **DR-01-8 + DR-01-9 vs the FR-13/14/15 pursuer family.** Crossy Road's pressure is a *behavioural* pursuer escapable by moving [3]; a 30-second clock is escapable only by finishing early. Installing both gives the player two systems punishing opposite behaviours.

Directionally they differ too: Crossy Road penalises backward movement with a pursuer, while Frogger players move freely in all four directions with no directional penalty [3][6].

---

## 6. HARVEST LIST

1. **DR-01-7 — Periodic goal row / safe harbour with a guaranteed-open-slot invariant.** Gives an endless run shape and a visible safe state without reintroducing lives or a level-end, and resolves the FR-05/FR-12 tension Crossy Road leaves open. A safe band every N rows with a rotating open marker; the invariant is one array check.
2. **DR-01-10 — Expiring footholds.** A safe tile that goes lethal after a fixed dwell turns a static safe spot into a decision, adding a timing obligation *without* a global clock, so it survives FR-35.
3. **DR-01-12 — Time-surplus scoring, inverted.** Frogger pays for unused time; reversed, it pays for sustained commitment (a hop streak that decays on hesitation) and never for a deadline. Satisfies FR-03 and FR-23.
4. **DR-01-11 — Death taxonomy.** Nine causes for a fraction of the cost of nine mechanics, and the cheapest route to DR-01-2's end screen.
5. **DR-01-13 — Generator relief rows.** Every fifth band deliberately easier: one modulus, one speed-table row, and it fixes the attrition FR-23's monotonic scaling would produce.

**Not harvested:** DR-01-9 (lives) and DR-01-8 (30s clock) violate Tier-A requirements and are the two mechanics the genre deliberately deleted. DR-01-4 (lottery) is buildable but adds gambling to a pure-skill game.

---

## 7. SOURCES

[1] GDC 2015 — Hall & Sum, "Crossy Road: A Whale of a Time" (71 slides). https://media.gdcvault.com/gdc2015/presentations/Hall_Matthew_Crossy_Road_Whale.pdf
[2] Wikipedia, "Crossy Road" (wikitext, 2026-09-29). https://en.wikipedia.org/w/index.php?title=Crossy_Road&action=raw
[3] Polygon — Ben Kuchera, "Crossy Road has invented the 'endless Frogger,'" 21 Nov 2014. https://www.polygon.com/2014/11/21/7260459/crossy-road-frogger
[4] Apple App Store listing, Crossy Road. https://apps.apple.com/us/app/crossy-road/id924373886
[5] Polygon — Dave Tach, "They wanted to make a phenomenon. They made $10 million.", 3 Mar 2015. https://www.polygon.com/2015/3/3/8142247/crossy-road-earnings-10-million-gdc-2015
[6] Wikipedia, "Frogger" (wikitext, 2026-09-29). https://en.wikipedia.org/w/index.php?title=Frogger&action=raw
[7] Museum of the Game / KLOV, "Frogger Dip Switch Settings" (community-contributed, unverified). https://www.arcade-museum.com/dipswitch-settings/7857.html
[8] Museum of the Game / KLOV, "Frogger" game record. https://www.arcade-museum.com/game_detail.php?game_id=7857
[9] Time Extension — Jack Yarwood, "After 44 years, one of Frogger's biggest mysteries might finally be solved", 18 Dec 2025. https://www.timeextension.com/features/flashback-who-created-the-arcade-classic-frogger
[10] Game Machine #172, 1 Sep 1981, p. 11 (Sega acquired all Konami rights), via onitama.tv. https://onitama.tv/gamemachine/pdf/19810901p.pdf#page=11
[11] Softline, Nov 1982, p. 19, via Computer Gaming World Museum. http://www.cgwmuseum.org/galleries/index.php?year=1982&pub=6&id=8

### Claims marked UNVERIFIED

Not asserted above, for want of a credible source: Crossy Road's exact eagle idle threshold in seconds, hop duration in ms, grid width in tiles, per-score difficulty ramp, and "28 worlds" as a launch-day rather than cumulative figure. Frogger's numeric per-band lane count and screen resolution were likewise not sourced, so its layout is described structurally. The 256-Frog DIP position is real but the museum labels it untested. The known-false claims named in the brief — levels, power-ups, upgradeable items, a "chicken mode", a 78% Indian-player retention survey, a 200-step chunk system, a 2015 browser origin — are absent here and appeared in no source consulted.

---

### 3.2 River Raid and Pac-Man 256

*Source: `docs/dossiers/02-riverraid-pacman256.md`*

*Dossier 02 — River Raid (1982) and Pac-Man 256 (2015)*

Transferable requirements for a new lane-crossing hopper, from the genre's two
pressure-system outliers. `DR-02-x` namespace; sources numbered locally.

---

## A. RIVER RAID — Activision / Carol Shaw, December 1982 (Atari 2600)

Shaw designed and programmed it. She proposed a space game, was told there were
already too many, and switched theme [1]. On graph paper she found horizontal scroll
"very jerky" on the 2600 — hence vertical scroll, and a mirrored shape with islands
reading as a river [1]. Top-selling Activision game of 1983, second-best 2600 title
after *Ms. Pac-Man*; ~1M copies by January 1984 [1].

### 1. VERIFIED MECHANICS

- **Fuel gauge**, bottom of screen. "Fuel can be collected by flying over a fuel
  depot to fill up the gauge"; the goal is points "without running out of fuel or
  crashing" [1, quoting the 1982 manual]. Depots are also destructible for points.
- **Scarcity ramp.** "As the river progresses, there will be fewer fuel tanks"
  [1, manual]. The entire difficulty curve, driven by *deposit density* — not
  distance, time or score.
- **Death.** "The player loses one of their jets if they collide with the river
  bank or enemy objects. If the player has remaining jets, they will respawn at the
  same section… If a bridge is destroyed at the end of a section, the player will
  restart at that bridge upon losing a life" [1, manual]. One hit, no health pool;
  the restart point is a landmark.
- **Bridges** section the river; spacing was a deliberate parameter [1]. The 8-bit
  port added *select which bridge to start from*, plus bonus for shooting a bridge
  carrying tanks [1].
- **Klaxon.** Shaw asked colleagues for a low-fuel klaxon; per David Crane, he
  "recited some lines of assembly code that created the effect" [1, citing Montfort
  & Bogost 2009, p.104].
- **Endlessness.** "The river has no ending and scrolls infinitely" [1, citing
  *Electronic Fun*, Sept 1983, p.80]. Shaw's polynomial playfield algorithm was
  reused by *River Raid II* (1984) [1]. ROM: **4 KB on the 2600, 8 KB on the Atari
  800** [1]. Praised as "very easy game to learn, but a difficult one to master
  completely", with "seemingly infinite scenery" [1].

### 2. DISTINCTIVE REQUIREMENTS

**DR-02-1 — A depleting gauge replenished only by advancing onto a specific tile.**
The sole refill is a depot [1] — a pressure clock whose currency is *position*, not
seconds.

**DR-02-2 — Difficulty ramp driven by scarcity of the refill tile.** "Fewer fuel
tanks" as the river progresses [1]. The same code yields easy or brutal runs purely
by thinning one object type.

**DR-02-3 — Landmarks that double as respawn checkpoints.** Bridges section the
river; death rewinds to the last one [1].

**DR-02-4 — A distinct low-resource warning channel.** The klaxon is not the
resource itself [1].

**DR-02-5 — One-hit death with landmark-level instant respawn.**

**DR-02-6 — Unbounded content from a small legible tile vocabulary.** A 4 KB
cartridge yields an infinite scroll because the world composes algorithmically from a
few archetypes (bank, island, tanker, helicopter, depot, bridge). Sequences stay
readable because the vocabulary never changes — only density and arrangement.

**DR-02-7 — Scarcity turns the safe line into a decision.** Short defended route vs.
long open route cost different fuel, so the refill mechanic is also a routing problem.
The 8-bit bridge-shooting bonus [1] shows Shaw treating the objective as risk/reward.

### 3. THE CAUSE

- **DR-02-1** makes the player look *ahead*, turning scrolling into planning. Cost: a
  second attention channel.
- **DR-02-2** scales by feel — tension arrives when depots thin, experienced as the
  world closing in. Cost: the ramp is invisible, so untunable by one constant.
- **DR-02-3** gives death a *place*: you lose ground, not progress. Cost: stakes are
  graduated, not absolute.
- **DR-02-4** makes a silent resource felt. Cost: fired too early, it makes failure
  predictable.
- **DR-02-5** keeps every decision honest. Cost: brutal, and "remaining jets"
  implies a life reserve.
- **DR-02-6** is why arbitrary arrangements stay fair: a player who has learned six
  archetypes reads any sequence of them. Cost: repetition.
- **DR-02-7** means no hop is purely about the next hop. Cost: doubled decision
  space.

### 4. TRANSFERABILITY

| DR | Rating | Reason |
|---|---|---|
| DR-02-1 | Easy | One decrement, one refill on entry, one gauge rect. |
| DR-02-2 | Easy | A weight-table parameter. |
| DR-02-3 | Easy | Store a landmark index; restore on death. |
| DR-02-4 | Easy | Web Audio oscillator on a threshold. |
| DR-02-5 | Easy | One branch — but it fights FR-34. |
| DR-02-6 | Moderate | Authoring a varied *and* readable vocabulary is the work. |
| DR-02-7 | Moderate | Inherent once DR-02-1 exists; tuning is the cost. |

### 5. CONFLICTS

1. **DR-02-1 vs FR-35 (no energy gate).** The sharpest conflict: a lethal fuel gauge
   is an energy gate. River Raid is a Tier-A counter-example, not a precedent.
   Caveat — its gate is spatial and skill-earned, unlike a pay-gate, so the conflict
   is with the rule as written, not its purpose.
2. **DR-02-1/2 vs FR-23 (difficulty scales with score).** The ramp is keyed to
   *progress* — score-adjacent, not score-driven — and it is depletion that tightens,
   not hazards.
3. **DR-02-5 vs FR-34 (no life system).** "Remaining jets" [1] is a reserve. The
   checkpoint half is compatible; the reserve half is not.
4. **DR-02-3 vs FR-05 (endless, no completion).** Bridges are section boundaries, not
   levels — River Raid passes them [1]. A precedent for visible segmentation the base
   spec does not require.
5. **DR-02-6 vs FR-02/FR-24.** Supportive: the tile vocabulary *is* the fairness
   guarantee FR-24 asks for.

---

## B. PAC-MAN 256 — Hipster Whale / 3 Sprockets / Bandai Namco Vancouver, 2015

Unity. iOS/Android August 2015; Windows, macOS, Linux, PS4, Xbox One 21 June 2016
[2]. "Inspired by the original Pac-Man game's infamous Level 256 glitch, as well as
Hipster Whale's own game Crossy Road, which previously featured a Pac-Man mode" [2].

### 1. VERIFIED MECHANICS

- **The pursuer comes from behind.** "The game ends if Pac-Man comes into contact
  with a ghost **or falls behind and is consumed by a chasing glitch at the bottom
  of the maze**" [2]. In co-op, "the game ends once the last player still in play
  dies, be it by getting caught by a ghost or consumed by the glitch" [2].
- **256 dots.** "Eating 256 dots in a row awards the player a **blast that clears
  all on-screen enemies**" [2]. The title is a mechanism.
- **Eight ghosts, eight behaviours** [2]: Blinky chases; Pinky rushes when Pac-Man
  enters her sight; Inky loops specific areas; Clyde travels down then switches to
  Pac-Man's nearest direction; Sue moves horizontally in groups of three; Funky roams
  horizontally in groups of four; Spunky sleeps but wakes if approached; **Glitchy
  teleports while chasing**.
- **Power-ups as inventory.** Lasers, tornadoes, clones attack ghosts, plus
  score-multiplying fruit; **up to three equipped** [2]. Mobile: unlocked by waiting
  **24 hours** after the last unlock. Console/PC: by eating a set number of Pac-Dots
  [2].
- **Credits, then Coins.** Pre-2.0, a **"credit" system required one credit to play
  with power-ups equipped, or to revive Pac-Man**. 2.0 replaced credits with **Coins**
  from missions, maze pickups and **viewing sponsored videos** — spendable on power-up
  upgrades, themes (mobile) and reviving Pac-Man [2, citing Kotaku, 21 Aug 2015].
- **Co-op revive.** Up to four players; if one is caught, "a player power-up appears,
  which revives that player" [2].
- **Reception.** Metacritic 88 iOS / 79 PS4 / 80 XOne; Pocket Gamer 4.5/5 [2].

### 2. DISTINCTIVE REQUIREMENTS

**DR-02-8 — A pursuer attacking from behind.** The Glitch consumes you from the
bottom of the maze when you fall behind [2]. The threat is on your wake, so the run's
geometry and your trail are the battlefield.

**DR-02-9 — A fixed-count streak paying a screen-clearing blast.** 256 dots in a row
clears all on-screen enemies [2]. A set-piece, not a multiplier.

**DR-02-10 — A behaviour roster, not a single AI.** Eight named movement rules [2].

**DR-02-11 — Power-ups as equipped loadout chosen before play.** Three slots [2].

**DR-02-12 — Currency that must be spent to play with advantages or to continue.**

**DR-02-13 — Downed players restored by pickup, not a life counter** [2].

**DR-02-14 — Unlock pacing that is time-gated on mobile, skill-gated on console.**
24 hours vs. N Pac-Dots [2].

### 3. THE CAUSE

- **DR-02-8** inverts the genre's geometry: pressure is behind you, so hesitation is
  felt as something closing on your back. Cost: a rear threat is invisible until the
  camera is generous — telegraphing is the whole problem.
- **DR-02-9** makes sustained forward motion the only route to power. Cost: 256 dots
  is rare, so most sessions never fire it — a set-piece most players never see.
- **DR-02-10** turns eight routines into eight puzzles. Cost: eight tunings and eight
  sprites, and it reads as busy.
- **DR-02-11** front-loads agency. Cost: a menu before play, against FR-10.
- **DR-02-12** is the mechanic the base spec exists to reject — the strongest tools
  and the second chance behind currency, part bought with attention [2]. Dota 2's
  exact failure mode.
- **DR-02-13** is the only "life" mechanic here that is not a counter, and only
  because the team is bounded.
- **DR-02-14** shows one design degrading per platform: without server time, the toll
  converts from waiting to earning.

### 4. TRANSFERABILITY

| DR | Rating | Reason |
|---|---|---|
| DR-02-8 | Moderate | Easy to build; fair telegraphing is the cost. |
| DR-02-9 | Easy | A counter, a threshold, one clear branch. |
| DR-02-10 | Moderate | Each ghost is small; eight is a content budget. |
| DR-02-11 | Easy | Three slots — but it collides with FR-10. |
| DR-02-12 | **Hard** | Not a porting problem. FR-35 forbids it. |
| DR-02-13 | Moderate | Trivial logically; meaningless without a second player. |
| DR-02-14 | **Hard** | A 24-hour clock is local time, but any *shared* challenge needs a server — FR-40. |

### 5. CONFLICTS

1. **DR-02-12 vs FR-35 (no energy gate, play timer or pay-wall).** Direct, and the
   anticipated contradiction. Spending a coin to revive or equip power-ups is a
   pay-wall on play [2]. FR-35 comes from Dota 2's defence against pay-to-win [3];
   Pac-Man 256 is a same-developer regression against it.
2. **DR-02-12 vs FR-33 (currency cosmetic-only).** Coins buy functional upgrades and
   revives [2].
3. **DR-02-12/13 vs FR-34 (no life system).** Revive is a purchased life; the pickup
   revive is a life system with a different skin, escaping the rule only because it
   needs a co-op partner.
4. **DR-02-14 vs FR-40 (fully offline, no server).**
5. **DR-02-11 vs FR-10 (playable in five seconds).** A loadout is a menu.
6. **DR-02-8 vs FR-15 (pursuer telegraphed).** A pursuer *behind* the player is the
   worst case for a visual telegraph; Pac-Man 256 answers with a consuming animation,
   not a warning. FR-15 is unserved here.
7. **DR-02-9 vs FR-03 (one point per hop).** A discontinuity in a linear score [2].
   Mild, reconcilable as a bonus tier.
8. **Also violates FR-01/FR-04** — free-roaming maze movement, not one-tile hops [2].
   Use as a *pressure-system* reference only.

---

## 6. HARVEST LIST

1. **DR-02-1 + DR-02-2, inverted — a depleting meter replenished by a tile, where
   that tile's rarity is the only difficulty curve.** The most valuable thing here: an
   endless run gets a felt ramp with no numeric tuning, and if the meter drains
   *harmlessly* rather than lethally it satisfies FR-35's intent while giving
   DR-01-7's goal rows a cost.
2. **DR-02-3 — landmarks as respawn anchors.** Free, invisible; makes death graduated,
   which FR-29 plus FR-34 imply but never state. Pairs with DR-01-7's safe band.
3. **DR-02-8 — a pursuer on your wake rather than in your path.** The only novel
   pressure geometry here; composes with FR-12/FR-14 by turning the eagle's rear threat
   into a visible advancing edge. Costs a fairness pass against FR-15.
4. **DR-02-9 — a long forward streak paying a screen-clearing event.** Turns FR-03
   into a skill ceiling with a visible reward, no multiplier, no gate.
5. **DR-02-4 + DR-02-6 — a klaxon threshold over a small readable vocabulary.** Two
   lines for the first; for the second, the discipline of the same six lane archetypes
   forever, varied by density. FR-22 and FR-24 the cheap way.

**Not harvested:** DR-02-12 and DR-02-14 are exactly the pay-to-win the base spec
excludes. DR-02-10 is a content budget, not a design insight. DR-02-11 fights FR-10.

---

## 7. SOURCES

[1] Wikipedia, "River Raid" (wikitext, retrieved 2026-09-29). Cites in-line: Randi
Hacker, "Designing Woman", *Electronic Fun with Computers & Games*, Sept 1983,
vol. 1 no. 11, pp. 78–80; Montfort & Bogost, *Racing the Beam*, MIT Press 2009,
p. 104; Brett Weiss, *The 100 Greatest Console Video Games 1977–1987*, 2014,
pp. 180–182; *The Video Game Update* (Computer Entertainer), Oct 1983, p. 111;
Hickey 2021, pp. 72–74. Gameplay claims quote the 1982 Activision manual.
https://en.wikipedia.org/w/index.php?title=River_Raid&action=raw

[2] Wikipedia, "Pac-Man 256" (wikitext, retrieved 2026-09-29). Cites in-line: Kirk
Hamilton, Kotaku, 21 Aug 2015; Appgamer, "Fruits and Ghosts", 12 Oct 2015; iMore score
guide; TouchArcade review, 19 Aug 2015; Windows Central review; ifanzine review,
11 Sept 2015; Jeffery Matulef, Eurogamer, 24 May 2016; IGN, 19 Aug 2015.
https://en.wikipedia.org/w/index.php?title=Pac-Man_256&action=raw

[3] GDC 2015 — Hall & Sum, "Crossy Road: A Whale of a Time" (as cited by the base
spec, FR-35). https://media.gdcvault.com/gdc2015/presentations/Hall_Matthew_Crossy_Road_Whale.pdf

### Claims marked UNVERIFIED

- **"Shaw wanted more levels than a cartridge could hold, so she generated them."**
  The base spec attributes this to the River Raid article, but that is not supported:
  the article gives the 4 KB/8 KB ROM sizes and the polynomial algorithm [1]. The
  constraint is verified; the *motive* is not stated in the source consulted.
- **River Raid's starting jet count.** "Remaining jets" [1] establishes a reserve
  without a number.
- **River Raid's numeric fuel economy** — drain rate, refill per depot, the
  per-section schedule behind "fewer fuel tanks", and bridge spacing [1]. Structural
  only; no figures in this source.
- **Pac-Man 256's release day.** Its own infobox says 19 August 2015 (citing IGN) and
  its ports section says the 20th [2]. Recorded as August 2015.
- **The Glitch's advance rate** relative to the player, and whether it is always
  active or spawns [2]. Direction and lethality only.
- **Coin costs** for Pac-Man 256 upgrades and themes [2].
- **Whether Glitchy is the eighth ghost or a ninth.** The source's "each ghost" list
  includes Glitchy among eight named entries [2]; this dossier follows it.

**Method note.** The content farms named in the brief were not consulted and no
statistic here originates from them; a search for Shaw interview material returned
only such pages and was discarded. The *Electronic Fun* interview and the Montfort &
Bogost account are cited at second hand through [1], not read directly.

---

### 3.3 Crossy Road Castle and Disney Crossy Road

*Source: `docs/dossiers/03-castle-disney.md`*

*Dossier 03 — Crossy Road Castle & Disney Crossy Road*

**Scope:** the two Hipster Whale games that vary the studio's formula — one by changing
the camera and the death penalty, one by changing the IP. Both are read here as
*anti-evidence* and *control evidence* for the lane-crossing hopper spec.

---

# A. Crossy Road Castle (2020, Hipster Whale / Apple Arcade)

## A1. Verified mechanics (concrete and numeric)

Release **2020-02-27**, Apple Arcade exclusive at launch, iOS/macOS/tvOS/visionOS today
(v12.3, 2026-08-26; 4.67 average across **48,564** US App Store ratings) [9]. Console
version **September 2024** on Switch, PS5, Xbox One and Xbox Series [2][16].

- **2D side-scrolling platformer, orthographic.** "each controlled a character …
  running across two-dimensional levels" [4]. Discrete left/right/jump; touch or
  controller [3][5].
- **1–4 players.** Local same-device, Wi-Fi party, Party Codes, Quick Match [2].
- **Tower structure.** A run is a *tower*, a vertical stack of **rooms**, each cleared
  through a **door**. Unihorse Castle is the starter; Construction Tower and Creepy
  Carnival exist; towers unlock with **1 key per 100 levels** from any tower [2][7].
- **3 lives, hard cap.** "If you have 3 full hearts you're unable to purchase any more"
  [2]; "you only have three lives to work with" [6].
- **Death = lose a life, respawn at the start of the current room** — a mistimed jump
  "will eliminate a heart and start you over in the beginning of the room" [6].
- **Lose all 3 lives = restart from the bottom of the tower.** "you need to start over
  again from the bottom" [6].
- **Heart Vending Machine every 10 rooms**, 100 coins to refill one spent life, max 3
  [2]. A player review independently: "after every 10 rooms you do get the option to
  refill your hearts but it costs 100 coins" [10].
- **The group advances; the individual is stranded.** "if one of you makes it through
  the level and the other three die, you all move on to the next level" [4]. "If other
  players die, then whoever remains will just move on … those who fail are left
  behind" [6].
- **Boss rooms.** A recurring Angry Eagle: "Climb enough floors and you will meet the
  boss, the eagle. This eagle makes a regular boss appearance" [7]. A "rainbow mystery
  thingy" sits after a boss room, unlocked by beating that boss five times [2]. **The
  "boss every 30 stages" figure in the brief is UNVERIFIED** — no source gives an interval.
- **Scoring is per-room and difficulty-weighted.** "Each completed room, including a
  boss room, gives you points based on it's difficulty rating." Trophies at **bronze
  250 / silver 750 / gold 1500** [2].
- **Economy: three tiers, fixed prices.** Coins are "a common collectable" (Hat Machine
  **500 coins**/spin, heart **100**); purple tokens are "much rarer" (Character Machine
  **50 tokens**/spin); **100 tokens** granted after the first tower run; **5 green
  gems** hidden per tower in bonus rooms [2]. No microtransactions; unlocks cosmetic [7].
- **Co-op pools the haul but not the spending.** Tokens, coins and gems "are shared and
  the whole team benefits! When Tokens are spent … they are deducted from your
  individual Token tally" [2].
- No per-room time limit in most rooms [7]; everything but Challenge Events plays
  offline [1].

**Not verified.** "Hundreds of hand-designed rooms assembled procedurally" is
**UNVERIFIED and in tension with the source record**: the official store copy and the
official site both say only *"Each tower run is procedurally generated"* [1][9], and
Hipster Whale told Polygon the levels are procedurally generated [3]. No source
describes an authored room library. "Difficulty adapting to group performance" is
**UNVERIFIED** — [4] verifies the group-advance rule, which is a *progress* rule, not a
difficulty dial. "Coin scarcity increasing with progress" is **refuted**: coins are
officially "common" and both prices are flat [2].

## A2. Distinctive requirements

- **DR-03-1 — A run is a vertical stack of discrete rooms, not a continuous field.**
  A room ends at a door; the next room is a fresh, self-contained puzzle.
- **DR-03-2 — Progress has two granularities with different costs.** Room (free, cost
  is one life) and tower (full reset, cost is the whole run). The player feels both.
- **DR-03-3 — Lives are a purchasable budget, not a countdown.** 3 max, refillable at a
  10-room interval for a fixed currency price.
- **DR-03-4 — Every scored unit carries a difficulty rating that multiplies its value.**
- **DR-03-5 — Long-run currency is pooled socially but spent individually.**
- **DR-03-6 — Checkpoints are *machines*, not save points.** You stand on a button; the
  conversion is literal and reversible (jumping off refunds the coins) [2].
- **DR-03-7 — Group advancement decouples team progress from personal progress.**

## A3. The cause

Castle is a **co-op party platformer**, not an arcade hopper. Hipster Whale's CEO Clara
Reeves framed it to GamesBeat as the first return to original Crossy Road characters,
and the reviewer compared it to *New Super Mario Bros.*, not Frogger [4]. The answer to
"what breaks" is therefore not a bug in the loop but a **different product category**:
once the game is a *tower* and a *shared climb*, the run must be long enough for four
people and structured enough to have an apex. Structure is what produces the door; the
door is what produces the bottom-of-tower reset.

## A4. Transferability (static HTML/JS/2D canvas, no server, no SDK)

**Easy** — DR-03-1 (a room is a tile grid with an exit tile, pure data); DR-03-2 (one
extra `restartAt` pointer in run state); DR-03-3 (integer counter plus a price table);
DR-03-4 (a 1–5 integer per room used as a score multiplier); DR-03-6 (a trigger volume
that debits currency over time); boss rooms (a scripted room variant).
**Moderate** — DR-03-5: trivial solo, but same-device co-op needs one shared pool *and*
one per-player ledger.
**Hard** — DR-03-7: same-device is fine, but *net* co-op needs a server, which the
constraints exclude.

## A5. Conflicts

- **FR-29 (restart under one second) — direct, severe conflict.** Castle's restart cost
  is *proportional to progress*: at floor 90 the replay is 90 rooms long. The spec's
  retention argument ("the player choosing to try again before their attention moves
  elsewhere" [spec L115–117]) is inverted. Player evidence is blunt: *"it just so
  annoying when I die after such hard work"* [10]. This is the strongest data point in
  the genre against segmenting an endless hopper.
- **FR-05 (endless, no finish line, no level completion) — direct conflict.** Castle is
  "endless" only in that no tower is final. It is densely segmented: doors, boss rooms,
  100-level key milestones, trophies at 250/750/1500 [2]. Level completion is the
  spine, not an absence.
- **FR-06 (death ends the run) — conflict.** Castle death costs a heart and continues.
- **FR-31 (coins ~1 per second of survival) — conflict.** Castle coins are not a
  survival rate; they are a fixed price against a fixed interval (100 per 10 rooms).
- **FR-28 (death amusing, not punitive) — conflict.** Castle death is explicitly
  punitive and the community reads it so: *"I do not like the fact that you have 3
  lives"* [10].
- **What survives:** DR-03-3, DR-03-4, DR-03-5, DR-03-6 are *economy*, not *structure*.
  They are harvested below.

---

# B. Disney Crossy Road (2016, Hipster Whale / Disney) — DISCONTINUED

## B1. Status — CONFIRMED DISCONTINUED

Disney's own support article: **"Disney Crossy Road has been removed from the iOS,
Google and Amazon App Stores and will be retired on March 12, 2020"** [12]. Wikipedia
records the same shutdown date [13]. Independently verified today: Hipster Whale's
complete current US App Store catalogue is **8 titles** (Crossy Road, Crossy Road
Castle iOS/macOS, Crossy Road Castle Intro, Crossy Road Castle Stickers, Crossy Road+,
Piffle, Piffle+) and **contains no Disney Crossy Road**; a storefront search for
"disney crossy road" (US and GB) returns no such title [11]. The **Windows** version was
also separately discontinued after **v2.8** [13].

## B2. Verified mechanics (concrete and numeric)

- Launched **7 April 2016**; **nine worlds** built on Disney and Pixar properties; **more
  than 100 characters** at launch; distributed to App Store, Google Play, Windows Store
  and Amazon Appstore [14].
- The only stated *design* difference is content-shaped: "Each of the worlds … will
  feature **different challenges and music** based on their respective setting" [14].
  No new verb, no new control, no new failure rule is claimed by Disney associate
  producer Travis Marshall [14].
- Remained updated post-launch (the Windows cut-off at 2.8 implies a long tail) [13].

**UNVERIFIED:** what the per-world "different challenges" actually were. No priority-outlet
source I reached enumerates a single new mechanic, and I could not obtain a dedicated
hands-on review of Disney Crossy Road. Anything beyond "same loop, different level sets
and characters" is unverified.

## B3. Distinctive requirements

- **DR-03-8 — A reskin scales the *content* surface, not the *mechanic* surface.** Nine
  worlds and 100+ characters produced no documented change to the hop, the death, the
  restart, or the score.
- **DR-03-9 — Licensed content creates a hard external expiry.** The IP owner, not the
  studio, sets the end-of-service date; the developer cannot extend it [12].

## B4. The cause

The reskin is a **content multiplier over a fixed simulation**. Hipster Whale already had
a procedural lane generator, so a new world is a theme table plus an art set. With no
engineering pressure to invent a verb, none was invented. The commercial consequence is
in the record: a title with a huge roster, a four-storefront spread and years of updates
was switched off in 2020 and gone from sale since [11][12]. Content volume bought reach;
it bought no mechanic and no durability.

## B5. Transferability

**Easy but worthless** — DR-03-8 is a theme table and adds no design requirement a hopper
lacks. **Not applicable** — DR-03-9; self-owned IP has no counterparty to retire it.

## B6. Conflicts

- **No conflict with FR-29/FR-05** — and that is the point. Disney Crossy Road is the
  control case: it changed everything the player *sees* and nothing the player *does*, and
  it still failed. The hopper's endurance comes from FR-29/FR-05, not from surface variety,
  so DR-03-8 is **not** a harvest candidate. The "reskins produce no new mechanic"
  argument is **supported** — on the narrow claim only.

---

# 6. Harvest list (ranked)

1. **DR-03-3 + DR-03-6 — lives as a priced budget with a vending-machine checkpoint**
   [2][6]. The best transferable idea here. Death stays cheap enough to be funny but
   costly enough to matter, and the *fixed-interval, fixed-price* refill turns "how many
   times can I fail here" into a resource decision instead of a punishment. It also
   repairs the exact thing that breaks in Castle: the refill is a **local** purchase that
   shortens the punishing segment, where the tower reset is global. **Easy.**
2. **DR-03-4 — a difficulty rating on every scored unit, used as the score multiplier**
   [2]. Turns anonymous procedural content into a legible ladder and makes "how far did
   you get" mean more than a raw floor count. Compatible with FR-05, because a room can
   be scored without being a completion goal. **Easy.**
3. **DR-03-5 — currency pooled for the run, spent from the individual ledger** [2]. A real
   social mechanic at zero UI cost: the team shares the risk of the route and competes
   over who funds the next heart. **Moderate.**
4. **DR-03-7 — group advances, individual is stranded** [4][6]. **Anti-pattern, not
   harvested.** It turns death into a betrayal rather than a joke and is inseparable from
   the bottom reset. Listed only so the spec can explicitly reject it.

**On "hand-designed rooms assembled procedurally":** the *mechanism* is the strongest
structural idea here and the *sourcing* is the weakest claim in the dossier. Castle's
official copy says only "procedurally generated" [1][9], and nothing I reached describes
an authored room library, so the Castle version is **UNVERIFIED**. Harvest the **shape**
anyway — a fixed library of small, self-contained, hand-authored rooms, each carrying a
difficulty rating (DR-03-4), assembled in runs — but source it from the mechanism's
merits, not from this claim. It is also the clean answer to pure generation: a hopper
must stay endless (FR-05), and a room library is what lets an endless run stay endless
while every individual screen is hand-tuned and legible.

---

# 7. Sources

1. Hipster Whale, *Crossy Road Castle* official site — crossyroadcastle.com
2. Hipster Whale, *Crossy Road Castle Support / FAQ* — crossyroadcastle.com/support/ (primary source for every economy, room-cadence and multiplayer number below)
3. The Verge, "Apple Arcade's latest exclusive is a new Crossy Road spinoff", 27 Feb 2020
4. VentureBeat/GamesBeat, "Hipster Whale's Crossy Road Castle brings goofy laughs to Apple Arcade", 1 Mar 2020 — interview with CEO Clara Reeves, via web.archive.org/web/2022/
5. PocketGamer, Cameron Bald, "Crossy Road Castle, coming soon to Apple Arcade, is a wild departure for the series"
6. PocketGamer, Colin Mieczkowski, "Basic tips for your angelic ascent to the top of the tower" (3 lives; bottom reset; checkpoints; secret rooms)
7. PocketGamer, Colin Mieczkowski, "Three reasons why you may enjoy this tower climbing adventure" (towers; coin dispenser; tokens; no microtransactions)
8. PocketGamer, "Crossy Road Castle: Tips and cheats" (boss cadence; blue secret doors; 5 green gems)
9. Apple App Store listing + iTunes Lookup API, *Crossy Road Castle* id 1478978570 (description; release 2020-02-27; v12.3; 4.67/48,564)
10. Apple iTunes customer-reviews RSS, id 1478978570 — 450 reviews sampled 29 Sep 2026 (10-room heart refill; 3-lives complaints; "annoying when I die after such hard work")
11. Apple iTunes Lookup API, Hipster Whale artist id 924373885, US storefront, retrieved 29 Sep 2026 — 8 titles, no Disney Crossy Road; corroborated by US and GB storefront searches
12. Disney Games & Apps Support, "Disney Crossy Road is being retired on iOS, Google and Amazon" — archived 13 Feb 2020
13. Wikipedia, "Crossy Road", *Spin-offs* (12 Mar 2020 shutdown; Windows cut after v2.8; Castle platform history)
14. Polygon, Megan Farokhmanesh, "Disney Crossy Road launches today for mobile devices", 7 Apr 2016, archived 8 Nov 2020 (nine worlds; 100+ characters; per-world challenges and music; Marshall quotes)
15. Apple iTunes Lookup API, *Crossy Road* id 924373886 (baseline: 300+ characters, 28 worlds, endless)
16. Hipster Whale, *Crossy Road Castle Support* — console release September 2024

---

### 3.4 Flappy Bird and Jetpack Joyride

*Source: `docs/dossiers/04-flappy-jetpack.md`*

*Dossier 04 — Flappy Bird & Jetpack Joyride: the one-button design language*

**Method note.** No `web_search` tool was available; research used DuckDuckGo Lite plus direct `web_fetch`. **Wikipedia was unreachable** (HTTP 429 on `en.wikipedia.org` and `api.wikimedia.org`), so base-spec Wikipedia claims are not re-verified here. Facts confirmed only at snippet level are marked as such; varying figures are attributed, not resolved.

---

## A. Flappy Bird (2013, Dong Nguyen / .Gears)

### 1. VERIFIED MECHANICS

- **One input, one axis.** The player owns exactly one degree of freedom (vertical). Forward motion belongs to the game.
- **Score is a function of distance, gated by a discrete event.** A point is awarded only for a completed gate (one pipe pair), never for time survived.
- **The aperture is the whole design.** Pipes are paired, one ceiling-anchored and one floor-anchored, with a single fixed-width vertical opening. Pocket Gamer's formal definition of a Flappy clone (editor Mark Brown) states the shape vocabulary exactly: *"any game in which you guide some character through an obstacle course of pipes (or similar objects) hanging from the ceiling and sticking out of the ground"* [3]. That definition is itself evidence the geometry is the recognisable unit.
- **Removal: announced, then executed.** Nguyen gave a **22-hour** deadline and pulled the game from Apple's iOS store on Sunday 9 February 2014 [5]. BBC confirmed the same day-cycle (*"removed it from online stores on Sunday"*) [2].
- **Rationale: addiction, stated by the creator.** Forbes, 11 Feb 2014, Lan Anh Nguyen: the app is dead permanently — *"gone forever because it was an addictive product"* [4]. ABC News the same day: it was *"that type of addiction"* that influenced removal from **both** iOS and Android stores [6].
- **Downloads.** *"downloaded more than 50 million times"* — TIME [7]. **CONTESTED:** this is a floor, not a peak, and is frequently restated as a maximum. Treat as "50M+ at some point before February 2014".
- **Revenue.** *"an average of $50,000 per day in revenue generated from in-app ads, creator Dong Nguyen told The Verge"*, relayed by Polygon, 6 Feb 2014 [8]. **CONTESTED / partially UNVERIFIED:** self-reported to a single outlet, snippet-level confirmation only. Do not treat $50k/day as a solid number.
- **The clone flood — documented, not folklore.** PocketGamer.biz, Keith Andrew, 5 March 2014: *"An average of 60 new Flappy Bird clones roll out on the App Store every day … with 2.5 clones added every hour"*, derived from *"the last 300 Flappy Bird clones to have launched"* — i.e. **one clone every 24 minutes** [3]. The same piece notes it had been claimed Apple was clamping down, but *"Pocket Gamer's data suggests the Cupertino giant has either lost control, or is simply not enforcing any notable action."*

### 2. DISTINCTIVE REQUIREMENTS

- **DR-04-1** — Exactly one input surface, acting on exactly one axis. The player never steers forward.
- **DR-04-2** — Score = distance, awarded only on a completed binary gate.
- **DR-04-3** — Constant forward velocity + **fixed-width** vertical aperture. One control is meaningful only because the timeline is fixed and the target never changes size. The entire decision is *when to spend an impulse*.
- **DR-04-4** — One-hit death. No lives, no continues, no revive UI, no shield.
- **DR-04-5** — Death is a *state*, not a *screen*. Restart is one input, no menu.

### 3. THE CAUSE

Gravity is always pulling; the tap is the only brake. Because forward motion is constant and the aperture fixed, the game becomes a **rhythm** problem, not a **navigation** one — the player is not choosing a route, they are placing impulses on a metronome. DR-04-3 is load-bearing: strip the fixed aperture and DR-04-1 stops being elegant and starts being impoverished. The clone flood is double-edged — 60/day says the mechanic was *clean* enough for strangers to copy, and simultaneously that a single-mechanic game is not defensible by control scheme alone.

### 4. TRANSFERABILITY (static HTML/JS/2D-canvas, no server, no SDK)

| Req | Rating | One-line reason |
|---|---|---|
| DR-04-1 | **Easy** | One `pointerdown` listener and one velocity accumulator. |
| DR-04-2 | **Easy** | `score++` on a single AABB crossing test. |
| DR-04-3 | **Easy** | Two rects + one box-intersection per frame, both hard-coded. |
| DR-04-4 | **Easy** | One boolean. |
| DR-04-5 | **Easy** | `state = PLAYING` and re-seed. |

---

## B. Jetpack Joyride (2011, Halfbrick Studios)

### 1. VERIFIED MECHANICS

All of the following are quoted from Halfbrick's own developer blog, *"In-Depth: Jetpack Joyride Gadgets"*, 24 April 2012 [1] — a primary source.

- **One continuous input, two states:** hold = thrust, release = fall.
- **Asymmetry — DESCEND IS THE SLOW ONE.** This is verifiable from the developer blog without any secondary source. Halfbrick shipped the **Gravity Belt (5,000 Coins)**: *"Makes the ground come at you a lot faster than usual."* [1] A studio does not sell acceleration on the axis the player already dominates; it sells it on the axis the player lacks. In the default build, therefore, **fall rate < rise rate**. **The exact numeric ratio is UNVERIFIED** — no official figure was found this session. The design consequence is what matters: releasing is a *softer, more recoverable* commitment than holding.
- **The floor is lethal:** *"Insta-Ball (2,000 Coins) — Bounce off the floor instead of going splat."* [1]
- **At least two obstacle classes:** *"Air Barrys (3,500 Coins) — Leap gracefully over obstacles with these designer sneakers."* [1] If you can jump over some obstacles, the set contains both clearable-low and must-avoid items.
- **Contact has a cost even when survivable:** *"Freeze-O-Matic (3,000 Coins) — … snap-frozen in a solid block of ice. It also helps you slide a few extra meters."* [1]
- **The Stash.** Gadgets *"will be available for purchase in the Stash, giving more options to players stockpiling those hard-earned coins."* [1] Single in-run currency (coins); price band 2,000–6,500 Coins.
- **The gadget slot limit — exactly two.** *"Players can also mix and match **any two** gadgets, which can then be used an unlimited number of times after purchase."* [1] Loadout size 2; permanent once bought; unlimited-use, not consumable.
- **Progress gate.** 15 gadgets in v1.3 (free update, 26 April 2012), *"more than 100 potential combinations in total and players will need to work their way through **five sectors** in order to unlock every gadget"* [1].
- **The end-of-run machine is token-gated and purchasable.** Two of the fifteen gadgets are *nothing but* access to the death screen: *"Token Gift (5,000 Coins) — … A free final spin token, of course!"* and *"Lucky Last (5,500 Coins) — Your final spin token is forged from fortunium, the world's luckiest element."* [1]
- **UNVERIFIED — the multi-heart payout.** A community tips thread reports the final spin can return **1–3 revives** [10]. Not an official source. What *is* verified is the structure: a paid, token-gated, chance-based second chance presented on the death screen. The exact distribution is UNVERIFIED.

### 2. DISTINCTIVE REQUIREMENTS

- **DR-04-6** — Asymmetric one-button. Hold and release act on **different rates**, and the release is the gentle one.
- **DR-04-7** — Consumable pickups that change your **control surface**, not merely your hitbox. Vehicles provide *"a unique control scheme"* [1] and absorb impacts.
- **DR-04-8** — A fixed **two-slot** loadout, progress-gated, bought with one in-run currency, unlimited-use. Choice happens at the boundary, never mid-run.
- **DR-04-9** — The death screen is a **monetised gamble**: a spin token (earned or bought) resolves to a revive.
- **DR-04-10** — One of fifteen power-ups exists purely to **invert the control asymmetry** (Gravity Belt). The meta-layer is literally a tuning knob on the primary mechanic.

### 3. THE CAUSE

Jetpack Joyride has two death surfaces — a **floor** (instant, absolute) and **things in the air** (relative, dodgeable). Flappy Bird has one. Asymmetric rates let the player commit to a descent early and correct upward cheaply, turning the screen into continuous *negotiation* rather than binary gate-clearing. The Stash then sells **permission to re-negotiate**: gravity, freeze, bounce, dash. And the final spin converts a finished loss into a purchasable *variable* outcome — the direct ancestor of Crossy Road's randomised death banner (**FR-37**): same primitive, a chance-based second chance presented immediately, priced in a currency the player just earned or can buy.

### 4. TRANSFERABILITY

| Req | Rating | One-line reason |
|---|---|---|
| DR-04-6 | **Easy** | One boolean from key/pointer state feeding two constants. |
| DR-04-7 | **Moderate** | A control profile is one object swap, but you must *design* 2–3 genuinely distinct profiles, not just a stat delta. |
| DR-04-8 | **Easy** | A two-element array plus `localStorage`. |
| DR-04-9 | **Moderate** | Needs spin counter, payout table and free-spin clock; no server required, but the economy must be internally consistent or it self-exploits. |
| DR-04-10 | **Easy** | One multiplier on the gravity constant. |

---

## 5. CONFLICTS — single-input purity vs. FR-09 (hybrid tap + swipe)

**The tension.** Both games are single-input by design. FR-09 requires tap **and** swipe. If both gestures are live simultaneously, DR-04-1 collapses: a swipe becomes a second, faster, strictly-dominant impulse, and the game stops being about *when* to spend a flap and becomes about *which verb*.

**Resolution — split the verbs by PHASE, not by button.**

1. **Mid-run: tap is the only input that exists.** Swipes are swallowed (`preventDefault`, no handler). DR-04-1 and DR-04-3 stay byte-for-byte intact — the moment-to-moment game is exactly Flappy Bird / Jetpack Joyride.
2. **Swipe is admitted only where run integrity is not at stake:** the pre-run stance (choosing a lane or opening trajectory) and the death screen (swipe to spin, per DR-04-9 / FR-37). FR-09's swipe requirement is satisfied at the meta layer; FR-09's tap requirement is satisfied where it costs the player something.
3. **One handler, disambiguated by motion:** on `pointerdown` start a 150 ms / 12 px threshold — if the pointer travels >12 px before `pointerup` it is a swipe and the tap is suppressed. A tap with any travel is still a tap, which is what a hopping player expects.
4. This is the same structural move both source games make independently: **gesture for meta, tap for the run.** Crossy Road and Flappy Bird already share this split.

---

## 6. HARVEST LIST (ranked)

1. **DR-04-9 — the token-gated death spin.** Highest value by a wide margin. It is the verified ancestor of FR-37, and it costs roughly 40 lines: a slot-reel animation, a payout table, a spin counter in `localStorage`, a free-spin timer. It converts a dead run into a variable, shareable, monetisable moment — the single highest-leverage thing in either dossier.
2. **DR-04-6 — asymmetric hold/release rates.** Very cheap, and it is the difference between a "hold to go up" gimmick and a control scheme with a real skill ceiling. Start with descent ≈ 0.6–0.8 × rise; tune from feel, not from a cited source (the ratio is UNVERIFIED).
3. **DR-04-3 + DR-04-2 — constant velocity, fixed aperture, score-per-gate.** The lane-crossing genre already has the distance rule; the transferable delta is specifically the **fixed aperture width**, which is what makes a single input legible at speed.
4. **DR-04-7 — pickups that swap the control surface, not just the hitbox.** Two or three profiles is enough. This is where the lane-crossing genre is thinnest and the cheapest place to look original.
5. **DR-04-8 — two-slot, unlock-gated, unlimited-use loadout.** Cheap meta layer; build it last, after the run loop is proven.

---

## 7. SOURCES

All retrieved 2026-09-29.

1. **Halfbrick Studios (developer blog, primary).** "In-Depth: Jetpack Joyride Gadgets," 24 April 2012. https://www.halfbrick.com/blog/in-depth-jetpack-joyride-gadgets — *body text read in full.* Source for: 15 gadgets, 5 sectors, 100+ combinations, two-slot limit, unlimited-use-after-purchase, Stash, coin price band, Gravity Belt / Insta-Ball / Freeze-O-Matic / Air Barrys / Token Gift / Lucky Last descriptions.
2. **BBC News.** "Flappy Bird creator removes game from app stores," 10 February 2014. https://www.bbc.com/news/technology-26114364 — *headline and standfirst read; body largely client-rendered.* Source for: Vietnam-based creator; removal on Sunday; 50M+ downloads (image caption).
3. **PocketGamer.biz, Keith Andrew.** "60 new Flappy Bird clones hit the App Store every day," 5 March 2014. https://www.pocketgamer.biz/60-new-flappy-bird-clones-hit-the-app-store-every-day/ — *body text read in full.* Source for: 60 clones/day, 2.5/hour, 300-clone sample, 1-per-24-minutes, Mark Brown's clone definition, Apple non-enforcement finding.
4. **Forbes, Lan Anh Nguyen.** "Exclusive: Flappy Bird Creator Dong Nguyen Says App 'Gone Forever' Because It Was an Addictive Product," 11 February 2014. https://www.forbes.com/sites/lananhnguyen/2014/02/11/exclusive-flappy-bird-creator-dong-nguyen-says-app-gone-forever-because-it-was-an-addictive-product/ — **direct fetch blocked (Cloudflare); verified at snippet level via search index.** Not re-verified in body.
5. **Forbes / InsertCoin.** "'Flappy Bird' Creator Follows Through, Game Removed From App Stores," 9 February 2014. https://www.forbes.com/sites/insertcoin/2014/02/09/flappy-bird-creator-follows-through-game-removed-from-app-stores/ — **snippet level only.** Source for: 22-hour deadline; iOS store takedown.
6. **ABC News.** "Flappy Bird Creator Pulled His Game Because It's an 'Addictive Product'," 11 February 2014. https://abcnews.com/Technology/flappy-bird-creator-pulled-game-addictive-product/story?id=22461633 — **snippet level only.** Source for: addiction rationale, iOS *and* Android removal.
7. **TIME.** "'Flappy Bird' Creator Dong Nguyen Deletes Popular Game," February 2014. https://time.com/5657/flappy-bird-deleted/ — **snippet level only.** Source for: "downloaded more than 50 million times."
8. **Polygon.** "Flappy Bird collects $50K per day in ad revenue," 6 February 2014. https://www.polygon.com/2014/2/6/5385880/flappy-bird-collects-50k-per-day-in-ad-revenue/ — **snippet level only.** Source for: ~$50,000/day average in-app ad revenue, Nguyen telling **The Verge**. CONTESTED.
9. **Wikipedia** — *`Flappy Bird`, `Jetpack Joyride`: NOT RETRIEVED. HTTP 429 from `en.wikipedia.org`, `en.wikipedia.org/w/index.php?action=raw`, and `api.wikimedia.org` on 2026-09-29. No claim in this dossier rests on it.*
10. **Reddit r/JetpackJoyride**, "10 Jetpack Joyride Tips Everyone Should Know!" — **community source, snippet level.** Cited only to mark the 1–3 revive spin payout as **UNVERIFIED**, not to support any requirement.

**Known gaps carried forward:** the Jetpack Joyride thrust/gravity numeric ratio; the exact number of days Flappy Bird remained in stores after removal (widely repeated, not verified here); whether the final spin revives with full health or partial. None of these block implementation — all three are tuning values.

---

### 3.5 Doodle Jump and Temple Run

*Source: `docs/dossiers/05-doodlejump-templerun.md`*

*Dossier 05 — Doodle Jump & Temple Run*

Two games adjacent to the lane-crossing hopper, each solving a problem the base
spec leaves open: how to apply pressure without a pursuer (Doodle Jump), and how
much agency a forward-running game can have (Temple Run). Sources numbered
locally; untraceable claims are marked **UNVERIFIED** and are excluded from the
harvest list.

---

## A. Doodle Jump (Lima Sky — Marko & Igor Pusenjak)

iOS March 2009, Android March 2010 [1]. Two people, ~2 months, all code from
scratch in Xcode [3].

### A.1 Verified mechanics

- **Zero-verb locomotion.** No jump button; contact with a platform top *is* the
  jump command [1][3]. The only inputs are lateral movement and shooting.
- **Tilt lateral, edges wrap.** Store copy, verbatim: *"Tilt to move left or
  right, tap the screen to shoot."* [4] Leaving the left edge re-enters right
  [1]. (Wikipedia flags the accelerometer citation as unverified, so the sensor
  dependency is firm only via the developer's own store copy.)
- **Platform types, five named by the developer:** *"broken, moving,
  disappearing, moveable, and EXPLODING platforms"* [4]. A community wiki adds
  holographic, icicle, shifting [5] — community source, so **UNVERIFIED**; the
  five store-named types are authoritative.
- **Four power-ups:** jet packs, propeller hats, rockets, springs *"that fly you
  higher"* [4].
- **Enemies:** monsters, UFOs, black holes, bear traps; monsters die by being
  jumped on, *"MARIO-style"* [4].
- **Score markers:** other players' real scores rendered into the level as
  targets — claimed as the first game to do so [3], sold as *"blows past other
  players' actual score markers scribbled in the margins"* [4].
- **Balance rule, stated:** one new obstacle shipped per one new power-up [3].
- **Shooting was a post-launch concession.** The first build shot only straight
  up. Directional shooting was added on player request; the team expected it to
  make the game *easier* and were surprised players called it *harder*. Now a
  toggle [3].
- ~25,000 copies/day for four straight months; 10M downloads by Dec 2011 [1].
  $1.99 plus IAP [4].

### A.2 Distinctive requirements

**DR-05-1 — Platform contact is the jump verb.** *Cost:* the player cannot
choose *when* to leave, only where to aim, so expression moves from timing to
placement.

**DR-05-2 — Platform type rewrites the rule of a row, not merely its spacing.**
A normal platform is static geometry; a moving one is a timing puzzle; a
breakable one a *single-use consumable*; a disappearing one a *countdown*; an
exploding one a *trap that punishes a lunge*. All five occupy the same slot
with identical hitboxes and vertical spacing. The highest-value idea here:
difficulty becomes a per-tile **type tag** in a generator, decoupled from
layout, so one row can ask two different questions of the player.

**DR-05-3 — Ascent camera.** The run ends when the player *"falls to the bottom
of the screen"* [1] — anti-stasis with no pursuer sprite and no new rule.

> **UNVERIFIED — "the camera never scrolls downward" is not sourced.** Traced
> across the developer interview [3], both official store listings [4][8] and
> Wikipedia [1]: each states the *death condition* (falling past the bottom
> edge ends the run); none describes the camera's implementation or asserts a
> one-way lock. The claim appears only on clone-game content farms and fan
> wikis. **For the parent: base-spec structural pattern 1 rests on this claim
> and is currently unsourced.** The two readings are behaviourally identical —
> a camera that only ratchets up, and one that tracks you while its lower edge
> rises past you, produce the same failure. Implement the observable rule, not
> the rumoured implementation.

**DR-05-4 — Tilt as the only lateral axis, with wraparound.** *Cost:* a
device-sensor dependency, and a hard blocker on desktop.

**DR-05-5 — The nose-gun.** A tap fires a non-locomotion projectile. Adding it
*raised* perceived difficulty rather than lowering it, because it converts a
passive enemy encounter into an active one with its own aim and timing budget
[3].

**DR-05-6 — Power-ups as rule overrides, not stat boosts.** Rocket and jetpack
suspend the hop arc; the propeller hat inverts vertical control; the spring
multiplies bounce height [4]. Each is seconds of a *different movement grammar*
mid-run.

**DR-05-7 — Diegetic rival scores.** A leaderboard re-rendered as world
geometry [3][4].

### A.3 Cause, behaviour, cost

Auto-jump frees the whole input budget for lateral aim, which is why the game is
one-handed and survives on a 2D canvas. Platform typing turns difficulty from a
*tuning* problem (nudge spacing) into a *content* problem (tag tiles) — which is
what let a two-person team ship years of content, and why the balance rule had
to be held by hand. The nose-gun shows adding a verb is not a difficulty
release valve; it moves pressure onto the enemy's timing. Ascent pressure is
free anti-stasis but only works in a strictly one-axis game — it does not port
to a game with a lateral fail state.

### A.4 Transferability — static HTML/JS/2D canvas, no server, no SDK

| Requirement | Rating | Reason |
|---|---|---|
| DR-05-1 auto-jump | **Easy** | One collision callback sets a negative `vy`. |
| DR-05-2 platform types | **Easy** | A `type` field plus a switch in the collision handler; each type is a one-shot state flip. |
| DR-05-3 ascent camera | **Easy** | `cameraY = min(cameraY, playerY)` and a lower bound that only rises. |
| DR-05-4 tilt | **Moderate** | Needs `deviceorientation` permission on iOS Safari; no desktop equivalent, so a key/touch fallback is mandatory or the game is unplayable on the most common target. |
| DR-05-5 nose-gun | **Easy** | One tap handler, one projectile list, one hit test. |
| DR-05-6 four power-ups | **Moderate** | Few branches each, but every collision rule must be re-tested under four grammars. |
| DR-05-7 score markers | **Hard** | Data is local-only without a server; the offline workaround is a baked-in array of fake scores — a content problem, not a code one. |

### A.5 Conflicts with the base spec

- **FR-07 ("A tap moves forward one tile") — direct contradiction.** Doodle Jump
  has no forward tap: the tap is bound to shooting [4] and forward motion is
  automatic. **Resolution:** keep FR-07 as the genre default and *invert*
  DR-05-1 rather than copying it — a lane-crossing variant where the tap
  advances one lane and platform *type* governs the lane you arrive in: a
  one-use tile is consumed by arrival, a countdown tile expires as you cross,
  a moving tile carries you. This keeps the row-rule rewrite (DR-05-2) without
  inheriting a one-way camera.
- **FR-03 ("One forward hop increments the score by one") — contradiction.**
  Doodle Jump scores altitude, not hops [1]. **Resolution:** keep FR-03
  literally; it is the genre's currency and what makes scores comparable across
  runs. Adopt the *mechanism* (a monotone score rewarding only progress), not
  the unit.

---

## B. Temple Run (Imangi — Natalia Luckyanova, Keith Shepherd, Kiril Tchangov)

iOS August 2011, Android 2012 [2]. Three people, self-funded, ~4 months [2][7].

### B.1 Verified mechanics

- **Four verbs, all 90° swipes:** turn left, turn right, jump, slide [2][6].
  The 2013 store copy: *"Original 3D running mechanic combining turning,
  jumping, sliding and tilting — the first of its kind!"* [6]
- **The character can never stop, and can never turn by any amount other than
  90°.** The developer's own account: they prototyped free rotation of the world
  around the running character *"like a record"*, found *"it made you extremely
  dizzy"*, and constrained the player to 90° turns with no stopping — discovering
  that *"the 90 degree turns allowed us to use a simple swipe mechanic for
  turning"* [7]. The most valuable single finding here: **the constraint on the
  control is what makes the control cheap.**
- **Tilt is a second, orthogonal axis** for coin lines, and the documented
  hardest thing to tune in the project: *"we had to work very hard to get tilt
  and swipe to work right together. When you swipe while you're tilting, the
  angle of the swipe changes"* [7].
- Death: hitting a large obstacle, falling into water, or being overtaken by the
  monkeys [2].
- **Economy:** in-run coins buy power-ups and character upgrades [2]. The
  archived v1.6.1 listing sells *coin packs only* — 2,500 / 25,000 / 75,000 /
  200,000 coins at $0.99 / $4.99 / $9.99 / $19.99. Seven characters; Game
  Center leaderboards [6].
- **The gems experiment.** Coins began as colour-coded gems collected in
  *certain combinations* for a bonus. At speed this was *"way too hard to do… so
  you ended up getting frustrated and ignoring the gems completely."* The
  developers removed the gems entirely, then put them back because they missed
  them [7].
- **The pursuer's rationale is stated, not decorative:** *"why is the character
  running? Why not just stop and take a breather… So we needed something chasing
  the guy. That's how the monkeys were born."* [7]
- **Monetisation pivot:** $0.99 launch Aug 2011, ~#50 Paid, a few hundred
  downloads/day → free Sept 2011 → *"revenue went up 10x immediately"* → #1 Top
  Free 28 Dec 2011 → #1 Top Grossing 7 Jan 2012 → ~500,000 downloads/day [7].
- The **current** listing (v1.42.0) describes swipe-only control; tilt is absent
  from the copy entirely [8]. When it was retired is **UNVERIFIED** — but a
  15-year-old live product dropping a headline control from its own description
  is itself evidence about tilt's durability.

### B.2 Distinctive requirements

**DR-05-8 — Quantised steering.** Free rotation cut to a four-verb 90° set. The
player plans a *path*, not a *trajectory*. *Cost:* the grammar cannot express
"a little to the left".

**DR-05-9 — Non-negotiable forward speed.** The world advances regardless of
input — FR-12's anti-stasis, enforced by the movement model rather than a
pursuer.

**DR-05-10 — Hybrid analog/discrete axes.** Discrete swipe for committed verbs,
continuous tilt for the cheap axis. *Cost:* the swipe angle shifts under tilt [7].

**DR-05-11 — Pursuer as constant presence, not a timer.** The monkeys are always
in frame, supplying *"immediacy and adrenaline"* [7] — a fail-state narrator for
a game with no levels.

**DR-05-12 — In-run currency feeding a persistent upgrade track.** Coins
collected at speed fund power-ups and character upgrades, and are also sold
directly [2][6].

> **UNVERIFIED — purchase-to-continue using crystals.** The brief describes this
> model, but it is absent from the archived 2013 listing, whose entire
> in-app-purchase table is coin packs [6]; absent from the current listing [8];
> and absent from the developer's own account of the coins/gems economy, which
> describes *removing* a gem mechanic, not selling a revive [7]. Wikipedia
> describes the coin economy and power-up purchases but no continue purchase
> [2]. **Do not build this on the strength of the brief.**
>
> **UNVERIFIED — neck strain from the gyroscope.** No reputable press source
> found (Polygon, Eurogamer, Guardian, Game Developer, PocketGamer, Kotaku all
> searched). Base-spec structural pattern 3 asserts it, citing its own [16][17];
> what those describe is *Subway Surfers removing* the gyroscope and turns — a
> downstream product decision, not evidence of injury. Verified and stronger:
> Imangi itself calls tilt+swipe the hardest thing to tune [7], and the current
> listing no longer mentions tilt at all [8]. Directionally right, specifically
> unsourced.

### B.3 Cause, behaviour, cost

DR-05-8 is a *difficulty-of-interface* decision, not of game: removing 270° of
steering removed the ability to micro-adjust, and with it a whole class of
near-misses and complaints, while letting a four-direction swipe replace a
stick. DR-05-9 removes the need for any anti-stasis clock because idling is not
expressible. DR-05-11 turns a missing narrative ("why am I running?") into a
diegetic one for free. The cost is total: the control scheme *is* the game, so
it cannot be bent onto a lane-hopping grid without becoming a different game.

### B.4 Transferability

| Requirement | Rating | Reason |
|---|---|---|
| DR-05-8 quantised 90° steering | **Easy** | Four gestures to four heading changes; no interpolation. |
| DR-05-9 non-negotiable speed | **Easy** | A per-tick increment; fail logic becomes a timing check, not a controller. |
| DR-05-10 tilt coin-steering | **Hard** | The `deviceorientation` permission problem of DR-05-4 *plus* the documented swipe/tilt interference. On desktop it collapses to "arrow key held", but the iOS permission prompt is a real conversion tax. |
| DR-05-11 visible pursuer | **Easy** | One sprite at a fixed offset behind the player, plus an overtake check. |
| DR-05-12 currency → upgrades | **Moderate** | A balance-and-persistence layer (localStorage); the tuning is the work, and per-device without a server. |
| Purchase-to-continue | **Not recommended** | The developer's own account says the design *failed* — players ignored it, so it was cut [7] — and the base spec's anti-pay-gate constraint is its strongest finding. |

### B.5 Conflicts with the base spec

- **FR-04 ("Movement is discrete, with no analog steering and no mid-hop
  correction") — direct contradiction.** Temple Run has no discrete movement at
  all: motion is continuous, uncorrectable between gestures, and the player
  cannot stop. **Resolution:** keep FR-04 as the spine — it is correct for the
  lane hopper. Take DR-05-9 and DR-05-11, which are orthogonal to FR-04: a lane
  hopper can have a world that advances on a timer and a pursuer at a fixed
  offset, both of which press the player forward without ever making movement
  analog. Reject DR-05-8 as a *movement* model — 90° turns are meaningless on a
  lane grid — and keep only its lesson: **quantising control is what makes it
  cheap, and the price is that it cannot express a small correction.** On a lane
  grid the grid is already that quantisation, so the lesson is free.
- **FR-09 (hybrid tap/swipe) — compatible, and reinforced.** Temple Run is
  itself a hybrid, discrete swipe plus analog tilt [6][7], supporting FR-09 as a
  general genre law rather than a Crossy Road quirk.

---

## 6. Harvest list — ranked

1. **DR-05-2, the platform-type system.** Five types sharing one hitbox and one
   slot, differing only on contact, turns difficulty from spacing-tuning into a
   per-tile tag — the most reusable idea in the genre and the cheapest to build.
2. **DR-05-1 inverted, auto-resolve the forward hop.** Take "contact is the
   verb" and point it sideways: a tap that fires on arrival rather than on
   press, so the only decisions are lane choice and timing. Frees the input
   budget entirely.
3. **DR-05-9 + DR-05-11, non-negotiable advance plus a visible pursuer.** The
   two cheapest anti-stasis mechanisms, both fully compatible with FR-04 and
   both trivially expressible in 2D.
4. **DR-05-5, an offensive verb that raises difficulty.** A tap-shoot turning a
   passive threat into an active one, with the developer's own evidence that it
   made the game harder, not easier.
5. **DR-05-8's lesson, not its mechanism.** Quantise control so the input is
   cheap and ambiguity is removed; on a lane grid that is already free, so
   spend the saved budget on DR-05-2 variety instead.

---

## 7. Sources

[1] Wikipedia, *Doodle Jump* — https://en.wikipedia.org/wiki/Doodle_Jump
[2] Wikipedia, *Temple Run* — https://en.wikipedia.org/wiki/Temple_Run
[3] Jon Jordan, "Bouncing ever upwards: The making of Doodle Jump",
    PocketGamer.biz, 11 Sept 2009 (interview with Marko & Igor Pusenjak) —
    https://www.pocketgamer.biz/feature/15412/bouncing-ever-upwards-the-making-of-doodle-jump/
[4] Apple App Store, *Doodle Jump* (Lima Sky), official listing —
    https://apps.apple.com/us/app/doodle-jump/id307727765
[5] *Doodle Jump* community wiki, Category:Platform_Types (community source;
    cited only for the types the store copy omits) —
    https://doodle-jump.fandom.com/wiki/Category:Platform_Types
[6] Apple App Store, *Temple Run* v1.6.1, 13 Sept 2013, via Internet Archive —
    https://web.archive.org/web/2013/http://itunes.apple.com/us/app/temple-run/id420009108
[7] Rob LeFebvre, "Temple Run developer shares a behind the scenes look at
    making a runaway hit iOS game", VentureBeat/GamesBeat, 6 Feb 2012
    (interview with Natalia Luckyanova), via Internet Archive —
    https://web.archive.org/web/2018/https://venturebeat.com/2012/02/06/temple-run-developer-shares-a-behind-the-scenes-look-at-making-a-runaway-hit-ios-game/
[8] Apple App Store, *Temple Run* v1.42.0, current listing, via the iTunes
    Lookup API — https://itunes.apple.com/lookup?id=420009108

The [16][17] cited in §B.2 are the base document's own reference numbers, not
this dossier's.

---

### 3.6 Temple Run 2 and Subway Surfers

*Source: `docs/dossiers/06-templerun2-subwaysurfers.md`*

*Dossier 06 — Temple Run 2 & Subway Surfers*

Both games are endless runners with continuous forward auto-scroll, which
contradicts FR-04 (discrete movement, no analog steering). They are paired
deliberately: same genre, twelve months apart, opposite answers to the only
question that matters for a hopper — *where do you put the ambiguity budget?*
Imangi spent it on the **world**: curvature, blind intersections, a device-tilt
axis, a mine cart that outruns your readability. Kiloo spent it on the **meta**
and spent **none** on the world: no turns, no tilt, three lanes. The hopper
takes Kiloo's axis deletion, plus Imangi's one world-level idea — a safe
sub-mode inside a lethal mode.

---

## A. Temple Run 2 (2013, Imangi Games)

iOS 17 Jan 2013, free with in-app purchase [1][2]. Keith Shepherd's core team
~5, with FuzzyCube on the puzzle minigames [1].

### A.1 Verified mechanics

- **Inherited controls.** Swipe left/right for 90° turns, up/down to dodge, and
  **tilt the device to steer through coin strings** [2]. Tilt is the analog axis
  and the reason TR2 conflicts with FR-04.
- **Curved paths.** TR1 was "all about straight lines and 90-degree turns";
  TR2's headline world change is "hills, valleys and gradual curves" [2].
- **Zip lines.** A new path type, and *"an opportunity for you to take a breath
  since you won't run into any danger on them"* [2] — a no-death stretch inside
  a lethal mode.
- **Mine carts.** The other new path type: the cart *"moves faster than you do
  on foot and approaches turns with much less warning"* [2] — speed bought with
  reaction time.
- **Coin-gated character abilities.** TR2 ships *fewer* unlockable characters
  than TR1, but each fires an ability once you have collected a set number of
  coins: Guy Dangerous = shield, Scarlett Fox = speed boost, Barry Bones =
  50-coin bonus, Karma Lee = 500-point bonus [2]. Zero input cost — the player
  already wanted coins.
- **Two currencies, split purpose.** Coins and gems; gems upgrade power-ups and
  can grant extra lives; both obtainable in play [2].
- **Store copy** sells *"defy gravity, vault over great barriers"*, *"Unlock
  powerful heroes with unique abilities"*, and — for FR-40 — **"Play Offline"**
  [4].
- **The curvature is documented as a cost.** On curves "the camera turns
  slightly" and it is hard to tell which side of the path you are on; TR2's App
  Store reviews complained that "some intersections are poorly visible… You can
  easily miss an intersection or turn and fall into the abyss" [2][3].
  GamesBeat scored it **79/100, below TR1's 85** [2].

### A.2 Distinctive requirements

**DR-06-1 — Curvature is the difficulty dial, and it costs readability.**
*Cost:* the map becomes an inference made under time pressure, not a truth.
Hopper form: a road that visibly bends one lane earlier than its hazard.

**DR-06-2 — A guaranteed-safe sub-mode inside the lethal mode.** *Cost:* failure
is spatially segregated. The most transferable idea here (§6.1).

**DR-06-3 — Speed escalation that *removes* information.** The cart is worse for
reading the world and better for score [2]. Safe hopper inversion: the fast lane
is the one whose hazards were telegraphed two rows earlier.

**DR-06-4 — A power granted by currency count, not by input.** Never competes
for the input budget [2]. Hopper form: a passively-charged second wind the
player only decides *when* to spend.

**DR-06-5 — Two currencies with separated purpose** (spend-now vs.
save-forever) [2]. Redundant with FR-31; do not re-add without a second sink.

**DR-06-6 — The recorded failure of the coin sink.** On TR1: *"we really ran out
of things for people to spend their coins on really fast"*; the TR2 fix was to
be *"really generous with coins"* [1] — **adding coins without a sink is the
easier mistake.**

> **UNVERIFIED — "coins spent on permanent home decoration."** The base spec
> (line 137) asserts this and cites [17], which is the **Subway Surfers** wiki,
> not a Temple Run source. No credible TR2 source reached here ([1][2][4][5])
> mentions a home or decoration screen. The sourced finding is the inverse: TR2
> had no adequate sink and solved it with generosity, not furniture.

### A.3 The cause

TR1 reached 170M downloads [2], so TR2 could be sold as a content-and-world
upgrade into a proven audience — and could afford what Kiloo could not: **make
the map the content.** Curvature, zips and mine carts are three new *generators*,
not three new rules; the input set is unchanged. That is why it scored *lower*
than TR1 [2]: adding ambiguity to a solved control scheme taxes the player
without adding agency.

### A.4 Transferability — static HTML/JS/2D canvas, no server, no SDK

| DR | Rating | Reason |
|----|--------|--------|
| DR-06-2 safe sub-mode | **Easy** | A no-traffic row is a data flag, not a system. |
| DR-06-4 coin-gated ability | **Easy** | A counter and a threshold; no new input. |
| DR-06-3 speed vs information | **Easy** | One lane type, one multiplier, one telegraph offset. |
| DR-06-6 sink-failure lesson | **Easy** | A design constraint, not code. |
| DR-06-1 curvature-as-dial | **Moderate** | A canvas can bend a lane, but readable curvature wants a 3D camera. |

**Tilt/gyro: not transferable — forbidden by FR-04.** Drop the axis (B.3).

### A.5 Conflicts

- **FR-04** — direct. Auto-scroll is continuous world motion; tilt is analog
  steering, which FR-04 excludes by name. Resolved in §5.
- **FR-01 determinism** — curve/cart timing are frame-rate features; port to
  tick-quantised movement.
- **FR-40** — none; TR2 is explicitly offline-playable [4].
- **Crossy-Road identity flag** — the spec flags "PURPLE forest" (§7) and this
  dossier cannot tell which title it describes. The parent must attribute it
  before any art is written.

---

## B. Subway Surfers (2012, Kiloo with SYBO)

Released May 2012 [6]. Stated split: **SYBO created the concept and art; Kiloo
took the user interface, monetization and player retention** [3].

### B.1 Verified mechanics

- **Three lanes is the novelty.** *"The novelty brought by the designers of
  Subway Surfers is a division of the player's path into three tracks. The
  character has to jump between them to avoid both static and dynamic
  obstacles"*; the player *"swipes his character across the display"* [3].
- **Turns and gyroscope both deleted.** *"Devoid of these aspects [blind
  intersections, integrated gyroscope], Subway Surfers has become popular as a
  title with low entry threshold"* [3]. The direction matters: the "twist your
  neck" complaint is recorded against **Temple Run**, as the problem SS removed
  [2][3].
- **Crash is absolute; no buyable continue.** *"In Temple Run, when you bump
  into an obstacle, you can resume if you have crystals that are purchasable for
  real money. In Subway Surfers, when you run into an obstacle, you have to
  start all over."* [3]
- **Hoverboards are the only continue, and they are pre-bought.** *"If you see
  you are going to fail, just activate a board and fly over any obstacle. One
  player can have a limitless amount of boards."* They are *"disposable bonuses
  that are activated on the track, last for a limited amount of time and have a
  specific function"* [3].
- **Daily word hunt.** *"To receive a reward, the player must compose some word
  from letters on the track. It takes no more than five minutes"* — its stated
  purpose is to pull the player back to the friends' scoreboard [3].
- **Power-ups progress by duration, not power.** Upgrades *"prolong the active
  time of power-ups (money-drawing magnets will work for 10 seconds instead of
  5)"*; *"a level 5 magnet will require a half an hour of coin grinding"* [3].
- **Missions:** three tasks each, each completed mission awarding an extra point
  multiplier. **Scarcity by delisting:** the Chicky Board is earnable for 100
  easter eggs, then *"removed from the store. Sorry, limited edition."*
  **Cadence:** monthly track restyles and new characters, some available for 30
  days; 11 purchasable characters [3].
- **World Tour:** from 2013 the setting rotates through named cities — New York,
  Rio, Sydney, Rome, Mumbai, Dubai, Paris, Tokyo, Miami [6] (community wiki; the
  store listing independently confirms the World Tour framing [7]).

> **UNVERIFIED — "the eight power-ups."** The community wiki's own lead calls
> them *"5 main power-ups"*; its table lists fourteen across three families —
> in-run pickups (Coin Magnet, 2X Multiplier, Super Sneakers, Jetpack, Pogo
> Stick), pre-bought boosts (Hoverboard 300 coins, Score Booster 3000, Headstart
> 2000), later event items (Super Mysterizer, Hourglass, Super Bubble, Score
> Blast, Multiplier Bonus, Coin Doubler) [6]. The canonical "eight" traces to
> **no credible source**. The design lesson survives without the count.

### B.2 Distinctive requirements

**DR-06-7 — Three fixed lanes, not a branching path.** *Cost:* the only spatial
decision is 1-of-3, so a wrong guess is recoverable in one hop.

**DR-06-8 — Delete the axis, don't balance it.** No turns means no heading state
and no missed-corner failure; no gyro means no analog input, no neck strain, no
orientation dependency [3]. *Cost:* the map is no longer the content, so content
must be found elsewhere. The most transferable lesson here.

**DR-06-9 — No buyable continue; insurance is bought between runs.** *Cost:*
short sessions, cheap failure, expensive score. FR-19 already buys this.

**DR-06-10 — Single-hit insurance, consumed at the moment of decision.** Not
lives, not a revive prompt: one held charge, spent manually, negating the next
collision [3]. *Cost:* the spend must be timed, converting a reflex game into a
resource-forecasting one. The strongest *portable* novelty in the pair.

**DR-06-11 — A collect-to-spell objective riding the main lane** [3]. *Cost:*
near zero — a second scoring axis on objects the player already walks over.

**DR-06-12 — Progression by duration, not power.** Magnet 5s → 10s [3]. A curve
that can never trivialise difficulty tuning.

**DR-06-13 — Location rotation as the content calendar** [6][7]. *Cost:* art
budget. Take the cadence, drop the cities.

### B.3 The cause

SS was built by the team whose job was retention and monetization [3], not
world-building. With a fixed art budget the only free axis was complexity, and
the cheapest complexity to delete was the one players already complained about.
The resource that made TR2's world richer made SS's simpler, and SS converted
the saved budget into a return-visiting meta [3].

### B.4 Transferability — static HTML/JS/2D canvas, no server, no SDK

| DR | Rating | Reason |
|----|--------|--------|
| DR-06-8 axis deletion | **Easy** | The hopper is already turn-free; a re-affirmation, not work. |
| DR-06-10 single-hit insurance | **Easy** | A boolean shield flag on the collision handler. |
| DR-06-11 word hunt | **Easy** | Letters on tiles, a target string, a per-run timer. |
| DR-06-9 no continue | **Easy** | Already FR-19. |
| DR-06-12 duration upgrades | **Moderate** | Needs a local spend table; tension with FR-46's scrub map. |
| DR-06-13 location rotation | **Hard** | Multiple themed art sets. Take the cadence, not the cities. |

### B.5 Conflicts

- **FR-04** — SS is *more* compatible than it looks: its locomotion is discrete
  (one lane hop, one commit); only the world scroll is continuous. FR-04 bans
  analog steering, not world motion. See §5.
- **FR-19** — none; SS validates "crash, one-tap restart, no continue".
- **FR-46 zero-purchase, fully completable** — DR-06-12's ladder is a sink that
  *lengthens* runs, not one needed to finish. Admissible only as optional
  duration, never as required power.
- **FR-22** — a held insurance charge is a second resource to forecast, risking
  "every failure is legible and immediate". Cap at one charge, arm it visibly.

---

## 5. Resolving the FR-04 conflict

FR-04 reads: *"movement is discrete, with no analog steering and no mid-hop
correction."* Both games appear to fail it. The precise diagnosis:

1. **The analog axis is the real violation, and both games agree.** TR2 keeps
   device tilt [2]; SS deletes it and is credited with a low entry threshold as a
   result [3]. FR-04 already bans tilt — DR-06-8 is a **re-affirmation, not a
   change**.
2. **Continuous world motion is not what FR-04 bans.** FR-04 constrains the
   *player's* control, not the camera. A scrolling world with a discrete,
   committed hop is legal by letter and by intent.
3. **The hopper resolves it by not adopting auto-run as locomotion.** Take SS's
   world — three straight lanes, no turns — and keep the hopper's own authority:
   the camera is player-driven per hop, as Crossy Road already is. The one
   element worth carrying is the **ramp**: a continuously advancing background
   raising pressure without asking for input — not unstoppable locomotion.
4. **The residual conflict is TR2's, not SS's.** Its world ambiguity and tilt
   axis make it a poor hopper donor. Treat DR-06-1 as *explicitly rejected*.

Net: FR-04 stands. Nothing here requires amending it.

---

## 6. Harvest list — ranked

1. **DR-06-2 — a guaranteed-safe sub-mode inside the lethal mode.** The zip line
   is the only stretch where you cannot die, explicitly *"an opportunity to take
   a breath"* [2]. One data flag per row, zero new input, and it gives the run
   natural punctuation and a place to bank a decision.
2. **DR-06-10 — single-hit insurance as a held, spent charge.** One manual
   consume that negates the next hit [3] — the one mechanic here that raises the
   decision density of a game that otherwise has almost none.
3. **DR-06-8 — the axis deletion as a feature.** No turns, no tilt [3]. The
   hopper inherits it free; the binding half is the requirement it implies —
   whatever is removed from the world must be *replaced* in the meta.
4. **DR-06-4 + DR-06-11 — power granted by count, and a collect-to-complete
   objective.** Both ride objects the player already touches; together they are
   the entire anti-stasis budget for a game with no pursuer.
5. **DR-06-6's lesson, not its mechanism.** Imangi's *"ran out of things for
   people to spend their coins on really fast"* [1] is the best available
   evidence for the spec's warning: a currency with no sink trains the player to
   ignore it.

---

## 7. Sources

[1] TWiT / blancer mirror, "Imangi surprises with Temple Run 2 — interview with
    developer Keith Shepherd", 23 Jan 2013 (primary developer interview) —
    https://blancer.com/tutorials/i-phone/489685/imangi-surprises-with-temple-run-2-interview-with-developer-keith-shepherd-2/
[2] John Carmody, "Temple Run 2 review: Imangi's adventure game sequel is a
    fast and fun ride, but the fun fades as the shadows lengthen",
    VentureBeat/GamesBeat, 17 Jan 2013 (79/100) — https://gamesbeat.com/temple-run-2-review/
[3] Game World Observer, "Subway Surfers: a Gameplay Analysis", 24 Jun 2016
    (the base spec's [16]: Sybo/Kiloo split, lane division, gyro/turn removal,
    no-continue contrast, hoverboards, word challenge, upgrade economics) —
    https://gameworldobserver.com/2016/06/24/subway-surfers-gameplay-analysis
[4] Apple App Store, *Temple Run 2* (Imangi), official listing via the iTunes
    Lookup API — https://itunes.apple.com/lookup?id=572395608&entity=software&country=us
[5] Imangi Studios, *Temple Run 2* official page — https://imangistudios.com/thegames/temple-run-2/
[6] *Subway Surfers* community wiki — main article for the May 2012 release, the
    2013 World Tour city rotation, and the Power-Ups table (hoverboard 300 /
    score booster 3000 / headstart 2000 coins; six upgrade tiers
    500/1000/3000/10000/60000; +5s per tier, jetpack capping at 25s) —
    https://subwaysurf.fandom.com/wiki/Subway_Surfers and
    https://subwaysurf.fandom.com/wiki/Power-Ups
    *Community source — used only where corroborated by [3] or [7].*
[7] Apple App Store, *Subway Surfers* (SYBO Games), official listing —
    https://apps.apple.com/us/app/subway-surfers/id745887355

Wikipedia was unreachable from this host (HTTP 429 on all en.wikipedia
endpoints, 29 Sept 2026), so no claim here rests on it. The [15]–[18] numbers
in the base spec are *its* reference numbers, not this dossier's.

---

### 3.7 Sonic Dash and Alto's Adventure

*Source: `docs/dossiers/07-sonicdash-altosadventure.md`*

*Dossier 07 — Sonic Dash & Alto's Adventure: the licensed-run economy and the style-as-fuel loop*

**Method note.** No `web_search` tool was available; research used DuckDuckGo Lite plus `web_fetch`. **Wikipedia was unreachable** (HTTP 429), so two claims survive at snippet level only. The load-bearing sources are the developers' own material: Snowman's press sheet [2], Alto's support page [4], and a 2013 interview with Sonic Dash's developers [6].

**Two corrections first.** Sonic Dash is **2013, by Hardlight** (SEGA's Leamington Spa studio) — not 2015, not Halfbrick; the base spec's table row repeats the error and should be amended [1][6][7][13]. And **wall riding is not in Alto's Adventure** — it is an *Odyssey* (2018) feature named in that game's own copy. Adventure grinds rooftops and jumps chasms [2][3].

---

## A. Sonic Dash (2013, Hardlight / SEGA)

### A.1 VERIFIED MECHANICS

- **Released 7 Mar 2013, iOS.** Free, ad-supported; publisher boilerplate: *"in-app purchases are not required to progress. Ad-free play is available with an in-app purchase"* [1]. 4.68 stars, 418,067 ratings, current build 10.4.0 [1].
- **Swipe-only endless runner:** the player *"controls Sonic (or other unlockable characters such as Tails or Knuckles) by swiping left and right as he continuously runs forward"* [7]. Three directions, no analog axis, no braking.
- **Rings are the in-run currency and persist** — *"Collect rings, power-ups, boosters, and rewards"* [1].
- **Missions sit over the endless core:** *"Blitz events and special seasonal challenges… Compete in daily missions, complete exciting objectives, and discover new adventures every week"* [1].
- **The boss reuses the base verbs verbatim.** SEGA's release: *"Zazz… uses a flying mech. Players will need to swipe left and right to avoid his projectiles, or swipe up to jump over them"* [5]. No new input taught, and it can end the run — *"his relentless pursuit of Sonic could be the end of your perfect run"* [5].
- **A community-wide collection bar:** *"Players across the globe must work together to collect a set number of character cards… When enough have been collected by the whole community, those who took part will receive exclusive Sonic Lost World themed prizes"* [5].
- **Rarity tiers:** *"Common, Rare, Epic and [Legendary]"*; updates ship one Legendary — *"New legendary character: Bloodmoon Werehog"* [1][8].
- **Scale:** *"celebrating 500 million downloads globally"* (PocketGamer, 17 Sep 2021) [9]; *"over 100 million downloads"* by Jun 2015 [6].
- **UNVERIFIED — the "four at launch, 140 by 2026" roster count** [8]: community wiki, no primary source. Do not design against it.
- **UNVERIFIED — that characters change mechanics.** The store says *"unique powers and abilities"* [1], but no ability sheet is published and the developers' own account points the other way (DR-07-6).

### A.2 DISTINCTIVE REQUIREMENTS

- **DR-07-1 —** One in-run currency, spent on the roster, which is the entire sink [1].
- **DR-07-2 —** Missions are the *replay reason*, not a play mode: the run is undirected, the meta supplies direction [1].
- **DR-07-3 —** Rarity tiers plus time-limited licensed drops *are* the content calendar [1].
- **DR-07-4 —** A set-piece exception must reuse the base control set exactly [5]. The cheapest variety available.
- **DR-07-5 —** A community-global progress bar with individual credit: the unlock fires on an aggregate count, only participants are paid [5].
- **DR-07-6 —** The roster is chosen by demand, and the licence is the cause. On record: *"Past the most essential choices (Sonic, Knuckles, Amy)… ultimately we look at what fans are asking for from previous titles, what we feel will map well to the game & finally, where we have the data, we look at how much characters are played in more recent titles to gauge where we should spend our effort"*; and *"in all aspects of sign off about any Sonic content we check with Sonic Team… it's their IP!"* [6]

### A.3 THE CAUSE

DR-07-6 explains the other five. Because the licensor holds sign-off, roster membership becomes a *licensing* decision, and the studio's stated inputs — fan requests and character-usage data — do not measure mechanical distinctiveness. The cascade: characters arrive as collectibles, so they need a currency (DR-07-1), a rarity ladder and a release cadence (DR-07-3). The same clause removes the incentive to build a different control profile per character, which is why the one place the game *does* escalate — the boss — reuses the same three swipes (DR-07-4). **A licensed roster reliably becomes a collection layer rather than a mechanical one, because the licence, not the designer, decides who is in it.** The zones show the same hand: *"We'd always lean towards using places from the Sonic Universe already in existence… it just makes sense"* [6].

### A.4 TRANSFERABILITY (static HTML/JS/2D-canvas, no server, no SDK)

| Req | Rating | Reason |
|---|---|---|
| DR-07-1 ring economy | **Easy** | One integer, one `localStorage` key, one unlock table. |
| DR-07-2 mission layer | **Moderate** | Counters are trivial; authoring 30 *interesting* goals is the work. |
| DR-07-3 rarity + calendar | **Easy** | Four tiers and a date gate — copy the tiering, not the licensed names. |
| DR-07-4 boss reuses verbs | **Moderate** | One timed encounter on existing hitboxes, but it needs an FR-15 telegraph. |
| DR-07-5 global bar | **Hard** | Mechanic trivial, population not; offline it degenerates to a personal bar. |

### A.5 Conflicts

- **FR-19 / FR-34** — validated. Crash ends the run; no lives, no continue.
- **FR-35** — SEGA stating *"in-app purchases are not required to progress"* in writing is a **licensed-publisher precedent for zero-gate progression**. Cite it.
- **FR-16** — *not* evidenced here; justify it from another title.
- **FR-33** — near-true, but the roster is a large permanent content investment. Budget it as content, not cosmetics.

---

## B. Alto's Adventure (2015, Snowman / Team Alto)

### B.1 VERIFIED MECHANICS

- **Released 19 Feb 2015, iOS, at $2.99 — premium, not F2P** — and *"reaching #1 in the Top Paid charts worldwide"* [2]. *"a premium game with no ads or in-app purchases"* [3]. The most important commercial fact in this dossier.
- **Auto-run horizontal; tap to jump, hold to trick.** *"The player-character automatically moves to the right of the screen through procedurally generated landscapes. The player taps the screen to jump and perform tricks (backflips)"* [13, snippet]. Official line: *"Easy to learn, difficult to master one button trick system"* [2][3].
- **Tricks convert directly into speed — stated by the developer.** *"chain together increasingly more elaborate trick combos to **maximize the players speed** and compete for high scores and distances"* [2]; *"Chain together combos to maximize points and speed"* [3]. And the consequence, from the official tips: *"It's vital that you practice chaining lots of tricks together to keep up your speed. **More speed = more air time!**"* [4]
- **Character attributes change the trick economy, not the controls:** *"one of six characters… each with their own unique attributes and abilities suited to different styles of play"* [2]. Concretely: *"make sure you're playing as Maya – she flips much faster than the other players"* [4]. **UNVERIFIED:** Maya's unlock level (community says 11); the combo **multiplier formula** (community only).
- **180 handcrafted goals as scaffolding:** *"As players progress through 180 handcrafted goals, they'll rescue runaway llamas, grind along village rooftops, leap over terrifying chasms and outwit the mountain elders"* [2][3]. Remastered (2022) adds a seventh character and 20 goals → *"195+ handcrafted goals"* [12].
- **Day/night and weather as a free content calendar:** *"braving the ever changing elements and passage of time upon the mountain"* [3]; *"thunderstorms, blizzards, fog, rainbows, shooting stars"* [2]. Corroborated by the developer's asset names `a03_Sunrise.png`, `a05_Night.png`, `b08_ForestDawn.png` [2][11].
- **Verb-unlocks change geometry, not input:** *"Before long players will also acquire the legendary Wingsuit… string together even longer trick combinations"* [2]. **Not in the 2015 launch build.**
- **Craft scale:** Jan 2013 to Feb 2015 — *"spending over 2 years carefully crafting every last detail"* [2]. Nesbitt was sole artist and developer: all programming, art, animation, 2D/3D assets, UI/UX [11].

### B.2 DISTINCTIVE REQUIREMENTS

- **DR-07-7 —** One pointer, one gesture, two depths: a tap jumps, a held tap spins. Nothing added, nothing removed [2][4].
- **DR-07-8 —** Style output *is* the survival resource. Tricks do not score beside speed; they are speed [2][4].
- **DR-07-9 —** Hand-authored goal lists scaffold play without gating it [2].
- **DR-07-10 —** Character differentiation lands on the resource economy, not the controls [4].
- **DR-07-11 —** A day/night and weather cycle is a zero-code content calendar [2][3].
- **DR-07-12 —** Mid-game verbs change the geometry, not the input [2].

### B.3 THE CAUSE

Auto-run makes forward motion free, so attention is the only scarce resource. A game that can only move forward needs a secondary axis to reward attention, and Alto makes that axis **feed the primary one**: tricks raise speed, speed raises air time, air time raises the next trick's ceiling [2][4]. Looking good and staying alive are therefore the same action — there is no reason to play safe. The risk is self-imposed, for a reason the player understands, which is why the game reads as relaxing rather than dull. The goals (DR-07-9) exist because unconstrained auto-run gives no reason to master anything: the list supplies aspiration, the wingsuit (DR-07-12) a new shape to aspire into, the cycle (DR-07-11) free novelty. None of it gates play [2][3].

### B.4 TRANSFERABILITY

| Req | Rating | Reason |
|---|---|---|
| DR-07-7 tap/hold duality | **Easy** | One `pointerdown`/`pointerup` pair; hold > threshold sets `spinning`. |
| DR-07-8 trick→speed | **Moderate** | Small accumulator, but tuning is the design — speed must never cross into unfair (FR-26). |
| DR-07-9 goal scaffolding | **Moderate** | Data is easy; authoring goals that teach without gating is the work. |
| DR-07-10 attribute differentiation | **Easy** | A per-character multiplier object plus a stat card — FR-39 by construction. |
| DR-07-11 day/night | **Easy** | A colour ramp over a timer; no new assets, and the screenshot changes for free. |
| DR-07-12 wingsuit | **Hard** | Needs vertical terrain a lane hopper lacks. Take the pattern, not the object. |

### B.5 Conflicts

- **FR-04** — see §5. Resolvable without amending the spec.
- **FR-23** — Alto scales on *distance*, not score [3] (*"best high score, best distance, and best trick combo"*). Two legible axes.
- **FR-40** — offline-playable, but it uses iCloud sync, so "no account" is **not** satisfied. Do not cite it for that.
- **FR-33** — premium, no IAP whatsoever [3]: a strong precedent for the anti-pay-to-win rule.
- **FR-22** — terrain is *"procedurally generated… based on real-world snowboarding"* [2]: weighted continuity, not a lane list. FR-24 has no analogue here.

---

## 5. Resolving the FR-04 conflict (auto-run vs. manual discrete hopping)

FR-04: *"Movement is discrete, with no analog steering and no mid-hop correction."* Alto appears to fail it. The precise diagnosis:

1. **Continuous world motion is not what FR-04 bans.** It constrains the *player's* control, not the backdrop — the reasoning dossier 06 used for Subway Surfers.
2. **Alto's real violation is the absence of locomotion authority, not its smoothness.** The player never chooses *when* to advance and cannot cancel a jump. Adopt the *consequences* of auto-run, not its cause.
3. **The hopper has no air time, so a backflip has no direct form.** The transferable object is the **conversion** in DR-07-8: a committed action the player initiates, cannot abort, and which pays out into a resource the game then spends.
4. **Resolution: the grind.** A **hold-to-grind** runs the player automatically across a contiguous span of tiles on a fixed line — a rail, a log, a freight-car roof. It is the exact structural twin of a backflip: entered by holding, non-cancellable once begun, ending at a defined tile. It is *not* a longer hop, so **FR-02 stands**; it is a distinct second verb, which is why it is the correct donor and a multi-lane dash would not be.
5. **The conversion, restated for lanes:** chained grinds charge a **streak meter**, spent by the *game* as a forward camera-creep grace period — buying distance before FR-12's pressure resumes. Style pays for time: Alto's inversion, and a re-affirmation of FR-12/FR-13 rather than a replacement.
6. **Cost, honestly:** this is the largest structural addition the dossier proposes, and the only one that raises decision density in a game whose sole other decision is which of three lanes is currently lethal. Sequence it after the FR-01–FR-30 loop feels right.**Net: FR-04 stands, unamended.** Alto is rejected as a *locomotion* model and mined only for DR-07-7, DR-07-8 and DR-07-9.

---

## 6. Harvest list — ranked

1. **DR-07-8 — trick execution converted into speed, so style and survival are the same objective** [2][4]. The top item: the only mechanic here that *removes* a decision rather than adding one — exactly what a one-tap game with an obvious death needs.
2. **DR-07-2 + DR-07-9 — mission lists as scaffolding over an unguided core.** Sonic Dash's daily missions [1] and Alto's 180 goals [2] are the same structure from opposite commercial poles (ad-funded F2P, premium no-IAP). Neither gates play. This is the genre's answer to "what does a returning player look at".
3. **DR-07-5 — a community-global collection bar.** Players pool progress; only participants are paid [5]. Offline it degenerates to a personal bar, so harvest the *shape* — a visible shared counter that resets — not the network.
4. **DR-07-6 — the governance lesson, not the mechanic.** Thirteen years of updates produced a collection layer, not a control layer, because the licence decided the roster [6]. Negative and load-bearing: **if the roster will not change the mechanics, do not spend the content budget pretending it will.** Give it one genuinely different control profile (FR-16) and cut the ladder to three.
5. **DR-07-11 — the day/night and weather cycle.** A colour ramp and a timer: zero new mechanics, permanently fresh screenshots, the cheapest identity available to a 2D-canvas build.---

## 7. Sources

[1] Apple App Store, *Sonic Dash Run* (SEGA), id 582654048, via the iTunes Lookup API — https://itunes.apple.com/lookup?id=582654048&entity=software&country=us
[2] Snowman, *Alto's Adventure* press kit (publisher's own press sheet) — https://www.builtbysnowman.com/press/sheet.php?p=altos_adventure
[3] Apple App Store, *Alto's Adventure* (Snowman), id 950812012, via the iTunes Lookup API — https://itunes.apple.com/lookup?id=950812012&entity=software&country=us
[4] Alto's Adventure official support page, "Landing a triple backflip in Alto's Adventure" — https://altosadventure.com/support/triple_backflips.html
[5] Engadget, "Sonic Dash gets first-ever boss battle to celebrate Sonic: Lost World", 3 Nov 2013, reproducing the full SEGA/Hardlight press release — https://www.engadget.com/2013-11-03-sonic-dash-gets-first-ever-boss-battle-to-celebrate-sonic-lost.html
[6] SEGAbits, "Hardlight Studios talks to us about Sonic Dash…", 18 Mar 2013 — interview with Chris Southall (CTO) and James Booth — https://segabits.com/blog/2013/03/18/hardlight-studios-talks-to-us-about-sonic-dash-their-canceled-vita-game-and-much-more/
[7] MobyGames, *Sonic Dash* (2013) — https://www.mobygames.com/game/62872/sonic-dash/ (Cloudflare-gated; snippet-level only)
[8] Sonic Wiki Zone (community), "Characters in Sonic Dash" — https://sonic.fandom.com/wiki/Characters_in_Sonic_Dash — *community source; used only for the rarity-tier structure, which official release notes corroborate*
[9] PocketGamer, "…celebrating 500 million downloads globally", C. Dellosa, 17 Sep 2021 — headline and date from the site's own structured data at https://www.pocketgamer.com/sonic-dash/ ; body not fetched
[10] PocketGamer, "Sonic Dash Review", H. Slater, 7 Mar 2013 (7/10 per the site's Review schema) — https://www.pocketgamer.com/sonic-dash/review/
[11] Harry Nesbitt (developer & artist), *Alto's Adventure* project page — http://www.harrynesbitt.com/games/altos-adventure/
[12] Apple App Store, *Alto's Adventure — Remastered* (Snowman), id 1576663233, via the iTunes Lookup API (195+ goals, seventh character)
[13] Wikipedia, "Sonic Dash" / "Alto's Adventure" — **snippet-level only**; `en.wikipedia.org` returned HTTP 429 throughout. Used for 2013/Hardlight/Sega attribution and AA's auto-run tap-to-jump-and-backflip description. No claim rests on Wikipedia alone.

**Notes for the parent.** (a) The base spec's comparable-titles row for Sonic Dash carries the wrong year and omits Hardlight — worth a one-line amendment. (b) FR-16 currently leans on a title that does not support it; dossier 01 or 04 may be the correct citation. (c) The 500M figure is press-grade via PocketGamer's metadata, not a SEGA filing.

---

### 3.8 Alto's Odyssey and Paper.io

*Source: `docs/dossiers/08-altosodyssey-paperio.md`*

*Dossier 08 — Alto's Odyssey & Paper.io: the distance-gated pursuer and the trail-as-liability*

**Method note.** No `web_search` tool was available; research used DuckDuckGo Lite, `web_fetch`, the iTunes Lookup API, and direct publisher/store pages. **Wikipedia was unreachable** — HTTP 429 on both the normal endpoint and `?action=raw` — so no claim rests on it. Load-bearing sources are Snowman's press kit [1] and the store listings [2][8][9], all developer-written copy.

**Three corrections to the base spec first.**

1. **Wall riding is Odyssey's**, per the developer's own "Newfound heights… hot-air balloons, moving grind rails, and **wall riding**" [1][2]. Odyssey's list is explicitly new-in-this-title. This corroborates dossier 07's correction and the spec's structural-patterns section should not blur the two titles.
2. **Zen Mode predates Odyssey.** The press kit's History section describes it as an *Alto's Adventure* feature whose players used it "as a therapeutic tool" [1]. Odyssey inherited and restated it — a two-title pattern, not a single-title one.
3. **Paper.io's real-time multiplayer is the 2018 sequel, not the 2016 original.** The 2016 listing says *"Paper.io is for the whole family and **doesn't require an Internet connection**"* [8]. Online play arrives in **Paper.io 2** (9 Aug 2018): *"Online multiplayer you can jump into in seconds"* [9]. The `.io` loop is Voodoo's *second* pass at a rule set that shipped offline first.

---

## A. Alto's Odyssey (2018, Snowman / Land & Sea — "Team Alto")

### A.1 VERIFIED MECHANICS

- **Released 22 Feb 2018 iOS, 26 Jul 2018 Android; $4.99 premium, zero ads, zero IAP** [1][2] — *"Purchase once, play forever"* [2]. 4.43★ / 2,967 ratings. **Named a 2018 Apple Design Award winner** [2] — the only title in the genre table to hold it.
- **Auto-run, one-touch trick system:** *"At the heart of the Alto series is an elegant one-touch trick system. Chain together combos, and complete 180 goals"* [1][2]. "180 goals" is the publisher's own number, not an inference.
- **Terrain is procedural and biomic:** *"procedurally generated terrain"*; *"From the dunes, to the canyons, to the temple city… each area boasting unique visuals and gameplay"* [1].
- **New geometry, same input:** hot-air balloons, moving grind rails, **wall riding**, wind vortexes, rushing water [1][2]. The press kit ships `GIF_Wallride.gif`, `GIF_RopeBridgeWall.gif`, `GIF_WallArchChasm.gif` [1] — the verbs are in the marketing assets.
- **Lemurs are a listed feature, not a hidden one:** *"ride towering rock walls, and escape mischievous lemurs"* [1][2].
- **Zen Mode, in the publisher's exact words:** *"this relaxing mode distills Odyssey down to its purest elements: **no scores, no coins, and no power-ups**. Just you and the endless desert"* [1][2].
- **Six characters**, *"each with their own attributes and abilities"* [1][2] — no ability sheet published (see A.5, FR-16).
- **No level completion.** No finish line, no stage clear, no completion state anywhere in the copy [1][2]. Goals are presented as something to *complete*, never as something that *ends* the session. Photo Mode ships alongside — a camera, not a mechanic [1][2].
- **UNVERIFIED — lemur distance and escape rules.** Community wikis give *"approximately every 2,600 meters"* and state *"the chase ends when the player jumps over a chasm, leaving the lemur behind"* [4][5]. The spec's "~2 km" and its claim that escape is *only* "going faster, never by fighting or by outlasting" — **the never-fight / never-outlast half is sound; the go-faster-only half is not supported.** A chasm is a second, terrain-based exit. Both routes still leave the player no weapon and no defensive timer, which is the part that transfers.
- **UNVERIFIED — that Alto never loses speed.** Attributed by the spec to AndroidGuys [24]; that URL is **dead (404) and was never archived** [6]. Design *intent* is well supported — tricks convert into speed, speed is the survival resource [1][2] — but the physical claim is not sourceable. Treat as principle, not measured fact.

### A.2 DISTINCTIVE REQUIREMENTS

- **DR-08-1 —** The pursuer is **distance-gated, not idle-gated**. It cannot exist before ~2 km of play, so the opening of every run is safe by construction. Contrast FR-13, which arms the eagle on a stopwatch and can therefore fire in the first second of a new player's first run.
- **DR-08-2 —** The pursuer offers **no defensive verb at all**: no attack, no invulnerability, no survivable timer. The only way out is to use something the player already owns.
- **DR-08-3 —** Style *is* the escape. Trick chains buy speed, speed buys distance, distance ends the chase. The pressure and the skill expression are the same subsystem.
- **DR-08-4 —** A stated-subtraction mode: Zen Mode removes score, coins **and** power-ups simultaneously, and gets its own soundtrack [1][2]. Not a difficulty slider — a parallel build with a smaller feature set.
- **DR-08-5 —** 180 goals that scaffold without gating; completing them does not stop play [1][2].
- **DR-08-6 —** Mid-game verb-unlocks change the *geometry*, not the input set [1][2].

### A.3 THE CAUSE

Alto is auto-run, so forward motion is free and the player can never stall — the exact problem FR-12 and FR-13 exist to solve. Alto's answer is not a second clock but a **conversion of distance into danger**: nothing threatens the player for the first two kilometres — long enough to learn the controls and establish the run as *earned* — and only then does the desert chase. Because the pursuer cannot be fought or waited out (DR-08-2), the game must spend a resource the player already has: speed, which only the trick system produces (DR-08-3). Anti-stasis pressure and score become one mechanism, so the game never has to threaten a player who is doing well or punish one who is learning. That is why it reads as relaxing: **the threat is real, legible, entirely self-inflicted, and arrives late enough that the player has already decided the game is fair.** Zen Mode (DR-08-4) is the same insight as a product decision — if the chase is the only thing creating tension, remove the chase and the scoring, and what remains is a competent toy for players who want the aesthetic without the tension.

### A.4 TRANSFERABILITY (static HTML/JS/2D-canvas, no server, no SDK)

| Req | Rating | Reason |
|---|---|---|
| DR-08-1 distance-gated pursuer | **Easy** | One integer threshold and an arm flag; it *replaces* the FR-13 idle timer rather than adding to it. |
| DR-08-2 no defensive verb | **Easy** | A constraint, not a system — implement it by not implementing anything. |
| DR-08-3 style→escape | **Moderate** | Needs dossier 07's grind/streak meter wired to pursuer distance, not to score. |
| DR-08-4 Zen Mode | **Easy** | A `zen: true` flag hiding the HUD and disabling two subsystems. Cheapest identity here. |
| DR-08-5 goal scaffolding | **Moderate** | Counters trivial; authoring goals that *teach* without gating is the work. |
| DR-08-6 geometry unlocks | **Hard** | Wall riding needs vertical terrain a lane hopper lacks. Take the pattern, not the object. |

### A.5 Conflicts

- **FR-04** — see §5. Same diagnosis as dossier 07: Alto is rejected as a *locomotion* model and mined only for its pressure system.
- **FR-13 / FR-12** — **directly contradicted; amend.** Alto's anti-stasis mechanism is better for a new player: gate on distance, not idleness. Both stay right in principle; their *trigger* is the weak part.
- **FR-15** — validated. The lemur is a visible, telegraphed pursuer.
- **FR-05** — strongly validated. No hard level end at any point [1][2].
- **FR-35** — a premium, zero-IAP, zero-ad precedent for anti-pay-to-win, seconded by dossier 07.
- **FR-40** — offline, but uses iCloud sync, so "no account" is **not** satisfied. Do not cite it for that.
- **FR-16** — the store claims characters have "attributes and abilities" [1][2] but publishes no ability sheet. **Not evidenced**; the Sumara "no lemur chase" claim is community-only [4]. Do not build FR-16 on this title.

---

## B. Paper.io (2016, Voodoo)

### B.1 VERIFIED MECHANICS

- **iOS release 4 Nov 2016, free, Voodoo (id 1171814682)**, 4.49★ / 156,462 ratings, 12+ [8]. Android followed as `io.voodoo.paper2`.
- **The trail as a liability, in the developer's own words** — the single most important sentence in this dossier: *"But be careful! You have a **weak spot: your tail**. If an enemy touches it, that's the end for you."* [8]
- **Scoring is territory, not distance:** *"Your goal? To conquer as much territory as possible"*; *"victory in Paper.io is never certain until you possess all the territory"* [8].
- **The 2016 build is offline:** *"doesn't require an Internet connection."* Opponents are therefore AI [8].
- **Lineage stated by the publisher:** *"inspired by io type games (made popular by agar.io)"* [8].
- **Paper.io 2 (9 Aug 2018)** adds the online loop and the retention copy: *"Online multiplayer you can jump into in seconds"* · *"**Quick matches that fit into any break**"* · *"100+ unique skins to collect"* · *"Free rewards every day"* · *"A secret surprise if you manage to capture the entire map"* [9]. 4.55★ / 2,886,870 ratings — an order of magnitude more reviewed than the original [9]. Voodoo's page: *"Outsmart your opponents, conquer all countries and rule the world!"* [10]
- **Scale:** Paper.io (2016) is credited as Voodoo's *"first successful hyper-casual game… with 83M+ downloads"* [11]. Third-party estimate, not a company filing.
- **UNVERIFIED — the "two-minute session".** No primary or approved-secondary source states a match length; the figure circulates only on SEO review sites excluded from this brief. What *is* primary is the design intent — *"Quick matches that fit into any break"* [9] — which establishes short-session design without a number. **Do not spec 120 seconds on this evidence.**

### B.2 DISTINCTIVE REQUIREMENTS

- **DR-08-7 —** The trail is a **liability, never a score**. It contributes nothing until it is closed, and closing it is what converts it to territory. The same object is cost and reward depending on one state flag.
- **DR-08-8 —** Progress and exposure are the same axis. Every tile of claimed territory is converted *out* of the open; every tile of open ground is space you must cross with a live trail. There is no safe expansion — the win condition and the danger condition advance together.
- **DR-08-9 —** Death is a **contact event with a visible, previously-drawn cause**, not a timer. The player is always killed by a line they can see.
- **DR-08-10 —** Session length is a designed retention unit, stated as a product feature: quick matches, daily rewards, 100+ skins [9].
- **DR-08-11 —** The drop-in is the whole onboarding: *"jump into in seconds"* [9] — no lobby, no party, no tutorial, and the player population is the content.

### B.3 THE CAUSE

Territory scoring creates a trap every competitor must have faced: the score you have is the safe ground you stand on, and the score you do not have is the only place you can go. Paper.io resolves it by making the movement itself cost something (DR-08-7) — moving draws a line an opponent can touch to end the run [8]. This converts a *conquest* game into an *exposure* game, and that inversion is the whole design. Optimal play is not maximal expansion but calibrated exposure: go far enough to claim, return early enough to survive. The player constantly chooses a risk they fully understand, and the tension is self-authored (DR-08-9). The short match (DR-08-10) makes that a loop rather than a campaign: a decision that takes thirty seconds to make must be made again in thirty, or the session ends. **Paper.io's lesson is that a score which is also a liability produces engagement without difficulty, because the player generates the pressure and can always see it coming.**

### B.4 TRANSFERABILITY (static HTML/JS/2D-canvas, no server, no SDK)

| Req | Rating | Reason |
|---|---|---|
| DR-08-7 trail as liability | **Easy** | A boolean `exposed` per tile plus a stamp call on each move; no geometry, no simulation. |
| DR-08-8 progress↔exposure coupling | **Easy** | A second grid tracking claimed tiles; both are arrays. |
| DR-08-9 contact death | **Easy** | Point-in-grid test — but it must respect FR-27's tight airborne window. |
| DR-08-10 short-session loop | **Easy** | A timer and instant restart; FR-29 already pays for it. |
| DR-08-11 drop-in / real population | **Hard** | The mechanic is instant-play; the *content* is other humans. Offline it needs AI opponents — real work. |

### B.5 Conflicts

- **FR-03** — validated in spirit, violated in form: Paper.io scores *enclosure*, not forward movement. Score and progress are decoupled.
- **FR-05** — near-true: matches end by death or total conquest, but there is no end to *the game*.
- **FR-19 / FR-34** — validated. Contact is instant and total.
- **FR-24** — relevant and violated: an arena that traps the player inside their own trail is unpassable. Any hopper borrowing DR-08-7 needs a solvability guarantee for its exposed state, which FR-24 already supplies for lanes.
- **FR-40** — the 2016 build is fully offline [8]; only Paper.io 2 needs a connection. A useful precedent.
- **FR-12 / FR-13** — *not* evidenced. Paper.io denies stasis differently: your own trail is the clock. Idle, and your zone does not grow while rivals do.
- **The multiplayer half is out of scope by infrastructure**, not by merit — the same exclusion the spec already applies to online leaderboards.

---

## 5. Resolving the FR-04 conflict — and correcting the premise

The brief states that **both** titles are auto-run. **Only Alto's Odyssey is.** Paper.io is *continuously steered* — the player holds continuous heading authority over a moving avatar, violating FR-04 far more directly than Alto. The two failures are different and need different answers.

1. **Continuous world motion is not what FR-04 bans** — it constrains the *player's* control, not the backdrop. Dossier 07's reasoning holds.
2. **Alto's violation is the absence of locomotion authority**: the player never chooses *when* to advance. Adopt its consequences, not its cause — dossier 07 §5's **hold-to-grind** (committed, non-cancellable, rail-bound) is the answer. FR-02 stands.
3. **Paper.io's violation is direct** — continuous heading authority, correctable mid-move. Nothing there transfers, and "let the player steer to close a loop" would destroy FR-02, FR-04 and FR-25 at once.
4. **What transfers is Paper.io's state model, not its control scheme.** Re-express DR-08-7 in lane terms: a hop leaves the tile behind it **marked and vulnerable** for as long as the grind is held. Grind duration is the exposure window; landing closes it and converts marked tiles into a claimed run, exactly as a closed loop converts trail into territory.
5. **A stationary player is then caught two ways** — pursuer behind, unfinished exposure ahead. The spec's first structural pattern is satisfied twice, by independent systems, neither needing a network.
6. **Cost:** the largest single structural addition across all eight dossiers; sequence it *after* the FR-01–FR-30 loop feels right. **Net: FR-04 stands, unamended.** Both titles are rejected as *locomotion* models — Alto gives a pressure system, Paper.io a state model.

---

## 6. Harvest list — ranked

1. **DR-08-1 + DR-08-2 + DR-08-3 — gate the pursuer on distance, deny it every defensive verb, let the player's own skill buy the exit** [1][2]. Top item: the only mechanism here that *replaces* FR-12/FR-13 rather than piling on, and it makes the first two kilometres a guaranteed-safe tutorial at no extra code.
2. **DR-08-7 + DR-08-8 — the trail as liability, re-expressed as an exposure window on the grind** [8], ported in §5. The only mechanic here that adds a real second decision to a game whose sole current decision is which of three lanes is lethal — and it reuses a verb FR-04 already requires.
3. **DR-08-4 — Zen Mode.** A flag hiding the HUD and disabling score, coins and power-ups, with its own soundtrack [1][2]. Zero new mechanics, a second product-shaped reason to open the game.
4. **DR-08-5 + DR-08-10 — goals and a bounded session as the reason to return.** Alto's 180 gating-free goals [1] and *"quick matches that fit into any break"* [9] are one structure: a reason to return that neither gates nor extends play.
5. **DR-08-9 — death by a visible cause, and nothing else.** A hopper killed by a line it drew three seconds ago fails FR-26's fairness test exactly as a car hitbox does. Budget it in FR-15 from the start.

---

## 7. Sources

[1] Snowman / Team Alto, *Alto's Odyssey* **Press Kit** (publisher's own) — https://altosodyssey.com/press/ — features, 180 goals, Zen Mode wording, wall riding, lemurs, 22 Feb 2018 iOS date, credits
[2] Apple App Store, *Alto's Odyssey* (Snowman), id 1182456409, via the iTunes Lookup API — https://itunes.apple.com/lookup?id=1182456409&entity=software&country=us — $4.99, premium/no-IAP copy, full feature list, 4.43★/2,967, Apple Design Award
[3] iMore, "Alto's Odyssey Tips & Tricks: Escape Lemurs, Ride Walls Over Chasms", Serenity Caldwell, 22 Feb 2018 — https://www.imore.com/altos-odyssey-tips-and-tricks-help-you-escape-lemurs-ride-walls-over-chasms-and-more — **headline, date, author and grindable-object list verified from the page and its metadata; the article body fell inside a truncated fetch and was not read in full**
[4] Alto's Odyssey Wiki (Fandom), "Lemur" — https://altosodyssey.fandom.com/wiki/Lemur — *community source; used only for the "chase ends at a chasm" rule and the 2,600 m interval*
[5] Alto's Adventure Wiki (Fandom), "Lemur" — https://altosadventure.fandom.com/wiki/Lemur — *community source; near-identical text to [4], which may be copy-paste between mirrors — treat the Adventure/Odyssey attribution as unsettled*
[6] AndroidGuys, "Not all endless games are shallow", 22 Feb 2018, https://www.androidguys.com/2018/02/22/alto-odyssey-game-review — **DEAD (HTTP 404) and never archived by the Wayback Machine (verified 29 Sep 2026). The base spec's citation [24] for "Alto never loses speed" is unusable**
[7] MobileSyrup, "Alto's Odyssey Review: Amplifying the endless runner", Patrick O'Rourke, 22 Feb 2018 — https://mobilesyrup.com/2018/02/22/altos-odyssey-review/ — fetched; title/date/author/677-word count confirmed, body truncated. The base spec's "no hard level end" citation [23] is **not verifiable from this fetch**; the claim is instead supported by the press kit and store listing, which contain no completion state at all
[8] Apple App Store, *Paper.io* (Voodoo), id 1171814682, via the iTunes Lookup API — https://itunes.apple.com/search?term=paper.io&entity=software&country=us — 4 Nov 2016 date, the "weak spot: your tail" copy, "doesn't require an Internet connection", agar.io lineage, 4.49★/156,462
[9] Apple App Store, *Paper.io 2* (Voodoo), id 1423046460, same lookup — "Online multiplayer you can jump into in seconds", "Quick matches that fit into any break", 100+ skins, daily rewards, 9 Aug 2018, 4.55★/2,886,870
[10] Voodoo, *Paper.io 2* product page — https://voodoo.io/paper2 — "Outsmart your opponents, conquer all countries and rule the world!"
[11] Sacra, "Voodoo revenue, valuation & funding" — https://sacra.com/c/voodoo/ — Paper.io (2016) as Voodoo's first successful hyper-casual title, 83M+ downloads. *Third-party estimate, not a company filing*
[12] Wikipedia, "Alto's Odyssey" / "Paper.io" — **unreachable: HTTP 429 from both `en.wikipedia.org/w/` and `?action=raw`, 29 Sep 2026. No claim in this dossier depends on it**

**Notes for the parent.** (a) FR-12/FR-13's *trigger condition* is the weakest clause in the spec; Alto offers a better one — amend or cite DR-08-1. (b) Base-spec reference [24] is a dead link with no archive; "Alto never loses speed" needs a new source or should be restated as design intent. (c) Reference [23] is fetchable but not extractable; "no hard level end" is better supported by the press kit. (d) Paper.io's multiplayer contribution belongs to the 2018 sequel, not the 2016 title in the table. (e) Dossier 07's FR-16 flag stands — this dossier does not rescue it.

---

### 3.9 Shooty Skies and Piffle

*Source: `docs/dossiers/09-shootyskies-piffle.md`*

*Dossier 09 — Shooty Skies & Piffle: what one movement core does *not* cover*

**Method note.** No `web_search` tool; research used `web_fetch`, the iTunes Lookup API, DuckDuckGo/Brave (both blocked), archived store listings, developer sites, PocketGamer, and Wikipedia via `action=raw` (DuckDuckGo and Brave were blocked). One **screenshot was read directly as evidence** [14].

**Four corrections first. Two refute this dossier's own brief.**

1. **Shooty Skies is Mighty Games, not Hipster Whale.** The base spec says Hipster Whale. Wrong: the seller is *Mighty Games Group Pty Ltd* [3], Wikipedia says "created by Mighty Games" [10], the official site says "from Mighty Games" [15], and Shooty Skies is **absent from Hipster Whale's own catalogue** [12].
2. **Shooty Skies is not isometric; the Crossy Road grid does not carry over.** The brief assumes "isometric grid movement reused… whether the grid carries over unchanged". **Refuted by screenshot** [14]: a top-down oblique perspective over a receding plank pier, plane pinned low, enemies descending. No grid, no tile, no follow-camera. This inverts the shared-engine thesis (§C).
3. **Piffle has no paddles and no documented power-by-drag-length.** Store copy, 2018 and 2026 alike: *"Swipe or point with your finger to aim / Choose the best possible angle to shoot / Release to bounce around and break all the blocks"* [6][16]. **Angle only.** It is a ball-*breaker* — the ball is the avatar, blocks the only colliders [8]. The brief's paddle premise should be dropped outright.
4. **Same-device multiplayer is Crossy Road's, not Piffle's.** Crossy Road: *"**Same device multiplayer!** Challenge your friends and family on same-device multiplayer mode."* [13] Piffle says only *"Challenge your friends at any time"* [6] — no mode, no platform. **UNVERIFIED.**

## A. Shooty Skies (2015, Mighty Games)

### A.1 VERIFIED MECHANICS

- **iOS 29 Sep 2015, Android 6 Nov 2015, desktop 6 Mar 2018** [3][10]. Free, **Unity**, 12+, 4.65★/5,616, still shipping (v3.441, Sep 2026) [3]. Archival subtitle "**Endless Arcade Flyer**" [7] — a Mighty Games trademark, deliberately parallel to Hipster Whale's "**Endless Arcade Hopper**™" [12][15]. Lineage is arcade: Galaga, Space Invaders, 1942, Xevious, Raiden [10].
- **One finger, three phases** (per the reviewer who played it): holding the screen shoots, sliding the finger weaves, and powered attacks require that you *"**take your finger off the screen as long as you dare to power up**"* [2].
- **Bosses on a kill counter, not a clock:** a boss commences after a set number of kills — money-spitting bald eagle, axe-wielding giant beaver, disembodied mouth firing fast food [2].
- **33 characters, drawn, backdrop only.** 500 coins per draw or $0.99 IAP [2][10]. Verbatim: *"each character comes with their own backdrop… **The changing environments don't alter gameplay at all**"* [2]. Now *"over 200 daring pilots over 20 different terrains"* [7].
- **The daily mission has a player-chosen difficulty multiplier — the "Danger Scanner" (v2.306, 28 Nov 2017):** *"**Four intensity levels: Scouty, Skirmish, Shooty (Classic) and Screamy**… ease in or go in hot! Bonus Golden Tickets for higher Intensity-level Daily Missions."* [7]
- **A date-seeded daily shipped unwinnable.** v2.402, 10 Jan 2018: *"**Fix for impossible Daily Mission on January 2nd**"* [7]. Same changelog: *"Character Carousel fixes"* — the unlock menu is a *carousel*.
- **Death is purchasable out of, twice:** coins buy *"frequent **Continues** and the occasional upgraded weapon"*; weapons unlock for an hour via a single ad, and *"all weapons reset after an allotted time"* [2]. Verbatim 1★: *"The claw machine's got a terrible drop rate for new characters."* [2]

### A.2 DISTINCTIVE REQUIREMENTS

- **DR-09-1 —** Firing and aiming are **mutually exclusive**: holding fires, releasing charges. Power costs the thing power is for — a live gun. One finger, three states, zero buttons.
- **DR-09-2 —** Difficulty is a **player-chosen constant**, not a score function: four named tiers picked before the run, applying to the daily too [7].
- **DR-09-3 —** One shared daily seed, chosen multiplier. Everyone plays the identical 2 January mission at Scouty or Screamy [7]: comparison point preserved, skill bracket self-declared.
- **DR-09-4 —** A date-seeded generator is **not guaranteed solvable, and it failed in production** [7]. Strongest empirical evidence for FR-24.
- **DR-09-5 —** Escalation punctuated by bosses on a kill counter [2].
- **DR-09-6 —** Unlocks are a random draw behind a **named, visible machine** — the "claw machine", 500 coins [2]. Chance is the acquisition verb, shown as an object.
- **DR-09-7 —** Character roster is **pure presentation** [2].

### A.3 THE CAUSE

Shooty Skies reused two assets: **the art pipeline and the meta-shell** — blocky retro-electronics look, coin economy, carousel, 99¢ unlock, and above all **the principals**: it credits `@KlickTock`, Wikipedia's source for Matt Hall [15][11], while Hipster Whale's press kit says Hall and Sum *"co-direct"* Mighty Games with Matt Ditton and Ben Britten [1].

The movement core was not reused, for a mechanical reason. A dimetric grid exists to make a *tile-to-tile judgement* honest and fast; in a shooter the judgement is *continuous avoidance against projectiles*, and a tile grid quantises the dodge. **The ported engine was the content pipeline, not locomotion.**

### A.4 TRANSFERABILITY (static HTML/JS/2D-canvas, no server, no SDK)

- **DR-09-1 — Easy.** One `firing` boolean gating a charge accumulator.
- **DR-09-2 — Easy.** An integer on spawn density/speed, set once.
- **DR-09-3 — Easy.** A second multiplier on the FR-38 date-seeded PRNG.
- **DR-09-4 — Easy detect / Moderate prevent.** A solver pass over the lane list; prevention needs a constrained generator.
- **DR-09-5 — Moderate.** One counter, one entity, one scripted encounter.
- **DR-09-6 — Easy.** A weighted pick behind a visible machine; `localStorage` roster.
- **DR-09-7 — Easy.** A constraint: implement by not implementing stats.

### A.5 Conflicts

- **FR-01/02/04 — contradicted.** No grid, no hop, no discrete movement, no follow-camera [14]. Rejected as a *locomotion* model; only its pressure and meta systems are harvested.
- **FR-11/12 — contradicted.** The camera neither follows nor creeps; anti-stasis comes *entirely* from incoming projectiles. The pursuer **is** the bullet stream.
- **FR-16 — contradicted, and a warning.** Characters change nothing but the backdrop [2]. With dossier 08's Alto finding, two titles now show marketing says "variety" and play says "reskin". Consider demoting FR-16 to a stated aspiration.
- **FR-23 — contradicted, and a proposal.** A pre-chosen tier [7] serves FR-23's intent (never punish thinking) by moving difficulty out of the run entirely.
- **FR-06/29/30 — contradicted. Do not import.** Coins buy **Continues** [2]: the spec's own restart principle traded for revenue, and the likely reason 1★ reviews attack depth instead of difficulty. **FR-35 — partly violated:** the 99¢ character unlocks are cosmetic, so not pay-to-*win*; the Continue purchase is the problem.
- **FR-33/36 — rejected.** Random-draw acquisition is the opposite of FR-36's "a change the player can see during play".

## B. Piffle (2018, Hipster Whale with Mighty Games)

### B.1 VERIFIED MECHANICS

- **iOS 3 Oct 2018** [4], free, 4+, 4.83★/22,242 — *best-reviewed title here, still shipping* (v4.608, Jul 2026) [4]; Apple Arcade as **Piffle+** [4]; Switch [11]. Joint venture: *"Hipster Whale and developer Mighty Games"* [9]. Hipster Whale's copy: *"Collect an army of cute Piffle Balls to help you clear a mishmash of challenging blocks and obstacles."* [12]
- **Ball-breaker:** the ball **is** the avatar, which PocketGamer places in a "renaissance" of bouncing games alongside holedown [8]. **Aim is angle** [6]; **scoring is bounce count** — *"Bounce as many times as possible to make combos"* [6]. **Win condition is a quota**, not survival [8].
- **Ammo is finite per level and recovered by skill — the key mechanic:** you start with *"a small number of piffles"*, more are scattered among the blocks, and *"**Hit one and they'll join your squad, giving you more ammo for your next shot.**"* [8]
- **Block classes change rules, not just spacing:** some explode, some move, and some are *"cut off at different angles to try and throw your carefully aimed shots off"* [8].
- **Power-ups are mostly *information*:** sunglasses show where your shot will land, plus damage-up piffles, charge lights and bombs [8]. The flagship converts hidden state into visible trajectory.
- **Collectibles are crafted, not drawn:** *"these unique balls can be **crafted** and collected in order to add them to your ally roster"* [9]. Hipster Whale calls it *"an army"* [12] — the roster is **ammo**, not a wardrobe. **Levels, not endless:** *"hundreds of puzzle-filled levels"* [9].
- **The designer rates it below Crossy Road on stickiness, deliberately:** *"It might not have the staying power of Crossy Road… You jump in, progress a little, and then jump out."* [8] **Player-reported only:** clearing the space *"drops down 3 new rows of blocks"* [16].
- **UNVERIFIED — same-device multiplayer.** Only *"Challenge your friends at any time"* [6] — the documented same-device feature belongs to Crossy Road [13]. **Do not spec multiplayer from this.**
- **UNVERIFIED — power set by drag length**, and **UNVERIFIED/"refute" — paddle physics.** Primary source says angle only [6][16] and describes no paddle [6][8]. **Refute, do not soften.**

### B.2 DISTINCTIVE REQUIREMENTS

- **DR-09-8 —** Aim is a single pointer; release is the only commit. No analog steering, no fire button, no power axis [6].
- **DR-09-9 —** Ammo is a **depleting resource that skill replenishes** [8]. A shot spent on a pickup is a shot not spent on the quota — objective and economy compete for one currency.
- **DR-09-10 —** Clearing the board extends it, 3 new rows [16, anecdotal] — a level procedurally prevented from finishing, by success rather than threat.
- **DR-09-11 —** Collectibles are **crafted, not drawn** [9]. Deterministic production versus variable-ratio chance; the meta is a plan, not a gamble.
- **DR-09-12 —** The signature power-up **reveals the simulation** [8]. Cheapest fairness affordance: one overlay line.
- **DR-09-13 —** Per-level objects that alter rules, not just spacing [8].

### B.3 THE CAUSE

Piffle is the counterweight to everything Crossy Road is. A lane hopper has no scarcity — you cannot run out of hops, so pressure must be external. A ball-breaker has built-in scarcity: **the shot is the currency and the board is finite.** So Piffle needs no pursuer, no creeping camera, no idle timer: **the level ends when the ammo does.** DR-09-9 is the entire anti-stasis system, and it is a *resource* rather than a *threat* — which is why the game can be cozy and still bounded [12].

The trade is total. An endless run optimises for the restart loop; a finite-ammo puzzle optimises for the solved board, so Piffle declines Crossy Road's retention model [8]. DR-09-11 follows: if the meta is progression through authored levels, a random-draw machine would be chance *without progress*, so the roster had to become craftable. **Same two studios, opposite economy, opposite unlock verb — the sharpest evidence that the meta-shell is per-game content and the input philosophy is the shared core.**

### B.4 TRANSFERABILITY (static HTML/JS/2D-canvas, no server, no SDK)

- **DR-09-8 — Easy.** `pointerdown` records an angle, `pointerup` launches; no integration, no deadzone.
- **DR-09-9 — Easy.** An integer, a decrement, a pickup entity. Best value-per-line item here.
- **DR-09-10 — Moderate.** Three lines of row spawning, but needs a board model a lane hopper lacks.
- **DR-09-11 — Easy.** A recipe table and a deterministic RNG; no drop-rate tuning, no pity logic.
- **DR-09-12 — Easy.** Run the same integrator 40 steps, draw it. Turns a guess into a decision.
- **DR-09-13 — Moderate.** Each class is a small component, but the *set* is what feels authored.

### B.5 Conflicts

- **FR-05, FR-02/04 — contradicted.** Level-based with completion [6][9], and angle-and-launch rather than discrete movement. The genre's counter-example: bounded, completable, rated as such.
- **FR-12/13 — superseded; this is the headline.** No pursuer, no creeping camera; boundedness comes from finite ammo [8]. Spec structural pattern 1 is a claim about *endless* games; Piffle shows the other solution is to **not be endless** and bound the session with a resource.
- **FR-29/30 — validated by contrast.** A sub-one-second restart is meaningless when progress is a level. Keep them, but stop calling them genre-wide rather than endless-run-wide.
- **FR-33/36 — validated and improved.** Crafting satisfies FR-36 cleanly: the player watches a Piffle get made, then uses it. Contrast DR-09-6's claw machine, which satisfies neither.
- **FR-38 — not evidenced.** No daily challenge in the 2018 or 2026 copy [6][16]; that structure lives in Shooty Skies [7] and Crossy Road [13].
- **FR-40 — validated.** Free, no account language, local single-device by construction [6].

## C. The shared core: weaker than the brief assumes, and more useful

The brief's thesis — that a shared isometric movement core is "the strongest argument for what is portable" — **does not survive the evidence.** What is actually shared, at four confidence levels:

1. **The people (certain).** Matt Hall — `@KlickTock`, Wikipedia's source for Matt Hall [11] — is credited on Shooty Skies [15], and Hipster Whale's press kit states Hall and Sum *"co-direct"* Mighty Games with Matt Ditton and Ben Britten [1]. Shooty Skies is a **sister studio run by the same two founders**.
2. **The toolchain (certain).** Shooty Skies is Unity [10], and a shipped changelog item is a *Unity iPhone X detection bugfix* [7] — same engine, release cadence and device matrix as Crossy Road.
3. **The input philosophy (certain, and the most portable thing here).** Zero buttons, one finger, one gesture family across all three: tap+swipe [13], hold+drag+release [2], point+release [6].
4. **The meta-shell (certain).** Coin economy, carousel of collectibles, direct unlock at $0.99 [2][4][13].

**Not shared, and the most useful finding here: the projection is not shared.** Crossy Road's dimetric grid [13] and Shooty Skies' scrolling top-down perspective [14] cannot be the same code; Piffle is side-on and shares no geometry with either. The reusable unit is therefore **a shell — engine, input model, art pipeline, coin economy, carousel — wrapped around a per-game movement core and a per-game meta verb.** Piffle's crafted roster (DR-09-11) and Shooty Skies' claw machine (DR-09-6) are that shell filled with two opposite meta verbs, which is the brief's "per-game content" half, now evidenced rather than asserted.

For a new hopper: inherit the shell wholesale (1–4) and treat the movement core as the thing you must build and differentiate. Two threads for the spec's owner — correct the Shooty Skies studio credit to Mighty Games; and act on the FR-16 demotion noted in A.5.

---

## 6. HARVEST LIST (ranked)

1. **DR-09-9 — finite ammo, replenished by skill (Piffle)** [8]. Best anti-stasis system in any dossier so far and the cheapest: it replaces a pursuer, a camera creep and an idle timer with one integer and one pickup entity, and makes the shot itself the decision.
2. **DR-09-2 + DR-09-3 — one daily seed, player-chosen intensity (Shooty Skies)** [7]. Turns FR-38 from a gimmick into a skill-bracketed ladder, and moves difficulty outside the run, which is what FR-23 actually wants.
3. **DR-09-4 — the generator shipped an impossible daily and it was patched** [7]. Proof that FR-24 is the genre's hardest requirement, plus a ready-made test case.
4. **DR-09-12 — trajectory preview as flagship power-up (Piffle)** [8]. One function converts a guess into a decision without adding a rule.
5. **DR-09-11 — crafted, not drawn, collectibles (Piffle)** [9]. Deterministic production delivers the FR-36 "I can see what I earned" moment a random drop rate never will [2].

**Not harvested:** Shooty Skies' isometric premise (refuted), its coin-purchased Continues [2] (destroys FR-29/30), its cosmetic-only characters [2] (refutes FR-16), and Piffle's same-device multiplayer (UNVERIFIED; probably Crossy Road's [13]).

## 7. SOURCES

[1] Hipster Whale Press Kit (official, arch. 2016). https://web.archive.org/web/20160829204314/http://hipsterwhale.com/press
[2] TouchArcade, B. Broder, "'Shooty Skies' Review", 21 Oct 2015, 4★. https://web.archive.org/web/20170226130820/http://toucharcade.com/2015/10/21/shooty-skies-review/
[3] iTunes Lookup API, Shooty Skies id 962993853 (seller *Mighty Games Group Pty Ltd*). https://itunes.apple.com/lookup?id=962993853
[4] iTunes Lookup API, Piffle id 1350644300; Piffle+ id 6742088715. https://itunes.apple.com/lookup?id=1350644300
[5] Google Play, `com.mightygamesgroup.shootyskies`. https://play.google.com/store/apps/details?id=com.mightygamesgroup.shootyskies
[6] Google Play, `com.hipsterwhale.piffle`. https://play.google.com/store/apps/details?id=com.hipsterwhale.piffle
[7] App Store listing, Shooty Skies (arch. 2016–2018), incl. version history 2.306/2.402. https://web.archive.org/web/2016/http://itunes.apple.com/us/app/shooty-skies-endless-arcade/id962993853
[8] PocketGamer, H. Slater, "Piffle review", 4 Oct 2018, 7/10. https://www.pocketgamer.com/piffle/review/
[9] PocketGamer, C. Bald, "[Update] Quirky cat-filled-puzzler Piffle is available right now", 4 Oct 2018. https://www.pocketgamer.com/piffle/update-quirky-cat-filled-puzzler-piffle-is-available-right-now/
[10] Wikipedia, "Shooty Skies", `action=raw`. https://en.wikipedia.org/w/index.php?title=Shooty_Skies&action=raw
[11] Wikipedia, "Hipster Whale", `action=raw`. https://en.wikipedia.org/w/index.php?title=Hipster_Whale&action=raw
[12] Hipster Whale, official site (catalogue; Piffle copy; trademarks). https://hipsterwhale.com/
[13] App Store listing, Crossy Road id 924373886. https://apps.apple.com/us/app/crossy-road/id924373886
[14] TouchArcade in-game screenshot, Shooty Skies, Oct 2015 — **read directly as evidence**; archived image. https://web.archive.org/web/2017id_/http://cdn.toucharcade.com/wp-content/uploads/2015/10/shootyskies.jpeg
[15] shootyskies.com, official (credits; "Endless Arcade Flyer™"). https://www.shootyskies.com
[16] App Store listing, Piffle (arch. Jan 2019, v4.502). https://web.archive.org/web/20190101000000/http://itunes.apple.com/us/app/piffle/id1350644300
[17] App Store "More by HIPSTER WHALE" shelf (Castle), retrieved via the Piffle page, 29 Sep 2026. https://apps.apple.com/us/app/piffle/id1350644300

---

### 3.10 Clone failure and synthesis

*Source: `docs/dossiers/10-clone-failure-synthesis.md`*

*Dossier 10 — Why Faithful Clones Fail, and What the Evidence Implies for an Original Game*

**Scope:** synthesis dossier for the hopper-genre research programme. Read-only against sibling dossiers; writes only this file.

**Method note:** no general web search was available to this dossier (DuckDuckGo, Brave, Mojeek, Qwant, Yandex, Startpage, eTools, searx instances and Bing's web UI all returned CAPTCHA walls or HTTP 429). Work proceeded by direct-URL retrieval, the Internet Archive CDX index, the iTunes Search API, and the platform policy pages. This constraint is load-bearing for §1 and §2.

---

## 1. THE CROSSY TOWN CASE — the attribution does not survive checking

The base spec attributes the Crossy Town numbers to a wnhub article, "Pros and cons of cloning games," at `https://wnhub.io/news/other/item11145`. **That attribution fails verification.**

- The URL returns **HTTP 404**. wnhub.io has been rebuilt into a "business hub for games, iGaming & tech"; the old `/news/<section>/item<n>` article hierarchy no longer exists.
- The Internet Archive holds **zero captures**. A full CDX sweep of the entire wnhub.io domain (`matchType=domain`, `collapse=urlkey`, 1,174 unique URLs) contains **no URL matching `/news/*/item*` at all**. archive.today has no capture either.
- "Crossy Town" does not appear in the iTunes Search API for the **US, BR, PT or GB** storefronts (`entity=software`). The only "Crossy"-named iOS results in those markets are unrelated games (Froggy Crossy Road, Crossy Pixel Run, Crossy Bridge), none by a seller called Niobium.
- Repeated index queries for the title, the studio name and the distinctive figure combinations returned only SEO content farms, which are excluded by source policy and which do not corroborate each other anyway.

**The entire Crossy Town evidence set is UNVERIFIED.** Specifically: ~500,000 installs; ~$50 first-month ad revenue; zero in-app purchases; a three-person Brazilian team (Niobium); ~1 month build time; a Chinese publishing deal; all retention figures; and the developers' own stated conclusion — no reachable source exists for any of them, and no primary quotation of the developers appears anywhere.

This is not a small correction. The base spec's single most load-bearing empirical anchor — "the documented clone failure" — rests on a dead, never-archived URL. **Correction: base-spec ref [13] must be struck, not softened.** Treat Crossy Town as a hypothesis about a category outcome, not a case study. The load-bearing evidence here is the two clone floods (§2), the Voxel Goats menu-loop analysis (§3), and the platform policy text (§4) — all directly verified.

---

## 2. THE CLONE FLOOD — two documented waves, one of which the base spec sourced

**Flappy Bird wave — verified.** PocketGamer.biz, Keith Andrew, **5 March 2014** [1], body read in full: "An average of **60 new Flappy Bird clones roll out on the App Store every day** … with **2.5 clones added every hour**," based on "the **last 300** Flappy Bird clones to have launched" — one clone every 24 minutes, and "on some days, **14 Flappy games can be added in the space of one hour**." The formal clone definition is the editor's own: "any game in which you guide some character through an obstacle course of pipes (or similar objects) hanging from the ceiling and sticking out of the ground" — character identity explicitly does *not* count as differentiation. The enforcement finding matters most: it "had been claimed that Apple was clamping down on Flappy Bird clones, though **Pocket Gamer's data suggests the Cupertino giant has either lost control, or is simply not enforcing any notable action**."

**Pop the Lock wave — verified, and the tighter analogue.** PocketGamer, Mark Brown, **2 October 2015** [2], body read in full. Pop the Lock launched **10 September**, was **featured by Apple on 11 September**, hit **#1 free on 13 September** — and the **first clone appeared on 14 September**: a two-day window from featuring to commoditisation. Brown counted **~35 clones in under a month**. Template shops carried the mechanic as a **~$100 asset**, one verified live two hours before publication. The underlying template **was licensed from Chupamobile** — a licensed template was not a defence. Brown on both platforms: neither "will not pull a game just because it feels a bit cloney."

**Crossy Road wave — partially verified, and the counts are the missing part.** Verified: the flood happened, and its most important party denied damage. Matt Hall (Hipster Whale): "the **mountains of clones** hasn't exactly hurt his company's ability to make money off Crossy Road" [2]. UNVERIFIED: **any specific numeric count of Crossy Road clones, from any date, from any outlet.** Figures in the SEO-farm ecosystem could not be traced to PocketGamer.biz, PocketGamer.com, Game Developer, Polygon, The Verge, Kotaku, wnhub or The Guardian. A CDX sweep of the full pocketgamer.biz index filtered for "crossy" returns 325 URLs — merchandising, tags, charts, features, interviews — and not one article quantifying the wave.

**No documented policy change followed either wave.** There is no sourced Apple or Google rule change dated after 4 February 2014 (Flappy's removal) or 2 October 2015. The policy text is unchanged — see §4.

---

## 3. WHY THE MECHANICS ARE NOT THE MOAT

The base spec cites "Dreaming of Voxel Goats" as "the postmortem of unsuccessful Crossy Road-like projects." **That framing is wrong and should be corrected.** Game Developer, Jools Watsham, **10 December 2015** [3] is a *devlog*, written while the game was healthy: Totes the Goat had "**170,000+ installs in under a week**", "**105,000** entries in the Game Center leaderboard", "**4.5 stars from 104 reviews**", and Apple was putting it on the front of the store. Watsham noted "not a ton of cash has been made from video ads / in-app purchases yet." **It is not a postmortem, and Totes the Goat is not presented as a failure.** The claim that clones fail *empirically* has no source in this article.

What the article does contain is a **design argument**, and it is the strongest evidence in this dossier because it is causal and specific:

> "My overwhelming feeling from playing these games — as well as the Crossy Road-style games that I know are clones — is that **many players don't fail at the gameplay, they fail at the meta-game**. The menu/reward loop… is so important. The actual game just has to be a vehicle to show them the next menu or the next reward. And if you get the menu/reward loop wrong, you don't even get to have the gameplay. The Crossy Road menu has a real flow. Once you die, the immediate reward is right there. And the result is a *flow state* that keeps people playing."

He names the corruption precisely — the "**toilet humor** … Chicken & Eggs, Crossy Road poop emojis … **players become utterly confused by the mixed messaging and quit**" — and verifies that this is a *content* decision, not a genre requirement: his own game carries an award, "the Horny Goat award, for getting a high score 50 times."

Three conclusions follow. First, **a hop-scraper geometry is not a barrier to entry; it is a barrier to being noticed** — cheap to reproduce (~$100 [2]), legible in a sentence, describable in two days. Flappy's data proves reproducibility, not value. Second, **what is expensive is what nobody copies**: menu cadence, reward pacing, art-direction voice, the meta-progression curve — exactly the things Watsham identifies as the difference between retention and quitting, and precisely what a template pack does not contain. Third, **the moat is the first five minutes, not the mechanic**. Pop the Lock went from featured to cloned in two days because the mechanic was legible in two days. Nothing in a hop-scraper slows that. What slows it is a reward loop a player cannot see in a screenshot — and a screenshot is the entire unit of competition in a chart position.

---

## 4. APP STORE POLICY — what the platforms say, and why it does nothing here

**Apple, §5.2 Intellectual Property** [4], verbatim: "Only use content, services, and materials that you own or are authorized to use. Don't use protected third-party material such as trademarks, copyrighted works, or patented ideas in your app without permission." And: "Make sure your app — including advertising and other third-party content — does not use content, artwork, photos, or other materials that are copied… someone else's app may be removed if they've 'borrowed' from your work."

**Apple, §3** [4]: "we won't distribute apps and in-app purchase items that are clear rip-offs." The only Apple text reaching toward non-IP rip-offs — and it governs **distribution and monetisation**, not gameplay.

**Google Play, Intellectual Property policy** [5]: framed entirely around copyright, trademark and patent, enforced through notice — the **DMCA takedown form** and the **Play trademark complaint form**. There is no self-service path for "your mechanic was copied."

**Three structural reasons enforcement is weak here, all sourced:**

1. **Both policies are copyright/trademark/patent instruments, and game mechanics are not copyrightable subject matter** in either jurisdiction. A rule of the game, an idea, a control scheme or a grid geometry is protectable only through a patent — not a practical instrument for a hop-scraper game, and not one this genre's developers pursue.
2. **Both enforcement paths are notice-based and adversarial.** Google Play requires a **valid claim of rights** and warns that unsubstantiated claims risk account termination [5]. Apple reserves the right to reject a notice [4]. A small studio facing a template flood cannot front that legal cost and delay.
3. **The line the platforms actually draw is between "clone" and "variation" — and the developer draws it, in their own favour.** Kurt Bieg (Simple Machine), in [2]: "**If the gameplay is different, in any way, that negates the game being a clone.** This is why **2048 isn't a clone, but rather a variation, which to my knowledge hasn't broken any rules**." The base spec [15] presents this as *app store policy explicitly declining to act against a clone whose gameplay differs in any way*. **That is a correction.** It is a developer's characterisation of the gap, published in trade press — not policy language. Neither Apple nor Google publishes any text of that kind; the two policies above are the operative text.

---

## 5. WHAT THIS IMPLIES FOR AN ORIGINAL GAME

**MUST be built, cannot be borrowed (where the design work actually lands):**

- **The menu/reward loop** — without it you "don't even get to have the gameplay" [3]. Highest-leverage asset in the genre; the one thing a clone factory cannot ship.
- **Presentation layer and art direction** — distinct silhouette, palette discipline, and a *consistent* register across menu, HUD, characters and store assets. Watsham's "mixed messaging" failure [3] is a tone-consistency bug, and tone is a cost line a clone author does not pay.
- **Character identity and roster** — Flappy's own clone definition treats character identity as non-differentiating [1]. The character is not the clone, it is the brand. A single-skin clone has nothing to lose and nothing to protect.
- **Meta-progression design:** awards, unlock pacing, run-length curve.
- **Store-page and icon-level distinctiveness** — the unit of comparison in the top-grossing chart.
- **Original theme, naming, iconography, audio** — the only categories the two policies actually reach [4][5], and the cheapest possible insurance.

**Genuinely free to copy, because no platform and no rights-holder can enforce it:** core geometry (tile-forward / tile-sideways stepping, row-scrolling, discrete grid lanes); the hop arc and fixed follow camera; the obstacle vocabulary (cars, trains, rivers, logs, eagles); the scoring model (one unit per row, death on contact, endless); casual modifiers (item boxes, shields, retro modes, multipliers); the one-tap control scheme.

**Free because nobody owns it is not the same as free because it is a good idea.** Every one of those is available to any clone author at ~$100 [2] and will be copied within days of your featuring [2]. They are table stakes, not strategy. The framing: *do not spend originality budget on mechanics, because it will not survive; spend it on the layer above mechanics, because nothing else will.* Ship mechanics legible in two days — the two-day window [2] is a floor, not an accident.

---

## 6. HARVEST RISK REGISTER

**RR-10-1 — Mechanic commoditisation within ~72h of featuring.** *Evidence:* Pop the Lock featured 11 Sept 2015, first clone 14 Sept; templates ~$100 [2]. *Mitigation:* treat the mechanic as public property from launch; spend no originality budget there; hold 48h capacity to re-skin a trending copycat.

**RR-10-2 — First two sessions lost to a broken reward loop, not bad gameplay.** *Evidence:* Watsham — players "become utterly confused by the mixed messaging and quit" [3]. *Mitigation:* playtest the menu/reward loop before run-loop polish; if the post-death screen is not visibly better than death, do not ship.

**RR-10-3 — Reliance on unverifiable market data.** *Evidence:* the whole Crossy Town data set (§1) and the Crossy Road clone count (§2) are UNVERIFIED, yet both are widely repeated. *Mitigation:* strike them from the business case; fund a first-party measurement plan (own store-page CVR, own D1/D7) before committing build budget.

**RR-10-4 — Expecting platform enforcement to protect you.** *Evidence:* Apple's only non-IP language is §3 rip-off *distribution* [4]; Google Play enforcement is notice-based and requires a claim of rights [5]; PocketGamer concluded Apple had "lost control, or is simply not enforcing any notable action" [1]. *Mitigation:* budget zero for takedowns. Design for the flood, not for the appeal.

**RR-10-5 — Confusing copyright with the genre's free layer.** *Evidence:* both IP policies are copyright/trademark/patent instruments [4][5]; Flappy's clone definition treats character identity as non-differentiating [1]. *Mitigation:* legal spend limited to name/icon/theme clearance. Do not seek to protect the hop.

**RR-10-6 — Template-shop supply of a $100 hop-scraper.** *Evidence:* a Chupamobile template was live two hours before publication; Pop the Lock was built on a licensed template and was still cloned [2]. *Mitigation:* the barrier to a competent clone is ~$100 and 1–2 days. Any design whose only defence is "it's hard to copy" has already failed at concept stage.

**RR-10-7 — Chrome-only differentiation (a reskin, not an original).** *Evidence:* the reward loop and register, not the art, decide retention [3]; 2048 is held to be legal-but-legitimate as a "variation" [2]. *Mitigation:* original theme, naming, iconography and audio are mandatory — and are also the only legally protected parts. The rare case where the cheap option and the defensible option coincide.

**RR-10-8 — Being the original that gets harvested, with no recourse.** *Evidence:* [1] and [2] together — Flappy's removal removed the original and left the field open; the template market converted Pop the Lock's mechanic into commodity supply. *Mitigation:* hold what a copier cannot ship (register, reward cadence, roster, live-ops) and treat the mechanic as a gift given to the market deliberately.

**RR-10-9 — Mis-citing a dead source in a design document.** *Evidence:* the wnhub attribution 404s and is absent from the Internet Archive's complete wnhub.io index (§1). *Mitigation:* every figure in this dossier carries a live URL or an UNVERIFIED mark; new figures must clear the same bar before entering a design decision.

**RR-10-10 — Citing "Dreaming of Voxel Goats" as evidence that clones fail commercially.** *Evidence:* it is a devlog of a game at 170,000+ installs and 4.5 stars, published while Apple featured it; its menu-loop conclusion is an author's design argument about other games, not a measured result [3]. *Mitigation:* cite it for the *design claim* (the menu/reward loop is where retention is made), never for the *commercial claim* (that clones measurably lose money). The commercial claim remains UNVERIFIED in the public record.

---

## 7. SOURCES

1. **PocketGamer.biz — Keith Andrew, "60 new Flappy Bird clones hit the App Store every day." 5 March 2014.** https://www.pocketgamer.biz/60-new-flappy-bird-clones-hit-the-app-store-every-day/ — *body text read in full.* Source for: 60 clones/day, 2.5/hour, 300-clone sample, one per 24 minutes, 14 in an hour on peak days, Mark Brown's formal clone definition, Apple's non-enforcement finding.
2. **PocketGamer — Mark Brown, "Your game is going to be cloned." 2 October 2015.** https://www.pocketgamer.com/pop-the-lock/your-game-is-going-to-be-cloned/ — *body text read in full.* Source for: Pop the Lock launch/feature/#1/clone timeline, ~35 clones counted, ~$100 Chupamobile template, Kurt Bieg on 2048 and "variation", Matt Hall on "mountains of clones", platforms not pulling for feeling cloney.
3. **Game Developer (Gamasutra) — Jools Watsham, "Dreaming of Voxel Goats." 10 December 2015.** https://www.gamedeveloper.com/audio/dreaming-of-voxel-goats — *body text read in full.* Source for: Totes the Goat install/rating/leaderboard figures and "not a ton of cash"; the menu/reward-loop, mixed-messaging and toilet-humor analysis; the point that this is a devlog, not a postmortem.
4. **Apple Developer — App Store Review Guidelines, §3 and §5.2 Intellectual Property.** https://developer.apple.com/app-store/review/guidelines/ — *full text retrieved.* Source for the verbatim policy language and for the absence of any gameplay-clone provision.
5. **Google Play Console Help — "Intellectual Property."** https://support.google.com/googleplay/android-developer/answer/9888072?hl=en — *full text retrieved.* Source for notice-based enforcement, the DMCA and trademark-complaint routes, and the warning that unsubstantiated claims risk account termination.

**Checked and found unavailable (recorded for audit):** `https://wnhub.io/news/other/item11145` — HTTP 404; no capture in the Internet Archive's complete wnhub.io CDX index; no capture on archive.today.

---

## Disposition table — every harvested requirement accounted for

Each row states what became of one of the 117 harvested requirements. Promoted rows link to a consolidated requirement; merged rows combine with one or more siblings; cut rows carry a recorded reason; duplicate rows are lessons captured elsewhere; risk rows live in `docs/DEVELOPMENT-PLAN.md`'s risk register.

Every one of the 117 harvested requirements from the ten dossiers, accounted
for. Generated by `tools/check_requirements.py` to keep this file in lockstep
with the consolidated specification.

**Status legend.**
- **PROMOTED** — became a consolidated requirement by ID.
- **MERGED** — combined with one or more siblings into a single consolidated
  requirement, listed in the target column.
- **CUT** — not carried into the build, with a recorded reason.
- **DUPLICATE** — restates another harvested requirement.
- **RISK** — dossier 10 risk register item, promoted into
  `docs/DEVELOPMENT-PLAN.md`'s risk register.

| DR / RR | Title | Status | Target / Reason |
|---|---|---|---|
| DR-01-1 | Stalling is a distinct, lethal verb | PROMOTED | M-08, R-05 |
| DR-01-2 | The reward screen is the product | MERGED | S-05, S-06 |
| DR-01-3 | Roster swaps content, never rules | PROMOTED | E-07 |
| DR-01-4 | A discrete gamble consumes accumulated currency | MERGED | E-11 |
| DR-01-5 | Asymmetric input with a privileged default direction | PROMOTED | M-03 |
| DR-01-6 | Behavioural theme packs as the retention unit | MERGED | S-09 (then cut in Phase 0) |
| DR-01-7 | A goal row with a guaranteed-open-slot invariant | PROMOTED | B-08 |
| DR-01-8 | A round clock that progress refunds | CUT | Conflicts with X-02 (no play timer on core loop). Frogger's per-round timer is genre-incidental, not load-bearing. |
| DR-01-9 | Finite lives, selectable per credit | MERGED | E-11 (lives are a purchasable budget) |
| DR-01-10 | Carriage as the mandatory river verb | CUT | Frogger-specific. Lane crossing is already covered by B-01, B-07. |
| DR-01-11 | A large, distinct death taxonomy | MERGED | R-05 |
| DR-01-12 | Score for time surplus | MERGED | P-13 (scoring function reformulated to forward hops only) |
| DR-01-13 | A non-monotonic difficulty curve | CUT | Contradicts P-09's monotonic scarcity ramp. Easing violates the spatial-difficulty invariant. |
| DR-02-1 | A depleting gauge replenished only by advancing onto a specific tile | PROMOTED | P-08 (reformulated as route constraint) |
| DR-02-2 | Difficulty ramp driven by scarcity of the refill tile | PROMOTED | P-09 (reformulated) |
| DR-02-3 | Landmarks that double as respawn checkpoints | PROMOTED | B-09 (reformulated as within-run recovery, currency cost) |
| DR-02-4 | A distinct low-resource warning channel | PROMOTED | P-11 |
| DR-02-5 | One-hit death with landmark-level instant respawn | MERGED | P-15, R-06 |
| DR-02-6 | Unbounded content from a small legible tile vocabulary | PROMOTED | B-10 |
| DR-02-7 | Scarcity turns the safe line into a decision | PROMOTED | P-10 |
| DR-02-8 | A pursuer attacking from behind | MERGED | P-01 (pursuer exists) |
| DR-02-9 | A fixed-count streak paying a screen-clearing blast | CUT | Requires an attack verb; conflicts with G-02 scope. |
| DR-02-10 | A behaviour roster, not a single AI | CUT | Stat-card mechanism is enough; eight named ghosts are Pac-Man-specific. |
| DR-02-11 | Power-ups as equipped loadout chosen before play | CUT | E-04 was cut for redundancy; this is its source and goes with it. |
| DR-02-12 | Currency that must be spent to play with advantages or to continue | CUT | Direct violation of X-02 (no energy gate) and X-03 (no pay-to-win). |
| DR-02-13 | Downed players restored by pickup, not a life counter | MERGED | B-09 (within-run recovery), E-09 (single-hit insurance) |
| DR-02-14 | Unlock pacing that is time-gated on mobile, skill-gated on console | CUT | Time-gating conflicts with X-02. Skill-gating is implicit in P-12. |
| DR-03-1 | A run is a vertical stack of discrete rooms, not a continuous field | CUT | Side-scroller, contradicts the isometric hopper spec. Used as anti-evidence only. |
| DR-03-2 | Per-room and per-tower scoring granularities | MERGED | E-11 (economy covers per-run scoring) |
| DR-03-3 | Lives are a purchasable budget, not a countdown | PROMOTED | X-01 |
| DR-03-4 | Every scored unit carries a difficulty rating | CUT | Castle-specific; the difficulty multiplier applies only to the daily per S-03 |
| DR-03-5 | Long-run currency pooled socially but spent individually | CUT | Needs a server, excluded per E-14 cut decision |
| DR-03-6 | Heart Vending Machine: 100 coins for one life, every 10 rooms | MERGED | E-09, B-09 (single-hit insurance checkpoint) |
| DR-03-7 | Group advancement decouples team progress from personal progress | CUT | No multiplayer in scope |
| DR-03-8 | Themed reskin (Castle's apple-orchard tower, Construction Tower, etc.) | CUT | No IP in scope; theming is content, not a load-bearing mechanism |
| DR-03-9 | Licensed content creates a hard external expiry | CUT | No IP in scope |
| DR-04-1 | Exactly one input surface, acting on exactly one axis | CUT | Spec is hybrid (tap forward, swipe lateral); see M-03, M-07 |
| DR-04-2 | Score = distance, awarded only on a completed binary gate | MERGED | P-13 (scoring function reformulated to forward hops) |
| DR-04-3 | Constant forward velocity + fixed-width vertical aperture | CUT | Contradicts M-04 (discrete movement, player-driven camera) |
| DR-04-4 | One-hit death | PROMOTED | P-15 |
| DR-04-5 | Death is a state, not a screen | MERGED | R-01, R-03 |
| DR-04-6 | Asymmetric thrust/gravity rates | MERGED | G-01 (grind mechanic) |
| DR-04-7 | Gap-of-X collectibles placed by difficulty | CUT | Economy already covered; no per-difficulty placement in scope |
| DR-04-8 | User-named craftable gadgets | CUT | Jetpack-specific. The cosmetic-unlock rule covers it without naming. |
| DR-04-9 | Token-gated end-of-run spin | PROMOTED | S-06 |
| DR-04-10 | Phase-gated input: mid-run tap, swipe only pre-run and on the death screen | PROMOTED | M-07 |
| DR-05-1 | Platform contact is the jump verb | MERGED | M-02 (forward hop stays tap; contact triggers type effect, not the hop) |
| DR-05-2 | Platform type rewrites the rule of a row | PROMOTED | B-03, B-04, B-05 |
| DR-05-3 | Ascent camera: death on falling below screen | MERGED | P-02, P-05 (pursuer and camera rules) |
| DR-05-4 | Tilt as the only lateral axis | MERGED | M-10 (inversion option) |
| DR-05-5 | The nose-gun: a tap fires a projectile | CUT | Conflicts with G-02 (no offence verb other than grind) |
| DR-05-6 | Power-ups as rule overrides, not stat boosts | MERGED | B-04 (tile-type system is the override vocabulary) |
| DR-05-7 | Diegetic rival scores | PROMOTED | E-15 |
| DR-05-8 | Quantised steering (90° turns, no free rotation) | MERGED | M-04 (discrete movement) |
| DR-05-9 | Non-negotiable forward speed | CUT | Contradicts M-04 (player-driven per-hop camera authority) |
| DR-05-10 | Hybrid analog/discrete axes | CUT | Contradicts M-04 |
| DR-05-11 | Pursuer as constant presence, not a timer | MERGED | P-01, P-02 (pursuer exists, gated on distance) |
| DR-05-12 | In-run currency feeding a persistent upgrade track | PROMOTED | E-03 |
| DR-06-1 | Curvature is the difficulty dial | CUT | Discrete lanes (B-01) preclude curved paths |
| DR-06-2 | A guaranteed-safe sub-mode inside the lethal mode | PROMOTED | P-14 |
| DR-06-3 | Speed escalation that removes information | CUT | Contradicts M-04 and M-08 (readable hitboxes) |
| DR-06-4 | A power granted by currency count | CUT | E-04 (which carried this) was cut; goes with it |
| DR-06-5 | Two currencies with separated purpose | MERGED | E-11 |
| DR-06-6 | The recorded failure of the coin sink | DUPLICATE | Lesson is captured in the consolidation; not a requirement. |
| DR-06-7 | Three fixed lanes, not a branching path | MERGED | B-01 (lane classes) |
| DR-06-8 | Delete the axis, don't balance it | DUPLICATE | Lesson is captured in M-04 and the conflict resolutions; not a requirement. |
| DR-06-9 | No buyable continue; insurance is bought between runs | PROMOTED | E-10 |
| DR-06-10 | Single-hit insurance, consumed at the moment of decision | PROMOTED | E-09 |
| DR-06-11 | A collect-to-spell objective riding the main lane | PROMOTED | S-04 |
| DR-06-12 | Progression by duration, not power | CUT | Duration-based progression is implicit in E-05 (cosmetics only). Explicit form conflicts. |
| DR-06-13 | Location rotation as the content calendar | CUT | S-09 (which carried this) was cut in Phase 0 |
| DR-07-1 | One in-run currency, spent on the roster | MERGED | E-01, E-11 |
| DR-07-2 | Mission lists as replay scaffolding | PROMOTED | S-11 |
| DR-07-3 | Rarity tiers + time-limited drops as content calendar | CUT | S-09 was cut; rarity in the roster is fine but no calendar in scope |
| DR-07-4 | A set-piece exception must reuse the base control set | CUT | No bosses in scope; the rule is too specific |
| DR-07-5 | Community-global progress bar with individual credit | CUT | E-14 was cut for needing a server |
| DR-07-6 | Roster is chosen by demand; licensor holds sign-off | CUT | No IP in scope |
| DR-07-7 | Sonic-style zone rotation | CUT | S-09 was cut |
| DR-07-8 | Trick execution converts directly into speed | PROMOTED | S-13 |
| DR-07-9 | Daily missions + seasonal challenges | MERGED | S-11 (mission lists) |
| DR-07-10 | Grace period after damage | CUT | Contradicts P-15 (instant death) |
| DR-07-11 | Day/night cycle and weather | MERGED | B-02 (lane variants, with day/night as a per-tile-type modifier) |
| DR-07-12 | Wingsuit / grind traversal | PROMOTED | G-01 |
| DR-08-1 | The pursuer is distance-gated, not time-gated | PROMOTED | P-02 |
| DR-08-2 | The pursuer has no defensive verb | PROMOTED | P-03 |
| DR-08-3 | Pursuer gives the player only one exit | PROMOTED | P-04 |
| DR-08-4 | A presentation mode removes score, currency and power-ups | PROMOTED | S-10 |
| DR-08-5 | Goals as scaffolding, not gates | MERGED | S-12 |
| DR-08-6 | Camera only follows when the player is ahead | MERGED | P-05 |
| DR-08-7 | The trail as liability | CUT | .io-specific. Genre mismatch. |
| DR-08-8 | Trail length budget with timer | CUT | .io-specific. |
| DR-08-9 | Death by a visible cause | PROMOTED | R-05 |
| DR-08-10 | A bounded session | PROMOTED | S-14 |
| DR-08-11 | Collision count, not faction | CUT | .io-specific. |
| DR-09-1 | Daily with player-chosen difficulty multiplier | PROMOTED | S-03 |
| DR-09-2 | Top-down oblique perspective | MERGED | M-02 (movement core; perspective is a separate concern) |
| DR-09-3 | Engagement layered with re-entries | MERGED | S-05, R-04 |
| DR-09-4 | Date-seeded daily that was once impossible | PROMOTED | S-02, P-12 (with temporal-solvability fix) |
| DR-09-5 | Player-chosen difficulty over a shared seed | PROMOTED | S-03 |
| DR-09-6 | Claw machine = post-run reward lottery | MERGED | S-06 |
| DR-09-7 | Drop-on-death stakes | CUT | Contradicts X-02 (no play timer) |
| DR-09-8 | Passive pickups | MERGED | B-04 (tile vocabulary includes pickups) |
| DR-09-9 | Finite ammo replenished by defeating a hazard | CUT | E-08 was cut as unimplementable per the senior review |
| DR-09-10 | Single tap, single hit | MERGED | P-15 |
| DR-09-11 | Curated aesthetic roster | MERGED | E-07 |
| DR-09-12 | Engine shell: engine + input + art + coin + carousel | DUPLICATE | Lesson captured in development plan's "Ground rules"; not a requirement. |
| DR-09-13 | Single-target projectile puzzle | CUT | Piffle-specific. Genre mismatch. |
| RR-10-1 | Mechanic commoditisation within ~72h of featuring | RISK | `docs/DEVELOPMENT-PLAN.md` Risk register |
| RR-10-2 | First two sessions lost to a broken reward loop | RISK | `docs/DEVELOPMENT-PLAN.md` Risk register |
| RR-10-3 | Reliance on unverifiable market data | RISK | `docs/DEVELOPMENT-PLAN.md` Risk register |
| RR-10-4 | Expecting platform enforcement to protect you | RISK | `docs/DEVELOPMENT-PLAN.md` Risk register |
| RR-10-5 | Confusing copyright with the genre's free layer | RISK | `docs/DEVELOPMENT-PLAN.md` Risk register |
| RR-10-6 | Template-shop supply of a $100 hop-scraper | RISK | `docs/DEVELOPMENT-PLAN.md` Risk register |
| RR-10-7 | Chrome-only differentiation (a reskin, not an original) | RISK | `docs/DEVELOPMENT-PLAN.md` Risk register |
| RR-10-8 | Being the original that gets harvested | RISK | `docs/DEVELOPMENT-PLAN.md` Risk register |
| RR-10-9 | Mis-citing a dead source in a design document | RISK | `docs/DEVELOPMENT-PLAN.md` Risk register; this gate is the structural mitigation |
| RR-10-10 | Citing "Dreaming of Voxel Goats" as evidence clones fail commercially | RISK | `docs/DEVELOPMENT-PLAN.md` Risk register |

## Summary

| Status | Count |
|---|---|
| PROMOTED | 39 |
| MERGED | 31 |
| CUT | 29 |
| DUPLICATE | 3 |
| RISK (promoted into risk register) | 10 |
| **Total** | **117** |

## Net effect of the consolidation

- **40** of **117** harvested requirements are cited directly in the consolidated
  specification as the source of a row.
- The remaining **77** were either **merged** into another harvested
  requirement, **cut** with a recorded reason, **deduplicated** as a duplicate
  of a lesson captured elsewhere, or **promoted** into the development plan's
  risk register.
- Every cited, merged, cut, duplicate and risk disposition is recorded here.
  Anyone reviewing the merge can replay any decision.
