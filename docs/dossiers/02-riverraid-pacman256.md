# Dossier 02 — River Raid (1982) and Pac-Man 256 (2015)

Transferable requirements for a new lane-crossing hopper, from the genre's two
pressure-system outliers. `DR-02-x` namespace; sources numbered locally.

---

## A. RIVER RAID — Activision / Carol Shaw, December 1982 (Atari 2600)

Shaw designed and programmed it. She proposed a space game, was told there were
already too many, and switched theme [1]. On graph paper she found horizontal scroll
"very jerky" on the 2600 — hence vertical scroll, and a mirrored shape with islands
reading as a river [1]. Top-selling Activision game of 1983, second-best 2600 title
after *Ms. Pac-Man*; ~1M copies by January 1984 [1].

### 1. VERIFIED MECHANICS

- **Fuel gauge**, bottom of screen. "Fuel can be collected by flying over a fuel
  depot to fill up the gauge"; the goal is points "without running out of fuel or
  crashing" [1, quoting the 1982 manual]. Depots are also destructible for points.
- **Scarcity ramp.** "As the river progresses, there will be fewer fuel tanks"
  [1, manual]. The entire difficulty curve, driven by *deposit density* — not
  distance, time or score.
- **Death.** "The player loses one of their jets if they collide with the river
  bank or enemy objects. If the player has remaining jets, they will respawn at the
  same section… If a bridge is destroyed at the end of a section, the player will
  restart at that bridge upon losing a life" [1, manual]. One hit, no health pool;
  the restart point is a landmark.
- **Bridges** section the river; spacing was a deliberate parameter [1]. The 8-bit
  port added *select which bridge to start from*, plus bonus for shooting a bridge
  carrying tanks [1].
- **Klaxon.** Shaw asked colleagues for a low-fuel klaxon; per David Crane, he
  "recited some lines of assembly code that created the effect" [1, citing Montfort
  & Bogost 2009, p.104].
- **Endlessness.** "The river has no ending and scrolls infinitely" [1, citing
  *Electronic Fun*, Sept 1983, p.80]. Shaw's polynomial playfield algorithm was
  reused by *River Raid II* (1984) [1]. ROM: **4 KB on the 2600, 8 KB on the Atari
  800** [1]. Praised as "very easy game to learn, but a difficult one to master
  completely", with "seemingly infinite scenery" [1].

### 2. DISTINCTIVE REQUIREMENTS

**DR-02-1 — A depleting gauge replenished only by advancing onto a specific tile.**
The sole refill is a depot [1] — a pressure clock whose currency is *position*, not
seconds.

**DR-02-2 — Difficulty ramp driven by scarcity of the refill tile.** "Fewer fuel
tanks" as the river progresses [1]. The same code yields easy or brutal runs purely
by thinning one object type.

**DR-02-3 — Landmarks that double as respawn checkpoints.** Bridges section the
river; death rewinds to the last one [1].

**DR-02-4 — A distinct low-resource warning channel.** The klaxon is not the
resource itself [1].

**DR-02-5 — One-hit death with landmark-level instant respawn.**

**DR-02-6 — Unbounded content from a small legible tile vocabulary.** A 4 KB
cartridge yields an infinite scroll because the world composes algorithmically from a
few archetypes (bank, island, tanker, helicopter, depot, bridge). Sequences stay
readable because the vocabulary never changes — only density and arrangement.

**DR-02-7 — Scarcity turns the safe line into a decision.** Short defended route vs.
long open route cost different fuel, so the refill mechanic is also a routing problem.
The 8-bit bridge-shooting bonus [1] shows Shaw treating the objective as risk/reward.

### 3. THE CAUSE

- **DR-02-1** makes the player look *ahead*, turning scrolling into planning. Cost: a
  second attention channel.
- **DR-02-2** scales by feel — tension arrives when depots thin, experienced as the
  world closing in. Cost: the ramp is invisible, so untunable by one constant.
- **DR-02-3** gives death a *place*: you lose ground, not progress. Cost: stakes are
  graduated, not absolute.
- **DR-02-4** makes a silent resource felt. Cost: fired too early, it makes failure
  predictable.
