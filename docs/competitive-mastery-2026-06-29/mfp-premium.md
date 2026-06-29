# MFP Premium — Complete Entitlement / Paywall / Nudge Mastery

Audit date: 2026-06-29. Area: everything behind MyFitnessPal's paywall — the
entitlement model, every Premium-gated feature, the paywall/upsell surfaces, and
the nudge system. Mapped against VOLYUME Pro.

## Honest-source note

Sources are an MFP decompiled Android build:
- `…/mfp/corpus/screens_components.txt` — class/screen list (read in full + grepped).
- `…/mfp/corpus/dex_strings_raw.txt` — a **deduplicated string/identifier table**
  (resource keys, class names, enum/member symbols), NOT key→value pairs. So the
  literal English paywall copy is largely **not recoverable** — the human strings
  live in a separate `strings.xml`/resources blob not present here. What IS
  recoverable, and is strong evidence, is the **resource-key namespace** (e.g.
  `premium_hub_feature_meal_scan`) and the **entitlement/feature symbol set**.
- `…/mfp/corpus/food_ui_copy.txt` — mostly DB schema/seed JSON; little upsell copy.

Where a key names a feature unambiguously it is marked **CONFIRMED**; where the
feature is implied by adjacent symbols it is **INFERRED**. The literal
`Feature` enum constant list is **obfuscated/unrecoverable** (the
`queryenvoy…entitlements/Feature` GraphQL enum members do not appear as plain
literals; only `Feature.MULTI_PROFILE` survived). This is stated honestly rather
than guessed.

---

## 1. MFP Premium — entitlement model + complete feature list (with evidence)

### 1a. The entitlement architecture (CONFIRMED)

MFP runs a **two-paid-tier** model, not one:

- `service/premium/data/PremiumStatus$PremiumPlus` — a `PremiumStatus` sealed
  type with a **PremiumPlus** branch (line 712463). Symbols `isPremium`,
  `isPremiumPlus`, `isPremiumPlusAvailable` (749909–749911); state strings
  `isPremium=`, `isPremiumPlus=` (703298–703299).
- Debug overrides prove three states: `enablePremiumOverride`,
  `enablePremiumPlusOverride`, `makePremiumPlusAvailableOverride`,
  `clearDevOverridePremium` → so tiers are **Free / Premium / Premium Plus**.
- GraphQL/queryenvoy entitlement layer: `SubscriptionEntitlement`,
  `SubscriptionTier`, `SubscriptionType`, `SubscriptionReason`,
  `GetSubscriptionSummaryQuery`, `UpsellSubscriptionsQuery` (screens 1053–1177).
- Domain model: `queryenvoy/domain/model/subscriptions/entitlements/`
  → `Feature`, `FeatureState`, `Tier`, `Entitlement` (648280, 776882–776886).
- Server-driven entitlements with a dev cache:
  `service/premium/subscription/data/repository/EntitlementsRepository(Impl)`,
  `service/premium/data/database/entitlements/EntitlementDevDAO/EntitlementDevData`,
  `app.premiumDevEntitlements`, `Active Entitlements Source:`, `DevEntitlements`,
  `Enable Dev Entitlement Override`, `addFeatureToDevEntitlements`,
  `updateTierForFeature`, `updateEntitlementForFeature` (the debug screens you
  named: `EntitlementsViewModel`, `EntitlementsListTestScreen`).
  → **Each feature carries a per-Feature Tier + FeatureState**; entitlement is
  granted **per-feature**, evaluated against the user's tier. This is a far more
  granular model than VOLYUME's binary `tier === 'pro'`.
- Payment surface: `UpsellSubscriptionsQuery`, `PurchaseSuccessActivity/Screen`,
  `ManageSubscriptionScreen`, `DowngradeConfirmationDialog`,
  `SubscriptionStatusActivity`, and `premium_payment_error_dialog_message_*`
  (backend_error / canceled / item_not_found / item_unavailable / network /
  unknown) — a full purchase/restore/downgrade flow.

### 1b. The Premium vs Premium-Plus comparison table (CONFIRMED — `premium_hub_compare_*`)

The `PremiumHubScreen` renders a two-column compare grid. Its row keys ARE the
gated feature taxonomy (`premium_hub_compare_*`, 661–679k region):

