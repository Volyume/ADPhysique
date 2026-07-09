# Cohesion lane 2 — Novice usability, guidance and psychology

Audit date: 2026-07-09. Read-only; no source touched. Scope: VOLYUME through
the eyes of a complete beginner — never lifted a weight, never tracked food,
not confident with apps. Method: read `coverage-05-first-run.md`,
`coverage-00-SYNTHESIS.md`, `ASSESSMENT.md`, all eight `facts-*.md` files
(especially `facts-home.md`, `facts-logging.md`, `facts-onboarding.md`,
`facts-meals-dietary.md`, `facts-nutrition.md`), the two `DECISIONS-2026-07-09.md`
founder-decision registers, and `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` in
full, then read the actual first-run and daily-loop source: `HomeScreen.js`,
`ActiveWorkoutScreen.js`, `SetEntry.js`, `ManualBuilderScreen.js`,
`ProOnboardingScreen.js`, `FreeStarterScreen.js`, `WorkoutSummaryScreen.js`,
`AnalyticsScreen.js`, `PlanLibraryScreen.js`, `seedRoutines.js`,
`EmptyState.js`, `InfoTooltip.js`, `coachGlossary.js`, `activationNudge.js`,
and the jargon-term footprint across `src/screens` (`MEV/MRV/MAV`, `RIR/RPE`,
superset, deload, tonnage, AMRAP, myo-reps, rest-pause, 1RM).

Findings already logged by other lanes are **not repeated here**: the Home
banner stack (AC-6/CP-1, capped per D7), FR-1 to FR-5 (first-run emotional
arc), the exercise-media / plate-calculator / RPE-RIR / paywall-social-proof
items the founder has explicitly ruled **do not re-propose**
(`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`). None of
those are re-surfaced below, including implicitly.

## Summary

**4 findings** (NV-1 to NV-4): **0 A, 2 B, 2 C**. All four are **SAFE**
(copy/tooltip additions only; no engine, consent, gating, tier, or locked-copy
surface touched). No JUDGEMENT or GATED items this pass — every gap found is
a small, mechanical close, not a design fork.

**Headline finding:** the two daily loops the brief asked me to friction-audit
— log a set, log a meal — are already about as low-friction as this product
category gets. A repeat set is one tap ("Log set", pre-filled from actual
last-session performance). A repeat meal is one tap (a "usuals" chip on the
Diary card, or a tap-to-relog on Recents/Frequents with no sheet at all). The
gap to world class here is not the two loops themselves; it is a handful of
unexplained jargon words sitting just outside them (the plan builder, the
onboarding plan-build animation) where the app's own excellent
translate-the-jargon discipline (an authored `GLOSSARY`, `InfoTooltip`
everywhere else) simply hasn't reached yet.

---

## Friction audit: the two daily loops, counted

**Log a set (steady state, active plan, exercise already reached):**
1. Home → tap **Start workout** (1 tap; the app has already picked the
   correct next session by rotation — `HomeScreen.js:1051`, no day-picker
   decision forced on the user).
2. (Pro only) a one-question readiness check ("How are you feeling today?",
   `HomeScreen.js:2172-2256`) — 1 tap, with a permanent, discoverable
   opt-out row on the same screen ("Don't ask before each session"). Free
   tier never sees this (tier-blind autoregulation input only).
3. First set of the first exercise is **pre-filled from what was actually
   lifted last time** (`getBestAnchorSet`, per `facts-logging.md`), not a
   computed target — deliberately, because "the target felt random to
   users." If the lifter wants exactly that: **1 tap ("Log set")**. Weight
   and reps only need touching if they differ from last time (one
   stepper-tap each, or type-and-Done).
4. Rest starts automatically; no tap required to advance it.
5. Once every set for an exercise is logged, the next exercise auto-advances
   ("Next exercise in a moment", `ActiveWorkoutScreen.js:2555`) or the lifter
   can tap through immediately — no forced manual navigation between
   exercises.

