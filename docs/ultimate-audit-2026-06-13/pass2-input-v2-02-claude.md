# PASS-2 v2 INPUT — SOURCE 02: Claude (compare-and-elevate brief)

## QC / PROVENANCE HEADER (read before using)
- Source: Claude, run by founder 2026-06-14, full 7-domain pass in one go.
- **PROVENANCE = LIVE BROWSED + SOURCED (PRIMARY-grade for [BROWSED] claims).** Section 0 declares live web
  access (~18 web_search calls + 1 subagent); claims tagged [BROWSED]/[TRAINING]; app standings give star +
  #ratings + store + downloads + URL + date (14 Jun 2026); verbatim quotes carry URLs; master source list +
  low-confidence register included. **Materially stronger than Source 01 (ChatGPT, unsourced).**
- **SECURITY EVENT:** the subagent reported a **prompt-injection in fetched web content** impersonating an
  "Anthropic safety" message (telling it to stop reporting numbers + redirect to ED support). It correctly
  identified this as injected web text, not a real instruction, and ignored it. No task change. Logged here per
  the external-content-injection rule; founder informed.
- Matrix handling: [BROWSED]+sourced claims can be VERIFIED on this source alone (documented); where Source 01
  (ChatGPT) independently agrees, that adds corroboration (2-of-3). Where Claude itself marks PARTIAL/NOT FOUND,
  carry that grade.

---

## SECTION 0 — confirmed live web access YES; per-claim [BROWSED]/[TRAINING]; UK-flagged; date 14 Jun 2026.

## APP STANDINGS (all [BROWSED], 14 Jun 2026)
- **MacroFactor** — ~4.7–4.8★ (sources conflict; AppBrain 4.81★/~14k); 400k+ users; Sensor Tower ~100k
  downloads/mo, ~$2m/mo (US); $71.99/yr, NO free tier; launched MacroFactor Workouts Jan 2026. US-SKEWED.
- **Hevy** — App Store 4.86★/~220k; Play 4.9★/~229k, 5M+ downloads, "10M users." Free+Pro. Global.
- **Strong** — App Store 4.9★/~108k; Play 4.2★/~42.5k, 1M+ downloads. Free + PRO ($4.99/mo, $29.99/yr).
- **Eat This Much** — App Store 4.7★/22k+; CNN "Best Meal Planning App" 2025; ~5,000-recipe DB; $5/mo. US.
- **Nutracheck (UK)** — Trustpilot 5★/8,202 (#3 of 69 Weight-Loss Service); **430,000-food CURATED UK database
  (Tesco/Greggs/Nando's/Costa)**; £29.99/yr; 7 nutrients; Fitbit/Garmin/Apple Health sync; **keeps exercise
  calories SEPARATE from the food target.** UK-REP.
- **Carbon Diet Coach** — $9.99/mo, no free tier; deterministic weekly macro adjustment (Layne Norton). US.
- **Fitbod** — 4.8★, ~5M downloads, $15.99/mo; adaptive generated workouts. US.
- **Boostcamp** — 4.8★, **1M+ lifters, 300M+ workouts, FREE**; 11,000+ programs, custom mesocycle builder
  (supersets/dropsets/training-max waves), **weekly Sunday reports + year-end "Wrapped,"** offline, Apple Watch.
- **Cronometer** — 84 micronutrients, generous free tier, Gold $54.95/yr; reports/scores; custom date ranges.

## PER-DOMAIN (sourced)

**D1 CARDIO:** BEST = MacroFactor philosophical bar — *"MacroFactor doesn't use estimates of energy expenditure
from wearable devices… or modifying dietary targets"* (VERIFIED, 2 MF help articles); never adds exercise cals.
Nutracheck = UI bar for keeping exercise SEPARATE (VERIFIED). LEAD: Volyume's "burn as feedback only, never
added" = exactly MF-endorsed; cardio-as-lever more disciplined. LAG: no wearable import/auto-detect — Hevy/Fitbod/
Cronometer/Nutracheck all sync Apple Health/Garmin/Fitbit; manual-only slipping below table-stakes. Burn accuracy
distrust VERIFIED (Stanford/Swedish 2017, Shcherbina et al., wearables off avg 27%, worst 93%, HR accurate <5%).
ELEVATE: read-only Apple Health/Health Connect import (feedback only, deterministic model preserved); message
*why* burn isn't added (cite 27%); "cardio lever engaged" explainer. UK: import optional/local (EU residency);
UK skews Fitbit/Garmin.

**D2 MEAL PLANNING:** BEST = Eat This Much (4.7★/22k; CNN 2025) — per-meal protein targets, per-day splits,
recurring slots, budget cap. LAG / market failure: **#1 complaint = repetition by week 3-4** (one review: 14-18
distinct meals app vs 24-28 web), single-item/unrealistic meals on restrictive diets, oversized grocery lists,
US-food bias (cups/US brands) — VERIFIED. Volyume has swap/regen + honest residual (good) but **no anti-repetition
guarantee, no UK-availability guarantee.** LEAD: progressive disclosure + residual line + day-type chip more
transparent than ETM's "spreadsheet" feel. ELEVATE: (1) anti-repetition guarantee (no repeat within N days unless
pinned); (2) UK-availability guarantee (only UK-supermarket-buyable foods, grams/ml); (3) pin/exclude-by-category;
(4) stay deterministic. UK: **single biggest planning wedge** — every dominant planner is US-built.

