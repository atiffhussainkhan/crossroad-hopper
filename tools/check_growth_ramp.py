#!/usr/bin/env python3
"""
tools/check_growth_ramp.py — guards the "+50% more killing items every 15 hops"
requirement.

The requirement is stated in src/stages.js and shipped to players as the feel of
a crossing. It was unguarded: Stages.growthFor() is exported but has NO caller
anywhere in src/ — only a comment in hazards.js mentions it — and every probe
under tools/ called Hazards.hazardsForRow() with seven arguments, so the eighth
(growth) defaulted to 1 and the multiplier was never measured by anything.

A mutation that made growthFor() always return 1 turned no gate red.

This gate measures the REAL generator, not a re-implementation of it. It passes
the growth argument explicitly at Stages.growthFor(j) for j = 0..90 and reads
what the board actually does, so a change that stops the multiplier reaching
hazardsForRow() fails here.

What is asserted, and why each tolerance is what it is:

  1. The multiplier itself equals GROWTH_PER_STEP ^ min(step, MAX_GROWTH_STEPS).
     Derived from the live exports, never hardcoded: a design change to the ramp
     moves the expectation with it instead of turning this gate into a lie.

  2. The density ramp rises strictly at every step, and the per-row object
     budget and board pace follow it.

  3. Live hazards per row, MEASURED THROUGH hazardsForRow(), never decrease
     across the steps and rise by at least 1.25x end to end. Step-to-step
     comparisons tolerate 0.005 hazards/row of sampling noise; each figure is an
     average over ~24 rows x 12 seeds x 10 stages. The end-to-end ratio is the
     load-bearing assertion: measured 1.57x, asserted at 1.25x, so it is far
     outside noise while still failing a real flattening of the ramp.

  4. hazardsForRow()'s eighth argument is genuinely consumed: the same rows and
     seeds built at growth 1 and at the last step's growth must differ.

  5. Speed rises with growth. There is no `hazardTapped()` in this codebase —
     the grep finds nothing outside a comment in check_vertical_slice.py — so
     the speed claim is asserted against what actually carries it: Stages'
     own `pace` channel, and the board speed factor hazardsForRow() judges each
     row by (Stages.hazardClockFor -> Hazards.speedFactorAt), which must never
     fall as growth rises and must exceed its opening value on every stage.

Run:  python3 tools/check_growth_ramp.py
Exits non-zero on any failure.
"""

from __future__ import annotations

import json
import re

from build_bundle import build
from js_runtime import ROOT, run_script

PROBE = ROOT / "tools/probes/growth_ramp.js"


def main() -> int:
    print("growth ramp (+50% killing items every 15 hops)")

    # build_bundle re-reads src/*.js on every call, so this measures the current
    # source rather than a cached copy of it.
    result = run_script(build(PROBE.read_text()), timeout=600)

    for line in result.stdout.splitlines():
        stripped = line.strip()
        if stripped.startswith("PROBLEM: ") or stripped.startswith("===") or \
                re.match(r"^(jumps|live hazards|growth argument|end-to-end|"
                         r"board speed|rows sampled|\d+ +[\d.]+)", stripped):
            print("  " + stripped)

    raw = result.stdout + result.stderr
    if result.returncode != 0 or "@@P@@" not in raw:
        detail = (result.stderr or result.stdout).strip()[:400]
        print(f"\n  FAIL — probe failed to run: {detail!r}")
        return 1

    data = json.loads(raw.rsplit("@@P@@", 1)[1].strip().splitlines()[0])
    stats = data["stats"]

    print(f"  multiplier   : " + ", ".join(
        f"{m['measured']:.4f}" for m in stats["multiplier"]) +
        "  (derived " +
        ", ".join(f"{m['expected']:.4f}" for m in stats["multiplier"]) + ")")
    print(f"  live/row     : " + ", ".join(f"{v:.4f}" for v in stats["livePerRow"]))
    print(f"  rise         : {stats['countRatio']:.3f}x from the first step to the last "
          f"(gate needs >= 1.25x)")

    if data["problems"]:
        print("\n  FAIL")
        for p in data["problems"]:
            print(f"    - {p}")
        return 1

    print("\n  PASS — the multiplier is 1.5^n to its cap, the board carries " +
          f"{stats['countRatio']:.2f}x more live hazards by the last step, the "
          "growth argument is read, and the board runs faster")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())