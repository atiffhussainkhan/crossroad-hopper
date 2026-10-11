# glTF → sprite pre-render  (PROTOTYPE, orientation unresolved)

**Historical fallback prototype.** The current game already renders selected
glTF/GLB models directly with vendored Three.js in `src/render/world3d.js`.
This prerender tool is not part of normal play or the current migration; do not
generate replacement sprite art for the handoff. See
[MINIMAX-HANDOFF.md](../../MINIMAX-HANDOFF.md) and
[`assets/models/manifest.json`](../../assets/models/manifest.json).

This prototype explored the earlier question: **can a real rigged 3D character
become 2D sprite frames the legacy canvas renderer draws?**

## Status

**Yes — the pipeline works. The orientation does not.**

`prerender.js` loads a KayKit `.glb` in headless Chromium with a WebGL context,
applies the texture, samples an animation clip across 8 turntable angles, and
writes one PNG strip. Verified against `Knight.glb`:

```
animations in rig : 76
clip used        : Idle
wrote            : proof-knight.png
```

Three.js is loaded from unpkg at **0.146.0** — `examples/js/loaders/` was removed
in later releases, which is why a 0.160 CDN URL 404s.

## What is NOT solved

**The character renders lying down.** The first output had a knight on its side;
rotating −90° about X made it head-down instead of upright.

The tell was the bounding box: `2.69 × 2.47 × 2.58` — a cube. A standing
humanoid is tall and thin. So the model is *not* in the orientation assumed, but
neither correction tried so far is the right one, and the camera framing is also
wrong (the model is small and off-centre in frame).

**Do not treat `proof-knight.png` as usable art.** It proves the *mechanism*
works — glTF decode, texture bind, animation sampling, 8-angle render, PNG
out — and nothing more.

## To finish it

1. Print the bounding box **before and after** each candidate rotation and pick
   the one that maximises Y extent relative to X and Z.
2. Apply the rotation to a wrapper `Object3D` rather than to `gltf.scene`, so
   the animation tracks are unaffected.
3. Frame from the *rotated* bounds, with `radius = max(sz.x, sz.z)`.
4. Re-verify visually before generating any further characters.

## Run it

```bash
export PATH="$HOME/.local/node/bin:$PATH"
node tools/prerender/prerender.js      # expects extracted glTF under CWD
```

Launched with `--use-gl=swiftshader` so it works on a machine with no GPU.

## Why this matters

The original prototype compared offline sprites with a future Three.js port.
That port has since been implemented: the shipped game uses live 3D models
while keeping the simulation and canvas fallback. The unresolved prototype
orientation notes remain here for historical reference.
