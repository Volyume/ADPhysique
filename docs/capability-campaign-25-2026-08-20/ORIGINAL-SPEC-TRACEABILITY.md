# ORIGINAL-SPEC TRACEABILITY — disability amendment vs live implementation

Written 2026-08-21 under the founder's FINAL GAP-CLOSURE order (Phase A).
Start SHA `1259a9f` (main == branch). This file classifies every binding
requirement of the ORIGINAL disability brief against what actually exists
in the repository, verified by direct reads — not by prior completion
summaries.

## Source situation (updated at the 2026-08-21 reconciliation)

RESOLVED: the exact founder-supplied amendment WAS recovered from the
session uploads directory during the founder's final-reconciliation
order and is now banked verbatim in this folder as
`Volyume_Campaign_25_Disability_Completeness_Amendment.md`
(1,064 lines, md5 `e3754558ce43cbe10cbc10a2d2409096`). The earlier
statement that the upload was "no longer retrievable" was wrong: the
file survived at
`/root/.claude/uploads/95210e18-.../55df017c-Volyume_Campaign_25_
Disability_Completeness_Amendment.md` and a filesystem search found it.
Section 7 below traces EVERY section of the exact original against
live main; section 9 records where the reconstruction differed from
the original and how each difference was resolved. The kickoff prompt
(`Volyume_Campaign_25_Fable_Kickoff_Prompt.md`) was not found in the
uploads directory and remains reconstructed via the campaign log; no
binding requirement below rests on it alone.

The reconstruction sources remain listed for the record:
`_CAMPAIGN-LOG.md` Amendment 1 block, `ROADMAP-CC26-PLUS.md`
deliverables, `ARCHITECTURE.md` references, `DECISION-REGISTER.md`
FD entries, and the gap-closure order's own restatement.

## Classifications

FULLY IMPLEMENTED · PARTIALLY IMPLEMENTED · ARCHITECTURE ONLY ·
CONTENT NOT BUILT · VALIDATION NOT DONE · DEFERRED (defensible reason
recorded) · REJECTED WITH VALID REASON · MISSED / GAP.

