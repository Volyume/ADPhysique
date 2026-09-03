/**
 * scenarios.conflict.test.js — Campaign 21, Step 5-6 exemplar family.
 *
 * The cross-domain / conflict / safety family (HARNESS-DESIGN.md §1,
 * ~30 scenarios). Every expected outcome is derived from a LOCKED
 * ORACLE-LOCK.md block (LEAD-REVIEW: ACCEPTED 2026-08-16) and cites it in
 * the scenario's `why`. This is the hardest family and the exemplar every
 * later family copies, per the Step 5-6 brief.
 *
 * Scenario definitions live in scenarios.conflict.data.js (see its header
 * for the full coverage list); this file is the executable half:
 * runScenarios(SCENARIOS) plus two hand-written describe() blocks
 * (X-SAFETY-09 tier-blindness, X-SAFETY-06 notification fail-closed) that
 * are not expressible in the flat must/mustNot assertion vocabulary.
 *
 * Two data-file scenarios are marked `pending: true` (no reachable
 * production seam without new production code) -- see the
 * DISAGREEMENTS/pending list in the Step 5-6 report. None are
 * `expectedFail: true`: every assertion matches verified production
 * behaviour.
 */
import { runScenarios, get } from './harness';
import { runWeeklyCoach } from '../../lib/weeklyCoach';
import { SCENARIOS, ffmFloorWeek } from './scenarios.conflict.data';

runScenarios(SCENARIOS);

// ─── X-SAFETY-09: tier-blindness structural check (behavioural) ─────────────
// The guardrail computation paths (nutritionEngine.js, edPatternDetector.js,
// coachApply.js) never reference `tier`/`proGate` at all (grep-verified,
// zero real hits beyond an unrelated "Frontiers" substring match). weeklyCoach.js
// DOES carry a `userTier` param, but only for the differential-paywall trigger
// (Move #4) -- a display/marketing concern, never a floor/gate. This proves it
// behaviourally: an FFM-floor-triggering week run once at userTier:'free' and
// once at userTier:'pro' must produce byte-identical safety-relevant fields.
describe('CFL-24: X-SAFETY-09 tier-blindness (ORACLE X-SAFETY-09)', () => {
  test('every guardrail field is byte-identical between free and pro tiers', () => {
    const freeOut = runWeeklyCoach({ ...ffmFloorWeek(), userTier: 'free' });
    const proOut = runWeeklyCoach({ ...ffmFloorWeek(), userTier: 'pro' });
    const guardrailFields = [
      'ffmFloorHeld', 'edPatternHeld', 'rapidWeightLossFlag', 'safetyHold',
      'deloadSuggested', 'autoApplyHoldActive', 'adjustments.calories',
      'adjustments.training.signal', 'volumeSignal',
    ];
    for (const f of guardrailFields) {
      expect(get(proOut, f)).toEqual(get(freeOut, f));
    }
    expect(freeOut.ffmFloorHeld).toBe(true); // sanity: the guardrail actually fired
  });
});

