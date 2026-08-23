/**
 * The gold record flag and the celebration read the same history (D87).
 *
 * What this suite pins and why. Two surfaces answer "is this a record":
 * the live flag under the steppers (buildRecordLine) before the set is
 * logged, and the celebration (detectPR) the moment it is. They call the
 * same function, so they can only disagree by being handed different
 * history - and the founder ruling of 2026-08-22 did exactly that: the
 * log moved to judging a set against PREVIOUS SESSIONS only, while the
 * line was still adding today's earlier sets to the comparison.
 *
 * The disagreement runs in both directions, so both are pinned here as
 * behaviour rather than as a source string:
 *
 *  - on a personal-best day, set one raises the line's bar, so sets two
 *    and three show no flag and are then celebrated anyway;
 *  - on a first exposure, the line flags a record against a set logged
 *    minutes earlier, which the log correctly withholds because there is
 *    no previous session to beat (FQ-7).
 *
 * The second is the founder's device report of 2026-08-22: 80x15, 80x15,
 * then 100x15 on an exercise with no history, and nothing celebrated.
 */
import { buildRecordLine } from '../workoutRecordLine';
import { detectPR } from '../algorithms';

const EX = { id: 'ex1', loadSemantics: 'total' };
const set = (weight, actualReps, id) => ({ id, weight, actualReps, setType: 'working' });

// The screen's own gate, restated: a record is only claimed at all when
// the exercise has working sets from a previous session.
const hadPriorExposure = (prior) => prior.length > 0;

// What the log does with a set, in the shape the screen assembles it.
const logSays = (candidate, prior) => (
  hadPriorExposure(prior) ? detectPR(candidate, prior, EX, 'kg').length > 0 : false
);

// What the flag says about the same set, given the same history.
const flagSays = (candidate, prior) => !!buildRecordLine({
  weight: candidate.weight,
  reps: candidate.actualReps,
  historySets: prior,
  units: 'kg',
  exerciseType: 'weight_reps',
  loadSemantics: 'total',
})?.isRecord;

describe('the flag never promises a record the log withholds, and never hides one it gives', () => {
  test('first exposure: three sets, a big jump, and both surfaces stay quiet', () => {
    // The founder's session. No previous session for this exercise, so
    // every set is baseline material: the log gives set one the calm
    // starting-point line and says nothing after that. The flag must
    // agree - it has no bar to measure against either.
    const prior = [];
    for (const candidate of [set(80, 15, 's1'), set(80, 15, 's2'), set(100, 15, 's3')]) {
      expect(flagSays(candidate, prior)).toBe(false);
      expect(logSays(candidate, prior)).toBe(false);
    }
  });

  test('personal-best day: every set that beats the old record flags AND celebrates', () => {
    // Last session's best is 90x8 (estimated max 114). Today opens with
    // the strongest set, then two that are lower than it but still above
    // the old record. All three are records, and the flag must show on
    // all three - under the old shape only the first one did.
    const prior = [set(90, 8, 'old')];
    const today = [set(100, 10, 's1'), set(95, 10, 's2'), set(92, 10, 's3')];
    for (const candidate of today) {
      expect(logSays(candidate, prior)).toBe(true);
      expect(flagSays(candidate, prior)).toBe(true);
    }
  });

  test('a set that beats nothing is quiet on both surfaces', () => {
    const prior = [set(100, 15, 'old')];
    expect(logSays(set(100, 15, 's1'), prior)).toBe(false);
    expect(flagSays(set(100, 15, 's1'), prior)).toBe(false);
    expect(logSays(set(90, 12, 's2'), prior)).toBe(false);
    expect(flagSays(set(90, 12, 's2'), prior)).toBe(false);
  });

  test('the old shape really did disagree, so this suite is not vacuous', () => {
    // Same personal-best day, but with today's earlier sets folded back
    // into the flag's history the way they used to be. The log still
    // celebrates set two; the flag goes dark. That gap is the defect.
    const prior = [set(90, 8, 'old')];
    const contaminated = [...prior, set(100, 10, 's1')];
    expect(logSays(set(95, 10, 's2'), prior)).toBe(true);
    expect(flagSays(set(95, 10, 's2'), contaminated)).toBe(false);
  });
});
