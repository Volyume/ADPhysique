/**
 * ExerciseDetailScreen — the pure helpers extracted for the Hevy-parity
 * chart + how-to work (docs/hevy-teardown-2026-06-29 backlog items 4 & 12)
 * and the CP-5 scorecard PR-marker fix (docs/ux-world-class-audit-2026-07-09):
 *
 *   splitInstructionSteps   — turns a FORM_TIPS paragraph into ordered steps,
 *                             with a 1-step (paragraph) fallback for non-step
 *                             content. Must not split decimal ranges.
 *   buildDetailMetricPoints — one dated chart point per session carrying every
 *                             lens, reusing buildExerciseMetricSeries so
 *                             distance/duration exercises plot nothing.
 *   derivePRSessionDates    — CP-5: which sessions earned a personal best, for
 *                             VolyumeChart's highlightIndices. Replays the
 *                             app's real detectPR (algorithms.js, NOT mocked
 *                             in this file) over history exactly the way
 *                             ActiveWorkoutScreen does at log time, including
 *                             its first-lift exclusion gate (Wave A A1).
 *
 * The screen require()s native-only modules (react-native-svg via VolyumeChart,
 * gesture-handler, AsyncStorage, the SQLite database). They are mocked so the
 * file loads in the node test env and the pure logic can be exercised directly.
 */

jest.mock('../../components/VolyumeChart', () => 'VolyumeChart');
jest.mock('../../components/WindowChips', () => 'WindowChips');
jest.mock('../../components/Skeleton', () => ({ SkeletonCard: 'SkeletonCard' }));
jest.mock('../../components/AnimatedEntrance', () => 'AnimatedEntrance');
jest.mock('../../components/InfoTooltip', () => 'InfoTooltip');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../lib/database', () => ({
  getExerciseById: jest.fn(),
  getWorkoutSetsForExercise: jest.fn(),
  getAllExercises: jest.fn(),
  getExerciseGoal: jest.fn(),
  saveExerciseGoal: jest.fn(),
  markGoalAchieved: jest.fn(),
  deleteExerciseGoal: jest.fn(),
}));
jest.mock('../../lib/engineTelemetry', () => ({ track: jest.fn() }));

const { splitInstructionSteps, buildDetailMetricPoints, derivePRSessionDates } = require('../ExerciseDetailScreen');

describe('splitInstructionSteps', () => {
  test('returns [] for empty / non-string input', () => {
    expect(splitInstructionSteps('')).toEqual([]);
    expect(splitInstructionSteps('   ')).toEqual([]);
    expect(splitInstructionSteps(null)).toEqual([]);
    expect(splitInstructionSteps(undefined)).toEqual([]);
  });

  test('splits a multi-sentence form tip into ordered steps', () => {
    const tip = 'Set up with shoulder blades pinched together. Lower the bar to the lower chest. Drive the bar back up explosively.';
    expect(splitInstructionSteps(tip)).toEqual([
      'Set up with shoulder blades pinched together.',
      'Lower the bar to the lower chest.',
      'Drive the bar back up explosively.',
    ]);
  });

  test('does not split decimal / en-dash ranges mid-sentence', () => {
    const tip = 'Set the bench to 30–45° and grip the bar. Best for rep ranges 2–10.';
    expect(splitInstructionSteps(tip)).toEqual([
      'Set the bench to 30–45° and grip the bar.',
      'Best for rep ranges 2–10.',
    ]);
  });

  test('prefers explicit line breaks when present', () => {
    expect(splitInstructionSteps('Step one\nStep two\nStep three')).toEqual([
      'Step one', 'Step two', 'Step three',
    ]);
  });

  test('single-sentence content yields one step (caller falls back to paragraph)', () => {
    const out = splitInstructionSteps('Keep your core braced throughout.');
    expect(out).toEqual(['Keep your core braced throughout.']);
    expect(out.length).toBeLessThan(2);
  });
});

