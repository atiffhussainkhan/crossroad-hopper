# Delivery-risk review — `REQUIREMENTS-FINAL.md`

Can one person build this, alone, on schedule, on static HTML/CSS/JS with no build
step and no Node, and where will it go wrong. A risk register, not a summary.

---

## 1. The three differentiator mechanisms

### (a) Distance-gated pursuer, no defensive verb — **Medium (3/5)**

The code is trivial and the document rates it Easy. Both dossiers are right about the
code and wrong about the work. The expensive part is not the pursuer, it is the
**camera**: P-05 (never scrolls backward) plus a threat behind the player means the
viewport must hold the pursuer edge *and* enough forward lanes to judge the next hop.
Every camera constant tuned before the pursuer exists is invalidated by it. This is
the strongest sequencing argument in the document, and the document never states it.

Naive failure modes, in likelihood order:

1. **Screen-space pursuer.** A pixel offset desyncs the moment the camera jumps on a
   hop. Must be lane-space: `row` + fractional offset, gap `playerRow - pursuerRow`.
2. **Fixed approach speed.** Makes the gap binary — trivially safe or instantly
   fatal. Fix: `pursuerRow += max(0, playerSpeed - escapeSpeed) * dt`, clamped so the
   gap never *widens*; a pursuer that recedes when you play well is a strobe.
3. **Invisible death.** A pursuer behind the camera edge kills unseen, violating R-05.
   Needs `DISTANCE_LOCKED → SPAWNING (≥1s telegraph, screen-edge cue) → ACTIVE`, and
   no camera advance permitted while `SPAWNING`.
4. **One arming boolean, and a violated P-03.** P-02 gates on distance and P-07 adds
   a reverse trigger, and the backward-hop counter must reset on any forward hop or
   players die for a mis-tap — two state fields, not one. And players will try to hit
   the pursuer or hide behind a train, so it must be non-interactable in the
   collision handler.

Cost: 1–2 days including telegraph tuning. Not the risk it looks like — **build it
early anyway**, because of the camera coupling.

### (b) Scarcity-driven ramp, not a numeric curve — **Hard (4/5), open-ended**

Thirty lines of code, unbounded tuning. The code is easy; the ramp is the schedule.

