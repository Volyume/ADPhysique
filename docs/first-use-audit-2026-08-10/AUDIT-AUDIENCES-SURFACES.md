# Campaign 5 — Phases 33-39: audiences, empty surfaces, copy, hierarchy, analytics, rollback

Lane: Phases **33, 34, 35, 36, 37, 38, 39** of the founder's Campaign 5
order (`c5-CAMPAIGN5-ORDER.txt` lines 407-466). Branch
`claude/campaign5-first-use`. **Audit only** — no source, test, config or
doc outside this file was modified, and nothing was committed, pushed or
stashed by this lane.

**Method.** Every claim below is read from the code on this branch and
carries `file:line` evidence. Nothing is taken from a summary, a label or
memory. Where the order asks a comprehension question ("can a novice
understand X?"), the answer quotes the rendered copy and names the surface
it renders on. The three first-use laws are applied throughout:
minimum-required-information; do-not-teach-before-use; no-false-
personalisation (Campaign 2 provenance law).

**Bounds honoured in every proposal below.** No AI, no cardio, no new
feature/social/gamification, no advanced control moved into first use,
Article 9 untouched, ED/wellbeing semantics untouched, D92-11 untouched,
billing architecture and copy founder-gated, `ONBOARDING_QUIZ_FIRST` left
off with its rollback infrastructure intact, no migration, no redesign. No
proposal in this document is a redesign, and Phase 37 deliberately proposes
no re-theme, no brand change and no design-system work.

**Overlap policy.** Where a sibling lane already owns a finding it is
cross-referenced, not restated: `C5-P1-*`
(`CURRENT-FIRST-USE-JOURNEY.md`), `C5-P13-*` / `C5-P14-*` / `C5-P15-*`
(`AUDIT-FIRST-WORKOUT.md`).

---

## 1. Summary of findings

| ID | Class | Severity | One-line claim |
|----|-------|----------|----------------|
| C5-P37-02 | DEFECT | MEDIUM | Two full-screen instructional modals can stack on the first working set: the superset heads-up and the unilateral walkthrough are independent, mutually unguarded effects on the same exercise id. |
| C5-P34-01 | DEFECT | MEDIUM | Welcome's coach gloss is dead code: the render gate is `b.includes('Coach')` but no bullet contains a capital "Coach", so `GLOSSARY.precisionCoaching` never renders on the app's first screen. |
| C5-P38-03 | DEFECT | MEDIUM | The Pro wizard emits no `onboarding_step_completed` for its final step, so "profile completed" is not measurable; the last observable wizard beat is step 5. |
| C5-P38-04 | DEFECT | MEDIUM | The entire free first-run path emits **zero** telemetry, so any onboarding funnel built on the existing events silently excludes every free-path user. |
| C5-P39-04 | DEFECT | LOW | Nothing pins `ONBOARDING_QUIZ_FIRST = false` or the dark routes' unreachability: zero matches across every `*.test.js` in `src/`. |
| C5-P35-01 | IMPROVEMENT | MEDIUM | The Progress zero-history empty state tells a free user that "Body metrics, progress photos and scans are still available below" — all three of those destinations are Pro-locked for that user. |
| C5-P36-01 | IMPROVEMENT | MEDIUM | Every Pro wizard step stacks two explanation layers that restate each other (screen header title+sub, then a QuestionGroup title+sub) before the first field. |
| C5-P36-02 | IMPROVEMENT | MEDIUM | Wizard step 6 explains the same volume/recovery idea four times in one scroll: header sub, coach card, field hint, and a tooltip the source comment says is deliberately shared by two of them. |
| C5-P36-03 | IMPROVEMENT | MEDIUM | Wizard step 3 advertises Progress Photos and the Volyume Score — features the user has not reached — inside a body-composition question; onboarding-as-advertising is an explicit non-goal. |
| C5-P37-01 | IMPROVEMENT | MEDIUM | On day 0 the first primary-filled button on Home is the morning-weight strip's "Log", rendered above the session hero's "Start workout"; two CTAs of the same visual weight, the lower-priority one first. |
| C5-P34-02 | IMPROVEMENT | MEDIUM | "PR" is unglossed on the surface a novice first meets it (the workout summary), while the authored `GLOSSARY.pr` is used only on a post-block screen. |
| C5-P33-04 | IMPROVEMENT | MEDIUM | There is no fast lane: the wizard is identical for a ten-year lifter and a novice, and the one experience-sensitive input is asked on screen 3 of 5, after it could have shortened anything. |
| C5-P35-06 | IMPROVEMENT | LOW | The coach-history empty state's "Start check-in" CTA lands a day-0 user on the "First check-in needs more data" gate every time — honest, but a guaranteed bounce. |
| C5-P34-04 | IMPROVEMENT | LOW | A novice's first exposure to "stop 2 short of failure" is a bare instruction on the Home chip; the definition is one tap behind a chevron whose accessibility label never names the term. |
| C5-P38-05 | IMPROVEMENT | LOW | Only four events fire once-only. `onboarding_step_completed` re-fires on every forward advance after a Back; `account_created` is a five-minute heuristic, not a once-per-user event. |
| C5-P33-06 | UNCERTAIN | LOW | The product's deepest training control (manual MEV/MAV/MRV overrides) has exactly one entry point, gated on `hasData`, so it is unreachable until the first set is logged. |
| C5-P38-01 | RECORD | - | No check-in-completion event exists anywhere. `weekly_coach_run` is downstream, re-runnable, and is not the check-in submission. Instrumentation gap; no telemetry proposed. |
| C5-P38-02 | RECORD | - | No block-completion event exists anywhere. Instrumentation gap; no telemetry proposed. |
| C5-P33-05 | RECORD | - | No third-party training-history import exists (only Volyume's own backup restore). Phase 33's "import if live" resolves to NOT LIVE; adding one is out of bounds. |
| C5-P39-05 | RECORD | - | The dormant quiz prefill in `ProOnboardingScreen` is rollback infrastructure, not dead code. Recorded so no later lane deletes it. |
| C5-P33-01 | CLEAN | - | The manual builder is one tap from the Train tab on day 0, for both tiers. |
| C5-P33-02 | CLEAN | - | Manual / Collaborative / Coached autonomy is reachable and each mode is described honestly, including that safety holds always force confirm-first. |
| C5-P33-03 | CLEAN | - | No forced tutorial anywhere in first use: every teaching surface is dismissible, one-time, or opened on demand. |
| C5-P34-03 | CLEAN | - | Block, recovery week and stop-short-of-failure are all defined in one sheet, one tap from Home. |
| C5-P34-05 | CLEAN | - | Rest is taught by doing, not by copy; weight and plan carry no jargon in first use. |
| C5-P35-02 | CLEAN | - | The Progress tab hides every mature-user surface at zero history, and the one locked tile states its own unlock in sessions. |
| C5-P35-03 | CLEAN | - | Every named zero-history surface distinguishes a failed load from a genuine empty, with a retry. Ten surfaces verified. |
| C5-P35-04 | CLEAN | - | The coach's zero-history state is a receipt with a named unlock date, not a dead end. |
| C5-P35-05 | CLEAN | - | Block history carries two distinct honest empties depending on whether a plan is active. |
| C5-P35-07 | CLEAN | - | Partners' day-0 state is privacy-forward and states exactly what a partner would and would not see. |
| C5-P36-05 | CLEAN | - | Article 9 copy is legal content, already progressively disclosed, and is proposed for no change. |
| C5-P36-06 | CLEAN | - | All education in first use is opt-in; there is no mandatory tutorial screen. |
| C5-P36-07 | CLEAN | - | Campaign 2's consequence-not-algorithm rule holds across first use; no provenance violation found in this lane's surfaces. |
| C5-P37-03 | CLEAN | - | Home shows at most one attention banner at a time (D14 cap). |
| C5-P37-04 | CLEAN | - | Every disabled Continue in the wizard is paired with a hint naming exactly what is missing. |
| C5-P38-06 | CLEAN | - | Telemetry privacy holds: every first-use payload is counts, flags or a small enum. Campaign 1 privacy law intact. |
| C5-P39-01 | CLEAN | - | `ONBOARDING_QUIZ_FIRST = false`; the only live reader's branch is dead. |
| C5-P39-02 | CLEAN | - | `QuizTraining` / `PlanPreview` stay registered and are unreachable: the deep-link config names only MainTabs routes, and WelcomeStack mounts only when signed out. |
| C5-P39-03 | CLEAN | - | Every piece of rollback infrastructure is present and accounted for (flag, steps, preview builder, store slice, prefill, deferred event, tests). |

**Counts: 5 DEFECT, 8 IMPROVEMENT, 1 UNCERTAIN, 4 RECORD, 19 CLEAN.**

Nothing in this lane touches ED/wellbeing semantics, Article 9, D92-11,
billing, `ONBOARDING_QUIZ_FIRST`, a migration or a redesign. Two findings
are adjacent to locked areas and are flagged in place: C5-P37-01 sits on a
weight-logging surface and on a founder-ruled layout order (see the finding
for what is and is not proposable); C5-P36-03's deletion candidate is
body-image adjacent copy.

---

## 2. Phase 33 — experienced-lifter first use

The question the order asks (lines 407-414): can a knowledgeable lifter
move quickly, are advanced controls reachable, is the manual builder
usable, can they set manual/coached modes, is history import live, and is
unit/profile setup sane — **without** anyone proposing a "beginner mode".

### 2.1 C5-P33-01 — CLEAN. The manual builder is one tap from a tab.

`PlansScreen` defines its plan-entry action cards as module constants and
both variants carry the manual path:

- Free / no active plan (`PlansScreen.js:52-58`):
  `{ id: 'manual', icon: 'create-outline', title: 'Create your own',`
  `description: 'Create a custom multi-day plan and choose every exercise yourself.', screen: 'ManualBuilder' }`
- Pro with an active plan (`PlansScreen.js:82-88`):
  `title: 'Create your own'`,
  `description: 'Create your own plan and choose every exercise. Your coach keeps adjusting whichever plan you're on.'`
  — note the second sentence, which answers the experienced user's real
  question (does building my own turn coaching off? no).

`ManualBuilder` is registered in `PlansStack`
(`RootNavigator.js:116`, `:468`) with no Pro guard, so a free user reaches
it too. `PlanDetailScreen.js:267` is the second entry (edit an existing
plan). Depth from Home for a day-0 user: Train tab → "Create your own".

### 2.2 C5-P33-02 — CLEAN. Manual / Collaborative / Coached is reachable and honest.

`SettingsCoachingScreen.js:205-238` renders the Autonomy chip row with
three keys, and the sub-line changes per mode:

- coached: `"The coach applies each week's changes for you. Anything safety-related still waits for your confirmation."`
- manual: `'The coach shows each change and the reason. You make the change yourself.'`
- collaborative: `'The coach suggests each change. You tap to apply it.'`

The block sits inside `{tier === 'pro' && (...)}` (`:220` region opens at
`:159`), which is correct — autonomy governs a Pro capability — and every
day-0 user is Pro during the trial (`cascade.js:125-132`, see
`CURRENT-FIRST-USE-JOURNEY.md` §3.3), so it is reachable from day 0. Route:
Coach tab → gear (`YouScreen.js:332`) → `Settings` → "Coaching"
(`SettingsScreen.js:42-47`) → Autonomy. Four steps, no first-use clutter —
exactly the progressive disclosure the order asks for.

Also note the tone control immediately above it
(`SettingsCoachingScreen.js:166-196`): its default is `automatic`, described
as `"The coach matches its wording to your training experience."` That is
the product's existing answer to "don't patronise me", and it is a
preference, not a mode fork. No beginner mode exists and none is proposed.

### 2.3 C5-P33-03 — CLEAN. No forced tutorial anywhere in first use.

Every teaching surface an experienced lifter meets is escapable. Verified
by enumerating the one-time-hint keys and the education routes:

| Surface | Mechanism | Evidence |
|---|---|---|
| Home welcome card | dismissible, and self-retires at `totalSessions > 0` | `HomeScreen.js:1832-1834`, `HomeWelcomeCard.js:40-47` |
| Workout info pulse | one-time; extinguished by the first logged set | `ActiveWorkoutScreen.js:975-989`, `:1465-1473` |
| Trends "Good start" note | closable, one-time key | `AnalyticsScreen.js:361-374` |
| Diary hints (food, water, mark-eaten, plan-added) | `@volyume_seen_*`, once ever | `DiaryScreen.js:2075-2085` |
| Nutrition 5-minute guide | opt-in link | `ProSetupCompleteScreen.js:316-329` |
| Methodology | opt-in link | `ProSetupCompleteScreen.js:507-518` |
| "How logging works" | opt-in overflow row | `ActiveWorkoutScreen.js:3474-3489` |
| All glossary terms | `InfoTooltip`, tap to open | `coachGlossary.js` consumers |

There is no modal an experienced user must read and no screen that blocks
on acknowledgement. The one exception class is the two auto-firing session
modals — see C5-P37-02, which is a stacking defect, not a tutorial wall.

### 2.4 C5-P33-04 — IMPROVEMENT (MEDIUM). There is no fast lane, and experience is asked too late to create one.

The Pro wizard's shape is fixed: five blocking screens, eight blocking
inputs, in the same order for every user
(`ProOnboardingScreen.js:1143-1945`; the count is established in
`CURRENT-FIRST-USE-JOURNEY.md` C5-P1-06 and is not re-derived here).

This lane's addition is *where* the one experience-sensitive input sits.
`experience` is collected on **step 4 of 6**
(`ProOnboardingScreen.js:1478-1484`, hint
`"This sets your starting volume and how complex the exercises are."`) —
after the user has already completed the baseline screen and the body-
composition screen. By the time the app learns it is talking to an
advanced lifter, three of the five screens are behind them, and the answer
changes nothing about the remaining two: `advanceFrom4` (`:701-711`) and
`advanceFrom5` (`:713-727`) branch on nothing experience-related, and
`canContinue` on steps 5 and 6 is identical for every experience level.

**Concrete user scenario.** A lifter of ten years installs Volyume. They
tap "Start your 14 days", sign in, consent, then answer name / sex / age /
height / units / weight, then a body-fat screen they skip, then finally
declare "advanced" — at which point the app still asks them, in full, how
long their sessions are, how many days a week, what equipment, what phase,
whether they compete, which weak points, which protein tier, and how their
recovery is. Nothing they said shortened anything.

**Law/phase violated.** Second first-use law (do → see result → explain
when relevant) and Phase 33's "ability to move quickly".

**Proposed minimal change (needs a D96 ruling; NOT a beginner mode, NOT a
new screen).** Two options, both purely ordering/gating, no new copy, no
new feature:
(a) move `experience` to the top of step 4 with no other change (it is
already first in that step's render order — verify and leave); or
(b) record instead that the wizard's length is Phase 5's matrix decision
and that this lane's only new evidence is the ordering fact above.
This lane recommends (b): the number of screens is Phase 5's ruling to
make on downstream-consumption evidence, and pre-empting it here would be
exactly the kind of unilateral reduction the order forbids.

### 2.5 C5-P33-05 — RECORD. No training-history import exists.

`grep -rln "importWorkouts\|csvImport\|importCsv\|Import data\|importFrom" src/`
returns nothing. The only import in the product is
`dataBackup.js:87 exportBackup()/importBackup()` — Volyume's own backup
format, reached from Settings → "Your data" (`SettingsScreen.js:129`), not
a Strong/Hevy/CSV importer.

Phase 33's conditional item "exercise history import **if live**" therefore
resolves to **NOT LIVE**. Building one is a new feature and is out of
bounds for Campaign 5 (order line 58). Recorded, not proposed.

Consequence for the experienced lifter, stated plainly so a later lane does
not have to rediscover it: an advanced user arrives with zero history like
everyone else, so every zero-history behaviour audited in Phase 35 and
every "we don't know your strength yet" behaviour audited by the
first-workout lane applies to them identically.

### 2.6 C5-P33-06 — UNCERTAIN (LOW). The deepest training control is unreachable until the first set lands.

Manual volume-landmark overrides (`mergeLandmarkPrecedence`'s `manual`
layer, `effectiveLandmarks.js:42-51` — the one thing that outranks both the
adaptive layer and research) are edited on `VolumeHeatmapScreen`
(`VolumeHeatmapScreen.js:89`, `:273`).

`VolumeHeatmap` has exactly one entry point in the whole app:
`AnalyticsScreen.js:743`, inside the "This week's volume" section, which is
wrapped in `{hasData && (...)}` at `AnalyticsScreen.js:730` where
`hasData = allSets.length > 0` (`useProgressData.js:502`). Verified by
`grep -rn "navigate('VolumeHeatmap'" src/` — one hit.

So before a single set is logged there is no path to the manual landmark
editor at all.

**Why UNCERTAIN rather than a defect.** The order pulls both ways: Phase 33
says "advanced controls remain reachable", Phase 10 says "advanced volume
controls stay advanced", and the campaign's hard bounds say no advanced
control may be exposed during first use. Gating a landmark editor on there
being data to edit is defensible. Evidence attached; **no change proposed
by this lane** — surfacing it earlier would breach the campaign's own
bounds.

### 2.7 Unit / profile setup for the experienced user

Covered by Phase 9's lane. This lane records only the reachability fact:
body-weight unit and default rest timer are editable post-onboarding at
Settings → "Workout & units" (`SettingsScreen.js:53-58`,
`sub="Body weight unit, default rest timer and rest alerts"`), so an
experienced user who accepted the wizard's `st` default (see
`CURRENT-FIRST-USE-JOURNEY.md` §6) has a named, one-page route to change
it.

---

## 3. Phase 34 — novice first use

The order (lines 417-423): a basic but inexperienced gym user should
understand **set, rep, weight, rest, stop-short-of-failure, plan, block,
recovery week, PR** — with no new video or media features. Execution media
stays out of scope, and nothing below proposes any.

### 3.1 The vocabulary map, term by term, from code

| Term | Defined? | Where the definition renders | First place a novice meets the word | Verdict |
|---|---|---|---|---|
| set | yes, `coachGlossary.js:82-83` | one consumer only: `ActiveWorkoutScreen.js:3481`, inside an `appAlert` behind the overflow "How logging works" row | the live session's set card | see C5-P13-03 (sibling lane) |
| rep | yes, `coachGlossary.js:84-85` | same single consumer | the live session's set card | see C5-P13-03 |
| weight | n/a — plain word | — | wizard step 2 and the set card | CLEAN |
| rest | not defined, taught by doing | `RestTimer.js:268` "Rest timer started", `:314` "Rest over. Start your next set." | after the first logged set | CLEAN (C5-P34-05) |
| stop short of failure | yes, `coachGlossary.js:45-46` (`rir`) | `HomeBlockShapeSheet.js:66` | the Home block chip, day 0 | CLEAN with a caveat (C5-P34-04) |
| plan | n/a — plain word throughout | — | Welcome, Plans tab | CLEAN (C5-P34-06) |
| block | yes, `coachGlossary.js:40-41` (`mesocycle`) | `HomeBlockShapeSheet.js:61` | the Home block chip | CLEAN (C5-P34-03) |
| recovery week | yes, `coachGlossary.js:15-16` (`deload`) | `HomeBlockShapeSheet.js:65`, plus `MesocycleBuilderScreen.js:298-308` tooltip | the Home block chip | CLEAN (C5-P34-03) |
| PR | yes, `coachGlossary.js:28-29` | `BlockReflectionScreen.js:260` **only** | `WorkoutSummaryScreen.js:1306` after session 1 | C5-P34-02 |
| coach / Precision Coaching | yes, `coachGlossary.js:11-12` | intended on `WelcomeScreen.js:110` — **never renders** | Welcome, screen 1 | C5-P34-01 |

Verified by `grep -rn "GLOSSARY\." src/ --include="*.js"` excluding
`coachGlossary.js` and `__tests__`.

### 3.2 C5-P34-01 — DEFECT (MEDIUM). The coach gloss on Welcome is dead code.

`WelcomeScreen.js:103-114` maps the trial bullets and attaches the gloss
conditionally:

```js
// WelcomeScreen.js:108-111
{/* U-E-1: inline gloss for the coach term on first appearance. */}
{b.includes('Coach') && (
  <InfoTooltip text={GLOSSARY.precisionCoaching} size={13} />
)}
```

The bullets it maps over are (`WelcomeScreen.js:26-31`):

```js
const TRIAL_BULLETS = [
  'A plan built around your schedule, goals, and experience level.',
  'Your training and nutrition adjust as your body responds.',
  'Personalised calorie and protein targets, updated as your goals change.',
  'Your coach explains what changed, what stayed the same, and why.',
];
```

`String.prototype.includes` is case-sensitive. The fourth bullet contains
`coach`, lower-case. **No bullet contains `Coach`, so the condition is
never true and the tooltip is never rendered.** The comment's own stated
intent — "inline gloss for the coach term on first appearance" — is not
delivered.

**Concrete user scenario.** A novice opens Volyume for the first time. The
hero card promises "Your coach explains what changed, what stayed the same,
and why." They have no idea what "your coach" is — an app feature? a
person? an AI? — and there is no affordance to find out. They tap through
to sign-up carrying that uncertainty. The gloss that would have answered it
(`'Every week it reads your weight trend, check-in and training, compares
what happened to what was expected, and explains the decision. Nothing is
random.'`) exists, is founder-signed-off, and is one character away from
rendering.

**Proposed minimal fix (single condition, no copy change, no new
component).** Make the gate case-insensitive or match the actual word, e.g.
`b.toLowerCase().includes('coach')`. Nothing else changes: the tooltip
primitive, the gloss string and the layout are already in place.

**Law/phase.** Phase 34 (a core term unexplained at first encounter);
Campaign 2's explanation architecture, whose intended call site this is.

### 3.3 C5-P34-02 — IMPROVEMENT (MEDIUM). "PR" is unglossed where a novice first meets it.

`GLOSSARY.pr` (`coachGlossary.js:25-29`) was authored by Campaign 2
specifically as "the app's most-repeated achievement term finally gets its
definition". It has **one** consumer: `BlockReflectionScreen.js:260`, a
screen only reachable after a training block has finished
(`MesocycleBuilderScreen.js:277-289` "View block summary" on a non-active
block).

The novice's actual first exposures, in chronological order:

1. **During the first session** — `PRCelebration.js:210-212` labels are
   plain English and contain no abbreviation:
   `'First lift logged'`, `'New estimated max lift'`,
   `'New heaviest weight'`, `'Most reps at weight'`. This is good and
   should not change.
2. **Immediately after the first session** — `WorkoutSummaryScreen.js:1301-1310`
   renders `{detectedPRs.length} new PR{...'s'}` beside a trophy icon,
   with no tooltip anywhere in that row.
3. Later, once trends unlock, `AnalyticsScreen.js:443` `label="New PRs"` on
   a spark card (gated behind `enoughForTrends`, `:429`, so not a day-0
   surface).

So the first time the abbreviation appears at all, it appears bare.

**Concrete user scenario.** A novice completes their very first session.
The summary says "2 new PRs - Barbell Bench Press, Lat Pulldown". They have
never trained before; they do not know what a PR is, why two of them
happened on day one, or whether it means something good or something they
did wrong. The definition that answers all three
(`"...It can be your heaviest weight, your most reps at a weight, or a new
estimated max. Any of the three counts, and it never needs a one-rep max
attempt."`) exists and is not attached.

**Proposed minimal fix.** Attach the existing `InfoTooltip` +
`GLOSSARY.pr` to the summary's PR row, using the identical pattern already
shipping at `BlockReflectionScreen.js:260`. No new copy, no new component,
no PR-maths change (PR semantics are C5-P15-02's territory in the sibling
lane and are untouched by this).

**Law/phase.** Phase 34 vocabulary; Campaign 2's one-meaning-everywhere
rule, which currently holds in the glossary but not on the surface.

### 3.4 C5-P34-03 — CLEAN. Block, recovery week and effort are defined one tap from Home.

`HomeBlockShapeSheet.js:61-66` renders three authored glosses in sequence
plus one authored bridge sentence:

- `GLOSSARY.mesocycle` — "A training block: a few weeks that ease in, build, push, then recover."
- the bridge (`:62-64`) — "Effort builds a little each week so your body keeps adapting, then the recovery week lets it catch up. How each muscle responds can shape where your next block starts."
- `GLOSSARY.deload` — "A lighter planned week so you recover: lighter loads, full recovery, no PRs."
- `GLOSSARY.rir` — "Reps in reserve: ... 'stop 2 short' means finish the set when you believe you could still do about 2 good reps. Most weeks leave reps in reserve, building effort as the block goes on, so progress never depends on taking every set to failure."

The sheet opens from the readiness chip on the session hero
(`HomeScreen.js:1876-1889`), which is whole-tappable, carries a
chevron-forward affordance (`:1888`), and is present on day 0 whenever a
block exists. The sheet is mounted at `HomeScreen.js:2113-2119`.

Note the provenance discipline in the bridge sentence: "**can** shape where
your next block starts" — future/conditional, never a claim about history
the app does not have. Third first-use law satisfied.

### 3.5 C5-P34-04 — IMPROVEMENT (LOW). The stop-short-of-failure instruction arrives before its definition, with an unnamed door.

`readinessSummary.js:98-103` is the day-0 default branch:

```js
const rirBit = currentMesoWeek.rirTarget != null ? ` - stop ${currentMesoWeek.rirTarget} short of failure` : '';
return { tone: 'go', line: `Week ${currentMesoWeek.weekIndex} of ${currentMesoWeek.plannedWeeks ?? '-'}${rirBit}` };
```

So the very first thing a brand-new user reads about how hard to train is
the chip text **"Week 1 of 6 - stop 2 short of failure"**. The definition
is behind that chip, which is correct progressive disclosure — but the
chip's accessibility label is
`"See the shape of your training block"` (`HomeScreen.js:1878`), which
names the block, not the effort instruction. A sighted novice sees a
chevron; a screen-reader novice hears an offer to explain "the shape of
your training block" and has no reason to think it will explain the phrase
that just confused them.

**Concrete user scenario.** A novice's first session. The chip told them to
"stop 2 short of failure". They do not know what failure means in this
context, or how you would know you had two reps left. They tap Start
workout without tapping the chip, because nothing indicated the chip was
the explanation.

**Proposed minimal fix.** Extend the existing accessibility label to name
what the sheet actually contains — one string, no layout change, no new
surface, e.g. appending "and what the effort target means". Alternatively
record as accepted and let Phase 13's affordance ruling cover it.

**Law/phase.** Second first-use law (explain when relevant — the moment IS
relevant, the door is just unlabelled); Phase 34.

### 3.6 C5-P34-05 / C5-P34-06 — CLEAN. Rest, weight and plan.

- **Rest** is never defined in prose and does not need to be: the rest
  timer is a do-then-see surface. `RestTimer.js:268` announces "Rest timer
  started" on start and `:314` "Rest over. Start your next set." on
  completion. The notification channel description is equally plain:
  `"A single alert when your rest between sets ends"`
  (`notifications/channels.js:60`). A novice learns what rest is by having
  one. This is the second first-use law working correctly.
- **Weight** appears only as a plain word, disambiguated by its label
  everywhere it could be confused: `"Morning weight"` on the Home strip
  (`TodayStrip.js:184`, `:212`, `:236`) versus the set card's weight field
  in the live session. No finding.
- **Plan** is used as a plain English noun throughout first use. The
  technical synonym is confined to the glossary and its tooltip: a grep of
  `mesocycle|MEV|MRV|deload|hypertroph` over Welcome, Login, Article 9,
  FirstRun, FreeStarter, ProOnboarding, ProSetupComplete and
  HomeWelcomeCard returns zero user-facing matches (independently confirms
  `C5-P1-13`).

### 3.7 C5-P34-07 — cross-reference. set / rep.

The deferred Campaign 2 item is owned by the first-workout lane as
`C5-P13-03` (`AUDIT-FIRST-WORKOUT.md:242-295`). This lane independently
confirms the underlying call-site fact from the opposite direction —
scanning glossary consumers rather than the workout screen —
and reaches the same result:

`grep -rn "GLOSSARY.set\b\|GLOSSARY\.rep\b" src/` returns exactly one
non-test hit, `ActiveWorkoutScreen.js:3481`, where both strings are
concatenated into an `appAlert` body opened from the overflow menu's "How
logging works" row (`:3474-3489`). There is no tooltip, no inline gloss,
and no other surface in the product where either word is defined.

No new media feature is proposed here or anywhere in this lane.

---

## 4. Phase 35 — empty / zero-history states

Walked as a day-0 user (account, profile, active plan, zero sessions, zero
PRs, zero check-ins, zero weigh-ins, zero photos, zero food), across every
surface the order names: Progress, records, lift charts, bodyweight trend,
coach history, block history, partners, photos, food insights — plus the
diary and plans surfaces a day-0 user actually reaches.

### 4.1 C5-P35-01 — IMPROVEMENT (MEDIUM). The Progress empty state advertises three locked destinations to a free user.

`AnalyticsScreen.js:571-577`:

```js
{!loading && !loadError && allSets.length === 0 && (
  <EmptyState
    icon="analytics-outline"
    title="No training trends yet"
    text="Training charts appear here once sessions are logged. Body metrics, progress photos and scans are still available below."
  />
)}
```

For a Pro/trial user that sentence is true. For a **free** user, all three
named destinations are locked:

- **Body metrics** — the tile renders with `pro={tier !== 'pro'}`
  (`AnalyticsScreen.js:807`), and the route is wrapped in
  `withReadOnlyProGuard` whose history probe is
  `getBodyMetricLog(userId, 1)` (`RootNavigator.js:223`). A day-0 user has
  no body-metric rows, so the probe fails and they get the hard
  `ProLocked` gate.
- **Progress photos** — same shape: `pro={tier !== 'pro'}`
  (`AnalyticsScreen.js:659`), `withReadOnlyProGuard` with
  `photosViewableBy(userId)` (`RootNavigator.js:224`); zero photos means
  the hard gate.
- **Scans** — the Volyume Score progress-photo scan
  (`progressScanAnalysis.js`), which lives *inside* Progress photos, so it
  inherits the same lock. It also has no tile of its own, so "scans ...
  below" names nothing a user can point at even when unlocked.

**Concrete user scenario.** A user finishes the 14-day trial without
subscribing, or lands on the free path because the cascade failed (the
exception path documented at `CURRENT-FIRST-USE-JOURNEY.md` §3.3). They
open Progress with no sessions logged. The screen tells them body metrics,
progress photos and scans are available below. They scroll down, tap
"Progress photos", and hit an upgrade wall. The one piece of copy on an
otherwise empty screen was a promise the tier cannot keep.

**Proposed minimal fix (copy only, no gating change, no tier-scope
change).** Either tier-gate the second sentence, or reword it to what is
true for both tiers — the free-safe destinations on that screen are
Consistency, Lifts and Full History (`AnalyticsScreen.js:799-810`, none
carry `pro`). Free/Pro scope is untouched either way; this is purely
making the sentence match the gate that already exists.

**Law/phase.** Phase 35 ("do not advertise advanced features prematurely")
and Phase 7 (Free must not feel like a broken Pro demo).

### 4.2 C5-P35-02 — CLEAN. The Progress tab hides every mature-user surface at zero history.

Verified gate by gate for `completedWorkoutCount === 0` /
`allSets.length === 0`:

| Surface | Gate | Evidence |
|---|---|---|
| Training-load hero + Sessions/New PRs spark cards | `enoughForTrends` | `AnalyticsScreen.js:429` |
| Weekly streak strip | `weeklyStreak.render` self-hides for a brand-new user | `:455-457` |
| Monthly recap nudge card | `completedWorkoutCount < 10` forces hidden | `:349-355` |
| "Good start" momentum note | requires `allSets.length > 0` | `:400-404` |
| Weight trend card | `tier === 'pro' && weightTrend.render` (needs morning weights) | `:668` |
| Recent sessions | `recentSessions.length > 0` | `:679` |
| This week's volume strip | `hasData` | `:730` |
| Lifetime totals | `hasData && completedWorkoutCount > 0` | `:761` |
| Year of Lifts tile | hidden entirely until a year has elapsed | `:842-855` |

The one deliberately-visible locked tile states its own unlock in the
product's own units and does not dead-end on tap
(`AnalyticsScreen.js:813-840`): label "Recaps", `lockedSub` = `"10 sessions to go"`,
and a tap shows a toast — `"Your first monthly recap is ready after 10
logged sessions. 10 to go."` — rather than a blocking alert. That is a
model empty-state affordance: honest, countable, non-punitive.

### 4.3 C5-P35-03 — CLEAN. Every zero-history surface separates "failed to load" from "genuinely empty".

This is the single strongest empty-state property in the product and it
holds on every surface the order names. Ten verified:

| Surface | Failed-load state | Genuine-empty state |
|---|---|---|
| Progress | `AnalyticsScreen.js:559-568` "Couldn't load your training trends" + Retry | `:571-577` |
| Body metrics | `BodyMetricsScreen.js:1232-1242` "Couldn't load body metrics ... Nothing you've logged has been lost." | `:1244-1251` |
| Lift charts / records | `LiftProgressScreen.js:503-512` "Your workout history is safe. This is a loading problem, not lost data." | `:513-527` |
| Consistency | `ConsistencyScreen.js:88-97` | `:99-106` |
| Block history summary | `BlockReflectionScreen.js:194-203` | `:205-213` |
| Coach output | `CoachOutputScreen.js:907-925` `LoadErrorView`, explicitly "Distinct from InsufficientDataView so a transient error never masquerades as 'you haven't logged enough'" (`:905-906`) | `:853-889` |
| Diary | `DiaryScreen.js:1538-1552` "Couldn't load this day ... Nothing has been lost." | `:1553-1568` |
| Food insights | `FoodInsightsScreen.js:384-391` | `:467-470` "Log at least two days to see your calorie trend." |
| Partners | `PartnerScreen.js:1048-1062` "we will check again without changing anything you have shared" | `:1126-1140` |
| Progress photos | `ProgressPhotosScreen.js:1660-1670` "Volyume has not deleted or changed your photo library." | `:1672-1679` |
| Plans | `PlansScreen.js:902-916` "Check your connection and try again. Nothing has been lost." | `:966-982` / `:983-990` |

Not one of these makes the product feel broken, and each failure line
carries an explicit reassurance that no data was lost — the calm-voice rule
applied consistently.

### 4.4 C5-P35-04 — CLEAN. The coach's zero-history state is a receipt, not a wall.

`CoachOutputScreen.js:853-889` renders `InsufficientDataView`: the title is
`"Building your baseline."`, followed by the ledger's own tick-list rows
(`:870-884`, each row a real unlock condition with a done/not-done marker),
then the rule itself:

> "Your coach reads your training and weight from day one. It holds calorie
> and volume changes until it has about two weeks of weigh-ins plus a
> check-in, so it moves on a real trend rather than one noisy week. Keep
> logging sessions, your morning weight, and your weekly check-in. The
> first adjustment lands once the trend is clear."

Provenance-clean (states what it does *not yet* know), consequence-not-
algorithm, and it names the unlock. No finding.

### 4.5 C5-P35-05 — CLEAN. Block history.

`MesocycleBuilderScreen.js:326-340` branches on whether a plan is active:

- with a plan: title `'No block running yet'`, body
  `'Your plan is active and ready to train. A training block adds week-by-week tracking on top, and one starts when you activate a plan.'`
- without: title `'Your training blocks start here'`, body
  `'Training blocks start when you activate a plan. Activate one to track week-by-week progress across a training phase.'`

Both state the causal rule ("one starts when you activate a plan"), which
is exactly the Phase 10 question "does starting a plan start a training
block?" answered in the empty state. The "Past blocks" heading only renders
when a non-active block exists (`:251-253`), so a day-0 user never sees an
empty history section.

### 4.6 C5-P35-06 — IMPROVEMENT (LOW). The coach-history empty offers a CTA that always bounces on day 0.

`CoachHeldHistoryScreen.js:198-207`:

```js
<EmptyState
  icon="book-outline"
  title="No entries yet"
  text="After your first weekly check-in, decisions and holds will appear here."
  actionLabel="Start check-in"
  onAction={() => navigation?.navigate('WeeklyCheckIn')}
  compact
/>
```

On day 0 that navigation always lands on the check-in's own gate
(`WeeklyCheckInScreen.js:1461-1473`), because the first check-in requires
`FIRST_CHECKIN_MIN_DAYS = 5` days of data (`trialActivation.js:23`):

> "First check-in needs more data — Your coach needs at least 5 days of
> data before the first weekly check-in. ... Log your first morning weight
> from the Today tab to start the baseline. Once the baseline is ready,
> your first check-in opens on your scheduled day: Sunday."

The gate copy is excellent and the user is not stranded (a "Got it" button
returns them). But the empty state's own text already says "After your
first weekly check-in", so the CTA it then offers contradicts its own
sentence for the entire period the empty state is visible.

**Proposed minimal fix.** Drop the CTA from this empty state (the text
already tells the user what unlocks it), or leave it and record as
accepted. Either way this is copy/props only — no gate change, and the
check-in gate itself is not touched.

### 4.7 C5-P35-07 — CLEAN. Partners day-0.

`PartnerScreen.js:1126-1140`: title `'Train with a partner'`, body:

> "Pair with one person you already train with. They see whether you
> trained this week, one daily cheer and only the updates you choose to
> send. Food, photos, body metrics and notes stay private."

The empty state leads with the privacy boundary rather than the feature
pitch, which is the right register for a day-0 social surface and is
consistent with the GDPR posture. No finding.

### 4.8 Photos and food insights, day 0

- **Progress photos** (`ProgressPhotosScreen.js:1672-1679`): title
  `'No saved photos yet'`, body `'Add front, back and side photos to
  start.\n\nThe scale can't tell muscle from water. Photos can.'` No CTA on
  the empty state itself — deliberate, because the capture action lives in
  the screen hero (`:1643-1646` comment: "The write actions live in the
  hero so capture and scoring are not duplicated in the header"). Verified
  not a dead end. Body-image register is neutral: no target, no praise, no
  shame.
- **Food insights** (`FoodInsightsScreen.js:467-470`): `'Log at least two
  days to see your calorie trend.'` States the exact threshold. The
  period-average block self-hides when `periodAvg` is null (`:398`), so a
  day-0 user sees no fabricated average. The screen is reached only from
  the diary's tools sheet (`DiaryScreen.js:2000` — the single entry point),
  so it is not something a day-0 user stumbles into.
- **Diary** (`DiaryScreen.js:1553-1568` → `EmptyDiary`): body is the frozen
  constant `EMPTY_DIARY_COPY = 'Nothing logged for this day yet.'`
  (`components/food/EmptyDiary.js:17`), plus a meal-builder row whose copy
  pre-empts the obvious worry — `'Build a day or week from your targets.
  Nothing is logged until you add it.'` (`:46`). Clean.

---

## 5. Phase 36 — first-use copy density

The order (lines 433-440): measure qualitatively how much explanatory copy
appears **before the first completed workout**; look for repeated
explanations, multiple surfaces teaching the same thing, overlong cards,
nested tooltips, unnecessary methodology content. Campaign 2's rule stands
(explain the consequence, not the algorithm). Delete redundant explanation.
**Do not strip necessary safety or legal copy** — and none is proposed for
deletion below.

### 5.1 The measurement

Method: for each screen on the default (Pro) path before the first
completed workout, every rendered non-label explanatory string was read
from source and counted by hand. Word counts are approximate (±2) because
some strings interpolate; block counts are exact.

| # | Screen | Explanatory blocks | ≈ words | Tooltips | Notes |
|---|---|---|---|---|---|
| 1 | Welcome | 11 (tagline, card sub, 4 trial bullets, trial note, free sub, 4 free bullets counted as 1 block, 3 trust chips) | ~120 | 0 rendered (1 intended — C5-P34-01) | `WelcomeScreen.js:26-38,81,95-97,116-120,137-138,164-170` |
| 2 | Login | 1 (tagline) + 1 transient ("Waiting for Google or Apple…") | ~10 | 0 | `LoginScreen.js:175,199-206` |
| 3 | Article 9 | ~20 | ~350 | 0 | **legal — untouched, see C5-P36-05** |
| 4 | Wizard step 2 | 5 (header sub, group sub, 3 field hints) | ~58 | 0 | `ProOnboardingScreen.js:1169-1176,1195,…` |
| 5 | Wizard step 3 | 2 (header sub, group sub) | ~32 | 1 (`bodyFatMethod`) | `:1395-1403,1428` |
| 6 | Wizard step 4 | 4 (header sub, group sub, 2 hints) | ~52 | 1 (`volume`) | `:1467-1475,1480,1514,1481` |
| 7 | Wizard step 5 | 5 (header sub, group sub, 2 hints, provisional-kcal line) | ~77 | 3 (`phase`, `division`, `proteinTier`) | `:1589-1600,1605,1625,1613-1615,1671` |
| 8 | Wizard step 6 | 7 (header sub, coach card, dropdown hint, reminders hint, 2 notification subs, continue hint) | ~103 | 1 (`volume`) | `:1794-1830,1929` |
| 8b | Build sequence | 4 animated stage lines + 1 sub | ~30 | 0 | `:729-748,1782-1785` |
| 9 | ProSetupComplete | 8 (receipt line, 3 ready chips, card 1 body, targets note, card 3 sub, card 4 × 3 paragraphs) | ~180 | 0 | `ProSetupCompleteScreen.js:255-289,292-296,363-366,…,474-505` |
| 10 | Home (day 0) | 4 (welcome card × 2 steps, hero readiness chip, weigh-in strip labels) | ~50 | 0 | `HomeWelcomeCard.js:52-60`, `HomeScreen.js:1886`, `TodayStrip.js:212-213` |
| 11 | Readiness sheet | 1 | ~30 | 0 | `HomeScreen.js:2150-2189` |

**Total before the first workout even starts: ≈ 1,090 words across 11
screens**, of which ~350 is Article 9 legal content that must not be
touched and ~120 is Welcome's value proposition. That leaves roughly **600
words of onboarding explanation** in the wizard plus the setup-complete
screen — the addressable surface.

### 5.2 C5-P36-01 — IMPROVEMENT (MEDIUM). Every wizard step states its purpose twice before the first field.

Each step renders `ProOnboardingHeader` (title + sub) immediately followed
by a `QuestionGroup` (title + sub) — and `QuestionGroup` renders both
(`ProOnboardingScreen.js:268-285`, `:278-279`). The pairs, in full:

| Step | Header title / sub | QuestionGroup title / sub | Evidence |
|---|---|---|---|
| 2 | "Set your starting baseline" / "These details let the app set a safe starting baseline without guessing." | "Required details" / "Name, sex, age, height and body weight are the minimum safe inputs for your first targets." | `:1169-1176` |
| 3 | "Add your starting body composition" / "An honest estimate sharpens your first plan. Skip this if you are not sure." | "Starting body composition" / "Your best current estimate helps the first plan. Progress Photos can refine physique change later with your Volyume Score." | `:1395-1403` |
| 4 | "Shape your training week" / "The plan should fit your real week, not the week you wish you had." | "Plan fit" / "These answers choose the starting split, exercise pool and weekly workload." | `:1467-1475` |
| 5 | "Set your training focus" / "Your goal sets the calorie direction, training bias and nutrition target." | "Goal and targets" / "Start with the broad goal. Competitive category and weak points are optional refinements." | `:1589-1600` |

Steps 2 and 3 are the clearest duplication: "set a safe starting baseline
without guessing" and "the minimum safe inputs for your first targets" are
the same sentence twice; "An honest estimate sharpens your first plan" and
"Your best current estimate helps the first plan" are the same sentence
twice, five lines apart, on a screen with two fields.

**Concrete user scenario.** A new user reaches step 2. Before the first
input they read four lines of framing — a title, a sub, a second title, and
a second sub — three of which say "this is the safe minimum for your
targets". They scroll past all of it to reach "First name". The screen
teaches nothing the second time it teaches it, and the wizard does this on
four consecutive screens.

**Deletion candidates (copy only, no structural change, no field change).**
The four `QuestionGroup` `sub` props above, or the four header `sub`
props — one layer, consistently, whichever the lead judges the better
carrier. The `QuestionGroup` icon+title row is doing real structural work
(it groups the fields) and stays. No field, gate, validation or safety hint
is proposed for removal.

**Law/phase.** Phase 36 (repeated explanations, multiple surfaces teaching
the same thing); second first-use law.

### 5.3 C5-P36-02 — IMPROVEMENT (MEDIUM). Step 6 explains one idea four times in one scroll.

On the wizard's final screen the "your recovery answer controls how much
volume your plan gives you" idea is stated four times:

1. Header sub (`:1795`): *"Recovery affects your plan volume. Reminders
   keep coaching consistent."*
2. Coach card (`:1803-1808`): title *"How your coaching works"*, body
   *"Volyume uses your morning weigh-ins and weekly check-in to shape
   coaching. Food logging helps refine it, and the app stays cautious when
   data is missing."*
3. Dropdown hint (`:1820`): *"Be honest here. This sets how much volume
   your plan includes, so it can protect your recovery."*
4. `tip={GLOSSARY.volume}` on the same dropdown (`:1821`) — and the source
   comment at `:1811-1816` states outright that this one tooltip is
   deliberately shared by the field hint **and** the header sub, because
   the header "carries no field label of its own to anchor a tooltip to".

That comment is the smoking gun: the code itself documents that two
explanation layers are competing for one anchor. This is the "nested
tooltips" pattern the order asks for by name.

**Deletion candidate.** The header sub's first clause ("Recovery affects
your plan volume."), which the field hint restates more usefully one screen
inch below and which is the reason the tooltip had to be shared. Reminder
copy, the coach card and the tooltip all stay.

**Not proposed:** removing the recovery question, changing what it drives,
or touching the reminder architecture (Phase 28's lane, and the
write-before-prompt ordering at `:825-839` is a Campaign 1 integrity
property).

### 5.4 C5-P36-03 — IMPROVEMENT (MEDIUM). Step 3 advertises an unreached feature inside a body-composition question.

`ProOnboardingScreen.js:1402-1403`:

```js
title="Starting body composition"
sub="Your best current estimate helps the first plan. Progress Photos can refine physique change later with your Volyume Score."
```

The second sentence names two features the user has never seen, cannot
reach from this screen, and does not need in order to answer the question
in front of them (a body-fat percentage they may well skip — this step has
no gate at all, `advanceFrom3`, `:696-699`).

Three separate reasons it is a deletion candidate:

1. **The order forbids it.** Non-goals, line 58: "add onboarding merely to
   advertise every existing feature."
2. **Second first-use law.** Progress Photos becomes relevant weeks later;
   teaching it here is teaching before use.
3. **It is body-image adjacent.** The sentence sits under a body-fat input
   and promises a scoring feature. The Volyume Score's own surfaces are
   carefully framed (`coachGlossary.js:112-113`: "not a body fat
   measurement, a medical assessment, or a comparison with anyone else");
   this one-line trailer carries none of that framing.

**Proposed minimal fix.** Delete the second sentence. The first sentence
("Your best current estimate helps the first plan.") already answers the
screen's question — though note it duplicates the header sub, so this
finding and C5-P36-01 should be resolved together.

**Flag.** Body-image-adjacent copy. This is a *deletion* of a promotional
sentence, so it weakens no safety framing and adds no claim, but the lead
should confirm the ruling rather than an agent executing it silently.

### 5.5 C5-P36-04 — IMPROVEMENT (LOW). ProSetupComplete card 4 stacks three lessons.

`ProSetupCompleteScreen.js:463-519` — card "4. Check in once a week"
renders, in one card, three consecutive `routineBody` paragraphs plus a
fourth tap-out link:

1. `:474-477` the check-in mechanic and its date;
2. `:493-495` the adherence-why line — *"The more sessions you log, the
   better your coach understands how your body responds, so it can get your
   weights and your lighter weeks right."*;
3. `:499-503` the trial arc — *"Your full access runs for 14 days. If you
   decide not to continue after that, your training log, plans and personal
   bests stay free forever."*;
4. `:507-518` "How Precision Coaching works" → Methodology.

Each paragraph is individually well-written and each has a recorded reason
in the source comments (D15 for the adherence line, Wave A B3 for the trial
arc). Together they are three unrelated lessons — habit, mechanism,
commercial terms — in the last card before the first workout.

**Recorded, not proposed as a deletion.** Paragraph 3 is trial copy and is
therefore **FOUNDER-GATED** under the campaign's billing-copy rule (order
lines 169-175): moving or removing it is not this campaign's call. Paragraph
2's placement was a recorded founder ruling (D15, "said once here"). The
only genuinely free move is presentational, and this is not a redesign
campaign. Recorded for the lead's copy-density ruling with those
constraints attached.

### 5.6 C5-P36-05 — CLEAN. Article 9 copy is left alone, and already discloses progressively.

The consent screen carries ~350 words, by far the densest block in first
use. Every word of it is legal content required for a valid Article 9
consent, and the campaign forbids weakening it. It already applies
progressive disclosure where lawful: the "What if I don't agree?" expander
holds the sign-out / delete-account routes rather than putting them inline
(`Article9ConsentScreen.js:181-303`). **No change proposed. No deletion
candidate. Not counted in the addressable copy total.**

### 5.7 C5-P36-06 — CLEAN. Nothing in first use is a mandatory tutorial.

All methodology-class content is opt-in and behind a tap:
`NutritionEducation` (`ProSetupCompleteScreen.js:316-329`), `Methodology`
(`:507-518`, and separately `MethodologyScreen.js:151` which records its
own `source`), "How logging works" (`ActiveWorkoutScreen.js:3474-3489`),
and every `InfoTooltip`. The order's "unnecessary methodology content"
check therefore finds nothing forced — the methodology content exists, and
the user chooses whether to read it. This is the correct shape and should
not change.

### 5.8 C5-P36-07 — CLEAN. Consequence, not algorithm.

Spot-checked the highest-risk moments for algorithm-leakage:

- The plan build sequence names phases in outcome terms, not engine terms
  (`ProOnboardingScreen.js:744-748`): "Balancing your week", "Setting how
  much you'll train each muscle", "Choosing your exercises", "Fitting
  sessions to your 60 minutes". The source comment at `:733-742` records
  that "volume" was deliberately reworded out of this caption because it is
  a transient animation that cannot carry a tooltip. Exactly the rule,
  applied deliberately.
- The provisional calorie figure is labelled as provisional
  (`:1613-1615`) rather than presented as a computed target.
- `GLOSSARY.volume` gives the mechanism in one clause ("the working sets
  you do for it in a week") with no landmark names.

No MEV/MRV/mesocycle/deload jargon reaches any first-use label. Independent
confirmation of `C5-P1-13` from a different direction (glossary consumers
rather than a grep of screens).

---

## 6. Phase 37 — first-use visual hierarchy

Scope discipline, stated up front: the order says this is **not** a visual
redesign campaign and only obvious hierarchy issues that make the next
action unclear are in scope. Nothing below re-themes, changes the brand,
changes a layout order, or starts design-system work. Two findings; both
minimal.

### 6.1 C5-P37-01 — IMPROVEMENT (MEDIUM). Two primary-weight CTAs on day-0 Home, lower priority first.

Render order on Home for a day-0 Pro user with a generated plan
(`HomeScreen.js`, top to bottom):

1. at most one attention banner (D14 cap, `:1775-1780`);
2. **`TodayStrip`** — the morning-weight card (`:1811-1823`);
3. **`HomeWelcomeCard`** — the numbered orientation card (`:1832-1834`);
4. **the session hero** with `[Start workout]` (`:1854-1924`, button at
   `:1898-1907`).

`TodayStrip`'s zero-state row ends in an explicitly primary button
(`TodayStrip.js:214-224`):

```js
<Button
  variant="primary"
  size="sm"
  fullWidth={false}
  title="Log"
  onPress={startEdit}
  accessibilityLabel="Log morning weight"
  style={styles.metricAction}
/>
```

So the first filled, primary-coloured button a brand-new user's eye lands
on is **"Log"**, and the session hero's `[Start workout]` — the single most
important first action in the whole product, and the one
`HomeWelcomeCard.js:52` explicitly points at ("Start a session below ...
Tap Start workout and log each set as you go") — is the *second* primary
button, two cards further down.

**Concrete user scenario.** A user finishes setup, taps "Start training",
and lands on Home. The top of the screen offers a primary "Log" button next
to "Morning weight — Not logged yet". They tap it, because it is the first
primary control on the page, and are taken into a weight-entry field. The
session they were just told to start is below the fold on a small device,
behind an orientation card.

**What is NOT proposable here, and why.** The card *order* is a founder
ruling: `HomeScreen.js:1806-1809` records COMP-027 Part B — "the
morning-weight card sits above the session hero" — and the cold-load
skeleton at `:1795-1797` was rebuilt to teach that hierarchy. Reordering
would reverse a founder decision and is out of bounds. This surface is also
weight-logging, so it is ED-adjacent by subject matter.

**Proposed minimal fix (needs a D96 ruling).** Downgrade the strip's "Log"
button variant (primary → secondary/outline) so the two CTAs stop competing
at the same visual weight, leaving order, copy, behaviour, gating and the
weigh-in prompt itself completely unchanged. That removes nothing from the
weigh-in path — the whole row remains tappable
(`TodayStrip.js:196-205`, `onPress={() => { haptics.selection(); startEdit(); }}`)
— so no ED-safety or habit-formation property is weakened. Alternative for
the lead: accept as intended and record.

### 6.2 C5-P37-02 — DEFECT (MEDIUM). Two instructional modals can stack on the first working set.

`ActiveWorkoutScreen` has two auto-firing instructional modals, both keyed
off the *same* dependency (`exercise?.id`), with **no mutual guard**:

```js
// ActiveWorkoutScreen.js:918-933 — superset heads-up
useEffect(() => {
  if (currentSGI == null) return;
  if (acknowledgedSupersetsRef.current.has(currentSGI)) return;
  if (!pairedExerciseName) return;
  acknowledgedSupersetsRef.current.add(currentSGI);
  setSupersetHeadsUp({ groupId: currentSGI, memberNames: ... });
  ...
}, [currentSGI, pairedExerciseName, exercise?.name]);

// ActiveWorkoutScreen.js:948-969 — unilateral walkthrough
useEffect(() => {
  if (!unilateralPrefsLoaded || !exercise?.id) return;
  if (exercise.laterality !== 'unilateral') return;
  ...
  setUnilateralSuggest({ exerciseId: exercise.id, exerciseName: exercise.name });
}, [exercise?.id, exercise?.laterality, exercise?.name, unilateralPrefsLoaded, unilateralAsked]);
```

Both render full-screen transparent `Modal`s as siblings in the same tree:
`visible={!!supersetHeadsUp}` at `:3041-3046` and
`visible={!!unilateralSuggest}` at `:3155-3160`. Neither effect checks the
other's state, so when one exercise satisfies both conditions both modals
open and the later-declared one (unilateral) covers the earlier one.

**The precondition is real, not theoretical.** Generated plans do create
supersets: `planEngine.js:2701-2702` assigns `supersetGroupId` to pairs,
and `planAutoGen.js:193` persists it into the routine. Nothing in
`assignSupersets` excludes unilateral exercises from pairing — the
eligibility filter is position and rest-time only
(`planEngine.js:2631-2635`), and the pairing loop's rejections are
relationship tier, equipment proximity, pre-fatigue and the quads/hams cap
(`:2656-2670`). A single-leg or single-arm accessory can therefore be a
superset member.

**Who this hits.** `assignSupersets` returns early for beginners
(`planEngine.js:2599`, `if (experience === 'beginner') return;`), so the
affected user is an **intermediate or advanced first-time user** — exactly
the Phase 33 persona, on their first session.

**Concrete user scenario.** An experienced lifter finishes onboarding,
declares "advanced", and starts their first session. They swipe to the
third exercise — a single-arm dumbbell row that the engine paired into a
superset. Two full-screen sheets open at once. They read and dismiss "Log
this one side at a time?", and find "Superset coming up" sitting
underneath it, which they never saw arrive. Their first impression of the
live session is that the app is glitching, at the exact moment the product
is trying to teach them two of its more distinctive mechanics.

**Proposed minimal fix (one condition, no new state, no redesign, no copy
change).** Add `if (supersetHeadsUp) return;` to the unilateral effect's
guard list and let the existing `acknowledgedUnilateralRef` /
`unilateralAsked` machinery re-fire it once the superset sheet closes — or,
equivalently, gate the unilateral `Modal`'s `visible` on
`!supersetHeadsUp`. Both modals, both copy blocks and both one-time
persistence rules are untouched; only the co-occurrence is removed.

**Law/phase.** Phase 37 (modal stacking, named explicitly at order line
446); Phase 33 (the experienced user's first session); second first-use law
(two lessons at once is the opposite of explain-when-relevant).

### 6.3 C5-P37-03 — CLEAN. One attention banner at a time.

`HomeScreen.js:1459-1477` records the D14 ruling and its fixed priority
order, and `:1775-1780` confirms there is deliberately no "reveal the rest"
affordance: exactly one banner occupies the slot, the rest wait. Verified
across the six banner branches (`:1636-1660` recovery, `:1662-1687` phase,
`:1689-1723` plateau, `:1725-1751` activation, `:1753-1782` attention card,
plus the coach banner). The hero's primary action can never be pushed down
by a stack of banners. No finding.

### 6.4 C5-P37-04 — CLEAN. Every disabled CTA says what is missing.

The wizard never presents a dead disabled button. Each gated step pairs
`disabled={!canContinue}` with a `continueHint` naming the exact gap:

| Step | Hint | Evidence |
|---|---|---|
| 2 | "Complete your name, sex, age, height and body weight to continue." | `:1363-1373` |
| 4 | "Choose your experience and equipment to continue." | `:1524` |
| 6 | "Choose your recovery rating to finish setup." | `:1928-1938` |

Steps 3 and 5 carry no gate at all, so their Continue is always live
(`advanceFrom3` `:696-699`, `advanceFrom5` `:713-727`). This is the correct
pattern and needs no change.

### 6.5 C5-P37-05 — CLEAN. Day-0 Home is not noisy.

For a day-0 Pro user the whole screen is: header, ≤1 banner, the weight
strip, the welcome card, the hero, and the coach's daily brief. Everything
mature-user is gated off (see §4.2 for the Progress equivalent; on Home the
same discipline holds — `HomeWelcomeCard` requires `totalSessions === 0`
*and* `activePlan` *and* `nextWorkout`, `HomeScreen.js:1832`; the coach
banner requires `latestCoachOutput.hasEnoughData`, `:1465-1467`, with the
source comment recording exactly why: "advertising it as a ready review
with 'what changed and why' was telling users coaching was live when it
wasn't"). Aside from C5-P37-01's CTA weight, there is no competing-card
problem to fix.

### 6.6 Cross-reference

`HomeWelcomeCard`'s second step ("Your coach learns as you train") is a
provenance/tier finding already owned by `C5-P1-08`. Not restated.

---

## 7. Phase 38 — onboarding analytics

The order (lines 451-458): can the **existing** events answer the eight
funnel questions; verify once-only firing for those that exist; record gaps
separately; **do not add telemetry** — new telemetry is a privacy/product
decision. **Default expectation: NONE.**

**This lane proposes NO new telemetry.** Everything below is a record.

### 7.1 The eight questions, answered from the emitters

| # | Funnel question | Event(s) that exist | Emitter | Answerable? |
|---|---|---|---|---|
| 1 | account created | `account_created` | `RootNavigator.js:1191-1193` | **Partly** — heuristic, see 7.2 |
| 2 | consent completed | `article9_consent_recorded` | `Article9ConsentScreen.js:117-129` | **Yes** |
| 3 | profile completed | `onboarding_step_completed {step}` | `ProOnboardingScreen.js:641-648`, called at `:621, :687, :697, :709, :725` | **No** — C5-P38-03, C5-P38-04 |
| 4 | plan activated | `plan_activated`; `first_plan_generated` | `database.js:3705` (via `setActivePlan`, reached by `activatePlanWithBlock:3716`); `planAutoGen.js:232-236` | **Yes** (with the caveat in 7.5) |
| 5 | first workout started | `workout_started` | `database.js:2626` | **Yes**, as `min(occurred_at)` per user |
| 6 | first workout completed | `workout_completed`; `first_workout_logged` | `ActiveWorkoutScreen.js:2217`, `:2229` | **Yes**, once-only |
| 7 | first check-in completed | **none** | — | **No** — C5-P38-01 |
| 8 | first block completed | **none** | — | **No** — C5-P38-02 |

Verified by exhaustive grep of `track(`, `trackFirst(`, `fireLandmarkOnce(`
and `trackEngineEvent(` across `src/`, excluding tests.

### 7.2 Once-only verification for the events that exist

| Event | Once-only? | Mechanism / why not |
|---|---|---|
| `first_workout_logged` | **Yes**, durable per user per device | `trackFirst` + AsyncStorage key `@volyume_tfirst_<uid>_<event>` (`telemetry/firsts.js:24-38`) |
| `first_plan_generated` | **Yes**, same mechanism | `planAutoGen.js:234` |
| `first_food_logged` | **Yes**, same mechanism | `food/db.js:136` |
| `trial_lapse_day1_return` | **Yes**, same mechanism | `HomeScreen.js:246` |
| `account_created` | **No** — a five-minute heuristic | Fires on any `SIGNED_IN` where `Date.now() - created_at < 5 min` (`RootNavigator.js:1188-1193`). A sign-out and sign-back-in inside that window re-fires it; a user who follows an email-confirm link more than five minutes later never fires it at all. Both trade-offs are documented in the source comment at `:1173-1182`. |
| `article9_consent_recorded` | **No** — per grant | Fires each time consent is granted (`Article9ConsentScreen.js:117-129`); a withdrawal-then-regrant fires twice. Harmless for a distinct-user funnel; wrong for a raw event count. |
| `onboarding_step_completed` | **No** — per forward advance | `emitStepDone(n)` is called unconditionally inside each `advanceFromN` with no seen-set. `goBack()` (`:572-576`) permits stepping back from 3→2 onwards, so any back-and-forward round trip re-emits that step. |
| `plan_activated` | **No** — per activation | `setActivePlan` emits on every real activation (`database.js:3703-3705`), which is correct for its Panel-1 purpose but means it is not a first-plan signal on its own. |
| `workout_started` / `workout_completed` | **No** — per workout, by design | `database.js:2626`, `ActiveWorkoutScreen.js:2217` |

**C5-P38-05 (IMPROVEMENT, LOW)** is this table's summary finding: only four
events are once-only, and none of the four covers a wizard step, consent or
activation. A first-use funnel therefore has to be built from
`min(occurred_at)` per user server-side rather than from raw counts. That
is workable and the `trackFirst` header already documents the same
reasoning (`telemetry/firsts.js:7-11`), but it must be stated, because
reading raw event counts as "N users completed step 4" would be wrong.

### 7.3 C5-P38-03 — DEFECT (MEDIUM). The wizard's last step emits nothing.

`emitStepDone` has exactly five call sites — `:621` (step 1, OAuth-inside-
wizard, a path the live flow auto-skips), `:687` (from step 2), `:697`
(step 3), `:709` (step 4), `:725` (step 5). `advanceFrom6` (`:784` onward)
contains no `emitStepDone` call, and `completeFirstRun`
(`useAppStore.js:1132-1159`) emits no telemetry either.

**Consequence.** The wizard's *completion* — the moment the profile,
units, body metric, nutrition targets and plan are all written
(`ProOnboardingScreen.js:784-1098`) — is invisible. The furthest-along
observable signal is `onboarding_step_completed {step: 5}`, which is emitted
*before* the recovery question, the notification prompt, and the entire
write sequence. Any "profile completed" metric built from these events
over-counts (it counts users who reached step 6 and abandoned) and cannot
distinguish a completed setup from an abandoned one.

`plan_activated` and `first_plan_generated` partially substitute — plan
generation happens inside `advanceFrom6` — but they fire from the data
layer for many other reasons (`plan_activated` fires on every library
activation and every plan switch), so neither is a clean proxy.

**Recorded as a gap. No event proposed.** If the founder later rules that
the funnel needs it, the cheapest instrumentation is a sixth
`emitStepDone(6)` inside the existing helper, which needs no new catalogue
entry and no server allow-list migration (`onboarding_step_completed` is
already `deferred: false`, `events.js:238`, and its payload is already
`{ step }`). Recorded so the option is on the table with its true cost;
**not executed**.

### 7.4 C5-P38-04 — DEFECT (MEDIUM). The free first-run path is entirely dark.

`grep -rn "telemetry\|track(" src/screens/FirstRunScreen.js src/screens/FreeStarterScreen.js`
returns **nothing**. Neither the name step, nor any of the three starter
questions, nor the plan-or-skip decision, nor `completeFirstRun` emits a
single event.

**Consequence.** Every funnel question 3 ("profile completed") is
unanswerable for free-path users not because the event is imprecise but
because there is no event at all. The free path is reached whenever
`start_cascade` fails or the cascade entitlement is spent
(`CURRENT-FIRST-USE-JOURNEY.md` §3.3 / `C5-P1-02`), so this is not a
hypothetical cohort — it is precisely the cohort whose onboarding most
needs measuring, because they arrived there by a failure.

The only events a free-path user generates before Home are `sign_in`,
`account_created` and `article9_consent_recorded`. Their plan activation
does fire `plan_activated` (`FreeStarterScreen` → `activatePlanWithBlock`
→ `setActivePlan` → `database.js:3705`), so question 4 survives; questions
3 does not, and question 1's account/consent pair cannot be joined to any
onboarding progress.

**Recorded as a gap. No event proposed.** Campaign 1 privacy law binds any
future decision here, and new telemetry is founder territory (order line
458).

### 7.5 C5-P38-01 / C5-P38-02 — RECORD. Two funnel stages have no event at all.

- **First check-in completed.** `WeeklyCheckInScreen.js` (2,121 lines) emits
  zero telemetry — verified by grep. The nearest event is
  `weekly_coach_run` (`CoachOutputScreen.js:1839-1845`), which fires when
  the weekly coach engine *runs* on the coach-output screen. It is
  downstream of the check-in, can re-run for the same week, is Pro-only,
  and its payload is engine-health data (`held_decisions_count`,
  `ffm_floor_held`, `adjustment_magnitude_kcal`) rather than a funnel
  signal. Using it as a check-in proxy would be wrong.
- **First block completed.** No event exists anywhere:
  `grep -rn "block_completed\|block_complete\|mesocycle_complet" src/`
  finds no telemetry call site, and the catalogue in
  `telemetry/events.js` contains no block-lifecycle event of any kind.

Both are recorded as instrumentation gaps only. **Default expectation
honoured: no telemetry added, none proposed as a recommendation.**

### 7.6 C5-P38-07 — RECORD. `first_plan_generated` only covers the auto-generated path.

The event fires from `planAutoGen.js:232-236`, i.e. Pro auto-generation
only. A first plan copied from the library (`FreeStarterScreen`,
`PlanLibraryScreen`) or built in `ManualBuilder` never fires it. Its
catalogue comment describes it as "first-ever plan generation (once)"
(`events.js:230`), which is accurate, but a reader building a funnel could
mistake it for "first-ever plan". `plan_activated` covers those paths.
Recorded so no dashboard is built on the wrong event.

### 7.7 C5-P38-06 — CLEAN. Privacy holds.

Every first-use payload verified against Campaign 1's law (counts, flags,
small enums only; no PII; no training or body content):

| Event | Payload | Verdict |
|---|---|---|
| `sign_in` / `account_created` | `{ provider }` | enum |
| `article9_consent_recorded` | `{ granted, cloudRecorded, consentVersion, appVersion, platform }` | flags + versions |
| `onboarding_step_completed` | `{ step }` | integer |
| `plan_activated` | `null` | — |
| `workout_started` | `{ from_routine }` | boolean |
| `first_plan_generated` | none | — |

The transport enforces the allow-list twice (client `ALLOWED_EVENTS`,
`telemetry/transport.js:64-71`; and the server RPC, per the file header at
`:10-13`), and the whole pipeline is dropped when the user opts out
(`transport.js:31-42`, `:63`). No first-use surface writes PII to
telemetry. No finding.

---

## 8. Phase 39 — the onboarding rollback switch

The order (lines 461-466): `ONBOARDING_QUIZ_FIRST` remains an intentional
dark rollback switch; do not re-enable it; do not delete `QuizTraining`,
`PlanPreview` or the rollback infrastructure; verify Campaign 5 has not
accidentally made the routes reachable.

### 8.1 C5-P39-01 — CLEAN. The flag is off and its only live reader is dead.

`src/lib/onboarding/quizFlow.js:24`:

```js
export const ONBOARDING_QUIZ_FIRST = false;
```

with the founder's reversal recorded immediately above it (`:19-23`,
2026-06-26, "showing a free-style quiz on the Pro CTA broke the Pro flow …
reversible — set `ONBOARDING_QUIZ_FIRST = true` to restore").

`grep -rn "ONBOARDING_QUIZ_FIRST" src/` returns four hits: the declaration
(`quizFlow.js:24`), the import and the branch in `WelcomeScreen.js:15,69`,
and two comments (`RootNavigator.js:660`, `telemetry/events.js:216-219`).
The only executable reader on the live path is:

```js
// WelcomeScreen.js:66-74
function startTrial() {
  if (ONBOARDING_QUIZ_FIRST) {
    navigation.navigate('QuizTraining');
    return;
  }
  navigation.navigate('Login', { intent: 'pro_signup' });
}
```

With the flag false, the `QuizTraining` navigation is unreachable and every
Welcome CTA routes to `Login`. **Unchanged by this lane and by every
Campaign 5 lane's evidence file (all audit-only).**

### 8.2 C5-P39-02 — CLEAN. The dark routes remain registered and unreachable-live.

Registration (deliberately kept, per the order):

```js
// RootNavigator.js:654-666
function WelcomeStack() {
  return (
    <Stack.Navigator ...>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      {/* COMP-030: quiz-first pre-account screens. Registered always (harmless);
          only reached when ONBOARDING_QUIZ_FIRST is on and the user picks Pro. */}
      <Stack.Screen name="QuizTraining" component={QuizScreen} />
      <Stack.Screen name="PlanPreview" component={PlanPreviewScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}
```

Three independent reachability checks, all negative:

1. **In-app navigation.** `grep -rn "QuizTraining\|PlanPreview" src/`
   (excluding tests) yields exactly four non-comment hits: the two
   `Stack.Screen` registrations (`RootNavigator.js:661-662`), the
   flag-guarded `navigate('QuizTraining')` (`WelcomeScreen.js:70`), and
   `QuizScreen.js:67`'s `navigate('PlanPreview')` — which can only run from
   inside `QuizScreen`, which can only be reached via the flag-guarded
   branch. There is no third path in.
2. **Deep links.** The `linking` config (`RootNavigator.js:748-806`) lists
   only `HomeTab`, `DiaryTab`, `PlansTab`, `ProgressTab` and `ProfileTab`
   sub-routes — all inside `MainTabs`. `WelcomeStack` is not in the
   config at all, so no `volyume://` or `https://volyume.app` URL can name
   `QuizTraining` or `PlanPreview`. Notification taps use a separate
   mechanism (`:895-917`) that likewise only targets MainTabs routes.
3. **Stack mounting.** `WelcomeStack` mounts only on the signed-out branch,
   `if (!user) return <WelcomeStack />;` (`RootNavigator.js:1565`). A
   signed-out user's only controls on `Welcome` are the trial CTA (which
   the flag routes to `Login`) and "Already have an account?"
   (`WelcomeScreen.js:174-185`, also `Login`).

**No Campaign 5 change has made these reachable**, because every Campaign 5
lane to date is audit-only — verified by `git status`, which shows only
untracked files under `docs/first-use-audit-2026-08-10/`.

### 8.3 C5-P39-03 — CLEAN. Every piece of rollback infrastructure is present.

Inventory, so a future lane can confirm nothing has been quietly removed:

| Component | Location | Present |
|---|---|---|
| The flag | `quizFlow.js:24` | yes |
| Quiz step definitions | `quizFlow.js:29-43` (`QUIZ_STEPS`) | yes |
| DPO pre-account phase flag | `quizFlow.js:48` (`PHASE_PRE_ACCOUNT`) | yes |
| Completeness predicate | `quizFlow.js:51-56` (`isQuizComplete`) | yes |
| Deterministic preview builder | `lib/onboarding/planPreview.js:68` (`buildPlanPreview`) | yes |
| Quiz screen | `screens/QuizScreen.js:49` | yes |
| Preview screen | `screens/PlanPreviewScreen.js:18` | yes |
| Route registrations | `RootNavigator.js:661-662` (+ lazy requires `:81-82`) | yes |
| In-memory store slice | `useAppStore.js:1167-1176` (`onboardingQuiz`, `setQuizField`, `markQuizStep`, `resetOnboardingQuiz`) | yes |
| Wizard prefill from the slice | `ProOnboardingScreen.js:402-414` | yes |
| Catalogued deferred event | `telemetry/events.js:213-219` (`onboarding_quiz_completed`, `deferred: true` with its reason) | yes |
| Screen tests | `screens/__tests__/QuizFlow.test.js` | yes |
| Preview-builder tests | `lib/onboarding/__tests__/planPreview.test.js` | yes |

The privacy property that makes the flag safe to keep is also intact and
documented in place (`quizFlow.js:12-16`): pre-account answers live only in
JS process memory, never AsyncStorage, never SQLite, no device id, no
network — and the store slice's own comment repeats it
(`useAppStore.js:1163-1166`).

### 8.4 C5-P39-04 — DEFECT (LOW). Nothing pins any of this.

```
grep -rn "ONBOARDING_QUIZ_FIRST" --include="*.test.js" src/   →  no matches
grep -rn "QuizTraining\|PlanPreview" src/__tests__/*.js       →  one comment only
```

The two existing suites (`QuizFlow.test.js`, `planPreview.test.js`) test
the dark screens' *behaviour* — that the quiz writes to the in-memory slice
and the preview renders its honesty note — which is the right thing to
test for a rollback path. Neither asserts that the flag is **off**, and
nothing anywhere asserts the routes are unreachable while it is off.

**Consequence.** A one-character edit to `quizFlow.js:24` would ship the
quiz-first front door — the flow the founder explicitly reversed on
2026-06-26 because it broke the Pro path — with a green test suite and a
green lint. The founder's own Phase 40 test matrix demands exactly this pin
(order line 487: "ROLLBACK: `ONBOARDING_QUIZ_FIRST` remains off; dark quiz
routes remain unreachable live").

**Proposed minimal fix — belongs to Phase 40's lane, not this one.** Two
assertions in the Campaign 5 suite: `expect(ONBOARDING_QUIZ_FIRST).toBe(false)`,
and a source-level guard that `WelcomeScreen`'s only unguarded navigation
target is `Login`. No source change, no behaviour change, no flag change.

### 8.5 C5-P39-05 — RECORD. The dormant prefill is infrastructure, not dead code.

`ProOnboardingScreen.js:402-414` reads `onboardingQuiz` from the store and
prefills six wizard fields from it. With the flag off, `onboardingQuiz` is
always `null` (`useAppStore.js:1167`, and the only writers are
`QuizScreen`'s `setQuizField`/`markQuizStep`), so the effect no-ops on
every real run — its own comment says so: "no-op when the quiz wasn't run
(flag off / Free path)".

Recorded explicitly because it presents as dead code to a static scan and
Campaign 4 was a dead-code-removal campaign. **It must not be removed**:
deleting it would break the rollback the order requires to stay intact
(line 464). The same applies to the deferred `onboarding_quiz_completed`
catalogue entry (`events.js:218-219`), which a "catalogue entries must have
emitters" check would otherwise flag.

---

## 9. Handoffs to other lanes

- **Phase 5 (input necessity):** C5-P33-04 — `experience` is collected on
  step 4, after two screens that could have been shortened by it. Relevant
  if the matrix considers reordering rather than only removing.
- **Phase 12 (Home):** C5-P37-01 — the day-0 CTA weight conflict, with the
  founder-ruled ordering constraint attached.
- **Phase 13 (first workout):** C5-P37-02 — the modal stacking sequence is
  reproducible inside the first session; C5-P34-07 independently confirms
  the set/rep call-site fact that lane owns as C5-P13-03.
- **Phase 15/16 (first PR, summary):** C5-P34-02 — the PR gloss belongs on
  `WorkoutSummaryScreen.js:1301-1310`; it is a tooltip attachment, entirely
  separate from that lane's PR-semantics question (C5-P15-02).
- **Phase 7 (free vs Pro):** C5-P35-01 — the Progress empty state promises
  a free user three Pro destinations.
- **Phase 40 (test matrix):** C5-P39-04 — the two missing rollback pins,
  with the exact assertions.
- **Phase 45 (release truth):** nothing in this lane's surfaces mentions
  cardio or AI. Greps over `AnalyticsScreen`, `WorkoutSummaryScreen`,
  `HomeScreen`, `ProOnboardingScreen`, `ProSetupCompleteScreen`,
  `WelcomeScreen` and the glossary return zero cardio matches; the one
  cardio reference in the tree is the removal comment at
  `AnalyticsScreen.js:748-750`.

---

## 10. Constraint attestation

- **Article 9:** untouched. §5.6 explicitly proposes no change to consent
  copy and excludes it from the copy-density deletion set.
- **ED / wellbeing semantics:** untouched. C5-P37-01 is flagged as
  weight-adjacent and its proposal removes nothing from the weigh-in path;
  C5-P36-03's deletion candidate is flagged as body-image adjacent and is a
  removal of promotional copy, never of framing or a safety line. No
  detector, floor, threshold, SCOFF path or suppression rule is discussed
  or proposed for change.
- **D92-11:** not touched, not referenced by any proposal.
- **Billing:** C5-P36-04's paragraph 3 is trial copy and is marked
  FOUNDER-GATED rather than proposed. No product ID, price, trial duration,
  purchase, restore or cascade behaviour is discussed.
- **`ONBOARDING_QUIZ_FIRST`:** verified off, verified unreachable, verified
  intact; not changed, and §8.5 records the infrastructure that must not be
  deleted.
- **Free/Pro gating:** C5-P35-01's fix is copy only; no tier scope moves.
- **New features / AI / cardio / social / gamification:** none proposed.
  C5-P33-05 explicitly declines to propose a history importer.
- **Advanced controls in first use:** none proposed. C5-P33-06 explicitly
  declines to surface the landmark editor earlier.
- **Telemetry:** none added, none recommended. Two gaps and two defects
  recorded as records only, per the order's default expectation of NONE.
- **Migrations / builds:** none written, none run, none proposed.
- **Redesign:** none. Phase 37 proposes one button variant and one modal
  guard.

---

*Phases 33-39 evidence file. Audit only: no source, test, doc or
configuration outside this file was modified, and nothing was committed,
pushed or stashed by this lane.*
