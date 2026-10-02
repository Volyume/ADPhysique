/**
 * D214 (progress audit 2026-10-01): the Body pillar's two lines, built by the
 * pure `bodyPillarCopy` (moved out of AnalyticsScreen.js so it is tested
 * without a mount). Pins that the evidence line, the smoothed weight and its
 * rate, is printed only when the shared derivation allows it
 * (`pillarFigure` not false): withheld under calm mode and under an open ED
 * flag (Q2, a withhold strengthened), printed in the person's own units
 * otherwise.
 */
const { bodyPillarCopy } = require('../pillars');

describe('bodyPillarCopy', () => {
  test('no trend yet: the no-data lines', () => {
    expect(bodyPillarCopy({ render: false }, 'kg')).toEqual({
      state: 'No weigh-ins logged yet', evidence: 'Your trend starts with your first morning weigh-in.',
    });
  });
  test('an ordinary state prints the headline and the figure with its rate in the person\'s units', () => {
    const vm = { render: true, state: 3, ewmaNow: 82.4, showRate: true, weeklyChange: 0.1, insight: 'Moving at the planned rate.', pillarFigure: true };
    const kg = bodyPillarCopy(vm, 'kg');
    // RE-ANCHORED D214 addendum 6 (lane 3 review N11): the headline is a fragment
    // like the other rows', the derivation's full stop dropped.
    expect(kg.state).toBe('Moving at the planned rate');
    expect(kg.evidence).toMatch(/82\.4 kg/);
    expect(kg.evidence).toMatch(/kg\/week|kg a week/);
    const lbs = bodyPillarCopy(vm, 'lbs');
    expect(lbs.evidence).toMatch(/lbs/);
    expect(lbs.evidence).not.toMatch(/\bkg\b/);
  });
  test('calm mode: the derivation withholds the figure and the pillar prints none', () => {
    const vm = { render: true, state: 3, ewmaNow: null, showRate: false, weeklyChange: null, insight: 'Your weigh-ins are kept in Body metrics, ready when you want them.', calm: true, pillarFigure: false };
    const out = bodyPillarCopy(vm, 'kg');
    expect(out.evidence).toBeNull();
    expect(out.state).not.toMatch(/\d/);
  });
  test('an open ED flag: direction-only headline and NO figure, though the derivation still carries ewmaNow for Body metrics', () => {
    const vm = { render: true, state: 4, ewmaNow: 82.4, showRate: false, weeklyChange: 0.1, insight: 'Your weight trend has been rising slightly.', edFlagOpen: true, pillarFigure: false };
    const out = bodyPillarCopy(vm, 'kg');
    expect(out.evidence).toBeNull();
    expect(`${out.state} ${out.evidence}`).not.toMatch(/\d/);
  });
  test('a derivation that predates the flag (no pillarFigure field) prints as before', () => {
    const vm = { render: true, state: 3, ewmaNow: 82.4, showRate: true, weeklyChange: 0.1, insight: 'x' };
    expect(bodyPillarCopy(vm, 'kg').evidence).toMatch(/82\.4 kg/);
  });
});

// D214 addendum 4 (Body metrics, section 3 item 9): the evidence line names
// its referent and window; a lapsed trend says so with no figure; a reading
// without enough weigh-ins prints the trend weight alone.
describe('bodyPillarCopy, D214 addendum 4', () => {
  test('the evidence names the referent and the two-week window, in the person\'s units', () => {
    const vm = { render: true, state: 3, ewmaNow: 82.4, showRate: true, weeklyChange: 0.3, insight: 'Trending up over the last 2 weeks.', pillarFigure: true, twoWeek: { enough: true, ratePerWeek: 0.1, deltaKg: 0.2, spanDays: 14, count: 15 } };
    expect(bodyPillarCopy(vm, 'kg').evidence).toBe('Trend 82.4 kg, +0.1 kg a week over the last 2 weeks');
    expect(bodyPillarCopy(vm, 'lbs').evidence).toMatch(/^Trend 182 lbs, \+0\.2 lbs a week over the last 2 weeks$/); // one spelling of a rate (census P10)
  });
  test('too few weigh-ins in the window: the trend weight alone, never the engine\'s bare weekly rate', () => {
    const vm = { render: true, state: 3, ewmaNow: 82.4, showRate: true, weeklyChange: 0.3, insight: 'Not enough weigh-ins in the last 2 weeks for a direction: 5 of 7.', pillarFigure: true, twoWeek: { enough: false, count: 5 } };
    expect(bodyPillarCopy(vm, 'kg').evidence).toBe('Trend 82.4 kg');
  });
  test('a lapsed trend: the lapsed line as the headline, no evidence', () => {
    const vm = { render: true, state: 0, lapsed: true, lastWeighInMs: 1, ewmaNow: null, showRate: false, insight: 'No weigh-in in the last 14 days; the last was 3 weeks ago.', pillarFigure: false };
    expect(bodyPillarCopy(vm, 'kg')).toEqual({ state: 'No weigh-in in the last 14 days; the last was 3 weeks ago', evidence: null });
  });
});
