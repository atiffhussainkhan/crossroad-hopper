# Hopper handoff for Minimax

This repository contains the complete current game. Continue from these files
as they are; preserve gameplay and existing artwork unless the user requests a
change. Read `AGENTS.md`, then the two spec amendments listed below.

## Run a clone

From the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`. `select.html` chooses a character; `assets.html`
previews the selected 3D models. A direct preview is
`http://127.0.0.1:4173/index.html?char=3&stage=1`; stage previews accept 1–10.

There is no npm installation or build step. All runtime files are committed:
Three.js under `vendor/three/`, 85 selected models with their buffer/texture
dependencies under `assets/models/`, and the legacy fallback sprites. The
external Image library, library-agent tooling and original local filesystem
paths are not needed to run the game. Serve HTTP; do not rely on `file://`.
Use a modern WebGL2 browser for 3D. The canvas renderer is a fallback if WebGL
cannot initialise.

## Files to understand

| Path | Responsibility |
| --- | --- |
| `src/stages.js`, `src/tiles.js` | Ten stage definitions and the single source of truth for lane type. |
| `src/hazards.js`, `src/sim-core.js` | Hazard generation, fixed-step movement, collision, scoring, lives and campaign/Endless transitions. |
| `src/main.js` | Real input handlers, HUD, loop and presentation poses. |
| `src/render/world3d.js` | Model loading, fitting, orientation, animation, shadows and camera. Reads simulation state. |
| `src/render/model-gallery.js` | Live model previews in picker and gallery. |
| `src/render/iso.js`, `scene.js`, `character.js`, `sprite.js`, `deathfx.js` | Legacy canvas fallback. |
| `assets/models/manifest.json` | Character, hazard and scenery mapping, scale/orientation and animation names. |
| `assets/models/provenance.json`, `assets/models/licenses/` | Per-file hashes, original source evidence and preserved licence notices. |
| `docs/SPEC-AMENDMENT-001-shipped-product.md` | Campaign rules. |
| `docs/SPEC-AMENDMENT-002-library-3d.md` | Current 3D presentation, forward scoring and Endless changes; takes precedence where amended. |
| `docs/ASSET-SELECTION.md` | Actual selected models and documented subject substitutions. |

Keep classic script load order intact. Add classic modules to both `index.html`
and the headless harness when needed. Native WebGL modules use HTML import maps
and must stay outside the classic JavaScriptCore/Node bundle.

## Verify changes

Tools require Python 3.10+, Pillow for real fallback image dimensions, and
JavaScriptCore or Node.js. On a non-macOS machine with Node installed:

```sh
python3 -m pip install Pillow
JS_ENGINE=node bash tools/run_all.sh
JS_ENGINE=node python3 tools/playtest.py 10 --seed 12345
```

`bash tools/run_all.sh` automatically uses JavaScriptCore where available, then
Node as the fallback. Set `NODE=/path/to/node` or `PYTHON=/path/to/python3` when
the executables are outside `PATH`. The complete suite covers model integrity,
scoring and Endless regressions, actual input handlers, rail warnings, stage
phases and 1,000 seeded campaigns.

Use a real browser after rendering changes. Inspect desktop and mobile views,
picker/gallery loading, transparent silhouettes, model sizes, smooth hops,
lane-entry warnings at both horizontal edges, two-player controls and a death
beat. The headless canvas stub does not produce WebGL pixels.

Reviewed visual baselines: [game scene](docs/verification/library-3d/hopper-3d-preview.jpg)
and [selected models](docs/verification/library-3d/selected-models-preview.jpg).

## Optional asset discovery

The portable helper in `tools/gamekit-agent/` searches an existing external
library when one is configured. It is separate from the game's runtime:

```sh
python3 tools/gamekit-agent/gamekit.py status
```

See `tools/gamekit-agent/QUICKSTART.md` for library/cache configuration. When
using that helper on a new clone, register the current project and rebuild its
local search index so registered model paths point at the new checkout:

```sh
python3 tools/gamekit-agent/gamekit.py register .
python3 tools/gamekit-agent/gamekit.py index
```

These commands are optional library administration, not steps needed to play
or verify the shipped game.

## Preserve these rules

- Simulation owns positions and collision. Fit visible hazard lengths to the
  same collision footprint; never move objects independently in the renderer.
- Accepted forward hops earn points. Waiting, sideways/backward and rejected
  moves do not. Stage ten clears before a fresh, active Endless board.
- Keep lane-type ownership, first-six-row opening traffic, 1200ms rail warnings,
  sprint-speed solvability, generated-row persistence and the 2100ms death freeze.
- Keep all shipped assets, licences and relative dependency paths. Provenance
  source paths are historical evidence, not runtime lookups.
- Do not generate replacement artwork or rerun the importer for this migration.
  The existing library selections are already included. Future asset swaps must
  use existing, suitable library files with their dependencies and rights evidence.
