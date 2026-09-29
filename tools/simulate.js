// tools/simulate.js — JXA wrapper for running the simulation headlessly.
//
// Reads seeds from a file path passed via the GAME_SEEDS_FILE environment
// variable, emits one JSON result per line on stdout via console.log. The
// Python gate in tools/check_vertical_slice.py writes the temp file and
// parses the output, avoiding the per-invocation osascript startup cost
// AND the JXA stdin issue on macOS where fileHandleWithStandardInput is
// not callable in JXA.
//
//   python3 tools/check_vertical_slice.py
//
// (do not call this script directly — call through the gate)

ObjC.import('Foundation');

function gameDir() {
  var env = $.NSProcessInfo.processInfo.environment;
  var v = env.objectForKey("GAME_DIR");
  if (v !== undefined && v !== null) {
    var s = ObjC.unwrap(v);
    if (s && s.length > 0) return s;
  }
  return ObjC.unwrap($.NSFileManager.defaultManager.currentDirectoryPath);
}

var GAME_DIR = gameDir();

// stages.js must load before sim-core.js: the core reads its constants at
// definition time.
["src/stages.js", "src/hazards.js", "src/sim-core.js"].forEach(function (rel) {
  var text = $.NSString.stringWithContentsOfFileEncodingError(
    GAME_DIR + "/" + rel, $.NSUTF8StringEncoding, null
  );
  if (text === null) throw new Error("could not read " + rel);
  eval(ObjC.unwrap(text));
});

var env = $.NSProcessInfo.processInfo.environment;
var seedsFile = env.objectForKey("GAME_SEEDS_FILE");
if (seedsFile === undefined || seedsFile === null) {
  throw new Error("GAME_SEEDS_FILE environment variable is required");
}
var seedsPath = ObjC.unwrap(seedsFile);

var seedsText = $.NSString.stringWithContentsOfFileEncodingError(
  seedsPath, $.NSUTF8StringEncoding, null
);
if (seedsText === null) throw new Error("could not read seeds file " + seedsPath);
seedsText = ObjC.unwrap(seedsText);

var lines = seedsText.split("\n");
for (var i = 0; i < lines.length; i++) {
  var seed = lines[i];
  if (!seed || seed.length === 0) continue;
  // "2:<seed>" runs a two-player campaign; a bare seed runs one player.
  var twoPlayer = seed.indexOf("2:") === 0;
  var s = twoPlayer ? seed.slice(2) : seed;
  var result = SimCore.simulateCampaign(s, { playerCount: twoPlayer ? 2 : 1 });
  console.log(JSON.stringify(result));
}
