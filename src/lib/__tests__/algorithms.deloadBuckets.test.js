/**
 * buildLast4WeekDeloadBuckets — Campaign 24 §2 (GLOBAL-COHERENCE-DECISIONS.md).
 *
 * What this suite pins and why:
 *  1. D6-correct default behaviour: unrated soreness/joint values are
 *     excluded from the average, never coerced to 0 (Campaign 1 P0-7 D6).
 *     A fixture with unrated values must produce these buckets, where the
 *     OLD CoachReviewScreen code (`w.soreness24hBefore || 0`) would instead
 *     have coerced them to zero -- pinned directly against that reproduced
 *     old arithmetic.
 *  2. Byte-identity for the two unchanged callers: useProgressData.js and
 *     HomeScreen.js. Each caller's OLD inline derivation (as it existed
 *     before this campaign, reproduced verbatim below as a reference
 *     oracle) is run against the same fixture as the new shared function
 *     with that caller's exact options; every bucket must match exactly.
 *     Multiple fixtures (varying week volume, warmups, incomplete
 *     workouts, unrated sessions, an untrained gap week) so the parity
 *     claim isn't resting on one lucky shape.
 *  3. CoachReviewScreen (D33 ruling): the non-corrected axes (avgReps,
 *     hasOverMRV, weeksSinceLastDeload) still match the OLD reference
 *     exactly; the corrected axes (avgSoreness/avgJointDiscomfort) DIFFER
 *     from the old coerced-to-zero reference whenever a bucket has an
 *     unrated session, and match a hand-rolled answered-only reference
 *     instead -- proving the correction is real, not accidental.
 */
import { buildLast4WeekDeloadBuckets, calculateWeeklyVolume, VOLUME_LANDMARKS } from '../algorithms';
import { startOfWeek } from 'date-fns/startOfWeek';

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const NOW = new Date('2026-08-17T10:00:00.000Z').getTime();

// ---------------------------------------------------------------------
// Reference oracles: the exact inline derivations each caller had before
// Campaign 24 §2, reproduced verbatim (not re-derived) so a mismatch here
// can only mean the extraction changed behaviour, not that the oracle
// itself is wrong.
// ---------------------------------------------------------------------

function oldUseProgressDataBuckets(sets, exMap, workouts, now) {
  const last4 = [];
  for (let wk = 3; wk >= 0; wk--) {
    const end = now - wk * WEEK;
    const start = end - WEEK;
    const wkSets = sets.filter(s => {
      const at = s.createdAt ?? s.created_at ?? 0;
      return at >= start && at < end;
    });
    const vol = calculateWeeklyVolume(wkSets, exMap);
    const hasOverMRV = Object.entries(vol).some(([muscle, data]) => {
      const lm = VOLUME_LANDMARKS[muscle];
      return lm && data.workingSets > lm.mrv;
    });
    const wkWorkouts = workouts.filter(w => {
      const at = w.startedAt ?? w.createdAt ?? 0;
      return at >= start && at < end && (w.isCompleted ?? w.is_completed);
    });
    const sorenessRated = wkWorkouts
      .map(w => w.soreness24hBefore ?? w.soreness_24h_before ?? null)
      .filter(v => v != null);
    const avgSoreness = sorenessRated.length
      ? sorenessRated.reduce((sum, v) => sum + v, 0) / sorenessRated.length
      : null;
    const jointRated = wkWorkouts
      .map(w => w.jointDiscomfort ?? w.joint_discomfort ?? null)
      .filter(v => v != null);
    const avgJointDiscomfort = jointRated.length
      ? jointRated.reduce((sum, v) => sum + v, 0) / jointRated.length
      : null;
    const avgReps = wkSets.length > 0
      ? wkSets.reduce((sum, s) => sum + (s.actualReps ?? s.actual_reps ?? 0), 0) / wkSets.length
      : 0;
    last4.push({ avgReps, avgSoreness, avgJointDiscomfort, hasOverMRV, weeksSinceLastDeload: 4 - wk });
  }
  const weeksSinceLighter = (() => {
    for (let wk = 1; wk <= 12; wk++) {
      const end = now - wk * WEEK;
      const start = end - WEEK;
      const wkSets = sets.filter(s => {
        const at = s.createdAt ?? 0;
        return at >= start && at < end;
      });
      if (wkSets.length === 0) return wk;
      const vol = calculateWeeklyVolume(wkSets, exMap);
      const totalSets = Object.values(vol).reduce((sum, v) => sum + v.workingSets, 0);
      if (totalSets < 15) return wk;
    }
    return 12;
  })();
  return last4.map((entry, i) => ({
    ...entry,
    weeksSinceLastDeload: weeksSinceLighter + (3 - i),
  }));
}

