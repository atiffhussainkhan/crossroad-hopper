/* src/render/sprite.js — raster animation sheets for the playable characters.
 *
 * The rest of the game draws everything with canvas 2D calls, which is why it
 * ships as a dozen source files and no images at all. These sheets are the one
 * deliberate exception: the Knight, Princess and Dragon are CC0 cartoon
 * animation frames that cannot be reproduced as flat-shaded boxes, and a
 * character with no face and no expression is not a character.
 *
 * WHY THESE EXIST AND WHY THEY ARE SAFE
 *   Source: opengameart knight/princess/dragon, CC0 1.0 Universal. Free for
 *   commercial use, attribution not required. See src/sprites/manifest.json.
 *
 *   They are pre-processed, not raw art:
 *     - trimmed to the character, so no frame jitters as the pose changes
 *     - every frame of an animation padded onto a COMMON canvas, for the same
 *       reason: the character must not shuffle sideways between frames
 *     - squashed vertically to the board's 2:1 tile ratio, because these are
 *       side-view sprites and the board is isometric. An unskewed sprite on a
 *       tilted board reads as pasted on, which is exactly how it looks if you
 *       skip this step.
 *     - downscale to 96px tall and encoded as WebP: 132 frames in 79 KB.
 *
 * EVERYTHING HERE IS OPTIONAL. If a sheet fails to load, or the manifest is
 * missing, or this file is not present at all, the game falls back to the
 * procedural roster characters and nothing breaks. That is deliberate: a
 * network hiccup must never be the reason a player sees no character.
 */
