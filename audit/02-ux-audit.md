# Volyume — UX Audit (02)

Date: 2026-07-01 · Read-only session · Method: four parallel journey audits
(onboarding & first session, core workout loop, nutrition & check-in loop,
structure & navigation), reconstructed from navigation + JSX with file:line
evidence, judged against Nielsen's 10 heuristics plus the mobile-fitness bar
(glanceability, one-handed reach, fat-finger tolerance, offline resilience,
interruption recovery). Companion: `01-codebase-audit.md`. The ED-safe calm
voice and safety gates are deliberate design and are NOT reported as friction;
findings concern legibility, dead ends and unmanaged expectation.

**One structural discovery that reframes the funnel:** there is effectively no
free onboarding path. Welcome's Free/Pro choice passes an `intent` param that
LoginScreen never reads (`WelcomeScreen.js:66`, LoginScreen has no route
usage); the Article 9 consent screen unconditionally starts the 14-day Pro
trial (`Article9ConsentScreen.js:127` → `cascade.startCascade()`), so every
consenting new user is routed into the Pro wizard (`RootNavigator.js:1259`).
FirstRun/FreeStarter runs only as a fallback.

---

## 1. Journey maps (condensed; full traces in the four agent reports)

### Onboarding (the real path: Pro trial)
Splash (1.6s first-run hold) → Welcome (1 tap; choice is cosmetic) → Login
(1 tap + OS OAuth sheet; one button per platform) → Article 9 consent
(checkbox + Continue; no decline affordance; trial granted here) →
ProOnboarding 5-step wizard (step 1 auto-skips; step 2 profile — name typed,
sex REQUIRED no default, age/height/weight prefilled; step 3 logistics; step 4
goal, prefilled; step 5 recovery + reminders → OS notification dialog → 3.2s
honest "Building your plan" sequence; a day-0 weigh-in is seeded) →
ProSetupComplete reveal (kcal ring, macros, named split, "why this plan") →
Home. **~16 taps / 3–5 min to Home; ~38 taps to first logged workout.**
First coaching output is **calendar-gated: earliest day 5, up to day 11**
(check-in day-lock default Sunday + ≥5 days since first weight + ≥3 weigh-ins,
`trialActivation.js:23-24`), against a 14-day trial.

### Core loop (one session)
Home hero → Start (intent sheet, skippable) → ActiveWorkout: hybrid
stepper+keyboard entry prefilled from last session's actuals; matching last
session = **1 tap per set**, keyboard-Done logs directly; rest auto-starts,
wall-clock anchored; auto-advance 1.8s after target sets; supersets auto-jump.
Sets write to SQLite at log time; full session snapshots to AsyncStorage on
every mutation; kill/reboot recovery verified. **The loop's soft spot is
rest-while-locked:** no scheduled end-of-rest trigger exists anywhere, the
Android lock-screen countdown freezes at its last foreground value, and iOS
has no lock-screen surface at all.

### Nutrition & check-in loop
Meal logging: search path 3 taps + typing; **re-log stack is best-in-class**
(slot "usuals" chip 1 tap, recents 2 taps, copy-yesterday 2-3 taps, barcode
FAB). Weekly check-in: three gates (day-lock — no override; ≥5 days; ≥3
weigh-ins — deferrable), then a 3-tap fast card or 7+-tap wizard with
pre-derived answers → CoachOutput runs the engine on-device → every
adjustment individually confirm-then-apply. The pain is not entry, it is
**legibility of the engine's output** (below).

### Structure
5 tabs (Train/Plans/Diary/Progress/You); Diary tab wholly Pro with a
show-then-sell teaser gate (good); ~19 screens registered in multiple stacks;
deep links gated correctly; notification-tap routing has a tested no-dead-end
map. Gate placement is mostly motivating (the after-3-sessions personalised
teaser is the best gate in the app); the punitive edges are unmarked Pro
tiles and four features showing mismatched generic lock copy.

---

## 2. Friction inventory (consolidated, 30 findings)

