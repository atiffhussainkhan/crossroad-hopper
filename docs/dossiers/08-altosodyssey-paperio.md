# Dossier 08 — Alto's Odyssey & Paper.io: the distance-gated pursuer and the trail-as-liability

**Method note.** No `web_search` tool was available; research used DuckDuckGo Lite, `web_fetch`, the iTunes Lookup API, and direct publisher/store pages. **Wikipedia was unreachable** — HTTP 429 on both the normal endpoint and `?action=raw` — so no claim rests on it. Load-bearing sources are Snowman's press kit [1] and the store listings [2][8][9], all developer-written copy.

**Three corrections to the base spec first.**

1. **Wall riding is Odyssey's**, per the developer's own "Newfound heights… hot-air balloons, moving grind rails, and **wall riding**" [1][2]. Odyssey's list is explicitly new-in-this-title. This corroborates dossier 07's correction and the spec's structural-patterns section should not blur the two titles.
2. **Zen Mode predates Odyssey.** The press kit's History section describes it as an *Alto's Adventure* feature whose players used it "as a therapeutic tool" [1]. Odyssey inherited and restated it — a two-title pattern, not a single-title one.
3. **Paper.io's real-time multiplayer is the 2018 sequel, not the 2016 original.** The 2016 listing says *"Paper.io is for the whole family and **doesn't require an Internet connection**"* [8]. Online play arrives in **Paper.io 2** (9 Aug 2018): *"Online multiplayer you can jump into in seconds"* [9]. The `.io` loop is Voodoo's *second* pass at a rule set that shipped offline first.

---

## A. Alto's Odyssey (2018, Snowman / Land & Sea — "Team Alto")

### A.1 VERIFIED MECHANICS

- **Released 22 Feb 2018 iOS, 26 Jul 2018 Android; $4.99 premium, zero ads, zero IAP** [1][2] — *"Purchase once, play forever"* [2]. 4.43★ / 2,967 ratings. **Named a 2018 Apple Design Award winner** [2] — the only title in the genre table to hold it.
- **Auto-run, one-touch trick system:** *"At the heart of the Alto series is an elegant one-touch trick system. Chain together combos, and complete 180 goals"* [1][2]. "180 goals" is the publisher's own number, not an inference.
- **Terrain is procedural and biomic:** *"procedurally generated terrain"*; *"From the dunes, to the canyons, to the temple city… each area boasting unique visuals and gameplay"* [1].
- **New geometry, same input:** hot-air balloons, moving grind rails, **wall riding**, wind vortexes, rushing water [1][2]. The press kit ships `GIF_Wallride.gif`, `GIF_RopeBridgeWall.gif`, `GIF_WallArchChasm.gif` [1] — the verbs are in the marketing assets.
- **Lemurs are a listed feature, not a hidden one:** *"ride towering rock walls, and escape mischievous lemurs"* [1][2].
- **Zen Mode, in the publisher's exact words:** *"this relaxing mode distills Odyssey down to its purest elements: **no scores, no coins, and no power-ups**. Just you and the endless desert"* [1][2].
- **Six characters**, *"each with their own attributes and abilities"* [1][2] — no ability sheet published (see A.5, FR-16).
- **No level completion.** No finish line, no stage clear, no completion state anywhere in the copy [1][2]. Goals are presented as something to *complete*, never as something that *ends* the session. Photo Mode ships alongside — a camera, not a mechanic [1][2].
- **UNVERIFIED — lemur distance and escape rules.** Community wikis give *"approximately every 2,600 meters"* and state *"the chase ends when the player jumps over a chasm, leaving the lemur behind"* [4][5]. The spec's "~2 km" and its claim that escape is *only* "going faster, never by fighting or by outlasting" — **the never-fight / never-outlast half is sound; the go-faster-only half is not supported.** A chasm is a second, terrain-based exit. Both routes still leave the player no weapon and no defensive timer, which is the part that transfers.
- **UNVERIFIED — that Alto never loses speed.** Attributed by the spec to AndroidGuys [24]; that URL is **dead (404) and was never archived** [6]. Design *intent* is well supported — tricks convert into speed, speed is the survival resource [1][2] — but the physical claim is not sourceable. Treat as principle, not measured fact.

