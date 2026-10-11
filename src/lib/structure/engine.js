/**
 * engine.js -- D222: the structure engine. Builds a week from the rulebook,
 * never from a hand-written plan, and never saves a plan the checker fails.
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/09-RESEARCH-FINDINGS.md
 * s10 (stages S0 to S10), as corrected in 10-RESEARCH-VERIFICATION.md and
 * register D222 (founder Q1 = C: the full plan is always built and the clock
 * never removes a set; rest is shortened first; a session still more than
 * 5 minutes over asks for a longer session or more days).
 *
 * HOW SETS ARE PLACED (S5). The plain week first, the same with or without
 * focus, then focus on top (R39). In order:
 *   P0. every session's core and every muscle's first exercise of its own;
 *   A. every priority or standard muscle's own sets up to half its minimum
 *      (R27), then every muscle up to its category minimum (09 s3), both
 *      HARD: a muscle the kit can train that cannot reach them refuses the
 *      build; then arms' and rear delts' own sets towards their minimum;
 *   B. normal volume (typical, scaled by experience) by tier, P, S, then M
 *      (R36), inside the hard limits, never by the clock (Q1 = C);
 *   then pulling to match pressing (S3), every session worth the trip (S5),
 *      sets moved inside a session to where they are needed (R44), the
 *      order inside each session, and abs, calves and single sets moved
 *      between sessions only where that makes the week fit the length (R28,
 *      R44);
 *   C. focus picks up to typical + 4 (cap 20), last, on the finished week
 *      (R39): first into free room, then into room other muscles give from
 *      above their standard, their own tier or lower, the lowest first
 *      (R46, C5); pulling then matches added pressing and hamstrings half
 *      of added quads, and what the week cannot hold is reported.
 * After that nothing changes a set: a next-day light dose the next session
 * does not need is trained as normal (R42), and rest is shortened by rest
 * class until each session fits (R43). The week is built from session 1 and
 * turned to the person's start (R40).
 * Every step is one set on an existing exercise or a new exercise of two
 * sets, in a session the template lists the muscle in. A step is kept only
 * when the checker, run on the peak week, finds no new fault. Credits are
 * counted as they accrue, so a muscle fed by other exercises needs fewer of
 * its own sets, and no step may push any muscle past its weekly maximum.
 *
 * Pure, no I/O, deterministic: the same inputs give the same plan (C19).
 */
import {
  MUSCLES, PATTERNS, TIERS, VOLUME, FOCUS, EXPERIENCE, FAST_MUSCLES, LARGE_MUSCLES,
  SESSION_LIMITS, REP_RANGES, REST_TRIM_ORDER, TIME_MODEL,
  PROGRESSION, TEMPLATES, DAY_COUNTS, OPT_IN_MUSCLES, SIBLING_MUSCLES, CREDIT_FRACTION, rulebookCategory,
  restSecondsFor, restClassFor, orderKindFor, PER_SESSION, LIGHT_DOSE,
} from './rulebook';
import { structureChoices, variantOf } from './patterns';
import { checkPlan, weeklyMax, weeklyMin } from './checker';
import { weeklyLoad, sessionMinutes, sessionLoad, isTrained } from './measure';
import { senseCheck } from './sense';

// The patterns that train each muscle, in preference order (09 B2 and the
// catalogue's role order). `main` patterns rotate by visit; a `fallback`
// pattern is used only when the main ones have no unused exercise left in
// the kit (a barbell row only where no supported row exists; a skull
// crusher or close-grip press only where the cable and dumbbell extensions
// are missing). For a maintenance muscle the least fatiguing choice leads
// (R19). Men's physique leads chest with the incline press, then a fly,
// the upper chest being the category's judged priority (09 s1.1, B11 men's
// physique 4d; R20); a flat press only when more chest sets are needed.
const PATTERN_ORDER = Object.freeze({
  chest: { main: ['press_flat', 'press_incline', 'fly'], fallback: [] },
  lats: { main: ['vpull', 'pullover'], fallback: [] },
  upper_back: { main: ['row_supported'], fallback: ['row_barbell'] },
  side_delts: { main: ['lateral'], fallback: [] },
  rear_delts: { main: ['rear_fly', 'face_pull'], fallback: [] },
  biceps: { main: ['curl', 'hammer'], fallback: [] },
  triceps: { main: ['tri_overhead', 'pushdown'], fallback: ['skull', 'close_grip_press'] },
  quads: { main: ['squat_barbell', 'leg_ext', 'squat_machine', 'lunge'], fallback: [] },
  hamstrings: { main: ['hinge', 'leg_curl'], fallback: [] },
  glute_max: { main: ['hip_thrust', 'kickback'], fallback: [] },
  glute_med: { main: ['abduction'], fallback: [] },
  adductors: { main: ['adduction'], fallback: [] },
  calves: { main: ['calf'], fallback: [] },
  abs: { main: ['crunch', 'leg_raise'], fallback: [] },
});
const LOW_FATIGUE_ORDER = Object.freeze({
  chest: { main: ['press_incline', 'fly'], fallback: ['press_flat'] },
  quads: { main: ['squat_machine', 'leg_ext', 'lunge'], fallback: ['squat_barbell'] },
  triceps: { main: ['pushdown', 'tri_overhead'], fallback: ['skull', 'close_grip_press'] },
});
const CATEGORY_ORDER = Object.freeze({
  mens_physique: { chest: { main: ['press_incline', 'fly', 'press_flat'], fallback: [] } },
});
// Muscles that take the least fatiguing name in a category even above
// maintenance: men's physique presses on a machine or dumbbells before a
// barbell, so the incline press leads the session (R20).
const LOW_FATIGUE_NAMES = Object.freeze({ mens_physique: ['chest'] });
// R27 (register D222, coach audit): a priority or standard muscle's work in
// a session leads with a compound where the kit has one, as in every 09 B11
// plan (a vertical pull on both of men's physique's back days, a press on
// every chest day, a hip thrust on every bikini glute day). Hamstrings are
// left out on purpose: a leg curl is a full hamstring exercise (knee
// flexion is half the muscle's work), and 09 B11 alternates hinge and curl
// days to spread lower-back load.
const LEAD_MUSCLES = Object.freeze(['chest', 'lats', 'upper_back', 'quads', 'glute_max']);
// R27: muscles trained mostly through other exercises' credit, with no
// compound of their own.
const CREDIT_FED = Object.freeze(['biceps', 'triceps', 'rear_delts']);
// Body halves, for session order (R31) and focus overflow (R30).
const UPPER = new Set(['chest', 'lats', 'upper_back', 'front_delts', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'forearms', 'traps', 'neck']);
const regionOf = (m) => (m === 'abs' ? 'trunk' : UPPER.has(m) ? 'upper' : 'lower');
// R28 (coach audit): muscles whose isolation work may move to another
// session to keep every session near the chosen length (09's next-day list:
// they recover fastest and need no warm-up of their own).
const FLOATERS = Object.freeze(['abs', 'calves']);
// R31 (user audit): a session's name says what it holds. The words in a
// template name that already cover a muscle; anything else it holds is
// added to the name ("Push & Abs").
const COVERED_BY = Object.freeze({
  chest: /chest|push|upper/i, front_delts: /delts|shoulders|push|upper|chest/i,
  lats: /back|pull|upper|lats/i, upper_back: /back|pull|upper/i,
  side_delts: /delts|shoulders|push|upper/i, rear_delts: /delts|shoulders|pull|back|upper/i,
  biceps: /biceps|arms|pull|back|upper/i, triceps: /triceps|arms|push|chest|upper/i,
  forearms: /forearms|arms|upper/i, traps: /traps|back|shoulders|upper/i,
  quads: /quads|legs|lower/i, hamstrings: /hamstrings|hams|legs|lower/i,
  glute_max: /glute|legs|lower/i, glute_med: /glute|legs|lower/i, adductors: /adductors|legs|lower/i,
  // R38: abs and calves are named unless the name says so ("Legs & Abs").
  calves: /calves|legs|lower/i, abs: /abs|core/i,
});
const LABEL = Object.freeze({
  chest: 'Chest', front_delts: 'Front Delts', lats: 'Lats', upper_back: 'Back', side_delts: 'Side Delts',
  rear_delts: 'Rear Delts', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', traps: 'Traps',
  quads: 'Quads', hamstrings: 'Hamstrings', glute_max: 'Glutes', glute_med: 'Glute Med', adductors: 'Adductors',
  calves: 'Calves', abs: 'Abs', neck: 'Neck', tibialis: 'Tibialis',
});
/** A session's name with the muscles it holds that the name does not cover. */
function sessionName(base, muscles) {
  const extra = [...new Set(muscles)].filter((m) => LABEL[m] && COVERED_BY[m] && !COVERED_BY[m].test(base)).map((m) => LABEL[m]);
  if (!extra.length) return base;
  const parts = [...base.split(/, | & /), ...extra];
  return `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`;
}
const KIND_FATIGUE = Object.freeze({ isolation: 0, machine: 1, mod_compound: 2, heavy_compound: 3 });
const KIND_RANK = Object.freeze({ heavy_compound: 0, mod_compound: 1, machine: 2, isolation: 3 });
const TIER_RANK = Object.freeze({ P: 0, S: 1, M: 2, I: 3 });
// Faults that are expected while a plan is still being filled, and are
// judged once it is complete: minimums (C4 below), order (C17), length
// (C18), the template (C1) and the soft rear-delt warning.
const IN_PROGRESS_CODES = new Set(['C1', 'C17', 'C18']);

