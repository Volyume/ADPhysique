/**
 * blockWeekProgress.test.js
 *
 * Pins the fix for progress-tab audit 2026-09-24 finding F2 (register D199):
 * `BlockProgressCard` needs `[{ muscle, label, planned, actual }]` and used
 * to be fed the RAW `planned_muscle_volume` rows instead, which rendered
 * empty bars and a bare "/" for every muscle on the Consistency screen.
 *
 * `blockWeekSpan` pins the block-week ruling: the plan row belongs to a
 * BLOCK week (block start date + 7-day local-calendar steps), never a
 * Monday-anchored or rolling window, and the span must still land on local
 * midnight either side of a UK clock change rather than drifting by the DST
 * hour.
 *
 * `buildBlockProgressRows` pins the mapper both surfaces (Consistency via
 * useProgressData, Home) now share, so the two cards can never again
 * disagree about what "planned"/"actual"/"label" mean for the same muscle.
 */
import { blockWeekSpan, buildBlockProgressRows } from '../blockWeekProgress';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

describe('blockWeekSpan', () => {
  // 7 Jan 2026 is a Wednesday.
  const WED_START = new Date(2026, 0, 7).getTime();

  test('week 1 of a Wednesday-started block spans that Wednesday 00:00 local to the next Wednesday 00:00 local', () => {
    const span = blockWeekSpan(WED_START, 1);
    expect(span.startMs).toBe(new Date(2026, 0, 7, 0, 0, 0, 0).getTime());
    expect(span.endMs).toBe(new Date(2026, 0, 14, 0, 0, 0, 0).getTime());
    // Both bounds are exactly local midnight.
    expect(new Date(span.startMs).getHours()).toBe(0);
    expect(new Date(span.endMs).getHours()).toBe(0);
  });

  test('week 3 starts 14 days after the block start (2 full block weeks later), still Wednesday to Wednesday', () => {
    const span = blockWeekSpan(WED_START, 3);
    expect(span.startMs).toBe(new Date(2026, 0, 21, 0, 0, 0, 0).getTime());
    expect(span.endMs).toBe(new Date(2026, 0, 28, 0, 0, 0, 0).getTime());
    expect(span.startMs - WED_START).toBe(14 * DAY_MS);
  });

  test('a block start given with a time-of-day component is normalised to local midnight before stepping', () => {
    const noonStart = new Date(2026, 0, 7, 13, 45, 0).getTime();
    const span = blockWeekSpan(noonStart, 1);
    expect(span.startMs).toBe(new Date(2026, 0, 7, 0, 0, 0, 0).getTime());
  });

  // The UK clock goes back (BST -> GMT) at 2am on the last Sunday of October;
  // in 2026 that is 2026-10-25. A block week whose span contains that day is
  // 169 real hours (7 * 24 + 1), never the fixed 168-hour (7 * DAY_MS) step a
  // raw-millisecond span would have used, and both bounds must still be
  // exactly local midnight rather than an hour off either side of the change.
  test('a span crossing the 2026-10-25 UK clock change is still 7 LOCAL days, both bounds at local midnight', () => {
    const start = new Date(2026, 9, 21).getTime(); // Wed 21 Oct 2026
    const span = blockWeekSpan(start, 1);
    expect(span.startMs).toBe(new Date(2026, 9, 21, 0, 0, 0, 0).getTime());
    expect(span.endMs).toBe(new Date(2026, 9, 28, 0, 0, 0, 0).getTime());
    expect(new Date(span.startMs).getHours()).toBe(0);
    expect(new Date(span.endMs).getHours()).toBe(0);
    // The defining proof: this week is NOT 7 * DAY_MS of real time (it is an
    // hour longer, because the clocks went back inside it), yet both bounds
    // are still exactly local midnight.
    expect(span.endMs - span.startMs).toBe(7 * DAY_MS + HOUR_MS);
    expect(span.endMs - span.startMs).not.toBe(7 * DAY_MS);
  });

  test.each([
    ['blockStartMs is NaN', NaN, 1],
    ['blockStartMs is undefined', undefined, 1],
    ['weekIndex is 0', WED_START, 0],
    ['weekIndex is negative', WED_START, -1],
    ['weekIndex is NaN', WED_START, NaN],
    ['weekIndex is undefined', WED_START, undefined],
  ])('invalid input (%s) returns null', (_label, start, weekIndex) => {
    expect(blockWeekSpan(start, weekIndex)).toBeNull();
  });
});

