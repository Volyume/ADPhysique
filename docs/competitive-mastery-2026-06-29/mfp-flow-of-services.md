# MFP Flow-of-Services Mastery — vs VOLYUME

**Date:** 2026-06-29
**Area:** End-to-end service flows — onboarding funnel, navigation, the daily loop, add-food variants, deeplinks, reminders, time-to-first-value.
**Goal:** Pinpoint, concretely, *why* MyFitnessPal's flow feels easier than VOLYUME's, and isolate the single highest-leverage SAFE simplification.

## Honest-source note (read first)

- **MFP evidence** is from the decompiled native APK corpus: `screens_components.txt` (1,303 component class names, read in full), `dex_strings_raw.txt` (1.49M lines, grepped), and `res_strings.xml`.
- **The MFP `AndroidManifest.xml` named in the brief is NOT present.** Every decoded `AndroidManifest.xml` under the scratchpad is `package="com.hevy"` (the Hevy app), and `mfp_decoded/` contains only `classes*.dex` — no manifest. So **intent-filters, launcher activity, and exported-screen declarations could not be read directly.** Deeplink hosts/routes below are recovered from `dex_strings_raw.txt` string constants instead, and tagged **INFERRED** where the manifest would have been the authority.
- MFP **screen counts and the exact step order of onboarding cannot be reconstructed tap-for-tap** from static class names + strings — I mark those **INFERRED** and say so. What IS confirmed is the *set* of steps (the SignUp step classes exist by name) and the *surfaces* that exist.
- **VOLYUME evidence** is the live source at `/home/user/ADPhysique` (App.js, RootNavigator, the screen files), read directly. Everything VOLYUME-side is **CONFIRMED** with file+line.
- Each claim is tagged **CONFIRMED** (artifact shows it directly) or **INFERRED** (assembled from indirect evidence).

---

## 1. MFP onboarding funnel, step-by-step

MFP registration is a single host activity (`SignUpActivity` / `SignUpViewModel`, `screens_components.txt:791-792`) driving a sequence of named "SignUpStep" view-models. The steps below are **CONFIRMED to exist** (each is its own class); the **order is INFERRED** from conventional MFP flow + the affirmation/question pairing in the class names.

| # | Step | Evidence (CONFIRMED class) | Skippable? |
|---|------|----------------------------|------------|
| 1 | Login/Signup carousel entrance (value-prop carousel + "Sign Up / Log In" buttons) | `LoginCarouselEntranceFragment`, `LoginSignInUpButtonsFragment` (`:785,789`) | — (entry) |
| 2 | Primary goal pick (Lose / Maintain / Gain weight, Gain muscle, Modify diet, Manage stress, Plan meals, Stay active) | `PrimaryGoalsSignUpStepViewModel` (`:758`); affirmation classes enumerate the 8+ goals (`:746-755`) | no |
| 3 | **Affirmation screen** (a reassurance/"you're in the right place" interstitial *per chosen goal*) | `…affirmation/first/LoseWeightAffirmationViewModel` etc. (`:746-755`) | auto |
| 4 | Secondary goal question (e.g. "why" / behaviour goals / meal-plan interest) | `…question/second/BehaviorGoalsViewModel`, `GoalQuestionsLoseWeightViewModel`, `MealPlanInterestViewModel` (`:759-763`) | no |
| 5 | Second affirmation | `…affirmation/second/BehaviorGoalsAffirmationViewModel` (`:756-757`) | auto |
| 6 | Sex / age / location | `SexAgeGeoSignUpViewModel` (`:765`) | no |
| 7 | Height / weight | `HeightWeightSignUpStepViewModel` (`:741`) | no |
| 8 | Goal weight + weekly pace | `WeightWeeklyGoalSignUpStepViewModel` (`:742`) | no |
| 9 | Activity level | `ActivityLevelSignUpStepViewModel` (`:740`) | no |
| 10 | Name | `UserNameSignUpStepViewModel` (`:743`) | no |
| 11 | Email + password (or SSO "almost done") | `SignUpEmailPasswordViewModel`, `SSOAlmostDoneViewModel` (`:766-767`) | no |
| 12 | GLP-1 medication usage (newer cohort) | `Glp1MedicationUsageViewModel` (`:764`) | likely conditional |
| 13 | **Congrats / post-signup** then drop into the app | `CongratsStepViewModel`, `FinishOnboardingActivity` (`:745,772`) | auto |

