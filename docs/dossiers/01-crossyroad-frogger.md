# Dossier 01 — Crossy Road (2014) and Frogger (1981)

Transferable requirements for a new lane-crossing hopper, from the genre's anchor
title and its direct ancestor. Requirements use the `DR-01-x` namespace; sources
are numbered locally within this dossier.

---

## A. CROSSY ROAD — Hipster Whale, 20 November 2014

Matt Hall and Andy Sum, Hipster Whale (Victoria, Australia), built on Unity;
Android published by yodo1, 23 December 2014 [1][2]. Stated thesis: "Flappy Bird
+ Frogger" [1]. A six-week project became twelve weeks [1].

### 1. VERIFIED MECHANICS

- **Control.** "Tapping alone is boring, but swiping is tiring… Tapping most of
  the time, and swiping when needed" [1]. Hop forward, swipe left/right/back
  [2]. One hop = one tile.
- **Scoring.** One point per forward hop; "only one life and a single point given for each forward hop", in "one endless level" of generated road and river sections [6].
- **Fail states.** Hazard contact, plus a pursuer: "If you move too slowly a
  bird grabs you and eats you, so you must always be moving forward" [3].
- **Currency.** Coins are "golden-yellow and squarish, with a red C"; 100 buy a
  lottery spin for a character [2]. Piggy Bank doubles gift/ad coins and adds
  red coins worth 5 each [2]. Coin packs are not purchasable [1].
- **Content.** 300+ characters, 28 worlds, daily challenges with leaderboards,
  per-character shiny stat cards, same-device multiplayer, offline play, 250M
  players claimed [4].
- **End screen.** "The end of a game should delight and surprise… 'Banner'
  system is unpredictable… Weeks of work went into developing this system" [1].
- **Economy.** No interstitial ads, no save-me, no energy system, "every
  character plays the same", every character $0.99 [1]. 6M peak DAU, 50M
  downloads in 90 days, 100% organic, $0 UA, $10M in 90 days [1][5].
- **Character effect.** Swaps scenery and hazard vocabulary (Astronaut gives space and asteroids), not rules [2]. Sum: "only cosmetic changes… if someone has played for five minutes then they have the exact same opportunity to get a highscore as someone who has played for 50 hours" [3]. Kuchera: the extra characters "won't make the game easier. They can, in fact, make it harder" [3]. Hall: the gacha exists "to ensure that people will play the game over a longer period of time" [3].
- **Labels.** An endless runner per Wikipedia [2]; an "8-bit endless arcade
  hopper" per the developers [4].

### 2. DISTINCTIVE REQUIREMENTS

**DR-01-1 — Stalling is a distinct, lethal verb.** Death comes not only from
hazard contact but from the *absence* of progress, via a visible pursuer. Frogger
has no equivalent; its only time pressure is a round clock shared with its era.

**DR-01-2 — The reward screen is the product.** A heavily randomised,
unpredictable banner on death, treated as a multi-week engineering effort in its
own right [1]. Frogger's post-level screen is fixed and informational.

**DR-01-3 — Roster swaps content, never rules.** "Every character plays the
same" [1]. Frogger has no roster and one fixed playfield; a new Frogger board is
a speed change, not a theme change.

**DR-01-4 — A discrete gamble consumes accumulated currency.** The 100-coin
lottery machine turns ~100 seconds of survival into one high-variance moment
[2]. Frogger has no economy at all.

**DR-01-5 — Asymmetric input with a privileged default direction.** Tap is the
common case; swipe the exception for lateral and backward moves [1]. Frogger's
four-way joystick is symmetric.

**DR-01-6 — Behavioural theme packs as the retention unit.** 28 worlds, each with
its own visual set and hazard vocabulary [4]. Frogger's only progression axis is
scalar speed.

### 3. THE CAUSE

