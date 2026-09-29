# Senior engineer review of the final requirements document

An independent adversarial review of `docs/REQUIREMENTS-FINAL.md`, produced by
three reviewers working under separate lenses — completeness, internal
consistency and verifiability, and delivery risk — and then reconciled.

This review was deliberately conducted against the document rather than by its
author. Where the three lenses disagreed, both numbers are reported rather than a
convenient average. Where they agreed, the finding is marked as corroborated.

## Verdict

The document is unusually well evidenced and unusually unsafe to build from.

The research is genuine. Twenty games, 117 harvested requirements, 19 recorded
corrections, and a willingness to strike the base specification's central
argument when its source turned out to be dead. That is the behaviour a
requirements document is supposed to have, and it is rare.

The specification is the problem. As written, the document would produce a
broken build, because its three headline differentiators are each either
undefined or unsound, and because a large share of the requirements cannot be
tested. The genre requirements underneath are sound and in places excellent.
The originality layer layered on top of them is where the engineering risk sits.

**Recommendation: do not start the build. Apply the twelve blocking fixes in the
next section first. They are small in number and small in effort, and each one
prevents a structural rework rather than a tweak.**

## The twelve blocking defects

### 1. The depletion gauge has no defined failure state, and one rule forbids it

P-08 makes a depleting gauge central and P-09 makes it the difficulty ramp. This
is the document's stated novelty: a spatial ramp rather than a numeric one. But
no requirement says what happens when the gauge empties, and X-02 forbids
energy gates. Dossier 02 raised exactly this conflict and the inversion never
reached the consolidated set.

If the gauge kills, the game violates its own Tier A rule. If it does not kill,
P-09 is decoration, because a gauge that cannot end a run cannot create a ramp.
There is no third option the document considers. **Corroborated by two lenses.**

Fix: make the gauge a *route* constraint rather than a resource. It reduces the
number of tiles that can be safely occupied, which makes the safe line
positionally harder to find, and its depletion never kills. This preserves the
spatial ramp and clears X-02. One requirement, rewritten.

### 2. The grind has no requirement at all

The document's prose proposes a "hold-to-grind that charges a streak meter" and
it appears exactly once, in a sentence, with no ID, no tier, no test and no
source. Four requirements depend on it: P-04, S-13, P-03 and E-08. None of them
can be built or tested because the thing they reference does not exist as a
requirement.

This is the single most consequential defect in the document, and it is a
consequence of the merge process rather than of the research: the grind was
described in a dossier and in a specification paragraph, and it never became a
row. **Corroborated by two lenses.**

Fix: one requirement, or delete the four that depend on it.

### 3. The ammunition economy is unsound as written

E-08 says defeating a hazard returns ammunition. Defeating requires an attack
verb, and M-04, M-07, P-15 and X-05 together grant none. Its stated benefit,
removing the need for an idle timer, is already delivered by P-02. As written
the requirement is unimplementable and redundant.

Delivery risk rates it 5 of 5, the hardest item in the document, and concludes
it should be cut. **Corroborated by two lenses.**

Fix: cut, or re-specify as passive defeat, where the world destroys a hazard and
the player collects what is left. Passive defeat is affordable within the
existing control model and keeps the closed economy that makes E-08 interesting.

### 4. The camera requirements contradict each other and the conflict resolution

P-05 says the camera never scrolls backward. P-06 says the camera advances on
its own over time. The conflict resolution section states that the idle timer is
retained "rather than as a stopwatch" — but P-06 *is* the stopwatch, and P-02
forbids it. Nothing in the document draws the line between X-05's "the camera
may move" and the world carrying the player.

This is the most tangled of the twelve because it touches the movement grammar,
which is otherwise the cleanest part of the specification. **Corroborated by two
lenses.**

Fix: separate the two. The follow camera is a rendering concern and belongs
with P-05. The anti-stall pressure belongs to the pursuer as a distance gate
under P-02. Delete the stopwatch entirely.

### 5. The run lifecycle cannot hold four requirements at once

B-09 introduces landmarks that double as respawn checkpoints. P-15 makes every
collision instant death. R-01 requires a playable restart within one second.
X-04 forbids restarting at a distant earlier point. A checkpoint respawn *is* a
distant restart, and "respawn" appears once in the document and is never defined.

Fix: either drop B-09, or define respawn as a within-run recovery that costs the
run its accumulated currency but not its position. The second is the more
interesting mechanic and it is cheap, but it must be stated.

### 6. Two difficulty ramps compete

P-09 ramps difficulty by refill-tile scarcity. P-13 ramps it by score. S-03
offers a player-chosen multiplier as a third. All three are Tier A or close to
it, and no requirement says which wins.

Fix: P-09 governs ordinary play, P-13 becomes the scoring function rather than a
ramp, and S-03 applies only to the daily. This is three sentences.

### 7. Two Tier A rules have no offensive verb to build on

E-08 and S-13 both require the player to attack or to perform tricks, and the
movement grammar grants no such action. P-03 separately forbids fighting the
pursuer, so the intended reading is that offence applies to hazards only. That
reading is never stated.

Fix: state the scope of the offence verb, or accept that the document describes
no player action other than movement and dismissal.

### 8. Persistence is an intention rather than a mechanism

Twenty-nine of the seventy-seven requirements read or write persistent state.
The document specifies no key, no schema, no version, no write trigger, and no
behaviour when storage is unavailable or corrupt. A corrupt or missing save
destroys the entire meta layer, and the meta layer is where the retention
argument lives. **Corroborated by two lenses.**

