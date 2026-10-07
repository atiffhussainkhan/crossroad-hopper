function pad(v,n){v=String(v);while(v.length<n)v+=" ";return v;}

/* Direct, deterministic test of the cycle clock: hand one cycled hazard to
 * tickHazards on a 60Hz clock and time how long it reports itself lethal.
 * A geyser declaring on:1200 / periodMs:3000 must be open ~1.2s of every 3.0s
 * and closed ~1.8s. Before the fix it stayed open for 1200 SECONDS. */
print("=== FIX 1: cycle clock is now milliseconds end to end ===");
var spec = { len: 1.0, speed: [0,0], kind: "air", cycle: { on: 1200, periodMs: 3000 } };
var h = {
  kind: "geyser", spec: spec, row: 5, dir: 1, baseSpeed: 0, speed: 0,
  armMs: 0, now: 0, osc: null,
  cycle: { on: 1200, periodMs: 3000, warn: 0, t: 0 },
  x: 6
};
var openMs = 0, closedMs = 0;
for (var i = 0; i < 600; i++) {                    // 10 seconds at 60Hz
  Hazards.tickHazards([h], 1000/60, 14, 1000);    // h.now is set from elapsed
  h.now = (i+1) * (1000/60);
  if (Hazards.isActive(h)) openMs += 1000/60; else closedMs += 1000/60;
}
print("  over 10s: open "+Math.round(openMs)+"ms, closed "+Math.round(closedMs)+"ms");
print("  expected roughly open 4000ms / closed 6000ms (on 1200 of every 3000)");
var ratio = openMs / (openMs + closedMs);
print("  open fraction "+ratio.toFixed(2)+" (expect ~0.40)  "+
      (ratio > 0.05 && ratio < 0.95 ? "PASSES - it opens AND closes" : "STILL BROKEN"));

print("");
print("=== FIX 2: laneHasGap judges the game's real board ===");
print("  wrap span "+(14+1.5+1.5)+" tiles (was 12), cols 4-9 (was 0-8), margin 0.28 (was 0.30)");
var crossable=0, total=0, blocked=0;
for (var s=0;s<10;s++){
  for (var seed=0;seed<25;seed++){
    var gd=SimCore.createGame({playerCount:1,seed:"gap-"+s+"-"+seed});
    gd.startStage(s); gd.hop("forward",0);
    for (var t=0;t<6;t++) gd.tick(16.667);
    var sd=gd.state();
    for (var r=1;r<=16;r++){
      var rows=sd.hazards.filter(function(x){return x.row===r;});
      if(!rows.length) continue;
      total++;
      if (Hazards.laneHasGap(rows, r, 0.9, Hazards.PEAK_SPEED_FACTOR, 14, 4, 9)) crossable++;
    }
  }
}
print("  rows judged crossable at sprint speed: "+crossable+"/"+total+" = "+
      Math.round(crossable*100/total)+"%");

print("");
print("=== FIX 3: ENDLESS is a live board ===");
var ge=SimCore.createGame({playerCount:1,seed:"endless-fix"});
ge.startStage(9); ge.hop("forward",0);
var guard=0;
while (ge.state().phase !== "ENDLESS" && guard < 40000) {
  ge.tick(16.667); guard++;
  var ph=ge.state().phase;
  if (ph==="READY"||ph==="STAGE_CLEAR"||ph==="STAGE_FAILED") { ge.hop("forward",0); }
  if (ph==="DEAD") { /* let the beat run out */ }
}
print("  reached phase after "+guard+" ticks: "+ge.state().phase);
if (ge.state().phase!=="ENDLESS"){ ge.state().phase = "ENDLESS"; print("  (forced into ENDLESS directly for the test)"); }
if (ge.state().phase==="ENDLESS"){
  var before=ge.state().hazards.length;
  var xs=ge.state().hazards.map(function(x){return x.x;});
  for (var b=0;b<3600;b++) ge.tick(16.667);
  var s4=ge.state();
  var mv=0;
  for (var q=0;q<Math.min(xs.length,s4.hazards.length);q++) if(s4.hazards[q].x!==xs[q]) mv++;
  print("  hazards "+before+" -> "+s4.hazards.length+" over 60s; moved: "+mv+
        (mv>0?"  <- LIVE (FIXED)":"  <- frozen (STILL BROKEN)"));
  print("  player row="+Math.round(s4.players[0].state().row)+
        "  lives="+s4.players[0].state().lives);
} else {
  print("  could not reach ENDLESS in the probe budget");
}
