# PASS 3 — GAP ANALYSIS (reconcile Pass-1 code reality vs Pass-2 corroborated market findings)

Method: each row takes a **CORROBORATED** Pass-2 finding (C1–C18 from `pass2-adjudication.md`, ≥2-of-3,
contamination excluded) and reconciles it against **Pass-1 verified code** (cited at exact file:line from
the Pass-1 section docs, or located read-only this pass where Pass-1 hadn't enumerated the UI feature).
Verdicts: **WHITE-SPACE** (market lacks, Volyume has = differentiator) · **LEAD** (ahead) · **PARITY** ·
**PARTIAL** · **BEHIND** · **MISSING** · **NEEDS-LOCATION** (corroborated need, but the Volyume side needs
a Tier-B locate before a blueprint acts). No guessing: where I could not cite code, I say NEEDS-LOCATION,
not "probably". Founder certifies; I do not self-certify.

Single-source Pass-2 leads (section D of the adjudication) and rejected/contaminated claims (FF1/FF2/CF6)
are NOT treated as established needs here.

---

## RECONCILIATION TABLE

### C1 — Closing the full loop (calories + training + steps + cardio off ONE weight trend)
- Market (C1, 3/3): no competitor closes it — MacroFactor/Carbon nutrition-only; RP/Juggernaut training-only.
- Volyume: `runWeeklyCoach` closes ALL four off the EWMA weight trend in one pass —
  calories (`weeklyCoach.js:766-785`), volume/training signal (`autoregulationMatrix weeklyCoach.js:176-191`),
  steps (`weeklyCoach.js:873-883`), cardio (`weeklyCoach.js:913-914`), trend basis (`weeklyCoach.js:39,:577`).
- **VERDICT: WHITE-SPACE / strongest differentiator.** This is the headline positioning (matches the
  unanimous external "white-space" call). No build needed; it's a marketing/lead-protection asset.

### C2 — Adherence handling (neutral vs strict)
- Market (C2, 3/3): MacroFactor adherence-NEUTRAL (adjusts off trend, no guilt) is preferred over Carbon
  adherence-STRICT (refuses to adjust on non-compliance).
- Volyume: hybrid — adjusts off the weight trend (neutral-like) BUT stabilises rather than guilt-trips on
  low engagement: `sessionAdherence < 0.5 → stabilise` (`weeklyCoach.js:620-621`); calorie changes gated by
  cooldown + off-target persistence (`weeklyCoach.js:668,:692-693`), not by shaming.
- **VERDICT: PARITY+ (sits on the preferred neutral side, with a non-punitive stabilise path).**

### C3 — Deterministic / no-LLM as a trust asset
- Market (C3, 3/3): LLM coaching distrusted as "slop"/hallucination; deterministic is actively preferred.
- Volyume: entire engine deterministic, no LLM (CLAUDE.md sacred boundary; Pass-1 Section 2 is all
  hardcoded thresholds/formulas).
- **VERDICT: LEAD (aligned with the market's stated preference; do NOT add LLM coaching).**

### C4 — Progressive disclosure / single-product beginner→elite
- Market (C4, 3/3): progressive disclosure is THE dual-audience mechanism; no app spans beginner→elite well.
- Volyume engine IS experience-tiered: `SURPLUS_EXP_MULT` beginner→competitive (`nutritionEngine.js:709-714`),
  `GAIN_RATE_TARGETS` by experience (`:718-723`), physique divisions auto-advanced (`ADVANCED_PROTEIN_GOALS
  :701-704`), `goal_lock_advanced` raises ED-fire bar 2→3 signals (`edPatternDetector.js:23-24`), coaching
  register block (`SettingsCoachingScreen.js:127`).
- **VERDICT: LEAD at the engine layer; NEEDS-LOCATION at the UI layer** — whether the *interface* itself
  progressively discloses (beginner clean view → elite depth) is not Pass-1-verified. Flag for Pass-4.

### C5 — Jargon alienates beginners
- Market (C5, 3/3): RIR/mesocycle/MEV-MRV jargon is the #1 beginner barrier; needs tooltips/plain language.
- Volyume: `WHY_LIBRARY` is explicitly plain-English, jargon-free, locked voice (`weeklyCoach.js:254-297`);
  coachResponse honesty-tested (Pass-1 + `coachResponse.test.js`).
- **VERDICT: LEAD/PARITY (already speaks plainly). Pass-4 check: are in-app *labels* equally jargon-free?**

### C6 — UK food-DB localisation moat
- Market (C6, 3/3): curated UK DB (Nutracheck ~500K verified items) beats crowdsourced; real moat.
- Volyume: UK/EU, British English, UK food DB (CLAUDE.md ARCHITECTURE). Pass-1 data model holds nutrition
  tables (Section 3), but the food-diary/DB screens were **Tier-B deferred** (Section 1 note: "VERIFY their
  gate lines… Diary/Nutrition").
- **VERDICT: PARITY/moat-aligned, NEEDS-LOCATION** — locate the food-DB source + coverage before any
  Pass-4 nutrition blueprint. (Rating conflict CF1 does NOT affect the DB-quality conclusion.)

### C7 — WCAG touch targets (44×44; EAA legal floor in EU)
- Market (C7, 3/3 standards): 24px AA / 44px AAA; 44 practical for mid-workout. Volyume is EU → EAA applies.
- Volyume: 189 touch-targets located with `hitSlop|minHeight:44/48|minWidth:44/48` (Pass-1 Section 8 /
  `extract/s8-touch.txt`).
- **VERDICT: PARITY, NEEDS-AUDIT** — 189 are compliant; Pass-4 must check whether *every* interactive
  element clears 44, not just these 189. Concrete checkable Pass-4 item.

### C8 — Retention is the battlefield (streaks/PRs)
- Market (C8, 3/3): retention (not features) is the failure; streaks/PRs/early-engagement retain.
- Volyume: weekly streak system (`useWeeklyStreak.js`, `WeeklyStreakStrip.js`, `StreakWeeksSection.js`,
  `lib/streak.js`, `lib/streakState.js`), PR celebration (`PRCelebration.js`).
- **VERDICT: PARITY (mechanics present).**

### C9 — Streak-freeze / no-guilt framing
- Market (C9, 2–3/3): all-or-nothing guilt churns; streak-freeze/forgiving framing retains.
- Volyume: streak **freezes on an open ED-pattern flag or a positive wellbeing screen**
  (`useWeeklyStreak.js:9`; `pausedWeekKeys`/high-water in `streakState.js`) — a *safety-aware* freeze, not
  just a missed-day freeze.
- **VERDICT: LEAD (ED-safe streak-freeze is ahead of the market's plain streak-freeze).**

### C10 — AI photo/voice logging is inaccurate & distrusted
- Market (C10, 3/3): Cal AI/SnapCalorie 15–40% error; trust fragile.
- Volyume: deterministic manual logging, no LLM photo estimation (by design, C3).
- **VERDICT: NOT A GAP (Volyume's design sidesteps the failure mode). Do not add AI photo logging.**

### C11 — Weekly check-in: short + conditional + wellbeing
- Market (C11, 3/3): ~3-question, branches on adherence; wellbeing/recovery inputs (sleep/soreness/readiness).
- Volyume: check-in feeds recovery score from energy/soreness/stress (`weeklyCoach.js:144-154`), sleep
  (`sleepHours`, deload trigger `:974-979`), menstrual + travel/illness/injury via `parseNoteFlags`
  (`weeklyCoach.js:313`); conditional logic throughout (adherence `:620`, safety hold `:645-651`,
  cooldown `:668`).
- **VERDICT: PARITY/LEAD (wellbeing-aware + conditional already). Pass-4 check: question COUNT/length.**

### C12 — Onboarding: value <~60s, no jargon/paywall-first
- Market (C12, 3/3): fast time-to-value; paywall-or-jargon-before-value kills beginners.
- Volyume: onboarding forks on tier (`RootNavigator.js:1138` ProOnboardingStack/FirstRunStack); plan
  generation via planEngine (Pass-1 Section 2 lists planEngine.js).
- **VERDICT: NEEDS-LOCATION** — first-run flow timing/jargon/paywall-position not Pass-1-verified. Locate
  the onboarding screens before a Pass-4 onboarding blueprint.

### C13 — Trend smoothing + recomposition reframing
- Market (C13, 3/3): moving-average trend is standard; flat-weight recomp must be reframed (photos/measures/PRs).
- Volyume: `computeEWMA` (`weeklyCoach.js:39`, `nutritionEngine.js:158`), robust trend (`:577`), recomp
  phase (`PHASE_CONFIG weeklyCoach.js:196-204`; `PHASE_ADJUSTMENTS recomp -0.05 nutritionEngine.js:27-35`).
- **VERDICT: PARITY on smoothing; recomp *framing in UI* NEEDS-LOCATION (esp. given C14 photo gap below).**

### C14 — Progress photos + body measurements (top demand)
- Market (C14, 3/3): photos + measurements are top requests; photos private-by-default norm.
- Volyume: body MEASUREMENTS present — chest/shoulders/arms/forearms/waist/hips/quads/hamstrings/calves +
  weight + trend charts (`BodyMetricsScreen.js:57-94,:415-416`). Progress PHOTOS: **no match anywhere in
  src** (grep `progressphoto|body.?photo|photoUri.*progress` → 0 files).
- **VERDICT: MEASUREMENTS = PARITY; PHOTOS = MISSING (genuine gap).** Candidate Pass-4 build: progress
  photos, private-by-default — directly supports the recomp reframing in C13.

### C15 — Tiered autonomy (Coached / Collaborative / Manual)
- Market (C15, 2/3): MacroFactor's three modes let elite users wrest manual control; granular overrides expected.
- Volyume: coached-by-default; manual-goal editor explicitly "a later pass" (`useWeeklyStreak.js` docstring);
  override paths exist for cycles/competition (`cycleOverride`, macro-cycle `weeklyCoach.js:1020-1021`,
  contest-prep refeed/diet-break) but no general Coached/Collaborative/Manual toggle located.
- **VERDICT: PARTIAL/BEHIND** — elite manual-override mode is a real, corroborated gap for the advanced end
  of the dual audience (ties to C4). Candidate Pass-4 item; weigh against the deterministic-safety boundary
  (manual overrides must NOT bypass the FFM/ED floors — see C-SAFETY note).

### C16 — Exercise library (≈250→1,400; video; custom + smart substitutions)
- Market (C16, 3/3 shape): video/animation demos; custom exercises + substitutions expected; size 250→1,400.
- Volyume: substitution engine present (`getExerciseSubstitutes algorithms.js:785-812`, top-3 by SFR+stretch);
  exercise library is a FREE feature (CLAUDE.md). Library SIZE + demo format (video/animation) NOT
  Pass-1-verified.
- **VERDICT: PARITY on substitutions; NEEDS-LOCATION on library size + demo media.** Locate before any
  Pass-4 library blueprint.

### C17 — Real periodisation (mesocycles/deloads), not daily rotation
- Market (C17, 3/3): RP/Juggernaut mesocycle periodisation respected; Fitbod daily-rotation criticised.
- Volyume: `VOLUME_LANDMARKS` (`algorithms.js:20-54`), deload prescription (`:1474-1482`), adaptive landmarks
  (`:1005-1041`), deload scoring/triggers (`:727-763`, `weeklyCoach.js:974-979`), diet-break/refeed cadence
  (`nutritionEngine.js:1041-1062`), phase config (`weeklyCoach.js:196-204`).
- **VERDICT: LEAD/PARITY (genuine autoregulated periodisation, not plausible-looking rotation).**

### C18 — Reading HRV/sleep recovery to drive training volume
- Market (C18, 3/3, but FF3 shared-source): top loggers ignore HRV; HRV→volume is the most-wished gap.
- Volyume: recovery is **self-reported** (energy/soreness/stress/sleepHours → `getRecoveryScore
  weeklyCoach.js:144-154` → `autoregulationMatrix :176-191`). Health integration reads **steps + weight
  only** (`health.js`: Steps `:454,:464`, weight `:361,:371`; **no HRV, no wearable sleep ingest**).
- **VERDICT: BEHIND on automated HRV ingestion / PARITY on intent** — Volyume already down-regulates volume
  on poor recovery, just from subjective inputs not sensor HRV. Candidate Pass-4 lead: ingest HRV/sleep
  (Pro, per CLAUDE.md wearables) to feed the EXISTING readiness path — high-value, low-architecture-risk
  because the consumer (`autoregulationMatrix`) already exists.

---

## C-SAFETY (cross-cutting, non-negotiable) — carry into every Pass-4 item
Any Pass-4 build touching coaching/nutrition (esp. C15 manual mode, C18 HRV) MUST NOT bypass the verified
safety floors: FFM floor `nutritionEngine.js:119,:614` + apply-layer `coachApply.js:22` (1200) + sex floor
`nutritionEngine.js:792` (1500 M/1200 F) + hard-gate loss `:104,:808` (1.5%/wk) + ED detector
`edPatternDetector.js` + FFM-floor hold `weeklyCoach.js:837-862` + ED lockout `:1105-1163`. These are
tier-blind (`proGate.js:22-23`) and must stay so. (CLAUDE.md SAFETY SYSTEM — DO NOT TOUCH.)

---

## SUMMARY FOR PASS 4 (what the triangulated gap analysis produces)

**Differentiators to protect / market (no build, or marketing only):**
- C1 full-loop white-space · C3 deterministic-no-LLM · C9 ED-safe streak-freeze · C17 real periodisation ·
  C2 non-punitive adherence · C5/C11 plain-language wellbeing-aware coaching. These survive triangulation
  as genuine, code-backed leads.

**Genuine GAPS (candidate Pass-4 builds, in rough value order):**
1. **C14 — Progress photos** (private-by-default). Clear MISSING; high demand; supports C13 recomp framing.
2. **C18 — HRV/sleep ingestion → existing readiness path** (Pro). Consumer already exists; low arch-risk.
3. **C15 — Manual/Collaborative coaching mode** for the elite end (must respect C-SAFETY floors).

**NEEDS-LOCATION before any blueprint acts (Tier-B locate first — do NOT guess):**
- C4 UI progressive disclosure · C6 food-DB source/coverage · C7 full 44px audit (beyond the 189) ·
  C12 onboarding flow timing/jargon/paywall position · C13 recomp UI framing · C16 library size + demo media.

**Established by ABSENCE (favours Volyume, do not overstate):**
- No competitor has an always-on / FFM-based calorie floor or ED-pattern detection (MacroFactor's is opt-in
  1,200 only; competitor guardrails NOT FOUND across all 3 reports). Volyume's safety stack is a real lead.

I have not self-certified. This reconciliation is checkable: every Volyume claim cites a Pass-1 file:line or
a read-only location found this pass; every market claim cites a corroborated C-finding in the adjudication.
If any row fails your check against the code or the adjudication, it fails.
