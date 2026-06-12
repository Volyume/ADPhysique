# a-10 — CARDIO, STEPS & WEARABLES (Pro)

Audit agent 10 of the ULTIMATE-APP MANDATE. Code-verified, file:line evidence,
no internet. Branch claude/admiring-bohr-2kb7pd. British English throughout.

Surfaces read in full: cardio/cardioEngine.js, cardio/cardioMath.js,
cardio/cardioActivities.js, LogCardioScreen.js, CardioHistoryScreen.js,
CardioPlanCard.js, activitySteps.js, stepsSummary.js, stepsLaunchPrompt.js,
health.js, watch/bridge.js, widgets/widgets.js, sync/tables/dailySteps.js,
sync/tables/cardioLog.js (push/pull pattern), the step-band + cardio + step-trend
blocks in weeklyCoach.js, weightTrend.js step-trend line, TodayStrip.js cardio/step
cells, AnalyticsScreen.js card host, MethodologyScreen.js + NutritionEducationScreen.js
explainer surfaces, WorkoutSummaryScreen.js + SettingsHealthScreen.js health-write path,
RootNavigator.js gating, the COMP-026 / COMP-011 implementation blueprints.

---

## 1. WHAT — every surface and the data flow sensor → engine

### 1a. Cardio (manual, user-led)
1. **Library is code, not data.** `CARDIO_ACTIVITIES` (cardioActivities.js:134) is
   35 frozen activities in 10 categories, each carrying a [low,mod,high] MET triple
   (2024 Adult Compendium), `recoveryImpact`, `impactType`, and `coachTargetable`
   (sport rows = false, logged but never dosed). Stable `canonicalCardioId` hash
   (:41) so a log row round-trips across installs.
2. **Log entry.** LogCardioScreen.js: pick activity (favourites → recents →
   browse/search), set duration (5–300, +/-5 stepper :207), intensity (Easy/
   Moderate/Hard). Prefills last-used duration+intensity per activity (:98). Saves
   via `insertCardioLog` (database.js:3991) with a MET + estKcal SNAPSHOT.
3. **kcal is feedback only.** `estimateCardioKcal = MET × bw × hours`
   (cardioMath.js:38), shown as "Burned about N kcal" then the load-bearing line:
   *"Already counted. This isn't added to your calorie target, your weight trend
   includes everything you burn."* (LogCardioScreen.js:226). Hidden entirely when
   bodyweight unknown (:55, no silent 75 kg).
4. **Into the recovery model.** `cardioFatigueContribution` (cardioMath.js:86,
   low0.3/mod0.7/high1.2) feeds `cardioRecoveryLoad` — a 3-day half-life decayed
   SUM (:105), banded by `cardioLoadLevel` (:125). This is the ONLY way cardio
   touches the engine other than via the weight trend: it adds fatigue, never kcal.
5. **Into the coach (cut lever).** weeklyCoach.js:914 `cardioConditionsMet =
   phase.isCut && !onTarget && offTargetDirection>0 && stepsAtUpperBand`. Only then
   does cardio fire, as a DOSE (sessions×minutes×intensity, never an activity):
   `cutCardioTarget` base 3 easy sessions, +1 interval after a 4-week aggressive
   stall (cardioEngine.js:31); `nextCardioTarget` escalates on hit+still-off-trend,
   capped at `MAX_CARDIO_SESSIONS=5` (:140), holds on miss, pauses on poor recovery.
   `healthCardioTarget` (non-cut) is fixed at 2 light sessions, never escalates.

### 1b. Steps (auto-read, the headline integration)
1. **Sensor read.** `activitySteps.readTodaySteps` → `health.readStepsToday`
   (health.js:421). iOS HealthKit `getStepCount`; Android Health Connect
   `aggregateRecord` COUNT_TOTAL which dedupes across phone/watch/Garmin/Whoop by
   provider priority (:453), with a raw-sum fallback that can double-count
   multi-tracker users on aggregate failure (:459).
2. **Silent persistence.** `recordTodaySteps` (activitySteps.js:130) is called from
   TodayStrip on focus + every 30 s while foregrounded (TodayStrip.js:139,161) and
   from the app foreground handler. Writes `daily_steps` via `setDailySteps`
   (database.js:3934, clamped 0–200,000) only when permission already granted.
   **Today-only, no historical backfill — days the app is not opened have no row.**
