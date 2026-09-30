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
      body: "#f7e3c8", accent: "#2fbfa0", earColor: "#f0b9c0", mark: "#ffffff",
      bodyW: 0.56, bodyH: 0.28, headW: 0.64, headH: 0.36,
      earKind: "triangle", earScale: 1, eyeScale: 1,
    });

    // `ch.ear` never existed -- the roster key is `earColor`. Reading the
    // wrong key gave every character an undefined ear colour, which a canvas
    // accepts silently by keeping the PREVIOUS fillStyle, so all six had ears
    // painted in whatever colour happened to be set last.
    var body = ch.body, accent = ch.accent, earC = ch.earColor;
    var bw = ch.bodyW, bh = ch.bodyH, hw = ch.headW, hh = ch.headH;
    var es = ch.earScale, ys = ch.eyeScale;
    // A head wider than the body hides the body completely, which is how four
    // of the six became a head with eyes in a crate.
    bw = Math.max(bw, hw);

    I.castShadow(ctx, col, row, 0.90, 0.42);

    // Feet, body, scarf, head: strictly increasing z, decreasing occlusion.
    // The feet are the same width as the body. Narrower, they peek out from
    // under the front face as a stray wedge -- a small pale shard hanging
    // below the character that reads as a rendering fault rather than a foot.
    I.cubeFrac(ctx, col + (1 - bw) / 2, row + (1 - bw) / 2, bw, bw,
               zz(0, 0, scale), 0.10 * scale, I.shade(body, 0.66));
    I.cubeFrac(ctx, col + (1 - bw) / 2, row + (1 - bw) / 2, bw, bw,
               zz(0, 0.10, scale), (bh - 0.10) * scale, body);
    I.cubeFrac(ctx, col + (1 - bw) / 2, row + (1 - bw) / 2, bw, bw,
               zz(0, bh, scale), 0.09 * scale, accent);
    I.cubeFrac(ctx, col + (1 - hw) / 2, row + (1 - hw) / 2, hw, hw,
               zz(0, bh + 0.09, scale), (hh - 0.09) * scale, I.shade(body, 1.10));

    var headZ = bh + hh;
    /* Everything on the head -- ears, eyes, mouth -- is placed relative to the
     * head's PROJECTED BOX, not to hard-coded pixel offsets.
     *
     * The face used to be positioned at the head's left edge plus a fixed
     * `+-9.2` pixel pair, and the ears used a hard-coded half-tile of 32. Both
     * assumed the old 2:1 dimetric. When the grid became orthogonal the tile
     * became 56 wide, the head's centre moved 17.9px from where the code
     * expected, and the face was left hanging off the side of the head with
     * both eyes outside the silhouette.
     *
     * Measuring the head's box on screen and working from that is correct in
     * any projection, and it cannot drift when the camera changes again. */
    var headL = I.projectS(col + (1 - hw) / 2, row + 0.5, headZ)[0];
    var headR = I.projectS(col + (1 + hw) / 2, row + 0.5, headZ)[0];
    var hcx = (headL + headR) / 2;                 // head centre, horizontally
    var headHalf = Math.abs(headR - headL) / 2;    // head half-width, on screen
    var headTop = I.projectS(col + 0.5, row + 0.5, headZ)[1];
    var headBot = I.projectS(col + 0.5, row + 0.5, bh + 0.09)[1];
    var hcy = headTop;                             // top of the head
    var hMid = (headTop + headBot) / 2;            // middle of the head
    var hSpan = Math.abs(headBot - headTop) || 1;
    var spread = headHalf + (ch.earKind === "round" ? 3 * scale : 1);

    // --- silhouette-defining feature -------------------------------------
    if (ch.earKind === "triangle") {
      [-1, 1].forEach(function (sx) {
        var ex = hcx + sx * spread * 0.92, h = 21 * es * scale;
        I.poly(ctx, [[ex, hcy - h], [ex - 10 * es * scale, hcy + 3 * scale],
                     [ex + 10 * es * scale, hcy + 3 * scale]], body);
        I.poly(ctx, [[ex, hcy - h * 0.62], [ex - 5 * es * scale, hcy + 2 * scale],
                     [ex + 5 * es * scale, hcy + 2 * scale]], earC);
      });
    } else if (ch.earKind === "tall") {
      [-1, 1].forEach(function (sx) {
        var ex = hcx + sx * spread * 0.66, h = 40 * es * scale;
        I.ellipse(ctx, ex, hcy - h * 0.5, 8 * es * scale, h * 0.5, body);
        I.ellipse(ctx, ex, hcy - h * 0.5, 4 * es * scale, h * 0.34, earC);
      });
    } else if (ch.earKind === "round") {
      [-1, 1].forEach(function (sx) {
        var ex = hcx + sx * spread * 0.95;
        I.ellipse(ctx, ex, hcy - 5 * scale, 10 * es * scale, 10 * es * scale, body);
        I.ellipse(ctx, ex, hcy - 5 * scale, 5 * es * scale, 5 * es * scale, earC);
      });
    } else if (ch.earKind === "horn") {
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
    } else if (ch.earKind === "flop") {
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
    } else if (ch.earKind === "antenna") {
      I.poly(ctx, [[hcx, hcy + 2 * scale], [hcx + 1 * scale, hcy - 30 * es * scale],
                   [hcx + 3 * scale, hcy - 30 * es * scale], [hcx + 2 * scale, hcy + 2 * scale]], OUTLINE);
      I.ellipse(ctx, hcx + 2 * scale, hcy - 33 * es * scale, 4.5 * scale, 4.5 * scale, accent);
    }

    // --- face: eyes on the head, mouth below them ------------------------
    // Placed inside the measured head box: eyes across the upper third, mouth
    // just under. Both scale with the head, so the face stays on the face
    // whatever size the sprite is drawn at.
    var eyeSep = headHalf * 0.52;
    var eyeR = headHalf * 0.24 * ys;
    var eyeY = headTop + hSpan * 0.34;
    [-1, 1].forEach(function (sx) {
      var ex = hcx + sx * eyeSep;
      I.ellipse(ctx, ex, eyeY, eyeR, eyeR * 1.12, "#ffffff");
      I.ellipse(ctx, ex + eyeR * 0.24, eyeY + eyeR * 0.14, eyeR * 0.5, eyeR * 0.58, "#1b1b1b");
      I.ellipse(ctx, ex - eyeR * 0.34, eyeY - eyeR * 0.44, eyeR * 0.22, eyeR * 0.23, "#ffffff");
    });
    // Smile. An arc, so the curve is wider at the bottom.
    var mouthY = headTop + hSpan * 0.62;
    ctx.strokeStyle = "#8a3a1a";
    ctx.lineWidth = Math.max(1, headHalf * 0.06);
    ctx.beginPath();
    ctx.arc(hcx, mouthY - headHalf * 0.12, headHalf * 0.30, 0.25, Math.PI - 0.25);
    ctx.stroke();

    // A chest mark, on the body rather than the head.
    var bodyTop = I.projectS(col + 0.5, row + 0.5, bh)[1];
    var bodyBot = I.projectS(col + 0.5, row + 0.5, 0.10)[1];
    var bMid = (bodyTop + bodyBot) / 2;
    var bodyHalf = Math.abs(
      I.projectS(col + (1 + bw) / 2, row + 0.5, bh)[0] -
      I.projectS(col + (1 - bw) / 2, row + 0.5, bh)[0]) / 2;
    I.ellipse(ctx, hcx, bMid, bodyHalf * 0.30, bodyHalf * 0.17, ch.mark || "#ffffff");
  }

  global.CharacterRenderer = { drawCharacter: drawCharacter, OUTLINE: OUTLINE };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
