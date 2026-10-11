/* global test */
/**
 * render-structure-plans.jest.js -- writes 12-STRUCTURE-PLANS-RENDERED.md: the
 * structure engine's plans (src/lib/structure, register D222) as a coach or
 * the person training would read them, for the adversarial audits and the
 * founder's sign-off.
 *
 * How to run: npx jest --roots=docs/audit/plan-builder-map-2026-10-11/tools
 *   --testMatch='**' '/render-structure-plans.jest.js' (one pattern, no space).
 * It calls the real engine with the real seeded library
 * (campaign16.helpers LIBRARY). Nothing is edited but the output file.
 */
const fs = require('fs');
const path = require('path');
const { buildStructurePlan } = require('../../../../src/lib/structure/engine');
const { CATEGORIES, DAY_COUNTS, PROGRESSION } = require('../../../../src/lib/structure/rulebook');
const { checkPlan } = require('../../../../src/lib/structure/checker');
const { senseCheck } = require('../../../../src/lib/structure/sense');
const { LIBRARY } = require('../../../../src/lib/__tests__/campaign16.helpers');

const OUT = path.resolve(__dirname, '../12-STRUCTURE-PLANS-RENDERED.md');
const LABEL = {
  general: 'General', bodybuilding: 'Bodybuilding', classic_physique: 'Classic physique', mens_physique: "Men's physique",
  bikini: 'Bikini', wellness: 'Wellness', figure: 'Figure', womens_physique: "Women's physique",
};

// Plain names, the same words as the session names (round 5 user audit).
const NAMES = {
  side_delts: 'side delts', rear_delts: 'rear delts', front_delts: 'front delts', upper_back: 'upper back',
  glute_max: 'glutes', glute_med: 'side glutes', adductors: 'inner thighs', lats: 'lats',
};
const name = (m) => NAMES[m] || m.replace(/_/g, ' ');
const plural = (m) => /s$/.test(name(m));
// Whole sets, "about" where a count holds half sets from other exercises.
const sets = (n) => (Number.isInteger(n) ? `${n}` : `about ${Math.round(n)}`);
// A count short of a target never rounds up to it (round 6 user audit:
// "about 18 to about 20 sets a week, short of the 20").
const setsBelow = (n, target) => (!Number.isInteger(n) && Math.round(n) >= target ? `just under ${target}` : sets(n));
// A target is a goal, never "about" (round 6: "short of the about 16").
const goal = (n) => `${Math.round(n)}`;
// The app's own sentence for how sets are counted (MuscleRecoveryList's
// HALF_CREDIT_NOTE), printed once above any counted figure.
const COUNTED = 'Sets are counted as in the app: a set counts once for the muscle it works most and half for each muscle that helps.';

