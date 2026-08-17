# CAMPAIGN 24 — GLOBAL COHERENCE DECISIONS

Post-wave, cross-app cohesion pass. Read-only analysis; no production code
touched. British English. Every claim carries `file:line`.

Scope note: another agent is concurrently editing `SettingsDisplayScreen.js`,
the notification files, and docs — those lanes are excluded from this sweep;
nothing below proposes touching them.

Sources read in full: `docs/whole-app-coherence-campaign-24-2026-08-17/
CAMPAIGN-24-OVERVIEW.md`, `WAVE-A-FINDINGS.md` … `WAVE-G-FINDINGS.md` (all
seven), plus the source files cited inline below.

---

## 0. Summary

| Task | Consolidate | No change | Record-only |
|---|---:|---:|---:|
| 1. Primitive sweep | 2 | 13 | — |
| 2. Deload-bucket dedup | 1 design (3 callers, 1 excluded pending a founder ruling) | — | — |
| 3. Residue | 2 mechanical removals | — | 1 (`user_insights`) |
| 4. Cross-tab consistency | 1 | — | 1 |

Fifteen primitives were swept; two produced a genuine, evidenced
consolidation candidate, thirteen were already canonical or are correctly
left distinct. No founder forks are raised as blocking — one item (§2,
CoachReviewScreen's bucket averages) surfaces a latent deload-signal
behaviour difference that would need an explicit founder ruling only if a
future implementer wants CoachReviewScreen included in the byte-identical
migration; until ruled, that caller is EXCLUDED and left exactly as it is.

---

## 1. Primitive sweep

Method: for each primitive, grep every `src/screens/*.js` (excluding
`__tests__`) for (a) the canonical component's consumer count and (b) likely
hand-rolled equivalents (direct RN primitive imports, inline pill/badge
markup, etc.), then read the divergent call sites in full before judging
SAME-CONCEPT vs DISTINCT-CONCEPT. Per the brief's conservatism instruction,
anything cosmetic-identical or already a deliberate, documented sibling
pattern is NO_CHANGE.

### 1.1 Bottom sheet — CONSOLIDATE (already done; one exclusion confirmed correct)

Canonical: `src/components/BottomSheet.js` — a thin wrapper over
`@gorhom/bottom-sheet`, extracted in a prior campaign (D24) "from the
hand-rolled sheets the audit found duplicated 6 times" (`BottomSheet.js:6-8`).
28 files reference it today (`grep -rl components/BottomSheet src/screens`
→ 28, incl. tests).

Divergence found: two screens still mount a raw RN `Modal` —
`src/screens/ActiveWorkoutScreen.js:3894,4008,4110,4713,4786` and
`src/screens/RoutineDetailScreen.js:1001` (paired with `ModalHeader` at
`:1020`).

- **ActiveWorkoutScreen.js** — DISTINCT-CONCEPT / NO_CHANGE. FOUNDER_ACCEPTED
  / NO_DEEP_REAUDIT baseline (`CAMPAIGN-24-OVERVIEW.md:8-10`): "touchable only
  for shared-component correctness … that do not change the approved logger
  UX." Swapping Modal→BottomSheet here changes presentation/gesture
  behaviour on the logger — explicitly out of bounds for this pass.
- **RoutineDetailScreen.js:1001-1066** — DISTINCT-CONCEPT / NO_CHANGE. This is
  a full-screen swap-exercise picker with its own header (`ModalHeader`,
  `:1020`), not a slide-up sheet; `ModalHeader` is itself the canonical
  shared piece and is already reused this way in 9 other screens
  (`AddCustomFoodScreen.js`, `CascadeGateScreen.js`, `FoodSearchScreen.js`,
  `RecipeBuilderScreen.js`, `ScanBarcodeScreen.js`, `ProUpgradeScreen.js`,
  `GoalChangeSummaryScreen.js`, `ScanLabelScreen.js`). "Full-screen modal +
  ModalHeader" and "bottom sheet" are two different presentations by design,
  not a drift.

### 1.2 Confirm/destructive alert — NO_CHANGE (fully consolidated)

Canonical: `src/components/AppAlert.js` (`appAlert(...)`), 57 screen consumers.
`Alert.alert` (raw RN) has exactly one hit app-wide, and it is a NEGATIVE
assertion in a guard test:
`src/screens/__tests__/BodyMetricsScreen.editDelete.guard.test.js:8` pins
"never a native Alert.alert". No production bypass exists.

### 1.3 Empty state — NO_CHANGE, with two DISTINCT-CONCEPT notes

Canonical: `src/components/EmptyState.js` (icon/title/text/CTA, `compact`
prop for inline use), 30 screen consumers.

Grepped screens for "No … yet / Nothing here / No data / haven't logged"
without an `EmptyState` import: 9 hits, 7 false positives (comments or
inline sub-list captions, not a competing empty-state pattern) plus two
genuine inline notes:

- `src/screens/SnapshotsScreen.js:122-127` — a plain `<Text>` note ("No
  snapshots yet…") inside a Settings-style list (`SettingsPage`/`SettingRow`
  chrome). DISTINCT-CONCEPT: Settings screens have their own established
  plain-note convention (`SettingsFaqScreen.js:124` uses the same idiom); it
  is not a full-page "nothing to show" state and has no icon/CTA to unify.
- `src/screens/PlanDetailScreen.js:427,456,499` and
  `src/screens/RoutineDetailScreen.js:877,895` — one-line captions nested
  inside a populated list row ("No exercises yet. Add some below."), not a
  full-screen state. DISTINCT-CONCEPT from `EmptyState`'s icon+CTA job;
  cosmetically consistent with each other already (same phrasing/weight).

No consolidation specified — both are the "cosmetic-identical local styles"
case the brief marks NO_CHANGE.

### 1.4 Loading state — ONE CONSOLIDATE CANDIDATE

Canonical: `src/components/Skeleton.js` (`SkeletonCard`/`SkeletonRow`), 32
screen consumers for section/page loading; `ActivityIndicator` (RN native)
used consistently for small inline-busy spinners (button-busy, search-in-
progress, camera-capture-busy) across `FoodSearchScreen.js:865`,
`ImportScreen.js:226,298`, `ShareCardScreen.js:506`,
`ProOnboardingScreen.js:1520,2266`, `MyRecipesScreen.js:242`,
`ScanBarcodeScreen.js:272,372`, `PartnerScreen.js:1205,1332,1683`,
`ScanLabelScreen.js:262,372` — all `size="small"?` + `color={t.colors.*}`,
no divergent implementation. DISTINCT-CONCEPT from Skeleton (inline busy vs
page/section loading placeholder); NO_CHANGE.

- **CONSOLIDATE** — `src/screens/LiftProgressScreen.js:549-561`. The
  `FlatList`'s `ListEmptyComponent` is `loading ? null : loadError ? (
  <EmptyState … />) : (<View style={styles.empty}>…)` (`:550`) — while
  `loading` is true the list area renders **nothing at all**: no skeleton,
  no spinner, no "Building…" text. `loading` is read at exactly this one
  site in the whole file (`grep -n loading src/screens/LiftProgressScreen.js`
  → line 118 declaration, line 550 only use). Compare
  `src/screens/YearOfLiftsScreen.js:751-755`, the sibling Progress-detail
  recap screen, which shows `"Building your year..."` (or the
  month/week/block variant) during its own `loading` state, and
  `src/screens/ConsistencyScreen.js:84-89`, which shows three `SkeletonCard`
  rows. LiftProgressScreen is the one Progress-detail screen with a blank
  first-paint flash. Not raised by Wave D (`grep -n "loading ? null"
  docs/…/WAVE-D-FINDINGS.md` → no hit) — a genuinely new find.
  **Fix shape**: render `SkeletonCard`/`SkeletonRow` placeholders (matching
  ConsistencyScreen's treatment, the nearest sibling on the same tab) inside
  `ListEmptyComponent` when `loading` is true, in place of `null`.
  **Risk: LOW** — presentation-only, `LiftProgressScreen.js` is not the
  locked baseline (Home/Progress-root are; LiftProgress is Progress-detail,
  touchable). **Files**: `src/screens/LiftProgressScreen.js:549-561`
  (+ import `SkeletonCard`/`SkeletonRow` from `../components/Skeleton`, not
  currently imported in this file).

### 1.5 Buttons — NO_CHANGE (fully consolidated)

Canonical: `src/components/Button.js`, 64 screen consumers. No hand-rolled
`TouchableOpacity` styled as a filled/outline/text/destructive button was
found beside it during the sweep of the primitives above (buttons appeared
consistently via `Button` at every EmptyState/BottomSheet/ModalHeader call
site read in full for §1.1-1.4).

### 1.6 Chip / segmented control / window-chip row — NO_CHANGE (correct composition)

Canonical: `src/components/Chip.js` (20 screen consumers),
`src/components/SegmentedControl.js` (3 screens: `PlanUpdateScreen.js`,
`ProGoalSetupScreen.js`, `ProOnboardingScreen.js` — all via the shared
component, confirmed by in-file comments e.g.
`ProOnboardingScreen.js:2696,1626`), and
`src/components/WindowChips.js`, which is explicitly built ON TOP of `Chip`
(`WindowChips.js:8,21-30`, "COMP-019 Stage 1a… one small, accessible control
so the three charts present windowing identically") and used by
`BodyMetricsScreen.js`, `VolumeHeatmapScreen.js`, `ExerciseDetailScreen.js`.
This is composition, not divergence — the intended pattern.

### 1.7 Text input — NO_CHANGE (fully consolidated)

Canonical: `src/components/TextField.js`, 23 screen consumers. Direct RN
`TextInput` appears in only 3 files (`ActiveWorkoutScreen.js` — locked
baseline; `ExerciseDetailScreen.js:1022` and `RoutineDetailScreen.js:911` —
both are **comments** referencing `BottomSheetTextInput`, not actual usage).
No bypass.

### 1.8 Chart frame — NO_CHANGE (fully consolidated)

Canonical: `src/components/VolyumeChart.js` / `Sparkline.js` /
`SvgBarSparkline.js`. Zero direct imports of `react-native-gifted-charts`,
`victory-native`, or `react-native-svg-charts` in any screen (grepped).
Every chart-bearing screen (`BodyMetricsScreen`, `VolumeHeatmapScreen`,
`FoodInsightsScreen`, `LiftProgressScreen`, `ExerciseDetailScreen`,
`DiaryScreen`) goes through the shared components.

### 1.9 Screen header / back header — NO_CHANGE (correct, documented siblings)

Canonical pair: `src/components/ScreenHeader.js` (5 tab-root screens —
Today/Train/Eat/Progress/Coach, `ScreenHeader.js:4-6`) and
`src/components/BackHeader.js` (61 consumers; its own header comment records
it was "extracted to kill ~16 hand-rolled copies that had drifted apart",
`BackHeader.js:9-11`). 29 screens import neither directly; nearly all of
these compose one of the two indirectly: Settings screens go through
`SettingsPage` (`src/components/SettingsPrimitives.js:83-91`, which itself
renders `BackHeader` at `:91`) — confirmed for
`SettingsAboutScreen.js:6`,`SnapshotsScreen.js:14`, and every other
`Settings*Screen.js`; food-flow modal screens
(`AddCustomFoodScreen`, `CascadeGateScreen`, `FoodSearchScreen`,
`RecipeBuilderScreen`, `ScanBarcodeScreen`, `ScanLabelScreen`, `ProUpgrade`)
go through `ModalHeader` (§1.1); onboarding-wizard screens
(`WelcomeScreen`, `FirstRunScreen`, `QuizScreen`, `ProOnboardingScreen`,
`ProSetupCompleteScreen`, `FreeStarterScreen`, `PlanPreviewScreen`) are Wave
E's own bespoke wizard chrome with progress indicators, a deliberately
distinct concept from a pushed-screen back header.
`src/screens/YearOfLiftsScreen.js` renders its own close-X control
(`:745-748`) as a full-bleed recap/story card, also deliberately distinct.
No divergence to fix.

### 1.10 Pro-locked / gated state — NO_CHANGE (correctly kept distinct)

Canonical gating: `src/components/ProGate.js` (5 screens) /
`withProGuard` (9 screens, per-route Pro gate).
`src/components/DifferentialBadge.js` is a single-purpose paywall-trigger
card (`DifferentialBadge.js:4-13`, "surfaced below the weekly coach output
when the differential paywall trigger fires"), used only in
`HomeScreen.js` — a distinct, documented concept (a specific paywall
moment), not a generic "locked" primitive competing with `ProGate`.
`lock-closed-outline` icon usage in `NutritionTargetsScreen.js:824,1061`
(manual-override-locked macro fields) and `PartnerScreen.js:1086,1147,1401`
(share-consent privacy lock) are both inline informational icons for
concepts unrelated to Pro-tier gating — DISTINCT-CONCEPT in both cases, not
a Pro-lock badge.

### 1.11 Warning / attention banner — NO_CHANGE (surface too broad to fully re-sweep; spot-check clean)

Canonical: `Card` with `tone="warning"/"danger"` (`Card.js:11,23,83`) and
`src/components/AttentionCard.js` (used only in `HomeScreen.js` and
`YouScreen.js`, both reference-quality/locked baselines). 35 screens
reference `colors.warning`/`colors.danger`/`colors.error` in some form
(icon tints, text colours, or banner backgrounds); a full one-by-one
divergence audit of all 35 was out of budget for this pass. Spot-checked
`ConsistencyScreen.js:66-82` (deload banner, `Card tone="warning"`) against
`CoachReviewScreen.js`'s equivalent and found consistent `Card
tone="warning"` usage, not a hand-rolled box. **Not claiming full coverage**
— flagged here rather than silently assumed clean; a dedicated warning-
banner sweep is a candidate for a future narrow pass if the founder wants
one, not raised as a fork here since nothing found warrants it yet.

### 1.12 Stat/compact row, chip-selector, section heading — NO_CHANGE (spot-checked, no divergence found)

`src/components/SettingsPrimitives.js` (`SettingRow`, `SectionHeader`) is
the canonical Settings row/heading; every Settings screen checked in §1.9
composes it via `SettingsPage`. `src/components/SectionLabel.js` is used
consistently as the section-heading primitive across the screens read in
this pass. No hand-rolled competing row/heading implementation was found in
any file read for §1.1-1.10.

---

## 2. The deferred Wave D item — deload-signal bucket-building dedup

**Finding (Wave D, confirmed):** `src/hooks/useProgressData.js:266-343`
(`loadDeloadCheck`), `src/screens/HomeScreen.js:1081-1123`, and
`src/screens/CoachReviewScreen.js:356-431` each independently rebuild "last
4 weekly buckets of soreness/joint/rep/volume evidence, plus a weeks-since-
lighter-week scan" before calling the one shared scorer,
`shouldDeload` (`src/lib/algorithms.js:484`)
(`WAVE-D-FINDINGS.md:267-296,588-595`).

### 2.1 What the three implementations actually do (read in full, not summarised)

| Axis | `useProgressData.js:266-343` | `HomeScreen.js:1081-1123` | `CoachReviewScreen.js:356-431` |
|---|---|---|---|
| Week anchor | rolling, `now`-back (`wk=3..0`, `:272-274`) | rolling, `now`-back (`i=0..3`, reversed, `:1087-1089`) | Monday-anchored `weekStart` from `date-fns startOfWeek(now,{weekStartsOn:1})` (`:310,314`), not `dayKey.js`'s `localWeekStartMs` |
| Soreness/joint average | answered-only, null when unrated (`:291-302`) | answered-only, null when unrated (`:1107-1112`) | **coerced to 0** when unrated: `w.soreness24hBefore \|\| 0` (`:386-390,396-400`) |
| avgReps set filter | time-window only (source already completed-only via `getCompletedWorkoutSets`) | explicit `s.setType !== 'warmup'` exclusion (`:1094`) — **useProgressData does not explicitly exclude warmups in this function** | time-window only (`:391-395`), same as useProgressData |
| hasOverMRV | computed via `calculateWeeklyVolume` (`:279-283`) | **hard-coded `false`**, documented gap: "needs the full volume/landmarks pass… recorded as a residual in D92" (`:1103-1105,1118`) | computed via `calculateWeeklyVolume` (`:374,381-384`) |
| weeksSinceLastDeload | derived, 12-week backward scan, "untrained week ends the scan" rule (`:310-334`), patched `weeksSinceLighter + (3-i)` (`:336-339`) | **hard-coded `99`** every bucket, documented as conservative/unknown (`:1115`) | derived, same rule (`:410-424`), patched identically (`:425-428`) — pinned by `CoachReviewScreen.deloadDerivation.guard.test.js:22-29` |

This is **not** the Wave A Class-C authority collision (two engines
disagreeing) — it is one scorer fed by three hand-built inputs, one of
which (CoachReviewScreen's coerced-to-zero averages) has genuinely drifted
from a bug that was already fixed once in the other two, exactly the risk
Wave D's own comment warns about (`useProgressData.js:288-289`, "Campaign 1
P0-7 D6: answered-only averages… unanswered sessions coerced to 0 diluted
genuine soreness/joint evidence and suppressed the deload triggers").

### 2.2 Design — one shared builder

```js
// src/lib/algorithms.js, beside shouldDeload (or a new src/lib/deloadBuckets.js
// if the founder/lead prefers algorithms.js not grow further)

