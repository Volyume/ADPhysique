# a-18 — Safety systems (AUDIT-ONLY, the system is untouchable)

ULTIMATE-APP MANDATE, Phase 1, Area 18 (FINAL audit area). Branch
`claude/admiring-bohr-2kb7pd`. Code-verified, no internet, file:line evidence.

> SCOPE NOTE. This document reads and describes the ED safety system AS BUILT.
> It proposes nothing that changes any floor, threshold, signpost or
> suppression rule. CLAUDE.md names `src/coaching/safety/` as the sacred path;
> in this repo the safety system is NOT under that directory — it lives across
> `src/lib/` (engine), `src/lib/notifications/`, `src/lib/partners/`,
> `src/lib/widgets/`, `src/hooks/` and `src/screens/`. The directory name in
> CLAUDE.md is stale relative to the code; the system itself is fully present
> and is treated as sacred here regardless of path. (GAP-1, flag-only.)

---

## 0. The five pillars at a glance

| # | Mechanism | Trigger (exact) | Effect | Source |
|---|-----------|-----------------|--------|--------|
| A | Sex calorie floor | `targetKcal < 1500` (male) / `< 1200` (female) at plan time | Raises target to floor, sets `floorApplied=true`, pushes warning | `nutritionEngine.js:792-799` |
| B | 1.5%/wk hard gate | deficit loss rate `> HARD_GATE_LOSS_RATE` (0.015 of BW/wk) at plan time | Caps target to limit loss to 1.5% BW/wk, `floorApplied=true` | `nutritionEngine.js:808-817` |
| C | FFM energy floor (RED-S) | 7-day avg intake ≤ FFM-derived floor (30 kcal/kg FFM) AND a cut was about to be suggested AND ≥5 days logged | Refuses the cut, surfaces `ffm_floor` held decision; increases never blocked | `nutritionEngine.js:354-385`, `597-624`; `weeklyCoach.js:826-862` |
| D | Rapid-loss compression | cut phase AND `actualRatePct ≤ -1.5` AND `energy ≤ 2` AND not cycle-flagged | Bypasses 2-wk cooldown + off-target gate, adds +125…+300 kcal immediately (upward-only) | `weeklyCoach.js:677-682, 757-770, 1138-1146` |
| E | ED-pattern flag | ≥2 (or ≥3 if GoalLock advanced) of 4 stacking signals | Raises persistent flag → app-wide suppression + Beat signposting + calorie-cut lockout | `edPatternDetector.js:54-72`; `weeklyCoach.js:1068-1120` |

Plus two user-controlled / one-shot layers:
- **Wellbeing "calm" mode** (`wellbeing.js`): a single user preference that softens copy across the app; never a secret, changeable in Settings.
- **SCOFF wellbeing screen** (`WellbeingCheckScreen.js`): 5-question screen; `scoffScore ≥ 2` both signposts the user to a GP/dietitian AND feeds `scoffPositive`/`edSuppressed` gates downstream.

---

## 1. WHAT — every mechanism, exact trigger and effect

### A. Sex-based calorie floor (1,500 male / 1,200 female)
`nutritionEngine.js:792` — `const kcalFloor = sex === 'male' ? 1500 : 1200;`
Fires at PLAN-GENERATION time (the macro/target computation, not weekly
coaching). If the computed `targetKcal` is below the floor it is raised to the
floor (`:797`), a warning is pushed (`:794-796`), and the structured signal
`floorApplied = true` is set (`:791, :798`). The comment at `:786-790` notes the
flag is the contract downstream consumers gate on (e.g. the meal-plan TD/NTD
cycle must never carve calories off a floored target) — never warning-string
matching. NOTE: a non-'male' sex (including null) takes the 1,200 floor — the
SAFER (lower-risk-of-underfeeding-a-woman) branch is the default. Verified.

### B. 1.5%/week rapid-loss HARD GATE (plan time)
`nutritionEngine.js:808-817`. When the estimated weekly loss fraction exceeds
`HARD_GATE_LOSS_RATE`, calories are raised so loss is capped at 1.5% BW/wk:
`maxWeeklyDeficit = HARD_GATE_LOSS_RATE * safeWeight * KCAL_PER_KG_FAT`
(`:814`). Also sets `floorApplied=true`. A softer 0.8% (`MAX_SAFE_LOSS_RATE`)
threshold only warns, never clamps (`:818-823`). Contest-prep adds a
"consult a sports dietitian" warning unconditionally (`:826-830`).