### A.2 DISTINCTIVE REQUIREMENTS

- **DR-08-1 —** The pursuer is **distance-gated, not idle-gated**. It cannot exist before ~2 km of play, so the opening of every run is safe by construction. Contrast FR-13, which arms the eagle on a stopwatch and can therefore fire in the first second of a new player's first run.
- **DR-08-2 —** The pursuer offers **no defensive verb at all**: no attack, no invulnerability, no survivable timer. The only way out is to use something the player already owns.
- **DR-08-3 —** Style *is* the escape. Trick chains buy speed, speed buys distance, distance ends the chase. The pressure and the skill expression are the same subsystem.
- **DR-08-4 —** A stated-subtraction mode: Zen Mode removes score, coins **and** power-ups simultaneously, and gets its own soundtrack [1][2]. Not a difficulty slider — a parallel build with a smaller feature set.
- **DR-08-5 —** 180 goals that scaffold without gating; completing them does not stop play [1][2].
- **DR-08-6 —** Mid-game verb-unlocks change the *geometry*, not the input set [1][2].

### A.3 THE CAUSE

Alto is auto-run, so forward motion is free and the player can never stall — the exact problem FR-12 and FR-13 exist to solve. Alto's answer is not a second clock but a **conversion of distance into danger**: nothing threatens the player for the first two kilometres — long enough to learn the controls and establish the run as *earned* — and only then does the desert chase. Because the pursuer cannot be fought or waited out (DR-08-2), the game must spend a resource the player already has: speed, which only the trick system produces (DR-08-3). Anti-stasis pressure and score become one mechanism, so the game never has to threaten a player who is doing well or punish one who is learning. That is why it reads as relaxing: **the threat is real, legible, entirely self-inflicted, and arrives late enough that the player has already decided the game is fair.** Zen Mode (DR-08-4) is the same insight as a product decision — if the chase is the only thing creating tension, remove the chase and the scoring, and what remains is a competent toy for players who want the aesthetic without the tension.

### A.4 TRANSFERABILITY (static HTML/JS/2D-canvas, no server, no SDK)

| Req | Rating | Reason |
|---|---|---|
| DR-08-1 distance-gated pursuer | **Easy** | One integer threshold and an arm flag; it *replaces* the FR-13 idle timer rather than adding to it. |
| DR-08-2 no defensive verb | **Easy** | A constraint, not a system — implement it by not implementing anything. |
| DR-08-3 style→escape | **Moderate** | Needs dossier 07's grind/streak meter wired to pursuer distance, not to score. |
| DR-08-4 Zen Mode | **Easy** | A `zen: true` flag hiding the HUD and disabling two subsystems. Cheapest identity here. |
| DR-08-5 goal scaffolding | **Moderate** | Counters trivial; authoring goals that *teach* without gating is the work. |
| DR-08-6 geometry unlocks | **Hard** | Wall riding needs vertical terrain a lane hopper lacks. Take the pattern, not the object. |

### A.5 Conflicts

- **FR-04** — see §5. Same diagnosis as dossier 07: Alto is rejected as a *locomotion* model and mined only for its pressure system.
- **FR-13 / FR-12** — **directly contradicted; amend.** Alto's anti-stasis mechanism is better for a new player: gate on distance, not idleness. Both stay right in principle; their *trigger* is the weak part.
- **FR-15** — validated. The lemur is a visible, telegraphed pursuer.
- **FR-05** — strongly validated. No hard level end at any point [1][2].
- **FR-35** — a premium, zero-IAP, zero-ad precedent for anti-pay-to-win, seconded by dossier 07.
- **FR-40** — offline, but uses iCloud sync, so "no account" is **not** satisfied. Do not cite it for that.
- **FR-16** — the store claims characters have "attributes and abilities" [1][2] but publishes no ability sheet. **Not evidenced**; the Sumara "no lemur chase" claim is community-only [4]. Do not build FR-16 on this title.

