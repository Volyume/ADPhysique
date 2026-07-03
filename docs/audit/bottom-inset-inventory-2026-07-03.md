# Bottom safe-area inventory + canonical pattern (founder defect pass 2026-07-03, issue 1b/1c)

STATUS: ROLLED OUT (founder GO 2026-07-03: "Check all pages and ensure the
e2e is configured correctly for all devices"). The founder's Workout
complete screenshot also exposed the INVERSE bug — a sticky footer adding
insets.bottom on a screen where the tab band already absorbs it — which
sharpened the rule below into its final tab-band-aware form.

## The rule (final)

1. Sticky bar on a screen where the tab band is HIDDEN (ActiveWorkout) or
   that lives outside the tab navigator: `Math.max(token, insets.bottom + lift)`.
2. Sticky bar on a screen where the tab band is VISIBLE (WorkoutSummary,
   Diary selection bar, FoodSearch plate bar): FLAT token only — the band
   absorbs the inset; adding it again double-pads (the over-padded Close).
3. Bottom-anchored Modal sheets overlay the band and touch the physical
   screen edge: always `Math.max(sheet token, insets.bottom + spacing.lg)`.
   Fixed once in shared BottomSheet.js; the hand-rolled copies
   (FeedbackSheet, PeekMenu, ProGate upsell, FoodSearch plate modal) carry
   the same line. bottomBarInset.guard.test.js pins all of it.

Applied 2026-07-03: WorkoutSummary footer → flat token; BottomSheet.js,
FeedbackSheet, PeekMenu, ProGate upsell sheet, FoodSearch plate modal →
inset-absorbing. Scroll-away CTAs inside SafeAreaView are untouched (right
tool already). DiaryScreen selectionBar/scanFab sit above the visible band
(rule 2, already correct with flat tokens).

## Why this broke

E15 replaced the stock tab bar with VolyumeTabBar, which returns null while
ActiveWorkout is focused (`src/components/VolyumeTabBar.js:73`). The stock
bar used to absorb the system bottom inset on every tab screen, so several
surfaces were written with flat spacing tokens where the inset should be.
Any surface that is (a) sticky at the bottom and (b) visible on a screen
where no tab bar renders is exposed to the Android gesture pill / 3-button
bar and the iOS home indicator.

## Inventory (2026-07-03, verified against source)

Respecting the inset today (13): ActiveWorkout's five bottom sheets and swap
modal, WorkoutSummary stickyFooter, Article9Consent, ProGoalSetup, Login,
WeeklyCheckIn, ManualBuilder, ExercisePickerModal, CascadeGate, Paywall,
RoutineDetail, ExerciseDetail.

Hardcoded token standing in for the inset (13):
- `ActiveWorkoutScreen.bottomBar` — FIXED this pass (Math.max(spacing.md, insets.bottom + spacing.sm)).
- `components/BottomSheet.js` (shared chrome → FoodDetailSheet, QuickAddSheet) — paddingBottom spacing.xxl + spacing.md, no insets.
- `components/FeedbackSheet.js:356` and `components/PeekMenu.js:174` — same hardcoded pattern, own copies.
- `screens/DiaryScreen.js` selectionBar (:1434, absolute bottom 0) and scanFab (:1423).
- `screens/FoodSearchScreen.js` plateModalSheet (:1121).
- `components/ProGate.js` inline upsell sheet (:94-124).
- `screens/ProUpgradeScreen.js`, `ProOnboardingScreen.js` (5 steps), `GoalLockConsentScreen.js` — CTAs scroll away inside padded ScrollViews; low risk, listed for completeness.
- `components/StreakWeeksSection.js` action sheet (:244).

No handling at all (2, both sticky, both real collisions):
- `screens/FoodSearchScreen.js` plateBar (:1105) — the food-flow "Log" bar.
- `screens/ProGate.js` ProLocked — SafeAreaView excludes bottom; scroll padding only.

## Canonical pattern (proposal, one rule per surface class)

One hook, `src/hooks/useStickyBottomPad.js`:

    // paddingBottom for anything pinned to the physical screen bottom.
    export default function useStickyBottomPad(base, lift = spacing.sm) {
      const insets = useSafeAreaInsets();
      return Math.max(base, insets.bottom + lift);
    }

- Sticky bars and absolute overlays (outside any ScrollView):
  `paddingBottom: useStickyBottomPad(spacing.md)`.
- Bottom-anchored modal sheets: fix ONCE in shared `BottomSheet.js` with
  `useStickyBottomPad(spacing.xxl, spacing.lg)` (the exact pattern
  ActiveWorkout's own sheets already use); FeedbackSheet and PeekMenu adopt
  the same line in their local styles.
- Floating action buttons: `bottom: spacing.xl + insets.bottom`.
- Scroll-away CTAs inside SafeAreaView with bottom edge: unchanged — the
  ScrollView's own padding is the right tool there.
- Guard: extend `bottomBarInset.guard.test.js` per adopted surface so a
  future refactor cannot silently drop the inset again.

Behaviour on devices with no bottom inset (insets.bottom = 0): Math.max
falls back to today's exact padding, so nothing gains a double gap.

## Proposed rollout order (on GO)

1. FoodSearchScreen plateBar + DiaryScreen selectionBar/scanFab (the two
   live collisions).
2. Shared BottomSheet.js (+ FeedbackSheet, PeekMenu copies) — one change,
   many surfaces.
3. ProGate upsell sheet + ProLocked bottom edge; StreakWeeksSection sheet;
   FoodSearchScreen plateModalSheet.
