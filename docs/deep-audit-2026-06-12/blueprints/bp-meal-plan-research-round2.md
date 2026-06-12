# Meal-Plan Research — Round 2 (post-spreadsheet)

**Deep Audit 2026-06-12 · Synthesised by the orchestrator from six completed
search-angle research agents** (the round-2 parent agent timed out before writing
this file; its sub-agents all completed and their findings are captured here).
Builds on `bp-meal-plan-generator.md` (round 1), `bp-meal-plan-coach-systems-research.md`,
the founder's coach-spreadsheet (`inputs/coach-spreadsheet-extract.md`), and the
seven scope items in `_PLAN-followup-research-pass.md`. British English. All
findings respect the hard constraints (deterministic, offline, Pro-gated, ED-safety).

---

## Scope item 1 — Training-day vs non-training-day (TD/NTD) carb cycling

**Evidence verdict (honest):** There is **no RCT** directly showing day-to-day
TD/NTD carb cycling beats isocaloric flat intake for fat loss or muscle retention
in resistance-trained physique athletes. The often-quoted "3.1% greater fat loss"
figure on coaching blogs is **untraceable to any primary source — treat as
fabricated**. What evidence does support:
- **Refeeds** (weekly 2-day carb pulse, ~25% deficit): Campbell 2020 RCT found
  better fat-free-mass preservation (FFM loss 0.4 vs 1.3 kg), though a published
  re-analysis disputes whether *total* FFM (vs only dry FFM) truly differed.
- **Diet breaks** (MATADOR, weeks-on/off): more fat loss + less metabolic
  adaptation — but in obese non-training men, not lean athletes; two athlete RCTs
  (ICECAP, Khalil 2023) found **no lasting advantage** of intermittent vs flat.
- **Consensus:** energy balance, total protein, and training volume are the primary
  drivers; carb timing/cycling is second-order. Benefits that exist are about
  **lean-mass preservation and adherence**, not magic fat loss.