function oldHomeScreenBuckets(recentSets, allWorkouts, now) {
  return Array.from({ length: 4 }, (_, i) => {
    const weekStart = now - (i + 1) * WEEK;
    const weekEnd = now - i * WEEK;
    const weekWorkouts = allWorkouts.filter(
      w => w.isCompleted && w.startedAt >= weekStart && w.startedAt < weekEnd,
    );
    const wIds = new Set(weekWorkouts.map(w => w.id));
    const wSets = recentSets.filter(s => wIds.has(s.workoutId) && s.setType !== 'warmup');
    const totalReps = wSets.reduce((t, s) => t + (s.actualReps || 0), 0);
    const avgReps = wSets.length > 0 ? totalReps / wSets.length : 0;
    const jointRated = weekWorkouts
      .map(w => w.jointDiscomfort ?? w.joint_discomfort ?? null)
      .filter(v => v != null);
    const sorenessRated = weekWorkouts
      .map(w => w.soreness24hBefore ?? w.soreness_24h_before ?? null)
      .filter(v => v != null);
    return {
      avgReps,
      weeksSinceLastDeload: 99,
      avgJointDiscomfort: jointRated.length
        ? jointRated.reduce((s, v) => s + v, 0) / jointRated.length : null,
      hasOverMRV: false,
      avgSoreness: sorenessRated.length
        ? sorenessRated.reduce((s, v) => s + v, 0) / sorenessRated.length : null,
    };
  }).reverse();
}

function oldCoachReviewBuckets(allSets, allWorkouts, exerciseMap, weekStartMs, now) {
  const fourWeeksMs = 28 * DAY;
  const last4Workouts = allWorkouts
    .filter(w => w.isCompleted && (w.startedAt || 0) >= now - fourWeeksMs)
    .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
  const weeklyBuckets = [0, 1, 2, 3].map(offset => {
    const bucketStart = weekStartMs - (3 - offset) * WEEK;
    const bucketEnd = bucketStart + WEEK;
    const workoutsInWeek = last4Workouts.filter(
      w => (w.startedAt || 0) >= bucketStart && (w.startedAt || 0) < bucketEnd,
    );
    const setsInWeek = allSets.filter(
      s => (s.createdAt || 0) >= bucketStart && (s.createdAt || 0) < bucketEnd,
    );
    const weekVolume = calculateWeeklyVolume(setsInWeek, exerciseMap);
    const hasOverMRV = Object.entries(weekVolume).some(([muscle, data]) => {
      const landmarks = VOLUME_LANDMARKS[muscle];
      return landmarks && data.workingSets > landmarks.mrv;
    });
    const avgSoreness = workoutsInWeek.length > 0
      ? workoutsInWeek.reduce((s, w) => s + (w.soreness24hBefore || 0), 0) / workoutsInWeek.length
      : 0;
    const avgReps = setsInWeek.length > 0
      ? setsInWeek.reduce((s, set) => s + (set.actualReps || set.actual_reps || 0), 0) / setsInWeek.length
      : 0;
    const avgJointDiscomfort = workoutsInWeek.length > 0
      ? workoutsInWeek.reduce((s, w) => s + (w.jointDiscomfort || 0), 0) / workoutsInWeek.length
      : 0;
    return { avgSoreness, avgReps, hasOverMRV, avgJointDiscomfort };
  });
  const weeksSinceLighter = (() => {
    for (let wk = 1; wk <= 12; wk++) {
      const end = now - wk * WEEK;
      const start = end - WEEK;
      const wkSets = allSets.filter((s) => {
        const at = s.createdAt || 0;
        return at >= start && at < end;
      });
      const vol = calculateWeeklyVolume(wkSets, exerciseMap);
      const totalSets = Object.values(vol).reduce((sum, v) => sum + (v.workingSets || 0), 0);
      if (totalSets < 15) return wk;
    }
    return 12;
  })();
  return weeklyBuckets.map((b, i) => ({
    ...b,
    weeksSinceLastDeload: weeksSinceLighter + (3 - i),
  }));
}

