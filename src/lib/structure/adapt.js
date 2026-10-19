/**
 * adapt.js -- D222 phase 6: the structure engine's seam with the app.
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/23-PHASE6-INTEGRATION-SPEC.md
 * (lead rulings R60 to R66). Everything here is pure (no I/O) and deterministic:
 *   - R64: the person's profile inputs to the engine's arguments
 *     (structureArgs, focusFromWeakPoints);
 *   - R61, R66: the engine's week to the rows a plan is saved with, in the
 *     app's muscle keys (structureWorkoutsForWrite, structureCheckIds);
 *   - R60: the plan's facts: the version 2 fields every current reader uses,
 *     derived to carry the meaning plan/planner.js and
 *     planAutoGen.plannerV2PlanFacts give each one, plus the `structure` block
 *     that marks an engine plan (structureFacts);
 *   - R62: the sets and effort a structure plan serves live in ./serve.js,
 *     which imports nothing heavy (the serving path must stay light);
 *   - R65: what the preview and the schedule-fit review say (structurePreview,
 *     structureRefusal, structureFit), in the words of ./messages.js.
 */
import {
  PATTERNS, CREDIT_FRACTION, PROGRESSION, TIME_MODEL, LIGHT_DOSE, rulebookCategory, ARCHETYPES,
} from './rulebook';
import { checkPlan } from './checker';
import { senseCheck } from './sense';
import { planMessages, refusalText, optionLabel } from './messages';
import { VOLUME_LANDMARKS } from '../algorithms';
import { SESSION_CEILINGS } from '../plan/science';
import { SELECTION_REASON } from '../planEngine';
import { PLAN_FIT, durationLabel } from '../planFit';

// ── R64: inputs ────────────────────────────────────────────────────────────

/** The weak-point labels (coachingGoals.WEAK_POINT_MUSCLES) as engine muscles. */
export const FOCUS_LABEL_MAP = Object.freeze({
  'Chest': 'chest',
  'Upper Chest': 'chest',
  'Lats / Back Width': 'lats',
  'Back Thickness': 'upper_back',
  'Side Delts': 'side_delts',
  'Rear Delts': 'rear_delts',
  'Front Delts': 'front_delts',
  'Biceps': 'biceps',
  'Triceps': 'triceps',
  'Quads': 'quads',
  'Hamstrings': 'hamstrings',
  'Glutes': 'glute_max',
  'Adductors': 'adductors',
  'Calves': 'calves',
  'Core / Abs': 'abs',
  'Traps': 'traps',
});

/** The most focus picks handed to the engine (the pickers already cap at three). */
const FOCUS_PICKS = 3;

/**
 * The person's weak-point labels as engine focus muscles: mapped, de-duplicated
 * in pick order, at most three. An unknown label is left out.
 * @param {string[]} labels
 * @returns {string[]}
 */
export function focusFromWeakPoints(labels) {
  const out = [];
  for (const label of Array.isArray(labels) ? labels : []) {
    const m = FOCUS_LABEL_MAP[label];
    if (m && !out.includes(m)) out.push(m);
  }
  return out.slice(0, FOCUS_PICKS);
}

/** The profile's experience as the rulebook's: competitive trains as advanced. */
export function structureExperience(experience) {
  return experience === 'competitive' ? 'advanced' : experience;
}

/**
 * The engine's arguments from planAutoGen.buildPlanInputs' output (the goal is
 * already migrated there; the engine's rulebookCategory aliases the rest).
 * The library and the logged names are added by the caller.
 * @param {object} inputs  buildPlanInputs(profile)
 */
export function structureArgs(inputs) {
  return {
    goal: inputs.goal,
    days: inputs.daysPerWeek,
    lengthMinutes: inputs.sessionLengthMinutes,
    equipment: inputs.equipment,
    experience: structureExperience(inputs.experience),
    focus: focusFromWeakPoints(inputs.weakPoints),
    // Only a known training style is passed; the engine refuses an unknown one.
    ...(inputs.archetype && ARCHETYPES[inputs.archetype] ? { archetype: inputs.archetype } : {}),
  };
}

