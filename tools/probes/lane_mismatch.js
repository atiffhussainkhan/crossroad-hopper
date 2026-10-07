function pad(v,n){v=String(v);while(v.length<n)v+=" ";return v;}

/* Does the spawner put a hazard on a row the renderer draws as something else?
 *
 * Two things this had to get right, both of which it got wrong first time:
 *
 *   - createGame() always opens on stage 0. Labelling a run "stage 4" and then
 *     comparing its hazards against stage 4's lane mix measures Suburb's cars
 *     against Night City's rails and produces a wall of fictional mismatches.
 *     startStage(index) is exported for exactly this.
 *   - a hazard's spec.kind is not its identity. `pit`, `hawk` and the geyser
 *     family are placed by their own rules and are legal on lanes that do not
 *     match their nominal kind, so they are exempt rather than counted. */

var SPECIAL = { pit: 1, sinkhole: 1, hawk: 1, geyser: 1, steamvent: 1, boulder: 1 };
var MISMATCH = 0, CHECKED = 0, SPECIALS = 0;

print("stage  name            hazards  checked  specials  mismatches");
for (var s = 0; s < 10; s++) {
  var g = SimCore.createGame({ playerCount: 1, seed: "mm-" + s });
  g.startStage(s);
  g.hop("forward", 0);
  for (var t = 0; t < 4; t++) g.tick(16.667);
  var st = g.currentStage();
  var snap = g.state();
  var m = 0, sp = 0;
  for (var i = 0; i < snap.hazards.length; i++) {
    var h = snap.hazards[i];
    var kind = (h.spec && h.spec.kind) || "?";
    var name = (h.spec && h.spec.name) || kind;
    if (SPECIAL[kind]) { sp++; continue; }
    CHECKED++;
    var lane = Tiles.laneOf(h.row, st.laneMix, st.id);
    var implied = { ground: "road", rail: "rail", water: "water" }[kind];
    if (!implied || lane !== implied) { m++; MISMATCH++; }
  }
  SPECIALS += sp;
  print(pad(s, 7) + pad(st.name, 16) + pad(snap.hazards.length, 8) +
        pad(CHECKED, 9) + pad(sp, 9) + pad(m, 11));
}
print("");
print("lane-typed hazards checked: " + CHECKED + "   mismatches: " + MISMATCH +
      "   (special hazards exempt: " + SPECIALS + ")");
