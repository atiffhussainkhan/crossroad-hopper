function pad(v,n){v=String(v);while(v.length<n)v+=" ";return v;}

/* How much traffic does the opening of a stage carry?
 *
 * startStage(index) is used because createGame() always opens on stage 0 --
 * labelling a run "stage 6" without it measures Suburb against Rainforest's
 * lane mix and produces nonsense. Reported over many seeds, because a single
 * board proves nothing about a per-row probability. */
var N = 40;
print("=== opening traffic, all 10 stages, " + N + " seeds each ===");
print("stage name           hazardousRows  armed@0s  traffic%  armed@15s  traffic%");
var worst = 100;
for (var s = 0; s < 10; s++) {
  var haz = 0, armed0 = 0, armed15 = 0;
  for (var sd = 0; sd < N; sd++) {
    var g = SimCore.createGame({ playerCount: 1, seed: "open-" + s + "-" + sd });
    g.startStage(s);
    g.hop("forward", 0);
    for (var t = 0; t < 3; t++) g.tick(16.667);
    var st = g.currentStage();
    var snap = g.state();
    var p0 = {}, p15 = {};
    for (var i = 0; i < snap.hazards.length; i++) {
      var h = snap.hazards[i];
      if (h.row > 16) continue;
      if (!h.armMs) p0[h.row] = 1;
      if (!h.armMs || h.armMs <= 15000) p15[h.row] = 1;
    }
    for (var r = 1; r <= 16; r++) {
      if (Tiles.laneOf(r, st.laneMix, st.id) === "grass") continue;
      haz++;
      if (p0[r]) armed0++;
      if (p15[r]) armed15++;
    }
  }
  var pct0 = Math.round(armed0 * 100 / haz);
  worst = Math.min(worst, pct0);
  print(pad(s + " " + Stages.getStage(s).name, 19) + pad(haz, 15) +
        pad(armed0, 10) + pad(pct0 + "%", 10) +
        pad(armed15, 11) + pad(Math.round(armed15 * 100 / haz) + "%", 9));
}
print("");
print("weakest stage opening: " + worst + "% of hazardous rows carrying traffic at t=0");
