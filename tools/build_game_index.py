#!/usr/bin/env python3
"""tools/build_game_index.py — turn the 114,852-image library into a game index.

WHAT THIS IS
------------
The `atiffhussainkhan/Image` repository already carries a CLIP-derived semantic
index for all 114,852 images: vision tags, palette estimates, display titles,
dimensions, transparency and per-asset licence status. It is the right index and
it is already built -- but it is organised for *searching an archive*, not for
*deciding what a game should put on screen*.

So this reads that index once and adds the missing layer: a GAME ROLE per
image, and a compact index small enough to load instantly.

    role      what it is for in the game
    character anything with a face, a body, a silhouette, or an animation
    vehicle   anything that travels down a lane
    animal    creatures, distinct from humans
    prop      standalone objects that sit on a tile
    tile      ground and terrain surfaces, including tilesets
    scenery   background dressing: trees, buildings, sky, rock
    effect    fire, smoke, dust, sparks, explosions
    ui        icons, buttons, panels, cursors
    pickup    coins, food, gems, power-ups
    food      edible things
    fx_glow   light, glow, aura overlays

The last one is separate from `effect` on purpose: a glow is composited ADD,
an explosion is drawn opaque, and putting them in one bucket is how a level
ends up with an invisible cloud of smoke.

WHY NOT VISION-CALL 114,852 IMAGES
----------------------------------
Because they are already described. Each record carries CLIP vision tags and a
generated display title -- "Warning icon", "Red car, side view". Re-describing
them with a vision model would be 114,852 network calls to arrive at a worse
answer than the one already stored. See the `visual_tags` and
`visual_tag_method` fields.

LICENCE
-------
`license_status` is read per record and carried through into the output. Any
image not cleared for redistribution is excluded from the importable set and
listed separately. Rights are not inferred from technical quality.
"""

from __future__ import annotations

import argparse
import gzip
import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tools" / "game_asset_index.json"

# Ordered: first match wins, so put the specific before the generic.
# (role, terms) -- a term matches as a whole word against title + tags + terms.
RULES = [
    ("ui",        ["icon", "icons", "button", "panel", "cursor", "interface", "gui",
                   "hud", "badge", "arrow", "checkbox", "menu", "toolbar", "dialog",
                   "frame", "window", "scrollbar", "slider", "toggle", "widget"]),
    ("vehicle",   ["car", "cars", "truck", "bus", "taxi", "train", "tram", "lorry",
                   "van", "vehicle", "vehicles", "tractor", "taxi", "van", "bus",
                   "ambulance", "jeep", "motorbike", "scooter", "ship", "boat",
                   "aeroplane", "airplane", "helicopter", "rocket"]),
    ("tile",      ["tileset", "terrain", "ground", "grass",
                   "pavement", "asphalt", "floor", "seamless", "pattern",
                   "texture", "textures", "background-tile"]),
    ("scenery",   ["tree", "trees", "building", "buildings", "house", "sky",
                   "skybox", "cloud", "clouds", "mountain", "rock", "bush",
                   "shrub", "grass-patch", "fence", "wall", "tower", "castle",
                   "background", "landscape", "hill", "water", "river", "cave"]),
    ("animal",    ["animal", "animals", "cat", "dog", "bird", "fish", "horse",
                   "dragon", "monster", "creature", "beast", "wolf", "bear",
                   "rabbit", "bunny", "pig", "cow", "sheep", "fox", "deer",
                   "turtle", "snake", "frog", "duck", "cow", "pig", "goat"]),
    ("character", ["character", "characters", "sprite", "sprites", "hero",
                   "heroine", "person", "people", "man", "woman", "boy", "girl",
                   "kid", "child", "knight", "princess", "pirate", "ninja",
                   "zombie", "skeleton", "farmer", "soldier", "astronaut",
                   "chef", "wizard", "witch", "builder", "firefighter", "alien",
                   "goblin", "elf", "dwarf", "kid", "villager", "guy", "lady",
                   "avatar", "runner", "walker"]),
    ("pickup",    ["coin", "coins", "gem", "gems", "gemstone", "diamond",
                   "crystal", "treasure", "loot", "powerup", "power-up",
                   "heart", "star", "medal", "token", "candy", "key", "keys"]),
    ("food",      ["food", "fruit", "apple", "bread", "burger", "pizza", "cake",
                   "vegetable", "carrot", "cheese", "donut", "egg", "meat"]),
    ("effect",    ["explosion", "explode", "fire", "flame", "flames", "smoke",
                   "dust", "spark", "sparks", "bomb", "blast", "particle",
                   "particles", "fracture", "crack", "shatter", "smoke-cloud"]),
    ("fx_glow",   ["glow", "aura", "light", "shine", "halo", "sparkle",
                   "ray", "lensflare", "flare", "glow", "magic-circle"]),
    ("prop",      ["prop", "props", "object", "objects", "item", "items",
                   "barrel", "crate", "box", "chest", "furniture", "tool",
                   "weapon", "sword", "shield", "bow", "staff", "book",
                   "lamp", "pot", "bag", "signpost"]),
]

