# CAMPAIGN 3 — PHASE 1: LIVE SETTINGS INVENTORY

**Built:** 2026-08-10
**Tree audited:** branch `claude/campaign3-discoverability`, working tree at
`4fa57339` (= main `9aae57cb` + the Campaign 3 coordination-doc commit; no
source file differs from `9aae57cb`).
**Authority:** founder Campaign 3 order, PHASE 1 and CORE PRODUCT LAW.
**Method:** every row below was re-verified against current main. The product
map (`docs/_FULL-APP-PRODUCT-MAP.md` CHAPTER B2 §A, from line 8956) was used
ONLY as a checklist seed; every claim here carries a `file:line` from the
current tree, and every control was traced to the call that actually persists
(`setItem` / `setPreference` / `saveLocalProfile` / `saveUserBodyProfile` /
`savePerDayOffsets` / `setGoalLockAdvanced`). Where the map and the code
disagree, the code wins and the difference is recorded in **§ DELTA vs THE
PRODUCT MAP**.

---

## 0. HOW TO READ THIS

**Column set (identical in every table):**

`name | label (verbatim) | stored key/field | type | default | values |
canonical editor (screen+line) | other exposing surfaces | what it changes |
local/synced | tier/platform | safety/privacy | discoverable today? | class |
writer issues`

