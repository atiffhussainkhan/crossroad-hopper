# Dossier 04 — Flappy Bird & Jetpack Joyride: the one-button design language

**Method note.** No `web_search` tool was available; research used DuckDuckGo Lite plus direct `web_fetch`. **Wikipedia was unreachable** (HTTP 429 on `en.wikipedia.org` and `api.wikimedia.org`), so base-spec Wikipedia claims are not re-verified here. Facts confirmed only at snippet level are marked as such; varying figures are attributed, not resolved.

---

## A. Flappy Bird (2013, Dong Nguyen / .Gears)

### 1. VERIFIED MECHANICS

- **One input, one axis.** The player owns exactly one degree of freedom (vertical). Forward motion belongs to the game.
- **Score is a function of distance, gated by a discrete event.** A point is awarded only for a completed gate (one pipe pair), never for time survived.
- **The aperture is the whole design.** Pipes are paired, one ceiling-anchored and one floor-anchored, with a single fixed-width vertical opening. Pocket Gamer's formal definition of a Flappy clone (editor Mark Brown) states the shape vocabulary exactly: *"any game in which you guide some character through an obstacle course of pipes (or similar objects) hanging from the ceiling and sticking out of the ground"* [3]. That definition is itself evidence the geometry is the recognisable unit.
- **Removal: announced, then executed.** Nguyen gave a **22-hour** deadline and pulled the game from Apple's iOS store on Sunday 9 February 2014 [5]. BBC confirmed the same day-cycle (*"removed it from online stores on Sunday"*) [2].
- **Rationale: addiction, stated by the creator.** Forbes, 11 Feb 2014, Lan Anh Nguyen: the app is dead permanently — *"gone forever because it was an addictive product"* [4]. ABC News the same day: it was *"that type of addiction"* that influenced removal from **both** iOS and Android stores [6].
- **Downloads.** *"downloaded more than 50 million times"* — TIME [7]. **CONTESTED:** this is a floor, not a peak, and is frequently restated as a maximum. Treat as "50M+ at some point before February 2014".
- **Revenue.** *"an average of $50,000 per day in revenue generated from in-app ads, creator Dong Nguyen told The Verge"*, relayed by Polygon, 6 Feb 2014 [8]. **CONTESTED / partially UNVERIFIED:** self-reported to a single outlet, snippet-level confirmation only. Do not treat $50k/day as a solid number.
- **The clone flood — documented, not folklore.** PocketGamer.biz, Keith Andrew, 5 March 2014: *"An average of 60 new Flappy Bird clones roll out on the App Store every day … with 2.5 clones added every hour"*, derived from *"the last 300 Flappy Bird clones to have launched"* — i.e. **one clone every 24 minutes** [3]. The same piece notes it had been claimed Apple was clamping down, but *"Pocket Gamer's data suggests the Cupertino giant has either lost control, or is simply not enforcing any notable action."*

### 2. DISTINCTIVE REQUIREMENTS

- **DR-04-1** — Exactly one input surface, acting on exactly one axis. The player never steers forward.
- **DR-04-2** — Score = distance, awarded only on a completed binary gate.
- **DR-04-3** — Constant forward velocity + **fixed-width** vertical aperture. One control is meaningful only because the timeline is fixed and the target never changes size. The entire decision is *when to spend an impulse*.
- **DR-04-4** — One-hit death. No lives, no continues, no revive UI, no shield.
- **DR-04-5** — Death is a *state*, not a *screen*. Restart is one input, no menu.

### 3. THE CAUSE

Gravity is always pulling; the tap is the only brake. Because forward motion is constant and the aperture fixed, the game becomes a **rhythm** problem, not a **navigation** one — the player is not choosing a route, they are placing impulses on a metronome. DR-04-3 is load-bearing: strip the fixed aperture and DR-04-1 stops being elegant and starts being impoverished. The clone flood is double-edged — 60/day says the mechanic was *clean* enough for strangers to copy, and simultaneously that a single-mechanic game is not defensible by control scheme alone.

