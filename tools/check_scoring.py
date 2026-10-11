#!/usr/bin/env python3
"""Run the scoring and Endless lifecycle regression against the real source."""
from build_bundle import build
from js_runtime import ROOT, run_script


def main() -> int:
    probe = ROOT / "tools/probes/scoring.js"
    result = run_script(build(probe.read_text()))
    print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="")
    return 0 if result.returncode == 0 and "SCORING + ENDLESS: PASS" in result.stdout else 1


if __name__ == "__main__":
    raise SystemExit(main())
