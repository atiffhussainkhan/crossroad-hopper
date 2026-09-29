"""iso.py — isometric drawing primitives for the lane-crossing game.

A small 2:1 dimetric projection engine on top of PIL. Everything the game
draws is built from these primitives, so the art is code, not assets.

Projection
    A tile is TILE_W wide and TILE_H tall on screen, a 2:1 ratio, which is
    the classic isometric dimetric look. A block of world height z is lifted
    by BLOCK_H pixels per unit.

Lighting
    One light direction, upper-left and slightly frontal. The three visible
    faces of a cube are shaded top=1.00, left=0.74, right=0.54 of the base
    colour. Fixing this in one place is what makes a scene read as coherent
    rather than as a pile of coloured polygons.

Antialiasing
    The renderer draws at SS times the target size and downsamples with
    LANCZOS. Isometric art is almost entirely diagonal edges, and without
    supersampling those edges crawl visibly.
"""

from __future__ import annotations

import math
from typing import Iterable, Sequence

from PIL import Image, ImageDraw

# --- projection constants --------------------------------------------------

TILE_W = 64
TILE_H = 32
BLOCK_H = 22

SS = 3  # supersample factor

# --- lighting --------------------------------------------------------------

LIGHT_TOP = 1.00
LIGHT_LEFT = 0.876
LIGHT_RIGHT = 0.761

# --- colour helpers --------------------------------------------------------


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return lo if v < lo else hi if v > hi else v


def _rgba(colour, alpha: int = 255) -> tuple[int, int, int, int]:
    """Accept '#rrggbb', '#rrggbbaa', an (r,g,b) tuple, or an (r,g,b,a) tuple."""
    if isinstance(colour, (tuple, list)):
        vals = list(colour)[:4]
        while len(vals) < 3:
            vals.append(0)
        if len(vals) == 3:
            vals.append(alpha)
        return tuple(int(v) for v in vals)
    value = colour.lstrip("#")
    if len(value) == 8:
        return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16), int(value[6:8], 16))
    return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16), alpha)


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16))


def rgb_to_hex(rgb: Sequence[float]) -> str:
    r, g, b = (int(clamp(c, 0, 255)) for c in rgb)
    return f"#{r:02x}{g:02x}{b:02x}"


def shade(colour: str, factor: float) -> str:
    """Multiply a colour's brightness. Factor > 1 lightens toward white."""
    r, g, b = hex_to_rgb(colour)
    if factor <= 1.0:
        return rgb_to_hex((r * factor, g * factor, b * factor))
    t = factor - 1.0
    return rgb_to_hex(
        (r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t)
    )


def mix(a: str, b: str, t: float) -> str:
    """Linear blend between two hex colours. t=0 gives a, t=1 gives b."""
    ar, ag, ab = hex_to_rgb(a)
    br, bg, bb = hex_to_rgb(b)
    return rgb_to_hex((ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t))


def _linearise(channel: int) -> float:
    """sRGB 8-bit channel to linear light. WCAG contrast requires this; using
    gamma-encoded values directly overstates dark-on-dark contrast and
    understates light-on-light. The previous version skipped it and
    misreported #777777-on-white as 2.03 when the true ratio is 4.48."""
    c = channel / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminance(colour: str) -> float:
    r, g, b = hex_to_rgb(colour)
    return (0.2126 * _linearise(r) + 0.7152 * _linearise(g) + 0.0722 * _linearise(b))


def contrast_ratio(a: str, b: str) -> float:
    """WCAG relative-contrast ratio. Used to keep hazards off the ground."""
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


# --- projection ------------------------------------------------------------
#
# Convention: a forward hop increases `row`, and forward is UP the screen.
# That is why the y term is negated. Getting this backwards is the single
# most common way an isometric scene ends up unreadable, so the sign lives
# here and nowhere else.

_VIEW = {"ox": 0.0, "oy": 0.0, "scale": 1.0}


def set_view(ox: float, oy: float, scale: float = 1.0) -> None:
    """Set the view transform applied by project_s."""
    _VIEW["ox"] = ox
    _VIEW["oy"] = oy
    _VIEW["scale"] = scale


def get_view() -> dict:
    return _VIEW


def project(col: float, row: float, z: float = 0.0) -> tuple[float, float]:
    """Screen position of grid cell (col, row) raised by world-height z.

    Note the sign on the z term. Image coordinates grow downward, so raising
    a solid must SUBTRACT height, not add it. With `+ z * BLOCK_H` every cube
    rendered lit-from-below, trees hung upside down with the trunk beneath the
    canopy, and the character's face sat under its chin.
    """
    x = (col - row) * (TILE_W / 2.0)
    y = -(col + row) * (TILE_H / 2.0) - z * BLOCK_H
    return x, y


