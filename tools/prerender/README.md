# glTF → sprite pre-render  (PROTOTYPE, orientation unresolved)

Answers the question that blocks 1,909 models in the asset library: **can a real
rigged 3D character become 2D sprite frames the existing canvas renderer draws?**

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

Path B (replace the 2D renderer with Three.js) is weeks of work. This path is
hours. Neither is free — but this one keeps `scene.js`, the difficulty curve and
the verification gate intact, and the sprite output drops straight into the
existing `SpriteSheets` pipeline as another roster character.
