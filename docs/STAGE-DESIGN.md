# Stage design: the campaign

How ten stages, the difficulty ladder, lives, and two-player mode work, and
which requirements each one changes.

This document supersedes the infinite-runner framing of the base research for
the campaign portion of the game. The research findings still apply; what
changed is the shape of the run, and this file records exactly how.

---

## What changed, and why

The researched genre is endless: Crossy Road is "one endless level" and scores
on distance. The campaign design adds ten discrete stages with lives. That is
not a refinement, it is a change of shape, and the change is deliberate.

Of the eighteen games in the research programme, exactly two use discrete
stages:

- **Frogger** (1981) — five frogs homed equals level clear, next level harder,
  three to seven lives, and two players alternating.
- **Crossy Road Castle** (2020) — a tower of rooms, three lives, a key per
  hundred levels.

Frogger is the model being followed. Crossy Road Castle is the warning: its
death penalty resets the player to the bottom of the tower, which destroys the
high-score loop, and that is the single defect the delivery-risk review
identified as fatal. Three design decisions below exist specifically to avoid
it.

---

## Stage shape

| Property | Value | Where it comes from |
|---|---|---|
| Stage count | 10 | `src/stages.js` |
| Stage duration | 90 seconds | `STAGE_DURATION_MS` |
| Goal | Reach the goal row before the clock expires | one win condition only |
| Goal row | 40 rows ahead of start | `GOAL_ROW_OFFSET` |
| Lives | 4 per player, per stage | `STAGE_START_LIVES` |
| Players | 1 or 2, simultaneous, shared clock | — |
| Failure | Lives exhausted, or the clock expires | — |
| Retry | The same stage, not the campaign | deliberate |
| Post-campaign | Endless mode unlocks | restores the high-score loop |

### Why 90 seconds

Ninety seconds yields six difficulty steps at fifteen-second intervals. Sixty
seconds yields four, which is too coarse to feel like a ramp; one hundred and
twenty yields eight, which makes each step too small to register. Ninety also
gives a ten-stage campaign of roughly fifteen minutes, a session length that
matches what the retention research found for the genre.

### Why one win condition

Crossy Road scores on distance and has no finish. Frogger has one: get home.
Having both — a goal row *and* a clock — would make it ambiguous which the
player is racing. The clock exists to create pressure; the goal row exists to
create a decision. The player is never in doubt which one matters.

---

## The difficulty ladder

```
difficulty = stage.baseline + floor(elapsed_ms / 15000)
```

This is two-dimensional, and that is the point. Difficulty rises both *across*
the campaign and *within* each stage.

| | Stage 1 | Stage 2 | Stage 3 | … | Stage 10 |
|---|---:|---:|---:|---|---:|
| Baseline | 0 | 0 | 1 | … | 4 |
| At t=0 | 0 | 0 | 1 | … | 4 |
| At t=15s | 1 | 1 | 2 | … | 5 |
| At t=45s | 3 | 3 | 4 | … | 7 |
| At t=90s | 6 | 6 | 7 | … | 10 |

**Ten difficulty levels** (0 to 9) from the first tap of stage one to the last
reachable second of stage ten. The stage fails *at* 90000 ms, so elapsed=90000
is never observed and the tenth level is never reached inside a stage. Every stage has the same *shape* of curve, so the player learns
the rhythm once and the campaign only moves the starting line. That is what
"same type of difficulty, different scene" means in concrete terms.

Verified by `tools/check_vertical_slice.py`, which asserts monotonicity, a step
of exactly one per fifteen seconds, a stage-one floor of zero, and a total
campaign span of at least ten levels.

---

## The ten scenes

Scenery is a palette and a recipe in a data table, not an asset bundle. Adding
a stage is a row, not a new file, and the art is drawn by code from these
values.

| # | Scene | Baseline | Signature hazard | Lane mix (road/rail/water) |
|---|---|---:|---|---|
| 1 | Suburb | 0 | Cars *(inert in Phase 1 — see ST-14)* | 1.0 / 0 / 0 |
| 2 | River | 0 | Logs, turtles | 0.2 / 0 / 1.0 |
| 3 | Desert | 1 | Cars, tumbleweed | 0.8 / 0 / 0.2 |
| 4 | Farmland | 1 | Tractors, cars | 0.9 / 0.1 / 0 |
| 5 | Night City | 2 | Cars, trams | 0.85 / 0.15 / 0 |
| 6 | Frozen Lake | 2 | Cracking ice, sleds | 0.3 / 0 / 0.7 |
| 7 | Rainforest | 3 | Logs, animals, cars | 0.4 / 0 / 0.6 |
| 8 | Construction | 3 | Falling steel, forklifts | 0.9 / 0.1 / 0 |
| 9 | Storm | 4 | Cars, trams, lightning | 0.7 / 0.3 / 0 |
| 10 | Volcano | 4 | All five kinds | 0.4 / 0.2 / 0.4 |

