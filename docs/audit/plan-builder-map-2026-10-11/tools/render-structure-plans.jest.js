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

// What stops more sets, one cause per muscle (the engine's first `limits`
// entry), as a full clause (round 6 audits U6-2, C6-4, U6-13). `many` is
// true for a list of muscles, so the clause reads "them".
function causeText(code = 'rules', many = false, m = null) {
  const it = many || (m && plural(m)) ? 'them' : 'it';
  const its = many || (m && plural(m)) ? 'their' : 'its';
  const is = many || (m && plural(m)) ? 'are' : 'is';
  const [key, other] = code.split(':');
  switch (key) {
    case 'muscle_cap': return `each session that trains ${it} already holds the most sets of ${it} one session may hold`;
    case 'muscle_cap_other': return `more would give the ${name(other)} more sets than one session may hold`;
    case 'set_cap': return `the sessions that train ${it} are full`;
    case 'exercise_cap': return `the sessions that train ${it} already hold the most exercises a session may`;
    case 'exercise_full': return `the exercises for ${it} are at their most sets and ${its} sessions have no room for another exercise`;
    case 'balance_push': return 'more would put pressing ahead of pulling';
    case 'balance_legs': return 'more would put the quads too far ahead of the hamstrings';
    case 'recovery': return `more would leave too little recovery before ${it} ${is} trained again`;
    case 'joints_shoulder': return 'more would load the shoulders beyond what the plan allows';
    case 'joints_back': return 'more would load the lower back beyond what the plan allows';
    case 'joints_elbow': return 'more would load the elbows beyond what the plan allows';
    case 'joints_knee': return 'more would load the knees beyond what the plan allows';
    case 'variety': return `the exercises left for ${it} are already in the neighbouring sessions`;
    case 'movement': return `no different exercise for ${it} is left in ${its} sessions`;
    case 'no_choice': return `your equipment offers nothing more for ${it}`;
    // Never printed: the gate fails any report that leads with it.
    case 'room': throw new Error('a report led with "room"');
    default: return 'more would break a rule of the plan';
  }
}

