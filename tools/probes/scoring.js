/* Regression for P-13 and the campaign-to-Endless lifecycle.
 * Run via tools/build_bundle.py, then the project's JavaScript runtime.
 * Traffic and the pursuer are disabled in the scoring cases so these pin the
 * scoring/state-machine rules, independently of a particular random board.
 * The final case restores the real traffic module and verifies a live board.
 */
(function () {
  "use strict";
  var originalHazards = window.Hazards;
  var checks = 0;

  function equal(actual, expected, label) {
    checks++;
    if (actual !== expected) {
      throw new Error(label + ": expected " + expected + ", got " + actual);
    }
  }

  function game(players) {
    var g = SimCore.createGame({ playerCount: players || 1, seed: "scoring-probe" });
    g.state().pursuer = SimCore.createPursuer({ threshold: 1000000 });
    return g;
  }

  function forwards(g, count, player) {
    for (var i = 0; i < count; i++) {
      /* One beat before each hop, but only while the stage is RUNNING.
       *
       * hop() has an input floor: a player who has not moved since their last
       * accepted hop cannot hop again until HOP_MIN_MS of stage clock has
       * passed. These cases fire whole stages of forward hops back to back
       * inside a single instant, so the floor refused the second hop of every
       * burst and the probe failed on an input-rate rule while claiming to
       * test scoring. Every assertion below is about the SCORE and the state
       * machine, so the hops are driven at a cadence a player could produce.
       *
       * RUNNING only: in ENDLESS the hop path returns before it writes the
       * floor's marker, so the floor is inert there and a beat would move
       * endlessMs -- a clock several of these cases assert on. */
      if (g.state().phase === SimCore.PHASES.RUNNING) g.tick(150);
      equal(g.hop("forward", player), true, "forward hop accepted");
    }
  }

  function clearStage(g) {
    for (var p = 0; p < g.state().players.length; p++) {
      forwards(g, g.state().goalRow, p);
    }
    g.tick(1);
    equal(g.state().phase, SimCore.PHASES.STAGE_CLEAR, "stage clears");
  }

  /* Crossing a stage picks up the two shield rows on the way, and those shields
   * are still held when the run enters Endless. Every Endless case below is
   * about LIVES, the run score and the difficulty clock, and a shield silently
   * absorbs the first applyDeath() -- so the case read "a life was lost" off a
   * board where none was, and then measured the difficulty clock across a death
   * beat that never happened. Shields are not what these cases are about, so
   * they are cleared on the way in. */
  function stripShields(g) {
    for (var p = 0; p < g.state().players.length; p++) {
      g.state().players[p].state().shields = 0;
    }
  }

  try {
    window.Hazards = null;
    var g = game();
    g.tick(5000);
    equal(g.state().stageScore, 0, "READY waiting does not score");
    equal(g.hop(), true, "default input is a forward hop");
    equal(g.state().stageScore, 1, "hop scores before a tick");
    g.tick(5000);
    equal(g.state().stageScore, 1, "RUNNING waiting does not score");
    /* Every input below is preceded by one beat.
     *
     * hop() has an input floor: a player who has not moved since their last
     * accepted hop cannot hop again until HOP_MIN_MS of stage clock has passed.
     * These four calls used to land inside a single instant, so "right" was
     * refused by the floor instead of by the board -- and the refusals after it
     * ("back at row zero", "unknown direction", "invalid player") could then
     * pass for any reason at all, which is a test that cannot fail.
     *
     * A beat between inputs keeps each assertion measuring the rule it names:
     * the floor lets the input through, and only the rule under test can
     * refuse it. */
    function beat(g) { g.tick(150); }   // > HOP_MIN_MS (120)
    beat(g);
    equal(g.hop("left"), true, "left accepted");
    beat(g);
    equal(g.hop("right"), true, "right accepted");
    beat(g);
    equal(g.hop("back"), true, "back accepted");
    equal(g.state().stageScore, 1, "lateral and backward movement do not score");
    beat(g);
    equal(g.hop("back"), false, "back refused at row zero");
    beat(g);
    equal(g.hop("unknown"), false, "unknown direction refused");
    beat(g);
    equal(g.hop("forward", -1), false, "invalid player refused");
    equal(g.state().stageScore, 1, "refused movement does not score");
    beat(g);
    equal(g.hop("forward"), true, "forward after back accepted");
    equal(g.state().stageScore, 2, "each accepted forward hop scores under P-13");

    var duo = game(2);
    forwards(duo, 3, 0);
    forwards(duo, 2, 1);
    duo.tick(1700);
    equal(duo.state().stageScore, 5, "two players contribute only their forward hops");

    var bank = game();
    clearStage(bank);
    /* The bank is this stage's OWN jump count, read from the stage table the
     * win condition is read from. GOAL_ROW_OFFSET is stage ONE's figure and a
     * fallback for callers with no stage; using it here meant the bank
     * assertion tracked a constant that happened to agree with stage one rather
     * than the length of the stage actually being played. Both are 90 today, so
     * this changes no result -- it stops the two drifting apart the first time
     * stage one's length changes. */
    var banked = Stages.jumpsFor(bank.state().stageIndex);
    equal(bank.state().totalScore, banked, "cleared stage banks one point per hop (" + banked + ")");
    bank.tick(5000);
    equal(bank.state().totalScore, banked, "stage banks only once");
    equal(bank.hop("forward"), false, "interstitial refuses movement");
    bank.advance();
    equal(bank.state().stageScore, 0, "next stage starts an empty score");
    equal(bank.state().totalScore, banked, "bank survives stage advance");
    forwards(bank, 3);
    /* This stage's OWN safety net, not the flat STAGE_DURATION_MS. The net now
     * scales with the stage (durationFor = jumps x allowance + grace, floored
     * at STAGE_DURATION_MS), so after advance() to stage two a flat 180s tick
     * is no longer long enough to expire anything -- the stage simply carried
     * on, and this case reported "timeout fails stage" against a clock that
     * had not run out. Read the limit the sim actually enforces. */
    bank.tick(Stages.durationFor(bank.state().stageIndex));
    equal(bank.state().phase, SimCore.PHASES.STAGE_FAILED, "timeout fails stage");
    equal(bank.state().totalScore, banked, "failed stage is not banked");
    bank.advance();
    equal(bank.state().stageScore, 0, "retry discards failed attempt score");
    equal(bank.state().totalScore, banked, "retry preserves banked campaign points");

    var dead = game();
    forwards(dead, 3);
    /* 200ms of stage, not 100: the tap that skips the death beat below has to
     * be a LEGAL input, and the floor measures the gap between the player's
     * last hop and now. A player who has had 200ms on the board has. (100ms
     * was inside the 120ms floor, so the tap was swallowed by the floor and
     * this case tested the floor instead of the skip.) */
    dead.tick(200);
    /* The clock is read BEFORE the death and compared after it, rather than
     * pinned to a literal: the hops above are driven at a real cadence now, so
     * the absolute figure is not 100 any more. What this asserts is the
     * property it always meant to -- the clock does not move during the
     * death beat -- and that is exactly what the comparison checks. */
    var deadClock = dead.state().elapsedInStageMs;
    dead.applyDeath(0);
    dead.tick(1000);
    equal(dead.state().stageScore, 3, "death freeze does not score");
    equal(dead.state().elapsedInStageMs, deadClock, "death freeze stops clock");
    dead.hop("forward");
    equal(dead.state().stageScore, 1, "skipping death beat scores only new attempt hop");
    equal(dead.state().players[0].state().row, 1, "skip restarts at stage beginning");
    equal(dead.state().players[0].state().lives, 3, "skip preserves remaining lives");
    dead.applyDeath(0);
    dead.tick(2100);
    equal(dead.state().phase, SimCore.PHASES.READY, "automatic death restart waits for input");
    equal(dead.state().stageScore, 0, "automatic death restart resets attempt score");
    equal(dead.state().players[0].state().lives, 2, "automatic restart preserves lives");

    var finish = game(2);
    /* This stage's own goal, from the stage table. Same value as
     * GOAL_ROW_OFFSET on stage one today, derived so it stays right if the
     * stage lengths change. */
    var finishGoal = Stages.jumpsFor(finish.state().stageIndex);
    forwards(finish, finishGoal, 0);
    finish.tick(1);
    equal(finish.state().phase, SimCore.PHASES.RUNNING, "one finish waits for second player");
    equal(finish.hop("forward", 0), false, "finished player cannot farm points");
    equal(finish.state().stageScore, finishGoal, "finished player does not score again");
    forwards(finish, finishGoal, 1);
    finish.tick(1);
    equal(finish.state().totalScore, finishGoal * 2,
            "both players bank their forward hops");

    var campaign = game();
    /* The bank is the SUM OF THE STAGES' OWN JUMP COUNTS, not stage one's
     * GOAL_ROW_OFFSET multiplied by how many stages have been cleared. Stages
     * carry their own lengths (90, 108, 130, ... 464) and clearStage() already
     * walks each stage's own goalRow, so the fixed multiplier fell behind the
     * board it was checking: after stage two the bank held 198 and this
     * expected 180. */
    var campaignBank = 0;
    for (var stage = 0; stage < Stages.stageCount(); stage++) {
      clearStage(campaign);
      campaignBank += Stages.jumpsFor(stage);
      equal(campaign.state().totalScore, campaignBank,
            "campaign bank accumulates");
      campaign.advance();
    }
    equal(campaign.state().phase, SimCore.PHASES.ENDLESS, "final celebration advances to Endless");
    equal(campaign.state().endlessMode, true, "Endless mode exposed to UI");
    stripShields(campaign);
    equal(campaign.state().totalScore, campaignBank,
            "Endless entry preserves campaign bank");
    equal(campaign.state().stageScore, 0, "Endless entry clears banked stage accumulator");
    equal(campaign.state().endlessScore, 0, "Endless score starts at zero");
    equal(campaign.state().players[0].state().row, 0, "Endless starts at row zero");
    equal(campaign.state().players[0].state().finished, false, "Endless player can move immediately");
    equal(campaign.state().pursuer.state().mode, "DISTANCE_LOCKED", "Endless pursuer reset");
    equal(campaign.state().hazards.length, 0, "Endless clears campaign hazards");
    equal(Object.keys(campaign.state().generatedRows).length, 0, "Endless clears campaign ledger");
    campaign.tick(5000);
    equal(campaign.state().endlessScore, 0, "Endless waiting does not score");
    equal(campaign.hop("left"), true, "Endless lateral accepted");
    equal(campaign.state().endlessScore, 0, "Endless lateral does not score");
    forwards(campaign, 2);
    campaign.hop("back");
    equal(campaign.state().endlessScore, 2, "Endless counts only forward hops");
    campaign.applyDeath(0);
    campaign.tick(2100);
    equal(campaign.state().phase, SimCore.PHASES.ENDLESS, "Endless death restarts Endless");
    equal(campaign.state().players[0].state().row, 0, "Endless death resets distance");
    equal(campaign.state().endlessScore, 2, "Endless life loss preserves run score");
    equal(campaign.state().endlessMs, 5000, "Endless life loss preserves difficulty clock");
    equal(campaign.state().players[0].state().lives, 3, "Endless life loss consumes one life");
    campaign.hop("forward");
    campaign.applyDeath(0);
    campaign.hop("forward");
    equal(campaign.state().phase, SimCore.PHASES.ENDLESS, "skipped Endless beat stays Endless");
    equal(campaign.state().endlessScore, 4, "skipped Endless beat retains run score and adds hop");
    campaign.applyDeath(0);
    campaign.tick(2100);
    campaign.applyDeath(0);
    equal(campaign.state().phase, SimCore.PHASES.STAGE_FAILED, "Endless exhaustion offers retry");
    equal(campaign.state().endlessMode, true, "failure retains mode for UI");
    campaign.advance();
    equal(campaign.state().phase, SimCore.PHASES.ENDLESS, "exhaustion retry stays Endless");
    equal(campaign.state().endlessScore, 0, "exhaustion retry starts fresh Endless score");
    equal(campaign.state().endlessMs, 0, "exhaustion retry starts fresh difficulty clock");
    equal(campaign.state().players[0].state().lives, 4, "exhaustion retry restores four lives");
    equal(campaign.state().totalScore, campaignBank,
            "Endless retry keeps campaign bank");

    var endlessDuo = game(2);
    endlessDuo.startStage(Stages.stageCount() - 1);
    clearStage(endlessDuo);
    endlessDuo.advance();
    stripShields(endlessDuo);
    equal(endlessDuo.state().players[1].state().row, 0, "both Endless players start at row zero");
    equal(endlessDuo.state().players[1].state().finished, false, "both Endless players can move");
    forwards(endlessDuo, 3, 0);
    forwards(endlessDuo, 2, 1);
    endlessDuo.hop("right", 0);
    equal(endlessDuo.state().endlessScore, 5, "Endless combines two players' forward hops");
    endlessDuo.applyDeath(1);
    endlessDuo.tick(2100);
    equal(endlessDuo.state().players[0].state().row, 0, "Endless death restarts both players' board");
    equal(endlessDuo.state().players[0].state().lives, 4, "Endless death preserves partner's lives");
    equal(endlessDuo.state().players[1].state().lives, 3, "Endless death costs only victim's life");
    equal(endlessDuo.state().endlessScore, 5, "Endless duo retains run score after death");

    var live = game();
    live.startStage(Stages.stageCount() - 1);
    clearStage(live);
    live.state().hazards = [{ row: 35 }];
    live.state().generatedRows = { 35: true };
    live.advance();
    window.Hazards = originalHazards;
    live.tick(16.667);
    equal(live.state().hazards.length > 0, true, "Endless generates new traffic");
    var xs = live.state().hazards.map(function (h) { return h.x; });
    live.tick(100);
    var moving = false;
    for (var h = 0; h < xs.length; h++) {
      if (xs[h] !== live.state().hazards[h].x) moving = true;
    }
    equal(moving, true, "Endless traffic moves");
    equal(live.state().phase, SimCore.PHASES.ENDLESS, "live Endless remains playable");
    print("SCORING + ENDLESS: PASS (" + checks + " assertions)");
  } finally {
    window.Hazards = originalHazards;
  }
})();
