# PASS 2 — ADJUDICATION across the three external inputs (checkable cross-tab, NOT self-certified)

Inputs adjudicated (raw, stored verbatim alongside this file):
- Input 1 — ChatGPT — `pass2-input-01-chatgpt.md` — claims LIVE browse 14 Jun 2026; gave GOOGLE PLAY quant.
- Input 2 — Gemini — `pass2-input-02-gemini.md` — Section 0 admits access was **SIMULATED** ("via a
  comprehensive retrieved-data repository"); gave APP STORE quant. **Treated as TRAINING-grade**, not live.
- Input 3 — Claude — `pass2-input-03-claude.md` — claims LIVE browse 14 Jun 2026 (18 searches + subagent);
  gave mostly APP STORE quant; actively corrects errors in the other two.

## HOW I ADJUDICATED (so you can check the method, not just the result)
- A finding is **CORROBORATED** only if **≥2 of the 3 independently assert it** AND at least one gives a
  usable URL that is NOT (a) a phantom/SEO site, (b) the *same* vendor page another report leaned on, or
  (c) a restatement of this audit's own prompt. Where the two agreeing reports share ONE source, I label
  it "2 reports / 1 source" and down-grade.
- Gemini being simulated means a Gemini-only claim is **never** corroboration on its own; Gemini can only
  raise an item to CORROBORATED when it agrees with a LIVE report (ChatGPT or Claude).
- **Store divergence is not a conflict.** App Store ≥ Play ratings almost always; ChatGPT(Play) vs
  Gemini/Claude(App Store) differing is expected. A real QUANT conflict is two reports disagreeing on the
  SAME store.
- ⚠️ **I cannot re-fetch live in this environment** (the reason we used 3 external AIs). So this
  adjudication establishes the **QUALITATIVE reality** by 2-of-3. Every **numeric rating/count below is
  external-sourced and NOT independently re-verified by me** — treat the quant table as "best triangulated
  external view", and confirm any specific number by live fetch before a Pass-4 blueprint leans on it.
- I am not stamping this PASS. It is a cross-tab for you to check against the three raw files.

---

## A. CORROBORATED FINDINGS (≥2-of-3 independent; these are load-bearing for Pass 3)

| # | Finding | CG | Ge | Cl | Strength | Best non-tainted URL |
|---|---|:--:|:--:|:--:|---|---|
| C1 | **Market splits 3 ways and NO competitor closes the full loop** (one weight-trend → calories *and* training *and* steps/cardio). MacroFactor/Carbon = nutrition only; RP/JuggernautAI = training only. | ✓ | ✓ | ✓ | **HIGH (3/3)** | help.joincarbon.com weekly-check-in; rpstrength.com/pages/hypertrophy-app |
| C2 | **Carbon = adherence-STRICT (won't adjust if you didn't comply) vs MacroFactor = adherence-NEUTRAL (adjusts off weight trend regardless).** Market sentiment favours adherence-neutral (no guilt). | ✓ | ✓ | ✓ | **HIGH (3/3)** | calai.app/blog/macrofactor-vs-carbon; nutriscan.app macrofactor-vs-carbon |
| C3 | **Deterministic/algorithmic coaching is TRUSTED; LLM-generated training/nutrition is distrusted as "slop"/hallucination-prone** in the strength & physique segment. No-LLM is a marketed trust asset. | ✓ | ✓ | ✓ | **HIGH (3/3)** | getfitcraft (Ge); Alpha "we don't use AI" (CG); nutrola.app (Cl) |
| C4 | **Progressive disclosure is THE single-product dual-audience mechanism**, and **no mainstream app convincingly spans complete-beginner → elite-competitor** in one product. | ✓ | ✓ | ✓ | **HIGH (3/3)** | gapsystudio.com/blog/progressive-disclosure-ux; liftbigeatbig.com |
| C5 | **Jargon (RIR / mesocycle / volume landmarks / MEV-MRV) alienates beginners; RP & JuggernautAI are explicitly the WORST for beginners** despite best architecture. Fix = inline tooltips / "Advanced" toggle. | ✓ | ✓ | ✓ | **HIGH (3/3)** | dr-muscle.com/rp-hypertrophy-app-critique; findyouredge.app |
| C6 | **UK food-DB localisation is a real moat: Nutracheck ≈ 500,000+ CURATED (verified, not crowdsourced) UK items**; US giants (MFP/Lose It!) suffer in UK on crowdsourced entries/portions. | ✓ | ✓ | ✓ | **HIGH (3/3)** | home-cooks.co.uk/pages/review-nutracheck; nutrasafe.co.uk; (CG retailer list) |
| C7 | **WCAG touch targets: 24×24 CSS px = AA (2.5.8); 44×44 = AAA (2.5.5); Apple HIG 44pt / Material 48dp.** 44×44 is the practical floor for mid-workout buttons. | ✓ | ✓ | ✓ | **HIGH (3/3)** standards | w3.org/WAI WCAG target-size; (Cl adds EAA in force 28 Jun 2025) |
| C8 | **Retention — not features — is the category failure.** Day-30 retention is single-digit-to-low (≈3% Business of Apps; 8–12% fitness-specific). Early-window engagement is the dominant churn signal. | ✓ | ✓ | ✓ | **HIGH direction (3/3); numbers vary by source** | businessofapps.com health-fitness benchmarks; lucid.now |
| C9 | **Streak-guilt / all-or-nothing is a top churn trigger; "streak-freeze"/forgiving-missed-day framing retains.** | ~ | ✓ | ✓ | **MED (2–3/3)** | zehrasaric10.medium.com (Ge); Cl no-shame framing |
| C10 | **AI photo/voice logging (Cal AI, SnapCalorie) is fast but inaccurate** (≈15–40% error, hidden fats/portions) and trust is fragile; must pair with easy manual correction. | ✓ | ✓ | ✓ | **HIGH (3/3)** | home-cooks.co.uk/review-cal-ai; SnapCalorie store reviews |
| C11 | **Weekly check-in best practice = short + conditional/branching + wellbeing inputs.** Carbon ≈ 3 questions (weight, optional body-fat, menstrual-cycle effect); branches on adherence. Training apps add sleep/soreness/readiness → rest-day rec. | ✓ | ✓ | ✓ | **HIGH (3/3)** | help.joincarbon.com weekly-check-in; powerliftingtechnique.com juggernaut |
| C12 | **Onboarding: quiz/progressive-disclosure with value < ~60s; paywall-or-jargon-before-value kills beginners.** ("Ikea effect" long quiz aids conversion in fitness specifically.) | ✓ | ✓ | ✓ | **HIGH (3/3)** | screensdesign.com boostcamp; weareaffective.com (Cl) |
| C13 | **Trend-weight smoothing (moving average) is standard** and protects morale; **recomposition (flat scale weight) must be reframed** via photos/measurements/PRs/body-fat. | ✓ | ✓ | ✓ | **HIGH (3/3)** | macrofactor.com/mm-february-2022; joincarbon.com/blog/a-smarter-new-year-plan |
| C14 | **Progress photos + body measurements are top user demand**; privacy-by-default on photos is an emerging norm (Hevy). | ✓ | ✓ | ✓ | **MED–HIGH (3/3; PR-demand)** | macrofactorapp.com/body-metrics; hevyapp.com/features/progress-photos |
| C15 | **MacroFactor "tiered autonomy": Coached / Collaborative / Manual modes** = concrete progressive-disclosure-for-control mechanism. | ✗ | ✓ | ~ | **MED (2/3; Ge primary + Cl scaling)** | help.macrofactorapp.com/.../articles/30 |
| C16 | **Exercise library benchmark ≈ 250 (specialist) → ~1,400 (JEFIT, breadth leader); HD video/looping animation is the demo norm; custom exercises + smart substitutions are expected.** | ✓ | ✓ | ✓ | **MED–HIGH (3/3 on shape; see CF4 for the Fitbod/Hevy size conflict)** | apps.apple.com JEFIT; hevyapp.com exercise-library |
| C17 | **Real periodisation (RP/Juggernaut mesocycles/deloads) is the respected plan architecture; Fitbod = daily "muscle-freshness" rotation without long-term mesocycle ramp.** | ✓ | ✓ | ✓ | **HIGH (3/3)** | mesostrength.com (Cl); boostcamp.app/vs/fitbod (Ge) |
| C18 | **Wearable sync (Apple Health / Health Connect) is table-stakes; reading HRV/sleep/recovery to drive training volume is RARE and the most-wished gap.** | ✓ | ✓ | ✓ | **MED (3/3 but C18b caveat)** | corahealth.app (Cl); sensai.fit (Ge+Cl — shared, see CF5) |

CG = ChatGPT (live), Ge = Gemini (simulated), Cl = Claude (live). ✓ asserts · ~ partial/adjacent · ✗ silent.

---

## B. CONFLICTS REGISTER (do NOT use any single side as fact until resolved by live fetch)

- **CF1 — Nutracheck rating (3 different surfaces, alarming spread):**
  - Gemini: **4.8 / 259K — App Store** (apps.apple.com/gb/.../id444924121)
  - ChatGPT: **2.5 / 57.4K — Google Play** (Calorie Counter+ listing)
  - Claude: **4.9 / ~8,000 — Trustpilot** (uk.trustpilot.com/review/www.nutracheck.co.uk)
  - Status: the **DB-quality moat (C6) is corroborated**; the **RATING is NOT**. The Play 2.5 contradicts the
    App Store 4.8 and Trustpilot 4.9 sharply. Could be (a) a different/older Play listing, (b) a post-update
    revolt, or (c) one figure is wrong. **GENUINELY UNRESOLVED — needs a live store fetch I cannot do.**
- **CF2 — Strava Play rating:** ChatGPT 3.9 / 1.11M (Play) vs Claude 4.4 / 921K (Play) — same store, real
  conflict. Gemini gave 4.8 / 200K (App Store, different store). Unresolved.
- **CF3 — Fitbod rating/store:** ChatGPT 4.6 / ~27K (Play); Gemini 4.8 / 273K (App Store) + 4.5 / 3.9K (Play);
  Claude did not rate. Play side roughly agrees (4.5–4.6); App Store count (273K) is single-source (Ge).
- **CF4 — Library size (Fitbod & Hevy):** Claude flags Fitbod's OWN pages contradict each other
  (800+/1,000+/1,600+) and pins **Hevy = 400+** (corrects third-party "1,000+"); ChatGPT said Fitbod
  "1,000+"; Gemini said Hevy "400–600" and Fitbod "1,500+". → **JEFIT ≈ 1,400 is corroborated (CG+Cl+Ge);
  Fitbod's number is intrinsically unreliable (cite the specific page); Hevy ≈ 400 (Cl primary, Ge agrees
  range).**
