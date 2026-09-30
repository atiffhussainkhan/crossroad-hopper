/* src/roster.js — the playable roster.
 *
 * Six characters, separated by SILHOUETTE first and colour second. Recolouring
 * a fox and calling it a panda produces two of the same sprite; these six
 * differ in proportion and in what sticks out of the head, so each is
 * identifiable at 24px by shape alone with the colour removed.
 *
 *   proportions are in tiles of width and world units of height
 *   bodyW   body width          bodyH   body height
 *   headW   head width          headH   head height
 *   ear     one of: triangle, round, tall, antenna, horn, flop
 *
 * Every character is original. None resembles a licensed character, and the
 * names are original. The silhouette rules are the reason: a child who cannot
 * distinguish their character from a hazard has no way to play.
 */
(function (global) {
  "use strict";

  var ROSTER = [
    {
      id: "pip", name: "Pip", role: "The starter",
      body: "#f7e3c8", accent: "#2fbfa0", earColor: "#f0b9c0", mark: "#ffffff",
      bodyW: 0.56, bodyH: 0.28, headW: 0.64, headH: 0.36,
      earKind: "triangle", earScale: 1.0, eyeScale: 1.0,
      note: "Balanced. Pointed ears, round head, neutral for every backdrop."
    },
    {
      id: "bloop", name: "Bloop", role: "The round one",
      body: "#8fd6e8", accent: "#ff9f43", earColor: "#bfeaf3", mark: "#ffffff",
      bodyW: 0.64, bodyH: 0.30, headW: 0.68, headH: 0.40,
      earKind: "antenna", earScale: 1.0, eyeScale: 1.25,
      note: "No ears at all, one antenna. The only silhouette with a single thin spike."
    },
    {
      id: "nib", name: "Nib", role: "The tall one",
      body: "#c9a0e8", accent: "#ffe066", earColor: "#e0c8f2", mark: "#ffffff",
      bodyW: 0.44, bodyH: 0.34, headW: 0.50, headH: 0.34,
      earKind: "tall", earScale: 1.5, eyeScale: 0.9,
      note: "Narrow body, long upright ears. The tallest silhouette on the roster."
    },
    {
      id: "cob", name: "Cob", role: "The squat one",
      body: "#e8a05c", accent: "#4a6fa5", earColor: "#f0bf88", mark: "#fff4e0",
      bodyW: 0.72, bodyH: 0.20, headW: 0.60, headH: 0.28,
      earKind: "horn", earScale: 0.9, eyeScale: 0.85,
      note: "Widest and lowest. A wedge, so it reads as heavy against a road."
    },
    {
      id: "fizz", name: "Fizz", role: "The sprig one",
      body: "#a8e063", accent: "#e04a6a", earColor: "#c8f0a0", mark: "#ffffff",
      bodyW: 0.54, bodyH: 0.30, headW: 0.60, headH: 0.36,
      earKind: "flop", earScale: 1.1, eyeScale: 1.1,
      note: "A leafy sprig lying sideways. The sprig is the only mark above the head."
    },
    {
      id: "mozz", name: "Mozz", role: "The wide one",
      body: "#f2f0e6", accent: "#3a3a3a", earColor: "#d8d4c4", mark: "#c9c5b4",
      bodyW: 0.70, bodyH: 0.26, headW: 0.66, headH: 0.34,
      earKind: "round", earScale: 1.35, eyeScale: 1.0,
      note: "Two large round ears and a pale hide. Distinct in greyscale, which matters most."
    },
  ];

  /* Per-character MOTION profile, applied in the render, not the simulation
   * and never in collision. These change how a hop LOOKS, not whether it
   * lands. Requirement X-06 forbids an unlock that alters difficulty, so no
   * value here may change a hitbox, a speed that affects survival, or the
   * distance a hazard can reach the player.
   *   hopMs   duration of one hop
   *   arc     peak height of the hop arc, in world units
   *   squash  1.0 is neutral; below 1 squashes on landing, above stretches
   *   sway    horizontal lean at the apex, a personality tell
   */
  /* The hop durations were 520-700ms. Long enough that each step read as a
   * pause rather than a movement, which is most of why the game felt like it
   * was jerking: a slow step cannot hide any roughness in the transition.
   * Shortening them and easing the interpolation (see main.js playerPose) is
   * what makes a hop read as smooth AND responsive. The relative order is
   * preserved, so each character still moves in its own way. */
  var MOTION = {
    pip:   { hopMs: 400, arc: 0.55, squash: 1.00, sway: 0.00 },
    bloop: { hopMs: 375, arc: 0.68, squash: 1.06, sway: 0.04 },
    nib:   { hopMs: 350, arc: 0.80, squash: 0.96, sway: -0.03 },
    cob:   { hopMs: 470, arc: 0.32, squash: 1.12, sway: 0.00 },
    fizz:  { hopMs: 415, arc: 0.62, squash: 0.98, sway: 0.07 },
    mozz:  { hopMs: 390, arc: 0.46, squash: 1.08, sway: -0.05 },
  };

  function motionFor(id) { return MOTION[id] || MOTION.pip; }

  function getCharacter(id) {
    for (var i = 0; i < ROSTER.length; i++) {
      if (ROSTER[i].id === id) return ROSTER[i];
    }
    return ROSTER[0];
  }

  function count() { return ROSTER.length; }

  global.Roster = {
    ROSTER: ROSTER,
    MOTION: MOTION,
    motionFor: motionFor,
    getCharacter: getCharacter,
    count: count,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
