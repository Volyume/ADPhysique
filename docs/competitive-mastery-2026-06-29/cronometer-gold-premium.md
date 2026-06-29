# Cronometer GOLD — Complete Premium Feature Set (Decoded) vs VOLYUME Pro

Competitive-mastery audit, 2026-06-29. Area: **everything behind Cronometer's
Gold paywall** — the complete Gold feature list and the paywall/upsell surfaces.

**Honest-source rule applied.** Every feature below is tagged CONFIRMED (a
literal user-facing Gold gate string or a Gold-namespaced class in the
artifacts) or INFERRED (assembled from class/identifier names without a literal
upsell string). Opaque keys are flagged. The artifacts are a decompiled Flutter
Android build of Cronometer; line numbers cite the grepped source files.

Sources read:
- `…/scratchpad/cronometer/corpus/premium_keys.txt` (read in full)
- `…/scratchpad/libapp_strings.txt` (1.7M — grepped for Gold/Premium/upsell)
- `…/scratchpad/cronometer/corpus/food_ui_copy.txt`, `cronometer_identifiers.txt`
- VOLYUME source: `src/components/ProGate.js`, `src/lib/proGate.js`, `CLAUDE.md`

> **Key finding on `premium_keys.txt`:** despite the brief framing it as "THE KEY
> FILE" of Gold feature keys, the file is ~99% Google Play Billing + Braze SDK
> plumbing (`InAppPurchaseApi`, `logPurchase`, `subscriptionOfferDetails`,
> `PurchaseVerificationHandler`, etc.). The ONLY real Gold-feature signal in it
> is the `com.cronometer.android.gold` package and the home-screen **Glance
> widget** classes: `FastingGlanceWidgetReceiver{Small,Medium,Large}`,
> `ConsumedGlanceWidgetReceiver{…}`, `RemainingGlanceWidgetReceiver{…}`
> (premium_keys.txt L266-296). The actual Gold feature catalogue lives in
> `libapp_strings.txt` as upsell copy and `cronometer/…` Dart package paths. The
> decode below is therefore driven by `libapp_strings.txt`, not premium_keys.

---

## 1. Complete Cronometer Gold feature list (decoded, with evidence)

### Ads / experience
- **Ad-free** — CONFIRMED. "Get Gold for an ad-free experience." (L18471);
  "Say goodbye to ads and hello to your goals faster…" (L20245).

### Diary customisation & logging power-ups
- **Repeat / scheduled items** (favourite foods/drinks/supplements auto-repeat on
  chosen days) — CONFIRMED. "Repeat Items is a feature for Cronometer Gold
  subscribers." (L29194); "…set your favourite foods, drinks, and supplements to
  repeat on specific days…" (L32304/L34870).
- **Customisable diary summary column** — CONFIRMED. "Customise the summary column
  in your diary, plus get access to all features…" (L16220, L25321).
- **Diary Groups** (group entries: Breakfast/Lunch/etc., custom groups) — CONFIRMED.
  "Diary Groups and Timestamps are features for Cronometer Gold subscribers."
  (L21692); `diaryGroupsTogglesGold` (L19372); "Diary Group Settings" (food_ui L22346).
- **Timestamps on entries** — CONFIRMED. Bundled with Diary Groups (L21692);
  `DiaryTimestampsSwitchTile`, "Show Timestamp" (food_ui L17421/L20679).
- **Sort all by time** — CONFIRMED. "Sort all by time is a feature only available
  to Gold subscribers." (L16831).
- **Create Recipe From Selection** (multi-select diary rows → recipe) — CONFIRMED.
  "Create Recipe From Selection is a feature for Gold Subscribers." (L23886).
- **Recipe importer** (auto-import recipes from websites) — CONFIRMED. "With Gold,
  you can automatically import recipes from your favourite websites…" (L10445);
  listed as a headline Gold perk (L20245).
- **Photo logging / unlimited photo logging** (log meals by photo; free users get
  limited tries) — CONFIRMED. "Unlock Unlimited Photo Logging" (L24102), "Unlock
  Photo Logging" (L47773), "Try Photo Logging for free!" (food_ui L16268),
  free-tries dialog (`_PhotoLoggingFreeTriesDialogState`). Note: photo→AI import
  exists (`AiImporterModel.fromPhotoLogging`, food_ui L11526) — an AI feature.
- **Photos on notes / product photos / progress photos** — CONFIRMED. "Adding
  photos to notes is only available to Gold subscribers." (L43827); "…track your
  progression by adding photos" (FR, L27248).

### Fasting (large Gold surface)
- **Fasting timer + scheduling + history + stats** — CONFIRMED. "Fasting is a
  feature for Gold subscribers." (L54851); "Start fasting with Cronometer Gold!"
  (L7136); whole `cronometer/fasting/**` package tree; Fasting Reminder, Fasting
  History, Fasting Stats (`completedFasts`), custom recurrence, show-on-diary /
  show-on-dashboard toggles, fasting blood-glucose max (CGM tie-in).
