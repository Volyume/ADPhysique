/**
 * authoredFacts.js -- building, re-keying and advancing the facts of an
 * AUTHORED plan (register D227; spec 01-SPEC.md A1 to A6, B1 to B3, C1, C2
 * and F1). The facts shape is documented in full in ./authored.js; this
 * module only writes it.
 *
 * Pure, no I/O, deterministic. The callers (seedRoutines, database's
 * copyPlanFromLibrary and activatePlanWithBlock) do the reading and writing.
 */
import { allocateExerciseVolume } from '../algorithms';
import {
  AUTHORED_KIND, appMuscleOf, authoredWeeklyTargets, authoredRirLadder, isAuthoredFacts,
} from './authored';
import { OFFSEASON_ALLAN } from './offseasonAllan';

/** Every authored definition, by its library plan name. */
export const AUTHORED_DEFINITIONS = Object.freeze({
  [OFFSEASON_ALLAN.name]: OFFSEASON_ALLAN,
});

/** The authored definition a library plan of this name carries, or null. */
export function authoredDefinitionFor(name) {
  return (typeof name === 'string' && Object.prototype.hasOwnProperty.call(AUTHORED_DEFINITIONS, name))
    ? AUTHORED_DEFINITIONS[name] : null;
}

const PLAN_KEYS = Object.freeze({ [OFFSEASON_ALLAN.name]: 'offseason_allan' });

// The fractional credit one set of the exercise gives other muscles, in app
// keys (buildPlanSessions' own derivation: the corpus secondaries at 0.5
// each, the exercise's own muscle left out).
function creditsOf(exercise, ownMuscle) {
  const out = {};
  for (const a of allocateExerciseVolume(exercise)) {
    if (a.role !== 'secondary' || !a.muscle || a.muscle === ownMuscle) continue;
    out[a.muscle] = (out[a.muscle] || 0) + a.sets;
  }
  return out;
}

// The slot `kind` a version 2 reader expects: prescribe and the caps only
// tell isolation from anything else, and every exercise here is a machine or
// a cable.
const v2KindOf = (kind) => (kind === 'isolation' ? 'isolation' : 'machine');

/**
 * The facts of an authored plan whose routines are already written (the
 * library programme at seed time, or a copy that arrived without facts).
 *
 * @param {object} def  the authored definition (./offseasonAllan.js)
 * @param {object} args
 * @param {Array<{routineId: string, rows: Array<{routineExerciseId: ?string, exerciseId: ?string}>}>} args.routines
 *        the plan's routines in session order, each with its rows in order
 * @param {Object<string, object>} args.exerciseByName  library rows by canonical name
 * @returns {{ facts: object, unresolved: string[] }}  unresolved lists every
 *          name (main, substitution or optional) with no library row
 */
