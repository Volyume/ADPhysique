# PASS-2 v2 INPUT — SOURCE 01: ChatGPT (compare-and-elevate brief)

## QC / PROVENANCE HEADER (read before using)
- Source: ChatGPT, run by founder 2026-06-14, domain-by-domain.
- **PROVENANCE = EXPERT-BENCHMARK / TRAINING-GRADE, NOT SOURCED RESEARCH.** ChatGPT opened with: *"This section
  is an expert benchmark, not the fully sourced research version from your original brief."* It did NOT provide:
  Section 0 live-access declaration, source URLs (rule 1), [BROWSED]/[TRAINING] tags (rule 3), or app
  ratings/#ratings (rule 4). So every claim here is **single-source + unsourced opinion** — the weakest
  provenance grade. Treat as hypotheses to corroborate, NEVER as a verified bar.
- Matrix handling: nothing from this becomes a VERIFIED cell on its own. It can only reach PARTIAL if a second
  AI (with sources) corroborates, or VERIFIED if 2-of-3 + a real URL land. Until then it is SIMULATED-grade.
- Stored verbatim below as pasted; my commentary is confined to this header.

---

## DOMAIN 1 — CARDIO LOGGING (verbatim)

Method note (ChatGPT's own): "This section is an expert benchmark, not the fully sourced research version from
your original brief."

A) BEST IN CLASS — market split into three philosophies:
- Philosophy 1 Endurance Tracking (Strava, Garmin Connect, Whoop): GPS/HR/routes/pace/performance. Called an
  irrelevant benchmark for Volyume; "should not compete here."
- Philosophy 2 Calories-In/Calories-Out (MyFitnessPal, Lifesum): log exercise → estimate calories → increase
  food allowance. Common in general-population apps; "increasingly distrusted" by serious physique athletes.
  Complaint: "I burned 600 calories according to my watch and gained weight."
- Philosophy 3 Coaching-Based Energy Management (MacroFactor, Carbon Diet Coach, RP Hypertrophy): cardio →
  expenditure → bodyweight → future adjustments; NOT "treadmill = +400 cals to eat today." Called the current
  gold standard for physique users.

B) WHERE VOLYUME LIKELY LEADS:
1. No calorie add-back — avoids double counting, watch/treadmill inaccuracies, "earned food" psychology.
2. Cardio as a lever (add only when fat loss stalls) — closer to how good prep coaches operate vs fixed
   scheduled cardio.
3. Simplicity — physique athletes don't care about route maps/segments/pace; focus on compliance/expenditure/
   results.

C) WHERE VOLYUME LAGS:
- Gap 1 Wearable import (biggest gap) — users hate admin; expect Apple Health/Garmin/Fitbit/Whoop to flow in
  automatically. Convenience, not coaching.
- Gap 2 Cardio adherence intelligence — leaders analyse (weekly average, trend, adherence %, completion rate),
  not just log.
- Gap 3 Cardio trend visibility — user should see 0/90/180 min/week and how it changed; "history ≠ trend."
- Gap 4 Missing behaviour context — records duration/activity/intensity but not indoor/outdoor, commute,
  deliberate vs lifestyle activity; limits coaching insight.
- Gap 5 Lever transparency — when coach increases cardio, show why ("Weight loss averaged 0.1%/week over 3
  weeks. Cardio increased by 40 mins/week"); trust rises.

D) HOW TO ELEVATE (ranked):
1. Passive cardio capture (import Apple Health/Health Connect/Garmin/Fitbit/Whoop; auto-import sessions; user
   edits; calorie estimates informational only).
2. Cardio compliance score (prescribed/completed/adherence %).
3. Cardio effectiveness timeline (week-by-week cardio mins vs weight change).
4. Smart cardio escalation engine (explain rate-of-loss-below-target → increase, reasoning visible).
5. Activity budgeting (90/120/180 min/week targets, not calorie budgeting).
6. Recovery-aware cardio (detect high lifting volume + large deficit + excessive cardio → suggest holding).

E) VERDICT: already stronger than most calorie-add-back systems; main weakness is convenience, not coaching
philosophy. Next level = automatic capture + adherence analytics + decision explanation + trend visualisation.
Biggest mistake would be adding GPS/route maps/segments/endurance features.

SCORECARD (ChatGPT's grades for Volyume): coaching philosophy A, physique relevance A, simplicity A,
behavioural design A-, convenience C+, wearable ecosystem D, analytics depth C, market differentiation A-.
Biggest opportunity: "first serious physique app that combines MacroFactor-style energy modelling with
frictionless cardio capture and transparent cardio decision-making."

---

## DOMAIN 2 — SMART MEAL PLANNING (faithful summary; same expert-benchmark provenance, no sources)

A) BEST IN CLASS: **Eat This Much** (full day/week generation; macro targeting with hard constraints;
preferences/exclusions; regenerate meal/day/week; lock meals while regenerating; grocery list; pantry-aware;
high controllability — the regeneration system is the key differentiator). **MacroFactor** (adjacent: macro-first
adaptive targets, "suggested foods" heuristics not rigid plans; trust via feedback loop). **MyFitnessPal**
(database scale + barcode + community recipes; ecosystem not planning intelligence). **Cronometer** (nutrient
accuracy, micronutrients, URL recipe importer).

