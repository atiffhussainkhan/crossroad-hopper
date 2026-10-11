#!/usr/bin/env python3
"""Import a selected, licence-clear subset of the user's existing Image library.

No downloads, rendering, or generated artwork. Copies source models and every
external glTF dependency byte-for-byte, records SHA-256 provenance, and writes
the renderer's manifest. Run with --library-work to use another local library.
"""
from __future__ import annotations

import argparse
from contextlib import nullcontext
import hashlib
import json
import math
import posixpath
import struct
import zipfile
from pathlib import Path, PurePosixPath
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LIBRARY = Path('/Users/mac/Documents/Codex/2026-10-05/n/work')
MIRROR = 'https://github.com/atiffhussainkhan/Image'

# IDs remain stable. Display names describe the imported model, including where
# the old 2D roster had a hero with no equivalent in these existing model packs.
CHARACTERS = [
    (1, 'Casual Male', 'characters', 'Casual_Male', 'Boy Cap'),
    (2, 'Casual 3 Male', 'characters', 'Casual3_Male', 'Blue Hoodie'),
    (3, 'Cat', 'kenney', 'cube-pets/animal-cat', 'Cat'),
    (4, 'Leela Robot', 'mech', 'Leela', 'Robot'),
    (5, 'Shiba Inu', 'animals', 'ShibaInu', 'Dog'),
    (6, 'Ninja', 'characters', 'Ninja_Male', 'Ninja'),
    (7, 'Bunny', 'kenney', 'cube-pets/animal-bunny', 'Bunny'),
    (8, 'Wizard', 'characters', 'Wizard', 'Wizard'),
    (9, 'Goblin', 'characters', 'Goblin_Male', 'Alien'),
    (10, 'Pirate', 'characters', 'Pirate_Male', 'Pirate'),
    (11, 'Penguin', 'kenney', 'cube-pets/animal-penguin', 'Penguin'),
    (12, 'Knight', 'characters', 'Knight_Male', 'Knight'),
    (13, 'Fox', 'animals', 'Fox', 'Fox'),
    (14, 'Blue Soldier', 'characters', 'BlueSoldier_Female', 'Astronaut'),
    (15, 'Pig', 'kenney', 'cube-pets/animal-pig', 'Pig'),
    (16, 'Soldier', 'characters', 'Soldier_Male', 'Superhero'),
    (17, 'Polar Bear', 'kenney', 'cube-pets/animal-polar', 'Bear'),
    (18, 'Chef', 'characters', 'Chef_Hat', 'Chef'),
    (19, 'Skeleton', 'skeletons', 'Skeleton_Minion', 'Skeleton'),
    (20, 'Koala', 'kenney', 'cube-pets/animal-koala', 'Koala'),
    (21, 'Worker Male', 'characters', 'Worker_Male', 'Builder'),
    (22, 'Crab', 'kenney', 'cube-pets/animal-crab', 'Frog'),
    (23, 'Worker Female', 'characters', 'Worker_Female', 'Firefighter'),
    (24, 'White Horse', 'animals', 'Horse_White', 'Unicorn'),
]

