# MFP Settings & Configuration — Competitive Mastery Map

**Date:** 2026-06-29
**Area:** Settings & configuration (the surface the founder says was never properly mapped)
**Sources:** MFP decompiled corpus
(`/tmp/.../scratchpad/mfp/corpus/screens_components.txt`,
`dex_strings_raw.txt`) and decoded res
(`/tmp/.../scratchpad/mfp/mfp_decoded/res`). VOLYUME source read directly under
`/home/user/ADPhysique/src`.

**Honest-source note.** MFP's `res/values/strings.xml` in this decode is a
4-line stub (stripped); the only recoverable string evidence is
`dex_strings_raw.txt`. That file's richest single artifact is a **test-fixture
user row** (a seeded `users` insert) that serialises MFP's *entire*
preferences schema as JSON — this is CONFIRMED ground truth for the data model.
UI option *labels* are reconstructed from resource-id keys
(e.g. `diary_sharing_friends_only`, `adjust_goal_kilojoules`) and class names;
where I only have the key and not the rendered string I mark INFERRED. Settings
layouts are mostly Jetpack-Compose (no XML), so layout files are not recoverable
— this is stated, not papered over.

---

## 1. Complete MFP Settings / Config Inventory

The settings host is `com/myfitnesspal/feature/settings/ui/activity/SettingsActivity`
(CONFIRMED). The preferences data model (CONFIRMED, from the seeded test user row
in `dex_strings_raw.txt`) is:

```json
unit_preferences: {"distance":"kilometers","energy":"calories","height":"inches","weight":"pounds"}
privacy:          {"diary_visibility":"friends","friend_visibility":true,"profile_visibility":"members"}
goal_preferences: {"daily_step_goal":0,"diary_goal_display":"energy_breakdown",
                   "home_goal_display":"energy_breakdown","macro_goal_format":"grams",
                   "weekly_exercise_energy":{...},"weekly_workout_duration":0,
                   "weight_change_goal":{...},"weight_goal":{...},"workouts_per_week":0}
diary_preferences:{"display_diary_meal_macro":false,"enable_negative_adjustment":false,
                   "meal_goals_enabled":false}
notifications:    {"activity_notify_by_email":[...15 events...],
                   "activity_notify_by_push":[...17 events...],
                   "auto_reminder_opt_out":false,"system_emails":["login_reminders","ua_gear"]}
location:         {"city","country_code","locale","postal_code","state","time_zone"}
```

### A. Units & display
| Setting | Controls | Options / values | Evidence | Status |
|---|---|---|---|---|
| **Units of measurement** | Master unit prefs | `unit_preferences` JSON object | fixture row; `UnitsDialogFragment`, `units_dialog`, `unit_switcher` | CONFIRMED |
| Energy unit | kcal ⇄ kJ across whole app | `calories` / `kilojoules` | fixture `"energy":"calories"`; 268 `kilojoules` keys incl. `adjust_goal_kilojoules`, `common_kilojoules_abbreviation`, `custom_goal_energy_type_kilojoules`, `breakdown_daily_kilojoules` | CONFIRMED |
| Weight unit | Body/weight display | `pounds` / `kilograms` / `stones` (Imperial/Metric/UK) | fixture `"weight":"pounds"`; `WeightUnit` (66 hits) | CONFIRMED (pounds in fixture; kg/st INFERRED from `WeightUnit` enum) |
| Height unit | Height display | `inches` / `centimetres` | fixture `"height":"inches"`; `HeightUnit_ResponseAdapter` | CONFIRMED |
| Distance unit | Cardio/steps distance | `kilometers` / `miles` | fixture `"distance":"kilometers"`; `DistanceUnit` | CONFIRMED |
| **Appearance / theme** | Light/Dark/System | `AppearanceActivity`; `dark_mode`, `theme_setting`; `DarkThemeActivityLauncherActivity`/`LightThemeActivityLauncherActivity`/`ThemedActivity` | CONFIRMED (class) / option labels INFERRED |
| Locale override | Language | `LocaleOverrideActivity`, `locale_override` (debug-ish) | CONFIRMED class |