- **DR-02-5** keeps every decision honest. Cost: brutal, and "remaining jets"
  implies a life reserve.
- **DR-02-6** is why arbitrary arrangements stay fair: a player who has learned six
  archetypes reads any sequence of them. Cost: repetition.
- **DR-02-7** means no hop is purely about the next hop. Cost: doubled decision
  space.

### 4. TRANSFERABILITY

| DR | Rating | Reason |
|---|---|---|
| DR-02-1 | Easy | One decrement, one refill on entry, one gauge rect. |
| DR-02-2 | Easy | A weight-table parameter. |
| DR-02-3 | Easy | Store a landmark index; restore on death. |
| DR-02-4 | Easy | Web Audio oscillator on a threshold. |
| DR-02-5 | Easy | One branch — but it fights FR-34. |
| DR-02-6 | Moderate | Authoring a varied *and* readable vocabulary is the work. |
| DR-02-7 | Moderate | Inherent once DR-02-1 exists; tuning is the cost. |

### 5. CONFLICTS

1. **DR-02-1 vs FR-35 (no energy gate).** The sharpest conflict: a lethal fuel gauge
   is an energy gate. River Raid is a Tier-A counter-example, not a precedent.
   Caveat — its gate is spatial and skill-earned, unlike a pay-gate, so the conflict
   is with the rule as written, not its purpose.
2. **DR-02-1/2 vs FR-23 (difficulty scales with score).** The ramp is keyed to
   *progress* — score-adjacent, not score-driven — and it is depletion that tightens,
   not hazards.
3. **DR-02-5 vs FR-34 (no life system).** "Remaining jets" [1] is a reserve. The
   checkpoint half is compatible; the reserve half is not.
4. **DR-02-3 vs FR-05 (endless, no completion).** Bridges are section boundaries, not
   levels — River Raid passes them [1]. A precedent for visible segmentation the base
   spec does not require.
5. **DR-02-6 vs FR-02/FR-24.** Supportive: the tile vocabulary *is* the fairness
   guarantee FR-24 asks for.

---

## B. PAC-MAN 256 — Hipster Whale / 3 Sprockets / Bandai Namco Vancouver, 2015

Unity. iOS/Android August 2015; Windows, macOS, Linux, PS4, Xbox One 21 June 2016
[2]. "Inspired by the original Pac-Man game's infamous Level 256 glitch, as well as
Hipster Whale's own game Crossy Road, which previously featured a Pac-Man mode" [2].

### 1. VERIFIED MECHANICS

- **The pursuer comes from behind.** "The game ends if Pac-Man comes into contact
  with a ghost **or falls behind and is consumed by a chasing glitch at the bottom
  of the maze**" [2]. In co-op, "the game ends once the last player still in play
  dies, be it by getting caught by a ghost or consumed by the glitch" [2].
- **256 dots.** "Eating 256 dots in a row awards the player a **blast that clears
  all on-screen enemies**" [2]. The title is a mechanism.
- **Eight ghosts, eight behaviours** [2]: Blinky chases; Pinky rushes when Pac-Man
  enters her sight; Inky loops specific areas; Clyde travels down then switches to
  Pac-Man's nearest direction; Sue moves horizontally in groups of three; Funky roams
  horizontally in groups of four; Spunky sleeps but wakes if approached; **Glitchy
  teleports while chasing**.
- **Power-ups as inventory.** Lasers, tornadoes, clones attack ghosts, plus
  score-multiplying fruit; **up to three equipped** [2]. Mobile: unlocked by waiting
  **24 hours** after the last unlock. Console/PC: by eating a set number of Pac-Dots
  [2].
- **Credits, then Coins.** Pre-2.0, a **"credit" system required one credit to play
  with power-ups equipped, or to revive Pac-Man**. 2.0 replaced credits with **Coins**
  from missions, maze pickups and **viewing sponsored videos** — spendable on power-up
  upgrades, themes (mobile) and reviving Pac-Man [2, citing Kotaku, 21 Aug 2015].
- **Co-op revive.** Up to four players; if one is caught, "a player power-up appears,
  which revives that player" [2].
- **Reception.** Metacritic 88 iOS / 79 PS4 / 80 XOne; Pocket Gamer 4.5/5 [2].

