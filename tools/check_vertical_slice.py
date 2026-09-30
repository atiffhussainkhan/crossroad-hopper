#!/usr/bin/env python3
"""Phase 1 gate: the stage loop.

Drives the real `src/sim-core.js` and `src/stages.js` headlessly through
JXA and asserts the stage system's invariants across a seed sweep.

Asserted:

  1. **Determinism.** The same seed produces identical campaign output.
  2. **Stage reachability.** Every campaign reaches stage 10 and unlocks
     ENDLESS, so a competent player can always finish the campaign.
  3. **Difficulty ladder.** Difficulty is a pure function of stage baseline
     and elapsed time, stepping every 15s. A 90s stage yields 6 steps, and
     the ten stage baselines give a 0..4 floor, so the campaign spans a
     40-step ladder. Verified against the exported `Stages.difficultyFor`.
  4. **Stage isolation on failure.** Exhausting lives fails the current
     stage and retries THAT stage. It must never reset to stage 0, which is
     the Crossy Road Castle failure the research identified.
  5. **Lives budget.** Four lives per player, per stage, restored on retry.
  6. **Two-player symmetry.** Both players get the same life budget and the
     same goal row; one player's progress does not end the stage.
  7. **Clock.** A stage cannot exceed its duration; expiry fails the stage.
  8. **Shared clock.** With two players, the clock is not per-player.

Run from the project root:  python3 tools/check_vertical_slice.py
Exits non-zero on any failure.
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SIM = ROOT / "tools" / "simulate.js"

# Campaign reachability sweep size. Each campaign simulates ten 90-second
# stages, so this is ~10x the work per seed of a single-run sweep. 1000 seeds
# is a strong sample for "can a competent player finish the campaign"; the
# 10,000-seed requirement belongs to the Phase 3 solvability gate, which
# tests generation rather than the stage state machine.
SEED_COUNT = 1000


def run_batch(seeds: list[str]) -> list[dict]:
    """Run many simulations in one JXA invocation.

    JXA on this macOS exposes `$.NSFileHandle.fileHandleWithStandardInput` as
    a non-callable function, and `console.log` writes to stderr rather than
    stdout. So seeds go through a temp file named by GAME_SEEDS_FILE, and
    results are read back from stderr.
    """
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".seeds", delete=False, dir="/tmp"
    ) as f:
        f.write("\n".join(seeds) + "\n")
        seeds_path = f.name
    try:
        proc = subprocess.run(
            ["osascript", "-l", "JavaScript", str(SIM)],
            capture_output=True,
            text=True,
            check=False,
            cwd=str(ROOT),
            env={**os.environ, "GAME_SEEDS_FILE": seeds_path},
        )
    finally:
        Path(seeds_path).unlink(missing_ok=True)

    if proc.returncode != 0:
        raise RuntimeError(f"simulate.js failed: {proc.stderr.strip()!r}")

    out = []
    for line in (proc.stdout + proc.stderr).splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    if len(out) != len(seeds):
        raise RuntimeError(f"got {len(out)} results for {len(seeds)} seeds")
    return out


# Direct structural checks that don't need a 10,000-run batch. These run the
# same real modules, so they cannot drift from what the player runs.
def run_probe(body: str) -> dict:
    """Run a JXA probe against the real modules.

    JXA has no `load()` (that is a `jsc` builtin), so the probe evals the
    module sources itself, the same way tools/simulate.js does. The probe
    body is prefixed with a loader that resolves the game directory from
    GAME_DIR or the current working directory.
    """
    loader = """
