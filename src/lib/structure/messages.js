/**
 * messages.js -- D222 phase 6 (R65): every word the structure engine's
 * results reach the person in, in one pure module.
 *
 * Moved verbatim from the sign-off renderer
 * (docs/audit/plan-builder-map-2026-10-11/tools/render-structure-plans.jest.js),
 * which now imports them, so the page the founder signs off
 * (12-STRUCTURE-PLANS-RENDERED.md) and the app say the same words. The one
 * change in the move: the plan being worded is passed in (`plan`) instead of
 * read from the renderer's module-level variable, so this module holds no
 * state. The audit-only parts (the check results, the session and exercise
 * lines, the weekly-sets footer, raw keys) stay in the renderer.
 *
 * Pure, no I/O, deterministic.
 */
import { PER_SESSION, FOCUS } from './rulebook';

// Plain names, the same words as the session names (round 5 user audit).
const NAMES = {
  side_delts: 'side delts', rear_delts: 'rear delts', front_delts: 'front delts', upper_back: 'upper back',
  glute_max: 'glutes', glute_med: 'side glutes', adductors: 'inner thighs', lats: 'lats',
};
export const name = (m) => NAMES[m] || m.replace(/_/g, ' ');
export const plural = (m) => /s$/.test(name(m));
// Whole sets, "about" where a count holds half sets from other exercises.
export const sets = (n) => (Number.isInteger(n) ? `${n}` : `about ${Math.round(n)}`);
// A count short of a target never rounds up to it (round 6 user audit:
// "about 18 to about 20 sets a week, short of the 20").
export const setsBelow = (n, target) => (!Number.isInteger(n) && Math.round(n) >= target ? `just under ${target}` : sets(n));
// A target is a goal, never "about" (round 6: "short of the about 16").
export const goal = (n) => `${Math.round(n)}`;
// The app's own sentence for how sets are counted (MuscleRecoveryList's
// HALF_CREDIT_NOTE), printed once above any counted figure.
export const COUNTED = 'Sets are counted as in the app: a set counts once for the muscle it works most and half for each muscle that helps.';

export const DAY_WORD = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six' };
// Direct sets of a muscle in the named session.
function directIn(plan, sessionName, m) {
  const s = plan && plan.sessions.find((x) => x.name === sessionName);
  return s ? s.exercises.filter((ex) => ex.muscle === m).reduce((t, ex) => t + ex.peak, 0) : null;
}
// The one-session cap of a muscle, with its number: the direct cap where the
// session holds that many direct sets of it, the counted cap otherwise
// (round 8 user audit U8-8: "the most sets of it" beside 4 to 7 sets).
function capClause(plan, it, its, sessions = [], ms = []) {
  const direct = [];
  for (const m of ms) for (const sn of sessions) direct.push(directIn(plan, sn, m));
  const known = direct.length > 0 && direct.every((d) => d != null);
  if (known && direct.every((d) => d >= PER_SESSION.directCap)) return `${PER_SESSION.directCap} sets of ${it}, the most one session may hold`;
  if (known && direct.every((d) => d < PER_SESSION.directCap)) return `the most counted sets of ${it} one session may hold (${PER_SESSION.fractionalCap})`;
  return `the most sets of ${it} one session may hold (${PER_SESSION.directCap} of ${its} own, ${PER_SESSION.fractionalCap} counted)`;
}

