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

import { runScenarios } from './harness';

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
});
