/**
 * D219 lane B5 (design section 6): the plan reveal after generation shows the
 * plan's own explanation, computed from its facts, with each line's source on
 * tap. Mounts the real screen (harness copied from
 * ProSetupCompleteScreen.d15AdherenceWhy.test.js) over a plan the REAL planner
 * built, so the lines the person reads are the lines explain.js writes.
 *
 * What this pins, and why:
 *   - a plan with version 2 facts shows the computed lines once the "Train
 *     your split" row is open (the reveal keeps them collapsed so the person
 *     reaches Start training first, as before), with a Source control on each;
 *   - the first line is true of THIS plan (its session count and split), and a
 *     focus muscle's line says where the plan trains it first;
 *   - a plan WITHOUT facts is unchanged: the one-line split note shows and none
 *     of the new lines do;
 *   - facts that cannot be read leave the reveal exactly as it was, and never
 *     break it.
 */
import { create, act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const chain = (kind) => ({ __kind: kind, duration: () => chain(kind), delay: () => chain(kind) });
  return {
    __esModule: true,
    default: { View },
    FadeInDown: { duration: () => chain('FadeInDown') },
    FadeInUp: { duration: () => chain('FadeInUp') },
  };
});
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('../../components/BrandMark', () => ({ VolyumeIcon: () => null }));
jest.mock('../../components/Button', () => {
  const { Text } = require('react-native');
  return ({ title }) => <Text>{title}</Text>;
});
jest.mock('../../components/Card', () => {
  const { View } = require('react-native');
  return ({ children }) => <View>{children}</View>;
});
jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn() }));
jest.mock('../../lib/database', () => ({
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getMorningWeightsLast14Days: jest.fn(),
  getOpenEdPatternFlag: jest.fn(),
  getProgrammePlanFacts: jest.fn(),
  getRoutineExercisesWithDetails: jest.fn(),
}));
jest.mock('../../lib/trialActivation', () => ({ firstReviewUnlockDate: jest.fn(() => new Date('2026-07-12T08:00:00Z')) }));
jest.mock('../../lib/coachLedger', () => ({ formatUnlockDate: jest.fn(() => 'Sunday 12 July') }));
jest.mock('../../lib/food/mealPlanService', () => ({ planNextWeek: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ planReady: jest.fn() }));
jest.mock('../../lib/notifications/permissions', () => ({ getNotificationPermissionStatus: jest.fn(async () => 'granted') }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../../store/useAppStore';
import {
  getActivePlan, getRoutinesForPlan, getMorningWeightsLast14Days, getOpenEdPatternFlag,
  getProgrammePlanFacts, getRoutineExercisesWithDetails,
} from '../../lib/database';
import { getSplitRationale } from '../../lib/whyThisTemplates';
import { buildPlan } from '../../lib/plan/planner';
import { DIVISION_MATRIX } from '../../lib/planEngine';
import ProSetupCompleteScreen from '../ProSetupCompleteScreen';

const CHOICES = require('../../lib/plan/__tests__/fixtures/choices');

// A plan the real planner builds (4 days, glutes in focus), saved the way
// planAutoGen saves it: routines in rotation order, the facts keyed by routine
// id, the planner's own muscle for each exercise in facts.slots.
const PLAN = buildPlan({
  daysPerWeek: 4, sessionLengthMinutes: 75, goal: 'general', experience: 'intermediate',
  equipment: 'full_gym', choices: CHOICES, divisionMatrix: DIVISION_MATRIX, focusMuscles: ['glutes'],
});
const ROUTINES = PLAN.workouts.map((w) => ({ id: w.sessionKey, name: w.name, split_type: 'upper_lower_x2' }));
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
// What the device holds: the keys plannerV2PlanFacts stores.
for (const k of ['order', 'sessionMinutesAtPeak', 'overTime', 'overCeilings']) delete FACTS[k];

const store = {
  user: { id: 'u1' },
  userProfile: {
    firstName: 'Alex', trainingGoal: 'lean_gain', trainingPhase: 'build', daysPerWeek: 4,
    sessionLengthMinutes: 75, planWeakPoints: [],
  },
  accessibility: { reduceMotion: true, energyUnit: 'kcal' },
  completeFirstRun: jest.fn(),
};

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 12; i++) await Promise.resolve();
  });
}

async function renderScreen({ open = true } = {}) {
  let tree;
  await act(async () => {
    tree = create(<ProSetupCompleteScreen navigation={{ navigate: jest.fn() }} />);
  });
  await flush();
  if (open) {
    const row = tree.root.findAllByType(TouchableOpacity).find((n) => n.props.accessibilityLabel === 'Train your split');
    await act(async () => { row.props.onPress(); });
    await flush();
  }
  return { tree, text: flattenText(tree.toJSON()) };
}