// What stops more sets, as a full clause (round 6 audits U6-2, C6-4,
// U6-13), said of the session it is true of (round 7 audits U7-3, C7-3:
// "each session that trains them" where only one session bound that way).
// `subject` names the session or sessions; `several` is true for two or
// more named sessions; `every` when the clause holds for each session that
// trains the muscle; `many` for a list of muscles ("them"); `sessions` and
// `ms` the sessions and muscles the clause is said of (for the cap number).
const RULE_CLAUSE = {
  C4: 'take a muscle past the most sets a week may hold',
  C5: 'take too many sets from another muscle',
  S10: 'leave a muscle with too few sets of its own',
};
const RULE_NOUN = {
  C4: 'the most sets a week may hold', C5: 'the sets other muscles must keep', S10: 'the sets a muscle must keep of its own',
};
export function phrase(code = 'rules', { subject, several = false, every = false, many = false, m = null, sessions = [], ms = [], plan = null }) {
  const pl = many || (m && plural(m));
  const it = pl ? 'them' : 'it';
  const its = pl ? 'their' : 'its';
  const they = pl ? 'they' : 'it';
  const is = pl ? 'are' : 'is';
  const v = (one, more) => (several ? more : one);
  const [key, other] = code.split(':');
  switch (key) {
    case 'muscle_cap': return `${subject} already ${v('holds', 'hold')} ${capClause(plan, it, its, sessions, ms.length ? ms : (m ? [m] : []))}`;
    case 'muscle_cap_other': return `more in ${subject} would give the ${name(other)} more sets than one session may hold`;
    case 'set_cap': return `${subject} ${v('is', 'are')} full`;
    case 'exercise_cap': return `${subject} already ${v('holds', 'hold')} the most exercises a session may`;
    case 'exercise_full': return `the exercises for ${it} in ${subject} are at their most sets`;
    case 'balance_push': return 'more would put pressing ahead of pulling';
    case 'balance_legs': return 'more would put the quads too far ahead of the hamstrings';
    case 'recovery': return `more in ${subject} would leave too little recovery before ${they} ${is} trained again`;
    case 'joints_shoulder': return `more in ${subject} would load the shoulders beyond what the plan allows`;
    case 'joints_back': return `more in ${subject} would load the lower back beyond what the plan allows`;
    case 'joints_elbow': return `more in ${subject} would load the elbows beyond what the plan allows`;
    case 'joints_knee': return `more in ${subject} would load the knees beyond what the plan allows`;
    case 'variety': return every ? `the other exercises for ${it} are already in the neighbouring sessions` : `the other exercises for ${it} are already in the sessions next to ${subject}`;
    case 'movement': return every ? `no different exercise for ${it} is left in ${its} sessions` : `no different exercise for ${it} is left for ${subject}`;
    case 'no_choice': return `no other exercise for ${it} is available with this equipment`;
    // Never printed: the gate fails any report that leads with it.
    case 'room': throw new Error('a report led with "room"');
    // Round 8 user audit (U8-3): the check that fails, in plain words. The
    // report carries it as "rules:<code>" (checker.js C-codes, sense.js S-codes).
    default: return RULE_CLAUSE[other] ? `more in ${subject} would ${RULE_CLAUSE[other]}` : `more in ${subject} would break a rule of the plan`;
  }
}
const inPlanOrder = (plan, names) => (plan ? [...names].sort((x, y) => plan.sessions.findIndex((q) => q.name === x) - plan.sessions.findIndex((q) => q.name === y)) : names);
// `nameSessions`: say the session by name even where one clause holds for
// every session (round 8 audits U8-6, C8-5: two groups reading the same).
export function causeText(causes, { many = false, m = null, ms = [], nameSessions = false, canon = false, plan = null } = {}) {
  if (!causes || !causes.groups.length) return 'more would break a rule of the plan';
  const pronoun = many || (m && plural(m)) ? 'them' : 'it';
  if (causes.every) {
    const sessions = inPlanOrder(plan, causes.groups[0].sessions);
    const subject = nameSessions ? sessions.join(' and ') : causes.single ? `the session that trains ${pronoun}` : `each session that trains ${pronoun}`;
    return phrase(causes.groups[0].code, { subject, several: nameSessions && sessions.length > 1, every: !nameSessions, many, m, sessions, ms, plan });
  }
  const said = [];
  for (const g of causes.groups) {
    const sessions = inPlanOrder(plan, g.sessions);
    const t = phrase(g.code, { subject: sessions.join(' and '), several: sessions.length > 1, many, m, sessions, ms, plan });
    if (!said.includes(t)) said.push(t);
  }
  // `canon`: the same clauses in a fixed order, to compare two lines.
  return (canon ? said.sort() : said).join(', and ');
}
// What holds a list of muscles back, as a noun (the wall of below-usual
// muscles, round 7 user audit U7-6; labels worded in round 8, U8-10).
const HOLDS = {
  muscle_cap: 'the most sets of one muscle a session may hold', set_cap: 'full sessions', exercise_cap: 'the most exercises a session may hold',
  exercise_full: 'their exercises already at their most sets',
  balance_push: 'keeping pulling level with pressing', balance_legs: 'keeping the hamstrings level with the quads', recovery: 'recovery before the next session that trains them',
  joints_shoulder: 'the load on the shoulders', joints_back: 'the load on the lower back', joints_elbow: 'the load on the elbows', joints_knee: 'the load on the knees',
  variety: 'the same exercises in the neighbouring sessions', movement: 'no other exercise for them that their sessions do not already use', no_choice: 'only one exercise for them with this equipment',
};
export function holdLabel(limit) {
  const [k, other] = (limit || '').split(':');
  if (k === 'muscle_cap_other' && other) return `the ${name(other)}${plural(other) ? "'" : "'s"} limit in the same session`;
  if (k === 'rules' && RULE_NOUN[other]) return RULE_NOUN[other];
  return HOLDS[k] || 'the rules of the plan';
}
// What would give a muscle with no exercise of its own one (round 8 user
// audit U8-15). Only lats are known here; any other muscle gets the generic.
const KIT_HINT = { lats: 'A pulldown machine or a pull-up bar' };
export const wayForward = (m) => `${KIT_HINT[m] || 'Other equipment'} would give ${plural(m) ? 'them exercises' : 'it an exercise'} of ${plural(m) ? 'their' : 'its'} own.`;

