/**
 * ULTIMATE-RECOMP-01 — recomposition reframe (pure derivation).
 * Pins the founder-decided rules: weight-flat gate (|slope| <= 0.15 kg/entry),
 * composition movement thresholds (BF >= 0.5pp OR site >= 1.0cm), strength gate
 * (e1RM up >= 2.5 kg), calm/ED suppression, and render-nothing fallbacks.
 */
import { deriveRecomp } from '../recompReframe';

// Eight weight readings holding ~steady around 80 kg (|slope| <= 0.15).
function flatWeeks(extra = {}) {
  return Array.from({ length: 8 }, (_, i) => ({
    metric_date: `2026-04-0${i + 1}`,
    body_weight: 80 + (i % 2 === 0 ? 0.1 : -0.1),
    ...(extra[i] || {}),
  }));
}

// Two completed sets of an exercise on a date, weight×reps → e1RM.
function liftSet(exerciseId, dateKey, weight, reps) {
  return {
    exerciseId, workoutId: `${exerciseId}-${dateKey}`,
    createdAt: new Date(`${dateKey}T10:00:00`).getTime(),
    weight, actualReps: reps, setType: 'working',
  };
}
const EXERCISES = [{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Back Squat' }];

describe('deriveRecomp — warrant gate', () => {
  test('flat weight + body-fat down + waist down → renders the reframe', () => {
    const history = flatWeeks({
      0: { body_fat: 20, waist: 86 },
      7: { body_fat: 18.5, waist: 83.5 },
    });
    const vm = deriveRecomp(history, [], []);
    expect(vm.render).toBe(true);
    expect(vm.bodyFat).toEqual({ deltaPP: -1.5 });
    expect(vm.measurement).toEqual({ label: 'Waist', deltaCm: -2.5 });
  });

  test('weight clearly trending (gaining) → render: false even if shape moved', () => {
    const rising = Array.from({ length: 8 }, (_, i) => ({
      metric_date: `2026-04-0${i + 1}`, body_weight: 80 + i * 0.5, // slope 0.5 > 0.15
      ...(i === 0 ? { waist: 86 } : i === 7 ? { waist: 83 } : {}),
    }));
    expect(deriveRecomp(rising, [], []).render).toBe(false);
  });

  test('flat weight but nothing moved → render: false', () => {
    expect(deriveRecomp(flatWeeks(), [], []).render).toBe(false);
  });
});

describe('deriveRecomp — movement thresholds (NA-coaching-3)', () => {
  test('body fat must move >= 0.5pp', () => {
    const under = flatWeeks({ 0: { body_fat: 20 }, 7: { body_fat: 19.6 } }); // 0.4pp
    expect(deriveRecomp(under, [], []).render).toBe(false);
    const at = flatWeeks({ 0: { body_fat: 20 }, 7: { body_fat: 19.5 } });    // 0.5pp
    expect(deriveRecomp(at, [], []).bodyFat).toEqual({ deltaPP: -0.5 });
  });

  test('a site must move >= 1.0cm', () => {
    const under = flatWeeks({ 0: { arms: 38 }, 7: { arms: 38.9 } }); // 0.9cm
    expect(deriveRecomp(under, [], []).render).toBe(false);
    const at = flatWeeks({ 0: { arms: 38 }, 7: { arms: 39 } });      // 1.0cm
    expect(deriveRecomp(at, [], []).measurement).toEqual({ label: 'Arms', deltaCm: 1 });
  });

  test('picks the single most-changed site', () => {
    const history = flatWeeks({
      0: { waist: 86, arms: 38 },
      7: { waist: 84.5, arms: 40 }, // waist -1.5, arms +2.0 → arms wins
    });
    expect(deriveRecomp(history, [], []).measurement).toEqual({ label: 'Arms', deltaCm: 2 });
  });
});

describe('deriveRecomp — strength stream (NA-coaching-2)', () => {
  test('a lift up >= 2.5 kg e1RM warrants the reframe on its own', () => {
    const sets = [
      ...[60, 60].map(() => liftSet(1, '2026-04-01', 60, 5)),  // e1RM ~70
      ...[70, 70].map(() => liftSet(1, '2026-04-07', 70, 5)),  // e1RM ~81.7
    ];
    const vm = deriveRecomp(flatWeeks(), sets, EXERCISES);
    expect(vm.render).toBe(true);
    expect(vm.lift.name).toBe('Bench Press');
    expect(vm.lift.deltaKg).toBeGreaterThanOrEqual(3);
  });

  test('a sub-2.5 kg lift gain does not warrant on its own', () => {
    const sets = [
      liftSet(1, '2026-04-01', 60, 5), liftSet(1, '2026-04-01', 60, 5),
      liftSet(1, '2026-04-07', 61, 5), liftSet(1, '2026-04-07', 61, 5), // ~+1.2 kg e1RM
    ];
    expect(deriveRecomp(flatWeeks(), sets, EXERCISES).render).toBe(false);
  });

  test('sets outside the weight window are ignored', () => {
    const sets = [
      liftSet(1, '2026-01-01', 60, 5), liftSet(1, '2026-01-01', 60, 5),
      liftSet(1, '2026-12-31', 90, 5), liftSet(1, '2026-12-31', 90, 5),
    ]; // big gain, but both dates are outside 2026-04-01..2026-04-08
    expect(deriveRecomp(flatWeeks(), sets, EXERCISES).render).toBe(false);
  });
});

describe('deriveRecomp — suppression & resilience', () => {
  test('suppressed (calm / open ED flag) → render: false regardless of data', () => {
    const history = flatWeeks({ 0: { body_fat: 20, waist: 86 }, 7: { body_fat: 18, waist: 83 } });
    expect(deriveRecomp(history, [], [], { suppressed: true }).render).toBe(false);
  });

  test('sparse weight history (< 3 readings) → render: false', () => {
    expect(deriveRecomp([{ metric_date: '2026-04-01', body_weight: 80, waist: 86 }], [], []).render).toBe(false);
  });

  test('null / empty / malformed input → render: false, never throws', () => {
    expect(deriveRecomp(null, null, null).render).toBe(false);
    expect(deriveRecomp([], [], []).render).toBe(false);
    expect(deriveRecomp([{ body_weight: NaN }, {}, { metric_date: 'x' }], [], []).render).toBe(false);
  });
});
