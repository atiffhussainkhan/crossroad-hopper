# Development plan: lane-crossing arcade game

A senior-engineer plan taking the project from an approved requirements document
to a shipped browser build. Written against `docs/REQUIREMENTS-FINAL.md` and
`docs/SENIOR-REVIEW.md`.

Nothing in this plan is safe to start before Phase 0 completes. That is the
plan's central claim and the rest of it follows from it.

## How to use this plan

Each phase names the requirements it discharges, the files it creates, the gate
that proves it, and the condition under which it is finished. A phase is done
when its gate passes, not when its code compiles.

Requirements referenced as `M-04` are consolidated requirements in Part 1 of the
final document. Requirements marked `[new]` are proposed additions from
`docs/review-01-completeness.md` that this plan promotes into the specification,
using the namespaces that review defined.

Estimates are relative sizing against a single developer working in short
bursts: **S** is under half a day, **M** is one to two days, **L** is three to
five, **XL** is a week or more. Calendar time is a poor predictor for this kind
of work and is deliberately not given.

---

## Ground rules

These are settled. Changing any of them later invalidates completed work.

**Toolchain.** Static HTML, CSS and JavaScript. No build step, no bundler, no
framework, no server, no third-party runtime SDK. Native ES modules via
`<script type="module">`. Python 3.9 system interpreter for tooling and gates.
No Node, no npm, no homebrew, no paid services. This is the same stack the two
shipped projects used, so the deployment path is already proven.

**Two irreversible day-one decisions**, both from the delivery-risk review:

1. **The entire run is generated from a single seed before the run begins.** Not
   incrementally, not lazily per row. This makes S-02 (the date-seeded daily)
   trivial, makes the generator unit-testable, and makes runs reproducible from
   a seed in a bug report. Generating lazily is cheaper to write and far more
   expensive to debug.
2. **`dt` is injected everywhere, never read from a clock.** Every duration,
   every timer, every velocity integration takes `dt` as a parameter. This is
   what makes R-01 (the sub-second restart) assertable in a build gate instead
   of needing a stopwatch, and it is the difference between a headless test
   suite and a manual one.

**Time source.** `performance.now()` against one captured origin. The only code
that reads the date is the daily seed. A wall-clock change must never alter a
running simulation.

**No build step means no build gate on the JS.** Gates are Python scripts that
either parse the source for required structure, or drive a headless JavaScript
Core via `osascript -l JavaScript` to execute the real modules and assert on
their output. This is the pattern the existing projects already use and it works
on this machine.

---

## Standing constraints

Seven requirements in the `X` group are not work items to be completed in a
phase. They are properties the build must never acquire, so they are checked
continuously rather than delivered once. A reviewer reading a diff should be
able to confirm that none of them was violated by the change.

| ID | Constraint | Where it is checked |
|---|---|---|
| X-01 | No life countdown; lives, if present, are a budget bought with currency | `check_requirements.py` plus a diff review of any economy change |
| X-02 | No energy gate and no play timer on the core loop | `check_vertical_slice.py` — the gauge must never end a run |
| X-03 | No pay-to-win, and no mechanic that increases difficulty for a fee | `check_save_schema.py` — nothing purchasable alters difficulty |
| X-04 | No restart returning the player to a distant earlier point in the run | `check_vertical_slice.py` — restart position asserted against run start |
| X-05 | No world auto-locomotion; the camera may move, the player may not | `check_vertical_slice.py` — player position advances only by input |
| X-06 | No unlock that alters difficulty | `check_save_schema.py` — the unlock table is diffed against the hazard table |
| X-07 | No identical reward shown on consecutive deaths | `check_quality.py` — the reward sequence is asserted non-repeating |

X-02 and X-05 are the two most likely to be violated accidentally, because
adding a satisfying effect to a depleting gauge, or making the world scroll
during a long run, both feel like polish. `check_vertical_slice.py` is written
to fail on exactly those two regressions.

---

## Phase 0 — Specification remediation

**Objective.** Close the twelve blocking defects from the senior review so that
the phases below are building against a specification that can be tested and
does not contradict itself.

**Sizing: L.** This is not padding. Nine of the twelve defects are rewritten
requirements rather than new work, but each one, left open, causes a structural
rework later rather than a tweak.

### 0.1 Resolve the four structural contradictions