3. **Weekly figure.** `summariseWeekSteps` (stepsSummary.js:18) averages logged days
   when ≥4 of 7 are present (`registered:true`), else null → check-in asks manually.
4. **Step prescription (lowest-fatigue lever).** weeklyCoach.js:865: phase-banded
   `STEPS_BANDS` (:207, agg_cut 12–14k … mod_bulk 7–9k), upper reduced 1k for >100 kg
   athletes (:237). Bumps +1000 toward band.upper when losing too slowly, holds when
   the user is under 90% of target, caps at band.upper then hands off to cardio.
5. **COMP-026 step-trend TDEE modifier.** `computeStepTrendModifier`
   (nutritionEngine.js, wired weeklyCoach.js:744) over a 42-day `getDailyStepsRange`
   window: 14-day recent vs 28-day baseline MEDIANS, winsorised 40k, gated 10-of-14
   + 14-of-28 logged days, candidacy ≥1500 steps AND ≥20%, two-half persistence,
   **direction-agreement with the energy-balance sign**. On a pass it raises the
   adaptive-TDEE update gain 0.50→max 0.65; every safety clamp re-applies on top
   (:750 recompute). It can never create, reverse, or size an adjustment — only let
   one the weight trend already justified arrive ≤30% faster.

### 1c. Wearables / companion
- **HealthKit / Health Connect** (health.js): read scopes weight + steps wired and
  live; **workout WRITE scope wired and live** (request at SettingsHealthScreen.js:134,
  write at WorkoutSummaryScreen.js:552) — this CLOSES the "write scopes unfinished"
  note from prior audits, with two caveats (§4).
- **Apple Watch companion (COMP-020).** Native `modules/watch-bridge` + `targets/watch`
  present. watch/bridge.js: phone COMPOSES all strings (`composeBeatLine`,
  `composeSetLine` — "Set 4 of 3" structurally impossible), debounced 300 ms mirror
  down, idempotent set events up via `applyRemoteSetEvent`, telemetry on attach/log/
  duplicate-drop. Watch-skip dedupe `shouldSkipPhoneHealthWrite` (health.js:517) exists.
- **Widgets (COMP-019).** widgets/widgets.js renders NextSession + WeeklyConsistency
  from a snapshot. **Training only — no cardio or steps surface in any widget.**

### 1d. Energy-balance ownership (the interlock — verified)
Steps and cardio **never produce a calorie adjustment directly.** Cardio kcal is
display-only (cardioMath.js header + every surface footnote). Steps feed only (a) a
fatigue-free step *target* lever and (b) the COMP-026 *confidence* gain, which is
hard-clamped to [0.5,0.65] and sits UPSTREAM of FFM floor, rapid-loss override, ±5%
cap, cycle/scoff holds and the ED lockout (all senior). The only path from movement
to calories is the scale: real expenditure shows in the weight trend, which the
adaptive TDEE absorbs within ~2 weeks. Interlock holds.

---

## 2. WHERE — entry points, placement, dead ends

- **Gating:** `GatedLogCardio` / `GatedCardioHistory` via `withProGuard(…, 'Cardio')`
  (RootNavigator.js:161). LogCardio registered in multiple stacks as a modal
  (:252,303,357). Correct Pro gating.
- **Cardio doors:** (1) **Home TodayStrip CARDIO cell** (HomeScreen.js:1435 →
  `navigation.navigate('LogCardio')`), shown when `cardioEnabled !== false`. (2)
  **Progress/Analytics `CardioPlanCard`** (AnalyticsScreen.js:297 → LogCardio +
  CardioHistory). CardioHistory is reachable ONLY from that card's "History" link,
  and that link only renders once `done>0` (CardioPlanCard.js:42). So a user with
  zero logged sessions has **no door to their cardio history at all** (empty, but
  also no explanation of where history will live).
- **Steps doors:** **read-only.** STEPS cell on the Home TodayStrip
  (TodayStrip.js:280) shows "N of TARGET", non-interactive. No tap-through to a
  step history, no step chart, no step trend screen. Steps appear again in the
  weekly check-in (WeeklyCheckInScreen.js:331) and silently inside the coach.
- **No "You"/profile entry** for cardio or steps. **No cardio or steps on any widget.**
- **Settings:** SettingsCoachingScreen.js toggles `stepsEnabled` + a manual
  `stepsTarget` (:29,33); SettingsHealthScreen.js owns the three health
  permission toggles (weight/steps/workout) + "Sync now".