// The category in words, as the sign-off page heads it.
const CATEGORY_NAMES = Object.freeze({
  general: 'General', bodybuilding: 'Bodybuilding', classic_physique: 'Classic physique', mens_physique: "Men's physique",
  bikini: 'Bikini', wellness: 'Wellness', figure: 'Figure', womens_physique: "Women's physique",
  general_v_taper: 'V-taper', general_x_frame: 'X-frame', general_upper_density: 'Upper-body density',
  general_powerbuilder: 'Powerbuilder', general_minimalist: 'Minimalist',
});

/** The saved plan's name: its category and day count ("Bikini, 4 days a week"). */
export function structurePlanName(args) {
  const category = CATEGORY_NAMES[rulebookCategory(args.goal, args.archetype)] || 'Your plan';
  return `${category}, ${args.days} days a week`;
}

// ── R61: muscle keys ───────────────────────────────────────────────────────

const MERGED_KEYS = Object.freeze({
  lats: 'back', upper_back: 'back', glute_max: 'glutes', glute_med: 'glutes',
});

/**
 * The app's muscle key for an engine muscle (R61), or null where the app has
 * none (the muscle then lives only in `structure`).
 * @param {string} m
 * @returns {string|null}
 */
export function appMuscleOf(m) {
  const k = MERGED_KEYS[m] ?? m;
  return Object.prototype.hasOwnProperty.call(VOLUME_LANDMARKS, k) ? k : null;
}

// The muscle a set of the exercise counts for: its pattern's, as the checker
// counts it (measure.sessionLoad).
const engineMuscleOf = (ex) => (PATTERNS[ex.pattern] && PATTERNS[ex.pattern].muscle) || ex.muscle;

/**
 * The fractional credit one set of the exercise gives other muscles, in app
 * keys (the v2 slot `credits` meaning: catalogueCredits, 0.5 each). A credit to
 * the exercise's own app muscle (a row's lats credit is still "back") is left
 * out, as buildPlanSessions leaves a secondary equal to the primary out.
 */
export function appCreditsOf(ex) {
  const own = appMuscleOf(engineMuscleOf(ex));
  const out = {};
  for (const c of (PATTERNS[ex.pattern] && PATTERNS[ex.pattern].credits) || []) {
    const k = appMuscleOf(c);
    if (k && k !== own) out[k] = CREDIT_FRACTION;
  }
  return out;
}

// ── R66: the rows to save ──────────────────────────────────────────────────

/**
 * R64: every exercise must be a real library row. The engine names an
 * exercise by its name when the row it chose has no id; such a plan is never
 * saved. Throws (the caller logs it as 'structure.build' and fails calmly).
 * @param {object} plan  the engine's plan
 * @param {Array<object>} library  the library the engine built from
 */
export function structureCheckIds(plan, library) {
  const ids = new Set((Array.isArray(library) ? library : []).map((r) => r && r.id).filter((id) => id != null));
  for (const s of plan.sessions) {
    for (const ex of s.exercises) {
      if (ex.id == null || !ids.has(ex.id)) {
        throw new Error(`structure: "${ex.name}" has no library row to save`);
      }
    }
  }
}

/**
 * The selection reason a row is saved with: an EXISTING code (R66), the same
 * two the new planner uses (planAutoGen.plannerV2SelectionReason): a kit's
 * stand-in is the coverage fallback, every other choice covers a role the week
 * needs.
 */
export function structureSelectionReason(ex) {
  return ex.from === 'thin_kit' ? SELECTION_REASON.COVERAGE_FALLBACK : SELECTION_REASON.REQUIRED_ROLE;
}

/**
 * The engine's sessions in its order, each exercise shaped for the routine
 * writers (addExerciseToRoutine, database.rebuildPlanKeepingBlockV2): week 1's
 * sets, the engine's rep range and rest, and the slot model in app keys.
 * `thinEquipment` is the engine's sole-pattern allowance (a fifth set where the
 * kit has one pattern for the muscle), the meaning of v2's thin-equipment bonus.
 * @param {object} plan  the engine's plan
 */