// What stops more sets, as a full clause (round 6 audits U6-2, C6-4,
// U6-13), said of the session it is true of (round 7 audits U7-3, C7-3:
// "each session that trains them" where only one session bound that way).
// `subject` names the session or sessions; `several` is true for two or
// more named sessions; `every` when the clause holds for each session that
// trains the muscle; `many` for a list of muscles ("them").
function phrase(code = 'rules', { subject, several = false, every = false, many = false, m = null }) {
  const it = many || (m && plural(m)) ? 'them' : 'it';
  const its = many || (m && plural(m)) ? 'their' : 'its';
  const is = many || (m && plural(m)) ? 'are' : 'is';
  const v = (one, more) => (several ? more : one);
  const [key, other] = code.split(':');
  switch (key) {
    case 'muscle_cap': return `${subject} already ${v('holds', 'hold')} the most sets of ${it} one session may hold`;
    case 'muscle_cap_other': return `more in ${subject} would give the ${name(other)} more sets than one session may hold`;
    case 'set_cap': return `${subject} ${v('is', 'are')} full`;
    case 'exercise_cap': return `${subject} already ${v('holds', 'hold')} the most exercises a session may`;
    case 'exercise_full': return `${subject} already ${v('gives', 'give')} ${it} the most exercises one session may, each at its most sets`;
    case 'balance_push': return 'more would put pressing ahead of pulling';
    case 'balance_legs': return 'more would put the quads too far ahead of the hamstrings';
    case 'recovery': return `more in ${subject} would leave too little recovery before ${it} ${is} trained again`;
    case 'joints_shoulder': return `more in ${subject} would load the shoulders beyond what the plan allows`;
    case 'joints_back': return `more in ${subject} would load the lower back beyond what the plan allows`;
    case 'joints_elbow': return `more in ${subject} would load the elbows beyond what the plan allows`;
    case 'joints_knee': return `more in ${subject} would load the knees beyond what the plan allows`;
    case 'variety': return every ? `the other exercises for ${it} are already in the neighbouring sessions` : `the other exercises for ${it} are already in the sessions next to ${subject}`;
    case 'movement': return every ? `no different exercise for ${it} is left in ${its} sessions` : `no different exercise for ${it} is left for ${subject}`;
    case 'no_choice': return `no other exercise for ${it} is available with this equipment`;
    // Never printed: the gate fails any report that leads with it.
    case 'room': throw new Error('a report led with "room"');
    default: return `more in ${subject} would break a rule of the plan`;
  }
}
function causeText(causes, { many = false, m = null } = {}) {
  if (!causes || !causes.groups.length) return 'more would break a rule of the plan';
  const pronoun = many || (m && plural(m)) ? 'them' : 'it';
  if (causes.every) {
    const subject = causes.single ? `the session that trains ${pronoun}` : `each session that trains ${pronoun}`;
    return phrase(causes.groups[0].code, { subject, every: true, many, m });
  }
  const said = [];
  for (const g of causes.groups) {
    const t = phrase(g.code, { subject: g.sessions.join(' and '), several: g.sessions.length > 1, many, m });
    if (!said.includes(t)) said.push(t);
  }
  return said.join(', and ');
}
// What holds a list of muscles back, as a noun (the wall of below-usual
// muscles, round 7 user audit U7-6).
const HOLDS = {
  muscle_cap: 'the most sets of one muscle a session may hold', set_cap: 'full sessions', exercise_cap: 'the most exercises a session may hold',
  exercise_full: 'the most exercises of one muscle a session may hold, each at its most sets', muscle_cap_other: "another muscle's most sets in the same session",
  balance_push: 'keeping pulling level with pressing', balance_legs: 'keeping the hamstrings level with the quads', recovery: 'recovery before the next session that trains them',
  joints_shoulder: 'the load on the shoulders', joints_back: 'the load on the lower back', joints_elbow: 'the load on the elbows', joints_knee: 'the load on the knees',
  variety: 'the same exercises in the neighbouring sessions', movement: 'no different exercise left in their sessions', no_choice: 'what the equipment offers',
};

// Why a week was not built, in words (round 6 user audit U6-5: "lower_c: 2
// exercises, 9 sets"; round 7 U7-10: no session name the person has never
// seen, and no "worth the trip").
function refusalText(refusal, days) {
  if (refusal.reason !== 'sense_failed') return refusal.detail;
  const f = refusal.failures[0];
  switch (f.code) {
    case 'S5': return `with this equipment one of the ${days} sessions would hold only ${f.exercises} exercises and ${f.sets} sets, too little for a session of its own`;
    case 'S1': return `${name(f.muscle)} would have no exercise of ${plural(f.muscle) ? 'their' : 'its'} own`;
    case 'S2': return `${name(f.muscle)} would not recover before ${plural(f.muscle) ? 'they are' : 'it is'} trained again`;
    case 'S14': return 'the legs would be trained in two sessions a week';
    default: return 'with this equipment the week would not hold together';
  }
}

