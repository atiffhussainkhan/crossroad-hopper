/* src/scenery.js — the object vocabulary, per biome.
 *
 * The stage data declares scenery by NAME (src/stages.js: hedge, mailbox,
 * fence, haybale, pylon, iceberg, and so on). The renderer used to map
 * several of those onto three generic primitives, which is why Suburb rendered
 * as grass with green blobs: a "mailbox" was drawn as a bush.
 *
 * This registry gives every declared name its own object. Objects are drawn as
 * isometric masses in the same lighting convention as everything else, and they
 * are only ever placed on tiles that are NOT hazard lanes, so scenery never
 * sits where the player has to cross.
 *
 * Every entry is drawn back-to-front, and every entry casts a shadow through
 * Iso.castShadow with a height matched to the object, because a shadow at the
 * wrong scale is the single fastest way to make a fake object read as a decal.
 *
 * tools/check_art_assets.py asserts every name in STAGES[].scenery resolves
 * here, so a stage can never silently lose its scenery.
 */
(function (global) {
  "use strict";

  var I = global.Iso;

  // ---- Suburb -----------------------------------------------------------
  // Stage 1. These nine objects are the whole vocabulary of the stage, so each
  // one has to be recognisable from its silhouette alone at 64px wide.

  function hedge(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.34, 0.40, 0.20);
    var c = I.shade(scene.foliage, 0.90);
    I.blob(ctx, col + 0.10, row + 0.10, 0.80, 0.80, 0.0, 0.30, c);
    I.blob(ctx, col + 0.26, row + 0.26, 0.48, 0.48, 0.28, 0.18,
           I.shade(scene.foliage2, 0.98));
    // A clipped flat top is what separates a hedge from a bush.
    I.poly(ctx, quad(ctx, col + 0.26, row + 0.26, 0.48, 0.48, 0.46),
           I.shade(scene.foliage2, 1.12));
  }

  function tree(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 1.45, 0.62, 0.20);
    var trunk = scene.trunk || "#7a5433";
    I.cubeFrac(ctx, col + 0.44, row + 0.44, 0.12, 0.12, 0.0, 0.92, trunk);
    I.cubeFrac(ctx, col + 0.38, row + 0.38, 0.24, 0.24, 0.0, 0.10,
               I.shade(trunk, 0.80));
    var lobes = [[0.58, 0.86, 1.30, 0.46, 0.54, scene.foliage],
                 [0.44, 1.08, 1.50, 0.58, 0.46,
                  I.shade(scene.foliage2, 0.92)],
                 [0.30, 1.36, 1.72, 0.48, 0.60, scene.foliage2]];
    lobes.forEach(function (l) {
      I.blob(ctx, col + l[3], row + l[4], l[0], l[0], l[1], l[2] - l[1], l[5]);
    });
    var h = I.projectS(col + 0.42, row + 0.42, 1.30);
    I.ellipse(ctx, h[0], h[1], 9, 5, I.shade(scene.foliage2, 1.30));
  }

  function bush(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.30, 0.34, 0.18);
    var fol = scene.foliage;
    I.blob(ctx, col + 0.44, row + 0.50, 0.44, 0.44, 0.00, 0.30, fol);
    I.blob(ctx, col + 0.22, row + 0.52, 0.36, 0.36, 0.22, 0.42,
           I.shade(fol, 0.92));
    I.blob(ctx, col + 0.28, row + 0.44, 0.28, 0.28, 0.38, 0.54, scene.foliage2);
  }

  // A roadside mailbox: post, curved box, and a lifted red flag. The flag is
  // the detail that makes it read as a mailbox rather than as a bin.
  function mailbox(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.56, 0.30, 0.20);
    var post = "#6b4a2b";
    I.cubeFrac(ctx, col + 0.44, row + 0.44, 0.10, 0.10, 0.0, 0.44, post);
    // The box body, then its domed lid, then the flag on a short mast.
    I.cubeFrac(ctx, col + 0.26, row + 0.40, 0.44, 0.24, 0.44, 0.22, "#c94f3d");
    I.blob(ctx, col + 0.26, row + 0.40, 0.44, 0.24, 0.66, 0.06,
           I.shade("#c94f3d", 1.18));
    // A white letter slot so the front reads as a face, not a blank.
    var s = I.projectS(col + 0.26, row + 0.63, 0.56);
    I.poly(ctx, [[s[0] - 9, s[1] - 3], [s[0] + 1, s[1] - 5],
                 [s[0] + 1, s[1] - 2], [s[0] - 9, s[1]]], "#f2e6d8");
    I.cubeFrac(ctx, col + 0.60, row + 0.42, 0.04, 0.04, 0.66, 0.16, "#8a8f98");
    var f = I.projectS(col + 0.62, row + 0.42, 0.80);
    I.poly(ctx, [[f[0], f[1] - 11], [f[0] + 8, f[1] - 7], [f[0], f[1] - 2]],
           "#e8b53d");
  }

  // A house: a pitched roof over a lit body. Drawn wide and low, because a
  // house seen in this projection is mostly roof.
  function house(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.80, 0.46, 0.24);
    var wall = "#e6dcc8";
    I.cubeFrac(ctx, col + 0.12, row + 0.12, 0.76, 0.76, 0.0, 0.58, wall);
    // Roof: a wider, shorter block reads as an overhang.
    I.cubeFrac(ctx, col + 0.08, row + 0.08, 0.84, 0.84, 0.58, 0.14, "#8a4a3a");
    I.cubeFrac(ctx, col + 0.16, row + 0.16, 0.68, 0.68, 0.72, 0.10, "#a05a44");
    var ridge = I.projectS(col + 0.5, row + 0.5, 0.82);
    I.line(ctx, [[ridge[0] - 22, ridge[1] + 11], [ridge[0], ridge[1]],
                 [ridge[0] + 22, ridge[1] + 11]], "#6f3a2d", 2.5);
    // Chimney, because an unbroken roof box reads as a shed.
    I.cubeFrac(ctx, col + 0.58, row + 0.26, 0.12, 0.12, 0.82, 0.26, "#7a6a5c");
    // Lit window on the left face and a door on the right face.
    var w = I.projectS(col + 0.12, row + 0.34, 0.30);
    I.poly(ctx, [[w[0], w[1] - 6], [w[0] - 8, w[1]], [w[0] - 8, w[1] + 8],
                 [w[0], w[1] + 2]], "#ffe9a8");
    var d = I.projectS(col + 0.88, row + 0.30, 0.24);
    I.poly(ctx, [[d[0], d[1] - 10], [d[0] + 10, d[1] - 4],
                 [d[0] + 10, d[1] + 6], [d[0], d[1]]], "#5c4a3a");
  }

  // A picket fence: posts, a top rail, and pointed caps. The gaps are the
  // whole point -- a solid block would just be a wall.
  function fence(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.36, 0.28, 0.16);
    for (var i = 0; i < 4; i++) {
      var x = col + 0.10 + i * 0.22;
      I.cubeFrac(ctx, x, row + 0.32, 0.11, 0.11, 0.0, 0.34, "#e8e0cc");
      I.cubeFrac(ctx, x, row + 0.32, 0.11, 0.11, 0.34, 0.05, "#f4ecda");
      var t = I.projectS(x + 0.055, row + 0.375, 0.39);
      I.poly(ctx, [[t[0], t[1] - 5], [t[0] - 4, t[1]], [t[0] + 4, t[1]]],
             "#f4ecda");
    }
    I.cubeFrac(ctx, col + 0.08, row + 0.32, 0.84, 0.05, 0.20, 0.05, "#d8cfb8");
  }

  // A street lamp: pole, arm, and a lit head with a pool of light on the tile.
  function streetlamp(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 1.34, 0.50, 0.18);
    I.cubeFrac(ctx, col + 0.44, row + 0.44, 0.10, 0.10, 0.0, 1.30, "#4a4f56");
    I.cubeFrac(ctx, col + 0.34, row + 0.44, 0.20, 0.10, 1.24, 0.08, "#5a6068");
    var h = I.projectS(col + 0.42, row + 0.50, 1.30);
    // A warm pool on the ground under the head, then the head itself.
    var g = I.projectS(col + 0.42, row + 0.52, 0.0);
    I.ellipse(ctx, g[0], g[1], 17, 8, "rgba(255,233,168,0.14)");
    I.ellipse(ctx, h[0], h[1], 11, 6, "#ffe9a8");
    I.ellipse(ctx, h[0], h[1] - 2, 7, 4, "#fff6d8");
  }

  // A flower bed: a low stone border with a soil fill and three colour dots.
  function flowerbed(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.14, 0.22, 0.14);
    I.cubeFrac(ctx, col + 0.16, row + 0.18, 0.68, 0.64, 0.0, 0.10, "#b8b0a0");
    I.cubeFrac(ctx, col + 0.22, row + 0.24, 0.56, 0.52, 0.10, 0.03, "#5c4a38");
    var cols = ["#e05c8a", "#ffd23d", "#7ad0ff"];
    for (var i = 0; i < 3; i++) {
      var base = I.projectS(col + 0.32 + i * 0.18, row + 0.46, 0.13);
      I.line(ctx, [[base[0], base[1]], [base[0], base[1] - 7]], "#4a7a3a", 1.6);
      I.ellipse(ctx, base[0], base[1] - 8, 3.2, 2.6, cols[i]);
    }
  }

  // A parked car: static, so it never moves and never kills. Scenery that
  // reads as traffic without being a hazard is the point.
  function parkedcar(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.62, 0.52, 0.22);
    var body = scene.hazard2 || "#8a9099";
    I.cubeFrac(ctx, col + 0.06, row + 0.14, 0.84, 0.30, 0.0, 0.20,
               I.shade(body, 0.62));
    I.cubeFrac(ctx, col + 0.10, row + 0.18, 0.76, 0.26, 0.20, 0.16, body);
    I.cubeFrac(ctx, col + 0.26, row + 0.22, 0.34, 0.22, 0.36, 0.20,
               I.shade(body, 0.86));
    I.cubeFrac(ctx, col + 0.26, row + 0.22, 0.34, 0.22, 0.56, 0.06,
               I.shade(body, 1.16));
    var g = I.projectS(col + 0.26, row + 0.43, 0.50);
    I.poly(ctx, [[g[0], g[1] - 1], [g[0] + 9, g[1] + 5], [g[0] + 9, g[1] + 10],
                 [g[0], g[1] + 4]], "#cfe6f5");
    [0.18, 0.42].forEach(function (dr) {
      var w = I.projectS(col + 0.16, row + dr, 0.0);
      I.ellipse(ctx, w[0], w[1] + 4, 4.4, 4.4, "#1c1c20");
      I.ellipse(ctx, w[0], w[1] + 4, 2.0, 2.0, "#8d9096");
    });
  }

  // ---- River ------------------------------------------------------------

  function reed(ctx, col, row, scene) {
    // Reeds are tall and thin, so they cast almost no ground shadow.
    I.castShadow(ctx, col, row, 0.90, 0.20, 0.10);
    var fol = scene.foliage || "#2f6b40";
    for (var i = 0; i < 5; i++) {
      var lean = (i - 2) * 2.2;
      var p = I.projectS(col + 0.30 + i * 0.11, row + 0.52, 0.0);
      var h = 22 + ((i * 7) % 11);
      I.line(ctx, [[p[0], p[1]], [p[0] + lean, p[1] - h]],
             I.shade(fol, 0.82 + i * 0.06), 2.2);
      I.ellipse(ctx, p[0] + lean, p[1] - h - 3, 2.0, 3.4,
                I.shade(fol, 1.15));
    }
  }

  // A flat river stone: wet, so it takes a highlight rather than a hard top.
  function rock(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.34, 0.38, 0.18);
    var base = I.shade(scene.ground, 0.72);
    I.blob(ctx, col + 0.28, row + 0.30, 0.44, 0.40, 0.0, 0.34, base);
    I.blob(ctx, col + 0.52, row + 0.56, 0.24, 0.22, 0.28, 0.20,
           I.shade(base, 1.10));
    var w = I.projectS(col + 0.40, row + 0.42, 0.34);
    I.ellipse(ctx, w[0], w[1], 5, 2.4, I.shade(base, 1.34));
  }

  // ---- Desert -----------------------------------------------------------

  function cactus(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 1.30, 0.48, 0.20);
    var b = scene.foliage || "#5f8a3f";
    I.cubeFrac(ctx, col + 0.42, row + 0.42, 0.18, 0.18, 0.0, 1.30, b);
    // Arms: a lower left one and an upper right one, the classic saguaro read.
    I.cubeFrac(ctx, col + 0.18, row + 0.42, 0.24, 0.16, 0.42, 0.46,
               I.shade(b, 0.86));
    I.cubeFrac(ctx, col + 0.18, row + 0.42, 0.16, 0.16, 0.42, 0.62, b);
    I.cubeFrac(ctx, col + 0.42, row + 0.18, 0.16, 0.24, 0.66, 0.42,
               I.shade(b, 0.70));
    I.cubeFrac(ctx, col + 0.42, row + 0.18, 0.16, 0.16, 0.66, 0.86, b);
    I.blob(ctx, col + 0.42, row + 0.42, 0.18, 0.18, 1.20, 0.14, b);
    var fl = I.projectS(col + 0.51, row + 0.51, 1.30);
    I.ellipse(ctx, fl[0], fl[1] + 2, 3.2, 2.4, "#e05c8a");
  }

  function haybale(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.46, 0.42, 0.20);
    I.cubeFrac(ctx, col + 0.20, row + 0.24, 0.60, 0.52, 0.0, 0.44, "#c9a34d");
    // The cut end faces the camera, so the spiral is what sells "bale".
    var x = I.projectS(col + 0.80, row + 0.50, 0.22);
    I.ellipse(ctx, x[0], x[1], 15, 9, "#e0bd66");
    I.ellipse(ctx, x[0], x[1], 9, 5.5, "#c9a34d");
    I.ellipse(ctx, x[0], x[1], 4, 2.4, "#a8863c");
    for (var i = 0; i < 3; i++) {
      var top = I.projectS(col + 0.34 + i * 0.16, row + 0.40, 0.46);
      I.line(ctx, [[top[0], top[1] - 2], [top[0], top[1] + 5]], "#b8913f", 1.4);
    }
  }

  // A bleached skull: the Desert's one piece of character.
  function bone(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.22, 0.30, 0.16);
    var b = "#e6dfcb";
    var s = I.projectS(col + 0.5, row + 0.5, 0.0);
    I.ellipse(ctx, s[0], s[1] - 5, 10, 8, b);
    I.ellipse(ctx, s[0] - 3.5, s[1] - 6, 2.6, 3.0, "#2a2620");
    I.ellipse(ctx, s[0] + 3.5, s[1] - 6, 2.6, 3.0, "#2a2620");
    I.poly(ctx, [[s[0] - 4, s[1] + 1], [s[0] + 4, s[1] + 1],
                 [s[0] + 2, s[1] + 4], [s[0] - 2, s[1] + 4]],
           I.shade(b, 0.86));
    [0.30, 0.70].forEach(function (d) {
      var r = I.projectS(col + 0.5, row + d + 0.1, 0.0);
      I.line(ctx, [[r[0] - 12, r[1] + 4], [r[0] + 10, r[1] - 1]], b, 3.0);
    });
  }

  // ---- Winter -----------------------------------------------------------

  function pine(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 1.40, 0.52, 0.20);
    var fol = scene.foliage || "#3d6b5a";
    I.cubeFrac(ctx, col + 0.45, row + 0.45, 0.10, 0.10, 0.0, 0.34,
               scene.trunk || "#5a4636");
    // Tiers run bottom to top, and light comes from above, so the SHADE
    // FACTOR MUST RISE WITH INDEX. Writing it as a falling factor paints the
    // lowest tier pure black, which is what the first draft did.
    var tiers = [[0.34, 0.74, 0.62, 0.80],
                 [0.28, 1.06, 0.50, 0.92],
                 [0.20, 1.38, 0.36, 1.02]];
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i];
      var x = I.projectS(col + 0.5, row + 0.5, t[1]);
      I.poly(ctx, [[x[0], x[1] - t[2] * 20], [x[0] - t[2] * 34, x[1] + 5],
                   [x[0] + t[2] * 34, x[1] + 5]], I.shade(fol, t[3]));
      // Snow on the upward face of each tier.
      I.poly(ctx, [[x[0], x[1] - t[2] * 20], [x[0] - t[2] * 16, x[1] - 2],
                   [x[0], x[1] - 5], [x[0] + t[2] * 16, x[1] - 2]],
             "rgba(255,255,255,0.72)");
    }
  }

  // An iceberg: angular and translucent, NOT a grey rock. The silhouette
  // has to differ from rock() at a glance, so it is a tall shard cluster.
  function iceberg(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.80, 0.44, 0.20);
    var ice = "#bfe4f2";
    I.poly(ctx, shard(ctx, col + 0.18, row + 0.30, 0.44, 0.40, 0.80),
           I.shade(ice, 0.78));
    I.poly(ctx, shard(ctx, col + 0.40, row + 0.40, 0.40, 0.44, 0.56),
           I.shade(ice, 0.90));
    I.poly(ctx, shard(ctx, col + 0.26, row + 0.22, 0.30, 0.28, 1.06),
           "#e8f6fb");
    I.poly(ctx, shard(ctx, col + 0.52, row + 0.52, 0.24, 0.22, 0.40),
           I.shade(ice, 1.06));
  }

  // ---- Industrial -------------------------------------------------------

  function cone(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.34, 0.26, 0.18);
    var x = I.projectS(col + 0.5, row + 0.5, 0.0);
    I.ellipse(ctx, x[0], x[1] + 6, 13, 4.5, "#c25220");
    I.poly(ctx, [[x[0], x[1] - 28], [x[0] - 12, x[1] + 6],
                 [x[0] + 12, x[1] + 6]], "#f26a2b");
    I.poly(ctx, [[x[0], x[1] - 16], [x[0] - 7, x[1] - 2],
                 [x[0] + 7, x[1] - 2]], "#f4f0e8");
    I.ellipse(ctx, x[0], x[1] + 6, 6, 2.2, "#e05c28");
  }

  function crate(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.40, 0.32, 0.20);
    I.cubeFrac(ctx, col + 0.22, row + 0.24, 0.56, 0.52, 0.0, 0.34, "#a87a3a");
    I.cubeFrac(ctx, col + 0.22, row + 0.24, 0.56, 0.52, 0.34, 0.06,
               I.shade("#a87a3a", 1.14));
    // Corner banding, so it reads as a crate and not a plain box.
    var a = I.projectS(col + 0.22, row + 0.24, 0.40);
    I.line(ctx, [[a[0] - 17, a[1] + 9], [a[0] - 17, a[1] + 16]], "#7a5628", 2.2);
    I.line(ctx, [[a[0] + 15, a[1] - 6], [a[0] + 15, a[1] + 1]], "#7a5628", 2.2);
  }

  function scaffold(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 1.20, 0.50, 0.20);
    var steel = "#c98a3d";
    for (var i = 0; i < 4; i++) {
      I.cubeFrac(ctx, col + 0.12 + i * 0.22, row + 0.22, 0.07, 0.58, 0.0,
                 1.10, I.shade(steel, 0.94));
    }
    I.cubeFrac(ctx, col + 0.10, row + 0.20, 0.80, 0.62, 0.54, 0.08, "#d89a4d");
    I.cubeFrac(ctx, col + 0.10, row + 0.20, 0.80, 0.62, 1.08, 0.08, "#d89a4d");
    // A diagonal brace is what makes a frame read as a scaffold.
    var b0 = I.projectS(col + 0.16, row + 0.24, 0.62);
    var b1 = I.projectS(col + 0.70, row + 0.24, 1.06);
    I.line(ctx, [[b0[0], b0[1]], [b1[0], b1[1]]], "#b87c33", 2.6);
  }

  // A power pylon: a tapering lattice mast with two cross-arms.
  function pylon(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 1.60, 0.54, 0.18);
    var steel = "#5a6470";
    var legs = [0.22, 0.38, 0.62, 0.78];
    legs.forEach(function (d) {
      var b = I.projectS(col + 0.5, row + d, 0.0);
      var t = I.projectS(col + 0.5, row + d, 1.60);
      I.line(ctx, [[b[0], b[1]], [t[0], t[1]]], steel, 2.0);
    });
    [0.86, 1.22].forEach(function (h, k) {
      var l = I.projectS(col + 0.24, row + 0.5, h);
      var r = I.projectS(col + 0.76, row + 0.5, h);
      I.line(ctx, [[l[0], l[1]], [r[0], r[1]]], steel, 2.4);
      // Insulator hangs.
      [-1, 1].forEach(function (s) {
        var p = I.projectS(col + 0.5 + s * 0.20, row + 0.5, h);
        I.line(ctx, [[p[0], p[1]], [p[0], p[1] + 6]], "#8fd8e8", 1.6);
      });
      if (k === 0) {
        var z0 = I.projectS(col + 0.24, row + 0.5, h);
        var z1 = I.projectS(col + 0.5, row + 0.24, h + 0.34);
        I.line(ctx, [[z0[0], z0[1]], [z1[0], z1[1]]], steel, 1.6);
      }
    });
    var top = I.projectS(col + 0.5, row + 0.5, 1.60);
    I.ellipse(ctx, top[0], top[1], 3, 3, "#8fd8e8");
  }

  // ---- Night City (stage 5) --------------------------------------------

  function building(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 2.30, 0.56, 0.26);
    var body = "#39415a";
    I.cubeFrac(ctx, col + 0.14, row + 0.14, 0.72, 0.72, 0.0, 2.10, body);
    I.cubeFrac(ctx, col + 0.10, row + 0.10, 0.80, 0.80, 2.10, 0.14,
               I.shade(body, 1.16));
    // Lit windows in a grid. The deterministic pattern keeps every building
    // different-looking without needing per-building state.
    for (var f = 0; f < 4; f++) {
      for (var s = 0; s < 3; s++) {
        if ((f * 3 + s * 5 + col + row) % 4 === 0) continue;
        var wl = I.projectS(col + 0.14, row + 0.22 + s * 0.20, 0.36 + f * 0.42);
        I.poly(ctx, [[wl[0] - 5, wl[1] - 2], [wl[0], wl[1] - 6],
                     [wl[0], wl[1] + 1], [wl[0] - 5, wl[1] + 3]],
               (f + s) % 3 === 0 ? "#ffe9a8" : "#8fd8e8");
      }
    }
    var roof = I.projectS(col + 0.5, row + 0.5, 2.24);
    I.ellipse(ctx, roof[0], roof[1], 3, 3, "#ff6b6b");
  }

  // A neon sign: a dark panel with a glowing outline. The glow is drawn as
  // three concentric strokes, which is the cheapest convincing bloom on 2D.
  function neon(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.70, 0.26, 0.22);
    var post = "#39415a";
    I.cubeFrac(ctx, col + 0.28, row + 0.44, 0.08, 0.08, 0.0, 0.52, post);
    var hue = ["#ff4d8a", "#4ad9ff", "#ffd23d", "#7ac94f"];
    var c = hue[(col + row) % hue.length];
    var p0 = I.projectS(col + 0.10, row + 0.44, 0.52);
    var p1 = I.projectS(col + 0.72, row + 0.44, 0.52);
    var p2 = I.projectS(col + 0.72, row + 0.44, 1.06);
    var p3 = I.projectS(col + 0.10, row + 0.44, 1.06);
    I.poly(ctx, [p0, p1, p2, p3], I.shade(post, 0.70));
    [11, 7, 3.5].forEach(function (w, k) {
      I.line(ctx, [[p0[0], p0[1]], [p1[0], p1[1]], [p2[0], p2[1]], [p3[0], p3[1]]],
             k === 2 ? "#ffffff" : c, w);
    });
  }

  // ---- Volcano (stage 10) ----------------------------------------------

  function lavaVent(ctx, col, row, scene) {
    // Emissive, so it casts no shadow -- it is its own light source.
    var x = I.projectS(col + 0.5, row + 0.5, 0.0);
    I.ellipse(ctx, x[0], x[1] + 2, 22, 11, "rgba(255,120,26,0.22)");
    I.ellipse(ctx, x[0], x[1], 15, 7.5, "#6a2a18");
    I.ellipse(ctx, x[0], x[1], 10, 5, "#ff7a1a");
    I.ellipse(ctx, x[0], x[1], 5, 2.4, "#ffe9a8");
    // A spatter arc, drawn as a few short strokes off the lip.
    for (var i = 0; i < 5; i++) {
      var a = I.projectS(col + 0.5, row + 0.5, 0.0);
      var ang = -2.2 + i * 0.5;
      I.line(ctx, [[a[0], a[1]], [a[0] + Math.cos(ang) * 14,
                  a[1] + Math.sin(ang) * 9 - 4]], "#ff9a2e", 1.8);
    }
  }

  function obsidian(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.50, 0.36, 0.26);
    var o = "#2a1a20";
    I.poly(ctx, shard(ctx, col + 0.22, row + 0.30, 0.50, 0.44, 0.46),
           I.shade(o, 0.86));
    I.poly(ctx, shard(ctx, col + 0.36, row + 0.38, 0.40, 0.36, 0.70), o);
    // A specular glint, which is what makes obsidian read as glassy.
    var g = I.projectS(col + 0.46, row + 0.46, 0.62);
    I.poly(ctx, [[g[0], g[1] - 7], [g[0] - 4, g[1] - 1],
                 [g[0] - 1, g[1] - 1]], "#8a6a7a");
  }

  function boulder(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.52, 0.42, 0.24);
    var b = I.shade(scene.ground, 0.66);
    I.blob(ctx, col + 0.20, row + 0.22, 0.62, 0.58, 0.0, 0.34, b);
    I.blob(ctx, col + 0.34, row + 0.36, 0.44, 0.40, 0.30, 0.26,
           I.shade(b, 1.12));
    I.blob(ctx, col + 0.44, row + 0.44, 0.24, 0.22, 0.52, 0.16,
           I.shade(b, 1.24));
  }

  function debris(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.16, 0.30, 0.16);
    var base = I.shade(scene.ground, 0.60);
    [[0.24, 0.28, 0.20, 0.18], [0.48, 0.44, 0.16, 0.14],
     [0.36, 0.62, 0.13, 0.12], [0.60, 0.26, 0.10, 0.10]]
      .forEach(function (d, i) {
        I.cubeFrac(ctx, col + d[0], row + d[1], d[2], d[3], 0.0,
                   0.10 + (i % 2) * 0.06, I.shade(base, 1 + i * 0.06));
      });
  }

  // ---- Rainforest (stage 7) --------------------------------------------

  function vine(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 1.60, 0.24, 0.14);
    var v = scene.foliage2 || "#357a42";
    // Two hanging strands with a leaf at intervals.
    for (var s = 0; s < 2; s++) {
      var x = col + 0.34 + s * 0.26;
      var top = I.projectS(x, row + 0.5, 1.60);
      var bot = I.projectS(x + (s ? 0.06 : -0.06), row + 0.5, 0.10);
      I.line(ctx, [[top[0], top[1]], [bot[0], bot[1]]],
             I.shade(v, 0.88), 2.2);
      for (var k = 0; k < 4; k++) {
        var t = 0.18 + k * 0.24;
        var lp = I.projectS(x, row + 0.5, 1.60 * (1 - t) + 0.10 * t);
        I.ellipse(ctx, lp[0] + (k % 2 ? 5 : -5), lp[1], 5, 2.8,
                  I.shade(v, 1 + k * 0.05));
      }
    }
  }

  function fern(ctx, col, row, scene) {
    I.castShadow(ctx, col, row, 0.40, 0.40, 0.18);
    var f = scene.foliage2 || "#357a42";
    var c = I.projectS(col + 0.5, row + 0.5, 0.0);
    for (var i = 0; i < 7; i++) {
      var ang = -Math.PI + (i / 6) * Math.PI;
      var len = 20 - Math.abs(i - 3) * 2.5;
      var ex = c[0] + Math.cos(ang) * len, ey = c[1] + Math.sin(ang) * len * 0.55;
      I.line(ctx, [[c[0], c[1]], [ex, ey]], I.shade(f, 0.80 + i * 0.03), 2.0);
      I.ellipse(ctx, (c[0] + ex) / 2, (c[1] + ey) / 2, 4.5, 2.4,
                I.shade(f, 1.10));
    }
  }

  // ---- Rainfall (stage 9) ----------------------------------------------

  function puddle(ctx, col, row, scene) {
    // Flat, so it takes no height -- but it still needs a rim highlight or it
    // reads as a hole in the ground.
    var x = I.projectS(col + 0.5, row + 0.5, 0.012);
    I.ellipse(ctx, x[0], x[1], 20, 9, "rgba(60,110,140,0.55)");
    I.ellipse(ctx, x[0] - 3, x[1] - 2, 12, 5, "rgba(140,200,230,0.30)");
  }

  // ---- geometry helpers -------------------------------------------------

  // A flat tile-shaped quad at height z, used for clipped tops and highlights.
  function quad(ctx, col, row, sizeCol, sizeRow, z) {
    return [I.projectS(col, row, z),
            I.projectS(col + sizeCol, row, z),
            I.projectS(col + sizeCol, row + sizeRow, z),
            I.projectS(col, row + sizeRow, z)];
  }

  // An irregular 5-point shard. A deterministic jitter on the corners keeps
  // ice and obsidian from looking like the same two triangles every time,
  // without needing a random source that would differ between runs.
  function shard(ctx, col, row, sizeCol, sizeRow, height) {
    var jit = [[0.06, 0.10], [0.94, 0.02], [1.00, 0.52], [0.58, 1.00], [0.02, 0.66]];
    var peak = [[0.42, 0.40]];
    var pts = jit.map(function (f) {
      return I.projectS(col + f[0] * sizeCol, row + f[1] * sizeRow, 0.0);
    });
    var top = I.projectS(col + peak[0][0] * sizeCol,
                         row + peak[0][1] * sizeRow, height);
    // A 3D-looking shard: the two lower side edges, then the peak.
    return [pts[3], pts[4], top, pts[2], pts[1]];
  }

  // ---- registry ---------------------------------------------------------
  //
  // Keys are the names stages.js declares. Every one of them must resolve;
  // tools/check_art_assets.py enforces that.

  var REGISTRY = {
    // Suburb
    tree: tree, hedge: hedge, bush: bush, mailbox: mailbox, house: house,
    fence: fence, streetlamp: streetlamp, flowerbed: flowerbed,
    parkedcar: parkedcar,
    // River
    reed: reed, rock: rock,
    // Desert
    cactus: cactus, bone: bone,
    // Farmland
    haybale: haybale,
    // Night City
    neon: neon, building: building,
    // Frozen Lake
    pine: pine, iceberg: iceberg,
    // Rainforest
    vine: vine, fern: fern,
    // Construction
    scaffold: scaffold, cone: cone, crate: crate,
    // Storm
    pylon: pylon, puddle: puddle,
    // Volcano
    lavaVent: lavaVent, obsidian: obsidian, boulder: boulder, debris: debris,
  };

  function draw(kind, ctx, col, row, scene) {
    var fn = REGISTRY[kind];
    if (!fn) return false;
    fn(ctx, col, row, scene);
    return true;
  }

  function has(kind) { return !!REGISTRY[kind]; }

  function kinds() { return Object.keys(REGISTRY); }

  global.Scenery = {
    draw: draw, has: has, kinds: kinds, REGISTRY: REGISTRY,
  };
})(typeof window !== "undefined" ? window
   : (typeof global !== "undefined" ? global : this));