// Why a week was not built, in words (round 6 user audit U6-5: "lower_c: 2
// exercises, 9 sets"; round 7 U7-10: no session name the person has never
// seen, and no "worth the trip").
export function refusalText(refusal, days) {
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

/**
 * The sentence for a week the engine refused, with the day count (and its
 * length) that builds, as the sign-off page prints it.
 * @param {object} refusal  buildStructurePlan's refusal
 * @param {{ days: number }} args  the engine's arguments
 */
export function refusalMessage(refusal, args) {
  const days = refusal.suggestedDays;
  const len = refusal.suggestedLength;
  return `Not built: ${refusalText(refusal, args.days)}.${days ? ` ${days} days a week builds${len ? `, with sessions of ${len} minutes` : ''}.` : ''}`;
}

/**
 * The lines a built week says to the person, in order: the length (or the
 * length question), a focus pick beyond the most allowed, then the notes, with
 * the counting sentence once before the first line carrying a counted figure.
 * @param {{ plan: object, report: object }} r  a built result of buildStructurePlan
 * @param {{ days: number, lengthMinutes: number }} args  the engine's arguments
 * @returns {string[]}
 */
export function planMessages(r, args) {
  const lines = [];
  const rep = r.report;
  const plan = r.plan;
  const lo = Math.round(Math.min(...rep.minutes));
  const hi = Math.round(Math.max(...rep.minutes));
  if (rep.needsLengthChoice) {
    const over = rep.overSessions.map((x) => `${x.name} comes to about ${x.minutes} minutes`).join('; ');
    lines.push(`Asks before saving: ${over}, against the ${args.lengthMinutes} minutes you chose. Sessions of ${rep.suggestedLength} minutes at ${args.days} days a week would hold this plan${rep.daysThatFit ? `, or ${rep.daysThatFit} days a week of ${args.lengthMinutes} minutes` : ''}.`);
  } else {
    lines.push(`Sessions run about ${lo === hi ? lo : `${lo} to ${hi}`} minutes.`);
  }
  // Round 8 user audit (U8-13): a pick beyond the most a focus may hold.
  if ((rep.focusDropped || []).length) {
    const dropped = rep.focusDropped.map(name);
    lines.push(`Up to ${DAY_WORD[FOCUS.maxPicks] || FOCUS.maxPicks} muscles can be a focus; ${dropped.join(' and ')} ${dropped.length === 1 && !plural(rep.focusDropped[0]) ? 'was' : 'were'} not added.`);
  }
  // Round 8 user audit (U8-14): the counting sentence is printed once, before
  // the first line carrying a counted figure. `note` marks such a line.
  const notes = [];
  const note = (text, counted = true) => notes.push({ text, counted });
  // R55: a pick the week cannot give 2 more sets asks before saving; so does
  // a pick the equipment cannot train (round 7 user audit U7-4).
  const asked = new Set();
  const picks = (rep.focusResults || []).length + (rep.focusUntrainable || []).length;
  const took = rep.focusTook || [];
  const tookText = took.map((x) => `${x.from - x.to} ${x.from - x.to === 1 ? 'set' : 'sets'} a week from ${name(x.muscle)}`).join(' and ');
  for (const f of rep.focusChoice || []) {
    asked.add(f.muscle);
    const n = name(f.muscle);
    const they = plural(f.muscle) ? 'they' : 'it';
    if (f.untrainable) {
      const u = (rep.focusUntrainable || []).find((x) => x.muscle === f.muscle);
      const against = u ? `, against a minimum of ${u.minimum}` : '';
      note(`Asks before saving: your ${n} focus changes nothing, because with this equipment ${n} ${plural(f.muscle) ? 'have' : 'has'} no exercise of ${plural(f.muscle) ? 'their' : 'its'} own (${they} get about ${Math.round(f.after)} sets a week through other exercises${against}). ${wayForward(f.muscle)} Choose ${args.days} days without the ${n} focus, or other equipment.`);
      continue;
    }
    const result = rep.focusResults.find((x) => x.muscle === f.muscle) || {};
    const gain = Math.round((f.after - f.before) * 2) / 2;
    const what = gain <= 0 ? `adds nothing at ${args.days} days` : `adds only ${gain === 1 ? '1 set' : `${gain} sets`} a week at ${args.days} days`;
    const why = result.reason === 'pull_balance' ? 'more pressing would need more pulling than the week can hold'
      : result.reason === 'hamstring_balance' ? 'more quad work would need more hamstring work than the week can hold'
        : causeText(result.causes, { m: f.muscle, plan });
    const legs = result.legsOnce ? " Men's physique trains the legs in one session a week." : '';
    // Round 7 user audit (U7-2): the figure is the rebuild's, and the length
    // that week needs is said.
    const then = f.moreDays ? ` With ${f.moreDays} days a week ${n} ${plural(f.muscle) ? 'get' : 'gets'} ${sets(f.setsThen)}${f.lengthThen ? `, in sessions of ${f.lengthThen} minutes` : ''}.` : '';
    // Round 8 user audit (U8-12): the day count is said with its minutes, as
    // the length question says it.
    const moreOption = f.moreDays ? `${f.moreDays} days a week of ${f.lengthThen || args.lengthMinutes} minutes` : null;
    // Round 8 user audits (U8-1, Q3): a pick that adds nothing and takes
    // nothing from another muscle is the same plan with or without it, said
    // as a statement. The pick stays recorded either way.
    if (gain <= 0 && !took.length) {
      note(`Your ${n} focus does not change this week at ${args.days} days: the plan is the same with or without it.${legs}${then}${moreOption ? ` Choose ${moreOption} or stay at ${args.days} days.` : ''}`);
      continue;
    }
    // Round 7 user audit (U7-11), round 8 (U8-11): a one-for-one swap says
    // what it takes; with several picks the report holds what they take
    // together, so it is said of them together.
    const takes = !took.length ? ''
      : picks === 1 ? `, which takes ${tookText}`
        : gain > 0 ? `, where your focus picks together take ${tookText}` : '';
    const choose = [moreOption, `${args.days} days without the ${n} focus`, `${args.days} days with it as it is${takes}`].filter(Boolean);
    note(`Asks before saving: your ${n} focus ${what}, because ${why}.${legs}${then} Choose ${choose.slice(0, -1).join(', ')}, or ${choose[choose.length - 1]}.`);
  }
  // Round 7 user audit (U7-13), round 8 (U8-5): a week that carries at least
  // 3 sets fewer than one day fewer says so, in one wording.
  const fewer = rep.fewerSetsThan;
  if (fewer && fewer.sets >= 3) note(`${fewer.days} days a week would give about ${fewer.sets} sets a week more than this ${DAY_WORD[args.days] || args.days}-day week.`);
  // Round 7 user audit (U7-1: lats with no exercise of their own, at 5 of
  // their minimum 10, were said only in a footer): first, in plain words.
  for (const u of rep.untrainableSets || []) {
    if (asked.has(u.muscle)) continue;
    const n = name(u.muscle);
    const pl = plural(u.muscle);
    note(`With this equipment ${n} ${pl ? 'have' : 'has'} no exercise of ${pl ? 'their' : 'its'} own: other exercises give ${pl ? 'them' : 'it'} about ${Math.round(u.sets)} counted sets a week, ${u.sets >= u.minimum ? `which meets ${pl ? 'their' : 'its'}` : 'against a'} minimum of ${u.minimum}.${u.sets >= u.minimum ? '' : ` ${wayForward(u.muscle)}`}`);
  }
  // Round 7 user audit (U7-12): the minimum is the minimum, not "the usual
  // minimum".
  for (const k of rep.kitShort || []) {
    note(`With this equipment ${name(k.muscle)} ${plural(k.muscle) ? 'have' : 'has'} one exercise: ${sets(k.sets)} counted sets a week, against a minimum of ${k.minimum}.`);
  }
  for (const m of rep.focusIgnored || []) note(`Your ${name(m)} focus changes nothing: this category trains ${name(m)} only through other exercises.`, false);
  for (const f of rep.focusResults || []) {
    if (asked.has(f.muscle)) continue;
    const n = name(f.muscle);
    if (f.reason === 'reached') {
      note(`Your ${n} focus: ${sets(f.before)} to ${sets(f.after)} sets a week.`);
      continue;
    }
    if (f.reason === 'at_max') {
      // Round 7 coach audit (C7-10): close to the maximum, nothing is taken.
      const most = f.nearMax ? `close to the most a week holds (${f.max})` : 'the most a week holds';
      note(`Your ${n} focus: ${n} already ${plural(f.muscle) ? 'get' : 'gets'} ${sets(f.before)} sets a week, ${most}, so the plan is the same.`);
      continue;
    }
    // Round 8 user audit (U8-3): a pick rolled back by the rulebook check
    // carries no check code in the report, so it gives the cause the
    // session probe found for each session that trains it.
    const why = f.reason === 'pull_balance' ? 'more pressing would need more pulling than the week can hold'
      : f.reason === 'hamstring_balance' ? 'more quad work would need more hamstring work than the week can hold'
        : causeText(f.causes, { m: f.muscle, plan });
    const legs = f.legsOnce ? " Men's physique trains the legs in one session a week." : '';
    // Round 8 user audit (U8-4): "reaches" only where the figure meets the
    // target printed in the same line.
    const further = f.reachedAt ? ` With ${f.reachedAt} days a week it ${f.reachedSets >= f.target ? 'reaches' : 'gets'} ${sets(f.reachedSets)}.`
      : f.moreAt ? ` With ${f.moreAt.days} days a week it gets ${sets(f.moreAt.sets)}.` : '';
    note(`Your ${n} focus: ${sets(f.before)} to ${setsBelow(f.after, f.target)} sets a week, short of the ${goal(f.target)} a focus aims for, because ${why}.${legs}${further}`);
  }
  // One line per cause, not one per muscle (a tight week listed a dozen);
  // a muscle a focus took from is said once, under "To make room" (U6-13).
  // Round 7 user audit (U7-7), round 8 (U8-7): a gap of one set or less, as
  // printed, is not listed.
  const picked = new Set((rep.focusResults || []).map((f) => f.muscle));
  const tookSet = new Set(took.map((x) => x.muscle));
  const printed = (v) => (Number.isInteger(v) ? v : Math.round(v));
  const short = (rep.belowTypical || []).filter((b) => !picked.has(b.muscle) && !tookSet.has(b.muscle)
    && !(rep.kitShort || []).some((k) => k.muscle === b.muscle) && b.target - printed(b.sets) > 1);
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
      const key = holdLabel((b.limits || [])[0]);
      if (!holds.has(key)) holds.set(key, []);
      holds.get(key).push(name(b.muscle));
    }
    const what = [...holds].map(([k, ms]) => `${k} (${ms.join(', ')})`).join('; ');
    note(`With ${args.days} days a week ${every} at least its minimum, and ${short.length} stay below the plan's usual amount: ${listed(short)}. What holds them back: ${what}.${at}`);
  } else {
    const byCause = new Map();
    for (const b of short) {
      const key = JSON.stringify(b.causes || null);
      if (!byCause.has(key)) byCause.set(key, []);
      byCause.get(key).push(b);
    }
    // Round 8 audits (U8-6, C8-5): no two lines carry the same cause words.
    // Where they would, the sessions are named; where they still would, the
    // muscles are joined in one line.
    const groups = [...byCause.values()];
    const build = (list, nameSessions) => causeText(list[0].causes, { many: list.length > 1, m: list[0].muscle, ms: list.map((b) => b.muscle), nameSessions, plan });
    const plain = groups.map((l) => causeText(l[0].causes, { many: l.length > 1, m: l[0].muscle, ms: l.map((b) => b.muscle), canon: true, plan }));
    const dup = plain.map((t) => plain.filter((x) => x === t).length > 1);
    const texts = groups.map((l, i) => (dup[i] ? causeText(l[0].causes, { many: l.length > 1, m: l[0].muscle, ms: l.map((b) => b.muscle), nameSessions: true, canon: true, plan }) : plain[i]));
    const merged = new Map();
    groups.forEach((l, i) => {
      if (!merged.has(texts[i])) merged.set(texts[i], { list: [...l], nameSessions: dup[i], parts: 1 });
      else { const e = merged.get(texts[i]); e.list.push(...l); e.parts += 1; }
    });
    for (const { list, nameSessions, parts } of merged.values()) {
      const text = parts > 1 ? build(list, nameSessions) : build(groups.find((l) => l[0] === list[0]), nameSessions);
      note(`Fewer sets a week than the plan's usual amount, because ${text}: ${listed(list)}.`);
    }
  }
  if (took.length) {
    // Round 6 audits (U6-3, C6-5): own sets beside own sets, and the counted
    // week beside the minimum it is judged on.
    note(`To make room for your focus: ${took.map((x) => `${name(x.muscle)} ${x.from} to ${x.to} sets of ${plural(x.muscle) ? 'their' : 'its'} own a week (${sets(x.countedTo)} counted, ${plural(x.muscle) ? 'their' : 'its'} minimum ${x.minimum})`).join('; ')}.`);
  }
  const firstCounted = notes.findIndex((x) => x.counted);
  notes.forEach((x, i) => {
    if (i === firstCounted) lines.push(COUNTED);
    lines.push(x.text);
  });
  return lines;
}

