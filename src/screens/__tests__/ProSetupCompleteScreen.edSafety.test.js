import { create, act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  // MO-4/D7: a distinct, truthy sentinel per entry animation kind so tests
  // below can tell "an entering animation object was passed" apart from
  // "entering is undefined" without caring about duration/delay values.
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
}));
jest.mock('../../lib/trialActivation', () => ({ firstReviewUnlockDate: jest.fn(() => new Date('2026-07-12T08:00:00Z')) }));
jest.mock('../../lib/coachLedger', () => ({ formatUnlockDate: jest.fn(() => 'Sunday 12 July') }));
jest.mock('../../lib/food/mealPlanService', () => ({ planNextWeek: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ planReady: jest.fn() }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../../store/useAppStore';
import {
  getActivePlan,
  getRoutinesForPlan,
  getMorningWeightsLast14Days,
  getOpenEdPatternFlag,
} from '../../lib/database';
import { WELLBEING_KEY } from '../../lib/wellbeing';
import ProSetupCompleteScreen from '../ProSetupCompleteScreen';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'ProSetupCompleteScreen.js'), 'utf8');
const FALLBACK_COPY = 'At the end of your training week, review how it went.';
const DATED_COPY = 'Keep logging your morning weight. Your first weekly check-in opens on Sunday 12 July';

const store = {
  user: { id: 'u1' },
  userProfile: {
    firstName: 'Alex',
    trainingGoal: 'lean_gain',
    trainingPhase: 'build',
    daysPerWeek: 4,
    planWeakPoints: [],
  },
  accessibility: { reduceMotion: true, energyUnit: 'kcal' },
  completeFirstRun: jest.fn(),
};

// MO-4/D7: walk the rendered JSON tree and collect every `entering` prop
// value seen (undefined for a static mount, or the {__kind} sentinel from
// the reanimated mock above for a staged FadeInDown/FadeInUp mount).
function collectEnteringProps(node, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (node.props && Object.prototype.hasOwnProperty.call(node.props, 'entering')) {
    acc.push(node.props.entering);
  }
  const children = Array.isArray(node.children) ? node.children : (node.children ? [node.children] : []);
  children.forEach(c => collectEnteringProps(c, acc));
  return acc;
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function renderScreen() {
  let tree;
  await act(async () => {
    tree = create(<ProSetupCompleteScreen navigation={{ navigate: jest.fn() }} />);
  });
  await flush();
  return flattenText(tree.toJSON());
}

// MO-4/D7: same render, but returns the raw JSON tree so tests can inspect
// the `entering` props the staged reveal actually mounted with.
async function renderScreenTree() {
  let tree;
  await act(async () => {
    tree = create(<ProSetupCompleteScreen navigation={{ navigate: jest.fn() }} />);
  });
  await flush();
  return tree.toJSON();
}

describe('ProSetupCompleteScreen ED-safety copy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.mockImplementation((selector) => selector(store));
    AsyncStorage.getItem.mockResolvedValue(null);
    getActivePlan.mockResolvedValue(null);
    getRoutinesForPlan.mockResolvedValue([]);
    getMorningWeightsLast14Days.mockResolvedValue([{ loggedAt: Date.UTC(2026, 6, 5) }]);
    getOpenEdPatternFlag.mockResolvedValue(null);
  });

  test('ED flag read failures keep coaching decision copy neutral', async () => {
    getOpenEdPatternFlag.mockRejectedValueOnce(new Error('read failed'));

    const text = await renderScreen();

    expect(getOpenEdPatternFlag).toHaveBeenCalledWith('u1');
    expect(text).toContain(FALLBACK_COPY);
    expect(text).not.toContain(DATED_COPY);
  });

  test('an open ED flag keeps coaching decision copy neutral', async () => {
    getOpenEdPatternFlag.mockResolvedValueOnce({ id: 'flag-1' });

    const text = await renderScreen();

    expect(text).toContain(FALLBACK_COPY);
    expect(text).not.toContain(DATED_COPY);
  });

  test('a healthy non-flagged read can still show the dated first weekly check-in copy', async () => {
    const text = await renderScreen();

    expect(text).toContain(DATED_COPY);
    expect(text).not.toContain(FALLBACK_COPY);
    expect(SOURCE).not.toContain('first coaching decision lands');
  });

  test('training split details start collapsed so the reveal stays scannable', () => {
    expect(SOURCE).toContain('const [planOpen, setPlanOpen] = useState(false);');
    expect(SOURCE).toContain('the user should reach Start training before reading every rationale line');
  });

  test('meal-plan success copy is a full sentence, not a comma fragment', () => {
    expect(SOURCE).toContain('Your first week of meals is ready in Meal planning.');
    expect(SOURCE).not.toContain('First week of meals ready in Diary, Plan my week');
  });

  test('setup-complete actions avoid route breadcrumbs and link styling', () => {
    expect(SOURCE).toContain('accessibilityRole="button"');
    expect(SOURCE).not.toContain('accessibilityRole="link"');
    expect(SOURCE).not.toContain('Diary &gt; Plan my week');
    expect(SOURCE).not.toContain('Open Plans to build or pick a routine');
    expect(SOURCE).toContain('Create or choose a routine before your first session.');
    expect(SOURCE).toMatch(/eduLearnRow: \{[\s\S]*minHeight: 44/);
    expect(SOURCE).toMatch(/eduLearnText: \{ color: colors\.textPrimary/);
  });
});