// ─── X-SAFETY-06: notification suppression fail-closed on a read error ──────
// A dedicated jest.mock block, run in isolation from the pure-function
// scenarios above (this is the harness's IO-boundary allowance: mock ONLY
// the DB/OS calls, never the decision itself -- scheduleWinbackNotification
// IS the real production gate under test, one of the 5 sites X-SAFETY-06
// names). Extends the existing pinned convention in
// src/lib/notifications/__tests__/winbackScheduler.test.js with the
// specific case that suite does not cover: a REJECTED (not merely truthy)
// ED-flag read, and a thrown calm-mode read.
describe('CFL-20: X-SAFETY-06 notification suppression fails CLOSED on a read error (ORACLE X-SAFETY-06)', () => {
  let mockScheduleAsync;
  let mockCancelAsync;
  let mockGetEd;
  let mockGetAllWorkouts;
  let mockGetWellbeingMode;
  let scheduleWinbackNotification;
  let winbackState;

  beforeAll(() => {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    mockScheduleAsync = jest.fn(() => Promise.resolve('id'));
    mockCancelAsync = jest.fn(() => Promise.resolve());
    jest.doMock('expo-notifications', () => ({
      scheduleNotificationAsync: (...a) => mockScheduleAsync(...a),
      cancelScheduledNotificationAsync: (...a) => mockCancelAsync(...a),
      cancelAllScheduledNotificationsAsync: () => Promise.resolve(),
      SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date', WEEKLY: 'weekly' },
    }));
    mockGetEd = jest.fn();
    mockGetAllWorkouts = jest.fn(() => Promise.resolve([]));
    jest.doMock('../../lib/database', () => ({
      getOpenEdPatternFlag: (...a) => mockGetEd(...a),
      getAllWorkouts: (...a) => mockGetAllWorkouts(...a),
    }));
    mockGetWellbeingMode = jest.fn(() => Promise.resolve('normal'));
    jest.doMock('../../lib/wellbeing', () => ({
      getWellbeingMode: (...a) => mockGetWellbeingMode(...a),
      isCalm: (mode) => mode === 'calm',
    }));
    jest.doMock('../../lib/notifications/telemetry', () => ({ trackNotificationFailed: jest.fn() }));
    jest.doMock('../../lib/notifications/quietHours', () => ({
      getQuietHours: () => Promise.resolve({ enabled: false }),
      shiftDateOutOfQuietHours: (date) => ({ date }),
      shiftHourMinuteOutOfQuietHours: (hour, minute) => ({ hour, minute }),
    }));
    jest.doMock('../../lib/notifications/channels', () => ({ COACHING_REMINDERS_CHANNEL: 'coaching' }));
    jest.doMock('../../store/useAppStore', () => ({
      __esModule: true,
      default: { getState: () => ({ user: { id: 'u1' }, userProfile: null }) },
    }));
    // FULLY-FREE PRODUCT (founder decision 2026-09-03): scheduleWinbackNotification
    // is a no-op while proGate.FULL_ACCESS_FOR_ALL is on, which would make every
    // assertion below pass VACUOUSLY - the ED/calm suppression would be proved by
    // a function that never schedules anything at all. X-SAFETY-06 is an
    // ED-safety oracle and must keep testing the real gate, so the override is
    // mocked OFF here (an IO-boundary allowance in the same spirit as the mocks
    // above: it restores the mechanism under test, it does not soften it). Not
    // one assertion changed. The scheduler's fully-free stand-down is pinned
    // separately in src/lib/notifications/__tests__/winbackScheduler.test.js.
    jest.doMock('../../lib/proGate', () => ({
      __esModule: true,
      FULL_ACCESS_FOR_ALL: false,
      PRO_BETA_ACTIVE: false,
      _resolveTier: (state, override) => (override ? 'pro' : 'free'),
      isPaidTier: () => 'free',
    }));

    // eslint-disable-next-line global-require
    scheduleWinbackNotification = require('../../lib/notifications/scheduler').scheduleWinbackNotification;
    // eslint-disable-next-line global-require
    winbackState = require('../../lib/payments/winbackState');
  });

  beforeEach(async () => {
    await winbackState.clearEpisode();
    await winbackState.openEpisode(Date.now()); // future fire date, otherwise eligible
    mockScheduleAsync.mockClear();
    mockCancelAsync.mockClear();
    mockGetWellbeingMode.mockClear();
    mockGetWellbeingMode.mockResolvedValue('normal');
  });

  afterAll(() => { jest.resetModules(); jest.dontMock('react-native'); });

  test('a REJECTED ED-flag read maps to the fail-closed sentinel: never scheduled', async () => {
    mockGetEd.mockRejectedValue(new Error('db unavailable'));
    await scheduleWinbackNotification('u1');
    expect(mockScheduleAsync).not.toHaveBeenCalled();
    expect(mockCancelAsync).toHaveBeenCalled();
  });

  test('a resolved-but-truthy ED flag also suppresses (the ordinary path, for contrast)', async () => {
    mockGetEd.mockResolvedValue({ id: 'flag' });
    await scheduleWinbackNotification('u1');
    expect(mockScheduleAsync).not.toHaveBeenCalled();
  });

  test('a THROWN calm-mode read also fails closed: never scheduled', async () => {
    mockGetEd.mockResolvedValue(null); // ED check clears
    mockGetWellbeingMode.mockRejectedValue(new Error('storage unavailable'));
    await scheduleWinbackNotification('u1');
    expect(mockScheduleAsync).not.toHaveBeenCalled();
    expect(mockCancelAsync).toHaveBeenCalled();
  });

  test('no read error, no ED flag, no calm mode: the notification schedules normally (control)', async () => {
    mockGetEd.mockResolvedValue(null);
    mockGetWellbeingMode.mockResolvedValue('normal');
    await scheduleWinbackNotification('u1');
    expect(mockScheduleAsync).toHaveBeenCalledTimes(1);
  });
});
