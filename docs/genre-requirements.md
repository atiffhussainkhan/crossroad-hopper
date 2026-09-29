# Crossy Road genre requirements for an original game build

A requirements dossier on the lane-crossing "hopper" genre: the mechanical
requirements of Crossy Road, the design contribution of eighteen comparable
titles, the structural patterns they share, and the scope that is buildable on a
browser toolchain.

---

## The commercial case against cloning

Crossy Road was released on 20 November 2014 by Hipster Whale, a Melbourne
studio, and published on Android by yodo1 [2][3]. It reached roughly 250 million
players according to its own App Store listing [3], and the studio later claimed
340 million lifetime downloads [4]. Revenue peaked at about $250,000 per day,
with $10 million earned in the first 90 days [5][6]. Of that early $10 million,
roughly $3 million came from video advertising, the figure given by Unity Ads'
head of sales at the GDC session where Crossy Road was presented [5][7][12].

The studio has since been acquired by Atari in a deal reported by games trade
press in June 2026, with an initial payment of $29.3 million rising to $39.3
million, against trailing revenue of $8.28 million and EBITDA of $4.63 million
for the year ended 31 January 2026. That figure is press-reported rather than
confirmed against a filing.

More useful than the revenue numbers is the documented record of what happened
when other people copied it.

Crossy Town was built in about one month by three developers at Niobium in
Brazil. It secured roughly 500,000 installs, helped along by a Chinese
publisher, and generated about $50 in advertising revenue in its first month.
It recorded no purchases, and players did not return. The developers' own
assessment was that the project failed [13].

A separate postmortem reached a different diagnosis. A developer who built
Crossy Road-like games and shipped neither successfully identified the missing
ingredient: the menu loop, and the way the reward system is presented to the
player. Where the original continuously reminds the player what they are
earning and how, clones leave that implicit, and players become "utterly
confused by the mixed messaging and quit" [14].

That finding reframes the problem. The mechanics of Crossy Road are now table
stakes and freely copyable; app store policy explicitly declines to act against
a clone when its gameplay differs in any way [15]. What is not copyable is the
loop structure and the reward presentation, which is why the clone fails and the
original does not.

The market conditions have also moved against the pure advertising-funded clone
model. Mobile game downloads fell 7.2% year on year in 2025, while in-app
purchase revenue grew only 1.3% to $81.75 billion and average cost per install
rose 30% to $0.56 [25]. Rewarded-video eCPM in casual Android titles declined
across three consecutive half-year periods [27]. Casual day-7 retention has been
sliding since early 2022, and hybrid-casual titles have overtaken it [28].

The conclusion is direct: reproduce the structural discipline of the genre, and
differentiate on everything else. A faithful copy of the surface mechanics
targets the part of the market that has already been won.

## Core mechanic requirements

The requirements below are drawn from the observable behaviour of Crossy Road
[1][2][3], the design rationale given by its creators [1][7], and cross-genre
comparison with the titles in the next section. Tier A items are load-bearing:
without them, the result does not read as this genre. Tier B items carry
retention. Tier C items carry identity and are where differentiation happens.

