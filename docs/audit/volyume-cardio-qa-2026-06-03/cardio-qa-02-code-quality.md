# Cardio QA — 02: Code quality audit

Status: COMPLETE. Timestamp: 2026-06-03. Method: read every cardio file; grepped
for the specific anti-patterns. Findings cite file:line. No code changed.

---

## 1. State management / store usage (Medium)

**CQ-1. Bare `useAppStore()` without a selector.**
- `src/screens/LogCardioScreen.js:41` — `const { user, userProfile, saveLocalProfile } = useAppStore();`
- `src/screens/CardioHistoryScreen.js:34` — `const { user } = useAppStore();`

Every comparable screen uses a `useShallow` selector (`DiaryScreen.js`,
`PlansScreen.js`, `HomeScreen.js` all import and use it). A bare `useAppStore()`
subscribes the component to the **entire** store, so it re-renders on any state
change anywhere (sync ticks, food edits, etc.). This is both a performance issue
and the clearest "bolt-on" signal in the cardio code: it does not match the
established convention.
FIX: select narrowly, e.g.
`useAppStore(useShallow(s => ({ user: s.user, userProfile: s.userProfile, saveLocalProfile: s.saveLocalProfile })))`.

## 2. Hardcoded values (Low)

**CQ-2. Default bodyweight `75`** — `LogCardioScreen.js:43`. A magic number for
the kcal estimate fallback. See CARDIO-BUG-6; prefer hiding the chip to
defaulting. If kept, name it (`const DEFAULT_BODYWEIGHT_KG = 75`).

**CQ-3. Recovery thresholds / fatigue weights** — `cardioMath.js`
(`FATIGUE_BY_IMPACT`, `cardioLoadLevel` bands 1.2/2.4) and `cardioEngine.js`
(`MAX_CARDIO_SESSIONS`, session/duration defaults). These ARE named constants
(good); listed only to confirm they are not scattered literals. Clean.

## 3. Component reuse / pattern consistency (Medium)

**CQ-4. The log-screen activity picker is bespoke, not the shared picker.**
`LogCardioScreen.js` builds its own `ActivityList` + search inline. The exercise
library uses `src/components/ExercisePickerModal.js`. The integration audit
(Phase 7 C1) explicitly said "modelled on `ExercisePickerModal`". The bespoke
picker works, but it is a parallel implementation of browse+search+select, which
is duplication-of-pattern and a bolt-on signal. Not a behavioural bug.
FIX (optional, polish): either reuse `ExercisePickerModal` (if its API fits a
non-exercise list) or align the bespoke picker's visual + interaction shape to
it (row height, search bar component, section headers).

**CQ-5. `summariseWeekCardio` used for a single day.** `CardioCard.js` and the
Diary `CardioRow` call `summariseWeekCardio(rows)` on one day's rows. It sums
correctly, so this is purely a naming mismatch (a "week" helper used for a day).
FIX (optional): rename to `summariseCardio` (it summarises whatever rows it is
given), or add a thin `summariseDayCardio` alias for readability.

## 4. Clean (checked, no issue)

- **No `console.log/warn/error`** in any cardio file (grep empty).
- **No commented-out code** left in the cardio files.
- **No `any`/unsafe casts** — the project is JS (not TS) so no type findings;
  JSDoc on the pure modules is consistent with the codebase.
- **No unhandled promises** — every async call in the cardio screens is inside a
  `try/catch` or `.catch(() => {})`; `useFocusEffect` cleanups use a `live` flag
  (`LogCardioScreen`, `CardioHistoryScreen`, `CardioCard`, `CardioPlanCard`).
- **No duplicated logic** — the engine functions are single-source; surfaces all
  read through the same `cardio_log` CRUD and `summariseWeekCardio`.
- **Patterns followed:** `CardioCard` mirrors `StepsCard` (same card style);
  Diary `CardioRow` reuses `styles.waterRow`; sync handler mirrors
  `dailySteps.js`; migration mirrors `migrate_056`. These are good, native-feeling.

## 5. Dead-but-tested engine functions (cross-ref coaching gap)

`nextCardioTarget`, `cardioRecoveryFlag`, `healthCardioTarget`,
`pausedCardioTarget` are exported + tested but **not called in production**
(`grep` shows definitions/tests only). `healthCardioTarget`/`pausedCardioTarget`
are deliberate spares (the "available not allocated" decision means no health
auto-target; the coach uses an inline pause object). `nextCardioTarget` (K2) and
`cardioRecoveryFlag` (R2) are genuine wiring gaps (see cardio-qa-03). Not dead
code to delete; code that should be connected.