### B. Goals & nutrition
| Setting | Controls | Options / values | Evidence | Status |
|---|---|---|---|---|
| **Goals home** | Weight, calorie, macro, activity goals | `GoalsActivity` / `GoalsScreen` | CONFIRMED |
| Weight goal + weekly rate | Goal weight, change/wk | `weight_goal`, `weight_change_goal` | `WeightGoalDialogFragment`, `WeightLossGoalDialog` | CONFIRMED |
| Activity level | BMR multiplier | sedentary…active | `ActivityLevelDialogFragment`; fixture `activity_factor:"sedentary"` | CONFIRMED |
| Calorie goal adjust | Edit daily kcal | `AdjustCalorieGoalDialog`; `adjust_goal_calories`/`_kilojoules`, `adjust_goals_no_thanks` | CONFIRMED |
| Macro goals | Carb/fat/protein split | by **grams** or **percent** | `MacroGoalEditorActivity`, `EditMacroGoalsByGramsFragment`/`ByPercentFragment`; `macro_goal_format:"grams"` | CONFIRMED |
| Custom daily goals (by day) | Per-weekday goals | `CustomGoalByDayActivity`, `NetEnergyGoalDialogFragment` | CONFIRMED |
| **Meal goals** | Split daily goal across meals | on/off + per-meal | `MealGoalsFragment`/`Activity`; `meal_goals_enabled`, `calorie_goals_by_meal_enabled` | CONFIRMED |
| Additional nutrient goals | Fibre/sugar/sodium etc. | `AdditionalNutrientGoalsActivity` | CONFIRMED |
| Exercise-calorie handling | How exercise kcal feed goal | `enable_negative_adjustment`; `CustomExerciseCaloriesActivity`, `ExerciseCaloriesFragment`, `exercise_calories_radio` | CONFIRMED |
| **Weekly nutrition settings** | Weekly vs daily goal view | `WeeklyNutritionSettingsFragment`, `weekly_nutrition_settings` | CONFIRMED |
| **Nutrient dashboard settings** | Which nutrients on home/diary cards | presets: `energy_breakdown`, `macros_remaining`, `heart_healthy_remaining`, `low_carb_remaining`, `custom_goal_display` + custom | `NutrientDashboardSettingsActivity`, `NutrientDashboardPresetSelectionFragment`, `CustomNutrientDashboardSelectionFragment`; fixture goal_displays array | CONFIRMED |
| Net carbs mode | Track net vs total carbs (Premium) | on/off | `track_net_carbs`, `diary_setting_track_net_carbs_toggled`, `net_carbs_lock` (Premium-gated) | CONFIRMED |
| **Steps settings** | Step goal + source | `daily_step_goal`, source = device/Google Fit | `StepsSettingsFragment`, `step_source`/`step_sources`, `steps_from_device`, `steps_goal_edit_text` | CONFIRMED |

### C. Diary
| Setting | Controls | Options / values | Evidence | Status |
|---|---|---|---|---|
| **Diary settings** | Diary behaviour hub | `DiarySettingsFragment`/`DiarySettingsActivity` | CONFIRMED |
| Show all foods / quick tools | Show every food vs filtered | on/off | `diary_settings_show_all_foods_title/_subtext`, `diary_quick_tools_dialog` | CONFIRMED |
| Show food timestamps | Time-of-log on entries | on/off | `diary_settings_show_food_timestamps`, `show_food_timestamps`, `TimestampOptionsDialog` | CONFIRMED |
| Display meal macros | Per-meal macro line in diary | on/off | `display_diary_meal_macro`, `diary_meal_goal_card` | CONFIRMED |
| Diary notes | Daily / per-meal notes | `diary_note`, `diary_notes`, `NoteTypeDialogFragment` | CONFIRMED |
| **Custom meal names** | Rename Breakfast/Lunch/etc. | free text per meal | `CustomMealNamesActivity`, `EditMealNameDialog`, `custom_meal_names_settings` | CONFIRMED |
| Diary password / lock | Lock diary behind PIN | `diary_password`, `DiaryPasswordDialog`, `PinCodeDialogFragment` | CONFIRMED |
| **Diary sharing** | Who sees your diary | **Public / Friends only / Private / Locked-with-key** | `diary_sharing_public`/`_friends_only`/`_private`/`_locked_with_key`/`_community`; fixture `diary_visibility:"friends"` | CONFIRMED |