### C. FFM (fat-free mass) energy floor — RED-S guardrail
Threshold: `FFM_FLOOR_KCAL_PER_KG = 30` (`nutritionEngine.js:119`), from
Mountjoy 2014/2023 IOC RED-S consensus (comment `:289`, `:582`,
`weeklyCoach.js:826-834`). `computeFFMFloor` (`:597-624`) computes FFM via
Katch-McArdle when BF% is known & reliable, else a population fallback
fraction that deliberately rounds to the HIGHER (safer, protect-more) FFM
side (`:585-588`).
- In the ENGINE (`computeAdaptiveTDEEAdjustment`, `:354-385`): runs only with
  ≥5 days of intake in the window; if 7-day avg ≤ floor AND the adjustment is
  negative, the deficit is refused and the held-insight copy is set
  (`:376-380`).
- In WEEKLY COACH (`:826-862`): independently re-derives the floor and, if
  `recentIntakeAvgKcal ≤ floorKcal` AND `calorieAdjustment.change < 0`, sets
  `ffmFloorHeld=true` and nulls the calorie cut (`:854-861`). Increases are
  never blocked (comment `:833`). The hold is GoalLock-INDEPENDENT
  (`edPatternDetector.js:26-27`).

### D. Rapid-loss compression (Move #3, upward-only)
`weeklyCoach.js:677-682` — `rapidLossOverride` true when `phase.isCut &&
!cycleOverride && actualRatePct ≤ -1.5 && energyScore ≤ 2`. When fired it
BYPASSES the two-week cooldown and the `consecutiveOffTargetWeeks` gate
(`:684-696`) and adds calories immediately: base +125, +150 per extra 1.0%/wk
of loss, capped at +300 (`:761-768`). Upward-only by design — the same
condition on a bulk does not compress the downward gate (comment `:674-676`).
Never overridden by the adaptive-TDEE resize (`:795`, the resize skips when
`rapidLossOverride`). Surfaced as a `rapid_loss_corrected` held decision
(`:1138-1146`) and its own calm-green block (`CoachOutputScreen.js:671-681`).
Separately, a passive `rapidWeightLossFlag` boolean is set on the same
condition with `<` instead of `≤` (`:961-967`) for telemetry/surfacing.

### E. ED-pattern flag — the multi-signal detector
Pure, no I/O (`edPatternDetector.js:6-9`). Four stacking signals
(`:14-27, 57-60`):
- **s1 rapid_loss**: `weightTrendPctPerWeek ≤ -1.5` (`:30, :100-103`).
- **s2 low_energy**: energy ≤ 2 for ≥2 consecutive recent weeks (`:105-109`).
- **s3 sustained_under_adherence**: adherence = 'under' in ≥2 of last 3 weeks
  (`:111-116`).
- **s4 weight_only_checkins**: ≥2 of last 3 weeks had a check-in but no food
  data (`:118-126`).

Threshold: fire on **≥2** signals normally, **≥3** when GoalLock advanced
(`:62-64`). Any one signal alone is normal — the fire is the STACK (`:11-13`).
`buildReason` (`:128-135`) joins the human reason. `ED_PATTERN_CONSTANTS`
(`:138-146`) exports the thresholds for tests.

CLEARANCE (`hasEdPatternCleared`, `:81-96`): a previously-raised flag clears
only when the two most-recent weeks BOTH show no signal (energy > 2, adherence
≠ 'under', food data present) AND current trend is not rapid loss. Documented
approximation: prior-week rapid-loss can't be reconstructed without trend
snapshots (`:84-89`). Conservative — it under-clears rather than over-clears.

State machine (`database.js:6279-6332`): `getOpenEdPatternFlag` returns the
newest row with `cleared_at IS NULL` (`:6281-6289`); `raiseEdPatternFlag`
inserts `flag_state='raised'` or updates the open row's reason/signals
(`:6302-6321`); `clearEdPatternFlag` sets `flag_state='cleared'` + `cleared_at`
(`:6323-6332`). Sync: pull-only, server-authoritative, `server_wins` — the
server (engine + `upgrade_tier` RPC) owns the row; the device pulls it so a
fresh install / second device sees the live flag (`sync/tables/edPatternFlags.js:1-50`).

