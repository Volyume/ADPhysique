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
  restSecondsFor, restClassFor, orderKindFor, PER_SESSION, LIGHT_DOSE, REP_RANGE_UNLOADED_COMPOUND,
  regionOf, LEGS_ONCE,
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
  // strict: the order is the rule, not a preference the credit valuation
  // may overrule (round 4 audits: a flat press won the second slot on the
  // credits it brings, so men's physique chest was two presses and no fly).
  mens_physique: { chest: { main: ['press_incline', 'fly', 'press_flat'], fallback: [], strict: true } },
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
// Body halves, for session order (R31) and focus overflow (R30): regionOf
// (rulebook.js).
// Round 6 coach audit (C6-2): the kits whose own staples come before any
// stand-in or supplement even when the staple is already in the week (a
// full gym's lying leg curl machine before a dumbbell held between the feet).
const GYM_KITS = new Set(['full_gym', 'machines_cables']);
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
  // Round 7 coach audit (C7-9: "Glutes, Hamstrings & Abs" held an
  // abduction machine while another session named "Side Glutes"): "Glutes"
  // names the glute max; the side glutes are named for themselves.
  glute_max: /glute|legs|lower/i, glute_med: /side glutes|legs|lower/i, adductors: /adductors|inner thighs|legs|lower/i,
  // R38: abs and calves are named unless the name says so ("Legs & Abs").
  calves: /calves|legs|lower/i, abs: /abs|core/i,
});
const LABEL = Object.freeze({
  chest: 'Chest', front_delts: 'Front Delts', lats: 'Lats', upper_back: 'Back', side_delts: 'Side Delts',
  rear_delts: 'Rear Delts', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', traps: 'Traps',
  quads: 'Quads', hamstrings: 'Hamstrings', glute_max: 'Glutes', glute_med: 'Side Glutes', adductors: 'Inner Thighs',
  calves: 'Calves', abs: 'Abs', neck: 'Neck', tibialis: 'Tibialis',
});
/** A session's name with the muscles it holds that the name does not cover. */
// The muscles a word in a template name promises (round 5 audits: a name
// kept "Abs" after its abs had moved; a name says what the session holds).
const PART_MUSCLES = Object.freeze({
  Abs: ['abs'], Calves: ['calves'], Chest: ['chest'], Biceps: ['biceps'], Triceps: ['triceps'], Quads: ['quads'],
  Hamstrings: ['hamstrings'], Glutes: ['glute_max'], 'Side Glutes': ['glute_med'], 'Inner Thighs': ['adductors'],
  Lats: ['lats'], 'Side Delts': ['side_delts'], 'Rear Delts': ['rear_delts'], Delts: ['side_delts', 'rear_delts', 'front_delts'],
  Arms: ['biceps', 'triceps'],
});
const joinParts = (parts) => (parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`);
// Round 7 audits (U7-8, C7-9: "Back, Biceps & Chest (A)" beside "Back B &
// Biceps", and "Upper A" beside "(A)" pairs in one week): a session's name
// is built without the template's letter; letters are given once the week
// is named (lettersFor).
function sessionName(template, muscles) {
  const held = new Set(muscles);
  const plain = template.replace(/ [A-C](?=, | & |$)/, '');
  const words = plain.split(/, | & /);
  const kept = words.filter((part) => {
    const promised = PART_MUSCLES[part];
    return !promised || promised.some((m) => held.has(m));
  });
  const base = kept.length === words.length || !kept.length ? plain : joinParts(kept);
  let extra = [...held].filter((m) => LABEL[m] && COVERED_BY[m] && !COVERED_BY[m].test(base)).map((m) => LABEL[m]);
  // Round 6 coach audit (C6-12): "Lats" and "Back" together name the back
  // twice; "Back" says both.
  if (extra.includes('Back')) extra = extra.filter((w) => w !== 'Lats');
  if (!extra.length) return base;
  let parts = [...base.split(/, | & /), ...extra];
  if (extra.includes('Back')) parts = [...new Set(parts.map((w) => (w === 'Lats' ? 'Back' : w)))];
  // Round 6 audits (C6-12, U6-11): four or more parts that are all one half
  // of the body name the half ("Lower Body", with "& Abs" where abs are
  // named); five or more across both halves read "Full Body".
  // Round 7 coach audit (C7-5: an upper session with a 2-set calf raise was
  // named "Full Body"): calves on an upper day are a finisher, named as abs
  // are ("Upper Body & Calves"), and an upper day collapses only when its
  // upper parts alone number four.
  if (parts.length >= 4) {
    const lower = [...held].filter((m) => regionOf(m) === 'lower');
    const upper = [...held].filter((m) => regionOf(m) === 'upper');
    const tail = (words2) => words2.filter((w) => parts.includes(w));
    if (!upper.length && lower.length) return joinParts(['Lower Body', ...tail(['Abs'])]);
    const calvesOnly = lower.every((m) => m === 'calves');
    if (upper.length && calvesOnly && parts.filter((w) => w !== 'Abs' && w !== 'Calves').length >= 4) {
      return joinParts(['Upper Body', ...tail(['Calves', 'Abs'])]);
    }
    if (upper.length && !calvesOnly && parts.length >= 5) return joinParts(['Full Body', ...tail(['Abs'])]);
  }
  return joinParts(parts);
}
// The week's names, settled: names that hold the same parts read the same
// ("Glutes & Hamstrings" and "Hamstrings & Glutes"), and sessions whose
// names start with the same part take letters in rotation order, after
// that part ("Upper A", "Upper B & Abs", "Lower Body A"), one style in every
// week (round 7 audits U7-8, C7-9: letters only where the names show the
// pair).
function lettersFor(names) {
  const key = (nm) => nm.split(/, | & /).sort().join('|');
  const first = {};
  const out = names.map((nm) => { const k = key(nm); first[k] ||= nm; return first[k]; });
  const head = (nm) => nm.split(/, | & /)[0];
  const count = {};
  out.forEach((nm) => { count[head(nm)] = (count[head(nm)] || 0) + 1; });
  const used = {};
  return out.map((nm) => {
    const h = head(nm);
    if (count[h] < 2) return nm;
    const letter = 'ABCDEF'[used[h] || 0];
    used[h] = (used[h] || 0) + 1;
    return `${h} ${letter}${nm.slice(h.length)}`;
  });
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

const strictOrder = (category, muscle) => !!(CATEGORY_ORDER[category] && CATEGORY_ORDER[category][muscle] && CATEGORY_ORDER[category][muscle].strict);

function patternsFor(category, muscle, tier, hints) {
  const base = (tier === 'M' && LOW_FATIGUE_ORDER[muscle])
    || (CATEGORY_ORDER[category] && CATEGORY_ORDER[category][muscle])
    || PATTERN_ORDER[muscle] || { main: [], fallback: [] };
  // A template's hint says what leads, not all a session may hold (round 5
  // coach audit, wellness 5 days: the hinge day could not take a leg curl
  // once its one hinge was full, so priority hamstrings sat below normal).
  if (!(hints && hints[muscle])) return { main: base.main, fallback: base.fallback, strict: !!base.strict };
  const hinted = (p) => hints[muscle].includes(p);
  // Round 6 coach audit (C6-15: wellness 5 days' curl day took a 2-set
  // dumbbell Romanian deadlift, a second hinge day in the week): a hint never
  // opens a spine-loading pattern it does not name.
  const open = (p) => !hinted(p) && !(PATTERNS[p] && (PATTERNS[p].joints || []).includes('spinal_axial'));
  return {
    main: base.main.filter(hinted),
    fallback: [...base.fallback.filter(hinted), ...base.main.filter(open), ...base.fallback.filter(open)],
    strict: !!base.strict,
  };
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

  // 09 s7: a fifth set per exercise for a muscle with one pattern in the
  // kit, never in a full gym. R53 (round 4 coach audit: 5 + 2 splits of two
  // lateral raises or two rows) is applied where the sets are placed (inc,
  // below) and tidied after (5 + 2 becomes 4 + 3).
  const solePattern = (m) => kit.solePatternMuscles.includes(m);
  const maxSetsFor = (m) => {
    if (beginner) return SESSION_LIMITS.beginnerSetsPerExercise;
    return solePattern(m) ? SESSION_LIMITS.setsPerExerciseSolePattern : SESSION_LIMITS.setsPerExerciseMax;
  };
  const exercisesPerMuscle = (m) => (m === 'front_delts' ? SESSION_LIMITS.exercisesPerMuscleFrontDelts
    : LARGE_MUSCLES.includes(m) ? SESSION_LIMITS.exercisesPerMuscleLarge : SESSION_LIMITS.exercisesPerMuscleOther);
  const maxExercises = beginner ? SESSION_LIMITS.beginnerExercises : SESSION_LIMITS.exercisesHard;

  const peak = PROGRESSION.peakWeek;
  // True above the minimum (R25's beginner limits); declared before any pass
  // reads it (round 4 coach audit: the first pass read it before its
  // declaration, a ReferenceError under spec JavaScript).
  let growth = false;
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
      repRange: [...(choice.repRange || (choice.unloaded ? REP_RANGE_UNLOADED_COMPOUND : REP_RANGES[choice.kind]))],
      peak: sets,
      nextDayException: light,
      solePattern: solePattern(m),
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
      // R53: the fifth set only once the muscle's other exercises here hold
      // the normal four.
      const fifth = ex.peak >= SESSION_LIMITS.setsPerExerciseMax && own.some((o) => o !== ex && o.peak < SESSION_LIMITS.setsPerExerciseMax);
      if (ex.peak < setCap && !fifth) out.push({ type: 'inc', m, si, ex, pattern: ex.pattern, sets: 1, fifthSet: ex.peak >= SESSION_LIMITS.setsPerExerciseMax });
    }
    if (s.exercises.length >= exerciseCap || own.length >= exercisesPerMuscle(m)) return out;
    // A strict order opens its next pattern only once the muscle's
    // exercises here are full (R20: a flat press only when more chest sets
    // are needed than the incline press and the fly carry).
    if (strictOrder(category, m) && out.length) return out;
    // Rotation follows how many of the week's sessions already hold the
    // muscle, so its first exercise of the week takes its first preferred
    // pattern (R34: a bodybuilder's only biceps exercise was a hammer curl,
    // the rotation having started at the template's second visit).
    const v = plan.sessions.filter((x, j) => j !== si && x.exercises.some((ex) => ex.muscle === m)).length;
    const inKit = (p) => (kit.byPattern[p] || []).length > 0;
    const { main, fallback, strict } = patternsFor(category, m, tier, hintsOf[si]);
    const mainAvail = main.filter(inKit);
    // A strict order is never rotated: every visit leads with its first
    // pattern, under a different name where the kit has one (R20).
    const rotated = strict ? mainAvail : mainAvail.map((_, i) => mainAvail[(i + Math.max(0, v)) % mainAvail.length]);
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
      // Round 4 user audit: a beginner learns on the machine or dumbbell
      // version before the barbell one (three barbell lifts opened a
      // beginner's 45-minute leg day).
      // Round 5 coach audit (C5-8): a top-up in a session not named for the
      // muscle takes the least fatiguing name too (a barbell incline opened
      // an arms day).
      // Round 6 coach audit (C6-9: a 2-set barbell incline after the barbell
      // bench): a muscle's second compound in a session that already holds
      // its heavy compound takes the least fatiguing name.
      const heavyOwn = own.some((ex) => orderKindFor(ex.kind, ex.pattern) === 'heavy_compound');
      const lowFatigue = tier === 'M' || beginner || heavyOwn || (LOW_FATIGUE_NAMES[category] || []).includes(m) || !order[si].muscles.includes(m);
      const group = (c) => (c.from === 'thin_kit' ? 1 : c.from === 'supplement' ? 2 : 0);
      // Rotated by the other sessions that already hold this pattern (round
      // 5 coach audit: rotating by the muscle's visits skipped a dumbbell
      // kit's dumbbell leg curl for a slider).
      const vp = plan.sessions.filter((x, j) => j !== si && x.exercises.some((ex) => ex.pattern === p)).length;
      const rotatedNames = [0, 1, 2].flatMap((g) => {
        const list = names.filter((c) => group(c) === g);
        return lowFatigue
          ? [...list].sort((a, b) => (KIND_FATIGUE[a.kind] - KIND_FATIGUE[b.kind]))
          : list.map((_, i) => list[(i + vp) % list.length]);
      });
      const fresh = (c) => (inWeek.has(c.exerciseId || c.name) ? 1 : 0);
      // Round 4 coach and round 5 user audits: a name not yet in the week
      // beats a repeat, then the source order (a dumbbell week repeated its
      // lateral raise on both back days while the seated lateral raise went
      // unused). An unused staple still comes before any stand-in (R41).
      // Round 6 coach audit (C6-2: a full gym's week used the dumbbell kit's
      // lying leg curl and the bodyweight Copenhagen while the machines sat
      // unused): in a gym kit the source order comes first (R41, C4-22:
      // supplements last), so a staple repeated in the week beats a fresh
      // supplement; freshness first only in the dumbbell, home, barbell and
      // bodyweight kits, which the round 5 audits found it for.
      const staples = GYM_KITS.has(equipment);
      const ordered = rotatedNames.map((c, i) => ({ c, i }))
        .sort((a, b) => (Number(!!b.c.logged) - Number(!!a.c.logged))
          || (staples ? (group(a.c) - group(b.c)) || (fresh(a.c) - fresh(b.c)) : (fresh(a.c) - fresh(b.c)) || (group(a.c) - group(b.c)))
          || (a.i - b.i))
        .map((x) => x.c);
      const choices = ordered.filter((c) => !near.has(c.exerciseId || c.name) && !sessionVariants.has(variantOf(p, c.name)));
      return choices.length ? { pattern: p, choices } : null;
    };
    // R24: a pattern already in the session comes back only after every
    // fresh main pattern of the muscle fails here, and then only as a
    // different variant (optionFor). A next-day light dose takes isolation
    // only.
    const allowedKind = (p) => !light || PATTERNS[p].kind === 'isolation';
    // The muscle's first exercise in the session: a compound for a lead
    // muscle (R27); otherwise, when the rest of the week trains the muscle
    // with one pattern only, its other pattern (09 s7: a different role on
    // each visit, so a week never trains hamstrings with hinges alone).
    // A beginner's compounds, the least fatiguing first (a leg press before
    // a barbell squat), in the places compounds hold in the order; never an
    // isolation before a compound (round 5 coach audit: a beginner's only
    // leg day held a leg extension, a curl and a calf raise).
    const easiest = (p) => Math.min(...(kit.byPattern[p] || []).map((c) => KIND_FATIGUE[c.kind] ?? 3), 3);
    let pool = rotated;
    if (beginner && !strict) {
      const compounds = rotated.filter((p) => PATTERNS[p].kind === 'compound').sort((a, b) => easiest(a) - easiest(b));
      pool = rotated.map((p) => (PATTERNS[p].kind === 'compound' ? compounds.shift() : p));
    }
    if (!own.length && !light) {
      const leads = LEAD_MUSCLES.includes(m) && (tier === 'P' || tier === 'S')
        ? pool.filter((p) => PATTERNS[p].kind === 'compound' && optionFor(p)) : [];
      const elsewhere = new Set(plan.sessions.flatMap((x, j) => (j === si ? [] : x.exercises.filter((ex) => ex.muscle === m).map((ex) => ex.pattern))));
      const unvisited = elsewhere.size === 1 ? pool.filter((p) => !elsewhere.has(p) && optionFor(p)) : [];
      if (leads.length) pool = leads;
      else if (unvisited.length) pool = unvisited;
    }
    // Round 4 coach audit: in a session that already curls, in a week that
    // already hinges, a second hamstring exercise is the other curl before a
    // token second hinge (R26: each hinge loads the lower back).
    const hingesElsewhere = m === 'hamstrings' && usedPatterns.has('leg_curl')
      && plan.sessions.some((x, j) => j !== si && x.exercises.some((ex) => ex.muscle === m && ex.pattern === 'hinge'));
    // Round 5 coach audit (C5-20): once a session holds two heavy compounds,
    // a muscle's second exercise there is an isolation where one is offered
    // (a 2-set hack squat after the squat and the Romanian deadlift).
    const heavyHere = s.exercises.filter((ex) => orderKindFor(ex.kind, ex.pattern) === 'heavy_compound').length;
    const isolationFirst = own.length >= 1 && heavyHere >= 2
      && pool.some((p) => PATTERNS[p].kind === 'isolation' && !usedPatterns.has(p) && optionFor(p));
    const later = (p) => usedPatterns.has(p) || (hingesElsewhere && p === 'hinge') || (isolationFirst && PATTERNS[p].kind === 'compound');
    const fresh = pool.filter((p) => !later(p) && allowedKind(p) && optionFor(p));
    // Round 4 coach audit: a pattern already here (as another variant), or
    // one put back as above, is tried once the fresh ones fail, never left
    // untried (a hinge failed C12 and the seated curl beside a lying one was
    // never offered).
    const trailing = [...pool.filter((p) => usedPatterns.has(p)), ...pool.filter((p) => !usedPatterns.has(p) && later(p))]
      .filter(allowedKind).map(optionFor).filter(Boolean);
    const fallbackOptions = fallback.filter((p) => inKit(p) && allowedKind(p) && (!usedPatterns.has(p) || !fresh.length))
      .map(optionFor).filter(Boolean);
    const sets = SESSION_LIMITS.setsPerExerciseMin;
    if (strategy.patterns === 'preference' || strict) {
      // Preference mode: one action whose patterns are tried strictly in the
      // preference order, valued on the first (always, for a strict order:
      // R20).
      const options = [...fresh.map(optionFor), ...trailing, ...fallbackOptions];
      if (options.length) out.push({ type: 'open', m, si, pattern: options[0].pattern, options, sets, patternIndex: 0 });
      return out;
    }
    // New-exercise actions: one per fresh main pattern, each valued on its
    // own credits, so a compound that also covers another muscle's shortfall
    // wins over an isolation when both are preferred choices (ties keep the
    // preference order). Fallback patterns compete only when no fresh main
    // pattern has an exercise to offer.
    fresh.forEach((p, pi) => out.push({ type: 'open', m, si, pattern: p, options: [optionFor(p), ...trailing], sets, patternIndex: pi }));
    if (!fresh.length) {
      const options = [...trailing, ...fallbackOptions];
      if (options.length) out.push({ type: 'open', m, si, pattern: options[0].pattern, options, sets, patternIndex: 0 });
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
    // F4 (round 6 coach audit C6-1: a men's physique quad focus put a leg
    // extension on the chest day): legs never take a second session.
    if ((LEGS_ONCE[category] || []).includes(m)) return null;
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
  // tier's pass never takes from a higher tier's normal volume).
  const fill = (goalOf, muscles, {
    allowOverflow = false, allowRepair = true, direct = false, fair = false, overflowSiblings = null, overflowFallback = null, overflowFor = null,
    incOnly = false, protect = null, byTier = false, noLoss = false, guardSense = false,
  } = {}) => {
    for (;;) {
      const weekly = weeklyLoad(plan, peak);
      const own = direct ? directWeek() : null;
      const level = (m) => (direct ? own[m] || 0 : (weekly[m] || {}).fractional || 0);
      const deficit = {};
      for (const m of muscles) deficit[m] = Math.max(0, goalOf(m) - level(m));
      const wanting = muscles.filter((m) => deficit[m] > 0);
      if (!wanting.length) break;
      const actions = [];
      for (const m of wanting) for (const si of visitsOf(m)) actions.push(...actionsFor(m, si).filter((a) => !incOnly || a.type === 'inc'));
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
      // Round 6 coach audit (C6-14: one calf raise at 5 sets, "sessions
      // full", where a second variant fitted): a muscle needing two or more
      // sets opens a second exercise in the session before a fifth set on
      // its first; the fifth set stays a fallback.
      const opensAt = new Set(actions.filter((a) => a.type === 'open').map((a) => `${a.m}|${a.si}`));
      const late = (a) => a.fifthSet && deficit[a.m] >= 2 && opensAt.has(`${a.m}|${a.si}`);
      const lateOnes = actions.filter(late);
      if (lateOnes.length) {
        const rest = actions.filter((a) => !late(a));
        const cut = rest.findIndex((a) => valueOf(a, deficit, direct) <= 0);
        actions.splice(0, actions.length, ...(cut < 0 ? [...rest, ...lateOnes] : [...rest.slice(0, cut), ...lateOnes, ...rest.slice(cut)]));
      }
      let done = false;
      for (const a of actions) {
        if (valueOf(a, deficit, direct) <= 0) break;
        if (!apply(a)) continue;
        done = true;
        break;
      }
      if (done) continue;
      // Nothing placeable: a muscle short of its minimum may take a further
      // session (R22); otherwise every wanting muscle is as full as it can be.
      let opened = false;
      if (allowOverflow) {
        for (const m of wanting.filter((x) => !overflowFor || overflowFor(x))) {
          let extra = overflowSession(m, overflowSiblings ? overflowSiblings(m) : undefined);
          if (extra == null && overflowFallback) extra = overflowSession(m, overflowFallback(m));
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
    if (allowRepair) repair(goalOf, muscles, protect, byTier, noLoss, guardSense, fair);
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
  // R49 (round 4 coach audit: a 2-set barbell bench opened Classic physique
  // Upper A beside 4-set isolations; the main compound gave first on every
  // tie): a lead muscle's only compound in a session holds at least 3 sets
  // once it has them, and on a tie an isolation, then the later exercise,
  // gives a set before a compound.
  const LEAD_COMPOUND_SETS = 3;
  const loneLeadCompound = (s, ex) => LEAD_MUSCLES.includes(ex.muscle) && PATTERNS[ex.pattern].kind === 'compound'
    && s.exercises.filter((y) => y.muscle === ex.muscle && PATTERNS[y.pattern].kind === 'compound').length === 1;
  const givesFirst = (s, a, b) => (KIND_RANK[orderKindFor(b.kind, b.pattern)] - KIND_RANK[orderKindFor(a.kind, a.pattern)])
    || (s.exercises.indexOf(b) - s.exercises.indexOf(a));
  // `protect(donor, short)`: a muscle that may not give to the short one;
  // `byTier`: the lowest tier gives first (R46, focus); `noLoss`: the short
  // muscle takes every set given, so the week never loses one (C5, R46);
  // `guardSense`: a step that breaks a sense check is undone (a beginner's
  // only leg curl given to a glute focus left hamstrings without a curl,
  // S11). Pressing against pulling and quads against hamstrings are left to
  // the focus phase, which raises the other side after the fill, and abs
  // last (S9) to the session order, which runs after it.
  function repair(goalOf, muscles, protect = null, byTier = false, noLoss = false, guardSense = false, fairOrder = false) {
    const quietSense = () => new Set(senseCheck(plan).failures.filter((f) => !['S3', 'S4', 'S9', 'S12'].includes(f.code))
      .map((f) => `${f.code}|${f.session || ''}|${f.muscle || ''}|${f.week || ''}`));
    const senseBefore = guardSense ? quietSense() : null;
    const goalAll = (m) => (muscles.includes(m) ? goalOf(m) : (targets[m] ? Math.min(goalOf(m) || 0, targets[m].min) : 0));
    for (let guard = 0; guard < 200; guard += 1) {
      const weekly = weeklyLoad(plan, peak);
      const fr = (m) => (weekly[m] || {}).fractional || 0;
      // For a fair fill (normal volume), the neediest first, as a share of
      // its goal (round 4 coach audit: freed sets went to the lats, first in
      // the rulebook order, while upper back sat at its minimum). The hard
      // minimum keeps the rulebook's priority order.
      const short = muscles.filter((m) => fr(m) < goalOf(m))
        .sort((a, b) => (fairOrder ? ((goalOf(b) - fr(b)) / goalOf(b)) - ((goalOf(a) - fr(a)) / goalOf(a)) : 0) || (rank(a) - rank(b)));
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
          const canGive = (ex, take, frNow, ownNow) => ex.muscle !== m && !(protect && protect(ex.muscle, m))
            && !(take === ex.peak && protectedEx(ex))
            && !(loneLeadCompound(s, ex) && ex.peak - take < LEAD_COMPOUND_SETS)
            // R34: a repair never takes a muscle's own sets below its floor,
            // nor an arm's or rear delt's below its minimum, the sets the
            // own-set pass placed so credit would not stand in for them.
            && !(isLeadTier(ex.muscle) && (ownNow[ex.muscle] || 0) - take
              < (CREDIT_FED.includes(ex.muscle) ? targets[ex.muscle].min : ownFloor(ex.muscle)))
            && frNow(ex.muscle) - take >= goalAll(ex.muscle)
            && PATTERNS[ex.pattern].credits.every((c) => frNow(c) - CREDIT_FRACTION * take >= goalAll(c));
          const ownStart = directWeek();
          const donors = s.exercises
            .map((ex) => ({ ex, take: ex.peak > SESSION_LIMITS.setsPerExerciseMin ? 1 : ex.peak }))
            .filter(({ ex, take }) => canGive(ex, take, fr, ownStart))
            .sort((a, b) => (byTier ? TIER_RANK[tierOf(category, b.ex.muscle)] - TIER_RANK[tierOf(category, a.ex.muscle)] : 0)
              || ((fr(b.ex.muscle) - goalAll(b.ex.muscle)) - (fr(a.ex.muscle) - goalAll(a.ex.muscle))) || givesFirst(s, a.ex, b.ex));
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
            // Round 4 coach audit: with noLoss, a second set from another
            // exercise here may fund a 2-set opening (a figure lat focus could
            // never open its first exercise in a session at 24 sets).
            if (noLoss && !removing) {
              const w3 = weeklyLoad(plan, peak);
              const fr3 = (x) => (w3[x] || {}).fractional || 0;
              const own3 = directWeek();
              const seconds = s.exercises.filter((ex2) => ex2 !== ex && ex2.peak > SESSION_LIMITS.setsPerExerciseMin && canGive(ex2, 1, fr3, own3))
                .sort((a, b) => (byTier ? TIER_RANK[tierOf(category, b.muscle)] - TIER_RANK[tierOf(category, a.muscle)] : 0) || givesFirst(s, a, b));
              for (const ex2 of seconds) {
                if (!tryStep(() => setPeak(ex2, ex2.peak - 1), () => setPeak(ex2, ex2.peak + 1))) continue;
                if (actionsFor(m, si).filter((a) => a.type === 'open' && a.sets >= take + 1).some(gain)) { improved = true; break; }
                setPeak(ex2, ex2.peak + 1);
                baseline = new Set(currentFaults().map(faultKey));
              }
              if (improved) break;
            }
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
        detail: `${short.map((m) => (m === 'upper_back' ? 'upper back' : (LABEL[m] || m).toLowerCase())).join(', ')} cannot get their weekly minimum${shortOwn.length ? ' from exercises of their own' : ''} in ${days} sessions, each session holding at most ${SESSION_LIMITS.exercisesHard} exercises and ${SESSION_LIMITS.workingSetsHard} sets`,
      },
    };
  }
  growth = true;
  fill((m) => targets[m].min, order2.filter((m) => isLeadTier(m) && CREDIT_FED.includes(m)), { direct: true, fair: true, allowRepair: false, incOnly: beginner });
  // Round 5 coach audit (C5-12): a 2-set opening that covered a 1-set
  // deficit leaves the muscle a set over its own minimum (4 + 2 against 5);
  // the larger exercise gives the set back before normal volume is filled.
  for (const m of order2.filter((x) => isLeadTier(x) && CREDIT_FED.includes(x))) {
    for (let guard = 0; guard < 4 && (directWeek()[m] || 0) - 1 >= targets[m].min; guard += 1) {
      const big = plan.sessions.flatMap((s) => s.exercises.filter((ex) => ex.muscle === m && ex.peak > SESSION_LIMITS.setsPerExerciseMin))
        .sort((a, b) => b.peak - a.peak)[0];
      if (!big || !tryStep(() => setPeak(big, big.peak - 1), () => setPeak(big, big.peak + 1))) break;
    }
  }
  // R36: normal volume by tier (09 B10 S5: P before S before M), fairly
  // within each; a repair in a tier's pass may take sets from a lower tier
  // down to its minimum, never from a higher tier.
  const TIER_ORDER = ['P', 'S', 'M'];
  // R50 (round 4 coach audit: classic physique 5 days held the lats, a
  // priority muscle, at 11 of 14 in their one session's cap while a free
  // upper session had room): a priority or standard muscle short of normal
  // volume may take one more session that neighbours none of its own and
  // trains the same half of the body, as a focus may (R30). Abs and calves
  // do not (the round-2 Kept ruling: names and length for the least
  // important work).
  const sameHalf = (m) => MUSCLES.filter((x) => x !== m && regionOf(x) === regionOf(m) && regionOf(m) !== 'trunk');
  const fillTypical = (opts = {}) => {
    TIER_ORDER.forEach((tier, i) => {
      const higher = new Set(TIER_ORDER.slice(0, i));
      fill((m) => targets[m].typical, order2.filter((m) => targets[m].tier === tier), {
        fair: true,
        protect: (m) => !!targets[m] && higher.has(targets[m].tier),
        // Round 7 coach audit (C7-7, reopening the round 2 Kept item: men's
        // physique 5 days gave calves 4 and abs 8, less than 4 days, with
        // two sessions at 48 minutes; the founder-approved week carries a
        // calf finisher on an upper day): abs and calves short of normal
        // volume, at any tier, may take one session of either half that
        // neighbours none of theirs, as a finisher.
        allowOverflow: true,
        overflowFor: (m) => FLOATERS.includes(m) || tier !== 'M',
        overflowSiblings: (m) => (FLOATERS.includes(m) ? MUSCLES.filter((x) => x !== m) : sameHalf(m)),
        ...opts,
      });
    });
  };
  fillTypical();
  // R51 (round 4 coach audit: "Shoulders & Arms" trained each arm with one
  // 3-set exercise, inside the chosen length): a muscle a session is named
  // for, and trains, holds at least 4 sets of its own there, where its
  // weekly maximum and every other check allow. Adds only.
  // Round 5 coach audit (C5-13: classic physique's arms day rose above
  // normal while abs and quads sat below it): only while the muscle is below
  // its normal volume, or nothing else the session lists is.
  const NAMED_SETS = 4;
  const namedDose = () => {
    for (let si = 0; si < n; si += 1) {
      const named = [...new Set((order[si].core || []).flat())].filter((m) => targets[m] && !plan.untrainable.includes(m));
      for (const m of named) {
        for (let guard = 0; guard < NAMED_SETS && directIn(si, m) >= SESSION_LIMITS.setsPerExerciseMin && directIn(si, m) < NAMED_SETS; guard += 1) {
          const w = weeklyLoad(plan, peak);
          const below = (x) => !!targets[x] && !plan.untrainable.includes(x) && ((w[x] || {}).fractional || 0) < targets[x].typical;
          if (!below(m) && lists[si].some((x) => x !== m && below(x))) break;
          const incs = actionsFor(m, si).filter((a) => a.type === 'inc').sort((a, b) => (a.ex.peak - b.ex.peak) || (posOf(a) - posOf(b)));
          if (!incs.some((a) => apply(a))) break;
        }
      }
    }
  };
  namedDose();
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
            if (loneLeadCompound(s, donor) && donor.peak - a.sets < LEAD_COMPOUND_SETS) continue;
            if (!ownShort(m, own) && TIER_RANK[targets[d].tier] <= TIER_RANK[targets[m].tier]) continue;
            // R54 (round 5 coach audit C5-6: figure's side delts gave 2 sets
            // to a hammer curl while the biceps' counted sets were already
            // above their minimum): once an arm's or rear delt's counted sets
            // reach its minimum, the move towards its own minimum takes only
            // from its tier or lower, and only sets above the giver's normal
            // volume.
            if (ownShort(m, own) && fr[m] >= targets[m].min
              && (TIER_RANK[targets[d].tier] < TIER_RANK[targets[m].tier] || fr[d] - a.sets < targets[d].typical)) continue;
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
      || (x.si - y.si) || givesFirst(plan.sessions[x.si], x.donor, y.donor) || (posOf(x.a) - posOf(y.a)) || cmp(x.a.m, y.a.m) || cmp(x.a.type, y.a.type));
    // Abs last (S9) waits for the session order, which runs after the moves.
    const movesSense = () => new Set([...senseFaults()].filter((k) => !k.startsWith('S9|')));
    const sense0 = movesSense();
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
        if (newIn(movesSense(), sense0)) {
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
  // R53 and the round 4 coach audit: tidy each session's split of a
  // muscle's sets. A fifth set beside an exercise under four moves to it
  // (5 + 2 becomes 4 + 3); two 2-set exercises of one movement become one of
  // four, freeing a slot (two 2-set lateral raises side by side). Sets stay
  // where they are; only the split changes.
  const tidy = () => {
    for (const s of plan.sessions) {
      for (const m of [...new Set(s.exercises.map((ex) => ex.muscle))]) {
        for (let guard = 0; guard < 4; guard += 1) {
          const own = s.exercises.filter((ex) => ex.muscle === m);
          const big = own.find((ex) => ex.peak > SESSION_LIMITS.setsPerExerciseMax);
          const small = own.filter((ex) => ex !== big && ex.peak < SESSION_LIMITS.setsPerExerciseMax).sort((a, b) => a.peak - b.peak)[0];
          if (!big || !small) break;
          if (!tryStep(() => { setPeak(big, big.peak - 1); setPeak(small, small.peak + 1); }, () => { setPeak(small, small.peak - 1); setPeak(big, big.peak + 1); })) break;
        }
        if (beginner) continue;
        const twos = s.exercises.filter((ex) => ex.muscle === m && ex.peak === SESSION_LIMITS.setsPerExerciseMin);
        for (const p of [...new Set(twos.map((ex) => ex.pattern))]) {
          const same = twos.filter((ex) => ex.pattern === p);
          if (same.length < 2 || maxSetsFor(m) < 2 * SESSION_LIMITS.setsPerExerciseMin) continue;
          if (same[0].nextDayException && 2 * SESSION_LIMITS.setsPerExerciseMin > LIGHT_DOSE.maxDirectSets) continue;
          const [keep, drop] = same;
          const at = s.exercises.indexOf(drop);
          const sense0 = new Set([...senseFaults()].filter((k) => !k.startsWith('S9|')));
          const undo = () => { s.exercises.splice(at, 0, drop); setPeak(keep, keep.peak - drop.peak); };
          if (!tryStep(() => { s.exercises.splice(at, 1); setPeak(keep, keep.peak + drop.peak); }, undo)) continue;
          if (newIn(new Set([...senseFaults()].filter((k) => !k.startsWith('S9|'))), sense0)) {
            undo();
            baseline = new Set(currentFaults().map(faultKey));
          }
        }
      }
    }
  };

  // R49: a lead muscle's only compound in a session left at 2 sets gets a
  // third (round 4 coach audit: a 2-set pulldown beside a 4-set reverse pec
  // deck). Round 5 coach audit (C5-2, C5-8): for priority and standard lead
  // muscles only; from free room first; a top-up placed for normal volume
  // total holds; otherwise from an isolation above 3 in the session, of the
  // same tier or lower, an arm or rear delt above its own floor first (as
  // R49 ruled), and never another muscle that would fall below normal while
  // the lead muscle reaches it.
  // Never a muscle the session is named for below its R51 dose there.
  const placedFor = (si, m) => !order[si].muscles.includes(m);
  // Round 7 coach audit (C7-6: classic physique's "Upper Body" kept a 2-set
  // incline press beside a 4-set preacher curl with the biceps 4 above
  // normal): R51's dose is owed where the session's name, as it would now
  // read, names the muscle.
  const namesNow = (si, m) => {
    const nm = sessionName(order[si].name, plan.sessions[si].exercises.filter((ex) => ex.peak >= SESSION_LIMITS.setsPerExerciseMin).map((ex) => ex.muscle));
    return nm.split(/, | & /).some((w) => (PART_MUSCLES[w] || []).includes(m));
  };
  // Round 6 coach audit (C6-3) and round 7 (C7-4: figure's 2-set incline
  // press stayed beside a 3-set straight-arm pulldown with the lats 3 above
  // normal; C7-6): a lead muscle's lone 2-set compound takes its third set
  // from an isolation in the session whose muscle stays at or above its
  // normal volume after giving, any tier, down to 2 sets, never below a dose
  // the session's name owes (R51) or an own floor.
  const surplusGives = (si, lead) => {
    const s = plan.sessions[si];
    const w = weeklyLoad(plan, peak);
    const frT = (m) => (w[m] || {}).fractional || 0;
    const ownT = directWeek();
    const donors = s.exercises
      .filter((ex) => ex !== lead && PATTERNS[ex.pattern].kind === 'isolation' && ex.peak > SESSION_LIMITS.setsPerExerciseMin && targets[ex.muscle]
        && ex.muscle !== lead.muscle && frT(ex.muscle) - 1 >= targets[ex.muscle].typical
        && !(namesNow(si, ex.muscle) && directIn(si, ex.muscle) - 1 < NAMED_SETS)
        && (!isLeadTier(ex.muscle) || (ownT[ex.muscle] || 0) - 1 >= (CREDIT_FED.includes(ex.muscle) ? targets[ex.muscle].min : ownFloor(ex.muscle)))
        && PATTERNS[ex.pattern].credits.every((c) => !targets[c] || frT(c) - CREDIT_FRACTION >= targets[c].min))
      .sort((a, b) => ((frT(b.muscle) - targets[b.muscle].typical) - (frT(a.muscle) - targets[a.muscle].typical)) || givesFirst(s, a, b));
    const quiet = () => new Set([...senseFaults()].filter((k) => !k.startsWith('S9|')));
    const sense0 = quiet();
    return donors.some((donor) => {
      const undo = () => { setPeak(lead, lead.peak - 1); setPeak(donor, donor.peak + 1); };
      if (!tryStep(() => { setPeak(donor, donor.peak - 1); setPeak(lead, lead.peak + 1); }, undo)) return false;
      if (!newIn(quiet(), sense0)) return true;
      undo();
      baseline = new Set(currentFaults().map(faultKey));
      return false;
    });
  };
  const raiseLeadCompounds = () => {
    for (let si = 0; si < n; si += 1) {
      const s = plan.sessions[si];
      const named = new Set((order[si].core || []).flat());
      for (const lead of s.exercises.filter((ex) => isLeadTier(ex.muscle) && loneLeadCompound(s, ex) && ex.peak < LEAD_COMPOUND_SETS)) {
        const quiet = () => new Set([...senseFaults()].filter((k) => !k.startsWith('S9|')));
        const sense0 = quiet();
        const keep = (move, undo) => {
          if (!tryStep(move, undo)) return false;
          if (!newIn(quiet(), sense0)) return true;
          undo();
          baseline = new Set(currentFaults().map(faultKey));
          return false;
        };
        if (keep(() => setPeak(lead, lead.peak + 1), () => setPeak(lead, lead.peak - 1))) continue;
        if (placedFor(si, lead.muscle)) {
          const mains = plan.sessions.flatMap((x, j) => (j === si ? [] : x.exercises.filter((e) => e.muscle === lead.muscle && e.peak > LEAD_COMPOUND_SETS)))
            .sort((a, b) => b.peak - a.peak);
          if (mains.some((e) => keep(() => { setPeak(e, e.peak - 1); setPeak(lead, lead.peak + 1); }, () => { setPeak(lead, lead.peak - 1); setPeak(e, e.peak + 1); }))) continue;
          // Round 6 coach audit (C6-3: a 2-set incline press stayed beside a
          // curl at the biceps' maximum): the third set from an isolation in
          // the session whose muscle is above its normal volume, any tier,
          // never below a named dose or an own floor.
          if (surplusGives(si, lead)) continue;
          const w = weeklyLoad(plan, peak);
          const frT = (m) => (w[m] || {}).fractional || 0;
          const ownT = directWeek();
          // Still at 2, and its muscle at normal volume without it (C6-3: a
          // 2-set pulldown beside a machine row with the lats at their
          // maximum): the top-up gives way, its room refilled for any muscle
          // still below normal.
          const without = frT(lead.muscle) - lead.peak;
          const creditsKept = PATTERNS[lead.pattern].credits.every((c) => !targets[c] || frT(c) - CREDIT_FRACTION * lead.peak >= targets[c].min);
          if (without >= targets[lead.muscle].typical && creditsKept && (!isLeadTier(lead.muscle) || (ownT[lead.muscle] || 0) - lead.peak >= ownFloor(lead.muscle))) {
            const at = s.exercises.indexOf(lead);
            if (keep(() => s.exercises.splice(at, 1), () => s.exercises.splice(at, 0, lead))) fillTypical({ allowRepair: false });
          }
          continue;
        }
        const weekly = weeklyLoad(plan, peak);
        const fr = (m) => (weekly[m] || {}).fractional || 0;
        const own = directWeek();
        const reachesNormal = fr(lead.muscle) + 1 >= targets[lead.muscle].typical;
        const donors = s.exercises
          .filter((ex) => ex !== lead && PATTERNS[ex.pattern].kind === 'isolation' && ex.peak > LEAD_COMPOUND_SETS && targets[ex.muscle]
            && TIER_RANK[tierOf(category, ex.muscle)] >= TIER_RANK[tierOf(category, lead.muscle)]
            && !(named.has(ex.muscle) && directIn(si, ex.muscle) - 1 < NAMED_SETS)
            && fr(ex.muscle) - 1 >= (reachesNormal && !CREDIT_FED.includes(ex.muscle) ? targets[ex.muscle].typical : targets[ex.muscle].min)
            && (!isLeadTier(ex.muscle) || (own[ex.muscle] || 0) - 1 >= ownFloor(ex.muscle))
            && PATTERNS[ex.pattern].credits.every((c) => !targets[c] || fr(c) - CREDIT_FRACTION >= targets[c].min))
          .sort((a, b) => (Number(CREDIT_FED.includes(b.muscle)) - Number(CREDIT_FED.includes(a.muscle)))
            || (TIER_RANK[tierOf(category, b.muscle)] - TIER_RANK[tierOf(category, a.muscle)])
            || ((fr(b.muscle) - targets[b.muscle].typical) - (fr(a.muscle) - targets[a.muscle].typical)) || givesFirst(s, a, b));
        if (donors.some((donor) => keep(() => { setPeak(donor, donor.peak - 1); setPeak(lead, lead.peak + 1); }, () => { setPeak(lead, lead.peak - 1); setPeak(donor, donor.peak + 1); }))) continue;
        surplusGives(si, lead);
      }
    }
  };
  growth = true;
  raiseLeadCompounds();
  tidy();
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
  const spinalLast = (ex) => ((PATTERNS[ex.pattern].joints || []).includes('spinal_axial') || (ex.extraJoints || []).includes('spinal_axial') ? 0 : 1);
  const orderSession = (s) => {
    const rankOf = (ex) => KIND_RANK[orderKindFor(ex.kind, ex.pattern)];
    // The session's half: its highest-ranked work for a muscle its template
    // names (the checker's C17 reads the same).
    const si0 = plan.sessions.indexOf(s);
    const named = (ex) => si0 < 0 || order[si0].muscles.includes(ex.muscle);
    const lead = [...s.exercises].sort((a, b) => rankOf(a) - rankOf(b)).find((ex) => ex.muscle !== 'abs' && named(ex))
      || [...s.exercises].sort((a, b) => rankOf(a) - rankOf(b)).find((ex) => ex.muscle !== 'abs');
    const home = lead ? regionOf(lead.muscle) : null;
    // Round 5 user audit: in a session holding both halves (a leg day with a
    // chest focus), each half's work stays together within its rank, the
    // session's own half first (a chest press no longer sits between the
    // hack squat and the Romanian deadlift).
    const away = (ex) => (home && ex.muscle !== 'abs' && regionOf(ex.muscle) !== home ? 1 : 0);
    // A top-up for a muscle the session is not named for follows the named
    // muscles' work of its rank (round 5 coach audit: a chest press between
    // two rows on a back day).
    const si = plan.sessions.indexOf(s);
    // Round 7 coach audit (C7-8: a top-up leg curl after the calf raise in
    // "Lower B"): a muscle the session's name already covers is ordered as
    // the session's own work (09 s7: P before S before M).
    const topUp = (ex) => (si >= 0 && !order[si].muscles.includes(ex.muscle)
      && !(COVERED_BY[ex.muscle] && COVERED_BY[ex.muscle].test(order[si].name)) ? 1 : 0);
    // Round 6 user audit (U6-10: a men's physique leg day with a chest focus
    // read hack squat, Romanian deadlift, incline press, leg extension, leg
    // curl, cable crossover): work of the other half that came in for
    // another muscle (a focus or a top-up) follows all of the session's own
    // work, so each half reads as one block (orderRanks, rulebook.js).
    const visitor = (ex) => (topUp(ex) && away(ex) ? 1 : 0);
    // A fly straight after the press it finishes, before the next muscle.
    const pressed = new Set(s.exercises.filter((ex) => ex.kind !== 'isolation').map((ex) => ex.muscle));
    const unfinished = (ex) => (ex.kind === 'isolation' && !pressed.has(ex.muscle) ? 1 : 0);
    s.exercises = s.exercises
      .map((ex, i) => ({ ex, i }))
      .sort((a, b) => (absLast(a.ex) - absLast(b.ex))
        || (visitor(a.ex) - visitor(b.ex))
        || (rankOf(a.ex) - rankOf(b.ex))
        || (away(a.ex) - away(b.ex))
        || (topUp(a.ex) - topUp(b.ex))
        // Round 4 and 5 coach audits (F6): a lift that loads the spine comes
        // before one that does not, whatever the focus or tier (a Romanian
        // deadlift after four heavy hip-thrust sets is the riskier order).
        || (spinalLast(a.ex) - spinalLast(b.ex))
        || (unfinished(a.ex) - unfinished(b.ex))
        || (TIER_RANK[tierOf(category, a.ex.muscle)] - TIER_RANK[tierOf(category, b.ex.muscle)])
        || (Number(plan.focus.includes(b.ex.muscle)) - Number(plan.focus.includes(a.ex.muscle)))
        || (MUSCLES.indexOf(a.ex.muscle) - MUSCLES.indexOf(b.ex.muscle))
        || (a.i - b.i))
      .map((x) => x.ex);
    // Round 6 coach audit (C6-7): two exercises of one movement sit side by
    // side, as a coach writes them; the round 5 rule that put a lower-tier
    // isolation between them broke 09 s7's order and read as a circuit. The
    // second carries `secondAngle` so the plan says why it is there (U5-6).
    // Round 6 coach audit (C6-8, C4-19, F6): a hinge comes before a hip
    // thrust in the same block, whatever their ranks (a Romanian deadlift
    // after four heavy hip-thrust sets is the riskier order).
    for (let guard = 0; guard < s.exercises.length; guard += 1) {
      const list = s.exercises;
      const thrust = list.findIndex((ex) => ex.pattern === 'hip_thrust');
      if (thrust < 0) break;
      const hinge = list.findIndex((ex, k) => k > thrust && ex.pattern === 'hinge' && visitor(ex) === visitor(list[thrust]));
      if (hinge < 0) break;
      // The thrust moves down to just after the hinge (never the hinge up
      // past a heavier lift).
      list.splice(hinge, 0, list.splice(thrust, 1)[0]);
    }
    s.exercises.forEach((ex, i) => {
      const prev = s.exercises[i - 1];
      ex.secondAngle = !!prev && prev.muscle === ex.muscle && prev.pattern === ex.pattern;
    });
  };
  plan.sessions.forEach(orderSession);

  // A whole-week snapshot: every session's exercises and sets, the lists and
  // the overflow, and a restore that puts them back.
  const snapshot = () => {
    const ex = plan.sessions.map((s) => s.exercises.map((x) => [x, x.peak]));
    const ls = lists.map((l) => [...l]);
    const ov = overflow.length;
    return () => {
      plan.sessions.forEach((s, i) => {
        s.exercises = ex[i].map(([x]) => x);
        ex[i].forEach(([x, p]) => { if (x.peak !== p) setPeak(x, p); });
      });
      ls.forEach((l, i) => { lists[i] = [...l]; });
      overflow.length = ov;
      baseline = new Set(currentFaults().map(faultKey));
    };
  };
  // Normal volume reached, counted per muscle up to its normal volume.
  const attained = () => {
    const w = weeklyLoad(plan, peak);
    return Object.entries(targets).filter(([m]) => !plan.untrainable.includes(m))
      .reduce((sum, [m, t]) => sum + Math.min((w[m] || {}).fractional || 0, t.typical), 0);
  };

  // The abs and calf isolation a session may give up: never the last of a
  // muscle its name promises (round 5 user audit: "Quads, Side Glutes, Abs
  // & Calves" held no abs once its crunch had moved).
  // A session an abs or calf exercise moves to keeps R25's beginner limit
  // above the minimum (round 6 coach audit C6-11: a beginner's leg day took
  // a sixth exercise).
  const moveCap = beginner ? SESSION_LIMITS.beginnerGrowthExercises : maxExercises;
  const NAMES_FLOATER = Object.freeze({ abs: /abs|core/i, calves: /calves/i });
  const movable = (i) => {
    const s = plan.sessions[i];
    return s.exercises.filter((x) => FLOATERS.includes(x.muscle) && x.kind === 'isolation'
      && !(NAMES_FLOATER[x.muscle].test(order[i].name) && s.exercises.filter((y) => y.muscle === x.muscle).length === 1));
  };

  // R48 (round 4 coach audit: a longer chosen session built a smaller week,
  // the abs and calf moves and the refill after them having run only when a
  // session ran over the clock): before the clock is read, an abs or calf
  // isolation moves from a session at its set or exercise limit, where a
  // muscle the session lists sits below normal volume, to the session with
  // the fewest sets that takes it inside every check; normal volume is then
  // filled again. A move is kept only when that refill reaches more normal
  // volume. The same week at every length (Q1 = C).
  for (let guard = 0; guard < 24; guard += 1) {
    const atLimit = (i) => setsOf(i) >= SESSION_LIMITS.workingSetsHard || plan.sessions[i].exercises.length >= maxExercises;
    const short = (i) => lists[i].some((m) => targets[m] && !plan.untrainable.includes(m) && !FLOATERS.includes(m) && fractional(m) < targets[m].typical);
    const sources = plan.sessions.map((_, i) => i).filter((i) => atLimit(i) && short(i));
    let kept = false;
    for (const i of sources) {
      const src = plan.sessions[i];
      for (const ex of movable(i)) {
        const dests = plan.sessions.map((s, j) => j)
          .filter((j) => j !== i && plan.sessions[j].exercises.length < moveCap && setsOf(j) + ex.peak <= SESSION_LIMITS.workingSetsHard)
          .sort((a, b) => (setsOf(a) - setsOf(b)) || (a - b));
        for (const j of dests) {
          const restore = snapshot();
          const reached = attained();
          const senseBefore = senseFaults();
          const dst = plan.sessions[j];
          const listed = lists[j].includes(ex.muscle);
          src.exercises.splice(src.exercises.indexOf(ex), 1);
          dst.exercises.push(ex);
          if (!listed) { lists[j].push(ex.muscle); overflow.push({ muscle: ex.muscle, session: dst.key, reason: 'room' }); }
          orderSession(dst);
          if (newIn(new Set(currentFaults().map(faultKey)), baseline) || newIn(senseFaults(), senseBefore)) { restore(); continue; }
          baseline = new Set(currentFaults().map(faultKey));
          growth = true;
          fillTypical({ allowRepair: false });
          growth = false;
          balancePushPull();
          plan.sessions.forEach(orderSession);
          if (attained() > reached + 1e-9 && !newIn(senseFaults(), senseBefore)) { kept = true; break; }
          restore();
        }
        if (kept) break;
      }
      if (kept) break;
    }
    if (!kept) break;
  }
  // Round 5 coach audit (C5-7: classic physique 4 days rowed 3 sets a week,
  // a straight-arm lat isolation having taken the back day's last slot): in
  // a session that lists the upper back and holds no row, while the upper
  // back sits below normal, a lat isolation gives its place to a row of the
  // same sets when the lats keep their minimum.
  for (let si = 0; si < n; si += 1) {
    const s = plan.sessions[si];
    if (!lists[si].includes('upper_back') || !targets.upper_back || plan.untrainable.includes('upper_back')) continue;
    if (s.exercises.some((ex) => ex.muscle === 'upper_back') || fractional('upper_back') >= targets.upper_back.typical) continue;
    const iso = s.exercises.filter((ex) => ex.muscle === 'lats' && PATTERNS[ex.pattern].kind === 'isolation').sort((a, b) => a.peak - b.peak)[0];
    if (!iso || !targets.lats || fractional('lats') - iso.peak * (1 - CREDIT_FRACTION) < targets.lats.min) continue;
    const restore = snapshot();
    const sense0 = new Set([...senseFaults()].filter((k) => !k.startsWith('S9|')));
    s.exercises.splice(s.exercises.indexOf(iso), 1);
    baseline = new Set(currentFaults().map(faultKey));
    let placed = 0;
    for (let g = 0; g < 4 && placed < iso.peak; g += 1) {
      const a = actionsFor('upper_back', si).find((x) => (placed ? x.type === 'inc' : x.type === 'open') && apply(x));
      if (!a) break;
      placed += a.sets;
    }
    if (placed < iso.peak || newIn(new Set([...senseFaults()].filter((k) => !k.startsWith('S9|'))), sense0)) restore();
  }
  // Round 5 coach audit (C5-8, C5-9): on the settled week normal volume is
  // filled once more, so no legal set is left unplaced, and the compound
  // floor and the named dose run again (a hip thrust opened by the refill
  // stayed at 2 sets).
  growth = true;
  fillTypical({ allowRepair: false });
  raiseLeadCompounds();
  namedDose();
  tidy();
  growth = false;
  balancePushPull();
  plan.sessions.forEach(orderSession);


  // R39 (code review BLOCKER: focus plans took sets from other muscles,
  // three passes having run after the focus fill): focus goes last, on the
  // finished plain week: the focus picks' sets (R30: a pick whose sessions
  // are full may take one more session that neighbours none of them and
  // trains the same half of the body; R47: or, failing one, the other
  // half), then pulling to match any added
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
  const plainWeekly = weeklyLoad(plan, peak);
  // R52 (round 4 audits: a bikini glute focus or a men's physique biceps
  // focus changed nothing, the plain week already at normal + 4 through
  // credit or a top-up): a focus adds 4 sets a week to what the plain week
  // gives the pick (09 s3: "+4 fractional sets/week"), never past the focus
  // maximum.
  const focusGoal = Object.fromEntries(focusList.map((m) => [m,
    Math.min(weeklyMax(category, m, focus), Math.max(targets[m].target, ((plainWeekly[m] || {}).fractional || 0) + FOCUS.addFractional))]));
  // Round 7 coach audit (C7-10: a lats focus took a side-delt set for one
  // more lat set, "19 to 20", the plain week already 1 below the focus
  // maximum): where the maximum leaves a pick less than R55's 2 sets to
  // gain, the plan says the pick is already close to the most a week holds,
  // and takes nothing from another muscle.
  const nearMax = {};
  for (const m of focusList) {
    const plain = (plainWeekly[m] || {}).fractional || 0;
    if (focusGoal[m] > plain && focusGoal[m] - plain < FOCUS_CHOICE_GAIN && focusGoal[m] >= weeklyMax(category, m, focus)) {
      focusGoal[m] = plain;
      nearMax[m] = true;
    }
  }
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
    // Round 5 coach audit (C5-4): a pick still short may take the place of a
    // whole top-up in its session, placed there for another muscle's normal
    // volume (R50, R22), when that muscle keeps its minimum and own floor,
    // is of the pick's tier or lower, and the picks take every set. Round 6
    // coach audit (C6-6): every pick the session trains may share the freed
    // sets (side delts and lats each took one where neither could take two).
    // Round 6 user audit (U6-7: a women's physique glute focus trained the
    // glutes in Lower A only, Lower B full): `spread`, before the fill, lets
    // a pick with work of its own in one session only take, in another
    // session that lists it, the place of an exercise on R46's terms (its
    // tier or lower, the lowest first, never below the giver's minimum or
    // floor) that is not the last of a muscle the session is built around,
    // so a focus muscle is trained twice a week.
    const swapInto = (spread) => {
      for (const m of focusList) {
        for (const si of visitsOf(m)) {
          if (spread) {
            const withOwn = visitsOf(m).filter((j) => directIn(j, m) >= SESSION_LIMITS.setsPerExerciseMin);
            if (withOwn.length !== 1 || withOwn[0] === si || directIn(si, m) > 0) continue;
          }
          const s = plan.sessions[si];
          const core = new Set((order[si].core || []).flat());
          const givers = spread
            ? [...s.exercises].sort((a, b) => (TIER_RANK[tierOf(category, b.muscle)] - TIER_RANK[tierOf(category, a.muscle)]) || (a.peak - b.peak) || givesFirst(s, a, b))
            : [...s.exercises];
          for (const ex of givers) {
            const now = weeklyLoad(plan, peak);
            const fr = (x) => (now[x] || {}).fractional || 0;
            if (fr(m) >= focusGoal[m]) break;
            const d = ex.muscle;
            if (d === m || focus.includes(d) || !targets[d]) continue;
            if (TIER_RANK[tierOf(category, d)] < TIER_RANK[tierOf(category, m)]) continue;
            if (spread ? core.has(d) && s.exercises.filter((y) => y.muscle === d).length === 1 : !placedFor(si, d)) continue;
            if (spread && directIn(si, m) > 0) break;
            if (fr(d) - ex.peak < targets[d].min) continue;
            const own = directWeek();
            if (isLeadTier(d) && (own[d] || 0) - ex.peak < (CREDIT_FED.includes(d) ? targets[d].min : ownFloor(d))) continue;
            if (PATTERNS[ex.pattern].credits.some((c) => targets[c] && fr(c) - CREDIT_FRACTION * ex.peak < targets[c].min)) continue;
            const restore = snapshot();
            const quiet = () => new Set([...senseFaults()].filter((k) => !/^(S3|S4|S9|S12)\|/.test(k)));
            const sense0 = quiet();
            s.exercises.splice(s.exercises.indexOf(ex), 1);
            baseline = new Set(currentFaults().map(faultKey));
            const takers = spread ? [m] : focusList.filter((x) => visitsOf(x).includes(si));
            let added = 0;
            for (let g = 0; g < 12 && added < ex.peak; g += 1) {
              let any = false;
              for (const x of takers) {
                if (added >= ex.peak) break;
                const w = weeklyLoad(plan, peak);
                if (((w[x] || {}).fractional || 0) >= focusGoal[x]) continue;
                const a = actionsFor(x, si).sort((p, q) => ((p.type === 'inc' ? 0 : 1) - (q.type === 'inc' ? 0 : 1)) || (posOf(p) - posOf(q))).find((y) => apply(y));
                if (a) { added += a.sets; any = true; }
              }
              if (!any) break;
            }
            if (added < ex.peak || newIn(quiet(), sense0)) restore();
          }
        }
      }
    };
    const swapTopUps = () => swapInto(false);
    const cap = {};
    let balanced = false;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      growth = true;
      // Any other muscle's goal is its own target, so room-making keeps it
      // at its minimum (repair reads the lower of the two).
      swapInto(true);
      const focusFill = (opts = {}) => fill((m) => Math.min(focusGoal[m] ?? (targets[m] ? targets[m].target : 0), cap[m] ?? Infinity), focusList, {
        allowOverflow: true,
        // Round 5 coach audit (C5-5): an abs pick may take any session that
        // neighbours none of its own (the person ranks them; the round-2 Kept
        // ruling holds for plain weeks).
        overflowSiblings: (m) => (regionOf(m) === 'trunk' ? MUSCLES.filter((x) => x !== m) : sameHalf(m)),
        // R47: none in that half, a session of the other half that neighbours
        // none of the pick's (a men's physique chest focus at 4 days: its one
        // session already at the most one session may hold, so chest goes on
        // the leg day, two days from each chest day).
        overflowFallback: (m) => (regionOf(m) === 'trunk' ? [] : MUSCLES.filter((x) => x !== m && regionOf(x) !== 'trunk')),
        byTier: true,
        noLoss: true,
        guardSense: true,
        protect: focusProtect,
        ...opts,
      });
      focusFill();
      swapTopUps();
      // Round 7 user audit (U7-5: a beginner's calf focus left a legal set
      // unplaced, a 2-set seated calf raise opened by room-making having room
      // for a third): room a repair or a swap opened is filled.
      focusFill({ allowRepair: false });
      raise(PULL, () => ownOf(PULL) < ownOf(PUSH));
      raise(['hamstrings'], () => legGap() > 0);
      // Room the focus freed and did not use goes back to the muscles that
      // gave it, never past their plain week (round 5 audit render: a rear
      // delt set given up and left unused).
      const gave = Object.keys(targets).filter((x) => !focus.includes(x) && !plan.untrainable.includes(x)
        && fractional(x) < Math.min(targets[x].typical, (plainWeekly[x] || {}).fractional || 0));
      if (gave.length) fill((x) => Math.min(targets[x].typical, (plainWeekly[x] || {}).fractional || 0), gave, { allowRepair: false });
      tidy();
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
    // Round 6 user audit (U6-3): the own sets a person counts, and the
    // counted week (with other exercises' half credit) that the minimum is
    // judged on, so a line never sets own sets against a counted minimum.
    const counted = weeklyLoad(plan, peak);
    plan.focusTook = Object.keys(before).filter((m) => !focus.includes(m) && (after[m] || 0) < before[m])
      .sort((a, b) => rank(a) - rank(b))
      .map((m) => ({
        muscle: m,
        from: before[m],
        to: after[m] || 0,
        countedFrom: (plainWeekly[m] || {}).fractional || 0,
        countedTo: (counted[m] || {}).fractional || 0,
        minimum: targets[m] ? targets[m].min : 0,
      }));
  }
  if (!plan.focusTook) plan.focusTook = [];
  // An overflow entry where nothing was placed is dropped (R39).
  plan.overflow = overflow.filter((o) => plan.sessions.some((s) => s.key === o.session && s.exercises.some((ex) => ex.muscle === o.muscle)));
  const afterFocus = weeklyLoad(plan, peak);
  plan.focusTargets = { ...focusGoal };
  // R38: why a focus fell short: every session that may hold it already
  // holds the most one session may (session_cap), or its sessions are full;
  // R39: or pulling could not match more pressing (pull_balance), or
  // hamstrings half of more quads (hamstring_balance), or the focused week
  // failed a check and the focus was taken back (checks).
  // R8 and the round 4 and 5 audits: what binds in each session that lists
  // a muscle, found by trying the next set or exercise there and naming the
  // rule it would break: the most of that muscle one session may hold
  // (muscle_cap), the session's sets (set_cap) or exercises (exercise_cap),
  // the muscle's exercises full with no slot for another (exercise_full),
  // recovery (recovery), a joint limit (joints), the same exercise in a
  // neighbouring session (variety), no different movement left (movement),
  // pressing against pulling or quads against hamstrings (balance), nothing
  // more in the kit (no_choice). Round 5 coach audit: 'rules' had stood for
  // anything.
  // Round 6 audits (C6-4, U6-2, U6-13): the cap of another muscle the set
  // would feed (muscle_cap_other:<muscle>, a hack squat's credit to the
  // glutes), which balance (pressing against pulling, or quads against
  // hamstrings) and which joint, so every reason printed is true.
  const CODE_BINDER = Object.freeze({
    C3: 'muscle_cap', C2: 'recovery', S2: 'recovery', C16: 'variety', S8: 'movement', S3: 'balance_push', S4: 'balance_legs',
    C8: 'joints_shoulder', C9: 'joints_shoulder', C10: 'joints_shoulder', C12: 'joints_back', C13: 'joints_back', C14: 'joints_elbow', C15: 'joints_knee',
  });
  // One cause per muscle: the session holding most of its sets decides, and
  // within a session the first of these that binds (round 6 user audit
  // U6-2: four causes joined by "or" read as the plan not knowing why).
  const BINDER_ORDER = ['muscle_cap', 'set_cap', 'exercise_cap', 'exercise_full', 'muscle_cap_other', 'balance_push', 'balance_legs',
    'recovery', 'joints_shoulder', 'joints_back', 'joints_elbow', 'joints_knee', 'variety', 'movement', 'no_choice', 'rules', 'room'];
  const binderRank = (b) => { const i = BINDER_ORDER.indexOf(b.split(':')[0]); return i < 0 ? BINDER_ORDER.length : i; };
  const byBinder = (x, y) => binderRank(x) - binderRank(y);
  // Round 7 user audit (U7-3: "the exercises for them are at their most sets
  // and their sessions have no room for another exercise" beside a session
  // at 22 sets): with no step left, which limit it is: the session's
  // exercises, the muscle's exercises in one session, or no other exercise
  // for it (none in the kit, or only in the neighbouring sessions).
  const kitIds = (m) => new Set(Object.keys(kit.byPattern).filter((p) => PATTERNS[p] && PATTERNS[p].muscle === m)
    .flatMap((p) => kit.byPattern[p].map((c) => c.exerciseId || c.name)));
  const noStep = (m, si) => {
    const s = plan.sessions[si];
    const own = s.exercises.filter((ex) => ex.muscle === m);
    if (s.exercises.length >= (beginner ? SESSION_LIMITS.beginnerGrowthExercises : maxExercises)) return 'exercise_cap';
    if (own.length && own.length >= exercisesPerMuscle(m)) return 'exercise_full';
    const here = new Set(s.exercises.map((ex) => ex.id));
    const left = [...kitIds(m)].filter((id) => !here.has(id));
    if (!left.length) return 'no_choice';
    const near = usedNear(si);
    return left.every((id) => near.has(id)) ? 'variety' : 'movement';
  };
  // What binds the muscle in one session, the cause the plan states first.
  // Round 7 audits (C7-3: "each session that trains them already holds the
  // most sets of them" where one more set on the leg extension broke only
  // the session's 24 sets): the cause is what the cheapest step breaks (one
  // more set on an exercise there, before a new exercise); the muscle's own
  // cap is stated only when every step breaks it.
  const bindersIn = (m, si) => {
    const s = plan.sessions[si];
    if (directIn(si, m) >= PER_SESSION.directCap) return ['muscle_cap'];
    const acts = actionsFor(m, si);
    if (!acts.length) return [noStep(m, si)];
    // S6 is the probe's own artefact: a session the muscle joined for normal
    // volume (R50) lists it, whatever the overflow record now holds.
    const quiet = () => new Set([...senseFaults()].filter((k) => !/^(S6|S9|S12)\|/.test(k)));
    const sense0 = quiet();
    const per = [];
    for (const a of acts) {
      const sets0 = setsOf(si);
      let undo;
      if (a.type === 'inc') { setPeak(a.ex, a.ex.peak + 1); undo = () => setPeak(a.ex, a.ex.peak - 1); } else {
        const o = a.options[0];
        s.exercises.push(makeExercise(si, m, o.pattern, o.choices[0], a.sets));
        undo = () => s.exercises.pop();
      }
      const codes = [...currentFaults().filter((f) => !baseline.has(faultKey(f)))
        .map((f) => (f.code === 'C3' && f.muscle && f.muscle !== m ? `C3other:${f.muscle}` : f.code)),
        ...[...quiet()].filter((k) => !sense0.has(k)).map((k) => k.split('|')[0])];
      undo();
      const found = new Set();
      if (!codes.length) found.add('room');
      for (const c of codes) {
        if (c === 'C6') found.add(sets0 + a.sets > SESSION_LIMITS.workingSetsHard ? 'set_cap' : 'exercise_cap');
        else if (c.startsWith('C3other:')) found.add(`muscle_cap_other:${c.slice(8)}`);
        else found.add(CODE_BINDER[c] || `rules:${c}`);
      }
      per.push({ a, b: [...found] });
    }
    const all = [...new Set(per.flatMap((x) => x.b))].sort(byBinder);
    if (!all.length) return ['rules'];
    const capAll = per.every((x) => x.b.includes('muscle_cap'));
    const cheapest = per.some((x) => x.a.type === 'inc') ? per.filter((x) => x.a.type === 'inc') : per;
    const first = [...new Set(cheapest.flatMap((x) => x.b))].filter((b) => capAll || b !== 'muscle_cap').sort(byBinder)[0] || all[0];
    return [first, ...all.filter((b) => b !== first)];
  };
  // Tried under the limits the sets above the minimum were placed under
  // (a beginner's 3 sets an exercise and 5 exercises a session, R25).
  // `limits`: the first entry is the cause the plan states, the rest kept
  // for the tests and the audits. `causes` (round 7 audits U7-3, C7-3: "each
  // session ..." where only one session bound that way): the stated cause in
  // each session that trains the muscle, the session holding most of its
  // sets first, so the plan says it of the session it is true of.
  const limitsInfo = (m) => {
    const was = growth;
    growth = true;
    const per = visitsOf(m).map((si) => ({ si, sets: directIn(si, m), b: bindersIn(m, si) }));
    growth = was;
    per.sort((x, y) => (y.sets - x.sets) || (x.si - y.si));
    const all = [...new Set(per.flatMap((x) => x.b))].sort(byBinder);
    const lead = per.find((x) => x.b.length && binderRank(x.b[0]) < binderRank('room'));
    const main = lead ? lead.b[0] : all[0] || 'rules';
    const causes = per.filter((x) => x.b.length && x.b[0] !== 'room').map((x) => ({ si: x.si, code: x.b[0] }));
    return { limits: [main, ...all.filter((x) => x !== main)], causes };
  };
  plan.focusUnmet = focusList
    .filter((m) => ((afterFocus[m] || {}).fractional || 0) < focusGoal[m])
    .map((m) => {
      const info = limitsInfo(m);
      return {
        muscle: m,
        sets: (afterFocus[m] || {}).fractional || 0,
        target: focusGoal[m],
        reason: focusWhy[m] || (visitsOf(m).every((si) => directIn(si, m) >= PER_SESSION.directCap) ? 'session_cap' : 'sessions_full'),
        limits: info.limits,
        causeAt: info.causes,
        sessions: visitsOf(m).length,
      };
    });

  // What stops more sets for every muscle, read on the week before any move
  // for length (round 6 audits), for the report's below-normal list.
  const limitsAt = {};
  for (const m of Object.keys(targets)) if (!plan.untrainable.includes(m)) limitsAt[m] = limitsInfo(m);

  // R28 (coach audit: six-day weeks asked for longer sessions while their
  // shortest sessions ran under 30 minutes): before asking for a longer
  // session, move whole abs and calf exercises from a session still over the
  // chosen length at floor rest to the shortest session that takes them
  // inside every rulebook and sense check; and (R44) single sets between
  // two sessions that both list the muscle, onto an exercise of it already
  // there, with no muscle losing normal volume. The week keeps every set
  // (Q1 = C); only where the sets fall changes.
  // Round 6 audits (C6-11, U6-4, and the lead's own sweep: a focus week took
  // the slot a length move had freed, so its sets differed by length): the
  // moves run after focus, on the finished week, and what stops more sets is
  // read before them, so the week and its reasons are the same at every
  // length (Q1 = C). A beginner's destination keeps R25's limit above the
  // minimum.
  if (length != null) {
    const before = plan.sessions.map((s) => s.exercises.map((ex) => [ex, ex.peak]));
    const listsBefore = lists.map((l) => [...l]);
    const overflowBefore = overflow.length;
    growth = true;
    for (let guard = 0; guard < 40; guard += 1) {
      const over = plan.sessions.map((s, i) => ({ i, m: floorMinutes(s) }))
        .filter((x) => Math.round(x.m) > limit).sort((a, b) => (b.m - a.m) || (a.i - b.i));
      let moved = false;
      for (const { i } of over) {
        const src = plan.sessions[i];
        for (const ex of movable(i)) {
          const dests = plan.sessions.map((s, j) => ({ j, m: floorMinutes(s) }))
            .filter((x) => x.j !== i && plan.sessions[x.j].exercises.length < moveCap)
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
      // Round 7 coach audit (C7-2: wellness 5 days asked for 70-minute
      // sessions beside a 41-minute day that already held the same leg
      // extension; one set can never leave a 2-set exercise): a whole
      // isolation exercise moves from a session over the length to another
      // session that lists its muscle, onto the same movement there (its sets
      // added) or as itself. The pattern is the same, so every muscle keeps
      // its sets and credits. Never the last exercise of a muscle the
      // session's name promises.
      if (!moved) {
        for (const { i } of over) {
          const src = plan.sessions[i];
          const senseBefore = senseFaults();
          const core = new Set((order[i].core || []).flat());
          const isolations = src.exercises.filter((x) => PATTERNS[x.pattern].kind === 'isolation' && !FLOATERS.includes(x.muscle)
            && !(core.has(x.muscle) && src.exercises.filter((y) => y.muscle === x.muscle).length === 1))
            .sort((a, b) => (b.peak - a.peak) || (src.exercises.indexOf(b) - src.exercises.indexOf(a)));
          for (const ex of isolations) {
            const dests = visitsOf(ex.muscle).filter((j) => j !== i)
              .map((j) => ({ j, m: floorMinutes(plan.sessions[j]) }))
              .sort((a, b) => (a.m - b.m) || (a.j - b.j));
            for (const { j } of dests) {
              const dst = plan.sessions[j];
              const at = src.exercises.indexOf(ex);
              const same = dst.exercises.find((y) => y.id === ex.id)
                || dst.exercises.find((y) => y.muscle === ex.muscle && y.pattern === ex.pattern && variantOf(y.pattern, y.name) === variantOf(ex.pattern, ex.name));
              let setCap = beginner ? Math.min(maxSetsFor(ex.muscle), SESSION_LIMITS.beginnerGrowthSetsPerExercise) : maxSetsFor(ex.muscle);
              if (same && same.nextDayException) setCap = Math.min(setCap, LIGHT_DOSE.maxDirectSets);
              if (same ? same.peak + ex.peak > setCap : dst.exercises.length >= moveCap) continue;
              const move = same
                ? () => { src.exercises.splice(at, 1); setPeak(same, same.peak + ex.peak); }
                : () => { src.exercises.splice(at, 1); dst.exercises.push(ex); };
              const undo = same
                ? () => { setPeak(same, same.peak - ex.peak); src.exercises.splice(at, 0, ex); }
                : () => { dst.exercises.splice(dst.exercises.indexOf(ex), 1); src.exercises.splice(at, 0, ex); };
              if (!tryStep(move, undo)) continue;
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
      }
      if (!moved) break;
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
    }
    // R48: no refill here. The moves for length change only where sets
    // fall; the room they free was filled, if anywhere, before the clock was
    // read, so the week is the same at every length.
    tidy();
    plan.sessions.forEach(orderSession);
  }
  plan.overflow = overflow.filter((o) => plan.sessions.some((s) => s.key === o.session && s.exercises.some((ex) => ex.muscle === o.muscle)));

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
  const named = lettersFor(plan.sessions.map((s, i) => sessionName(order[i].name,
    s.exercises.filter((ex) => ex.peak >= SESSION_LIMITS.setsPerExerciseMin).map((ex) => ex.muscle))));
  plan.sessions.forEach((s, i) => { s.name = named[i]; });

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
  // Round 7 audits (U7-3, C7-3): the stated cause in each session that
  // trains a muscle, by the session's name, grouped by cause, so the plan
  // says "each session that trains them" only where it is true of each.
  const namedCauses = (list) => {
    if (!list || !list.length) return null;
    const groups = [];
    for (const c of list) {
      const g = groups.find((x) => x.code === c.code);
      if (g) g.sessions.push(plan.sessions[c.si].name);
      else groups.push({ code: c.code, sessions: [plan.sessions[c.si].name] });
    }
    return { every: groups.length === 1, single: list.length === 1, groups };
  };
  const belowTypical = Object.entries(targets)
    .filter(([m, t]) => !plan.untrainable.includes(m) && (weekly[m]?.fractional ?? 0) < (focusGoal[m] ?? t.target))
    .map(([m, t]) => ({ muscle: m, sets: weekly[m]?.fractional ?? 0, target: focusGoal[m] ?? t.target, limits: (limitsAt[m] || {}).limits || [], causes: namedCauses((limitsAt[m] || {}).causes), sessions: visitsOf(m).length }));

  return {
    ok: true,
    plan,
    report: {
      minutes: plan.reportedMinutes,
      longestMinutes: Math.max(...minutes),
      restTrimmed,
      needsLengthChoice: plan.needsLengthChoice,
      suggestedLength: plan.needsLengthChoice ? TIME_MODEL.lengths.find((l) => l + TIME_MODEL.toleranceMinutes >= Math.round(Math.max(...minutes))) ?? Math.ceil(Math.max(...minutes)) : null,
      // More days only where more days make the week fit; buildStructurePlan
      // settles it (daysThatFit) by building them (round 4 user audit: at 30
      // and 45 minutes "or more days" was offered where no day count fits).
      moreDaysPossible: plan.needsLengthChoice ? days < Math.max(...DAY_COUNTS) : false,
      daysThatFit: null,
      focusUnmet: plan.focusUnmet,
      focusTook: plan.focusTook,
      // Round 4 user audit: every pick says what it did, including a pick
      // the plain week already holds at its focus maximum (the plan is then
      // the same, and says why).
      focusResults: focusList.map((m) => {
        const unmet = plan.focusUnmet.find((f) => f.muscle === m);
        const before = (plainWeekly[m] || {}).fractional || 0;
        return {
          muscle: m,
          before,
          after: weekly[m]?.fractional ?? 0,
          target: focusGoal[m],
          reason: unmet ? unmet.reason : before >= focusGoal[m] ? 'at_max' : 'reached',
          // C7-10: at_max because the focus maximum leaves under 2 sets.
          nearMax: !!nearMax[m],
          max: weeklyMax(category, m, focus),
          causes: unmet ? namedCauses(unmet.causeAt) : null,
          // F4: a men's physique leg pick stays in the one leg session.
          legsOnce: (LEGS_ONCE[category] || []).includes(m),
        };
      }),
      // Round 7 user audit (U7-4: a lats focus with a barbell and plates was
      // dropped without a word): a pick the kit cannot train, with what other
      // exercises give it.
      focusUntrainable: focus.filter((m) => plan.untrainable.includes(m))
        .map((m) => ({ muscle: m, sets: weekly[m]?.fractional ?? 0, minimum: targets[m].min })),
      // Round 7 user audit (U7-1: "every muscle gets at least its minimum"
      // above a week whose lats, with no exercise of their own, sat at 5 of
      // 10): a muscle the kit cannot train, with what other exercises give
      // it, and every muscle below its minimum.
      untrainableSets: plan.untrainable.map((m) => ({ muscle: m, sets: weekly[m]?.fractional ?? 0, minimum: targets[m].min })),
      belowMinimum: Object.entries(targets).filter(([m, t]) => (weekly[m]?.fractional ?? 0) < t.min).map(([m]) => m),
      // The sessions over the chosen length, by name and minutes (round 4
      // user audit: the question never said which session).
      overSessions: length == null ? [] : plan.sessions.map((s, i) => ({ key: s.key, name: s.name, minutes: Math.round(minutes[i]) }))
        .filter((x) => x.minutes > length + TIME_MODEL.toleranceMinutes),
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

// A week built at a day count and a length by the first strategy that
// builds, kept for the call.
function builderFor(args) {
  const built = new Map();
  return (d, len = args.lengthMinutes) => {
    const k = `${d}|${len}`;
    if (!built.has(k)) {
      let got = null;
      for (const strategy of STRATEGIES) {
        const x = buildWith({ ...args, days: d, lengthMinutes: len }, strategy);
        if (x.ok) { got = x; break; }
        if (!RETRYABLE.has(x.refusal.reason)) break;
      }
      built.set(k, got);
    }
    return built.get(k);
  };
}
// Round 7 audits (C7-1, U7-12: at 30 or 45 minutes "Sessions of 75 minutes
// would hold this plan" where 60 held the same week): the shortest standard
// length at which the week builds without asking, found by building it
// there, as the fewest days are (the moves for length differ by length; the
// week does not, Q1 = C).
function shortestLength(at, d, from, fallback) {
  if (!Number.isFinite(from)) return fallback;
  return TIME_MODEL.lengths.find((l) => l > from && at(d, l) && !at(d, l).report.needsLengthChoice) ?? fallback;
}

// The fewest more days at which the week fits the chosen length, when the
// person is asked to choose (Q1 = C); none means "or more days" is not
// offered.
// And for a focus pick short of its target, the fewest more days at which
// the pick reaches it (round 4 audits: the plan never said what would).
function withDaysThatFit(r, args) {
  const at = builderFor(args);
  // 09 B12: a beginner is recommended 3 to 4 days, so never offered more
  // (round 5 coach audit).
  const more = DAY_COUNTS.filter((d) => d > args.days && (args.experience !== 'beginner' || d <= 4));
  if (r.report.needsLengthChoice) {
    r.report.suggestedLength = shortestLength(at, args.days, args.lengthMinutes, r.report.suggestedLength);
    const fits = more.find((d) => at(d) && !at(d).report.needsLengthChoice);
    r.report.daysThatFit = fits ?? null;
    r.report.moreDaysPossible = fits != null;
  }
  // Round 5 audits (C5-19): a week that carries what one day fewer carries
  // says so (a sixth bikini day added one abs set).
  // Round 6 coach audit (C6-10: general 6 days carried exactly 5 days'
  // sets, men's physique 6 days 3 more, neither said so): judged by the
  // week's total, within 3 sets or 3% of the week, whichever is more, and
  // no muscle more than 2 apart.
  // Round 7 user audit (U7-13: 165 six-day weeks carried fewer sets than
  // five days, men's physique 5 days fewer than 4): a week that carries at
  // least one set fewer than one day fewer says so, at any day count.
  const total = (w) => Object.values(w).reduce((t, v) => t + (v.sets || 0), 0);
  if (args.days >= 3) {
    const fewer = at(args.days - 1);
    if (fewer) {
      const diff = total(fewer.report.weekly) - total(r.report.weekly);
      const close = Math.abs(diff) <= Math.max(3, 0.03 * total(fewer.report.weekly))
        && Object.entries(r.report.weekly).every(([m, v]) => Math.abs(v.sets - ((fewer.report.weekly[m] || {}).sets || 0)) <= 2);
      if (close && args.days >= 5) r.report.sameAsFewerDays = args.days - 1;
      if (diff >= 1) r.report.fewerSetsThan = { days: args.days - 1, sets: Math.round(diff) };
    }
  }
  const resultAt = (d, m) => (at(d) ? at(d).report.focusResults.find((x) => x.muscle === m) : null);
  for (const f of r.report.focusUnmet) {
    f.reachedAt = more.find((d) => at(d) && !at(d).report.focusUnmet.some((u) => u.muscle === f.muscle)) ?? null;
    // Round 7 user audit (U7-2: "With 6 days a week it reaches 17", and 16
    // on rebuild): the figure is what the pick gets at that day count, whose
    // own plain week sets its target.
    f.reachedSets = f.reachedAt != null ? resultAt(f.reachedAt, f.muscle).after : null;
    // Round 5 user audit: where no day count reaches the target, the fewest
    // more days at which the pick still gains, and what it gets there.
    const setsAt = (d) => (resultAt(d, f.muscle) || {}).after || 0;
    const better = f.reachedAt ?? more.find((d) => setsAt(d) > f.sets);
    f.moreAt = better != null ? { days: better, sets: setsAt(better) } : null;
    const result = r.report.focusResults.find((x) => x.muscle === f.muscle);
    if (result) Object.assign(result, { reachedAt: f.reachedAt, reachedSets: f.reachedSets, moreAt: f.moreAt, limits: f.limits });
  }
  // Round 6 user audit (U6-6): where more than five muscles sit below normal
  // volume, the fewest more days at which at most half of them still do.
  // Round 7 user audit (U7-7): a gap of one set or less is not listed.
  const shortCount = (rep) => rep.belowTypical.filter((b) => b.target - b.sets > 1).length;
  const nowShort = shortCount(r.report);
  r.report.fullerAt = nowShort > 5 ? more.find((d) => at(d) && shortCount(at(d).report) <= nowShort / 2) ?? null : null;
  // R55 (round 6 user audit U6-1, the founder's D219 complaint: "Even with
  // specialising chest I get two exercises!"): a pick the week cannot give
  // at least 2 more sets is never saved silently. The plan asks first: the
  // day count at which it gains, the same days without the pick, or the
  // same days with it as it is (Q1 = C's pattern for the length).
  // Round 7 user audit (U7-2: the offered day count often asked the same
  // question again, and its figure was the target, not the rebuild): the
  // fewest more days at which the pick gains at least 2 sets over that day
  // count's own plain week, with what it gets there and, where that week
  // asks for longer sessions, the length it needs; none, no day count is
  // offered. And (U7-4) a pick the kit cannot train asks too.
  r.report.focusChoice = [
    ...r.report.focusResults
      .filter((f) => f.reason !== 'at_max' && f.reason !== 'reached' && f.after - f.before < FOCUS_CHOICE_GAIN)
      .map((f) => {
        const gains = more.find((d) => {
          const x = resultAt(d, f.muscle);
          return x && x.after - x.before >= FOCUS_CHOICE_GAIN && x.after > f.after;
        });
        const then = gains != null ? at(gains) : null;
        return {
          muscle: f.muscle, before: f.before, after: f.after, target: f.target,
          moreDays: gains ?? null,
          setsThen: gains != null ? resultAt(gains, f.muscle).after : null,
          lengthThen: then && then.report.needsLengthChoice ? shortestLength(at, gains, args.lengthMinutes, then.report.suggestedLength) : null,
        };
      }),
    ...(r.report.focusUntrainable || []).map((u) => ({ muscle: u.muscle, before: u.sets, after: u.sets, untrainable: true, moreDays: null, setsThen: null, lengthThen: null })),
  ];
  r.report.needsFocusChoice = r.report.focusChoice.length > 0;
  return r;
}
// R55: the least a focus pick adds before the plan asks.
const FOCUS_CHOICE_GAIN = 2;

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
    if (r.ok) return startAt(withDaysThatFit(r, args), args.startIndex);
    if (!RETRYABLE.has(r.refusal.reason)) return r;
    if (!last || last.refusal.reason !== 'minimum_unreachable') last = r;
  }
  // The nearest day counts that would hold the week in the same kit, more
  // days first on a tie (most refusals are short weeks); the person chooses.
  // R45: each day count is tried once.
  // 09 B12 (round 6 user audit U6-5: a beginner asking for 5 days was told
  // 6 work): a beginner is never offered more than 4 days.
  const others = DAY_COUNTS.filter((d) => d !== args.days && (args.experience !== 'beginner' || d <= 4))
    .sort((a, b) => (Math.abs(a - args.days) - Math.abs(b - args.days)) || (b - a));
  const at = builderFor(args);
  const builds = (d) => !!at(d);
  const more = others.filter((d) => d > args.days).find(builds);
  if (more != null) last.refusal.minimumDays = more;
  const nearest = more != null && Math.abs(more - args.days) === 1 ? more : others.find(builds);
  if (nearest != null) {
    last.refusal.suggestedDays = nearest;
    // Round 7 user audit (U7-10: "4 days a week works", and the 4-day week
    // then asked for 75-minute sessions): the length that day count needs.
    const then = at(nearest).report;
    last.refusal.suggestedLength = then.needsLengthChoice ? shortestLength(at, nearest, args.lengthMinutes, then.suggestedLength) : null;
  }
  return last;
}
