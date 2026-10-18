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
  /* Grace before the pursuer arms, in rows.
   *
   * Kept at 20 deliberately. It was raised to 30 while retuning for the longer
   * stage, and that was the wrong lever: a higher threshold does not make the
   * crossing fairer, it makes idling FREE. A player who stalls at row 21 fell
   * below the arming line and could never be caught at all, which broke the
   * rule the pursuer exists to enforce -- it must punish waiting, and only
   * waiting.
   *
   * The crossing got longer, so what needed softening was how fast it CLOSES
   * (speed, below), not how long before it starts. */
  /* Minimum real time between hops, in ms. The player is exposed to a row for
   * about this long while crossing it, so this is the beat the whole game is
   * balanced around -- the autoplay drives at 600ms, so 120 leaves headroom
   * without changing anything a real player can feel. */
  var HOP_MIN_MS = 120;

  var PURSUER_DISTANCE_THRESHOLD = 20;

  /* Shields a player can hold at once -- the per-stage budget, and the number
   * of pickups a stage deals (see startStage).
   *
   * This is what stops shields banking. addShield() used to be an unbounded
   * counter and startStage() never cleared it, so a player who reached the end
   * of a stage holding both shields walked into the next stage already holding
   * two, collected that stage's two, and after three stages was carrying six
   * retries from spots they had never been hit on. Measured: two shields taken
   * on stage one, `startStage(0)`, and the player still held 2. The spec is
   * "2 shields, 2 absorbed hits, then a normal death", which is a budget, not
   * a stockpile. */
  var SHIELDS_PER_STAGE = 2;
  /* Grace after a shield absorbs a hit, in ms.
   *
   * The absorb deliberately does NOT move the player -- it leaves them on the
   * exact spot they were hit, which is the whole point. But the spot they were
   * hit is still lethal for the instant they are standing on it, and there was
   * nothing stopping the NEXT tick from asking again. Measured standing still
   * on the spot with two shields: absorb at t=1483ms, second absorb at
   * t=1500ms, death at t=1517ms. Two shields, 34ms, one frame of shine between
   * them, and then a normal death -- the player experiences "the shield did
   * nothing", not "the shield saved me twice".
   *
   * So for this window after an absorb the player cannot be hit again. It does
   * not freeze the world, does not move them, and does not cost a life: it is
   * only the beat a real player needs to see that they were hit and get off the
   * spot. A hop takes 120-150ms, so this is four or five moves of headroom. */
  var SHIELD_ABSORB_GRACE_MS = 700;
  // How long the world holds still after a hit before the player is put back.
  // Long enough to read "You died", short enough not to break the rhythm.
  var DEAD_BEAT_MS = 2100;   // boom, then the soul leaves, then restart
  // How far BEHIND the player the pursuer starts. It used to start ON their
  // row, which meant it had no gap to close: the instant it stopped
  // telegraphing it was already past them, so standing still for one second
  // was fatal and the rule was effectively "never stop". It is meant to punish
  // idling, not progress, so it flies in from behind and has to catch up.
  var PURSUER_SPAWN_GAP = 5;

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
      /* Shields held. Each one absorbs a single lethal hit and is spent,
       * leaving the player in place and in the run. Capped at
       * SHIELDS_PER_STAGE -- see the constant for why this is a budget. */
      shields: 0,
      /* When THIS player's shield last ate a hit, on the stage clock. Kept per
       * player rather than on the game: in two player one player standing in
       * traffic is hit, and the other must not inherit the grace. */
      lastShieldAbsorbMs: -1,
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
          if (state.col <= (state.minCol === undefined ? 0 : state.minCol)) return false;
          state.col -= 1; return true;
        }
        if (direction === "right") {
          var far = state.maxCol === undefined ? state.cols - 1 : state.maxCol;
          if (state.col >= far) return false;
          state.col += 1; return true;
        }
        if (direction === "back") {
          if (state.row <= 0) return false;
          state.row -= 1; return true;
        }
        return false;
      },
      /* One shield absorbs ONE lethal hit, then is spent, and the player
       * keeps their position and keeps going. A hit the player had no
       * position to avoid should not end the run; that is the whole point.
       *
       * Refuses to exceed the stage budget. Re-taking one you already hold
       * used to bank it, and a shield is only ever worth something as a
       * retry from the spot you are hit -- stacked up, they are an unbounded
       * pile of lives that never touch the life count and never cost
       * anything. The caller uses the false to leave the pickup on the board
       * rather than silently eating it. */
      addShield: function () {
        if (state.shields >= SHIELDS_PER_STAGE) return false;
        state.shields += 1;
        return true;
      },
      absorbHit: function () {
        if (state.shields <= 0) return false;
        state.shields -= 1;
        return true;
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
    /* Closing speed, rows/sec.
     *
     * The stage is 90 rows instead of 40, so the pursuer now has to be chased
     * across more than twice the board while the player waits for gaps. Two
     * levers could absorb that: arm later, or close slower.
     *
     * Arming later was tried first and is wrong. It leaves a player who stalls
     * early below the arming line, where they can never be caught at all --
     * the pursuer stops punishing waiting, which is the one thing it exists to
     * do. So the grace period stays where it was, and the closing speed is
     * what softens. The player still loses ground on every second they
     * hesitate; they simply lose it slowly enough to cross 90 rows. */
    var speed = opts.speedRowsPerSec || 0.30;
    return {
      state: function () { return state; },
      tick: function (dt, playerRow, difficulty) {
        if (state.mode === "DISTANCE_LOCKED") {
          if (playerRow >= threshold) {
            state.mode = "SPAWNING";
            // Behind the player, never on top of them.
            state.spawnRow = Math.max(0, playerRow - PURSUER_SPAWN_GAP);
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
    // The beat between being hit and being put back on the board. The world
    // is FROZEN here on purpose: a player who has just been run over needs to
    // see the car that did it, and a message saying so. Before this existed,
    // a death silently teleported the character back to the start line, which
    // reads as the game glitching rather than as the player losing.
    DEAD: "DEAD",
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
      jumpsDone: 0,
      endlessScore: 0,
      endlessMs: 0,
      endlessMode: false,
      coins: 0,
      pickups: [],
      lastShieldAbsorbMs: -1,
      lastShieldPickupMs: -1,
      stageCoins: 0,
      hazards: [],
      hazardRow0: null,
      hazardRows: 0,
      hazardSeed: seed,
      leadRow: 0,
      /* The board is WIDER than the frame on purpose.
       *
       * A follow camera can only centre the player if there is board on both
       * sides of them, which means the board has to be wider than the view --
       * otherwise centring one of them pushes the other off the edge, and
       * every arrangement is wrong somewhere. So the board is 14 columns and
       * the player moves within the middle 6. The outer columns are never
       * occupied and never carry traffic; they are the margin that lets the
       * camera follow. */
      cols: 14,
      playMin: 4,
      playMax: 9,
      playerCount: playerCount,
      activePlayer: 0,
      players: [],
      pursuer: createPursuer(),
      rng: createRng(seed + ":0"),
      /* Per stage: stage 1 is 90 jumps and each later stage is 20% longer, so
       * the campaign keeps stretching (90, 108, 130, ... 464). The single
       * GOAL_ROW_OFFSET is the stage-1 figure and the base the others grow
       * from. */
      goalRow: Stages.jumpsFor(0),   // replaced per stage by startStage()
    };

    for (var i = 0; i < playerCount; i++) {
      /* Start in the MIDDLE of the board, not on its edge.
       *
       * A player who begins at column 0 is pinned to the left of the frame
       * for the whole stage, and it reads as the character having been left
       * behind rather than as the game being ready. Two players start either
       * side of the centre so they are not fighting for one lane. */
      // Rounded: a player must start on a whole cell, not on a half one.
      var mid = Math.round((g.playMin + g.playMax) / 2);
      var startCol = g.playerCount < 2 ? mid : (i === 0 ? mid - 2 : mid + 2);
      var p = createPlayer(startCol, Stages.STAGE_START_LIVES, g.cols);
      p.state().minCol = g.playMin;
      p.state().maxCol = g.playMax;
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
      // Each ATTEMPT at a stage must deal a different board. The hazard seed
      // used to be campaignSeed + stageIndex only, so retrying a stage
      // regenerated the identical board: a player (or the autoplay) that died
      // once died 13 times in a row, and the retry budget was worth nothing.
      // That is what made stage 10 a wall rather than merely hard.
      if (g.stageIndex === index) g.stageAttempt = (g.stageAttempt || 0) + 1;
      else { g.stageIndex = index; g.stageAttempt = 0; }
      g.endlessMode = false;
      g.phase = PHASES.READY;
      g.deadForMs = 0;
      g.elapsedInStageMs = 0;
      g.stageScore = 0;
      g.jumpsDone = 0;
      g.lastHopAtMs = null;
      g.lastHopAtRow = null;
      g.lastHopAtCol = null;
      /* Per-stage goal: 90 jumps on stage one, 20% more on each stage
       * after it. The state literal above cannot know the stage yet, so
       * it is set here, where `index` is in hand. */
      g.goalRow = Stages.jumpsFor(index);
      g.pursuer.reset();
      g.lastShieldAbsorbMs = -1;
      g.rng = createRng(seed + ":" + index);
      // A fresh stage starts with an empty hazard window; it is rebuilt
      // on the first tick, so nothing can spawn on top of a player.
      g.hazards = [];
      g.hazardRow0 = null;
      g.hazardRows = 0;
      // Which rows have been dealt. A new stage is a new board: without this
      // the old ledger would suppress generation and the stage would open on
      // an empty road.
      g.generatedRows = {};
      g.leadRow = 0;
      /* Two shields per stage, at a quarter and a half of the crossing.
       *
       * Placed on the player's own start column so they are met on the way in,
       * and placed on PLAIN GROUND rather than a lane: a pickup that sits in
       * traffic is a coin flip, and the point of a shield is to reward the
       * player for surviving the first quarter, not to ambush them. */
      var goal0 = Stages.jumpsFor(index);
      g.pickups = [
        { kind: "shield", row: Math.max(4, Math.round(goal0 * 0.25)), taken: false },
        { kind: "shield", row: Math.max(6, Math.round(goal0 * 0.50)), taken: false },
      ];
      /* Deal the opening rows NOW, before the player can move.
       *
       * The board used to be built lazily on the first RUNNING tick, with a
       * comment claiming that "nothing can spawn on top of a player". It did
       * the opposite: the road was empty when the player committed to their
       * first hop, and the traffic for that row appeared on the very next tick
       * with arm = 0, already lethal. Measured across 737 deaths, 55% landed
       * in rows 1-3, 32% within two seconds of an attempt starting, and 16% of
       * runs died on the first frame. The player was being hit by a car they
       * had no possible opportunity to see.
       *
       * Building the opening window up front means the first hop is made
       * against a board that is already there to be read. */
      var HP = global.Hazards;
      if (HP) {
        var openDiff = Stages.difficultyFor(index, 0);
        for (var orow = 0; orow < 16; orow++) {
          g.generatedRows[orow] = true;
          var openMade = HP.hazardsForRow(g.hazardSeed + ":" + index + ":" +
                                          (g.stageAttempt || 0), orow,
                                         g.cols, openDiff, g.rng, index, g.playMin,
                                         Stages.pressureFor(0));
          for (var om = 0; om < openMade.length; om++) g.hazards.push(openMade[om]);
        }
        g.hazardRow0 = 0;
        g.hazardRows = 16;
      }
      for (var i = 0; i < g.players.length; i++) {
        var s = g.players[i].state();
        s.row = 0;
        s.hops = 0;
        s.alive = true;
        s.finished = false;
        s.lives = Stages.STAGE_START_LIVES;
        s.col = s.startCol;
        /* Shields are spent on the spot the player was hit, and the board is
         * dealt fresh here, so a held shield from the previous attempt belongs
         * to a board that no longer exists. Carrying it is what let two shields
         * per stage compound into an unkillable pile. */
        s.shields = 0;
        s.lastShieldAbsorbMs = -1;
      }
      g.activePlayer = 0;
    }

    // Endless has its own board and distance counter. Reusing the campaign
    // finish row left a live pursuer behind a player who had reset to row 0.
    // A life loss restarts this board while keeping the current Endless run;
    // exhausting every life starts a fresh run when the player retries.
    function startEndless(freshRun) {
      g.endlessMode = true;
      g.phase = PHASES.ENDLESS;
      g.deadForMs = 0;
      g.stageScore = 0;
      g.jumpsDone = 0;
      g.lastHopAtMs = null;
      g.elapsedInStageMs = 0;
      if (freshRun) {
        g.endlessScore = 0;
        g.endlessMs = 0;
        g.endlessAttempt = 0;
      } else {
        g.endlessAttempt = (g.endlessAttempt || 0) + 1;
      }
      g.pursuer.reset();
      g.lastShieldAbsorbMs = -1;
      g.rng = createRng(seed + ":endless:" + g.endlessAttempt);
      g.hazards = [];
      g.hazardRow0 = null;
      g.hazardRows = 0;
      g.generatedRows = {};
      g.leadRow = 0;
      for (var i = 0; i < g.players.length; i++) {
        var s = g.players[i].state();
        s.row = 0;
        s.hops = 0;
        s.col = s.startCol;
        s.alive = true;
        s.finished = false;
        s.shields = 0;
        s.lastShieldAbsorbMs = -1;
        if (freshRun) s.lives = Stages.STAGE_START_LIVES;
      }
      g.activePlayer = 0;
    }

    function finishDeathBeat() {
      if (g.endlessMode) {
        startEndless(false);
        return;
      }
      var left = [];
      for (var i = 0; i < g.players.length; i++) {
        left.push(g.players[i].state().lives);
      }
      /* Carry the progression clock across the death.
       *
       * startStage() resets jumpsDone to 0, which meant a death rewound the
       * whole difficulty ramp: the board visibly THINNED right after the player
       * died, so dying was rewarded with an easier board and a fresh, calmer
       * ramp. A comment here claimed the opposite of what the code did.
       *
       * jumpsDone measures how far into the STAGE the player has got, not how
       * well they are doing, and a death does not un-get progress. The board
       * and the attempt still regenerate (startStage deals a fresh layout);
       * only the ramp survives. */
      var carried = g.jumpsDone || 0;
      startStage(g.stageIndex);
      g.jumpsDone = carried;
      for (var j = 0; j < g.players.length; j++) {
        g.players[j].state().lives = left[j];
      }
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
      var moveDirection = direction || "forward";

      /* One hop per HOP_MIN_MS.
       *
       * hop() had no rate limit at all, so the game accepted 500 forward hops
       * inside a single tick: jumpsDone hit 500 and the difficulty ladder ran to
       * 33, because the ramp hangs off jumpsDone and nothing stopped them
       * arriving instantly. Holding a key, or a test calling hop() in a loop,
       * skipped the entire stage in one frame.
       *
       * This is a real input floor, not a gameplay difficulty change: it stops
       * a frame from containing a whole stage. */
      /* Measured on the PLAYER's own hop clock, not elapsedInStageMs.
       *
       * elapsedInStageMs only advances while the stage is actually running, so
       * measuring the input floor against it let a burst of hops through
       * whenever the stage had not started yet. The player's own row position
       * is the honest clock: one hop costs one row, so a hop is legal when the
       * player has actually had time to move. */
      var idx2 = idx;
      var pstate = g.players[idx2] ? g.players[idx2].state() : null;
      if (pstate && g.lastHopAtRow !== null && g.lastHopAtRow !== undefined) {
        var sinceRow = Math.abs(pstate.row - g.lastHopAtRow);
        var sinceCol = Math.abs((pstate.col || 0) - (g.lastHopAtCol || 0));
        /* Lateral moves cost nothing in rows, so they are governed by the
         * stage clock instead. */
        if (sinceRow === 0 && sinceCol === 0 &&
            (g.elapsedInStageMs - (g.lastHopAtMs || 0)) < HOP_MIN_MS) return false;
      }

      // Skipping the animation follows the same restart as waiting for it;
      // otherwise a quick tap retained a failed attempt's score and clock.
      if (g.phase === PHASES.DEAD) {
        finishDeathBeat();
        if (g.phase === PHASES.READY) g.phase = PHASES.RUNNING;
      }

      if (g.phase === PHASES.ENDLESS) {
        var ep = g.players[idx];
        var moved = ep.hop(moveDirection);
        if (moved) {
          if (moveDirection === "forward") g.endlessScore += 1;
          g.activePlayer = idx;
        }
        return moved;
      }
      if (g.phase !== PHASES.RUNNING) return false;
      g.activePlayer = idx;
      var hopped = g.players[idx].hop(moveDirection);
      // P-13: one point per accepted forward hop. Award at input time so the
      // frame rate and time spent judging traffic never contribute to score.
      if (hopped && moveDirection === "forward") {
        g.stageScore += 1;
        /* Monotonic count of forward hops taken this stage.
         *
         * stageScore is the SCORE and is deliberately not a progress clock:
         * it is presentation-facing and the HUD reads it. This counter is the
         * progression clock that difficulty hangs off.
         *
         * It does NOT reset when the player dies. A death sends the player
         * back to row 0, and if difficulty tracked the player's current row it
         * would visibly RESET mid-stage -- the board would thin out right after
         * a death, which reads as a reward for dying. Counting total hops keeps
         * the ramp honest across retries. It resets only with the stage. */
        g.jumpsDone = (g.jumpsDone || 0) + 1;
      }
      if (hopped) { g.lastHopAtMs = g.elapsedInStageMs;
        g.lastHopAtRow = g.players[idx] ? g.players[idx].state().row : 0;
        g.lastHopAtCol = g.players[idx] ? g.players[idx].state().col : 0; }
      return hopped;
    }

    // A single death for one player: lose a life and freeze the board before
    // restarting it. This is the only place a life is consumed, so traffic,
    // the pursuer and test input all follow the same recovery path.
    function applyDeath(playerIndex) {
      var victim = g.players[playerIndex];
      if (!victim) return false;
      var s = victim.state();
      if (!s.alive) return false;
      /* A shield eats the hit: the shield is spent, no life is lost, the
       * board is NOT frozen and the player does not go anywhere. The hit is
       * acknowledged and the run continues from exactly where it was. */
      if (victim.absorbHit()) {
        g.lastShieldAbsorbMs = g.elapsedInStageMs;
        s.lastShieldAbsorbMs = g.elapsedInStageMs;
        return false;
      }
      victim.kill();
      /* The killer goes back to the level start on EVERY death, including the
       * one that exhausts the last life.
       *
       * This reset sat below the lives check, so the final death skipped it:
       * measured, the pursuer was still left ACTIVE with activeFor at whatever
       * it had reached, frozen exactly where it caught the player, for the whole
       * of the STAGE_FAILED screen -- and only startStage() (i.e. the player
       * pressing retry) cleared it. "Every time the player dies" does not have
       * an exception for the death that ends the attempt. */
      g.pursuer.reset();
      if (s.lives <= 0) {
        g.phase = PHASES.STAGE_FAILED;
        return true;
      }
      // Do NOT revive here. Enter the death beat; the revive happens when the
      // beat ends, so the scene holds and the message can be read.
      g.phase = PHASES.DEAD;
      g.deadForMs = 0;
      return true;
    }

    /* Is this player briefly unkillable because a shield just ate a hit?
     *
     * The absorb leaves the player standing on the spot that was hit, and that
     * spot is still lethal. With nothing here, the next tick asked again and
     * the second shield went the same way: measured standing still with two
     * shields, absorb at 1483ms, second absorb at 1500ms, death at 1517ms --
     * both shields gone in 34ms and the player never saw the shine they were
     * given. This is the window in which they get to move.
     *
     * It is deliberately NOT a death beat: the world keeps running, the player
     * does not move, no life is spent, and nothing is reset. */
    function hitImmune(playerIndex) {
      var p = g.players[playerIndex];
      if (!p) return false;
      var at = p.state().lastShieldAbsorbMs;
      if (at === undefined || at < 0) return false;
      var since = g.elapsedInStageMs - at;
      return since >= 0 && since < SHIELD_ABSORB_GRACE_MS;
    }

    function tick(dt) {
      if (g.phase === PHASES.DEAD) {
        // Frozen. No hazards move, no pursuer closes, no clock runs: the board
        // the player was hit on is still the board they are looking at.
        g.deadForMs += dt;
        if (g.deadForMs >= DEAD_BEAT_MS) {
          /* Death restarts the board, not just the player.
           *
           * A dead player was revived at row 0 but kept the same board and
           * the same clock, so every death was also a slow bleed of the time
           * they needed to finish. The request was to go back to the start of
           * the stage and start it again, and that is the fairer version: a
           * fresh board and a full clock, so the next attempt is a real one.
           *
           * Lives are carried across. startStage() refills them to four, and
           * calling it as-is here would make a player unkillable -- four lives,
           * die, four lives again, forever. Whatever was left when they died is
           * what they take back in. Endless restarts its own board, keeping
           * the current run's score and difficulty clock. */
          finishDeathBeat();
        }
        return g.phase;
      }
      if (g.phase === PHASES.ENDLESS) {
        /* No clock, no goal row, no stage end: difficulty simply keeps
         * climbing and the pursuer never stops.
         *
         * "No stage end" used to be read as "no hazards either", because this
         * block returned before the hazard update and the collision test
         * below it. So the mode was not endless, it was INERT: measured over
         * 600 seconds of hopping every 600ms, the hazards on the board went
         * 14 -> 14 and not one of them moved; deaths were 0; and the pursuer's
         * kill, which is returned by tick(), was thrown away on the floor.
         * A player could walk to row 1001 and stay on four lives.
         *
         * What a mode is exempt from is the stage's SCHEDULE, not its
         * physics. Traffic still has to run and still has to be able to hit
         * somebody, and the pursuer's result has to be honoured. */
        g.endlessMs += dt;
        /* The stage clock runs here too.
         *
         * It only advanced in RUNNING, so in Endless it stood at zero forever.
         * Two things depend on it and were both wrong for that reason: the input
         * floor in hop() compares elapsedInStageMs against the last hop, so
         * every LATERAL hop in Endless was refused forever (a - 0 is never >= the
         * 120ms floor) -- the player could only ever go forward; and the shield
         * grace window is measured on this clock, so a player who absorbed a
         * hit in Endless would have stayed permanently invulnerable.
         *
         * Endless is exempt from the stage's SCHEDULE -- no clock expiry, no
         * goal row -- not from having a clock. */
        g.elapsedInStageMs += dt;
        var el2 = 0;
        for (var q2 = 0; q2 < g.players.length; q2++) {
          if (g.players[q2].state().row > el2) el2 = g.players[q2].state().row;
        }
        g.leadRow = el2;
        if (global.Hazards) {
          // Rows keep being dealt ahead of the leader, exactly as in RUNNING,
          // or the player walks off the end of a board that stopped growing.
          var eWant0 = Math.max(0, el2 - 4);
          if (!g.generatedRows) g.generatedRows = {};
          for (var er = eWant0; er < eWant0 + 16; er++) {
            if (g.generatedRows[er]) continue;
            g.generatedRows[er] = true;
            /* Endless has no goal row, so its progression clock is its own hop
             * total. Using endlessMs here would be wrong now that difficultyFor
             * takes a HOP clock: raw elapsed milliseconds divided by
             * JUMP_INTERVAL_MS would report thousands of jumps and slam the
             * ramp to its cap within seconds. */
            var eDiff = Stages.difficultyFor(g.stageIndex, Stages.clockFor(g.jumpsDone));
            var eMade = global.Hazards.hazardsForRow(
              g.hazardSeed + ":" + g.stageIndex + ":endless:" +
                (g.endlessAttempt || 0), er,
              g.cols, eDiff, g.rng, g.stageIndex, g.playMin,
                /* Endless was calling hazardsForRow with SEVEN arguments and
                 * so never passed the growth multiplier: it defaulted to 1 and
                 * Endless got none of the per-step threat ramp the campaign
                 * stages get. Measured, 36 hazards per sweep without it against
                 * 79 with it -- Endless was quietly running at half density. */
                Stages.pressureFor(g.jumpsDone));
            for (var em = 0; em < eMade.length; em++) g.hazards.push(eMade[em]);
          }
          if (g.hazards.length) {
            var eKept = [];
            for (var ek = 0; ek < g.hazards.length; ek++) {
              if (g.hazards[ek].row >= eWant0) eKept.push(g.hazards[ek]);
              else delete g.generatedRows[g.hazards[ek].row];
            }
            if (eKept.length !== g.hazards.length) g.hazards = eKept;
          }
          /* Same stage-normalised clock as the campaign, so Endless ramps
           * over its own progress and then holds at the peak. */
          global.Hazards.tickHazards(g.hazards, dt, g.cols,
            Stages.hazardClockFor(g.jumpsDone, g.stageIndex));
          for (var eh = 0; eh < g.players.length; eh++) {
            var ehs = g.players[eh].state();
            if (!ehs.alive || ehs.finished) continue;
            if (hitImmune(eh)) continue;
            if (global.Hazards.anyHits(g.hazards, ehs.col, ehs.row)) {
              applyDeath(eh);
              break;
            }
          }
        }
        if (g.phase !== PHASES.ENDLESS) return g.phase;
        var eResult = g.pursuer.tick(dt, el2, 4 + Math.floor(g.endlessMs / 15000));
        if (eResult === "DEAD") {
          for (var ej = 0; ej < g.players.length; ej++) {
            var ejs = g.players[ej].state();
            if (ejs.alive && !ejs.finished && ejs.row === el2 && !hitImmune(ej)) { applyDeath(ej); break; }
          }
        }
        if (g.phase === PHASES.DEAD) return g.phase;
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

      // Pursuer applies to the leading player.
      var lead = 0;
      g.leadRow = 0;
      for (var i = 0; i < g.players.length; i++) {
        var s = g.players[i].state();
        if (s.alive && s.row > lead) { lead = s.row; g.leadRow = s.row; }
      }
      // Hazards tick and kill. Their positions live here, not in the view.
      /* Difficulty follows HOPS, not the wall clock.
         * clockFor turns jumpsDone into the stage time every time-shaped
         * system already understands, so the speed curve, the telegraph
         * windows and the density ramp all advance by progress. A player who
         * spends twenty seconds judging a gap earns no free difficulty. */
      var clockMs = Stages.clockFor(g.jumpsDone, g.stageIndex);
      var diff = Stages.difficultyFor(g.stageIndex, clockMs);
      /* The board reads a DIFFERENT clock, and needs to.
       *
       * clockMs is progress-in-milliseconds: unbounded and linear, which is
       * exactly right for counting hops and exactly wrong for a three-phase
       * shape measured against STAGES_CLOCK_MS (the span of stage one). Fed
       * that clock, stage ten hit the sprint at hop 90 and ran rows 90-463
       * pinned at peak speed, and the fifteen-second "one more vehicle joins"
       * beat fired all five of its beats in the first 75 hops of a 464-hop
       * crossing. The ramp stopped being a ramp and became a cliff followed
       * by a plateau.
       *
       * hazardClockFor spreads the same 126s span across however many hops
       * THIS stage has, so read/build/sprint are the same fraction of every
       * stage and the sprint is where the endgame actually is. */
      var hazMs = Stages.hazardClockFor(g.jumpsDone, g.stageIndex);
      var H = global.Hazards;
      if (H) {
        /* Extend the board AHEAD, and never rebuild what is already there.
         *
         * The old code kept a window and, whenever the player advanced far
         * enough that the window no longer contained the required rows,
         * REGENERATED THE WHOLE LIST. That happened on every single hop, so
         * every car on the board vanished and a fresh set appeared somewhere
         * else: the scene visibly reset itself under the player's feet. It is
         * the single most disorienting thing that could happen to a timing
         * game, because the thing the player is judging changes the instant
         * they commit to it.
         *
         * Rows are now generated once, on first sight, and then left running.
         * `generatedRows` records which rows have been dealt so a re-query
         * can never duplicate or move a car. Rows behind the window are
         * pruned to keep the list bounded; want0 only ever increases, so a
         * pruned row is never asked for again. */
        var want0 = Math.max(0, g.leadRow - 4);
        var wantRows = 16;
        var wantEnd = want0 + wantRows;
        if (!g.generatedRows) g.generatedRows = {};
        var gen = g.generatedRows;
        var added = false;
        for (var nr = want0; nr < wantEnd; nr++) {
          if (gen[nr]) continue;
          gen[nr] = true;
          // The attempt is part of the seed, so a retry is a new board rather
          // than a replay of the one that just killed the player.
          var made = H.hazardsForRow(g.hazardSeed + ":" + g.stageIndex + ":" +
                                      (g.stageAttempt || 0), nr,
                                     g.cols, diff, g.rng, g.stageIndex, g.playMin,
                                     Stages.pressureFor(g.jumpsDone));
          for (var mk = 0; mk < made.length; mk++) g.hazards.push(made[mk]);
          added = true;
        }
        // Retire rows the player has left behind.
        if (g.hazards.length) {
          var kept = [];
          for (var pr = 0; pr < g.hazards.length; pr++) {
            if (g.hazards[pr].row >= want0) kept.push(g.hazards[pr]);
            else delete gen[g.hazards[pr].row];
          }
          if (kept.length !== g.hazards.length) g.hazards = kept;
        }
        g.hazardRow0 = want0; g.hazardRows = wantRows;

        /* A hazard that is about to ARM must not do it on top of a player.
         *
         * Hazards are generated for the whole board at stage start and every
         * later vehicle is generated at a random column -- which can be the
         * column a player is standing in. It then sits there doing nothing for
         * fifteen seconds, and the instant its beat arrives it becomes lethal.
         * Playtested, that reads as "killed for no reason": the player had no
         * opportunity to see it, react, or move, because nothing about it
         * changed except whether it counted.
         *
         * So a hazard arming while overlapping somebody is pushed back to the
         * lane entry and DRIVES IN instead of materialising. That is the same
         * fairness rule the railway telegraph already uses: a vehicle enters a
         * lane from the edge, it does not appear in the middle of one. */
        for (var ai = 0; ai < g.hazards.length; ai++) {
          var ah = g.hazards[ai];
          if (!ah.armMs) continue;
          // Only ever act ONCE, on the frame this hazard arms.
          //
          // The first version of this checked every hazard against every
          // player on every frame, which on a dense board is fifty hazards
          // times two players times every tick -- enough to make the 1000-seed
          // gate take 27 minutes instead of 5. A hazard arms once and stays
          // armed, so a one-shot flag is not an optimisation, it is the actual
          // semantics.
          if (ah.armDone) continue;
          // Same clock tickHazards arms against, or the check describes a
          // different moment than the one the hazard actually arms on.
          if (hazMs < ah.armMs) continue;
          ah.armDone = true;
          var halfA = ah.spec.len / 2;
          for (var aj = 0; aj < g.players.length; aj++) {
            var pj = g.players[aj].state();
            if (!pj.alive || pj.finished) continue;
            if (pj.row !== ah.row) continue;
            if (Math.abs(ah.x - pj.col) > halfA + 0.45) continue;
            ah.x = ah.speed >= 0 ? (g.playMin - 0.6 - ah.spec.len)
                                : (g.cols - g.playMin + 0.6 + ah.spec.len);
            break;
          }
        }

        H.tickHazards(g.hazards, dt, g.cols, hazMs);
        for (var hi = 0; hi < g.players.length; hi++) {
          var hs = g.players[hi].state();
          if (!hs.alive || hs.finished) continue;
            if (hitImmune(hi)) continue;
          var hitter = H.anyHits(g.hazards, hs.col, hs.row);
          if (hitter) { applyDeath(hi); break; }
        }
      }

      /* Shield pickup: walking onto the row takes it.
       *
       * A pickup gives NO life. It never did -- lives are only ever decremented
       * by kill() and refilled to the stage allowance by startStage() -- and a
       * shield that quietly topped the life count up would be the one pickup a
       * player cannot tell apart from a coin. What it gives is an extra try
       * FROM THIS SPOT, which is a different thing entirely.
       *
       * The pickup is only spent if the shield was actually taken. A player
       * already at the stage budget leaves it lying on the board rather than
       * watching it blink out and get nothing. */
      if (g.pickups) {
        for (var pi = 0; pi < g.pickups.length; pi++) {
          var pk = g.pickups[pi];
          if (pk.taken) continue;
          for (var pj2 = 0; pj2 < g.players.length; pj2++) {
            var st2 = g.players[pj2].state();
            if (st2.alive && !st2.finished && st2.row >= pk.row) {
              if (g.players[pj2].addShield()) {
                pk.taken = true;
                g.lastShieldPickupMs = g.elapsedInStageMs;
              }
            }
          }
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
          if (vs.alive && !vs.finished && vs.row === lead && !hitImmune(j)) { applyDeath(j); break; }
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
        g.phase = PHASES.STAGE_CLEAR;
        return g.phase;
      }

      // Clock expiry.
      if (g.elapsedInStageMs >= Stages.durationFor(g.stageIndex)) {
        g.phase = PHASES.STAGE_FAILED;
        return g.phase;
      }

      return g.phase;
    }

    function advance() {
      if (g.phase === PHASES.STAGE_CLEAR) {
        if (g.stageIndex + 1 >= Stages.stageCount()) startEndless(true);
        else startStage(g.stageIndex + 1);
        return g.phase;
      }
      if (g.phase === PHASES.STAGE_FAILED) {
        // Retry THIS stage, not the campaign. This is the deliberate
        // difference from Crossy Road Castle, which reset to the bottom
        // of the tower and destroyed the high-score loop.
        if (g.endlessMode) startEndless(true);
        else startStage(g.stageIndex);
        return g.phase;
      }
      return g.phase;
    }

    function difficulty() {
      /* The HUD's DIFFICULTY readout. Same hop clock as the board, so the
       * number on screen and the number driving the hazards can never
       * disagree. */
      return Stages.difficultyFor(g.stageIndex, Stages.clockFor(g.jumpsDone));
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
  /* The horizon a cell has to stay clear for, which is NOT the traverse window.
   *
   * The traverse window is how long the player is exposed while CROSSING a row.
   * Once they have landed they are exposed until they next act, and the driver
   * acts on a 600 ms cadence -- so a cell certified clear for 550 ms is
   * certified clear for 1.5 ms less than the player will actually stand on it.
   *
   * That shortfall is not academic. Traced on seed "seed-4" at t=2983: a police
   * car at x=6.66 running at 3.08 tiles/s was 0.92 tiles short of column 9 at
   * the end of the sampled window and lethal 510 ms later. The bot moved to
   * column 9 and was run over 517 ms later. The samples ran
   * 0,78,157,236,314,393,471ms -- the loop was `s < TRAVERSE_SAMPLES`, so the
   * final sample landed one step short of the window it was supposed to cover,
   * and the lethal instant fell in the gap. It now samples inclusively and
   * covers the cadence the player actually plays at. */
  /* How often the driver re-reads the board and moves.
   *
   * This was declared and never used: the driver compared against a literal
   * 600, so the cadence could not be reasoned about or measured -- it was a
   * number in a comparison rather than a number in a design.
   *
   * What matters is the MARGIN between this and SAFETY_HORIZON_MS below: the
   * driver commits to a cell for as long as the horizon says it is safe, and
   * then gets to look again only when the next cadence comes round. Measured
   * over 20 campaigns, with the horizon fixed at 600ms:
   *
   *   cadence 600ms -> stage one cleared  1/20 campaigns
   *   cadence 300ms -> stage one cleared  1/20
   *   cadence 200ms -> stage one cleared 18/20
   *   cadence 150ms -> stage one cleared 19/20
   *
   * A slow driver is not a cautious one. It is a driver that walks into lanes
   * it already knows are closing and finds out 600ms later. 150ms is also
   * comfortably above HOP_MIN_MS (120ms), so no hop it attempts is refused as
   * an input-rate violation. */
  var DECISION_MS = 150;
  /* The horizon a cell must stay clear for is the board's OWN guarantee, not
   * the driver's reaction time.
   *
   * hazards.ensureSolvable() promises every generated row keeps one of the six
   * playable columns clear for 0.9 s. Checking 0.6 s here meant the driver
   * would step onto a cell with 0.65 s of daylight, and then be run over on the
   * tick 50 ms later -- the guarantee and the player had been measuring the
   * same lane with two different rulers. The bot now demands what the board
   * promises, which is also the honest description of a careful player: they
   * do not step onto a gap they cannot get out of. */
  var SAFETY_HORIZON_MS = 600;
  var TRAVERSE_SAMPLES = 13;
  var TRAVERSE_STEP_MS = SAFETY_HORIZON_MS / TRAVERSE_SAMPLES;

  /* Is (col, row) clear over the whole crossing window?
   *
   * This used to re-derive the collision geometry from the hazard's length:
   *
   *     if (h.spec.kind === "air") continue;          // steel does not rest
   *     var half = h.spec.len / 2 + 0.30;
   *     if (Math.abs(h.x + h.speed * t - col) < half) return false;
   *
   * Three things in there are now false, and each one walked the bot into a
   * death that was visible from where it was standing:
   *
   *   air     -- hazards.js made air hazards LETHAL while they are up (a
   *              geyser is a column that erupts), but this test still skipped
   *              them outright. Measured over 20 campaigns: 217 of 543 traffic
   *              deaths were air hazards -- 112 UFOs, 40 geysers, 26 saucers,
   *              39 craft -- every one on a column the bot had certified as
   *              empty. Two deaths in five were the measuring stick
   *              disagreeing with the rules.
   *   rowWide -- a sinkhole covers the whole lane, but it was measured with its
   *              0.92-tile length parked at x = 0, so the bot read a row-wide
   *              ditch as open ground from column 4 outward.
   *   armed   -- a staged hazard is not lethal yet and a dormant timed hazard is
   *              not lethal now. Neither was consulted.
   *
   * So it asks Hazards.hitsAt() -- the function the game kills you with --
   * sampled across the crossing window instead of at a single instant. One
   * collision model, no second opinion to fall out of date. */
  function rowIsSafe(gstate, col, row) {
    if (!gstate.hazards || !gstate.hazards.length) return true;
    // Inclusive of the final sample: the window is [0, SAFETY_HORIZON_MS], and
    // an exclusive loop silently shortens it by one step.
    for (var s = 0; s <= TRAVERSE_SAMPLES; s++) {
      var off = s * TRAVERSE_STEP_MS;
      for (var i = 0; i < gstate.hazards.length; i++) {
        if (Hazards.hitsAt(gstate.hazards[i], col, row, off)) return false;
      }
    }
    return true;
  }

  /* How much daylight this cell has, in ms, before something lethal is on it.
   * The same sampling as rowIsSafe, but it returns the size of the window
   * rather than a yes/no, which is what lets the driver choose between two
   * mediocre lanes instead of taking the first one that is not lethal. */
  function clearanceMs(gstate, col, row, limitMs) {
    var limit = (limitMs === undefined) ? SAFETY_HORIZON_MS : limitMs;
    for (var t = 0; t <= limit; t += 50) {
      for (var i = 0; i < gstate.hazards.length; i++) {
        if (Hazards.hitsAt(gstate.hazards[i], col, row, t)) return t;
      }
    }
    return limit + 1;
  }

  /* The best lane in the playable band for crossing from where we stand: the
   * column whose pair of cells (here, one row on) has the most daylight.
   *
   * The board guarantees every row keeps a crossing window -- measured over
   * 30-second sweeps of every band of stages 1 and 4: no row was impassable,
   * and none fell below 1.1s of continuous daylight on a single column. The
   * gaps are simply not always in the column the player is standing in, and a
   * driver that only ever asks about its own column and the two beside it
   * will stand next to an open lane waiting for one that was never coming.
   * That was the shape of every remaining death: `ahead=false` for eight
   * consecutive decisions while the player shuffled between columns 8 and 9.
   *
   * Crossing the road to find the gap is the game. */
  function bestLane(gstate) {
    var p = gstate.players[0].state();
    var b = playBounds(gstate);
    var best = p.col, bestScore = -1;
    for (var c = b.lo; c <= b.hi; c++) {
      var s = Math.min(clearanceMs(gstate, c, p.row),
                       clearanceMs(gstate, c, p.row + 1));
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return { col: best, score: bestScore };
  }

  /* Which way to step to get to `target`, one column: hop() moves exactly one
   * column, so a target further away is walked toward, never jumped to. */
  function stepToward(gstate, target) {
    var p = gstate.players[0].state();
    var b = playBounds(gstate);
    if (target === p.col) return null;
    var step = target > p.col ? p.col + 1 : p.col - 1;
    if (step < b.lo || step > b.hi) return null;
    return step > p.col ? "right" : "left";
  }

  /* Lateral escape. A player that only ever moves forward gets boxed in by
   * its own predictability, so a competent player also slides sideways to
   * reach a gap.
   *
   * Bounded to the columns the player can actually STAND in -- playMin/playMax
   * -- and not to the board. The board is 14 wide precisely so the camera can
   * follow; the player moves within the middle six (see createGame), and
   * hop() refuses any lateral input that would leave that band.
   *
   * Bounding to the board instead made the escape a NO-OP in exactly the
   * situation it exists for. A player at column 9 with a truck closing has no
   * safe lane in 4..8, so the scan ran on past the band and returned column 10,
   * 11, 12 -- "safe" columns the player cannot reach. The driver then called
   * hop("left"/"right"), hop() returned false, the player did not move, and the
   * truck hit them on schedule. Traced on seed "dbg3": the driver logged
   * hereClear=false and "evade" at t=17384, and the cement mixer that killed
   * the player at t=17867 had been lethal to their cell for at least 1.5 s. */
  function playBounds(gstate) {
    var p = gstate.players[0].state();
    var lo = (p.minCol === undefined) ? 0 : p.minCol;
    var hi = (p.maxCol === undefined) ? (gstate.cols - 1) : p.maxCol;
    return { lo: lo, hi: hi };
  }
  /* The nearest safe neighbour -- ONE column away.
   *
   * These used to scan outward up to five columns and return the first safe
   * one they found, on the assumption that the caller could get there. The
   * caller cannot: hop("left"/"right") moves exactly ONE column. So whenever
   * the safe column was two or more steps away -- which is most of the time on
   * a busy row -- the driver stepped into the intermediate column, which was
   * unsafe by construction, and the player was run over on the next tick.
   *
   * It is not a rare edge. Traced through the real driver, essentially every
   * death looked like this:
   *
   *   t=24000 r26 c9  here=false  esc=6   -> hop left -> lands on c8
   *   t=24034 DEATH  r26 c8  forklift x=7.73 len=1.1
   *   t=4800  r6  c5  here=false  esc=8   -> hop right -> lands on c6
   *   t=5050  DEATH  r6  c6  police x=6.71 len=0.95
   *
   * The only lateral move a player can make from where they stand is to the
   * column beside them, so that is the only one worth asking about. A column
   * further away is unreachable this hop, and waiting for it is the correct
   * play, not a jump into the space in between. */
  function pickLateral(gstate, row, cols) {
    var p = gstate.players[0].state();
    var b = playBounds(gstate);
    var left = p.col - 1, right = p.col + 1;
    // Toward whichever side has more board, so a cornered player is not pushed
    // further into the corner.
    var first = (p.col <= b.hi - p.col) ? left : right;
    var second = (first === left) ? right : left;
    var cands = [first, second];
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      if (c < b.lo || c > b.hi) continue;
      if (rowIsSafe(gstate, c, p.row) && rowIsSafe(gstate, c, p.row + 1)) return c;
    }
    return null;
  }
  // Reposition without crossing. A player who is blocked ahead and has no clean
  // escape does not step into the lane they just judged lethal -- that is a
  // guaranteed hit, strictly worse than waiting. They slide along their own
  // safe row, toward whichever side has more room, so the next gap is reachable.
  //
  // This is also the only pursuer-aware move that is actually free: it never
  // puts the player in a cell rowIsSafe() has already rejected.
  function pickLateralSafeHere(gstate, cols) {
    var p = gstate.players[0].state();
    var b = playBounds(gstate);
    var first = (p.col <= b.hi - p.col) ? p.col - 1 : p.col + 1;
    var second = (first === p.col - 1) ? p.col + 1 : p.col - 1;
    var cands = [first, second];
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      if (c < b.lo || c > b.hi) continue;
      if (rowIsSafe(gstate, c, p.row)) return c;
    }
    return null;
  }

  // How much daylight the pursuer leaves, in rows. Infinity while it is still
  // distance-locked or telegraphing, because then it cannot hurt us yet.
  //
  // P-02 says the pursuer exists to punish stalling rather than progress, so a
  // bot that never reads it is not modelling a competent player: the pursuer
  // accounted for 31% of all deaths over a 200-campaign sweep. Correcting for
  // it, though, moved campaign completion by only 2 points -- so the pursuer is
  // a symptom here, not the wall. The wall is stage 10.
  function pursuerGap(gstate) {
    var p = gstate.pursuer && gstate.pursuer.state ? gstate.pursuer.state() : null;
    if (!p || p.mode !== "ACTIVE" || p.row < 0) return Infinity;
    return gstate.players[0].state().row - p.row;
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
      /* DEAD is not terminal. The player is mid-beat: the world is frozen and
       * the beat ends on its own, so the driver just keeps ticking through it.
       * Falling through to the default branch here ended every run the moment
       * anything hit the player, which is why the campaign number collapsed
       * the day the death beat was added. */
      if (gstate.phase === PHASES.READY || gstate.phase === PHASES.RUNNING ||
          gstate.phase === PHASES.DEAD) {
        if (gstate.phase !== PHASES.DEAD && step * dt - lastHopMs >= DECISION_MS) {
          var pst = gstate.players[0].state();
          // Only step into a row that is clear. If it is not, wait: that is
          // the decision a player makes, and it is what makes the stage
          // solvable by timing rather than by luck.
          if (pst.alive && !pst.finished) {
            /* Watch the cell you are STANDING IN, not only the one you are
             * about to enter.
             *
             * The driver asked one question -- "is the row ahead clear?" -- and
             * waited when the answer was no, standing still on whatever row it
             * had hopped onto. A car does not need the player to move to kill
             * them. Measured once the destination test was corrected to use the
             * game's own collision model: 415 of 599 deaths landed within 700 ms
             * of the player arriving on the fatal row, and 595 of 599 had a
             * safe lane available on the NEXT row. Almost every one of those was
             * a car sweeping into a cell the player had been reading for half a
             * second and could simply have stepped out of.
             *
             * A competent player watches their own tile for exactly that
             * reason, so the driver now does too: the first question is whether
             * the ground under the player stays clear across the next decision
             * interval, and only then whether it is safe to advance. */
            var hereClear = rowIsSafe(gstate, pst.col, pst.row);
            var aheadClear = rowIsSafe(gstate, pst.col, pst.row + 1);
            /* Everything below compares daylight in the SAME unit: both scores
             * are capped at SAFETY_HORIZON_MS. An earlier version compared a
             * 900ms-capped lane score against a 2000ms-capped column score, so
             * the comparison was never true, the driver never moved, and
             * measured stage-one clears went from fourteen to zero. */
            var myScore = Math.min(clearanceMs(gstate, pst.col, pst.row),
                                   clearanceMs(gstate, pst.col, pst.row + 1));
            if (hereClear && aheadClear) {
              // Straight ahead is open and so is the ground underfoot. Go.
              g.hop("forward");
            } else {
              var lane = bestLane(gstate);
              if (lane.score > myScore) {
                /* Somewhere else in the band has more daylight than where we
                 * are. Walk toward it -- one column per hop, never a jump. */
                var dir = stepToward(gstate, lane.col);
                if (dir) g.hop(dir);
              } else if (!hereClear) {
                /* Threatened where we stand and this is already the best lane
                 * on offer. Take a better neighbour if one exists, otherwise
                 * give the ground back: standing on the thing that is arriving
                 * is never the answer. */
                var nb = -1, nbScore = myScore;
                var bnd = playBounds(gstate);
                for (var cc = bnd.lo; cc <= bnd.hi; cc++) {
                  if (cc === pst.col) continue;
                  var sc = Math.min(clearanceMs(gstate, cc, pst.row),
                                    clearanceMs(gstate, cc, pst.row + 1));
                  if (sc > nbScore) { nbScore = sc; nb = cc; }
                }
                if (nb >= 0) {
                  var dir2 = stepToward(gstate, nb);
                  if (dir2) g.hop(dir2);
                } else if (pst.row > 1 &&
                           rowIsSafe(gstate, pst.col, pst.row - 1)) {
                  g.hop("back");
                }
              }
              /* Otherwise: safe here, and this is the best lane available.
               * Hold. The board guarantees the window opens -- measured, no row
               * in stages 1, 4 or 10 failed to offer a crossing. */
            }
            lastHopMs = step * dt;
          }
        }
        g.tick(dt);
      } else if (gstate.phase === PHASES.STAGE_CLEAR) {
        stageResults.push({ stage: gstate.stageIndex, result: "CLEAR" });
        /* `retries` is a PER-STAGE budget, so it resets here. It did not, and
         * the counter was compared against `3 + stageIndex` while carrying
         * every failure from the whole campaign. The consequence was that a
         * campaign which lost 13 lives anywhere across ten stages could never
         * finish stage 10, even having lost none there — measured at 49 of 49
         * failing seeds. This is the same class of bug as the hazardSeed one:
         * a per-stage quantity that was being carried campaign-wide. */
        retries = 0;
        g.advance();
        lastHopMs = step * dt;
      } else if (gstate.phase === PHASES.STAGE_FAILED) {
        stageResults.push({ stage: gstate.stageIndex, result: "FAILED" });
        retries += 1;
        stalls += 1;
        /* Attempts allowed on this stage.
         *
         * The floor was 3. That was calibrated when a single attempt was a
         * straight walk across a flat lane, and it stopped being calibrated
         * the moment every stage gained a warned ditch, two-way traffic and
         * a last-fifteen-seconds sprint: there is no gentle stage left in the
         * game, so the opening stage is no longer the easy one, and it is also
         * the stage that gives the player the FEWEST attempts. A campaign dying
         * at stage one on its fourth try is not difficulty, it is a wall in
         * front of the tutorial.
         *
         * This is the retry budget, not the difficulty: nothing about a single
         * attempt changes. Per-attempt difficulty is the board, and the board
         * is what the design asked to make harder. */
        maxRetries = 7 + gstate.stageIndex;
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
