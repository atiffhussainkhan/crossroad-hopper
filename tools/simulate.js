// Campaign driver loaded by tools/check_vertical_slice.py.
// The Python gate supplies __SEEDS and loads the real simulation modules in
// script order. No native macOS APIs or CommonJS wrappers are needed.
for (var i = 0; i < __SEEDS.length; i++) {
  var seed = __SEEDS[i];
  if (!seed) continue;
  var twoPlayer = seed.indexOf("2:") === 0;
  var campaignSeed = twoPlayer ? seed.slice(2) : seed;
  var result = SimCore.simulateCampaign(campaignSeed, { playerCount: twoPlayer ? 2 : 1 });
  print(JSON.stringify(result));
}