### 4. TRANSFERABILITY (static HTML/JS/2D-canvas, no server, no SDK)

| Req | Rating | One-line reason |
|---|---|---|
| DR-04-1 | **Easy** | One `pointerdown` listener and one velocity accumulator. |
| DR-04-2 | **Easy** | `score++` on a single AABB crossing test. |
| DR-04-3 | **Easy** | Two rects + one box-intersection per frame, both hard-coded. |
| DR-04-4 | **Easy** | One boolean. |
| DR-04-5 | **Easy** | `state = PLAYING` and re-seed. |

---

## B. Jetpack Joyride (2011, Halfbrick Studios)

### 1. VERIFIED MECHANICS

All of the following are quoted from Halfbrick's own developer blog, *"In-Depth: Jetpack Joyride Gadgets"*, 24 April 2012 [1] — a primary source.

- **One continuous input, two states:** hold = thrust, release = fall.
- **Asymmetry — DESCEND IS THE SLOW ONE.** This is verifiable from the developer blog without any secondary source. Halfbrick shipped the **Gravity Belt (5,000 Coins)**: *"Makes the ground come at you a lot faster than usual."* [1] A studio does not sell acceleration on the axis the player already dominates; it sells it on the axis the player lacks. In the default build, therefore, **fall rate < rise rate**. **The exact numeric ratio is UNVERIFIED** — no official figure was found this session. The design consequence is what matters: releasing is a *softer, more recoverable* commitment than holding.
- **The floor is lethal:** *"Insta-Ball (2,000 Coins) — Bounce off the floor instead of going splat."* [1]
- **At least two obstacle classes:** *"Air Barrys (3,500 Coins) — Leap gracefully over obstacles with these designer sneakers."* [1] If you can jump over some obstacles, the set contains both clearable-low and must-avoid items.
- **Contact has a cost even when survivable:** *"Freeze-O-Matic (3,000 Coins) — … snap-frozen in a solid block of ice. It also helps you slide a few extra meters."* [1]
- **The Stash.** Gadgets *"will be available for purchase in the Stash, giving more options to players stockpiling those hard-earned coins."* [1] Single in-run currency (coins); price band 2,000–6,500 Coins.
- **The gadget slot limit — exactly two.** *"Players can also mix and match **any two** gadgets, which can then be used an unlimited number of times after purchase."* [1] Loadout size 2; permanent once bought; unlimited-use, not consumable.
- **Progress gate.** 15 gadgets in v1.3 (free update, 26 April 2012), *"more than 100 potential combinations in total and players will need to work their way through **five sectors** in order to unlock every gadget"* [1].
- **The end-of-run machine is token-gated and purchasable.** Two of the fifteen gadgets are *nothing but* access to the death screen: *"Token Gift (5,000 Coins) — … A free final spin token, of course!"* and *"Lucky Last (5,500 Coins) — Your final spin token is forged from fortunium, the world's luckiest element."* [1]
- **UNVERIFIED — the multi-heart payout.** A community tips thread reports the final spin can return **1–3 revives** [10]. Not an official source. What *is* verified is the structure: a paid, token-gated, chance-based second chance presented on the death screen. The exact distribution is UNVERIFIED.

### 2. DISTINCTIVE REQUIREMENTS

- **DR-04-6** — Asymmetric one-button. Hold and release act on **different rates**, and the release is the gentle one.
- **DR-04-7** — Consumable pickups that change your **control surface**, not merely your hitbox. Vehicles provide *"a unique control scheme"* [1] and absorb impacts.
- **DR-04-8** — A fixed **two-slot** loadout, progress-gated, bought with one in-run currency, unlimited-use. Choice happens at the boundary, never mid-run.
- **DR-04-9** — The death screen is a **monetised gamble**: a spin token (earned or bought) resolves to a revive.
- **DR-04-10** — One of fifteen power-ups exists purely to **invert the control asymmetry** (Gravity Belt). The meta-layer is literally a tuning knob on the primary mechanic.

