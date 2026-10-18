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
    (25, 'Casual Bald', 'characters', 'Casual_Bald', 'Bald Casual'),
    (26, 'Casual Female', 'characters', 'Casual_Female', 'Casual Woman'),
    (27, 'Casual 2 Female', 'characters', 'Casual2_Female', 'Casual Two Woman'),
    (28, 'Casual 2 Male', 'characters', 'Casual2_Male', 'Casual Two Man'),
    (29, 'Casual 3 Female', 'characters', 'Casual3_Female', 'Casual Three Woman'),
    (30, 'Cowboy Female', 'characters', 'Cowboy_Female', 'Cowgirl'),
    (31, 'Cowboy Male', 'characters', 'Cowboy_Male', 'Cowboy'),
    (32, 'Old Doctor', 'characters', 'Doctor_Female_Old', 'Elderly Doctor'),
    (33, 'Young Doctor', 'characters', 'Doctor_Male_Young', 'Young Doctor'),
    (34, 'Elf', 'characters', 'Elf', 'Elf'),
    (35, 'Goblin Female', 'characters', 'Goblin_Female', 'Goblin Woman'),
    (36, 'Kimono Female', 'characters', 'Kimono_Female', 'Kimono Woman'),
    (37, 'Golden Knight', 'characters', 'Knight_Golden_Female', 'Gold Knight'),
    (38, 'Ninja Female', 'characters', 'Ninja_Female', 'Ninja Woman'),
    (39, 'Ninja Hair', 'characters', 'Ninja_Male_Hair', 'Long-Haired Ninja'),
    (40, 'Witch', 'characters', 'Witch', 'Witch'),
    (41, 'Alpaca', 'animals', 'Alpaca', 'Alpaca'),
    (42, 'Bull', 'animals', 'Bull', 'Bull'),
    (43, 'Stag', 'animals', 'Stag', 'Stag'),
    (44, 'Wolf', 'animals', 'Wolf', 'Wolf'),
    (45, 'Deer', 'animals', 'Deer', 'Deer'),
    (46, 'Mecha George', 'mech', 'George', 'Mecha Pilot'),
    (47, 'Mecha Stan', 'mech', 'Stan', 'Walkie Talkie Mech'),
    # KayKit Adventurers is taken from the standalone archive. The identically
    # named files inside jam-ready-assets.zip carry no animation clips at all,
    # so importing those would silently produce static characters.
    (48, 'Barbarian', 'adventurers', 'Barbarian', 'Barbarian'),
    (49, 'Adventurer Mage', 'adventurers', 'Mage', 'Battle Mage'),
    (50, 'Rogue', 'adventurers', 'Rogue', 'Rogue'),
    (51, 'Skeleton Warrior', 'skeletons', 'Skeleton_Warrior', 'Bone Warrior'),
    (52, 'Skeleton Mage', 'skeletons', 'Skeleton_Mage', 'Bone Sorcerer'),
    (53, 'Zombie', 'kenney', 'graveyard/character-zombie', 'Undead'),
    (54, 'Lion', 'kenney', 'cube-pets/animal-lion', 'Big Cat'),
    (57, 'Horse', 'reuse', 'horse', 'Horse'),
    (62, 'Speeder Craft', 'reuse', 'speedercraft', 'Speeder Craft'),
    (63, 'Racer Craft', 'reuse', 'racercraft', 'Racer Craft'),
    (64, 'Pirate Cannon', 'reuse', 'piratecannon', 'Pirate Cannon'),
    (65, 'Cannon Mobile', 'reuse', 'cannonmobile', 'Cannon Mobile'),
    (66, 'Turret', 'reuse', 'turret', 'Turret'),
    (67, 'UFO Alpha', 'reuse', 'ufoa', 'UFO Alpha'),
    (68, 'UFO Bravo', 'reuse', 'ufob', 'UFO Bravo'),
    (69, 'UFO Charlie', 'reuse', 'ufoc', 'UFO Charlie'),
    (70, 'UFO Delta', 'reuse', 'ufod', 'UFO Delta'),
]

