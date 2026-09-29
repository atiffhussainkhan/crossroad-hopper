# Dossier 06 — Temple Run 2 & Subway Surfers

Both games are endless runners with continuous forward auto-scroll, which
contradicts FR-04 (discrete movement, no analog steering). They are paired
deliberately: same genre, twelve months apart, opposite answers to the only
question that matters for a hopper — *where do you put the ambiguity budget?*
Imangi spent it on the **world**: curvature, blind intersections, a device-tilt
axis, a mine cart that outruns your readability. Kiloo spent it on the **meta**
and spent **none** on the world: no turns, no tilt, three lanes. The hopper
takes Kiloo's axis deletion, plus Imangi's one world-level idea — a safe
sub-mode inside a lethal mode.

---

## A. Temple Run 2 (2013, Imangi Games)

iOS 17 Jan 2013, free with in-app purchase [1][2]. Keith Shepherd's core team
~5, with FuzzyCube on the puzzle minigames [1].

### A.1 Verified mechanics

- **Inherited controls.** Swipe left/right for 90° turns, up/down to dodge, and
  **tilt the device to steer through coin strings** [2]. Tilt is the analog axis
  and the reason TR2 conflicts with FR-04.
- **Curved paths.** TR1 was "all about straight lines and 90-degree turns";
  TR2's headline world change is "hills, valleys and gradual curves" [2].
- **Zip lines.** A new path type, and *"an opportunity for you to take a breath
  since you won't run into any danger on them"* [2] — a no-death stretch inside
  a lethal mode.
- **Mine carts.** The other new path type: the cart *"moves faster than you do
  on foot and approaches turns with much less warning"* [2] — speed bought with
  reaction time.
- **Coin-gated character abilities.** TR2 ships *fewer* unlockable characters
  than TR1, but each fires an ability once you have collected a set number of
  coins: Guy Dangerous = shield, Scarlett Fox = speed boost, Barry Bones =
  50-coin bonus, Karma Lee = 500-point bonus [2]. Zero input cost — the player
  already wanted coins.
- **Two currencies, split purpose.** Coins and gems; gems upgrade power-ups and
  can grant extra lives; both obtainable in play [2].
- **Store copy** sells *"defy gravity, vault over great barriers"*, *"Unlock
  powerful heroes with unique abilities"*, and — for FR-40 — **"Play Offline"**
  [4].
- **The curvature is documented as a cost.** On curves "the camera turns
  slightly" and it is hard to tell which side of the path you are on; TR2's App
  Store reviews complained that "some intersections are poorly visible… You can
  easily miss an intersection or turn and fall into the abyss" [2][3].
  GamesBeat scored it **79/100, below TR1's 85** [2].

### A.2 Distinctive requirements

**DR-06-1 — Curvature is the difficulty dial, and it costs readability.**
*Cost:* the map becomes an inference made under time pressure, not a truth.
Hopper form: a road that visibly bends one lane earlier than its hazard.

**DR-06-2 — A guaranteed-safe sub-mode inside the lethal mode.** *Cost:* failure
is spatially segregated. The most transferable idea here (§6.1).

**DR-06-3 — Speed escalation that *removes* information.** The cart is worse for
reading the world and better for score [2]. Safe hopper inversion: the fast lane
is the one whose hazards were telegraphed two rows earlier.

**DR-06-4 — A power granted by currency count, not by input.** Never competes
for the input budget [2]. Hopper form: a passively-charged second wind the
player only decides *when* to spend.

**DR-06-5 — Two currencies with separated purpose** (spend-now vs.
save-forever) [2]. Redundant with FR-31; do not re-add without a second sink.

**DR-06-6 — The recorded failure of the coin sink.** On TR1: *"we really ran out
of things for people to spend their coins on really fast"*; the TR2 fix was to
be *"really generous with coins"* [1] — **adding coins without a sink is the
easier mistake.**

> **UNVERIFIED — "coins spent on permanent home decoration."** The base spec
> (line 137) asserts this and cites [17], which is the **Subway Surfers** wiki,
> not a Temple Run source. No credible TR2 source reached here ([1][2][4][5])
> mentions a home or decoration screen. The sourced finding is the inverse: TR2
> had no adequate sink and solved it with generosity, not furniture.

