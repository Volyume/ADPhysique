# Cronometer — Settings & Configuration Surface (Competitive Mastery)

**Date:** 2026-06-29
**Scope:** EVERY Cronometer setting / preference / unit / target-config / biometric-tracker /
profile / account / data-control. Mapped against VOLYUME's actual settings source.
**Method:** OBFUSCATED Flutter decompile — signal is from strings only. Sources:
`scratchpad/libapp_strings.txt` (1.7M), `scratchpad/cronometer/corpus/dex_strings_raw.txt`,
`nutrient_keys.txt`. Every Cronometer claim is tagged **CONFIRMED** (string present) or
**INFERRED** (deduced from adjacent strings / route names). Where unrecoverable, said so.
VOLYUME claims are from reading the actual source files (paths inline).

---

## PART 1 — COMPLETE CRONOMETER SETTINGS/CONFIG INVENTORY (grouped)

Cronometer's settings live under a `/settings` route tree with discrete sub-pages.
**CONFIRMED** route fragments: `/settings`, `/diarySettings`, `/energySettings`,
`/helpSettings`, `/macronutrientSettings`, `/nutrientTargets`. Top-level UI string
**CONFIRMED**: `"This can be adjusted in More > Display > Diary Settings."` → settings sit
behind a **"More"** tab, grouped into **Display**, **Energy**, **Macronutrient**, **Diary**,
**Account**, **Dashboard**, and integration pages.

### 1A. UNITS & MEASUREMENT
| Setting | Options | Evidence | Status |
|---|---|---|---|
| **Energy unit** | Calories (kcal) / Kilojoules (kJ) | `EnergyUnit`, `KILOCALORIE`, `Kilojoule (kJ)`, `Calories (kcal)`, `_buildEnergyDisplayRadio` (radio picker), localized `Kilojoules (Net)/(Burned)/(Consumed)` | **CONFIRMED** |
| **Unit system** | Metric / Imperial | `Metric`, `metric`, `Calories`, `Kilojoules`; weight in `Kilograms`/`Grams`; `EnergySettingsStonesWeightGoal` (stones support) | **CONFIRMED** (Metric label present; "Imperial" label itself not isolated — **INFERRED** as the pair) |
| **Weight unit** | kg / lb / **stones** | `Kilograms`, `EnergySettingsStonesWeightGoalState` | **CONFIRMED** (stones is a real, distinct option — matches UK) |
| **Body-fat %, glucose, serving units** | per-nutrient/biometric | `convertToGrams`, `_getIUToGramsConversion`, `Grams per Serving`, `PreferredUnit`, `convertToPreferredUnits`, `get:displayUnit` | **CONFIRMED** (a `PreferredUnit` system exists; granularity **INFERRED**) |

### 1B. ENERGY / CALORIE TARGET CONFIG (`/energySettings` — `EnergySettingsPage`)
| Setting | What it controls | Evidence | Status |
|---|---|---|---|
| **Weight Goal** | drives the daily energy target; pick goal + **rate** | `Set a Weight Goal`, `Select your weight goal rate`, `Weight Goal Deficit`, `Weight Goal Enabled`, `Show Weight Goal Overview` | **CONFIRMED** |
| **Custom Energy Target** | override the computed target with a fixed kcal/kJ value | `Custom Energy Target`, `CustomEnergyTargetToggle`, `"...overrides a weight goal"`, `"We have set your weight goal to Maintain"` (disabling it resets goal) | **CONFIRMED** |
| **Energy "burned" method** | how calories-out is computed | `EnergySettingsBurnedSection`; `Set your own fixed daily value for calories burned due to exercise`; **TEF** option: `"TEF is an estimate of the energy needed to digest your food... dynamically update your calories burned based on food logged"` | **CONFIRMED** |
| **Energy Budget** | net-energy framing | `Energy Budget`, `Kilojoules (Net)` | **CONFIRMED** |
| Show Energy Summary / History | dashboard readouts | `Show Energy Summary`, `Show Energy History`, `show energy summary` | **CONFIRMED** |

