# Multi-agent setup

How to work on this game with more than one AI. Written for an agent that has
never seen this repository and has no memory of the session that built it.

**Current 3D handoff:** the primary scene now renders existing glTF/GLB models
with vendored Three.js in `src/render/world3d.js`. The 2D canvas remains a
fallback. All shipped model dependencies and licence notices are included;
the external asset library is not needed to run a clone. Start with
[MINIMAX-HANDOFF.md](../MINIMAX-HANDOFF.md) and
[`assets/models/manifest.json`](../assets/models/manifest.json).
The original machine/tooling notes below are historical context, not clone prerequisites.

---

## What this project is

| | |
|---|---|
| **Engine** | Vanilla simulation JavaScript and vendored Three.js; no framework, bundler or npm installation |
| **Rendering** | Primary WebGL 3D; isometric Canvas 2D fallback |
| **Build step** | None. Serve the repository over HTTP for modules and glTF resources |
| **Modules** | Classic script order is load-bearing; native 3D modules use HTML import maps |
| **Runs at** | `python3 -m http.server 4173 --bind 127.0.0.1`, then `http://127.0.0.1:4173/` |
| **Verification** | `bash tools/run_all.sh`; real browser inspection additionally verifies 3D appearance |

Read `AGENTS.md` first. It holds the invariants and the traps. This file covers
only the multi-agent workflow.

---

## Who does what

The division below is deliberate. Splitting it wrong is how a project ends up
with five agents editing the same file and no agent able to tell whether the
result renders.

| Owner | Owns | Never touches |
|---|---|---|
| **Primary agent** (this session's tooling) | `src/sim-core.js`, `src/hazards.js`, `src/stages.js`, `src/tiles.js` — the simulation and its rules | Visual composition |
| **Visual agent** | `src/render/*`, `src/scenery.js`, palette, lighting, composition | Simulation rules, physics, difficulty |
| **Asset librarian** | `/Users/mac/.minimax/asset-library` — finding art, contact sheets, licence status | Any game source file |

**The rule that prevents conflict: the simulation owns positions, the renderer
owns pixels.** They communicate through state only. A renderer change must never
alter a collision outcome, and a simulation change must never require the
renderer to know anything new.

---

## Files every agent must read before editing

1. `AGENTS.md` — architecture, invariants, verification gate, traps
2. `assets/models/manifest.json` and `docs/ASSET-SELECTION.md` — current model mapping and rights evidence; `ASSET-MANIFEST.md` inventories the legacy fallback
3. `docs/SPEC-AMENDMENT-001-shipped-product.md` — what the game actually is
4. `docs/SPEC-AMENDMENT-002-library-3d.md` — current presentation, scoring and Endless changes

---

## Handoff protocol

Before an agent changes anything:

```bash
git status --porcelain     # must be empty, or know why it is not
python3 tools/playtest.py 10   # must say RESULT: NO ERRORS
```

After:

```bash
python3 tools/playtest.py 10   # again. Non-zero forward-only clear rate.
git commit -m "what changed and why it is observable"
```

**A change that cannot be observed by the gate is not a verified change.** The
gate proves structure — sprites resolve, `main.js` boots 600 frames, 960 render
frames draw without a non-finite coordinate, and a naive bot can still finish a
stage. It does **not** prove appearance. A real browser verifies lighting,
clipping and animation; reviewed baselines are in `docs/verification/library-3d/`.

---

## Seeing the game — this is now possible

```bash
export PATH="$HOME/.local/node/bin:$PATH"
python3 -m http.server 8765 --bind 127.0.0.1     # from the project root
node tools/shoot.js http://localhost:8765/select.html /tmp --play
```

Captures the picker and gameplay frames into `/tmp/shot_*.png`, reports any
console or page error, and prints a pixel histogram of the canvas
(`min`/`max`/`mean`/`distinctBuckets`). A canvas with fewer than four distinct
colour buckets is a broken frame wearing a clean render's clothes — which is
the one failure a draw-call count cannot catch.

**Historical source-machine setup:** Node and Playwright were installed locally,
not system-wide. Check actual availability on a new machine; these paths are
not portable requirements:

| | |
|---|---|
| Node 22.14.0 | `~/.local/node` — remove the folder to uninstall |
| Playwright + Chromium | `~/.local/pw` |
| add to PATH | `export PATH="$HOME/.local/node/bin:$PATH"` |

Both are free, need no account, and touch nothing outside `~/.local`.

### What having eyes changed

The first screenshot showed the game running, with **all 24 roster sprites
rendering cleanly over the board** — no opaque box behind any character, which
was the very first bug this project had. It also showed the board is legible,
the HUD correct, the death beat working, and traffic rendering as intended.

It could not have shown any of that before. The structural gate reports
"24/24 sprites resolved, main.js booted 600 frames, no errors" for a game that
renders a black screen just as happily as one that renders a scene.

**Rule going forward:** a visual change is verified with a picture, or it is
reported as unverified. `RESULT: NO ERRORS` is not evidence of appearance.

---

## Verifying before installing anything

The original source-machine inventory recorded:

```
git      /usr/bin/git              present
python3  /usr/bin/python3          present
gh       /Users/mac/bin/gh         present (NOT authenticated)
node     ~/.local/node  v22.14.0   INSTALLED (local, not system)
npm      ~/.local/npm-global       INSTALLED
playwright-mcp  ~/.local/npm-global  registered in ~/.minimax/mcp.json
context7         MCP remote        registered
gemini-cli 0.63.0                 installed, needs your Google login
brew     -- not present --
```

Full inventory, with removal instructions: `~/.minimax/toolchain.md`.
MCP servers load at session start, so `playwright` and `context7` tools appear
in a new session rather than the one that registered them.

An agent asked to "install the tooling" should check this list before
downloading anything, and should confirm with the owner before installing a
paid service, creating an account, or adding credentials.

Do not assume a tool is present. Do not install paid services. Do not create
external accounts. Do not put API keys in files.

---

## External asset library

```
/Users/mac/.minimax/asset-library/
```

114,852 indexed 2D images, 1,909 3D models, 791 animation clips. Query it with:

```bash
python3 tools/gamekit-agent/gamekit.py doctor .
python3 tools/gamekit-agent/gamekit.py status
python3 tools/gamekit-agent/gamekit.py search tree
```

See `tools/gamekit-agent/QUICKSTART.md` for configurable library/cache roots.
Discovery is optional; the current game uses its included assets. Do not
regenerate art or re-import the library for an as-is migration.

**Do not generate placeholder art when it holds something suitable.** If
nothing fits, say so — that is a better outcome than a fabricated asset.

**Library licensing varies.** The old 2D catalogue marks its records `unverified`;
pack counts and terms can change. Check each chosen file's evidence. The shipped
3D selection retains CC0/MIT notices and per-file provenance in `assets/models/`.
