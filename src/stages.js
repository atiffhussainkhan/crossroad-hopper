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
 *   - A stage is won by reaching the goal row before the clock expires.
 *   - The clock is STAGE_DURATION_MS.
 *   - Difficulty steps every DIFFICULTY_STEP_MS.
 *   - Stage N has a higher baseline than stage 1, so the campaign ramps
 *     across stages AND within each stage.
 */

(function (global) {
  "use strict";

  var STAGE_DURATION_MS = 90000;   // 90s per stage
  var DIFFICULTY_STEP_MS = 15000;  // difficulty steps at 15/30/45/60/75s
  var STAGE_START_LIVES = 4;       // per player, per stage
  var GOAL_ROW_OFFSET = 40;        // rows ahead of start to reach the goal

  /* Scene palettes. Each is a set of hex colours used by the renderer.
   * `ground` and `groundAlt` alternate per row to make lanes readable
   * (requirement M-08: hitboxes must be judgeable). */
  var STAGES = [
    {
      id: 1, name: "Suburb", turtle: "#d5e8cf", log: "#f0e0d1", scene: "suburb", baseline: 0,
      ground: "#7ba05b", groundAlt: "#6f9450", seam: "#5d7d42",
      scenery: ["tree", "hedge", "mailbox"], sceneryDensity: 0.22,
      hazardKinds: ["car"], laneMix: [1, 0, 0],   // road / rail / water weights
    },
    {
      id: 2, name: "River", turtle: "#b3d5a8", log: "#e4c6a9", scene: "river", baseline: 0,
      ground: "#3f7fb5", groundAlt: "#37719f", seam: "#2d5c85",
      scenery: ["reed", "rock"], sceneryDensity: 0.12,
      hazardKinds: ["log", "turtle"], laneMix: [0.2, 0, 0.8],
    },
    {
      id: 3, name: "Desert", turtle: "#d5e8cf", log: "#f0e0d1", scene: "desert", baseline: 1,
      ground: "#d9b168", groundAlt: "#cfa45c", seam: "#b98c4a",
      scenery: ["cactus", "rock", "bone"], sceneryDensity: 0.14,
      hazardKinds: ["car", "tumbleweed"], laneMix: [0.8, 0, 0.2],
    },
    {
      id: 4, name: "Farmland", turtle: "#d5e8cf", log: "#f0e0d1", scene: "farm", baseline: 1,
      ground: "#a8bf5e", groundAlt: "#9bb254", seam: "#869a46",
      scenery: ["haybale", "fence", "tree"], sceneryDensity: 0.24,
      hazardKinds: ["tractor", "car"], laneMix: [0.9, 0.1, 0],
    },
    {
      id: 5, name: "Night City", turtle: "#609f4b", log: "#c38140", scene: "night", baseline: 2,
      ground: "#2b2f3a", groundAlt: "#262a34", seam: "#1d2028",
      scenery: ["neon", "building"], sceneryDensity: 0.3,
      hazardKinds: ["car", "tram"], laneMix: [0.85, 0.15, 0],
    },
    {
      id: 6, name: "Frozen Lake", turtle: "#3f6932", log: "#855629", scene: "ice", baseline: 2,
      ground: "#b8d8e8", groundAlt: "#aecfe0", seam: "#9cbdd0",
      scenery: ["pine", "iceberg"], sceneryDensity: 0.1,
      hazardKinds: ["crack", "sled"], laneMix: [0.3, 0, 0.7],
    },
    {
      id: 7, name: "Rainforest", turtle: "#aed2a1", log: "#e2c2a2", scene: "jungle", baseline: 3,
      ground: "#3f7a4a", groundAlt: "#387044", seam: "#2d5c38",
      scenery: ["vine", "fern", "tree"], sceneryDensity: 0.4,
      hazardKinds: ["log", "animal", "car"], laneMix: [0.4, 0, 0.6],
    },
    {
      id: 8, name: "Construction", turtle: "#acd19f", log: "#e2c2a2", scene: "construction", baseline: 3,
      ground: "#8a8f96", groundAlt: "#7f848b", seam: "#6d7278",
      scenery: ["scaffold", "cone", "crate"], sceneryDensity: 0.26,
      hazardKinds: ["steel", "forklift"], laneMix: [0.9, 0.1, 0],
    },
    {
      id: 9, name: "Storm", turtle: "#7fb96c", log: "#d2a06f", scene: "storm", baseline: 4,
      ground: "#4a5560", groundAlt: "#434d57", seam: "#373f48",
      scenery: ["pylon", "debris"], sceneryDensity: 0.16,
      hazardKinds: ["car", "tram", "lightning"], laneMix: [0.7, 0.3, 0],
    },
    {
      id: 10, name: "Volcano", turtle: "#7db869", log: "#d2a06f", scene: "volcano", baseline: 4,
      ground: "#5a3a34", groundAlt: "#52342e", seam: "#432a25",
      scenery: ["lavaVent", "obsidian", "boulder"], sceneryDensity: 0.2,
      hazardKinds: ["car", "tram", "log", "steel", "lava"],
      laneMix: [0.4, 0.2, 0.4],
    },
  ];

  /* Difficulty is two-dimensional:
   *     difficulty = stage.baseline + floor(elapsedMs / DIFFICULTY_STEP_MS)
   * A 90s stage therefore yields 6 steps (0,15,30,45,60,75s).
   * Stage baselines 0..4 give a 40-step campaign ladder. */
  function difficultyFor(stageIndex, elapsedMs) {
    var stage = STAGES[stageIndex];
    if (!stage) return 0;
    var step = Math.floor(elapsedMs / DIFFICULTY_STEP_MS);
    return stage.baseline + step;
  }

  function stageCount() { return STAGES.length; }

  function getStage(index) { return STAGES[index] || null; }

  global.Stages = {
    STAGE_DURATION_MS: STAGE_DURATION_MS,
    DIFFICULTY_STEP_MS: DIFFICULTY_STEP_MS,
    STAGE_START_LIVES: STAGE_START_LIVES,
    GOAL_ROW_OFFSET: GOAL_ROW_OFFSET,
    STAGES: STAGES,
    difficultyFor: difficultyFor,
    stageCount: stageCount,
    getStage: getStage,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