Wiring into weekly coach (`weeklyCoach.js:1076-1120`): when `edPatternOpen`,
checks for clearance; else runs the detector and, if fired, records the result.
When fired OR already open, any negative `calorieAdjustment` is nulled
(`:1105-1108`) and an `ed_pattern_lockout` held decision is pushed to the TOP
slot (`:1109-1114`). Output exposes `edPatternFired`, `edPatternSignals`,
`edPatternClearedThisWeek` (`:1287-1289`). The DB write-back + telemetry
happen in `CoachOutputScreen.js:1269-1281`
(`raiseEdPatternFlag`/`clearEdPatternFlag` + `ed_pattern_flag_fired`).

### Wellbeing "calm" mode (user-controlled)
`wellbeing.js`: values `calm` / `normal` / `unspecified` (default), stored in
AsyncStorage under `@volyume_wellbeing_mode` (`:14`), asked once at first run,
changeable in `SettingsCoachingScreen.js:104`. `isCalm(mode)` (`:34-36`). NOT
a flag-state, NOT a secret (`:4-5`). Softens copy across the app (see §2).

### SCOFF wellbeing screen
`WellbeingCheckScreen.js`: the 5 standard SCOFF questions (`:12-18`). On save,
`score = count of 'yes'` (`:50`); persisted to profile (`scoffScore`,
`:53-54`). `score ≥ 2` shows a supportive GP/dietitian signpost alert
(`:56-61`). The stored `scoffScore` feeds two downstream gates:
`scoffPositive` (gates deficit suggestions in the coach, `weeklyCoach.js:407,
684, 1149-1150`) and `edSuppressed` in the streak/partner surfaces
(`useWeeklyStreak.js:103`, `weekSignalWriter.js:57`). Answers are local-only
(`:118-120`).

### GoalLock
`GoalLockConsentScreen.js`: shown in Pro onboarding for aggressive-cut goals,
also editable from the You tab (`:13-31`). Two options — `advanced`
("experience / working with a coach") raises the ED detector threshold from 2
to 3 signals; `standard` is the default (`:22-28`). Writes
`goal_lock_advanced` to `user_body_profile` (`database.js:6336-6354`) and
emits `goal_lock_set`/`goal_lock_cleared` telemetry (`:59-61`). The FFM floor
is explicitly NEVER affected by GoalLock (`edPatternDetector.js:26-27`;
screen copy `:24-26`).

---

## 2. WHERE — the complete suppression / surface map

The central app-wide read is **`getOpenEdPatternFlag(userId)`**
(`database.js:6281`). Every consumer treats a non-null return as "suppress".
Several surfaces ALSO OR-in `scoffScore ≥ 2` and/or `isCalm` (the "neutral"
read). Full map:

