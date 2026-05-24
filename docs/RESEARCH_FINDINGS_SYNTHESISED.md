# Volyume Complete: synthesised research findings

Status: locked direction. Sources: three-pass adjudication of Gemini
Deep Research and ChatGPT Deep Research outputs, adjudicated by Claude
against the live app on branch `claude/fix-session-api-errors-PqkZo`.
Date: 2026-05-23.

This document supersedes earlier research notes that were built against
the stale fork. Where prior research conflicts with what is recorded
here, this document wins.

---

## 1. The live app, in one screen

What ships today, against which all moves are scoped:

- React Native + Expo SDK 51, RN 0.74.5. Closed test on Play, v1.1.0
  (versionCode 4). Internal testing group, not an end-user cohort.
- Coach engine in `src/lib/weeklyCoach.js` (732 lines). Autoregulation
  matrix, 10-day EWMA weight trend (alpha 0.1), held decisions, data
  confidence gate, diet-break trigger. No food data driving any of it.
- Nutrition engine in `src/lib/nutritionEngine.js`. Adaptive TDEE
  (alpha 0.28, 50% dampening), three protein approaches (Standard 2.2
  to 2.6, Optimised 2.5 to 3.0, Advanced 2.8 to 3.3 g/kg BW),
  Katch-McArdle when BF% is credible, Morton 2018 cap at 2.2 g/kg BW
  when BF% is unknown, hard rapid-loss gate at 1.5% BW/week, soft
  warning at 0.8%, flat floors 1500/1200, refeed prescription, per-meal
  protein distribution.
- Jargon blocklist in `src/lib/whyThisTemplates.js`: seven terms only
  (`MEV`, `MAV`, `MRV`, ` RIR`, ` RPE`, `mesocycle`, `junk volume`).
  Not strict enough for the harm pattern Eikey 2021 identifies.
- Tier code in `src/lib/proGate.js`: `PRO_BETA_ACTIVE = true`. Two
  tiers (free, pro). No `isPaidTier()` helper. Supabase trigger blocks
  client-side upgrades.
- Insights engine in `src/lib/insightsEngine.js`: six deterministic
  insight types, none food-driven.
- SCOFF (ED) screener at onboarding. `scoffPositive` gates deficit
  suggestions today.
- Supabase table `weekly_checkins_v2`: `cals_adherence TEXT`
  (hit/under/over/untracked). No `adherence_protein`, no
  `measured_kcal_avg`, no `days_logged`.
- Sentry observability, on-device error ring buffer (200 events),
  feedback views (`v_feedback_weekly_digest`,
  `v_feedback_error_correlation`).
- HealthKit and Health Connect: weight import only, no nutrition.
- 903 Jest tests across 26 suites, signed CI builds (APK + AAB).

---

## 2. Locked decisions

Recorded in full in `BRIEF_C_CLAUDE_ADJUDICATION.md` and
`COMPLETE_TIER_SCOPE_LOCKED.md`. Headlines:

1. **Three tiers: Free, Pro, Complete.** Safety logic is tier-blind.
   Complete differentiates on surfaces, depth, and integrations. Never
   on safety.
2. **Pricing ladder.** Pro £1.49 founders, £2.99 standard. Complete
   £3.49 founders, £6.99 standard.
3. **Single unified app.** No companion. Food layer folds into the
   existing RootNavigator, design system, accessibility prefs, Sentry,
   and feedback pipeline.
4. **No LLM in the engine.** Deterministic rules only. LLM may sit
   alongside as a separate feature later, never inside the coach
   pipeline.
5. **B2B coach surface is phase two.** Schema groundwork ships in
   phase one (the `engine_overrides` table).
6. **Five engine guardrails:** FFM-aware energy floor (30 kcal/kg
   FFM/day), ED-pattern lockout, rapid-loss compressed upward gate,
   protein cap path when BF% is unknown, adherence-quality gate
   before insight generation.
