# _AUDIT-STATUS-AND-RESUME  (read this FIRST, then read `_AUDIT-SPEC.md` in full)

Maintained per CLAUDE.md handover rule. Points to SOURCE files by path; states the exact current
position against the spec's output structure; records every decision with its rationale. Update this
file at the end of every working session.

## SOURCE OF TRUTH
- Spec (verbatim orchestrator): **`_AUDIT-SPEC.md`** — work from it, never from a summary. Its
  "OUTPUT STRUCTURE" block (lines ~283-300) is the definitive file checklist for every pass.
- The spec mandates, as hard gates: NOT DETERMINED/guessing/scope-reduction/silent-parking/
  reinterpretation are BANNED; nothing dropped; every finding ID carried forward and accounted for;
  Pass-4 blueprints SOURCE-TAGGED ([P1:file:line]/[P2:finding-id]/[P3:gap-id]/[INFERENCE]); missing
  facts go to a NEEDS-ANSWER register and are resolved from the codebase — the agent does NOT guess,
  does NOT pick a plausible default, does NOT ask the founder to choose a build option.

## DELIVERY POSITION (against `_AUDIT-SPEC.md` OUTPUT STRUCTURE)

### PASS 1 — TECHNICAL REFERENCE — ✅ COMPLETE, founder-certified (Tier B)
- Delivered as section files (not one mono-file): `pass1-section1-gating.md`,
  `pass1-section2-engine-rules.md`, `pass1-section2-tierB-index.md`, `pass1-section3-datamodel.md`,
  `pass1-section4-features.md`, `pass1-sections-5to8.md`, `pass1-coverage-manifest.md`.
- Mechanical extracts: `extract/s3-columns.txt` (553), `s3-rls.txt` (114), `s3-check.txt` (135),
  `s6-settings.txt` (39), `s7-routes.txt` (108), `s8-touch.txt` (189).
- Certification: `pass1-verification-artifact.md` — founder confirmed 553 columns / 108 routes /
  189 touch-targets live. **Open item carried:** Q1 schema authority (setup_complete.sql 252 vs
  schema.sql 187 vs migrations 114) — unresolved, resolve before any data-model blueprint.
- NOTE: Section 4 mandatory feature list (`_AUDIT-SPEC.md:67-73`) explicitly includes progress photos,
  streak system, readiness scoring, manual barcode entry, etc. — these are AUDIT TOPICS the spec
  requires assessing, not free choices.

### PASS 2 — EXTERNAL RESEARCH — ⚠️ PIVOTED, INCOMPLETE vs spec
- **Decision (founder-directed):** this environment cannot browse (Reddit blocked, US-only search,
  app-store 429s), so Pass 2 was re-routed from "15 internet agents" to **3 external AIs each running
  all 15 areas**, pasted back for adjudication. Raw inputs stored verbatim:
  `pass2-input-01-chatgpt.md`, `pass2-input-02-gemini.md` (Gemini access was SIMULATED — TRAINING-grade),
  `pass2-input-03-claude.md`.
- Adjudication done: `pass2-adjudication.md` (corroborated/conflict/single-source/unknown +
  contamination flags: Pelaris phantom, Gemini reflecting our own FFM-floor spec).
- **GAP vs spec (still owed):**
  - `pass2-findings-index.md` — **NOT PRODUCED.** This is the master ID list Pass 3 must fully account
    for. Must be built by aggregating EVERY finding ID from the three reports (per area, with
    status/source), per `_AUDIT-SPEC.md:147-156`. **This is the next correct action.**
  - `pass2-research-[area].md` — 12 of 15 exist but are the EARLIER SHALLOW versions (dated 13 Jun,
    pre-pivot); newbie-experience / check-in / scaling missing. The 3-AI inputs supersede them as the
    research substrate, but the per-area findings still need consolidating into the index.

### PASS 3 — GAP ANALYSIS — ✅ COMPLETE (15/15 areas, per-area, to the founder-certified scheme)
- Method (founder-specified, ai-coaching certified as the pilot): per area, ingest the 3 research docs →
  reconcile each finding ALL-THREE / TWO / ONE / CONFLICT + which source → resolve gap CONFIRMED
  YES/NO/PARTIAL with a real Pass-1 file:line; absence-claims ("no X") evidenced by a coverage grep, never
  a faked file:line; open items → an open-questions list. No embellishment.
- Files (one per area): `pass3-ai-coaching.md` (certified), `pass3-workout-screen.md`, `pass3-plan-generation.md`,
  `pass3-nutrition.md`, `pass3-food-logging.md`, `pass3-progress.md`, `pass3-retention.md`, `pass3-onboarding.md`,
  `pass3-exercise-library.md`, `pass3-navigation.md`, `pass3-design.md`, `pass3-missing-features.md`,
  `pass3-newbie-experience.md`, `pass3-check-in.md`, `pass3-scaling.md`.