### 2. DISTINCTIVE REQUIREMENTS

**DR-02-8 — A pursuer attacking from behind.** The Glitch consumes you from the
bottom of the maze when you fall behind [2]. The threat is on your wake, so the run's
geometry and your trail are the battlefield.

**DR-02-9 — A fixed-count streak paying a screen-clearing blast.** 256 dots in a row
clears all on-screen enemies [2]. A set-piece, not a multiplier.

**DR-02-10 — A behaviour roster, not a single AI.** Eight named movement rules [2].

**DR-02-11 — Power-ups as equipped loadout chosen before play.** Three slots [2].

**DR-02-12 — Currency that must be spent to play with advantages or to continue.**

**DR-02-13 — Downed players restored by pickup, not a life counter** [2].

**DR-02-14 — Unlock pacing that is time-gated on mobile, skill-gated on console.**
24 hours vs. N Pac-Dots [2].

### 3. THE CAUSE

- **DR-02-8** inverts the genre's geometry: pressure is behind you, so hesitation is
  felt as something closing on your back. Cost: a rear threat is invisible until the
  camera is generous — telegraphing is the whole problem.
- **DR-02-9** makes sustained forward motion the only route to power. Cost: 256 dots
  is rare, so most sessions never fire it — a set-piece most players never see.
- **DR-02-10** turns eight routines into eight puzzles. Cost: eight tunings and eight
  sprites, and it reads as busy.
- **DR-02-11** front-loads agency. Cost: a menu before play, against FR-10.
- **DR-02-12** is the mechanic the base spec exists to reject — the strongest tools
  and the second chance behind currency, part bought with attention [2]. Dota 2's
  exact failure mode.
- **DR-02-13** is the only "life" mechanic here that is not a counter, and only
  because the team is bounded.
- **DR-02-14** shows one design degrading per platform: without server time, the toll
  converts from waiting to earning.

### 4. TRANSFERABILITY

| DR | Rating | Reason |
|---|---|---|
| DR-02-8 | Moderate | Easy to build; fair telegraphing is the cost. |
| DR-02-9 | Easy | A counter, a threshold, one clear branch. |
| DR-02-10 | Moderate | Each ghost is small; eight is a content budget. |
| DR-02-11 | Easy | Three slots — but it collides with FR-10. |
| DR-02-12 | **Hard** | Not a porting problem. FR-35 forbids it. |
| DR-02-13 | Moderate | Trivial logically; meaningless without a second player. |
| DR-02-14 | **Hard** | A 24-hour clock is local time, but any *shared* challenge needs a server — FR-40. |

### 5. CONFLICTS

1. **DR-02-12 vs FR-35 (no energy gate, play timer or pay-wall).** Direct, and the
   anticipated contradiction. Spending a coin to revive or equip power-ups is a
   pay-wall on play [2]. FR-35 comes from Dota 2's defence against pay-to-win [3];
   Pac-Man 256 is a same-developer regression against it.
2. **DR-02-12 vs FR-33 (currency cosmetic-only).** Coins buy functional upgrades and
   revives [2].
3. **DR-02-12/13 vs FR-34 (no life system).** Revive is a purchased life; the pickup
   revive is a life system with a different skin, escaping the rule only because it
   needs a co-op partner.
4. **DR-02-14 vs FR-40 (fully offline, no server).**
5. **DR-02-11 vs FR-10 (playable in five seconds).** A loadout is a menu.
6. **DR-02-8 vs FR-15 (pursuer telegraphed).** A pursuer *behind* the player is the
   worst case for a visual telegraph; Pac-Man 256 answers with a consuming animation,
   not a warning. FR-15 is unserved here.
7. **DR-02-9 vs FR-03 (one point per hop).** A discontinuity in a linear score [2].
   Mild, reconcilable as a bonus tier.
8. **Also violates FR-01/FR-04** — free-roaming maze movement, not one-tile hops [2].
   Use as a *pressure-system* reference only.

---

## 6. HARVEST LIST

