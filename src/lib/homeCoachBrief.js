// Extracted verbatim from HomeScreen.js (behaviour-preserving decomposition).
// Pure function, no I/O; unchanged logic, just relocated.

/**
 * Derive a 1-3 sentence coaching brief from available training data.
 * Returns { headline, body, type } where type is 'go' | 'caution' | 'recover'.
 */
// blockProgress is still ACCEPTED (callers pass it) but unused since Rule 4's
// removal -- kept in the signature so no call site changes, prefixed per lint.
export function buildCoachBrief({ fatigueHistory, deloadSuggestion, lastWorkoutDaysAgo, blockProgress: _blockProgress }) {
  // Rule 1, deload suggested
  if (deloadSuggestion) {
    return {
      headline: 'Recovery week',
      body: 'Your body is signalling it needs a lighter week. Keep the movement, drop the weight. This is how you come back stronger.',
      type: 'recover',
    };
  }

  // Rule 2, high fatigue (avg of last 2 sessions ≥ 3.5)
  if (fatigueHistory.length >= 2) {
    const recent = fatigueHistory.slice(0, 2);
    const avg = recent.reduce((s, r) => s + (r.fatigueLevel ?? r.fatigue_level ?? 0), 0) / recent.length;
    if (avg >= 3.5) {
      return {
        headline: 'Fatigue building',
        body: 'Fatigue is building. Consider reducing weight by 10% today and focusing on quality reps.',
        type: 'caution',
      };
    }
  }

  // Rule 3, long gap since last session
  if (lastWorkoutDaysAgo != null && lastWorkoutDaysAgo >= 5) {
    return {
      headline: 'Good to see you back',
      body: "It's been a while since your last session. Ease in. Don't try to catch up in one workout.",
      type: 'go',
    };
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
      return {
        headline: 'Looking good',
        body: 'Training is on track. Push the quality today.',
        type: 'go',
      };
    }
  }

  // Rule 6, default
  return {
    headline: 'Ready when you are',
    body: 'Ready when you are.',
    type: 'go',
  };
}
