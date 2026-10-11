#!/usr/bin/env python3
"""Verify library model coverage and actual glTF/GLB geometry/animation bytes.

This checks the new 3D assets separately from the legacy 2D fallback gates.
It does not emulate WebGL; the live module still requires browser rendering QA.
"""
from __future__ import annotations

import base64
import hashlib
import json
import math
import struct
from pathlib import Path
from urllib.parse import unquote, urlsplit

from js_runtime import ROOT, SIM_MODULES, run_script

MODELS = ROOT / "assets/models"
COMPONENTS = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}
COUNTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4,
          "MAT2": 4, "MAT3": 9, "MAT4": 16}


def local_path(base: Path, uri: str) -> Path:
    decoded = unquote(uri)
    parsed = urlsplit(decoded)
    if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment or "\\" in decoded:
        raise ValueError(f"dependency must be a plain local path: {uri}")
    if Path(decoded).is_absolute() or ".." in Path(decoded).parts:
        raise ValueError(f"dependency escapes its asset folder: {uri}")
    result = (base / decoded).resolve()
    if not result.is_relative_to(MODELS.resolve()) or not result.is_file():
        raise ValueError(f"dependency missing or outside model library: {uri}")
    return result


def read_uri(base: Path, uri: str) -> bytes:
    if uri.startswith("data:"):
        header, payload = uri.split(",", 1)
        if ";base64" not in header:
            raise ValueError("embedded model data must be base64")
        return base64.b64decode(payload, validate=True)
    return local_path(base, uri).read_bytes()