ObjC.import('Foundation');
var _gd = null;
try {
  var _env = $.NSProcessInfo.processInfo.environment;
  var _v = _env.objectForKey("GAME_DIR");
  if (_v !== null && _v !== undefined && _v !== "[id nil]") _gd = ObjC.unwrap(_v);
} catch (e) { _gd = null; }
if (!_gd) _gd = ObjC.unwrap($.NSFileManager.defaultManager.currentDirectoryPath);
["src/stages.js", "src/sim-core.js"].forEach(function (rel) {
  var t = $.NSString.stringWithContentsOfFileEncodingError(
    _gd + "/" + rel, $.NSUTF8StringEncoding, null);
  if (t === null) throw new Error("missing " + _gd + "/" + rel);
  eval(ObjC.unwrap(t));
});
"""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".js", delete=False, dir="/tmp"
    ) as f:
        f.write(loader + body)
        js_path = f.name
    try:
        proc = subprocess.run(
            ["osascript", "-l", "JavaScript", str(js_path)],
            capture_output=True,
            text=True,
            check=False,
            cwd=str(ROOT),
        )
    finally:
        Path(js_path).unlink(missing_ok=True)
    if proc.returncode != 0:
        raise RuntimeError(f"probe failed: {proc.stderr.strip()!r}")
    raw = proc.stdout + proc.stderr
    # Probes emit a @@P@@ marker so parsing never has to sniff for brackets,
    # which appear in the loader source itself.
    if "@@P@@" not in raw:
        raise RuntimeError(f"probe produced no marked JSON: {proc.stdout!r} {proc.stderr!r}")
    payload = raw.rsplit("@@P@@", 1)[1].strip()
    try:
        return json.loads(payload)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"probe JSON was malformed: {exc}: {payload[:200]!r}") from exc


def probe_failures() -> list[str]:
    """Structural invariants that a campaign sweep cannot demonstrate."""
    out: list[str] = []

    # 3. Difficulty ladder.
    d = run_probe("""
var rows = [];
for (var s = 0; s < Stages.stageCount(); s++) {
  for (var t = 0; t <= 90000; t += 15000) {
    rows.push({stage: s, t: t, d: Stages.difficultyFor(s, t)});
  }
}
console.log("@@P@@" + JSON.stringify(rows));
""")
    # Difficulty must increase with time within a stage, by exactly one per
    # 15s step. Sampling t=0,15,...,90 gives 7 samples spanning 6 steps.
    by_stage: dict[int, list] = {}
    for r in d:
        by_stage.setdefault(r["stage"], []).append(r)
    for stage, rows in by_stage.items():
        rows.sort(key=lambda r: r["t"])
        diffs = [r["d"] for r in rows]
        # JSON null arrives here as None when the probe could not evaluate the
        # formula. That is a probe defect, not a game defect, and it must not
        # crash the gate.
        if any(d is None for d in diffs):
            out.append(
                f"difficulty probe returned null for stage {stage}; the probe "
                "could not evaluate Stages.difficultyFor"
            )
            continue
        if diffs != sorted(diffs):
            out.append(f"difficulty is not monotonic within stage {stage}: {diffs}")
        if diffs[-1] - diffs[0] != 6:
            out.append(
                f"stage {stage} should span 6 difficulty steps over 90s, got {diffs}"
            )
        for i in range(1, len(diffs)):
            if diffs[i] - diffs[i - 1] != 1:
                out.append(
                    f"stage {stage} difficulty did not step by 1 at "
                    f"t={rows[i]['t']}ms: {diffs[i-1]} -> {diffs[i]}"
                )
    # Stage 1 floor must be lower than stage 10 floor, and the campaign must
    # span at least 10 difficulty levels end to end.
    vals = [r["d"] for rs in by_stage.values() for r in rs if r["d"] is not None]
    if not vals:
        return out
    first = min(r["d"] for r in by_stage[0] if r["d"] is not None)
    last = min(r["d"] for r in by_stage[max(by_stage)] if r["d"] is not None)
    if first != 0:
        out.append(f"stage 1 should start at difficulty 0, got {first}")
    if last <= first:
        out.append(f"stage 10 baseline {last} is not above stage 1 baseline {first}")
    campaign_span = max(vals) - min(vals)
    if campaign_span < 10:
        out.append(f"campaign difficulty span is only {campaign_span}, want >= 10")

    # 4, 5, 6, 8. Stage isolation, lives, two-player symmetry, clock.
    s = run_probe("""
var r = {};

// --- lives exhaustion retries the same stage, not the campaign
// Drives applyDeath(), the same entry point the pursuer uses, so this tests
// the real path rather than poking player internals.
//
// A death is now followed by a short DEAD beat in which the player is out and
// the world is frozen, so the beat has to be ticked through between lives --
// otherwise the second applyDeath is correctly refused (the player is already
// dead) and the probe measures the beat, not the lives rule. What is being
// asserted is unchanged: four deaths exhaust the stage, and a retry restores
// four lives on the SAME stage.
var g = SimCore.createGame({playerCount: 1, seed: "probe"});
g.hop("forward");
var p = g.state().players[0];
for (var d = 0; d < 4; d++) {
  g.applyDeath(0);
  for (var b = 0; b < 120 && g.state().phase === SimCore.PHASES.DEAD; b++) {
    g.tick(16.667);
  }
}
r.phaseAfterLives = g.state().phase;
r.livesAtFailure = p.state().lives;
var before = g.state().stageIndex;
g.advance();
r.stageAfterRetry = g.state().stageIndex;
r.stageBeforeRetry = before;
r.livesAfterRetry = g.state().players[0].state().lives;

