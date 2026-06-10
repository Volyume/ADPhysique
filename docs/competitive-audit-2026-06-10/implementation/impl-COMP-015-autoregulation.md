# impl-COMP-015 — Visible per-muscle session autoregulation ("Today, adjusted for you")

> Round-2 implementation blueprint. Approved spec seed:
> `../competitive-audit-03-master-proposals.md` COMP-015 (I9/E7, Tier 2).
> No code is changed by this document.
>
> **FOUNDER GATE: every user-facing string in §4.4 and §4.5 goes to founder
> review before ship.** Copy lives in `src/lib/whyThisTemplates.js`
> territory and is governed by `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`.
>
> Evidence note: rpstrength.com, hypertrophy.zendesk.com,
> jtsstrength.com and powerliftingtechnique.com refused direct fetches
> (HTTP 403) during this pass. Claims from those sources are
> **search-extract-only** unless already verified in the round-1 docs
> (which fetched them successfully); each is flagged below.

---

## 1. Best-in-market bar

The audit's verdict stands after re-research: per-session, feedback-driven
volume adjustment is the shared engine of the top hypertrophy apps, and
the "it feels alive" reaction comes from *feeling the program react to
something you just told it*.

**RP Hypertrophy — the per-muscle feedback methodology (best mechanics).**
Post-session, users rate pump, soreness (relative to the last time that
muscle trained), joint pain and perceived workload; "the app adjusts to
your pump, soreness, and workload feedback to create the perfect training
plan week-by-week" ([rpstrength.com app page](https://rpstrength.com/pages/hypertrophy-app),
search-extract). A forum user: "when you tell it exactly how you feel, it
will dictate what happens the following workout"
([Canadian Brawn thread](https://www.canadianbrawn.com/threads/rp-hypertrophy-app.12087/),
search-extract). The quoted reason RP feels elite — "updates weights and
reps based on ratings of workload and soreness", users "praise how the app
'thinks for them'", "cheat code" — is already verified in
[round-1 plan-generation research §2.2](../competitive-audit-01-plan-generation-research.md).
Within a meso it ramps 4→1 RIR into a deload and carries volume
meso-over-meso. **Its communication weakness is the opening:** the change
appears as a different set count in the workout grid with no in-context
why; the system is learned from Israetel's YouTube, not the app, and
"steep initial setup, confusing interface for newcomers" is a recurring
complaint ([dr-muscle 13-point critique](https://dr-muscle.com/rp-hypertrophy-app-critique/)).
Also web-only, no offline ([App Store reviews via round-1 doc](../competitive-audit-01-plan-generation-research.md)).

**JuggernautAI — the readiness moment (best moment-of-need).** Every
workout begins with a readiness check: motivation, sleep, nutrition and
per-muscle-group soreness, each 1–5. High readiness → more load; "if you
indicate that you are feeling tired, extra sore, or generally unmotivated,
the program will update to reduce the load and even the volume"; weekly
check-ins "automatically drop sets when your readiness score falls below
3"; very low scores recommend an extra rest day
([jtsstrength.com — How JuggernautAI Works](https://www.jtsstrength.com/how-juggernautai-works/),
verified in round-1; [techfixai review](https://techfixai.com/juggernautai-review/),
[PowerliftingTechnique review](https://powerliftingtechnique.com/juggernaut-ai-review/),
search-extract). Users describe "the most knowledgeable coach who
understands their situation". Weakness: "assumes you're already familiar
with training terminology" ([round-1 AI-coaching §2.4](../competitive-audit-01-ai-coaching-research.md)).

**Dr. Muscle — the set-by-set cadence (best perceived responsiveness).**
"Updates automatically every time you complete a set"; advises adding
sets on high recovery and backing off after layoffs in plain in-app
recommendations ([dr-muscle.com features](https://dr-muscle.com/what-makes-dr-muscle-different/);
[leaveit2ai review](https://leaveit2ai.com/ai-tools/fitness/dr-muscle),
search-extract). Proof that *messaging the adjustment* is what users
remember — and proof that algorithm quality cannot rescue trust lost
elsewhere (billing, UI: [Trustpilot](https://www.trustpilot.com/review/dr-muscle.com)).

**Carbon Diet Coach — the non-action pattern.** The only competitor that
explains *why it did not change anything* — a weaker version of Volyume's
held-decisions card ([round-1 AI-coaching §2.6](../competitive-audit-01-ai-coaching-research.md)).
COMP-015 extends exactly this house pattern down to session level.

**The single best:** JuggernautAI's session-open readiness moment fused
with RP's per-muscle inputs. Neither attributes the change in plain
language at the exercise where it lands. That attribution line is the
open lane.

## 2. What fails

- **Unexplained variation = "random" (Fitbod, the canonical case).**
  Per-muscle recovery percentages drive real adjustments, yet "experienced
  users describe the recommendations as 'randomized rather than
  strategically tailored'" ([Indie Hackers 2026](https://www.indiehackers.com/post/fitbod-app-review-2026-honest-take-after-real-testing-45d5f07a1b));
  "workouts seem random, lacking the structured progression needed"
  ([dr-muscle Fitbod review](https://dr-muscle.com/fitbod-workout-app-review/)).
  Fitbod had to publish a defensive algorithm Q&A
  ([Fitbod help centre](https://fitbod.zendesk.com/hc/en-us/articles/16254175592215-Fitbod-s-Algorithm-Q-A)).
  Anti-pattern: **adjust silently, explain in a help centre.**
- **Inputs that don't change outputs (Evolve AI).** "The same workout
  assigned regardless of whether you barely slept or got 10 hours"
  ([round-1 plan-generation §2.10](../competitive-audit-01-plan-generation-research.md)).
  Anti-pattern: **ask for feedback the user never feels acted on.** This
  is Volyume's current exposure: 7 post-workout ratings are genuinely
  consumed (adaptation events) but next-session changes are not visibly
  attributed (baseline §3.2 / COMP-015 current state).
- **Survey burden without visible payoff (RP's tedium complaints).**
  RP survives its feedback load only because Israetel's channel supplies
  the why ([round-1 AI-coaching §2.5](../competitive-audit-01-ai-coaching-research.md)).
  COMP-008 cuts Volyume's ask to 3 post-workout questions; COMP-015 is
  the visible payoff that makes those 3 feel worth answering.
- **Jargon walls (JuggernautAI).** Readiness scores and RPE assume
  vocabulary. Volyume's voice rules ban MEV/MRV/RIR in user copy — the
  adjustment line must read as a coach's sentence, not a dashboard.
- **Modal interruptions.** Nothing in the failure evidence suggests users
  want a gate before training. The adjustment must be ignorable-but-present
  (Fitbod's one good pattern, per the shared brief's psychology lenses).

## 3. User psychology

- **Moment of need:** the user opens today's session wondering "what am I
  doing today and is it right for how I feel?" That is the only moment
  the adjustment matters. Not Home (pre-commitment), not the weekly coach
  card (wrong cadence). Meet them on the exercise card itself.
- **Habit loop:** cue = the 3-question post-workout survey and the
  pre-session "how are you feeling?" prompt (both exist / arrive with
  COMP-008). Action = answer honestly. Reward = *visible, named
  consequence next session* ("Still sore from Friday. 1 set fewer on
  chest today."). Round 1: perceived adaptivity earns the "elite" label;
  this closes the loop that makes feedback worth giving — within seconds
  of session open.
- **Effort budget:** zero new asks. COMP-015 consumes only existing and
  COMP-008 inputs. It *removes* a decision from the user's plate (should
  I push through soreness?) rather than adding one.
- **Emotional safety:** a dropped set is framed as the plan working, not
  the user failing ("recovery", never "you couldn't handle it"). No red,
  no shame states. Rest-positive by construction.
- **Word-of-mouth surface:** the tellable sentence is "it noticed my rear
  delts were still sore and pulled a set — on its own". Same family as
  round 1's "it refused to cut my calories".
- **Trust mechanics:** visible, explained, revertible in one tap, logged.
  Never silent, never modal, never permanent.

## 4. The Volyume implementation

### 4.0 What already exists (verified in source)

- `computeAdaptiveDecision(soreness, performance, pump, joint)` —
  RP-style matrix returning `{decision, delta, reasonCode, reasonText}`
  (`src/lib/algorithms.js:865`). Decisions: rotate_exercise,
  deload_trigger, drop_set (−1), hold, add_set (+1/+2).
- `runAdaptiveEngine(weekFeedback)` clamps `current + delta` to
  [mev, mrv] (`algorithms.js:956`). Run today in WorkoutSummary
  (`WorkoutSummaryScreen.js:244`) from **session-level** sliders fanned
  out to every muscle trained that week — per-muscle in shape, not in
  signal.
- Results are logged as `adaptation_events`
  (`createAdaptationEvent`, `database.js:2809`; the table already has an
  `exercise_id` column, currently always null). **Founder decision
  2026-05-28 (comment at `WorkoutSummaryScreen.js:360-369`): the
  per-session engine records but does NOT mutate next week's plan — the
  weekly coach owns next-week volume.** COMP-015 must preserve this.
- `computeAdaptiveLandmarks(history)` personalises mev/mav/mrv after 3+
  data points (`algorithms.js:983`); fed by `getAdaptiveLandmarkHistory`
  (`database.js:3588`).
- `getAutoRegSuggestion(..., perMuscleStimulusRatings)` has a per-muscle
  pump hook (`algorithms.js:618`) — **no caller passes it today**.
- `computeSetTargets(prevSets, repMin, repMax, units, options)` computes
  per-set weight/rep targets; options already carry `exerciseCategory`,
  `incrementKg`, `prevPrevSets`, `layoffMultiplier`
  (`algorithms.js:339`; called at `ActiveWorkoutScreen.js:576`). It owns
  **load**; COMP-015 owns **set count** — they stay orthogonal.
- Per-muscle soreness already captured weekly: `soreMuscles` chip grid in
  `WeeklyCheckInScreen.js:898-927` (display names, stored CSV on
  `weekly_checkins.sore_muscles`).
- Pre-workout intent prompt exists on Home (`HomeScreen.js:1444-1483`,
  sharp/average/below-par, stored as `workouts.intent`); COMP-008 extends
  it with soreness-coming-in and moves the post-workout survey to 3
  questions (difficulty, pump, joint).
- Deload weeks: `getCurrentMesocycleWeek().isDeload` +
  `generateDeloadPrescription` already own the session during deload
  (`ActiveWorkoutScreen.js:647-679`).
- Weekly coach safety hold: joint pain / illness / injury caps any push
  (`weeklyCoach.js:609-624`); weekly volume direction is
  `volumeSignal` −2..+3 applied per-muscle via confirm-then-apply
  (`coachApply.js:240`, CoachOutputScreen "the coach owns weekly volume").
- Note: a comment claims adaptation events are "surfaced in the Engine
  Log on the You tab" (`WorkoutSummaryScreen.js:362`) — **no such screen
  exists**; only sync reads `getAllAdaptationEventsForUser`. COMP-015
  does not build one; the info sheet (§4.5) is the visible log. Mention
  to founder as a stale comment, do not fix here.

### 4.1 The decision engine — `computeSessionAdjustments` (new pure function, `src/lib/algorithms.js`)

One new exported pure function; no side effects, no Date.now() inside
(caller passes `now`), fully unit-testable:

```
computeSessionAdjustments({
  todaysExercises,      // [{ exerciseId, primaryMuscle, plannedSets }] from the routine
  muscleSignals,        // { [muscle]: { lastTrainedAt, lastFeedback: { pump, joint, difficulty },
                        //   checkinSore: bool, checkinAt, presessionSoreness, lastPerformance } }
  weeklyContext,        // { plannedByMuscle, doneThisWeekByMuscle, landmarks (adaptive-aware),
                        //   weeklySignal: 'reduce'|'hold'|'push', safetyHold: bool, isDeload: bool }
  recentSessionEvents,  // this week's session-level adaptation_events (anti-creep + revert memory)
  now,
}) → [{ exerciseId, muscle, setDelta: -1|0|+1, adjustedSets, plannedSets,
        reasonCode, reasonText, signals }]
```

**Rule matrix — ordered, first match wins, per muscle (then mapped to
that muscle's primary exercises).** All inputs are existing scales; the
soreness construct is: *sore-for-muscle-M* = (latest check-in ≤ 4 days
old AND its soreMuscles includes M) OR (today's pre-session soreness =
"Sore" AND M was a primary muscle of the most recent session ≤ 72 h ago).

| # | Condition | Adjustment | reasonCode |
|---|-----------|------------|------------|
| R0 | `isDeload` true | none — engine silent; deload prescription owns the session | (no event) |
| R1 | last session of M logged joint ≥ 2 | no set change; **suppress any add**; coaching line defers to existing joint guidance | `session_hold_joint` (logged, not shown) |
| R2 | sore-for-M AND M last trained ≤ 72 h ago | **−1 set on M's first primary exercise today** (one exercise per muscle, never more) | `session_drop_residual_soreness` |
| R3 | sore-for-M AND last trained > 72 h ago | hold (soreness is stale or systemic; weekly coach's territory) | `session_hold_stale_soreness` (logged, not shown) |
| R4 | NOT sore-for-M AND last performance met/exceeded AND last pump low (≤ 'Mild') AND projected weekly sets for M < mav AND `weeklySignal != 'reduce'` AND NOT `safetyHold` AND no session add for M this week | **+1 set on M's first primary exercise** | `session_add_under_stimulus` |
| R5 | R4 conditions met except blocked by weeklySignal/safetyHold | hold; show the honesty line only if today's pre-session intent was "Sharp" | `session_hold_weekly_precedence` / `session_hold_safety` |
| R6 | default | none, no line, no event | — |

**Caps and clamps (the invariants in §4.7 enforce these):**

- `setDelta ∈ {−1, 0, +1}` per exercise; **max one adjusted exercise per
  muscle per session; max 2 adjusted exercises per session** ("today,
  adjusted", never "today, rewritten").
- Landmark clamp: projected weekly sets for M after adjustment stays
  within `[mev, mrv]` using the **adaptive** landmarks where
  `isAdapted` (else defaults) — same clamp shape as `runAdaptiveEngine`.
- Floor: an exercise never adjusts below 1 working set.
- Asymmetry: drops may repeat across sessions (recovery is allowed to
  insist); **adds are limited to +1 per muscle per week from the session
  layer** (checked against this week's `adaptation_events`), so the
  session loop can never usurp the weekly coach's ownership of volume
  direction.
- Revert memory: 2 user reverts for the same muscle within the current
  mesocycle → engine holds that muscle until the next meso
  (`session_hold_user_pref`, logged). Derived from adaptation_events; no
  new state.
- Ad-hoc sessions (no routine/plannedSets) and exercises with no history:
  silent. Secondary-muscle credit is **never** adjusted (primary only;
  matches `allocateExerciseVolume` primary semantics and avoids the
  double-count trap).
- Muscle-name mapping for check-in chips (display → keys):
  Shoulders → side_delts + rear_delts + front_delts, Core → abs, others
  1:1 lowercase. One shared map, exported, tested.

**Where it runs:** once, at workout creation (`createWorkout` flow in
HomeScreen → ActiveWorkoutScreen mount), from local data only
(offline-first). Inputs are all as-of session start, so a crash-recovery
recompute is bit-identical (determinism invariant). Each nonzero
decision and each interesting hold is written immediately via
`createAdaptationEvent` with `exerciseId` populated (the column exists)
and `decision` values namespaced `session_*` so weekly consumers
(`evaluateDeloadTriggers`, deload evaluation) are untouched.

### 4.2 How the set count actually changes

Session-scoped only. The adjustment produces an `adjustedSets` value
carried in the active-session state (store slice beside
`workoutExercises`), consumed wherever `routineExercise.recommendedSets`
drives the session today: the "Set N / M" orientation row
(`ActiveWorkoutScreen.js:1371`), `totalSetsForExercise` for the
persistent notification (`:479,:504`), the target line (`:1326`) and the
target-complete banner. **It never writes to routines,
planned_muscle_volume, or mesocycle rows** — preserving the 2026-05-28
founder decision and guaranteeing the weekly coach and session layer can
never double-count. `computeSetTargets` is unchanged except that the
caller slices/extends its targets array to `adjustedSets` (an added set
inherits the last set's target; a dropped set just isn't asked for).

### 4.3 The attribution surface — placement is the product

**Primary: the COMP-001 coaching-line slot (Line 3), on the affected
exercise card, first set only.** The post-COMP-001 SetEntry card has a
single conditional coaching line (sm=13, amber, one line max), priority
"stalled advice > deload note > coach reason"
([COMP-001 proposal §2](../competitive-audit-01-workout-screen-proposal.md)).
COMP-015 inserts **session adjustment** at the top of that priority
(deload never co-occurs — R0). No new chip, no new row, no chip soup:
the slot already exists and budgeted 18pt of card height. Unaffected
exercises show whatever the slot showed before. Most sessions show
nothing — silence is the default state and the reason the line stays
credible.

- The orientation row simply reads the adjusted truth: `Set 1 of 2 ·
  Working ›`. The coaching line explains the delta.
- Tap target: the whole line (≥44pt with padding+hitSlop, per COMP-001
  type rules) opens the existing exercise info sheet, extended with an
  "Adjusted today" section (§4.5).

**Secondary: WorkoutSummary confirmation row.** One quiet line above the
3 feedback questions when an adjustment was active: "Adjusted today:
rear delts, 1 set fewer (still sore Tuesday)." This closes the loop at
the exact moment the user is about to give the next round of feedback —
the reward priming the next cue. Reuses the summary's existing row
styles; readOnly history views show it too (it is part of what
happened).

**Deliberately NOT on Home in v1.** Home already stacks three utility
cards above the hero (shared-brief streamlining rule; COMP-027 owns the
hierarchy fix). A hero-card sub-line ("Today, adjusted for you · 1
change") is a v2 candidate **only** inside COMP-027's final hero spec —
flagged for that blueprint, not built here.

### 4.4 Copy direction (FOUNDER GATE — review before ship)

House voice: plain, terse, honest, no jargon, no em dashes, British
English, numerals as the hero, passes the locked honesty test ("still
true if the user does nothing but keeps logging"). Pattern: **[muscle] +
[plain-English cause with a day anchor] + [what changed today]**. Cause
first, change second — the why is the product.

1. `Rear delts ran hot Tuesday. 1 set fewer today.`
2. `Chest is still sore from Friday. 1 set fewer today.`
3. `You flagged sore shoulders at check-in. 1 set fewer on side delts today.`
4. `Quads recovered fast and last session was strong. 1 set added today.`
5. `Elbows felt rough last time. Sets stay as planned, keep the loads honest.` (R1, only when the joint guidance line is already showing)
6. `Feeling sharp, but this is a lighter week. Sets stay as planned.` (R5 honesty line, only after a "Sharp" pre-session answer)

Revert affordances (info sheet): button `Use planned sets instead`;
confirmation toast `Back to plan. 3 sets as written.` Summary row:
`Adjusted today: rear delts, 1 set fewer (still sore Tuesday).`

Banned: MEV/MRV/RIR, "fatigue management", "autoregulation",
"algorithm", percentages of readiness, any "we decided together"
framing, any reference to body weight or leanness.

### 4.5 Trust mechanics

- **Visible-but-not-modal.** No interstitial, no confirm-to-start. The
  session opens exactly as fast as today; the line is ignorable.
- **Revertible.** Info sheet "Adjusted today" section shows: the reason
  sentence, the signals in plain words ("Your check-in Sunday: rear
  delts sore · Trained Tuesday · 2 days ago"), and `Use planned sets
  instead`. Reverting restores `plannedSets` for this session and logs
  `session_adjustment_reverted` with the original event id in signals.
  Two reverts per muscle per meso → the engine stops adjusting that
  muscle (R-memory above) — the user wins the argument, and that is
  itself logged with a reason.
- **Logged with reasons.** Every adjustment AND every interesting hold
  becomes an adaptation_event (`session_*` codes) — the held-decisions
  philosophy (Carbon's pattern, already Volyume's at weekly level)
  extended to sessions. COMP-006's methodology page gains one paragraph:
  "session adjustments are ±1 set, always explained, always revertible".
- **Deterministic and auditable.** Same data, same adjustment, every
  time. The info sheet's plain-words signal list is the user-facing
  audit; adaptation_events is the engineering audit.

### 4.6 Precedence vs the weekly coach (they must never fight)

- **Weekly owns direction; session fine-tunes within it.** The weekly
  coach (confirm-then-apply on CoachOutput) is the only writer of
  next-week planned volume. The session layer is read-only against the
  plan and expires with the session.
- Weekly `reduce`/deload-suggested → session adds are blocked (R5);
  drops still allowed (safety always has right of way).
- Weekly `push` → session drops still fire on a still-sore muscle; the
  copy never contradicts the coach card because it cites the muscle-level
  cause, not the weekly direction.
- Weekly safety hold (joint pain / illness / injury flags,
  `weeklyCoach.js:616`) → no session adds anywhere (R5
  `session_hold_safety`).
- The weekly coach reads the same adaptation_events it always has;
  `session_*` decisions are additive signal (e.g. repeated
  `session_drop_residual_soreness` for one muscle is exactly the
  evidence the weekly volume reduction needs — the two layers reinforce,
  never race, because only one of them writes).

### 4.7 Invariants + test plan

Extend `src/lib/__tests__/engine-invariants.test.js` (fuzz, seeded PRNG,
same harness) with a `computeSessionAdjustments` block:

1. Never throws; no NaN/Infinity anywhere in output (existing
   `assertNoBadNumbers`).
2. Idempotent: identical inputs → JSON-identical output (determinism
   guarantee; mirrors the runWeeklyCoach test).
3. `setDelta ∈ {−1,0,+1}`; ≤ 1 adjusted exercise per muscle; ≤ 2 per
   session; `adjustedSets ≥ 1`.
4. Landmark clamp: projected weekly sets post-adjustment ∈ [mev, mrv]
   for every muscle, for both default and adapted landmarks.
5. `isDeload` → output is all-zero. `safetyHold` → no positive deltas.
   `weeklySignal === 'reduce'` → no positive deltas.
6. Muscles not trained today never appear; exercises whose primary
   muscle has no signals never adjust.
7. Every nonzero delta carries a reasonCode from the closed enum and a
   non-empty reasonText; reasonText strings come from the template table
   (drift test, same pattern as the telemetry allowlist drift test).
8. Add-frequency cap: with this week's events containing a
   `session_add_*` for M, no further add for M.

Plus golden-table unit tests for the R0–R6 matrix (soreness recency ×
weekly signal × landmarks grid — every cell pinned), the muscle-name
map, the revert-memory derivation, and one integration test that a
−1 adjustment flows into the "Set N of M" count and the notification's
`totalSetsForExercise` without touching the routine row. Existing
engine-invariant tests must pass unchanged (the guarantees to preserve:
weekly coach cap behaviour, computeSetTargets contracts).

### 4.8 States, edge cases, offline, accessibility

- **Empty/cold start:** < 1 prior session for a muscle, or no check-in
  and no pre-session answer → silent (R6). No "learning" placeholder —
  silence, not noise.
- **Offline:** all inputs local (workouts, weekly_checkins, mesocycle
  tables); zero network. Sync of adaptation_events rides the existing
  `adaptation_events_sync` mirror untouched.
- **Crash/stale session recovery:** recompute from the same as-of-start
  inputs → identical result (invariant 2); revert state is recovered
  from the logged revert event.
- **Time-crunch mode:** if invoked, it trims from the *adjusted* session
  (adjustments computed at open stand; time-crunch already owns in-session
  trimming).
- **Supersets:** pairs adjust independently; the pair partner's count is
  untouched.
- **Muscle trained twice this week:** signals use the most recent
  session of M; weekly projection uses done + remaining planned.
- **ED/wellbeing flags:** adjustments concern training recovery, never
  body composition; copy contains no weight/leanness references; calm
  mode changes nothing mechanically (nothing here is emotional pressure
  — a drop is rest-positive by framing). The ED safety system is not
  touched in any way.
- **Accessibility:** coaching line keeps COMP-001's sm=13 floor and
  ≥44pt tap target; `accessibilityLabel` is the full sentence plus
  "double-tap for details and to restore the plan"; Reduce Motion: no
  entrance animation; the adjusted set count is announced via the
  existing orientation-row label.

## 5. Whole-package integration

- **COMP-008 (survey diet)** is the input side of this loop: 3
  post-workout questions + pre-session soreness chips. COMP-015 is the
  *reason those questions get answered* — name this dependency in
  sequencing (008 ships first; 015 reads its fields, all nullable).
- **COMP-001 (workout screen)** provides the only new pixel COMP-015
  needs (Line-3 slot + info sheet). Coordinate the slot priority list in
  COMP-001's build, not as a fork.
- **COMP-010 (visible periodisation)** explains the *week's* shape;
  COMP-015 explains *today's* delta. Copy must never both fire on the
  same line — R0 guarantees deload separation; the meso chip lives on
  Home, not the card.
- **COMP-006 (publish methodology)** gains the session-adjustment
  paragraph and inherits the held-reasons vocabulary.
- **COMP-005 (recaps)** can later count "adjustments that helped"
  (adjusted session followed by met/exceeded performance) — data is
  already in adaptation_events; v2.
- **Duplication it must avoid:** does not re-create the weekly coach's
  volume Apply, does not add another previous-numbers mechanism, does
  not touch `computeSetTargets` load logic, does not resurrect the
  retired per-session plan mutation.
- **Streamlining effect:** net-new visible surface is one conditional
  line and one info-sheet section; it *retires* the vague post-summary
  `getAutoRegSuggestion` strings as a visible surface in time (mention,
  don't fix here) and gives the existing 7→3 survey cut its payoff.

## 6. Retention & word-of-mouth mechanics

The loop: answer 3 questions (10 s) → next session visibly reacts →
answering feels consequential → feedback completion stays high → the
engine's data stays dense → adjustments stay accurate. This is the
"perceived adaptivity = elite" loop round 1 identified as the depth gap
vs RP/JuggernautAI. The tellable moment is specific and screenshotable:
the amber line naming *your* sore muscle and the day it got sore.
Retention hooks: trial users meet it within their first week (one
check-in or one sore answer is enough to fire R2/R3); it is a Pro
coaching feature experienced inside the free logging flow's geography —
the strongest possible "what Pro feels like" advert that never gates a
free feature.

## 7. Beating the benchmark

RP has the best inputs but communicates through silently changed grid
numbers, online-only, behind the category's steepest learning curve.
JuggernautAI has the best moment (session-open readiness) but answers in
powerlifting vocabulary and hides the causal chain. Fitbod proves that
adjustment without attribution reads as randomness. Volyume already owns
the missing pieces — deterministic per-muscle decision matrix, landmark
clamps, adaptation-event logging, held-decision voice — so COMP-015
ships the one thing none of the three have: **the cause-and-effect
sentence at the exercise where the change lands, revertible in one tap,
working offline**. That is simultaneously deeper mechanics than Fitbod,
plainer language than Juggernaut, and better communication than RP — at
session-open, where the user actually decides whether to trust the plan.

## 8. Measurement

Telemetry allowlist extension (`src/lib/telemetry/events.js`; no PII —
muscle keys and direction only):

1. `session_adjustment_shown` {muscle, direction, reasonCode} — coverage:
   % of plan sessions with ≥1 adjustment (expect 15–30%; >50% means the
   rules are too chatty).
2. `session_adjustment_reverted` {muscle, direction} — trust: revert
   rate < 15% of shown; rising revert rate = rules too aggressive.
3. Post-workout feedback completion rate (existing data, workouts table)
   before/after ship — expect up; this is COMP-008's metric reinforced.
4. D30 retention of users who saw ≥1 adjustment in week 1 vs none
   (cohort cut on existing analytics).

## 9. Build notes

- **Files:** `src/lib/algorithms.js` (new `computeSessionAdjustments` +
  muscle-name map + reason templates or `whyThisTemplates.js` for copy),
  `src/lib/database.js` (one read helper: per-muscle last-session
  signals + latest check-in soreMuscles; `createAdaptationEvent` reused
  as-is with `exerciseId`), `src/store/useAppStore.js` (session
  adjustments slice), `src/screens/ActiveWorkoutScreen.js` (consume
  adjustedSets; Line-3 line + info-sheet section — inside COMP-001's new
  layout), `src/screens/WorkoutSummaryScreen.js` (confirmation row),
  `src/lib/__tests__/engine-invariants.test.js` + new unit test file,
  `src/lib/telemetry/events.js`. **No schema migration** (exercise_id
  column exists; new decision/reason codes are strings).
- **Reuse:** computeAdaptiveDecision matrix shape and reason-code
  pattern; landmark clamp from runAdaptiveEngine; adaptive landmarks via
  getAdaptiveLandmarkHistory; held-decision voice from weeklyCoach/
  whyThisTemplates; COMP-001 coaching-line slot and info sheet; existing
  intent-prompt storage.
- **Sequencing:** after COMP-001 (slot) and COMP-008 (inputs). Quarter 2
  per the final action list.
- **Effort sanity-check vs E7:** holds. The engine function and tests
  are ~2 weeks; the plumbing through the sacred session screen plus the
  precedence/revert mechanics and founder copy cycles are the real cost.
  Not lower than 6; nothing here pushes it to 8 because there is no
  schema work and both UI slots are inherited.
- **Risks:** (1) firing too often → noise → ignored (mitigate: silence
  default, caps, coverage metric); (2) any perceived fight with the
  weekly coach card (mitigate: §4.6 precedence + copy that cites
  muscle-level cause only); (3) check-in soreness staleness mid-week
  (mitigate: 4-day decay window, R3); (4) COMP-001 slippage stranding
  the slot (fallback: the line renders in the current chip stack at the
  coach-reason position — degraded but shippable); (5) copy drift from
  the locked voice (mitigate: founder gate, template drift test).
- **FOUNDER GATE (repeat):** §4.4/§4.5 strings to founder review before
  ship; stale "Engine Log" comment flagged, not fixed.

---

*Sources: in-repo round-1/round-2 audit documents as linked; external
URLs as cited inline. rpstrength.com, hypertrophy.zendesk.com,
jtsstrength.com, powerliftingtechnique.com and techfixai.com blocked
direct fetches on 2026-06-10 (HTTP 403); their claims are marked
search-extract or carried from round-1 verified fetches. No code was
modified.*