- **Fasting home-screen widget** (Glance widget, 3 sizes) — CONFIRMED.
  `FastingGlanceWidgetReceiver{Small,Medium,Large}` (premium_keys L266-289).

### Home-screen widgets (Gold)
- **Consumed / Remaining / Fasting Glance widgets** (today's intake, remaining
  budget, fasting countdown on the home screen) — CONFIRMED.
  `ConsumedGlanceWidgetReceiver*`, `RemainingGlanceWidgetReceiver*`,
  `FastingGlanceWidgetReceiver*` (premium_keys L266-296).

### Nutrient targeting & scores
- **Custom / scheduled macro + energy targets** (set your own macros & calories,
  schedule them by day) — CONFIRMED. "With Gold, you can customise and schedule
  your macronutrients and energy targets to align with your personal health
  goals…" (L20285, L28953); `init:macroTargetsGoldBanner`,
  `_buildMacroSchedulerGoldBanner` (L5952).
- **Targeting by % vs grams** — INFERRED (known Gold feature; the macro-scheduler
  copy above covers custom targets, but no literal "% vs g" toggle string surfaced
  in the grep). Flag: not independently confirmed in artifacts.
- **Nutrition Scores / Food Score** (set of 8 research-based nutrition scores,
  highlight up to 8 at top of diary) — CONFIRMED. "The full set of Nutrition
  Scores is a feature for Cronometer Gold subscribers" (L18249); "See the full set
  of nutrition scores with Gold." (L43676); "With Gold, you can see a set of 8
  nutrition scores…" (L64779); "Select up to eight nutrition scores to highlight
  at the top of your Diary screen." (L35190).
- **Highlighted nutrient targets** (pin key nutrients to the diary header) —
  CONFIRMED. `highlightedTargets`, `show highlighted targets`,
  `highlighted_nutrients_banner` (L10925/L27811/L50784).

### The Oracle (nutrient-gap food finder)
- **Nutrient Oracle** (ask "what foods are the best source of nutrient X",
  refine by category & ranking method) — CONFIRMED. "The Oracle is a feature for
  gold subscribers." (L41045); "The Oracle will list the foods that are the best
  sources of the selected nutrient. You can further refine your search by
  selecting specific categories and changing the ranking method." (L13427);
  `Nutrient Oracle`, `OracleSearch*`, `useNutrientOracle`, `Ask the Oracle`.
  (This is the recipe/ingredient nutrient-ranking feature too — same engine.)

### Trends, charts & reports
- **Custom charts / Trends** — CONFIRMED. "This Chart is only available to Gold
  subscribers." (L44600); "Create Custom Chart" (food_ui L21399); whole
  `cronometer/trends/charts/**` package; "Could not convert chartPrefs for custom
  charts" (food_ui L25875); `viewTrendsCharts`, `TrendsChartsTabState`.
- **Nutrient report date-range / timeframes** — CONFIRMED. "This date range is
  only available to Gold subscribers." (L42714); `Report Settings`, `Date Range`,
  `date_range_display_options`, `nav_trends_nutrition_report` (food_ui L17787),
  `report_settings_page.dart`.
- **CGM / blood-glucose charts & stats** (continuous glucose monitor integration)
  — CONFIRMED. `cgm_chart_page.dart`, `cgm_stats_page.dart`, `cgm_compare_chart`,
  `Timestamps and CGM`, `customFastingMaxGlucose` (premium-adjacent trends).
- **Exportable reports — CSV + PDF** — CONFIRMED. "Create an easy-to-read PDF to
  share with health professionals." (L64120, L33890 DE); `.csv` (L54947), `.pdf`
  (L68411); `Export Food Calories` (food_ui L12901); `runExport`, `BiometricExport`,
  `exportWater`, `appleHealthCountExport`.

### Biometrics
- **Custom biometrics** (define your own tracked metric) — CONFIRMED. "Create
  custom biometric measurements with Cronometer Gold!" (L50494); "Add Custom
  Biometric", `CustomBiometricDetailPage`, `_showGoldGateOrRouteToCustomBiometric`
  (food_ui L13757), `create_custom_biometric`.
- **Biometric time-series charts / blood pressure / stools / sleep breakdown /
  health-platform export** — CONFIRMED (Gold-adjacent). `BiometricTimeSeries*`,
  `BloodPressureBiometric`, `SleepEntry.fromBiometric`, `exportToHealthConnect`.

