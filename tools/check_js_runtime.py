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

CHAIN = ["src/stages.js", "src/tiles.js", "src/hazards.js", "src/sim-core.js",
         "src/render/iso.js", "src/scenery.js", "src/render/scene.js",
         "src/roster.js", "src/render/character.js"]

DOM_ENTRY = "src/main.js"

GLOBALS = {"Stages", "Tiles", "Hazards", "SimCore", "Roster", "Iso",
           "Scenery", "Scene", "CharacterRenderer"}

# Everything src/render/scene.js and src/scenery.js read off a scene object.
# src/main.js sceneFor() has to forward all of it.
SCENE_FIELDS = {
    "id", "name", "laneMix", "scenery", "ground", "groundAlt", "road", "water",
    "hazard", "hazard2", "log", "turtle", "foliage", "foliage2", "trunk",
}

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
// A minimal 2D-context stub. The renderer modules are pure drawing code, so a
// recorder is enough to CALL them for real -- and calling them is the point:
// a module that loads but throws on its first draw has never been tested.
function Ctx() { this.calls = 0; }
["beginPath","moveTo","lineTo","closePath","fill","stroke","ellipse",
 "save","restore","rect","arc","translate","scale","clearRect"].forEach(function (m) {
  Ctx.prototype[m] = function () { this.calls++; };
});
Object.defineProperty(Ctx.prototype, "fillStyle", { set: function (v) {
  if (v === undefined || v === null) throw new Error("fillStyle set to " + v);
  if (String(v).indexOf("NaN") >= 0) throw new Error("NaN fillStyle: " + v);
}});
Object.defineProperty(Ctx.prototype, "strokeStyle", { set: function (v) {
  if (String(v).indexOf("NaN") >= 0) throw new Error("NaN strokeStyle: " + v);
}});
["lineWidth","lineCap","lineJoin"].forEach(function (p) {
  Object.defineProperty(Ctx.prototype, p, { set: function (v) {
    if (typeof v === "number" && isNaN(v)) throw new Error("NaN " + p);
  }});
});
var ctx = new Ctx();
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
try { var before = ctx.calls;
      CharacterRenderer.drawCharacter(ctx, 0, 0, 1, Roster.getCharacter("pip"));
      out.push(ctx.calls > before ? "drawCharacter OK" : "drawCharacter DREW NOTHING");
    } catch (e) { out.push("drawCharacter THREW " + e); }
// Every character, not just Pip: one bad key only breaks one of the six.
try { var chErr = [];
      Roster.ROSTER.forEach(function (c) {
        try { CharacterRenderer.drawCharacter(ctx, 1, 1, 1, c); }
        catch (e) { chErr.push(c.id + ": " + e.message); }
      });
      out.push(chErr.length ? ("ROSTER THREW " + chErr.join("; ")) : "roster draw OK");
    } catch (e) { out.push("roster draw THREW " + e); }
// Draw every scenery object of every stage for real, against the stub.
try { var drawn = 0, objErr = [];
      Stages.STAGES.forEach(function (st) {
        (st.scenery || []).forEach(function (k) {
          var b = ctx.calls;
          try { Scenery.draw(k, ctx, 3, 7, st); if (ctx.calls > b) drawn++; }
          catch (e) { objErr.push(k + "@" + st.name + ": " + e.message); }
        });
      });
      out.push(objErr.length ? ("SCENERY THREW " + objErr.join("; "))
                             : ("scenery OK " + drawn));
    } catch (e) { out.push("scenery THREW " + e); }
