#!/usr/bin/env python3
"""Gate: every declared stage asset has a renderer, and the two copies agree.

The art programme drifted because nothing asserted completeness. Stages
declared hazard and scenery types that no function ever drew, so the props
sheet was the first place the gap ever showed. This gate makes that failure
mode a build failure instead of a thing you notice by eye.

Asserts:
  1. Every hazard kind in every stage's `hazardKinds` has a draw function.
  2. Every scenery kind in every stage's `scenery` has a draw function in the
     Python preview AND a real object in the browser registry (src/scenery.js).
     Asserting only the preview left the shipping renderer unverified.
  3. The preview SCENES table in render_art.py carries the same asset lists
     as the game's src/stages.js, so the mock cannot drift from the game.
  4. The roster in src/roster.js and in render_art.py list the same ids.
  5. Every roster member declares a silhouette feature, so no two characters
     are distinguished by colour alone.

Run from the project root:  python3 tools/check_art_assets.py
"""

from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STAGES_JS = ROOT / "src" / "stages.js"
ROSTER_JS = ROOT / "src" / "roster.js"
SCENERY_JS = ROOT / "src" / "scenery.js"
RENDER = ROOT / "tools" / "render_art.py"

HAZARD_FNS = {
    "car": "draw_car", "tractor": "draw_tractor", "tram": "draw_tram",
    "train": "draw_train", "log": "draw_log", "turtle": "draw_turtle",
    "sled": "draw_sled", "animal": "draw_animal", "steel": "draw_steel",
    "forklift": "draw_forklift", "tumbleweed": "draw_tumbleweed",
    "crack": "draw_crack", "lightning": "draw_bolt", "lava": "draw_lava",
}

SCENERY_FNS = {
    "tree": "draw_tree", "bush": "draw_bush", "cactus": "draw_cactus",
    "rock": "draw_rock", "haybale": "draw_haybale", "building": "draw_building",
    "cone": "draw_cone", "lavaVent": "draw_lava_vent", "reed": "draw_reed",
    "pine": "draw_pine", "boulder": "draw_boulder",
    # Aliases: several biomes reuse an existing prop under a local name.
    "neon": "draw_building", "hedge": "draw_bush", "mailbox": "draw_cone",
    "fence": "draw_haybale", "iceberg": "draw_rock", "vine": "draw_reed",
    "fern": "draw_bush", "scaffold": "draw_building", "crate": "draw_rock",
    "pylon": "draw_building", "debris": "draw_rock", "obsidian": "draw_rock",
    "bone": "draw_rock",
}

# Every character must differ by something structural, not by hue.
SILHOUETTE_KEYS = {"triangle", "round", "tall", "antenna", "horn", "flop"}


def parse_stages_js(text: str) -> dict[int, dict]:
    body = text[text.index("var STAGES = ["):]
    out: dict[int, dict] = {}
    for block in re.split(r"(?=\{\s*\n?\s*id:)", body):
        m = re.match(r"\{\s*\n?\s*id:\s*(\d+)", block)
        if not m:
            continue
        hz = re.search(r"hazardKinds:\s*\[([^\]]*)\]", block)
        sc = re.search(r"scenery:\s*\[([^\]]*)\]", block)
        if hz and sc:
            out[int(m.group(1))] = {
                "hazards": [k.strip().strip("\"'") for k in hz.group(1).split(",") if k.strip()],
                "scenery": [k.strip().strip("\"'") for k in sc.group(1).split(",") if k.strip()],
            }
    return out


def parse_render_scenes(text: str) -> dict[int, dict]:
    out: dict[int, dict] = {}
    for m in re.finditer(r"dict\(id=(\d+),.*?hazardKinds=\[([^\]]*)\].*?scenery=\[([^\]]*)\]", text, re.S):
        out[int(m.group(1))] = {
            "hazards": [k.strip().strip("\"'") for k in m.group(2).split(",") if k.strip()],
            "scenery": [k.strip().strip("\"'") for k in m.group(3).split(",") if k.strip()],
        }
    return out


