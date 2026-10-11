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
const { CATEGORIES, DAY_COUNTS } = require('../../../../src/lib/structure/rulebook');
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
const plural = (m) => !['abs'].includes(m) && /s$/.test(name(m));
// Whole sets, "about" where a count holds half sets from other exercises.
const sets = (n) => (Number.isInteger(n) ? `${n}` : `about ${Math.round(n)}`);
// What stops more sets, from the engine report's `limits`, in plain words.
function limitText(limits = []) {
  const words = {
    muscle_cap: 'each session already gives it the most one session may',
    set_cap: 'its sessions are full',
    exercise_cap: 'its sessions already hold the most exercises they may',
    exercise_full: 'its exercises there are at their most sets, with no room for another',
    recovery: 'more would leave too little recovery before it is trained again',
    joints: 'more would pass a joint-safety limit',
    variety: 'the exercises left for it are already in the neighbouring sessions',
    movement: 'no different exercise is left for it there',
    balance: 'more would tip pressing against pulling, or quads against hamstrings',
    no_choice: 'your equipment offers nothing more for it there',
    room: 'ROOM LEFT (an engine fault: a legal set was not placed)',
    rules: 'more would break a rule of the plan',
  };
  const said = [...new Set(limits.map((l) => words[l]).filter(Boolean))];
  return said.length ? said.join(', or ') : 'its sessions have no room left';
}

function render(args, title) {
  const r = buildStructurePlan({ library: LIBRARY, ...args });
  const lines = [`### ${title}`, ''];
  if (!r.ok) {
    const days = r.refusal.suggestedDays;
    lines.push(`Not built: ${r.refusal.detail}.${days ? ` ${days} days a week works.` : ''}`, '');
    return lines;
  }
  const c = checkPlan(r.plan);
  const sc = senseCheck(r.plan);
  lines.push(`Rulebook checks: ${c.ok ? 'pass' : c.failures.map((f) => f.code).join(', ')}. Sense checks: ${sc.ok ? 'pass' : sc.failures.map((f) => f.code).join(', ')}.`);
  // The messages below are worded as the app should show them (round 4 and
  // round 5 user audits).
  const rep = r.report;
  const lo = Math.round(Math.min(...rep.minutes));
  const hi = Math.round(Math.max(...rep.minutes));
  if (rep.needsLengthChoice) {
    const over = rep.overSessions.map((x) => `${x.name} comes to about ${x.minutes} minutes`).join('; ');
    lines.push(`Asks before saving: ${over}, against the ${args.lengthMinutes} minutes you chose. Sessions of ${rep.suggestedLength} minutes would hold this plan${rep.daysThatFit ? `, or ${rep.daysThatFit} days a week of ${args.lengthMinutes} minutes` : ''}.`);
  } else {
    lines.push(`Sessions run about ${lo === hi ? lo : `${lo} to ${hi}`} minutes.`);
  }
  if (rep.sameAsFewerDays) lines.push(`${rep.sameAsFewerDays} days a week give much the same week: the extra day mostly spreads the same work.`);
  for (const k of rep.kitShort || []) {
    lines.push(`With this equipment ${name(k.muscle)} ${plural(k.muscle) ? 'have' : 'has'} one exercise, giving ${sets(k.sets)} of the usual minimum of ${k.minimum} sets a week.`);
  }
  for (const m of rep.focusIgnored || []) lines.push(`Your ${name(m)} focus has no effect: this category does not train ${name(m)} directly.`);
  for (const f of rep.focusResults || []) {
    const n = name(f.muscle);
    if (f.reason === 'reached') {
      lines.push(`Your ${n} focus: ${sets(f.before)} to ${sets(f.after)} sets a week.`);
      continue;
    }
    if (f.reason === 'at_max') {
      lines.push(`Your ${n} focus: ${n} already ${plural(f.muscle) ? 'get' : 'gets'} ${sets(f.before)} sets a week, the most a week holds, so the plan is the same.`);
      continue;
    }
    const why = f.reason === 'pull_balance' ? 'more pressing would need more pulling than the week can hold'
      : f.reason === 'hamstring_balance' ? 'more quad work would need more hamstring work than the week can hold'
        : f.reason === 'checks' ? 'more would break a rule of the plan'
          : limitText(f.limits);
    const more = f.reachedAt ? ` With ${f.reachedAt} days a week it reaches ${sets(f.target)}.`
      : f.moreAt ? ` With ${f.moreAt.days} days a week it gets ${sets(f.moreAt.sets)}.` : '';
    const gain = f.after - f.before;
    lines.push(gain < 1
      ? `Your ${n} focus changes nothing at ${args.days} days: ${why}.${more}`
      : `Your ${n} focus: ${sets(f.before)} to ${sets(f.after)} sets a week, short of the ${sets(f.target)} a focus aims for, because ${why}.${more}`);
  }
  // One line per cause, not one per muscle (a tight week listed a dozen).
  const picked = new Set((rep.focusResults || []).map((f) => f.muscle));
  const byCause = new Map();
  for (const b of rep.belowTypical || []) {
    if (picked.has(b.muscle) || (rep.kitShort || []).some((k) => k.muscle === b.muscle) || b.target - b.sets < 1) continue;
    const cause = limitText(b.limits);
    if (!byCause.has(cause)) byCause.set(cause, []);
    byCause.get(cause).push(`${name(b.muscle)} ${sets(b.sets)} (usually ${b.target})`);
  }
  for (const [cause, list] of byCause) lines.push(`Fewer sets a week than usual, because ${cause}: ${list.join(', ')}.`);
  if ((rep.focusTook || []).length) {
    lines.push(`To make room for your focus: ${rep.focusTook.map((x) => `${name(x.muscle)} ${x.from} to ${x.to} sets a week (${plural(x.muscle) ? 'their' : 'its'} minimum is ${x.minimum})`).join('; ')}.`);
  }
  lines.push('');
  r.plan.sessions.forEach((s, i) => {
    const sets = s.exercises.reduce((t, ex) => t + ex.peak, 0);
    const lighter = r.report.minutes[i] < 0.75 * Math.max(...r.report.minutes) ? ', a lighter day' : '';
    lines.push(`**${i + 1}. ${s.name}** (${s.exercises.length} exercises, ${sets} sets at the peak, about ${r.report.minutes[i].toFixed(0)} min${lighter})`);
    for (const ex of s.exercises) {
      const reps = ex.repRange[1] >= 30 ? 'reps by effort (as many as the week asks, 6 to 30)' : `${ex.repRange[0]}-${ex.repRange[1]} reps`;
      lines.push(`- ${ex.name}: sets by week ${ex.weeks.map((w) => w.sets).join('/')}, ${reps}, rest ${ex.restSec} s${ex.nextDayException ? ', stop 2 reps short of failure every week: the next session trains this muscle again' : ''}`);
    }
    lines.push('');
  });
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
  ];
  for (const [args, title] of variants) out.push(...render(args, title));
  fs.writeFileSync(OUT, out.join('\n') + '\n');
});
