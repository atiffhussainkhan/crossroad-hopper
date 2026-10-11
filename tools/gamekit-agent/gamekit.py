#!/usr/bin/env python3
"""Compact, offline-first access to the user's existing game-asset library."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import sqlite3
import struct
import sys
import tempfile
import time
from urllib.parse import unquote, urlsplit
import zipfile

VERSION = 1
APPROVED = {'CC0-1.0', 'CC0', 'MIT', 'PUBLIC-DOMAIN'}
SOURCES = ['model_catalogue.json', 'game_asset_index.json', '.index_cache.json', 'gamekit_verified_models.json']

def emit(data):
    print(json.dumps(data, ensure_ascii=False, separators=(',', ':')))

def load(path, default=None):
    return json.loads(path.read_text()) if path.exists() else default

def uid(kind, value):
    return kind + '-' + hashlib.sha256(value.encode()).hexdigest()[:16]

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

def fingerprints(lib):
    return {name: {'bytes': p.stat().st_size, 'mtime_ns': p.stat().st_mtime_ns}
            for name in SOURCES if (p := lib / 'catalogue' / name).is_file()}

def model_document(path):
    if path.suffix.lower() == '.gltf':
        return json.loads(path.read_text())
    if path.suffix.lower() != '.glb':
        raise ValueError('Only glTF/GLB can be inspected without conversion')
    with path.open('rb') as f:
        header = f.read(12)
        if len(header) != 12:
            raise ValueError('Incomplete GLB header')
        magic, version, length = struct.unpack('<4sII', header)
        if magic != b'glTF' or version != 2 or length != path.stat().st_size:
            raise ValueError('Invalid GLB header or length')
        raw = f.read(8)
        if len(raw) != 8:
            raise ValueError('Missing GLB JSON chunk')
        size, kind = struct.unpack('<II', raw)
        if kind != 0x4E4F534A or size > length - 20:
            raise ValueError('Invalid GLB JSON chunk')
        return json.loads(f.read(size))

def inspect_local(path, root):
    lexical_root = Path(os.path.abspath(root))
    lexical_path = Path(os.path.abspath(path))
    if lexical_path.is_relative_to(lexical_root):
        path = lexical_root.resolve()/lexical_path.relative_to(lexical_root)
    if Path(os.path.abspath(path)) != path.resolve():
        raise ValueError('Symlink model paths need explicit preparation before registration')
    path, root = path.resolve(), root.resolve()
    if not path.is_relative_to(root):
        raise ValueError('Model is outside its asset root')
    doc = model_document(path)
    deps = []
    for item in doc.get('buffers', []) + doc.get('images', []):
        uri = item.get('uri', '')
        if not uri or uri.startswith('data:'):
            continue
        parts = urlsplit(uri)
        if parts.scheme or parts.netloc or parts.query or parts.fragment:
            raise ValueError('External or ambiguous dependency: ' + uri)
        original = path.parent / unquote(parts.path)
        dep = original.resolve()
        if Path(os.path.abspath(original)) != dep:
            raise ValueError('Symlink dependencies need explicit preparation: ' + uri)
        if not dep.is_relative_to(root) or not dep.is_file():
            raise ValueError('Missing or out-of-root dependency: ' + uri)
        deps.append(str(dep))
    clips = [x.get('name', 'unnamed') for x in doc.get('animations', [])]
    return {'clips': clips, 'animation_count': len(clips), 'rigged': bool(doc.get('skins')),
            'meshes': len(doc.get('meshes', [])), 'dependencies': sorted(set(deps))}

def register(lib, project):
    project = project.resolve()
    manifest_path = project / 'assets/models/manifest.json'
    provenance_path = project / 'assets/models/provenance.json'
    manifest = load(manifest_path)
    provenance = load(provenance_path)
    if not manifest or not provenance:
        raise ValueError('Registration needs assets/models/manifest.json and provenance.json')
    source_files = {x['path']: x for x in provenance.get('files', [])}
    root = (project / 'assets/models').resolve()
    licence_files = [p for p in (root/'licenses').rglob('*') if p.is_file()]
    if not licence_files:
        raise ValueError('Original licence notices are required for registration')
    expected_notices = [project/key for key in source_files if key.startswith('assets/models/licenses/')]
    if not expected_notices or any(not p.is_file() for p in expected_notices):
        raise ValueError('A provenance-listed licence notice is missing')
    licence_snapshot = {}
    for licence in licence_files:
        if Path(os.path.abspath(licence)) != licence.resolve():
            raise ValueError('Symlink licence notices are not supported')
        item = source_files.get(str(licence.relative_to(project)), {})
        if item.get('licence') not in APPROVED or digest(licence) != item.get('sha256'):
            raise ValueError('Licence notice provenance/hash mismatch: '+str(licence))
        licence_snapshot[str(licence.relative_to(root))] = item
    registry_path = lib / 'catalogue/gamekit_verified_models.json'
    registry = load(registry_path, {'models': []})
    existing = {x['id']: x for x in registry['models']}
    grouped = {}
    for role, entries in [('character', manifest.get('characters', [])),
                          ('hazard', list(manifest.get('hazards', {}).values())),
                          ('scenery', list(manifest.get('scenery', {}).values())),
                          ('pursuer', [manifest.get('pursuer', {})])]:
        for item in entries:
            if item.get('model'):
                grouped.setdefault(item['model'], []).append((role, item))
    added = 0
    for relative, choices in grouped.items():
        prov = source_files.get(relative, {})
        if prov.get('licence') not in APPROVED or not prov.get('sha256'):
            raise ValueError('Missing permissive provenance for ' + relative)
        path = project / relative
        if Path(os.path.abspath(path)) != path.resolve():
            raise ValueError('Symlink model paths are not supported')
        path = path.resolve()
        if not path.is_relative_to(root) or digest(path) != prov['sha256']:
            raise ValueError('Source hash mismatch or out-of-root model: ' + relative)
        info = inspect_local(path, root)
        snapshot = dict(licence_snapshot)
        snapshot[str(path.relative_to(root))] = prov
        for dep in info['dependencies']:
            dep_key = str(Path(dep).relative_to(project))
            dep_prov = source_files.get(dep_key, {})
            if dep_prov.get('licence') not in APPROVED or digest(Path(dep)) != dep_prov.get('sha256'):
                raise ValueError('Dependency provenance/hash mismatch: ' + dep_key)
            snapshot[str(Path(dep).relative_to(root))] = dep_prov
        labels = [x.get('name') for _, x in choices if x.get('name')]
        identity = uid('local', str(path))
        existing[identity] = {'id': identity, 'kind': '3d', 'name': labels[0] if labels else path.stem,
            'file': path.name, 'format': path.suffix[1:].lower(), 'pack': prov.get('pack', ''),
            'licence': prov['licence'], 'approved': True, 'roles': sorted({r for r, _ in choices}),
            'path': str(path), 'asset_root': str(root), 'sha256': prov['sha256'],
            'provenance': str(provenance_path), 'source': prov.get('source'), 'upstream': prov.get('upstream'),
            'provenance_sha256': digest(provenance_path), 'verified_files': snapshot,
            'verified_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'notes': sorted({x['analogue'] for _, x in choices if x.get('analogue')}), **info}
        added += 1
    registry_path.parent.mkdir(parents=True, exist_ok=True)
    registry_path.write_text(json.dumps({'models': list(existing.values())}, separators=(',', ':')))
    return {'registered': added, 'registry': str(registry_path), 'next': 'Run index to update the search cache'}

def source_records(lib):
    pack_data = load(lib / 'catalogue/.index_cache.json', {})
    packs = pack_data.get('items', [])
    by_zip = {p.get('release_asset'): p for p in packs if p.get('release_asset')}
    for p in packs:
        available = p.get('availability') == 'stored' and p.get('stored_copy') and p.get('release_asset')
        record = {'id': 'pack-' + p['id'], 'kind': 'pack', 'name': p.get('name', p['id']),
            'pack': p.get('release_asset'), 'licence': p.get('license', 'unverified'),
            'approved': bool(available and p.get('license') in APPROVED), 'available': bool(available),
            'roles': p.get('categories', []), 'terms': p.get('search_terms', []) + p.get('aliases', []),
            'url': p.get('release_url'), 'bytes': p.get('size_bytes'), 'source': p.get('source_url')}
        archive = lib / 'packs' / str(p.get('release_asset'))
        if archive.is_file(): record['archive'] = str(archive)
        yield record
    models = load(lib / 'catalogue/model_catalogue.json', {}).get('catalogue', {})
    for archive, pack in models.items():
        p = by_zip.get(archive, {})
        available = p.get('availability') == 'stored' and p.get('stored_copy') and p.get('release_asset')
        for m in pack.get('models', []):
            record = {'id': uid('model', archive + ':' + m['file'] + ':' + m.get('format', '')),
                'kind': '3d', 'name': m['file'], 'file': m['file'], 'format': m.get('format'),
                'pack': archive, 'licence': p.get('license', 'unverified'),
                'approved': bool(available and p.get('license') in APPROVED), 'roles': [m.get('role', 'unknown')],
                'animation_count': m.get('animations', 0), 'rigged': bool(m.get('rigged')),
                'clips': m.get('animation_names', []), 'url': p.get('release_url'),
                'evidence': 'catalogue metadata; inspect the selected model before use',
                'notes': [m['note']] if m.get('note') else []}
            local = lib / 'packs' / archive
            if local.is_file(): record['archive'] = str(local)
            yield record
    for m in load(lib / 'catalogue/gamekit_verified_models.json', {}).get('models', []):
        yield m
    images = load(lib / 'catalogue/game_asset_index.json', {})
    for role, items in images.get('items', {}).items():
        for m in items:
            yield {'id': 'image-' + str(m['id']), 'kind': '2d', 'name': m.get('title', str(m['id'])),
                'roles': [role], 'terms': m.get('tags', []), 'pack': m.get('pack'),
                'licence': m.get('lic', 'unverified'), 'approved': False,
                'width': m.get('w'), 'height': m.get('h'), 'transparent': bool(m.get('transparent')),
                'sprite': bool(m.get('sprite')), 'frames': m.get('frames'), 'preview': m.get('preview'),
                'file': m.get('file'), 'url': m.get('url'),
                'notes': ['2D catalogue is review-only; licence must be verified before import']}

def build_index(lib, cache):
    if not (lib / 'catalogue/model_catalogue.json').exists():
        raise ValueError('Model catalogue not found. Set --library to the existing library root')
    before = fingerprints(lib)
    cache.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix='gamekit-', suffix='.sqlite', dir=cache.parent)
    os.close(fd)
    temp = Path(name)
    try:
        db = sqlite3.connect(temp)
        db.executescript('''CREATE TABLE meta (key TEXT PRIMARY KEY,value TEXT);
        CREATE TABLE assets (id TEXT PRIMARY KEY,kind TEXT,name TEXT,format TEXT,approved INTEGER,
        animations INTEGER,local INTEGER,roles TEXT,payload TEXT);
        CREATE VIRTUAL TABLE lookup USING fts5(id UNINDEXED,words);''')
        counts = {}
        for r in source_records(lib):
            words = ' '.join(str(v) for v in [r.get('name', ''), r.get('file', ''), r.get('pack', ''),
                ' '.join(r.get('roles', [])), ' '.join(map(str, r.get('terms', [])))])
            words = re.sub(r'[_/.-]+', ' ', words)
            # Stable IDs allow direct follow-up without resending catalogue entries.
            db.execute('INSERT OR IGNORE INTO assets VALUES (?,?,?,?,?,?,?,?,?)',
                (r['id'], r['kind'], r['name'], r.get('format', ''), int(r.get('approved', False)),
                 r.get('animation_count', 0), int(bool(r.get('path'))), json.dumps(r.get('roles', [])), json.dumps(r)))
            if db.execute('SELECT changes()').fetchone()[0]:
                db.execute('INSERT INTO lookup VALUES (?,?)', (r['id'], words))
                counts[r['kind']] = counts.get(r['kind'], 0) + 1
        if before != fingerprints(lib):
            raise ValueError('Catalogue changed during indexing; retry index')
        for key, value in {'version': VERSION, 'sources': before, 'counts': counts,
                           'library': str(lib), 'built_at': time.time()}.items():
            db.execute('INSERT INTO meta VALUES (?,?)', (key, json.dumps(value)))
        db.commit()
        db.close()
        temp.replace(cache)
        return {'indexed': counts, 'cache_bytes': cache.stat().st_size, 'archive_scans': 0, 'downloads': 0}
    finally:
        temp.unlink(missing_ok=True)

def connect(cache):
    if not cache.is_file():
        raise ValueError('Search cache missing. Run gamekit.py index once; no asset downloads needed')
    db = sqlite3.connect(cache.resolve().as_uri() + '?mode=ro', uri=True)
    meta = {key: json.loads(value) for key, value in db.execute('SELECT key,value FROM meta')}
    if meta.get('version') != VERSION:
        db.close()
        raise ValueError('Cache version changed; run index')
    return db, meta

def cache_state(lib, meta):
    return meta.get('sources') != fingerprints(lib) or meta.get('library') != str(lib)

def compact(r):
    fields = ['id', 'name', 'kind', 'format', 'pack', 'licence', 'animation_count', 'rigged']
    out = {k: r[k] for k in fields if k in r}
    out['local'] = bool(r.get('path') or r.get('archive'))
    if r.get('notes'): out['note'] = r['notes'][0]
    return out

def search(lib, cache, terms, kind='3d', limit=5, animated=False, role=None, include_unverified=False, prefix=False):
    db, meta = connect(cache)
    try:
        params = [kind]
        where = ['a.kind=?']
        join, rank = '', ''
        tokens = re.findall(r'\w+', ' '.join(terms).replace('_', ' '), re.UNICODE)
        if tokens:
            join = ' JOIN lookup ON lookup.id=a.id'
            where.append('lookup MATCH ?')
            params.append(' AND '.join('"' + t.replace('"', '""') + '"' + ('*' if prefix else '') for t in tokens))
            rank = ', bm25(lookup)'
        if not include_unverified: where.append('a.approved=1')
        if animated: where.append('a.animations>0')
        if role:
            where.append('EXISTS(SELECT 1 FROM json_each(a.roles) WHERE value=?)')
            params.append(role)
        count = db.execute('SELECT count(*) FROM assets a' + join + ' WHERE ' + ' AND '.join(where), params).fetchone()[0]
        rows = db.execute('SELECT a.payload FROM assets a' + join + ' WHERE ' + ' AND '.join(where) +
            ' ORDER BY a.local DESC' + rank + ', a.name LIMIT ?', params + [limit]).fetchall()
        result = {'matches': count, 'returned': len(rows), 'stale': cache_state(lib, meta),
                  'results': [compact(json.loads(r[0])) for r in rows]}
        if prefix: result['matching'] = 'prefix; inspect candidates for exact identity'
        if not count:
            result['note'] = 'No match in this indexed subset; search --kind pack or broaden terms. This does not prove absence from the full library.'
            if kind == '2d': result['note'] += ' The 2D catalogue is unverified; --include-unverified is review-only.'
        if result['stale']: result['refresh'] = 'Run index after catalogue changes; no automatic refresh or network calls occur'
        return result
    finally:
        db.close()

def get_record(cache, identity):
    db, meta = connect(cache)
    try:
        row = db.execute('SELECT payload FROM assets WHERE id=?', (identity,)).fetchone()
        if not row: raise ValueError('Unknown asset ID')
        return json.loads(row[0])
    finally: db.close()

def inspect_asset(cache, identity):
    r = get_record(cache, identity)
    if r.get('path'):
        path = Path(r['path'])
        r['exists'] = path.is_file()
        if r['exists']:
            r['hash_matches'] = digest(path) == r.get('sha256')
            r.update(inspect_local(path, Path(r['asset_root'])))
    if r.get('clips'):
        r['clips_truncated'] = len(r['clips']) > 12
        r['clips'] = r['clips'][:12]
    r.pop('terms', None)
    if r.get('verified_files'):
        r['verified_file_count'] = len(r.pop('verified_files'))
        r.pop('provenance_sha256', None)
    return r

def locate(cache, identity):
    r = get_record(cache, identity)
    if r.get('path'):
        return {'id': identity, 'path': r['path'], 'exists': Path(r['path']).is_file()}
    archive = Path(r.get('archive', ''))
    if not archive.is_file():
        return {'id': identity, 'local': False, 'pack': r.get('pack'), 'url': r.get('url'),
                'note': 'Only fetch this selected bundle if needed; no download was performed'}
    with zipfile.ZipFile(archive) as z:
        names = z.namelist()
        matches = [n for n in names if PurePosixPath(n).stem == r.get('file') and
                   PurePosixPath(n).suffix.lstrip('.').lower() == r.get('format')]
        nested = [n for n in names if n.lower().endswith('.zip')]
    return {'id': identity, 'archive': str(archive), 'member_count': len(matches), 'members': matches[:5],
            'nested_archives': nested[:5], 'note': 'Choose the exact member before extracting; nested archives may require a further targeted lookup'}

def stage(cache, identity, destination):
    r = get_record(cache, identity)
    if not r.get('approved') or r.get('licence') not in APPROVED:
        raise ValueError('Asset licence is not verified for import')
    if not r.get('path') or r.get('kind') != '3d':
        raise ValueError('Automatic staging supports registered local models. Use locate for archived models and verify the exact member first')
    root, path = Path(r['asset_root']).resolve(), Path(r['path']).resolve()
    if digest(path) != r.get('sha256'):
        raise ValueError('Model changed after verification; register again before staging')
    info = inspect_local(path, root)
    if digest(Path(r['provenance'])) != r.get('provenance_sha256'):
        raise ValueError('Provenance changed after registration; register and index again')
    snapshot = r.get('verified_files', {})
    if not snapshot:
        raise ValueError('Verified file snapshot missing; register and index again')
    project = root.parent.parent
    selected = [path] + [Path(p) for p in info['dependencies']]
    for relative,entry in snapshot.items():
        p = root/relative
        if not p.resolve().is_relative_to(root) or Path(os.path.abspath(p)) != p.resolve():
            raise ValueError('Verified file became an out-of-root path or symlink')
        if not p.is_file() or entry.get('licence') not in APPROVED or digest(p) != entry.get('sha256'):
            raise ValueError('File licence/hash no longer matches provenance: ' + str(p))
    if any(str(p.relative_to(root)) not in snapshot for p in selected):
        raise ValueError('New dependency is not in the verified snapshot')
    licence_files = [root/relative for relative in snapshot if relative.startswith('licenses/')]
    if not licence_files:
        raise ValueError('Original licence notices are missing')
    target = destination.resolve() / identity
    if target.exists(): raise ValueError('Destination already exists; refusing to overwrite ' + str(target))
    destination.mkdir(parents=True, exist_ok=True)
    temp = Path(tempfile.mkdtemp(prefix='.gamekit-', dir=destination))
    try:
        for p in selected + licence_files:
            relative = p.resolve().relative_to(root)
            out = temp / relative
            out.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(p, out)
        (temp / 'selection.json').write_text(json.dumps(r, indent=2))
        (temp / 'provenance.json').write_text(json.dumps({'files': list(snapshot.values())}, indent=2))
        temp.rename(target)
    finally:
        if temp.exists(): shutil.rmtree(temp)
    return {'id': identity, 'model': str(target / path.relative_to(root)), 'files': len(selected),
            'licence': r['licence'], 'generated_artwork': False}

def sheet(lib, cache, role, count, output):
    """Preview existing atlas crops; never treat a preview as an import licence."""
    from PIL import Image, ImageDraw
    db, _ = connect(cache)
    try:
        rows = db.execute("SELECT payload FROM assets WHERE kind='2d' AND "
            "EXISTS(SELECT 1 FROM json_each(roles) WHERE value=?) "
            "AND json_extract(payload,'$.transparent')=1 AND json_extract(payload,'$.sprite')=1 "
            "ORDER BY name LIMIT ?", (role, count)).fetchall()
    finally:
        db.close()
    crops, failures = [], []
    for row in rows:
        record = json.loads(row[0])
        preview = record.get('preview') or {}
        try:
            basename = Path(preview['atlas']).name
            candidates = [lib/'previews/atlases'/basename]
            candidates += list((lib/'catalogue/source').glob('*/previews/'+basename))
            atlas_path = next((p for p in candidates if p.is_file()), None)
            if atlas_path is None: raise ValueError('atlas missing')
            x, y, w, h = [preview[k] for k in ['x','y','w','h']]
            if not all(isinstance(v, int) and not isinstance(v, bool) for v in [x,y,w,h]):
                raise ValueError('invalid crop coordinates')
            with Image.open(atlas_path) as image:
                if min(x,y)<0 or min(w,h)<=0 or x+w>image.width or y+h>image.height:
                    raise ValueError('crop outside atlas')
                crop = image.convert('RGBA').crop((x,y,x+w,y+h))
                if crop.getchannel('A').getextrema()[1] == 0:
                    raise ValueError('fully transparent crop')
                crop.thumbnail((120,120))
                crops.append((record, crop))
        except (KeyError, ValueError, OSError) as exc:
            failures.append({'id': record['id'], 'reason': str(exc)})
    if not crops:
        raise ValueError('No preview crops rendered; no blank sheet saved. '+json.dumps(failures[:3]))
    columns = min(6,len(crops))
    canvas = Image.new('RGB',(columns*144,((len(crops)+columns-1)//columns)*170),(24,24,28))
    draw = ImageDraw.Draw(canvas)
    for i,(record,crop) in enumerate(crops):
        left,top = (i%columns)*144,(i//columns)*170
        for y in range(0,128,8):
            for x in range(0,128,8):
                grey=75 if (x//8+y//8)%2 else 105
                draw.rectangle((left+x,top+y,left+x+7,top+y+7),fill=(grey,grey,grey))
        canvas.paste(crop,(left+(128-crop.width)//2,top+(128-crop.height)//2),crop)
        draw.text((left+3,top+131),str(record['name'])[:21],fill='white')
        draw.text((left+3,top+149),'REVIEW: '+str(record['licence'])[:13],fill='orange')
    if output.exists(): raise ValueError('Preview output already exists; choose a new filename')
    output.parent.mkdir(parents=True,exist_ok=True)
    canvas.save(output)
    return {'preview':str(output.resolve()),'drawn':len(crops),'requested':len(rows),
            'skipped':failures,'licence_use':'review only; no source assets imported'}

def wire(project):
    if not project.is_dir(): raise ValueError('Project directory does not exist')
    path = project/'AGENTS.md'
    text = path.read_text() if path.exists() else '# Project instructions\n'
    marker = '<!-- gamekit-agent -->'
    if marker in text: return {'project':str(project),'changed':False}
    command = str(Path(__file__).resolve())
    text += ('\n'+marker+'\n## Existing game-asset library\n\n'
        'Use Gamekit for asset lookup before creating artwork. Start with `python3 '+command+' doctor .`, '
        'then `python3 '+command+' search <terms> --limit 5`. Inspect the chosen ID. '
        'Do not load full catalogues, bulk-download releases, or infer animation/licence from pack names. '
        'Use the gamekit agent for multi-step asset discovery.\n')
    path.write_text(text)
    return {'project':str(project),'changed':True,'instructions':str(path)}

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--library', type=Path, default=Path(os.environ.get('GAMEKIT_LIBRARY', str(Path.home()/'.minimax/asset-library'))))
    ap.add_argument('--cache', type=Path, default=None)
    sub = ap.add_subparsers(dest='command', required=True)
    sub.add_parser('index', help='Build compact search cache from existing catalogues, without rescanning assets')
    sub.add_parser('status', help='Small cache/coverage summary')
    p = sub.add_parser('doctor', help='Check renderer evidence, not runtime support'); p.add_argument('project', type=Path)
    p = sub.add_parser('register', help='Register a project model manifest with verified provenance'); p.add_argument('project', type=Path)
    p = sub.add_parser('search', help='Offline search, five results by default')
    p.add_argument('terms', nargs='*'); p.add_argument('--kind', choices=['3d','2d','pack'], default='3d')
    p.add_argument('--3d', dest='kind', action='store_const', const='3d'); p.add_argument('--2d', dest='kind', action='store_const', const='2d')
    p.add_argument('--limit', type=int, default=5); p.add_argument('--animated', action='store_true')
    p.add_argument('--role'); p.add_argument('--include-unverified', action='store_true')
    p.add_argument('--prefix', action='store_true', help='Explicitly broaden words to prefix matches')
    p.add_argument('--cc0', action='store_true', help='Compatibility flag: permissive licences are already the default')
    p.add_argument('--json', action='store_true', help='Compatibility flag: compact JSON is already the default')
    for command in ['inspect', 'locate']:
        p = sub.add_parser(command); p.add_argument('id')
    p = sub.add_parser('stage', help='Copy one verified local model, dependencies, licences and provenance')
    p.add_argument('id'); p.add_argument('--dest', type=Path, required=True)
    p = sub.add_parser('sheet', help='Contact sheet of existing 2D atlas crops for review only')
    p.add_argument('role', nargs='?', default='scenery'); p.add_argument('-n',type=int,default=12)
    p.add_argument('-o','--out',type=Path,required=True)
    p = sub.add_parser('wire', help='Add a compact library pointer to a project'); p.add_argument('project',type=Path)
    p = sub.add_parser('portable', help='Copy the current quick-start guide'); p.add_argument('-o','--out',type=Path,required=True)
    for command in ['import2d','catalogue']:
        p = sub.add_parser(command, help='Legacy command: see the migration notes'); p.add_argument('args', nargs='*')
    a = ap.parse_args(argv)
    lib = a.library.expanduser().resolve()
    cache = (a.cache or lib/'catalogue/gamekit.sqlite').expanduser().resolve()
    try:
        if a.command == 'index': result = build_index(lib, cache)
        elif a.command == 'register': result = register(lib, a.project)
        elif a.command == 'doctor':
            from renderer_doctor import doctor
            result = doctor(a.project)
        elif a.command == 'search':
            if not 1 <= a.limit <= 20: raise ValueError('--limit must be between 1 and 20')
            result = search(lib, cache, a.terms, a.kind, a.limit, a.animated, a.role, a.include_unverified, a.prefix)
        elif a.command == 'inspect': result = inspect_asset(cache, a.id)
        elif a.command == 'locate': result = locate(cache, a.id)
        elif a.command == 'stage': result = stage(cache, a.id, a.dest)
        elif a.command == 'sheet':
            if not 1 <= a.n <= 18: raise ValueError('-n must be between 1 and 18')
            result = sheet(lib,cache,a.role,a.n,a.out)
        elif a.command == 'wire': result = wire(a.project)
        elif a.command == 'portable':
            source = Path(__file__).with_name('QUICKSTART.md')
            if a.out.exists(): raise ValueError('Output already exists; refusing to overwrite')
            a.out.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(source,a.out)
            result = {'guide':str(a.out.resolve())}
        elif a.command == 'status':
            db, meta = connect(cache); db.close()
            result = {'library': str(lib), 'indexed': meta['counts'], 'stale': cache_state(lib, meta),
                      'built_at': meta['built_at'], 'default_results': 5, 'network_on_search': False,
                      'coverage': 'Existing catalogues plus registered models; not an exhaustive inventory of every release bundle'}
        else:
            raise ValueError('Legacy command '+a.command+' is not run automatically. Use search/inspect/locate/stage; see QUICKSTART.md. Unsafe URL guessing and unverified 2D imports are disabled')
        emit(result)
        return 0
    except (ValueError, OSError, KeyError, ImportError, sqlite3.Error, zipfile.BadZipFile) as exc:
        emit({'error': str(exc)})
        return 2

if __name__ == '__main__':
    raise SystemExit(main())
