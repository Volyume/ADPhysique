# Phase 3 master-comparison — Area 04: Nutrition & macro management

Reconciles Phase-1 (Volyume current) `phase1/07-nutrition-targets.md` against
Phase-2 market research `phase2/research-04-nutrition.md`. READ-ONLY synthesis;
no new web research. British English. Every market claim carries its
Phase-2 status (VERIFIED / PARTIAL / NOT-FOUND); every Volyume claim carries its
Phase-1 file:line.

---

AREA: Nutrition & macro management

VOLYUME CURRENT: Volyume's nutrition layer is a Pro suite of four screens.
**Nutrition Targets** (src/screens/NutritionTargetsScreen.js) takes body stats,
activity, goal/phase and a protein approach, then computes daily calorie + macro
targets with a goal-aware "Why these numbers for you?" breakdown and per-meal
protein distribution using a 0.4–0.55 g/kg MPS-window logic
(07-nutrition-targets.md:15-77, :98). Six surplus/deficit goals run +17% to −22%
(:42-44, GOALS L80-87); protein offers Standard/Optimised/Advanced/Custom g/kg
approaches (:46-48). Form prefills from the saved body profile so stats are rarely
re-entered (:93-94), and collapses to a one-line summary once targets exist
(:54-56). **Nutrition Education** (src/screens/NutritionEducationScreen.js) is a
static plain-English primer — energy budget, the three macros at kcal/g, phases,
hand-portion estimates, "adherence beats perfection", and "the coach does the
adjustments" with a 5% cap and 2-week cooldown (07-nutrition-targets.md:189-213,
:211-212). **Meal Plan** (src/screens/MealPlanScreen.js) renders an
engine-generated abstract 7-day plan with progressive disclosure (calm
calories-first plates; grams/macros a tap deeper), carb-cycling with protein held
fixed, per-food and whole-meal swaps, and an honesty line when a day cannot hit
target (:290-328, :339-349). **Food Insights** (src/screens/FoodInsightsScreen.js)
shows a 7-day calorie bar chart vs target (bars within 10% turn green), a four-row
macro hit-rate summary, and a CSV export (:433-452, :471). The whole nutrition
layer is deterministic — Meal Plan never computes nutrition itself, it renders
what the engine assembled (:295-296, :348-349), and Nutrition Targets respects the
same boundary. ED-safety framing is present in the education copy (5% adjustment
cap, never adds exercise calories back, 07-nutrition-targets.md:48-52, :211-212).