(function (global) {
  "use strict";

  var BASE = "src/sprites/";
  var ANIMATIONS = ["Idle", "Walk", "Jump", "Die"];

  var manifest = null;
  var images = {};        // "Knight/Idle" -> HTMLImageElement
  var charImages = {};    // "char_01" -> HTMLImageElement (single full-body character images)
  var failed = false;
  var onReady = [];
  var ready = false;

  function notify() {
    var waiting = onReady.slice();
    onReady.length = 0;
    for (var i = 0; i < waiting.length; i++) {
      try { waiting[i](); } catch (e) { /* a callback must not break the load */ }
    }
  }

  function fetchJson(url, onOk) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      // 200 only. A 404 here means the sprites are not deployed, which is a
      // supported state, not an error worth logging at the player.
      if (xhr.status >= 200 && xhr.status < 300) {
        try { onOk(JSON.parse(xhr.responseText)); } catch (e) { failed = true; notify(); }
      } else {
        failed = true;
        notify();
      }
    };
    xhr.onerror = function () { failed = true; notify(); };
    xhr.send(null);
  }

  function loadImage(url, onOk, onBad) {
    var img = new Image();
    img.onload = function () { onOk(img); };
    img.onerror = function () { onBad(); };
    /* No cache-busting query string here, and that is deliberate.
     *
     * A `?t=Date.now()` on every sprite was added while chasing the opaque
     * boxes behind the roster characters. It never helped -- the boxes were in
     * the pixels on disk, not in the browser's cache -- and it cost 24
     * unconditional re-downloads on every single page load. The roster art now
     * ships as .webp, a name the browser has never cached, so the assets that
     * were fixed are also the assets that get fetched. Staleness is handled by
     * the filename, which is the one place the HTTP cache can be told the truth. */
    img.src = url;
  }

  /* Start loading. Safe to call once; later calls just queue a callback. */
  function load(onDone) {
    if (onDone) onReady.push(onDone);
    if (ready) { notify(); return; }
    if (failed) { notify(); return; }
    if (manifest) return;               // already in flight

    fetchJson(BASE + "manifest.json", function (m) {
      manifest = m;
      /* Count completions rather than outstanding work. A previous version
       * incremented a counter that nothing ever decremented, so the settle
       * loop below could never finish and the loader hung for the life of the
       * page. Every image resolves exactly once, either way. */
      var total = 0, done = 0;
      var chars = m.characters || {};
      for (var name in chars) {
        var anims = chars[name];
        for (var a in anims) {
          var spec = anims[a];
          var key = name + "/" + a;
          (function (k, url) {
            total++;
            loadImage(url,
              function (img) { images[k] = img; done++; },
              function () { delete images[k]; done++; });
          })(key, BASE + name + "/" + spec.file);
        }
      }

      /* Also load the character selection images as full-body sprites.
       * These are individual JPG files stored in assets/characters/.
       *
       * Only the original 24 have one. Characters 25+ are library 3D models
       * with no generated 2D sprite, so their fetch is skipped rather than
       * requesting "assets/characters/null" and taking a 404 per character. */
      var charManifest = m.characters24 || [];
      for (var i = 0; i < charManifest.length; i++) {
        var entry = charManifest[i];
        if (!entry.file) continue;
        total++;
        loadImage("assets/characters/" + entry.file,
          function (img) { charImages[entry.id] = img; done++; },
          function () { delete charImages[entry.id]; done++; });
      }

      // A short timer rather than a guess at a count: a browser may coalesce
      // a cached load, and either way `done` is the honest signal.
      var settle = function () {
        if (done < total) { setTimeout(settle, 40); return; }
        ready = true;
        notify();
      };
      setTimeout(settle, 60);
    });
  }

  /* The frame to draw right now.
   *
   * `anim` is one of Idle/Walk/Jump/Die. `tMs` is the elapsed time, used to
   * step the animation at the frame rate the manifest recorded rather than at
   * the game's 60Hz tick -- an 80-frame idle clip played at 60fps is a blur.
   */
  function frame(character, anim, tMs) {
    if (!manifest || !character || !ready) return null;
    if (ANIMATIONS.indexOf(anim) < 0) anim = "Idle";

    // First try animated sprite sheets (Knight, Princess, Dragon)
    var entry = (manifest.characters || {})[character];
    if (entry) {
      var spec = entry[anim];
      if (!spec) spec = entry["Idle"]; // fallback to Idle if this anim missing
      if (!spec) return null;
      var img = images[character + "/" + anim] || images[character + "/Idle"];
      if (!img || !img.complete || !img.width) return null;

      var count = spec.frames | 0;
      if (count < 1) return null;
      var fps = spec.fps > 0 ? spec.fps : 8;
      var step = Math.floor((tMs / 1000) * fps) % count;

      var sx = (step % spec.cols) * spec.frameW;
      var sy = Math.floor(step / spec.cols) * spec.frameH;
      if (sx + spec.frameW > img.width) return null;
      if (sy + spec.frameH > img.height) return null;

      return {
        img: img, sx: sx, sy: sy,
        sw: spec.frameW, sh: spec.frameH,
        // Nominal height in CSS pixels the sprite is drawn at. A tile is 56x40,
        // so ~46 reads as a character standing ON the tile rather than filling it.
        drawH: 46
      };
    }

    // Fallback: single full-body character image (char_01 through char_24)
    var cimg = charImages[character];
    if (cimg && cimg.complete && cimg.width) {
      return {
        img: cimg, sx: 0, sy: 0,
        sw: cimg.width, sh: cimg.height,
        drawH: 46
      };
    }

    return null;
  }

  /* True once loading has finished, successfully or not, so the caller can
   * decide whether a missing sprite is worth reporting. */
  function isReady() { return ready; }
  function hasFailed() { return failed; }
  function characters() {
    if (!manifest) return [];
    return Object.keys(manifest.characters || {});
  }
  function has(character) {
    if (!manifest) return false;
    if ((manifest.characters || {})[character]) return true;
    // Also check single-image characters (char_01 .. char_24)
    return !!charImages[character];
  }

  global.SpriteSheets = {
    load: load, frame: frame, isReady: isReady, hasFailed: hasFailed,
    characters: characters, has: has, ANIMATIONS: ANIMATIONS,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));