def project_s(col: float, row: float, z: float = 0.0) -> tuple[float, float]:
    """project(), with the view transform applied, in final-image pixels."""
    x, y = project(col, row, z)
    s = _VIEW["scale"]
    return x * s + _VIEW["ox"], y * s + _VIEW["oy"]


def frame_view(cols: int, rows: int, width: int, height: int,
               zmax: float = 0.0, margin: int = 40) -> None:
    """Centre a cols x rows grid in a width x height canvas.

    Computes the projected bounds of the whole board, including its height,
    then sets the offset that puts the middle of those bounds in the middle
    of the canvas. Without this the board sits in a corner.
    """
    xs, ys = [], []
    for col in (0.0, cols):
        for row in (0.0, rows):
            for z in (0.0, zmax):
                x, y = project(col, row, z)
                xs.append(x)
                ys.append(y)
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    bw, bh = maxx - minx, maxy - miny

    # Shrink to fit if the board is larger than the canvas.
    scale = 1.0
    if bw + margin * 2 > width or bh + margin * 2 > height:
        scale = min((width - margin * 2) / bw, (height - margin * 2) / bh)

    ox = width / 2 - (minx + maxx) / 2 * scale
    oy = height / 2 - (miny + maxy) / 2 * scale
    set_view(ox, oy, scale)


# --- primitive drawing (supersampled space) --------------------------------


class Canvas:
    """A supersampled drawing surface.

    All coordinates given to this class are in final-image pixels; it scales
    them up internally. That keeps scene code readable and independent of the
    antialiasing factor.
    """

    def __init__(self, width: int, height: int, background: str = "#000000"):
        self.out_w = width
        self.out_h = height
        self.img = Image.new("RGBA", (width * SS, height * SS), _rgba(background))
        self.draw = ImageDraw.Draw(self.img, "RGBA")
        self._scratch = Image.new("RGBA", self.img.size, (0, 0, 0, 0))
        self._scratch_draw = ImageDraw.Draw(self._scratch)

    def blend_poly(self, points, rgba) -> None:
        """Alpha-blend a polygon.

        PIL's ImageDraw in "RGBA" mode on an RGBA base image REPLACES the
        destination pixels rather than compositing over them, so a shadow
        drawn that way comes out fully opaque no matter what alpha it was
        given. Every shadow in this renderer was a black hole because of it.
        The only correct route is a scratch layer plus alpha_composite.
        """
        self._scratch.paste((0, 0, 0, 0), (0, 0) + self._scratch.size)
        self._scratch_draw.polygon(points, fill=rgba)
        self.img.alpha_composite(self._scratch)

    def s(self, v: float) -> float:
        return v * SS

    def poly(self, points: Iterable[tuple[float, float]], fill: str) -> None:
        pts = [(self.s(x), self.s(y)) for x, y in points]
        if len(pts) >= 3:
            self.draw.polygon(pts, fill=_rgba(fill))

    def line(self, points: Iterable[tuple[float, float]], fill: str, width: float = 1.0) -> None:
        pts = [(self.s(x), self.s(y)) for x, y in points]
        if len(pts) >= 2:
            self.draw.line(pts, fill=_rgba(fill), width=max(1, int(self.s(width))))

    def ellipse(self, cx: float, cy: float, rx: float, ry: float, fill: str) -> None:
        self.draw.ellipse(
            [self.s(cx - rx), self.s(cy - ry), self.s(cx + rx), self.s(cy + ry)],
            fill=_rgba(fill),
        )

    def rect(self, x0: float, y0: float, x1: float, y1: float, fill: str) -> None:
        self.draw.rectangle(
            [self.s(x0), self.s(y0), self.s(x1), self.s(y1)],
            fill=_rgba(fill),
        )

    def rrect(self, x0, y0, x1, y1, radius, fill) -> None:
        self.draw.rounded_rectangle(
            [self.s(x0), self.s(y0), self.s(x1), self.s(y1)],
            radius=self.s(radius),
            fill=_rgba(fill),
        )

    def to_image(self) -> Image.Image:
        return self.img.resize((self.out_w, self.out_h), Image.LANCZOS)

    def save(self, path: str) -> None:
        self.to_image().save(path)


# --- cube geometry ---------------------------------------------------------


