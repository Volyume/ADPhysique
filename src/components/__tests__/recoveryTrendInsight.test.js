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
    expect(out?.text).toMatch(/Sleep has been rated low for 3 weekly check-ins/);
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
    expect(computeRecoveryTrendInsight(rows, NOW).text).toMatch(/Energy has been low for 3 weekly check-ins in a row/);
  });
});