- **CF5 — MyFitnessPal redesign + Fitbit/Google Health backlash:** Gemini and Claude both report a real
  2026 MFP UI revolt and the Fitbit→Google Health "AI slop" backlash WITH quotes; **ChatGPT explicitly made
  NO claim** ("no directly-opened Fitbit/Google Health source"). Gemini is simulated, so this rests on
  **Claude (live) + Gemini (simulated)** → **MED**: directionally credible (Claude opened 9to5google /
  gizmodo / androidauthority), but verify the exact pages before quoting.
- **CF6 — MacroFactor calorie-floor specifics (CONTAMINATION-ADJACENT — read carefully):**
  - Claude: MacroFactor has an **opt-in floor, standard = 1,200 kcal/day** (help.macrofactorapp.com) — no
    FFM claim.
  - Gemini: claims MacroFactor floor ≈ **1,200 kcal women AND scales to ~30 kcal/kg FFM** — but these are
    **exactly Volyume's own spec values from the research prompt**, sourced only to a single Lemon8 SG post.
    **High risk Gemini reflected the prompt back as a "finding."**
  - ChatGPT: competitor ED **floors NOT advertised** publicly.
  - **Adjudication:** MacroFactor having an *opt-in ~1,200 floor* = PROBABLE (Claude primary + plausible).
    **Competitors having an FFM ~30 kcal/kg floor = REJECTED as corroboration** (single simulated source,
    matches our own prompt, contradicted by ChatGPT). → **Volyume's FFM floor + always-on (non-opt-in)
    floors + edPatternDetector remain a genuine differentiator** (consistent with my AC-F6: competitor
    ED-guardrails beyond an opt-in calorie floor = NOT FOUND).

