/**
 * COMP-030 — the deterministic pre-account plan PREVIEW (§4B step 4).
 *
 * Pure and local: given the quiz answers it derives the plan SHAPE (split,
 * weekly structure, division volume bias) — the "built for me" reveal-lite that
 * the full reveal then honours. NO calories or macros: those need body weight,
 * which is asked AFTER consent ("Calories and protein come after — they need
 * your weight, and we'll ask permission first."). Nothing here is special-
 * category data, nothing is persisted, nothing is transmitted.
 */

import { GOAL_LABELS, PHASE_LABELS } from '../coachingGoals';
import { DIVISION_MATRIX } from '../planEngine';

// Split shape by training days — the same logic the builder uses, surfaced early.
function splitForDays(days, experience, goal) {
  const d = Math.max(2, Math.min(7, Number(days) || 3));
  // Division-first, exactly like the builder: the six specialised divisions take
  // their split name straight from the division matrix regardless of day count
  // or experience (planEngine selectSplit is only used for the non-division
  // goals). Mirroring it here keeps the teaser honest for division users —
  // bikini is "Glute Focus", not "Full body".
  const division = DIVISION_MATRIX[goal];
  if (division) {
    return { name: division.label, detail: `A ${d}-day ${division.label} split` };
  }
  // Non-division goals (general, bodybuilding, women's bodybuilding, strength…)
  // use the day-count selector. At 3 days the builder gives advanced/competitive
  // lifters a push/pull/legs split rather than full body.
  const advanced = experience === 'advanced' || experience === 'competitive';
  if (d <= 3) {
    if (d === 3 && advanced) {
      return { name: 'Push / Pull / Legs', detail: 'A 3-day push, pull and legs split' };
    }
    return { name: 'Full body', detail: `${d} full-body days a week` };
  }
  if (d === 4) return { name: 'Upper / Lower', detail: 'Two upper and two lower days' };
  if (d === 5) return { name: 'Push / Pull / Legs +', detail: 'A 5-day push, pull and legs rotation' };
  return { name: 'Push / Pull / Legs', detail: `A ${d}-day push, pull and legs split` };
}

// Division volume bias — the identity-affirming hook (round-1 implication 7).
// A short, plain-English phrase, never jargon (no MEV/MRV/RIR).
function biasForGoal(goal) {
  const g = String(goal || '').toLowerCase();
  if (g.includes('classic') || g.includes('mens_physique') || g.includes('shoulders'))
    return 'biases shoulders and back width';
  if (g.includes('bikini') || g.includes('wellness') || g.includes('glute'))
    return 'biases glutes and hamstrings';
  if (g.includes('bodybuild') || g.includes('open'))
    return 'spreads volume evenly for full, balanced development';
  if (g.includes('strength') || g.includes('power'))
    return 'centres the big compound lifts';
  return 'is balanced across every muscle group';
}

function phaseLine(phase) {
  const p = String(phase || '').toLowerCase();
  if (p.includes('cut') || p.includes('lean') && p.includes('loss')) return 'while you lean down';
  if (p.includes('gain') || p.includes('bulk') || p.includes('grow')) return 'while you build size';
  return 'while you maintain';
}

/**
 * Build the preview from quiz answers. Returns plain strings for the screen.
 * @param {object} quiz { daysPerWeek, sessionLengthMinutes, experience, trainingGoal, trainingPhase, weakPoints[] }
 */
export function buildPlanPreview(quiz = {}) {
  const split = splitForDays(quiz.daysPerWeek, quiz.experience, quiz.trainingGoal);
  const goalLabel = GOAL_LABELS?.[quiz.trainingGoal] || 'your goal';
  const bias = biasForGoal(quiz.trainingGoal);
  const phase = quiz.trainingPhase ? (PHASE_LABELS?.[quiz.trainingPhase] || null) : null;

  const weakPoints = Array.isArray(quiz.weakPoints) ? quiz.weakPoints.slice(0, 3) : [];
  const sessionMins = Number(quiz.sessionLengthMinutes) || 60;

  // The headline line that updates with the division selection (§4A/§4B).
  const headline = `Your plan ${bias}.`;
  const structure = `${split.name}: ${split.detail}, around ${sessionMins} minutes a session.`;

  return {
    splitName: split.name,
    headline,
    structure,
    goalLabel,
    phaseLabel: phase,
    phaseLine: phaseLine(quiz.trainingPhase),
    weakPoints,
    // The honesty line the blueprint mandates (no hidden surprise later).
    nutritionNote: 'Calories and protein come after. They need your weight, and we ask permission first.',
  };
}
