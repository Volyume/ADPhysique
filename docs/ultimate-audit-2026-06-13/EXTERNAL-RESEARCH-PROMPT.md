# EXTERNAL RESEARCH PROMPT — run on 3 separate AIs, paste each export back

Copy everything inside the ``` block below into each external AI (e.g. ChatGPT, Gemini, Claude,
Perplexity). Run it on THREE independently. Paste all three exports back. The strict format lets the
three reports be cross-checked claim-by-claim; disagreements and unsourced claims get flagged on
reconciliation.

```
ROLE
You are a competitive-intelligence and user-sentiment researcher for the strength-training, physique
and nutrition mobile-app market. Produce a rigorous, FULLY SOURCED research report. A downstream team
will cross-check your report against two other AIs' reports, so structure and sourcing matter as much
as content. Use live web browsing if you have it.

ABOUT THE PRODUCT BEING BENCHMARKED (context only — do NOT praise it; research the MARKET, not this app)
A UK strength & physique coaching app spanning the full spectrum: complete beginners → casual gym-goers
→ intermediate lifters → elite physique competitors. Key characteristics that shape what's relevant:
- Deterministic coaching engine: NO LLM/AI, NO randomness. (So "add an AI chatbot" is NOT useful to it;
  research what the BEST DETERMINISTIC/algorithmic and human-coached competitors do.)
- Weekly adaptive coaching loop: weight trend → calorie/training/step/cardio adjustments.
- ED-safety systems: calorie floors (1200 kcal women / 1500 men), a fat-free-mass energy floor
  (~30 kcal/kg FFM), rapid-loss correction, eating-disorder pattern detection.
- Tiering: FREE = workout logging, plan library, training builder, exercise library, PRs, progress
  stats. PRO = food diary, barcode scanning, nutrition targets/macros, cardio, steps, weekly check-ins,
  coaching adjustments, division-specific physique plans, safety systems, wearables.
- UK/EU: British English, GBP pricing, UK food database, EU data residency, no PII to third parties,
  offline-first.

HARD RULES (a violation invalidates the report)
1. EVERY factual claim carries a source URL. No uncited claims.
2. If you cannot find something, write "NOT FOUND". NEVER invent a fact, a quote, a rating, or a source.
   Fabrication is the single worst failure.
3. State honestly, in Section 0, whether you have LIVE web access this session. For each claim, mark
   [BROWSED] (you opened the source now) or [TRAINING] (from prior knowledge, not verified now).
4. Quantitative standings: for every app, give star rating + number of ratings + store (App Store/Play)
   + approximate downloads if shown + the source URL + the date you saw it. If unavailable, "NOT FOUND".
5. Verbatim user quotes ONLY if you actually retrieved them, each with its source URL. Otherwise
   paraphrase and label "(paraphrase)". Never present a paraphrase as a quote. Never attribute a quote to
   Reddit/an app store unless you opened that exact page.
6. UK/EU emphasis: actively seek UK sources (.co.uk publications, UK YouTubers/reviewers, UK app-store
   data). For each area, state whether the sentiment you found is UK-REPRESENTATIVE or US-SKEWED.
7. Where sources disagree, say so and give both with URLs. Flag anything that is itself AI-generated
   content or marketing/vendor copy (lower trust).
8. Be specific and quantitative. Avoid generic "users want a clean UI" filler; give named apps, numbers,
   dated sources, and concrete mechanisms.

OUTPUT FORMAT (use these exact headers so three reports align)
Section 0 — METHOD & ACCESS: live browse yes/no; which engines/sites; date; any blocks you hit.
Then one block per AREA (the 15 below). Each AREA block:
  A) APPS COVERED — a table: App | Rating | #Ratings | Store | ~Downloads | Source URL | [BROWSED]/[TRAINING]
     (aim to cover EVERY serious competitor in that area; if a category has 50+, cover the top ~20-30 by
     relevance and say how many exist).
  B) RESEARCH QUESTIONS — answer each listed question as:
     Q#: ANSWER | SOURCE URL | CONFIDENCE High/Med/Low | [BROWSED]/[TRAINING] | UK-REP or US-SKEWED.
     If unanswerable: "NOT FOUND".
  C) KEY FINDINGS — numbered: [AREACODE-Fn] claim — SOURCE URL — confidence — UK/US.
  D) VERBATIM SENTIMENT — real retrieved quotes with URLs; else "no verbatim retrieved".
  E) TOP 3 COMPLAINTS and TOP 3 PRAISE for the area (each sourced).
Final — MASTER SOURCE LIST (all URLs) + LOW-CONFIDENCE/COULDN'T-VERIFY REGISTER (what you couldn't pin
down and why).

THE 15 AREAS AND THEIR QUESTIONS (area codes in brackets)
1. WORKOUT-SCREEN [WS]: How many taps to log a set in the best apps? Is last-session data shown inline?
   Gesture/quick-log patterns? What do users complain about mid-workout? Rest-timer expectations?
2. PLAN-GENERATION [PG]: How do the best apps generate a training plan? Inputs required? Do users trust
   algorithmic vs AI-LLM vs human plans? Do generated plans have real periodisation/architecture or just
   "looks plausible"? Beginner vs advanced plan differences?
