/**
 * D219 lane A4, review finding 3 (design 4.9: "the plan screens show stored rows
 * the logger never serves"): the routine screen shows THIS WEEK's sets for a plan
 * the new planner built, the number the logger and the mini bar serve.
 *
 * What this pins, and why. The routine screen printed routine_exercises.
 * recommended_sets, which is WEEK 1's count and never moves, so in week 5 of a
 * v2 plan every row read 2 sets while the logger served 3 and 4: two numbers for
 * one session. The row now reads the same resolver the logger does
 * (sessionAdjustments.getCurrentWeekPlanSets, the logger's own function run on
 * these rows). Mounts the REAL RoutineDetailScreen over a plan the REAL planner
 * built, with the REAL resolver and prescribe, only the database and the native
 * parts mocked, the block in week 5; each row's number is compared with what the
 * logger's resolver (getSessionWeeklyAllocation) serves for the same rows.
 *  - the active v2 plan: every row shows the week's served count, equal to the
 *    logger's, and the counts are not the stored week-1 ones;
 *  - a plan that is not the active one, a plan with no facts and a resolver that
 *    fails keep the stored counts exactly as before, and never break the screen;
 *  - a circuit station shows its stored rounds (its count is the circuit's, not
 *    a set count);
 *  - the edit sheet is untouched: it opens on the stored count and still records
 *    a typed count as before (RoutineDetailScreen.typedSets.guard).
 */
import { create, act } from 'react-test-renderer';
import { View, FlatList } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/Button', () => {
  const { Text } = require('react-native');
  return ({ title }) => <Text>{title}</Text>;
});
jest.mock('../../components/Card', () => {
  const { View: V } = require('react-native');
  return ({ children }) => <V>{children}</V>;
});
jest.mock('../../components/Skeleton', () => ({ Skeleton: () => null, SkeletonCard: () => null }));
jest.mock('../../components/TextField', () => () => null);
jest.mock('../../components/SectionLabel', () => () => null);
jest.mock('../../components/SegmentedControl', () => () => null);
jest.mock('../../components/ModalHeader', () => () => null);
jest.mock('../../components/ExercisePickerModal', () => () => null);
jest.mock('../../components/BottomSheet', () => () => null);
jest.mock('../../components/InfoTooltip', () => () => null);
jest.mock('../../components/DragReorderList', () => ({
  __esModule: true,
  default: () => null,
  useDragAutoScrollBridge: () => ({ scrollRef: { current: null }, scrollOffset: { value: 0 }, onScroll: jest.fn(), onContentSizeChange: jest.fn() }),
}));
jest.mock('../../lib/haptics', () => ({}));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('../../lib/planAutoGen', () => ({ buildPlanInputs: jest.fn(() => null) }));
jest.mock('../../lib/database', () => ({
  EXERCISE_INTENT: { EXCLUDED: 'excluded', AVOIDED_BLOCK: 'avoided_block', PATTERN_AVOID: 'pattern_avoid' },
  getRoutineById: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  getAllExercises: jest.fn(),
  addExerciseToRoutine: jest.fn(),
  removeExerciseFromRoutine: jest.fn(),
  createWorkout: jest.fn(),
  updateRoutineExercise: jest.fn(),
  updateRoutineExerciseExercise: jest.fn(),
  updateRoutineExerciseOrder: jest.fn(),
  getActivePlan: jest.fn(),
  getProgrammeById: jest.fn(),
  getProgrammePlanFacts: jest.fn(),
  setExerciseIntent: jest.fn(),
  clearExerciseIntent: jest.fn(),
  setExerciseSlotDefault: jest.fn(),
  getActiveBlock: jest.fn(),
  recordTypedSetCount: jest.fn(),
  recordExerciseSwap: jest.fn(),
  getSessionAdjustmentSignals: jest.fn(),
  getLatestCoachOutput: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getAdaptiveLandmarkHistory: jest.fn(),
  getWeeklyVolumeByMuscle: jest.fn(),
  getRecentAdaptationEvents: jest.fn(),
  createAdaptationEvent: jest.fn(),
  getPlannedMuscleVolumeForBlock: jest.fn(),
  getMesocycleWeekById: jest.fn(),
  getRoutinesForPlan: jest.fn(),
}));

