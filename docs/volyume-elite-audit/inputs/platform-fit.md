# S1 — Platform-Fit Audit (iOS HIG + Android Material 3)

**Date:** 2026-07-04. **Read-only audit.** No code changed. Scope: `Platform.OS`/`Platform.select` usage (288 occurrences, 49 files), Android back handling, edge-to-edge/status-bar, ripple vs opacity, date pickers, notification channels, predictive back; iOS swipe-back, modal idioms, safe-area edges, haptics, Live Activity, keyboard avoidance; shared font scaling, theme, orientation, permission timing, gestures/transitions.

## Executive summary

Overall platform-fit is solid: hardware back is handled correctly everywhere it matters (every `<Modal>` has `onRequestClose`), swipe-back is never disabled, notification channels are properly separated, haptics are centralised with a reduce-motion gate, the date picker correctly branches on the two platforms' native idioms, and the theme already supports dark/light/system rather than being dark-locked. The two headline risks are: (1) **iOS Live Activity is very likely non-functional in the current TestFlight build** — the widget extension Xcode target is a manual one-time step the module's own README says has not yet been proven done, and (2) **predictive back gesture readiness on Android 15 (targetSdk 35) is unverified** — no `enableOnBackInvokedCallback` config found anywhere. Safe-area bottom-edge gaps are a known, already-documented issue (guidance audit + bottom-inset-inventory, both 2026-07-03) confirmed still open in current source; not re-litigated in depth here beyond cross-referencing. Android buttons use a custom spring/opacity press effect app-wide rather than native ripple — a deliberate, consistent design-system choice (documented in theme.js's Materials Policy), flagged as a judgement call rather than a defect. No P0 ED-safety/consent/billing-adjacent findings.

Counts: **P0: 1 · P1: 4 · P2: 6 · P3: 3**.

---

## What is already good

- **Android hardware back**: all 26 `<Modal>` usages have `onRequestClose` wired (verified via grep, zero exceptions); the shared `BottomSheet.js` does this once for every sheet built on it. `ActiveWorkoutScreen.js` additionally uses `BackHandler` for its non-Modal in-session flow.
- **iOS swipe-back**: no `gestureEnabled: false` anywhere in `src/navigation/RootNavigator.js` or any screen — the platform default (enabled on iOS, disabled on Android) is never overridden.
- **Notification channels** (Android): four dedicated channels (`channels.js`) plus two more ad hoc (`activeWorkout.js`, `trainingReminders.js`) — correctly separated by purpose (training reminders, coaching reminders, rest timer, rest alerts) rather than one catch-all channel.
- **Haptics**: fully centralised in `src/lib/haptics.js`, one named vocabulary, every call gated on the user's Reduce Motion preference, `haptics.importBan.test.js` guards against direct `expo-haptics` imports elsewhere. Core-Haptics (iOS-specific richer haptic engine) is correctly NOT started — it's founder decision-gated item 14 per `_AUDIT-STATUS-AND-RESUME.md`; this audit does not propose starting it.
- **Date/time picker**: `PhotoDatePicker.js` is a genuinely well-designed platform wrapper — its own doc comment correctly identifies that Android shows a modal dialog on mount while iOS needs a hosted inline spinner with a Done button, and implements both idioms rather than picking one.
- **Camera permission timing**: requested at point of use (`ScanBarcodeScreen.js` calls `requestPermission()` on focus/tap, not at app launch or onboarding).
- **Theme**: NOT dark-theme-only — `src/styles/theme.js` supports dark/light/system plus higher-contrast and colour-blind-safe modifier tables, all resolved through the same token getters. This resolves what looked like a plausible risk area cleanly.
- **Orientation**: locked to portrait in `app.json` (`"orientation": "portrait"`) consistently, no per-screen overrides found.
- **Store handoffs**: `Platform.OS === 'ios'` branches to the correct native subscription-management deep links (`itms-apps://` vs Play Store URL) in both `CascadeGateScreen.js` and `SubscriptionScreen.js` — a justified, correctly-implemented platform idiom (billing-adjacent; not proposing any change here, flagging only as evidence of good practice).
- Android exact-alarm permission handling in `SettingsScreen.js` is a genuine, well-scoped Android idiom (only shown when the rest-end alert is on and the OS permission isn't yet granted).

---

## Android findings

### A1 — Predictive back gesture readiness unverified
**Area:** Android system gesture / Android 15. **Severity:** P1.
**Evidence:** `app.json` `android.compileSdkVersion`/`targetSdkVersion` = 35; no occurrence of `enableOnBackInvokedCallback` anywhere in the repo (`app.json`, `android/` if present, `plugins/`). Grep for `enableOnBackInvokedCallback|edgeToEdge` returned nothing.
**User impact:** On Android 14/15 devices, apps targeting SDK 35 that haven't opted in get the legacy (non-predictive) back animation, or — depending on RN/Expo's own manifest defaults — may already inherit it transparently via Expo's prebuild template. Currently unknown which applies here.
**Business impact:** Low near-term (cosmetic), but Play Store increasingly nudges/requires predictive-back compliance for apps targeting recent SDKs; worth confirming before it becomes a listing warning.
**Complexity:** S (verification) / S (config addition if needed).
**Options:**
1. Verify only: run `npx expo prebuild` locally (or inspect the EAS build's generated `AndroidManifest.xml`) to see what Expo SDK 54's template sets for `android:enableOnBackInvokedCallback`; no code change if it's already correct.
2. If missing, add `android.enableOnBackInvokedCallback: true` via `expo-build-properties` (already a plugin dependency) and device-test that no custom `BackHandler`/`onRequestClose` logic breaks under the predictive gesture (partial back-swipe preview).
3. Defer and re-audit at the next targetSdk bump if Play Console hasn't flagged it yet.

### A2 — No native ripple; custom press effect used everywhere
**Area:** Material 3 touch feedback. **Severity:** P3 (judgement call, not a defect).
**Evidence:** Zero occurrences of `android_ripple` or `TouchableNativeFeedback` anywhere in `src/`. Every tappable surface goes through `PressableCard.js` (`src/components/PressableCard.js:1-23`), which documents itself as "the way Apple, Linear, Whoop, and Spotify treat their primary tappable surfaces" — a deliberate cross-platform design-system choice, not an oversight.
**User impact:** Android users get a scale/opacity press effect instead of the platform-native ripple. Neither better nor worse per se; it is a consistent, intentional divergence from stock Material.
**Business impact:** None measurable; this is the kind of choice premium cross-platform apps commonly make.
**Complexity:** N/A (no defect).
**Options:** 1. Leave as-is (recommended default — it's already consistent and documented). 2. If the founder wants stock-Material-familiar feedback specifically on Android, that would mean adding `android_ripple` as a platform branch inside `PressableCard`, which is a design-system change, not a bug fix — flag for a design decision, not silently do it.

### A3 — Rest-timer notification vibration is Android-only, unverified iOS parity
**Area:** Notifications / haptics parity. **Severity:** P2.
**Evidence:** `src/components/RestTimer.js:233`: `if (!restTimerActive || Platform.OS !== 'android') return;` gates a rest-end alert path that appears Android-specific (paired with `restEndAlertEnabled`/exact-alarm settings flow). No equivalent iOS branch visible in the same effect.
**User impact:** Need to confirm iOS achieves the equivalent "rest is about to end" alert through Live Activity (see iOS-L1 below) rather than silently having no equivalent at all if Live Activity isn't actually shipping.
**Business impact:** If Live Activity isn't rendering (iOS-L1), iOS users may have zero rest-end alerting path outside the in-app haptic ladder (`restCountdown`/`restDone` in `haptics.js`), which only fires while the app is foregrounded.
**Complexity:** S (investigation) as a standalone item; contingent on iOS-L1's resolution.
**Options:** 1. Confirm via device test whether the in-app haptic ladder is considered sufficient parity by design (likely, since `rest-timer-live`/Live Activity is the backgrounded surface). 2. If Live Activity isn't live yet, treat this as urgent alongside iOS-L1.

### A4 — Edge-to-edge / status-bar treatment not explicitly configured
**Area:** Android system bars. **Severity:** P2.
**Evidence:** No `edge-to-edge`/`expo-navigation-bar` dependency in `package.json`; only `expo-status-bar` (`~3.0.9`) and `expo-system-ui` (`~6.0.9`) are present. `StatusBar` is directly referenced in only 2 files (`theme.js`, `YearOfLiftsScreen.js`). `statusBarTranslucent={Platform.OS === 'android'}` appears correctly on two custom full-screen `Modal`s (`PartnerScreen.js:726`, `FeedbackSheet.js:242`), but this is not a repo-wide pattern — other full-screen Modals were not checked for the same treatment within this pass's time budget (scope cut, noted below).
**User impact:** RN's New Architecture + Android 15 defaults to edge-to-edge display by default (RN 0.81's known behaviour), so if the app isn't explicitly managing the navigation-bar/status-bar colour and contrast, content could render behind system bars inconsistently across the app's various full-screen Modals.
**Business impact:** Visual polish; potential for content-under-status-bar bugs to surface only on specific Android versions.
**Complexity:** M (needs a systematic pass + device verification across Android versions).
**Options:** 1. Device-test on a Android 15 physical unit specifically for status-bar/nav-bar collisions across the main tab screens + the two Modals already doing `statusBarTranslucent`. 2. Audit remaining full-screen `Modal`s (this pass only sampled 2 of the 26) for the same `statusBarTranslucent` treatment where warranted. 3. Adopt `expo-navigation-bar` if gaps are found (new dependency — needs founder approval per CLAUDE.md).

---

## iOS findings

### iOS-L1 — Live Activity likely non-functional in shipped builds (P0)
**Area:** iOS Live Activity / Dynamic Island. **Severity:** P0.
**Evidence:** `modules/live-activity/index.ts:25-31` (module's own doc comment): *"Until this target exists, this module compiles and links but `Activity.request()` throws and the Live Activity never appears."* `modules/live-activity/widget/README.md` describes a fully manual, one-time Xcode step (add a Widget Extension target, wire three Swift files to the correct targets, set `NSSupportsLiveActivities` on both targets) that must be done once inside Xcode after `expo prebuild` and is **not** automated by any Expo config plugin (`plugins/withVolyumeWidget.js` covers the Android home-screen widget, not this).
**User impact:** If this manual step hasn't been completed against the current EAS/Xcode project, the rest timer's lock-screen/Dynamic-Island presence — a headline iOS feature — silently does nothing; `isAvailable()` returns false and every call no-ops, so there's no crash or error surfaced to signal the gap.
**Business impact:** A shipped or TestFlight-advertised feature that doesn't work is a credibility/support-ticket risk, and it's invisible to automated testing since the JS side degrades gracefully by design.
**Complexity:** S to verify (inspect the actual Xcode project / ask the founder whether this step was done), L if the target genuinely needs adding and wiring into the EAS build pipeline (`eas.json` may need a config plugin or a `withXcodeProject` mod to make it durable across future `prebuild --clean` runs, since this manual Xcode edit does not survive a clean prebuild).
**Options:**
1. **Verify first (recommended):** confirm directly whether the `VolyumeWidget` extension target exists in the current Xcode project / EAS build artifact before doing anything else — this may already be resolved and the README simply predates that work.
2. If not done: found a founder decision on priority — do this Xcode wiring by hand once and accept it must be redone after any `expo prebuild --clean`, OR invest in a proper Expo config plugin (`withXcodeProject`) so the widget target survives prebuild automatically (larger, more durable fix).
3. If deprioritised for this cycle: at minimum add a debug-only surfaced signal (e.g. Sentry breadcrumb or dev-only toast) when `startRestActivity` silently no-ops on a real device, so a future regression doesn't go unnoticed again.

### iOS-B1 — Safe-area bottom-edge gaps confirmed still open (cross-reference, not new)
**Area:** iOS home-indicator collision. **Severity:** P1 (already tracked).
**Evidence:** Re-verified against current source: `WorkoutSummaryScreen.js:743`, `CoachOutputScreen.js:1883/1892/1901/2143`, `CoachReviewScreen.js:421/435/460` all still use `edges={['top','left','right']}` (no `'bottom'`); `BlockReflectionScreen.js:99`, `CoachHeldHistoryScreen.js:152` use `['top','left','right']`; `MealPlanScreen.js:454`, `MyMealsScreen.js:182`, `MyRecipesScreen.js:174`, `CreditsScreen.js:32`, `CardioHistoryScreen.js:162`, `FoodInsightsScreen.js:280`, `AddCustomFoodScreen.js:220`, `RecipeBuilderScreen.js:235`, `FoodSearchScreen.js:879`, `LogCardioScreen.js:152`, `GoalLockConsentScreen.js:81` all use `['top']`/`['top','left','right']` only, missing `'bottom'`.
**User impact:** Content or interactive controls can sit under the iOS home indicator on notch-less-home-button devices.
**Business impact:** Already fully scoped with fix options and effort estimates in `docs/audit/guidance-audit-2026-07-03.md` Part 2 and `docs/audit/bottom-inset-inventory-2026-07-03.md`.
**Complexity:** S per screen (per prior audit).
**Options:** Deferred to the existing prior-audit backlog — not re-proposing new options here; flagging only that it is CONFIRMED STILL OPEN as of this pass so it isn't inadvertently dropped from the founder's decision queue.

### iOS-K1 — KeyboardAvoidingView behavior is uniformly `'padding'` on iOS, `undefined` on Android
**Area:** iOS keyboard avoidance. **Severity:** P2.
**Evidence:** Consistent pattern across 10+ screens (`ActiveWorkoutScreen.js:1891`, `ManualBuilderScreen.js:751`, `LoginScreen.js:61`, `PlansScreen.js:1041`, `WorkoutSummaryScreen.js:1218`, `NutritionTargetsScreen.js:455`, `WeeklyCheckInScreen.js:1444`, `ProOnboardingScreen.js` x4, `ProUpgradeScreen.js:362`); one exception, `ExerciseDetailScreen.js:814`, uses `Platform.OS === 'ios' ? 'padding' : 'height'` for Android instead of `undefined`.
**User impact:** `'padding'` is the correct, HIG-idiomatic choice for iOS. The inconsistency itself (one screen diverges to `'height'` on Android while the rest leave Android as `undefined`, relying on the OS's own `windowSoftInputMode` resize) is not necessarily wrong — `undefined` is often the right Android choice — but it means one screen's behaviour wasn't reconciled with the rest, and no `windowSoftInputMode` value was found configured in `app.json` to confirm the intended Android-wide behaviour.
**Business impact:** Low; polish/consistency only, no crash risk.
**Complexity:** S (verification pass + confirm `ExerciseDetailScreen`'s divergence is intentional).
**Options:** 1. Device-verify Android keyboard behaviour on `ExerciseDetailScreen`'s modal specifically since it diverges from the rest. 2. If the divergence was deliberate (perhaps because it's a `Modal`-hosted form where Android's default resize doesn't reach), leave as-is and add a one-line comment explaining why, so the next reader doesn't "fix" it into inconsistency.

### iOS-M1 — Modal presentation review scope cut
**Area:** iOS modal idiom. **Severity:** P3 (scope note, not a finding).
**Evidence:** `RootNavigator.js` uses `presentation: 'modal'` consistently for all overlay-style stack screens (ProUpgrade, LogCardio, CascadeGate, Paywall — lines 296-493), which maps correctly to iOS's card-sheet modal idiom (and Android's equivalent slide-up). Did not have time within the 20-minute budget to verify each modal's internal drag-to-dismiss/swipe-down affordance against the native sheet gesture on a physical device.
**Complexity:** N/A.
**Options:** Recommend a follow-up device-walk of 2-3 representative modal screens (Paywall, LogCardio) specifically for the native swipe-to-dismiss gesture, rather than a source-only read.

---

## Shared findings

### SH1 — Font scaling protection (`maxFontSizeMultiplier`) applied in only 4 files
**Area:** Dynamic Type / system font scaling. **Severity:** P2.
**Evidence:** `allowFontScaling`/`maxFontSizeMultiplier` found only in `MealPlanScreen.js`, `ActiveWorkoutScreen.js`, `SetEntry.js`, `theme.js`. The app otherwise relies on RN's default `allowFontScaling=true` everywhere (correct default for accessibility), but hero numeric displays (weight, reps, calorie rings, macro numbers) elsewhere in the 82-screen app were not all checked for whether extreme system font-scale settings (iOS Larger Accessibility Sizes, Android's largest font scale) could break tabular-number layouts or truncate.
**User impact:** Users on large system font sizes may see clipped/wrapped numeric displays on screens that weren't part of the audited 4.
**Business impact:** Accessibility/quality risk for a health-adjacent app that specifically documents "Larger Text" as an in-app preference (theme.js's own `applyAccessibility` already stacks with OS scaling) — worth confirming the two don't compound badly at the extreme end.
**Complexity:** M (would need a device pass at the OS's largest accessibility text size across the hero data screens: Diary macro ring, ActiveWorkout set rows already covered, WorkoutSummary, Analytics).
**Options:** 1. Targeted device test at max OS font size (not code change) across the highest-risk numeric hero screens. 2. If breakage found, apply `maxFontSizeMultiplier` selectively (matching the existing 4-file pattern) rather than a blanket app-wide clamp, which would fight the accessibility intent.

### SH2 — `Platform.select` used only once for typography (justified)
**Area:** System font family. **Severity:** N/A (informational).
**Evidence:** `ShareCardScreen.js:45`: `Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'sans-serif' })`, explicitly commented as needed because the share-card canvas measures text with the platform's real system font. This is the single `Platform.select` in the whole 288-occurrence set (everything else is `Platform.OS === ...` ternaries) — a correctly justified, narrow use.
**Options:** None; recorded as a "good" pattern, not a finding.

### SH3 — Permission-request copy (app.json) reads well; one internal-only entry worth confirming
**Area:** Permission copy / GDPR-adjacent. **Severity:** P3.
**Evidence:** `app.json` `ios.infoPlist`: camera, motion (shake-to-feedback), location ("does not track your location... permission is never requested"), microphone ("does not record audio... never requested"), FaceID ("does not use Face ID") strings are all calm, accurate, and pre-empt App Review's "why do you need this" question. `expo-camera`/`react-native-vision-camera`/`expo-media-library` plugin strings are similarly specific and honest ("Your photos stay on this device and are never uploaded").
**User impact:** None negative; this is good practice, flagged as evidence for the "already good" section but noted here since it borders GDPR/consent territory this audit was told to flag rather than touch.
**Options:** None proposed; no defect found.

---

## Scope cuts (explicit, per the 20-minute budget)

- Did not open and read `docs/audit/03-design-audit.md` / `03b-motion-materials.md` in full (only grepped for "Platform" mentions, which returned none) — those audits are about colour/motion tokens, not platform idiom, so low expected yield; flagging as unread rather than silently treating as reviewed.
- Did not exhaustively check all 26 `<Modal>` call sites for `statusBarTranslucent` parity (A4) — sampled 2.
- Did not device-test; all findings are source-level. Per CLAUDE.md's device-testing rule, none of the above should be treated as confirmed-broken until device-walked — several (iOS-L1, A1) are explicitly framed as "verify first" for that reason.
- Did not audit `modules/rest-timer-live/android/` Kotlin source in depth (found via `find`, not read) — flagged only as an existence check, not a code review.
