# Adversarial hunt — the app's OWN inviolable safety invariants

Surface: ED-safety fail-OPEN / bypass, calorie- & FFM-floor bypass, Article 9 /
share-card / partner leak, engine determinism, Free/Pro gating at the data
layer. READ-ONLY. Every finding below is traced to code with a concrete trigger.

Most-severe first.

---

## 1. [MAJOR — ED-safety fail-OPEN class] [FOUNDER-DECISION] `src/lib/partners/weekSignalWriter.js:73` — the OUTBOUND ED freeze fails OPEN on an ED-flag read error, leaking a sender's wellbeing hold (live ticks + milestone) to their partner

**Code.** `computeCurrentWeekState` (the source-of-truth for what the user
broadcasts to every partner) reads its OWN open-ED-pattern flag with the
fail-OPEN sentinel:

```js
getOpenEdPatternFlag(userId).catch(() => null),   // line 73
...
const edSuppressed = !!edFlag || (Number.isFinite(scoffScore) && scoffScore >= 2); // line 85
```

Everywhere else in the app the ED-flag read uses the blessed fail-CLOSED
sentinel `.catch(() => 'read_failed')` (truthy → suppress): see
`moments.js:90`, `useWeeklyStreak.js:83`, `coachReport.js:259`,
`HomeScreen.js:470`, `CoachOutputScreen.js:1075`. This one outbound writer is
the single asymmetric consumer — it catches to `null`, which is falsy.

**Trigger.** A sender with a currently-OPEN `ed_pattern_flags` row (and
`scoffScore < 2`) writes a week signal (workout-finish path
`ActiveWorkoutScreen.js:1717`, or the Progress-view path `usePartners.js:137`)
at a moment when `getOpenEdPatternFlag` throws — a routine SQLCipher failure
(DB locked by a concurrent write, key not yet unlocked after cold boot / on the
first foreground, a mid-migration read). `getOpenEdPatternFlag` (database.js:6998)
does not catch internally; it awaits `db()` then `getFirstAsync`, both of which
throw on those conditions.

**Failure.** `edFlag = null` → `edSuppressed = false` → `computeWeekState`
returns the user's REAL state instead of the protective `'resting'`, and
`deriveMilestones` runs with `base.state !== 'resting'` so `completedBlock` /
`hitPb` are NOT forced false (lines 96–101). `writeOwnWeekSignals` then pushes
`{ planned, done, weekMet: true, state: 'met'/live, completedBlock, hitPb }` to
every active pair (line 145–146). The module's own docstring (lines 10–13) is
the safety contract this violates: "an open flag … freezes the outbound signal
to 'resting' … the partner can never tell a wellbeing hold from recovery, and
the safety system never leaks into the pair surface." On the read failure it
does exactly the opposite.

**End-to-end leak.** The partner's device reads the pushed signal via
`moments.js` (`getPartnerWeekSignal` → `completedBlock`/`hitPb`), and if the
RECIPIENT is not themselves suppressed, surfaces
`"<name> finished their training block."` / `"<name> set a new personal best."`
(moments.js:174–195) plus live ticks in the PairCard — during the sender's ED
hold. The recipient-side fail-closed guards protect only the RECIPIENT's own
wellbeing, not the sender's; the sender's protection is exactly this outbound
freeze, which failed open.

**Not covered by the existing guard.** `weekSignalScoff.guard.test.js` only
pins that call sites pass `scoffScore`; it says nothing about the ED-flag read
sentinel. `weekSignalWriter.test.js:47-94` mocks the DB to RESOLVE, never to
reject, so the read-failure branch is untested.

**Minimal fix (FOUNDER-DECISION — ED-safety):** change line 73 to the blessed
sentinel and treat it as suppress, e.g.
`getOpenEdPatternFlag(userId).catch(() => 'read_failed')` and
`const edSuppressed = edFlag === 'read_failed' || !!edFlag || (scoff>=2);`.
Touches the ED-safety freeze path, so founder call.