| Surface | File:line | Suppression key | Effect when active |
|---------|-----------|-----------------|--------------------|
| Weekly coach calorie cut | `weeklyCoach.js:1105-1108` | `edPatternResult.fired \|\| edPatternOpen` | negative calorie change nulled; `ed_pattern_lockout` held decision |
| Coach deficit suggestion | `weeklyCoach.js:684, 1149-1150` | `scoffPositive` | `canAdjustCals` false; "Calories held. Wellbeing screen flagged restriction concerns." |
| Weight-trend card | `weightTrend.js:94-116` | `edFlagOpen` | direction-only copy, no rate, no maintenance estimate, no dot |
| `useWeightTrend` hook | `useWeightTrend.js:37, 68` | `getOpenEdPatternFlag` | passes `edFlagOpen` into the builder above |
| Home TodayStrip weight cell | `HomeScreen.js:561-567`; `TodayStrip.js:23` | `getOpenEdPatternFlag` | weight value only, sparkline dropped |
| Weekly streak run | `useWeeklyStreak.js:103-104`; `streak.js:20, 72-74, 97` | `edFlag \|\| scoffScore ≥ 2` | week reads 'resting' / run frozen benignly (indistinguishable from deload — privacy) |
| Streak section UI | `StreakWeeksSection.js:7`; `WeeklyStreakStrip.js:11` | suppressed VM | whole section hidden / suppressed strip |
| Partner week signal | `weekSignalWriter.js:42-57`; `service.js:73`; `sharedStreak.js:8-10` | `edFlag \|\| scoffScore ≥ 2` | signal frozen → 'resting'; partner can't tell hold from recovery |
| Home widget snapshot | `widgets/writer.js:72-78`; `widgets/snapshot.js:13, 58` | `getOpenEdPatternFlag` | consistency block suppressed entirely |
| Win-back push | `scheduler.js:467-478` | `getOpenEdPatternFlag` | never laid; any laid one cancelled |
| Missed check-in follow-ups | `scheduler.js:565-599` | `getOpenEdPatternFlag` | never laid; retired if present |
| Partner-beat pushes | `scheduler.js:946-957` | `getOpenEdPatternFlag` | silenced (partner surface freezes benignly) |
| Smart push delivery | `handler.js:106-116`; `categories.js:72` | `_edFlagOpen` | delivery downgrades while flag open |
| Coach register / tone | `coachRegister.js:21-27` | open ED/wellbeing flag OR calm | supportive register forced; safety/lockout copy register-blind |
| Coach response rate language | `coachResponse.js:25, 321, 402` | `edFlagOpen` | weight-change RATE language suppressed |
| Year of Lifts / recaps | `YearOfLiftsScreen.js:373-377`; `scheduler.js:893, 909-911` | `isCalm \|\| edFlag` → `neutral` | softened recap copy |
| Workout summary milestones | `WorkoutSummaryScreen.js:368-384`; `milestones.js:25` | `isCalm`/edFlag | milestone claim skipped during hold, caught later |
| Body Metrics | `BodyMetricsScreen.js:467-470, 707` | `isCalm`, `getOpenEdPatternFlag` | calm copy + `WELLBEING_HELPLINE` shown on confirm |
| Nutrition Targets | `NutritionTargetsScreen.js:232-233` | `isCalm` | calm copy |
| Analytics | `AnalyticsScreen.js:80, 176` | open flag | section gated for free user under open flag |
| Paywall excerpts | `paywallExcerpts.js:26` | screened safe for all incl. open flags | nothing restriction-themed shown |

### Beat UK / ED signposting surfaces
1. `wellbeing.js:16-17` — `WELLBEING_HELPLINE` constant: "Beat Eating Disorders
   UK: 0808 801 0677 (free, confidential)." Rendered on
   `BodyMetricsScreen.js:707`.
2. `food/HeldDecisionCard.js:16, 20-24, 51-60` — `BEAT_URL`
   (`beateatingdisorders.org.uk`), "Get support" button for `ed_pattern` type;
   never dead-ends (falls back to showing the address, `:21-23`).
3. `CoachOutputScreen.js:612-651` — `EdPatternLockoutBlock`: full locked copy
   (`ED_PATTERN_LOCKOUT_COPY`), a locale-aware support link via
   `getEdSupportLink(locale)` (`:614-621`) so international users get a local
   ED charity, not only Beat UK. Primary CTA = support link.
4. `WellbeingCheckScreen.js:56-61` — SCOFF ≥ 2 GP/dietitian signpost alert.

### Safety telemetry
`telemetry/events.js:25-31`, Panel 2: `ed_pattern_flag_fired`,
`ed_pattern_flag_cleared`, `goal_lock_set`, `goal_lock_cleared`,
`ffm_floor_hold_fired`, `rapid_loss_compression_triggered`. Engine telemetry
written via `recordEngineTelemetry`/`engine_telemetry` table
(`database.js:6356-6385`), scoped per-user on flush (`:6371-6385`). Fired from
`CoachOutputScreen.js:1274-1281, 1314` (`flags_fired: ['ed_pattern']`).
Migrations: `migrate_017_ed_pattern_and_telemetry.sql`,
`migrate_027_rapid_loss_compression_telemetry.sql`. No PII leaves device
(EU-residency rule); telemetry is event names + numeric payloads.

