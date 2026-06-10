# Competitive Audit 2026-06-10 — Executive Summary

> The complete audit: Phase 1 codebase baseline (read line-by-line),
> 14 parallel competitive research reports (App Store/Play reviews,
> Reddit via aggregators, forums, teardowns, industry benchmark data —
> every claim cited in the per-area files), a 14-area comparison
> matrix, and 30 scored proposals. This page is the five-minute
> version.

---

## Where Volyume genuinely leads the market

1. **The transparent coach.** Held decisions — explaining every
   adjustment *not* made — exist nowhere else shipping today (the only
   precedent, Avatar Nutrition, is dead). Explicit Apply consent on
   every change is unique. The research is unambiguous that opacity,
   not algorithm quality, is the category's retention killer; Volyume
   built the antidote and hasn't told anyone.
2. **Safety architecture.** FFM energy floor, ED-pattern lockout with
   signposting, rapid-loss compression, hard calorie floors. No
   competitor has anything comparable — and the market's record is
   actively bad (73% of MyFitnessPal users with eating disorders said
   the app contributed). This is both a moral position and an
   uncopyable trust asset.
3. **Division-specific plan generation.** Eight bodybuilding divisions
   with division-aware volume ceilings and named splits. Uncontested
   by any app; only human coaches offer it.
4. **Offline-first — including food.** Offline *nutrition* logging
   with a bundled UK database is a category outlier (MacroFactor is
   "limited", Cronometer won't, Yazio can't). Plus crash/stale session
   recovery and export/backup that already match the FitNotes trust
   formula.
5. **Steps & cardio philosophy.** Energy-balance ownership of cardio
   calories is the validated category answer, and nobody else ships
   automatic, phase-banded, compliance-gated step targets.
6. **Monetisation configuration.** Hevy-pattern generous free tier,
   cardless 14-day trial in the highest-converting band, contextual
   coach-computed paywall triggers ahead of all ten apps studied, and
   a price on the category median for a bundle MacroFactor alone sells
   at roughly double.
7. **Check-in intelligence.** Pre-deriving answers from logged data
   and asking the user to confirm/override is unclaimed ground across
   the entire field.

## Where it matches the field

Adaptive TDEE maths (MacroFactor-conceptual); plan quality mechanics
(per-set targets, landmarks); food capture tooling (barcode, OCR,
recipes, saved meals); design-system fundamentals (token rigour and
accessibility are actually ahead — perception lags); reliability
engineering (the category's stability median is high; Volyume's
architecture clears it).

## The ten improvements with the biggest effect on users

| # | Proposal | Why |
|---|---|---|
| 1 | **COMP-001 Workout screen redesign** | Every user, every session; full spec ready |
| 2 | COMP-004 Always-visible trend/expenditure surface | Turns the engine's biggest perceived weakness into its visible strength; all maths already computed |
| 3 | COMP-005 Free Monthly Recap + block-end recap | The category's most-loved artefact, currently locked behind a 365-day wait; renderer exists |
| 4 | COMP-014 Exercise visuals (staged) | The audit's only below-category-floor finding: 0% visual coverage vs ~100% at the top |
| 5 | COMP-002 Meal-slot memory + portion prefill | The single highest-leverage food-logging speed feature, fully deterministic |
| 6 | COMP-006 Publish "How Precision Coaching decides" | The moat exists; make it legible (MacroFactor proved this converts) |
| 7 | COMP-015 Visible per-muscle session autoregulation | The shared engine of the top three plan apps; extends existing deterministic machinery |
| 8 | COMP-008 Survey diet (7→3 post-workout) + Fast Check-In | Completion-rate lever on the engine's two data feeds |
| 9 | COMP-007 Paywall social proof + annual-first | The best-evidenced pure conversion lever found |
| 10 | COMP-009 Pre-migration snapshot + SSO merge guard | Makes the category's two reputation-fatal data-loss classes impossible |

## Five quick wins that could ship immediately

