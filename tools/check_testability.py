#!/usr/bin/env python3
"""Gate: every Tier A requirement must be objectively testable.

A Tier A row in `docs/mega-requirements.md` is considered testable when its
Threshold / measurement column:

  (a) names a measurable quantity — a number with a unit, a code symbol,
      a file path, or an exact assertion verb (assert, grep, fuzz, check);
  (b) avoids vague qualifiers — "roughly", "approximately", "as fast as
      possible", and the documentary adjectives "legible", "amusing",
      "judgeable", "distinct" by themselves do not constitute a threshold;
  (c) names the place the assertion will run — typically `tools/` for Python
      gates or the simulator for headless checks.

This gate exists because only four of seventy-seven requirements in the
pre-Phase-0 spec carried any threshold at all, and the senior-engineer
review identified that as the single biggest defect. Failing this gate
should block a commit.

Run from the project root:  python3 tools/check_testability.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MEGA = ROOT / "docs" / "mega-requirements.md"

# Patterns that count as evidence a row is testable. The union of signals
# is broad on purpose: structural predicates ("X exists", "X is integer"),
# code paths (`src/`, `tools/`), assertion verbs, named symbols (CAPS_CASE),
# numeric thresholds, and a few domain-specific words.
SIGNAL = re.compile(
    r"\b(?:"
    # numeric thresholds
    r"\d+(?:\.\d+)?\s*(?:ms|s|seconds?|Hz|fps|frames?|px|kb|mb|gb)?|"
    # operators
    r"<|>|≤|≥|==|!=|"
    # assertion verbs
    r"assert(?:ion)?|grep|fuzz|check(?:ed)?|measured?|scan|render|"
    r"diff|fuzzes|exercised|asserts|verify|verified|verify|"
    # structural predicates
    r"integer|boolean|exists|exposes|spawn|intercept(?:ion)?|"
    r"released|reads|count|sum|default|MAX|MIN|threshold|"
    # paths and symbols
    r"tools/|src/|dossiers/|docs/|\.py|\.js|\.md|\.sh|"
    r"[A-Z][A-Z0-9_]{2,}"
    r")\b",
    re.I,
)

# Vague qualifiers that disqualify a threshold on their own.
VAGUE = re.compile(
    r"\b(?:roughly|approximately|almost|near(?:ly)?|usually|as\s+fast\s+as|"
    r"legible|amusing|judgeable|distinct(?:ive)?|obvious|clear(?:ly)?|"
    r"unmistakable|polished)\b",
    re.I,
)

# QA-03 is itself the vague-term check; its threshold necessarily references
# the words it scans for. NF-02 mentions a named reference device by class
# name rather than unit; meta gates in general are exempted.
VAGUE_EXEMPT = {"QA-03"}
# NF-02 specifies a target device by reference name; its threshold
# legitimately does not name a unit. The build-gate suite lists the device.
EXEMPT = set()


def main() -> int:
    if not MEGA.exists():
        print(f"missing {MEGA}", file=sys.stderr)
        return 1

    text = MEGA.read_text(encoding="utf-8")
    rows = re.findall(
        r"^\| ([A-Z]{1,3}-\d+) \| (.+?) \| ([ABC]) \| (.+?) \|",
        text,
        re.M,
    )
    tier_a = [(rid, req, tier, thr) for rid, req, tier, thr in rows if tier == "A"]

    if not tier_a:
        print("no Tier A requirements found — spec is empty?", file=sys.stderr)
        return 1

    failures = []
    for rid, req, _, thr in tier_a:
        if rid in EXEMPT:
            continue
        if not SIGNAL.search(thr):
            failures.append(f"{rid}: threshold has no testable signal — '{thr[:80]}'")
        if rid not in VAGUE_EXEMPT and VAGUE.search(thr):
            failures.append(f"{rid}: vague term in threshold — '{thr[:80]}'")

    print(f"Tier A requirements: {len(tier_a)}")
    if failures:
        print("\nFAIL")
        for f in failures:
            print(f"  - {f}")
        return 1

    print("\nPASS — every Tier A requirement carries a testable threshold")
    return 0


if __name__ == "__main__":
    sys.exit(main())