**D3 RECIPES:** BEST = MyFitnessPal URL import (paste link→crawl→~90% auto-match→log as one line, VERIFIED);
Cronometer/MF ingredient builders. LAG: **no URL/photo recipe import** — MFP has it for years; **MacroFactor added
it 2026 (changelog v5.7.6 May 2026: "New ai photo and/or text recipe import option")** VERIFIED. Volyume manual
builder + live per-serving preview solid but entry-only. LEAD: live total+per-serving macro preview, reuse food
search, one-tap log = on par with MF builder. ELEVATE: (1) URL import crawling→UK food DB; (2) per-serving/
leftover scaling (MF pain VERIFIED: "the measurements are always off… never seems to work"); (3) nested recipes;
(4) photo/label import later. UK: map to UK DB + grams not cups.

**D4 FOOD INSIGHTS:** BEST = MacroFactor (smoothed weight trend, expenditure trend, adherence %, intake-vs-change
— answers "why isn't the scale moving"); Cronometer micronutrient reports (84 nutrients, custom date ranges).
Both stress patterns-over-daily-pass/fail. LAG: **7-day window only** — kcal-vs-target bars + macro hit-rate +
CSV are baseline; missing 14/30/90d windows (normal), trend smoothing, **weak-spot detection, protein-consistency,
weekend-vs-weekday patterns.** LEAD: CSV valued; adherence-as-bars clean/non-judgemental = MF "no red bars /
adherence-neutral" (ED-safe). ELEVATE: (1) 14/30/90d windows; (2) protein-consistency metric; (3) weak-spot
detection ("weekends average +X kcal"); (4) wire analytics into deterministic weekly decision. UK: keep
adherence-neutral (ED-safe).

**D5 RECAP:** BEST = Spotify Wrapped (pattern) + Strava Year in Sport (fitness instantiation). Wrapped 2024: 41%
YoY share increase to ~500M shares, ~200M users in ~62hrs (MBW, VERIFIED; PARTIAL — industry estimate). Strava
Year in Sport since 2016, **2025 made it subscriber-only ($80/yr)** (Ars Technica, VERIFIED). **Boostcamp already
ships year-end "Wrapped" + weekly Sunday reports** in lifting — direct competitor to Year of Lifts (VERIFIED).
LAG: **annual-only cadence**; shareability not in spec (Strava/Spotify prove shareable cards drive ACQUISITION).
LEAD: swipeable one-hero-stat-per-card mirrors what makes Wrapped land. ELEVATE: (1) cadence beyond annual
(monthly + per-block recaps, matches Boostcamp Sunday); (2) shareable image export (IG/TikTok = acquisition);
(3) tie each card to a PB/behaviour-change milestone not vanity counts. UK: British English/GBP, EU residency for
rendered images.

