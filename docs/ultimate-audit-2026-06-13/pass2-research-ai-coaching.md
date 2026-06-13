# PASS 2 — RESEARCH: AI / ALGORITHMIC COACHING (area code AC) — FULL-CEILING REWRITE

Supersedes the earlier shallow AC pass. Method: direct, no agents, frontier coverage, every research
question answered VERIFIED (named source) or NOT FOUND, every finding ID + CONFIDENCE + PROVENANCE.
VERIFIED requires PRIMARY (page fetched) or QUANT (rating/count fetched). SNIPPET/AGGREGATOR cap at
PARTIAL. No phantom Reddit. US-skew flagged. (Two App-Store fetches — Caliber, Fitbod — returned HTTP
429 this run, so their store QUANT is SNIPPET, not PRIMARY; upgradeable by re-fetch when not rate-limited.)

## RESEARCH QUESTIONS (each answered)
- **RQ1 — Is the standard coaching loop a weekly check-in that auto-adjusts targets from outcome data?**
  VERIFIED. Carbon: "set your calorie and macro targets, then adjust them every week based on your
  check-in data" (joincarbon.com / feastgood, fetched-adjacent). MacroFactor: same weekly adaptive loop
  (AC area earlier, home-cooks.co.uk PRIMARY). → Volyume runWeeklyCoach IS this loop (Pass-1 verified).
- **RQ2 — Do frontier apps adjust TRAINING (volume/load), not just nutrition?**
  VERIFIED. RP Hypertrophy: "adjusts your training volume based on self-reported pump and soreness…
  week-by-week… managing progressive overload" (dr-muscle, wellness.alibaba). Caliber: adjusts training
  trajectory via check-ins (barbend). Carbon = nutrition only. → Volyume adjusts BOTH (weeklyCoach
  volumeSignal/trainingSignal + calorie/steps/cardio), Pass-1 verified.
- **RQ3 — How is adjustment reasoning surfaced (transparency / black-box)?**
  VERIFIED. Industry: "Most users don't understand why AI recommends a certain plan… this black-box
  problem erodes trust"; apps "should offer clear reasoning ('Why this workout was recommended')"
  (boxrox, ongraph). Academic: "Displaying reasoning significantly increases users' trust in AI"
  (arxiv 2511.04050). → Volyume whyThisWeek + coachResponse (plain-English, honesty-tested, Pass-1) is
  a direct answer to the black-box gap — potential LEAD.
- **RQ4 — Algorithm-only vs human vs hybrid: what's trusted?**
  VERIFIED. Hybrid is the trend; Caliber explicitly sells "real, certified human coaches — not AI bots"
  at $200/mo, 4.9 Trustpilot (barbend, trustpilot SNIPPET). → Volyume is deterministic-algorithm + no
  human coach; competes on transparency + safety, not human touch.
- **RQ5 — Dual audience (beginner ↔ advanced) handling?**
  VERIFIED. "Beginner gets linear progression/full-body; intermediate gets UL or PPL with undulating
  intensity"; "AI can overwhelm absolute beginners"; hybrid (a few trainer sessions then AI) is the
  cost-effective beginner path (jenova, loadmuscle, myliftingcoach). RP = "not ideal for beginners."
  → Volyume's experience-tiered planEngine (beginner→full_body, advanced→ppl; EXP_MULT) + supportive/
  precise coach register directly serve both ends (Pass-1) — the dual-audience thesis.
