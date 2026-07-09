/**
 * WeeklyCheckInScreen optional progress-scan evidence
 * (`.volyume-audit/progress-scan-coach-worldclass/integration-plan.md` §5).
 *
 * Renders the real screen (react-test-renderer) against a minimal mock of
 * its DB/notification/food dependencies, driven onto the Fast Check-In path
 * (COMP-008: qualifying auto-derived session data collapses the wizard into
 * the condensed card), so the prompt card and the Fast Check-In summary row
 * are exercised against the REAL classifier (composeScanEvidencePacket,
 * progressScanCheckInEvidence.js, not mocked) fed by a controllable scan
 * summary + note (progressScanStore / progressScanCoachResolver mocked at
 * that producer boundary only).
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
  getCardioLogRange: jest.fn(async () => []),
  activityDayKey: jest.fn((ms) => new Date(ms ?? Date.now()).toISOString().slice(0, 10)),
  getLatestCoachOutput: jest.fn(async () => null),
}));

import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../../store/useAppStore';
import usePhotoSuppression from '../../hooks/usePhotoSuppression';
import { getProgressScanCoachSummary } from '../../lib/progressScanStore';
import { resolveProgressScanCoachNote } from '../../lib/progressScanCoachResolver';
import WeeklyCheckInScreen from '../WeeklyCheckInScreen';

const NOTIF_PREFS_KEY = '@volyume_notification_prefs';
const VALUE_LINE_PROMPT_TITLE = 'Add a progress scan first?';
const NO_SCAN_LINE = 'No photo set this period.';

const nav = { navigate: jest.fn(), goBack: jest.fn() };

// Fourteen flat daily readings: enough history for the engine's own
// week-over-week formula (getEwmaSevenDaysAgo needs a reading at least
// ~7 days back), and a genuinely flat trend (delta 0 -> 'flat'), so a
// leaner scan under the default 'maint' goal classifies as 'supports'.
function weightRows(days = 14) {
  const rows = [];
  for (let i = 0; i < days; i++) {
    rows.push({ weightKg: 80, loggedAt: Date.now() - i * 86400000 });
  }
  return rows;
}

function scoredScan(overrides = {}) {
  return {
    source: 'photo_scan',
    capturedAt: Date.now() - 2 * 86400000,
    confidence: 'moderate',
    visualLeannessScore: 66,
    leannessBandLabel: 'Lean',
    leannessBand: 'lean',
    comparisonStatus: 'comparable',
    comparableCount: 4,
    trendMagnitudePctPoints: 3.2,
    limitations: [],
    ...overrides,
  };
}

function noteFor(scan, overrides = {}) {
  if (!scan) return null;
  return {
    leannessBand: scan.leannessBand,
    leannessBandLabel: scan.leannessBandLabel,
    confidence: scan.confidence,
    trendDirection: 'down',
    usedFor: 'visual_trend_context_only',
    ...overrides,
  };
}

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); });
}

async function render({ suppressed = false, scan = null, note = undefined, sessions = { completed: 3, planned: 3 } } = {}) {
  useAppStore.mockImplementation((sel) => sel({
    user: { id: 'u-test' },
    userProfile: { sex: 'male' },
    bodyWeightUnits: 'kg',
    accessibility: {},
  }));
  usePhotoSuppression.mockReturnValue(suppressed);
  getProgressScanCoachSummary.mockImplementation(async () => (suppressed ? null : scan));
  resolveProgressScanCoachNote.mockImplementation(() => (note === undefined ? noteFor(scan) : note));
  database.getMorningWeightsLast14Days.mockResolvedValue(weightRows(14));
  database.getWeeklySessionStats.mockResolvedValue(sessions);
  const todayDay = new Date().getDay();
  await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({ checkinDay: todayDay }));
  let tree;
  await act(async () => { tree = create(<WeeklyCheckInScreen navigation={nav} />); });
  await flush();
  return tree;
}

// Forces the full wizard (no auto-derived training performance, so
// fastEligible is false) and steps from step 0 to step 1 ("This week's
// data"), where the full evidence block (headline/detail/confidence chip)
// renders -- distinct from the Fast Check-In's one compact summary row.
async function renderWizardStep1(opts = {}) {
  const tree = await render({ ...opts, sessions: { completed: 0, planned: 0 } });
  const energy = findPressable(tree, '3 Normal')[0];
  expect(energy).toBeTruthy();
  await act(async () => { energy.props.onPress(); });
  const next = tree.root.findAll((n) => n.props?.title === 'Next' && typeof n.props.onPress === 'function');
  expect(next.length).toBeGreaterThan(0);
  await act(async () => { next[0].props.onPress(); });
  await flush();
  return tree;
}

function findPressable(tree, label) {
  return tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string'
    && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');
}

afterEach(() => jest.clearAllMocks());

describe('WeeklyCheckInScreen optional scan prompt', () => {
  test('renders when no scan exists yet, and "Not now" dismisses it without persisting anything', async () => {
    const tree = await render({ scan: null });
    const text = flattenText(tree.toJSON());
    expect(text).toContain(VALUE_LINE_PROMPT_TITLE);
    expect(text).toContain('A recent scan gives this check-in extra visual context. It is optional and skipping it changes nothing.');
    const dismiss = findPressable(tree, 'Not now')[0];
    expect(dismiss).toBeTruthy();
    await act(async () => { dismiss.props.onPress(); });
    expect(flattenText(tree.toJSON())).not.toContain(VALUE_LINE_PROMPT_TITLE);
    // Nothing scan-related was written anywhere; dismiss is pure component state.
    expect(database.saveWeeklyCheckin).not.toHaveBeenCalled();
  });

  test('"Do a scan" navigates to ProgressPhotos', async () => {
    const tree = await render({ scan: null });
    const doScan = findPressable(tree, 'Do a scan')[0];
    await act(async () => { doScan.props.onPress(); });
    expect(nav.navigate).toHaveBeenCalledWith('ProgressPhotos');
  });

  test('absent when a valid packet already exists for this window (no nagging)', async () => {
    const scan = scoredScan();
    const tree = await render({ scan, note: noteFor(scan) });
    expect(flattenText(tree.toJSON())).not.toContain(VALUE_LINE_PROMPT_TITLE);
  });

  test('absent under photo suppression, fail-closed', async () => {
    const scan = scoredScan();
    const tree = await render({ suppressed: true, scan, note: noteFor(scan) });
    expect(flattenText(tree.toJSON())).not.toContain(VALUE_LINE_PROMPT_TITLE);
  });
});

describe('WeeklyCheckInScreen Fast Check-In: scan context row', () => {
  test('a valid packet adds a read-only Progress scan row to the summary', async () => {
    const scan = scoredScan();
    const tree = await render({ scan, note: noteFor(scan) });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Progress scan');
    expect(text).toContain('Moderate confidence');
  });

  test('no scan-related copy appears when there is no scan for this window', async () => {
    const tree = await render({ scan: null });
    const text = flattenText(tree.toJSON());
    expect(text).not.toContain('Moderate confidence');
    expect(text).not.toContain('High confidence');
  });
});

describe('WeeklyCheckInScreen step 1 ("This week\'s data"): evidence block per packet status', () => {
  test('valid: renders the receipt headline/detail and the confidence chip', async () => {
    const scan = scoredScan();
    const tree = await renderWizardStep1({ scan, note: noteFor(scan) });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Your photo trend points the same way as your weight trend.');
    expect(text).toContain('Moderate confidence');
  });

  test('low confidence: renders its receipt, no confidence chip, no progress-direction language', async () => {
    const scan = scoredScan({ confidence: 'low' });
    const tree = await renderWizardStep1({ scan, note: noteFor(scan, { confidence: 'low' }) });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Your recent photo set could not be read with confidence, so it was not used.');
    expect(text).toContain('Your plan comes from your logs as usual.');
    expect(text).not.toContain('Moderate confidence');
    expect(text).not.toContain('High confidence');
    expect(text).not.toContain('points the same way');
    expect(text).not.toContain('disagree this week');
  });

  // 'withheld' is NOT exercised here: composeScanEvidencePacket's v1 step
  // (buildProgressScanCoachEvidence) derives validityStatus from
  // scan.comparisonStatus, whose validityStatusFor() only ever resolves to
  // 'not_comparable' | 'baseline' | 'scored' -- 'withheld' is unreachable
  // through this screen's real wiring, exactly as it is unreachable through
  // the v1 producer chain generally (progressScanCheckInEvidence.js module
  // header, "Known gaps": a withheld/low-confidence scan already resolves to
  // a null note upstream). Its receipt copy and 'not_used'/not-eligible
  // classification are pinned directly against the pure builder in
  // progressScanCheckInEvidence.test.js ("status path b: withheld"), which
  // constructs the fixture the real chain cannot produce, exactly per that
  // module's own documented convention for defensive/unreached states.

  test('non-comparable: renders its receipt', async () => {
    const scan = scoredScan({ comparisonStatus: 'not_comparable' });
    const tree = await renderWizardStep1({ scan, note: noteFor(scan) });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('This photo set was not comparable with your earlier sets, so it was kept as a record rather than evidence.');
  });

  test('no scan: renders only the single quiet line, nothing else', async () => {
    const tree = await renderWizardStep1({ scan: null });
    const text = flattenText(tree.toJSON());
    expect(text).toContain(NO_SCAN_LINE);
    expect(text).not.toContain('Targets are set from your logged data.');
    expect(text).not.toContain('confidence.');
  });
});

describe('WeeklyCheckInScreen submit is unaffected by scan state', () => {
  test('submitting with no scan succeeds and writes no scan-related field', async () => {
    const tree = await render({ scan: null });
    // Fast Check-In requires energy + soreness; select both via the ChipRow.
    const energy = findPressable(tree, '3 Normal')[0];
    const soreness = findPressable(tree, '1 None')[0];
    expect(energy).toBeTruthy();
    expect(soreness).toBeTruthy();
    await act(async () => { energy.props.onPress(); });
    await act(async () => { soreness.props.onPress(); });
    const submitBtn = tree.root.findAll((n) => n.props?.title === "See this week's coaching" && typeof n.props.onPress === 'function');
    expect(submitBtn.length).toBeGreaterThan(0);
    await act(async () => { submitBtn[0].props.onPress(); });
    await flush();
    expect(database.saveWeeklyCheckin).toHaveBeenCalledTimes(1);
    const savedArgs = database.saveWeeklyCheckin.mock.calls[0][1];
    expect(Object.keys(savedArgs).join(' ')).not.toMatch(/scan|photo|progressScan/i);
  });
});
