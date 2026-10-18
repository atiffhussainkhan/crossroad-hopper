/* tools/probes/growth_ramp.js — measures Stages.growthFor() through the REAL
 * generator. Appended to the module bundle by tools/check_growth_ramp.py. */
var H = Hazards, S = Stages, C = SimCore;

var COLS = 14, XMIN = 4;          /* the game's own board: sim-core.js playMin/playMax */
var STEPS = [0, 15, 30, 45, 60, 75, 90];
var SEEDS = 12;
var out = { problems: [], stats: {} };

function pad(v, n) { v = String(v); while (v.length < n) v += " "; return v; }

/* Rows in the LOWER HALF of a stage: past the opening guarantee, and far from
 * the endgame window in either case. Derived from the stage's own length. */
function bandFor(si) {
  var lo = H.OPENING_GUARANTEED_ROWS + 1;
  var hi = Math.floor(S.jumpsFor(si) / 2);
  var rows = [];
  var stride = Math.max(1, Math.floor((hi - lo) / 24));
  for (var r = lo; r < hi; r += stride) rows.push(r);
  return rows;
}

/* ---- 1. the multiplier itself, derived from the exported constants ------- */
var expected = STEPS.map(function (j) {
  var n = Math.floor(j / S.DIFFICULTY_STEP_JUMPS);
  if (n > S.MAX_GROWTH_STEPS) n = S.MAX_GROWTH_STEPS;
  return Math.pow(S.GROWTH_PER_STEP, n);
});
var measured = STEPS.map(function (j) { return S.growthFor(j); });
out.stats.multiplier = STEPS.map(function (j, k) {
  return { jumps: j, expected: expected[k], measured: measured[k] };
});
for (var k1 = 0; k1 < STEPS.length; k1++) {
  if (Math.abs(measured[k1] - expected[k1]) > 1e-9) {
    out.problems.push("growthFor(" + STEPS[k1] + ") is " + measured[k1].toFixed(4) +
      "; " + S.GROWTH_PER_STEP + "^min(floor(" + STEPS[k1] + "/" +
      S.DIFFICULTY_STEP_JUMPS + "), " + S.MAX_GROWTH_STEPS + ") is " +
      expected[k1].toFixed(4));
  }
}
if (measured[measured.length - 1] <= measured[0]) {
  out.problems.push("growthFor does not rise across a stage: " +
    measured[0].toFixed(3) + " -> " + measured[measured.length - 1].toFixed(3));
}

/* ---- 2. the density channel growth actually drives ---------------------- */
out.stats.ramp = STEPS.map(function (j) { return S.rampFor(j); });
for (var k2 = 1; k2 < STEPS.length; k2++) {
  if (!(out.stats.ramp[k2] > out.stats.ramp[k2 - 1])) {
    out.problems.push("the density ramp is flat between jump " + STEPS[k2 - 1] +
      " and " + STEPS[k2] + ": " + out.stats.ramp[k2 - 1].toFixed(4) + " -> " +
      out.stats.ramp[k2].toFixed(4));
  }
}

/* ---- 3. THE REAL GENERATOR, growth passed explicitly -------------------- */
var pooledCount = [], pooledSpeed = [], perStage = [];
var totalRows = 0;
for (var si = 0; si < S.stageCount(); si++) {
  var D = S.getStage(si).baseline + 5;
  var rows = bandFor(si);
  totalRows += rows.length;
  var counts = [], means = [];
  for (var q = 0; q < STEPS.length; q++) {
    var g = S.growthFor(STEPS[q]);
    var live = 0, spd = 0, n = 0;
    for (var ri = 0; ri < rows.length; ri++) {
      for (var sd = 0; sd < SEEDS; sd++) {
        var tag = "gr:" + si + ":" + rows[ri] + ":" + sd;
        var made = H.hazardsForRow(tag, rows[ri], COLS, D,
                                   C.createRng(tag), si, XMIN, g);
        live += made.length;
        for (var i = 0; i < made.length; i++) spd += Math.abs(made[i].speed);
        n++;
      }
    }
    counts.push(live / n);
    means.push(n ? spd / live : 0);
  }
  perStage.push({ stage: si + 1, rows: rows.length, counts: counts, meanSpeed: means });
  for (var q2 = 0; q2 < STEPS.length; q2++) {
    pooledCount[q2] = (pooledCount[q2] || 0) + perStage[si].counts[q2];
    pooledSpeed[q2] = (pooledSpeed[q2] || 0) + perStage[si].meanSpeed[q2];
  }
}
var ns = S.stageCount();
pooledCount = pooledCount.map(function (v) { return v / ns; });
pooledSpeed = pooledSpeed.map(function (v) { return v / ns; });
out.stats.livePerRow = pooledCount;
out.stats.meanSpeed = pooledSpeed;
out.stats.perStage = perStage;
out.stats.rowsPerStage = totalRows / ns;

/* Counts are averages over ~24 rows x 12 seeds per stage, so a small negative
 * step is sampling noise rather than a real reversal. 0.005 of a hazard per row
 * is ~1% of the first step's mean and well inside the seed-to-seed spread. */
var NOISE = 0.005;
for (var q3 = 1; q3 < STEPS.length; q3++) {
  if (pooledCount[q3] < pooledCount[q3 - 1] - NOISE) {
    out.problems.push("the number of live hazards FALLS between jump " +
      STEPS[q3 - 1] + " and " + STEPS[q3] + ": " +
      pooledCount[q3 - 1].toFixed(4) + " -> " + pooledCount[q3].toFixed(4) +
      "; the board is not getting more dangerous");
  }
}
/* The end-to-end rise is the real claim, and it is far outside the noise:
 * measured 1.57x, asserted at 1.25x. */