### 1C. MACRONUTRIENT TARGET CONFIG (`/macronutrientSettings`, `/nutrientTargets`) — **GOLD-gated**
| Setting | What it controls | Evidence | Status |
|---|---|---|---|
| **Target mode: Ratios (%)** | split energy into P/C/F by percentage; auto-scales with weight | `Macro Ratios`, `MacroTemplateRatio`, `"Ratios divides energy into protein, carbs, and fat. As your weight changes, so do your targets to keep ratios steady."`, `usePercentForMacroTargets`, `macroRatioPercent`, `targets.macros.percent` | **CONFIRMED** |
| **Target mode: Fixed Values (grams)** | set absolute gram targets per macro | `Use Custom Targets instead of DRIs`, `'Fixed Values' mode`, `Grams`, `_setTarget`, `CustomTargetSetter` | **CONFIRMED** |
| **Legacy ratio presets** | Zone / Even / Paleo / LFRV (now folded into "Macro Ratios") | `"You have previously chosen Zone, Even, Paleo or LFRV macro settings: These are now all under... Macro Ratios"` | **CONFIRMED** |
| **Macro Target Templates** | create named target sets | `MacroTargetTemplate`, `MacroTargetTemplate.defaultTemplate`, `Default Macronutrient Targets` | **CONFIRMED** |
| **Macro Target Scheduler (per weekday)** | assign a template to each day of the week | `Macro Target Scheduler settings`, `"Set different macro targets for each day of the week."`, `macro_target_scheduler_landing.dart`, `updateMacroTemplateForDay`, `"schedule your targets for each day of the week"` | **CONFIRMED** (**Gold:** `Schedule macronutrient targets with Cronometer Gold!`) |
| **Custom Energy Target ↔ macro link** | align fixed macros to an energy target | `"Add a Custom Energy Target to align your fixed macro targets..."` | **CONFIRMED** |

### 1D. NUTRIENT TRACKING / DISPLAY (`NutrientSettings`)
| Setting | What it controls | Evidence | Status |
|---|---|---|---|
| **Full DRI/RDA nutrient panel** | ~80+ nutrients tracked vs USDA DRIs | `"...your intake compared to the USDA Dietary Reference Intakes (DRIs) for an average person of your age and gender."`, `(RDA)`, `nutrient_keys.txt` (POTASSIUM, VITAMIN_A/C/D/E/K, sodium, dietaryFiber, vitaminB6 …) | **CONFIRMED** |
| **Custom Targets vs DRIs (per nutrient)** | override any nutrient's target | `Use custom values instead of DRIs`, `NutrientTargetEditor`, `Error saving nutrient target` | **CONFIRMED** |
| **Restore Fixed Values → RDAs** | reset all custom nutrient targets | `"...restore your Fixed Values to the Recommended Dietary Allowances? This cannot be undone."` | **CONFIRMED** |
| **Highlighted Nutrients** | choose which nutrients pin to the top / dashboard gauges | `Highlighted Nutrients`, `Highlighted Nutrient Targets`, `Selected Highlighted Nutrients`, `LockHighlightedNutrients` (Gold lock), `_showNutrientGauges` | **CONFIRMED** |
| **Show Macronutrient Breakdown** | toggle macro breakdown view | `Show Macronutrient Breakdown`, `ShowMacronutrientsBreakdown` | **CONFIRMED** |
| **Water nutrient target** | track water as a nutrient | `Show total water nutrient target bar`, `"...contribute to your total water nutrient target"` | **CONFIRMED** |

