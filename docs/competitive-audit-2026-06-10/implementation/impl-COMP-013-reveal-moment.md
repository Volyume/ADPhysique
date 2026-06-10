# impl-COMP-013 — "Building your plan" reveal moment + 15-minute starter session

**Blueprint agent · 10 June 2026 · Approved seed:** `../competitive-audit-03-master-proposals.md` COMP-013
(impact 7 / effort 2 / priority 3.5). **Code ground truth verified against:**
`src/screens/ProOnboardingScreen.js` (advanceFrom5, lines ~417–625), `src/screens/ProSetupCompleteScreen.js`
(full read), `src/lib/planEngine.js` (`_generatePlanInner`, lines 2082–2315), `src/lib/planAutoGen.js`
(`generateAndSavePlan`), `src/lib/mesocycle.js` (`applyTimeCrunch`, lines 333–377),
`src/screens/ActiveWorkoutScreen.js` (`handleTimeCrunch`, lines 963–1015), `src/screens/HomeScreen.js`
(first-run cue, lines 1029–1054), `src/styles/theme.js` (`motion` tokens, lines 365–385).

**Method note:** as in round 1, direct fetches of most publisher pages were blocked (403 on
Growth Dives, Fast Company, HBS PDF, Reteno, Userpilot). Claims marked *(search-extract)* come
from search-result extraction and should be treated as directionally reliable rather than audited.

---

## 1. Best-in-market bar

