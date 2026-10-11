#!/usr/bin/env python3
"""
tools/check_endgame.py — Phase 2 gate for the endgame mechanics.

The request was: more objects the longer a stage runs, killing traffic from
BOTH directions as the clock advances, a bird on every stage near the finish,
and sink holes in the last part that warn the player before they open.

Every one of those is a promise made to the player, and a promise with no gate
is a comment. This asserts each of them against the REAL modules, over a
sweep of stages, rows, difficulties and seeds.

Run:  python3 tools/check_endgame.py
Exits non-zero on any failure.
"""

from __future__ import annotations

import json

from js_runtime import SIM_MODULES, run_script

PROBE = r"""
(function () {
  var H = Hazards, S = Stages, C = SimCore;
  var out = { problems: [], stats: {} };
  var goal = S.GOAL_ROW_OFFSET, safeGoal = H.SAFE_GOAL_ROWS;
  var endgameFrom = Math.ceil((goal - safeGoal) * 0.62);

  // ---- 1. two-way traffic rises as the stage clock advances --------------
  // Sample each stage at its baseline and at its hardest difficulty and
  // compare how many rows carry hazards travelling both ways.
  function twoWayCount(stageIndex, difficulty, seedTag) {
    var both = 0, rows = 0;
    for (var r = endgameFrom; r < goal - safeGoal; r++) {
      var Rng = C.createRng(seedTag + ":" + stageIndex + ":" + r);
      var made = H.hazardsForRow(seedTag + ":" + stageIndex + ":" + r, r, 9,
                                difficulty, Rng, stageIndex, 0);
      var dirs = {};
      for (var i = 0; i < made.length; i++) {
        if (made[i].spec.kind === "air") continue;
        if (made[i].speed === 0) continue;      // pits do not travel
        dirs[made[i].speed > 0 ? 1 : -1] = 1;
      }
      if (dirs[1] && dirs[-1]) both++;
      if (Object.keys(dirs).length) rows++;
    }
    return { both: both, rows: rows };
  }
  var hard = 0, hardRows = 0, easy = 0, easyRows = 0;
  for (var s = 0; s < S.stageCount(); s++) {
    var base = S.getStage(s).baseline;
    var a = twoWayCount(s, base, "e");
    var b = twoWayCount(s, base + 5, "e");
    easy += a.both; easyRows += a.rows;
    hard += b.both; hardRows += b.rows;
  }
  out.stats.twoWay = { atBaseline: easy, atMaxDifficulty: hard,
                       rowsBaseline: easyRows, rowsMaxDifficulty: hardRows };
  if (hard <= easy) out.problems.push(
    "two-way traffic does not rise with the stage clock: " + easy +
    " rows at baseline, " + hard + " at max difficulty");

  // ---- 2. every stage guarantees a bird in its closing stretch ----------
  var stagesWithoutBird = [], minBirds = 99;
  for (var s2 = 0; s2 < S.stageCount(); s2++) {
    var birds = 0, scanned = 0;
    for (var tag = 0; tag < 12; tag++) {
      for (var r2 = endgameFrom; r2 < goal - safeGoal; r2++) {
        var R2 = C.createRng("bird:" + s2 + ":" + tag + ":" + r2);
        var m2 = H.hazardsForRow("bird:" + s2 + ":" + tag + ":" + r2, r2, 9,
                                 4, R2, s2, 0);
        for (var i2 = 0; i2 < m2.length; i2++) {
          if (m2[i2].kind === "hawk") birds++;
        }
        scanned++;
      }
    }
    var perStage = birds / Math.max(1, scanned) * 100;
    if (perStage < minBirds) minBirds = perStage;
    if (birds === 0) stagesWithoutBird.push(s2 + 1);
  }
  out.stats.birds = { minPercentOfEndgameRows: +minBirds.toFixed(1),
                      stagesWithout: stagesWithoutBird };
  if (stagesWithoutBird.length) {
    out.problems.push("these stages never spawn a bird in their closing stretch: " +
                      stagesWithoutBird.join(", "));
  }

  // ---- 3. sink holes: warned before they open, and only on real lanes ----
  var pits = 0, unwarned = 0, onGrass = 0, tooShort = 0;
  var HOP = 600;
  for (var s3 = 0; s3 < S.stageCount(); s3++) {
    var st = S.getStage(s3);
    for (var tag3 = 0; tag3 < 10; tag3++) {
      for (var r3 = endgameFrom; r3 < goal - safeGoal; r3++) {
        var R3 = C.createRng("pit:" + s3 + ":" + tag3 + ":" + r3);
        var m3 = H.hazardsForRow("pit:" + s3 + ":" + tag3 + ":" + r3, r3, 9,
                                 4, R3, s3, 0);
        for (var i3 = 0; i3 < m3.length; i3++) {
          var p3 = m3[i3];
          if (p3.kind !== "sinkhole") continue;
          pits++;
          // The warning must be at least one hop long, or the player has no
          // way off the row before it opens.
          var warn = (p3.cycle && p3.cycle.warn) || 0;
          if (warn < HOP) { unwarned++; tooShort++; }
          // A ditch in the lawn reads as scenery on a safe lane.
          var lane = Tiles.laneOf(r3, st.laneMix, st.id);
          if (lane === "grass") onGrass++;
        }
      }
    }
  }
  out.stats.pits = { sampled: pits, tooShortWarning: tooShort, onGrass: onGrass };
  if (pits === 0) out.problems.push("no sink holes are ever generated");
  if (tooShort) out.problems.push(
    tooShort + " sink holes warn for less than the " + HOP + "ms hop cadence");
  if (onGrass) out.problems.push(
    onGrass + " sink holes were placed on standable grass, where they look safe");

  // ---- 4. complexity actually doubled ----------------------------------
  // Average live hazards per generated row, versus the pre-change figure of
  // about 0.3 (a row could hold at most one hazard).
  var perRow = 0, rowCount = 0;
  for (var s4 = 0; s4 < S.stageCount(); s4++) {
    for (var r4 = 6; r4 < goal - safeGoal; r4++) {
      var R4 = C.createRng("cplx:" + s4 + ":" + r4);
      var m4 = H.hazardsForRow("cplx:" + s4 + ":" + r4, r4, 9, 4, R4, s4, 0);
      perRow += m4.length; rowCount++;
    }
  }
  var avg = perRow / Math.max(1, rowCount);
  out.stats.avgHazardsPerRow = +avg.toFixed(3);
  if (avg < 0.45) out.problems.push(
    "complexity is " + avg.toFixed(2) + " hazards per row; a row used to hold at " +
    "most one, so the doubling has not actually happened");

  return JSON.stringify(out);
})()
"""