### D. Reminders & notifications
| Setting | Controls | Options / values | Evidence | Status |
|---|---|---|---|---|
| **Reminders** | Local reminders hub | `RemindersActivity`/`RemindersFragment`, `AddEditReminderActivity`, `SelectReminderTypeActivity` | CONFIRMED |
| Meal reminders | Per-meal nudge | Breakfast / Lunch / Dinner / Snack / **custom meal** | `reminder_breakfast`/`_lunch`/`_dinner`/`_snack`/`_custom_meal`, `reminder_time` | CONFIRMED |
| Weigh-in reminder | Weight-log nudge | `reminder_weight` | CONFIRMED |
| Reminder frequency | How often | 1 / 3 / 7 days | `reminder_any_item_one_day`/`_three_days`/`_seven_days`, `ReminderFrequencyDialogFragment`, `reminder_interval_in_days` | CONFIRMED |
| Day-of-week picker | Which days | `DayOfWeekDialogFragment` | CONFIRMED |
| **Push notifications** | 17 social/system push events | per-event opt-in/out | `activity_notify_by_push` array (message_received, wall_post, friend_request, status_like, friend_logged_workout, friend_steps_progress, login_streak, challenge events…) | CONFIRMED |
| **Email notifications** | 15 email events | per-event | `activity_notify_by_email` array; `EmailSettingsListFragment` | CONFIRMED |
| System emails | Login reminders, gear | `system_emails:["login_reminders","ua_gear"]` | CONFIRMED |
| Auto reminder opt-out | Master reminder kill | bool | `auto_reminder_opt_out` | CONFIRMED |
| Notification channels (Android) | OS channels | reminders / messages / invitations / generics / url_handlers | `notification_channel_*` keys | CONFIRMED |

### E. Account & privacy
| Setting | Controls | Evidence | Status |
|---|---|---|---|
| Profile (My Info) | Name, sex, height, weight, DOB, country, postcode, timezone | `MyInfoFragment`, `ProfileDialogFragment`, `GenderDialogFragment`, `HeightDialogFragment`, `CountryDialogFragment`, `ZipcodeDialogFragment`, `TimezoneDialogFragment` | CONFIRMED |
| Change password | `ChangePasswordActivity`, `change_password` | CONFIRMED |
| Change email | `change_email`, `EDIT_EMAIL_ADDRESS` | CONFIRMED |
| **Sharing & Privacy** | diary/friend/profile visibility | `SharingAndPrivacySettingsListFragment`, `sharing_and_privacy`; fixture `profile_visibility:"members"`, `friend_visibility:true` | CONFIRMED |
| Privacy Center | Consents view/withdraw | `PrivacyCenterActivity`, `privacy_center_consents_withdraw` | CONFIRMED |
| Do Not Sell (CCPA) | Opt out of data sale | `DoNotSellActivity` | CONFIRMED |
| GDPR help | Data-subject requests | `GDPRHelpActivity` | CONFIRMED |
| Consents / Sourcepoint | Ad/tracking consent | `ConsentsActivity`, `SourcepointConsentsActivity` | CONFIRMED |
| Delete account | + Premium variant | `DeleteAccountActivity`, `DeleteAccountPremiumActivity` | CONFIRMED |
| Privacy policy | `privacy_policy` | CONFIRMED |

### F. Connected apps & devices
| Setting | Controls | Evidence | Status |
|---|---|---|---|
| **App Gallery** | 3rd-party app/device marketplace | `AppGalleryActivity`, `AppsHomeFragment`, `AppDetailFragment` | CONFIRMED |
| Google Fit | Steps/exercise sync | `GoogleSettingsActivity`, `GoogleFitPermissionsFragment` | CONFIRMED |
| Friends / social | Friends, requests, messages, invites | `FriendsActivity`, `AddFriendsParentActivity`, `MessagesActivity`, `InviteFriendActivity` | CONFIRMED |
| GLP-1 settings | Medication logging + reminders | `GLP1SettingsActivity`, `glp1_settings_*` | CONFIRMED |
| Intermittent fasting | Fasting schedule | `FastingSettingsActivity`, `fasting_settings` | CONFIRMED |

### G. Data
| Setting | Controls | Evidence | Status |
|---|---|---|---|
| **File export** | Diary CSV over a period | `FileExportActivity`, `FileExportReportingPeriodSelectionDialog`, `file_export_*` | CONFIRMED |
| Export my information (GDPR) | Full data export to email | `export_my_information`, `export_your_data`, `export_data_request_made` | CONFIRMED |
| Troubleshooting | Sync repair / clear cache | `TroubleshootingActivity`, `SyncSettingsDebugActivity` | CONFIRMED |

---

## 2. VOLYUME's Settings Today (file refs)

Landing hub `src/screens/SettingsScreen.js` → 8 sub-pages + an inline
**Workout & units** block. All sub-screens live in `src/screens/`.

