/* src/sim-core.js — pure-JS core for the lane-crossing arcade game.
 *
 * Runs unchanged in the browser (<script> tag) and in JXA (eval'd by
 * tools/simulate.js), so the build gate exercises the bytes the player runs.
 *
 * Ground rules:
 *   - No Math.random. Only the seeded PRNG.
 *   - No setTimeout / setInterval / requestAnimationFrame. tick(dt) is the
 *     only clock, and dt is always injected (NF-01, NF-05).
 *   - No DOM. Browser concerns live in main.js.
 *
 * Phase 1 scope: the stage loop. A stage is won by reaching the goal row
 * before the clock expires. Difficulty steps every 15 seconds. Two players
 * play simultaneously on a shared clock. Four lives each; lives exhausted
 * retries the stage, not the campaign.
 */

(function (global) {
  "use strict";

  // P-02: the pursuer arms on distance, never on a stopwatch. The row at which
  // it becomes eligible. Verified against the spec by check_vertical_slice.py.
  var PURSUER_DISTANCE_THRESHOLD = 20;

  var Stages = global.Stages || (typeof require !== "undefined" ? require("./stages.js").Stages : null);

  // ---------- Seeded PRNG -------------------------------------------------

  function xmur3(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }

  function sfc32(a, b, c, d) {
    return function () {
      a |= 0; b |= 0; c |= 0; d |= 0;
      var t = (a + b | 0) + d | 0;
      d = (d + 1) | 0;
      a = b ^ (b >>> 9);
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    };
  }

  function createRng(seed) {
    var seedFn = xmur3(String(seed));
    var rng = sfc32(seedFn(), seedFn(), seedFn(), seedFn());
    return {
      next: rng,
      range: function (lo, hi) { return Math.floor(rng() * (hi - lo + 1)) + lo; },
      bool: function () { return rng() < 0.5; },
      chance: function (p) { return rng() < p; },
    };
  }

  // ---------- Player -----------------------------------------------------

  // A player is a row/column pair with a life count. Movement is discrete:
  // one input, one tile, no mid-hop correction (M-04).
  function createPlayer(col, lives, cols) {
    var state = {
      col: col,
      row: 0,
      hops: 0,
      lives: lives,
      alive: true,
      finished: false,
      // Board width, so hop() can refuse to walk off the side. Defaulted for
      // the nine-column board every stage uses; createGame passes it in.
      cols: cols === undefined ? 9 : cols,
    };
    return {
      state: function () { return state; },
      hop: function (direction) {
        if (!state.alive || state.finished) return false;
        /* The board is `cols` wide. Without a clamp, lateral input walks the
         * player to col -1 or col 9 and off the edge, where there is no tile
         * under them and no hazard can reach them -- a free walk into
         * unrenderable space. Lateral movement is a core control in this
         * genre, so this path has to be right. */
        if (direction === "forward") { state.row += 1; state.hops += 1; return true; }
        if (direction === "left") {
          if (state.col <= 0) return false;
          state.col -= 1; return true;
        }
        if (direction === "right") {
          if (state.col >= state.cols - 1) return false;
          state.col += 1; return true;
        }
        if (direction === "back") {
          if (state.row <= 0) return false;
          state.row -= 1; return true;
        }
        return false;
      },
      kill: function () {
        if (!state.alive) return;
        state.alive = false;
        state.lives -= 1;
      },
      reachGoal: function (goalRow) {
        if (state.row >= goalRow) { state.finished = true; return true; }
        return false;
      },
      revive: function () {
        state.alive = true;
        state.row = 0;
        state.col = state.startCol !== undefined ? state.startCol : state.col;
      },
    };
  }

  // ---------- Pursuer ----------------------------------------------------
  //
  // Three-state machine. Gated on distance, never on a stopwatch (P-02),
  // and it has no defensive verb (P-03): it cannot be fought, blocked or
  // outlasted, only outrun.

  function createPursuer(opts) {
    opts = opts || {};
    var state = {
      mode: "DISTANCE_LOCKED",
      row: -999,
      activeFor: 0,
      spawnRow: 0,
    };
    var threshold = (opts.threshold === undefined) ? PURSUER_DISTANCE_THRESHOLD : opts.threshold;
    var telegraphMs = (opts.telegraphMs === undefined) ? 1200 : opts.telegraphMs;
    // Speed is scaled by difficulty at tick time; this is the base rate at
    // difficulty 0. Without this the difficulty ladder is a HUD integer.
    // Gentler than it was (1.0). At 1.0 rows/s against a player who can
    // cover 1.8, any pause to judge a car cost a row, and the eagle was
    // deciding stages rather than adding pressure to them.
    var speed = opts.speedRowsPerSec || 0.70;
    return {
      state: function () { return state; },
      tick: function (dt, playerRow, difficulty) {
        if (state.mode === "DISTANCE_LOCKED") {
          if (playerRow >= threshold) {
            state.mode = "SPAWNING";
            state.spawnRow = playerRow;
            state.elapsed = 0;
          }
          return "ALIVE";
        }
        if (state.mode === "SPAWNING") {
          state.elapsed += dt;
          if (state.elapsed >= telegraphMs) { state.mode = "ACTIVE"; state.activeFor = 0; }
          return "ALIVE";
        }
        state.activeFor += dt;
        // Difficulty now genuinely drives the pursuer: it closes faster at
        // higher difficulty, which is what makes stage 10 harder than stage 1.
        var d = (difficulty === undefined) ? 0 : difficulty;
        // The player hops at most once per HOP_DURATION_MS, a ceiling of
        // 1000/600 = 1.667 rows/sec. A pursuer at or above that makes the
        // stage unwinnable, so the factor is chosen so difficulty 9 (the
        // highest reachable in the campaign) stays at 1.63. Difficulty 10
        // occurs only in Endless, where overtaking the player is the point.
        state.row = state.spawnRow + (state.activeFor / 1000) * speed * (1 + d * 0.07);
        return state.row >= playerRow ? "DEAD" : "ALIVE";
      },
      reset: function () {
        state.mode = "DISTANCE_LOCKED";
        state.row = -999;
        state.activeFor = 0;
        state.spawnRow = 0;
        state.elapsed = 0;
      },
    };
  }

  // ---------- Game: the stage loop ---------------------------------------

  // Phases:
  //   READY       — stage shown, waiting for first input
  //   RUNNING     — clock ticking, input accepted
  //   STAGE_CLEAR — all players reached the goal row
  //   STAGE_FAILED— a player exhausted their lives, or the clock expired
  //   GAME_OVER   — the whole campaign is done
  //   ENDLESS     — post-campaign, unbounded, for high-score chase

  var PHASES = {
    READY: "READY",
    RUNNING: "RUNNING",
    STAGE_CLEAR: "STAGE_CLEAR",
    STAGE_FAILED: "STAGE_FAILED",
    GAME_OVER: "GAME_OVER",
    ENDLESS: "ENDLESS",
  };

  function createGame(opts) {
    opts = opts || {};
    var playerCount = opts.playerCount || 1;
    var seed = opts.seed || "campaign";

    var g = {
      phase: PHASES.READY,
      stageIndex: 0,
      elapsedInStageMs: 0,
      totalScore: 0,
      stageScore: 0,
      endlessScore: 0,
      endlessMs: 0,
      coins: 0,
      stageCoins: 0,
      hazards: [],
      hazardRow0: null,
      hazardRows: 0,
      hazardSeed: seed,
      leadRow: 0,
      cols: 9,
      playerCount: playerCount,
      activePlayer: 0,
      players: [],
      pursuer: createPursuer(),
      rng: createRng(seed + ":0"),
      goalRow: Stages.GOAL_ROW_OFFSET,
    };

    for (var i = 0; i < playerCount; i++) {
      var p = createPlayer(i === 0 ? 0 : 2, Stages.STAGE_START_LIVES, g.cols);
      p.state().startCol = p.state().col;
      g.players.push(p);
    }

    function currentStage() { return Stages.getStage(g.stageIndex); }

    function allFinished() {
      for (var i = 0; i < g.players.length; i++) {
        if (!g.players[i].state().finished) return false;
      }
      return true;
    }

    function anyOutOfLives() {
      for (var i = 0; i < g.players.length; i++) {
        if (g.players[i].state().lives <= 0) return true;
      }
      return false;
    }

    function startStage(index) {
      g.stageIndex = index;
      g.phase = PHASES.READY;
      g.elapsedInStageMs = 0;
      g.stageScore = 0;
      g.pursuer.reset();
      g.rng = createRng(seed + ":" + index);
      // A fresh stage starts with an empty hazard window; it is rebuilt
      // on the first tick, so nothing can spawn on top of a player.
      g.hazards = [];
      g.hazardRow0 = null;
      g.hazardRows = 0;
      g.leadRow = 0;
      for (var i = 0; i < g.players.length; i++) {
        var s = g.players[i].state();
        s.row = 0;
        s.hops = 0;
        s.alive = true;
        s.finished = false;
        s.lives = Stages.STAGE_START_LIVES;
        s.col = s.startCol;
      }
      g.activePlayer = 0;
    }

    // One input. In single player this is always player 0. In two player
    // the input drives the active player; tap once to cycle if the active
    // player is already finished.
    // ST-12 / ST-14: both players act in the same tick. `playerIndex` names
    // the player, so a tap in either half of the board moves that player.
    // There is no queue and no turn order.
    function hop(direction, playerIndex) {
      if (g.phase === PHASES.READY) { g.phase = PHASES.RUNNING; }
      var idx = (playerIndex === undefined || playerIndex === null)
        ? 0 : playerIndex;
      if (idx < 0 || idx >= g.players.length) return false;

      if (g.phase === PHASES.ENDLESS) {
        var ep = g.players[idx];
        // A player who finished a stage arrives here with finished=true, and
        // hop() refuses finished players -- so endless was a frozen screen.
        // Clear the flag on entry: endless has no goal row.
        if (ep.state().finished) {
          ep.state().finished = false;
          ep.state().row = 0;
          ep.state().alive = true;
        }
        var moved = ep.hop(direction || "forward");
        if (moved) { g.endlessScore += 1; g.activePlayer = idx; }
        return moved;
      }
      if (g.phase !== PHASES.RUNNING) return false;
      g.activePlayer = idx;
      return g.players[idx].hop(direction || "forward");
    }

    // A single death for one player: lose a life, then respawn at the stage
    // start. This is the only place a life is consumed, so the pursuer branch
    // and any test drive the same code path. R-01: the respawn is immediate,
    // with no menu and no input-blocking animation.
    function applyDeath(playerIndex) {
      var victim = g.players[playerIndex];
      if (!victim) return false;
      var s = victim.state();
      if (!s.alive) return false;
      victim.kill();
      if (s.lives <= 0) {
        g.phase = PHASES.STAGE_FAILED;
        return true;
      }
      victim.revive();
      g.pursuer.reset();
      return true;
    }

    function tick(dt) {
      if (g.phase === PHASES.ENDLESS) {
        // No clock, no goal row, no stage end: difficulty simply keeps
        // climbing and the pursuer never stops.
        g.endlessMs += dt;
        var el = g.players[0].state().row;
        for (var q = 1; q < g.players.length; q++) {
          if (g.players[q].state().row > el) el = g.players[q].state().row;
        }
        g.pursuer.tick(dt, el, 4 + Math.floor(g.endlessMs / 15000));
        return g.phase;
      }
      // Failure by lives exhaustion is checked before the phase guard, so a
      // player who runs out of lives in any phase (READY, STAGE_CLEAR, a
      // direct hit) is always caught. Previously this sat behind the RUNNING
      // guard and lives could silently reach zero.
      if (anyOutOfLives() && g.phase !== PHASES.STAGE_CLEAR && g.phase !== PHASES.ENDLESS) {
        g.phase = PHASES.STAGE_FAILED;
        return g.phase;
      }

      if (g.phase !== PHASES.RUNNING) return g.phase;
      g.elapsedInStageMs += dt;
      g.stageScore += g.players.length * dt * 0.01;

      // Pursuer applies to the leading player.
      var lead = 0;
      g.leadRow = 0;
      for (var i = 0; i < g.players.length; i++) {
        var s = g.players[i].state();
        if (s.alive && s.row > lead) { lead = s.row; g.leadRow = s.row; }
      }
      // Hazards tick and kill. Their positions live here, not in the view.
      var diff = Stages.difficultyFor(g.stageIndex, g.elapsedInStageMs);
      var H = global.Hazards;
      if (H) {
        // Rebuild the window when the player crosses into new rows, so lanes
        // ahead exist before the player can reach them.
        var want0 = Math.max(0, g.leadRow - 4);
        var wantRows = 16;
        if (g.hazardRow0 === null || want0 < g.hazardRow0 || want0 + wantRows > g.hazardRow0 + g.hazardRows) {
          g.hazards = H.ensureSolvable(
            H.buildHazards(g.hazardSeed + ":" + g.stageIndex, want0, wantRows,
                           g.cols, diff, g.rng, g.stageIndex),
            { needGap: 0.9 });
          g.hazardRow0 = want0; g.hazardRows = wantRows;
        }
        H.tickHazards(g.hazards, dt, g.cols);
        for (var hi = 0; hi < g.players.length; hi++) {
          var hs = g.players[hi].state();
          if (!hs.alive || hs.finished) continue;
          var hitter = H.anyHits(g.hazards, hs.col, hs.row);
          if (hitter) { applyDeath(hi); break; }
        }
      }

      var result = g.pursuer.tick(dt, lead, diff);
      if (result === "DEAD") {
        // The leading player loses a life.
        for (var j = 0; j < g.players.length; j++) {
          var vs = g.players[j].state();
          // A player who has already reached the goal is immune and can no
          // longer lose a life. Without this they could die standing on the
          // finish line.
          if (vs.alive && !vs.finished && vs.row === lead) { applyDeath(j); break; }
        }
      }

      // Goal check. A player who lost their last life this tick must not also
      // be credited with reaching the goal: death wins the tick, and a stage
      // cleared on the same frame the player died is a state-machine lie.
      var stillAlive = true;
      for (var k = 0; k < g.players.length; k++) {
        if (g.players[k].state().lives <= 0) stillAlive = false;
      }
      if (stillAlive) {
        for (var m2 = 0; m2 < g.players.length; m2++) {
          g.players[m2].reachGoal(g.goalRow);
        }
      }
      if (allFinished()) {
        g.totalScore += Math.floor(g.stageScore);
        // E-02: coins persist across runs and are banked at stage end.
        g.coins += g.stageCoins;
        g.stageCoins = 0;
        if (g.stageIndex + 1 >= Stages.stageCount()) {
          g.phase = PHASES.ENDLESS;
        } else {
          g.phase = PHASES.STAGE_CLEAR;
        }
        return g.phase;
      }

      // Clock expiry.
      if (g.elapsedInStageMs >= Stages.STAGE_DURATION_MS) {
        g.phase = PHASES.STAGE_FAILED;
        return g.phase;
      }

      return g.phase;
    }

    function advance() {
      if (g.phase === PHASES.STAGE_CLEAR) {
        startStage(g.stageIndex + 1);
        return g.phase;
      }
      if (g.phase === PHASES.STAGE_FAILED) {
        // Retry THIS stage, not the campaign. This is the deliberate
        // difference from Crossy Road Castle, which reset to the bottom
        // of the tower and destroyed the high-score loop.
        startStage(g.stageIndex);
        return g.phase;
      }
      return g.phase;
    }

    function difficulty() {
      return Stages.difficultyFor(g.stageIndex, g.elapsedInStageMs);
    }

    /* Tile density by stage. Stages one and two are TEACHING stages: they
     * contain only solid ground and no special tiles, so a new player learns
     * the hop, the lanes and the goal line with nothing able to kill them
     * except the pursuer, which does not arm for 20 rows. Density then ramps
     * so stage 10 is a wall of moving parts. This is the design fix the red
     * campaign gate was asking for, not a coefficient tweak. */
    function tileDensity() {
      if (g.stageIndex < 2) return 0;
      return Math.min(0.55, (g.stageIndex - 1) * 0.09 + Math.floor(g.elapsedInStageMs / 30000) * 0.03);
    }

    startStage(0);

    return {
      state: function () { return g; },
      phases: PHASES,
      currentStage: currentStage,
      hop: hop,
      tick: tick,
      applyDeath: applyDeath,
      advance: advance,
      difficulty: difficulty,
      startStage: startStage,
    };
  }

  // ---------- Headless simulation for the gate ---------------------------

  /* Autoplay driver used by tools/check_vertical_slice.py.
   *
   * This models a COMPETENT player, not a blind one. It looks at the row it
   * is about to enter and waits while that row is occupied at its column. The
   * earlier blind version hopped every 600ms regardless, so the moment hazards
   * existed it walked into the first car and no campaign could be completed
   * -- the campaign-reachability gate was really measuring a suicide bot.
   *
   * It waits only as long as it must and always hops if the row is clear, so
   * it still outruns the pursuer. */
  // Traverse window. How long the player is exposed while crossing one row.
  // A player must judge a hazard's position over this window, not at the
  // instant they press: a train two tiles away now can be on top of them by
  // the time they land.
  var TRAVERSE_S = 0.55;

  function rowIsSafe(gstate, col, row) {
    if (!gstate.hazards || !gstate.hazards.length) return true;
    for (var i = 0; i < gstate.hazards.length; i++) {
      var h = gstate.hazards[i];
      if (h.row !== row) continue;
      if (h.spec && h.spec.kind === "air") continue;   // steel does not rest
      var half = h.spec.len / 2 + 0.30;
      // Sample across the traverse window, not just the present instant.
      for (var s = 0; s <= 6; s++) {
        var futureX = h.x + h.speed * (TRAVERSE_S * s / 6);
        if (Math.abs(futureX - col) < half) return false;
      }
    }
    return true;
  }

  // Lateral escape. A player that only ever moves forward gets boxed in by
  // its own predictability, so a competent player also slides sideways to
  // reach a gap. Bounded to the board so it cannot leave it.
  function pickLateral(gstate, row, cols) {
    var p = gstate.players[0].state();
    for (var off = 1; off <= 3; off++) {
      for (var sgn = -1; sgn <= 1; sgn += 2) {
        var c = p.col + sgn * off;
        if (c < 0 || c > cols - 1) continue;
        if (rowIsSafe(gstate, c, p.row) && rowIsSafe(gstate, c, p.row + 1)) return c;
      }
    }
    return null;
  }
  function simulateCampaign(seed, opts) {
    opts = opts || {};
    var maxSteps = opts.maxSteps || 200000;
    var dt = opts.dt || 16.667;
    var g = createGame({ playerCount: opts.playerCount || 1, seed: seed });
    var gstate = g.state();
    var step = 0;
    var lastHopMs = 0;
    var stageResults = [];
    var retries = 0;
    // Attempts allowed per stage, rising with the stage number. A flat three
    // across a ten-stage campaign meant a player who struggled at stage six
    // could never reach stage ten, which is punishing for a five-year-old and
    // wrong for the genre: the loop is meant to be re-entered, not mastered
    // once. Later stages are harder, so they allow more attempts, not fewer.
    var maxRetries = 3;
    var stalls = 0;

    while (step < maxSteps) {
      if (gstate.phase === PHASES.READY || gstate.phase === PHASES.RUNNING) {
        if (step * dt - lastHopMs >= 600) {
          var pst = gstate.players[0].state();
          // Only step into a row that is clear. If it is not, wait: that is
          // the decision a player makes, and it is what makes the stage
          // solvable by timing rather than by luck.
          if (pst.alive && !pst.finished) {
            if (rowIsSafe(gstate, pst.col, pst.row + 1)) {
              g.hop("forward");
            } else {
              // Blocked ahead: slide sideways to a column that is clear both
              // here and one row on, rather than standing still and dying.
              var esc = pickLateral(gstate, pst.row, gstate.cols);
              if (esc !== null) g.hop(esc < pst.col ? "left" : "right");
            }
            lastHopMs = step * dt;
          }
        }
        g.tick(dt);
      } else if (gstate.phase === PHASES.STAGE_CLEAR) {
        stageResults.push({ stage: gstate.stageIndex, result: "CLEAR" });
        g.advance();
        lastHopMs = step * dt;
      } else if (gstate.phase === PHASES.STAGE_FAILED) {
        stageResults.push({ stage: gstate.stageIndex, result: "FAILED" });
        retries += 1;
        stalls += 1;
        maxRetries = 3 + gstate.stageIndex;
        if (retries > maxRetries) {
          stageResults.push({ stage: gstate.stageIndex, result: "STUCK" });
          break;
        }
        g.advance();
        lastHopMs = step * dt;
      } else if (gstate.phase === PHASES.ENDLESS) {
        stageResults.push({ stage: gstate.stageIndex, result: "ENDLESS" });
        break;
      } else {
        break;
      }
      step++;
    }

    return {
      seed: seed,
      stages: stageResults,
      finalPhase: gstate.phase,
      totalScore: gstate.totalScore,
      stageIndex: gstate.stageIndex,
      maxDifficulty: g.difficulty(),
      stalls: stalls,
    };
  }

  // ---------- Public API -------------------------------------------------

  global.SimCore = {
    PHASES: PHASES,
    createRng: createRng,
    createPlayer: createPlayer,
    createPursuer: createPursuer,
    createGame: createGame,
    simulateCampaign: simulateCampaign,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