B) WHERE VOLYUME LIKELY LEADS: deterministic structure clarity (day-as-plates + calm line + residual — cleaner
than MFP, more guided than Cronometer); coaching integration (plan connected to weight trend/training/cardio
lever — "coach adjusts diet" not "user follows plan"); constraint-driven determinism (same inputs→outputs, no
LLM hallucination) IF the engine is truly stable.

C) WHERE VOLYUME LAGS: (1) **regeneration control depth** — best-in-class allows regenerate single meal /
category / day / week + lock nutrients-or-meals; ours appears to be swap-any-plate + new-meals, likely missing
partial-constraint regeneration. (2) **UK food realism** — US-centric foods, unrealistic servings, no supermarket
equivalence (Tesco/Aldi/Sainsbury's); "can I buy this in Tesco today?" — UK retention risk. (3) **repetition
fatigue** — planners fail at 2-4 weeks; need rotation/ingredient-cycling/cuisine-switching. (4) **grocery-first
planning** — "is this a 20-minute Tesco shop?" underweighted. (5) **trust gap in perfect macro hitting** — users
prefer "close enough"/buffer ranges; strict optimisation reduces adherence.

D) ELEVATE (ranked): 1 regeneration overhaul (meal/macro-block/day/week + selective lock). 2 UK retail
constraint layer (Tesco basket mode, Aldi/Sainsbury substitution, ingredient realism scoring). 3 "adherence
realism mode" (green/amber/red zones not perfect targets). 4 variety engine (cuisine rotation, repetition
limits, weekly novelty min). 5 grocery output (1-click list, aisle-grouped, minimal-waste). 6 behavioural
fallback (re-anchor gently on deviation, avoid plan collapse).

E) KEY INSIGHT: market split = perfect-macro (Cronometer) / behaviour (MacroFactor) / structured-plans (Eat
This Much). Volyume sits in a hybrid gap (good). Winning position = behaviour-first planning that is "good enough
nutritionally" and sustainable in UK retail reality.

SCORECARD: macro accuracy A-, UX clarity A, behavioural realism B, UK food fit C (unknown risk), regeneration
control C, variety C+, grocery integration C.

---

## DOMAIN 3 — RECIPES (faithful summary; same provenance, no sources)

A) BEST IN CLASS: **Cronometer** (gram-level ingredients, auto macro+micro aggregation, per-serving live
recalculation, edit-without-breaking-logs, recipe-as-single-diary-entry, URL importer, nested recipes — the
bar). **MyFitnessPal** (basic builder + barcode + community recipe sharing; fast entry, lower precision).
Cross-app convergence: URL import, copy/paste ingredient parsing, AI-assisted extraction, "one recipe = one log
item."

B) WHERE VOLYUME LIKELY LEADS: deterministic recipe engine (ingredient list→deterministic macro, stable
scaling, no drift); recipe-as-atomic-diary-line (reduces friction/clutter); clean architecture separation (meal
plan = suggestion / recipe = construction / diary = consumption) vs MFP muddle.

C) WHERE VOLYUME LAGS: (1) **URL import** (major — paste URL→auto-extract→auto-map→confirm; highest
perceived-value modern feature). (2) **ingredient parsing intelligence** (cup/cooked-vs-raw/brand/serving drift;
manual-only = visible effort gap). (3) **nested recipe depth** (recipe-in-recipe, reusable "chicken base"/"rice
base" components; power users outgrow shallow systems). (4) **recipe modification after logging** (adjust created
recipe; historical-log consistency mode). (5) **batch cooking / leftovers** ("cook once eat 4×"; most apps treat
servings as isolated — gap even in leaders).

D) ELEVATE (ranked): 1 URL import pipeline (parse + extract + manual-correction fallback + reconciliation).
2 recipe "component system" (protein/carb/sauce base → assembly). 3 batch-cooking mode (cook once, distribute
servings, track leftovers). 4 ingredient confidence system (high/medium/low). 5 smart scaling UX (+1/+0.5/custom
grams, no deep menus). 6 recipe↔meal-plan bridge (recipe as plan component; plan suggests existing recipes).

E) KEY INSIGHT: 2026 recipes = "how fast from idea → structured nutrition entry → repeatable behaviour", not
"can you store ingredients." Cronometer wins accuracy, MFP wins ecosystem, most lose on friction.

SCORECARD: nutritional accuracy A-, UX simplicity B+, power-user depth B, automation readiness C (risk if no URL
import), UK usability B (depends on food DB), batch cooking C, trust in outputs A-.

---

## DOMAIN 4 — FOOD INSIGHTS / NUTRITION ANALYTICS (faithful summary; same provenance, no sources)

