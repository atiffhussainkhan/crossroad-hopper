#!/usr/bin/env python3
"""tools/hazard_probe.py -- measure what the player can actually SEE, and when.

The complaint is "the killing things are not coming at the start of the stage".
That is a claim about the first twenty seconds of a board, so it is answered by
sampling the first twenty seconds of a board -- not by reading the constants and
reasoning about them.

For each sample this records, for the rows currently on screen and inside the
player's own column band:

    armed      hazards whose armMs has passed (actually lethal)
    staged     hazards built but switched off (invisible AND harmless)
    moving     armed hazards whose x is actually changing
    speed      the mean armed speed in tiles/sec, as the player sees it
    speedFactor Hazards.speedFactorAt() at that instant

Anything with armed==0 for the opening seconds is the bug, whatever the code
intends. Reused from tools/playtest.py's host stubs.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"

sys.path.insert(0, str(ROOT / "tools"))
from playtest import MODULES, sprite_dims  # noqa: E402

PROBE_JS = r"""
/* ---- probe main ---- */
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
var rnd = mulberry(4242);
var DT = 1000 / 60;

print("stage   t(s)  onScreenRows  armed  staged  moving  meanSpeed  speedFactor  closestRow");
print("------------------------------------------------------------------------------");

var STAGE_SECONDS = 20;
for (var st = 0; st < 10; st++) {
  var g = SimCore.createGame({ playerCount: 1, seed: "probe-" + st });
  var s0 = g.state();
  var goal = s0.goalRow;
  var samples = [0.0, 0.5, 1.0, 2.0, 3.0, 5.0, 7.0, 10.0, 14.9, 15.1, 16.0, 18.0, 20.0];
  var si = 0;
  var elapsed = 0;
  while (elapsed < STAGE_SECONDS * 1000) {
    g.tick(DT);
    elapsed += DT;
    if (si < samples.length && elapsed >= samples[si] * 1000) {
      var s = g.state();
      var pl = s.players[0].state();
      var prow = Math.floor(pl.row);
      // What the camera shows: rows topRow .. topRow+viewRows
      var topRow = Math.max(0, Math.floor(pl.row) - 3);
      var viewRows = Math.max(9, Math.round(600 / 34));
      var lo = topRow, hi = topRow + viewRows;
      // Inside the player's column band only -- a car the player cannot enter
      // is not a threat the player perceives.
      var minCol = (typeof pl.minCol === "number") ? pl.minCol : 4;
      var maxCol = (typeof pl.maxCol === "number") ? pl.maxCol : 9;

      var armed = 0, staged = 0, moving = 0, speedSum = 0;
      var closest = 999;
      for (var i = 0; i < s.hazards.length; i++) {
        var h = s.hazards[i];
        if (h.row < lo || h.row > hi) continue;
        if (h.x < minCol - 3 || h.x > maxCol + 3) continue;
        if (h.spec && h.spec.kind === "air") continue;
        if (Hazards.isTelegraphing(h)) continue;
        if (Hazards.isStaged(h)) { staged++; continue; }
        armed++;
        speedSum += Math.abs(h.speed);
        if (Math.abs(h.speed) > 0.01) moving++;
        var dr = h.row - pl.row;
        if (dr >= 0 && dr < closest) closest = dr;
      }
      var meanSpeed = armed ? (speedSum / armed) : 0;
      print(pad(st, 6) + pad((elapsed / 1000).toFixed(1), 7) +
            pad((hi - lo), 14) + pad(armed, 7) + pad(staged, 8) +
            pad(moving, 8) + pad(meanSpeed.toFixed(2), 11) +
            pad(Hazards.speedFactorAt(elapsed).toFixed(2), 12) +
            (closest === 999 ? "   none" : "   " + closest));
      si++;
      if (si >= samples.length) break;
    }
  }
}

/* How many rows in the opening window carry traffic at all? This is the
 * density question the "they are not coming" complaint is really about. */
print("");
print("-- opening-window density (stage 1, first 12 rows) --");
var g2 = SimCore.createGame({ playerCount: 1, seed: "probe-density" });
var s = g2.state();
for (var t = 0; t < 40; t++) g2.tick(DT);
var byRow = {};
for (var i2 = 0; i2 < s2(s).hazards.length; i2++) {
  var h2 = s2(s).hazards[i2];
  if (h2.row > 12) continue;
  if (!byRow[h2.row]) byRow[h2.row] = [];
  byRow[h2.row].push(h2.armMs || 0);
}
var armedAtZero = 0, rowsWithAny = 0;
for (var r = 0; r <= 12; r++) {
  var list = byRow[r] || [];
  var a0 = 0;
  for (var q = 0; q < list.length; q++) if (list[q] === 0) a0++;
  if (list.length) rowsWithAny++;
  if (a0 > 0) armedAtZero++;
  print("  row " + pad(r, 2) + ": " + list.length + " hazard(s), " + a0 +
        " armed at t=0" + (list.length ? "   armMs=" + JSON.stringify(list) : ""));
}
print("");
print("rows 0-12 with ANY hazard: " + rowsWithAny + "/13");
print("rows 0-12 with a hazard armed at t=0: " + armedAtZero + "/13");

function s2(x) { return x; }
function pad(v, n) { v = String(v); while (v.length < n) v += " "; return v; }
"""


def main() -> int:
    dims = sprite_dims()
    manifest = (ROOT / "src/sprites/manifest.json").read_text()
    parts = [
        "var __RUNS=1, __SEED=1;",
        "var __MANIFEST = %s;" % json.dumps(manifest),
        "var __DIMS = %s;" % json.dumps(dims),
        "var __ERRORS = [];",
        "var __STATS = { frames:0, drawCalls:0, simTicks:0, hops:0, stages:0,"
        " deaths:0, wins:0, nan:0 };",
    ]
    sys.path.insert(0, str(ROOT / "tools"))
    import playtest
    parts.append(playtest.PRELUDE_JS)
    for rel in MODULES:
        parts.append("\n// ===== %s =====\n%s" % (rel, (ROOT / rel).read_text()))
    parts.append(PROBE_JS)
    src = ROOT / "tools" / "_probe.js"
    src.write_text("\n".join(parts))
    try:
        proc = subprocess.run([JSC, str(src)], capture_output=True, text=True,
                              timeout=280, cwd=str(ROOT))
    finally:
        if src.exists():
            src.unlink()
    print(proc.stdout)
    if proc.stderr.strip():
        print("--- stderr ---\n" + proc.stderr.strip()[:1500])
    return proc.returncode


if __name__ == "__main__":
    sys.exit(main())