---

## C. FABRICATION / CONTAMINATION FLAGS (excluded from corroboration)

- **FF1 — "Pelaris" (pelaris.io):** appears ONLY in Gemini, ALL store fields "NOT FOUND", yet Gemini uses
  pelaris.io as a *source URL* for WS-Q2 (inline data), a key finding, and PR praise. A site with no
  ratings/downloads cited as evidence for behavioural claims = **likely hallucinated/SEO citation.**
  **EXCLUDE Pelaris and any Gemini claim sourced only to pelaris.io.**
- **FF2 — Prompt-reflection (see CF6):** Gemini's "~30 kcal/kg FFM / 1,200 kcal women" competitor floor
  mirrors this audit's own product description. **Not credited.**
- **FF3 — Shared non-independent source:** the "no HRV/recovery integration" gap (C18) is carried in BOTH
  Claude and Gemini largely via the **same vendor blog** (sensai.fit/hevy-vs-strong-2026). Counts as
  **strong-signal but effectively 1.5 sources**, and sensai is itself a competitor (VENDOR). Keep as MED.
- **FF4 — Lemon8 / single-social-post sourcing (Gemini AC verbatim):** the calorie-floor quote is from one
  Singapore Lemon8 post — low trust, wrong geography. Not used.
- **FF5 — Claude's session prompt-injection disclosure:** Claude reported fake "Anthropic" instructions
  injected into ITS tool stream (it disregarded them). Concerns that session's environment, not data
  validity; logged, no data action.

