function pad(v,n){v=String(v);while(v.length<n)v+=" ";return v;}
var SPECIAL={pit:1,sinkhole:1,hawk:1,geyser:1,steamvent:1,boulder:1};
print("Every lane/kind disagreement, all stages, 6 seeds each:");
for (var s=0;s<10;s++){
  for (var sd=0; sd<6; sd++){
    var g=SimCore.createGame({playerCount:1,seed:"md-"+s+"-"+sd});
    g.startStage(s);
    g.hop("forward",0);
    for(var t=0;t<4;t++) g.tick(16.667);
    var st=g.currentStage(); var snap=g.state();
    for(var i=0;i<snap.hazards.length;i++){
      var h=snap.hazards[i];
      var kind=(h.spec&&h.spec.kind)||"?";
      if(SPECIAL[kind]) continue;
      var lane=Tiles.laneOf(h.row, st.laneMix, st.id);
      var implied={ground:"road",rail:"rail",water:"water"}[kind];
      if(implied && lane!==implied){
        print("  stage "+pad(s,2)+" "+pad(st.name,13)+" row="+pad(h.row,3)+
              " lane="+pad(lane,6)+" kind="+pad(kind,7)+
              " name="+pad((h.spec&&h.spec.name)||"?",14)+
              " armMs="+(h.armMs||0));
      }
    }
  }
}
