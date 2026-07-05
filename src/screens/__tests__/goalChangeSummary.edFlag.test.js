/**
 * D7 (founder decision, 2026-07-03): GoalChangeSummaryScreen performs the
 * same ED-flag check ProSetupCompleteScreen does. Under an open flag (or an
 * unknown flag state — fail closed) the deficit-phase framing and the
 * eight-week diet-break notice give way to the neutral register while the
 * goal-change receipt stays honest. These pin both registers and the
 * fail-closed default.
 */
import { create, act } from 'react-test-renderer';

const mockGetOpenEdPatternFlag = jest.fn();
jest.mock('../../lib/database', () => ({
  getOpenEdPatternFlag: (...args) => mockGetOpenEdPatternFlag(...args),
}));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: Object.assign(
    (selector) => selector({ accessibility: { reduceMotion: true } }),
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

beforeEach(() => jest.clearAllMocks());

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

describe('GoalChangeSummary with no flag', () => {
  test('the full framing renders, including the diet-break notice on a cut', async () => {
    mockGetOpenEdPatternFlag.mockResolvedValue(null);
    const t = textsOf(await render(CUT_PARAMS));
    expect(t).toMatch(/controlled calorie deficit/i);
    expect(t).toMatch(/diet break/i);
  });
});
