#!/usr/bin/env python3
"""tools/build_character_pngs.py -- rebuild assets/characters/*.png from the JPGs.

WHY THIS EXISTS
---------------
The 24 roster images in assets/characters/ arrived as JPGs. A JPG cannot carry
an alpha channel, so whoever produced them flattened an already-transparent PNG
over a GREY CHECKERBOARD -- the usual "this used to be transparent" swatch.

That single fact is the whole bug, and it defeats the obvious fix:

  * the checker is not one colour, it alternates between two tones, so a
    distance-to-background-colour matte only ever matches half of it;
  * the grid is not on a clean integer pitch -- the sources were rescaled, so
    the cell measures 11px in one image and 23px in another. Any removal that
    assumes a period, a phase or a parity silently leaves the grid behind;
  * what survives is a full-frame opaque rectangle of chequered pixels. That is
    the "box behind the character" players were seeing. It lives in the pixels
    on disk, so no canvas fix, no cache-bust and no amount of reloading can
    remove it.

THE FIX
-------
Stop trying to describe the grid and use its one reliable property instead:
it is the only thing touching the border.

  1. Recover the two checker tones from the corner blocks.
  2. Treat a pixel as grid if it lies ON the axis between those two tones.
     Both pure tones sit on that axis, and so does every smear JPEG leaves at
     the cell boundaries, so the grid classifies as one solid sheet with no
     hairlines left behind. Saturated character pixels sit far off the axis and
     are rejected, so the character stays a solid barrier.
  3. Flood-fill from the border through that mask. The fill reaches the whole
     grid and stops dead at the character silhouette. Connectivity -- not
     colour similarity alone -- is what protects a grey knight's grey armour
     or a grey koala's grey fur from being erased: they are enclosed by the
     character's own saturated outline, so the fill never reaches them.
  4. Alpha 0 for anything the fill reached, 255 for the rest, with a one-pixel
     feather on the boundary so the sprite does not shimmer while it hops.
  5. Trim to the character, so drawH=46 makes the CHARACTER 46px tall rather
     than 46px of mostly-empty canvas.

Output is straight (un-premultiplied) RGBA, which is what ctx.drawImage wants.

WHY WEBP AND NOT PNG
--------------------
Written as PNG these 24 sprites come to 10.5MB, because a soft-edged RGBA
bitmap of flat-shaded art compresses badly. The same images as WebP with an
alpha channel come to 0.92MB -- an order of magnitude -- and the alpha channel
survives the round trip bit-exact (verified per file in the report). The rest
of the sprite pipeline already ships WebP for Knight/Princess/Dragon, so this
also removes the last reason for the game to handle two raster formats.

Because the roster art is now .webp rather than .png, a browser that cached the
old sprites cannot possibly serve them: the filename changed. That is why the
permanent ?t=Date.now() cache-buster in src/render/sprite.js could go too.
"""

import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "assets", "characters")

# How far off the A<->B axis a pixel may sit and still be called grid.
# Generous on purpose: JPEG smears the cell boundaries across several pixels,
# and anything left behind shows up as hairlines of chequer around the sprite.
CHROMA_TOL = 20.0

# How far past either tone, along the axis, still counts as grid. Covers the
# smear tails that overshoot slightly at the brightest edges.
PROJ_SLACK = 0.20

# One-pixel feather on the silhouette edge.
FEATHER_RADIUS = 0.6

# Transparent margin kept around the trimmed character.
PAD_PCT = 0.02

# WebP quality. 92 is visually lossless for this art and still ~11x smaller
# than PNG; the alpha channel is stored separately and is always exact.
WEBP_QUALITY = 92


