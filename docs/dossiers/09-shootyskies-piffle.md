# Dossier 09 — Shooty Skies & Piffle: what one movement core does *not* cover

**Method note.** No `web_search` tool; research used `web_fetch`, the iTunes Lookup API, DuckDuckGo/Brave (both blocked), archived store listings, developer sites, PocketGamer, and Wikipedia via `action=raw` (DuckDuckGo and Brave were blocked). One **screenshot was read directly as evidence** [14].

**Four corrections first. Two refute this dossier's own brief.**

1. **Shooty Skies is Mighty Games, not Hipster Whale.** The base spec says Hipster Whale. Wrong: the seller is *Mighty Games Group Pty Ltd* [3], Wikipedia says "created by Mighty Games" [10], the official site says "from Mighty Games" [15], and Shooty Skies is **absent from Hipster Whale's own catalogue** [12].
2. **Shooty Skies is not isometric; the Crossy Road grid does not carry over.** The brief assumes "isometric grid movement reused… whether the grid carries over unchanged". **Refuted by screenshot** [14]: a top-down oblique perspective over a receding plank pier, plane pinned low, enemies descending. No grid, no tile, no follow-camera. This inverts the shared-engine thesis (§C).
3. **Piffle has no paddles and no documented power-by-drag-length.** Store copy, 2018 and 2026 alike: *"Swipe or point with your finger to aim / Choose the best possible angle to shoot / Release to bounce around and break all the blocks"* [6][16]. **Angle only.** It is a ball-*breaker* — the ball is the avatar, blocks the only colliders [8]. The brief's paddle premise should be dropped outright.
4. **Same-device multiplayer is Crossy Road's, not Piffle's.** Crossy Road: *"**Same device multiplayer!** Challenge your friends and family on same-device multiplayer mode."* [13] Piffle says only *"Challenge your friends at any time"* [6] — no mode, no platform. **UNVERIFIED.**

## A. Shooty Skies (2015, Mighty Games)

### A.1 VERIFIED MECHANICS

- **iOS 29 Sep 2015, Android 6 Nov 2015, desktop 6 Mar 2018** [3][10]. Free, **Unity**, 12+, 4.65★/5,616, still shipping (v3.441, Sep 2026) [3]. Archival subtitle "**Endless Arcade Flyer**" [7] — a Mighty Games trademark, deliberately parallel to Hipster Whale's "**Endless Arcade Hopper**™" [12][15]. Lineage is arcade: Galaga, Space Invaders, 1942, Xevious, Raiden [10].
- **One finger, three phases** (per the reviewer who played it): holding the screen shoots, sliding the finger weaves, and powered attacks require that you *"**take your finger off the screen as long as you dare to power up**"* [2].
- **Bosses on a kill counter, not a clock:** a boss commences after a set number of kills — money-spitting bald eagle, axe-wielding giant beaver, disembodied mouth firing fast food [2].
- **33 characters, drawn, backdrop only.** 500 coins per draw or $0.99 IAP [2][10]. Verbatim: *"each character comes with their own backdrop… **The changing environments don't alter gameplay at all**"* [2]. Now *"over 200 daring pilots over 20 different terrains"* [7].
- **The daily mission has a player-chosen difficulty multiplier — the "Danger Scanner" (v2.306, 28 Nov 2017):** *"**Four intensity levels: Scouty, Skirmish, Shooty (Classic) and Screamy**… ease in or go in hot! Bonus Golden Tickets for higher Intensity-level Daily Missions."* [7]
- **A date-seeded daily shipped unwinnable.** v2.402, 10 Jan 2018: *"**Fix for impossible Daily Mission on January 2nd**"* [7]. Same changelog: *"Character Carousel fixes"* — the unlock menu is a *carousel*.
- **Death is purchasable out of, twice:** coins buy *"frequent **Continues** and the occasional upgraded weapon"*; weapons unlock for an hour via a single ad, and *"all weapons reset after an allotted time"* [2]. Verbatim 1★: *"The claw machine's got a terrible drop rate for new characters."* [2]