export function structureWorkoutsForWrite(plan) {
  return plan.sessions.map((s) => ({
    name: s.name,
    sessionKey: s.key,
    exercises: s.exercises.map((ex) => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      name: ex.name,
      muscle: appMuscleOf(engineMuscleOf(ex)),
      kind: ex.kind,
      credits: appCreditsOf(ex),
      sets: ex.weeks[0].sets,
      repMin: ex.repRange[0],
      repMax: ex.repRange[1],
      restSec: ex.restSec,
      notes: null,
      selectionReason: structureSelectionReason(ex),
      thinEquipment: ex.solePattern === true,
    })),
  }));
}

// ── R60: the facts ─────────────────────────────────────────────────────────

/**
 * Each app muscle's direct sets in every block week (R61): the sum of the
 * week's sets of the exercises whose engine muscle maps to it, the meaning of
 * v2's `weeklyTargets` (planner buildBlock: a muscle's own slots' sets, week 1
 * to the recovery week). Also the planned_muscle_volume rows (R62).
 */
export function structureWeeklyTargets(plan) {
  const out = {};
  for (const s of plan.sessions) {
    for (const ex of s.exercises) {
      const k = appMuscleOf(engineMuscleOf(ex));
      if (!k) continue;
      if (!out[k]) out[k] = new Array(PROGRESSION.weeks).fill(0);
      ex.weeks.forEach((w, i) => { out[k][i] += w.sets; });
    }
  }
  return out;
}

/**
 * The plan's facts (R60): the version 2 fields, each derived to carry the
 * meaning the new planner gives it, plus `structure`.
 *
 *   version 2              kept at 2 on purpose: about 20 readers test it (R60)
 *   family                 'structure:<category>:<days>': v2's split-family key;
 *                          no reader branches on it
 *   roles                  app muscle -> 'focus' (a focus pick maps to it),
 *                          'standard' (rulebook tier P or S), 'maintenance' (M)
 *   weeklyTargets          structureWeeklyTargets (direct sets, weeks 1 to 6)
 *   exposureShares         app muscle -> routine -> its share of the muscle's
 *                          peak direct sets, for a muscle in 2 or more
 *                          sessions (planner buildBlock, same rule)
 *   sessionCaps            {}: no muscle has a lower cap than the defaults,
 *                          which equal the engine's (8 direct, 11 counted)
 *   lightCaps              app muscle -> routine -> LIGHT_DOSE.maxDirectSets
 *                          where that session's dose is the engine's next-day
 *                          light dose (no reader outside the planner)
 *   gapRanks               routine -> its rotation position: the engine has no
 *                          spacing model, and v2 ranks equal gaps by rotation
 *                          order, which gives exactly this
 *   thin                   routine -> exercise ids with the engine's
 *                          sole-pattern allowance (see structureWorkoutsForWrite)
 *   slots                  routine -> exercise id -> { muscle, kind, credits }
 *                          in app keys, the first occurrence (as v2)
 *   builtFactor            null: the engine reads no learned recovery factor;
 *                          null is what the reader (plannerV2Personalisation)
 *                          takes as "no reference"
 *   rirLadder              the engine's ladder (equal to BLOCK.rirLadder)
 *   readiness              null: the engine runs no recovery simulation, and
 *                          explain.js says nothing for a null readiness rather
 *                          than claim a percentage it never computed
 *   notes                  []: the planner's fix notes have no engine meaning
 *   limitedBy              {}: neutral; the focus outcome is said by messages.js
 *   recoverySafeMax        app muscle -> the most direct sets a week a check-in
 *                          may take it to: its peak direct sets plus the
 *                          smallest room any engine muscle behind it has below
 *                          its weekly maximum (counted towards the maximum as
 *                          the audit counts it, R34), never below the peak
 *   sessionMinutesAtPeak   routine -> the engine's reported minutes
 *   overTime               routine -> minutes past the chosen length, where
 *                          more than the tolerance (5), as v2
 *   overCeilings           routines past 8 exercises or 25 working sets at the
 *                          peak (SESSION_CEILINGS), as v2
 *
 * @param {{ plan: object, report: object }} result  a built buildStructurePlan result
 * @param {object} args  the engine's arguments
 * @param {object} ids
 * @param {string[]} ids.routineIds  the saved routine id of each session, in order
 * @param {Array<Array<?string>>} [ids.routineExerciseIds]  per session, the
 *        saved routine exercise id of each exercise, where known
 */
