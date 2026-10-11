/**
 * volumeInsightCopy -- pure judgement -> text for the Workout Summary's
 * per-muscle volume rows.
 *
 * RE-PINNED under D219 lane A5 (design 5.3, register D219): the suite used to
 * hold the DIRECTION of the old status guidance ("an over-ceiling row must never
 * tell a lifter to add sets"), because the copy came from the engine's landmark
 * status ("Near the limit", "Too much"). The copy now comes from the one
 * judgement every surface shares (volumeJudgement.judgeWeek), and no line
 * instructs in either direction (D204). This suite pins:
 *   - the at-a-glance line: "27 sets · Focus range" for a muscle the plan raised,
 *     "27 sets · Above the usual range" for the same number on a muscle it did not;
 *   - the explanation behind a tap: the reason for a raised muscle ("Biceps are
 *     your focus this block: 27 sets, inside the higher range for a focus, 20 to 30."), the
 *     evidence sentence for the band, the plan target only when the week is above
 *     it;
 *   - nothing blames, nothing instructs, no em dash, at any total for any role.
 */
import { getVolumeInsight, getVolumeWhy } from '../volumeInsightCopy';
import { judgeWeek } from '../volumeJudgement';

const NEVER = /\b(too much|near the limit|overtrain(ed|ing)?|junk|cut back|you should|reduce your|train more|train less|add (a couple of )?sets|drop (a few )?sets|ease off)\b/i;

describe('getVolumeInsight', () => {
  test('returns null for no judgement', () => {
    expect(getVolumeInsight(null)).toBeNull();
    expect(getVolumeInsight(undefined)).toBeNull();
  });

  test('rounds the set count and reads the band word, for any role', () => {
    expect(getVolumeInsight(judgeWeek({ muscle: 'biceps', sets: 12.4, role: 'standard' }))).toBe('12 sets · Usual range for growth');
    expect(getVolumeInsight(judgeWeek({ muscle: 'biceps', sets: 1, role: 'standard' }))).toBe('1 set · Too few to hold size');
  });

  test("the founder's case: 27 sets reads as the focus range on a muscle the plan raised, not as a fault", () => {
    expect(getVolumeInsight(judgeWeek({ muscle: 'biceps', sets: 27, role: 'focus' }))).toBe('27 sets · Higher range for a focus');
    expect(getVolumeInsight(judgeWeek({ muscle: 'biceps', sets: 27, role: 'raised' }))).toBe('27 sets · Higher range for a focus');
    expect(getVolumeInsight(judgeWeek({ muscle: 'biceps', sets: 27, role: 'standard' }))).toBe('27 sets · Above the usual range');
  });

  test('every band says its own word, and none says "too much" or "near the limit"', () => {
    const words = [0, 4, 8, 14, 24, 35, 50].map((n) => getVolumeInsight(judgeWeek({ muscle: 'chest', sets: n, role: 'standard' })));
    expect(words).toEqual([
      '0 sets · Too few to hold size',
      '4 sets · Holds your size',
      '8 sets · Holds size, some growth',
      '14 sets · Usual range for growth',
      '24 sets · Above the usual range',
      '35 sets · Close to the upper limit',
      '50 sets · More than needed',
    ]);
    for (const w of words) expect(w).not.toMatch(NEVER);
  });
});

describe('getVolumeWhy', () => {
  test('returns null for no judgement, or one with nothing to say', () => {
    expect(getVolumeWhy(null)).toBeNull();
    expect(getVolumeWhy({ why: [] })).toBeNull();
    expect(getVolumeWhy({})).toBeNull();
  });

  test('a muscle the plan raised: the reason, then the evidence sentence', () => {
    const why = getVolumeWhy(judgeWeek({ muscle: 'biceps', sets: 27, role: 'focus' }));
    expect(why).toBe(
      'Biceps are your focus this block: 27 sets, inside the higher range for a focus, 20 to 30. '
      + 'In the higher range for biceps, which you picked to bring up. Sets above the usual range add a little more growth.',
    );
  });

  test('a muscle the plan did not raise: the same number is described as focus-level volume, with no fault', () => {
    expect(getVolumeWhy(judgeWeek({ muscle: 'biceps', sets: 27, role: 'standard' }))).toBe(
      'Above the usual range for building muscle: as much as a muscle picked to bring up gets, though this one is not a focus in your plan.',
    );
  });

  test("the plan's target is quoted only when the week is above it", () => {
    const above = getVolumeWhy(judgeWeek({ muscle: 'biceps', sets: 27, role: 'focus', target: 22 }));
    expect(above).toMatch(/Your plan targets 22 a week\.$/);
    const within = getVolumeWhy(judgeWeek({ muscle: 'biceps', sets: 20, role: 'focus', target: 22 }));
    expect(within).not.toMatch(/Your plan targets/);
  });

  test('no explanation, for any role at any total, blames, instructs or carries an em dash (D204)', () => {
    for (const role of ['focus', 'raised', 'standard', 'maintenance']) {
      for (const sets of [0, 3, 8, 14, 22, 27, 33, 44, 70]) {
        const why = getVolumeWhy(judgeWeek({ muscle: 'quads', sets, role, target: 12 }));
        expect(why).not.toMatch(NEVER);
        expect(why).not.toContain('—');
      }
    }
  });
});
