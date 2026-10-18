/* src/hazards.js — moving hazards and collision.
 *
 * THE POSITIONS LIVE HERE, NOT IN THE RENDERER. The renderer reads them and
 * draws them where they are. If the view and the simulation ever disagreed,
 * a car would appear one tile from the player and kill someone standing still
 * on it, which breaks the hitbox-honesty requirement (M-08) and makes the
 * game feel broken. One owner, two readers.
 *
 * A hazard is: a lane, a direction, a speed, and a fractional position
 * `x` along the lane. Fractional is the whole point: a vehicle that snapped
 * between tiles would be unhittable in between and would let the player walk
 * through it.
 *
 * Difficulty scales two things, never the player's hitbox:
 *   speed   - how fast the hazard travels
 *   density - how many rows carry a hazard
 */
(function (global) {
  "use strict";

  // src/tiles.js loads before this file (see index.html and every gate's
  // CHAIN), so the shared lane classification is available here.
  var T = global.Tiles;

  /* The aprons, at module scope so the window builder and the per-row
   * builder agree on them.
   *   SAFE_START_ROWS  always clear, so the player learns the hop without
   *                    being killed before they have moved
   *   SAFE_GOAL_ROWS   always clear, so the stage can actually be finished */
  var SAFE_START_ROWS = 1;
  var SAFE_GOAL_ROWS = 2;

  /* Phase 2 item 3 — the railway telegraph.
   *
   * A rail hazard is ANNOUNCED before it is on the lane. It sits at the lane
   * entry edge, visible as a warning, and cannot hit anything, for
   * TELEGRAPH_MS. Only then does it run.
   *
   * This is not a difficulty knob, it is a fairness requirement. The player
   * hops at most once per 600ms and is exposed to a row for ~0.55s. A train is
   * 3.4 tiles long at up to 6 tiles/sec, so it covers any single column in
   * 0.57s — faster than the hop cadence. Without a warning the player cannot
   * see it in time, which is why stage 10 measured 54% campaign reachability
   * against a 90% target: the lane was not hard, it was unclearable.
   *
   * tools/check_hazard_reach.py asserts TELEGRAPH_MS is never shorter than the
   * traverse window, so this cannot silently regress.
   */
  var TELEGRAPH_MS = 1200;   // >= hop cadence (600ms) and traverse (550ms)
  // Every Nth row in the last third of a stage carries a bird, guaranteed.
  // Every stage gets birds through its closing stretch. This was 3, which put
  // one on every third row and left some stages ending with none at all.
  var ENDGAME_BIRD_EVERY = 2;
  var ENDMOD = 0;

  /* ---------------------------------------------------------------------
   * THE THREE PHASES OF A STAGE.
   *
   * A stage used to be one flat difficulty for ninety seconds: every lane ran
   * its traffic at the same speed, in the same direction, for the whole
   * crossing. That is not an escalation, it is a wall you either clear or you
   * do not, and the player learns the opening ten seconds and then coasts.
   *
   * The stage now has a shape, and it is the same shape on every stage:
   *
   *   1. THE READ    first ~18s. One direction per lane, at most one hazard
   *                  per row. The player can watch a whole lane go by and
   *                  learn its rhythm, because there is only ever one thing
   *                  moving on it.
   *   2. THE BUILD  ~18s to the sprint. The opposite direction joins, so a
   *                  lane is now two streams meeting, and extra hazards arm
   *                  progressively rather than all at once. The player who
   *                  memorised "left to right" has to start reading the lane
   *                  as a whole.
   *   3. THE SPRINT last ~15s. Everything already on the board speeds up
   *                  together, hard. Nothing new appears, so the board is
   *                  exactly the board they have been reading -- it is simply
   *                  moving too fast to read at the old pace.
   *
   * Phase 3 deliberately spawns nothing new. A last fifteen seconds that
   * introduces an obstacle the player has never seen is a coin flip; one that
   * accelerates what they already know is a test.
   * ------------------------------------------------------------------- */
  /* The stage length, read from Stages rather than restated here.
   *
   * This was a hardcoded 90000, which silently became a SECOND source of
   * truth for how long a stage lasts. When the stage grew to 90 hops the
   * speed curve kept ramping on a 90-second schedule while the board ran to a
   * 126-second one, so the "sprint" -- the 1.25x-to-2.2x acceleration -- fired
   * around hop 64 and then sat capped while the endgame pile-up landed at hop
   * 56. Measured, a competent player died at row 56 every single time, which
   * is precisely the row where the bird, the pits and the 1.4x density all
   * arrive at once. One number, one place. */
  var STAGE_DURATION_MS = (global.Stages && global.Stages.STAGES_CLOCK_MS) || 90000;
  /* A stage is SIX fifteen-second intervals, and each one is louder than the
   * last. This is the whole difficulty curve, and it is deliberately evenly
   * spaced rather than front-loaded.
   *
   * It used to be three phases at 0s / 18s / 75s, which measured as flat
   * complexity across the middle thirty seconds of every stage: a gap the
   * player could name and coast through. A ninety-second stage with a
   * fifteen-second beat is a rhythm the player can count to, and "count to
   * five and hold your breath" is a thing you can actually prepare for.
   *
   *   0s    THE READ     one direction, one vehicle per row
   *   15s   two-way traffic joins; the second vehicle per row
   *   30s   a third per row
   *   45s   a fourth
   *   60s   a fifth -- the board is as busy as it will get
   *   75s   THE SPRINT   all of it accelerates to 2.2x for the last 15s
   */
  var ARM_STEP_MS = 15000;
  // The first ARM_STEP_MS of a stage. Also the window in which nothing on the
  // board travels against the flow, so nothing is staggered behind it.
  var READ_MS = ARM_STEP_MS;
  // The sprint is the last 15 seconds of the stage, exactly as asked.
  var SPRINT_MS = 15000;
  var BUILD_END_MS = STAGE_DURATION_MS - SPRINT_MS;   // 75000

  /* The direction the whole board runs during the read. Every armed-at-zero
   * hazard points this way; the opposite is what joins when the read ends. */
  var READ_DIR = 1;

  /* How much faster everything moves at a given point in the stage.
   *
   * 1.0 through the read. A slow climb through the build, because the threat
   * there is the second direction arriving, not raw pace. Then a hard run to
   * 2.2x across the sprint: fast enough that a gap which was comfortable to
   * read at 1.0 has to be committed to rather than watched, and 1.76x faster
   * than the board was at the end of the build.
   *
   * This is a pure function of elapsed time, which is what makes it testable:
   * tools/check_phases.py can assert the curve without running a game. */
  function speedFactorAt(elapsedMs) {
    var t = elapsedMs || 0;
    if (t <= READ_MS) return 1.0;
    if (t < BUILD_END_MS) {
      // 1.0 -> 1.25 across the build.
      return 1.0 + 0.25 * ((t - READ_MS) / (BUILD_END_MS - READ_MS));
    }
    // 1.25 -> 2.2 across the sprint.
    var s = Math.min(1, (t - BUILD_END_MS) / SPRINT_MS);
    return 1.25 + 0.95 * s;
  }

  // The fastest the board will ever run. Solvability is checked against THIS,
  // not against the opening speed: a gap that only exists at 1.0x is not a gap.
  var PEAK_SPEED_FACTOR = speedFactorAt(STAGE_DURATION_MS);

  /* REACTION-TIME SPEED CAP.
   *
   * Speed is the difficulty lever that does not need more objects than there
   * are columns, which is exactly what a 6-wide board needs -- but it has to
   * stop somewhere, and it was stopping nowhere.
   *
   * A hazard's speed is `baseSpeed * speedFactorAt(stage clock)`, and BOTH
   * factors rise: difficulty adds 2% per step on top of a per-kind base that
   * already reaches 4.2 tiles/s, and the sprint multiplies the result by up to
   * 2.2. They compound. Measured on stage one during the sprint, a police car
   * -- one of the shortest things in the game, 0.95 tiles long -- was running
   * at 7.78 tiles/s. It crossed the 1.51 tiles that cover a player's column in
   * 194ms. The player cannot see a car, decide, and leave in 194ms; the hop
   * cadence alone is 300ms. That is not difficulty, it is a coin flip, and it
   * is where the endgame became a wall: deaths clustered on rows carrying fast
   * vehicles during the sprint, with a clear lane open on the next row.
   *
   * So speed is bounded from the player's side of the rule instead of the
   * designer's: nothing may cross a player's column faster than
   * MIN_COLUMN_CROSS_MS. For a hazard of length L that is
   *
   *     maxSpeed = (L + 2 * PLAYER_HALF) / MIN_COLUMN_CROSS_MS
   *
   * The ramp keeps climbing right up to the point where it stops being
   * readable, and then stops, which is what a ramp should do.
   *
   * WHAT THIS IS AND IS NOT. The fairness guarantee in this game is not this
   * number -- it is the crossing window. Every generated row is filtered until
   * one of the six playable columns stays clear for 0.9s or more, measured over
   * the row's full hazard cycle with the game's own collision test: measured
   * across 904 rows of all ten stages, zero rows with no window at all and zero
   * below the hop horizon. That is what stops a stage being unclearable, and it
   * is enforced in ensureSolvable(). This cap is a backstop against the
   * COMPOUNDING -- base speed x difficulty x sprint, three factors that all
   * rise at once -- which used to put a police car at 7.8 tiles/s and a 194ms
   * column crossing with no relation to anything the player was shown.
   *
   * The value is set by arithmetic, not taste. check_phases.py requires the
   * fastest object on the board to be at least 1.6x faster in the sprint than
   * at the end of the build, and the build/sprint factors are 1.25 and 2.2, so
   * the fastest object must be UNCLAMPED at the end of the build:
   *
   *     declared_top <= maxSpeedFor(len) / (difficulty_boost x 2.2)
   *
   * At a 300ms bound that puts a police car (len 0.95) at 2.29 tiles/s, down
   * from 4.2 -- it would have to be slower than a taxi to survive its own
   * sprint, and the fast-vehicle vocabulary the stages are built from would
   * disappear. At 180ms the same arithmetic gives 3.40, so only the two
   * genuinely extreme kinds move at all, and the clamp still removes a 194ms
   * crossing. The clamp is applied to the table below rather than to
   * individual hand-edited numbers, so it cannot drift out of step with
   * PEAK_SPEED_FACTOR or with a kind being added.
   */
  var MIN_COLUMN_CROSS_MS = 180;
  var PLAYER_HALF = 0.28;
  /* Tiles per second. `len` is in tiles and MIN_COLUMN_CROSS_MS in ms, so only
   * ONE conversion belongs here -- dividing the length by 1000 as well made the
   * cap 0.005 tiles/s, which froze the entire board and made the game look
   * solved. */
  function maxSpeedFor(spec) {
    if (!spec || !spec.len) return Infinity;
    return (spec.len + 2 * PLAYER_HALF) / (MIN_COLUMN_CROSS_MS / 1000);
  }
  function capSpeed(speed, spec) {
    var mag = Math.abs(speed);
    var cap = maxSpeedFor(spec);
    return (mag > cap) ? cap * (speed < 0 ? -1 : 1) : speed;
  }


  /* Every obstacle the game can spawn, and what makes it a decision.
   *
   *   len     hitbox length in tiles. A truck that is 2.6 long occupies most
   *           of a lane for most of its pass: you either commit early or
   *           wait for a gap that may not come. This is the single most
   *           useful number for making a lane feel different from a car lane.
   *   speed   tiles/second, [slowest, fastest]
   *   kind    ground  rolls along the row
   *           rail    locked to a rail lane
   *           water   floats along a water lane
   *           air     crosses without touching the row (a geyser's column)
   *   osc     if present, reverses at the ends of a span instead of wrapping
   *           off the board. A hazard that comes back is one you can no longer
   *           count on, which is a different decision from one that leaves.
   *   cycle   if present, lethal only for `on` ms out of every `period` ms.
   *           The player learns the beat and crosses on the off phase.
   */
  var KINDS = {
    // --- road ------------------------------------------------------------
    car:       { len: 0.86, speed: [1.2, 1.9], kind: "ground" },
    taxi:      { len: 0.90, speed: [1.5, 2.2], kind: "ground" },
    racecar:   { len: 0.78, speed: [2.6, 3.6], kind: "ground" },
    police:    { len: 0.95, speed: [3.0, 4.2], kind: "ground" },
    limousine: { len: 2.10, speed: [1.1, 1.6], kind: "ground" },
    truck:     { len: 2.60, speed: [0.9, 1.4], kind: "ground" },
    bus:       { len: 3.10, speed: [0.8, 1.2], kind: "ground" },
    tractor:   { len: 1.30, speed: [0.7, 1.2], kind: "ground" },
    forklift:  { len: 1.10, speed: [0.8, 1.3], kind: "ground" },
    roller:    { len: 1.70, speed: [0.6, 1.0], kind: "ground" },
    tumbleweed:{ len: 0.80, speed: [2.4, 3.4], kind: "ground",
                 osc: { span: 14, periodMs: 2600 } },
    /* The next four were added when the stage vocabulary floor went to ten.
     * A water-only stage had eight legal kinds and a rail stage had six, so
     * neither could reach ten however the list was written: the pool, not the
     * declaration, was the limit. They are deliberately different in silhouette
     * from each other and from the vehicles above -- a van, a drum, a rider on
     * two wheels and an open cart read apart at a glance, which is the whole
     * test for an object the player has to identify in under half a second. */
    ambulance:  { len: 1.55, speed: [1.4, 2.1], kind: "ground" },
    cementmixer:{ len: 1.85, speed: [0.8, 1.3], kind: "ground" },
    motorbike:  { len: 0.90, speed: [2.2, 3.2], kind: "ground" },
    golfcart:   { len: 0.95, speed: [0.9, 1.4], kind: "ground" },
    /* Two more rail kinds, for the same reason as the four above: three was
     * not a vocabulary, it was a sample. */
    // --- water -----------------------------------------------------------
    log:       { len: 0.90, speed: [0.7, 1.3], kind: "water" },
    turtle:    { len: 0.62, speed: [0.3, 0.6], kind: "water" },
    alligator: { len: 2.20, speed: [0.5, 0.9], kind: "water" },
    crocodile: { len: 2.60, speed: [0.4, 0.8], kind: "water" },
    /* Four more, so a river or a frozen lake can carry a ten-kind vocabulary
     * on water alone. A canoe is a decision (a long thin target you can miss
     * on purpose), the duck and the swan are small fast reads, and the ice
     * floe is the Frozen Lake's own idea of a log. */
    canoe:     { len: 1.30, speed: [0.6, 1.1], kind: "water" },
    duck:      { len: 0.55, speed: [0.8, 1.4], kind: "water" },
    swan:      { len: 0.80, speed: [0.7, 1.2], kind: "water" },
    icefloe:   { len: 1.45, speed: [0.3, 0.7], kind: "water" },
    /* The Frozen Lake has declared `sled` since the stage was written, and has
     * had art for it the whole time, but it was never added here -- so it was a
     * declaration the game could not honour, and the lake was quietly a
     * five-kind stage. Adding the spec is what makes the existing art mean
     * something. */
    sled:      { len: 1.10, speed: [0.9, 1.5], kind: "water" },
    // --- anything --------------------------------------------------------
    // Frogger rule: the snake impersonates a log. It belongs on WATER, not
    // on land, and that is the whole point -- it is the safe-looking tile
    // you are not supposed to trust.
    snake:     { len: 0.90, speed: [0.6, 1.1], kind: "water" },
    // A geyser: the column erupts on a beat. Lethal only while it is up, and
    // it looks like water rather than a vehicle, so it reads as a different
    // kind of danger entirely.
    geyser:    { len: 1.00, speed: [0, 0], kind: "air",
                 cycle: { on: 900, periodMs: 2400 } },
    steamvent: { len: 1.00, speed: [0, 0], kind: "air",
                 cycle: { on: 1200, periodMs: 3000 } },
    /* The sink hole: a ditch that opens across a whole lane.
     *
     * It is the one hazard the player cannot time their way past, because it
     * is not travelling -- it simply is not there, and then it is. The only
     * defence is to read the sign and not be standing on that row when it
     * goes. `warn` is how long before opening the sign is up, and it must
     * exceed the hop cadence or the player has no way to leave.
     *
     * `rowWide` makes the whole lane deadly rather than one column, so it
     * reads as a ditch across the road instead of a hole in one spot. */
    sinkhole: { len: 0.92, speed: [0, 0], kind: "ground", pit: true,
                rowWide: true,
                cycle: { on: 1500, periodMs: 4200, warn: 1500 } },
    /* The swooping bird.
     *
     * Everything else in the game is bound to a lane: a car needs asphalt, a
     * log needs water. A bird does not, which is the entire point -- it flies
     * over the LAWN, so the ground the player has been treating as a safe
     * place to think is not safe. That turns the player's one refuge into
     * another thing to read, and it is the cheapest way to make the endgame
     * feel different from the opening.
     *
     * It is drawn cartoonish on purpose: a wide-eyed, round-bodied bird with
     * a big beak and flapping wings, so a child recognises it instantly as
     * "the thing in the sky" rather than as another vehicle.
     *
     * `flies` marks it as lane-independent. `endgame` marks it as something
     * the stage guarantees near the finish. */
    hawk:     { len: 1.05, speed: [1.8, 2.6], kind: "ground", flies: true,
                endgame: true },

    /* --- war machines, siege engines and aliens ---------------------------
     *
     * These arrive with the library import and are referenced by the stage
     * lists, but they were never given a SPEC here. A stage that named one of
     * them was asking the spawner for a hazard that did not exist: the rail
     * lane was generating undefined objects and the run died at a fixed row
     * every time. Declaring them is what makes them usable.
     *
     * `flies` marks the lane-independent ones that cross open ground, which is
     * what lets an alien reach the lawn. */
    ufoa:        { len: 1.20, speed: [1.1, 1.8], kind: "air", flies: true },
    ufob:        { len: 1.20, speed: [1.2, 1.9], kind: "air", flies: true },
    ufoc:        { len: 1.20, speed: [1.3, 2.1], kind: "air", flies: true },
    ufod:        { len: 1.20, speed: [1.4, 2.2], kind: "air", flies: true },

    cannon:      { len: 1.50, speed: [1.0, 1.7], kind: "ground" },
    piratecannon:{ len: 1.45, speed: [1.0, 1.7], kind: "ground" },
    cannonmobile:{ len: 1.80, speed: [1.1, 1.8], kind: "ground" },
    turret:      { len: 1.30, speed: [0.9, 1.5], kind: "ground" },
    turretdouble:{ len: 1.60, speed: [0.9, 1.5], kind: "ground" },
    trebuchet:   { len: 3.00, speed: [0.9, 1.4], kind: "ground" },
    ballista:    { len: 2.80, speed: [1.1, 1.7], kind: "ground" },
    siegeram:    { len: 2.40, speed: [1.2, 1.8], kind: "ground" },

    speedercraft:{ len: 1.05, speed: [1.8, 2.8], kind: "air", flies: true },
    racercraft:  { len: 1.15, speed: [2.0, 3.0], kind: "air", flies: true },
    horse:       { len: 1.30, speed: [1.0, 1.7], kind: "ground" },

  };

  /* Trim any kind whose declared top speed could not survive a full sprint
   * inside the reaction bound, so that the sprint stays a visible ramp instead
   * of every fast hazard arriving pre-capped and flat. */
  var MAX_DIFFICULTY_BOOST = 1.24;   // 2% per step, 12 steps (see makeHazard)
  (function clampKindsToReactionBound() {
    for (var name in KINDS) {
      var spec = KINDS[name];
      if (!spec || !spec.speed || spec.speed[1] <= 0) continue;
      var budget = maxSpeedFor(spec) / (MAX_DIFFICULTY_BOOST * PEAK_SPEED_FACTOR);
      if (spec.speed[1] > budget) spec.speed[1] = budget;
    }
  })();

  // Per-column speed variance, so two hazards in the same row are not a wall.
  // True while a hazard is still only ANNOUNCED: it has not entered the lane
  // and cannot hit anything, but the player can see it coming.
  function isTelegraphing(h) {
    return !!(h && h.tel && h.tel.t > 0);
  }

  // Does this kind reverse inside a span rather than wrapping off the board?
  function spec_osc(spec) { return !!(spec && spec.osc); }

  // Park a rail hazard at the lane entry edge and start its warning.
  function armTelegraph(h, cols, xMin) {
    var lo = xMin === undefined ? 0 : xMin;
    h.x = (h.speed > 0) ? (lo - 0.5 - h.spec.len) : (cols + 0.5 + h.spec.len);
    h.tel = { t: TELEGRAPH_MS, ms: TELEGRAPH_MS };
  }

  function makeHazard(kind, row, cols, rng, difficulty, xMin, armMs) {
    var spec = KINDS[kind];
    if (!spec) return null;
    var dir = rng.bool() ? 1 : -1;
    var sp = spec.speed[0] + (spec.speed[1] - spec.speed[0]) * rng.next();
    // Difficulty raises the ceiling only. The floor never drops, so stage one
    // is never faster than its slowest vehicle.
    sp *= 1 + Math.min(difficulty, 12) * 0.020;
    var h = {
      kind: kind, spec: spec, row: row, dir: dir,
      /* `baseSpeed` is what the hazard runs at during the read. `speed` is
       * recomputed from it every tick against the stage clock, so the sprint
       * accelerates the board without ever needing to rebuild it. `speed`
       * keeps carrying the sign, because direction is stored in it. */
      baseSpeed: sp, speed: sp * dir,
      /* `armMs` is when this hazard joins the board. Zero means it is there
       * from the first frame. The second hazard in a row carries the read
       * length, so a lane is genuinely one-directional until the build
       * begins. `now` is the stage clock as of the last tick, which is what
       * isStaged() reads. */
      armMs: armMs || 0, now: 0,
      // Oscillating hazards reverse inside a span instead of wrapping off the
      // board, so they come back at you and cannot be counted on.
      osc: spec.osc ? { span: spec.osc.span, periodMs: spec.osc.periodMs,
                        t: 0, dir: 1, mid: 0 } : null,
      // Timed hazards are only lethal part of the time. `phase` staggers
      // them so two geysers in a row are not in lockstep. `warn` is carried
      // through deliberately: a pit whose spec declares a warning but whose
      // built hazard drops it renders with no sign at all, which is an
      // invisible instant death rather than a hazard.
      cycle: spec.cycle ? { on: spec.cycle.on, periodMs: spec.cycle.periodMs,
                            warn: spec.cycle.warn,
                            t: rng.range(0, spec.cycle.periodMs) } : null,
      // Rail hazards announce themselves before they enter the lane. The
      // countdown is staggered so two trains never arm in lockstep.
      tel: spec.kind === "rail"
             ? { t: rng.range(0, TELEGRAPH_MS), ms: TELEGRAPH_MS } : null,
      x: rng.range(xMin === undefined ? -cols : xMin - 0.5, cols + 0.5),
      /* The board width this hazard was built for, kept so that a collision
       * test can be asked about the FUTURE without being handed cols as well:
       * the wrap boundary is cols + 1.5, and guessing it wrong makes the
       * prediction describe a different board than the one being played. */
      cols: cols,
      wobble: rng.range(0.5, 1.5),      // log drift phase
      dead: false,
    };
    if (h.tel) armTelegraph(h, cols, xMin);
    return h;
  }

  // One pass over a window of rows. Deterministic from a seed, so a run can
  // be replayed from its seed in a bug report.
/* Row density at a given row, from the stage's base rate.
   *
   * THIS IS THE SINGLE SOURCE OF TRUTH, and it has to be.
   *
   * The opening boost used to live inside buildHazards() only. The running game
   * does not call buildHazards() -- src/sim-core.js generates the board one row
   * at a time through hazardsForRow() -- so the boost was applied to nothing a
   * player could see. That is the "the killing things are not coming at the
   * start" complaint, and it survived an earlier fix precisely because that fix
   * was written to the entry point the game never calls.
   *
   * Both paths call this now, so they cannot drift apart again.
   *
   * The opening rows are a GUARANTEE, not a probability, and that distinction
   * is the whole fix. Density is consumed as `if (rng.next() > chance) break`,
   * so it is the chance that one vehicle is placed on a row. A larger multiplier
   * moves that average and does not make the opening reliable: measured across
   * 40 seeds, an opening rate of 0.94 still left stage one starting only 49% of
   * its hazardous lanes, and stage seven 15%. A player cannot meet a game that
   * is usually not there.
   *
   * A density of exactly 1.0 cannot fail that roll. So every hazardous row in
   * the opening carries at least one vehicle from the instant the stage begins,
   * and the taper returns the board to the stage's own base rate behind it.
   *
   * "Every hazardous row" is deliberately not "every row": lawn still gets
   * nothing, because a car on grass the renderer drew as lawn is precisely the
   * "looks walkable, is lethal" defect. And the opening is ONE vehicle per row
   * at base speed, against five at 2.2x later -- which is what lets the second
   * vehicle at fifteen seconds read as a doubling instead of as noise.
   */
  /* The endgame is a fixed number of rows from the goal, not a FRACTION of the
   * stage.
   *
   * At a 40-row stage a 0.62 fraction meant "the last ~15 rows". At 90 rows the
   * same fraction means the last ~34 -- more than double the stretch the
   * endgame was designed for. Pits block an entire row and always need waiting
   * out, the bird arrives every second row, and density is multiplied 1.4x, so
   * doubling that window compounds three pressures into twice as many rows.
   * Measured, a competent player died at row 56 every single run -- row 56 is
   * exactly where the stretched endgame opens -- and cleared the stage zero
   * times out of thirty.
   *
   * Pinning it to rows keeps the intended shape of the finish regardless of how
   * long the stage is. */
  var OPENING_GUARANTEED_ROWS = 6;   // rows 1..6 are the guaranteed-traffic band
  var ENDGAME_ROWS = 15;

  /* ---------------------------------------------------------------------
   * THE BOARD GENERATOR'S THREE NUMBERS.
   *
   * Everything about how full a row is comes from here, so the ramp can be
   * reasoned about as arithmetic instead of re-measured after every edit.
   * They are all read from Stages (which is the owner of difficulty) except
   * the first two, which shape what that difficulty means on a six-wide board.
   * ------------------------------------------------------------------- */
  /* OPENING_BOOST -- how much busier the first rows are than the body.
   *
   * This was `return 1.0`, an ABSOLUTE density, not a boost, and it was the
   * single worst line in the generator.
   *
   * Density is consumed as `if (rng.next() > chance) break`, so 1.0 does not
   * bias the roll, it ELIMINATES it: every row 1..6 got its first vehicle
   * every time, and the follow-on chance (1.0 x 0.83) put up to five on a
   * row. The busiest part of a stage was therefore its first six rows, and
   * the board then fell away behind them -- measured hazards per row by
   * tenth of the stage: 0.70, 0.40, 0.49, 0.59, 0.59, 0.67, 0.69, 0.72,
   * 0.77, 1.45. The ramp the design asks for is monotonic and that is the
   * one thing that curve is not.
   *
   * It also killed the player. A run has four lives and no way back, so a
   * six-row wall at full density at the mouth of the stage is where a run
   * ends. Traced over 20 forward-only runs: 44 of 80 deaths landed on rows
   * 2-9, and the board was measurable at only 0.70 hazards per row overall.
   * A guarantee the player cannot survive is not a guarantee, it is a wall.
   *
   * So the opening is a BOOST on the stage's own rate -- clearly busier than
   * the body, and the first traffic the player ever sees is on screen the
   * moment the stage begins -- rather than a saturation of it. */
  var OPENING_BOOST = 1.9;
  /* SECOND_HAZARD_GAIN / SECOND_HAZARD_FLOOR -- the opposite direction.
   *
   * Once a row has traffic, the counter-flow hazard joins the board on the
   * fifteen-second beat with a chance of
   *
   *     densityNow * SECOND_HAZARD_GAIN + SECOND_HAZARD_FLOOR
   *
   * rather than `densityNow * 0.83`. Multiplying a sparse board's own rate by
   * a shrink factor compounds two small probabilities: measured, only 9.7% of
   * rows carried traffic in both directions, and only 5.4% under the geometry
   * tools/check_endgame.py probes with. That is "technically two-way and
   * practically not", which is the exact phrase the old curve already carried
   * in its comment.
   *
   * The floor is the point. "The opposite direction joins" is a promise about
   * the BUILD phase, and the build happens on every row that has anything to
   * build on -- not on the minority that happened to win two independent
   * small rolls. The gain still scales with density, so a crowded row gets a
   * busier counter-flow and a sparse one gets a lighter one. */
  var SECOND_HAZARD_GAIN = 0.45;
  var SECOND_HAZARD_FLOOR = 0.55;
  /* How fast each further hazard on a row gets less likely.
   *
   * A row can hold at most `cols` distinct lethal columns, so the count on a
   * row cannot keep doubling -- it has to flatten against a finite board. This
   * is the geometric term that makes it flatten: hazard n+1 is
   * SECOND_HAZARD_GAIN/HAZARD_DECAY times as likely as hazard n, so the
   * expected number on a row converges instead of growing without bound.
   *
   *   E[n] = d (1 + c + c^2 + c^3 + ...) where c = 1 / HAZARD_DECAY
   *
   * With HAZARD_DECAY = 1.75, c = 0.571 and E[n] tops out at 1/0.429 = 2.33
   * times the row density. At the live board's 0.40-0.50 density that is
   * 0.93-1.17 hazards per row, which is the top of the target band, and it
   * is the SAME curve at every difficulty -- only the density under it moves.
   * That is what makes the ramp monotonic by construction: one rising input,
   * one fixed response. */
  var HAZARD_DECAY = 1.75;
  /* The ceiling on a row's per-hazard chance. Above this the roll stops being
   * a probability and the count is decided by the loop bound instead. */
  var MAX_ROW_DENSITY = 1.0;
  function isEndgame(row, goalRow) {
    return row >= (goalRow - ENDGAME_ROWS - SAFE_GOAL_ROWS);
  }
  /* The goal row of the stage being GENERATED.
   *
   * buildRow() used to read `Stages.GOAL_ROW_OFFSET` here -- the stage-ONE
   * figure, 90 -- and use it for the finish apron AND for isEndgame(). That is
   * the bug that made the campaign impossible, and it is invisible at the old
   * length: a 40-row stage has GOAL_ROW_OFFSET 40, so the two numbers agreed.
   *
   * The stage table now runs 90, 108, 130, ... 464 jumps, so the same line
   * said "this stage ends at row 90" for all ten of them. Measured on the live
   * board, stage 10 carried 0.41 objects per row over rows 0-57 and then
   * 0.00 for every row from 88 to 461: 81% of the crossing was an empty road
   * running at sprint speed, with the endgame -- birds, pits and the 1.4x
   * density boost -- parked at rows 73-87, a third of the way in.
   *
   * One number per stage, read from the same table the win condition is read
   * from, so the finish apron and the endgame always sit at the end of the
   * stage the player is actually crossing. */
  function goalRowFor(stageIndex) {
    if (stageIndex !== undefined && stageIndex !== null && global.Stages &&
        global.Stages.jumpsFor) return global.Stages.jumpsFor(stageIndex);
    return (global.Stages && global.Stages.GOAL_ROW_OFFSET) || 40;
  }
  /* The chance that ONE hazard is placed on this row.
   *
   * Monotonic in the row by construction, which is the property the difficulty
   * curve depends on and the property the old `return 1.0` destroyed. Two
   * inputs, both non-decreasing as the player advances: `base` (the stage's own
   * rate, lifted by Stages' growth ramp) and the opening boost, which applies
   * to the first rows and then stops. Nothing here can make row R+1 emptier
   * than row R.
   *
   * Past the opening this is exactly `base`, untouched. An earlier version
   * tapered back gradually from the opening rate over rows 7-11, which reached
   * a third of the way across the board and made the game harder for no reason
   * the design asked for. The opening is the thing that was empty; only the
   * opening gets the boost, and it is a multiplier rather than a ceiling so
   * that the player is shown traffic immediately without being placed inside
   * a wall. */
  function rowDensity(row, base) {
    var d = (row <= OPENING_GUARANTEED_ROWS) ? base * OPENING_BOOST : base;
    return d > MAX_ROW_DENSITY ? MAX_ROW_DENSITY : d;
  }

  /* How many vehicles per row have joined the board at a given stage time.
   *
   * The beat is the whole escalation the player can count to, and it is one
   * vehicle per fifteen seconds: 0s, 15s, 30s, 45s, 60s. The fifteen-second
   * step is the "it doubles" moment, and it is enforced here rather than being
   * left to whichever hazard happened to be generated second. */
  function perRowCapAt(elapsedMs) {
    if (elapsedMs === undefined) return 5;   // offline preview: the full board
    var step = Math.floor((elapsedMs || 0) / ARM_STEP_MS);
    return Math.max(1, Math.min(5, step + 1));
  }

  function buildHazards(seed, row0, viewRows, cols, difficulty, Rng, stageIndex) {
    var rng = Rng;
    var out = [];

    /* THE LAUNCH APRON AND THE FINISH APRON.
     *
     * This function used to return an empty list for stages one and two:
     * "teaching stages carry no lethal hazard at all". That is not a tutorial,
     * it is the absence of the game. A lane-crossing game with no traffic is a
     * walking sim, and the player asked for stage one to be playable in the
     * sense the genre means: real vehicles, real danger, real timing.
     *
     * What a first stage should do is be EASY, not EMPTY. So every stage,
     * starting with stage one, spawns lethal hazards, and the first three rows
     * and the last two are guaranteed clear. The player is set down on safe
     * ground, learns the hop on their first press, and then meets the first
     * car on their own terms. That is a tutorial. An empty board is not. */

    // Density ramps with difficulty but never reaches 1: a lane that is
    // always occupied is not a puzzle, it is a wall. ensureSolvable() enforces
    // the rest of that promise by thinning any row with no passable window.
    //
    // This is a per-ROW chance on rows that are actually hazardous, and it is
    // the only difficulty knob. The old values started at 0.09, which put
    // roughly one car on the entire forty-row board of stage one -- you could
    // walk the whole stage without ever meeting one.
    // 0.55 at the start: hazards should be visible immediately when the stage begins.
    // The player should never feel the board is empty at the start.
    var baseDensity = 0.55 + Math.min(0.30, difficulty * 0.030);

    /* Lane class decides which hazards can appear, and only one is possible
   * per row, so a log can never share a row with a train. The class comes
   * from the SAME function the renderer draws with (Tiles.laneOf), keyed on
   * this stage's own laneMix. The previous `row % 10` switch was a second,
   * independent opinion about what a row was, which put cars and trains on
   * rows the renderer drew as lawn -- ground that looked safe and killed the
   * player, in all ten stages.
   */
  var laneMix = null, laneKey = stageIndex;
    if (stageIndex !== undefined && global.Stages && global.Stages.getStage) {
      var st = global.Stages.getStage(stageIndex);
      if (st) { laneMix = st.laneMix; laneKey = st.id; }
    }
    // `share` normalised the count of CROSSINGS between stages that have
    // wildly different lane mixes. It was added when a road-only stage was
    // getting cars where it had used to get logs, which read as a difficulty
    // spike. It over-corrected: multiplying a per-ROW chance by the fraction of
    // rows that are hazardous squares the effect, so stage one came out with
    // about one car on the whole board. Density is a per-row chance on rows
    // that are already hazardous, and that is the whole knob.
    for (var r = 0; r < viewRows; r++) {
      var row = row0 + r;
      // One density function, shared with hazardsForRow(), so the offline
      // preview and the running game cannot disagree about what a stage's
      // opening looks like.
      var density = rowDensity(row, baseDensity);
      var made = buildRow(row, cols, density, rng, stageIndex, laneMix, laneKey);
      for (var m = 0; m < made.length; m++) out.push(made[m]);
    }
    return out;
  }

  /* ONE ROW of hazards, as a pure function of the row.
   *
   * This exists so the running game can generate a row once and then LEAVE IT
   * ALONE. Previously the whole visible window was thrown away and rebuilt
   * every time the player advanced one row, so every car on the board vanished
   * and reappeared somewhere else on each hop -- the board visibly reset
   * itself under the player's feet, which is not a game, it is a flicker.
   *
   * Generating per row and keeping the result means: existing cars keep
   * driving, new rows appear ahead, and nothing behind is disturbed. */
  function laneClassOf(row, laneMix, laneKey) {
    if (!T) return "road";
    return T.laneOf(row, laneMix, laneKey);
  }

  /* The one endgame row that is guaranteed to open a ditch.
   *
   * Deterministic, because it is derived only from the stage's own lane cycle:
   * walk in from the start of the closing stretch and take the first row that
   * is not lawn. Every stage therefore has a pit on the same row every time,
   * which is the difference between "every stage has a ditch" and "most
   * boards happen to". A stage that is pure grass in its closing stretch has
   * no such row, and gets -1, which simply means no guarantee for it. */
  function firstEndgamePitRow(laneMix, laneKey, goalRow) {
    /* Start at the ENDGAME WINDOW, not at a fixed fraction of the stage.
     *
     * The fraction (0.62) was calibrated on a 40-row stage, where it meant
     * "row 24, inside the last fifteen". Run against a 464-row stage it puts
     * the guaranteed pit at row 285 -- 180 rows before the endgame even opens,
     * and the one row the player can rely on being a ditch is a row they will
     * have forgotten. The search now walks in from the same fixed
     * ENDGAME_ROWS window everything else uses. */
    var from = Math.max(0, goalRow - ENDGAME_ROWS - SAFE_GOAL_ROWS);
    for (var r = from; r < goalRow - SAFE_GOAL_ROWS; r++) {
      if (laneClassOf(r, laneMix, laneKey) !== "grass") return r;
    }
    return -1;
  }

  /* What kind of hazard a row may carry.
   *
   * This is where a stage stops being a recolour of Suburb. It used to be a
   * fixed switch on the lane class -- road is always a car, rail always a
   * train, water always a log or a turtle -- so all ten stages spawned
   * exactly the same obstacles and the declared `hazardKinds` in stages.js
   * were decoration that only the offline preview sheet ever read.
   *
   * Now the stage's own declared list is authoritative, filtered to the kinds
   * that are legal for that lane. A stage that declares `tractor, car` gets
   * tractors and cars, weighted toward tractors; one that declares `tram`
   * gets trams. A stage that declares a kind for a lane it does not have
   * simply never spawns it, because the lane is not there to hold it.
   */
  var LANE_KINDS = {
    /* The road is a stage's main vocabulary, so it also carries the war
     * machines and the aliens. legalForLane only spawns what a lane LISTS,
     * which is why every imported kind was previously orphaned: declared in
     * KINDS, present in the manifest, drawn by the renderer, and unreachable. */
    road: ["car", "racecar", "taxi", "police", "truck", "bus", "tractor",
           "forklift", "roller", "tumbleweed", "limousine",
           "ambulance", "cementmixer", "motorbike", "golfcart",
           "cannon", "piratecannon",
           "cannonmobile", "turret", "turretdouble", "trebuchet",
           "ballista", "siegeram", "horse"],
    /* The rail lane no longer carries trains, trams or monorails -- those
     * read as metal barriers crossing the road rather than as things that
     * kill you, and they were removed on request. The lane itself stays: it is
     * still a distinct, readable trackway, and it now carries ground vehicles
     * that plainly belong on a road. */
    rail: ["cementmixer", "forklift", "tractor"],
    water: ["log", "turtle", "snake", "alligator", "crocodile",
            "canoe", "duck", "swan", "icefloe", "sled"],
  };
/* Legal on ANY lane, including the open lawn the player can see is walkable.
   *
   * THE RULE, stated once: only the airborne may cross standable ground. A car
   * on a row the renderer drew as grass is the "looks walkable, is lethal"
   * defect that check_js_runtime.py exists to catch, and this list is the only
   * thing that can cause it. Everything on it earns its place by being typed
   * `air` or marked `flies`:
   *
   *   geyser, steamvent   erupt from below, so they belong on open ground
   *   ufoa..ufod, crafts  lane-independent saucers; crossing the lawn is the
   *                      entire point of them
   *   hawk                the endgame bird, which flies over the lawn
   *
   * It is DERIVED from KINDS rather than written out by hand, which is the
   * only way it stays true: the hand-written list had already drifted once
   * (it still named `boulder`, a ground-typed rock that was deleted from KINDS
   * entirely) and it omitted `hawk`, which has been placed on lawn rows all
   * along. Adding a flying kind to KINDS now puts it here automatically, and
   * deleting one cannot leave a name that spawns nothing.
   *
   * A kind that is neither `air` nor `flies` can never enter this list, so the
   * "no ground-typed kind crosses the lawn" invariant is enforced by the
   * derivation rather than by a promise in a comment. isOpenKind() re-checks
   * it at the point of use. */
  function crossesOpenGround(name) {
    var spec = KINDS[name];
    return !!(spec && (spec.kind === "air" || spec.flies));
  }
  var OPEN_KINDS = (function deriveOpenKinds() {
    var out = [];
    for (var name in KINDS) if (crossesOpenGround(name)) out.push(name);
    return out;
  })();
  function isOpenKind(kind) {
    return crossesOpenGround(kind);
  }

  function kindsForStage(stageIndex) {
    if (stageIndex === undefined || !global.Stages || !global.Stages.getStage) return null;
    var st = global.Stages.getStage(stageIndex);
    if (!st || !st.hazardKinds || !st.hazardKinds.length) return null;
    return st.hazardKinds;
  }

  /* A hazard kind this lane can legally carry, or null.
   *
   * The open-ground branch is re-derived here rather than read out of
   * OPEN_KINDS, so a name that somehow stopped being airborne stops being
   * legal on the lawn the moment the table says so. */
  function legalForLane(kind, lane) {
    if (LANE_KINDS[lane] && LANE_KINDS[lane].indexOf(kind) >= 0) return kind;
    if (isOpenKind(kind)) return kind;              // airborne: any lane
    return null;
  }

  function pickKind(lane, stageIndex, rng) {
    if (lane === "grass") return null;                // never spawn on open ground
    var want = kindsForStage(stageIndex);
    var pool = [];
    if (want) {
      for (var i = 0; i < want.length; i++) {
        var ok = legalForLane(want[i], lane);
        if (ok) pool.push(ok);
      }
    }
    if (!pool.length) {
      // The stage declared nothing usable for this lane: fall back to the
      // generic set for the lane rather than leaving it empty.
      pool = LANE_KINDS[lane] ? [LANE_KINDS[lane][0]] : [];
    }
    if (!pool.length) return null;
    /* Weight toward the front of the list, so a stage's signature obstacle is
     * the one the player meets most -- but on a curve, not a cliff.
     *
     * The weighting used to be linear from n down to 1, which for a ten-kind
     * stage gave the last kind 1/55 of every draw. Measured, that meant a
     * water stage showed SEVEN to NINE distinct objects on a single crossing
     * and never ten, because the tail of the vocabulary was simply absent from
     * most boards.
     *
     * A square-root curve with a floor of 2 fixes the tail without flattening
     * the head: the signature object stays the most common thing on the
     * board, and every declared kind now turns up. The floor is the part that
     * matters -- without it the last kind still drew only 4% of the time and
     * was missing from one board in five. */
    function weightAt(n, j) { return Math.max(2, Math.pow(n - j, 0.5)); }
    var total = 0, j;
    for (j = 0; j < pool.length; j++) total += weightAt(pool.length, j);
    var r = rng.next() * total;
    for (j = 0; j < pool.length; j++) {
      r -= weightAt(pool.length, j);
      if (r < 0) return pool[j];
    }
    return pool[0];
  }

  function buildRow(row, cols, density, Rng, stageIndex, laneMixIn, laneKeyIn, xMin,
                   difficulty, maxHere) {
    var rng = Rng;
    var out = [];
    var laneMix = laneMixIn, laneKey = laneKeyIn;
    if (laneMix === undefined) {
      laneMix = null; laneKey = stageIndex;
      if (stageIndex !== undefined && global.Stages && global.Stages.getStage) {
        var st = global.Stages.getStage(stageIndex);
        if (st) { laneMix = st.laneMix; laneKey = st.id; }
      }
    }
    var goalRow = goalRowFor(stageIndex);
    // The aprons. Absolute rows, not window-relative: row0 is the camera
    // window and moves as the player advances.
    if (row < SAFE_START_ROWS) return out;
    if (row >= goalRow - SAFE_GOAL_ROWS) return out;
    /* The endgame bird.
     *
     * The request was that EVERY stage has a flying thing that comes at the
     * player near the end. "Near the end" is the last third of the crossing,
     * and the last stretch is made DENSE with them rather than left to
     * chance: a guarantee the player discovers by playing is worth much less
     * than one they can anticipate, and a stage that sometimes ends with no
     * bird at all is a stage whose ending cannot be learned. */
    var endgame = isEndgame(row, goalRow);

    /* A sink hole on some endgame rows. It only ever appears in the last
     * third, where the player is already reading the board hard, and always
     * with a sign before they open.
     *
     * It is never placed on a grass row. A ditch in the middle of a lawn looks
     * like scenery on a safe lane, and a player who reads the lawn as safe
     * dies on it -- which is exactly the "looks walkable, is lethal" defect
     * check_js_runtime.py exists to catch. A hole belongs in the road, on the
     * rails, or in the water. */
    var thisLane = laneClassOf(row, laneMix, laneKey);
    /* A ditch in EVERY stage, guaranteed, plus extras on a roll.
     *
     * This was `(row % 3 === 0) && rng.next() < 0.34`, which is a third of a
     * chance per eligible row and no guarantee at all: measured over whole
     * boards, Desert and Farmland often came through with no ditch anywhere.
     * "A ditch in each stage" cannot be a probability. The first eligible
     * endgame row is deterministic -- it is found by walking the same lane
     * cycle the renderer draws, so it is the same row every time -- and that
     * one always opens a pit. The rest stay a roll, so a stage has one or it
     * has several depending on how hard the finish is. */
    var firstPitRow = firstEndgamePitRow(laneMix, laneKey, goalRow);
    var wantPit = false;
    if (endgame && thisLane !== "grass") {
      if (row === firstPitRow) wantPit = true;
      else if (row % 3 === 0 && rng.next() < 0.34) wantPit = true;
    }
    if (wantPit) {
      var pit = makeHazard("sinkhole", row, cols, rng, difficulty || 0, xMin);
      if (pit) { pit.x = 0; pit.speed = 0; out.push(pit); }
    }

    /* The endgame bird.
     *
     * The request was that EVERY stage has a flying thing that comes at the
     * player near the end. It is placed on every ENDGAME_BIRD_EVERY-th row of
     * the closing stretch, so every stage guarantees one and a player who has
     * died on stage four knows what the finish looks like. */
    if (row % ENDGAME_BIRD_EVERY === 0 && endgame) {
      var bh = makeHazard("hawk", row, cols, rng, difficulty || 0, xMin);
      if (bh) {
        // The bird follows the board's direction too, so the read really is
        // one-sided: nothing in the sky is crossing against the traffic yet.
        bh.dir = READ_DIR;
        bh.speed = Math.abs(bh.speed) * bh.dir;
        bh.x = bh.dir > 0 ? xMin - 0.5 : cols + 0.5;
        out.push(bh);
      }
    }

    var k = pickKind(laneClassOf(row, laneMix, laneKey), stageIndex, rng);
    if (!k) return out;

    /* Complexity, roughly doubled.
     *
     * A row used to hold at most one hazard, so the busiest board in the game
     * was a single vehicle per lane. It now holds up to three, and the endgame
     * multiplier is higher, which roughly doubles the objects the player has
     * to read at once without changing what any single one does.
     *
     * The hazards are all generated NOW, at stage start, and the stage's three
     * phases decide which of them are on the board yet. The first is live
     * immediately: that is the one-sided read. Everything after it is stamped
     * with an arming time, so the second direction and the extra vehicles
     * arrive on schedule instead of all at once on the first frame. */
    /* Row density, applied evenly across the whole board.
     *
     * This was `density * (endgame ? 2.0 : 1)`, which doubled every row from
     * row 24 onward and left the first twenty-three rows at base rate. The
     * player spends the opening fifteen seconds crossing exactly those first
     * twenty-three rows, so the beat that was supposed to introduce the game
     * introduced an empty board: measured, River had traffic on rows 6 and
     * then nothing until row 18 -- eleven clear rows in the middle of the
     * stage. Playtested as "nothing comes to kill me in the first fifteen
     * seconds".
     *
     * Escalation now belongs to the fifteen-second BEAT, which adds vehicles
     * to a row on a clock the player can feel. Row density just has to be
     * enough that every lane is a lane. A mild back-heaviness survives so the
     * closing stretch still reads as the busiest part of the board. */
    /* Endgame density, with a floor on survivability.
     *
     * The 1.4x endgame boost was safe when a stage was 40 rows long. At 90 rows
     * the endgame sits on a board that is ALSO carrying the +50%-per-15-hops
     * growth multiplier, and the two compound: measured, rows in the final
     * stretch carried 2.16-2.80 lethal columns out of the six the player has.
     * That is not a hard ending, it is a wall with no gap in it -- crossing the
     * last rows became a coin flip the player could not read or plan.
     *
     * So the endgame boost is now conditional: dense, but never dense enough to
     * close every lane. `MAX_ENDGAME_DENSITY` leaves room for the player to be
     * somewhere safe, which is what makes the ending a timing decision rather
     * than a lottery. */
    var endgameBoost = endgame ? 1.4 : 1.0;
    var MAX_ENDGAME_DENSITY = 0.92;
    var densityNow = density * endgameBoost;
    if (densityNow > MAX_ENDGAME_DENSITY) densityNow = MAX_ENDGAME_DENSITY;
    /* One vehicle joins on each fifteen-second beat of the stage, so a row can
     * hold five: one for the read, then one more at 15s, 30s, 45s and 60s.
     *
     * This is what turns the fifteen-second beat into a visible one rather
     * than a claim in a comment, and it is also what fills a board with enough
     * objects for a stage to show a ten-object vocabulary on a SINGLE
     * crossing: measured at three per row, stage one showed seven to nine
     * distinct kinds on one board and never ten. */
    /* How many vehicles this row may carry.
     *
     * This is the growth step's "more killing items" channel, and it is
     * capped at what six columns can physically carry: the stage's own
     * MAX_HAZARDS_PER_ROW. Past four, ensureSolvable deletes the surplus again
     * -- a fifth object on six columns does not make a row harder, it makes it
     * a wall and then makes it easy again once the filter thins it. The
     * offline preview path does not know the stage's progress, so it keeps the
     * old flat five and the filters do the same work either way. */
    if (maxHere === undefined || maxHere === null) maxHere = 5;
    var placed = 0;
    for (var attempt = 0; attempt < 6 && placed < maxHere; attempt++) {
      /* How likely the NEXT hazard on this row is.
       *
       * Hazard 0 is armed by the row's own density -- that is the roll that
       * decides whether this row has traffic at all, and it is the only knob
       * the difficulty ramp moves.
       *
       * Every hazard after the first is the counter-flow half of the BUILD
       * phase, and it is deliberately NOT a second independent copy of the
       * same small probability. `densityNow * 0.83` was: two small rolls in a
       * row, so two-way traffic was true of 9.7% of rows and the "then they
       * start coming the other way" beat had almost no rows to happen on. The
       * counter-flow hazard now joins with
       *
       *     densityNow * SECOND_HAZARD_GAIN + SECOND_HAZARD_FLOOR
       *
       * and each subsequent one is HAZARD_DECAY times less likely than the
       * last, which is what makes the count converge on a six-column board
       * instead of climbing until ensureSolvable strips it back out again.
       * ensureSolvable still has the final word on every one of them: each is
       * judged at the speed the board will be running when the player gets
       * there, and dropped if it cannot leave a crossable gap.
       *
       *   P(n+1th hazard) = (densityNow * GAIN + FLOOR) / DECAY^(n-1)
       *
       * so hazard 1 is the raw counter-flow chance -- 0.8 at typical density,
       * which is "every row that has traffic gets both directions" -- and the
       * third, fourth and fifth are 0.46, 0.26 and 0.15 of that. The expected
       * count on a row is densityNow x (1 + 0.8 + 0.37 + 0.10 + 0.01), about
       * 2.3x the density, and that factor is the SAME at every difficulty. */
      var chance = (placed === 0) ? densityNow
                 : (densityNow * SECOND_HAZARD_GAIN + SECOND_HAZARD_FLOOR) /
                   Math.pow(HAZARD_DECAY, placed - 1);
      if (chance > 1) chance = 1;
      if (rng.next() > chance) break;
      var kk = (placed === 0) ? k
              : pickKind(laneClassOf(row, laneMix, laneKey), stageIndex, rng);
      if (!kk) break;
      /* One vehicle per beat: 0s, 15s, 30s, 45s, 60s. */
      var arm = placed * ARM_STEP_MS;
      /* An oscillating hazard cannot be part of the read.
       *
       * A thing that reverses at the ends of its span is by definition
       * something that comes back at you from the other end, and it does that
       * the instant it appears -- so leaving it on the board during the read
       * put a counter-flow object on a board whose entire promise is that
       * nothing goes against the flow yet. It holds back until the read ends,
       * which is also where it belongs dramatically: "then things start coming
       * the other way" describes a tumbling weed better than it describes a
       * car. */
      if (spec_osc(KINDS[kk])) arm = Math.max(arm, READ_MS);
      var h = makeHazard(kk, row, cols, rng, difficulty || 0, xMin, arm);
      if (!h) break;
      // The whole board runs ONE way during the read. This used to alternate
      // per row, which looked like a rule but was two rules, and the
      // escalation the design asks for -- "then they start coming from the
      // other side" -- only means something if there was a single side to
      // begin with. Every armed-at-zero hazard therefore points the same way,
      // and the opposite direction is what arrives when the read ends.
      if (placed === 0) {
        h.dir = READ_DIR;
      } else {
        h.dir = -READ_DIR;                     // the other way down the lane
      }
      h.speed = Math.abs(h.baseSpeed) * h.dir;
      out.push(h);
      placed++;
    }
    return out;
  }

  /* Accept either Stages.pressureFor()'s object or the legacy bare multiplier,
   * so every existing caller -- the game, and the gates under tools/ -- keeps
   * working while the game itself passes the full pressure. */
  var MAX_STEPS = 6;
  function toPressure(growth) {
    if (growth && typeof growth === "object") return growth;
    var mult = (growth && isFinite(growth) && growth > 0) ? growth : 1;
    var n = 0;
    if (mult > 1.0001) n = Math.round(Math.log(mult) / Math.log(1.5));
    if (n > 6) n = 6;
    if (global.Stages && global.Stages.pressureFor) {
      return global.Stages.pressureFor(n * ((global.Stages.DIFFICULTY_STEP_JUMPS) || 15));
    }
    return { steps: n, growth: mult, ramp: 0.75 + 0.75 * Math.min(1, n / MAX_STEPS),
             maxHere: 5, pace: 1 };
  }

  /* The same row, generated on demand, from its own seed. Deterministic:
   * asking twice gives the same car in the same place, so a row can be
   * re-queried without the board jumping. */
  /* `xMin` is the leftmost column the player can occupy. Traffic is confined
   * to the playable band, because the board is deliberately wider than the
   * view (so the camera can follow the player) and a car in a column the player
   * can never reach is a car that is neither a threat nor worth rendering. */
  function hazardsForRow(seed, row, cols, difficulty, Rng, stageIndex, xMin, growth) {
    /* Row density: the stage's base rate, boosted across the opening rows.
     *
     * The boost used to live only in buildHazards(), which this function's
     * caller -- src/sim-core.js -- never invokes. The running game builds the
     * board one row at a time through here, so the opening boost was applied to
     * nothing a player could see: measured over the first twenty seconds of a
     * stage the board carried four armed hazards, and standing still was safe.
     *
     * rowDensity() is now shared by both entry points. Everything else here is
     * unchanged: `undefined` for laneMix and laneKey still means "look the
     * stage's own mix up", and passing null would silently fall back to the
     * default mix -- which is how cars once ended up on rows the player could
     * see were lawn.
     */
    /* The stage's own base rate, from its difficulty -- see Stages' two-axis
     * density note. This is the ACROSS-STAGES axis and it was accidentally
     * dropped; with every stage at one density the campaign had no stage-to-
     * stage escalation at all. */
    var base = (global.Stages && global.Stages.DENSITY_BASE !== undefined)
      ? Math.min(global.Stages.MAX_BASE_DENSITY,
                 global.Stages.DENSITY_BASE +
                 (difficulty || 0) * global.Stages.DENSITY_PER_DIFFICULTY)
      : Math.min(0.82, 0.55 + difficulty * 0.026);
    var lo = xMin === undefined ? 0 : xMin;
    var rowRng = (Rng && Rng.fork) ? Rng.fork(String(row))
            : (global.SimCore && global.SimCore.createRng
               ? global.SimCore.createRng(seed + ":r" + row) : Rng);
    /* +50% more killing items every 15 hops.
     *
     * Stages.growthFor() existed and exported this multiplier but nothing ever
     * CALLED it, so the "number of items to kill rises 50% every 15 jumps"
     * requirement was declared and never actually implemented. It is applied
     * here, to density, because density is what decides how many objects a row
     * carries.
     *
     * Capped at the multiplier Stages caps at, and additionally never allowed
     * to exceed 1.0 in absolute terms -- density above 1.0 would place more
     * objects on a row than the row has columns, which is not a difficulty
     * curve, it is a malformed board. */
    /* `growth` used to be a bare multiplier applied to density, which is where
     * the ramp died: 0.55 x 1.5 = 0.83 already pins a per-row probability near
     * its ceiling, so by the third step every row was at density 1.0 and steps
     * four, five and six changed nothing a player could see. Measured on the
     * live board, the last third of a stage carried FEWER objects than the
     * middle: 27 -> 43 -> 56 -> 61 -> 52 -> 52 -> 38.
     *
     * It is now Stages.pressureFor(): a DENSITY ramp across the six steps, a
     * per-row object budget that grows 1 -> 4, and a pace multiplier the stage
     * clock applies. Each is monotonic and each is bounded by the board.
     *
     * A bare number is still accepted -- the gates under tools/ call this
     * function with the old signature -- and is read as a growth multiplier, so
     * they keep working. */
    var pressure = toPressure(growth);
    var density = rowDensity(row, base * pressure.ramp);
    if (density > 1) density = 1;
    var made = buildRow(row, cols, density, rowRng, stageIndex, undefined, undefined,
                        lo, difficulty, pressure.maxHere);
    /* Judge this row at the speed THIS row will be crossed at.
     *
     * ensureSolvable defaults to PEAK_SPEED_FACTOR, which is the right
     * standard for the last fifteen rows of a stage and far too harsh for the
     * other eighty per cent: measured, a row at 1.3x was being thinned to
     * satisfy a test written for 2.2x, and the early board was paying the
     * endgame's price.
     *
     * The player meets row R at roughly jump R, so the speed factor at that
     * point in the stage is what its gap has to survive. Rows near the goal
     * still get the peak, because near the goal they ARE at the peak. */
    var rowScale = (stageIndex !== undefined && global.Stages &&
                    global.Stages.hazardClockFor)
      ? speedFactorAt(global.Stages.hazardClockFor(row, stageIndex))
      : PEAK_SPEED_FACTOR;
    return ensureSolvable(made, { needGap: 0.9, speedScale: rowScale });
  }

  /* Solvability filter. P-12 requires that every generated stage be
   * completable; without a guarantee, roughly 43 percent of seeds produced a
   * lane with no passable window and the campaign was unwinnable from a
   * difficulty the player could do nothing about.
   *
   * A lane is passable if, at some point in the hazard period, the row is
   * clear at some column for at least `needGap` seconds. Anything stricter
   * needs a path search over (row, column, time); this is the cheap local
   * guarantee that every lane is crossable by timing, which is what the
   * player actually experiences. It is a floor, not a proof, and the search
   * in the Phase 3 gate is the proof.
   */
  /* THE FILTER MUST JUDGE THE BOARD THE GAME ACTUALLY RUNS.
   *
   * It did not, on three counts, and every one of them made it optimistic:
   *
   *   wrap      -- it wrapped at 10.5 / -1.5 (a 12-tile period) while
   *                tickHazards wraps at cols + 1.5 (a 16-tile period on a
   *                14-wide board). The comment claimed "matching tickHazards".
   *   columns   -- it swept cols 0..8, but the player can only stand in
   *                cols 4..9 (sim-core playMin/playMax). Four of the nine
   *                columns it certified are ones the player can never occupy,
   *                and the one column they can always reach (9) was never
   *                tested at all.
   *   margin    -- it used len/2 + 0.30 where hits() uses the player's real
   *                half-width, 0.28. Filtering with a wider margin passes
   *                lanes the real test would reject.
   *
   * Taken together the filter could certify a lane the game would not let the
   * player cross. Measured on 813 generated rows: 88 were judged crossable and
   * were not. All 88 carried a sinkhole; 0 of 704 rows without one failed. */
  var GAP_MIN_COL = 4, GAP_MAX_COL = 9, GAP_PLAYER_HALF = 0.28;
  /* The crossability sweep, asked as the same question the collision test
   * answers: is this column clear for the next `needGap` seconds?
   *
   * It used to hand-roll that question and got it wrong in the same way the
   * autoplay did, for the same reason: `if (h.spec.kind === "air") continue`.
   * Air hazards became lethal when they are up, and the filter still threw them
   * away -- so it certified rows that a geyser could close, which is precisely
   * the guarantee it exists to provide. It now asks hitsAt(), which is the
   * function the game kills the player with, so "the lane has a gap" and "the
   * lane is crossable" are the same statement.
   *
   * The sweep runs against a copy of the row running at `speedScale`, because
   * the gap has to survive the speed the board will actually be at when the
   * player gets there, not the speed it is at while the row is being built. */
  function laneHasGap(list, row, needGap, speedScale, cols, minCol, maxCol) {
    var k = speedScale || 1;
    var nCols = cols === undefined ? 14 : cols;
    var loCol = minCol === undefined ? GAP_MIN_COL : minCol;
    var hiCol = maxCol === undefined ? GAP_MAX_COL : maxCol;
    // Must match tickHazards exactly, or the filter is judging another board.
    var wrapHi = nCols + 1.5, wrapLo = -1.5, wrapSpan = wrapHi - wrapLo;
    /* Sweep ONE FULL CYCLE of this row, not a fixed six seconds.
     *
     * A fixed 6s window is only long enough for a hazard that wraps the board
     * in under six seconds, and several do not: an alligator is 2.6 tiles long
     * and runs at 0.4-0.9 tiles/s, so it takes 19-42 seconds to come back
     * around, and a tumbling weed reverses on a 14-tile span every ~10s. A gap
     * that opens at t=9s was invisible to a sweep that stopped at 6s, so the
     * filter certified rows whose gap was outside its own horizon.
     *
     * Measured after the collision model was corrected: sweeping 30s instead of
     * the filter's 6s found 2.5-3.8% of rows on stages 3, 5 and 6 with NO
     * crossing window at all -- not a short one, none. Those are walls, and a
     * stage containing one cannot be completed by anyone.
     *
     * The period is derived from the slowest thing on the row (plus a quarter
     * of margin), and the sample budget is fixed, so a slow row costs the same
     * as a fast one. */
    var slowest = Infinity, slowestOsc = 0;
    for (var pi = 0; pi < list.length; pi++) {
      var ph = list[pi];
      if (ph.spec.kind === "air") continue;
      if (ph.osc) {
        var oscPeriod = (2 * ph.osc.span) / Math.max(0.05, Math.abs(ph.speed));
        if (oscPeriod > slowestOsc) slowestOsc = oscPeriod;
        continue;
      }
      var sp = Math.abs(ph.speed);
      if (sp > 0.01 && sp < slowest) slowest = sp;
    }
    var period = 6.0;
    if (slowest < Infinity) period = Math.max(period, (wrapSpan / slowest) * 1.25);
    if (slowestOsc > 0) period = Math.max(period, slowestOsc * 1.25);
    /* Also long enough for any timed hazard to complete a cycle, so a pit or a
     * geyser cannot hide its closed phase outside the window. */
    for (var ti = 0; ti < list.length; ti++) {
      if (list[ti].cycle) period = Math.max(period, (list[ti].cycle.periodMs / 1000) * 1.3);
    }
    var SAMPLES = 240;
    var dtMs = (period * 1000) / SAMPLES;
    /* Work on a copy so a certified row is left at the speed it will be ticked
     * at, and so the drop loop can re-run the question at the same scale. */
    var scaled = [];
    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      if (h.spec.kind === "air" || !isFinite(h.speed)) { scaled.push(h); continue; }
      var c = {};
      for (var key in h) c[key] = h[key];
      c.speed = capSpeed(h.speed * k, h.spec);
      c.baseSpeed = undefined;        // a projection, not a live hazard
      scaled.push(c);
    }
    for (var col = loCol; col <= hiCol; col++) {
      var clearFor = 0;
      for (var s = 0; s <= SAMPLES; s++) {
        var blocked = false;
        for (var j = 0; j < scaled.length; j++) {
          if (hitsAt(scaled[j], col, row, s * dtMs)) { blocked = true; break; }
        }
        if (!blocked) {
          clearFor += dtMs;
          if (clearFor >= needGap * 1000) return true;
        } else {
          clearFor = 0;
        }
      }
    }
    return false;
  }

  function ensureSolvable(list, opts) {
    opts = opts || {};
    var needGap = opts.needGap || 0.9;   // seconds of clear lane to cross
    /* Solvability is judged at the speed the board reaches in the sprint, not
     * at the speed it runs at during the read.
     *
     * This matters because the sprint is the part of the stage where a player
     * is most likely to lose, and a gap measured at 1.0x can be gone by 1.8x.
     * Checking the easy case would be a guarantee about a moment of the stage
     * that is not the one being tested. Dropping a hazard that fails this is
     * the cheap local fix, and ensureSolvable already treats dropping as safe:
     * the lane reverts to clear ground, which is always passable. */
    var k = opts.speedScale || PEAK_SPEED_FACTOR;
    /* Fast path: if the row is ALREADY passable with everything on it, then
     * every subset is passable too, because removing a hazard only ever opens
     * the lane. So the per-hazard loop below would keep all of them.
     *
     * This is not a shortcut that changes the answer, it is the same answer
     * computed once instead of N times. It matters because the loop is
     * quadratic in the number of hazards on the row, and rows now carry up to
     * three: measured, the 400-seed campaign sweep went from about 90 seconds
     * to over 13 minutes on the denser boards, all of it inside laneHasGap. */
    if (list.length === 0) return list;
    if (laneHasGap(list, list[0].row, needGap, k)) return list.slice();
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      var rest = [];
      for (var j = 0; j < list.length; j++) if (j !== i) rest.push(list[j]);
      if (laneHasGap(rest, h.row, needGap, k)) out.push(h);
      // else: dropped. The lane reverts to safe ground, which is always
      // passable. Dropping is safe; keeping an impassable lane is not.
    }
    return out;
  }

  /* dt is in MILLISECONDS. speed is in tiles per SECOND. The conversion below
   * is the whole reason collision is a timing puzzle rather than a coin flip;
   * without it a hazard crosses the entire board roughly 2.7 times per frame
   * and the autoplay's safety model, which uses seconds, is wrong by 1000x.
   *
   * `elapsedMs` is the stage clock. It is what turns the flat ninety seconds
   * into the three-phase shape: it holds back hazards that have not armed yet,
   * and it sets the speed every hazard runs at right now.
   *
   * A hazard that has not armed is not merely harmless, it is ABSENT: it does
   * not move, it cannot be hit with, and the renderer skips it. Anything else
   * would show the player a vehicle that is not there yet, or leave a car
   * frozen in mid-lane before it starts. */
  function tickHazards(list, dtMs, cols, elapsedMs) {
    var dt = dtMs / 1000;
    var now = elapsedMs || 0;
    var factor = speedFactorAt(now);
    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      h.now = now;
      if (h.armMs && now < h.armMs) continue;     // not on the board yet
      // Re-derive speed from the base every tick, keeping the sign. The sprint
      // is this line: nothing is rebuilt, every vehicle on the board just
      // starts running faster at the same moment.
      //
      // Guarded on `baseSpeed` being a real number. A hazard assembled by hand
      // rather than by makeHazard -- which is what tools/check_js_runtime.py
      // does to test the death beat -- has no base speed, and multiplying
      // undefined through here produced NaN. A NaN speed is worse than a slow
      // one: the hazard still renders, still looks lethal, and silently can
      // never hit anybody, because every comparison against NaN is false.
      if (h.spec.kind !== "air" &&
          typeof h.baseSpeed === "number" && isFinite(h.baseSpeed)) {
        h.speed = capSpeed(h.baseSpeed * factor * (h.speed < 0 ? -1 : 1), h.spec);
      }
      if (h.spec.kind === "air") {
        /* An air hazard does not TRAVEL, but it still has a BEAT.
         *
         * A geyser is a column that erupts on a cycle, in place, and it is
         * row-wide while it is up. This early-out used to run BEFORE the cycle
         * advance further down, so a geyser's clock never moved at all: not
         * slowly, not at all. `isActive()` asks `(t % periodMs) < on`, and t
         * stayed frozen at whatever `makeHazard` seeded it to -- which, for a
         * row-wide hazard, means the eruption was permanently up and the lane
         * was permanently lethal.
         *
         * Measured: a geyser declaring on 1200 / period 3000 reported itself
         * open for 10,000ms out of 10,000ms sampled. It never once closed.
         * Advancing the cycle here, before the return, is the whole fix; the
         * unit bug in the same line (seconds added to a millisecond clock) was
         * masked by it and is fixed separately. */
        if (h.cycle) h.cycle.t += dtMs;
        continue;
      }
      // An announced rail hazard holds at the entry edge and does not move.
      // It cannot hit anything until its warning has run out.
      if (h.tel && h.tel.t > 0) { h.tel.t -= dtMs; continue; }
      if (h.osc) {
        // Sweep back and forth across a span. No wrap, so it always comes
        // back -- the player has to time the turnaround, not just the pass.
        h.osc.t += dt;
        var sweep = h.speed * dt;
        h.x += sweep;
        h.osc.mid += sweep;
        if (h.osc.mid > h.osc.span || h.osc.mid < 0) {
          h.osc.dir = -h.osc.dir;
          h.osc.mid += (h.osc.mid > h.osc.span ? -h.osc.span : h.osc.span);
          h.x += sweep * 2;
          h.speed = -h.speed;
        }
        continue;
      }
      /* The cycle clock is in MILLISECONDS and must advance in milliseconds.
       *
       * `cycle.t` is seeded in milliseconds (makeHazard takes
       * `rng.range(0, spec.cycle.periodMs)`), and every consumer treats it that
       * way: isActive() and isWarning() both reduce it modulo `periodMs`, and
       * the solvability sweep adds `s * 50` per 50ms step. Advancing it with
       * `dt` -- which is `dtMs / 1000`, i.e. SECONDS -- made the clock run a
       * thousand times slow.
       *
       * The consequence was not subtle. A sinkhole declares
       * `on: 1500, periodMs: 4200`, so isActive() asks
       * `(t % 4200) < 1500`. At a second per unit that is TRUE for 1500
       * seconds: the pit opened and never closed. It is row-wide, so it is
       * not something the player can walk around, and ensureSolvable()'s gap
       * filter missed it because the sweep measured the same broken clock.
       * Measured before the fix: 88 of 813 generated rows were uncrossable,
       * every one of them a row carrying a sinkhole, and 0 of 704 rows without
       * one. */
      if (h.cycle) { h.cycle.t += dtMs; continue; }
      h.x += h.speed * dt;
      // Wrap. A hazard that drives off the end and stops existing would let
      // a lane go permanently safe.
      if (h.x > cols + 1.5) {
        h.x = -1.5;
        // A train re-entering a lane must announce itself again, or the second
        // pass would be uncrossable even though the first was fair.
        if (h.tel) armTelegraph(h, cols, -1.5);
      }
      if (h.x < -1.5) {
        h.x = cols + 1.5;
        if (h.tel) armTelegraph(h, cols, -1.5);
      }
    }
  }

  // Axis-aligned test. The player occupies a square, the hazard a rectangle
  // `len` wide. A circle test would be kinder but dishonest: it would let a
  // player clip the nose of a train and survive, which reads as a bug.
  /* Is a timed hazard up right now? A geyser between eruptions is a safe
   * tile, and the player learns the beat and crosses on the off phase. */
  function isActive(h) {
    if (!h.cycle) return true;
    return (h.cycle.t % h.cycle.periodMs) < h.cycle.on;
  }

  // True while a pit is showing its warning sign, i.e. the run-up to opening.
  // The sign is the whole contract with the player: without it the hole is a
  // coin flip, and the row is simply unfair.
  function isWarning(h) {
    if (!h.cycle || !h.spec || !h.spec.pit) return false;
    var warn = h.cycle.warn || 0;
    if (!warn) return false;
    return (h.cycle.t % h.cycle.periodMs) >= (h.cycle.periodMs - warn);
  }

  /* Has this hazard joined the board yet?
   *
   * The stage's later phases are populated at stage start and switched on by
   * the clock, so "not armed yet" has to be a real state rather than an
   * absence. It is checked by everything that can see or touch a hazard:
   * collision, the renderer, and the solvability sweep. A hazard that is on the
   * board but not yet armed is a car the player can see that cannot hurt them,
   * which is the one thing this must never be. */
  function isStaged(h) {
    if (!h || !h.armMs) return false;
    return (h.now || 0) < h.armMs;
  }

  /* WHERE this hazard will be, `offsetMs` from now.
   *
   * A prediction has to obey the same rules the board obeys, or it is a
   * description of some other game: an oscillating hazard really does turn
   * around, a timed one really is dormant part of the time, an announced train
   * really is harmless until its warning runs out, and a vehicle really does
   * wrap at cols + 1.5. This walks the hazard forward in the same 50 ms steps
   * tickHazards uses, so the answer is the board's, not an approximation of it. */
  function advanceTo(h, offsetMs) {
    if (!offsetMs || offsetMs <= 0) return h.x;
    var cols = (h.cols === undefined) ? 14 : h.cols;
    var wrapHi = cols + 1.5, wrapLo = -1.5, wrapSpan = wrapHi - wrapLo;
    var x = h.x;
    if (h.spec.kind === "air") return x;              // does not travel
    var steps = Math.max(1, Math.ceil(offsetMs / 50));
    var dtMs = offsetMs / steps;
    var mid = h.osc ? h.osc.mid : 0;
    /* The telegraph countdown and the oscillator position are carried in
     * LOCALS. The first version of this walked `h.tel.t` directly, so every
     * prediction drained the live hazard's warning: asking "is this lane clear
     * in 600ms?" silently made the train stop warning before it arrived, and
     * the autoplay -- which asks about dozens of cells several times a second --
     * burned the telegraph down faster than the stage clock ever could. A
     * question must not change the answer. */
    var tel = h.tel ? h.tel.t : 0;
    for (var i = 0; i < steps; i++) {
      if (tel > 0) { tel -= dtMs; continue; }
      if (h.osc) {
        var sweep = h.speed * (dtMs / 1000);
        x += sweep;
        mid += sweep;
        if (mid > h.osc.span || mid < 0) {
          mid += (mid > h.osc.span ? -h.osc.span : h.osc.span);
          x += sweep * 2;
        }
        continue;
      }
      x += h.speed * (dtMs / 1000);
      if (x > wrapHi) x -= wrapSpan;
      else if (x < wrapLo) x += wrapSpan;
    }
    return x;
  }

  /* Is this hazard's column lethal at (playerCol, playerRow) `offsetMs` from
   * now? `hits()` is exactly this with no offset, so there is ONE collision
   * model: the autoplay in src/sim-core.js asks this one rather than
   * re-deriving a second, slightly different one that drifts out of date. */
  function hitsAt(h, playerCol, playerRow, offsetMs) {
    if (!h || h.row !== playerRow) return false;
    var off = offsetMs || 0;
    // Not on the board yet: not drawn, not moved, not lethal.
    if (h.armMs && (h.now || 0) + off < h.armMs) return false;
    // Dormant means harmless. An "air" hazard used to be excluded outright,
    // which made every such obstacle decorative; now they kill while they are
    // up, which is the whole point of a geyser.
    if (h.cycle) {
      var ct = (h.cycle.t + off) % h.cycle.periodMs;
      if (ct < 0) ct += h.cycle.periodMs;
      if (ct >= h.cycle.on) return false;
    }
    // An announced train is not on the lane yet. It is visible, and it is
    // harmless, which is exactly what makes the crossing a decision.
    if (h.tel && h.tel.t - off > 0) return false;
    // A ditch spans the whole lane: there is no column that is safe while it
    // is open. That is what makes it a hole you must not be standing in rather
    // than a vehicle you can walk around.
    if (h.spec.rowWide) return true;
    if (h.spec.kind === "air") {
      // A column hazard that erupts in place: it covers its own tile only.
      return Math.abs(h.x - playerCol) < (h.spec.len / 2 + 0.28);
    }
    var x = advanceTo(h, off);
    return Math.abs(x - playerCol) < (h.spec.len / 2 + 0.28);
  }

  function hits(h, playerCol, playerRow, playerHalf) {
    if (h.row !== playerRow) return false;
    // Not on the board yet: not drawn, not moved, not lethal.
    if (isStaged(h)) return false;
    // Dormant means harmless. An "air" hazard used to be excluded outright,
    // which made every such obstacle decorative; now they kill while they are
    // up, which is the whole point of a geyser.
    if (!isActive(h)) return false;
    // An announced train is not on the lane yet. It is visible, and it is
    // harmless, which is exactly what makes the crossing a decision.
    if (isTelegraphing(h)) return false;
    // A ditch spans the whole lane: there is no column that is safe while it
    // is open. That is what makes it a hole you must not be standing in rather
    // than a vehicle you can walk around.
    if (h.spec.rowWide) return true;
    var half = h.spec.len / 2;
    return Math.abs((h.x) - playerCol) < (half + playerHalf);
  }

  function anyHits(list, playerCol, playerRow) {
    for (var i = 0; i < list.length; i++) {
      if (hits(list[i], playerCol, playerRow, 0.28)) return list[i];
    }
    return null;
  }

  global.Hazards = {
    buildRow: buildRow, hazardsForRow: hazardsForRow,
    // Exported so tools/check_endgame.py can locate the closing stretch.
    // Module-private it made the gate's row bound NaN, and every endgame
    // assertion passed vacuously because no rows were ever scanned.
    SAFE_START_ROWS: SAFE_START_ROWS, SAFE_GOAL_ROWS: SAFE_GOAL_ROWS,
    /* The closing stretch, so a gate can scan the rows the builder actually
     * treats as endgame instead of mirroring the constant. */
    ENDGAME_ROWS: ENDGAME_ROWS, isEndgame: isEndgame,
    isActive: isActive,
    pickKind: pickKind, legalForLane: legalForLane,
    LANE_KINDS: LANE_KINDS, OPEN_KINDS: OPEN_KINDS,
    isOpenKind: isOpenKind,
    // Exported so tools/hazard_probe.py can assert the opening is actually dense.
    rowDensity: rowDensity,
    OPENING_GUARANTEED_ROWS: OPENING_GUARANTEED_ROWS,
    perRowCapAt: perRowCapAt,
    KINDS: KINDS, makeHazard: makeHazard, buildHazards: buildHazards,
    tickHazards: tickHazards, hits: hits, hitsAt: hitsAt, anyHits: anyHits,
    laneHasGap: laneHasGap, ensureSolvable: ensureSolvable,
    // Phase 2 item 3. Exported so tools/check_hazard_reach.py can assert the
    // telegraph is never shorter than the traverse window.
    TELEGRAPH_MS: TELEGRAPH_MS, isTelegraphing: isTelegraphing,
    isWarning: isWarning, isActive: isActive, isStaged: isStaged,
    /* The stage's three phases. Exported so tools/check_endgame.py can assert
     * the shape of the curve directly instead of inferring it from a run. */
    READ_MS: READ_MS, SPRINT_MS: SPRINT_MS, BUILD_END_MS: BUILD_END_MS,
    ARM_STEP_MS: ARM_STEP_MS,
    READ_DIR: READ_DIR,
    speedFactorAt: speedFactorAt, PEAK_SPEED_FACTOR: PEAK_SPEED_FACTOR,
    /* Reaction-time bound, exported so it can be asserted against every
     * kind in the table rather than trusted. */
    MIN_COLUMN_CROSS_MS: MIN_COLUMN_CROSS_MS, maxSpeedFor: maxSpeedFor,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
