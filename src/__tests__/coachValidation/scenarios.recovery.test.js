/**
 * scenarios.recovery.test.js — Campaign 21 recovery/re-entry/adherence family.
 *
 * Step 5 family: ~25 scenarios covering readiness rules (T-RECOVERY-01),
 * re-entry easing (T-RECOVERY-02), recovery state resolution (T-RECOVERY-03),
 * and deload prescription (T-RECOVERY-04).
 *
 * Scenario definitions live in scenarios.recovery.data.js; this file is the
 * executable half: imports and runs them via runScenarios(SCENARIOS).
 *
 * T-RECOVERY-05 excluded from coverage (not production-reachable per ORACLE).
 * Four scenarios marked `pending: true` (recovery state resolution requires
 * programmePosition/blockAdvisor internal plumbing not exposed via sessionAdjust
 * entry point) — see DISAGREEMENTS/pending list in final report.
 *
 * Authority: docs/coach-validation-campaign-21-2026-08-16/ORACLE-LOCK.md
 * (LEAD-REVIEW: ACCEPTED 2026-08-16).
 */
import { runScenarios } from './harness';
import { SCENARIOS } from './scenarios.recovery.data';

runScenarios(SCENARIOS);
