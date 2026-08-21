# ORIGINAL-SPEC TRACEABILITY — disability amendment vs live implementation

Written 2026-08-21 under the founder's FINAL GAP-CLOSURE order (Phase A).
Start SHA `1259a9f` (main == branch). This file classifies every binding
requirement of the ORIGINAL disability brief against what actually exists
in the repository, verified by direct reads — not by prior completion
summaries.

## Source situation (recorded honestly)

The two original binding files
(`Volyume_Campaign_25_Fable_Kickoff_Prompt.md`,
`Volyume_Campaign_25_Disability_Completeness_Amendment.md`) were chat
uploads and were NEVER COMMITTED to the repository; the uploads are no
longer retrievable from this environment. The requirement set below is
reconstructed from the four contemporaneous records that captured the
amendment while the file was in hand, plus the gap-closure order's own
restatement:

1. `_CAMPAIGN-LOG.md` — AMENDMENT 1 integration record (FD-1..FD-4,
   scope additions, wave adjustments).
2. `ROADMAP-CC26-PLUS.md` — Amendment Deliverables 1–5 (support roadmap,
   free routine library plan, readiness matrix, validation plan, dossier
   framework), with amendment section references (sections 4, 7, 10, 13,
   15, 16, 17, 22, 27, 28, 29, 32).
3. `ARCHITECTURE.md` — design-time amendment references (section 6
   accessibility halves; section 33.20 dossier composition rule).
4. `DECISION-REGISTER.md` — FD entries, CC-D23, CC-F3/F5/F8.
5. The gap-closure order 2026-08-21, section 2, which restates the
   amendment's minimum coverage areas.

FOUNDER FLAG (non-blocking): committing the two original files to
`docs/capability-campaign-25-2026-08-20/source/` would make future
traceability exact rather than reconstructed. Until then, this
reconstruction is the best available authority and is marked as such.

## Classifications

FULLY IMPLEMENTED · PARTIALLY IMPLEMENTED · ARCHITECTURE ONLY ·
CONTENT NOT BUILT · VALIDATION NOT DONE · DEFERRED (defensible reason
recorded) · REJECTED WITH VALID REASON · MISSED / GAP.

