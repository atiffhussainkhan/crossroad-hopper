# Dossier 03 — Crossy Road Castle & Disney Crossy Road

**Scope:** the two Hipster Whale games that vary the studio's formula — one by changing
the camera and the death penalty, one by changing the IP. Both are read here as
*anti-evidence* and *control evidence* for the lane-crossing hopper spec.

---

# A. Crossy Road Castle (2020, Hipster Whale / Apple Arcade)

## A1. Verified mechanics (concrete and numeric)

Release **2020-02-27**, Apple Arcade exclusive at launch, iOS/macOS/tvOS/visionOS today
(v12.3, 2026-08-26; 4.67 average across **48,564** US App Store ratings) [9]. Console
version **September 2024** on Switch, PS5, Xbox One and Xbox Series [2][16].

- **2D side-scrolling platformer, orthographic.** "each controlled a character …
  running across two-dimensional levels" [4]. Discrete left/right/jump; touch or
  controller [3][5].
- **1–4 players.** Local same-device, Wi-Fi party, Party Codes, Quick Match [2].
- **Tower structure.** A run is a *tower*, a vertical stack of **rooms**, each cleared
  through a **door**. Unihorse Castle is the starter; Construction Tower and Creepy
  Carnival exist; towers unlock with **1 key per 100 levels** from any tower [2][7].
- **3 lives, hard cap.** "If you have 3 full hearts you're unable to purchase any more"
  [2]; "you only have three lives to work with" [6].
- **Death = lose a life, respawn at the start of the current room** — a mistimed jump
  "will eliminate a heart and start you over in the beginning of the room" [6].
- **Lose all 3 lives = restart from the bottom of the tower.** "you need to start over
  again from the bottom" [6].
- **Heart Vending Machine every 10 rooms**, 100 coins to refill one spent life, max 3
  [2]. A player review independently: "after every 10 rooms you do get the option to
  refill your hearts but it costs 100 coins" [10].
- **The group advances; the individual is stranded.** "if one of you makes it through
  the level and the other three die, you all move on to the next level" [4]. "If other
  players die, then whoever remains will just move on … those who fail are left
  behind" [6].
- **Boss rooms.** A recurring Angry Eagle: "Climb enough floors and you will meet the
  boss, the eagle. This eagle makes a regular boss appearance" [7]. A "rainbow mystery
  thingy" sits after a boss room, unlocked by beating that boss five times [2]. **The
  "boss every 30 stages" figure in the brief is UNVERIFIED** — no source gives an interval.
- **Scoring is per-room and difficulty-weighted.** "Each completed room, including a
  boss room, gives you points based on it's difficulty rating." Trophies at **bronze
  250 / silver 750 / gold 1500** [2].
- **Economy: three tiers, fixed prices.** Coins are "a common collectable" (Hat Machine
  **500 coins**/spin, heart **100**); purple tokens are "much rarer" (Character Machine
  **50 tokens**/spin); **100 tokens** granted after the first tower run; **5 green
  gems** hidden per tower in bonus rooms [2]. No microtransactions; unlocks cosmetic [7].
- **Co-op pools the haul but not the spending.** Tokens, coins and gems "are shared and
  the whole team benefits! When Tokens are spent … they are deducted from your
  individual Token tally" [2].
- No per-room time limit in most rooms [7]; everything but Challenge Events plays
  offline [1].

**Not verified.** "Hundreds of hand-designed rooms assembled procedurally" is
**UNVERIFIED and in tension with the source record**: the official store copy and the
official site both say only *"Each tower run is procedurally generated"* [1][9], and
Hipster Whale told Polygon the levels are procedurally generated [3]. No source
describes an authored room library. "Difficulty adapting to group performance" is
**UNVERIFIED** — [4] verifies the group-advance rule, which is a *progress* rule, not a
difficulty dial. "Coin scarcity increasing with progress" is **refuted**: coins are
officially "common" and both prices are flat [2].

## A2. Distinctive requirements

- **DR-03-1 — A run is a vertical stack of discrete rooms, not a continuous field.**
  A room ends at a door; the next room is a fresh, self-contained puzzle.
- **DR-03-2 — Progress has two granularities with different costs.** Room (free, cost
  is one life) and tower (full reset, cost is the whole run). The player feels both.
- **DR-03-3 — Lives are a purchasable budget, not a countdown.** 3 max, refillable at a
  10-room interval for a fixed currency price.
- **DR-03-4 — Every scored unit carries a difficulty rating that multiplies its value.**
- **DR-03-5 — Long-run currency is pooled socially but spent individually.**
- **DR-03-6 — Checkpoints are *machines*, not save points.** You stand on a button; the
  conversion is literal and reversible (jumping off refunds the coins) [2].
- **DR-03-7 — Group advancement decouples team progress from personal progress.**

## A3. The cause