var ratio = pooledCount[pooledCount.length - 1] / pooledCount[0];
out.stats.countRatio = ratio;
if (ratio < 1.25) {
  out.problems.push("live hazards per row only rise " + ratio.toFixed(3) +
    "x across a stage (" + pooledCount[0].toFixed(3) + " -> " +
    pooledCount[pooledCount.length - 1].toFixed(3) +
    "); the +50%-every-15-hops ramp is not reaching the board");
}

/* ---- 4. the growth ARGUMENT is actually consumed ------------------------- */
/* Same row, same seed, growth 1 against growth at the last step. If the eighth
 * argument were ignored, these two boards would be identical. */
var probeRows = bandFor(0);
var flatLo = 0, flatHi = 0, flatN = 0;
for (var ri2 = 0; ri2 < probeRows.length; ri2++) {
  for (var sd2 = 0; sd2 < SEEDS * 2; sd2++) {
    var t1 = "arg:" + probeRows[ri2] + ":" + sd2;
    flatLo += H.hazardsForRow(t1, probeRows[ri2], COLS, 5, C.createRng(t1), 0,
                              XMIN, 1).length;
    flatHi += H.hazardsForRow(t1, probeRows[ri2], COLS, 5, C.createRng(t1), 0,
                              XMIN, S.growthFor(STEPS[STEPS.length - 1])).length;
    flatN++;
  }
}
out.stats.argIgnoredLow = flatLo / flatN;
out.stats.argIgnoredHigh = flatHi / flatN;
if (flatHi <= flatLo) {
  out.problems.push("hazardsForRow ignores its growth argument: growth 1 gives " +
    (flatLo / flatN).toFixed(4) + " hazards per row and growth " +
    S.growthFor(STEPS[STEPS.length - 1]).toFixed(2) + " gives " +
    (flatHi / flatN).toFixed(4) + "; nothing on the board reads the multiplier");
}

/* ---- 5. the speed channel ----------------------------------------------- */
out.stats.pace = STEPS.map(function (j) { return S.pressureFor(j).pace; });
for (var q4 = 1; q4 < STEPS.length; q4++) {
  if (!(out.stats.pace[q4] > out.stats.pace[q4 - 1])) {
    out.problems.push("board pace does not rise between jump " + STEPS[q4 - 1] +
      " and " + STEPS[q4] + ": " + out.stats.pace[q4 - 1] + " -> " + out.stats.pace[q4]);
  }
}
var sfByStage = [];
for (var si2 = 0; si2 < S.stageCount(); si2++) {
  var line = STEPS.map(function (j) {
    return H.speedFactorAt(S.hazardClockFor(j, si2));
  });
  sfByStage.push({ stage: si2 + 1, speedFactors: line });
  for (var q5 = 1; q5 < STEPS.length; q5++) {
    if (line[q5] < line[q5 - 1] - 1e-9) {
      out.problems.push("stage " + (si2 + 1) + " runs SLOWER at jump " +
        STEPS[q5] + " than at " + STEPS[q5 - 1] + ": " +
        line[q5 - 1].toFixed(4) + " -> " + line[q5].toFixed(4));
    }
  }
  if (line[line.length - 1] <= line[0]) {
    out.problems.push("stage " + (si2 + 1) + " never runs faster than it opened: " +
      line[0].toFixed(4) + " -> " + line[line.length - 1].toFixed(4));
  }
}
out.stats.speedByStage = sfByStage;

print("=== the +50%-every-15-hops ramp, measured on the real generator ===");
print("rows sampled per stage: ~" + Math.round(out.stats.rowsPerStage) +
      "   seeds/row: " + SEEDS + "   stages: " + ns);
print("");
print("jumps  growth    ramp    pace   live/row   vs prev   meanSpeed");
for (var q6 = 0; q6 < STEPS.length; q6++) {
  var d = q6 === 0 ? "   --" :
          ((pooledCount[q6] - pooledCount[q6 - 1]) >= 0 ? "+" : "") +
          (pooledCount[q6] - pooledCount[q6 - 1]).toFixed(4);
  print(pad(STEPS[q6], 6) + pad(measured[q6].toFixed(4), 9) +
        pad(out.stats.ramp[q6].toFixed(4), 8) + pad(out.stats.pace[q6].toFixed(3), 8) +
        pad(pooledCount[q6].toFixed(4), 12) + pad(d, 11) +
        pad(pooledSpeed[q6].toFixed(4), 12));
}
print("");
print("live hazards per row, by stage:");
for (var si3 = 0; si3 < perStage.length; si3++) {
  print("  stage " + pad(perStage[si3].stage, 3) + " " +
        perStage[si3].counts.map(function (v) { return v.toFixed(3); }).join("  "));
}
print("");
print("growth argument is read by the generator: growth=1 gives " +
      out.stats.argIgnoredLow.toFixed(4) + " hazards/row, growth=" +
      measured[measured.length - 1].toFixed(2) + " gives " +
      out.stats.argIgnoredHigh.toFixed(4));
print("end-to-end rise: " + ratio.toFixed(3) + "x live hazards per row");
print("");
print("board speed factor at each growth step:");
for (var si4 = 0; si4 < sfByStage.length; si4++) {
  print("  stage " + pad(sfByStage[si4].stage, 3) + " " +
        sfByStage[si4].speedFactors.map(function (v) { return v.toFixed(3); }).join("  "));
}
print("");
if (out.problems.length) {
  for (var p = 0; p < out.problems.length; p++) print("  PROBLEM: " + out.problems[p]);
}
console.log("@@P@@" + JSON.stringify(out));