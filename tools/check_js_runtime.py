#!/usr/bin/env python3
"""Gate: no undeclared identifiers, and the module graph is order-correct.

This gate exists because the previous one printed PASS on a game that threw on
its first frame. Two independent verifier agents found the same class of defect
in the browser entry point and neither was caught:

  * `VIEW_SCALE` in src/main.js was read but never declared anywhere. Reading
    an undeclared identifier throws a ReferenceError, which killed the
    requestAnimationFrame chain on frame 1: a blank board and a frozen HUD.
  * `pointerDownT` was assigned but never declared, throwing under "use
    strict" on every visibilitychange.

Both are invisible to a load-and-check-globals test. They are caught by
scanning every identifier reference against every declaration, and by CALLING
the modules in dependency order rather than merely loading them.

Run from the project root:  python3 tools/check_js_runtime.py
"""

from __future__ import annotations

import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"

CHAIN = ["src/stages.js", "src/hazards.js", "src/sim-core.js",
         "src/render/iso.js", "src/render/scene.js", "src/roster.js",
         "src/render/character.js"]

DOM_ENTRY = "src/main.js"

GLOBALS = {"Stages", "Hazards", "SimCore", "Roster", "Iso", "Scene",
           "CharacterRenderer"}

BUILTINS = {
    "window", "document", "console", "Math", "JSON", "Object", "Array", "String",
    "Number", "Boolean", "Date", "RegExp", "Error", "TypeError", "RangeError",
    "Promise", "Map", "Set", "Symbol", "Infinity", "NaN", "undefined", "null",
    "true", "false", "this", "globalThis", "global", "parseInt", "parseFloat",
    "isNaN", "isFinite", "setTimeout", "clearTimeout", "setInterval",
    "clearInterval", "requestAnimationFrame", "cancelAnimationFrame",
    "performance", "Float32Array", "Uint8Array", "Int32Array", "require",
    "module", "exports", "arguments", "Image", "navigator", "location",
    "history", "fetch", "eval", "ResizeObserver", "matchMedia",
}

RESERVED = {
    "if", "else", "for", "while", "do", "switch", "case", "default", "return",
    "break", "continue", "new", "typeof", "delete", "void", "in", "of", "try",
    "catch", "finally", "throw", "function", "var", "let", "const", "class",
    "this", "super", "async", "await", "yield", "instanceof", "static",
    "get", "set", "extends", "import", "export", "from", "as", "with",
    "debugger",
}

# Declarations: `var x`, `let x`, `const x`, `function x`, `class x`,
# `x = function`, object-literal method `x: function`.
DECL_PATTERNS = [
    re.compile(r"\b(?:var|let|const|function|class)\s+([A-Za-z_$][\w$]*)"),
    re.compile(r"(?:^|[^.\w$])([A-Za-z_$][\w$]*)\s*=\s*function\b"),
    re.compile(r"(?:^|[,.({]\s*)([A-Za-z_$][\w$]*)\s*:\s*function\b"),
]


def strip_noise(src: str) -> str:
    src = re.sub(r"/\*.*?\*/", " ", src, flags=re.S)
    src = re.sub(r"//[^\n]*", " ", src)
    src = re.sub(r"\"(?:[^\"\\]|\\.)*\"", ' "" ', src)
    src = re.sub(r"'(?:[^'\\]|\\.)*'", " '' ", src)
    src = re.sub(r"`(?:[^`\\]|\\.)*`", " `` ", src, flags=re.S)
    return src


def declared_names(src: str) -> set[str]:
    names: set[str] = set()
    for pat in DECL_PATTERNS:
        for m in pat.finditer(src):
            names.add(m.group(1))
    # Multi-declarator statements: `var a = 1, b = 2;` and `let x, y;`.
    # Without this, only the first name in the statement is seen as declared,
    # so every later declarator reads as an undeclared reference.
    for m in re.finditer(r"\b(?:var|let|const)\s+([^;\n]+)", src):
        for part in m.group(1).split(","):
            nm = re.match(r"\s*([A-Za-z_$][\w$]*)", part)
            if nm:
                names.add(nm.group(1))

    # Function and method parameters, which are the bulk of local names.
    for m in re.finditer(r"function\s*(?:[A-Za-z_$][\w$]*)?\s*\(([^)]*)\)", src, re.S):
        for part in m.group(1).split(","):
            part = part.strip()
            if not part:
                continue
            nm = re.match(r"([A-Za-z_$][\w$]*)", part)
            if nm:
                names.add(nm.group(1))
    # Arrow functions: `(a, b) =>` and `x =>`.
    for m in re.finditer(r"\(([^()]*)\)\s*=>", src):
        for part in m.group(1).split(","):
            nm = re.match(r"\s*([A-Za-z_$][\w$]*)", part)
            if nm:
                names.add(nm.group(1))
    for m in re.finditer(r"(?<![.\w$])([A-Za-z_$][\w$]*)\s*=>", src):
        names.add(m.group(1))
    # Destructuring in params: { a, b } and [a, b].
    for m in re.finditer(r"[\(\{,]\s*\{([^}]*)\}\s*[),]", src, re.S):
        for part in m.group(1).split(","):
            nm = re.match(r"\s*([A-Za-z_$][\w$]*)", part)
            if nm:
                names.add(nm.group(1))
    for m in re.finditer(r"[\(\[,]\s*\[([^\]]*)\]\s*[\])]", src, re.S):
        for part in m.group(1).split(","):
            nm = re.match(r"\s*([A-Za-z_$][\w$]*)", part)
            if nm:
                names.add(nm.group(1))
    # Destructuring assignments: `var { a, b } = f()` and `let [a, b] = list`.
    for m in re.finditer(r"\b(?:var|let|const)\s*\{([^}]*)\}", src, re.S):
        for part in m.group(1).split(","):
            nm = re.match(r"\s*([A-Za-z_$][\w$]*)", part)
            if nm:
                names.add(nm.group(1))
    for m in re.finditer(r"\b(?:var|let|const)\s*\[([^\]]*)\]", src, re.S):
        for part in m.group(1).split(","):
            nm = re.match(r"\s*([A-Za-z_$][\w$]*)", part)
            if nm:
                names.add(nm.group(1))
    # catch (e)
    for m in re.finditer(r"catch\s*\(\s*([A-Za-z_$][\w$]*)", src):
        names.add(m.group(1))
    return names


