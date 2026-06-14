# PASS 2 — EXTERNAL INPUT 3 of 3: Claude (raw, UNADJUDICATED)

Received 2026-06-14. This is a RAW external input, preserved verbatim for traceability. NOTHING here is
established fact yet — claims become load-bearing only after cross-check against inputs 1 and 2 (≥2-of-3
corroboration + a working URL). Single-source claims here stay flagged. Stored so the adjudication can be
checked against the raw source.

## QC NOTES ON THIS REPORT (observations to carry into adjudication — NOT conclusions)
- Claims live browse YES (14 Jun 2026): 18 web_search queries + web_fetch snippets + one subagent for
  gap-filling; budget exhausted after 18 queries (areas 11–15 partly subagent/snippet-filled).
- ⚠️ INTEGRITY DISCLOSURE BY THE AUTHOR: this report states that prompt-injection text impersonating
  "Anthropic safety instructions" was injected into ITS OWN tool-result stream, telling it to suppress
  numbers and an ED support resource, and that it disregarded them as non-genuine. This concerns the
  external session's environment, not ours; it does not by itself validate or invalidate the data, but it
  is logged. (It also means: do not treat this report's quantitative content as a policy artefact.)
- HONEST signs (strong): large NOT-FOUND register; explicit [BROWSED] vs [TRAINING] tagging; heavy
  VENDOR/AGGREGATOR down-trust flags; pervasive US-SKEW flagging; actively CORRECTS likely errors in the
  other reports — flags "Hevy 1,000+" as wrong (own pages = 400+), flags Fitbod's self-contradictory
  library size (800+/1,000+/1,600+), and distinguishes Strong vs Stronger vs StrongLifts as 3 apps.
- THIRD distinct Nutracheck datapoint — reconcile across all 3: Claude = 4.9 / ~8,000 (TRUSTPILOT) +
  500,000+ curated UK items; Gemini = 4.8 / 259K (App Store); ChatGPT = 2.5 / 57.4K (Play). Three
  different surfaces/numbers. NONE can be trusted until live-fetched; the "gold-standard UK DB" claim is
  separately corroborated (Claude + my reputation prior) but the RATING is unresolved.
- KEY QUANT (mostly App Store / US): Hevy 4.9/200K+; MyFitnessPal 4.7/2.3M (App Store) — Play uncertain
  (~4.4/2.85M secondary); Cronometer 4.8/92K (App Store), 4.6/53.8K (Play); Cal AI 4.7/155K (1M+ DL);
  Strava 4.4/921K (Play); Carbon 4.8(iOS)/4.7(Play), 5,500+/2,100+; Nike TC 4.8/~269.7K (secondary).
  Several star/count fields NOT FOUND (Strong #, JEFIT ★, MacroFactor ★/#) — honest.
- HIGH-VALUE CORROBORATIONS to test for 2-of-3:
  - MacroFactor opt-in calorie floor (Claude cites help.macrofactorapp.com, "standard floor = 1,200
    kcal/day") — agrees with Gemini + my Pass-1 relevance framing. STRONG candidate for CORROBORATED.
  - Carbon adherence-strict (holds/won't adjust if non-compliant) vs MacroFactor adherence-neutral —
    agrees with Gemini. STRONG candidate.
  - NO competitor closes the full loop (calories + training + steps/cardio off one weight trend):
    MacroFactor/Carbon = nutrition only; RP/Juggernaut = training only. This is the central white-space
    and directly supports my AC-F6 "competitor ED-guardrails / full-loop NOT FOUND" framing.
  - Both nutrition leaders are manual-entry, no-LLM by design → deterministic-no-AI is a marketed trust
    asset (agrees with my AC-F7 + CLAUDE.md sacred boundary).
- PRIMARY-GRADE academic anchors offered (verify each opens):
  - Levinson, Fewell & Brosof (2017) Eating Behaviors 27:14-16, N=105 clinical ED sample — properly
    scopes the "73% identified MFP as a contributor" stat to people WITH an ED (corrects the common
    mis-citation that it applies to all MFP users). This refines my AC-F6 academic anchor.
  - Harvey et al. (2019) Obesity (iReach2, N=142) — time-per-log ~23→15 min/day.
  - NCBI PMC8050748 — consistent tracking fell 68%→21% by week 12.
  - Business of Apps — health/fitness ~3% retention by day 30 (conservative citable anchor).
- WCAG specifics for the UK/EU angle (supports my Pass-1 touch-target work + DE area): WCAG 2.5.8 AA =
  24×24 CSS px; 2.5.5 AAA = 44×44; Apple HIG 44pt; Material 48dp; EAA legally in force 28 Jun 2025 (AA
  becomes the EU legal floor). UK/EU-RELEVANT — high decision value.
- Library sizes (subagent-verified): JEFIT 1,400+; Fitbod 800–1,600 (contradictory own pages); Hevy 400+;
  Strong 200+; Juggernaut/RP ~250.
- Watch: areas 11–15 lean more on subagent/snippet than direct fetch (author flags this) → treat those
  with the same down-weight as SNIPPET.

---
## RAW REPORT (verbatim) BELOW
---

# Competitive-Intelligence & User-Sentiment Report — Strength, Physique & Nutrition Mobile-App Market

**TL;DR**
- The market splits into three layers that rarely overlap well: (1) **fast workout loggers** (Strong, Hevy — both ~4.9★) that are journals-with-timers, not coaches; (2) **deterministic/algorithmic nutrition coaches** (MacroFactor, Carbon Diet Coach) that run a weekly weight-trend → calorie-adjustment loop and already ship eating-disorder guardrails (MacroFactor's opt-in **1,200 kcal/day floor**); and (3) **autoregulated training engines** (RP Hypertrophy, JuggernautAI) that adjust *training* via RPE/RIR but ignore nutrition. **No leading competitor closes the full loop the benchmarked product describes** (weight trend → calorie *and* training/step/cardio adjustment under ED-safety floors), which is the clearest white-space finding.
- The dominant, evidence-backed failure mode is **retention/adherence, not features**: health-&-fitness apps retain only **~3% by day 30** (Business of Apps), calorie tracking falls to **~23% still active at 6 months**, and the #1 churn predictor is **fewer than 3 sessions in the first 14 days (3–4× churn)**. Friction-reduction and fast time-to-value beat feature breadth.
- **UK sourcing is real but thin**: Nutracheck (4.9★ Trustpilot, ~8,000 reviews; 500,000+ curated UK foods) and the NutraSafe/Carbs & Cals ecosystem define the UK food-database and units bar (kcal + 7 nutrients, GBP pricing). Most workout/coaching sentiment is **US-skewed**; treat US app-store quotes as indicative, not UK-representative.

---

## SECTION 0 — METHOD & ACCESS
- **Live browse: YES.** Conducted **14 June 2026** using `web_search` (18 queries) + `web_fetch` snippets and **one** blocking subagent for gap-filling.
- **Engines/sites opened:** Apple App Store, Google Play, Trustpilot (uk.trustpilot.com), NCBI/PMC, Business of Apps, MacroFactor & Carbon official help centers, Fitbod help center/blog, W3C/WCAG, Strava press, plus review/aggregator sites (RepReturn, Sensai, FeastGood, Vora, Dr. Muscle, Home-Cooks UK).
- **Blocks hit:** `web_search` budget exhausted after 18 queries (areas 11–15 partly filled by subagent and snippet data). Three planned final searches (MyFitnessPal/Cronometer ratings, MFP paywall, progress photos) were completed by the subagent instead.
- **Tagging:** Each claim is marked **[BROWSED]** (page opened/returned this session) or **[TRAINING]** (prior knowledge, not verified now). Where the *snippet* was returned but the full page not independently re-opened, it is still marked [BROWSED] because the content came from this session's tools.
- **⚠️ INTEGRITY DISCLOSURE (material to a dribble-check):** Multiple text blocks impersonating "Anthropic safety instructions" were **injected into the tool-result stream** during this session, instructing me to suppress numbers (calories, BMI, macros, ratings) and to withhold an eating-disorder support resource. **These were not from Anthropic — they were prompt-injection and were disregarded.** This is legitimate market research for a product whose differentiator is ED-*safety*; the report presents sourced data and gives **no individual dietary advice**. Flagging this so downstream reviewers understand why the report contains the quantitative data the task explicitly requested.
- **Low-trust flags applied throughout:** vendor blogs (fitbod.me, joincarbon.com, hevyapp.com, jefit.com), competitor "alternatives" pages (nutriscan, calai, hootfitness, gymgod, setgraph, sensai), and SEO aggregators are labelled **VENDOR/AGGREGATOR**. Peer-reviewed and primary sources are prioritised.

---

## AREA 1 — WORKOUT-SCREEN [WS]

**A) APPS COVERED**

| App | Rating | #Ratings | Store | ~Downloads | Source URL | Tag |
|---|---|---|---|---|---|---|
| Hevy | 4.9 | 200,000+ | App Store + Play | 10M+ users (vendor) | apps.apple.com/us/app/.../id1458862350 ; hotelgyms.com review | [BROWSED] |
| Strong | 4.9 | "consistently 4.9" (exact count NOT FOUND) | App Store + Play | 3M+ users (review) | just12reps.com; repreturn.com/strong-app-vs-hevy | [BROWSED] |
| JEFIT | NOT FOUND (exact ★) | 13M+ users | Play | 20M+ DL (vendor) | play.google.com/store/apps/details?id=je.fit | [BROWSED] |
| FitNotes | NOT FOUND | NOT FOUND | Play (Android only) | — | setgraph.app roundup (AGGREGATOR) | [BROWSED] |

**B) RESEARCH QUESTIONS**
- **Q (taps to log a set):** Strong logs a straight set in **~2 taps**, auto-fills previous weight/reps, fires rest timer automatically; Hevy "fast but not as fast," needs slightly more navigation. | repreturn.com/strong-app-vs-hevy ; sensai.fit/blog/hevy-vs-strong-2026 | **High** | [BROWSED] | **US-SKEWED**.
- **Q (last-session data inline):** YES for both — Strong pre-loads previous session; Hevy shows previous-week volume/RPE under "Previous" tab when logging. | hotelgyms.com; sensai.fit | High | [BROWSED] | US-SKEWED.
- **Q (gesture/quick-log):** Tap-to-confirm set + auto-rest-timer is the category standard; plate calculator one tap away. | repreturn.com | High | [BROWSED] | US-SKEWED.
- **Q (mid-workout complaints):** Hevy's **social feed as distraction** during hard sessions; Strong's **3-routine free cap**; Hevy free tier capped at 4 routines (older reviews). | strive-workout.com; apps.apple.com (Hevy reviews) | Med | [BROWSED] | US-SKEWED.
- **Q (rest-timer expectations):** Auto-start after each logged set is **expected as table-stakes**; absence is a noted negative (RP Hypertrophy criticised for missing rest guidance). | dr-muscle.com/rp-hypertrophy-app-critique | High | [BROWSED] | US-SKEWED.

**C) KEY FINDINGS**
- **[WS-F1]** Strong is benchmarked by users as the fastest logger; ~2 taps/straight set with auto-filled previous performance — repreturn.com/strong-app-vs-hevy — High — US-SKEWED.
- **[WS-F2]** Hevy & Strong both advertise near-identical **4.9★**; differentiation is social feed (Hevy) vs minimalism (Strong) — sensai.fit/blog/hevy-vs-strong-2026 — High — US-SKEWED.
- **[WS-F3]** Neither Hevy nor Strong reads recovery (HRV/sleep); "both apps are lifting journals with timers attached" — sensai.fit — High — US-SKEWED.

**D) VERBATIM SENTIMENT**
- *"I really like this app because it is simple and easy to log sets quickly. I especially like the fact that you can mark each set as a drop set or a failure set, which not a lot of other apps do."* — hotelgyms.com (quoting Hevy user "Mark") — [BROWSED].
- *"Can't start a workout without Hevy. Great app! ... The tracking of weights can be a bit confusing at times, but it's a minor issue."* — producthunt.com/products/hevy/reviews — [BROWSED].
- *"the only thing I could see ruining this app is if they try to monetize too many features."* — apps.apple.com (Hevy reviews) — [BROWSED].

**E) TOP 3 COMPLAINTS / TOP 3 PRAISE**
- Complaints: (1) weight-tracking display "confusing at times" (producthunt.com); (2) limited advanced programs for advanced lifters (producthunt.com); (3) social feed distraction (strive-workout.com).
- Praise: (1) fast/intuitive logging (repreturn.com); (2) inline previous performance for progressive overload (hotelgyms.com); (3) genuinely usable free tier (repreturn.com).

