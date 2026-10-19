/**
 * cameraTips - the camera's setup line per exercise (D229 addendum 12).
 *
 * Founder, 2026-10-16: "tips on how to best set up a certain exercise for the
 * best camera angle for that exercise ... suggestions where to place and
 * angle or brighten their camera for the absolute best shot ... Height angle
 * distance and things? And in line with what the share shows optimally?"
 *
 * A pure, deterministic table: the exercise's name, movement pattern and
 * equipment pick ONE plain sentence about the camera (where to put the phone,
 * how high, how far back) and nothing about how to lift. The sentences come
 * from docs/audit/video-shares-2026-10-15/05-CAMERA-ANGLES-RESEARCH.md
 * section 9 (form-check guides and coaches' filming advice, with the
 * research's own inferred defaults for the lifts no source covers), trimmed
 * of the "For a squat," lead-in because the camera already names the set.
 * The heights follow the research's section 5.3: the phone near the height
 * of the middle of the movement, so the moment that matters lands in the
 * clear band between the share card's words.
 *
 * Rules the research set (its section 8) and this file keeps: no form
 * diagnosis, no "film your heaviest set", no appearance words, no brand or
 * purchase, no technical words, no exact metres as the only guide, no
 * promise that the card will look good.
 *
 * Name regexes run first (the most specific signal), then the movement
 * pattern the library carries (`movement_pattern`: squat, hinge, push, pull,
 * lunge, isolation, power, carry, core, plyometric), then the equipment. An
 * exercise nothing matches gets the general line, which is also the camera's
 * line when it opens without an exercise (the summary, the share).
 */

export const CAMERA_TIP_KEYS = Object.freeze([
  'squat', 'hinge', 'hip_thrust', 'bench', 'push_up', 'overhead', 'vertical_pull',
  'row', 'lunge', 'machine', 'arms', 'raise', 'olympic', 'swing', 'general',
]);

// Founder report 2026-10-19 (camera hard to read): each tip is now one short
// plain line that fits a single pill; the meaning (side or front, height,
// distance) is unchanged.
export const CAMERA_TIPS = Object.freeze({
  squat: 'Phone at hip height, slightly to one side, a few steps back.',
  hinge: 'Film from the side, phone between knee and hip height, a few steps back.',
  hip_thrust: 'Film from the side, phone at bench height, a few steps back.',
  bench: 'Film from the side, phone at bench height, far enough back to fit you.',
  push_up: 'Film from the side, phone at knee height, far enough back to fit head to heels.',
  overhead: 'Film from the side, phone at chest height, far enough back for your hands overhead.',
  vertical_pull: 'Film from the side, phone at waist height, far enough back to fit the bar.',
  row: 'Film from the side, phone at hip height, a few steps back.',
  lunge: 'Film from the side, phone at hip height, a few steps back to keep both feet in.',
  machine: 'Film from the side, phone at hip height, far enough back to see the moving part.',
  arms: 'Film from the side, phone at waist height, a few steps back.',
  raise: 'Film from the front, phone at waist height, far enough back to fit both arms raised.',
  olympic: 'Film from the side, phone at chest height, far enough back to keep the bar in shot.',
  swing: 'Film from the side, phone at hip height, a few steps back to keep the bell in shot.',
  general: 'Phone upright at hip height, a few steps back, slightly to one side.',
});

// Name rules, in order: the first match wins. Each is a signal a person
// would recognise in the exercise's own name; a machine's moving part is
// what the machine line asks to keep in shot, so the leg machines and the
// stack-and-pad machines are named before the free-weight patterns that
// share a word with them ("leg curl" before "curl", "leg press" before
// "press").
const NAME_RULES = Object.freeze([
  ['swing', /\b(kettlebell|kb)\s*swing|\bswings?\b/i],
  ['olympic', /\b(power\s*)?(clean|snatch|jerk)\b/i],
  ['hip_thrust', /\bhip\s*thrust|glute\s*bridge\b/i],
  ['lunge', /\blunge|split\s*squat|step[-\s]?up|bulgarian\b/i],
  ['push_up', /\b(push|press)[-\s]?ups?\b/i],
  ['machine', /\bleg\s*(press|extension|curl)|pec\s*deck|\bmachine\b/i],
  ['raise', /\b(lateral|side|front|rear\s*delt)\s*raise|reverse\s*fl(y|ye)\b/i],
  ['vertical_pull', /\b(pull|chin)[-\s]?ups?|pull[-\s]?downs?|lat\s*pull\b/i],
  ['overhead', /\b(overhead|shoulder|military|push|arnold|viking)\s*press|\bohp\b/i],
  ['bench', /\b(bench|chest|floor|incline|decline|dumbbell|db)\s*press|\bfl(y|ye)s?\b/i],
  ['hinge', /\bdeadlift|\brdl\b|romanian|good\s*morning|hyperextension|back\s*extension|hip\s*hinge\b/i],
  ['squat', /\bsquat|\bgoblet\b/i],
  ['row', /\brows?\b|\bpullover\b/i],
  ['arms', /\bcurls?\b|\b(tricep|bicep)s?\b|pushdown|kick[-\s]?back|skull\s*crusher|\bextensions?\b|\bdips?\b/i],
]);

// A Smith machine lift is the lift, not "a machine": the word is dropped
// before the name rules run so "Smith Machine Squat" reads as a squat.
const SMITH_RE = /\bsmith\s*machine\b/gi;

// The movement pattern, when the name said nothing. A push with no named
// form (a landmine press, a press nobody named) gets the general line rather
// than a guess at bench or overhead; a pull is nearly always a row.
const PATTERN_RULES = Object.freeze({
  squat: 'squat',
  hinge: 'hinge',
  lunge: 'lunge',
  pull: 'row',
  power: 'olympic',
});

/**
 * The tip key for an exercise. Pure: the same fields always give the same
 * key. `name` is read first, then `equipment` (a machine with no other
 * signal gets the machine line), then `movementPattern`. Missing or unknown
 * fields fall through to 'general'.
 */
export function cameraTipKeyFor({ name, movementPattern, equipment } = {}) {
  const n = (typeof name === 'string' ? name : '').replace(SMITH_RE, 'Smith');
  for (const [key, re] of NAME_RULES) {
    if (re.test(n)) return key;
  }
  const eq = typeof equipment === 'string' ? equipment.toLowerCase() : '';
  if (/machine|selectorised|selectorized|plate[-\s]?loaded/.test(eq)) return 'machine';
  const p = typeof movementPattern === 'string' ? movementPattern.toLowerCase() : '';
  if (PATTERN_RULES[p]) return PATTERN_RULES[p];
  return 'general';
}

/** The sentence the camera shows while it waits, for this exercise. */
export function cameraTipFor(exercise) {
  return CAMERA_TIPS[cameraTipKeyFor(exercise || {})] || CAMERA_TIPS.general;
}
