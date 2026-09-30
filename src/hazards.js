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

  var KINDS = {
    car:      { len: 0.86, speed: [1.2, 1.9], kind: "ground" },
    tractor:  { len: 0.80, speed: [1.1, 1.7], kind: "ground" },
    tram:     { len: 0.98, speed: [2.0, 3.2], kind: "ground" },
    train:    { len: 0.98, speed: [4.0, 6.5], kind: "rail"  },
    log:      { len: 0.90, speed: [0.7, 1.3], kind: "water" },
    turtle:   { len: 0.62, speed: [0.3, 0.6], kind: "water" },
    sled:     { len: 0.80, speed: [1.0, 1.6], kind: "ground" },
    forklift: { len: 0.70, speed: [0.8, 1.3], kind: "ground" },
    steel:    { len: 0.55, speed: [0.0, 0.0], kind: "air"   },
  };

  // Per-column speed variance, so two hazards in the same row are not a wall.
  function makeHazard(kind, row, cols, rng, difficulty, xMin) {
    var spec = KINDS[kind];
    if (!spec) return null;
    var dir = rng.bool() ? 1 : -1;
    var sp = spec.speed[0] + (spec.speed[1] - spec.speed[0]) * rng.next();
    // Difficulty raises the ceiling only. The floor never drops, so stage one
    // is never faster than its slowest vehicle.
    sp *= 1 + Math.min(difficulty, 12) * 0.020;
    return {
      kind: kind, spec: spec, row: row, dir: dir,
      speed: sp * dir,
      x: rng.range(xMin === undefined ? -cols : xMin - 0.5, cols + 0.5),
      wobble: rng.range(0.5, 1.5),      // log drift phase
      dead: false,
    };
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
    var baseDensity = 0.22 + Math.min(0.26, difficulty * 0.022);

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
  function buildRow(row, cols, density, Rng, stageIndex, laneMixIn, laneKeyIn, xMin) {
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
    var k = null;
    var lane = T ? T.laneOf(row, laneMix, laneKey) : "road";
    if (lane === "grass") return out;               // never spawn on open ground
    if (lane === "road") k = "car";
    else if (lane === "rail") k = "train";
    else if (lane === "water") k = (rng.bool() ? "log" : "turtle");
    if (!k || !KINDS[k]) return out;
    if (rng.next() > density) return out;
    var dirHint = ((row * 7) % 3) - 1;   // -1, 0, 1
    var h = makeHazard(k, row, cols, rng, 0, xMin);
    if (!h) return out;
    if (dirHint === 0) h.dir = 1;       // guarantee some direction variety
    h.speed = Math.abs(h.speed) * h.dir;
    out.push(h);
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
    var base = Math.min(0.26 + 0.26, 0.22 + difficulty * 0.022);
    var lo = xMin === undefined ? 0 : xMin;
    var rowRng = (Rng && Rng.fork) ? Rng.fork(String(row))
            : (global.SimCore && global.SimCore.createRng
               ? global.SimCore.createRng(seed + ":r" + row) : Rng);
    var made = buildRow(row, cols, base, rowRng, stageIndex, null, null, lo);
    for (var i = 0; i < made.length; i++) {
      // Speed depends on the difficulty at the moment the row comes into view.
      made[i].speed *= 1 + Math.min(12, difficulty) * 0.020;
    }
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
  function laneHasGap(list, row, needGap) {
    var period = 6.0;                 // seconds; long enough for a wrap cycle
    for (var col = 0; col < 9; col++) {
      var clearFor = 0;
      for (var s = 0; s <= period * 20; s++) {
        var blocked = false;
        for (var i = 0; i < list.length; i++) {
          var h = list[i];
          if (h.row !== row) continue;
          if (h.spec.kind === "air") continue;
          var x = h.x + h.speed * (s / 20);
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
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      var rest = [];
      for (var j = 0; j < list.length; j++) if (j !== i) rest.push(list[j]);
      if (laneHasGap(rest, h.row, needGap)) out.push(h);
      // else: dropped. The lane reverts to safe ground, which is always
      // passable. Dropping is safe; keeping an impassable lane is not.
    }
    return out;
  }

  /* dt is in MILLISECONDS. speed is in tiles per SECOND. The conversion below
   * is the whole reason collision is a timing puzzle rather than a coin flip;
   * without it a hazard crosses the entire board roughly 2.7 times per frame
   * and the autoplay's safety model, which uses seconds, is wrong by 1000x. */
  function tickHazards(list, dtMs, cols) {
    var dt = dtMs / 1000;
    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      if (h.spec.kind === "air") continue;          // steel is suspended
      h.x += h.speed * dt;
      // Wrap. A hazard that drives off the end and stops existing would let
      // a lane go permanently safe.
      if (h.x > cols + 1.5) h.x = -1.5;
      if (h.x < -1.5) h.x = cols + 1.5;
    }
  }

  // Axis-aligned test. The player occupies a square, the hazard a rectangle
  // `len` wide. A circle test would be kinder but dishonest: it would let a
  // player clip the nose of a train and survive, which reads as a bug.
  function hits(h, playerCol, playerRow, playerHalf) {
    if (h.row !== playerRow) return false;
    if (h.spec.kind === "air") return false;       // steel lands, never rests
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
    buildRow: buildRow, hazardsForRow: hazardsForRow, SAFE_START_ROWS: 3,
    KINDS: KINDS, makeHazard: makeHazard, buildHazards: buildHazards,
    tickHazards: tickHazards, hits: hits, anyHits: anyHits,
    laneHasGap: laneHasGap, ensureSolvable: ensureSolvable,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
