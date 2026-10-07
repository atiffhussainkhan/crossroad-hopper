function pad(v,n){v=String(v);while(v.length<n)v+=" ";return v;}

/* A systems pass, measured rather than asserted:
 *   - does the hazard list grow without bound over a long stage?
 *   - does generatedRows grow without bound?
 *   - does the cost of a tick drift upward (a leak shows up as creeping latency)?
 *   - does the death/restart path release anything?
 * Counters are read from the live game object, not from a copy. */
var DT = 16.667;
function countKeys(o){var n=0; for(var k in o) if(Object.prototype.hasOwnProperty.call(o,k)) n++; return n;}

print("=== 10-minute continuous run, stage 0, blind input ===");
var g = SimCore.createGame({playerCount:1, seed:"stability"});
g.hop("forward",0);
var el=0, nextHop=600;
print("  minute  hazards  genRows  deaths  msPerTick(avg last 600)  peakHazPerTick");
for (var minute=1; minute<=10; minute++){
  var t0=nowMs();
  var tickCount=0, peak=0, deaths=0;
  for (var k=0;k<3600;k++){
    g.tick(DT); el+=DT; tickCount++;
    var hz=g.state().hazards.length;
    if(hz>peak) peak=hz;
    if(el>=nextHop){ try{g.hop("forward",0);}catch(e){} nextHop=el+600; }
  }
  var t1=nowMs();
  var per=(t1-t0)/tickCount;
  print("  "+pad(minute,7)+pad(g.state().hazards.length,9)+pad(countKeys(g.state().generatedRows),9)+
        pad(g.state().lives!==undefined?g.state().lives:"-",8)+
        pad(per.toFixed(4),26)+pad(peak,20));
}

print("");
print("=== does the hazard list stay bounded? ===");
var g2=SimCore.createGame({playerCount:1,seed:"bound"});
g2.hop("forward",0);
var e2=0,nh=600,maxHaz=0, samples=[];
for(var i2=0;i2<20000;i2++){
  g2.tick(DT); e2+=DT;
  if(e2>=nh){ try{g2.hop("forward",0);}catch(e){} nh=e2+600; }
  if(i2%2000===0) samples.push(g2.state().hazards.length);
  if(g2.state().hazards.length>maxHaz) maxHaz=g2.state().hazards.length;
}
print("  hazards over time: "+samples.join(", "));
print("  peak hazards on board: "+maxHaz+"   final: "+g2.state().hazards.length);
print("  generatedRows entries: "+countKeys(g2.state().generatedRows));
print("  player row reached: "+Math.round(g2.state().players[0].state().row));