def corner_tones(img, h, w):
    """The two checker tones, read from the four corner blocks.

    Corners only. A wider border ring picks up character art on several of
    these sprites -- the dog in char_05 reaches the edge -- which poisons a
    tone with the character's own colour.
    """
    a = np.array(img).astype(np.float32)
    k = min(32, h // 4, w // 4)
    corners = np.concatenate([
        a[0:k, 0:k, :].reshape(-1, 3),
        a[0:k, w - k:, :].reshape(-1, 3),
        a[h - k:, 0:k, :].reshape(-1, 3),
        a[h - k:, w - k:, :].reshape(-1, 3),
    ])
    lum = corners.mean(axis=1)
    lo, hi = float(lum.min()), float(lum.max())
    if hi - lo < 10.0:                      # flat backdrop, nothing to split
        m = corners.mean(axis=0).astype(np.float32)
        return m, m, False
    mid = (lo + hi) / 2.0
    dark = corners[lum <= mid].mean(axis=0).astype(np.float32)
    light = corners[lum > mid].mean(axis=0).astype(np.float32)
    # Order by luminance so "dark" really is darker; the axis is directionless
    # but the reporting is easier to read.
    if dark.mean() > light.mean():
        dark, light = light, dark
    return dark, light, True


def grid_mask(a, tone_a, tone_b):
    """True where a pixel lies on the segment between the two checker tones."""
    axis = tone_b - tone_a
    denom = float((axis * axis).sum())
    if denom < 1.0:
        return np.ones(a.shape[:2], dtype=bool)

    d = a - tone_a
    proj = (d * axis).sum(axis=2) / denom
    perp = d - proj[..., None] * axis
    perp_dist = np.sqrt((perp * perp).sum(axis=2))

    on_axis = perp_dist < CHROMA_TOL
    in_range = (proj > -PROJ_SLACK) & (proj < 1.0 + PROJ_SLACK)
    return on_axis & in_range


def flood_from_border(mask):
    """Fill the border-connected part of `mask`. C-speed via PIL.

    The mask is handed to PIL as RGB, not L. Pillow's floodfill reads pixels as
    tuples and compares them as sequences; on a single-channel image it returns
    immediately and silently, so an L-mode fill reports zero pixels filled and
    leaves the entire grid in place. That is a very quiet way to ship the exact
    bug this script exists to remove, so the mode is pinned here and covered by
    the "grid gone" column in the report.
    """
    h, w = mask.shape
    plane = np.zeros((h, w, 3), dtype=np.uint8)
    plane[mask] = (255, 255, 255)
    img = Image.fromarray(plane, "RGB")

    # Seed: the first border pixel the mask accepts. Corners are the likeliest
    # to be character art, so scan all four edges before giving up.
    seed = None
    for x in range(w):
        if mask[0, x]:
            seed = (x, 0)
            break
    if seed is None:
        for x in range(w):
            if mask[h - 1, x]:
                seed = (x, h - 1)
                break
    if seed is None:
        for y in range(h):
            if mask[y, 0]:
                seed = (0, y)
                break
    if seed is None:
        for y in range(h):
            if mask[y, w - 1]:
                seed = (w - 1, y)
                break
    if seed is None:
        return np.zeros((h, w), dtype=bool)

    ImageDraw.floodfill(img, seed, (128, 128, 128), thresh=0)
    plane = np.array(img)
    return (plane[:, :, 0] == 128) & (plane[:, :, 1] == 128) & (plane[:, :, 2] == 128)


def dilate(mask, px=2):
    """Grow a boolean mask by `px` on every side (max filter, C-speed)."""
    size = px * 2 + 1
    img = Image.fromarray((mask * 255).astype(np.uint8), "L")
    img = img.filter(ImageFilter.MaxFilter(size))
    return np.array(img) > 127


def _flood(mask, seed):
    """The connected component of `mask` containing `seed`."""
    h, w = mask.shape
    plane = np.zeros((h, w, 3), dtype=np.uint8)
    plane[mask] = (255, 255, 255)
    img = Image.fromarray(plane, "RGB")
    ImageDraw.floodfill(img, seed, (128, 128, 128), thresh=0)
    p = np.array(img)
    return (p[:, :, 0] == 128) & (p[:, :, 1] == 128) & (p[:, :, 2] == 128)


def keep_character(mask, min_frac=0.01, max_parts=400):
    """Keep the character's connected parts; drop residue.

    Flooding the grid away leaves a thin residue of chequer fragments scattered
    across the frame -- a percent or two of the pixels, but enough to stretch
    the bounding box to the full image. char_15 came out 1408x768 for exactly
    this reason while its neighbours cropped correctly, which draws the pig at
    a fraction of the size of every other character.

    So keep only connected components big enough to be part of the art. The
    threshold is relative to the largest component, because the absolute size
    of a meaningful piece (a wizard's staff, a knight's shield) scales with the
    character while a grid speck does not.

    The FIRST component must be seeded from the middle of the frame, not from
    the first pixel in raster order. Scanning in raster order worked until it
    did not: char_15 has several hundred scattered specks, so the component
    budget was spent on specks in the top-left corner and the scan never
    reached the pig at all. Every part of that sprite is now speck, and it
    rebuilt as a 63x44 thumbnail of nothing. The character is the one thing
    guaranteed to be near the centre, so start there.
    """
    total = int(mask.sum())
    if total == 0:
        return mask

    remaining = mask.copy()
    parts = []
    for k in range(max_parts):
        ys, xs = np.where(remaining)
        if len(ys) == 0:
            break
        if k == 0:
            cy = float(ys.mean())
            cx = float(xs.mean())
            d = (ys - cy) ** 2 + (xs - cx) ** 2
            j = int(np.argmin(d))
        else:
            j = 0
        comp = _flood(remaining, (int(xs[j]), int(ys[j])))
        parts.append(comp)
        remaining &= ~comp

    if not parts:
        return mask

    biggest = max(int(p.sum()) for p in parts)
    floor = max(64.0, biggest * min_frac)
    keep = np.zeros_like(mask)
    kept = 0
    for p in parts:
        if int(p.sum()) >= floor:
            keep |= p
            kept += 1
    return keep if kept else parts[int(np.argmax([p.sum() for p in parts]))]


def build(idx):
    cid = "char_%02d" % idx
    jpg_path = os.path.join(SRC, cid + ".jpg")
    png_path = os.path.join(SRC, cid + ".png")
    if not os.path.exists(jpg_path):
        print("  %s: no source jpg, skipped" % cid)
        return None

    img = Image.open(jpg_path).convert("RGB")
    w, h = img.size

    tone_a, tone_b, split = corner_tones(img, h, w)
    a = np.array(img).astype(np.float32)

    if split:
        # DILATE BEFORE FLOODING, and this is not cosmetic.
        #
        # JPEG smears each cell boundary across a pixel or two, and those smear
        # pixels sit slightly off the tone-to-tone axis, so the mask comes out
        # with hairline gaps tracing every grid line. Those gaps are a dam: the
        # flood crosses a gap and stops, having filled a few hundred pixels of
        # one cell and nothing else. char_15 filled 0% for exactly this reason
        # while char_01 filled 74% -- same code, same grid, different luck on
        # how the smear landed.
        #
        # Growing the mask by 2px bridges every such gap. It also eats 2px of
        # the character's own rim, which is what we want anyway: that rim is
        # JPEG fringe, and leaving it is what produced the grey halo.
        solid = ~flood_from_border(dilate(grid_mask(a, tone_a, tone_b), 2))
    else:
        # No checker to remove -- treat it as already transparent art.
        solid = np.ones((h, w), dtype=bool)

    solid = keep_character(solid)

    alpha = Image.fromarray((solid * 255).astype(np.uint8), "L")
    if FEATHER_RADIUS > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(FEATHER_RADIUS))
    alpha_arr = np.array(alpha)

    rgba = np.dstack([
        np.array(img, dtype=np.uint8),
        alpha_arr,
    ])
    out = Image.fromarray(rgba)

    covered = (1.0 - float(solid.sum()) / float(h * w)) * 100.0

    # Trim to the character so drawH=46 means the character is 46px tall.
    keep = alpha_arr >= 200
    if keep.any():
        cy, cx = np.where(keep)
        pad = int(round(max(out.size) * PAD_PCT))
        out = out.crop((
            max(0, int(cx.min()) - pad),
            max(0, int(cy.min()) - pad),
            min(w, int(cx.max()) + 1 + pad),
            min(h, int(cy.max()) + 1 + pad),
        ))

    out_path = os.path.join(SRC, cid + ".webp")
    out.save(out_path, "WEBP", quality=WEBP_QUALITY, method=6)

    # Read it back and prove the alpha survived the encode. WebP stores colour
    # and alpha separately and can be lossy on colour, so "it saved" is not
    # evidence that the transparency did. Compare the channel that matters.
    a_in = np.array(out)[:, :, 3].astype(int)
    a_out = np.array(Image.open(out_path).convert("RGBA"))[:, :, 3].astype(int)
    alpha_loss = int(np.abs(a_in - a_out).max())

    arr = np.array(out)[:, :, 3]
    opaque = int((arr >= 200).sum()) * 100.0 / arr.size
    return {
        "id": cid,
        "tones": (tuple(int(v) for v in tone_a), tuple(int(v) for v in tone_b)),
        "covered": covered,
        "size": out.size,
        "opaque_pct": opaque,
        "bytes": os.path.getsize(out_path),
        "alpha_loss": alpha_loss,
    }