**Net: a returning lifter doing an unmodified set logs it in exactly one
tap.** This is already best-in-class for the category; nothing here needs
building.

**Log a meal (steady state, a food already eaten before):**
1. Diary → a memorised "usual" chip on the meal card (up to 3 shown for an
   empty slot with history) → **1 tap, done**, no screen change. Or:
2. Diary → **Add food** (1 tap) → Recents/Frequents tab, no search typed →
   **1 tap on the row logs immediately at the remembered portion**, no sheet
   (`quickLogRelog`, per `facts-nutrition.md` section 1).

**Net: a repeat meal is one or two taps, whichever entry point is used.**
The only place friction is unavoidable is the genuinely first-ever log of a
brand-new food (search, pick a serving, save) — a one-time cost inherent to
the domain, not a design gap.

Both loops already meet the brief's "self-explanatory, low-friction daily
habit" bar. The findings below are about the handful of surfaces adjacent to
these loops where a first-timer can still get stuck on a word.

---

## Findings

### NV-1 — The Plan Balance card's colour/dot system has no legend anywhere
**Severity: B — Class: SAFE**

`ManualBuilderScreen.js:92-176` (`PlanBalanceCard`): every muscle a plan
trains renders as a coloured dot glyph — `●` (filled, green "good"/"high" or
red "over"), `◐` (half, amber "low"), `○` (hollow, "none") — via `STATUS_DOT`
/ `STATUS_COLOR` (lines 93-106). Explanatory text (`warnings`/`overloaded`
blocks, lines 143-173) **only renders when a muscle is flagged low, missing,
or over** — the common case of a well-balanced plan (all green dots) ships
with a header reading only "Plan balance" (line 126) and a grid of coloured
glyphs, no legend, no `InfoTooltip`, no key anywhere in the file or its
styles. A first-time builder — exactly the audience for this screen, since
it is the one place a novice assembles their own plan — has no way to learn
what the dots mean unless they happen to trigger a warning. This is the
single most novel, differentiator-grade surface in the builder (per
`ASSESSMENT.md` §3, "a genuine differentiator no mainstream builder has")
and it is the one place in that flow that fails the brief's "self-explanatory
in 2 seconds" test outright for a beginner.