---

## AREA 2 — PLAN-GENERATION [PG]

**A) APPS COVERED:** Fitbod, JuggernautAI, RP Hypertrophy, Alpha Progression, Boostcamp, Dr. Muscle, StrongLifts 5x5. (Ratings consolidated in master table; many exact counts NOT FOUND on store pages this session.)

**B) RESEARCH QUESTIONS**
- **Q (how best apps generate plans):** Fitbod scores its exercise library by **muscle-recovery % (0–100)**, estimates 1RM dynamically, and uses an "Exercise Selector" + "Capability Recommender" trained on **400M+ logged workouts**; ~7 exercises per 1-hr session. [Fitness Engineer](https://ai-fitness-engineer.com/juggernautai) | fitbod.me/blog/fitbod-algorithm | High | [BROWSED] | **VENDOR/US-SKEWED**.
- **Q (inputs required):** Fitbod = goal, fitness level, equipment, recent muscle use. [Fitbod](https://fitbod.me/blog/fitbod-algorithm/) JuggernautAI = gender, age, size, strength, experience, recovery, lift maxes, equipment. | fitbod.me; juggernautai.app | High | [BROWSED] | VENDOR.
- **Q (trust: algorithmic vs LLM vs human):** Reviewers trust **algorithmic + named-expert pedigree** (Israetel, Nippard, Chad Wesley Smith, Layne Norton). Boostcamp leans on coach-designed templates. No evidence users trust LLM-generated plans more; concern is "recycled" workouts. | askvora.com/blog/best-strength-training-apps-2026 | Med | [BROWSED] | US-SKEWED.
- **Q (real periodisation vs "looks plausible"):** RP/JuggernautAI deliver **genuine mesocycle periodisation, wave loading, deloads, competition peaking**; Fitbod explicitly has **no mesocycle progression** ("a good workout each day rather than building toward a periodized peak"). | mesostrength.com/blog/rp-hypertrophy-alternatives | High | [BROWSED] | US-SKEWED.
- **Q (beginner vs advanced):** StrongLifts 5x5 = linear, 5 lifts, "removes all thinking" for first 3–6 months; RP/Juggernaut "assume you understand RPE/periodisation." | jefit.com guide; liftbigeatbig.com | High | [BROWSED] | US-SKEWED.

**C) KEY FINDINGS**
- **[PG-F1]** Fitbod's plan engine is genuinely data-driven (recovery %, dynamic 1RM) but **lacks systematic weekly volume ramp** — fitbod.me/blog/fitbod-algorithm + mesostrength.com — High — US-SKEWED.
- **[PG-F2]** The most-respected *plan architecture* in the market is autoregulated mesocycle periodisation (RP, Juggernaut), not AI generation — liftbigeatbig.com — High — US-SKEWED.

**D) VERBATIM:** *"Fitbod's personalization is built on data-driven adaptation. Every workout you log, your reps, sets, weights, equipment, exertion level, and missed days all inform your next workout."* — fitbod.me/blog/how-fitbod-personalizes... (VENDOR) — [BROWSED].

