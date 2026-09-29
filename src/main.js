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

  var TICK_DT_MS = 16.667;
  var ROW_PX = 26;            // vertical pixels per row
  var COL_PX = 26;            // horizontal pixels per column
  var VISIBLE_ROWS = 14;      // rows shown on screen
  var PLAYER_ANCHOR = 10;     // screen row the active player sits on

  var game = SimCore.createGame({ playerCount: 1, seed: "browser" });
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

  // ---------- Rendering --------------------------------------------------

  function render() {
    var s = game.state();
    var stage = game.currentStage();
    if (!stage) return;

    // Ground.
    ctx.fillStyle = stage.ground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var topRow = Math.max(0, s.players[s.activePlayer].state().row - PLAYER_ANCHOR);
    var bottomRow = topRow + VISIBLE_ROWS;

    // Lanes. Alternating shades make rows readable (M-08).
    for (var row = topRow; row < bottomRow; row++) {
      var y = (bottomRow - row - 1) * ROW_PX;
      ctx.fillStyle = (row % 2 === 0) ? stage.groundAlt : stage.ground;
      ctx.fillRect(0, y, canvas.width, ROW_PX);
      ctx.fillStyle = stage.seam;
      ctx.fillRect(0, y + ROW_PX - 1, canvas.width, 1);
    }

    // Goal row: the line you must cross.
    var goalY = (bottomRow - s.goalRow - 1) * ROW_PX;
    if (goalY > -ROW_PX && goalY < canvas.height) {
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.25;
      ctx.fillRect(0, goalY, canvas.width, ROW_PX);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, goalY + 0.5);
      ctx.lineTo(canvas.width, goalY + 0.5);
      ctx.stroke();
    }

    // Players. Square hitboxes (M-08). Player 2 is marked with a notch so
    // the two are distinguishable without relying on colour (AC-01).
    for (var i = 0; i < s.players.length; i++) {
      var ps = s.players[i].state();
      if (!ps.alive) continue;
      var cx = canvas.width / 2 + (ps.col - (s.players.length - 1) / 2) * COL_PX;
      var cy = (bottomRow - ps.row - 1) * ROW_PX;
      if (cy < -ROW_PX || cy > canvas.height) continue;
      var w = COL_PX - 8, h = ROW_PX - 8;
      var x = cx - w / 2, y = cy + 4;
      ctx.fillStyle = (i === s.activePlayer) ? "#8fe38f" : "#5fa8c8";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      if (i > 0) {
        // Notch: the second player has a cut corner.
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.moveTo(x + w, y);
        ctx.lineTo(x + w, y + 8);
        ctx.lineTo(x + w - 8, y);
        ctx.closePath();
        ctx.fill();
      }
      if (ps.finished) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + w - 4, y + h - 4);
        ctx.moveTo(x + w - 4, y + 4);
        ctx.lineTo(x + 4, y + h - 4);
        ctx.stroke();
      }
    }

    // Pursuer. Triangle while telegraphing, square once active.
    var pu = game.state().pursuer.state();
    if (pu.mode !== "DISTANCE_LOCKED") {
      var purRow = (pu.mode === "ACTIVE") ? pu.row : pu.spawnRow;
      var py = (bottomRow - purRow - 1) * ROW_PX + 4;
      ctx.fillStyle = "#e06060";
      if (pu.mode === "SPAWNING") {
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, py);
        ctx.lineTo(canvas.width / 2 - 12, py + 16);
        ctx.lineTo(canvas.width / 2 + 12, py + 16);
        ctx.closePath();
        ctx.fill();
      } else if (py > -ROW_PX && py < canvas.height) {
        ctx.fillRect(canvas.width / 2 - 11, py, 22, 22);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width / 2 - 10, py + 1, 20, 20);
      }
    }

    // HUD.
    var remaining = Math.max(0, Stages.STAGE_DURATION_MS - s.elapsedInStageMs);
    elTimer.textContent = (remaining / 1000).toFixed(1);
    elDiff.textContent = String(game.difficulty());
    elStage.textContent = stage.id + ". " + stage.name;
    elScore.textContent = String(Math.floor(s.totalScore + s.stageScore));

    // NF-02: no per-frame allocation. Build the string without map/join.
    var livesStr = "";
    for (var li = 0; li < s.players.length; li++) {
      if (li) livesStr += " / ";
      livesStr += String(s.players[li].state().lives);
    }
    elLives.textContent = livesStr;

    // Banner: phase text. This is the only place the game blocks on input,
    // and it never blocks a death-to-restart.
    if (s.phase === SimCore.PHASES.READY) {
      showBanner("Stage " + stage.id + " — " + stage.name, "Tap to start");
    } else if (s.phase === SimCore.PHASES.STAGE_CLEAR) {
      showBanner("Stage clear", "Tap for stage " + (stage.id + 1));
    } else if (s.phase === SimCore.PHASES.STAGE_FAILED) {
      showBanner("Out of lives", "Tap to retry stage " + stage.id);
    } else if (s.phase === SimCore.PHASES.ENDLESS) {
      showBanner("Campaign complete", "Endless mode — tap to chase a high score");
    }
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

  // ---------- Input (M-07) ----------------------------------------------

  var downX = 0, downY = 0, downT = 0;
  var TAP_MAX_MS = 150, TAP_MAX_PX = 12;

  canvas.addEventListener("pointerdown", function (e) {
    downX = e.clientX; downY = e.clientY; downT = performance.now();
  });
  canvas.addEventListener("pointerup", function (e) {
    var dist = Math.sqrt(Math.pow(e.clientX - downX, 2) + Math.pow(e.clientY - downY, 2));
    if (performance.now() - downT > TAP_MAX_MS || dist > TAP_MAX_PX) return;

    var s = game.state();
    var idx = (game.state().playerCount < 2) ? 0
      : (e.clientX < canvas.getBoundingClientRect().left + canvas.clientWidth / 2 ? 0 : 1);
    if (s.phase === SimCore.PHASES.STAGE_CLEAR ||
        s.phase === SimCore.PHASES.STAGE_FAILED ||
        s.phase === SimCore.PHASES.ENDLESS) {
      // R-02: one input restarts. hop() then moves the player in the same
      // tick, so resuming never costs an extra beat.
      game.advance();
      hideBanner();
      return;
    }
    // M-09: the first tap both starts the stage and hops.
    if (s.phase === SimCore.PHASES.READY) { hideBanner(); }
    var idx = (game.state().playerCount < 2) ? 0
      : (e.clientX < canvas.getBoundingClientRect().left + canvas.clientWidth / 2 ? 0 : 1);
    game.hop("forward", idx);
  });
  canvas.addEventListener("touchmove", function (e) { e.preventDefault(); }, { passive: false });

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
    // was hidden cannot resolve after it returns.
    pointerDownT = 0; downX = 0; downY = 0;
  });
  requestAnimationFrame(function (t) { lastFrameMs = t; frame(t); });
})();