| VOLYUME setting | Where | What it does |
|---|---|---|
| **Account** | `SettingsAccountScreen.js` | Email, plan (Pro/Free), Subscription→billing, Go Pro / Switch to Free, Sign out, Delete account |
| **Profile** | `SettingsProfileScreen.js` | First name (free text), Diet preference (Omnivore/Vegetarian/Vegan). *Body-weight/gym/bar units intentionally removed here* |
| **Coaching** | `SettingsCoachingScreen.js` | Calmer experience (ED-safety), Daily step target on/off + steps-a-day number (Pro), Cardio on/off (Pro), **Coaching tone** Automatic/Supportive/Precise (Pro), **Show the science** (Pro), Cycle tracking (female profiles) |
| **Notifications hub** | `SettingsNotificationsScreen.js` | → Training reminders (Free), Coaching reminders (Pro) |
| **Training reminders** | `NotificationSettingsScreen.js` | Morning-weight reminder (Pro), Weekly check-in day+time (Pro), Training reminders with preset times `06:00…20:00` and per-day schedule; mirrors to SQLite `notification_preferences` |
| **Display & accessibility** | `SettingsDisplayScreen.js` | **Appearance** Dark/Light/Match-phone (free), **Larger text**, **Higher contrast**, **Colour-blind safe palette** (Okabe-Ito), **Reduce motion** |
| **Health** | `SettingsHealthScreen.js` | Per-scope Apple Health / Health Connect: read weight, read steps, read cardio (Pro), write workouts, Sync now, open system Health settings |
| **Your data** | `SettingsDataScreen.js` | Cloud sync (manual), Refresh food library, Import from Hevy/Strong, Back up everything (JSON), Restore from backup, Restore a snapshot, Export workout log (CSV), Clear workout history |
| **Privacy & legal** | `SettingsPrivacyScreen.js` | Health-data consent withdraw, Share scanned labels with Open Food Facts (opt-in), Share usage data (analytics opt-out), Privacy Policy |
| **Help & about** | `SettingsAboutScreen.js` | Send feedback, Rate Volyume, Credits, version (long-press → debug log) |
| **Workout & units (inline)** | `SettingsScreen.js` | Body-weight unit **Stone/Kg/Lbs**, Default rest timer (±15s stepper), Auto-start rest timer |

Prefs/store: `src/store/useAppStore.js` (`bodyWeightUnits` default `'st'`,
`setDefaultRestSeconds`, `setAutoStartRestTimer`, `setAccessibilityPref`,
`setAnalyticsOptOut`, `setDietPreference`, `coachTone`, `showScience`,
`stepsTarget`/`stepsEnabled`/`cardioEnabled`). Accessibility token engine:
`src/styles/theme.js` `applyAccessibility()` (light/dark + HC + CVD tables +
larger-text fontSize swap). Meal slots: `src/lib/food/mealSlots.js` (fixed
"Meal N" ladder + legacy names + Pre/Post-workout — **not renameable**,
`mealsPerDay` is a fixed default of 4, no setting).

**Energy unit:** VOLYUME parses kJ from labels (`src/lib/food/ocrParser.js`)
but exposes **no user kcal/kJ display toggle** — calories are kcal-only app-wide.

**Diary sharing / social / friends:** none exist (correct under EU/no-PII).

---

## 3. Gaps — ranked

1. **Energy unit kcal/kJ display toggle** — `[SAFE-TO-BUILD]`. MFP has it as a
   first-class unit; VOLYUME already ingests kJ but only ever shows kcal. A UK
   audience reads food labels in kJ. Adherence-neutral, no PII, offline. **This
   is the single highest-leverage safe addition (see §5).**
2. **Renameable / custom meal names** — `[SAFE-TO-BUILD]`. MFP
   `CustomMealNamesActivity`. VOLYUME meal slots are fixed strings in
   `mealSlots.js`. A label override map is small, offline, ED-neutral.
3. **Configurable meals-per-day** — `[SAFE-TO-BUILD]`. `DEFAULT_MEALS_PER_DAY=4`
   is hard-coded; physique users run 4–8. A simple stepper, no safety/PII concern.
4. **Per-meal reminders (Breakfast/Lunch/Meal N at time X)** — `[SAFE-TO-BUILD]`.
   VOLYUME has training + coaching reminders but no meal-time nudges. Local
   notifications only, offline. Keep **streak-free** (no "logging streak" copy).
5. **Body-metrics / goal editing reachable from Settings** — `[SAFE-TO-BUILD,
   with care]`. MFP edits height/sex/weight/activity/goal from Settings; VOLYUME
   routes only through onboarding / `ProGoalSetupScreen` / `GoalChangeSummaryScreen`.
   A "Body & goals" settings entry that *links* the existing goal-change flow is
   safe **provided every change still passes through the ED-safety gates in
   `nutritionEngine.js`/`weeklyCoach.js`** — do not add a raw goal-weight field
   that bypasses them.
