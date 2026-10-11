# Multi-agent setup

How to work on this game with more than one AI. Written for an agent that has
never seen this repository and has no memory of the session that built it.

---

## What this project is

| | |
|---|---|
| **Engine** | None. Vanilla JavaScript, no framework, no bundler, no npm |
| **Rendering** | Canvas 2D, isometric projection (`Iso.projectS()` → `[x, y]`) |
| **Build step** | None. Open `index.html` and it runs |
| **Modules** | 12 `<script>` tags, **order is load-bearing** |
| **Runs at** | `http://localhost:8765/select.html` |
| **Verification** | `python3 tools/playtest.py 10` — headless, no browser needed |

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
2. `ASSET-MANIFEST.md` — load order, sprite paths, where art comes from
3. `docs/SPEC-AMENDMENT-001-shipped-product.md` — what the game actually is

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
stage. It does **not** prove appearance. Nothing in this repository can prove
appearance, because there is no browser here.

---

## The one capability gap

This is the single most important thing for a second agent to know.

**Nothing in the current toolchain can see the game render.** The headless gate
runs the canvas in JavaScriptCore, which records draw calls and rejects NaN —
it produces no pixels. The same applies to any other agent without a browser.

That gap is why the render audit could report "734 occlusion inversions"
inferred from geometry but never confirmed, and why a vignette could be
*structural* (finite coordinates, no throw) and still visually wrong.

**Closing it needs Playwright, which needs Node, which is not installed.** Until
then: when a change is visual, say so and ask for a screenshot. Do not report a
render as working because nothing threw.

---

## Verifying before installing anything

This environment currently has:

```
git      /usr/bin/git              present
python3  /usr/bin/python3          present
gh       /Users/mac/bin/gh         present (NOT authenticated)
node     -- NOT INSTALLED --
npm      -- NOT INSTALLED --
brew     -- not present --
```

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
L=/Users/mac/.minimax/asset-library
python3 $L/tools/gamekit.py doctor .        # what can this renderer display?
python3 $L/tools/image_search.py <terms>
python3 $L/tools/gamekit.py sheet scenery   # contact sheet of real pictures
```

**Do not generate placeholder art when it holds something suitable.** If
nothing fits, say so — that is a better outcome than a fabricated asset.

**Licensing is unresolved.** Every 2D record is `unverified`; 29 of 30 top-level
packs are CC0/MIT and are safe to ship; four user-supplied archives are excluded
from the import path on purpose. Rights are the owner's call, never an agent's.