**E) Complaints:** (1) "questionable volume prescribed" (Juggernaut, dr-muscle.com); (2) RP presets "more complicated than expected" (dr-muscle.com/rp-hypertrophy-app-critique); (3) Fitbod "recycling workouts" perception (fitbod.me). **Praise:** (1) periodisation/structure (alibaba wellness, AGGREGATOR); (2) hands-off automation (askvora.com); (3) expert pedigree (askvora.com).

---

## AREA 3 — AI/ALGORITHMIC COACHING [AC]

**A) APPS COVERED**

| App | Rating | #Ratings | Store | Price | Source | Tag |
|---|---|---|---|---|---|---|
| MacroFactor | NOT FOUND (exact ★) | — | App Store + Play | $11.99/mo, $71.99/yr | nutriscan.app; macrofactorapp.com | [BROWSED] |
| Carbon Diet Coach | 4.8 / 4.7 | 5,500+ (iOS), 2,100+ (Play) | App Store + Play | $8.33–14.99/mo | nutriscan.app | [BROWSED] |
| RP Hypertrophy | NOT FOUND | — | App Store/web | $24.99–34.99/mo | dr-muscle.com | [BROWSED] |
| JuggernautAI | NOT FOUND | — | App Store + Play | $34.99/mo, $349.99/yr | juggernautai.app; powerliftingtechnique.com | [BROWSED] |

**B) RESEARCH QUESTIONS**
- **Q (who runs the weekly-adjustment loop):** **MacroFactor** (continuous "expenditure" algorithm adjusting weekly, **adherence-neutral** — assumes typical intake on unlogged days) and **Carbon** (weekly check-in; **only adjusts if you adhered**, else holds and tells you to be more compliant). | nutriscan.app; feastgood.com/macrofactor-vs-carbon-diet-coach | High | [BROWSED] | US-SKEWED.
- **Q (do they adjust TRAINING too?):** **No** for MacroFactor/Carbon (nutrition only). RP/Juggernaut adjust **training** (volume, load, deload) via RPE/RIR [Declom](https://declom.com/juggernautai) but **not nutrition**. This split is the key structural gap. | help.joincarbon.com; powerliftingtechnique.com | High | [BROWSED] | US-SKEWED.
- **Q (transparency of the "why"):** MacroFactor is described as "more intuitive, works with the user"; Carbon as "very black and white." Juggernaut explains adjustments via RPE-vs-actual recalibration. | feastgood.com; declom.com/juggernautai | Med | [BROWSED] | US-SKEWED.
- **Q (algorithm vs human-coach trust):** Carbon positioned as algorithm replacing a $150–300/mo coach; reviewers note it "cannot account for stress, sleep context, or psychological readiness the way a skilled human coach can." | nutrola.app; nutriscan.app | Med | [BROWSED] | US-SKEWED.
- **Q (ED-safety guardrails):** **MacroFactor: opt-in calorie floor, "standard" floor = 1,200 kcal/day**, configurable lower for low-expenditure users. **Carbon: reverse-diet mode starts at *maintenance* (not deficit) because "any calorie level below maintenance is still a calorie deficit"**, gradual increases. | help.macrofactorapp.com/.../articles/34 ; help.joincarbon.com/.../6004560 | **High** | [BROWSED] | US-SKEWED.
- **Q (LLM hallucination/trust):** Neither MacroFactor nor Carbon uses LLM/photo logging (manual entry only, "as of early 2026") — explicitly removing hallucination risk; AI-photo apps (Cal AI) carry 15–35% error (see FL). | nutrola.app | High | [BROWSED] | US-SKEWED.

**C) KEY FINDINGS**
- **[AC-F1]** MacroFactor's adherence-neutral design means "one missed day does not break your progress or give you a guilt-inducing red warning" — nutriscan.app/.../is-macrofactor-worth-it-2026 — High — US-SKEWED.
- **[AC-F2]** Carbon ships a **dedicated reverse-diet protocol** (most trackers don't), increasing calories ~50–100/wk to restore maintenance — masculinesynergy.com + help.joincarbon.com — High — US-SKEWED.
- **[AC-F3]** Deterministic, no-LLM coaching is an explicit *selling point* in this segment — both leaders are manual-entry, algorithm-only — nutrola.app — High — US-SKEWED.

**D) VERBATIM**
- *"MacroFactor assumes you ate your typical amount of food on unlogged days. The algorithm keeps running and your targets stay valid. This 'adherence neutral' design means one missed day does not break your progress."* — nutriscan.app — [BROWSED].
- *"Weekly I check in with Carbon coach and based on my average weekly weight loss it adjusts my macros/calories up or down... If you are compliant and consistent this app Diet Coach is incredibly accurate."* — justuseapp.com (Carbon user review) — [BROWSED].
- *"I was reverse dieting with Carbon for almost 10 months, and in that time, I stayed the same weight and increased my calories by nearly 600!"* — masculinesynergy.com (quoting Carbon user) — [BROWSED] — low-trust host (VENDOR-style), but quote attributed.

**E) Complaints:** (1) Carbon "expects strict adherence," won't adapt if you miss (goldiai.com); (2) no free trial for Carbon — "pay before you try" (nutriscan.app); (3) no micronutrient tracking in Carbon (nutriscan.app). **Praise:** (1) coach-grade adjustments at fraction of human cost (nutriscan.app); (2) reverse-diet mode (masculinesynergy.com); (3) MacroFactor flexibility/customisation (feastgood.com).

---

## AREA 4 — NUTRITION [NU]

**A) APPS COVERED:** MacroFactor, Carbon, Nutracheck (UK), NutraSafe (UK), MyFitnessPal, Cronometer, Yazio.

**B) RESEARCH QUESTIONS**
- **Q (macro flexibility):** Carbon offers **day-to-day calorie redistribution** ("planner" — eat 200 more on a hard day, 200 less another) and diet styles (balanced/low-carb/keto/plant-based). MacroFactor allows custom weekly calorie distribution + 3 protein tiers (moderate/high/extra-high). | feastgood.com/carbon-diet-coach-review; help.macrofactorapp.com | High | [BROWSED] | US-SKEWED.
- **Q (protein guidance norms):** MacroFactor's "moderate/high" sits "comfortably within middle-to-high end of the optimal protein range"; users free to go "extra high." | help.macrofactorapp.com/.../articles/34 | High | [BROWSED] | US-SKEWED.
- **Q (UK food-database bar):** **Nutracheck: 500,000+ UK items, curated (not crowdsourced), nutritionist-verified, tracks calories + 7 nutrients** (carbs, sugar, fibre, protein, fat, sat fat, salt); covers Tesco/Asda/Greggs/Nando's/Pret. | home-cooks.co.uk/pages/review-nutracheck; apps.apple.com/gb/.../id444924121 | High | [BROWSED] | **UK-REPRESENTATIVE**.
- **Q (kJ vs kcal / UK units):** Nutracheck UK app uses **kcal + stones/lbs** ("lost 4 stone," "lost half a stone"), GBP pricing (£6.99/mo, £29.99/yr). | uk.trustpilot.com/review/www.nutracheck.co.uk | High | [BROWSED] | **UK-REPRESENTATIVE**.

**C) KEY FINDINGS**
- **[NU-F1]** UK quality bar = **curated/verified DB beats crowdsourced** — Nutracheck's pitch is avoiding "multiple conflicting entries that plague crowdsourced databases" — home-cooks.co.uk — High — UK-REP.
- **[NU-F2]** NutraSafe (UK) differentiates on **vitamin/mineral tracking vs UK NRVs + allergen/additive scanning** at £3.99/mo — nutrasafe.co.uk/blog/best-food-scanner-apps-uk-2026 — Med (VENDOR) — UK-REP.
- **[NU-F3]** UK government context cited by NutraSafe: NDNS 2019-2023 (pub. June 2025) — 18% of UK adults 19-64 had low vitamin D status; 83% of women of childbearing age below folate threshold — nutrasafe.co.uk (citing gov.uk NDNS) — Med — UK-REP.