| Item | Action |
|---|---|
| Depletion gauge has no failure state and X-02 forbids a gate | Re-specify P-08 and P-09 as a **route** constraint rather than a resource. The gauge reduces the number of safely occupiable tiles, making the safe line positionally harder to find. Its depletion never kills. Clears X-02 and preserves the spatial ramp. |
| The grind has no requirement | Add one requirement covering hold-to-grind, the streak meter it charges, and what the streak is spent on. Or delete P-04, S-13, P-03 and E-08, which all depend on it. **Decide once, here, and remove the dependents if it is not added.** |
| Ammunition economy is unimplementable | Cut E-08 per the delivery-risk review. The stated benefit, removing the idle timer, is already delivered by P-02. Record the cut and its reason. |
| Camera requirements contradict each other and the conflict resolution | Split them. P-05 stays as a rendering concern. The anti-stall pressure moves under P-02 as a distance gate. Delete the stopwatch form of P-06 entirely. |

### 0.2 Resolve the remaining contradictions

Run lifecycle: B-09's respawn checkpoints cannot coexist with instant death and a
sub-second restart. Either drop B-09 or define respawn as within-run recovery
that costs accumulated currency but not position. Second option is more
interesting and cheap; it must be written down.

Two competing difficulty ramps: P-09 governs ordinary play, P-13 becomes the
scoring function rather than a ramp, S-03 applies only to the daily. Three
sentences.

Scope of the offence verb: E-08 and S-13 assume an attack action that the
movement grammar never grants. Either state its scope explicitly or accept that
the player has no verb but movement and dismissal. This must be decided before
Phase 2, because it changes the input grammar.

Two cursors: E-11 and E-12 are the same mechanism. E-13 and E-01 overlap. Merge
to one currency-spend requirement.

### 0.3 Restore traceability

**Gate: `tools/check_requirements.py` (new, S).**

A script that fails if any of the following is true, and prints the offending
ids:

- A consolidated requirement cites a `DR-` or `RR-` id that no dossier defines
- A consolidated requirement cites no dossier id at all
- A cited `FR-nn` exceeds the base specification's last id
- A base-spec requirement cited by a dossier is absent from the consolidated set
  **without a recorded disposition**
- A requirement id is defined twice, or a sequence has a gap

**Deliverable: a disposition table.** One row per harvested requirement, stating
whether it was promoted, merged, or cut, and why. Seventy-two harvested
requirements were dropped silently. This table is an afternoon's work and it is
what makes the merge auditable by someone who was not there.

The specific known breaks to fix: `FR-46` is cited twice and undefined; `FR-27`
(airborne collision window) is a dropped Tier A fairness requirement and needs
either promotion or an explicit decision that the game needs no airborne
collision window, with reasons.

### 0.4 Add the thresholds the requirements lack

Only four of seventy-seven requirements currently carry a pass threshold. Two
review lenses counted 14 and 39 untestable requirements respectively; take the
union of both lists.

**Gate: `tools/check_testability.py` (new, S).** Fails if any Tier A requirement
lacks a numeric pass criterion and a stated measurement method. This is the gate
that stops the problem recurring, and it is the single highest-value script in
the project.

Tightenings that are known to be needed: M-07 needs its gesture threshold
stated (150 ms and 12 px, from the source dossier); R-01 needs a measurement
method, not just "under one second"; R-04's "amusing" and M-08's "clear and
sharp" need replacement predicates or removal.

### 0.5 Promote the missing requirement categories

The fourteen absent categories are scoped here and delivered later. The
specification gains the 42 proposed requirements from the completeness review,
across the namespaces that review defined:

- `AU-01`–`03` audio, including the browser autoplay policy
- `AC-01`–`04` accessibility
- `DP-01`–`03` device pixel ratio and orientation
- `NF-01`–`06` non-functional: fixed timestep, performance budgets, cache
  versioning, clock isolation, hidden-tab pausing
- `SV-01`–`02` the generator's field enumeration and the entity pool
- `QA-01`–`03` every Tier A requirement carries an automated pass criterion
- `LG-01`–`03` licensing, zero network requests, age rating
- `CP-01`–`02` content as validated data files, text in DOM

### 0.6 Re-tier

Tiers are currently defined in gameplay terms, which cannot express a
load-bearing engineering requirement. Redefine as load-bearing,
retention-bearing, and differentiation-bearing, then re-tier. The persistence
requirement, the performance budgets and the solvability guarantee are all
load-bearing and are currently mis-tiered or absent.

**Phase 0 exit criteria:** all six gates green. `check_requirements.py` and
`check_testability.py` both pass. The disposition table exists and accounts for
all 117 harvested requirements. A reviewer can follow any consolidated
requirement to a dossier id, and any harvested requirement to a disposition.

---

## Phase 1 — Foundation and vertical slice

**Objective.** Prove the restart loop and the pursuer on an empty board, with
no hazards, before any hazard exists.