**Class (from the order's CORE PRODUCT LAW).** The class is the *correct*
classification for the control, not a description of today's placement.
`discoverable today?` answers today's placement separately.

- **A** ALWAYS DISCOVERABLE — user may reasonably seek it at any time.
- **B** CONTEXTUALLY DISCOVERABLE — best surfaced where it becomes relevant.
- **C** ADVANCED BUT REACHABLE — may sit behind an advanced/details
  affordance, but a logical path must exist.
- **D** STATE-GATED BY DESIGN — must not appear until the state occurs.
- **E** INTERNAL — no user entry point should exist.
- **F** LEGACY / UNREACHABLE — must not be resurrected because code exists.
- **G** UNCLEAR PRODUCT INTENT — escalate, do not invent an entry point.

**local/synced.** Governed by two facts verified in current main:
1. `shouldSyncPref` (`src/lib/sync.js:1362-1365`) returns true for **every**
   AsyncStorage key starting `@volyume_` that does not match
   `PREF_EXCLUDE_PATTERNS` (`src/lib/sync.js:1301-1360`). Sync is
   allow-by-prefix, i.e. **fail-open**; the interesting cases are the
   exclusions. A key WITHOUT the `@volyume_` prefix never syncs at all
   (`sync.js:1363`) — this catches `photo_prompt_optout` and
   `progressShareConfirmed`.
2. Registry-synced SQLite tables carry their own rows: `nutrition_targets`,
   `notification_preferences`, `perday_target_offsets`
   (`src/lib/sync/registry.js`), and profile fields ride the per-field merge
   in `src/lib/sync/tables/profiles.js`.

**Excluded from the inventory by the order** ("do not count internal
constants as user settings"): module constants, seed/version flags, sync
cursors and watermarks, caches, drafts, and one-shot "seen" flags. Seen
flags are listed in **§ APPENDIX — SEEN FLAGS** because Phase 11 needs them.

**Cardio.** `Cardio logging` (Settings > Coaching) is an existing LIVE
setting and is therefore inventoried for completeness. Per the campaign
bounds no cardio behaviour, route, copy or entry point is proposed,
changed, or recommended anywhere in this document.

---

## 1. WHERE SETTINGS LIVE (current main)

`src/screens/SettingsScreen.js` is a pure row-list hub (148 lines, no
controls of its own). Rows, verified `SettingsScreen.js:30-144`:

| Row label (verbatim) | Destination | Visibility | Line |
| --- | --- | --- | --- |
| Account | `SettingsAccount` | always | :32 |
| Profile | `SettingsProfile` | always | :38 |
| Coaching | `SettingsCoaching` | always | :44 |
| Workout & units | `SettingsWorkout` | always | :55 |
| Nutrition targets | `NutritionTargets` | `tier === 'pro'` | :62 |
| Per-day targets | `PerDayTargets` | `tier === 'pro'` | :74 |
| Dietary needs | `SettingsDietary` | `tier === 'pro'` | :82 |
| Notifications and reminders | `NotificationSettings` | always | :89 |
| Coaching reminders | `CoachingReminders` | `tier === 'pro'` | :96 |
| Display and accessibility | `SettingsDisplay` | always | :103 |
| Home screen widget | alert only (instructions) | always | :109 |
| (health provider) | `SettingsHealth` | `isHealthAvailable()` | :119-126 |
| Your data | `SettingsData` | always | :129 |
| Privacy and legal | `SettingsPrivacy` | always | :135 |
| Help and about | `SettingsAbout` | always | :141 |

`isHealthAvailable()` is **permanently false**: both native module getters
return `null` unconditionally (`src/lib/health.js:109-110`, comment at
`:100-107`, founder removal 2026-06-30). The health row and the whole of
`SettingsHealthScreen.js` are therefore class **F**.

Settings that live OUTSIDE the Settings tree (each row-linked below):
diary (water target, calorie banking), meal plan (meals/day, variety,
dietary sheet), progress-photo capture sheet (camera facing, timer),
exercise/volume/weight charts (window + metric), active workout (per-side
logging), volume heatmap (manual MEV/MAV/MRV), Plans tab (block-advice
snooze), Coach tab (goal lock, wellbeing check, goal & programme setup),
athlete profile (avatar), Consistency (weekly session goal, pause).

---

## 2. INVENTORY

### 2.1 Account and plan — `src/screens/SettingsAccountScreen.js`

| name | label (verbatim) | stored key/field | type | default | values | canonical editor | other surfaces | what it changes | local/synced | tier/platform | safety/privacy | discoverable today? | class | writer issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Local tier override | `Switch to Free` | `@volyume_tier` (`useAppStore.js:17`, writer `:766`) | Destructive action + two-step alert | tier from server | `'free'` (one-way from this control) | `SettingsAccountScreen.js:45-59` | none | Engine: none (guardrails are tier-blind, `proGate.js`). UI: every `withProGuard` route locks | Device-local write; the SERVER tier is untouched, `refreshTierFromCloud` restores Pro | Pro only (row hidden for Free, `:42`) | none | Yes | A | None. Copy at `:49` is honest about consequence |
| Subscription | `Subscription` | n/a | Nav | n/a | n/a | `SettingsAccountScreen.js:30` | `SubscriptionScreen.js:141` | Opens plan/billing/restore | n/a | always | none | Yes | A | none |
| Upgrade route | `Go Pro` | n/a | Nav | n/a | n/a | `SettingsAccountScreen.js:37` (`tier !== 'pro'`) | `YouScreen.js:425` coach pitch card | Opens `ProUpgrade` with `source: 'settings_account'` | n/a | Free only | none | Yes | A | none |
| Sign out | `Sign out` | n/a | Destructive action | n/a | n/a | `SettingsAccountScreen.js:69` | none | Push-first sync then local wipe | n/a | always | Aborts if the push cannot be proven landed | Yes | A | none |
| Delete account | `Delete account` | n/a | Destructive action | n/a | n/a | `SettingsAccountScreen.js:76` | `SettingsPrivacyScreen.js:163` (withdraw-consent variant) | Server delete + local wipe | server | always | Article 9 | Yes | A | Two rows can start the same deletion pipeline; both are intentional and clearly labelled (consent withdrawal legally must delete) |
| Restore purchases | `Restore purchases` | n/a | Action | n/a | n/a | `SubscriptionScreen.js:192` | none | Re-reads store entitlement | server | always | none | Yes | A | none |
| Cancel subscription | `Cancel subscription` | n/a | Action (store deep link) | n/a | n/a | `SubscriptionScreen.js:200` | none | Opens the store's manage page | n/a | Pro | none | Yes | A | none |

### 2.2 Profile and body — `src/screens/SettingsProfileScreen.js`

| name | label (verbatim) | stored key/field | type | default | values | canonical editor | other surfaces | what it changes | local/synced | tier/platform | safety/privacy | discoverable today? | class | writer issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| First name | (placeholder) `Your first name` | `userProfile.firstName` | Text, save on blur | onboarding | free text, trimmed | `SettingsProfileScreen.js:193-210` | none | UI: greetings, Home welcome, share-card author line | SYNCED `users_profile.first_name` (`sync/tables/profiles.js` FIELD_MAP) | always | none | Yes | A | none |
| Biological sex | `Biological sex` | `userProfile.sex` **and** `user_body_profile.sex` | Radio, 2, confirm dialog | onboarding value, never a silent default | `male` \| `female` | `SettingsProfileScreen.js:223-243`, writer `changeSex` `:161-174` | **`NutritionTargetsScreen.js:737-741` renders a `Sex` picker that does NOT write back** (see writer issues) | Engine: BMR branch, **ED calorie floor 1500 M / 1200 F**, FFM floor sex term. UI: cycle-tracking row appears only for `female` (`SettingsCoachingScreen.js:278`) | SYNCED (`users_profile.sex`) + local SQLite body profile | always | **ED-SAFETY CRITICAL.** Targets are NOT recomputed on save; the dialog says so (`:181`) | Yes | A | **DUPLICATE-LOOKING WRITER (defect).** `NutritionTargetsScreen` prefills `sex` from `user_body_profile` (`:378`) and feeds it to `calculateNutritionTargets` (`:480`) but `handleCalculate` never writes it back (`:429-545` contains no `saveUserBodyProfile`/`saveLocalProfile` for sex). A Pro user who flips the chip there gets targets built on one sex while every floor/gate keeps reading the other. |
| Height | `Height` | `userProfile.heightCm` + `user_body_profile.height_cm` | Numeric ft+in, save on blur | onboarding | 100–250 cm after conversion (`:27-28`) | `SettingsProfileScreen.js:251-262`, writer `saveHeight` `:109-129` | `NutritionTargetsScreen.js:751-758` (read-only in effect — same non-write-back defect) | Engine: BMR / TDEE / calorie + FFM floors | body-profile row local; `heightCm` also rides the profile blob into `user_prefs` | always | Out-of-range refused with a calm toast (`:118-121`) | Yes | A | Same non-write-back defect as sex, for height |
| Date of birth | `Date of birth` | `user_body_profile.date_of_birth` (via `dateOfBirthFromAgeYears`), `userProfile.age` | Numeric years, save on blur | onboarding | 13–100 (`:29-30`) | `SettingsProfileScreen.js:270-274`, writer `saveAge` `:135-154` | `NutritionTargetsScreen.js:746-748` (same non-write-back defect) | Engine: BMR age term | as above | always | Out-of-range refused (`:142-145`) | Yes | A | Same non-write-back defect, for age |
| Diet preference | `Diet preference` | `userProfile.dietPreference` | Radio, **3 options** | `omnivore` | `omnivore` \| `vegetarian` \| `vegan` (`SettingsProfileScreen.js:32-36`) | `SettingsProfileScreen.js:282-302` | **`DietaryPreferencesEditor.js:94-114` (Settings > Dietary needs AND the meal-plan sheet) offers 4 options** | Engine: filters curated meal library + plan generator (`food/planPreferences.js`) | SYNCED `users_profile.diet_preference` | Profile row always; Dietary needs is Pro | none | Yes | A | **VALUE-SET MISMATCH (defect).** `DIETS` is `['omnivore','pescatarian','vegetarian','vegan']` (`src/lib/food/curatedMeals.js:41`) and `DietaryPreferencesEditor` renders all four (`:22`). `SettingsProfileScreen` renders only three. A user on `pescatarian` sees NO chip selected in Settings > Profile, and any tap there silently downgrades their diet. Two independent writers of one field with different domains. |
| Avatar | (sheet) `Choose profile photo` / preset grid | `userProfile.avatarUri` or `userProfile.avatarPreset` | Photo picker or preset grid | none | any image, or an `AVATAR_PRESETS` key | `AthleteProfileScreen.js:341-372, 624-670` (Coach tab > Athlete profile) | none | UI: avatar mark across Coach/You | Not in the profiles FIELD_MAP; rides the profile blob into `user_prefs` (the image file is device-local) | always | none | Only from the Coach tab profile card | B | Not exposed anywhere in Settings > Profile, which is where "profile picture" is normally sought |

### 2.3 Coaching — `src/screens/SettingsCoachingScreen.js`

| name | label (verbatim) | stored key/field | type | default | values | canonical editor | other surfaces | what it changes | local/synced | tier/platform | safety/privacy | discoverable today? | class | writer issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Calm mode | `Calmer coaching` | `@volyume_wellbeing_mode` (`lib/wellbeing.js:13`) | Switch | off (`'unspecified'` reads as normal) | `'calm'` \| `'normal'` | `SettingsCoachingScreen.js:127`, writer `toggleCalmMode` `:73-78` | First-run ask; read fail-closed by `NutritionTargetsScreen.js:304-313` and others | Engine: forces confirm-first on every adjustment regardless of autonomy; suppresses weight/food-adjacent surfaces; withholds the before/after progress card | SYNCED, and **guarded**: `isGuardedPref` + `notePrefWrite` ratchet so a stale device can never turn calm OFF (`sync.js:1385-1391`, `wellbeing.js:33-38`) | always (tier-blind) | **ED-SAFETY.** Never gate or remove | Yes | A | none |
| Session readiness ask | `Session readiness check` | `@volyume_intent_prompt_off` (stored INVERTED — present = OFF) | Switch | ON (asking is the default) | on/off | `SettingsCoachingScreen.js:141`, writer `:92-99` | **Second writer, off-only: `HomeScreen.js:2231-2247` "Don't ask before each session"** | Engine: with it off there is no readiness input, so session adjustments never fire (`:86-90`) | SYNCED (key not excluded) | Free copy differs from Pro copy (`:148-151`) — the readiness *adjustment* is Pro | Turning it off silences a real input to session easing | Yes | A | **Second writer is INTENTIONAL and equivalent** (one-way off, and its own copy at `HomeScreen.js:2245-2246` points back at the canonical editor). Row copy `Off. Sessions start straight away.` (`:151`) still does not say adjustments stop — a label-vs-effect gap for Phase 20. |
| Cardio logging | `Cardio logging` | `userProfile.cardioEnabled` | Switch | ON (`undefined` reads as on, `:33`) | on/off | `SettingsCoachingScreen.js:166`, writer `:174-177` | `YouScreen.js:494-501` hides the "Log cardio" row when off | UI: hides cardio surfaces; logged history is kept, not deleted (`:31-33`) | No dedicated column; rides the profile blob into `user_prefs` | `tier === 'pro'` (`:162`) | none | Yes | A | none. **Out of scope for Campaign 3 changes** (cardio bound) |
| Coaching tone | `Coaching tone` | `userProfile.coachTone` | Radio, 3 chips | `automatic` (`:38`) | `automatic` \| `supportive` \| `precise` | `SettingsCoachingScreen.js:187-215`, writer `setTone` `:49-55` | none | Engine: **none.** Prose register only; safety copy identical in every tone (`:183-185`) | LOCAL-ONLY profile field (no synced column, `:35-37`) — but it DOES ride `@volyume_user_profile_<uid>` into `user_prefs`, so "local-only" means "no dedicated column", not "never leaves the device" | `tier === 'pro'` | none | Yes | A | Sync framing in the source comment is imprecise (see § WRITER ISSUES #7) |
| Autonomy | `Autonomy` | `userProfile.coachAutonomy` | Radio, 3 chips | `collaborative` (`:47`) | `coached` \| `collaborative` \| `manual` | `SettingsCoachingScreen.js:224-255`, writer `setAutonomy` `:57-63` | none | Engine: governs WHO confirms an adjustment. **A safety hold always forces confirm-first whatever the mode** (D16) — and since D93 the Coached sub-copy says so out loud (`:230`) | LOCAL-ONLY profile field (same caveat as tone) | `tier === 'pro'` | Coached is never a promise to bypass a hold | Yes, but buried below Cardio logging + tone in a scrolling card | A | none |
| Show the science | `Show the science` | `userProfile.showScience` | Switch | OFF (`:39`) | on/off | `SettingsCoachingScreen.js:262`, writer `toggleScience` `:65-71` | none | UI: adds the technical term in brackets after the plain one on coaching explanations | LOCAL-ONLY profile field (same caveat) | `tier === 'pro'` | none | Yes | C | none |
| Cycle tracking | `Cycle tracking` | `@volyume_cycle_tracking` (`lib/cyclePrefs.js:18`) | Switch | OFF (`cyclePrefs.js:20-26`) | `'true'` \| `'false'` | `SettingsCoachingScreen.js:281`, writer `toggleCycleTracking` `:80-84` | none | Engine: adds an optional weekly check-in question; the coach reads `cycle_override` to HOLD weight-based changes | **NOT SYNCED — explicitly excluded** as Article 9 special-category data (`sync.js:1349`) | Visible only when `getUserBodyProfile(user).sex === 'female'` (`:107`, `:278`) | **Article 9.** Opt-in, defaults off on every device | Yes, when sex is female | D | none |

### 2.4 Workout, units and training controls

| name | label (verbatim) | stored key/field | type | default | values | canonical editor | other surfaces | what it changes | local/synced | tier/platform | safety/privacy | discoverable today? | class | writer issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Body weight unit | `Body weight unit` | `bodyWeightUnits` store field + `userProfile.bodyWeightUnits` | Radio, 3 chips | `st` (`useAppStore.js:1774`) | `st` \| `kg` \| `lbs` (`SettingsWorkoutScreen.js:17-21`) | `SettingsWorkoutScreen.js:98-118`, writer `setBodyWeightUnits` `useAppStore.js:1775-1788` | none | **Display and input only.** Internal storage stays kg | SYNCED via the profile blob + `PROFILE_FIELDS_TRACKED` | always | none | Yes | A | The dedicated column is stamped through `_stampProfileFields(['bodyWeightUnits'])` but `bodyWeightUnits` is **not** in `sync/tables/profiles.js` FIELD_MAP — it therefore reaches the cloud only as part of the `@volyume_user_profile_<uid>` blob, not as a column |
| Gym weight unit | (no control) | `units` store field | — | `'kg'`, coerced | `'kg'` only (`useAppStore.js:1759-1760`) | **none** | none | n/a | SYNCED | always | none | No, by design (UK kg-only) | E | Setter exists, no UI. Intentional per the source comment `:1755-1758` |
| Bar weight | (no control) | `barWeight` store field | — | 20 | numeric | **none** — row removed at founder request (`SettingsProfileScreen.js:212-216`) | none | Plate calculator | SYNCED (column + stamped) | always | none | No | F | Writer `setBarWeight` (`useAppStore.js:1889-1900`) has no UI caller. Record for Campaign 4, do not resurrect |
| Default rest timer | `Default rest timer` | `@volyume_workout_prefs.defaultRestSeconds` | Stepper | 90 s (`useAppStore.js:1658`) | 30–600 s, step 15, clamped in the setter (`:1701`) | `SettingsWorkoutScreen.js:124-141` | none | Fallback rest when a routine exercise has no per-exercise rest | SYNCED (key not excluded) | always | none | Yes | A | none |
| Auto-start rest timer | `Auto-start rest timer` | same blob | Switch | ON (`:1659`) | on/off | `SettingsWorkoutScreen.js:146-156` | none | Rest countdown starts on logging a set | SYNCED | always | none | Yes | A | none |
| Rest finished alert | `Rest finished alert` | same blob | Switch | ON (`:1660`) | on/off | `SettingsWorkoutScreen.js:164-174`, writer `setRestEndAlertEnabled` `useAppStore.js:1709-1727` | none | Lock-screen sound/vibrate at rest end; **in-app cues unaffected** (row copy `:165`). Acts mid-rest: off cancels the pending alert, on reschedules | SYNCED | always | none | Yes | A | none |
| Exact alarm access | `Make rest alerts exact` | OS special access (no app key) | Nav to a SYSTEM screen | granted assumed → row hidden | OS grant | `SettingsWorkoutScreen.js:183-186` | none | Rest alert fires to the second instead of batched | OS state, device-only | **Android only**, AND `restEndAlertEnabled`, AND `!exactAlarmsGranted` (`:180`) | none | Only when all three conditions hold | D | none. Correctly state-gated |
| Per-side (unilateral) logging, per exercise | (in-workout prompt) | `@volyume_unilateral_exercises` (`lib/unilateral.js:46`), plus `@volyume_unilateral_asked_exercises` (`:47`) so the suggestion never re-fires | Per-exercise opt-in, one-time prompt | OFF (empty set) | set of exercise ids | Active-workout one-time prompt (`ActiveWorkoutScreen.js`, walkthrough flag `:3167`) | none | Engine: the rep count becomes the **LOWER** of the two sides (`unilateral.js:53-62`) | SYNCED | always | Changes what the engine sees; no central list to review or undo | Barely — one-time prompt only | C | **NO REVIEW/UNDO SURFACE.** `setUnilateralExercise(id, false)` exists (`unilateral.js:94-105`) but the "asked" flag stops the prompt returning, so once accepted there is no reachable way to turn it off for an exercise. Reader-with-no-reachable-off-writer. |
| Manual volume targets (MEV/MAV/MRV) | (in-screen editor) `Volume targets saved` toast | `@volyume_landmarks_<userId>` | Per-muscle numeric editor + Reset | research defaults (`VOLUME_LANDMARKS`) | integer sets/week per muscle, per landmark | `VolumeHeatmapScreen.js:246-317` (Progress > Volume heatmap) | none | Engine: overrides the adaptive landmark table for edited muscles only (`effectiveLandmarks.js:107`) | SYNCED **and guarded** (`sync.js:1386`); pushed immediately via `syncUserPref` and stamped with `notePrefWrite` (`:270-284`) | always | Only edited muscles are stored (`:246-263`) so untouched defaults do not disable the adaptive ledger | Only inside the volume heatmap | C | none |
| Block advice snooze | (implicit action) | `@volyume_block_snooze` (`PlansScreen.js:40`) | Action | not snoozed | epoch ms (+7 days) | `PlansScreen.js:344-348` | Cleared by restart-plan (`:330`) | UI: suppresses the block-advice card until the timestamp passes | SYNCED | always | none | Only from the card itself | D | none |

### 2.5 Nutrition targets and diary

| name | label (verbatim) | stored key/field | type | default | values | canonical editor | other surfaces | what it changes | local/synced | tier/platform | safety/privacy | discoverable today? | class | writer issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sex (targets form) | `Sex` | **not persisted from this screen** | Pill group | prefilled from `user_body_profile` (`:378`) | `male` \| `female` | `NutritionTargetsScreen.js:737-741` | canonical editor is Settings > Profile | Feeds `calculateNutritionTargets` only | n/a (transient) | `tier === 'pro'` | **ED-adjacent**: chooses the calorie-floor branch used for the *displayed* targets while the engine's stored sex is unchanged | Yes | **G** | **DEFECT — displayed but not writable.** See § WRITER ISSUES #1 |
| Age (targets form) | `Age` | not persisted | Numeric | prefilled from DOB (`:384`) | 13–100 | `NutritionTargetsScreen.js:746-748` | Settings > Profile | as above | n/a | Pro | BMR age term | Yes | **G** | Same defect |
| Height (targets form) | `Height` | not persisted | ft+in | prefilled (`:379-383`) | — | `NutritionTargetsScreen.js:751-758` | Settings > Profile | as above | n/a | Pro | BMR | Yes | **G** | Same defect |
| Current weight | `Current weight (kg)` | `body_metric_log` row + `@volyume_body_metrics_<uid>` | Numeric | latest morning weight (`:391-393`) | validated by `isValidBodyWeightKg` (`:456`) | `NutritionTargetsScreen.js:761-772`; auto-seeds today's metric `:517-538` | Body metrics screen is the primary log | Engine: BMR, FFM floor, rapid-loss gate | SQLite log syncs; AsyncStorage mirror syncs | Pro | Out-of-range refused (`:456-459`) | Yes | A | Writes a *body-metric log entry*, only when today has none (`:524`); it is not a "setting" write |
| Body fat estimate | `Body fat estimate %` | `body_metric_log.body_fat_percent` | Numeric, optional | latest composition (`:395-400`) | 1–80 (`:461`) | `NutritionTargetsScreen.js:774-786` | Body metrics | Engine: FFM floor accuracy | as above | Pro | Out-of-range refused | Yes | A | as above |
| Body-fat estimate source | `Estimate source` | `body_metric_log.body_fat_source` | Pill group | `visual` (`:257`) | `BF_SOURCES` | `NutritionTargetsScreen.js:790-796` | Body metrics | Engine: confidence on the FFM floor | as above | Pro | none | Only when a body-fat value is entered (`:788`) | D | none |
| Activity level | `Activity level` | `nutrition_targets.activity_level` | Pill group | derived from `daysPerWeek` via `daysToActivityLevel` (`:406`) | `ACTIVITY_OPTIONS` | `NutritionTargetsScreen.js:803-809` | `ProGoalSetupScreen` sets `daysPerWeek`, which re-derives this | Engine: TDEE multiplier | SYNCED (`nutrition_targets` registry table) | Pro | Feeds the calorie target the floors then clamp | Yes | A | none |
| Goal / phase (targets) | (goal cards, e.g. `Lean gain`) | `nutrition_targets.goal` / `.phase` | Card grid | prefilled from `userProfile.goal` (`:414-418`) | `lean_gain` \| `build` \| `maintain` \| `recomp` \| `mild_cut` \| `aggressive_cut` | `NutritionTargetsScreen.js:817-841` (and a fast-path copy at `:620-632`) | **`ProGoalSetupScreen.js:477-489` "What are you focused on right now?" writes `userProfile.trainingPhase` + `userProfile.goal`** | Engine: surplus/deficit sizing | SYNCED | Pro | `aggressive_cut` is filtered out under calm mode (`:815`) | Yes | A | **DIVERGENT WRITERS.** This screen writes `nutrition_targets`; ProGoalSetup writes the profile. Neither writes the other. Same user-facing concept ("my goal"), two stores, two editors |
| Protein approach | `Protein target` | `nutrition_targets.proteinApproach` | Card list | `optimised` (`:260`) | `standard` \| `optimised` \| `advanced` \| `custom` (`:862`) | `NutritionTargetsScreen.js:850-905` | **`ProGoalSetupScreen.js:546` also renders a `Protein target` picker writing `userProfile.proteinApproach`** | Engine: protein g/kg band | SYNCED | Pro | none | Yes | A | **DUPLICATE WRITER, two stores.** Same label, two screens, two fields |
| Custom protein g/kg | `Protein target` (inline, `g / kg`) | `nutrition_targets.customProteinGPerKg` | Numeric | blank | > 0 | `NutritionTargetsScreen.js:891-902` | none | Engine: exact protein target | SYNCED | Pro | Refuses to save empty/zero (`:468-475`) | Only when `custom` is selected | D | none |
| Data-storage consent | `I consent to storing this data on my device` | `nutrition_targets.gdprConsented` | Checkbox (gate) | unchecked | on/off | `NutritionTargetsScreen.js:924-928` (and `:693`) | none | Blocks calculation until ticked (`formComplete` `:426`) | SYNCED | Pro | GDPR gate | Yes | A | Re-ticking required on every visit (`consent` is component state seeded `false` at `:262` and never rehydrated) — a small friction defect |
| Meals per day (targets) | (chip row under per-meal protein) | `@volyume_meals_per_day` | Chip row | `null` = engine's recommended | 3–8 accepted on read (`:288`), 3–6 offered in the UI | `NutritionTargetsScreen.js:1089-1108`, writer `changeMealsPerDay` `:291-294` | **`MealPlanScreen.js:226-233` "Meals per day" writes a DIFFERENT field (`userProfile.mealPlanMealsPerDay`)** | UI: per-meal protein split display | SYNCED | Pro | none | Only after targets exist, inside a results block | C | **TWO CONTROLS, SAME LABEL, DIFFERENT KEYS.** Neither reads the other. See § WRITER ISSUES #4 |
| Per-day calorie offsets | (per-weekday steppers under `Per-day targets`) | `@volyume_perday_target_offsets` + `..._updated_at` (`lib/food/perDayTargets.js:37`) | Stepper per weekday | 0 for all seven | ±`MAX_PERDAY_OFFSET_KCAL`, step 50 | `PerDayTargetsScreen.js:160-178` | none | Engine: **NONE.** Planning layer only — the stored target, the coach's rolling average, the rapid-loss gate and the ED detector all keep seeing the real target (`perDayTargets.js:6-13`). UI: the diary displays that day's target shifted | SYNCED via `user_prefs` **and** the `perday_target_offsets` registry table | `tier === 'pro'` | **Every offset is HARD-clamped to the safe floor** (sex floor + FFM floor), shown live as a `floor` tag (`PerDayTargetsScreen.js:144, 157`) | Yes, own Settings row | C | none. Screen copy is explicit that it is planning-only (`:117-120`) |
| Water daily target | (tap the water value) `Daily water target` | `@volyume_water_target_ml` (`DiaryScreen.js:2029`) | Preset alert | 3000 ml (`:2028`) | **2000 / 2500 / 3000 / 3500 / 4000 ml** (`DiaryScreen.js:611`) | `DiaryScreen.js:606-620`, invoked from the water value (`WaterRow` `:2066-2079`) | none | UI: water ring target only | SYNCED | Pro to write; read-only under lapse (`readOnly` branch `:2067`) | none | **No, effectively.** The only affordance is tapping the "3.0 / 3.0 L" text; the a11y label says so (`:2073`) but nothing visual does | B | none functionally |
| Calorie banking ("plan a bigger day") | (diary sheet) | `userProfile.calorieBank` | Sheet | none | `{ weekStartKey, bigDayKey, perDayDeltaKcal, appliedAt }` | `DiaryScreen.js:487-529` via `components/food/CalorieBankSheet.js` | none | UI: shows each day's banked target. Floors + band cap enforced in `lib/food/calorieBank` before the write | LOCAL-ONLY profile field (no `pushPrefSoon`, `useAppStore.js:1876-1884`) — but rides the profile blob into `user_prefs` | Pro | Safe redistribution + floor checks happen in the engine module, not the sheet | Only from the diary, and only when banking is available | D | none |

### 2.6 Meal plan and dietary

| name | label (verbatim) | stored key/field | type | default | values | canonical editor | other surfaces | what it changes | local/synced | tier/platform | safety/privacy | discoverable today? | class | writer issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Diet (dietary needs) | `Diet` | `userProfile.dietPreference` | Chip grid, **4 options** | `omnivore` | `omnivore` \| `pescatarian` \| `vegetarian` \| `vegan` | `components/food/DietaryPreferencesEditor.js:94-114`, rendered by `SettingsDietaryScreen.js:17` and `MealPlanScreen.js:1510` | `SettingsProfileScreen.js:282-302` (3 options only) | Engine: filters curated meals + plan generator | SYNCED column | `tier === 'pro'` | none | Yes | A | See the value-set mismatch under §2.2 |
| Allergens to avoid | `Allergens to avoid` | `userProfile.mealPlanExcludeTags` | Chip grid, FSA-14 | none excluded | `ALLERGENS` tags | `DietaryPreferencesEditor.js:123-144`, writer `setAllergenExcludes` `useAppStore.js:1817-1831` | Same component in the meal-plan sheet | Engine: **HARD exclusion** — an excluded food never appears in a plan, swap or coach edit; exclusions can never push a plan below the safety floors | **SYNCED** as `users_profile.allergen_excludes` specifically because "an allergy silently lost on a device change is not an acceptable failure" (`useAppStore.js:1810-1816`) | Pro | Allergen loss on device change is treated as a safety failure | Yes, from Settings AND from the meal plan | A | none — this is the model pattern (one component, two mount points, one store) |
| Foods you avoid | `Foods you avoid` / `Remove` | `userProfile.mealPlanExcludeFoods` | List + Remove | empty | curated food keys | `DietaryPreferencesEditor.js:156-184` (remove only) | Added from a meal plan via `MealPlanScreen.js:690-724` | Engine: hard exclusion | LOCAL-ONLY profile field (`useAppStore.js:1837-1848`, no `pushPrefSoon`) | Pro | none | Yes | B | Add and remove live on different screens, which is correct (add at the point of consequence, manage centrally). Not synced while allergens are — worth a one-line honesty note in Phase 20 |
| Meal plan: meals per day | `Meals per day` | `userProfile.mealPlanMealsPerDay` | Radio, 4 options | 4 (`planPreferences.js:27`) | 3 \| 4 \| 5 \| 6 (`MealPlanScreen.js:229`) | `MealPlanScreen.js:226-233` (prefs sheet), writer `handleSetPref` `:754-771` → `setMealPlanPrefs` | none | Engine: plan assembly | LOCAL-ONLY profile field (`useAppStore.js:1854-1873`) — rides the profile blob | Pro | none | Only inside the meal plan's prefs sheet | B | Label collides with the Nutrition-targets "Meals per day" (different key). See § WRITER ISSUES #4 |
| Meal plan: variety | `Variety` | `userProfile.mealPlanVariety` | Radio, 3 options | 0 = Repeat (`planPreferences.js:29`) | 0 (`Repeat`) \| 0.5 (`Mixed`) \| 1 (`Varied`) | `MealPlanScreen.js:235-245` | none | Engine: rotation in the assembler | LOCAL-ONLY profile field | Pro | none | Only inside the prefs sheet | B | none |
| Meal plan: peri-workout slots | — | `userProfile.mealPlanPeriWorkout` | — | `false` (`planPreferences.js:28`) | on/off | **NONE** | — | Engine: adds pre/post-workout slots on training days (`mealPlanAssembler.js:618`). UI read by `FoodDetailSheet.js:95`, `QuickAddSheet.js:36`, `DiaryScreen.js:95` | LOCAL-ONLY profile field | Pro | none | **No** | **G** | **READER WITH NO WRITER.** `setMealPlanPrefs` allows the key (`useAppStore.js:1862`) but no UI passes it. `mealSlots.js:7,134` calls it "surfaced as *Around training* on MealPlanScreen" — **no such control exists in current main** (`MealPreferencesControls` renders only Meals per day + Variety, `MealPlanScreen.js:209-246`) |
| Meal plan: fat convention | — | `userProfile.mealPlanFatConvention` | — | `equalised` (`planPreferences.js:31`) | `equalised` \| `higher_rest_day` (`FAT_CONVENTIONS`, `:21`) | **NONE** | — | Engine: rest-day fat handling (`mealPlanAssembler.js:119`) | LOCAL-ONLY | Pro | none | **No** | **G** | **READER WITH NO WRITER.** Same shape as above |
| Meal plan: pinned meals | — | `userProfile.mealPlanPinnedMeals` | — | `[]` | meal ids | **NONE** | — | Engine: `pinnedMealIds` in `mealPlanService.js:114` | LOCAL-ONLY | Pro | none | **No** | **G** | **READER WITH NO WRITER** |
| Meal names / labels | (screen) `Meal names` | `@volyume_meal_labels` (`food/mealSlots.js:37`) | Text per slot | slot defaults | free text | `MealNamesScreen.js` — **route registered (`RootNavigator.js:558`) but there is no `navigate('MealNames')` call site anywhere in `src/`** | none | UI: diary meal headers | SYNCED if ever written | Pro (`withProGuard`, `RootNavigator.js:210`) | none | **No** | **F** | Settings row removed by founder order 2026-07-13 (`SettingsScreen.js:67-70`). Do not resurrect; record for Campaign 4 |

### 2.7 Notifications and reminders

Two screens write here. `NotificationSettingsScreen` owns training, activation,
meal reminders and quiet hours; `CoachingRemindersScreen` (Pro) owns the
morning-weight and weekly-check-in schedule and the two optional coaching
follow-ups. `NotificationSettingsScreen.js:619-638` renders a cross-link row
into Coaching reminders for Pro — a correct contextual pointer, not a
duplicate writer.

| name | label (verbatim) | stored key/field | type | default | values | canonical editor | other surfaces | what it changes | local/synced | tier/platform | safety/privacy | discoverable today? | class | writer issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Training reminder on/off | `Remind me to train` | `@volyume_reminder_enabled_v1` + blob `trainingEnabled` + SQLite `training_reminder` row | Switch | OFF | on/off | `NotificationSettingsScreen.js:648`, writer `handleTrainingToggle` `:430-449` | none | Schedules/cancels training reminders | SYNCED both ways (blob via `user_prefs`, SQLite row via the registry) | tier-blind (Free included) | Refuses to arm without OS permission (`:431-437`) | Yes | A | none |
| Training reminder time | `Reminder time` | `@volyume_reminder_time_v1` + `training_reminder.time_pref` | Preset alert picker | 08:00 | `TRAINING_PRESET_TIMES` `:41` (06:00–10:00, 17:00–20:00) | `NotificationSettingsScreen.js:667-676`, writer `handleTrainingTimePick` `:470-495` | none | Only the TIME; Volyume learns the DAYS from recent workouts (`:681-683`) | SYNCED both ways | tier-blind | Subject to quiet hours | Only when the toggle is on (`:660`) | D | none |
| Getting-started nudges | `Getting-started nudges` | blob `activationNudgeEnabled` | Switch | ON (`:167`, `!== false`) | on/off | `NotificationSettingsScreen.js:692`, writer `handleActivationNudgeToggle` `:451-468` | none | A first-fortnight nudge if no session is logged; stops on its own | SYNCED (blob only, no SQLite row) | tier-blind | none | Yes, under its own `Getting started` heading | A | Blob-only: no `notification_preferences` row, so it does not ride the registry table like its siblings |
| Meal reminders (×3) | `Breakfast` / `Lunch` / `Dinner` | `@volyume_meal_reminders` array (`scheduler.js:272`) | Switch per meal | ALL OFF (`:48-52`) | on/off each | `NotificationSettingsScreen.js:719-727`, writer `persistMealReminders` `:534-540` | none | Local reminders to log meals; copy states no streaks, no pressure (`:748`) | SYNCED | tier-blind | Food-adjacent; `scheduleMealReminders` self-gates | Yes | A | none |
| Meal reminder times (×3) | `Reminder time` | same array | Preset alert picker | 08:00 / 12:30 / 18:30 | `MEAL_PRESET_TIMES` `:47` | `NotificationSettingsScreen.js:730-742`, writer `pickMealReminderTime` `:553-564` | none | as above | SYNCED | tier-blind | as above | Only when that meal is on (`:729`) | D | none |
| Quiet hours on/off | `Quiet hours` | `@volyume_quiet_hours_v1` (`quietHours.js:18`) | Switch | ON (`DEFAULT_QUIET_HOURS.enabled`, `quietHours.js:20`) | on/off | `NotificationSettingsScreen.js:757-767`, writer `persistQuietHours` `:512-527` | none | A reminder that would land inside the window waits until it ends; applies to **every** reminder Volyume schedules (row copy `:794`) | SYNCED | tier-blind | none | Yes | A | none |
| Quiet hours start | `Starts` | same key | Preset alert picker | 22:00 (`quietHours.js:21-22`) | `QUIET_START_PRESETS` `:57` (20:00–00:00) | `NotificationSettingsScreen.js:771-781`, picker `:529-548` | none | Persisting **re-lays everything already scheduled** (`:517-525`) | SYNCED | tier-blind | none | Only when quiet hours are on (`:769`) | D | none |
| Quiet hours end | `Ends` | same key | Preset alert picker | 07:00 (`quietHours.js:23-24`) | `QUIET_END_PRESETS` `:58` (05:00–09:00) | `NotificationSettingsScreen.js:783-793` | none | as above | SYNCED | tier-blind | none | as above | D | none |
| Morning weight reminder hour | `Hour` (under `Morning weight reminder`) | blob `morningHour` / `morningMinute` | Chip row | 07:00 (`:174`) | `HOURS_MORNING` `:46` = 5,6,7,8,9,10,11,12 | `CoachingRemindersScreen.js:349-355`, writer `applyScheduled` `:120-133` | none | Drives the morning-weight series the coach's EWMA reads | **Blob only** (`user_prefs`). **NOT written to the `morning_weight` SQLite row** — see writer issues | `tier === 'pro'` (`withProGuard`) | The evening weigh-in backstop rides the same schedule and self-gates on an open ED flag | Yes | A | **STALE MIRROR (defect).** `setPrefRow` is called only by the two toggles (`:276`, `:303`); the time pickers never touch SQLite. `migrateFromLegacyBlob` back-fills once and skips rows that already exist, so the cloud `notification_preferences.morning_weight.time_pref` freezes at its first value |
| Weekly check-in day | `Day` | blob `checkinDay` | Chip row | Monday, index 1 (`:176`) | 0–6 (`DAYS` `:48`) | `CoachingRemindersScreen.js:377-381` | `ProGoalSetupScreen.js:100-104` READS it for a footer label | Sets the weekly coaching cadence; the screen shows the honest next-fire date enforcing a 7-day minimum (`computeNextCheckinFireDate` `:63-89`) | Blob only, same stale-mirror issue | Pro | First reminder never laid before `FIRST_CHECKIN_MIN_DAYS` | Yes | A | Same stale-mirror defect |
| Weekly check-in hour | `Hour` | blob `checkinHour` | Chip row | 18:00 (`:177`) | `HOURS_EVENING` `:47` = **14–21** | `CoachingRemindersScreen.js:383-389` | none | as above | Blob only | Pro | as above | Yes | A | **RECONSTRUCTION DEFECT.** Onboarding writes `checkinHour: 12` (`ProOnboardingScreen.js:818`), which is **not** in `HOURS_EVENING`. A user who onboarded normally opens this screen and sees NO hour chip selected, while the reminder really is at 12:00 |
| Missed check-in follow-up | `Follow up if a check-in slips by` | blob `missedCheckinEnabled` + SQLite `checkin_missed` | Switch | ON (`:180`, `!== false`) | on/off | `CoachingRemindersScreen.js:410-417`, writer `handleMissedToggle` `:257-286` | none | A follow-up pair after a missed check-in | SYNCED both ways | Pro | Scheduler self-guards on tier, toggle **and ED flag** | Yes | A | none |
| Planned-meal confirm | `Remind me to confirm planned meals` | blob `plannedMealConfirmEnabled` + SQLite `planned_meal_confirm` | Switch | ON (`:181`) | on/off | `CoachingRemindersScreen.js:434-441`, writer `handlePlannedConfirmToggle` `:288-315` | none | Meal-plan confirmation reminder | SYNCED both ways | Pro | Food-adjacent, self-gating scheduler | Yes | A | none |
| Partner cheer notifications | — | blob `partnerCheerEnabled` | — | ON (`=== false` is the only off test) | on/off | **NONE** | — | `scheduler.js:1448` returns early when the flag is `false`, suppressing partner-cheer pushes | SYNCED if written | Pro (partners) | none | **No** | **G** | **READER WITH NO WRITER.** Source comment `scheduler.js:1442` says the flag exists "to surface `partnerCheerEnabled` later without a schema change" — an explicit *deliberate placeholder*, so this is a DOCUMENT-not-build candidate for Phase 8, subject to founder ruling |

### 2.8 Display and accessibility — `src/screens/SettingsDisplayScreen.js`

All ten live in one blob `@volyume_a11y_prefs` (`lib/accessibilityPrefs.js:3`),
all written by `setAccessibilityPref` (`useAppStore.js:1960-1973`), all pushed
to the cloud on every change (`:1972`), all apply immediately (`:257-259`).

| name | label (verbatim) | stored field | type | default | values | canonical editor | what it changes | local/synced | tier | safety/privacy | discoverable? | class | writer issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Appearance | `Appearance` | `accessibility.theme` | Radio, 3 chips | `dark` (`useAppStore.js:1924`) | `dark` \| `light` \| `system` (labelled `Dark` / `Light` / `Match phone`, `:13-17`) | `SettingsDisplayScreen.js:72-96` | Whole-app live theme | SYNCED | free | none | Yes | A | none |
| Energy units | `Energy units` | `accessibility.energyUnit` | Radio, 2 chips | `kcal` (`:1925`) | `kcal` \| `kj` | `SettingsDisplayScreen.js:100-121` | **Display only.** Stored values, targets and the engine stay kcal — the on-screen copy says so (`:101-104`) | SYNCED | free | none | Yes | A | none |
| Show nutrition on Home | `Show nutrition on Home` | `accessibility.showHomeNutrition` | Switch | ON (`:1927`) | on/off | `SettingsDisplayScreen.js:128` | Remaining-calories glance + diary shortcut on Today | SYNCED | free | none | Yes | A | none |
| Show fibre | `Fibre` | `accessibility.showFibre` | Switch | ON (`:1935`) | on/off | `SettingsDisplayScreen.js:149` | Grams of fibre on a food's detail, per-food only | SYNCED | free | none | Yes | C | none |
| Show sugars | `Sugars` | `accessibility.showSugar` | Switch | ON (`:1936`) | on/off | `SettingsDisplayScreen.js:163` | as above | SYNCED | free | none | Yes | C | none |
| Show sodium | `Sodium` | `accessibility.showSodium` | Switch | ON (`:1937`) | on/off | `SettingsDisplayScreen.js:177` | mg of sodium; implausible values read as no data | SYNCED | free | none | Yes | C | none |
| Larger text | `Larger text` | `accessibility.largerText` | Switch | OFF (`:1911`) | on/off | `SettingsDisplayScreen.js:194` | 1.2× on the fontSize tokens | SYNCED | free | none | Yes | A | none |
| Higher contrast | `Higher contrast` | `accessibility.higherContrast` | Switch | OFF (`:1912`) | on/off | `SettingsDisplayScreen.js:211` | Brightens muted text, strengthens dividers | SYNCED | free | none | Yes | A | none |
| Colour-blind safe palette | `Colour-blind safe palette` | `accessibility.colorBlindSafe` | Switch | OFF (`:1913`) | on/off | `SettingsDisplayScreen.js:228` | Success-green / error-red become sky blue and reddish purple | SYNCED | free | none | Yes | A | none |
| Reduce motion | `Reduce motion` | `accessibility.reduceMotionUserPref`; effective `accessibility.reduceMotion` = `systemReduceMotion \|\| userPref` (`:1963-1966`) | Switch | OFF (`:1923`) | on/off | `SettingsDisplayScreen.js:245` | Turns off PR particles, rest-timer animation, big transitions | User pref SYNCED; `systemReduceMotion` runtime-only, NEVER persisted (`:1974-1979`) | free | none | Yes | A | none |

### 2.9 Privacy, data and safety

| name | label (verbatim) | stored key/field | type | default | values | canonical editor | other surfaces | what it changes | local/synced | tier | safety/privacy | discoverable? | class | writer issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OFF label sharing | `Share scanned labels with Open Food Facts` | `@volyume_off_writeback_consent_v1` (`food/writeback.js:26`) | Switch | OFF (`'1'`/`'0'`, `getConsent` `:38-41`) | on/off | `SettingsPrivacyScreen.js:87`, writer `toggleOffConsent` `:62-66` | `DiaryScreen.js:1463-1492` one-time consent card — **navigates to `SettingsPrivacy`, does not write** (`:1485-1489`) | The only path by which a scanned label photo leaves the device. Hard gate: `queueContribution` returns immediately when consent is off | SYNCED (not excluded) | free | Consent-bearing | Yes, plus a contextual pointer | A | none — model contextual pattern |
| Analytics opt-out | `Share usage data` | `@volyume_privacy_prefs.analyticsOptOut` (`lib/privacyPrefs.js:7`) | Switch (rendered INVERTED: on = not opted out) | opted IN (`analyticsOptOut: false`, `useAppStore.js:1991`) | on/off | `SettingsPrivacyScreen.js:101`, writer `setAnalyticsOptOut` `useAppStore.js:2007-2012` | none | Drives `setTelemetryEnabled` immediately | **NOT SYNCED — excluded** `sync.js:1348` (Campaign 1 P0-2). Failed reads fail privacy-protectively (`useAppStore.js:1996-2005`) | free | Privacy contract | Yes | A | none (Campaign 1 fixed the old leak; see DELTA #2) |
| App lock | `App lock (Face ID / fingerprint)` | SecureStore `volyume_app_lock_enabled_v1` (`biometricLock.js:51`) | Switch | OFF | on/off | `SettingsPrivacyScreen.js:132`, writer `toggleAppLock` `:68-80` | none | Wraps `MainTabs` in a lock overlay | **NOT SYNCED.** SecureStore, per DEVICE not per account | free | Fails OPEN on read failure so a user can never be locked out; enable path re-checks biometrics LIVE (`:70-77`) | Yes | A | none |
| Skip name on label scans | `Skip name on label scans` | `@volyume_scan_skip_name` (`SettingsDataScreen.js:29`) | Switch | OFF (asks for a name) | `'true'` / absent | `SettingsDataScreen.js:276`, writer `toggleScanSkipName` `:65-72` | **`ScanLabelScreen.js:240` "Skip name" sets the same key** | UI: a label scan goes straight to the nutrition panel | SYNCED | `tier === 'pro'` (`:273`) | none | Yes, but filed under **Your data**, not a food surface | B | **Two writers, INTENTIONAL and documented** (`SettingsDataScreen.js:23-28, 60-64`): the scan screen arms it, Settings is the two-way manage surface. Placement is the real issue (Phase 3) |
| Health-data consent withdrawal | `Delete account and withdraw consent` / `Health-data consent` | server `record_health_consent(false)` + full delete pipeline | Destructive action | n/a | n/a | `SettingsPrivacyScreen.js:161-173` | `SettingsAccountScreen.js:76` (delete account) | Withdrawal queues real deletion, not a flag flip | server | free | **Article 9** | Yes | A | none |
| Privacy policy | `Privacy policy` | n/a | Nav | n/a | n/a | `SettingsPrivacyScreen.js:115` | none | Opens `PrivacyPolicy` | n/a | free | none | Yes | A | none |
| Goal lock | `Goal lock` | `user_body_profile.goal_lock_advanced` | Radio, 2 | `standard` | `standard` \| `advanced` | `GoalLockConsentScreen.js:69-88` (`setGoalLockAdvanced`), reached from `YouScreen.js:556-561` (Coach > Safety checks) | none | Engine: **raises the ED-pattern detector threshold from 2 signals to 3.** FFM floor still applies | Local SQLite column (in the wipe/backup lists) | `tier === 'pro'` (the whole `Safety checks` block is `isPro`, `YouScreen.js:551`) | **ED-SAFETY.** Everyone starts on the protective setting and must deliberately opt in | Only via Coach tab > Safety checks; **not in Settings at all** | C | none functionally. Placement flagged for Phase 4 |
| Wellbeing check | `Wellbeing check` | `@volyume_scoff_answers` + `userProfile.scoffScore` + `user_body_profile.scoff_score` | 5 yes/no questions | unanswered | 0–5 derived score | `WellbeingCheckScreen.js:66-94`, reached from `YouScreen.js:562-567` | Calm-mode toggle is a separate control in Settings > Coaching | Engine: feeds `edPatternDetector` | **Raw answers explicitly EXCLUDED from sync** (`sync.js:1338`); the derived score rides the profile/body-profile | Pro (same `isPro` block) | **ED-SAFETY CRITICAL.** The screen promises answers stay device-only (`:102`) and the exclusion keeps that promise | Only via Coach tab | C | See DELTA #6: the screen no longer offers calm mode or the Beat UK helpline inline |
| Cloud sync now | `Cloud sync` | n/a | Action | n/a | n/a | `SettingsDataScreen.js:261`, handler `:78-103` | none | Runs `syncAll({triggeredBy:'manual'})` | n/a | free | none | Yes | A | none |
| Refresh food library | `Refresh food library` | n/a | Action | n/a | n/a | `SettingsDataScreen.js:268`, handler `:107-129` | none | Forces a food delta pull | n/a | free | none | Yes | A | none |
| Import | `Import from another app` | n/a | Nav | n/a | n/a | `SettingsDataScreen.js:293` | none | `ImportScreen` (Hevy/Strong) | n/a | free | none | Yes | A | none |
| Backup | `Back up app data (JSON)` | n/a | Action | n/a | n/a | `SettingsDataScreen.js:299` | none | JSON of DB records; photo files NOT bundled (copy `:300`) | n/a | free | Explicit about what stays on device | Yes | A | none |
| Restore backup | `Restore from backup` | n/a | Destructive action | n/a | n/a | `SettingsDataScreen.js:305` | none | Replaces ALL current DB records | n/a | free | Two-step confirm; requires app restart | Yes | A | none |
| Restore snapshot | `Restore a snapshot` | n/a | Nav | n/a | n/a | `SettingsDataScreen.js:311` | none | `SnapshotsScreen` | n/a | free | none | Yes | A | none |
| CSV export | `Export workout log (CSV)` | n/a | Action | n/a | n/a | `SettingsDataScreen.js:317` | none | Workout sets only | n/a | free | none | Yes | A | none |
| Coach report | `Coach handover report (PDF)` | n/a | Action | n/a | n/a | `SettingsDataScreen.js:323` | none | PDF for a coach or GP | n/a | free | ED-neutral variant + fail-closed wellbeing reads owned in `lib/coachReport.js` | Yes | A | none |
| Clear history | `Clear workout history` | n/a | Destructive action | n/a | n/a | `SettingsDataScreen.js:338` | none | Deletes sessions + derived PRs | n/a | free | Cannot be undone | Yes | A | none |
| Debug log | (version row, 7 taps in 3 s) | n/a | Hidden gesture | n/a | n/a | `SettingsAboutScreen.js:19-31` and the version row | none | Opens `DebugLog` | n/a | free | Deliberately unadvertised; the a11y label no longer mentions it (`:9-18`) | **No, by design** | **E** | none. Correct as internal |
| Health provider settings (5 rows) | `Read morning weight`, `Read cardio sessions`, `Write workouts`, `Sync weight now`, `Open Health settings` | OS permission scopes | Switches / actions | not granted | granted/denied | `SettingsHealthScreen.js:187-262` | none | n/a | OS state | `isHealthAvailable()` is **permanently false** (`health.js:109-110`) | none | **No** | **F** | Whole screen unreachable. Record for Campaign 4; do not resurrect |

### 2.10 Progress, photos and charts

| name | label (verbatim) | stored key/field | type | default | values | canonical editor | other surfaces | what it changes | local/synced | tier | safety/privacy | discoverable? | class | writer issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Progress scan camera facing | (capture sheet toggle) | `@volyume_progress_scan_camera_facing` (`progressScanPreferences.js:4`) | Toggle front/back | `front` (`:22`) | `front` \| `back` | `components/ProgressGhostCapture.js:363-368` | none | Capture consistency feeds the Volyume Score (`:14-21`) | SYNCED | Pro | Framing consistency is a scoring input | Only inside the capture sheet | B | none |
| Progress scan timer | (timer chips) | `@volyume_progress_scan_timer_seconds` (`:5`) | Chip picker | 5 s (`:23`) | 0 \| 5 \| 10 (`:31`) | `ProgressGhostCapture.js:358-362, 660-678` | none | Shutter delay; an explicit 0 is preserved, only unset/corrupt falls to the default (`:60-70`) | SYNCED | Pro | none | Only inside the capture sheet | B | none |
| Hide exact scan numbers | — | `@volyume_progress_scan_hide_exact_numbers` (`:3`) | — | **true** (`:34-41`) | true/false | **NONE** | — | UI: coach output shows a progress-signal label instead of an exact range/weight | SYNCED if ever written | Pro | An **ED-protective** default | **No** | **G** | **NO WRITER.** `setProgressScanHideExactPreference` (`:44-50`) has no call site outside its own module and tests; there is even a source guard asserting `ProgressPhotosScreen` must NOT call it (`ProgressPhotosScreen.progressScan.guard.test.js:29`). Effectively a hard-coded ON. Founder ruling required: fixed behaviour vs a real toggle |
| Physique tracking enabled | — | `@volyume_physique_tracking_enabled` | Auto-set | off until set | `'true'` | **NONE (auto)** | Set by `BodyMetricsScreen.js:597` on focus for Pro, and by `NutritionTargetsScreen.js:539` after a successful calculation | Unlocks the body-composition surfaces | SYNCED | Pro | none | **No** | **E** | Correct as internal; write-only-by-system with no user control, intentionally |
| Weight chart window | (chip row) | `@volyume_chart_window_weight` (`BodyMetricsScreen.js:203`) | Chip row | auto-picked from the data (`pickInitialWindowKey`) | `TREND_WINDOWS` keys | `BodyMetricsScreen.js:243-247` | none | Chart range only | SYNCED | free | none | Yes, on the chart | B | none |
| e1RM chart window | (chip row) | `@volyume_chart_window_e1rm` | Chip row | auto-picked | `TREND_WINDOWS` keys | `ExerciseDetailScreen.js:551-555` | none | Chart range; emits `chart_window_changed` telemetry | SYNCED | free | none | Yes | B | none |
| Exercise-detail chart metric | (chip row) | `@volyume_chart_metric_detail` | Chip row | first of `CHART_METRICS` | `CHART_METRICS` keys | `ExerciseDetailScreen.js:557-560` | none | Which series the chart plots | SYNCED | free | none | Yes | B | none |
| Volume chart window | (chip row) | `@volyume_chart_window_volume` | Chip row | default window | window keys | `VolumeHeatmapScreen.js:119-123` | none | Chart range | SYNCED | free | none | Yes | B | none |
| Progress-photo prompt opt-out | `Don't ask again` | `photo_prompt_optout` (`ProgressPhotoPrompt.js:49`) | One-tap opt-out | not opted out | `'1'` | `ProgressPhotoPrompt.js:163-170` | none | Permanently stops the "mark the moment" prompt | **NOT SYNCED** — no `@volyume_` prefix, so `shouldSyncPref` returns false (`sync.js:1363`) | Pro | none | Only on the prompt itself | D | **ONE-WAY, NO UNDO.** No surface re-enables it. Also non-synced while every sibling photo pref syncs — an inconsistency worth a Phase 20 honesty note |
| Before/after: include weight | (switch inside the share sheet) | component state only | Switch | off | on/off | `BeforeAfterShareSheet.js:598-604` | none | Render-time only: bodyweight beside each photo | Ephemeral | Pro + the suppression gate | **The single founder-approved Article 9 exception.** The whole card is withheld under calm mode or an open ED flag | Yes, in the sheet | D | none. Ephemeral by design |
| Share-card field toggles | `Date`, `Plan name`, `Total weight lifted`, `Exercise names`, `PR weight`, `Previous best`, `Weight progress`, `Best lift of the week` | component state only | Switches | per card type | on/off each | `ShareCardScreen.js:547-566` | none | Render-time only | Ephemeral | free | Share cards never include name, bodyweight, measurements or private notes (note `:570-573`) | Yes | D | none. Ephemeral by design |

### 2.11 Goal and programme setup — `src/screens/ProGoalSetupScreen.js`

Reached from Coach tab > Setup > `Update goal and phase` (`YouScreen.js:520-526`).
All persist through one `saveLocalProfile` at `:339`.

| name | label (verbatim) | stored field | type | default | values | canonical editor | what it changes | local/synced | tier | safety/privacy | discoverable? | class | writer issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Focus / training phase | `What are you focused on right now?` | `userProfile.trainingPhase`, `goalPhase`, `goal`, `goalStartDate` | Card list | `lean_gain` (`:108`) | phase keys | `ProGoalSetupScreen.js:477-489` | Engine: the whole coaching phase, plus a nutrition-target recalc at `:315-321` | SYNCED via profile | Pro | Phase changes reset the plan | Yes | A | Divergent with `NutritionTargetsScreen`'s goal cards (see §2.5) |
| Competition division | `Competing in a category? (optional)` | division fields + `peak_week_plans` show date | Optional picker + date | none | division keys | `ProGoalSetupScreen.js:412-453` | Engine: division plans, ED-gated contest countdown | SYNCED | Pro | Countdown is ED-gated | Yes | D | none |
| Weak points | (shown only for goals that use them) | `userProfile.planWeakPoints` | Multi-select | `[]` | muscle keys | `ProGoalSetupScreen.js` (hidden when the goal does not support them, `:113-114`, cleared at `:217-227`) | Engine: biases volume to priority muscles | SYNCED | Pro | none | Only for supporting goals | D | none |
| Experience | `Experience` | `userProfile.experience` | Picker | `intermediate` (`:124`) | experience keys | `ProGoalSetupScreen.js:490-500` | Engine: exercise selection, volume, surplus scaling | SYNCED | Pro | none | Yes | A | none |
| Training days per week | `Training days per week` | `userProfile.daysPerWeek` | Picker | 4 (`:125`) | day counts | `ProGoalSetupScreen.js:502-511` | Engine: plan split, and re-derives the Nutrition-targets activity level (`NutritionTargetsScreen.js:406`) | SYNCED | Pro | none | Yes | A | none |
| Session length | `Session length` | `userProfile.sessionLengthMinutes` | Picker | 60 (`:126`) | minute options | `ProGoalSetupScreen.js:513-520` | Engine: exercises per session | SYNCED | Pro | none | Yes | A | none |
| Equipment | `Equipment` | `userProfile.equipment` | Picker | `full_gym` (`:127`) | `full_gym` \| `home_gym` \| `bodyweight` … (`:68-69`) | `ProGoalSetupScreen.js:522-532` | Engine: exercise selection | SYNCED | Pro | none | Yes | A | none |
| Recovery | `Recovery` | `userProfile.recoveryRating` | Picker | `average` (`:128`) | recovery keys | `ProGoalSetupScreen.js:534-544` | Engine: volume and deload cadence | SYNCED | Pro | none | Yes | A | none |
| Protein target (setup copy) | `Protein target` | `userProfile.proteinApproach` | Picker | `optimised`, or `advanced` for physique divisions (`:109-112`) | approach keys | `ProGoalSetupScreen.js:546` | Engine: protein band | SYNCED | Pro | none | Yes | A | **DUPLICATE WRITER** of the Nutrition-targets protein control, writing a different field |

### 2.12 Consistency and partners

| name | label (verbatim) | stored key/field | type | default | values | canonical editor | what it changes | local/synced | tier | safety/privacy | discoverable? | class | writer issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Weekly session goal (manual) | `How many sessions a week are you aiming for?` | `@volyume_streak_v1_<uid>.manualGoal` (`lib/streakState.js:143`) | Chip grid, 2×3 | none (plan target used) | 1–6 | `components/StreakWeeksSection.js:177-200`, rendered by `ConsistencyScreen.js:59` | The streak target; when a plan target also exists, the LOWER of the two is used (`useWeeklyStreak.js:96`) | Device-local AsyncStorage per user; **`@volyume_streak_v1_` is not excluded, so it syncs** | free | Whole section is suppressed under an ED flag / calm mode | **Only when the user has no plan target** (`!hasTarget`, `:176`) | D | none |
| Pause your run | `Pause` (sheet: `This week` / `2 weeks` / `4 weeks` / `8 weeks`) | `@volyume_streak_v1_<uid>.pauses` (`streakState.js:150`) | Action + sheet | not paused | 1 \| 2 \| 4 \| 8 weeks (`:24-27`) | `StreakWeeksSection.js:205-230` | Marks those weeks paused so a break does not break the run | SYNCED (same key) | free | Same suppression gate | Yes, on the Consistency screen | B | No un-pause control; the only path is waiting the span out |
| Partner reconnect dismissal | (dismiss on the card) | `@volyume_partner_reconnect_dismissed_v1` | Action | nothing dismissed | array of pair ids | `PartnerScreen.js:656-664` | Suppresses the reconnect prompt for that pair | SYNCED | Pro | none | Only on the card | D | No undo, same shape as the photo opt-out |
| End partnership | `End partnership` | server pair state | Destructive action | n/a | n/a | `PartnerScreen.js:1237` | Removes the pair | server | Pro | none | Yes | A | none |
| Phase-name sharing | `Share this phase name` / `Stop sharing this phase name` / `Withdraw phase name` / `Decline` | server pair state | Actions in a sheet | not shared | shared/not | `PartnerScreen.js:1644-1665` | What a partner can see of the user's phase | server | Pro | Privacy-bearing | Only via the pair's manage sheet | B | none |

---

## 3. TOTALS

**Definition used for "LIVE user-configurable setting":** a persisted
preference or persisted profile/programme field with a **reachable UI writer**
in the shipped app. Pure navigation rows, one-off actions (sync now, export,
sign out, delete), and render-time-only toggles are counted separately so the
figure can be compared with the map's mixed 98/93 either way.

| Bucket | Count |
| --- | --- |
| **LIVE user-configurable settings (reachable writer, persisted)** | **83** |
| Actions / navigation rows inventoried alongside them | 20 |
| Render-time-only (ephemeral) toggles | 10 (8 share-card fields + before/after weight + share-card `Date` counted once) |
| Rows with NO reachable writer (readers only) | 6 |
| Rows unreachable / legacy | 7 (5 health rows, Meal names, bar weight) |
| Internal (no user entry point by design) | 3 (gym weight unit, physique tracking, DebugLog) |
| **TOTAL TABULATED ROWS** | **119** |

### Per-class counts (all tabulated rows)

| Class | Meaning | Count |
| --- | --- | --- |
| **A** | Always discoverable | **58** |
| **B** | Contextually discoverable | **14** |
| **C** | Advanced but reachable | **11** |
| **D** | State-gated by design | **19** |
| **E** | Internal | **3** |
| **F** | Legacy / unreachable | **7** |
| **G** | Unclear product intent | **7** |
| | | **119** |

### Per-class counts, LIVE settings only (83)

| Class | Count |
| --- | --- |
| A | 44 |
| B | 13 |
| C | 10 |
| D | 16 |
| E | 0 |
| F | 0 |
| G | 0 |

(The 7 G-class and 7 F-class rows are by definition NOT live settings — they
have no reachable writer, or no reachable route.)

### Discoverability today (LIVE settings only)

| | Count |
| --- | --- |
| Reachable from Settings, correctly placed | 55 |
| Reachable only from a non-Settings context (correctly, class B/D) | 22 |
| Reachable but effectively undiscoverable (no visible affordance, or buried) | 6 |

The six effectively-undiscoverable live settings:
1. **Water daily target** — only by tapping the "3.0 / 3.0 L" value (`DiaryScreen.js:2066-2079`).
2. **Per-side (unilateral) logging** — one-time in-workout prompt, no review list, no off path.
3. **Manual volume targets (MEV/MAV/MRV)** — only inside the volume heatmap editor.
4. **Goal lock** — Coach tab > Safety checks, not in Settings at all; most safety-consequential user control in the app.
5. **Progress scan camera facing / timer** — only inside the capture sheet (counts as 2).
6. **Skip name on label scans** — filed under *Your data* rather than any food surface.

---

## 4. WRITER ISSUES (numbered, with evidence)

**16 findings.** Each is stated as fact-with-evidence only; no fix is proposed
here (Phase 2 owns the fixes).

1. **Nutrition targets shows Sex / Age / Height but never writes them back.**
   `NutritionTargetsScreen.js:376-386` prefills all three from
   `user_body_profile`; `handleCalculate` (`:429-545`) persists
   `nutrition_targets`, a `body_metric_log` entry and
   `@volyume_physique_tracking_enabled` — but contains no
   `saveUserBodyProfile`/`saveLocalProfile` call for `sex`, `heightCm` or
   `dateOfBirth`. Class: **settings displayed but not writable**, and
   **ED-adjacent**: the targets shown can be computed from a different sex
   than every floor/gate downstream reads. (3 controls.)

2. **Diet preference has two writers with different value sets.**
   `SettingsProfileScreen.js:32-36` offers 3 options; `DIETS`
   (`lib/food/curatedMeals.js:41`) and `DietaryPreferencesEditor.js:22` offer
   4 (`pescatarian` included). A `pescatarian` user sees no selected chip in
   Settings > Profile and any tap there silently changes their diet.

3. **Coaching-reminder times never reach the SQLite mirror.**
   `CoachingRemindersScreen.js` calls `setPrefRow` only at `:276` and `:303`
   (the two toggles). `applyScheduled` (`:120-133`) writes the AsyncStorage
   blob only. `NotificationSettingsScreen`'s `applyNotifications` — the only
   code that mirrors `morning_weight` / `weekly_checkin_reminder` into SQLite
   (`:104-113`) — is **dead**: it is reachable only through
   `scheduleApply`, which carries an explicit
   `// eslint-disable-next-line no-unused-vars` and the comment "only
   reachable via handlers removed in a half-finished refactor" (`:363-380`).
   Consequence: the cloud `notification_preferences` rows for those two
   categories freeze at whatever `migrateFromLegacyBlob` first back-filled.

4. **Two different controls both labelled "Meals per day".**
   `NutritionTargetsScreen.js:1089-1108` writes `@volyume_meals_per_day`;
   `MealPlanScreen.js:226-233` writes `userProfile.mealPlanMealsPerDay`.
   Neither reads the other and their ranges differ (3–8 vs 3–6). A user who
   sets one and checks the other sees an unexplained mismatch.

5. **Two divergent writers for "my goal".** `NutritionTargetsScreen.js:817-841`
   writes `nutrition_targets.goal`/`.phase`; `ProGoalSetupScreen.js:477-489`
   writes `userProfile.trainingPhase` + `userProfile.goal` (and recalculates
   targets at `:315-321`). Only the second direction propagates.

6. **Two writers for "Protein target".** `NutritionTargetsScreen.js:862-905`
   (→ `nutrition_targets.proteinApproach`) and `ProGoalSetupScreen.js:546`
   (→ `userProfile.proteinApproach`). Same label, two stores.

7. **"LOCAL-ONLY" is imprecise for four profile fields.** `coachTone`,
   `showScience`, `coachAutonomy`, `mealPlan*`, `calorieBank` and
   `mealPlanExcludeFoods` are documented as local-only (e.g.
   `SettingsCoachingScreen.js:35-37`, `useAppStore.js:1854-1873`) meaning "no
   dedicated cloud column". They are all written into
   `@volyume_user_profile_<uid>`, which is NOT in `PREF_EXCLUDE_PATTERNS`, so
   the bulk pref push ships them to `user_prefs` regardless
   (`sync.js:1362-1365`). Not a data leak (they are innocuous), but the
   internal documentation is misleading and a "device-only" *user-facing*
   claim built on it would be untrue.

8. **`mealPlanPeriWorkout` — reader with no writer.** Read at
   `FoodDetailSheet.js:95`, `QuickAddSheet.js:36`, `DiaryScreen.js:95`,
   `mealPlanService.js:110`; assembler consumes it at
   `mealPlanAssembler.js:618`. Allowed in `setMealPlanPrefs`
   (`useAppStore.js:1862`) but never passed by any UI.
   `mealSlots.js:7` and `:134` claim it is *"surfaced as 'Around training' on
   MealPlanScreen"* — **no such control exists**; `MealPreferencesControls`
   (`MealPlanScreen.js:209-246`) renders only Meals per day and Variety.

9. **`mealPlanFatConvention` — reader with no writer.** Consumed at
   `mealPlanAssembler.js:119` and `:1037` via `mealPlanService.js:113`;
   allowed in `setMealPlanPrefs`; no UI passes it.

10. **`mealPlanPinnedMeals` — reader with no writer.** Consumed at
    `mealPlanService.js:114`; allowed in `setMealPlanPrefs`; no UI passes it.

11. **`@volyume_progress_scan_hide_exact_numbers` — reader with no writer,
    and an active guard against adding one.** Read by
    `getProgressScanHideExactPreference` (`progressScanPreferences.js:34-42`,
    default **true**); `setProgressScanHideExactPreference` (`:44-50`) has no
    production call site. A pinned source guard asserts `ProgressPhotosScreen`
    must not call it (`ProgressPhotosScreen.progressScan.guard.test.js:29`).
    ED-protective default; **founder ruling required** on whether it is fixed
    behaviour or a missing control.

12. **`partnerCheerEnabled` — reader with no writer, explicitly a
    placeholder.** `scheduler.js:1448` suppresses partner-cheer pushes when
    the blob flag is `false`; the comment at `:1442` says the shape exists to
    "surface `partnerCheerEnabled` later without a schema change". No UI
    writes it.

13. **Onboarding writes a check-in hour outside the picker's range.**
    `ProOnboardingScreen.js:818` writes `checkinHour: 12`;
    `CoachingRemindersScreen.js:47` offers `HOURS_EVENING = [14..21]`. A
    normally-onboarded user sees no hour chip selected while the reminder is
    genuinely scheduled for 12:00. **UI value reconstructed incorrectly after
    reload.**

14. **Onboarding replaces the notification blob wholesale.**
    `ProOnboardingScreen.js:812-825` writes `JSON.stringify(prefs)` with no
    merge, unlike every other writer of that key
    (`NotificationSettingsScreen.js:409-420`,
    `CoachingRemindersScreen.js:122-133, 268-271, 295-298`, all of which
    merge). Low blast radius (first run, empty blob) but it is the one
    non-merging writer of a shared blob.

15. **Two one-way dismissals with no undo path.**
    `photo_prompt_optout` (`ProgressPhotoPrompt.js:163-170`) and
    `@volyume_partner_reconnect_dismissed_v1` (`PartnerScreen.js:656-664`).
    Both permanently remove a surface with no reachable re-enable. Relevant
    to Phase 11's "does not disappear forever because of one accidental
    dismissal".

16. **Per-side logging cannot be turned off once accepted.**
    `setUnilateralExercise(id, false)` exists (`unilateral.js:94-105`) but the
    only caller is the one-time prompt, and `markUnilateralAsked`
    (`:126-136`) guarantees that prompt never re-fires for that exercise. The
    setting changes what rep count the engine sees (`:53-62`) with no review
    list and no off switch.

**Additional smaller observations (not counted in the 16):**
- `NutritionTargetsScreen` seeds `consent` to `false` on every mount (`:262`)
  and never rehydrates `gdprConsented`, so the checkbox must be re-ticked on
  each visit before Recalculate is enabled (`formComplete`, `:426`).
- `activationNudgeEnabled` is the only notification preference with no
  `notification_preferences` row, so it rides only the blob.
- `mealPlanExcludeFoods` is local-only while `mealPlanExcludeTags` (allergens)
  syncs — deliberate (`useAppStore.js:1810-1816`) but not stated to the user.

---

## 5. G-CLASS — UNCLEAR PRODUCT INTENT (7 items, evidence attached)

Per the order: *do not invent an entry point; escalate for a ruling.*

| # | Item | Current behaviour | Code evidence | User consequence |
| --- | --- | --- | --- | --- |
| G1 | `mealPlanPeriWorkout` ("Around training" slots) | Permanently off. Engine and three UI readers honour it | `planPreferences.js:28`, `mealPlanAssembler.js:618`, `mealSlots.js:7,134` (which claims a control exists), `MealPlanScreen.js:209-246` (it does not) | Pre/post-workout meal slots can never be enabled. A source comment promises a control that was never built or was removed |
| G2 | `mealPlanFatConvention` | Permanently `equalised` | `planPreferences.js:21,31`, `mealPlanAssembler.js:119` | `higher_rest_day` rest-day fat handling is unreachable |
| G3 | `mealPlanPinnedMeals` | Permanently empty | `mealPlanService.js:114`, `useAppStore.js:1862` | "Always keep my oats breakfast" (the documented intent, `planPreferences.js:32`) is unreachable |
| G4 | `progress_scan_hide_exact_numbers` | Permanently ON (ED-protective) | `progressScanPreferences.js:34-50`; guard test `ProgressPhotosScreen.progressScan.guard.test.js:29` | Users never see exact scan numbers. Is this intended fixed safety behaviour, or a missing control? The guard test suggests intent, the setter suggests otherwise |
| G5 | `partnerCheerEnabled` | Permanently on | `scheduler.js:1442-1448` | Partner cheer pushes cannot be muted independently of all notifications |
| G6 | Nutrition targets' Sex / Age / Height fields | Editable-looking, never persisted | `NutritionTargetsScreen.js:376-386` vs `:429-545` | Either they should write through (making Settings > Profile the mirror) or they should be read-only with a link to the canonical editor. Current state is neither, and it is ED-adjacent |
| G7 | Two "Meals per day" controls / two "Protein target" controls / two goal editors | Both live, both write, neither reads the other | `NutritionTargetsScreen.js:1089-1108` vs `MealPlanScreen.js:226-233`; `:862-905` vs `ProGoalSetupScreen.js:546`; `:817-841` vs `:477-489` | Users cannot tell which one "counts". Whether these are genuinely different concepts that need distinct labels, or one concept with a forked store, is a product call |

---

## 6. DELTA vs THE PRODUCT MAP (`docs/_FULL-APP-PRODUCT-MAP.md` CHAPTER B2 §A)

The map's headline was **98 tabulated / 93 live / 14 hard-to-find**. Re-audited
against current main: **119 tabulated / 83 live user-configurable settings /
6 effectively-undiscoverable live settings** (the map's "14 hard-to-find" list
mixed live settings, an internal gesture and a writer-less key; see below).

### 6.1 Map rows now STALE or WRONG

| # | Map claim | Current truth | Evidence |
| --- | --- | --- | --- |
| D1 | Analytics opt-out is "**YES in practice** … the key is not in `PREF_EXCLUDE_PATTERNS`" (map UNCERTAINTIES U1) | **RESOLVED — it is now excluded.** Campaign 1 P0-2 added `/^@volyume_privacy_prefs$/` and closed both directions | `src/lib/sync.js:1339-1348` |
| D2 | Map lists `@volyume_scoff_answers` and `@volyume_cycle_tracking` as the sensitive exclusions | Still true, plus new exclusions since the snapshot: `@volyume_privacy_prefs`, `@volyume_pref_written_at_` | `sync.js:1348, 1359` |
| D3 | "Meal plan: peri-workout slots — Switch, meal plan prefs" | **NO CONTROL EXISTS.** `MealPreferencesControls` renders only Meals per day and Variety | `MealPlanScreen.js:209-246` |
| D4 | "Meal plan: fat convention — Radio, prefs" | **NO CONTROL EXISTS** | same |
| D5 | "Water daily target — Numeric, user-entered ml" | It is a **fixed 5-option preset alert** (2000/2500/3000/3500/4000), not free entry | `DiaryScreen.js:606-620` |
| D6 | "Wellbeing check — 5 yes/no questions **+ calm-mode choice**" | The screen has **no calm-mode choice and no inline Beat UK helpline**. A score ≥ 2 shows a GP/dietitian alert only; calm mode lives solely in Settings > Coaching | `WellbeingCheckScreen.js:80-86` vs `SettingsCoachingScreen.js:127` |
| D7 | "Morning weight reminder hour → blob `morningHour` **+ SQLite `morning_weight.time_pref`**" | Blob only. The SQLite mirror writer is dead code | `CoachingRemindersScreen.js:120-133`; `NotificationSettingsScreen.js:363-380` |
| D8 | "Weekly check-in day/hour → blob **+ `weekly_checkin_reminder.time_pref`**" | Same: blob only | same |
| D9 | Autonomy `coached` sub-copy | Changed by D93 (Campaign 2) to state the safety-hold exception out loud: *"The coach applies each week's changes for you. Anything safety-related still waits for your confirmation."* | `SettingsCoachingScreen.js:230` |
| D10 | Session readiness sub-copy | Now tier-split (T16): Pro promises adjustment, Free promises only that answers are kept | `SettingsCoachingScreen.js:148-151` |
| D11 | "Share usage data" sub-copy | Reworded: *"Helps us see which features get used and where the app is slow. Never your training, food, or body data. Turn it off any time."* | `SettingsPrivacyScreen.js:102` |
| D12 | Health provider group "LIVE-CONDITIONAL" (already corrected in the map's own review addendum to LEGACY-UNREACHABLE) | Confirmed **F**: both module getters hard-return `null` | `src/lib/health.js:109-110` |
| D13 | "Diet preference — Radio, **3 options**" (profile row) | True for `SettingsProfileScreen`, but the map missed that the Dietary-needs editor offers **4** (`pescatarian`) — a live value-set conflict | `SettingsProfileScreen.js:32-36` vs `DietaryPreferencesEditor.js:22` + `curatedMeals.js:41` |
| D14 | "Bar weight … still a store field with a synced column but its Settings row was removed" | Confirmed, and there is now **no writer at all** — `setBarWeight` has zero UI callers. Classify **F**, not "field without a row" | `useAppStore.js:1889-1900` |

### 6.2 Rows NEW since the map snapshot (not in CHAPTER B2 §A)

| # | New row | Where | Evidence |
| --- | --- | --- | --- |
| N1 | Body-fat estimate source (`Estimate source`) | Nutrition targets, state-gated on a body-fat value | `NutritionTargetsScreen.js:788-796` |
| N2 | Custom protein g/kg | Nutrition targets, state-gated on `custom` | `NutritionTargetsScreen.js:891-902` |
| N3 | Data-storage consent checkbox | Nutrition targets (blocks calculation) | `NutritionTargetsScreen.js:924-928` |
| N4 | Calorie banking ("plan a bigger day") | Diary | `DiaryScreen.js:487-529`, `components/food/CalorieBankSheet.js` |
| N5 | Foods you avoid — Remove | Dietary needs / meal-plan sheet | `DietaryPreferencesEditor.js:156-184` |
| N6 | Meal-plan dietary sheet as a second mount of the SAME editor | Meal plan | `MealPlanScreen.js:1499-1517` |
| N7 | Coaching-reminders cross-link row | Notifications screen (Pro) | `NotificationSettingsScreen.js:619-638` |
| N8 | OFF-consent contextual card in the diary (navigates to the canonical editor, does not fork state) | Diary | `DiaryScreen.js:1463-1492` |
| N9 | Progress-photo prompt opt-out (`Don't ask again`) | Prompt card | `ProgressPhotoPrompt.js:163-170` |
| N10 | Partner reconnect dismissal | Partners | `PartnerScreen.js:656-664` |
| N11 | Partner phase-name sharing actions | Partners manage sheet | `PartnerScreen.js:1644-1665` |
| N12 | The full ProGoalSetup control set (9 rows) — the map covered goal/phase only in passing | Coach > Setup | `ProGoalSetupScreen.js:412-546` |
| N13 | `mealPlanPinnedMeals` as a third writer-less meal-plan key | — | `mealPlanService.js:114` |
| N14 | `partnerCheerEnabled` writer-less flag (map flagged it under control gaps; now confirmed with the placeholder comment) | — | `scheduler.js:1442-1448` |

### 6.3 The map's "14 HARD TO FIND" list, re-verified

| Map # | Item | Verdict now |
| --- | --- | --- |
| 1 | Goal lock | **CONFIRMED.** Coach > Safety checks, `YouScreen.js:556-561`; not in Settings |
| 2 | Wellbeing check / calm mode split across two trees | **CONFIRMED and worse than described** — the wellbeing screen no longer offers calm mode at all (D6) |
| 3 | Session readiness check | **CONFIRMED as a label-vs-effect gap.** Reachable in Settings; the OFF copy still does not say adjustments stop (`SettingsCoachingScreen.js:151`) |
| 4 | Autonomy buried | **CONFIRMED** (still below Cardio logging + tone in a scrolling card) |
| 5 | Per-day calorie offsets | **PARTIALLY STALE.** Its own Settings row exists and the screen copy is now explicit that it is planning-only (`PerDayTargetsScreen.js:117-120`). Discoverable; the remaining issue is that it is not reachable from the target it appears to change |
| 6 | Water daily target | **CONFIRMED.** Only affordance is tapping the value (`DiaryScreen.js:2066-2079`) |
| 7 | Meal plan meals/day, variety, peri-workout, fat convention | **PARTIALLY STALE.** Meals/day + variety are live in the prefs sheet; **peri-workout and fat convention have no control at all** (G1/G2) |
| 8 | Progress scan camera facing and timer | **CONFIRMED** |
| 9 | Per-side (unilateral) logging | **CONFIRMED, and worse** — no review list AND no reachable off path (#16) |
| 10 | Skip name on label scans | **CONFIRMED** (Settings > Your data, Pro-only) |
| 11 | Getting-started nudges | **PARTIALLY STALE.** It has its own `Getting started` section heading (`NotificationSettingsScreen.js:686`); reachable, just low on a long screen |
| 12 | Rest-alert exactness (Android 12+) | **CONFIRMED and correct** — properly state-gated (class D) |
| 13 | DebugLog 7-tap gesture | **CONFIRMED as intentional INTERNAL** (class E), correctly unadvertised |
| 14 | Hide exact scan numbers | **CONFIRMED as a control gap, not a hard-to-find setting** — no writer exists (G4) |

Net: of the map's 14, **8 confirmed as-is**, **4 partially stale**, **1
correct-by-design (12)**, **1 reclassified from hard-to-find to writer-less
(14)**. Two items the map did not list belong on it: **manual volume targets
(MEV/MAV/MRV)** and **the avatar**.

---

## 7. APPENDIX — SEEN / ONE-SHOT FLAGS (for Phase 11)

Excluded from the inventory per the order ("one-shot seen-flags"), recorded
here because Phase 11 (state-gated features) needs to know which surfaces can
be permanently extinguished. All are `@volyume_`-prefixed and therefore SYNC
unless noted.

**Teaching hints / walkthroughs (one-shot, harmless):**
`@volyume_seen_workout_info`, `@volyume_seen_unilateral_walkthrough`,
`@volyume_seen_diary_food_hint`, `@volyume_seen_diary_water_hint`,
`@volyume_seen_diary_markeaten_hint`, `@volyume_seen_diary_planadded_hint`,
`@volyume_seen_mealplan_dietary_chip`, `@volyume_seen_scan_baseline_receipt`,
`@volyume_seen_trends_start`, `@volyume_seen_coaching_nudge`,
`@volyume_seen_coach_adherence_why`, `@volyume_consistency_explainer_seen`,
`@volyume_whats_new_last_seen`, `@volyume_exact_alarm_prompted`.

**Card / banner dismissals (a consequential surface disappears):**
`@volyume_coach_banner_dismissed_<weekStart>`,
`@volyume_phase_banner_dismissed_v1`,
`@volyume_plateau_banner_dismissed_<...>`,
`@volyume_differential_banner_dismissed_<...>`,
`@volyume_free_coach_line_dismissed_<...>`,
`@volyume_trial_value_banner_dismissed_<uid>`,
`@volyume_home_activation_nudge_dismissed_<...>`,
`@volyume_brief_dismissed_date`, `@volyume_recap_card_<monthKey>`,
`@volyume_off_consent_card_dismissed_v1`, `@volyume_block_snooze` (time-boxed,
inventoried above as a real setting).

**Permanent opt-outs with NO undo (flagged in §4 #15):**
`photo_prompt_optout` (**no `@volyume_` prefix → never syncs**),
`@volyume_partner_reconnect_dismissed_v1`.

**Milestone / celebration "seen" ledgers:**
`@volyume_milestones_v1_<uid>`, `@volyume_streak_v1_<uid>` (also holds the two
real settings inventoried above), `@volyume_tonnage_v1_<uid>`,
`@volyume_partner_moments_seen_v1`, `@volyume_partner_moments_shown_v1`,
`@volyume_partner_moments_pb_v1`, `@volyume_photo_prompt_shown_v1`,
`@volyume_progress_scan_recalibration_seen_ids`,
`@volyume_progress_scan_meaning_moment_seen`, `@volyume_year_of_lifts_notified`,
`@volyume_recap_notified_<...>`, `@volyume_trial_end_gate_shown_<...>`,
`@volyume_home_welcome_<...>`.

**Not settings, not seen-flags — excluded entirely (internal state):** seed and
schema-version flags (`@volyume_exercises_seeded_v7`,
`@volyume_routines_seeded_v12`, `@volyume_exercise_library_topped_up_v3`,
`@volyume_exercise_metadata_backfilled_v1`,
`@volyume_exercise_metadata_rederived_v2`, `@volyume_cofid_snapshot_loaded_v1`,
`@volyume_off_snapshot_loaded_v1`, `@volyume_body_metric_seeded_<uid>`),
sync cursors and watermarks (`@volyume_pull_wm_*`, `@volyume_push_wm_*`,
`@volyume_food_last_pushed_*`, `@volyume_food_last_pulled_*`,
`@volyume_food_library_pull_*`, `@volyume_pref_written_at_*`), caches and
drafts (`@volyume_active_workout`, `@volyume_setdraft_*`,
`@volyume_pro_onboarding_draft*`, `@volyume_widget_snapshot_v1`,
`@volyume_plan_whythis_<uid>`, `@volyume_palette_recents`), diagnostics
(`@volyume_error_log*`, `@volyume_crash_log`, `@volyume_last_crash_meta*`,
`@volyume_clean_shutdown_v1`), identity/entitlement state
(`@volyume_tier`— inventoried, `@volyume_trial_state`,
`@volyume_pro_trial_ends_at`, `@volyume_paid_verified_at`,
`@volyume_first_run_complete*`, `@volyume_last_supabase_user_id`,
`@volyume_local_user_id`, `@volyume_health_consent_*`), win-back / attribution
(`@volyume_winback_*`, `@volyume_first_touch_source`), partner plumbing
(`@volyume_partner_beats_v1_*`, `@volyume_partner_wk_*`,
`@volyume_pending_partner_code`), and transport state
(`@volyume_expo_push_token`, `@volyume_notif_tz_offset`,
`@volyume_off_writeback_queue_v1`, `@volyume_feedback_*`).

---

## 8. STOP-AND-REPORT ITEMS (ambiguity surfaced, not resolved)

1. **G4 `hide exact scan numbers`** — a pinned guard test forbids the
   progress-photos screen from calling the setter, which reads as deliberate
   fixed behaviour; but the setter exists and the key syncs. Founder ruling
   required before Phase 8 classifies it.
2. **G6 Nutrition-targets Sex field** — resolving this touches ED-safety
   framing (which sex the displayed calorie floor was computed from). Any fix
   is safety-adjacent and must be lead-ruled, not agent-decided.
3. **§4 #3 dead `applyNotifications` path** — deleting it, wiring it, or
   moving the SQLite mirror into `CoachingRemindersScreen` are three different
   product answers. The code carries an explicit "not deleting notification-
   scheduling code on a guess" note (`NotificationSettingsScreen.js:363-366`);
   this audit has not touched it.
4. **§4 #13 check-in hour 12:00** — fixing it means either widening
   `HOURS_EVENING` or changing what onboarding writes. Both change a live
   user's reminder time, so it is a product decision, not a bug fix.
5. **Counting basis** — the map's 98/93 mixed settings with actions and
   navigation rows. §3 gives both bases so the delta is auditable either way;
   if the founder wants a single canonical number, the recommended one is
   **83 live user-configurable settings**.