# Lengths match Hazards.SPECS. Renderers must fit the model's longitudinal size
# to the actual instance h.len, keeping uniform scale across the other axes.
# The optional analogue field is explicit rather than claiming nonexistent art.
HAZARDS = {
    'car': ('car/sedan', .86, None),
    'taxi': ('car/taxi', .90, None),
    'racecar': ('car/race', .78, None),
    'police': ('car/police', .95, None),
    'limousine': ('car/suv-luxury', 2.10, 'Luxury SUV; no limousine in the local pack'),
    'truck': ('car/truck', 2.60, None),
    'bus': ('car/delivery', 3.10, 'Delivery van; no bus in the local pack'),
    'tractor': ('car/tractor', 1.30, None),
    'forklift': ('library/forklift', 1.10, None),
    'roller': ('car/truck-flat', 1.70, 'Flatbed work truck; no road roller in the local pack'),
    'tumbleweed': ('nature/plant_bushLargeTriangle', .80, 'Dry bush model used for rolling vegetation'),
    'ambulance': ('car/ambulance', 1.55, None),
    'cementmixer': ('retro-urban/truck-grey-cargo', 1.85, 'Cargo construction truck; no cement mixer in the local pack'),
    'motorbike': ('car/kart-oopi', .90, 'Kart; no motorbike in the local pack'),
    'golfcart': ('car/kart-ooli', .95, 'Small kart used as a cart analogue'),
    'train': ('train/train-locomotive-c', 3.40, None),
    'tram': ('train/train-tram-round', 2.20, None),
    'monorail': ('train/train-electric-bullet-c', 2.80, 'Electric bullet train used for monorail traffic'),
    'freighttrain': ('train/train-carriage-container-blue', 3.60, None),
    'subway': ('train/train-electric-subway-a', 2.60, None),
    'log': ('nature/log', .90, None),
    'turtle': ('cube-pets/animal-crab', .62, 'Crab; no turtle in the local pack'),
    'alligator': ('watercraft/boat-row-large', 2.20, 'Rowboat; no alligator in the local pack'),
    'crocodile': ('watercraft/boat-tow-a', 2.60, 'Towboat; no crocodile in the local pack'),
    'canoe': ('watercraft/boat-row-small', 1.30, 'Small rowboat used as a canoe analogue'),
    'duck': ('library/ducky', .55, 'Rubber duck from the existing Tiny Treats pack'),
    'swan': ('cube-pets/animal-parrot', .80, 'Parrot bird; no swan in the local pack'),
    'icefloe': ('platformer/block-snow-low', 1.45, 'Snow block used as a floating ice platform'),
    'sled': ('holiday/sled', 1.10, None),
    'snake': ('cube-pets/animal-caterpillar', .90, 'Caterpillar; no snake in the local pack'),
    'boulder': ('nature/rock_largeA', 1.20, None),
    'geyser': ('space/crater', 1.00, 'Crater vent source; active water plume is simulation-driven geometry'),
    'steamvent': ('space/chimney', 1.00, 'Chimney vent source; active steam is simulation-driven geometry'),
    'sinkhole': ('space/craterLarge', .92, 'Crater rim; open pit must cover the full playable lane'),
    'hawk': ('cube-pets/animal-parrot', 1.05, 'Parrot; no hawk in the local pack'),
}

SCENERY = {
    'hedge': ('nature/plant_bushLarge', .75, None),
    'tree': ('nature/tree_oak', 2.2, None),
    'mailbox': ('library/mailbox', .65, None),
    'bush': ('nature/plant_bush', .60, None),
    'flowerbed': ('nature/flower_redA', .40, 'Flower cluster'),
    'fence': ('city-suburban/fence', .65, None),
    'reed': ('nature/plant_flatTall', .60, 'Tall waterside plant'),
    'lily': ('nature/lily_large', .12, None),
    'rock': ('nature/rock_smallTopA', .55, None),
    'cactus': ('nature/cactus_tall', 1.30, None),
    'bone': ('space/bones', .20, None),
    'boulder': ('nature/rock_largeA', .90, None),
    'haybale': ('graveyard/hay-bale', .65, None),
    'windmill': ('fantasy-town/windmill', 2.4, None),
    'neon': ('racing/lightColored', 1.5, 'Colored signal light; no neon sign in the local pack'),
    'building': ('city-suburban/building-type-a', 2.8, None),
    'streetlamp': ('city-roads/light-curved', 1.8, None),
    'hydrant': ('library/firehydrant', .55, None),
    'postbox': ('library/mailbox', .65, 'Mailbox used for the street postbox'),
    'pine': ('platformer/tree-pine-snow', 2.2, None),
    'iceberg': ('platformer/block-snow-large-slope', 1.1, 'Snow-covered slope used as ice mound'),
    'vine': ('nature/plant_flatTall', .9, 'Tall foliage; no vine in the local pack'),
    'fern': ('nature/grass_leafsLarge', .50, 'Leaf cluster used as a fern analogue'),
    'scaffold': ('retro-urban/scaffolding-structure', 1.8, None),
    'cone': ('city-roads/construction-cone', .45, None),
    'crate': ('platformer/crate', .65, None),
    'pylon': ('racing/pylon', 1.8, 'Track pylon used as an industrial roadside tower'),
    'puddle': ('nature/ground_riverStraight', .035, 'Low river tile used as a water patch'),
    'debris': ('graveyard/debris', .40, None),
    'lavaVent': ('space/crater', .60, 'Crater vent; lava lighting is applied by the renderer'),
    'obsidian': ('space/rock_crystals', 1.0, 'Crystal rock; dark stage lighting supplies the volcanic appearance'),
    'rail': ('train/track', .08, None),
}