### Completed-day highlighting / Custom Calendar
- **Completed-day highlighting (Custom Calendar)** — CONFIRMED. "Upgrade to Gold to
  see at a glance what you have logged each day." (L10534); "With Gold and Custom
  Calendar, you can see at a glance what you have logged each day." (L67440);
  `Custom Calendar` (L30680). Note: phrased as visibility of logging, NOT a streak
  reward — but it is completion-state surfacing.

### Water tracker
- **Custom glass size + water reminders** — CONFIRMED. "With Gold, you can
  customise your glass size for the water tracker." (L24216); "…set reminders for
  when you want to drink water." (L33656).

### Sharing / social / support
- **Friends / share custom foods & recipes** — CONFIRMED. "…add friends to share
  custom foods and personalised recipes…" (FR L41767/L44497).
- **Referral discounts** — CONFIRMED. "Invite your friends… they'll receive $5 off
  a Gold Subscription…" (L41852, L46802).
- **Priority customer support** — CONFIRMED. "…you get access to our premium Gold
  subscription and priority status with Customer Support" (L31686).

### Account / pro-client model
- **Professional-invited Gold** (a dietitian/pro grants Gold to clients) —
  CONFIRMED. "You are subscribed to our Gold Membership because you were invited by
  a professional…" (L50874); `clientAccessToPremium`,
  `restrict.client.display.settings.highlighted.nutrients`.

### Voice logging
- **Voice logging** — CONFIRMED (Gold-wrapped). `mainMenuVoiceLoggingButtonGoldWrapper`
  (L18123). Likely an AI/ASR feature.

### Opaque / unresolved keys (flagged honestly)
- `PROVIDER_GOOGLE_GOLDEN`, `SCAR_REQUEST_TYPE_GOLDENEYE`, `goldenrod`/`goldfish`
  (premium_keys) — OPAQUE: ad-SDK / colour-name noise, **not** Cronometer Gold.
- `DUST subscription`, `MITE` (premium_keys) — OPAQUE: Braze internal session
  plumbing, not a user feature.
- `freeToGold`, `switchToGoldMode`, `SignupDemoToGoldSubscribed` — INFERRED:
  internal tier-transition/demo states, not standalone features.

---

## 2. VOLYUME Pro mapping (have / lack / we-give-free)

VOLYUME gating is **binary** (free vs pro, `proGate.js` `_resolveTier`); there is
no per-feature entitlement layer. Pro list is from `CLAUDE.md` + the
`FEATURE_BENEFIT` map in `ProGate.js`.

| Cronometer Gold feature | VOLYUME status |
|---|---|
| Ad-free | **N/A — VOLYUME has no ads at all** (free users already ad-free; structural win) |
| Food diary / search / barcode | **HAVE (Pro)** — gated, w/ barcode + saved meals |
| Label (photo) scanning | **HAVE (Pro)** — "Label scanning" benefit line |
| Custom macro + energy targets | **HAVE (Pro)** — "Nutrition targets" |
| Targeting % vs g | **LACK** (no % toggle evident) |
| Smart meal suggestions / meal plan | **HAVE (Pro)** — beats Gold (Gold has no meal-plan builder) |
| Recipes / saved meals | **HAVE (Pro)** |
| Recipe importer (from web) | **LACK** |
| Repeat / scheduled items | **LACK** (no repeat-item scheduler found) |
| Cardio | **HAVE (Pro)** |
| Steps | **HAVE (Pro)** |
| Body metrics / weight / measurements | **HAVE (Pro)** |
| Custom (medical) biometrics | **LACK — GATED** (custom medical biometrics = gated) |
| Check-ins / Precision Coaching | **HAVE (Pro) — Cronometer has no equivalent** |
| Wearable integration | **HAVE (Pro)** |
| Nutrient Oracle (gap finder) | **LACK — GATED item 16** (micronutrient dashboards/oracle) |
| Nutrition Scores / Food Score (8) | **LACK — GATED** (micronutrient-adjacent, item 16) |
| Fasting timer / scheduling / stats | **LACK — GATED** (ED conflict) |
| Custom charts / Trends | **LACK** (no custom-chart builder) |
| Nutrient-report date ranges | **PARTIAL** — "Food insights" gives weekly view, not arbitrary ranges |
| CGM / glucose charts | **LACK** (no CGM integration) |
| Export CSV / PDF reports | **LACK** |
| Diary Groups | **LACK** (meals exist but not Gold-style custom groups) |
| Timestamps on entries | **PARTIAL/UNKNOWN** — needs source check; not in Pro list |
| Completed-day highlighting / Custom Calendar | **LACK — GATED** (adherence-neutral / no-streak rule) |
| Home-screen Glance widgets (consumed/remaining/fasting) | **LACK** (fasting one GATED; consumed/remaining would be SAFE) |
| Water tracker custom glass + reminders | **LACK** (minor) |
| Friends / social share | **LACK** (no-PII posture makes this low-priority) |
| Referral discounts | **LACK** (billing — do not touch) |
| Voice logging | **LACK** (likely AI — boundary rule) |
| Professional-client Gold grants | **LACK** (B2B model, out of scope) |