| ID | Sev | Journey | Finding (file:line) | Direction |
|----|-----|---------|---------------------|-----------|
| NAV-1 | **critical** | Structure | Home's "this week's review" coach banner is a **dead tap**: `navigate('CoachOutput')` from HomeStack but the route lives only in ProfileStack — silent production no-op (`HomeScreen.js:1020` vs `RootNavigator.js:416`; the sibling banner at `:999` does it correctly) | Route via `getParent()?.navigate('ProfileTab', {screen:'CoachOutput'})` |
| CL-1 | **critical** | Core loop | Rest ending is **silent when locked/pocketed**: no scheduled end-of-rest notification exists (`scheduler.js` has none; `activeWorkout.js` triggers all null); beeps/haptics run only in a foreground effect and the catch-up tick skips even the GO cue (`RestTimer.js:72-139`, `useAppStore.js:1395-1407`) | Schedule one notification at `restTimerEndsAt` (cancel on skip/adjust); fire GO haptic on resume catch-up |
| CL-2 | high | Core loop | iOS has **zero lock-screen surface** (module Android-gated `activeWorkout.js:249`; Live Activity only ever ended, `App.js:442-448`; two dead update-effects feed a no-op) | This is the CLAUDE.md-gated Live-Activity founder decision — surface it as such |
| NU-1 | high | Nutrition | Coach narration **ignores the calorie-adherence answer**: check-in stores `'yes'/'no'/'untracked'` but "what was off"/Focus check `'under'/'over'` — only the engine input is vocabulary-mapped (`CoachOutputScreen.js:122-128,155-157,1119-1122`; `WeeklyCheckInScreen.js:392,535`) | Run buildOffItems/buildFocus on the mapped engineCheckin |
| NU-2 | high | Nutrition | Applied **carb cycle / refeed have no exit**: one tap writes `userProfile.macroCycle`/`refeed`, nothing ever clears them, and calorie banking silently disappears (`CoachOutputScreen.js:1016-1055`; `DiaryScreen.js:213-214`) | Visible "stop the split / clear refeed" affordance; expire refeed after its day |
| NU-3 | high | Nutrition | **Apply can silently no-op at the ED floor**: `if (!computed) return;` after the floor clamp returns null — spinner ends, no chip, no message (`CoachOutputScreen.js:803-804`; `coachApply.js:68-70`); partial clamps apply less than the row label says | Keep the clamp; explain it ("held at your safe minimum") in the row |
| OB-1 | high | Onboarding | **Welcome's Free/Pro choice is a dead control**; free-intent users are funnelled into the Pro trial + wizard with no opt-out until day 14 (`WelcomeScreen.js:66`; `Article9ConsentScreen.js:127`; `RootNavigator.js:1259`) | Honour free intent (skip-to-free during onboarding) or reframe Welcome as trial-first |
| OB-2 | high | Onboarding | Denying the notification permission **silently discards the chosen check-in day** (the whole prefs write sits inside `if (granted)`, `ProOnboardingScreen.js:460-483`) — user later told "come back on Sunday" | Persist prefs regardless; permission gates only the scheduling calls |
| OB-3 | high | Onboarding | Process death mid-wizard loses every answer from steps 2–4 (all state screen-local, `ProOnboardingScreen.js:128`) — the app's longest flow has no interruption recovery while workouts do | Persist step + answers per uid; clear on completeFirstRun |
| OB-4 | high | Onboarding | First coaching output is **5–11 days away and the wait is only explained on rejection**; `firstCheckinUnlockDate` exists but ProSetupComplete says only "End of your training week" (`trialActivation.js:23-62`; `ProSetupCompleteScreen.js:344-347`) | Name the date on ProSetupComplete + Home banner from day 0 |
| CL-3 | high | Core loop | **Auto-advance yanks 1.8s** after the target set and is never cancelled by "Log another set" (`ActiveWorkoutScreen.js:1035-1042`; timeout not cleared in handleCompleteSet) | Clear the timeout on log; consider explicit advance |
| CL-4 | high | Core loop | The primary CTA **floats mid-scroll and swaps identity in place** ("Log set" becomes "Next exercise" in the same pixels, `ActiveWorkoutScreen.js:2117-2172`) — outside the thumb zone, invites auto-pilot mis-taps | Pin the CTA to the bottom edge; keep "Log another set" primary-sized in the old slot |
| CL-5 | high | Core loop | Rest countdown **scrolls off-screen** (timer row inside the ScrollView, nothing sticky; header shows only elapsed, `ActiveWorkoutScreen.js:1859-1864`) | Mirror remaining rest in the fixed header while active |
| NAV-2 | high | Structure | MealPlan "no targets" recovery redirect is a no-op (`MealPlanScreen.js:156` → route only in ProfileStack) — toast promises, takes user nowhere | Cross-tab navigate |
| NAV-3 | high | Structure | Diary's OFF-sharing prompt **dismisses itself then fails to navigate** (`DiaryScreen.js:800`) — the affordance is lost permanently | Navigate first; dismiss on success |
| NAV-4 | high | Structure | The differential paywall is **unreachable by its only audience**: it renders inside a Pro-guarded screen but triggers only for free tier (`CoachOutputScreen.js:1908`; `RootNavigator.js:162`; `differentialPaywall.js:12`) | Founder decision: surface on an ungated screen or retire |
| NU-4 | medium | Nutrition | "Next week"/"maintenance week" labels on **indefinite** target writes; new absolute kcal hidden until after the tap (`CoachOutputScreen.js:250,428,254`) | "→ 2,350 kcal/day, stays until your next check-in" before the tap |
| NU-5 | medium | Nutrition | EWMA delta presented as plain weekly change ("+0.3kg this week") on the decision screen while the check-in labels it "7-day smoothed trend" (`weeklyCoach.js:607-608`; `CoachOutputScreen.js:1534,1703`) | Label the chip "trend" |
| NU-6 | medium | Nutrition | kJ display preference not honoured across the coaching loop (raw kcal in coach cards, check-in, ease-nudge) while the food domain converts religiously (`CoachOutputScreen.js:241,457,502,675`; `WeeklyCheckInScreen.js:747`; `NutritionTargetsScreen.js:1235`) | Route through toEnergy/energyUnitLabel |
| NU-7 | medium | Nutrition | Calculator warnings stack as identical engine-register banners; the floored hero kcal carries no mark that a safety system raised it (`NutritionTargetsScreen.js:938-946,1213-1218`; `floorApplied` exists unused, `nutritionEngine.js:956`) | One ranked plain-register explanation |
| NU-8 | medium | Nutrition | Weekly **confidence computed, never shown** (persisted at `weeklyCoach.js:1303`; not destructured in CoachOutput `:1489-1509`) | One-line confidence caption under the Why block |
| OB-5 | medium | Onboarding | Prefilled body weight (80 kg) and age (30) validate untouched — plausible-looking targets computed on someone else's body (`ProOnboardingScreen.js:150-154,797-801`) | Prefills become placeholders; weight/age join sex as explicit-entry |
| OB-6 | medium | Onboarding | Article 9 wall has **no decline path or "what if I don't?"** affordance — hesitant users' only exit is killing the app (`Article9ConsentScreen.js:150-221`; copy itself is compliance-locked) | Add a "What if I don't agree?" line → sign-out/deletion |
| OB-7 | medium | Onboarding | Check-in **day-lock has no override** (travel/illness loses a whole cycle) while the weights gate has one (`WeeklyCheckInScreen.js:277-279` vs `:1226-1228`) | Allow a late check-in with the same "less accurate" framing |
| OB-8 | medium | Onboarding | "Log my weight first" CTA just does `goBack()` (`WeeklyCheckInScreen.js:1223-1225`) — label promises an action it doesn't perform | Deep-link to the weight logger |
| CL-6 | medium | Core loop | Rest timer doesn't survive process kill (snapshot omits `restTimerEndsAt`, `useAppStore.js:92-107,1311-1321`); "Log another set" commits instantly with carried-forward values (`:2143-2152`); Finish/X are sub-44pt top-corner targets (`:1639-1667`); weight stepper fixed 2.5 kg ignoring `exercise.incrementKg`, no hold-repeat, lb users get kg steps (`SetEntry.js:46-48`) | Persist restTimerEndsAt; make extra-set prepare-not-commit; grow hit targets; unit/increment-aware steps |
| NAV-5 | medium | Structure | Every tab press pops that tab's stack to root — returning mid-FoodSearch or mid-workout discards the user's place (`RootNavigator.js:241-246` ×5) | Pop only when the tab is already focused |
| NAV-6 | medium | Structure | Pro-locked Progress tiles carry no Pro marker (surprise gate), and four features (Partner, Progress photos, Meal names, Per-day targets) show **mismatched generic lock copy** (`AnalyticsScreen.js:522,526`; `ProGate.js:20-46`) | ProBadge on gated tiles; add the four benefit lines |
| NAV-7 | medium | Structure | Silent failures at committing moments: per-day offset save `.catch(() => {})` keeps optimistic UI the diary never uses (`PerDayTargetsScreen.js:67,73`); upgrade flow swallows OAuth poll-timeout and a failed `startCascade()` (`ProUpgradeScreen.js:138,196-200`) | Toast + revert; surface failures at the revenue moment |
| NU-9 / NAV-8 | low | Various | Water: 12 taps/day, fixed 250 ml, hardcoded 3.0 L target (`DiaryScreen.js:918,1099`); Suggested tab hides the search box (`FoodSearchScreen.js:819`); offset days get no day-type chip (`effectiveTargets.js:77-83`); VolumeHeatmap no loading state; EmptyState component orphaned (1 importer); VolumeHeatmap title differs per stack; quiz-first flow (dark) has stale copy + no back control | Per-item one-liners in the agent reports |

