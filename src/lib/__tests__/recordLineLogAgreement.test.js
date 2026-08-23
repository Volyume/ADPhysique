/**
 * The gold record flag and the celebration read the same history (D87),
 * and both measure against your best on record INCLUDING today's sets
 * (founder ruling 2026-08-23).
 *
 * What this suite pins and why. Two surfaces answer "is this a record":
 * the live flag under the steppers (buildRecordLine) before the set is
 * logged, and the celebration (detectPR) the moment it is. They call the
 * same function, so they can only disagree by being handed different
 * history, or by one of them carrying an extra gate the other does not.
 *
 * Both had happened. FQ-7 gated the celebration on a set from a PREVIOUS
 * session, so on an exercise met for the first time the flag could go
 * gold while the log said nothing; and the 2026-08-22 ruling briefly took
 * today's sets out of the log's comparison but not the flag's.
 *
 * The founder's report is the first case: 80x15, 80x15, then 100x15 on an
 * exercise with no history, and nothing celebrated for the 100. Under the
 * rule pinned here the 100 is a record, because it beats the best
 * Volyume has on record for that exercise.
 */
import { buildRecordLine } from '../workoutRecordLine';
import { detectPR } from '../algorithms';

const EX = { id: 'ex1', loadSemantics: 'total' };
const set = (weight, actualReps, id) => ({ id, weight, actualReps, setType: 'working' });

// The screen's log path, restated: everything on record for this exercise,
// today's earlier working sets included. A set with nothing to beat is not
// a record (it gets the honest starting-point line instead).
const logSays = (candidate, onRecord) => (
  onRecord.length > 0 ? detectPR(candidate, onRecord, EX, 'kg').length > 0 : false
);

// The flag, given the same history.
const flagSays = (candidate, onRecord) => !!buildRecordLine({
  weight: candidate.weight,
  reps: candidate.actualReps,
  historySets: onRecord,
  units: 'kg',
  exerciseType: 'weight_reps',
  loadSemantics: 'total',
})?.isRecord;

const bothAgree = (candidate, onRecord) => {
  const log = logSays(candidate, onRecord);
  expect(flagSays(candidate, onRecord)).toBe(log);
  return log;
};

describe('the flag and the celebration always give the same answer', () => {
  test("the founder's session: a first exposure where the third set is a record", () => {
    // 80x15, 80x15, 100x15 on an exercise with nothing behind it.
    const onRecord = [];
    // Set one has nothing to beat: quiet on both, and the log gives it the
    // starting-point acknowledgement rather than a record claim.
    expect(bothAgree(set(80, 15, 's1'), onRecord)).toBe(false);
    onRecord.push(set(80, 15, 's1'));
    // Set two matches set one. Not better, so still quiet.
    expect(bothAgree(set(80, 15, 's2'), onRecord)).toBe(false);
    onRecord.push(set(80, 15, 's2'));
    // Set three is 20kg heavier than anything on record. This is the set
    // that went silent on the founder's device. It is a record.
    expect(bothAgree(set(100, 15, 's3'), onRecord)).toBe(true);
  });

  test('beating your own earlier set later the same session counts again', () => {
    // "If I PR again a second time beating the first PR, it does not pop
    // up." It pops.
    const onRecord = [set(90, 8, 'lastWeek')];
    expect(bothAgree(set(90, 10, 's1'), onRecord)).toBe(true);
    onRecord.push(set(90, 10, 's1'));
    expect(bothAgree(set(90, 11, 's2'), onRecord)).toBe(true);
    onRecord.push(set(90, 11, 's2'));
    expect(bothAgree(set(90, 12, 's3'), onRecord)).toBe(true);
  });

  test('a set that is not your best is quiet on both, even if it beats last week', () => {
    const onRecord = [set(90, 8, 'lastWeek'), set(90, 10, 's1')];
    expect(bothAgree(set(90, 9, 's2'), onRecord)).toBe(false);
    expect(bothAgree(set(85, 10, 's3'), onRecord)).toBe(false);
  });

  test('the two shapes that broke this really did disagree, so the suite is not vacuous', () => {
    const lastWeek = [set(90, 8, 'lastWeek')];
    const withToday = [...lastWeek, set(100, 10, 's1')];

    // FQ-7's gate: no set from a previous session, so the celebration was
    // withheld however far the set climbed, while the flag went gold.
    const firstExposure = [set(80, 15, 's1'), set(80, 15, 's2')];
    const fq7LogSays = false; // the gate, verbatim: no prior session, no record
    expect(flagSays(set(100, 15, 's3'), firstExposure)).toBe(true);
    expect(fq7LogSays).toBe(false);

    // The 2026-08-22 shape: the log judged against previous sessions only
    // while the flag still counted today, so a set that was not today's
    // best was celebrated with no flag behind it.
    expect(logSays(set(95, 10, 's2'), lastWeek)).toBe(true);
    expect(flagSays(set(95, 10, 's2'), withToday)).toBe(false);
  });
});
