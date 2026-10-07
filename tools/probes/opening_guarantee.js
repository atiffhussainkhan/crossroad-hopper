function pad(v,n){v=String(v);while(v.length<n)v+=" ";return v;}
/* rowDensity() returns exactly 1.0 for rows 1-6, and the placement roll is
 * `if (rng.next() > chance) break`, which cannot fire at 1.0. So a hazardous
 * row in that band should carry an armed hazard EVERY time. If it does not,
 * something downstream is deleting it -- and the only thing downstream is
 * ensureSolvable(). */
var N=60;
print("Guaranteed band (rows 1-6) vs tapered band (rows 7-16), " + N + " seeds/stage");
print("stage name           band1:rows armed%   band2:rows armed%");
var b1=0,b1a=0,b2=0,b2a=0;
for (var s=0;s<10;s++){
  var r1=0,a1=0,r2=0,a2=0;
  for (var sd=0;sd<N;sd++){
    var g=SimCore.createGame({playerCount:1,seed:"g-"+s+"-"+sd});
    g.startStage(s); g.hop("forward",0);
    for(var t=0;t<3;t++) g.tick(16.667);
    var st=g.currentStage(); var snap=g.state();
    var armed={};
    for(var i=0;i<snap.hazards.length;i++){var h=snap.hazards[i];
      if(!h.armMs) armed[h.row]=1;}
    for(var row=1;row<=16;row++){
      if(Tiles.laneOf(row, st.laneMix, st.id)==="grass") continue;
      if(row<=6){r1++; if(armed[row])a1++;} else {r2++; if(armed[row])a2++;}
    }
  }
  b1+=r1;b1a+=a1;b2+=r2;b2a+=a2;
  print(pad(s+" "+Stages.getStage(s).name,19)+
        pad(r1+" -> "+Math.round(a1*100/r1)+"%",23)+
        pad(r2+" -> "+Math.round(a2*100/r2)+"%",22));
}
print("");
print("GUARANTEED band rows 1-6 : "+b1a+"/"+b1+" = "+Math.round(b1a*100/b1)+"% armed at t=0");
print("TAPERED   band rows 7-16: "+b2a+"/"+b2+" = "+Math.round(b2a*100/b2)+"% armed at t=0");
