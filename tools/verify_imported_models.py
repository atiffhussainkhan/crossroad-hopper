#!/usr/bin/env python3
"""Prove every entry in the regenerated 3D manifest points at a loadable model.

Unlike tools/check_models.py this script has no fixed roster size and does not
run the simulation: it only asserts the three facts the importer is responsible
for. For characters, hazards, scenery and the pursuer it checks that the model
file exists, that it parses as glTF JSON or as a well-formed GLB container, and
that every external .bin/.png dependency resolves on disk. Character clip
counts are reported so a silently static import cannot hide.

Run: python3 tools/verify_imported_models.py
"""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / 'assets/models'
GLB_MAGIC = 0x46546C67
JSON_CHUNK = 0x4E4F534A


def read_model(path: Path):
    """Return the parsed glTF JSON, raising on any malformed container."""
    raw = path.read_bytes()
    if path.suffix == '.glb':
        if len(raw) < 20:
            raise ValueError('GLB shorter than its own header')
        magic, version, size = struct.unpack_from('<III', raw, 0)
        if magic != GLB_MAGIC:
            raise ValueError('bad GLB magic %08x' % magic)
        if version != 2:
            raise ValueError('bad GLB version %d' % version)
        if size != len(raw):
            raise ValueError('GLB header length %d != file size %d' % (size, len(raw)))
        at = 12
        chunks = []
        while at < size:
            if at + 8 > size:
                raise ValueError('truncated GLB chunk header')
            length, kind = struct.unpack_from('<II', raw, at)
            at += 8
            if length % 4 or at + length > size:
                raise ValueError('invalid GLB chunk length')
            chunks.append((kind, raw[at:at + length]))
            at += length
        if not chunks or chunks[0][0] != JSON_CHUNK:
            raise ValueError('GLB must begin with a JSON chunk')
        return json.loads(chunks[0][1])
    if path.suffix == '.gltf':
        return json.loads(raw)
    raise ValueError('not a glTF or GLB file: %s' % path.suffix)


def dependencies(info: dict) -> list[str]:
    return [entry['uri'] for group in ('buffers', 'images')
            for entry in info.get(group, [])
            if 'uri' in entry and not entry['uri'].startswith('data:')]


def check_entry(label: str, entry: dict, want_clips: bool, failures: list[str]) -> int:
    reference = entry['model']
    path = ROOT / reference
    if not path.is_file():
        failures.append('%s: missing file %s' % (label, reference))
        return 0
    try:
        info = read_model(path)
    except Exception as error:                                    # noqa: BLE001
        failures.append('%s: %s does not parse: %s' % (label, reference, error))
        return 0
    if info.get('asset', {}).get('version') != '2.0':
        failures.append('%s: %s is not glTF 2.0' % (label, reference))
    for uri in dependencies(info):
        decoded = unquote(uri)
        parsed = urlsplit(decoded)
        if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment or '\\' in decoded:
            failures.append('%s: dependency is not a plain local path: %s' % (label, uri))
            continue
        if Path(decoded).is_absolute() or '..' in Path(decoded).parts:
            failures.append('%s: dependency escapes its folder: %s' % (label, uri))
            continue
        if not (path.parent / decoded).is_file():
            failures.append('%s: missing dependency %s for %s' % (label, uri, reference))
    meshes = sum(len(mesh.get('primitives', [])) for mesh in info.get('meshes', []))
    if not meshes:
        failures.append('%s: %s has no mesh primitives' % (label, reference))
    clips = info.get('animations', [])
    for role, name in (entry.get('animation') or {}).items():
        if name is None:
            continue
        if name not in {clip.get('name') for clip in clips}:
            failures.append('%s: missing %s animation %r in %s' % (label, role, name, reference))
    if want_clips and entry.get('animated') and not clips:
        failures.append('%s: marked animated but %s has zero clips' % (label, reference))
    return len(clips)


def main() -> int:
    manifest = json.loads((MODELS / 'manifest.json').read_text())
    failures: list[str] = []

    print('characters (%d)' % len(manifest['characters']))
    static = []
    for entry in manifest['characters']:
        clips = check_entry('#%d %s' % (entry['id'], entry['name']), entry, True, failures)
        mark = '%2d clips  %s' % (clips, entry['model'])
        print('  ' + mark)
        if not clips:
            static.append(entry['name'])

    for category in ('hazards', 'scenery'):
        records = manifest[category]
        print('%s (%d)' % (category, len(records)))
        for kind in sorted(records):
            check_entry('%s %s' % (category[:-1], kind), records[kind], False, failures)
        print('  all %d entries resolved' % len(records))

    print('pursuer (1)')
    check_entry('pursuer', manifest['pursuer'], False, failures)
    print('  %s' % manifest['pursuer']['model'])

    print('\nstatic characters: %d of %d %s'
          % (len(static), len(manifest['characters']),
             ('-> ' + ', '.join(static)) if static else ''))
    if failures:
        print('\nFAIL (%d)' % len(failures))
        for failure in failures:
            print('  - ' + failure)
        return 1
    print('\nPASS — every manifest entry exists, parses, and resolves its dependencies')
    return 0


if __name__ == '__main__':
    sys.exit(main())