describe('buildBlockProgressRows', () => {
  test('maps a raw planned_muscle_volume row plus an actual-volume map onto the card contract', () => {
    const rows = buildBlockProgressRows(
      [{ id: 'pmv1', mesocycle_week_id: 'w1', muscle: 'chest', planned_sets: 12, mev: 8, mav: 14, mrv: 20, source: 'template' }],
      { chest: { workingSets: 8, reps: 80, tonnage: 800 } },
    );
    expect(rows).toEqual([{ muscle: 'chest', label: 'Chest', planned: 12, actual: 8 }]);
  });

  test('accepts already-camelCased plannedSets too', () => {
    const rows = buildBlockProgressRows(
      [{ muscle: 'back', plannedSets: 10 }],
      { back: { workingSets: 4 } },
    );
    expect(rows).toEqual([{ muscle: 'back', label: 'Back', planned: 10, actual: 4 }]);
  });

  test('filters out rows with no planned sets (zero, missing, or negative)', () => {
    const rows = buildBlockProgressRows(
      [
        { muscle: 'chest', planned_sets: 12 },
        { muscle: 'neck', planned_sets: 0 },
        { muscle: 'traps', planned_sets: -2 },
        { muscle: 'abs' }, // neither field present
      ],
      {},
    );
    expect(rows.map((r) => r.muscle)).toEqual(['chest']);
  });

  test('falls back to the raw muscle key as the label when it has no display name', () => {
    const rows = buildBlockProgressRows(
      [{ muscle: 'obliques', planned_sets: 6 }],
      {},
    );
    expect(rows[0].label).toBe('obliques');
  });

  test('actual is rounded, including fractional secondary-muscle contributions (0.5 per set)', () => {
    // Two working sets of an exercise whose secondary contribution to
    // glutes is 0.5 each -> 1.0 exactly.
    const exact = buildBlockProgressRows(
      [{ muscle: 'glutes', planned_sets: 10 }],
      { glutes: { workingSets: 1.0 } },
    );
    expect(exact[0].actual).toBe(1);

    // One working set at the same 0.5 contribution -> 0.5, rounds up to 1.
    const roundsUp = buildBlockProgressRows(
      [{ muscle: 'glutes', planned_sets: 10 }],
      { glutes: { workingSets: 0.5 } },
    );
    expect(roundsUp[0].actual).toBe(1);

    // 1.4 rounds down to 1 (proves this is real rounding, not a ceiling).
    const roundsDown = buildBlockProgressRows(
      [{ muscle: 'glutes', planned_sets: 10 }],
      { glutes: { workingSets: 1.4 } },
    );
    expect(roundsDown[0].actual).toBe(1);
  });

  test('a muscle with a planned target but zero logged sets still renders real numbers on both sides (never a bare "/")', () => {
    const rows = buildBlockProgressRows([{ muscle: 'calves', planned_sets: 10 }], {});
    expect(rows[0].actual).toBe(0);
    expect(rows[0].planned).toBe(10);
  });

  test('sorted by planned sets descending, muscle key ascending as the tie-break', () => {
    const rows = buildBlockProgressRows(
      [
        { muscle: 'triceps', planned_sets: 10 },
        { muscle: 'chest', planned_sets: 14 },
        { muscle: 'biceps', planned_sets: 10 },
      ],
      {},
    );
    expect(rows.map((r) => r.muscle)).toEqual(['chest', 'biceps', 'triceps']);
  });

  test('limit slices to the top N by planned sets after sorting', () => {
    const rows = buildBlockProgressRows(
      [
        { muscle: 'chest', planned_sets: 14 },
        { muscle: 'back', planned_sets: 12 },
        { muscle: 'quads', planned_sets: 10 },
      ],
      {},
      { limit: 2 },
    );
    expect(rows.map((r) => r.muscle)).toEqual(['chest', 'back']);
  });

  test('omitting limit returns every row with planned sets (the Consistency ruling: show every planned muscle)', () => {
    const rows = buildBlockProgressRows(
      Array.from({ length: 12 }, (_, i) => ({ muscle: `m${i}`, planned_sets: i + 1 })),
      {},
    );
    expect(rows).toHaveLength(12);
  });

  test('every row satisfies BlockProgressCard\'s contract keys exactly', () => {
    const rows = buildBlockProgressRows(
      [{ muscle: 'chest', planned_sets: 12 }],
      { chest: { workingSets: 8 } },
    );
    expect(Object.keys(rows[0]).sort()).toEqual(['actual', 'label', 'muscle', 'planned']);
  });

  test('non-array plannedRows and a missing actualByMuscle are handled without throwing', () => {
    expect(buildBlockProgressRows(null, undefined)).toEqual([]);
    expect(buildBlockProgressRows(undefined)).toEqual([]);
  });
});