Fix: a persistence requirement naming the store key, the schema version, the
write trigger, and the corrupt-save recovery path. This is a half-page addition
and it is the single cheapest way to protect the most work.

### 9. A large share of requirements cannot be tested

The two lenses that examined verifiability disagree on the count — 14 of 77 by
the stricter completeness standard, 39 of 77 by the looser consistency standard,
which also supplies a tightened replacement with a number and a measurement
method for each. Both agree the failures cluster the same way: a number exists
in the source dossier and was dropped during the merge, such as the 12 pixel and
150 millisecond gesture threshold behind M-07; a presupposed scalar is never
defined, such as the "difficulty" P-13 scales by; or a design claim is stated as
a behaviour, such as R-04's "amusing". Only four of seventy-seven requirements
carry any pass threshold at all.

Fix: merge the two lists. Most are one-line numeric tightenings, and together
they are what turns this document from a design essay into something a build
gate can assert against.

### 10. Traceability is worse than the header claims

The header states 117 harvested requirements consolidated into 77. In fact 45 of
the 117 are cited by any consolidated requirement, 30 consolidated requirements
cite no dossier at all, and four cite the wrong one. Seventy-two harvested
requirements were discarded without a note saying why. `FR-46` is cited twice
by a dossier and is undefined, because the base specification ends at FR-40.
`FR-27`, the airborne collision window, is a Tier A fairness requirement from the
base specification that was dropped in the merge with no replacement, leaving a
live fairness hole.

Fix: add a disposition column recording where each harvested requirement went.
That single table makes the merge auditable and costs an afternoon.

### 11. Tiers are defined only in gameplay terms

Tiers A, B and C are assigned by whether the player would notice the requirement
missing. That works for gameplay and fails for engineering: no load-bearing
engineering requirement can be expressed, so the persistence gap, the audio gap
and the performance budgets would all be mis-tiered the moment they are added.
**Corroborated by two lenses.**

Fix: state the tier definition as load-bearing, retention-bearing, and
differentiation-bearing, and re-tier accordingly.

### 12. Fourteen whole requirement categories are absent

The completeness review tested for and did not find: audio, accessibility,
keyboard and mouse input, persistence, responsive layout and device matrix,
performance budgets, internationalisation, the data model, error handling,
testing and acceptance criteria, legal and platform requirements, and the
content pipeline. It proposes forty-two replacement requirements across eight new
namespaces.

The absence of performance budgets and of any acceptance criterion is the most
consequential, because those are precisely what converts the rest of the
document into something verifiable.

## What the document gets right

Worth recording, because the defects above are the kind that make a reviewer
lazy about the parts that work.

The movement grammar, M-01 through M-07, is precise and already phase-resolved.
The solvability invariant B-08 is a checkable property rather than a sentiment.
R-01 carries a real number, and the conflict resolutions are genuinely resolved
rather than deferred, which is rarer than it should be. The corrections table is
an asset: a document willing to record nineteen of its own errors is worth more
than one that makes none. And the decision to exclude the community collection
bar and the rival score, on the grounds that they need a backend, is correct and
honest.

## What to cut

Delivery risk estimates that roughly thirty of seventy-seven requirements are
shippable, that the core loop is about thirty percent of build cost, and that
the remaining forty-seven are about seventy percent of the cost for about fifteen
percent of the play experience.

Cut: **E-08** (unsound and unimplementable), **S-09** (content calendar, pure
polish), **E-14** (needs a backend), **B-09** (contradicts the restart loop),
**E-04** (redundant against E-03).

Keep regardless of schedule pressure: **P-12**, **R-01, R-02, R-03**,
**P-01, P-02**, **P-08, P-09** once defect one is fixed, and **B-08**.

## Build order

Delivery risk's recommendation is to build the pursuer before building anything
else, and the argument is worth repeating because it is counter-intuitive. A grey
board with a camera, a pursuer, death and a restart is a vertical slice that
tests the requirement whose absence invalidates the most downstream work. Build
it before any hazard exists, because every camera constant tuned before the
pursuer exists is wasted: the viewport has to hold both the pursuer edge and the
forward lanes at once.

Two architecture decisions are day-one and irreversible. Seed the entire run
deterministically, or S-02 dies and the generator cannot be unit-tested. Inject
`dt` as a parameter, or R-01 cannot be a build check and the document's one
honest test becomes a manual stopwatch.

## On solvability

P-12 requires every generated sequence to be solvable. This is achievable more
cheaply than the document implies, but not by generating lanes independently.
The correct approach is to generate a path and derive lanes from it: a
reachability bitmask over columns, per-lane validation requiring either a
permanently safe tile or a platform with dwell time at least twice the hop
duration, bounded re-roll, then a guaranteed safe band as fallback. Roughly forty
lines, and P-12 becomes a unit test.

The document's version of P-12 is also weaker than the real requirement. As
written it is static, but under a closing pursuer solvability is temporal, and
the honest requirement is a discrete-tick reachability search over row, column
and time. Dossier 09 records a shipped game that shipped an impossible daily
challenge and patched it later, which is what the static version will produce.

## Reconciled verdict

The document is ready to be fixed and is not ready to be built from. Of the
twelve blocking defects, three are rewritten requirements rather than new
requirements, four are missing requirements rather than wrong ones, and the
remainder are contradictions between requirements that are individually sound.

Estimated effort to reach build-ready: substantially less than the research
phase. The hard part is already done, and it was done well.

---

**Sources:** `docs/review-01-completeness.md`, `docs/review-02-consistency.md`,
`docs/review-03-delivery-risk.md`. Traceability counts in section 10 were
verified independently against the dossiers after the review reported them.
