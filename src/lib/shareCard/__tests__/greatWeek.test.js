import { isGreatWeek, buildWeeklyRecapParams, GREAT_WEEK_HEADLINE } from '../greatWeek';

// A baseline "great" coach output: on target, hit sessions, a PR, clean recovery,
// no deload, no safety flags.
function out(over = {}) {
  return {
    hasEnoughData: true,
    trend: { onTarget: true },
    sessionsPlanned: 4,
    sessionsCompleted: 4,
    prsThisWeek: 2,
    recoveryFlag: 'normal',
    deloadSuggested: false,
    edPatternFired: false,
    ffmFloorHeld: false,
    rapidWeightLossFlag: false,
    ...over,
  };
}

describe('isGreatWeek', () => {
  test('fires on a genuinely strong, safe week', () => {
    expect(isGreatWeek(out()).great).toBe(true);
  });

  test('needs enough data', () => {
    expect(isGreatWeek(out({ hasEnoughData: false })).great).toBe(false);
  });

  test('off-target weight is not a great week', () => {
    expect(isGreatWeek(out({ trend: { onTarget: false } })).great).toBe(false);
  });

  test('missed most sessions is not a great week', () => {
    expect(isGreatWeek(out({ sessionsPlanned: 4, sessionsCompleted: 1 })).great).toBe(false);
  });

  test('a deload week is never framed as a great week', () => {
    expect(isGreatWeek(out({ deloadSuggested: true })).great).toBe(false);
  });

  test('on-target + sessions + clean recovery counts even with zero PRs', () => {
    expect(isGreatWeek(out({ prsThisWeek: 0, recoveryFlag: 'normal' })).great).toBe(true);
  });

  test('on-target + sessions but no PR and poor recovery does not fire', () => {
    expect(isGreatWeek(out({ prsThisWeek: 0, recoveryFlag: 'concerned' })).great).toBe(false);
  });

  // HARD SAFETY GATES: never celebratable while any safety signal is open.
  test('ED-pattern flag blocks a great week even if everything else is perfect', () => {
    expect(isGreatWeek(out({ edPatternFired: true })).great).toBe(false);
  });
  test('FFM floor hold blocks a great week', () => {
    expect(isGreatWeek(out({ ffmFloorHeld: true })).great).toBe(false);
  });
  test('rapid-loss flag blocks a great week', () => {
    expect(isGreatWeek(out({ rapidWeightLossFlag: true })).great).toBe(false);
  });
});

describe('buildWeeklyRecapParams — ED-safe by construction', () => {
  test('headline is the Textbook Week tier; card type is weekly', () => {
    const p = buildWeeklyRecapParams(out(), { weekLabel: 'Week 4' });
    expect(p.cardType).toBe('weekly');
    expect(p.tierLabel).toBe(GREAT_WEEK_HEADLINE);
    expect(p.tierLabel).toBe('Textbook Week');
    expect(p.weekLabel).toBe('Week 4');
  });

  test('weight progress is QUALITATIVE only — never a number', () => {
    const p = buildWeeklyRecapParams(out({ trend: { onTarget: true, rateLabel: 'losing 0.8 kg/wk', delta: -0.8 } }));
    const progress = p.stats.find((s) => s.label === 'On target');
    expect(progress).toEqual({ label: 'On target', value: '✓' });
    // No stat value anywhere contains a kg figure or a rate.
    const blob = JSON.stringify(p.stats) + p.coachLine;
    expect(blob).not.toMatch(/kg|\/wk|\d+(\.\d+)?\s*(kg|lb)/i);
  });

  test('under suppress (calm mode / ED flag) NO weight/progress language appears', () => {
    const p = buildWeeklyRecapParams(out(), { suppress: true });
    expect(p.stats.find((s) => s.label === 'On target')).toBeUndefined();
    expect(p.coachLine).not.toMatch(/target|kg|\/wk/i);
    // Still celebrates the controllable, self-referential wins.
    expect(p.coachLine).toMatch(/you hit/i);
    expect(p.stats.some((s) => s.label === 'Sessions')).toBe(true);
  });

  test('caps at 4 stats and stays self-referential (no comparison language)', () => {
    const p = buildWeeklyRecapParams(out());
    expect(p.stats.length).toBeLessThanOrEqual(4);
    expect(p.coachLine).not.toMatch(/than|others|rank|best|most|fastest/i);
  });

  test('coach line names the real numbers (sessions, PRs) — numbers before narrative', () => {
    const p = buildWeeklyRecapParams(out({ sessionsPlanned: 6, sessionsCompleted: 5, prsThisWeek: 1 }));
    expect(p.coachLine).toMatch(/5 of your 6 sessions/);
    expect(p.coachLine).toMatch(/1 new PR\b/);
  });
});

describe('buildWeeklyRecapParams — best-lift hero', () => {
  const lift = { exerciseName: 'Bench Press', weight: 100, reps: 5, isNewBest: true, gainKg: 2.5 };

  test('passes the best lift through when present and not suppressed', () => {
    const p = buildWeeklyRecapParams(out(), { bestLift: lift });
    expect(p.bestLift).toEqual(lift);
  });

  test('drops the best lift entirely under suppress (a lift weight is a number)', () => {
    const p = buildWeeklyRecapParams(out(), { bestLift: lift, suppress: true });
    expect(p.bestLift).toBeNull();
  });

  test('includeOnTarget=false drops the on-target stat + progress language but KEEPS the lift', () => {
    const p = buildWeeklyRecapParams(out(), { bestLift: lift, includeOnTarget: false });
    expect(p.bestLift).toEqual(lift); // independent of the on-target toggle
    expect(p.stats.find((s) => s.label === 'On target')).toBeUndefined();
    expect(p.coachLine).not.toMatch(/target/i);
  });

  test('null/missing lift yields null, never undefined', () => {
    expect(buildWeeklyRecapParams(out()).bestLift).toBeNull();
    expect(buildWeeklyRecapParams(out(), { bestLift: null }).bestLift).toBeNull();
  });
});
