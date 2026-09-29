# Review 01 — Completeness

**Target:** `docs/REQUIREMENTS-FINAL.md` Part 1, 77 requirements
**Question:** can a developer start building, and will they discover mid-build that nobody specified something they needed?

## Verdict

Part 1 is a design specification, not a build specification. All 77 requirements describe
game feel. **Zero** describe audio, accessibility, device matrix, persistence mechanics,
rendering, performance, error handling, data model, testing, legal, or the content
pipeline. Fourteen requirements cannot be objectively tested as written, and three
mutually incompatible requirements describe what happens when the player dies. The
pressure system and the economy are the document's two load-bearing claims, and both are
under-specified at the point where they become code.

---

## Findings, ranked by cost to the build

### 1. The depletion gauge's lethality is undefined, and X-02 forbids it

P-08/P-09 and the "spatial rather than temporal" novelty rest on a gauge whose failure
state is never stated. Dossier 02 raised the conflict (`:1163`); the inversion never
reached the consolidated set. If the gauge kills, the game violates its own Tier-A X-02.
If it is inert, there is no pressure and P-09's ramp is decoration.

**Blocked on:** what happens when the gauge reaches zero — death, penalty, or nothing?

| ID | Requirement | Tier | Source |
|---|---|---|---|
| P-16 | The gauge's empty state is exactly one of: lethal, a fixed penalty, or inert with a hard cap on scarcity | A | review-01 |
| P-17 | Gauge drain, refill and scarcity live in one weight table, and that table is the only difficulty control | A | review-01 |
| P-18 | X-02 is restated to forbid a *purchasable or time-based* gate and permit P-08's spatial gauge explicitly | A | review-01 |

### 2. Persistence is an intention, not a mechanism

Fifteen economy and fourteen session requirements read and write persistent state.
`localStorage` appears only in dossier transferability notes (`:1671`). Nothing states the
key, schema, version, write trigger, or what happens when `setItem` throws — private
browsing, disabled storage, quota exhaustion and a partial write all throw or no-op. A
corrupt save means total loss of the entire meta layer.

**Blocked on:** what is the save object, and what is the path when storage is unavailable?

| ID | Requirement | Tier | Source |
|---|---|---|---|
| E-16 | The save is one versioned JSON object under one key, written atomically on run end and currency change | A | review-01 |
| E-17 | A missing, unreadable, unparseable or wrong-version save is replaced with a default profile; startup never blocks on a failed read | A | review-01 |
| E-18 | A failed write is surfaced once and retried next session; no progress is lost silently | A | review-01 |
| E-19 | A run object is named and its fields enumerated; no system writes state outside them | A | review-01 |
| E-20 | One tab writes the save; a second tab re-reads before mutating | B | review-01 |

### 3. The run lifecycle is contradictory

B-09 makes landmarks "respawn checkpoints". P-15 is instant death, R-01 restart under one
second, X-04 forbids a restart to a distant earlier point. All four hold in a build; they
cannot all hold in a game. "Respawn" is used once and never defined.

**Blocked on:** does the player ever resume a run after death, and what carries over?

| ID | Requirement | Tier | Source |
|---|---|---|---|
| R-07 | Death always ends the run; the only recovery is a new run, and "checkpoint" means a scoring landmark, not a resume point. B-09 is restated or withdrawn | A | review-01 |

### 4. Three requirements reference systems that do not exist

E-08 needs "defeating a hazard returns ammunition"; S-13 needs "trick execution converts
to speed"; the Alto resolution adds a grind streak meter (`:233`). P-03 forbids fighting
the pursuer. Nothing defines what the player attacks, with what, or what a trick is.

**Blocked on:** what is fired, and what is a trick? E-08 and S-13 are unbuildable today.

| ID | Requirement | Tier | Source |
|---|---|---|---|
| E-13a | An offensive verb is specified (input, cost, cooldown, target) or E-08 and S-13 are withdrawn | A | review-01 |
| E-13b | A trick is an enumerated, nameable move set with a stated entry condition | A | review-01 |

### 5. Audio is entirely absent

No requirements. P-11 and E-01 are sound requirements written as visual ones, and dossier
02 assumed a "Web Audio oscillator on a threshold" (`:1156`). No SFX coverage, no music,
no mute, no volume, and no autoplay policy — a context built on load is *suspended* on
Safari and iOS until a user gesture, a silent-first-launch bug if unspecified.

**Blocked on:** what is the sound design, and when is the context resumed?

