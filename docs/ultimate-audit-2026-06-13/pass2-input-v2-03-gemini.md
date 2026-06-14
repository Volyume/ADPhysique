# PASS-2 v2 INPUT — SOURCE 03: Gemini (compare-and-elevate brief)

## QC / PROVENANCE HEADER (read before using)
- Source: Gemini, run by founder 2026-06-14.
- **PROVENANCE = SIMULATED / STATIC-DATASET, NO LIVE BROWSE (same failure as v1 Gemini).** Its own Section 0:
  *"conducted WITHOUT live web access during the current session… derived from a static, comprehensive dataset
  of market research snippets captured immediately prior."* It lists a handful of real URLs at the end (6:
  macrofactor.com/wearables + Reddit threads) but admits it did not open them this session → TRAINING/SIMULATED
  grade. Its app-standings numbers (e.g. MacroFactor "4.7/1.6k GB", Strong "4.9/24k GB", Hevy "4.9/23k GB",
  Nutracheck "4.8/259k GB", Strava "4.8/128k") are from the static dataset, not verified live — treat as
  indicative, not authoritative (they also CONFLICT with Claude's live-browsed counts, see below).
- Matrix handling: Gemini-UNIQUE claims = SINGLE-SOURCE SIMULATED (do not grade as VERIFIED). Where Gemini
  agrees with Claude (sourced) and/or ChatGPT, it adds directional corroboration only.
- **Rating conflict flag:** Gemini GB counts (Strong 24k, Hevy 23k) are an order of magnitude below Claude's
  live US-store counts (Strong 108k, Hevy 220k). Plausibly GB-store vs US-store, but unverified → PARTIAL.

---

## SECTION 0 — NO live web access; static dataset; date 14 Jun 2026.

## PER-DOMAIN (faithful summary; SIMULATED provenance throughout)

**D1 CARDIO:** BEST = MacroFactor (adherence-neutral deterministic TDEE back-calc, "double-counting" eliminated;
warns EAT/NEAT compensation) + Carbon (cardio-as-lever education, NEAT offset). LEAD: Volyume's no-add-back +
cardio-as-lever scientifically sound. LAG: (1) **wearable isolation** — manual-only ignores passive Apple Watch/
Garmin/Fitbit data; redundant entry friction (even though correctly not altering targets). (2) **contextual
isolation** — reverse-chrono list = "zero analytical value"; can't correlate cardio vs strength degradation
("interference effect"); subjective intensity misses Zone-2 HR / step accumulation. ELEVATE: (1) passive
ingestion (HealthKit/Health Connect steps + HR → inform deterministic engine; if steps dropped 10k→5k, restore
movement before cutting cals). (2) **interference tracking** — flag high-intensity cardio within 12h of lower-body
hypertrophy. (3) cardio-as-lever dashboard viz. UK: offline-first queue + background sync (poor gym signal).

**D2 MEAL PLANNING:** BEST = Eat This Much (deterministic plans hitting exact targets + constraints, grocery
lists, leftover logic) + **Nutracheck (500,000+ verified UK DB; Tesco/Waitrose/M&S/Aldi/Sainsbury's + Greggs/
Wetherspoon/Nando's)**. LEAD: progressive-disclosure calm plates + honest residual line (sophisticated). LAG:
(1) no automated grocery list aggregation; (2) repetition/food-fatigue; (3) **database localization barrier** —
plan useless if can't buy ingredients in UK supermarket; Lifesum backlash over non-localized UK estimates.
ELEVATE: (1) **supermarket-specific deterministic generation** (branded UK items, e.g. "Tesco 5% Fat Beef Mince"
not generic); (2) automated grocery aggregation + UK unit conversion (round to UK pack sizes, 200g spinach bag);
(3) batch-prep "Cook Once Eat Twice" leftover distribution. UK: British English (grilled/coriander/courgette not
broiled/cilantro/zucchini) + metric.

**D3 RECIPES:** BEST = MacroFactor (URL paste→auto-parse ingredients/servings + **"Total Weight" cooked-yield
feature** — log by cooked mass not fractional servings). LEAD: live scaling preview, reuse search, one-tap log.
LAG: (1) **"Cooked Yield Problem"** — total-servings scaling is a "fatal flaw"; water loss/gain changes energy
density; MF solves via final cooked-weight-in-grams recalc. (2) manual entry friction = abandonment; URL import
= table-stakes. ELEVATE: (1) **deterministic URL parsing via schema.org/Recipe JSON-LD** (NO-LLM-compliant; BBC
Good Food/Jamie Oliver use it; rigid algorithmic parser); (2) **cooked-mass yield scaling** (input total cooked
weight → macros per 1g); (3) nested "Base Recipes." UK: localize parser to tbsp/tsp/ml/g + UK DB; SQLite local.

**D4 FOOD INSIGHTS:** BEST = **Hava** ("Satiety Score" 0-100 grading meals on protein density/fibre/volume —
predicts fullness, explains why deficits fail) + MacroFactor (shifting-TDEE viz, removes shame). LAG: (1)
retrospective vanity metrics — 7-day hit-rate = what not why; ignores satiation dynamics (energy density >1.75
kcal/g → satiation failure → binge); (2) rigid 7-day window masks 28-day menstrual cycle impact. ELEVATE: (1)
**deterministic Satiety Index** (we already have macros+fibre+weight; grade meals, "Satiety vs Adherence"
scatter); (2) predictive weak-spot detection (auto insight cards: "miss protein by 30g on 80% of rest days");
(3) **14/28/90-day windows + menstrual overlays**. UK: UK labels deduct fibre from carbs (US includes) — engine
must use UK-compliant maths or corrupt Satiety Index.

**D5 RECAP:** BEST = Strava Year in Sport (synthesises telemetry into shareable emotional narratives, social
stats). LEAD: Year of Lifts mirrors Spotify-Wrapped UX (swipe, hero number, pips). LAG: (1) annual-only =
engagement left on table 11 months; physique = 6-12wk meso-cycles need block summaries; (2) **emotional
disconnect of raw absolute numbers** ("lifted 10,000kg" = dry/hollow). ELEVATE: (1) **relative context over
absolute tonnage** (Hevy uses planes/trucks/dinosaurs to acclaim; "4 London double-decker buses"); (2)
**meso-cycle Block Reports** on block completion ("squat 1RM +5kg, hit 92% protein"); (3) **local rendering**
(iOS CoreGraphics / Android Canvas → instant offline → camera roll). UK: UK landmarks (London Black Cab,
Hadrian's Wall), 9:16 IG/TikTok, GBP/British spellings.

**D6 BUILDER:** BEST = Strong (plate calculators, auto rest timers, warm-up calcs, **per-exercise kg/lb mixing
without global settings**) + Hevy (Apple Watch live-sync, set-type tags drop/warmup/failure, wrist progression
graphs). LAG: (1) **lacks granular set metadata** — no RPE/RIR, no warmup/drop/failure tags → deterministic
coach can't gauge true progressive overload (easy-10 vs failure-10); (2) **no standalone Apple Watch** (Strong/
Hevy train phone-free); (3) mid-workout substitution friction (occupied machine → must swap without breaking
template). ELEVATE: (1) **live substitution engine** (biomechanically-equivalent swaps via deterministic tags,
keeps volume tracking); (2) **RIR/RPE stepper linked to engine** (0 RIR on compounds 3wks → auto-deload prompt);
(3) **mixed-unit plate calculator**. UK: free weights kg, cable stacks often lb — **per-exercise unit definitions
required** (no mental 42.5lb→19.2kg mid-set).

**D7 UX/UI:** BEST = MacroFactor (**Timeline Logger** — continuous timestamp, abandons rigid Breakfast/Lunch/
Dinner buckets, kills "where does a 3pm snack go" friction) + Whoop (high-contrast deep-dark, medical-grade viz).
LEAD: hero-first, priority-stack banners, structure-first skeletons, ±52px steppers/tabular nums, no-AI-slop
one-line coaching = premium for chaotic gym env. LAG: (1) **±steppers fail for GROSS adjustments** — stripping
140kg→60kg = dozens of taps (major flow friction); (2) no rearrangeable tiles — power users need pin control
(beginner pins Next Session, competitor pins macro residual/water); (3) quiet-toast PR lacks tactile celebration.
ELEVATE: (1) **MacroFactor-style Timeline Logger** (timestamp, min taps, temporal analytics); (2) **hybrid input
— long-press the value → native numeric keypad** (micro via stepper, gross via keypad); (3) **Core Haptics**
(rest-timer-zero sharp pulse, PR ascending vibration). UK: #0D0D0D good for dark winter commutes; GBP/decimal
formatting no clipping on iPhone SE.

## GEMINI-UNIQUE (SINGLE-SOURCE SIMULATED — do not grade as verified without corroboration)
Hava "Satiety Score" app + deterministic Satiety Index idea; cardio-strength "interference effect" tracking +
12h proximity flag; satiety threshold 1.75 kcal/g; schema.org/JSON-LD deterministic URL parser (engine-safe
method — valuable); UK landmark relative comparisons; per-exercise kg/lb unit mixing (strong UK point);
MacroFactor Timeline Logger; hybrid stepper+keypad long-press; Core Haptics; UK fibre-deduction maths.

## GEMINI LOW-CONFIDENCE REGISTER (its own)
- Global downloads for paid tiers NOT FOUND (storefront obfuscation).
- Whoop exact UX inferred deductively (proprietary hardware, no screen-by-screen).
- Hava satiety formula maths hidden (proprietary) — recommendations deductive from cited 1.75 kcal/g threshold.
- 6 URLs listed (macrofactor.com/wearables ×2, Reddit r/MacroFactor, r/loseit, r/Fitness ×2) — not opened live.
