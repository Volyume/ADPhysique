/**
 * workoutRecordLine.js — the live "are you on for a record" line (D87).
 *
 * Pure, no I/O. Given what the user has currently dialled into the weight and
 * reps steppers plus the exercise's set history, it returns the one line that
 * renders directly beneath those steppers: the bar to beat at rest, and a
 * named record flag the moment the current entry would break one.
 *
 * THE CONTRACT THAT MATTERS: this reuses detectPR, the same function
 * ActiveWorkoutScreen calls on log to fire the PR celebration, over the same
 * history shape (all-time sets for the exercise plus this session's sets,
 * WORKING sets only since C5-P15-01/D96, exactly as prHistory is assembled
 * in handleCompleteSet -- a warm-up is not a record attempt, and must not be
 * one either side of a comparison).
 * The screen must never promise a record it then fails to award, so the two
 * can only ever agree by construction. If detectPR's rules change, this line
 * changes with them and no edit here is needed.
 *
 * Returns null (render nothing new) for every case where chasing a record
 * would be wrong or meaningless:
 *   - a warm-up set,
 *   - a non weight-and-reps schema (duration/distance reuse the weight field,
 *     so a weight x reps detector would report nonsense — the same
 *     isWeightReps gate the logger already applies to PR detection),
 *   - an empty history: the first-ever set of an exercise beats nothing
 *     (Wave A A1's honest first-lift rule).
 */
import { calculate1RM, detectPR } from './algorithms';

// Trims a trailing .0 so 92.5kg keeps its half plate and 90kg stays "90".
function formatWeight(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '';
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
}

function repsOf(set) {
  return Number(set?.actualReps ?? set?.actual_reps) || 0;
}

/**
 * @param {object} args
 * @param {number|string} args.weight   currently entered weight
 * @param {number|string} args.reps     currently entered reps
 * @param {Array}  args.historySets     all-time sets + this session's sets
 * @param {string} args.units           'kg' | 'lbs'
 * @param {boolean} args.isWarmup       the current set is a warm-up
 * @param {string} args.exerciseType    schema of the active exercise
 * @returns {null | {
 *   isRecord: boolean, bestLabel: string, reasons: string[],
 *   headline: string, a11y: string,
 * }}
 */
export function buildRecordLine({
  weight,
  reps,
  historySets = [],
  units = 'kg',
  isWarmup = false,
  exerciseType = 'weight_reps',
  loadSemantics = 'total',
  // EL-7: the CURRENTLY-DIALLED set's evidence class (circuit/ballistic/
  // circuit_ballistic/null), when the caller knows it (e.g. the live
  // screen resolving a circuit station or a ballistic exercise). A
  // ballistic set is never a record attempt, same as a warm-up.
  evidenceClass = null,
} = {}) {
  // Same gate the logger applies before calling detectPR at all.
  const isWeightReps = exerciseType === 'weight_reps' || exerciseType === 'weighted_bodyweight';
  const isBallistic = typeof evidenceClass === 'string' && evidenceClass.includes('ballistic');
  if (!isWeightReps || isWarmup || isBallistic) return null;

  const history = (Array.isArray(historySets) ? historySets : []).filter(Boolean);
  // The first-ever set beats nothing; the logger celebrates it as a starting
  // point, never as a record, so there is no bar to display yet either.
  if (history.length === 0) return null;

  // D107-2: on an assistance machine every comparison inverts (less
  // assistance is stronger), so the reference set is the LOWEST assistance
  // (most reps as tie-break) and an estimated max is meaningless.
  const assisted = loadSemantics === 'assisted';

  // The reference set is the best by estimated max: the single honest answer
  // to "what is my best set here", rather than the heaviest weight (which can
  // be a low-rep set) or the most reps (which can be a light one).
  let best = null;
  let bestE1rm = 0;
  for (const s of history) {
    // EL-7: ballistic rows never contribute the reference/"bar to beat" -
    // mirrors detectPR's own isE1rmEligibleRow gate (this module's whole
    // contract is agreeing with detectPR by construction). Circuit rows
    // stay eligible: a circuit set can be a PR (CAP-14 precedent).
    const evidenceClass = s.evidenceClass ?? s.evidence_class ?? null;
    if (typeof evidenceClass === 'string' && evidenceClass.includes('ballistic')) continue;
    const w = Number(s.weight) || 0;
    const r = repsOf(s);
    if (w <= 0 || r <= 0) continue;
    if (assisted) {
      if (!best || w < best.weight - 0.001
        || (Math.abs(w - best.weight) < 0.1 && r > best.reps)) {
        best = { weight: w, reps: r };
      }
      continue;
    }
    const e = calculate1RM(w, r);
    if (e > bestE1rm) {
      bestE1rm = e;
      best = { weight: w, reps: r };
    }
  }
  if (!best) return null;

  const bestLabel = assisted
    ? `Best ${formatWeight(best.weight)}${units} assistance × ${best.reps}`
    : `Best ${formatWeight(best.weight)}${units} × ${best.reps}`;

  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  // Nothing dialled in yet: show the bar, claim nothing.
  if (w <= 0 || r <= 0) {
    return { isRecord: false, bestLabel, reasons: [], headline: '', a11y: bestLabel };
  }

  // The same call, with the same history, that runs on log. loadSemantics
  // rides on the exercise argument so the assisted inversion (D107-2) is
  // the SAME branch on both sides of the D87 agreement contract.
  const prs = detectPR({ weight: w, actualReps: r }, history, { loadSemantics }, units);
  if (!prs.length) {
    return { isRecord: false, bestLabel, reasons: [], headline: '', a11y: bestLabel };
  }

  // Each record type is named separately because they do not move together:
  // a heavier weight for fewer reps can be a heaviest-weight record while not
  // being an estimated-max one. Saying only "PR" would let the user read the
  // smaller achievement as the bigger one.
  const reasons = [];
  for (const pr of prs) {
    if (pr.type === 'heaviest_weight') {
      reasons.push(pr.previousValue
        ? `Heaviest ever, best is ${formatWeight(pr.previousValue)}${units}`
        : 'Heaviest ever on this exercise');
    } else if (pr.type === 'most_reps_at_weight') {
      reasons.push(assisted
        ? `Most reps at ${formatWeight(w)}${units} assistance, best is ${pr.previousValue}`
        : `Most reps at ${formatWeight(w)}${units}, best is ${pr.previousValue}`);
    } else if (pr.type === '1rm_estimate') {
      reasons.push(`Est. max ~${Math.round(pr.value)}${units} beats ${Math.round(pr.previousValue)}${units}`);
    } else if (pr.type === 'least_assistance') {
      reasons.push(`Least assistance ever, best is ${formatWeight(pr.previousValue)}${units}`);
    }
  }

  const headline = 'Record set if you hit this';
  return {
    isRecord: true,
    bestLabel,
    reasons,
    headline,
    a11y: `${headline}. ${reasons.join('. ')}`,
  };
}