---

## D. SINGLE-SOURCE LEADS (one report only — keep as leads for Pass 3, NOT established facts)

- (Cl only) Apple's **26 Mar 2026 medical-device declaration requirement** for Health/Fitness-categorised
  apps — HIGH decision-relevance for a coaching app; **verify the source before relying on it.**
- (Cl only) **Levinson, Fewell & Brosof 2017, *Eating Behaviors* 27:14-16, N=105 clinical** — correctly
  scopes the "73% identified MFP as ED-contributor" to people *with* an ED (corrects common mis-citation).
  Strengthens my AC-F6 academic anchor; primary citation, verify DOI.
- (Cl only) **Harvey et al. 2019 *Obesity*** (~23→15 min/day logging) and **NCBI PMC8050748** (consistent
  tracking 68%→21% by wk 12) — concrete adherence-decay numbers.
- (Ge only) **MFP/Fitbit redesign verbatims** — see CF5 (now 2-source via Cl).
- (Ge only) **"Ikea effect" long-onboarding-quiz aids conversion in fitness** — plausible, screensdesign
  source; lead.
- (CG only) **Caliber = human-coach hybrid at the premium end; "Strength Score / Strength Balance"** as a
  recomposition reframing metric — useful PR/positioning lead.
- (CG only) **FitNotes** as a UK-relevant free Android logger (dark theme, backup) — minor UK lead.

---

## E. QUANT STANDINGS — BEST TRIANGULATED EXTERNAL VIEW (store-labelled; NOT re-verified by me)
Read every cell as "one or more external reports said this"; confirm by live fetch before any number is
used in a blueprint. Where App Store and Play both appear they are both plausibly true (store divergence).

