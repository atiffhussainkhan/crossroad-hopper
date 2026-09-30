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
  function makeHazard(kind, row, cols, rng, difficulty) {
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
      x: rng.range(-cols, cols),        // fractional column position
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
    var SAFE_START_ROWS = 3;
    var goalRow = (global.Stages && global.Stages.GOAL_ROW_OFFSET) || 40;
    var SAFE_GOAL_ROWS = 2;

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
      var row = row0 + r;
      // The aprons. Absolute rows, not window-relative: row0 is the camera
      // window and moves as the player advances.
      if (row < SAFE_START_ROWS) continue;
      if (row >= goalRow - SAFE_GOAL_ROWS) continue;
      var k = null;
      var lane = T ? T.laneOf(row, laneMix, laneKey) : "road";
      if (lane === "grass") continue;               // never spawn on open ground
      if (lane === "road") k = "car";
      else if (lane === "rail") k = "train";
      else if (lane === "water") k = (rng.bool() ? "log" : "turtle");
      if (!k || !KINDS[k]) continue;
      if (rng.next() > density) continue;
      var dirHint = ((row * 7) % 3) - 1;   // -1, 0, 1
      var h = makeHazard(k, row, cols, rng, difficulty);
      if (!h) continue;
      if (dirHint === 0) h.dir = 1;       // guarantee some direction variety
      h.speed = Math.abs(h.speed) * h.dir;
      out.push(h);
    }
    return out;
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
    KINDS: KINDS, makeHazard: makeHazard, buildHazards: buildHazards,
    tickHazards: tickHazards, hits: hits, anyHits: anyHits,
    laneHasGap: laneHasGap, ensureSolvable: ensureSolvable,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
