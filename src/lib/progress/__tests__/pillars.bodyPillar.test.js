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
      state: 'No weigh-ins logged yet', evidence: 'Log a morning weight to start your trend.',
    });
  });
  test('an ordinary state prints the headline and the figure with its rate in the person\'s units', () => {
    const vm = { render: true, state: 3, ewmaNow: 82.4, showRate: true, weeklyChange: 0.1, insight: 'Moving at the planned rate.', pillarFigure: true };
    const kg = bodyPillarCopy(vm, 'kg');
    expect(kg.state).toBe('Moving at the planned rate.');
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