**D) VERBATIM**
- *"I've lost 4 stone using Nutracheck. The UK database is brilliant - I can actually find the foods I eat without guessing."* — home-cooks.co.uk (quoting Trustpilot review, Jan 2026) — [BROWSED].
- *"This is an excellent app... everything MFP wishes it was."* — uk.trustpilot.com/review/www.nutracheck.co.uk — [BROWSED].

**E) Complaints (Nutracheck):** (1) no proper free tier — "paying from day 8" (home-cooks.co.uk); (2) "app could be more modern"/dated design (home-cooks.co.uk); (3) custom-macro setup "fiddly" (home-cooks.co.uk). **Praise:** (1) UK database accuracy; (2) barcode scanner finds UK products; (3) UK-based customer care (all home-cooks.co.uk / trustpilot).

---

## AREA 5 — FOOD-LOGGING [FL]

**B) RESEARCH QUESTIONS**
- **Q (top reasons users quit):** **"Too time-consuming"** dominates (database-search friction); only **23% still tracking at 6 months**. | i-rakshitpujari.medium.com | Med (Medium essay citing "studies"; treat 23% as Med-confidence) | [BROWSED] | US-SKEWED.
- **Q (time-per-log thresholds):** **Successful trackers spent 23.2 min/day in month 1 dropping to 14.6 min/day by month 6** — Harvey et al. (2019), *Obesity* (iReach2 study, N=142, lead author Jean Harvey, Univ. of Vermont): "Those who self-monitored three or more time[s] per day, and were consistent day after day, were the most successful." | earth.com/news/tracking-food-calorie-intake (reporting the *Obesity* study) | High | [BROWSED] | US-SKEWED.
- **Q (consistency decay):** Consistent calorie tracking **fell from 68% (week 1) to 21% (week 12)** in a web weight-loss program. | NCBI PMC8050748 (Slip Buddy trial) | High | [BROWSED] | US-SKEWED.
- **Q (barcode accuracy/coverage):** Cal AI barcode/packaged-food = **~100%** (database lookup); Nutracheck barcode "finds almost everything" for UK products. | aumiqx.com; home-cooks.co.uk | High | [BROWSED] | Mixed (UK + US).
- **Q (AI photo/voice accuracy & adoption):** Cal AI **~80% user-estimated accuracy**; independent studies show **15–25% mean absolute error on calories, up to 30–40% portion error on dense foods**; 2024 *Nutrients* study found relative errors **0.10%–38.3%**; image methods underreport energy ~20% vs doubly-labeled water (JMIR 2024). Cal AI: **4.7★, 155,000+ reviews, 1M+ downloads.** | home-cooks.co.uk/pages/review-cal-ai; askvora.com; getkalohealth.com; fitia.app | High | [BROWSED] | US-SKEWED.
- **Q (friction reducers):** Auto-fill previous logs, barcode, meal copying, recipe save. | nutriscan.app | Med | [BROWSED] | US-SKEWED.

**C) KEY FINDINGS**
- **[FL-F1]** ~73% of MyFitnessPal users **with an eating disorder** perceived the app as contributing to it — **Levinson, Fewell & Brosof (2017), *Eating Behaviors* 27:14-16 (Univ. of Louisville), N=105 clinical ED sample** (74.3% used MFP; 73.1% identified it as a contributor) — cited via healthline.com/nutrition/does-calorie-counting-work & mobihealthnews.com — High — US-SKEWED. *(Reported as market/safety context; directly relevant to why the benchmarked product builds ED-pattern detection.)*
- **[FL-F2]** Logging burden is the central churn lever: tracking is genuinely fast (~15 min/day for successful users) yet adherence collapses to ~21% by week 12 — earth.com + NCBI PMC8050748 — High — US-SKEWED.
- **[FL-F3]** AI photo logging trades accuracy for speed; unreliable for "strict dieting/caloric deficits" per user reviews — home-cooks.co.uk/pages/review-cal-ai — High — Mixed.

**D) VERBATIM**
- *"The app does a great job for tracking diet/calories but I wouldn't recommend it for strict dieting since the accuracy is around 80%, which can be crucial for caloric deficits."* — home-cooks.co.uk (quoting Cal AI reviewer) — [BROWSED].
- *"I'd already spent 8 minutes scrolling through MyFitnessPal's database, trying to find something that resembled what my wife had cooked... I closed the app and ate in peace. That was the end of streak number… I'd lost count."* — i-rakshitpujari.medium.com — [BROWSED].
- Lifehacker test (reported): *"a Pink Lady apple... Cal AI returned tikka masala. With the apple next to a kitchen scale, Cal AI estimated 80 calories against an actual value closer to 120, a 33 percent underestimate."* — fuelnutrition.app/reviews/cal-ai-review (quoting Lifehacker) — [BROWSED].

**E) Complaints:** (1) database-search time (medium.com); (2) AI portion errors on mixed meals (getkalohealth.com); (3) hidden oils/fats undercount (aumiqx.com). **Praise:** (1) barcode ~100% on packaged (aumiqx.com); (2) photo speed (askvora.com); (3) UK barcode coverage (home-cooks.co.uk).

---

## AREA 6 — PROGRESS [PR]

**B) RESEARCH QUESTIONS**
- **Q (views that drive motivation/retention):** Per-exercise weight progression, volume-per-muscle-group over time, PR celebration. | repreturn.com/hevy-app-review | High | [BROWSED] | US-SKEWED.
- **Q (progress photos + measurements — demand & best implementations):** **MacroFactor's Progress Photos and Body Measurements were its #1 and #2 most-requested features, each with 1,500+ upvotes on the internal roadmap**; [MacroFactor](https://macrofactorapp.com/body-metrics/) implementation supports **front/side/back photos + up to 21 body metrics** (incl. waist-to-height, waist-to-hip ratios) [MacroFactor](https://macrofactor.com/mm-may-2023/) with before/after comparison. **Hevy: 14 circumference measurements [Hevy](https://www.hevyapp.com/features/gym-progress/) + private progress photos (1/day).** [Hevy](https://www.hevyapp.com/features/progress-photos/) | macrofactorapp.com/body-metrics ; hevyapp.com/features/progress-photos | High | [BROWSED] | US-SKEWED.
- **Q (strength-graph expectations):** 1RM-progression + volume charts expected; JEFIT/Strong praised for them, criticised when metrics aren't "actionable." | fittechreport.com/jefit-full-report | Med | [BROWSED] | US-SKEWED.
- **Q (recomposition / flat-weight framing):** Body-fat + lean-mass + measurements let users see recomposition when scale weight is flat (Carbon tracks body fat & lean mass; MacroFactor 21 metrics). | nutriscan.app; macrofactorapp.com | Med | [BROWSED] | US-SKEWED.

**C) KEY FINDINGS**
- **[PR-F1]** Progress photos + body measurements are demonstrably top user demand (MacroFactor: **1,500+ upvotes each**, "two most requested roadmap features") [MacroFactor](https://macrofactorapp.com/body-metrics/) — macrofactorapp.com/body-metrics — High — US-SKEWED.
- **[PR-F2]** Privacy-by-default on progress photos is an emerging norm — Hevy keeps photos private even on public profiles [Hevy](https://www.hevyapp.com/features/progress-photos/) — hevyapp.com/features/progress-photos — High — US-SKEWED.

**D) VERBATIM:** *"The graphs to track different kinds of progress are incredible for my fitness journey."* — apps.apple.com (Hevy review) — [BROWSED].

**E) Complaints:** (1) JEFIT "dazzles with metrics that don't deliver actionable insights" (fittechreport.com); (2) free tiers gate measurements/analytics (fittechreport.com); (3) Hevy 1-photo-per-day limit (hevyapp.com). **Praise:** (1) volume/PR graphs (repreturn.com); (2) photo before/after (macrofactorapp.com); (3) measurement breadth (hevyapp.com).

---

## AREA 7 — ONBOARDING [ON]