### How safety interacts with the deterministic engine (clamp order)
At plan time (`nutritionEngine.js`): target computed → **sex floor** (B/A) →
**1.5% hard gate** → loss-rate warnings → macros. At weekly coach time
(`weeklyCoach.js`): off-target/rapid-loss decides a change → adaptive-TDEE
resize (same-direction only, never reverses, `:795-804`) → ±5% cap (`:809-811`)
→ **FFM floor** nulls negative changes (`:826-862`) → **ED lockout** nulls
negative changes + top held decision (`:1105-1114`). Seniority is explicit:
rapid-loss boost is fixed and senior (never resized/reversed); FFM floor and ED
lockout sit ABOVE the step-trend resize, which is why `stepTrendApplied` is
reported false if a senior clamp later nulls the change (`:1306-1311`). SAFETY
reads the PLAIN less-damped EWMA, never the cycle-robust trend used for the
on-target decision (`:556-565`).

---

## 3. FEEL — flagged user vs healthy user

**Healthy user never notices ANY of it.** Default wellbeing is `unspecified`
→ normal UX; no flag → every suppression branch is the identity path. Streaks,
widgets, pushes, recap copy, weight-rate language all render normally. The
floors (A/B/C) only fire on genuinely unsafe targets; the typical user's plan
sits above them and the warnings never appear. This is the right outcome —
zero friction for the 99%.

**Flagged user experiences a calm, consistent softening, NOT a wall.** When the
ED flag is open: calorie cuts silently stop (lockout), the weight card drops to
gentle direction-only copy ("drifting down" not "-1.8%/wk"), the streak freezes
as "resting" (visually identical to a deload — deliberate, so the app never
signals "we think you have an ED" through the streak), pushes go quiet,
recaps/milestones soften, and the CoachOutput surfaces ONE clear,
non-alarming `EdPatternLockoutBlock` with locked supportive copy and a
locale-correct support link. The register is forced supportive
(`coachRegister.js:21-27`) regardless of the user's tone preference. The
silence is CALM by construction: every surface "freezes benignly" rather than
showing an error or a scary banner.

**Risk of confusion is low but real.** The streak/partner freeze is
intentionally indistinguishable from a recovery week, so a flagged user who
expects their streak to advance sees it "rest" with no explanation on those
surfaces — the explanation lives only on the CoachOutput lockout card. A user
who never opens the weekly coach screen could see the quiet streak and softened
copy without ever encountering the explanatory block or the Beat link. (See
GAP-2.) Clearance is well-handled: a calm green `EdPatternClearedBlock`
("standard coaching resumes next week") tells the user the hold lifted, so the
exit is not silent.

---

## 4. GAPS / FRICTION — observations ONLY (flag, never fix)

- **GAP-1 (path drift).** CLAUDE.md's sacred path `src/coaching/safety/` does
  not exist; the safety system lives across `src/lib/`, `src/lib/notifications/`,
  `src/lib/partners/`, `src/lib/widgets/`, `src/hooks/`, `src/screens/`. The
  protection intent is met but the directory pointer is stale — a future agent
  trusting CLAUDE.md literally would not find (and might not realise it is
  touching) the safety code. Documentation inconsistency, not a code hole.

- **GAP-2 (explanation reachability).** The ED lockout's full explanation +
  Beat link live only on `CoachOutputScreen` (`EdPatternLockoutBlock`) and the
  food `HeldDecisionCard`. The Home/streak/widget/push suppressions are silent
  by design. A flagged user who does not open the weekly coach screen sees the
  softened/frozen surfaces with no in-context route to the support copy. The
  silence is intentional (privacy) but the only signpost is behind a screen the
  user may not visit. Observation only.

- **GAP-3 (two suppression vocabularies).** Some surfaces suppress on
  `getOpenEdPatternFlag` ALONE (weight card `weightTrend.js:95`, TodayStrip
  `HomeScreen.js:565`, widgets `writer.js:72`, all notification schedulers,
  coach lockout `weeklyCoach.js:1105`), while streak (`useWeeklyStreak.js:103`)
  and partner signal (`weekSignalWriter.js:57`) ALSO suppress on
  `scoffScore ≥ 2`. So a SCOFF-positive user with NO open ED flag gets a frozen
  streak and frozen partner signal, but their weight card, widget and pushes
  behave normally. The suppression set is therefore not uniform across
  surfaces. Whether that asymmetry is intended is unclear from the code;
  flag-only.

