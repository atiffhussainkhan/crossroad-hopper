/* src/render/character.js — the roster drawn on the game canvas.
 *
 * A direct port of the Python draw_character, with the seven fixes the roster
 * audit forced. The characters are separated by SILHOUETTE, not by colour, so
 * all six stay distinguishable in greyscale and at phone size.
 *
 *   - The solid dark outline prism is GONE. It was the largest block of shared
 *     pixels in the roster and the reason every character read as a box with
 *     eyes stuck on the front. A keyline does the same job without filling the
 *     silhouette.
 *   - Eyes are 4.3 units, not 6.2. At 6.2 they were 149-176 percent of the
 *     face height and spilled off it.
 *   - The mouth is an arc, not a trapezoid. The old trapezoid narrowed
 *     downward, which is frown geometry, and read as a grimace.
 *   - Cob's horn is a stepped BLOCK. He and Pip were both two triangles and
 *     their silhouettes overlapped by 89 percent.
 *   - Fizz's sprig draws leaf polygons. Two straight lines read as insect
 *     antennae, and the comment claimed leaves it never drew.
 *   - Mozz's round ears sit further apart and smaller; they previously
 *     overlapped by 11.6px and fused into one cloud.
 *   - Every ear height multiplies by scale. Two of the six ignored it, so
 *     Pip's ear was 21px at every sprite size.
 */