| ID | Requirement | Tier |
|---|---|---|
| FR-01 | Play occurs on a grid; the world advances along a single forward axis | A |
| FR-02 | One forward hop advances exactly one tile | A |
| FR-03 | One forward hop increments the score by one; lateral and backward hops do not score | A |
| FR-04 | Movement is discrete, with no analog steering and no mid-hop correction | A |
| FR-05 | The world is endless; there is no finish line and no level completion | A |
| FR-06 | Death ends the run immediately with no animation blocking input | A |
| FR-07 | A tap moves forward one tile | A |
| FR-08 | A horizontal swipe moves one tile laterally | A |
| FR-09 | Control is a hybrid: tapping is the default, swiping is the exception, because tapping alone is monotonous and swiping alone is tiring [1] | A |
| FR-10 | The player can be moving within five seconds of the first screen, with no tutorial gate | A |
| FR-11 | The camera follows forward progress and never scrolls backward | A |
| FR-12 | The camera advances on its own over time, applying pressure to a stationary player [1][30] | B |
| FR-13 | An idle timer triggers a pursuer that removes the player from the run [1][2] | A |
| FR-14 | Moving backward three or more lanes also triggers the pursuer [2][30] | B |
| FR-15 | The pursuer is telegraphed visually before it strikes, so death is never a surprise [31] | A |
| FR-16 | The pursuer varies with the character in play, so a cosmetic choice changes actual behaviour [2] | C |
| FR-17 | At least three distinct lane classes: roadway with vehicles, railway with trains, water with floating platforms | A |
| FR-18 | Each lane has independent speed and direction | A |
| FR-19 | Collision with any hazard is instantaneous death, with no health pool | A |
| FR-20 | Water lanes contain moving platforms with safe footholds and gaps that are survivable by timing | A |
| FR-21 | Railway lanes have a long telegraph period before a train arrives, long enough to cross | A |
| FR-22 | Levels are generated procedurally and never repeat an identical sequence | A |
| FR-23 | Difficulty scales with score rather than elapsed time, so hesitation is never punished directly | A |
| FR-24 | The generated layout must be solvable; no sequence may produce an uncrossable row | A |
| FR-25 | The hop animation has a fixed, consistent duration regardless of distance or state | A |
| FR-26 | Hitboxes are visually obvious with sharp, square edges, so the player can judge a hop precisely [1] | A |
| FR-27 | The character does not occupy space while airborne for collision purposes beyond a tight, honest window | A |
| FR-28 | Death is designed to be amusing rather than punitive, and is a frequent subject of the game's tone [1] | B |
| FR-29 | The interval between death and a playable restart is under one second | A |
| FR-30 | The restart action requires no confirmation, no menu, and no second input | A |
| FR-31 | Coins or equivalent are earned during a run at roughly one per second of survival | B |
| FR-32 | Currency persists across runs and is never lost on death | B |
| FR-33 | Currency is spent on unlockables, and unlockables are cosmetic only | C |
| FR-34 | There is no life system | A |
| FR-35 | There is no energy gate, play timer, or pay-wall, a rule inherited deliberately from Dota 2's defence against pay-to-win [1] | A |
| FR-36 | Unlocking something produces a change the player can see during play, rather than a number that increases [14] | C |
| FR-37 | The reward presentation on death is randomised rather than fixed, because a repeated stimulus stops being noticed [1] | B |
| FR-38 | A daily challenge exists where all players receive the same generated level, giving a shared comparison point [3] | C |
| FR-39 | Each unlockable carries a per-character stat card [3] | C |
| FR-40 | The game is fully playable offline with no account, no server, and no network requirement [3] | B |

Three items carry more weight than the rest, and the reason is causal rather
than conventional. FR-13 and FR-12 exist because an endless game with no
difficulty ramp lets a player stand still indefinitely and win by default; the
pursuer converts a game about deliberation into a game about commitment. FR-26
exists because a death the player accepts as their own fault produces a retry,
while a death they attribute to unfair hitboxes produces a quit. FR-29 exists
because the entire retention model depends on the player choosing to try again
before their attention moves elsewhere; every other system in the game exists to
feed that one number.

## Comparable titles and their design contributions

The eighteen titles below are grouped by how closely they share Crossy Road's
mechanical structure rather than by popularity. Contribution means the specific
design element the title contributes to the genre vocabulary.

