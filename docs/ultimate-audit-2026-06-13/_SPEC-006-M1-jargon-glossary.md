# SPEC — ULTIMATE-006 / M1: jargon-translation layer (glossary copy)

Status: **SIGNED OFF** (2026-06-13) — founder approved all drafted glosses as-is (tweakable on device
later) and chose to FOLD the InfoTooltip 44px fix into 006. Building U-F-5 → U-D-3 → U-E-1/2 → U-B-9.
Source of truth: `ultimate-audit-04-proposals-with-blueprints.md` M1 = §U-F-5 + §U-D-3 +
§U-E-1 + §U-E-2 + §U-B-9; `phase1/15a-d-components`, `phase1/04-coaching`, `phase1/09-progress-analytics`.

## Why this is a spec, not a free build
Every M1 constituent is buildable mechanism (the `InfoTooltip` primitive + small on-screen
legends + a tone-keyed copy map) over **NOT-DETERMINED copy**. U-F-5 VERIFICATION: *"NOT-DETERMINED:
the exact teaching copy (must be spec/founder approved, not invented)."* U-B-9: *"a static
deterministic map only … Do NOT generate copy dynamically (no LLM)."* So the definitions are the
gated part: they must be **grounded in existing founder-approved copy**, not invented here. This spec
proposes each gloss WITH its source; the founder approves/edits the wording, then I build.

Presentation-only confirmation: M1 changes no engine logic, no `src/coaching/safety/`, no billing,
no gating, and does **not** amend `COACHING_VOICE_SYNTHESIS_LOCKED` (D2 verdict = presentation-only;
the tone field already exists). No AI/LLM — static authored strings only.

## Grounding sources (founder-approved, already shipping)
- **Methodology page** (`MethodologyScreen.js`, founder copy-gated): defines volume, holds/deload,
  steps→estimate, safety floors, "what it cannot do", and the Precision Coaching intro.
- **Shipping tooltips/legends** already teaching well (the house pattern, U-F-5 names these):
  `ReadinessCards` (1–5 scale stated in copy + tooltip), `ProgressSections` WorkloadCard (ACWR in an
  InfoTooltip), `BlockShapeCard` ("Ease in / Build / Push / Recover"), `ActiveWorkoutScreen` deload
  banner ("Light loads · full recovery · no PRs").

## Proposed glossary (tooltip-length, British English) — FOR SIGN-OFF
Legend: **[M]** = condensed from the Methodology page (founder-approved); **[S]** = from a shipping
tooltip/legend; **[A]** = no existing source → **FOUNDER TO AUTHOR/confirm** (do not ship my wording).

| Term (surface) | Proposed gloss | Src |
|---|---|---|
| Precision Coaching™ (Welcome/onboarding, U-E-1/2) | "Every week it reads your weight trend, check-in and training, compares what happened to what was expected, and explains the decision. Nothing is random." | [M] intro |
| Training volume / "volume" (heatmap, landing, coach) | "The total work for a muscle — the hard sets you do for it in a week." | [M] training |
| Deload / "Recovery week" (coach, home meso chip) | "A lighter planned week so you recover — lighter loads, full recovery, no PRs." | [M] holds + [S] banner |
| Maintenance calories (coach, nutrition) | "The daily calories that keep your weight steady — the starting point a change is measured from." | [A] |
| Refeed (coach, RefeedCard) | "A planned higher-carb day on an aggressive cut, to ease fatigue." | [A] |
| Macro cycle / carb cycling (coach, MacroCycleCard) | "Alternating higher- and lower-carb days across the week." | [A] |
| Est. max / estimated 1RM (SetEntry, Lifts) | "An estimate of the most you could lift once, worked out from your recent sets — you never have to test it." | [A] |
| Effort N/5 (BlockProgressCard; = 5 − RIR) | "How close to failure the set should feel: 5 = leave nothing, 0 = very easy." | [A] confirm direction |
| Heatmap bands Below / Optimal / Near / Over / No-data; "Over limit" (BodyDiagramHeatmap) | "How much you've trained a muscle this week vs the helpful range. 'Over limit' = past the point of extra benefit — not dangerous." | [M] training + [A] |
| Rep regression (EngineLog) | "Your average reps for a lift have trended down over recent weeks." | [A] |
| Streak glyphs kept / recovery / covered / paused (StreakWeeksSection) | reuse the EXISTING screen-reader summary verbatim as the visible key | [S] a11y summary (15c:207-208) |
| ACWR (Consistency) | already explained in WorkloadCard's InfoTooltip — reuse, do not re-author | [S] |
| Estimated daily burn / adaptive TDEE (Body Metrics) | "Our running estimate of the calories you burn a day, updated from your weight trend." | [M] steps |
| EWMA (Body Metrics) | "A smoothed version of your weight that ignores day-to-day noise." | [A] |
| Mesocycle / block (home, consistency) | "A training block — a few weeks that ease in, build, push, then recover." | [S] BlockShapeCard |
| RIR / "stop R short of failure" (home meso chip, U-E-1) | "Reps in reserve — how many reps you'd have left; 'stop 2 short' = leave 2 in the tank." | [A] |
| Level taxonomy Beginner→Elite (Lifts) | "Where your estimated max sits against typical lifters at your bodyweight." | [A] |

