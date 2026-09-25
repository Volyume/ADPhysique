/**
 * database.recapPrGate20260924.test.js
 *
 * FIX LANE S6 (progress-tab audit 2026-09-24), S6-3: getRecapData,
 * getBlockReflectionData and getYearOfLiftsData's best-estimated-1RM loops
 * call calculate1RM on every logged set; without an eligibility gate, a
 * myo-reps/rest-pause cluster row (actual_reps is a SUM of efforts) or a
 * ballistic row (light load, non-maximal effort) could fabricate a
 * "Personal record"/"best lift" on the monthly/weekly recap, the block
 * reflection and Year of Lifts, inflating the "N PRs" share-card count.
 * All three functions select ws.set_type and ws.evidence_class and gate
 * the PR loop with the shared isE1rmEligibleRow (algorithms.js).
 *
 * The expo-sqlite mock is a shape stub (no real SQL engine), so per repo
 * convention (database.deleteExercise.test.js, database.workoutHistoryReads
 * 20260924.test.js) this pins the SQL/params contract, then feeds the JS-
 * side reduction hand-shaped rows directly (as if the DB's own WHERE
 * clause had already run) rather than exercising a real SQL engine;
 * CRUD/filtering itself is exercised on device.
 *
 * S6-3 FOLLOW-UP (D200 "fix it all", coordinator instruction): the first
 * version of this file only fixed getRecapData and getBlockReflectionData
 * (S6-3's named files) and reported getYearOfLiftsData's identical gap as
 * out of scope -- its sets query selected neither ws.set_type nor
 * ws.evidence_class, so its PRE-EXISTING `if (!isE1rmEligibleRow(s))
 * continue;` call read a row with neither field and always defaulted to
 * eligible, making that gate a no-op. Under "fix it all" the coordinator
 * brought it in scope; the SELECT is now fixed the same way, and this file
 * covers all three functions.
 */

jest.mock('expo-sqlite');

const {
  db, getRecapData, getBlockReflectionData, getYearOfLiftsData,
} = require('../database');

let conn;

beforeEach(async () => {
  conn = await db();
  conn.getAllAsync.mockReset();
  conn.getFirstAsync.mockReset();
});

// A straight row (eligible), a myo_reps row (cluster-summed actual_reps,
// ineligible) and a ballistic row (non-maximal effort via evidence_class,
// ineligible) on three DIFFERENT exercises, so a surviving PR under the
// myo_reps/ballistic exercise's name would prove the gate missing. Weights/
// reps are chosen so the ungated rows would each fabricate a large estimate
// from a comparatively light load.
function setsFixture() {
  return [
    {
      workout_id: 'w1', weight: 100, actual_reps: 5, set_type: 'straight', evidence_class: null,
      exercise_id: 'e1', exercise_name: 'Bench press',
    },
    {
      workout_id: 'w1', weight: 50, actual_reps: 27, set_type: 'myo_reps', evidence_class: null,
      exercise_id: 'e2', exercise_name: 'Leg press',
    },
    {
      workout_id: 'w1', weight: 40, actual_reps: 15, set_type: 'straight', evidence_class: 'ballistic',
      exercise_id: 'e3', exercise_name: 'Box jump',
    },
  ];
}

describe('getRecapData PR eligibility gate (S6-3)', () => {
  test('the sets query selects ws.set_type and ws.evidence_class', async () => {
    conn.getAllAsync.mockResolvedValue([]);
    await getRecapData('u1', { startMs: 0, endMs: 1000 });

    const setsCall = conn.getAllAsync.mock.calls.find(([sql]) => /FROM workout_sets ws/.test(sql));
    expect(setsCall).toBeDefined();
    expect(setsCall[0]).toMatch(/ws\.set_type/);
    expect(setsCall[0]).toMatch(/ws\.evidence_class/);
  });

  test('a myo_reps row and a ballistic row are excluded from topPRs; a straight row is included', async () => {
    conn.getAllAsync.mockImplementation((sql) => {
      if (/FROM workout_sets ws/.test(sql)) return Promise.resolve(setsFixture());
      return Promise.resolve([]); // the workouts query
    });

    const result = await getRecapData('u1', { startMs: 0, endMs: 1000 });

    const names = result.topPRs.map(p => p.exerciseName);
    expect(names).toContain('Bench press');
    expect(names).not.toContain('Leg press');
    expect(names).not.toContain('Box jump');
    // Tonnage/set counts keep every working set; only the record read is gated.
    expect(result.totalSets).toBe(3);
  });

  test('a bare eligibility check on the same rows confirms only the straight row passes (algorithms.js contract)', () => {
    const { isE1rmEligibleRow } = require('../algorithms');
    const [straight, myoReps, ballistic] = setsFixture();
    expect(isE1rmEligibleRow(straight)).toBe(true);
    expect(isE1rmEligibleRow(myoReps)).toBe(false);
    expect(isE1rmEligibleRow(ballistic)).toBe(false);
  });
});