**Systemic root cause worth naming (NAV class):** all three broken navigations
are the same bug — bare `navigate('X')` to a route registered only in another
tab's stack, which React Navigation drops silently in production. A sweep of
every `navigate()` target against the registration table keeps the class
extinct (the agent diffed all of them; these three are the only live ones).

**Strengths to preserve (deliberate, verified):** 1-tap set logging with
prefill-from-actuals; keyboard-Done-logs-set; instant background draft flush;
wall-clock timers; per-mutation session snapshots and workout crash recovery;
the re-log stack (usuals/recents/copy-day); pre-derived fast check-in;
mandatory Undo on destructive food actions; the honest staged plan-build;
show-then-sell Diary gate; the personalised after-3-sessions Pro teaser;
calm no-shame gate copy throughout.

---

## 3. Top 10 highest-friction moments (ranked)

1. **A paying user taps their weekly coaching banner and nothing happens**
   (NAV-1) — the flagship feature's primary surfacing is a dead control.
2. **Rest ends and nothing happens** when the phone is locked or pocketed
   (CL-1/CL-2) — the core loop's heartbeat is inaudible exactly when users
   look away; iOS has no surface at all.
3. **The coach ignores what you just told it** — "Off target" never appears
   in "what was off" while the adjustment quietly reacts to it (NU-1) — the
   single biggest trust leak in the loop.
4. **The paid promise is 5–11 days away and nobody says so up front** (OB-4)
   — the trial's churn window, with the unlock date computed but unshown.
5. **The free-intent bait-and-switch** — a dead Welcome choice, then
   mandatory sex/weight/age collection inside a PRO-badged wizard the user
   never opted into (OB-1).
6. **Apply taps you can't read** — floor-clamped Applies that silently do
   nothing plus "next week" labels on indefinite writes (NU-3/NU-4) make the
   loop's one committing action its least legible.
7. **One tap, permanent diary** — carb cycle/refeed reshape every future day
   with no visible way back and quietly remove calorie banking (NU-2).
8. **The 1.8s auto-advance yank and the shape-shifting mid-scroll CTA**
   (CL-3/CL-4/CL-5) — the one-handed elevated-heart-rate bar is otherwise
   met, then broken at the moment of finishing an exercise.
9. **Deny the permission, lose your check-in day** (OB-2) — plus the wizard
   forgetting everything on process death (OB-3): two interruption failures
   inside the flow users are most likely interrupted in.
10. **"We'll take you there" promises that go nowhere** — the MealPlan
    targets redirect and the self-destroying Diary privacy prompt (NAV-2/3),
    plus surprise gates with the wrong sales pitch (NAV-6).
