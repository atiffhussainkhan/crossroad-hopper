/* src/roster.js — the playable roster.
 *
 * 24 characters loaded from generated cartoon images stored in assets/characters/.
 * The sprite field maps to the character image id (char_01 .. char_24).
 * Selected character is stored in localStorage under "chosenCharacter".
 *
 *   proportions are in tiles of width and world units of height
 *   bodyW   body width          bodyH   body height
 *   headW   head width          headH   head height
 *   ear     one of: triangle, round, tall, antenna, horn, flop
 */
(function (global) {
  "use strict";

  var ROSTER = [
    { id: "char_01", name: "Boy Cap",      role: "Character #1",  sprite: "char_01", body: "#f7e3c8", accent: "#e74c3c", earColor: "#f0b9c0", mark: "#ffffff", bodyW: 0.56, bodyH: 0.28, headW: 0.64, headH: 0.36, earKind: "triangle", earScale: 1.0, eyeScale: 1.0 },
    { id: "char_02", name: "Blue Hoodie",  role: "Character #2",  sprite: "char_02", body: "#3498db", accent: "#2c3e50", earColor: "#5dade2", mark: "#ffffff", bodyW: 0.58, bodyH: 0.30, headW: 0.66, headH: 0.38, earKind: "round",    earScale: 1.0, eyeScale: 1.0 },
    { id: "char_03", name: "Cat",          role: "Character #3",  sprite: "char_03", body: "#e67e22", accent: "#27ae60", earColor: "#f39c12", mark: "#ffffff", bodyW: 0.54, bodyH: 0.28, headW: 0.62, headH: 0.36, earKind: "triangle", earScale: 1.2, eyeScale: 1.1 },
    { id: "char_04", name: "Robot",        role: "Character #4",  sprite: "char_04", body: "#95a5a6", accent: "#3498db", earColor: "#bdc3c7", mark: "#ffffff", bodyW: 0.60, bodyH: 0.32, headW: 0.68, headH: 0.40, earKind: "antenna",  earScale: 1.0, eyeScale: 0.9 },
    { id: "char_05", name: "Dog",          role: "Character #5",  sprite: "char_05", body: "#8b4513", accent: "#e67e22", earColor: "#d2691e", mark: "#ffffff", bodyW: 0.58, bodyH: 0.28, headW: 0.64, headH: 0.36, earKind: "flop",     earScale: 1.1, eyeScale: 1.0 },
    { id: "char_06", name: "Ninja",        role: "Character #6",  sprite: "char_06", body: "#2c3e50", accent: "#9b59b6", earColor: "#34495e", mark: "#ffffff", bodyW: 0.52, bodyH: 0.28, headW: 0.60, headH: 0.34, earKind: "triangle", earScale: 0.8, eyeScale: 1.0 },
    { id: "char_07", name: "Bunny",        role: "Character #7",  sprite: "char_07", body: "#ecf0f1", accent: "#3498db", earColor: "#f5b7b1", mark: "#ffffff", bodyW: 0.54, bodyH: 0.28, headW: 0.62, headH: 0.38, earKind: "tall",     earScale: 1.6, eyeScale: 1.1 },
    { id: "char_08", name: "Wizard",       role: "Character #8",  sprite: "char_08", body: "#8e44ad", accent: "#f39c12", earColor: "#d7bde2", mark: "#ffffff", bodyW: 0.50, bodyH: 0.32, headW: 0.58, headH: 0.40, earKind: "triangle", earScale: 1.0, eyeScale: 1.0 },
    { id: "char_09", name: "Alien",        role: "Character #9",  sprite: "char_09", body: "#27ae60", accent: "#3498db", earColor: "#82e0aa", mark: "#ffffff", bodyW: 0.56, bodyH: 0.30, headW: 0.68, headH: 0.42, earKind: "antenna",  earScale: 1.2, eyeScale: 1.3 },
    { id: "char_10", name: "Pirate",       role: "Character #10", sprite: "char_10", body: "#c0392b", accent: "#f39c12", earColor: "#f5b7b1", mark: "#ffffff", bodyW: 0.58, bodyH: 0.28, headW: 0.64, headH: 0.36, earKind: "round",    earScale: 0.8, eyeScale: 1.0 },
    { id: "char_11", name: "Penguin",      role: "Character #11", sprite: "char_11", body: "#2c3e50", accent: "#e67e22", earColor: "#ecf0f1", mark: "#ffffff", bodyW: 0.56, bodyH: 0.32, headW: 0.60, headH: 0.34, earKind: "round",    earScale: 0.7, eyeScale: 1.0 },
    { id: "char_12", name: "Knight",       role: "Character #12", sprite: "char_12", body: "#7f8c8d", accent: "#f39c12", earColor: "#bdc3c7", mark: "#ffffff", bodyW: 0.60, bodyH: 0.30, headW: 0.66, headH: 0.38, earKind: "horn",     earScale: 1.0, eyeScale: 1.0 },
    { id: "char_13", name: "Fox",          role: "Character #13", sprite: "char_13", body: "#e67e22", accent: "#f39c12", earColor: "#f0b9c0", mark: "#ffffff", bodyW: 0.54, bodyH: 0.28, headW: 0.62, headH: 0.36, earKind: "triangle", earScale: 1.3, eyeScale: 1.1 },
    { id: "char_14", name: "Astronaut",   role: "Character #14", sprite: "char_14", body: "#ecf0f1", accent: "#3498db", earColor: "#bdc3c7", mark: "#ffffff", bodyW: 0.62, bodyH: 0.34, headW: 0.70, headH: 0.42, earKind: "round",    earScale: 0.6, eyeScale: 0.9 },
    { id: "char_15", name: "Pig",          role: "Character #15", sprite: "char_15", body: "#f5b7b1", accent: "#e74c3c", earColor: "#fadbd8", mark: "#ffffff", bodyW: 0.64, bodyH: 0.30, headW: 0.68, headH: 0.38, earKind: "round",    earScale: 0.8, eyeScale: 0.9 },
    { id: "char_16", name: "Superhero",   role: "Character #16", sprite: "char_16", body: "#e74c3c", accent: "#3498db", earColor: "#f8d210", mark: "#ffffff", bodyW: 0.58, bodyH: 0.30, headW: 0.66, headH: 0.38, earKind: "triangle", earScale: 0.7, eyeScale: 1.1 },
    { id: "char_17", name: "Bear",         role: "Character #17", sprite: "char_17", body: "#8b4513", accent: "#27ae60", earColor: "#d2691e", mark: "#ffffff", bodyW: 0.62, bodyH: 0.30, headW: 0.68, headH: 0.38, earKind: "round",    earScale: 1.0, eyeScale: 1.0 },
    { id: "char_18", name: "Chef",          role: "Character #18", sprite: "char_18", body: "#ffffff", accent: "#2c3e50", earColor: "#f5b7b1", mark: "#ffffff", bodyW: 0.58, bodyH: 0.28, headW: 0.64, headH: 0.36, earKind: "round",    earScale: 1.2, eyeScale: 1.0 },
    { id: "char_19", name: "Skeleton",     role: "Character #19", sprite: "char_19", body: "#ecf0f1", accent: "#9b59b6", earColor: "#bdc3c7", mark: "#ffffff", bodyW: 0.50, bodyH: 0.30, headW: 0.58, headH: 0.38, earKind: "triangle", earScale: 0.9, eyeScale: 1.2 },
    { id: "char_20", name: "Koala",        role: "Character #20", sprite: "char_20", body: "#95a5a6", accent: "#27ae60", earColor: "#bdc3c7", mark: "#ffffff", bodyW: 0.60, bodyH: 0.30, headW: 0.68, headH: 0.38, earKind: "round",    earScale: 1.1, eyeScale: 1.0 },
    { id: "char_21", name: "Builder",      role: "Character #21", sprite: "char_21", body: "#f39c12", accent: "#e67e22", earColor: "#f5b7b1", mark: "#ffffff", bodyW: 0.60, bodyH: 0.30, headW: 0.66, headH: 0.38, earKind: "round",    earScale: 0.7, eyeScale: 1.0 },
    { id: "char_22", name: "Frog",         role: "Character #22", sprite: "char_22", body: "#27ae60", accent: "#e74c3c", earColor: "#82e0aa", mark: "#ffffff", bodyW: 0.56, bodyH: 0.26, headW: 0.70, headH: 0.36, earKind: "antenna",  earScale: 0.6, eyeScale: 1.4 },
    { id: "char_23", name: "Firefighter",  role: "Character #23", sprite: "char_23", body: "#e74c3c", accent: "#f39c12", earColor: "#f5b7b1", mark: "#ffffff", bodyW: 0.60, bodyH: 0.30, headW: 0.66, headH: 0.38, earKind: "round",    earScale: 0.8, eyeScale: 1.0 },
    { id: "char_24", name: "Unicorn",     role: "Character #24", sprite: "char_24", body: "#ffffff", accent: "#9b59b6", earColor: "#f8d210", mark: "#f8d210", bodyW: 0.56, bodyH: 0.30, headW: 0.64, headH: 0.40, earKind: "horn",     earScale: 1.4, eyeScale: 1.1 },
  ];

  /* Per-character MOTION profile — how the hop looks, not how it behaves.
   *   hopMs   duration of one hop
   *   arc     peak height of the hop arc, in world units
   *   squash  1.0 is neutral; below 1 squashes on landing, above stretches
   *   sway    horizontal lean at the apex, a personality tell
   */
  var MOTION = {};
  for (var i = 0; i < ROSTER.length; i++) {
    var id = ROSTER[i].id;
    // Distribute the 6 motion profiles across 24 characters cyclically
    var profiles = [
      { hopMs: 400, arc: 0.55, squash: 1.00, sway: 0.00 },
      { hopMs: 375, arc: 0.68, squash: 1.06, sway: 0.04 },
      { hopMs: 350, arc: 0.80, squash: 0.96, sway: -0.03 },
      { hopMs: 470, arc: 0.32, squash: 1.12, sway: 0.00 },
      { hopMs: 415, arc: 0.62, squash: 0.98, sway: 0.07 },
      { hopMs: 390, arc: 0.46, squash: 1.08, sway: -0.05 },
    ];
    MOTION[id] = profiles[i % profiles.length];
  }

  function motionFor(id) { return MOTION[id] || MOTION["char_01"]; }

  function getCharacter(id) {
    for (var i = 0; i < ROSTER.length; i++) {
      if (ROSTER[i].id === id) return ROSTER[i];
    }
    return ROSTER[0];
  }

  /* Return the roster entry for the character selected in localStorage.
   * Falls back to char_01 if nothing is selected yet. */
  function getSelectedCharacter() {
    var chosen = null;
    try { chosen = localStorage.getItem("chosenCharacter"); } catch (e) {}
    if (chosen) {
      var idx = parseInt(chosen, 10);
      if (idx >= 1 && idx <= ROSTER.length) return ROSTER[idx - 1];
      // Also try string lookup (in case URL param stored the string id)
      var byId = getCharacter(chosen);
      if (byId) return byId;
    }
    return ROSTER[0];
  }

  function count() { return ROSTER.length; }

  global.Roster = {
    ROSTER: ROSTER,
    MOTION: MOTION,
    motionFor: motionFor,
    getCharacter: getCharacter,
    getSelectedCharacter: getSelectedCharacter,
    count: count,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