export function structureFacts(result, args, { routineIds, routineExerciseIds = null }) {
  const { plan, report } = result;
  const rid = (i) => routineIds[i];
  const reIds = Array.isArray(routineExerciseIds) ? routineExerciseIds : [];
  const compat = structureCompat(plan, {
    weekly: report.weekly || {}, minutes: report.minutes || [], lengthMinutes: args.lengthMinutes, routineIdOf: rid,
  });
  const c = checkPlan(plan);
  const sc = senseCheck(plan);
  const minutes = report.minutes || [];
  return {
    version: 2,
    family: `structure:${plan.category}:${plan.days}`,
    ...compat,
    structure: {
      version: 3,
      category: plan.category,
      days: plan.days,
      lengthMinutes: plan.lengthMinutes,
      equipment: plan.equipment,
      experience: plan.experience,
      focus: [...(plan.focus || [])],
      // D222 phase 7 (R70): everything else checkPlan and senseCheck read, so
      // the stored plan checks exactly as the built one (stored.planFromFacts).
      ...structurePlanData(plan),
      sessions: plan.sessions.map((s, i) => structureSession(s, rid(i), reIds[i])),
      checks: {
        ok: c.ok && sc.ok,
        faults: c.failures.map((f) => ({ code: f.code, detail: f.detail })),
        sense: sc.failures.map((f) => f.code),
      },
      report: {
        minutes: [...minutes],
        longestMinutes: report.longestMinutes,
        needsLengthChoice: report.needsLengthChoice === true,
        suggestedLength: report.suggestedLength ?? null,
        daysThatFit: report.daysThatFit ?? null,
        focusResults: report.focusResults || [],
        focusUntrainable: report.focusUntrainable || [],
        untrainableSets: report.untrainableSets || [],
        belowMinimum: report.belowMinimum || [],
        belowTypical: report.belowTypical || [],
        fewerSetsThan: report.fewerSetsThan ?? null,
        focusDropped: report.focusDropped || [],
      },
    },
  };
}

/**
 * D222 phase 7 (R70): the plan-level fields the checks read, as plain data.
 * `focusUnmet` keeps only what the sense check reads (the muscle) and why.
 */
export function structurePlanData(plan) {
  const offer = plan.kitOffer || { names: {}, patterns: {} };
  return {
    untrainable: [...(plan.untrainable || [])],
    kitLimited: [...(plan.kitLimited || [])],
    overflow: (plan.overflow || []).map((o) => ({ muscle: o.muscle, session: o.session, ...(o.reason ? { reason: o.reason } : {}) })),
    focusTargets: { ...(plan.focusTargets || {}) },
    focusUnmet: (plan.focusUnmet || []).map((f) => ({ muscle: f.muscle, ...(f.reason ? { reason: f.reason } : {}) })),
    kitOffer: {
      names: { ...(offer.names || {}) },
      patterns: Object.fromEntries(Object.entries(offer.patterns || {}).map(([m, list]) => [m, [...list]])),
    },
  };
}

/** D222 phase 7 (R70): one exercise of a session as the structure block stores it. */
export function structureExercise(ex, routineExerciseId = null) {
  return {
    routineExerciseId: routineExerciseId ?? ex.routineExerciseId ?? null,
    exerciseId: ex.id ?? ex.exerciseId,
    name: ex.name,
    muscle: engineMuscleOf(ex),
    pattern: ex.pattern,
    kind: ex.kind,
    peak: ex.peak,
    weeks: ex.weeks.map((w) => ({ sets: w.sets, rir: w.rir })),
    restSec: ex.restSec,
    repRange: [...ex.repRange],
    nextDayException: ex.nextDayException === true,
    solePattern: ex.solePattern === true,
    extraJoints: [...(ex.extraJoints || [])],
    ...(Array.isArray(ex.tags) && ex.tags.length ? { tags: [...ex.tags] } : {}),
  };
}

function structureSession(s, routineId, reIds) {
  return {
    routineId: routineId ?? s.routineId ?? null,
    key: s.key,
    name: s.name,
    exercises: s.exercises.map((ex, j) => structureExercise(ex, Array.isArray(reIds) ? (reIds[j] ?? null) : null)),
  };
}