The lane mix changes per scene, but the *set* of lane classes is fixed at three
(roadway, railway, water), because that set is what makes the game readable.
A player who has learned stage one can read every later stage.

---

## Lives and the death loop

Four lives per player, per stage. A death costs one life and respawns that
player at the stage start immediately — no menu, no confirmation, no
input-blocking animation. The sub-second restart (`R-01`, median under 300 ms)
is preserved, because it is the single most important number in the genre.

When the fourth life is spent, the stage fails.

**The stage fails, not the campaign.** This is the deliberate divergence from
Crossy Road Castle, which reset the player to the bottom of the tower. A
stage-local retry keeps the player's progress, keeps the high score alive, and
makes failure a cost of a minute rather than a cost of the session.

---

## Two players

**Simultaneous, on a shared clock.** Both players hop on the same board from
different starting columns, and the stage clears when both reach the goal row.

Alternating turns were considered and rejected. The brief proposed one attempt
per player in turn, which is Frogger's 1981 model. It conflicts directly with
`R-01`: a turn-based queue puts a multi-second wait between a death and the
player's next attempt, and the research is unambiguous that this is the number
the genre's retention runs on. Alternating play also means one player watches
while the other plays, which is the opposite of the tension the sub-second
restart exists to create.

The shared clock is the balancing mechanism. A player who stalls costs both
players, so nobody benefits from waiting. The two-player mode is therefore
co-operative rather than competitive, which suits a couch party game and avoids
requiring a scoreboard to be fair.

---

## Requirements changed by this design

| Requirement | Before | After | Reason |
|---|---|---|---|
| `S-01` | Endless, no finish line, no level completion | **Amended.** The campaign has ten stages and a finish. Endless mode is unlocked after stage ten, so the infinite high-score loop survives | A win state needs a ceiling; the ceiling needs a door |
| `X-01` | No life countdown; lives are a purchasable budget | **Amended.** Four lives per stage are the core loop, not a purchasable | This is a Frogger-shaped game now. The purchasable-lives compromise is retained for Endless mode, where a continue purchase replaces a life |
| `R-01` | Restart under 300 ms | **Preserved.** A death respawns the same player immediately | Two-player is simultaneous, not alternating |
| `R-02`, `R-03` | One input restarts, no blocking | **Preserved** | The only input-blocked moment is the between-stage banner, which is a decision point, not a death |
| `P-02` | Pursuer gated on distance | **Preserved, retuned.** It gates on the leading player's row | With no hazards in Phase 1, the pursuer catches a stalling player; the clock is the primary pressure |
| `B-08` | Goal row with a guaranteed-open-slot invariant | **Preserved and promoted.** The goal row is now the win condition | It was always the right idea; it just was not load-bearing before |
| `CP-01` | Content in validated data files | **Preserved and now load-bearing.** Ten scenes are ten rows | A new stage is a data change, not a code change |

New requirements introduced by this design:

| ID | Requirement | Tier |
|---|---|---|
| `ST-01` | A stage is won by reaching the goal row before the clock expires | A |
| `ST-02` | Stage duration is 90 s; the clock is shared across players | A |
| `ST-03` | `difficulty = stage.baseline + floor(elapsed_ms / 15000)` | A |
| `ST-04` | Each stage declares a baseline, and baselines increase across the campaign | A |
| `ST-05` | The campaign is ten stages; completing stage ten unlocks Endless mode | A |
| `ST-06` | Four lives per player per stage, restored on retry | A |
| `ST-07` | Exhausting lives fails the stage, never the campaign | A |
| `ST-08` | The stage clears only when every player has reached the goal row | A |
| `ST-09` | Each stage's scene is a data row, not code | B |
| `ST-10` | The three lane classes are constant across all stages | A |
| `ST-11` | Endless mode is unbounded and scores on distance, restoring the original loop | B |
| `ST-12` | Player count is 1 or 2, selected before a campaign and switchable between stages | B |

---

## What is deliberately absent

- **No shop, no currency, no ads.** The economy group (`E-*`) is deferred past
  the campaign's first ship. Nothing in the stage loop needs it.
- **No unlockable characters yet.** The roster (`E-07`) is a content layer that
  sits on top of a working campaign, not part of it.
- **No global leaderboard.** It needs a backend. Endless mode scores locally
  until that decision is made.
- **No mid-stage saves.** Leaving a stage reloads it. A session is fifteen
  minutes; the campaign's own structure is the checkpoint.
