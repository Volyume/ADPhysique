# Cronometer Nutrition Depth — Moat Map & Decision Brief

**Date:** 2026-06-29
**Scope:** The nutrition/micronutrient depth that is Cronometer's genuine moat —
the complete nutrient panel, the NRV/target model, biometrics, the nutrient
scoring/oracle, and the food data sources. Compared honestly against what
VOLYUME tracks today.

**Purpose:** Give the founder a complete, honest map so an informed decision can
be made about the **GATED** micronutrient item (Ultimate Audit **#16**). This
document **MAPS the moat and lays out what closing it would entail. It does NOT
recommend building it.** Micronutrients/NRV (#16), custom biometrics, and
nutrient scoring are all founder-decision-gated and several are ED-safety
adjacent. Everything in §3 is tagged **[GATED — founder decision #16]**.

**Honest-source rule:** Every claim below is tagged **CONFIRMED** (a literal
string/symbol appears in the decompiled artifacts, quoted with file:line) or
**INFERRED** (reasoned from Cronometer's known public product but not directly
in these artifacts). Where a nutrient or biometric cannot be confirmed, it is
said so.

**Artifacts used (Cronometer decompiled):**
- `scratchpad/cronometer/corpus/nutrient_keys.txt` — turned out to be mostly
  Health-Connect / Samsung-Health SDK noise plus the *home-widget* "highlighted
  nutrients" subset only (7 vitamins + a few macros). NOT the full panel.
- `scratchpad/libapp_strings.txt` (1.7 MB) — **the authoritative source.** The
  full nutrient model, target model, biometrics and scoring live here as Dart
  symbols and UI strings.
- `scratchpad/cronometer/corpus/food_ui_copy.txt` — Oracle / DRI / Nutrition
  Scores UI copy.
- `scratchpad/cronometer/corpus/dex_strings_raw.txt`, `dex` strings — cross-check.

---

## 1. The Cronometer nutrient panel (grouped, counted) + biometrics + target model

### 1.1 Complete nutrient panel

The panel was reconstructed from a serialized nutrient model object in
`libapp_strings.txt` (a block of `    <camelCaseKey>: ` fields — e.g.
`b1Thiamine:`, `fatMonounsaturated:`, `iodine:`) cross-checked against
HealthKit identifier strings (`HKQuantityTypeIdentifierDietary*`), Health
Connect constants (`DIETARY_*`), and human-readable UI labels (`Omega-3 (EPA)`,
`Net Carbs`, etc.). Each entry below cites at least one literal line.

**GENERAL / ENERGY (CONFIRMED)**
| Nutrient | Evidence (libapp_strings.txt unless noted) |
|---|---|
| Energy (kcal) | `calories:` L41819; `KILOCALORIES` nutrient_keys L104 |
| Alcohol | `added sugars`/`alcohol` family; `Alcohol` — see §note, **INFERRED label, CONFIRMED concept** via lipid/general block |
| Caffeine | `caffeine:` L17152 — **CONFIRMED** |
| Water | `water:` L12350; `total water nutrient target` food_ui_copy L6999 — **CONFIRMED** |

**CARBOHYDRATES (CONFIRMED)**
| Nutrient | Evidence |
|---|---|
| Carbohydrate (total) | `carbs:` L58308; `CARBOHYDRATE` nutrient_keys L88 |
| Fiber | `fiber:` L55625; `DIETARY_FIBER` nutrient_keys L93 |
| Starch | **INFERRED** (standard NCCDB field; not isolated in grep) |
| Sugars (total) | `sugar:` L37101 |
| Added sugars | `added sugars` L46307 |
| Net Carbs | `Net Carbs` L37705; `Target (Net Carbs)` L20189; `useNetCarbs` nutrient_keys L341 |
| Sugar alcohols | `sugar alcohols` L26135; `sugar alcohol` L63634 |

**LIPIDS / FATTY ACIDS (CONFIRMED)**
| Nutrient | Evidence |
|---|---|
| Fat (total) | `fat:` L59731 |
| Saturated fat | `fatSaturated:` L21730; `HKQuantityTypeIdentifierDietaryFatSaturated` L10896 |
| Monounsaturated fat | `fatMonounsaturated:` L41700 |
| Polyunsaturated fat | `fatPolyunsaturated:` L13989 |
| Trans fats | `fatTransMonoenoic:` L58457 (trans-monoenoic); `Trans-Fat` family |
| Cholesterol | `cholesterol:` L19800 |
| Omega-3 — ALA | `Omega-3 (ALA)` L33313 |
| Omega-3 — EPA | `Omega-3 (EPA)` L55055 |
| Omega-3 — DHA | `Omega-3 (DHA)` L14414 |
| Omega-6 — LA (linoleic) | `Omega-6 (LA)` L47357; `% Omega-6 (LA)` L51022 |
| Omega-6 — AA (arachidonic) | `Omega-6 (AA)` L22320 |

**PROTEIN & AMINO ACIDS (CONFIRMED)**
| Nutrient | Evidence |
|---|---|
| Protein | `protein` nutrient_keys L297; `PROTEIN` L123 |
| Cystine | `cystine` L11613 |
| Histidine | `histidine` L38507 |
| Isoleucine | `isoleucine` L62023 |
| Leucine | `leucine` L25482 |
| Lysine | `lysine` L24553 |
| Methionine | `methionine` L26201 |
| Phenylalanine | `phenylalanine` L10496 |
| Threonine | `threonine` L14428 |
| Tryptophan | `tryptophan` L10329 |
| Tyrosine | `tyrosine` L59952 |
| Valine | `valine` L18183 |
| (Also present: Alanine L9679, Arginine L43812, Aspartic acid L61572, Glycine L35679, Proline L41387, Hydroxyproline L41553, Serine L67533 — full NCCDB amino panel) |

Cronometer's *targeted* essential amino acids are the ~10 above; the extra
non-essential AAs (alanine, arginine, etc.) are tracked/displayed but not all
NRV-targeted. **CONFIRMED present; targeting status INFERRED.**

**VITAMINS (CONFIRMED)**
| Vitamin | Evidence |
|---|---|
| Vitamin A (RAE) | `vitaminA:` L28093; `retinol activity equivalent` L38734; `retinol` L52141 |
| Vitamin C | `vitaminC:` L66403 |
| Vitamin D | `vitaminD:` L64681 |
| Vitamin E (alpha-tocopherol) | `vitaminE:` L54281; `gamma tocopherol` L16267, `beta` L27873, `delta` L24737 (tocopherol isomers tracked) |
| Vitamin K | `vitaminK:` L37244 |
| B1 Thiamine | `b1Thiamine:` L32599; `b1 (thiamine)` L5817 |
| B2 Riboflavin | `b2Riboflavin:` L62051; `b2 (riboflavin)` L29903 |
| B3 Niacin | `b3Niacin:` L17892; `b3 (niacin)` L46913 |
| B5 Pantothenic acid | `b5PantothenicAcid:` L10790; `b5 (pantothenic acid)` L46726 |
| B6 Pyridoxine | `b6Pyridoxine:` L35188 |
| B7 Biotin | `b7Biotin:` L38651 |
| B9 Folate | `b9Folate:` L17849; `DIETARY_FOLATE` L11828 |
| B12 Cobalamin | `b12Cobalamin:` L44207; `b12 (cobalamin)` L31477 |
| Choline | `choline:` L29475 |

**MINERALS (CONFIRMED)**
| Mineral | Evidence |
|---|---|
| Calcium | `calcium:` L7600 |
| Chloride | `chloride:` L60382 |
| Chromium | `chromium:` L8834 |
| Copper | `copper:` L21605 |
| Fluoride | `fluoride` L10211 |
| Iodine | `iodine:` L18887 |
| Iron | `iron:` L65251 |
| Magnesium | `magnesium:` L53933 |
| Manganese | `manganese:` L60554 |
| Molybdenum | `molybdenum:` L47813 |
| Phosphorus | `phosphorus:` L66333 |
| Potassium | `potassium:` L55049; `POTASSIUM` nutrient_keys L2 |
| Selenium | `selenium:` L34075 |
| Sodium | `sodium:` L32419; `SODIUM` nutrient_keys L142 |
| Zinc | `zinc:` L67941 |

### 1.2 Count

| Category | Targeted/tracked count | Status |
|---|---|---|
| General/energy (energy, alcohol, caffeine, water) | ~4 | CONFIRMED (alcohol label inferred) |
| Carbohydrates (carb, fiber, starch, sugars, added sugars, net carbs, sugar alcohols) | ~7 | CONFIRMED (starch inferred) |
| Lipids / fatty acids (fat, sat, mono, poly, trans, cholesterol, 3× omega-3, 2× omega-6) | ~11 | CONFIRMED |
| Protein + amino acids (protein + ~10 targeted EAAs, more displayed) | ~11–18 | CONFIRMED present |
| Vitamins | 14 | CONFIRMED |
| Minerals | 15 | CONFIRMED |
| **Total distinct nutrients tracked** | **~60–82** | Matches Cronometer's public "82 nutrients" claim — **CONFIRMED to ~60 by literal evidence; remainder INFERRED** |

Cronometer publicly markets "track up to 82 nutrients." The artifacts literally
confirm ~60 of those by name; the gap (some isomers, starch, a few non-targeted
AAs and the alcohol label) is **INFERRED** from the public figure plus the NCCDB
field set, not separately quoted.

### 1.3 Target / NRV model (CONFIRMED)

Cronometer's targets are **USDA Dietary Reference Intakes (DRIs)**, personalised
by age and sex, with optional user overrides:

- **"This is your intake compared to the USDA Dietary Reference Intakes (DRIs)
  for an average person of your age and gender."** — food_ui_copy L9819 / libapp
  L9819 — **CONFIRMED**
- **"Recommended Dietary Allowance (RDA)"** L25646; `_getProteinRDA` L16400;
  `_setRDAIfApplicable` L6166 — **CONFIRMED**
- **Min/Max target model:** `getNutrientMinTarget` L41623, `getNutrientMaxTarget`
  L11560, `nutrientMaxTarget` L28776, `Max target` L37402, `set:minTarget`
  L29035 — each nutrient has a min (RDA-style floor) and an optional **max**
  (upper-limit / "do not exceed", e.g. sodium, sat fat). **CONFIRMED**
- **Custom / fixed-value override:** *"This target is currently controlled by
  your Macronutrient Targets settings. If you want this to be a specific value
  set use the 'Fixed Values' mode."* L11055; `Custom Energy Target` L21651;
  `Target Scheduler` (Gold) L63598 — **CONFIRMED**
- **Nutrient Balance gauge** is the visual: `nutrient_balance_gauge.dart` L6751,
  `NutrientBalanceGauge` L54730, `computeOverallTargetPercent` L7941. **CONFIRMED**

Note: NRV in the artifacts is the **US DRI/RDA** basis, not the EU "NRV" label.
The EU NRV table is a sibling standard; Cronometer ships DRIs. (Relevant because
VOLYUME is EU/British-English — closing the gap would mean choosing DRI vs EU NRV.)

### 1.4 Biometrics tracked (CONFIRMED)

Cronometer has a full custom-biometric subsystem
(`package:cronometer/biometric_search/...`, `BiometricScreen`, `BiometricEntry`):

| Biometric | Evidence |
|---|---|
| Weight | `Weight + Waist Size` L10773; `WeightWaistChartDataAccess` L10311 |
| Waist / girths | `WAIST_CIRCUMFERENCE` food_ui_copy L5605; `WeightWaistChartDataAccess` |
| Body Fat % | `Import Body Fat %` L13695; `Body Fat % Updated` L7166; `body fat chart data access` L7348 |
| Blood Pressure (systolic/diastolic) | `BloodPressureBiometric` L5573; `BLOOD_PRESSURE_SYSTOLIC` L12441; `bloodPressureDiastolic` L17509 |
| Blood Glucose | `BloodGlucose` (Health-Connect relation-to-meal) food_ui_copy L118; `MEAL_TYPE_BEFORE_SLEEP` |
| Ketones (blood) | `KetoneIndexChartDataAccess` L9016; `ketomojo.ketones` L9115 (KetoMojo integration); `_buildKetoneIndex` L15314 |
| HDL Cholesterol / Triglycerides / lipid panel | `HDL-Cholesterin` L14641; `Triglycerides` L8119; `for blood pressure correlations` L7464 |
| Body Temperature | `Import Body Temperature Variation` L11169; `Body Temperature Variation` L16033 |
| Heart Rate (resting) | `Import Resting Heart Rate` L16037; `Import Heart Rate & Blood Pressure` L6307 |
| Sleep | `SleepEntry.fromBiometric` L15384; `sleep_duration_score.dart` L14142; `BiometricEntry.fromAHSleepTotals` L7290 |
| Steps | `StepsGoal` food_ui_copy L9 |
| **Custom biometrics (arbitrary user metric)** | `Add Custom Biometric` L13780; `Custom Biometrics` L13867; **"Creating custom biometrics is only available to Gold subscribers."** L64800 — **Gold-gated** |

### 1.5 Nutrient scoring / Oracle (CONFIRMED)

- **Nutrition Scores:** `loadNutritionScoresForDay` L27689; `Nutrition Scores
  Summary` L19121; `Single Nutrition Score` food_ui_copy L48582;
  `getNutrientScoreOverUnderColor` L55504; `computeOverallTargetPercent` L7941.
  *"Select up to eight nutrition scores to highlight at the top of your Diary
  screen."* L35190. **"The full set of Nutrition Scores is a feature for
  Cronometer Gold subscribers."** L18249 — **Gold-gated**. A "score" is the
  percent-of-target a nutrient hit (a completeness measure), coloured over/under.
- **The Oracle / Nutrient Oracle:** `Nutrient Oracle` L11148; `ask_the_oracle`
  food_ui_copy L7108; *"The Oracle will list the foods that are the best sources
  of the selected nutrient…"* L13427. **"The Oracle is a feature for gold
  subscribers."** L41045 — **Gold-gated**. It is a reverse food-search: "which
  foods best fill this nutrient gap." Deterministic ranking, not AI.

### 1.6 Food data sources (CONFIRMED)

- **NCCDB** (Nutrition Coordinating Center Food & Nutrient Database, Univ. of
  Minnesota — the licensed research-grade DB behind the full micronutrient
  panel): `NCCDB` L6994; **`assets/NCCDB.svg`** L66395 (source-badge asset). The
  University-of-Minnesota provenance is **INFERRED** (NCCDB's known publisher);
  the `NCCDB` label itself is **CONFIRMED**.
- **USDA** (DRIs for targets + USDA food data): `USDA` L15871; `USDAWeb` L14290;
  *"We increase your total BMR based off what is determined by the USDA."* L11392.
  **CONFIRMED**
- **Nutritionix** (branded/packaged-food DB): `Nutritionix` L66805 — **CONFIRMED**
- **Verified vs community foods:** `isVerified` L9752, `clientVerified` L61140,
  `ClientSearchContext.verifiedOnly` L52541 — verified (curated) vs user-entered
  foods are distinguished. **CONFIRMED**

The licensed NCCDB panel is the actual moat: it is why Cronometer can show 60–82
nutrients per food where label-only DBs (OpenFoodFacts, MyFitnessPal community)
show macros + a handful.

---

## 2. VOLYUME's nutrition tracking today — the honest gap

**Source files read in full / grepped:**
- `src/lib/nutritionEngine.js` — the target calculator.
- `src/lib/food/macros.js` — the per-100g→portion scaler.
- `supabase/migrate_015_food_logging.sql`, `migrate_023_custom_foods_barcode.sql`,
  `src/lib/database.js` (local SQLite schema), `src/lib/food/db.js` — food schema.

**What VOLYUME stores per food (per-100g columns), CONFIRMED:**
`kcal_100g`, `protein_100g`, `carbs_100g`, `fat_100g`, `fibre_100g`,
**`sodium_100g`**, **`sugar_100g`** — `database.js` L801-807, `database.js`
L824-830, `migrate_015` L27-33, `migrate_023` L61-67. **7 fields. No vitamins,
no minerals (beyond sodium), no amino acids, no fatty-acid breakdown, no
cholesterol.**

**Honest nuance vs the brief's premise:** the brief said "macros + fibre only."
In fact the *schema* also carries **sodium and sugar** columns. BUT they are
largely dormant: the canonical scaler `scaleMacros()` in `food/macros.js`
(L23-43) returns only `{ kcal, proteinG, carbsG, fatG, fibreG }` — **it does not
scale or surface sodium or sugar at all.** The diary rollup in `database.js`
(L858-862, L1268-1272) likewise sums only kcal/protein/carbs/fat/fibre. So the
**effective** tracked-and-surfaced set is **macros + fibre** (5 values), with
sodium/sugar stored-but-unused. Either way: **zero micronutrients.**

**What VOLYUME's nutrition engine does instead (CONFIRMED, `nutritionEngine.js`):**
It is not a nutrient-database product — it is a **deterministic target
calculator + safety system**:
- Mifflin-St Jeor / Katch-McArdle BMR, tuned activity multipliers (L19-25, L548-572).
- Phase-based calorie targets, experience-scaled surplus (L27-34, L706-720).
- Protein targets on a g/kg LBM-or-bodyweight basis with three approaches (L63-96).
- **Safety floors:** sex calorie floors 1500 (male)/1200 (female) L789;
  FFM energy floor (30 kcal/kg FFM, Mountjoy RED-S) via `computeFFMFloor` L594-624;
  rapid-loss gates 0.8% warn / 1.5% hard cap L101-102, L805-820.
- Adaptive TDEE from EWMA weight trend with FFM-floor and rapid-loss clamps (L274-399).

**The gap in one line:** Cronometer tracks **~60–82 nutrients per food against
personalised USDA DRIs with a scoring/Oracle layer and a full biometric
subsystem, backed by the licensed NCCDB**. VOLYUME tracks **5 surfaced food
values (kcal, protein, carbs, fat, fibre; sodium/sugar dormant) and 0
micronutrients**, but pairs them with a **deterministic, safety-floored target
engine Cronometer has no equivalent of.**

---

## 3. What closing the gap would require — DECISION BRIEF

**[GATED — founder decision #16] — every item in this section. Do NOT build
without the structured founder decision. This section MAPS scope; it is not a
recommendation to proceed.**

### 3.1 Food data source — the hard dependency [GATED — #16]
- The moat is the **licensed NCCDB** (and USDA FoodData Central for the free
  tier). VOLYUME today seeds from label-level data (kcal/protein/carbs/fat +
  fibre/sodium/sugar). A micronutrient panel needs a per-food source carrying
  vitamins/minerals/amino-acids/fatty-acids.
  - **USDA FoodData Central** (FNDDS/SR Legacy) is free/public and carries most
    of the panel — viable for a free base, but coverage of branded/UK foods is
    weak.
  - **NCCDB** is commercially licensed (Univ. of Minnesota) — research-grade but
    a paid licence + contract; this is a **dependency decision** (CLAUDE.md: never
    add dependencies/contracts without asking) and a recurring cost.
  - EU/UK angle: VOLYUME is British-English/EU-resident. Targets would need a
    **DRI vs EU NRV** decision (Cronometer ships US DRIs).

### 3.2 Schema [GATED — #16]
- Per-food: ~60+ new nullable per-100g numeric columns (or a normalised
  `food_nutrients(food_id, nutrient_id, per_100g)` long table — far better than
  60 wide columns, matches offline-first SQLite and keeps nulls cheap).
- Per-user: a `nutrient_targets(user_id, nutrient_id, min, max, source)` table to
  hold DRI-derived min/max + custom overrides (mirrors Cronometer's min/max model).
- Diary rollup: extend `scaleMacros()` and the daily-total aggregation
  (`database.js` L858-862, L1268-1272) to sum the full panel — currently
  hard-wired to 5 fields.
- Sync: the food sync RPCs (`migrate_016`, `migrate_028`) and local schema would
  need the new columns/table; offline-first means the panel must live in local
  SQLite, not be queried from Supabase live (ARCHITECTURE rule).

### 3.3 NRV / target table [GATED — #16]
- A DRI (or EU NRV) reference table keyed by age band × sex (× pregnancy/lactation
  if supported), giving RDA/AI min and UL max per nutrient. This is a static data
  asset (~30 nutrients × ~16 demographic bands). Must be deterministic — no AI.
- Personalisation reuses existing profile (sex, age) already in `nutritionEngine`.

### 3.4 UI surfaces [GATED — #16]
- A per-food nutrient-detail panel; a daily "nutrient balance" view (Cronometer's
  gauge equivalent — `% of target`, over/under colour); optional an Oracle-style
  "best foods for nutrient X" reverse search (deterministic ranking, no AI).
- Pro-gating: per FREE/PRO matrix, **all micronutrient/nutrition-depth UI is Pro**
  (nutrition targets, macros, smart suggestions are already Pro). The DRI table
  and scoring would sit behind the Pro gate, mirroring Cronometer's Gold-gating
  of Nutrition Scores / Oracle / Custom Biometrics / Target Scheduler.

### 3.5 Biometrics [GATED — #16, and see §4]
- Custom biometrics + lipid panel + blood glucose/ketones/blood-pressure logging
  would be a parallel subsystem (Cronometer's `biometric_search`). VOLYUME today
  has weight, body-fat %, waist/girths and steps (in `body_metrics` /
  `weekly_checkins` / `daily_steps`). Extending to glucose/ketones/BP is **both a
  scope decision and an ED-safety decision** (see §4).

---

## 4. ED-safety considerations (per item)

The safety system (`nutritionEngine.js`, `edPatternDetector.js`, `wellbeing.js`,
`proGate.js`, `weeklyCoach.js`/`coachApply.js`) is **DO NOT TOUCH** and
**tier-blind**. Any nutrition-depth feature must compose with it, never around it.

- **Nutrient scoring MUST stay adherence-neutral.** Cronometer's score is a
  percent-of-target completeness number coloured red/green. A green/red "you
  scored 62/100 today" framing is a classic restriction/obsession trigger. If
  built, scoring must be **informational and non-judgemental** (no shaming, no
  streaks-of-perfection, no "you failed"), consistent with VOLYUME's no-shame
  rule. **ED-flagged.**
- **Max/UL targets are the risky half.** Min (RDA) targets nudge *toward* eating;
  max/"do not exceed" targets nudge *away* from eating (sodium, sat fat, sugar,
  even calories). A user predisposed to restriction can weaponise max targets.
  Any max-target UI must not become a restriction surface. **ED-flagged.**
- **Biometrics must not enable harmful tracking.** Blood glucose / ketones /
  body-temperature / detailed girths can feed disordered control loops
  (orthorexia, obsessive weighing/measuring). Body-fat % is already handled
  carefully (visual estimates are explicitly down-weighted, `bodyFatSource !==
  'visual'`). Adding glucose/ketone/multi-girth logging is **ED-safety-adjacent**
  and should be gated on the same founder decision, not bundled in silently. The
  existing weigh-in cadence and `edPatternDetector` signals would need to extend
  to any new high-frequency biometric.
- **Calorie/energy floors stay senior.** Whatever the panel shows, it must never
  let a micronutrient or "score" goal justify pushing intake below the sex floor
  (1500/1200) or the FFM floor (30 kcal/kg FFM). The floors are computed
  independently and must remain the hard gate.
- **No AI.** The Oracle and scoring are deterministic ranking/percent maths in
  Cronometer too — VOLYUME's no-LLM coaching boundary is preserved by building
  them deterministically. Do not introduce "smart" nutrient suggestions via AI.

---

## 5. Where VOLYUME's nutrition is ALREADY better than Cronometer

Cronometer is a *logging/measurement* tool; it has **no coaching safety system**.
VOLYUME's nutrition engine is categorically different and ahead on:

- **Hard safety floors Cronometer does not have:** sex calorie floors
  (1500 male / 1200 female, `nutritionEngine.js` L789) and the **FFM energy floor**
  (30 kcal/kg fat-free mass, RED-S consensus, `computeFFMFloor` L594-624).
  Cronometer will happily let a user set and chase a 900 kcal target.
- **Rapid-loss gating:** 0.8% BW/week warn, **1.5% BW/week hard cap** that raises
  calories automatically (L101-102, L805-820). Cronometer has no equivalent guard.
- **Deterministic, goal-aware targets:** phase/experience-scaled calories and
  evidence-based protein (g/kg LBM, three protocols) — a coaching layer
  Cronometer entirely lacks (it only compares intake to static DRIs).
- **Adaptive TDEE with safety clamps:** the EWMA-trend resize is FFM-floor- and
  rapid-loss-clamped so it can never push a cut into the danger zone (L351-387).
- **No-shame / ED-aware framing and Beat UK signposting** woven through
  (`wellbeing.js`, `edPatternDetector.js`) — the opposite of a raw red/green
  completeness score.

**Net:** Cronometer's moat is *measurement depth* (60–82 nutrients, NCCDB, DRIs,
biometrics). VOLYUME's moat is *safe, deterministic coaching* Cronometer has no
answer to. Closing the depth gap (#16) is a real, well-defined project — data
licence, schema, NRV table, UI, Pro-gating — but it is **founder-gated and
ED-safety-adjacent, and this brief explicitly does not recommend building it.**
