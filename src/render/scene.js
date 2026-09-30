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
  var Hazards = global.Hazards;

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


  /* ---- the obstacle vocabulary ----------------------------------------
   *
   * One function per kind in Hazards.KINDS. The first four were the whole set
   * for most of the project's life, which is why every stage looked and played
   * alike. Length is the number that matters: a bus that is 3.1 tiles long
   * occupies most of a lane for most of its pass, so the lane asks a different
   * question of the player than a car does.
   */

  function hazardShadow(ctx, col, row, len, alpha) {
    I.castShadow(ctx, col + (1 - len) / 2, row, 0.4, 0.5, alpha);
  }

  // A wheeled body: cabin, glass, and wheels. Shared by the road family so
  // they read as the same world at different sizes.
  function wheeled(ctx, col, row, spec, body, glass, opts) {
    opts = opts || {};
    var len = opts.len || spec.len;
    var h = opts.h || 0.34;
    hazardShadow(ctx, col, row, len, 0.16);
    I.cubeFrac(ctx, col + (1 - len) / 2, row + 0.12, len, 0.30, 0.0, 0.10, I.shade(body, 0.55));
    I.cubeFrac(ctx, col + (1 - len) / 2 + 0.02, row + 0.16, len - 0.04, 0.24, 0.10, h - 0.10, body);
    // Cabin, set back from the nose so long vehicles read as long.
    var cw = Math.min(len * 0.44, 0.36);
    var cx = opts.cabinAtEnd ? col + 1 - (1 - len) / 2 - cw : col + (1 - len) / 2 + 0.03;
    I.cubeFrac(ctx, cx, row + 0.17, cw, 0.22, h - 0.10, 0.20, glass);
    I.cubeFrac(ctx, col + (1 - len) / 2, row + 0.12, len, 0.30, h, 0.06, I.shade(body, 1.15));
    // Wheels.
    var n = Math.max(2, Math.round(len * 3));
    for (var i = 0; i < n; i++) {
      var wx = col + (1 - len) / 2 + (i + 0.5) * (len / n);
      var w = I.projectS(wx, row + 0.18, 0.0);
      I.ellipse(ctx, w[0], w[1] + 3, 4.2, 4.2, "#1c1c20");
      I.ellipse(ctx, w[0], w[1] + 3, 1.9, 1.9, "#9aa0a8");
    }
    // Headlights and tail lights, so direction is readable at a glance.
    var nose = opts.cabinAtEnd ? col + (1 - len) / 2 : col + 1 - (1 - len) / 2;
    var hl = I.projectS(opts.cabinAtEnd ? nose - 0.04 : nose + 0.04, row + 0.30, 0.16);
    I.ellipse(ctx, hl[0], hl[1], 2.4, 2.0, "#fff3c0");
  }

  function drawCar(ctx, col, row, scene, h) {
    wheeled(ctx, col, row, h.spec, h.spec.body || scene.hazard, "#cfe6f5", {});
  }
  function drawTaxi(ctx, col, row, scene, h) {
    wheeled(ctx, col, row, h.spec, "#ffd23d", "#3a3a44", {});
    var t = I.projectS(col + 0.5, row + 0.62, 0.30);
    I.ellipse(ctx, t[0], t[1] + 5, 7, 3, "#3a3a44");   // roof sign
  }
  function drawLimousine(ctx, col, row, scene, h) {
    wheeled(ctx, col, row, h.spec, "#7a3ad4", "#dff0ff", { cabinAtEnd: true });
  }
  function drawRacecar(ctx, col, row, scene, h) {
    // Low, pointed and small, with a speed streak: the read is "this one is
    // faster than the others", which is the whole point of including it.
    var body = "#e04a6a";
    hazardShadow(ctx, col, row, h.spec.len, 0.15);
    I.cubeFrac(ctx, col + 0.16, row + 0.16, 0.68, 0.26, 0.0, 0.12, I.shade(body, 0.55));
    I.cubeFrac(ctx, col + 0.20, row + 0.19, 0.60, 0.21, 0.12, 0.20, body);
    I.cubeFrac(ctx, col + 0.34, row + 0.21, 0.30, 0.17, 0.32, 0.12, "#2a2a32");
    I.cubeFrac(ctx, col + 0.14, row + 0.16, 0.20, 0.26, 0.10, 0.08, I.shade(body, 1.2));
    [[0.26, 0], [0.72, 0]].forEach(function (p) {
      var w = I.projectS(col + p[0], row + 0.22, 0.0);
      I.ellipse(ctx, w[0], w[1] + 3, 4.4, 4.4, "#1c1c20");
    });
    // Motion streak behind it, so speed is visible before it arrives.
    var st = I.projectS(col - 0.10, row + 0.40, 0.18);
    I.line(ctx, [[st[0] - 12, st[1] - 2], [st[0] - 2, st[1]]], "#ffffff", 2.0);
    I.line(ctx, [[st[0] - 10, st[1] + 3], [st[0] - 2, st[1] + 2]], "#ffffff", 1.4);
  }
  function drawPolice(ctx, col, row, scene, h) {
    wheeled(ctx, col, row, h.spec, "#f2f2f5", "#2a3a52", {});
    // The light bar: this obstacle's entire identity, and its telegraph.
    var b = I.projectS(col + 0.5, row + 0.52, 0.44);
    I.ellipse(ctx, b[0] - 5, b[1], 3.4, 2.4, "#ff4d3d");
    I.ellipse(ctx, b[0] + 5, b[1], 3.4, 2.4, "#4a9bff");
  }
  function drawTruck(ctx, col, row, scene, h) {
    // Cab plus a separate trailer: a long vehicle needs a visible joint or it
    // reads as one enormous car.
    var body = "#c94f3d", len = h.spec.len;
    hazardShadow(ctx, col, row, len, 0.18);
    I.cubeFrac(ctx, col + (1 - len) / 2, row + 0.10, len, 0.32, 0.0, 0.10, I.shade(body, 0.55));
    I.cubeFrac(ctx, col + (1 - len) / 2, row + 0.13, len * 0.34, 0.28, 0.10, 0.44, body);
    var cab = I.projectS(col + (1 - len) / 2 + len * 0.17, row + 0.40, 0.32);
    I.poly(ctx, [[cab[0] - 4, cab[1] - 3], [cab[0] + 4, cab[1] - 5],
                 [cab[0] + 4, cab[1] + 2], [cab[0] - 4, cab[1] + 3]], "#cfe6f5");
    I.cubeFrac(ctx, col + (1 - len) / 2 + len * 0.36, row + 0.10, len * 0.62, 0.34, 0.10, 0.52, "#e8e2d0");
    I.cubeFrac(ctx, col + (1 - len) / 2 + len * 0.36, row + 0.10, len * 0.62, 0.34, 0.62, 0.06, I.shade("#e8e2d0", 1.12));
    for (var i = 0; i < 4; i++) {
      var wx = col + (1 - len) / 2 + 0.06 + i * (len - 0.12) / 3;
      var w = I.projectS(wx, row + 0.16, 0.0);
      I.ellipse(ctx, w[0], w[1] + 3, 4.4, 4.4, "#1c1c20");
      I.ellipse(ctx, w[0], w[1] + 3, 2.0, 2.0, "#9aa0a8");
    }
  }
  function drawBus(ctx, col, row, scene, h) {
    var len = h.spec.len, body = "#3f8fd4";
    hazardShadow(ctx, col, row, len, 0.18);
    I.cubeFrac(ctx, col + (1 - len) / 2, row + 0.12, len, 0.32, 0.0, 0.10, I.shade(body, 0.55));
    I.cubeFrac(ctx, col + (1 - len) / 2, row + 0.16, len, 0.26, 0.10, 0.46, body);
    I.cubeFrac(ctx, col + (1 - len) / 2, row + 0.12, len, 0.32, 0.56, 0.07, I.shade(body, 1.14));
    // A row of windows: a bus is recognisable by its window band.
    var n = Math.max(3, Math.round(len * 2.4));
    for (var i = 0; i < n; i++) {
      var x = col + (1 - len) / 2 + (i + 0.5) * (len / n);
      var q = I.projectS(x, row + 0.42, 0.30);
      I.poly(ctx, [[q[0] - 4, q[1] - 2], [q[0] + 3, q[1] - 4],
                   [q[0] + 3, q[1] + 2], [q[0] - 4, q[1] + 4]], "#dff0ff");
    }
    for (var j = 0; j < 5; j++) {
      var wx2 = col + (1 - len) / 2 + 0.08 + j * (len - 0.16) / 4;
      var w2 = I.projectS(wx2, row + 0.18, 0.0);
      I.ellipse(ctx, w2[0], w2[1] + 3, 4.2, 4.2, "#1c1c20");
    }
  }
  function drawTractor(ctx, col, row, scene, h) {
    var body = "#5aa84f";
    hazardShadow(ctx, col, row, h.spec.len, 0.16);
    // Big rear wheel, small front: the silhouette that says tractor.
    I.cubeFrac(ctx, col + 0.16, row + 0.14, 0.62, 0.30, 0.0, 0.14, I.shade(body, 0.6));
    I.cubeFrac(ctx, col + 0.18, row + 0.16, 0.56, 0.26, 0.14, 0.34, body);
    I.cubeFrac(ctx, col + 0.70, row + 0.18, 0.24, 0.22, 0.14, 0.26, I.shade(body, 1.1));
    var big = I.projectS(col + 0.42, row + 0.30, 0.0);
    I.ellipse(ctx, big[0], big[1] + 2, 11, 11, "#1c1c20");
    I.ellipse(ctx, big[0], big[1] + 2, 5, 5, "#c8c8cc");
    var small = I.projectS(col + 0.80, row + 0.26, 0.0);
    I.ellipse(ctx, small[0], small[1] + 2, 5.5, 5.5, "#1c1c20");
  }
  function drawForklift(ctx, col, row, scene, h) {
    var body = "#e8b53d";
    hazardShadow(ctx, col, row, h.spec.len, 0.16);
    I.cubeFrac(ctx, col + 0.14, row + 0.16, 0.56, 0.28, 0.0, 0.12, I.shade(body, 0.6));
    I.cubeFrac(ctx, col + 0.18, row + 0.18, 0.46, 0.24, 0.12, 0.30, body);
    // Mast and forks at the front: the shape that says forklift.
    I.cubeFrac(ctx, col + 0.70, row + 0.18, 0.07, 0.26, 0.0, 0.62, "#8a8f98");
    I.cubeFrac(ctx, col + 0.74, row + 0.18, 0.16, 0.05, 0.02, 0.04, "#8a8f98");
    var cw = I.projectS(col + 0.30, row + 0.50, 0.0);
    I.ellipse(ctx, cw[0], cw[1] + 3, 6, 6, "#1c1c20");
  }
  function drawRoller(ctx, col, row, scene, h) {
    var body = "#e05c2b";
    hazardShadow(ctx, col, row, h.spec.len, 0.18);
    I.cubeFrac(ctx, col + 0.14, row + 0.16, 0.72, 0.30, 0.14, 0.34, body);
    I.cubeFrac(ctx, col + 0.34, row + 0.18, 0.30, 0.24, 0.48, 0.20, I.shade(body, 0.86));
    // The drum: one big roller across the front, not wheels.
    var d0 = I.projectS(col + 0.86, row + 0.30, 0.0);
    I.ellipse(ctx, d0[0], d0[1] + 3, 12, 12, "#3a3a42");
    I.ellipse(ctx, d0[0], d0[1] + 3, 6, 6, "#8a8f98");
    var b0 = I.projectS(col + 0.24, row + 0.30, 0.0);
    I.ellipse(ctx, b0[0], b0[1] + 3, 7, 7, "#1c1c20");
  }
  function drawTumbleweed(ctx, col, row, scene, h) {
    // A ragged ball, and it sweeps back and forth rather than driving off, so
    // it comes back and cannot be counted on.
    hazardShadow(ctx, col, row, h.spec.len, 0.14);
    var c = I.projectS(col + 0.5, row + 0.42, 0.22);
    I.ellipse(ctx, c[0], c[1], 12, 12, "#8a6a3a");
    for (var i = 0; i < 7; i++) {
      var a = i * 0.9;
      I.line(ctx, [[c[0] - Math.cos(a) * 11, c[1] - Math.sin(a) * 11],
                   [c[0] + Math.cos(a) * 11, c[1] + Math.sin(a) * 11]], "#5c4526", 1.8);
    }
  }
  function drawTrain(ctx, col, row, scene, h) {
    var body = h.spec.body || scene.hazard2;
    hazardShadow(ctx, col, row, h.spec.len, 0.20);
    I.cubeFrac(ctx, col + (1 - h.spec.len) / 2, row + 0.08, h.spec.len, 0.32, 0.0, 0.40, I.shade(body, 0.58));
    I.cubeFrac(ctx, col + (1 - h.spec.len) / 2 + 0.02, row + 0.10, h.spec.len - 0.04, 0.28, 0.40, 0.26, body);
    I.cubeFrac(ctx, col + (1 - h.spec.len) / 2, row + 0.08, h.spec.len, 0.32, 0.66, 0.07, I.shade(body, 1.14));
    var n = Math.max(3, Math.round(h.spec.len * 2.2));
    for (var i = 0; i < n; i++) {
      var x = col + (1 - h.spec.len) / 2 + (i + 0.5) * (h.spec.len / n);
      var q = I.projectS(x, row + 0.40, 0.52);
      I.poly(ctx, [[q[0] - 4, q[1] - 2], [q[0] + 3, q[1] - 4],
                   [q[0] + 3, q[1] + 3], [q[0] - 4, q[1] + 5]], "#dff0ff");
    }
  }
  function drawTram(ctx, col, row, scene, h) {
    // Street-level tram: shorter, lower, and lit from inside. It reads as a
    // cousin of the train rather than the same thing again.
    var body = h.spec.body || "#4ad9ff";
    hazardShadow(ctx, col, row, h.spec.len, 0.18);
    I.cubeFrac(ctx, col + (1 - h.spec.len) / 2, row + 0.10, h.spec.len, 0.30, 0.0, 0.14, I.shade(body, 0.6));
    I.cubeFrac(ctx, col + (1 - h.spec.len) / 2 + 0.02, row + 0.13, h.spec.len - 0.04, 0.26, 0.14, 0.38, body);
    var n = Math.max(3, Math.round(h.spec.len * 2.6));
    for (var i = 0; i < n; i++) {
      var x = col + (1 - h.spec.len) / 2 + (i + 0.5) * (h.spec.len / n);
      var q = I.projectS(x, row + 0.42, 0.32);
      I.poly(ctx, [[q[0] - 4, q[1] - 2], [q[0] + 3, q[1] - 4],
                   [q[0] + 3, q[1] + 3], [q[0] - 4, q[1] + 5]], "#fff3c0");
    }
    var pan = I.projectS(col + 0.5, row + 0.24, 0.60);
    I.line(ctx, [[pan[0] - 8, pan[1] - 12], [pan[0] + 8, pan[1] - 12]], "#8a8f98", 2.2);
  }
  function drawMonorail(ctx, col, row, scene, h) {
    var body = h.spec.body || "#9a7ad4";
    hazardShadow(ctx, col, row, h.spec.len, 0.18);
    I.cubeFrac(ctx, col + (1 - h.spec.len) / 2, row + 0.12, h.spec.len, 0.26, 0.0, 0.34, I.shade(body, 0.6));
    I.cubeFrac(ctx, col + (1 - h.spec.len) / 2 + 0.02, row + 0.15, h.spec.len - 0.04, 0.22, 0.34, 0.22, body);
    I.cubeFrac(ctx, col + (1 - h.spec.len) / 2, row + 0.12, h.spec.len, 0.26, 0.56, 0.06, I.shade(body, 1.2));
    var n = Math.max(3, Math.round(h.spec.len * 2.0));
    for (var i = 0; i < n; i++) {
      var x = col + (1 - h.spec.len) / 2 + (i + 0.5) * (h.spec.len / n);
      var q = I.projectS(x, row + 0.38, 0.42);
      I.ellipse(ctx, q[0], q[1], 3, 2.4, "#f0e8ff");
    }
  }
  function drawLog(ctx, col, row, scene, h) {
    var wood = scene.log || "#8a5a2b";
    I.cubeFrac(ctx, col + (1 - h.spec.len) / 2, row + 0.06, h.spec.len, 0.28, 0.0, 0.26, I.shade(wood, 0.80));
    I.cubeFrac(ctx, col + (1 - h.spec.len) / 2 + 0.02, row + 0.10, h.spec.len - 0.04, 0.24, 0.26, 0.14, wood);
    var e = I.projectS(col + 1 - (1 - h.spec.len) / 2, row + 0.5, 0.16);
    I.ellipse(ctx, e[0], e[1], 17, 9, I.shade(wood, 1.28));
    I.ellipse(ctx, e[0], e[1], 12, 6, I.shade(wood, 1.05));
    I.ellipse(ctx, e[0], e[1], 6, 3, I.shade(wood, 0.88));
  }
  function drawTurtle(ctx, col, row, scene, h) {
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
    var hd = I.projectS(col + 1, row + 0.5, 0.10);
    I.ellipse(ctx, hd[0], hd[1], 5.0, 4.0, I.shade(base, 1.45));
    I.ellipse(ctx, hd[0] + 1.5, hd[1] - 0.8, 1.4, 1.3, "#1b1b1b");
    I.ellipse(ctx, c[0] - 4, c[1] - 3, 4.5, 2.4, I.shade(base, 1.28));
  }
  function drawAlligator(ctx, col, row, scene, h) {
    // A long, low, dark shape with a ridge of scutes: unmistakably not a log.
    var g = "#2f5a3a", len = h.spec.len;
    I.ellipse(ctx, ...pt(col, row, 0.0), len * 26, 9, "#1a3a24");
    I.cubeFrac(ctx, col + (1 - len) / 2, row + 0.24, len, 0.26, 0.0, 0.14, g);
    I.cubeFrac(ctx, col + (1 - len) / 2, row + 0.24, len, 0.26, 0.14, 0.05, I.shade(g, 1.2));
    var scutes = Math.round(len * 5);
    for (var i = 0; i < scutes; i++) {
      var x = col + (1 - len) / 2 + (i + 0.5) * (len / scutes);
      var q = I.projectS(x, row + 0.5, 0.20);
      I.poly(ctx, [[q[0] - 2, q[1]], [q[0], q[1] - 4], [q[0] + 2, q[1]]], I.shade(g, 1.35));
    }
    var hd = I.projectS(col + 1 - (1 - len) / 2, row + 0.5, 0.10);
    I.ellipse(ctx, hd[0], hd[1], 7, 5, I.shade(g, 1.15));
    I.ellipse(ctx, hd[0] + 2, hd[1] - 1.5, 1.8, 1.8, "#ffd23d");
  }
  function drawCrocodile(ctx, col, row, scene, h) {
    // Same family as the alligator but wider, paler and with a bigger jaw.
    var g = "#4a6b3a", len = h.spec.len;
    I.ellipse(ctx, ...pt(col, row, 0.0), len * 28, 11, "#243d1c");
    I.cubeFrac(ctx, col + (1 - len) / 2, row + 0.22, len, 0.30, 0.0, 0.16, g);
    var jaw = I.projectS(col + 1 - (1 - len) / 2, row + 0.5, 0.06);
    I.poly(ctx, [[jaw[0] - 4, jaw[1] - 3], [jaw[0] + 6, jaw[1] + 1],
                 [jaw[0] - 4, jaw[1] + 4]], I.shade(g, 1.25));
    for (var i = 0; i < 7; i++) {
      var x = col + (1 - len) / 2 + (i + 0.5) * (len / 7);
      var q = I.projectS(x, row + 0.5, 0.18);
      I.poly(ctx, [[q[0] - 3, q[1] + 1], [q[0], q[1] - 6], [q[0] + 3, q[1] + 1]], I.shade(g, 1.4));
    }
  }
  function drawSnake(ctx, col, row, scene, h) {
    // A low undulating body with a head: nothing like a vehicle at any size.
    var b = "#7a4ad4";
    var pts = [];
    var n = 7;
    for (var i = 0; i <= n; i++) {
      var x = col + (i / n) * (1 - (1 - h.spec.len));
      var y = row + 0.5 + Math.sin(i * 0.9) * 0.10;
      var q = I.projectS(x, y, 0.08);
      pts.push([q[0], q[1]]);
    }
    I.line(ctx, pts, b, 7);
    I.line(ctx, pts, I.shade(b, 1.3), 3);
    var hd = I.projectS(col + 1 - (1 - h.spec.len), row + 0.5, 0.10);
    I.ellipse(ctx, hd[0], hd[1], 6, 5, b);
    I.ellipse(ctx, hd[0] + 2, hd[1] - 1.5, 1.5, 1.5, "#ffd23d");
    I.line(ctx, [[hd[0] + 4, hd[1] - 4], [hd[0] + 9, hd[1] - 6]], "#c94f3d", 1.6);
  }
  function drawBoulder(ctx, col, row, scene, h) {
    var b = I.shade(scene.ground, 0.62);
    I.ellipse(ctx, ...pt(col, row, 0.0), 20, 9, "rgba(0,0,0,0.18)");
    I.blob(ctx, col + 0.18, row + 0.20, 0.62, 0.56, 0.0, 0.42, b);
    I.blob(ctx, col + 0.34, row + 0.30, 0.34, 0.30, 0.40, 0.22, I.shade(b, 1.2));
  }
  /* A geyser and a steam vent: TIMED, not moving. They erupt on a beat and
   * are harmless between eruptions, which is a completely different thing to
   * read than a vehicle. The ground ring is the tell. */
  function drawGeyser(ctx, col, row, scene, h, up, tint) {
    var base = I.projectS(col + 0.5, row + 0.5, 0);
    // Always show the vent, so the beat can be read before it fires.
    I.ellipse(ctx, base[0], base[1], 14, 7, tint === "steam" ? "#6b6b73" : "#2a6b8a");
    I.ellipse(ctx, base[0], base[1], 9, 4.4, tint === "steam" ? "#3a3a42" : "#12405a");
    if (!up) {
      // Between eruptions: a faint ring showing when it will fire.
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(base[0], base[1], 18, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    var top = I.projectS(col + 0.5, row + 0.5, 1.25);
    var c = tint === "steam" ? "#e8e2d8" : "#7ad0ff";
    for (var i = 0; i < 3; i++) {
      var t = i / 2;
      I.line(ctx, [[base[0], base[1] - 4], [top[0], top[1] + 6]],
             c, 12 - i * 3);
    }
    I.ellipse(ctx, top[0], top[1] - 4, 12, 9, c);
    I.ellipse(ctx, top[0], top[1] - 6, 7, 5, "#ffffff");
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

  var HAZARD_FNS = {
    car: drawCar, taxi: drawTaxi, racecar: drawRacecar, police: drawPolice,
    limousine: drawLimousine, truck: drawTruck,
    bus: drawBus, tractor: drawTractor, forklift: drawForklift,
    roller: drawRoller, tumbleweed: drawTumbleweed,
    train: drawTrain, tram: drawTram, monorail: drawMonorail,
    log: drawLog, turtle: drawTurtle, alligator: drawAlligator,
    crocodile: drawCrocodile,
    snake: drawSnake, boulder: drawBoulder,
  };
  // The timed ones are not a plain lookup: what they draw depends on whether
  // they are UP this instant, which is the whole mechanic.
  var TIMED_FNS = {
    geyser: function (ctx, c, r, sc, h) {
      drawGeyser(ctx, c, r, sc, h, Hazards.isActive(h), "water");
    },
    steamvent: function (ctx, c, r, sc, h) {
      drawGeyser(ctx, c, r, sc, h, Hazards.isActive(h), "steam");
    },
  };

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
        hazards.push([sh.x, sh.row, sh.kind, sh]);
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
      var h = x[3];
      if (TIMED_FNS[x[2]]) { TIMED_FNS[x[2]](ctx, x[0], x[1], scene, h); return; }
      if (HAZARD_FNS[x[2]]) HAZARD_FNS[x[2]](ctx, x[0], x[1], scene, h);
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
    drawCar: drawCar, drawTaxi: drawTaxi, drawRacecar: drawRacecar,
    drawPolice: drawPolice, drawLimousine: drawLimousine,
    drawTruck: drawTruck, drawBus: drawBus, drawTractor: drawTractor,
    drawForklift: drawForklift, drawRoller: drawRoller,
    drawTumbleweed: drawTumbleweed,
    drawTrain: drawTrain, drawTram: drawTram, drawMonorail: drawMonorail,
    drawLog: drawLog, drawTurtle: drawTurtle, drawAlligator: drawAlligator,
    drawCrocodile: drawCrocodile, drawSnake: drawSnake, drawBoulder: drawBoulder,
    drawGeyser: drawGeyser,
    HAZARD_FNS: HAZARD_FNS, TIMED_FNS: TIMED_FNS,
    drawTree: drawTree, drawBush: drawBush, drawRock: drawRock,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
