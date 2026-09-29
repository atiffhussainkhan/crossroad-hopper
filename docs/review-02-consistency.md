# Review 02 — internal consistency and testability

The 77 consolidated requirements, checked against each other, the 40 base-spec requirements and the 117 dossier IDs. *Untestable* = no finite, specifiable observation decides it.

## 1. Verifiability

**39 of 77 are untestable as written** (M 5, B 5, P 10, R 4, E 7, S 6, X 2). The 38 survivors are boolean state assertions or prohibitions enumerable by static search. Failures cluster three ways: a number the source supplies and the row dropped; a presupposed scalar never defined; a design claim stated as a behaviour.

| ID | Untestable because | Tightened (number + method) |
|---|---|---|
| M-03 | "privileged", no metric | 0-px `pointerup` hops forward; lateral needs ≥ 12 px in 150 ms. |
| M-06 | no value, no tolerance | 250 ms ± 10 ms, `performance.now()` pointerup→landed, all tile types. |
| M-07 | dropped the source's own number | 12 px in 150 ms (dossier 04 §5, `:1685`); swipe no-op while `PLAYING`. |
| M-08 | "visually square", "sharp" | Collision AABB = drawn rect within 1 px; 8-point probe; 0 px corner radius. |
| M-10 | "may" = optional | Delete, or fix as `invertLateral: boolean` with a mirroring test. |
| B-03 | "rewrites the rule" undefined | Each TYPE gets a distinct handler; rows differing only in TYPE diverge on identical input. |
| B-05 | authoring rule, no observation | Build check: `TYPES.length === POWERUPS.length`. |
| B-06 | "long enough to cross" | Telegraph ≥ (bandRows × hopMs + 500 ms) pre-entry; invariant over 10⁴ seeds. |
| B-07 | "survivable gaps" | Every water band ∃ a schedule with gaps ≤ maxJumpTiles − 1; prove by solver. |
| B-10 | "small", "legible", "readable" | ≤ 8 archetypes; no two silhouette crops above 0.98 IoU. |
| P-02 | "distance", no threshold | No spawn before 120 forward tiles (≈40 s at 3 tiles/s); spawns at exactly 120. |
| P-03 | negative existence claim | Static: no non-lethal contact branch, no timer, no input handler writes its state. |
| P-04 | "already been taught" | Escape verb available within 3 rows; a forward-only bot dies by tile 200. |
| P-06 | no rate | Camera +0.5 tiles/s from run start; stationary player caught at ≤ 40 s. |
| P-09 | "driven by" unfalsifiable | A/B: disable refill-tile availability, difficulty index flat within ± 5 %. |
| P-10 | design claim, not a behaviour | Delete; untestable at any cost. |
| P-11 | "distinct", "separate" | Fires at gauge ≤ 40 %; its audio hash and colour (ΔE ≥ 15) absent from hazards. |
| P-12 | "solvable", no search space | Solver proves a crossing per (seed, lane); 10⁶ seeds at ≤ 2 s. DR-09-4 is the regression case. |
| P-13 | "difficulty", no scalar | D = Σ(hazard speed)/safe tiles over next 10 rows; rises with score (± 5 %), flat in time. |
| P-14 | "available", no frequency | Every 12th row hazard-free and flagged; 10³ rows, 0 violations. |
| R-01 | no method; "playable" undefined | t(first input) − t(collision) < 1000 ms, `performance.now()`, 20 runs, p95. |
| R-04 | "amusing" is subjective | Use proxies already present: zero loss (E-02), ≥ 5 death panels (S-05). |
| R-05 | "visible", "identifiable" | Debug overlay: killer's AABB in viewport ≥ 300 ms pre-collision. |
| R-06 | "progress" undefined; B-09 | Enumerate every field written on death; assert it equals `{runState}`. |
| E-01 | "roughly", no tolerance | 1 unit per 1000 ms ± 5 % (57–63 per 60 s), paused time excluded. |
| E-04 | "granted by", no trigger | No input path grants it; activation needs balance ≥ N at a named event. |
| E-06 | "can see" is human judgement | ≥ 1 of palette/sprite/art/audio differs by ΔE ≥ 10, rest constant. |
| E-08 | presupposes a forbidden verb | Untestable until the offensive-verb question is resolved — §6. |
| E-11 | "a floor … eventual success" | Pity counter: ≤ 30 consecutive failures without a guaranteed unlock. |
| E-12 | "only purpose is progression" | Enumerate purchase handlers; exactly one consumes it. |
| E-13 | "visibly distinct" | Merge into E-11\*; the two spend UIs are mutually unreachable. |
| S-04 | "such as" = non-specific | Enumerate the collectable set and completion predicate, evaluated every row. |
| S-09 | "on a schedule", no period | State N; active set = floor(daysSinceEpoch / N). |
| S-10 | "entirely" hits E-01/E-02 | Balance unchanged over 60 s, no power-up entity, score never written. Reconcile E-02 first. |
| S-11 | "scaffold", "unguided" | Merge into S-12\*; the testable half is no transition out of PLAYING. |
| S-13 | no rate; verb unnumbered | Blocked on the missing grind requirement — §6. |
| S-14 | no bound; source refuses one | State a ceiling T. DR-08-10: "do not spec 120 seconds on this evidence". |
| X-01 | "where present" escape hatch | Forbid lives outright, or state the cap and refill price — which also breaks P-15. |
| X-03 | "fee" undefined | State which. On the earned reading it forbids E-09's insurance and the lives refill. |

