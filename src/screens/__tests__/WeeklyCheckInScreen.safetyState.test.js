/**
 * D228 item 2, tier c (founder 2026-10-15, "Go as recommended"), the weekly
 * check-in. Written to FAIL if:
 *  - a person who is neither calm nor flagged sees ANY difference from before
 *    (the "against your N target (under/over/on target)" clause and the
 *    "trend {weight}" fragment both still print);
 *  - calm alone keeps the "against your target" clause (it must go) or loses
 *    the trend weight (calm alone keeps the figure; only an open flag, a failed
 *    read or the unknown state withholds it);
 *  - an open flag, a failed read or the unknown state prints the trend weight,
 *    on the wizard step OR on the Fast Check-In summary row;
 *  - any state drops "From your diary: N of 7 days logged" or the average, or
 *    the "N days logged" count.
 * Same harness as WeeklyCheckInScreen.scanEvidence.test.js (the real screen,
 * database and notification boundaries mocked); the safety hook is driven with
 * states the real pure derivation produced.
 */
jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../lib/notifications', () => ({
  requestNotificationPermissions: jest.fn(async () => {}),
  getNotificationPermissionStatus: jest.fn(async () => 'granted'),
  scheduleNextCheckinReminder: jest.fn(async () => {}),
  scheduleWeeklyCoachReady: jest.fn(async () => {}),
  scheduleMissedCheckinFollowups: jest.fn(async () => {}),
}));
jest.mock('../../lib/food/db', () => ({
  getRollupsForRange: jest.fn(async () => []),
  getPlannedDaysInRange: jest.fn(async () => []),
  confirmPlannedDay: jest.fn(async () => {}),
}));
jest.mock('../../lib/cyclePrefs', () => ({
  getCycleTracking: jest.fn(async () => false),
  shouldShowCycleQuestion: jest.fn(() => false),
}));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn(), press: jest.fn(), error: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn() }));
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: jest.fn(() => false) }));
const mockSafety = { current: null };
jest.mock('../../hooks/useSafetyState', () => ({ __esModule: true, default: () => mockSafety.current }));
jest.mock('../../lib/progressScanStore', () => ({ getProgressScanCoachSummary: jest.fn(async () => null) }));
jest.mock('../../lib/progressScanCoachResolver', () => ({ resolveProgressScanCoachNote: jest.fn(() => null) }));

const database = require('../../lib/database');
jest.mock('../../lib/database', () => ({
  saveWeeklyCheckin: jest.fn(async () => 'row-1'),
  getLatestCheckin: jest.fn(async () => null),
  getMorningWeightsLast14Days: jest.fn(async () => []),
  getWeeklySessionStats: jest.fn(async () => ({ completed: 3, planned: 3 })),
  getWeeklyPRCount: jest.fn(async () => 0),
  getWeeklyVolumeByMuscle: jest.fn(async () => []),
  getNutritionTargets: jest.fn(async () => null),
  getUserBodyProfile: jest.fn(async () => ({ sex: 'male' })),
  getLatestCoachOutput: jest.fn(async () => null),
  recordEngineTelemetry: jest.fn(async () => 'telemetry-1'),
}));

import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../../store/useAppStore';
import { getRollupsForRange } from '../../lib/food/db';
import { deriveSafetyState, SAFETY_STATE_UNKNOWN } from '../../lib/safetyState';
import { localDayKey, localWeekStartMs } from '../../lib/dayKey';
import WeeklyCheckInScreen from '../WeeklyCheckInScreen';

const NOTIF_PREFS_KEY = '@volyume_notification_prefs';
const nav = { navigate: jest.fn(), goBack: jest.fn() };

const STATES = {
  normal: deriveSafetyState({ mode: 'normal', edFlag: null }),
  calm: deriveSafetyState({ mode: 'calm', edFlag: null }),
  flag: deriveSafetyState({ mode: 'normal', edFlag: { id: 'f1' } }),
  flagReadFailed: deriveSafetyState({ mode: 'normal', edFlag: 'read_failed' }),
  wellbeingReadFailed: deriveSafetyState({ mode: 'read_failed', edFlag: null }),
  unknown: SAFETY_STATE_UNKNOWN,
};

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}
async function flush() {
  await act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); });
}
function findPressable(tree, label) {
  return tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string'
    && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');
}

// Five of the seven days of this check-in week, logged at 2,000 kcal against a
// 2,400 target: the old note read "under target".
function weekRollups() {
  const start = localWeekStartMs(Date.now());
  return [0, 1, 2, 3, 4].map((i) => ({ entry_date: localDayKey(start + i * 86400000), kcal_total: 2000, entries_count: 1 }));
}
function weightRows(days = 14) {
  const rows = [];
  for (let i = 0; i < days; i++) rows.push({ weightKg: 80, loggedAt: Date.now() - i * 86400000 });
  return rows;
}

let _mountedTree = null;
async function render({ sessions = { completed: 0, planned: 0 } } = {}) {
  useAppStore.mockImplementation((sel) => sel({
    user: { id: 'u-test' },
    userProfile: { sex: 'male' },
    bodyWeightUnits: 'kg',
    accessibility: {},
  }));
  database.getNutritionTargets.mockResolvedValue({ targetKcal: 2400 });
  getRollupsForRange.mockResolvedValue(weekRollups());
  database.getMorningWeightsLast14Days.mockResolvedValue(weightRows(14));
  database.getWeeklySessionStats.mockResolvedValue(sessions);
  await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({ checkinDay: new Date().getDay() }));
  let tree;
  await act(async () => { tree = create(<WeeklyCheckInScreen navigation={nav} />); });
  await flush();
  _mountedTree = tree;
  return tree;
}