// ── D222 phase 7 (R80): the words of every change after the build ─────────
//
// Authority: docs/audit/plan-builder-map-2026-10-11/24-PHASE7-AFTER-BUILD-SPEC.md
// R73 to R83. Plain British English, calm, no em dash, and each line describes
// the plan rather than telling anyone what to do (D204).

/**
 * R83: the label of one of the preview's choices (adapt.structureOptions).
 * `option.kind`: 'length', 'days', 'drop_focus' or 'keep'.
 * @param {{ kind: string, change: ?object, muscle?: string }} option
 * @param {{ days: number, lengthMinutes: number }} args  the engine's arguments
 */
export function optionLabel(option, args) {
  const c = option.change || {};
  const days = c.daysPerWeek ?? args.days;
  const len = c.sessionLengthMinutes ?? args.lengthMinutes;
  switch (option.kind) {
    case 'length': return `Sessions of ${len} minutes, ${days} days a week`;
    case 'days': return `${days} days a week of ${len} minutes`;
    case 'drop_focus': return `${args.days} days without the ${(option.muscles || [option.muscle]).map(name).join(' and ')} focus`;
    case 'keep': return `Keep this plan: ${args.days} days a week of ${args.lengthMinutes} minutes`;
    default: return '';
  }
}

/** R83: the line above the preview's choices. */
export const OPTIONS_HEADING = 'Your choices';