## 2. Contradictions

| # | Conflict | Detail |
|---|---|---|
| 1 | P-06 vs the resolution it implements | The resolution keeps the idle timer "only as a secondary trigger … rather than as a stopwatch" (`:244`). P-06 *is* the stopwatch; P-02 forbids it. |
| 2 | P-06 vs P-05, M-02, M-04 | A camera advancing with no player input is locomotion the player did not author. Nothing draws the line between X-05's "the camera may move" and "the world carries the player". |
| 3 | P-09 vs P-13 | Two Tier-A rules give different difficulty inputs — refill scarcity and score. Dossier 02 §A.5 recorded it; consolidation kept both. S-03 is a third. |
| 4 | B-08 vs S-01 | A goal row with a reachable far edge is a destination; S-01 forbids any finish line. DR-01-7 was harvested to resolve this and does not. |
| 5 | B-09 vs X-04, R-06 | A landmark respawn *is* a restart to a distant earlier point. X-04 forbids it, R-06 forbids any reset, and B-09 is Tier C. |
| 6 | E-01 vs P-12, P-10 | A time-based rate is incompatible with one earned by routing. Dossier 03 §A.5 listed FR-31 as a conflict; it is still E-01's only source. |
| 7 | S-10 vs E-01, E-02 | Presentation mode removes currency accrual; E-02 requires persistence. One balance, two accrual rules. |
| 8 | E-14, E-15 vs S-08 | Both need a server. The spec concedes "Both ship later or not at all": two of the 77 cannot ship beside a Tier-A constraint. |
| 9 | E-08 vs M-04, X-05, P-03 | E-08 requires defeating a hazard. No offensive verb exists: M-04 and X-05 deny world locomotion, P-03 denies the pursuer any. |
| 10 | E-09 vs X-03 | Insurance bought between runs with earned currency raises survivability for a price. "Fee" is undefined, so the conflict is invisible, not absent. |
| 11 | P-01 vs its own source | P-01 cites FR-13, the idle-timer trigger dossier 08 §A.5 ordered amended and P-02 supersedes. |
| 12 | Tier C overriding Tier A | S-03 (C) displaces P-13 (A); B-09 (C) breaks X-04 and R-06 (A); S-10 (C) disables the E-01/E-02 economy (B). No rule forbids it. |

## 3. Traceability

All 43 cited dossier IDs exist — **zero dangling references** on the consolidated side.

| Finding | Count |
|---|---|
| Requirements citing a non-existent DR/RR id | **0** |
| Requirements citing **no dossier id** (base spec only) | **30** — M-01, M-05, M-06, M-09, B-01, B-02, B-07, P-01, P-05, P-06, P-07, P-12, P-13, R-01, R-02, R-03, R-04, R-06, E-01, E-02, E-05, E-06, S-01, S-02, S-07, S-08, X-02, X-03, X-05, X-07 |
| …resting on a claim this document itself flags as conflicting or refuted | **8** — P-01/FR-13, P-06/FR-12, P-13/FR-23, R-04/FR-28, E-01/FR-31, E-05/FR-33, E-06/FR-36, S-08/FR-40. S-08 is worst: the corrections table says FR-40's "no account" is unsatisfied, and S-08 is Tier A. |
| Mis-cited ids (id exists, does not say what the row claims) | **4** — M-07→DR-04-10 (that ID is the Gravity Belt; the phase-gating resolution is unnumbered prose in dossier 04 §5); M-08→DR-01-1 ("stalling is a lethal verb"); S-03→DR-09-1 ("firing and aiming are mutually exclusive"; the multiplier is DR-09-2/3); B-04→DR-05-2 (five store-verified types; "spring" and "reversible direction" are in neither) |
| Dangling base-spec id cited from Part 3 | **1** — FR-46, cited twice by dossier 06. The base spec ends at FR-40. |
| Harvested ids mapping to no requirement | **74 of 117** |
| Base-spec Tier-A requirements dropped with no note | **3** — FR-15 (pursuer telegraph), FR-22 (never repeat a sequence), FR-27 (airborne collision window). FR-27 is the fairness hole M-08 does not cover; dossier 08 cites it as live. FR-16's drop is deliberate and correct. |