// D6-correct reference: same shape as oldCoachReviewBuckets, but the
// soreness/joint averages are answered-only (never coerced to 0) -- what
// CoachReviewScreen's avgSoreness/avgJointDiscomfort SHOULD produce post-fix.
function d6CorrectCoachReviewSorenessJoint(allSets, allWorkouts, weekStartMs, now) {
  const fourWeeksMs = 28 * DAY;
  const last4Workouts = allWorkouts
    .filter(w => w.isCompleted && (w.startedAt || 0) >= now - fourWeeksMs)
    .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
  return [0, 1, 2, 3].map(offset => {
    const bucketStart = weekStartMs - (3 - offset) * WEEK;
    const bucketEnd = bucketStart + WEEK;
    const workoutsInWeek = last4Workouts.filter(
      w => (w.startedAt || 0) >= bucketStart && (w.startedAt || 0) < bucketEnd,
    );
    const sorenessRated = workoutsInWeek
      .map(w => w.soreness24hBefore ?? null)
      .filter(v => v != null);
    const jointRated = workoutsInWeek
      .map(w => w.jointDiscomfort ?? null)
      .filter(v => v != null);
    return {
      avgSoreness: sorenessRated.length
        ? sorenessRated.reduce((s, v) => s + v, 0) / sorenessRated.length : null,
      avgJointDiscomfort: jointRated.length
        ? jointRated.reduce((s, v) => s + v, 0) / jointRated.length : null,
    };
  });
}

// ---------------------------------------------------------------------
// Fixtures: deterministic, no Math.random. `seed` varies the shape (session
// counts, warmups, unrated/incomplete sessions, an occasional empty week)
// across weeks 0 (this week) to 11 (covers the 12-week lighter-week scan).
// wk=0 is always deliberately heavy, to exercise the hasOverMRV=true branch.
// ---------------------------------------------------------------------
function makeFixture(seed) {
  const exerciseMap = { ex1: { primaryMuscle: 'chest' } };
  const workouts = [];
  const sets = [];
  let sid = 0;
  for (let wk = 0; wk <= 11; wk++) {
    const h = (seed * 131 + wk * 977) % 17;
    if (wk !== 0 && h === 0) continue; // an untrained gap week (scan boundary)
    const sessions = wk === 0 ? 3 : 1 + (h % 3);
    for (let sIdx = 0; sIdx < sessions; sIdx++) {
      const workoutId = `wk${wk}_s${sIdx}_seed${seed}`;
      const startedAt = NOW - wk * WEEK - sIdx * DAY - 3600_000;
      const isCompleted = !((h + sIdx) % 7 === 0);
      const rated = (h + sIdx) % 4 !== 0;
      workouts.push({
        id: workoutId,
        startedAt,
        isCompleted,
        ...(rated ? {
          soreness24hBefore: 1 + ((h + sIdx) % 3),
          jointDiscomfort: (h + sIdx * 2) % 3,
        } : {}),
      });
      if (!isCompleted) continue;
      const numSets = wk === 0 ? 8 : 3 + ((h + sIdx) % 6);
      for (let k = 0; k < numSets; k++) {
        sid += 1;
        sets.push({
          id: `set${sid}`,
          exerciseId: 'ex1',
          workoutId,
          weight: 50 + k,
          actualReps: 5 + (k % 5),
          createdAt: startedAt + k * 60_000,
          setType: k === 0 && sessions > 1 ? 'warmup' : 'straight',
        });
      }
    }
  }
  return { workouts, sets, exerciseMap };
}

