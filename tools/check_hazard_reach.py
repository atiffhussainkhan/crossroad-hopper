#!/usr/bin/env python3
"""
tools/check_hazard_reach.py — Phase 2 gate: a train never enters a lane whose
telegraph is shorter than the time the player needs to cross it.

Why this gate exists
--------------------
Stage 10 failed P-12 (campaign reachability 54% against a 90% target). The
cause was not difficulty tuning: a train is 3.4 tiles long at up to 6 tiles/sec,
so it covers any single column in ~0.57s, faster than the player's 600ms hop
cadence, and nothing warned them it was coming. The lane was unclearable.

Phase 2 item 3 specifies a railway telegraph, and this gate is the check the plan
promised alongside it. It runs the REAL modules through JavaScriptCore or Node so it cannot drift
from what the player plays.

Run:  python3 tools/check_hazard_reach.py
Exits non-zero on any failure.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from js_runtime import SIM_MODULES, run_script

# Timings the telegraph must be able to cover. These mirror the game, not a
# wish list: the player hops at most once per HOP_CADENCE_MS and is exposed to
# one row for TRAVERSE_S.
HOP_CADENCE_MS = 600.0
TRAVERSE_S = 0.55

# Rail kinds, from src/hazards.js. Kept here so the gate fails loudly if the
# game grows a new fast rail hazard that this gate has never been shown.
# Rail kinds are DERIVED from the live hazard vocabulary, not listed here.
# This was a hardcoded tuple of train/tram/monorail/freighttrain/subway, so
# removing those vehicles on request turned this gate into a probe for a feature
# that no longer exists -- it threw on H.KINDS[kind] being undefined and
# reported an empty failure with no diagnosis. A rail kind added later is now
# picked up automatically; if none exists, there is no telegraph to prove.
RAIL_KINDS = None

PROBE = r"""
(function () {
  var H = Hazards;   // eval'd at top level by the loader, so bare globals
  var out = { telegraphMs: H.TELEGRAPH_MS, kinds: {} };
  var _k = H.LANE_KINDS;   // touch, so a missing export is a hard failure
  var railNames = %(rail)s;
  for (var i = 0; i < railNames.length; i++) {
    var kind = railNames[i];
    var spec = H.KINDS[kind];
    var worst = { speed: 0, len: 0 };
    /* Highest speed this kind can actually reach in-game.
     *
     * Two multipliers stack, and this gate used to apply only the first:
     *   1 + min(difficulty,12) * 0.020   the difficulty ladder, max at d=12
     *   H.PEAK_SPEED_FACTOR             the last-15-seconds sprint
     *
     * The sprint is the one that matters. A telegraph sized against the d=12
     * ladder but not against the sprint is testing a speed the player never
     * sees at the moment they most need warning, and it would keep passing
     * however fast the sprint was made. */
    var spd = spec.speed[1] * (1 + 12 * 0.020) * H.PEAK_SPEED_FACTOR;
    // Ticks required for the hazard to sweep its own length past one column.
    var sweepMs = (spec.len / spd) * 1000;
    out.kinds[kind] = {
      len: spec.len, maxSpeed: spd, sweepMs: sweepMs,
      hasTelegraph: spec.kind === "rail"
    };
    if (sweepMs > worst.sweepMs || worst.sweepMs === undefined) {
      worst = { speed: spd, len: spec.len, sweepMs: sweepMs };
    }
  }
  // A GENERATED rail hazard must actually carry a telegraph. Scan until some
  // are found, otherwise this check passes vacuously on a row that happened to
  // contain no train at all -- which is exactly the silent hole a gate is for.
  var rails = 0, armed = 0, rowsScanned = 0;
  for (var st = 0; st < 10 && rails === 0; st++) {
    for (var rw = 0; rw < 40 && rails === 0; rw++) {
      var Rng2 = SimCore.createRng("gate:" + st + ":" + rw);
      var probed = H.hazardsForRow("gate:" + st + ":" + rw, rw, 9, 6, Rng2, st, 0);
      rowsScanned++;
      for (var j = 0; j < probed.length; j++) {
        if (probed[j].spec.kind !== "rail") continue;
        rails++;
        if (probed[j].tel) armed++;
      }
    }
  }
  out.generated = { railHazards: rails, withTelegraph: armed, rowsScanned: rowsScanned };
  return JSON.stringify(out);
})()
"""


def derive_rail_kinds() -> list[str]:
    """Rail hazards the LIVE vocabulary actually declares.

    Read out of src/hazards.js rather than assumed, so this gate follows the
    game instead of pinning a list that a legitimate content change invalidates.
    """
    import re
    src = (Path(__file__).resolve().parent.parent / "src" / "hazards.js").read_text()
    block = src[src.index("var KINDS = {"):]
    block = block[:block.index("\n  };")]
    return re.findall(r'^\s*([A-Za-z0-9_]+):\s*\{[^\n]*kind:\s*"rail"', block, re.M)


def run_probe() -> dict:
    """Run the real simulation modules in shared global script scope."""
    js = PROBE % {"rail": json.dumps(derive_rail_kinds())}
    # turn the probe's `return` into a console emit at top level
    js = js.strip()
    js = js.replace("  return JSON.stringify(out);\n})()",
                    '  console.log("@@P@@" + JSON.stringify(out));\n})()')
    proc = run_script(js, modules=SIM_MODULES)
    if proc.returncode != 0:
        raise RuntimeError(f"probe failed: {proc.stderr.strip()!r}")
    raw = proc.stdout + proc.stderr
    if "@@P@@" not in raw:
        raise RuntimeError(f"probe produced no marked JSON: {proc.stdout!r} {proc.stderr!r}")
    payload = raw.rsplit("@@P@@", 1)[1].strip().splitlines()[0]
    try:
        return json.loads(payload)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"probe JSON malformed: {exc}: {payload[:200]!r}") from exc


def main() -> int:
    print("railway telegraph reachability")
    try:
        data = run_probe()
    except Exception as exc:                      # noqa: BLE001
        print(f"  FAIL — {exc}")
        return 1

    failures: list[str] = []
    tg = float(data.get("telegraphMs", 0))
    print(f"  TELEGRAPH_MS      : {tg:.0f}ms")
    print(f"  hop cadence       : {HOP_CADENCE_MS:.0f}ms")
    print(f"  traverse window   : {TRAVERSE_S * 1000:.0f}ms")

    # 1. The telegraph must outlast the hop cadence, or the player cannot even
    #    act on the warning.
    if tg < HOP_CADENCE_MS:
        failures.append(
            f"telegraph {tg:.0f}ms is shorter than the {HOP_CADENCE_MS:.0f}ms hop "
            f"cadence — the player cannot react to it")
    # 2. The plan's own wording: never shorter than the traverse time.
    if tg < TRAVERSE_S * 1000:
        failures.append(
            f"telegraph {tg:.0f}ms is shorter than the {TRAVERSE_S * 1000:.0f}ms "
            f"traverse window")
    # 3. The warning must be worth more than the crossing it protects, or the
    #    player is gambling rather than reading.
    if tg <= TRAVERSE_S * 1000:
        failures.append(
            f"telegraph {tg:.0f}ms leaves no decision time beyond the "
            f"{TRAVERSE_S * 1000:.0f}ms it protects")

    for kind, k in sorted(data.get("kinds", {}).items()):
        print(f"  {kind:<8} len={k['len']:.2f}  vmax={k['maxSpeed']:.2f} t/s  "
              f"sweep={k['sweepMs']:.0f}ms  telegraph={k['hasTelegraph']}")
        if not k["hasTelegraph"]:
            failures.append(f"{kind} is a rail hazard with no telegraph")
        # A hazard that sweeps past faster than the telegraph is short gives the
        # player no way to read the warning and act on it.
        if k["sweepMs"] > tg:
            failures.append(
                f"{kind} sweeps a column in {k['sweepMs']:.0f}ms, faster than its "
                f"{tg:.0f}ms telegraph — the warning is unreadable")

    gen = data.get("generated", {})
    print(f"  generated rail hazards carrying a telegraph: "
          f"{gen.get('withTelegraph', 0)}/{gen.get('railHazards', 0)}")
    if gen.get("railHazards", 0) > 0 and gen.get("withTelegraph") != gen.get("railHazards"):
        failures.append(
            f"{gen['railHazards'] - gen['withTelegraph']} generated rail hazards "
            f"have no telegraph")

    if failures:
        print("\n  FAIL")
        for f in failures:
            print(f"    - {f}")
        return 1

    print("\n  PASS — every rail hazard is announced for at least the hop "
          "cadence and the traverse window")
    return 0


if __name__ == "__main__":
    sys.exit(main())
