# Dossier 05 — Doodle Jump & Temple Run

Two games adjacent to the lane-crossing hopper, each solving a problem the base
spec leaves open: how to apply pressure without a pursuer (Doodle Jump), and how
much agency a forward-running game can have (Temple Run). Sources numbered
locally; untraceable claims are marked **UNVERIFIED** and are excluded from the
harvest list.

---

## A. Doodle Jump (Lima Sky — Marko & Igor Pusenjak)

iOS March 2009, Android March 2010 [1]. Two people, ~2 months, all code from
scratch in Xcode [3].

### A.1 Verified mechanics

- **Zero-verb locomotion.** No jump button; contact with a platform top *is* the
  jump command [1][3]. The only inputs are lateral movement and shooting.
- **Tilt lateral, edges wrap.** Store copy, verbatim: *"Tilt to move left or
  right, tap the screen to shoot."* [4] Leaving the left edge re-enters right
  [1]. (Wikipedia flags the accelerometer citation as unverified, so the sensor
  dependency is firm only via the developer's own store copy.)
- **Platform types, five named by the developer:** *"broken, moving,
  disappearing, moveable, and EXPLODING platforms"* [4]. A community wiki adds
  holographic, icicle, shifting [5] — community source, so **UNVERIFIED**; the
  five store-named types are authoritative.
- **Four power-ups:** jet packs, propeller hats, rockets, springs *"that fly you
  higher"* [4].
- **Enemies:** monsters, UFOs, black holes, bear traps; monsters die by being
  jumped on, *"MARIO-style"* [4].
- **Score markers:** other players' real scores rendered into the level as
  targets — claimed as the first game to do so [3], sold as *"blows past other
  players' actual score markers scribbled in the margins"* [4].
- **Balance rule, stated:** one new obstacle shipped per one new power-up [3].
- **Shooting was a post-launch concession.** The first build shot only straight
  up. Directional shooting was added on player request; the team expected it to
  make the game *easier* and were surprised players called it *harder*. Now a
  toggle [3].
- ~25,000 copies/day for four straight months; 10M downloads by Dec 2011 [1].
  $1.99 plus IAP [4].

### A.2 Distinctive requirements

**DR-05-1 — Platform contact is the jump verb.** *Cost:* the player cannot
choose *when* to leave, only where to aim, so expression moves from timing to
placement.

**DR-05-2 — Platform type rewrites the rule of a row, not merely its spacing.**
A normal platform is static geometry; a moving one is a timing puzzle; a
breakable one a *single-use consumable*; a disappearing one a *countdown*; an
exploding one a *trap that punishes a lunge*. All five occupy the same slot
with identical hitboxes and vertical spacing. The highest-value idea here:
difficulty becomes a per-tile **type tag** in a generator, decoupled from
layout, so one row can ask two different questions of the player.

**DR-05-3 — Ascent camera.** The run ends when the player *"falls to the bottom
of the screen"* [1] — anti-stasis with no pursuer sprite and no new rule.

> **UNVERIFIED — "the camera never scrolls downward" is not sourced.** Traced
> across the developer interview [3], both official store listings [4][8] and
> Wikipedia [1]: each states the *death condition* (falling past the bottom
> edge ends the run); none describes the camera's implementation or asserts a
> one-way lock. The claim appears only on clone-game content farms and fan
> wikis. **For the parent: base-spec structural pattern 1 rests on this claim
> and is currently unsourced.** The two readings are behaviourally identical —
> a camera that only ratchets up, and one that tracks you while its lower edge
> rises past you, produce the same failure. Implement the observable rule, not
> the rumoured implementation.

**DR-05-4 — Tilt as the only lateral axis, with wraparound.** *Cost:* a
device-sensor dependency, and a hard blocker on desktop.

**DR-05-5 — The nose-gun.** A tap fires a non-locomotion projectile. Adding it
*raised* perceived difficulty rather than lowering it, because it converts a
passive enemy encounter into an active one with its own aim and timing budget
[3].

**DR-05-6 — Power-ups as rule overrides, not stat boosts.** Rocket and jetpack
suspend the hop arc; the propeller hat inverts vertical control; the spring
multiplies bounce height [4]. Each is seconds of a *different movement grammar*
mid-run.

**DR-05-7 — Diegetic rival scores.** A leaderboard re-rendered as world
geometry [3][4].

### A.3 Cause, behaviour, cost

Auto-jump frees the whole input budget for lateral aim, which is why the game is
one-handed and survives on a 2D canvas. Platform typing turns difficulty from a
*tuning* problem (nudge spacing) into a *content* problem (tag tiles) — which is
what let a two-person team ship years of content, and why the balance rule had
to be held by hand. The nose-gun shows adding a verb is not a difficulty
release valve; it moves pressure onto the enemy's timing. Ascent pressure is
free anti-stasis but only works in a strictly one-axis game — it does not port
to a game with a lateral fail state.

### A.4 Transferability — static HTML/JS/2D canvas, no server, no SDK

| Requirement | Rating | Reason |
|---|---|---|
| DR-05-1 auto-jump | **Easy** | One collision callback sets a negative `vy`. |
| DR-05-2 platform types | **Easy** | A `type` field plus a switch in the collision handler; each type is a one-shot state flip. |
| DR-05-3 ascent camera | **Easy** | `cameraY = min(cameraY, playerY)` and a lower bound that only rises. |
| DR-05-4 tilt | **Moderate** | Needs `deviceorientation` permission on iOS Safari; no desktop equivalent, so a key/touch fallback is mandatory or the game is unplayable on the most common target. |
| DR-05-5 nose-gun | **Easy** | One tap handler, one projectile list, one hit test. |
| DR-05-6 four power-ups | **Moderate** | Few branches each, but every collision rule must be re-tested under four grammars. |
| DR-05-7 score markers | **Hard** | Data is local-only without a server; the offline workaround is a baked-in array of fake scores — a content problem, not a code one. |

### A.5 Conflicts with the base spec

- **FR-07 ("A tap moves forward one tile") — direct contradiction.** Doodle Jump
  has no forward tap: the tap is bound to shooting [4] and forward motion is
  automatic. **Resolution:** keep FR-07 as the genre default and *invert*
  DR-05-1 rather than copying it — a lane-crossing variant where the tap
  advances one lane and platform *type* governs the lane you arrive in: a
  one-use tile is consumed by arrival, a countdown tile expires as you cross,
  a moving tile carries you. This keeps the row-rule rewrite (DR-05-2) without
  inheriting a one-way camera.
- **FR-03 ("One forward hop increments the score by one") — contradiction.**
  Doodle Jump scores altitude, not hops [1]. **Resolution:** keep FR-03
  literally; it is the genre's currency and what makes scores comparable across
  runs. Adopt the *mechanism* (a monotone score rewarding only progress), not
  the unit.

---

## B. Temple Run (Imangi — Natalia Luckyanova, Keith Shepherd, Kiril Tchangov)

iOS August 2011, Android 2012 [2]. Three people, self-funded, ~4 months [2][7].

### B.1 Verified mechanics

- **Four verbs, all 90° swipes:** turn left, turn right, jump, slide [2][6].
  The 2013 store copy: *"Original 3D running mechanic combining turning,
  jumping, sliding and tilting — the first of its kind!"* [6]
- **The character can never stop, and can never turn by any amount other than
  90°.** The developer's own account: they prototyped free rotation of the world
  around the running character *"like a record"*, found *"it made you extremely
  dizzy"*, and constrained the player to 90° turns with no stopping — discovering
  that *"the 90 degree turns allowed us to use a simple swipe mechanic for
  turning"* [7]. The most valuable single finding here: **the constraint on the
  control is what makes the control cheap.**
- **Tilt is a second, orthogonal axis** for coin lines, and the documented
  hardest thing to tune in the project: *"we had to work very hard to get tilt
  and swipe to work right together. When you swipe while you're tilting, the
  angle of the swipe changes"* [7].
- Death: hitting a large obstacle, falling into water, or being overtaken by the
  monkeys [2].
- **Economy:** in-run coins buy power-ups and character upgrades [2]. The
  archived v1.6.1 listing sells *coin packs only* — 2,500 / 25,000 / 75,000 /
  200,000 coins at $0.99 / $4.99 / $9.99 / $19.99. Seven characters; Game
  Center leaderboards [6].
- **The gems experiment.** Coins began as colour-coded gems collected in
  *certain combinations* for a bonus. At speed this was *"way too hard to do… so
  you ended up getting frustrated and ignoring the gems completely."* The
  developers removed the gems entirely, then put them back because they missed
  them [7].
- **The pursuer's rationale is stated, not decorative:** *"why is the character
  running? Why not just stop and take a breather… So we needed something chasing
  the guy. That's how the monkeys were born."* [7]
- **Monetisation pivot:** $0.99 launch Aug 2011, ~#50 Paid, a few hundred
  downloads/day → free Sept 2011 → *"revenue went up 10x immediately"* → #1 Top
  Free 28 Dec 2011 → #1 Top Grossing 7 Jan 2012 → ~500,000 downloads/day [7].
- The **current** listing (v1.42.0) describes swipe-only control; tilt is absent
  from the copy entirely [8]. When it was retired is **UNVERIFIED** — but a
  15-year-old live product dropping a headline control from its own description
  is itself evidence about tilt's durability.

### B.2 Distinctive requirements

**DR-05-8 — Quantised steering.** Free rotation cut to a four-verb 90° set. The
player plans a *path*, not a *trajectory*. *Cost:* the grammar cannot express
"a little to the left".

**DR-05-9 — Non-negotiable forward speed.** The world advances regardless of
input — FR-12's anti-stasis, enforced by the movement model rather than a
pursuer.

**DR-05-10 — Hybrid analog/discrete axes.** Discrete swipe for committed verbs,
continuous tilt for the cheap axis. *Cost:* the swipe angle shifts under tilt [7].

**DR-05-11 — Pursuer as constant presence, not a timer.** The monkeys are always
in frame, supplying *"immediacy and adrenaline"* [7] — a fail-state narrator for
a game with no levels.

**DR-05-12 — In-run currency feeding a persistent upgrade track.** Coins
collected at speed fund power-ups and character upgrades, and are also sold
directly [2][6].

> **UNVERIFIED — purchase-to-continue using crystals.** The brief describes this
> model, but it is absent from the archived 2013 listing, whose entire
> in-app-purchase table is coin packs [6]; absent from the current listing [8];
> and absent from the developer's own account of the coins/gems economy, which
> describes *removing* a gem mechanic, not selling a revive [7]. Wikipedia
> describes the coin economy and power-up purchases but no continue purchase
> [2]. **Do not build this on the strength of the brief.**
>
> **UNVERIFIED — neck strain from the gyroscope.** No reputable press source
> found (Polygon, Eurogamer, Guardian, Game Developer, PocketGamer, Kotaku all
> searched). Base-spec structural pattern 3 asserts it, citing its own [16][17];
> what those describe is *Subway Surfers removing* the gyroscope and turns — a
> downstream product decision, not evidence of injury. Verified and stronger:
> Imangi itself calls tilt+swipe the hardest thing to tune [7], and the current
> listing no longer mentions tilt at all [8]. Directionally right, specifically
> unsourced.

### B.3 Cause, behaviour, cost

DR-05-8 is a *difficulty-of-interface* decision, not of game: removing 270° of
steering removed the ability to micro-adjust, and with it a whole class of
near-misses and complaints, while letting a four-direction swipe replace a
stick. DR-05-9 removes the need for any anti-stasis clock because idling is not
expressible. DR-05-11 turns a missing narrative ("why am I running?") into a
diegetic one for free. The cost is total: the control scheme *is* the game, so
it cannot be bent onto a lane-hopping grid without becoming a different game.

### B.4 Transferability

| Requirement | Rating | Reason |
|---|---|---|
| DR-05-8 quantised 90° steering | **Easy** | Four gestures to four heading changes; no interpolation. |
| DR-05-9 non-negotiable speed | **Easy** | A per-tick increment; fail logic becomes a timing check, not a controller. |
| DR-05-10 tilt coin-steering | **Hard** | The `deviceorientation` permission problem of DR-05-4 *plus* the documented swipe/tilt interference. On desktop it collapses to "arrow key held", but the iOS permission prompt is a real conversion tax. |
| DR-05-11 visible pursuer | **Easy** | One sprite at a fixed offset behind the player, plus an overtake check. |
| DR-05-12 currency → upgrades | **Moderate** | A balance-and-persistence layer (localStorage); the tuning is the work, and per-device without a server. |
| Purchase-to-continue | **Not recommended** | The developer's own account says the design *failed* — players ignored it, so it was cut [7] — and the base spec's anti-pay-gate constraint is its strongest finding. |

### B.5 Conflicts with the base spec

- **FR-04 ("Movement is discrete, with no analog steering and no mid-hop
  correction") — direct contradiction.** Temple Run has no discrete movement at
  all: motion is continuous, uncorrectable between gestures, and the player
  cannot stop. **Resolution:** keep FR-04 as the spine — it is correct for the
  lane hopper. Take DR-05-9 and DR-05-11, which are orthogonal to FR-04: a lane
  hopper can have a world that advances on a timer and a pursuer at a fixed
  offset, both of which press the player forward without ever making movement
  analog. Reject DR-05-8 as a *movement* model — 90° turns are meaningless on a
  lane grid — and keep only its lesson: **quantising control is what makes it
  cheap, and the price is that it cannot express a small correction.** On a lane
  grid the grid is already that quantisation, so the lesson is free.
- **FR-09 (hybrid tap/swipe) — compatible, and reinforced.** Temple Run is
  itself a hybrid, discrete swipe plus analog tilt [6][7], supporting FR-09 as a
  general genre law rather than a Crossy Road quirk.

---

## 6. Harvest list — ranked

1. **DR-05-2, the platform-type system.** Five types sharing one hitbox and one
   slot, differing only on contact, turns difficulty from spacing-tuning into a
   per-tile tag — the most reusable idea in the genre and the cheapest to build.
2. **DR-05-1 inverted, auto-resolve the forward hop.** Take "contact is the
   verb" and point it sideways: a tap that fires on arrival rather than on
   press, so the only decisions are lane choice and timing. Frees the input
   budget entirely.
3. **DR-05-9 + DR-05-11, non-negotiable advance plus a visible pursuer.** The
   two cheapest anti-stasis mechanisms, both fully compatible with FR-04 and
   both trivially expressible in 2D.
4. **DR-05-5, an offensive verb that raises difficulty.** A tap-shoot turning a
   passive threat into an active one, with the developer's own evidence that it
   made the game harder, not easier.
5. **DR-05-8's lesson, not its mechanism.** Quantise control so the input is
   cheap and ambiguity is removed; on a lane grid that is already free, so
   spend the saved budget on DR-05-2 variety instead.

---

## 7. Sources

[1] Wikipedia, *Doodle Jump* — https://en.wikipedia.org/wiki/Doodle_Jump
[2] Wikipedia, *Temple Run* — https://en.wikipedia.org/wiki/Temple_Run
[3] Jon Jordan, "Bouncing ever upwards: The making of Doodle Jump",
    PocketGamer.biz, 11 Sept 2009 (interview with Marko & Igor Pusenjak) —
    https://www.pocketgamer.biz/feature/15412/bouncing-ever-upwards-the-making-of-doodle-jump/
[4] Apple App Store, *Doodle Jump* (Lima Sky), official listing —
    https://apps.apple.com/us/app/doodle-jump/id307727765
[5] *Doodle Jump* community wiki, Category:Platform_Types (community source;
    cited only for the types the store copy omits) —
    https://doodle-jump.fandom.com/wiki/Category:Platform_Types
[6] Apple App Store, *Temple Run* v1.6.1, 13 Sept 2013, via Internet Archive —
    https://web.archive.org/web/2013/http://itunes.apple.com/us/app/temple-run/id420009108
[7] Rob LeFebvre, "Temple Run developer shares a behind the scenes look at
    making a runaway hit iOS game", VentureBeat/GamesBeat, 6 Feb 2012
    (interview with Natalia Luckyanova), via Internet Archive —
    https://web.archive.org/web/2018/https://venturebeat.com/2012/02/06/temple-run-developer-shares-a-behind-the-scenes-look-at-making-a-runaway-hit-ios-game/
[8] Apple App Store, *Temple Run* v1.42.0, current listing, via the iTunes
    Lookup API — https://itunes.apple.com/lookup?id=420009108

The [16][17] cited in §B.2 are the base document's own reference numbers, not
this dossier's.