| Compare row key | Feature |
|---|---|
| `premium_hub_compare_ads` | Ad-free |
| `premium_hub_compare_barcode_scan` | Barcode scanning |
| `premium_hub_compare_macros` | Macros (gram/percent) |
| `premium_hub_compare_recipes` | Recipe import / collections |
| `premium_hub_compare_workouts` | Workout routines |
| `premium_hub_compare_intermittent` | Intermittent fasting |
| `premium_hub_compare_meal_plan` | Meal planning |
| `premium_hub_compare_grocery` | Grocery / shopping lists |
| `premium_hub_compare_download` | Offline / download |
| `premium_hub_compare_help` | Priority help/support |
| `premium_hub_compare_plans` | Plans |
| plus `premium_hub_compare_premium_column_width` / `…_premium_plus_column_width` | the two paid columns |

### 1c. Per-feature upsell tiles (CONFIRMED — `premium_hub_feature_*` + `_description`)

Each has a title key and a `_description` key (paired tiles in the hub):

- `premium_hub_feature_ad_free` (+desc) — **Ad-free**. CONFIRMED.
- `premium_hub_feature_barcode` (+desc) — **Barcode scan**. CONFIRMED.
- `premium_hub_feature_meal_scan` (+desc) — **Meal Scan** (AI photo→food). CONFIRMED.
- `premium_hub_feature_macros` (+desc) — **Macros by gram/percent**. CONFIRMED.
- `premium_hub_feature_recipes` (+desc) — **Recipe import/collections**. CONFIRMED.
- `premium_hub_feature_meal_plan` (+desc) — **Meal planning**. CONFIRMED.
- `premium_hub_feature_grocery` (+desc) — **Grocery lists / shop integration**. CONFIRMED.
- `premium_hub_feature_budget` (+desc) — **Budget-based meal planning**. CONFIRMED.
- `premium_hub_feature_download` (+desc) — **Offline access / download**. CONFIRMED.
- `premium_hub_feature_help` (+desc) / `premium_hub_feature_customer_support` — **Priority support**. CONFIRMED.
- `premium_hub_feature_intermittent` / `…_intermittent_fasting` (+desc) — **Intermittent fasting tracker**. CONFIRMED.
- `premium_hub_feature_strength` (+desc) — **Strength/workout tracking**. CONFIRMED.
- `premium_hub_feature_tracking` (+desc) — **Tracking (nutrient dashboards)**. CONFIRMED.
- `premium_hub_feature_share` (+desc) — **Share / export**. CONFIRMED.
- `premium_hub_feature_goals` — **Custom goals**. CONFIRMED.
- `premium_hub_feature_calories` — **Exercise-calorie / calorie settings**. CONFIRMED.
- `premium_hub_feature_nutrition` — **Nutrition (full nutrient set)**. CONFIRMED.
- `premium_hub_feature_workouts` / `_log` / `_scan` — workouts / logging / scan. CONFIRMED.

Hub framing keys: `premium_hub_go_premium`, `premium_hub_go_premium_plus`,
`premium_hub_premium_features_header`, `premium_hub_premium_plus_features_header`,
`premium_hub_premium_additional_features_header`,
`premium_hub_premium_plus_additional_features_header`,
`premium_hub_start_trial(_with_length)`, `premium_hub_start_meal_planning`,
`premium_hub_trial_billing_notice(_with_days)`, `premium_hub_non_play_store_title`.

### 1d. The other confirmed Premium-gated features (from feature symbols)

- **Meal Scan (AI photo logging)** — full `MealScan*` subsystem with
  `MealScanEntitled`, `MealScanAvailable`, `MealScanApiService` (sends image to a
  server). **CONFIRMED gated.**
- **Voice Logging (AI describe-your-meal)** — `VoiceLog*` with `VoiceLogEntitled`,
  `VoiceLogAvailable`, `VoiceLoggingAPIResult` (sends audio/text to a server).
  **CONFIRMED gated** — not in your known-features list; **a NEW finding**.
- **Food timestamps** — `premium_diary_settings_description_show_food_timestamps`,
  `FEATURE_TIMESTAMP_DIARY_SETTINGS`, `FEATURE_TIMESTAMP_ADD_FOOD`,
  `FEATURE_TIMESTAMP_TOOLTIP`, `TimestampOptionsDialog`, `MealPageHeaderTimestamp`.
  **CONFIRMED gated.**
- **Macros by gram & by percent** — `EditMacroGoalsByGramsFragment`,
  `EditMacroGoalsByPercentFragment`, `premium_meal_macro_unit`,
  `onUnlockMacrosClick`, `NutrientsByPercentDisplay`. **CONFIRMED gated.**