- SUPERSEDED off-spec files still on disk (the earlier wrong-scheme mess): `pass3-gap-analysis.md`,
  `pass3-comparison-matrix.md`, `pass3-unresolved-questions.md`, `pass3-unresolved-answers.md`,
  `pass3-reconciliation.md`, `pass2-findings-index.md`, `pass2-adjudication.md` — pending a founder
  cleanup decision (proposed for removal; not deleted unilaterally).
- Confirmed-NO/PARTIAL gaps (the real candidates): progress photos (PR-3), exercise demo media (EL-1/NE-3),
  HRV/sleep ingestion (MF-1), standalone watch (MF-2), posing/peak-week UI (MF-3), micronutrient/NRV (NU-7),
  recomp progress view (PR-4), weekly calorie planner (NU-1), autonomy/manual-override modes (SC-3), UI
  progressive disclosure (SC-1), broad social feed (RE-3), challenges (RE-7), full 44px audit (DE-1).
- Confirmed-YES leads: full adaptive loop (AC-2), deterministic no-LLM (AC-5/PG-3), always-on ED-safety
  floors (AC-6), ED-safe streak-freeze (RE-2), colour-blind-safe palette (DE-4), real periodisation (PG-2),
  smart substitutions (EL-4), wellbeing+conditional check-in (CK), trend smoothing (PR-2).
- Open questions needing a FOUNDER decision are listed at the foot of each area file (Q-AC1…Q-SC2).
- **Pass-3 COMPARISON MATRIX — ✅ COMPLETE (15/15 areas), `pass3-comparison-matrix.md`.** Founder-directed
  re-execution to the spec's Pass-3 comparison-matrix columns (AREA / BEST IN CLASS / WHERE WE LEAD / WHERE WE
  LAG / MISSING ENTIRELY / VERIFICATION STATUS). Quality graded as capability + execution depth (the ~90%
  sourceable from competitor feature sets / editorial / app docs); only the residual micro-UX-timing / tap-count /
  subjective-ranking slice is marked NOT FOUND (specific missing data point named per cell). All 15 rows are
  read-backed (Read calls in console; lines pasted; verdict tied to those lines — the hard rule). Areas:
  WS, FL, AC, PR, NU, PG, EL, RE, MF, SC, CK, **ON, NA, DE, NE** (last four added this session).
  - **CONSOLIDATED NOT-FOUND list (final, 5 cells)** at the foot of the matrix for the founder's per-cell
    targeted-teardown decision: (1) WS taps-per-set/keyboard-complete, (2) FL seconds/taps per food,
    (3) ON time-to-first-value + actions-per-screen, (4) NA taps-to-primary-action, (5) DE comparative
    aesthetic ranking. Plus two **our-side-measurable** flags (not competitor gaps): PG plan-library breadth
    (`seedRoutines.js`), EL exercise-library size (`seedExercises.js`) — need a parse of our own code.
  - Real LAGS surfaced (read-backed): FL/NU food DB is OpenFoodFacts crowdsourced vs the curated/verified bar;
    PR progress-photo UI + recomp-reframing view missing; NU micronutrient/NRV depth; EL/NE no exercise demo
    media (text form cues only); MF HRV/sleep ingestion + standalone watch + posing/peak-week.
  - Real LEADS surfaced (read-backed): full adaptive loop (cals+volume+steps+cardio off one trend), in-log
    progressive prescription, transparent "why" coaching + register switching, composite strength standing,
    meal-memory depth, ED-safe streak-freeze, check-in auto-derivation + Fast Check-In, guided beginner on-ramp,
    test-enforced contrast/CVD/larger-text/reduce-motion design tokens.
  - **RECONCILE + UX RE-GRADE PASS (later session, founder-directed after catching drops):** (a) caught that the
    matrix was never reconciled against the Pass-1 mandated register → added a full **SECTION-4 RECONCILIATION**
    table (all 19 features → matrix status) at the foot of `pass3-comparison-matrix.md`; (b) the UX/UI-quality
    dimension had been reduced to feature on/off — **re-graded DE and NA** against the real UX bars in the
    substrate (glanceability/data-density NA-F2/F3, 44px mid-workout DE-F1/F2, disable-able animation, data-as-hero,
    no-AI-slop), all read-backed; (c) carried the **dropped items** found: reverse-diet (NU), plate-calculator
    built-but-unwired (WS, `components/PlateCalculator.js` has 0 consumers), plan diff/preview (PG, U-B-7),
    dense/compact mode (DE+NA); (d) **corrected CK** from clean LEAD to PARTIAL (conditional-branching U-B-2).
  - **RESEARCH NEEDED (founder commission decisions, listed at foot of matrix):** whole UX/UI-quality dimension
    (dedicated teardown — approved); DE premium-feel ranking; micro-UX timing cells (WS/FL/ON/NA); niche ABSENT
    features with no market bar (velocity/tempo, VBT, mood correlation, wellbeing-correlation output); DE/NA
    substrate is single-source (Gemini) — a 3-AI re-run would corroborate/overturn.
  - **SECTION-7 SWEEP — ✅ DONE** (`pass3-section7-sweep.md`): all 77 `src/screens/*.js` classified A
    (infra) / B-cov / B-DROP. **Headline finding:** six feature domains sit OUTSIDE the 15 research areas and
    were never graded (no research bar gathered) — **cardio logging, smart meal-planning, recipes,
    food-insights/analytics, annual recap (Year of Lifts), manual workout builder**. Plus a dropped LEAD now
    corrected: `ScanLabelScreen` (on-device two-step OCR, Cronometer-style) is the FL "AI photo logging" bar —
    FL row updated to credit it. Remaining limit: component-level surfaces (modals inside screens) not swept;
    screen-level coverage is now 100%.
  - **RESEARCH BRIEF v2 — ✅ DRAFTED** (`pass2-research-brief-v2-compare-and-elevate.md`): fixes the v1 root
    cause (yes/no checklist that never fed in our implementation). Compare-and-elevate format — each block states
    what Volyume ships, then asks best-in-class / where-we-lag / how-to-elevate, output mapped to matrix columns.
    Covers the 6 ungraded domains + cross-cutting UX/UI quality. READY TO RUN on 3 AIs (founder action: paste
    back the 3 exports, then build new matrix rows per domain).