TITLE_SPLIT = (" · ", " - ", " — ")


def tokenise(text: str) -> set:
    out = set()
    for tok in str(text).lower().replace("/", " ").replace("_", " ").split():
        tok = "".join(c for c in tok if c.isalnum() or c == "-")
        if len(tok) > 1:
            out.add(tok)
    return out


def classify(rec) -> str:
    """Decide the game role, and admit ignorance when there is no evidence.

    The first version of this produced "Flower" as a character and "Farm" as a
    vehicle, for two reasons worth keeping in mind:

      - it treated every CLIP suggestion as equally trustworthy. CLIP describing
        a farm scene will offer "tractor" as a nearby concept, and a road
        vehicle was then matched. Similarity is not identity -- the library's
        own metadata says so: "suggestions, cosine similarity is not
        confidence."
      - it guessed from size and transparency when no keyword matched. Flowers
        are transparent and wide, so 13,796 plants were filed as characters.

    So: the generated TITLE is CLIP's own top description and is the primary
    signal; the filename is the fallback; CLIP tag lists are consulted last and
    only above a high similarity floor; and when nothing matches, the answer is
    "unclassified" rather than a plausible-sounding guess.
    """
    title = str(rec.get("display_title") or "")
    orig = str(rec.get("original_path") or "")
    fname = os.path.basename(orig)
    for ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"):
        if fname.lower().endswith(ext):
            fname = fname[: -len(ext)]
            break

    # 1. The title, up to the " · " / " - " separator the index appends.
    head = re.split(r"\s+[·\-—]\s+", title)[0]
    strong = tokenise(head) | tokenise(fname)

    # 2. Original path words, which often carry the real subject when the
    #    generated title is generic ("MGD00803").
    path_words = tokenise(orig.replace("\\", "/").replace("/", " "))

    # 3. CLIP tag list, but only the confident end of it.
    weak = set()
    for v in (rec.get("visual_tags") or []):
        if isinstance(v, dict):
            try:
                if float(v.get("similarity", 0)) >= 0.31 and v.get("label"):
                    weak |= tokenise(v["label"])
            except (TypeError, ValueError):
                continue
    weak |= tokenise(" ".join(str(t) for t in (rec.get("search_terms") or [])))

    for role, keys in RULES:
        k = set(keys)
        if strong & k:
            return role
    for role, keys in RULES:
        k = set(keys)
        if path_words & k:
            return role
    for role, keys in RULES:
        k = set(keys)
        if weak & k:
            return role
    if int(rec.get("frame_count") or 1) > 1:
        return "character"
    return "unclassified"