1. **Runna — the category's trust peak.** Quiz → plan generation → reveal → a personal message
   from a **named, real coach** (e.g. Anya, a sponsored marathoner whose signed in-app messages
   say things like "Listen to your body… keep showing up"
   ([runna.com/coaches](https://www.runna.com/coaches), *search-extract*;
   [Reteno flow gallery](https://gallery.reteno.com/flows/app-screens-runna), round-1 citation).
   Review sentiment lands exactly where Volyume wants to be: "created a program using all the
   info provided that is **perfect for me**"
   ([App Store reviews](https://apps.apple.com/us/app/runna-running-plans-coach/id1594204443)).
   What makes it work: the reveal *echoes the user's own answers back* — the plan is presented
   as a consequence of who they said they are. **The single best reference.**
2. **Fitbod — the finishable first action.** One equipment question → "a specific, doable
   workout — not a series of options", completable in **15–20 minutes**; "users who complete
   their first workout are significantly more likely to return for a second session" — first-workout
   completion *is* the activation metric
   ([PaywallPro/DEV fitness onboarding guide](https://dev.to/paywallpro/fitness-app-onboarding-guide-data-motivation-completion-an0)).
3. **Buell & Norton's labour illusion (the science).** *Management Science* 2011: when a service
   shows the work it is doing, "people can actually prefer websites with longer waits to those
   that return instantaneous results — even when those results are identical"; perceived effort
   induces **reciprocity**, which mediates the valuation lift
   ([HBS](https://www.hbs.edu/faculty/Pages/item.aspx?num=40158),
   [Management Science](https://pubsonline.informs.org/doi/10.1287/mnsc.1110.1376)). Their
   experiments used 30–60 s waits in travel/dating search *(search-extract)*; the effect
   needs *operational transparency* (naming the operations), not a bare spinner.
4. **Adapty's cited A/B data (the commercial proof).** Personalisation questions plus a
   "customising your experience" loading screen: **+8.5% trial starts, +17% paying conversions,
   +22% ARPU** (US: +27%/+35%)
   ([Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/)).
5. **Noom/Flo — staged honesty at scale.** Noom's "building your plan" screens are "not just
   spinners; they show progress bars for each section completed, making it clear that questions
   are actually going somewhere"
   ([RevenueCat Noom teardown](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel/);
   [Growth Waves](https://growthwaves.substack.com/p/the-113-screen-onboarding-that-doesnt), *search-extract*).
   Flo uses a crafted delay at plan build so the result "feels earned"
   ([Medium/Bootcamp](https://medium.com/design-bootcamp/how-flo-and-zoe-use-a-web-to-app-to-boost-their-conversion-6f424171b1b7)).
6. **Duolingo — finishable action as the benchmark.** Letting users complete a first lesson
   before the account wall lifted DAU ~20%, and the later hard wall converted *better* because
   users were primed
   ([First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker/)).
   The transferable principle for COMP-013: the moment after the reveal must end in a
   **completable action**, not a tour. (Account timing itself is COMP-030's remit.)

## 2. What fails

- **Caught-out theatre.** Design commentary is unanimous that "users notice when progress bars
  lie to them, and apps that manipulate their progress bars often end up with terrible reviews"
  ([thisisglance](https://thisisglance.com/blog/how-progress-bars-manipulate-user-behaviour-during-setup), *search-extract*);
  "if those extra seconds are not intentional and have not been tested, they are probably doing
  more harm than good" ([Userpilot](https://userpilot.com/blog/loading-page-examples/), *search-extract*).
  The three tells: (1) **instant completion** (sequence shorter than believable), (2) **identical
  replay** on every re-generation (a user who re-rolls their plan twice sees the same choreography
  and clocks it), (3) **generic labels** that could not possibly map to real work ("Crunching the
  numbers…").
- **Theatre that escalates into manipulation.** Cal AI was removed from the App Store in April
  2026, Apple citing "deceptive billing, manipulative tactics"
  ([TechCrunch](https://techcrunch.com/2026/04/21/apples-cal-ai-crackdown-signals-its-still-policing-the-app-store/), *search-extract*).
  Its onboarding theatre (61 paywall experiments, hidden pricing) converted, then destroyed the
  asset. Volyume's deterministic-engine honesty positioning cannot carry even one fake beat.
- **Labour illusion with a bad outcome.** Buell & Norton's boundary work: transparency does not
  rescue a poor result. If `generateAndSavePlan` fails (the existing `appAlert` path at
  ProOnboardingScreen.js:608) the sequence must abort instantly — 3 seconds of "building" followed
  by "didn't generate" is worse than the current spinner.
- **The reveal as lecture.** RP Hypertrophy's jargon-before-value onboarding drives beginners away
  ([Dr Muscle](https://dr-muscle.com/rp-hypertrophy-app-review/)). The reveal must translate
  (`whyThis` already does), not enumerate.
- **Full-length first session as the first ask.** Fitbod's 15–20 min doable workout exists
  precisely because a 60–75 min Day 1 is where novices silently churn; "a 15-minute workout you
  actually do beats a 60-minute workout you skip"
  ([Daily Burn](https://dailyburn.com/life/health/best-workout-apps-for-people-who-have-never-exercised-before-2026-guide/), *search-extract*).

## 3. User psychology

- **Moment of need:** the user has just answered ~15 questions. The open question in their head is
  "did any of that matter?" The staged sequence answers it *during* the wait (each stage names an
  answer being used); the reveal receipt answers it again in one line.
- **Habit loop:** cue = "Your plan is ready" → action = a 15-minute session → reward = a finished
  first session + first-session acknowledgement on the summary. Reward arrives within ~20 minutes
  of install, not day 14.
- **Effort budget:** the sequence costs 3 seconds of *already-occurring* wait (DB writes are real);
  the starter session **removes** 45+ minutes from the first ask. Net effort: strongly negative.
- **Reciprocity (the engine of the labour illusion):** visible effort by the app makes the user
  feel owed-to and owing — the exact emotion that carries someone through their first session.
- **Emotional safety:** the starter session is framed as the smart first step ("learn the ropes"),
  never as a remedial option; no shame state for choosing it; full session remains one tap away.
- **Word-of-mouth surface:** "it showed me it was fitting my sessions to my 45 minutes" and
  "first workout was 15 minutes, just to learn the app" are both tellable in a gym conversation.

## 4. The Volyume implementation

### 4a. The staged sequence (in ProOnboardingScreen, replacing the button spinner)

**Placement.** Today, tapping Finish on step 5 runs `advanceFrom5` with an `ActivityIndicator`
inside the button (ProOnboardingScreen.js:1369–1370), then `navigation.replace('ProSetupComplete')`.
The sequence replaces that dead spinner: on tap, the step-5 form cross-fades to a full-screen
in-place state (same header furniture: brand row + progress bar at full), no new route. This keeps
the wizard's single visual system and means failure can fall back to the form with the existing alert.

**The honest stage lines, mapped to real `_generatePlanInner` phases** (verified against
planEngine.js):

| # | Stage line (house voice) | Real engine phase |
|---|--------------------------|-------------------|
| 1 | `Balancing your week` | Split selection: `DIVISION_MATRIX[goal][effectiveDays]` or `selectSplit(...)` (lines 2130–2135) |
| 2 | `Setting your starting volume` | `computeLandmarks` → MEV weekly targets → `applyGoalOverlay` + `enforceWeeklyFloorsAndCaps` (lines 2138–2150) |
| 3 | `Choosing your exercises` | `buildFromMatrix` / split builders + equipment-filtered pool (lines 2153–2182) |
| 4 | `Fitting sessions to your {sessionLengthMinutes} minutes` | `trimToTimeBudget(deduped, sessionLengthMinutes, equipment)` (line 2205) |

Stage 4 uses the user's actual number (`sessionLengthMinutes` is in scope in `advanceFrom5`) —
the single highest-leverage word in the sequence, because it proves the labels are not generic.
Divisions get a goal-aware stage 2 variant: `Setting your starting volume · {division} priorities`
(maps honestly to `applyGoalOverlay`).

**Duration: 3.2 s total** (4 stages × 800 ms dwell), inside the evidence band: >2 s is where
progress indicators become informative ([LogRocket](https://blog.logrocket.com/ux-design/loading-screens-ux-design/), *search-extract*),
~3–5 s is the working range of Flo/Noom/Cal AI plan-build screens (round-1 teardowns), and under
2.5 s the effort reads as trivial (Buell & Norton: the illusion needs perceptible labour). Above
4 s adds risk with no evidence of further gain.

**Choreography (motion tokens, theme.js:365–385).** Each stage line enters with
`motion.enter` (320 ms) on `easeDecelerate`, dwells, then gets a tick on `easeStandard`
(`motion.state`, 200 ms); previous stages remain visible as a growing ticked list (Noom's
per-section pattern); the transition to ProSetupComplete uses `motion.hero` (440 ms). One subtle
progress element only — the wizard's existing amber bar filling its final 12% across the
sequence. No orbs, no particles.

**Honesty mechanics (what kills the illusion, and the rules that prevent it):**
- **Real work runs underneath.** `generatePlan` is synchronous and fast, but
  `generateAndSavePlan`'s routine/exercise DB writes (planAutoGen.js:163–183) take real time on
  device. The sequence is a *minimum-duration display of named real work*: stages tick on a
  timeline, and if the writes outlast 3.2 s the final stage holds with its line until the promise
  resolves. Never completes before the work does.
- **Once per generation event, ever.** Plays only when `advanceFrom5` triggers a generation. Never
  replays on app restart, on revisiting the reveal, or on navigation back. Re-generation from the
  You-tab re-plan flow (planAutoGen.js is shared) gets a **single-line working state, no theatre**
  ("Rebuilding your plan…" + spinner): a user who re-rolls twice and sees identical choreography
  correctly concludes it is fake, and that conclusion contaminates the coaching engine's
  credibility. The full sequence is an onboarding-only beat.
- **Failure aborts instantly.** If `planResult.ok` is false, cut to the existing alert
  (ProOnboardingScreen.js:608–611) with no completion tick. The partial-plan path (FF-003) completes
  the sequence (the plan exists) and keeps the existing `planShortfallNote` alert.
- **Offline:** generation is entirely local (engine + SQLite) — the sequence behaves identically
  with no connection.

**Accessibility.** Reduce Motion (`accessibility.reduceMotion`, the same flag ProSetupComplete
already reads): **skip the sequence entirely** — keep the current button spinner and navigate on
completion, per the integration-map row. Screen readers: the container is `accessibilityLiveRegion=
"polite"`/`AccessibilityInfo.announceForAccessibility` announcing each stage line once; the
stage list is one labelled element, not four focus stops.

### 4b. The reveal (ProSetupCompleteScreen)

**Decision: lead with the personalisation receipt, then the week view; keep the daily-routine
spine.** The current screen's four-card "daily routine" structure is recently designed and good;
the gap is that nothing above the fold proves the plan is *theirs* — the division rationale and
`whyThis` sit two taps deep inside collapsed card 3 (lines 219–280).

Three changes, in priority order:

1. **The receipt line (the one change that makes the user feel seen).** Directly under
   "You're all set, {firstName}.", replace the generic "Here's your daily routine." with a
   division/weak-point echo built from data the engine already produces (`whyThis.goal` +
   `whyThis.weakPoints`, planEngine.js:1853–1910), in a new short-form map (locked copy, founder
   review):
   - Men's Physique: `Built for Men's Physique. Shoulders and back width lead, midsection stays tight.`
   - Bikini: `Built for Bikini. Glutes and hamstrings lead, upper body stays lean.`
   - General + weak points: `Built around your 4 days. Extra work on rear delts, like you asked.`
   Every string must be derivable from `buildWhyThis` inputs — no claims the engine did not act on.
   This is Runna's "feel seen" mechanism with Volyume's unique asset (no ranked app has divisions,
   round-1 §5.7).
2. **Card 3 opens expanded on first reveal** (`planOpen` initial state true on this screen only):
   the week view — N named sessions — *is* the reveal; hiding it behind a tap mutes the moment.
   The `whyThis` bullets stay behind the in-card "Why this plan, for you" block as today (translate,
   don't lecture; detail one tap away).
3. **The CTA stays single**: "Start training" → `completeFirstRun()` → Home. The starter session
   is **not** offered here (see 4c) — a second CTA on the reveal splits the one action and starts
   a session without the intent prompt and Home context.

No other changes; macro ring, education pointer and check-in card are untouched.

### 4c. The 15-minute starter session

**Placement decision: the Home hero card, not the reveal screen.** Sessions start from Home
(`handleStartNextWorkout` → intent prompt → `confirmStart`, HomeScreen.js:623–659); the reveal's
job is comprehension, Home's job is action. The current first-run cue — a separate one-line row
stacked *above* the hero (lines 1029–1054) — **retires**, and its job folds into a first-run
variant of the hero card itself (gated identically: `tier==='pro' && activePlan && nextWorkout &&
totalSessions===0 && !firstRunCueDismissed`). This is a net minus-one-card on Home, in the
direction COMP-027 demands (hero first, fewer stacked utilities); COMP-013 must land after or
with COMP-027's reorder, never adding a new row above the hero.

**Hero first-run variant (copy, house voice):**
> **{Routine name}**
> `First session: a short one to learn the ropes. About 15 minutes.`
> [ **Start short session** ]  ·  `or start the full session` (text link)

Dismissing the short option (the existing dismiss affordance, persisted via the existing
`@volyume_home_firstrun_cue_{uid}` key) reverts the hero to its standard state. After the first
completed session (`totalSessions > 0`) the variant never returns.

**How `applyTimeCrunch` builds a credible 15-minute Day 1 — verified against code, with one
honest gap.** The in-session "Time crunch today" already proves the machinery
(ActiveWorkoutScreen.js:963–1015): map exercises to engine format, call
`applyTimeCrunch(asExercises, targetMins, estimateFn)`, mark dropped entries
`_timeCrunchSkipped`, cut rest 30%. The starter session reuses exactly this path at session
start (a `starterSession: true` param on the ActiveWorkout route, applied where the in-session
button would apply it) with `targetMins = 15`.

**The gap:** `applyTimeCrunch` only cuts rest 30% and drops isolations — compounds and set counts
are protected (mesocycle.js:348–374). A division Day 1 with 3–4 compounds at 3–4 sets each cannot
reach 15 minutes through that alone (3 compounds × 3 sets × (63 s rest + 45 s work) ≈ 16 min is
the *floor*; 4 compounds ≈ 22+ min). The starter variant therefore needs one small, deterministic
extension: an options argument (`{ maxSetsPerExercise: 2, maxExercises: 4 }`) that runs as a
final trim pass after the isolation drop — first 4 exercises, capped at 2 sets each. That yields
4 × 2 × ~1.8 min ≈ 14–15 min honestly, keeps the session a true subset of the real Day 1 (same
lifts, same order, same targets), and leaves the existing in-session behaviour untouched (options
default off; existing tests unaffected). The in-session banner reuses `getTimeCrunchMessage`'s
pattern (whyThisTemplates.js:285–295) with starter framing:
`Short version of {routine name}: {n} exercises, 2 sets each. The full session starts next time.`
Revert ("Do the full session") works exactly as the existing time-crunch revert.

**Why a subset, not a special workout:** the starter must be Day 1 *of their plan*, so completing
it is real progress (sets logged against real exercises, PRs possible, summary populated) — Fitbod's
activation works because the first workout is the product, not a tutorial.

**Completion = the first celebration moment, calibrated.** The starter flows into
WorkoutSummaryScreen normally. Add one first-session line at the top, gated on
`totalSessions === 1`: `First session done. That is the hard part.` No confetti — the existing
PRCelebration system stays the only particle moment and fires naturally if a first-session PR
lands. Under calmer experience / open wellbeing or ED flags (`wellbeing.js`, `getOpenEdPatternFlag`)
the line reduces to the plain `Session complete.` — acknowledgement without emotional push, per
charter constraint 3. Reduce Motion: text only, no entrance animation.

## 5. Whole-package integration

- **The first-72-hours arc (with COMP-023).** D0: quiz → 3.2 s build → reveal receipt → Home hero
  first-run variant → 15-minute starter → summary acknowledgement (session counter = 1, store-review
  counter increments via existing `incrementSessionCount`). D1 morning: existing morning-weight
  notification = second touchpoint, seeded by onboarding's weigh-in (ProOnboardingScreen.js:543–556).
  D1–2: session 2, full length (the starter's "full session starts next time" set the expectation).
  D3: COMP-023's "the coach saw you" notification + Home line reads the counters this arc filled
  ("3 sessions logged. Your first coaching review unlocks Sunday — log morning weights to sharpen
  it"). COMP-013 is what makes COMP-023's numbers non-zero; the two blueprints share the
  counters and must share copy review.
- **COMP-027 (Home hierarchy):** retiring the separate first-run cue row is a direct contribution;
  the hero variant must adopt COMP-027's final hero layout.
- **COMP-030 (quiz-before-account):** the sequence sits at quiz-end regardless of where the
  account wall moves; no coupling beyond shared screen.
- **COMP-010 (visible periodisation):** the reveal's expanded week view is the natural first sight
  of the block; COMP-010's week-dots tap-through should be reachable from PlanDetail, not crammed
  into the reveal.
- **Duplication avoided:** one time-crunch implementation (extended, not forked); one whyThis
  source (`PLAN_WHYTHIS_KEY` cache); the sequence reuses wizard furniture rather than a new screen.
- **ED/wellbeing flags:** sequence and reveal are unaffected (plan content, not body content);
  the only emotional beat (first-session line) degrades to neutral as specified in 4c.

## 6. Retention & word-of-mouth mechanics

The loop this feeds is **activation-to-habit**: reveal (belief) → starter (proof of self) →
acknowledgement (reward) → D3 coach-countdown (anticipation) → first check-in (the Pro habit).
Fitbod's published mechanism — first-workout completers return at significantly higher rates — is
the retention claim; Adapty's +17% paying is the conversion claim. The shareable moments: the
receipt line ("it built a Men's Physique plan around my shoulders") and the starter framing
("first workout was 15 minutes, just to learn the ropes") — both are sentences a user can say to
a training partner without explaining the app.

## 7. Beating the benchmark

Runna's reveal is the bar, but its coach message is human theatre Volyume cannot and should not
copy (no LLM, no fake persona). Volyume beats it on **verifiability**: every stage line names a
real engine phase a curious user could check against the published methodology (COMP-006), the
receipt line is generated from the same `whyThis` data the plan itself was built from, and the
first action is a true 15-minute subset of the user's actual Day 1 rather than Fitbod's generic
doable workout. Nobody in the category combines an honest build sequence, a division-identity
receipt, and a finishable first session that logs real training data — and none of it can be
caught out as fake, which is the failure that eventually taxes every quiz-theatre competitor.

## 8. Measurement

1. **First-session start within 24 h of reveal** (existing session counters; the activation metric).
2. **Starter vs full choice rate, and completion rate of each** (one telemetry event on the hero
   variant choice; allowlist extension).
3. **Onboarding completion through the sequence** (existing funnel events; watch for drop *during*
   the 3.2 s — the kill-switch signal).
4. **Trial→paid conversion for cohorts with/without a completed first session by D3** (existing
   paywall telemetry, migration 032).

## 9. Build notes

- **Files:** `ProOnboardingScreen.js` (sequence state + stage timeline in `advanceFrom5`'s
  surrounding render; no new route), `ProSetupCompleteScreen.js` (receipt line, `planOpen`
  default, short-form division map — likely in `whyThisTemplates.js`), `HomeScreen.js` (hero
  first-run variant, retire `firstRunCue` row/styles), `ActiveWorkoutScreen.js` (accept
  `starterSession` param, reuse `handleTimeCrunch` path), `mesocycle.js` (`applyTimeCrunch`
  options arg + tests), `WorkoutSummaryScreen.js` (first-session line + flag gating),
  `whyThisTemplates.js` (starter message variant). No DB changes; one AsyncStorage key reused.
- **Reuse:** wizard header/progress furniture; `motion` tokens; time-crunch machinery and message
  template; `PLAN_WHYTHIS_KEY` cache; existing first-run cue gating and dismissal key.
- **Effort vs approved score (2):** the sequence, receipt and hero variant are honestly a 2. The
  `applyTimeCrunch` options extension plus its determinism tests nudge the whole to ~2.5 — still
  Tier-1-adjacent, flagged rather than hidden.
- **Risks:** (1) the illusion being caught — mitigated by once-per-generation, real-phase labels,
  abort-on-error, no-theatre re-generation; (2) sequence racing the DB writes on slow devices —
  mitigated by hold-on-last-stage; (3) starter session under-delivering volume and reading as a
  thin workout — mitigated by subset framing and the explicit "full session starts next time"
  line; (4) copy requires founder voice review (receipt map + starter strings) before build.
- **Sequencing:** after COMP-001 (session screen) and with/after COMP-027 (Home hierarchy), per
  the master plan's sprint 5–6 slot.
