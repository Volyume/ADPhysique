# Facts: Onboarding & auth

Raw fact-extraction report, saved verbatim from a read-only subagent
(model: claude-sonnet-5) run on 2026-07-09. Evidence base for `ASSESSMENT.md`.
Facts only; all judgement lives in the assessment.

---

# UX Audit Fact Extraction: Onboarding/Auth Flow

## 1. FLOW MAP

**Routing logic (`src/navigation/RootNavigator.js`, `renderNavigator()`, lines 1421-1471):**
```
if (!user) → WelcomeStack
if (user && !isLocal && !firstRunComplete && !healthConsentChecked) → SplashScreen (blocking wait)
if (user && !isLocal && healthConsentChecked && (healthConsent===false || (healthConsent==null && !firstRunComplete))) → Article9ConsentStack
if (!firstRunComplete) → tier==='pro' ? ProOnboardingStack : FirstRunStack
else → LockedMainTabs (MainTabs + optional biometric lock overlay)
```

**Free path:** Welcome → Login (OAuth only) → [Article9Consent, since every signup starts the trial] → FirstRunScreen (name only) → FreeStarterScreen (3-question quiz, or skip) → MainTabs (Home).

**Pro path (same trial cascade, but stays pro after Article 9 grants tier):** Welcome → Login/OAuth-inside-wizard → Article9Consent → ProOnboardingStack, a 6-step wizard (Account → Baseline → Body composition → Training week → Targets → Check-in rhythm) → ProSetupCompleteScreen → MainTabs.

**Quiz-first variant (flag `ONBOARDING_QUIZ_FIRST`, off by default):** Welcome → QuizScreen (pre-account, 4-6 questions, answers held only in memory, never persisted) → PlanPreviewScreen → Login (account wall) → same Article9/onboarding flow, prefilling steps from the quiz slice.

**Gates that block progression:**
- Article 9 consent: un-skippable, fails closed on network error (unresolved consent for a new user re-shows the gate; a returning user with a read failure is NOT re-prompted).
- ProOnboarding step 2 "Required details": Continue is disabled (`canContinue`) until first name, biological sex (no default), age 13-100, body weight 30-300kg, and height (120-250cm) are all valid. Sex has explicitly no default per source comment ("a silent 'male' default could mis-floor a female").
- FirstRunScreen: Continue disabled until first name entered.
- QuizScreen: "See your plan" disabled until experience + days/week + trainingGoal set.
- FreeStarterScreen: no hard gate, "Skip, I'll choose myself" is always visible/tappable.

**Back-button behaviour:**
- QuizScreen: added a back chevron (source comment: "the flow had no way back" was a fixed bug).
- FreeStarterScreen: `handleBack` steps back one question, or navigation.goBack() on the first step.
- ProOnboardingScreen: `goBack()` no-ops on step 1, and (importantly) **no-ops on step 2 if `accountCreated` is true** ("can't go back past completed registration") — so once OAuth completes, the user cannot return to a null step-1 state.
- Article9ConsentScreen: no back button at all (by design, un-skippable).
- GoalLockConsentScreen: has BackHeader.

## 2. COPY (verbatim)

1. "Less thinking. More lifting." (tagline, Welcome/Login/Splash)
2. "The full app, free for 14 days" (Welcome trial card headline)
3. "No payment card needed. Afterwards it's {price} a month on {store}, or carry on free."
4. "You're almost set up." (FirstRunScreen headline)
5. "A few quick questions." / "Your plan takes shape as you answer." (QuizScreen)
6. "Health and nutrition data consent" (Article9 headline)
7. "Volyume Score is a simple progress read, not a medical measure, DEXA scan, diagnosis, or medical advice."
8. "What if I don't agree?" (Article9 decline-info affordance)
9. "Set up your Pro account safely" / "Sign in once so your plan, weight history and coaching updates can be restored if you change device." (ProOnboarding step 1)
10. "Please choose your biological sex. It sets your calorie and nutrition targets." (validation alert)
11. "You're all set, {firstName}." (ProSetupComplete headline)
12. "Waiting for Google or Apple…" (Login OAuth pending caption)
13. "That didn't go through. Try again." (generic OAuth-failure toast — deliberately hides raw provider error text)

## 3. STATE COVERAGE

