import { isGreatWeek, buildWeeklyRecapParams, GREAT_WEEK_HEADLINE } from '../greatWeek';

// A baseline "great" coach output: on target, lost 0.7kg, hit sessions, a PR,
// clean recovery, no deload, no safety flags.
function out(over = {}) {
  return {
    hasEnoughData: true,
    goalPhase: 'mod_cut',
    trend: { onTarget: true, delta: -0.7, deltaLabel: '-0.7kg this week', rateLabel: 'losing 0.7kg/wk' },
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

  test('a cut that lost weight on target shows the labelled hero (heading + magnitude + status)', () => {
    const p = buildWeeklyRecapParams(out({ goalPhase: 'mod_cut', trend: { onTarget: true, delta: -0.8 } }));
    // Magnitude only (no bare sign), with an explicit heading so it is never ambiguous.
    expect(p.progress).toEqual({ heading: 'weight lost this week', value: '0.8 kg', context: 'right on target' });
    expect(p.coachLine).toMatch(/lost 0\.8 kg/);
  });

  test('the unit follows the user (lbs)', () => {
    const p = buildWeeklyRecapParams(out({ goalPhase: 'mild_cut', trend: { onTarget: true, delta: -0.7 } }), { units: 'lbs' });
    expect(p.progress.value).toBe('0.7 lbs');
    expect(p.coachLine).toMatch(/lost 0\.7 lbs/);
  });

  test('weight is shown ONLY for a cut goal — a bulk never puts a scale number on the card', () => {
    const bulk = buildWeeklyRecapParams(out({ goalPhase: 'mod_bulk', trend: { onTarget: true, delta: 0.4 } }));
    expect(bulk.progress).toBeNull();
    expect(bulk.coachLine).not.toMatch(/lost|gained|kg/);
    const maint = buildWeeklyRecapParams(out({ goalPhase: 'maint', trend: { onTarget: true, delta: 0 } }));
    expect(maint.progress).toBeNull();
  });

  test('off-target never reaches the card (no progress hero)', () => {
    const p = buildWeeklyRecapParams(out({ trend: { onTarget: false, delta: -0.8 } }));
    expect(p.progress).toBeNull();
    expect(p.coachLine).not.toMatch(/lost|gained/);
  });

  test('under suppress (calm mode / ED flag) NO weight number or progress language appears', () => {
    const p = buildWeeklyRecapParams(out(), { suppress: true });
    expect(p.progress).toBeNull();
    expect(p.coachLine).not.toMatch(/kg|\/wk|lost|gained|target/i);
    // Still celebrates the controllable, self-referential wins.
    expect(p.coachLine).toMatch(/you hit/i);
    expect(p.stats.some((s) => s.label === 'Sessions')).toBe(true);
  });

  test('stays self-referential (no comparison language)', () => {
    const p = buildWeeklyRecapParams(out());
    expect(p.stats.length).toBeLessThanOrEqual(4);
    expect(p.coachLine).not.toMatch(/than|others|rank|fastest/i);
  });

  test('coach line names the real numbers (sessions, PRs, weight) — numbers before narrative', () => {
    const p = buildWeeklyRecapParams(out({ sessionsPlanned: 6, sessionsCompleted: 5, prsThisWeek: 1, trend: { onTarget: true, delta: -0.5 } }));
    expect(p.coachLine).toMatch(/5 of your 6 sessions/);
    expect(p.coachLine).toMatch(/1 new PR\b/);
    expect(p.coachLine).toMatch(/lost 0\.5 kg/);
  });
});

describe('buildWeeklyRecapParams — best-lift feature', () => {
  const lift = { exerciseName: 'Bench Press', weight: 100, reps: 5, isNewBest: true, units: 'kg' };

  test('passes the best lift through when present and not suppressed', () => {
    const p = buildWeeklyRecapParams(out(), { bestLift: lift });
    expect(p.bestLift).toEqual(lift);
  });

  test('drops the best lift entirely under suppress (a lift weight is a number)', () => {
    const p = buildWeeklyRecapParams(out(), { bestLift: lift, suppress: true });
    expect(p.bestLift).toBeNull();
  });

  test('includeProgress=false drops the weight hero + progress language but KEEPS the lift', () => {
    const p = buildWeeklyRecapParams(out(), { bestLift: lift, includeProgress: false });
    expect(p.bestLift).toEqual(lift); // independent of the progress toggle
    expect(p.progress).toBeNull();
    expect(p.coachLine).not.toMatch(/lost|gained|kg/);
  });

  test('null/missing lift yields null, never undefined', () => {
    expect(buildWeeklyRecapParams(out()).bestLift).toBeNull();
    expect(buildWeeklyRecapParams(out(), { bestLift: null }).bestLift).toBeNull();
  });
});
