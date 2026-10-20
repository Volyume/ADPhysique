/**
 * D7 (founder decision, 2026-07-03): GoalChangeSummaryScreen performs the
 * same ED-flag check ProSetupCompleteScreen does, since item 10 through
 * src/lib/safetyState.js (`suppressed`: flag, calm mode or a failed read). Under an open flag (or an
 * unknown flag state — fail closed) the deficit-phase framing and the
 * eight-week diet-break notice give way to the neutral register while the
 * goal-change receipt stays honest. These pin both registers and the
 * fail-closed default.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'GoalChangeSummaryScreen.js'), 'utf8');

const mockGetOpenEdPatternFlag = jest.fn();
const mockStorage = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k) => Promise.resolve(Object.prototype.hasOwnProperty.call(mockStorage, k) ? mockStorage[k] : null)),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));
jest.mock('../../lib/database', () => ({
  getOpenEdPatternFlag: (...args) => mockGetOpenEdPatternFlag(...args),
}));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: Object.assign(
    (selector) => selector({ accessibility: { reduceMotion: true }, user: { id: 'u1' }, userProfile: {} }),
    { getState: () => ({ user: { id: 'u1' } }) },
  ),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import GoalChangeSummaryScreen from '../GoalChangeSummaryScreen';

const nav = { popToTop: jest.fn(), goBack: jest.fn() };
const CUT_PARAMS = {
  previous: { goal: 'general', phase: 'maintain', kcal: 2500 },
  next: { goal: 'general', phase: 'cut', kcal: 2200 },
  planRerolled: true,
};

function textsOf(tree) {
  return tree.root.findAll(n => n.type === 'Text')
    .map(n => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children))
    .filter(c => typeof c === 'string')
    .join(' ');
}

async function render(params) {
  let tree;
  await act(async () => {
    tree = create(<GoalChangeSummaryScreen navigation={nav} route={{ params }} />);
  });
  return tree;
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
});

describe('GoalChangeSummary under an open ED flag (D7)', () => {
  test('deficit framing and the diet-break notice are suppressed; the receipt stays', async () => {
    mockGetOpenEdPatternFlag.mockResolvedValue({ id: 'flag1' });
    const t = textsOf(await render(CUT_PARAMS));
    expect(t).not.toMatch(/deficit/i);
    expect(t).not.toMatch(/diet break/i);
    // The honest receipt survives: the change is still stated neutrally.
    expect(t).toMatch(/adjust to match/i);
  });

  test('a flag read that throws stays closed (neutral register)', async () => {
    mockGetOpenEdPatternFlag.mockRejectedValue(new Error('db unavailable'));
    const t = textsOf(await render(CUT_PARAMS));
    expect(t).not.toMatch(/deficit/i);
    expect(t).not.toMatch(/diet break/i);
  });
});

describe('GoalChangeSummary in calm mode (safetyState suppressed, item 10)', () => {
  test('calm mode with no flag gives the neutral register too', async () => {
    mockGetOpenEdPatternFlag.mockResolvedValue(null);
    mockStorage['@volyume_wellbeing_mode'] = 'calm';
    const t = textsOf(await render(CUT_PARAMS));
    expect(t).not.toMatch(/deficit/i);
    expect(t).not.toMatch(/diet break/i);
    expect(t).toMatch(/adjust to match/i);
  });

  test('the screen reads safetyState, not the open-flag query', () => {
    expect(SOURCE).toMatch(/useSafetyState\(\)\.suppressed/);
    expect(SOURCE).not.toMatch(/getOpenEdPatternFlag/);
  });
});

describe('GoalChangeSummary with no flag', () => {
  test('the full framing renders, including the diet-break notice on a cut', async () => {
    mockGetOpenEdPatternFlag.mockResolvedValue(null);
    const t = textsOf(await render(CUT_PARAMS));
    expect(t).toMatch(/controlled calorie deficit/i);
    expect(t).toMatch(/diet break/i);
  });

  test('next-step copy uses current navigation names and avoids internal plan terms', () => {
    expect(SOURCE).toContain('Review the full plan from Train.');
    expect(SOURCE).toContain('Open Train and choose "Start with a plan" to retry.');
    expect(SOURCE).not.toContain('Open Plans');
    expect(SOURCE).not.toContain("didn't reroll");
  });
});
