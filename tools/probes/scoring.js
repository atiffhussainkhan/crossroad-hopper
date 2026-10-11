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

  try {
    window.Hazards = null;
    var g = game();
    g.tick(5000);
    equal(g.state().stageScore, 0, "READY waiting does not score");
    equal(g.hop(), true, "default input is a forward hop");
    equal(g.state().stageScore, 1, "hop scores before a tick");
    g.tick(5000);
    equal(g.state().stageScore, 1, "RUNNING waiting does not score");
    equal(g.hop("left"), true, "left accepted");
    equal(g.hop("right"), true, "right accepted");
    equal(g.hop("back"), true, "back accepted");
    equal(g.state().stageScore, 1, "lateral and backward movement do not score");
    equal(g.hop("back"), false, "back refused at row zero");
    equal(g.hop("unknown"), false, "unknown direction refused");
    equal(g.hop("forward", -1), false, "invalid player refused");
    equal(g.state().stageScore, 1, "refused movement does not score");
    equal(g.hop("forward"), true, "forward after back accepted");
    equal(g.state().stageScore, 2, "each accepted forward hop scores under P-13");

    var duo = game(2);
    forwards(duo, 3, 0);
    forwards(duo, 2, 1);
    duo.tick(1700);
    equal(duo.state().stageScore, 5, "two players contribute only their forward hops");

    var bank = game();
    clearStage(bank);
    equal(bank.state().totalScore, 40, "cleared stage banks exactly 40 points");
    bank.tick(5000);
    equal(bank.state().totalScore, 40, "stage banks only once");
    equal(bank.hop("forward"), false, "interstitial refuses movement");
    bank.advance();
    equal(bank.state().stageScore, 0, "next stage starts an empty score");
    equal(bank.state().totalScore, 40, "bank survives stage advance");
    forwards(bank, 3);
    bank.tick(Stages.STAGE_DURATION_MS);
    equal(bank.state().phase, SimCore.PHASES.STAGE_FAILED, "timeout fails stage");
    equal(bank.state().totalScore, 40, "failed stage is not banked");
    bank.advance();
    equal(bank.state().stageScore, 0, "retry discards failed attempt score");
    equal(bank.state().totalScore, 40, "retry preserves banked campaign points");

    var dead = game();
    forwards(dead, 3);
    dead.tick(100);
    dead.applyDeath(0);
    dead.tick(1000);
    equal(dead.state().stageScore, 3, "death freeze does not score");
    equal(dead.state().elapsedInStageMs, 100, "death freeze stops clock");
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
    forwards(finish, 40, 0);
    finish.tick(1);
    equal(finish.state().phase, SimCore.PHASES.RUNNING, "one finish waits for second player");
    equal(finish.hop("forward", 0), false, "finished player cannot farm points");
    equal(finish.state().stageScore, 40, "finished player does not score again");
    forwards(finish, 40, 1);
    finish.tick(1);
    equal(finish.state().totalScore, 80, "both players bank their 40 forward hops");

    var campaign = game();
    for (var stage = 0; stage < Stages.stageCount(); stage++) {
      clearStage(campaign);
      equal(campaign.state().totalScore, 40 * (stage + 1), "campaign bank accumulates");
      campaign.advance();
    }
    equal(campaign.state().phase, SimCore.PHASES.ENDLESS, "final celebration advances to Endless");
    equal(campaign.state().endlessMode, true, "Endless mode exposed to UI");
    equal(campaign.state().totalScore, 400, "Endless entry preserves campaign bank");
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
    equal(campaign.state().totalScore, 400, "Endless retry keeps campaign bank");

    var endlessDuo = game(2);
    endlessDuo.startStage(Stages.stageCount() - 1);
    clearStage(endlessDuo);
    endlessDuo.advance();
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
