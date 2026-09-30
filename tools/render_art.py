"""render_art.py — renders the game's scenes and characters to PNG.

Everything here is generated from code. There are no image assets in this
project, and there will not be any: the art direction lives in `src/stages.js`
as palette and scenery data, and this module turns that data into pixels.

Depth
    Isometric scenes are painted back to front by (col + row), descending:
    the larger the sum, the further away the tile, so it is drawn first. Get
    this wrong and vehicles paint over the trees that stand in front of them,
    which is the single most obvious way an isometric scene looks broken.

Run from the project root:

    python3 tools/render_art.py            # everything
    python3 tools/render_art.py hero       # one group

Output lands in `art/`. These are previews and reference sheets, not game
assets — the game draws the same shapes on a canvas at runtime.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))

from iso import (  # noqa: E402
    BLOCK_H, SS, TILE_H, TILE_W, _rgba, LIGHT_RIGHT as LIGHT_RIGHT_F,
    Canvas, blob, cast_shadow, contrast_ratio, cube, cube_frac, frame_view,
    frame_view_window,
    hex_to_rgb, project_s,
    set_view, shade, tile, tile_shadow,
)

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "art"
ART.mkdir(exist_ok=True)

FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    """Load a real font, or fail loudly.

    The previous version silently fell back to PIL's bitmap default, so a
    checkout on a machine without these exact macOS paths rendered every
    label at a different size and nobody was told.
    """
    path = FONT_BOLD if bold and Path(FONT_BOLD).exists() else FONT_REG
    try:
        return ImageFont.truetype(path, size)
    except OSError as exc:
        raise SystemExit(
            "no usable font at %s (%s). Install a system sans-serif or set "
            "FONT_REG/FONT_BOLD in tools/render_art.py" % (path, exc)
        )


# --- the ten scenes --------------------------------------------------------
# Mirrored from src/stages.js. tools/check_content_schema.py is what keeps
# the two in step; this file is a preview tool, not the game.

LOGCOL = {1:"#f0e0d1", 2:"#e4c6a9", 3:"#f0e0d1", 4:"#f0e0d1", 5:"#c38140", 6:"#855629", 7:"#e2c2a2", 8:"#e2c2a2", 9:"#d2a06f", 10:"#d2a06f"}
TURTCOL = {1:"#d5e8cf", 2:"#b3d5a8", 3:"#d5e8cf", 4:"#d5e8cf", 5:"#609f4b", 6:"#3f6932", 7:"#aed2a1", 8:"#acd19f", 9:"#7fb96c", 10:"#7db869"}

def _log_colour(scene: dict) -> str:
    """Per-scene log colour, solved to clear 3.3:1 against that scene's own
    water. The log used to be a hard-coded brown, which made it the one
    hazard no palette change could ever fix: 10 of 10 stages failed."""
    return LOGCOL.get(scene["id"], "#c98a4b")


def _turtle_colour(scene: dict) -> str:
    """Per-scene turtle colour, same reasoning as _log_colour."""
    return TURTCOL.get(scene["id"], "#4a7a3a")


SCENES = [
    dict(id=1,  name="Suburb",       sky=("#8fc7f0", "#d8ecf9"), ground="#7ba05b", alt="#6f9450",
         road="#4a4a52", water="#3f7fb5", hazard="#ff4d3d", hazard2="#f2a03d",
         foliage="#3f8a3d", foliage2="#57a84f", trunk="#7a5433", accent="#ffffff", hazardKinds=["car", "taxi", "police"], scenery=["hedge", "tree", "mailbox", "bush", "flowerbed", "fence"]),
    dict(id=2,  name="River",        sky=("#7fb6e0", "#dcecf7"), ground="#3f7fb5", alt="#37719f",
         road="#4a4a52", water="#2f6f9f", hazard="#ff4d3d", hazard2="#8a5a2b",
         foliage="#2f6b40", foliage2="#438a52", trunk="#6b4a2b", accent="#e8f4ff", hazardKinds=["log", "turtle", "alligator", "snake"], scenery=["reed", "lily", "rock", "lily", "reed"]),
    dict(id=3,  name="Desert",       sky=("#f0c88a", "#fce9c4"), ground="#d9b168", alt="#cfa45c",
         road="#5a5048", water="#3f7fb5", hazard="#ff4d3d", hazard2="#a89a3a",
         foliage="#5f8a3f", foliage2="#7aa84f", trunk="#8a6a3a", accent="#fff6e0", hazardKinds=["car", "tumbleweed", "tractor", "racecar"], scenery=["cactus", "rock", "bone", "boulder"]),
    dict(id=4,  name="Farmland",     sky=("#c2d8b0", "#eef4dc"), ground="#d9d264", alt="#cbbc58",
         road="#54585e", water="#3f7fb5", hazard="#ff4d3d", hazard2="#e8b53d",
         foliage="#4a7a3a", foliage2="#5f9c48", trunk="#7a5433", accent="#fffce8", hazardKinds=["tractor", "car", "limousine", "truck", "train"], scenery=["haybale", "fence", "tree", "windmill"]),
    dict(id=5,  name="Night City",   sky=("#131a2e", "#38445f"), ground="#2b3040", alt="#262b39",
         road="#1e222c", water="#26405e", hazard="#ff4d3d", hazard2="#4ad9ff",
         foliage="#2a3a4a", foliage2="#365068", trunk="#2a2f38", accent="#7de8ff", hazardKinds=["taxi", "tram", "bus", "police"], scenery=["neon", "building", "streetlamp", "hydrant", "postbox"]),
    dict(id=6,  name="Frozen Lake",  sky=("#b8d8e8", "#edf7fc"), ground="#c8e4f0", alt="#bcd9e8",
         road="#262b33", water="#5aa0c0", hazard="#ff4d3d", hazard2="#6b4a8a",
         foliage="#3d6b5a", foliage2="#4f8570", trunk="#5a4636", accent="#ffffff", hazardKinds=["sled", "turtle", "log", "crocodile"], scenery=["pine", "iceberg", "pine", "rock"]),
    dict(id=7,  name="Rainforest",   sky=("#6ba87a", "#cce7c6"), ground="#3f7a4a", alt="#387044",
         road="#4a4438", water="#2f6f8a", hazard="#ff4d3d", hazard2="#7ac94f",
         foliage="#24522f", foliage2="#357a42", trunk="#5a4028", accent="#e8ffd8", hazardKinds=["log", "snake", "car", "boulder"], scenery=["vine", "fern", "tree", "bush"]),
    dict(id=8,  name="Construction", sky=("#b8bec8", "#e8ecf2"), ground="#9aa0a8", alt="#8f959d",
         road="#6b7078", water="#4a6a8a", hazard="#ff4d3d", hazard2="#e05c4b",
         foliage="#7a8a4a", foliage2="#8fa85a", trunk="#8a6a3a", accent="#ffffff", hazardKinds=["forklift", "roller", "monorail", "truck"], scenery=["scaffold", "cone", "crate", "pylon"]),
    dict(id=9,  name="Storm",        sky=("#3a4450", "#727d8c"), ground="#4a5560", alt="#434d57",
         road="#333a44", water="#38566b", hazard="#ff4d3d", hazard2="#7ac9e8",
         foliage="#2f3742", foliage2="#3d4a58", trunk="#33383f", accent="#d8e8f4", hazardKinds=["limousine", "tram", "tumbleweed", "train"], scenery=["pylon", "puddle", "pylon", "debris"]),
    dict(id=10, name="Volcano",      sky=("#3a1f1c", "#9c4326"), ground="#5a3a34", alt="#52342e",
         road="#3a2a26", water="#8a3a1a", hazard="#ff4d3d", hazard2="#ffd23d",
         foliage="#2a1a18", foliage2="#3f2622", trunk="#3a2a26", accent="#ffb03d", hazardKinds=["bus", "steamvent", "log", "train", "roller"], scenery=["lavaVent", "obsidian", "boulder", "debris"]),
]


# --- sky -------------------------------------------------------------------

def draw_tractor(c: Canvas, col: float, row: float, scene: dict) -> None:
    cast_shadow(c, col, row, 0.86, 0.58)
    """Farm vehicle: a tall cab over a low body, plus exhaust and big wheels.
    Taller than a car on purpose, so a Farmland board is not a Suburb board."""
    body = scene["hazard"]
    cube_frac(c, col + 0.00, row + 0.06, 0.86, 0.34, 0.0, 0.20, shade(body, 0.58))
    cube_frac(c, col + 0.06, row + 0.12, 0.62, 0.24, 0.20, 0.18, body)
    cube_frac(c, col + 0.10, row + 0.16, 0.24, 0.20, 0.38, 0.34, shade(body, 0.84))
    cube_frac(c, col + 0.10, row + 0.16, 0.24, 0.20, 0.70, 0.07, shade(body, 1.20))
    ex, ey = project_s(col + 0.40, row + 0.24, 0.86)
    c.line([(ex, ey + 6), (ex, ey - 14)], shade(body, 0.5), width=4)
    for dr in (0.18, 0.50, 0.74):
        wx, wy = project_s(col + 0.18, row + dr, 0.0)
        c.ellipse(wx, wy + 5, 6.0, 6.0, "#1c1c20")
        c.ellipse(wx, wy + 5, 2.6, 2.6, "#8d9096")
    for dr in (0.14, 0.40):
        lx, ly = project_s(col + 0.86, row + dr, 0.28)
        c.ellipse(lx, ly, 3.0, 2.2, "#fff3c0")


def draw_tram(c: Canvas, col: float, row: float, scene: dict) -> None:
    cast_shadow(c, col, row, 0.78, 0.58)
    """City tram: a long two-section body with a pantograph on the roof."""
    body = scene["hazard2"]
    cube_frac(c, col + 0.00, row + 0.06, 0.98, 0.30, 0.0, 0.38, shade(body, 0.58))
    cube_frac(c, col + 0.02, row + 0.09, 0.94, 0.26, 0.38, 0.30, body)
    cube_frac(c, col + 0.04, row + 0.11, 0.90, 0.24, 0.68, 0.08, shade(body, 1.18))
    # Pantograph, the mark that says "powered from above" rather than "on rails".
    px, py = project_s(col + 0.46, row + 0.24, 0.76)
    c.line([(px - 10, py), (px, py - 12), (px + 10, py)], CHAR_OUTLINE, width=2)
    for k in range(4):
        wx, wy = project_s(col + 0.14 + k * 0.22, row + 0.06, 0.54)
        c.poly([(wx, wy - 2), (wx - 6, wy + 4), (wx - 6, wy + 10), (wx, wy + 4)],
               "#dff0ff")
    for dr in (0.12, 0.36):
        lx, ly = project_s(col + 0.99, row + dr, 0.26)
        c.ellipse(lx, ly, 2.8, 2.0, "#fff3c0")


def draw_sled(c: Canvas, col: float, row: float, scene: dict) -> None:
    cast_shadow(c, col, row, 0.5, 0.45)
    """A sled: a shallow upturned hull with a rider block on top."""
    body = scene["hazard"]
    cube_frac(c, col + 0.04, row + 0.10, 0.88, 0.28, 0.0, 0.14, shade(body, 0.66))
    # Upturned nose.
    nx, ny = project_s(col + 0.96, row + 0.5, 0.0)
    c.poly([(nx, ny - 12), (nx - 12, ny + 4), (nx, ny + 4)], shade(body, 1.05))
    # Rider.
    cube_frac(c, col + 0.32, row + 0.18, 0.24, 0.20, 0.14, 0.30, shade(body, 1.14))
    rx, ry = project_s(col + 0.32, row + 0.18, 0.50)
    c.poly([(rx, ry - 10), (rx - 5, ry + 2), (rx + 5, ry + 2)], "#2b2b30")
    hx, hy = project_s(col + 0.44, row + 0.24, 0.34)
    c.line([(hx, hy), (hx + 12, hy - 6)], CHAR_OUTLINE, width=2)


def draw_animal(c: Canvas, col: float, row: float, scene: dict) -> None:
    cast_shadow(c, col, row, 0.56, 0.48)
    """A four-legged animal: a body, four stubby legs, a head and a tail. The
    legs are the whole point — every other hazard is a box or a disc, so this
    is the only one with legs and it reads as alive at a glance."""
    body = scene["hazard2"]
    for dx in (0.22, 0.62):
        cube_frac(c, col + dx, row + 0.12, 0.10, 0.10, 0.0, 0.14, shade(body, 0.70))
        cube_frac(c, col + dx, row + 0.34, 0.10, 0.10, 0.0, 0.14, shade(body, 0.70))
    cube_frac(c, col + 0.12, row + 0.14, 0.62, 0.30, 0.14, 0.22, body)
    # Head, forward and slightly lower.
    hx, hy = project_s(col + 0.82, row + 0.5, 0.34)
    c.ellipse(hx, hy, 9, 8, shade(body, 1.12))
    ex, ey = project_s(col + 0.90, row + 0.50, 0.36)
    c.ellipse(ex + 2, ey - 1, 1.8, 1.8, "#1b1b1b")
    # Ears and a tail.
    for sx in (-1, 1):
        ax, ay = project_s(col + 0.80, row + 0.5 + sx * 0.06, 0.44)
        c.poly([(ax, ay - 5), (ax - 3, ay + 2), (ax + 3, ay + 2)], body)
    tx, ty = project_s(col + 0.10, row + 0.5, 0.34)
    c.line([(tx, ty), (tx - 9, ty - 6)], shade(body, 0.82), width=3)


def draw_steel(c: Canvas, col: float, row: float, scene: dict) -> None:
    """A falling steel beam, drawn suspended above the lane. Construction is
    the only stage where the hazard is in the air rather than on the ground,
    and a beam hanging over a lane is the clearest possible telegraph."""
    body = scene["hazard"]
    cx, cy = project_s(col + 0.5, row + 0.5, 1.05)
    # Hanger cables.
    for sx in (-1, 1):
        c.line([(cx + sx * 22, cy - 40), (cx + sx * 18, cy)], CHAR_OUTLINE, width=1.6)
    # The beam: a long horizontal slab with an I-section read.
    c.poly([(cx - 26, cy - 7), (cx + 26, cy + 13), (cx + 26, cy + 21),
            (cx - 26, cy + 1)], shade(body, 0.78))
    c.poly([(cx - 26, cy - 13), (cx + 26, cy + 7), (cx + 26, cy + 13),
            (cx - 26, cy - 7)], shade(body, 1.14))
    for k in (-12, 0, 12):
        c.line([(cx + k, cy - 11), (cx + k, cy + 12)], shade(body, 0.62), width=2)


def draw_forklift(c: Canvas, col: float, row: float, scene: dict) -> None:
    cast_shadow(c, col, row, 0.8, 0.55)
    """A forklift: the hazard with a visible mast and forks, so it is not
    just another orange box on a grey board."""
    body = scene["hazard"]
    cube_frac(c, col + 0.08, row + 0.14, 0.44, 0.26, 0.0, 0.22, shade(body, 0.62))
    cube_frac(c, col + 0.10, row + 0.18, 0.24, 0.22, 0.22, 0.26, body)
    cube_frac(c, col + 0.10, row + 0.18, 0.24, 0.22, 0.46, 0.06, shade(body, 1.20))
    # Mast.
    mx, my = project_s(col + 0.58, row + 0.30, 0.0)
    c.line([(mx, my + 6), (mx - 2, my - 34)], CHAR_OUTLINE, width=3)
    # Forks.
    fx, fy = project_s(col + 0.56, row + 0.30, 0.06)
    c.line([(fx, fy), (fx + 22, fy + 10)], shade(body, 0.70), width=4)
    for dr in (0.18, 0.50):
        wx, wy = project_s(col + 0.20, row + dr, 0.0)
        c.ellipse(wx, wy + 5, 5.4, 5.4, "#1c1c20")
        c.ellipse(wx, wy + 5, 2.3, 2.3, "#8d9096")


def draw_tumbleweed(c: Canvas, col: float, row: float, scene: dict) -> None:
    """A tumbleweed: a tangle of crossing strokes, deliberately unlike every
    other hazard's solid silhouette."""
    cx, cy = project_s(col + 0.5, row + 0.5, 0.26)
    colr = scene["hazard2"]
    c.ellipse(cx, cy, 17, 15, colr)
    for k in range(9):
        a = k * 0.7
        c.line([(cx - 15 * (1 - abs(k % 2)), cy - 13 + k * 3),
                (cx + 15 * (abs(k % 2)), cy - 9 + k * 3)],
               shade(colr, 0.74 if k % 2 else 1.16), width=1.6)