---

## 2. [MINOR — ED-flag lever forgotten] [FOUNDER-DECISION] `App.js:698-699` — monthly-recap `neutral` uses fail-open `getWellbeingMode()` and omits the open-ED-flag lever its own contract expects

**Code.**
```js
const { getWellbeingMode, isCalm } = require('./src/lib/wellbeing');
neutral = isCalm(await getWellbeingMode());   // calm ONLY; getWellbeingMode fails OPEN
...
await checkMonthlyRecapReady({ ..., neutral });
```

`checkMonthlyRecapReady`'s own contract (scheduler.js:1300) states the body
"softens under calm mode / an open ED flag (passed in as `neutral`)". The call
site only computes calm mode, never reads `getOpenEdPatternFlag`, and routes it
through `getWellbeingMode()` which swallows a storage read error to
`'unspecified'` (wellbeing.js:19-26) → `neutral = false`.

**Trigger / failure.** (a) A user with an OPEN ED flag but calm-mode off gets
`neutral = false` → the non-neutral copy "45 seconds of what you put in last
month" instead of the softened line — the ED-flag lever the function documents
is never fed. (b) A transient AsyncStorage read failure → `'unspecified'` →
`neutral = false`, i.e. fails OPEN. Impact is bounded: this is a WORKOUT recap
(session counts, not weight/food), and the two copy variants differ only in
tone — so severity is minor, but it is the exact "forgets a lever + fail-open
getWellbeingMode" pattern the hunt targets.

**Minimal fix (FOUNDER-DECISION):** compute `neutral` from the raw fail-closed
pattern used elsewhere — `getOpenEdPatternFlag(id).catch(() => 'read_failed')`
OR/AND a raw `WELLBEING_KEY` read with `.catch(() => 'read_failed')`, mirroring
`coachReport.js:259-269`.

---

## 3. [MINOR — celebration lever forgotten] [FOUNDER-DECISION] `App.js:438-440` — PR-celebration `subdued` uses fail-open `getWellbeingMode()` and honours calm mode only

**Code.**
```js
useEffect(() => {
  if (prCelebration) getWellbeingMode().then(m => setCalm(isCalm(m)));
}, [prCelebration]);
// render: <PRCelebration subdued={calm || reduceMotion} />  (App.js:919)
```

**Trigger / failure.** `getWellbeingMode()` fails OPEN (read error →
`'unspecified'` → `calm = false`), and the effect never consults the open-ED
flag or SCOFF. A user with an open ED flag (calm off) sees the FULL particle /
spring PR celebration. Impact is limited: this is a LIFTING personal-best
(a Free, non-weight/non-food surface), and the only thing `subdued` changes is
animation intensity, not content — so minor. Still a named "celebration
surface … still uses getWellbeingMode()" instance.

**Minimal fix (FOUNDER-DECISION):** read the raw wellbeing key + ED flag
fail-closed, matching the other celebration surfaces (useWeeklyStreak.js).

---

## 4. [MINOR — defence-in-depth asymmetry, not a confirmed bypass] [FOUNDER-DECISION] `src/lib/food/effectiveTargets.js:42` — the banked-day branch is the only day-type branch with no floor re-clamp

**Observation.** `resolveEffectiveTargets` re-clamps the DISPLAYED target to the
safe floor in TWO of its three non-plain branches — the per-day-of-week offset
(lines 51-56, `minDelta = floor - baseKcal`) and the macro-cycle day
(lines 68-79, lifts a sub-floor persisted rest day up to `floorKcal`). The
banked branch is the exception:

```js
if (bankedDelta) return applyBankToTarget(targets, bankedDelta);   // line 42 — no floorKcal clamp
```

