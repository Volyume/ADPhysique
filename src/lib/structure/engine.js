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
 * HOW SETS ARE PLACED (S5). In three passes, each a round robin over the
 * muscles in priority order (P, then S, then M; focus first within a tier;
 * then the rulebook muscle order):
 *   A. every muscle up to its category minimum (09 s3), which is HARD: a
 *      muscle the kit can train that cannot reach it refuses the build;
 *   B. every muscle up to its normal volume (typical, scaled by experience),
 *      inside the hard limits, never by the clock (Q1 = C);
 *   C. focus picks up to typical + 4 (cap 20), last, so a focus pick can
 *      only take capacity no other muscle could use (C5).
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
  SESSION_LIMITS, REST_SECONDS, REP_RANGES, REST_TRIM_ORDER, TIME_MODEL,
  PROGRESSION, TEMPLATES, DAY_COUNTS, OPT_IN_MUSCLES, SIBLING_MUSCLES, CREDIT_FRACTION, rulebookCategory,
} from './rulebook';
import { structureChoices } from './patterns';
import { checkPlan, weeklyMax, weeklyMin } from './checker';
import { weeklyLoad, sessionMinutes } from './measure';

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
  const experience = EXPERIENCE[args.experience] ? args.experience : 'intermediate';
  const beginner = experience === 'beginner';
  const { focus, ignored: focusIgnored, dropped: focusDropped } = normaliseFocus(category, args.focus);

  // S1: the template, started where asked (a cyclic shift, never a reorder).
  const template = TEMPLATES[category][days];
  const start = ((args.startIndex || 0) % days + days) % days;
  const order = template.map((_, i) => template[(i + start) % days]);

  // S4 inputs: what the kit carries.
  const kit = structureChoices({ library: args.library, profile: equipment, loggedExerciseNames: args.loggedExerciseNames });
  const targets = weeklyTargets(category, days, experience, focus);

  const plan = {
    category, days, equipment, experience, focus: [],
    lengthMinutes: args.lengthMinutes,
    untrainable: kit.untrainable.filter((m) => targets[m]),
    sessions: order.map((t) => ({ key: t.key, name: t.name, exercises: [] })),
  };
  const n = plan.sessions.length;
  const lists = order.map((t) => [...t.muscles]);
  const overflow = [];
  const hintsOf = order.map((t) => t.hints || null);

  // A next-day muscle in a session whose next session also lists it must be
  // a light dose there (09 s4, R1): isolation only, at most 4 direct sets,
  // held at RIR 2 or more all block.
  const mustBeLight = lists.map((muscles, i) => new Set(muscles.filter((m) => FAST_MUSCLES.includes(m) && lists[(i + 1) % n].includes(m) && n > 1)));
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
      restSec: REST_SECONDS[choice.kind].default,
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
    for (const ex of own) {
      if (ex.peak < maxSetsFor(m)) out.push({ type: 'inc', m, si, ex, pattern: ex.pattern, sets: 1 });
    }
    if (s.exercises.length >= maxExercises || own.length >= exercisesPerMuscle(m)) return out;
    const v = visitsOf(m).indexOf(si);
    const inKit = (p) => (kit.byPattern[p] || []).length > 0;
    const { main, fallback } = patternsFor(category, m, tier, hintsOf[si]);
    const mainAvail = main.filter(inKit);
    const rotated = mainAvail.map((_, i) => mainAvail[(i + Math.max(0, v)) % mainAvail.length]);
    const usedPatterns = new Set(own.map((ex) => ex.pattern));
    let candidates = [
      ...rotated.filter((p) => !usedPatterns.has(p)),
      ...rotated.filter((p) => usedPatterns.has(p)),
      ...fallback.filter(inKit),
    ];
    if (light) candidates = candidates.filter((p) => PATTERNS[p].kind === 'isolation');
    const near = usedNear(si);
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
    const optionFor = (p) => {
      const names = kit.byPattern[p];
      // A maintenance muscle takes the least fatiguing name; otherwise the
      // names rotate by visit so two visits differ.
      const lowFatigue = tier === 'M' || (LOW_FATIGUE_NAMES[category] || []).includes(m);
      const ordered = lowFatigue
        ? [...names].sort((a, b) => (KIND_FATIGUE[a.kind] - KIND_FATIGUE[b.kind]))
        : names.map((_, i) => names[(i + Math.max(0, v)) % names.length]);
      const choices = ordered.filter((c) => !near.has(c.exerciseId || c.name));
      return choices.length ? { pattern: p, choices } : null;
    };
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
  const valueOf = (a, deficit) => {
    let closed = Math.min(deficit[a.m] || 0, a.sets);
    for (const c of PATTERNS[a.pattern].credits) closed += Math.min(deficit[c] || 0, CREDIT_FRACTION * a.sets);
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
  const overflowSession = (m) => {
    const listing = lists.map((l, i) => (l.includes(m) ? i : -1)).filter((i) => i >= 0);
    const near = new Set(listing.flatMap((i) => [i, (i + 1) % n, (i - 1 + n) % n]));
    const sets = (i) => plan.sessions[i].exercises.reduce((t, ex) => t + ex.peak, 0);
    const options = lists.map((l, i) => i)
      .filter((i) => !near.has(i) && lists[i].some((x) => (SIBLING_MUSCLES[m] || []).includes(x)))
      .sort((a, b) => (sets(a) - sets(b)) || (a - b));
    return options.length ? options[0] : null;
  };

  // Fill towards a goal per muscle: at each step the action that closes the
  // most shortfall per set; ties go to the muscle furthest from its goal,
  // then priority (P, S, M; focus; rulebook order), then the session with
  // the fewest of that muscle's sets, then the earlier session.
  const fill = (goalOf, muscles, { allowOverflow = false, allowRepair = true } = {}) => {
    const blocked = new Set();
    for (;;) {
      const weekly = weeklyLoad(plan, peak);
      const deficit = {};
      for (const m of muscles) deficit[m] = Math.max(0, goalOf(m) - ((weekly[m] || {}).fractional || 0));
      const wanting = muscles.filter((m) => deficit[m] > 0 && !blocked.has(m));
      if (!wanting.length) break;
      const actions = [];
      for (const m of wanting) for (const si of visitsOf(m)) actions.push(...actionsFor(m, si));
      const byValue = (a, b) => valueOf(b, deficit) - valueOf(a, deficit);
      const byNeed = (a, b) => (deficit[b.m] / goalOf(b.m)) - (deficit[a.m] / goalOf(a.m));
      const byRank = (a, b) => rank(a.m) - rank(b.m);
      // 'compact' fills an exercise before opening another, saving the
      // session's exercise slots for muscles that need their own.
      const byCompact = (a, b) => (a.type === 'inc' ? 0 : 1) - (b.type === 'inc' ? 0 : 1);
      const first = strategy.order === 'priority' ? [byRank, byValue, byNeed]
        : strategy.order === 'need' ? [byNeed, byValue, byRank]
          : strategy.order === 'compact' ? [byCompact, byValue, byNeed] : [byValue, byNeed, byRank];
      actions.sort((a, b) => first[0](a, b) || first[1](a, b) || first[2](a, b)
        || (directIn(a.si, a.m) - directIn(b.si, b.m))
        || (a.si - b.si)
        || ((a.type === 'inc' ? 0 : 1) - (b.type === 'inc' ? 0 : 1))
        || ((a.patternIndex || 0) - (b.patternIndex || 0)));
      let done = false;
      for (const a of actions) {
        if (valueOf(a, deficit) <= 0) break;
        if (apply(a)) { done = true; break; }
      }
      if (done) continue;
      // Nothing placeable: a muscle short of its minimum may take a further
      // session (R22); otherwise every wanting muscle is as full as it can be.
      let opened = false;
      if (allowOverflow) {
        for (const m of wanting) {
          const extra = overflowSession(m);
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
    if (allowRepair) repair(goalOf, muscles);
    const weekly = weeklyLoad(plan, peak);
    return muscles.filter((m) => ((weekly[m] || {}).fractional || 0) < goalOf(m));
  };
  const fractional = (m) => (weeklyLoad(plan, peak)[m] || { fractional: 0 }).fractional;

  // Repair: a muscle still short of its goal may take a set (or a two-set
  // exercise) that another exercise in one of its sessions can spare, when
  // every muscle that exercise counts for stays at or above its own goal.
  // The freed room is kept only if the short muscle then gains a set; so a
  // repair never leaves any muscle below its goal to pay for another.
  function repair(goalOf, muscles) {
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
          const donors = s.exercises
            .filter((ex) => ex.muscle !== m)
            .map((ex) => ({ ex, take: ex.peak > SESSION_LIMITS.setsPerExerciseMin ? 1 : ex.peak }))
            .filter(({ ex, take }) => fr(ex.muscle) - take >= goalAll(ex.muscle)
              && PATTERNS[ex.pattern].credits.every((c) => fr(c) - CREDIT_FRACTION * take >= goalAll(c)))
            .sort((a, b) => ((fr(b.ex.muscle) - goalAll(b.ex.muscle)) - (fr(a.ex.muscle) - goalAll(a.ex.muscle))) || (s.exercises.indexOf(a.ex) - s.exercises.indexOf(b.ex)));
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
            if (options.some((a) => valueOf(a, deficit) > 0 && apply(a))) { improved = true; break; }
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

  // A: minimums (HARD). B: normal volume (Q1 = C: never cut by the clock).
  // C: focus on top, last, so it only takes capacity no other muscle could
  // use (C5).
  const shortOfMinimum = fill((m) => targets[m].min, order2, { allowOverflow: true });
  if (shortOfMinimum.length) {
    return {
      ok: false,
      refusal: {
        reason: 'minimum_unreachable',
        muscles: shortOfMinimum.map((m) => ({ muscle: m, sets: fractional(m), minimum: targets[m].min })),
        detail: `${shortOfMinimum.join(', ')} cannot reach the category minimum at ${days} days within the safety limits`,
      },
    };
  }
  fill((m) => targets[m].typical, order2);
  plan.focus = focus;
  if (focus.length) fill((m) => targets[m].target, muscleOrder(category, focus).filter((m) => focus.includes(m) && !plan.untrainable.includes(m)), { allowRepair: false });

  // S7: order inside each session: heavy compounds, moderate compounds,
  // machines, isolation; then P before S before M; focus first in a tier.
  for (const s of plan.sessions) {
    s.exercises = s.exercises
      .map((ex, i) => ({ ex, i }))
      .sort((a, b) => (KIND_RANK[a.ex.kind] - KIND_RANK[b.ex.kind])
        || (TIER_RANK[tierOf(category, a.ex.muscle)] - TIER_RANK[tierOf(category, b.ex.muscle)])
        || (Number(focus.includes(b.ex.muscle)) - Number(focus.includes(a.ex.muscle)))
        || (MUSCLES.indexOf(a.ex.muscle) - MUSCLES.indexOf(b.ex.muscle))
        || (a.i - b.i))
      .map((x) => x.ex);
  }

  // S10: real length (Q1 = C). Shorten rest towards its floor, least
  // costly first, only as far as each session needs; still over by more
  // than the tolerance, the person chooses before saving.
  const length = Number.isFinite(args.lengthMinutes) ? args.lengthMinutes : null;
  let restTrimmed = false;
  if (length != null) {
    for (const s of plan.sessions) {
      for (const kind of REST_TRIM_ORDER) {
        while (sessionMinutes(s, peak, equipment) > length) {
          const exs = s.exercises.filter((ex) => ex.kind === kind && ex.restSec > REST_SECONDS[kind].floor);
          if (!exs.length) break;
          for (const ex of exs) ex.restSec = Math.max(REST_SECONDS[kind].floor, ex.restSec - 15);
          restTrimmed = true;
        }
      }
    }
  }
  const minutes = plan.sessions.map((s) => sessionMinutes(s, peak, equipment));
  plan.reportedMinutes = minutes.map((m) => Math.round(m * 10) / 10);
  plan.needsLengthChoice = length != null && minutes.some((m) => m > length + TIME_MODEL.toleranceMinutes);

  // S9: the whole block, every week, every check. A failing plan is never
  // returned as a plan.
  const check = checkPlan(plan);
  if (!check.ok) {
    return { ok: false, refusal: { reason: 'checks_failed', failures: check.failures, detail: 'the built plan failed the rulebook checks' } };
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
      suggestedLength: plan.needsLengthChoice ? TIME_MODEL.lengths.find((l) => l + TIME_MODEL.toleranceMinutes >= Math.max(...minutes)) ?? Math.ceil(Math.max(...minutes)) : null,
      belowTypical,
      untrainable: plan.untrainable,
      overflow,
      focusIgnored,
      focusDropped,
      warnings: check.warnings,
      weekly: Object.fromEntries(Object.entries(targets).map(([m, t]) => [m, { sets: weekly[m]?.fractional ?? 0, ...t }])),
    },
  };
}

// The ways the engine tries, in turn, when a week is tight. Exercise
// choice: by the credits a preferred pattern brings ('credit'), or strictly
// in the preference order ('preference'). Fill order: the most shortfall
// closed per set first; the priority muscles first; the muscle furthest
// from its goal first; each exercise filled before another is opened. The
// first that reaches every minimum is kept, so the result stays
// deterministic (C19).
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
    if (r.ok || r.refusal.reason !== 'minimum_unreachable') return r;
    last = r;
  }
  const more = DAY_COUNTS.filter((d) => d > args.days);
  for (const d of more) {
    const tried = STRATEGIES.some((strategy) => buildWith({ ...args, days: d }, strategy).ok);
    if (tried) { last.refusal.minimumDays = d; break; }
  }
  return last;
}