**Sizing: L.** This is the counter-intuitive part of the plan and the part most
likely to be skipped. Every camera constant tuned before the pursuer exists is
wasted, because the viewport must eventually hold both the pursuer edge and the
forward lanes at once.

**Requirements in scope:** M-01–M-09, P-01–P-07, P-15, R-01–R-06, S-08 (partly).

### Work

1. **Scaffold.** `index.html` with native ES modules, `src/engine/loop.js`
   (fixed-timestep accumulator, injected `dt`), `src/engine/rng.js` (seeded
   PRNG, deterministic), `src/engine/input.js` (phase-gated tap and swipe with
   the stated threshold). **M**
2. **State model.** `src/game/state.js` holding the run object. Establish now
   what a run contains, what persists, and what regenerates. If the economy
   group cannot be expressed without reshaping the run object, discover it here
   rather than in Phase 4. **M**
3. **Camera.** `src/engine/camera.js`. Follow-only at first; the creep form is
   deferred to Phase 2. **M**
4. **Pursuer.** `src/game/pursuer.js` as a three-state machine:
   `DISTANCE_LOCKED → SPAWNING → ACTIVE`. Advance the gap as
   `max(0, playerSpeed − escapeSpeed) * dt`, clamped so it never widens. **M**
5. **Player and hop.** One input, one tile, fixed-duration animation. **M**
6. **Death and restart.** Instant, no input-blocking animation, restart under one
   second with a single input. **S**
7. **Camera and pursuer together.** Tune the viewport so both the pursuer edge
   and three forward lanes are visible at the target aspect ratio. **M**

### Gate: `tools/check_vertical_slice.py` (new, M)

Asserts, by driving the real modules headlessly:

- 10,000 simulated runs produce zero unhandled exceptions
- Median death-to-restart interval **below 300 ms**, worst case below 1,000 ms,
  measured from injected `dt` with no clock read
- The pursuer never advances while the tab is hidden
- The pursuer gap never widens over a full run
- The same seed produces an identical run, twice, byte for byte

**Exit:** all five assertions pass. If the restart interval is not already under
one second without prompting, no later phase will fix it, and that is the single
honest test in the whole project.

---

## Phase 2 — Core loop

**Objective.** A complete, playable, hazard-bearing run.

**Sizing: XL.**

**Requirements in scope:** B-01, B-02, B-05, B-06, B-07, P-11, P-13, P-14, P-15,
M-10, S-04, S-05, S-06, plus the Phase 0 decision on the offence verb if it went
in favour of one.

### Work

1. **Three lane classes** with distinct hazard physics: roadway, railway, water.
   Independent speed and direction per lane. **L**
2. **Per-tile type tags** (B-03, B-04) — the platform-type system harvested from
   Doodle Jump, which is the most reusable mechanic in the genre and roughly
   three times its face-value cost. Six types across three lane classes. **L**
3. **Railway telegraph.** Arrival visible before the train enters, long enough
   to cross. **M**
4. **Water platforms** with dwell time at least twice the hop duration, so
   survivability is a timing decision and not a reflex. **M**
5. **Camera creep** in its corrected, non-stopwatch form. **S**
6. **Score and currency** wired to survival, with P-13 as the scoring function
   rather than a ramp, per the Phase 0 resolution. **M**
7. **Content as data** (CP-01): lane tables, tile types, and strings in
   validated data files, so a new theme is a data change. **M**

### Gate: `tools/run_all.sh` extended

- `check_lane_invariants.py` (M): every lane in a generated run is one of the
  declared classes, and every tile is one of the declared types
- `check_hazard_reach.py` (M): a train never enters a lane whose telegraph is
  shorter than the traverse time
- `check_content_schema.py` (S): every data file parses and every field is
  present

**Exit:** a run can be started, played to death, and restarted, with three lane
classes and six tile types, and the gates confirm no lane can be generated that
violates its own telegraph.

---

## Phase 3 — Generation and solvability

**Objective.** Prove every generated sequence is solvable, and make that proof a
test rather than an opinion.

**Sizing: L.** This is the requirement the delivery-risk review rated as the
highest-value item to protect under schedule pressure, and it is also the one
where the specification's version is weaker than the real requirement.

### The design correction

P-12 as written is **static** solvability. Under a closing pursuer, solvability
is **temporal**. Dossier 09 found a shipped game that shipped an impossible daily
challenge and patched it afterwards, which is what the static version produces.
The honest requirement is a discrete-tick reachability search over
`(row, column, time)`.

**Requirements in scope:** P-12, B-08, S-02, B-10, P-10.

### Work

