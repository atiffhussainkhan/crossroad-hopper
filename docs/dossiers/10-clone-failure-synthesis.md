# Dossier 10 — Why Faithful Clones Fail, and What the Evidence Implies for an Original Game

**Scope:** synthesis dossier for the hopper-genre research programme. Read-only against sibling dossiers; writes only this file.

**Method note:** no general web search was available to this dossier (DuckDuckGo, Brave, Mojeek, Qwant, Yandex, Startpage, eTools, searx instances and Bing's web UI all returned CAPTCHA walls or HTTP 429). Work proceeded by direct-URL retrieval, the Internet Archive CDX index, the iTunes Search API, and the platform policy pages. This constraint is load-bearing for §1 and §2.

---

## 1. THE CROSSY TOWN CASE — the attribution does not survive checking

The base spec attributes the Crossy Town numbers to a wnhub article, "Pros and cons of cloning games," at `https://wnhub.io/news/other/item11145`. **That attribution fails verification.**

- The URL returns **HTTP 404**. wnhub.io has been rebuilt into a "business hub for games, iGaming & tech"; the old `/news/<section>/item<n>` article hierarchy no longer exists.
- The Internet Archive holds **zero captures**. A full CDX sweep of the entire wnhub.io domain (`matchType=domain`, `collapse=urlkey`, 1,174 unique URLs) contains **no URL matching `/news/*/item*` at all**. archive.today has no capture either.
- "Crossy Town" does not appear in the iTunes Search API for the **US, BR, PT or GB** storefronts (`entity=software`). The only "Crossy"-named iOS results in those markets are unrelated games (Froggy Crossy Road, Crossy Pixel Run, Crossy Bridge), none by a seller called Niobium.
- Repeated index queries for the title, the studio name and the distinctive figure combinations returned only SEO content farms, which are excluded by source policy and which do not corroborate each other anyway.

**The entire Crossy Town evidence set is UNVERIFIED.** Specifically: ~500,000 installs; ~$50 first-month ad revenue; zero in-app purchases; a three-person Brazilian team (Niobium); ~1 month build time; a Chinese publishing deal; all retention figures; and the developers' own stated conclusion — no reachable source exists for any of them, and no primary quotation of the developers appears anywhere.

This is not a small correction. The base spec's single most load-bearing empirical anchor — "the documented clone failure" — rests on a dead, never-archived URL. **Correction: base-spec ref [13] must be struck, not softened.** Treat Crossy Town as a hypothesis about a category outcome, not a case study. The load-bearing evidence here is the two clone floods (§2), the Voxel Goats menu-loop analysis (§3), and the platform policy text (§4) — all directly verified.

---

## 2. THE CLONE FLOOD — two documented waves, one of which the base spec sourced

**Flappy Bird wave — verified.** PocketGamer.biz, Keith Andrew, **5 March 2014** [1], body read in full: "An average of **60 new Flappy Bird clones roll out on the App Store every day** … with **2.5 clones added every hour**," based on "the **last 300** Flappy Bird clones to have launched" — one clone every 24 minutes, and "on some days, **14 Flappy games can be added in the space of one hour**." The formal clone definition is the editor's own: "any game in which you guide some character through an obstacle course of pipes (or similar objects) hanging from the ceiling and sticking out of the ground" — character identity explicitly does *not* count as differentiation. The enforcement finding matters most: it "had been claimed that Apple was clamping down on Flappy Bird clones, though **Pocket Gamer's data suggests the Cupertino giant has either lost control, or is simply not enforcing any notable action**."

**Pop the Lock wave — verified, and the tighter analogue.** PocketGamer, Mark Brown, **2 October 2015** [2], body read in full. Pop the Lock launched **10 September**, was **featured by Apple on 11 September**, hit **#1 free on 13 September** — and the **first clone appeared on 14 September**: a two-day window from featuring to commoditisation. Brown counted **~35 clones in under a month**. Template shops carried the mechanic as a **~$100 asset**, one verified live two hours before publication. The underlying template **was licensed from Chupamobile** — a licensed template was not a defence. Brown on both platforms: neither "will not pull a game just because it feels a bit cloney."

**Crossy Road wave — partially verified, and the counts are the missing part.** Verified: the flood happened, and its most important party denied damage. Matt Hall (Hipster Whale): "the **mountains of clones** hasn't exactly hurt his company's ability to make money off Crossy Road" [2]. UNVERIFIED: **any specific numeric count of Crossy Road clones, from any date, from any outlet.** Figures in the SEO-farm ecosystem could not be traced to PocketGamer.biz, PocketGamer.com, Game Developer, Polygon, The Verge, Kotaku, wnhub or The Guardian. A CDX sweep of the full pocketgamer.biz index filtered for "crossy" returns 325 URLs — merchandising, tags, charts, features, interviews — and not one article quantifying the wave.

**No documented policy change followed either wave.** There is no sourced Apple or Google rule change dated after 4 February 2014 (Flappy's removal) or 2 October 2015. The policy text is unchanged — see §4.

---

## 3. WHY THE MECHANICS ARE NOT THE MOAT

The base spec cites "Dreaming of Voxel Goats" as "the postmortem of unsuccessful Crossy Road-like projects." **That framing is wrong and should be corrected.** Game Developer, Jools Watsham, **10 December 2015** [3] is a *devlog*, written while the game was healthy: Totes the Goat had "**170,000+ installs in under a week**", "**105,000** entries in the Game Center leaderboard", "**4.5 stars from 104 reviews**", and Apple was putting it on the front of the store. Watsham noted "not a ton of cash has been made from video ads / in-app purchases yet." **It is not a postmortem, and Totes the Goat is not presented as a failure.** The claim that clones fail *empirically* has no source in this article.

What the article does contain is a **design argument**, and it is the strongest evidence in this dossier because it is causal and specific:

> "My overwhelming feeling from playing these games — as well as the Crossy Road-style games that I know are clones — is that **many players don't fail at the gameplay, they fail at the meta-game**. The menu/reward loop… is so important. The actual game just has to be a vehicle to show them the next menu or the next reward. And if you get the menu/reward loop wrong, you don't even get to have the gameplay. The Crossy Road menu has a real flow. Once you die, the immediate reward is right there. And the result is a *flow state* that keeps people playing."

He names the corruption precisely — the "**toilet humor** … Chicken & Eggs, Crossy Road poop emojis … **players become utterly confused by the mixed messaging and quit**" — and verifies that this is a *content* decision, not a genre requirement: his own game carries an award, "the Horny Goat award, for getting a high score 50 times."

Three conclusions follow. First, **a hop-scraper geometry is not a barrier to entry; it is a barrier to being noticed** — cheap to reproduce (~$100 [2]), legible in a sentence, describable in two days. Flappy's data proves reproducibility, not value. Second, **what is expensive is what nobody copies**: menu cadence, reward pacing, art-direction voice, the meta-progression curve — exactly the things Watsham identifies as the difference between retention and quitting, and precisely what a template pack does not contain. Third, **the moat is the first five minutes, not the mechanic**. Pop the Lock went from featured to cloned in two days because the mechanic was legible in two days. Nothing in a hop-scraper slows that. What slows it is a reward loop a player cannot see in a screenshot — and a screenshot is the entire unit of competition in a chart position.

---

## 4. APP STORE POLICY — what the platforms say, and why it does nothing here

**Apple, §5.2 Intellectual Property** [4], verbatim: "Only use content, services, and materials that you own or are authorized to use. Don't use protected third-party material such as trademarks, copyrighted works, or patented ideas in your app without permission." And: "Make sure your app — including advertising and other third-party content — does not use content, artwork, photos, or other materials that are copied… someone else's app may be removed if they've 'borrowed' from your work."

**Apple, §3** [4]: "we won't distribute apps and in-app purchase items that are clear rip-offs." The only Apple text reaching toward non-IP rip-offs — and it governs **distribution and monetisation**, not gameplay.

**Google Play, Intellectual Property policy** [5]: framed entirely around copyright, trademark and patent, enforced through notice — the **DMCA takedown form** and the **Play trademark complaint form**. There is no self-service path for "your mechanic was copied."

**Three structural reasons enforcement is weak here, all sourced:**

1. **Both policies are copyright/trademark/patent instruments, and game mechanics are not copyrightable subject matter** in either jurisdiction. A rule of the game, an idea, a control scheme or a grid geometry is protectable only through a patent — not a practical instrument for a hop-scraper game, and not one this genre's developers pursue.
2. **Both enforcement paths are notice-based and adversarial.** Google Play requires a **valid claim of rights** and warns that unsubstantiated claims risk account termination [5]. Apple reserves the right to reject a notice [4]. A small studio facing a template flood cannot front that legal cost and delay.
3. **The line the platforms actually draw is between "clone" and "variation" — and the developer draws it, in their own favour.** Kurt Bieg (Simple Machine), in [2]: "**If the gameplay is different, in any way, that negates the game being a clone.** This is why **2048 isn't a clone, but rather a variation, which to my knowledge hasn't broken any rules**." The base spec [15] presents this as *app store policy explicitly declining to act against a clone whose gameplay differs in any way*. **That is a correction.** It is a developer's characterisation of the gap, published in trade press — not policy language. Neither Apple nor Google publishes any text of that kind; the two policies above are the operative text.

---

## 5. WHAT THIS IMPLIES FOR AN ORIGINAL GAME

**MUST be built, cannot be borrowed (where the design work actually lands):**

- **The menu/reward loop** — without it you "don't even get to have the gameplay" [3]. Highest-leverage asset in the genre; the one thing a clone factory cannot ship.
- **Presentation layer and art direction** — distinct silhouette, palette discipline, and a *consistent* register across menu, HUD, characters and store assets. Watsham's "mixed messaging" failure [3] is a tone-consistency bug, and tone is a cost line a clone author does not pay.
- **Character identity and roster** — Flappy's own clone definition treats character identity as non-differentiating [1]. The character is not the clone, it is the brand. A single-skin clone has nothing to lose and nothing to protect.
- **Meta-progression design:** awards, unlock pacing, run-length curve.
- **Store-page and icon-level distinctiveness** — the unit of comparison in the top-grossing chart.
- **Original theme, naming, iconography, audio** — the only categories the two policies actually reach [4][5], and the cheapest possible insurance.

**Genuinely free to copy, because no platform and no rights-holder can enforce it:** core geometry (tile-forward / tile-sideways stepping, row-scrolling, discrete grid lanes); the hop arc and fixed follow camera; the obstacle vocabulary (cars, trains, rivers, logs, eagles); the scoring model (one unit per row, death on contact, endless); casual modifiers (item boxes, shields, retro modes, multipliers); the one-tap control scheme.

**Free because nobody owns it is not the same as free because it is a good idea.** Every one of those is available to any clone author at ~$100 [2] and will be copied within days of your featuring [2]. They are table stakes, not strategy. The framing: *do not spend originality budget on mechanics, because it will not survive; spend it on the layer above mechanics, because nothing else will.* Ship mechanics legible in two days — the two-day window [2] is a floor, not an accident.

---

## 6. HARVEST RISK REGISTER

**RR-10-1 — Mechanic commoditisation within ~72h of featuring.** *Evidence:* Pop the Lock featured 11 Sept 2015, first clone 14 Sept; templates ~$100 [2]. *Mitigation:* treat the mechanic as public property from launch; spend no originality budget there; hold 48h capacity to re-skin a trending copycat.

**RR-10-2 — First two sessions lost to a broken reward loop, not bad gameplay.** *Evidence:* Watsham — players "become utterly confused by the mixed messaging and quit" [3]. *Mitigation:* playtest the menu/reward loop before run-loop polish; if the post-death screen is not visibly better than death, do not ship.

**RR-10-3 — Reliance on unverifiable market data.** *Evidence:* the whole Crossy Town data set (§1) and the Crossy Road clone count (§2) are UNVERIFIED, yet both are widely repeated. *Mitigation:* strike them from the business case; fund a first-party measurement plan (own store-page CVR, own D1/D7) before committing build budget.

**RR-10-4 — Expecting platform enforcement to protect you.** *Evidence:* Apple's only non-IP language is §3 rip-off *distribution* [4]; Google Play enforcement is notice-based and requires a claim of rights [5]; PocketGamer concluded Apple had "lost control, or is simply not enforcing any notable action" [1]. *Mitigation:* budget zero for takedowns. Design for the flood, not for the appeal.

**RR-10-5 — Confusing copyright with the genre's free layer.** *Evidence:* both IP policies are copyright/trademark/patent instruments [4][5]; Flappy's clone definition treats character identity as non-differentiating [1]. *Mitigation:* legal spend limited to name/icon/theme clearance. Do not seek to protect the hop.

**RR-10-6 — Template-shop supply of a $100 hop-scraper.** *Evidence:* a Chupamobile template was live two hours before publication; Pop the Lock was built on a licensed template and was still cloned [2]. *Mitigation:* the barrier to a competent clone is ~$100 and 1–2 days. Any design whose only defence is "it's hard to copy" has already failed at concept stage.

**RR-10-7 — Chrome-only differentiation (a reskin, not an original).** *Evidence:* the reward loop and register, not the art, decide retention [3]; 2048 is held to be legal-but-legitimate as a "variation" [2]. *Mitigation:* original theme, naming, iconography and audio are mandatory — and are also the only legally protected parts. The rare case where the cheap option and the defensible option coincide.

**RR-10-8 — Being the original that gets harvested, with no recourse.** *Evidence:* [1] and [2] together — Flappy's removal removed the original and left the field open; the template market converted Pop the Lock's mechanic into commodity supply. *Mitigation:* hold what a copier cannot ship (register, reward cadence, roster, live-ops) and treat the mechanic as a gift given to the market deliberately.

**RR-10-9 — Mis-citing a dead source in a design document.** *Evidence:* the wnhub attribution 404s and is absent from the Internet Archive's complete wnhub.io index (§1). *Mitigation:* every figure in this dossier carries a live URL or an UNVERIFIED mark; new figures must clear the same bar before entering a design decision.

**RR-10-10 — Citing "Dreaming of Voxel Goats" as evidence that clones fail commercially.** *Evidence:* it is a devlog of a game at 170,000+ installs and 4.5 stars, published while Apple featured it; its menu-loop conclusion is an author's design argument about other games, not a measured result [3]. *Mitigation:* cite it for the *design claim* (the menu/reward loop is where retention is made), never for the *commercial claim* (that clones measurably lose money). The commercial claim remains UNVERIFIED in the public record.

---

## 7. SOURCES

1. **PocketGamer.biz — Keith Andrew, "60 new Flappy Bird clones hit the App Store every day." 5 March 2014.** https://www.pocketgamer.biz/60-new-flappy-bird-clones-hit-the-app-store-every-day/ — *body text read in full.* Source for: 60 clones/day, 2.5/hour, 300-clone sample, one per 24 minutes, 14 in an hour on peak days, Mark Brown's formal clone definition, Apple's non-enforcement finding.
2. **PocketGamer — Mark Brown, "Your game is going to be cloned." 2 October 2015.** https://www.pocketgamer.com/pop-the-lock/your-game-is-going-to-be-cloned/ — *body text read in full.* Source for: Pop the Lock launch/feature/#1/clone timeline, ~35 clones counted, ~$100 Chupamobile template, Kurt Bieg on 2048 and "variation", Matt Hall on "mountains of clones", platforms not pulling for feeling cloney.
3. **Game Developer (Gamasutra) — Jools Watsham, "Dreaming of Voxel Goats." 10 December 2015.** https://www.gamedeveloper.com/audio/dreaming-of-voxel-goats — *body text read in full.* Source for: Totes the Goat install/rating/leaderboard figures and "not a ton of cash"; the menu/reward-loop, mixed-messaging and toilet-humor analysis; the point that this is a devlog, not a postmortem.
4. **Apple Developer — App Store Review Guidelines, §3 and §5.2 Intellectual Property.** https://developer.apple.com/app-store/review/guidelines/ — *full text retrieved.* Source for the verbatim policy language and for the absence of any gameplay-clone provision.
5. **Google Play Console Help — "Intellectual Property."** https://support.google.com/googleplay/android-developer/answer/9888072?hl=en — *full text retrieved.* Source for notice-based enforcement, the DMCA and trademark-complaint routes, and the warning that unsubstantiated claims risk account termination.

**Checked and found unavailable (recorded for audit):** `https://wnhub.io/news/other/item11145` — HTTP 404; no capture in the Internet Archive's complete wnhub.io CDX index; no capture on archive.today.
