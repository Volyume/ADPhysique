# Volyume Complete: third AI pass (adjudication)

## Your role in this research

You are the third and final AI pass on a strategic execution brief for Volyume Complete. The other two passes (Gemini Deep Research first, then ChatGPT Deep Research) have already run on the same master brief. Both outputs are included below in full.

Your job is **adjudication**, not generation:

1. Identify the most material disagreements between Gemini and ChatGPT. There are ten flagged below. You may find more.
2. Adjudicate each with the strongest available evidence. Where the literature supports one over the other, say so. No hedging.
3. Pressure-test the factual claims either pass made. Specifically flagged below.
4. Produce the final ranked five integration moves to build first against the live app, with two-sentence reasoning each. This is the bottom-line deliverable.

The previous round of this research caught two factual errors (both ChatGPT and Gemini cited Lichtman 1992 47% underreporting as a baseline; it is a small n=10 selected-cohort study, not generalisable; the correct baseline is Jia et al. 2021, Adv Nutr, PMC8634532). Hold this round to the same standard. If either pass made a claim that does not survive scrutiny, name it and replace it.

Your output should be roughly 2000 to 4000 words and structured as: Adjudications, Factual scrutiny, Anything either pass missed, Final ranked list, Open questions for the next pass.

---

## Context: what Volyume already is, live

Volyume is a workout-tracking app for serious lifters. Version 1.1.0 (versionCode 4) is in Google Play closed testing right now. The codebase is React Native + Expo SDK 51. No food-logging feature exists in the live app. The plan is to ship food-logging as the headline feature of the next update, gated to a new top tier (Complete), shipped as one unified app.

### The live coach engine

`src/lib/weeklyCoach.js` (732 lines) implements:

- EWMA weight trend (alpha 0.1, 10-day memory), with delta-vs-7-days-ago
- Data confidence gate: hard-holds output when fewer than 3 weigh-ins, or fewer than 5 with unusual-event flag
- Autoregulation matrix: recovery score (1 to 4) by performance score (1 to 4) producing volumeDelta + trainingSignal + deloadFlag
- Calorie adjustment gate: requires consecutiveOffTargetWeeks at least 2 at high confidence, at least 3 at low. Capped at plus or minus 5 percent of current target. Default magnitudes minus 150, minus 125, plus 125, plus 150 kcal
- 2-week cooldown between adjustments
- Held-decisions array surfaced in the output (covers: scoffPositive, cycleOverride, onTarget, cooldown, weeksOffTargetBelowGate, calsAdherence untracked)
- Rapid weight loss safety flag: minus 1.5 percent per week + energy at or below 2
- Diet break trigger: anchored to goalStartDate (8+ weeks), MATADOR-cited
- Steps + cardio prescription with phase-scaled bands, cardio paused on poor recovery
- WHY_LIBRARY: 12 keys with 1 to 2 plain-English variants each. None food-driven

`src/lib/nutritionEngine.js` implements:

- Three named protein approaches (Standard 2.2 to 2.6 g/kg, Optimised 2.5 to 3.0 g/kg, Advanced 2.8 to 3.3 g/kg) plus Custom. Auto-selects Advanced for physique-competitor goals
- Katch-McArdle BMR when body-fat percent is credible (not "visual"); Mifflin-St Jeor otherwise
- Morton 2018 protein cap at 2.2 g/kg BW when BF percent unknown
- Activity multipliers tuned down for gym-only populations (active 1.65 not 1.725; very-active 1.725 not 1.9), with a SportRxiv 2024 reference
- Hard gate at 1.5 percent BW/week loss (clamps target kcal up); soft warning at 0.8 percent
- Flat floors at 1500 male, 1200 female
- MacroFactor-style adaptive TDEE (computeAdaptiveTDEEAdjustment): EWMA alpha 0.28, 50 percent dampening, confidence tiers, plain-English insight
- Diet break trigger (shouldSuggestDietBreak, 8 weeks deficit threshold)
- Per-meal protein distribution: 4 meals (5 for aggressive cuts), perMealProteinG
- Refeed prescription for aggressive_cut + contest_prep (frequency, duration, calorie target, refeed carb grams)
- Phase-aware recovery modifier, volume ceiling, failure exposure level, deload frequency, all returned by getPlanNutritionContext()

`src/lib/whyThisTemplates.js` jargon blocklist: 7 terms only. `['MEV', 'MAV', 'MRV', ' RIR', ' RPE', 'mesocycle', 'junk volume']`. No researcher names, no brand names, no formula names banned.

`weekly_checkins_v2` schema (Supabase + local SQLite v23): `cals_adherence TEXT` (values: `hit / under / over / untracked`), `energy_score`, `soreness_score`, `stress_score`, `sleep_hours`, `training_performance`, `joint_pain`, `sore_muscles`, `cycle_override`, `notes`. No `adherence_protein` column. No `measured_kcal_avg`. No `days_logged`.

`src/lib/proGate.js`: `PRO_BETA_ACTIVE = true`. Two tiers only (free, pro). No isPaidTier() helper exists. Supabase has a tier-protect trigger blocking client-side tier upgrades.

`src/lib/insightsEngine.js`: 6 deterministic insight types feeding the AnalyticsScreen "For You" stack: under_mev_muscle, stalled_lift, peaked_lift, recovery_warn, deload_due, gentle_rhythm. None food-driven.

SCOFF (eating-disorder) screener exists at onboarding. scoffPositive flag blocks deficit increases.

Other live features that affect food integration: Sentry observability with PII redaction, on-device error ring buffer (200 events), feedback sheet with offline queue + two Supabase dashboard views (v_feedback_weekly_digest, v_feedback_error_correlation), Apple Health / Google Fit weight import on foreground (read-only, no nutrition yet), iOS live activity for rest timer, mesocycle / training-block surface (MesocycleBuilderScreen), Peak Week protocol (PeakWeekScreen, 7-day contest prep, federation selector, exports a static plan), Year of Lifts one-shot 365-day unlock, Share Card builder, 903 Jest tests across 26 suites, signed CI builds (APK + AAB), strength standards card (Beginner/Novice/Intermediate/Advanced/Elite tiers vs bodyweight).

What does NOT exist on the live app: any food database, food-search, barcode scan, label OCR; any diary_entries / foods_* / recipes / saved_meals / daily_water table; any TodaysIntakeCard or food-related component; any food-driven insight in insightsEngine.js; any food-driven branch in weeklyCoach.js's WHY_LIBRARY; any isPaidTier / isCompleteTier helper; any three-tier ladder code; a unified Eat surface or food tab.

---

## Locked decisions: do not relitigate

1. Three tiers: Free / Pro / Complete. Complete is the food-integrated top tier. Pro is the workout coach without the food layer.
2. Single unified app. No two-app suite.
3. Pricing ladder (UK):
   - Free: £0
   - Pro: £1.49/mo founders' (year 1) to £2.99/mo standard, £24/yr annual
   - Complete: £3.49/mo founders' (year 1) to £6.99/mo standard, £59/yr annual
   - 14-day trial on both paid tiers. Grandfathered for 12 months with graceful step-up.
4. No LLM chat surface anywhere. Deterministic template-driven explanation only.
5. B2B coach dashboard at phase 2. Bundled-seat model: £49/mo + 10 client seats, £4.99/extra seat. Clients get Complete free under coach's plan. Web app, not mobile. Schema groundwork lands in phase 1.
6. Five engine guardrails (locked in concept; execution details open):
   - ED safety floor at 30 kcal/kg FFM/day (Mountjoy 2014 IOC RED-S, with the 2023 update)
   - Performance is the ultimate trump card (compound-lift drop forces deload regardless of protein)
   - Protein adequacy permits load preservation (Cooke 2010, Davies 2018, Pasiakos 2014; null in Hansen 2020; phrasing is "permits", not "guarantees")
   - MacroFactor-pattern auto-fill (no confront-on-non-compliance; absorb in adaptive TDEE)
   - Held decisions: friction-triggered surfacing, not default-visible
7. Upward counterfactual voice rule for held decisions: "We held X. Once Y, we'll Z." (Hügle 2023, arXiv:2306.07637)
8. The five integration moves in concept (sharpening the implementation against the live engine is open):
   1. Auto-fill check-in adherence from measured intake
   2. Compress calorie-adjustment gate from 2 weeks to 1 when measured intake confirms target
   3. Add protein adherence to the autoreg recovery score as a permission rule
   4. Food-driven plateau diagnosis branches in whyThisTemplates.js + WHY_LIBRARY
   5. Surface food cards on HomeScreen and BodyMetricsScreen, plus new food-driven insight types

---

## Prior output 1: Gemini Deep Research

# Area 1: Competitive Positioning (workout + food)

