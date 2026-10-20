/**
 * G2 / item 17 (owner 2026-10-20), scenario: the recovery week uses last
 * session's weights AND still has fewer sets than a normal week. One lifter,
 * one bench slot: last session 72.5 x 8 for 6 sets in a normal week. Through
 * the one set-count resolver (getSessionWeeklyAllocation) the recovery week
 * serves fewer sets; through generateDeloadPrescription it opens at 72.5 kg
 * (last time's weight) with halved reps, never a heavier or block-week-1 weight.
 */
jest.mock('../database', () => ({
  getSessionAdjustmentSignals: jest.fn(),
  getLatestCoachOutput: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getAdaptiveLandmarkHistory: jest.fn(),
  getWeeklyVolumeByMuscle: jest.fn(),
  getRecentAdaptationEvents: jest.fn(),
  createAdaptationEvent: jest.fn(),
  getPlannedMuscleVolumeForBlock: jest.fn(),
  getMesocycleWeekById: jest.fn(),
  getRoutineById: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  getProgrammeById: jest.fn(),
  getProgrammePlanFacts: jest.fn(),
}));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const database = require('../database');
const { getSessionWeeklyAllocation } = require('../sessionAdjustments');

const exercise = (id, primaryMuscle, equipmentCategory, compoundIsolation) => (
  { id, name: id, primaryMuscle, equipmentCategory, compoundIsolation, secondaryMuscles: [] }
);
const EX = {
  bench: exercise('bench', 'chest', 'barbell', 'compound'),
  row: exercise('row', 'back', 'barbell', 'compound'),
  pushdown: exercise('pushdown', 'triceps', 'cable', 'isolation'),
};
const ROWS = [
  { routineExercise: { id: 're-bench', exerciseId: 'bench', recommendedSets: 6, groupKind: null }, exercise: EX.bench },
  { routineExercise: { id: 're-row', exerciseId: 'row', recommendedSets: 5, groupKind: null }, exercise: EX.row },
  { routineExercise: { id: 're-pushdown', exerciseId: 'pushdown', recommendedSets: 1, groupKind: null }, exercise: EX.pushdown },
];
const TYPED = { 're-bench': 6, 're-row': 5, 're-pushdown': 1 };

// The block's rows as a manual rebuild writes them: flat in weeks 1 to 5, half in week 6.
const rowsForBlock = () => [1, 2, 3, 4, 5, 6].flatMap((w) => [['chest', 6], ['back', 5], ['triceps', 1]].map(([muscle, n]) => (
  { mesocycle_week_id: `wk-${w}`, week_index: w, muscle, planned_sets: w === 6 ? Math.max(1, Math.round(n / 2)) : n, source: 'template' }
)));

const wire = (facts) => {
  jest.clearAllMocks();
  database.getMesocycleWeekById.mockImplementation(async (id) => {
    const w = Number(String(id).replace('wk-', ''));
    return { id, mesocycle_id: 'meso-1', week_index: w, is_deload: w === 6 ? 1 : 0 };
  });
  database.getPlannedMuscleVolumeForBlock.mockResolvedValue(rowsForBlock());
  database.getRoutineById.mockResolvedValue({ id: 'r-m', programmeId: 'prog-m' });
  database.getProgrammePlanFacts.mockResolvedValue(facts);
  database.getProgrammeById.mockResolvedValue({ id: 'prog-m', isActive: 1 });
  database.getRoutinesForPlan.mockResolvedValue([{ id: 'r-m', name: 'Day 1', programmeId: 'prog-m' }]);
  database.getRoutineExercisesWithDetails.mockResolvedValue(ROWS);
  database.getCurrentMesocycleWeek.mockResolvedValue({ id: 'wk-6' });
};


const { generateDeloadPrescription } = require('../algorithms');

const served = async (weekNo) => (await getSessionWeeklyAllocation({
  workout: { mesocycleWeekId: `wk-${weekNo}`, routineId: 'r-m' },
  exercises: ROWS,
})).allocation;

describe('recovery week: last session\'s weights, fewer sets than a normal week', () => {
  beforeEach(() => wire({ version: 2, kind: 'manual', typed: TYPED, roles: {} }));

  test('bench: 6 sets in a normal week, fewer in the recovery week, at 72.5 kg (last time), not week 1\'s 65 kg', async () => {
    const normal = await served(5);
    const recovery = await served(6);
    expect(normal.bench).toBe(6);
    expect(recovery.bench).toBeLessThan(normal.bench);
    expect(recovery.bench).toBe(3);

    const lastSession = Array.from({ length: normal.bench }, () => ({ weight: 72.5, actualReps: 8, setType: 'straight' }));
    const targets = generateDeloadPrescription(lastSession, true);
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) {
      expect(t.weight).toBe(72.5);
      expect(t.reps).toBe(4);
      expect(t.rir).toBe(4);
    }
  });
});