def cube(c: Canvas, col: float, row: float, base_z: float, height: float, colour: str) -> None:
    """One isometric cube: top, left and right faces, lit consistently."""
    top = shade(colour, LIGHT_TOP)
    left = shade(colour, LIGHT_LEFT)
    right = shade(colour, LIGHT_RIGHT)

    # Top rhombus.
    c.poly(
        [
            project_s(col, row, base_z + height),
            project_s(col + 1, row, base_z + height),
            project_s(col + 1, row + 1, base_z + height),
            project_s(col, row + 1, base_z + height),
        ],
        top,
    )
    # Left face (toward -col).
    c.poly(
        [
            project_s(col, row, base_z),
            project_s(col, row + 1, base_z),
            project_s(col, row + 1, base_z + height),
            project_s(col, row, base_z + height),
        ],
        left,
    )
    # Right face. It lies in the row+1 plane, not the col+1 plane. Drawing
    # it on col+1 put it behind the cube, where it overpainted the TOP face
    # and left the real right face undrawn -- every solid on the board was a
    # 3/4 box with a truncated top.
    c.poly(
        [
            project_s(col, row + 1, base_z),
            project_s(col + 1, row + 1, base_z),
            project_s(col + 1, row + 1, base_z + height),
            project_s(col, row + 1, base_z + height),
        ],
        right,
    )


def tile(c: Canvas, col: float, row: float, colour: str, height: float = 0.0) -> None:
    """A flat ground tile. Drawn as a rhombus so it reads as ground, not a slab."""
    c.poly(
        [
            project_s(col, row, height),
            project_s(col + 1, row, height),
            project_s(col + 1, row + 1, height),
            project_s(col, row + 1, height),
        ],
        colour,
    )


def tile_shadow(c: Canvas, col: float, row: float, opacity: int = 18) -> None:
    """Contact shadow under an object, offset toward the light's opposite."""
    pts = [
        project_s(col + 0.06, row + 0.10, 0.0),
        project_s(col + 0.94, row + 0.10, 0.0),
        project_s(col + 0.94, row + 0.96, 0.0),
        project_s(col + 0.06, row + 0.96, 0.0),
    ]
    c.blend_poly([(c.s(x), c.s(y)) for x, y in pts], (0, 0, 0, opacity))
    # A contact shadow is a hint, not a hole. Opaque black here made
    # every prop sitting on one unreadable on the props sheet.


def frame_bounds(cols: Iterable[float], rows: Iterable[float], zmin: float = 0.0,
                 zmax: float = 0.0) -> tuple[float, float, float, float]:
    """Screen-space bounding box of a grid region, in final pixels."""
    xs, ys = [], []
    for col in cols:
        for row in rows:
            for z in (zmin, zmax):
                x, y = project_s(col, row, z)
                xs.append(x)
                ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


def frame_view_window(cols: int, view_rows: int, width: int, height: int,
                      row0: float = 0.0, zmax: float = 0.0,
                      margin: int = 20, bias_y: float = 0.54,
                      zoom: float = 1.0) -> None:
    """Centre a window of rows [row0, row0+view_rows) in the canvas.

    `zoom` deliberately crops: 1.0 fits the whole window, and a value above
    1.0 lets the board run off the sides, which is how a game camera frames a
    world wider than the screen. A portrait frame cannot be filled by an
    isometric board, which is always 2:1, so the caller picks the aspect.

    `bias_y` places the board a little below centre, leaving sky above it so
    the scene reads as having a horizon.
    """
    xs, ys = [], []
    for col in (0.0, cols):
        for row in (row0, row0 + view_rows):
            for z in (0.0, zmax):
                x, y = project(col, row, z)
                xs.append(x)
                ys.append(y)
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    bw, bh = max(maxx - minx, 1e-6), max(maxy - miny, 1e-6)

    scale = min((width - margin * 2) / bw, (height - margin * 2) / bh) * zoom

    ox = width / 2 - (minx + maxx) / 2 * scale
    oy = height * bias_y - (miny + maxy) / 2 * scale
    set_view(ox, oy, scale)