Failure #1: you write `refillInterval = base * f(score)`, satisfying P-09 in letter
and violating it in spirit, because a numeric curve is what you were avoiding.
Failure #2: you make the gauge lethal, following River Raid literally, dragging in
X-02 and turning the game into a resource puzzle whose solution the player must infer
unprompted. The dossier hedges ("if the meter drains harmlessly rather than lethally
it satisfies FR-35's intent") and **the consolidated spec never decides** — a day of
work that determines the rest. Failure #3 kills P-10: if the refill reliably sits on
the only safe column, the player learns "route to the refill" and the decision
disappears, so the generator must guarantee it is never the sole safe line.

What makes it work, in order: **deplete on distance, never on time** (a
distance-integrated accumulator, not a per-frame decrement — hesitation must cost
nothing, or the game punishes thinking, which the base spec explicitly rejects);
**guarantee a refill within K rows**, K a constant, not a probability; and
**instrument it** — log gauge-on-arrival and distance-from-last-refill per row,
because a scarcity ramp has no in-play feedback and without a log you cannot tell a
struggling player from an unskilled one.

### (c) Closed ammunition economy, E-08 — **Hard (5/5), unsound as written**

The most expensive requirement and the one the document is most confident about.
"Defeating a hazard" requires an offensive verb. The movement model forbids one:
M-01 grid, M-02 one-tile hops, M-04 no analog steering, M-07 tap-forward only, P-15
instant death. There is no attack in this game and E-08 presumes one. The claim that
it "removes the need for an idle timer entirely" also fails: the idle timer was
already removed by the distance gate (P-02), which the document says explicitly.

Only one resolution is cheap — **passive defeat**: the world destroys hazards (a
vehicle hits a breakable, a train clears scenery, a falling tile lands on a car) and
the drop is the reward. No attack verb, P-15 intact. Ammunition-as-survival needs a
mid-run input and breaks M-07; a real shoot verb contradicts M-04, doubles the input
surface and rebuilds the tutorial.

Passive defeat has one serious cost: hazards need a real entity lifecycle (spawn →
occupy → resolve) rather than being a pure function of lane position — an invasive
board-model change, made on day one or never. The drop must then be a **lane-row
entity, not a floating pickup**, or it desyncs against M-06's fixed hop duration, and
the destruction must be visible and pre-announced or the drop reads as a random gift.

---

## 2. Is P-12 achievable? Yes — and the guarantee is structural

**Achievable, and cheaper than the document implies — but not with a lane-list
generator emitting independent lanes.** The document's own evidence kills that
approach: DR-09-4 records Shooty Skies shipping a date-seeded daily that was
impossible and patching it.

**Cheapest correct approach — generate the path, derive the lanes from it.** Keep a
reachability bitmask over columns as rows are appended. For each new lane: generate,
then validate. A lane is passable if it has at least one permanently safe tile, or a
platform whose dwell window is ≥ 2× hop duration (M-06). On failure, bounded re-roll
(8 tries), then **fall back to a guaranteed safe band**. The invariant is
`reachable[next] ⊇ reachable[cur] ∩ passable(next)`, non-empty at every row. ~40
lines, and it makes P-12 a unit test instead of a playtest question.

Two things the spec does not say and the build must:

- **P-12 as written is weaker than the real requirement.** "No uncrossable row" is a
  *static* property. Under a closing pursuer a row can be crossable and still
  unwinnable: three consecutive water rows with mismatched platform phases can
  require a dwell longer than the pursuer allows. The real requirement is temporal,
  and needs a second discrete-tick BFS over `(row, col, t)`.
- **Every generator claiming a guarantee is really claiming "a safe band is always
  within K rows."** Write K down as a constant. B-08 and P-14 *are* that pressure
  valve, and they make P-12 trivially true. Ship them first.

---

## 3. Scope reality

**Cheap that is not cheap** — where the schedule goes:

- **M-07 (phase-gated input).** Looks like 20 lines; it is a motion-threshold
  disambiguation problem with no automated test, across Mac trackpad, mouse and
  touch, with swipes swallowed mid-run and admitted on the death screen. 2–3 days,
  revisited after playtesting. Highest risk item in M.- **B-03/B-04 (per-tile TYPE tags).** Six types × three lane classes, each a branch
  in mount/collision/landing logic. Largest hidden cost in B; touches everything.
  Estimate at 3× face value.
- **S-08 (offline) and R-01 (sub-second restart).** A service worker is a config file
  and a deployment-correctness problem — cache busting, first-load race, Safari's
  worker lifecycle — cheap at the end, expensive at the start, so do it last and
  reserve the time. R-01 looks like a number; it is an architecture decision plus
  input buffering.
- **E-05/E-06/E-07 (cosmetics).** A content pipeline — roster, palettes, sprite
  variants — not a system. S-07's stat card is 30+ characters × 6 authored stats.

Also expensive and low value: E-14 and E-15 (spec concedes both need infrastructure
this build lacks), S-09, S-13, S-02/S-03/S-04, E-12, E-13, S-11, S-12, S-14.

**Minimum shippable subset: ~30 of 77.** M (minus M-10) · B-01, B-02, B-06, B-07,
B-08, B-10 plus the solid/moving-platform half of B-03/04 · P-01, P-02, P-03, P-05,
P-07, P-08, P-12, P-13, P-15 · R-01, R-02, R-03, R-05, R-06 · E-01, E-02, E-05, E-07
· S-01, S-08, S-10 · X-01…X-07 as constraints. In relative cost that loop is ~30% of
the build; the other 47 are ~70% of the build and ~15% of the play experience. Any
schedule built on the 77 is a schedule for a content game, not a mechanic.

---

## 4. Build order

**Front-load the restart loop and the pursuer, on a grey board, before hazards exist.**

1. Grid, fixed-duration hop, square hitbox, phase state (M-01…M-06, M-08).
2. Camera + pursuer + death + restart as one vertical slice. **No hazards yet.**
3. Three lane classes, generator, P-12 invariant, collision (P-15).
4. Refill tile and gauge (P-08, P-09, P-11).
5. Economy and death screen (E-01, E-02, E-05, S-05).
6. Cosmetics (E-06, E-07, S-07). 7. Date seed (S-02, S-03).
8. Service worker (S-08), last.

Part 2 names one honest test — does a player who dies restart within one second
without being prompted — and says every other system feeds that number. And the
pursuer is the only requirement whose absence invalidates existing work, because it
constrains the camera, and the camera is the first thing you build. Hazards third,
not first, because tuning pursuer approach speed against a fixed three-lane demo is
tuning against a lie.

---

## 5. The state model the spec implies

**Run object** (created at run start, destroyed at death): `row` (= score), `col`,
`phase` (idle/hop/dead), `hopFrom/hopTo/hopT`, `gauge` (0–1), `ammo`, `reverseCount`,
`pursuer{armed, row, frac, state}`, and a **run-seeded PRNG instance**.

**Persists** (versioned localStorage): coins, secondary currency, unlocked roster ids,
insurance charges, best score, per-unlock stats, settings, daily completion state.
**Regenerates:** the lane list ahead of the camera, deterministically from the run
seed; discarded behind it.

**Decide on day one: seed the whole run, not the board.** The moment a lane is
generated from live play rather than a run seed, S-02 becomes impossible and the
generation build gate becomes untestable, because the generator can no longer be run
standalone against a fixed layout. Free now, a rewrite later.

Requirements that fight a clean model:

- **E-01 vs P-09 vs P-13.** Three systems keyed to three different clocks in one
  object: a *time*-based earn, a *scarcity*-based ramp, a *score*-based difficulty.
  Earn on `row` at a fixed rate and call it "one per second" only in store copy. As
  written, E-01 is a 1-second-granularity accumulator that will drift and be the
  first thing to make the HUD lie.
- **E-04 is a direct, unresolved collision.** "A power granted by currency count" is
  a functional unlock granted by wealth, violating X-03 and X-06. The
  conflict-resolution table never mentions it. Cut or rewrite; do not defer.
- **E-09/E-10 insurance** is the only persistent→run-scoped value transition and a
  state machine crossing the death boundary. Highest risk item in E, because a bug is
  a soft-lock: zero charges, and E-10 forbids buying one.
- **S-10 is not a flag.** The dossier rates it "Easy — a `zen: true` flag." Wrong: it
  must suppress the earn tick, the ammo drops and the death reward without
  desyncing them when the player toggles it back, and its toggle timing needs a rule.
- **B-09 vs X-04 and R-06.** Landmarks doubling as respawn checkpoints (DR-02-3) is a
  checkpoint system smuggled in under a board requirement, contradicting "no restart
  to a distant earlier point." Resolve before it merges with B-08.
- **Dropped but still required:** base-spec FR-27, a tight and honest airborne
  collision window, never made it into the 77. It is a real build requirement with
  no ID.

---

## 6. Testing strategy

**Automatable now, high value** (Python gate, deterministic generator, no browser):

- **P-12 static:** reachability bitmask over 10,000 seeds × 500 rows; the reachable
  set is non-empty at every row and the safe band never exceeds K. The biggest win
  available — it turns P-12 from a playtest question into a unit test.
- **P-12 temporal:** discrete-tick BFS over `(row, col, t)` with the platform phase
  model; every row reachable within the pursuer's closure budget. The case the
  bitmask cannot catch, and the one DR-09-4 documents as having shipped broken.
- **P-09 monotonicity:** expected row-distance between refill tiles is non-increasing
  in row index across all seeds. That *is* the definition of the ramp; a naive
  implementation fails it on the first run.
- **B-06/B-07/B-08/P-14:** pure arithmetic — telegraph duration > cross time at every
  speed in the table; max platform dwell ≥ 2× hop duration on every water lane; goal
  row always has ≥1 open slot; a safe band always within K rows.
- **P-02/P-07:** pursuer unarmed below threshold; `pursuer.row <= player.row` always;
  N backward hops fires the arm trigger and any forward hop resets it.
- **M-06/X-05:** hop duration constant across distances and states; player row
  modified only on an input event.
- **S-02 + determinism:** `gen(seed, n)` hashes identically across processes;
  `gen(hashOfDateString())` is stable; the difficulty multiplier changes only the
  weight table, never the seed.

**Automatable only if the architecture is right — decide on day one:** **R-01**
requires the loop to take `dt` as an argument and time from an injectable source, with
the input path stubbable. Then: fire death, dispatch a `pointerdown`, advance a fake
clock, assert `playable` at t < 1000 ms. One line of architecture now, a rewrite
later. The airborne window (FR-27) depends on the same seam.

**Not automatable — playtesting, and this is where the four weeks go:** M-07
disambiguation thresholds; **P-10**, the claim that scarcity converts the safe line
into a decision, which has *no* automated check of any kind; P-04, whether the escape
uses a skill already taught (a question about player mental models, not code); P-11,
whether the warning channel is distinct rather than merely loud; R-04 and R-05,
whether death is amusing and always reads as the player's fault; and every tuning
number — no source publishes the original's parameters, so hop duration, gauge drain,
refill scarcity and pursuer approach speed are all unset. Budget tuning as a phase.

---

## 7. What to cut, and what to protect

**Cut (5):** **E-08**, the closed ammunition economy — the most expensive
requirement, needing a verb the movement model deleted, for a benefit P-02 already
delivers; the gauge does the same anti-stasis job for a fraction of the cost, and
E-08 is the differentiator most likely to burn a week and force a board-model
rewrite. **S-09**, theme rotation — an art pipeline, not a feature. **E-14**, the
community bar — the spec concedes it needs infrastructure this build lacks, and it
has zero value solo (E-15 is the same category). **B-09**, landmark checkpoints —
keeping it means building a checkpoint system that X-04 and R-06 forbid; cut it
before it merges with B-08. **E-04**, power-by-currency-count — free to cut, and
leaving it in forces a direct violation of two Tier-A rules.

**Keep (5), protected at all costs:** **P-12**, the solvability guarantee — the only
Tier-A requirement that is both a correctness property and fully automatable; cut it
and the build gate collapses, ship it and the gate *is* the safety net. **R-01/R-02/
R-03**, the sub-second unprompted restart — the document's own honest test, the number
every other system feeds. **P-01/P-02**, the distance-gated pursuer — replaces the
idle timer, constrains the camera, must exist before anything else is tuned.
**P-08/P-09**, the refill tile and its scarcity — the differentiator that survives the
cut list and the only ramp in the document that is not a numeric curve. **B-08**, the
goal row with a guaranteed-open slot — the pressure valve that makes P-12 trivially
true; without it P-12 becomes a research project.

**One line:** the 30-requirement loop is a four-week project with two real risks
(M-07 input tuning, the P-09 ramp); the other 47 are a three-month content project.
The highest-value act on day one is writing the reachability invariant and the
`dt`-injection seam.