3. AI/ALGORITHMIC COACHING [AC]: Weekly-adjustment loop — who does it (Carbon, MacroFactor, RP)? Do they
   adjust training as well as nutrition? How is the "why" of an adjustment explained (transparency/
   black-box)? Algorithm vs human-coach trust? Pricing? Any ED-safety guardrails (calorie floors,
   refusing unsafe deficits)? Hallucination/trust concerns with LLM coaching?
4. NUTRITION [NU]: Macro flexibility users want (ranges, carb cycling, per-day)? Protein guidance norms?
   UK food-database quality bar (Nutracheck etc.)? kJ vs kcal, UK units?
5. FOOD-LOGGING [FL]: Top reasons users quit logging (cite stats/studies)? Time-per-log thresholds?
   Barcode accuracy/coverage? AI photo/voice logging — adoption and accuracy? Friction reducers?
6. PROGRESS [PR]: What progress views drive motivation/retention? Progress photos + body measurements —
   demand and best implementations? Strength-graph expectations? Recomposition (flat weight) framing?
7. ONBOARDING [ON]: Best-practice first-run flow? Quiz vs minimal-input? Time-to-first-value/activation?
   Drop-off stats (cite)? What makes beginners abandon during setup?
8. EXERCISE-LIBRARY [EL]: Demonstration norms (video/animation, multi-angle)? Library-size benchmark?
   Custom exercises + substitutions expectations? Form-cue/common-mistake content?
9. RETENTION [RE]: What mechanics retain (streaks, streak-freeze, PRs, social)? Churn stats and the #1
   churn trigger (cite)? Notification do's/don'ts (annoying vs helpful, with stats)?
10. NAVIGATION [NA]: Tab-bar/IA best practice (number of tabs)? Feature-overload failures? Any notable
    redesign backlashes (e.g. Fitbit/Google Health)?
11. DESIGN [DE]: Dark-mode/typography/accessibility norms? WCAG touch-target + contrast standards?
    Colour-blind support prevalence? Premium visual cues?
12. MISSING-FEATURES [MF]: Wearable integration expectations (Apple Health/Watch, Google Health Connect)?
    Contest-prep/peak-week/posing tools for competitors? What features do users most often WISH existed?
13. NEWBIE-EXPERIENCE [NE]: What overwhelms beginners in strength/physique apps? Jargon problems
    (volume, deload, RIR, macros)? What makes a beginner feel guided vs lost? Hand-holding that works?
14. CHECK-IN [CK]: Weekly check-in design in coaching apps? What's asked? Length vs completion trade-off?
    Conditional/branching questions? Wellbeing/recovery inputs?
15. SCALING [SC]: How do apps serve beginner→elite on ONE product without alienating either end? Tone/
    register switching? Progressive disclosure? Examples of apps that do (or fail) this dual-audience.

COMPETITORS TO COVER (add any frontier-definer you know that's missing; mark UK ones)
Strong, Hevy, JEFIT, Fitbod, Boostcamp, StrongLifts 5x5, FitNotes, Strava, Nike Training Club,
MacroFactor, Carbon Diet Coach, RP Hypertrophy (Renaissance Periodization), Caliber, JuggernautAI,
Alpha Progression, Dr. Muscle, Freeletics, Zing Coach, Future, Trainerize, Whoop, Apple Fitness+,
Peloton, MyFitnessPal, Cronometer, Fitia, Lifesum, Yazio, Cal AI, SnapCalorie, Shapez,
Nutracheck (UK), NutraSafe (UK), Carbs & Cals (UK), Calorie Counter+ (UK).

EXAMPLE OF A GOOD FINDING ENTRY (match this rigour)
[FL-F1] 73% of people who quit calorie tracking cite "too time-consuming" as the main reason —
https://www.example-realsource.com/study (Intl Food Information Council 2023 survey, opened today) —
confidence High — [BROWSED] — US-SKEWED (US survey sample). Verbatim: "I gave up logging after two weeks,
it took longer than the workout" — https://www.example-realsource.com/review123 [BROWSED].

WHAT NOT TO DO
- Do not pad with generic UX advice. Do not cite an aggregator/round-up as if it were the underlying
  study or review (cite the underlying source, or label it AGGREGATOR). Do not claim a Reddit/app-store
  quote you didn't open. Do not output a rating without a source. If unsure, say NOT FOUND.

END OF PROMPT.
```

## HOW THE THREE REPORTS WILL BE USED (my side)
When you paste the three exports back, I will: (1) cross-tabulate every [AREA-Fn] claim across the three
to find AGREEMENT (≥2 sources independently) vs CONFLICT vs SINGLE-SOURCE; (2) keep each report's source
URLs so claims are traceable; (3) down-weight anything marked [TRAINING] or AGGREGATOR or single-source;
(4) build the Pass-2 findings index + Pass-3 gap analysis from the triangulated, sourced result — with
provenance preserved, not flattened. Reality gets established by 2-of-3 corroboration + a real URL, not
by any single model's say-so (including mine).
```
