#!/usr/bin/env python3
"""tools/build_3d_catalogue.py — catalogue every model in the downloaded 3D packs.

WHY A SEPARATE CATALOGUE
------------------------
`build_game_index.py` covers the 114,852 2D images: dimensions, alpha, CLIP
tags. It says nothing about the 3D packs, because a `.glb` is not an image.
For those, the questions that matter are different and deeper:

    is it rigged?      skins, JOINTS_0/WEIGHTS_0 attributes
    is it animated?    how many clips, and what are they called
    what can I play?   the actual animation names, which is the thing you
                       cannot guess ("2H_Melee_Attack_Spin" vs "attack2")
    what format?       .glb (binary, loadable directly) vs .gltf+bin+png
                       vs .fbx (needs conversion first)

The pack-level index already told us the size and the licence. This opens the
packs and answers the rest, per MODEL rather than per PACK.

The animation list is the part worth having. A pack advertising "animated"
tells you nothing; "76 clips including 1H_Ranged_Reload" tells you the
character can actually reload.
"""

from __future__ import annotations

import argparse
import json
import os
import struct
import sys
import zipfile
from pathlib import Path

MODEL_EXT = (".glb", ".gltf", ".fbx", ".obj", ".blend")
TEXTURE_EXT = (".png", ".jpg", ".jpeg", ".webp", ".tga", ".bmp")
ANIM_EXT = (".fbx",)


def glb_summary(data: bytes) -> dict:
    """Read a binary glTF's JSON chunk: mesh/skin/animation counts and names."""
    out = {}
    try:
        magic, ver, length = struct.unpack("<4sII", data[:12])
        if magic != b"glTF":
            return out
        out["gltf_version"] = ver
        off = 12
        js = None
        while off < length and off + 8 <= len(data):
            clen, ctype = struct.unpack("<I4s", data[off:off + 8])
            if ctype == b"JSON":
                js = json.loads(data[off + 8:off + 8 + clen].decode("utf-8"))
                break
            off += 8 + clen
        if not js:
            return out
        out["meshes"] = len(js.get("meshes", []))
        out["nodes"] = len(js.get("nodes", []))
        out["skins"] = len(js.get("skins", []))
        out["animations"] = len(js.get("animations", []))
        out["materials"] = len(js.get("materials", []))
        out["textures"] = len(js.get("textures", []))
        out["animation_names"] = [a.get("name", "") for a in js.get("animations", [])]
        prims = []
        for m in js.get("meshes", [])[:3]:
            for p in m.get("primitives", [])[:2]:
                prims.append(sorted(p.get("attributes", {}).keys()))
        out["attributes"] = sorted({a for pp in prims for a in pp})
        a = js.get("asset", {})
        out["generator"] = a.get("generator", "")
        out["copyright"] = a.get("copyright", "")
        return out
    except Exception:                                           # noqa: BLE001
        return out


def gltf_summary(zf: zipfile.ZipFile, name: str) -> dict:
    try:
        d = json.loads(zf.read(name))
    except Exception:                                           # noqa: BLE001
        return {}
    out = {
        "meshes": len(d.get("meshes", [])),
        "nodes": len(d.get("nodes", [])),
        "skins": len(d.get("skins", [])),
        "animations": len(d.get("animations", [])),
        "materials": len(d.get("materials", [])),
        "textures": len(d.get("textures", [])),
        "animation_names": [x.get("name", "") for x in d.get("animations", [])],
    }
    prims = []
    for m in d.get("meshes", [])[:3]:
        for p in m.get("primitives", [])[:2]:
            prims.append(sorted(p.get("attributes", {}).keys()))
    out["attributes"] = sorted({a for pp in prims for a in pp})
    out["generator"] = d.get("asset", {}).get("generator", "")
    return out