function render(args, title) {
  const r = buildStructurePlan({ library: LIBRARY, ...args });
  const lines = [`### ${title}`, ''];
  if (!r.ok) {
    const days = r.refusal.suggestedDays;
    const len = r.refusal.suggestedLength;
    lines.push(`Not built: ${refusalText(r.refusal, args.days)}.${days ? ` ${days} days a week builds${len ? `, with sessions of ${len} minutes` : ''}.` : ''}`, '');
    return lines;
  }
  const c = checkPlan(r.plan);
  const sc = senseCheck(r.plan);
  lines.push(`Rulebook checks: ${c.ok ? 'pass' : c.failures.map((f) => f.code).join(', ')}. Sense checks: ${sc.ok ? 'pass' : sc.failures.map((f) => f.code).join(', ')}.`);
  // The messages below are worded as the app should show them (round 4 to
  // round 7 user audits).
  const rep = r.report;
  const lo = Math.round(Math.min(...rep.minutes));
  const hi = Math.round(Math.max(...rep.minutes));
  if (rep.needsLengthChoice) {
    const over = rep.overSessions.map((x) => `${x.name} comes to about ${x.minutes} minutes`).join('; ');
    lines.push(`Asks before saving: ${over}, against the ${args.lengthMinutes} minutes you chose. Sessions of ${rep.suggestedLength} minutes would hold this plan${rep.daysThatFit ? `, or ${rep.daysThatFit} days a week of ${args.lengthMinutes} minutes` : ''}.`);
  } else {
    lines.push(`Sessions run about ${lo === hi ? lo : `${lo} to ${hi}`} minutes.`);
  }
  // R55: a pick the week cannot give 2 more sets asks before saving; so does
  // a pick the equipment cannot train (round 7 user audit U7-4).
  const asked = new Set();
  const one = (rep.focusResults || []).length + (rep.focusUntrainable || []).length === 1;
  for (const f of rep.focusChoice || []) {
    asked.add(f.muscle);
    const n = name(f.muscle);
    const they = plural(f.muscle) ? 'they' : 'it';
    if (f.untrainable) {
      lines.push(`Asks before saving: your ${n} focus changes nothing, because with this equipment ${n} ${plural(f.muscle) ? 'have' : 'has'} no exercise of ${plural(f.muscle) ? 'their' : 'its'} own (${they} get about ${Math.round(f.after)} sets a week through other exercises). Choose ${args.days} days without the ${n} focus, or other equipment.`);
      continue;
    }
    const result = rep.focusResults.find((x) => x.muscle === f.muscle) || {};
    const gain = Math.round((f.after - f.before) * 2) / 2;
    const what = gain <= 0 ? `adds nothing at ${args.days} days` : `adds only ${gain === 1 ? '1 set' : `${gain} sets`} a week at ${args.days} days`;
    const why = result.reason === 'pull_balance' ? 'more pressing would need more pulling than the week can hold'
      : result.reason === 'hamstring_balance' ? 'more quad work would need more hamstring work than the week can hold'
        : causeText(result.causes, { m: f.muscle });
    const legs = result.legsOnce ? " Men's physique trains the legs in one session a week." : '';
    // Round 7 user audit (U7-2): the figure is the rebuild's, and the length
    // that week needs is said.
    const then = f.moreDays ? ` With ${f.moreDays} days a week ${n} ${plural(f.muscle) ? 'get' : 'gets'} ${sets(f.setsThen)}${f.lengthThen ? `, in sessions of ${f.lengthThen} minutes` : ''}.` : '';
    // Round 7 user audit (U7-11): a one-for-one swap says what it takes.
    const takes = one && (rep.focusTook || []).length
      ? `, which takes ${rep.focusTook.map((x) => `${x.from - x.to} ${x.from - x.to === 1 ? 'set' : 'sets'} a week from ${name(x.muscle)}`).join(' and ')}` : '';
    const choose = [f.moreDays ? `${f.moreDays} days a week` : null, `${args.days} days without the ${n} focus`, `${args.days} days with it as it is${takes}`].filter(Boolean);
    lines.push(`Asks before saving: your ${n} focus ${what}, because ${why}.${legs}${then} Choose ${choose.slice(0, -1).join(', ')}, or ${choose[choose.length - 1]}.`);
  }
  // Round 7 user audit (U7-13): a week smaller than one day fewer says so.
  const fewer = rep.fewerSetsThan;
  const more = fewer ? `, with about ${fewer.sets} ${fewer.sets === 1 ? 'set' : 'sets'} more` : '';
  if (rep.sameAsFewerDays) lines.push(`${rep.sameAsFewerDays} days a week give much the same week${fewer && fewer.days === rep.sameAsFewerDays ? more : ''}: the extra day mostly spreads the same work.`);
  else if (fewer) lines.push(`${fewer.days} days a week carry about ${fewer.sets} ${fewer.sets === 1 ? 'set' : 'sets'} more than this week: the extra day spreads the work more thinly.`);
  const counted = [];
  // Round 7 user audit (U7-1: lats with no exercise of their own, at 5 of
  // their minimum 10, were said only in a footer): first, in plain words.
  for (const u of rep.untrainableSets || []) {
    if (asked.has(u.muscle)) continue;
    const n = name(u.muscle);
    const pl = plural(u.muscle);
    counted.push(`With this equipment ${n} ${pl ? 'have' : 'has'} no exercise of ${pl ? 'their' : 'its'} own: other exercises give ${pl ? 'them' : 'it'} about ${Math.round(u.sets)} counted sets a week, ${u.sets >= u.minimum ? `which meets ${pl ? 'their' : 'its'}` : 'against a'} minimum of ${u.minimum}.`);
  }
  // Round 7 user audit (U7-12): the minimum is the minimum, not "the usual
  // minimum".
  for (const k of rep.kitShort || []) {
    counted.push(`With this equipment ${name(k.muscle)} ${plural(k.muscle) ? 'have' : 'has'} one exercise: ${sets(k.sets)} counted sets a week, against a minimum of ${k.minimum}.`);
  }
  for (const m of rep.focusIgnored || []) lines.push(`Your ${name(m)} focus changes nothing: this category trains ${name(m)} only through other exercises.`);
  for (const f of rep.focusResults || []) {
    if (asked.has(f.muscle)) continue;
    const n = name(f.muscle);
    if (f.reason === 'reached') {
      counted.push(`Your ${n} focus: ${sets(f.before)} to ${sets(f.after)} sets a week.`);
      continue;
    }
    if (f.reason === 'at_max') {
      // Round 7 coach audit (C7-10): close to the maximum, nothing is taken.
      const most = f.nearMax ? `close to the most a week holds (${f.max})` : 'the most a week holds';
      lines.push(`Your ${n} focus: ${n} already ${plural(f.muscle) ? 'get' : 'gets'} ${sets(f.before)} sets a week, ${most}, so the plan is the same.`);
      continue;
    }
    const why = f.reason === 'pull_balance' ? 'more pressing would need more pulling than the week can hold'
      : f.reason === 'hamstring_balance' ? 'more quad work would need more hamstring work than the week can hold'
        : f.reason === 'checks' ? 'more would break a rule of the plan'
          : causeText(f.causes, { m: f.muscle });
    const legs = f.legsOnce ? " Men's physique trains the legs in one session a week." : '';
    const further = f.reachedAt ? ` With ${f.reachedAt} days a week it reaches ${sets(f.reachedSets)}.`
      : f.moreAt ? ` With ${f.moreAt.days} days a week it gets ${sets(f.moreAt.sets)}.` : '';
    counted.push(`Your ${n} focus: ${sets(f.before)} to ${setsBelow(f.after, f.target)} sets a week, short of the ${goal(f.target)} a focus aims for, because ${why}.${legs}${further}`);
  }
  // One line per cause, not one per muscle (a tight week listed a dozen);
  // a muscle a focus took from is said once, under "To make room" (U6-13).
  // Round 7 user audit (U7-7): a gap of one set or less is not listed.
  const picked = new Set((rep.focusResults || []).map((f) => f.muscle));
  const took = new Set((rep.focusTook || []).map((x) => x.muscle));
  const short = (rep.belowTypical || []).filter((b) => !picked.has(b.muscle) && !took.has(b.muscle)
    && !(rep.kitShort || []).some((k) => k.muscle === b.muscle) && b.target - b.sets > 1);
  const listed = (list) => list.map((b) => `${name(b.muscle)} ${sets(b.sets)} (usually ${b.target})`).join(', ');
  if (short.length > 5) {
    // Round 6 user audit (U6-6): a wall of below-usual muscles reads as a
    // bad plan; said once, with the muscles named. Round 7 (U7-1): "every
    // other muscle" where one is below its minimum, said above; (U7-6) what
    // holds them back, by cause.
    const at = rep.fullerAt ? ` ${rep.fullerAt} days a week raise most of them.` : '';
    const every = (rep.belowMinimum || []).length ? 'every other muscle gets' : 'every muscle gets';
    const holds = new Map();
    for (const b of short) {
      const key = HOLDS[((b.limits || [])[0] || '').split(':')[0]] || 'the rules of the plan';
      if (!holds.has(key)) holds.set(key, []);
      holds.get(key).push(name(b.muscle));
    }
    const what = [...holds].map(([k, ms]) => `${k} (${ms.join(', ')})`).join('; ');
    counted.push(`With ${args.days} days a week ${every} at least its minimum, and ${short.length} stay below the plan's usual amount: ${listed(short)}. What holds them back: ${what}.${at}`);
  } else {
    const byCause = new Map();
    for (const b of short) {
      const key = JSON.stringify(b.causes || null);
      if (!byCause.has(key)) byCause.set(key, []);
      byCause.get(key).push(b);
    }
    for (const list of byCause.values()) {
      counted.push(`Fewer sets a week than the plan's usual amount, because ${causeText(list[0].causes, { many: list.length > 1, m: list[0].muscle })}: ${listed(list)}.`);
    }
  }
  if ((rep.focusTook || []).length) {
    // Round 6 audits (U6-3, C6-5): own sets beside own sets, and the counted
    // week beside the minimum it is judged on.
    counted.push(`To make room for your focus: ${rep.focusTook.map((x) => `${name(x.muscle)} ${x.from} to ${x.to} sets of ${plural(x.muscle) ? 'their' : 'its'} own a week (${sets(x.countedTo)} counted, ${plural(x.muscle) ? 'their' : 'its'} minimum ${x.minimum})`).join('; ')}.`);
  }
  if (counted.length) lines.push(COUNTED, ...counted);
  lines.push('');
  let byEffort = false;
  r.plan.sessions.forEach((s, i) => {
    const total = s.exercises.reduce((t, ex) => t + ex.peak, 0);
    const lighter = r.report.minutes[i] < 0.75 * Math.max(...r.report.minutes) ? ', a lighter day' : '';
    lines.push(`**${i + 1}. ${s.name}** (${s.exercises.length} exercises, ${total} sets at the peak, about ${r.report.minutes[i].toFixed(0)} min${lighter})`);
    for (const ex of s.exercises) {
      // Round 6 audits (U6-9, C6-13): the engine's own range, never a fixed
      // "6 to 30".
      const effort = ex.repRange[1] >= 30;
      if (effort) byEffort = true;
      const reps = effort ? `${ex.repRange[0]} to ${ex.repRange[1]} reps by effort` : `${ex.repRange[0]}-${ex.repRange[1]} reps`;
      // Round 6 coach audit (C6-7): two of one movement sit together, and
      // the second says why it is there (U5-6).
      // Round 7 user audit (U7-9): never two brackets in a row.
      const angle = ex.secondAngle ? `, a second angle for the ${name(ex.muscle)}` : '';
      lines.push(`- ${ex.name}${angle}: sets by week ${ex.weeks.map((w) => w.sets).join('/')}, ${reps}, rest ${ex.restSec} s${ex.nextDayException ? ', stop 2 reps short of failure every week: the next session trains this muscle again' : ''}`);
    }
    lines.push('');
  });
  // Round 7 user audit (Q3): the line covers the exercises marked so.
  if (byEffort) lines.push(`Reps by effort, on the exercises marked so: as many good reps as the week's effort allows, inside the range (stop ${PROGRESSION.rirLadder.slice(0, 5).join(', ')} reps short of failure in weeks 1 to 5, and ${PROGRESSION.rirLadder[5]} in week 6).`, '');
  lines.push('Weekly sets at the peak (counted: own sets + half of other exercises\' credit; then the muscle\'s own sets), against minimum / normal / maximum. Credit counts towards the maximum only up to the maximum less the minimum (R34):');
  const own = {};
  for (const s of r.plan.sessions) for (const ex of s.exercises) own[ex.muscle] = (own[ex.muscle] || 0) + ex.peak;
  // R34's figure beside the counted one where they differ (round 4 coach
  // audit: the line showed a count above the maximum it printed).
  const towardsMax = (m, v) => (own[m] || 0) + Math.min(Math.max(0, v.sets - (own[m] || 0)), Math.max(0, v.max - v.min));
  lines.push(Object.entries(r.report.weekly).map(([m, v]) => {
    const t = towardsMax(m, v);
    return `${m} ${v.sets}${t !== v.sets ? ` (${t} towards the maximum)` : ''}, own ${own[m] || 0} (${v.min}/${v.target}/${v.max})`;
  }).join('; ') + '.');
  lines.push('');
  return lines;
}

