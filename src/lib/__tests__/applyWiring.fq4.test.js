/**
 * applyWiring.fq4.test.js — the FQ-4 dedicated test plan (D96, founder
 * ruling 2026-08-10).
 *
 * The confirm-then-apply law, end to end:
 *   UNAPPLIED PROPOSAL  = no coaching change to session prescription
 *   APPLIED PROPOSAL    = the written change reaches session prescription
 *   WRITE FAILURE       = no success receipt and no partial session change
 *
 * The pure allocator (computeWeeklySessionAllocation) is tested against the
 * REAL implementation; the wiring and the unapplied-signal gate are pinned
 * at source so no refactor can quietly sever the wire again.
 */
import fs from 'fs';
import path from 'path';
import { computeWeeklySessionAllocation, computeVolumeApply } from '../coachApply';

const read = (p) => fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');

const ex = (exerciseId, primaryMuscle, recommendedSets) => ({ exerciseId, primaryMuscle, recommendedSets });

describe('FQ-4: the pure allocator', () => {
  test('identity when no rows exist (legacy blocks are byte-identical)', () => {
    const out = computeWeeklySessionAllocation([ex('a', 'chest', 3)], {}, {});
    expect(out).toEqual({ a: 3 });
  });

  test('an applied increase reaches the session: week 12 over baseline 10 scales 3 sets to 4', () => {
    const out = computeWeeklySessionAllocation(
      [ex('a', 'chest', 3)], { chest: 12 }, { chest: 10 },
    );
    expect(out.a).toBe(4); // 3 * 1.2 = 3.6 → 4
  });

  test('an applied reduction reaches the session, floored at one working set', () => {
    const out = computeWeeklySessionAllocation(
      [ex('a', 'chest', 3), ex('b', 'chest', 1)], { chest: 5 }, { chest: 10 },
    );
    expect(out.a).toBe(2); // 3 * 0.5 = 1.5 → 2 (round half up)
    expect(out.b).toBe(1); // floor: never below one working set
  });

  test('the recovery week\'s per-muscle reductions differ per muscle and both arrive', () => {
    const out = computeWeeklySessionAllocation(
      [ex('a', 'chest', 4), ex('b', 'back', 4)],
      { chest: 6, back: 9 },   // deload week rows: chest halved harder
      { chest: 12, back: 12 },
    );
    expect(out.a).toBe(2);
    expect(out.b).toBe(3);
  });

  test('a muscle with no row resolves to factor 1, not zero', () => {
    const out = computeWeeklySessionAllocation(
      [ex('a', 'chest', 3), ex('b', 'quads', 4)], { chest: 12 }, { chest: 10 },
    );
    expect(out.b).toBe(4);
  });

  test('deterministic: identical inputs, identical outputs', () => {
    const args = [[ex('a', 'chest', 3), ex('b', 'back', 5)], { chest: 11, back: 8 }, { chest: 10, back: 10 }];
    expect(computeWeeklySessionAllocation(...args)).toEqual(computeWeeklySessionAllocation(...args));
  });

  test('composes with computeVolumeApply: an applied +2 write produces a bigger session', () => {
    // The apply half (already pinned elsewhere) writes the rows...
    const changes = computeVolumeApply(
      [{ muscle: 'chest', planned_sets: 10, mev: 8, mav: 14, mrv: 18 }], 2,
    );
    expect(changes[0].plannedSets).toBe(12);
    // ...and the allocator carries the written number into the session.
    const out = computeWeeklySessionAllocation(
      [ex('a', 'chest', 3)], { chest: changes[0].plannedSets }, { chest: 10 },
    );
    expect(out.a).toBe(4);
  });
});

describe('FQ-4: the wiring (source pins)', () => {
  test('the session assembly feeds the allocated base into the adjustment engine', () => {
    const src = read('lib/sessionAdjustments.js');
    expect(src).toMatch(/getSessionWeeklyAllocation\(\{ workout, exercises \}\)/);
    expect(src).toMatch(/plannedSets: allocation\?\.\[e\?\.exercise\?\.id\]/);
  });

  test('the logger reads the allocated base when no session adjustment stands', () => {
    const src = read('screens/ActiveWorkoutScreen.js');
    expect(src).toMatch(/weeklyAllocation\?\.\[exercise\?\.id\] \?\? routineExercise\?\.recommendedSets/);
  });

  test('UNAPPLIED: an ordinary proposal\'s volumeSignal is gated on a persisted coach row for the week; safetyHold stays automatic', () => {
    const src = read('lib/sessionAdjustments.js');
    expect(src).toMatch(/appliedGovernsWeek = \(weekRows \|\| \[\]\)\.some\(r => r\.source === 'coach'\)/);
    expect(src).toMatch(/volumeSignal: appliedGovernsWeek \? coachOutput\.volumeSignal : 0/);
    // The safety hold is passed through untouched (it is never rewritten).
    expect(src).not.toMatch(/safetyHold: appliedGovernsWeek/);
  });

  test('WRITE FAILURE: the apply handler shows no success state on a failed write', () => {
    // The weekly apply's success copy renders only after the awaited writes
    // resolve; the catch path surfaces an error and marks nothing applied.
    const src = read('screens/CoachOutputScreen.js');
    const fn = src.slice(src.indexOf('async function handleApplyTraining'));
    const body = fn.slice(0, fn.indexOf('\n  }'));
    // Success state (markApplied + the settled flag) lives inside the try,
    // after the awaited row writes; the catch path logs and sets neither, so
    // a failed write leaves no success receipt and no applied mark.
    // CC31 added a best-effort inner catch (the apply-time hold-muscle
    // read) INSIDE the try; the handler's own failure path is the LAST
    // catch in the body, so the window anchors there.
    const catchBlock = body.slice(body.lastIndexOf('} catch'));
    expect(catchBlock.length).toBeGreaterThan(0);
    expect(catchBlock).not.toMatch(/markApplied|setApplySettling|setOutput/);
    expect(body.slice(0, body.lastIndexOf('} catch'))).toMatch(/markApplied[\s\S]*setApplySettling/);
  });
});