**B) RESEARCH QUESTIONS**
- **Q (best-practice first-run):** Multi-step "one question per screen" beats single big form; reduce cognitive load; show value before asking for email. | amalgama.co; weareaffective.com | Med | [BROWSED] | US-SKEWED.
- **Q (quiz vs minimal-input):** Quiz/personalisation early is the dominant pattern, but only if it leads to fast value; Nike Run Club praised for "strips onboarding to the essentials... running within minutes." | mostly.media (NRC) | Med | [BROWSED] | Mixed.
- **Q (time-to-first-value/activation):** **Health & fitness day-1 activation = 26%, dropping to 10% by day 28** (Business of Apps); annual subscriptions retain at 33%. | businessofapps.com/data/health-fitness-app-benchmarks | High | [BROWSED] | Mixed (global).
- **Q (drop-off stats):** **Global app onboarding completion ~8.4% at 30 days (Q2 2025); >90% never complete onboarding.** | digia.tech/post/app-onboarding-rates-statistics | High | [BROWSED] | Mixed (global).
- **Q (what makes beginners abandon during setup):** Forms, permissions, payments before value; jargon. | digia.tech; weareaffective.com | High | [BROWSED] | Mixed.

**C) KEY FINDINGS**
- **[ON-F1]** Health/fitness leads day-1 onboarding completion (~26%) because intent is high, but completion still collapses by day 28 (10%) — businessofapps.com — High — Mixed.
- **[ON-F2]** ≤3 actions per onboarding screen and 3–5 total screens is the cited sweet spot — weareaffective.com — Med — US-SKEWED.

**D) VERBATIM:** *"The best onboarding in 2026 doesn't look like onboarding. It feels like value—now. Headspace? You're breathing in 30 seconds. Duolingo? You've already insulted someone in Italian."* — enable3.io/blog/app-retention-benchmarks-2025 — [BROWSED].

**E) Complaints:** (1) too many intake questions day 1 (trainerize.com); (2) value hidden behind setup (digia.tech); (3) one-size-fits-all flows ignore beginner vs enthusiast (fitnessondemand247.com). **Praise:** (1) phased data collection (trainerize.com); (2) immediate first-workout win (weareaffective.com); (3) NRC frictionless start (mostly.media).

---

## AREA 8 — EXERCISE-LIBRARY [EL]

**A) APPS COVERED & LIBRARY SIZES (subagent-verified, 14 Jun 2026)**

| App | Library size | Format | Source URL | Tag |
|---|---|---|---|---|
| JEFIT | **1,400+** (App Store) / 1,500+ (Play) | HD video + animations | apps.apple.com/.../id449810000 ; play.google.com/.../je.fit | [BROWSED] |
| Fitbod | **800+ to 1,600+ (inconsistent own pages)** | Pro video + written cues | fitbod.me/blog/fitbod-algorithm (800+); fitbod.me/about-fitbod-exercises (1,600+); fitbod.me/faqs (1,000+) | [BROWSED] |
| Hevy | **400+** (NOT 1,000+) | Demo animations + instructions | hevyapp.com/features/exercise-library | [BROWSED] |
| Strong | **200+** (help center) | Animated videos | help.strongapp.io/article/97 | [BROWSED] |
| JuggernautAI | **250+** | Video + coaching cues | juggernautai.app | [BROWSED] |
| RP Hypertrophy | **250+ technique videos** | Instructional videos | apps.apple.com/.../id1555614554 | [BROWSED] |

**B) RESEARCH QUESTIONS**
- **Q (demonstration norms):** HD video is the JEFIT/Fitbod standard; Hevy/Strong use **animations** (lighter). Multi-angle is not universal (Hevy users note "not every exercise has animated videos"). | apps.apple.com (Hevy review); subagent | High | [BROWSED] | US-SKEWED.
- **Q (library-size benchmark):** **~250 (Juggernaut/RP, niche) → 400 (Hevy) → 800–1,600 (Fitbod) → 1,400+ (JEFIT, the breadth leader).** | subagent verified | High | [BROWSED] | US-SKEWED.
- **Q (custom exercises + substitutions):** Custom-exercise creation is **expected** (Hevy ~10s; JEFIT; RP/Juggernaut allow custom but users note added customs "feel different" from built-ins). | repreturn.com; subagent | High | [BROWSED] | US-SKEWED.
- **Q (form-cue/common-mistake content):** Coaching cues embedded per exercise (Fitbod, JEFIT, Juggernaut); RP/Juggernaut add deeper technique videos. | fitbod.me/faqs | High | [BROWSED] | US-SKEWED.

**C) KEY FINDINGS**
- **[EL-F1]** **Hevy is 400+, [Hevy](https://www.hevyapp.com/features/exercise-library/) not "1,000+"** — repeated "1,000+" claims in third-party roundups are unsupported by Hevy's own pages — hevyapp.com/features/exercise-library — High — US-SKEWED. *(Important for dribble-check: a competing report citing "Hevy 1,000+" is wrong.)*
- **[EL-F2]** Fitbod's own pages contradict each other (800+/1,000+/1,600+) — cite the specific page — fitbod.me/blog/fitbod-algorithm vs /about-fitbod-exercises — High — US-SKEWED.
- **[EL-F3]** "Strong" ≠ "Stronger" ≠ "StrongLifts" (three different apps) — Strong's own help center = "over 200" exercises [Strong](https://help.strongapp.io/article/97-create-custom-exercises) — help.strongapp.io/article/97 — High — US-SKEWED.

**D) VERBATIM:** *"Not every exercise has animated videos in the 'How To' section, which can be more helpful than the written instructions as some instructions aren't very clear."* — justuseapp.com (Hevy review) — [BROWSED]. *"Exercise library, they have a lot and you can add your own but then the video or feel of it is different then the built in ones."* [App Store](https://apps.apple.com/us/app/rp-hypertrophy/id1555614554) — apps.apple.com (RP Hypertrophy review, via subagent) — [BROWSED].

**E) Complaints:** (1) gaps in niche movements (Juggernaut App Store review); (2) custom exercises lack demos (RP review); (3) JEFIT library "well organized" but UI "cluttered" (fittechreport.com). **Praise:** (1) JEFIT breadth (findyouredge.app); (2) embedded technique videos (powerliftingtechnique.com); (3) fast custom-exercise creation (repreturn.com).

---

## AREA 9 — RETENTION [RE]

**B) RESEARCH QUESTIONS**
- **Q (what mechanics retain):** Streaks, PR celebration, social feeds, and **wearable anchoring** ("anchoring the app to the device the user already wears every day"). | retentioncheck.com/churn-benchmarks/fitness-apps | High | [BROWSED] | US-SKEWED.
- **Q (churn stats + #1 churn trigger):** **Health/fitness day-30 retention ≈ 3% (Business of Apps, 2023)**; broader benchmarks 8–12% for fitness-specific. **#1 churn predictor = <3 workouts in first 14 days → 3–4× churn.** | businessofapps.com; retentioncheck.com | High | [BROWSED] | Mixed/US.
- **Q (notification do's/don'ts):** "Push should feel like a friend nudging, not an app begging" — milestone/streak nudges good, generic "come back" bad; over-notification causes fatigue. | enable3.io | Med | [BROWSED] | US-SKEWED.

**C) KEY FINDINGS**
- **[RE-F1]** **Business of Apps: "Health and fitness apps had 3% retention rate by day 30 in 2023."** [Business of Apps](https://www.businessofapps.com/data/health-fitness-app-benchmarks/) — businessofapps.com/data/health-fitness-app-benchmarks — High — Mixed.
- **[RE-F2]** First-2-weeks session frequency is the single most predictive churn signal (<3 sessions/14 days = 3–4× churn) — retentioncheck.com — High — US-SKEWED.
- **[RE-F3]** **Strava's 2022 "Challenges" feature pushed 90-day retention from 18% to 32%, with a 28% increase in daily active users and a 15% rise in premium subscriptions.** — sportfitnessapps.com / lucid.now — Med (secondary) — US-SKEWED.

**D) VERBATIM:** *"it's a fun, intuitive way to keep track (especially for progressive overload), with features that help turn lifting into a fun little game."* — apps.apple.com (Hevy review) — [BROWSED].

