function pad(v,n){v=String(v);while(v.length<n)v+=" ";return v;}

print("=== a real game, 3 ticks after the starting hop, stage 0 ===");
var g = SimCore.createGame({playerCount:1, seed:"gt-0"});
print("  phase after create: " + g.state().phase);
g.hop("forward", 0);
print("  phase after hop:    " + g.state().phase);
for (var t=0;t<3;t++) g.tick(16.667);
var s = g.state();
print("  player row: " + s.players[0].state().row + "   hazards: " + s.hazards.length);
print("");
print("  row | lane  | hazards  armMs");
var st = Stages.getStage(0);
for (var r=0;r<=18;r++){
  var list = s.hazards.filter(function(h){return h.row===r;});
  print("  "+pad(r,3)+" | "+pad(Tiles.laneOf(r, st.laneMix, st.id),6)+" | "+
        pad(list.length,8)+"  "+JSON.stringify(list.map(function(h){return h.armMs||0;})));
}
print("");
print("=== same thing, 6 different seeds, total hazards on board ===");
for (var sd=0;sd<6;sd++){
  var gg=SimCore.createGame({playerCount:1,seed:"gt-"+sd});
  gg.hop("forward",0);
  for(var q=0;q<3;q++) gg.tick(16.667);
  var ss=gg.state();
  var armed=ss.hazards.filter(function(h){return !h.armMs;}).length;
  var rows={};
  ss.hazards.forEach(function(h){rows[h.row]=1;});
  print("  seed "+pad(sd,2)+": hazards="+pad(ss.hazards.length,4)+
        " armedAt0="+pad(armed,4)+" distinctRows="+Object.keys(rows).length);
}