BEST IN CLASS:
- **Adjustment communication — MacroFactor.** Weekly check-in, transparent
  expenditure trend, deliberately conservative ("won't overreact"),
  adherence-neutral, explicit anti-shame language ("Tracking isn't something that
  should stress you out... it will meet you where you are... without shaming,
  judgment, or the requirement that you adhere to your targets perfectly").
  Gold standard for *how* to tell a user their numbers changed.
  https://help.macrofactorapp.com/en/articles/222-how-does-macrofactor-make-adjustments-for-a-weight-gain-or-weight-loss-goal
  — VERIFIED (help-docs fetched cleanly).
- **Competitor-grade periodisation — Carbon Diet Coach + RP Diet.** Carbon's
  phased coaching maps directly to 16–20 week contest-prep periodisation with
  metabolic-adaptation tracking; RP adjusts carb/fat by when you train (nutrient
  timing). Built by PhDs/RDs/IFBB pros. https://www.joincarbon.com/ ;
  https://apps.apple.com/US/app/id1330041267 — PARTIAL/VERIFIED.
- **Newbie "why" education — Noom.** Daily 2–5 min bite-sized lessons + quiz and
  green/yellow/orange colour zones replacing the bare number.
  https://thisisamandaliu.medium.com/noom-case-study-4c404a3e2dde — VERIFIED.
- **Low-effort tracking with proven equivalence — simplified red-zone checklist
  (JMIR) + Precision Nutrition hand portions.** Simplified tracking: 97% of days
  self-monitored vs 49% for detailed logging, at statistically similar weight loss.
  Hand portions ~95% as accurate as weighing. https://formative.jmir.org/2022/12/e42191
  (VERIFIED, peer-reviewed) ; https://www.precisionnutrition.com/hand-portion-math-to-track-macros
  (VERIFIED).
- **Micronutrient precision floor — Cronometer.** ~3.5% data variance vs MFP's
  ~6.8%; surfaces micronutrient sufficiency during restrictive phases.
  https://nutriscan.app/blog/posts/macrofactor-vs-cronometer-2026-62a278ee64 — PARTIAL.

TOP 50 RANGE: Across 52 apps named (14 VERIFIED with substantive detail, ~24
PARTIAL, ~14 listing-only NOT-FOUND), quality spans four bands. At the **coaching
top**, MacroFactor (adaptive TDEE, adherence-neutral comms — VERIFIED), Carbon, RP,
Avatar (weekly auto-adjusting macros — PARTIAL/VERIFIED) deliver phase-aware,
self-adjusting targets. At the **precision/data top**, Cronometer (deepest
micronutrients — VERIFIED) and verified-DB advocates MyNetDiary/Avatar/Fitia
(PARTIAL) prioritise database accuracy over size. The **mass-market middle** —
MyFitnessPal (largest DB ~20M+ but crowdsourced accuracy issues, barcode paywalled
— VERIFIED), Lose It!, FatSecret (fully free — VERIFIED), Yazio (quiz-set targets,
countdown UI, no coaching — VERIFIED), Lifesum (PARTIAL) — does logging well but
little coaching. The **education/behaviour band** is Noom and WW (points budget,
flagged for obsessive-tracking risk — VERIFIED). The **AI-photo band** — Cal AI,
SnapCalorie (±80 kcal Pro iPhone vs ±265 eyeballing), PlateLens, Nutrola
(VERIFIED/PARTIAL) — trades precision for speed but mis-estimates portions/hidden
ingredients. A **beginner-simplicity band** (Macro Champ, Macro Simple, Welling,
Stupid Simple Macros — PARTIAL) markets "no overwhelming dashboards" and sets
targets without requiring the user to understand them first.

NEWBIE VERDICT: Partially served. The standalone Nutrition Education primer is a
genuine strength — plain English, hand-portion estimates, "trend over weeks",
British spelling — and is well-pitched to a first-timer
(07-nutrition-targets.md:244-247). But the Nutrition Targets form a beginner must
complete first is long and intimidating: body fat %, BF source, activity level, and
four protein approaches with g/kg ranges (Standard/Optimised/Advanced/Custom) are
expert framing (:114-119). Two InfoTooltips plus an approach note plus a per-meal
tooltip compete with the inputs (:107-108), and goal labels carry jargon-adjacent
percentages ("+17% surplus") with no inline plain explanation until results render
(:109-110). The "Why these numbers" card defaults to expanded, so a returning user
lands on four long paragraphs (:104-106). The education screen also has no CTA to
convert the lesson into action (:238-239). This is the opposite of the
market's strongest newbie pattern — "set it for them, explain the why separately"
(Finding 1.1, VERIFIED) and Noom's education-first colour-zone frame (Finding 1.2,
VERIFIED).

ATHLETE VERDICT: Largely well served, with one phase gap. Body-fat-source selection
feeding a lean-mass formula, protein on bodyweight vs LBM basis, per-meal MPS-window
splitting, custom g/kg protein, and the detailed "How was this calculated?"
breakdown all serve a competitor (07-nutrition-targets.md:121-126). Meal Plan adds
per-day training/rest variants, carb-cycling with protein fixed, peri-workout
(pre/post) slots, same-role macro-held food swaps, and exact P/C/F vs target
(:370-373) — real control matching the Carbon/RP nutrient-timing pattern (Finding
3.2, PARTIAL/VERIFIED). The gaps: contest-prep phase copy exists but contest_prep is
NOT a selectable goal in the GOALS grid — it can only arrive from a loaded target
(:124-126); Food Insights is shallow for an athlete (fixed 7 days, no longer trend,
no per-day macro chart, no weight/trend correlation) so they would likely export CSV
and analyse elsewhere (:493-496); and there is no micronutrient view at all
(Cronometer pattern, Finding 3.3, PARTIAL).

