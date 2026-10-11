# Gamekit: use the existing library first

This is a compact Codex entry point for the user's existing `atiffhussainkhan/Image` asset library. It reuses the Minimax catalogues; it does not rescan or download the 13 GB collection. The original Minimax tools remain available.

## Start here

```sh
python3 ~/.minimax/asset-library/tools/gamekit-agent/gamekit.py status
python3 ~/.minimax/asset-library/tools/gamekit-agent/gamekit.py doctor /path/to/game
python3 ~/.minimax/asset-library/tools/gamekit-agent/gamekit.py search tree --limit 5
python3 ~/.minimax/asset-library/tools/gamekit-agent/gamekit.py search character --animated --limit 5
python3 ~/.minimax/asset-library/tools/gamekit-agent/gamekit.py inspect ASSET_ID
```

Search defaults to 3D, approved pack licences, five results and compact JSON. Reuse the returned ID in follow-ups. `--kind pack` searches bundles; `--kind 2d --include-unverified` allows review of the unverified 2D catalogue. `--role character` narrows a role without guessing from a filename. Query output does not include the full catalogue or every animation name.

**Coverage is a subset.** An empty model search means no indexed match, not proof that the entire library lacks the asset. Search packs next. Downloads are never automatic. `locate ASSET_ID` lists up to five exact members of one local ZIP, or returns the selected release URL if that bundle is not local. Nested ZIPs are reported explicitly.

## Reuse a checked model

```sh
python3 ~/.minimax/asset-library/tools/gamekit-agent/gamekit.py stage ASSET_ID --dest ./assets/library
```

`stage` supports registered local glTF/GLB models. It checks model and dependency hashes, copies original bytes with dependencies, licences and provenance into a new directory, and refuses overwrites or unverified assets. Archived candidates need a targeted inspection of the exact archive member before registration/import. No raster conversion or background-removal artwork is generated.

For a new 3D integration: confirm a real renderer and loader, inspect the chosen model's actual clips, ground its feet, normalize size from model bounds, fit visible hazards to collision footprints, and keep positions owned by the game simulation. Preview in the real browser to verify transparency, camera framing and movement. The doctor reports static source evidence, not a guarantee of runtime support.

Known working integration examples are in the local Crossroad Hopper project's `src/render/world3d.js`, `src/render/model-gallery.js` and `docs/ASSET-SELECTION.md`. Read those only when implementation detail is needed. Registered models point to existing files; if their paths move, register their new location.

## Keep lookup cheap

- Read this guide once, then use bounded queries. Do not paste the portable brief or raw catalogues into every task.
- Search and inspect are read-only and offline. A stale-cache flag requests an explicit rebuild; it never triggers a download.
- Do not infer animation from a pack's title. Older catalogue entries and newer imported variants can differ; `inspect` reads actual local clip metadata.
- Unverified 2D images are review-only. A permissive pack label does not approve unrelated images.
- Preview existing 2D atlas crops with `sheet scenery -n 6 -o /path/to/review.png`. It reports real drawn/skipped counts and never saves a blank sheet when all crops fail.

## Maintenance: only when files change

```sh
# Rebuild the lookup DB from existing JSON catalogues, not asset archives.
python3 ~/.minimax/asset-library/tools/gamekit-agent/gamekit.py index
# Add a project with assets/models/manifest.json and per-file provenance.json.
python3 ~/.minimax/asset-library/tools/gamekit-agent/gamekit.py register /path/to/game
python3 ~/.minimax/asset-library/tools/gamekit-agent/gamekit.py index
# Add a small persistent pointer in a new game's AGENTS.md.
python3 ~/.minimax/asset-library/tools/gamekit-agent/gamekit.py wire /path/to/game
```

`--library PATH` and `--cache PATH` are global options before the command. No third-party package is needed for search, inspection or staging. Contact sheets optionally use Pillow. The old `import2d` URL-guessing path is not used by this frontend; the current image catalogue does not verify import licences. Full archive rescans remain separate maintenance operations in the existing Minimax tools.