import useAppStore from '../../store/useAppStore';
import * as database from '../../lib/database';
import { buildPlan } from '../../lib/plan/planner';
import { DIVISION_MATRIX } from '../../lib/planEngine';
import { getSessionWeeklyAllocation } from '../../lib/sessionAdjustments';
import RoutineDetailScreen from '../RoutineDetailScreen';

const CHOICES = require('../../lib/plan/__tests__/fixtures/choices');

// The review's plan: general, intermediate, 4 days, 75 minutes, full gym, built by the real planner.
const PLAN = buildPlan({
  daysPerWeek: 4, sessionLengthMinutes: 75, goal: 'general', experience: 'intermediate',
  equipment: 'full_gym', choices: CHOICES, divisionMatrix: DIVISION_MATRIX, focusMuscles: [],
});
const ROUTINES = PLAN.workouts.map((w, i) => ({
  id: w.sessionKey, name: w.name, splitType: 'upper_lower_x2', programmeId: 'prog1', position: i,
}));
const KINDS = {
  heavy_compound: { equipmentCategory: 'barbell', compoundIsolation: 'compound' },
  mod_compound: { equipmentCategory: 'dumbbell', compoundIsolation: 'compound' },
  machine: { equipmentCategory: 'machine_selectorised', compoundIsolation: 'compound' },
  isolation: { equipmentCategory: 'cable', compoundIsolation: 'isolation' },
};
const ROWS = Object.fromEntries(PLAN.workouts.map((w) => [
  w.sessionKey,
  w.exercises.map((e, i) => ({
    routineExercise: {
      id: `${w.sessionKey}-re${i}`, exerciseId: `ex-${e.name}`, recommendedSets: e.sets,
      recommendedRepsMin: e.repMin, recommendedRepsMax: e.repMax, restSeconds: e.restSec, startingWeight: null,
      groupKind: null, supersetGroupId: null,
    },
    exercise: { id: `ex-${e.name}`, name: e.name, primaryMuscle: e.muscle, ...(KINDS[e.kind] ?? KINDS.isolation) },
  })),
]));
const FACTS = {
  ...PLAN.v2,
  thin: {},
  slots: Object.fromEntries(PLAN.workouts.map((w) => [
    w.sessionKey,
    Object.fromEntries(w.exercises.map((e) => [`ex-${e.name}`, { muscle: e.muscle, kind: e.kind, credits: {} }])),
  ])),
};
for (const k of ['order', 'sessionMinutesAtPeak', 'overTime', 'overCeilings']) delete FACTS[k];

// The block's six weeks of direct-set targets, as planned_muscle_volume holds them.
const WEEK_ROWS = [];
for (const [muscle, series] of Object.entries(PLAN.v2.weeklyTargets)) {
  series.forEach((sets, i) => WEEK_ROWS.push({
    mesocycle_week_id: `week-${i + 1}`, week_index: i + 1, muscle, planned_sets: sets,
  }));
}

const store = { user: { id: 'u1' }, userProfile: { sessionLengthMinutes: 75 }, startWorkout: jest.fn(), reduceMotion: false, units: 'kg', accessibility: {} };