export function buildAuthoredFacts(def, { routines, exerciseByName }) {
  const unresolved = [];
  const byName = exerciseByName || {};
  const resolve = (name) => {
    const row = byName[name];
    if (!row?.id) { unresolved.push(name); return null; }
    return row;
  };
  const list = Array.isArray(routines) ? routines : [];
  const sessions = def.sessions.map((s, i) => {
    const routine = list[i] || null;
    const rows = Array.isArray(routine?.rows) ? routine.rows : [];
    const taken = new Set();
    const exercises = s.exercises.map((e, j) => {
      const row = resolve(e.name);
      let k = row ? rows.findIndex((r, n) => !taken.has(n) && r?.exerciseId === row.id) : -1;
      if (k < 0 && rows[j] && !taken.has(j)) k = j;
      if (k >= 0) taken.add(k);
      return {
        key: e.key,
        routineExerciseId: k >= 0 ? (rows[k]?.routineExerciseId ?? null) : null,
        exerciseId: row?.id ?? null,
        name: e.name,
        muscle: e.muscle,
        appMuscle: appMuscleOf(e.muscle),
        kind: e.kind,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
        rest: e.rest,
        sets: { ...e.sets },
        cap: e.cap,
        perArm: e.perArm === true,
        subs: (e.subs || []).map((name) => ({ exerciseId: resolve(name)?.id ?? null, name })),
      };
    });
    return { key: s.key, name: s.name, routineId: routine?.routineId ?? null, exercises };
  });
  const optional = (def.optional || []).map((o) => ({ ...o, exerciseId: resolve(o.name)?.id ?? null }));

  const authored = {
    version: 1,
    planKey: PLAN_KEYS[def.name] || def.name,
    name: def.name,
    phases: JSON.parse(JSON.stringify(def.phases)),
    blocks: { first: [...def.blocks.first], later: [...def.blocks.later] },
    ceilings: JSON.parse(JSON.stringify(def.ceilings)),
    sessions,
    optional,
    raises: {},
    run: null,
  };

  // The version 2 compat fields (structure/adapt.js structureFacts' meanings).
  const slots = {};
  const growthBySession = {};
  const growth = {};
  sessions.forEach((s) => {
    const r = s.routineId;
    if (!r) return;
    slots[r] = slots[r] || {};
    for (const x of s.exercises) {
      const m = x.appMuscle;
      const entry = (exercise) => ({ muscle: m, kind: v2KindOf(x.kind), credits: creditsOf(exercise, m) });
      const main = x.exerciseId ? byName[x.name] : null;
      if (main && !Object.prototype.hasOwnProperty.call(slots[r], main.id)) slots[r][main.id] = entry(main);
      for (const sub of x.subs) {
        const row = sub.exerciseId ? byName[sub.name] : null;
        if (row && !Object.prototype.hasOwnProperty.call(slots[r], row.id)) slots[r][row.id] = entry(row);
      }
      growthBySession[m] = growthBySession[m] || {};
      growthBySession[m][r] = (growthBySession[m][r] || 0) + x.sets.growth;
      growth[m] = (growth[m] || 0) + x.sets.growth;
    }
  });
  const exposureShares = {};
  for (const [m, bySession] of Object.entries(growthBySession)) {
    const total = Object.values(bySession).reduce((a, b) => a + b, 0);
    if (Object.keys(bySession).length > 1 && total > 0) {
      exposureShares[m] = Object.fromEntries(Object.entries(bySession).map(([r, v]) => [r, v / total]));
    }
  }
  const FOCUS = new Set(['back', 'side_delts']);
  const roles = Object.fromEntries(Object.keys(growth).map((m) => [m, FOCUS.has(m) ? 'focus' : 'standard']));
  // The most a check-in may take each muscle to a week (D2 ceilings, in app
  // keys): back is the lats' ceiling plus the upper back's Growth sets.
  const weekly = def.ceilings?.weekly || {};
  const upperBackGrowth = sessions.flatMap((s) => s.exercises)
    .filter((x) => x.muscle === 'upper_back').reduce((a, x) => a + x.sets.growth, 0);
  const recoverySafeMax = {};
  for (const [m, g] of Object.entries(growth)) {
    let top = g;
    if (m === 'back' && Number.isFinite(weekly.lats)) top = Math.max(g, weekly.lats + upperBackGrowth);
    else if (Number.isFinite(weekly[m])) top = Math.max(g, weekly[m]);
    recoverySafeMax[m] = top;
  }

  const facts = {
    version: 2,
    kind: AUTHORED_KIND,
    family: `authored:${authored.planKey}`,
    roles,
    weeklyTargets: {},
    exposureShares,
    sessionCaps: JSON.parse(JSON.stringify(def.sessionCaps || {})),
    lightCaps: {},
    gapRanks: Object.fromEntries(sessions.filter((s) => s.routineId).map((s, i) => [s.routineId, i])),
    thin: {},
    slots,
    builtFactor: null,
    rirLadder: [],
    readiness: null,
    notes: [],
    limitedBy: {},
    sessionMinutesAtPeak: {},
    overTime: {},
    overCeilings: [],
    recoverySafeMax,
    authored,
  };
  facts.weeklyTargets = authoredWeeklyTargets(facts, 1);
  facts.rirLadder = authoredRirLadder(facts, 1);
  return { facts, unresolved };
}

const mapKeys = (obj, map) => (obj && typeof obj === 'object' && !Array.isArray(obj)
  ? Object.fromEntries(Object.entries(obj).map(([k, v]) => [map[k] ?? k, v]))
  : obj);

