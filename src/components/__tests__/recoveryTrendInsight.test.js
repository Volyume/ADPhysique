import { computeRecoveryTrendInsight } from '../ReadinessCards';

// Check-ins arrive newest-first. energyScore / sorenessScore / sleepQuality
// are 1-5 (sleep: 1 Poor … 5 Excellent). The insight reports one plain read,
// or null when there isn't enough signal. Sleep was collected but never read
// back to the user before D2; these lock the priority and the sleep branch.
const ck = (over) => ({ energyScore: 3, sorenessScore: 2, sleepQuality: 3, ...over });

describe('computeRecoveryTrendInsight', () => {
  test('returns null when there is too little signal', () => {
    expect(computeRecoveryTrendInsight([])).toBeNull();
    expect(computeRecoveryTrendInsight([ck(), ck()])).toBeNull(); // only 2 weeks
  });

  test('a run of poor sleep is surfaced as a warning', () => {
    const checkins = [
      ck({ sleepQuality: 1 }),
      ck({ sleepQuality: 2 }),
      ck({ sleepQuality: 2 }),
      ck({ sleepQuality: 4 }),
    ];
    const out = computeRecoveryTrendInsight(checkins);
    expect(out?.type).toBe('warning');
    expect(out?.text).toMatch(/Sleep has been rated low for 3 check-ins/);
  });

  test('low energy outranks poor sleep (energy is the primary read)', () => {
    const checkins = [
      ck({ energyScore: 1, sleepQuality: 1 }),
      ck({ energyScore: 2, sleepQuality: 2 }),
      ck({ energyScore: 2, sleepQuality: 2 }),
    ];
    expect(computeRecoveryTrendInsight(checkins).text).toMatch(/Energy has been low/);
  });

  test('good sleep does not trigger the warning', () => {
    const checkins = [ck({ sleepQuality: 4 }), ck({ sleepQuality: 5 }), ck({ sleepQuality: 4 })];
    const out = computeRecoveryTrendInsight(checkins);
    // No poor-sleep run, no low/high energy run: nothing to say here.
    expect(out).toBeNull();
  });
});