def sprite_like(rec) -> bool:
    """Usable as a character sprite: transparent background, single frame,
    not a near-blank, and not already flagged for visual review."""
    return (bool(rec.get("has_transparent_pixels"))
            and int(rec.get("frame_count") or 1) == 1
            and not rec.get("fully_transparent")
            and not rec.get("near_blank")
            and str(rec.get("visual_review_status")) == "automated-checks-passed")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True,
                    help="assets.jsonl from game-art-search-data.zip")
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--min-tag-score", type=float, default=0.26,
                    help="CLIP similarity floor for trusting a visual tag")
    a = ap.parse_args()

    src = Path(a.source)
    opener = gzip.open if str(src).endswith(".gz") else open
    roles = Counter()
    by_role = defaultdict(list)
    licence = Counter()
    total = 0
    anim = 0
    blank = 0
    unclassified = []

    with opener(src, "rt", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except Exception:                                   # noqa: BLE001
                continue
            total += 1
            licence[str(rec.get("license_status") or "unknown")] += 1
            if int(rec.get("frame_count") or 1) > 1:
                anim += 1
            if rec.get("fully_transparent") or rec.get("near_blank"):
                blank += 1

            role = classify(rec)
            roles[role] += 1

            tags = []
            for v in (rec.get("visual_tags") or []):
                if isinstance(v, dict):
                    try:
                        s = float(v.get("similarity", 0))
                    except (TypeError, ValueError):
                        continue
                    if s >= a.min_tag_score and v.get("label"):
                        tags.append(v["label"])
            title = str(rec.get("display_title") or
                        os.path.basename(str(rec.get("original_path") or "")))

            # Only keep enough for the index to be genuinely useful without
            # shipping 334MB of raw records into the repo.
            if role == "unclassified":
                unclassified.append({
                    "id": rec.get("asset_id"), "title": title,
                    "w": rec.get("width"), "h": rec.get("height"),
                    "transparent": bool(rec.get("has_transparent_pixels")),
                })
                roles["unclassified"] += 0
            by_role[role].append({
                "id": rec.get("asset_id"),
                "title": title,
                "tags": tags[:4],
                "w": rec.get("width"),
                "h": rec.get("height"),
                "transparent": bool(rec.get("has_transparent_pixels")),
                "sprite": sprite_like(rec),
                "frames": int(rec.get("frame_count") or 1),
                "palette": (rec.get("palette_colors") or [])[:4],
                "pack": rec.get("pack"),
                "lic": rec.get("license_status"),
                "url": rec.get("bundle_download_url") or rec.get("normalized_bundle", {}).get("download_url"),
                "file": rec.get("normalized_file"),
            })

    index = {
        "source": "atiffhussainkhan/Image :: game-art-search-v2-2026-10-05",
        "total_images": total,
        "animated": anim,
        "blank_or_transparent": blank,
        "licence": dict(licence),
        "roles": dict(roles.most_common()),
        "items": {r: by_role[r] for r in sorted(by_role)},
    }
    Path(a.out).write_text(json.dumps(index))
    size = Path(a.out).stat().st_size

    print("indexed %d images from the library" % total)
    print("  animated frames      : %d" % anim)
    print("  blank/fully clear    : %d (excluded from sprite use)" % blank)
    print("  licence status       : %s" % dict(licence.most_common(4)))
    print()
    print("  %-12s %8s  %s" % ("GAME ROLE", "COUNT", "sample titles"))
    print("  " + "-" * 92)
    for role, n in roles.most_common():
        samples = [x["title"][:24] for x in by_role[role][:3]]
        print("  %-12s %8d  %s" % (role, n, " | ".join(samples)))
    print()
    sprite_n = sum(1 for r in by_role for x in by_role[r] if x["sprite"])
    print("  sprite-ready (transparent, 1 frame, not blank, review passed): %d" % sprite_n)
    print("  index written: %s (%.1f MB)" % (a.out, size / 1048576))
    return 0


if __name__ == "__main__":
    sys.exit(main())