/**
 * The version 2 fields every older reader uses, derived from a structure plan
 * (R60, R61), each in the meaning plan/planner.js and
 * planAutoGen.plannerV2PlanFacts give it (see structureFacts). One function for
 * the build (phase 6) and every change after it (phase 7, R72), so the two can
 * never disagree.
 * @param {object} plan  a structure plan (measure.js), its sessions in rotation order
 * @param {object} opts
 * @param {Object<string, {sets: number, tier: string, min: number, max: number}>} opts.weekly
 *        each engine muscle's counted sets at the peak and its targets (the engine's report.weekly)
 * @param {number[]} opts.minutes  each session's minutes at the peak
 * @param {number} opts.lengthMinutes  the chosen session length
 * @param {function(number): string} opts.routineIdOf  the routine id of session i
 */
export function structureCompat(plan, { weekly, minutes, lengthMinutes, routineIdOf }) {
  const rid = routineIdOf;
  const peakIndex = PROGRESSION.peakWeek - 1;

  const slots = {};
  const thin = {};
  const lightCaps = {};
  const perSession = {};
  const ownPeak = {};
  const ownPeakEngine = {};
  plan.sessions.forEach((s, i) => {
    const r = rid(i);
    slots[r] = slots[r] || {};
    for (const ex of s.exercises) {
      const m = engineMuscleOf(ex);
      const k = appMuscleOf(m);
      const peak = ex.weeks[peakIndex].sets;
      const id = ex.id ?? ex.exerciseId;
      ownPeakEngine[m] = (ownPeakEngine[m] || 0) + peak;
      if (!k) continue;
      if (!Object.prototype.hasOwnProperty.call(slots[r], id)) {
        slots[r][id] = { muscle: k, kind: ex.kind, credits: appCreditsOf(ex) };
      }
      if (ex.solePattern === true) (thin[r] = thin[r] || []).push(id);
      if (ex.nextDayException === true) (lightCaps[k] = lightCaps[k] || {})[r] = LIGHT_DOSE.maxDirectSets;
      perSession[k] = perSession[k] || {};
      perSession[k][r] = (perSession[k][r] || 0) + peak;
      ownPeak[k] = (ownPeak[k] || 0) + peak;
    }
  });

  const exposureShares = {};
  for (const [k, bySession] of Object.entries(perSession)) {
    const total = Object.values(bySession).reduce((a, b) => a + b, 0);
    if (Object.keys(bySession).length > 1 && total > 0) {
      exposureShares[k] = Object.fromEntries(Object.entries(bySession).map(([r, v]) => [r, v / total]));
    }
  }

  const roles = {};
  const RANK = { maintenance: 0, standard: 1, focus: 2 };
  for (const [m, v] of Object.entries(weekly)) {
    const k = appMuscleOf(m);
    if (!k) continue;
    const role = (plan.focus || []).includes(m) ? 'focus' : (v.tier === 'P' || v.tier === 'S') ? 'standard' : 'maintenance';
    if (!roles[k] || RANK[role] > RANK[roles[k]]) roles[k] = role;
  }

  // R34 (the renderer's own figure): credit counts towards the maximum only
  // up to the maximum less the minimum.
  const room = {};
  for (const [m, v] of Object.entries(weekly)) {
    const k = appMuscleOf(m);
    if (!k) continue;
    const own = ownPeakEngine[m] || 0;
    const towards = own + Math.min(Math.max(0, v.sets - own), Math.max(0, v.max - v.min));
    const free = Math.max(0, v.max - towards);
    room[k] = room[k] == null ? free : Math.min(room[k], free);
  }
  const recoverySafeMax = {};
  for (const [k, free] of Object.entries(room)) {
    const peak = ownPeak[k] || 0;
    recoverySafeMax[k] = Math.max(peak, Math.floor(peak + free));
  }

  const sessionMinutesAtPeak = {};
  const overTime = {};
  const overCeilings = [];
  plan.sessions.forEach((s, i) => {
    const r = rid(i);
    sessionMinutesAtPeak[r] = minutes[i];
    const over = Number.isFinite(lengthMinutes) ? minutes[i] - lengthMinutes : 0;
    if (over > TIME_MODEL.toleranceMinutes) overTime[r] = over;
    const setsAtPeak = s.exercises.reduce((t, ex) => t + ex.weeks[peakIndex].sets, 0);
    if (s.exercises.length > SESSION_CEILINGS.exercises || setsAtPeak > SESSION_CEILINGS.workingSets) overCeilings.push(r);
  });

  return {
    roles,
    weeklyTargets: structureWeeklyTargets(plan),
    exposureShares,
    sessionCaps: {},
    lightCaps,
    gapRanks: Object.fromEntries(plan.sessions.map((_, i) => [rid(i), i])),
    thin,
    slots,
    builtFactor: null,
    rirLadder: [...PROGRESSION.rirLadder],
    readiness: null,
    notes: [],
    limitedBy: {},
    sessionMinutesAtPeak,
    overTime,
    overCeilings,
    recoverySafeMax,
  };
}