const tierOf = (category, muscle) => (TIERS[muscle] ? TIERS[muscle][category] : 'I');

/** Weeks 1 to 6 of an exercise from its peak sets (09 s8, B9; R1). */
export function weeksFor(peak, { nextDayException = false } = {}) {
  const w1 = Math.max(PROGRESSION.week1MinSets, Math.round(PROGRESSION.week1Fraction * peak));
  const start = Math.min(w1, peak);
  const weeks = [];
  for (let w = 1; w <= PROGRESSION.weeks; w += 1) {
    let sets;
    if (w === PROGRESSION.deloadWeek) sets = Math.max(1, Math.round(PROGRESSION.deloadFraction * peak));
    else sets = start + Math.round(((peak - start) * Math.min(w - 1, PROGRESSION.peakWeek - 1)) / (PROGRESSION.peakWeek - 1));
    let rir = PROGRESSION.rirLadder[w - 1];
    if (nextDayException && w !== PROGRESSION.deloadWeek) rir = Math.max(rir, PROGRESSION.nextDayExceptionMinRir);
    weeks.push({ sets, rir });
  }
  return weeks;
}

function normaliseFocus(category, focus) {
  const seen = [];
  const ignored = [];
  for (const m of Array.isArray(focus) ? focus : []) {
    if (seen.includes(m) || ignored.includes(m)) continue;
    if (!MUSCLES.includes(m) || tierOf(category, m) === 'I') { ignored.push(m); continue; }
    seen.push(m);
  }
  return { focus: seen.slice(0, FOCUS.maxPicks), ignored, dropped: seen.slice(FOCUS.maxPicks) };
}

/** Weekly targets per muscle (S2): minimum, normal volume and maximum. */
export function weeklyTargets(category, days, experience, focus) {
  const factor = EXPERIENCE[experience] ?? 1;
  const out = {};
  for (const m of Object.keys(TIERS)) {
    const t = tierOf(category, m);
    if (t === 'I') continue;
    const v = VOLUME[t];
    const min = weeklyMin(category, m, days, experience);
    const max = weeklyMax(category, m, focus);
    const typical = Math.max(min, Math.min(v.max, Math.round(v.typical * factor)));
    const target = focus.includes(m) ? Math.min(max, typical + FOCUS.addFractional) : typical;
    out[m] = { tier: t, min, typical, target, max };
  }
  return out;
}

function muscleOrder(category, focus) {
  return Object.keys(TIERS)
    .filter((m) => tierOf(category, m) !== 'I' && !OPT_IN_MUSCLES.includes(m))
    .sort((a, b) => (TIER_RANK[tierOf(category, a)] - TIER_RANK[tierOf(category, b)])
      || (Number(focus.includes(b)) - Number(focus.includes(a)))
      || (MUSCLES.indexOf(a) - MUSCLES.indexOf(b)));
}

function patternsFor(category, muscle, tier, hints) {
  const base = (tier === 'M' && LOW_FATIGUE_ORDER[muscle])
    || (CATEGORY_ORDER[category] && CATEGORY_ORDER[category][muscle])
    || PATTERN_ORDER[muscle] || { main: [], fallback: [] };
  const keep = (list) => (hints && hints[muscle] ? list.filter((p) => hints[muscle].includes(p)) : list);
  return { main: keep(base.main), fallback: keep(base.fallback) };
}

/** What the kit offers each muscle: how many names, and which patterns (S11). */
function kitOffer(kit) {
  const names = {};
  const patterns = {};
  for (const [p, list] of Object.entries(kit.byPattern)) {
    const m = PATTERNS[p] && PATTERNS[p].muscle;
    if (!m || !list.length) continue;
    (names[m] ||= new Set());
    for (const c of list) names[m].add(c.name);
    (patterns[m] ||= []).push(p);
  }
  return { names: Object.fromEntries(Object.entries(names).map(([m, v]) => [m, v.size])), patterns };
}

/**
 * Build a structure plan with one tie-break strategy (see STRATEGIES).
 * @param {object} args
 * @param {string} args.goal            an app goal key (rulebookCategory resolves it)
 * @param {number} args.days            2 to 6
 * @param {number} args.lengthMinutes   the chosen session length
 * @param {string} [args.equipment]     an equipment kit; full_gym when omitted
 * @param {string} [args.experience]    beginner, intermediate or advanced
 * @param {string[]} [args.focus]       rulebook muscles
 * @param {Array<object>} args.library  the exercise library
 * @param {Iterable<string>} [args.loggedExerciseNames]
 * @param {number} [args.startIndex]    where in the rotation the week starts (a cyclic shift)
 * @param {{ patterns: string, order: string }} strategy  one of STRATEGIES
 * @returns {{ ok: true, plan: object, report: object } | { ok: false, refusal: object }}
 */
