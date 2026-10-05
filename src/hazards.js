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
  var SAFE_START_ROWS = 3;
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
  var STAGE_DURATION_MS = 90000;
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
    // --- rail ------------------------------------------------------------
    train:     { len: 3.40, speed: [4.0, 6.0], kind: "rail" },
    tram:      { len: 2.20, speed: [2.0, 3.0], kind: "rail" },
    monorail:  { len: 2.80, speed: [3.0, 4.4], kind: "rail" },
    /* Two more rail kinds, for the same reason as the four above: three was
     * not a vocabulary, it was a sample. */
    freighttrain: { len: 3.60, speed: [3.2, 4.6], kind: "rail" },
    subway:    { len: 2.60, speed: [2.4, 3.4], kind: "rail" },
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
    boulder:   { len: 1.20, speed: [0.9, 1.5], kind: "ground" },
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
  };

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
      wobble: rng.range(0.5, 1.5),      // log drift phase
      dead: false,
    };
    if (h.tel) armTelegraph(h, cols, xMin);
    return h;
  }

  // One pass over a window of rows. Deterministic from a seed, so a run can
  // be replayed from its seed in a bug report.
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
    // 0.30 at the start, not 0.22: at 0.22 a player looking at eight lanes
    // saw about one car and the board read as empty. 0.30 is still the
    // gentlest stage and still leaves a readable gap in most lanes.
    var baseDensity = 0.30 + Math.min(0.30, difficulty * 0.030);

    // Lane class decides which hazards can appear, and only one is possible
    // per row, so a log can never share a row with a train. The class comes
    // from the SAME function the renderer draws with (Tiles.laneOf), keyed on
    // this stage's own laneMix. The previous `row % 10` switch was a second,
    // independent opinion about what a row was, which put cars and trains on
    // rows the renderer drew as lawn -- ground that looked safe and killed the
    // player, in all ten stages.
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
    var density = baseDensity;

    for (var r = 0; r < viewRows; r++) {
      var made = buildRow(row0 + r, cols, density, rng, stageIndex, laneMix, laneKey);
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
    var from = Math.ceil((goalRow - SAFE_GOAL_ROWS) * 0.62);
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
    road: ["car", "racecar", "taxi", "police", "truck", "bus", "tractor",
           "forklift", "roller", "tumbleweed", "limousine",
           "ambulance", "cementmixer", "motorbike", "golfcart"],
    rail: ["train", "tram", "monorail", "freighttrain", "subway"],
    water: ["log", "turtle", "snake", "alligator", "crocodile",
            "canoe", "duck", "swan", "icefloe", "sled"],
  };
  var OPEN_KINDS = ["geyser", "steamvent", "boulder"];

  function kindsForStage(stageIndex) {
    if (stageIndex === undefined || !global.Stages || !global.Stages.getStage) return null;
    var st = global.Stages.getStage(stageIndex);
    if (!st || !st.hazardKinds || !st.hazardKinds.length) return null;
    return st.hazardKinds;
  }

  /* A hazard kind this lane can legally carry, or null. */
  function legalForLane(kind, lane) {
    if (LANE_KINDS[lane] && LANE_KINDS[lane].indexOf(kind) >= 0) return kind;
    if (OPEN_KINDS.indexOf(kind) >= 0) return kind;   // legal on any lane
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
                   difficulty) {
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
    var goalRow = (global.Stages && global.Stages.GOAL_ROW_OFFSET) || 40;
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
    var progress = row / Math.max(1, goalRow - SAFE_GOAL_ROWS);
    var endgame = progress >= 0.62;

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
    var densityNow = density * (endgame ? 2.0 : 1);
    /* One vehicle joins on each fifteen-second beat of the stage, so a row can
     * hold five: one for the read, then one more at 15s, 30s, 45s and 60s.
     *
     * This is what turns the fifteen-second beat into a visible one rather
     * than a claim in a comment, and it is also what fills a board with enough
     * objects for a stage to show a ten-object vocabulary on a SINGLE
     * crossing: measured at three per row, stage one showed seven to nine
     * distinct kinds on one board and never ten. */
    var maxHere = 5;
    var placed = 0;
    for (var attempt = 0; attempt < 6 && placed < maxHere; attempt++) {
      /* How likely the NEXT hazard on this row is.
       *
       * Flatter than the old `density / (placed + 1)` halving, which meant the
       * second hazard appeared on only a handful of rows and "the other side
       * starts coming" was true of about four lanes out of twenty-five --
       * technically two-way and practically not. ensureSolvable is what
       * decides whether a row can afford each extra vehicle: they are all
       * judged against the SPRINT speed, so the ones that cannot leave a
       * crossable gap at sprint speed are dropped. */
      var chance = placed === 0 ? densityNow
                 : densityNow * (0.95 - 0.12 * placed);
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

  /* The same row, generated on demand, from its own seed. Deterministic:
   * asking twice gives the same car in the same place, so a row can be
   * re-queried without the board jumping. */
  /* `xMin` is the leftmost column the player can occupy. Traffic is confined
   * to the playable band, because the board is deliberately wider than the
   * view (so the camera can follow the player) and a car in a column the player
   * can never reach is a car that is neither a threat nor worth rendering. */
  function hazardsForRow(seed, row, cols, difficulty, Rng, stageIndex, xMin) {
    /* Row density, only modestly up: min(0.52, 0.25 + d*0.024).
     *
     * The +100% complexity does NOT come from cramming more rows. It comes
     * from three things elsewhere: a row now holds up to three hazards instead
     * of one, every stage declares roughly twice the object vocabulary it did,
     * and the closing stretch adds two-way traffic, a bird on every stage, and
     * sink holes.
     *
     * This coefficient was briefly lowered to 0.020 to chase the P-12 campaign
     * reachability number. That was treating a symptom: measurement over 400
     * seeds showed every single one of the 49 failing campaigns was killed by
     * the retry budget in simulateCampaign, not by lane density. The real fix is
     * in sim-core.js, so this is back at 0.024 and the per-attempt difficulty
     * the design asked for is intact. */
    var base = Math.min(0.30 + 0.22, 0.25 + difficulty * 0.024);
    var lo = xMin === undefined ? 0 : xMin;
    var rowRng = (Rng && Rng.fork) ? Rng.fork(String(row))
            : (global.SimCore && global.SimCore.createRng
               ? global.SimCore.createRng(seed + ":r" + row) : Rng);
    // `undefined`, NOT null: buildRow only looks the stage's laneMix up when
    // the argument is undefined. Passing null silently fell back to the
    // default mix, so the spawner thought River was mostly road and rail
    // while the renderer drew it as mostly water -- which is how cars ended
    // up on rows the player could see were lawn, all over again.
    var made = buildRow(row, cols, base, rowRng, stageIndex, undefined, undefined,
                        lo, difficulty);
    return ensureSolvable(made, { needGap: 0.9 });
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
  function laneHasGap(list, row, needGap, speedScale) {
    var period = 6.0;                 // seconds; long enough for a wrap cycle
    var k = speedScale || 1;
    for (var col = 0; col < 9; col++) {
      var clearFor = 0;
      for (var s = 0; s <= period * 20; s++) {
        var blocked = false;
        for (var i = 0; i < list.length; i++) {
          var h = list[i];
          if (h.row !== row) continue;
          if (h.spec.kind === "air") continue;
          // A train still inside its warning window occupies no lane, so it
          // cannot be the thing that closes the last crossing gap.
          if (isTelegraphing(h)) continue;
          // At peak speed every hazard in the row is armed, so the sweep below
          // is the sprint board. There is no phase in which a staged hazard is
          // the only thing standing between the player and the far side.
          //
          // A row-wide hazard -- a ditch -- is the case this used to get
          // wrong. `hits()` returns true for EVERY column while a pit is open,
          // but the sweep below measured it with its 0.92-tile length like any
          // other vehicle, concluded there was a gap nine columns wide, and
          // kept the row. The filter was therefore proving a lane crossable
          // that the game itself would not let you cross, which is the exact
          // shape of the "looks walkable, is lethal" defect. A pit blocks the
          // whole row, and only for as long as it is actually open.
          if (h.spec.rowWide) {
            var open = true;
            if (h.cycle) {
              open = ((h.cycle.t + s * 50) % h.cycle.periodMs) < h.cycle.on;
            }
            if (open) { blocked = true; break; }
            continue;
          }
          var x = h.x + h.speed * k * (s / 20);
          if (x > 10.5) x -= 12;      // wrap, matching tickHazards
          if (x < -1.5) x += 12;
          if (Math.abs(x - col) < (h.spec.len / 2 + 0.30)) { blocked = true; break; }
        }
        if (!blocked) {
          clearFor += 0.05;
          if (clearFor >= needGap) return true;
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
        h.speed = h.baseSpeed * factor * (h.speed < 0 ? -1 : 1);
      }
      if (h.spec.kind === "air") continue;          // steel is suspended
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
      if (h.cycle) { h.cycle.t += dt; continue; }
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
    SAFE_START_ROWS: 3, SAFE_GOAL_ROWS: SAFE_GOAL_ROWS,
    isActive: isActive,
    pickKind: pickKind, legalForLane: legalForLane,
    LANE_KINDS: LANE_KINDS, OPEN_KINDS: OPEN_KINDS,
    KINDS: KINDS, makeHazard: makeHazard, buildHazards: buildHazards,
    tickHazards: tickHazards, hits: hits, anyHits: anyHits,
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
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
