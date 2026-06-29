# D3 — Design / Look-and-Feel Consistency Audit

**Date:** 2026-06-29
**Scope:** Static analysis of `src/` against our own design system (`src/styles/theme.js`,
`docs/rules/styling.md`, shared primitives in `src/components/*`). No code modified.
**Goal:** be more polished and coherent than Hevy — i.e. every screen must read as the same product.

## Method & caveat

The design tokens live in `src/styles/theme.js` (not `src/theme.js` as the brief stated;
the file was located by glob). **`docs/rules/styling.md` is partly stale**: its hex table
(`#1A1A1A`, `#F59E0B`, radius 12, etc.) no longer matches the live tokens in `theme.js`
(`surface #191917`, `primary #F5A623`, `radius.lg = 14`, etc.). The audit treats
**`theme.js` as the source of truth** and flags the doc drift itself as a finding (G7).
Counts below come from ripgrep over `src/**/*.js` (excluding `__tests__`).

The good news first: **iconography is fully consistent** — all 60 icon-using screens import
`Ionicons` from `@expo/vector-icons`, no mixed icon sets. Raw hex in screens is also largely
under control (see G6). The real inconsistency is **primitive adoption**: the app has
excellent shared primitives (`Card`, `Button`, `ScreenHeader`/`BackHeader`, `EmptyState`)
that most screens simply do not use, so each screen re-implements the same surfaces slightly
differently.

---

## Findings, ranked by visual impact

### G1 — Shared `<Card>` primitive is almost never used; ~187 hand-rolled card boxes (HIGHEST impact)

`src/components/Card.js` is the single card surface (token `surface` bg, `radius.lg`,
1px `border`, token padding). Its own header says it "replaces the ~83 inline
`backgroundColor: colors.surface` card blocks the component audit found" — but that
migration never happened at the screen layer.

- Only **13 of 79 screens** import `Card` (`rg "components/Card'" src/screens` → 13 files).
- Meanwhile **187 inline `backgroundColor: colors.surface` card blocks across 52 screens**
  (`rg "backgroundColor:\s*colors\.surface" src/screens` → 187).
- Worst offenders: `NutritionTargetsScreen.js` (14), `WorkoutSummaryScreen.js` (13),
  `PlansScreen.js` (12), `ExerciseDetailScreen.js` (9), `HomeScreen.js` (9),
  `ActiveWorkoutScreen.js` (8), `BodyMetricsScreen.js` (8), `VolumeHeatmapScreen.js` (7),
  `ProOnboardingScreen.js` (7).

**Visual symptom:** card radius, border colour/width and padding drift card-to-card because
each is hand-built. Example divergent radii on card-like boxes:
`RoutineDetailScreen.js:624 borderRadius: 16`, `HomeScreen.js:2483 borderRadius: 24`,
`WorkoutHistoryScreen.js:760 borderRadius: 15` — none equal to the `Card` standard
`radius.lg` (14).

**Fix direction:** migrate hand-rolled `colors.surface` boxes to `<Card>` /
`<Card elevated>` screen by screen, starting with the high-count nutrition/workout screens.
This is the single biggest coherence win and collapses G2/G3 with it.

---

### G2 — Shared `<Button>` primitive bypassed; ~1001 raw touchables across 62 screens (HIGH impact)

`src/components/Button.js` is the single CTA (4 variants, one press model, one disabled/loading
treatment, `radius.lg`). Adoption is thin and the rest are hand-rolled.

- Only **19 of 79 screens** import `Button` (`rg "components/Button" src/screens` → 19).
- **1001 raw `TouchableOpacity`/`Pressable`/`TouchableWithoutFeedback` across 62 screens.**
  Heaviest: `HomeScreen.js` (72), `DiaryScreen.js` (59), `PlansScreen.js` (46),
  `WeeklyCheckInScreen.js` (43), `CoachOutputScreen.js` (37), `ProOnboardingScreen.js` (35),
  `PlanLibraryScreen.js` (33), `NutritionTargetsScreen.js` (31).