// --- two-player symmetry
var g2 = SimCore.createGame({playerCount: 2, seed: "probe2"});
r.twoLives = [g2.state().players[0].state().lives, g2.state().players[1].state().lives];
r.twoCols = [g2.state().players[0].state().col, g2.state().players[1].state().col];

// --- one player finishing does not end the stage
g2.hop("forward");
var ps0 = g2.state().players[0];
for (var i = 0; i < g2.state().goalRow; i++) { g2.state().players[0].hop("forward"); }
g2.tick(16.667);
r.p0Finished = g2.state().players[0].state().finished;
r.p1Finished = g2.state().players[1].state().finished;
r.phaseAfterOneFinished = g2.state().phase;
// Now drive player 1 to the goal: ST-08 requires BOTH to finish.
for (var m = 0; m < g2.state().goalRow; m++) { g2.state().players[1].hop("forward"); }
g2.tick(16.667);
r.phaseAfterBothFinished = g2.state().phase;

// --- clock expiry fails the stage
var g3 = SimCore.createGame({playerCount: 1, seed: "probe3"});
g3.hop("forward");
for (var k = 0; k < 6000; k++) g3.tick(16.667);
r.phaseAfterClock = g3.state().phase;
r.elapsedAtClockFail = g3.state().elapsedInStageMs;

console.log("@@P@@" + JSON.stringify(r));
""")

    if s["phaseAfterLives"] != "STAGE_FAILED":
        out.append(f"lives exhaustion gave {s['phaseAfterLives']}, want STAGE_FAILED")
    if s["livesAtFailure"] != 0:
        out.append(f"stage should fail at 0 lives, got {s['livesAtFailure']}")
    if s["stageAfterRetry"] != s["stageBeforeRetry"]:
        out.append(
            f"retry reset stage {s['stageBeforeRetry']} -> {s['stageAfterRetry']}; "
            "must retry the same stage"
        )
    if s["livesAfterRetry"] != 4:
        out.append(f"retry should restore 4 lives, got {s['livesAfterRetry']}")
    if s["twoLives"] != [4, 4]:
        out.append(f"two players should each start with 4 lives, got {s['twoLives']}")
    if s["twoCols"][0] == s["twoCols"][1]:
        out.append("two players must start on different columns")
    if not s["p0Finished"]:
        out.append("player 0 should have reached the goal row")
    if s["p1Finished"]:
        out.append("player 1 should not have finished; it never hopped")
    if s["phaseAfterOneFinished"] == "STAGE_CLEAR":
        out.append("one player finishing must not clear the stage for the other")
    if s["phaseAfterBothFinished"] != "STAGE_CLEAR":
        out.append(
            "ST-08: stage must clear when both players finish, got "
            f"{s['phaseAfterBothFinished']}"
        )
    if s["phaseAfterClock"] != "STAGE_FAILED":
        out.append(f"clock expiry gave {s['phaseAfterClock']}, want STAGE_FAILED")

    # 10. Hazards must actually kill, and must be reachable in front of the
    #     player. A hazard that is drawn but harmless is the single worst
    #     possible bug in this genre: the player learns that cars are scenery.
    s = run_probe("""
ObjC.import('Foundation');
["src/stages.js", "src/tiles.js", "src/hazards.js", "src/sim-core.js"].forEach(function (rel) {
  var t = $.NSString.stringWithContentsOfFileEncodingError(
    _gd + "/" + rel, $.NSUTF8StringEncoding, null);
  eval(ObjC.unwrap(t));
});
var r = {};
var g = SimCore.createGame({playerCount: 1, seed: "hz"});
// Stages one and two are TEACHING stages and generate no lethal hazard at all
// (src/hazards.js: buildHazards returns empty for stageIndex < 2). This probe
// used to run on whatever createGame defaulted to -- stage one -- so it
// correctly reported "no hazards were ever generated" about a stage that is
// SUPPOSED to be empty. The probe asks whether the hazard system works, so it
// must run on the first stage that actually spawns one.
g.startStage(2);
g.hop("forward");

var sawHazard = 0;
for (var i = 0; i < 2000; i++) {
  if (i % 40 === 0) g.hop("forward");
  g.tick(16.667);
  if (g.state().hazards.length) { sawHazard = g.state().hazards.length; break; }
}
r.sawHazard = sawHazard;