// ---------------------------------------------------------------------
// 1. D6-correct default (Campaign 1 P0-7 D6)
// ---------------------------------------------------------------------
describe('buildLast4WeekDeloadBuckets — D6-correct default (answered-only, never coerced to 0)', () => {
  test('an unrated session is excluded from the average, not coerced to 0', () => {
    const workouts = [
      { id: 'w1', startedAt: NOW - 3 * DAY, isCompleted: true }, // unrated
      { id: 'w2', startedAt: NOW - 2 * DAY, isCompleted: true, soreness24hBefore: 4, jointDiscomfort: 2 },
    ];
    const buckets = buildLast4WeekDeloadBuckets([], workouts, null, { now: NOW });
    const current = buckets[3]; // most recent bucket, contains both workouts
    // OLD CoachReviewScreen arithmetic would have produced (0 + 4) / 2 = 2.
    // D6-correct: the unrated session is excluded entirely -> just 4.
    expect(current.avgSoreness).toBe(4);
    expect(current.avgJointDiscomfort).toBe(2);
  });

  test('a fully-unrated week yields null, never a manufactured 0', () => {
    const workouts = [{ id: 'w1', startedAt: NOW - DAY, isCompleted: true }];
    const buckets = buildLast4WeekDeloadBuckets([], workouts, null, { now: NOW });
    expect(buckets[3].avgSoreness).toBeNull();
    expect(buckets[3].avgJointDiscomfort).toBeNull();
  });

  test('zeroFillUnrated: true reproduces the pre-D6 coercion exactly (kept only as the documented record of the replaced bug; no production caller passes this)', () => {
    const workouts = [
      { id: 'w1', startedAt: NOW - 3 * DAY, isCompleted: true },
      { id: 'w2', startedAt: NOW - 2 * DAY, isCompleted: true, soreness24hBefore: 4, jointDiscomfort: 2 },
    ];
    const buckets = buildLast4WeekDeloadBuckets([], workouts, null, { now: NOW, zeroFillUnrated: true });
    expect(buckets[3].avgSoreness).toBe(2); // (0 + 4) / 2
    expect(buckets[3].avgJointDiscomfort).toBe(1); // (0 + 2) / 2
  });
});

// ---------------------------------------------------------------------
// 2. Byte-identity: useProgressData.js (reference implementation --
//    every default matches this caller's own prior behaviour verbatim)
// ---------------------------------------------------------------------
describe('buildLast4WeekDeloadBuckets — byte-identical to useProgressData.js\'s old inline derivation', () => {
  test.each([1, 2, 3, 4, 5])('seed %i', (seed) => {
    const { sets, workouts, exerciseMap } = makeFixture(seed);
    const expected = oldUseProgressDataBuckets(sets, exerciseMap, workouts, NOW);
    const actual = buildLast4WeekDeloadBuckets(sets, workouts, exerciseMap, { now: NOW });
    expect(actual).toEqual(expected);
  });
});

// ---------------------------------------------------------------------
// 3. Byte-identity: HomeScreen.js (LOCKED baseline -- import + call
//    change only, no behaviour change)
// ---------------------------------------------------------------------
describe('buildLast4WeekDeloadBuckets — byte-identical to HomeScreen.js\'s old inline derivation', () => {
  test.each([1, 2, 3, 4, 5])('seed %i', (seed) => {
    const { sets, workouts } = makeFixture(seed);
    // Mirrors production: recentSets is bounded to the trailing 4-week
    // window (getWorkoutSetsSince), allWorkouts is unrestricted.
    const recentSets = sets.filter(s => s.createdAt >= NOW - 4 * WEEK);
    const expected = oldHomeScreenBuckets(recentSets, workouts, NOW);
    const actual = buildLast4WeekDeloadBuckets(recentSets, workouts, null, {
      now: NOW,
      excludeWarmups: true,
      repsViaWorkoutRoster: true,
      weeksSinceLastDeloadOverride: 99,
    });
    expect(actual).toEqual(expected);
  });
});