test('render', () => {
  const out = [
    '# 12 Structure engine: rendered plans',
    '',
    'Generated by tools/render-structure-plans.jest.js from the real engine and library. Intermediate, full gym, 60-minute sessions, no focus, unless the heading says otherwise. Sets by week are weeks 1 to 6 of the block (week 6 is the recovery week). The rotation is a cycle: session 1 follows the last.',
    '',
  ];
  for (const goal of CATEGORIES) {
    out.push(`## ${LABEL[goal]}`, '');
    for (const days of DAY_COUNTS) out.push(...render({ goal, days, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: [] }, `${LABEL[goal]}, ${days} days`));
  }
  out.push('## Variants', '');
  const variants = [
    [{ goal: 'mens_physique', days: 4, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: ['side_delts', 'chest'] }, "Men's physique, 4 days, focus side delts and chest"],
    [{ goal: 'mens_physique', days: 4, lengthMinutes: 60, equipment: 'dumbbells_only', experience: 'intermediate', focus: [] }, "Men's physique, 4 days, dumbbells only"],
    [{ goal: 'mens_physique', days: 5, lengthMinutes: 75, equipment: 'machines_cables', experience: 'advanced', focus: [] }, "Men's physique, 5 days, machines and cables, advanced, 75 minutes"],
    [{ goal: 'general', days: 3, lengthMinutes: 45, equipment: 'full_gym', experience: 'beginner', focus: [] }, 'General, 3 days, beginner, 45 minutes'],
    [{ goal: 'general', days: 2, lengthMinutes: 45, equipment: 'home_gym', experience: 'beginner', focus: [] }, 'General, 2 days, home gym, beginner, 45 minutes'],
    [{ goal: 'bikini', days: 4, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: ['glute_max'] }, 'Bikini, 4 days, focus glutes'],
    [{ goal: 'wellness', days: 4, lengthMinutes: 60, equipment: 'dumbbells_only', experience: 'intermediate', focus: [] }, 'Wellness, 4 days, dumbbells only'],
    [{ goal: 'bodybuilding', days: 6, lengthMinutes: 90, equipment: 'full_gym', experience: 'advanced', focus: ['lats'] }, 'Bodybuilding, 6 days, advanced, 90 minutes, focus lats'],
    [{ goal: 'figure', days: 3, lengthMinutes: 60, equipment: 'bodyweight', experience: 'intermediate', focus: [] }, 'Figure, 3 days, bodyweight'],
    [{ goal: 'general', days: 4, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: ['chest'] }, 'General, 4 days, focus chest (R46: room made above the standard)'],
    [{ goal: 'classic_physique', days: 5, lengthMinutes: 75, equipment: 'full_gym', experience: 'intermediate', focus: ['lats', 'side_delts'] }, 'Classic physique, 5 days, 75 minutes, focus lats and side delts'],
    [{ goal: 'womens_physique', days: 4, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: ['glute_max'] }, "Women's physique, 4 days, focus glutes"],
    [{ goal: 'wellness', days: 5, lengthMinutes: 60, equipment: 'full_gym', experience: 'beginner', focus: ['quads'] }, 'Wellness, 5 days, beginner, focus quads'],
    // Round 6: a pick the week cannot give 2 more sets asks before saving
    // (R55), and men's physique legs stay in one session (F4).
    [{ goal: 'mens_physique', days: 5, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: ['quads'] }, "Men's physique, 5 days, focus quads (R55, F4)"],
    [{ goal: 'bodybuilding', days: 4, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: ['chest'] }, 'Bodybuilding, 4 days, focus chest (R55)'],
  ];
  for (const [args, title] of variants) out.push(...render(args, title));
  fs.writeFileSync(OUT, out.join('\n') + '\n');
});