def cube_frac(c: Canvas, col: float, row: float, size_col: float, size_row: float,
              base_z: float, height: float, colour: str) -> None:
    """A cube of arbitrary footprint, in tiles.

    `cube()` spans a full 1x1 cell, which is fine for terrain but fatal for
    anything that should be narrower than a tile: a tree trunk, a cactus arm,
    a rock base. Those were all being drawn as full-tile slabs, which is why
    every tree read as a crate with a disc on it and why the trunk was 64px
    wide at every zoom level.

    This is the same lighting model as `cube()`, just parameterised.
    """
    c0, c1 = col, col + size_col
    r0, r1 = row, row + size_row
    top = shade(colour, LIGHT_TOP)
    left = shade(colour, LIGHT_LEFT)
    right = shade(colour, LIGHT_RIGHT)

    c.poly([project_s(c0, r0, base_z + height), project_s(c1, r0, base_z + height),
            project_s(c1, r1, base_z + height), project_s(c0, r1, base_z + height)], top)
    c.poly([project_s(c0, r0, base_z), project_s(c0, r1, base_z),
            project_s(c0, r1, base_z + height), project_s(c0, r0, base_z + height)], left)
    c.poly([project_s(c1, r0, base_z), project_s(c1, r1, base_z),
            project_s(c1, r1, base_z + height), project_s(c1, r0, base_z + height)], right)


def blob(c: Canvas, col: float, row: float, size_col: float, size_row: float,
         base_z: float, height: float, colour: str, round_top: float = 0.0) -> None:
    """A cube with its top corners pulled in, which reads as foliage.

    A canopy built from plain cubes is a ziggurat. Pinching the top face
    toward the centre turns each lobe into a rounded mass, and because the
    lighting still comes from the three face factors it obeys the same
    convention as everything else on the board.
    """
    k = round_top
    c0, c1 = col, col + size_col
    r0, r1 = row, row + size_row
    mid_c, mid_r = (c0 + c1) / 2, (r0 + r1) / 2
    zt, zb = base_z + height, base_z

    c.poly([project_s(mid_c, r0, zt), project_s(c1, mid_r, zt),
            project_s(mid_c, r1, zt), project_s(c0, mid_r, zt)],
           shade(colour, LIGHT_TOP))
    c.poly([project_s(c0, r0, zb), project_s(c0, r1, zb),
            project_s(c0, r1, zt), project_s(c0, r0, zt)], shade(colour, LIGHT_LEFT))
    c.poly([project_s(c0, r1, zb), project_s(c1, r1, zb),
            project_s(c1, r1, zt), project_s(c0, r1, zt)], shade(colour, LIGHT_RIGHT))
    # Cap the four vertical corners so the mass is rounded, not square.
    # The (c0,r0) corner faces the CAMERA. Painting it at LIGHT_TOP put the
    # brightest value in the scene on a vertical panel, which is a second
    # frontal light source. It takes the dark factor now.
    for cc, rr in ((c0, r0), (c1, r1)):
        c.poly([project_s(cc, rr, zb), project_s(cc, rr, zt),
                project_s(mid_c, rr, zt), project_s(mid_c, rr, zb)],
               shade(colour, LIGHT_RIGHT if (cc, rr) == (c0, r0) else LIGHT_LEFT))
    for cc, rr in ((c1, r0), (c0, r1)):
        c.poly([project_s(cc, rr, zb), project_s(cc, rr, zt),
                project_s(cc, mid_r, zt), project_s(cc, mid_r, zb)],
               shade(colour, LIGHT_RIGHT if cc == c1 else LIGHT_LEFT))


def cast_shadow(c: Canvas, col: float, row: float, height: float,
               length: float = 0.30) -> None:
    """A shadow an object throws onto the ground, away from the light.

    The scene had contact shadows only, so every object sat on the board like
    a sticker: nothing told the eye the object was above the ground. A cast
    shadow is the cheapest way to sell height in an isometric scene.

    Direction. Light is upper-left frontal. In this projection +col moves
    right and up, +row moves left and up, so "away from the light" is +col and
    -row.

    The first implementation offset the whole footprint and drew a second full
    copy further out. At a plausible length that produced near-black wedges
    that swallowed the board. A cast shadow is a SKEWED parallelogram that
    tapers away from the object, and it has to stay light: it is a hint about
    height, not a hole in the ground.
    """
    dx, dy = length, -length
    # Footprint corners, and the same corners pushed out along the light axis
    # by an amount proportional to the object's height.
    foot = [(0.26, 0.26), (0.74, 0.26), (0.74, 0.74), (0.26, 0.74)]
    reach = 0.16 + 0.30 * height

    near = [project_s(col + a, row + b, 0.0) for a, b in foot]
    far = [project_s(col + a + dx * reach, row + b + dy * reach, 0.0) for a, b in foot]

    c.blend_poly([(c.s(x), c.s(y)) for x, y in near], (0, 0, 0, 46))
    c.blend_poly([(c.s(x), c.s(y)) for x, y in far], (0, 0, 0, 22))