6. **Height/distance unit choice (cm/inch, km/mile)** — `[SAFE-TO-BUILD, low value]`.
   MFP exposes these; VOLYUME is UK-metric by design (gym kg-only). Body-weight
   already has st/kg/lbs. Low priority.
7. **Nutrient-dashboard / which-macros-shown customisation** — `[GATED]`.
   Plausible but nutrition display is Pro and touches the coaching dashboard;
   needs a deterministic-coaching review before scoping.
8. **Net-carbs mode** — `[GATED]`. MFP Premium feature; for VOLYUME this is a
   coaching/nutrition-engine decision, not a free toggle. Founder-gated.
9. **Diary password / app lock (PIN/biometric)** — `[GATED]`. Privacy-positive
   and offline, but it's a security surface; scope deliberately, not as a quick win.
10. **Diary sharing / public diary / friends / messages** —
    `[BLOCKED-BY-PRIVACY-RULE]`. MFP's entire social settings block
    (`diary_visibility`, `profile_visibility`, friends, wall posts, challenges,
    17 social push events) leaks PII and is squarely against EU/no-PII. **Do not build.**
11. **Connected 3rd-party app gallery / Google Fit marketplace / GLP-1 medication
    cloud** — `[BLOCKED-BY-PRIVACY-RULE]` for anything that ships data to a third
    party. VOLYUME's device-health integration (Apple Health / Health Connect,
    read-only, on-device) is the compliant equivalent and already exists.
12. **Per-event email/push notification matrix + system marketing emails** —
    `[BLOCKED-BY-PRIVACY-RULE for the social/marketing events]`. The login-reminder /
    "gear" / friend-activity events are engagement/PII surfaces VOLYUME deliberately
    omits.

---

## 4. Where VOLYUME beats MFP

- **Accessibility depth.** VOLYUME ships **Higher contrast**, **Colour-blind safe
  palette** (Okabe-Ito, theme-keyed light+dark CVD tables), **Larger text**
  (fontSize token swap), and **Reduce motion** — all *free*, with computed WCAG
  ratios asserted in `theme.test.js`. MFP's recoverable settings show only a
  light/dark `AppearanceActivity`; no contrast/CVD/motion controls surfaced.
  (`src/styles/theme.js` `applyAccessibility`, `SettingsDisplayScreen.js`.)
- **Data ownership.** Full **JSON backup + restore + automatic pre-update
  snapshots + CSV export**, all working **offline with no account**
  (`SettingsDataScreen.js`). MFP export is server-side CSV / GDPR-request only.
- **ED-safety as a setting.** "Calmer experience" drops aggressive targets and
  quietens prompts; tier-blind by design. MFP has nothing equivalent.
- **Coaching tone + opt-in science layer** — register control over the coach's
  prose with safety copy held identical. No MFP analogue.
- **Honest, scoped health integration.** Per-scope read/write toggles, read-only
  by default, "everything else stays on this device." MFP funnels users into a
  3rd-party app gallery.
- **No streaks / no social pressure** anywhere in settings — a deliberate
  adherence-neutral stance MFP's notification matrix is built to violate.

---

## 5. Single highest-leverage SAFE settings addition

**Add an energy-unit toggle (kcal ⇄ kJ) in Display, app-wide.**

Why this one: it is the one genuinely missing *display* preference that a UK
audience expects (food labels are primarily kJ here), MFP treats it as a
first-class unit, and **VOLYUME already parses and stores kJ** in
`src/lib/food/ocrParser.js` — the data path exists; only the display formatter
and one stored pref are missing. It is:

- **`[SAFE-TO-BUILD]`** — purely a display unit; never changes a calorie *value*,
  so it cannot touch the floors (1,200/1,500 kcal), FFM floor, or rapid-loss gate
  in `nutritionEngine.js`. Store the user-facing unit; keep the engine in kcal.
- **ED-safety / adherence-neutral** — no targets, streaks, or nudges involved.
- **Offline-first, no PII** — a single local pref (mirror the `bodyWeightUnits`
  pattern in `useAppStore.js`).
- **Free, not Pro** — units are a display preference, like Appearance.

Implementation shape: add `energyUnit: 'kcal'|'kj'` to the store (default `kcal`),
a segmented control in `SettingsDisplayScreen.js` next to Appearance, and a
`formatEnergy()` helper that every kcal render site routes through. Guardrail:
the helper converts *for display only* — invariant test that the engine's
floor/gate inputs stay in kcal regardless of the toggle.
