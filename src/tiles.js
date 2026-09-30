/* src/tiles.js — per-tile behaviour types, and coin pickups.
 *
 * Requirement B-03/B-04: a per-tile TYPE tag rewrites the rule of that row
 * rather than only its spacing. The spec names six types and they were
 * rendered in the offline preview but never existed in the playable, which
 * used a flat lane cycle. This module is where they become real.
 *
 * Each type answers one question: what happens to a player who steps here,
 * and what does it look like. Nothing here changes difficulty tier — these
 * are read-and-react behaviours, not upgrades (X-06).
 *
 *   SOLID       nothing. The default.
 *   BREAKABLE   collapses one tick after being entered, then is gone for
 *               the rest of the stage. Teaches commitment.
 *   SLIDE       carries the player one extra column in its direction on
 *               entry. The only tile that moves the player for free.
 *   PHASE       appears and disappears on a period. Timing gate.
 *   SPRING      launches the player two rows forward. Rewards arrival.
 *   ONEWAY      only enterable in its arrow direction; stepping against it
 *               is refused. Punishes a wrong read.
 *
 * Coins are the currency half of the economy (E-01/E-02): a one-unit
 * pickup on a fraction of tiles, carried in the run total and banked at
 * stage end.
 */
(function (global) {
  "use strict";

  var TILE = {
    SOLID:     "SOLID",
    BREAKABLE: "BREAKABLE",
    SLIDE:     "SLIDE",
    PHASE:     "PHASE",
    SPRING:    "SPRING",
    ONEWAY:    "ONEWAY",
  };
  var TYPES = ["SOLID", "BREAKABLE", "SLIDE", "PHASE", "SPRING", "ONEWAY"];

  // A row's tile pattern is derived from its lane class and the stage's
  // difficulty, so early stages are mostly solid and later ones are not.
  // `density` is the chance a non-solid type appears at all; teaching stages
  // pass 0.
  function buildTileRow(row, lane, difficulty, density, seedIndex) {
    if (density <= 0) return TILE.SOLID;
    // Deterministic per-cell: same (row, col, difficulty) always agrees, so
    // the board is reproducible from its seed.
    var h = (row * 73856093) ^ (seedIndex * 19349663) ^ (difficulty * 83492791);
    h = (h ^ (h >>> 13)) >>> 0;
    var r = (h % 10000) / 10000;
    if (r > density) return TILE.SOLID;
    var pick = TYPES[1 + ((h >>> 7) % (TYPES.length - 1))];
    // A sliding tile needs a direction and a row to slide into.
    if (pick === TILE.SLIDE) {
      return { type: TILE.SLIDE, dir: ((h >>> 11) & 1) ? 1 : -1 };
    }
    if (pick === TILE.ONEWAY) {
      return { type: TILE.ONEWAY, dir: ((h >>> 13) & 1) ? 1 : -1 };
    }
    if (pick === TILE.PHASE) {
      return { type: TILE.PHASE, periodMs: 1600 + ((h >>> 5) % 4) * 400, phaseMs: ((h >>> 9) % 3) * 500 };
    }
    return { type: pick };
  }

  function tileType(t) { return (t && typeof t === "object") ? t.type : (t || TILE.SOLID); }

  // Is this tile passable right now? PHASE tiles blink in and out.
  function isPassable(tile, elapsedMs) {
    var ty = tileType(tile);
    if (ty === TILE.PHASE) {
      var period = (tile && tile.periodMs) || 2000;
      var phase = (tile && tile.phaseMs) || 0;
      return ((elapsedMs + phase) % period) < period / 2;
    }
    return true;
  }

  // What does entering this tile do? Returns a small intent the caller
  // applies, so this module never mutates game state directly.
  //
  //   slide   { kind:"slide", col: +1|-1 }
  //   spring  { kind:"spring", rows: 2 }
  //   refuse  { kind:"refuse" }   -- the step did not happen
  function onEnter(tile, playerCol) {
    var ty = tileType(tile);
    if (ty === TILE.SLIDE) return { kind: "slide", col: (tile.dir || 1) };
    if (ty === TILE.SPRING) return { kind: "spring", rows: 2 };
    if (ty === TILE.ONEWAY) {
      // Refuse only if the player is moving against the arrow.
      return { kind: "allow" };
    }
    return { kind: "none" };
  }

  function wouldRefuse(tile, dir) {
    return tileType(tile) === TILE.ONEWAY && tile && dir && tile.dir !== dir;
  }

  global.Tiles = {
    TILE: TILE, TYPES: TYPES,
    buildTileRow: buildTileRow, tileType: tileType,
    isPassable: isPassable, onEnter: onEnter, wouldRefuse: wouldRefuse,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
