/**
 * campaign10a.safetyEvidence.test.js
 *
 * Campaign 10A feeds EXISTING safety laws the correct evidence. Nothing
 * here may move a threshold or a formula, and these tests pin that as
 * hard as they pin the behaviour changes:
 *
 *   R-18   the FFM floor reads the freshest legitimate weight, not the
 *          enrolment weight it was pinned to for ever
 *   RB6-2  the rapid-loss rate is per WEEK, so a months-long gap is no
 *          longer read as though both weights were taken a week apart
 */
import {
  resolveFfmFloorWeightKg, computeFFMFloor, FFM_FLOOR_KCAL_PER_KG, kcalFloorForSex,
} from '../nutritionEngine';
import {
  computeWeeklyTrendPct, weeklyComparatorMs, elapsedWeeksSinceComparator,
} from '../weeklyCoach';

const DAY = 86400000;
const NOW = new Date('2026-08-12T09:00:00Z').getTime();

/** A weigh-in series ending today, with the FIRST reading `gapDays` back. */
function series({ from, to, gapDays }) {
  // Four readings: three clustered at the start, one today. The comparator
  // is therefore the newest of the old cluster.
  return [
    { weightKg: from, loggedAt: NOW - gapDays * DAY },
    { weightKg: from, loggedAt: NOW - (gapDays - 1) * DAY },
    { weightKg: from, loggedAt: NOW - (gapDays - 2) * DAY },
    { weightKg: to, loggedAt: NOW },
  ];
}

// ─── R-18 ────────────────────────────────────────────────────────────────────

describe('R-18: the FFM floor reads the freshest legitimate weight', () => {
  test('a user with only an enrolment weight still gets floor protection', () => {
    expect(resolveFfmFloorWeightKg({ profileWeightKg: 90 })).toBe(90);
  });

  test('a newer valid weigh-in outranks the enrolment weight', () => {
    // This is the whole defect: profile weight used to win for ever.
    expect(resolveFfmFloorWeightKg({ profileWeightKg: 90, ewmaTodayKg: 84 })).toBe(84);
    expect(resolveFfmFloorWeightKg({ profileWeightKg: 90, lastWeighInKg: 84 })).toBe(84);
  });

  test('the smoothed EWMA is preferred over a single raw reading', () => {
    expect(resolveFfmFloorWeightKg({ profileWeightKg: 90, ewmaTodayKg: 84, lastWeighInKg: 83 })).toBe(84);
  });

  test('a deleted or unusable newest entry cannot become the floor input', () => {
    // getMorningWeights excludes tombstones and computeEWMA drops
    // non-positive values, so those arrive here as null/0 - never as a
    // weight. The resolver must then fall through, not fail open.
    expect(resolveFfmFloorWeightKg({ profileWeightKg: 90, ewmaTodayKg: null, lastWeighInKg: null })).toBe(90);
    expect(resolveFfmFloorWeightKg({ profileWeightKg: 90, ewmaTodayKg: 0 })).toBe(90);
    expect(resolveFfmFloorWeightKg({ profileWeightKg: 90, ewmaTodayKg: -5 })).toBe(90);
    expect(resolveFfmFloorWeightKg({ profileWeightKg: 90, ewmaTodayKg: NaN })).toBe(90);
  });

  test('no legitimate weight anywhere returns null, so the caller holds', () => {
    expect(resolveFfmFloorWeightKg({})).toBeNull();
    expect(resolveFfmFloorWeightKg({ profileWeightKg: 0, ewmaTodayKg: null })).toBeNull();
  });

  // THE THRESHOLD ITSELF IS UNTOUCHED.
  test('the FFM floor formula and threshold are unchanged', () => {
    expect(FFM_FLOOR_KCAL_PER_KG).toBe(30);
    const out = computeFFMFloor(80, { bodyFatPercent: 15, bodyFatSource: 'dexa', sex: 'male' });
    expect(out.ffmKg).toBe(68);
    expect(out.floorKcal).toBe(68 * 30);
    expect(out.source).toBe('katch_mcardle');
  });

  test('the sex-aware calorie floors are unchanged', () => {
    expect(kcalFloorForSex('male')).toBe(1500);
    expect(kcalFloorForSex('female')).toBe(1200);
    expect(kcalFloorForSex(null)).toBe(1500);
  });
});

// ─── RB6-2 ───────────────────────────────────────────────────────────────────

