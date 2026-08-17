/**
 * B2 — the FREE guided beginner on-ramp (founder decision 4a: free).
 *
 * Pure, deterministic scoring that maps the three-question micro-quiz
 * (goal, equipment, days per week) onto ONE of the difficulty-0 starter
 * plans in the Plan Library. No AI, no randomness, no network: the same
 * answers always produce the same plan, regardless of input order.
 *
 * Hard rules (tested):
 *  - only difficulty-0 plans are ever candidates, so a beginner is never
 *    routed onto an intermediate or advanced plan;
 *  - equipment is a hard FILTER, not a score bump. Someone training at
 *    home is never handed a barbell plan they cannot do.
 *
 * Extends the Plan Library quiz's getQuizRecommendation-style scoring
 * with the two questions int-03 F4 found missing: days per week and an
 * experience-safe candidate pool (the difficulty-0 filter stands in for
 * the experience question, because this flow only runs for new users).
 */

// The micro-quiz definition. Three plain questions, no jargon. Option
// labels are user-facing (British English); keys are stable identifiers
// used by the scoring below.
export const FREE_STARTER_STEPS = Object.freeze([
  {
    key: 'goal',
    question: 'What do you want from training?',
    options: [
      { key: 'build_muscle', label: 'Build muscle', icon: 'barbell-outline' },
      { key: 'get_stronger', label: 'Get stronger', icon: 'trending-up-outline' },
      { key: 'general_fitness', label: 'General fitness', icon: 'heart-outline' },
    ],
  },
  {
    key: 'equipment',
    question: 'Where will you train?',
    options: [
      { key: 'full_gym', label: 'A gym with full equipment', icon: 'fitness-outline' },
      { key: 'dumbbell', label: 'Dumbbells at home', icon: 'barbell-outline' },
      { key: 'home', label: 'At home, no equipment', icon: 'home-outline' },
    ],
  },
  {
    key: 'days',
    question: 'How many days a week can you train?',
    options: [
      { key: 2, label: '2 days', icon: 'calendar-outline' },
      { key: 3, label: '3 days', icon: 'calendar-outline' },
      { key: 4, label: '4 days', icon: 'calendar-outline' },
    ],
  },
]);

function hasTag(plan, tag) {
  return plan && typeof plan.tags === 'string'
    ? plan.tags.toLowerCase().includes(tag.toLowerCase())
    : false;
}