- **Custom Goals by Day** — `CustomGoalByDayActivity/Fragment`,
  `CUSTOM_CALORIE_MACRO_GOAL_BY_DAY`, `custom_calorie_macro_goal_by_day`,
  `MealGoalsActivity` (per-meal goals). **CONFIRMED gated.**
- **Additional / micronutrient nutrient goals** — `AdditionalNutrientGoalsActivity`,
  `NutrientGraphActivity`, custom nutrient dashboards
  (`NutrientDashboardSettingsActivity`, `CustomNutrientDashboardSelectionFragment`,
  `NutrientDashboardPresetSelectionFragment`). **CONFIRMED gated (nutrient dashboards).**
- **Verified / "verified-only" foods filter** — `VerifiedFoodsOnly`,
  `verifiedOnly`, `verifiedOnlyButton`, `ic_verified_food_*`. **CONFIRMED** as a
  premium food-search filter.
- **File Export (CSV)** — `FileExportActivity`, `FileExportReportingPeriodSelectionDialog`,
  `premium_upsell_premium_file_export_description_text`, `FileExportCtaViewed`.
  **CONFIRMED gated.**
- **Exercise-calorie settings** — `CustomExerciseCaloriesActivity`,
  `ExerciseCaloriesActivity`, `ExerciseGoalsDialogFragment`,
  `CalorieAdjustmentIntroActivity`, `premium_hub_feature_calories`. **CONFIRMED gated.**
- **Food / progress insights** — `premium_progress_insights`,
  `premium_progress_tracking`, `premium_progress_banner`, `FoodFeedbackActivity`.
  **CONFIRMED gated (insights/analytics).**
- **Intermittent fasting tracker** — `feature/intermittentfasting/*`,
  `ConfirmFastDurationActivity`, `MMDFastingViewModel`, `DiscardFastDialog`.
  **CONFIRMED gated.**
- **Meal planning suite (Premium Plus)** — the largest module: full
  `feature/mealplanning/*` (onboarding persona/taste/format, plan creation,
  recipe import [`AutoImportLinkScreen`, `ManualImport*`], grocery + Instacart /
  Walmart shop integration, household members/budget, `MealPlanningUpsellActivity`,
  `MealPlannerUpsellScreen`, `premium_plus_only`, `premium_plus_get_started`).
  **CONFIRMED — this is the headline Premium-PLUS tier.**
- **Recipe import / collections** — `recipe_collection/*`, `RecipeImportScreen`.
  **CONFIRMED gated.**
- **Multi-profile / household** — `Feature.MULTI_PROFILE` (the one surviving
  literal enum value). **CONFIRMED.**
- **Ad-free** — `ads_premium_banner`, `premium_bybye_ads`, `premium_no_distractions`,
  `premium_house_ad_displayed`, `premium_hub_feature_ad_free`. **CONFIRMED** — MFP
  free is ad-supported; ad-free is a paid benefit.

### 1e. Paywall / upsell surfaces (CONFIRMED — screen list)

`feature/upsell/`: `UpsellActivity`, `UpsellViewModel`, `UpsellDialog(Fragment)`,
`PremiumHubScreen/ViewModel` (the compare hub), `PremiumSpokeScreen/ViewModel`
(single-feature spoke upsell), `PremiumPrimerViewModel`, `PremiumNudgeViewModel`,
`PurchaseSuccessActivity/Screen`, `ManageSubscriptionScreen`,
`SubscriptionStatusActivity`, `DowngradeConfirmationDialog`. Feature-local
upsells: `MealPlanningUpsellActivity`, `MealPlannerUpsellScreen`,
`NutritionPremiumActivity`, `DeleteAccountPremiumActivity` (retention upsell shown
when a paying user tries to delete their account). Navigation entry:
`service/premium/navigation/UpsellEntryPoint` carries a `Feature` so the upsell
knows which spoke to show. Surfaces also: `menu_item_go_premium_diary`,
`menu_item_go_premium_v2`, `iv_premium_lock`, `premium_lock`, `premium_overlay`,
`go_premium_btn`, `ic_widget_go_to_premium_crown`, `dashb_go_to_premium_to_unlock`.

### 1f. Nudge system (CONFIRMED — and important contrast for VOLYUME)