describe('RB6-2: the rapid-loss rate is per week, across any gap', () => {
  test('a normal 7-day comparison is completely unchanged', () => {
    const s = series({ from: 80, to: 78.8, gapDays: 9 });
    const pct = computeWeeklyTrendPct(s, 80, NOW);
    // ~1.5%/week loss over roughly a week: still reads as roughly -1.5.
    expect(pct).toBeLessThan(0);
    expect(pct).toBeGreaterThan(-2.2);
  });

  test('a 180-day gap is no longer read as one catastrophic week', () => {
    // 6% lost across 180 days is about -0.23%/week: not rapid loss.
    const s = series({ from: 80, to: 75.2, gapDays: 180 });
    const pct = computeWeeklyTrendPct(s, 80, NOW);
    expect(pct).toBeGreaterThan(-1.5);   // below the rapid-loss line
    expect(pct).toBeLessThan(0);         // but the loss is NOT discarded
  });

  test('a 90-day gap likewise', () => {
    const s = series({ from: 80, to: 76, gapDays: 90 });
    const pct = computeWeeklyTrendPct(s, 80, NOW);
    expect(pct).toBeGreaterThan(-1.5);
    expect(pct).toBeLessThan(0);
  });

  // FALSE-NEGATIVE GUARD: normalising must not be able to hide a genuinely
  // rapid loss. A large loss over a SHORT span still trips the line.
  test('a genuinely rapid loss still trips the threshold', () => {
    // What real rapid loss looks like to the engine: a SUSTAINED daily
    // decline. The comparator here is seven days old, so the divisor is 1
    // and this path is byte-for-byte what it was before the change.
    const daily = [];
    for (let i = 13; i >= 0; i--) daily.push({ weightKg: 80 - (13 - i) * 0.35, loggedAt: NOW - i * DAY });
    expect(weeklyComparatorMs(daily, NOW)).toBe(NOW - 7 * DAY);
    expect(elapsedWeeksSinceComparator(weeklyComparatorMs(daily, NOW), NOW)).toBe(1);
    expect(computeWeeklyTrendPct(daily, 80, NOW)).toBeLessThanOrEqual(-1.5);
  });

  test('a single low reading does not trip it - unchanged EWMA damping', () => {
    // Pre-existing behaviour, deliberately: alpha 0.1 damps one-off
    // readings so water weight cannot fire a safety flag. Pinned here so
    // the normalisation is never blamed for it.
    const s = series({ from: 80, to: 77.5, gapDays: 9 });
    expect(elapsedWeeksSinceComparator(weeklyComparatorMs(s, NOW), NOW)).toBe(1);
    expect(computeWeeklyTrendPct(s, 80, NOW)).toBeGreaterThan(-1.5);
  });

  test('and a huge loss over a long gap still reports loss, never zero', () => {
    // 25% across 200 days is ~0.9%/week - real, sustained, and still
    // visible to every downstream consumer as a loss.
    const s = series({ from: 100, to: 75, gapDays: 200 });
    const pct = computeWeeklyTrendPct(s, 100, NOW);
    expect(pct).toBeLessThan(0);
  });

  test('elapsed weeks are floored at 1 so a 7-day comparator behaves as before', () => {
    expect(elapsedWeeksSinceComparator(NOW - 7 * DAY, NOW)).toBe(1);
    expect(elapsedWeeksSinceComparator(NOW - 3 * DAY, NOW)).toBe(1);
    expect(elapsedWeeksSinceComparator(NOW - 14 * DAY, NOW)).toBe(2);
    expect(elapsedWeeksSinceComparator(NOW - 70 * DAY, NOW)).toBe(10);
  });

  test('the comparator is the newest point at or before seven days ago', () => {
    const s = series({ from: 80, to: 78, gapDays: 30 });
    expect(weeklyComparatorMs(s, NOW)).toBe(NOW - 28 * DAY);
  });

  test('unusable comparators degrade to null rather than a wrong divisor', () => {
    expect(elapsedWeeksSinceComparator(null, NOW)).toBeNull();
    expect(elapsedWeeksSinceComparator(NaN, NOW)).toBeNull();
    expect(elapsedWeeksSinceComparator(NOW + DAY, NOW)).toBeNull();
    expect(weeklyComparatorMs([], NOW)).toBeNull();
    expect(weeklyComparatorMs(null, NOW)).toBeNull();
  });

  // Review Q10: sync and reinstall can deliver rows in any order.
  test('out-of-order rows cannot make a stale comparator look recent', () => {
    const s = series({ from: 80, to: 75.2, gapDays: 180 });
    const shuffled = [s[3], s[0], s[2], s[1]];
    expect(weeklyComparatorMs(shuffled, NOW)).toBe(weeklyComparatorMs(s, NOW));
    expect(computeWeeklyTrendPct(shuffled, 80, NOW)).toBeCloseTo(computeWeeklyTrendPct(s, 80, NOW), 6);
  });

  // Review Q2: one comparator helper serves both the ED detector and the
  // rapid-loss flag, so the same weigh-ins cannot yield two different rates.
  test('both safety consumers derive the span from the same helper', () => {
    const src = require('fs').readFileSync(require('path').resolve(__dirname, '../weeklyCoach.js'), 'utf8');
    expect((src.match(/weeklyComparatorMs\(morningWeights, nowMs\)/g) ?? []).length).toBe(2);
  });

  test('too few readings still returns null, as before', () => {
    expect(computeWeeklyTrendPct([{ weightKg: 80, loggedAt: NOW }], 80, NOW)).toBeNull();
    expect(computeWeeklyTrendPct(null, 80, NOW)).toBeNull();
  });
});

// ─── The thresholds nobody may move ──────────────────────────────────────────

describe('no safety threshold or law was altered', () => {
  const read = (p) => require('fs').readFileSync(require('path').resolve(__dirname, '../', p), 'utf8');

  test('the rapid-loss line is still -1.5% per week', () => {
    const src = read('weeklyCoach.js');
    expect(src).toMatch(/actualRatePct <= -1\.5/);
  });

  test('the max-safe-loss and FFM constants are untouched', () => {
    const src = read('nutritionEngine.js');
    expect(src).toMatch(/FFM_FLOOR_KCAL_PER_KG = 30/);
    expect(src).toMatch(/EA_CAUTION_KCAL_PER_KG = \{ male: 35, female: 40 \}/);
  });

  test('safety stays tier-blind: the resolver takes no tier and reads none', () => {
    const src = read('nutritionEngine.js');
    const fn = src.slice(src.indexOf('export function resolveFfmFloorWeightKg'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    expect(body).not.toMatch(/tier|isPro|proGate/i);
  });
});