7. **Upward counterfactual voice rule.** "With food data, this card
   would have said X." Evidence: Kuhl, Artelt, Hammer 2023, arXiv
   2306.07637 / Springer LNCS DOI 10.1007/978-3-031-44070-0_14. N =
   161 user study, upward counterfactual explanations produced
   significantly better task performance and higher explicit knowledge
   than downward or no-explanation conditions.
8. **28-day GA cascade.** 14 days Complete free, then 14 days Pro
   free, then Free. Hold at any stage, skip ahead allowed, one-time
   entitlement per account. Closed testing is internal only, no
   contributor entitlement.
9. **Production telemetry replaces beta validation.** No end-user
   closed cohort exists. The first 4 to 8 weeks post-GA are the
   validation window for engine guardrails. Launch with conservative
   thresholds, tighten on telemetry.

---

## 3. The five moves, ranked

Adjudicated order from Claude's pass, with file impact and signal
criteria.

### Move 1: FFM-aware engine guardrail + food logging foundation (one bundle)

Both passes split this in two. Claude's adjudication folded them
together because the guardrail is meaningless without food data and
the food data is a liability without the guardrail.

What ships:

- New Supabase tables: `foods`, `food_entries`, `daily_intake_rollups`.
- Manual food entry UI (no barcode, no OCR in this move).
- `computeFFMFloor()` in `nutritionEngine.js`. Uses Katch-McArdle FFM
  when BF% is credible, Morton 2018 cap path when unknown.
- Floor fires from a 7-day rolling intake average once 5+ days of
  food data exist in any 7-day window. Below 30 kcal/kg FFM/day, the
  engine refuses further deficit and surfaces a held-decision card.
- New `WHY_LIBRARY` keys: `ffm_floor_hold`, `food_data_insufficient`.
- New held-decision type for FFM-floor holds.

Signals:

- Month 1: 60%+ of cut-goal users log food on 4+ days/week. FFM-floor
  holds fire on under 5% of cut users.
- Month 3: rapid-loss flag firing rate drops by 40% versus baseline.
  Zero user reports of "the app let me eat too little."

### Move 2: ED-pattern detection state machine with explicit lockout

What ships:

- New Supabase table: `ed_pattern_flags(user_id, flag_state, reason,
  raised_at, cleared_at)`.
- New module: `edPatternDetector.js`. Multi-signal flag fires on
  rapid weight loss + low energy + "under" adherence for 2+ weeks +
  repeated weight-only check-ins.
- When flag fires, engine refuses further deficit and surfaces an
  explicit lockout card with upward-counterfactual copy: "We've held
  your calorie cut. Once your energy scores recover for two weeks,
  we'll consider new targets."
- Single signposting card linking to Beat (UK) and equivalents.
- Lockout is not silent. Silent locks erode trust and read as
  gaslighting if the user does not know why their cut stopped.

Signals:

- Month 1: flag fires on under 2% of users with no more than 1 in 5
  flags reversed by manual review.
- Month 3: among users where the flag fired, 12-week retention is
  within 5 points of non-flagged users.

### Move 3: Upward-only compressed calorie gate

What ships:

- Amend `computeAdaptiveTDEEAdjustment()` in `nutritionEngine.js` to
  accept a `rapidLossOverride` flag from `weeklyCoach.js`.
- When the rapid-loss safety flag fires (-1.5% BW/week with energy <=
  2), compress the upward calorie adjustment cycle from two weeks to
  one and bypass `consecutiveOffTargetWeeks`.
- Downward cuts retain full gates. Compression is upward-only because
  the safety logic is asymmetric: failing to add calories fast enough
  when losing too quickly is a RED-S risk path; failing to cut fast
  enough is only a goal-pace risk.

Signals:

- Month 1: among rapid-loss-flagged users, time-to-corrective-increase
  drops from 14 days to 7.
- Month 3: zero cases of users staying below 30 kcal/kg FFM/day for
  more than 14 consecutive days.

### Move 4: Differential paywall output with 2-of-3 threshold

What ships:

- New `differential_output` block in the weekly coach output schema.
- When a free user reports adherence as "under" or "over" in 2 of the
  last 3 check-ins, the relevant card surfaces a "with food data, this
  card would have said X" preview tied to a 14-day Pro trial CTA.