// ---------------------------------------------------------------------
// 4. CoachReviewScreen (D33 ruling): non-corrected axes byte-identical,
//    corrected axes (soreness/joint) deliberately differ from the old
//    coerced-to-zero reference and match the D6-correct answered-only one.
// ---------------------------------------------------------------------
describe('buildLast4WeekDeloadBuckets — CoachReviewScreen (D33: D6-correct, disclosed correction)', () => {
  const weekStartMs = startOfWeek(new Date(NOW), { weekStartsOn: 1 }).getTime();

  test.each([1, 2, 3, 4, 5])('seed %i: avgReps/hasOverMRV/weeksSinceLastDeload unchanged', (seed) => {
    const { sets, workouts, exerciseMap } = makeFixture(seed);
    const oldBuckets = oldCoachReviewBuckets(sets, workouts, exerciseMap, weekStartMs, NOW);
    const actual = buildLast4WeekDeloadBuckets(sets, workouts, exerciseMap, { weekAnchorMs: weekStartMs, now: NOW });

    expect(actual.map(b => b.avgReps)).toEqual(oldBuckets.map(b => b.avgReps));
    expect(actual.map(b => b.hasOverMRV)).toEqual(oldBuckets.map(b => b.hasOverMRV));
    expect(actual.map(b => b.weeksSinceLastDeload)).toEqual(oldBuckets.map(b => b.weeksSinceLastDeload));
  });

  test.each([1, 2, 3, 4, 5])('seed %i: soreness/joint averages match the D6-correct reference, not the old coercion', (seed) => {
    const { sets, workouts, exerciseMap } = makeFixture(seed);
    const d6Correct = d6CorrectCoachReviewSorenessJoint(sets, workouts, weekStartMs, NOW);
    const actual = buildLast4WeekDeloadBuckets(sets, workouts, exerciseMap, { weekAnchorMs: weekStartMs, now: NOW });

    expect(actual.map(b => b.avgSoreness)).toEqual(d6Correct.map(b => b.avgSoreness));
    expect(actual.map(b => b.avgJointDiscomfort)).toEqual(d6Correct.map(b => b.avgJointDiscomfort));
  });

  test('a bucket with one unrated + one rated session: new output diverges from the old coerced-to-zero reference, and matches the D6-correct answer', () => {
    // Deliberately constructed (not fixture-derived) so the divergence this
    // correction produces is asserted unconditionally, not left to chance.
    const exerciseMap = { ex1: { primaryMuscle: 'chest' } };
    const workouts = [
      // This week (bucket 3, [weekStartMs, weekStartMs+WEEK)): one unrated,
      // one rated session.
      { id: 'w1', startedAt: weekStartMs + DAY, isCompleted: true }, // unrated
      { id: 'w2', startedAt: weekStartMs + 2 * DAY, isCompleted: true, soreness24hBefore: 3, jointDiscomfort: 2 },
    ];
    const sets = [];

    const oldBuckets = oldCoachReviewBuckets(sets, workouts, exerciseMap, weekStartMs, NOW);
    const d6Correct = d6CorrectCoachReviewSorenessJoint(sets, workouts, weekStartMs, NOW);
    const actual = buildLast4WeekDeloadBuckets(sets, workouts, exerciseMap, { weekAnchorMs: weekStartMs, now: NOW });

    // Old (coerced-to-zero): (0 + 3) / 2 = 1.5 soreness, (0 + 2) / 2 = 1 joint.
    expect(oldBuckets[3].avgSoreness).toBe(1.5);
    expect(oldBuckets[3].avgJointDiscomfort).toBe(1);
    // New (D6-correct, answered-only): unrated excluded -> just the rated value.
    expect(actual[3].avgSoreness).toBe(3);
    expect(actual[3].avgJointDiscomfort).toBe(2);
    expect(actual[3].avgSoreness).toBe(d6Correct[3].avgSoreness);
    expect(actual[3].avgJointDiscomfort).toBe(d6Correct[3].avgJointDiscomfort);
    // The correction is real: new output differs from what the old,
    // pre-fix CoachReviewScreen code would have produced.
    expect(actual[3].avgSoreness).not.toBe(oldBuckets[3].avgSoreness);
    expect(actual[3].avgJointDiscomfort).not.toBe(oldBuckets[3].avgJointDiscomfort);
  });
});