1. **DR-02-1 + DR-02-2, inverted — a depleting meter replenished by a tile, where
   that tile's rarity is the only difficulty curve.** The most valuable thing here: an
   endless run gets a felt ramp with no numeric tuning, and if the meter drains
   *harmlessly* rather than lethally it satisfies FR-35's intent while giving
   DR-01-7's goal rows a cost.
2. **DR-02-3 — landmarks as respawn anchors.** Free, invisible; makes death graduated,
   which FR-29 plus FR-34 imply but never state. Pairs with DR-01-7's safe band.
3. **DR-02-8 — a pursuer on your wake rather than in your path.** The only novel
   pressure geometry here; composes with FR-12/FR-14 by turning the eagle's rear threat
   into a visible advancing edge. Costs a fairness pass against FR-15.
4. **DR-02-9 — a long forward streak paying a screen-clearing event.** Turns FR-03
   into a skill ceiling with a visible reward, no multiplier, no gate.
5. **DR-02-4 + DR-02-6 — a klaxon threshold over a small readable vocabulary.** Two
   lines for the first; for the second, the discipline of the same six lane archetypes
   forever, varied by density. FR-22 and FR-24 the cheap way.

**Not harvested:** DR-02-12 and DR-02-14 are exactly the pay-to-win the base spec
excludes. DR-02-10 is a content budget, not a design insight. DR-02-11 fights FR-10.

---

## 7. SOURCES

[1] Wikipedia, "River Raid" (wikitext, retrieved 2026-09-29). Cites in-line: Randi
Hacker, "Designing Woman", *Electronic Fun with Computers & Games*, Sept 1983,
vol. 1 no. 11, pp. 78–80; Montfort & Bogost, *Racing the Beam*, MIT Press 2009,
p. 104; Brett Weiss, *The 100 Greatest Console Video Games 1977–1987*, 2014,
pp. 180–182; *The Video Game Update* (Computer Entertainer), Oct 1983, p. 111;
Hickey 2021, pp. 72–74. Gameplay claims quote the 1982 Activision manual.
https://en.wikipedia.org/w/index.php?title=River_Raid&action=raw

[2] Wikipedia, "Pac-Man 256" (wikitext, retrieved 2026-09-29). Cites in-line: Kirk
Hamilton, Kotaku, 21 Aug 2015; Appgamer, "Fruits and Ghosts", 12 Oct 2015; iMore score
guide; TouchArcade review, 19 Aug 2015; Windows Central review; ifanzine review,
11 Sept 2015; Jeffery Matulef, Eurogamer, 24 May 2016; IGN, 19 Aug 2015.
https://en.wikipedia.org/w/index.php?title=Pac-Man_256&action=raw

[3] GDC 2015 — Hall & Sum, "Crossy Road: A Whale of a Time" (as cited by the base
spec, FR-35). https://media.gdcvault.com/gdc2015/presentations/Hall_Matthew_Crossy_Road_Whale.pdf

### Claims marked UNVERIFIED

- **"Shaw wanted more levels than a cartridge could hold, so she generated them."**
  The base spec attributes this to the River Raid article, but that is not supported:
  the article gives the 4 KB/8 KB ROM sizes and the polynomial algorithm [1]. The
  constraint is verified; the *motive* is not stated in the source consulted.
- **River Raid's starting jet count.** "Remaining jets" [1] establishes a reserve
  without a number.
- **River Raid's numeric fuel economy** — drain rate, refill per depot, the
  per-section schedule behind "fewer fuel tanks", and bridge spacing [1]. Structural
  only; no figures in this source.
- **Pac-Man 256's release day.** Its own infobox says 19 August 2015 (citing IGN) and
  its ports section says the 20th [2]. Recorded as August 2015.
- **The Glitch's advance rate** relative to the player, and whether it is always
  active or spawns [2]. Direction and lethality only.
- **Coin costs** for Pac-Man 256 upgrades and themes [2].
- **Whether Glitchy is the eighth ghost or a ninth.** The source's "each ghost" list
  includes Glitchy among eight named entries [2]; this dossier follows it.

**Method note.** The content farms named in the brief were not consulted and no
statistic here originates from them; a search for Shaw interview material returned
only such pages and was discarded. The *Electronic Fun* interview and the Montfort &
Bogost account are cited at second hand through [1], not read directly.
