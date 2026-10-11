/* global test */
/**
 * generate-samples.jest.js -- produces 03-REAL-SAMPLES.md and
 * 04-MEASURED-ISSUES.md for the plan-builder map (2026-10-11).
 *
 * How to re-run: copy this file to src/lib/plan/__tests__/zz_map.test.js and
 * run `npx cross-env TZ=Europe/London npx jest src/lib/plan/__tests__/zz_map.test.js`.
 * It calls the LIVE planner (src/lib/plan/planner.js buildPlan) the way the
 * app does (planAutoGen.buildPlanWithPlannerV2): choices from
 * resolveCatalogue over the REAL seeded exercise library (campaign16.helpers
 * LIBRARY, built from src/lib/exerciseCorpus exactly as the seed inserts it),
 * DIVISION_MATRIX from src/lib/planEngine.js, first block, no logged history,
 * average recovery, no learned factor, no continuity. Nothing is edited.
 */
import { buildPlan } from '../planner';
import { prescribeWeek } from '../prescribe';
import { resolveCatalogue } from '../catalogue';
import { divisionDirectFloor } from '../divisionStandard';
import { STANDARD_DIRECT_FLOOR } from '../science';
import { TYPICAL_WEEK_GAP_HOURS } from '../../recovery/constants';
import { DIVISION_MATRIX } from '../../planEngine';

const fs = require('fs');
const path = require('path');
const { LIBRARY } = require('../../__tests__/campaign16.helpers');

const OUT = path.resolve(__dirname, '../../../../docs/audit/plan-builder-map-2026-10-11');
const GOALS = ['mens_physique', 'classic_physique', 'bodybuilding', 'bikini', 'wellness', 'figure', 'womens_physique', 'general'];
const EQUIP = ['full_gym', 'machines_cables', 'dumbbells_only', 'home_gym', 'barbell_plates', 'bodyweight'];
const LOWER = new Set(['quads', 'hamstrings', 'glutes', 'adductors']);
const GROWTH = ['chest', 'back', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];


const choicesCache = {};
const choicesFor = (equipment) => {
  if (!choicesCache[equipment]) choicesCache[equipment] = resolveCatalogue({ library: LIBRARY, profile: equipment, loggedExerciseNames: [] });
  return choicesCache[equipment];
};
const creditsFor = (equipment) => {
  const map = {};
  for (const list of Object.values(choicesFor(equipment))) for (const c of list) map[c.name] = c.credits || {};
  return map;
};

function build(inp) {
  const choices = choicesFor(inp.equipment);
  return buildPlan({
    daysPerWeek: inp.days, sessionLengthMinutes: inp.minutes, equipment: inp.equipment, goal: inp.goal,
    experience: inp.experience || 'intermediate', nutritionPhase: null, recoveryRating: 'average',
    focusMuscles: inp.focus || [], addedMuscles: [], firstBlock: true, learnedFactor: null, ownGaps: null,
    loggedWeekly: null, choices, divisionMatrix: DIVISION_MATRIX, isStrength: false,
  });
}

// Per-session loads at the peak week: direct sets per muscle and fractional
// (direct plus half credits from other muscles' exercises).
function loads(w, credits) {
  const direct = {};
  const frac = {};
  for (const e of w.exercises) {
    direct[e.muscle] = (direct[e.muscle] || 0) + e.peakSets;
    frac[e.muscle] = (frac[e.muscle] || 0) + e.peakSets;
    for (const [m, c] of Object.entries(credits[e.name] || {})) if (m !== e.muscle && c > 0) frac[m] = (frac[m] || 0) + c * e.peakSets;
  }
  return { direct, frac };
}
const isOverheadPress = (e) => e.muscle === 'front_delts' && e.kind !== 'isolation';
const pressesFrontDelts = (e, credits) => isOverheadPress(e) || (credits[e.name] || {}).front_delts > 0;