WHERE WE LEAD:
- **Deterministic, honest meal planning.** Meal Plan renders engine output and shows
  an honesty line when a constrained day cannot hit target exactly — it does not fake
  precision (07-nutrition-targets.md:344-345, :312). Contrasts with the AI-photo band
  that mis-estimates portions/hidden ingredients (Findings 4.4, PARTIAL; 7.2,
  VERIFIED/PARTIAL).
- **ED-safety framing baked into the copy.** Education states a 5% adjustment cap,
  2-week cooldown, "adherence beats perfection", and never adding exercise calories
  back (07-nutrition-targets.md:48-52, :211-212). The market's #1 design risk is
  number-focus/red-shame signalling fuelling disordered eating (Finding 4.5,
  VERIFIED) — Volyume's framing is the protective counter-pattern the research
  endorses.
- **Genuinely educational, goal-aware "why."** Separate Calories/Protein/Fat/Carbs
  copy for gain/cut/recomp/maintain (07-nutrition-targets.md:91-92, :958-1018).
  Cronometer deliberately does NOT explain or coach (Finding 1.4, VERIFIED); Volyume
  does both.
- **Per-meal protein distribution coaching** via the 0.4–0.55 g/kg MPS window
  (07-nutrition-targets.md:97-98) is finer than the generic trackers' single daily
  protein number.
- **Progressive disclosure in Meal Plan** (calm calories-first, grams a tap deeper,
  07-nutrition-targets.md:339) matches the low-friction-beats-feature-breadth
  finding (Finding 6.3, PARTIAL) better than feature-dense diaries.

WHERE WE LAG:
- **No simplified / no-gram nutrition mode.** Volyume's on-ramp is the full
  gram/g-per-kg form (07-nutrition-targets.md:114-119). The single strongest evidence
  in the whole research file is that simplified tracking achieved 97% vs 49%
  adherence at equal weight loss (Finding 7.1, VERIFIED, JMIR e42191), and hand
  portions are ~95% as accurate (Finding 7.2, VERIFIED). The education screen
  *describes* hand portions but no tracking mode *uses* them.
- **Newbie onboarding is "understand-first," not "set-it-for-them."** The market's
  best newbie pattern gives a usable target immediately and teaches afterwards
  (Finding 1.1, VERIFIED; Finding 2.1, PARTIAL). Volyume gates a usable target behind
  a long expert-framed form.
- **No adaptive/weekly recalibration surfaced in this layer.** MacroFactor's adaptive
  TDEE recalibrates weekly, catching metabolic slowdown a static calculator misses
  (Finding 3.1, PARTIAL+VERIFIED corroboration). Volyume's Nutrition Targets is a
  one-shot calculator; adjustment lives in the coaching engine, not on this surface.
- **Shallow insights for athletes.** Fixed 7-day window, kcal-only chart, no longer
  trend, no per-day macro visualisation, no weight correlation
  (07-nutrition-targets.md:482-483, :493-496) — below the weekly expenditure-trend
  loop athletes expect (Finding 5.1, VERIFIED).

MISSING ENTIRELY:
- **Simplified/visual tracking mode** — hand portions, red-zone checklist, or
  protein+calories-first (Finding 7.1 VERIFIED; 7.2 VERIFIED/PARTIAL; 2.1 PARTIAL).
  Described in education copy but not a usable mode.
- **Micronutrient tracking/floor view** (Cronometer pattern, Finding 3.3, PARTIAL).
  Volyume's nutrition layer covers calories + P/C/F only.
