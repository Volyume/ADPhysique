# CC25 COST GOVERNANCE LEDGER (founder order 2026-08-20, §17)

Budget: max 2 pre-synthesis subagents (lowest suitable tier); max 2
red-team subagents post-architecture. Opus subagents forbidden without
explicit founder approval. Direct tools before agents.

| # | Agent | Question | Tier | Why lowest suitable | Result | Follow-up |
|---|---|---|---|---|---|---|
| RT-1 | Technical red team (post-architecture slot 1/2) | Break the CC25 architecture: contamination, provenance, sync, precedence, state machine | sonnet | Lowest SUITABLE: sustained multi-document adversarial reasoning over a 1,219-line architecture + repo verification; haiku judged unable to execute reliably (§1 conditions 1-4 met; judgement recorded here per §13) | pending | — |
| RT-2 | Product red team (slot 2/2) | Break it on inclusivity, UX dignity, claims, no-solution handling, medical overreach, Amendment §29 scenarios | sonnet | same justification | pending | — |

Direct-tool resolutions (no agent spent):
- I-1..I-4 sync contract: read conflict.js (102 ln), registry.js head,
  tables/weeklyCheckins.js head. Questions closed.
- K-1/K-2 consent + telemetry: R1 had already read Article9ConsentScreen;
  greps located record_health_consent RPC, consent_log migrations 019/024,
  engineTelemetry re-export. Closed.
- J-1..J-3 entitlements + a11y + Health surface: withProGuard call-site
  grep (18 sites, all nutrition/coaching), a11y prop counts (1,564 labels
  / 686 roles), SettingsHealthScreen read (device-health integrations,
  not capability). Closed at architecture grain.
- H-1 nutrition training-reads: grep of nutritionEngine + food/* — no
  direct workout reads in decision paths (display-level recompReframe
  already mapped by AUDIT-L). Closed.
- Subagent budget spent pre-synthesis: 0/2.

## CC26 (2026-08-20)

- Implementation subagents: 0/2 used. Entire build hands-on with
  direct tools.
- Red team: 1/1 used - Sonnet, general-purpose, single bounded pass
  over the diff + laws. Tier justification: adversarial review of
  Article 9 consent/erasure and sync-convergence code is above Haiku's
  reliability floor (quality variance matters on safety-adjacent
  surfaces); Opus is forbidden without founder approval and was not
  needed. Yield: 8 findings (2 blockers), all adjudicated and landed.
- Opus subagents: 0. Escalation requests: 0.
- Direct-tool substitutions: local Postgres execution testing of
  migrations 145-147 (no agent; caught the 147 CHECK regression);
  export-surface scope check (BACKUP_TABLES) by direct read.

## GAP-CLOSURE WORKSTREAM (2026-08-21, order section 29)

Budget: Haiku MAX 6, Sonnet MAX 1, Opus 0. Concurrency 1 (2 only for
independent research + mechanical repo work). No agent-to-agent
delegation. Maximums, not targets.

| Slot | Tier | Task | Output | Why needed | Result |
|---|---|---|---|---|---|
| 1 | Haiku | Condition-directory evidence batch (12 full workups + 3 currency checks + completeness candidates) | research/R7-condition-directory-evidence.md | ~15 populations x multiple authoritative sources = mechanical extraction vs fixed schema; R5 covers only 8 populations; direct hands-on would burn main-loop context on gathering (order 29.1) | COMPLETE (12/12, no blocks; adjudication pending) |
| 2 | Haiku | Injury/body-region evidence batch (order section 6 seed families by region + completeness) | research/R8-injury-directory-evidence.md | Largely NEW ground (R3 covered general reintroduction/pain-monitoring, not per-region injury guidance); same mechanical-extraction shape as slot 1 | COMPLETE (37 families; DEFECT: zero URLs returned; education lines unshippable as-is - both handled at adjudication: lead-written education, live-verified citations) |

| 3 | Haiku | Rule-shaped NULL-worklist curation (unilateralLoadable, gripDemand, bilateralUpper/Lower, floorAccess, balanceDemand, weightBearingHands follow-through) in CURATED_DEMANDS | demands.js curated entries + regenerated coverage report | ~150 mechanical cells against lead-written per-axis rules; the two judgement axes were curated by the lead first (d937134); order 29.7 lists exercise tagging as Haiku work | COMPLETE with lead corrections: 29 duplicate keys re-merged as per-field unions (whole-entry replacement was silently dropping earlier fields), three judgement fixes (Single-Arm fly one-side loadable; Sled Push needs both arms; Assault Bike does not), one stale pin re-expressed synthetically. Nine axes at 100 percent; 26 deliberate machine-design NULLs stand. |

| 4 | Haiku | Five family plans (GC-D8 list) authored in seedRoutines against the LOCKED red oracle (capabilityFamilyPlans suite entries written by the lead first) | seedRoutines.js plans + REQUIRED_EXERCISES + seed-key bump + registry FAMILIES rows | Plan data entry against a mechanical compatibility oracle is order 29.7 routine-data work; the lead defined audiences, thresholds and allowed quad options | COMPLETE with lead corrections: two chest flies replaced with shoulder work on the home plan's pull day, an off-scope rear-delt row swapped for calf work in the lower plan, one awkward note reworded. Oracle + wording sweep + walks green. |

| 5 | Haiku | Phase H scenario suites + coverage generator, implemented mechanically against PHASE-H-SPEC.md (lead-authored contract with exact fixtures, assertions and bounds) | directoryScenarioMatrix.test.js + movementConstraintFixtures.test.js + scripts/scenario-coverage.mjs + SCENARIO-COVERAGE.md | Directory-wide fixture generation is order 29.7 deterministic-scenario work; the spec fixes every judgement call | COMPLETE with lead corrections: circular fallback removed from the no-invented-restriction check, vacuous assertion replaced with split-exhaustiveness, exercise-list field bug fixed, tautological stack restoration replaced with real episode-end set equalities + intersection proofs, boolean-vs-integer comparisons fixed (two vacuous loops made real), soft if-guards hardened, injuries materialised as episodes, generator rewritten to emit the suite's own numbers (stub counted 42 from stray ids; real count 40). All green after strengthening - the product passes the honest versions. |

Direct-tool substitutions log:
- Phase A traceability: entirely direct reads (0 agents).

## FINAL SPEC RECONCILIATION (2026-08-21, founder order after the gap-closure report)

Budget: Haiku MAX 1 (mechanical traceability/coverage only), Sonnet 0,
Opus 0, no broad research restart, targeted tests only, ONE full suite
only if behavioural code changed.

Agents used: **ZERO** (the allowed Haiku slot went unspent). Every
area ran on direct tools:
- Area 1: the exact original amendment recovered from the session
  uploads directory by filesystem search, banked verbatim (md5
  recorded), traced section-by-section hands-on; 20-scenario walk
  verified against live code by grep/read.
- Areas 2-5: proofs and accountings from direct reads of the live
  modules and the banked research files.
- Area 6: rule-driven audit SCRIPT (adapted-setup-coverage.mjs) instead
  of an agent - deterministic, auditable, re-runnable; lead spot-checks
  caught and fixed two rule defects (grip-purpose strap absurdity,
  seated walks) before anything shipped.
Behavioural code changed (adaptedSetup class layer + one screen line),
so the ONE full suite ran at the close per the order.

## NO-OUTSIDE-PARTY CORRECTION (2026-08-21)

Agents used: ZERO (direct tools only, per the order). Bounded runtime
change: capability telemetry retirement + one consent-copy correction;
targeted suites during (telemetry 4 suites 169 tests; changed-module
filter 116 tests), ONE full suite at the close.
