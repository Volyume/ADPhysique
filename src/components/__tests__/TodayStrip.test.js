/**
 * TodayStrip tests (COMP-027 Part B).
 *
 * Covers the four weight-cell states (logged / logged-under-ED / compact-empty
 * after the morning window / expanded in the morning window), the log submit
 * path, and the steps + cardio cells. The morning window is made deterministic
 * by spying on Date.prototype.getHours (TZ-independent).
 */
import { create, act } from 'react-test-renderer';

const mockGetSteps = jest.fn(() => Promise.resolve(null));
const mockGetCardio = jest.fn(() => Promise.resolve([]));
const mockSummarise = jest.fn(() => ({ sessions: 0, totalMinutes: 0, totalKcal: 0 }));
jest.mock('../../lib/database', () => ({
  getDailyStepsToday: (...a) => mockGetSteps(...a),
  getCardioLogForDate: (...a) => mockGetCardio(...a),
}));
jest.mock('../../lib/cardio/cardioEngine', () => ({ summariseWeekCardio: (...a) => mockSummarise(...a) }));
jest.mock('../../lib/activitySteps', () => ({ recordTodaySteps: jest.fn(() => Promise.resolve()) }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('../Sparkline', () => 'Sparkline');

import TodayStrip from '../TodayStrip';

let lastTree = null;
async function render(props = {}) {
  let tree;
  await act(async () => {
    tree = create(<TodayStrip userId="u1" bwu="kg" onLogWeight={() => {}} onCardioPress={() => {}} {...props} />);
  });
  lastTree = tree;
  return tree;
}

function json(tree) { return JSON.stringify(tree.toJSON()); }
function findByLabel(tree, label) {
  return tree.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
}

let hoursSpy;
afterEach(() => {
  // Unmount so the focus-effect interval + AppState listener are torn down
  // before the env is (avoids late async loader calls).
  if (lastTree) { act(() => { lastTree.unmount(); }); lastTree = null; }
  hoursSpy?.mockRestore(); hoursSpy = null;
  jest.clearAllMocks();
});

describe('weight cell', () => {
  test('logged: shows the value and the confirmation tick, no sparkline', async () => {
    // The weight-cell sparkline was removed (founder QA 2026-06-16: the squiggle
    // bled into the steps cell).
    const tree = await render({ todayWeight: 82.4, cardioEnabled: false });
    expect(json(tree)).toContain('WEIGHT');
    expect(json(tree)).not.toContain('Sparkline');
    expect(tree.root.findAll(n => n.props.accessibilityLabel?.startsWith('Weight ')).length).toBeGreaterThan(0);
  });

  // COMP-004 door: with onOpenTrend, tapping the logged cell opens the trend
  // (the door) and a long-press edits; without it, tap still edits.
  test('logged with a trend door: tap opens the trend, long-press edits', async () => {
    const onOpenTrend = jest.fn();
    const tree = await render({ todayWeight: 82.4, recentWeights: [80, 81, 82], onOpenTrend, cardioEnabled: false });
    const cell = tree.root.findAll(n => n.props.accessibilityLabel?.includes('Tap to see your trend'))[0];
    expect(cell).toBeTruthy();
    act(() => cell.props.onPress());
    expect(onOpenTrend).toHaveBeenCalled();
    // Long-press opens the inline editor (the morning-weight input row).
    act(() => cell.props.onLongPress());
    expect(json(tree)).toContain('MORNING WEIGHT');
  });

  test('logged without a trend door: tap still edits (fallback)', async () => {
    const tree = await render({ todayWeight: 82.4, recentWeights: [80, 81, 82], cardioEnabled: false });
    const cell = tree.root.findAll(n => n.props.accessibilityLabel?.includes('Tap to edit'))[0];
    expect(cell).toBeTruthy();
    act(() => cell.props.onPress());
    expect(json(tree)).toContain('MORNING WEIGHT');
  });

  test('after the morning window with no log: compact Log prompt (not expanded)', async () => {
    hoursSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(15);
    const tree = await render({ todayWeight: null, cardioEnabled: false });
    expect(json(tree)).not.toContain('MORNING WEIGHT');
    expect(findByLabel(tree, 'Log morning weight')).toBeTruthy();
  });

  test('inside the morning window with no log: expanded input row', async () => {
    hoursSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(8);
    const tree = await render({ todayWeight: null, lastWeightKg: 80, cardioEnabled: false });
    expect(json(tree)).toContain('MORNING WEIGHT');
  });

  test('an active session suppresses the morning expansion', async () => {
    hoursSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(8);
    const tree = await render({ todayWeight: null, hasActiveWorkout: true, cardioEnabled: false });
    expect(json(tree)).not.toContain('MORNING WEIGHT');
  });

  test('submitting the input calls onLogWeight with the parsed kg', async () => {
    hoursSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(8);
    const onLogWeight = jest.fn();
    const tree = await render({ todayWeight: null, onLogWeight, cardioEnabled: false });
    const input = tree.root.findAll(n => n.props.placeholder === 'kg' && typeof n.props.onChangeText === 'function')[0];
    act(() => input.props.onChangeText('80'));
    act(() => findByLabel(tree, 'Log morning weight').props.onPress());
    expect(onLogWeight).toHaveBeenCalledWith(80);
  });
});

describe('steps + cardio cells', () => {
  // Founder 2026-06-30: the steps cell must STAY visible when tracking is on,
  // even before any auto figure arrives, so steps are always discoverable. The
  // old self-hide made the cell vanish and steps looked unsupported.
  test('steps cell stays visible with a Connect prompt when there is no figure', async () => {
    mockGetSteps.mockResolvedValue(null);
    const onStepsConnect = jest.fn();
    const tree = await render({ todayWeight: 80, cardioEnabled: false, onStepsConnect });
    expect(json(tree)).toContain('STEPS');
    const connect = findByLabel(tree, 'Connect steps');
    expect(connect).toBeTruthy();
    act(() => connect.props.onPress());
    expect(onStepsConnect).toHaveBeenCalled();
  });

  test('steps cell shows a dash (not hidden) when there is no figure and no connect handler', async () => {
    mockGetSteps.mockResolvedValue(null);
    const tree = await render({ todayWeight: 80, cardioEnabled: false });
    expect(json(tree)).toContain('STEPS');
  });

  test('steps cell shows the formatted figure when present', async () => {
    mockGetSteps.mockResolvedValue({ steps: 6214 });
    const tree = await render({ todayWeight: 80, cardioEnabled: false });
    expect(json(tree)).toContain('STEPS');
    expect(json(tree)).toContain('6,214');
  });

  test('cardio cell shows + Log and routes on tap when nothing logged', async () => {
    mockSummarise.mockReturnValue({ sessions: 0, totalMinutes: 0, totalKcal: 0 });
    const onCardioPress = jest.fn();
    const tree = await render({ todayWeight: 80, cardioEnabled: true, onCardioPress });
    expect(json(tree)).toContain('CARDIO');
    act(() => findByLabel(tree, 'Log cardio').props.onPress());
    expect(onCardioPress).toHaveBeenCalled();
  });

  test('cardio cell shows the minutes when logged today', async () => {
    mockSummarise.mockReturnValue({ sessions: 1, totalMinutes: 20, totalKcal: 150 });
    const tree = await render({ todayWeight: 80, cardioEnabled: true });
    expect(json(tree)).toContain('20 min');
  });

  test('cardio cell hidden when cardio is off', async () => {
    const tree = await render({ todayWeight: 80, cardioEnabled: false });
    expect(json(tree)).not.toContain('CARDIO');
  });
});