/**
 * Builds the last 4 weekly evidence buckets shouldDeload() reads: average
 * reps, answered-only soreness/joint-discomfort, over-MRV volume, and weeks
 * since the last lighter/recovery week. One derivation for every caller
 * that feeds shouldDeload, so a correction to one rule (e.g. the "untrained
 * week" scan boundary, already corrected once — useProgressData.js:318-327)
 * cannot fix one copy and leave the others to drift, as CoachReviewScreen's
 * averages already have (see the coerced-to-zero note below).
 *
 * @param {Array} sets - completed workout sets
 * @param {Array} workouts - workout rows (isCompleted, startedAt,
 *   soreness24hBefore, jointDiscomfort)
 * @param {object|null} exerciseMap - exerciseId -> exercise, required for
 *   the hasOverMRV pass. Pass null/undefined to skip that pass entirely
 *   (every bucket's hasOverMRV is false) -- the honest answer for a caller
 *   with no landmarks pass available, matching HomeScreen's existing,
 *   documented D92 residual (under-suggests a deload by 12 points, never
 *   over-suggests).
 * @param {object} [opts]
 * @param {number} [opts.now] - anchor instant, default Date.now()
 * @param {number|null} [opts.weekAnchorMs] - if set, buckets are 4
 *   Monday-anchored (or whatever grammar the caller's own anchor encodes)
 *   weeks ending at this timestamp (CoachReviewScreen's grammar). If null
 *   (default), buckets are 4 trailing weeks measured back from `now`
 *   (useProgressData/HomeScreen's rolling grammar).
 * @param {boolean} [opts.excludeWarmups=false] - exclude s.setType ===
 *   'warmup' sets from the avgReps calc (HomeScreen's current behaviour;
 *   useProgressData/CoachReviewScreen do not do this today).
 * @param {boolean} [opts.zeroFillUnrated=false] - coerce unrated
 *   soreness/joint values to 0 instead of excluding them from the average.
 *   Reproduces CoachReviewScreen's CURRENT behaviour only; this is the
 *   already-fixed-elsewhere bug (Campaign 1 P0-7 D6) and defaults to false
 *   (the correct, answered-only behaviour) so no NEW caller can opt into it
 *   by accident.
 * @param {number|null} [opts.weeksSinceLastDeloadOverride] - if a finite
 *   number, every bucket gets this flat value instead of the derived,
 *   per-bucket-back-projected figure (HomeScreen's current `99`).
 * @returns {Array<{avgReps, avgSoreness, avgJointDiscomfort, hasOverMRV,
 *   weeksSinceLastDeload}>} 4 entries, oldest first, ready for
 *   shouldDeload().
 */