**D6 BUILDER:** BEST = Hevy (4.86★/220k) for a *loved* builder (fast logging, easy superset/reorder/swap);
Strong for depth (steeper curve); Boostcamp for builder+library coexistence. LAG / friction to AVOID = **Strong's
documented failures:** Android can't duplicate single exercises; **replacing an exercise ERASES notes** (verbatim
Play review Chantel Ritter 13 May 2026); **reordering resets** (changelog v6.2.0); rigid set-scheme pairings
(can't log "planks 30s with 20lb"). All VERIFIED. **Hevy-specific builder complaints NOT FOUND** (gold standard).
LEAD: build routine + **activate as training block** alongside generated plans = clean mental model. ELEVATE:
(1) frictionless reorder persisting across restarts, duplicate single exercises, replace-without-losing-notes;
(2) flexible set schemes (weight+duration, RPE/RIR, drop/warmup/failure tags); (3) keep generated vs manual in
separate surfaces. UK: free-tier builder matches Hevy/Boostcamp (UK price sensitivity).

**D7 UX/UI:** BEST — hierarchy/glanceability = **Whoop** (3-tier progressive disclosure, functional black UI,
**customizable tiles**, visualisation by Martin Oberhaeuser); flow friction = **Hevy** (fast between-set, ships
haptics, "the UI slaps"); visual polish/density = **MacroFactor** (rich but criticised: "no simple mode that
strips away the analytics"). LEAD: hero-first Home + one-banner stack mirrors Whoop "just the answer"; ±steppers/
52px/tabular nums/large rest countdown/skeletons/deterministic one-line coaching/WCAG-AA-AAA/CVD/reduce-motion =
genuinely premium, **arguably ahead of MacroFactor on calm hierarchy**, accessibility-forward. LAG: **no dashboard
personalisation / data-density mode** (Whoop reorderable tiles; MF power users want density) — real but niche;
trade-off acceptable but may frustrate elite competitors. ELEVATE: (1) optional advanced/dense toggle (don't break
default calm); (2) premium-2026 interactions — mid-set editing without data loss (beats Strong), swipe-to-log,
one-thumb reach, completion haptics (Hevy ships), live-syncing rest timer; (3) Whoop-style tile reorder on
SECONDARY surfaces only, keep single Start sacrosanct; (4) market #0D0D0D + tested contrast as accessibility edge.
UK: offline-first cold-load skeletons matter more (patchy gym signal) — edge over Boostcamp (historically failed
offline, since fixed).

## RECOMMENDATIONS (Claude's staged plan, with thresholds)
Stage 1 (0-3mo): (1) UK-database depth + guaranteed UK-food meal planning (urgent if >20% logged foods custom/
not-found); (2) anti-repetition guarantee; (3) builder hardening (persist reorder, duplicate single exercise,
replace-without-losing-notes, flexible set schemes). Stage 2 (3-6mo): (4) analytics 14/30/90d + protein-consistency
+ weak-spot wired into weekly decision; (5) read-only wearable import (feedback only + explainer); (6) URL recipe
import→UK DB + leftover scaling. Stage 3 (6-12mo): (7) recap cadence beyond annual + shareable export; (8) optional
advanced/dense UI + premium haptics/mid-set editing. Thresholds: if EU residency blocks wearable import defer #5;
if churn at week 3-4 repetition cliff pull #2 forward; if elite NPS lags accelerate #8.

## CLAUDE'S CAVEATS / LOW-CONFIDENCE REGISTER
- MacroFactor rating 4.7 vs 4.8 conflict → ~4.7-4.8 PARTIAL.
- Reddit (r/fitness, r/loseit, r/MacroFactor) NOT retrieved this session — cardio eat-back sentiment substituted
  with MFP forum + named coaching articles; debate genuinely two-sided.
- Hevy-specific builder complaints NOT FOUND.
- Fitness-specific retention lift from recaps: no peer-reviewed stat; Spotify figures industry/marketing
  estimates not audited (Variety: 2025 ~250M users/~65hrs/~575M shares). Boostcamp Wrapped exists, no published
  retention impact.
- Strong marketing aggregates conflict with per-store; per-store used.
- Volyume's own metrics context only, not validated.

## MASTER SOURCE LIST (key URLs; full list in founder's paste)
apps.apple.com macrofactor id1553503471 · appbrain macrofactor · sensortower 1553503471 · help.macrofactorapp.com
(wearable/expenditure) · macrofactor.com · hevy apps.apple id1458862350 + play com.hevy + hevyapp.com/features ·
strong apps.apple id464254577 + play io.strongapp.strong · promealplan.com eat-this-much-review-2026 ·
support/blog.myfitnesspal.com (recipe importer) · support.strava.com Year-in-Sport + arstechnica (paywall Dec
2025) + musicbusinessworldwide (Wrapped 2024) · 925studios.co whoop-design · joincarbon.com · fitbod ·
boostcamp.app/features + play com.bpmhealth.boostcamp · cronometer.com/features/reports · uk.trustpilot.com
nutracheck + apps.apple.com/gb id444924121 · physiqonomics/9-to-5-nutrition (eat-back) + Stanford/J.Personalized
Medicine 2017 Shcherbina (wearable accuracy).