class Model:
    def __init__(self, path: Path):
        self.path = path
        binary = None
        if path.suffix == ".glb":
            raw = path.read_bytes()
            magic, version, length = struct.unpack_from("<4sII", raw)
            if magic != b"glTF" or version != 2 or length != len(raw):
                raise ValueError("invalid GLB header/version/length")
            at, chunks = 12, []
            while at < length:
                size, kind = struct.unpack_from("<II", raw, at)
                at += 8
                if size % 4 or at + size > length:
                    raise ValueError("invalid GLB chunk length")
                chunks.append((kind, raw[at:at + size]))
                at += size
            if not chunks or chunks[0][0] != 0x4E4F534A:
                raise ValueError("GLB must begin with a JSON chunk")
            self.data = json.loads(chunks[0][1])
            binary = next((content for kind, content in chunks if kind == 0x004E4942), None)
        elif path.suffix == ".gltf":
            self.data = json.loads(path.read_text())
        else:
            raise ValueError("model must be glTF or GLB")
        if self.data.get("asset", {}).get("version") != "2.0":
            raise ValueError("model must use glTF 2.0")
        self.buffers = []
        for index, spec in enumerate(self.data.get("buffers", [])):
            content = read_uri(path.parent, spec["uri"]) if "uri" in spec else binary
            if content is None or len(content) < spec["byteLength"]:
                raise ValueError(f"buffer {index} is missing or truncated")
            self.buffers.append(content[:spec["byteLength"]])
        self.views = self.data.get("bufferViews", [])
        for index, view in enumerate(self.views):
            start, size = view.get("byteOffset", 0), view["byteLength"]
            if start < 0 or size < 0 or start + size > len(self.buffers[view["buffer"]]):
                raise ValueError(f"buffer view {index} exceeds its buffer")
        for image in self.data.get("images", []):
            if "uri" in image:
                if not read_uri(path.parent, image["uri"]):
                    raise ValueError("image dependency is empty")
            elif "bufferView" not in image or not image.get("mimeType"):
                raise ValueError("embedded image lacks buffer view or MIME type")
            else:
                self.views[image["bufferView"]]
        self.accessors = self.data.get("accessors", [])
        self.values = {}
        # Validate every accessor, including skin matrices and unused normals.
        for index in range(len(self.accessors)):
            self.decode(index)

    def read_elements(self, view_index, byte_offset, count, offsets, component, element_width=None):
        view = self.views[view_index]
        size = struct.calcsize("<" + component)
        width = element_width or offsets[-1] + size
        stride = view.get("byteStride", width)
        if count < 1 or stride < width or byte_offset < 0:
            raise ValueError("invalid accessor count/stride/offset")
        required = byte_offset + stride * (count - 1) + width
        if required > view["byteLength"]:
            raise ValueError("accessor reads beyond its buffer view")
        raw = self.buffers[view["buffer"]]
        start = view.get("byteOffset", 0) + byte_offset
        return [tuple(struct.unpack_from("<" + component, raw, start + stride * i + off)[0]
                      for off in offsets) for i in range(count)]

    def decode(self, index):
        if index in self.values:
            return self.values[index]
        spec = self.accessors[index]
        component = COMPONENTS[spec["componentType"]]
        size = struct.calcsize("<" + component)
        kind, count = spec["type"], spec["count"]
        if count < 1:
            raise ValueError(f"accessor {index} is empty")
        if kind.startswith("MAT"):
            side = int(kind[-1])
            column = (side * size + 3) // 4 * 4
            offsets = [c * column + r * size for c in range(side) for r in range(side)]
            element_width = side * column
        else:
            offsets = [i * size for i in range(COUNTS[kind])]
            element_width = len(offsets) * size
        if "bufferView" in spec:
            values = self.read_elements(spec["bufferView"], spec.get("byteOffset", 0),
                                        count, offsets, component, element_width)
        else:
            values = [(0,) * COUNTS[kind] for _ in range(count)]
        sparse = spec.get("sparse")
        if sparse:
            if not 0 < sparse["count"] <= count:
                raise ValueError(f"accessor {index} has invalid sparse count")
            inds, vals = sparse["indices"], sparse["values"]
            if inds["componentType"] not in (5121, 5123, 5125):
                raise ValueError("sparse indices must be unsigned integers")
            indices = self.read_elements(inds["bufferView"], inds.get("byteOffset", 0),
                                         sparse["count"], [0], COMPONENTS[inds["componentType"]])
            replacements = self.read_elements(vals["bufferView"], vals.get("byteOffset", 0),
                                              sparse["count"], offsets, component, element_width)
            previous = -1
            for (position,), value in zip(indices, replacements):
                if not previous < position < count:
                    raise ValueError("sparse indices must increase within accessor bounds")
                values[position] = value
                previous = position
        if any(not math.isfinite(value) for row in values for value in row):
            raise ValueError(f"accessor {index} contains NaN/Infinity")
        for bound in ("min", "max"):
            if bound in spec and (len(spec[bound]) != COUNTS[kind] or
                                 any(not math.isfinite(v) for v in spec[bound])):
                raise ValueError(f"accessor {index} has invalid {bound} bounds")
        self.values[index] = values
        return values

    def verify_scene(self):
        points = []
        for mesh in self.data.get("meshes", []):
            for primitive in mesh.get("primitives", []):
                position = primitive["attributes"]["POSITION"]
                if self.accessors[position]["type"] != "VEC3":
                    raise ValueError("mesh positions must be VEC3")
                vertices = self.decode(position)
                points.extend(vertices)
                if "indices" in primitive:
                    index_spec = self.accessors[primitive["indices"]]
                    if index_spec["type"] != "SCALAR" or index_spec["componentType"] not in (5121, 5123, 5125):
                        raise ValueError("mesh indices must be scalar unsigned integers")
                    indices = self.decode(primitive["indices"])
                    if any(len(i) != 1 or i[0] < 0 or i[0] >= len(vertices) for i in indices):
                        raise ValueError("mesh index lies outside its vertex accessor")
        if not points:
            raise ValueError("model contains no mesh vertices")
        extents = [max(p[axis] for p in points) - min(p[axis] for p in points) for axis in range(3)]
        if max(extents) <= 0:
            raise ValueError("model geometry has zero bounds")
        nodes = self.data.get("nodes", [])
        for node in nodes:
            for key in ("translation", "scale", "rotation", "matrix"):
                if any(not math.isfinite(v) for v in node.get(key, [])):
                    raise ValueError(f"node {key} contains NaN/Infinity")
            for child in node.get("children", []):
                nodes[child]
        for skin in self.data.get("skins", []):
            if not skin.get("joints"):
                raise ValueError("skin has no joints")
            for joint in skin["joints"]:
                nodes[joint]
            if "inverseBindMatrices" in skin:
                matrices = self.decode(skin["inverseBindMatrices"])
                if len(matrices) != len(skin["joints"]) or len(matrices[0]) != 16:
                    raise ValueError("skin inverse-bind matrices do not match joints")
        for animation in self.data.get("animations", []):
            for sampler in animation["samplers"]:
                input_spec = self.accessors[sampler["input"]]
                if input_spec["type"] != "SCALAR" or input_spec["componentType"] != 5126:
                    raise ValueError("animation input must be scalar floating-point time")
                times = self.decode(sampler["input"])
                if any(len(t) != 1 or t[0] < 0 for t in times) or any(a >= b for a, b in zip(times, times[1:])):
                    raise ValueError("animation keyframe times must be finite and strictly increasing")
                factor = 3 if sampler.get("interpolation") == "CUBICSPLINE" else 1
                if len(self.decode(sampler["output"])) % (len(times) * factor):
                    raise ValueError("animation outputs do not match keyframe count")
            for channel in animation["channels"]:
                sampler = animation["samplers"][channel["sampler"]]
                node = nodes[channel["target"]["node"]]
                path = channel["target"]["path"]
                expected = {"translation": "VEC3", "rotation": "VEC4", "scale": "VEC3", "weights": "SCALAR"}[path]
                output = self.accessors[sampler["output"]]
                if output["type"] != expected:
                    raise ValueError(f"animation {path} output must be {expected}")
                factor = 3 if sampler.get("interpolation") == "CUBICSPLINE" else 1
                if path == "weights":
                    mesh = self.data["meshes"][node["mesh"]]
                    factor *= len(mesh["primitives"][0].get("targets", []))
                if output["count"] != len(self.decode(sampler["input"])) * factor:
                    raise ValueError(f"animation {path} output count does not match its inputs")
        return len(points), len(self.data.get("animations", []))


