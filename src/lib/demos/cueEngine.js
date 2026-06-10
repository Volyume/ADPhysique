/**
 * cueEngine — deterministic contextual cue selection.
 *
 * Picks the ONE coaching cue most relevant to this user, this exercise, right
 * now, instead of a static list. Pure rules over read-only engine outputs —
 * no LLM, no randomness, never modifies the coaching engine (CLAUDE.md).
 *
 * Precedence (first match wins):
 *   1. first_time  — never logged this exercise → low-threat teaching framing
 *                    (research: polished demos backfire for beginners; lead
 *                    with the common mistake and "start light").
 *   2. plateau     — detectPlateau() fired → surface its resolution, including
 *                    the top ranked swap when the engine says swap.
 *   3. recovery    — this week's coach signal is 'reduce' (or deload) →
 *                    control-over-load cue.
 *   4. default     — load-aware technique cue: heavier rep targets get an
 *                    external "drive" cue, lighter targets an internal
 *                    "feel the muscle" cue (attentional-focus research).
 *
 * All copy: British English, plain language (no MEV/MRV/RIR jargon).
 */

import { getWorkoutSetsForExercise, getLatestCoachOutput, getAllExercises } from '../database';
import { detectPlateau } from '../algorithms';
import { rankSwaps } from '../swapEngine';
import { FORM_TIPS } from '../formTips';
import { getSampleDemo } from './sampleDemos';

/** First sentence of a prose tip, for one-line surfaces. */
function firstSentence(text) {
  if (!text) return null;
  const m = String(text).match(/^[^.!?]+[.!?]/);
  return (m ? m[0] : text).trim();
}

function defaultCueFor(exercise, repMin) {
  const sample = getSampleDemo(exercise?.name);
  const structured = exercise?.formCues?.cues?.[0] ?? sample?.formCues?.cues?.[0] ?? null;
  const prose = firstSentence(FORM_TIPS[exercise?.name] ?? exercise?.notes);
  const heavy = (repMin ?? exercise?.defaultRepMin ?? 8) <= 6;
  // Load-aware focus: external cue for heavy strength work, internal
  // "feel it" cue for lighter hypertrophy work.
  const focus = heavy
    ? 'Heavy set: think about driving the weight, not the muscle.'
    : 'Lighter set: slow down and feel the target muscle do the work.';
  return { cue: structured ?? prose ?? focus, sub: structured || prose ? focus : null };
}

/**
 * Pure selector. All inputs pre-fetched so it is trivially testable.
 * Returns { kind, headline, cue, sub?, swap? } — `cue` is always present.
 */
export function selectCue({ exercise, sessions = [], coachOutput = null, swapCandidate = null, repMin = null }) {
  const name = exercise?.name ?? 'this exercise';

  // 1. First time: teach, don't intimidate.
  if (!sessions.length) {
    const sample = getSampleDemo(name);
    const mistake = exercise?.commonMistakes?.[0] ?? sample?.commonMistakes?.[0] ?? null;
    return {
      kind: 'first_time',
      headline: 'First time on this one',
      cue: mistake
        ? `Common mistake: ${mistake.charAt(0).toLowerCase()}${mistake.slice(1)}. Start light.`
        : 'Start light. Pick a weight you could lift 15 to 20 times.',
      sub: firstSentence(FORM_TIPS[name]),
    };
  }

  // 2. Plateau: surface the engine's resolution.
  const plateauResult = detectPlateau(sessions, exercise?.defaultRepMin ?? 6, exercise?.defaultRepMax ?? 12);
  if (plateauResult.plateau) {
    if (plateauResult.resolution === 'swap_exercise' && swapCandidate) {
      return {
        kind: 'plateau',
        headline: `No progress in ${plateauResult.consecutiveStalls + 1} sessions`,
        cue: `A fresh stimulus may help. ${swapCandidate.reason ?? ''}`.trim(),
        swap: { name: swapCandidate.exercise?.name, reason: swapCandidate.reason },
      };
    }
    return {
      kind: 'plateau',
      headline: `No progress in ${plateauResult.consecutiveStalls + 1} sessions`,
      cue: 'Try a different rep range for a few weeks: if you have been going heavy, lighten up for more reps, or the reverse.',
    };
  }

  // 3. Recovery week: the coach already said ease off.
  const signal = coachOutput?.adjustments?.training?.signal ?? null;
  if (coachOutput?.deloadSuggested || signal === 'reduce') {
    return {
      kind: 'recovery',
      headline: 'Recovery-focused week',
      cue: 'Leave a rep or two in the tank today. Control beats load this week.',
    };
  }

  // 4. Default: load-aware technique cue.
  const d = defaultCueFor(exercise, repMin);
  return { kind: 'default', headline: null, cue: d.cue, sub: d.sub };
}

/**
 * Loader: fetches the read-only inputs and runs the selector.
 * Fail-soft: any data error degrades to the default cue, never throws.
 */
export async function getContextualCue(userId, exercise, { repMin = null } = {}) {
  try {
    if (!userId || !exercise?.id) return selectCue({ exercise, repMin });

    const mySets = await getWorkoutSetsForExercise(exercise.id, userId, 200);
    const byWorkout = {};
    for (const s of mySets ?? []) {
      if (!byWorkout[s.workoutId]) byWorkout[s.workoutId] = [];
      byWorkout[s.workoutId].push(s);
    }
    const sessions = Object.values(byWorkout).slice(0, 8);

    let coachOutput = null;
    try { coachOutput = await getLatestCoachOutput(userId); } catch (_) { /* free tier / none */ }

    // Only rank swaps when a plateau actually resolved to swap (saves a read).
    let swapCandidate = null;
    const plateauResult = detectPlateau(sessions, exercise?.defaultRepMin ?? 6, exercise?.defaultRepMax ?? 12);
    if (plateauResult.plateau && plateauResult.resolution === 'swap_exercise') {
      try {
        const all = await getAllExercises(userId);
        swapCandidate = rankSwaps(exercise, all ?? [], { numResults: 1 })[0] ?? null;
      } catch (_) { /* cue still works without the suggestion */ }
    }

    return selectCue({ exercise, sessions, coachOutput, swapCandidate, repMin });
  } catch (_) {
    return selectCue({ exercise, repMin });
  }
}