// ── R65: what the person is told ───────────────────────────────────────────

// The audit page's own labels; the app never shows them (spec 23, review).
const AUDIT_LABEL = /^(Not built|Asks before saving): /;

/**
 * The app-facing form of one of messages.js's lines: the audit-page label
 * ("Not built: ", "Asks before saving: ") is dropped and the line starts with
 * a capital. messages.js itself stays verbatim for the audit page.
 * @param {string} line
 * @returns {string}
 */
export function appLine(line) {
  if (typeof line !== 'string') return line;
  const bare = line.replace(AUDIT_LABEL, '');
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

// What the person reads when a refusal has no plain sentence of its own.
export const REFUSAL_GENERIC = 'This plan could not be built with these choices. Try a different number of days or session length.';

/**
 * True for a refusal whose sentence messages.js builds in plain words (a
 * `sense_failed` refusal, worded from its failure code). Every other
 * refusal's `detail` is the engine's internal text and is never shown.
 */
function refusalIsPlain(refusal) {
  if (refusal?.reason === 'minimum_unreachable') return Array.isArray(refusal.muscles) && refusal.muscles.length > 0;
  return refusal?.reason === 'sense_failed' && Array.isArray(refusal.failures) && refusal.failures.length > 0;
}

/**
 * The app's sentence for a refused week: the plain reason (or the calm generic
 * line when the reason is internal), then the day count that builds.
 */
export function appRefusalText(refusal, args) {
  const head = refusalIsPlain(refusal) ? appLine(`${refusalText(refusal, args.days)}.`) : REFUSAL_GENERIC;
  const days = refusal.suggestedDays;
  const len = refusal.suggestedLength;
  return `${head}${days ? ` ${days} days a week builds${len ? `, with sessions of ${len} minutes` : ''}.` : ''}`;
}

/**
 * D228 item 5: what the person can do about a refused week, in order, as rows
 * a screen can draw. Pure.
 *   days       only with a suggested day count ("N days a week builds");
 *   length     only with a suggested session length;
 *   equipment  always ("Allow more equipment");
 *   avoided    only when the person has avoided movements (`avoidedCount`);
 *   manual     always ("Build it yourself").
 * @param {object} refusal  the engine's refusal (or structureRefusal's)
 * @param {{ avoidedCount?: number }} [opts]
 * @returns {Array<{ key: string, label: string, detail: string }>}
 */
export function refusalNextSteps(refusal, opts = {}) {
  const steps = [];
  const days = refusal?.suggestedDays;
  const len = refusal?.suggestedLength;
  if (days) {
    steps.push({
      key: 'days',
      label: `${days} days a week builds`,
      detail: len ? `With sessions of ${len} minutes.` : 'Use this number of days for your plan.',
    });
  }
  if (len) {
    steps.push({ key: 'length', label: `Sessions of ${len} minutes`, detail: 'This session length builds.' });
  }
  steps.push({
    key: 'equipment',
    label: 'Allow more equipment',
    detail: 'Your plan uses what you have ticked. More kit gives the builder more ways to reach every muscle.',
  });
  if (Number(opts.avoidedCount) > 0) {
    steps.push({
      key: 'avoided',
      label: 'Review avoided movements',
      detail: 'Movements you set aside are left out of your plan. Removing one gives the builder more to use.',
    });
  }
  steps.push({ key: 'manual', label: 'Build it yourself', detail: 'Pick your own exercises and sets in the plan builder.' });
  return steps;
}

/** R65: a refusal as the dry run and the fit review carry it. */
export function structureRefusal(refusal, args) {
  return {
    reason: refusal.reason,
    suggestedDays: refusal.suggestedDays ?? null,
    suggestedLength: refusal.suggestedLength ?? null,
    minimumDays: refusal.minimumDays ?? null,
    // D228 item 5: the muscles named (engine names, no counts) so a screen can read them.
    muscles: Array.isArray(refusal.muscles) ? refusal.muscles.map((m) => m.muscle) : [],
    text: appRefusalText(refusal, args),
    nextSteps: refusalNextSteps(refusal, { avoidedCount: args?.avoidedCount }),
  };
}

// ── R83: answerable choices ────────────────────────────────────────────────

const sameChange = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);