- **DR-01-1** turns deliberation into commitment without a new rule to read. Cost: an idle death feels arbitrary unless the telegraph is honest.
- **DR-01-2** a stimulus shown identically every time stops being perceived — variable-ratio reinforcement on a UI. Cost: combinatorial authoring; unreadable randomness is noise.
- **DR-01-3** removes the roster balance burden: nothing can be overpowered, so nothing needs nerfing. Cost: no differentiated value to sell.
- **DR-01-4** gives a slow trickle a felt payoff. Cost: a visible loss on a bad spin, and an RNG in a pure-skill game.
- **DR-01-5** matches the cheapest gesture to the dominant verb. Cost: two input paths to build and test.
- **DR-01-6** buys re-engagement from art, not mechanics. Cost: a large art pipeline; "28 worlds" is cumulative, not launch-day.

### 4. TRANSFERABILITY

| DR | Rating | Reason |
|---|---|---|
| DR-01-1 | Easy | One timer, one state machine, one sprite; no pathing, no new input. |
| DR-01-2 | Moderate | Trivial logic; the content is an authoring cost with no shortcut. |
| DR-01-3 | Easy | A theme is a palette swap plus a hazard table. |
| DR-01-4 | Easy | One integer compare and a seeded RNG call. |
| DR-01-5 | Moderate | Pointer Events give both gestures from one path; disambiguation needs tuning. |
| DR-01-6 | Moderate | No server needed, but a large static art payload. |

### 5. CONFLICTS

6. **DR-01-3 vs FR-16.** FR-16 requires the pursuer to vary with the character.
   The developers say the opposite — "Every character plays the same" [1] — while
   also saying characters "can, in fact, make it harder" [3]. Unresolvable here;
   treat FR-16 as weakly evidenced.

---

## B. FROGGER — Konami / Sega / Gremlin, 1981

Developed by Konami, published by Sega for arcades; Sega held all Frogger rights
from Konami by September 1981 [6][10]. Attribution is murky: Konami credited no
individuals, and the widely repeated "Akira Hashimoto saw a frog at a traffic
light" origin story is contradicted by former Konami programmer Masahiro Inoue,
who does not recognise the name and credits Takahide Harima and possibly two
other programmers [9].

### 1. VERIFIED MECHANICS

- **Lives.** Three, five, or seven frogs per machine setting; losing all ends the
  game [6]. DIP switches also expose a **256 Frog** position [7], which the
  museum labels untested.
- **Timer.** "The timer gives 30 seconds to guide each frog into one of the
  homes, and resets back to 60 ticks whenever a life is lost or a frog reaches
  home safely" [6]. The clock is *refunded by progress*.
- **Layout.** Bottom: a road of race cars, dune buggies, trucks and bulldozers in
  opposing lanes. A median strip. Upper half: a river of logs, alligators and
  turtles moving horizontally in opposite directions. Top: five "frog homes", at
  least one always open [6]. Fixed camera; the whole field is always on screen.
- **Goal.** Five frogs homeed = level complete, 1,000 points, next level harder. After five levels difficulty briefly eases, then increases again [6].
- **Scoring.** 10 per forward step; 50 per frog homeed; **10 per unused ½
  second**; 200 for a lady frog homeed; 200 for a fly; bonus frog at 20,000; max
  99,990 before a five-digit rollover [6]. Single-player, or two alternating [6].
- **Death taxonomy.** Run over; into the river; snakes, otters or alligator jaws; **sinking on a diving turtle**; riding a log, alligator or turtle off the side of the screen; into an occupied home or an alligator; into the side of a home or the bush; running out of time [6]. Softline, Nov 1982: "the arcade game with the most ways to die" [6][11].

### 2. DISTINCTIVE REQUIREMENTS

**DR-01-7 — A goal row with a guaranteed-open-slot invariant.** Five homes, at
least one always enterable, and a home filled by a frog is permanently closed for
that level [6]. Crossy Road has no destination at all — it is pure distance.

**DR-01-8 — A round clock that progress refunds.** 30 seconds, reset upward to 60
ticks on a life lost *or* a frog homed [6]. No Crossy Road analogue.

