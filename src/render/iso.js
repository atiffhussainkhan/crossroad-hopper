/* src/render/iso.js — isometric engine for the browser.
 *
 * A direct port of tools/iso.py, the Python preview renderer. The preview and
 * the game draw from the SAME conventions so they cannot drift.
 *
 * The three fixes that the lighting audit forced on the Python version are
 * carried over deliberately, because each was a measured defect:
 *
 *  1. The right face lies in the row+1 plane, not col+1. The Python version
 *     drew it behind the cube, which ate 61 percent of every top face.
 *  2. The camera-facing corner cap of a blob takes the DARK factor. Painting
 *     it at top brightness was a second frontal light source.
 *  3. LIGHT_LEFT and LIGHT_RIGHT are the sRGB multipliers that produce the
 *     intended 1.00 : 0.74 : 0.54 ratios in LINEAR light. Using 0.74 and
 *     0.54 directly gives 0.519 and 0.276, a 3.6x spread instead of 1.9x.
 *
 * Note the alpha bug from the Python renderer cannot exist here: a 2D canvas
 * composites with source-over natively, so a translucent fill is a translucent
 * fill. No scratch layer is needed.
 */
(function (global) {
  "use strict";

  var TILE_W = 64, TILE_H = 32, BLOCK_H = 22;

  // Face factors, corrected for linear light (see note 3 above).
  var LIGHT_TOP = 1.00, LIGHT_LEFT = 0.876, LIGHT_RIGHT = 0.761;

  // ---------- colour -----------------------------------------------------

  function hexToRgb(h) {
    h = h.replace("#", "");
    if (h.length === 8) {
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16),
              parseInt(h.slice(4, 6), 16), parseInt(h.slice(6, 8), 16)];
    }
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16),
            parseInt(h.slice(4, 6), 16), 255];
  }

  function rgba(hex, alpha) {
    var c = hexToRgb(hex);
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," +
           ((c[3] / 255) * (alpha === undefined ? 1 : alpha)) + ")";
  }

  function mix(a, b, t) {
    var A = hexToRgb(a), B = hexToRgb(b);
    return "rgb(" + Math.round(A[0] + (B[0] - A[0]) * t) + "," +
                    Math.round(A[1] + (B[1] - A[1]) * t) + "," +
                    Math.round(A[2] + (B[2] - A[2]) * t) + ")";
  }

  function shade(colour, factor) {
    if (typeof colour !== "string" || colour.charAt(0) !== "#") return colour;
    var c = hexToRgb(colour);
    var r, g, b;
    if (factor <= 1.0) { r = c[0] * factor; g = c[1] * factor; b = c[2] * factor; }
    else {
      var t = factor - 1.0;
      r = c[0] + (255 - c[0]) * t; g = c[1] + (255 - c[1]) * t; b = c[2] + (255 - c[2]) * t;
    }
    return "rgb(" + Math.round(r) + "," + Math.round(g) + "," + Math.round(b) + ")";
  }

  function _saturate(hex) {
    // Some palette values are already rgb() strings after shading; normalise.
    if (typeof hex === "string" && hex.charAt(0) === "#") return hex;
    return hex;
  }

  // ---------- projection -------------------------------------------------
  //
  // Forward hop increases row and forward is UP the screen, so the z term is
  // NEGATIVE. In image coordinates y grows downward, so raising a solid must
  // subtract height. Getting this sign wrong renders every solid upside down.

  var VIEW = { ox: 0, oy: 0, scale: 1 };

  function setView(ox, oy, scale, col0) {
    VIEW.ox = ox; VIEW.oy = oy; VIEW.scale = scale; VIEW.col0 = col0 || 0;
  }

  function project(col, row, z) {
    z = z || 0;
    return [(col - row) * (TILE_W / 2), -(col + row) * (TILE_H / 2) - z * BLOCK_H];
  }

  function projectS(col, row, z) {
    // VIEW.col0 slides the board along the diagonal so the player can sit at
    // the bottom-centre of a portrait frame while far columns crop off.
    var p = project(col - (VIEW.col0 || 0), row, z);
    return [p[0] * VIEW.scale + VIEW.ox, p[1] * VIEW.scale + VIEW.oy];
  }

  function frameViewWindow(cols, viewRows, width, height, row0, zmax, margin, biasY, zoom,
                          col0, focusCol, focusRow) {
    zmax = zmax || 0; margin = margin || 20; biasY = biasY === undefined ? 0.54 : biasY;
    zoom = zoom || 1;
    var xs = [], ys = [];
    [0, cols].forEach(function (c) {
      [row0, row0 + viewRows].forEach(function (r) {
        [0, zmax].forEach(function (z) {
          var p = project(c, r, z); xs.push(p[0]); ys.push(p[1]);
        });
      });
    });
    var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs);
    var miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
    var bw = Math.max(maxx - minx, 1e-6), bh = Math.max(maxy - miny, 1e-6);
    // Fit HEIGHT, not width. A 2:1 isometric diamond cannot fill a portrait
    // frame by fitting, and fitting to width left the board a small band in
    // the middle with dead space above and below. Let the columns crop.
    var scale = (height - margin * 2) / bh * zoom;
    var maxScale = (width - margin) / (TILE_W * 1.2);
    if (scale > maxScale) scale = maxScale;
    // Focus the camera on a specific cell when asked. Fitting the whole
    // board's bounding box leaves the player wherever the projection happens
    // to put it; a game camera has to put the player where the thumb is.
    if (focusCol !== null && focusCol !== undefined) {
      var fp = project(focusCol - (col0 || 0), focusRow, 0);
      setView(width / 2 - fp[0] * scale,
              height * biasY - fp[1] * scale, scale, col0);
      return;
    }
    setView(width / 2 - (minx + maxx) / 2 * scale,
            height * biasY - (miny + maxy) / 2 * scale, scale, col0);
  }

  // ---------- primitives -------------------------------------------------

  function poly(ctx, pts, fill) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function ellipse(ctx, cx, cy, rx, ry, fill) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function cube(ctx, col, row, baseZ, height, colour) {
    cubeFrac(ctx, col, row, 1, 1, baseZ, height, colour);
  }

  function cubeFrac(ctx, col, row, sizeCol, sizeRow, baseZ, height, colour) {
    var c0 = col, c1 = col + sizeCol, r0 = row, r1 = row + sizeRow;
    poly(ctx, [projectS(c0, r0, baseZ + height), projectS(c1, r0, baseZ + height),
               projectS(c1, r1, baseZ + height), projectS(c0, r1, baseZ + height)],
         shade(colour, LIGHT_TOP));
    poly(ctx, [projectS(c0, r0, baseZ), projectS(c0, r1, baseZ),
               projectS(c0, r1, baseZ + height), projectS(c0, r0, baseZ + height)],
         shade(colour, LIGHT_LEFT));
    // Right face lies in the row+1 plane. See note 1 above.
    poly(ctx, [projectS(c0, r1, baseZ), projectS(c1, r1, baseZ),
               projectS(c1, r1, baseZ + height), projectS(c0, r1, baseZ + height)],
         shade(colour, LIGHT_RIGHT));
  }

  function blob(ctx, col, row, sizeCol, sizeRow, baseZ, height, colour) {
    var c0 = col, c1 = col + sizeCol, r0 = row, r1 = row + sizeRow;
    var mc = (c0 + c1) / 2, mr = (r0 + r1) / 2;
    var zt = baseZ + height, zb = baseZ;
    poly(ctx, [projectS(mc, r0, zt), projectS(c1, mr, zt),
               projectS(mc, r1, zt), projectS(c0, mr, zt)], shade(colour, LIGHT_TOP));
    poly(ctx, [projectS(c0, r0, zb), projectS(c0, r1, zb),
               projectS(c0, r1, zt), projectS(c0, r0, zt)], shade(colour, LIGHT_LEFT));
    poly(ctx, [projectS(c0, r1, zb), projectS(c1, r1, zb),
               projectS(c1, r1, zt), projectS(c0, r1, zt)], shade(colour, LIGHT_RIGHT));
    // Camera-facing corner takes the DARK factor. See note 2 above.
    poly(ctx, [projectS(c0, r0, zb), projectS(c0, r0, zt),
               projectS(mc, r0, zt), projectS(mc, r0, zb)], shade(colour, LIGHT_RIGHT));
    poly(ctx, [projectS(c1, r1, zb), projectS(c1, r1, zt),
               projectS(mc, r1, zt), projectS(mc, r1, zb)], shade(colour, LIGHT_LEFT));
  }

  function tile(ctx, col, row, colour) {
    poly(ctx, [projectS(col, row, 0), projectS(col + 1, row, 0),
               projectS(col + 1, row + 1, 0), projectS(col, row + 1, 0)], colour);
  }

  function castShadow(ctx, col, row, height, length) {
    // Light is upper-left frontal; +col moves right and up, +row left and up, so
    // "away from the light" is +col and -row.
    var dx = length === undefined ? 0.30 : length, dy = -dx;
    var reach = 0.16 + 0.30 * (height || 0.5);
    var foot = [[0.26, 0.26], [0.74, 0.26], [0.74, 0.74], [0.26, 0.74]];
    var near = foot.map(function (f) { return projectS(col + f[0], row + f[1], 0); });
    var far = foot.map(function (f) {
      return projectS(col + f[0] + dx * reach, row + f[1] + dy * reach, 0);
    });
    ctx.save();
    poly(ctx, near, "rgba(0,0,0,0.18)");
    poly(ctx, far, "rgba(0,0,0,0.09)");
    ctx.restore();
  }

  global.Iso = {
    TILE_W: TILE_W, TILE_H: TILE_H, BLOCK_H: BLOCK_H,
    LIGHT_TOP: LIGHT_TOP, LIGHT_LEFT: LIGHT_LEFT, LIGHT_RIGHT: LIGHT_RIGHT,
    project: project, projectS: projectS, setView: setView,
    frameViewWindow: frameViewWindow,
    poly: poly, ellipse: ellipse,
    cube: cube, cubeFrac: cubeFrac, blob: blob, tile: tile,
    castShadow: castShadow,
    shade: shade, mix: mix, rgba: rgba, hexToRgb: hexToRgb,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