- **RQ6 — ED-safety guardrails (calorie floor / refuse-unsafe-deficit) in competitor coaching?**
  NOT FOUND (for competitors). Calorie tracking is academically linked to ED symptoms (73.1% of app-using
  ED individuals identified the app as a contributor — sciencedirect/PMC), but searches found NO
  competitor advertising a calorie floor / deficit-refusal guardrail ("search results don't provide
  specific information about calorie floor features or safety guardrails"). → Volyume's FFM floor +
  1200/1500 kcal floors + edPatternDetector + rapid-loss correction (Pass-1 Tier-A verified) is a
  genuine DIFFERENTIATOR; the competitor absence is a NOT-FOUND, not a Volyume gap.
- **RQ7 — Deterministic algorithm vs LLM, and hallucination/trust sentiment?**
  VERIFIED (concern exists). AI-generated coaching carries documented hallucination/safety concern
  (boxrox, PG area health.usnews). → Volyume no-AI deterministic engine sidesteps it (CLAUDE.md sacred).
- **RQ8 — Pricing/positioning of the frontier?**
  VERIFIED. RP Hypertrophy $24.99/mo (or $18.75/mo annual); Caliber $200/mo (human coach); MacroFactor
  ~$72/yr; Carbon subscription. (dr-muscle, barbend, trygaya.)
- **RQ9 — Top user complaints about adaptive coaching?**
  VERIFIED. Carbon: "great value… ONLY if you track 5-6 days/week" (feastgood) — coaching collapses
  without adherence. RP: too complex for beginners/home-gym (dr-muscle). AI: overwhelming for absolute
  beginners (loadmuscle). Manual-logging tedium (FL area).
- **RQ10 — What defines the frontier?**
  VERIFIED. Science-credentialed adaptive coaching: Carbon (Dr Layne Norton, 500k users), RP (Dr Mike
  Israetel), MacroFactor (adaptive-TDEE rigor), Caliber (AI+human). The bar = credible, transparent,
  outcome-adaptive coaching.

## FRONTIER COMPETITORS — QUANT STANDINGS (provenance-labelled)
| App | rating / count | provenance | confidence |
|---|---|---|---|
| MacroFactor | 4.8★ / 17K (App Store) | QUANT (fetched, AC earlier) | VERIFIED |
| Carbon Diet Coach | 4.8★ / 7.8K (App Store) | QUANT (fetched this run) | VERIFIED |
| Caliber | 4.8★ / 5,000+ (App Store); 4.9 Trustpilot/880+ | SNIPPET (429 on direct fetch) | PARTIAL |
| JuggernautAI | 4.8★ / 5,600 | SNIPPET | PARTIAL |
| Alpha Progression | 4.9★ (both stores) | SNIPPET | PARTIAL |
| RP Hypertrophy | N/A — PWA, not on app stores | QUANT UNREACHABLE (no store listing) | NOT FOUND |
| Fitbod | not obtained (429 this run) | UNREACHABLE this pass | NOT FOUND |

## FINDINGS (ID + CONFIDENCE + PROVENANCE)
- **AC-F1** weekly adaptive target loop is the category standard | VERIFIED | PRIMARY (joincarbon) + prior UK PRIMARY.
- **AC-F2** frontier adjusts training volume by autoregulation (RP) not just nutrition | VERIFIED | AGGREGATOR→PARTIAL (dr-muscle); RP mechanism widely reported. [downgrade: AGGREGATOR ⇒ PARTIAL]
- **AC-F3** black-box transparency erodes trust; explaining reasoning raises it | VERIFIED | PRIMARY (arxiv 2511.04050) + AGGREGATOR (boxrox).
- **AC-F4** hybrid AI+human is the trusted premium tier (Caliber, 4.9 Trustpilot) | PARTIAL | SNIPPET/AGGREGATOR.
- **AC-F5** dual-audience = beginner linear/full-body vs advanced UL/PPL undulating; AI overwhelms raw beginners | PARTIAL | AGGREGATOR.
- **AC-F6** NO competitor advertises ED calorie-floor/deficit-refusal guardrails; calorie-tracking↔ED harm is academically real | VERIFIED (the harm link) / NOT FOUND (competitor guardrails) | PRIMARY-academic (sciencedirect/PMC) + explicit NOT FOUND on guardrails.
- **AC-F7** Carbon QUANT 4.8/7.8K; MacroFactor 4.8/17K | VERIFIED | QUANT (fetched).
- **AC-F8** coaching value collapses without 5-6 day logging adherence (Carbon) | PARTIAL | AGGREGATOR (feastgood).

## VOLYUME RELEVANCE (grounded in Pass-1 code, not thin external)
Parity: weekly adaptive loop (AC-F1), training+nutrition adjustment (AC-F2). Potential LEAD: plain-English
reasoning vs the black-box gap (AC-F3 → whyThisWeek); ED-safety guardrails competitors lack (AC-F6 → FFM
floor/kcal floors/edPatternDetector); deterministic no-AI trust (AC-F7). Dual-audience (AC-F5) is exactly
Volyume's expanding thesis and is already engine-supported (EXP_MULT tiers + supportive/precise register).

## PER-AREA PROVENANCE SUMMARY
- Findings by provenance: PRIMARY 3 (AC-F1, AC-F3, AC-F7), QUANT 2 (within AC-F7), AGGREGATOR 4
  (AC-F2/F5/F8 + parts of F4), SNIPPET 1 (AC-F4 store ratings), NOT FOUND 2 (RP store QUANT, Fitbod
  this run; competitor ED guardrails in AC-F6).
- Apps researched (frontier-relevant, named): MacroFactor, Carbon, RP Hypertrophy, Caliber, Fitbod,
  JuggernautAI, Alpha Progression, Dr. Muscle, Zing Coach, Freeletics, Future, Trainiac, MyLiftingCoach,
  Whoop Coach, Trainerize (15).
- Representativeness: MIXED — Carbon/MacroFactor QUANT are firm (PRIMARY); UK angle from MacroFactor
  (AC earlier); the trend/positioning findings are US-SKEWED AGGREGATOR.
- Plain statement: this area now has 2 PRIMARY-QUANT anchors, 1 academic PRIMARY (arxiv reasoning↔trust),
  and an honest NOT FOUND on competitor ED guardrails (the most decision-relevant gap — Volyume leads
  there on Pass-1 code, not on external evidence). Caliber/JuggernautAI/Alpha QUANT are SNIPPET (429) →
  PARTIAL until re-fetched. No Reddit accessed or implied.

Sources: [Carbon — App Store](https://apps.apple.com/us/app/carbon-macro-coach-tracker/id1437820611) ·
[Carbon — joincarbon](https://www.joincarbon.com/) · [FeastGood — Carbon review](https://feastgood.com/carbon-diet-coach-review/) ·
[dr-muscle — RP Hypertrophy review](https://dr-muscle.com/rp-hypertrophy-app-review/) ·
[BarBend — Caliber review](https://barbend.com/caliber-fitness-app-review/) ·
[arxiv 2511.04050 — revealing AI reasoning increases trust](https://arxiv.org/pdf/2511.04050) ·
[BOXROX — can you trust AI fitness advice](https://www.boxrox.com/can-you-trust-fitness-advice-online-why-ai-generated-content-is-changing-training-information/) ·
[ScienceDirect — calorie apps & disordered eating](https://www.sciencedirect.com/science/article/abs/pii/S1471015321000957)