// Why a week was not built, in words (round 6 user audit U6-5: "lower_c: 2
// exercises, 9 sets").
function refusalText(refusal) {
  if (refusal.reason !== 'sense_failed') return refusal.detail;
  const f = refusal.failures[0];
  switch (f.code) {
    case 'S5': return `with this equipment ${f.sessionName || 'one session'} would hold only ${f.exercises} exercises and ${f.sets} sets, too little to be worth the trip`;
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
    lines.push(`Not built: ${refusalText(r.refusal)}.${days ? ` ${days} days a week works.` : ''}`, '');
    return lines;
  }
  const c = checkPlan(r.plan);
  const sc = senseCheck(r.plan);
  lines.push(`Rulebook checks: ${c.ok ? 'pass' : c.failures.map((f) => f.code).join(', ')}. Sense checks: ${sc.ok ? 'pass' : sc.failures.map((f) => f.code).join(', ')}.`);
  // The messages below are worded as the app should show them (round 4 to
  // round 6 user audits).
  const rep = r.report;
  const lo = Math.round(Math.min(...rep.minutes));
  const hi = Math.round(Math.max(...rep.minutes));
  if (rep.needsLengthChoice) {
    const over = rep.overSessions.map((x) => `${x.name} comes to about ${x.minutes} minutes`).join('; ');
    lines.push(`Asks before saving: ${over}, against the ${args.lengthMinutes} minutes you chose. Sessions of ${rep.suggestedLength} minutes would hold this plan${rep.daysThatFit ? `, or ${rep.daysThatFit} days a week of ${args.lengthMinutes} minutes` : ''}.`);
  } else {
    lines.push(`Sessions run about ${lo === hi ? lo : `${lo} to ${hi}`} minutes.`);
  }
  // R55: a pick the week cannot give 2 more sets asks before saving.
  const asked = new Set();
  for (const f of rep.focusChoice || []) {
    asked.add(f.muscle);
    const n = name(f.muscle);
    const result = rep.focusResults.find((x) => x.muscle === f.muscle) || {};
    const gain = Math.round((f.after - f.before) * 2) / 2;
    const what = gain <= 0 ? `adds nothing at ${args.days} days` : `adds only ${gain === 1 ? '1 set' : `${gain} sets`} a week at ${args.days} days`;
    const why = result.reason === 'pull_balance' ? 'more pressing would need more pulling than the week can hold'
      : result.reason === 'hamstring_balance' ? 'more quad work would need more hamstring work than the week can hold'
        : causeText((result.limits || [])[0], false, f.muscle);
    const legs = result.legsOnce ? " Men's physique trains the legs in one session a week." : '';
    const then = f.moreDays ? ` With ${f.moreDays} days a week ${n} ${plural(f.muscle) ? 'get' : 'gets'} ${sets(f.setsThen)}.` : '';
    const choose = [f.moreDays ? `${f.moreDays} days a week` : null, `${args.days} days without the ${n} focus`, `${args.days} days with it as it is`].filter(Boolean);
    lines.push(`Asks before saving: your ${n} focus ${what}, because ${why}.${legs}${then} Choose ${choose.slice(0, -1).join(', ')}, or ${choose[choose.length - 1]}.`);
  }
  if (rep.sameAsFewerDays) lines.push(`${rep.sameAsFewerDays} days a week give much the same week: the extra day mostly spreads the same work.`);
  const counted = [];
  for (const k of rep.kitShort || []) {
    counted.push(`With this equipment ${name(k.muscle)} ${plural(k.muscle) ? 'have' : 'has'} one exercise, giving ${sets(k.sets)} counted sets of the usual minimum of ${k.minimum} a week.`);
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
      lines.push(`Your ${n} focus: ${n} already ${plural(f.muscle) ? 'get' : 'gets'} ${sets(f.before)} sets a week, the most a week holds, so the plan is the same.`);
      continue;
    }
    const why = f.reason === 'pull_balance' ? 'more pressing would need more pulling than the week can hold'
      : f.reason === 'hamstring_balance' ? 'more quad work would need more hamstring work than the week can hold'
        : f.reason === 'checks' ? 'more would break a rule of the plan'
          : causeText((f.limits || [])[0], false, f.muscle);
    const legs = f.legsOnce ? " Men's physique trains the legs in one session a week." : '';
    const more = f.reachedAt ? ` With ${f.reachedAt} days a week it reaches ${goal(f.target)}.`
      : f.moreAt ? ` With ${f.moreAt.days} days a week it gets ${sets(f.moreAt.sets)}.` : '';
    counted.push(`Your ${n} focus: ${sets(f.before)} to ${setsBelow(f.after, f.target)} sets a week, short of the ${goal(f.target)} a focus aims for, because ${why}.${legs}${more}`);
  }
  // One line per cause, not one per muscle (a tight week listed a dozen);
  // a muscle a focus took from is said once, under "To make room" (U6-13).
  const picked = new Set((rep.focusResults || []).map((f) => f.muscle));
  const took = new Set((rep.focusTook || []).map((x) => x.muscle));
  const short = (rep.belowTypical || []).filter((b) => !picked.has(b.muscle) && !took.has(b.muscle)
    && !(rep.kitShort || []).some((k) => k.muscle === b.muscle) && b.target - b.sets >= 1);
  if (short.length > 5) {
    // Round 6 user audit (U6-6): a wall of below-usual muscles reads as a
    // bad plan; said once, with the muscles named.
    const at = rep.fullerAt ? ` ${rep.fullerAt} days a week raise most of them.` : '';
    counted.push(`With ${args.days} days a week every muscle gets at least its minimum, and ${short.length} stay below the plan's usual amount: ${short.map((b) => `${name(b.muscle)} ${sets(b.sets)} (usually ${b.target})`).join(', ')}.${at}`);
  } else {
    const byCause = new Map();
    for (const b of short) {
      const key = (b.limits || [])[0] || 'rules';
      if (!byCause.has(key)) byCause.set(key, []);
      byCause.get(key).push(b);
    }
    for (const [key, list] of byCause) {
      counted.push(`Fewer sets a week than the plan's usual amount, because ${causeText(key, list.length > 1, list[0].muscle)}: ${list.map((b) => `${name(b.muscle)} ${sets(b.sets)} (usually ${b.target})`).join(', ')}.`);
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
      const angle = ex.secondAngle ? ` (a second angle for the ${name(ex.muscle)})` : '';
      lines.push(`- ${ex.name}${angle}: sets by week ${ex.weeks.map((w) => w.sets).join('/')}, ${reps}, rest ${ex.restSec} s${ex.nextDayException ? ', stop 2 reps short of failure every week: the next session trains this muscle again' : ''}`);
    }
    lines.push('');
  });
  if (byEffort) lines.push(`Reps by effort: as many good reps as the week's effort allows, inside the range (stop ${PROGRESSION.rirLadder.slice(0, 5).join(', ')} reps short of failure in weeks 1 to 5, and ${PROGRESSION.rirLadder[5]} in week 6).`, '');
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
  if (r.report.untrainable.length) lines.push(`Cannot be trained directly with this equipment: ${r.report.untrainable.join(', ')}.`);
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