| Title | Year, studio | Contribution |
|---|---|---|
| River Raid | 1982, Activision (Carol Shaw) | Procedural level generation, invented because cartridge space could not hold many hand-built levels; fuel gauge as a depleting pressure clock; one-hit death [21] |
| Frogger | 1981, Konami / Sega / Gremlin | The direct ancestor: discrete hops across discrete lanes, a home row to reach, a fixed time limit, lives, and safe platforms moving against the player [2] |
| Pac-Man 256 | 2015, Hipster Whale with Bandai Namco | Same isometric engine, different meta: power-ups rather than characters, and a pursuer that chases from behind rather than a threat ahead [2] |
| Crossy Road Castle | 2020, Hipster Whale, Apple Arcade | Procedural assembly of hundreds of hand-designed rooms rather than open-ended generation; co-operative play for up to four [2] |
| Disney Crossy Road | 2016, Hipster Whale | Licensed variant; demonstrates that a reskin produces no new mechanic, and has since been discontinued [2] |
| Flappy Bird | 2013, Dong Nguyen | Reduction to a single input with a single success criterion; the origin of the one-button commercial template [1][7] |
| Jetpack Joyride | 2011, Halfbrick | A single control surface where hold and release act on deliberately asymmetric ascent and descent rates; an end-of-run reward machine with a revive option [19][20] |
| Doodle Jump | 2010, Lima Sky | A camera that tracks upward and never scrolls back, making descent fatal; platform types that change the rules per row rather than only the spacing [2] |
| Temple Run | 2012, Imangi | Camera-relative continuous control; a purchase-to-continue model that later titles rejected |
| Temple Run 2 | 2013, Imangi | Coins spent on permanent home decoration, giving an endless run a visible long-term sink [17] |
| Subway Surfers | 2012, Kiloo with SYBO | The removal of turns and of the gyroscope, reducing a runner to a three-lane four-direction swipe; hoverboards as single-hit insurance [16][17][18] |
| Sonic Dash | 2015, Sega | A licensed character roster driving a run-based economy, with missions layered over an endless core [2] |
| Alto's Adventure | 2015, Snowman | Trick execution that converts directly into speed, so style and survival are the same objective [22] |
| Alto's Odyssey | 2018, Snowman | A pursuer that appears only after distance is covered and that can only be escaped by going faster, never by fighting; a Zen mode that removes scoring, currency, and power-ups [22][23][24] |
| Paper.io | 2016, Voodoo | A trail left in open space that is a vulnerability rather than a score, making exposure the central tension [2] |
| Shooty Skies | 2015, Hipster Whale | The same studio applying isometric grid movement to a flight combat loop, with a daily-challenge structure [10] |
| Piffle | 2018, Hipster Whale with Mighty Games | Single-touch aiming and release, and a same-device multiplayer mode as the primary social hook [10] |
| Crossy Town | 2015, Niobium | The documented case of the faithful clone failing commercially despite substantial installs [13] |

Four of these deserve closer reading because they carry transferable design
lessons rather than a mechanic worth importing.

River Raid is the origin of the genre's level design, and the reason is
practical rather than inspired. Carol Shaw wanted more levels than a cartridge
could hold, so she generated them [21]. That decision is the reason every game in
this table can be endless, and it carries a warning that survived forty years:
generated content is only valuable when the generator is constrained. River
Raid's generator produces fair, readable sequences because it is simple.

Pac-Man 256 is the closest available evidence for how this genre behaves when
one variable changes. It reuses the isometric engine and swaps characters for
power-ups, and it also introduced a credits or tokens system that gates
progression [2]. Crossy Road deliberately does the opposite, offering play
without an energy gate while gating only optional rewards [1]. The two
titles together define the design decision that matters most in this genre:
what, if anything, is the player prevented from doing.

Crossy Road Castle shows what happens when the structural requirements are
relaxed. It is a side-scrolling platformer rather than an isometric hopper, it
is built from hand-designed rooms rather than open-ended generation, and death
returns the player to the bottom of the tower [2]. A run that cannot end at the
top cannot be improved, and the reviews treat that loss of a high score as a
weakness in the original formula.

Crossy Town is the control case. It followed the mechanics and missed the loop
[13], which is the evidence that FR-29 through FR-37 are not optional polish.

## Structural patterns across the genre

Ten patterns recur across these titles independently, which is what makes them
structural rather than incidental. Each is stated here with its cause, because
the mechanism is what transfers to a new game; the specific content does not.