### A.2 DISTINCTIVE REQUIREMENTS

- **DR-09-1 —** Firing and aiming are **mutually exclusive**: holding fires, releasing charges. Power costs the thing power is for — a live gun. One finger, three states, zero buttons.
- **DR-09-2 —** Difficulty is a **player-chosen constant**, not a score function: four named tiers picked before the run, applying to the daily too [7].
- **DR-09-3 —** One shared daily seed, chosen multiplier. Everyone plays the identical 2 January mission at Scouty or Screamy [7]: comparison point preserved, skill bracket self-declared.
- **DR-09-4 —** A date-seeded generator is **not guaranteed solvable, and it failed in production** [7]. Strongest empirical evidence for FR-24.
- **DR-09-5 —** Escalation punctuated by bosses on a kill counter [2].
- **DR-09-6 —** Unlocks are a random draw behind a **named, visible machine** — the "claw machine", 500 coins [2]. Chance is the acquisition verb, shown as an object.
- **DR-09-7 —** Character roster is **pure presentation** [2].

### A.3 THE CAUSE

Shooty Skies reused two assets: **the art pipeline and the meta-shell** — blocky retro-electronics look, coin economy, carousel, 99¢ unlock, and above all **the principals**: it credits `@KlickTock`, Wikipedia's source for Matt Hall [15][11], while Hipster Whale's press kit says Hall and Sum *"co-direct"* Mighty Games with Matt Ditton and Ben Britten [1].

The movement core was not reused, for a mechanical reason. A dimetric grid exists to make a *tile-to-tile judgement* honest and fast; in a shooter the judgement is *continuous avoidance against projectiles*, and a tile grid quantises the dodge. **The ported engine was the content pipeline, not locomotion.**

### A.4 TRANSFERABILITY (static HTML/JS/2D-canvas, no server, no SDK)

- **DR-09-1 — Easy.** One `firing` boolean gating a charge accumulator.
- **DR-09-2 — Easy.** An integer on spawn density/speed, set once.
- **DR-09-3 — Easy.** A second multiplier on the FR-38 date-seeded PRNG.
- **DR-09-4 — Easy detect / Moderate prevent.** A solver pass over the lane list; prevention needs a constrained generator.
- **DR-09-5 — Moderate.** One counter, one entity, one scripted encounter.
- **DR-09-6 — Easy.** A weighted pick behind a visible machine; `localStorage` roster.
- **DR-09-7 — Easy.** A constraint: implement by not implementing stats.

### A.5 Conflicts

- **FR-01/02/04 — contradicted.** No grid, no hop, no discrete movement, no follow-camera [14]. Rejected as a *locomotion* model; only its pressure and meta systems are harvested.
- **FR-11/12 — contradicted.** The camera neither follows nor creeps; anti-stasis comes *entirely* from incoming projectiles. The pursuer **is** the bullet stream.
- **FR-16 — contradicted, and a warning.** Characters change nothing but the backdrop [2]. With dossier 08's Alto finding, two titles now show marketing says "variety" and play says "reskin". Consider demoting FR-16 to a stated aspiration.
- **FR-23 — contradicted, and a proposal.** A pre-chosen tier [7] serves FR-23's intent (never punish thinking) by moving difficulty out of the run entirely.
- **FR-06/29/30 — contradicted. Do not import.** Coins buy **Continues** [2]: the spec's own restart principle traded for revenue, and the likely reason 1★ reviews attack depth instead of difficulty. **FR-35 — partly violated:** the 99¢ character unlocks are cosmetic, so not pay-to-*win*; the Continue purchase is the problem.
- **FR-33/36 — rejected.** Random-draw acquisition is the opposite of FR-36's "a change the player can see during play".

## B. Piffle (2018, Hipster Whale with Mighty Games)

### B.1 VERIFIED MECHANICS

