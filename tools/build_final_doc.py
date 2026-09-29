#!/usr/bin/env python3
"""Assemble the final requirements document.

Concatenates the consolidated mega document and the ten research dossiers into
one navigable file, with a generated table of contents, a requirement index, and
a provenance table mapping every consolidated requirement back to the dossier
IDs it was harvested from.

Run from the project root:  python3 tools/build_final_doc.py
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
DOSSIERS = DOCS / "dossiers"
OUT = DOCS / "REQUIREMENTS-FINAL.md"

# Dossier display order and the games each one covers.
ORDER = [
    ("01-crossyroad-frogger.md", "Crossy Road and Frogger"),
    ("02-riverraid-pacman256.md", "River Raid and Pac-Man 256"),
    ("03-castle-disney.md", "Crossy Road Castle and Disney Crossy Road"),
    ("04-flappy-jetpack.md", "Flappy Bird and Jetpack Joyride"),
    ("05-doodlejump-templerun.md", "Doodle Jump and Temple Run"),
    ("06-templerun2-subwaysurfers.md", "Temple Run 2 and Subway Surfers"),
    ("07-sonicdash-altosadventure.md", "Sonic Dash and Alto's Adventure"),
    ("08-altosodyssey-paperio.md", "Alto's Odyssey and Paper.io"),
    ("09-shootyskies-piffle.md", "Shooty Skies and Piffle"),
    ("10-clone-failure-synthesis.md", "Clone failure and synthesis"),
]

REQUIREMENT_GROUPS = {
    "M": "Movement and control",
    "B": "The board as a rule system",
    "P": "Pressure and difficulty",
    "R": "The restart loop",
    "E": "Economy and progression",
    "S": "Session, challenge and presentation",
    "X": "Rules the genre forbids",
    "G": "The grind — the offensive verb",
    "NF": "Non-functional requirements",
    "AU": "Audio",
    "AC": "Accessibility",
    "DP": "Device handling",
    "SV": "State and persistence",
    "QA": "Quality gates",
    "LG": "Legal",
    "CP": "Content pipeline",
}


def slugify(text):
    return re.sub(r"[^a-z0-9 -]", "", text.lower()).replace(" ", "-")


def anchor(heading):
    return slugify(re.sub(r"^#+\s*", "", heading))


def read(path):
    return path.read_text(encoding="utf-8").rstrip()


def main():
    missing = [name for name, _ in ORDER if not (DOSSIERS / name).exists()]
    if missing:
        sys.exit(f"Missing dossiers: {', '.join(missing)}")

    mega = read(DOCS / "mega-requirements.md")
    base = read(DOCS / "genre-requirements.md")
    dossiers = [(name, title, read(DOSSIERS / name)) for name, title in ORDER]

    harvested = len(
        set().union(
            *(set(re.findall(r"\b(?:DR|RR)-\d+-\d+", body)) for _, _, body in dossiers)
        )
    )
    # Count only LIVE rows that carry a tier letter; the spec uses unmarked
    # rows to record Phase 0 deletions (P-06, E-04, E-08, E-12, E-13, E-14,
    # S-09), and those should not be counted as consolidated requirements.
    consolidated = len(
        set(
            re.findall(
                r"^\| ([A-Z]{1,3}-\d+) \| .+? \| [ABC] \|", mega, re.M
            )
        )
    )
    corrections = len(
        re.findall(r"^\| .*\| \*\*(?:REFUTED|UNTRACEABLE|MISATTRIBUTED|UNVERIFIED)", mega, re.M)
    )
    disposition_path = DOCS / "disposition-table.md"
    disposition_rows = (
        sum(1 for line in disposition_path.read_text().splitlines() if line.startswith("| "))
        if disposition_path.exists()
        else 0
    )
    total_words = (
        sum(len(b.split()) for _, _, b in dossiers) + len(mega.split()) + len(base.split())
    )  # recomputed against the assembled text below, once the index exists

    out = []
    add = out.append

    add("# Final requirements document")
    add("")
    add(
        "The complete requirements record for an original lane-crossing arcade game, "
        "consolidated from a base specification and ten independent research dossiers."
    )
    add("")
    add(
        f"{consolidated} consolidated requirements · {harvested} harvested requirements · "
        f"{corrections} recorded corrections · {len(dossiers)} dossiers · "
        f"{total_words:,} words"
    )
    add("")
    add(
        "Part 1 is the consolidated specification and the analysis behind it. "
        "Parts 2 and 3 are the supporting record: the base specification the research "
        "began from, and the ten dossiers in full."
    )
    add("")

    add("## Contents")
    add("")
    add("- Part 1 — Consolidated requirements and analysis")
    add("  - Tier definition")
    add("  - Phase 0 of the development plan")
    add("  - Corrections to the base specification")
    add("  - Consolidated requirement set")
    add("    - Requirement index")
    add("  - Conflict resolutions")
    add("  - Specification for the combined game")
    add("  - Unresolved and unverified")
    add("- Part 2 — Base specification (superseded in part; see corrections)")
    add("- Part 3 — Research dossiers")
    for idx, (name, title) in enumerate(ORDER, start=1):
        add(f"  - 3.{idx} {title}")
    add("- Disposition table — every harvested requirement accounted for")
    add("")

    add("---")
    add("")
    add("## Part 1 — Consolidated requirements and analysis")
    add("")
    add(mega.split("\n", 1)[1].lstrip("\n"))
    add("")

    # Requirement index, generated from the mega document so it cannot drift.
    add("## Requirement index")
    add("")
    add(
        "Generated from the consolidated tables above, so this index cannot drift out of "
        "step with the specification it indexes."
    )
    add("")
    for prefix, group_name in REQUIREMENT_GROUPS.items():
        ids = re.findall(rf"^\| ({prefix}-\d+) \| (.+?) \|", mega, re.M)
        if not ids:
            continue
        add(f"**{group_name}**")
        add("")
        for rid, text in ids:
            add(f"- `{rid}` — {text}")
        add("")

    add("---")
    add("")
    add("## Part 2 — Base specification")
    add("")
    add(
        "> Superseded in part. Nineteen claims in this document were overturned during "
        "verification. Read the corrections table in Part 1 before relying on anything "
        "here."
    )
    add("")
    add(base.split("\n", 1)[1].lstrip("\n"))
    add("")

    add("---")
    add("")
    add("## Part 3 — Research dossiers")
    add("")
    add(
        "Each dossier was produced by an independent agent working from the Part 2 base "
        "specification, covering two games. Every claim that could not be traced to a "
        "credible source was marked UNVERIFIED rather than asserted."
    )
    add("")
    for idx, (name, title, body) in enumerate(dossiers, start=1):
        add(f"### 3.{idx} {title}")
        add("")
        add(f"*Source: `docs/dossiers/{name}`*")
        add("")
        first_line = body.split("\n", 1)[0].lstrip("# ").strip()
        add(f"*{first_line}*")
        add("")
        add(body.split("\n", 1)[1].lstrip("\n") if "\n" in body else "")
        add("")
        add("---")
        add("")

    # Disposition table appended after the dossiers so a reviewer can follow
    # any consolidated requirement back to its dossier source, and any
    # harvested requirement to its disposition.
    if disposition_path.exists():
        add("## Disposition table — every harvested requirement accounted for")
        add("")
        add(
            "Each row states what became of one of the 117 harvested requirements. "
            "Promoted rows link to a consolidated requirement; merged rows combine "
            "with one or more siblings; cut rows carry a recorded reason; "
            "duplicate rows are lessons captured elsewhere; risk rows live in "
            "`docs/DEVELOPMENT-PLAN.md`'s risk register."
        )
        add("")
        add(disposition_path.read_text().split("\n", 1)[1].lstrip("\n"))
        add("")

    OUT.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")

    # Count the assembled artifact itself, not its inputs, so the figure in the
    # header always matches wc -w on the written file.
    final_words = len(OUT.read_text(encoding="utf-8").split())
    text = OUT.read_text(encoding="utf-8")
    text = re.sub(r"\d[\d,]*\s+words", f"{final_words:,} words", text, count=1)
    OUT.write_text(text, encoding="utf-8")

    print(f"wrote {OUT.relative_to(ROOT)}")
    print(f"  consolidated requirements : {consolidated}")
    print(f"  harvested requirements   : {harvested}")
    print(f"  corrections              : {corrections}")
    print(f"  disposition rows         : {disposition_rows}")
    print(f"  dossiers                 : {len(dossiers)}")
    print(f"  words                    : {final_words:,}")
    print(f"  size                     : {OUT.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