def guess_role(name: str, animated: bool, rigged: bool) -> str:
    n = name.lower()
    if any(k in n for k in ("sword", "axe", "shield", "staff", "wand", "dagger",
                            "crossbow", "bow", "spear", "axe", "hammer")):
        return "weapon"
    if any(k in n for k in ("potion", "bottle", "flask", "scroll", "spellbook")):
        return "consumable"
    if animated and rigged:
        return "character"
    if any(k in n for k in ("tree", "bush", "rock", "stone", "plant", "flower",
                            "grass", "mushroom", "log")):
        return "foliage"
    if any(k in n for k in ("wall", "floor", "tile", "pillar", "column",
                            "stair", "door", "fence")):
        return "architecture"
    if animated or rigged:
        return "character"
    return "prop"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--packs", default="../../imglib/packs",
                    help="directory of downloaded 3D pack zips")
    ap.add_argument("--out", default="model_catalogue.json")
    a = ap.parse_args()

    packs_dir = Path(a.packs)
    if not packs_dir.is_absolute():
        packs_dir = (Path(__file__).resolve().parent / packs_dir).resolve()
    if not packs_dir.is_dir():
        print("packs directory not found: %s" % packs_dir, file=sys.stderr)
        return 2

    catalogue = {}
    grand_models = 0
    grand_anim = 0
    rigged = 0
    animated = 0

    zips = sorted(packs_dir.glob("*.zip"))
    if not zips:
        print("no packs in %s" % packs_dir, file=sys.stderr)
        return 2

    for zp in zips:
        try:
            zf = zipfile.ZipFile(zp)
        except Exception as exc:                                # noqa: BLE001
            print("  %s: unreadable (%s)" % (zp.name, exc))
            continue
        entries = zf.namelist()
        models = [n for n in entries if n.lower().endswith(MODEL_EXT)]
        textures = [n for n in entries if n.lower().endswith(TEXTURE_EXT)]

        seen = {}
        for m in models:
            base = os.path.splitext(os.path.basename(m))[0]
            key = base.lower()
            if key in seen:
                continue
            info = {"file": base, "format": os.path.splitext(m)[1].lstrip(".").lower(),
                    "variants": 1}
            if m.lower().endswith(".glb"):
                try:
                    info.update(glb_summary(zf.read(m)))
                except Exception:                               # noqa: BLE001
                    pass
            elif m.lower().endswith(".gltf"):
                info.update(gltf_summary(zf, m))
            else:
                info["note"] = "%s needs conversion to glTF for web use" % info["format"]
                if m.lower().endswith(".fbx"):
                    info["animated_source"] = True
            n_anims = int(info.get("animations") or 0)
            n_skins = int(info.get("skins") or 0)
            info["rigged"] = n_skins > 0
            info["animated"] = n_anims > 0
            info["role"] = guess_role(base, n_anims > 0, n_skins > 0)
            if info["rigged"]:
                rigged += 1
            if info["animated"]:
                animated += 1
            grand_anim += n_anims
            seen[key] = info

        # count how many format variants each model had
        for m in models:
            base = os.path.splitext(os.path.basename(m))[0].lower()
            if base in seen:
                seen[base]["variants"] += 0

        catalogue[zp.name] = {
            "zip_bytes": zp.stat().st_size,
            "entries": len(entries),
            "textures": len(textures),
            "models": sorted(seen.values(), key=lambda x: x["file"].lower()),
            "model_files": len(models),
            "animation_clips": grand_anim if False else sum(
                int(x.get("animations") or 0) for x in seen.values()),
        }
        grand_models += len(seen)
        print("  %-46s %3d models, %4d clips, %3d textures"
              % (zp.name[:46], len(seen),
                 catalogue[zp.name]["animation_clips"], len(textures)))

    out = Path(a.out)
    if not out.is_absolute():
        out = Path(__file__).resolve().parent / out
    out.write_text(json.dumps({
        "source": "atiffhussainkhan/Image :: mega-assets + catalog-completion",
        "packs": len(catalogue),
        "models": grand_models,
        "rigged_models": rigged,
        "animated_models": animated,
        "animation_clips": grand_anim,
        "catalogue": catalogue,
    }, indent=1))

    print()
    print("packs %d | models %d | rigged %d | animated %d | clips %d"
          % (len(catalogue), grand_models, rigged, animated, grand_anim))
    print("catalogue: %s (%.1f KB)" % (out, out.stat().st_size / 1024))

    roles = {}
    for p in catalogue.values():
        for m in p["models"]:
            roles[m["role"]] = roles.get(m["role"], 0) + 1
    print("roles: %s" % ", ".join("%s=%d" % kv for kv in sorted(roles.items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())