### 1E. DIARY SETTINGS (`/diarySettings`, `DiarySettingsTile`)
| Setting | What it controls | Evidence | Status |
|---|---|---|---|
| **Diary Groups** | rename/reorder meal groups (Breakfast etc.) | `Diary Group`, `Diary Groups`, `Diary Group Settings`, `"Diary Groups and Timestamps are features for Cronometer Gold"` | **CONFIRMED** (**Gold**) |
| **Timestamps** | show log time per entry | `diary_timestamps_switch_tile.dart` | **CONFIRMED** (**Gold**) |
| **Sort foods** | order within a group | `get:sortFoods`, `set:sortFoods` | **CONFIRMED** |
| **Show completed days / streak** | completion + streak display | `showCompletedDialog`, `CurrentDiaryStreak`, `DashboardStreaksSettingsTile` | **CONFIRMED** |
| **Copy Yesterday's Group** | duplicate a meal group | `Copy Yesterday's Group`, `DiaryCopyBuffer` | **CONFIRMED** |
| **Galveston Diet** | menopause-diet diary mode | `Enable Galveston Diet Settings`, `Galveston Diet Settings` | **CONFIRMED** |

### 1F. BIOMETRIC TRACKER CONFIG
| Setting | What it controls | Evidence | Status |
|---|---|---|---|
| **Custom Biometrics** | create a tracker with a **name + unit** | `Add Custom Biometric`, `+ Custom Biometric`, `Biometric Name`, `Biometric Unit`, `"delete the custom biometric"` | **CONFIRMED** |
| **Built-in biometrics** | weight, body-fat %, glucose, BP, sleep, HR… | `BiometricEntry.fromHealthConnectBloodPressure/Sleep`, `Fasting Blood Glucose Maximum`, `CGM Chart Settings` | **CONFIRMED** |
| **CGM / glucose charts** | continuous-glucose display | `CGM Chart Settings`, `CgmChartSettingsState`, `CGM Charts by Dexcom` | **CONFIRMED** |

### 1G. FASTING CONFIG (**Gold**)
| Setting | Options | Evidence | Status |
|---|---|---|---|
| **Enable Fasting / timer** | on-off, live timer | `Enable Fasting`, `Fasting Timer`, `Fasting is a feature for Gold subscribers.` | **CONFIRMED** |
| **Fasting Reminder** | notification | `Fasting Reminder`, `Could not set up Fasting notifications` | **CONFIRMED** |
| **Show fasting on Dashboard / Diary** | overlay display | `Show Fasting on Dashboard`, `Show Fasting on Diary`, `"...displayed as teal colored overlays"` | **CONFIRMED** |
| Specific fast window (16:8 etc.) | — | NOT isolable in strings | **UNRECOVERABLE** (timer + periods exist; preset windows not provable from strings) |

### 1H. NOTIFICATIONS / REMINDERS
| Setting | What it controls | Evidence | Status |
|---|---|---|---|
| **Per diary-group reminders** | enable + set time per meal group | `"Choose to enable notifications for specific diary groups and set the reminder time."`, `Diary Group Reminders` | **CONFIRMED** |
| **Add Reminder** | arbitrary food/log reminders | `+ Add Reminder`, `Allow reminders`, `Could not set up Log Food notification time` | **CONFIRMED** |
| **Repeating foods schedule** | auto-log favourites on chosen days | `"Set your favourite foods, drinks, and supplements to repeat on specific days..."` | **CONFIRMED** |
| Fasting reminder | see 1G | — | **CONFIRMED** |

### 1I. PROFILE / BODY METRICS
| Setting | Options | Evidence | Status |
|---|---|---|---|
| **Profile Details** | gender, DOB, height, weight | `Profile Details`, `PROFILE_DETAILS`, `SignupProfileDetailsPage`, `GENDER`/`Gender` | **CONFIRMED** |
| **Gender (incl. trans guidance)** | male/female + transgender note | `"*Until nutrition guidelines for transgender individuals are established, we recommend selecting the gender..."` | **CONFIRMED** |
| **Activity Level** | sedentary→very active (+ comatose tier) | `Activity Level`, `Baseline Activity Level`, `Set an Activity Level`, `How to Select an Activity Level`, `"Health professionals monitoring comatose patients should select this activity level."` | **CONFIRMED** |
| **Pregnant / Breastfeeding** | adjusts targets | `Pregnant`, `Breastfeeding`, `Lactating` | **CONFIRMED** |
| **Body-fat tracking for keto targets** | log BF% as biometric | `"For more accurate ketogenic targets, periodically log your actual body fat %..."` | **CONFIRMED** |

### 1J. ACCOUNT
| Setting | Evidence | Status |
|---|---|---|
| Account Settings page | `Account Settings`, `/subscriptionPage` | **CONFIRMED** |
| Change Email / Password | `Change Email`, `Change Password`, `ChangeEmailDialog`, `ChangePasswordScreen`, `Account Password` | **CONFIRMED** |
| Subscription (Gold) management | `subscription will auto-renew on a Monthly or Annual term... cancel under the Google Playstore settings` | **CONFIRMED** |
| Delete account | `Account Deleted` | **CONFIRMED** |
| Clear device data | `"Clears user data and settings saved to device, avoids the need to uninstall"` | **CONFIRMED** |

### 1K. DATA EXPORT / IMPORT
| Setting | Evidence | Status |
|---|---|---|
| Export to CSV (servings, nutrients, biometrics, exercises) | `text/csv`, `.csv`, `_exportNutrients`, `_exportBiometrics`, `runExport`, `NutrientMaker.toExportableNutrients`, `Export Food Calories` | **CONFIRMED** |
| Import from connected services | `Apple Health Importer`, `import data from Health Connect`, `canImportCycleData` | **CONFIRMED** |

### 1L. DISPLAY / DASHBOARD / THEME
| Setting | Evidence | Status |
|---|---|---|
| **Change Theme** | `Change Theme` (option labels NOT isolable — Light/Dark/System unprovable from strings) | **CONFIRMED toggle exists; options UNRECOVERABLE** |
| **Dashboard Settings (widgets)** | `Dashboard Settings`, `dashboardSettingsKey`, `"Activez les widgets dans dashboardSettingsKey..."`, `AppTourSettingsTile` | **CONFIRMED** |
| Calendar / date-order settings | `Calendar Settings`, `DatePickerDateOrder` | **CONFIRMED** |

### 1M. CONNECTED SERVICES (privacy-relevant — see Part 3)
**CONFIRMED** third-party connections: Apple Health, Health Connect, **Garmin**
(`/integration/garmin?oauth_token`), **Fitbit** (`Force syncing your fitbit data...`),
**Dexcom** (CGM), **Oura** (`/oura`), **Samsung Health**, **Withings/Polar** (**INFERRED** —
under generic `Connect Apps & Devices` / `Connected Devices`). Each is an OAuth bridge that
ships biometric PII to Cronometer's servers and to the partner.

---

## PART 2 — VOLYUME SETTINGS TODAY (actual source)

Landing: **`src/screens/SettingsScreen.js`** — category list → focused sub-pages, plus an
inline **"Workout & units"** block. Sub-pages confirmed by file.

### 2A. Units & workout (`SettingsScreen.js`)
- **Body-weight unit**: Stone / Kg / Lbs segmented control (`BODY_WEIGHT_UNIT_OPTIONS`, L12-16; setter `setBodyWeightUnits`). Comment: *"Gym weights stay kg-only by design (UK)."*
- **Default rest timer** (stepper ±15s) and **Auto-start rest timer** (switch) — L159-181.
- NO energy-unit (kcal/kJ) toggle. NO general unit-system toggle. Height entry is **ft/in only** (`NutritionTargetsScreen.js` L535-563), weight entry **kg only** (L566).

### 2B. Profile (`src/screens/SettingsProfileScreen.js`)
- First name (L33-49); **Diet preference**: Omnivore / Vegetarian / Vegan (`DIET_OPTIONS`, L9-13).
- Comment (L51-55): gym/body/bar weight rows were **removed at user request**; UK defaults gym+bar = kg.

### 2C. Coaching (`src/screens/SettingsCoachingScreen.js`) — mostly Pro-gated
- **Calmer experience** (free) — drops aggressive targets + quietens prompts (ED-safety lever).
- **Daily step target** (Pro) on/off + numeric, clamped 1,000–30,000 (L90-100).
- **Cardio** (Pro) on/off. **Coaching tone**: Automatic / Supportive / Precise. **Show the science** toggle.
- **Cycle tracking** — shown only when body profile sex = female.

### 2D. Nutrition targets (`src/screens/NutritionTargetsScreen.js`)
- Goal/phase: 6 options (`GOALS`, L42-49). Activity: 5 levels. Body-fat % + source (Visual/BIA/Caliper/DEXA).
- **Protein approach**: standard / optimised / advanced / **custom (g/kg)** (`PROTEIN_APPROACHES`, L806). Custom protein g/kg is a free-text input (L839-849).
- **Meals per day** 3–6 (`changeMealsPerDay`, L185). All flow through `calculateNutritionTargets` (engine floors enforced). GDPR consent gate before any body data is stored.

### 2E. Display & accessibility (`src/screens/SettingsDisplayScreen.js`)
- **Appearance**: Dark / Light / Match phone (`THEME_OPTIONS`, L12-16; FREE, never Pro-gated, COMP-029).
- **Larger text**, **Higher contrast**, **Colour-blind safe palette** (sky-blue/reddish-purple), **Reduce motion** — `setAccessibilityPref`. Most require a reload (handled by `promptRestartForA11y`).
- Backing tokens: **`src/styles/theme.js`** — WCAG AAA dark palette, computed light palette (`lightColors`), Okabe-Ito CVD palette, contrast ratios asserted in `theme.test.js`.

### 2F. Notifications (`src/screens/NotificationSettingsScreen.js`, `NotificationSettingsScreen` 726 lines)
- Morning-weight reminder (time), weekly check-in reminder (day + time, 7-day min gap), training reminders (preset times `TRAINING_PRESET_TIMES`). Per-category SQLite rows synced (migration 044).

### 2G. Your data (`src/screens/SettingsDataScreen.js`)
- Cloud sync (manual resync), Refresh food library, **Import from Hevy/Strong**, **Full JSON backup**, **Restore from backup**, **Restore a snapshot**, **Export workout log (CSV)**, **Clear workout history**. Note: *"no account required."*

### 2H. Privacy & legal (`src/screens/SettingsPrivacyScreen.js`)
- Health-data consent (withdraw), **Share scanned labels with Open Food Facts** (opt-in), **Share usage data** (analytics opt-out), Privacy Policy.

### 2I. Account (`src/screens/SettingsAccountScreen.js`)
- Email/plan readout, Subscription (billing, restore purchases), Go Pro / Switch to Free, Sign out, **Delete account**.

### 2J. Health (`src/screens/SettingsHealthScreen.js`, 313 lines) — Apple Health / Health Connect: weight, steps, workouts.

---

## PART 3 — GAPS (ranked; each tagged)

1. **Energy-unit toggle kcal ↔ kJ** — **[SAFE-TO-BUILD]**. Cronometer **CONFIRMED** (`EnergyUnit`, kJ everywhere). Pure display conversion, ED-neutral, offline, no PII. UK/EU users expect kJ. Lowest-risk, highest-coverage gap. **(See Part 5.)**
2. **Per-meal / per-group reminders** — **[SAFE-TO-BUILD]**. Cronometer has per-diary-group reminder times; VOLYUME only has morning-weight + weekly check-in + training. Local notifications, offline, no PII.
3. **Highlighted Nutrients / choose-which-nutrients-shown** — **[SAFE-TO-BUILD]**. Display-only preference; lets a user pin fibre/sat-fat/sodium. No safety interaction.
4. **Full micronutrient DRI panel + per-nutrient targets** — **[GATED]** by the *existing* 11–16 founder decision (micronutrients/NRV is item 16, explicitly decision-gated in CLAUDE.md). Do not start without the structured founder decision.
5. **Custom per-day macro scheduler / templates** — **[GATED]**. A weekday gram/% scheduler is fine in principle, BUT any custom gram or % target **must clamp to the engine floors** (1,500 kcal men / 1,200 women, FFM floor, fat ≥0.5 g/kg). A scheduler that lets a user dial a sub-floor day = ED-safety bypass. Build only with a clamp wired to `nutritionEngine` and invariant tests.
6. **"Custom Energy Target" (fixed kcal override)** — **[GATED]**. VOLYUME's custom protein g/kg already exists and routes through the engine; a fixed *energy* override is the dangerous one — it must clamp to `nutritionEngine` floors (cannot be set below 1,500/1,200, cannot bypass rapid-loss/max-safe-loss gates). Tier-blind per `proGate.js`.
7. **Custom biometric trackers (name + unit)** — **[SAFE-TO-BUILD]** in principle (local, offline), but low leverage for VOLYUME's bodybuilding focus; biometrics today are weight/BF%. Defer.
8. **Fasting config** — **[GATED]**. Intermittent-fasting timers risk colliding with ED-safety / adherence-neutral stance; the calorie-banking work (item 17) is the sanctioned adjacency. Needs founder decision before any fasting UI.
9. **Diary groups rename/reorder, timestamps, copy-yesterday** — **[SAFE-TO-BUILD]** (food-diary display, Pro). Moderate effort, modest leverage.
10. **Connected services (Garmin/Fitbit/Dexcom/Oura/Withings)** — **[BLOCKED-BY-PRIVACY-RULE]**. Every one is a third-party OAuth bridge that exports biometric PII off-device to partner servers. Directly violates the EU-residency / "No PII to any external service" architecture rule. Apple Health / Health Connect (on-device, already integrated) are the only sanctioned health bridges. Do not build these.

---

## PART 4 — WHERE VOLYUME ALREADY BEATS CRONOMETER

- **Accessibility depth.** VOLYUME ships **Larger text + Higher contrast + Colour-blind-safe (Okabe-Ito) palette + Reduce motion**, with WCAG ratios *computed and asserted in tests* (`theme.js` / `theme.test.js`). Cronometer's strings show only a bare `Change Theme` — no provable contrast/CVD/motion controls. **Decisive VOLYUME win.**
- **Theme.** Both have Dark/Light/System (VOLYUME's options are explicit and free; Cronometer's are unprovable from strings).
- **Safety-clamped targets.** VOLYUME's custom protein g/kg and every goal route through `calculateNutritionTargets` with floors baked in. Cronometer's `Custom Energy Target` and `Fixed Values` explicitly **override** the weight goal with no floor in the strings — VOLYUME's clamp is a genuine safety advantage, not a missing feature.
- **Data ownership.** VOLYUME: JSON full backup + restore + pre-update **snapshots** + CSV, **no account required**, all on-device. Cronometer's export is CSV but its backup/restore story is cloud-account-bound.
- **Privacy.** VOLYUME keeps health data on-device (EU residency, no PII out); Cronometer fans biometric PII to 5+ third parties.

## PART 5 — SINGLE HIGHEST-LEVERAGE SAFE SETTINGS ADDITION

**Energy-unit toggle: kcal ↔ kJ (with kJ as the EU-correct option).**
It is **[SAFE-TO-BUILD]** on every VOLYUME constraint: a pure display conversion
(×4.184), ED-neutral (floors unchanged — they stay 1,500/1,200 **kcal** internally; only the
label/format changes), offline, zero PII, free (display setting, never Pro-gated, mirrors the
Appearance precedent COMP-029). Cronometer treats it as a first-class setting and VOLYUME — a
UK/EU app — has no kJ support at all, despite kJ being the legally-mandated energy unit on EU
food labels. It slots beside the existing body-weight-unit segmented control in
`SettingsScreen.js`, reads from one new store pref, and applies at every kcal render site via a
single formatter. Highest coverage, lowest risk, clearest regional fit.

---
*Honest-source note:* Cronometer is **obfuscated** — claims rest on string presence. Where a
control's UI labels could not be isolated (theme option names; specific fasting windows; the
full enumerated nutrient list, which `nutrient_keys.txt` only partially exposes) it is marked
UNRECOVERABLE rather than guessed. VOLYUME claims are from reading the cited source files.