### 3. THE CAUSE

Jetpack Joyride has two death surfaces — a **floor** (instant, absolute) and **things in the air** (relative, dodgeable). Flappy Bird has one. Asymmetric rates let the player commit to a descent early and correct upward cheaply, turning the screen into continuous *negotiation* rather than binary gate-clearing. The Stash then sells **permission to re-negotiate**: gravity, freeze, bounce, dash. And the final spin converts a finished loss into a purchasable *variable* outcome — the direct ancestor of Crossy Road's randomised death banner (**FR-37**): same primitive, a chance-based second chance presented immediately, priced in a currency the player just earned or can buy.

### 4. TRANSFERABILITY

| Req | Rating | One-line reason |
|---|---|---|
| DR-04-6 | **Easy** | One boolean from key/pointer state feeding two constants. |
| DR-04-7 | **Moderate** | A control profile is one object swap, but you must *design* 2–3 genuinely distinct profiles, not just a stat delta. |
| DR-04-8 | **Easy** | A two-element array plus `localStorage`. |
| DR-04-9 | **Moderate** | Needs spin counter, payout table and free-spin clock; no server required, but the economy must be internally consistent or it self-exploits. |
| DR-04-10 | **Easy** | One multiplier on the gravity constant. |

---

## 5. CONFLICTS — single-input purity vs. FR-09 (hybrid tap + swipe)

**The tension.** Both games are single-input by design. FR-09 requires tap **and** swipe. If both gestures are live simultaneously, DR-04-1 collapses: a swipe becomes a second, faster, strictly-dominant impulse, and the game stops being about *when* to spend a flap and becomes about *which verb*.

**Resolution — split the verbs by PHASE, not by button.**

1. **Mid-run: tap is the only input that exists.** Swipes are swallowed (`preventDefault`, no handler). DR-04-1 and DR-04-3 stay byte-for-byte intact — the moment-to-moment game is exactly Flappy Bird / Jetpack Joyride.
2. **Swipe is admitted only where run integrity is not at stake:** the pre-run stance (choosing a lane or opening trajectory) and the death screen (swipe to spin, per DR-04-9 / FR-37). FR-09's swipe requirement is satisfied at the meta layer; FR-09's tap requirement is satisfied where it costs the player something.
3. **One handler, disambiguated by motion:** on `pointerdown` start a 150 ms / 12 px threshold — if the pointer travels >12 px before `pointerup` it is a swipe and the tap is suppressed. A tap with any travel is still a tap, which is what a hopping player expects.
4. This is the same structural move both source games make independently: **gesture for meta, tap for the run.** Crossy Road and Flappy Bird already share this split.

---

## 6. HARVEST LIST (ranked)

1. **DR-04-9 — the token-gated death spin.** Highest value by a wide margin. It is the verified ancestor of FR-37, and it costs roughly 40 lines: a slot-reel animation, a payout table, a spin counter in `localStorage`, a free-spin timer. It converts a dead run into a variable, shareable, monetisable moment — the single highest-leverage thing in either dossier.
2. **DR-04-6 — asymmetric hold/release rates.** Very cheap, and it is the difference between a "hold to go up" gimmick and a control scheme with a real skill ceiling. Start with descent ≈ 0.6–0.8 × rise; tune from feel, not from a cited source (the ratio is UNVERIFIED).
3. **DR-04-3 + DR-04-2 — constant velocity, fixed aperture, score-per-gate.** The lane-crossing genre already has the distance rule; the transferable delta is specifically the **fixed aperture width**, which is what makes a single input legible at speed.
4. **DR-04-7 — pickups that swap the control surface, not just the hitbox.** Two or three profiles is enough. This is where the lane-crossing genre is thinnest and the cheapest place to look original.
5. **DR-04-8 — two-slot, unlock-gated, unlimited-use loadout.** Cheap meta layer; build it last, after the run loop is proven.