- **Adaptive weekly TDEE recalibration on the nutrition surface itself**
  (MacroFactor pattern, Finding 3.1, PARTIAL/VERIFIED).
- **A selectable contest-prep goal** in the targets grid — copy exists but the goal
  is not user-selectable (07-nutrition-targets.md:124-126); athletes can't choose the
  periodised phase Carbon/RP make central (Finding 3.2, PARTIAL/VERIFIED).
- **AI photo / barcode estimation as a logging path within these screens** (Cal AI,
  SnapCalorie band, Findings 4.4/7.2). Note: barcode scanning exists elsewhere as a
  separate Pro feature per CLAUDE.md and is out of this fragment's scope.
- **Longer-range / date-selectable insights and CSV-beyond-7-days**
  (07-nutrition-targets.md:481-482).

USER SENTIMENT (what users want that no app cleanly provides — from the fragment):
- A way to track that does NOT require weighing every gram, yet still works:
  simplified self-monitoring was adhered to on 97% vs 49% of days at equal results
  (Finding 7.1, VERIFIED) — strong unmet demand for a credible low-effort mode.
- Accurate food data: crowdsourced DB inaccuracy is the #1 cited frustration (MFP
  underestimating protein ~7.8% / carbs ~6.4%; wrong entries go live unverified)
  (Findings 4.1 VERIFIED, 3.4 PARTIAL).
- Transparent, non-judgemental pricing and coaching: hidden/opaque pricing (Cal AI,
  Finding 4.3, PARTIAL) and core features moved behind paywalls (MFP barcode, Finding
  4.2, VERIFIED) are recurring grievances.
- Tracking that does NOT fuel obsession: number-focus and red/shame signals are
  repeatedly linked to disordered eating (Finding 4.5, VERIFIED) — users want
  adherence-neutral, anti-shame framing (Finding 5.2, VERIFIED).
- Sustained adherence: every app sees adherence decline over time, worst in
  maintenance (Finding 4.6, VERIFIED) — low-friction logging is the lever (Finding
  6.1 PARTIAL, 6.3 PARTIAL).

VERIFICATION STATUS: This block leans on a mix; the load-bearing PARTIAL/NOT-FOUND
items are flagged here.
- **VERIFIED and load-bearing:** JMIR e42191 simplified-vs-detailed (97% vs 49%,
  equal weight loss); Precision Nutrition hand portions ~95%; MacroFactor
  adherence-neutral/anti-shame help-docs; Noom education-first; ED-risk findings
  (therapist.com, BBC, Fortune/WW); MFP crowdsourced inaccuracy + barcode paywall;
  adherence decline over time (JMIR/peer-reviewed).
- **PARTIAL the block relies on:** MacroFactor adaptive-TDEE *weekly recalibration*
  specifics (third-party comparison blog, corroborated by VERIFIED help-docs);
  Carbon/RP periodisation & nutrient-timing (vendor + store, PARTIAL/VERIFIED mix);
  Cronometer micronutrient variance figures (PARTIAL comparison blog); MFP protein
  ~7.8% / carbs ~6.4% under-estimate (vendor citing academic, PARTIAL); Cal AI hidden
  pricing & portion errors (eesel summary of Reddit/store sentiment, PARTIAL);
  beginner-simplicity apps Macro Champ/Macro Simple/Welling (vendor/store framing,
  PARTIAL); low-friction-beats-features industry data inc. 2.7-vs-1.9 meals/day
  (PARTIAL, 403-walled article via search summary).
- **NOT-FOUND context:** ~14 named apps (Foodvisor, Bitesnap, Calory, Simple, 8fit,
  Fooducate, Strongr Fastr, MealLogger) returned listing-only — not relied on for any
  specific claim above. Reddit/community user-voice is sourced via secondary
  summaries (PARTIAL) because direct Reddit fetches were not retrievable.
