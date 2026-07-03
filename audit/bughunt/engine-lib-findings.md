# Engine + lib bug/crash hunt — findings

Surface: `src/lib/*.js` + `src/lib/{cardio,food,partners,sync,notifications}/**`
(correctness + crash; security excluded, owned by another agent).
Method: read-only, every finding reproduced against the actual code and traced
to a concrete trigger. This layer is exceptionally hardened by prior audit
passes (CALC-*, F3/F10, COMP-*, EN-*): the vast majority of NaN/∞/empty-input/
floor/determinism traps are already guarded. Findings below are the residue.

Determinism sweep result: NO `Math.random()` on any pure engine path (only
`uuid.js` CSPRNG fallback and `observability.js` session id — both legitimately
non-deterministic, neither an engine output). ONE `Date.now()` determinism
inconsistency inside a function documented as pure (F2 below). All other engine
clock reads are injectable `now`/`nowMs` params read once at entry.

---

## [MAJOR][SAFE-FIX] checkinDerive.js:41-45 — `earliestWeightTs` returns `Infinity` (not `null`) for a non-empty, all-untimed weights array; first-check-in gate then waits `Infinity` days

**Code**
```js
export function earliestWeightTs(weights) {
  if (!weights || weights.length === 0) return null;
  return Math.min(...weights.map(w => w.loggedAt ?? w.logged_at ?? Infinity)
    .filter(Number.isFinite));
}
```

**Trigger** — a non-empty weights array where no row carries `loggedAt` or
`logged_at`:
```js
earliestWeightTs([{ weightKg: 80 }])            // → Infinity  (expected: null)
earliestWeightTs([{ weightKg: 80, created_at: 123 }]) // → Infinity (createdAt is NOT consulted)
```
The `.map(...)` yields `[Infinity]`, `.filter(Number.isFinite)` empties it, and
`Math.min(...[])` === `Math.min()` === **`Infinity`**. The length guard only
covers `[]`/null, so the all-untimed case is unguarded. Note the map also omits
the `createdAt`/`created_at` fallback the rest of this module (e.g.
`hasLoggedToday`, `computeRecoveryEMAs`) uses, widening the trigger.

**Failure** — consumer `WeeklyCheckInScreen.js:344-348`:
```js
const earliestTs = earliestWeightTs(weights);           // Infinity (truthy)
const daysSinceStart = earliestTs
  ? Math.floor((Date.now() - earliestTs) / 86400000)     // Math.floor(-Infinity) = -Infinity
  : 0;
const daysToWait = Math.max(0, FIRST_CHECKIN_MIN_DAYS - daysSinceStart); // Math.max(0, Infinity) = Infinity
```
`daysToWait` becomes `Infinity`: the user is told to wait forever and the first
coaching check-in gate never unlocks. The unit test only asserts `null` for
`[]`/`null`, so this path is uncovered. Realistic precondition is narrow
(morning-weight rows normally carry `loggedAt`), but an import/sync artefact or a
row shape that only carries `created_at` triggers a permanent Pro-feature block.

**Minimal fix** — compute the filtered array once and return `null` when empty
(and, for parity with the module, fall back to `createdAt`):
```js
const ts = weights.map(w => w.loggedAt ?? w.logged_at ?? w.createdAt ?? w.created_at)
  .filter(Number.isFinite);
return ts.length ? Math.min(...ts) : null;
```
Plain defensive guard, no behaviour change for well-formed data → SAFE-FIX.

---

## [MINOR][FOUNDER-DECISION] insightsEngine.js:21-23 — `mkInsight` stamps `generatedAt: Date.now()` inside a function documented "Pure … same inputs → same outputs", despite an injectable `now`

**Code**
```js
// header: "Pure function: same inputs → same outputs. No DB calls, no side effects."
function mkInsight(type, severity, copy, key, actionPayload = null) {
  return { type, severity, copy, key, actionPayload, generatedAt: Date.now() };
}
```
`generateInsights({ now })` threads `now` into every rule's time window
(`const now = Number.isFinite(args.now) ? args.now : Date.now()`) but the
per-insight `generatedAt` reads the live clock directly.

