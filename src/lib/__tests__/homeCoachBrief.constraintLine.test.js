/**
 * D112 R5 (closes audit T1-14/T2-31): constraintLineText is the standalone,
 * exported pure helper HomeScreen.js now renders independent of the coach
 * brief (which used to be the ONLY place this sentence could appear, gated
 * behind showCoachBrief + the "Ready when you are" headline suppression).
 *
 * Pins: the exact two-branch copy (named subject vs generic fallback), and
 * that buildCoachBrief's own CC31 machinery (Rules 1-6, applyConstraintLine)
 * is untouched - same behaviour, byte-identical, for any other caller.
 */
import { buildCoachBrief, constraintLineText } from '../homeCoachBrief';

describe('constraintLineText (standalone, T1-14/T2-31)', () => {
  test('names the subject when one is known', () => {
    expect(constraintLineText('overhead pressing')).toBe('Training leaves overhead pressing out at the moment.');
  });

  test('falls back to the generic line when no honest subject exists', () => {
    expect(constraintLineText(null)).toBe('Training works around your temporary change.');
  });

  test('defaults to the generic line when called with no argument', () => {
    expect(constraintLineText()).toBe('Training works around your temporary change.');
  });
});

describe('buildCoachBrief: CC31 machinery untouched (regression guard)', () => {
  test('still appends the constraint line to a firing rule when activeConstraint is passed', () => {
    // Byte-identical to before this change: buildCoachBrief's own
    // applyConstraintLine still works exactly as it did, for any caller
    // that still feeds it activeConstraint/constraintSubject. HomeScreen
    // itself no longer does (see the HomeScreen guard test), but the
    // function's behaviour must not regress.
    const brief = buildCoachBrief({
      fatigueHistory: [],
      deloadSuggestion: true,
      lastWorkoutDaysAgo: null,
      activeConstraint: true,
      constraintSubject: 'overhead pressing',
    });
    expect(brief.lines).toContain('Training leaves overhead pressing out at the moment.');
  });

  test('without activeConstraint, no constraint line is appended (default false)', () => {
    const brief = buildCoachBrief({
      fatigueHistory: [],
      deloadSuggestion: true,
      lastWorkoutDaysAgo: null,
    });
    expect(brief.lines ?? []).toHaveLength(0);
  });
});
