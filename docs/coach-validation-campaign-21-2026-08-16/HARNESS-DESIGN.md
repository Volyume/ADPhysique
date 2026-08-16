# Campaign 21 — validation harness design (lead, binding for Steps 4-10)

Purpose: one transparent way to express 180+ whole-athlete scenarios without
180 copy-pasted Jest blocks, while every scenario stays individually readable
(input → expected action → forbidden action → reason) and executes through the
REAL production seams. No new production code; the harness is test-side only.

## 1. Files

```
src/__tests__/coachValidation/
  harness.js                 — scenario runner + athlete builders (test-side only)
  ledger.json                — the coach decision ledger (Step 2, machine-readable)
  scenarios.training.test.js — family: training / programme (~60)
  scenarios.liveset.test.js  — family: live set prescription (~30)
  scenarios.nutrition.test.js— family: nutrition / maintenance (~35)
  scenarios.recovery.test.js — family: recovery / re-entry / adherence (~25)
  scenarios.conflict.test.js — family: cross-domain / conflict / safety (~30)
  restraint.test.js          — Step 7 no-change scenarios (first-class)
  boundaries.test.js         — Step 9 threshold sweeps (generated from ledger thresholds)
  temporal.test.js           — Step 10 ordering / idempotence / replay
  properties.test.js         — Layer 3 perturbation invariants
  ledger.coverage.test.js    — Step 13 gate: every ledger rule reaches required statuses
```

Layer 1 (decision-unit/boundary) additions that belong to a specific module
stay colocated with that module's existing suite (house convention), and are
REGISTERED in the ledger by test id so the coverage gate sees them.

## 2. Scenario shape (declarative, one object per scenario)

```js
{
  id: 'TRN-014',
  family: 'training',
  why: 'one weak session must not trigger volume reduction (restraint law)',
  rules: ['T-VOLUME-03', 'T-WEEKLY-02'],          // ledger rule_ids exercised
  athlete: b.intermediate().gainPhase().week(4),   // builder chain → evidence facts
  facts: { ... },                                  // explicit overrides of builder output
  run: 'weeklyCoach',                              // named production ENTRY (see §3)
  must: [ { kind: 'decision', path: 'volumeSignal', equals: 0 }, ... ],
  may: [ ... ],                                    // asserted as "if present, must equal"
  mustNot: [ { kind: 'absent', path: 'interventions', contains: 'reduce' }, ... ],
  provenance: { equals: 'hold_default' },          // reason-code assertion where applicable
  persisted: { table: 'coach_outputs', check: fn } // optional, whole-chain proof
}
```

`must` / `mustNot` assertion kinds are a SMALL fixed set (equals, within,
contains, absent, calledWith, notCalled, throwsNever) — no mini-language
beyond that. A scenario file is a flat array of these objects plus
`runScenarios(list)`; the runner produces one Jest `test` per scenario so
failures name the scenario id and its `why`.

## 3. Production entry points (the runner's `run` registry)

Each named entry calls the REAL authoritative seam with fixtures — never a
reimplementation:

- `weeklyCoach` → `runWeeklyCoach` with a fixture evidence bundle.
- `sessionAdjust` → `computeSessionAdjustments` via `buildSessionAdjustmentInput`.
- `liveSet` → `assembleEvidencePacket` + `resolveSetPrescription` (and, for
  integration-risk rows, the mounted ActiveWorkoutScreen path already
  established in screen-mount.test.js).
- `adaptive` → `runAdaptiveEngine` / `computeAdaptiveDecision`.
- `deload` → `shouldDeload` / `generateDeloadPrescription`.
- `nutrition` → the traced nutrition-target/trend/maintenance authorities
  (exact functions fixed after Step 1 lands).
- `intervention` → C18 `coachIntervention` seams.
- Safety-path entries execute the REAL gates (fail-closed reads, ED-flag
  suppression) with mocked IO failures, never stubs of the gate itself.

Mounted/integration coverage: consequential flows with integration risk get
one representative mounted test per family (screen-mount harness), proving the
production caller uses the seam; the bulk runs at the seam.

## 4. Ledger schema (ledger.json)

```json
{ "rule_id": "T-WEEKLY-02", "domain": "weekly", "source_file": "src/lib/weeklyCoach.js",
  "authority": "runWeeklyCoach", "decision": "volumeSignal -1|0|+1",
  "direct_case": ["test-id"], "boundary_case": ["…"], "conflict_case": ["…"],
  "hold_case": ["…"], "safety_case": ["…"] , "safety_na_reason": null,
  "whole_scenario_ids": ["TRN-001"], "property_test_ids": ["PROP-004"],
  "status": "UNMAPPED|MAPPED|ORACLE_LOCKED|UNIT_PROVEN|WHOLE_CHAIN_PROVEN|ADVERSARIAL_PROVEN",
  "oracle": { "expected": "…", "authority_source": "founder-ruling|product-law|architecture|existing-test",
              "suspected_defect": false, "notes": "…" } }
```

`ledger.coverage.test.js` fails if any rule lacks a required case class
without a recorded N/A reason, or sits below WHOLE_CHAIN_PROVEN at close
(ADVERSARIAL_PROVEN for rules named in Layer 3).

## 5. Determinism rules for fixtures

Fixed epoch NOW; timestamps derived; no Math.random without a seeded PRNG; all
builders pure; every scenario runnable in isolation; runner asserts
double-invocation identity for entries marked idempotent (Step 10).

## 6. Authority note for scenario writers

Haiku agents expand ONLY from ORACLE_LOCKED ledger rows. A scenario whose
expected outcome is not derivable from a locked row returns to the lead —
never guessed.