**Visual symptom:** inconsistent button heights, radii, fills and pressed-state feedback
(the `Button`/`PressableCard` spring is lost on hand-rolled CTAs). Many of these touchables are
rows/icons rather than CTAs, but every hand-rolled *primary action* is a coherence and
press-feel regression vs the primitive.

**Fix direction:** route all primary/secondary/destructive CTAs through `<Button>`; reserve
raw touchables for genuine list rows/icon hits and standardise those on `PressableCard`.

---

### G3 — Touch targets below 44–48px, patched ad-hoc with hitSlop (HIGH impact — gym-glove usability)

`styling.md` mandates 48×48 minimum; `theme.js` ships `hitSlop = {12,12,12,12}` as the
escape hatch. The reliance on hitSlop reveals how many controls are physically undersized.

- **136 `hitSlop` uses across 35 screens** — i.e. controls drawn smaller than the minimum and
  expanded only by an invisible slop region (inconsistent, and slop regions overlap/conflict in
  dense rows). Heaviest: `ActiveWorkoutScreen.js` (13), `DiaryScreen.js` (11), `HomeScreen.js` (11),
  `PlansScreen.js` (9).
- Tiny tappable dots/handles confirm sub-44px hits, e.g. `ActiveWorkoutScreen.js:2511`
  `navTabBadge width:16,height:16`, `MealPlanScreen.js:782` `dayDot width:5,height:5`,
  `PlanLibraryScreen.js:806` `8×8` dot.
- Only **36 explicit `minHeight/height: 44|48|52`** across 19 screens — so most controls don't
  declare a minimum touch height at all.

**Fix direction:** standardise interactive sizing through `Button`/`PressableCard` (which can own
a min 48dp height) instead of per-call hitSlop; audit ActiveWorkout / Diary rows on-device.

---

### G4 — Empty states are hand-rolled everywhere; `<EmptyState>` used in 1 screen (MEDIUM-HIGH impact)

`src/components/EmptyState.js` exists, but `rg "EmptyState" src/screens` finds it imported in
**only 1 screen** (`CardioHistoryScreen.js`). Every other "no data yet" surface
(history, plans, food search, recipes, meals, insights) is a bespoke icon+text block, so empty
states vary in icon size, spacing and copy weight across the app.

**Fix direction:** adopt `<EmptyState>` for all zero-data surfaces; it is the most visible
inconsistency to a new user exploring the app before they have data.

---

### G5 — Section-header / screen-header pattern is inconsistent (MEDIUM impact)

Two shared headers exist (`ScreenHeader`, `BackHeader`), imported by **19 screens**
(`rg "components/(ScreenHeader|BackHeader)" src/screens`). The other ~60 screens render their
own header rows, and section-label styling is applied by hand:

- **25 inline `textTransform: 'uppercase'` / `letterSpacing` section labels across 17 screens**
  instead of a single `type.label`/section-header preset — so the uppercase label treatment
  (size, tracking, colour) drifts.
- `theme.js` provides `type.h2/h3/title/label` presets, yet **66 raw `fontSize: <number>`
  literals across 33 screens** bypass them (`ShareCardScreen` 6 — canvas, acceptable;
  `ProOnboardingScreen` 6, `HomeScreen` 6 — not).

**Fix direction:** introduce/standardise one `SectionHeader` treatment and route titles through
`type.*` presets; keep canvas/share-card font literals out of scope.

---

### G6 — Ad-hoc spacing and radius literals off the scale (MEDIUM impact)

`theme.js` exposes `spacing` (4dp scale) and `radius` (xs..xl + `full` + `circle()` helper),
but raw numbers leak in:

