# Dossier 07 — Sonic Dash & Alto's Adventure: the licensed-run economy and the style-as-fuel loop

**Method note.** No `web_search` tool was available; research used DuckDuckGo Lite plus `web_fetch`. **Wikipedia was unreachable** (HTTP 429), so two claims survive at snippet level only. The load-bearing sources are the developers' own material: Snowman's press sheet [2], Alto's support page [4], and a 2013 interview with Sonic Dash's developers [6].

**Two corrections first.** Sonic Dash is **2013, by Hardlight** (SEGA's Leamington Spa studio) — not 2015, not Halfbrick; the base spec's table row repeats the error and should be amended [1][6][7][13]. And **wall riding is not in Alto's Adventure** — it is an *Odyssey* (2018) feature named in that game's own copy. Adventure grinds rooftops and jumps chasms [2][3].

---

## A. Sonic Dash (2013, Hardlight / SEGA)

### A.1 VERIFIED MECHANICS

- **Released 7 Mar 2013, iOS.** Free, ad-supported; publisher boilerplate: *"in-app purchases are not required to progress. Ad-free play is available with an in-app purchase"* [1]. 4.68 stars, 418,067 ratings, current build 10.4.0 [1].
- **Swipe-only endless runner:** the player *"controls Sonic (or other unlockable characters such as Tails or Knuckles) by swiping left and right as he continuously runs forward"* [7]. Three directions, no analog axis, no braking.
- **Rings are the in-run currency and persist** — *"Collect rings, power-ups, boosters, and rewards"* [1].
- **Missions sit over the endless core:** *"Blitz events and special seasonal challenges… Compete in daily missions, complete exciting objectives, and discover new adventures every week"* [1].
- **The boss reuses the base verbs verbatim.** SEGA's release: *"Zazz… uses a flying mech. Players will need to swipe left and right to avoid his projectiles, or swipe up to jump over them"* [5]. No new input taught, and it can end the run — *"his relentless pursuit of Sonic could be the end of your perfect run"* [5].
- **A community-wide collection bar:** *"Players across the globe must work together to collect a set number of character cards… When enough have been collected by the whole community, those who took part will receive exclusive Sonic Lost World themed prizes"* [5].
- **Rarity tiers:** *"Common, Rare, Epic and [Legendary]"*; updates ship one Legendary — *"New legendary character: Bloodmoon Werehog"* [1][8].
- **Scale:** *"celebrating 500 million downloads globally"* (PocketGamer, 17 Sep 2021) [9]; *"over 100 million downloads"* by Jun 2015 [6].
- **UNVERIFIED — the "four at launch, 140 by 2026" roster count** [8]: community wiki, no primary source. Do not design against it.
- **UNVERIFIED — that characters change mechanics.** The store says *"unique powers and abilities"* [1], but no ability sheet is published and the developers' own account points the other way (DR-07-6).

### A.2 DISTINCTIVE REQUIREMENTS

- **DR-07-1 —** One in-run currency, spent on the roster, which is the entire sink [1].
- **DR-07-2 —** Missions are the *replay reason*, not a play mode: the run is undirected, the meta supplies direction [1].
- **DR-07-3 —** Rarity tiers plus time-limited licensed drops *are* the content calendar [1].
- **DR-07-4 —** A set-piece exception must reuse the base control set exactly [5]. The cheapest variety available.
- **DR-07-5 —** A community-global progress bar with individual credit: the unlock fires on an aggregate count, only participants are paid [5].
- **DR-07-6 —** The roster is chosen by demand, and the licence is the cause. On record: *"Past the most essential choices (Sonic, Knuckles, Amy)… ultimately we look at what fans are asking for from previous titles, what we feel will map well to the game & finally, where we have the data, we look at how much characters are played in more recent titles to gauge where we should spend our effort"*; and *"in all aspects of sign off about any Sonic content we check with Sonic Team… it's their IP!"* [6]

### A.3 THE CAUSE

DR-07-6 explains the other five. Because the licensor holds sign-off, roster membership becomes a *licensing* decision, and the studio's stated inputs — fan requests and character-usage data — do not measure mechanical distinctiveness. The cascade: characters arrive as collectibles, so they need a currency (DR-07-1), a rarity ladder and a release cadence (DR-07-3). The same clause removes the incentive to build a different control profile per character, which is why the one place the game *does* escalate — the boss — reuses the same three swipes (DR-07-4). **A licensed roster reliably becomes a collection layer rather than a mechanical one, because the licence, not the designer, decides who is in it.** The zones show the same hand: *"We'd always lean towards using places from the Sonic Universe already in existence… it just makes sense"* [6].

### A.4 TRANSFERABILITY (static HTML/JS/2D-canvas, no server, no SDK)

| Req | Rating | Reason |
|---|---|---|
| DR-07-1 ring economy | **Easy** | One integer, one `localStorage` key, one unlock table. |
| DR-07-2 mission layer | **Moderate** | Counters are trivial; authoring 30 *interesting* goals is the work. |
| DR-07-3 rarity + calendar | **Easy** | Four tiers and a date gate — copy the tiering, not the licensed names. |
| DR-07-4 boss reuses verbs | **Moderate** | One timed encounter on existing hitboxes, but it needs an FR-15 telegraph. |
| DR-07-5 global bar | **Hard** | Mechanic trivial, population not; offline it degenerates to a personal bar. |

### A.5 Conflicts

- **FR-19 / FR-34** — validated. Crash ends the run; no lives, no continue.
- **FR-35** — SEGA stating *"in-app purchases are not required to progress"* in writing is a **licensed-publisher precedent for zero-gate progression**. Cite it.
- **FR-16** — *not* evidenced here; justify it from another title.
- **FR-33** — near-true, but the roster is a large permanent content investment. Budget it as content, not cosmetics.

---

## B. Alto's Adventure (2015, Snowman / Team Alto)

### B.1 VERIFIED MECHANICS

- **Released 19 Feb 2015, iOS, at $2.99 — premium, not F2P** — and *"reaching #1 in the Top Paid charts worldwide"* [2]. *"a premium game with no ads or in-app purchases"* [3]. The most important commercial fact in this dossier.
- **Auto-run horizontal; tap to jump, hold to trick.** *"The player-character automatically moves to the right of the screen through procedurally generated landscapes. The player taps the screen to jump and perform tricks (backflips)"* [13, snippet]. Official line: *"Easy to learn, difficult to master one button trick system"* [2][3].
- **Tricks convert directly into speed — stated by the developer.** *"chain together increasingly more elaborate trick combos to **maximize the players speed** and compete for high scores and distances"* [2]; *"Chain together combos to maximize points and speed"* [3]. And the consequence, from the official tips: *"It's vital that you practice chaining lots of tricks together to keep up your speed. **More speed = more air time!**"* [4]
- **Character attributes change the trick economy, not the controls:** *"one of six characters… each with their own unique attributes and abilities suited to different styles of play"* [2]. Concretely: *"make sure you're playing as Maya – she flips much faster than the other players"* [4]. **UNVERIFIED:** Maya's unlock level (community says 11); the combo **multiplier formula** (community only).
- **180 handcrafted goals as scaffolding:** *"As players progress through 180 handcrafted goals, they'll rescue runaway llamas, grind along village rooftops, leap over terrifying chasms and outwit the mountain elders"* [2][3]. Remastered (2022) adds a seventh character and 20 goals → *"195+ handcrafted goals"* [12].
- **Day/night and weather as a free content calendar:** *"braving the ever changing elements and passage of time upon the mountain"* [3]; *"thunderstorms, blizzards, fog, rainbows, shooting stars"* [2]. Corroborated by the developer's asset names `a03_Sunrise.png`, `a05_Night.png`, `b08_ForestDawn.png` [2][11].
- **Verb-unlocks change geometry, not input:** *"Before long players will also acquire the legendary Wingsuit… string together even longer trick combinations"* [2]. **Not in the 2015 launch build.**
- **Craft scale:** Jan 2013 to Feb 2015 — *"spending over 2 years carefully crafting every last detail"* [2]. Nesbitt was sole artist and developer: all programming, art, animation, 2D/3D assets, UI/UX [11].

### B.2 DISTINCTIVE REQUIREMENTS

- **DR-07-7 —** One pointer, one gesture, two depths: a tap jumps, a held tap spins. Nothing added, nothing removed [2][4].
- **DR-07-8 —** Style output *is* the survival resource. Tricks do not score beside speed; they are speed [2][4].
- **DR-07-9 —** Hand-authored goal lists scaffold play without gating it [2].
- **DR-07-10 —** Character differentiation lands on the resource economy, not the controls [4].
- **DR-07-11 —** A day/night and weather cycle is a zero-code content calendar [2][3].
- **DR-07-12 —** Mid-game verbs change the geometry, not the input [2].

### B.3 THE CAUSE

Auto-run makes forward motion free, so attention is the only scarce resource. A game that can only move forward needs a secondary axis to reward attention, and Alto makes that axis **feed the primary one**: tricks raise speed, speed raises air time, air time raises the next trick's ceiling [2][4]. Looking good and staying alive are therefore the same action — there is no reason to play safe. The risk is self-imposed, for a reason the player understands, which is why the game reads as relaxing rather than dull. The goals (DR-07-9) exist because unconstrained auto-run gives no reason to master anything: the list supplies aspiration, the wingsuit (DR-07-12) a new shape to aspire into, the cycle (DR-07-11) free novelty. None of it gates play [2][3].

### B.4 TRANSFERABILITY

| Req | Rating | Reason |
|---|---|---|
| DR-07-7 tap/hold duality | **Easy** | One `pointerdown`/`pointerup` pair; hold > threshold sets `spinning`. |
| DR-07-8 trick→speed | **Moderate** | Small accumulator, but tuning is the design — speed must never cross into unfair (FR-26). |
| DR-07-9 goal scaffolding | **Moderate** | Data is easy; authoring goals that teach without gating is the work. |
| DR-07-10 attribute differentiation | **Easy** | A per-character multiplier object plus a stat card — FR-39 by construction. |
| DR-07-11 day/night | **Easy** | A colour ramp over a timer; no new assets, and the screenshot changes for free. |
| DR-07-12 wingsuit | **Hard** | Needs vertical terrain a lane hopper lacks. Take the pattern, not the object. |

### B.5 Conflicts

- **FR-04** — see §5. Resolvable without amending the spec.
- **FR-23** — Alto scales on *distance*, not score [3] (*"best high score, best distance, and best trick combo"*). Two legible axes.
- **FR-40** — offline-playable, but it uses iCloud sync, so "no account" is **not** satisfied. Do not cite it for that.
- **FR-33** — premium, no IAP whatsoever [3]: a strong precedent for the anti-pay-to-win rule.
- **FR-22** — terrain is *"procedurally generated… based on real-world snowboarding"* [2]: weighted continuity, not a lane list. FR-24 has no analogue here.

---

## 5. Resolving the FR-04 conflict (auto-run vs. manual discrete hopping)

FR-04: *"Movement is discrete, with no analog steering and no mid-hop correction."* Alto appears to fail it. The precise diagnosis:

1. **Continuous world motion is not what FR-04 bans.** It constrains the *player's* control, not the backdrop — the reasoning dossier 06 used for Subway Surfers.
2. **Alto's real violation is the absence of locomotion authority, not its smoothness.** The player never chooses *when* to advance and cannot cancel a jump. Adopt the *consequences* of auto-run, not its cause.
3. **The hopper has no air time, so a backflip has no direct form.** The transferable object is the **conversion** in DR-07-8: a committed action the player initiates, cannot abort, and which pays out into a resource the game then spends.
4. **Resolution: the grind.** A **hold-to-grind** runs the player automatically across a contiguous span of tiles on a fixed line — a rail, a log, a freight-car roof. It is the exact structural twin of a backflip: entered by holding, non-cancellable once begun, ending at a defined tile. It is *not* a longer hop, so **FR-02 stands**; it is a distinct second verb, which is why it is the correct donor and a multi-lane dash would not be.
5. **The conversion, restated for lanes:** chained grinds charge a **streak meter**, spent by the *game* as a forward camera-creep grace period — buying distance before FR-12's pressure resumes. Style pays for time: Alto's inversion, and a re-affirmation of FR-12/FR-13 rather than a replacement.
6. **Cost, honestly:** this is the largest structural addition the dossier proposes, and the only one that raises decision density in a game whose sole other decision is which of three lanes is currently lethal. Sequence it after the FR-01–FR-30 loop feels right.**Net: FR-04 stands, unamended.** Alto is rejected as a *locomotion* model and mined only for DR-07-7, DR-07-8 and DR-07-9.

---

## 6. Harvest list — ranked

1. **DR-07-8 — trick execution converted into speed, so style and survival are the same objective** [2][4]. The top item: the only mechanic here that *removes* a decision rather than adding one — exactly what a one-tap game with an obvious death needs.
2. **DR-07-2 + DR-07-9 — mission lists as scaffolding over an unguided core.** Sonic Dash's daily missions [1] and Alto's 180 goals [2] are the same structure from opposite commercial poles (ad-funded F2P, premium no-IAP). Neither gates play. This is the genre's answer to "what does a returning player look at".
3. **DR-07-5 — a community-global collection bar.** Players pool progress; only participants are paid [5]. Offline it degenerates to a personal bar, so harvest the *shape* — a visible shared counter that resets — not the network.
4. **DR-07-6 — the governance lesson, not the mechanic.** Thirteen years of updates produced a collection layer, not a control layer, because the licence decided the roster [6]. Negative and load-bearing: **if the roster will not change the mechanics, do not spend the content budget pretending it will.** Give it one genuinely different control profile (FR-16) and cut the ladder to three.
5. **DR-07-11 — the day/night and weather cycle.** A colour ramp and a timer: zero new mechanics, permanently fresh screenshots, the cheapest identity available to a 2D-canvas build.---

## 7. Sources

[1] Apple App Store, *Sonic Dash Run* (SEGA), id 582654048, via the iTunes Lookup API — https://itunes.apple.com/lookup?id=582654048&entity=software&country=us
[2] Snowman, *Alto's Adventure* press kit (publisher's own press sheet) — https://www.builtbysnowman.com/press/sheet.php?p=altos_adventure
[3] Apple App Store, *Alto's Adventure* (Snowman), id 950812012, via the iTunes Lookup API — https://itunes.apple.com/lookup?id=950812012&entity=software&country=us
[4] Alto's Adventure official support page, "Landing a triple backflip in Alto's Adventure" — https://altosadventure.com/support/triple_backflips.html
[5] Engadget, "Sonic Dash gets first-ever boss battle to celebrate Sonic: Lost World", 3 Nov 2013, reproducing the full SEGA/Hardlight press release — https://www.engadget.com/2013-11-03-sonic-dash-gets-first-ever-boss-battle-to-celebrate-sonic-lost.html
[6] SEGAbits, "Hardlight Studios talks to us about Sonic Dash…", 18 Mar 2013 — interview with Chris Southall (CTO) and James Booth — https://segabits.com/blog/2013/03/18/hardlight-studios-talks-to-us-about-sonic-dash-their-canceled-vita-game-and-much-more/
[7] MobyGames, *Sonic Dash* (2013) — https://www.mobygames.com/game/62872/sonic-dash/ (Cloudflare-gated; snippet-level only)
[8] Sonic Wiki Zone (community), "Characters in Sonic Dash" — https://sonic.fandom.com/wiki/Characters_in_Sonic_Dash — *community source; used only for the rarity-tier structure, which official release notes corroborate*
[9] PocketGamer, "…celebrating 500 million downloads globally", C. Dellosa, 17 Sep 2021 — headline and date from the site's own structured data at https://www.pocketgamer.com/sonic-dash/ ; body not fetched
[10] PocketGamer, "Sonic Dash Review", H. Slater, 7 Mar 2013 (7/10 per the site's Review schema) — https://www.pocketgamer.com/sonic-dash/review/
[11] Harry Nesbitt (developer & artist), *Alto's Adventure* project page — http://www.harrynesbitt.com/games/altos-adventure/
[12] Apple App Store, *Alto's Adventure — Remastered* (Snowman), id 1576663233, via the iTunes Lookup API (195+ goals, seventh character)
[13] Wikipedia, "Sonic Dash" / "Alto's Adventure" — **snippet-level only**; `en.wikipedia.org` returned HTTP 429 throughout. Used for 2013/Hardlight/Sega attribution and AA's auto-run tap-to-jump-and-backflip description. No claim rests on Wikipedia alone.

**Notes for the parent.** (a) The base spec's comparable-titles row for Sonic Dash carries the wrong year and omits Hardlight — worth a one-line amendment. (b) FR-16 currently leans on a title that does not support it; dossier 01 or 04 may be the correct citation. (c) The 500M figure is press-grade via PocketGamer's metadata, not a SEGA filing.
