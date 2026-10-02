// P3(a) (progress-tab audit 2026-09-24, D200-2): ReadinessCards.js now
// imports Button (the "Rate your last session" control), which pulls in
// ../lib/haptics -> expo-haptics -- a chain this file's minimal, no-render
// pure-function test never needed to satisfy before and that crashes in
// this suite's environment ("Cannot read properties of undefined (reading
// 'EventEmitter')"). Mocked away exactly as every other component test
// that imports something using Button already does; this test never
// renders JSX, so the mock's own shape does not matter.
jest.mock('../Button', () => () => null);
// D201: ReadinessCards.js now also imports BodyDiagramHeatmap (the
// "Recovery by muscle" body figure), which pulls in react-native-svg --
// native-only, cannot run here either. Same treatment as the Button mock
// just above, for the same reason (this suite never renders JSX, so the
// mock's own shape does not matter).
jest.mock('../BodyDiagramHeatmap', () => () => null);
// D214 (lane 2): ReadinessCards.js now also imports FatigueTrendCard (the
// fatigue-trend bars moved here from Consistency), which pulls in
// react-native-svg. Same treatment, same reason.
jest.mock('../FatigueTrendCard', () => () => null);
// D201: ReadinessCards.js also now imports load.js (loadMuscleRecovery),
// which pulls in trainingHabitSchedule.js -> trainingReminders.js ->
// expo-notifications -> expo-modules-core, which throws at require time
// in this suite's node env. Same fix HomeScreen's own recovery test
// (HomeScreen.recoveryRecommendation.test.js) already uses.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: () => {} })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: () => {} })),
  SchedulableTriggerInputTypes: {
    DAILY: 'daily', WEEKLY: 'weekly', YEARLY: 'yearly', DATE: 'date', TIME_INTERVAL: 'timeInterval', CALENDAR: 'calendar',
  },
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 },
  AndroidNotificationPriority: { MAX: 'max', HIGH: 'high', DEFAULT: 'default' },
}));

import { computeRecoveryTrendInsight } from '../ReadinessCards';

// Check-ins arrive newest-first. energyScore / sorenessScore / sleepQuality
// are 1-5 (sleep: 1 Poor … 5 Excellent). The insight reports one plain read,
// or null when there isn't enough signal. Sleep was collected but never read
// back to the user before D2; these lock the priority and the sleep branch.
const ck = (over) => ({ energyScore: 3, sorenessScore: 2, sleepQuality: 3, ...over });
// C6 RD6-7 (D97-25): the insight now requires a CURRENT latest check-in
// and calendar-adjacent weeks before speaking in runs, so fixtures carry
// real adjacent weekStarts (newest-first) and a fixed clock.
const NOW = 1770000000000;
const WEEK = 7 * 86400000;
const series = (rows) => rows.map((r, i) => ({ ...r, weekStart: NOW - 3 * 86400000 - i * WEEK }));