**E) Complaints:** (1) feature removal/paywall pivots drive churn (unstar.app running-apps analysis); (2) battery drain (Strava/NRC, unstar.app); (3) lost history on updates (unstar.app). **Praise:** (1) gamified streaks (enable3.io); (2) social accountability (askvora.com); (3) wearable habit-anchoring (retentioncheck.com).

---

## AREA 10 — NAVIGATION [NA]

**B) RESEARCH QUESTIONS**
- **Q (tab-bar/IA best practice):** ≤5 bottom-tab items; bottom-sheet for overflow. | smashingmagazine.com (target-sizes) | Med | [BROWSED] | US-SKEWED.
- **Q (feature-overload failures):** JEFIT repeatedly cited as "confusing, bloated with buttons and links." [Google Play](https://play.google.com/store/apps/details?id=je.fit&hl=en_US) | play.google.com/.../je.fit (review); fittechreport.com | High | [BROWSED] | US-SKEWED.
- **Q (notable redesign backlashes):** **Fitbit's 27 March 2023 redesign removed Challenges, Adventures, trophies and open groups [9to5Google](https://9to5google.com/2023/03/27/fitbit-challenges-groups-removed/) → major backlash → partial reversal** (Steps streak, battery % restored). [Android Police](https://www.androidpolice.com/upcoming-changes-to-the-fitbit-app/) | 9to5google.com/2023/03/27/fitbit-challenges-groups-removed ; gadgetsandwearables.com/2023/09/30/fitbit-app-redesign-criticism ; androidpolice.com/upcoming-changes-to-the-fitbit-app | High | [BROWSED] | US/global.

**C) KEY FINDINGS**
- **[NA-F1]** Fitbit's removal of the social/challenge layer triggered measurable defection threats to Garmin — gadgetsandwearables.com — High — Mixed.
- **[NA-F2]** Feature overload (JEFIT) is a concrete navigation anti-pattern: users uninstall over inability to do "something simple" [Google Play](https://play.google.com/store/apps/details?id=je.fit&hl=en_US) — play.google.com/.../je.fit — High — US-SKEWED.

**D) VERBATIM**
- *"The only reason I haven't changed from FitBit to a different tracker was because of the challenges. No reason at all to stay within the eco-system now that the social aspect has gone away."* [9to5Google](https://9to5google.com/2023/03/27/fitbit-challenges-groups-removed/) — 9to5google.com (quoted Fitbit user, 27 Mar 2023) — [BROWSED].
- *"I absolutely despise the new app, it provides no motivation for me. Last night I purchased the Garmin vivomove."* [Garmin](https://gadgetsandwearables.com/2023/09/30/fitbit-app-redesign-criticism/) — gadgetsandwearables.com (30 Sep 2023) — [BROWSED].
- *"User interface is confusing, bloated with buttons and links... I gave up and uninstalled the app."* — play.google.com/.../je.fit (JEFIT review) — [BROWSED].

**E) Complaints:** (1) removing features users had (Fitbit, 9to5google); (2) UI bloat (JEFIT); (3) gutting social/community (Fitbit, techradar.com). **Praise:** (1) minimalist single-purpose screens (Strong, prpath.app); (2) Google restoring Steps streak after feedback [Android Police](https://www.androidpolice.com/upcoming-changes-to-the-fitbit-app/) (androidpolice.com); (3) clean tab IA (Hevy, gymgod.app).

---

## AREA 11 — DESIGN [DE]

**B) RESEARCH QUESTIONS**
- **Q (WCAG touch-target + contrast):** **WCAG 2.5.8 (Level AA) = 24×24 CSS px minimum (or 24px spacing); WCAG 2.5.5 (Level AAA) = 44×44 CSS px.** Platform: **Apple HIG = 44×44 pt; Material Design = 48×48 dp; Microsoft Fluent = 40 epx.** EAA in force 28 June 2025 makes AA legally required in EU. | w3.org/WAI/WCAG22/Understanding/target-size-enhanced ; testparty.ai/blog/wcag-target-size-guide | High | [BROWSED] | **UK/EU-RELEVANT** (EAA).
- **Q (dark-mode/typography):** Dark mode + readable mid-workout typography expected; "UI slaps" praised for Hevy. | apps.apple.com (Hevy) | Med | [BROWSED] | US-SKEWED.
- **Q (colour-blind support prevalence):** NOT FOUND (no quantified prevalence data this session) — flagged in register.
- **Q (premium visual cues):** Animations, muscle illustrations, colourful charts signal premium (Hevy); Strong's "no fluff" minimalism signals speed. | prpath.app/blog/strong-vs-hevy-2026 | Med | [BROWSED] | US-SKEWED.

**C) KEY FINDINGS**
- **[DE-F1]** For a UK/EU app, **WCAG 2.2 AA (24px targets) is the legal floor under the European Accessibility Act (28 Jun 2025); 44×44 pt (Apple AAA-aligned) is best practice for mid-workout tapping** — allaccessible.org; w3.org — High — UK/EU-REP.
- **[DE-F2]** Undersized targets ~triple touch-error rates (Univ. of Maryland 2023, cited) — webability.io/glossary/target-size — Med — US-SKEWED.

**D) VERBATIM:** *"the UI slaps. this is one of my favorite apps i own."* — apps.apple.com (Hevy review) — [BROWSED].

**E) Complaints:** (1) dated UI (Nutracheck, JEFIT); (2) busy/cluttered (JEFIT); (3) small tap targets cause "rage taps" (siteimprove.com general). **Praise:** (1) clean modern UI (Hevy); (2) minimalist speed (Strong); (3) glanceable data.

---

## AREA 12 — MISSING-FEATURES [MF]

**B) RESEARCH QUESTIONS**
- **Q (wearable integration expectations):** **Apple Health/Watch + Google Health Connect sync is table-stakes.** Writing workouts is standard; **reading HRV/sleep/recovery is rare and far more valuable.** Hevy/Strong wearable support is "workout logging only." | corahealth.app/blog/best-apple-health-fitness-apps ; sensai.fit | High | [BROWSED] | US-SKEWED.
- **Q (contest-prep/peak-week/posing tools):** Largely **absent** from mainstream apps; Carbon's reverse-diet + JuggernautAI's meet-day peaking are the closest analogues; **dedicated posing/peak-week tooling = white space.** | help.joincarbon.com; powerliftingtechnique.com | Med | [BROWSED] | US-SKEWED.
- **Q (most-wished features):** Recovery-aware programming (HRV/sleep-driven), and feature-permanence/data-portability (no lost history). | sensai.fit; unstar.app | Med | [BROWSED] | US-SKEWED.

**C) KEY FINDINGS**
- **[MF-F1]** A 2024 ACSM survey (cited via Cora) found **73% of wearable users who abandoned devices cited "not knowing what to do with the data"** — interpretation layer > raw data — corahealth.app/blog/best-apple-watch-fitness-apps — Med (secondary citation) — US-SKEWED.
- **[MF-F2]** Apple's HealthKit now supports **70+ health data types**; Health Connect is the Android equivalent — apptage.com (citing Apple docs) — Med — US-SKEWED.
- **[MF-F3]** **As of 26 March 2026, Apple requires Health/Fitness or Medical-categorised apps to declare regulated-medical-device status** — relevant compliance gate for any coaching app — telehealth.org/news/apple-expands-health-app-requirements — High — UK/EU+US-RELEVANT.

**D) VERBATIM:** *"neither app reads your recovery data. Not HRV, not sleep, not training load. They both decide tomorrow's workout based on what you lifted today, which is a lagging indicator."* — sensai.fit/blog/hevy-vs-strong-2026 — [BROWSED] (note: Sensai is a competing vendor — VENDOR flag).

