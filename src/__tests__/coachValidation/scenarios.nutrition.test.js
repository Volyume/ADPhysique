/**
 * scenarios.nutrition.test.js — Campaign 21 NUTRITION/MAINTENANCE family.
 *
 * Step 5 family: N-TARGETS (target calculation), N-ADAPTIVE (weight-trend
 * interpretation), N-MAINT (Campaign 19 effective-maintenance authority),
 * N-COACH (weekly-coach nutrition gates not already proven by the conflict
 * family), N-VOL (training-volume outcome memory, nutrition-adjacent),
 * N-BANK (calorie bank) and N-ADHERENCE (logging-quality tolerance bands).
 *
 * Scenario definitions live in scenarios.nutrition.data.js; this file is the
 * executable half: imports and runs them via runScenarios(SCENARIOS).
 *
 * Authority: docs/coach-validation-campaign-21-2026-08-16/ORACLE-LOCK.md
 * (LEAD-REVIEW: ACCEPTED 2026-08-16).
 */
import { runScenarios } from './harness';
import { SCENARIOS } from './scenarios.nutrition.data';

runScenarios(SCENARIOS);