**Key onboarding characteristics (the "ease" signals):**
- **CONFIRMED** SSO present: `OAuthActivity`, `FacebookLoginActivity` (`:771,777`) and `Continue with Google/Apple`-style buttons (`LoginSignInUpButtonsFragment`) → account creation can be ~2 taps, no typing.
- **CONFIRMED** affirmation interstitials are baked in as first-class screens (steps 3 & 5) — MFP spends screens *reassuring*, which makes a long funnel feel supportive rather than like a form. (Note: VOLYUME's ED-safety stance means copy must stay adherence-neutral — see GATED tags in §5.)
- **INFERRED** total ≈ 11–13 screens, but most are single-tap pickers (goal, sex, activity = tap-a-card), so perceived friction is low.
- **CONFIRMED** there is a separate, *optional* Meal-Planning onboarding (40+ `Onboarding*Screen` classes, `:446-498`) — it is a **distinct, deferrable** funnel, not on the critical path to first food log.

---

## 2. MFP daily loop — tap count per add-food path

**Cold open → main screen.** MFP's launcher is `MainActivity` (`:370`), a bottom-tab host with a **persistent center "+" Add button** (`ic_bottom_nav_add_button`, CONFIRMED in dex strings) that opens `BottomNavigationBottomSheetDialogFragment` (`:154`). This "+" is reachable **from every tab**, including the Dashboard. That single fact is the spine of MFP's ease: the log action is always one tap away, regardless of where you are.

Tap counts below count discrete user taps from **cold open landing on Dashboard/Diary** to **food committed to the diary**. Tagged CONFIRMED where the surface + tab classes exist; the exact intermediate tap is INFERRED where it depends on a dialog vs inline control.

| Path | Tap sequence | Taps | Evidence |
|------|--------------|------|----------|
| **Re-log a recent/frequent** (the dominant daily action) | "+" → Add Food → land on search with **Recent/Frequent tab default** → tap the food (logs at remembered serving) | **3–4** | `TAB_RECENT_FOODS`, `TAB_FREQUENT_FOODS`, `DEFAULT_SEARCH_TAB` CONFIRMED; one-tap add INFERRED from `Food added` + `MultiAddFoodHelper` |
| **Multi-Add (batch)** several recents at once | "+" → Add Food → toggle several rows → "Add X items" | **4–6 for N foods** | `MULTI_ADD`, `Multi Add`, `providesMultiAddFoodHelperProvider`, `newBarcodeMultiAddFoodItemEditorIntent` — **CONFIRMED**. This logs *N foods in roughly the taps VOLYUME needs for one.* |
| **Text search** new food | "+" → Add Food → type query → tap result → adjust serving → confirm | **5–6** | `FoodSearchActivity`, `OnlineFoodSearchFragment`, `EditServingsDialogFragment` (`:807,823,296`) CONFIRMED |
| **Barcode scan** | "+" → Scan a Barcode → (auto-detect) → confirm serving | **3–4** | `BarcodeScanningActivity`, `BarcodeMatchActivity` (`:150,146`); deeplink `mfp://mfp/diary/add/barcode` CONFIRMED |
| **Quick Add (calories/macros only)** — *Premium* | "+" → Quick Add → enter kcal → save | **4** | `quick_add_calories`, `Quick Added Calories`, `Quick Add - Myfitnesspal Premium` — **CONFIRMED**, Premium-gated |
| **Voice Log** ("say what you ate") | "+" → Voice Log → speak → confirm results | **3–4** | `VoiceLoggingFragment`, `VoiceLoggingResultsViewModel` (`:923,937`) CONFIRMED |
| **Home-screen shortcut / widget** (skip app entirely) | long-press icon → "Scan barcode"/"Add food" → log | **2–3 incl. app cold start** | `ShortcutProxyActivity` (`:372`) + barcode deeplink — **CONFIRMED surface**, exact shortcut set INFERRED |
| **"Pre-log foods you eat on repeat"** (log a food across multiple future days) | from a food, tap the days you want | one-time setup, **0 taps/day after** | `"Pre-log foods you eat on repeat! Tap the days you want to log this food."` — **CONFIRMED** |

**Why the daily loop feels easy in MFP (CONFIRMED mechanisms):**
1. **Persistent center "+" on every tab** — log is never more than one tap from anywhere.
2. **Recent/Frequent is the default landing tab** — repeat eaters (the majority) tap-to-log without typing.
3. **Multi-Add** — a whole meal of repeats in ~5 taps total, not 5 taps *each*.
4. **Pre-log / scheduled logging** — recurring foods drop to **zero daily taps**.
5. **Off-app entry** — home-screen shortcuts + widget + barcode deeplink let users log without opening to the dashboard.

---

## 3. MFP nav / deeplink / reminders map

### Navigation (CONFIRMED surfaces; tab order INFERRED)
- Host: `MainActivity` (`:370`), bottom tab bar with center "+" Add button.
- Tabs (from `menu_*` strings + dashboard/diary/progress classes): **Dashboard** (`DashboardFragment` `:98`, `menu_dashboard`), **Diary** (`DiaryFragment` `:266`, `menu_diary`/`nav_diary`), **Plans/Meal-Planning** (`MealPlanningFragment` `:414`), **More menu** (`MoreMenuFragment` `:643`), plus **Progress** (`ProgressHubFragment` `:677`, `menu_progress`). Exact 5-slot arrangement INFERRED; the center slot is the "+" not a tab.
- The Dashboard itself surfaces a **logging-progress card** (`LoggingProgressCardViewModel` `:107`, `nutrition/ui/LoggingProgressFragment` `:1022`) — i.e. the home screen *shows today's calories/macros and links into logging*, so "see today" and "log" are co-located.

### Deeplinks (CONFIRMED scheme + routes from dex strings; manifest intent-filters NOT available → routing INFERRED)
Router: `DeepLinkRouterActivity` / `DeepLinkProxyActivity` (`:1223-1224`). Scheme **`mfp://`** (CONFIRMED). Routes recovered:
```
mfp://mfp/home
mfp://mfp/diary
mfp://mfp/diary/add/barcode      ← deeplink straight into barcode-add
mfp://mfp/barcode_scanner
mfp://mfp/learn
mfp://mfp/premium
mfp://myfitnesspal/recipe_parser
mfp://identity/callback
mfp://routine
```
Plus `TrustedDeepLinkDomainsQuery` (`:1087`) and HTTPS app-links on `app.myfitnesspal.com/...`, `myfitnesspal.com/...` (CONFIRMED hosts). **Takeaway:** MFP exposes a deeplink that lands the user *directly on barcode-add* — the shortest possible log path.

### Reminders / re-engagement (CONFIRMED)
- **Meal-time logging reminders exist**: `"Time to log a meal"` and `REACTIVATION_SCREEN_MEAL_REMINDERS` / `reactivation_screen_meal_reminders` — **CONFIRMED**. MFP actively pulls users back to *log food*.
- Reminder infra: `AddEditReminderActivity`, `RemindersActivity`, `SelectReminderTypeActivity`, `ReminderFrequencyDialogFragment` (`:835,844,845,864`) — user-configurable reminder types.
- Streak machinery: `StreakCelebrationActivity` / `StreakCelebrationViewModel` (`:881-883`) and `"Log a meal for 5+ days this week."` — **CONFIRMED**. MFP uses **streaks + weekly-habit nudges** as the re-engagement engine.
- Notification inbox: `NotificationInboxFragment` (`:651`); Braze/proactive messaging channels CONFIRMED in strings.

---

## 4. VOLYUME equivalent flows — tap counts + file refs (all CONFIRMED, live source)

### Navigation structure
- React Navigation **bottom tab navigator**, `createBottomTabNavigator` — `src/navigation/RootNavigator.js:3,110`.
- **5 tabs, in order:** `HomeTab` ("Train", icon `home`), `PlansTab` ("Plans", `list`), `DiaryTab` ("Diary", `restaurant`), `ProgressTab` ("Progress", `stats-chart`), `ProfileTab` ("You", `person`) — `RootNavigator.js:459-463`, icons `:449-455`. **No center "+" / FAB.**
- Cold-launch gate: `firstRunComplete` / `firstRunChecked` (and tier) route to `FirstRunStack` vs `ProOnboardingStack` vs `MainTabs` — `RootNavigator.js:612-637`, `App.js:394-417`.
- **Home/Train tab does NOT surface any food entry point** — `HomeScreen.js` renders TodayStrip, energy/weight, coach line/banner, pre-workout brief (`HomeScreen.js:17,79,159-182`); a grep for Diary/FoodSearch links finds only background data migration, **no navigation to food** (`HomeScreen.js` — CONFIRMED). To log food you must first switch to the Diary tab.

### Onboarding funnels (CONFIRMED)
- **Free path:** `FirstRunScreen` (name + units) → `navigation.navigate('FreeStarter')` micro-quiz → `completeFirstRun()` → lands on **PlansTab → PlanLibrary** (`FirstRunScreen.js:36-38`, `FreeStarterScreen.js:86,100,115-117`). ~2 short screens. **Free users never reach a food-logging surface in onboarding** (diary is Pro).
- **Pro path:** `ProOnboardingStack` → `ProOnboardingScreen` (multi-step goal/biometrics wizard) → `navigation.replace('ProSetupComplete')` (`ProOnboardingScreen.js:760,772`), with `ProGoalSetupScreen` for nutrition targets. Longer; ends at a setup-complete screen, not on the diary.

### Daily loop — log a food (CONFIRMED tap counts)
Post-merge "food-ease" work is live. From **cold open** (lands on Home/Train tab):

| Path | Tap sequence | Taps | File refs |
|------|--------------|------|-----------|
| **Re-log a recent/favourite/frequent** (best case) | tap **Diary tab** → tap meal-slot **"Add food"** → land on FoodSearch (default tab `recents`) → tap the row = **one-tap re-log at remembered portion**, then auto `goBack()` | **3** | `RootNavigator.js:461`; `DiaryScreen.js:361-364,808`; `FoodSearchScreen.js:80,311-352,618,623` (`quickLogRelog`, `RELOG_TABS`, undo toast) |
| **Quick Add (kcal/macros)** | Diary tab → meal-slot **"Quick add"** → enter kcal → save (in-place sheet, **zero navigation**) | **3 + entry** | `DiaryScreen.js:372-385,809,882-885` (`QuickAddSheet`, `confirmQuickAdd`) |
| **Text search** new food | Diary tab → "Add food" → type → tap result → serving picker (`FoodDetailSheet`/`ServingPicker`) → confirm | **5–6** | `DiaryScreen.js:364`; `FoodSearchScreen.js:623` (`openPicker`); `src/components/food/FoodDetailSheet.js`, `ServingPicker.js` |
| **Barcode scan** | Diary tab → "Add food" → Scan → confirm | **4–5** | `DiaryStack` `ScanBarcode`/`ScanLabel` (`RootNavigator.js:256-265`) |
| **My Meals / My Recipes** | Diary tab → "Add food" → My Meals/Recipes → pick | **4–5** | `MyMealsScreen.js`, `MyRecipesScreen.js`; `DiaryStack` `:281-286` |

**Note the floor:** VOLYUME's *best-case* daily loop is **3 taps** and matches MFP's re-log mechanic closely (one-tap row at remembered portion + Undo). The food-ease merge already closed most of the *per-action* gap. The remaining gap is **structural** (where the log action lives), not per-tap.

### Deeplinks (CONFIRMED)
- Scheme **`volyume://`** declared in `app.json:11` (+ `app.json:90`), and an `https` app-link block (`app.json:103`). **No per-route food/diary deeplinks** found wired into the navigator (no `mfp://…/diary/add/barcode` equivalent). So there is **no off-app shortcut into logging** — CONFIRMED absence.

### Reminders (CONFIRMED — and deliberately different)
- VOLYUME schedules **morning-weight**, **weekly check-in**, and **training reminders** only — `NotificationSettingsScreen.js:9-20,46-87` (`scheduleMorningWeightNotification`, `scheduleCheckinReminder`, `scheduleTrainingReminders`).
- **There are NO meal-time food-logging reminders, no streaks, no "you haven't logged" nudges.** This is the intentional ED-safety / adherence-neutral / no-guilt design. **GATED** — must not be "fixed" by copying MFP.

### Time-to-first-value
- A **free** VOLYUME user **cannot log food at all** — the Diary tab root is `GatedDiary = withProGuard(DiaryScreen, 'Food diary')`, and FoodSearch/MealPlan/custom-food are each `withProGuard` (`RootNavigator.js:156-170`). Free TTFV for *food* = ∞ (paywall). Free TTFV for *training* = end of the ~2-screen FreeStarter quiz → PlanLibrary.
- A **Pro** user reaches first food log after the longer ProOnboarding wizard, then a 3-tab-switch + 3-tap loop. MFP's equivalent puts a logging-progress card and "+" on the landing screen immediately.

---

## 5. Gaps where MFP's flow is easier — ranked

Ranked by leverage on the founder's complaint ("ours doesn't feel as easy"). Each tagged **[SAFE-TO-BUILD]** (no constraint conflict) or **[GATED]** (collides with ED-safety / no-streak / Free-vs-Pro / deterministic-coaching — do not build without founder decision).

1. **The log action is not present where the user lands. [SAFE-TO-BUILD]**
   MFP: persistent center "+" on every tab incl. dashboard, plus a logging-progress card on the home screen. VOLYUME: Home/Train tab has **no food entry point** (`HomeScreen.js`, CONFIRMED); user must switch to the Diary tab first — that tab-switch is a "wasted" tap and a discoverability tax on every single daily loop. **This is the single biggest structural ease gap.** (Pro-only surface, so any Home affordance must be tier-aware — but adding a Pro-gated quick-log entry to Home is allowed by gating rules.)

2. **No batch/Multi-Add. [SAFE-TO-BUILD]**
   MFP logs N repeat foods in ~5 taps total (`MultiAddFoodHelper`, CONFIRMED). VOLYUME logs each food in its own 3-tap loop → an N-item breakfast is 3×N taps. A multi-select "add these" on the recents tab would be adherence-*neutral* (it's pure mechanics, no nudging).

3. **No off-app / deeplink shortcut into logging. [SAFE-TO-BUILD]**
   MFP: `mfp://mfp/diary/add/barcode`, home-screen `ShortcutProxyActivity`, widget (CONFIRMED). VOLYUME has a `volyume://` scheme but no diary-add route and no quick-log shortcut (CONFIRMED). An OS-level "log food" shortcut/quick-action would cut the cold-open path. (Offline-first compatible; no PII.)

4. **No scheduled / recurring-food logging. [SAFE-TO-BUILD, with care]**
   MFP "Pre-log foods you eat on repeat" drops recurring foods to **0 daily taps** (CONFIRMED). This is a genuine ease win and is *not* a streak — it's a convenience. SAFE provided it never becomes an adherence pressure ("you pre-logged, now eat it") — copy must stay neutral.

5. **Dashboard co-locates "see today" + "log". [SAFE-TO-BUILD]**
   MFP's Dashboard shows the logging-progress card *and* is one "+" from logging. VOLYUME splits "see today" (would be Diary) from the landing screen (Train). A compact today-nutrition glance + log entry on Home (Pro) closes this.

6. **Faster account creation via SSO on the very first screen. [SAFE-TO-BUILD]**
   MFP offers Google/Facebook/Apple at the carousel entrance (CONFIRMED). (VOLYUME's auth path not audited here — verify before assuming a gap.)

7. **Meal-time logging reminders that pull users back to log. [GATED]**
   MFP: `"Time to log a meal"`, reactivation meal reminders (CONFIRMED). VOLYUME deliberately has none. **Do NOT build** — collides head-on with ED-safety / adherence-neutral / no-guilt. Founder decision required even to discuss.

8. **Streaks / "log 5+ days this week" habit nudges. [GATED]**
   MFP: `StreakCelebrationActivity`, weekly-habit nudges (CONFIRMED). **Forbidden** by VOLYUME's no-streak/no-guilt mandate. Do not build.

9. **Affirmation interstitials in onboarding. [GATED]**
   MFP reassures per-goal (CONFIRMED). VOLYUME *could* add supportive interstitials, but any goal/weight-loss affirmation copy must clear ED-safety review (no rate/target celebration, no weight-loss cheerleading). Founder/wellbeing decision required.

10. **Free users can't log food at all. [GATED — by design]**
    Food diary is Pro (`proGate`, CONFIRMED). This is a deliberate Free-vs-Pro decision, not a bug. Listed only so it isn't mistaken for a flow defect: it caps free-tier TTFV-for-food at the paywall by intent.

---

## 6. Single highest-leverage SAFE flow simplification

**Add a Pro-gated quick-log entry point to the Home/Train tab so the daily loop drops from 3 taps to 2 and no longer requires finding the Diary tab.**

- **Why this one:** Gap #1 is the only one that taxes *every* daily loop and is the difference the founder is feeling — MFP's "+" is always under the thumb; VOLYUME hides logging one tab away behind an icon (`restaurant`) a user has to learn. The food-ease merge already made the *per-tap* log cheap (one-tap re-log, CONFIRMED `FoodSearchScreen.js:311-352`); what's left is the *navigation* cost of getting there. Surfacing a "Log food" affordance (or a compact recents row) on Home for Pro users removes the tab-hunt and co-locates see-today with log — exactly MFP's dashboard pattern — using the existing `quickLogRelog` / `QuickAddSheet` plumbing.
- **Concretely:** a Pro-gated Home card showing today's top recents → tapping a row reuses `FoodSearchScreen.quickLogRelog` (or routes to `FoodSearch` with `initialTab: 'recents'`, already a supported param — `DiaryScreen.js:728`). New loop: **Home → tap recent = 2 taps**, vs 3 today, vs MFP's 3–4.
- **Constraint check:** SAFE. Tier-aware (Pro-only, respects gating); no streaks/guilt/reminders (it's a passive surface, not a nudge); offline-first (reads local recents); no PII; no coaching-engine or billing changes. It reuses merged, tested mechanics rather than introducing new logging logic.
- **Adversarial-review note:** verify the Home card is hidden for free users (gating), and that one-tap from Home preserves the Undo toast + 1–5000 g safety bound that `quickLogRelog` already enforces (`FoodSearchScreen.js:317-318,339-344`).

---

### Confidence summary
- **VOLYUME side: fully CONFIRMED** from live source (tabs, gating, 3-tap loop, food-ease, reminders, deeplink scheme, onboarding wiring).
- **MFP side: surfaces and mechanisms CONFIRMED** from decompiled classes + dex strings (center "+", Recent/Frequent default, Multi-Add, Quick Add, Voice Log, barcode deeplink, meal reminders, streaks, pre-log). **Exact onboarding step ORDER and per-path intermediate taps are INFERRED** — the MFP `AndroidManifest.xml` was not in the corpus (only Hevy's was), so intent-filter/launcher authority is missing and is flagged throughout.