The first pattern is that every endless game in this family installs an
anti-stasis mechanism, and the mechanism differs per game while the purpose does
not. Crossy Road applies a pursuer and a forward-pushing camera [1][2]. Alto's
Odyssey applies a pursuer that appears only after two kilometres and can only be
outrun by going faster, never by fighting [22]. River Raid applies a fuel gauge
[21]. Pac-Man 256 applies a pursuer advancing from behind [2]. Doodle Jump
applies a camera that never scrolls downward, so standing still is itself fatal
[2]. The shared purpose is to deny a player the option of stalling indefinitely,
and the transferable lesson is that this pressure must arrive through a
mechanic the player already understands rather than through a new rule.

The second is that the restart interval dominates every other metric. Crossy
Road's creator stated that retention is the most important factor in the game,
and that virality and re-engagement follow from it rather than replacing it [1].
Crossy Road Castle lost that property by making death return the player to the
start of a tower [2]. The restart loop is the product; the content is the
context it is played in.

The third is the control compromise. The design tension was stated directly in
the development presentation: tapping alone is monotonous, swiping alone is
fatiguing, and the answer is to tap for most actions and swipe when needed [1].
A parallel effort started as a one-tap game in the Flappy Bird mould and failed
because the player did not feel in control of the character, before the
swipe-plus-tap hybrid was adopted [1]. Temple Run's gyroscope control drew
sustained criticism for neck strain, and Subway Surfers removed the gyroscope
and the turns entirely [16][17]. The lesson is that a control scheme should be
chosen to match the smallest reliable gesture, and that a device's capabilities
are not a design brief.

The fourth is the use of a randomised reward screen. The end-of-run presentation
in Crossy Road is introduced slowly and is heavily randomised, on the stated
principle that a stimulus shown identically every time stops being perceived [1].
Jetpack Joyride uses a comparable machine at the end of a run, including a
multi-heart revive spin [19][20]. This is variable-ratio reinforcement applied
to a user interface, and it is the mechanism behind a player describing a game
as exciting rather than merely functional.

The fifth is that difficulty is tied to score rather than to elapsed time [1].
Time-based difficulty punishes a player who is thinking; score-based difficulty
rewards a player who is skilled, and only those two reactions should be
producing failure.

The sixth is a menu and reward loop treated as a first-class system rather than
as decoration. The postmortem of unsuccessful clones locates their failure here
specifically: the original reminds the player continuously what they are earning
and what unlocks exist, and the clones do not, so the player never forms a model
of why they are playing [14]. FR-36 and FR-37 exist to prevent this failure,
and it is the single most transferable finding in the genre.

The seventh is forgiving rather than accurate physics. Alto's Odyssey was noted
as refreshing specifically because the character does not lose speed, which
contrasts with titles where realistic deceleration frustrates players [24].
Accuracy is a property of a simulation; forgiveness is a property of an
experience, and the genre rewards the second.

The eighth is that goals scaffold play without gating it. Alto's Odyssey has no
hard stop at the point where a player completes their objectives, by deliberate
design, so the player keeps moving [23]. Contrast this with a conventional level
that unlocks at completion. A goal that ends the session is a goal that costs
retention.

The ninth is a hard rule against pay-to-win. The presentation lists pay-gates
among the mechanics explicitly excluded [1], and the studio's stated goal was
popularity rather than per-user monetisation, with anything that interfered with
popularity discarded [4]. The studio generated $8.28 million of trailing annual
revenue under that constraint. Severity of punishment is what converts a free
game into a resentful one, and the constraint is a design decision, not a
financial inevitability.

The tenth is offline capability as a design requirement rather than a
convenience [3]. In this genre the session is short, the network is often poor,
and an account requirement is a conversion tax applied at the worst possible
moment. This constraint happens to align closely with a browser build, which
places it within reach without a server budget.

## Scope achievable on a browser toolchain

