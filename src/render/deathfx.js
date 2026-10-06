/* src/render/deathfx.js — what happens in the moment after you are hit.
 *
 * A death used to be a squash and a pause: the character flattened, the world
 * froze for 1.1 seconds, and they reappeared at the start of the stage. The
 * board said nothing at all about what had just happened.
 *
 * This draws the beat the player actually asked for, in the same flat-shaded
 * cartoon language as everything else on the board:
 *
 *   0ms   the impact. A comic burst with BOOM on it, expanding and fading.
 *   0ms+  the character's own death animation, playing where they fell.
 *   900ms the soul leaves. It rises out of the body, wobbling, under a halo,
 *         thinning out as it climbs, trailing a few stars.
 *   ~2.1s the stage restarts, on a fresh board, with the lives you had left.
 *
 * Everything here is presentation. Nothing in this file can kill a player,
 * move a hazard, or change a score -- it only draws.
 */
(function (global) {
  "use strict";

  var I = global.Iso;

  // The beat is split so the burst and the soul do not overlap: the burst has
  // finished saying its piece before the soul starts leaving.
  var BOOM_MS = 900;
  var BEAT_MS = 2100;

  function easeOut(t) { return 1 - (1 - t) * (1 - t); }

  /* A spiky comic starburst. Drawn as one polygon so it reads as a single
   * shape rather than a ring of triangles. */
  function burstPath(cx, cy, rOuter, rInner, points, rotation) {
    var pts = [];
    for (var i = 0; i < points * 2; i++) {
      var r = (i % 2 === 0) ? rOuter : rInner;
      var a = rotation + (i / (points * 2)) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.62]);
    }
    return pts;
  }

  /* The impact. `tMs` is the age of the death. */
  function drawBoom(ctx, col, row, scene, tMs) {
    if (tMs < 0 || tMs > BOOM_MS) return;
    var t = tMs / BOOM_MS;
    var p = I.projectS(col, row, 0.9);

    // It hits hard and immediately, then hangs in the air as it fades.
    var pop = t < 0.18 ? easeOut(t / 0.18) : 1;
    var alpha = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
    var r = (10 + 46 * easeOut(Math.min(1, t * 1.6)));

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);

    // Two layers of burst: a hot white core inside a yellow one.
    ctx.fillStyle = "#ff4d3d";
    ctx.beginPath();
    var outer = burstPath(p[0], p[1] - 26, r, r * 0.55, 11, -0.2);
    for (var i = 0; i < outer.length; i++) {
      if (i === 0) ctx.moveTo(outer[i][0], outer[i][1]);
      else ctx.lineTo(outer[i][0], outer[i][1]);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffd23d";
    var inner = burstPath(p[0], p[1] - 26, r * 0.72, r * 0.38, 11, 0.15);
    ctx.beginPath();
    for (var j = 0; j < inner.length; j++) {
      if (j === 0) ctx.moveTo(inner[j][0], inner[j][1]);
      else ctx.lineTo(inner[j][0], inner[j][1]);
    }
    ctx.closePath();
    ctx.fill();

    // The word. Black on the yellow, tilted, because that is how a comic says
    // it.
    ctx.save();
    ctx.translate(p[0], p[1] - 26);
    ctx.rotate(-0.16);
    ctx.scale(pop, pop);
    ctx.font = "bold 21px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#2a1a10";
    ctx.strokeText("BOOM!", 0, 1);
    ctx.fillStyle = "#fff6d8";
    ctx.fillText("BOOM!", 0, 1);
    ctx.restore();

    // Sparks thrown outward on their own arcs.
    ctx.fillStyle = "#fff3c0";
    for (var s = 0; s < 6; s++) {
      var a = -Math.PI / 2 + (s - 2.5) * 0.42;
      var d = r * (0.9 + 0.5 * t) + (s % 2) * 6;
      ctx.beginPath();
      ctx.arc(p[0] + Math.cos(a) * d, p[1] - 26 + Math.sin(a) * d * 0.62,
              2.6 * (1 - t * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* The soul, leaving.
   *
   * It starts at the body and climbs, thinning as it goes, with a halo over
   * its head and a wobbling tail so it reads as a cartoon ghost rather than a
   * fading rectangle. `charW` is how wide to draw the body glow beneath it. */
  function drawSoul(ctx, col, row, scene, tMs) {
    var t = (tMs - 700) / 1400;          // begins just after the burst peaks
    if (t <= 0 || t >= 1) return;

    var rise = 78 * easeOut(t);
    var fade = t < 0.25 ? 1 : 1 - (t - 0.25) / 0.75;
    var sway = Math.sin(t * 7.5) * (5 + 10 * t);
    var size = 1 - 0.42 * t;

    var p = I.projectS(col, row, 0);
    var x = p[0] + sway;
    var y = p[1] - rise;
    var w = 26 * size, h = 34 * size;

    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);

    // Halo, drawn first so the head overlaps it.
    ctx.strokeStyle = "#ffd23d";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.72, w * 0.52, h * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();

    // The body of the soul: a rounded dome with a wavy skirt.
    ctx.fillStyle = "#f4f7ff";
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + h * 0.16);
    ctx.quadraticCurveTo(x - w / 2, y - h * 0.52, x, y - h * 0.52);
    ctx.quadraticCurveTo(x + w / 2, y - h * 0.52, x + w / 2, y + h * 0.16);
    // Three scallops for the tail.
    var lobes = 3, lw = w / lobes;
    for (var l = 0; l < lobes; l++) {
      var lx = x + w / 2 - l * lw;
      ctx.quadraticCurveTo(lx - lw / 2, y + h * 0.34, lx - lw, y + h * 0.16);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#c8d4ec";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Face. Two dot eyes and a small open mouth: surprised, not scared.
    ctx.fillStyle = "#39405a";
    ctx.beginPath();
    ctx.ellipse(x - w * 0.17, y - h * 0.10, w * 0.075, h * 0.085, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.17, y - h * 0.10, w * 0.075, h * 0.085, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y + h * 0.04, w * 0.09, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blush, because it is a cartoon and it helps.
    ctx.fillStyle = "rgba(255,140,140,0.5)";
    ctx.beginPath();
    ctx.ellipse(x - w * 0.28, y + h * 0.02, w * 0.09, h * 0.05, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.28, y + h * 0.02, w * 0.09, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // A couple of stars left behind at the bottom of the climb.
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade * 0.9);
    ctx.fillStyle = "#fff3c0";
    for (var st2 = 0; st2 < 3; st2++) {
      var k = t - st2 * 0.16;
      if (k <= 0) continue;
      var sx = x - Math.sin(st2 * 2.1) * 22 - 8;
      var sy = p[1] - 78 * easeOut(k);
      var s = 3.4 * (1 - k * 0.55);
      ctx.beginPath();
      // A four-point sparkle rather than a circle, so it reads as a star.
      ctx.moveTo(sx, sy - s);
      ctx.lineTo(sx + s * 0.32, sy - s * 0.32);
      ctx.lineTo(sx + s, sy);
      ctx.lineTo(sx + s * 0.32, sy + s * 0.32);
      ctx.lineTo(sx, sy + s);
      ctx.lineTo(sx - s * 0.32, sy + s * 0.32);
      ctx.lineTo(sx - s, sy);
      ctx.lineTo(sx - s * 0.32, sy - s * 0.32);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  global.DeathFX = {
    BOOM_MS: BOOM_MS,
    BEAT_MS: BEAT_MS,
    drawBoom: drawBoom,
    drawSoul: drawSoul,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));