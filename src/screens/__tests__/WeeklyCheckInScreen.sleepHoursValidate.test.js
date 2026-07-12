/**
 * AC-15 (Codex adversarial audit, docs/audit/codex-adversarial-audit-triage-
 * 2026-07-12.md): WeeklyCheckInScreen's sleepHours field was parseFloat'd
 * and written unchanged into saveWeeklyCheckin, so a negative, impossible or
 * NaN entry (-1, 99, a stray letter) reached the coaching engine and could
 * render nonsense like "sleep averaged -1.0 hours". handleSubmit now
 * validates at this input boundary: a non-finite or outside-0-24h value is
 * rejected with a calm toast and NOTHING is saved, rather than being
 * coerced/clamped. A valid or blank value still saves exactly as before.
 *
 * Renders the real screen (react-test-renderer), mirroring the established
 * house convention for this heavy screen (see
 * WeeklyCheckInScreen.scanEvidence.test.js's header comment): its DB/
 * notification/food/scan dependencies are mocked at their existing
 * boundaries, everything else (including the new sleepHours validation
 * inside handleSubmit) is the real component. Drives the full four-step
 * wizard (forced via zero auto-derived sessions, matching that file's
 * renderWizardStep1 pattern) through to the final submit tap, so the
 * assertions land against the REAL save-gate, not a re-implementation of it.
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
jest.mock('../../lib/progressScanStore', () => ({ getProgressScanCoachSummary: jest.fn(async () => null) }));
jest.mock('../../lib/progressScanCoachResolver', () => ({ resolveProgressScanCoachNote: jest.fn(() => null) }));

const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

const database = require('../../lib/database');
jest.mock('../../lib/database', () => ({
  saveWeeklyCheckin: jest.fn(async () => 'row-1'),
  getLatestCheckin: jest.fn(async () => null),
  getMorningWeightsLast14Days: jest.fn(async () => []),
  getWeeklySessionStats: jest.fn(async () => ({ completed: 0, planned: 0 })),
  getWeeklyPRCount: jest.fn(async () => 0),
  getWeeklyVolumeByMuscle: jest.fn(async () => []),
  getNutritionTargets: jest.fn(async () => null),
  getUserBodyProfile: jest.fn(async () => ({ sex: 'male' })),
  getCardioLogRange: jest.fn(async () => []),
  activityDayKey: jest.fn((ms) => new Date(ms ?? Date.now()).toISOString().slice(0, 10)),
  getLatestCoachOutput: jest.fn(async () => null),
}));

import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../../store/useAppStore';
import WeeklyCheckInScreen from '../WeeklyCheckInScreen';

const NOTIF_PREFS_KEY = '@volyume_notification_prefs';
const nav = { navigate: jest.fn(), goBack: jest.fn() };

function weightRows(days = 14) {
  const rows = [];
  for (let i = 0; i < days; i++) {
    rows.push({ weightKg: 80, loggedAt: Date.now() - i * 86400000 });
  }
  return rows;
}

async function flush() {
  await act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); });
}

function findPressable(tree, label) {
  return tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string'
    && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');
}

function findButtonByTitle(tree, title) {
  return tree.root.findAll((n) => n.props?.title === title && typeof n.props.onPress === 'function');
}

async function renderScreen() {
  useAppStore.mockImplementation((sel) => sel({
    user: { id: 'u-test' },
    userProfile: { sex: 'male' },
    bodyWeightUnits: 'kg',
    accessibility: {},
  }));
  database.getMorningWeightsLast14Days.mockResolvedValue(weightRows(14));
  const todayDay = new Date().getDay();
  await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({ checkinDay: todayDay }));
  let tree;
  await act(async () => { tree = create(<WeeklyCheckInScreen navigation={nav} />); });
  await flush();
  return tree;
}

// Drives the forced four-step wizard (getWeeklySessionStats returns
// completed:0/planned:0 above, so fastEligible is false and trainingPerformance
// is never auto-derived) from step 0 through to a submit tap. `sleepText`,
// if given, is typed into "Average sleep hours" on step 0; omitted leaves it
// blank, matching the field's real "Optional" default.
async function driveToSubmit(tree, sleepText) {
  const energy = findPressable(tree, '3 Normal')[0];
  expect(energy).toBeTruthy();
  await act(async () => { energy.props.onPress(); });

  if (sleepText !== undefined) {
    const sleepField = tree.root.findByProps({ accessibilityLabel: 'Average sleep hours' });
    await act(async () => { sleepField.props.onChangeText(sleepText); });
  }

  let next = findButtonByTitle(tree, 'Next');
  await act(async () => { next[0].props.onPress(); });
  await flush();

  // Step 1 ("This week's data"): nothing required to advance.
  next = findButtonByTitle(tree, 'Next');
  await act(async () => { next[0].props.onPress(); });
  await flush();

  // Step 2 ("Recovery and issues"): soreness is required.
  const soreness = findPressable(tree, '1 None')[0];
  expect(soreness).toBeTruthy();
  await act(async () => { soreness.props.onPress(); });
  next = findButtonByTitle(tree, 'Next');
  await act(async () => { next[0].props.onPress(); });
  await flush();

  // Step 3 ("Training performance"): required, never auto-derived here.
  const hit = findPressable(tree, 'Hit targets as planned')[0];
  expect(hit).toBeTruthy();
  await act(async () => { hit.props.onPress(); });
  await flush();

  const submit = findButtonByTitle(tree, "See this week's coaching");
  expect(submit.length).toBeGreaterThan(0);
  await act(async () => { submit[0].props.onPress(); });
  await flush();
}

afterEach(() => jest.clearAllMocks());

describe('AC-15: sleepHours save-gate rejects impossible values', () => {
  test('negative sleep hours (-1) is rejected: nothing is saved, a calm toast fires', async () => {
    const tree = await renderScreen();
    await driveToSubmit(tree, '-1');
    expect(database.saveWeeklyCheckin).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.stringMatching(/sleep/i),
      expect.objectContaining({ variant: 'error' }),
    );
  });

  test('impossible sleep hours (99) is rejected: nothing is saved', async () => {
    const tree = await renderScreen();
    await driveToSubmit(tree, '99');
    expect(database.saveWeeklyCheckin).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.stringMatching(/sleep/i),
      expect.objectContaining({ variant: 'error' }),
    );
  });

  test('non-numeric entry (NaN after parseFloat) is rejected: nothing is saved', async () => {
    const tree = await renderScreen();
    await driveToSubmit(tree, 'abc');
    expect(database.saveWeeklyCheckin).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalled();
  });

  test('rejection copy carries no em dash and states the realistic range (calm-voice guard)', async () => {
    const tree = await renderScreen();
    await driveToSubmit(tree, '-1');
    const [message] = mockToastShow.mock.calls[0];
    expect(message).not.toMatch(/—/);
    expect(message).toMatch(/0 and 24/);
  });

  test('a valid sleep value (7.5) still saves, with the parsed number intact', async () => {
    const tree = await renderScreen();
    await driveToSubmit(tree, '7.5');
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(database.saveWeeklyCheckin).toHaveBeenCalledWith(
      'u-test',
      expect.objectContaining({ sleepHours: 7.5 }),
    );
  });

  test('a blank sleep field still saves, as null (unchanged optional-field behaviour)', async () => {
    const tree = await renderScreen();
    await driveToSubmit(tree, undefined);
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(database.saveWeeklyCheckin).toHaveBeenCalledWith(
      'u-test',
      expect.objectContaining({ sleepHours: null }),
    );
  });

  test('boundary values 0 and 24 are accepted (inclusive range, not clamped/coerced)', async () => {
    let tree = await renderScreen();
    await driveToSubmit(tree, '0');
    expect(database.saveWeeklyCheckin).toHaveBeenCalledWith('u-test', expect.objectContaining({ sleepHours: 0 }));

    jest.clearAllMocks();
    database.saveWeeklyCheckin.mockResolvedValue('row-1');
    database.getMorningWeightsLast14Days.mockResolvedValue(weightRows(14));
    database.getWeeklySessionStats.mockResolvedValue({ completed: 0, planned: 0 });
    tree = await renderScreen();
    await driveToSubmit(tree, '24');
    expect(database.saveWeeklyCheckin).toHaveBeenCalledWith('u-test', expect.objectContaining({ sleepHours: 24 }));
  });
});