**The header's arithmetic is wrong.** It claims 118 harvested merged into 77. There are 117 defined IDs and 43 cited: the real merge is 43 → 77, with 74 harvested requirements silently discarded. Ten are the RR-10 risk register, which is correct; the other 64 are DR requirements, including the two dossier 08 §5 says the hopper *must* re-express (DR-08-7/8, the exposure window) and the cheapest originality dossier 09 offers (DR-05-5, DR-09-12).

**Orphans: 30 uncorroborated + 4 mis-cited = 34 broken source links among the 77; 74 orphan ids in the other direction; 1 dangling id inside Part 3.**

## 4. Overlap and redundancy

| Merge | From → To | Why |
|---|---|---|
| X-05 → M-04 | 2 → 1 | "the player may not" auto-move *is* M-04; X-05's camera clause fights P-06. |
| X-06 → E-05 | 2 → 1 | Pure inversion. E-05 is testable, X-06 is not. |
| X-07 → S-05 | 2 → 1 | Pure inversion; attach "no repeat within the last N" to S-05. |
| P-05 + P-06 → P-05\* | 2 → 1 | One camera, two contradictory parameters; splitting them hid contradiction #1. |
| E-11 + E-12 + E-13 → E-11\* | 3 → 1 | One economy described three times; DR-06-5's dossier says don't re-add without a second sink. |
| S-11 + S-12 → S-11\* | 2 → 1 | S-12 is the only testable half. |
| E-05 + E-07 → E-05\* | 2 → 1 | "Change nothing about difficulty" and "replace content, never rules" are one assertion. |

**77 → 70 lines**, X group 7 → 4. Three of seven prohibitions are inversions of positives stated elsewhere, which is how a prohibition table drifts from what it forbids.

## 5. Tier integrity

**Tier A not load-bearing:** **E-08** — Tier A but unimplementable, and a rule that cannot be built is not load-bearing. **P-13** — duplicates P-09 at a conflicting value; one must go. **M-06** — a tuning constant; dossier 01 lists hop duration UNVERIFIED. **E-10** — constrains E-09, which is Tier B.

**Tier C a player would notice, and which breaks Tier A:** **B-09** (checkpoints are immediately legible, and it violates X-04 and R-06) and **E-06** (RR-10-2's mitigation — a player who cannot see what they earned quits; that is the moat, not polish). Promote both to A.

**The missing rule:** nothing prevents a Tier C requirement from overriding Tier A behaviour, and three do. Add: no C-tier line may alter an A-tier behaviour; anything that must is promoted or moved to Unresolved.

## 6. Most consequential defect

**The grind has no requirement.** "Re-expressed as a hold-to-grind that charges a streak meter" appears exactly once in the whole specification, in a prose sentence inside Conflict Resolutions (`REQUIREMENTS-FINAL.md:234`). No ID, no tier, no acceptance test, no source column. Four requirements depend on it: **P-04** (the only escape is "a skill the player has already been taught"), **S-13**, **P-03**'s claim that the pursuer is outrun by something the player owns, and **E-08**'s closed ammunition economy — one of the three properties the spec's own summary says distinguish the game from the genre.

Dossier 07 §5 calls it "the largest structural addition the dossier proposes"; dossier 08 §5 calls the exposure window built on it "the largest single structural addition across all eight dossiers". Both recommend sequencing it *after* the core loop. The consolidation took the sequencing and dropped the requirement. The spec's two headline differentiators therefore rest on a verb absent from it, and on a set that forbids the offence E-08 needs. One row — ID, tier, hop duration, non-cancellability, what the streak buys and at what rate — unblocks P-04, S-13 and E-08, and forces the M-04/X-05/P-03 decision contradiction #9 shows is unresolved.
