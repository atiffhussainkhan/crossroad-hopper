#!/usr/bin/env python3
"""
tools/check_phases.py — Phase 2 gate for the shape of a stage over time.

The request was, in four parts:

  1. every stage carries a vocabulary of at least ten kill objects;
  2. the first fifteen to twenty seconds run one way only;
  3. after that the count climbs and the opposite direction joins;
  4. the last fifteen seconds everything is much faster.

Plus the standing promise that every stage has a warned ditch and a bird.

None of those are visible in a screenshot and none of them are a matter of
taste: they are numbers with thresholds, which is what this gate is for. It
runs the REAL modules through JXA, so it cannot drift from what the player
plays, and it reads `speedFactorAt` directly rather than inferring the curve
from a run.

Run:  python3 tools/check_phases.py
Exits non-zero on any failure.
"""

from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# The player's hop cadence, from src/main.js. A warning shorter than this
# cannot be acted on, so it is the floor for the ditch sign.
HOP_CADENCE_MS = 600.0

# The floor the design asks for. Measured well above it; asserted at it, so a
# later tuning pass that quietly shrinks a stage's vocabulary fails loudly.
MIN_KINDS_PER_STAGE = 10

PROBE = r"""
(function () {
  var H = Hazards, S = Stages, C = SimCore;
  var out = { problems: [], stats: {} };
  var goal = S.GOAL_ROW_OFFSET, safeGoal = H.SAFE_GOAL_ROWS;

  /* A whole stage's worth of hazards for one stage, as a single flat list that
   * can then be walked forward through the stage clock. */
  function buildStage(stageIndex, difficulty, tag) {
    var list = [];
    for (var r = H.SAFE_START_ROWS; r < goal - safeGoal; r++) {
      var Rng = C.createRng(tag + ":" + stageIndex + ":" + r);
      var made = H.hazardsForRow(tag + ":" + stageIndex + ":" + r, r, 14,
                                 difficulty, Rng, stageIndex, 0);
      for (var i = 0; i < made.length; i++) list.push(made[i]);
    }
    return list;
  }

  /* Walk a list to a point on the stage clock and report the board there. */
  function at(list, t) {
    var from = 0, step = 100;
    while (from < t) { H.tickHazards(list, step, 14, from); from += step; }
    var live = 0, dirs = {}, maxSpeed = 0, kinds = {};
    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      if (H.isStaged(h)) continue;
      live++;
      kinds[h.kind] = 1;
      // Pits and geysers do not travel, so they have no direction to count.
      if (h.spec.speed[1] === 0) continue;
      dirs[h.speed > 0 ? 1 : -1] = 1;
      var sp = Math.abs(h.speed);
      if (sp > maxSpeed) maxSpeed = sp;
    }
    return { live: live, dirs: dirs, maxSpeed: maxSpeed, kinds: kinds };
  }

  // ---- 1. the speed curve itself ----------------------------------------
  var f0 = H.speedFactorAt(0);
  var fRead = H.speedFactorAt(H.READ_MS - 1000);
  var fBuild = H.speedFactorAt(H.BUILD_END_MS);
  var fEnd = H.speedFactorAt(90000);
  out.stats.speed = { read: f0, endOfRead: fRead, endOfBuild: fBuild, end: fEnd };
  if (fRead !== 1.0) {
    out.problems.push("the board is not running at its base speed during the " +
                      "read (" + fRead + "x); the opening is supposed to be " +
                      "the calm one");
  }
  if (fEnd < 1.8) {
    out.problems.push("the sprint only reaches " + fEnd + "x; the last stretch " +
                      "is supposed to be a lot faster than the read");
  }
  if (fEnd / fBuild < 1.6) {
    out.problems.push("the sprint is only " + (fEnd / fBuild).toFixed(2) +
                      "x faster than the end of the build; it is supposed to " +
                      "be a jump, not a drift");
  }
  if (fBuild <= fRead) {
    out.problems.push("the build does not speed anything up over the read");
  }
  if (H.SPRINT_MS !== 15000) {
    out.problems.push("the sprint is " + H.SPRINT_MS + "ms; the design asked " +
                      "for the last 15 seconds");
  }
  if (H.READ_MS < 15000 || H.READ_MS > 20000) {
    out.problems.push("the read is " + H.READ_MS + "ms; the design asked for " +
                      "the first 15 to 20 seconds");
  }

  // ---- 2. per-stage: one-sided read, then the build, then the sprint -----
  var vocab = [], readOneSided = 0, buildTwoWay = 0, countClimbs = 0,
      speedClimbs = 0, stages = 0, pitsPerStage = [], birdsPerStage = [],
      worstKinds = 99, worstStage = 0;

  for (var st = 0; st < S.stageCount(); st++) {
    var name = S.getStage(st).name;
    var list = buildStage(st, S.getStage(st).baseline + 5, "ph");

    var read = at(list, H.READ_MS - 2000);
    var build = at(list, H.BUILD_END_MS);
    var sprint = at(list, 90000);

    // The read must be one direction, on every stage.
    var rd = Object.keys(read.dirs);
    if (rd.length === 1) readOneSided++; else {
      out.problems.push("stage " + (st + 1) + " (" + name + ") is NOT " +
                        "one-sided during the read: directions " + JSON.stringify(rd));
    }
    // The other side must actually arrive.
    if (Object.keys(build.dirs).length > 1) buildTwoWay++; else {
      out.problems.push("stage " + (st + 1) + " (" + name + ") never goes " +
                        "two-way, so the build adds nothing");
    }
    if (build.live > read.live) countClimbs++; else {
      out.problems.push("stage " + (st + 1) + " (" + name + ") has the same " +
                        "hazard count at the end of the build (" + build.live +
                        ") as during the read (" + read.live + ")");
    }
    if (sprint.maxSpeed > build.maxSpeed * 1.6) speedClimbs++; else {
      out.problems.push("stage " + (st + 1) + " (" + name + ") barely speeds " +
                        "up for the sprint (" + build.maxSpeed.toFixed(2) +
                        " -> " + sprint.maxSpeed.toFixed(2) + " tiles/s)");
    }

    /* Vocabulary, swept over several boards.
     *
     * Measured from ONE board this was meaningless and the gate said so: a
     * single 35-row crossing does not contain ten distinct objects, so every
     * stage "failed" at 7-9 while actually carrying a dozen. A vocabulary is
     * what a stage can produce across its boards, not what one board happened
     * to show, so this counts over several independent boards. */
    var pool = {};
    for (var sd = 0; sd < 8; sd++) {
      var bl = buildStage(st, S.getStage(st).baseline + 5, "v" + sd);
      for (var v = 0; v < bl.length; v++) pool[bl[v].kind] = 1;
    }
    var distinct = Object.keys(pool).length;
    if (distinct < worstKinds) { worstKinds = distinct; worstStage = st + 1; }
    vocab.push({ stage: st + 1, name: name,
                 declared: S.getStage(st).hazardKinds.length,
                 distinct: distinct });
    if (distinct < __MIN_KINDS__) {
      out.problems.push("stage " + (st + 1) + " (" + name + ") only spawns " +
                        distinct + " distinct kill objects; the floor is " +
                        __MIN_KINDS__);
    }

    // A ditch in EVERY stage, and a warning long enough to act on.
    var pits = 0, badWarn = 0, minWarn = Infinity;
    for (var p = 0; p < list.length; p++) {
      if (list[p].kind !== "sinkhole") continue;
      pits++;
      var w = (list[p].cycle && list[p].cycle.warn) || 0;
      if (w < minWarn) minWarn = w;
      if (w < __HOP__) badWarn++;
    }
    pitsPerStage.push(pits);
    if (pits === 0) {
      out.problems.push("stage " + (st + 1) + " (" + name + ") has no ditch");
    } else if (badWarn > 0) {
      out.problems.push("stage " + (st + 1) + " (" + name + ") has " + badWarn +
                        " ditches whose warning is shorter than the " +
                        __HOP__ + "ms hop cadence");
    }

    // A bird in EVERY stage.
    var birds = 0;
    for (var b = 0; b < list.length; b++) {
      if (list[b].kind === "hawk") birds++;
    }
    birdsPerStage.push(birds);
    if (birds === 0) {
      out.problems.push("stage " + (st + 1) + " (" + name + ") has no bird");
    }
    stages++;
  }

  out.stats.stages = stages;
  out.stats.readOneSided = readOneSided;
  out.stats.buildTwoWay = buildTwoWay;
  out.stats.countClimbs = countClimbs;
  out.stats.speedClimbs = speedClimbs;
  out.stats.vocab = vocab;
  out.stats.worstKinds = worstKinds;
  out.stats.worstStage = worstStage;
  out.stats.pitsPerStage = pitsPerStage;
  out.stats.birdsPerStage = birdsPerStage;

  return JSON.stringify(out);
})()
"""