// The full wizard (no training performance derived), stepped to "This week's data".
async function wizardStep1() {
  const tree = await render({ sessions: { completed: 0, planned: 0 } });
  const energy = findPressable(tree, 'Normal, 3 of 5')[0];
  await act(async () => { energy.props.onPress(); });
  const next = tree.root.findAll((n) => n.props?.title === 'Next' && typeof n.props.onPress === 'function');
  await act(async () => { next[0].props.onPress(); });
  await flush();
  return tree;
}
// The Fast Check-In (training derived, calories derived).
async function fastCheckIn() {
  const tree = await render({ sessions: { completed: 3, planned: 3 } });
  expect(flattenText(tree.toJSON())).toContain('Quick check-in');
  return tree;
}

beforeEach(() => {
  mockSafety.current = STATES.normal;
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
});
afterEach(async () => {
  if (_mountedTree) {
    try { await act(async () => { jest.runOnlyPendingTimers(); }); } catch (_) { /* tolerate */ }
    try { await act(async () => { _mountedTree.unmount(); }); } catch (_) { /* already unmounted */ }
    await act(async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); });
    _mountedTree = null;
  }
  jest.clearAllMocks();
  jest.useRealTimers();
});

const KEPT_FACTS = ['From your diary: 5 of 7 days logged', 'averaging 2,000 kcal a day', 'days logged'];

describe('WeeklyCheckInScreen wizard step - calorie note and trend weight (D228 item 2, tier c)', () => {
  test('not calm and not flagged: the note and the trend weight both print, exactly as before', async () => {
    const text = flattenText((await wizardStep1()).toJSON());
    for (const fact of KEPT_FACTS) expect(text).toContain(fact);
    expect(text).toContain('against your 2,400 target (under target). Adjust below only if your logging was off');
    expect(text).toMatch(/\d+ days? logged - trend 80/);
  });

  test('calm alone: the "against your target" clause goes, the diary count and the average stay, the trend weight stays', async () => {
    mockSafety.current = STATES.calm;
    const text = flattenText((await wizardStep1()).toJSON());
    for (const fact of KEPT_FACTS) expect(text).toContain(fact);
    expect(text).toContain('averaging 2,000 kcal a day. Adjust below only if your logging was off');
    expect(text).not.toMatch(/against your|under target|over target|on target/);
    expect(text).toMatch(/\d+ days? logged - trend 80/); // calm alone does not withhold the figure
  });

  test.each([
    ['an open flag', 'flag'],
    ['a failed flag read', 'flagReadFailed'],
    ['a failed wellbeing read', 'wellbeingReadFailed'],
    ['the unknown state', 'unknown'],
  ])('%s: the clause goes AND the trend weight goes; the days-logged count and the diary line stay', async (_l, key) => {
    mockSafety.current = STATES[key];
    const text = flattenText((await wizardStep1()).toJSON());
    for (const fact of KEPT_FACTS) expect(text).toContain(fact);
    expect(text).not.toMatch(/against your|under target|over target|on target/);
    expect(text).not.toContain('trend 80');
    expect(text).not.toMatch(/ - trend /);
    expect(text).toMatch(/\d+ days? logged/);
  });
});

describe('WeeklyCheckInScreen Fast Check-In summary - the same rules (D228 item 2, tier c)', () => {
  test('not calm and not flagged: Nutrition verdict and the trend weight print, as before', async () => {
    const text = flattenText((await fastCheckIn()).toJSON());
    expect(text).toContain('Nutrition');
    expect(text).toMatch(/(Hit your target|Off your target)/);
    expect(text).toMatch(/\d+ days? logged - trend 80/);
    expect(text).toContain('from your diary: 5 of 7 days logged');
  });

  test('calm alone: the verdict word goes, the trend weight and the diary count stay', async () => {
    mockSafety.current = STATES.calm;
    const text = flattenText((await fastCheckIn()).toJSON());
    expect(text).not.toMatch(/Hit your target|Off your target/);
    expect(text).toMatch(/\d+ days? logged - trend 80/);
    expect(text).toContain('from your diary: 5 of 7 days logged');
  });

  test.each([
    ['an open flag', 'flag'],
    ['a failed flag read', 'flagReadFailed'],
    ['a failed wellbeing read', 'wellbeingReadFailed'],
    ['the unknown state', 'unknown'],
  ])('%s: no verdict word and no trend weight; the count and the diary line stay', async (_l, key) => {
    mockSafety.current = STATES[key];
    const text = flattenText((await fastCheckIn()).toJSON());
    expect(text).not.toMatch(/Hit your target|Off your target/);
    expect(text).not.toContain('trend 80');
    expect(text).toMatch(/\d+ days? logged/);
    expect(text).toContain('from your diary: 5 of 7 days logged');
  });
});

describe('WeeklyCheckInScreen wiring (source)', () => {
  const SRC = require('fs').readFileSync(require('path').resolve(__dirname, '../WeeklyCheckInScreen.js'), 'utf8');
  test('reads the safety state through the hook and the helper, never composing calm and the flag inline', () => {
    expect(SRC).toMatch(/import useSafetyState from '\.\.\/hooks\/useSafetyState';/);
    expect(SRC).toMatch(/import \{ withholdsWeightFigures \} from '\.\.\/lib\/safetyState';/);
    expect(SRC).toMatch(/const safety = useSafetyState\(user\?\.id\);/);
    // The scan packet keeps its own, unchanged, gate.
    expect(SRC).toMatch(/const photoScanSuppressed = usePhotoSuppression\(user\?\.id\);/);
  });
});