function buildWith(args, strategy) {
  const category = rulebookCategory(args.goal);
  const days = args.days;
  if (!DAY_COUNTS.includes(days)) {
    return { ok: false, refusal: { reason: 'days_out_of_range', detail: `the rulebook covers 2 to 6 days, not ${days}` } };
  }
  const equipment = args.equipment || 'full_gym';
  // R45: none given means intermediate; a value the rulebook does not know
  // is refused, never read silently as intermediate.
  if (args.experience != null && !EXPERIENCE[args.experience]) {
    return { ok: false, refusal: { reason: 'experience_unknown', detail: `the rulebook has no experience level "${args.experience}"` } };
  }
  const experience = args.experience == null ? 'intermediate' : args.experience;
  const beginner = experience === 'beginner';
  const { focus, ignored: focusIgnored, dropped: focusDropped } = normaliseFocus(category, args.focus);

  // S1: the template, started where asked (a cyclic shift, never a reorder).
  const template = TEMPLATES[category][days];
  // R40: always built from session 1; buildStructurePlan rotates the
  // finished week to where the person starts, so the start can never change
  // whether a week builds or what it holds.
  const order = [...template];

  // S4 inputs: what the kit carries.
  const kit = structureChoices({ library: args.library, profile: equipment, loggedExerciseNames: args.loggedExerciseNames });
  const targets = weeklyTargets(category, days, experience, focus);
  const isLeadTier = (m) => !!targets[m] && (targets[m].tier === 'P' || targets[m].tier === 'S');
  // R27: the own sets a priority or standard muscle never goes below.
  const ownFloor = (m) => Math.ceil(targets[m].min / 2);

  const offer = kitOffer(kit);
  const plan = {
    category, days, equipment, experience, focus: [],
    lengthMinutes: args.lengthMinutes,
    untrainable: kit.untrainable.filter((m) => targets[m]),
    // S11 reads what the kit offers; set from the start so every sense
    // check during the build sees it.
    kitOffer: offer,
    // R32 (register D222): a muscle the kit gives exactly one exercise of
    // its own is held to what that exercise can carry (09 s7 anticipates
    // single-pattern kits with its 5-set allowance); a shortfall is
    // reported, never a refusal, as for a muscle the kit cannot train (R17).
    kitLimited: Object.keys(targets).filter((m) => !kit.untrainable.includes(m) && (offer.names[m] || 0) === 1),
    sessions: order.map((t) => ({ key: t.key, name: t.name, exercises: [] })),
  };
  const n = plan.sessions.length;
  const lists = order.map((t) => [...t.muscles]);
  const overflow = [];
  const hintsOf = order.map((t) => t.hints || null);

  // A next-day muscle in a session whose next session also lists it must be
  // a light dose there (09 s4, R1): isolation only, at most 4 direct sets,
  // held at RIR 2 or more all block.
  // R42: only when the next session can hold the muscle at all: a kit with a
  // single exercise for it can never put it in two neighbouring sessions
  // (C16), so the dose would be held back for nothing.
  const mustBeLight = lists.map((muscles, i) => new Set(muscles.filter((m) => FAST_MUSCLES.includes(m) && lists[(i + 1) % n].includes(m) && n > 1 && (offer.names[m] || 0) >= 2)));
  const visitsOf = (m) => lists.map((l, i) => (l.includes(m) ? i : -1)).filter((i) => i >= 0);

  const maxSetsFor = (m) => {
    if (beginner) return SESSION_LIMITS.beginnerSetsPerExercise;
    return kit.solePatternMuscles.includes(m) ? SESSION_LIMITS.setsPerExerciseSolePattern : SESSION_LIMITS.setsPerExerciseMax;
  };
  const exercisesPerMuscle = (m) => (m === 'front_delts' ? SESSION_LIMITS.exercisesPerMuscleFrontDelts
    : LARGE_MUSCLES.includes(m) ? SESSION_LIMITS.exercisesPerMuscleLarge : SESSION_LIMITS.exercisesPerMuscleOther);
  const maxExercises = beginner ? SESSION_LIMITS.beginnerExercises : SESSION_LIMITS.exercisesHard;

  const peak = PROGRESSION.peakWeek;
  const faultKey = (f) => `${f.code}|${f.session || ''}|${(f.sessions || []).join(',')}|${f.muscle || ''}|${f.detail}`;
  const currentFaults = () => {
    const r = checkPlan(plan, { weeks: [peak] });
    return r.failures.filter((f) => !IN_PROGRESS_CODES.has(f.code) && !(f.code === 'C4' && /below the minimum/.test(f.detail)));
  };
  let baseline = new Set(currentFaults().map(faultKey));
  const tryStep = (apply, undo) => {
    apply();
    const after = currentFaults();
    if (after.some((f) => !baseline.has(faultKey(f)))) { undo(); return false; }
    baseline = new Set(after.map(faultKey));
    return true;
  };

  const usedNear = (si) => {
    const ids = new Set();
    for (const j of [si, (si + 1) % n, (si - 1 + n) % n]) for (const ex of plan.sessions[j].exercises) ids.add(ex.id);
    return ids;
  };

  const makeExercise = (si, m, pattern, choice, sets) => {
    const light = mustBeLight[si].has(m);
    const ex = {
      id: choice.exerciseId || choice.name,
      name: choice.name,
      pattern,
      muscle: m,
      kind: choice.kind,
      extraJoints: [...choice.extraJoints],
      restSec: restSecondsFor(choice.kind, pattern).default,
      repRange: [...REP_RANGES[choice.kind]],
      peak: sets,
      nextDayException: light,
      solePattern: kit.solePatternMuscles.includes(m),
      reason: choice.reason,
      grade: choice.grade,
      source: choice.source,
      from: choice.from,
    };
    ex.weeks = weeksFor(sets, { nextDayException: light });
    return ex;
  };
  const setPeak = (ex, sets) => { ex.peak = sets; ex.weeks = weeksFor(sets, { nextDayException: ex.nextDayException }); };

  // The minimum and normal-volume passes never see the focus picks (C5):
  // they build the same plan with or without focus, and focus is added on top.
  const order2 = muscleOrder(category, []).filter((m) => !plan.untrainable.includes(m));
  const rank = (m) => order2.indexOf(m);
  const directIn = (si, m) => plan.sessions[si].exercises.filter((ex) => ex.muscle === m).reduce((t, ex) => t + ex.peak, 0);

  // The actions that add sets for muscle m in session si: one more set on
  // an exercise of m with room, or a new exercise of two sets (the first
  // name each candidate pattern offers that no neighbouring session uses).
  const actionsFor = (m, si) => {
    const tier = tierOf(category, m);
    const s = plan.sessions[si];
    const light = mustBeLight[si].has(m);
    const own = s.exercises.filter((ex) => ex.muscle === m);
    const out = [];
    // R25: above the minimum a beginner's session keeps 09's beginner limits.
    let setCap = growth && beginner ? Math.min(maxSetsFor(m), SESSION_LIMITS.beginnerGrowthSetsPerExercise) : maxSetsFor(m);
    // A light dose is at most 4 direct sets (09 s4; R42).
    if (light) setCap = Math.min(setCap, LIGHT_DOSE.maxDirectSets);
    const exerciseCap = growth && beginner ? SESSION_LIMITS.beginnerGrowthExercises : maxExercises;
    for (const ex of own) {
      if (ex.peak < setCap) out.push({ type: 'inc', m, si, ex, pattern: ex.pattern, sets: 1 });
    }
    if (s.exercises.length >= exerciseCap || own.length >= exercisesPerMuscle(m)) return out;
    // Rotation follows how many of the week's sessions already hold the
    // muscle, so its first exercise of the week takes its first preferred
    // pattern (R34: a bodybuilder's only biceps exercise was a hammer curl,
    // the rotation having started at the template's second visit).
    const v = plan.sessions.filter((x, j) => j !== si && x.exercises.some((ex) => ex.muscle === m)).length;
    const inKit = (p) => (kit.byPattern[p] || []).length > 0;
    const { main, fallback } = patternsFor(category, m, tier, hintsOf[si]);
    const mainAvail = main.filter(inKit);
    const rotated = mainAvail.map((_, i) => mainAvail[(i + Math.max(0, v)) % mainAvail.length]);
    const usedPatterns = new Set(own.map((ex) => ex.pattern));
    const near = usedNear(si);
    const sessionVariants = new Set(s.exercises.map((ex) => variantOf(ex.pattern, ex.name)));
    const inWeek = new Set(plan.sessions.flatMap((x) => x.exercises.map((ex) => ex.id)));
    const optionFor = (p) => {
      const names = kit.byPattern[p];
      // A maintenance muscle takes the least fatiguing name; otherwise the
      // names rotate by visit so two visits differ. Either way a name not yet
      // in the week comes before one that is, so a muscle's A and B sessions
      // use different exercises wherever the kit has them (09 s7).
      // R41: the person's own logged exercise first, then the catalogue's
      // names, the kit's stand-ins and the rulebook's supplements, in that
      // order in every kit; only within a source do the rotation and the
      // week's freshness choose.
      const lowFatigue = tier === 'M' || (LOW_FATIGUE_NAMES[category] || []).includes(m);
      const group = (c) => (c.from === 'thin_kit' ? 1 : c.from === 'supplement' ? 2 : 0);
      const rotatedNames = [0, 1, 2].flatMap((g) => {
        const list = names.filter((c) => group(c) === g);
        return lowFatigue
          ? [...list].sort((a, b) => (KIND_FATIGUE[a.kind] - KIND_FATIGUE[b.kind]))
          : list.map((_, i) => list[(i + Math.max(0, v)) % list.length]);
      });
      const fresh = (c) => (inWeek.has(c.exerciseId || c.name) ? 1 : 0);
      const ordered = rotatedNames.map((c, i) => ({ c, i }))
        .sort((a, b) => (Number(!!b.c.logged) - Number(!!a.c.logged)) || (group(a.c) - group(b.c)) || (fresh(a.c) - fresh(b.c)) || (a.i - b.i))
        .map((x) => x.c);
      const choices = ordered.filter((c) => !near.has(c.exerciseId || c.name) && !sessionVariants.has(variantOf(p, c.name)));
      return choices.length ? { pattern: p, choices } : null;
    };
    // R24: a pattern already in the session comes back only when no other
    // main pattern of the muscle has an exercise to offer here, and then
    // only as a different variant (optionFor). A next-day light dose takes
    // isolation only.
    const allowedKind = (p) => !light || PATTERNS[p].kind === 'isolation';
    // The muscle's first exercise in the session: a compound for a lead
    // muscle (R27); otherwise, when the rest of the week trains the muscle
    // with one pattern only, its other pattern (09 s7: a different role on
    // each visit, so a week never trains hamstrings with hinges alone).
    let pool = rotated;
    if (!own.length && !light) {
      const leads = LEAD_MUSCLES.includes(m) && (tier === 'P' || tier === 'S')
        ? rotated.filter((p) => PATTERNS[p].kind === 'compound' && optionFor(p)) : [];
      const elsewhere = new Set(plan.sessions.flatMap((x, j) => (j === si ? [] : x.exercises.filter((ex) => ex.muscle === m).map((ex) => ex.pattern))));
      const unvisited = elsewhere.size === 1 ? rotated.filter((p) => !elsewhere.has(p) && optionFor(p)) : [];
      if (leads.length) pool = leads;
      else if (unvisited.length) pool = unvisited;
    }
    const freshMain = pool.some((p) => !usedPatterns.has(p) && allowedKind(p) && optionFor(p));
    const candidates = [
      ...pool.filter((p) => !usedPatterns.has(p)),
      ...(freshMain ? [] : pool.filter((p) => usedPatterns.has(p))),
      ...fallback.filter((p) => inKit(p) && (!usedPatterns.has(p) || !freshMain)),
    ].filter(allowedKind);
    // New-exercise actions: one per main pattern, each valued on its own
    // credits, so a compound that also covers another muscle's shortfall
    // wins over an isolation when both are preferred choices (ties keep the
    // preference order). Fallback patterns compete only when no main
    // pattern has an exercise left; their actions carry every option in
    // order.
    const mainSet = new Set(main);
    const mainCandidates = candidates.filter((p) => mainSet.has(p));
    const fallbackCandidates = candidates.filter((p) => !mainSet.has(p));
    const options = [];
    if (strategy.patterns === 'preference') {
      // Preference mode: one action whose patterns are tried strictly in the
      // preference order, valued on the first.
      for (const p of [...mainCandidates, ...fallbackCandidates]) { const o = optionFor(p); if (o) options.push(o); }
      if (options.length) out.push({ type: 'open', m, si, pattern: options[0].pattern, options, sets: SESSION_LIMITS.setsPerExerciseMin, patternIndex: 0 });
      return out;
    }
    mainCandidates.forEach((p, pi) => {
      const o = optionFor(p);
      if (o) out.push({ type: 'open', m, si, pattern: p, options: [o], sets: SESSION_LIMITS.setsPerExerciseMin, patternIndex: pi });
    });
    if (!out.some((a) => a.type === 'open')) {
      for (const p of fallbackCandidates) { const o = optionFor(p); if (o) options.push(o); }
      if (options.length) out.push({ type: 'open', m, si, pattern: options[0].pattern, options, sets: SESSION_LIMITS.setsPerExerciseMin, patternIndex: mainCandidates.length });
    }
    return out;
  };

  // What one action is worth: the shortfall it closes, per set added. A
  // set closes up to one set of its own muscle's shortfall and half a set
  // of each muscle its pattern credits.
  const valueOf = (a, deficit, direct = false) => {
    let closed = Math.min(deficit[a.m] || 0, a.sets);
    if (!direct) for (const c of PATTERNS[a.pattern].credits) closed += Math.min(deficit[c] || 0, CREDIT_FRACTION * a.sets);
    return closed / a.sets;
  };

  const apply = (a) => {
    if (a.type === 'inc') return tryStep(() => setPeak(a.ex, a.ex.peak + 1), () => setPeak(a.ex, a.ex.peak - 1));
    const s = plan.sessions[a.si];
    for (const { pattern, choices } of a.options) {
      for (const choice of choices) {
        const ex = makeExercise(a.si, a.m, pattern, choice, a.sets);
        if (tryStep(() => s.exercises.push(ex), () => s.exercises.pop())) return true;
      }
    }
    return false;
  };

  // R22: a further session for a muscle short of its minimum: one that
  // neighbours no session listing it, already lists a muscle of its group,
  // and carries the fewest sets (the earlier on a tie).
  const overflowSession = (m, siblings = SIBLING_MUSCLES[m] || []) => {
    const listing = lists.map((l, i) => (l.includes(m) ? i : -1)).filter((i) => i >= 0);
    const near = new Set(listing.flatMap((i) => [i, (i + 1) % n, (i - 1 + n) % n]));
    const sets = (i) => plan.sessions[i].exercises.reduce((t, ex) => t + ex.peak, 0);
    const options = lists.map((l, i) => i)
      .filter((i) => !near.has(i) && lists[i].some((x) => siblings.includes(x)))
      .sort((a, b) => (sets(a) - sets(b)) || (a - b));
    return options.length ? options[0] : null;
  };

  // Fill towards a goal per muscle: at each step the action that closes the
  // most shortfall per set; ties go to the muscle furthest from its goal,
  // then priority (P, S, M; focus; rulebook order), then the session with
  // the fewest of that muscle's sets, then the earlier session.
  const directWeek = () => {
    const out = {};
    for (const s of plan.sessions) for (const ex of s.exercises) out[ex.muscle] = (out[ex.muscle] || 0) + ex.peak;
    return out;
  };
  // `direct`: measure a muscle by its own sets only (R27's floor);
  // `fair`: the muscle furthest below its goal, as a share of it, first, so
  // a week that cannot hold every muscle's normal volume gives each the same
  // share (user and coach audits: general 2 days left chest at its minimum
  // while a second row took a slot); `overflowSiblings`: the muscles whose
  // sessions a muscle short of its goal may join (R22, R30).
  const cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  const posOf = (a) => (a.ex ? plan.sessions[a.si].exercises.indexOf(a.ex) : plan.sessions[a.si].exercises.length);
  // `incOnly`: only more sets on exercises already there (R38, beginners);
  // `protect`: muscles a repair may never take a set from (R36: a lower
  // tier's pass never takes from a higher tier's normal volume);
  // `limitMinutes`: a step is kept only while its session, at floor rest,
  // stays inside it (R36, the refill after R28's moves).
  const fill = (goalOf, muscles, {
    allowOverflow = false, allowRepair = true, direct = false, fair = false, overflowSiblings = null,
    incOnly = false, protect = null, limitMinutes = null, byTier = false, noLoss = false, guardSense = false,
  } = {}) => {
    const refused = new Set();
    const stepKey = (a) => `${a.type}|${a.si}|${a.m}|${a.pattern}|${a.ex ? a.ex.id : ''}`;
    for (;;) {
      const weekly = weeklyLoad(plan, peak);
      const own = direct ? directWeek() : null;
      const level = (m) => (direct ? own[m] || 0 : (weekly[m] || {}).fractional || 0);
      const deficit = {};
      for (const m of muscles) deficit[m] = Math.max(0, goalOf(m) - level(m));
      const wanting = muscles.filter((m) => deficit[m] > 0);
      if (!wanting.length) break;
      const actions = [];
      for (const m of wanting) for (const si of visitsOf(m)) actions.push(...actionsFor(m, si).filter((a) => (!incOnly || a.type === 'inc') && !refused.has(stepKey(a))));
      const byValue = (a, b) => valueOf(b, deficit, direct) - valueOf(a, deficit, direct);
      const byNeed = (a, b) => (deficit[b.m] / goalOf(b.m)) - (deficit[a.m] / goalOf(a.m));
      const byRank = (a, b) => rank(a.m) - rank(b.m);
      // 'compact' fills an exercise before opening another, saving the
      // session's exercise slots for muscles that need their own.
      const byCompact = (a, b) => (a.type === 'inc' ? 0 : 1) - (b.type === 'inc' ? 0 : 1);
      const first = fair ? [byNeed, byValue, byRank] : strategy.order === 'priority' ? [byRank, byValue, byNeed]
        : strategy.order === 'need' ? [byNeed, byValue, byRank]
          : strategy.order === 'compact' ? [byCompact, byValue, byNeed] : [byValue, byNeed, byRank];
      actions.sort((a, b) => first[0](a, b) || first[1](a, b) || first[2](a, b)
        || (directIn(a.si, a.m) - directIn(b.si, b.m))
        || (a.si - b.si)
        || ((a.type === 'inc' ? 0 : 1) - (b.type === 'inc' ? 0 : 1))
        || ((a.patternIndex || 0) - (b.patternIndex || 0))
        // R45: an exact tie falls to position, never to the sort's stability
        // (the app runs on Hermes, the tests on V8).
        || (posOf(a) - posOf(b)) || cmp(a.pattern, b.pattern) || cmp(a.m, b.m));
      let done = false;
      for (const a of actions) {
        if (valueOf(a, deficit, direct) <= 0) break;
        const s = plan.sessions[a.si];
        const before = s.exercises.map((ex) => [ex, ex.peak]);
        if (!apply(a)) continue;
        if (limitMinutes != null && Math.round(floorMinutes(s)) > limitMinutes) {
          s.exercises = before.map(([ex]) => ex);
          before.forEach(([ex, p]) => setPeak(ex, p));
          baseline = new Set(currentFaults().map(faultKey));
          refused.add(stepKey(a));
          continue;
        }
        done = true;
        break;
      }
      if (done) continue;
      // Nothing placeable: a muscle short of its minimum may take a further
      // session (R22); otherwise every wanting muscle is as full as it can be.
      let opened = false;
      if (allowOverflow) {
        for (const m of wanting) {
          const extra = overflowSession(m, overflowSiblings ? overflowSiblings(m) : undefined);
          if (extra != null) {
            lists[extra].push(m);
            overflow.push({ muscle: m, session: plan.sessions[extra].key });
            opened = true;
            break;
          }
        }
      }
      if (!opened) break;
    }
    if (allowRepair) repair(goalOf, muscles, protect, byTier, noLoss, guardSense);
    const weekly = weeklyLoad(plan, peak);
    const own = directWeek();
    return muscles.filter((m) => (direct ? own[m] || 0 : (weekly[m] || {}).fractional || 0) < goalOf(m));
  };
  const fractional = (m) => (weeklyLoad(plan, peak)[m] || { fractional: 0 }).fractional;

  // Repair: a muscle still short of its goal may take a set (or a two-set
  // exercise) that another exercise in one of its sessions can spare, when
  // every muscle that exercise counts for stays at or above its own goal.
  // The freed room is kept only if the short muscle then gains a set; so a
  // repair never leaves any muscle below its goal to pay for another.
  // `protect(donor, short)`: a muscle that may not give to the short one;
  // `byTier`: the lowest tier gives first (R46, focus); `noLoss`: the short
  // muscle takes every set given, so the week never loses one (C5, R46);
  // `guardSense`: a step that breaks a sense check is undone (a beginner's
  // only leg curl given to a glute focus left hamstrings without a curl,
  // S11). Pressing against pulling and quads against hamstrings are left to
  // the focus phase, which raises the other side after the fill, and abs
  // last (S9) to the session order, which runs after it.
  function repair(goalOf, muscles, protect = null, byTier = false, noLoss = false, guardSense = false) {
    const quietSense = () => new Set(senseCheck(plan).failures.filter((f) => !['S3', 'S4', 'S9', 'S12'].includes(f.code))
      .map((f) => `${f.code}|${f.session || ''}|${f.muscle || ''}|${f.week || ''}`));
    const senseBefore = guardSense ? quietSense() : null;
    const goalAll = (m) => (muscles.includes(m) ? goalOf(m) : (targets[m] ? Math.min(goalOf(m) || 0, targets[m].min) : 0));
    for (let guard = 0; guard < 200; guard += 1) {
      const weekly = weeklyLoad(plan, peak);
      const fr = (m) => (weekly[m] || {}).fractional || 0;
      const short = muscles.filter((m) => fr(m) < goalOf(m));
      if (!short.length) return;
      let improved = false;
      for (const m of short) {
        for (const si of visitsOf(m)) {
          const s = plan.sessions[si];
          // Never taken: a muscle's only exercise of the week, or an exercise
          // the session's name depends on (the sense order, D222).
          const protectedEx = (ex) => {
            const weekCount = plan.sessions.reduce((t, x) => t + x.exercises.filter((y) => y.muscle === ex.muscle).length, 0);
            if (weekCount <= 1) return true;
            const group = (order[si].core || []).find((g) => g.includes(ex.muscle));
            return !!group && s.exercises.filter((y) => group.includes(y.muscle)).length <= 1;
          };
          const donors = s.exercises
            .filter((ex) => ex.muscle !== m && !(protect && protect(ex.muscle, m)))
            .map((ex) => ({ ex, take: ex.peak > SESSION_LIMITS.setsPerExerciseMin ? 1 : ex.peak }))
            .filter(({ ex, take }) => !(take === ex.peak && protectedEx(ex)))
            // R34: a repair never takes a muscle's own sets below its floor,
            // nor an arm's or rear delt's below its minimum, the sets the
            // own-set pass placed so credit would not stand in for them.
            .filter(({ ex, take }) => !(isLeadTier(ex.muscle) && (directWeek()[ex.muscle] || 0) - take
              < (CREDIT_FED.includes(ex.muscle) ? targets[ex.muscle].min : ownFloor(ex.muscle))))
            .filter(({ ex, take }) => fr(ex.muscle) - take >= goalAll(ex.muscle)
              && PATTERNS[ex.pattern].credits.every((c) => fr(c) - CREDIT_FRACTION * take >= goalAll(c)))
            .sort((a, b) => (byTier ? TIER_RANK[tierOf(category, b.ex.muscle)] - TIER_RANK[tierOf(category, a.ex.muscle)] : 0)
              || ((fr(b.ex.muscle) - goalAll(b.ex.muscle)) - (fr(a.ex.muscle) - goalAll(a.ex.muscle))) || (s.exercises.indexOf(a.ex) - s.exercises.indexOf(b.ex)));
          for (const { ex, take } of donors) {
            const at = s.exercises.indexOf(ex);
            const shrink = () => { if (take === ex.peak) s.exercises.splice(at, 1); else setPeak(ex, ex.peak - take); };
            const removing = take === ex.peak;
            if (!tryStep(shrink, removing ? () => s.exercises.splice(at, 0, ex) : () => setPeak(ex, ex.peak + take))) continue;
            const deficit = {};
            const w2 = weeklyLoad(plan, peak);
            for (const x of muscles) deficit[x] = Math.max(0, goalOf(x) - ((w2[x] || {}).fractional || 0));
            const options = actionsFor(m, si).sort((a, b) => (valueOf(b, deficit) - valueOf(a, deficit))
              || ((a.type === 'inc' ? 0 : 1) - (b.type === 'inc' ? 0 : 1)) || ((a.patternIndex || 0) - (b.patternIndex || 0)));
            const gain = (a) => {
              if (!(valueOf(a, deficit) > 0 && (!noLoss || a.sets >= take) && apply(a))) return false;
              if (!senseBefore || ![...quietSense()].some((k) => !senseBefore.has(k))) return true;
              if (a.type === 'inc') setPeak(a.ex, a.ex.peak - 1); else s.exercises.pop();
              baseline = new Set(currentFaults().map(faultKey));
              return false;
            };
            if (options.some(gain)) { improved = true; break; }
            // Nothing gained: put the donor back as it was.
            if (removing) s.exercises.splice(at, 0, ex); else setPeak(ex, ex.peak + take);
            baseline = new Set(currentFaults().map(faultKey));
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (!improved) return;
    }
  }

  const setsOf = (si) => plan.sessions[si].exercises.reduce((t, ex) => t + ex.peak, 0);
  const hasDirect = (si, m) => directIn(si, m) >= SESSION_LIMITS.setsPerExerciseMin;
  const openFor = (m, si) => actionsFor(m, si).filter((a) => a.type === 'open').some((a) => apply(a));

  // P0 (the founder's sense order, D222): before any volume, every session
  // gets what its name promises (its template core), and every muscle the
  // category trains gets an exercise of its own somewhere in the week, so no
  // muscle is covered only by other exercises' credits.
  for (let si = 0; si < n; si += 1) {
    for (const group of order[si].core || []) {
      const trainable = group.filter((m) => targets[m] && !plan.untrainable.includes(m) && lists[si].includes(m));
      if (!trainable.length || trainable.some((m) => hasDirect(si, m))) continue;
      [...trainable].sort((a, b) => rank(a) - rank(b)).some((m) => openFor(m, si));
    }
  }
  for (const m of order2) {
    if (visitsOf(m).some((si) => hasDirect(si, m))) continue;
    [...visitsOf(m)].sort((a, b) => (setsOf(a) - setsOf(b)) || (a - b)).some((si) => openFor(m, si));
  }

  // A: minimums (HARD). B: normal volume (Q1 = C: never cut by the clock).
  // C: focus on top, last, never below another muscle's standard (C5, R46).
  // R27 (coach and user audits: bodybuilding arms had 2 sets of their own
  // a week, the rest credit from rows and presses). First the floor: every
  // priority or standard muscle takes own sets up to half its minimum
  // (HARD), so no muscle's minimum is met by credit alone. Then the minimum
  // counted with credit (HARD, 09 s3). Then, before normal volume, the
  // muscles that live on credit (arms and rear delts, no compound of their
  // own) take own sets towards their minimum, as far as the maxima allow (09
  // counts a week's rows against the biceps' maximum): a bodybuilder's week
  // is better with six sets of curls than with two more chest sets.
  let growth = false;
  const floorMuscles = order2.filter(isLeadTier);
  const shortOwn = fill(ownFloor, floorMuscles, { allowOverflow: true, direct: true, fair: true, allowRepair: false });
  const shortOfMinimum = shortOwn.length ? [] : fill((m) => targets[m].min, order2, { allowOverflow: true })
    .filter((m) => !plan.kitLimited.includes(m));
  if (shortOwn.length || shortOfMinimum.length) {
    const ownSets = directWeek();
    const short = shortOwn.length ? shortOwn : shortOfMinimum;
    return {
      ok: false,
      refusal: {
        reason: 'minimum_unreachable',
        muscles: short.map((m) => (shortOwn.length
          ? { muscle: m, sets: ownSets[m] || 0, minimum: ownFloor(m), own: true }
          : { muscle: m, sets: fractional(m), minimum: targets[m].min })),
        detail: `${short.join(', ')} cannot reach the category minimum${shortOwn.length ? ' with exercises of their own' : ''} at ${days} days within the safety limits`,
      },
    };
  }
  growth = true;
  fill((m) => targets[m].min, order2.filter((m) => isLeadTier(m) && CREDIT_FED.includes(m)), { direct: true, fair: true, allowRepair: false, incOnly: beginner });
  // R36: normal volume by tier (09 B10 S5: P before S before M), fairly
  // within each; a repair in a tier's pass may take sets from a lower tier
  // down to its minimum, never from a higher tier.
  const TIER_ORDER = ['P', 'S', 'M'];
  const fillTypical = (opts = {}) => {
    TIER_ORDER.forEach((tier, i) => {
      const higher = new Set(TIER_ORDER.slice(0, i));
      fill((m) => targets[m].typical, order2.filter((m) => targets[m].tier === tier), {
        fair: true, protect: (m) => !!targets[m] && higher.has(targets[m].tier), ...opts,
      });
    });
  };
  fillTypical();
  growth = false;
  plan.overflow = overflow;

  const length = Number.isFinite(args.lengthMinutes) ? args.lengthMinutes : null;
  const limit = length != null ? length + TIME_MODEL.toleranceMinutes : null;
  const floorMinutes = (s) => {
    const saved = s.exercises.map((ex) => ex.restSec);
    s.exercises.forEach((ex) => { ex.restSec = restSecondsFor(ex.kind, ex.pattern).floor; });
    const m = sessionMinutes(s, peak, equipment);
    s.exercises.forEach((ex, i) => { ex.restSec = saved[i]; });
    return m;
  };
  const senseKey = (f) => `${f.code}|${f.session || ''}|${f.muscle || ''}|${f.week || ''}`;
  const senseFaults = () => new Set(senseCheck(plan).failures.map(senseKey));
  const newIn = (now, before) => [...now].some((k) => !before.has(k));
  const ownOf = (muscles) => plan.sessions.reduce((t, s) => t + s.exercises.filter((ex) => muscles.includes(ex.muscle)).reduce((u, ex) => u + ex.peak, 0), 0);
  const pullShort = () => ownOf(['lats', 'upper_back']) < ownOf(['chest', 'front_delts']);

  // Sense passes (D222). Each only adds sets, inside every check.
  // S3: pulling at least matches pressing. Run again after any later refill
  // (R36); after focus the focus phase keeps the balance itself (R39, R46).
  function balancePushPull() {
    const backMuscles = ['lats', 'upper_back'].filter((m) => targets[m] && !plan.untrainable.includes(m));
    for (let guard = 0; guard < 40 && pullShort(); guard += 1) {
      const actions = backMuscles.flatMap((m) => visitsOf(m).flatMap((si) => actionsFor(m, si)))
        .sort((a, b) => ((a.type === 'inc' ? 0 : 1) - (b.type === 'inc' ? 0 : 1)) || (setsOf(a.si) - setsOf(b.si)) || (a.si - b.si) || (rank(a.m) - rank(b.m)));
      if (!actions.some((a) => apply(a))) break;
    }
    // Still pressing more than pulling (a kit with no lat exercise caps the
    // pulling): pressing sets above their minimum give way one at a time,
    // from the exercise with the most sets. Normal volume is the softest
    // goal (09 B8), shoulder balance is not. The plain week only.
    const pushMuscles = ['chest', 'front_delts'].filter((m) => targets[m]);
    for (let guard = 0; guard < 40 && pullShort(); guard += 1) {
      const own = directWeek();
      const spare = plan.sessions.flatMap((x) => x.exercises)
        .filter((ex) => pushMuscles.includes(ex.muscle) && ex.peak > SESSION_LIMITS.setsPerExerciseMin
          && own[ex.muscle] - 1 >= Math.max(targets[ex.muscle].min, ownFloor(ex.muscle)) && fractional(ex.muscle) - 1 >= targets[ex.muscle].min)
        .sort((a, b) => b.peak - a.peak);
      if (!spare.some((ex) => tryStep(() => setPeak(ex, ex.peak - 1), () => setPeak(ex, ex.peak + 1)))) break;
    }
  }
  balancePushPull();
  // S5: every session worth the trip: 3 exercises and 8 working sets (6
  // for a beginner), topped up from the muscles the session lists.
  const minSessionSets = beginner ? 6 : 8;
  for (let si = 0; si < n; si += 1) {
    for (let guard = 0; guard < 20; guard += 1) {
      const s = plan.sessions[si];
      if (s.exercises.length >= 3 && setsOf(si) >= minSessionSets) break;
      const wantOpen = s.exercises.length < 3;
      const actions = lists[si].filter((m) => targets[m] && !plan.untrainable.includes(m))
        .flatMap((m) => actionsFor(m, si))
        .filter((a) => (wantOpen ? a.type === 'open' : true))
        .sort((a, b) => ((a.type === 'inc' ? 0 : 1) - (b.type === 'inc' ? 0 : 1)) || (directIn(si, a.m) - directIn(si, b.m)) || (rank(a.m) - rank(b.m)));
      if (!actions.some((a) => apply(a))) break;
    }
  }

  // R44 (coach audit 3): after normal volume, sets move inside a session to
  // where they are needed: from a muscle above its minimum and its own
  // floor to a muscle of a higher tier below its normal volume, or to an arm
  // or rear delt below its own minimum (R27). Each move must lower the
  // week's shortfall, read in that order (arms' and rear delts' own
  // minimum, then P, S and M normal volume), so the pass ends; and it is
  // kept only inside every rulebook and sense check. Like normal volume it
  // never reads the clock (Q1 = C: the same week at every length; a longer
  // session goes through rest and the length question as any set does).
  const shortfall = (fr, own) => {
    const v = [0, 0, 0, 0];
    for (const [m, t] of Object.entries(targets)) {
      if (plan.untrainable.includes(m)) continue;
      if (isLeadTier(m) && CREDIT_FED.includes(m)) v[0] += Math.max(0, t.min - (own[m] || 0));
      const i = TIER_ORDER.indexOf(t.tier);
      if (i >= 0) v[i + 1] += Math.max(0, t.typical - (fr[m] || 0));
    }
    return v;
  };
  const lowerThan = (a, b) => {
    for (let i = 0; i < a.length; i += 1) if (Math.abs(a[i] - b[i]) > 1e-9) return a[i] < b[i];
    return false;
  };
  const ownShort = (m, own) => isLeadTier(m) && CREDIT_FED.includes(m) && (own[m] || 0) < targets[m].min;
  growth = true;
  for (let guard = 0; guard < 100; guard += 1) {
    const weekly = weeklyLoad(plan, peak);
    const fr = Object.fromEntries(Object.keys(targets).map((m) => [m, (weekly[m] || {}).fractional || 0]));
    const own = directWeek();
    const now = shortfall(fr, own);
    const moves = [];
    for (let si = 0; si < n; si += 1) {
      const s = plan.sessions[si];
      const needy = lists[si].filter((m) => targets[m] && !plan.untrainable.includes(m) && (ownShort(m, own) || fr[m] < targets[m].typical));
      for (const m of needy) {
        for (const a of actionsFor(m, si)) {
          const pattern = a.type === 'inc' ? a.pattern : a.options[0].pattern;
          for (const donor of s.exercises) {
            const d = donor.muscle;
            if (d === m || !targets[d] || donor.peak - a.sets < SESSION_LIMITS.setsPerExerciseMin) continue;
            if (!ownShort(m, own) && TIER_RANK[targets[d].tier] <= TIER_RANK[targets[m].tier]) continue;
            if (fr[d] - a.sets < targets[d].min) continue;
            if (isLeadTier(d) && (own[d] || 0) - a.sets < (CREDIT_FED.includes(d) ? targets[d].min : ownFloor(d))) continue;
            if (PATTERNS[donor.pattern].credits.some((c) => targets[c] && fr[c] - CREDIT_FRACTION * a.sets < targets[c].min)) continue;
            // The week's shortfall after the move, counted before making it.
            const fr2 = { ...fr };
            const own2 = { ...own, [m]: (own[m] || 0) + a.sets, [d]: (own[d] || 0) - a.sets };
            const add = (x, v) => { if (x in fr2) fr2[x] += v; };
            add(m, a.sets);
            for (const c of PATTERNS[pattern].credits) add(c, CREDIT_FRACTION * a.sets);
            add(d, -a.sets);
            for (const c of PATTERNS[donor.pattern].credits) add(c, -CREDIT_FRACTION * a.sets);
            const after = shortfall(fr2, own2);
            if (lowerThan(after, now)) moves.push({ a, donor, si, after, at: s.exercises.indexOf(donor) });
          }
        }
      }
    }
    moves.sort((x, y) => (lowerThan(x.after, y.after) ? -1 : lowerThan(y.after, x.after) ? 1 : 0)
      || (x.si - y.si) || (x.at - y.at) || (posOf(x.a) - posOf(y.a)) || cmp(x.a.m, y.a.m) || cmp(x.a.type, y.a.type));
    const sense0 = senseFaults();
    const tryMove = ({ a, donor, si }) => {
      const s = plan.sessions[si];
      const attempts = a.type === 'inc'
        ? [[() => { setPeak(donor, donor.peak - 1); setPeak(a.ex, a.ex.peak + 1); }, () => { setPeak(a.ex, a.ex.peak - 1); setPeak(donor, donor.peak + 1); }]]
        : a.options[0].choices.map((choice) => {
          const ex = makeExercise(si, a.m, a.options[0].pattern, choice, a.sets);
          return [() => { setPeak(donor, donor.peak - a.sets); s.exercises.push(ex); }, () => { s.exercises.pop(); setPeak(donor, donor.peak + a.sets); }];
        });
      for (const [move, undo] of attempts) {
        if (!tryStep(move, undo)) continue;
        if (newIn(senseFaults(), sense0)) {
          undo();
          baseline = new Set(currentFaults().map(faultKey));
          continue;
        }
        return true;
      }
      return false;
    };
    if (!moves.some(tryMove)) break;
  }
  growth = false;

  // S7: order inside each session: heavy compounds, moderate compounds,
  // machines, isolation; then P before S before M; focus first in a tier.
  // R24 (both audits): abs come last whatever their tier, as in every 09
  // B11 plan, since the trunk braces every other lift; and the isolation
  // work of the half of the body the session's compounds train comes before
  // the other half's (leg extensions and curls before a leg day's lateral
  // raises), and the muscles the session's compounds started come first
  // (a fly straight after the press).
  const absLast = (ex) => (ex.muscle === 'abs' ? 1 : 0);
  const orderSession = (s) => {
    const rankOf = (ex) => KIND_RANK[orderKindFor(ex.kind, ex.pattern)];
    const lead = [...s.exercises].sort((a, b) => rankOf(a) - rankOf(b)).find((ex) => ex.muscle !== 'abs');
    const home = lead ? regionOf(lead.muscle) : null;
    const away = (ex) => (ex.kind === 'isolation' && home && regionOf(ex.muscle) !== home ? 1 : 0);
    // A fly straight after the press it finishes, before the next muscle.
    const pressed = new Set(s.exercises.filter((ex) => ex.kind !== 'isolation').map((ex) => ex.muscle));
    const unfinished = (ex) => (ex.kind === 'isolation' && !pressed.has(ex.muscle) ? 1 : 0);
    s.exercises = s.exercises
      .map((ex, i) => ({ ex, i }))
      .sort((a, b) => (absLast(a.ex) - absLast(b.ex))
        || (rankOf(a.ex) - rankOf(b.ex))
        || (away(a.ex) - away(b.ex))
        || (unfinished(a.ex) - unfinished(b.ex))
        || (TIER_RANK[tierOf(category, a.ex.muscle)] - TIER_RANK[tierOf(category, b.ex.muscle)])
        || (Number(plan.focus.includes(b.ex.muscle)) - Number(plan.focus.includes(a.ex.muscle)))
        || (MUSCLES.indexOf(a.ex.muscle) - MUSCLES.indexOf(b.ex.muscle))
        || (a.i - b.i))
      .map((x) => x.ex);
  };
  plan.sessions.forEach(orderSession);

  // R28 (coach audit: six-day weeks asked for longer sessions while their
  // shortest sessions ran under 30 minutes): before asking for a longer
  // session, move whole abs and calf exercises from a session still over the
  // chosen length at floor rest to the shortest session that takes them
  // inside every rulebook and sense check; and (R44) single sets between
  // two sessions that both list the muscle, onto an exercise of it already
  // there, with no muscle losing normal volume. The week keeps every set
  // (Q1 = C); only where the sets fall changes.
  if (length != null) {
    const before = plan.sessions.map((s) => s.exercises.map((ex) => [ex, ex.peak]));
    const listsBefore = lists.map((l) => [...l]);
    const overflowBefore = overflow.length;
    let movedAny = false;
    growth = true;
    for (let guard = 0; guard < 40; guard += 1) {
      const over = plan.sessions.map((s, i) => ({ i, m: floorMinutes(s) }))
        .filter((x) => Math.round(x.m) > limit).sort((a, b) => (b.m - a.m) || (a.i - b.i));
      let moved = false;
      for (const { i } of over) {
        const src = plan.sessions[i];
        for (const ex of src.exercises.filter((x) => FLOATERS.includes(x.muscle) && x.kind === 'isolation')) {
          const dests = plan.sessions.map((s, j) => ({ j, m: floorMinutes(s) }))
            .filter((x) => x.j !== i && plan.sessions[x.j].exercises.length < maxExercises)
            .sort((a, b) => (a.m - b.m) || (a.j - b.j));
          const senseBefore = senseFaults();
          for (const { j } of dests) {
            const dst = plan.sessions[j];
            const at = src.exercises.indexOf(ex);
            const listed = lists[j].includes(ex.muscle);
            const undo = () => {
              dst.exercises.splice(dst.exercises.indexOf(ex), 1);
              src.exercises.splice(at, 0, ex);
              if (!listed) { lists[j].pop(); overflow.pop(); }
            };
            const kept = tryStep(() => {
              src.exercises.splice(at, 1);
              dst.exercises.push(ex);
              if (!listed) { lists[j].push(ex.muscle); overflow.push({ muscle: ex.muscle, session: dst.key, reason: 'length' }); }
            }, undo);
            if (!kept) continue;
            orderSession(dst);
            if (Math.round(floorMinutes(dst)) > limit || newIn(senseFaults(), senseBefore)) {
              undo();
              orderSession(src);
              baseline = new Set(currentFaults().map(faultKey));
              continue;
            }
            moved = true;
            break;
          }
          if (moved) break;
        }
        if (moved) break;
      }
      if (!moved) {
        const weekly = weeklyLoad(plan, peak);
        const fr = (m) => (weekly[m] || {}).fractional || 0;
        for (const { i } of over) {
          const src = plan.sessions[i];
          const senseBefore = senseFaults();
          const donors = src.exercises.filter((x) => x.peak > SESSION_LIMITS.setsPerExerciseMin)
            .sort((a, b) => (b.peak - a.peak) || (src.exercises.indexOf(a) - src.exercises.indexOf(b)));
          for (const ex of donors) {
            const dests = visitsOf(ex.muscle).filter((j) => j !== i)
              .map((j) => ({ j, m: floorMinutes(plan.sessions[j]) }))
              .sort((a, b) => (a.m - b.m) || (a.j - b.j));
            for (const { j } of dests) {
              for (const a of actionsFor(ex.muscle, j).filter((x) => x.type === 'inc')) {
                // The credit the set carries moves with it; no muscle may
                // fall below its normal volume for the move.
                const delta = {};
                for (const c of PATTERNS[ex.pattern].credits) delta[c] = (delta[c] || 0) - CREDIT_FRACTION;
                for (const c of PATTERNS[a.pattern].credits) delta[c] = (delta[c] || 0) + CREDIT_FRACTION;
                if (Object.entries(delta).some(([c, dv]) => targets[c] && dv < 0 && fr(c) + dv < targets[c].typical)) continue;
                const undo = () => { setPeak(a.ex, a.ex.peak - 1); setPeak(ex, ex.peak + 1); };
                if (!tryStep(() => { setPeak(ex, ex.peak - 1); setPeak(a.ex, a.ex.peak + 1); }, undo)) continue;
                if (Math.round(floorMinutes(plan.sessions[j])) > limit || newIn(senseFaults(), senseBefore)) {
                  undo();
                  baseline = new Set(currentFaults().map(faultKey));
                  continue;
                }
                moved = true;
                break;
              }
              if (moved) break;
            }
            if (moved) break;
          }
          if (moved) break;
        }
      }
      if (!moved) break;
      movedAny = true;
    }
    growth = false;
    // A move is kept only when the week then fits: if the person must
    // choose a longer session anyway, nothing moves (coach audit: calves
    // carried to a chest day while another session still asked).
    if (plan.sessions.some((s) => Math.round(floorMinutes(s)) > limit)) {
      plan.sessions.forEach((s, i) => {
        s.exercises = before[i].map(([ex]) => ex);
        before[i].forEach(([ex, p]) => { if (ex.peak !== p) setPeak(ex, p); });
      });
      listsBefore.forEach((l, i) => { lists[i] = l; });
      overflow.length = overflowBefore;
      baseline = new Set(currentFaults().map(faultKey));
    } else if (movedAny) {
      // R36: the room the moves freed goes back to normal volume, a set kept
      // only while its session stays inside the chosen length.
      growth = true;
      fillTypical({ limitMinutes: limit, allowRepair: false });
      growth = false;
      balancePushPull();
      plan.sessions.forEach(orderSession);
    }
  }

  // R39 (code review BLOCKER: focus plans took sets from other muscles,
  // three passes having run after the focus fill): focus goes last, on the
  // finished plain week: the focus picks' sets (R30: a pick whose sessions
  // are full may take one more session that neighbours none of them and
  // trains the same half of the body), then pulling to match any added
  // pressing. Pressing that pulling cannot match is taken back; if the
  // focused week then fails any check, every focus change is taken back.
  // The plan says how far each focus got and why, never silently.
  // R46 (matrix: in a full week three focus picks in four added nothing):
  // where the week has no room, a focus takes it from other muscles' sets
  // above their standard (founder F2; the minimum, Q1 = C; 09 B8 ranks focus
  // above growth beyond it), the lowest tier first, never from a tier above
  // its own or another focus pick, never below a muscle's minimum or its own
  // floor; and the plan names the muscles that gave.
  plan.focus = focus;
  baseline = new Set(currentFaults().map(faultKey));
  const focusList = muscleOrder(category, focus).filter((m) => focus.includes(m) && !plan.untrainable.includes(m));
  const focusWhy = {};
  if (focusList.length) {
    const kept = plan.sessions.map((s) => s.exercises.map((ex) => [ex, ex.peak]));
    const keptLists = lists.map((l) => [...l]);
    const keptOverflow = overflow.length;
    const restore = () => {
      plan.sessions.forEach((s, i) => {
        s.exercises = kept[i].map(([ex]) => ex);
        kept[i].forEach(([ex, p]) => { if (ex.peak !== p) setPeak(ex, p); });
      });
      keptLists.forEach((l, i) => { lists[i] = [...l]; });
      overflow.length = keptOverflow;
      baseline = new Set(currentFaults().map(faultKey));
    };
    const checkFaults = () => new Set(checkPlan(plan).failures.filter((f) => f.code !== 'C18').map(faultKey));
    const plainSense = new Set([...senseFaults()].filter((k) => !k.startsWith('S12|')));
    const plainChecks = checkFaults();
    // The balances a focus can tip: pulling at least matches pressing (S3)
    // and hamstrings at least half of quads (S4). The other side is raised
    // first (adding only); where it cannot be, the focus is built again from
    // the plain week with that much less of the pick, so no set given to
    // make room is ever left unused. A muscle on the other side of a
    // balance gives room only while the balance still holds.
    const PUSH = ['chest', 'front_delts'];
    const PULL = ['lats', 'upper_back'];
    const hamstringsTrained = !!targets.hamstrings && !plan.untrainable.includes('hamstrings');
    const legGap = () => (hamstringsTrained ? ownOf(['quads']) - 2 * ownOf(['hamstrings']) : 0);
    // Pulling gives to pressing, or hamstrings to quads, only while the
    // balance still holds after both sides move (up to two sets each).
    const focusProtect = (d, m) => focus.includes(d) || TIER_RANK[tierOf(category, d)] < TIER_RANK[tierOf(category, m)]
      || (PULL.includes(d) && ownOf(PULL) - 2 < ownOf(PUSH) + (PUSH.includes(m) ? 2 : 0))
      || (d === 'hamstrings' && hamstringsTrained && 2 * (ownOf(['hamstrings']) - 2) < ownOf(['quads']) + (m === 'quads' ? 2 : 0));
    // The other side of a balance: room first, then (R46) room made as a
    // focus makes it, since the balance is part of what the focus costs.
    const raise = (muscles, short) => {
      const trainable = muscles.filter((m) => targets[m] && !plan.untrainable.includes(m));
      for (let guard = 0; guard < 40 && short(); guard += 1) {
        const actions = trainable.flatMap((m) => visitsOf(m).flatMap((si) => actionsFor(m, si)))
          .sort((a, b) => ((a.type === 'inc' ? 0 : 1) - (b.type === 'inc' ? 0 : 1)) || (setsOf(a.si) - setsOf(b.si)) || (a.si - b.si) || (rank(a.m) - rank(b.m)));
        if (actions.some((a) => apply(a))) continue;
        const w = weeklyLoad(plan, peak);
        const goal = Object.fromEntries(trainable.map((m) => [m, ((w[m] || {}).fractional || 0) + 1]));
        const had = ownOf(trainable);
        repair((m) => (m in goal ? goal[m] : targets[m] ? targets[m].typical : 0), trainable, focusProtect, true, true, true);
        if (ownOf(trainable) <= had) break;
      }
    };
    const cap = {};
    let balanced = false;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      growth = true;
      fill((m) => Math.min(targets[m].target, cap[m] ?? Infinity), focusList, {
        allowOverflow: true,
        overflowSiblings: (m) => MUSCLES.filter((x) => x !== m && regionOf(x) === regionOf(m) && regionOf(m) !== 'trunk'),
        byTier: true,
        noLoss: true,
        guardSense: true,
        protect: focusProtect,
      });
      raise(PULL, () => ownOf(PULL) < ownOf(PUSH));
      raise(['hamstrings'], () => legGap() > 0);
      growth = false;
      const pushGap = ownOf(PUSH) - ownOf(PULL);
      const quadGap = legGap();
      if (pushGap <= 0 && quadGap <= 0) { balanced = true; break; }
      const reached = weeklyLoad(plan, peak);
      const capped = [];
      for (const [muscles, gap, why] of [[PUSH, pushGap, 'pull_balance'], [['quads'], quadGap, 'hamstring_balance']]) {
        if (gap <= 0) continue;
        for (const m of focusList.filter((x) => muscles.includes(x))) {
          // Strictly lower each time: a two-set exercise can overshoot a cap.
          cap[m] = Math.max(0, Math.min(cap[m] ?? Infinity, (reached[m] || {}).fractional || 0) - gap);
          focusWhy[m] = why;
          capped.push(m);
        }
      }
      restore();
      if (!capped.length) break;
    }
    plan.sessions.forEach(orderSession);
    const senseNow = new Set([...senseFaults()].filter((k) => !k.startsWith('S12|')));
    if (!balanced || newIn(checkFaults(), plainChecks) || newIn(senseNow, plainSense)) {
      restore();
      for (const m of focusList) focusWhy[m] = focusWhy[m] || 'checks';
    }
    baseline = new Set(currentFaults().map(faultKey));
    const before = {};
    for (const [ex, p] of kept.flat()) before[ex.muscle] = (before[ex.muscle] || 0) + p;
    const after = directWeek();
    plan.focusTook = Object.keys(before).filter((m) => !focus.includes(m) && (after[m] || 0) < before[m])
      .sort((a, b) => rank(a) - rank(b))
      .map((m) => ({ muscle: m, from: before[m], to: after[m] || 0, minimum: targets[m] ? targets[m].min : 0 }));
  }
  if (!plan.focusTook) plan.focusTook = [];
  // An overflow entry where nothing was placed is dropped (R39).
  plan.overflow = overflow.filter((o) => plan.sessions.some((s) => s.key === o.session && s.exercises.some((ex) => ex.muscle === o.muscle)));
  const afterFocus = weeklyLoad(plan, peak);
  plan.focusTargets = Object.fromEntries(focusList.map((m) => [m, targets[m].target]));
  // R38: why a focus fell short: every session that may hold it already
  // holds the most one session may (session_cap), or its sessions are full;
  // R39: or pulling could not match more pressing (pull_balance), or
  // hamstrings half of more quads (hamstring_balance), or the focused week
  // failed a check and the focus was taken back (checks).
  plan.focusUnmet = focusList
    .filter((m) => ((afterFocus[m] || {}).fractional || 0) < targets[m].target)
    .map((m) => ({
      muscle: m,
      sets: (afterFocus[m] || {}).fractional || 0,
      target: targets[m].target,
      reason: focusWhy[m] || (visitsOf(m).every((si) => directIn(si, m) >= PER_SESSION.directCap) ? 'session_cap' : 'sessions_full'),
      sessions: visitsOf(m).length,
    }));

  // R42 (coach and review): a next-day light dose only where the next
  // session trains that muscle. Where it ended up not doing so, the dose is
  // trained as any other, when every check still passes.
  {
    const checkFaults = () => new Set(checkPlan(plan).failures.filter((f) => f.code !== 'C18').map(faultKey));
    for (let si = 0; si < n; si += 1) {
      const next = sessionLoad(plan.sessions[(si + 1) % n], peak);
      for (const ex of plan.sessions[si].exercises) {
        if (!ex.nextDayException || isTrained(next, ex.muscle)) continue;
        const checks0 = checkFaults();
        const sense0 = senseFaults();
        const flag = (v) => { ex.nextDayException = v; ex.weeks = weeksFor(ex.peak, { nextDayException: v }); };
        flag(false);
        if (newIn(checkFaults(), checks0) || newIn(senseFaults(), sense0)) flag(true);
      }
    }
  }

  // S10: real length (Q1 = C). Shorten rest towards its floor, least
  // costly first, only as far as each session needs; still over by more
  // than the tolerance, the person chooses before saving. R43: by rest
  // class, so a leg press or hack squat keeps its rest longer than a
  // dumbbell Romanian deadlift.
  let restTrimmed = false;
  if (length != null) {
    for (const s of plan.sessions) {
      for (const cls of REST_TRIM_ORDER) {
        while (sessionMinutes(s, peak, equipment) > length) {
          const exs = s.exercises.filter((ex) => restClassFor(ex.kind, ex.pattern) === cls && ex.restSec > restSecondsFor(ex.kind, ex.pattern).floor);
          if (!exs.length) break;
          for (const ex of exs) ex.restSec = Math.max(restSecondsFor(ex.kind, ex.pattern).floor, ex.restSec - 15);
          restTrimmed = true;
        }
      }
    }
  }

  // R31 (user audit): each session's name says what it holds.
  plan.sessions.forEach((s, i) => {
    const held = s.exercises.filter((ex) => ex.peak >= SESSION_LIMITS.setsPerExerciseMin).map((ex) => ex.muscle);
    s.name = sessionName(order[i].name, held);
  });

  const minutes = plan.sessions.map((s) => sessionMinutes(s, peak, equipment));
  plan.reportedMinutes = minutes.map((m) => Math.round(m * 10) / 10);
  plan.needsLengthChoice = length != null && minutes.some((m) => Math.round(m) > length + TIME_MODEL.toleranceMinutes);

  // S9: the whole block, every week, every check. A failing plan is never
  // returned as a plan.
  const check = checkPlan(plan);
  if (!check.ok) {
    return { ok: false, refusal: { reason: 'checks_failed', failures: check.failures, detail: 'the built plan failed the rulebook checks' } };
  }
  // And the sense layer (D222): a plan a coach or the person would find
  // senseless is never returned either.
  const sense = senseCheck(plan);
  if (!sense.ok) {
    return { ok: false, refusal: { reason: 'sense_failed', failures: sense.failures, detail: sense.failures.map((f) => f.detail).join('; ') } };
  }

  const weekly = check.weekly;
  const belowTypical = Object.entries(targets)
    .filter(([m, t]) => !plan.untrainable.includes(m) && (weekly[m]?.fractional ?? 0) < t.target)
    .map(([m, t]) => ({ muscle: m, sets: weekly[m]?.fractional ?? 0, target: t.target }));

  return {
    ok: true,
    plan,
    report: {
      minutes: plan.reportedMinutes,
      longestMinutes: Math.max(...minutes),
      restTrimmed,
      needsLengthChoice: plan.needsLengthChoice,
      suggestedLength: plan.needsLengthChoice ? TIME_MODEL.lengths.find((l) => l + TIME_MODEL.toleranceMinutes >= Math.round(Math.max(...minutes))) ?? Math.ceil(Math.max(...minutes)) : null,
      // More days only where there are more days to give (user and coach
      // audits: six-day weeks were offered "or more days").
      moreDaysPossible: plan.needsLengthChoice ? days < Math.max(...DAY_COUNTS) : false,
      focusUnmet: plan.focusUnmet,
      focusTook: plan.focusTook,
      kitShort: plan.kitLimited
        .filter((m) => (weekly[m]?.fractional ?? 0) < targets[m].min)
        .map((m) => ({ muscle: m, sets: weekly[m]?.fractional ?? 0, minimum: targets[m].min })),
      belowTypical,
      untrainable: plan.untrainable,
      overflow: plan.overflow,
      focusIgnored,
      focusDropped,
      warnings: check.warnings,
      weekly: Object.fromEntries(Object.entries(targets).map(([m, t]) => [m, { sets: weekly[m]?.fractional ?? 0, ...t }])),
    },
  };
}

// R40 (code review): the week is built from session 1 and then turned to
// start where the person starts (a cyclic shift: every session keeps its
// neighbours), so the start can never change whether a week builds or what
// it holds. A start that is not a whole number reads as session 1.
function startAt(r, startIndex) {
  const n = r.plan.sessions.length;
  const start = Number.isInteger(startIndex) ? ((startIndex % n) + n) % n : 0;
  if (!start) return r;
  const turn = (list) => list.map((_, i) => list[(i + start) % n]);
  r.plan.sessions = turn(r.plan.sessions);
  r.plan.reportedMinutes = turn(r.plan.reportedMinutes);
  r.report.minutes = r.plan.reportedMinutes;
  return r;
}

// The ways the engine tries, in turn, when a week is tight. Exercise
// choice: by the credits a preferred pattern brings ('credit'), or strictly
// in the preference order ('preference'). Fill order: the most shortfall
// closed per set first; the priority muscles first; the muscle furthest
// from its goal first; each exercise filled before another is opened. The
// first that reaches every minimum is kept, so the result stays
// deterministic (C19).
const RETRYABLE = new Set(['minimum_unreachable', 'sense_failed']);
const STRATEGIES = Object.freeze(['credit', 'preference'].flatMap((patterns) => ['value', 'priority', 'need', 'compact']
  .map((order) => Object.freeze({ patterns, order }))));

/**
 * Build a structure plan (09 s10 S0 to S10). A week no strategy can fill to
 * every minimum is refused, with the fewest days that would hold it in the
 * same kit, when there are any (09 B12: the user chooses).
 * @param {object} args  see buildWith
 * @returns {{ ok: true, plan: object, report: object } | { ok: false, refusal: object }}
 */
export function buildStructurePlan(args) {
  let last = null;
  for (const strategy of STRATEGIES) {
    const r = buildWith(args, strategy);
    if (r.ok) return startAt(r, args.startIndex);
    if (!RETRYABLE.has(r.refusal.reason)) return r;
    if (!last || last.refusal.reason !== 'minimum_unreachable') last = r;
  }
  // The nearest day counts that would hold the week in the same kit, more
  // days first on a tie (most refusals are short weeks); the person chooses.
  // R45: each day count is tried once.
  const others = DAY_COUNTS.filter((d) => d !== args.days)
    .sort((a, b) => (Math.abs(a - args.days) - Math.abs(b - args.days)) || (b - a));
  const tried = new Map();
  const builds = (d) => {
    if (!tried.has(d)) tried.set(d, STRATEGIES.some((strategy) => buildWith({ ...args, days: d }, strategy).ok));
    return tried.get(d);
  };
  const more = others.filter((d) => d > args.days).find(builds);
  if (more != null) last.refusal.minimumDays = more;
  const nearest = more != null && Math.abs(more - args.days) === 1 ? more : others.find(builds);
  if (nearest != null) last.refusal.suggestedDays = nearest;
  return last;
}