export function buildLast4WeekDeloadBuckets(sets, workouts, exerciseMap, opts = {}) { … }
```

### 2.3 Callers

- **`useProgressData.js:266-343`** (`loadDeloadCheck`) — byte-identical.
  ```js
  const buckets = buildLast4WeekDeloadBuckets(sets, workouts, exMap, { now });
  const result = shouldDeload(buckets);
  setDeloadAlert(result.deload ? result : null);
  ```
  Every default matches this caller's current behaviour exactly (rolling
  anchor, full exerciseMap, answered-only, derived weeksSinceLastDeload, no
  warmup exclusion). **Not the locked baseline, but the reference
  implementation** — the shared function's defaults are this file's current
  behaviour verbatim.

- **`HomeScreen.js:1081-1123`** (LOCKED baseline — import + call only):
  ```js
  const buckets = buildLast4WeekDeloadBuckets(
    recentSets, allWorkouts, null,
    { now: Date.now(), excludeWarmups: true, weeksSinceLastDeloadOverride: 99 },
  );
  const result = shouldDeload(buckets);
  setDeloadSuggestion(result.deload ? result : null);
  ```
  `exerciseMap: null` reproduces the hard-coded `hasOverMRV: false`;
  `weeksSinceLastDeloadOverride: 99` reproduces the flat `99`;
  `excludeWarmups: true` reproduces the explicit `setType !== 'warmup'`
  filter HomeScreen applies today that `useProgressData` does not.
  **Verification required before landing** (not asserted here as proven):
  HomeScreen's `recentSets`/`allWorkouts` are sourced differently from
  useProgressData's (`getWorkoutSetsSince` with an 8-week window,
  `HomeScreen.js:746`, vs `getCompletedWorkoutSets`); the workout-completion
  filter is applied explicitly in HomeScreen (`w.isCompleted &&`, `:1091`)
  and implicitly upstream in useProgressData. Run
  `HomeScreen.stateMatrix.test.js` (S8, `:697-710`, mocks `shouldDeload`
  directly so it will not catch a bucket-shape regression on its own) plus a
  new byte-diff test comparing old vs new bucket output on a fixed fixture
  before landing.

- **`CoachReviewScreen.js:356-431` — EXCLUDED pending a founder ruling.**
  The one axis that cannot be reproduced by an option flag without
  deliberately re-encoding a known bug is `zeroFillUnrated`. Setting
  `zeroFillUnrated: true` would make this caller byte-identical to today,
  but that means shipping a shared, reusable function whose only reason to
  default `zeroFillUnrated` to `false` is "so nobody else copies
  CoachReviewScreen's bug" — i.e. the extraction would encode, not fix, the
  drift Wave D flagged. Conversely, defaulting CoachReviewScreen onto the
  answered-only path (dropping `zeroFillUnrated`) is **not** byte-identical:
  it changes the free-tier deload signal's sensitivity (unrated sessions
  currently silently pull the average toward 0, i.e. toward "no signal";
  switching to answered-only would let genuinely rated sessions carry full
  weight, which can only make the signal MORE likely to fire on weeks with
  partial ratings). That is a coaching-safety-adjacent behaviour change
  (deload/recovery signal, Section 2 territory) and must not be decided
  silently in a documentation pass. **Founder fork, non-blocking** (work
  continues elsewhere; record only):
  - Option A — land the shared function for useProgressData + HomeScreen
    now (both byte-identical, no behaviour change); leave
    `CoachReviewScreen.js` on its own inline copy, with a code comment
    cross-referencing this document, until the founder rules on Option B/C.
  - Option B — found the bug real: fix CoachReviewScreen onto answered-only
    when the shared function lands (a deliberate, disclosed behaviour
    change, not a silent one), retiring
    `CoachReviewScreen.deloadDerivation.guard.test.js` and re-pinning it to
    assert `zeroFillUnrated` is never passed from this call site.
  - Option C — keep `zeroFillUnrated: true` as a supported, permanent
    option (accept the two free/Pro deload signals staying deliberately
    different) and document why in the shared function's own comment.
  This fork is **not raised as blocking the rest of this document** — it
  only matters at implementation time, and only for this one caller.

### 2.4 Tests that need retiring/re-pinning at implementation time

- `src/screens/__tests__/CoachReviewScreen.deloadDerivation.guard.test.js`
  — a source-regex guard asserting the literal strings `weeksSinceLighter`
  and `weeksSinceLastDeload: weeksSinceLighter` appear in
  `CoachReviewScreen.js` (`:22-29`). Once the derivation moves into the
  shared function, these strings disappear from this file's source; the
  test must be rewritten to assert the call site passes no
  `weeksSinceLastDeloadOverride` (i.e. still derives, just via the shared
  helper) rather than grepping for the old inline variable names.
- `src/screens/__tests__/HomeScreen.bannerPriorityCap.test.js:148-151` and
  `HomeScreen.stateMatrix.test.js` (S8 block, `:697-710`) — neither greps
  the bucket-building internals (the former pins the surrounding
  banner-wiring plumbing; the latter mocks `shouldDeload` at the module
  level), so both should continue to pass unmodified — call out explicitly
  as "expected to still pass" rather than silently assumed.
- `src/hooks/__tests__/useProgressData.test.js` — no deload-specific test
  exists in this file today (grepped, zero hits); lowest risk of the three.

**Risk (of the design as specified): LOW for useProgressData + HomeScreen
callers** (byte-identical, locked baseline untouched behaviourally,
verification steps specified above); **the CoachReviewScreen fork is
explicitly excluded from this pass's risk, not silently absorbed.**
**Files**: `src/lib/algorithms.js` (new export, beside `shouldDeload` at
`:484`), `src/hooks/useProgressData.js:266-343`, `src/screens/HomeScreen.js:
1081-1123` (LOCKED — import + call change only), `src/screens/
CoachReviewScreen.js` (no change unless/until the founder rules on §2.3's
fork), `src/screens/__tests__/CoachReviewScreen.deloadDerivation.guard.test.js`.

---

## 3. Residue with proof

### 3.1 `buildWeeklySessionCounts` (`src/lib/progressSeries.js:112-130`) — CLEAN, mechanical removal specified

**Confirmed unreferenced in production.** Grepped every screen and
component for `buildWeeklySessionCounts`: zero call sites outside
`progressSeries.js` itself and its test file. The one production screen
this function was built for, `AnalyticsScreen.js`, is explicitly guarded
AGAINST importing it:
`src/screens/__tests__/AnalyticsScreen.campaign23.guard.test.js:65-68` pins
"no rolling-week series builder remains on the landing" — Campaign 23
moved the rolling-week hero to `LiftProgressScreen.js`, which uses
`buildWeeklyLoadSeries` (`LiftProgressScreen.js:29,179`) but never
`buildWeeklySessionCounts` (grepped, zero hits in that file). Confirmed also
independently by Wave G (`WAVE-G-FINDINGS.md:410-414`, "zero imports of
progressSeries in any of the eight in-scope screens").

**DECISION: retire-with-proof, mechanical.**
- Remove `export function buildWeeklySessionCounts(...)` and its JSDoc,
  `src/lib/progressSeries.js:101-130`.
- Retire the whole `describe('buildWeeklySessionCounts', ...)` block,
  `src/lib/__tests__/progressSeries.test.js:144-191`, and drop
  `buildWeeklySessionCounts` from the import list at `:21`.
- No change needed to `AnalyticsScreen.campaign23.guard.test.js:67-68` (it
  asserts absence from that screen's source, unaffected by removing the
  function itself from its own module).
- **Risk: LOW.** Pure lib function, zero production callers, one
  self-contained test file to retire alongside it.
- **Files**: `src/lib/progressSeries.js:101-130`,
  `src/lib/__tests__/progressSeries.test.js:19-26,144-191`.

### 3.2 `useProgressData.js` dead returns — CLEAN, mechanical removal specified

`computePRsPerWeek` (`useProgressData.js:23-64`), `prBars`/`setPrBars`
(`:89`), `prWindow`/`setPrWindow` (`:90`), `loadPRBars`
(`:345-353`, calls `computePRsPerWeek`), `handlePrWindowToggle`
(`:477-481`) are all present in the hook's return object
(`useProgressData.js:519-529`), but:
- `useProgressData()`'s only two production consumers are
  `AnalyticsScreen.js:207-213` and `ConsistencyScreen.js:34-40` (confirmed
  by grep: `useProgressData(` appears at exactly two non-test call sites
  app-wide, both read in full above). Neither destructures `prBars`,
  `prWindow`, or `handlePrWindowToggle`.
- Independently re-confirmed by Wave G
  (`WAVE-G-FINDINGS.md:392-408`, same conclusion, same three names).

**DECISION: retire-with-proof, mechanical**, in this order (later steps
depend on earlier ones being clean):
1. Drop `prBars, prWindow` from the return object (`:521`) and
   `handlePrWindowToggle` (`:528`).
2. Delete `handlePrWindowToggle` (`:477-481`) — its only reads of `prWindow`
   and only call to `loadPRBars` disappear with it.
3. Delete `loadPRBars` (`:345-353`) — its only caller is the `load()`
   effect at `:172-173` (`loadPRBars(sets, exMap, 30, isCurrentRequest)`, to
   also be removed) and it is the only remaining call site of
   `computePRsPerWeek` in production code.
4. Delete the `prBars`/`setPrBars` and `prWindow`/`setPrWindow` `useState`
   declarations (`:89-90`).
5. `computePRsPerWeek` itself (`:23-64`) is **exported** and is directly
   unit-tested (`src/hooks/__tests__/useProgressData.test.js:2,78-138`,
   8 tests). Keep the function and its tests (it is a clean, pure,
   independently-useful calculation with its own test coverage — removing
   it destroys tested behaviour for no reuse benefit) OR, if the founder
   wants the fully dead surface gone too, retire both together; **default
   recommendation: keep `computePRsPerWeek` + its tests, remove only the
   hook-internal plumbing (steps 1-4)** since the function is not itself
   unreferenced-and-untested the way the plumbing is.
- **Risk: LOW.** No production render path changes (nothing currently
  reads these values), confirmed by the two consumers' full destructure
  lists read above.
- **Files**: `src/hooks/useProgressData.js:89-90,172-173,345-353,
  477-481,519-529`. No test file needs retiring if step 5's default is
  taken; if the founder instead wants `computePRsPerWeek` removed too,
  `src/hooks/__tests__/useProgressData.test.js:2,75-138` also retires.

### 3.3 `user_insights` sync registration — RECORD-ONLY (genuinely live plumbing, not dead code)

Traced what touches it, per the brief:

- **Push**: `src/lib/sync.js:767` (`_pushUserInsights(sb, supabaseUserId,
  localUserId)`, defined `:1346-1366`) is called unconditionally inside the
  main `pushToCloud`-family orchestrator, on the LEGACY per-entity path —
  **not** in the new registry (`src/lib/sync/transport.js:86`,
  `MIGRATED_TABLES` — grepped, `user_insights` is absent from that array;
  confirmed against `sync/__tests__/sync.transport.test.js:102-116`, which
  lists `notification_preferences`/`weekly_checkins_v2`/
  `body_composition_log`/`nutrition_targets` as migrated, not this table).
- **Pull**: `src/lib/sync.js:2179` (`_pullUserInsights`, defined
  `:2349-2363`) is likewise called unconditionally inside the main
  `pullFromCloud` orchestrator (`pullFromCloud` defined `:2008`).
- **Wipe-on-sign-out (GDPR)**: `user_insights` is listed in
  `WIPE_DIRECT_TABLES` (`src/lib/database.js:5973-5978`), the table set a
  device wipes "when the user signs out / a different user signs in on the
  same device" (`:5959-5961`) — required so a shared device does not leak
  the prior user's insight rows.
- **The write path IS orphaned, though the plumbing is not**: the only
  production function that generates NEW rows,
  `runInsightsEngine` (`src/lib/database.js:5867-5890`, which calls
  `generateInsights` from `src/lib/insightsEngine.js`), has **zero
  production call sites** (grepped `src` excluding `__tests__`:
  `runInsightsEngine`/`getActiveInsights`/`insights\.` only appear inside
  `database.js` and `insightsEngine.js` themselves). This matches
  `AnalyticsScreen.campaign23.guard.test.js:27-32`, which pins that the "For
  You" feed (the only UI that ever rendered these rows) is fully retired —
  "no insightsEngine import, no runInsightsEngine/dismissInsight call".

**Why RECORD-ONLY, not retire-with-proof**: the brief's constraint is
"schema/migrations must NOT change; the TABLE stays." Removing the push/pull
registration (unlike §3.1/§3.2) is not a no-op — it would (a) stop syncing
any pre-Campaign-23 legacy rows that already exist in users' accounts across
devices, and (b) require pulling `user_insights` out of
`WIPE_DIRECT_TABLES`, which is a GDPR data-hygiene control, not incidental
plumbing — a wipe that silently stops covering a table with real historical
user data (insight `copy` fields can contain user-relevant training
commentary) is a data-handling regression, not a cleanup. This is "dead
feature, live pipe": the generation path is orphaned (Campaign 23 already
retired its only consumer) but the sync/wipe path is demonstrably executing
on every push/pull/sign-out today and protects real data. Per the residue
policy this is recorded, not mechanically removed.
- **Risk if ever revisited**: MEDIUM (touches sync orchestration + the GDPR
  wipe list together; needs its own dedicated change, not a drive-by).
- **Files** (for the record, not for action here): `src/lib/sync.js:
  767,1346-1366,2179,2349-2363`; `src/lib/database.js:5867-5890 (orphaned
  writer), 5973-5978 (WIPE_DIRECT_TABLES, keep as-is)`.

---

## 4. Cross-tab consistency notes

Read only the style/format findings sections of all seven wave files, per
the brief.

### 4.1 Repeated inconsistency class the waves fixed locally: hard-coded `'kg'` ignoring the units store

Wave A and Wave D each independently found and fixed several hard-coded
`'kg'` literals (in-file comments trace the fixes: `BlockReflectionScreen.js
:66,265,347` cite `WAVE-A-FINDINGS.md` `UNIT_DEFECT`; `ProgressPhotosScreen.js
:166,1268` and `WorkoutSummaryScreen.js:1234-1238` and `YearOfLiftsScreen.js
:73-76` cite `WAVE-D-FINDINGS.md` `UNIT_DEFECT`). The now-standard fixed
pattern is `units === 'lbs' ? 'lbs' : 'kg'` (a real store read with 'kg' as
the correct default, not a bypass) — confirmed as the dominant pattern
across `AnalyticsScreen.js:169,227,496`, `LiftProgressScreen.js:231,608`,
`YearOfLiftsScreen.js:76,227,320,406`, `WorkoutSummaryScreen.js:947,1238`,
`ShareCardScreen.js:241,251`, `WorkoutHistoryScreen.js:71,75,101,360`.

**REMAINING unfixed instance found, not previously flagged by any wave:**
- **`src/screens/RoutineDetailScreen.js:986`** —
  `<TextField label="Start weight" … placeholder="kg" …>` — a genuinely
  hard-coded placeholder, not derived from any units read. Confirmed
  `RoutineDetailScreen.js` never reads `units`/`bodyWeightUnits` anywhere
  in the file (grepped, zero hits) — this file has never been wired to the
  units store at all, unlike every other screen above. A user on the lbs
  setting sees a "kg" placeholder on this one input. Not caught by Wave A
  (`RoutineDetailScreen.js` is in Wave A's scope, `WAVE-A-FINDINGS.md:10`;
  grepped that file for "Start weight"/`986`: no hit).
  **DECISION: CONSOLIDATE (small, isolated fix)** — read `units` (or
  `bodyWeightUnits`) from the store the way every screen in the "fixed"
  list above does, and set `placeholder={units === 'lbs' ? 'lbs' : 'kg'}`.
  **Risk: LOW** (one placeholder string, no logic change, Wave A's own
  precedent pattern). **File**: `src/screens/RoutineDetailScreen.js:986`
  (+ a units read near the top of the component, matching the store-read
  idiom used elsewhere, e.g. `WorkoutHistoryScreen.js:101`).

**Checked and NOT flagged (false leads, recorded so they are not re-checked
next pass):**
- `src/screens/ExerciseDetailScreen.js:209` —
  `detectPR(s, history, exercise, 'kg')` hard-codes the `units` param that
  `algorithms.detectPR` bakes into its returned `label` strings
  (`algorithms.js:385,400,414`), but this call site only ever reads
  `prs.length` (`ExerciseDetailScreen.js:212`) to set a boolean —
  the mislabelled string is never rendered. NO_CHANGE (inert parameter, no
  user-visible effect).
- `FirstRunScreen.js:34` and `ProOnboardingScreen.js:365`
  (`const localUnits = 'kg';`) are pre-onboarding defaults before the units
  picker is set — correct, not a units-store bypass.

### 4.2 Rolling-vs-Monday week boundary: no NEW unfixed instances beyond the already-recorded item

Campaign 23 already unified `AnalyticsScreen.js`'s week grammar
(`progressSeries.js:40-49`'s `weekBoundary: 'rolling'|'monday'` option, and
`AnalyticsScreen.campaign23.guard.test.js:65-73` pins the volume strip as
the landing's one surviving "this week" construct). Grepped every screen for
a raw 7-day-window literal (`7 * 24 * 60 * 60 * 1000` or equivalent) outside
`dayKey.js`/`progressSeries.js`: 7 files (`CascadeGateScreen.js`,
`CoachReviewScreen.js`, `HomeScreen.js`, `MesocycleBuilderScreen.js`,
`PlansScreen.js`, `VolumeHeatmapScreen.js`, `WorkoutSummaryScreen.js`). Read
each hit:
- `CoachReviewScreen.js:365-366,410` and `HomeScreen.js:1085` are the
  **same** deload-bucket duplication already fully covered in §2 — not a
  second, separate instance.
- `CascadeGateScreen.js:56,197` correctly steps `WEEK_MS` off
  `localWeekStartMs(startMs)` (`:46,197`) — already Monday-anchored.
- `MesocycleBuilderScreen.js:32`, `PlansScreen.js:573`,
  `VolumeHeatmapScreen.js:145` — all a week-LENGTH constant used for
  duration maths (a training week's length, a 7-day snooze timer, a
  user-selected N-week lookback window), not a "what does 'this week' mean"
  boundary. DISTINCT-CONCEPT from the rolling-vs-Monday inconsistency class
  — a week is 7 days regardless of anchor day, and none of these three
  render a "this week" figure that could disagree with a sibling surface.
- `WorkoutSummaryScreen.js:614-615,818-819` — already correctly
  `localWeekStartMs`-anchored (`:615`, "the locked-rule, local Monday-
  anchored helper" per its own comment at `:818`).

**DECISION: RECORD-ONLY.** No new remaining instance of the rolling-vs-
Monday class exists outside the item §2 already specifies a fix for.

---

## 5. Risk-ordered implementable set

1. **LOW** — §3.1 `buildWeeklySessionCounts` removal (dead code, one file +
   one test file).
2. **LOW** — §3.2 `useProgressData.js` dead-returns removal (dead plumbing,
   no test retirement needed under the default recommendation).
3. **LOW** — §4.1 `RoutineDetailScreen.js:986` kg-placeholder fix (one
   line + one store read).
4. **LOW** — §1.4 `LiftProgressScreen.js` loading-skeleton fix (presentation
   only, matches sibling screen's existing pattern).
5. **LOW (2 of 3 callers), FORK-GATED (1 of 3)** — §2 deload-bucket dedup:
   land for `useProgressData.js` + `HomeScreen.js` (byte-identical,
   verification steps specified); leave `CoachReviewScreen.js` untouched
   pending the founder's choice among §2.3's Options A/B/C.
6. **RECORD-ONLY, no action** — §3.3 `user_insights` sync registration
   (genuinely live GDPR/sync plumbing; touching it needs its own dedicated
   change, not this pass).

No item above is itself a blocking founder fork for THIS document — §2.3's
fork only matters at the point someone implements the dedup and decides
CoachReviewScreen's fate; everything else is directly actionable as
specified.
