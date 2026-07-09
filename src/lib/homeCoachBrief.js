import { VOLUME_LANDMARKS } from './algorithms';

// Extracted verbatim from HomeScreen.js (behaviour-preserving decomposition).
// Pure function, no I/O; unchanged logic, just relocated.

/**
 * Derive a 1-3 sentence coaching brief from available training data.
 * Returns { headline, body, type } where type is 'go' | 'caution' | 'recover'.
 */
export function buildCoachBrief({ fatigueHistory, deloadSuggestion, lastWorkoutDaysAgo, blockProgress }) {
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

  // Rule 4, 2+ muscles below MEV this week (only meaningful if the user has
  // actually been training). For brand-new users with zero workouts every
  // muscle reads as below-MEV at 0 sets, so this rule used to fire on the
  // very first launch with "Several muscle groups are below their weekly
  // minimum", which is technically true but useless advice. Require the
  // user to have logged something so we're commenting on real adherence.
  if (blockProgress && blockProgress.length > 0) {
    const totalSetsThisWeek = blockProgress.reduce((s, p) => s + (p.actual ?? 0), 0);
    const belowMev = blockProgress.filter(p => {
      const landmarks = VOLUME_LANDMARKS[p.muscle];
      return landmarks && landmarks.mev > 0 && p.actual < landmarks.mev;
    });
    if (totalSetsThisWeek > 0 && belowMev.length >= 2) {
      const muscleName = belowMev[0].label;
      return {
        headline: 'Muscle groups need attention',
        body: `A few muscle groups haven't had much work this week. Today's a good day to give ${muscleName} some attention.`,
        type: 'go',
      };
    }
  }

  // Rule 5, volume on track, low fatigue
  if (fatigueHistory.length >= 1) {
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
