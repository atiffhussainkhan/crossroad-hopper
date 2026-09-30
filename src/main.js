/* src/main.js — browser layer for the stage game.
 *
 * Owns the canvas, the renderer, input, the fixed-timestep loop, and the
 * phase transitions. All simulation lives in src/sim-core.js, which is the
 * same file the build gate drives headlessly.
 *
 * Ground rules enforced here:
 *   M-07  phase-gated input: one tap hops the active player
 *   NF-01 fixed-timestep accumulator, every tick the same dt
 *   NF-05 no Date.now(); performance.now() against one captured origin
 *   NF-06 hidden tab pauses; nothing accrues while hidden
 *   R-01  death to playable restart is immediate and input is never blocked
 *   AC-01 state is carried by shape, not colour alone
 */

(function () {
  "use strict";

  var canvas = document.getElementById("board");
  var ctx = canvas.getContext("2d");
  var elStage = document.getElementById("stage-name");
  var elTimer = document.getElementById("timer");
  var elDiff = document.getElementById("difficulty");
  var elLives = document.getElementById("lives");
  var elScore = document.getElementById("score");
  var elBanner = document.getElementById("banner");
  var elPlayers = document.getElementById("mode");
  var elProgress = document.getElementById("progress");
  var elHint = document.getElementById("hint");
  var DEFAULT_HINT = "Click or press SPACE to hop forward. Arrow keys or WASD to " +
                     "move. Dodge the traffic and cross the white line.";

  var TICK_DT_MS = 16.667;
  var ROW_PX = 26;            // vertical pixels per row
  var COL_PX = 26;            // horizontal pixels per column
  var VISIBLE_ROWS = 14;      // rows shown on screen
  var PLAYER_ANCHOR = 10;     // screen row the active player sits on
  // Character size multiplier. Applied about the character's own projected point,
  // never about the canvas origin -- see the pivot block in render().
  //
  // 1.0, so the character is drawn at the same world scale as every prop and
  // tile. The old 1.45 was never actually visible (the unpivoted scale put it
  // off-screen), so nobody had ever seen how oversized it made the player; once
  // the pivot was fixed, Pip stood a tile and a half wide next to a mailbox.
  var CHAR_SCALE = 1.0;

  var game = SimCore.createGame({ playerCount: 1, seed: "browser" });

  /* Hop animation. The simulation moves the player instantly from one cell to
   * the next; the VIEW interpolates along an arc so the hop reads as motion
   * rather than a teleport. This is presentation only: collision has already
   * happened, and nothing here can change where the player lands.
   *
   * Each character has its own arc height and hop duration in
   * Roster.MOTION, so the six feel different in motion without differing in
   * outcome. */
  var hopAnim = null;   // { fc, fr, tc, tr, t0, dur, arc, sway }

  function startHop(playerIndex, dir, fromCol, fromRow) {
    var holder = game.state().players[playerIndex];
    if (!holder) return;
    /* .state() is not optional. `players[i]` is a player WRAPPER; its row and
     * column live inside the object its state() returns. Reading `.col`
     * straight off the wrapper gave `undefined`, so the hop's target was
     * undefined, the interpolation was NaN, and a NaN transform makes canvas
     * drop the draw call entirely.
     *
     * That is why the player VANISHED for the whole duration of every hop:
     * it was being asked to draw at a position that was not a number. */
    var ps = holder.state();
    if (fromCol === undefined || fromRow === undefined) return;
    if (typeof ps.col !== "number" || typeof ps.row !== "number") return;
    var m = (typeof Roster !== "undefined" && Roster.motionFor)
      ? Roster.motionFor((typeof Roster !== "undefined" && Roster.ROSTER[
          playerIndex % Roster.ROSTER.length] || { id: "pip" }).id) : null;
    var fc = fromCol, fr = fromRow;
    var tc = ps.col, tr = ps.row;
    if (fc === tc && fr === tr) return;      // not a hop
    hopAnim = {
      fc: fc, fr: fr, tc: tc, tr: tr,
      t0: performance.now(),
      dur: m ? m.hopMs : 600,
      arc: m ? m.arc : 0.55,
      sway: m ? m.sway : 0,
      squash: m ? m.squash : 1,
    };
  }

  function hopProgress() {
    if (!hopAnim) return null;
    var p = (performance.now() - hopAnim.t0) / hopAnim.dur;
    if (p >= 1) { var done = hopAnim; hopAnim = null; return { p: 1, done: done }; }
    return { p: Math.max(0, p), done: hopAnim };
  }
  var BOARD_COLS = 14;   // must match SimCore's g.cols
  var DPR_CAP = 3;   // above 3x the pixels are invisible and cost frame time
  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    var w = canvas.clientWidth || 300, h = canvas.clientHeight || 420;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);
  window.addEventListener("orientationchange", sizeCanvas);
  var lastFrameMs = performance.now();
  var accumulator = 0;

  // ---------- Loop (NF-01) ----------------------------------------------

  function frame(nowMs) {
    var elapsed = nowMs - lastFrameMs;
    if (elapsed > 250) elapsed = 250;   // no catch-up storm after a stall
    lastFrameMs = nowMs;

    if (document.hidden) { requestAnimationFrame(frame); return; }  // NF-06

    accumulator += elapsed;
    while (accumulator >= TICK_DT_MS) {
      accumulator -= TICK_DT_MS;
      game.tick(TICK_DT_MS);
    }
    render();
    requestAnimationFrame(frame);
  }

  /* Where a player is RIGHT NOW, in world coordinates.
   *
   * The simulation moves a player instantly from one cell to the next; the hop
   * is presentation. The camera used to focus on the SIMULATED cell while the
   * character was still animating toward it, so the board snapped a whole row
   * forward on the frame the key was pressed and then the character caught up
   * -- the single biggest source of jerk in the game, and the reason a hop
   * felt like a jolt rather than a step.
   *
   * Both the camera and the drawing now read THIS, so they move together and
   * the whole frame glides. The position is also eased: linear interpolation
   * starts and stops abruptly, which reads as a snap at both ends of every
   * hop, so a smoothstep is applied on top of the linear progress. */
  function playerPose(index) {
    var s = game.state();
    var ps = s.players[index].state();
    var pose = { col: ps.col, row: ps.row, lift: 0, squash: 1, sway: 0, dead: !ps.alive };
    if (pose.dead) { pose.squash = 0.30; return pose; }
    var prog = hopProgress();
    if (!prog) return pose;
    var a = prog.done, p = prog.p;
    // Smoothstep: zero velocity at both ends, so the hop eases in and out.
    var e = p * p * (3 - 2 * p);
    pose.col = a.fc + (a.tc - a.fc) * e;
    pose.row = a.fr + (a.tr - a.fr) * e;
    // The arc uses the linear progress so its apex stays at the midpoint of
    // the hop; smoothing it too would make the character hang at the top.
    pose.lift = Math.sin(p * Math.PI) * a.arc;
    pose.squash = a.squash * (1 + Math.sin(p * Math.PI) * 0.10);
    if (p > 0.86) pose.squash -= (p - 0.86) * 1.2;   // flatten on landing
    pose.sway = a.sway;
    return pose;
  }

  // ---------- Rendering --------------------------------------------------

  function render() {
    var s = game.state();
    var stage = game.currentStage();
    if (!stage) return;

    // CSS pixels. VIEW_SCALE was a leftover from an earlier draft and was
    // never declared: reading it threw on frame 1, which killed the
    // requestAnimationFrame chain permanently.
    var dpr = canvas.width / (canvas.clientWidth || 1);
    if (!isFinite(dpr) || dpr <= 0) dpr = 1;
    var W = canvas.width / dpr;
    var H = canvas.height / dpr;

    // Lay down the surround before the board.
    //
    // The camera renders a finite window of rows, so the corners and the
    // area behind the player are not covered by tiles. Left alone, the canvas
    // background shows through and the board ends on a hard diagonal seam
    // that reads as a rendering fault rather than as the edge of the world.
    // A darker version of the stage's own ground fills it, so the board sits
    // in a lawn rather than being cut off.
    var surround = Iso.shade(stage.ground, 0.86);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = surround;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Restore the device-pixel scale. The fill above deliberately drops to
    // identity so it covers the whole backing store, and without this the rest
    // of the frame is drawn in DEVICE pixels instead of CSS pixels -- which
    // renders the entire board at half size, anchored in the top-left
    // quadrant, with the player standing in an empty field.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Isometric scene from the shared renderer. Everything below is drawn in
    // the same projection, with the same face factors, so the game and the
    // Python preview cannot diverge visually.
    var activeIdx = Math.min(s.activePlayer, s.players.length - 1);
    var anchor = s.players[activeIdx].state();
    var camPose = playerPose(activeIdx);
    var topRow = Math.max(0, Math.floor(camPose.row) - 3);
    // The camera focuses on the player's own cell; the view slides so the
    // character sits at the bottom-centre of the frame.
    var colCentre = 0;
    Scene.renderScene(ctx, sceneFor(stage), {
      width: W, height: H,
      // The camera now fits the board width itself (see Iso.frameViewWindow),
      // so cols is the real board width and viewRows is just how much is drawn.
      cols: BOARD_COLS,
      viewRows: Math.max(9, Math.round(H / 34)),
      row0: topRow,
      col0: colCentre,
      // The camera follows the ANIMATED position, not the simulated one, so
      // the board and the character move as one thing.
      focusCol: camPose.col,
      focusRow: camPose.row,
      hazards: s.hazards,
      // The destination. Until this was passed, the finish line was
      // simulated but never drawn: the player was asked to cross an endless
      // field of traffic with no visible goal to head for.
      goalRow: s.goalRow,
    });

    // Players, drawn through the SAME projection the simulation collides in.
    // A hand-tuned screen offset drifted further the further the player
    // travelled -- 10 tiles at row 12, 79 at row 40 -- so the player was
    // drawn 5.8 to 21 tiles from the hazard that killed it.
    for (var i = 0; i < s.players.length; i++) {
      var ps = s.players[i].state();
      /* A dead player is DRAWN, flattened. Skipping them made the character
       * disappear at the exact moment the player needs to see what killed
       * them, which reads as a glitch rather than as a loss. */
      var deadNow = !ps.alive;
      if (!ps.alive && s.phase !== SimCore.PHASES.DEAD) continue;
      var who = (typeof Roster !== "undefined" && Roster.ROSTER)
        ? Roster.ROSTER[i % Roster.ROSTER.length] : null;
      // Draw the character at its TRUE world position and let the projection
      // place it, exactly as the board is drawn.
      //
      // The previous version called ctx.translate() with an already-projected
      // screen coordinate and then called drawCharacter at (0,0), which
      // projected AGAIN and added the board offset a second time. The player
      // was drawn at roughly twice the board offset, which is off the canvas
      // entirely -- so the game rendered with no visible character at all.
      // Interpolate along the hop arc instead of teleporting. The simulation
      // has already moved the player; this is presentation only and cannot
      // change where anyone lands.
      // Same pose the camera used, so the character never lags the board.
      var pose = playerPose(i);
      var col = pose.col, row = pose.row, lift = pose.lift;
      var squash = pose.squash, swayNow = pose.sway;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // DPR only: no extra offset

      /* Every scale and shear below pivots ON THE CHARACTER, never on the
       * canvas origin.
       *
       * This was a bare `ctx.scale(1.45, 1.45)` with no pivot, which scales
       * about (0,0). The camera puts the character at 72% of the canvas
       * height, so the 1.45 multiplier moved it to 104% -- past the bottom
       * edge. The character was rendered every frame, correctly projected,
       * entirely off screen. The board looked right and the one object the
       * player is actually playing was invisible.
       *
       * tools/check_js_runtime.py now composes this transform and asserts the
       * character lands inside the canvas, so the whole class is covered. */
      var pivot = Iso.projectS(col, row, 0);
      ctx.translate(pivot[0], pivot[1]);
      ctx.scale(CHAR_SCALE * squash, CHAR_SCALE * (2 - squash));
      if (lift > 0) {
        // Lift along the arc and lean at the apex.
        ctx.transform(1, 0, swayNow, 1, 0, 0);
        ctx.translate(0, -Iso.BLOCK_H * lift);
      }
      ctx.translate(-pivot[0], -pivot[1]);
      CharacterRenderer.drawCharacter(ctx, col, row, 0.95, who || undefined);
      ctx.restore();
    }

    /* The pursuer, drawn as an actual bird.
     *
     * It used to be a red square while hunting and a red triangle while
     * arriving, drawn at column 0 while the player stood at column 7. There
     * was no way to tell what it was, no way to see it coming, and no way to
     * understand that the rule was "keep moving" -- so it read as an
     * unexplained red thing that killed you at random. A player who cannot
     * see a threat cannot avoid it, and a threat they cannot avoid is not
     * difficulty, it is noise.
     *
     * So: a bird with a body, swept wings, a beak and talons, drawn at the
     * PLAYER's own column because the kill rule is row-only and that is
     * genuinely where it will take you. A shadow on the ground leads it, so
     * its approach is visible from off-screen. While it is still arriving the
     * shadow tightens on the player: a countdown you can read. */
    var pu = game.state().pursuer.state();
    if (pu.mode !== "DISTANCE_LOCKED") {
      var purRow = (pu.mode === "ACTIVE") ? pu.row : pu.spawnRow;
      var lead = s.players[0].state();
      // Row-only kill, so it belongs over the player, not over some fixed
      // column. For two players, over the leading one.
      var purCol = lead.col;
      var pRow = lead.row;
      // How close it is to taking them, 0 = far, 1 = about to.
      var near = pu.mode === "ACTIVE"
        ? Math.max(0, Math.min(1, (purRow - (pRow - 5)) / 5))
        : 0;
      var ground = Iso.projectS(purCol, purRow, 0);
      var air = Iso.projectS(purCol, purRow, 1.05 + (pu.mode === "ACTIVE" ? 0 : 0.25));

      // 1. The shadow on the ground, which is how you see it coming.
      var sh = 26 + (1 - near) * 30;
      ctx.save();
      ctx.globalAlpha = 0.20 + near * 0.28;
      Iso.ellipse(ctx, ground[0], ground[1], sh, sh * 0.45, "#000000");
      ctx.restore();

      if (pu.mode === "SPAWNING") {
        // A tightening ring: the ground shadow closing in is the countdown.
        ctx.save();
        ctx.strokeStyle = "rgba(255,120,90," + (0.35 + 0.45 * near).toFixed(2) + ")";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(ground[0], ground[1], 30 - near * 16, (30 - near * 16) * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 2. The bird. Wings sweep as it closes, so it reads as alive.
      var bob = Math.sin((pu.activeFor || 0) / 140) * 3;
      var w = 26 + near * 8;                      // wingspan
      var body = "#4a3a52", wing = "#5f4a68", beak = "#e8b53d";
      // Wings: two swept quads, raised as it closes in.
      var lift = 9 + near * 12;
      ctx.save();
      ctx.translate(air[0], air[1] + bob);
      ctx.fillStyle = body;
      ctx.beginPath();                            // body
      ctx.ellipse(0, 0, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = wing;                        // left wing
      ctx.beginPath();
      ctx.moveTo(-4, -3);
      ctx.lineTo(-w, -lift);
      ctx.lineTo(-w * 0.82, lift * 0.55);
      ctx.lineTo(-3, 4);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();                            // right wing
      ctx.moveTo(4, -3);
      ctx.lineTo(w, -lift);
      ctx.lineTo(w * 0.82, lift * 0.55);
      ctx.lineTo(3, 4);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = beak;                        // beak
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(-3, -13); ctx.lineTo(3, -13);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#f2e6d8";                   // eye
      ctx.beginPath(); ctx.ellipse(-3, -6, 1.6, 1.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(3, -6, 1.6, 1.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2a2230";                   // talons
      ctx.fillRect(-5, 8, 3, 6);
      ctx.fillRect(2, 8, 3, 6);
      ctx.restore();
    }

    var remaining = Math.max(0, Stages.STAGE_DURATION_MS - s.elapsedInStageMs);
    elTimer.textContent = (remaining / 1000).toFixed(1);
    elDiff.textContent = String(game.difficulty());
    elStage.textContent = stage.id + ". " + stage.name;
    elScore.textContent = String(Math.floor(s.totalScore + s.stageScore));

    // How far to the finish. A player -- especially a child -- needs to see
    // how far there is to go; the clock on its own says nothing about it.
    if (elProgress) {
      elProgress.textContent = Math.min(anchor.row, s.goalRow) + "/" + s.goalRow;
    }
    // Say WHY the bird is there, and what to do. A threat with no explanation
    // is indistinguishable from a bug.
    if (elHint) {
      var puH = game.state().pursuer.state();
      if (puH.mode === "ACTIVE") elHint.textContent = "The bird is chasing you — keep hopping forward!";
      else if (puH.mode === "SPAWNING") elHint.textContent = "A bird is coming — keep moving!";
      else elHint.textContent = DEFAULT_HINT;
    }

    var livesStr = "";
    for (var li = 0; li < s.players.length; li++) {
      if (li) livesStr += " / ";
      livesStr += String(s.players[li].state().lives);
    }
    elLives.textContent = livesStr;

    if (s.phase === SimCore.PHASES.DEAD) {
      showBanner("You died", "Tap or press any key to try again");
    } else if (s.phase === SimCore.PHASES.READY) {
      showBanner("Stage " + stage.id + " — " + stage.name, "Tap to start");
    } else if (s.phase === SimCore.PHASES.STAGE_CLEAR) {
      showBanner("Stage clear", "Tap for stage " + (stage.id + 1));
    } else if (s.phase === SimCore.PHASES.STAGE_FAILED) {
      showBanner("Out of lives", "Tap to retry stage " + stage.id);
    } else if (s.phase === SimCore.PHASES.ENDLESS) {
      showBanner("Campaign complete", "Endless mode — tap to chase a high score");
    }
  }

  // The game data file is the single source of truth for the palette.
  /* Every field the renderer reads must be present here. This used to copy a
   * hand-picked subset of palette colours and silently drop `laneMix` and
   * `scenery`, so the renderer fell back to its DEFAULT lane mix -- which is
   * why Suburb rendered with water and rail lanes -- and placed no scenery at
   * all, in any stage, ever. A missing field here fails silently; the
   * structural probe in tools/check_js_runtime.py now asserts it cannot. */
  function sceneFor(stage) {
    return {
      id: stage.id, name: stage.name,
      laneMix: stage.laneMix, scenery: stage.scenery,
      ground: stage.ground, groundAlt: stage.groundAlt,
      road: stage.road, water: stage.water,
      hazard: stage.hazard, hazard2: stage.hazard2,
      log: stage.log, turtle: stage.turtle,
      foliage: stage.foliage, foliage2: stage.foliage2,
      trunk: stage.trunk,
    };
  }

  function showBanner(title, sub) {
    if (elBanner.dataset.title === title) return;
    elBanner.dataset.title = title;
    elBanner.innerHTML = "";
    var h = document.createElement("div");
    h.className = "banner-title";
    h.textContent = title;
    var p = document.createElement("div");
    p.className = "banner-sub";
    p.textContent = sub;
    elBanner.appendChild(h);
    elBanner.appendChild(p);
    elBanner.style.display = "flex";
  }

  function hideBanner() {
    elBanner.dataset.title = "";
    elBanner.style.display = "none";
  }

  // ---------- Input -------------------------------------------------------
  //
  /* The game was unplayable and the reason was here, not in the simulation.
   *
   * The old handler treated input as a TAP: pointerdown to pointerup within
   * 150ms and 12 pixels, or the press was discarded entirely. A human clicking
   * with a mouse or a trackpad holds the button for 100-300ms and drifts
   * several pixels before releasing. Almost every real click therefore
   * matched neither limit and was silently dropped, so the player never
   * moved and there was no error to find. It also only ever hopped forward:
   * there was no lateral control and no keyboard at all, so you could not
   * dodge anything even if the tap had registered.
   *
   * Input is now: a press-and-release is a FORWARD hop; a drag is a swipe in
   * that direction; and the arrow keys / WASD do the same. All three funnel
   * into one act() so there is exactly one code path that can move a player.
   */

  var SWIPE_MIN_PX = 18;     // below this it is a tap, not a swipe

  // Which player a touch belongs to: left half or right half of the board.
  function playerAtX(clientX) {
    var s = game.state();
    if (s.playerCount < 2) return 0;
    var r = canvas.getBoundingClientRect();
    return (clientX < r.left + r.width / 2) ? 0 : 1;
  }

  // The single place a player is ever moved by a human.
  function act(direction, playerIndex) {
    var s = game.state();

    // One input restarts or resumes, from any terminal phase.
    if (s.phase === SimCore.PHASES.STAGE_CLEAR ||
        s.phase === SimCore.PHASES.STAGE_FAILED ||
        s.phase === SimCore.PHASES.ENDLESS) {
      game.advance();
      hopAnim = null;
      hideBanner();
      return;
    }
    if (s.phase === SimCore.PHASES.READY) hideBanner();

    var idx = playerIndex === undefined ? 0 : playerIndex;
    var st0 = game.state().players[idx].state();
    var pc = st0.col, pr = st0.row;
    if (!game.hop(direction, idx)) return;          // refused: wall or finished
    var after = game.state().players[idx].state();
    if (after.row !== pr || after.col !== pc) {
      startHop(idx, direction, pc, pr);
    }
  }

  var downX = 0, downY = 0, downId = null, dragged = false;
  // How far the finger actually got, and in which direction.
  //
  // Reading only the release point meant a quick flick -- which often ends up
  // back near where it started, because the hand is already lifting -- was
  // read as a plain tap, so the player could only ever move FORWARD. That is
  // what "I can only jump forward" meant.
  var maxDx = 0, maxDy = 0, bestDx = 0, bestDy = 0;

  canvas.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    downX = e.clientX; downY = e.clientY;
    downId = e.pointerId; dragged = false;
    maxDx = 0; maxDy = 0; bestDx = 0; bestDy = 0;
  });

  canvas.addEventListener("pointermove", function (e) {
    if (downId === null || e.pointerId !== downId) return;
    var dx = e.clientX - downX, dy = e.clientY - downY;
    if (Math.abs(dx) > Math.abs(maxDx)) { maxDx = dx; bestDx = dx; bestDy = dy; }
    if (Math.abs(dy) > Math.abs(maxDy)) { maxDy = dy; bestDx = dx; bestDy = dy; }
    if (!dragged && (Math.abs(dx) > SWIPE_MIN_PX || Math.abs(dy) > SWIPE_MIN_PX)) {
      dragged = true;
    }
  });

  function endPointer(e) {
    if (downId === null || e.pointerId !== downId) return;
    downId = null;
    var dx = e.clientX - downX, dy = e.clientY - downY;
    var idx = playerAtX(e.clientX);
    // Take whichever is larger: how far the finger travelled, or where it
    // let go. A short deliberate drag and a fast flick both have to register.
    var useDx = dx, useDy = dy;
    if (Math.abs(maxDx) > Math.abs(dx) || Math.abs(maxDy) > Math.abs(dy)) {
      useDx = bestDx; useDy = bestDy;
    }
    if (dragged || Math.abs(useDx) > SWIPE_MIN_PX || Math.abs(useDy) > SWIPE_MIN_PX) {
      // A drag is a swipe. Screen y grows downward, so up is a negative dy.
      if (Math.abs(useDx) > Math.abs(useDy)) act(useDx > 0 ? "right" : "left", idx);
      else act(useDy < 0 ? "forward" : "back", idx);
      return;
    }
    // A plain press hops forward. There is deliberately no time limit here:
    // a press that is held for a second is still a press.
    act("forward", idx);
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", function (e) {
    if (e.pointerId === downId) { downId = null; dragged = false; }
  });
  canvas.addEventListener("touchmove", function (e) { e.preventDefault(); }, { passive: false });

  // Keyboard. Without this the game could not be played on a laptop at all,
  // which is how most people will first meet it.
  var KEYS = {
    ArrowUp: "forward", w: "forward", W: "forward", " ": "forward",
    Enter: "forward",
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right",
    ArrowDown: "back", s: "back", S: "back",
  };
  window.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var dir = KEYS[e.key];
    if (!dir) return;
    e.preventDefault();
    var idx = game.state().playerCount < 2 ? 0 : game.state().activePlayer;
    act(dir, idx);
  });

  // ---------- Mode toggle: 1 or 2 players --------------------------------

  if (elPlayers) {
    elPlayers.addEventListener("click", function () {
      var next = game.state().playerCount === 1 ? 2 : 1;
      game = SimCore.createGame({ playerCount: next, seed: "browser-" + next });
      elPlayers.textContent = next + " player" + (next > 1 ? "s" : "");
      hideBanner();
    });
  }

  // ---------- Boot --------------------------------------------------------

  elPlayers.textContent = "1 player";
  document.addEventListener("visibilitychange", function () {
    lastFrameMs = performance.now();
    // NF-06: drop any in-flight pointer so a gesture begun before the tab
    // was hidden cannot resolve after it returns. downId is what actually
    // gates endPointer; the coordinates are cleared so a stale release cannot
    // be read as a swipe.
    downId = null; dragged = false; downX = 0; downY = 0;
  });
  requestAnimationFrame(function (t) { lastFrameMs = t; frame(t); });
})();