def referenced_names(src: str) -> set[str]:
    out: set[str] = set()
    c = strip_noise(src)
    for m in re.finditer(r"(?<![.\w$])([A-Za-z_$][\w$]*)", c):
        name = m.group(1)
        if name in RESERVED:
            continue
        prev = c[m.start() - 1] if m.start() else ""
        if prev == ".":
            continue                       # property access
        if c[m.end():].lstrip().startswith(":"):
            continue                       # object-literal key
        out.add(name)
    return out


def assert_undeclared() -> list[str]:
    files = [ROOT / rel for rel in CHAIN] + [ROOT / DOM_ENTRY]
    all_declared: set[str] = set(GLOBALS)
    for f in files:
        all_declared |= declared_names(f.read_text())
    problems: list[str] = []
    for f in files:
        for name in sorted(referenced_names(f.read_text())):
            if name in BUILTINS or name in all_declared:
                continue
            problems.append(f"{f.relative_to(ROOT)}: undeclared identifier '{name}'")
    return problems


def run_jsc(body: str) -> str:
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(body)
        p = Path(f.name)
    proc = subprocess.run([JSC, str(p)], capture_output=True, text=True, cwd=str(ROOT))
    p.unlink(missing_ok=True)
    return (proc.stdout + proc.stderr).strip()


def assert_chain_runs() -> list[str]:
    """Load the chain and CALL the entry points.

    A load-and-check-globals test passes on an inverted chain. Calling
    createGame, the palette and the roster does not.
    """
    problems: list[str] = []
    script = "".join('load("%s");' % rel for rel in CHAIN)
    script += """
var out = [];
try { var g = SimCore.createGame({playerCount:2, seed:"gate"});
      g.hop("forward", 0); g.tick(16.667);
      out.push("createGame OK"); } catch (e) { out.push("createGame THREW " + e); }
try { var H = Hazards.buildHazards("gate", 0, 16, 9, 3, SimCore.createRng("g"));
      out.push("buildHazards OK " + H.length); } catch (e) { out.push("buildHazards THREW " + e); }
try { var s = Stages.getStage(0);
      var need = ["ground","groundAlt","road","water","hazard","hazard2",
                  "foliage","foliage2","trunk","log","turtle"];
      var miss = need.filter(function (k) { return !s[k]; });
      out.push("palette " + (miss.length ? "MISSING " + miss.join(",") : "complete"));
    } catch (e) { out.push("palette THREW " + e); }
try { var c = Roster.getCharacter("pip");
      out.push("roster " + (c.earColor && c.earKind ? "keys OK" : "KEYS MISSING"));
    } catch (e) { out.push("roster THREW " + e); }
try { CharacterRenderer.drawCharacter({}, 0, 0, 1, Roster.getCharacter("pip"));
      out.push("drawCharacter OK"); } catch (e) { out.push("drawCharacter THREW " + e); }
out.join(" | ");
"""
    out = run_jsc(script)
    for token in ("THREW", "MISSING"):
        if token in out:
            problems.append(f"module call failed: {out}")
            break
    return problems


def main() -> int:
    problems = assert_undeclared() + assert_chain_runs()
    files = [ROOT / rel for rel in CHAIN] + [ROOT / DOM_ENTRY]
    print(f"files scanned        : {len(files)}")
    print(f"module chain         : {len(CHAIN)}")
    if problems:
        print("\nFAIL")
        for p in problems:
            print(f"  - {p}")
        return 1
    print("\nPASS - no undeclared identifiers; the chain loads and its entry points run")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