| ID | Requirement | Tier | Source |
|---|---|---|---|
| AU-01 | A sound is defined for every player-caused event: hop, lateral, coin, gauge low, gauge refill, death per cause, pursuer, unlock, spin | A | review-01 |
| AU-02 | The audio context is created or resumed only inside a user-gesture handler; a suspended context resumes on the next input | A | review-01 |
| AU-03 | A persistent mute control exists, defaults to unmuted, and takes effect without reload | A | review-01 |

### 6. Accessibility is entirely absent

Nothing on colour blindness, though the game leans on colour for lane class, hazard
telegraph and the P-11 warning; nothing on reduced motion, against M-06's fixed hop, P-06's
camera creep and S-05/S-06's reward machine; nothing on screen readers over a canvas or on
touch target size. Note the irony: the document's sixth structural pattern is "a control
scheme should match the smallest reliable gesture", and it was never made a requirement.

**Blocked on:** how does a colourblind player know a train is coming?

| ID | Requirement | Tier | Source |
|---|---|---|---|
| AC-01 | No information is carried by colour alone; every hazard and state change has a shape, pattern or motion cue legible in greyscale | A | review-01 |
| AC-02 | `prefers-reduced-motion` removes shake, parallax, flashes and the death-screen spin, substituting a static result, with the game otherwise playable | A | review-01 |
| AC-03 | All text is DOM with an accessible name; score and gauge changes announce through a live region; the canvas carries a text alternative | A | review-01 |
| AC-04 | Every interactive target is at least 44×44 CSS pixels and operable by a single contact | A | review-01 |

### 7. No device matrix, no responsive layout, no pixel-density rule

A dimetric canvas with a follow camera, and the document never says portrait or
landscape, how many tiles are visible, how safe areas are excluded, or how the backing
store scales. Crossy Road is portrait-locked; this game is not.

**Blocked on:** portrait-only or both, and what is the fixed visible lane count in CSS
pixels?

| ID | Requirement | Tier | Source |
|---|---|---|---|
| DP-01 | The backing store is sized to `devicePixelRatio`, capped, and re-sized on orientation change, resize and zoom | A | review-01 |
| DP-02 | Visible lane count is constant in CSS pixels across supported aspect ratios; content scales, framing does not | A | review-01 |
| DP-03 | Supported orientations are named explicitly, and the play area excludes safe areas and browser chrome in each | B | review-01 |

### 8. Input is specified for touch only

M-07 is a pointer-events phase gate. Nothing covers keyboard (a desktop target with no key
bindings), key auto-repeat (a held arrow at 30/s against M-06's fixed hop breaks the
camera), `pointercancel` mid-swipe, two simultaneous pointers, or browser-reserved
gestures — pull-to-refresh and edge-swipe will eat swipes.

| ID | Requirement | Tier | Source |
|---|---|---|---|
| M-11 | Keyboard is a complete alternative to pointer input: arrows and WASD on all four axes, no lost function | A | review-01 |
| M-12 | Input is buffered at least one M-06 hop duration; auto-repeat is rate-limited to one hop per hop | A | review-01 |
| M-13 | A `pointercancel` discards the gesture and never produces a hop | A | review-01 |
| M-14 | Browser-reserved gestures are suppressed on the play surface only; no required gesture is one the browser claims | A | review-01 |
| M-15 | All interactive DOM UI is keyboard-reachable and focus-visible; two simultaneous pointers never produce two hops in one hop duration | A | review-01 |

### 9. No performance budgets and no fixed timestep

No frame rate, timestep, memory ceiling, asset weight or load time. Without a fixed
timestep and accumulator, M-06, P-12 and P-02 become frame-rate dependent and untestable.
S-08's service worker is unspecified on update: a stale cache serving an old `index.html` is
a permanent hard-reload bug.

| ID | Requirement | Tier | Source |
|---|---|---|---|
| NF-01 | The simulation runs on a fixed timestep with an accumulator; rendering is decoupled; all durations are frame-rate independent | A | review-01 |
| NF-02 | 60 fps sustained on a named reference mid-range phone, fixed entity pool, no per-frame allocation in steady state | A | review-01 |
| NF-03 | Transferred weight and time-to-interactive are stated as numbers and met | B | review-01 |
| NF-04 | The service worker is versioned; an update evicts the prior cache, and a failed update leaves the previous version playable | A | review-01 |

### 10. No error handling or lifecycle edge cases

Nothing covers tab backgrounded mid-run (rAF stops; the return delta is enormous and the
camera and pursuer teleport), storage full, a wall-clock change (S-02's seed, S-09's
schedule and the free-spin clock all read the date), or an interrupted gesture.

