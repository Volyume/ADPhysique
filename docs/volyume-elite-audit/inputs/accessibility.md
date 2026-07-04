# S2 — Accessibility Audit (Volyume Elite Audit)

Date: 2026-07-04. Scope: react-native-a11y ESLint inventory, screen-reader
trace of five core journeys (log a set, log a food, view progress, Partners,
add a progress photo), font scaling, contrast (from `theme.js` tokens),
touch targets, and reduce-motion handling. Read-only; this file is the only
artefact created. Prior art consulted: `docs/appstore-readiness-2026-06-06/
appstore-07-accessibility-audit.md` (2026-06-06 static pass, FINDING-M2/M3/
L7/L8/L9), `docs/hevy-teardown-2026-06-29/16-design-animations-a11y.md`
(2026-06-29 competitive read), `docs/rules/styling.md`.

## Executive summary

No P0 blockers. Two P1s: (1) `ProGate.js`, the single component gating
every Pro surface app-wide, has zero accessibility labelling on its lock
overlay and upgrade sheet — one fix, app-wide reach; (2) a food-diary modal
(`DiaryScreen.js` "move to meal slot") traps its option list under an
accessible backdrop node, likely making the options unreachable for
TalkBack/VoiceOver, unlike its two sibling modals in the same file which do
this correctly. Four P2s cover an unlabelled routine-editor form, the 66
outstanding ESLint a11y warnings (triaged by file), a single-select-chip
role inconsistency vs the documented convention, and an unverified
large-text truncation risk. One P3 asks for a full touch-target sweep
(spot-checks found no violations). Several things are already strong and
should not regress: broad, high-quality labelling on the log-a-set flow,
a tested WCAG contrast system with a CVD palette, and disciplined
app-level reduce-motion gating across the component library, including a
fix (since the Hevy teardown) that makes `PRCelebration` auto-degrade under
reduce-motion.

Severity counts: **P0: 0 · P1: 2 · P2: 4 · P3: 1** (7 findings total).

Scope cuts (20-minute budget): did not device-walk with TalkBack/VoiceOver
(all findings are static/source-level); did not triage all 66 ESLint
warnings individually (grouped by file/pattern); did not exhaustively sweep
all 149 screen+component files for touch targets (spot-checked the five
traced journeys plus `ProGate`/`ExercisePickerModal`).

---

## What is already good

- **Log-a-set flow is exceptionally well labelled.** `ActiveWorkoutScreen.js`
  (the Train → log-a-set flow) carries `accessibilityRole` +
  `accessibilityLabel` + `accessibilityState` on essentially every
  interactive element traced (exercise tabs, set-type radiogroup, warm-up
  ramp rows, plate calculator, superset controls, discard/finish modals) —
  a strong reference implementation other screens should match.
- **Tested contrast system.** `src/styles/theme.js` documents a WCAG ratio
  next to every text/border token and asserts them in
  `src/styles/__tests__/theme.test.js` (e.g. `textPrimary` 19.44:1 AAA,
  `textSecondary` 7.25:1, `border` 3.81:1). The prior appstore audit's
  FINDING-L8 (muted text ~3.4:1, below AA) has since been fixed —
  `textMuted` is now `#9B9B9B` (6.99:1 on background, ≥4.89:1 on every
  surface). No sub-AA pair found in the tokens reviewed. Plus a
  colour-blind-safe (Okabe-Ito) palette and a higher-contrast table, both
  theme-keyed for dark/light (theme.js:151-176).
- **Reduce-motion is honoured app-level, not just OS-level**, via
  `accessibility.reduceMotion` in the store, wired through
  `AnimatedEntrance`, `Skeleton`, `BottomSheet`, `PeekMenu`,
  `PressableCard`, `Toast`, `FeedbackSheet`, `MacroRings`, and both
  `PRCelebration`/`MilestoneBurst`. Note: the Hevy-teardown doc (2026-06-29)
  flagged `PRCelebration` as not auto-degrading under reduce-motion — that
  appears **fixed since**: `PRCelebration.js:120`
  (`subduedMode = subdued || !!reduceMotion || isFirstLift`).