| App | App Store (Ge/Cl) | Google Play (CG) | Agreement | Note |
|---|---|---|---|---|
| Strong | 4.9 / 108K (Ge) | 4.7 / 42.6K (CG) | store-divergent | Cl: "~4.9, exact # NOT FOUND" |
| Hevy | 4.9 / 74K (Ge App Store) · 4.9 / 229K (Ge Play) · 200K+ (Cl) | 4.8 / 229K | **Play 229K agrees (CG+Ge)** | strong logger leader |
| MacroFactor | 4.8 / 17K (Ge) | 4.6 / 14.4K (CG) | consistent (store) | Cl: NOT FOUND |
| Carbon | 4.8 / 5.5K (Ge) | 4.5 / 2.84K (CG) | consistent (store) | Cl: 4.8 iOS / 4.7 Play, 5.5K/2.1K |
| RP Hypertrophy | **4.4 / 193 (CG+Ge agree)** | 4.1 / 112 (Ge) | **CORROBORATED 4.4/193** | only firm 2/2 match |
| JuggernautAI | 4.9 / 5.6K (Ge) | 4.8hdr/4.7 ~2.5K (CG) | store-divergent | |
| Alpha Progression | 4.9 / 2K (Ge) | 4.9 / 20K (CG) | ★ agree, count differs | |
| Fitbod | 4.8 / 273K (Ge) | 4.6 / ~27K (CG); 4.5/3.9K Play (Ge) | conflict (CF3) | |
| MyFitnessPal | 4.7 / 2.3M (Cl) | 4.1–4.4 / 2.9M (CG+Ge) | Play ~consistent | huge base 100M+ |
| Cronometer | 4.8 / 92–93K (Ge+Cl) | 4.5–4.6 / ~54K (CG+Cl) | **both stores corroborated** | |
| Cal AI | 4.7–4.8 / 155K–328K | — | count conflict | Cl 155K vs Ge 328K |
| Nutracheck | 4.8 / 259K (Ge) | **2.5 / 57.4K (CG)** | **CONFLICT (CF1)** | Trustpilot 4.9/8K (Cl) |
| Strava | 4.8 / 200K (Ge) | **3.9 (CG) vs 4.4 (Cl)** | **CONFLICT (CF2)** | |
| JEFIT | 4.8 / 47K (Ge) | 4.4 / 89.6K (CG) | store-divergent | 10M+ users |

---

## F. GENUINELY UNKNOWN (after 3 reports — do NOT guess; resolve before any Pass-4 item that needs them)
1. **Taps-to-log-a-set, exact:** no report has device-measured data. CG honest NOT FOUND; Ge "3–4"/Cl "~2"
   are observational, not measured. Unknown precisely.
2. **Nutracheck's true current store rating** (CF1) — unresolved across 3 surfaces.
3. **Whether any competitor has an ALWAYS-ON (non-opt-in) calorie floor, an FFM-based floor, or
   ED-pattern detection** — NOT FOUND in any report (MacroFactor's is opt-in 1,200 only). This is the
   decision-critical gap and it **favours Volyume** — but it's a NOT-FOUND, established by absence.
4. **Colour-blind support prevalence** — NOT FOUND (all three).
5. **Dedicated contest-prep / peak-week / posing tooling** — asserted ABSENT from negative evidence
   (2/3); treat as MED "white space", not proven.
6. **UK-specific sentiment for Hevy/Strong/MacroFactor/Carbon** — all three say the workout/coaching
   sentiment is **US-SKEWED**; UK representativeness holds firm ONLY for Nutracheck/Carbs&Cals/NutraSafe/
   FitNotes and the WCAG/EAA standards. Do not present US review sentiment as UK.
7. **Exact churn #1 trigger / day-30 number** — direction firm (C8), precise figure source-dependent
   (3% vs 8–12%).

---

## G. WHAT THIS ENABLES / WHAT IT DOES NOT
- **Enables (load-bearing for Pass 3 gap analysis):** C1–C18 corroborated findings, the conflict-resolved
  view, the contamination exclusions, and the genuinely-unknown register. The strategic spine that
  survives triangulation: **(i)** the unclosed full-loop is the white-space (C1); **(ii)** deterministic +
  transparent + ED-safe is a real, uncontested differentiator (C2/C3 + F#3); **(iii)** retention/onboarding
  is the battlefield (C8/C9/C12); **(iv)** UK food-DB + WCAG/EAA is the defensible moat (C6/C7); **(v)**
  progressive disclosure solves the dual-audience nobody solves (C4/C15).
- **Does NOT establish:** any specific star rating/review count (E is external, un-re-verified — CF1/CF2/CF3
  open), the competitor FFM-floor claim (rejected, FF2/CF6), Pelaris (FF1), or anything in D (single-source
  leads). None of these may be stated as fact in Pass 3/4 without resolution.
- **I have not self-certified.** This is the cross-tab to check against the three raw input files. If any
  row fails your check against the raw source, it fails.