- 2-of-3 window matches the existing `consecutiveOffTargetWeeks`
  logic and tolerates one missed check-in. Single off week is too
  aggressive (paywall ambush). Two consecutive weeks loses signal.

Conversion copy (max 25 words each, no blocklist terms):

- **Stalled lift:** "Your bench has stalled for three weeks. With food
  data, we could tell you if it's training or fuel. Try Pro free for
  14 days."
- **Extreme soreness:** "Your soreness scores are stacking up. Food
  intake usually explains half of recovery. See yours with Pro, free
  for 14 days."
- **Deload:** "We're holding a deload this week. With food data, we'd
  know if your fuel is the cause. Pro shows you, free for 14 days."
- **Missing TDEE:** "Your weight is moving faster than your calories
  suggest. Pro tracks your true daily burn from your own data. 14 days
  free."
- **Block summary** (renamed from "mesocycle summary" because
  `mesocycle` is on the blocklist): "Your training block ended. With
  food data, we'd show how fuel shaped your results. Try Pro free for
  14 days."
- **Energy crash:** "Your energy scores have dropped two weeks
  running. Food data usually shows why. Pro can tell you. 14 days free."

Signals:

- Month 1: free-to-trial conversion on this trigger above 3%.
- Month 3: trial-to-paid conversion above 35% for users who saw 2+
  differential cards during trial.

### Move 5: Three-tier infrastructure migration + B2B groundwork

What ships:

- `proGate.js` adds `Tier.COMPLETE`. New `isPaidTier(user)` helper
  returns `'free' | 'pro' | 'complete'`. New `hasFeature(user,
  feature)` and `hasGoalUnlock(user, feature)` helpers.
- New Supabase table: `tier_history(user_id, from_tier, to_tier,
  reason, source_surface, occurred_at)`.
- New Supabase table: `engine_overrides(user_id, week_start,
  override_field, original_value, override_value, coach_id, reason)`
  for B2B phase two. Engine reads overrides at output time; original
  values continue to feed trend tables.
- Server-side `upgradeTier(userId, fromTier, toTier, paymentToken)`
  function whitelisted by the existing Supabase tier-protect trigger.
- Trial state enum: `complete_trial_active`, `pro_trial_active`,
  `paid_complete`, `paid_pro`, `free`, `cascade_expired`.
- Per-tier trial entitlements. A Pro trial does not consume the
  Complete trial entitlement; cascade flow handles transitions.

Signals:

- Month 1: 100% of new signups have a `tier_history` row. The
  Supabase trigger blocks all client-side upgrade attempts in QA.
- Month 3: zero tier-state inconsistencies in production logs. The
  `engine_overrides` table is exercisable from a feature-flagged
  internal admin tool.

---

## 4. Findings by domain

### Engine safety

Both Gemini and ChatGPT proposed the 30 kcal/kg FFM/day energy floor.
Claude's adjudication confirmed this is the correct number, citing
Mountjoy et al. 2023 (Br J Sports Med 57:1073-1097, DOI
10.1136/bjsports-2023-106994). The 2023 update splits LEA into
"adaptable" (30-40 kcal/kg FFM/day, mild and reversible) and
"problematic" (typically below 30, weeks or longer, with measurable
health and performance impairment). The original 2014 IOC consensus
(Br J Sports Med 48:491-497) introduced the threshold. The 2018 update
retained it. Operationally, 30 is now explicitly labelled
"problematic" below sustained exposure, strengthening rather than
weakening its use as a coaching-app floor.

ChatGPT proposed silent lockout when the ED-pattern flag fires. Claude
overrode: silent locks erode trust. Lockout must be explicit, with
upward counterfactual copy explaining what is held and what unlocks
it. Evidence base: Eikey 2021 (BJPsych Open 7:e176, DOI
10.1192/bjo.2021.1011), Moody et al. 2025 (European Eating Disorders
Review 33:1288), Messer 2025 commentary on Cruz et al. (IJED).

### Food logging architecture

