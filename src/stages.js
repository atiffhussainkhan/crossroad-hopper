/* src/stages.js — the ten stages, as data.
 *
 * Per requirement CP-01: content lives in data, not code. Adding a stage is a
 * row in this table, not a new file. Every field is validated by
 * tools/check_content_schema.py.
 *
 * Scene is a *palette and scenery recipe*, not an asset bundle. Everything is
 * drawn by code from these values, so ten scenes cost one table.
 *
 * Per the stage design:
 *   - A stage is cleared by reaching the goal row: GOAL_ROW_OFFSET forward
 *     hops. That is 90 jumps, which at JUMP_INTERVAL_MS is over two minutes of
 *     real play.
 *   - The clock is a safety net, NOT the target. Difficulty is driven by how
 *     far the player has HOPPED, never by the wall clock, so a player who
 *     judges a gap for four seconds is not punished for it.
 *   - Difficulty steps every DIFFICULTY_STEP_JUMPS hops.
 *   - Every step multiplies threat by GROWTH_PER_STEP (50% more killing items
 *     and a faster board).
 *   - Stage N has a higher baseline than stage 1, so the campaign ramps
 *     across stages AND within each stage.
 */

(function (global) {
  "use strict";

  var STAGE_DURATION_MS = 180000;   // 3 min safety net; the goal row is the real end
  /* How much stage time one forward hop is worth.
   *
   * The whole difficulty system is time-shaped (speedFactorAt, telegraph
   * windows, the build/sprint curve). Rather than rewrite all of it to count
   * hops, the sim feeds it a HOP-DERIVED clock: 90 hops x 1400ms = 126s, which
   * is over two minutes of play and lands exactly on the goal row.
   *
   * This is why difficulty now tracks progress rather than patience. */
  var JUMP_INTERVAL_MS = 1400;
  var DIFFICULTY_STEP_JUMPS = 15;   // a step every 15 forward hops
  var GOAL_ROW_OFFSET = 90;         // 90 forward hops to clear a stage
  var GOAL_STEPS = GOAL_ROW_OFFSET / DIFFICULTY_STEP_JUMPS;   // 6 steps per stage
  var STAGE_START_LIVES = 4;        // per player, per stage

  /* +50% per step, capped after two steps (so the board peaks at 2.25x).
   *
   * Uncapped, six steps is 1.5^6 = 11.4x. That is not a difficulty curve, it
   * is a wall, and it is measured, not theoretical: with growth running to
   * 5.06x the competent autoplay cleared 6 stages across 25 full campaigns and
   * never once finished one. The request was for 50% more killing items every
   * 15 hops; honouring it for the first 30 hops and then holding keeps the
   * shape the player feels while leaving the last two thirds of the crossing
   * something a careful player can still read and survive. */
  var GROWTH_PER_STEP = 1.5;
  var MAX_GROWTH_STEPS = 6;   // every one of a stage's six steps now bites

  /* WHAT THE +50% SPEC CAN AND CANNOT BUY ON A SIX-COLUMN BOARD.
   *
   * The request is "50% more killing items every 15 hops", six times over.
   * Taken literally that is 1.5^6 = 11.4 objects on a row. The player moves
   * within SIX columns (createGame pins them to playMin..playMax and the rest
   * of the 14-wide board is camera margin). Eleven objects on six columns is
   * not a difficulty curve, it is a row with no gaps in it: every column
   * permanently occupied, and a stage that cannot be finished by anyone.
   *
   * So the multiplier is not applied to a quantity that saturates. It is spent
   * across the three channels a six-column board actually has, each monotonic
   * in the step index and each bounded by something real:
   *
   *   DENSITY   how likely a hazardous row carries its first object at all.
   *             Ramped across the six steps rather than multiplied, because
   *             0.34 * 1.5 = 0.51 already pins a probability near its ceiling:
   *             multiplying a probability by 1.5 six times saturates on step
   *             one and steps two through six are decorative. Normalising the
   *             same 1.5^n shape onto [DENSITY_AT_STEP_0, DENSITY_AT_STEP_MAX]
   *             keeps the shape the player feels and makes every step bite.
   *
   *   OBJECTS   how many vehicles a row may carry. This one is deliberately
   *             NOT ramped with the step, and the reason is worth recording:
   *             capping a row at 1 + step objects sounds like the literal
   *             reading of "more killing items", but the per-row budget is
   *             also the stage's phase design. A row builds up to five
   *             vehicles and ARMS them one per fifteen-second beat, and the
   *             read -- "one direction, one vehicle, then the other side
   *             joins" -- only exists if the row is *capable* of holding the
   *             second and third. Ramping the cap to 1 at step zero deleted
   *             that: measured, every stage lost its 15s and 30s beats and no
   *             stage carried the 45s or 60s beat at all, and check_phases.py
   *             reported the loss directly. How many of those five have ARMED
   *             by the time the player arrives already rises with density and
   *             with pace, so the ramp is not lost -- it is spent on the
   *             channels that were actually saturated.
   *
   *   PACE      how far through the stage's speed curve the board has run. A
   *             faster board is more pressure per object, which is precisely
   *             the escape from the column limit -- and it is bounded from
   *             above by hazards.js's reaction-time cap, so it cannot outrun
   *             what a player is able to see and answer.
   */
  /* Density is TWO-AXIS, and both axes have to be live.
   *
   * ACROSS STAGES: the base rate rises with the stage's own difficulty, which
   * is what makes stage 10 read differently from stage 1 rather than merely
   * being longer. (It was dropped once while the growth ramp was being rebuilt
   * -- hazardsForRow stopped consulting its `difficulty` argument altogether,
   * every stage came out at the same density, and check_endgame.py reported
   * "two-way traffic does not rise with the stage clock".)
   *
   * WITHIN A STAGE: the growth steps scale that base by RAMP_MIN..RAMP_MAX.
   * A multiplier, not an addition, so the ramp composes with the stage ladder
   * instead of replacing it.
   */
  var DENSITY_BASE = 0.500;          // stage 1, step 0, before the ramp
  var DENSITY_PER_DIFFICULTY = 0.012;
  var MAX_BASE_DENSITY = 0.80;
  var RAMP_MIN = 0.75;               // step 0
  var RAMP_MAX = 1.00;               // step 6
  var MAX_HAZARDS_PER_ROW = 5;   // the stage's five-beat capability, not a difficulty knob
  var PACE_PER_STEP = 0.05;   // the board runs 30% faster by the sixth step

  /* Threat multiplier for a given number of hops taken this stage. */
  function growthFor(jumpsDone) {
    var steps = Math.floor((jumpsDone || 0) / DIFFICULTY_STEP_JUMPS);
    if (steps > MAX_GROWTH_STEPS) steps = MAX_GROWTH_STEPS;
    return Math.pow(GROWTH_PER_STEP, steps);
  }

  /* Row density at a given point in the stage: the 1.5^n curve, renormalised
   * onto a range a probability can actually occupy. Monotonic by construction
   * -- growthFor is monotonic in n and the map from n to density is linear. */
  function rampFor(jumpsDone) {
    var n = stepFor(jumpsDone);
    if (n > MAX_GROWTH_STEPS) n = MAX_GROWTH_STEPS;
    var g = Math.pow(GROWTH_PER_STEP, n) - 1;
    var gMax = Math.pow(GROWTH_PER_STEP, MAX_GROWTH_STEPS) - 1;
    return RAMP_MIN + (RAMP_MAX - RAMP_MIN) * (g / gMax);
  }

  /* Everything the board needs to know about how pressed it is, for one point
   * in a stage. This is the object src/hazards.js consumes. */
  function pressureFor(jumpsDone) {
    var n = stepFor(jumpsDone);
    if (n > MAX_GROWTH_STEPS) n = MAX_GROWTH_STEPS;
    return {
      steps: n,
      growth: Math.pow(GROWTH_PER_STEP, n),
      ramp: rampFor(jumpsDone),
      maxHere: MAX_HAZARDS_PER_ROW,
      pace: 1 + n * PACE_PER_STEP,
    };
  }

  /* Difficulty step index, 0-based. Drives the integer difficulty ladder. */
  function stepFor(jumpsDone) {
    return Math.floor((jumpsDone || 0) / DIFFICULTY_STEP_JUMPS);
  }

  /* The hop-derived stage clock every time-shaped system reads. */
  /* stageIndex is optional: without it this is the stage-1 span. */
  function clockFor(jumpsDone, stageIndex) {
    return (jumpsDone || 0) * JUMP_INTERVAL_MS;
  }

  /* THE BOARD'S CLOCK, which is not the same thing as clockFor().
   *
   * clockFor() is progress in milliseconds, and it exists so the difficulty
   * ladder can count HOPS (difficultyFor divides it back out by
   * JUMP_INTERVAL_MS). It is linear and unbounded, which is right for "how far
   * have I come".
   *
   * It is wrong for the hazards' three-phase shape. That shape is measured
   * against STAGES_CLOCK_MS -- the span of stage one, 90 hops x 1400ms = 126s --
   * and hazards.js reads it as "where am I in this stage". With stages running
   * 90, 108 ... 464 hops, that reading saturates: on stage ten the board hit its
   * sprint speed at hop 90 and then ran the remaining 374 rows pinned at the
   * peak, and the fifteen-second beat that adds a vehicle per lane fired its
   * five beats in the first 75 hops of a 464-hop crossing.
   *
   * So the board gets its own clock: the same 126s span, spread over however
   * many hops THIS stage has. Read, build and sprint now occupy the same
   * fraction of every stage, the ramp is monotonic from the first row to the
   * last, and the sprint is the last ENDGAME_ROWS rows of the stage the player
   * is actually crossing rather than a plateau in the middle of it.
   *
   * Linear in hops and clamped to the stage, so it is still a pure function of
   * progress: the player cannot farm speed by stalling, and cannot outrun the
   * ramp by sprinting. */
  function hazardClockFor(jumpsDone, stageIndex) {
    var goal = jumpsFor(stageIndex);
    if (!goal) return 0;
    var p = (jumpsDone || 0) / goal;
    if (!(p > 0)) return 0;
    /* PACE: the board also runs further through its own phase curve as the
     * growth steps accumulate, so a step buys speed rather than another
     * object. Clamped to the end of the curve, which is the whole point --
     * the ramp saturates at "as fast as a player can read", not at "off the
     * edge". */
    var t = p * (1 + stepFor(jumpsDone) * PACE_PER_STEP);
    return (t >= 1) ? STAGES_CLOCK_MS : t * STAGES_CLOCK_MS;
  }

  /* The wall-clock safety net for a stage, in ms.
   *
   * The goal row is the real end of a stage; this is the backstop for a player
   * who never makes it. It used to be one flat STAGE_DURATION_MS for all ten
   * stages, which was calibrated when a stage was 40 rows and is far too short
   * for a 464-row one: at a patient 1.4s a hop, stage ten needs 650s and the
   * net killed it at 180s with no traffic involved at all.
   *
   * It scales with the stage, and it never falls below STAGE_DURATION_MS so
   * stage one -- and everything calibrated against it -- is untouched. */
  var STAGE_HOP_ALLOWANCE_MS = 3000;   // generous: this is a backstop, not a target
  var STAGE_START_GRACE_MS = 60000;
  function durationFor(stageIndex) {
    var byLength = jumpsFor(stageIndex) * STAGE_HOP_ALLOWANCE_MS + STAGE_START_GRACE_MS;
    return (byLength > STAGE_DURATION_MS) ? byLength : STAGE_DURATION_MS;
  }

  /* Scene palettes. Each is a set of hex colours used by the renderer.
   * `ground` and `groundAlt` alternate per row to make lanes readable
   * (requirement M-08: hitboxes must be judgeable). */
  var STAGES = [
      { id: 1, jumps: 90, laneMix: [0.60,0,0], name: "Suburb", baseline: 0, ground: "#7ba05b", groundAlt: "#6f9450", road: "#4a4a52", water: "#3f7fb5", hazard: "#ff4d3d", hazard2: "#f2a03d", foliage: "#3f8a3d", foliage2: "#57a84f", trunk: "#7a5433", log: "#ffffff", turtle: "#4a7a3a", hazardKinds:["car","taxi","police","ambulance","bus","truck","limousine","motorbike","golfcart","tractor","forklift","roller","tumbleweed","cementmixer","racecar","cannon","turret","cannonmobile","ballista","siegeram","ufoa","geyser","horse"], scenery: ["hedge","tree","mailbox","bush","flowerbed","fence"] },
      { id: 2, jumps: 108, laneMix: [0,0,0.56], name: "River", baseline: 0, ground: "#3f7fb5", groundAlt: "#37719f", road: "#4a4a52", water: "#2f6f9f", hazard: "#ff4d3d", hazard2: "#8a5a2b", foliage: "#2f6b40", foliage2: "#438a52", trunk: "#6b4a2b", log: "#ffffff", turtle: "#4a7a3a", hazardKinds:["log","turtle","snake","alligator","crocodile","canoe","duck","swan","icefloe","sled","ufob","speedercraft","racercraft","steamvent","ufoa","turret","geyser","horse","cannon","golfcart","trebuchet"], scenery: ["reed","lily","rock","lily","reed"] },
      { id: 3, jumps: 130, laneMix: [0.56,0,0], name: "Desert", baseline: 1, ground: "#d9b168", groundAlt: "#cfa45c", road: "#5a5048", water: "#3f7fb5", hazard: "#ff4d3d", hazard2: "#a89a3a", foliage: "#5f8a3f", foliage2: "#7aa84f", trunk: "#8a6a3a", log: "#ffffff", turtle: "#4a7a3a", hazardKinds:["car","taxi","bus","truck","limousine","motorbike","golfcart","racecar","tractor","cementmixer","tumbleweed","roller","forklift","trebuchet","catapult","ballista","siegeram","cannon","turret","cannonmobile","ufoa","horse"], scenery: ["cactus","rock","bone","boulder"] },
      { id: 4, jumps: 156, laneMix: [0.50,0.14,0], name: "Farmland", baseline: 1, ground: "#d9d264", groundAlt: "#cbbc58", road: "#54585e", water: "#3f7fb5", hazard: "#ff4d3d", hazard2: "#e8b53d", foliage: "#4a7a3a", foliage2: "#5f9c48", trunk: "#7a5433", log: "#ffffff", turtle: "#4a7a3a", hazardKinds:["tractor","car","truck","bus","limousine","motorbike","golfcart","cementmixer","forklift","roller","horse","siegeram","ballista","cannon","turret","cannonmobile","catapult","trebuchet","racecar","tumbleweed","ufoa","ambulance","police"], scenery: ["haybale","fence","tree","windmill"] },
      { id: 5, jumps: 187, laneMix: [0.50,0.20,0], name: "Night City", baseline: 2, ground: "#2b3040", groundAlt: "#262b39", road: "#1e222c", water: "#26405e", hazard: "#ff4d3d", hazard2: "#4ad9ff", foliage: "#2a3a4a", foliage2: "#365068", trunk: "#2a2f38", log: "#ffffff", turtle: "#4a7a3a", hazardKinds:["taxi","police","bus","car","truck","limousine","motorbike","golfcart","racecar","ambulance","tractor","cementmixer","forklift","roller","ufoa","ufob","ufoc","ufod","speedercraft","turretdouble","cannonmobile","geyser"], scenery: ["neon","building","streetlamp","hydrant","postbox"] },
      { id: 6, jumps: 224, laneMix: [0,0,0.56], name: "Frozen Lake", baseline: 2, ground: "#c8e4f0", groundAlt: "#bcd9e8", road: "#262b33", water: "#5aa0c0", hazard: "#ff4d3d", hazard2: "#6b4a8a", foliage: "#3d6b5a", foliage2: "#4f8570", trunk: "#5a4636", log: "#ffffff", turtle: "#4a7a3a", hazardKinds:["sled","turtle","log","crocodile","alligator","icefloe","swan","duck","canoe","horse","ufob","speedercraft","racercraft","turret","cannon","steamvent","ufoa","golfcart","bus","trebuchet","roller"], scenery: ["pine","iceberg","pine","rock"] },
      { id: 7, jumps: 269, laneMix: [0.20,0,0.46], name: "Rainforest", baseline: 3, ground: "#3f7a4a", groundAlt: "#387044", road: "#4a4438", water: "#2f6f8a", hazard: "#ff4d3d", hazard2: "#7ac94f", foliage: "#24522f", foliage2: "#357a42", trunk: "#5a4028", log: "#ffffff", turtle: "#4a7a3a", hazardKinds:["log","snake","crocodile","alligator","canoe","duck","ufoa","ufob","ufoc","ufod","speedercraft","racercraft","tractor","car","turret","cannon","trebuchet","geyser","steamvent","tumbleweed"], scenery: ["vine","fern","tree","bush"] },
      { id: 8, jumps: 322, laneMix: [0.52,0.16,0], name: "Construction", baseline: 3, ground: "#9aa0a8", groundAlt: "#8f959d", road: "#6b7078", water: "#4a6a8a", hazard: "#ff4d3d", hazard2: "#e05c4b", foliage: "#7a8a4a", foliage2: "#8fa85a", trunk: "#8a6a3a", log: "#ffffff", turtle: "#4a7a3a", hazardKinds:["forklift","roller","truck","tractor","cementmixer","golfcart","bus","car","catapult","ballista","trebuchet","siegeram","cannon","cannonmobile","turret","turretdouble","racecar","ufoa","motorbike","limousine","horse","ambulance","police"], scenery: ["scaffold","cone","crate","pylon"] },
      { id: 9, jumps: 387, laneMix: [0.44,0.22,0], name: "Storm", baseline: 4, ground: "#4a5560", groundAlt: "#434d57", road: "#333a44", water: "#38566b", hazard: "#ff4d3d", hazard2: "#7ac9e8", foliage: "#2f3742", foliage2: "#3d4a58", trunk: "#33383f", log: "#ffffff", turtle: "#4a7a3a", hazardKinds:["car","police","bus","truck","limousine","motorbike","taxi","racecar","tumbleweed","cannon","turretdouble","cannonmobile","ufoa","ufob","ufoc","ufod","speedercraft","racercraft","steamvent","ambulance"], scenery: ["pylon","puddle","pylon","debris"] },
      { id: 10, jumps: 464, laneMix: [0.26,0.18,0.28], name: "Volcano", baseline: 4, ground: "#5a3a34", groundAlt: "#52342e", road: "#3a2a26", water: "#8a3a1a", hazard: "#ff4d3d", hazard2: "#ffd23d", foliage: "#2a1a18", foliage2: "#3f2622", trunk: "#3a2a26", log: "#ffffff", turtle: "#4a7a3a", hazardKinds:["bus","steamvent","geyser","truck","roller","motorbike","cementmixer","trebuchet","catapult","ballista","siegeram","cannon","cannonmobile","turret","racecar","limousine","ufoa","tumbleweed","ambulance","forklift"], scenery: ["lavaVent","obsidian","boulder","debris"] },
  ];

  /* Difficulty is two-dimensional, and both axes now count HOPS:
   *     difficulty = stage.baseline + floor(jumpsDone / DIFFICULTY_STEP_JUMPS)
   * A 90-hop stage therefore yields 6 steps (0,15,30,45,60,75 hops).
   * Stage baselines 0..4 give a 40-step campaign ladder.
   *
   * `clockMs` is the hop-derived clock (see JUMP_INTERVAL_MS), so callers pass
   * Stages.clockFor(jumpsDone) rather than wall time. */
  function difficultyFor(stageIndex, clockMs) {
    var stage = STAGES[stageIndex];
    if (!stage) return 0;
    var jumpsDone = Math.floor((clockMs || 0) / JUMP_INTERVAL_MS);
    return stage.baseline + stepFor(jumpsDone);
  }

  /* The span of the hop-derived clock over one stage: what every time-shaped
   * system (the speed curve, telegraph windows) is measured against. Distinct
   * from STAGE_DURATION_MS, which is the wall-clock safety net. */
  /* Jump requirement for a stage: 90 on stage one, 20% more on each stage
   * after it. Stages carry their own `jumps`; this is the base and the fallback
   * for anything that asks before the stage table is available. */
  function jumpsFor(stageIndex) {
    var stage = STAGES[stageIndex];
    return (stage && stage.jumps) || GOAL_ROW_OFFSET;
  }

  /* The hop clock spans whichever stage is being played. */
  var STAGES_CLOCK_MS = GOAL_ROW_OFFSET * JUMP_INTERVAL_MS;
  function clockMsFor(stageIndex) {
    return jumpsFor(stageIndex) * JUMP_INTERVAL_MS;
  }

  function stageCount() { return STAGES.length; }

  function getStage(index) { return STAGES[index] || null; }

  global.Stages = {
    STAGE_DURATION_MS: STAGE_DURATION_MS,
    STAGES_CLOCK_MS: STAGES_CLOCK_MS,
    JUMP_INTERVAL_MS: JUMP_INTERVAL_MS,
    DIFFICULTY_STEP_JUMPS: DIFFICULTY_STEP_JUMPS,
    DIFFICULTY_STEP_MS: DIFFICULTY_STEP_JUMPS * JUMP_INTERVAL_MS,
    GROWTH_PER_STEP: GROWTH_PER_STEP,
    MAX_GROWTH_STEPS: MAX_GROWTH_STEPS,
    GOAL_STEPS: GOAL_STEPS,
    STAGE_START_LIVES: STAGE_START_LIVES,
    GOAL_ROW_OFFSET: GOAL_ROW_OFFSET,
    STAGES: STAGES,
    jumpsFor: jumpsFor,
    clockMsFor: clockMsFor,
    growthFor: growthFor,
    rampFor: rampFor,
    DENSITY_BASE: DENSITY_BASE,
    DENSITY_PER_DIFFICULTY: DENSITY_PER_DIFFICULTY,
    MAX_BASE_DENSITY: MAX_BASE_DENSITY,
    pressureFor: pressureFor,
    MAX_HAZARDS_PER_ROW: MAX_HAZARDS_PER_ROW,
    RAMP_MIN: RAMP_MIN,
    RAMP_MAX: RAMP_MAX,
    PACE_PER_STEP: PACE_PER_STEP,
    stepFor: stepFor,
    clockFor: clockFor,
    hazardClockFor: hazardClockFor,
    durationFor: durationFor,
    STAGE_HOP_ALLOWANCE_MS: STAGE_HOP_ALLOWANCE_MS,
    STAGE_START_GRACE_MS: STAGE_START_GRACE_MS,
    difficultyFor: difficultyFor,
    stageCount: stageCount,
    getStage: getStage,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