- **GAP-4 (calm-mode coverage is per-screen).** `isCalm` softening is wired
  screen-by-screen (Home, BodyMetrics, NutritionTargets, YearOfLifts,
  WorkoutSummary, CoachOutput, recap pushes). There is no central enforcement,
  so any NEW user-facing surface must remember to read `getWellbeingMode`. A
  future surface that forgets would render normal (potentially rate-/figure-led)
  copy to a calm-mode user. Structural observation, not a current bug.

- **GAP-5 (FFM floor double-computation).** The FFM floor is computed
  independently in two places (`nutritionEngine.computeAdaptiveTDEEAdjustment`
  `:354-385` and `weeklyCoach.js:826-862`) with the same inputs and threshold.
  Functionally consistent today (both call `computeFFMFloor`, both gate on ≥5
  days), but the duplication is a drift risk if one is edited and the other is
  not. No current inconsistency found.

- **GAP-6 (detector sex-default vs floor sex-default).** The sex calorie floor
  defaults a missing/unknown sex to the 1,200 (women's, safer) floor
  (`nutritionEngine.js:792`). The FFM fallback defaults to `FFM_FALLBACK_FRACTION.male`
  when sex is unknown (`:620`). Two different "unknown sex" defaults in the same
  safety stack. Both are defensible in isolation (lower floor = safer; the FFM
  comment `:585-588` says it rounds to the safer/higher FFM side), but the
  inconsistency is worth noting. Observation only.

- **NOT-A-GAP (verified clean).** The clearance approximation
  (`hasEdPatternDetector.hasEdPatternCleared`) is conservative (under-clears),
  the support link never dead-ends (`HeldDecisionCard.js:21-23`), telemetry is
  per-user scoped (`database.js:6371-6385`), and the rapid-loss boost is
  correctly senior to every resize. No hole where a calorie CUT bypasses the
  ED lockout or FFM floor was found: both null negative changes after the
  resize and ±5% cap, so a later-sized cut still gets clamped.

---

## 5. Surface inventory

**Safety mechanisms (7):** sex calorie floor; 1.5% hard gate; FFM/RED-S energy
floor; rapid-loss compression; ED-pattern flag (4-signal detector +
state machine); wellbeing calm mode; SCOFF wellbeing screen. Plus GoalLock as
the threshold-modifier consent.

**Core safety code files (12):**
`src/lib/edPatternDetector.js`, `src/lib/wellbeing.js`,
`src/lib/nutritionEngine.js` (floors + FFM), `src/lib/weeklyCoach.js`
(FFM floor / rapid-loss / ED lockout integration), `src/lib/coachRegister.js`,
`src/lib/coachResponse.js`, `src/lib/weightTrend.js`, `src/lib/streak.js`,
`src/lib/database.js` (flag state machine + telemetry),
`src/lib/sync/tables/edPatternFlags.js`,
`src/lib/partners/weekSignalWriter.js`, `src/lib/widgets/writer.js`.

**Suppression / surface consumers (21 surfaces)** — enumerated in the §2 table
(coach calorie cut, deficit suggestion, weight-trend card, useWeightTrend,
TodayStrip weight cell, weekly streak run, streak section UI, partner week
signal, widget snapshot, win-back push, missed-checkin follow-ups, partner-beat
pushes, smart push delivery, coach register, coach rate language, recaps/Year
of Lifts, milestones, Body Metrics, Nutrition Targets, Analytics, paywall
excerpts).

**Signposting surfaces (4):** `WELLBEING_HELPLINE` on BodyMetrics; Beat "Get
support" on food `HeldDecisionCard`; locale-aware support link in
`EdPatternLockoutBlock`; SCOFF ≥ 2 GP/dietitian alert.

**Safety telemetry events (6):** `ed_pattern_flag_fired`,
`ed_pattern_flag_cleared`, `goal_lock_set`, `goal_lock_cleared`,
`ffm_floor_hold_fired`, `rapid_loss_compression_triggered`.

**Screens (5):** `WellbeingCheckScreen.js`, `GoalLockConsentScreen.js`,
`CoachOutputScreen.js` (lockout/cleared/rapid-loss blocks),
`BodyMetricsScreen.js` (helpline), `SettingsCoachingScreen.js` (calm toggle).

NO code was modified. NO change is proposed to any floor, threshold, signpost
or suppression rule.