// R71, R76, R77: what a change does to the plan, in plain words, for the
// person deciding whether to keep it. One clause per check, said of the plan.
const FAULT_CLAUSE = {
  C1: () => 'the week would no longer follow the order of its sessions',
  C2: (f) => `${f.muscle ? name(f.muscle) : 'a muscle'} would be trained in two sessions in a row`,
  C3: (f) => (/no rulebook pattern/.test(f.detail) ? 'the plan has no checks for this exercise'
    : /RIR/.test(f.detail) ? 'a compound would be taken to failure'
      : `one session would hold more sets of ${f.muscle ? name(f.muscle) : 'one muscle'} than a session may`),
  C4: (f) => (/below the minimum/.test(f.detail) ? `${f.muscle ? name(f.muscle) : 'a muscle'} would get fewer sets a week than its minimum`
    : `${f.muscle ? name(f.muscle) : 'a muscle'} would get more sets a week than the most a week may hold`),
  C6: (f) => (/allowed/.test(f.detail) ? 'an exercise would have more or fewer sets than one exercise may hold'
    : /working sets/.test(f.detail) ? 'a session would hold more sets than one session may'
      : f.muscle ? `a session would hold more exercises for ${name(f.muscle)} than one session may`
        : 'a session would hold more exercises than one session may'),
  C7: () => 'the rest between sets would be shorter than this exercise needs',
  C8: () => 'overhead pressing would be in more sessions a week than the plan allows',
  C9: () => 'the front of the shoulders would be loaded in two sessions in a row',
  C10: () => 'the exercise moves the shoulder in a way the plan leaves out',
  C12: () => 'the lower back would be loaded in two sessions in a row',
  C13: () => 'the lower back would be loaded more than the plan allows',
  C14: () => 'the elbows would be loaded more than the plan allows',
  C15: () => 'the knees would be loaded in two sessions in a row',
  C16: () => 'the same exercise would be in two sessions in a row',
  C17: () => 'a heavier exercise would come after a lighter one',
  C18: () => 'a session would run longer than the length you chose',
  S1: (f) => `${f.muscle ? name(f.muscle) : 'a muscle'} would have no exercise of ${f.muscle && plural(f.muscle) ? 'their' : 'its'} own`,
  S2: (f) => `${f.muscle ? name(f.muscle) : 'a muscle'} would have too little time to recover before ${f.muscle && plural(f.muscle) ? 'they are' : 'it is'} trained again`,
  S3: () => 'pulling would fall behind pressing',
  S4: () => 'the hamstrings would fall behind the quads',
  S5: () => 'a session would hold too little to be a session of its own',
  S6: () => 'an exercise would sit in a session that is not named for its muscle',
  S7: () => 'a session would no longer train what its name says',
  S8: () => 'the same movement would be in one session twice',
  S9: () => 'abs work would come before other work in a session',
  S10: (f) => `${f.muscle ? name(f.muscle) : 'a muscle'} would have too few sets of ${f.muscle && plural(f.muscle) ? 'their' : 'its'} own`,
  S11: () => 'the hamstrings would have no hinge or no curl all week',
  S12: () => 'a focus pick would fall short of its aim without the plan saying so',
  S13: () => 'a session built around the quads would have no lower-body compound',
  S14: () => 'the legs would be trained in two sessions a week',
};

