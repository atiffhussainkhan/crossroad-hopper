function pad(v,n){v=String(v);while(v.length<n)v+=" ";return v;}
/* h.kind is the vehicle's identity (log, car, train); h.spec.kind is the lane
 * family it rolls along. The renderer picks its art from h.kind. So the check
 * is: does h.kind belong to LANE_KINDS[Tiles.laneOf(row)]? */
var LANES={road:"road",rail:"rail",water:"water"};
var bad=0, tot=0;
print("stage  name          row lane   hazardIdentity  legalHere  verdict");
for (var s=0;s<10;s++){
  for(var sd=0;sd<8;sd++){
    var g=SimCore.createGame({playerCount:1,seed:"mi-"+s+"-"+sd});
    g.startStage(s);
    g.hop("forward",0);
    for(var t=0;t<4;t++) g.tick(16.667);
    var st=g.currentStage(); var snap=g.state();
    for(var i=0;i<snap.hazards.length;i++){
      var h=snap.hazards[i];
      var lane=Tiles.laneOf(h.row, st.laneMix, st.id);
      var legal=Hazards.LANE_KINDS[lane]||[];
      var family=h.spec?h.spec.kind:null;
      var identity=h.kind;
      tot++;
      var open=Hazards.OPEN_KINDS||[];
      var ok = legal.indexOf(identity)>=0 || open.indexOf(identity)>=0;
      if(!ok){ bad++;
        if(bad<=14) print("  "+pad(s,3)+" "+pad(st.name,13)+pad(h.row,4)+pad(lane,7)+
                          pad(identity,16)+pad(legal.join(",").slice(0,14),11)+"WRONG");
      }
    }
  }
}
print("");
print("hazards: "+tot+"   placed on a lane that does not carry them: "+bad);