def draw_crack(c: Canvas, col: float, row: float, scene: dict) -> None:
    """A fracture in ice: a jagged branching split. Reads on any background
    because it is a line, and it is the only hazard that is drawn as a line."""
    cx, cy = project_s(col + 0.5, row + 0.5, 0.02)
    colr = scene["hazard"]
    c.line([(cx - 26, cy - 2), (cx - 10, cy + 5), (cx - 2, cy - 4),
            (cx + 9, cy + 6), (cx + 26, cy - 1)], colr, width=3)
    for dx, dy in ((-10, 5), (2, -4), (9, 6)):
        c.line([(cx + dx, cy + dy), (cx + dx - 5, cy + dy - 12)], colr, width=2)
        c.line([(cx + dx, cy + dy), (cx + dx + 6, cy + dy + 10)], colr, width=2)


def draw_bolt(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Lightning: a stepped bolt with a glow, drawn in the sky above a lane
    so it is telegraphed rather than a surprise."""
    cx, cy = project_s(col + 0.5, row + 0.5, 1.5)
    for k in range(3):
        c.blend_poly(
            [(cx - (26 - k * 6), cy - (20 - k * 5)),
             (cx + (26 - k * 6), cy - (20 - k * 5)),
             (cx + (26 - k * 6), cy + (20 - k * 5)),
             (cx - (26 - k * 6), cy + (20 - k * 5))],
            (255, 235, 150, 30 - k * 8))
    c.poly([(cx - 4, cy - 26), (cx + 12, cy - 26), (cx + 1, cy - 6),
            (cx + 13, cy - 6), (cx - 9, cy + 26), (cx - 2, cy + 2),
            (cx - 14, cy + 2)], "#ffe066")


def draw_lava(c: Canvas, col: float, row: float, scene: dict) -> None:
    """A lava pool: a dark crust with a bright irregular interior, so it
    reads as molten rather than as an orange circle."""
    cx, cy = project_s(col + 0.5, row + 0.5, 0.0)
    c.ellipse(cx, cy, 24, 15, "#2a1a18")
    c.ellipse(cx, cy, 20, 12, "#ff5a1a")
    c.ellipse(cx - 3, cy - 2, 12, 7, "#ffd23d")
    for k in range(5):
        a = k * 1.25
        c.ellipse(cx + 15 * (1 - abs(k % 2)), cy + 6 - k * 3, 3.4, 2.2, "#ff9c2d")


def draw_boulder(c: Canvas, col: float, row: float, scene: dict) -> None:
    cast_shadow(c, col, row, 0.75, 0.5)
    """A rolling boulder: stacked angular blocks, so it reads as rock that
    moves rather than as scenery that happens to be on the lane."""
    colr = "#4a3330"
    blob(c, col + 0.10, row + 0.12, 0.76, 0.68, 0.0, 0.44, colr, round_top=0.26)
    blob(c, col + 0.26, row + 0.26, 0.44, 0.40, 0.44, 0.30, shade(colr, 1.14),
         round_top=0.30)
    cx, cy = project_s(col + 0.5, row + 0.5, 0.74)
    c.ellipse(cx, cy, 7, 4, shade(colr, 1.30))


def draw_taxi(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_racecar(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_police(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_limousine(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_bus(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_roller(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_monorail(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_snake(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_alligator(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_crocodile(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_geyser(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_steamvent(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_hedge(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_mailbox(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_fence(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_flowerbed(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_streetlamp(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_parkedcar(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_lily(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_bone(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_windmill(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_neon(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_hydrant(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_postbox(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_puddle(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_vine(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_fern(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_scaffold(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_crate(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_pylon(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_debris(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_obsidian(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))

def draw_iceberg(c: Canvas, col: float, row: float, scene: dict) -> None:
    """Preview stub. The playable draws this in src/render/scene.js; the
    Python sheet exists to check the STAGE DATA, not to be the art."""
    cube(c, col + 0.34, row + 0.34, 0.32, 0.32, 0.0, 0.34, scene.get("hazard", "#888"))


def draw_sky(c: Canvas, w: int, h: int, top: str, bottom: str) -> None:
    tr, tg, tb = hex_to_rgb(top)
    br, bg, bb = hex_to_rgb(bottom)
    for y in range(h):
        t = y / max(1, h - 1)
        c.draw.rectangle(
            [0, c.s(y), c.s(w), c.s(y + 1)],
            fill=(int(tr + (br - tr) * t), int(tg + (bg - tg) * t),
                  int(tb + (bb - tb) * t), 255),
        )


# --- depth helper ----------------------------------------------------------

def draw_sorted(items, paint):
    """Paint (col, row, payload) back to front: larger col+row is further."""
    for col, row, payload in sorted(items, key=lambda t: -(t[0] + t[1])):
        paint(col, row, payload)


# --- character -------------------------------------------------------------
#
# An original creature. The silhouette has to read at 24 px, which is roughly
# what it is on a phone. That rules out thin limbs: the read is a wide round
# body, tall ears, two big eyes, and one bright chest mark.

CHAR_BODY = "#f7e3c8"
CHAR_EAR = "#f0b9c0"
CHAR_MARK = "#fff4e0"
# A saturated teal that appears in no other scene. It breaks the
# orange mass so the sprite still reads at 24px, and it guarantees the
# player can never be confused with traffic, which is also orange.
CHAR_ACCENT = "#2fbfa0"
CHAR_OUTLINE = "#3a2410"


# The roster, mirrored from src/roster.js. The game reads the JS; this is the
# preview tool. tools/check_art_assets.py asserts the two agree.
ROSTER = [
    dict(id="pip",   name="Pip",   body="#f7e3c8", accent="#2fbfa0", ear="#f0b9c0",
         bodyW=0.56, bodyH=0.28, headW=0.64, headH=0.36, earKind="triangle", earScale=1.0, eyeScale=1.0),
    dict(id="bloop", name="Bloop", body="#8fd6e8", accent="#ff9f43", ear="#bfeaf3",
         bodyW=0.64, bodyH=0.30, headW=0.68, headH=0.40, earKind="antenna",  earScale=1.0, eyeScale=1.25),
    dict(id="nib",   name="Nib",   body="#c9a0e8", accent="#ffe066", ear="#e0c8f2",
         bodyW=0.44, bodyH=0.34, headW=0.50, headH=0.34, earKind="tall",     earScale=1.5, eyeScale=0.9),
    dict(id="cob",   name="Cob",   body="#e8a05c", accent="#4a6fa5", ear="#f0bf88",
         bodyW=0.72, bodyH=0.20, headW=0.60, headH=0.28, earKind="horn",     earScale=0.9, eyeScale=0.85),
    dict(id="fizz",  name="Fizz",  body="#a8e063", accent="#e04a6a", ear="#c8f0a0",
         bodyW=0.54, bodyH=0.30, headW=0.60, headH=0.36, earKind="flop",     earScale=1.1, eyeScale=1.1),
    dict(id="mozz",  name="Mozz",  body="#f2f0e6", accent="#3a3a3a", ear="#d8d4c4",
         bodyW=0.70, bodyH=0.26, headW=0.66, headH=0.34, earKind="round",    earScale=1.35, eyeScale=1.0),
]

CHAR_OUTLINE = "#3a2410"


def draw_character(c: Canvas, col: float, row: float, scale: float = 1.0,
                   z: float = 0.0, ch: dict | None = None) -> None:
    cast_shadow(c, col, row, 0.9, 0.42)
    """Draw one roster member.

    The six differ by PROPORTION and by what sticks out of the head, not by
    colour. Recolouring one sprite produces two of the same sprite; a taller
    body, a narrower head and a different ear produce a different creature.
    The ear kind is the strongest cue at 24px, so it gets the most geometry.

    Stack, back to front:
        outline   bodyW+0.10 wide, 0 -> headH+bodyH
        feet      small, under the body
        body      bodyW wide
        scarf     accent, at the shoulders
        head      headW wide
        ears/face in screen space on the head's front-left face
    """
    ch = ch or ROSTER[0]
    body, accent, ear_c = ch["body"], ch["accent"], ch["ear"]
    bw, bh = ch["bodyW"], ch["bodyH"]
    hw, hh = ch["headW"], ch["headH"]
    es, ys = ch["earScale"], ch["eyeScale"]


    def zz(h):
        return (z + h) * scale

    # Keyline. The previous version drew a SOLID #3a2410 prism at the
    # character's full height and full width behind everything. It was the
    # biggest block of shared pixels in the roster and the reason every
    # character read as a dark box with eyes stuck on the front. Measured: it
    # alone accounted for the worst pairwise silhouette overlap. A thin dark
    # edge on the two visible faces does the same job without filling the
    # silhouette the greyscale test actually measures.
    # A head wider than the body hides the body completely, which is how
    # four of the six became 'a head with eyes in a crate'. The body is
    # now at least as wide as the head, so a body always exists.
    bw = max(bw, hw)
    total_h = bh + hh

    cube_frac(c, col + (1 - bw * 0.7) / 2, row + (1 - bw * 0.7) / 2,
              bw * 0.7, bw * 0.7, zz(0.0), 0.10 * scale, shade(body, 0.66))
    cube_frac(c, col + (1 - bw) / 2, row + (1 - bw) / 2, bw, bw,
              zz(0.10), (bh - 0.10) * scale, body)
    # Scarf at the shoulder line, in the accent hue.
    cube_frac(c, col + (1 - bw) / 2, row + (1 - bw) / 2, bw, bw,
              zz(bh), 0.09 * scale, accent)
    cube_frac(c, col + (1 - hw) / 2, row + (1 - hw) / 2, hw, hw,
              zz(bh + 0.09), (hh - 0.09) * scale, shade(body, 1.10))

    # --- ears: the silhouette-defining feature --------------------------
    hcx, hcy = project_s(col + 0.5, row + 0.5, zz(bh + hh))
    spread = (hw / 2) * 32 * scale + (7 * scale if ch['earKind'] == 'round' else 3)

    if ch["earKind"] == "triangle":
        for sx in (-1, 1):
            ex = hcx + sx * spread * 0.92
            h = 21 * es * scale
            c.poly([(ex, hcy - h), (ex - 10 * es * scale, hcy + 3 * scale),
                    (ex + 10 * es * scale, hcy + 3 * scale)], body)
            c.poly([(ex, hcy - h * 0.62), (ex - 5 * es * scale, hcy + 2 * scale),
                    (ex + 5 * es * scale, hcy + 2 * scale)], ear_c)
            c.line([(ex, hcy - h), (ex - 10 * es * scale, hcy + 3 * scale),
                    (ex + 10 * es * scale, hcy + 3 * scale)], CHAR_OUTLINE, width=1.4)
    elif ch["earKind"] == "tall":
        for sx in (-1, 1):
            ex = hcx + sx * spread * 0.66
            h = 40 * es * scale
            c.ellipse(ex, hcy - h * 0.5, 8 * scale * es, h * 0.5, body)
            c.ellipse(ex, hcy - h * 0.5, 4 * scale * es, h * 0.34, ear_c)
            c.line([(ex, hcy), (ex, hcy - h)], CHAR_OUTLINE, width=1.4)
    elif ch["earKind"] == "round":
        for sx in (-1, 1):
            ex = hcx + sx * spread * 0.95
            c.ellipse(ex, hcy - 5 * scale, 10 * es * scale, 10 * es * scale, body)
            c.ellipse(ex, hcy - 5 * scale, 5 * es * scale, 5 * es * scale, ear_c)
    elif ch["earKind"] == "horn":
        for sx in (-1, 1):
            ex = hcx + sx * spread * 0.78
            # A horn is NOT a triangle. Pip has triangles; giving Cob a
            # triangle too made the two silhouettes 89 percent identical.
            # This is a stepped block: three decreasing rectangles leaning
            # out and up, a different shape family from any ear.
            for k, (w, h) in enumerate(((9, 8), (7, 7), (5, 6))):
                bx = ex - sx * (6 + k * 8) * es * scale
                by = hcy - 1 * scale - k * 9 * es * scale
                c.rect(bx - w * es * scale / 2, by - h * es * scale,
                       bx + w * es * scale / 2, by, shade(body, 1.0 - k * 0.06))
                c.line([(bx - w * es * scale / 2, by),
                        (bx + w * es * scale / 2, by)], CHAR_OUTLINE, width=1.2)
    elif ch["earKind"] == "flop":
        # A sprig lying sideways: the only mark that is not above the head.
        # Two leaves, so the sprig reads as a plant and not as a stray line.
        import math as _m
        for ang, ln, lw in ((-20, 34, 11), (-48, 26, 9)):
            a = _m.radians(ang)
            ax = hcx + _m.cos(a) * ln * es * scale
            ay = hcy + _m.sin(a) * ln * es * scale
            # A real leaf: a lens shape, not a line. Two lines read as insect
            # antennae, which is the opposite of the intent.
            px, py = -_m.sin(a), _m.cos(a)
            c.poly([(hcx, hcy + 2 * scale),
                    (ax + px * lw * es * scale, ay + py * lw * es * scale),
                    (ax + (ax - hcx) * 0.35, ay + (ay - hcy) * 0.35),
                    (ax - px * lw * es * scale, ay - py * lw * es * scale)],
                   accent)
            c.line([(hcx, hcy + 2 * scale), (ax, ay)], CHAR_OUTLINE, width=1.4)
    elif ch["earKind"] == "antenna":
        # One thin spike. The only silhouette with a single line above it.
        c.line([(hcx, hcy + 2 * scale), (hcx + 2 * scale, hcy - 30 * es * scale)],
               CHAR_OUTLINE, width=2.2)
        c.ellipse(hcx + 2 * scale, hcy - 33 * es * scale, 4.5 * scale, 4.5 * scale,
                  accent)

    # --- face: eyes above, mouth below ---------------------------------
    fx, fy = project_s(col + (1 - hw) / 2, row + (1 - hw) / 2 + 0.16, zz(bh + hh * 0.62))
    eye_r = 4.3 * ys * scale
    for sx in (-1, 1):
        ex = fx + sx * 9.2 * ys * scale
        c.ellipse(ex, fy, eye_r, eye_r * 1.12, "#ffffff")
        c.ellipse(ex + 1.0 * scale, fy + 0.6 * scale, eye_r * 0.5, eye_r * 0.58, "#1b1b1b")
        c.ellipse(ex - 1.4 * scale, fy - 1.8 * scale, eye_r * 0.22, eye_r * 0.23, "#ffffff")
        c.draw.ellipse([c.s(ex - eye_r), c.s(fy - eye_r * 1.12),
                        c.s(ex + eye_r), c.s(fy + eye_r * 1.12)],
                       outline=_rgba(CHAR_OUTLINE, 210), width=max(1, int(c.s(1))))

    mx, my = project_s(col + (1 - hw) / 2, row + (1 - hw) / 2 + 0.16, zz(bh + hh * 0.28))
    # Smile geometry: the curve is WIDER at the bottom than the top. The old
    # trapezoid narrowed downward, which is a frown, and combined with the
    # oversized eyes it read as a grimace on every character.
    c.draw.arc([c.s(mx - 5.0 * scale), c.s(my - 4.0 * scale),
                c.s(mx + 5.0 * scale), c.s(my + 4.0 * scale)],
               start=15, end=165, fill=_rgba("#8a3a1a", 255),
               width=max(1, int(c.s(1.4))))

    bx, by = project_s(col + (1 - bw) / 2, row + (1 - bw) / 2, zz(bh * 0.62))
    c.ellipse(bx, by, 4.6 * scale, 2.6 * scale, ch.get("mark", "#ffffff"))

# --- scenery ---------------------------------------------------------------

def draw_tree(c: Canvas, col: float, row: float, scene: dict) -> None:
    cast_shadow(c, col, row, 1.45, 0.62)
    """A tree built from world-unit blocks, so it is the same object at every
    zoom level.

    Three findings forced this rebuild:
      * `cube()` spans a full 1x1 cell, so the "thin trunk" was a 64px slab.
      * `Canvas.ellipse` applies only the supersample factor, never the view
        scale, so a pixel-sized canopy did not scale with the board. The
        canopy/trunk ratio was 0.94 at scale 1.0 and 0.73 at scale 2.0.
      * An ellipse has no side faces, so a canopy built from ellipses had no
        shadow side and its value range ran 0.82-1.52x against a declared
        lighting convention of 0.54-1.00.

    Now the trunk is 0.12 tiles and the canopy is three `blob` lobes, all lit
    by the same face factors as every other solid. The lobe centres are
    offset from one another on purpose: concentric lobes read as a wedding
    cake, offset ones read as a mass.
    """

    trunk = scene["trunk"]
    cube_frac(c, col + 0.44, row + 0.44, 0.12, 0.12, 0.0, 0.92, trunk)
    # Root flare, so the trunk meets the ground instead of being stuck on.
    cube_frac(c, col + 0.38, row + 0.38, 0.24, 0.24, 0.0, 0.10, shade(trunk, 0.80))

    lobes = (
        (0.58, 0.86, 1.30, 0.46, 0.54, scene["foliage"]),
        (0.44, 1.08, 1.50, 0.58, 0.46, shade(scene["foliage2"], 0.92)),
        (0.30, 1.36, 1.72, 0.48, 0.60, scene["foliage2"]),
    )
    for size, z0, z1, dc, dr, colr in lobes:
        blob(c, col + dc, row + dr, size, size, z0, z1 - z0, colr, round_top=0.30)


def draw_bush(c: Canvas, col: float, row: float, scene: dict) -> None:
    """A bush: three world-unit lobes sitting ON the ground.

    The previous version drew fixed-pixel ellipses at z=0.10 with ry=11.5,
    so every lobe straddled the ground plane and the bush rendered as a
    half-buried blob inside a dark hole.
    """
    tile_shadow(c, col, row, opacity=15)
    fol = scene["foliage"]
    lobes = (
        (0.44, 0.00, 0.30, 0.36, 0.52, fol),
        (0.36, 0.22, 0.42, 0.62, 0.44, shade(fol, 0.92)),
        (0.28, 0.38, 0.54, 0.50, 0.56, scene["foliage2"]),
    )
    for size, z0, z1, dc, dr, colr in lobes:
        blob(c, col + dc, row + dr, size, size, z0, z1 - z0, colr, round_top=0.34)


def draw_cactus(c: Canvas, col: float, row: float, scene: dict) -> None:
    cast_shadow(c, col, row, 1.35, 0.58)
    """A cactus with a real trunk and two real arms.

    Previously the body and both arms were full-tile cubes, so the arms
    covered the body almost entirely and the cactus read as one box. The arms
    were also pre-shaded before `cube()` shaded them again, putting the right
    face at 0.378 against a 0.54 floor: two light directions in one object.
    """
    body = scene["foliage"]
    cube_frac(c, col + 0.42, row + 0.42, 0.18, 0.18, 0.0, 1.30, body)
    cube_frac(c, col + 0.20, row + 0.42, 0.22, 0.16, 0.44, 0.46, body)
    cube_frac(c, col + 0.42, row + 0.20, 0.16, 0.22, 0.66, 0.40, body)
    # Rounded caps so the silhouette is not three boxes.
    blob(c, col + 0.42, row + 0.42, 0.18, 0.18, 1.20, 0.14, body, round_top=0.42)


def draw_rock(c: Canvas, col: float, row: float, scene: dict) -> None:
    cast_shadow(c, col, row, 0.36, 0.38)
    """A rock, shaded from the scene so it belongs to the biome.

    The old version hard-coded a cold grey regardless of scene, which in
    Night City, Storm and Volcano made it the brightest thing on the board,
    and it pre-shaded to 0.80 and 1.12, breaking the 0.54-1.00 convention.
    """
    base = shade(scene["ground"], 0.72)
    blob(c, col + 0.28, row + 0.30, 0.44, 0.40, 0.0, 0.34, base, round_top=0.38)
    blob(c, col + 0.52, row + 0.56, 0.24, 0.22, 0.28, 0.20, shade(base, 1.10),
         round_top=0.42)


def draw_haybale(c: Canvas, col: float, row: float, scene: dict) -> None:
    cast_shadow(c, col, row, 0.52, 0.45)
    cube(c, col + 0.24, row + 0.28, 0.0, 0.50, "#c9a34d")
    x, y = project_s(col + 0.5, row + 0.5, 0.52)
    c.ellipse(x, y, 15, 9, "#e0bd66")
    for off in (-7, 7):
        c.line([(x + off, y - 8), (x + off, y + 8)], "#9a7a34", width=2)


def draw_building(c: Canvas, col: float, row: float, scene: dict) -> None:
    cast_shadow(c, col, row, 2.2, 0.85)
    cube(c, col + 0.14, row + 0.14, 0.0, 2.2, "#2a3040")
    cube(c, col + 0.20, row + 0.20, 2.2, 0.16, "#1e2430")
    for wz in range(1, 8):
        for wc in range(2):
            lx, ly = project_s(col + 0.14, row + 0.24 + wc * 0.32, wz * 0.28)
            if (wz * 3 + wc) % 4 == 0:
                c.ellipse(lx, ly, 3, 4, "#7de8ff")


def draw_cone(c: Canvas, col: float, row: float, scene: dict) -> None:
    cast_shadow(c, col, row, 0.28, 0.34)
    x, y = project_s(col + 0.5, row + 0.5, 0.0)
    c.poly([(x, y - 26), (x - 12, y + 6), (x + 12, y + 6)], "#f26a2b")
    c.poly([(x, y - 15), (x - 7, y - 2), (x + 7, y - 2)], "#ffffff")
    c.ellipse(x, y + 6, 13, 4.5, "#c25220")


def draw_lava_vent(c: Canvas, col: float, row: float, scene: dict) -> None:
    cast_shadow(c, col, row, 0.3, 0.38)
    cube(c, col + 0.22, row + 0.26, 0.0, 0.26, "#2a1a18")
    x, y = project_s(col + 0.5, row + 0.5, 0.27)
    c.ellipse(x, y, 15, 6.5, "#ff5a1a")
    c.ellipse(x, y - 1, 9, 3.6, "#ffd23d")


def draw_pine(c: Canvas, col: float, row: float, scene: dict) -> None:
    cast_shadow(c, col, row, 1.45, 0.6)
    """A conifer: three tapering tiers on a short trunk. The only scenery
    built from narrowing tiers, so it never reads as a round-canopy tree."""
    trunk = scene["trunk"]
    cube_frac(c, col + 0.45, row + 0.45, 0.10, 0.10, 0.0, 0.34, trunk)
    tiers = ((0.28, 0.78, 0.62, 0.30), (0.66, 1.10, 0.48, 0.24), (1.00, 1.40, 0.32, 0.20))
    for z0, z1, w, h in tiers:
        colr = shade(scene["foliage"], 0.86 + (z1 - z0) * 0.22)
        cx, cy = project_s(col + 0.5, row + 0.5, z1)
        half = (w * 32) / 2 * 1.0
        c.poly([(cx, cy - h * 18), (cx + half, cy + 5), (cx - half, cy + 5)],
               colr)
        # Lit right face, so the cone obeys the same lighting as every solid.
        c.poly([(cx, cy - h * 18), (cx + half, cy + 5), (cx, cy + 5)],
               shade(colr, LIGHT_RIGHT_F))


def draw_reed(c: Canvas, col: float, row: float, scene: dict) -> None:
    for i, dx in enumerate((0.36, 0.5, 0.64)):
        x, y = project_s(col + dx, row + 0.5, 0.0)
        h = 26 + i * 6
        c.line([(x, y), (x + (i - 1) * 2, y - h)], scene["foliage"], width=3)


# --- hazards ---------------------------------------------------------------

def draw_car(c: Canvas, col: float, row: float, scene: dict, body: str) -> None:
    cast_shadow(c, col, row, 0.78, 0.55)
    """A car in four masses: chassis, cabin, roof, plus glazing and wheels.

    Drawn as one cuboid it reads as a coloured slab. The cabin is what makes
    it read as a vehicle, and the wheels are what make it read as moving.
    """
    dark = shade(body, 0.58)

    # Chassis: long and low, so it has a nose and a tail.
    cube(c, col + 0.00, row + 0.08, 0.0, 0.20, dark)
    cube(c, col + 0.04, row + 0.12, 0.20, 0.16, body)
    # Cabin: set back from the nose, narrower than the chassis.
    cube(c, col + 0.26, row + 0.16, 0.36, 0.20, shade(body, 0.86))
    # Roof catches the light and defines the top plane.
    cube(c, col + 0.28, row + 0.18, 0.56, 0.07, shade(body, 1.18))

    # Glazing on the cabin's two visible faces.
    gx, gy = project_s(col + 0.26, row + 0.16, 0.50)
    c.poly([(gx, gy - 1), (gx + 9, gy + 5), (gx + 9, gy + 10), (gx, gy + 4)], "#cfe6f5")
    hx, hy = project_s(col + 0.46, row + 0.34, 0.50)
    c.poly([(hx, hy - 1), (hx - 9, hy + 5), (hx - 9, hy + 10), (hx, hy + 4)], "#cfe6f5")

    # Wheels on the near flank.
    for dr in (0.20, 0.44):
        wx, wy = project_s(col + 0.16, row + dr, 0.0)
        c.ellipse(wx, wy + 4, 4.4, 4.4, "#1c1c20")
        c.ellipse(wx, wy + 4, 2.0, 2.0, "#8d9096")

    # Headlights at the nose.
    for dr in (0.18, 0.40):
        lx, ly = project_s(col + 1.0, row + dr, 0.26)
        c.ellipse(lx, ly, 3.0, 2.2, "#fff3c0")


def draw_truck(c: Canvas, col: float, row: float, scene: dict, body: str) -> None:
    tile_shadow(c, col, row, opacity=22)
    cube(c, col + 0.00, row + 0.05, 0.0, 0.34, shade(body, 0.64))
    cube(c, col + 0.04, row + 0.09, 0.34, 0.42, body)
    cube(c, col + 0.72, row + 0.09, 0.34, 0.30, shade(body, 0.84))
    x, y = project_s(col + 0.38, row + 0.09, 0.78)
    c.poly([(x - 16, y), (x + 16, y), (x + 10, y - 7), (x - 10, y - 7)],
           shade(body, 1.20))


def draw_log(c: Canvas, col: float, row: float, scene: dict) -> None:
    """A log: a long low body with visible end grain. The concentric end
    face is what makes it read as timber rather than as a brown box."""
    tile_shadow(c, col, row, opacity=18)
    wood = _log_colour(scene)
    end = shade(wood, 1.28)
    cube(c, col + 0.00, row + 0.04, 0.0, 0.26, shade(wood, 0.80))
    cube(c, col + 0.02, row + 0.08, 0.26, 0.14, wood)
    ex, ey = project_s(col + 1.0, row + 0.5, 0.16)
    # Wider than tall, matching the screen axes. The previous rx=9/ry=15 was
    # rotated 90 degrees and made every log read as a mallet.
    c.ellipse(ex, ey, 17, 9, end)
    c.ellipse(ex, ey, 12, 6, shade(end, 0.86))
    c.ellipse(ex, ey, 6, 3, shade(end, 0.74))
    bx, by = project_s(col + 0.5, row + 0.18, 0.40)
    c.line([(bx - 10, by), (bx + 10, by - 2)], shade(wood, 1.16), width=2)


def draw_turtle(c: Canvas, col: float, row: float, scene: dict) -> None:
    """A turtle with a hexagonal shell, a head and a dark rim.

    Drawn as nested ellipses it was identical in shape grammar to bushes and
    rocks, so a lethal hazard looked like scenery. The hexagon, the head and
    the rim separate the three by silhouette alone, which is what survives
    greyscale.
    """
    tile_shadow(c, col, row, opacity=18)
    base = _turtle_colour(scene)
    shell, dark, skin = base, shade(base, 0.72), shade(base, 1.45)

    # Shell: a hexagon seen in plan, wider than tall on screen.
    cx, cy = project_s(col + 0.5, row + 0.5, 0.0)
    hx, hy = 15, 8
    hexpts = [
        (cx - hx, cy), (cx - hx / 2, cy - hy), (cx + hx / 2, cy - hy),
        (cx + hx, cy), (cx + hx / 2, cy + hy), (cx - hx / 2, cy + hy),
    ]
    c.poly(hexpts, dark)          # rim first, so the shell sits inside it
    hexpts_in = [(cx + (px - cx) * 0.86, cy + (py - cy) * 0.80) for px, py in hexpts]
    c.poly(hexpts_in, shell)
    # Plate lines, so the shell is not one flat lozenge.
    for frac in (0.33, 0.66):
        c.line([(cx - hx, cy), (cx + hx, cy)], shade(shell, 0.82), width=1)
    # Head, poking out of the leading end: the strongest directional cue.
    hdx, hdy = project_s(col + 1.0, row + 0.5, 0.10)
    c.ellipse(hdx, hdy, 5.0, 4.0, skin)
    c.ellipse(hdx + 1.5, hdy - 0.8, 1.4, 1.3, "#1b1b1b")
    # A highlight on the upper-left of the shell.
    c.ellipse(cx - 4, cy - 3, 4.5, 2.4, shade(shell, 1.28))


def draw_train(c: Canvas, col: float, row: float, scene: dict, body: str) -> None:
    cast_shadow(c, col, row, 0.66, 0.58)
    """A train: a long body, a sloped nose, a window band and a hazard stripe.
    Trains are the one hazard that must be unmistakable, so it gets the
    highest-contrast treatment on the board."""
    dark = shade(body, 0.56)
    cube(c, col + 0.00, row + 0.06, 0.0, 0.40, dark)
    cube(c, col + 0.02, row + 0.09, 0.40, 0.26, body)

    nx, ny = project_s(col + 1.0, row + 0.5, 0.0)
    c.poly([(nx, ny - 12), (nx - 14, ny + 6), (nx, ny + 6)], shade(body, 1.05))

    for k in range(3):
        wx, wy = project_s(col + 0.18 + k * 0.30, row + 0.06, 0.50)
        c.poly([(wx, wy - 2), (wx - 6, wy + 4), (wx - 6, wy + 10), (wx, wy + 4)], "#dff0ff")
    for k in range(3):
        rx, ry = project_s(col + 0.14 + k * 0.30, row + 0.16, 0.68)
        c.ellipse(rx, ry, 9, 4, shade(body, 1.20))

    # Hazard band: a stripe along the bottom of the near face, clipped to the
    # body. Drawn as long diagonals it covered the whole tile and read as a
    # scribble rather than as a train.
    for k in range(5):
        ax = 0.06 + k * 0.20
        p1 = project_s(col + ax, row + 0.06, 0.18)
        p2 = project_s(col + ax + 0.10, row + 0.06, 0.18)
        c.line([p1, p2], "#ffd23d", width=3)


# --- scene composition -----------------------------------------------------

# One row, one lane class. The previous version used three independent
# predicates that overlapped -- row 4 was both RAIL and WATER, rows 8 and 12
# were both ROAD and WATER -- so a rail row whose train test failed fell
# through the elif chain and spawned a log or a turtle in the train lane.
# A repeating pattern keeps the board learnable: four grass, two road, one
# rail, three water, and the loop is long enough that the eye learns it
# without spotting the seam.
LANE_CYCLE = ["grass", "grass", "grass", "grass",
              "road", "road",
              "rail",
              "water", "water", "water"]


def lane_of(row: int) -> str:
    return LANE_CYCLE[row % len(LANE_CYCLE)]


def is_hazard_lane(row: int) -> bool:
    return lane_of(row) in ("road", "rail", "water")


def render_scene(scene: dict, width: int = 620, height: int = 1000,
                 cols: int = 9, view_rows: int = 11, row0: int = 0,
                 hud: bool = True) -> Image.Image:
    """Render a window onto the board.

    A cols x rows grid always projects to a 2:1 wide diamond, so a portrait
    frame can never be filled by the whole board. The game never shows the
    whole board either — the camera follows the player. So this renders the
    same thing: a window of `view_rows` rows starting at `row0`.
    """
    c = Canvas(width, height)
    draw_sky(c, width, height, scene["sky"][0], scene["sky"][1])

    tall = 2.3 if scene["id"] == 5 else 1.5
    # Frame the window tightly. The player sits low in the view, so bias the
    # vertical centre downward to leave headroom for the lanes ahead.
    frame_view_window(cols, view_rows, width, height, row0, zmax=tall, margin=26,
                      bias_y=0.44)

    rows = list(range(row0, row0 + view_rows))

    # --- ground, with real lane classes so the board reads as the game ----
    for r in rows:
        for col_i in range(cols):
            if lane_of(r) == "road":
                base = scene["road"]
            elif lane_of(r) == "rail":
                base = scene["road"]
            elif lane_of(r) == "water":
                base = scene["water"]
            else:
                base = scene["ground"] if (r + col_i) % 2 == 0 else scene["alt"]
            tile(c, col_i, r, base)

    # --- lane texture: the non-colour identity of each lane class --------
    for r in rows:
        draw_lane_texture(c, scene, r, cols)

    # --- goal row, when it falls inside the window -----------------------
    if rows[-1] in rows:
        for col_i in range(cols):
            if col_i % 2:
                continue
            cube(c, col_i, rows[-1], 0.0, 0.20, scene["accent"])
        for col_i in range(cols):
            x, y = project_s(col_i + 0.5, rows[-1], 0.06)
            c.ellipse(x, y, 5, 2.4, shade(scene["accent"], 0.9))

    # --- hazards ---------------------------------------------------------
    hazards = []
    for r in rows[:-1]:
        for col_i in range(cols):
            if lane_of(r) == "road" and (col_i * 3 + r) % 7 == 0:
                hazards.append((col_i, r, "car"))
            elif lane_of(r) == "rail" and (col_i + r) % 4 == 0:
                hazards.append((col_i, r, "train"))
            elif lane_of(r) == "water" and (col_i * 5 + r) % 6 == 0:
                hazards.append((col_i, r, "log"))
            elif lane_of(r) == "water" and (col_i * 7 + r) % 11 == 0:
                hazards.append((col_i, r, "turtle"))

    def paint_hazard(col_i, r, kind):
        if kind == "car":
            draw_car(c, col_i, r, scene, scene["hazard"])
        elif kind == "train":
            draw_train(c, col_i, r, scene, scene["hazard2"])
        elif kind == "log":
            draw_log(c, col_i, r, scene)
        else:
            draw_turtle(c, col_i, r, scene)

    draw_sorted(hazards, paint_hazard)

    # --- scenery ---------------------------------------------------------
    scenery = []
    for r in rows[:-1]:
        for col_i in range(cols):
            if is_hazard_lane(r):
                continue
            h = (col_i * 7 + r * 5) % 13
            if h == 0:
                scenery.append((col_i, r, "tree"))
            elif h == 3:
                scenery.append((col_i, r, "bush"))
            elif h == 5 and scene["id"] == 3:
                scenery.append((col_i, r, "cactus"))
            elif h == 5 and scene["id"] == 4:
                scenery.append((col_i, r, "hay"))
            elif h == 5 and scene["id"] == 5:
                scenery.append((col_i, r, "building"))
            elif h == 5 and scene["id"] == 8:
                scenery.append((col_i, r, "cone"))
            elif h == 5 and scene["id"] == 10:
                scenery.append((col_i, r, "vent"))
            elif h == 5 and scene["id"] == 2:
                scenery.append((col_i, r, "reed"))
            elif h == 5:
                scenery.append((col_i, r, "rock"))

    def paint_scenery(col_i, r, kind):
        if kind == "tree":
            draw_tree(c, col_i, r, scene)
        elif kind == "bush":
            draw_bush(c, col_i, r, scene)
        elif kind == "cactus":
            draw_cactus(c, col_i, r, scene)
        elif kind == "hay":
            draw_haybale(c, col_i, r, scene)
        elif kind == "building":
            draw_building(c, col_i, r, scene)
        elif kind == "cone":
            draw_cone(c, col_i, r, scene)
        elif kind == "vent":
            draw_lava_vent(c, col_i, r, scene)
        elif kind == "reed":
            draw_reed(c, col_i, r, scene)
        else:
            draw_rock(c, col_i, r, scene)

    draw_sorted(scenery, paint_scenery)

    # --- the character, at the board's near vertex -----------------------
    # (0, row0) is the bottom vertex of the projected diamond, so the lanes
    # fan out upward and to both sides. That is the view a player has.
    draw_character(c, 0.0, float(row0), scale=1.7)

    if hud:
        draw_hud(c, scene, width)

    return c.to_image()


def draw_lane_texture(c: Canvas, scene: dict, row: int, cols: int) -> None:
    """Non-colour marks that identify a lane's class.

    AC-01 forbids carrying information by colour alone, and the greyscale
    render showed water vanishing against grass on ten of ten scenes. These
    marks are geometry, so they survive desaturation, colour blindness, and
    any future palette change.
    """
    lane = lane_of(row)
    for col_i in range(cols):
        if lane == "road":
            # Centre dashes, like a real carriageway.
            if col_i % 2 == 0:
                x, y = project_s(col_i + 0.5, row + 0.5, 0.02)
                c.poly([(x, y - 2), (x + 11, y + 6), (x + 11, y + 10), (x, y + 2)],
                       "#e8e2c8")
        elif lane == "rail":
            # Two rails with sleepers between them: unmistakably a railway.
            for off in (-0.28, 0.28):
                rx, ry = project_s(col_i + 0.5 + off * 0.5, row + 0.5, 0.02)
                c.line([(rx - 26, ry - 6), (rx + 26, ry + 14)], "#8a8f98", width=3)
            if col_i % 2 == 0:
                sx, sy = project_s(col_i + 0.5, row + 0.5, 0.015)
                c.line([(sx - 8, sy - 4), (sx + 8, sy + 5)], "#5c4a3a", width=4)
        elif lane == "water":
            # Wave chevrons, offset per row so the water reads as moving.
            w, h = 12, 6
            for k in range(2):
                wx, wy = project_s(col_i + 0.28 + k * 0.44, row + 0.5, 0.015)
                shift = (row % 2) * 5
                c.poly([(wx - w, wy + shift), (wx - w / 2, wy - h + shift),
                        (wx, wy + shift), (wx + w / 2, wy - h + shift),
                        (wx + w, wy + shift)], shade(scene["water"], 1.45))


def draw_hud(c: Canvas, scene: dict, width: int) -> None:
    """A small stage banner, drawn as a real overlay rather than baked into
    the world, so the scene itself stays clean."""
    f = font(19)
    label = f"{scene['id']}. {scene['name']}"
    tw = c.draw.textlength(label, font=f)
    box_w, box_h = tw + 36, 44
    c.rrect(16, 16, 16 + box_w, 16 + box_h, 12, "#00000088")
    # Stage numeral in the accent colour, name in white.
    c.draw.text((c.s(30), c.s(27)), label, font=f, fill=(255, 255, 255, 255))


# --- sheets ----------------------------------------------------------------

def render_stage_sheet() -> Image.Image:
    tw, th, pad = 380, 300, 12
    sheet = Image.new("RGB", (5 * tw + 6 * pad, 2 * th + 3 * pad), "#0d0f13")
    for i, scene in enumerate(SCENES):
        img = render_scene(scene, width=tw, height=th, cols=7, view_rows=8, row0=2, hud=False)
        sheet.paste(img.convert("RGB"),
                    (pad + (i % 5) * (tw + pad), pad + (i // 5) * (th + pad)))
    d = ImageDraw.Draw(sheet)
    f = font(13)
    for i, scene in enumerate(SCENES):
        x = pad + (i % 5) * (tw + pad)
        y = pad + (i // 5) * (th + pad)
        d.text((x + 8, y + 6), f"{scene['id']}. {scene['name']}", font=f,
               fill=(255, 255, 255, 255))
    return sheet


def render_palette_strip() -> Image.Image:
    """Measured hazard-on-ground contrast. This is the accessibility sheet."""
    cell_w, cell_h = 170, 96
    w = cell_w * 5
    h = 56 + cell_h * 2
    img = Image.new("RGB", (w, h), "#0d0f13")
    d = ImageDraw.Draw(img)
    d.text((12, 14), "Hazard-on-ground contrast (WCAG). Target >= 3.0",
           font=font(15), fill=(255, 255, 255))
    f = font(12)
    for i, scene in enumerate(SCENES):
        x = 12 + (i % 5) * cell_w
        y = 46 + (i // 5) * cell_h
        d.rectangle([x, y, x + cell_w - 18, y + 40], fill=hex_to_rgb(scene["ground"]))
        d.rectangle([x + 14, y + 12, x + 58, y + 30], fill=hex_to_rgb(scene["hazard"]))
        ratio = contrast_ratio(scene["hazard"], scene["ground"])
        d.text((x + 68, y + 12), f"{ratio:.2f}:1", font=f,
               fill=(255, 220, 120) if ratio >= 3 else (255, 90, 90))
        d.text((x, y + 46), f"{scene['id']}. {scene['name']}"[:17], font=f,
               fill=(215, 215, 215))
    return img


def render_character_sheet() -> Image.Image:
    """The character at the sizes it is actually seen, plus a hop sequence.
    A silhouette that only works large is a bug."""
    w, h = 1000, 360
    img = Image.new("RGB", (w, h), "#1b1f27")
    d = ImageDraw.Draw(img)
    d.text((14, 10), "size ladder", font=font(14), fill=(215, 215, 215))
    x = 14
    for scale, label in ((1.8, "hero"), (1.15, "board"), (0.75, "phone"), (0.5, "thumb")):
        c = Canvas(150, 210, "#6f9450")
        frame_view(1, 1, 150, 210, zmax=1.6 * scale, margin=20)
        tile(c, 0, 0, "#7ba05b")
        draw_character(c, 0.0, 0.0, scale=scale)
        img.paste(c.to_image().convert("RGB"), (x, 32))
        d.text((x + 4, 250), label, font=font(12), fill=(200, 200, 200))
        x += 160

    d.text((w - 360, 10), "hop sequence", font=font(14), fill=(215, 215, 215))
    frames = [("anticipate", 0.0, 0.82, 1.16), ("launch", 0.55, 1.00, 1.24),
              ("apex", 0.85, 1.00, 1.02), ("fall", 0.50, 1.00, 0.98),
              ("land", 0.0, 1.16, 0.80)]
    fx = w - 372
    for name, lift, sx, sy in frames:
        c = Canvas(64, 180, "#6f9450")
        frame_view(1, 1, 64, 180, zmax=1.5, margin=8)
        tile(c, 0, 0, "#7ba05b")
        if lift > 0:
            shx, shy = project_s(0.5, 0.5, 0.0)
            c.ellipse(shx, shy + 16, 11 * (1.4 - lift), 4 * (1.4 - lift), (0, 0, 0, 70))
        draw_character(c, 0.0, 0.0, scale=0.95 * sy, z=lift)
        img.paste(c.to_image().convert("RGB"), (fx, 32))
        d.text((fx, 220), name, font=font(11), fill=(190, 190, 190))
        fx += 70
    return img


def render_greyscale() -> Image.Image:
    """The same scene desaturated.

    AC-01 requires that no information is carried by colour alone. A greyscale
    render is the only direct evidence that the lane classes, the hazards and
    the player are still distinguishable without hue. Left half colour, right
    half greyscale, so the comparison is immediate.
    """
    scene = SCENES[0]
    colour_img = render_scene(scene, width=440, height=340, cols=7,
                              view_rows=8, row0=2, hud=False).convert("RGB")
    grey_img = colour_img.convert("L").convert("RGB")

    out = Image.new("RGB", (colour_img.width * 2 + 12, colour_img.height), "#0d0f13")
    out.paste(colour_img, (0, 0))
    out.paste(grey_img, (colour_img.width + 12, 0))

    d = ImageDraw.Draw(out)
    f = font(13)
    d.text((10, 8), "colour", font=f, fill=(255, 255, 255))
    d.text((colour_img.width + 22, 8), "greyscale — AC-01 check", font=f, fill=(255, 255, 255))
    return out


def render_roster() -> Image.Image:
    """All six roster members, at the sizes they are actually seen, colour and
    greyscale side by side. The greyscale half is the test: if two characters
    are only told apart by hue, this sheet shows it."""
    cell_w, cell_h, gap = 150, 250, 8
    w = 3 * cell_w + 4 * 12
    rows = 2 * ((len(ROSTER) + 2) // 3)      # colour block, then greyscale block
    h = 28 + rows * cell_h + (rows + 1) * gap + 14
    img = Image.new("RGB", (w, h), "#1b1f27")
    d = ImageDraw.Draw(img)
    f = font(12); fb = font(14)

    d.text((12, 6), "roster — colour (top) and greyscale (bottom)", font=fb,
           fill=(220, 220, 220))

    for row_block, grey in ((0, False), (1, True)):
        y0 = 28 + row_block * (((len(ROSTER) + 2) // 3) * (cell_h + gap) + gap)
        for i, ch in enumerate(ROSTER):
            x0 = 12 + (i % 3) * (cell_w + 12)
            y1 = y0 + (i // 3) * (cell_h + gap)
            c = Canvas(cell_w, cell_h, "#6f9450")
            frame_view_window(1, 1, cell_w, cell_h, 0.0, zmax=1.9 * ch["earScale"],
                              margin=14, bias_y=0.50)
            tile(c, 0, 0, "#7ba05b")
            draw_character(c, 0.0, 0.0, scale=1.15, ch=ch)
            sub = c.to_image().convert("RGB")
            if grey:
                sub = sub.convert("L").convert("RGB")
            img.paste(sub, (x0, y1))
            d.text((x0 + 4, y1 + cell_h - 22), ch["name"], font=f,
                   fill=(255, 255, 255) if not grey else (200, 200, 200))
            d.text((x0 + 4, y1 + cell_h - 9), ch["earKind"], font=font(9),
                   fill=(170, 170, 170))
    return img


def render_props() -> Image.Image:
    """Every hazard and prop each stage declares, rendered.

    This is the answer to "are all the stage graphics created": a stage with
    a missing asset shows an empty slot here rather than silently rendering
    without it.
    """
    from iso import luminance

    hazard_fns = {
        "car": "draw_car", "tractor": "draw_tractor", "tram": "draw_tram",
        "train": "draw_train", "log": "draw_log", "turtle": "draw_turtle",
        "sled": "draw_sled", "animal": "draw_animal", "steel": "draw_steel",
        "forklift": "draw_forklift", "tumbleweed": "draw_tumbleweed",
        "crack": "draw_crack", "lightning": "draw_bolt", "lava": "draw_lava",
    }
    scenery_fns = {
        "tree": "draw_tree", "bush": "draw_bush", "cactus": "draw_cactus",
        "rock": "draw_rock", "haybale": "draw_haybale", "building": "draw_building",
        "cone": "draw_cone", "lavaVent": "draw_lava_vent", "reed": "draw_reed",
        "neon": "draw_building", "hedge": "draw_bush", "mailbox": "draw_cone",
        "fence": "draw_haybale", "iceberg": "draw_rock", "vine": "draw_reed",
        "fern": "draw_bush", "scaffold": "draw_building", "crate": "draw_rock", "boulder": "draw_boulder", "pine": "draw_pine",
        "pylon": "draw_building", "debris": "draw_rock", "obsidian": "draw_rock",
        "bone": "draw_rock",
    }

    cell_w, cell_h = 150, 190
    cols_per = 7
    w = cols_per * cell_w + (cols_per + 1) * 8
    h = len(SCENES) * (cell_h + 22) + 40
    img = Image.new("RGB", (w, h), "#14171d")
    d = ImageDraw.Draw(img)
    d.text((10, 8), "every asset each stage declares — an empty slot means a missing renderer",
           font=font(13), fill=(220, 220, 220))

    missing = []
    for si, scene in enumerate(SCENES):
        y0 = 34 + si * (cell_h + 22)
        d.text((10, y0 + 4), "%d. %s" % (scene["id"], scene["name"]),
               font=font(12), fill=(255, 255, 255))
        items = ([(k, hazard_fns.get(k)) for k in scene["hazardKinds"]]
                 + [(k, scenery_fns.get(k)) for k in scene["scenery"]])
        for i, (kind, fn) in enumerate(items):
            x0 = 92 + i * cell_w
            if x0 + cell_w > w:
                break
            c = Canvas(cell_w - 8, cell_h - 8, scene["ground"])
            frame_view_window(1, 1, cell_w - 8, cell_h - 8, 0.0, zmax=2.0,
                              margin=8, bias_y=0.48)
            tile(c, 0, 0, scene["ground"])
            if fn is None:
                missing.append((scene["id"], kind))
                d.rectangle([x0, y0, x0 + cell_w - 10, y0 + cell_h - 10],
                            outline=(220, 60, 60), width=2)
                d.text((x0 + 12, y0 + 70), "MISSING", font=font(13), fill=(255, 90, 90))
            else:
                if fn == "draw_car":
                    globals()[fn](c, 0.0, 0.0, scene, scene["hazard"])
                else:
                    globals()[fn](c, 0.0, 0.0, scene)
            img.paste(c.to_image().convert("RGB"), (x0, y0))
            d.text((x0 + 2, y0 + cell_h - 8), kind[:16], font=font(9),
                   fill=(190, 190, 190))
    if missing:
        print("MISSING RENDERERS: %s" % missing)
    else:
        print("every declared asset has a renderer")
    return img


def render_hero() -> Image.Image:
    """Portrait, because that is the shape the game is played in. A landscape
    hero wastes the frame and misrepresents the product."""
    return render_scene(SCENES[0], width=1000, height=720, cols=11, view_rows=13, row0=0, hud=True)


GROUPS = {
    "roster": render_roster,
    "props": render_props,
    "greyscale": render_greyscale,
    "hero": render_hero,
    "stages": render_stage_sheet,
    "character": render_character_sheet,
    "contrast": render_palette_strip,
}


def main() -> int:
    which = sys.argv[1:] or list(GROUPS)
    for name in which:
        fn = GROUPS.get(name)
        if fn is None:
            print(f"unknown group {name!r}; known: {', '.join(GROUPS)}")
            return 1
        path = ART / f"{name}.png"
        fn().save(path)
        print(f"  wrote {path.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