- **iOS 3 Oct 2018** [4], free, 4+, 4.83★/22,242 — *best-reviewed title here, still shipping* (v4.608, Jul 2026) [4]; Apple Arcade as **Piffle+** [4]; Switch [11]. Joint venture: *"Hipster Whale and developer Mighty Games"* [9]. Hipster Whale's copy: *"Collect an army of cute Piffle Balls to help you clear a mishmash of challenging blocks and obstacles."* [12]
- **Ball-breaker:** the ball **is** the avatar, which PocketGamer places in a "renaissance" of bouncing games alongside holedown [8]. **Aim is angle** [6]; **scoring is bounce count** — *"Bounce as many times as possible to make combos"* [6]. **Win condition is a quota**, not survival [8].
- **Ammo is finite per level and recovered by skill — the key mechanic:** you start with *"a small number of piffles"*, more are scattered among the blocks, and *"**Hit one and they'll join your squad, giving you more ammo for your next shot.**"* [8]
- **Block classes change rules, not just spacing:** some explode, some move, and some are *"cut off at different angles to try and throw your carefully aimed shots off"* [8].
- **Power-ups are mostly *information*:** sunglasses show where your shot will land, plus damage-up piffles, charge lights and bombs [8]. The flagship converts hidden state into visible trajectory.
- **Collectibles are crafted, not drawn:** *"these unique balls can be **crafted** and collected in order to add them to your ally roster"* [9]. Hipster Whale calls it *"an army"* [12] — the roster is **ammo**, not a wardrobe. **Levels, not endless:** *"hundreds of puzzle-filled levels"* [9].
- **The designer rates it below Crossy Road on stickiness, deliberately:** *"It might not have the staying power of Crossy Road… You jump in, progress a little, and then jump out."* [8] **Player-reported only:** clearing the space *"drops down 3 new rows of blocks"* [16].
- **UNVERIFIED — same-device multiplayer.** Only *"Challenge your friends at any time"* [6] — the documented same-device feature belongs to Crossy Road [13]. **Do not spec multiplayer from this.**
- **UNVERIFIED — power set by drag length**, and **UNVERIFIED/"refute" — paddle physics.** Primary source says angle only [6][16] and describes no paddle [6][8]. **Refute, do not soften.**

### B.2 DISTINCTIVE REQUIREMENTS

- **DR-09-8 —** Aim is a single pointer; release is the only commit. No analog steering, no fire button, no power axis [6].
- **DR-09-9 —** Ammo is a **depleting resource that skill replenishes** [8]. A shot spent on a pickup is a shot not spent on the quota — objective and economy compete for one currency.
- **DR-09-10 —** Clearing the board extends it, 3 new rows [16, anecdotal] — a level procedurally prevented from finishing, by success rather than threat.
- **DR-09-11 —** Collectibles are **crafted, not drawn** [9]. Deterministic production versus variable-ratio chance; the meta is a plan, not a gamble.
- **DR-09-12 —** The signature power-up **reveals the simulation** [8]. Cheapest fairness affordance: one overlay line.
- **DR-09-13 —** Per-level objects that alter rules, not just spacing [8].

### B.3 THE CAUSE

Piffle is the counterweight to everything Crossy Road is. A lane hopper has no scarcity — you cannot run out of hops, so pressure must be external. A ball-breaker has built-in scarcity: **the shot is the currency and the board is finite.** So Piffle needs no pursuer, no creeping camera, no idle timer: **the level ends when the ammo does.** DR-09-9 is the entire anti-stasis system, and it is a *resource* rather than a *threat* — which is why the game can be cozy and still bounded [12].

The trade is total. An endless run optimises for the restart loop; a finite-ammo puzzle optimises for the solved board, so Piffle declines Crossy Road's retention model [8]. DR-09-11 follows: if the meta is progression through authored levels, a random-draw machine would be chance *without progress*, so the roster had to become craftable. **Same two studios, opposite economy, opposite unlock verb — the sharpest evidence that the meta-shell is per-game content and the input philosophy is the shared core.**