def model_json(data: bytes, suffix: str) -> dict:
    if suffix == '.gltf':
        return json.loads(data)
    magic, version, size = struct.unpack_from('<III', data, 0)
    if magic != 0x46546C67 or version != 2 or size != len(data):
        raise ValueError('Invalid glTF binary header')
    length, kind = struct.unpack_from('<II', data, 12)
    if kind != 0x4E4F534A:
        raise ValueError('glTF binary must begin with JSON')
    return json.loads(data[20:20 + length])


def external_dependencies(info: dict) -> list[str]:
    return [entry['uri'] for group in ('buffers', 'images')
            for entry in info.get(group, [])
            if 'uri' in entry and not entry['uri'].startswith('data:')]


class Importer:
    def __init__(self, source: Path, target: Path):
        self.source, self.target = source, target
        self.files: dict[str, dict] = {}
        self.model_info: dict[str, dict] = {}
        self.archives: dict[Path, zipfile.ZipFile] = {}
        self.kenney_archive = source / 'full-audit/downloads/mega-assets-expansion-v1/shorepine-kenney.zip'
        self.skeleton_archive = source / 'full-audit/downloads/mega-assets-v1/kaykit-skeletons.zip'

    def store(self, relative: str, data: bytes, original: str, pack: str, origin: str):
        destination = self.target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        digest = hashlib.sha256(data).hexdigest()
        if relative in self.files and self.files[relative]['sha256'] != digest:
            raise ValueError('Conflicting dependencies: ' + relative)
        destination.write_bytes(data)
        self.files[relative] = {'path': 'assets/models/' + relative,
                                'source': original, 'pack': pack,
                                'upstream': origin, 'licence': 'MIT' if pack.startswith('Holokat') else 'CC0-1.0',
                                'sha256': digest, 'bytes': len(data)}

    def copy_archive(self, archive: Path, member: str, relative: str, pack: str, origin: str):
        if archive not in self.archives:
            self.archives[archive] = zipfile.ZipFile(archive)
        with nullcontext(self.archives[archive]) as source:
            data = source.read(member)
            self.store(relative, data, str(archive) + '::' + member, pack, origin)
            if Path(relative).suffix not in ('.gltf', '.glb'):
                return
            info = model_json(data, Path(relative).suffix)
            self.model_info[relative] = info
            for uri in external_dependencies(info):
                dependency = unquote(uri)
                if '://' in dependency or dependency.startswith('/'):
                    raise ValueError('Non-local model dependency: ' + dependency)
                src_member = posixpath.normpath(posixpath.join(posixpath.dirname(member), dependency))
                dst_relative = posixpath.normpath(posixpath.join(posixpath.dirname(relative), dependency))
                if dst_relative.startswith('../'):
                    raise ValueError('Model dependency escapes asset root')
                self.store(dst_relative, source.read(src_member), str(archive) + '::' + src_member, pack, origin)

    def copy_local(self, source: Path, relative: str, pack: str, origin: str):
        data = source.read_bytes()
        self.store(relative, data, str(source), pack, origin)
        if source.suffix not in ('.gltf', '.glb'):
            return
        info = model_json(data, source.suffix)
        self.model_info[relative] = info
        for uri in external_dependencies(info):
            dependency = unquote(uri)
            if '://' in dependency or dependency.startswith('/'):
                raise ValueError('Non-local model dependency: ' + dependency)
            dst = posixpath.normpath(posixpath.join(posixpath.dirname(relative), dependency))
            if dst.startswith('../'):
                raise ValueError('Model dependency escapes asset root')
            self.store(dst, (source.parent / dependency).read_bytes(), str(source.parent / dependency), pack, origin)

    def kenney(self, key: str) -> str:
        relative = 'kenney/' + key + '.glb'
        if relative not in self.files:
            self.copy_archive(self.kenney_archive, 'shorepine-kenney/3d/' + key + '.glb', relative,
                              'Kenney ' + key.split('/')[0], 'https://kenney.nl/assets')
        return 'assets/models/' + relative

    def model(self, key: str) -> str:
        if not key.startswith('library/'):
            return self.kenney(key)
        extra = {
            'library/forklift': ('mega-assets-expansion-v1/holokat-game-assets.zip',
                'holokat-game-assets/site/collections/farm/infrastructure/optimized-glb/Forklift.glb',
                'holokat/Forklift.glb', 'Holokat farm infrastructure', 'https://github.com/holokat/game-assets'),
            'library/mailbox': ('mega-assets-v1/jam-ready-assets.zip',
                'jam-ready-assets/tiny-treats/3D/interior-furniture/Homely House/Assets/gltf/mailbox.gltf',
                'tiny-treats/homely-house/mailbox.gltf', 'Tiny Treats Homely House', 'https://tinytreats.itch.io/homely-house'),
            'library/ducky': ('mega-assets-v1/jam-ready-assets.zip',
                'jam-ready-assets/tiny-treats/3D/interior-furniture/Bubbly Bathroom/Assets/gltf/ducky.gltf',
                'tiny-treats/bubbly-bathroom/ducky.gltf', 'Tiny Treats Bubbly Bathroom', 'https://tinytreats.itch.io/bubbly-bathroom'),
            'library/firehydrant': ('mega-assets-expansion-v2/kaykit-city-builder.zip',
                'kaykit-city-builder/addons/kaykit_city_builder_bits/Assets/gltf/firehydrant.gltf',
                'kaykit-city/firehydrant.gltf', 'KayKit City Builder Bits', 'https://kaylousberg.itch.io/city-builder-bits'),
        }
        archive, member, relative, pack, origin = extra[key]
        if relative not in self.files:
            self.copy_archive(self.source / 'full-audit/downloads' / archive, member, relative, pack, origin)
        return 'assets/models/' + relative

    def character(self, pack: str, key: str) -> str:
        if pack == 'kenney':
            return self.kenney(key)
        if pack == 'skeletons':
            relative = 'characters/' + key + '.glb'
            self.copy_archive(self.skeleton_archive,
                              'kaykit-skeletons/addons/kaykit_character_pack_skeletons/Characters/gltf/' + key + '.glb',
                              relative, 'KayKit Skeletons', 'https://kaylousberg.itch.io/kaykit-skeleton-pack')
        else:
            directories = {
                'characters': ('quaternius-ultimate-animated-character', 'assets/glTF', 'ultimatedanimatedcharacter'),
                'animals': ('quaternius-ultimate-animated-animals', 'assets/glTF', 'ultimateanimatedanimals'),
                'mech': ('quaternius-animated-mech', 'assets/Flat Colors/glTF', 'animatedmech'),
            }
            folder, subdir, page = directories[pack]
            relative = 'characters/' + key + '.gltf'
            self.copy_local(self.source / 'missing-packs' / folder / subdir / (key + '.gltf'), relative,
                            folder, 'https://quaternius.com/packs/' + page + '.html')
        return 'assets/models/' + relative

    def licenses(self):
        self.copy_archive(self.kenney_archive, 'shorepine-kenney/LICENSE.txt', 'licenses/kenney/LICENSE.txt',
                          'Kenney library', 'https://kenney.nl/assets')
        self.copy_archive(self.kenney_archive, 'shorepine-kenney/README.md', 'licenses/kenney/README.md',
                          'Kenney library', 'https://kenney.nl/assets')
        self.copy_archive(self.skeleton_archive, 'kaykit-skeletons/LICENSE.txt', 'licenses/kaykit-skeletons/LICENSE.txt',
                          'KayKit Skeletons', 'https://kaylousberg.itch.io/kaykit-skeleton-pack')
        for folder in ('quaternius-ultimate-animated-character', 'quaternius-ultimate-animated-animals', 'quaternius-animated-mech'):
            self.copy_local(self.source / 'missing-packs' / folder / 'assets/License.txt',
                            'licenses/' + folder + '/License.txt', folder, 'https://quaternius.com/license.html')
            self.copy_local(self.source / 'missing-packs' / folder / 'SOURCE.json',
                            'licenses/' + folder + '/SOURCE.json', folder, MIRROR + '/releases/tag/catalog-completion-2026-10-06')
        self.copy_archive(self.source / 'full-audit/downloads/mega-assets-expansion-v1/holokat-game-assets.zip',
                          'holokat-game-assets/LICENSE', 'licenses/holokat/LICENSE',
                          'Holokat farm infrastructure', 'https://github.com/holokat/game-assets')
        self.copy_archive(self.source / 'full-audit/downloads/mega-assets-v1/jam-ready-assets.zip',
                          'jam-ready-assets/tiny-treats/3D/interior-furniture/License.txt', 'licenses/tiny-treats/License.txt',
                          'Tiny Treats', 'https://tinytreats.itch.io/')
        self.copy_archive(self.source / 'full-audit/downloads/mega-assets-expansion-v2/kaykit-city-builder.zip',
                          'kaykit-city-builder/LICENSE.txt', 'licenses/kaykit-city-builder/LICENSE.txt',
                          'KayKit City Builder Bits', 'https://kaylousberg.itch.io/city-builder-bits')

    def validate(self):
        for relative, info in self.model_info.items():
            for dependency in external_dependencies(info):
                path = self.target / PurePosixPath(relative).parent / unquote(dependency)
                if not path.is_file():
                    raise ValueError('Missing imported dependency: ' + str(path))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--library-work', type=Path, default=DEFAULT_LIBRARY)
    parser.add_argument('--output', type=Path, default=ROOT / 'assets/models')
    args = parser.parse_args()
    importer = Importer(args.library_work, args.output)
    manifest = {'version': 1, 'sourceRepository': MIRROR,
                'units': 'world tiles; character height is uniform; hazard length follows Hazards.SPECS',
                'characters': [], 'hazards': {}, 'scenery': {}}
    for number, name, pack, key, old_name in CHARACTERS:
        model = importer.character(pack, key)
        info = importer.model_info[model.removeprefix('assets/models/')]
        clips = [clip.get('name', '') for clip in info.get('animations', [])]
        animations = {
            'idle': next((name for name in ('Idle', 'idle', 'Idle_2') if name in clips), None),
            'hop': next((name for name in ('Jump', 'Gallop_Jump', 'Jump_Full_Short', 'run', 'walk') if name in clips), None),
            'death': next((name for name in ('Death', 'Death_A') if name in clips), None),
        }
        manifest['characters'].append({'id': number, 'rosterId': 'char_%02d' % number,
            'name': name, 'model': model, 'height': 1.1, 'yaw': math.pi,
            'originalName': old_name, 'animation': animations,
            'animated': bool(clips), 'nativeForward': '+z'})
    for kind, (key, length, analogue) in HAZARDS.items():
        entry = {'model': importer.model(key), 'length': length, 'yaw': math.pi / 2,
                 'nativeForward': '+z', 'fit': 'length', 'analogue': analogue}
        if kind in ('geyser', 'steamvent', 'sinkhole'):
            entry['effect'] = kind
            entry['fit'] = 'terrain'
        manifest['hazards'][kind] = entry
    for kind, (key, height, analogue) in SCENERY.items():
        manifest['scenery'][kind] = {'model': importer.model(key), 'height': height,
                                   'yaw': 0, 'analogue': analogue}
    for alias in ('treeBack', 'treeFront'):
        manifest['scenery'][alias] = dict(manifest['scenery']['tree'])
    manifest['pursuer'] = {'model': importer.kenney('cube-pets/animal-parrot'),
                           'height': .65, 'yaw': math.pi, 'nativeForward': '+z',
                           'analogue': 'Parrot model used as the bird pursuer; no hawk available'}
    importer.licenses()
    importer.validate()
    for archive in importer.archives.values():
        archive.close()
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    provenance = {'sourceRepository': MIRROR, 'licences': ['CC0-1.0', 'MIT'],
        'selection': 'Existing local library models copied without artwork generation or pixel conversion',
        'files': list(importer.files.values()),
        'modelCount': len(importer.model_info),
        'totalBytes': sum(item['bytes'] for item in importer.files.values())}
    (args.output / 'provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print('Imported %d models, %d source files, %.1f MiB; all dependencies resolve.' %
          (len(importer.model_info), len(importer.files), provenance['totalBytes'] / 1048576))


if __name__ == '__main__':
    main()
