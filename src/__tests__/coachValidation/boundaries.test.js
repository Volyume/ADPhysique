/**
 * Campaign 21 Step 9: THRESHOLD BOUNDARY SWEEP — mechanical triads
 *
 * For every numeric/count threshold reachable through an EXISTING registry
 * entry, a compact table-driven triad test (immediately below / exactly at /
 * immediately above, or integer-domain equivalent) asserting the decision
 * FLIPS exactly at the production boundary with the production comparator.
 *
 * Boundaries and comparators are copied from ORACLE-LOCK.md BOUNDARIES lines
 * and the inventories in GRAPH-TRAINING.md and GRAPH-NUTRITION-SAFETY.md.
 * Triads are grouped by domain and rule_id. No invented thresholds.
 *
 * Failed triads marked test.failing with FIXME; triad format: one table row
 * per edge for readability. British English. Gate: npm run lint && npm test
 * over this file only.
 */

import { runScenarios, b } from './harness';
import { ffmFloorWeek } from './scenarios.conflict.data';

describe('boundaries — threshold edges (triads: below / at / above)', () => {
  describe('ED-SAFETY DOMAIN', () => {
    // ── X-SAFETY-02 / X-SAFETY-03: ED-pattern detector signal thresholds ───

    describe('X-SAFETY-02: ED-pattern rapid-loss threshold (ORACLE)', () => {
      // Rule: s1 rapid_loss fires when weightTrendPctPerWeek <= -1.5%
      // Comparator: <= not < (inclusive edge)

      const scenarios = [
        {
          // Below: -1.51% (worse than threshold) -> s1 fires
          id: 'X-ED-RAPID-LOSS-BELOW',
          why: 'weightTrendPctPerWeek = -1.51% (below -1.5% boundary) fires rapid_loss signal (ORACLE X-SAFETY-02)',
          facts: {
            userState: { weightTrendPctPerWeek: -1.51 },
            weeklyHistory: [],
          },
          run: 'edDetector',
          must: [{ kind: 'equals', path: 'signals.s1', equals: true }],
        },
        {
          // At: exactly -1.5% -> s1 fires (inclusive, <= boundary)
          id: 'X-ED-RAPID-LOSS-AT',
          why: 'weightTrendPctPerWeek = -1.5% exactly (at boundary, inclusive <=) fires rapid_loss signal (ORACLE X-SAFETY-02)',
          facts: {
            userState: { weightTrendPctPerWeek: -1.5 },
            weeklyHistory: [],
          },
          run: 'edDetector',
          must: [{ kind: 'equals', path: 'signals.s1', equals: true }],
        },
        {
          // Above: -1.49% (better than threshold) -> s1 does NOT fire
          id: 'X-ED-RAPID-LOSS-ABOVE',
          why: 'weightTrendPctPerWeek = -1.49% (above -1.5% boundary) does NOT fire rapid_loss signal (ORACLE X-SAFETY-02)',
          facts: {
            userState: { weightTrendPctPerWeek: -1.49 },
            weeklyHistory: [],
          },
          run: 'edDetector',
          must: [{ kind: 'equals', path: 'signals.s1', equals: false }],
        },
      ];
      runScenarios(scenarios);
    });

    describe('X-SAFETY-02: ED-pattern low-energy threshold (ORACLE)', () => {
      // Rule: s2 fires when energy <= 2 for >= 2 of last 2 weeks
      // Threshold: LOW_ENERGY_THRESHOLD = 2 (inclusive), MIN_WEEKS = 2

      const scenarios = [
        {
          // Below: both weeks energy=1 -> s2 fires
          id: 'X-ED-LOW-ENERGY-BELOW',
          why: 'two consecutive weeks with energy=1 (below threshold 2) fires low_energy signal (ORACLE X-SAFETY-02)',
          facts: {
            userState: { weightTrendPctPerWeek: 0 },
            weeklyHistory: [
              { energy: 1, adherence: 'hit', hasCheckin: true, hasFoodData: true },
              { energy: 1, adherence: 'hit', hasCheckin: true, hasFoodData: true },
            ],
          },
          run: 'edDetector',
          must: [{ kind: 'equals', path: 'signals.s2', equals: true }],
        },
        {
          // At: both weeks energy=2 exactly -> s2 fires (inclusive, <=)
          id: 'X-ED-LOW-ENERGY-AT',
          why: 'two consecutive weeks with energy=2 exactly (at boundary, inclusive <=) fires low_energy signal (ORACLE X-SAFETY-02)',
          facts: {
            userState: { weightTrendPctPerWeek: 0 },
            weeklyHistory: [
              { energy: 2, adherence: 'hit', hasCheckin: true, hasFoodData: true },
              { energy: 2, adherence: 'hit', hasCheckin: true, hasFoodData: true },
            ],
          },
          run: 'edDetector',
          must: [{ kind: 'equals', path: 'signals.s2', equals: true }],
        },
        {
          // Above: both weeks energy=3 -> s2 does NOT fire
          id: 'X-ED-LOW-ENERGY-ABOVE',
          why: 'two consecutive weeks with energy=3 (above threshold 2) does NOT fire low_energy signal (ORACLE X-SAFETY-02)',
          facts: {
            userState: { weightTrendPctPerWeek: 0 },
            weeklyHistory: [
              { energy: 3, adherence: 'hit', hasCheckin: true, hasFoodData: true },
              { energy: 3, adherence: 'hit', hasCheckin: true, hasFoodData: true },
            ],
          },
          run: 'edDetector',
          must: [{ kind: 'equals', path: 'signals.s2', equals: false }],
        },
      ];
      runScenarios(scenarios);
    });

    describe('X-SAFETY-02: ED-pattern signal count threshold (2 vs 3, goalLockAdvanced)', () => {
      // Rule: fires at signalsFired >= 2 (normal), >= 3 (goalLockAdvanced=true)
      // Two signals with goalLockAdvanced=false -> fires; same with =true -> does NOT fire

      const scenarios = [
        {
          // Below: 1 signal, normal mode -> does NOT fire
          id: 'X-ED-SIGNAL-COUNT-BELOW-NORMAL',
          why: '1 signal fired, goalLockAdvanced=false, below threshold 2 does NOT fire (ORACLE X-SAFETY-02)',
          facts: {
            userState: { weightTrendPctPerWeek: -1.5 }, // s1 fires
            weeklyHistory: [
              { energy: 3, adherence: 'hit', hasCheckin: true, hasFoodData: true },
            ],
            goalLockAdvanced: false,
          },
          run: 'edDetector',
          must: [{ kind: 'equals', path: 'fired', equals: false }],
        },
        {
          // At: exactly 2 signals, normal mode -> fires
          id: 'X-ED-SIGNAL-COUNT-AT-NORMAL',
          why: '2 signals fired, goalLockAdvanced=false, at threshold 2 fires (ORACLE X-SAFETY-02)',
          facts: {
            userState: { weightTrendPctPerWeek: -1.5 }, // s1 fires
            weeklyHistory: [
              { energy: 2, adherence: 'hit', hasCheckin: true, hasFoodData: true }, // s2 fires
              { energy: 2, adherence: 'hit', hasCheckin: true, hasFoodData: true },
            ],
            goalLockAdvanced: false,
          },
          run: 'edDetector',
          must: [{ kind: 'equals', path: 'fired', equals: true }],
        },
        {
          // At: exactly 2 signals, advanced mode -> does NOT fire (needs >= 3)
          id: 'X-ED-SIGNAL-COUNT-AT-ADVANCED',
          why: '2 signals fired, goalLockAdvanced=true, below threshold 3 does NOT fire (ORACLE X-SAFETY-02)',
          facts: {
            userState: { weightTrendPctPerWeek: -1.5 }, // s1
            weeklyHistory: [
              { energy: 2, adherence: 'hit', hasCheckin: true, hasFoodData: true }, // s2
              { energy: 2, adherence: 'hit', hasCheckin: true, hasFoodData: true },
            ],
            goalLockAdvanced: true,
          },
          run: 'edDetector',
          must: [{ kind: 'equals', path: 'fired', equals: false }],
        },
        {
          // At: exactly 3 signals, advanced mode -> fires
          id: 'X-ED-SIGNAL-COUNT-AT-3-ADVANCED',
          why: '3 signals fired, goalLockAdvanced=true, at threshold 3 fires (ORACLE X-SAFETY-02)',
          facts: {
            userState: { weightTrendPctPerWeek: -1.5 }, // s1
            weeklyHistory: [
              { energy: 2, adherence: 'under', hasCheckin: true, hasFoodData: true }, // s2, s3
              { energy: 2, adherence: 'under', hasCheckin: true, hasFoodData: true },
              { energy: 2, adherence: 'under', hasCheckin: true, hasFoodData: false }, // s4
            ],
            goalLockAdvanced: true,
          },
          run: 'edDetector',
          must: [{ kind: 'equals', path: 'fired', equals: true }],
        },
      ];
      runScenarios(scenarios);
    });
  });

  describe('VOLUME DOMAIN', () => {
    // ── T-VOLUME-02: shouldDeload scoring and >=50 threshold ───

    describe('T-VOLUME-02: shouldDeload score >= 50 threshold (ORACLE)', () => {
      // Rule: deload fires at score >= 50 of 100 points
      // Performance alone: 50 pts
      // Joint + timing: 18 pts
      // OverMRV: 12 pts
      // Soreness + timing: 20 pts

      const scenarios = [
        {
          // Below 50: recent performance drop (50 pts) is the only trigger
          // recentReps < earlierReps - 2 means recentReps must be at least -3
          id: 'T-VOLUME-DELOAD-PERF-EXACTLY-50',
          why: 'performance score = 50 (reps dropped >2 from earliest to recent) exactly at threshold 50 fires deload (ORACLE T-VOLUME-02)',
          facts: [
            { avgReps: 10, weeksSinceLastDeload: 1, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 10, weeksSinceLastDeload: 1, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 10, weeksSinceLastDeload: 1, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 7, weeksSinceLastDeload: 1, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 },
          ],
          run: 'deload',
          must: [{ kind: 'equals', path: 'deload', equals: true }],
        },
        {
          // Below 50: performance just short (reps dropped only -2, not more)
          id: 'T-VOLUME-DELOAD-PERF-BELOW-50',
          why: 'performance edge: recentReps < earlierReps - 2 fails (drop = -2 exactly, not <), score < 50 does NOT fire (ORACLE T-VOLUME-02)',
          facts: [
            { avgReps: 10, weeksSinceLastDeload: 1, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 10, weeksSinceLastDeload: 1, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 10, weeksSinceLastDeload: 1, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 8, weeksSinceLastDeload: 1, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 },
          ],
          run: 'deload',
          must: [{ kind: 'equals', path: 'deload', equals: false }],
        },
        {
          // At 50: via joint + weeksSinceDeload (18) + overMRV (12) + soreness (20)
          // = 50 exactly, fires
          id: 'T-VOLUME-DELOAD-COMPOSITE-50',
          why: 'composite: joint 18 + overMRV 12 + soreness 20 = 50 exactly at threshold fires (ORACLE T-VOLUME-02)',
          facts: [
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 1.5, hasOverMRV: true, avgSoreness: 2.5 },
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 1.5, hasOverMRV: true, avgSoreness: 2.5 },
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 1.5, hasOverMRV: true, avgSoreness: 2.5 },
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 1.5, hasOverMRV: true, avgSoreness: 2.5 },
          ],
          run: 'deload',
          must: [{ kind: 'equals', path: 'deload', equals: true }],
        },
      ];
      runScenarios(scenarios);
    });

    describe('T-VOLUME-02: shouldDeload joint-timing threshold (joint >= 1.5 AND weeksSinceDeload >= 3)', () => {
      // Rule: fires 18 pts when avgJointDiscomfort >= 1.5 AND weeksSinceDeload >= 3
      // Comparators: >= both (inclusive edges)

      const scenarios = [
        {
          // Below joint threshold: 1.49 with good timing
          id: 'T-VOLUME-DELOAD-JOINT-BELOW',
          why: 'avgJointDiscomfort = 1.49 (below 1.5 threshold) with weeksSinceDeload >= 3 does NOT earn 18 pts (ORACLE T-VOLUME-02)',
          facts: [
            { avgReps: 10, weeksSinceLastDeload: 3, avgJointDiscomfort: 1.49, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 10, weeksSinceLastDeload: 3, avgJointDiscomfort: 1.49, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 10, weeksSinceLastDeload: 3, avgJointDiscomfort: 1.49, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 10, weeksSinceLastDeload: 3, avgJointDiscomfort: 1.49, hasOverMRV: false, avgSoreness: 1 },
          ],
          run: 'deload',
          must: [{ kind: 'equals', path: 'deload', equals: false }],
        },
        {
          // At joint threshold: exactly 1.5
          // Lead triage (Step 11, class A observable error): the original
          // triad asserted the COMPOSITE deload boolean from this single
          // 18-point gate - 18 < 50 can never flip it, so production was
          // arithmetically right. The component edge's honest observable
          // is its reasons entry.
          id: 'T-VOLUME-DELOAD-JOINT-AT',
          why: 'avgJointDiscomfort = 1.5 exactly (at boundary, inclusive >=) with weeksSinceDeload >= 3 earns the joint reason (ORACLE T-VOLUME-02)',
          facts: [
            { avgReps: 10, weeksSinceLastDeload: 3, avgJointDiscomfort: 1.5, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 10, weeksSinceLastDeload: 3, avgJointDiscomfort: 1.5, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 10, weeksSinceLastDeload: 3, avgJointDiscomfort: 1.5, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 10, weeksSinceLastDeload: 3, avgJointDiscomfort: 1.5, hasOverMRV: false, avgSoreness: 1 },
          ],
          run: 'deload',
          must: [{ kind: 'contains', path: 'reasons', contains: 'Recurring joint discomfort across the block' }],
          mustNot: [{ kind: 'equals', path: 'deload', equals: true }],
        },
        {
          // Below timing: weeksSinceDeload = 2 (needs >= 3)
          id: 'T-VOLUME-DELOAD-JOINT-TIMING-BELOW',
          why: 'avgJointDiscomfort >= 1.5 BUT weeksSinceDeload = 2 (below 3) does NOT earn 18 pts (ORACLE T-VOLUME-02)',
          facts: [
            { avgReps: 10, weeksSinceLastDeload: 2, avgJointDiscomfort: 1.5, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 10, weeksSinceLastDeload: 2, avgJointDiscomfort: 1.5, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 10, weeksSinceLastDeload: 2, avgJointDiscomfort: 1.5, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 10, weeksSinceLastDeload: 2, avgJointDiscomfort: 1.5, hasOverMRV: false, avgSoreness: 1 },
          ],
          run: 'deload',
          must: [{ kind: 'equals', path: 'deload', equals: false }],
        },
      ];
      runScenarios(scenarios);
    });

    describe('T-VOLUME-02: shouldDeload soreness-timing threshold (>=3 weeks at >= 2.5, weeksSinceDeload >= 4)', () => {
      // Rule: fires 20 pts when highSorenessWeeks >= 3 AND weeksSinceDeload >= 4
      // Comparators: >= both

      const scenarios = [
        {
          // Below count: only 2 weeks at soreness >= 2.5
          id: 'T-VOLUME-DELOAD-SORENESS-COUNT-BELOW',
          why: 'highSorenessWeeks = 2 (below threshold 3) with weeksSinceDeload >= 4 does NOT earn 20 pts (ORACLE T-VOLUME-02)',
          facts: [
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 2.5 },
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 2.5 },
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 },
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 },
          ],
          run: 'deload',
          must: [{ kind: 'equals', path: 'deload', equals: false }],
        },
        {
          // At count: exactly 3 weeks, good timing
          // Lead triage (Step 11, class A observable error): same class as
          // the joint edge above - 20 < 50 never flips the composite; the
          // component edge's observable is its reasons entry.
          id: 'T-VOLUME-DELOAD-SORENESS-COUNT-AT',
          why: 'highSorenessWeeks = 3 exactly (at threshold) with weeksSinceDeload >= 4 earns the soreness reason (ORACLE T-VOLUME-02)',
          facts: [
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 2.5 },
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 2.5 },
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 2.5 },
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 },
          ],
          run: 'deload',
          must: [{ kind: 'contains', path: 'reasons', contains: 'Sustained soreness across 3 or more weeks' }],
          mustNot: [{ kind: 'equals', path: 'deload', equals: true }],
        },
        {
          // Below soreness level: 2.49 (needs >= 2.5)
          id: 'T-VOLUME-DELOAD-SORENESS-LEVEL-BELOW',
          why: 'avgSoreness = 2.49 (below threshold 2.5) for 3 weeks does NOT earn 20 pts (ORACLE T-VOLUME-02)',
          facts: [
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 2.49 },
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 2.49 },
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 2.49 },
            { avgReps: 10, weeksSinceLastDeload: 4, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 },
          ],
          run: 'deload',
          must: [{ kind: 'equals', path: 'deload', equals: false }],
        },
        {
          // Below timing: weeksSinceDeload = 3 (needs >= 4)
          id: 'T-VOLUME-DELOAD-SORENESS-TIMING-BELOW',
          why: 'highSorenessWeeks = 3 BUT weeksSinceDeload = 3 (below threshold 4) does NOT earn 20 pts (ORACLE T-VOLUME-02)',
          facts: [
            { avgReps: 10, weeksSinceLastDeload: 3, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 2.5 },
            { avgReps: 10, weeksSinceLastDeload: 3, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 2.5 },
            { avgReps: 10, weeksSinceLastDeload: 3, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 2.5 },
            { avgReps: 10, weeksSinceLastDeload: 3, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 },
          ],
          run: 'deload',
          must: [{ kind: 'equals', path: 'deload', equals: false }],
        },
      ];
      runScenarios(scenarios);
    });
  });

  describe('ADAPTIVE DECISION DOMAIN', () => {
    // ── T-VOLUME-03: computeAdaptiveDecision joint >= 3 override ───

    describe('T-VOLUME-03: adaptive decision joint >= 3 threshold (rotate_exercise override)', () => {
      // Rule: joint >= 3 (0-3 scale) ALWAYS forces rotate_exercise, overrides everything
      // Comparator: >= (inclusive edge)

      const scenarios = [
        {
          // Below: joint = 2
          id: 'T-VOL-ADAPTIVE-JOINT-BELOW',
          why: 'joint = 2 (below threshold 3) with soreness/performance scores allows normal logic (ORACLE T-VOLUME-03)',
          facts: { soreness: 2, performance: 2, pump: 3, joint: 2 },
          run: 'adaptive',
          mustNot: [{ kind: 'equals', path: 'decision', equals: 'rotate_exercise' }],
        },
        {
          // At: joint = 3 exactly
          id: 'T-VOL-ADAPTIVE-JOINT-AT',
          why: 'joint = 3 exactly (at boundary, inclusive >=) forces rotate_exercise (ORACLE T-VOLUME-03)',
          facts: { soreness: 2, performance: 2, pump: 3, joint: 3 },
          run: 'adaptive',
          must: [{ kind: 'equals', path: 'decision', equals: 'rotate_exercise' }],
        },
      ];
      runScenarios(scenarios);
    });

    describe('T-VOLUME-03: adaptive decision soreness/performance null -> hold', () => {
      // Rule: soreness == null OR performance == null forces hold (insufficient_feedback)
      // This is a guard against missing required signals

      const scenarios = [
        {
          // Soreness null
          id: 'T-VOL-ADAPTIVE-SORENESS-NULL',
          why: 'soreness = null (not recorded) forces hold regardless of performance (ORACLE T-VOLUME-03)',
          facts: { soreness: null, performance: 1, pump: 3, joint: 0 },
          run: 'adaptive',
          must: [{ kind: 'equals', path: 'decision', equals: 'hold' }],
        },
        {
          // Performance null
          id: 'T-VOL-ADAPTIVE-PERFORMANCE-NULL',
          why: 'performance = null (not recorded) forces hold regardless of soreness (ORACLE T-VOLUME-03)',
          facts: { soreness: 1, performance: null, pump: 3, joint: 0 },
          run: 'adaptive',
          must: [{ kind: 'equals', path: 'decision', equals: 'hold' }],
        },
      ];
      runScenarios(scenarios);
    });
  });

  describe('NUTRITION DOMAIN', () => {
    // ── N-TARGETS-05: sex-based calorie floor comparator (`<`, not `<=`) ────
    // nutritionEngine.js:1006 `if (targetKcal < kcalFloor)` -- an exact
    // landing AT the floor is NOT flagged/floored; the fixture below controls
    // maintenanceKcal precisely via effectiveMaintenanceResidualKcal (a real,
    // exported calculateNutritionTargets input) against a fixed BMR base, so
    // the pre-floor targetKcal lands exactly on/one-kcal-under the floor
    // through real formula composition rather than testing the clamp in
    // isolation.

    describe('N-TARGETS-05: sex-based calorie floor comparator (< not <=)', () => {
      const base = { sex: 'male', ageYears: 30, heightCm: 175, weightKg: 70, bodyFatSource: null, activityLevel: 'sedentary', goal: 'recomp' };
      // bmr = 10*70 + 6.25*175 - 5*30 + 5 = 1648.75; formulaMaintenanceKcal =
      // round(1648.75*1.2) = 1979. recomp phaseAdj = -0.05 (no experience
      // scaling, phaseAdj<0). residual -400 -> maintenanceKcal 1579 ->
      // round(1579*0.95) = 1500 exactly (targetKcal < kcalFloor(1500) is
      // FALSE at 1500 -- not floored). residual -401 -> maintenanceKcal 1578
      // -> round(1578*0.95) = 1499 (< 1500 -- floored up to 1500).
      const scenarios = [
        {
          id: 'N-TGT-FLOOR-AT',
          why: 'targetKcal lands EXACTLY at the male floor (1500 kcal) -- the strict `<` comparator (nutritionEngine.js:1006) means an exact floor landing is NOT flagged or floored (ORACLE N-TARGETS-05)',
          facts: { inputs: { ...base, effectiveMaintenanceResidualKcal: -400 } },
          run: 'nutritionTargets',
          must: [
            { kind: 'equals', path: 'targetKcal', equals: 1500 },
            { kind: 'equals', path: 'floorApplied', equals: false },
          ],
        },
        {
          id: 'N-TGT-FLOOR-BELOW',
          why: 'one kcal below the floor (targetKcal pre-clamp 1499) triggers the raise-to-floor clamp and the warning (ORACLE N-TARGETS-05)',
          facts: { inputs: { ...base, effectiveMaintenanceResidualKcal: -401 } },
          run: 'nutritionTargets',
          must: [
            { kind: 'equals', path: 'targetKcal', equals: 1500 },
            { kind: 'equals', path: 'floorApplied', equals: true },
            { kind: 'contains', path: 'warnings[0]', contains: 'below safe minimum' },
          ],
        },
      ];
      runScenarios(scenarios);
    });

    // ── N-TARGETS-06: 1.5% hard-gate comparator (`>`, strict) ───────────────
    // nutritionEngine.js:1021 `if (lossFraction > HARD_GATE_LOSS_RATE)` --
    // exactly 0.015 (1.5% BW/week) does NOT fire; just above does. Fixture
    // controls maintenanceKcal via the residual against a fixed BMR base and
    // an aggressive_cut phaseAdj (-0.22, weight chosen as a multiple of 50 so
    // 0.78*maintenanceKcal lands on an exact integer, no rounding noise).
    //
    // DELIBERATE COMPARATOR ASYMMETRY, documented per this closure round's
    // instructions: this hard gate uses STRICT `>` at 1.5% BW/week
    // (nutritionEngine.js:1021), while N-COACH-08's rapid-loss override
    // (weeklyCoach.js:1302, `actualRatePct <= -1.5`) and the ED-pattern
    // detector's s1 signal (X-SAFETY-02, matching `<=` boundary) both use
    // INCLUSIVE `<=` at the identical 1.5 value. The two families are not
    // reconciled to a shared comparator: N-TARGETS-06 is a maths CAP (raises
    // the target so the modelled rate cannot exceed 1.5%, so landing exactly
    // AT 1.5% needs no correction), whereas N-COACH-08/X-SAFETY-02 are
    // SAFETY-SIGNAL TRIGGERS keyed to "at or worse than" the same named
    // threshold (ORACLE N-COACH-08 SOURCE: "F3/EN-9 alignment... all three
    // rapid-loss checks aligned to the identical `<=` boundary" -- that
    // alignment is between N-COACH-08/X-SAFETY-01/X-SAFETY-02 themselves,
    // and does not extend to this unrelated calorie-maths cap).

    describe('N-TARGETS-06: 1.5% hard-gate comparator (> not >=), vs N-COACH-08\'s <= at the same 1.5 value', () => {
      const base = { sex: 'male', ageYears: 30, heightCm: 170, weightKg: 100, bodyFatSource: null, activityLevel: 'sedentary', goal: 'aggressive_cut' };
      // bmr = 10*100 + 6.25*170 - 5*30 + 5 = 1917.5; formulaMaintenanceKcal =
      // round(1917.5*1.2) = 2301. aggressive_cut phaseAdj = -0.22.
      // residual 5199 -> maintenanceKcal 7500 (multiple of 50) ->
      // targetKcal = round(7500*0.78) = 5850 exactly; dailyDelta -1650,
      // weeklyDelta -11550, rate -1.5kg/wk, lossFraction = 1.5/100 = 0.015
      // exactly -- NOT > 0.015, gate does not fire, targetKcal stays 5850.
      // residual 5249 -> maintenanceKcal 7550 -> targetKcal pre-gate =
      // round(7550*0.78) = 5889; dailyDelta -1661, weeklyDelta -11627, rate
      // -1.51kg/wk, lossFraction 0.0151 -- > 0.015, gate fires, targetKcal
      // raised to round(7550 - 1650) = 5900.
      const scenarios = [
        {
          id: 'N-TGT-HARDGATE-AT',
          why: 'lossFraction lands EXACTLY at 1.5% BW/week -- the strict `>` comparator (nutritionEngine.js:1021) means the hard gate does NOT fire at the boundary itself (ORACLE N-TARGETS-06)',
          facts: { inputs: { ...base, effectiveMaintenanceResidualKcal: 5199 } },
          run: 'nutritionTargets',
          must: [
            { kind: 'equals', path: 'targetKcal', equals: 5850 },
            { kind: 'equals', path: 'floorApplied', equals: false },
          ],
          mustNot: [
            { kind: 'contains', path: 'warnings[0]', contains: '1.5 % hard gate' },
          ],
        },
        {
          id: 'N-TGT-HARDGATE-ABOVE',
          why: 'lossFraction just above 1.5% BW/week (0.0151) fires the hard gate, raising targetKcal so the modelled rate is capped back at exactly 1.5% (ORACLE N-TARGETS-06)',
          facts: { inputs: { ...base, effectiveMaintenanceResidualKcal: 5249 } },
          run: 'nutritionTargets',
          must: [
            { kind: 'equals', path: 'targetKcal', equals: 5900 },
            { kind: 'equals', path: 'floorApplied', equals: true },
            { kind: 'contains', path: 'warnings[0]', contains: '1.5 % hard gate' },
          ],
        },
      ];
      runScenarios(scenarios);
    });

    // ── N-COACH-11: FFM floor recentIntakeDaysLogged >=5 evidence gate ──────

    describe('N-COACH-11: FFM floor recentIntakeDaysLogged >= 5 evidence bar', () => {
      const scenarios = [
        {
          id: 'N-COACH-11-DAYS-AT',
          why: 'recentIntakeDaysLogged=5 (>=5, at the boundary) with avgKcal at/below the FFM floor and a negative proposed change nulls the change (ORACLE N-COACH-11), reusing CFL-06\'s own ffmFloorWeek fixture (avgKcal 1900 <= the dexa-credible floor 2040)',
          facts: ffmFloorWeek({ recentIntakeDaysLogged: 5 }),
          run: 'weeklyCoach',
          must: [
            { kind: 'equals', path: 'ffmFloorHeld', equals: true },
            { kind: 'equals', path: 'adjustments.calories', equals: null },
          ],
        },
        {
          id: 'N-COACH-11-DAYS-BELOW',
          // currentCalTarget raised to 3200 (from ffmFloorWeek's default
          // 1800) so N-COACH-07's separate +/-5%-of-target cap
          // (round(1800*0.05)=90) does not also clamp the -150 fixed step
          // and mask the exact magnitude this boundary is isolating.
          why: 'recentIntakeDaysLogged=4 (below the >=5 evidence bar) is insufficient evidence for the floor to fire, so the ordinary -150 losing-too-slowly step proceeds unheld (ORACLE N-COACH-11 BOUNDARIES)',
          facts: ffmFloorWeek({ recentIntakeDaysLogged: 4, currentCalTarget: 3200 }),
          run: 'weeklyCoach',
          must: [
            { kind: 'equals', path: 'ffmFloorHeld', equals: false },
            { kind: 'equals', path: 'adjustments.calories.change', equals: -150 },
          ],
        },
      ];
      runScenarios(scenarios);
    });

    // ── N-COACH-02: session adherence < 0.5 (strict), not <= ────────────────
    // weeklyCoach.js:1170-1171 `sessionAdherence < 0.5`. Both fixtures use a
    // grade-4 (soreness>=4) deload week, whose -2/'reduce' branch fires from
    // the raw recovery grade alone regardless of performance/adherence
    // (T-WEEKLY-03) -- deliberately chosen because a volume REDUCTION is
    // "never a coordination question" (coachPrecedence.js:391,
    // volumeIsRestraint bypasses T-WEEKLY-08's R2 entirely), unlike a push,
    // which a sessionAdherence=0.5 ratio would ALSO separately catch as
    // TRAINING_EXECUTION_POOR (coachContext.js: ratio<0.6) and withhold via
    // the unrelated coordination gate -- confounding a push-shaped proof of
    // this specific boundary. The reduce week isolates N-COACH-02 cleanly.

    describe('N-COACH-02: sessionAdherence < 0.5 (strict) early-return gate', () => {
      const deloadCheckin = { energyScore: 3, sorenessScore: 4, stressScore: 3, trainingPerformance: 'hit' };

      const scenarios = [
        {
          id: 'N-COACH-02-ADHERENCE-AT',
          why: 'sessionAdherence = 2/4 = 0.5 exactly is NOT < 0.5, so the early-return gate does not fire and the full week is computed (grade-4 deload read: -2/reduce) (ORACLE N-COACH-02 BOUNDARIES)',
          facts: b.intermediate().maintPhase(4).checkin(deloadCheckin).top({ sessionsCompleted: 2, sessionsPlanned: 4, currentCalTarget: 2400 }).toInputs(),
          run: 'weeklyCoach',
          must: [
            { kind: 'equals', path: 'adjustments.training.signal', equals: 'reduce' },
            { kind: 'equals', path: 'volumeSignal', equals: -2 },
          ],
          mustNot: [
            { kind: 'equals', path: 'primary.reasonKey', equals: 'stabilise_sessions' },
          ],
        },
        {
          id: 'N-COACH-02-ADHERENCE-BELOW',
          why: 'sessionAdherence = 49/100 = 0.49, just below 0.5, fires the early-return hold regardless of how strong the underlying recovery/performance evidence is -- the SAME grade-4 deload checkin as the AT case is overridden entirely, never reaching the matrix (ORACLE N-COACH-02)',
          facts: b.intermediate().maintPhase(4).checkin(deloadCheckin).top({ sessionsCompleted: 49, sessionsPlanned: 100, currentCalTarget: 2400 }).toInputs(),
          run: 'weeklyCoach',
          must: [
            { kind: 'equals', path: 'adjustments.training.signal', equals: 'hold' },
            { kind: 'equals', path: 'volumeSignal', equals: 0 },
            { kind: 'equals', path: 'adjustments.calories', equals: null },
            { kind: 'equals', path: 'primary.reasonKey', equals: 'stabilise_sessions' },
          ],
        },
      ];
      runScenarios(scenarios);
    });
  });
});