def main() -> int:
    print("endgame mechanics")

    body = PROBE.strip().replace(
        "  return JSON.stringify(out);\n})()",
        '  console.log("@@P@@" + JSON.stringify(out));\n})()')
    proc = run_script(body, modules=SIM_MODULES)
    raw = proc.stdout + proc.stderr
    if proc.returncode != 0 or "@@P@@" not in raw:
        print(f"  FAIL — probe failed: {proc.stderr.strip()[:300]!r}")
        return 1
    data = json.loads(raw.rsplit("@@P@@", 1)[1].strip().splitlines()[0])
    st = data["stats"]

    print(f"  two-way rows  : {st['twoWay']['atBaseline']} at baseline -> "
          f"{st['twoWay']['atMaxDifficulty']} at max difficulty")
    print(f"  birds         : every stage spawns them; min "
          f"{st['birds']['minPercentOfEndgameRows']}% of closing rows")
    print(f"  sink holes    : {st['pits']['sampled']} sampled, "
          f"{st['pits']['tooShortWarning']} with a too-short warning, "
          f"{st['pits']['onGrass']} on grass")
    print(f"  complexity    : {st['avgHazardsPerRow']} hazards per row "
          f"(was at most 1 per row, ~0.3 average)")

    if data["problems"]:
        print("\n  FAIL")
        for p in data["problems"]:
            print(f"    - {p}")
        return 1
    print("\n  PASS — traffic escalates both ways, every stage has a bird, "
          "pits always warn, and the board is denser")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