**DR-01-9 — Finite lives, selectable per credit.** 3 / 5 / 7 / 256 via DIP
switches [6][7]. A continue economy — exactly what Crossy Road deleted.

**DR-01-10 — Carriage as the mandatory river verb, with an off-screen edge
kill.** You do not cross the river; you are transported by logs, turtles and
alligators, and riding one off the side kills you [6]. Footholds expire under the
player — diving turtles submerge [6].

**DR-01-11 — A large, distinct death taxonomy.** Nine enumerated causes, each
with its own presentation [6].

**DR-01-12 — Score for time surplus.** 10 points per unused half-second [6].
Score accrues for *not* being pressured — the opposite of Crossy Road, where
every second is a threat.

**DR-01-13 — A non-monotonic difficulty curve.** Eases every fifth level [6].
Neither Crossy Road nor the base spec describes a relief point.

### 3. THE CAUSE

- **DR-01-7** gives the run a shape: a question with an answer, plus a readable safe state. Cost: obliges an endless game to decide what happens after completion.
- **DR-01-8** times the player's own decisions, and the upward reset makes the clock a consequence of performance, not a tax. Cost: still a hard deadline, producing the impatient-thumb behaviour the genre left behind.
- **DR-01-9** a life is a legible resource that cheapens failure. Cost: it dilutes every individual death.
- **DR-01-10** converts a timing problem into a *placement* problem — the player chooses where to stand, not when to press. Cost: a control model that must be taught, and a sinking platform punishes inaction, not error.
- **DR-01-11** makes failure variety cheap content: a gag and a sound per cause. Cost: each needs its own art and fairness audit.
- **DR-01-12** converts speed into score without converting slowness into failure. Cost: complexity in an otherwise trivial scoring system.
- **DR-01-13** avoids a pure ramp, which produces attrition. Cost: a relief point is where skilled players coast.

### 4. TRANSFERABILITY

| DR | Rating | Reason |
|---|---|---|
| DR-01-7 | Easy | Five slots, an occupancy array, one invariant check per tick. |
| DR-01-8 | Moderate | Trivial as a countdown, but correct refunding fights FR-35. |
| DR-01-9 | Easy | An integer and a reset — and the costliest decision here. |
| DR-01-10 | Moderate | Platform-relative movement is easy; player-facing clarity is the work. |
| DR-01-11 | Easy | One branch per cause in the collision handler, one sprite each. |
| DR-01-12 | Easy | A score term computed from frame deltas. |
| DR-01-13 | Easy | A modulus on the level counter feeding the speed table. |

### 5. CONFLICTS

Every item below is a direct contradiction, not a nuance.

1. **DR-01-9 vs FR-34 (no life system).** Frogger is built on 3/5/7 finite lives with a bonus frog at 20,000 [6][7]; Crossy Road has "only one life" [6]. FR-34 is stricter, and removing the life system was a decision, not an oversight [1].
2. **DR-01-8 vs FR-35 (no energy gate, play timer, or pay-wall).** A 30-second round timer is a play timer, the most literal reading of FR-35.
3. **DR-01-7 + DR-01-13 vs FR-05 (endless, no finish line, no level completion).** The five-frog clear *is* level completion, and the curve is keyed to completed levels rather than score [6]; FR-23 requires score-scaled difficulty.
4. **DR-01-7 vs FR-12 (camera advances on its own).** Frogger's camera is fixed and shows the whole board; applying FR-12 would hide the goal row. A goal row is only readable if the camera does not creep.
5. **DR-01-12 vs FR-03 (only forward hops score).** Frogger pays 10 per unused ½ second [6] — score accrues for standing still, which FR-03 forbids.
6. **DR-01-8 + DR-01-9 vs the FR-13/14/15 pursuer family.** Crossy Road's pressure is a *behavioural* pursuer escapable by moving [3]; a 30-second clock is escapable only by finishing early. Installing both gives the player two systems punishing opposite behaviours.

Directionally they differ too: Crossy Road penalises backward movement with a pursuer, while Frogger players move freely in all four directions with no directional penalty [3][6].

