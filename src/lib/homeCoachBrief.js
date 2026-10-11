// Extracted verbatim from HomeScreen.js (behaviour-preserving decomposition).
// Pure function, no I/O; unchanged logic, just relocated.

/**
 * Derive a 1-3 sentence coaching brief from available training data.
 *
 * D224 (founder order 2026-10-11, on Today: "Remove the recovery data from
 * today. I don't want it there full stop."): the rules that read fatigue
 * (the deload signal, two very tiring sessions, a low-fatigue "Looking good")
 * are gone; recovery lives on the Recovery screen. The long-gap welcome and
 * the temporary-change line stay.
 * Returns { headline, body, type, lines: [...] } where type is 'go' | 'caution' | 'recover'
 * and lines is an array of brief strings (e.g. for testing).
 */
// blockProgress is still ACCEPTED (callers pass it) but unused since Rule 4's
// removal -- kept in the signature so no call site changes, prefixed per lint.
// CC31 (section BD-D8): when activeConstraint is true, appends a quiet line
// to the brief about training working around a temporary change.
// constraintSubject (natural coach-language order, 2026-08-21) is the short
// honest name for what that change covers, or null for the generic line.
// CC33 D112 R5 (closes audit T1-14/T2-31): the constraint line's own text,
// factored out as a standalone pure helper so it can render independent of
// whichever brief headline fired (or whether the brief itself was
// dismissed) -- see HomeScreen.js's standalone render block. Byte-identical
// wording to applyConstraintLine below; the rule logic (Rules 1-6) and
// applyConstraintLine itself are untouched.
export function constraintLineText(constraintSubject = null) {
  return constraintSubject
    ? `Training leaves ${constraintSubject} out at the moment.`
    : 'Training works around your temporary change.';
}

export function buildCoachBrief({ lastWorkoutDaysAgo, blockProgress: _blockProgress, activeConstraint = false, constraintSubject = null }) {
  // Helper to apply activeConstraint quiet line to any result
  const applyConstraintLine = (result) => {
    if (!activeConstraint) return result;
    return {
      ...result,
      lines: [...(result.lines ?? []), constraintSubject
        ? `Training leaves ${constraintSubject} out at the moment.`
        : 'Training works around your temporary change.'],
    };
  };

  // D204 (founder rule 2026-09-26, "They don't choose sessions!"; lead
  // review of the plain-English sweep): every rule below DESCRIBES; the plan
  // sets the session, so the brief says what it sees and never what to lift.

  // Long gap since the last session.
  if (lastWorkoutDaysAgo != null && lastWorkoutDaysAgo >= 5) {
    return applyConstraintLine({
      headline: 'Good to see you back',
      body: "It's been a while since your last session.",
      type: 'go',
    });
  }

  // Rule 4 REMOVED (founder ruling 2026-08-06): the plan owns weekly
  // allocation; the brief never second-guesses it per muscle.

  // Default.
  return applyConstraintLine({
    headline: 'Ready when you are',
    body: 'Ready when you are.',
    type: 'go',
  });
}