/** Days per week a library plan is built for, read from its days:N tag. */
export function getPlanDays(plan) {
  const m = /days:(\d+)/.exec(plan && typeof plan.tags === 'string' ? plan.tags : '');
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Equipment hard-filter shared by every plan-recommendation quiz in the app
 * (this free 3-question starter and the in-library 2-question quiz,
 * PlanLibraryScreen.js's QUIZ_STEPS). 'home' and 'bodyweight' are the same
 * concept spelled two ways (this quiz's own FREE_STARTER_STEPS uses 'home';
 * the library quiz's QUIZ_STEPS uses 'bodyweight'), normalised here so both
 * quizzes read one rule instead of two independently-maintained copies:
 *  - no equipment -> bodyweight plans only;
 *  - dumbbells -> dumbbell plans, with bodyweight as an acceptable fallback;
 *  - full gym -> any plan works.
 *
 * Campaign 24 Wave A (WAVE-A-FINDINGS.md DUPLICATION): PlanLibraryScreen.js
 * used to re-derive this by hand as `quizEquipmentAllows`, acknowledged
 * in-file (C5-P10-03 comment) as manually kept in sync rather than shared.
 */
export function planEquipmentAllows(plan, equipment) {
  if (!plan) return false;
  const eq = equipment === 'home' ? 'bodyweight' : equipment;
  const isDumbbell = hasTag(plan, 'equipment:dumbbell');
  const isBodyweight = hasTag(plan, 'equipment:bodyweight');
  if (eq === 'bodyweight') return isBodyweight;
  if (eq === 'dumbbell') return isDumbbell || isBodyweight;
  return true; // full gym, or no answer: everything is performable
}

/**
 * Is this plan even allowed in the starter pool for the given equipment?
 * Difficulty 0 only, always, on top of the shared equipment filter above.
 */
export function isStarterCandidate(plan, equipment) {
  if (!plan || plan.difficulty !== 0) return false;
  return planEquipmentAllows(plan, equipment);
}

/**
 * The equipment-fit + goal-fit core shared by every plan-recommendation
 * quiz's scorer. `includeDivisions` folds in the one place the two
 * quizzes' goal vocabularies actually diverge: the library quiz's
 * `stage_prep` goal and its `category:division` plans, which this free
 * starter quiz never sees (no difficulty-0 plan is a division plan). Each
 * caller layers its own extra terms on top (this starter quiz's days-per-
 * week/gender/barbell-fallback bonuses in scoreStarterPlan below; the
 * library quiz has none beyond this shared core).
 *
 * Campaign 24 Wave A (WAVE-A-FINDINGS.md DUPLICATION): previously
 * PlanLibraryScreen.getQuizRecommendation independently re-implemented this
 * scoring, so the same user answering equivalent questions in the starter
 * flow and the in-library quiz in the same session could get two different
 * plans, and a future rule change was not guaranteed to reach both.
 */
export function scorePlanRecommendation(plan, answers, { includeDivisions = false } = {}) {
  const { goal } = answers || {};
  const equipment = answers?.equipment === 'home' ? 'bodyweight' : answers?.equipment;
  const isDumbbell = hasTag(plan, 'equipment:dumbbell');
  const isBodyweight = hasTag(plan, 'equipment:bodyweight');
  let score = 0;

  if (includeDivisions) {
    const isDivision = hasTag(plan, 'category:division');
    if (isDivision && goal === 'stage_prep') score += 5;
    else if (isDivision) score -= 5;
  }

  // Equipment fit (within the already-filtered pool).
  if (equipment === 'full_gym' && !isDumbbell && !isBodyweight) score += 3;
  if (equipment === 'dumbbell' && isDumbbell) score += 3;
  if (equipment === 'bodyweight' && isBodyweight) score += 3;

  // Goal fit.
  if (goal === 'build_muscle' && hasTag(plan, 'goal:build_muscle')) score += 3;
  if (goal === 'get_stronger' && hasTag(plan, 'goal:get_stronger')) score += 3;
  if ((goal === 'general_fitness' || goal === 'conditioning') && hasTag(plan, 'goal:conditioning')) score += 3;

  if (hasTag(plan, 'featured')) score += 1;

  return score;
}

/**
 * Score one candidate against the answers. Higher is better. Pure and
 * deterministic; ties are broken by name in getFreeStarterRecommendation
 * so the result never depends on the order plans arrive in.
 *
 * Delegates the equipment-fit + goal-fit core to the shared
 * scorePlanRecommendation above (Campaign 24 Wave A dedup) and layers this
 * quiz's own extra terms on top: the strength-goal barbell fallback (no
 * difficulty-0 plan targets strength directly today), the general-fitness
 * full-body nudge, the days-per-week closeness bonus (this starter quiz
 * asks a third "days" question the library quiz does not), and the
 * gender:all tiebreak (this quiz never asks gender).
 */
export function scoreStarterPlan(plan, answers) {
  const { goal, days } = answers || {};
  let score = scorePlanRecommendation(plan, answers, { includeDivisions: false });

  if (goal === 'get_stronger' && hasTag(plan, 'barbell')) score += 2;
  if (goal === 'general_fitness' && hasTag(plan, 'full_body')) score += 1;

  // Days per week: closest plan wins. All current starters run three days
  // a week, so this is a no-op today, but it keeps the answer honest the
  // moment a 2- or 4-day starter lands in the library.
  const pd = getPlanDays(plan);
  if (pd != null && typeof days === 'number') {
    const diff = Math.abs(pd - days);
    if (diff === 0) score += 2;
    else if (diff === 1) score += 1;
  }

  // Gentle tiebreak: the quiz never asks gender, so prefer plans built
  // for everyone.
  if (hasTag(plan, 'gender:all')) score += 1;

  return score;
}

/**
 * The recommendation: the highest-scoring difficulty-0 plan that the
 * user's equipment allows, with a stable name tiebreak. Returns null
 * when no candidate exists (empty or unseeded library).
 */
export function getFreeStarterRecommendation(answers, plans) {
  if (!answers || !Array.isArray(plans)) return null;
  const candidates = plans.filter(p => isStarterCandidate(p, answers.equipment));
  if (candidates.length === 0) return null;
  const scored = candidates
    .map(plan => ({ plan, score: scoreStarterPlan(plan, answers) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const an = String(a.plan.name || '');
      const bn = String(b.plan.name || '');
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
  return scored[0].plan;
}