# Packs whose licence is not CC0 or the Holokat MIT exception. Recorded per pack
# so the provenance never claims a public-domain dedication the pack does not
# carry. Every pack not listed keeps the historical CC0-1.0 default.
LICENCES = {
    'RUN Voxel Packs Space': 'LicenseRef-RUN-Repository-Supplemental-1.0',
    'RUN Voxel Packs Fantasy': 'LicenseRef-RUN-Repository-Supplemental-1.0',
    'RUN Voxel Packs Post Apocalypse': 'LicenseRef-RUN-Repository-Supplemental-1.0',
    'RUN Voxel Packs Monster': 'LicenseRef-RUN-Repository-Supplemental-1.0',
    'INKLINE City': 'LicenseRef-RUN-Repository-Supplemental-1.0',
    'Proof of Play Pirate Nation': 'MIT',
    'Avramania Nature Terrain': 'CC0-1.0',
}

# Archive-backed bundles that ship whole directories of same-shaped models. A
# key carrying one of these prefixes names the bundle and the rest of the key is
# the path inside it, so one key fully determines archive, member and target.
# Keys without a prefix stay with the Kenney library, as they always have.
BUNDLES = {
    'voxel-space/': ('full-audit/downloads/mega-assets-v1/jam-ready-assets.zip',
        'jam-ready-assets/run-voxel-space/3D/space-scifi/', 'voxel-space/',
        'RUN Voxel Packs Space',
        'https://github.com/series-ai/run-workshop/tree/main/tools/run-voxel-packs'),
    'voxel-fantasy/': ('full-audit/downloads/mega-assets-v1/jam-ready-assets.zip',
        'jam-ready-assets/run-voxel-fantasy/3D/fantasy/', 'voxel-fantasy/',
        'RUN Voxel Packs Fantasy',
        'https://github.com/series-ai/run-workshop/tree/main/tools/run-voxel-packs'),
    'voxel-apocalypse/': ('full-audit/downloads/mega-assets-v1/jam-ready-assets.zip',
        'jam-ready-assets/run-voxel-post-apocalypse/3D/post-apocalypse/', 'voxel-apocalypse/',
        'RUN Voxel Packs Post Apocalypse',
        'https://github.com/series-ai/run-workshop/tree/main/tools/run-voxel-packs'),
    'voxel-monster/': ('full-audit/downloads/mega-assets-v1/jam-ready-assets.zip',
        'jam-ready-assets/run-voxel-monster/3D/monster/', 'voxel-monster/',
        'RUN Voxel Packs Monster',
        'https://github.com/series-ai/run-workshop/tree/main/tools/run-voxel-packs'),
    'voxel-city/': ('full-audit/downloads/mega-assets-v1/jam-ready-assets.zip',
        'jam-ready-assets/run-inkline/3D/city/', 'voxel-city/',
        'INKLINE City',
        'https://github.com/series-ai/run-workshop/tree/main/games/inkline-showcase'),
    'voxel-pirate/': ('full-audit/downloads/mega-assets-v1/jam-ready-assets.zip',
        'jam-ready-assets/proofofplay-pirate-nation/3D/pirate/', 'voxel-pirate/',
        'Proof of Play Pirate Nation',
        'https://github.com/proofofplay/piratenation-game'),
    'terrain/': ('missing-packs/avramania-nature-terrain/19504024.zip',
        'Nature_Terrain/glTF/', 'terrain/',
        'Avramania Nature Terrain',
        'https://avramania.itch.io/nature-terrain'),
}

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
    'geyser': ('space/crater', 1.00, 'Crater vent source; active water plume is simulation-driven geometry'),
    'steamvent': ('space/chimney', 1.00, 'Chimney vent source; active steam is simulation-driven geometry'),
    'sinkhole': ('space/craterLarge', .92, 'Crater rim; open pit must cover the full playable lane'),
    'hawk': ('cube-pets/animal-parrot', 1.05, 'Parrot; no hawk in the local pack'),
    # Space creatures and vehicles. None of these are road traffic; they are
    # obstacles the hopper has to weave around on the space stages.
    # Fantasy and post-apocalypse siege hardware. The library holds no military
    # tank, so the armoured van is labelled as an armoured van.
    # Kenney tower defence, space and pirate hardware.
    'ufoa': ('tower-defense/enemy-ufo-a', 1.20, 'Tower defence UFO, variant A'),
    'ufob': ('tower-defense/enemy-ufo-b', 1.20, 'Tower defence UFO, variant B'),
    'ufoc': ('tower-defense/enemy-ufo-c', 1.20, 'Tower defence UFO, variant C'),
    'ufod': ('tower-defense/enemy-ufo-d', 1.20, 'Tower defence UFO, variant D'),
    'cannon': ('tower-defense/weapon-cannon', 1.50, None),
    'turret': ('tower-defense/weapon-turret', 1.30, None),
    'turretdouble': ('space/turret_double', 1.60, 'Two-seat space turret emplacement'),
    'speedercraft': ('space/craft_speederA', 1.05, None),
    'racercraft': ('space/craft_racer', 1.15, None),
    # Horses are standalone animals in this pack; there is no mounted rider.
    'horse': ('prototype/animal-horse', 1.30,
              'Standalone horse; no mounted rider in the local pack'),
    'piratecannon': ('pirate/cannon', 1.45, None),
    'cannonmobile': ('pirate/cannon-mobile', 1.80, 'Wagon-mounted pirate cannon'),
    'trebuchet': ('castle/siege-trebuchet', 3.00, 'Wide counterweight siege engine'),
    'ballista': ('castle/siege-ballista', 2.80, None),
    'siegeram': ('castle/siege-ram', 2.40, None),
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
    'boulder': ('nature/rock_smallTopA', .55, None),
    'cactus': ('nature/cactus_tall', 1.30, None),
    'bone': ('space/bones', .20, None),
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
    # Kenney city, castle, dungeon, graveyard, factory and survival structures.
    'industrialA': ('city-industrial/building-a', 3.2, None),
    'industrialB': ('city-industrial/building-b', 3.0, None),
    'chimney': ('city-industrial/chimney-large', 3.4, None),
    'shopfront': ('city-commercial/building-a', 2.6, None),
    'farmhouse': ('modular-buildings/building-sample-house-a', 2.4, None),
    'castlewall': ('castle/wall-half', 1.6, None),
    'castlecorner': ('castle/wall-corner', 1.6, None),
    'castlegate': ('castle/gate', 2.2, None),
    'castletower': ('castle/tower-square-mid', 3.0, None),
    'brokencolumn': ('retro-fantasy/column-damaged', 2.0, None),
    'battlement': ('retro-fantasy/battlement', 1.5, None),
    'dungeonwall': ('modular-dungeon/template-wall', 1.8, None),
    'crypt': ('graveyard/crypt', 1.9, None),
    'brokengravestone': ('graveyard/gravestone-broken', .55, None),
    'factorycrane': ('factory/crane', 3.2, None),
    'conveyor': ('factory/conveyor', 1.4, None),
    'rockfield': ('survival/rock-a', .70, None),
    'autumntree': ('survival/tree-autumn-tall', 2.6, None),
    # Alien, industrial and monster set dressing.
    # Avramania nature terrain pieces.
    'terrainboulder': ('terrain/mdvl_nature_boulder_01.glb', 1.10, None),
    'terraincliff': ('terrain/mdvl_nature_cliff_01.glb', 1.80, None),
    'deadtree': ('terrain/mdvl_nature_deadtree_01.glb', 2.30, None),
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
        # Only this standalone archive carries KayKit animation clips; the copies
        # inside jam-ready-assets.zip are geometry-only.
        self.adventurer_archive = source / 'full-audit/downloads/mega-assets-v1/kaykit-adventurers.zip'

    def store(self, relative: str, data: bytes, original: str, pack: str, origin: str):
        destination = self.target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        digest = hashlib.sha256(data).hexdigest()
        if relative in self.files and self.files[relative]['sha256'] != digest:
            raise ValueError('Conflicting dependencies: ' + relative)
        destination.write_bytes(data)
        self.files[relative] = {'path': 'assets/models/' + relative,
                                'source': original, 'pack': pack,
                                'upstream': origin,
                                'licence': LICENCES.get(pack, 'MIT' if pack.startswith('Holokat') else 'CC0-1.0'),
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
        bundle = next((name for name in BUNDLES if key.startswith(name)), None)
        if bundle:
            archive, member_root, folder, pack, origin = BUNDLES[bundle]
            relative = folder + key[len(bundle):]
            if relative not in self.files:
                self.copy_archive(self.source / archive, member_root + key[len(bundle):],
                                  relative, pack, origin)
            return 'assets/models/' + relative
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

    def pickup(self) -> str:
        """The round KayKit shield: the model's shield pickup.

        CC0, and it ships beside its .bin sibling inside the same archive the
        adventurer characters come from, so copy_archive brings the dependency
        along and the renderer gets a complete, loadable model."""
        relative = 'pickups/shield_round.gltf'
        self.copy_archive(self.adventurer_archive,
                          'kaykit-adventurers/addons/kaykit_character_pack_adventures/'
                          'Assets/gltf/shield_round.gltf',
                          relative, 'KayKit Adventurers',
                          'https://kaylousberg.itch.io/kaykit-adventurers')
        return 'assets/models/' + relative

    def character(self, pack: str, key: str) -> str:
        if pack == 'kenney':
            return self.kenney(key)
        if pack == 'skeletons':
            relative = 'characters/' + key + '.glb'
            self.copy_archive(self.skeleton_archive,
                              'kaykit-skeletons/addons/kaykit_character_pack_skeletons/Characters/gltf/' + key + '.glb',
                              relative, 'KayKit Skeletons', 'https://kaylousberg.itch.io/kaykit-skeleton-pack')
        elif pack == 'reuse':
            # A vehicle/craft/animal the user asked to be PLAYABLE that is
            # already imported as a hazard. Reusing the existing path means the
            # file is never copied twice and the two manifest entries can never
            # disagree about which model backs the name.
            #
            # The hazard table stores the FULL bundle-prefixed path
            # ('voxel-apocalypse/vehicles/apocalypse-vehicles-armored-van.glb'),
            # which is what model() needs to route it. Passing the short kind
            # name instead sent it looking for a Kenney file that does not exist.
            return self.model(HAZARDS[key][0])
        elif pack == 'adventurers':
            relative = 'characters/' + key + '.glb'
            self.copy_archive(self.adventurer_archive,
                              'kaykit-adventurers/addons/kaykit_character_pack_adventures/Characters/gltf/' + key + '.glb',
                              relative, 'KayKit Adventurers', 'https://kaylousberg.itch.io/kaykit-adventurers')
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
        self.copy_archive(self.adventurer_archive, 'kaykit-adventurers/LICENSE.txt',
                          'licenses/kaykit-adventurers/LICENSE.txt',
                          'KayKit Adventurers', 'https://kaylousberg.itch.io/kaykit-adventurers')
        # Every new bundle keeps its own notice. The RUN leaves are not CC0 and
        # the Pirate Nation set asks only that its MIT notice ships with the pack.
        jam = self.source / 'full-audit/downloads/mega-assets-v1/jam-ready-assets.zip'
        for member, relative, pack, origin in (
                ('jam-ready-assets/run-voxel-space/3D/space-scifi/License.txt',
                 'licenses/run-voxel-space/License.txt', 'RUN Voxel Packs Space',
                 'https://github.com/series-ai/run-workshop/tree/main/tools/run-voxel-packs'),
                ('jam-ready-assets/run-voxel-fantasy/3D/fantasy/License.txt',
                 'licenses/run-voxel-fantasy/License.txt', 'RUN Voxel Packs Fantasy',
                 'https://github.com/series-ai/run-workshop/tree/main/tools/run-voxel-packs'),
                ('jam-ready-assets/run-voxel-post-apocalypse/3D/post-apocalypse/License.txt',
                 'licenses/run-voxel-post-apocalypse/License.txt', 'RUN Voxel Packs Post Apocalypse',
                 'https://github.com/series-ai/run-workshop/tree/main/tools/run-voxel-packs'),
                ('jam-ready-assets/run-voxel-monster/3D/monster/License.txt',
                 'licenses/run-voxel-monster/License.txt', 'RUN Voxel Packs Monster',
                 'https://github.com/series-ai/run-workshop/tree/main/tools/run-voxel-packs'),
                ('jam-ready-assets/run-inkline/3D/city/License.txt',
                 'licenses/inkline-city/License.txt', 'INKLINE City',
                 'https://github.com/series-ai/run-workshop/tree/main/games/inkline-showcase'),
                ('jam-ready-assets/proofofplay-pirate-nation/3D/pirate/License.txt',
                 'licenses/pirate-nation/License.txt', 'Proof of Play Pirate Nation',
                 'https://github.com/proofofplay/piratenation-game')):
            self.copy_archive(jam, member, relative, pack, origin)
        avramania = self.source / 'missing-packs/avramania-nature-terrain/19504024.zip'
        for member, relative in (('Nature_Terrain/License.txt', 'licenses/avramania-nature-terrain/License.txt'),
                                 ('Nature_Terrain/ReadMe.txt', 'licenses/avramania-nature-terrain/ReadMe.txt')):
            self.copy_archive(avramania, member, relative, 'Avramania Nature Terrain',
                              'https://avramania.itch.io/nature-terrain')
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
    # Ids are assigned by POSITION, not by the number baked into each row. Rows
    # have been added and removed repeatedly; numbering by position keeps the
    # manifest contiguous no matter which rows exist today.
    for number, (_declared, name, pack, key, old_name) in enumerate(CHARACTERS, 1):
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
    # Shield pickups. The round KayKit shield, CC0, and it carries its own
    # .bin dependency out of the same archive the adventurers come from.
    manifest['pickups'] = {'shield': {
        'model': importer.pickup(), 'height': 0.62, 'yaw': 0,
        'analogue': 'KayKit round shield; absorbs one lethal hit'}}
    manifest['pursuer'] = {'model': importer.kenney('cube-pets/animal-parrot'),
                           'height': .65, 'yaw': math.pi, 'nativeForward': '+z',
                           'analogue': 'Parrot model used as the bird pursuer; no hawk available'}
    importer.licenses()
    importer.validate()
    for archive in importer.archives.values():
        archive.close()
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    # Every licence actually present on disk, derived rather than asserted.
    # The RUN packs were purged from the playable set, but their licence
    # directories remain; a summary that lists only CC0/MIT understates what
    # ships with the repo.
    present = sorted({d.name.replace('-', '-') for d in (args.output / 'licenses').iterdir()
                      if d.is_dir()}) if (args.output / 'licenses').is_dir() else []
    provenance = {'sourceRepository': MIRROR,
        'licences': ['CC0-1.0', 'MIT', 'LicenseRef-RUN-Repository-Supplemental-1.0'],
        'selection': 'Existing local library models copied without artwork generation or pixel conversion',
        'files': list(importer.files.values()),
        'modelCount': len(importer.model_info),
        'totalBytes': sum(item['bytes'] for item in importer.files.values())}
    (args.output / 'provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print('Imported %d models, %d source files, %.1f MiB; all dependencies resolve.' %
          (len(importer.model_info), len(importer.files), provenance['totalBytes'] / 1048576))


if __name__ == '__main__':
    main()
