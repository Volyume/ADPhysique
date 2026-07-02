/**
 * B3 proactive plateau-break surfacing: behavioural tests for the pure
 * selection layer (plateauSurfacing.js) against the REAL detectPlateau engine.
 *
 * Pins what the Home banner must never do:
 *  - claim a plateau on a progressing lift, on thin history (<3 sessions), or
 *    on a lift the user has stopped training (stale > 14 days);
 *  - surface more than one lift (deterministic pick: longest stall, then the
 *    most-trained lift, then the most recently trained);
 *  - drift the copy: the line is the exact calm sentence, singular/plural
 *    correct, no em dash (COACHING_VOICE_SYNTHESIS_LOCKED).
 */
import { selectPlateauForBanner, plateauBannerLine, PLATEAU_MAX_STALENESS_MS } from '../plateauSurfacing';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_780_000_000_000;

function mkSet(exerciseId, workoutId, weight, reps, createdAt) {
  return { exerciseId, workoutId, weight, actualReps: reps, setType: 'straight', createdAt };
}

// n sessions, newest at NOW - 1 day, spaced weekly, setsPerSession identical
// sets at `weight` x `reps` (a flat run = a plateau to the engine).
function flatSessions(exerciseId, n, { weight = 100, reps = 8, setsPerSession = 3, spacingDays = 7 } = {}) {
  const sets = [];
  for (let i = 0; i < n; i++) {
    const at = NOW - DAY - i * spacingDays * DAY;
    for (let j = 0; j < setsPerSession; j++) {
      sets.push(mkSet(exerciseId, `${exerciseId}_w${i}`, weight, reps, at));
    }
  }
  return sets;
}

describe('selectPlateauForBanner', () => {
  test('flat weekly sessions surface the plateau with the honest week span', () => {
    const picked = selectPlateauForBanner(flatSessions('ex_bench', 4), { now: NOW });
    expect(picked).not.toBeNull();
    expect(picked.exerciseId).toBe('ex_bench');
    expect(picked.consecutiveStalls).toBe(3);
    // 4 weekly sessions: the stalled run spans 21 days -> 3 weeks.
    expect(picked.weeks).toBe(3);
    expect(picked.latestSessionAt).toBe(NOW - DAY);
  });

  test('a progressing lift is never flagged', () => {
    const sets = [];
    for (let i = 0; i < 4; i++) {
      const at = NOW - DAY - i * 7 * DAY;
      // Newest-heaviest: load climbs 2.5 per session.
      sets.push(mkSet('ex_squat', `w${i}`, 100 - i * 2.5, 8, at));
    }
    expect(selectPlateauForBanner(sets, { now: NOW })).toBeNull();
  });

  test('fewer than 3 sessions is not a plateau', () => {
    expect(selectPlateauForBanner(flatSessions('ex_row', 2), { now: NOW })).toBeNull();
  });

  test('a lift not trained in a fortnight is dropped, not plateaued', () => {
    // Newest session 20 days ago: flat run, but stale.
    const sets = flatSessions('ex_ohp', 4).map(s => ({ ...s, createdAt: s.createdAt - 19 * DAY }));
    expect(selectPlateauForBanner(sets, { now: NOW })).toBeNull();
    expect(PLATEAU_MAX_STALENESS_MS).toBe(14 * DAY);
  });

  test('one banner only: the longest stall wins', () => {
    const sets = [
      ...flatSessions('ex_three_stalls', 4),
      ...flatSessions('ex_two_stalls', 3),
    ];
    expect(selectPlateauForBanner(sets, { now: NOW }).exerciseId).toBe('ex_three_stalls');
  });

  test('stall tie breaks to the most-trained lift', () => {
    const sets = [
      ...flatSessions('ex_main_lift', 4, { setsPerSession: 4 }),
      ...flatSessions('ex_accessory', 4, { setsPerSession: 2 }),
    ];
    expect(selectPlateauForBanner(sets, { now: NOW }).exerciseId).toBe('ex_main_lift');
  });

  test('a dense stalled run inside one week reports 1 week, never 0', () => {
    const picked = selectPlateauForBanner(
      flatSessions('ex_curl', 3, { spacingDays: 2 }),
      { now: NOW },
    );
    expect(picked).not.toBeNull();
    expect(picked.weeks).toBe(1);
  });

  test('snake_case rows are tolerated (algorithms.js convention)', () => {
    const sets = [];
    for (let i = 0; i < 4; i++) {
      const at = NOW - DAY - i * 7 * DAY;
      sets.push({ exercise_id: 'ex_snake', workout_id: `w${i}`, weight: 80, actual_reps: 10, created_at: at });
    }
    const picked = selectPlateauForBanner(sets, { now: NOW });
    expect(picked?.exerciseId).toBe('ex_snake');
  });

  test('empty or malformed input returns null, never throws', () => {
    expect(selectPlateauForBanner([], { now: NOW })).toBeNull();
    expect(selectPlateauForBanner(undefined, { now: NOW })).toBeNull();
    expect(selectPlateauForBanner([null, { weight: 100 }], { now: NOW })).toBeNull();
  });
});

describe('plateauBannerLine', () => {
  test('the exact calm sentence, pluralised', () => {
    expect(plateauBannerLine('Bench Press', 3))
      .toBe('Bench Press has plateaued for 3 weeks. Tap for a way through.');
  });

  test('singular week', () => {
    expect(plateauBannerLine('Seated Row', 1))
      .toBe('Seated Row has plateaued for 1 week. Tap for a way through.');
  });

  test('no em dash, and a broken weeks value never renders below 1', () => {
    const line = plateauBannerLine('Deadlift', 0);
    expect(line).toBe('Deadlift has plateaued for 1 week. Tap for a way through.');
    expect(line).not.toContain('—');
  });
});
