#!/usr/bin/env python3
"""Gate: trace and integrity check for the consolidated specification.

Asserts that the mega-requirements document is internally consistent and that
its citations to the dossier base are sound. The Phase 0 exit criteria of
`docs/DEVELOPMENT-PLAN.md` say the trace gate and the testability gate must
both pass.

Run from the project root:  python3 tools/check_requirements.py
Exits non-zero on any failure. Prints the offending ids.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
DOSSIERS = DOCS / "dossiers"
MEGA = DOCS / "mega-requirements.md"
DISPOSITION = DOCS / "disposition-table.md"

# Allowed prefixes for harvested requirement ids.
HARVEST_PREFIX = ("DR-", "RR-")
# Allowed prefixes for consolidated requirement ids.
CONSOLIDATED_PREFIX = (
    "M-", "B-", "P-", "R-", "E-", "S-", "X-", "ST-",
    "G-", "NF-", "AU-", "AC-", "DP-", "SV-", "QA-", "LG-", "CP-",
)
TIER_REQUIRED_IDS = {  # deleted in Phase 0, must NOT appear
    "P-06", "E-04", "E-08", "E-12", "E-13", "E-14", "S-09",
}


def main() -> int:
    failures: list[str] = []
    notes: list[str] = []

    if not MEGA.exists():
        print(f"missing {MEGA}", file=sys.stderr)
        return 1

    mega_text = MEGA.read_text(encoding="utf-8")

    # 1. Every consolidated requirement id that appears in the spec must be
    #    defined as a row in a table (the canonical definition), with a tier.
    #    Use the table rows as the source of truth.
    consolidated_rows = re.findall(
        r"^\| ([A-Z]{1,3}-(\d+)) \| (.+?) \| ([ABC]) \|", mega_text, re.M
    )
    consolidated_defined = {rid for rid, _, _, _ in consolidated_rows}
    for forbidden in TIER_REQUIRED_IDS:
        if forbidden in consolidated_defined:
            failures.append(
                f"deleted requirement {forbidden} still present in the spec"
            )

    # 2. Per-namespace contiguity: ids 1..max must all exist, no gaps.
    by_prefix: dict[str, set[int]] = {}
    for rid in consolidated_defined:
        prefix, _, num = rid.partition("-")
        prefix = prefix + "-"  # keep the trailing dash for tuple membership
        try:
            n = int(num)
        except ValueError:
            failures.append(f"requirement id {rid} has a non-numeric suffix")
            continue
        by_prefix.setdefault(prefix, set()).add(n)
    for prefix, ids in sorted(by_prefix.items()):
        if prefix not in CONSOLIDATED_PREFIX:
            failures.append(f"unknown consolidated id prefix '{prefix}'")
            continue
        # Skip ids that were deliberately deleted in Phase 0; the gate
        # tolerates their absence but would otherwise flag them as gaps.
        deleted = {int(i.split("-", 1)[1]) for i in TIER_REQUIRED_IDS if i.startswith(prefix)}
        expected_max = max(ids | {1})  # also check at least 1 even if max < 1
        expected = set(range(1, expected_max + 1)) - deleted
        missing = sorted(expected - ids)
        if missing:
            failures.append(
                f"prefix {prefix} has gaps: missing {missing}"
            )

    # 3. Every harvested requirement id that is CITED in the spec must be
    #    DEFINED in a dossier.
    cited_harvested = set(re.findall(r"\b(?:DR|RR)-\d+-\d+\b", mega_text))
    dossier_ids: set[str] = set()
    for dossier in sorted(DOSSIERS.glob("*.md")):
        dossier_ids.update(re.findall(r"\b(?:DR|RR)-\d+-\d+\b", dossier.read_text()))

    orphan_citations = cited_harvested - dossier_ids
    if orphan_citations:
        failures.append(
            f"cited but not defined in any dossier: {sorted(orphan_citations)}"
        )

    # 4. Every Tier A row must have a threshold column populated. The table
    #    format is | ID | Requirement | Tier | Threshold / measurement | Source |
    #    We require column 4 to be non-empty and not the literal placeholder.
    for rid, _n, _req, tier in consolidated_rows:
        if tier != "A":
            continue
        # re-fetch the full row text
        pattern = re.compile(
            rf"^\| {re.escape(rid)} \|(.+?)\| [ABC] \|(.+?)\|", re.M
        )
        match = pattern.search(mega_text)
        if not match:
            continue
        threshold = match.group(2).strip()
        if not threshold or threshold in {"—", "-", "TODO"}:
            failures.append(
                f"Tier A requirement {rid} has empty threshold"
            )

    # 5. Every Tier A requirement must contain a number OR an explicit method
    #    phrase. "roughly", "approximately", "as fast as possible" do not count.
    method_signal = re.compile(
        r"\b(?:"
        r"ms|s|seconds?|Hz|fps|frames?|px|bytes?|KB|MB|GB|"
        r"<|>|≤|≥|==|!=|"
        r"assertion|assert|threshold|default|MAX|MIN|"
        r"grep|test|fuzz|seed|render|diff|scan|verify|verified|"
        r"count|sum|integer|boolean|exists|exposes|spawn|"
        r"intercept(?:ion)?|released|reads|"
        r"covered|days?|"
        r"[A-Z][A-Z0-9_]{2,}"  # SYMBOLS like MAX_GRIND_MS, PURSUER_DISTANCE_THRESHOLD
        r")\b",
        re.I,
    )
    vague = re.compile(
        r"\b(?:roughly|approximately|almost|near(?:ly)?|usually|as\sfast\sas|"
        r"subjective|legible|amusing|judgeable|distinct(?:ive)?|"
        r"obvious|clear(?:ly)?|unmistakable|polished)\b",
        re.I,
    )
    # QA-03 necessarily references the words it checks for; exempt it.
    VAGUE_EXEMPT = {"QA-03"}
    for rid, _n, _req, tier in consolidated_rows:
        if tier != "A":
            continue
        pattern = re.compile(
            rf"^\| {re.escape(rid)} \|(.+?)\| [ABC] \|(.+?)\|", re.M
        )
        match = pattern.search(mega_text)
        if not match:
            continue
        threshold = match.group(2)
        if not method_signal.search(threshold):
            failures.append(
                f"Tier A requirement {rid} threshold has no measurement method"
            )
        if rid not in VAGUE_EXEMPT and vague.search(threshold):
            failures.append(
                f"Tier A requirement {rid} threshold still uses a vague term"
            )

    # 6. No console pollution from earlier passes: the deleted ids must not
    #    appear in any requirement row.
    for forbidden in TIER_REQUIRED_IDS:
        # allow the deletion markers but no live rows
        live_row = re.search(
            rf"^\| {re.escape(forbidden)} \|[^|]+\| [ABC] \|", mega_text, re.M
        )
        if live_row:
            failures.append(
                f"deleted requirement {forbidden} reappeared as a live row"
            )

    # 7. Disposition table exists and accounts for every harvested id.
    if not DISPOSITION.exists():
        failures.append(f"disposition table missing at {DISPOSITION}")
    else:
        disp_text = DISPOSITION.read_text(encoding="utf-8")
        disposed = set(re.findall(r"\b(?:DR|RR)-\d+-\d+\b", disp_text))
        # Cover those defined in dossiers
        unaccounted = dossier_ids - disposed
        if unaccounted:
            failures.append(
                f"disposition table is missing rows for: {sorted(unaccounted)}"
            )
        # Disposition table must not invent ids
        invented = disposed - dossier_ids
        if invented:
            failures.append(
                f"disposition table references undefined ids: {sorted(invented)}"
            )

    # Reporting.
    print(f"consolidated rows  : {len(consolidated_rows)}")
    print(f"consolidated ids   : {sorted(consolidated_defined)}")
    print(f"dossier ids        : {len(dossier_ids)}")
    print(f"cited harvest ids  : {len(cited_harvested)}")
    print(f"uncited harvest ids: {len(dossier_ids - cited_harvested)}")

    if failures:
        print("\nFAIL")
        for f in failures:
            print(f"  - {f}")
        return 1

    print("\nPASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