def main():
    if not os.path.isdir(SRC):
        print("no asset directory at %s" % SRC)
        return 1
    print("Rebuilding roster sprites (border-connected grid removal)\n")
    print("%-9s %-24s %-10s %-12s %-8s %s"
          % ("id", "tones (dark / light)", "grid gone", "cropped to", "size", "alpha"))
    bad = []
    total = 0
    for i in range(1, 25):
        r = build(i)
        if r is None:
            bad.append("char_%02d" % i)
            continue
        total += r["bytes"]
        print("%-9s %-24s %-10s %-12s %-8s %.0f%% opaque, a-loss %d"
              % (r["id"], str(r["tones"]), "%.0f%%" % r["covered"],
                 "%dx%d" % r["size"], "%d KB" % (r["bytes"] // 1024),
                 r["opaque_pct"], r["alpha_loss"]))
        # A character that fills its whole frame means the grid survived.
        if r["covered"] < 40.0:
            bad.append("%s (grid barely removed, %.0f%%)" % (r["id"], r["covered"]))
        # Transparency that does not survive the encode is worse than no fix.
        if r["alpha_loss"] != 0:
            bad.append("%s (alpha lossy by %d)" % (r["id"], r["alpha_loss"]))
    print("")
    if bad:
        print("Needs a second look: " + "; ".join(bad))
        return 1
    print("All 24 sprites: grid removed, cropped to the character, "
          "%.2f MB total." % (total / 1048576.0))
    return 0


if __name__ == "__main__":
    sys.exit(main())