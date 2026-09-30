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
      { id: 1, laneMix: [0.60,0,0], name: "Suburb", baseline: 0, ground: "#7ba05b", groundAlt: "#6f9450", road: "#4a4a52", water: "#3f7fb5", hazard: "#ff4d3d", hazard2: "#f2a03d", foliage: "#3f8a3d", foliage2: "#57a84f", trunk: "#7a5433", log: "#ffffff", turtle: "#4a7a3a", hazardKinds: ["car","taxi","police"], scenery: ["hedge","tree","mailbox","bush","flowerbed","fence"] },
      { id: 2, laneMix: [0,0,0.56], name: "River", baseline: 0, ground: "#3f7fb5", groundAlt: "#37719f", road: "#4a4a52", water: "#2f6f9f", hazard: "#ff4d3d", hazard2: "#8a5a2b", foliage: "#2f6b40", foliage2: "#438a52", trunk: "#6b4a2b", log: "#ffffff", turtle: "#4a7a3a", hazardKinds: ["log","turtle","alligator","snake"], scenery: ["reed","lily","rock","lily","reed"] },
      { id: 3, laneMix: [0.56,0,0], name: "Desert", baseline: 1, ground: "#d9b168", groundAlt: "#cfa45c", road: "#5a5048", water: "#3f7fb5", hazard: "#ff4d3d", hazard2: "#a89a3a", foliage: "#5f8a3f", foliage2: "#7aa84f", trunk: "#8a6a3a", log: "#ffffff", turtle: "#4a7a3a", hazardKinds: ["car","tumbleweed","tractor","racecar"], scenery: ["cactus","rock","bone","boulder"] },
      { id: 4, laneMix: [0.50,0.14,0], name: "Farmland", baseline: 1, ground: "#d9d264", groundAlt: "#cbbc58", road: "#54585e", water: "#3f7fb5", hazard: "#ff4d3d", hazard2: "#e8b53d", foliage: "#4a7a3a", foliage2: "#5f9c48", trunk: "#7a5433", log: "#ffffff", turtle: "#4a7a3a", hazardKinds: ["tractor","car","limousine","truck","train"], scenery: ["haybale","fence","tree","windmill"] },
      { id: 5, laneMix: [0.50,0.20,0], name: "Night City", baseline: 2, ground: "#2b3040", groundAlt: "#262b39", road: "#1e222c", water: "#26405e", hazard: "#ff4d3d", hazard2: "#4ad9ff", foliage: "#2a3a4a", foliage2: "#365068", trunk: "#2a2f38", log: "#ffffff", turtle: "#4a7a3a", hazardKinds: ["taxi","tram","bus","police"], scenery: ["neon","building","streetlamp","hydrant","postbox"] },
      { id: 6, laneMix: [0,0,0.56], name: "Frozen Lake", baseline: 2, ground: "#c8e4f0", groundAlt: "#bcd9e8", road: "#262b33", water: "#5aa0c0", hazard: "#ff4d3d", hazard2: "#6b4a8a", foliage: "#3d6b5a", foliage2: "#4f8570", trunk: "#5a4636", log: "#ffffff", turtle: "#4a7a3a", hazardKinds: ["sled","turtle","log","crocodile"], scenery: ["pine","iceberg","pine","rock"] },
      { id: 7, laneMix: [0.20,0,0.46], name: "Rainforest", baseline: 3, ground: "#3f7a4a", groundAlt: "#387044", road: "#4a4438", water: "#2f6f8a", hazard: "#ff4d3d", hazard2: "#7ac94f", foliage: "#24522f", foliage2: "#357a42", trunk: "#5a4028", log: "#ffffff", turtle: "#4a7a3a", hazardKinds: ["log","snake","car","boulder"], scenery: ["vine","fern","tree","bush"] },
      { id: 8, laneMix: [0.52,0.16,0], name: "Construction", baseline: 3, ground: "#9aa0a8", groundAlt: "#8f959d", road: "#6b7078", water: "#4a6a8a", hazard: "#ff4d3d", hazard2: "#e05c4b", foliage: "#7a8a4a", foliage2: "#8fa85a", trunk: "#8a6a3a", log: "#ffffff", turtle: "#4a7a3a", hazardKinds: ["forklift","roller","monorail","truck"], scenery: ["scaffold","cone","crate","pylon"] },
      { id: 9, laneMix: [0.44,0.22,0], name: "Storm", baseline: 4, ground: "#4a5560", groundAlt: "#434d57", road: "#333a44", water: "#38566b", hazard: "#ff4d3d", hazard2: "#7ac9e8", foliage: "#2f3742", foliage2: "#3d4a58", trunk: "#33383f", log: "#ffffff", turtle: "#4a7a3a", hazardKinds: ["limousine","tram","tumbleweed","train"], scenery: ["pylon","puddle","pylon","debris"] },
      { id: 10, laneMix: [0.26,0.18,0.28], name: "Volcano", baseline: 4, ground: "#5a3a34", groundAlt: "#52342e", road: "#3a2a26", water: "#8a3a1a", hazard: "#ff4d3d", hazard2: "#ffd23d", foliage: "#2a1a18", foliage2: "#3f2622", trunk: "#3a2a26", log: "#ffffff", turtle: "#4a7a3a", hazardKinds: ["bus","steamvent","log","train","roller"], scenery: ["lavaVent","obsidian","boulder","debris"] },
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