---

## B. Paper.io (2016, Voodoo)

### B.1 VERIFIED MECHANICS

- **iOS release 4 Nov 2016, free, Voodoo (id 1171814682)**, 4.49★ / 156,462 ratings, 12+ [8]. Android followed as `io.voodoo.paper2`.
- **The trail as a liability, in the developer's own words** — the single most important sentence in this dossier: *"But be careful! You have a **weak spot: your tail**. If an enemy touches it, that's the end for you."* [8]
- **Scoring is territory, not distance:** *"Your goal? To conquer as much territory as possible"*; *"victory in Paper.io is never certain until you possess all the territory"* [8].
- **The 2016 build is offline:** *"doesn't require an Internet connection."* Opponents are therefore AI [8].
- **Lineage stated by the publisher:** *"inspired by io type games (made popular by agar.io)"* [8].
- **Paper.io 2 (9 Aug 2018)** adds the online loop and the retention copy: *"Online multiplayer you can jump into in seconds"* · *"**Quick matches that fit into any break**"* · *"100+ unique skins to collect"* · *"Free rewards every day"* · *"A secret surprise if you manage to capture the entire map"* [9]. 4.55★ / 2,886,870 ratings — an order of magnitude more reviewed than the original [9]. Voodoo's page: *"Outsmart your opponents, conquer all countries and rule the world!"* [10]
- **Scale:** Paper.io (2016) is credited as Voodoo's *"first successful hyper-casual game… with 83M+ downloads"* [11]. Third-party estimate, not a company filing.
- **UNVERIFIED — the "two-minute session".** No primary or approved-secondary source states a match length; the figure circulates only on SEO review sites excluded from this brief. What *is* primary is the design intent — *"Quick matches that fit into any break"* [9] — which establishes short-session design without a number. **Do not spec 120 seconds on this evidence.**

### B.2 DISTINCTIVE REQUIREMENTS

- **DR-08-7 —** The trail is a **liability, never a score**. It contributes nothing until it is closed, and closing it is what converts it to territory. The same object is cost and reward depending on one state flag.
- **DR-08-8 —** Progress and exposure are the same axis. Every tile of claimed territory is converted *out* of the open; every tile of open ground is space you must cross with a live trail. There is no safe expansion — the win condition and the danger condition advance together.
- **DR-08-9 —** Death is a **contact event with a visible, previously-drawn cause**, not a timer. The player is always killed by a line they can see.
- **DR-08-10 —** Session length is a designed retention unit, stated as a product feature: quick matches, daily rewards, 100+ skins [9].
- **DR-08-11 —** The drop-in is the whole onboarding: *"jump into in seconds"* [9] — no lobby, no party, no tutorial, and the player population is the content.

### B.3 THE CAUSE

Territory scoring creates a trap every competitor must have faced: the score you have is the safe ground you stand on, and the score you do not have is the only place you can go. Paper.io resolves it by making the movement itself cost something (DR-08-7) — moving draws a line an opponent can touch to end the run [8]. This converts a *conquest* game into an *exposure* game, and that inversion is the whole design. Optimal play is not maximal expansion but calibrated exposure: go far enough to claim, return early enough to survive. The player constantly chooses a risk they fully understand, and the tension is self-authored (DR-08-9). The short match (DR-08-10) makes that a loop rather than a campaign: a decision that takes thirty seconds to make must be made again in thirty, or the session ends. **Paper.io's lesson is that a score which is also a liability produces engagement without difficulty, because the player generates the pressure and can always see it coming.**

### B.4 TRANSFERABILITY (static HTML/JS/2D-canvas, no server, no SDK)

| Req | Rating | Reason |
|---|---|---|
| DR-08-7 trail as liability | **Easy** | A boolean `exposed` per tile plus a stamp call on each move; no geometry, no simulation. |
| DR-08-8 progress↔exposure coupling | **Easy** | A second grid tracking claimed tiles; both are arrays. |
| DR-08-9 contact death | **Easy** | Point-in-grid test — but it must respect FR-27's tight airborne window. |
| DR-08-10 short-session loop | **Easy** | A timer and instant restart; FR-29 already pays for it. |
| DR-08-11 drop-in / real population | **Hard** | The mechanic is instant-play; the *content* is other humans. Offline it needs AI opponents — real work. |