---

## 6. HARVEST LIST

1. **DR-01-7 — Periodic goal row / safe harbour with a guaranteed-open-slot invariant.** Gives an endless run shape and a visible safe state without reintroducing lives or a level-end, and resolves the FR-05/FR-12 tension Crossy Road leaves open. A safe band every N rows with a rotating open marker; the invariant is one array check.
2. **DR-01-10 — Expiring footholds.** A safe tile that goes lethal after a fixed dwell turns a static safe spot into a decision, adding a timing obligation *without* a global clock, so it survives FR-35.
3. **DR-01-12 — Time-surplus scoring, inverted.** Frogger pays for unused time; reversed, it pays for sustained commitment (a hop streak that decays on hesitation) and never for a deadline. Satisfies FR-03 and FR-23.
4. **DR-01-11 — Death taxonomy.** Nine causes for a fraction of the cost of nine mechanics, and the cheapest route to DR-01-2's end screen.
5. **DR-01-13 — Generator relief rows.** Every fifth band deliberately easier: one modulus, one speed-table row, and it fixes the attrition FR-23's monotonic scaling would produce.

**Not harvested:** DR-01-9 (lives) and DR-01-8 (30s clock) violate Tier-A requirements and are the two mechanics the genre deliberately deleted. DR-01-4 (lottery) is buildable but adds gambling to a pure-skill game.

---

## 7. SOURCES

[1] GDC 2015 — Hall & Sum, "Crossy Road: A Whale of a Time" (71 slides). https://media.gdcvault.com/gdc2015/presentations/Hall_Matthew_Crossy_Road_Whale.pdf
[2] Wikipedia, "Crossy Road" (wikitext, 2026-09-29). https://en.wikipedia.org/w/index.php?title=Crossy_Road&action=raw
[3] Polygon — Ben Kuchera, "Crossy Road has invented the 'endless Frogger,'" 21 Nov 2014. https://www.polygon.com/2014/11/21/7260459/crossy-road-frogger
[4] Apple App Store listing, Crossy Road. https://apps.apple.com/us/app/crossy-road/id924373886
[5] Polygon — Dave Tach, "They wanted to make a phenomenon. They made $10 million.", 3 Mar 2015. https://www.polygon.com/2015/3/3/8142247/crossy-road-earnings-10-million-gdc-2015
[6] Wikipedia, "Frogger" (wikitext, 2026-09-29). https://en.wikipedia.org/w/index.php?title=Frogger&action=raw
[7] Museum of the Game / KLOV, "Frogger Dip Switch Settings" (community-contributed, unverified). https://www.arcade-museum.com/dipswitch-settings/7857.html
[8] Museum of the Game / KLOV, "Frogger" game record. https://www.arcade-museum.com/game_detail.php?game_id=7857
[9] Time Extension — Jack Yarwood, "After 44 years, one of Frogger's biggest mysteries might finally be solved", 18 Dec 2025. https://www.timeextension.com/features/flashback-who-created-the-arcade-classic-frogger
[10] Game Machine #172, 1 Sep 1981, p. 11 (Sega acquired all Konami rights), via onitama.tv. https://onitama.tv/gamemachine/pdf/19810901p.pdf#page=11
[11] Softline, Nov 1982, p. 19, via Computer Gaming World Museum. http://www.cgwmuseum.org/galleries/index.php?year=1982&pub=6&id=8

### Claims marked UNVERIFIED

Not asserted above, for want of a credible source: Crossy Road's exact eagle idle threshold in seconds, hop duration in ms, grid width in tiles, per-score difficulty ramp, and "28 worlds" as a launch-day rather than cumulative figure. Frogger's numeric per-band lane count and screen resolution were likewise not sourced, so its layout is described structurally. The 256-Frog DIP position is real but the museum labels it untested. The known-false claims named in the brief — levels, power-ups, upgradeable items, a "chicken mode", a 78% Indian-player retention survey, a 200-step chunk system, a 2015 browser origin — are absent here and appeared in no source consulted.