/**
 * R71: the plain reason a change goes against the plan's checks, from the
 * new faults applyChange reports. At most two clauses, each said once.
 * @param {Array<{ code: string, detail?: string, muscle?: string }>} faults
 */
export function changeReason(faults) {
  const said = [];
  for (const f of Array.isArray(faults) ? faults : []) {
    const clause = FAULT_CLAUSE[f.code] ? FAULT_CLAUSE[f.code](f) : 'the plan would break one of its checks';
    if (!said.includes(clause)) said.push(clause);
  }
  if (!said.length) return null;
  const shown = said.slice(0, 2);
  const more = said.length > 2 ? ', and more' : '';
  return `With this change ${shown.join(', and ')}${more}.`;
}

/** R71, R76, R77: the confirm dialogue's words. */
export const CHANGE_CONFIRM = Object.freeze({
  title: 'This goes beyond your plan\'s checks',
  keep: 'Keep my change',
  back: 'Leave it as it was',
});

/** R75: the line when an exercise picked from the full library cannot go in. */
export const SWAP_BLOCKED = 'This exercise cannot go in this session without going beyond your plan\'s checks, so the plan is left as it was.';

// ── R78: the check-in card on a structure plan ─────────────────────────────

const setWord = (n) => (n === 1 ? 'set' : 'sets');
const upperFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const joinAnd = (parts) => (parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`);

/**
 * R78: the check-in card for a structure plan, in the card shape the screen
 * renders (plan/checkinPlacement.describeCheckin's): heading, lines,
 * unplacedLines, notRaisedLine, ifLeft and whether Apply shows.
 * @param {object} result  stored.structureCheckin's result
 */
export function structureCheckinCard(result) {
  const card = {
    kind: result.kind, showApply: false, heading: '', lines: [], unplacedLines: [], notRaisedLine: null,
    ifLeft: 'If you leave this, your plan carries on as planned.',
  };
  const moveText = (mv) => `${mv.name} ${mv.from} to ${mv.to}`;
  if (result.kind === 'raise') {
    if (!result.muscles.length) {
      card.heading = 'There is no room for more sets this block';
      card.ifLeft = null;
    } else {
      card.heading = `From next week: more sets for ${joinAnd(result.muscles.map((m) => name(m.muscle)))}`;
      card.showApply = true;
      for (const m of result.muscles) {
        const parts = m.moves.map(moveText);
        if (m.opened) parts.push(`${m.opened.name} joins with ${m.opened.sets} ${setWord(m.opened.sets)}`);
        card.lines.push(`${upperFirst(name(m.muscle))}, ${m.added} more ${setWord(m.added)} a week: ${joinAnd(parts)}.`);
      }
    }
    for (const m of result.unplaced) card.unplacedLines.push(`No room for more ${name(m)} this block.`);
    if (result.notRaised.length) {
      card.notRaisedLine = `Not raised: ${result.notRaised.map((x) => upperFirst(name(x.muscle))).join(', ')} (held by an Injuries & limitations entry or a soreness answer).`;
    }
    return card;
  }
  if (result.kind === 'reduce') {
    if (!result.muscles.length) {
      card.heading = 'There is nothing to take off next week';
      card.lines.push('Every muscle is already at its minimum.');
      card.ifLeft = null;
      return card;
    }
    card.heading = 'From next week: fewer sets for each muscle';
    card.lines.push('Each muscle gives about a fifth of its sets and stays at its minimum or above, for the rest of the block.');
    card.showApply = true;
    return card;
  }
  card.heading = 'Next week stays as your plan has it';
  card.lines.push('Your plan carries on as planned.');
  card.ifLeft = null;
  return card;
}

// ── R79: library, kit and hand-built plans ─────────────────────────────────

/**
 * R79: the one calm note on a fixed programme that goes beyond the checks
 * that apply to any plan. Never a change to the plan.
 * @param {Array<{ code: string, detail?: string, muscle?: string }>} faults
 */
export function fixedPlanNote(faults) {
  const reason = changeReason(faults);
  if (!reason) return null;
  const clause = reason.replace(/^With this change /, '').replace(/\.$/, '');
  return `This plan is kept as it was written. As written, ${clause}.`;
}

// ── R83: the plan explanation's spacing line for a structure plan ──────────

/**
 * R83: the spacing line of a structure plan's explanation. The structure
 * engine runs no recovery model, so the line states the hours alone and makes
 * no claim about recovery.
 */
export function structureSpacingText(backToBack, usual, apart) {
  return apart
    ? `Each muscle's sessions are at least ${Math.round(backToBack)} hours apart if you train on back-to-back days, and at least ${Math.round(usual)} hours apart in a normal week.`
    : `Some muscle groups are trained in neighbouring sessions, so those sessions are ${Math.round(backToBack)} hours apart if you train on back-to-back days and ${Math.round(usual)} hours apart in a normal week.`;
}