Both passes agreed on a minimum-viable food logging layer (manual
entry, common foods database, optional barcode scan later). Claude
bundled food logging with the FFM guardrail as move #1 because they
unlock each other.

Schema decisions:

- `foods` table holds the canonical food records (id, name, serving
  size, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  source). Source field allows mixing OpenFoodFacts, USDA, CoFID, and
  user-created entries.
- `food_entries` table holds user logs (id, user_id, food_id,
  consumed_at, meal_slot, quantity_g, notes). Server-side.
- `daily_intake_rollups` table holds derived totals for fast engine
  reads (user_id, date, kcal, protein_g, carbs_g, fat_g,
  entries_count). Maintained by trigger or scheduled aggregation.

No barcode scan, no OCR in move #1. Those land later, gated on
move #1 telemetry.

### Jargon blocklist extension

ChatGPT argued for extending the seven-term blocklist. Claude agreed,
citing Lang et al. 2025 (JMIR, DOI 10.2196/50862): jargon density
predicts comprehension failure in lay readers. CDC's Everyday Words
for Public Health Communication and the Plain Language Information
and Action Network both call for plain replacements wherever
available.

Terms to add to `JARGON_BLOCKLIST`:

- `metabolic adaptation` → "your body has adjusted"
- `training stimulus` → "muscle growth signal"
- `stimulus-to-fatigue ratio` → "training payoff"
- Bare researcher surnames in surface copy (Helms, Schoenfeld, Morton,
  etc.). Citations move into a tappable "why this advice" panel.

Gemini's minimalist position underestimates the harm of jargon for
the at-risk subgroup Eikey 2021 documents.

### Differential paywall output

Gemini proposed showing the differential on the first off-target
week. ChatGPT proposed two consecutive weeks. Claude landed on 2-of-3
(matches existing `consecutiveOffTargetWeeks` logic, tolerates one
missed check-in).

### Three-tier infrastructure

Neither pass mapped the actual upgrade path. The current `proGate.js`
has two tiers only. Migration prerequisites are non-trivial: server-side
`upgradeTier()`, `tier_history`, per-tier trial entitlements,
feature-flag groundwork for Complete-only surfaces even though no
Complete features ship in this phase.

---

## 5. Citations: pressure-tested and corrections

### Confirmed and usable

- **Mountjoy et al. 2014** (Br J Sports Med 48:491-497). Original IOC
  RED-S consensus introducing the 30 kcal/kg FFM/day threshold.
- **Mountjoy et al. 2023** (Br J Sports Med 57:1073-1097, DOI
  10.1136/bjsports-2023-106994). 2023 update splitting LEA into
  adaptable and problematic.
- **Refalo, Trexler, Helms 2025** (Strength & Conditioning Journal,
  DOI 10.1519/SSC.0000000000000888). Range is **2.5 to 4.2 g/kg
  FFM/day** for the high-risk high-importance FFM-retention tier, not
  "up to 2.5 g/kg FFM" as the source briefs implied. Practical
  takeaway: the Optimised tier (2.5-3.0 g/kg BM) maps cleanly to the
  paper's mid-range when scaled to FFM; the Advanced tier (2.8-3.3
  g/kg BM) is defensible for lean physique competitors.
- **Kuhl, Artelt, Hammer 2023** (arXiv 2306.07637, Springer LNCS DOI
  10.1007/978-3-031-44070-0_14). N = 161 user study. Upward
  counterfactual explanations significantly outperform downward and
  no-explanation conditions on task performance and explicit knowledge.
  Anchors the voice rule.
- **Eikey 2021** (BJPsych Open 7(5):e176, DOI 10.1192/bjo.2021.1011).
  Qualitative study, 24 participants. Apps trigger and exacerbate ED
  symptoms through over-quantification, promotion of over-use, and
  visual cues that misalign with user goals.