Crossy Road shipped on iOS and Android as a native application. The mechanic set
above is platform-neutral, but the implementation route is not, and specifying
one without acknowledging the other produces a document that cannot be executed.

On a static HTML, CSS and JavaScript build with no build step, no server and no
third-party SDKs, the following translate directly. A dimetric isometric view is
achievable in 2D canvas with a single axis-skew transform, approximating a 2:1
projection, so no 3D engine is required. Pointer events give tap and swipe
detection from one input path. Procedural generation is arithmetic over a lane
list and is roughly two hundred lines. The pursuer, camera creep, coin economy,
daily challenge with a date-seeded generator, and per-character stat cards are
all straightforward state machines. Offline play is a service worker, and
distribution is a static host.

The following do not translate without infrastructure, and are excluded on that
basis rather than on merit. Rewarded video advertising requires an ad network
and a runtime dependency, which also conflicts with a zero-third-party-script
privacy posture. In-app purchase requires a payment surface and a server. Online
leaderboards and real-time multiplayer require a backend. Analytics and
attribution require a runtime beacon. A remote configuration service requires a
server.

The excluded items are the same ones the studio's own revenue depended on, which
means the monetisation model of the original cannot be reproduced by a solo
browser build. Given that pure advertising-funded casual economics have been
deteriorating since 2022 [27][28], that is the correct thing to omit rather than
an inability.

## Initial buildable milestone

The first buildable increment is a single-file playable loop with no meta-layer:
isometric grid, tap-forward and swipe-lateral movement, a camera that follows
and creeps forward, three lane classes with independent speed, an idle and
backward-movement pursuer with a visual telegraph, instant-death collision, score
that counts forward hops only, coins, and a restart that completes in under one
second.

That increment satisfies FR-01 through FR-30 and FR-40, and it is the only part
of the genre that cannot be substituted later. Everything in tier C is a
content layer that can be added once the loop is confirmed to feel right, and
adding content to a loop that does not yet feel right is the most common way this
kind of project stalls.

The honest test for this milestone is a single number: whether a player who dies
restarts within one second without being prompted to. If that is not
automatically true, no amount of content will fix it.

## References

[1] GDC 2015, "Crossy Road" presentation slides, Matt Hall and Andy Sum,
Hipster Whale. https://media.gdcvault.com/gdc2015/presentations/Hall_Matthew_Crossy_Road_Whale.pdf

[2] Wikipedia, "Crossy Road". https://en.wikipedia.org/wiki/Crossy_Road

[3] Apple App Store listing, "Crossy Road". https://apps.apple.com/us/app/crossy-road/id924373886

[4] Thumbsticks, "Crossy Road: How Hipster Whale reinvented free-to-play".
https://www.thumbsticks.com/crossy-road-how-hipster-whale-reinvented-free-to-play/

[5] The Guardian, "Mobile game Crossy Road has made $10m in three months".
https://www.theguardian.com/technology/2015/mar/04/crossy-road-mobile-game-10m-freemium

[6] Polygon, "They wanted to make a phenomenon. They made $10 million."
https://www.polygon.com/2015/3/3/8142247/crossy-road-earnings-10-million-gdc-2015/

[7] Game Developer, "Deconstructing the successful design of Crossy Road".
https://www.gamedeveloper.com/business/video-deconstructing-the-successful-design-of-i-crossy-road-i-_

[8] GDC Vault, "Crossy Road: A Whale of a Time". https://gdcvault.com/play/1021897/Crossy-Road-A-Whale-of

[9] Digital Spy, "Crossy Road sees $10m in revenue and 50 million downloads in 90 days".
https://www.digitalspy.com/gaming/crossy-road-sees-10m-revenue-and-50-million-downloads-in-90-days/

[10] Game Developer, "Dreaming of Voxel Goats". https://www.gamedeveloper.com/audio/dreaming-of-voxel-goats

[11] PocketGamer.biz, "Why Crossy Road focused on sharing and retention, not UA and monetisation".
https://www.pocketgamer.biz/crossy-road-focused-on-sharing-and-retention-not-ua-and-monetisation/