A) BEST IN CLASS: **MacroFactor** (weight-trend smoothing not raw weight; intake-vs-expenditure inferred from
outcomes; adaptive recalibration; rolling multi-week windows; "translates behaviour→outcome, removes daily-noise
obsession" — "users need causality not more charts"). **Cronometer** (macro+micro depth, nutrient sufficiency;
data-heavy, weak behavioural insight). **MyFitnessPal** (descriptive dashboards, shallow/non-diagnostic).
Emerging expectation: "why am I not losing weight / what changed this week / what habit broke progress" — not pie
charts.

B) WHERE VOLYUME LIKELY LEADS: weekly adherence framing (7-day kcal-vs-target bars + macro hit-rate + CSV reduces
daily obsession, frames trend); deterministic coaching integration (analytics→decision→adjustment loop merged,
vs competitors separating tracking/coaching/adjustment); simplicity over Cronometer overload.

C) WHERE VOLYUME LAGS: (1) **causal explanations** (critical — shows what happened not why; missing weekend
spikes / protein inconsistency / step-drop / cardio-change correlation). (2) **behavioural segmentation**
(weekday-vs-weekend, training-vs-rest, consistency clusters). (3) **adherence scoring** (adherence %, consistency
index, volatility — "you were 78% consistent this week"). (4) **predictive feedback** ("at current rate you'll
reach X by Y"). (5) **intervention suggestions** ("reduce intake by 150 kcal" — without it, passive tracking not
coaching).

D) ELEVATE (ranked): 1 causal insight engine (likely-cause-of-deviation, simple correlation flags NOT ML-heavy,
behaviour grouping). 2 adherence scoring (nutrition/protein adherence %, calorie variance). 3 predictive
trajectory view (projected weight line from current adherence). 4 behaviour clustering (weekday/weekend,
training-day, cardio-day). 5 intervention layer (turn analytics into actions). 6 minimal-but-powerful dashboards
(trend/adherence/cause/next-action, avoid Cronometer overload).

E) KEY INSIGHT: market solved tracking/macro-display/nutrient-breakdown; has NOT solved turning nutrition data
into understandable behavioural cause-and-effect coaching. MacroFactor closest; most others still reporting tools.

SCORECARD: data accuracy A-, behaviour insight B, coaching integration A-, predictive capability C, UK relevance
B, actionability B, simplicity-vs-depth balance A-.

---

## DOMAIN 5 — ANNUAL RECAP / ENGAGEMENT (faithful summary; same provenance, no sources)

A) BEST IN CLASS: **Strava "Year in Sport"** (totals, PBs, sport breakdown, achievements, shareable cards;
"transforms passive data into identity content"; this-year-vs-last comparative framing). **Spotify Wrapped**
(segmented story cards, narrative progression, personalised "surprise" stats, social sharing loops — defines
modern recap UX). **Apple Fitness** (rings/badges, clean ecosystem, but low virality / limited narrative).
**Whoop** (strain/recovery/sleep storytelling, behaviour→physiology narrative, coaching-identity framing).

B) WHERE VOLYUME LIKELY LEADS: combined strength+nutrition+weight storytelling (unify training load + nutrition
adherence + weight trend — structurally stronger than single-domain Strava or data-only MFP); deterministic stat
generation (predictable/consistent/reproducible); "hero stat" design (single hero number/card + swipe = Spotify
Wrapped pattern).

C) WHERE VOLYUME LAGS: (1) **identity layer missing** (critical — best recaps are about identity not stats: "you
trained 156 times", "top 5%"; ours shows what-happened not what-it-says-about-the-user). (2) **comparative
benchmarking absent** (percentile/peer/global bands — without it, low emotional impact). (3) **narrative
structure underdeveloped** (Spotify/Strava design emotional pacing; many recaps are "data dumps in card format").
(4) **shareability primitives missing** (IG story / TikTok / auto-captioned cards; no export-first = low
virality). (5) **multi-timeframe absence** (weekly / monthly / training-block 8-12wk recaps; annual-only feels
outdated).

D) ELEVATE (ranked): 1 identity-based stat layer (raw metrics → identity statements). 2 multi-layer comparison
(self-vs-last-year, cohort percentile, goal-vs-achieved). 3 narrative sequencing (start→consistency→peak→outcome).
4 share-first design (every card exportable, readable without app context). 5 block-based recaps (4-week block,
12-week phase, cut/bulk phase — aligns with bodybuilding cycles). 6 emotional weighting (prioritise consistency/
transformation/adherence wins over raw volume).

E) KEY INSIGHT: strongest recaps are "identity reinforcement engines disguised as data summaries." Strava = "I am
an athlete", Spotify = "my taste identity", Whoop = "my physiology profile". Volyume's opportunity = "this is my
physique discipline identity" — requires moving beyond stats into behavioural narrative.

SCORECARD: data richness A-, narrative quality B, identity reinforcement C, shareability B, UK relevance B,
multi-timeframe structure C, emotional impact B.
