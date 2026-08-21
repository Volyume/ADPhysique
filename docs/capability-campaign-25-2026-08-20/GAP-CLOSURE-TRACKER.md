# GAP-CLOSURE WORKSTREAM TRACKER (order 2026-08-21; section 29.17 continuation artefact)

Authority: GAP-CLOSURE-ORDER-2026-08-21.md (banked copy of the founder
order). Start main: 1259a9f. Branch: claude/build-name-prompt-apple-auth-fp49by.
Agent slots used: 2/6 Haiku (R7, R8), 0/1 Sonnet, 0 Opus.
PRODUCTION MIGRATIONS: 145-150 NOT RUN; any new files also NOT RUN.

## Phase state

- [x] A Traceability — ORIGINAL-SPEC-TRACEABILITY.md (gaps G1-G11; T13
  instructions = the one MISSED item; amendment source files never
  committed - founder flag recorded)
- [x] B Research/taxonomy COMPLETE: R7 (12 populations) + R8 (37 injury
  families) banked; conditions.js 20 profiles + injuries.js 20 profiles,
  schema-validated, every URL live-checked (two fabricated-identifier
  catches fixed via PubMed); dossiers/ template + SCI + MS + Parkinson's.
  R8 defect recorded: zero URLs returned (contract breach); education
  candidates adjudicated unshippable (clinical framing); movement-question
  evidence used as the mapping basis. Deferred with reasons: ME/CFS and
  fibromyalgia (2021 UK guidance change makes exercise framing clinically
  sensitive; CLIN register), CRPS, systemic autoimmune, CKD/COPD
  (comorbidity-adjustment class, not primary functional constraint).
- [x] C Movement-path ontology + tagging COMPLETE: audit doc (one axis
  added: weight_bearing_hands; every other section 8 candidate rejected
  with its failing test); migrate_151 written NOT applied; nine axes at
  100 percent coverage, 26 deliberate machine-design NULLs + small wrist
  tail; floors raised; slot-3 batch corrected on lead review (dupe-key
  merge, three value fixes)
- [x] D UX/discovery COMPLETE: TrainingConsiderationsScreen (search,
  detail, stateless preselect into the add flow, OTHER path), unguarded
  route, HowYouTrain entry + preselect consumption, discovery pins suite
- [ ] E Routines/library
- [ ] F Deep integration
- [~] G Accessibility/content: adapted-setup layer + 30-entry content
  landed with validation; A11Y-CRITICAL-JOURNEY-AUDIT.md records
  code-verified vs device-pending; residue = final-review walk
- [ ] H Scenario/coverage gate
- [ ] I Final truth pass
- [ ] Final gate (40 items) + ONE full suite + merge + report

## Decisions (append; register-grade ones also go to DECISION-REGISTER.md)

## Next exact action

Slot 4 (family plans) in flight; on return: lead diff review, green the
oracle, commit; then dispatch slot 5 per PHASE-H-SPEC.md; then Phase I
registry rebuild + matrix statuses + final gate.

## Internal defect log

- ID-1 (2026-08-21): two lead commits (fc933a3, 99362df) used git add -A
  while Haiku slot 3 was live in the tree, sweeping its mid-flight
  demands.js edits and an intentionally-red oracle into history.
  Content was reviewed and corrected afterwards (dupe-key merge, three
  judgement fixes); no work lost. Standing rule from here: explicit-path
  staging ONLY while any agent is running.

## Phase F verification record (order section 18: no parallel architecture)

Every new layer feeds the EXISTING seams; verified mechanism by
mechanism: directory questions -> the one consent-gated add flow
(preselect, pinned); new axis -> the generic resolver/picker/
generation/compat paths (no special-casing anywhere); new families ->
ordinary seeded plans (computed browse compatibility, install checks,
activation all inherited); adapted setup -> the existing exercise
detail surface; profiles' family pointers -> text discovery (33.20:
never presetting state); coach/check-in/reintroduction/learning
untouched by construction (GC-D1: the directory cannot reach them) and
re-proven by the standing suites. Nothing gained a second write path,
a second store, or a per-condition branch anywhere in engine code.