### A.3 The cause

TR1 reached 170M downloads [2], so TR2 could be sold as a content-and-world
upgrade into a proven audience — and could afford what Kiloo could not: **make
the map the content.** Curvature, zips and mine carts are three new *generators*,
not three new rules; the input set is unchanged. That is why it scored *lower*
than TR1 [2]: adding ambiguity to a solved control scheme taxes the player
without adding agency.

### A.4 Transferability — static HTML/JS/2D canvas, no server, no SDK

| DR | Rating | Reason |
|----|--------|--------|
| DR-06-2 safe sub-mode | **Easy** | A no-traffic row is a data flag, not a system. |
| DR-06-4 coin-gated ability | **Easy** | A counter and a threshold; no new input. |
| DR-06-3 speed vs information | **Easy** | One lane type, one multiplier, one telegraph offset. |
| DR-06-6 sink-failure lesson | **Easy** | A design constraint, not code. |
| DR-06-1 curvature-as-dial | **Moderate** | A canvas can bend a lane, but readable curvature wants a 3D camera. |

**Tilt/gyro: not transferable — forbidden by FR-04.** Drop the axis (B.3).

### A.5 Conflicts

- **FR-04** — direct. Auto-scroll is continuous world motion; tilt is analog
  steering, which FR-04 excludes by name. Resolved in §5.
- **FR-01 determinism** — curve/cart timing are frame-rate features; port to
  tick-quantised movement.
- **FR-40** — none; TR2 is explicitly offline-playable [4].
- **Crossy-Road identity flag** — the spec flags "PURPLE forest" (§7) and this
  dossier cannot tell which title it describes. The parent must attribute it
  before any art is written.

---

## B. Subway Surfers (2012, Kiloo with SYBO)

Released May 2012 [6]. Stated split: **SYBO created the concept and art; Kiloo
took the user interface, monetization and player retention** [3].

### B.1 Verified mechanics

- **Three lanes is the novelty.** *"The novelty brought by the designers of
  Subway Surfers is a division of the player's path into three tracks. The
  character has to jump between them to avoid both static and dynamic
  obstacles"*; the player *"swipes his character across the display"* [3].
- **Turns and gyroscope both deleted.** *"Devoid of these aspects [blind
  intersections, integrated gyroscope], Subway Surfers has become popular as a
  title with low entry threshold"* [3]. The direction matters: the "twist your
  neck" complaint is recorded against **Temple Run**, as the problem SS removed
  [2][3].
- **Crash is absolute; no buyable continue.** *"In Temple Run, when you bump
  into an obstacle, you can resume if you have crystals that are purchasable for
  real money. In Subway Surfers, when you run into an obstacle, you have to
  start all over."* [3]
- **Hoverboards are the only continue, and they are pre-bought.** *"If you see
  you are going to fail, just activate a board and fly over any obstacle. One
  player can have a limitless amount of boards."* They are *"disposable bonuses
  that are activated on the track, last for a limited amount of time and have a
  specific function"* [3].
- **Daily word hunt.** *"To receive a reward, the player must compose some word
  from letters on the track. It takes no more than five minutes"* — its stated
  purpose is to pull the player back to the friends' scoreboard [3].
- **Power-ups progress by duration, not power.** Upgrades *"prolong the active
  time of power-ups (money-drawing magnets will work for 10 seconds instead of
  5)"*; *"a level 5 magnet will require a half an hour of coin grinding"* [3].
- **Missions:** three tasks each, each completed mission awarding an extra point
  multiplier. **Scarcity by delisting:** the Chicky Board is earnable for 100
  easter eggs, then *"removed from the store. Sorry, limited edition."*
  **Cadence:** monthly track restyles and new characters, some available for 30
  days; 11 purchasable characters [3].
- **World Tour:** from 2013 the setting rotates through named cities — New York,
  Rio, Sydney, Rome, Mumbai, Dubai, Paris, Tokyo, Miami [6] (community wiki; the
  store listing independently confirms the World Tour framing [7]).