function analyse(p, inp) {
  const credits = creditsFor(inp.equipment);
  const n = p.workouts.length;
  const gaps = TYPICAL_WEEK_GAP_HOURS[n] || [];
  const L = p.workouts.map((w) => loads(w, credits));
  const pairs = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (n < 2 || (n === 2 && i === 1)) { if (n === 2 && i === 1) { /* wrap pair counted once */ } if (n < 2) continue; }
    const a = p.workouts[i];
    const b = p.workouts[j];
    const sharedDirect = Object.keys(L[i].direct).filter((m) => (L[i].direct[m] || 0) >= 2 && (L[j].direct[m] || 0) >= 2).sort();
    const sharedLoad = Object.keys(L[i].frac).filter((m) => (L[i].frac[m] || 0) >= 3 && (L[j].frac[m] || 0) >= 3 && !sharedDirect.includes(m)).sort();
    const namesA = new Set(a.exercises.map((e) => e.name));
    const sharedEx = b.exercises.map((e) => e.name).filter((x) => namesA.has(x));
    pairs.push({ from: a.name, to: b.name, gapH: gaps[i % gaps.length], sharedDirect, sharedLoad, sharedEx });
  }
  const legSessions = p.workouts.filter((w) => w.exercises.some((e) => LOWER.has(e.muscle))).length;
  const overhead = p.workouts.map((w) => w.exercises.filter(isOverheadPress).length);
  const frontDeltPressSessions = p.workouts.map((w) => w.exercises.some((e) => pressesFrontDelts(e, credits)));
  const consecutiveFrontDelt = pairs.filter((_, i) => frontDeltPressSessions[i] && frontDeltPressSessions[(i + 1) % n]).length;
  const weekly = {};
  for (const w of p.workouts) for (const e of w.exercises) weekly[e.muscle] = (weekly[e.muscle] || 0) + e.peakSets;
  const belowFloor = GROWTH.filter((m) => (weekly[m] || 0) < (divisionDirectFloor(inp.goal, m) ?? STANDARD_DIRECT_FLOOR[m]));
  const minutesBySession = Object.fromEntries((p.v2.sessionMinutesAtPeak || []).map((mins, si) => [`s${si}`, mins]));
  return { pairs, legSessions, overhead, frontDeltPressSessions, consecutiveFrontDelt, weekly, belowFloor, minutesBySession };
}

function serveWeek(p, inp, week) {
  const credits = creditsFor(inp.equipment);
  const sessions = p.workouts.map((w) => ({ id: w.sessionKey, slots: w.exercises.map((e) => ({ id: e.slotKey, muscle: e.muscle, kind: e.kind, baseSets: e.sets, credits: credits[e.name] || {}, thinEquipment: e.thinEquipment, focus: p.v2.roles[e.muscle] === 'focus' })) }));
  const weekTargets = Object.fromEntries(Object.entries(p.v2.weeklyTargets).map(([m, list]) => [m, list[week - 1]]));
  return prescribeWeek({ sessions, weekTargets, facts: { exposureShares: p.v2.exposureShares, sessionCaps: p.v2.sessionCaps } }).sets;
}

const label = (inp) => `${inp.goal}, ${inp.days} days, ${inp.minutes} min, ${inp.equipment}, ${inp.experience || 'intermediate'}, focus ${(inp.focus || []).join(' + ') || 'none'}`;

