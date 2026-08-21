// Extracted verbatim from HomeScreen.js (behaviour-preserving decomposition).
// Pure function, no I/O; unchanged logic, just relocated.

/**
 * Derive a 1-3 sentence coaching brief from available training data.
 * Returns { headline, body, type, lines: [...] } where type is 'go' | 'caution' | 'recover'
 * and lines is an array of brief strings (e.g. for testing).
 */
// blockProgress is still ACCEPTED (callers pass it) but unused since Rule 4's
// removal -- kept in the signature so no call site changes, prefixed per lint.
// CC31 (section BD-D8): when activeConstraint is true, appends a quiet line
// to the brief about training working around a temporary change.
// constraintSubject (natural coach-language order, 2026-08-21) is the short
// honest name for what that change covers, or null for the generic line.
export function buildCoachBrief({ fatigueHistory, deloadSuggestion, lastWorkoutDaysAgo, blockProgress: _blockProgress, activeConstraint = false, constraintSubject = null }) {
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

  // Rule 1, deload suggested
  if (deloadSuggestion) {
    return applyConstraintLine({
      headline: 'Recovery week',
      body: 'Your body is signalling it needs a lighter week. Keep the movement, drop the weight. This is how you come back stronger.',
      type: 'recover',
    });
  }

  // Rule 2, high fatigue (avg of last 2 sessions ≥ 3.5)
  // C6 RB6-4 (D97-25): present-tense advice needs RECENT sessions - the
  // rule read the last two rated rows at any age, telling a six-month
  // returner (Free tier included) to cut weight 10% "today" off ancient
  // fatigue. Sessions must sit inside the 14-day detraining boundary.
  const recentRated = (fatigueHistory ?? []).filter((r) => {
    const t = Number(r?.startedAt ?? r?.started_at);
    return Number.isFinite(t) && (Date.now() - t) <= 14 * 86400000;
  });
  if (recentRated.length >= 2) {
    const recent = recentRated.slice(0, 2);
    const avg = recent.reduce((s, r) => s + (r.fatigueLevel ?? r.fatigue_level ?? 0), 0) / recent.length;
    if (avg >= 3.5) {
      return applyConstraintLine({
        headline: 'Fatigue building',
        body: 'Fatigue is building. Consider reducing weight by 10% today and focusing on quality reps.',
        type: 'caution',
      });
    }
  }

  // Rule 3, long gap since last session
  if (lastWorkoutDaysAgo != null && lastWorkoutDaysAgo >= 5) {
    return applyConstraintLine({
      headline: 'Good to see you back',
      body: "It's been a while since your last session. Ease in. Don't try to catch up in one workout.",
      type: 'go',
    });
  }

  // Rule 4 REMOVED (founder ruling 2026-08-06): "Muscle groups need
  // attention" fired whenever 2+ muscles sat below their weekly minimum
  // mid-week -- which is the GUARANTEED state mid-plan (the plan spreads
  // muscles across the week), so the brief was telling users to override
  // their own plan's rotation. The plan owns weekly allocation; the brief
  // never second-guesses it per muscle.

  // Rule 5, volume on track, low fatigue.
  // C5-P18-04 (D96): "Training is on track" is a TREND judgement, and it used
  // to fire from a single rated session. The sibling voice on the same screen
  // (readinessSummary.js, priority 4) deliberately waits for two rated
  // sessions before it speaks about a trend, so the two Home coaching voices
  // now agree on what counts as evidence. Rules 1-3 are unaffected.
  if (fatigueHistory.length >= 2) {
    const recent = fatigueHistory.slice(0, 2);
    const avg = recent.reduce((s, r) => s + (r.fatigueLevel ?? r.fatigue_level ?? 0), 0) / recent.length;
    if (avg <= 2) {
      return applyConstraintLine({
        headline: 'Looking good',
        body: 'Training is on track. Push the quality today.',
        type: 'go',
      });
    }
  }

  // Rule 6, default
  return applyConstraintLine({
    headline: 'Ready when you are',
    body: 'Ready when you are.',
    type: 'go',
  });
}