> **UNVERIFIED — "the eight power-ups."** The community wiki's own lead calls
> them *"5 main power-ups"*; its table lists fourteen across three families —
> in-run pickups (Coin Magnet, 2X Multiplier, Super Sneakers, Jetpack, Pogo
> Stick), pre-bought boosts (Hoverboard 300 coins, Score Booster 3000, Headstart
> 2000), later event items (Super Mysterizer, Hourglass, Super Bubble, Score
> Blast, Multiplier Bonus, Coin Doubler) [6]. The canonical "eight" traces to
> **no credible source**. The design lesson survives without the count.

### B.2 Distinctive requirements

**DR-06-7 — Three fixed lanes, not a branching path.** *Cost:* the only spatial
decision is 1-of-3, so a wrong guess is recoverable in one hop.

**DR-06-8 — Delete the axis, don't balance it.** No turns means no heading state
and no missed-corner failure; no gyro means no analog input, no neck strain, no
orientation dependency [3]. *Cost:* the map is no longer the content, so content
must be found elsewhere. The most transferable lesson here.

**DR-06-9 — No buyable continue; insurance is bought between runs.** *Cost:*
short sessions, cheap failure, expensive score. FR-19 already buys this.

**DR-06-10 — Single-hit insurance, consumed at the moment of decision.** Not
lives, not a revive prompt: one held charge, spent manually, negating the next
collision [3]. *Cost:* the spend must be timed, converting a reflex game into a
resource-forecasting one. The strongest *portable* novelty in the pair.

**DR-06-11 — A collect-to-spell objective riding the main lane** [3]. *Cost:*
near zero — a second scoring axis on objects the player already walks over.

**DR-06-12 — Progression by duration, not power.** Magnet 5s → 10s [3]. A curve
that can never trivialise difficulty tuning.

**DR-06-13 — Location rotation as the content calendar** [6][7]. *Cost:* art
budget. Take the cadence, drop the cities.

### B.3 The cause

SS was built by the team whose job was retention and monetization [3], not
world-building. With a fixed art budget the only free axis was complexity, and
the cheapest complexity to delete was the one players already complained about.
The resource that made TR2's world richer made SS's simpler, and SS converted
the saved budget into a return-visiting meta [3].

### B.4 Transferability — static HTML/JS/2D canvas, no server, no SDK

| DR | Rating | Reason |
|----|--------|--------|
| DR-06-8 axis deletion | **Easy** | The hopper is already turn-free; a re-affirmation, not work. |
| DR-06-10 single-hit insurance | **Easy** | A boolean shield flag on the collision handler. |
| DR-06-11 word hunt | **Easy** | Letters on tiles, a target string, a per-run timer. |
| DR-06-9 no continue | **Easy** | Already FR-19. |
| DR-06-12 duration upgrades | **Moderate** | Needs a local spend table; tension with FR-46's scrub map. |
| DR-06-13 location rotation | **Hard** | Multiple themed art sets. Take the cadence, not the cities. |

### B.5 Conflicts

- **FR-04** — SS is *more* compatible than it looks: its locomotion is discrete
  (one lane hop, one commit); only the world scroll is continuous. FR-04 bans
  analog steering, not world motion. See §5.
- **FR-19** — none; SS validates "crash, one-tap restart, no continue".
- **FR-46 zero-purchase, fully completable** — DR-06-12's ladder is a sink that
  *lengthens* runs, not one needed to finish. Admissible only as optional
  duration, never as required power.
- **FR-22** — a held insurance charge is a second resource to forecast, risking
  "every failure is legible and immediate". Cap at one charge, arm it visibly.

---

## 5. Resolving the FR-04 conflict

FR-04 reads: *"movement is discrete, with no analog steering and no mid-hop
correction."* Both games appear to fail it. The precise diagnosis:

1. **The analog axis is the real violation, and both games agree.** TR2 keeps
   device tilt [2]; SS deletes it and is credited with a low entry threshold as a
   result [3]. FR-04 already bans tilt — DR-06-8 is a **re-affirmation, not a
   change**.