Every row cites live evidence (file or artefact, verified 2026-08-21).
"Phase" = where this workstream closes the residue (per the gap-closure
order's phases A–I); "—" = nothing to close.

## 1. The traceability matrix (Phase-A BASELINE, kept as the historical record)

NOTE (2026-08-21 reconciliation): the T-rows below describe the tree at
`1259a9f`, BEFORE the gap-closure phases ran; their "Phase" column shows
where each residue was closed. For the CURRENT state of every
requirement, section 7 (the exact-original trace against live main) is
authoritative.

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
| T13 | Exercise instructions / demonstrations, accessible and adapted (order section 23 names this as an original amendment requirement) | CORRECTED 2026-08-21 (evidence-before-assertion): BASE instructions EXIST — `src/lib/formTips.js` carries 554 entries rendered as "How to do it" (`ExerciseDetailScreen.js:1006-1011`); the earlier claim keyed on the empty `cue` column and missed FORM_TIPS. Genuinely absent: ADAPTED setup variants (seated/one-arm/strap/supported/reduced-range/per-side) and demonstration media | PARTIALLY IMPLEMENTED (base text exists; adapted layer absent; media absent) | G (adapted content); media = founder programme |
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
ADAPTED-setup content layer NOT BUILT; routine content stops at
beginner/intermediate v1; and the coverage registry, while real, tracks
content floors rather than the full support surface. Nothing found
contradicts the recorded rejections/deferrals. T13 correction
(2026-08-21): base exercise instructions exist (formTips.js, 554
entries) — the original T13 row wrongly called the base layer missing;
the adapted-variant layer is the real gap and Phase G closes it. The
remaining phases close G1–G11.

## 7. EXACT-ORIGINAL TRACE (2026-08-21 reconciliation, against live main)

Every section of the banked original amendment, traced against the live
tree AFTER gap closure. Statuses use the same ladder as section 1.
"EXTERNAL" marks the part that only a person, device or professional can
convert (founder actions); it is never claimed as done.

| § | Exact requirement (condensed from the original; the banked file is authority) | Live evidence | Status |
|---|---|---|---|
| 1 | Raise the end-state to "confidently and truthfully marketed directly to disabled users"; do not stop at avoidance/one field/token routine | Dual completion standard recorded (FD-2); all-NO matrix + `marketingClaimsGuard` make the standard mechanical; the layers §1 warns against all exist (16 families, directory, adapted setup) | FULLY as governance + code; marketing conversion EXTERNAL |
| 2 | Core accommodation NOT Pro-only; eleven named free capabilities | CAP-19 tier-blind law + `capabilityGuards.test.js` sweep; each named item live free: onboarding capability step (CC28), baseline profile + durable restrictions (`HowYouTrainScreen`, unguarded route), filtering (resolver at every selection seam), library browse+install (`PlanLibraryScreen` computed chips, no gate), builder (free), adapted/custom logging with demand parity (34.1), unilateral logging counts logged work without mirroring assumptions (laterality carving; per-side capacity refinement = recorded founder question CC-F2/DEF-6), core-operation accessibility (CC32), later inspect/update (`How you train` edit/end/allowances) | FULLY IMPLEMENTED |
| 3 | Real free capability-aware library; audit ten hidden assumptions | 16 families shipped (registry table); each named assumption has a deterministic representation: standing→`position`, floor transfer→`floorAccess`, two arms→`bilateralUpper`, two legs→`bilateralLower`, grip→`gripDemand`, symmetrical loading→`unilateralLoadable`+side carving, balance→`balanceDemand`, free ROM→family/exercise rules, station transitions→§17 programme review (lead-walked per plan), mirrored-unilateral assumption→laterality carving honours a single trained side | FULLY IMPLEMENTED |
| 4 | No single generic "disabled/adaptive workout"; 23-item family seed list is ideation only; Fable decides final families | No plan or collection carries a generic disabled/adaptive label (wording sweeps); seed list maps function-first: seated (4 families incl. home + experienced), no-floor, supported/balance (3), one-arm, one-leg, lower-with-limited-upper (Grip-Light Lower, Hinge & Hip), grip-limited pulling (GC-D7 mechanism set), machine-supported (2 tiers), limited-overhead (No-Overhead Upper Split), limited-knee-flexion (Hinge & Hip Lower Builder), low-equipment/band (Dumbbell & Band Foundations, Seated Home), accessible beginner→experienced (levels per registry), independently-loadable unilateral (One-Arm/One-Leg builders), no-floor-transfer (No-Floor), substantial-support (Supported Machine, Steady-Base). "Wheelchair-based" NAMED shelves stay withheld under GC-D5 (population labels need their gates); the FUNCTION is fully served seated | FULLY IMPLEMENTED (per the seed's own "ideation only" framing) |
| 5 | Two complementary layers | Layer 1: engine + 16 families. Layer 2: 40-profile directory + cited education + dossiers (SCI/MS/Parkinson's) + R5 verdicts governing which populations may ever get labelled content | FULLY IMPLEMENTED code/content-side; labelled release EXTERNAL-gated |
| 6 | Five disability categories get the CORRECT product response (not always a routine) | Physical→capability lane; motor/dexterity→CC32 targets, adjustable steppers, no gesture-only flows; visual→labels/roles/announcements (49 on the logger) + non-colour states; hearing→three-channel timer cues; cognitive→COGA onboarding cards, plain-language law, learning_disability profile delivery guidance | FULLY (feature path); device walk + cohorts EXTERNAL |
| 7 | Evidence dossier before population-labelled content; 18 documented items | `dossiers/DOSSIER-TEMPLATE.md` (21 fields ⊇ the 18; mapping in section 9) + SCI/MS/Parkinson's instances; composition rule ARCHITECTURE 33.20; reconciliation fix: field 19 now states required validation/review per population, not status alone | FULLY IMPLEMENTED |
| 8 | Reverify the named research leads, then expand | R5 (1,038 lines) re-verified every lead WITH corrections recorded (CMO 2026 refresh real but strength line unchanged since 2019; Activity Alliance 2025-26 verified, year-mixing trap; SCI 2018 dose verbatim, dropped rep-range trap; LimbPower existence; MS Society 403→MS Trust); R7/R8 expanded to 40 profiles with live-verified citations | FULLY IMPLEMENTED |
| 9 | Coverage registry with the 18 recorded dimensions; suggested 7-status progression | Registry + matrix jointly carry all 18 (mapping in section 9); status ladder is the LATER gap-closure order's 8-status set (supersedes the amendment's "suggested" progression) | FULLY IMPLEMENTED |
| 10 | Marketing claims only from demonstrated coverage (16 demonstrations) | Matrix columns + conversion rules; `marketingClaimsGuard.test.js` mechanically ties store listings to the matrix; CLAIMS-STANDARDS 9A | FULLY as gate; conversions EXTERNAL |
| 11 | Real disabled-user validation required; cohorts; gates designed now | `VALIDATION-PACKAGE.md` cohorts A–H, tasks, severity, blockers, capture; REAL-DISABLED-USER-VALIDATED = NO stands everywhere | Plan FULLY; execution EXTERNAL |
| 12 | Representation considered before community marketing; no token representation | WAS UNRECORDED product-side (reconciliation find); now recorded in the matrix's claims section as a standing requirement for any direct-to-community campaign | FULLY as record (this pass) |
| 13 | Library IA: normal browse, no segregated shelf, filters; collections only where research supports; any compatible routine usable | Families sit in normal browse; computed chips ("Fits how you train" / "N to swap") never filter plans out; text search never hides (PlanLibraryScreen.js:707-714); labelled collections deferred behind user research per the amendment's own condition (GC-D5); install is open to everyone | FULLY IMPLEMENTED |
| 14 | Builder equally capability-aware (11 listed abilities) | Compatibility + restrictions (resolver in picker/builder), incompatibility explanations (conflict sheet + unavailable notices), side-specific where required (side carving + per-exercise allowances), no-floor/no-standing filters (axes), equipment+capability intersection (planCompat), custom fallback (34.1), no-compatible-option state (honest fallback, RT fix 2), slot suggestions (poolGenerator senior question), whole-plan checks (muscle-coverage section, RoutineDetailScreen.js:54-88 + compat summary), manual override per law (show-anyway ranks 3-4; clinician rank 2 routes to Update restriction) | FULLY IMPLEMENTED |
| 15 | Free routines not watered down: levels incl. experienced; goals from user, not disability status | Registry family table records level per family; experienced tier exists (Seated Upper Strength II, Steady-Base Strength); goals ride the shared goal system; no beginner-mode fork anywhere (engine tier-blind, no capability-conditional level cap) | FULLY within evidence bounds (levels recorded per family, honest) |
| 16 | Coverage measured, not assumed; thresholds before "supported" | Registry per-profile × 17-muscle floors; family oracle enforces muscle thresholds + home-equipment reality (`capabilityFamilyPlans.test.js`); "supported" language governed by matrix gates | FULLY IMPLEMENTED |
| 17 | Routine quality validated as a PROGRAMME (11 dimensions) | Mechanical part in the oracle (compat, coverage, home equipment); volume/frequency/fatigue/transitions/duration lead-reviewed per plan at landing (recorded in tracker/ledger corrections); programme-quality checklist named in roadmap Deliverable 2 gate | FULLY for shipped set |
| 18 | Accessible instruction architecture (text-first, SR semantics, adapted, side-specific, setup variants, equipment; media capable when introduced) | formTips (554 text entries, SR-readable), adaptedSetup layer (closed contexts incl. per-side, seated), equipment field per exercise; media/captions structurally n/a until media ships (recorded in the a11y audit; no promise made) | FULLY within no-media scope |
| 19 | Reverify current Android/Apple accessibility guidance; no compliance claims from checklists | R4 (WCAG 2.2 specifics, platform limits) consumed by CC32; compliance never claimed (matrix A11Y = PARTIAL until device walk) | FULLY IMPLEMENTED |
| 20-22 | Grok/Gemini as consultants; if unreachable, produce exact prompt queue; block nothing needlessly | `EXTERNAL-CONSULTATION-QUEUE.md` carries Checkpoints A–D exact prompts; unavailability honestly recorded (FD-4); no decision was blocked on them; ACCEPT/MODIFY/REJECT reconciliation path documented for when answers arrive | FULLY per §22 fallback |
| 23 | Competitor matrix incl. 11 tracked capabilities | `research/R6-competitor-disability-matrix.md`: 15 products, PART 2 matrix columns are exactly the 11 (injury exclusion, disability onboarding, baseline profile, seated/no-floor generation, unilateral support, chronic flare, learning provenance, adaptive library, reintroduction, UI accessibility, disability content) | FULLY IMPLEMENTED |
| 24 | Claim architecture: capability→claims mapping; no blanket claims | CLAIMS-STANDARDS 9A (traceable claims law + capability section); matrix conversion rules per claim family; blanket-claim ban in the standards; nothing published | FULLY as architecture |
| 25 | Disability/capability support roadmap deliverable | ROADMAP Deliverable 1 (per-profile current/missing/route) + registry (current truth) + action pack (external route); may span later campaigns per the amendment | FULLY (route now = external items only) |
| 26 | Free routine library plan deliverable (9 specifications) | ROADMAP Deliverable 2 answers all nine (families, buildable-now, metadata needs, validation, dossier-gated set, discovery, coexistence with generated plans, builder start path, quality gate); living instance = registry family table | FULLY IMPLEMENTED |
| 27 | Readiness matrix with the exact 16 areas per group | Matrix carries the per-group table + status ladder; reconciliation fix adds the amendment's exact 16-area table (previously compressed into 7 columns) | FULLY after fix |
| 28 | Disabled-user validation plan (10 specifications; 10 task types) | VALIDATION-PACKAGE sections 1–9 cover all ten specs; session tasks T1–T7 cover the amendment task list; reconciliation fix adds the later baseline-capability-update step to T5 | FULLY after fix |
| 29 | Twenty adversarial scenarios | Walked one-by-one against live main in section 8 below | FULLY (see per-row status) |
| 30 | Dual completion standard; B failure = not complete for marketing | Recorded (FD-2); Standard A complete + tested; Standard B code/content complete, conversion EXTERNAL; the matrix enforces "not complete for disability marketing purposes" exactly | FULLY as governance |
| 31 | Conduct principle: say which answer pattern applies per population | The registry "Known gaps" column and R5 verdicts use exactly the three sanctioned answer patterns (engine-supports-content-missing / clinical-territory / accessibility-not-routines) | FULLY IMPLEMENTED |
| 32 | Apply the amendment to Campaign 25 now (register, roadmap, gates) | FD-1..4 in the register; deliverables in the roadmap; gates in the matrix + guards; this trace closes the loop | FULLY IMPLEMENTED |

## 8. Amendment §29 adversarial scenarios — live-main walk (2026-08-21)

| # | Scenario | Live defence (verified) | Status |
|---|---|---|---|
| 1 | Wheelchair "routines" are all beginner wellness despite experienced lifter | Seated Upper Strength II ships EXPERIENCED (registry); engine never caps level by capability | PREVENTED |
| 2 | Permanent one-arm user gets symmetrical progression instructions | Laterality carving keeps single-side work eligible; no mirrored-set instruction exists; coach consumes per-muscle logged work | PREVENTED |
| 3 | Blind user cannot tell which workout control is selected | accessibilityState selected/disabled/expanded on logger controls (ActiveWorkoutScreen.js:4391, 4826-4837; Stepper.js:90,119) | PREVENTED in code; device walk EXTERNAL |
| 4 | Dexterity-impaired user cannot operate small rest-timer controls | Timer controls are buttons with 44pt+ targets, no gesture-only path (CC32) | PREVENTED in code; device walk EXTERNAL |
| 5 | Hearing-impaired user misses audio-only timer cue | Three channels: visual + haptic + audio; audio never sole (RestTimer.js:298 fallback) | PREVENTED |
| 6 | Learning-disability user cannot understand capability setup language | One-idea-per-card onboarding, plain-language law, wording validator; learning_disability profile carries delivery guidance | PREVENTED in code; cohort validation EXTERNAL |
| 7 | User forced to disclose diagnosis for correct filtering | Functional questions never require a name; the directory is optional (GC-D2); no diagnosis field exists anywhere (CAP-3 guard) | PREVENTED |
| 8 | Condition-specific routine assumes identical capabilities across a diagnosis | No condition-labelled routine exists; profiles select QUESTIONS; wheelchair profile explicitly routes to specific answers ("not one research population" gap note) | PREVENTED |
| 9 | "Full body" plan with no meaningful pulling | Family oracle muscle thresholds (back floor); Grip-Light plan states its pulling gap in-plan rather than hiding it | PREVENTED |
| 10 | Adapted routine with impossible equipment transitions | §17 lead programme review per plan; home plans proven against HOME equipment set in the oracle | PREVENTED (mechanical for equipment; transitions lead-reviewed) |
| 11 | Free disability support accidentally paywalled | CAP-19 guard sweep pins the lane tier-blind | PREVENTED |
| 12 | Custom movement cannot participate in progression | 34.1 metadata-sufficiency parity (pool, swaps, ranking, PRs) | PREVENTED |
| 13 | Disabled user permanently shown "modified" badges | Chips read "Fits how you train" / "N to swap", only while constraints are active; no adapted/modified label exists (wording sweep) | PREVENTED |
| 14 | Marketing claims wheelchair support before wheelchair users tested | REAL-DISABLED-USER-VALIDATED=NO + matrix all-NO + mechanical claims guard | PREVENTED |
| 15 | Limb-difference support claimed but unilateral volume accounting wrong | Logged sets count as performed (no doubling/halving); single-side training counts toward its muscles; per-side capacity refinement recorded honestly as open founder question (DEF-6), unclaimed | PREVENTED (accounting honest); refinement OPEN by record |
| 16 | Capability filter works but library search hides relevant routines | Search is text-only; compatibility renders as chips and never filters out (PlanLibraryScreen.js:707-714) | PREVENTED |
| 17 | Condition-specific routine crosses into rehab advice | No condition routine exists; directory wording validator bans rehab/treatment vocabulary; reintroduction stays formula-free (CLIN-2 boundary) | PREVENTED |
| 18 | Unrelated temporary injury collapses into the disability baseline | Roles are separate rows (baseline vs episode); stacks proven as set intersections with episode-end restoration (directoryScenarioMatrix stack proofs) | PREVENTED |
| 19 | VoiceOver navigates settings but not the active workout | 49 labels/roles on the logger; announced states; FlatList order limitation recorded (R4) | PREVENTED in code; device walk EXTERNAL |
| 20 | Switch Control cannot trigger a swipe/drag-only action | CC32 sweep: every drag/long-press has a button alternative on the journey | PREVENTED in code; device walk EXTERNAL |

## 9. Reconstruction vs original — differences found and resolved

1. **Dossier fields: original lists 18; shipped template has 21.** The 21
   are a superset: original items 1-13 map to template 1-13; item 7's
   accessibility half maps to template 14; original 14-15 (user-testing
   and expert-review REQUIREMENTS) were only partially represented
   (template field 19 recorded STATUS, not required validation) — FIXED
   this pass: template + all three instances now state the required
   cohort and CLIN items per population; original 16→19, 17→20, 18→21;
   template additions 15-18 (routine/check-in/reintroduction
   implications, review date) are extra fidelity, not drift.
2. **Registry status ladder: original SUGGESTS a 7-status progression;
   live uses the gap-closure order's 8-status set.** Resolved as
   supersession by the later founder order (§27 of the gap-closure
   order); the original marked its progression "Suggested".
3. **Matrix areas: original prescribes an exact 16-area table; live
   matrix compressed them into 7 columns.** FIXED this pass: the matrix
   now also carries the exact 16-area table with per-area status.
4. **§12 representation was never recorded product-side.** FIXED this
   pass: standing record added to the matrix claims section.
5. **§28 task list: "capability update" (later baseline change) was not
   an explicit session task.** FIXED this pass: added to T5.
6. **No contradiction found** between the reconstruction and the
   original on any engine, gating, safety or scope decision: FD-1..FD-4
   and the deliverable set match the original faithfully. The
   reconstruction's only real losses were the compressions above.