| ID | Requirement | Tier | Source |
|---|---|---|---|
| NF-05 | Elapsed time comes from `performance.now()` against one captured origin; a wall-clock change never alters the simulation, and only the daily seed reads the date | A | review-01 |
| NF-06 | A hidden tab pauses the run and clears buffered input; no pursuer, gauge or camera advance accrues while hidden, and return is not a penalty | A | review-01 |

### 11. No data model or state shape

No run object, lane record, profile or entity list. B-03's TYPE tag, P-08's gauge, E-11's
gamble table and S-02's seed all operate on undescribed state. The generator's output
format is the most load-bearing undocumented contract in the build.

| ID | Requirement | Tier | Source |
|---|---|---|---|
| SV-01 | The generator's per-lane output is enumerated field by field, including the TYPE tag's value domain | A | review-01 |
| SV-02 | The entity set is enumerated with pool size, lifetime, and the rule that releases each | A | review-01 |

### 12. No testing or acceptance criteria anywhere

Four of 77 requirements carry a pass threshold: M-09 (five seconds), R-01 (one second),
P-07 (three lanes), B-08 (the invariant). **P-12 — called the genre's hardest requirement
and backed by the record's only production failure (`DR-09-4`, `:2654`) — has no test and
no stated seed coverage.**

**Fourteen cannot be objectively tested as written:** M-08 (hitboxes "visually square"),
M-10 (inversion is optional), B-06 ("long enough to cross"), B-07 ("survivable… by timing
alone"), B-10 ("legible"), P-04 ("only a taught skill"), P-09 (ramp driven by "scarcity"),
P-10 ("a decision"), R-04 ("amusing rather than punishing"), E-06 (a visible change, "not
a number"), E-07 ("never rules"), E-14 and E-15 (both deferred, no server), S-13 (tricks
undefined). Four more pass only once a constant is supplied: M-06, M-07, P-02, E-01.

| ID | Requirement | Tier | Source |
|---|---|---|---|
| QA-01 | Every Tier A requirement carries an automated pass criterion runnable with system Python 3.9 and a browser, no Node | A | review-01 |
| QA-02 | The generator is fuzzed over a stated number of date seeds with a solvability check as a test; shipped daily seeds are a subset | A | review-01 |
| QA-03 | Every Tier A requirement is rewritten as a predicate with no subjective term — legible, amusing, judgeable, distinct | A | review-01 |

### 13. No legal, platform or asset-provenance requirements

Dossier 10 concludes theme, naming, iconography and audio are "the only categories the two
policies actually reach" and mandatory (`RR-10-7`). The spec specifies none of the four.
Nothing covers asset licensing, privacy, age rating, or — as a rule rather than prose — the
zero-network posture the build paragraph already assumes.

| ID | Requirement | Tier | Source |
|---|---|---|---|
| LG-01 | Every shipped asset is original, self-hosted and carries a recorded licence; no third-party CDN request at runtime | A | review-01 |
| LG-02 | The build makes zero network requests after first load, sets no cookies, and writes storage only for the E-16 save | A | review-01 |
| LG-03 | An age rating, privacy statement and claims-free posture are stated before public distribution | C | review-01 |

### 14. No content pipeline or internationalisation

S-09, E-07, S-07, B-04 and E-13 all imply authoring. No file format, no validator, no
definition of what a "new theme" is a diff of. With no Node toolchain a Python validator
*is* the quality gate. Separately, player text is implicitly drawn to canvas (S-04, S-05,
S-07), making i18n and text scaling a retrofit touching every draw call.

| ID | Requirement | Tier | Source |
|---|---|---|---|
| CP-01 | Content — lane tables, tile types, roster, stat cards, schedules, strings — lives in data files of a stated format, validated by a system-Python script; a new theme is a data change, not a code change | A | review-01 |
| CP-02 | All player text lives in the data files and renders in DOM, not to canvas, so it scales and translates without a code change | B | review-01 |

---

## Note on format

Tiers are defined in gameplay terms only ("without it the result does not read as this
genre"), so no load-bearing engineering requirement can be expressed and most of the above
would be mis-tiered on merge. Add an engineering tier and declare the new namespaces
(`AU`, `AC`, `DP`, `SV`, `NF`, `QA`, `LG`, `CP`) alongside the existing seven.

## Genuinely covered

Checked and adequate: M-01–M-07 is precise and phase-resolved; B-08's solvability
invariant is a checkable property; R-01 carries a number; S-08 is testable and the build
note correctly finds a service worker sufficient; X-03 and X-04 are falsifiable; the
conflict resolutions resolve rather than defer. P-12 and B-08 are the only two a test
harness can be built around today.