1. **Quick-add kcal/macros** (COMP-003) — in every top-5 logger; one sheet.
2. **Wire in the plate calculator** (COMP-021) — component already built and tested.
3. **Cardio "already counted" explainer line** (COMP-011) — one sentence that guards the engine's credibility.
4. **Trust row on Welcome + store listings** (COMP-012) — "Works fully offline · Your data exports anytime · No ads" is true and currently invisible.
5. **"Building your plan" reveal moment** (COMP-013a) — +17% paying conversions in the cited A/B evidence; honest staging of real engine phases.

## The workout screen, in plain terms

**The problem:** the inputs are excellent — one tap logs a prefilled
set, the steppers and CTA are the best touch targets in the category —
but everything *around* them is built for reading at a desk, not
glancing at in a gym. The most important context a lifter needs
("last time: 60kg × 8") is the smallest text on the screen, in italic
grey, while five overlapping coaching chips, a five-button action row
and a four-button rest-timer adjuster stack ~29 tappable things around
it and push the logged-sets list off the bottom of a normal phone.

**The solution (full spec in the proposal doc):** one strong,
tappable "Last: 60 kg × 8 · Target 8–12 ↑" line replaces the chip
stack; one mechanism for previous numbers instead of four; the action
row drops to two buttons with the rest (including Remove) behind a
"⋯"; logged sets move directly under the Log button; the rest timer
goes to −15/+15/Skip; and nothing interactive renders below 13pt.
Element count falls from ~29 to ~19, logging stays one tap, and the
list of things that must not regress (prefill, steppers, CTA, cluster
sets, superset flow, accessibility) is untouched.

**Expected impact:** the gym-glance experience of Hevy (the
category's most-praised screen) with coaching intelligence Hevy
doesn't have — addressing the precise complaints (clutter, small
controls, "extra options during a workout") that the evidence shows
make people switch loggers, on the screen every user sees most.

## The single biggest opportunity no competitor owns

**Productise the transparency.** The market's most-documented failure
is trust: black-box coaches feel random, silent adjustments feel
arbitrary, and the apps that explain themselves (MacroFactor) win
loyalty far above their feature delta. Volyume already runs the only
engine that can honestly say: **"Every change has a reason. Every
non-change has a reason too — and it will refuse to harm you."**
Held decisions + safety floors + published methodology + a
daily-visible trend surface is a positioning none of the ten coaching
apps studied can copy without rebuilding their engines — and it costs
mostly presentation work, because the engine already does it.

## Honest caveats

- Phase 2 web evidence was gathered 2026-06-10; several agents had
  direct page fetches blocked and worked from search-extracted content
  of the cited sources, and Reddit was reached via aggregators. The
  load-bearing claims are multiply sourced; verify any single quote
  against its citation before using it in marketing.
- Two high-scoring proposals (COMP-030 onboarding resequencing,
  COMP-017 partner view) touch locked decisions and are flagged for
  founder/legal sign-off, not implementation.
- One housekeeping observation from the code read (not actioned):
  `catalogue.js` SKU ids (`pro_monthly`/`pro_annual`) differ from the
  product ids named immutable in CLAUDE.md
  (`volyume_pro_monthly`/`volyume_pro_annual`) — worth five minutes
  against Play Console.

## Document map

- `competitive-audit-00-volyume-baseline.md` — Phase 1 ground truth
- `competitive-audit-00-workout-screen-deep-audit.md` — the measured screen audit
- `competitive-audit-01-workout-screen-research.md` / `-proposal.md` — gold standard + implementable redesign
- `competitive-audit-01-{plan-generation, ai-coaching, nutrition-coaching, food-logging, progress-analytics, onboarding, exercise-library, monetisation, design-ux, performance-reliability, accountability-community, checkin-weekly-review, steps-cardio-activity}-research.md` — cited research per area
- `competitive-audit-02-comparison-matrix.md` — 14-area decision view
- `competitive-audit-03-master-proposals.md` — 30 scored proposals, tiered, with a 90-day sequencing recommendation
