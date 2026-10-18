function pad(v,n){v=String(v);while(v.length<n)v+=" ";return v;}

/* A narrated live run of the finished game: one full stage of stage 1,
 * second by second, driving the real SimCore. This is the shipping build --
 * the same code the browser loads -- played by a policy that looks before it
 * hops, so what you read is what a competent player actually meets. */

var DT = 1000/60;
var g = SimCore.createGame({ playerCount: 1, seed: "live-run" });
var CH = Roster.getCharacter("char_01");

print("=========================================================");
print("  HOPPER  --  live run, stage " + Stages.getStage(0).name);
print("  character: " + CH.name + "   seed: live-run");
print("=========================================================");
print("");
g.hop("forward", 0);   // READY -> RUNNING

var el = 0, nextHop = 300, deaths = 0, lastPhase = "";
var seenClear = false;

function snapshot() {
  var s = g.state();
  var pl = s.players[0].state();
  var live = 0, nearest = 99, nearestDesc = "";
  for (var i = 0; i < s.hazards.length; i++) {
    var h = s.hazards[i];
    if (Hazards.isStaged(h) || Hazards.isTelegraphing(h)) continue;
    if (h.spec && (h.spec.kind === "air")) { if (Hazards.isActive(h)) live++; continue; }
    live++;
    var d = Math.abs(h.x - pl.col);
    if (d < nearest) { nearest = d; nearestDesc = h.kind; }
  }
  return { s: s, pl: pl, live: live, nearest: nearest, desc: nearestDesc };
}

print("  t     phase         row  col  lives  live   nearest   score");
print("  ----- ------------- ---- ---- -----  -----  ---------  ------");
var rows = [];
var guard = 0;
while (el < Stages.STAGES_CLOCK_MS && guard < 400000) {
  g.tick(DT); el += DT; guard++;
  var snap = snapshot();
  var pl = snap.pl;

  if (pl.row >= 40) { g.hop("forward", 0); }
  // look before you leap: hop when the row ahead is not occupied here
  /* Play it the way a person plays, and -- importantly -- judge danger with
   * the game's OWN collision test rather than a guessed radius.
   *
   * The first version guessed "a hazard within 2.6 tiles blocks me". The real
   * hitbox is len/2 + 0.28, so a car is about 0.7 tiles of danger, not 2.6.
   * The bot spent 83 seconds refusing to hop through three tiles of clear
   * road because its own test was three times too timid. That is a bug in the
   * bot; calling it a bug in the game would have been the easy mistake.
   *
   * Hazards.hits() is exactly what kills the player, so ask it directly --
   * sampled across the traverse window, since the player is exposed for
   * roughly half a second while crossing. */
  if (el >= nextHop && pl.row < 39) {
    function safeToEnter(col, row) {
      if (row < 0 || row > 39) return false;
      // Sample the row over the traverse window rather than at one instant:
      // a car 1.5 tiles away when you commit is on top of you when you land.
      for (var k = 0; k <= 6; k++) {
        var tAhead = k * 0.09;
        var hz = g.state().hazards.slice();
        Hazards.tickHazards(hz, tAhead * 1000, 14, el + tAhead * 1000);
        if (Hazards.anyHits(hz, col, row)) return false;
      }
      return true;
    }
    var nextRow = pl.row + 1;
    if (safeToEnter(pl.col, nextRow)) {
      g.hop("forward", 0); nextHop = el + 240;
    } else if (pl.col > pl.minCol && safeToEnter(pl.col - 1, nextRow)) {
      g.hop("left", 0); nextHop = el + 80;
    } else if (pl.col < pl.maxCol && safeToEnter(pl.col + 1, nextRow)) {
      g.hop("right", 0); nextHop = el + 80;
    } else {
      nextHop = el + 100;
    }
  }

  if (el % 1000 < DT) {
    var m = Math.floor(el / 1000);
    var ph = g.state().phase;
    if (m % 3 === 0) {
      rows.push("  " + pad(m + "s", 5) + pad(ph, 14) + pad(pl.row, 4) +
                pad(pl.col, 5) + pad(pl.lives, 6) + pad(snap.live, 6) +
                pad(snap.nearest > 90 ? "   -" : snap.nearest.toFixed(1) + " " + snap.desc, 10) +
                pad(Math.round(g.state().stageScore), 7));
    }
    if (ph !== lastPhase) {
      if (ph === "DEAD") deaths++;
      print("     >>> phase -> " + ph);
      lastPhase = ph;
    }
  }
  if (g.state().phase === "STAGE_CLEAR") { seenClear = true; break; }
  if (g.state().phase === "STAGE_FAILED") { seenClear = false; break; }
}
rows.forEach(function (r) { print(r); });
print("");
print("  RESULT: " + (seenClear ? "STAGE CLEARED" : "stage failed") +
      "   deaths=" + deaths + "   final row=" + g.state().players[0].state().row +
      "   score=" + Math.round(g.state().stageScore));
print("  hazards still live on the board: " + g.state().hazards.length);