- **Dead end (placeholder/today-only):** `insertCardioLog` accepts `entryDate`
  (database.js:3991) and LogCardioScreen forwards `route.params.entryDate`
  (:124), but **no caller ever passes one** — both doors navigate with no params,
  so cardio is always logged to today. A prep athlete cannot back-date a session.
- **Dead path:** `shouldSkipPhoneHealthWrite` is unit-tested and correct, but the
  production caller (WorkoutSummaryScreen.js:552) **never passes `watchSessionMs`**,
  so the watch-vs-phone dedupe can never fire in the field (§4).

---

## 3. FEEL — newbie vs Eddie

**The "already counted" line is the area's strongest feel asset.** COMP-011 ships
on three coherent surfaces with consistent wording: LogCardioScreen.js:226 (at the
moment of logging), CardioPlanCard.js:57 ("Cardio is already counted in your
calorie target. Nothing to add back.", shown only once there's cardio to misread),
and NutritionEducationScreen.js:45 ("Cardio and steps are part of that maintenance
number… nothing is" added back). This directly defuses the MyFitnessPal "eat it
back" reflex a newbie arrives with. A true beginner reads it as: *I don't have to
do maths, the app already knows.* Good.

**Step-trend voice** (MethodologyScreen.js:50 "How your steps inform the estimate";
weightTrend.js:59 trend-card line) is plain, factual, ED-suppressed, with the
trust line "Steps are never given a calorie value" — best-in-class legibility,
ahead of MacroFactor's essay-buried equivalent.

**Cardio jargon is low.** "Easy/Moderate/Hard" not RPE; "Your choice of activity"
in every dose note; no METs shown to the user (MET is internal). Newbie-safe.

**Eddie's prep usage.** Strong precision: per-session grams of kcal feedback, MET
snapshot per row, recovery-load model that flags hard cardio next to leg day
(cardioEngine.js:169), interval escalation only on a genuine aggressive-cut stall,
sport activities logged but never dosed. BUT for prep specifically: (a) **no
back-dating** a session (today-only), (b) **no cardio history beyond a flat
reverse-chron list** — no weekly minutes trend, no kcal trend, no per-activity
totals, (c) intensity is a 3-way band, no HR/zone/distance/pace capture even though
he likely wears a watch the app already reads steps from. The data model is
duration+intensity only; a runner's actual pace/distance is discarded.

---

## 4. GAPS / FRICTION per code

**Five biggest friction points**

1. **Steps are a dead-end display.** The single richest auto-read signal in the app
   (drives targets AND the COMP-026 confidence gain) surfaces to the user as ONE
   non-interactive "N of target" pill on Home (TodayStrip.js:280). There is no step
   history, no 7/30-day step chart, no step-trend screen, no widget. The user who
   "started walking to work" gets the engine benefit but almost no visible feedback
   loop — the exact retention surface MacroFactor's step story is built on. Highest-
   impact gap.

2. **COMP-020 watch-skip never fires → duplicate Health writes.**
   WorkoutSummaryScreen.js:552 calls `writeWorkoutToHealth` without `watchSessionMs`,
   so `shouldSkipPhoneHealthWrite` (health.js:517) always returns false and the phone
   writes an estimated-kcal HKWorkout even when an Apple Watch already saved the real
   one. The dedupe is built and tested but unwired at the call site — a real
   double-count for watch users.

3. **Workout-write kcal uses the wrong/missing bodyweight field.**
   WorkoutSummaryScreen.js:556 reads `userProfile?.bodyWeightKg ?? userProfile?.bodyweightKg`,
   but the canonical profile field is `weightKg` (used by LogCardioScreen.js:57 and
   CoachOutputScreen.js:1243). Neither casing exists on the profile, so
   `estimateWorkoutKcal` always falls back to the default 75 kg (health.js:488) — every
   written workout is mis-scaled for any user not ~75 kg. (Adjacent to Area 10's
   cardio per se, but it is the shared health-WRITE path; mention, not fix.)

4. **Cardio history is a flat list reachable only after first log.** CardioHistory
   (CardioHistoryScreen.js) is reverse-chron rows with delete, no aggregation, no
   trend, no per-activity rollup, no week summary view; and its only door
   (CardioPlanCard "History") hides until `done>0` (CardioPlanCard.js:42). Cardio is
   logged today-only (entryDate plumbed but never passed, §2). Thin for an athlete.

5. **Wearable data is narrow: steps + weight in, workout out, nothing else.** The
   app reads from a watch that also has HR, sleep, HRV, distance, active-energy,
   resting HR — none ingested. Cardio capture is duration+intensity only (no
   distance/pace/HR/zones), so a wearable user re-enters by hand what their watch
   already measured. Recovery model is lift+cardio-impact only; no HRV/resting-HR
   readiness input despite the data being one scope away.

**Other code-level frictions / notes**
- **daily_steps cloud table may be unmigrated** (migration 056 "pending on this
  project", sync/tables/dailySteps.js:73,100) — push/pull benignly skip, so steps
  may be **local-only, never syncing** across a user's devices until 056 is applied.
- **Android raw-sum fallback double-counts** multi-tracker users (health.js:459);
  mitigated downstream by COMP-026 winsorise+median+persistence but NOT for the
  displayed daily step count or the simple step-target average.
- **No nudge/notification** for steps or cardio; both are pull surfaces the user
  must remember to open (Home pill aside).
- **Manual step entry path:** check-in `stepsAvg` is the only manual route; there is
  no per-day manual step input on Home when auto-read is unavailable (the cell just
  hides, TodayStrip.js:175).
- **Safety verified:** cardio cannot spiral (MAX_CARDIO_SESSIONS=5, pauses on poor
  recovery); steps capped at band.upper; COMP-026 gain hard-clamped [0.5,0.65] and
  downstream of every senior clamp; the "moving less" trend line is suppressed under
  an open ED flag (weightTrend.js:57, MethodologyScreen copy). No floor-breach path
  found from any movement input.

---

## 5. Surface inventory (counts)

- **Screens: 2** — LogCardioScreen.js (activity picker + duration/intensity + kcal
  feedback), CardioHistoryScreen.js (flat reverse-chron list + delete). Plus shared
  hosts: SettingsHealthScreen, SettingsCoachingScreen, WeeklyCheckInScreen,
  MethodologyScreen, NutritionEducationScreen (not cardio/steps-owned).
- **Components: 2 dedicated** — CardioPlanCard.js (Progress "Cardio this week"),
  TodayStrip.js cardio + steps cells (Home). (CardioPlanCard hosted in AnalyticsScreen.)
- **Engine / pure modules: 3** — cardioEngine.js (dose/compliance/recovery-flag/
  week-summary), cardioMath.js (MET/kcal/fatigue/load), cardioActivities.js
  (35-activity library). Plus stepsSummary.js, and `computeStepTrendModifier` +
  `computeAdaptiveTDEEAdjustment` in nutritionEngine.js, and the step/cardio blocks
  in weeklyCoach.js.
- **Health / wearable libs: 3** — health.js (HealthKit/Health Connect wrapper:
  weight+steps read live, workout write live), activitySteps.js (steps read/persist/
  connect), stepsLaunchPrompt.js (one-per-install connect prompt). Native:
  modules/watch-bridge + targets/watch (Apple Watch), watch/bridge.js JS coordinator.
- **COMP-011 explainer surfaces: 3** — LogCardioScreen.js:226, CardioPlanCard.js:57,
  NutritionEducationScreen.js:45 (recurring, no dismiss-flag; the "one-time" claim is
  a stale comment only).
- **Cardio library: 35 activities** / 10 categories, each with a [low,mod,high] MET
  triple, recoveryImpact, impactType, coachTargetable.
- **Step bands: 7 phases** (STEPS_BANDS), athlete-adjusted >100 kg.
- **Sync: 2 per-table serialisers** — dailySteps.js + cardioLog.js (LWW, cloud table
  056 possibly unmigrated → benign skip). daily_steps no soft-delete; cardio_log soft.
- **Widgets carrying cardio/steps: 0.** Notifications for cardio/steps: 0.
- **Tests: 12+** — cardioEngine, cardioLibrary, dailySteps, activitySteps, ios-steps,
  steps, watchSkip, stepTrendModifier, weeklyCoach.stepTrend, stepsSummary,
  stepsLaunchPrompt, migrations.cardioLog, sync.cardioLog, sync.dailySteps,
  healthConsentRouting.guard.
