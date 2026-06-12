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
 * Is this plan even allowed in the starter pool for the given equipment?
 * Difficulty 0 only, always. Equipment is a hard filter:
 *  - home (no equipment) -> bodyweight plans only;
 *  - dumbbells -> dumbbell plans, with bodyweight as an acceptable fallback;
 *  - full gym -> any starter plan works.
 */
export function isStarterCandidate(plan, equipment) {
  if (!plan || plan.difficulty !== 0) return false;
  const isDumbbell = hasTag(plan, 'equipment:dumbbell');
  const isBodyweight = hasTag(plan, 'equipment:bodyweight');
  if (equipment === 'home') return isBodyweight;
  if (equipment === 'dumbbell') return isDumbbell || isBodyweight;
  return true;
}

/**
 * Score one candidate against the answers. Higher is better. Pure and
 * deterministic; ties are broken by name in getFreeStarterRecommendation
 * so the result never depends on the order plans arrive in.
 */
export function scoreStarterPlan(plan, answers) {
  const { goal, equipment, days } = answers || {};
  const isDumbbell = hasTag(plan, 'equipment:dumbbell');
  const isBodyweight = hasTag(plan, 'equipment:bodyweight');
  let score = 0;

  // Equipment fit (within the already-filtered pool): a full-gym user is
  // steered to the gym plans; a dumbbell user to the dumbbell plan over
  // the bodyweight fallback.
  if (equipment === 'full_gym' && !isDumbbell && !isBodyweight) score += 3;
  if (equipment === 'dumbbell' && isDumbbell) score += 3;
  if (equipment === 'home' && isBodyweight) score += 3;

  // Goal fit. Every starter plan builds muscle; the goal answer shades
  // the choice rather than overriding equipment.
  if (goal === 'build_muscle' && hasTag(plan, 'goal:build_muscle')) score += 2;
  if (goal === 'get_stronger') {
    if (hasTag(plan, 'goal:get_stronger')) score += 3;
    // No difficulty-0 plan targets strength directly today; the barbell
    // full-body starter is the strength-friendliest pick.
    if (hasTag(plan, 'barbell')) score += 2;
  }
  if (goal === 'general_fitness') {
    if (hasTag(plan, 'goal:conditioning')) score += 2;
    if (hasTag(plan, 'full_body')) score += 1;
  }

  // Days per week: closest plan wins. All current starters run three days
  // a week, so this is a no-op today, but it keeps the answer honest the
  // moment a 2- or 4-day starter lands in the library.
  const pd = getPlanDays(plan);
  if (pd != null && typeof days === 'number') {
    const diff = Math.abs(pd - days);
    if (diff === 0) score += 2;
    else if (diff === 1) score += 1;
  }

  // Gentle tiebreaks: the quiz never asks gender, so prefer plans built
  // for everyone; featured plans are the library's own quality signal.
  if (hasTag(plan, 'gender:all')) score += 1;
  if (hasTag(plan, 'featured')) score += 1;

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