### PASS 4 — BLUEPRINTS — ◐ IN PROGRESS (founder authorised; following `_AUDIT-SPEC.md:214-308`)
- **Method reconciliation (must be confirmed):** the founder DIRECTED the Pass-3 deliverable to be
  `pass3-comparison-matrix.md` (per-area LEAD/LAG/MISSING + VERIFICATION) instead of the original spec's
  `pass3-gap-analysis.md` + `pass2-findings-index.md` + `pass3-reconciliation.md` gate. So the original-form Pass-3
  EXIT GATE files were never produced (findings-index / reconciliation MISSING) — the matrix + `pass3-v2-founder-
  decisions.md` are the substitute. The anti-vanish guarantee is delivered via the Pass-4 ledgers below +
  `pass4-final-reconciliation.md`, anchored to the matrix, NOT the original findings-index. **Open process
  question for founder:** accept the matrix-path gate, or require the original findings-index/reconciliation to be
  back-filled first.
- **DONE this session:** `pass4-no-action.md` (dismissed + leads), `pass4-deferred.md` (cost/niche/commission +
  carried Q1). Every Pass-3 gap now maps to blueprint / deferred / no-action — none vanish.
- **Founder decisions** (build/dismiss/defer per item): `pass3-v2-founder-decisions.md`.
- **DRAFTS pre-process (to be reformatted into mandated BLUEPRINT FORMAT `_AUDIT-SPEC.md:252-271`):**
  `pass4-blueprint-calorie-banking.md`, `pass4-blueprints-approved-items.md`.
- **DONE (founder gate = A matrix-path):** all 19 approved items blueprinted in mandated format —
  `pass4-blueprint-calorie-banking.md` (spine), `pass4-blueprints-micronutrients.md` (spine, Q1-blocked),
  `pass4-blueprints-nutrition.md`, `-coaching-progress.md`, `-workout-recap.md`, `-cardio-ux.md` (4 cluster agents,
  source tags spot-verified — no fabrication found). Plus `pass4-needs-answer-register.md`,
  `pass4-final-reconciliation.md`, `pass4-master-priority.md`, `pass4-executive-summary.md`.
- **BLUEPRINTING FINDINGS (reduce the build):** recap share/export + monthly cadence ALREADY built (COMP-005);
  mid-session swap exists (routine-safe); cardio import/trend infra + flexible meal-slot model exist. Reclassify
  toward no-action in founder review. Raw/cooked toggle has NO conversion factor in code (NA-nutrition-1).
- **GATE NOT YET PASSED:** 66 NA-ids open. Most read-answerable (Opus-8 read pass). FOUNDER DECISIONS pending:
  NA-coaching-10 (safety: auto-apply during a hold), NA-cux-19 (Core-Haptics NEW dependency), NA-wr-10 (relative
  framing wording), NA-wr-3 (swap "keeps volume tracking"), NA-cux-15 (timeline replace vs toggle), NA-cb-3
  (banking surface). BLOCKED: NA-mn-1 = Q1 schema authority.