function setUp({ active = true, facts = FACTS, week = 5 } = {}) {
  jest.clearAllMocks();
  useAppStore.mockImplementation((selector) => (typeof selector === 'function' ? selector(store) : store));
  database.getRoutineById.mockImplementation(async (id) => ROUTINES.find((r) => r.id === id) ?? null);
  database.getRoutineExercisesWithDetails.mockImplementation(async (id) => ROWS[id] ?? []);
  database.getAllExercises.mockResolvedValue([]);
  database.getActivePlan.mockResolvedValue(null);
  database.getProgrammeById.mockResolvedValue({ id: 'prog1', isActive: active ? 1 : 0 });
  database.getProgrammePlanFacts.mockResolvedValue(facts);
  database.getRoutinesForPlan.mockResolvedValue(ROUTINES);
  database.getCurrentMesocycleWeek.mockResolvedValue({ id: `week-${week}`, weekIndex: week, mesocycleId: 'meso-1' });
  database.getMesocycleWeekById.mockImplementation(async (id) => ({ id, mesocycle_id: 'meso-1', week_index: Number(id.split('-')[1]), is_deload: 0 }));
  database.getPlannedMuscleVolumeForBlock.mockResolvedValue(WEEK_ROWS);
  database.getActiveBlock.mockResolvedValue(null);
}

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function settle() {
  await act(async () => {
    for (let i = 0; i < 40; i++) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}

// The rows the screen hands its list, rendered: the FlatList stand-in carries them as props.
async function renderRows(routineId) {
  let tree;
  await act(async () => {
    tree = create(<RoutineDetailScreen navigation={{ navigate: jest.fn(), goBack: jest.fn(), addListener: jest.fn(() => () => {}) }} route={{ params: { routineId } }} />);
  });
  await settle();
  const list = tree.root.findAllByType(FlatList).find((l) => Array.isArray(l.props.data) && l.props.data.length > 0);
  expect(list).toBeTruthy();
  const text = {};
  list.props.data.forEach((item, index) => {
    let one;
    act(() => { one = create(<View>{list.props.renderItem({ item, index })}</View>); });
    text[item.routineExercise.id] = flattenText(one.toJSON());
  });
  return { tree, text, rows: list.props.data };
}

describe('the routine screen shows this week\'s sets for a plan the new planner built', () => {
  const ROUTINE_ID = ROUTINES[0].id;

  test('the premise: the plan serves week 5 more than the stored week-1 counts', async () => {
    setUp();
    const { allocation } = await getSessionWeeklyAllocation({
      workout: { mesocycleWeekId: 'week-5', routineId: ROUTINE_ID }, exercises: ROWS[ROUTINE_ID],
    });
    const stored = ROWS[ROUTINE_ID].map((r) => r.routineExercise.recommendedSets);
    const servedNow = ROWS[ROUTINE_ID].map((r) => allocation[r.exercise.id]);
    expect(servedNow.some((n, i) => n !== stored[i])).toBe(true);
  });

  test('each row shows the logger\'s number for the week, not the stored count', async () => {
    setUp();
    const { allocation, v2 } = await getSessionWeeklyAllocation({
      workout: { mesocycleWeekId: 'week-5', routineId: ROUTINE_ID }, exercises: ROWS[ROUTINE_ID],
    });
    expect(v2).toBe(true);
    const { text, rows } = await renderRows(ROUTINE_ID);
    let differs = 0;
    for (const row of rows) {
      const logger = allocation[row.exercise.id];
      expect(text[row.routineExercise.id]).toContain(`${logger} sets`);
      if (logger !== row.routineExercise.recommendedSets) {
        differs += 1;
        expect(text[row.routineExercise.id]).not.toContain(`${row.routineExercise.recommendedSets} sets`);
      }
    }
    expect(differs).toBeGreaterThan(0);
  });

  test('the same holds in every week of the block, so the screen follows the plan as it climbs and recovers', async () => {
    for (const week of [1, 3, 5, 6]) {
      setUp({ week });
      // eslint-disable-next-line no-await-in-loop
      const { allocation } = await getSessionWeeklyAllocation({
        workout: { mesocycleWeekId: `week-${week}`, routineId: ROUTINE_ID }, exercises: ROWS[ROUTINE_ID],
      });
      // eslint-disable-next-line no-await-in-loop
      const { text, rows } = await renderRows(ROUTINE_ID);
      for (const row of rows) expect(text[row.routineExercise.id]).toContain(`${allocation[row.exercise.id]} sets`);
    }
  });

  test('a plan that is not the active one keeps the stored counts', async () => {
    setUp({ active: false });
    const { text, rows } = await renderRows(ROUTINE_ID);
    for (const row of rows) expect(text[row.routineExercise.id]).toContain(`${row.routineExercise.recommendedSets} sets`);
  });

  test('a plan with no facts, and facts of another version, keep the stored counts', async () => {
    for (const facts of [null, { version: 1 }]) {
      setUp({ facts });
      // eslint-disable-next-line no-await-in-loop
      const { text, rows } = await renderRows(ROUTINE_ID);
      for (const row of rows) expect(text[row.routineExercise.id]).toContain(`${row.routineExercise.recommendedSets} sets`);
    }
  });

  test('a resolver that fails leaves the stored counts and does not break the screen', async () => {
    setUp();
    database.getCurrentMesocycleWeek.mockRejectedValue(new Error('no week'));
    const { text, rows } = await renderRows(ROUTINE_ID);
    for (const row of rows) expect(text[row.routineExercise.id]).toContain(`${row.routineExercise.recommendedSets} sets`);
  });
});
