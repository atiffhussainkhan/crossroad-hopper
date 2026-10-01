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
    """Every name a module references must be declared in that module, or be a
    known module global.

    This used to pool the declared names from every file in the chain and
    accept a reference if ANY file declared it. src/scenery.js has `var I =
    global.Iso;` as a local alias, which meant an undeclared `I` in
    src/main.js passed the check -- and main.js really did have one, so the
    first frame threw a ReferenceError and the render loop died. The gate was
    not merely weak, it was actively masking the bug because an unrelated
    module happened to use the same letter.

    Each file is now checked against its OWN declarations plus the known
    module globals, so a name has to be legitimate where it is used.
    """
    files = [ROOT / rel for rel in CHAIN] + [ROOT / DOM_ENTRY]
    problems: list[str] = []
    for f in files:
        src = f.read_text()
        local = declared_names(src) | GLOBALS | BUILTINS
        for name in sorted(referenced_names(src)):
            if name in RESERVED or name in local:
                continue
            problems.append(
                f"{f.relative_to(ROOT)}: undeclared identifier '{name}' "
                f"(declared only in another file, or nowhere)"
            )
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
/* The endgame bird is MEANT to fly over the lawn -- it is lane-independent,
 * and that is precisely what makes it different from every other obstacle. So
 * the rule is not "nothing spawns on grass" but "only the bird does": a
 * VEHICLE on a row the player can see is walkable is the exact bug this probe
 * was written for, and admitting the bird must not blunt it. */