### B.4 TRANSFERABILITY (static HTML/JS/2D-canvas, no server, no SDK)

- **DR-09-8 — Easy.** `pointerdown` records an angle, `pointerup` launches; no integration, no deadzone.
- **DR-09-9 — Easy.** An integer, a decrement, a pickup entity. Best value-per-line item here.
- **DR-09-10 — Moderate.** Three lines of row spawning, but needs a board model a lane hopper lacks.
- **DR-09-11 — Easy.** A recipe table and a deterministic RNG; no drop-rate tuning, no pity logic.
- **DR-09-12 — Easy.** Run the same integrator 40 steps, draw it. Turns a guess into a decision.
- **DR-09-13 — Moderate.** Each class is a small component, but the *set* is what feels authored.

### B.5 Conflicts

- **FR-05, FR-02/04 — contradicted.** Level-based with completion [6][9], and angle-and-launch rather than discrete movement. The genre's counter-example: bounded, completable, rated as such.
- **FR-12/13 — superseded; this is the headline.** No pursuer, no creeping camera; boundedness comes from finite ammo [8]. Spec structural pattern 1 is a claim about *endless* games; Piffle shows the other solution is to **not be endless** and bound the session with a resource.
- **FR-29/30 — validated by contrast.** A sub-one-second restart is meaningless when progress is a level. Keep them, but stop calling them genre-wide rather than endless-run-wide.
- **FR-33/36 — validated and improved.** Crafting satisfies FR-36 cleanly: the player watches a Piffle get made, then uses it. Contrast DR-09-6's claw machine, which satisfies neither.
- **FR-38 — not evidenced.** No daily challenge in the 2018 or 2026 copy [6][16]; that structure lives in Shooty Skies [7] and Crossy Road [13].
- **FR-40 — validated.** Free, no account language, local single-device by construction [6].

## C. The shared core: weaker than the brief assumes, and more useful

The brief's thesis — that a shared isometric movement core is "the strongest argument for what is portable" — **does not survive the evidence.** What is actually shared, at four confidence levels:

1. **The people (certain).** Matt Hall — `@KlickTock`, Wikipedia's source for Matt Hall [11] — is credited on Shooty Skies [15], and Hipster Whale's press kit states Hall and Sum *"co-direct"* Mighty Games with Matt Ditton and Ben Britten [1]. Shooty Skies is a **sister studio run by the same two founders**.
2. **The toolchain (certain).** Shooty Skies is Unity [10], and a shipped changelog item is a *Unity iPhone X detection bugfix* [7] — same engine, release cadence and device matrix as Crossy Road.
3. **The input philosophy (certain, and the most portable thing here).** Zero buttons, one finger, one gesture family across all three: tap+swipe [13], hold+drag+release [2], point+release [6].
4. **The meta-shell (certain).** Coin economy, carousel of collectibles, direct unlock at $0.99 [2][4][13].

**Not shared, and the most useful finding here: the projection is not shared.** Crossy Road's dimetric grid [13] and Shooty Skies' scrolling top-down perspective [14] cannot be the same code; Piffle is side-on and shares no geometry with either. The reusable unit is therefore **a shell — engine, input model, art pipeline, coin economy, carousel — wrapped around a per-game movement core and a per-game meta verb.** Piffle's crafted roster (DR-09-11) and Shooty Skies' claw machine (DR-09-6) are that shell filled with two opposite meta verbs, which is the brief's "per-game content" half, now evidenced rather than asserted.

For a new hopper: inherit the shell wholesale (1–4) and treat the movement core as the thing you must build and differentiate. Two threads for the spec's owner — correct the Shooty Skies studio credit to Mighty Games; and act on the FR-16 demotion noted in A.5.

---

## 6. HARVEST LIST (ranked)