**We-give-free that Cronometer charges for:** ad-free experience (VOLYUME has no
ads for anyone); smart meal suggestions / full meal-plan builder (Cronometer Gold
has no comparable plan generator); custom macro/energy targets are Pro in both but
VOLYUME ships division-specific goal setup Cronometer lacks entirely.

---

## 3. Gold gaps — ranked, each tagged SAFE-TO-BUILD or GATED

1. **Exportable reports (CSV + PDF)** — **[SAFE-TO-BUILD]**. Highest-value missing
   Gold staple; works offline (generate locally), no PII leaves device, no ED
   conflict. "Share with health professionals" is a real Pro retention hook.
2. **Repeat / scheduled items** (one-tap re-log favourites on chosen days) —
   **[SAFE-TO-BUILD]**. Pure logging convenience, offline, ED-neutral.
3. **Custom charts / Trends over user-chosen date ranges** —
   **[SAFE-TO-BUILD]** for training/weight/macro trends; offline. Caveat: keep
   framing neutral, no weight-loss "progress to goal" celebration.
4. **Nutrient-report arbitrary date ranges** (extend "Food insights" beyond the
   week) — **[SAFE-TO-BUILD]**, offline aggregation.
5. **Consumed / Remaining home-screen widgets** — **[SAFE-TO-BUILD]** (the
   *fasting* widget is GATED; the today's-intake/remaining ones are not). Expo
   config-plugin native widget — check Expo-managed constraint before committing.
6. **Diary Groups** (custom meal groupings) — **[SAFE-TO-BUILD]**, organisational.
7. **Targeting by % vs grams toggle** — **[SAFE-TO-BUILD]**, small UX win.
8. **Nutrient Oracle (gap-filling food finder)** — **[GATED]** (micronutrient
   dashboards/oracle = Ultimate-Audit item 16; decision-gated, do not start).
9. **Nutrition Scores / Food Score (8 highlighted)** — **[GATED]** (micronutrient
   item 16; also borderline gamification).
10. **Fasting timer / scheduling / stats** — **[GATED]** (explicit ED conflict).
11. **Custom (medical) biometrics + CGM** — **[GATED]** (custom medical biometrics
    gated; CGM is medical-device territory).
12. **Completed-day highlighting / Custom Calendar** — **[GATED]** (adherence-neutral
    / no-shame ED rule forbids completion-streak surfacing).
13. **Voice logging** — **[GATED]** (almost certainly AI; coaching-engine AI
    boundary — stop and ask).
14. **Photo→AI meal import** — **[GATED]** (AI boundary).

---

## 4. Where VOLYUME Pro already BEATS Gold

- **Precision Coaching** — deterministic weekly check-in that *re-plans* training,
  calories and macros from how the week actually went, with a written reason for
  every change (`ProGate.js` "Your week"). Cronometer Gold has **no coaching loop
  at all** — it is a passive tracker; the Oracle just lists foods, it never adjusts
  a plan.
- **ED-safety system** — calorie floors (1500/1200), FFM energy floor, rapid-loss
  gates, ED-pattern detection, Beat UK signposting, adherence-neutral design.
  Cronometer ships an unguarded **fasting timer** and **completed-day streak**
  surfaces — the exact patterns VOLYUME deliberately refuses. This is a safety and
  trust differentiator, not just a feature gap.
- **Offline-first** — VOLYUME works with no connection; local DB is source of
  truth. Cronometer's core leans on server sync and server-side report/export.
- **EU residency / no-PII** — no friends-graph, no analytics PII, EU-Dublin only.
  Cronometer ships Braze + Adjust + Facebook IAP events and a social friends graph.
- **Full meal-plan builder + division-specific goals** — VOLYUME generates a day of
  real food around the user's macros and a physique-division goal. Gold has custom
  *targets* but **no plan generator and no division model**.
- **No ads, ever, for everyone** — Cronometer charges Gold to remove ads VOLYUME
  never shows.

---

## 5. Single highest-leverage SAFE Pro addition

**Exportable CSV + PDF nutrition/training reports ("share with your coach or GP").**

Rationale: it is the most-cited Gold value outside fasting/oracle (both GATED for
us), it is a pure local-generation feature that fully respects offline-first,
no-PII and EU-residency (nothing leaves the device unless the user shares the
file themselves), it has zero ED-safety conflict, and it converts a clear
Cronometer Gold selling point ("Create an easy-to-read PDF to share with health
professionals", libapp_strings.txt L64120) into a VOLYUME Pro hook that pairs
naturally with Precision Coaching's written weekly rationale — something
Cronometer cannot match. Build only after a founder go (rule: anything larger
than one line needs a plan first).