A full **PremiumNudge** engine: `feature/upsell/nudge/PremiumNudgeViewModel`,
`PremiumNudge*` (Root/State/Title/Description/ContinueButton/IgnoreButton),
`PremiumNudgeAnalytics`, `NudgeConfig`, `NudgeContent`, `NudgeCopyConfig`,
`premium_nudge`, `premium_nudge_cta(_tapped)`, `premium_food_log_nudge`,
`need_a_little_nudge`. Timing/throttle logic: `daysSinceLastNudge`,
`millisSinceLastNudge`, `barcodeScanNudgeLastShown` (per-feature cooldown),
`dismissNudge`, `_nudgePendingActionState`, `checkAndNudgePoints`. Debug:
`DebugNudgesScreen/ViewModel`, `navigateToTestNudges`. Also a "modal" upsell:
`premium_modal_viewed`, `premium_modal_cta`, and pressure copy keys
`premium_if_you_fail`, `premium_you_currently_have`, `premium_your_free_subscription`,
`premium_on_hold_banner_*`. **This is an engagement-pressure nudge loop — exactly
the streak/pressure pattern VOLYUME's ED-safety + adherence-neutral + no-streaks
rules forbid. It is a CONTRAST, not a feature to copy.**

---

## 2. VOLYUME Pro mapping (have / lack / we-give-FREE)

VOLYUME gating is binary (`src/lib/proGate.js`: `tier === 'pro'`). The Pro
surface is the `withProGuard(..., '<feature>')` set in
`src/navigation/RootNavigator.js` (lines 149–176) plus `ProGate`/`ProLocked`
copy in `src/components/ProGate.js`. CLAUDE.md Free-vs-Pro is the mandate.

VOLYUME **Pro routes** (confirmed in RootNavigator): Weekly check-in, Nutrition
targets, Body metrics, Your week (coach output), Pro goal setup, Update training,
Coaching reminders, Food diary, Cardio, Cardio history, Meal plan, Food search,
Add custom food, Barcode scanning, Label scanning, Food insights, Recipes,
Saved meals, Recipe builder.

VOLYUME **Free** (CLAUDE.md): Plan Library, training builder, workout logging,
exercise library, personal bests, progress stats.

| MFP Premium feature | In VOLYUME? | VOLYUME tier |
|---|---|---|
| Ad-free | Yes — **app has no ads at all** | FREE (whole app) — **we beat it** |
| Barcode scanning | Yes (`ScanBarcodeScreen`) | Pro |
| Label/nutrition-label scan | Yes (`ScanLabelScreen`) — OCR | Pro |
| Macros (gram & percent) | Yes — nutrition targets/macros | Pro |
| Nutrient dashboards / micronutrients | **No** (GATED audit item 16) | — |
| Food/exercise **insights** | Yes (`FoodInsightsScreen`) | Pro |
| Verified-foods filter | No (single curated DB, not a paid filter) | n/a |
| **Meal Scan (AI photo→food)** | **No** | BLOCKED (PII/EU) |
| **Voice logging (AI)** | **No** | BLOCKED (PII/EU) |
| Recipe import (URL/manual) | Partial — own recipe builder, no URL import | Pro |
| Recipes / saved meals | Yes | Pro |
| Custom goals by day | Partial — coaching sets targets; no per-day editor | Pro |
| Exercise-calorie settings | Partial — cardio energy feeds plan | Pro |
| File export (CSV) | **No** | — |
| Priority support | **No** | — |
| Intermittent fasting tracker | **No** | GATED (fasting) |
| Meal planning suite (Premium Plus) | Yes — `MealPlanScreen` (real food to macros) | Pro |
| Grocery / Instacart-Walmart shop | **No** | — |
| Food timestamps | **No** (timeline food logging = GATED item) | GATED |
| Multi-profile / household | **No** | — |
| Workout routines / strength | Yes — training builder + logging | **FREE — we beat it** |
| Cardio | Yes | Pro |
| Body metrics / weight trend | Yes | Pro |
| Precision/weekly coaching | Yes — deterministic engine | Pro (**MFP has no equal**) |

**Where VOLYUME gives FREE what MFP charges for (our advantage):**
1. **No ads, ever** — MFP's free tier is ad-supported; ad-free is a paid benefit
   (`premium_bybye_ads`). VOLYUME is ad-free for everyone.
2. **Workout routines / strength training builder + logging + exercise library +
   personal bests + progress stats** — all FREE in VOLYUME; MFP gates strength
   routines/workouts (`premium_hub_feature_strength`, `…_workouts`).

---

## 3. Premium gaps — ranked, each tagged

Ordered by leverage for "Pro beats MFP Premium":