(function (global) {
  "use strict";

  var I = global.Iso;
  var OUTLINE = "#3a2410";

  function zz(z, h, scale) { return (z + h) * scale; }

  function drawCharacter(ctx, col, row, scale, ch) {
    scale = scale === undefined ? 1 : scale;
    ch = ch || (global.Roster ? global.Roster.getCharacter("pip") : {
      body: "#f7e3c8", accent: "#2fbfa0", ear: "#f0b9c0", mark: "#ffffff",
      bodyW: 0.56, bodyH: 0.28, headW: 0.64, headH: 0.36,
      ear: "triangle", earScale: 1, eyeScale: 1,
    });

    var body = ch.body, accent = ch.accent, earC = ch.ear;
    var bw = ch.bodyW, bh = ch.bodyH, hw = ch.headW, hh = ch.headH;
    var es = ch.earScale, ys = ch.eyeScale;
    // A head wider than the body hides the body completely, which is how four
    // of the six became a head with eyes in a crate.
    bw = Math.max(bw, hw);

    I.castShadow(ctx, col, row, 0.90, 0.42);

    // Feet, body, scarf, head: strictly increasing z, decreasing occlusion.
    I.cubeFrac(ctx, col + (1 - bw * 0.7) / 2, row + (1 - bw * 0.7) / 2, bw * 0.7, bw * 0.7,
               zz(0, 0, scale), 0.10 * scale, I.shade(body, 0.66));
    I.cubeFrac(ctx, col + (1 - bw) / 2, row + (1 - bw) / 2, bw, bw,
               zz(0, 0.10, scale), (bh - 0.10) * scale, body);
    I.cubeFrac(ctx, col + (1 - bw) / 2, row + (1 - bw) / 2, bw, bw,
               zz(0, bh, scale), 0.09 * scale, accent);
    I.cubeFrac(ctx, col + (1 - hw) / 2, row + (1 - hw) / 2, hw, hw,
               zz(0, bh + 0.09, scale), (hh - 0.09) * scale, I.shade(body, 1.10));

    var headZ = bh + hh;
    var hcx = I.projectS(col + 0.5, row + 0.5, headZ)[0];
    var hcy = I.projectS(col + 0.5, row + 0.5, headZ)[1];
    var spread = (hw / 2) * 32 * scale +
                 (ch.ear === "round" ? 7 * scale : 3);

    // --- silhouette-defining feature -------------------------------------
    if (ch.ear === "triangle") {
      [-1, 1].forEach(function (sx) {
        var ex = hcx + sx * spread * 0.92, h = 21 * es * scale;
        I.poly(ctx, [[ex, hcy - h], [ex - 10 * es * scale, hcy + 3 * scale],
                     [ex + 10 * es * scale, hcy + 3 * scale]], body);
        I.poly(ctx, [[ex, hcy - h * 0.62], [ex - 5 * es * scale, hcy + 2 * scale],
                     [ex + 5 * es * scale, hcy + 2 * scale]], earC);
      });
    } else if (ch.ear === "tall") {
      [-1, 1].forEach(function (sx) {
        var ex = hcx + sx * spread * 0.66, h = 40 * es * scale;
        I.ellipse(ctx, ex, hcy - h * 0.5, 8 * es * scale, h * 0.5, body);
        I.ellipse(ctx, ex, hcy - h * 0.5, 4 * es * scale, h * 0.34, earC);
      });
    } else if (ch.ear === "round") {
      [-1, 1].forEach(function (sx) {
        var ex = hcx + sx * spread * 0.95;
        I.ellipse(ctx, ex, hcy - 5 * scale, 10 * es * scale, 10 * es * scale, body);
        I.ellipse(ctx, ex, hcy - 5 * scale, 5 * es * scale, 5 * es * scale, earC);
      });
    } else if (ch.ear === "horn") {
      [-1, 1].forEach(function (sx) {
        var ex = hcx + sx * spread * 0.78;
        // A stepped block, not a triangle. Pip has triangles; giving Cob one
        // too is what made the two silhouettes 89 percent identical.
        [[9, 8], [7, 7], [5, 6]].forEach(function (seg, k) {
          var bx = ex - sx * (6 + k * 8) * es * scale;
          var by = hcy - 1 * scale - k * 9 * es * scale;
          I.poly(ctx, [[bx - seg[0] * es * scale / 2, by - seg[1] * es * scale],
                       [bx + seg[0] * es * scale / 2, by - seg[1] * es * scale],
                       [bx + seg[0] * es * scale / 2, by],
                       [bx - seg[0] * es * scale / 2, by]],
                 I.shade(body, 1.0 - k * 0.06));
        });
      });
    } else if (ch.ear === "flop") {
      [[-20, 34, 11], [-48, 26, 9]].forEach(function (L) {
        var a = L[0] * Math.PI / 180, ln = L[1], lw = L[2];
        var ax = hcx + Math.cos(a) * ln * es * scale;
        var ay = hcy + Math.sin(a) * ln * es * scale;
        var px = -Math.sin(a), py = Math.cos(a);
        I.poly(ctx, [[hcx, hcy + 2 * scale],
                     [ax + px * lw * es * scale, ay + py * lw * es * scale],
                     [ax + (ax - hcx) * 0.35, ay + (ay - hcy) * 0.35],
                     [ax - px * lw * es * scale, ay - py * lw * es * scale]], accent);
      });
    } else if (ch.ear === "antenna") {
      I.poly(ctx, [[hcx, hcy + 2 * scale], [hcx + 1 * scale, hcy - 30 * es * scale],
                   [hcx + 3 * scale, hcy - 30 * es * scale], [hcx + 2 * scale, hcy + 2 * scale]], OUTLINE);
      I.ellipse(ctx, hcx + 2 * scale, hcy - 33 * es * scale, 4.5 * scale, 4.5 * scale, accent);
    }

    // --- face: eyes above, smile below ---------------------------------
    var f = I.projectS(col + (1 - hw) / 2, row + (1 - hw) / 2 + 0.16,
                       bh + hh * 0.62);
    var eyeR = 4.3 * ys * scale;
    [-1, 1].forEach(function (sx) {
      var ex = f[0] + sx * 9.2 * ys * scale, ey = f[1];
      I.ellipse(ctx, ex, ey, eyeR, eyeR * 1.12, "#ffffff");
      I.ellipse(ctx, ex + 1.0 * scale, ey + 0.6 * scale, eyeR * 0.5, eyeR * 0.58, "#1b1b1b");
      I.ellipse(ctx, ex - 1.4 * scale, ey - 1.8 * scale, eyeR * 0.22, eyeR * 0.23, "#ffffff");
    });
    // Smile. An arc, so the curve is wider at the bottom.
    var m = I.projectS(col + (1 - hw) / 2, row + (1 - hw) / 2 + 0.16, bh + hh * 0.28);
    ctx.strokeStyle = "#8a3a1a";
    ctx.lineWidth = 1.4 * scale;
    ctx.beginPath();
    ctx.arc(m[0], m[1] - 1 * scale, 5.0 * scale, 0.25, Math.PI - 0.25);
    ctx.stroke();

    var b = I.projectS(col + (1 - bw) / 2, row + (1 - bw) / 2, bh * 0.62);
    I.ellipse(ctx, b[0], b[1], 4.6 * scale, 2.6 * scale, ch.mark || "#ffffff");
  }

  global.CharacterRenderer = { drawCharacter: drawCharacter, OUTLINE: OUTLINE };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