- **NEXT:** (1) founder decides the FOUNDER-DECISION NA-ids; (2) resolve Q1; (3) Opus-8 read pass answers the
  read-answerable NA-ids with file:line; (4) banned-phrase/untagged sweep; (5) re-run the exit gate; (6) build per
  `pass4-master-priority.md` Tier-1 first, each with invariant tests + fresh-eyes review.
- CARRIED: Pass-1 Q1 schema authority — RESOLVED (migrations canonical; micronutrients = new migrate_087).
- **BUILD MODE (founder 2026-06-14):** "resolve NA-ids per-feature at build" — do NOT run a bulk read pass; for
  each feature, resolve its NA-ids by reading at build time, complete that blueprint, build with invariant tests +
  `npm run lint && npm test` + a fresh-eyes review, then the gate passes for that feature. Order = `pass4-master-
  priority.md` Tier 1 first: (1) gate train/rest cycling, (2) keyboard-completes-the-set, (3) protein-consistency,
  (4) analytics windows 14/30/90d, (5) cardio trend view, (6) recap relative-% anchor.
- **TIER-1 BUILD PROGRESS (branch `claude/audit-work-quality-review-benrin`):**
  - ✅ (1) **Gate train/rest cycling** — DONE, commit `7d63c72`. Source: `pass3-v2-founder-decisions.md:156-161`.
    Added `coachingGoals.dayCalorieCyclingAllowed` as single source of truth; weeklyCoach (zero behaviour change)
    + mealPlanAssembler (`allowCycling`/`allowDayCycling`) + mealPlanService both read it; MealPlanScreen drops
    the day-type chip + "Training today?" control on a flat plan (NA-nutrition-7). lint+full suite green.
  - ✅ (2) **Keyboard-completes-the-set** — DONE, commit `ec7cddc`. Source: `pass4-blueprints-workout-recap.md:27-165`
    (ULTIMATE-WR-1). `SetEntry` gained optional `onSubmitComplete`; reps Done logs the set via one shared
    `handleCompleteSetPress` used by BOTH the Done key and the Complete-set button (cluster/unilateral identical;
    respects `saving`). NA-ids resolved at build: **NA-wr-1** ActiveWorkout route un-gated (`RootNavigator.js:295/478/505`,
    no `withProGuard`); **NA-wr-2** single `<SetEntry>` site (`ActiveWorkoutScreen.js:1755`), prop optional/non-breaking.
    Invariant tests in `src/components/__tests__/SetEntry.test.js`. lint+full suite green; fresh-eyes review PASS.
  - ▶ **NEXT: (3) Protein-consistency metric** [NA-nutrition-8]. Source blueprint: read it IN FULL before coding —
    find the ULTIMATE-* item in the `pass4-blueprints-nutrition.md` cluster (grep "protein" / "NA-nutrition-8"),
    resolve its NA-ids by reading at build time, then build per the edit-gate.
- **OPEN BEFORE CODING:** branch policy conflict — session brief says develop on
  `claude/audit-work-quality-review-benrin` (an audit/docs branch); CLAUDE.md says app code goes on
  phase2/development or feature/*. Founder to confirm the build branch before any production code is written.

## DECISIONS LOG (rationale preserved)
1. Pass-2 pivot to 3-AI external research — environment cannot browse (founder-directed).
2. Pass-1 Tier A (verbatim safety/engine) + Tier B (locate-and-cite); founder certified Tier B.
3. Mechanical extraction (grep-sourced, count = wc -l) is the standard for dense sections.
4. Producer is not the gate: deliver verification artifacts; founder certifies. No self-"PASS".
5. Pass-1 Q1 (schema authority) carried unresolved.
6. (VOID) photos D1=local-only/D2=Pro — elicited by a forbidden question; not load-bearing.

## NEXT CORRECT ACTION (do exactly this, from source)
- Pass 1 ✅, Pass 2 findings-index ✅, Pass 3 ✅ (awaiting founder certification of the Pass-3 gate via
  `pass3-reconciliation.md`).
- NEXT: **Pass 4** strictly to `_AUDIT-SPEC.md:206-280` — every Pass-3 gap-id → blueprint / `pass4-deferred.md`
  / `pass4-no-action.md`; source-tagged; missing facts → `pass4-needs-answer-register.md` (resolve from
  codebase, NOT by guessing or asking the founder to pick build options); then the Pass-4 exit gate +
  `pass4-master-priority.md` + `pass4-executive-summary.md`.
- Carry: Q15 medical-device + barcode pricing = founder-gate deferrals; Pass-1 Q1 schema authority still
  open (resolve before any data-model blueprint).
