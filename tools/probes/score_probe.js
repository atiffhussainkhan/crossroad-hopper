function pad(v,n){v=String(v);while(v.length<n)v+=" ";return v;}
/* Score must measure MOVEMENT, not survival. Before the fix, standing still
 * scored 10 points a second and a 18-second stage always banked ~180. */
print("  scenario                 elapsed   hops   score   expected");
print("  ------------------------ -------- ------ ------- ---------");

function run(label, hopEveryMs, ms) {
  var g = SimCore.createGame({playerCount:1, seed:"score-"+label});
  g.hop("forward", 0);                 // READY -> RUNNING
  var el = 0, nh = 0;
  while (el < ms) {
    g.tick(16.667); el += 16.667;
    if (el >= nh) { try { if (g.hop("forward",0)) nh += 1; } catch(e){} nh = el + hopEveryMs; }
  }
  var s = g.state();
  var score = s.stageScore, hops = s.players[0].state().hops;
  print("  " + pad(label, 24) + pad((el/1000).toFixed(1)+"s", 8) +
        pad(hops, 6) + pad(Math.round(score), 7) + "  " + (hops*10));
  return {score:score, hops:hops, el:el};
}

var a = run("stand still (idle)", 999999, 10000);   // never hops again
var b = run("hop every 600ms",    600, 10000);
print("");
print("  idle 10s scored " + Math.round(a.score) + "  (expect 0)");
print("  active 10s scored " + Math.round(b.score) + "  (expect " + (b.hops*10) + ")");
print("");
var ok = (a.score === 0) && (Math.round(b.score) === b.hops*10) && b.score > a.score;
print(ok ? "  PASS: score tracks hops, not the clock"
         : "  FAIL: score still tracks elapsed time");
