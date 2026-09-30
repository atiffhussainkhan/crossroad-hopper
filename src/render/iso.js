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

  // Lanes are wider than they are deep: the board is read left-to-right
  // and upward, so a column needs room and a row needs less.
  var TILE_W = 56, TILE_H = 40, BLOCK_H = 26;

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
  /* Forward is UP the screen and a lane runs LEFT-TO-RIGHT, which is the
   * camera this genre is defined by. The player has to read a whole lane at a
   * glance and judge a vehicle's distance along it, and neither is possible
   * when the lanes run diagonally away from the viewer.
   *
   * This used to be a full 2:1 dimetric: x = (col - row) * 32, y =
   * -(col + row) * 16. It looked handsome and it was wrong for the job --
   * it pushed the far end of every lane off to the upper left, the camera
   * focused the player in the middle of the frame, and the result was a
   * board crushed into one corner with the character standing in an empty
   * field, unable to see the traffic that was about to hit them.
   *
   * So the grid is orthogonal now: a column advances along x, a row advances
   * along y, and height takes z. Lanes are horizontal bands, forward is up,
   * and the whole board fits the frame the way the player expects. The
   * three-face lighting is unchanged, so the objects still read as solids.
   */
  //
  //   col ->  x        (left to right along a lane)
  //   row ->  y        (up the screen, away from the camera)
  //   z    -> -y       (height)

  var VIEW = { ox: 0, oy: 0, scale: 1 };

  function setView(ox, oy, scale, col0) {
    VIEW.ox = ox; VIEW.oy = oy; VIEW.scale = scale; VIEW.col0 = col0 || 0;
  }

  function project(col, row, z) {
    z = z || 0;
    // Centre the column axis on x so the board is symmetric about the player.
    return [col * TILE_W - TILE_W / 2, -row * TILE_H - z * BLOCK_H];
  }

  function projectS(col, row, z) {
    // VIEW.col0 slides the board along the diagonal so the player can sit at
    // the bottom-centre of a portrait frame while far columns crop off.
    var p = project(col - (VIEW.col0 || 0), row, z);
    return [p[0] * VIEW.scale + VIEW.ox, p[1] * VIEW.scale + VIEW.oy];
  }

  function frameViewWindow(cols, viewRows, width, height, row0, zmax, margin, biasY, zoom,
                          col0, focusCol, focusRow) {
    zmax = zmax || 0; margin = margin === undefined ? 18 : margin;
    biasY = biasY === undefined ? 0.72 : biasY;
    zoom = zoom || 1;
    viewRows = viewRows || 12;
    /* Fit the board's WIDTH and let the height decide how far you can see.
     *
     * All nine columns have to be on screen at once: a vehicle can arrive in
     * any of them, and a lane the player cannot see the whole length of is a
     * lane they cannot time. The number of visible rows then falls out of
     * whatever height is left over, which is the right way round for a game
     * about reading distance. */
    var boardW = cols * TILE_W;
    var scale = (width - margin * 2) / boardW * zoom;
    if (scale > 1.5) scale = 1.5;          // never blow a small board up huge
    if (scale < 0.2) scale = 0.2;
    /* Centre the BOARD horizontally, put the PLAYER low.
     *
     * Centring the player was wrong: at column 0 it pushed two thirds of the
     * nine-column board off the right edge, so the lanes the player had not
     * reached were invisible and the traffic on them was unjudgeable. The
     * board is what has to be fully on screen -- a vehicle can arrive in any
     * column. The player drifts within the frame as they move, which is what
     * the genre does. */
    if (focusCol !== null && focusCol !== undefined) {
      var boardMid = project(cols / 2 - (col0 || 0), 0, 0)[0];
      var fp = project(focusCol - (col0 || 0), focusRow, 0);
      setView(width / 2 - boardMid * scale,
              height * biasY - fp[1] * scale, scale, col0);
      return;
    }
    var mid = project(cols / 2 - (col0 || 0), row0 + viewRows / 2, 0);
    setView(width / 2 - mid[0] * scale,
            height * biasY - mid[1] * scale, scale, col0);
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

  function line(ctx, pts, stroke, width) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width === undefined ? 2 : width;
    ctx.lineCap = "round";
    ctx.stroke();
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

  function castShadow(ctx, col, row, height, length, alpha) {
    // Light is upper-left frontal; +col moves right and up, +row left and up, so
    // "away from the light" is +col and -row.
    var dx = length === undefined ? 0.30 : length, dy = -dx;
    var reach = 0.16 + 0.30 * (height || 0.5);
    // alpha scales the whole shadow. A reed should not lay down the same patch
    // of black as a house. Default 0.18 preserves the previous look exactly.
    var a = alpha === undefined ? 0.18 : alpha;
    var foot = [[0.26, 0.26], [0.74, 0.26], [0.74, 0.74], [0.26, 0.74]];
    var near = foot.map(function (f) { return projectS(col + f[0], row + f[1], 0); });
    var far = foot.map(function (f) {
      return projectS(col + f[0] + dx * reach, row + f[1] + dy * reach, 0);
    });
    ctx.save();
    poly(ctx, near, "rgba(0,0,0," + a.toFixed(3) + ")");
    poly(ctx, far, "rgba(0,0,0," + (a * 0.5).toFixed(3) + ")");
    ctx.restore();
  }

  global.Iso = {
    TILE_W: TILE_W, TILE_H: TILE_H, BLOCK_H: BLOCK_H,
    LIGHT_TOP: LIGHT_TOP, LIGHT_LEFT: LIGHT_LEFT, LIGHT_RIGHT: LIGHT_RIGHT,
    project: project, projectS: projectS, setView: setView,
    frameViewWindow: frameViewWindow,
    poly: poly, ellipse: ellipse, line: line,
    cube: cube, cubeFrac: cubeFrac, blob: blob, tile: tile,
    castShadow: castShadow,
    shade: shade, mix: mix, rgba: rgba, hexToRgb: hexToRgb,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