**Why it is (currently) safe.** `planCalorieBank` (calorieBank.js:74-82)
guarantees by construction that no other day drops below `floorKcal`
(`roomDownMin = min(perDayBaseKcal[k] - floorKcal)`), the delta map sums to
zero, and `displayBankedDelta` zeroes a stale bank when banking is unavailable.
So on the normal path the banked display cannot fall below floor.

**Residual concern (unconfirmed trigger).** The bank is persisted with the
`floorKcal` in force AT CREATION. If the user's weight later drops and the FFM
floor rises, a persisted lower-calorie day whose stored delta was floor-safe
against the OLD floor is served here with no re-clamp against the NEW floor —
unlike the other two branches, which always clamp against the current
`floorKcal`. I could not fully construct the end-to-end trigger (it depends on
whether `bankingAvailable` is recomputed against the current floor before
`displayBankedDelta`), so this is reported as a defence-in-depth asymmetry to
close, not a proven sub-floor display.

**Minimal fix (FOUNDER-DECISION — floor-adjacent):** give the banked branch the
same `floorKcal` re-clamp the offset branch already has.

---

## Verified SAFE (adversarially checked, no leak/bypass found)

- **Sex calorie floor holds on the base target.** `calculateNutritionTargets`
  (nutritionEngine.js:860-867) applies `kcalFloor = sex==='male'?1500:1200`
  (1200 for female AND unknown/unset sex), and the returned `targetKcal`
  (`actualTargetKcal`, line 927/950) collapses to the floored `targetKcal` when
  carbs are non-negative — and only ever ROUNDS UP when carbs clamp to 0. No
  rounding/macro seam lands the displayed or stored target below floor.
- **Per-day-of-week offset** cannot display below floor: hard-clamped in
  `resolveEffectiveTargets` (`minDelta = floor - baseKcal`, offset ≤ 0 clamps to
  no-change). `sanitiseOffset` bounds input to ±1500.
- **Calorie banking** is floor-safe by construction (see finding 4) and holds
  the weekly total (sum of deltas = 0), so the coach's 7-day average / rapid-loss
  gate / ED detector see an unchanged week.
- **Manual target path (NutritionTargetsScreen)** has no raw number override —
  every result flows through the floored engine; calm mode additionally strips
  `aggressive_cut` (lines 515, 789) and reads wellbeing fail-closed (lines 220-224).
- **Engine determinism.** No `Math.random()` in any deterministic engine module
  (planEngine, nutritionEngine, weeklyCoach, coachApply, mesocycle, coachingGoals,
  cardio). The only `Math.random` hits are non-security ID generators
  (database.js, uuid.js fallback, observability.js, food/writeback.js).
  `moments.js` ids use a week key, never a raw `Date.now`.
- **Partner week-signal payload (Article 9).** `writeOwnWeekSignals` pushes only
  `{ pairId, weekStart, planned, done, weekMet, state, completedBlock, hitPb }`
  (weekSignalWriter.js:144-145) — session counts + booleans, no name, bodyweight,
  measurements, body-fat, food, or location.
- **Share-card renderer (`drawShareCard.js`)** is a pure Skia renderer; it draws
  only what the param builder passes and holds no body/weight/food data of its
  own. `buildRecompShareParams` (recompReframe.js:183) emits a LIFT strength
  delta ("kg strength gained"), title "Weight steady." — no bodyweight figure.
- **Recipient-side suppression** (moments.js, useWeeklyStreak, coachReport,
  CoachOutput, HomeScreen, BodyMetrics, ProgressPhotos, WorkoutSummary,
  YearOfLifts, NutritionTargets, CoachHeldHistory) all use the fail-closed
  `read_failed` sentinel + raw wellbeing read and check flag / SCOFF≥2 / calm /
  read-failure — no fail-open found among these.

---

### Count by severity
blocker: 0 · major: 1 (finding 1 — ED-safety fail-open class) · minor: 3
(findings 2–4). No confirmed calorie/FFM-floor bypass, no Article-9/partner raw
body/food/name leak, no determinism break, no Free/Pro data-layer bypass found
on this surface.
