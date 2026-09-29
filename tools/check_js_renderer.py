#!/usr/bin/env python3
"""Gate: the browser renderer exists, loads, and is wired into the game.

The art programme drifted because nothing asserted that the PLAYABLE used it.
src/main.js used to draw flat colour bands and square players while every
asset lived only in the Python preview. This gate fails if the game stops
loading the renderer, or if the renderer modules stop parsing.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "index.html"
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"

# Load order matters: the palette, then the core, then the renderer, then
# the game. The renderer reads the palette at load time.
CHAIN = ["src/stages.js", "src/sim-core.js", "src/render/iso.js",
         "src/render/scene.js", "src/roster.js", "src/render/character.js"]


def main() -> int:
    failures: list[str] = []
    html = HTML.read_text()

    for rel in CHAIN + ["src/main.js"]:
        if f'src="{rel}"' not in html:
            failures.append(f"index.html does not load {rel}")

    # Every module must parse, and the renderer chain must load together.
    for rel in CHAIN:
        src = (ROOT / rel).read_text()
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
            f.write("var _src = %s;\ntry { new Function(_src); print('OK'); }\n"
                    "catch (e) { print('SYNTAX: ' + e); }\n" % json.dumps(src))
            p = Path(f.name)
        proc = subprocess.run([JSC, str(p)], capture_output=True, text=True)
        p.unlink(missing_ok=True)
        if "OK" not in proc.stdout:
            failures.append(f"{rel} does not parse: {proc.stdout.strip()[:120]}")

    # The chain must actually evaluate together, with no missing global.
    script = "".join('load("%s");' % rel for rel in CHAIN)
    script += ("\nif (typeof Iso==='undefined') print('MISSING Iso');\n"
               "else if (typeof Scene==='undefined') print('MISSING Scene');\n"
               "else if (typeof Roster==='undefined') print('MISSING Roster');\n"
               "else if (typeof CharacterRenderer==='undefined') print('MISSING CharacterRenderer');\n"
               "else if (Roster.count() !== 6) print('BAD ROSTER COUNT ' + Roster.count());\n"
               "else print('CHAIN OK');\n")
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(script)
        p = Path(f.name)
    proc = subprocess.run([JSC, str(p)], capture_output=True, text=True,
                          cwd=str(ROOT))
    p.unlink(missing_ok=True)
    if "CHAIN OK" not in proc.stdout:
        failures.append(f"renderer chain did not load: "
                        f"{(proc.stdout + proc.stderr).strip()[:160]}")

    print(f"modules chained    : {len(CHAIN) + 1}")
    print(f"roster members     : {6 if 'CHAIN OK' in proc.stdout else '?'}")

    if failures:
        print("\nFAIL")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nPASS — the playable uses the isometric renderer")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