def main() -> int:
    failures, files = [], set()
    try:
        manifest = json.loads((MODELS / "manifest.json").read_text())
        ids = [entry["id"] for entry in manifest["characters"]]
        if sorted(ids) != list(range(1, 25)):
            failures.append("character IDs must cover 1 through 24 exactly once")
        source = 'print(JSON.stringify({hazards:Object.keys(Hazards.KINDS), scenery:Stages.STAGES.map(function(s){return s.scenery;})}));'
        result = run_script(source, modules=SIM_MODULES)
        if result.returncode:
            raise ValueError(result.stderr or result.stdout)
        required = json.loads(result.stdout)
        for key in required["hazards"]:
            if key not in manifest["hazards"]:
                failures.append(f"missing 3D hazard mapping: {key}")
        for key in set(k for row in required["scenery"] for k in row) | {"treeBack", "treeFront", "rail"}:
            if key not in manifest["scenery"]:
                failures.append(f"missing 3D scenery mapping: {key}")
        entries = manifest["characters"] + list(manifest["hazards"].values()) + list(manifest["scenery"].values()) + [manifest["pursuer"]]
        for entry in entries:
            files.add(local_path(ROOT, entry["model"]))
            for key in ("height", "yaw"):
                if key in entry and (not math.isfinite(entry[key]) or (key == "height" and entry[key] <= 0)):
                    failures.append(f"invalid model {key}: {entry['model']}")
        provenance = json.loads((MODELS / "provenance.json").read_text())
        copied = set()
        for item in provenance["files"]:
            path = local_path(ROOT, item["path"])
            content = path.read_bytes()
            if len(content) != item["bytes"] or hashlib.sha256(content).hexdigest() != item["sha256"]:
                failures.append(f"library copy differs from recorded source: {item['path']}")
            copied.add(path)
        if not files <= copied:
            failures.append("every selected model must have library-copy provenance")
    except Exception as error:
        failures.append(str(error))
    vertices, animated = 0, 0
    verified = {}
    for path in sorted(files):
        try:
            model = Model(path)
            count, clips = model.verify_scene()
            verified[path] = model
            vertices += count
            animated += bool(clips)
        except Exception as error:
            failures.append(f"{path.relative_to(ROOT)}: {error}")
    for entry in entries if files else []:
        try:
            model = verified.get(local_path(ROOT, entry["model"]))
            if not model:
                continue
            clips = {animation.get("name") for animation in model.data.get("animations", [])}
            if entry.get("animated") and not clips:
                failures.append(f"model declares animation but has no clips: {entry['model']}")
            for role, name in entry.get("animation", {}).items():
                if name is not None and name not in clips:
                    failures.append(f"missing {role} animation {name}: {entry['model']}")
        except Exception as error:
            failures.append(str(error))
    print(f"library models: {len(files)} unique; {vertices} vertices; {animated} animated")
    if failures:
        print("\nFAIL")
        for failure in failures:
            print("  - " + failure)
        return 1
    print("\nPASS — all game objects map to local 3D assets with valid geometry, dependencies and animation data")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