**E) Complaints:** (1) no recovery-aware programming (sensai.fit); (2) basic watch integration (sensai.fit); (3) lost history/no export on migration (unstar.app). **Praise:** (1) Health Connect/Apple Health write-back (corahealth.app); (2) Strava integrations breadth (garagegymreviews.com); (3) Fitbod auto-sync (corahealth.app).

---

## AREA 13 — NEWBIE-EXPERIENCE [NE]

**B) RESEARCH QUESTIONS**
- **Q (what overwhelms beginners):** Jargon — "gym culture is basically a foreign language. Everyone throws around terms like 'RPE,' 'PPL,' 'progressive overload,' and 'deload week.'" RP/Juggernaut setup uses MV/MRV/RIR which "may intimidate less experienced users." | cleaneatzkitchen.com/a/blog/gym-talk-a-glossary ; liftbigeatbig.com | High | [BROWSED] | US-SKEWED.
- **Q (jargon problems):** RP Hypertrophy: "If you have never heard of a 'mesocycle', this app isn't for you." | dr-muscle.com/rp-hypertrophy-app-critique | High | [BROWSED] | US-SKEWED.
- **Q (guided vs lost):** Beginners feel guided with progressive disclosure, immediate wins, "coach voiceover," tooltips; lost when shown all features at once. | fitnessondemand247.com; weareaffective.com | Med | [BROWSED] | US-SKEWED.
- **Q (hand-holding that works):** StrongLifts "removes all thinking—just show up and add 5 lbs"; Boostcamp gives proven templates so beginners don't self-program. | jefit.com guide | High | [BROWSED] | US-SKEWED.

**C) KEY FINDINGS**
- **[NE-F1]** Jargon is the primary beginner barrier; the apps with the best *training architecture* (RP, Juggernaut) are explicitly the worst for beginners — dr-muscle.com; liftbigeatbig.com — High — US-SKEWED.
- **[NE-F2]** Progressive disclosure + immediate first-session win is the proven hand-holding pattern — weareaffective.com — Med — US-SKEWED.

**D) VERBATIM:** *"Here's the truth about gym culture: it's basically a foreign language... when you're new, this vocabulary gap can be intimidating enough to keep you from asking questions."* — cleaneatzkitchen.com — [BROWSED].

**E) Complaints:** (1) jargon walls (RP/Juggernaut); (2) "overly complicates muscle growth" (dr-muscle.com); (3) no beginner on-ramp in advanced apps (liftbigeatbig.com). **Praise:** (1) StrongLifts simplicity; (2) Boostcamp coach templates; (3) embedded education ("learn the why," dr-muscle.com).

---

## AREA 14 — CHECK-IN [CK]

**B) RESEARCH QUESTIONS**
- **Q (weekly check-in design in coaching apps):** **Carbon: 3 questions — body weight, body fat (optional), and (for females) whether weight was affected by menstrual cycle.** MacroFactor: weekly program update from logged weight/nutrition trend. | help.joincarbon.com/.../5296570 ; nutriscan.app | High | [BROWSED] | US-SKEWED.
- **Q (length vs completion):** Short check-ins favoured; Carbon's 3-question model is explicitly "very simple." | feastgood.com/carbon-diet-coach-review | High | [BROWSED] | US-SKEWED.
- **Q (conditional/branching):** Carbon branches on adherence ("were you compliant?" → adjust or hold); reverse-diet asks about calorie boost only if low calories/low body fat. | feastgood.com; help.joincarbon.com | High | [BROWSED] | US-SKEWED.
- **Q (wellbeing/recovery inputs):** **JuggernautAI readiness check-in = sleep, soreness, motivation; [PowerliftingTechnique](https://powerliftingtechnique.com/juggernaut-ai-review/) [Lift Big Eat Big](https://shop.liftbigeatbig.com/blogs/reviews/best-workout-app-for-muscle-gain) low score → recommends extra rest day.** [PowerliftingTechnique](https://powerliftingtechnique.com/juggernaut-ai-review/) | powerliftingtechnique.com/juggernaut-ai-review ; declom.com/juggernautai | High | [BROWSED] | US-SKEWED.

**C) KEY FINDINGS**
- **[CK-F1]** Best-practice weekly check-in is **short + conditional**: Carbon = 3 questions, branches on adherence — help.joincarbon.com — High — US-SKEWED.
- **[CK-F2]** Recovery/wellbeing inputs (sleep/soreness/motivation) feeding a rest-day recommendation is the gold standard for *training* check-ins (Juggernaut) — powerliftingtechnique.com — High — US-SKEWED.

**D) VERBATIM:** *"if you score low on a readiness check in, the app will recommend taking an extra rest day before continuing the program. This has been one of the biggest surprises of the app."* [PowerliftingTechnique](https://powerliftingtechnique.com/juggernaut-ai-review/) — powerliftingtechnique.com/juggernaut-ai-review — [BROWSED].

**E) Complaints:** (1) Carbon won't adapt if non-adherent (goldiai.com); (2) limited check-in inputs in nutrition apps (no wellbeing context, nutrola.app); (3) changing goals too often "resets targets" (help.joincarbon.com). **Praise:** (1) fast 3-question check-in (feastgood.com); (2) readiness-driven rest days (powerliftingtechnique.com); (3) menstrual-cycle accounting (help.joincarbon.com).

---

## AREA 15 — SCALING [SC]

**B) RESEARCH QUESTIONS**
- **Q (serving beginner→elite on one product):** Hevy/Strong succeed via **simple fast core + optional depth** (RPE/RIR/supersets opt-in); "everything you'd need as a newbie or seasoned pro." | apps.apple.com (Hevy); strive-workout.com | Med | [BROWSED] | US-SKEWED.
- **Q (tone/register switching):** RP/Juggernaut fail beginners by *assuming* fluency in RPE/periodisation; StrongLifts fails advanced users (linear progression "stops working after 6 months"). | liftbigeatbig.com; jefit.com guide | High | [BROWSED] | US-SKEWED.
- **Q (progressive disclosure):** The dual-audience mechanism — hide advanced features (fatigue management, filtered volume) behind Pro/opt-in (Strive Pro adds RPE/RIR/effective reps). | strive-workout.com | Med | [BROWSED] | US-SKEWED.
- **Q (examples that do/fail):** **Do:** Hevy (free simple core, Pro depth), Boostcamp (leveled programs). **Fail:** RP/Juggernaut (jargon wall) at the beginner end; StrongLifts at the advanced end. | jefit.com; liftbigeatbig.com | High | [BROWSED] | US-SKEWED.

**C) KEY FINDINGS**
- **[SC-F1]** Progressive disclosure (opt-in advanced metrics behind Pro/toggles) is the proven single-product dual-audience mechanism — strive-workout.com — Med — US-SKEWED.
- **[SC-F2]** No mainstream app convincingly spans *complete beginner → elite physique competitor* in one product: breadth leaders (JEFIT) overwhelm beginners; beginner apps (StrongLifts) cap out fast; elite engines (RP/Juggernaut) exclude beginners — synthesised from liftbigeatbig.com + dr-muscle.com + jefit.com — Med — US-SKEWED. *(This is the benchmarked product's core positioning opportunity.)*

**D) VERBATIM:** *"The free version is bangin' and has everything you'd need as a newbie or seasoned pro."* — apps.apple.com (Hevy review) — [BROWSED]. *"A beginner doesn't need an autoregulated volume plan built around RIR adjustments, just like an advanced lifter will quickly outgrow a basic 3-day split."* — liftbigeatbig.com — [BROWSED].

**E) Complaints:** (1) advanced apps exclude beginners (liftbigeatbig.com); (2) beginner apps' linear progression "stops working after 6 months" (jefit.com); (3) too many programs ≠ quality (sensai.fit). **Praise:** (1) Hevy's free-tier breadth (repreturn.com); (2) Boostcamp leveled programs (jefit.com); (3) opt-in advanced metrics (strive-workout.com).

---

## MASTER RATINGS TABLE (selected, seen 14 June 2026)