- **Loading:** LoginScreen shows a text caption "Waiting for Google or Apple…" while `loading` is true (buttons disabled/dimmed, no spinner on the buttons themselves). ProOnboardingScreen step 1 shows an `ActivityIndicator` under the OAuth buttons while `busy`. ProOnboardingScreen's plan-generation step (advanceFrom6) replaces the button with a 4-stage animated "staged sequence" (min 3.2s hold) naming real build phases ("Balancing your week", "Setting your starting volume…", "Choosing your exercises", "Fitting sessions to your {N} minutes"), or a plain button spinner under Reduce Motion.
- **Error:** Every validation failure in ProOnboardingScreen routes through `appAlert(title, body)` (native alert), e.g. missing name/sex/age/height/experience/equipment/recovery. OAuth provider errors are deliberately never shown raw — code comment "FR-2: never show raw provider/SDK error text at the user's very first touchpoint" — user sees only "That didn't go through. Try again." Article9 consent failure: `appAlert('Could not save', 'We could not record your consent. Check your connection and try again.')`.
- **Offline/retry:** Article9 consent RPC failure doesn't strand the user — it queues a pending consent for later sync (`queuePendingConsent`) and lets them proceed locally. Plan-generation failure in ProOnboarding does not block completion; it surfaces `appAlert('Plan setup didn't finish', ...Open Today and choose "Start with a plan" to retry.)` and still routes to ProSetupComplete. Nutrition-target save failures similarly degrade with a toast ("Goal saved, but targets didn't recalculate...") rather than blocking (seen in ProGoalSetupScreen).
- **Cancelled OAuth:** LoginScreen explicitly distinguishes `result.cancelled` (toast: "Sign-in was cancelled.") from `result.error` — source comment flags this as a fix for a previously-silent case ("A7: a cancelled OAuth dialog... used to fall into the silent else below with no feedback at all").
- FreeStarterScreen: if plan library fails/hasn't loaded, shows "We couldn't pick a plan" / "The plan library hasn't loaded yet. You can browse it yourself, or try again in a moment." with a Continue/Browse button (no auto-retry).

## 4. INTERACTION

- **Animations:** WelcomeScreen fades/slides in (`fadeIn`/`slideUp`, `motion.hero` duration). SplashScreen runs a staged hero scale+fade+accent-bar-sweep+tagline sequence (skipped entirely under Reduce Motion, values start at end-state). ProSetupCompleteScreen stages each content block in with Reanimated `FadeInDown` at `motion.micro` increments per index (numbered stage(i)); this motion is **also suppressed under calm mode or an open ED-pattern flag**, not just Reduce Motion (`motionSuppressed` state).
- **Transitions:** RootNavigator defines a shared "hero-zoom" cardStyleInterpolator (opacity 0→1, scale 0.92→1.0) applied to ActiveWorkout/WorkoutSummary/PlanDetail/RoutineDetail/ExerciseDetail — not used on any of the auth/onboarding screens themselves (those are plain stack pushes).
- **Haptics:** No direct haptics calls found in WelcomeScreen/LoginScreen/FirstRunScreen/QuizScreen/Article9ConsentScreen/GoalLockConsentScreen/ProGoalSetupScreen/FreeStarterScreen. ProSetupCompleteScreen calls `planReady()` from `lib/haptics` once on mount (a "success" haptic tied to reaching the plan reveal); tab-bar navigation elsewhere uses `haptics.selection()`.
- **Keyboard handling:** FirstRunScreen, LoginScreen, ProOnboardingScreen (all steps), ProGoalSetupScreen all wrap in `KeyboardAvoidingView` with `behavior: 'padding'` on iOS / undefined on Android, plus `keyboardShouldPersistTaps="handled"` on the ScrollViews. A source comment in FirstRunScreen and ProGoalSetupScreen ("L03-C5, 2026-07-09 design audit") notes this was a standardisation pass across screens.
- **Progress indicators:** ProOnboardingScreen shows "Step {n} of 6 – {label}" text plus an animated fill bar with an "Endowed Progress Effect" base of 12% filled even at step 1 (explicit source comment). FreeStarterScreen shows 3 dot indicators (no numeric label). QuizScreen has no step indicator at all (single scrolling form). ProSetupCompleteScreen redraws the same progress bar at 100% to visually bookend the wizard.
- **Auto-focus:** FirstRunScreen and ProOnboardingScreen step 2 both auto-focus the name field after a 350ms delay.
- **Drafts/resume:** ProOnboardingScreen persists a debounced (per `DRAFT_DEBOUNCE_MS`) AsyncStorage draft of all wizard answers from step 2 onward, restoring on remount (survives process death); explicitly re-clamps a corrupted/invalid restored `sex` value back to step 2 rather than letting it silently pass the gate.

## 5. ACCESSIBILITY

- Extensive `accessibilityRole`/`accessibilityLabel` usage throughout: QuizScreen marks each option group `accessibilityRole="radiogroup"` with radio children; ProOnboardingScreen labels every TextField explicitly (e.g. "Current body weight in stones", "Starting body fat estimate percentage, optional"); Article9ConsentScreen's consent checkbox carries an explicit `accessibilityLabel`; GoalLockConsentScreen options use `accessibilityRole="radio"` with `accessibilityState={{selected}}`.
- `accessibilityState={{ disabled }}` set on primary CTAs when a gate blocks continuation (Article9 Continue, GoalLockConsent Save/Continue).
- Touch targets: repeated explicit `minHeight: 44` (WCAG/HIG minimum) on interactive rows — QuizScreen chip row (`quizChip: { minHeight: 44 }`), Welcome sign-in link, EmailPasswordFields' password-visibility toggle (`minWidth/minHeight: 44`), FreeStarter's skip link (`minHeight: 40`, slightly under the 44 convention used elsewhere).
- `hitSlop` added to small icon-only touch targets (QuizScreen back chevron, FreeStarter back chevron, Welcome sign-in link).
- `AccessibilityInfo.announceForAccessibility(...)` fired for each stage label during ProOnboarding's plan-build sequence, so screen-reader users get the same staged narration as sighted users see visually.
- No explicit dynamic-type / font-scaling handling found in any of these files (all font sizes come from `theme.js` tokens, not `allowFontScaling` props).
- SplashScreen's hero image carries `accessibilityLabel="Volyume"`.

## 6. FRICTION FACTS

- **Free path to first value:** Welcome (1 tap: "Start your 14 days") → Login (1 tap: OAuth provider) → Article9 consent (1 checkbox + 1 tap) → FirstRunScreen (type name, 1 tap) → FreeStarterScreen (3 taps to answer + 1 tap "Start with this plan") = roughly 4 screens, ~7 taps + 1 text entry to a logged-in Home with an active plan. Skipping the quiz reduces this by one screen but leaves the user planless.
- **Pro path is a genuine long-form:** ProOnboardingScreen is a 6-step wizard covering account, name/sex/age/height/weight, optional body fat, experience/session-length/days/equipment, training goal/phase/weak-points, and recovery/notification-time/cardio-toggle — before the 3.2s (min) staged plan-generation animation and the ProSetupCompleteScreen reveal. This is a materially longer, multi-field form flow than the free path (contrast with CLAUDE.md's stated "Every Pro screen wraps in withProGuard" gating — this is purely a UX volume observation, not a gating one).
- **Forced waiting:** SPLASH_MIN_MS = 1600ms minimum splash hold for first-run users (source comment: masks first-run DB seeding). ProOnboarding's plan-build sequence enforces a minimum 3200ms display (`SEQUENCE_TOTAL_MS`) even if the real work finishes faster ("held on its final stage until the minimum display time has elapsed").
- **No anonymous/guest mode** — sign-in (Apple/Google OAuth) is mandatory before any screen beyond Welcome; there is no "try without an account" path (explicit, locked decision per `IDENTITY_AND_OWNERSHIP_LOCKED.md`).
- **Potential dead end:** if OAuth completes but `advanceFrom6` (final Pro onboarding step) throws, the user is returned to the step-6 form with a generic "Something went wrong" alert and must retry from there; no explicit "contact support" affordance on repeated failure.
- Once OAuth account creation completes in ProOnboardingScreen, the back button is deliberately disabled on step 2 ("can't go back past completed registration") — a one-way door once the account exists.

## 7. STANDOUT

**Unusually well done:**
1. Explicit design-level anti-dark-pattern discipline: Welcome's "Yours free, always" card is described in-code as deliberately non-competing/informational (fixing a prior "dead control" bug where both cards routed to the same signup) — an honest disclosure pattern rather than a fake choice.
2. The Article 9 consent screen adds a self-serve "What if I don't agree?" affordance (sign out / delete account) explicitly because the only prior option was "killing the app" — a genuine UX/legal improvement layered without weakening the gate.
3. ProOnboarding's plan-generation "staged sequence" is tied to real internal build phases (not fake progress theatre) and aborts instantly with no fake completion tick if generation actually fails — code explicitly calls out avoiding "theatre."
4. Draft persistence across process death for the 6-step Pro wizard, with a hard rule that a restored draft can never silently skip the mandatory biological-sex gate even if storage is corrupted.
5. Motion suppression for the setup-complete "celebratory" reveal is wired to calm-mode/ED-flag state, not just the standard Reduce-Motion accessibility setting — an unusual and deliberate safety-first UX choice.

**Rough edges (factual):**
1. `EmailPasswordFields.js` component (src/components/auth/) is unused dead code in the current flow — email/password login was removed per CLAUDE.md but the component and its `__tests__` remain in the auth folder.
2. LoginScreen's OAuth loading state is a text caption only ("Waiting for Google or Apple…") with no spinner on the buttons themselves, and no visible timeout/cancel affordance if the OAuth dialog never returns.
3. FreeStarterScreen's skip-link minHeight is 40px, inconsistent with the 44px convention used on other tap targets in the same and sibling screens.
4. QuizScreen has no step-progress indicator at all (no "step X of Y", no dots), unlike every other multi-step surface in the flow (ProOnboarding has a numbered progress bar, FreeStarter has dots).
5. Once a Pro user's OAuth account is created (step 1 of 6), the wizard's back navigation is permanently disabled on step 2 onward ("can't go back past completed registration") — there is no way to review/redo the account step even though 5 more data-entry steps follow.