## Mechanism / build plan (once copy is signed off)
- Reuse `src/components/InfoTooltip.js`. (Its sub-44px target is U-F-2 / item 009; M1 adds more
  tooltips, so EITHER fold the 44px fix in here or sequence 009 first — **founder call**, flagged.)
- A single static term→gloss map module (e.g. `src/lib/coachGlossary.js`), no dynamic generation.
- U-B-9 tone keying: on the coaching screens, "Supportive"/free → show the gloss on first appearance;
  "Precise" → native numbers (no gloss). Keyed off the EXISTING tone field; no engine change.
- Per constituent, edit-gated + spec-cited, lint + full test, one commit at a time:
  U-F-5 (deep-data legends/tooltips) → U-D-3 (progress glosses) → U-E-1/U-E-2 (onboarding glosses) →
  U-B-9 (tone-keyed swap).
- Tests (the contract): every tooltip/legend has an `accessibilityLabel`; the StreakWeeksSection key
  is ABSENT under the ED/wellbeing suppression flag (U-F-5 edge case 15c:193); the glossary map has no
  empty strings.

## BUILD PROGRESS (takeover, 2026-06-13)
- [x] Foundation — `src/lib/coachGlossary.js` (the signed-off static map) + InfoTooltip ≥44px (`b272f38`).
- [x] **U-F-5** deep-data legends/tooltips (`b272f38`): BodyDiagramHeatmap bands (i); EngineLog 'rep
  regression' (i); StreakWeeksSection on-screen key (suppression-safe); SetEntry 'Est. max' (i);
  BlockProgressCard 'Effort N/5'.
- [x] **U-D-3** progress glosses (`4e351e9`): BodyMetrics 'Weight trend'→EWMA, 'Estimated daily burn'→
  adaptive-TDEE. Verified already-taught (left as-is): landing volume; Lifts relative-strength/level
  taxonomy (`LiftProgressScreen.js:172-175`); Consistency deload + training-block + ACWR tooltips.
- [ ] **U-E-1 / U-E-2** onboarding glosses — NEXT. Exact spots found:
  - `WelcomeScreen.js:24` — "Precision Coaching™ that adjusts your training and nutrition as your body
    responds" ALREADY carries an inline gloss; U-E-2 satisfied here OR add a tooltip with
    `GLOSSARY.precisionCoaching`. Decide minimal-touch (likely leave + optionally tooltip).
  - Home meso chip (COMP-010, `HomeScreen.js` `showBlockShape` ~:156; the chip renders deload/effort —
    locate the exact chip text) — gloss 'Deload week' (`GLOSSARY.deload`) and RIR / "stop N short of
    failure" (`GLOSSARY.rir`).
  - `ProOnboardingScreen.js` step "division-specific"/division labels (~:452-459, :1215) — gloss
    'division-specific' once on first appearance (FOUNDER copy: a one-line plain gloss; `GLOSSARY` has
    no division entry yet — add one or reuse existing onboarding copy).
- [ ] **U-B-9** tone-keyed copy swap — NEXT. Read the EXISTING tone field
  (`SettingsCoachingScreen.js:183-213`) on `CoachOutputScreen`, `CoachReviewScreen`, `WeeklyCheckInScreen`;
  on "Supportive"/free show the `GLOSSARY` gloss on a term's first appearance, on "Precise" show native
  numbers. Static map only (no LLM). Free CoachReview defaults to Supportive glosses (tone lever is Pro).
  Tests: gloss shows under Supportive, hidden under Precise; free screen shows glosses.

## SIGN-OFF CHECKLIST (founder)
- [ ] Approve the **[A]** glosses (or give wording) — Maintenance, Refeed, Macro cycle, Est. max, Effort
  direction, Over-limit, Rep regression, EWMA, RIR, Level taxonomy. I will not ship invented definitions.
- [ ] Confirm the **[M]/[S]** condensations read true to the engine.
- [ ] Decide the InfoTooltip 44px fix: fold into 006, or keep it in 009 (and 006 uses the current target).
- [ ] Then I build U-F-5 → U-D-3 → U-E-1/2 → U-B-9 in order.