**Proposed change:** add one `InfoTooltip` beside the "Plan balance" header
(matching the pattern already used everywhere else in the app, e.g.
`SetEntry.js:325`), with a short gloss reusing/extending the existing
`GLOSSARY.volumeBands` string ("How much you've trained a muscle this week
vs the helpful range...") so the dot legend is one tap away. No new design
system, no engine change, no jargon term introduced that isn't already
glossed elsewhere.

### NV-2 — "Superset" is unexplained jargon in the plan builder, unlike the excellent in-session teaching moment
**Severity: B — Class: SAFE**

`ActiveWorkoutScreen.js:2672-2736` has a genuinely well-built first-timer
teaching modal: "Superset coming up" / "Two exercises paired back-to-back
with no rest between them," a 4-step plain-English walkthrough, and an easy
out ("Unlink", "Swap exercise") — explicitly commented as "Educational for
first-timers" (`:2672-2675`). But that teaching moment only fires **during a
live session**, on an exercise that is already part of a pre-built plan. A
novice **building their own plan** in `ManualBuilderScreen.js` meets the same
word with zero explanation: the exercise-row `accessibilityHint` reads "Tap
to select for a superset, hold to remove" (`:938`), the action button reads
"Group N into superset" (`:1046`), and the resulting chip reads "Superset A"
(`:953`) — none of these sit near an `InfoTooltip`, and `coachGlossary.js`'s
`GLOSSARY` map has no `superset` key at all. A beginner who opens the builder
before ever running a session (a real path: Free tier's builder is available
without a plan) hits this term cold, with no equivalent of the session-time
walkthrough available to fall back on.

**Proposed change:** add a `superset` entry to `GLOSSARY` (one sentence,
matching the existing register — e.g. "Two exercises done back-to-back with
no rest between them, then a full rest before repeating.") and one
`InfoTooltip` on the "Group N into superset" affordance in
`ManualBuilderScreen.js`. Purely additive; the ActiveWorkout teaching modal
is untouched.

### NV-3 — "Setting your starting volume" is unexplained jargon at the single highest-attention moment of onboarding
**Severity: C — Class: SAFE**

`ProOnboardingScreen.js:688-694` (`sequenceStages`): the plan-build animation
— the moment a brand-new user watches the app "think" for the first time,
arguably the highest-attention beat in the entire onboarding arc — names its
second stage "Setting your starting volume" (or "Setting your starting
volume - {Division} priorities" when a division is set). "Volume" here is
resistance-training jargon (total weekly work per muscle) that a user who
has "never lifted" (this lane's persona) has had zero prior exposure to at
this point in the flow — Stage 1 cold-start, per
`COACHING_VOICE_SYNTHESIS_LOCKED.md` §2, is exactly the register where "the
only currency that builds trust... is accuracy of observation," and jargon
undercuts that. The word already has a plain-English gloss in the app's own
glossary (`coachGlossary.js`: `volume: 'The total work for a muscle: the hard
sets you do for it in a week.'`), it just isn't used here — and can't be, via
`InfoTooltip`, since this is a transient ~800ms animated caption, not a
static screen with room for a tap target.

**Proposed change:** reword the caption to the plain-mechanism register the
rest of the app already uses (Pattern 10, `COACHING_VOICE_SYNTHESIS_LOCKED.md`
§3) — e.g. "Setting how much you'll train each muscle" — no meaning lost,
matches the honest, real-phase-tied nature of the sequence (`facts-onboarding.md`
already praises this animation as non-theatrical), touches only a caption
string, not `ONBOARDING_SEQUENCE_LOCKED.md` (checked: this animation's copy
is not part of that doc's locked verbatim text).

### NV-4 — No baseline "what's a set / what's a rep" explainer exists anywhere, for the exact persona this audit targets
**Severity: C — Class: SAFE**

Grepped the full first-run and logging path: `GLOSSARY` (`coachGlossary.js`)
glosses `volume`, `deload`, `rir`, `mesocycle`, `estMax` and nine other terms,
but has no entry for the words "set" or "rep" themselves — the single most
foundational vocabulary in the entire product. Every surface that names them
assumes the reader already knows: the Home welcome card's own instructional
copy is "Tap Start workout and log each set as you go"
(`HomeScreen.js:1664`, already praised by `coverage-05-first-run.md` as
"instructional only"); `SetEntry.js`'s labels are "Weight (kg)" and "Reps"
with no definition. For the "never lifted, non-trainer" persona this lane's
brief explicitly names, this is the one piece of jargon more basic than
anything currently glossed, and it is the literal first word the app asks
the user to act on. This is a genuinely minor gap — most fitness apps make
the same assumption, and the rest of the product's onboarding is unusually
careful — but it is a real, cheap gap against this specific brief.

**Proposed change:** a single inline one-line note, shown once, on the very
first exercise card of the very first-ever logged workout only (gated the
same way the "Welcome to Volyume" card already gates on `totalSessions === 0`)
— e.g. "A set is one round of reps, then a rest, then the next set." No
modal, no new component family: reuse the existing dismissible-instructional-
card pattern already proven on Home.

---

## Already delights (no change proposed — protect these)

- **The two daily loops are already near-optimal.** One-tap set logging with
  real-history pre-fill; one-tap meal re-logging via slot-specific "usuals"
  chips with zero screen changes. This is the product's actual moat against
  Hevy/Strong/MFP-style competitors and should not be touched while chasing
  polish elsewhere.
- **The "down" session verdict on `WorkoutSummaryScreen.js:928-931`** is a
  small, uncelebrated piece of genuinely excellent psychology: a below-
  average session is rendered in **neutral grey** (`colors.textSecondary`,
  not red/error) with the line "Sessions vary with recovery, sleep and
  stress. The 4-week trend carries more signal than any single session." —
  externalising the variance rather than making the user feel they failed,
  matching the locked voice doc's Pattern 4 even on a surface that isn't one
  of its eight formally locked surfaces. This is the kind of moment a user
  notices and tells a friend about ("it didn't make me feel bad about an off
  day").
- **`activationNudge.js`'s own header comment says it best**: "Copy is
  forward-looking and never shames (no 'you missed', no 'behind', no
  streaks)" — verified true by reading the module; the early-stall
  re-engagement lever never once uses guilt language, and is tier-blind so
  it isn't a paywall lever in disguise.
- **The Free-tier plan quiz (`freeStarter.js:24-49`)** is a model of
  jargon-free, icon-plus-plain-label onboarding: "What do you want from
  training?" / "Build muscle" / "Get stronger" / "General fitness" — zero
  training vocabulary before the user even has a plan.
- **Beginner-tagged plans in `seedRoutines.js`** (`Beginner Full Body
  3×/Week`, `Home: No Equipment`, `Women's Full Body Foundation`) carry
  genuinely warm, competence-building descriptions — "the fastest way to get
  stronger when you are starting out," "a good starting point if you are
  completely new to training" — and `PlanLibraryScreen.js`'s
  `sortBeginnerFirst` (line 138) puts these ahead of the jargon-named
  intermediate/advanced plans (`Push Pull Legs 6×/Week`, `4-Day Muscle
  Building Bro Split`) by default, so a novice browsing the library is
  steered towards plain language before they ever meet gym-culture shorthand.
- **The superset heads-up modal in `ActiveWorkoutScreen.js`** (see NV-2) is,
  on its own terms, an excellent piece of first-timer teaching: a 4-step
  plain-English walkthrough plus an easy "not today" escape (unlink/swap).
  The only gap is that the builder doesn't have its own copy of it (NV-2).
- **Every empty state read for this lane teaches rather than dead-ends**:
  `AnalyticsScreen.js:506-519` ("No training trends yet... Body metrics,
  progress photos and scans are still available below," stepping up to "Good
  start" encouragement at 1-2 sessions), the free-tier no-plan starter card,
  and the Diary's copy-yesterday/copy-a-day recovery paths all point
  somewhere rather than stopping.
- **No streak-pressure or shame drift found anywhere in this pass.** Grepped
  broadly for "streak"/mood-judgement language across screens; the one
  streak feature that exists (`WeeklyStreakStrip`) is explicitly framed as
  "weeks of showing up... no comparison, no rank" (`AnalyticsScreen.js:37-44`),
  and a guard test (`progressScanIntegrationTone.guard.test.js`) hard-blocks
  words like "failed"/"behind"/"streak" (as a shame word)/"perfect" from ever
  reappearing in that surface's copy. The ED-safety register is intact
  everywhere this lane looked.

---

## SAFE quick wins (all four findings)

- **NV-1** — one `InfoTooltip` + reused glossary string on the Plan Balance
  card header.
- **NV-2** — one new `GLOSSARY.superset` entry + one `InfoTooltip` on the
  builder's "Group into superset" affordance.
- **NV-3** — reword one onboarding animation caption ("Setting your starting
  volume" → a plain-mechanism equivalent); no locked-doc text touched.
- **NV-4** — one dismissible, one-time inline note on the first-ever logged
  set, reusing the existing `totalSessions === 0` gating pattern already
  proven on Home's welcome card.

## Needs a decision

None. All four findings are additive copy/tooltip changes with no design,
engine, gating, or ED-safety surface implicated — no founder decision is
required to build any of them.