Castle is a **co-op party platformer**, not an arcade hopper. Hipster Whale's CEO Clara
Reeves framed it to GamesBeat as the first return to original Crossy Road characters,
and the reviewer compared it to *New Super Mario Bros.*, not Frogger [4]. The answer to
"what breaks" is therefore not a bug in the loop but a **different product category**:
once the game is a *tower* and a *shared climb*, the run must be long enough for four
people and structured enough to have an apex. Structure is what produces the door; the
door is what produces the bottom-of-tower reset.

## A4. Transferability (static HTML/JS/2D canvas, no server, no SDK)

**Easy** — DR-03-1 (a room is a tile grid with an exit tile, pure data); DR-03-2 (one
extra `restartAt` pointer in run state); DR-03-3 (integer counter plus a price table);
DR-03-4 (a 1–5 integer per room used as a score multiplier); DR-03-6 (a trigger volume
that debits currency over time); boss rooms (a scripted room variant).
**Moderate** — DR-03-5: trivial solo, but same-device co-op needs one shared pool *and*
one per-player ledger.
**Hard** — DR-03-7: same-device is fine, but *net* co-op needs a server, which the
constraints exclude.

## A5. Conflicts

- **FR-29 (restart under one second) — direct, severe conflict.** Castle's restart cost
  is *proportional to progress*: at floor 90 the replay is 90 rooms long. The spec's
  retention argument ("the player choosing to try again before their attention moves
  elsewhere" [spec L115–117]) is inverted. Player evidence is blunt: *"it just so
  annoying when I die after such hard work"* [10]. This is the strongest data point in
  the genre against segmenting an endless hopper.
- **FR-05 (endless, no finish line, no level completion) — direct conflict.** Castle is
  "endless" only in that no tower is final. It is densely segmented: doors, boss rooms,
  100-level key milestones, trophies at 250/750/1500 [2]. Level completion is the
  spine, not an absence.
- **FR-06 (death ends the run) — conflict.** Castle death costs a heart and continues.
- **FR-31 (coins ~1 per second of survival) — conflict.** Castle coins are not a
  survival rate; they are a fixed price against a fixed interval (100 per 10 rooms).
- **FR-28 (death amusing, not punitive) — conflict.** Castle death is explicitly
  punitive and the community reads it so: *"I do not like the fact that you have 3
  lives"* [10].
- **What survives:** DR-03-3, DR-03-4, DR-03-5, DR-03-6 are *economy*, not *structure*.
  They are harvested below.

---

# B. Disney Crossy Road (2016, Hipster Whale / Disney) — DISCONTINUED

## B1. Status — CONFIRMED DISCONTINUED

Disney's own support article: **"Disney Crossy Road has been removed from the iOS,
Google and Amazon App Stores and will be retired on March 12, 2020"** [12]. Wikipedia
records the same shutdown date [13]. Independently verified today: Hipster Whale's
complete current US App Store catalogue is **8 titles** (Crossy Road, Crossy Road
Castle iOS/macOS, Crossy Road Castle Intro, Crossy Road Castle Stickers, Crossy Road+,
Piffle, Piffle+) and **contains no Disney Crossy Road**; a storefront search for
"disney crossy road" (US and GB) returns no such title [11]. The **Windows** version was
also separately discontinued after **v2.8** [13].

## B2. Verified mechanics (concrete and numeric)

- Launched **7 April 2016**; **nine worlds** built on Disney and Pixar properties; **more
  than 100 characters** at launch; distributed to App Store, Google Play, Windows Store
  and Amazon Appstore [14].
- The only stated *design* difference is content-shaped: "Each of the worlds … will
  feature **different challenges and music** based on their respective setting" [14].
  No new verb, no new control, no new failure rule is claimed by Disney associate
  producer Travis Marshall [14].
- Remained updated post-launch (the Windows cut-off at 2.8 implies a long tail) [13].

**UNVERIFIED:** what the per-world "different challenges" actually were. No priority-outlet
source I reached enumerates a single new mechanic, and I could not obtain a dedicated
hands-on review of Disney Crossy Road. Anything beyond "same loop, different level sets
and characters" is unverified.

## B3. Distinctive requirements

- **DR-03-8 — A reskin scales the *content* surface, not the *mechanic* surface.** Nine
  worlds and 100+ characters produced no documented change to the hop, the death, the
  restart, or the score.
- **DR-03-9 — Licensed content creates a hard external expiry.** The IP owner, not the
  studio, sets the end-of-service date; the developer cannot extend it [12].

## B4. The cause

The reskin is a **content multiplier over a fixed simulation**. Hipster Whale already had
a procedural lane generator, so a new world is a theme table plus an art set. With no
engineering pressure to invent a verb, none was invented. The commercial consequence is
in the record: a title with a huge roster, a four-storefront spread and years of updates
was switched off in 2020 and gone from sale since [11][12]. Content volume bought reach;
it bought no mechanic and no durability.

## B5. Transferability

**Easy but worthless** — DR-03-8 is a theme table and adds no design requirement a hopper
lacks. **Not applicable** — DR-03-9; self-owned IP has no counterparty to retire it.

## B6. Conflicts

- **No conflict with FR-29/FR-05** — and that is the point. Disney Crossy Road is the
  control case: it changed everything the player *sees* and nothing the player *does*, and
  it still failed. The hopper's endurance comes from FR-29/FR-05, not from surface variety,
  so DR-03-8 is **not** a harvest candidate. The "reskins produce no new mechanic"
  argument is **supported** — on the narrow claim only.

---

# 6. Harvest list (ranked)

1. **DR-03-3 + DR-03-6 — lives as a priced budget with a vending-machine checkpoint**
   [2][6]. The best transferable idea here. Death stays cheap enough to be funny but
   costly enough to matter, and the *fixed-interval, fixed-price* refill turns "how many
   times can I fail here" into a resource decision instead of a punishment. It also
   repairs the exact thing that breaks in Castle: the refill is a **local** purchase that
   shortens the punishing segment, where the tower reset is global. **Easy.**
2. **DR-03-4 — a difficulty rating on every scored unit, used as the score multiplier**
   [2]. Turns anonymous procedural content into a legible ladder and makes "how far did
   you get" mean more than a raw floor count. Compatible with FR-05, because a room can
   be scored without being a completion goal. **Easy.**
3. **DR-03-5 — currency pooled for the run, spent from the individual ledger** [2]. A real
   social mechanic at zero UI cost: the team shares the risk of the route and competes
   over who funds the next heart. **Moderate.**
4. **DR-03-7 — group advances, individual is stranded** [4][6]. **Anti-pattern, not
   harvested.** It turns death into a betrayal rather than a joke and is inseparable from
   the bottom reset. Listed only so the spec can explicitly reject it.

**On "hand-designed rooms assembled procedurally":** the *mechanism* is the strongest
structural idea here and the *sourcing* is the weakest claim in the dossier. Castle's
official copy says only "procedurally generated" [1][9], and nothing I reached describes
an authored room library, so the Castle version is **UNVERIFIED**. Harvest the **shape**
anyway — a fixed library of small, self-contained, hand-authored rooms, each carrying a
difficulty rating (DR-03-4), assembled in runs — but source it from the mechanism's
merits, not from this claim. It is also the clean answer to pure generation: a hopper
must stay endless (FR-05), and a room library is what lets an endless run stay endless
while every individual screen is hand-tuned and legible.

---

# 7. Sources

1. Hipster Whale, *Crossy Road Castle* official site — crossyroadcastle.com
2. Hipster Whale, *Crossy Road Castle Support / FAQ* — crossyroadcastle.com/support/ (primary source for every economy, room-cadence and multiplayer number below)
3. The Verge, "Apple Arcade's latest exclusive is a new Crossy Road spinoff", 27 Feb 2020
4. VentureBeat/GamesBeat, "Hipster Whale's Crossy Road Castle brings goofy laughs to Apple Arcade", 1 Mar 2020 — interview with CEO Clara Reeves, via web.archive.org/web/2022/
5. PocketGamer, Cameron Bald, "Crossy Road Castle, coming soon to Apple Arcade, is a wild departure for the series"
6. PocketGamer, Colin Mieczkowski, "Basic tips for your angelic ascent to the top of the tower" (3 lives; bottom reset; checkpoints; secret rooms)
7. PocketGamer, Colin Mieczkowski, "Three reasons why you may enjoy this tower climbing adventure" (towers; coin dispenser; tokens; no microtransactions)
8. PocketGamer, "Crossy Road Castle: Tips and cheats" (boss cadence; blue secret doors; 5 green gems)
9. Apple App Store listing + iTunes Lookup API, *Crossy Road Castle* id 1478978570 (description; release 2020-02-27; v12.3; 4.67/48,564)
10. Apple iTunes customer-reviews RSS, id 1478978570 — 450 reviews sampled 29 Sep 2026 (10-room heart refill; 3-lives complaints; "annoying when I die after such hard work")
11. Apple iTunes Lookup API, Hipster Whale artist id 924373885, US storefront, retrieved 29 Sep 2026 — 8 titles, no Disney Crossy Road; corroborated by US and GB storefront searches
12. Disney Games & Apps Support, "Disney Crossy Road is being retired on iOS, Google and Amazon" — archived 13 Feb 2020
13. Wikipedia, "Crossy Road", *Spin-offs* (12 Mar 2020 shutdown; Windows cut after v2.8; Castle platform history)
14. Polygon, Megan Farokhmanesh, "Disney Crossy Road launches today for mobile devices", 7 Apr 2016, archived 8 Nov 2020 (nine worlds; 100+ characters; per-world challenges and music; Marshall quotes)
15. Apple iTunes Lookup API, *Crossy Road* id 924373886 (baseline: 300+ characters, 28 worlds, endless)
16. Hipster Whale, *Crossy Road Castle Support* — console release September 2024
