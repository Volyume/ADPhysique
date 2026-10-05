/**
 * D219 lane B5 (design section 6): "Why this plan" on the plan screen shows the
 * plan's own explanation, computed from its facts, with each line's source on
 * tap. Mounts the real PlanDetailScreen over a plan the REAL planner built, so
 * the lines the person reads are the lines explain.js writes.
 *
 * What this pins, and why:
 *   - the ACTIVE plan with version 2 facts shows the computed lines, in a card
 *     headed "Why this plan, for you", and "now" is the plan's CURRENT week with
 *     the sets the block holds today (planned_muscle_volume, which check-ins
 *     change) winning over the targets the plan was built with;
 *   - a saved plan that is not active reads the block's first week, and does
 *     not read the active block at all;
 *   - the computed lines supersede the static split note, which is partly untrue
 *     (design 1.7); every plan WITHOUT facts keeps the split note exactly as
 *     today (the library preview, a manual plan, a plan the old generator built);
 *   - facts or rows that cannot be read leave the screen as it was and never
 *     break it.
 */
import { create, act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  // The screen hands useFocusEffect a stable useCallback, so [cb] runs it once.
  return { useFocusEffect: (cb) => { React.useEffect(() => cb(), [cb]); } };
});
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../components/AnimatedEntrance', () => ({ children }) => children);
jest.mock('../../components/Button', () => {
  const { Text } = require('react-native');
  return ({ title }) => <Text>{title}</Text>;
});
jest.mock('../../components/Card', () => {
  const { View } = require('react-native');
  return ({ children }) => <View>{children}</View>;
});
jest.mock('../../components/Skeleton', () => ({ Skeleton: () => null, SkeletonCard: () => null }));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../components/DragReorderList', () => ({
  __esModule: true,
  default: () => null,
  useDragAutoScrollBridge: () => ({ scrollRef: { current: null }, scrollOffset: { value: 0 }, onScroll: jest.fn(), onContentSizeChange: jest.fn() }),
}));
jest.mock('../../lib/haptics', () => ({}));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../lib/telemetry', () => ({ track: jest.fn(async () => {}) }));
jest.mock('../../lib/planAutoGen', () => ({ PLAN_WHYTHIS_KEY: (id) => `why_${id}` }));
jest.mock('../../lib/planSwitch', () => ({ confirmPlanSwitchMidBlock: jest.fn() }));
jest.mock('../../lib/sessionAdjustments', () => ({
  getPlanServeContextForRoutine: jest.fn(async () => null),
  getCurrentWeekPlanSets: jest.fn(async () => null),
}));
jest.mock('../../lib/planDisplay', () => ({ planHeadingName: (n) => n, planEquipmentLabel: () => 'Full gym' }));
jest.mock('../../lib/onboarding/freeStarter', () => ({ getPlanDays: () => 4 }));
jest.mock('../../lib/blockExplain', () => ({ BLOCK_START_SENTENCE: 'Block start.', ACTIVATION_MEANING_SENTENCE: 'Activation.' }));
jest.mock('../../lib/circuitRound', () => ({ summariseCircuitGroups: () => [], formatCircuitPreviewLine: () => '' }));
jest.mock('../../lib/whyThisTemplates', () => ({ getSplitRationale: jest.fn(() => 'STATIC_SPLIT_NOTE_TEXT') }));
jest.mock('../../lib/database', () => ({
  getProgrammeById: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getAllRoutineExerciseCounts: jest.fn(),
  getAllRoutineSetCounts: jest.fn(),
  activatePlanWithBlock: jest.fn(),
  archivePlan: jest.fn(),
  copyPlanFromLibrary: jest.fn(),
  createWorkout: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
  getActivePlan: jest.fn(),
  updateRoutinePosition: jest.fn(),
  getProgrammePlanFacts: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  getPlannedMuscleVolumeForBlock: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../../store/useAppStore';
import {
  getProgrammeById, getRoutinesForPlan, getAllRoutineExerciseCounts, getAllRoutineSetCounts,
  getRoutineExercisesWithDetails, getActivePlan, getProgrammePlanFacts, getCurrentMesocycleWeek,
  getPlannedMuscleVolumeForBlock,
} from '../../lib/database';
import { buildPlan } from '../../lib/plan/planner';
import { DIVISION_MATRIX } from '../../lib/planEngine';
import PlanDetailScreen from '../PlanDetailScreen';

const CHOICES = require('../../lib/plan/__tests__/fixtures/choices');

const PLAN = buildPlan({
  daysPerWeek: 4, sessionLengthMinutes: 75, goal: 'general', experience: 'intermediate',
  equipment: 'full_gym', choices: CHOICES, divisionMatrix: DIVISION_MATRIX, focusMuscles: ['glutes'],
});
const ROUTINES = PLAN.workouts.map((w) => ({ id: w.sessionKey, name: w.name, splitType: 'upper_lower_x2' }));
const ROWS = Object.fromEntries(PLAN.workouts.map((w) => [
  w.sessionKey,
  w.exercises.map((e, i) => ({ routineExercise: { id: `${w.sessionKey}-re${i}` }, exercise: { id: `ex-${e.name}` } })),
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

const store = {
  user: { id: 'u1' },
  userProfile: { sessionLengthMinutes: 75 },
  startWorkout: jest.fn(),
  accessibility: {},
};

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function renderScreen(params = { planId: 'prog1', isLibrary: false }) {
  let tree;
  await act(async () => {
    tree = create(<PlanDetailScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() }} route={{ params }} />);
  });
  await act(async () => {
    for (let i = 0; i < 25; i++) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
  return { tree, text: flattenText(tree.toJSON()) };
}

function setUp({ activeId = 'prog1', facts = FACTS } = {}) {
  jest.clearAllMocks();
  useAppStore.mockImplementation((selector) => selector(store));
  AsyncStorage.getItem.mockResolvedValue(null);
  getProgrammeById.mockResolvedValue({ id: 'prog1', name: 'Upper and lower 4x/week', tags: '' });
  getRoutinesForPlan.mockResolvedValue(ROUTINES);
  getAllRoutineExerciseCounts.mockResolvedValue({});
  getAllRoutineSetCounts.mockResolvedValue({});
  getActivePlan.mockResolvedValue({ id: activeId });
  getRoutineExercisesWithDetails.mockImplementation(async (id) => ROWS[id] ?? []);
  getProgrammePlanFacts.mockResolvedValue(facts);
  getCurrentMesocycleWeek.mockResolvedValue(null);
  getPlannedMuscleVolumeForBlock.mockResolvedValue([]);
}

describe('"Why this plan" on the plan screen, for a plan with facts', () => {
  beforeEach(() => setUp());

  test('the active plan shows its computed lines, true of this plan', async () => {
    const { text } = await renderScreen();
    expect(getProgrammePlanFacts).toHaveBeenCalledWith('prog1');
    expect(text).toContain('Why this plan, for you');
    expect(text).toContain('4 sessions a week, alternating upper and lower.');
    expect(text).toMatch(/Glutes are your focus: \d+ direct sets a week now, climbing to \d+ by week 5, trained first in Lower A and Lower B\./);
    expect(text).toContain('No exercise goes above 4 sets.');
    expect(text).toMatch(/At a usual week's spacing, every muscle is estimated at least 90% recovered/);
  });

  test('the static split note is superseded', async () => {
    const { text } = await renderScreen();
    expect(text).not.toContain('STATIC_SPLIT_NOTE_TEXT');
  });

  test('"now" is the current week of the block, with the sets the block holds today', async () => {
    getCurrentMesocycleWeek.mockResolvedValue({ id: 'w3', mesocycleId: 'm1', weekIndex: 3 });
    getPlannedMuscleVolumeForBlock.mockResolvedValue([
      { week_index: 3, muscle: 'glutes', planned_sets: 14 },
      { week_index: 5, muscle: 'glutes', planned_sets: 20 },
      { week_index: 5, muscle: 'chest', planned_sets: 99 },
    ]);
    const { text } = await renderScreen();
    expect(getPlannedMuscleVolumeForBlock).toHaveBeenCalledWith('m1');
    expect(text).toContain('Glutes are your focus: 14 direct sets a week now, climbing to 20 by week 5');
  });

  test('rows that cannot be read fall back to the targets the plan was built with', async () => {
    getCurrentMesocycleWeek.mockResolvedValue({ id: 'w1', mesocycleId: 'm1', weekIndex: 1 });
    getPlannedMuscleVolumeForBlock.mockRejectedValue(new Error('read failed'));
    const { text } = await renderScreen();
    const t = FACTS.weeklyTargets.glutes;
    expect(text).toContain(`Glutes are your focus: ${t[0]} direct sets a week now, climbing to ${t[4]} by week 5`);
  });

  test('a saved plan that is not the active one reads week 1 and never reads the active block', async () => {
    setUp({ activeId: 'someone-else' });
    const { text } = await renderScreen();
    const t = FACTS.weeklyTargets.glutes;
    expect(text).toContain(`${t[0]} direct sets a week now, climbing to ${t[4]} by week 5`);
    expect(getCurrentMesocycleWeek).not.toHaveBeenCalled();
    expect(getPlannedMuscleVolumeForBlock).not.toHaveBeenCalled();
  });

  test('each line has its source on tap', async () => {
    const { tree } = await renderScreen();
    const toggles = tree.root.findAllByType(TouchableOpacity).filter((n) => n.props.accessibilityLabel === 'Show the source for this line');
    expect(toggles.length).toBeGreaterThanOrEqual(5);
    expect(flattenText(tree.toJSON())).not.toContain('Refalo 2023');
    const ladder = toggles[toggles.length - 1]; // structure, spacing, focus, cap, readiness, ladder
    await act(async () => { ladder.props.onPress(); });
    const after = flattenText(tree.toJSON());
    expect(after).toContain('Strong evidence. Stopping one rep short of failure');
    expect(after).toContain('Refalo 2023');
    expect(after).not.toContain('Krieger 2010'); // only the tapped line opens
  });
});

describe('"Why this plan" on the plan screen, for a plan without facts, is unchanged', () => {
  test('no facts: the static split note shows and none of the new lines do', async () => {
    setUp({ facts: null });
    const { text } = await renderScreen();
    expect(text).toContain('Why this plan, for you');
    expect(text).toContain('STATIC_SPLIT_NOTE_TEXT');
    expect(text).not.toContain('sessions a week');
    expect(getRoutineExercisesWithDetails).toHaveBeenCalled(); // the screen's own reads are untouched
  });

  test('facts of another version: unchanged', async () => {
    setUp({ facts: { version: 1, family: 'ppl' } });
    const { text } = await renderScreen();
    expect(text).toContain('STATIC_SPLIT_NOTE_TEXT');
    expect(text).not.toContain('sessions a week');
  });

  test('the library preview never reads the plan facts for lines (a library plan has none)', async () => {
    setUp({ facts: null });
    const { text } = await renderScreen({ planId: 'lib1', isLibrary: true });
    expect(text).toContain('STATIC_SPLIT_NOTE_TEXT');
    expect(text).not.toContain('sessions a week');
  });

  test('facts that cannot be read: unchanged, and the screen still renders', async () => {
    setUp();
    getProgrammePlanFacts.mockRejectedValue(new Error('read failed'));
    const { text } = await renderScreen();
    expect(text).toContain('STATIC_SPLIT_NOTE_TEXT');
    expect(text).not.toContain('sessions a week');
    for (const r of ROUTINES) expect(text).toContain(r.name);
  });
});