Every row cites live evidence (file or artefact, verified 2026-08-21).
"Phase" = where this workstream closes the residue (per the gap-closure
order's phases A–I); "—" = nothing to close.

## 1. The traceability matrix

| # | Requirement (recorded source) | Live evidence | Classification | Phase |
|---|---|---|---|---|
| T1 | Free capability-aware support: onboarding, baseline profile, durable restrictions, filtering, library browse+install, builder, adapted/custom logging, core accessibility, later inspection/update (FD-1) | CAP-19 guard sweep (`capabilityGuards.test.js`); free onboarding step (CC28); `HowYouTrainScreen.js` unguarded route; computed library compatibility; picker/builder filter; 34.1 custom parity | FULLY IMPLEMENTED | — |
| T2 | Dual completion standard: Standard A training intelligence AND Standard B disability product readiness (FD-2) | Standard A: CC26–CC31 landed + tested. Standard B: partial per rows T3–T17 | PARTIALLY IMPLEMENTED (by its own sub-rows) | B–I |
| T3 | Two-layer model: Layer 1 capability-led routines/programming; Layer 2 evidence-informed population content with dossier gates (FD-3) | Layer 1: 11 families shipped (`CAPABILITY-COVERAGE-REGISTRY.md`), resolver end to end. Layer 2: NO dossier file exists anywhere (`find docs -iname '*dossier*'` = empty); matrix row "Population-labelled content: NO (layer 2 not built)" | Layer 1 FULLY; Layer 2 CONTENT NOT BUILT | B, E |
| T4 | External ideation consultants (Grok/Gemini) or explicit queue (FD-4) | `EXTERNAL-CONSULTATION-QUEUE.md` exists (Checkpoint A prompts) | FULLY IMPLEMENTED (as amended: queue in place of unreachable tools) | — |
| T5 | Free routine library, Amendment sections 13/15/16/17: families in normal browse, no segregated shelf, no watered-down-only shelf (experienced tiers where coverage supports), muscle-coverage thresholds per family, programme-quality checklist | 11 families SHIPPED v1 — beginner/intermediate ONLY; `capabilityFamilyPlans.test.js` proves compatibility+thresholds by construction; browse is normal-shelf with computed chips. NO experienced-tier family exists. Grip-limited PULLING deferred (DEF-3, recorded) | PARTIALLY IMPLEMENTED (v1 starter set; experienced tiers + breadth absent) | E |
| T6 | Broad disability coverage (the amendment's population sweep; order section 1's sixteen-class list) | Capability-led engine covers declared function for any user; 9 measured profiles in the registry. NO population/condition knowledge layer, NO named-condition discovery, populations beyond the 9 profiles have no content/education presence | PARTIALLY IMPLEMENTED (engine general; knowledge+content layer absent) | B, D, E |
| T7 | Evidence-informed population routines/guidance where evidence supports (Amendment Deliverable 1 route "Layer-2, later"; CC-D23 candidates SCI/MS/Parkinson's) | R5 evidence banked (1,038 lines, verdicts + clinical register). Zero population collections, zero guidance surfaces | CONTENT NOT BUILT (was DEFERRED behind CC-F3; the 2026-08-21 order now commands research-readiness build) | B, E |
| T8 | Evidence dossier framework: 18-field template adopted verbatim as `dossiers/DOSSIER-TEMPLATE.md`, created with first dossier (Amendment section 7 / Deliverable 5) | File does not exist; no dossier ever created | CONTENT NOT BUILT | B |
| T9 | Coverage registry artefact (Amendment Deliverable; order section 26's ~20-dimension version) | `CAPABILITY-COVERAGE-REGISTRY.md` generated by `scripts/capability-coverage-registry.mjs`: 9 profiles × 17 muscles compatible-exercise floors + family ship status. Real and regenerated at CC32. Does NOT cover: per-profile question mapping, coach/check-in/reintroduction support, a11y, content guidance, scenario-test, clinical/validation/marketing status dimensions | PARTIALLY IMPLEMENTED (real but narrow) | I |
| T10 | Builder respects capability | Picker/builder capability filter + show-anyway + section 9.4 flows; RT-F3 clinician fix; senior question at all 16 callers + 3 id-blind readers + Recent rail | FULLY IMPLEMENTED | F (inherit new layers) |
| T11 | Exercise library coverage at required fidelity | 10-axis demand metadata over all 551 seed rows: 87–100% per axis, 0 contradictions (`CC27-DEMAND-COVERAGE.md`); explicit NULL worklists remain (70 unilateralLoadable, 34 axialLoad, 29 overheadPosition, 24 gripDemand, 13 bilateralUpper, 6 floorAccess, 5 balanceDemand, 3 bilateralLower); customs share schema with single-axis progressive ask | PARTIALLY IMPLEMENTED (fidelity high; worklists open; new-axis needs decided in Phase C) | C |
| T12 | Routine quality validation per family (Amendment section 17 checklist) | Checklist runs as fixtures over family plans AND generated plans (CC27 S10; `capabilityFamilyPlans.test.js`) | FULLY IMPLEMENTED (for what shipped) | E (apply to new) |
| T13 | Exercise instructions / demonstrations, accessible and adapted (order section 23 names this as an original amendment requirement) | `exercises.cue` column exists (database.js:1342) and `ExerciseDetailScreen.js:506/999-1001` renders it — but seed content = 0 rows (grep "cue:" in seedExercises.js = 0); no setup guidance, no adapted variants (seated/one-arm/strap), no demonstration media, no media pipeline | MISSED / GAP (never decomposed into CC26–32; the roadmap carried no instruction deliverable) | C (schema), E/G (content) |
| T14 | App accessibility beyond exercise selection: motor/visual/hearing/cognitive (Amendment section 6 app-operation half) | CC32: capability path + core operation path (Stepper adjustable, timer redundant cues, per-platform announcements, target sizes, modal focus); `PHYSICAL-VALIDATION-BACKLOG.md` journey F. Full per-screen audit REGISTERED as separate future campaign (brief's own boundary). Device walk NOT done. Cognitive pass beyond onboarding cards not done | PARTIALLY IMPLEMENTED (feature+core path); full-app DEFERRED (defensible, recorded boundary); device validation NOT DONE (founder-side) | G |
| T15 | Population/condition coverage knowledge (order section 2's "population/condition coverage") | No directory, no taxonomy artefact, no per-condition functional-question mapping | CONTENT NOT BUILT | B, D |
| T16 | Specific injury handling beyond manual entry (order sections 6/7) | Episodes mechanically support ANY user-declared restriction incl. injuries (create/backdate/AWAITING/end/flare/promote); but NO injury knowledge layer: no region/injury profiles, no suggested-question sets, no evidence-informed education, no injury-aware check-in question selection | ARCHITECTURE ONLY (mechanism general; injury knowledge absent) | B, D, F |
| T17 | Temporary injury lifecycle: episode machine, AWAITING, flare re-start, reintroduction, promotion, learning shield, coach behaviour | CC26 state machine + 33.7; CC30 contamination shield (replay gate, 6); CC31 CONSTRAINED limiter + section 19/21/23/24 + `capabilityReintroduction` gate (3); `capabilityCoach` (19) | FULLY IMPLEMENTED | — |
| T18 | Movement-demand modelling sufficient for the product's questions | 10 axes proven for capability profiles (Q3 gate; family construction). NOT expressible today: knee-flexion depth, loaded spinal flexion/extension/rotation (only axial compression exists), horizontal-press vs overhead distinction finer than overheadPosition, elbow/wrist/forearm demands, hip-flexion depth, dorsiflexion demand, independently-loadable-sides as a first-class filter (unilateralLoadable exists; 70 NULLs) | PARTIALLY IMPLEMENTED (sufficient for shipped scope; order section 8 audit decides injury-path additions) | C |
| T19 | Clinical boundary: no diagnosis/treatment/rehab/prediction; red-flag posture; wording enforcement | CAP-22 + section 25; libraryWordingSweep + marketingClaimsGuard + shared `r2Wording.js`; CLIN register consolidated; CLINICAL-REVIEW-PACK.md founder-ready | FULLY IMPLEMENTED (in-product); external review VALIDATION NOT DONE (founder-side CC-F6) | — (external) |
| T20 | Marketing readiness gates: claims from demonstrated coverage only (Amendment sections 10/27) | All-NO `MARKETING-READINESS-MATRIX.md` with gate conversions; mechanical claims guard; CLAIMS-STANDARDS section 9A | FULLY IMPLEMENTED as truth artefact; order section 27's 8-status ladder not yet present | I |
| T21 | Disabled-user validation plan + execution (Amendment section 28; CC-F5) | `VALIDATION-PACKAGE.md` (cohorts A–H, script, severity, capture) founder-ready. No round run (no panel available — founder-stated) | Plan FULLY; execution VALIDATION NOT DONE (external; order section 14 replaces the blocker with research/code readiness + honest truth field) | H (automated part), I (truth fields) |
| T22 | User-reported clinician restrictions as first-class (order section 1) | source='clinician_reported'; CAP-7 precedence rank 2; blocked manual override + "Update restriction" routing (RT-F3) | FULLY IMPLEMENTED | — |
| T23 | Highly adapted/custom training methods (order section 1) | 34.1 metadata-sufficiency parity (pool entry, swaps, ranking); custom demand columns + progressive single-axis ask; PD-8 fixed | FULLY IMPLEMENTED | — |
| T24 | Serious intermediate/advanced disabled trainees (order sections 1/24) | Engine-side: full progression/PR/coaching sophistication is capability-aware and tier-blind by construction (no beginner-mode fork exists anywhere). Content-side: no experienced-tier adapted families (T5) | PARTIALLY IMPLEMENTED (engine full; content missing) | E, H |
| T25 | Chronic / fluctuating capability (order section 1) | Baseline+flare model; 33.12 energy levers (session length free-editable + card); flare re-start; conditional weekly question | FULLY IMPLEMENTED (machinery); education content absent (goes with T7) | B (education) |
| T26 | Sensory accessibility needs (visual/hearing) | See T14 | PARTIALLY IMPLEMENTED | G |
| T27 | Cognitive/learning accessibility where interaction is affected | COGA basics on onboarding cards (one idea per card, plain language). No whole-journey cognitive pass; no reading-load audit of workout/coach surfaces | PARTIALLY IMPLEMENTED | G |
| T28 | Amendment section 29 red-team scenarios | RT2 ran the scorecard; every NOT-PREVENTED item resolved by 33.6–33.19 or registered | FULLY IMPLEMENTED | — |
| T29 | Onboarding capability-aware both paths (Amendment; ARCHITECTURE section 11) | Both paths + consent moment + durability question + readback; sexGate guards kept; walks green (seated/no-floor/one-arm/grip-limited land compatible first plans) | FULLY IMPLEMENTED | D (add optional condition/injury context routes) |
| T30 | Marketing claims wording control (R2 blacklist end to end) | Shared blacklist module + sweep + guard tests; store listings tied to matrix | FULLY IMPLEMENTED | — |

## 2. Rejected-with-valid-reason register (unchanged by this review)

CC-R1..R21 stand as recorded (DECISION-REGISTER.md), notably: no volume
debt; no fixed reintroduction percentages; no per-set context tags; no
severity/diagnosis storage; no cross-education prescription; no
condition-specific programming IN THE GENERIC ENGINE (CC-R14 — note:
the gap-closure order's population/injury DIRECTORY is knowledge +
question-selection + discovery, which does NOT reopen CC-R14: the
engine stays function-first; see section 5 of the order). CC-R8's
rejection of extra ontology axes was scoped to "no deterministic
consumer" — Phase C re-runs that test per axis against the injury
question set, which is a NEW consumer class the original rejection did
not evaluate; axes that still fail the test stay rejected.

## 3. Deferred items and their standing

- DEF-3 grip-limited pulling implement guidance — stands; Phase E must
  either solve it (strap/hook setup content + honest coverage) or
  re-record the hard evidence/content reason (order gate item 15).
- DEF-2 assisted free-text entry — stands (counsel-gated); the
  directory's alias search (Phase D) is NOT free-text storage and does
  not touch this deferral.
- DEF-5 observed-discomfort discovery — stands (regulatory-gated).
- DEF-6 per-side capacity logging — stands (CC-F2 founder question).
- Full-app accessibility audit — stands as its own campaign; Phase G
  re-verifies the CRITICAL training journey only.

## 4. The gap list this workstream must close (from the rows above)

| Gap | From rows | Phase |
|---|---|---|
| G1 Disability/condition coverage directory (taxonomy, functional-question mapping, variability, accessibility implications, boundaries) | T6, T15 | B |
| G2 Injury knowledge directory (region/problem families → question sets, movement-demand mapping, boundaries, education) | T16 | B |
| G3 Evidence dossier system, machine-readable, template + instances | T7, T8 | B |
| G4 Movement-path ontology audit + any justified extensions + full-library tagging incl. NULL worklist closure | T11, T18 | C |
| G5 Optional condition/injury context discovery UX (never mandatory; function-first mapping) | T6, T16, T29 | D |
| G6 Routine-family breadth + experienced tiers + population collections (with dossiers) | T5, T7, T24 | E |
| G7 Deep integration of the new layers into existing seams (no parallel architecture) | T10, T16 | F |
| G8 Adapted setup/instruction content (structured, screen-reader accessible) + the missed base instruction layer decision | T13 | C schema, E/G content |
| G9 Critical-journey accessibility verification + cognitive pass | T14, T26, T27 | G |
| G10 Directory-wide scenario matrix + injury movement fixtures + coverage statistics | T21, T24 | H |
| G11 Coverage registry rebuilt to the section 26 dimension set; section 27 status ladder; honest truth fields (REAL-DISABLED-USER-VALIDATED=NO) | T9, T20, T21 | I |

## 5. Requirements verified FULLY IMPLEMENTED with no residue

T1, T4, T10, T12 (scope-bound), T17, T19 (in-product), T22, T23, T28,
T29 (scope-bound), T30 — each carries its named mechanical evidence
(tests or generated artefacts), not narrative assurance.

## 6. Honest summary

The founder's challenge is CONFIRMED in three specific respects: the
implementation to date is a strong LAYER 1 (capability engine +
lifecycle + learning shield + coach + starter content) with Layer 2
(population/condition knowledge), the injury knowledge layer, and the
instruction/setup content layer NOT BUILT; routine content stops at
beginner/intermediate v1; and the coverage registry, while real, tracks
content floors rather than the full support surface. Nothing found
contradicts the recorded rejections/deferrals, and no silent scope cut
beyond T13 (exercise instructions — a genuine missed decomposition) was
discovered. The remaining phases close G1–G11.