2. **Continuous world motion is not what FR-04 bans.** FR-04 constrains the
   *player's* control, not the camera. A scrolling world with a discrete,
   committed hop is legal by letter and by intent.
3. **The hopper resolves it by not adopting auto-run as locomotion.** Take SS's
   world — three straight lanes, no turns — and keep the hopper's own authority:
   the camera is player-driven per hop, as Crossy Road already is. The one
   element worth carrying is the **ramp**: a continuously advancing background
   raising pressure without asking for input — not unstoppable locomotion.
4. **The residual conflict is TR2's, not SS's.** Its world ambiguity and tilt
   axis make it a poor hopper donor. Treat DR-06-1 as *explicitly rejected*.

Net: FR-04 stands. Nothing here requires amending it.

---

## 6. Harvest list — ranked

1. **DR-06-2 — a guaranteed-safe sub-mode inside the lethal mode.** The zip line
   is the only stretch where you cannot die, explicitly *"an opportunity to take
   a breath"* [2]. One data flag per row, zero new input, and it gives the run
   natural punctuation and a place to bank a decision.
2. **DR-06-10 — single-hit insurance as a held, spent charge.** One manual
   consume that negates the next hit [3] — the one mechanic here that raises the
   decision density of a game that otherwise has almost none.
3. **DR-06-8 — the axis deletion as a feature.** No turns, no tilt [3]. The
   hopper inherits it free; the binding half is the requirement it implies —
   whatever is removed from the world must be *replaced* in the meta.
4. **DR-06-4 + DR-06-11 — power granted by count, and a collect-to-complete
   objective.** Both ride objects the player already touches; together they are
   the entire anti-stasis budget for a game with no pursuer.
5. **DR-06-6's lesson, not its mechanism.** Imangi's *"ran out of things for
   people to spend their coins on really fast"* [1] is the best available
   evidence for the spec's warning: a currency with no sink trains the player to
   ignore it.

---

## 7. Sources

[1] TWiT / blancer mirror, "Imangi surprises with Temple Run 2 — interview with
    developer Keith Shepherd", 23 Jan 2013 (primary developer interview) —
    https://blancer.com/tutorials/i-phone/489685/imangi-surprises-with-temple-run-2-interview-with-developer-keith-shepherd-2/
[2] John Carmody, "Temple Run 2 review: Imangi's adventure game sequel is a
    fast and fun ride, but the fun fades as the shadows lengthen",
    VentureBeat/GamesBeat, 17 Jan 2013 (79/100) — https://gamesbeat.com/temple-run-2-review/
[3] Game World Observer, "Subway Surfers: a Gameplay Analysis", 24 Jun 2016
    (the base spec's [16]: Sybo/Kiloo split, lane division, gyro/turn removal,
    no-continue contrast, hoverboards, word challenge, upgrade economics) —
    https://gameworldobserver.com/2016/06/24/subway-surfers-gameplay-analysis
[4] Apple App Store, *Temple Run 2* (Imangi), official listing via the iTunes
    Lookup API — https://itunes.apple.com/lookup?id=572395608&entity=software&country=us
[5] Imangi Studios, *Temple Run 2* official page — https://imangistudios.com/thegames/temple-run-2/
[6] *Subway Surfers* community wiki — main article for the May 2012 release, the
    2013 World Tour city rotation, and the Power-Ups table (hoverboard 300 /
    score booster 3000 / headstart 2000 coins; six upgrade tiers
    500/1000/3000/10000/60000; +5s per tier, jetpack capping at 25s) —
    https://subwaysurf.fandom.com/wiki/Subway_Surfers and
    https://subwaysurf.fandom.com/wiki/Power-Ups
    *Community source — used only where corroborated by [3] or [7].*
[7] Apple App Store, *Subway Surfers* (SYBO Games), official listing —
    https://apps.apple.com/us/app/subway-surfers/id745887355

Wikipedia was unreachable from this host (HTTP 429 on all en.wikipedia
endpoints, 29 Sept 2026), so no claim here rests on it. The [15]–[18] numbers
in the base spec are *its* reference numbers, not this dossier's.