1. **Custom Goals by Day / per-meal macro targets** — `[SAFE-TO-BUILD]`. MFP gates
   it (`CustomGoalByDayActivity`, `MealGoalsActivity`). VOLYUME only sets one
   coached target. A per-day/per-meal target editor is deterministic, offline,
   no PII. Highest-leverage safe parity item (see §5).
2. **File export (CSV) of diary/measurements** — `[SAFE-TO-BUILD]`. MFP-gated
   (`FileExportActivity`). Pure local→file, offline, no server, no PII. Easy win,
   strong "you own your data" story vs MFP.
3. **Recipe URL import (manual paste / parse on-device)** — `[SAFE-TO-BUILD] with
   caveat`. MFP gates `AutoImportLinkScreen`. Safe **only if parsed on-device**;
   if it calls a remote parser that ships the URL/recipe off-device it edges
   toward `[BLOCKED-BY-PRIVACY-RULE]` (EU/no-PII). Manual paste is fully safe.
4. **Grocery list from the meal plan** — `[SAFE-TO-BUILD]`. MFP-gated
   (`premium_hub_feature_grocery`). On-device aggregation of plan ingredients.
   Skip the Instacart/Walmart commerce integration (third-party data egress).
5. **Nutrient/micronutrient dashboards (NRV)** — `[GATED]`. Ultimate-Audit item 16,
   decision-gated. Do not start without the structured founder decision.
6. **Food timestamps / timeline food logging** — `[GATED]`. Named blocked item
   (mid-session-swap/timeline). Founder-decision gated.
7. **Intermittent fasting tracker** — `[GATED]`. Explicitly gated; ED-safety
   adjacency. Do not build.
8. **AI Meal Scan (photo→food)** — `[BLOCKED-BY-PRIVACY-RULE]`. Sends a photo to a
   server = PII + non-EU egress + introduces AI into a deterministic app. Triple
   violation. Do **not** build; this is a clean differentiator to advertise *against*.
9. **AI Voice logging** — `[BLOCKED-BY-PRIVACY-RULE]`. Same as above (audio/text to
   server). NEW finding; same block.
10. **Priority support / multi-profile / verified-foods filter** — `[SAFE-TO-BUILD]`
    but low leverage; multi-profile conflicts with offline single-user model.

---

## 4. Where VOLYUME Pro already BEATS MFP Premium

- **Deterministic Precision Coaching** — weekly check-in → reasoned plan/target
  adjustment with a written reason ('Your week'). MFP has **no coaching engine**;
  its "intelligence" is AI meal/voice scan and nudges. This is VOLYUME's moat.
- **ED-safety, tier-blind** — calorie floors (1500/1200), FFM floor, rapid-loss
  gate, Beat UK signposting (`nutritionEngine.js`, `edPatternDetector.js`,
  `wellbeing.js`). MFP ships the **opposite**: a `PremiumNudge` pressure loop,
  `premium_if_you_fail` copy, on-hold banners, streak/points nudges — the exact
  adherence-pressure pattern VOLYUME forbids. VOLYUME wins on duty-of-care.
- **Ad-free by default** — for everyone, free included.
- **No PII / EU residency / offline-first** — local DB is source of truth; no
  photos/audio/diary leave the device to a US AI service. MFP's headline Premium
  features (Meal Scan, Voice Log) are built on exactly that egress.
- **Strength training is FREE** — full builder + logging + library + PBs + stats,
  which MFP puts behind Premium.
- **No streaks / adherence-neutral** — MFP's whole nudge+modal system is
  engagement pressure; VOLYUME's absence of it is a feature for the target user.

---

## 5. Single highest-leverage SAFE Pro addition

**Custom Goals by Day + per-meal macro targets editor** `[SAFE-TO-BUILD]`.

Why: it is the one MFP Premium feature that is (a) genuinely gated by MFP
(`CustomGoalByDayActivity`, `MealGoalsActivity`, `custom_calorie_macro_goal_by_day`,
`premium_meal_macro_unit`), (b) high-value to VOLYUME's serious-trainer audience
(refeed days, training vs rest-day splits, per-meal protein targets — bodybuilding
staples the coaching engine already reasons about), (c) **fully inside every
VOLYUME constraint**: deterministic, offline, local-only, no PII, no AI, no
streaks, and it *strengthens* rather than touches the ED-safety engine because
every per-day target still flows through the existing calorie-floor / FFM-floor /
rapid-loss gates (those stay tier-blind). It deepens the coaching moat MFP can't
match while closing a real Premium-parity gap. (Must respect the founder-decision
gate process and the all-or-nothing binary tier; this is a feature inside Pro,
not a new gating layer.)