function sampleMarkdown(inp, withWeeks = false) {
  const p = build(inp);
  const a = analyse(p, inp);
  const out = [];
  out.push(`### ${label(inp)}`);
  out.push('');
  out.push(`Plan name: ${p.name}. Structure: \`${p.v2.family}\`. Served order: ${p.workouts.map((w) => w.name).join(', ')}.`);
  out.push(`Readiness check passes: **${p.v2.readiness.passes}**. Limited muscles (lowest estimated recovery before a session): ${(p.v2.notes || []).filter((x) => x.kind === 'promise_limited').map((x) => `${x.muscle} ${Math.round(x.lowest * 100)}%`).join(', ') || 'none'}.`);
  out.push(`Sessions past the chosen length by more than 5 minutes at the peak: ${Object.keys(p.v2.overTime || {}).length ? Object.entries(p.v2.overTime).map(([k, v]) => `${p.workouts.find((w) => w.sessionKey === k)?.name} +${v} min`).join(', ') : 'none'}. Sessions past 8 exercises or 25 sets: ${(p.v2.overCeilings || []).map((k) => p.workouts.find((w) => w.sessionKey === k)?.name).join(', ') || 'none'}.`);
  out.push('');
  p.workouts.forEach((w, i) => {
    out.push(`**${i + 1}. ${w.name}** (about ${Math.round(a.minutesBySession[w.sessionKey] || 0)} min at the peak week; next session follows after ${a.pairs[i] ? a.pairs[i].gapH : '?'} h in the app's usual layout)`);
    out.push('');
    out.push('| # | Exercise | Muscle | Kind | Sets week 1 | Sets week 5 (peak) | Reps | Rest s |');
    out.push('|---|---|---|---|---|---|---|---|');
    w.exercises.forEach((e, k) => out.push(`| ${k + 1} | ${e.name} | ${e.muscle} | ${e.kind} | ${e.sets} | ${e.peakSets} | ${e.repMin}-${e.repMax} | ${e.restSec} |`));
    out.push('');
  });
  out.push('Weekly direct sets at the peak week: ' + Object.entries(a.weekly).sort((x, y) => y[1] - x[1]).map(([m, v]) => `${m} ${v}`).join(', ') + '.');
  out.push(`Muscles below the category's direct floor: ${a.belowFloor.join(', ') || 'none'}. Sessions with lower-body work: ${a.legSessions}. Overhead presses per session: ${a.overhead.join(' / ')}. Sessions that press the front delts (overhead press or a press crediting them): ${a.frontDeltPressSessions.filter(Boolean).length}, of which back-to-back pairs: ${a.consecutiveFrontDelt}.`);
  out.push('');
  out.push('Back-to-back sessions (in served order, wrapping to the start):');
  out.push('');
  out.push('| From | To | Usual gap h | Muscles with 2+ direct sets in both | Muscles with 3+ total sets incl. half credits in both | Same exercise in both |');
  out.push('|---|---|---|---|---|---|');
  for (const x of a.pairs) out.push(`| ${x.from} | ${x.to} | ${x.gapH} | ${x.sharedDirect.join(', ') || '-'} | ${x.sharedLoad.join(', ') || '-'} | ${x.sharedEx.join(', ') || '-'} |`);
  out.push('');
  if (withWeeks) {
    out.push('Sets per exercise in each week of the 6-week block, as the week server (prescribeWeek) serves them:');
    out.push('');
    const weeks = [1, 2, 3, 4, 5, 6].map((wk) => serveWeek(p, inp, wk));
    out.push('| Session | Exercise | W1 | W2 | W3 | W4 | W5 | W6 |');
    out.push('|---|---|---|---|---|---|---|---|');
    for (const w of p.workouts) for (const e of w.exercises) out.push(`| ${w.name} | ${e.name} | ${weeks.map((s) => s[e.slotKey]).join(' | ')} |`);
    out.push('');
    out.push('Weekly target per muscle (direct sets), weeks 1 to 6: ' + Object.entries(p.v2.weeklyTargets).map(([m, l]) => `${m} ${l.join('/')}`).join('; ') + '.');
    out.push('');
  }
  return out.join('\n');
}