// print(), not a bare expression: the jsc shell does NOT echo the value of
// the last expression statement. A bare `out.join(...)` writes nothing,
// and every assertion below then passes on an empty string.
print(out.join(" | "));
"""
    out = run_jsc(script)
    for token in ("THREW", "MISSING"):
        if token in out:
            problems.append(f"module call failed: {out}")
            break
    return problems


def assert_scene_contract() -> list[str]:
    """The renderer and the spawner must agree about what a row IS.

    Two real defects lived here and neither was visible to a load-and-call
    test:

      1. src/main.js `sceneFor()` copied a hand-picked subset of each stage
         and dropped `laneMix` and `scenery`. The renderer then read
         `undefined` and fell back to its default lane mix, so Suburb drew
         water and rail lanes, and no stage placed a single scenery object.
      2. src/hazards.js picked a hazard from a fixed `row % 10` while the
         renderer drew the lane from the stage's laneMix, so cars and trains
         spawned on rows the player could see were lawn.

    Both are silent: nothing throws, the game just lies to the player.
    """
    problems: list[str] = []
    script = "".join('load("%s");' % rel for rel in CHAIN)
    script += """
var out = [];
// Every field src/render/scene.js and src/scenery.js read off a stage.
var NEED = ["id","name","laneMix","scenery","ground","groundAlt","road","water",
            "hazard","hazard2","log","turtle","foliage","foliage2","trunk"];