describe('getBlockReflectionData PR eligibility gate (S6-3)', () => {
  const MESO = {
    id: 'm1', start_date: '2026-01-01', end_date: '2026-02-12',
    deload_week: 6, planned_weeks: 6, duration_weeks: 6,
  };

  test('the sets query selects ws.set_type and ws.evidence_class', async () => {
    conn.getFirstAsync.mockResolvedValue(MESO);
    conn.getAllAsync.mockResolvedValue([]);
    await getBlockReflectionData('u1', 'm1');

    const setsCall = conn.getAllAsync.mock.calls.find(([sql]) => /FROM workout_sets ws/.test(sql));
    expect(setsCall).toBeDefined();
    expect(setsCall[0]).toMatch(/ws\.set_type/);
    expect(setsCall[0]).toMatch(/ws\.evidence_class/);
  });

  test('a myo_reps row and a ballistic row are excluded from prs; a straight row is included', async () => {
    conn.getFirstAsync.mockResolvedValue(MESO);
    conn.getAllAsync.mockImplementation((sql) => {
      if (/FROM workout_sets ws/.test(sql)) return Promise.resolve(setsFixture());
      return Promise.resolve([]); // the workouts query
    });

    const result = await getBlockReflectionData('u1', 'm1');

    const names = result.prs.map(p => p.exerciseName);
    expect(names).toContain('Bench press');
    expect(names).not.toContain('Leg press');
    expect(names).not.toContain('Box jump');
    expect(result.totalSets).toBe(3);
  });
});

describe('getYearOfLiftsData PR eligibility gate (S6-3 follow-up)', () => {
  test('the sets query selects ws.set_type and ws.evidence_class', async () => {
    conn.getAllAsync.mockResolvedValue([]);
    await getYearOfLiftsData('u1');

    const setsCall = conn.getAllAsync.mock.calls.find(([sql]) => /FROM workout_sets ws/.test(sql));
    expect(setsCall).toBeDefined();
    expect(setsCall[0]).toMatch(/ws\.set_type/);
    expect(setsCall[0]).toMatch(/ws\.evidence_class/);
  });

  test('a myo_reps row and a ballistic row are excluded from yearPRs (topPRs); a straight row is included', async () => {
    conn.getAllAsync.mockImplementation((sql) => {
      if (/FROM workout_sets ws/.test(sql)) return Promise.resolve(setsFixture());
      return Promise.resolve([]); // the workouts query
    });

    const result = await getYearOfLiftsData('u1');

    const names = result.topPRs.map(p => p.exerciseName);
    expect(names).toContain('Bench press');
    expect(names).not.toContain('Leg press');
    expect(names).not.toContain('Box jump');
    expect(result.totalSets).toBe(3);
  });
});

describe('source guard: all three loops carry the isE1rmEligibleRow gate (S6-3)', () => {
  test('getRecapData and getBlockReflectionData each call isE1rmEligibleRow before calculate1RM in their best-lift loop', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');

    const recapStart = src.indexOf('export async function getRecapData');
    const blockStart = src.indexOf('export async function getBlockReflectionData');
    expect(recapStart).toBeGreaterThan(-1);
    expect(blockStart).toBeGreaterThan(recapStart);

    const recapBody = src.slice(recapStart, blockStart);
    expect(recapBody).toMatch(/if \(!isE1rmEligibleRow\(x\)\) continue;/);
    // The gate runs BEFORE calculate1RM in the loop, not after.
    expect(recapBody.indexOf('isE1rmEligibleRow(x)')).toBeLessThan(recapBody.indexOf('calculate1RM(x.weight'));

    const nextExportIdx = src.indexOf('\nexport ', blockStart + 1);
    const blockBody = src.slice(blockStart, nextExportIdx > -1 ? nextExportIdx : undefined);
    expect(blockBody).toMatch(/if \(!isE1rmEligibleRow\(s\)\) continue;/);
    expect(blockBody.indexOf('isE1rmEligibleRow(s)')).toBeLessThan(blockBody.indexOf('calculate1RM(s.weight'));
  });

  test('getYearOfLiftsData also calls isE1rmEligibleRow before calculate1RM in its best-lift loop', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');

    const yearStart = src.indexOf('export async function getYearOfLiftsData');
    const recapStart = src.indexOf('export async function getRecapData');
    expect(yearStart).toBeGreaterThan(-1);
    expect(recapStart).toBeGreaterThan(yearStart);

    const yearBody = src.slice(yearStart, recapStart);
    expect(yearBody).toMatch(/if \(!isE1rmEligibleRow\(s\)\) continue;/);
    expect(yearBody.indexOf('isE1rmEligibleRow(s)')).toBeLessThan(yearBody.indexOf('calculate1RM(s.weight'));
    // And the SELECT feeding that loop now projects both columns the gate reads.
    expect(yearBody).toMatch(/SELECT ws\.weight, ws\.actual_reps, ws\.set_type, ws\.evidence_class, ws\.exercise_id/);
  });
});
