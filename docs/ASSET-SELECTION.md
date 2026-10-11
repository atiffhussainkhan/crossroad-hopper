# Selected 3D assets

Hopper uses actual glTF/GLB models from the existing local mirror of [atiffhussainkhan/Image](https://github.com/atiffhussainkhan/Image). The importer copied source bytes and their buffer/texture dependencies. No artwork was generated, no model was invented, and no character was converted into a raster sprite.

The selection contains **85 unique models** and **116 source/dependency/licence files**, totaling **41.4 MiB**. All **24 character choices have authored animation clips**. Kenney Cube Pets uses lower-case `idle` and `run`; Quaternius uses `Idle`, `Jump` or `Gallop_Jump`, and `Death`; the KayKit skeleton uses `Idle`, `Jump_Full_Short`, and `Death_A`.

## Source packs and rights

| Source pack | Imported use | Licence |
| --- | --- | --- |
| [Quaternius Ultimate Animated Characters](https://quaternius.com/packs/ultimatedanimatedcharacter.html) | Humanoid heroes | CC0 1.0 |
| [Quaternius Ultimate Animated Animals](https://quaternius.com/packs/ultimateanimatedanimals.html) | Shiba Inu, Fox, White Horse | CC0 1.0 |
| [Quaternius Animated Mechs](https://quaternius.com/packs/animatedmech.html) | Leela robot, flat color version | CC0 1.0 |
| [Kenney](https://kenney.nl/assets) | Cube Pets, vehicles, trains, boats, plants, buildings, props | CC0 1.0 |
| [KayKit Skeletons](https://kaylousberg.itch.io/kaykit-skeleton-pack) | Skeleton Minion | CC0 1.0 |
| [KayKit City Builder Bits](https://kaylousberg.itch.io/city-builder-bits) | Fire hydrant | CC0 1.0 |
| [Tiny Treats](https://tinytreats.itch.io/) | Homely House mailbox and Bubbly Bathroom rubber duck | CC0 1.0 |
| [Holokat game assets](https://github.com/holokat/game-assets) | Existing textureless farm forklift | MIT; copyright/licence notice retained |

Original licence notices live under `assets/models/licenses/`. `assets/models/provenance.json` records each imported file's pack, original local/archive member path, upstream URL, licence, SHA-256 and size. Quaternius `SOURCE.json` records preserve the official distribution file IDs.

The Quaternius packs are mirrored in [catalog-completion-2026-10-06](https://github.com/atiffhussainkhan/Image/releases/tag/catalog-completion-2026-10-06). The other imported packs come from the existing `mega-assets-v1`, `mega-assets-expansion-v1`, and `mega-assets-expansion-v2` local release archives.

## Stable character choices

Saved character IDs remain `char_01` through `char_24`. Display names follow the actual selected model. The old name column documents replacements where the old 2D avatar had no suitable model in the usable local packs.

| ID | Model display name | Original 2D name | Source model |
| --- | --- | --- | --- |
| char_01 | Casual Male | Boy Cap | `assets/models/characters/Casual_Male.gltf` |
| char_02 | Casual 3 Male | Blue Hoodie | `assets/models/characters/Casual3_Male.gltf` |
| char_03 | Cat | Cat | `assets/models/kenney/cube-pets/animal-cat.glb` |
| char_04 | Leela Robot | Robot | `assets/models/characters/Leela.gltf` |
| char_05 | Shiba Inu | Dog | `assets/models/characters/ShibaInu.gltf` |
| char_06 | Ninja | Ninja | `assets/models/characters/Ninja_Male.gltf` |
| char_07 | Bunny | Bunny | `assets/models/kenney/cube-pets/animal-bunny.glb` |
| char_08 | Wizard | Wizard | `assets/models/characters/Wizard.gltf` |
| char_09 | Goblin | Alien | `assets/models/characters/Goblin_Male.gltf` |
| char_10 | Pirate | Pirate | `assets/models/characters/Pirate_Male.gltf` |
| char_11 | Penguin | Penguin | `assets/models/kenney/cube-pets/animal-penguin.glb` |
| char_12 | Knight | Knight | `assets/models/characters/Knight_Male.gltf` |
| char_13 | Fox | Fox | `assets/models/characters/Fox.gltf` |
| char_14 | Blue Soldier | Astronaut | `assets/models/characters/BlueSoldier_Female.gltf` |
| char_15 | Pig | Pig | `assets/models/kenney/cube-pets/animal-pig.glb` |
| char_16 | Soldier | Superhero | `assets/models/characters/Soldier_Male.gltf` |
| char_17 | Polar Bear | Bear | `assets/models/kenney/cube-pets/animal-polar.glb` |
| char_18 | Chef | Chef | `assets/models/characters/Chef_Hat.gltf` |
| char_19 | Skeleton | Skeleton | `assets/models/characters/Skeleton_Minion.glb` |
| char_20 | Koala | Koala | `assets/models/kenney/cube-pets/animal-koala.glb` |
| char_21 | Worker Male | Builder | `assets/models/characters/Worker_Male.gltf` |
| char_22 | Crab | Frog | `assets/models/kenney/cube-pets/animal-crab.glb` |
| char_23 | Worker Female | Firefighter | `assets/models/characters/Worker_Female.gltf` |
| char_24 | White Horse | Unicorn | `assets/models/characters/Horse_White.gltf` |

## Hazard selection

Every declared hazard kind has a model reference. Exact matches are preferred. When a usable exact model is absent, the manifest explicitly records the analogue. These substitutions change appearance; timing, movement, collision, telegraphing, and full-lane hazards remain owned by the simulation.

| Simulation kind | Selected model | Exact match or documented analogue |
| --- | --- | --- |
| car | `assets/models/kenney/car/sedan.glb` | Exact subject |
| taxi | `assets/models/kenney/car/taxi.glb` | Exact subject |
| racecar | `assets/models/kenney/car/race.glb` | Exact subject |
| police | `assets/models/kenney/car/police.glb` | Exact subject |
| limousine | `assets/models/kenney/car/suv-luxury.glb` | Luxury SUV; no limousine in the local pack |
| truck | `assets/models/kenney/car/truck.glb` | Exact subject |
| bus | `assets/models/kenney/car/delivery.glb` | Delivery van; no bus in the local pack |
| tractor | `assets/models/kenney/car/tractor.glb` | Exact subject |
| forklift | `assets/models/holokat/Forklift.glb` | Exact subject |
| roller | `assets/models/kenney/car/truck-flat.glb` | Flatbed work truck; no road roller in the local pack |
| tumbleweed | `assets/models/kenney/nature/plant_bushLargeTriangle.glb` | Dry bush model used for rolling vegetation |
| ambulance | `assets/models/kenney/car/ambulance.glb` | Exact subject |
| cementmixer | `assets/models/kenney/retro-urban/truck-grey-cargo.glb` | Cargo construction truck; no cement mixer in the local pack |
| motorbike | `assets/models/kenney/car/kart-oopi.glb` | Kart; no motorbike in the local pack |
| golfcart | `assets/models/kenney/car/kart-ooli.glb` | Small kart used as a cart analogue |
| train | `assets/models/kenney/train/train-locomotive-c.glb` | Exact subject |
| tram | `assets/models/kenney/train/train-tram-round.glb` | Exact subject |
| monorail | `assets/models/kenney/train/train-electric-bullet-c.glb` | Electric bullet train used for monorail traffic |
| freighttrain | `assets/models/kenney/train/train-carriage-container-blue.glb` | Exact subject |
| subway | `assets/models/kenney/train/train-electric-subway-a.glb` | Exact subject |
| log | `assets/models/kenney/nature/log.glb` | Exact subject |
| turtle | `assets/models/kenney/cube-pets/animal-crab.glb` | Crab; no turtle in the local pack |
| alligator | `assets/models/kenney/watercraft/boat-row-large.glb` | Rowboat; no alligator in the local pack |
| crocodile | `assets/models/kenney/watercraft/boat-tow-a.glb` | Towboat; no crocodile in the local pack |
| canoe | `assets/models/kenney/watercraft/boat-row-small.glb` | Small rowboat used as a canoe analogue |
| duck | `assets/models/tiny-treats/bubbly-bathroom/ducky.gltf` | Rubber duck from the existing Tiny Treats pack |
| swan | `assets/models/kenney/cube-pets/animal-parrot.glb` | Parrot bird; no swan in the local pack |
| icefloe | `assets/models/kenney/platformer/block-snow-low.glb` | Snow block used as a floating ice platform |
| sled | `assets/models/kenney/holiday/sled.glb` | Exact subject |
| snake | `assets/models/kenney/cube-pets/animal-caterpillar.glb` | Caterpillar; no snake in the local pack |
| boulder | `assets/models/kenney/nature/rock_largeA.glb` | Exact subject |
| geyser | `assets/models/kenney/space/crater.glb` | Crater vent source; active water plume is simulation-driven geometry |
| steamvent | `assets/models/kenney/space/chimney.glb` | Chimney vent source; active steam is simulation-driven geometry |
| sinkhole | `assets/models/kenney/space/craterLarge.glb` | Crater rim; open pit must cover the full playable lane |
| hawk | `assets/models/kenney/cube-pets/animal-parrot.glb` | Parrot; no hawk in the local pack |

## Scenery across the ten stages

All scenery keys from `Stages.STAGES` resolve. `treeBack` and `treeFront` share the same tree asset. Rail track is available separately. The chosen packs supply suburban trees/fences/mailboxes, river plants and lilies, desert cacti/bones/rocks, farmland hay and a windmill, city buildings/lights/hydrants, snowy pines and ice mounds, rainforest foliage, construction scaffolds/crates/cones, and storm/volcanic rocks and debris. Stage lighting and ground palettes preserve the campaign themes.

| Scenery kind | Selected model | Analogue, when needed |
| --- | --- | --- |
| hedge | `assets/models/kenney/nature/plant_bushLarge.glb` | Exact subject |
| tree | `assets/models/kenney/nature/tree_oak.glb` | Exact subject |
| mailbox | `assets/models/tiny-treats/homely-house/mailbox.gltf` | Exact subject |
| bush | `assets/models/kenney/nature/plant_bush.glb` | Exact subject |
| flowerbed | `assets/models/kenney/nature/flower_redA.glb` | Flower cluster |
| fence | `assets/models/kenney/city-suburban/fence.glb` | Exact subject |
| reed | `assets/models/kenney/nature/plant_flatTall.glb` | Tall waterside plant |
| lily | `assets/models/kenney/nature/lily_large.glb` | Exact subject |
| rock | `assets/models/kenney/nature/rock_smallTopA.glb` | Exact subject |
| cactus | `assets/models/kenney/nature/cactus_tall.glb` | Exact subject |
| bone | `assets/models/kenney/space/bones.glb` | Exact subject |
| boulder | `assets/models/kenney/nature/rock_largeA.glb` | Exact subject |
| haybale | `assets/models/kenney/graveyard/hay-bale.glb` | Exact subject |
| windmill | `assets/models/kenney/fantasy-town/windmill.glb` | Exact subject |
| neon | `assets/models/kenney/racing/lightColored.glb` | Colored signal light; no neon sign in the local pack |
| building | `assets/models/kenney/city-suburban/building-type-a.glb` | Exact subject |
| streetlamp | `assets/models/kenney/city-roads/light-curved.glb` | Exact subject |
| hydrant | `assets/models/kaykit-city/firehydrant.gltf` | Exact subject |
| postbox | `assets/models/tiny-treats/homely-house/mailbox.gltf` | Mailbox used for the street postbox |
| pine | `assets/models/kenney/platformer/tree-pine-snow.glb` | Exact subject |
| iceberg | `assets/models/kenney/platformer/block-snow-large-slope.glb` | Snow-covered slope used as ice mound |
| vine | `assets/models/kenney/nature/plant_flatTall.glb` | Tall foliage; no vine in the local pack |
| fern | `assets/models/kenney/nature/grass_leafsLarge.glb` | Leaf cluster used as a fern analogue |
| scaffold | `assets/models/kenney/retro-urban/scaffolding-structure.glb` | Exact subject |
| cone | `assets/models/kenney/city-roads/construction-cone.glb` | Exact subject |
| crate | `assets/models/kenney/platformer/crate.glb` | Exact subject |
| pylon | `assets/models/kenney/racing/pylon.glb` | Track pylon used as an industrial roadside tower |
| puddle | `assets/models/kenney/nature/ground_riverStraight.glb` | Low river tile used as a water patch |
| debris | `assets/models/kenney/graveyard/debris.glb` | Exact subject |
| lavaVent | `assets/models/kenney/space/crater.glb` | Crater vent; lava lighting is applied by the renderer |
| obsidian | `assets/models/kenney/space/rock_crystals.glb` | Crystal rock; dark stage lighting supplies the volcanic appearance |
| rail | `assets/models/kenney/train/track.glb` | Exact subject |
| treeBack | `assets/models/kenney/nature/tree_oak.glb` | Exact subject |
| treeFront | `assets/models/kenney/nature/tree_oak.glb` | Exact subject |

## Size, transparency, and movement

Each character targets **1.1 world tiles in height**, with its feet grounded and the source origin centered. Wide or long animals are uniformly reduced to fit a 1.2-tile width and 1.6-tile depth, preserving their proportions. Authored idle, run/walk and death clips provide local motion while the simulation controls the world position and hop arc; jump clips remain in the original files.

Moving hazards are oriented first, then their world X extent is fitted to the actual `h.len`, with height and lane depth bounded separately. This makes visible lengths match the simulation's collision footprints. The native forward direction of Kenney cars is **+Z**: sedan front wheel nodes have z = +0.66 and rear wheels z = -0.66. A yaw of +pi/2 makes them travel along +X. The Holokat forklift mast/forks also extend toward +Z.

Models have geometry and materials rather than rectangular sprite backgrounds. Transparent WebGL gallery canvases show their silhouettes against the page. The live scene uses genuine depth testing; no flattened checkerboard or white image backdrop is embedded in these models.

The parrot model is the documented bird pursuer analogue. Geyser/steam vent sources are imported crater/chimney models. Timed plumes and the open full-lane sinkhole must be driven by `Hazards.isActive` and the simulation clock, with geometry matching their real dangerous extent.

## Additional local-pack audit

A search across **37 existing local archives** found school bus, motorbike, astronaut and unicorn models in RUN packs, but their retained licence limits use to RUN before 2028. They were excluded from this independent browser game. The Tiny Treats mailbox and rubber duck, KayKit firehydrant, and MIT Holokat forklift were used to improve exact matching instead.

No suitable turtle, crocodile, alligator, snake or hawk model filename was found in those local archives. Their manifest entries retain explicit analogue descriptions. Frog-pond and Duck-House entries are scenery assemblies, not standalone animal avatars. The cleaned user-supplied raster archive also retains unverified artwork licences and was not used for this model selection.

## Re-import and verify

The importer uses only the Python standard library and existing local files:

```sh
python3 tools/import_library_models.py --library-work /path/to/local/Image/work
python3 tools/check_models.py
```

It copies source models byte-for-byte, rejects non-local dependencies, resolves all external `.bin` and texture paths, and writes the renderer manifest and per-file provenance. The importer does not fetch or generate artwork. Runtime and browser checks are separate from file integrity checks.