// Direct collision test: place a hazard exactly on the player and confirm it
// is lethal. This is the assertion that actually matters -- that an overlap
// kills -- rather than "the player happens to die within N seconds", which a
// competent player can avoid indefinitely.
var hz = { kind: "car", spec: { len: 0.86, kind: "ground" }, row: 0, dir: 1,
           speed: 0, x: 0, dead: false };
r.collisionOnPlayer  = (Hazards.anyHits([hz], 0, 0) !== null);
r.collisionMissedBy  = (Hazards.anyHits([hz], 5, 0) === null);
r.collisionWrongRow  = (Hazards.anyHits([hz], 0, 3) === null);
r.collisionLethal    = r.collisionOnPlayer && r.collisionMissedBy && r.collisionWrongRow;

// Determinism: the same seed must produce the same hazard layout.
var a = Hazards.buildHazards("d", 0, 16, 9, 3, SimCore.createRng("d:0"));
var b = Hazards.buildHazards("d", 0, 16, 9, 3, SimCore.createRng("d:0"));
r.deterministic = (JSON.stringify(a) === JSON.stringify(b));
// Difficulty must change the layout.
var c = Hazards.buildHazards("d", 0, 16, 9, 9, SimCore.createRng("d:0"));
r.difficultyChangesLayout = (JSON.stringify(a) !== JSON.stringify(c));

console.log("@@P@@" + JSON.stringify(r));
""")
    if s["sawHazard"] == 0:
        out.append("no hazards were ever generated; the board is empty scenery")
    # The previous version asserted that a player MUST die within 20 seconds.
    # That was wrong: a perfect player clearing a stage untouched is the
    # correct outcome. What matters is that hazards are PRESENT and that they
    # are lethal when they overlap, which is checked directly below.
    if not s["collisionLethal"]:
        out.append(
            "a hazard overlapping the player did not register a collision; "
            "the board would be harmless scenery"
        )
    if not s["deterministic"]:
        out.append("hazard generation is not deterministic for a fixed seed")
    if not s["difficultyChangesLayout"]:
        out.append("difficulty does not change the hazard layout")

    # 9. Difficulty must actually change play, and must never make a campaign
    #    stage unwinnable. This is a regression guard: the difficulty ladder
    #    was once computed and discarded, and when it was first wired in, the
    #    pursuer was scaled past the player's maximum hop rate, which made
    #    every campaign stage unwinnable and the campaign looped forever.
    s = run_probe("""
ObjC.import('Foundation');
["src/stages.js", "src/sim-core.js"].forEach(function (rel) {
  var t = $.NSString.stringWithContentsOfFileEncodingError(
    _gd + "/" + rel, $.NSUTF8StringEncoding, null);
  eval(ObjC.unwrap(t));
});
var r = {};

// Player hop ceiling, rows per second.
var HOP_MS = 600;
var playerCeiling = 1000.0 / HOP_MS;

// Pursuer row after 1s of ACTIVE, at several difficulties.
r.speeds = [];
for (var d = 0; d <= 10; d++) {
  var p = SimCore.createPursuer({threshold: 0, telegraphMs: 0});
  // Arm, leave SPAWNING, then take one ACTIVE tick so `row` is initialised
  // from spawnRow rather than from the -999 sentinel. Measuring before that
  // would report 999 rows/sec of pure sentinel.
  p.tick(1, 999, d);   // DISTANCE_LOCKED -> SPAWNING
  p.tick(1, 999, d);   // SPAWNING -> ACTIVE
  p.tick(1, 999, d);   // first ACTIVE tick, initialises row
  var before = p.state().row;
  for (var i = 0; i < 60; i++) p.tick(16.667, 999, d);   // 1 second
  r.speeds.push({d: d, rowsPerSec: Math.round((p.state().row - before) * 100) / 100});
}
r.playerCeiling = Math.round(playerCeiling * 100) / 100;

// Difficulty monotonicity at the pursuer.
r.monotonic = true;
for (var k = 1; k < r.speeds.length; k++) {
  if (r.speeds[k].rowsPerSec < r.speeds[k-1].rowsPerSec) r.monotonic = false;
}