describe('computeRecoveryTrendInsight', () => {
  test('returns null when there is too little signal', () => {
    expect(computeRecoveryTrendInsight([])).toBeNull();
    expect(computeRecoveryTrendInsight(series([ck(), ck()]), NOW)).toBeNull(); // only 2 weeks
  });

  test('a run of poor sleep is surfaced as a warning', () => {
    const checkins = [
      ck({ sleepQuality: 1 }),
      ck({ sleepQuality: 2 }),
      ck({ sleepQuality: 2 }),
      ck({ sleepQuality: 4 }),
    ];
    const out = computeRecoveryTrendInsight(series(checkins), NOW);
    expect(out?.type).toBe('warning');
    // Re-anchored under closeout P-9: sleepQuality is dual-source
    // (session answers write it too), so the sentence claims only the
    // adjacency-proven "weeks running", never a check-in event.
    // RE-ANCHORED under D214 (lane 2, RC-18 and RC-34, D204): the clause
    // "which is worth paying attention to" is gone (the fact stays), and the
    // sentence names its measure, the 1-5 sleep QUALITY rating, because the
    // check-in row prints sleep in hours.
    expect(out?.text).toBe('Sleep quality has been rated low in 3 of your last 4 weeks.'); // the rule counts 3 of the latest 4, so the sentence says which (D214 addendum 9)
    expect(out?.text).not.toMatch(/weekly check-ins/);
  });

  test('D214 (RC-18, D204): the three sentences that told the athlete to pay attention keep their fact and lose the clause', () => {
    const energy = computeRecoveryTrendInsight(series([ck({ energyScore: 1 }), ck({ energyScore: 2 }), ck({ energyScore: 2 })]), NOW);
    expect(energy.text).toBe('Energy has been low in each of your last 3 weekly check-ins.');
    const sore = computeRecoveryTrendInsight(series([ck({ sorenessScore: 4 }), ck({ sorenessScore: 5 }), ck({ sorenessScore: 4 })]), NOW);
    expect(sore.text).toBe('High soreness has been reported in each of your last 3 weekly check-ins.');
    const sleep = computeRecoveryTrendInsight(series([ck({ sleepQuality: 1 }), ck({ sleepQuality: 2 }), ck({ sleepQuality: 2 })]), NOW);
    for (const out of [energy, sore, sleep]) {
      expect(out.text).not.toMatch(/worth paying attention|more attention|pay attention|may need/i);
    }
  });

  // D214 addendum 9 (V4, rule 7): the high-energy sentence used to keep a clause
  // that judges the fact ("consistently high across the last 3 weekly check-ins,
  // which is a good sign"). It now keeps the fact and loses the clause, in the
  // shape the low-energy sentence above already has.
  test('V4: high energy is the fact alone, "high in N of your last M weekly check-ins", with no verdict clause', () => {
    const three = computeRecoveryTrendInsight(series([ck({ energyScore: 4 }), ck({ energyScore: 5 }), ck({ energyScore: 4 })]), NOW);
    expect(three.type).toBe('good');
    expect(three.text).toBe('Energy has been high in each of your last 3 weekly check-ins.');
    const four = computeRecoveryTrendInsight(series([5, 5, 4, 5].map((energyScore) => ck({ energyScore }))), NOW);
    expect(four.text).toBe('Energy has been high in each of your last 4 weekly check-ins.');
    // Three of the latest four, not consecutive: the sentence says "3 of your last 4", never "in a row".
    const scattered = computeRecoveryTrendInsight(series([5, 2, 4, 5].map((energyScore) => ck({ energyScore }))), NOW);
    expect(scattered.text).toBe('Energy has been high in 3 of your last 4 weekly check-ins.');
    for (const out of [three, four]) expect(out.text).not.toMatch(/consistently|good sign|which is|across the last/i);
  });

  test('low energy outranks poor sleep (energy is the primary read)', () => {
    const checkins = [
      ck({ energyScore: 1, sleepQuality: 1 }),
      ck({ energyScore: 2, sleepQuality: 2 }),
      ck({ energyScore: 2, sleepQuality: 2 }),
    ];
    expect(computeRecoveryTrendInsight(series(checkins), NOW).text).toMatch(/Energy has been low/);
  });

  test('good sleep does not trigger the warning', () => {
    const checkins = [ck({ sleepQuality: 4 }), ck({ sleepQuality: 5 }), ck({ sleepQuality: 4 })];
    const out = computeRecoveryTrendInsight(series(checkins), NOW);
    // No poor-sleep run, no low/high energy run: nothing to say here.
    expect(out).toBeNull();
  });
});

describe('C6 RD6-7 (D97-25): runs require current, calendar-adjacent weeks', () => {
  test('months-old check-ins never produce a present-tense run', () => {
    const stale = [
      ck({ energyScore: 1 }), ck({ energyScore: 1 }), ck({ energyScore: 1 }),
    ].map((r, i) => ({ ...r, weekStart: NOW - 120 * 86400000 - i * WEEK }));
    expect(computeRecoveryTrendInsight(stale, NOW)).toBeNull();
  });

  test('a gap breaks the run: three low-energy rows across a lapse are not "in a row"', () => {
    const rows = [
      { ...ck({ energyScore: 1 }), weekStart: NOW - 3 * 86400000 },
      { ...ck({ energyScore: 1 }), weekStart: NOW - 3 * 86400000 - WEEK },
      // ten-week gap: this ancient low week may not chain onto the run
      { ...ck({ energyScore: 1 }), weekStart: NOW - 3 * 86400000 - 11 * WEEK },
    ];
    expect(computeRecoveryTrendInsight(rows, NOW)).toBeNull();
  });

  test('an unbroken current run still speaks exactly as before', () => {
    const rows = series([ck({ energyScore: 1 }), ck({ energyScore: 2 }), ck({ energyScore: 2 })]);
    expect(computeRecoveryTrendInsight(rows, NOW).text).toMatch(/Energy has been low in each of your last 3 weekly check-ins/);
  });
});
