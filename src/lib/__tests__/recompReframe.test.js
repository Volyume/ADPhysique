/**
 * ULTIMATE-RECOMP-01 — recomposition reframe (pure derivation).
 *
 * RE-ANCHORED D214 addendum 4 (Body metrics, lane 7; spec docs/audit/
 * progress-recovery-consistency-audit-2026-10-01/04-BODY-METRICS-AUDIT-AND-SPEC.md
 * section 3 item 6, section 6 table: `recompReframe`). The weight-flat gate
 * used to be "|slope| <= 0.15 kg PER ENTRY over the last eight entries",
 * which said "Weight steady." beside "Losing weight" for someone falling
 * 0.7 kg a week (BM-10). It is now the ONE steady rule every display surface
 * reads, weightTrend.STEADY_RATE_KG_PER_WEEK (0.2 kg a week), applied to the
 * trend's rate over the last six weeks, on the same evidence as every
 * direction word (7 weigh-ins over 7 days). The unchanged pins: composition
 * movement thresholds (BF >= 0.5pp OR site >= 1.0cm), the strength gate (e1RM
 * up >= 2.5 kg), calm/ED suppression, render-nothing fallbacks, and the share
 * card's privacy gate. New pins: the estimated lift gain in both units
 * (BM-11), body fat in percentage POINTS (BM-30), every change dated.
 */
import { deriveRecomp, buildRecompShareParams, recompLines, STEADY_WINDOW_DAYS } from '../recompReframe';
import { STEADY_RATE_KG_PER_WEEK } from '../weightTrend';
import { localDayKey } from '../dayKey';

const DAY = 86400000;
const NOW = new Date(2026, 5, 10, 12).getTime(); // 10 Jun 2026, local noon
const dayKeyAgo = (n) => localDayKey(NOW - n * DAY);

// A daily series over `days` days ending today at `slopePerWeek` kg a week
// around 80 kg, with a small alternating wobble (so it is a real series).
function series(days, slopePerWeek = 0, extra = {}) {
  return Array.from({ length: days + 1 }, (_, i) => {
    const ago = days - i;
    return {
      metric_date: dayKeyAgo(ago),
      body_weight: 80 + ((i - days) / 7) * slopePerWeek + (i % 2 === 0 ? 0.1 : -0.1),
      ...(extra[ago] || {}),
    };
  });
}
// Flat for six weeks, with readings at the start (42 days back) and today.
const flatSix = (extra = {}) => series(42, 0, extra);