/**
 * R83: the engine's choices as data a control can offer. Each option is
 * { key, kind, change, label } where `change` is what the person's profile
 * takes ({ daysPerWeek?, sessionLengthMinutes?, dropFocus?: [engine muscle] })
 * and `kind` is
 *   'length'      a longer session (the length question);
 *   'days'        more days (the length question, a focus pick, a refusal);
 *   'drop_focus'  the same days without a focus pick that adds too little;
 *   'keep'        the plan as it is (change null): offered beside a question,
 *                 never for a refused week, which cannot be kept.
 * A week with no question and no refusal has no options (the confirm button
 * stands as it is). The same change offered twice is offered once.
 * @param {object} result  buildStructurePlan's result
 * @param {{ days: number, lengthMinutes: number }} args
 */
export function structureOptions(result, args) {
  const opts = [];
  const add = (o) => { if (!opts.some((x) => sameChange(x.change, o.change))) opts.push(o); };
  if (!result || !result.ok) {
    const r = result && result.refusal ? result.refusal : {};
    if (r.suggestedDays) {
      add({ kind: 'days', change: { daysPerWeek: r.suggestedDays, ...(r.suggestedLength ? { sessionLengthMinutes: r.suggestedLength } : {}) } });
    }
  } else {
    const rep = result.report || {};
    if (rep.needsLengthChoice) {
      if (rep.suggestedLength) add({ kind: 'length', change: { sessionLengthMinutes: rep.suggestedLength } });
      if (rep.daysThatFit) add({ kind: 'days', change: { daysPerWeek: rep.daysThatFit } });
    }
    for (const f of rep.focusChoice || []) {
      if (f.moreDays) add({ kind: 'days', change: { daysPerWeek: f.moreDays, ...(f.lengthThen ? { sessionLengthMinutes: f.lengthThen } : {}) } });
      add({ kind: 'drop_focus', change: { dropFocus: [f.muscle] }, muscle: f.muscle });
    }
    if (opts.length) add({ kind: 'keep', change: null });
  }
  return opts.map((o, i) => ({ ...o, key: `${o.kind}-${i}`, label: optionLabel(o, args) }));
}

/**
 * R83: the person's profile after they take one of the preview's choices.
 * The day count and the session length are set; a dropped focus pick removes
 * every weak-point label that maps to it (Chest and Upper Chest are both the
 * chest). 'keep' and an unknown option return the profile unchanged. Pure.
 * @param {object} profile  the profile the dry run was prepared with
 * @param {?{ change: ?object }} option
 */
export function profileWithOption(profile, option) {
  const c = option && option.change;
  if (!profile || !c) return profile;
  const next = { ...profile };
  if (Number.isFinite(c.daysPerWeek)) next.daysPerWeek = c.daysPerWeek;
  if (Number.isFinite(c.sessionLengthMinutes)) next.sessionLengthMinutes = c.sessionLengthMinutes;
  if (Array.isArray(c.dropFocus) && c.dropFocus.length) {
    const drop = new Set(c.dropFocus);
    next.planWeakPoints = (Array.isArray(profile.planWeakPoints) ? profile.planWeakPoints : [])
      .filter((label) => !drop.has(FOCUS_LABEL_MAP[label]));
  }
  return next;
}