- **Eikey & Reddy 2017** (CHI '17 proceedings). Qualitative interviews
  with 16 women with ED histories. Sets up the 2021 research line.
- **Moody et al. 2025** (European Eating Disorders Review 33(6):1288).
  Systematic review. Supports active over passive intervention when
  ED-pattern signals fire.
- **Lang et al. 2025** (JMIR, DOI 10.2196/50862). 1,241 NIHR plain
  language summaries analysed. Jargon density predicts comprehension
  failure. Anchors the blocklist extension.
- **Escalante et al. 2021** (BMC Sports Sci Med Rehabil 13:68, DOI
  10.1186/s13102-021-00296-y). Peak Week recommendations for
  bodybuilders. Defensible primary reference for refeed prescription
  in `aggressive_cut + contest_prep`.
- **Morton et al. 2018** (Br J Sports Med 52:376-384). Protein cap
  reference. Stays as the engine's protein cap for unknown-BF% cases.
- **Helms et al. 2014.** Cited by Refalo 2025 as the predecessor for
  the 2.3-3.1 g/kg FFM recommendation.

### Corrections required to live code and docs

- **Citation correction in locked decisions.** The upward
  counterfactual rule was attributed to "Hügle 2023" in earlier
  briefs. arXiv 2306.07637 is **Kuhl, Artelt, Hammer 2023**, not
  Hügle. Brief C already records this correctly; older docs need
  updating only if they survive into the implementation phase.
- **`nutritionEngine.js` carries a fabricated citation.** A comment
  attributes a 2024 SportRxiv preprint as the basis for activity
  multiplier choices. Direct search returned no such preprint. The
  claim originates in practitioner blogs (Mike Matthews / Legion
  Athletics). The closest legitimate scientific anchor is Pontzer et
  al. 2016 (Current Biology 26:410-417, DOI
  10.1016/j.cub.2015.12.046) on constrained TDEE, with Davy et al.
  2025 (PNAS, DOI 10.1073/pnas.2519626122) arguing the opposite
  position. Action: replace the comment with: "Activity multipliers
  tuned downward from generic Mifflin-St Jeor and Harris-Benedict
  tradition based on coaching observation that standard values
  overestimate gym-only TDEE. Theoretical basis in the constrained-TDEE
  literature (Pontzer 2016) is contested by Davy et al. 2025."

---

## 6. What neither pass surfaced

### HealthKit and Health Connect specifics

Verified: both platforms technically allow third-party nutrition
writes. HealthKit's `HKQuantityTypeIdentifierDietaryEnergyConsumed`,
`HKQuantityTypeIdentifierDietaryProtein` and related dietary
identifiers are writable as part of an
`HKCorrelationTypeIdentifierFood` correlation. Health Connect supports
`WRITE_NUTRITION` (Android API 34+, dangerous protection level) for
`NutritionRecord`.

Policy: strict read-only on both. Reasons:

- Writing to system health stores creates duplicate-source attribution
  when users also log in MyFitnessPal or Cronometer. Volyume's
  adaptive TDEE then reads back its own writes, contaminating the
  EWMA.
- Writes to Health Connect create UK GDPR special-category data flows
  that Volyume becomes a controller for, expanding scope.
- Marginal user value of writing nutrition to a system store is low
  when the in-app experience already shows totals.

### B2B coach override schema (phase one groundwork)

Phase two B2B coach dashboard requires manual overrides of engine
output without breaking the EWMA, held-decisions array, or
`consecutiveOffTargetWeeks` counter. Pattern:

- New `engine_overrides` table (see move #5).
- Engine reads overrides at output time; original values continue to
  feed trend tables.
- Held-decisions array gains a `coach_override_applied: true` key.
- Removing the coach automatically restores engine-only output.

Schema ships in phase one even though no B2B UI exists.

### Regulatory posture (UK GDPR, US FTC HBNR)

Under UK GDPR and EU GDPR Article 9, weight, body composition,
dietary intake combined with health-state inference (deficit
recommendations, RED-S flags) qualifies as special category data.
Requires explicit consent under Article 9(2)(a), separate from
standard processing consent. Standard wellness app consent flows are
not sufficient.

Under US HIPAA, the app is not a covered entity in direct-to-consumer
use. But the FTC Health Breach Notification Rule (finalised 26 April
2024, effective 29 July 2024, Federal Register publication 30 May
2024) applies to direct-to-consumer health apps. For breaches
involving 500+ people, the FTC requires notification at the same time
as affected individuals, without unreasonable delay, no later than 60
calendar days after discovery.

Actions:

- Add an Article 9 explicit consent screen at signup. Named "Health
  and nutrition data consent." Separate from the ToS click-through.
- Add FTC HBNR breach notification language to the privacy policy.

### Pro -> Complete upgrade journey

No path exists in current `proGate.js`. Migration prerequisites
recorded in move #5. The 14-day trial logic split per tier is the
highest-risk migration item.

---

## 7. Voice rules

Locked. Applied to all surface copy, code comments, commit messages,
and store listings.

- No em dashes. Full stop, comma, or colon. Rewrite if needed.
- No AI tells: "let me", "I'll", "I'd be happy to", "certainly",
  "absolutely", "dive into", "delve into", "leverage", "utilise",
  "facilitate", "robust", "seamless", "streamline", "comprehensive",
  "ensure" as filler, "it's important to note", "may potentially",
  "could possibly".
- British English spelling: optimise, colour, analyse, behaviour,
  centre. Code identifiers keep ecosystem spelling (color, center).
- Plain spoken. Short sentences. No marketing jargon.
- Volyume sits alongside coaches, not above them.
- Jargon blocklist (extended): the original seven plus `metabolic
  adaptation`, `training stimulus`, `stimulus-to-fatigue ratio`, bare
  researcher surnames in surface copy.

---

## 8. Open items deferred to follow-up

Three open questions from Claude's adjudication that still need a call:

1. **ED-pattern false-positive override path.** If the flag fires on
   a user on an aggressive but well-supervised cut (physique
   competitor, for example), the lockout is wrong. What override path
   exists? Coach attestation? Self-attested goal lock? An override that
   itself triggers a held-decision card for review? Without this,
   move #2's harm-prevention upside is offset by churn risk in the
   exact segment the Advanced protein tier was built for.

2. **Data retention and deletion for ED-pattern flag data.** UK GDPR
   Article 17 gives a right to erasure. The flag itself is
   special-category data. Does Volyume retain anonymised flag-rate
   metrics? Does it delete the flag along with all derived state?
   Does the FTC HBNR path apply if the flag-state leaks? Privacy
   review required before move #2 ships.

3. **Complete-tier pricing differential justification.** The £3.49 to
   £6.99 spread above Pro is now backed by named features (history
   window, Peak Week module, photo timeline, coach link, share-pack
   PDF export). Need a final-pass copy review to make sure marketing
   surface reflects that.

Plus follow-ups from `COMPLETE_TIER_SCOPE_LOCKED.md`:

- Share-pack PDF format (single page, multi-page, branded template).
- Coach link mechanism (Volyume B2B accounts vs. one-time share URL
  with expiry).
- Photo progress timeline storage (on-device only vs. Supabase
  Storage with privacy review).

---

## 9. Immediate code corrections (no new moves required)

These are fixes to live files independent of the move sequence. They
can land before move #1 if desired.

- **`src/lib/nutritionEngine.js`:** remove the fabricated SportRxiv
  2024 citation. Replace with the Pontzer 2016 / Davy 2025 note above.
- **`src/lib/whyThisTemplates.js`:** extend `JARGON_BLOCKLIST` with
  `metabolic adaptation`, `training stimulus`,
  `stimulus-to-fatigue ratio`. Update `checkJargon` tests accordingly.
- **Existing surface copy audit:** scan `src/screens/` for bare
  researcher surnames in user-facing strings. Move citations to
  tappable info panels using the existing `InfoTooltip` pattern.

---

## 10. Next step

This document is the synthesis. The next deliverables are:

- File-level integration plan for move #1 (food schema + manual entry
  + FFM floor). Names every new file, every modified file, every new
  Supabase migration, every new test file.
- Resolution of the three open questions above so move #2 is
  unblocked.
- Founder pricing window decision (how long the £1.49 / £3.49 prices
  hold, what triggers the rise to £2.99 / £6.99).