def parse_browser_registry(text: str) -> set[str]:
    """Keys of the REGISTRY object literal in src/scenery.js.

    The gate previously proved only that the PYTHON PREVIEW could draw every
    declared object. It said nothing about the browser, which is the thing that
    actually ships. An empty or truncated registry in src/scenery.js would have
    passed every gate while Suburb rendered as bare grass.
    """
    start = text.index("var REGISTRY = {")
    depth, i = 0, text.index("{", start)
    body_start = i
    while i < len(text):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                break
        i += 1
    body = text[body_start + 1 : i]
    return set(re.findall(r"([A-Za-z_][A-Za-z0-9_]*)\s*:", body))


def main() -> int:
    failures: list[str] = []

    for path in (STAGES_JS, ROSTER_JS, SCENERY_JS, RENDER):
        if not path.exists():
            print(f"missing {path}", file=sys.stderr)
            return 1

    render_src = RENDER.read_text()

    # Compile the renderer before checking anything about its contents. A gate
    # that greps for `def draw_x(` stays green while the module does not
    # parse, which is exactly the failure it was built to prevent.
    try:
        ast.parse(render_src, filename=str(RENDER))
    except SyntaxError as exc:
        print(f"\nFAIL: {RENDER.name} does not parse: line {exc.lineno}: {exc.msg}",
              file=sys.stderr)
        return 1

    stages = parse_stages_js(STAGES_JS.read_text())
    preview = parse_render_scenes(render_src)

    # 1 + 2. Every declared asset has a renderer.
    hazards = sorted({k for v in stages.values() for k in v["hazards"]})
    scenery = sorted({k for v in stages.values() for k in v["scenery"]})
    for k in hazards:
        if k not in HAZARD_FNS:
            failures.append(f"hazard '{k}' is declared by a stage but has no renderer")
        elif f"def {HAZARD_FNS[k]}(" not in render_src:
            failures.append(f"hazard '{k}' maps to {HAZARD_FNS[k]}, which does not exist")
    for k in scenery:
        if k not in SCENERY_FNS:
            failures.append(f"scenery '{k}' is declared by a stage but has no renderer")
        elif f"def {SCENERY_FNS[k]}(" not in render_src:
            failures.append(f"scenery '{k}' maps to {SCENERY_FNS[k]}, which does not exist")

    # 2b. ...and the BROWSER can draw them too, which is the copy that ships.
    browser = parse_browser_registry(SCENERY_JS.read_text())
    for k in scenery:
        if k not in browser:
            failures.append(
                f"scenery '{k}' is declared by a stage but is missing from the "
                f"src/scenery.js registry (the game would render it as nothing)"
            )

    # 3. The mock's asset lists match the game's.
    if set(stages) != set(preview):
        failures.append(
            f"stage asset lists disagree: stages.js has {sorted(stages)}, "
            f"render_art.py has {sorted(preview)}"
        )
    for sid in sorted(set(stages) & set(preview)):
        if stages[sid] != preview[sid]:
            failures.append(f"stage {sid}: asset lists differ between the game and the mock")

    # 4 + 5. Roster agreement and structural differentiation.
    js_ids = re.findall(r'id:\s*"([a-z]+)"', ROSTER_JS.read_text())
    py_ids = re.findall(r'id="([a-z]+)"', render_src)
    if sorted(js_ids) != sorted(py_ids):
        failures.append(f"roster ids disagree: {sorted(js_ids)} vs {sorted(py_ids)}")
    ears = re.findall(r'ear:\s*"([a-z]+)"', ROSTER_JS.read_text()) or \
           re.findall(r'earKind="([a-z]+)"', render_src)
    if not ears:
        failures.append("roster declares no silhouette feature")
    for e in ears:
        if e not in SILHOUETTE_KEYS:
            failures.append(f"roster ear kind '{e}' is not a known silhouette feature")
    if len(set(ears)) < 4:
        failures.append(
            f"roster has only {len(set(ears))} distinct silhouette features across "
            f"{len(ears)} characters; recolouring one sprite is not a new character"
        )

    print(f"stages            : {len(stages)}")
    print(f"distinct hazards  : {len(hazards)}  ({', '.join(hazards)})")
    print(f"distinct scenery  : {len(scenery)}  ({', '.join(scenery)})")
    print(f"roster members    : {len(js_ids)}  ({', '.join(sorted(js_ids))})")
    print(f"silhouette kinds  : {len(set(ears))}  ({', '.join(sorted(set(ears)))})")

    if failures:
        print("\nFAIL")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nPASS — every declared asset has a renderer and the mock matches the game")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