- **66 raw `padding*/margin*: <number>` across 33 screens** not drawn from the `spacing` scale
  (e.g. odd values `paddingHorizontal: 7`, `marginTop: 3`, `paddingVertical: 3` in
  `ProSetupCompleteScreen`/`ProOnboardingScreen`/`MealPlanScreen`).
- **22 off-scale `borderRadius` literals (15/16/18/20/24/28/32/36/40/48/64) across 16 screens.**
  Many of the larger values are legitimate circles (`width:56,height:56,borderRadius:28`) that
  should use the `circle()` helper; others are genuine drift (`borderRadius: 15`, `16`, `24` on
  cards/sheets — see G1).

**Fix direction:** replace literals with `spacing.*` / `radius.*`; convert `width/2` circle radii
to `circle(size)`. Low-risk, mechanical, high tidiness payoff.

---

### G7 — `styling.md` has drifted from `theme.js` (MEDIUM impact — it misleads future work)

The styling rulebook still lists the old palette (`surface #1A1A1A`, `accent #F59E0B`,
card radius 12, button height 52, input 48) while `theme.js` has moved on
(`surface #191917`, `primary #F5A623`, `radius.lg 14`, token-driven button sizes, light theme +
a11y palettes). A contributor following the doc will hardcode wrong hex and wrong radii — a
*source* of future inconsistency.

**Fix direction:** rewrite `styling.md` to reference token *names* (`colors.surface`,
`radius.lg`, `type.title`) rather than frozen hex/px, and point to `theme.js` as canonical.

---

### G8 — Contained but present: raw hex + bespoke physical-colour tables (LOW impact)

Raw `#...` literals total 151 across 12 files, but the bulk is legitimate:
`theme.js` (84 — the token definitions), share-card canvas rendering
(`lib/shareCard/drawShareCard.js` 6, `ShareCardScreen.js` 10 — off-screen canvas, not themed UI),
and tests. Genuine UI strays:

- `components/PlateCalculator.js:36-50` — **13 hardcoded plate colours** (`#1565C0`, `#F9A825`,
  `#E53935`, `#FFFFFF`, etc.). These encode real-world IPF plate colours, so partly justified, but
  they bypass the theme and won't adapt to light mode.
- `components/PRCelebration.js:28` — confetti palette mixes tokens with raw `'#FF6B35'`, `'#9C27B0'`.
- `screens/ScanLabelScreen.js:403` — `backgroundColor: '#000'` (pure black, which `styling.md`
  explicitly forbids).

**Fix direction:** leave canvas/plate colours but move them into named theme constants
(`colors.plate*`) so the "no inline hex" rule stays absolute; replace `'#000'` with a token.

---

## Summary table

| ID | Problem | Count / evidence | Impact |
|----|---------|------------------|--------|
| G1 | `<Card>` unused; hand-rolled card boxes | 13/79 import Card vs 187 inline `colors.surface` in 52 screens | Highest |
| G2 | `<Button>` bypassed | 19/79 import Button vs 1001 raw touchables in 62 screens | High |
| G3 | Sub-44px touch targets, hitSlop patched | 136 hitSlop in 35 screens; only 36 min-height decls | High |
| G4 | Hand-rolled empty states | `<EmptyState>` in 1 screen only | Med-High |
| G5 | Inconsistent header/section pattern | 19 use shared header; 25 inline uppercase labels; 66 raw fontSize | Medium |
| G6 | Off-scale spacing/radius literals | 66 raw padding/margin; 22 off-scale borderRadius | Medium |
| G7 | `styling.md` drifted from `theme.js` | palette/radius/hex mismatch | Medium |
| G8 | Stray raw hex / bespoke colour tables | 151 hex total (mostly legit); PlateCalculator 13, `'#000'` in ScanLabel | Low |

**Consistent already:** iconography (Ionicons everywhere), token *system* quality
(theme.js is excellent), raw-hex containment in screens (only 2 screens, both canvas-related).
The work is adoption, not redesign.
