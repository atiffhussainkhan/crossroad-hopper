function pad(v,n){v=String(v);while(v.length<n)v+=" ";return v;}
print("stage name           lanes rows1-16 (row=class)                    hazardKinds");
for (var s=0;s<10;s++){
  var st=Stages.getStage(s);
  var lanes=[];
  for(var r=1;r<=16;r++) lanes.push(Tiles.laneOf(r, st.laneMix, st.id));
  var mix={};
  lanes.forEach(function(l){mix[l]=(mix[l]||0)+1;});
  var hk=st.hazardKinds ? st.hazardKinds.join(",") : "(none)";
  if (hk.length>46) hk=hk.slice(0,46)+"...";
  print(pad(s+" "+st.name,20)+pad(JSON.stringify(mix),46)+hk);
}
print("");
print("=== pickKind success by lane, per stage ===");
print("stage   road  rail  water   grass");
for (var s2=0;s2<10;s2++){
  var counts={road:0,rail:0,water:0};
  for (var t=0;t<60;t++){
    ["road","rail","water"].forEach(function(lane){
      if (Hazards.pickKind(lane, s2, SimCore.createRng("pk"+s2+"-"+t+lane))) counts[lane]++;
    });
  }
  print(pad(s2,7)+pad(counts.road+"/60",6)+pad(counts.rail+"/60",6)+pad(counts.water+"/60",7));
}
print("");
print("=== difficultyFor at t=0, and derived base density ===");
for (var s3=0;s3<10;s3++){
  var d0=Stages.difficultyFor(s3, 0);
  var base=Math.min(0.82, 0.55+d0*0.026);
  print("  stage "+pad(s3,2)+" difficulty@0s="+pad(d0.toFixed(2),6)+
        " baseDensity="+base.toFixed(2)+"  row1 density="+Hazards.rowDensity(1,base).toFixed(2));
}