/**
 * C2: the facts a copy of an authored library plan carries, its routine and
 * routine exercise ids re-keyed to the copy's. A fresh copy starts unstarted
 * (no run) with no raises and nothing typed. Never mutates its input.
 *
 * @param {object} facts  the library programme's facts
 * @param {object} maps
 * @param {Object<string, string>} maps.routineIdMap          library routine id -> copy's
 * @param {Object<string, string>} maps.routineExerciseIdMap  library routine exercise id -> copy's
 */
export function rekeyAuthoredFacts(facts, { routineIdMap = {}, routineExerciseIdMap = {} } = {}) {
  if (!isAuthoredFacts(facts)) return facts;
  const copy = JSON.parse(JSON.stringify(facts));
  copy.slots = mapKeys(copy.slots, routineIdMap);
  copy.gapRanks = mapKeys(copy.gapRanks, routineIdMap);
  copy.thin = mapKeys(copy.thin, routineIdMap);
  copy.sessionMinutesAtPeak = mapKeys(copy.sessionMinutesAtPeak, routineIdMap);
  copy.overTime = mapKeys(copy.overTime, routineIdMap);
  copy.overCeilings = Array.isArray(copy.overCeilings) ? copy.overCeilings.map((r) => routineIdMap[r] ?? r) : [];
  copy.exposureShares = Object.fromEntries(Object.entries(copy.exposureShares || {})
    .map(([m, by]) => [m, mapKeys(by, routineIdMap)]));
  copy.lightCaps = Object.fromEntries(Object.entries(copy.lightCaps || {})
    .map(([m, by]) => [m, mapKeys(by, routineIdMap)]));
  delete copy.typed;
  for (const s of copy.authored.sessions) {
    if (s.routineId != null) s.routineId = routineIdMap[s.routineId] ?? null;
    for (const x of s.exercises) {
      if (x.routineExerciseId != null) x.routineExerciseId = routineExerciseIdMap[x.routineExerciseId] ?? null;
    }
  }
  copy.authored.raises = {};
  copy.authored.trims = {};
  delete copy.authored.legs;
  delete copy.authored.legsAnswer;
  copy.authored.run = null;
  copy.weeklyTargets = authoredWeeklyTargets(copy, 1);
  copy.rirLadder = authoredRirLadder(copy, 1);
  return copy;
}

/**
 * B1, B2: the block a new activation of this plan starts. The next block
 * when the block being replaced is this plan's own latest block (the plan
 * screen's next-block paths), else block 1 (a first activation, or coming
 * back to the plan after another).
 */
export function nextAuthoredBlockNumber(facts, priorActiveMesocycleId) {
  const run = facts?.authored?.run;
  if (priorActiveMesocycleId && run?.mesocycleId && run.mesocycleId === priorActiveMesocycleId) {
    const n = Number(run.block);
    return Number.isInteger(n) && n >= 1 ? n + 1 : 2;
  }
  return 1;
}

/**
 * The facts once block `blockNumber` has started as mesocycle `mesocycleId`:
 * the run records it, and weeklyTargets and rirLadder are the new block's.
 * Raises lane B applied are kept (B2: Growth carries on from the level
 * reached); a restart at block 1 clears them, so the plan starts at the ramp
 * again. Any schedule override (run.phases), a pull-back's trims and a legs
 * answer belong to their own block and are dropped. Never mutates its input.
 */
export function factsForAuthoredBlock(facts, { blockNumber, mesocycleId }) {
  if (!isAuthoredFacts(facts)) return facts;
  const next = JSON.parse(JSON.stringify(facts));
  const prior = next.authored.run && typeof next.authored.run === 'object' ? next.authored.run : {};
  const blocks = blockNumber > 1 && prior.blocks && typeof prior.blocks === 'object' ? { ...prior.blocks } : {};
  if (mesocycleId) blocks[mesocycleId] = blockNumber;
  next.authored.run = { block: blockNumber, mesocycleId: mesocycleId ?? null, blocks };
  if (blockNumber <= 1) {
    next.authored.raises = {};
    delete next.authored.legs;
  }
  // Lane B (spec D3): a pull-back's trims belong to the block they were
  // applied in; the next block starts from the level its raises reached.
  next.authored.trims = {};
  delete next.authored.legsAnswer;
  next.weeklyTargets = authoredWeeklyTargets(next, blockNumber);
  next.rirLadder = authoredRirLadder(next, blockNumber);
  return next;
}
