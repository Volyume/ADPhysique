# Facts: cross-cutting polish sweep (mechanical greps)

Raw grep/count report, saved verbatim from a read-only subagent (model: claude-haiku-4-5-20251001)
run on 2026-07-09. Evidence base for `ASSESSMENT.md`.

**CAVEATS (recorded hands-on before judgement, where this sweep conflicts
with the closer per-area reads):**
1. Reduce motion: this sweep grepped for the RN APIs `useReducedMotion`/
   `isReduceMotionEnabled` and found 0. The app in fact gates motion via its
   own store flag (`accessibility?.reduceMotion`), confirmed by direct reads
   of VolyumeTabBar, ActiveSessionMiniBar, SplashScreen, ExerciseDetail and
   others. 'No reduce-motion support' is FALSE; coverage is real but
   store-driven.
2. 'Screens with zero accessibility props' counts the screen FILE only.
   Screens like ActiveWorkoutScreen delegate interactive rows to components
   (SetEntry.js carries explicit labels/hints), so per-screen zeros overstate
   the gap. Treat the list as 'screens to verify', not 'screens without a11y'.
3. 'Alert.alert 0 in screens' reflects the wrapper: the app routes native
   alerts through `appAlert` (components/AppAlert), which IS used widely.
4. Haptics 'mostly tests' undercounts: `src/lib/haptics.js` is a vocabulary
   module (press/commit/selection/planReady) used by food surfaces, tab bar,
   summary and celebrations per the per-area reads.

---

---

## UX AUDIT REPORT: ACCESSIBILITY & PATTERNS

### 1. ACCESSIBILITY COVERAGE

**accessibilityLabel:**
- Screens: 64/82 (78%)
- Components: 121/154 (79%)
- Total: 185/236 files (78%)

**accessibilityRole:**
- Screens: 61/82 (74%)
- Components: 82/154 (53%)
- Total: 143/236 files (61%)

**accessibilityHint:**
- Screens: 11/82 (13%)
- Components: 11/154 (7%)
- Total: 22/236 files (9%)

**10 Largest Screens with ZERO accessibility props:**
1. ActiveWorkoutScreen.js (3,838 lines)
2. NutritionTargetsScreen.js (2,159 lines)
3. WorkoutSummaryScreen.js (1,840 lines)
4. NotificationSettingsScreen.js (987 lines)
5. RoutineDetailScreen.js (899 lines)
6. ProGoalSetupScreen.js (681 lines)
7. BuildWorkoutScreen.js (669 lines)
8. ProSetupCompleteScreen.js (642 lines)
9. ProUpgradeScreen.js (595 lines)
10. CoachingRemindersScreen.js (491 lines)

Total screens with ZERO accessibility props: 45/82 (55%)

---

### 2. HAPTICS

**Files using haptics:** 43 files
- **Actual implementation:** src/lib/haptics.js
- **Usage:** PRCelebration.js, RestTimer.js (main components)
- Mostly test coverage and mockings in __tests__ files

---

### 3. ANIMATION LIBRARIES

**react-native-reanimated:** 20 files
- Components: VolyumeChart, MacroRings, Button, VolyumeTabBar, ProgressPhotoViewer, ProgressPhotoCompare, AnimatedRow, AnimatedEntrance, RollingNumber, PressableCard, PartnerPrivacyReceipt
- Screens: DiaryScreen, PartnerScreen, ProSetupCompleteScreen, CoachOutputScreen

**Animated (RN core):** 9 files
- Components: MacroRings, ActiveSessionMiniBar, VolyumeTabBar, ProgressPhotoCompare, ProgressPhotoViewer, RollingNumber, PressableCard
- All limited use

**LayoutAnimation:** 0 files

**useReducedMotion/isReduceMotionEnabled:** 0 files (no accessibility motion control)

---

### 4. EMPTY/LOADING STATE UX

**EmptyState component usage:** 22 screens (27%)
**Skeleton component usage:** 29 screens (35%)
**ActivityIndicator usage:** 8 screens (10%)

**Screens with ALL THREE:** 0
**Screens with AT LEAST ONE:** 37 (45%)
**Screens with NONE of the three:** 45 (55%)

Largest screens with no loading/empty patterns:
- NutritionTargetsScreen.js (2,159 lines)
- WorkoutSummaryScreen.js (1,840 lines)
- NotificationSettingsScreen.js (987 lines)
- RoutineDetailScreen.js (899 lines)
- ProGoalSetupScreen.js (681 lines)

---

### 5. ERROR HANDLING & FEEDBACK UX

**Toast/useToast usage:** 38 screens (46%)
**Alert.alert() usage:** 0 screens
- All error feedback via Toast component (good consistency)

---

### 6. THEME DISCIPLINE (Hard-Coded Colours)

**Hard-coded hex colours found:** 0 files
- Excellent adherence to theme.js system
- No violations in screens or components

---

### 7. DYNAMIC TYPE SUPPORT

**allowFontScaling usage:** 5 files
- WorkoutHistoryScreen.js, ActiveWorkoutScreen.js, MealPlanScreen.js, RestTimer.js, SetEntry.js
- Plus theme.js (definition)

**maxFontSizeMultiplier usage:** 4 files
- Same files plus one test

**Coverage:** Minimal (6/236 = 2.5% of files have explicit dynamic type control)

---

### 8. IMAGES & MEDIA

**Files using Illustrations, lottie, expo-image, or Video:** 7 files
- Screens: ProgressPhotosScreen.js, AthleteProfileScreen.js, ShareCardScreen.js
- Test files: 3
- Components: BrandMark.js

---

### 9. TABLET & LANDSCAPE SUPPORT

**app.json orientation setting:** `"portrait"` (locked)
**iOS supportsTablet:** `false`
**Android requireFullScreen:** `true`
**useWindowDimensions usage:** 35 files (15% of codebase)
- Used for responsive calculations

**Tablet support:** Explicitly disabled

---

### 10. LARGEST SCREEN FILES (15 largest, lines of code)

1. ActiveWorkoutScreen.js — 3,838 lines
2. CoachOutputScreen.js — 3,113 lines
3. HomeScreen.js — 3,047 lines
4. ProgressPhotosScreen.js — 2,453 lines
5. ProOnboardingScreen.js — 2,212 lines
6. DiaryScreen.js — 2,174 lines
7. NutritionTargetsScreen.js — 2,159 lines
8. PartnerScreen.js — 2,143 lines
9. WeeklyCheckInScreen.js — 1,979 lines
10. WorkoutSummaryScreen.js — 1,840 lines
11. ManualBuilderScreen.js — 1,550 lines
12. BodyMetricsScreen.js — 1,464 lines
13. MealPlanScreen.js — 1,446 lines
14. PlansScreen.js — 1,345 lines
15. ExerciseDetailScreen.js — 1,300 lines

**Total src/screens LOC:** 60,243 lines across 82 files (avg 735 lines/file)

---

### KEY FINDINGS

- **Accessibility bottleneck:** 55% of screens lack any accessibility props; 9 files exceed 600 lines without a11y labels
- **Loading UX:** 55% of screens have no explicit empty/loading pattern (risk: unfamiliar behaviour on delays)
- **Animation:** Heavy use of Reanimated (20 files) but no reduce-motion support; 0 LayoutAnimation
- **Error UX:** Consistent (Toast only, no Alert.alert)
- **Theme compliance:** Perfect (0 hard-coded colours)
- **Dynamic type:** Minimal support (2.5% coverage)
- **Portrait-only:** Phone-locked design; tablet/landscape fully disabled
- **Code scale:** 3 files > 3,000 LOC; 10 files > 1,400 LOC