---

## 7. SOURCES

All retrieved 2026-09-29.

1. **Halfbrick Studios (developer blog, primary).** "In-Depth: Jetpack Joyride Gadgets," 24 April 2012. https://www.halfbrick.com/blog/in-depth-jetpack-joyride-gadgets — *body text read in full.* Source for: 15 gadgets, 5 sectors, 100+ combinations, two-slot limit, unlimited-use-after-purchase, Stash, coin price band, Gravity Belt / Insta-Ball / Freeze-O-Matic / Air Barrys / Token Gift / Lucky Last descriptions.
2. **BBC News.** "Flappy Bird creator removes game from app stores," 10 February 2014. https://www.bbc.com/news/technology-26114364 — *headline and standfirst read; body largely client-rendered.* Source for: Vietnam-based creator; removal on Sunday; 50M+ downloads (image caption).
3. **PocketGamer.biz, Keith Andrew.** "60 new Flappy Bird clones hit the App Store every day," 5 March 2014. https://www.pocketgamer.biz/60-new-flappy-bird-clones-hit-the-app-store-every-day/ — *body text read in full.* Source for: 60 clones/day, 2.5/hour, 300-clone sample, 1-per-24-minutes, Mark Brown's clone definition, Apple non-enforcement finding.
4. **Forbes, Lan Anh Nguyen.** "Exclusive: Flappy Bird Creator Dong Nguyen Says App 'Gone Forever' Because It Was an Addictive Product," 11 February 2014. https://www.forbes.com/sites/lananhnguyen/2014/02/11/exclusive-flappy-bird-creator-dong-nguyen-says-app-gone-forever-because-it-was-an-addictive-product/ — **direct fetch blocked (Cloudflare); verified at snippet level via search index.** Not re-verified in body.
5. **Forbes / InsertCoin.** "'Flappy Bird' Creator Follows Through, Game Removed From App Stores," 9 February 2014. https://www.forbes.com/sites/insertcoin/2014/02/09/flappy-bird-creator-follows-through-game-removed-from-app-stores/ — **snippet level only.** Source for: 22-hour deadline; iOS store takedown.
6. **ABC News.** "Flappy Bird Creator Pulled His Game Because It's an 'Addictive Product'," 11 February 2014. https://abcnews.com/Technology/flappy-bird-creator-pulled-game-addictive-product/story?id=22461633 — **snippet level only.** Source for: addiction rationale, iOS *and* Android removal.
7. **TIME.** "'Flappy Bird' Creator Dong Nguyen Deletes Popular Game," February 2014. https://time.com/5657/flappy-bird-deleted/ — **snippet level only.** Source for: "downloaded more than 50 million times."
8. **Polygon.** "Flappy Bird collects $50K per day in ad revenue," 6 February 2014. https://www.polygon.com/2014/2/6/5385880/flappy-bird-collects-50k-per-day-in-ad-revenue/ — **snippet level only.** Source for: ~$50,000/day average in-app ad revenue, Nguyen telling **The Verge**. CONTESTED.
9. **Wikipedia** — *`Flappy Bird`, `Jetpack Joyride`: NOT RETRIEVED. HTTP 429 from `en.wikipedia.org`, `en.wikipedia.org/w/index.php?action=raw`, and `api.wikimedia.org` on 2026-09-29. No claim in this dossier rests on it.*
10. **Reddit r/JetpackJoyride**, "10 Jetpack Joyride Tips Everyone Should Know!" — **community source, snippet level.** Cited only to mark the 1–3 revive spin payout as **UNVERIFIED**, not to support any requirement.

**Known gaps carried forward:** the Jetpack Joyride thrust/gravity numeric ratio; the exact number of days Flappy Bird remained in stores after removal (widely repeated, not verified here); whether the final spin revives with full health or partial. None of these block implementation — all three are tuning values.