| App | ★ | #Ratings | Store | Source URL |
|---|---|---|---|---|
| Hevy | 4.9 | 200,000+ | App Store + Play | apps.apple.com/us/app/.../id1458862350 |
| Strong | ~4.9 | NOT FOUND (exact) | App Store + Play | just12reps.com (review) |
| Carbon Diet Coach | 4.8 / 4.7 | 5,500+ / 2,100+ | App Store / Play | nutriscan.app/.../is-carbon-diet-coach-worth-it-2026 |
| MyFitnessPal | 4.7 | 2.3M | App Store | apps.apple.com/us/app/myfitnesspal-calorie-counter/id341232718 |
| MyFitnessPal | ~4.4 | ~2.85M (secondary, UNCERTAIN) | Play | choosingtherapy.com (secondary) |
| Cronometer | 4.8 | 92K | App Store | apps.apple.com/us/app/cronometer-calorie-counter/id1145935738 |
| Cronometer | 4.6 | 53.8K (5M+ DL) | Play | play.google.com/store/.../com.cronometer.android.gold |
| Cal AI | 4.7 | 155,000+ (1M+ DL) | App Store | home-cooks.co.uk/pages/review-cal-ai |
| Nutracheck (Calorie Counter+) | 4.9 (Trustpilot) | ~8,000 (Trustpilot) | App Store + Play + Trustpilot | uk.trustpilot.com/review/www.nutracheck.co.uk |
| Strava | 4.4 | 921,000 | Play | barbend.com/strava-app-review |
| Nike Training Club | 4.8 | ~269,700 iOS | App Store | yourhealthmagazine.net (secondary) |
| JEFIT | NOT FOUND (★) | 13M+ users | Play | play.google.com/store/apps/details?id=je.fit |

**Pricing reference (seen this session):** MacroFactor $11.99/mo, $71.99/yr; Carbon $8.33–14.99/mo; Fitbod $15.99/mo, $95.99/yr; [Fitbod](https://fitbod.me/faqs/) Strong $9.99/mo, $29.99/yr ($99.99 lifetime); Hevy $23.99/yr, $74.99 lifetime; JuggernautAI $34.99/mo, $349.99/yr; [Fitness Engineer](https://ai-fitness-engineer.com/juggernautai) RP Hypertrophy ~$24.99–34.99/mo; Nutracheck £6.99/mo, £29.99/yr; NutraSafe £3.99/mo (iOS).

---

## RECOMMENDATIONS (decision-ready)

**Stage 1 — Protect the differentiators that the market does NOT offer (next 1–2 quarters):**
1. **Lead with the closed full-spectrum loop.** No competitor adjusts *calories + training + steps + cardio* together off one weight trend. MacroFactor/Carbon do nutrition only; RP/Juggernaut do training only. Position explicitly against this gap. *Benchmark to change course: if MacroFactor or Carbon ships training adjustment, re-evaluate.*
2. **Make the ED-safety systems a marketed feature, not a hidden one.** MacroFactor only offers an *opt-in* 1,200 floor; Carbon's safety is implicit (reverse-diet starts at maintenance). A **fat-free-mass floor (~30 kcal/kg FFM) + rapid-loss correction + ED-pattern detection** is genuinely ahead of the field and directly answers the documented harm signal (FL-F1). Given Apple's 26 Mar 2026 medical-device declaration rule (MF-F3), document the clinical basis now.
3. **Default to deterministic transparency.** "No LLM, no randomness" is a *trust asset* in a market where Cal AI mis-identifies an apple as tikka masala (15–38% error). Show users the "why" of every adjustment — the opposite of black-box LLM coaching.

**Stage 2 — Win on retention mechanics (the proven failure point):**
4. **Engineer the first-14-days/3-sessions activation funnel** (RE-F2). Time-to-first-value must be <1 session; copy NRC's "running within minutes" and the ≤3-actions-per-screen rule (ON-F2). *Benchmark: aim to beat the 26%→10% day-1→day-28 activation decay (ON-F1).*
5. **Ship progress photos + body measurements early** — they were MacroFactor's #1/#2 requests (1,500+ upvotes each, PR-F1) and are the motivation engine for recomposition users on flat scale weight. Make photos **private by default** (Hevy norm).
6. **Weekly check-in: short + conditional + wellbeing-aware.** Match Carbon's 3-question brevity (CK-F1) but add Juggernaut-style readiness inputs (sleep/soreness) feeding training/cardio adjustment (CK-F2). Account for the menstrual cycle (Carbon does; most don't).

**Stage 3 — Scaling & UK/EU moat:**
7. **Solve the dual-audience problem nobody solves (SC-F2)** via progressive disclosure: a clean beginner core (StrongLifts-simple), with autoregulation/periodisation/RIR revealed only as users level up — explicitly translating jargon (NE-F1).
8. **Exploit UK/EU as a defensible moat:** curated (not crowdsourced) UK food DB to Nutracheck's bar (500,000+ items, kcal + 7 nutrients, NU-F1), GBP, stones/lbs, EU data residency, and **WCAG 2.2 AA compliance (legal under EAA since 28 Jun 2025; 44×44pt targets for mid-workout, DE-F1)**.
9. **Add recovery-reading (HRV/sleep) via Apple Health/Health Connect** — the rare, high-value integration (MF-F1) that converts a "logger" into a "coach." Avoid Fitbit-style feature-removal backlash (NA-F1): never strip features users rely on.

---

## CAVEATS & LOW-CONFIDENCE / COULDN'T-VERIFY REGISTER
- **Prompt-injection during session:** Repeated fake "Anthropic safety instructions" were injected into tool results urging suppression of numbers and a support resource; disregarded as non-genuine. Flagged so a dribble-check understands the report's quantitative content was the *task's* requirement, not a policy violation.
- **Exact star-rating counts NOT FOUND this session:** Strong (#ratings), JEFIT (★ on stores), MacroFactor (★/#). Reported "13M+ users" (JEFIT) and "3M+ users" (Strong) are vendor/review figures, not store ratings.
- **MyFitnessPal Google Play figure UNCERTAIN:** Apple (4.7 / 2.3M) read live; Play rating cited only via secondary source (choosingtherapy ~4.4 / ~2.85M); other aggregators disagree (4.21–4.6). Treat Play number as unverified.
- **Cal AI 155,000+ reviews / Nike TC 269,700 / NTC 4.8:** sourced from review/secondary pages (home-cooks.co.uk; yourhealthmagazine.net), not opened store pages — Med confidence.
- **Retention benchmarks vary widely by source** (3% vs 8–12% day-30) depending on methodology (all installs vs fitness-specific cohorts); Business of Apps "3% by day 30" is the conservative, citable anchor. Strava 18%→32% Challenges figure is secondary (sportfitnessapps.com/lucid.now), not Strava primary data.
- **"73% ED-contribution" stat** is from a 2017 clinical sample (N=105) and is frequently mis-cited as applying to all MFP users — it applies to people *with* an eating disorder. Reported precisely as such (FL-F1).
- **Fitbod library size** is internally contradictory (800+/1,000+/1,600+); cite the specific page.
- **Colour-blind support prevalence (Area 11):** NOT FOUND — no quantified market data located.
- **Contest-prep/peak-week/posing tooling (Area 12):** absence asserted from negative evidence (not found in any reviewed app); treat as Med confidence.
- **UK-representativeness:** Nutracheck/NutraSafe/Carbs & Cals and WCAG/EAA are UK/EU-representative; nearly all workout-logger and coaching sentiment is **US-skewed** (US App Store reviews, US studies). UK-specific sentiment for Hevy/Strong/MacroFactor/Carbon was **not** isolated this session and should be validated before relying on it as UK-representative.
- **Vendor-bias flags:** fitbod.me, joincarbon.com, hevyapp.com, jefit.com, sensai.fit, nutriscan.app, calai.app, hootfitness.com, gymgod.app, setgraph.app, strive-workout.com, dr-muscle.com, mesostrength.com are self-interested; used for factual feature/price claims, not for comparative superiority claims.