**Coaching convention (universal, regardless of the thin RCT base):** protein held
constant across day types; carbs are the lever (rest days ~300–600 kcal lower, all
from carbs); fat either equalised (modern RP 3.0, for meal-prep simplicity) or
raised slightly on rest days for satiety (the older convention — and exactly what
the founder's coach did: NTD carbs 1412→1008 kcal, fat 792→1026 kcal). Carbon
notably does **not** automate this (manual only).

**Design conclusion:** Build TD/NTD as first-class plan variants (it's universal
practice, adherence-positive, and what the founder's coach used), driven by
Volyume's existing carb-cycle/refeed engine + the training schedule. Offer the fat
convention as a setting (default = equalised, for prep simplicity). The methodology
page must be **honest**: "carb cycling helps adherence and may protect muscle in a
deficit; it is not a magic fat-loss lever" — never repeat the fabricated stat. An
automatic, schedule-aware TD/NTD plan is itself a differentiator (Carbon makes you
do it by hand).

## Scope item 2 — Peri-workout meal structure (pre / intra / post)

**Evidence verdict:** The "anabolic window" is **hours wide, not 30–60 minutes**,
for a fed trainee (Aragon & Schoenfeld 2013; 2017 RCT pre-vs-post = same outcome;
2018 JOSPT; ISSN 2017). Muscle stays protein-sensitised ~24h; a typical session
depletes only ~39% of glycogen; total daily protein (~0.4 g/kg/meal × 4+ meals to
hit 1.6–2.2 g/kg/day) dominates. **BCAAs alone cannot drive MPS** (Wolfe 2017 —
the other EAAs become rate-limiting). **Intra-workout EAAs** add little for a fed
trainee inside the ~3–4h "muscle-full" refractory window; they earn their place
only when training **fasted, in a deficit, or in sessions >75–90 min**. RP itself
calls the workout shake "mostly a bonus" for sub-60-min sessions and claims only a
~5% edge from peri-workout nutrition overall.

**Pre-workout rule coaches do follow:** keep **fat and fibre low within ~60 min of
training** (they slow gastric emptying / cause GI distress); concentrate carbs
around training.

**Design conclusion:** Support **pre-workout and post-workout meal slots** as
real, useful structure (RP does, the founder's coach did). Treat **intra-workout
as an optional, edge-case slot** (long/fasted sessions) — NOT a default, and never
prescribe BCAA/glutamine as the default the founder's old sheet did. Apply a
low-fat/low-fibre preference to the final pre-workout meal. The methodology page
explains *why* the window is wide — another honesty/trust win.

## Scope item 3 — Curated-switch calibration (the swap maths)

**Verdict (verified against USDA):** Coaches calibrate swaps by **the dominant
macro of the food's role, NOT calories.** Verified on the founder's own pairs:
- Rice 125g cooked (35.2g carb, 163 kcal) → Pasta 50g dry (37.5g carb, 186 kcal):
  **carb match within ~2g**; calories drift ~14% — accepted as a *carb-source* swap.
- Cashews 20g (8.8g fat, 111 kcal) → Dark choc 85% 21g (8.9g fat, 126 kcal):
  **fat match within 0.1g**; a *fat-source* swap.
- Tolerance in practice ≈ **±2–5g on the dominant macro at the meal level**. The
  only published algorithmic standard (GVSU): ±85 kcal, ±5g protein, ±2.5g fat,
  ±10g carb per 100g; the clinical exchange-list system groups carbs in 15g units.

**Watch-out:** the **dry-vs-cooked trap** — 50g dry pasta = ~112–125g cooked with
identical carbs. Plans MUST label which weight is meant (a common app error).

**Design conclusion:** The swap engine matches the **role macro within a tight band
(target ±2–5g, configurable)** and lets calories follow. Volyume can be **more
precise than a human coach** — compute the exact gram (e.g. 46–47g pasta to hold
35g carb) instead of a hand-rounded 50g — while still offering curated named
switches like the coach sheet. Every food carries an explicit `unit` and a
`cooked`/`raw` flag; the food DB stores per-100g macros and the engine rescales.

## Scope item 4 — Per-food constraint rules

**Verdict:** Coaches apply a real, if informal, **six-type per-food constraint
taxonomy** — and **no existing app encodes these as per-food numeric filters**
(they curate food lists by hand; That Clean Life gets closest with category tags):

| # | Constraint | Direction | Typical threshold |
|---|------------|-----------|-------------------|
| 1 | Fat on a carb source | max | ≤3–5 g/100g (above → count as combo food; RP's "5g incidental" rule) |
| 2 | Protein density (protein source) | min | ≥18–20 g/100g cooked (≥22 for prep staples) |
| 3 | Fibre on a carb source | min | ≥2 g/100g (whole-food bias) |
| 4 | Added sugar (staples) | max | ~0 (fruit allowed, limited) |
| 5 | Sodium (food selection) | max | plain/unseasoned preferred |
| 6 | Energy density (volume foods) | max | ≤~1.5 kcal/g |

Reference scoring models with exact per-100g thresholds: **Nutri-Score / FSA-Ofcom**
(sugar, sat-fat, salt as negatives; fibre, protein as positives) and RP's 0–100
Nutrient Density Index — directly usable as the basis for a food-quality score.

**Design conclusion:** Model swaps/foods with **structured, optional constraints**
(e.g. a CHO swap may carry `maxFatPer100g: 4`, matching the founder coach's "cereal
<4g fat/100g" note). This per-food constraint engine is a **genuine differentiator**
— nobody else does it. It also feeds the separately-scoped rule-based food-quality
score (ext-03 Theme G) using the bundled Open Food Facts NOVA/Nutri-Score data.

## Scope item 5 — Elite plan presentation conventions

**Verdict — what makes a plan look "coach-grade" vs a generic app:**

| Convention | Generic app | Coach-grade |
|---|---|---|
| Personalisation | name only | name + goal + phase + week number |
| Meal naming | Breakfast/Lunch/Dinner | numbered (Meal 1–N) or timed, + pre/intra/post |
| Day types | one layout | **TD / NTD variants** |
| Water target | separate widget | **on the plan**, as a daily target |
| Supplements | absent | **inline line items** in the relevant meal |
| Daily summary | a ring | **explicit totals row** (grams per macro **and** kcal), per-meal **and** per-day |
| Phases | none | week-by-week macro progression |

Water formula: **30–35 ml/kg/day** baseline (+ ~500–1000 ml/training hour), or the
"1 ml per kcal" shorthand; coaches state flat 3–4 L targets. Pre-workout: large
meal 2–3h before, light low-fat/fibre snack 30–60 min before.

**Design conclusion — dual-market presentation:** ONE plan object, progressive
disclosure. **Besa view:** "Here's your day", meals + a calm "swap anything", a
single daily total, no jargon. **Eddie view:** per-meal grams-per-macro + kcal,
per-day totals row, TD/NTD toggle, week/phase progression, water target on the
plan, peri-workout slots, supplement line items. Same data, two skins.

## Scope item 6 — Supplements as plan line items (structure only)

**Verdict:** Coaches place supplements as **named, non-macro (or macro-counted for
protein powder) line items inside the relevant meal slot** — creatine 5g listed in
the post-workout meal; whey 35g counts its macros; multivitamin/omega-3 with a
meal; no separate "supplement tracker" in Trainerize/Everfit (they're custom food
entries). Creatine evidence: post-workout-with-carbs placement is mildly preferred,
but **consistency/daily total matters more than timing**.

**Design conclusion:** Allow the plan to carry **supplement line items** in a slot
(macro-counted for protein powder; zero-macro tag for creatine/EAA/vitamins). This
links cleanly to the separately-scoped supplement-guidance screen
(`bp-supplement-guidance.md`) — e.g. "Creatine 5g" shown in the post-workout meal,
tapping through to the evidence page. NEVER any PED line item. The default plan
includes only evidence-backed basics (creatine optional), never the
glutamine/BCAA the founder's old sheet carried.

## Scope item 7 — Cross-check of round-1 conclusions

- **Greedy protein-first assembler:** sound and matches coaching practice
  (protein first, then carbs around training, fat to fill) — but add a
  **day-balance pass** so meals are sensibly distributed across the day rather
  than front-loading protein into early meals (coaches spread protein ~0.4 g/kg
  across 4+ meals for the leucine threshold each meal).
- **Meal count:** round 1 assumed a flexible count; confirm **4–6 meals** is the
  physique norm (RP: 6 TD / 5 NTD original, or 3 + snack simplified). Default to
  the user's chosen meals/day; offer a peri-workout add-on slot on training days.
- **TD/NTD:** round 1 under-specified this; it is now **first-class** (item 1).
- **Swap tolerance:** round 1 said "hold the macros" loosely; now pinned to
  **±2–5g on the role macro** (item 3) with the dry/cooked flag.
- **Variety:** round 1's rotation dial maps to Stronger U's **"3-3-3" method** (3
  proteins, 3 carbs, 3 fats, rotated) — adopt that as the named model.

---

## RECONCILIATION EDIT-LIST for `bp-meal-plan-generator.md`

Apply these concrete changes when finalising the generator blueprint:

1. **[item 1] Add TD/NTD as first-class plan variants.** Protein constant; carbs
   are the lever (rest day ~300–600 kcal lower); fat convention a setting
   (default equalised). Driven by training schedule + the existing carb-cycle
   engine. Methodology copy must be honest about the thin evidence (no fabricated
   stats).
2. **[item 2] Add pre/post-workout meal slots (training days); intra-workout as an
   optional edge-case slot only.** Low-fat/low-fibre preference on the final
   pre-workout meal. Do NOT default to intra BCAA/EAA/glutamine.
3. **[item 3] Pin the swap tolerance:** match the food's **role macro within
   ±2–5g** (configurable), calories follow. Compute exact grams (beat hand-rounding).
   Add a mandatory `unit` + `raw/cooked` flag on every food; label plan weights.
4. **[item 4] Add a structured per-food constraint model** (the 6-type taxonomy):
   swaps/foods can carry `maxFatPer100g`, `minProteinPer100g`, `minFibrePer100g`,
   etc. This is a flagged differentiator. Feed a rule-based food-quality score from
   bundled OFF/Nutri-Score data.
5. **[item 5] Specify the dual-market presentation explicitly:** one plan object,
   Besa skin (day view + calm swap, single total, no jargon) vs Eddie skin
   (per-meal grams+kcal, day totals row, TD/NTD toggle, water target on the plan,
   phase/week progression, peri-workout slots). Add a daily **water target** field
   (30–35 ml/kg) to the plan object.
6. **[item 6] Add supplement line items** to meal slots (macro-counted protein
   powder; zero-macro creatine/EAA/vitamin tag), linking to the supplement screen.
   Evidence-backed basics only; never PEDs; never default glutamine/BCAA.
7. **[item 7] Add a day-balance pass** to the assembler (spread protein ~0.4 g/kg
   across 4+ meals, don't front-load). Default **4–6 meals**; adopt the **3-3-3
   rotation** as the named variety model.
8. **Methodology/voice:** every nutrition claim the plan surfaces (carb cycling,
   nutrient timing, supplements) must be honest and evidence-graded on the
   methodology page — this *is* the transparent-coach trust moat. Explicitly
   never repeat the fabricated "3.1% fat loss" carb-cycling claim.
</content>