1. **Path-first generation.** Generate a traversable path, then derive lanes from
   it. Independent per-lane generation cannot guarantee solvability and is what
   the specification implicitly assumes. **L**
2. **Reachability search.** A bitmask over columns for the static case; a
   discrete-tick search over `(row, column, time)` for the pursuer case. **L**
3. **Per-lane validation.** A lane is passable if it has a permanently safe tile
   or a platform whose dwell time exceeds twice the hop duration. **M**
4. **Bounded re-roll with a guaranteed-safe fallback band.** The generator must
   never loop indefinitely, and must never emit an unsolvable layout. **M**
5. **Date-seeded daily** over the same generator, so the daily and ordinary play
   share one code path. **S**

### Gate: `tools/check_solvability.py` (new, L)

Fuzzes the generator over **10,000 date seeds** and asserts:

- 100% solvable under the static search
- 100% solvable under the temporal search for seeds where the pursuer activates
- Generation for any single seed completes in under **50 ms**
- No unbounded re-roll: the fallback band is reached within **20** attempts

This is the gate that makes the whole game safe to ship, and it is a genuine unit
test rather than a smoke test.

**Exit:** 10,000 seeds pass both searches. A future level generator cannot be
committed until this gate passes, which should become a pre-commit hook.

---

## Phase 4 — Economy and meta

**Objective.** The layer that retention lives in, and the layer a corrupt save
destroys.

**Sizing: XL.** Largest phase, lowest play-experience-per-hour ratio, and the
phase most likely to be cut. Build it last and cut it first.

**Requirements in scope:** E-01–E-07, E-09, E-10, E-15, S-07, S-09–S-14, plus
the merged currency requirement from Phase 0.

### Cut before building

Per the delivery-risk review, cut **S-09** (content calendar), **E-14**
(community bar, needs a backend), and **B-09** (contradicts the restart loop,
unless Phase 0 chose the within-run recovery reading). Record each cut with its
reason. E-04 was already folded into E-03 in Phase 0.

### Work

1. **Persistence** (S-01, S-02 and the Phase 0 save requirement). Store key,
   schema version, write trigger, and explicit corrupt-save recovery. Twenty-nine
   of seventy-seven requirements read or write persistent state, and this is the
   cheapest way to protect the most work. **L**
2. **Currency and the two spend lanes** — permanent upgrades, and a randomised
   cosmetic reward, kept visibly distinct. **M**
3. **Unlocks** that change what the player sees during play, never difficulty.
   **M**
4. **Daily challenge** with a player-chosen difficulty multiplier over a shared
   date seed. **S**
5. **Rival score** shown diegetically, from local storage only. **S**
6. **Stat cards** per unlockable. **M**
7. **Presentation mode**, which removes score, currency and power-ups. Requires a
   toggle-timing rule, since it changes the meaning of a run in progress. **M**

### Gate: `tools/check_save_schema.py` (new, M)

- Round-trips a save through write, read, and reload with byte equality
- A save from the previous schema version migrates without data loss
- A deliberately corrupted save recovers to a playable state rather than a
  blank one
- Storage-unavailable behaviour is defined and tested, not incidental

**Exit:** killing the browser mid-run and reloading preserves the meta layer
exactly. This is the requirement that would silently destroy two weeks of a
player's progress if omitted.

---

## Phase 5 — Presentation, accessibility, offline

**Objective.** The fourteen absent categories, delivered.

**Sizing: L.**

**Requirements in scope:** all `AU-`, `AC-`, `DP-`, `NF-`, `LG-`, and `CP-02`
requirements.

### Work

1. **Audio** (AU-01–03), including resuming a suspended context inside a user
   gesture handler, which browsers require. **M**
2. **Accessibility** (AC-01–04): no information carried by colour alone, a
   reduced-motion path that removes shake and the death-screen spin, live-region
   announcements for score and gauge, 44×44 CSS pixel minimum targets. **L**
3. **Device handling** (DP-01–03): backing store scaled to `devicePixelRatio` and
   capped, constant visible lane count in CSS pixels across aspect ratios,
   explicit orientation list. **M**
4. **Non-functional** (NF-01–06): fixed timestep with decoupled rendering, the
   performance budget, cache versioning with a working update path, clock
   isolation, hidden-tab pausing that is not a penalty. **L**
5. **Offline** (S-08): a versioned service worker whose failed update leaves the
   previous version playable. **M**
6. **Licensing and network** (LG-01–03): zero network requests after first load,
   no cookies, no CDN, every asset self-hosted with a recorded licence, age
   rating and privacy statement written. **M**

### Gate: `tools/check_quality.py` (new, M)

