/* Does ensureSolvable() throw away the hazards buildRow() just made?
 *
 * Two entry points decide what a player meets at the start of a stage:
 * buildRow() places them, ensureSolvable() deletes the ones that would make a
 * lane unclearable at sprint speed. If the second one is eating the first,
 * raising density upstream changes nothing -- which is what "the killing things
 * are not coming" looks like from the outside.
 *
 * Both are called here on the same row with the same rng, so the drop is
 * measured rather than inferred. */

function pad(v, n) { v = String(v); while (v.length < n) v += " "; return v; }

function rngFor(seed) {
  var r = SimCore.createRng(seed);
  if (r && r.fork) return r.fork("6");
  return r;
}

print("=== ensureSolvable drop rate, rows 1-16, 30 seeds per stage ===");
print("stage           hazardousRows  built  dropped  kept%");
for (var s = 0; s < 10; s++) {
  var st = Stages.getStage(s);
  var haz = 0, built = 0, dropped = 0;
  for (var sd = 0; sd < 30; sd++) {
    for (var r = 1; r <= 16; r++) {
      var lane = Tiles.laneOf(r, st.laneMix, st.id);
      if (lane === "grass") continue;
      haz++;
      var rng = rngFor("drop-" + s + "-" + sd + "-" + r);
      var density = Hazards.rowDensity(r, 0.55);
      var b = Hazards.buildRow(r, 14, density, rng, s, undefined, undefined, 4, 0);
      var kept = Hazards.ensureSolvable(b, { needGap: 0.9 });
      built += b.length;
      dropped += (b.length - kept.length);
    }
  }
  var pct = built ? Math.round((built - dropped) * 100 / built) : 0;
  print(pad(s + " " + st.name, 16) + pad(haz, 15) + pad(built, 7) +
        pad(dropped, 8) + pad(pct + "%", 7));
}

print("");
print("=== one row in detail: stage 0, row 6, density " +
      Hazards.rowDensity(6, 0.55).toFixed(2) + " ===");
var b2 = Hazards.buildRow(6, 14, Hazards.rowDensity(6, 0.55), rngFor("solo"), 0,
                          undefined, undefined, 4, 0);
print("  built " + b2.length + " hazard(s)");
for (var i = 0; i < b2.length; i++) {
  var h = b2[i];
  var kind = (h.spec && (h.spec.name || h.spec.kind)) || "?";
  print("    [" + i + "] row=" + h.row + " kind=" + kind +
        " len=" + (h.spec && h.spec.len) +
        " x=" + h.x.toFixed(2) + " speed=" + h.speed.toFixed(2) +
        " armMs=" + (h.armMs || 0));
}
print("  laneHasGap(full, 6, 0.9, PEAK=" + Hazards.PEAK_SPEED_FACTOR.toFixed(2) +
      ") = " + Hazards.laneHasGap(b2, 6, 0.9, Hazards.PEAK_SPEED_FACTOR));
print("  laneHasGap(full, 6, 0.9, 1.00) = " +
      Hazards.laneHasGap(b2, 6, 0.9, 1.0));