### B.5 Conflicts

- **FR-03** — validated in spirit, violated in form: Paper.io scores *enclosure*, not forward movement. Score and progress are decoupled.
- **FR-05** — near-true: matches end by death or total conquest, but there is no end to *the game*.
- **FR-19 / FR-34** — validated. Contact is instant and total.
- **FR-24** — relevant and violated: an arena that traps the player inside their own trail is unpassable. Any hopper borrowing DR-08-7 needs a solvability guarantee for its exposed state, which FR-24 already supplies for lanes.
- **FR-40** — the 2016 build is fully offline [8]; only Paper.io 2 needs a connection. A useful precedent.
- **FR-12 / FR-13** — *not* evidenced. Paper.io denies stasis differently: your own trail is the clock. Idle, and your zone does not grow while rivals do.
- **The multiplayer half is out of scope by infrastructure**, not by merit — the same exclusion the spec already applies to online leaderboards.

---

## 5. Resolving the FR-04 conflict — and correcting the premise

The brief states that **both** titles are auto-run. **Only Alto's Odyssey is.** Paper.io is *continuously steered* — the player holds continuous heading authority over a moving avatar, violating FR-04 far more directly than Alto. The two failures are different and need different answers.

1. **Continuous world motion is not what FR-04 bans** — it constrains the *player's* control, not the backdrop. Dossier 07's reasoning holds.
2. **Alto's violation is the absence of locomotion authority**: the player never chooses *when* to advance. Adopt its consequences, not its cause — dossier 07 §5's **hold-to-grind** (committed, non-cancellable, rail-bound) is the answer. FR-02 stands.
3. **Paper.io's violation is direct** — continuous heading authority, correctable mid-move. Nothing there transfers, and "let the player steer to close a loop" would destroy FR-02, FR-04 and FR-25 at once.
4. **What transfers is Paper.io's state model, not its control scheme.** Re-express DR-08-7 in lane terms: a hop leaves the tile behind it **marked and vulnerable** for as long as the grind is held. Grind duration is the exposure window; landing closes it and converts marked tiles into a claimed run, exactly as a closed loop converts trail into territory.
5. **A stationary player is then caught two ways** — pursuer behind, unfinished exposure ahead. The spec's first structural pattern is satisfied twice, by independent systems, neither needing a network.
6. **Cost:** the largest single structural addition across all eight dossiers; sequence it *after* the FR-01–FR-30 loop feels right. **Net: FR-04 stands, unamended.** Both titles are rejected as *locomotion* models — Alto gives a pressure system, Paper.io a state model.

---

## 6. Harvest list — ranked

1. **DR-08-1 + DR-08-2 + DR-08-3 — gate the pursuer on distance, deny it every defensive verb, let the player's own skill buy the exit** [1][2]. Top item: the only mechanism here that *replaces* FR-12/FR-13 rather than piling on, and it makes the first two kilometres a guaranteed-safe tutorial at no extra code.
2. **DR-08-7 + DR-08-8 — the trail as liability, re-expressed as an exposure window on the grind** [8], ported in §5. The only mechanic here that adds a real second decision to a game whose sole current decision is which of three lanes is lethal — and it reuses a verb FR-04 already requires.
3. **DR-08-4 — Zen Mode.** A flag hiding the HUD and disabling score, coins and power-ups, with its own soundtrack [1][2]. Zero new mechanics, a second product-shaped reason to open the game.
4. **DR-08-5 + DR-08-10 — goals and a bounded session as the reason to return.** Alto's 180 gating-free goals [1] and *"quick matches that fit into any break"* [9] are one structure: a reason to return that neither gates nor extends play.
5. **DR-08-9 — death by a visible cause, and nothing else.** A hopper killed by a line it drew three seconds ago fails FR-26's fairness test exactly as a car hitbox does. Budget it in FR-15 from the start.

