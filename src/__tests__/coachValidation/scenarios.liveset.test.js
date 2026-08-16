/**
 * scenarios.liveset.test.js — Campaign 21, Step 5-6 liveSet family.
 *
 * The livePrescription (liveSet) set-prescription family covering
 * T-LIVESET-01..09 oracle blocks (~30 scenarios). Every expected outcome
 * is derived from a LOCKED ORACLE-LOCK.md block (LEAD-REVIEW: ACCEPTED
 * 2026-08-16) and cites it in the scenario's `why`.
 *
 * This family tests the set-level prescription engine (resolveSetPrescription,
 * assembleEvidencePacket) which handles:
 * - First-time seeding (FIRST_TIME_BAND)
 * - Load progression (MATCH_LOAD_ADD_REP, LOAD_ADVANCE_RANGE_TOPPED, drops)
 * - Session-driven adjustments (CURRENT_SESSION_STRONGER/FATIGUE_ADJUST)
 * - User overrides (USER_CHOICE_RESPECTED)
 * - Structural learning (STABLE_BACKOFF_PATTERN)
 * - Senior precedence (deload, type gates, recovery holds)
 * - Rep targets (the beat rule with decline-per-position)
 * - Edge cases (reps_only, AMRAP, outlier discount, layoff caps)
 *
 * Scenario definitions live in scenarios.liveset.data.js; this file is
 * the executable half: runScenarios(SCENARIOS) runs the declarative tests.
 */
import { runScenarios } from './harness';
import { SCENARIOS } from './scenarios.liveset.data';

runScenarios(SCENARIOS);