**Trigger / failure** — two calls with byte-identical inputs (and a pinned
`now`) return insights whose `generatedAt` differ. `rankAndCapInsights`
(insightsEngine.js:237) sorts by `b.severity - a.severity || b.generatedAt -
a.generatedAt`, so among equal-severity insights the ordering tiebreaker is a
live-clock value, and a crash-recovery recompute is not guaranteed bit-identical
to the persisted set. Impact is low: `generatedAt` is a metadata stamp, not a
coaching number, and within one synchronous call `Date.now()` is usually equal
across insights (V8 stable sort then preserves insertion order). It is
nonetheless the one determinism inconsistency in an engine that claims purity.

**Minimal fix** — pass `now` into `mkInsight` and use it for `generatedAt`.
Touches a deterministic-engine output shape → FOUNDER-DECISION.

---

## [MINOR][SAFE-FIX] insightsEngine.js:38-50 — `sessionsByDay` buckets sessions by UTC epoch-day, not the app's local calendar day

**Code**
```js
const day = Math.floor(at / DAY_MS);   // at = created_at ms; UTC epoch-day
```
Every other day/week boundary in the app anchors on the user's LOCAL calendar
(`dayKey.localDayKey`, Monday-local week per CLAUDE.md). Here session grouping
for stalled/peaked-lift detection uses raw `epochMs / 86_400_000`, i.e. a UTC
day.

**Trigger / failure** — for a user west of UTC, two sets of the same lift logged
either side of local midnight (e.g. 23:30 and 00:30 local, both the same
training session, but straddling UTC midnight) land in two different `day`
buckets → counted as two sessions; conversely an evening session and the next
morning's session east of UTC can merge into one bucket. This shifts the
`sessions.length < 4` / `slice(-4)` / "4 sessions same weight" windows in Rule 2
& 3, so a genuine stall/peak can be missed or mis-timed for non-UTC users.
Correctness-only (an informational "For You" card), never a crash.

**Minimal fix** — bucket on `localDayKey(at)` (or local-midnight day index) like
the rest of the app. Ordinary date-handling fix → SAFE-FIX.

---

## Notes checked and found already-guarded (no finding)
- `nutritionEngine.js` calorie/FFM/EA floors, Katch-McArdle BF% band, protein
  custom clamp, rapid-loss / diet-break epoch-0 guard — all guarded.
- `coachApply.js` sex-aware kcal floor, `ABSOLUTE_WEEKLY_SET_CEILING` anti-∞,
  macro-cycle sub-floor refusal — guarded.
- `weeklyCoach.js` single-clock (nowMs) threading, 0 kg/non-finite weigh-in
  filtering, ±5 % cap, FFM gate, weigh-in distinct-local-day dedupe — guarded.
- `effectiveTargets.js` / `perDayTargets.js` display floor clamp (display-only;
  stored target untouched, so ≤2 kcal carb-rounding drift below the *display*
  floor is cosmetic, not a safety bypass) — acceptable.
- `calorieBank.js` sum-to-zero delta, floor spread, `Math.min(...others)` (others
  always ≥1) — guarded.
- `macros.js`/`gramSolve.js`/`sanityChecks.js` non-finite coercion, no-datum
  stays null — guarded.
- `mesocycle.js`/`dayKey.js` DST-safe local-day counting, NaN-start fallbacks —
  guarded.
- `algorithms.js` 1RM rep clamp (Brzycki pole), NaN volume-status, empty-prev
  progression — guarded.
- Spread-into-`Math.max/min` sites (`tonnageMilestone`, `streakState`,
  `chartGeometry.paddedDomain`, `chartWindows.e1rmTakeaway`,
  `plateauSurfacing`, `weeklyCoach`) all have length/≥2 guards — EXCEPT
  `checkinDerive.earliestWeightTs` (MAJOR above).

---

### Count by severity
- blocker: 0
- major: 1 (`earliestWeightTs` → Infinity wait, first-check-in gate)
- minor: 2 (`insightsEngine` Date.now determinism; `sessionsByDay` UTC-day bucketing)

Determinism breaks found: 1 (`insightsEngine.js:22` `Date.now()` in a
pure-declared engine that already threads an injectable `now`). No
`Math.random()` on any engine path.
