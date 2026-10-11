# Hopper

A ten-stage lane-crossing browser game, rendered with actual 3D models from the existing [Image library](https://github.com/atiffhussainkhan/Image). No AI images are generated. Models keep their original geometry, materials and textures; their backgrounds are clear because they render directly in the scene with lighting, depth and contact shadows.

## Run locally

Use an HTTP server so the browser can load local modules and glTF models:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open <http://127.0.0.1:4173>. There is no build step or npm installation. The pinned Three.js runtime and all assets are included locally; no CDN is used. A modern browser with WebGL2 is required for 3D. The legacy canvas renderer remains a fallback when WebGL cannot initialise.

Run the command from the cloned repository root. The game is self-contained: the external Image library and original source-machine paths are not needed to play it. Direct `file://` opening is unsupported because modules and model resources need HTTP loading.

## Play

- Choose one of 24 real library characters in `select.html`.
- Tap the board or press Space to hop forward. Directional buttons, swipes, arrow keys and WASD move you.
- Reach the white line within 90 seconds, with four lives per stage.
- Traffic increases every 15 seconds. The final 15 seconds accelerate existing traffic.
- A collision pauses for a 2.1-second death beat; input skips it and restarts.
- Two-player mode shares the clock. Touch the corresponding half of the board; keyboard and buttons control the active player.
- Points count accepted forward hops. Waiting and lateral/backward movement earn nothing. Clearing stage ten opens Endless mode with live traffic, no clock and no finish line.

## Inspect the selected assets

Open `assets.html` for live 3D previews of every character, hazard and scenery selection. `docs/ASSET-SELECTION.md` records the choices and the closest available alternatives when the library has no exact subject. The picker names the models actually selected.

`assets/models/manifest.json` controls scale, orientation and model mapping. `assets/models/provenance.json` records original paths and SHA-256 hashes. Licences are in `assets/models/licenses/`; Three.js retains its MIT licence in `vendor/three/LICENSE`.

For visual inspection of a theme, use `index.html?char=1&stage=1` through `stage=10`. Ordinary links start the campaign on stage one.

## Verify

```sh
bash tools/run_all.sh
python3 tools/playtest.py 10 --seed 12345
```

The suite checks the actual simulation: lane fairness, rail telegraphs, 1,000 seeded campaigns, 24 fallback sprites, browser-layer inputs, forward scoring, Endless transitions, and model/dependency integrity. It uses JavaScriptCore when available, or Node.js in an equivalent global script context. Force Node with `JS_ENGINE=node`; set `NODE` to its path when absent from `PATH`.

Use Python 3.10+ for the tools. Install Pillow in the test environment with `python3 -m pip install Pillow` to check the actual fallback sprite dimensions. These test tools are not browser runtime dependencies.

Lighting, clipping and 3D presentation also require real browser inspection; the headless canvas stub does not rasterise a WebGL scene.

## Development

Read `AGENTS.md` before editing. The simulation owns positions and collisions; both renderers only read them. `docs/SPEC-AMENDMENT-001-shipped-product.md` defines the campaign, and `docs/SPEC-AMENDMENT-002-library-3d.md` records the current presentation and scoring changes. Earlier research and plans remain in `docs/` as historical records.

For another machine or coding agent, start with [MINIMAX-HANDOFF.md](MINIMAX-HANDOFF.md). Keep the shipped artwork and vendored runtime intact; no artwork regeneration or library re-import is required for this handoff.

Optional discovery tooling is in `tools/gamekit-agent/`; its [quickstart](tools/gamekit-agent/QUICKSTART.md) explains how to configure an existing external library. The game itself does not need that library or helper.