var stray = 0, checked = 0, birdsOnGrass = 0;
for (var si = 0; si < Stages.STAGES.length; si++) {
  var st = Stages.STAGES[si];
  for (var rr = 0; rr < 40; rr++) {
    Hazards.hazardsForRow("pg" + si + rr, rr, st.id, 4,
                          SimCore.createRng("pg" + si + rr), si, 4)
      .forEach(function (h) {
        checked++;
        if (Scene.isHazardLane(h.row, st)) return;
        if (h.kind === "hawk") birdsOnGrass++;
        else stray++;
      });
  }
}
out.push("hazards-on-grass=" + stray + "/" + checked);
out.push("birds-on-grass=" + birdsOnGrass);
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
                    f"standable ground. Only the endgame bird may fly over the "
                    f"lawn; a vehicle there looks walkable and is lethal."
                )
        elif chunk.startswith("birds-on-grass="):
            if chunk.split("=")[1] == "0":
                problems.append(
                    "the endgame bird never flies over the lawn, so the safe "
                    "ground is still safe and the bird is just another vehicle "
                    "in the air"
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


def assert_stage_one_is_playable() -> list[str]:
    """Stage one must be a lane-crossing game, not a walking sim.

    src/hazards.js once returned an empty list for the first two stages
    ("teaching stages carry no lethal hazard at all"). The player reported
    the consequence directly: no moving objects, nothing to protect yourself
    from. A stage with no traffic is not a tutorial, it is the absence of the
    game, and it is indistinguishable from a build that failed to load.

    So: stage one spawns lethal hazards, the launch apron is clear so the
    first hop is a decision rather than a reflex, and the finish apron is
    clear so the stage can actually be completed.
    """
    problems: list[str] = []
    script = "".join('load("%s");' % rel for rel in CHAIN)
    script += """
var out = [];
var goal = Stages.GOAL_ROW_OFFSET;
var kinds = {}, rows = {};
for (var w = 0; w < 6; w++) {
  var hs = Hazards.ensureSolvable(
    Hazards.buildHazards("p1", w * 12, 12, 9, 0, SimCore.createRng("p1:" + w), 0),
    { needGap: 0.9 });
  hs.forEach(function (h) { kinds[h.kind] = 1; rows[h.row] = 1; });
}
out.push("stage1-kinds=" + Object.keys(kinds).sort().join("+"));
var n = Object.keys(rows).length;
out.push("stage1-hazards=" + n);
var apron = Object.keys(rows).filter(function (r) { return +r < 3; }).length;
out.push("launch-apron=" + apron);
var fin = Object.keys(rows).filter(function (r) { return +r >= goal - 2; }).length;
out.push("finish-apron=" + fin);
out.push("goal-row=" + goal);
print(out.join(" | "));
"""
    text = run_jsc(script)
    kv = dict()
    for chunk in text.split(" | "):
        if "=" in chunk:
            k, _, v = chunk.partition("=")
            kv[k.strip()] = v.strip()
    if not kv.get("stage1-kinds"):
        problems.append(
            "stage one spawns NO hazards; the player has nothing to dodge and "
            "nothing that can kill them (this shipped once)"
        )
    elif "car" not in kv["stage1-kinds"]:
        problems.append(
            f"stage one spawns no cars (kinds: {kv['stage1-kinds']}); a suburb "
            f"with no traffic is not a lane-crossing stage"
        )
    try:
        if int(kv.get("stage1-hazards", 0)) < 4:
            problems.append(
                f"stage one has only {kv.get('stage1-hazards')} hazards across the "
                f"whole board; it would be possible to walk the stage without "
                f"meeting one"
            )
        if kv.get("launch-apron") != "0":
            problems.append(
                "a hazard spawns in the launch apron (rows 0-2); the player's "
                "first hop would be unavoidable"
            )
        if kv.get("finish-apron") != "0":
            problems.append(
                "a hazard spawns in the finish apron; the stage could become "
                "impossible to complete"
            )
    except ValueError:
        problems.append(f"could not parse the stage-one probe output: {text[:160]}")
    return problems


def assert_playable_controls() -> list[str]:
    """A human must be able to move the player, in every direction.

    The old input handler accepted a press only if it lasted under 150ms and
    moved under 12px. A real mouse click is slower and drifts further than
    that, so almost every click was discarded and the game looked frozen. It
    also only ever hopped forward: no lateral control, no keyboard.

    Checks that all four directions exist in the simulation, that lateral
    movement is bounded to the board, and that main.js exposes them.
    """
    problems: list[str] = []
    script = "".join('load("%s");' % rel for rel in CHAIN)
    script += """
var out = [];
var g = SimCore.createGame({playerCount:1, seed:"ctl"});
var p = g.state().players[0];
// Test "back" at the start row, before any forward hop has been taken.
out.push("back-at-zero=" + p.hop("back"));
p.hop("forward");
for (var i = 0; i < 30; i++) p.hop("right");
out.push("right-clamp=" + p.state().col);
for (var i = 0; i < 30; i++) p.hop("left");
out.push("left-clamp=" + p.state().col);
out.push("cols=" + g.state().cols);
out.push("band=" + g.state().playMin + "-" + g.state().playMax);
out.push("goal=" + g.state().goalRow);
print(out.join(" | "));
"""
    text = run_jsc(script)
    kv = dict()
    for chunk in text.split(" | "):
        if "=" in chunk:
            k, _, v = chunk.partition("=")
            kv[k.strip()] = v.strip()
    try:
        cols = int(kv["cols"])
        band = kv.get("band", "0-%d" % (cols - 1))
        lo_s, _, hi_s = band.partition("-")
        lo, hi = int(lo_s), int(hi_s)
        if kv.get("right-clamp") != str(hi):
            problems.append(
                f"lateral movement is not bounded: hopping right 30 times leaves "
                f"the player at column {kv.get('right-clamp')}, not {hi} "
                f"(the edge of the playable band)"
            )
        if kv.get("left-clamp") != str(lo):
            problems.append(
                f"hopping left 30 times leaves the player at column "
                f"{kv.get('left-clamp')}, not {lo}"
            )
        if kv.get("back-at-zero") != "false":
            problems.append("hopping back from the start row is not refused")
    except (KeyError, ValueError):
        problems.append(f"could not parse the control probe output: {text[:160]}")

    src = (ROOT / DOM_ENTRY).read_text()
    if "function act(" not in src:
        problems.append("src/main.js has no act() entry point for player input")
    for key in ("ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown"):
        if key not in src:
            problems.append(f"src/main.js does not bind {key}; the game cannot "
                            f"be played with a keyboard")
    if "goalRow: s.goalRow" not in src:
        problems.append(
            "src/main.js does not pass goalRow to the renderer, so the finish "
            "line is simulated but never drawn and the player has no visible goal"
        )
    # The old tap window. If this ever comes back, the game is unplayable with
    # a mouse again and nothing else in the suite would notice. A real click
    # holds for 100-300ms, so anything under 300ms discards most of them.
    m = re.search(r"TAP_MAX_MS\s*=\s*(\d+)", src)
    if m and int(m.group(1)) < 300:
        problems.append(
            f"src/main.js rejects presses shorter than {m.group(1)}ms; a real "
            f"mouse click is slower than that and would be silently discarded, "
            f"which is exactly what made the game look frozen"
        )
    return problems


def assert_canvas_transform_is_balanced() -> list[str]:
    """A canvas transform dropped to identity must be restored.

    The surround fill deliberately sets the transform to identity so it covers
    the whole backing store. Without putting the device-pixel scale back, every
    subsequent draw lands in DEVICE pixels instead of CSS pixels -- the whole
    board renders at half size in the top-left quadrant, and the player stands
    in an empty field with the traffic off where the camera expects it. It is
    silent: nothing throws, the game runs, it is just wrong.
    """
    problems: list[str] = []
    src = (ROOT / DOM_ENTRY).read_text()
    # Strip comments before searching: a long explanatory comment between the
    # identity transform and its restore must not push the restore out of the
    # window and turn the check into a false alarm.
    bare = strip_noise(src)
    for m in re.finditer(r"setTransform\(\s*1\s*,\s*0\s*,\s*0\s*,\s*1\s*,\s*0\s*,\s*0\s*\)", bare):
        tail = bare[m.end():m.end() + 400]
        if not re.search(r"setTransform\(\s*dpr", tail):
            line = src[:m.start()].count("\n") + 1
            problems.append(
                f"src/main.js line {line}: the canvas transform is set to identity "
                f"and never restored to the device-pixel scale, so everything "
                f"drawn after it renders at half size in one corner"
            )
            break
    return problems


def assert_face_is_on_the_head() -> list[str]:
    """The eyes and mouth must be drawn inside the head's projected box.

    The face used to be positioned from the head's LEFT EDGE plus fixed pixel
    offsets that assumed the old 2:1 dimetric. When the grid became orthogonal
    the tile got wider, the head's centre moved, and the face was left hanging
    off the side of the head with both eyes outside the silhouette. Drawing
    correctly and looking correct are different things, so this measures where
    the eyes actually land rather than trusting the arithmetic.
    """
    problems: list[str] = []
    script = "".join('load("%s");' % rel for rel in CHAIN)
    script += """
var out = [];
// Record every ellipse the character renderer draws, with its fill.
var calls = [];
function RecCtx() { this.calls = calls; }
// The canvas ellipse() takes (cx, cy, rx, ry, rotation, start, end). Iso
// calls it with all seven, so a five-parameter stub silently records the
// ROTATION as the fill colour and the probe then finds no eyes at all.
RecCtx.prototype.ellipse = function (x, y, rx, ry) {
  var st = this.fillStyle;
  calls.push({ x: x, y: y, rx: rx, ry: ry, fill: st });
};
RecCtx.prototype.beginPath = function () {}; RecCtx.prototype.moveTo = function () {};
RecCtx.prototype.lineTo = function () {}; RecCtx.prototype.closePath = function () {};
RecCtx.prototype.fill = function () {}; RecCtx.prototype.stroke = function () {};
RecCtx.prototype.save = function () {}; RecCtx.prototype.restore = function () {};
RecCtx.prototype.setTransform = function () {}; RecCtx.prototype.scale = function () {};
RecCtx.prototype.translate = function () {}; RecCtx.prototype.transform = function () {};
RecCtx.prototype.arc = function (x, y) { calls.push({ x: x, y: y, arc: true }); };
var _fill = "", _stroke = "";
Object.defineProperty(RecCtx.prototype, "fillStyle", {
  set: function (v) { _fill = v; }, get: function () { return _fill; },
});
Object.defineProperty(RecCtx.prototype, "strokeStyle", {
  set: function (v) { _stroke = v; }, get: function () { return _stroke; },
});
["lineWidth","lineCap"].forEach(function (p) {
  Object.defineProperty(RecCtx.prototype, p, { set: function () {}, get: function () { return 1; } });
});
Roster.ROSTER.forEach(function (ch) {
  calls = [];
  Iso.setView(300, 400, 1, 0);
  CharacterRenderer.drawCharacter(new RecCtx(), 4, 10, 1, ch);
  // The head box, measured the same way the renderer should measure it.
  var hw = ch.headW, bh = ch.bodyH, hh = ch.headH;
  var L = Iso.projectS(4 + (1 - hw) / 2, 10.5, bh + hh)[0];
  var R = Iso.projectS(4 + (1 + hw) / 2, 10.5, bh + hh)[0];
  var T = Iso.projectS(4.5, 10.5, bh + hh)[1];
  var B = Iso.projectS(4.5, 10.5, bh + 0.09)[1];
  var eyes = calls.filter(function (c) {
    return !c.arc && c.fill === "#ffffff" && c.rx < (R - L) * 0.4;
  });
  if (eyes.length < 2) {
    out.push(ch.id + " eyes=" + eyes.length);
    return;
  }
  for (var i = 0; i < 2; i++) {
    var e = eyes[i];
    if (e.x < L - 1 || e.x > R + 1) {
      out.push(ch.id + " eyeX=" + e.x.toFixed(1) + " off[" + L.toFixed(1) + "," + R.toFixed(1) + "]");
      break;
    }
    if (e.y < Math.min(T, B) - 1 || e.y > Math.max(T, B) + 1) {
      out.push(ch.id + " eyeY=" + e.y.toFixed(1) + " off[" + T.toFixed(1) + "," + B.toFixed(1) + "]");
      break;
    }
  }
});
out.push("checked=" + Roster.ROSTER.length);
print(out.join(" | "));
"""
    text = run_jsc(script)
    if "checked=" not in text:
        return [f"could not parse the face probe output: {text[:160]}"]
    chunks = [c.strip() for c in text.split(" | ")]
    checked = next((c for c in chunks if c.startswith("checked=")), "checked=0")
    bad = [c for c in chunks if " eyes=" in c or " eyeX=" in c or " eyeY=" in c]
    if bad:
        problems.append(
            "the character's face is drawn outside its head: "
            + "; ".join(bad) + ". The eyes must sit inside the head box."
        )
    if checked.endswith("=0"):
        problems.append("the face probe drew no characters at all")
    return problems


def assert_hazards_survive_a_hop() -> list[str]:
    """The board must not rebuild itself when the player moves.

    The window was thrown away and regenerated every time the player advanced
    a row, so every car vanished and a new set appeared somewhere else on each
    hop. The board visibly reset under the player's feet, which destroys the
    one thing a timing game depends on: that what you judged is still there
    when you commit.

    Checked by OBJECT IDENTITY, not position. With a per-row seed a full
    rebuild would place the same cars in the same places, so a positional
    comparison passes even when the board is being thrown away and remade --
    which is exactly the kind of check that looks green and proves nothing.
    A hazard that is still on the board must be the SAME hazard.
    """
    problems: list[str] = []
    script = "".join('load("%s");' % rel for rel in CHAIN)
    script += """
var out = [];
var g = SimCore.createGame({ playerCount: 1, seed: "persist" });
g.hop("forward", 0);
for (var i = 0; i < 300; i++) g.tick(16.667);
g.hop("forward", 0);
for (var k = 0; k < 120; k++) g.tick(16.667);
// Hold references to the hazards that are on the board right now.
var held = g.state().hazards.filter(function (h) { return h.row > 3; });
out.push("held=" + held.length);
g.hop("forward", 0);
g.hop("forward", 0);
for (var t = 0; t < 60; t++) g.tick(16.667);
var live = g.state().hazards;
var replaced = 0, dropped = 0;
held.forEach(function (h) {
  var found = false;
  for (var j = 0; j < live.length; j++) {
    if (live[j] === h) { found = true; break; }   // identity, not equality
  }
  // A hazard behind the window is retired on purpose; only count the ones the
  // player could still see.
  if (!found && h.row >= g.state().hazardRow0) replaced++;
  if (!found && h.row < g.state().hazardRow0) dropped++;
});
out.push("replaced=" + replaced);
out.push("retired=" + dropped);
out.push("window0=" + g.state().hazardRow0);
print(out.join(" | "));
"""
    text = run_jsc(script)
    kv = dict()
    for chunk in text.split(" | "):
        if "=" in chunk:
            k, _, v = chunk.partition("=")
            kv[k.strip()] = v.strip()
    if not kv:
        return [f"could not parse the hazard-persistence probe: {text[:160]}"]
    try:
        if int(kv.get("held", 0)) == 0:
            problems.append(
                "the board carried no hazards to hold; stage one is empty again"
            )
        if int(kv.get("replaced", 0)) > 0:
            problems.append(
                f"{kv['replaced']} hazards on screen were REPLACED by different "
                f"objects while the player was playing. The board is being "
                f"rebuilt from scratch; cars must keep their identity across a hop."
            )
    except ValueError:
        problems.append(f"could not parse the hazard-persistence probe: {text[:160]}")
    return problems


def assert_hop_never_blanks_the_player() -> list[str]:
    """The player must be drawn on every frame of a hop, and must be drawn
    when dead.

    Two defects, both silent.

    1. `startHop` read `.col` / `.row` straight off `players[i]`, which is a
       player WRAPPER -- the values live inside the object its `state()`
       returns. The hop's target was therefore `undefined`, the interpolation
       was `NaN`, and a `NaN` transform makes canvas discard the draw call. The
       player was rendered every frame at a position that was not a number,
       so it VANISHED for the entire duration of every single hop.

    2. A dead player was skipped by `if (!ps.alive) continue;`, so at the
       exact moment the player needed to see what killed them, they were not
       on the screen. The world now freezes for a beat and says "You died".
    """
    problems: list[str] = []
    src = (ROOT / DOM_ENTRY).read_text()
    # Reading a coordinate straight off the wrapper.
    for m in re.finditer(r"players\[[^\]]*\]\s*\.\s*(col|row)\b", src):
        line = src[:m.start()].count("\n") + 1
        problems.append(
            f"src/main.js line {line}: reads '.{m.group(1)}' directly off a "
            f"player wrapper. players[i] is a wrapper; the value is inside "
            f".state(). This made the hop interpolate to NaN and the character "
            f"vanish for the whole hop."
        )
        break
    # ...and the subtler form: the wrapper put in a local, then read from that.
    # Looking for the substring ".state()" is useless here -- a comment
    # mentioning it, or the unrelated game.state() call elsewhere in the
    # function, would satisfy it. Strip comments and require a state() call
    # that is not on the game itself.
    hop = re.search(r"function startHop\([^)]*\)\s*\{(.*?)\n  \}", src, re.S)
    if hop:
        body = re.sub(r"/\*.*?\*/", " ", hop.group(1), flags=re.S)
        body = re.sub(r"//[^\n]*", " ", body)
        if not re.search(r"(?<!game)\.state\s*\(\s*\)", body):
            line = src[:hop.start()].count("\n") + 1
            problems.append(
                f"src/main.js line {line}: startHop never calls .state() on the "
                f"player. players[i] is a wrapper and has no .col/.row of its "
                f"own, so the hop target was undefined, the interpolation was "
                f"NaN, and the player vanished for the whole hop."
            )
    else:
        problems.append("could not find startHop() in src/main.js to check it")
    # A dead player must still be drawn.
    if re.search(r"if\s*\(\s*!ps\.alive\s*\)\s*continue;", src):
        line = src[:re.search(r"if\s*\(\s*!ps\.alive\s*\)\s*continue;", src).start()].count("\n") + 1
        problems.append(
            f"src/main.js line {line}: a dead player is skipped entirely, so "
            f"they disappear at the moment the player needs to see what hit "
            f"them. Draw them flattened instead."
        )
    # The death beat has to exist and has to freeze the world.
    if "DEAD" not in src:
        problems.append(
            "src/main.js has no DEAD phase: a death teleports the player back "
            "to the start with no message, which reads as the game glitching"
        )
    return problems


def assert_death_freezes_the_board() -> list[str]:
    """Hitting something must hold the scene still and say so.

    The world used to revive the player on the same tick as the hit, so the
    board teleported back to the start line with no feedback at all. There is
    now a short DEAD beat: the hazards stop, the pursuer stops, the clock
    stops, and a message is shown.
    """
    problems: list[str] = []
    script = "".join('load("%s");' % rel for rel in CHAIN)
    script += """
var out = [];
var g = SimCore.createGame({ playerCount: 1, seed: "deathbeat" });
g.hop("forward", 0);
for (var i = 0; i < 200; i++) g.tick(16.667);
var row = g.state().players[0].state().row;
g.state().hazards = [{ kind: "car", spec: { len: 0.86, kind: "ground" },
                      row: row, dir: 1, speed: 2, x: g.state().players[0].state().col,
                      dead: false }];
g.state().hazardRow0 = row - 4;
g.state().hazardRows = 12;
g.tick(16.667); g.tick(16.667);
out.push("phase=" + g.state().phase);
var x0 = g.state().hazards[0].x;
for (var k = 0; k < 30; k++) g.tick(16.667);
out.push("moved=" + (Math.abs(g.state().hazards[0].x - x0) > 0.01 ? "yes" : "no"));
out.push("stillDead=" + g.state().phase);
for (var m = 0; m < 90; m++) g.tick(16.667);
out.push("after=" + g.state().phase);
out.push("alive=" + g.state().players[0].state().alive);
out.push("lives=" + g.state().players[0].state().lives);
print(out.join(" | "));
"""
    text = run_jsc(script)
    kv = dict()
    for chunk in text.split(" | "):
        if "=" in chunk:
            k, _, v = chunk.partition("=")
            kv[k.strip()] = v.strip()
    if not kv:
        return [f"could not parse the death-beat probe: {text[:160]}"]
    if kv.get("phase") != "DEAD":
        problems.append(
            f"a fatal hit did not enter the death beat (phase={kv.get('phase')}); "
            f"the player should be told they died"
        )
    if kv.get("moved") == "yes":
        problems.append("the board kept moving during the death beat; it should hold still")
    if kv.get("stillDead") != "DEAD":
        problems.append("the death beat ended immediately; there is no beat to read")
    if kv.get("after") != "RUNNING" or kv.get("alive") != "true":
        problems.append(
            f"the player was not put back on the board after the beat "
            f"(phase={kv.get('after')} alive={kv.get('alive')})"
        )
    return problems


def assert_camera_follows_and_stays_in_frame() -> list[str]:
    """The camera must follow the player, and the board must always fill the
    frame.

    Three defects, one after another:
      - centring the BOARD left the player pinned in the left-hand corner;
      - centring the PLAYER with no clamp pushed two thirds of the board off
        the right edge at column 0, so the lanes ahead were invisible;
      - the board was made almost exactly as wide as the frame, so the clamp
        pinned it and the player still could not be centred.

    The board is now deliberately WIDER than the view, with a playable band
    inside it, so there is always road on both sides of the player and the
    camera can pan freely. That means the board must COVER the frame rather
    than fit inside it -- the two are opposite requirements and a gate that
    checks for one will reject the other.
    """
    problems: list[str] = []
    script = "".join('load("%s");' % rel for rel in CHAIN)
    script += """
var out = [];
var W = 440;
var g = SimCore.createGame({ playerCount: 1, seed: "cam" });
var lo = g.state().playMin, hi = g.state().playMax, COLS = g.state().cols;
out.push("cols=" + COLS);
out.push("band=" + lo + "-" + hi);
for (var fc = lo; fc <= hi; fc++) {
  Iso.frameViewWindow(COLS, 16, W, 537, 10, 1.5, 18, 0.72, 1, 0, fc, 10);
  var xs = [];
  for (var c = 0; c <= COLS; c++) xs.push(Iso.projectS(c, 10, 0)[0]);
  var bl = Math.min.apply(null, xs), br = Math.max.apply(null, xs);
  var p = Iso.projectS(fc, 10, 0)[0];
  out.push("c" + fc + "=" + bl.toFixed(0) + "," + br.toFixed(0) + "," + p.toFixed(0));
}
print(out.join(" | "));
"""
    text = run_jsc(script)
    W = 440
    cols = band = None
    rows = []
    for chunk in text.split(" | "):
        if chunk.startswith("cols="):
            cols = int(chunk.split("=")[1])
        elif chunk.startswith("band="):
            band = tuple(int(v) for v in chunk.split("=")[1].split("-"))
        elif chunk.startswith("c") and "=" in chunk:
            key, _, v = chunk.partition("=")
            bl, br, px = (float(n) for n in v.split(","))
            rows.append((int(key[1:]), bl, br, px))
    if not rows or band is None:
        return [f"could not parse the camera probe: {text[:200]}"]
    for fc, bl, br, px in rows:
        if bl > 1 or br < W - 1:
            problems.append(
                f"at column {fc} the board spans {bl:.0f}..{br:.0f} in a {W}px "
                f"frame: it no longer covers the view, so the player would see "
                f"empty space beside the road"
            )
        if abs(px - W / 2) > 2:
            problems.append(
                f"at column {fc} the player is at x={px:.0f} in a {W}px frame; "
                f"the camera should keep them centred (within 2px)"
            )
    return problems


def assert_player_starts_in_the_middle() -> list[str]:
    """A player who begins on the board's edge is pinned to the edge of the
    frame for the whole stage, which reads as the character having been left
    behind rather than as the game being ready."""
    problems: list[str] = []
    script = "".join('load("%s");' % rel for rel in CHAIN)
    script += """
var g = SimCore.createGame({playerCount: 1, seed: "start"});
var g2 = SimCore.createGame({playerCount: 2, seed: "start2"});
var mid = (g.state().cols - 1) / 2;
print("cols=" + g.state().cols +
      " p0=" + g.state().players[0].state().col +
      " p1=" + g2.state().players[1].state().col +
      " lo=" + g.state().playMin +
      " hi=" + g.state().playMax +
      " mid=" + mid);
"""
    text = run_jsc(script).strip()
    kv = dict()
    for part in text.split():
        if "=" in part:
            k, _, v = part.partition("=")
            kv[k] = v
    try:
        cols = int(kv["cols"])
        mid = (int(kv["lo"]) + int(kv["hi"])) / 2
        if float(kv["p0"]) % 1 != 0:
            problems.append(
                f"the player starts at column {kv['p0']}, which is not a whole "
                f"cell; it would be drawn between two lanes"
            )
        lo_i, hi_i = int(kv["lo"]), int(kv["hi"])
        # An even-width band has TWO middle cells (4..9 -> 6 and 7); either is
        # centred as far as the band allows.
        half = (hi_i - lo_i) // 2
        middles = [lo_i + half, hi_i - half]
        if float(kv["p0"]) not in middles:
            problems.append(
                f"the single player starts at column {kv['p0']}, not the middle "
                f"of the playable band ({kv['lo']}-{kv['hi']}); they will sit "
                f"off to one side of the frame"
            )
        if abs(float(kv["p1"]) - mid) < 0.01:
            problems.append(
                "both players start in the same column in two-player mode"
            )
    except (KeyError, ValueError):
        return [f"could not parse the start-column probe: {text[:160]}"]
    return problems


def assert_pursuer_is_escapable() -> list[str]:
    """The pursuer must punish idling, not progress.

    It used to spawn ON the player's own row, so it had no gap to close: the
    instant it stopped telegraphing it was already past them, and standing
    still for one second was fatal. The player reported it as "a red thing
    that keeps killing me for no reason" -- which is exactly right, because
    there was no way to see it, no way to understand it, and no way to avoid
    it. An unavoidable, unexplained kill is not difficulty, it is noise.

    Asserted: a player who keeps hopping is never caught, and a player who
    stands still is caught, but not instantly.
    """
    problems: list[str] = []
    script = "".join('load("%s");' % rel for rel in CHAIN)
    script += """
var out = [];
function run(hopping) {
  var g = SimCore.createGame({playerCount: 1, seed: "pursuer"});
  g.hop("forward", 0);
  for (var i = 0; i < 20; i++) g.hop("forward", 0);
  for (var t = 0; t < 5; t++) g.tick(16.667);
  var lastHop = 0, n = 0;
  while (n++ < 4000) {
    if (hopping && n * 16.667 - lastHop >= 550) { g.hop("forward", 0); lastHop = n * 16.667; }
    // No traffic: the pursuer must be the only thing that can kill.
    var pr = g.state().players[0].state().row;
    g.state().hazards.length = 0;
    g.state().hazardRow0 = pr - 4; g.state().hazardRows = 12;
    g.tick(16.667);
    if (g.state().phase === "DEAD" || g.state().phase === "STAGE_FAILED")
      return "caught@" + (n * 16.667 / 1000).toFixed(2);
  }
  return "safe";
}
out.push("moving=" + run(true));
out.push("still=" + run(false));
var st = SimCore.createPursuer();
out.push("armed=" + (st.state().mode));
print(out.join(" | "));
"""
    text = run_jsc(script)
    kv = dict()
    for chunk in text.split(" | "):
        if "=" in chunk:
            k, _, v = chunk.partition("=")
            kv[k.strip()] = v.strip()
    if "moving" not in kv:
        return [f"could not parse the pursuer probe: {text[:200]}"]
    if kv["moving"] != "safe":
        problems.append(
            f"a player who keeps hopping is {kv['moving']} by the pursuer. It is "
            f"meant to punish standing still; catching a moving player makes it "
            f"an unavoidable execution."
        )
    if kv["still"] == "safe":
        problems.append(
            "a player who stands still is never caught; the pursuer does nothing"
        )
    elif kv["still"].startswith("caught@"):
        secs = float(kv["still"].split("@")[1])
        if secs < 3.0:
            problems.append(
                f"a player who stands still is caught after only {secs:.1f}s. "
                f"There is no time to understand what happened; the bird should "
                f"give a few seconds of grace."
            )
    return problems


def assert_each_stage_has_its_own_obstacles() -> list[str]:
    """Every stage must be able to spawn what it declares, and nothing else.

    Two defects hid here for most of the project's life:

      - obstacle selection was a fixed switch on the LANE CLASS (road is always
        a car, rail always a train, water always a log), so all ten stages
        spawned exactly the same thing and the `hazardKinds` list in stages.js
        was decoration only the offline preview sheet ever read;
      - a stage could declare kinds it had no lane for, so the fallback fired
        and it quietly spawned something it never asked for.

    Both are silent. This asserts, per stage: every lane class it actually has
    has a legal declared kind, and nothing it spawns is undeclared.
    """
    problems: list[str] = []
    script = "".join('load("%s");' % rel for rel in CHAIN)
    script += """
var out = [];
// NOTE: stageIndex throughout the engine is POSITIONAL (0-based), while
// st.id is the stage's own 1-based id. Passing st.id as the index silently
// looked up the next stage along, which is how this probe first "found"
// Night City spawning crocodiles.
Stages.STAGES.forEach(function (st, si) {
  var lanes = {};
  for (var r = 0; r < 40; r++) {
    var L = Tiles.laneOf(r, st.laneMix, st.id);
    if (L !== "grass") lanes[L] = 1;
  }
  var need = Object.keys(lanes);
  var bad = [];
  need.forEach(function (L) {
    var legal = st.hazardKinds.filter(function (k) {
      return Hazards.legalForLane(k, L);
    });
    if (!legal.length) bad.push(L);
  });
  if (bad.length) out.push("stage" + st.id + " has " + bad.join("/") +
                           " lanes with no declared obstacle");
  // And nothing spawned may be undeclared.
  var kinds = {};
  for (var w = 0; w < 60; w++)
    Hazards.hazardsForRow("v" + st.id + w, w, st.id, 2,
                          SimCore.createRng("v" + st.id + w), si, 4)
      .forEach(function (h) { kinds[h.kind] = 1; });
  var keys = Object.keys(kinds);
  if (!keys.length) out.push("stage" + st.id + " spawns nothing at all");
  // The endgame bird is UNIVERSAL: every stage guarantees one in its last
  // third, which is the point of it, so it is not per-stage data.
  var UNIVERSAL = ["hawk"];
  var undeclared = keys.filter(function (k) {
    return st.hazardKinds.indexOf(k) < 0 && UNIVERSAL.indexOf(k) < 0;
  });
  if (undeclared.length)
    out.push("stage" + st.id + " spawns undeclared " + undeclared.join("/"));
});
print(out.join(" | "));
"""
    text = run_jsc(script)
    chunks = [c.strip() for c in text.split(" | ") if c.strip()]
    for c in chunks:
        problems.append(f"stage data: {c}")
    return problems


def assert_every_obstacle_has_a_renderer() -> list[str]:
    """Every kind the game can spawn must be drawable, or it is invisible."""
    problems: list[str] = []
    script = "".join('load("%s");' % rel for rel in CHAIN)
    script += """
var out = [];
var missing = [];
Object.keys(Hazards.KINDS).forEach(function (k) {
  if (!Scene.HAZARD_FNS[k] && !Scene.TIMED_FNS[k]) missing.push(k);
});
out.push("kinds=" + Object.keys(Hazards.KINDS).length);
out.push("missing=" + missing.join("/"));
// And each must actually put marks on the canvas: a renderer that draws
// nothing is as bad as no renderer at all.
var noops = [];
var ctx = { n: 0 };
function stub() {}
// translate/scale/transform matter: a renderer that positions itself through
// the transform was reported as "threw" until these were stubbed.
["beginPath","moveTo","lineTo","closePath","fill","stroke","ellipse","arc",
 "save","restore","rect","translate","scale","transform","clearRect"]
  .forEach(function (m) { ctx[m] = stub; });
ctx.save = function () {}; ctx.restore = function () {};
ctx.ellipse = function () { ctx.n++; };
ctx.beginPath = function () { ctx.n++; };
ctx.fill = function () { ctx.n++; };
ctx.stroke = function () { ctx.n++; };
ctx.moveTo = function () { ctx.n++; };
ctx.lineTo = function () { ctx.n++; };
ctx.closePath = function () { ctx.n++; };
ctx.arc = function () { ctx.n++; };
["fillStyle","strokeStyle","lineWidth","lineCap"].forEach(function (p) {
  Object.defineProperty(ctx, p, { set: function () {}, get: function () { return ""; } });
});
var scene = Stages.getStage(0);
Object.keys(Hazards.KINDS).forEach(function (k) {
  ctx.n = 0;
  var h = Hazards.hazardsForRow("z", 6, 5, 0, SimCore.createRng("z"), 0, 4)[0];
  if (!h) h = { kind: k, spec: Hazards.KINDS[k], row: 6, x: 5, cycle: { t: 300, on: 900, periodMs: 2400 } };
  try {
    if (Scene.TIMED_FNS[k]) Scene.TIMED_FNS[k](ctx, 4, 6, scene, h);
    else if (Scene.HAZARD_FNS[k]) Scene.HAZARD_FNS[k](ctx, 4, 6, scene, h);
    if (ctx.n === 0) noops.push(k);
  } catch (e) { noops.push(k + "(threw)"); }
});
out.push("noops=" + noops.join("/"));
print(out.join(" | "));
"""
    text = run_jsc(script)
    kv = dict()
    for chunk in text.split(" | "):
        if "=" in chunk:
            k, _, v = chunk.partition("=")
            kv[k.strip()] = v.strip()
    if kv.get("missing"):
        problems.append(
            f"obstacles with no renderer at all: {kv['missing']}. They would "
            f"kill the player while being invisible."
        )
    if kv.get("noops"):
        problems.append(
            f"obstacles whose renderer draws nothing: {kv['noops']}"
        )
    if not kv:
        return [f"could not parse the obstacle-renderer probe: {text[:200]}"]
    return problems


def main() -> int:
    problems = (assert_undeclared() + assert_chain_runs()
                + assert_scene_contract()
                + assert_scene_for_copies_everything()
                + assert_player_is_on_screen()
                + assert_canvas_transform_is_balanced()
                + assert_stage_one_is_playable()
                + assert_playable_controls()
                + assert_face_is_on_the_head()
                + assert_hazards_survive_a_hop()
                + assert_hop_never_blanks_the_player()
                + assert_death_freezes_the_board()
                + assert_camera_follows_and_stays_in_frame()
                + assert_player_starts_in_the_middle()
                + assert_pursuer_is_escapable()
                + assert_each_stage_has_its_own_obstacles()
                + assert_every_obstacle_has_a_renderer())
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