test('map samples and measured issues', () => {
  // ── 03: real samples ──
  const md = [];
  md.push('# 03 Real samples from the live planner (generated 2026-10-11)');
  md.push('');
  md.push('Every plan below was produced by the live planner code on `main`, with the real seeded exercise library, by `tools/generate-samples.jest.js` in this folder. Nothing was typed by hand. Inputs not listed: first block, no logged history, average recovery rating, no learned factor, no continuity, not strength phase. "Usual gap" is `TYPICAL_WEEK_GAP_HOURS` in src/lib/recovery/constants.js (4 days: Mon, Tue, Thu, Fri). Users have no fixed training days, so any back-to-back pair can fall on consecutive days.');
  md.push('');
  md.push('## A. Men\'s physique, 4 days, 60 min, focus side delts and biceps, with all six weeks\n\nThis is the structure behind the founder\'s plan of 10 October (screenshots in the conversation: Legs + Abs, Upper A (Width), Shoulders + Arms, Upper B (Detail)). The founder\'s own plan shows different exercise names (machine chest press, hack squat, Smith machine Romanian deadlift) because the live app\'s catalogue prefers exercises the person has logged and the rebuild keeps the person\'s existing exercises (`plannerV2KeptChoices`, `src/lib/exercise/continuity.js`), and a different served order because the person\'s recovery rating, learned recovery factor and own gaps between sessions change the order (`personalise` in `src/lib/plan/planner.js`). This sample has no logged history, so it shows the catalogue\'s first choices and the population order.');
  md.push('');
  md.push(sampleMarkdown({ goal: 'mens_physique', days: 4, minutes: 60, equipment: 'full_gym', focus: ['side_delts', 'biceps'] }, true));
  md.push('## B. Every category, 3 to 6 days, 60 minutes, full gym, no focus');
  md.push('');
  for (const goal of GOALS) for (const days of [3, 4, 5, 6]) md.push(sampleMarkdown({ goal, days, minutes: 60, equipment: 'full_gym' }));
  md.push('## C. Variations: equipment, session length, focus, experience, 2 days');
  md.push('');
  const extra = [
    { goal: 'mens_physique', days: 4, minutes: 45, equipment: 'dumbbells_only' },
    { goal: 'mens_physique', days: 5, minutes: 75, equipment: 'full_gym', focus: ['chest'] },
    { goal: 'bikini', days: 4, minutes: 60, equipment: 'full_gym', focus: ['glutes'] },
    { goal: 'wellness', days: 5, minutes: 75, equipment: 'home_gym' },
    { goal: 'general', days: 2, minutes: 60, equipment: 'full_gym' },
    { goal: 'general', days: 3, minutes: 45, equipment: 'full_gym', experience: 'beginner' },
    { goal: 'bodybuilding', days: 6, minutes: 90, equipment: 'full_gym', focus: ['chest', 'back'] },
    { goal: 'classic_physique', days: 4, minutes: 45, equipment: 'machines_cables' },
    { goal: 'figure', days: 4, minutes: 60, equipment: 'barbell_plates' },
  ];
  for (const inp of extra) {
    try { md.push(sampleMarkdown(inp)); } catch (e) { md.push(`### ${label(inp)}\n\nBUILD FAILED: ${e && e.message}\n`); }
  }
  fs.writeFileSync(path.join(OUT, '03-REAL-SAMPLES.md'), md.join('\n'));

  // ── 04: measured issues over a matrix ──
  const rows = [];
  for (const goal of GOALS) for (const days of [2, 3, 4, 5, 6]) for (const minutes of [45, 75]) for (const equipment of EQUIP) for (const focus of [[], ['chest'], ['glutes', 'side_delts', 'chest']]) {
    const inp = { goal, days, minutes, equipment, focus };
    let p;
    try { p = build(inp); } catch (e) { rows.push({ inp, error: String(e && e.message) }); continue; }
    if (!p || !Array.isArray(p.workouts) || p.workouts.length === 0) { rows.push({ inp, error: 'empty plan' }); continue; }
    const a = analyse(p, inp);
    rows.push({
      inp, family: p.v2.family,
      readinessFail: !p.v2.readiness.passes,
      directOverlapPairs: a.pairs.filter((x) => x.sharedDirect.length > 0).length,
      directOverlap24h: a.pairs.filter((x) => x.sharedDirect.length > 0 && x.gapH <= 24).length,
      overlapMuscles: [...new Set(a.pairs.flatMap((x) => x.sharedDirect))],
      sameExerciseAdjacent: a.pairs.filter((x) => x.sharedEx.length > 0).length,
      overheadSessions: a.overhead.filter((c) => c > 0).length,
      frontDeltBackToBack: a.consecutiveFrontDelt,
      overTime: Object.keys(p.v2.overTime || {}).length,
      overCeilings: (p.v2.overCeilings || []).length,
      maxMinutes: Math.round(Math.max(...(p.v2.sessionMinutesAtPeak || [0]))),
      legSessions: a.legSessions,
      belowFloor: a.belowFloor,
    });
  }
  const ok = rows.filter((r) => !r.error);
  const pct = (xs, f) => `${xs.filter(f).length} of ${xs.length} (${Math.round((100 * xs.filter(f).length) / Math.max(1, xs.length))}%)`;
  const m = [];
  m.push('# 04 Measured issues across every input combination (generated 2026-10-11)');
  m.push('');
  m.push(`Built ${rows.length} plans with the live planner and the real exercise library: 8 categories x 2 to 6 days x 45 and 75 minutes x 6 equipment settings x 3 focus picks (none; chest; glutes + side delts + chest), intermediate, first block. Generator: tools/generate-samples.jest.js. Each measure is computed from the plan the app would save; definitions are under the table.`);
  m.push('');
  m.push(`Plans that failed to build: ${rows.length - ok.length}${rows.length - ok.length ? ' (' + [...new Set(rows.filter((r) => r.error).map((r) => `${r.inp.equipment}: ${r.error}`))].slice(0, 5).join('; ') + ')' : ''}.`);
  m.push('');
  m.push('## All plans');
  m.push('');
  m.push('| Measure | Plans affected |');
  m.push('|---|---|');
  m.push(`| The planner's own readiness check fails | ${pct(ok, (r) => r.readinessFail)} |`);
  m.push(`| At least one back-to-back pair trains the same muscle directly (2+ sets in both) | ${pct(ok, (r) => r.directOverlapPairs > 0)} |`);
  m.push(`| ...and that pair is 24 h apart in the app's usual layout | ${pct(ok, (r) => r.directOverlap24h > 0)} |`);
  m.push(`| The same exercise appears in two back-to-back sessions | ${pct(ok, (r) => r.sameExerciseAdjacent > 0)} |`);
  m.push(`| The front delts are pressed in two back-to-back sessions | ${pct(ok, (r) => r.frontDeltBackToBack > 0)} |`);
  m.push(`| An overhead press appears in 2 or more sessions | ${pct(ok, (r) => r.overheadSessions >= 2)} |`);
  m.push(`| A session runs more than 5 min past the chosen length | ${pct(ok, (r) => r.overTime > 0)} |`);
  m.push(`| A session holds more than 8 exercises or 25 sets | ${pct(ok, (r) => r.overCeilings > 0)} |`);
  m.push(`| A growth muscle sits below its category's direct floor | ${pct(ok, (r) => r.belowFloor.length > 0)} |`);
  m.push('');
  m.push('## By category');
  m.push('');
  m.push('| Category | Plans | Readiness fails | Back-to-back same muscle | ...24 h apart | Front delts pressed back to back | Over length | Over 8 ex / 25 sets | Longest session min | Lower-body sessions per week (min-max) |');
  m.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const goal of GOALS) {
    const g = ok.filter((r) => r.inp.goal === goal);
    const legs = g.map((r) => r.legSessions);
    m.push(`| ${goal} | ${g.length} | ${g.filter((r) => r.readinessFail).length} | ${g.filter((r) => r.directOverlapPairs > 0).length} | ${g.filter((r) => r.directOverlap24h > 0).length} | ${g.filter((r) => r.frontDeltBackToBack > 0).length} | ${g.filter((r) => r.overTime > 0).length} | ${g.filter((r) => r.overCeilings > 0).length} | ${Math.max(...g.map((r) => r.maxMinutes))} | ${Math.min(...legs)}-${Math.max(...legs)} |`);
  }
  m.push('');
  m.push('## By days per week');
  m.push('');
  m.push('| Days | Plans | Readiness fails | Back-to-back same muscle | ...24 h apart | Over length | Longest session min |');
  m.push('|---|---|---|---|---|---|---|');
  for (const days of [2, 3, 4, 5, 6]) {
    const g = ok.filter((r) => r.inp.days === days);
    m.push(`| ${days} | ${g.length} | ${g.filter((r) => r.readinessFail).length} | ${g.filter((r) => r.directOverlapPairs > 0).length} | ${g.filter((r) => r.directOverlap24h > 0).length} | ${g.filter((r) => r.overTime > 0).length} | ${Math.max(...g.map((r) => r.maxMinutes))} |`);
  }
  m.push('');
  m.push('## By equipment');
  m.push('');
  m.push('| Equipment | Plans | Readiness fails | Back-to-back same muscle | Over length | Below floor |');
  m.push('|---|---|---|---|---|---|');
  for (const eq of EQUIP) {
    const g = ok.filter((r) => r.inp.equipment === eq);
    m.push(`| ${eq} | ${g.length} | ${g.filter((r) => r.readinessFail).length} | ${g.filter((r) => r.directOverlapPairs > 0).length} | ${g.filter((r) => r.overTime > 0).length} | ${g.filter((r) => r.belowFloor.length > 0).length} |`);
  }
  m.push('');
  m.push('## Which muscles are trained directly in back-to-back sessions, and how often');
  m.push('');
  const count = {};
  for (const r of ok) for (const mm of r.overlapMuscles) count[mm] = (count[mm] || 0) + 1;
  m.push('| Muscle | Plans where it is trained directly in two back-to-back sessions |');
  m.push('|---|---|');
  for (const [mm, c] of Object.entries(count).sort((x, y) => y[1] - x[1])) m.push(`| ${mm} | ${c} of ${ok.length} |`);
  m.push('');
  m.push('## Definitions');
  m.push('');
  m.push('- Back-to-back: two sessions next to each other in the served order, including the last session to the first. The app does not fix training days, so any such pair can be trained on consecutive days.');
  m.push('- Trained directly: the muscle has 2 or more peak-week sets on its own exercises in that session.');
  m.push('- Front delts pressed: the session has an overhead press (a compound exercise whose muscle is front delts) or a press whose catalogue credits include the front delts.');
  m.push('- Readiness check: `v2.readiness.passes` from the planner, which simulates recovery at the app\'s usual spacing (src/lib/plan/readiness.js).');
  m.push('- Over length: `v2.overTime`, more than 5 minutes past the chosen session length after the rest ladder. Direct floor: src/lib/plan/divisionStandard.js, else src/lib/plan/science.js STANDARD_DIRECT_FLOOR.');
  fs.writeFileSync(path.join(OUT, '04-MEASURED-ISSUES.md'), m.join('\n'));
  fs.writeFileSync(path.join(OUT, 'tools', 'measured-issues.json'), JSON.stringify(rows, null, 0));
});
