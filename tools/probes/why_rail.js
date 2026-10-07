function pad(v,n){v=String(v);while(v.length<n)v+=" ";return v;}

print("=== per-row lane class, rows 0-16, all stages ===");
print("stage  " + (function(){var o=[];for(var r=0;r<=16;r++)o.push(pad(r,2));return o.join(" ");})());
for (var s=0;s<10;s++){
  var st=Stages.getStage(s);
  var out=[];
  for(var r=0;r<=16;r++){
    var l=Tiles.laneOf(r, st.laneMix, st.id);
    out.push(pad({grass:".",road:"R",rail:"T",water:"W"}[l]||"?",2));
  }
  print(pad(s,7)+" "+out.join(" "));
}
print("");
print("=== stage 3 (Farmland): what actually lands on the board at t=0 ===");
var g=SimCore.createGame({playerCount:1,seed:"r3"});
g.hop("forward",0);
for(var t=0;t<3;t++) g.tick(16.667);
var snap=g.state();
var st3=Stages.getStage(3);
print("  row lane   density   hazards  armMs");
for (var r2=0;r2<=16;r2++){
  var list=snap.hazards.filter(function(h){return h.row===r2;});
  if(list.length===0 && Tiles.laneOf(r2,st3.laneMix,st3.id)==="grass") continue;
  print("  "+pad(r2,3)+" "+pad(Tiles.laneOf(r2,st3.laneMix,st3.id),6)+
        pad(Hazards.rowDensity(r2,0.58).toFixed(2),9)+pad(list.length,9)+
        "  "+JSON.stringify(list.map(function(h){return h.armMs||0;})));
}
print("");
print("=== does hazardsForRow return anything for a RAIL row on stage 3? ===");
[4,5,6,7,8].forEach(function(r){
  var lane=Tiles.laneOf(r, st3.laneMix, st3.id);
  var f=Hazards.hazardsForRow("probe-r3", r, 14, 1, SimCore.createRng("pr3"), 3, 4);
  print("  row "+pad(r,2)+" lane="+pad(lane,6)+" density="+
        pad(Hazards.rowDensity(r,0.58).toFixed(2),6)+" -> "+f.length+" hazard(s)"+
        (f.length? "  kind="+(f[0].spec&&f[0].spec.kind)+" armMs="+(f[0].armMs||0) : ""));
});