1. **DR-09-9 — finite ammo, replenished by skill (Piffle)** [8]. Best anti-stasis system in any dossier so far and the cheapest: it replaces a pursuer, a camera creep and an idle timer with one integer and one pickup entity, and makes the shot itself the decision.
2. **DR-09-2 + DR-09-3 — one daily seed, player-chosen intensity (Shooty Skies)** [7]. Turns FR-38 from a gimmick into a skill-bracketed ladder, and moves difficulty outside the run, which is what FR-23 actually wants.
3. **DR-09-4 — the generator shipped an impossible daily and it was patched** [7]. Proof that FR-24 is the genre's hardest requirement, plus a ready-made test case.
4. **DR-09-12 — trajectory preview as flagship power-up (Piffle)** [8]. One function converts a guess into a decision without adding a rule.
5. **DR-09-11 — crafted, not drawn, collectibles (Piffle)** [9]. Deterministic production delivers the FR-36 "I can see what I earned" moment a random drop rate never will [2].

**Not harvested:** Shooty Skies' isometric premise (refuted), its coin-purchased Continues [2] (destroys FR-29/30), its cosmetic-only characters [2] (refutes FR-16), and Piffle's same-device multiplayer (UNVERIFIED; probably Crossy Road's [13]).

## 7. SOURCES

[1] Hipster Whale Press Kit (official, arch. 2016). https://web.archive.org/web/20160829204314/http://hipsterwhale.com/press
[2] TouchArcade, B. Broder, "'Shooty Skies' Review", 21 Oct 2015, 4★. https://web.archive.org/web/20170226130820/http://toucharcade.com/2015/10/21/shooty-skies-review/
[3] iTunes Lookup API, Shooty Skies id 962993853 (seller *Mighty Games Group Pty Ltd*). https://itunes.apple.com/lookup?id=962993853
[4] iTunes Lookup API, Piffle id 1350644300; Piffle+ id 6742088715. https://itunes.apple.com/lookup?id=1350644300
[5] Google Play, `com.mightygamesgroup.shootyskies`. https://play.google.com/store/apps/details?id=com.mightygamesgroup.shootyskies
[6] Google Play, `com.hipsterwhale.piffle`. https://play.google.com/store/apps/details?id=com.hipsterwhale.piffle
[7] App Store listing, Shooty Skies (arch. 2016–2018), incl. version history 2.306/2.402. https://web.archive.org/web/2016/http://itunes.apple.com/us/app/shooty-skies-endless-arcade/id962993853
[8] PocketGamer, H. Slater, "Piffle review", 4 Oct 2018, 7/10. https://www.pocketgamer.com/piffle/review/
[9] PocketGamer, C. Bald, "[Update] Quirky cat-filled-puzzler Piffle is available right now", 4 Oct 2018. https://www.pocketgamer.com/piffle/update-quirky-cat-filled-puzzler-piffle-is-available-right-now/
[10] Wikipedia, "Shooty Skies", `action=raw`. https://en.wikipedia.org/w/index.php?title=Shooty_Skies&action=raw
[11] Wikipedia, "Hipster Whale", `action=raw`. https://en.wikipedia.org/w/index.php?title=Hipster_Whale&action=raw
[12] Hipster Whale, official site (catalogue; Piffle copy; trademarks). https://hipsterwhale.com/
[13] App Store listing, Crossy Road id 924373886. https://apps.apple.com/us/app/crossy-road/id924373886
[14] TouchArcade in-game screenshot, Shooty Skies, Oct 2015 — **read directly as evidence**; archived image. https://web.archive.org/web/2017id_/http://cdn.toucharcade.com/wp-content/uploads/2015/10/shootyskies.jpeg
[15] shootyskies.com, official (credits; "Endless Arcade Flyer™"). https://www.shootyskies.com
[16] App Store listing, Piffle (arch. Jan 2019, v4.502). https://web.archive.org/web/20190101000000/http://itunes.apple.com/us/app/piffle/id1350644300
[17] App Store "More by HIPSTER WHALE" shelf (Castle), retrieved via the Piffle page, 29 Sep 2026. https://apps.apple.com/us/app/piffle/id1350644300