def main() -> int:
    loader = """
ObjC.import('Foundation');
var _gd = null;
try {
  var _env = $.NSProcessInfo.processInfo.environment;
  var _v = _env.objectForKey("GAME_DIR");
  if (_v !== null && _v !== undefined && _v !== "[id nil]") _gd = ObjC.unwrap(_v);
} catch (e) { _gd = null; }
if (!_gd) _gd = ObjC.unwrap($.NSFileManager.defaultManager.currentDirectoryPath);
["src/stages.js", "src/tiles.js", "src/hazards.js", "src/sim-core.js"].forEach(function (rel) {
  var t = $.NSString.stringWithContentsOfFileEncodingError(
    _gd + "/" + rel, $.NSUTF8StringEncoding, null);
  if (t === null) throw new Error("missing " + _gd + "/" + rel);
  eval(ObjC.unwrap(t));
});
"""
    body = PROBE.strip().replace(
        "  return JSON.stringify(out);\n})()",
        '  console.log("@@P@@" + JSON.stringify(out));\n})()')
    # The probe runs inside JXA, which cannot see this module's constants, so
    # the floor is substituted in rather than referenced.
    body = body.replace("__MIN_KINDS__", str(MIN_KINDS_PER_STAGE))
    body = body.replace("__HOP__", str(HOP_CADENCE_MS))
    with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False, dir="/tmp") as f:
        f.write(loader + body)
        path = f.name
    try:
        proc = subprocess.run(["osascript", "-l", "JavaScript", path],
                              capture_output=True, text=True, cwd=str(ROOT))
    finally:
        Path(path).unlink(missing_ok=True)

    raw = proc.stdout + proc.stderr
    if proc.returncode != 0 or "@@P@@" not in raw:
        print(f"  FAIL — probe failed: {proc.stderr.strip()[:400]!r}")
        return 1
    data = json.loads(raw.rsplit("@@P@@", 1)[1].strip().splitlines()[0])
    st = data["stats"]

    sp = st["speed"]
    print("  speed curve   : "
          f"{sp['read']:.2f}x during the read, {sp['endOfBuild']:.2f}x at the "
          f"end of the build, {sp['end']:.2f}x in the sprint")
    print(f"  one-sided open: {st['readOneSided']}/{st['stages']} stages run a "
          f"single direction through the read")
    print(f"  two-way build : {st['buildTwoWay']}/{st['stages']} stages gain the "
          f"opposite direction")
    print(f"  count climbs  : {st['countClimbs']}/{st['stages']} stages get "
          f"busier after the read")
    print(f"  sprint        : {st['speedClimbs']}/{st['stages']} stages speed up "
          f"hard for the last stretch")
    print(f"  vocabulary    : worst stage is {st['worstStage']} with "
          f"{st['worstKinds']} distinct kill objects (floor "
          f"{MIN_KINDS_PER_STAGE})")
    print("  per stage     : " + ", ".join(
        f"{v['stage']}:{v['distinct']}" for v in st["vocab"]))
    print(f"  ditches       : {st['pitsPerStage']} per stage")
    print(f"  birds         : {st['birdsPerStage']} per stage")

    if data["problems"]:
        print("\n  FAIL")
        for p in data["problems"][:12]:
            print(f"    - {p}")
        if len(data["problems"]) > 12:
            print(f"    ... and {len(data['problems']) - 12} more")
        return 1
    print("\n  PASS — every stage opens one-sided, gains the other side, "
          "sprints at the end,\n          and carries a ten-object vocabulary, "
          "a warned ditch and a bird")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
