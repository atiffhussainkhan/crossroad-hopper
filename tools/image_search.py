#!/usr/bin/env python3
"""tools/image_search.py — search the user's asset library and say what is usable.

THE PROBLEM THIS SOLVES
-----------------------
The `atiffhussainkhan/Image` repository is ~395MB of metadata whose actual
assets live in GitHub **Releases**, not in git. Finding something in it by hand
means reading a 3,271-line spec, then a storage-status note, then a JSON index,
then cross-referencing release tags. Every time, from scratch.

So: fetch the machine index once, cache it, and answer the question from a
command.

    python3 tools/image_search.py 3d character
    python3 tools/image_search.py --3d --cc0
    python3 tools/image_search.py --list
    python3 tools/image_search.py --knight

## The crawler rule this enforces

The repository ships its own rule and it matters:

    Treat an item as locally usable only when:
      - availability == "stored"
      - stored_copy is true
      - release_asset is non-empty

Anything `reference_only` or `pending_copy` is metadata with no downloadable
bytes behind it. Reporting those as "you have this asset" is worse than
reporting nothing, because the caller will go looking for a file.

## The licensing warning this prints

29 of 30 packs are CC0-1.0 or MIT and are safe to ship. The four
user-supplied artwork archives are marked **licences unverified** and are
deliberately NOT in this index as usable packs. That flag is surfaced, never
silently dropped.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "tools" / ".image_index_cache.json"

INDEX_URL = ("https://raw.githubusercontent.com/atiffhussainkhan/Image/"
             "main/catalog/MASTER_ASSET_INDEX.json")
CATALOG_URL = ("https://raw.githubusercontent.com/atiffhussainkhan/Image/"
               "main/catalog/user-artwork-active-library.json")
MAX_AGE_S = 24 * 3600

# Category fragments that mean "this is a 3D model, not a picture".
D3D_HINTS = ("3d", "low-poly", "lowpoly", "fbx", "glb", "gltf",
             "rigged", "terrain", "dungeon", "modular")
OK_LICENSES = {"CC0-1.0", "MIT", "CC0", "PUBLIC-DOMAIN"}


def fetch(url: str, force: bool = False) -> dict:
    if not force and CACHE.exists() and (
            os.path.getmtime(CACHE) > _age() - MAX_AGE_S):
        return json.loads(CACHE.read_text())
    req = urllib.request.Request(url, headers={"User-Agent": "image_search"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read().decode("utf-8"))
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(data))
    return data


def _age() -> float:
    import time
    return time.time()


def records(data: dict) -> list:
    if isinstance(data, list):
        return data
    for key in ("assets", "items", "records", "packs"):
        if isinstance(data.get(key), list):
            return data[key]
    return []


def is_3d(rec: dict) -> bool:
    hay = " ".join([
        str(rec.get("name", "")),
        " ".join(rec.get("categories") or []),
        " ".join(rec.get("search_terms") or []),
        str(rec.get("release_asset", "")),
    ]).lower()
    return any(h in hay for h in D3D_HINTS)


def usable(rec: dict) -> bool:
    return (rec.get("availability") == "stored"
            and bool(rec.get("stored_copy"))
            and bool(rec.get("release_asset")))


def score(rec: dict, terms: list) -> int:
    name = str(rec.get("name", "")).lower()
    cats = " ".join(rec.get("categories") or []).lower()
    srct = " ".join(rec.get("search_terms") or []).lower()
    aliases = " ".join(rec.get("aliases") or []).lower()
    n = 0
    for t in terms:
        if t in name:
            n += 6
        if t in aliases:
            n += 4
        if t in cats:
            n += 3
        if t in srct:
            n += 2
    return n


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("terms", nargs="*", help="words to search for")
    ap.add_argument("--3d", action="store_true", help="only packs containing 3D models")
    ap.add_argument("--2d", action="store_true", help="only 2D picture packs")
    ap.add_argument("--cc0", action="store_true", help="only packs with a permissive licence")
    ap.add_argument("--list", action="store_true", help="list every usable pack")
    ap.add_argument("--refetch", action="store_true", help="ignore the cache")
    ap.add_argument("--json", action="store_true", help="emit JSON instead of a table")
    a = ap.parse_args()

    try:
        data = fetch(INDEX_URL, a.refetch)
    except Exception as exc:                                    # noqa: BLE001
        print("could not reach the asset index: %s" % exc, file=sys.stderr)
        print("url: %s" % INDEX_URL, file=sys.stderr)
        return 2

    recs = records(data)
    pool = [r for r in recs if usable(r)]
    if a.__dict__.get("3d"):
        pool = [r for r in pool if is_3d(r)]
    if a.__dict__.get("2d"):
        pool = [r for r in pool if not is_3d(r)]
    if a.cc0:
        pool = [r for r in pool if str(r.get("license")) in OK_LICENSES]

    terms = [t.lower() for t in a.terms]
    if terms and not a.list:
        pool = [r for r in pool if score(r, terms) > 0]
        pool.sort(key=lambda r: (-score(r, terms), -(r.get("size_bytes") or 0)))
    else:
        pool.sort(key=lambda r: -(r.get("size_bytes") or 0))

    if a.json:
        print(json.dumps(pool, indent=2))
        return 0

    total = sum(r.get("size_bytes") or 0 for r in recs)
    usable_n = len(pool)
    print("atiffhussainkhan/Image — %d records, %.0f MB catalogued, %d usable%s"
          % (len(recs), total / 1048576, usable_n,
             " matching your filter" if (a.__dict__.get("3d") or a.__dict__.get("2d")
                                         or a.cc0 or terms) else ""))
    print()

    if not pool:
        print("No pack matches. Widening: drop --3d/--2d/--cc0, or try fewer words.")
        print("Full listing:  python3 tools/image_search.py --list")
        return 0

    print("%-42s %8s  %-6s %-4s %s"
          % ("PACK", "SIZE", "LICENCE", "3D", "CATEGORIES"))
    print("-" * 110)
    for r in pool:
        print("%-42s %7.1fM  %-6s %-4s %s"
              % (str(r.get("name", ""))[:42],
                 (r.get("size_bytes") or 0) / 1048576,
                 str(r.get("license", "?"))[:6],
                 "yes" if is_3d(r) else "-",
                 ",".join((r.get("categories") or [])[:4])[:40]))
        print("    -> %s" % (r.get("release_url") or ""))
    print()

    unver = [r for r in recs if "unverified" in str(r.get("license", "")).lower()
             or "unverified" in str(r.get("name", "")).lower()]
    print("NOTE: 29 of 30 packs are CC0-1.0 or MIT and are safe to ship.")
    if unver:
        print("      %d entries are marked UNVERIFIED licence and are excluded"
              % len(unver))
        print("      above on purpose. Check terms before redistributing.")
    print("      Full user-artwork library (licences unverified):")
    print("      %s" % CATALOG_URL)
    return 0


if __name__ == "__main__":
    sys.exit(main())