// A completed set of an exercise on a date, weight x reps -> e1RM.
function liftSet(exerciseId, dateKey, weight, reps) {
  return {
    exerciseId, workoutId: `${exerciseId}-${dateKey}`,
    createdAt: new Date(`${dateKey}T10:00:00`).getTime(),
    weight, actualReps: reps, setType: 'working',
  };
}
const EXERCISES = [{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Back Squat' }];
const derive = (history, sets = [], exercises = [], opts = {}) => deriveRecomp(history, sets, exercises, { nowMs: NOW, ...opts });

describe('deriveRecomp: the one steady rule over the last six weeks (BM-10)', () => {
  test('the window is six weeks and the rule is the shared constant', () => {
    expect(STEADY_WINDOW_DAYS).toBe(42);
    expect(STEADY_RATE_KG_PER_WEEK).toBe(0.2);
  });

  test('steady weight + body fat down + waist down -> renders, over the weeks the weigh-ins span', () => {
    const history = flatSix({
      42: { body_fat: 20, waist: 86 },
      0: { body_fat: 18.5, waist: 83.5 },
    });
    const vm = derive(history);
    expect(vm.render).toBe(true);
    expect(vm.weeks).toBe(6);
    expect(vm.bodyFat).toEqual({ deltaPP: -1.5, fromKey: dayKeyAgo(42) });
    expect(vm.measurement).toEqual({ label: 'Waist', deltaCm: -2.5, fromKey: dayKeyAgo(42) });
  });

  test('BM-10: a loss of 0.7 kg a week is never "Weight steady", whatever else moved', () => {
    const losing = series(42, -0.7, { 42: { waist: 90 }, 0: { waist: 84 } });
    expect(derive(losing).render).toBe(false);
  });

  test('the boundary is the shared rate: inside 0.2 kg a week renders, outside does not', () => {
    const withWaist = { 42: { waist: 86 }, 0: { waist: 83 } };
    expect(derive(series(42, -0.1, withWaist)).render).toBe(true);
    expect(derive(series(42, 0.1, withWaist)).render).toBe(true);
    expect(derive(series(42, -0.35, withWaist)).render).toBe(false);
    expect(derive(series(42, 0.35, withWaist)).render).toBe(false);
  });

  test('the same evidence as every direction word: 7 weigh-ins over 7 days', () => {
    const waist = { 20: { waist: 86 }, 0: { waist: 83 } };
    // six weigh-ins in six weeks is too few
    const sparse = [41, 30, 20, 10, 3, 0].map((ago) => ({
      metric_date: dayKeyAgo(ago), body_weight: 80, ...(waist[ago] || {}),
    }));
    expect(derive(sparse).render).toBe(false);
    // seven weigh-ins inside two days is too short
    const short = Array.from({ length: 7 }, (_, i) => ({
      metric_date: dayKeyAgo(i === 0 ? 0 : 1), body_weight: 80, ...(i === 0 ? { waist: 83 } : { waist: 86 }),
    }));
    expect(derive(short).render).toBe(false);
  });

  test('weigh-ins older than six weeks are not read', () => {
    const old = series(70, 0, {}).map((e, i) => ({ ...e, ...(i === 0 ? { waist: 90 } : {}), ...(i === 70 ? { waist: 80 } : {}) }));
    // The waist reading 70 days back is outside the window: no site moved inside it.
    expect(derive(old).render).toBe(false);
  });

  test('flat weight but nothing moved -> render: false', () => {
    expect(derive(flatSix()).render).toBe(false);
  });

  test('the span is said as it is: a fortnight of weigh-ins says two weeks, not six', () => {
    const history = series(14, 0, { 14: { waist: 86 }, 0: { waist: 83 } });
    const vm = derive(history);
    expect(vm.render).toBe(true);
    expect(vm.weeks).toBe(2);
  });
});

describe('deriveRecomp: movement thresholds (NA-coaching-3, unchanged)', () => {
  test('body fat must move >= 0.5pp', () => {
    expect(derive(flatSix({ 42: { body_fat: 20 }, 0: { body_fat: 19.6 } })).render).toBe(false); // 0.4pp
    const at = derive(flatSix({ 42: { body_fat: 20 }, 0: { body_fat: 19.5 } }));                // 0.5pp
    expect(at.bodyFat).toEqual({ deltaPP: -0.5, fromKey: dayKeyAgo(42) });
  });

  test('a site must move >= 1.0cm', () => {
    expect(derive(flatSix({ 42: { arms: 38 }, 0: { arms: 38.9 } })).render).toBe(false); // 0.9cm
    const at = derive(flatSix({ 42: { arms: 38 }, 0: { arms: 39 } }));                   // 1.0cm
    expect(at.measurement).toEqual({ label: 'Arms', deltaCm: 1, fromKey: dayKeyAgo(42) });
  });

  test('picks the single most-changed site', () => {
    const history = flatSix({
      42: { waist: 86, arms: 38 },
      0: { waist: 84.5, arms: 40 }, // waist -1.5, arms +2.0 -> arms wins
    });
    expect(derive(history).measurement).toEqual({ label: 'Arms', deltaCm: 2, fromKey: dayKeyAgo(42) });
  });
});

describe('deriveRecomp: strength stream (NA-coaching-2)', () => {
  const liftGain = () => [
    ...[0, 1].map(() => liftSet(1, dayKeyAgo(40), 60, 5)),  // e1RM ~70
    ...[0, 1].map(() => liftSet(1, dayKeyAgo(3), 70, 5)),   // e1RM ~81.7
  ];

  test('a lift up >= 2.5 kg e1RM warrants the reframe on its own, held in both units', () => {
    const vm = derive(flatSix(), liftGain(), EXERCISES);
    expect(vm.render).toBe(true);
    expect(vm.lift.name).toBe('Bench Press');
    expect(vm.lift.deltaKg).toBeGreaterThanOrEqual(3);
    // pounds come from the unrounded gain, so they sit within the rounding of the whole kilograms
    expect(vm.lift.deltaLb).toBeGreaterThanOrEqual(Math.floor((vm.lift.deltaKg - 0.5) * 2.2046));
    expect(vm.lift.deltaLb).toBeLessThanOrEqual(Math.ceil((vm.lift.deltaKg + 0.5) * 2.2046));
  });

  test('a sub-2.5 kg lift gain does not warrant on its own', () => {
    const sets = [
      liftSet(1, dayKeyAgo(40), 60, 5), liftSet(1, dayKeyAgo(40), 60, 5),
      liftSet(1, dayKeyAgo(3), 61, 5), liftSet(1, dayKeyAgo(3), 61, 5), // ~+1.2 kg e1RM
    ];
    expect(derive(flatSix(), sets, EXERCISES).render).toBe(false);
  });

  test('sets outside the window are ignored', () => {
    const sets = [
      liftSet(1, dayKeyAgo(200), 60, 5), liftSet(1, dayKeyAgo(200), 60, 5),
      liftSet(1, dayKeyAgo(3), 90, 5), liftSet(1, dayKeyAgo(3), 90, 5),
    ]; // the earlier session is outside the six weeks, so there is one session in the window: no gain
    expect(derive(flatSix(), sets, EXERCISES).render).toBe(false);
  });
});

describe('deriveRecomp: suppression and resilience', () => {
  test('suppressed (calm / open ED flag) -> render: false regardless of data', () => {
    const history = flatSix({ 42: { body_fat: 20, waist: 86 }, 0: { body_fat: 18, waist: 83 } });
    expect(derive(history, [], [], { suppressed: true }).render).toBe(false);
  });

  test('sparse weight history (< 7 readings) -> render: false', () => {
    expect(derive([{ metric_date: dayKeyAgo(0), body_weight: 80, waist: 86 }]).render).toBe(false);
  });

  test('null / empty / malformed input -> render: false, never throws', () => {
    expect(deriveRecomp(null, null, null).render).toBe(false);
    expect(deriveRecomp([], [], []).render).toBe(false);
    expect(derive([{ body_weight: NaN }, {}, { metric_date: 'x' }]).render).toBe(false);
  });
});

describe('recompLines: the sentences, in the person\'s units (BM-11, BM-30)', () => {
  const vm = (over = {}) => ({
    render: true,
    weeks: 6,
    bodyFat: { deltaPP: -1, fromKey: '2026-08-03' },
    measurement: { label: 'Waist', deltaCm: -2, fromKey: '2026-08-03' },
    lift: { name: 'Barbell Bench Press', deltaKg: 6, deltaLb: 13 },
    ...over,
  });

  test('the spec sentence, kilograms first for a kilogram gym', () => {
    expect(recompLines(vm(), 'kg')).toEqual([
      'Weight steady over the last 6 weeks.',
      'Estimated one-rep max on Barbell Bench Press up 6 kg (13 lbs) over the same weeks.',
      'Body fat down 1 point since 3 Aug.',
      'Waist down 2 cm since 3 Aug.',
    ]);
  });

  test('a pounds gym reads pounds first and kilograms in brackets, never kilograms under "lbs"', () => {
    const lines = recompLines(vm(), 'lbs');
    expect(lines[1]).toBe('Estimated one-rep max on Barbell Bench Press up 13 lbs (6 kg) over the same weeks.');
  });

  test('the lift is an estimate and says so; body fat moves in points, not percent', () => {
    const text = recompLines(vm(), 'kg').join(' ');
    expect(text).toMatch(/Estimated one-rep max/);
    expect(text).not.toMatch(/Body fat (down|up) [\d.]+%/);
    expect(recompLines(vm({ bodyFat: { deltaPP: 1.5, fromKey: '2026-08-03' } }), 'kg')[2]).toBe('Body fat up 1.5 points since 3 Aug.');
  });

  test('only the streams that moved are said; one week is "week"', () => {
    expect(recompLines(vm({ bodyFat: null, measurement: null, lift: null, weeks: 1 }), 'kg')).toEqual([
      'Weight steady over the last week.',
    ]);
  });

  test('nothing for a card that does not render', () => {
    expect(recompLines({ render: false }, 'kg')).toEqual([]);
    expect(recompLines(null, 'kg')).toEqual([]);
  });

  test('no em dash, and no instruction to the athlete (D204)', () => {
    const text = recompLines(vm(), 'kg').join(' ');
    expect(text).not.toMatch(/—/);
    expect(text).not.toMatch(/\b(should|must|try to|aim|avoid)\b/i);
  });
});

// S4 (world-class audit 04a): "Make a card" extended to the recomposition
// insight. Pins the privacy gate: a share card is deliberately narrower than
// the on-screen reframe and must never carry a body fat or measurement delta,
// only the strength signal.
describe('buildRecompShareParams, share-card privacy gate (S4, "Make a card")', () => {
  const liftGainSets = [
    ...[0, 1].map(() => liftSet(1, dayKeyAgo(40), 60, 5)),
    ...[0, 1].map(() => liftSet(1, dayKeyAgo(3), 70, 5)),
  ];
  const shapeMovedHistory = flatSix({
    42: { body_fat: 20, waist: 86 },
    0: { body_fat: 18, waist: 83 },
  });

  test('not warranted (render: false) -> null', () => {
    const vm = derive(flatSix());
    expect(vm.render).toBe(false);
    expect(buildRecompShareParams(vm, 'kg')).toBeNull();
  });

  test('warranted by shape ALONE (no strength signal) -> null: never shares a body fat or measurement delta', () => {
    const vm = derive(shapeMovedHistory);
    expect(vm.render).toBe(true);
    expect(vm.lift).toBeNull();
    expect(buildRecompShareParams(vm, 'kg')).toBeNull();
  });

  test('warranted with a strength signal -> hero is the strength delta only, even when shape also moved', () => {
    const vm = derive(shapeMovedHistory, liftGainSets, EXERCISES);
    expect(vm.render).toBe(true);
    expect(vm.bodyFat).toBeTruthy(); // the on-screen card shows shape AND strength moving...
    const params = buildRecompShareParams(vm, 'kg');
    expect(params).not.toBeNull();
    expect(params.heroValue).toBe(String(vm.lift.deltaKg));
    expect(params.heroUnit).toBe('kg strength gained');
    expect(params.stats).toEqual([]); // ...but no per-field stat carries a body reading.
  });

  test('BM-11: a pounds user\'s card carries the pounds figure under its lbs label', () => {
    const vm = derive(flatSix(), liftGainSets, EXERCISES);
    const params = buildRecompShareParams(vm, 'lbs');
    expect(params.heroUnit).toBe('lbs strength gained');
    expect(params.heroValue).toBe(String(vm.lift.deltaLb));
    expect(params.heroValue).not.toBe(String(vm.lift.deltaKg));
  });

  test('the share params never carry a name, bodyweight, body fat or measurement field', () => {
    const vm = derive(shapeMovedHistory, liftGainSets, EXERCISES);
    const params = buildRecompShareParams(vm, 'kg');
    expect(Object.keys(params).sort()).toEqual(
      ['caption', 'date', 'eyebrow', 'heroUnit', 'heroValue', 'stats', 'title'].sort(),
    );
    const text = JSON.stringify(params);
    expect(text).not.toMatch(/waist|body fat|\bkg body|name/i);
  });
});