describe('the plan reveal explains a plan with facts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.mockImplementation((selector) => selector(store));
    AsyncStorage.getItem.mockResolvedValue(null);
    getActivePlan.mockResolvedValue({ id: 'prog1', name: 'Upper and lower 4×/week' });
    getRoutinesForPlan.mockResolvedValue(ROUTINES);
    getMorningWeightsLast14Days.mockResolvedValue([{ loggedAt: Date.UTC(2026, 6, 5) }]);
    getOpenEdPatternFlag.mockResolvedValue(null);
    getProgrammePlanFacts.mockResolvedValue(FACTS);
    getRoutineExercisesWithDetails.mockImplementation(async (id) => ROWS[id] ?? []);
  });

  test('the computed lines show once the split row is open, true of this plan', async () => {
    const { text } = await renderScreen();
    expect(getProgrammePlanFacts).toHaveBeenCalledWith('prog1');
    expect(text).toContain('Why this plan, for you');
    expect(text).toContain('4 sessions a week, alternating upper and lower.');
    expect(text).toMatch(/Glutes are your focus: \d+ direct sets a week now, climbing to \d+ by week 5, trained first in Lower A and Lower B\./);
    expect(text).toContain('No exercise goes above 4 sets.');
    expect(text).toMatch(/Weeks 1 to 5 stop about 3, 2, 2, 1 and 1 reps short of failure/);
  });

  test('they stay collapsed until the row is opened (Start training comes first)', async () => {
    const { text } = await renderScreen({ open: false });
    expect(text).not.toContain('4 sessions a week');
    expect(text).not.toContain('Why this plan, for you');
  });

  test('each line has a Source control, and the one-line source is on tap', async () => {
    const { tree } = await renderScreen();
    const toggles = tree.root.findAllByType(TouchableOpacity).filter((n) => n.props.accessibilityLabel === 'Show the source for this line');
    expect(toggles.length).toBeGreaterThanOrEqual(5);
    expect(flattenText(tree.toJSON())).not.toContain('Ochi 2018');
    await act(async () => { toggles[0].props.onPress(); });
    expect(flattenText(tree.toJSON())).toContain('(Ochi 2018)');
  });

  test('the old one-line split note is superseded by the explanation', async () => {
    const note = getSplitRationale('upper_lower_x2');
    expect(note.length).toBeGreaterThan(20);
    const { text } = await renderScreen();
    expect(text).not.toContain(note);
  });
});

describe('the plan reveal for a plan without facts is unchanged', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.mockImplementation((selector) => selector(store));
    AsyncStorage.getItem.mockResolvedValue(null);
    getActivePlan.mockResolvedValue({ id: 'prog1', name: 'Upper and lower 4×/week' });
    getRoutinesForPlan.mockResolvedValue(ROUTINES);
    getMorningWeightsLast14Days.mockResolvedValue([{ loggedAt: Date.UTC(2026, 6, 5) }]);
    getOpenEdPatternFlag.mockResolvedValue(null);
    getRoutineExercisesWithDetails.mockImplementation(async (id) => ROWS[id] ?? []);
  });

  test('no facts: none of the new lines, the old split note and the routines still show', async () => {
    getProgrammePlanFacts.mockResolvedValue(null);
    const { text } = await renderScreen();
    expect(text).toContain(getSplitRationale('upper_lower_x2'));
    expect(text).not.toContain('Why this plan, for you');
    expect(text).not.toContain('sessions a week');
    for (const r of ROUTINES) expect(text).toContain(r.name);
    expect(getRoutineExercisesWithDetails).not.toHaveBeenCalled();
  });

  test('facts of another version: unchanged', async () => {
    getProgrammePlanFacts.mockResolvedValue({ version: 1, family: 'ppl' });
    const { text } = await renderScreen();
    expect(text).not.toContain('sessions a week');
  });

  test('facts that cannot be read: unchanged, and the reveal still renders', async () => {
    getProgrammePlanFacts.mockRejectedValue(new Error('read failed'));
    const { text } = await renderScreen();
    expect(text).not.toContain('sessions a week');
    expect(text).toContain("You're all set, Alex.");
    for (const r of ROUTINES) expect(text).toContain(r.name);
  });

  test('exercise rows that cannot be read: unchanged, and the reveal still renders', async () => {
    getProgrammePlanFacts.mockResolvedValue(FACTS);
    getRoutineExercisesWithDetails.mockRejectedValue(new Error('read failed'));
    const { text } = await renderScreen();
    expect(text).not.toContain('sessions a week');
    expect(text).toContain("You're all set, Alex.");
  });
});