// MO-4/D7 (docs/design-usability-audit-2026-07-09/coverage-02-motion.md):
// the staged reveal (including the kcal-ring hero beat) was gated on
// Reduce Motion only. It must also collapse to instant/static under calm
// mode or an open ED-pattern flag, mirroring this file's own copy-side gate
// on the exact same flag (proven above). reduceMotion is false throughout
// this block so only the new calm/ED-flag gate is under test.
describe('ProSetupCompleteScreen staged-reveal motion gate (MO-4/D7)', () => {
  const motionStore = { ...store, accessibility: { reduceMotion: false, energyUnit: 'kcal' } };
  const NUTRITION_TARGETS_KEY = '@volyume_nutrition_targets';
  const nutritionTargets = JSON.stringify({ targetKcal: 2200, proteinG: 180, carbsG: 220, fatG: 70 });

  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.mockImplementation((selector) => selector(motionStore));
    getActivePlan.mockResolvedValue(null);
    getRoutinesForPlan.mockResolvedValue([]);
    getMorningWeightsLast14Days.mockResolvedValue([{ loggedAt: Date.UTC(2026, 6, 5) }]);
    getOpenEdPatternFlag.mockResolvedValue(null);
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === NUTRITION_TARGETS_KEY) return Promise.resolve(nutritionTargets);
      if (key === WELLBEING_KEY) return Promise.resolve('normal');
      return Promise.resolve(null);
    });
  });

  test('a healthy non-flagged, non-calm read keeps the staged reveal playing (no regression on the celebration)', async () => {
    const json = await renderScreenTree();
    const enterings = collectEnteringProps(json);

    // The header, weigh-in, kcal-ring/macro, split and check-in blocks plus
    // the Start-training button: 6 Animated.View entering sites in total.
    expect(enterings.length).toBe(6);
    expect(enterings.every((e) => e && e.__kind)).toBe(true);
  });

  test('an open ED-pattern flag collapses the staged reveal (incl. the kcal-ring block) to instant/static', async () => {
    getOpenEdPatternFlag.mockResolvedValueOnce({ id: 'flag-1' });

    const json = await renderScreenTree();
    const enterings = collectEnteringProps(json);

    expect(enterings.length).toBe(6);
    expect(enterings.every((e) => e === undefined)).toBe(true);
  });

  test('calm mode collapses the staged reveal (incl. the kcal-ring block) to instant/static', async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === NUTRITION_TARGETS_KEY) return Promise.resolve(nutritionTargets);
      if (key === WELLBEING_KEY) return Promise.resolve('calm');
      return Promise.resolve(null);
    });

    const json = await renderScreenTree();
    const enterings = collectEnteringProps(json);

    expect(enterings.length).toBe(6);
    expect(enterings.every((e) => e === undefined)).toBe(true);
  });

  test('a read failure fails CLOSED on motion too, not just copy', async () => {
    getOpenEdPatternFlag.mockRejectedValueOnce(new Error('read failed'));

    const json = await renderScreenTree();
    const enterings = collectEnteringProps(json);

    expect(enterings.length).toBe(6);
    expect(enterings.every((e) => e === undefined)).toBe(true);
  });

  test('stage() and the Start-training button both gate on reduceMotion OR motionSuppressed', () => {
    expect(SOURCE).toContain('(reduceMotion || motionSuppressed) ? undefined : FadeInDown.duration(duration).delay(i * motion.micro)');
    expect(SOURCE).toContain("(reduceMotion || motionSuppressed) ? undefined : FadeInUp.duration(motion.enter).delay(5 * motion.micro)");
    expect(SOURCE).toContain('MO-4/D7');
  });
});