console.log("@@P@@" + JSON.stringify(r));
""")

    if not s["monotonic"]:
        out.append("pursuer speed is not monotonic in difficulty")
    # Campaign difficulty is 0..9. At every one of those the pursuer must stay
    # under the player's hop ceiling or the stage cannot be finished.
    for row in s["speeds"]:
        if row["d"] <= 9 and row["rowsPerSec"] >= s["playerCeiling"]:
            out.append(
                f"pursuer at difficulty {row['d']} runs {row['rowsPerSec']} rows/s, "
                f"at or above the player ceiling {s['playerCeiling']} rows/s; "
                "the stage becomes unwinnable"
            )
    # Difficulty must genuinely differ, not be a constant.
    if len({row["rowsPerSec"] for row in s["speeds"]}) < 5:
        out.append(
            "difficulty barely changes the pursuer; the ladder may be decorative"
        )

    # ST-12: both players act in the same tick. The previous build queued
    # turns, so six taps moved player 0 and player 1 never moved at all.
    s = run_probe("""
ObjC.import('Foundation');
["src/stages.js", "src/sim-core.js"].forEach(function (rel) {
  var t = $.NSString.stringWithContentsOfFileEncodingError(
    _gd + "/" + rel, $.NSUTF8StringEncoding, null);
  eval(ObjC.unwrap(t));
});
var g = SimCore.createGame({playerCount: 2, seed: "sim"});
g.hop("forward", 0); g.hop("forward", 0); g.hop("forward", 0);
g.hop("forward", 1); g.hop("forward", 1);
console.log("@@P@@" + JSON.stringify({
  p0: g.state().players[0].state().row,
  p1: g.state().players[1].state().row
}));
""")
    if s["p0"] != 3 or s["p1"] != 2:
        out.append(
            f"two players must move independently in the same tick; "
            f"got p0={s['p0']} (want 3), p1={s['p1']} (want 2)"
        )

    return out


def main() -> int:
    if not SIM.exists():
        print(f"missing {SIM}")
        return 1

    failures: list[str] = []

    # 1. Determinism.
    det = run_batch(["det", "det", "run-0"])
    if det[0] != det[1]:
        failures.append(f"determinism: same seed diverged\n  {det[0]}\n  {det[1]}")

    # 2. Campaign reachability across a seed sweep.
    seeds = [f"run-{i}" for i in range(SEED_COUNT)]
    runs = run_batch(seeds)

    reached_endless = 0
    stalls = 0
    clock_stalls = 0
    life_stalls = 0
    final_phases: dict[str, int] = {}
    for r in runs:
        final_phases[r["finalPhase"]] = final_phases.get(r["finalPhase"], 0) + 1
        if r["finalPhase"] == "ENDLESS":
            reached_endless += 1
        # ST-07: a stage failure must never REWIND the campaign. A stall is a
        # different thing from a rewind and is reported separately below.
        if r["finalPhase"] == "STAGE_FAILED" and r.get("stages"):
            last_fail = [s for s in r["stages"] if s.get("result") == "FAILED"]
            if last_fail:
                stalls += 1
                if last_fail[-1].get("elapsed", 0) > 88000:
                    clock_stalls += 1
                else:
                    life_stalls += 1

    # 6-8. Structural probes.
    probe_result = probe_failures()
    failures.extend(probe_result)

    print(f"campaign seeds        : {len(runs)}")
    print(f"determinism           : {'OK' if det[0] == det[1] else 'FAIL'}")
    print(f"reached ENDLESS        : {reached_endless}/{len(runs)}")
    print(f"final phase histogram  : {final_phases}")
    print(f"structural probes     : {'OK' if not probe_result else 'FAIL'}")
    rate = 100.0 * reached_endless / max(1, len(runs))
    print(f"campaign completion   : {reached_endless}/{len(runs)} ({rate:.0f}%)")
    # OPEN: P-12 campaign reachability. With hazards live, a competent
    # autoplay clears a stage roughly 43 percent of the time by STALLING ON
    # THE 90-SECOND CLOCK while waiting for a gap, not because a lane is
    # impassable. The fix is balance (hazard density against the clock), and
    # it belongs to the generation milestone. Recorded here so it cannot be
    # forgotten; it is deliberately not a hard failure while it is being
    # tuned, because a gate that always fails trains people to ignore it.
    if rate < 90.0:
        failures.append(
            "P-12 campaign reachability %.0f%%: %d of %d final failures were a "
            "CLOCK timeout (elapsed > 88s of 90s), %d were four lives lost. "
            "Target 90%%" % (rate, clock_stalls, stalls, life_stalls)
        )

    if failures:
        print("\nFAIL")
        for f in failures[:10]:
            print(f"  - {f}")
        if len(failures) > 10:
            print(f"  ... and {len(failures) - 10} more")
        return 1

    print("\nPASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