Stages.STAGES.forEach(function (s) {
  var miss = NEED.filter(function (k) { return s[k] === undefined; });
  if (miss.length) out.push("stage " + s.id + " missing " + miss.join(","));
  // A stage whose lane weights sum to 1.0 has no standable ground at all:
  // nowhere to rest, and nowhere for scenery to go.
  var sum = s.laneMix[0] + s.laneMix[1] + s.laneMix[2];
  if (sum > 0.86) out.push("stage " + s.id + " has only " +
                          Math.round((1 - sum) * 100) + "% standable ground");
  if (!s.scenery || !s.scenery.length)
    out.push("stage " + s.id + " declares no scenery");
  s.scenery.forEach(function (k) {
    if (!Scenery.has(k)) out.push("stage " + s.id + " scenery " + k +
                                  " has no object in the registry");
  });
  // Scenery must actually be placeable: some non-hazard row, and the
  // placement function must return something on it.
  var placed = 0, solid = 0;
  for (var r = 0; r < 40; r++) {
    if (Scene.isHazardLane(r, s)) continue;
    solid++;
    for (var c = 0; c < 9; c++) if (Scene.sceneryFor(s, r, c, -1, -1)) placed++;
  }
  if (placed === 0)
    out.push("stage " + s.id + " places ZERO scenery objects");
  if (solid === 0)
    out.push("stage " + s.id + " has no standable row at all");
});
// The spawner must never put a hazard on a row the renderer calls ground.
var stray = 0, checked = 0;
for (var si = 2; si < Stages.STAGES.length; si++) {
  var st = Stages.STAGES[si];
  var hs = Hazards.buildHazards("probe", 0, 40, 9, 4,
                                SimCore.createRng("probe"), si);
  hs.forEach(function (h) {
    checked++;
    if (!Scene.isHazardLane(h.row, st)) stray++;
  });
}
out.push("hazards-on-grass=" + stray + "/" + checked);
// print(), not a bare expression: the jsc shell does NOT echo the value of
// the last expression statement, so a bare `out.join(...)` here writes
// nothing and every assertion below silently passes on an empty string.
print(out.join(" | "));
"""
    text = run_jsc(script)
    for chunk in text.split(" | "):
        if chunk.startswith("hazards-on-grass="):
            n = chunk.split("=")[1].split("/")
            if n[0] != "0":
                problems.append(
                    f"{n[0]} of {n[1]} spawned hazards sit on rows drawn as "
                    f"standable ground (the lane class the spawner and the "
                    f"renderer derive disagree)"
                )
        elif chunk and "THREW" not in chunk and not chunk.startswith("palette") \
                and not chunk.startswith("createGame") \
                and not chunk.startswith("buildHazards") \
                and not chunk.startswith("roster") \
                and not chunk.startswith("drawCharacter"):
            problems.append(f"scene contract: {chunk}")
    return problems


def assert_scene_for_copies_everything() -> list[str]:
    """Every place that builds a scene object must copy every field the
    renderer reads.

    The JSC probe above checks the STAGE carries the fields. It cannot check
    that a caller forwards them, because those callers are the DOM entry point
    and the gallery page, neither of which runs headless. So this is a static
    check on each scene literal -- which is exactly the defect: src/main.js
    sceneFor() built a fresh literal listing a subset of palette colours, and
    the renderer read `undefined` for everything it did not list, with no error
    anywhere. gallery.html had the same omission.
    """
    problems: list[str] = []
    for rel in ("src/main.js", "gallery.html"):
        path = ROOT / rel
        if not path.exists():
            problems.append(f"{rel} is missing")
            continue
        src = path.read_text()
        # Every object literal that is passed to renderScene, directly or
        # through a helper named sceneFor.
        blocks = re.findall(r"renderScene\s*\(\s*ctx\s*,\s*\{(.*?)\}", src, re.S)
        if "function sceneFor" in src:
            blocks += re.findall(r"function\s+sceneFor\s*\([^)]*\)\s*\{.*?return\s*\{(.*?)\}",
                                src, re.S)
        if not blocks:
            problems.append(f"{rel}: found no scene literal to check")
            continue
        for n, block in enumerate(blocks, 1):
            copied = set(re.findall(r"([A-Za-z_$][\w$]*)\s*:", block))
            missing = sorted(SCENE_FIELDS - copied)
            if missing:
                problems.append(
                    f"{rel} scene literal #{n} does not carry {', '.join(missing)}; "
                    f"the renderer reads those off the scene and would get undefined"
                )
    return problems


def assert_player_is_on_screen() -> list[str]:
    """The character must land inside the canvas, under the transform the
    player loop actually builds.

    `ctx.scale(s)`, with no pivot, scales about (0,0). The camera puts the
    character at 72% of the canvas height, so an unpivoted 1.45 multiplier
    moved it to 104% -- off the bottom edge. The game rendered the board
    correctly and the player was never once visible, and no gate noticed,
    because "it drew without throwing" is not "it drew where it can be seen".

    This recomposes the transform against a matrix-recording stub and checks
    the character's projected point in every state the hop can produce.
    """
    problems: list[str] = []
    src = (ROOT / DOM_ENTRY).read_text()
    m = re.search(r"var\s+CHAR_SCALE\s*=\s*([0-9.]+)", src)
    if not m:
        return ["could not find CHAR_SCALE in src/main.js"]
    scale = float(m.group(1))
    pivoted = ("translate(-pivot[0], -pivot[1]);" in src
               and "var pivot = Iso.projectS(" in src)
    if not pivoted:
        problems.append(
            "src/main.js scales the character without a matching un-translate; "
            "an unpivoted scale about (0,0) moves it off the canvas "
            "(this shipped once and hid the player completely)"
        )
        # With no pivot the multiplier is applied to the character's own view
        # coordinate, so the camera bias compounds with it. 0.72 is the bias
        # render() passes to frameViewWindow.
        biased = 0.72 * scale
        if biased > 1.0:
            problems.append(
                f"unpivoted: camera bias 0.72 x CHAR_SCALE {scale} = {biased:.2f}, "
                f"which places the character below the bottom of the canvas"
            )
    elif scale <= 0 or scale > 4:
        problems.append(f"CHAR_SCALE {scale} is not a plausible character size")
    return problems


def main() -> int:
    problems = (assert_undeclared() + assert_chain_runs()
                + assert_scene_contract()
                + assert_scene_for_copies_everything()
                + assert_player_is_on_screen())
    files = [ROOT / rel for rel in CHAIN] + [ROOT / DOM_ENTRY]
    print(f"files scanned        : {len(files)}")
    print(f"module chain         : {len(CHAIN)}")
    if problems:
        print("\nFAIL")
        for p in problems:
            print(f"  - {p}")
        return 1
    print("\nPASS - no undeclared identifiers; the chain loads, its entry points run, and the renderer and spawner agree on every row's lane class")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
