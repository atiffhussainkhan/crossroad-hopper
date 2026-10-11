# Amendment 002 — existing library models and forward scoring

Date: 2026-10-10. The user requested existing library assets only, no generated
images, clear backgrounds, consistent sizes, and smooth movement.

The campaign rules and hazard fairness invariants in Amendment 001 remain
authoritative. These changes update presentation and correct demonstrated
scoring and lifecycle defects:

- `src/render/world3d.js` renders actual library meshes with an angled
  orthographic camera, lighting and depth occlusion. Models are normalised to
  character height or hazard footprint. Simulation still owns positions and
  hitboxes.
- `assets/models/manifest.json` maps all 24 character choices, every hazard,
  stage scenery and the pursuer to existing models. Exact matches are preferred;
  unavailable subjects have documented analogues. The picker names the actual
  selected character.
- No image generation or background-removal approximation is used. The 3D
  canvas is transparent; original geometry and texture alpha determine object
  edges. Stage ground remains an intentional 3D surface.
- `assets.html` and the picker show live previews, creating no raster assets.
  Source hashes and licences accompany the chosen models.
- P-13 is active: one point per accepted forward hop in campaign or Endless.
  Waiting, lateral/backward movement and rejected input score zero. The HUD
  does not count banked points twice.
- Stage ten enters `STAGE_CLEAR` first. Advancing opens a fresh Endless board
  with four lives, retaining campaign score. Endless inputs move players;
  deaths restart Endless rather than returning to campaign stage ten.
- Each player has an independent hop animation. Buttons, keyboard and swipes
  share one input path. Storage failure does not break selection: validated
  `?char=` carries it to gameplay.

The old canvas renderer and sprites remain a compatibility fallback and a
verified simulation harness. Native ES modules require HTTP serving. No build
system, backend, audio, economy or online leaderboard is introduced.

Verification combines repository gates with browser inspection. Headless tests
do not claim to prove GPU rendering.