// ── R94: a plan that cannot be rebuilt without a choice ────────────────────

/**
 * R94: the one calm card on Today when the engine would need the person to
 * choose (their days or length do not build, or a length or focus question).
 * The plan keeps serving exactly as it is; nothing was changed.
 */
export const NEEDS_CHOICE_CARD = Object.freeze({
  title: 'Your plan can be updated',
  body: 'Updating it needs a choice from you, such as a different number of days or a longer session, so your plan has been left exactly as it is.',
  action: 'Update your plan',
});

// ── R92: the rebuild note's line for a plan the engine rebuilt ─────────────

/**
 * R92: what the rebuild did to the person's exercises, in plain words: kept,
 * swapped, added and taken out. Each list is shortened with a count, never cut
 * silently. Null when nothing is known.
 * @param {{ kept?: string[], replaced?: Array<{from: string, to: string}>, removed?: string[], added?: string[] }} changes
 * @param {(items: string[]) => string} listed
 */
export function engineChangesText(changes, listed) {
  if (!changes) return null;
  const kept = (changes.kept || []).filter(Boolean);
  const replaced = (changes.replaced || []).filter((r) => r && r.from && r.to);
  const removed = (changes.removed || []).filter(Boolean);
  const added = (changes.added || []).filter(Boolean);
  const parts = [];
  if (kept.length) parts.push(`Kept: ${listed(kept)}.`);
  if (replaced.length) parts.push(`Swapped: ${listed(replaced.map((r) => `${r.from} is now ${r.to}`))}.`);
  if (added.length) parts.push(`Added: ${listed(added)}.`);
  if (removed.length) parts.push(`Taken out: ${listed(removed)}.`);
  if (!parts.length) return null;
  return `${parts.join(' ')} Your plan was rebuilt with the same checks every new plan gets, and each exercise you already had stays wherever those checks allow it.`;
}