---

## 7. Sources

[1] Snowman / Team Alto, *Alto's Odyssey* **Press Kit** (publisher's own) — https://altosodyssey.com/press/ — features, 180 goals, Zen Mode wording, wall riding, lemurs, 22 Feb 2018 iOS date, credits
[2] Apple App Store, *Alto's Odyssey* (Snowman), id 1182456409, via the iTunes Lookup API — https://itunes.apple.com/lookup?id=1182456409&entity=software&country=us — $4.99, premium/no-IAP copy, full feature list, 4.43★/2,967, Apple Design Award
[3] iMore, "Alto's Odyssey Tips & Tricks: Escape Lemurs, Ride Walls Over Chasms", Serenity Caldwell, 22 Feb 2018 — https://www.imore.com/altos-odyssey-tips-and-tricks-help-you-escape-lemurs-ride-walls-over-chasms-and-more — **headline, date, author and grindable-object list verified from the page and its metadata; the article body fell inside a truncated fetch and was not read in full**
[4] Alto's Odyssey Wiki (Fandom), "Lemur" — https://altosodyssey.fandom.com/wiki/Lemur — *community source; used only for the "chase ends at a chasm" rule and the 2,600 m interval*
[5] Alto's Adventure Wiki (Fandom), "Lemur" — https://altosadventure.fandom.com/wiki/Lemur — *community source; near-identical text to [4], which may be copy-paste between mirrors — treat the Adventure/Odyssey attribution as unsettled*
[6] AndroidGuys, "Not all endless games are shallow", 22 Feb 2018, https://www.androidguys.com/2018/02/22/alto-odyssey-game-review — **DEAD (HTTP 404) and never archived by the Wayback Machine (verified 29 Sep 2026). The base spec's citation [24] for "Alto never loses speed" is unusable**
[7] MobileSyrup, "Alto's Odyssey Review: Amplifying the endless runner", Patrick O'Rourke, 22 Feb 2018 — https://mobilesyrup.com/2018/02/22/altos-odyssey-review/ — fetched; title/date/author/677-word count confirmed, body truncated. The base spec's "no hard level end" citation [23] is **not verifiable from this fetch**; the claim is instead supported by the press kit and store listing, which contain no completion state at all
[8] Apple App Store, *Paper.io* (Voodoo), id 1171814682, via the iTunes Lookup API — https://itunes.apple.com/search?term=paper.io&entity=software&country=us — 4 Nov 2016 date, the "weak spot: your tail" copy, "doesn't require an Internet connection", agar.io lineage, 4.49★/156,462
[9] Apple App Store, *Paper.io 2* (Voodoo), id 1423046460, same lookup — "Online multiplayer you can jump into in seconds", "Quick matches that fit into any break", 100+ skins, daily rewards, 9 Aug 2018, 4.55★/2,886,870
[10] Voodoo, *Paper.io 2* product page — https://voodoo.io/paper2 — "Outsmart your opponents, conquer all countries and rule the world!"
[11] Sacra, "Voodoo revenue, valuation & funding" — https://sacra.com/c/voodoo/ — Paper.io (2016) as Voodoo's first successful hyper-casual title, 83M+ downloads. *Third-party estimate, not a company filing*
[12] Wikipedia, "Alto's Odyssey" / "Paper.io" — **unreachable: HTTP 429 from both `en.wikipedia.org/w/` and `?action=raw`, 29 Sep 2026. No claim in this dossier depends on it**

**Notes for the parent.** (a) FR-12/FR-13's *trigger condition* is the weakest clause in the spec; Alto offers a better one — amend or cite DR-08-1. (b) Base-spec reference [24] is a dead link with no archive; "Alto never loses speed" needs a new source or should be restated as design intent. (c) Reference [23] is fetchable but not extractable; "no hard level end" is better supported by the press kit. (d) Paper.io's multiplayer contribution belongs to the 2018 sequel, not the 2016 title in the table. (e) Dossier 07's FR-16 flag stands — this dossier does not rescue it.