describe('buildDetailMetricPoints', () => {
  const session = (over) => [{
    exerciseId: 'lift', setType: 'straight', weight: 100, actualReps: 5,
    createdAt: 1000, workoutId: 'w1', ...over,
  }];

  test('one dated point per session carrying every lens', () => {
    const sessions = [
      [{ exerciseId: 'lift', weight: 100, actualReps: 5, createdAt: 1000, workoutId: 'w1' }],
      [{ exerciseId: 'lift', weight: 110, actualReps: 3, createdAt: 2000, workoutId: 'w2' }],
    ];
    const types = new Map([['lift', 'weight_reps']]);
    const pts = buildDetailMetricPoints(sessions, 'lift', types);
    expect(pts).toHaveLength(2);
    expect(pts[0].date).toBe(1000);
    expect(pts[1].date).toBe(2000);
    expect(pts[0].heaviest).toBe(100);
    expect(pts[0].volume).toBe(500);
    expect(pts[0].reps).toBe(5);
    expect(pts[0].bestSetVolume).toBe(500); // 100 × 5
    expect(pts[1].bestSetVolume).toBe(330); // 110 × 3
  });

  test('distance/duration exercises plot nothing (reuse buildExerciseMetricSeries skip)', () => {
    const sessions = [[{ exerciseId: 'run', weight: 5000, actualReps: 1500, createdAt: 1000, workoutId: 'w1' }]];
    const types = new Map([['run', 'distance']]);
    expect(buildDetailMetricPoints(sessions, 'run', types)).toEqual([]);
  });

  test('warm-up sets are excluded from best-set volume and the series alike', () => {
    const sessions = [[
      { exerciseId: 'lift', setType: 'warmup', weight: 200, actualReps: 1, createdAt: 1000, workoutId: 'w1' },
      { exerciseId: 'lift', setType: 'straight', weight: 100, actualReps: 5, createdAt: 1000, workoutId: 'w1' },
    ]];
    const types = new Map([['lift', 'weight_reps']]);
    const pts = buildDetailMetricPoints(sessions, 'lift', types);
    expect(pts).toHaveLength(1);
    expect(pts[0].heaviest).toBe(100); // not the 200kg warm-up
    expect(pts[0].bestSetVolume).toBe(500); // 100 × 5, warm-up ignored
  });

  test('returns [] when the exercise has no logged sets', () => {
    expect(buildDetailMetricPoints([session({ weight: 0, actualReps: 0 })], 'lift', new Map())).toEqual([]);
  });
});

describe('derivePRSessionDates (CP-5 PR markers)', () => {
  const EX = { id: 'lift', exerciseType: 'weight_reps' };
  const TYPES = new Map([['lift', 'weight_reps']]);

  test('the very first-ever session is never marked (mirrors the A1 first-lift exclusion)', () => {
    const sessions = [
      [{ exerciseId: 'lift', weight: 100, actualReps: 5, createdAt: 1000, workoutId: 'w1' }],
    ];
    const dates = derivePRSessionDates(sessions, EX, TYPES);
    expect(dates.has(1000)).toBe(false);
  });

  test('a genuine beat over real history marks that session', () => {
    const sessions = [
      [{ exerciseId: 'lift', weight: 100, actualReps: 5, createdAt: 1000, workoutId: 'w1' }],
      [{ exerciseId: 'lift', weight: 110, actualReps: 5, createdAt: 2000, workoutId: 'w2' }],
    ];
    const dates = derivePRSessionDates(sessions, EX, TYPES);
    expect(dates.has(1000)).toBe(false);
    expect(dates.has(2000)).toBe(true);
  });

  test('a session that does not beat any prior best is not marked', () => {
    const sessions = [
      [{ exerciseId: 'lift', weight: 100, actualReps: 5, createdAt: 1000, workoutId: 'w1' }],
      [{ exerciseId: 'lift', weight: 110, actualReps: 5, createdAt: 2000, workoutId: 'w2' }],
      [{ exerciseId: 'lift', weight: 105, actualReps: 5, createdAt: 3000, workoutId: 'w3' }],
    ];
    const dates = derivePRSessionDates(sessions, EX, TYPES);
    expect(dates.has(3000)).toBe(false);
  });

  test('a same-session improvement over the exercise\'s first-ever set still counts (history is non-empty by the second set)', () => {
    const sessions = [
      [
        { exerciseId: 'lift', weight: 80, actualReps: 5, createdAt: 1000, workoutId: 'w1' },
        { exerciseId: 'lift', weight: 90, actualReps: 5, createdAt: 1001, workoutId: 'w1' },
      ],
    ];
    const dates = derivePRSessionDates(sessions, EX, TYPES);
    // The session's reported date is the max createdAt among its sets
    // (matches buildDetailMetricPoints exactly).
    expect(dates.has(1001)).toBe(true);
  });

  test('warm-up sets are excluded, matching buildDetailMetricPoints', () => {
    const sessions = [
      [{ exerciseId: 'lift', weight: 100, actualReps: 5, createdAt: 1000, workoutId: 'w1' }],
      [
        { exerciseId: 'lift', setType: 'warmup', weight: 999, actualReps: 5, createdAt: 2000, workoutId: 'w2' },
        { exerciseId: 'lift', weight: 95, actualReps: 5, createdAt: 2000, workoutId: 'w2' },
      ],
    ];
    const dates = derivePRSessionDates(sessions, EX, TYPES);
    expect(dates.has(2000)).toBe(false);
  });

  test('distance/duration exercises never produce a marker (mirrors ActiveWorkoutScreen\'s isWeightReps gate)', () => {
    const sessions = [
      [{ exerciseId: 'run', weight: 5000, actualReps: 1500, createdAt: 1000, workoutId: 'w1' }],
      [{ exerciseId: 'run', weight: 6000, actualReps: 1500, createdAt: 2000, workoutId: 'w2' }],
    ];
    const types = new Map([['run', 'distance']]);
    const dates = derivePRSessionDates(sessions, { id: 'run', exerciseType: 'distance' }, types);
    expect(dates.size).toBe(0);
  });

  test('returns an empty set for an exercise with no logged sets', () => {
    expect(derivePRSessionDates([], EX, TYPES).size).toBe(0);
  });
});
