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
    // --- rail ------------------------------------------------------------
    train:     { len: 3.40, speed: [4.0, 6.0], kind: "rail" },
    tram:      { len: 2.20, speed: [2.0, 3.0], kind: "rail" },
    monorail:  { len: 2.80, speed: [3.0, 4.4], kind: "rail" },
    // --- water -----------------------------------------------------------
    log:       { len: 0.90, speed: [0.7, 1.3], kind: "water" },
    turtle:    { len: 0.62, speed: [0.3, 0.6], kind: "water" },
    alligator: { len: 2.20, speed: [0.5, 0.9], kind: "water" },
    crocodile: { len: 2.60, speed: [0.4, 0.8], kind: "water" },
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
      // Oscillating hazards reverse inside a span instead of wrapping off the
      // board, so they come back at you and cannot be counted on.
      osc: spec.osc ? { span: spec.osc.span, periodMs: spec.osc.periodMs,
                        t: 0, dir: 1, mid: 0 } : null,
      // Timed hazards are only lethal part of the time. `phase` staggers
      // them so two geysers in a row are not in lockstep.
      cycle: spec.cycle ? { on: spec.cycle.on, periodMs: spec.cycle.periodMs,
                            t: rng.range(0, spec.cycle.periodMs) } : null,
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
           "forklift", "roller", "tumbleweed", "limousine"],
    rail: ["train", "tram", "monorail"],
    water: ["log", "turtle", "snake", "alligator", "crocodile"],
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
    // The first declared kind is the stage's signature obstacle, so weight
    // toward the front of the list.
    var total = 0, j;
    for (j = 0; j < pool.length; j++) total += Math.max(1, pool.length - j);
    var r = rng.next() * total;
    for (j = 0; j < pool.length; j++) {
      r -= Math.max(1, pool.length - j);
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
    var k = pickKind(laneClassOf(row, laneMix, laneKey), stageIndex, rng);
    if (!k) return out;
    if (rng.next() > density) return out;
    var dirHint = ((row * 7) % 3) - 1;   // -1, 0, 1
    var h = makeHazard(k, row, cols, rng, difficulty || 0, xMin);
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
      if (h.x > cols + 1.5) h.x = -1.5;
      if (h.x < -1.5) h.x = cols + 1.5;
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

  function hits(h, playerCol, playerRow, playerHalf) {
    if (h.row !== playerRow) return false;
    // Dormant means harmless. An "air" hazard used to be excluded outright,
    // which made every such obstacle decorative; now they kill while they are
    // up, which is the whole point of a geyser.
    if (!isActive(h)) return false;
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
    isActive: isActive,
    pickKind: pickKind, legalForLane: legalForLane,
    LANE_KINDS: LANE_KINDS, OPEN_KINDS: OPEN_KINDS,
    KINDS: KINDS, makeHazard: makeHazard, buildHazards: buildHazards,
    tickHazards: tickHazards, hits: hits, anyHits: anyHits,
    laneHasGap: laneHasGap, ensureSolvable: ensureSolvable,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