- **`BottomSheet.js`** correctly sets `accessibilityViewIsModal` on its
  content (:113) and gives its own close button a role/label — the pattern
  every ad-hoc `Modal` should follow.
- **No `allowFontScaling={false}` found anywhere in `src/`** — text is not
  artificially pinned against the system/in-app larger-text setting.
- **Chart container labelling has already improved** since the 2026-06-06
  audit's FINDING-M2: `VolyumeChart` (:181, :218), `MacroRings` (:254-255),
  and `BodyDiagramHeatmap` (:120-121, muscle-by-muscle) all carry spoken
  summaries/labels now.

---

## Findings

### F1 — ProGate (the app-wide Pro paywall component) has no accessibility labelling
- **Area:** Screen-reader / interactive labelling
- **Severity:** P1
- **Evidence:** `src/components/ProGate.js:90` (`lockOverlay` `TouchableOpacity`
  — no `accessibilityRole`/`Label`), `:104` (backdrop `Pressable` — no
  label), `:121` (`Upgrade to Pro` button — no role/label), `:126`
  (`Maybe later` — no role/label). `ProGate`/`withProGuard` is the single
  shared gate wrapping every Pro-only surface (per CLAUDE.md: "everything
  nutrition/coaching — food diary, barcode, meal suggestions, targets,
  macros, cardio, check-ins, Precision Coaching, division plans,
  wearables").
- **User impact:** A free-tier screen-reader user landing on any gated
  screen hits a silently-dimmed content area and an unlabelled touch
  target; TalkBack/VoiceOver announce nothing (or, worst case, read the
  dimmed `children` underneath as if interactive). The upgrade sheet's own
  CTA ("Upgrade to Pro") and dismiss ("Maybe later") are also unlabelled.
- **Business impact:** This is the primary conversion surface for
  free→Pro upgrade: a screen-reader user cannot discover or act on it
  without first accidentally triggering it via VoiceOver's touch-explore,
  then hearing nothing informative. Silent paywalls Depress trial starts
  for an accessibility-dependent user segment.
- **Complexity:** S — one file, one shared component, fixes every
  Pro-gated surface app-wide at once.
- **Options:**
  1. Add `accessibilityRole="button"` + `accessibilityLabel={`Pro feature: ${feature}. Tap to upgrade`}` to the lock overlay, roles/labels to the sheet's two buttons, and `accessibilityLabel="Close"` to the backdrop `Pressable` (mirrors the correct pattern already used inside the same file at :108, `accessible={false}` on the sheet).
  2. Same as (1) plus `accessibilityViewIsModal` on the sheet `Pressable`, matching `BottomSheet.js`'s convention for consistency across all app modals.
  3. Do nothing now, track as a fast-follow — not recommended given the single-fix/app-wide-reach ratio.

### F2 — DiaryScreen "move to meal slot" modal likely unreachable for screen readers
- **Area:** Screen-reader / focus & content isolation in modals
- **Severity:** P1
- **Evidence:** `src/screens/DiaryScreen.js:1337-1352` — outer
  `<Pressable style={styles.moveBackdrop} accessibilityLabel="Close">`
  wraps a plain `<View style={styles.moveCard}>` containing the
  `mealSlots.map(...)` option buttons, with **no `accessible={false}`**
  break-out. Contrast with the two sibling modals in the same file,
  `saveMealItems` (:1361-1362) and `copyDays` (:1397-1398), which
  correctly nest an inner `<Pressable ... accessible={false}>` so their
  content isn't swallowed by the backdrop's own accessible label.
- **User impact:** When a labelled/accessible parent (the backdrop) wraps
  non-isolated children, RN's accessibility tree can collapse the subtree
  into the parent's single node on Android/iOS, meaning TalkBack/VoiceOver
  users may hear only "Close, button" and be unable to reach "Move to
  Breakfast/Lunch/Dinner/Snacks" individually, or tapping through
  touch-explore may fire the backdrop's dismiss instead of the intended
  option.
- **Business impact:** Breaks a core food-diary organisation action
  (moving a logged item to a different meal) for screen-reader users on a
  Pro-tier flow with no fallback path in the UI.
- **Complexity:** S — apply the same fix already present two modals below
  in the same file.
- **Options:**
  1. Wrap `moveCard`'s content in an inner `<Pressable onPress={() => {}} accessible={false}>` exactly as `saveMealItems`/`copyDays` already do.
  2. Same as (1), and add this pattern to a lint/regression test (source-grep for `moveBackdrop`-style overlays missing the isolation wrapper) so it can't regress, consistent with this repo's "source-level regression guards" convention.
  3. Leave as-is and verify on-device first — not recommended; the sibling-modal contrast in the same file is strong enough evidence to fix now.

### F3 — Routine/exercise editor TextInputs have no accessible label
- **Area:** Screen-reader / form labelling
- **Severity:** P2
- **Evidence:** `src/screens/RoutineDetailScreen.js` "Edit exercise" modal:
  `Sets` (:514), `Reps min` (:525), `Reps max` (:536), `Rest (s)` (:549),
  `Start weight` (:561) — each has an adjacent `<Text>` label but the
  `TextInput` itself carries no `accessibilityLabel`/`accessibilityLabelledBy`.
  RN does not auto-associate a sibling `Text` with a `TextInput` for
  assistive tech. Same pattern, lower harm (optional free-text), at
  `WorkoutSummaryScreen.js:1147` (session notes) and `:1159` (next-time
  note).
- **User impact:** A screen-reader user editing a plan's exercise
  parameters — a Free-tier, all-user core builder flow, not Pro-gated —
  hears a bare "text field" with no context per input, on a form with five
  adjacent numeric fields; easy to fill in the wrong one.
- **Business impact:** Core workout-builder editing (Free tier, used by
  every user) is materially harder for screen-reader users; risk of
  mis-entered training parameters.
- **Complexity:** S — five `accessibilityLabel` props in one file
  (`"Sets"`, `"Reps min"`, `"Reps max"`, `"Rest in seconds"`, `"Start weight in {units}"`), same fix pattern already used correctly elsewhere (e.g. `ActiveWorkoutScreen.js:2852`, `:2865` label target/bar weight inputs by unit).
- **Options:**
  1. Add `accessibilityLabel` to each of the five inputs (and the two `WorkoutSummaryScreen` note fields for completeness).
  2. As (1) plus a lightweight lint rule/test asserting every `TextInput` in the codebase has `accessibilityLabel` (stricter than the current ESLint rule, which is satisfied by role+label OR hint+label on any component, not TextInput-specific).
  3. Fix only the five Sets/Reps/Rest/Weight inputs now (numeric, most error-prone) and leave the free-text notes fields as a fast-follow given their lower harm.

### F4 — 66 outstanding `react-native-a11y` ESLint warnings across 27 files
- **Area:** Interactive labelling (breadth)
- **Severity:** P2
- **Evidence:** `npx eslint . 2>&1 | grep -c a11y` → 66 (of 70 total
  ESLint problems; the other 4 are unrelated `no-unused-vars`). Full file
  list with line numbers captured this session (not reproduced in full
  here for length; available on request). Heaviest concentrations:
  `ProOnboardingScreen.js` (11 — onboarding selection screens, which
  CLAUDE.md flags as enforcement-critical: "biological sex... blocks
  progression"), `ExercisePickerModal.js` (7, includes unlabelled
  icon-only close/back buttons at `:121-133`, `:190-196` despite correct
  44pt-class `hitSlop`), `ProGate.js` (6, = F1), `RoutineDetailScreen.js`
  (7, = F3), plus single/double instances across
  `PlansScreen`/`PlanLibraryScreen`/`MyMealsScreen`/`MyRecipesScreen`/
  `NutritionTargetsScreen`/`WelcomeScreen`/`ScanBarcodeScreen`/
  `ScanLabelScreen`/`ShareCardScreen`/`WorkoutSummaryScreen` and components
  `AppAlert`/`EngineLog`/`FeedbackSheet`/`PRCelebration`/`PeekMenu`/
  `StreakWeeksSection`/`TierComparisonStrip`/`Toast`/`TodayStrip`.
- **User impact:** Mixed — some are icon-only interactive controls with no
  spoken affordance at all (real harm, e.g. `ExercisePickerModal`'s
  back/close icons); others are likely decorative wrapper `View`s the
  linter can't distinguish from interactive ones (lower harm). Not
  triaged element-by-element within the time budget.
- **Business impact:** `ProOnboardingScreen`'s 11 warnings sit on the
  onboarding flow every new user must complete — worth prioritising given
  the sex-gate enforcement rule already regression-guarded there.
- **Complexity:** M — bulk-fixable in a pass, but needs a human/agent
  read of each site to pick role vs decorative-hide rather than a blanket
  autofix (ESLint reports 0 auto-fixable of the 66).
- **Options:**
  1. Dispatch a follow-up sonnet-tier pass to fix all 66 by file, prioritising `ProOnboardingScreen` and `ExercisePickerModal` first (real interactive gaps), then the rest.
  2. Fix only the confirmed-interactive subset now (icon-only buttons, form inputs — roughly half the count by spot-check) and file the remainder as a tracked backlog item.
  3. Leave as a lint-suppressed backlog and revisit post-launch — not recommended given "no silent parking" workflow rule.

### F5 — Single-select chip role inconsistent with the documented convention
- **Area:** Screen-reader / semantic roles
- **Severity:** P2
- **Evidence:** `src/components/Chip.js:24` defaults
  `accessibilityRole = 'button'`; `docs/rules/styling.md` states
  "single-select chips are `radio`". Only 20 call sites in `src/`
  explicitly pass `accessibilityRole="radio"` to `Chip`. Spot-checked
  single-select groups that do **not** opt in: `ExercisePickerModal.js`
  muscle-group and equipment filter chips (:147-165, "pick one" per the
  toggle-to-empty-string logic at :152/:163). Separately,
  `ProgressPhotosScreen.js`'s pose filter (:428-437) is hand-rolled with
  `TouchableOpacity` + `accessibilityRole="button"` + `accessibilityState={{selected}}` rather than using `Chip` at all.
- **User impact:** TalkBack/VoiceOver announce "button, selected" instead
  of the "1 of N" radio-group semantic, which is a real but moderate
  degradation (state is still announced; the grouping context is not).
- **Business impact:** Low directly; a consistency/quality gap that will
  keep recurring as new chip groups are added unless closed once.
- **Complexity:** S/M — grep all `<Chip` usages inside a single-select
  context (toggle-to-`''`/exclusive-select pattern) and add
  `accessibilityRole="radio"`, or migrate `ProgressPhotosScreen`'s
  hand-rolled filter row onto `Chip`.
- **Options:**
  1. Grep-and-fix all single-select `Chip` call sites to pass `accessibilityRole="radio"` explicitly; leave true multi-select/toggle usages on the `button` default.
  2. Flip `Chip`'s default to `radio` and require multi-select callers to opt out to `button` explicitly — inverts the burden, may be safer since single-select is the more common pattern per the component's own doc comment ("A single selectable pill with one selected treatment").
  3. Leave as-is; document as a known minor inconsistency — not recommended, cheap to fix and it is an explicitly written convention in `docs/rules/styling.md`.

### F6 — Large-text truncation risk not verified on-device
- **Area:** Font scaling / Dynamic Type
- **Severity:** P2
- **Evidence:** No `allowFontScaling={false}` anywhere in `src/` (good),
  but 38 instances of `numberOfLines` in `src/screens/*.js` alone
  (component files not counted), several paired with fixed-width/height
  pill or badge containers (e.g. chip labels, stat tiles). Not
  individually verified against the largest system/in-app text-size
  setting within the 20-minute budget.
- **User impact:** Unknown magnitude — could range from harmless (labels
  short enough to never wrap) to real content loss (truncated numbers/
  labels) at the largest accessibility text sizes, which the prior
  appstore audit (FINDING-M3) already flagged as an open decision
  ("confirm layouts tolerate the largest setting").
- **Business impact:** Same as FINDING-M3, carried forward: unresolved
  since 2026-06-06.
- **Complexity:** M — requires an actual device pass (founder walks the
  five traced journeys — Diary, Train summary, Progress, Partners,
  Progress Photos — with the system text size at maximum) since static
  analysis can't confirm real wrapping/clipping.
- **Options:**
  1. Add to the founder's device-test checklist for the next EAS build: set system text size to max, walk the five journeys, screenshot any clipped numbers/labels.
  2. Grep for `numberOfLines={1}` sites specifically inside fixed-height containers (`height:`/`minHeight:` in the same `StyleSheet` block) and pre-emptively widen/allow-wrap the highest-risk ones (data tiles, chip labels) before the device pass.
  3. Close FINDING-M3 as accepted risk if the device pass comes back clean — deferred to the founder, not decided here.

### F7 — Touch-target coverage not exhaustively swept
- **Area:** Touch targets
- **Severity:** P3
- **Evidence:** 60 of 149 `src/screens/*.js` + `src/components/*.js`
  files use `hitSlop`. Spot-checks of the five traced journeys plus
  `ProGate`/`ExercisePickerModal` found no confirmed sub-44pt violation —
  icon-only controls checked (`ExercisePickerModal` back/close, `WorkoutSummaryScreen` share button 52×52) all clear 44pt via explicit size or `hitSlop`. The remaining 89 files were not individually checked within the time budget.
- **User impact:** Unknown for the unswept 89 files; prior appstore audit
  (FINDING-L9) already flagged this as an open "device pass" item, still
  open.
- **Business impact:** Low-probability, spot-checkable; matters most for
  the "gym, sweaty hands" use case theme.js itself calls out
  (`iconSize`/`hitSlop` comment, styling.md).
- **Complexity:** S — a scripted sweep (regex for small icon buttons
  lacking `hitSlop`/`minWidth`/`minHeight` ≥44) would close this quickly.
- **Options:**
  1. Dispatch a haiku-tier mechanical sweep: grep every `TouchableOpacity`/`Pressable` wrapping an `Ionicons` with no `hitSlop` and no explicit ≥44 `width`/`height`/`padding`, list the file:line results for a human/device check.
  2. Fold into the existing device-test checklist (F6) as a combined "large text + touch target" pass on the five traced journeys only, defer the other 89 files.
  3. Accept current spot-check evidence as sufficient and close FINDING-L9 — not recommended without the sweep; low cost to run.

---

## Methodology notes / scope cuts

- ESLint run once (`npx eslint .`), 70 problems, 66 a11y-tagged, 0
  auto-fixable — file-by-file list captured in this session's tool output,
  summarised by file/count above rather than reproduced in full.
- Five journeys traced in source only (no on-device TalkBack/VoiceOver
  session): `ActiveWorkoutScreen.js` (log a set), `DiaryScreen.js` (log a
  food), `LiftProgressScreen.js`/chart components (view progress),
  `PartnerScreen.js` (Partners), `ProgressPhotosScreen.js` (add a progress
  photo).
- Contrast reviewed from `theme.js` token comments/values only (which are
  themselves computed and asserted in `theme.test.js`); did not
  independently recompute every ratio from raw hex — spot-verified the
  ones the prior audit flagged (`textMuted`) and confirmed the fix.
- Did not open `theme.test.js` itself to check test quality/coverage, nor
  `src/__tests__/themeTokens.guard.test.js` — flagged as an easy follow-up
  if a future audit wants to verify the tests actually assert what the
  comments claim.
