/* src/render/scene.js — the stage palette and every draw routine.
 *
 * The palette is read from src/stages.js at load time, which is the single
 * source of truth. tools/check_art_assets.py asserts the Python preview and
 * the game agree, so neither can drift.
 *
 * Lane classes come from one lookup, not three overlapping predicates. The
 * Python version had row 4 as both RAIL and WATER, which spawned logs and
 * turtles in the train lane.
 */
(function (global) {
  "use strict";

  var I = global.Iso;

  // One row, one lane class. A repeating cycle the eye can learn.
  /* The lane pattern is DERIVED FROM EACH STAGE'S laneMix instead of a single
   * fixed cycle. The fixed cycle meant all ten stages had an identical layout
   * and differed only in colour, which is not ten different scenes -- it is
   * one scene recoloured.
   *
   * The construction itself now lives in src/tiles.js, because src/hazards.js
   * must derive the SAME lane class when it decides what spawns on a row. A
   * second copy here is what let cars spawn on rows drawn as lawn. */
  var T = global.Tiles;

  function buildLaneCycle(laneMix) { return T.buildLaneCycle(laneMix); }

  function laneOf(row, scene) {
    if (!T) return "road";   // tiles.js missing; the gate reports the load failure
    return T.laneOf(row, scene && scene.laneMix, scene && scene.id);
  }
  function isHazardLane(row, scene) {
    if (!T) return true;
    return T.isHazardLane(row, scene && scene.laneMix, scene && scene.id);
  }

  // ---------- props ------------------------------------------------------

  function drawCar(ctx, col, row, scene) {
    var body = scene.hazard;
    I.castShadow(ctx, col, row, 0.78, 0.55);
    I.cubeFrac(ctx, col + 0.00, row + 0.08, 0.86, 0.34, 0.0, 0.20, I.shade(body, 0.58));
    I.cubeFrac(ctx, col + 0.04, row + 0.12, 0.76, 0.26, 0.20, 0.16, body);
    I.cubeFrac(ctx, col + 0.26, row + 0.16, 0.34, 0.22, 0.36, 0.20, I.shade(body, 0.86));
    I.cubeFrac(ctx, col + 0.28, row + 0.18, 0.32, 0.20, 0.56, 0.07, I.shade(body, 1.18));
    var g = I.projectS(col + 0.26, row + 0.16, 0.50);
    I.poly(ctx, [[g[0], g[1] - 1], [g[0] + 9, g[1] + 5], [g[0] + 9, g[1] + 10], [g[0], g[1] + 4]], "#cfe6f5");
    [0.20, 0.44].forEach(function (dr) {
      var w = I.projectS(col + 0.16, row + dr, 0.0);
      I.ellipse(ctx, w[0], w[1] + 4, 4.4, 4.4, "#1c1c20");
      I.ellipse(ctx, w[0], w[1] + 4, 2.0, 2.0, "#8d9096");
    });
    [0.18, 0.40].forEach(function (dr) {
      var l = I.projectS(col + 1.0, row + dr, 0.26);
      I.ellipse(ctx, l[0], l[1], 3.0, 2.2, "#fff3c0");
    });
  }

  function drawTrain(ctx, col, row, scene) {
    var body = scene.hazard2 || scene.hazard;
    I.castShadow(ctx, col, row, 0.66, 0.58);
    I.cubeFrac(ctx, col + 0.00, row + 0.06, 0.98, 0.30, 0.0, 0.40, I.shade(body, 0.58));
    I.cubeFrac(ctx, col + 0.02, row + 0.09, 0.94, 0.26, 0.40, 0.26, body);
    var n = I.projectS(col + 1.0, row + 0.5, 0.0);
    I.poly(ctx, [[n[0], n[1] - 12], [n[0] - 14, n[1] + 6], [n[0], n[1] + 6]], I.shade(body, 1.05));
    for (var k = 0; k < 3; k++) {
      var w = I.projectS(col + 0.18 + k * 0.30, row + 0.06, 0.50);
      I.poly(ctx, [[w[0], w[1] - 2], [w[0] - 6, w[1] + 4], [w[0] - 6, w[1] + 10], [w[0], w[1] + 4]], "#dff0ff");
      var r = I.projectS(col + 0.14 + k * 0.30, row + 0.16, 0.68);
      I.ellipse(ctx, r[0], r[1], 9, 4, I.shade(body, 1.20));
    }
    var h = I.projectS(col + 0.02, row + 0.5, 0.22);
    for (var j = 0; j < 5; j++) {
      var a = I.projectS(col + 0.06 + j * 0.20, row + 0.06, 0.18);
      var b = I.projectS(col + 0.16 + j * 0.20, row + 0.06, 0.18);
      I.poly(ctx, [[a[0], a[1] - 2], [b[0], b[1] - 2], [b[0], b[1] + 2], [a[0], a[1] + 2]], "#ffd23d");
    }
  }

  function drawLog(ctx, col, row, scene) {
    var wood = scene.log || "#8a5a2b";
    I.cubeFrac(ctx, col + 0.00, row + 0.04, 0.90, 0.28, 0.0, 0.26, I.shade(wood, 0.80));
    I.cubeFrac(ctx, col + 0.02, row + 0.08, 0.86, 0.24, 0.26, 0.14, wood);
    var e = I.projectS(col + 1.0, row + 0.5, 0.16);
    I.ellipse(ctx, e[0], e[1], 17, 9, I.shade(wood, 1.28));
    I.ellipse(ctx, e[0], e[1], 12, 6, I.shade(wood, 1.05));
    I.ellipse(ctx, e[0], e[1], 6, 3, I.shade(wood, 0.88));
  }

  function drawTurtle(ctx, col, row, scene) {
    var base = scene.turtle || "#4a7a3a";
    I.ellipse(ctx, ...pt(col, row, 0.0), 16, 7, I.shade(base, 1.45));
    var c = I.projectS(col + 0.5, row + 0.5, 0.0);
    var hx = 15, hy = 8;
    var pts = [[c[0] - hx, c[1]], [c[0] - hx / 2, c[1] - hy], [c[0] + hx / 2, c[1] - hy],
               [c[0] + hx, c[1]], [c[0] + hx / 2, c[1] + hy], [c[0] - hx / 2, c[1] + hy]];
    I.poly(ctx, pts, I.shade(base, 0.72));
    I.poly(ctx, pts.map(function (p) {
      return [c[0] + (p[0] - c[0]) * 0.86, c[1] + (p[1] - c[1]) * 0.80];
    }), base);
    var hd = I.projectS(col + 1.0, row + 0.5, 0.10);
    I.ellipse(ctx, hd[0], hd[1], 5.0, 4.0, I.shade(base, 1.45));
    I.ellipse(ctx, hd[0] + 1.5, hd[1] - 0.8, 1.4, 1.3, "#1b1b1b");
    I.ellipse(ctx, c[0] - 4, c[1] - 3, 4.5, 2.4, I.shade(base, 1.28));
  }

  function pt(col, row, z) { var p = I.projectS(col, row, z); return [p[0], p[1] + 4]; }

  function drawTree(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 1.45, 0.62);
    var trunk = scene.trunk || "#7a5433";
    I.cubeFrac(ctx, col + 0.44, row + 0.44, 0.12, 0.12, 0.0, 0.92, trunk);
    I.cubeFrac(ctx, col + 0.38, row + 0.38, 0.24, 0.24, 0.0, 0.10, I.shade(trunk, 0.80));
    var lobes = [[0.58, 0.86, 1.30, 0.46, 0.54, scene.foliage],
                 [0.44, 1.08, 1.50, 0.58, 0.46, I.shade(scene.foliage2, 0.92)],
                 [0.30, 1.36, 1.72, 0.48, 0.60, scene.foliage2]];
    lobes.forEach(function (l) {
      I.blob(ctx, col + l[3], row + l[4], l[0], l[0], l[1], l[2] - l[1], l[5]);
    });
  }

  function drawBush(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.30, 0.34);
    var fol = scene.foliage;
    I.blob(ctx, col + 0.44, row + 0.50, 0.44, 0.44, 0.00, 0.30, fol);
    I.blob(ctx, col + 0.22, row + 0.52, 0.36, 0.36, 0.22, 0.42, I.shade(fol, 0.92));
    I.blob(ctx, col + 0.28, row + 0.44, 0.28, 0.28, 0.38, 0.54, scene.foliage2);
  }

  function drawRock(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.36, 0.38);
    var base = I.shade(scene.ground, 0.72);
    I.blob(ctx, col + 0.28, row + 0.30, 0.44, 0.40, 0.0, 0.34, base);
    I.blob(ctx, col + 0.52, row + 0.56, 0.24, 0.22, 0.28, 0.20, I.shade(base, 1.10));
  }

  // ---------- scenery placement ------------------------------------------
  //
  // The stage DECLARES its own objects (STAGES[].scenery, most common first).
  // The old code ignored that list and placed tree/bush/rock on a fixed hash,
  // which is why every stage was decorated identically and Suburb had no
  // mailbox anywhere in it.
  //
  // Two invariants, both required for playability rather than for looks:
  //   1. Scenery never lands on a hazard lane. The player must always be able
  //      to read a crossing row as a crossing row.
  //   2. Scenery never lands on the cell the player is standing in, or the
  //      character disappears behind a hedge exactly when it matters.

  // Integer hash. Deterministic across runs so the same tile always gets the
  // same object -- a stage that reshuffles on every frame is unlearnable.
  function hash2(col, row) {
    var h = (col * 73856093) ^ (row * 19349663);
    h = (h ^ (h >>> 13)) >>> 0;
    return h;
  }

  // Bands of density along the view, so a stage has clearings and clumps
  // instead of an even scatter. Purely cosmetic, so it is allowed to be crude.
  function densityAt(col, row) {
    var band = hash2(Math.floor(col / 4), Math.floor(row / 3)) % 100;
    var jitter = hash2(col, row) % 100;
    if (jitter > 34) return 0;                       // a guaranteed clearing
    if (band < 22) return jitter < 20 ? 0 : 1;       // a sparse stretch
    return 1;
  }

  // Weighted pick from the stage's list, most-common-first. A stage listing
  // ["tree","hedge","mailbox"] gets mostly trees, some hedges, few mailboxes,
  // which is what a suburb actually looks like.
  function pickScenery(kinds, col, row) {
    if (!kinds || !kinds.length) return null;
    var total = 0, i;
    for (i = 0; i < kinds.length; i++) total += Math.max(1, kinds.length - i);
    var r = hash2(col * 3 + 11, row * 7 + 5) % total;
    for (i = 0; i < kinds.length; i++) {
      r -= Math.max(1, kinds.length - i);
      if (r < 0) return kinds[i];
    }
    return kinds[0];
  }

  function sceneryFor(scene, row, col, focusCol, focusRow) {
    if (isHazardLane(row, scene)) return null;
    if (col === focusCol && row === focusRow) return null;
    if (!densityAt(col, row)) return null;
    return pickScenery(scene.scenery, col, row);
  }

  // ---------- lane texture ----------------------------------------------
  //
  // AC-01: lane class must survive desaturation. These are geometry, so no
  // palette change can remove them.

  function drawLaneTexture(ctx, scene, row, cols) {
    var lane = laneOf(row, scene);
    for (var col = 0; col < cols; col++) {
      if (lane === "road") {
        if (col % 2 === 0) {
          var p = I.projectS(col + 0.5, row + 0.5, 0.02);
          I.poly(ctx, [[p[0], p[1] - 2], [p[0] + 11, p[1] + 6], [p[0] + 11, p[1] + 10], [p[0], p[1] + 2]], "#e8e2c8");
        }
      } else if (lane === "rail") {
        [-0.28, 0.28].forEach(function (off) {
          var a = I.projectS(col + 0.5 + off * 0.5, row + 0.5, 0.02);
          var b = I.projectS(col + 0.5 + off * 0.5 + 0.5, row + 1.0, 0.02);
          ctx.strokeStyle = "#8a8f98"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        });
        if (col % 2 === 0) {
          var s = I.projectS(col + 0.5, row + 0.5, 0.015);
          I.poly(ctx, [[s[0] - 8, s[1] - 4], [s[0] + 8, s[1] - 2], [s[0] + 8, s[1] + 3], [s[0] - 8, s[1] + 5]], "#5c4a3a");
        }
      } else if (lane === "water") {
        for (var k = 0; k < 2; k++) {
          var w = I.projectS(col + 0.28 + k * 0.44, row + 0.5, 0.015);
          var sh = (row % 2) * 5;
          I.poly(ctx, [[w[0] - 12, w[1] + sh], [w[0] - 6, w[1] - 6 + sh],
                       [w[0], w[1] + sh], [w[0] + 6, w[1] - 6 + sh], [w[0] + 12, w[1] + sh]],
                 I.shade(scene.water, 1.45));
        }
      }
    }
  }

  // ---------- scene ------------------------------------------------------

  var HAZARD_FNS = { car: drawCar, train: drawTrain, log: drawLog, turtle: drawTurtle };

  function renderScene(ctx, scene, opts) {
    var width = opts.width, height = opts.height;
    var cols = opts.cols, viewRows = opts.viewRows, row0 = opts.row0 || 0;
    // The simulation's hazard list. When supplied, the scene draws THESE and
    // invents none, so the view cannot disagree with what kills.
    // opts.hazards is authoritative when it is a real array, INCLUDING an
    // empty one. The previous test was `simHazards && simHazards.length`,
    // so an empty simulation list fell through to the decorative path and the
    // player saw hazards that could not kill them. The decorative path now
    // runs only when explicitly requested by the offline preview sheet.
    var simHazards = Array.isArray(opts.hazards) ? opts.hazards : null;
    var tall = scene.id === 5 ? 2.3 : 1.5;
    // The camera focuses on the player's own cell, so the character always
    // sits at the bottom-centre under the thumb rather than wherever the
    // board's bounding box happens to place it.
    I.frameViewWindow(cols, viewRows, width, height, row0, tall, 18, 0.72, 1,
                      opts.col0 || 0, opts.focusCol, opts.focusRow);

    var rows = [];
    for (var r = row0; r < row0 + viewRows; r++) rows.push(r);

    // Ground.
    for (var ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      for (var c = 0; c < cols; c++) {
        var l = laneOf(row, scene);
        var base = l === "road" ? scene.road
                 : l === "rail" ? scene.road
                 : l === "water" ? scene.water
                 : ((row + c) % 2 === 0 ? scene.ground : scene.groundAlt);
        I.tile(ctx, c, row, base);
      }
    }

    for (var t = 0; t < rows.length; t++) drawLaneTexture(ctx, scene, rows[t], cols);

    /* The finish zone.
     *
     * A stage is won by reaching opts.goalRow, and until now nothing on
     * screen said where that was. The player was asked to cross an endless
     * field of traffic with no visible destination, which is not a challenge,
     * it is a question. This draws the far edge the way the genre does: a
     * raised, lighter band with a dashed line at its near lip, readable from
     * several rows away and unmistakably different from a lane you cross. */
    var goalRow = opts.goalRow;
    if (goalRow !== undefined && goalRow !== null) {
      for (var g = 0; g < 2; g++) {
        var gr = goalRow + g;
        if (gr < row0 || gr >= row0 + viewRows) continue;
        for (var gc = 0; gc < cols; gc++) {
          I.tile(ctx, gc, gr, g === 0 ? "#f2ead2" : "#ded4b8");
        }
      }
      if (goalRow >= row0 && goalRow < row0 + viewRows) {
        // Near lip: a dashed line, so it reads as a boundary to cross.
        for (var dc = 0; dc < cols; dc++) {
          if (dc % 2 === 1) continue;
          var d = I.projectS(dc + 0.18, goalRow, 0.02);
          I.poly(ctx, [[d[0] - 4, d[1] - 2], [d[0] + 4, d[1] - 6],
                       [d[0] + 4, d[1] - 3], [d[0] - 4, d[1] + 1]], "#ffffff");
        }
        // Far edge: a low wall, so the destination has a back to it.
        var w = I.projectS(0, goalRow + 1, 0.0);
        var w2 = I.projectS(cols, goalRow + 1, 0.0);
        I.line(ctx, [[w[0], w[1]], [w2[0], w2[1]]], "#b9ad8c", 3);
      }
    }

    // Hazards, painted back to front. Drawn from the simulation's positions
    // when available; the decorative fallback only runs if the game has not
    // supplied a list, which is the case for the offline preview sheet.
    var hazards = [];
    if (simHazards) {
      for (var si = 0; si < simHazards.length; si++) {
        var sh = simHazards[si];
        if (sh.row < row0 || sh.row >= row0 + viewRows) continue;
        hazards.push([sh.x, sh.row, sh.kind]);
      }
    } else {
      for (var h = 0; h < rows.length - 1; h++) {
        // scene must be passed here. Calling laneOf(hr) with no scene keyed
        // every stage's decorative preview to stage 1's lane cycle, so the
        // offline sheet showed cars on rows that are water in the real stage.
        var hr = rows[h], lk = laneOf(hr, scene);
        for (var hc = 0; hc < cols; hc++) {
          if (lk === "road" && (hc * 3 + hr) % 7 === 0) hazards.push([hc, hr, "car"]);
          else if (lk === "rail" && (hc + hr) % 4 === 0) hazards.push([hc, hr, "train"]);
          else if (lk === "water" && (hc * 5 + hr) % 6 === 0) hazards.push([hc, hr, "log"]);
          else if (lk === "water" && (hc * 7 + hr) % 11 === 0) hazards.push([hc, hr, "turtle"]);
        }
      }
    }
    hazards.sort(function (a, b) { return (b[0] + b[1]) - (a[0] + a[1]); });
    hazards.forEach(function (x) {
      if (HAZARD_FNS[x[2]]) HAZARD_FNS[x[2]](ctx, x[0], x[1], scene);
    });

    // Scenery, placed from the stage's own declared object vocabulary.
    var S = global.Scenery;
    var sc = [];
    for (var s = 0; s < rows.length - 1; s++) {
      var sr = rows[s];
      for (var scn = 0; scn < cols; scn++) {
        var kind = sceneryFor(scene, sr, scn, opts.focusCol, opts.focusRow);
        if (kind) sc.push([scn, sr, kind]);
      }
    }
    sc.sort(function (a, b) { return (b[0] + b[1]) - (a[0] + a[1]); });
    if (S) {
      sc.forEach(function (x) { S.draw(x[2], ctx, x[0], x[1], scene); });
    } else {
      // Only reachable if src/scenery.js failed to load. Draw the old generic
      // objects rather than nothing, and let check_js_renderer catch the load
      // failure -- a stage that silently loses its scenery is worse than one
      // that loses its detail.
      var FALLBACK = { tree: drawTree, bush: drawBush, rock: drawRock };
      sc.forEach(function (x) {
        if (FALLBACK[x[2]]) FALLBACK[x[2]](ctx, x[0], x[1], scene);
      });
    }

    return { rows: rows, hazards: hazards, scenery: sc };
  }

  global.Scene = {
    laneOf: laneOf, isHazardLane: isHazardLane, buildLaneCycle: buildLaneCycle,
    renderScene: renderScene, drawLaneTexture: drawLaneTexture,
    sceneryFor: sceneryFor, hash2: hash2,
    drawCar: drawCar, drawTrain: drawTrain, drawLog: drawLog, drawTurtle: drawTurtle,
    drawTree: drawTree, drawBush: drawBush, drawRock: drawRock,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