/** R65: the dry run's `structure` block for a built week. */
export function structurePreview(result, args) {
  const rep = result.report;
  return {
    needsLengthChoice: rep.needsLengthChoice === true,
    suggestedLength: rep.suggestedLength ?? null,
    daysThatFit: rep.daysThatFit ?? null,
    focusQuestions: rep.focusChoice || [],
    messages: planMessages(result, args).map(appLine),
    // R83: the questions above as choices the person can take.
    options: structureOptions(result, args),
    // The real length (R65): the longest session at the peak, not the input.
    minutes: [...rep.minutes],
    longestMinutes: Math.round(Math.max(...rep.minutes)),
  };
}

// More time than this unused counts as plenty (planFit's HEADROOM_MIN).
const HEADROOM_MINUTES = 15;

/**
 * The fit state of one engine answer at a length: a refusal or a length
 * question needs the person's choice; otherwise the week fits, with plenty of
 * room where the longest session leaves 15 minutes unused. The engine never
 * starts work lighter for the clock (Q1 = C), so it has no "tighter fit".
 */
export function structureFitState(result, lengthMinutes) {
  if (!result || !result.ok || result.report.needsLengthChoice) return PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN;
  const longest = Math.max(0, ...result.report.minutes);
  return lengthMinutes && longest > 0 && lengthMinutes - longest >= HEADROOM_MINUTES
    ? PLAN_FIT.EXTRA_HEADROOM : PLAN_FIT.FULL_TARGET_FIT;
}

/**
 * R65: assessScheduleFit's answer from the engine, in the shape the fit
 * review (ProOnboardingScreen) and the preview (PlanPreviewSheet) render, plus
 * `refusal` and `messages`.
 * @param {object} result  buildStructurePlan at the person's schedule
 * @param {object} args    its arguments
 * @param {Array<{ minutes: number, result: object }>} byDuration  the engine at each offered length
 */
export function structureFit(result, args, byDuration = []) {
  const state = structureFitState(result, args.lengthMinutes);
  const alternatives = [];
  let refusal = null;
  let messages = [];
  let longest = 0;
  let typical = 0;
  if (result.ok) {
    const rep = result.report;
    longest = Math.max(0, ...rep.minutes);
    typical = rep.minutes.length ? Math.round(rep.minutes.reduce((a, b) => a + b, 0) / rep.minutes.length) : 0;
    messages = planMessages(result, args).map(appLine);
    if (rep.needsLengthChoice && rep.suggestedLength) {
      alternatives.push({ kind: 'longer_sessions', daysPerWeek: args.days, sessionLengthMinutes: rep.suggestedLength, state: PLAN_FIT.FULL_TARGET_FIT });
    }
    if (rep.needsLengthChoice && rep.daysThatFit) {
      alternatives.push({ kind: 'more_sessions', daysPerWeek: rep.daysThatFit, sessionLengthMinutes: args.lengthMinutes, state: PLAN_FIT.FULL_TARGET_FIT });
    }
  } else {
    refusal = structureRefusal(result.refusal, args);
    messages = [refusal.text];
    if (refusal.suggestedDays) {
      alternatives.push({
        kind: refusal.suggestedDays > args.days ? 'more_sessions' : 'fewer_sessions',
        daysPerWeek: refusal.suggestedDays,
        sessionLengthMinutes: refusal.suggestedLength || args.lengthMinutes,
        state: PLAN_FIT.FULL_TARGET_FIT,
      });
    }
  }
  return {
    state,
    // R83: the choices (the focus questions too, which the fit review asks
    // before the plan is saved), and the focus questions themselves.
    options: structureOptions(result, args),
    focusQuestions: result.ok ? (result.report.focusChoice || []) : [],
    daysPerWeek: args.days,
    sessionLengthMinutes: args.lengthMinutes,
    longestSessionMinutes: longest,
    typicalSessionMinutes: typical,
    alternatives,
    divisionCoverage: null,
    durations: byDuration.map(({ minutes, result: r }) => {
      const s = structureFitState(r, minutes);
      return { minutes, state: s, label: durationLabel(s) };
    }),
    refusal,
    messages,
  };
}