- **60 fps sustained** on a named reference device, fixed entity pool, no
  per-frame allocation in steady state, measured in a headless run
- Transferred weight and time-to-interactive stated as numbers and met
- Accessibility scan: no colour-only information, all interactive targets at
  least 44×44, reduced-motion path exercised
- Zero network requests after first load, verified by request interception
- All player text renders in DOM, not to canvas, so it scales without a code
  change

**Exit:** the game runs at the frame-rate budget on a phone, offline, with the
display asleep mid-run, and the accessibility path is walkable.

---

## Phase 6 — Release

**Objective.** Ship, and leave something that can be resumed.

**Sizing: M.**

1. **The full gate suite** green in one command, `bash tools/run_all.sh`, with
   each gate printing what it asserted and its threshold. **M**
2. **A README stating the one honest test**: that a player who dies restarts
   within one second without prompting. If that is not automatically true,
   nothing else matters. **S**
3. **A seeded-run debug mode** so any bug report is reproducible from a seed,
   which is only possible because of the Phase 0 decision. **S**
4. **A new GitHub repository**, matching the pattern used for `santas-visit`.
   **S**
5. **A handoff note** recording state, decisions and traps, in the pattern
   already established. Do not repeat the mistake that left a stale duplicate
   committed into an unrelated repository. **S**

---

## Cross-cutting: the gate suite

Every phase adds to `tools/run_all.sh`, and the suite is the project's quality
mechanism, not a formality. The review's central complaint was that only four of
seventy-seven requirements could be verified; the suite is the answer.

| Gate | Phase | Asserts |
|---|---|---|
| `check_requirements.py` | 0 | Traceability, dispositions, no gaps or duplicates |
| `check_testability.py` | 0 | Every Tier A requirement has a numeric threshold |
| `check_vertical_slice.py` | 1 | Restart under 1 s, pursuer behaviour, determinism |
| `check_lane_invariants.py` | 2 | Every lane and tile is a declared type |
| `check_hazard_reach.py` | 2 | No telegraph shorter than the traverse time |
| `check_content_schema.py` | 2 | Data files parse and are complete |
| `check_solvability.py` | 3 | 10,000 seeds, static and temporal, under 50 ms |
| `check_save_schema.py` | 4 | Round-trip, migration, corruption recovery |
| `check_quality.py` | 5 | Frame rate, weight, accessibility, zero network |
| `check_board_map.py` | 0 | Licence and provenance of every shipped asset |

The two gates from Phase 0 should be wired as a pre-commit hook, so an
untestable requirement cannot be committed in the first place.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The pursuer and the camera cannot both fit the viewport at the target aspect ratio | Medium | High | Phase 1 exists solely to surface this before hazards exist. Resolved by design, not discovered by integration |
| The temporal solvability search is slower than the static one by an order of magnitude | Medium | Medium | Phase 3 measures per-seed time against a 50 ms budget early, and the generator is seeded, so a slow path is a re-roll rather than a stall |
| Fixed-timestep loop feels wrong on a high-refresh display and gets "fixed" by removing the accumulator | Low | High | The restart-interval assertion in Phase 1 catches the symptom immediately. It is a build gate, not a judgement call |
| Phases 4 and 5 consume the schedule and the meta layer ships unfinished | High | Medium | Explicitly the cut candidates. A core loop with no meta is a shippable game; a meta layer with no core loop is nothing |
| Scope creep from the 72 harvested requirements that were never merged | Medium | Medium | The disposition table. Anything not promoted is not built, and the table is where that decision is recorded |
| Browser audio autoplay policy silently blocks all sound | Medium | Low | AU-02 is explicit, and `check_quality.py` exercises the path rather than assuming it |

## Definition of done

The project ships when all of the following hold, and not before:

- `bash tools/run_all.sh` passes, and each gate prints its threshold
- Every Tier A requirement maps to a gate assertion, and `check_testability.py`
  proves it
- A player who dies restarts within one second without being prompted
- Every generated sequence is solvable, verified over 10,000 seeds under both
  the static and the temporal search
- The game runs offline, with zero network requests after first load
- A corrupt save recovers rather than erasing progress
- Every shipped asset is original, self-hosted, and carries a recorded licence
- The one honest test is written in the README where a future developer will
  read it first

## What this plan deliberately does not include

Leaderboards, real-time multiplayer, the community collection bar, and any
in-app purchase. Each requires a backend, and the specification already
concedes this. Adding any of them changes the deployment model from a static
host to a service, which is a different project with a different cost structure,
and it should be a decision made deliberately rather than discovered during a
build.
