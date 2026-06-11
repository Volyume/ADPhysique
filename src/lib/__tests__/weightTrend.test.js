/**
 * weightTrend.test.js — the pure derivation behind COMP-004's "Your trend".
 *
 * Locks the state ladder, the Class B colour caps (no 'act' on a body-weight
 * surface), the ED-flag neutralisation, and the maintenance-estimate gating.
 */
import { deriveWeightTrend, trendStateFor } from '../weightTrend';

// Build n EWMA points spaced one day apart, oldest-first.
function series(n, startKg = 80) {
  const out = [];
  const base = Date.parse('2026-01-01T07:00:00Z');
  for (let i = 0; i < n; i++) {
    out.push({ weightKg: startKg, ewma: startKg, date: new Date(base + i * 86400000).toISOString() });
  }
  return out;
}

describe('trendStateFor', () => {
  test('maps entry counts to the state ladder', () => {
    expect(trendStateFor(0)).toBe(0);
    expect(trendStateFor(6)).toBe(1);
    expect(trendStateFor(7)).toBe(2);
    expect(trendStateFor(13)).toBe(2);
    expect(trendStateFor(14)).toBe(3);
    expect(trendStateFor(41)).toBe(3);
    expect(trendStateFor(42)).toBe(4);
  });
});

describe('deriveWeightTrend', () => {
  test('state 0 does not render', () => {
    expect(deriveWeightTrend({ ewmaData: [] }).render).toBe(false);
    expect(deriveWeightTrend({ ewmaData: series(0) }).state).toBe(0);
  });

  test('state 1 shows the 7-day prompt, no rate, no dot, no maintenance', () => {
    const vm = deriveWeightTrend({ ewmaData: series(4) });
    expect(vm.render).toBe(true);
    expect(vm.state).toBe(1);
    expect(vm.showRate).toBe(false);
    expect(vm.dot).toBeNull();
    expect(vm.maintenance).toBeNull();
    expect(vm.insight).toMatch(/7 days/);
  });

  test('state 2 builds the estimate when confidence is insufficient', () => {
    const vm = deriveWeightTrend({
      ewmaData: series(10),
      weeklyChange: 0.1,
      adaptiveBurn: { confidence: 'insufficient_data', adjustedTDEE: 0, weeks: 1 },
    });
    expect(vm.state).toBe(2);
    expect(vm.dot).toBe('neutral');
    expect(vm.maintenance).toEqual({ building: true });
    expect(vm.showRate).toBe(false);
  });

  test('state 3 on-track: inside band reads onTrack with the calm hold line', () => {
    const vm = deriveWeightTrend({
      ewmaData: series(20),
      weeklyChange: -0.45,
      adaptiveBurn: {
        confidence: 'medium', adjustedTDEE: 2450, weeks: 3,
        actualKgPerWeek: -0.45, expectedKgPerWeek: -0.5,
      },
    });
    expect(vm.state).toBe(3);
    expect(vm.dot).toBe('onTrack');
    expect(vm.insight).toMatch(/inside your band/i);
    expect(vm.showRate).toBe(true);
    expect(vm.weeklyChange).toBe(-0.45);
    expect(vm.maintenance.kcal).toBe(2450);
    expect(vm.maintenance.label).toMatch(/Firming up/);
  });

  test('diverging trend caps at watch, never act (Class B: no red on weight)', () => {
    const vm = deriveWeightTrend({
      ewmaData: series(30),
      weeklyChange: 0.6,
      adaptiveBurn: {
        confidence: 'medium', adjustedTDEE: 2600, weeks: 4,
        actualKgPerWeek: 0.6, expectedKgPerWeek: -0.5, // way above plan
      },
    });
    expect(vm.dot).toBe('watch');
    expect(vm.dot).not.toBe('act');
    expect(vm.insight).toMatch(/above your band/i);
    expect(vm.insight).toMatch(/nothing to change yet/i);
  });

  test('high confidence at 42+ entries uses the unqualified label', () => {
    const vm = deriveWeightTrend({
      ewmaData: series(50),
      weeklyChange: -0.5,
      adaptiveBurn: {
        confidence: 'high', adjustedTDEE: 2400, weeks: 7,
        actualKgPerWeek: -0.5, expectedKgPerWeek: -0.5,
      },
    });
    expect(vm.state).toBe(4);
    expect(vm.maintenance.label).toBe('From 7 weeks of data');
  });

  test('ED flag open: direction-only copy, no rate, no maintenance, no dot', () => {
    const base = {
      ewmaData: series(30),
      adaptiveBurn: { confidence: 'high', adjustedTDEE: 2400, weeks: 4, actualKgPerWeek: 0.6, expectedKgPerWeek: -0.5 },
      edFlagOpen: true,
    };
    const rising = deriveWeightTrend({ ...base, weeklyChange: 0.3 });
    expect(rising.dot).toBeNull();
    expect(rising.showRate).toBe(false);
    expect(rising.maintenance).toBeNull();
    expect(rising.insight).toMatch(/rising slightly/i);

    const falling = deriveWeightTrend({ ...base, weeklyChange: -0.3 });
    expect(falling.insight).toMatch(/drifting down/i);

    const stable = deriveWeightTrend({ ...base, weeklyChange: 0.01 });
    expect(stable.insight).toMatch(/broadly stable/i);
    // no numbers leak into ED-flag copy
    expect(stable.insight).not.toMatch(/\d/);
  });

  // COMP-026 (B): the step-trend line.
  describe('step-trend line', () => {
    const base = {
      ewmaData: series(30),
      weeklyChange: 0.1,
      adaptiveBurn: { confidence: 'high', adjustedTDEE: 2400, weeks: 4, actualKgPerWeek: 0.6, expectedKgPerWeek: -0.5 },
    };

    test('no stepTrend (or not applied) shows no line', () => {
      expect(deriveWeightTrend(base).stepTrendLine).toBeNull();
      expect(deriveWeightTrend({ ...base, stepTrend: { applied: false, direction: 1 } }).stepTrendLine).toBeNull();
    });

    test('applied + up direction shows the faster-update line', () => {
      const vm = deriveWeightTrend({ ...base, stepTrend: { applied: true, direction: 1 } });
      expect(vm.stepTrendLine).toMatch(/movement has risen/i);
      expect(vm.stepTrendLine).not.toMatch(/\d/); // no numbers
      expect(vm.stepTrendLine).not.toMatch(/step/i); // never a steps->kcal implication
    });

    test('applied + down direction shows the settling-sooner line', () => {
      const vm = deriveWeightTrend({ ...base, stepTrend: { applied: true, direction: -1 } });
      expect(vm.stepTrendLine).toMatch(/moving less/i);
    });

    test('suppressed entirely under an open ED flag, even when applied', () => {
      const vm = deriveWeightTrend({ ...base, edFlagOpen: true, stepTrend: { applied: true, direction: -1 } });
      expect(vm.stepTrendLine).toBeUndefined(); // ED branch returns before the line is built
    });
  });
});