[12] MobileDevMemo, "Crossy Road: A case study in mobile ad monetization".
https://mobiledevmemo.com/crossy-road-a-case-study-in-mobile-ad-monetization/

[13] wnhub, "Pros and cons of cloning games". https://wnhub.io/news/other/item11145

[14] Game Developer, "Dreaming of Voxel Goats", the postmortem of unsuccessful Crossy Road-like projects.
https://www.gamedeveloper.com/audio/dreaming-of-voxel-goats

[15] PocketGamer, "Your game is going to be cloned". https://www.pocketgamer.com/pop-the-lock/your-game-is-going-to-be-cloned/

[16] Game World Observer, "Subway Surfers: a Gameplay Analysis".
https://gameworldobserver.com/2016/06/24/subway-surfers-gameplay-analysis

[17] Subway Surfers Wiki. https://subwaysurf.fandom.com/wiki/Subway_Surfers

[18] Wikipedia, "Subway Surfers". https://en.wikipedia.org/wiki/Subway_Surfers

[19] Wikipedia, "Jetpack Joyride". https://en.wikipedia.org/wiki/Jetpack_Joyride

[20] Game Developer, "Let's Talk About Touching: Making Great Touchscreen Controls".
https://www.gamedeveloper.com/design/let-s-talk-about-touching-making-great-touchscreen-controls

[21] Wikipedia, "River Raid". https://en.wikipedia.org/wiki/River_Raid

[22] Alto's Odyssey press kit. https://altosodyssey.com/press/

[23] MobileSyrup, "Alto's Odyssey Review: Amplifying the endless runner".
https://mobilesyrup.com/2018/02/22/altos-odyssey-review/

[24] AndroidGuys, "Not all endless games are shallow". https://www.androidguys.com/2018/02/22/alto-odyssey-game-review

[25] Sensor Tower, "The State of the Mobile Market in 2026", via GameDevReports.
https://gamedevreports.substack.com/p/sensor-tower-the-state-of-the-mobile

[26] Adjust, "Gaming App Insights Report 2026", via GameDevReports.
https://gamedevreports.substack.com/p/adjust-gaming-app-insights-report

[27] Game Growth Advisor, "Mobile Game Retention Strategies 2026".
https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-retention-strategies-2026/

[28] Game Growth Advisor, "Hybrid Casual Games 2026".
https://gamegrowthadvisor.com/blog/2026-04-16-hybrid-casual-game-design-strategy-2026/

[29] Mistplay, "70+ Key Mobile Gaming Statistics". https://business.mistplay.com/resources/mobile-gaming-statistics

[30] Crossy Road Wiki, "Eagle". https://crossyroad.fandom.com/wiki/Eagle

[31] Crossy Road community tricks guide. https://archive.org/details/crossyroadtricksguide

Several figures that circulate widely about this genre are not supportable and
have been excluded from the requirements above. Claims that Crossy Road has
levels, power-ups, upgradeable items, or a chicken mode are contradicted by the
official feature list [3]. A "78% daily retention" figure attributed to a survey
of 1,000 Indian players, and a "chunk system" that plateaus difficulty after 200
steps, originate from content-farm sites with no primary source. An account of
the game's origin as a 2015 browser puzzle title by a company called YY Inc is
fabricated; the documented origin is a native iOS title from Hipster Whale [2].
Where sources conflict, this document prefers the developer's own presentation
and the App Store listing over secondary analysis: development time is given as
twelve weeks per the GDC listing [8][9] rather than the six weeks reported in
one trade article, and advertising revenue as roughly $3 million of the first
$10 million [5][12] rather than the $6 million reported elsewhere. Two values
remain genuinely undocumented and are presented without false precision: the
exact duration of the idle timer before the pursuer appears is reported
variously as three to five seconds, and no primary source publishes the
procedural generation weight tables, so FR-23 and FR-24 specify the required
behaviour without asserting the original's internal parameters.