Volyume Complete competes at a higher tier (£6.99/mo) than standalone workout or nutrition apps. In practice, each competitor's data inputs, decision logic, output format, and transparency differ markedly. For example, Renaissance Periodization (RP) offers two apps (Hypertrophy training + Diet Coach) as a bundle (~£30 to 35/mo) (Vendor-claim: RP Strength, Sep 2025). RP's workout app asks users about soreness and "pump," then adapts week-to-week weight and volume. Its diet app builds strict meal plans and has recently moved to full macro logging. Decisions are based on fixed rules (Israetel's protocols) rather than data-driven AI. Outputs are detailed weekly plans (weights/reps and macros per meal), but explanations are generally motivational or rule-based (e.g. "stick to meal plan"). RP's strength is expert-backed structure and rich content; its weakness is lack of real-time adaptation or full transparency of its heuristics. Volyume's live engine has more automated tuning (EWMA trends, performance gates) and integration (step/cardio), whereas RP relies on "coach says" style guidance.

MyFitnessPal Premium (MFP, £9.99/mo) is primarily a food tracker. Its new Premium "Workout Routines" feature lets users build or log multi-exercise routines (sets, reps, loads) and counts them in calorie burn. Input: detailed exercise logs (strength workouts via custom routines) and full food entries. Decision: essentially none; MFP does not auto-adjust goals, it just tallies calories and macros. Output: a daily diary with calories in/out and progress charts. Explanation: none on adjustments; users see data but MFP offers no coaching narrative. Where MFP is ahead: massive food database, comprehensive nutrition logging, and new workout-logging UI. Where Volyume is ahead: intelligent adaptations, personalized plans, workout insights (Volyume is built by lifters for lifters). In short, MFP "counts" but Volyume "coaches."

JEFIT (Elite) ($6.99 to 9.99/mo) is primarily a workout log with some nutrition features. It inputs workouts and user weight, and in its blog mentions tracking protein intake and custom meal plans. Decisions: largely user-driven or static (it does have an "AI adaptive plan" but details are unclear). Output: workout history, PR tracking, volume charts. Explanation: JEFIT offers performance metrics (1RM, recovery scores) but no coach-style rationale. Ahead: structured workout planning and community, some macro tracking. Behind: nutrition support is weak (content-driven) and no weight-driven auto-adjustment. Volyume's built-in diet coaching and weight trend logic outpaces JEFIT's limited tools.

Centr (~£30/mo) is a celebrity-led fitness platform. It inputs user goals and equipment level, then prescribes movie-style workouts (audio/video guided) and offers an extensive recipe library. Decision: human-curated (professional coaches design programs and meal suggestions based on general user profiles). Output: daily workout classes, multi-week plans, recipe plans, and meditation. Explanation: high-level ("rest days are built in") but no algorithmic reasoning. Ahead: very polished content, broad wellness scope (mindfulness, recipes). Behind: little personalization beyond selecting a plan, no data-driven tweaks, no lifter-level detail. Volyume is far more tailored for serious lifters with data-backed guidance; Centr is more of a general well-being package.

Caliber/Future ($200+/mo) represent human personal training via app. Inputs: user profile, schedule, goals (and often coaches' check-ins). Decisions: human coach designs and revises the program, with an app interface. Output: completely personalized workout plan, daily messages; sometimes macro advice but mostly focused on exercises. Explanation: guidance comes from a live coach (high trust), though not via AI text. Ahead: Ultimate personalization and accountability. Behind: exorbitant price, not scalable, no unified algorithmic platform. Volyume trades that 1:1 attention for an algorithmic proxy.

Finally, consider Hevy Pro (£3.99) + MacroFactor (£11.99) (~£16 total) as the de facto one-two punch. Hevy is a community-driven workout tracker; MacroFactor is an adaptive nutrition coach app. As one reviewer notes: "MacroFactor is a nutrition app that tracks what you eat and adapts your macro targets using sophisticated algorithms. Hevy is a workout app that tracks what you lift and provides social motivation". Inputs: Hevy logs workouts/PRs; MacroFactor logs detailed food and weight. Decisions: Hevy has minimal auto-coaching (static plan), MacroFactor auto-adjusts energy targets weekly. Output: Hevy: social feed, charts; MacroFactor: weekly macro targets and trend insights. Explanation: neither really explains rationale ("here's why"). Ahead: Together they cover both domains, each with polished UX (MacroFactor has fast food entry, Hevy a sleek UI). Behind: No integration between them; a user must juggle two apps. Volyume aims to match their combined functionality in one place. On value-per-£, Volyume's pitch is stronger: for one price you get both coach and log. However, Hevy's free community/social features and MacroFactor's blazing-fast tracking are missing from Volyume.

Positioning: Volyume Complete aims to undercut the cost of using separate best-in-class apps by bundling an integrated coach+tracker. It's pitched as "the one app built by lifters for lifters". So far the analysis suggests it succeeds on depth (tailored plans, heavy-tracking) but will need to close gaps in community features (vs Hevy), content polish (vs Centr/RP), and social proof to match the very premium end.

# Area 2: Integration Moves: Evidence and Design

We revisit each gated integration move, updating evidence and specifying code changes.

1. **Autofill check-in adherence from measured intake.** Evidence: Research shows diligent dietary self-monitoring strongly correlates with better adherence and weight outcomes. Allowing food logs to auto-compute "calorie adherence" in check-ins should improve accuracy. Integration: Add daily food-log tables (e.g. daily_food_logs, linking to check-in week) and compute average intake. In weeklyCoach.js, modify computeEnergyScore or similar to replace manual cals_adherence flag with "under/over target" based on logged intake vs target. Migration: new Supabase table(s) for food entries (food name, calories, macros per meal), plus expand weekly_checkins_v2 to record e.g. measured_kcal_avg and change cals_adherence to be computed (or a new boolean). Failure Modes: Over-reliance on incomplete logs could mislead the coach (if user forgets to log, we might mark "under"). Mitigate by retaining "untracked" status if insufficient days (e.g. <3 days of logs), and allow manual override in UI if needed. Signals: By month 1 we should see higher fidelity in adherence data; by month 3 reduced surprise adjustments (fewer mid-course weight corrections); by 6 mo, improved goal attainment. Delay cost: Without this, calorie adjustments rely only on weight trends, risking sluggish corrections if user is accurately hitting or missing targets.

2. **Compress calorie-adjustment gate from 2 weeks to 1 when intake confirms target.** Evidence: In practice, most diets recalibrate weekly if intake is measured reliably. One study noted people who log diets lose weight faster. If a user hits target intake but weight stalls, it's likely true plateau. Integration: In weeklyCoach.js logic for calorie changes (around line "consecutiveOffTargetWeeks"), add a branch: if intake logs are sufficient (we have measured_kcal_avg) and we were off-target last week, allow an adjustment after 1 week instead of 2. For example: `if (weighIns >= 3 && consecutiveOffTarget >= (measuredIntakeExists?1:2)) { ... }` Migration: as above for intake logs. Failure Modes: Risk of reacting to a single bad week or logging error. Mitigate by still requiring high confidence (e.g. after 2 weeks if low confidence logs). Possibly raise the adjustment magnitude smaller in that first week. Signals: At month 1 we should see calorie target changes occur more promptly when needed (fewer wasted weeks); by 3 mo, better alignment of target vs actual deficits; by 6 mo, fewer plateaus. Delay cost: Without it, Volyume's calorie changes lag too long when true compliance is evident, making it slower than competing apps (like MacroFactor) that react weekly.

3. **Incorporate protein adherence into autoreg recovery score (permission rule).** Evidence: High protein intake in a cut helps preserve muscle and performance. Current consensus recommends ~1.6 to 2.4 g/kg/day for athletes in deficit. If protein adherence is low, the assumption that "muscle retention ensures stimulus can be maintained" weakens. Integration: First, extend weekly_checkins_v2 with a protein_adherence field (e.g. hit/under/over daily protein target). In weeklyCoach.js, in the autoregulation matrix (where recoveryScore/performanceScore are computed), add protein as a gating factor: e.g. if protein_adherence=="under", subtract from recoveryScore or force a deload flag. This could be as simple as "if protein<target then ignore any +delta in volume even if recovery is good." Failure Modes: A user might fall short on protein occasionally without it impacting recovery; being too strict could lead to unnecessary deloads or demotivation. Mitigate by only applying the rule when multiple variables are subpar (e.g. add protein penalty only if recoveryScore==4 but protein<80%). Signals: Month 1: track % of users hitting >90% protein; month 3: look at cases where protein-low weeks would have prevented intensity drops (compare actual vs counterfactual dropouts); month 6: improved lift retention in cuts. Delay cost: If ignored, Volyume might recommend over-training on too-low-protein weeks, risking strength loss. Encoding protein as "permit" data ensures deficits aren't blamed on training prematurely.

4. **Food-driven plateau diagnosis in whyThisTemplates.** Evidence: Plateaus often have dietary causes: eating too much ("drift") or too little ("real adaptation"). Our context suggests splitting cases by intake vs trend. Integration: In weeklyCoach.js, augment the decision logic that sets reasons. E.g. if weight hasn't changed 2+ weeks and intake was within +-100 kcal of target, output code "plateau_adaptation"; if weight stalled but intake >target, output "plateau_drift" (hold targets, maybe tighten logging). In whyThisTemplates.js, write new templates for these (see Area 6). No new DB migration beyond adding any needed enum labels. Failure Modes: Misdiagnosing due to logging errors; e.g. thinking it's "drift" when intake was actually off. Mitigate by only diagnosing if weigh-ins are high-confidence and intake logs cover enough days. Signals: Month 1: count of "plateau" insights displayed; month 3: user feedback on accuracy of advice; month 6: plateau resolution rate. Delay cost: Without these branches, Volyume misses a chance to explain food-related stalls, leaving users confused or urging pointless training changes.

5. **Surface food cards and insights on key screens.** Evidence: Visibility drives engagement. In practice, showing food summaries (e.g. "Last week you averaged 2000 kcal/d") reminds users to log. Integration: In the UI, add a "Food" card on the HomeScreen and BodyMetricsScreen similar to weight cards. These might display target vs actual intake, macros breakdown, or prompts like "Log today's meals!". In insightsEngine.js, code new insight triggers (see next section) for nutrition context. Migration: UI layout changes; no schema changes except as above for data storage. Failure Modes: Cluttering the UI or confusing users not ready to log food. Mitigate by only showing food cards after user starts logging (hence optional opt-in) and keeping them minimal. Signals: Month 1: increased frequency of food log entries; month 3: rise in trial-to-paid conversion from people citing nutrition features; month 6: retention higher in Complete tier. Delay cost: Delaying these means missing a chance to convert Pro users by highlighting "complete" benefits in the app itself, and delaying the realization of how diet data could inform the coach.

# Area 3: New Food-Driven Insight Types

We propose several new deterministic "insights" for the analytics screen, triggered by weight, intake, and training data. Each follows Volyume's second-person, causal style:

- **stalled_plateau_adaptation (severity 1):** Trigger: 2+ weeks weight stable AND average intake within +-100 kcal of target. Copy: "Your weight has plateaued despite closely hitting your calorie target. This likely means your body has adapted; we'll slightly reduce calories to resume progress." Upward: "Once you drop calories a little, we'll likely see the scale move again."
- **stalled_plateau_drift (severity 1):** Trigger: 2+ weeks weight stable AND intake consistently above target (>100 kcal). Copy: "Your weight hasn't budged because you've been eating over target. For now, keep your current goals and tighten up the logging." Upward: "If you eat at target, we could restart your progress."
- **overfuel_strength (severity 1):** Trigger: Performance score high (improving lifts) AND intake well over target. Copy: "You got stronger this week but ate above target; likely overshooting. We'll keep calories steady so weight gain stays on track." Upward: "After getting back on target, you should continue improving without extra weight."
- **underfuel_progress (severity 1):** Trigger: Performance improving AND intake below target (>=150 kcal deficit). Copy: "You're lifting heavier even eating under target, which is great but might limit gains. If we had more fuel, we could push even harder." Upward: "If you meet your calorie goal, you'll likely gain more strength."
- **consistent_on_target (severity 0):** Trigger: Intake on target for past week AND recovery & weight trending well. Copy: "Nice work hitting your calorie goal! Your consistent tracking is paying off." No upward variant needed.
- **recovery_with_food (severity 0):** Trigger: High recoveryScore AND intake on/above target. Copy: "Your recovery is good, and you met your calories. This was the right balance: your program can safely step up now." Upward: "If you maintain this, your training volume will increase next week."
- **low_protein_cut (severity 1):** Trigger: In a cut phase AND protein adherence <80%. Copy: "Protein intake was low this week, which risks muscle loss. We'll keep current volume and aim for your protein floor before any extra cuts." Upward: "Once protein is on target, we can consider lowering calories again."
- **bulk_too_fast (severity 2):** Trigger: In bulk AND weight gain >target threshold (e.g. >0.75%/week) AND intake on target. Copy: "You've gained weight faster than planned even with target intake. To slow down, we'll trim a bit of calories." Upward: "If this slower pace is okay, we could even add training volume."
- **bulk_flat (severity 1):** Trigger: In bulk AND weight flat for 3+ weeks AND intake on target. Copy: "Weight hasn't moved in 3 weeks despite eating at target. Try increasing calories slightly to kickstart gains." Upward: "When weight rises, we'll stick with this plan."
- **refeed_taken (severity 0):** Trigger: Refeed scheduled & logged this week. Copy: "You did a refeed: great! This extra fuel should boost energy and recovery today." No upward needed.
- **refeed_skipped (severity 0):** Trigger: Refeed was scheduled but not logged. Copy: "You skipped the planned refeed. Try adding one to help your recovery and results." Upward: "After the refeed, your performance should jump back up."
- **diet_break_ok (severity 1):** Trigger: >=8 weeks deficit AND adherence >=90%. Copy: "You've been dieting consistently for 8+ weeks with strong compliance. A diet break is recommended to reset." Upward: "After a break, you should see better fat loss when we resume."
- **diet_break_hold (severity 0):** Trigger: >=8 weeks deficit AND adherence <90%. Copy: "Your deficit is long but tracking is spotty. Hold off on a full break until you can follow targets reliably." Upward: "Once logging improves, we'll plan that break."
- **ed_safety_trigger (severity 2):** Trigger: Target below 30 kcal/kg FFM for >=2 weeks. Copy: "Your target calorie is at the clinical safety floor for your size. We will not decrease further." No upward variant (this is a hard stop).

Each of these fits the "data->effect->action" style and avoids banned jargon.

# Area 4: Additional Guardrails

**FFM floor vs existing rules:** The IOC RED-S consensus flags ~30 kcal/kg FFM as a risky threshold. For a 75 kg male @12%BF (FFM~66 kg), 30x66~1980 kcal; the live app's hard floor is 1500, so the FFM rule would engage above the flat floor. For a 60 kg female @24%BF (FFM~46 kg), 30x46~1380 vs the flat 1200. In both cases 30 kcal/kg yields a higher (less extreme) limit. Thus the FFM-based guardrail is more conservative, catching low intakes before the app's flat floor. It would prevent targets drifting below ~1400 to 2000 kcal (depending on body size) when the old rules might still allow it.

**ED-related behavioural signals:** Research shows diet/fitness app users often have higher disordered-eating and compulsive-exercise scores. Thus patterns like excessive meal-log editing, multiple daily weight checks, or crazy-frequent exercise logging could signal trouble. Screening options: e.g., if a user enters >5 meals/day or logs weight >once per day for weeks, we might flag with a gentle check-in ("We notice a lot of editing", similar to friction triggers). There's no single academic "red flag," but the literature suggests monitoring extreme self-tracking behavior for ED risk.

**Jargon blocklist:** The app already avoids obscure terms (MEV/MRV etc). Terms like "training stimulus" or researcher names (e.g. "Israel") are not inherently harmful in consumer UX. Banning them may make explanations more plain, but it's arguably unnecessary censorship. I'd err on being descriptive (e.g. "training pressure" instead of "training stimulus") but not extend the blocklist overmuch. The current minimal list is fine; adding scientific terms might confuse users more than clarify.

**Friction-triggered surfacing:** Lim, Dey & Avrahami (CHI 2009) showed that explanations should be shown when users encounter friction (e.g. unexpected behavior). In Volyume's context, friction could be: a stalled weight, a sudden failed PR, or a user question. The "unlock when friction" rule means we might surface held decisions (e.g. "we held off on a cut") when, say, weight isn't changing as predicted or the user manually asks why. Newer HCI (e.g. the "positive friction" framework) suggests triggers like a repeated off-target, manual weight entry changes, or a downward trend. In practice, we should likely trigger held-decision messages when any key metric (weight, performance, recovery) deviates from expectation or after a "why am I stuck?" input. Formal UX testing could pinpoint exactly when users feel confusion; but a good heuristic is "if the user's data breaks our expectation, pop an explanation."

# Area 5: Complete-Tier Upgrade Logic

To motivate Pro users to upgrade, we must highlight moments of value. Possible triggers and copy:

- **When opening a new workout:** Copy: "Pro tip: Log your meals in Complete to auto-update your calorie plan each week." (On WorkoutScreen, a banner or info icon.)
- **At a missed target:** If check-in shows "cals_adherence: under" but no intake logged, show: "With Complete's food tracking, we'd know you under-ate this week. We'd use that info before cutting your calories."
- **On a weekly summary:** E.g. "This week we had no food logs. In Complete, you could see 'measured intake was X, so next target would be Y.'" (Maybe greyed text in Insight if cals_adherence isn't "hit".)
- **When performance drops:** "Logging meals (Complete tier) would tell us if a drop was due to fueling or training." (as a tooltip on the performance gauge.)
- **When adding a bodyweight:** Suggest linking with nutrition: "For Complete users: syncing your meals here would adjust your weight targets."
- **Daily log prompt:** When user tries to add calories (if we allow pro to see, maybe greyed out): "Complete unlocks logging and analysis of your intake."

For example, a banner might say: "With Complete, we'd say 'You ate 2500 kcal last week, so your deficit was real and it's time to trim 50 kcal'. Tap to learn more." Another idea: if a user hits 5 consistent 'under' or 'over' adherence, pop a modal: "We could diagnose this better with food data: try Complete."

**Differential output design:** It may be helpful when on Pro, if an insight was purely limited by no intake data, to hint: e.g. on a weight card "(Would refine if we had food data.)" However, constantly showing "incomplete data" might annoy users. A compromise: only mention the "would be X" on Pro if adherence was "under" or "over" for at least 2 weeks. Then the message is contextual ("you ate too much/too little, which we couldn't confirm"). In short: do not clutter every card. Show a special insight line like "(Complete tier would reveal cause.)" when the missing context is critical.

**Trial mechanics:** The 14-day trial should start as soon as a Pro user enables any food-related feature (e.g. taps "Try Complete"). During trial all Complete features unlock (logging UI, new insights, etc.). If the user doesn't subscribe after 14 days, downgrade them to Pro automatically: any new logs become "untracked" and features hide. To re-engage, the app could send a reminder after say 7 days of inactivity: "Your trial of Complete is ending soon: log now to keep progress!"

**Beta period pricing:** Currently PRO_BETA_ACTIVE makes Pro free. For symmetry, it might make sense to let Complete also be free during its closed beta (so early adopters can try it without immediate purchase). However, if Complete is the new headline, the founder might want to start charging at launch. A compromise: during closed test only (not public beta), unlock Complete for testers (or at least give them trial). Once moving to open beta, require 14-day trial to start on any new install. In summary, allow free access in closed test for feedback, but treat Complete as a paid upgrade in open testing.

# Area 6: Food-Driven whyThis Templates

Below are 15 concise, plain-English templates. Each is second-person ("you") and causal, with an upward-counterfactual variant where indicated. We avoid banned jargon.

1. **fuel_not_fatigue (perf v + carbs low):** "You logged low carbs and your lifts fell. Likely you were under-fuelled, not over-trained. Once you hit carb targets, we'll regain momentum." Upward: "If you meet your carb goal, your strength should rebound."
2. **protein_first (perf v + protein low):** "Your protein intake was low, which can hurt recovery. Focus on protein first so we don't lose strength." Upward: "If protein reaches the floor, we can hold your current training load."
3. **soreness_ok (soreness ^ + protein >=90% + PRs hold):** "You're sore but your protein was high and you hit PRs. You're recovering okay: we can maintain load." (No upward needed as no decision hold.)
4. **real_adaptation (weight stalled 2w + intake on target):** "Your weight hasn't moved in 2 weeks despite hitting calorie targets. This looks like true adaptation, so we'll trim intake slightly." Upward: "After a small cut, we expect progress to resume."
5. **eat_drift (weight stalled + intake over):** "You've been eating over your plan, so weight has plateaued. Keep targets steady and log accurately." Upward: "If you stay at target, the plan will start working again."
6. **protein_floor (cut + protein <80%):** "Your protein is below 80%. Before cutting more, let's hit the protein floor to preserve muscle." Upward: "When protein compliance is good, we can safely lower calories."
7. **underfueling (perf ^ + intake under):** "Your strength improved even under target intake: impressive! But you might be under-fuelling. Consider adding a few calories." Upward: "If you match targets, gains may accelerate further."
8. **good_recovery (recov good + intake on + sleep good):** "Recovery and sleep are strong and you met targets. Your body's ready to handle a bit more volume." Upward: "Keep it up and we'll increase load next week."
9. **bulk_trim (bulk + gain >goal + intake =target):** "You're gaining faster than planned even at target intake. To slow it, we'll trim a little from your diet." Upward: "If you prefer, we could also swap in extra cardio."
10. **bulk_gain (bulk + flat 3w + intake =target):** "You've hit no weight gain in 3 weeks on target intake. Try adding more calories to jump-start growth." Upward: "When weight goes up, we'll return to maintenance."
11. **refeed_done (refeed taken):** "You completed a refeed! This extra fuel should boost your energy and recovery." (No upward variant needed.)
12. **refeed_missed (refeed skipped):** "You skipped the scheduled refeed. Try adding one: it will recharge your progress." Upward: "After that refeed, you should notice a performance lift."
13. **dietbreak_yes (8w deficit + adh >=90%):** "You've been dieting 8+ weeks with great adherence. A diet break now can reset your metabolism." (Upward not needed as break is action.)
14. **dietbreak_hold (8w + adh <90%):** "Your cut has been long but tracking is spotty. Hold off on a break until compliance improves." Upward: "Once you reliably hit targets, we'll schedule the break."
15. **ed_floor_stop (ed floor hit):** "Your current intake equals the safety minimum. We'll hold calories steady for now." (No upward: this is a locked rule.)

# Area 7: Macro-Week & Milestone Integration

- **Mesocycle Food Summary:** Yes, adding a small summary of food per block would aid context. Minimum: average daily calories and average protein % of target (or grams), perhaps separated by training vs rest days. E.g. "Block avg: 2100 kcal/d (100% target), protein 95%." That gives coaches and users a quick quality check. We could also count "days logged" to signal adherence.

- **Peak Week Tracker:** Instead of a static PDF export, make it interactive. Show a 7-day checklist (or cards), each day listing required carbs/proteins plus workouts. The user can tick off meals, add actual intakes, and get live feedback ("Day 3 refeed taken: good, proceed; too many cheats: caution"). After each day's weigh-in, the plan could auto-adjust carb targets. This closed-loop design (like a mini diet coach for a contest cut) would be highly valuable and differentiated.

- **Year-of-Lifts counterpart:** The 365-day unlock could be paired with nutrition milestones (e.g. "logged X meals" or "hit macros consistently for Y weeks"). However, since food habits take months to sculpt, it might complicate the simple "annual challenge" idea. Possibly skip adding a separate food metric; instead, encourage logging as part of existing milestones (e.g. "Congratulations, you logged workouts daily for 100 days; log 50 meals to keep the streak").

- **Apple Health / Google Fit Nutrition Sync:** I recommend read-only integration with Apple HealthKit (and Google Fit) for nutrition. Many users now track food in Health or Fit, so we could pull in logged calories/macros (with permission) to save user entry effort. Writing into Health is trickier (Apple doesn't allow third-party writes to nutrition). The privacy posture must be clear: read requires user consent and data should never be sold. Volyume already uses HealthKit for weight (read-only), so similarly we'd only pull in nutrition data the user opts into. On Google Play, use the Health Connect standard for both read and (optionally) write, since Android allows writing some nutrition. Default: ask permission to read "Nutrition: Energy" and "Protein grams," and respect platform privacy guidelines (e.g. Apple requires "Health app data usage" disclosure).

# Area 8: Beta & Release Plan

- **Closed-test cohort size:** Since food logging patterns vary, a small group (N~20 to 30) might miss edge cases. I'd aim for >=100 beta users (spread by bodyweight, gender, goal) to surface most issues. This ensures we see examples of poor logs, disordered behaviors, etc. If that's too slow to recruit, at least 50 with careful screening (ensuring at least some in deficit, some in bulk).

- **Release sequencing:** Not all moves must drop together. A prudent order: first deploy backend logic that doesn't require UI changes (moves 2 & 3). E.g., push the protein rule and gate compression behind the scenes in closed test, so testers won't see missing UI. Next drop moves 1,4,5 (which require front-end forms and new screens) in one update. This staged approach helps isolate any crashes. A possible timeline:
  1. Closed-test update 1: implement **Protein gating** and **Gate compression** (no visible change to UI, but testers can spot quicker calorie adjustments).
  2. Closed-test update 2: launch **Food logging UI** + **auto-fill adherence** + new **insights/whyThis** (moves 1,4,5 all need the diary interface).

- **Listing copy changes:** The existing store copy (docs/PLAY_STORE_LISTING.md) needs minimal edits. Primarily add a sentence about the Complete tier and food logging. E.g.: "**Complete**: Track your nutrition alongside workouts to auto-adjust your diet plan. Log meals, hit protein targets, and get food-driven insights." Also update the pricing tier info to mention Complete. The rest of the description ("Workout Coach", etc.) stays the same. Essentially insert one or two lines about the new nutrition features and tier name. No need to rewrite the whole doc.

- **App Store/Play Store review risk:** On Google Play, since this falls under "Health & Fitness," we must ensure we follow the Health App Declaration rules (declare as health app). Content-wise, calorie/weight tracking is standard; just ensure privacy forms (especially if writing to Fit) are done. On Apple, food logging is allowed but flagged if it encourages disordered behavior. Use neutral tone (as we have), avoid weight-loss claims. The in-app SCOFF compliance helps. In 2025 to 26, I see no new blocks: many apps (MFP, Yazio, etc.) are approved with nutrition. Just ensure compliance with the "Medical/HealthKit" rules (no diagnosis or treatment claims, etc.). In forums, developers note that nothing prohibits nutrition apps per se; just follow normal guidelines. Keep an eye on any new Apple policy around "gamification of diet": unlikely, but be safe.

# Area 9: Questions for Next Pass

1. **Coach Dashboard (B2B) Needs:** We should research exactly what data and features coaches (phase 2) will need from the food integration. For example, would coaches want to monitor client diet adherence, or upload shared meal templates? How should clients' nutrition data appear on the coach UI? Understanding coach workflows is important.

2. **Pricing & Packaging:** Is the UK pricing (£6.99/£59) optimal globally? We assumed simple currency conversions, but market willingness differs by region. A follow-up could study competitor prices (especially MacroFactor/MFP in US/EU) and do user willingness-to-pay surveys in key markets.

3. **User Education and Onboarding:** How best to onboard Pro users to the new nutrition features? We may need user testing on how to introduce food tracking without overwhelming. What tutorial or drip-education is needed? This wasn't covered but is crucial for adoption of the new tier.

4. **Long-term User Behavior:** We should plan to track real-world engagement metrics once food logging is live (e.g. % of days logged, plateau frequency). A research design for A/B testing major changes (like the 2->1 week gate or protein rule) could validate if they improve retention/goals on average.

5. **Compliance and Ethics:** Are there any new regulatory issues (e.g. GDPR, HIPAA) triggered by collecting detailed nutrition? Possibly not beyond current practices, but worth a legal check. Also explore whether to obtain an ethics review or partner with a dietitian to vet messaging.

# What I Would Build First

1. **Food-logging foundation:** The highest priority is enabling users to actually log meals and see adherence. This requires new tables (foods, meal logs) and UI (diary entries). Without this, none of the Complete-tier features (auto-fill, insights, locked decisions) work. Reasoning: It unlocks everything else: we need data to drive the engine enhancements. Even a basic "add meal" screen with calorie/macros input is critical.

2. **Auto-fill & Calorie Gate logic (Backend):** Once logging is possible, implement the autofill adherence (move 1) and the gate-compression rule (move 2). These are relatively small code changes but immediately let the app respond more intelligently to real intake. Reasoning: This will make the coach "feel smarter" to users: they'll see more appropriate adjustments earlier, improving trust and showing the value of logging.

3. **Protein-permits-load rule:** Add protein adherence into recovery logic (move 3). This is also backend work. It directly ties food data to training output. Reasoning: Since retaining performance on cuts is a core value for lifters, this guardrail will preserve gains and demonstrate the synergy between diet and strength: a key differentiator.

4. **New food-driven insights:** Release the new insight types (area 3) and food summary cards (move 5). These surface the nutrition data directly to the user and make the app feel personalized. Reasoning: Insights and friendly explanations are tangible proof of the Complete tier's power. They will engage users by explaining what's happening and tying it to their food logs.

5. **Upgrade triggers / UI prompts:** Finally, add UI touches that nudge Pro users towards Complete (paywall hints, trial prompts). For example, the messages on weekly cards ("would say X if we had food data"). Reasoning: After features are working, we need to convert Pro users. Carefully worded prompts will translate the technical improvements into perceived value at the right moments.

Each step builds on the previous: first get data, then use it in the coach, then explain it, and finally monetize it.

---

## Prior output 2: ChatGPT Deep Research

# Volyume Complete: Integrated Execution and Evidence Report

## Area 1: Competitive positioning for the integrated player

The integrated market for physical training and nutritional intelligence at the £6.99 monthly price point demands a precise equilibrium between automation and user autonomy. Competitors in this space span a spectrum from purely algorithmic macronutrient calculators to heavily managed, human-in-the-loop coaching models. To establish a dominant positioning statement, Volyume Complete must be evaluated against the exact data inputs these platforms gather, the architectural shape of their decision engines, and the psychological frameworks they employ to build trust with their user base.

**RP+ App (Renaissance Periodization)**: Renaissance Periodization operates at approximately £28 to £35 per month, representing the closest direct competitor in terms of target demographic (Vendor-claim). The application gathers body weight, subjective fatigue markers, and meal-by-meal adherence data on a weekly cadence. The decision shape relies heavily on strict macronutrient timing and phased mesocycle progression, pushing users through predefined cut, maintenance, and massing phases. Output takes the form of weekly automated adjustments to macronutrient targets, surfaced via a schedule interface. The explanation trust pattern relies overwhelmingly on the academic authority of its founders rather than in-app data transparency. RP+ pushes decisions rather than explaining them fully, operating as a black box protected by brand authority. It excels in macronutrient reallocation through a feature called Day Balance, which recalculates subsequent meals automatically if an earlier meal deviates from the plan. The Volyume live engine is ahead in its autoregulation matrix and deterministic explanations, offering clear upward counterfactuals that educate the user rather than merely issuing commands. RP+ lacks an integrated approach to real-time volume autoregulation based on exact caloric adherence.

**MyFitnessPal Premium**: Priced at £65 annually, the application gathers highly granular food log data, barcode scans, and broad exercise calorie estimates. Decisions within the application are mathematically linear, subtracting estimated exercise calories from a static Total Daily Energy Expenditure target. The output format is immediate numerical feedback upon logging an item. The trust pattern is highly visual and gamified, relying on green and red indicators to signal daily budget adherence. Qualitative studies indicate this design pattern often triggers anxiety and obsession among users. MyFitnessPal leads the industry in food database size, verified label accuracy, and frictionless logging. Volyume is categorically ahead in workout tracking depth. MyFitnessPal treats all exercise merely as a singular calorie deficit multiplier, entirely ignoring progressive overload, weekly tonnage, recovery scores, and muscular fatigue.

**JEFIT**: Priced at £12.99 monthly, JEFIT recently introduced a nutrition layer to complement its established workout tracker. It gathers sets, reps, body measurements, and basic meal logs. The decision shape is partitioned and siloed. The artificial intelligence engines focus heavily on workout routine generation and progressive overload tracking, while the nutrition side remains a relatively static logging environment. The explanation trust pattern is community-driven, relying on peer reviews and shared routines. JEFIT is ahead in its massive exercise database, Apple Watch integration, and user forums. Volyume is ahead by integrating the two data streams intelligently. JEFIT does not alter workout volume prescriptions based on caloric deficit depth or daily protein adherence.

**Centr**: Operating at £29.99 monthly, Centr focuses on lifestyle content, high-production video classes, and wellness integration. It gathers minimal quantitative data, relying instead on user completion checkboxes for daily tasks. The decision shape is predetermined by static meal plans and scheduled video workouts. The output format is a highly curated daily itinerary. The explanation trust pattern is anchored entirely in celebrity endorsement and high aesthetic production value. Centr is ahead in meal recipe variety, cooking instructions, and automated meal swapping flexibility. Volyume is ahead in every aspect of quantitative tracking, adaptive programming, and load management.

**Caliber / Future (The Human Benchmark)**: Future commands £160 monthly, while Caliber Premium offers similar human-led coaching tiers. These applications gather asynchronous chat messages, video form checks, subjective feedback, and continuous wearable biometrics via Apple Health. The decision shape is entirely human-driven, constrained only by the individual coach's methodology. The output is a weekly updated training block accompanied by direct, personal messaging. The explanation trust pattern is highly relational. These platforms excel at subjective interpretation, emotional accountability, and empathy. Volyume replaces this relational trust with deterministic transparency, using the weeklyCoach.js engine to provide instant, emotionless, data-driven adjustments at a fraction of the financial cost.

**Hevy Pro + MacroFactor (The Combination)**: Hevy Pro costs £3.99 monthly. MacroFactor costs approximately £11.99 monthly. The combined cost of roughly £16 monthly provides excellent workout logging and a highly adaptive Total Daily Energy Expenditure algorithm. Together, they gather granular food data, precise weight trend data, and set-by-set progression. The decision shape is mathematically rigorous on the nutrition side, utilising an energy balance equation to adjust targets, and user-led on the workout side. The trust pattern relies on scientific transparency, adherence neutrality, and algorithmic neutrality. This combination is Volyume's primary threat in the market. The combination provides a verified food database that Volyume currently lacks, alongside a mature expenditure algorithm. Volyume's pitch is intelligent cross-pollination. By combining the data streams, Volyume can actively suppress training volume when nutrition falters, a systemic integration that two siloed applications cannot perform regardless of their individual quality.

**Positioning Statement:** Volyume Complete delivers the scientific rigour of a premium dietary expenditure algorithm and the progressive logic of an advanced volume tracker in a single £6.99 subscription, actively managing your training fatigue when your nutrition falters.

## Area 2: Re-cut the five integration moves with current evidence

The five conceptual integration moves must be sharpened against the live engine architecture, specifically the weeklyCoach.js and nutritionEngine.js files, and supported by the most recent physiological and human-computer interaction literature.

### Move 1: Auto-fill check-in adherence from measured intake

The 2021 qualitative research by Eikey highlights the severe negative psychological consequences of forced manual logging and red-colour deficit warnings, noting that hyper-quantification induces application dependency, anxiety, and eventual abandonment. Automating the adherence check-in reduces the friction and emotional weight of manual data entry, supporting an adherence-neutral design philosophy.

This integration modifies the weekly_checkins_v2 schema. It requires a Supabase migration to add measured_kcal_avg and days_logged columns. The cals_adherence text value is no longer requested from the user. Instead, it is derived programmatically in nutritionEngine.js by comparing the measured_kcal_avg against the prescribed target.

The primary failure mode occurs if a user logs only their breakfast for three consecutive days, producing a falsely low measured_kcal_avg. The engine would erroneously assume a massive caloric deficit and trigger drastic volume suppression. The mitigation requires gating the auto-fill logic behind a strict days_logged threshold. The engine must require at least four days containing a minimum of 800 logged kilocalories to execute the auto-fill. If this condition fails, the system falls back to the manual subjective prompt.

The signal that this move is working will appear at month three, where completion rates of the weekly check-in process should increase by fifteen percent due to reduced friction. The cost of delaying this move is high. Users utilising a third-party food tracker will abandon the weekly check-in entirely if forced to manually type data they have already catalogued elsewhere.

### Move 2: Compress calorie-adjustment gate from two weeks to one

Recent implementations of adaptive expenditure algorithms demonstrate that mathematical models can identify true expenditure trends within seven to fourteen days if the input logging is highly consistent. The previous two-week cooldown mandated by the live engine is unnecessarily slow if intake variance is eliminated through strict measurement.

This move modifies the cooldown logic located within weeklyCoach.js. It requires the addition of a new helper function titled isHighFidelityLog(). If this function returns true, indicating adherence is greater than ninety percent based on measured intake, the standard cooldown variable is bypassed for minor caloric adjustments up to 100 kilocalories.

The failure mode involves normal physiological water weight fluctuations triggering an aggressive calorie cut after just one week of compliance. To mitigate this, the compression applies exclusively to upward target adjustments, such as adding calories when weight drops dangerously fast. Downward cuts must still respect the ten-day exponential moving average weight trend to prevent punishing transient water retention.

The signal of success at month one will be a reduction in support tickets complaining about the engine being too slow to adjust to rapid weight loss. Delaying this move ensures advanced users will lose trust in the adaptive nature of the application if it perpetually lags behind their immediate metabolic reality.

### Move 3: Add protein adherence to the autoreg recovery score

A 2025 systematic review and meta-regression by Refalo, Trexler, and Helms provides the most precise data to date on protein intake during a caloric deficit. It confirms a highly probable linear dose-response relationship between dietary protein intake and fat-free mass retention. The study concludes that intakes of up to 2.5 grams per kilogram of fat-free mass per day are associated with significantly less lean tissue loss during energy restriction. This definitive 2025 paper replaces the older Cooke 2010 and Pasiakos 2014 citations as the foundational benchmark for protein-sparing logic.

This integration modifies the autoregulation matrix within weeklyCoach.js. It requires adding an adherence_protein boolean flag to weekly_checkins_v2. If protein adherence falls below eighty percent of the required target, the recovery score integer cannot mathematically exceed a value of two, regardless of subjective user input.

A critical failure mode exists for users consuming plant-based diets who may consistently miss the exceptionally high 'Advanced' protein target of 3.3 grams per kilogram. This would permanently suppress their training volume despite them feeling fully recovered. To mitigate this, the application must ensure the 'Standard' protein tier of 2.2 grams per kilogram is selected by default for non-physique competitors, preventing artificial recovery suppression caused by unnecessarily aggressive protein targets.

By month six, aggregate database queries should show that users who consistently hit their protein targets retain higher weekly training tonnage during prolonged cut phases compared to those who do not. Delaying this move means the engine risks prescribing volume increases to under-recovered, under-fed muscles, increasing the probability of central nervous system fatigue and joint injury.

### Move 4: Food-driven plateau diagnosis branches in WHY_LIBRARY

Explainable artificial intelligence research from Kuhl, Artelt, and Hammer in 2023 demonstrates that upward counterfactual explanations significantly improve user performance and system comprehension compared to downward comparisons or purely descriptive text. Users learn faster and comply more readily when told how a different action would have yielded a better result.

This move adds new food-driven string keys to the WHY_LIBRARY object in weeklyCoach.js. The output payload now merges training performance signals with nutrition adherence signals to output unified, context-aware text arrays to the user interface.

The failure mode is explanation fatigue. Human-computer interaction literature warns that excessive detail can overwhelm the user, leading to a phenomenon where all explanations are ignored. To mitigate this, the engine must strictly limit the surfaced output to one primary training decision and one primary nutrition decision per week, utilising the friction-triggered surfacing rule to hide mundane confirmations.

The success signal at month one involves telemetry showing the ratio of held decisions manually expanded by users stabilising at around thirty percent, indicating they read the explanations only when genuinely curious about a deviation. Delaying this move leaves the Complete tier feeling like two separate applications operating concurrently rather than one integrated intelligence.

### Move 5: Surface food cards and food-driven insights

Context-aware intelligent systems must integrate seamlessly into the user's daily workflow to establish persistent trust. Presenting insights passively without requiring deliberate navigation aligns with foundational intelligibility principles.

This integration modifies insightsEngine.js to parse the new food insight types. It also adds a deterministic TodaysIntakeCard component directly to the HomeScreen view.

The failure mode involves the home screen devolving into a dashboard of red warning signs, mimicking the punitive design of older tracking applications. This visual punishment exacerbates eating disorder triggers and drives application abandonment. To mitigate this, the system must apply a strict adherence-neutral design principle. The TodaysIntakeCard must display purely descriptive data, utilising neutral colours without moral coding or aggressive warning icons for overeating.

The signal of success at month three will be an increase in daily active sessions, as users begin opening the application frequently to check food targets alongside their workout splits. Without a visible home-screen presence, the financial value proposition of the Complete tier remains invisible to the user.

## Area 3: New food-driven insight types for insightsEngine.js

The insightsEngine.js file currently feeds the Analytics Screen stack deterministically. The following ten food-driven types adhere to the existing severity pattern, where zero represents informational, one represents a notice, and two represents a strict warning. All copy complies with the jargon blocklist and strict word limits.

- **protein_floor_warn (severity 2):** Deficit active AND protein adherence < 80% for two consecutive weeks. Copy: "Protein is too low to protect muscle while you lose weight. Focus on hitting the protein target first." Upward: "We held volume. Once protein hits target, we will push the workload."
- **fuel_not_fatigue (severity 1):** Performance drops AND carbohydrate intake < target by 20% AND sleep > 7 hours. Copy: "Your lifts dropped, but sleep is good. This looks like low fuel, not deep fatigue."
- **metabolism_adapting (severity 0):** EWMA weight trend flat for 14 days AND measured intake matches target +-100 kcal. Copy: "Your weight is flat despite accurate tracking. Your body has adjusted to this intake." Upward: "We held targets. Once flat for 21 days, we will trim calories."
- **refeed_skipped_notice (severity 1):** Refeed prescribed by nutritionEngine.js AND user logs calories < maintenance on refeed day. Copy: "You stayed in a deficit on a scheduled refeed day. This makes the next training block harder." Upward: "We held volume. Once you take the refeed, we will push harder."
- **gaining_too_fast (severity 2):** Goal is bulk AND weight trend > +0.5% body weight per week. Copy: "Weight is climbing too fast. Most of this pace will be stored as fat, not muscle." Upward: "We trimmed targets. Once the pace slows, we will hold them steady."
- **diet_break_due (severity 0):** shouldSuggestDietBreak returns true (8+ weeks in continuous deficit). Copy: "You have been pushing a deficit for eight weeks. It is time to bring food back to maintenance to recover."
- **untracked_drift (severity 1):** Weight stalls AND days logged < 4 per week. Copy: "Weight is flat, but logging is patchy. We need clearer data before changing the plan." Upward: "We held targets. Once tracking tightens, we will adjust the plan."
- **gentle_rhythm_food (severity 0):** Adherence is hit for 3 consecutive weeks AND weight trend matches goal. Copy: "Intake is accurate and the scale is moving perfectly. Keep executing."
- **cut_safety_floor (severity 2):** TDEE adjustment attempts to push calories below the calculated FFM floor. Copy: "Pushing food any lower will harm your recovery and health. The current deficit is the absolute limit." Upward: "We held targets. Once weight stalls completely here, we must diet break."
- **permit_load_protein (severity 0):** Soreness score is high AND protein adherence > 90%. Copy: "You are sore, but high protein intake permits us to keep the workload heavy."

## Area 4: Engine guardrails beyond what's already shipped

The integration of granular nutrition data necessitates significantly tighter physiological guardrails, specifically concerning Relative Energy Deficiency in Sport and the unintentional promotion of eating disorder behaviours.

### The FFM Floor versus the Existing Flat Floor

The 2023 International Olympic Committee Consensus Statement on Relative Energy Deficiency in Sport identifies problematic low energy availability at or below 30 kilocalories per kilogram of fat-free mass per day. The consensus highlights severe detrimental outcomes affecting reproductive function, bone health, and energy metabolism when athletes breach this threshold. We must mathematically quantify whether this new FFM floor catches dangerous protocols earlier than the live engine's existing combination of a 1.5 percent body weight gate and flat absolute floors.

**Scenario A: 75 kilogram male at 12 percent body fat.** This user possesses a fat-free mass of 66 kilograms. The FFM Floor calculation (30 kcal multiplied by 66) equals a safety limit of 1980 kilocalories per day. The existing flat floor for males in the live engine is 1500 kilocalories per day. The FFM floor intercepts the algorithm a massive 480 kilocalories earlier. The live engine would have permitted this lean male to cut his intake down to 1500 kilocalories, placing him deep into severe physiological distress.

**Scenario B: 60 kilogram female at 24 percent body fat.** This user possesses a fat-free mass of 45.6 kilograms. The FFM Floor calculation (30 kcal multiplied by 45.6) equals a safety limit of 1368 kilocalories per day. The existing flat floor for females in the live engine is 1200 kilocalories per day. The FFM floor intercepts the algorithm 168 kilocalories earlier.

The fat-free mass floor is drastically more conservative, particularly for leaner individuals. It absolutely catches critical safety cases the existing rigid guardrails miss. Implementing this constraint will prevent severe metabolic down-regulation, but it will force the weeklyCoach.js engine to refuse further cuts for lean individuals. This refusal must be clearly communicated via the cut_safety_floor insight to prevent user frustration.

### Detecting Eating Disorder Signals

The qualitative literature concerning fitness trackers, specifically Eikey's comprehensive 2021 study, confirms that diet applications routinely trigger disordered behaviours through quantification obsession, rigid dependency, and visual punishment systems. Beyond the existing SCOFF screener at onboarding, the following behavioural signals are supported by literature and are highly worth detecting algorithmically:

Firstly, logging frequency obsession. The system should monitor if a user opens the food logging interface more than fifteen times per day. The literature notes that users suffering from restrictive disorders develop severe anxiety and compulsively check numerical outputs to maintain an illusion of control.

Secondly, historical micro-editing. The system should track if a user frequently adjusts food entries from previous weeks. This behaviour indicates a psychological fixation on retrospective perfection, a known hallmark of numerical obsession that serves no practical physiological purpose.

Thirdly, chronic undereating of goals. The system must detect when a user consistently misses the calorie target on the downside while simultaneously dismissing application warnings. Gamification causes vulnerable users to view a dietary target as a ceiling to beat rather than a precise goal to hit.

If these signals compound within the database, the engine should silently lock the deficit logic, refusing to lower targets further, and trigger a human-centric safety warning encouraging the user to seek professional support.

### The Jargon Blocklist Extension

The whyThisTemplates.js file currently bans seven specific terms. An earlier audit suggested banning terms like "metabolic adaptation" and specific researcher names. The honest take is that the blocklist should absolutely be extended. Volyume targets serious lifters, but this demographic frequently confuses itself with advanced sports science vocabulary, using complex terminology to mask poor execution. Explanations must remain grounded in actionable reality. The term "metabolic adaptation" should be banned. The engine should use "your body has adjusted." The term "training stimulus" should be banned. The engine should use "muscle growth signal." Specific researcher names must be banned. Appeals to academic authority bypass genuine user understanding. The programmatic logic should stand entirely on the data itself, not the prestige of a famous name.

### Human-Computer Interaction and Friction-Triggered Surfacing

The locked decision to utilise friction-triggered surfacing is based on the premise that constant, unprompted explanations cause severe cognitive fatigue. Recent literature on Explainable Artificial Intelligence warns of "explanation fatigue", where excessive, redundant detail overwhelms the user rather than informing them, leading to a phenomenon where the user begins to ignore the system entirely. Friction should not trigger an explanation on every minor mathematical variance. The exact rule governing when friction triggers an explanation must be sharpened: surfacing occurs only when the engine makes a decision that diverges from the user's expected linear progression. The system should not explain adding 2.5 kilograms to the bar after a highly successful week. The system must explain forcing a deload early due to consecutive poor sleep metrics. The system must explain refusing to cut calories because the fat-free mass floor is hit. The system must explain holding targets steady despite a weight stall, because the counterfactual proves the adaptation is transient.

## Area 5: The Complete-tier paywall and upgrade trigger

Because the Pro tier already includes adaptive expenditure mathematics running silently in the background, the upgrade trigger cannot merely be the presence of an algorithm. The psychological trigger must be the integration of context. The user must clearly perceive that the training engine cannot perform its optimal work without access to the food log.

### Concrete In-App Conversion Moments

- **The Stalled Lift Moment** (Analytics Screen, Lift Peaked): "Your bench press is stalled. With Complete, we track your food to see if this is a recovery limit or just low fuel."
- **The Extreme Soreness Moment** (Weekly Check-In, Soreness 4): "High soreness requires high protein to rebuild. Unlock Complete to ensure your diet is supporting this workload."
- **The Deload Moment** (Home Screen, Deload Prescribed): "We scheduled a deload. With nutrition data, we could tell if you need rest or just more food. Unlock Complete to integrate your diet."
- **The Missing TDEE Moment** (BodyMetrics Weight Trend Chart): "Your weight trend is clear, but without food data, we cannot calculate your exact metabolic rate. Unlock Complete to automate targets."
- **The Mesocycle Summary Moment** (End of 6-Week Training Block): "Block finished. You added 12,000 kg of volume. Unlock Complete to see how your protein intake powered this progression."
- **The Energy Crash Moment** (Weekly Check-In, Energy 1): "Your energy crashed this week. Unlock Complete to track whether your carbohydrate timing is causing this fatigue."

### Differential Output Design

The Pro weekly card should not display a persistent, permanent banner advertising the lack of food data. Constant, aggressive upselling creates an adversarial user interface. Instead, the differential counterfactual should appear only when the user reports a negative subjective outcome, such as high fatigue, stalled weight, or missed repetitions. It should also appear when they manually report their diet adherence as 'under' or 'over'. This positions the upsell as a highly specific, contextual solution to a problem the user has just admitted to experiencing.

### 14-Day Trial Mechanics

The trial mechanics must be precise to avoid frustrating users. The trial starts precisely when the user taps a conversion moment copy block and explicitly confirms their intent via the native operating system payment sheet. It does not start automatically upon application installation. Upon unlocking, the TodaysIntakeCard immediately renders, the food database application programming interface unlocks, and the weeklyCoach.js engine switches its internal gating to expect the measured_kcal_avg integer. At day fourteen, if the subscription is unpaid, the TodaysIntakeCard vanishes. The cals_adherence column reverts to requiring manual string inputs. The historical food data remains stored securely in the Supabase backend but is rendered inaccessible via the user interface. The win-back notification reads: "Your metabolic rate calculation is paused. Subscribe to Complete to resume automatic adjustments."

### Beta Flag Relationship

The PRO_BETA_ACTIVE flag currently makes the Pro tier free for early testers. A new COMPLETE_BETA_ACTIVE flag should be introduced immediately. The Complete tier should flow free to the existing closed-test cohort to gather vital telemetry on the weeklyCoach.js integration loops. Complete will serve as the commercial trigger that ends the entire beta period. When Complete achieves General Availability, both flags will flip to false simultaneously, moving all users to the grandfathered step-up logic.

## Area 6: Voice-clean food-driven templates for whyThisTemplates.js and WHY_LIBRARY

- **Performance dropped + carbs short:** "Your lifts dropped, but sleep is fine. Carbohydrate intake missed the target. This is low fuel. Eat more before training."
- **Performance dropped + protein short:** "Performance fell and protein is consistently low. Muscle repair is compromised. Hit the protein floor before we push volume higher." Upward: "We held volume. Once protein hits target, we will adjust."
- **Soreness up + protein >=90% + PRs hold:** "You are very sore, but protein intake is excellent and strength is holding. We can safely maintain this heavy workload."
- **Weight stalled 2 weeks + intake matched target:** "Weight is flat despite accurate tracking. Your body has adjusted. We trimmed targets slightly to keep you moving forward."
- **Weight stalled + intake ran over:** "Weight is flat and food targets were exceeded. The current plan works, but execution drifted." Upward: "We held targets. Once tracking tightens, the scale will move."
- **Cut phase + protein <80%:** "Protein is too low to protect muscle while cutting weight. We cannot increase the deficit safely." Upward: "We held calories. Once protein hits target, we will adjust."
- **Performance climbing + intake under target:** "Your lifts are up, but food intake is creeping lower. This risks a sudden crash. Eat fully to sustain this momentum."
- **Recovery good + intake on target + sleep good:** "Sleep, food, and recovery are all perfect. You are primed to grow. We increased training volume to push the limit."
- **Bulk + gaining too fast + intake at target:** "Weight is climbing too fast to be pure muscle. We trimmed calories slightly to prevent unnecessary fat gain."
- **Bulk + flat for 3 weeks + intake at target:** "Weight has not moved in three weeks despite perfect tracking. You need more energy to grow. We added calories."
- **Refeed taken:** "You hit the prescribed refeed perfectly. Glycogen stores are full. Expect a temporary weight spike, but training will feel lighter."
- **Refeed skipped:** "You stayed in a deficit on a scheduled refeed day. The next block will feel heavier than it should." Upward: "We held volume. Once you take the refeed, we will push harder."
- **Diet break suggested + adherence >=90%:** "You executed the deficit perfectly for eight weeks. It is time to eat at maintenance to clear deep fatigue."
- **Diet break suggested + adherence patchy:** "You have been cutting for eight weeks, but intake was inconsistent. A diet break will not help. Tighten the tracking first."
- **ED floor refused cut:** "Pushing calories lower will harm your health and wreck your recovery. This is the absolute limit for your body weight." Upward: "We held targets. Once weight stalls completely here, we must diet break."

## Area 7: Mesocycle, peak week, year-of-lifts integration with food data

### Mesocycle Block Summary

The mesocycle block surface, currently handled by MesocycleBuilderScreen, must display a block-level food summary to retrospectively prove the value of the Complete tier over time. The minimum useful data per block requires displaying the average daily kilocalorie variance across the four to six weeks, and the average protein hit rate percentage. Segmenting protein adherence on training days versus rest days is highly valuable. This specific segmentation reveals deeply ingrained behavioural patterns, such as users executing their diets perfectly on gym days but severely undereating or overeating on weekend rest days. Highlighting this discrepancy provides actionable intelligence that raw averages conceal.

### Peak Week Tracker Design

The PeakWeekScreen is currently a static text export. It must transition into a closed-loop active tracker. Based on the 2021 peaking protocols detailed by Escalante and colleagues, competitive bodybuilding requires precise daily manipulation of carbohydrates, water, and sodium leading up to the stage. The tracker design requires a seven-day countdown interface that strictly overrides the standard nutritionEngine.js recommendations. The mechanics must allow the system to prescribe exact daily water volume, such as initiating at eight litres and tapering down to two litres. It must manage carbohydrate loading phases, differentiating between front load, mid load, and back load peaking strategies. It requires a strict daily check-in toggle for water, sodium, and carbohydrates. If a depletion day is missed, the tracker must throw a severity two warning, as failing to execute a water depletion protocol correctly is dangerous and nullifies the visual effect of the peak.

### Year of Lifts

The existing "Year of Lifts" 365-day milestone should absolutely be extended to include food-aware milestones. Implementing a "Year of Fuel" counterpart is crucial. Providing a dedicated badge awarded for logging two hundred and fifty days of protein data provides massive long-term retention leverage, transforming a daily logging chore into a highly coveted yearly achievement.

### Health API Posture

Apple Health and Google Fit nutrition integration should default to a strict read-only posture. Writing nutrition data back to Apple Health pollutes the user's ecosystem if they decide to use a dedicated tracker later. The privacy posture must clearly state that Volyume reads calorie and macro totals strictly to feed the training intelligence engine, and deletes any granular meal timestamps from its own servers immediately after processing the weekly averages.

## Area 8: Closed-test to open-beta to GA progression for Complete

### Cohort Size and Sequencing

The current closed-test cohort size is small. For the food integration to successfully surface enough edge case patterns regarding the adaptive expenditure algorithm and the fat-free mass floor gating, the cohort must be expanded to a minimum of two hundred to three hundred highly active users. Anything smaller will fail to generate sufficient variance to properly test the friction-triggered explanation logic under real-world conditions.

The five integration moves must be staged sequentially to isolate errors. Stage one encompasses the backend architecture, deploying moves one, three, and four. The auto-fill schema, the protein adherence logic, and the new templates are deployed. These require no new complex user interface components and can run silently, processing whatever data users manually input to test mathematical stability. Stage two focuses on the user interface, deploying move five. The TodaysIntakeCard and visual insights are pushed to surface the data. Stage three addresses safety, deploying move two. Compressing the calorie-adjustment gate from two weeks to one requires the utmost confidence in the backend logic. It must land last, heavily monitored by the on-device error ring buffer.

### Marketing and Listing Copy Implications

The minimum copy delta required to ship Complete involves modifying the existing Play Store and App Store listing documents. The subtitle should change from "The definitive workout tracker" to "The integrated workout and nutrition coach." A prominent bullet point must be added stating: "Volyume Complete adjusts your training volume based on how well you eat." This single line serves to immediately differentiate the application from the entire siloed tracking market.

### Editorial Review Risk

App Store editorial review risk for a body-composition application introducing food logging is extremely high. Apple frequently rejects applications that appear to promote eating disorders or rapid weight loss without robust clinical safeguards. The presence of the SCOFF screener and the rigid 30 kilocalorie per kilogram fat-free mass floor must be explicitly highlighted in the App Store review notes. Providing the editorial reviewer with a test account configured to trigger the cut_safety_floor insight is essential. Proving that the application actively refuses to starve users provides the strongest possible defence against a rejection under Apple's health and safety guidelines. The 2023 Mountjoy consensus statement provides the precise clinical justification for this feature.

## Area 9: What the next research pass should ask that this one didn't

1. **Food Database Vendor Interfacing:** We have established that lacking a verified food database is a critical weakness against competitors. What are the specific latency costs, tier limits, and financial overheads of integrating FatSecret, Nutritionix, or Edamam via an application programming interface?
2. **Optical Character Recognition Libraries:** If Volyume Complete requires entirely manual entry of food labels, it will face high abandonment rates. What is the most performant, offline-capable React Native software development kit for parsing nutritional labels via the camera?
3. **Business-to-Business Telemetry:** The brief mentions a Phase 2 dashboard for coaches. What exact schema structure within weekly_checkins_v2 is required to allow a human coach to manually override the weeklyCoach.js deterministic output without corrupting the application's historical state?
4. **Regulatory Compliance for Nutritional Data:** By reading Apple Health data and pairing it intelligently with body weight and workout metrics to prescribe changes, does the dataset cross the regulatory threshold into protected health information in target European and North American jurisdictions?

## What I would build first if I were Allan

1. **Implement the Fat-Free Mass Floor Guardrail.** This provides immediate, unshakeable medical safety against severe energy deficiency. It guarantees the application will pass through strict editorial reviews by proving it actively prevents extreme starvation protocols.
2. **Deploy the Food-Driven Templates in the Output Library.** The logic engine is the primary intellectual moat of the product. Giving the system the vocabulary to explicitly explain why a nutrition failure changes a training outcome provides immediate, visible value to the user.
3. **Ship the Read-Only Apple Health Sync.** This circumvents the need to build a massive, expensive food database immediately. Users can continue logging in established applications while Volyume reads the aggregated totals to power the intelligence layer.
4. **Add Protein Adherence to the Autoregulation Matrix.** This is the true execution of the integrated marketing promise. Suppressing training volume when protein intake is insufficient proves to the user that the application understands human physiology, not just basic arithmetic.
5. **Build the Context-Aware Conversion Moments.** The financial viability relies on upgrading free users. Surfacing upward counterfactuals directly on a stalled lift screen is the highest-leverage psychological trigger available to transition users to the Complete tier.

---

## The ten material disagreements to adjudicate

### 1. Jargon blocklist extension

- ChatGPT (Area 4): extend the 7-term blocklist. Ban "metabolic adaptation" (use "your body has adjusted"), "training stimulus" (use "muscle growth signal"), and specific researcher names.
- Gemini (Area 4): don't extend. Current minimal list is fine; banning scientific terms might confuse users more than clarify.

Which call is right? Cite HCI research on technical-vs-plain language in coaching apps if available.

### 2. Compressed calorie-adjustment gate: both directions or upward only

- ChatGPT (Area 2, Move 2): compression applies exclusively to upward target adjustments (adding calories when weight drops too fast). Downward cuts must still respect the 10-day EWMA trend. Framed as safety mitigation.
- Gemini (Area 2, Move 2): compress to 1 week if intake is reliable, both directions allowed. Risk of single-week reaction mitigated with smaller magnitude in week one.

Which posture is safer and more defensible given the live app's existing 1.5 percent BW/week hard gate?

### 3. First move to build (ranking 1)

- ChatGPT: 1 is **FFM floor guardrail**. Reasoning: immediate medical safety + editorial-review insulation.
- Gemini: 1 is **food-logging foundation** (tables, UI). Reasoning: can't do logic without data.

Which is right given the 14-day window context? Is there an even better 1 neither named?

### 4. Sequencing of the five moves

- ChatGPT (Area 8): Stage 1 backend (moves 1, 3, 4 — auto-fill schema, protein adherence logic, new templates). Stage 2 UI (move 5 — TodaysIntakeCard, visual insights). Stage 3 safety (move 2 last, gate compression, "heavily monitored").
- Gemini (Area 8): Stage 1 backend-only (moves 2 & 3 — gate compression and protein gating, so testers see quicker calorie adjustments). Stage 2 UI + adherence + insights (moves 1, 4, 5 — diary interface, auto-fill, new templates).

Different orderings. ChatGPT puts move 2 last because it's the most safety-sensitive. Gemini puts move 2 first because it doesn't need new UI. Which sequencing is right?

### 5. Closed-test cohort size

- ChatGPT: 200 to 300 highly active users minimum.
- Gemini: >=100 ideal, 50 with careful screening as absolute minimum.

Which figure is grounded in evidence on closed-beta cohort sizing for fitness apps with adaptive engines?

### 6. ED-pattern detection intervention severity

- ChatGPT (Area 4): silently lock the deficit logic, refuse further cuts, trigger a human-centric safety warning encouraging the user to seek professional support. Active intervention.
- Gemini (Area 4): gentle check-in like friction triggers, no automatic lockout. Conservative intervention.

Which intervention model is supported by the 2025 ED-and-fitness-apps literature? Cite if possible.

### 7. Year of Lifts food counterpart

- ChatGPT (Area 7): build "Year of Fuel". Badge for 250 days of protein data. Strong retention leverage.
- Gemini (Area 7): skip the separate food metric; complicates the simple annual challenge. Encourage logging as part of existing milestones.

This is a product call more than an evidence call. Make the call.

### 8. Apple Health / Health Connect write posture

- ChatGPT (Area 7): strict read-only on both iOS and Android. Writing back pollutes the user's ecosystem.
- Gemini (Area 7): read-only on iOS (Apple doesn't allow third-party writes to nutrition anyway). Google Health Connect allows writes; consider it on Android.

Verify: does Apple HealthKit's `HKQuantityTypeIdentifierDietaryEnergyConsumed` actually allow third-party writes? Does Google Health Connect's nutrition data type allow writes? Settle the factual question, then make the policy call.

### 9. Differential output on the Pro paywall

- ChatGPT (Area 5): only show "with food data, this card would have said X" when the user reports their adherence as 'under' or 'over' (i.e. when the missing context is critical).
- Gemini (Area 5): only mention the "would be X" on Pro if adherence was 'under' or 'over' for at least 2 weeks. Same direction, stricter threshold.

Mostly aligned but threshold differs. Where's the right line?

### 10. Pro-tier conversion trigger copy

Both passes propose specific paywall trigger moments. ChatGPT proposes 6 moments with exact copy. Gemini proposes ~6 moments with different copy. The copy itself diverges in voice.

Apply the live voice rules (British English, no em dashes, no AI tells, no jargon-blocklist terms, ≤25 words for in-app copy). For each of these 6 trigger moments — Stalled Lift, Extreme Soreness, Deload, Missing TDEE, Mesocycle Summary, Energy Crash — recommend the best copy from either pass, rewriting where neither pass nails the voice.

---

## Factual claims to pressure-test

ChatGPT made several specific citations Gemini did not. Verify these are real, current, and as authoritative as ChatGPT claims:

1. **Refalo, Trexler, Helms 2025** systematic review and meta-regression on protein and lean-mass retention in deficit, cited as recommending <=2.5 g/kg FFM. Real paper? Replaces Cooke 2010 / Pasiakos 2014 / Davies 2018 as the strongest current evidence?
2. **Kuhl, Artelt, Hammer 2023** on upward counterfactual explanations and user task performance. Real paper? Stronger or weaker than the Hügle 2023 arXiv:2306.07637 the previous round used?
3. **Eikey 2021** qualitative work on diet-app harm. Real paper? Is this the same author as Eikey & Reddy 2017 the previous round cited?
4. **Escalante 2021** competitive bodybuilding peaking protocols. Real paper?
5. **2023 IOC RED-S consensus**. The previous round cited Mountjoy 2014. Both ChatGPT and Gemini reference the 2023 update. Confirm: is the 30 kcal/kg FFM threshold from the 2014 paper, the 2023 update, or both? Has the 2023 update moved the threshold?
6. **SportRxiv 2024 reference** on gym-only activity multipliers (live nutritionEngine.js cites this in a comment, both passes accept it). Real preprint? Worth citing as defensible?

For each: if real, brief one-line summary of what it says and whether the pass cited it correctly. If not real or misrepresented, flag.

---

## Required deliverable shape

Output structure (no padding):

### Section A: Adjudications

For each of the 10 disagreements above, in order:

- One-sentence framing of the disagreement
- Your verdict (one of: ChatGPT, Gemini, neither, hybrid)
- Two-to-four sentences of reasoning, citation-backed where the literature supports a call
- Where it's a judgement call rather than an evidence call, label it clearly

### Section B: Factual scrutiny

For each of the 6 factual claims above:

- Verdict (verified / partial / wrong / unverifiable)
- One line of evidence

### Section C: Anything either pass missed

Three to five items the other two passes didn't address but should have. Areas to look at if you don't have your own list: HealthKit `HKQuantityTypeIdentifier` specifics, B2B coach schema for manual overrides without corrupting historical state, regulatory/PHI threshold for nutrition data crossing into protected health information in UK/EU/US, and the actual user-journey of a Pro->Complete upgrade prompt in the live `ProUpgradeScreen.js`.

### Section D: The final ranked five integration moves

This is the bottom line. Five moves. Numbered 1 to 5. Each with:

- The move (one sentence)
- Why it's at this rank (two sentences max)
- Concrete file/migration impact on the live codebase
- The signal at month 1 / month 3 that tells you it's working

### Section E: Three open questions worth a follow-up research pass

If any.

---

## Voice rules for the output

- British English (optimise, colour, behaviour, fibre)
- No em dashes. Use full stops, commas, colons
- No AI tells: no "Let me", "I'll", "Certainly", "Of course", "delve", "leverage", "seamless", "robust", "comprehensive", "in today's fast-paced world", "It's worth noting"
- Plain spoken voice. Short sentences
- Don't position Volyume above coaches
- For any in-app copy you propose (Section A, Disagreement 10), the same rules plus the live jargon blocklist (MEV, MAV, MRV, RIR, RPE, mesocycle, junk volume)
