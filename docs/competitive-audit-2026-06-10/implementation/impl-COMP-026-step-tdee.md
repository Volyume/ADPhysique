# COMP-026 — Step-informed TDEE confidence (deterministic, never a kcal value)

**Implementation blueprint · 10 June 2026 · Research-only, no code changes**
Charter: [impl-00-shared-brief.md](./impl-00-shared-brief.md) · Approved spec seed: [COMP-026 in master proposals](../competitive-audit-03-master-proposals.md) · Round-1 evidence: [steps/cardio research §2.1, §7](../competitive-audit-01-steps-cardio-activity-research.md)

> **Evidence access note (charter rule):** every direct fetch of
> macrofactor.com / macrofactorapp.com / help.macrofactorapp.com returned
> HTTP 403 (Cloudflare). All MacroFactor claims below are from search-engine
> extracts of those pages plus the round-1 research file (which captured the
> same sources when they were fetchable). Flagged as **search-extract-only**
> throughout. The substantive claims are corroborated across four
> independent extracts and match round 1 verbatim.

---

## 1. Best-in-market bar

### 1.1 MacroFactor v5.5.0 "Step-Informed Updates" — the only true precedent

Shipped autumn 2025 as one of two optional **Expenditure Modifiers**
(the other is Predictive Goal Adjustment), off by default, enabled under
More → Expenditure → Feature Settings
([v5.5.0 release notes](https://macrofactor.com/version-5-5-0/),
search-extract-only). What their own copy establishes:

- **What steps modulate — update speed, not value.** "This modifier uses
  step trends to speed up expenditure updates during periods where the
  step data improves confidence… MacroFactor does NOT attempt to directly
  assign an expenditure value to your steps or activity"
  ([Expenditure Modifiers help article](https://help.macrofactorapp.com/en/articles/274-expenditure-modifiers),
  search-extract-only).
- **Symmetric and directional.** "Your expenditure (and, consequently,
  your recommended energy intake) will increase a bit faster when your
  step counts are trending up, and decrease a bit faster when your step
  counts are trending down" (same source).
- **Why steps and not wearable burns.** Phone pedometers are good and
  universal: "Even if you have a smartwatch, you have a device that's
  quite good at measuring step counts, and quite bad at estimating energy
  expenditure" ([Examination essay](https://macrofactor.com/expenditure-modifiers/),
  search-extract-only). Their wearables essay puts exercise-burn error at
  "50% or more" ([macrofactor.com/wearables](https://macrofactor.com/wearables/),
  cited in round 1).
- **Validated gains.** Both modifiers together: "about 6–8% more accurate
  month-to-month, and about 20% more accurate over longer time scales";
  median 100-day weight-prediction error shrinks from a little over 3 lb
  to ~2.5 lb, i.e. median expenditure error ~108 kcal → ~89 kcal
  ([Examination essay](https://macrofactor.com/expenditure-modifiers/),
  search-extract-only).
- **How they explain it.** A long-form essay plus a help article plus a
  monthly newsletter explainer ([MacroFactor Monthly, Nov 2025](https://macrofactor.com/mm-nov-2025/),
  search-extract-only) — the maths is a published trust asset, not a
  hidden tweak. Round 1's verdict stands: explanation is the half of the
  feature Volyume must not skip.
- **Acknowledged limit.** The model "is back-looking and follows trends…
  it won't by default know to recommend higher calorie intake for upcoming
  events like a marathon until after the fact"
  ([wearables essay](https://macrofactor.com/wearables/), round-1 capture).

### 1.2 Competitor scan — uniqueness confirmed

- **Carbon Diet Coach:** no step data at all; activity is absorbed by
  weekly check-in adjustments ("after a couple of check-ins, Carbon will
  adjust your calories to be precisely where you need them",
  [Carbon help](https://help.joincarbon.com/en/articles/6004568-understanding-lifestyle-and-exercise-activity),
  round-1 capture). No equivalent. Converges slower when NEAT shifts.
- **RP Diet Coach:** static self-reported step *bands* (below 7k / 7–14k /
  14–21k / 21k+) feed the macro prescription as a fixed covariate
  ([FeastGood RP review](https://feastgood.com/rp-diet-app-reviews/),
  round-1 capture) — an activity *level* input, not a trend-confidence
  accelerator. No update-speed mechanism.
- **MyFitnessPal / Cronometer / Fitbit-style apps:** the anti-pattern —
  steps converted to kcal and added to the daily budget (§2 below).
- **Conclusion:** MacroFactor is the only shipping implementation of
  steps-as-update-speed. Volyume would be second in the market and the
  first to do it inside a deterministic, founder-reviewable weekly coach
  with the explanation built into a daily trend surface rather than a
  settings toggle.

---

## 2. What fails

1. **Steps as calories (MFP eat-back model).** The category's largest
   documented confusion generator: users walking ~1,000 extra steps get
   handed extra calories, negative adjustments contradict themselves, and
   the community folk-fix is "eat half back"
   ([MFP threads](https://community.myfitnesspal.com/en/discussion/10654791/help-negative-calorie-adjustment-mistake),
   [round-1 §3](../competitive-audit-01-steps-cardio-activity-research.md)).
   COMP-026 must never display or imply a steps→kcal conversion, even
   internally labelled.
2. **Invisible model changes.** Round 1's core lesson: "invisible logic
   reads as random." If the update gain changes silently, a user who sees
   a slightly larger calorie change one week has no story for it — the
   exact anxiety the house per-row Apply pattern exists to prevent. The
   modifier must always leave a visible one-line receipt when it acted.
3. **Reacting to step noise.** Daily steps are wildly heteroscedastic
   (weekend hikes, illness days, phone-left-at-home zeros). A modifier
   that twitches on single days would manufacture week-to-week target
   churn — the opposite of Volyume's "calm coach" positioning. MacroFactor
   ships theirs **off by default** partly for this reason
   ([v5.5.0 notes](https://macrofactor.com/version-5-5-0/), search-extract-only).
4. **Source-switch artefacts.** New watch, new phone, Health Connect
   priority changes: step *counting* can shift overnight with no real
   activity change ([round-1 §4 sync-friction catalogue](../competitive-audit-01-steps-cardio-activity-research.md)).
   A naive trend detector reads that as a NEAT shift.

---

## 3. User psychology

- **Moment of need:** the person who starts a 10k-steps habit (or stops
  one) and waits 2–3 weeks for the coach to "notice". Round 1 found the
  gating cadence reads as unresponsive *only because the trend is
  invisible between coach days* (COMP-004 evidence). COMP-026 is the
  engine-side half of the same fix: the coach genuinely notices sooner,
  and says so where the user already looks.
- **Habit loop:** cue = the daily trend card (COMP-004); action = keep
  moving / keep logging steps and weight; reward = a visible line that the
  coach saw the change before the scale fully confirmed it. This is the
  "it knew" moment — perceived adaptivity earning the "elite" label.
- **Effort budget:** zero new user effort. Steps are already read
  silently; weights already logged. The feature consumes existing inputs
  and *removes* waiting time.
- **Emotional safety:** the downward case ("you moved less, so your
  estimate adapts sooner") must never read as a told-off. Copy stays
  factual and rest-positive; the line is suppressed entirely under
  wellbeing/ED flags (§4.6).
- **Trust mechanics:** show working. One plain line when it acts, a
  receipt in the CoachOutput "why" stack, and a methodology paragraph in
  COMP-006's published-methodology surface. Never a silent gain change.
- **Word-of-mouth surface:** "I started walking to work and the app
  raised my maintenance the same week — without ever pretending to know
  what a step burns." That sentence is tellable at a gym; it is also
  exactly the differentiator MacroFactor markets.

---

## 4. The Volyume implementation

### 4.0 Code ground truth (verified against source, 2026-06-10)

- The 50% damping is the literal `* 0.5` at
  `src/lib/nutritionEngine.js:309` inside `computeAdaptiveTDEEAdjustment`.
  Composition order verified: raw energy-balance adjustment → **damping**
  (line 309) → FFM-floor clamp (lines 336–354, wipes cuts when 7-day
  intake ≤ floor) → rapid-loss upward-only clamp (lines 360–362). Putting
  the gain at the damping factor therefore keeps **every safety clamp
  downstream of and senior to** the modifier. ✔
- Consumption in `src/lib/weeklyCoach.js:667–758`: `adaptiveCal` is
  computed when ≥14 morning weights exist; it is used only when
  `adaptiveCal.confidence === 'high'` (line 701), only to **resize** a
  change in the **same direction** the simple off-target logic chose
  (lines 741–745, never reverses), never on the rapid-loss path, and the
  result is then capped at ±5% of the current target (lines 750–753).
  Upstream, `canAdjustCals` (lines 653–665) is false under
  `cycleOverride`, `scoffPositive`, untracked adherence, the off-target
  weeks gate and the 2-week cooldown — the modifier inherits all of these
  for free. The ED-pattern lockout additionally wipes any negative
  `calorieAdjustment` afterwards (lines 1039–1048). ✔
- **Pre-existing defect, load-bearing for COMP-026 (mention, not fixed
  here):** the production caller `src/screens/CoachOutputScreen.js:997`
  feeds `getMorningWeightsLast14Days`, so `ewmaData.length ≤ ~14`,
  `weeks = floor(length/7) ≤ 2`, confidence is at best `'low'`, and
  `useAdaptiveCal` is **never true in production**. The adaptive-resize
  path COMP-026 modulates is currently dead code outside tests. Activating
  it (a ~42-day weight window via the existing
  `getMorningWeights(userId, limit)` at `src/lib/database.js:3734`, plus
  making `weeks` date-span-based rather than row-count-based so multiple
  same-day weigh-ins can't inflate confidence) is a **prerequisite step of
  this blueprint**, itself founder-gated since it changes live coach maths.
- Steps data: `daily_steps` is written by `recordTodaySteps`
  (`src/lib/activitySteps.js:130`) on app foreground, today-only, no
  historical backfill — **days the app is not opened have no row**, so
  missing-day gates are mandatory. Range read exists:
  `getDailyStepsRange(userId, fromDate, toDate)` at
  `src/lib/database.js:3812` (oldest-first, inclusive).
- **Aggregator dedupe verified upstream:** Android reads use Health
  Connect's `aggregateRecord` COUNT_TOTAL, which deduplicates across
  sources by priority (`src/lib/health.js:444–458`, test
  `src/lib/__tests__/health.steps.test.js`); iOS uses HealthKit's
  deduplicated `getStepCount`. One residual hole: the Android fallback
  path sums raw records when aggregate throws (`health.js:459–469`) and
  can double-count multi-tracker users — handled by the robust statistics
  and persistence gates below, not by trusting any single day.

### 4.1 The mechanism — one sentence

**When the user's step level has sustainably shifted, and the direction
of that shift agrees with the direction the energy-balance discrepancy
already points, the adaptive-TDEE update gain rises from 0.50 to at most
0.65; in every other situation nothing changes.** Steps never produce,
size, or reverse an adjustment — they only let an adjustment the weight
trend already justifies arrive at up to 130% of its damped size, still
inside every existing cap and safety clamp.

### 4.2 Pure-function spec

New exported pure function in `src/lib/nutritionEngine.js` (lives beside
the maths it modulates; same file-level conventions, fixture-tested):

```
computeStepTrendModifier({ stepRows, todayKey })
  → { gain, active, direction, recentMedian, baselineMedian, deltaSteps, reason }
```

- **Input:** `stepRows` = output of `getDailyStepsRange` over the last
  **42 days** (`[{ entryDate, steps, source }]`, oldest-first). Days with
  `steps <= 0` or no row are "unlogged" (matches `summariseWeekSteps`
  semantics in `src/lib/stepsSummary.js`). Each logged day is winsorised
  at 40,000 steps before use (DB already clamps at 200,000;
  `database.js:3781`).
- **Windows:** recent = last 14 calendar days; baseline = the 28 days
  before that.
- **Data sufficiency gates (b):** ≥**10 of the last 14** days logged AND
  ≥**14 of the prior 28** days logged. Otherwise
  `{ gain: 0.5, active: false, reason: 'insufficient_step_data' }`.
  (Thresholds mirror the house pattern of `DEFAULT_MIN_DAYS = 4`-of-7 in
  stepsSummary, tightened because this signal feeds coach maths, not a
  display average.)
- **Levels:** `recentMedian` and `baselineMedian` = medians of logged
  days per window. Medians, not means: deterministic, and one hike day,
  one phone-in-locker zero-ish day, or one double-counted fallback-sum
  day cannot move them.
- **Sustained-shift test (thresholds):**
  `delta = recentMedian − baselineMedian`. A shift is *candidate* when
  `|delta| ≥ 1500` steps/day AND
  `|delta| / max(baselineMedian, 4000) ≥ 0.20`.
  (1,500/day ≈ 100–130 kcal/day of NEAT for most bodyweights — about the
  smallest shift that could move a weekly trend out of noise; the 4,000
  floor stops tiny baselines passing the ratio test trivially. Founder
  may retune both at maths review; they are named constants.)
- **Persistence (days):** split the recent 14 into two 7-day halves; the
  median of *each half's logged days* must sit on the same side of
  `baselineMedian` by ≥1,000 steps/day. One big weekend cannot pass; a
  real habit change two weeks old does. Halves with <3 logged days fail
  persistence (`reason: 'not_sustained'`).
- **Direction agreement (the non-negotiable):** the caller passes the
  sign of the raw energy-balance adjustment (positive = TDEE
  underestimated). Steps-up agrees with a positive adjustment; steps-down
  with a negative one. (Sign chain verified: steps up → true TDEE up →
  actual loss faster than expected → discrepancy negative →
  `rawAdjustmentKcal = −discrepancy·7700/7` positive. ✔) **On
  disagreement, `gain = 0.5`.** The modifier can never reverse an
  adjustment, never create one when the raw adjustment is zero, and never
  drop the gain below 0.5.
- **Gain schedule (cap):**
  `gain = 0.5 + 0.15 × clamp((|delta| − 1500) / 2500, 0, 1)` — linear
  from 0.50 at a 1,500-step shift to the hard cap **0.65** at ≥4,000.
  Maximum possible effect on any week's calorie change: ×1.3 on an
  already-damped, already-±5%-capped, already-floor-clamped number.
- **Wiring:** `computeAdaptiveTDEEAdjustment` gains an optional
  `updateGain = 0.5` parameter replacing the literal at line 309; default
  preserves byte-identical behaviour for every existing caller and test.
  `runWeeklyCoach` gains an optional `dailyStepsSeries = null` input
  (null → gain 0.5, all existing callers/tests unchanged), computes the
  modifier after the raw adjustment's sign is known, and surfaces the
  modifier result on its output object for the UI and telemetry.
  `CoachOutputScreen.load()` adds one `getDailyStepsRange` call (42 days)
  beside the existing cardio range read at lines 1100–1105.

### 4.3 Fixture suite (all in `src/lib/__tests__/`, extending the engine-invariants pattern)

1. **Step jump, lagging weight:** baseline 7,000 median → recent 12,000
   across both halves; weight trend shows faster-than-expected loss
   (positive raw adjustment). Expect `gain = 0.65`, adjustment ≈ raw×0.65,
   then the weeklyCoach ±5% cap still binds.
2. **Noisy steps, stable median:** daily 4k–13k alternating, medians
   within 800 steps. Expect inactive, `gain = 0.5`.
3. **Missing days:** 8 of last 14 logged → `insufficient_step_data`,
   `gain = 0.5`. Also 12 of prior 28 logged → same.
4. **One big weekend:** baseline 7,000; recent has two 22,000 days, rest
   ~7,000. Medians barely move; halves disagree → inactive.
5. **Wearable switchover:** every day ×1.8 overnight (counting artefact).
   Candidate shift fires, but the raw adjustment's sign is driven by the
   real weight trend, which has not changed: agreement is coincidental at
   worst, and the bounded ×1.3 effect on a capped adjustment is the
   accepted worst case — fixture documents it and asserts the cap.
6. **Downward shift on a cut:** 12,000 → 7,000, weight loss slower than
   expected (negative adjustment, agreement). Expect `gain = 0.65` AND a
   companion fixture where the FFM floor is breached: final adjustment
   still clamped to 0, `floorHeld` true — **floor outranks gain**.
7. **Rapid-loss override on:** negative adjustment with gain 0.65 still
   clamps to 0 (nutritionEngine line 360–362 path).
8. **cycleOverride / scoffPositive / ED flag open:** whole calorie block
   inert; modifier result computed for telemetry but `gain` unused.
9. **Determinism + fuzz:** same inputs → identical output (extend
   `engine-invariants.test.js` and `engineRobustness.fuzz.test.js` so the
   new input can never throw on malformed rows).

### 4.4 Placement — behind COMP-004's trend card (the explanation surface, c)

No new surface. The modifier's only user-visible homes:

1. **COMP-004 "Your trend" card (Pro):** one secondary line, shown only
   in weeks where the modifier was active in the latest coach run:
   - Up: *"Your daily movement has risen lately, so your maintenance
     estimate is updating a little faster."*
   - Down: *"You've been moving less lately, so your maintenance estimate
     is settling to match a little sooner."*
   - Generic/why variant: *"Your step trend and your weight trend point
     the same way, so this week's update is sized with more confidence."*
   No numbers, no "gain", no steps→kcal implication, no em dashes,
   British English. ≤1 line; the card's hierarchy (COMP-004's design) is
   untouched.
2. **CoachOutputScreen receipt:** when the applied calorie change was
   gain-resized, the existing note string gains one appended sentence
   (same library pattern as `WHY_LIBRARY`): *"Your step trend backed this
   up, so the change is sized with more confidence."*
3. **COMP-006 methodology page:** one paragraph stating the rule in
   full, including "steps are never given a calorie value" — the
   MacroFactor trust-essay play, in house voice.

States: inactive weeks show nothing (no "modifier idle" noise). Offline:
fully functional — steps, weights and the coach are all local; no new
sync surface. Accessibility: text line inherits the card's body style,
no colour-only meaning, no new touch target.

### 4.5 Why the user meets it at the right moment

The line appears on the card they already check daily, in exactly the
week their behaviour changed — never as a notification, never as a
setting they must discover. Per the charter's cautionary example: the
mechanism ships inside an existing surface and adds zero navigation.

### 4.6 Safety interlocks (d) — verified composition

| Interlock | Where | Relation to modifier |
|---|---|---|
| FFM floor (RED-S 30 kcal/kg FFM) | nutritionEngine 336–354 + weeklyCoach 769–796 | Applies **after** damping; clamps cuts to 0 regardless of gain. Senior. ✔ |
| Rapid-loss upward-only override | nutritionEngine 360–362; weeklyCoach 707–716 never uses adaptiveCal on this path | Senior; modifier never touches the +125..+300 boost. ✔ |
| cycleOverride / scoffPositive | weeklyCoach 653–665 `canAdjustCals` | Entire adjustment block inert; modifier inherits the gate. ✔ |
| ED-pattern lockout | weeklyCoach 1039–1048 | Wipes negative adjustments after everything; senior. ✔ |
| ±5% weekly cap | weeklyCoach 750–753 | Applies after resize; gain cannot pierce it. ✔ |
| Calorie floors (1,200/1,500 kcal) | target-construction layer, untouched | Out of scope; no target write path changes. ✔ |
| Wellbeing/ED copy suppression | COMP-004 card already hides rate when flag open | The step line is part of the same hidden block; the "moving less" line can never appear during an open flag. **Blueprint requirement.** |

### 4.7 Founder maths-review gate + shadow rollout (e)

- **Stage 0 — review pack:** this document + the fixture suite results +
  a 1-page constants sheet (1,500 / 0.20 / 4,000-floor / 1,000-persistence
  / 0.65 cap / 10-of-14 + 14-of-28 gates) for explicit founder sign-off,
  per the CLAUDE.md coach-maths rule. The weight-window prerequisite
  (4.0, third bullet) is called out separately in the same pack because it
  activates the existing adaptive resize for real users at the same time.
- **Stage 1 — shadow mode (one full release):** modifier computed on
  every coach run, engine always receives 0.5. New allowlisted telemetry
  event `step_tdee_modifier_evaluated` (Panel 2, add to
  `src/lib/telemetry/events.js` + the server `record_engine_telemetry`
  CHECK list migration — staging only, per database rules) with payload
  `{ active, direction, gain_proposed, agreed, days_logged_recent,
  adjustment_at_05, adjustment_at_gain }` — counts and flags only, no
  PII. Review distribution: activation rate (healthy ≈ 10–25% of runs),
  proposed-gain histogram, and how often agreement was coincidental on
  stable-weight users.
- **Stage 2 — enable:** flip a single module constant
  (`STEP_TDEE_GAIN_ENABLED`) in a release after founder reviews shadow
  data. No remote kill-switch is needed because the effect is bounded,
  deterministic and reversible by a constant flip; offline-first rules
  forbid a server-gated engine anyway.

---

## 5. Whole-package integration

- **Strengthens COMP-004:** gives the trend card occasional *news*
  ("updating a little faster") rather than a static chart — the card's
  habit loop gets a variable reward without manufacturing one.
- **Strengthens COMP-006:** one more concrete, publishable rule for the
  methodology page; the "never a calorie value" sentence is the page's
  sharpest line.
- **Strengthens the steps story:** Volyume already leads the category on
  steps (auto-read, phase-banded, compliance-gated targets — round-1 §7).
  This closes the one identified gap ("steps as a trend accelerator")
  without adding a single new surface, screen or setting.
- **Duplication to avoid:** the coach's step *prescription* logic
  (weeklyCoach 798–838) stays untouched — targets and confidence are
  separate concerns; the blueprint adds no second step summary (it reuses
  `getDailyStepsRange` + median, not `summariseWeekSteps`, because the
  windows differ).
- **Streamlining effect:** net zero UI added in inactive weeks; one line
  in active weeks, on an existing card.
- **ED/wellbeing behaviour:** fully specified in §4.6 — engine-inert
  under flags, copy suppressed with the card's rate block.

## 6. Retention & word-of-mouth mechanics

The loop: user changes daily movement → within ~2 weeks the card says the
coach noticed → the weekly change lands slightly sooner and says why →
user attributes responsiveness to the coach, not to luck. This feeds the
"it knew I'd started walking" tellable moment and directly attacks the
round-1 finding that the 2–3-week gate reads as unresponsiveness. The
downward case quietly protects trust during life slumps: the estimate
settles sooner, so targets stay honest instead of drifting optimistic.

## 7. Beating the benchmark

MacroFactor's modifier is a settings-page toggle explained in an essay
most users never read, and it acts unconditionally on step trends in both
directions. Volyume's version is stricter and more legible: it acts only
when the step shift **agrees with evidence already in the weight trend**
(so a counting artefact or coincidental shift cannot push the estimate
anywhere the scale doesn't already point), it is bounded by four senior
safety systems MacroFactor doesn't have (FFM floor, rapid-loss override,
cycle hold, ED lockout), and its explanation appears in the moment it
acts, on the surface the user already checks, rather than in
documentation. Same validated idea; tighter guard rails; better-placed
explanation.

## 8. Measurement

1. **Shadow phase:** `step_tdee_modifier_evaluated` — activation rate,
   gain distribution, agreement rate (target: active on 10–25% of runs;
   near-zero activation on stable users).
2. **Post-enable:** median consecutive same-direction off-target weeks
   before trend returns to band (from existing `weekly_coach_run`
   payloads) — should shrink for step-shift cohorts.
3. **Safety regression:** rate of `ffm_floor_hold_fired` and
   `rapid_loss_compression_triggered` per cohort — must not rise.
4. **Trust proxy:** COMP-004 card dwell/return rate in active weeks vs
   inactive (if COMP-004's telemetry lands).

## 9. Build notes

- **Files:** `src/lib/nutritionEngine.js` (new pure
  `computeStepTrendModifier` + `updateGain` param),
  `src/lib/weeklyCoach.js` (optional `dailyStepsSeries` input, pass-through
  + output field), `src/screens/CoachOutputScreen.js` (one range read +
  longer weight window per the prerequisite), COMP-004's card component
  (one conditional line), `src/lib/telemetry/events.js` (+ server CHECK
  migration, staging), new fixture files under `src/lib/__tests__/`.
  No schema changes; `daily_steps` and its sync handler are untouched.
- **Reuse:** `getDailyStepsRange`, winsorise/median helpers are trivial
  and local; `WHY_LIBRARY` pattern for the receipt line; engine-invariants
  and fuzz test harnesses.
- **Effort vs approved score (4):** consistent. The pure function +
  fixtures is ~2; the hidden half is the weight-window prerequisite and
  the shadow-mode release cycle, which is what the 4 was for. No new
  dependencies.
- **Risks:** (1) the prerequisite activates the existing adaptive resize
  for real users at the same time as the modifier ships shadow — the two
  changes must be reviewed together or sequenced; (2) `weeks` based on
  row count (`nutritionEngine.js:290`) lets multiple same-day weigh-ins
  inflate confidence — make it date-span-based in the same founder-gated
  change; (3) thresholds are author-chosen constants pending founder
  retuning — that is what the review gate is for; (4) Android raw-sum
  fallback can inflate single days — mitigated by winsorising + medians +
  persistence, documented in fixture 5.
- **Unrelated observations (mention only, per CLAUDE.md):** the dead
  `useAdaptiveCal` path (§4.0) predates this work; `weeklyCoach.js:676`'s
  comment ("~4 weeks of weight data") does not match what the production
  caller supplies.
