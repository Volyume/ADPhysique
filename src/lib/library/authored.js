/**
 * authored.js -- the AUTHORED plan kind: a library plan whose sessions,
 * exercises, per-phase sets, effort, blocks and substitutions are written by
 * its author and served exactly as written (register D227 and addenda; build
 * spec docs/audit/offseason-allan-2026-10-12/01-SPEC.md sections A, B, C and
 * F1). The first and only authored plan is ./offseasonAllan.js.
 *
 * Pure, no I/O, deterministic. The serving path (sessionAdjustments) imports
 * this module, so it imports nothing heavy.
 *
 * ── THE AUTHORED FACTS SHAPE (programmes.plan_facts, JSON text) ────────────
 * One object carries everything; lane B (check-ins, progression, stall,
 * reduction triggers, the recovery exception) reads and writes the same shape.
 *
 *   version 2            kept at 2 on purpose: every current reader of plan
 *                        facts tests it (as structure/adapt.js does, R60)
 *   kind 'authored'      the marker every authored branch tests (isAuthoredFacts)
 *   family               'authored:<planKey>'
 *   -- the version 2 compat fields, derived as structure/adapt.js derives
 *      them, in the app's muscle keys (lats and upper back are 'back'):
 *   roles                app muscle -> 'focus' (back, side delts: the plan's
 *                        priorities) or 'standard'
 *   weeklyTargets        app muscle -> direct sets in each week of the
 *                        CURRENT block (8 weeks), from the authored ladder
 *   exposureShares       app muscle -> routine -> share of its Growth sets,
 *                        for a muscle in 2 or more sessions
 *   sessionCaps          the plan's per-session caps (C1): side delts 7
 *                        direct; back 10 direct, 12 counted; chest 10 direct
 *   lightCaps {}, thin {}, notes [], limitedBy {}, overTime {}, overCeilings []
 *   gapRanks             routine -> rotation position
 *   slots                routine -> exercise id -> { muscle, kind, credits },
 *                        for every main exercise AND every listed
 *                        substitution of the routine's slots, so a swap to a
 *                        listed substitution never moves sets to another muscle
 *   builtFactor null, readiness null
 *   rirLadder            the current block's week RIR ladder (A6)
 *   sessionMinutesAtPeak {}
 *   recoverySafeMax      app muscle -> the most direct sets a week a check-in
 *                        may take it to: back 26 (lats 20 + upper back 6),
 *                        side delts 22, quads 7, hamstrings 5, every other
 *                        muscle its Growth sets
 *   typed                routine exercise id -> a count the person typed
 *                        (recordTypedSetCount), served as typed (C1)
 *   -- the authored block:
 *   authored {
 *     version 1, planKey, name
 *     phases       phase -> { compound: [lo, hi], isolation: [lo, hi], weekRir }
 *     blocks       { first: [8 phases], later: [8 phases] }
 *     ceilings     { weekly: { lats 20, side_delts 22, quads 7, hamstrings 5 },
 *                    perSession: { lats 7, side_delts 7 } }   (lane B)
 *     sessions[]   { key, name, routineId, exercises[] }
 *       exercises[] { key, routineExerciseId, exerciseId, name, muscle
 *                     (engine: lats, upper_back, side_delts, ...), appMuscle,
 *                     kind ('compound'|'isolation'), repsMin, repsMax, rest,
 *                     sets { health, ramp1, ramp2, growth, reduction }, cap,
 *                     perArm, subs: [{ exerciseId, name }] }
 *     optional[]   the Growth-only trial(s), with exerciseId; never served
 *     raises       slot key -> extra Growth sets a week (lane B writes; block
 *                  2 carries them forward: B2 "from the level reached")
 *     trims        slot key -> sets a check-in's pull-back took off the
 *                  working weeks of the CURRENT block (lane B, D3), never
 *                  below the slot's Health sets; a new block clears them
 *     legs         { block } once the legs check-in (D4) added its sets in
 *                  that block; legsAnswer { block, weekIndex, answer } the
 *                  person's answer to the legs question for that week
 *     run          null until the plan's first block starts, then
 *                  { block: n, mesocycleId, blocks: { [mesocycleId]: n },
 *                    phases?: [8 phases] }   phases (optional, lane B: a hold
 *                  shifts the ramp) overrides the block's default schedule
 *   }
 */

export const AUTHORED_KIND = 'authored';

/** The app's muscle key for an authored muscle (lats and upper back are 'back'). */
export function appMuscleOf(muscle) {
  return muscle === 'lats' || muscle === 'upper_back' ? 'back' : muscle;
}

/** True for the facts of an authored plan. */
export function isAuthoredFacts(facts) {
  return facts?.kind === AUTHORED_KIND
    && facts?.authored != null && typeof facts.authored === 'object'
    && Array.isArray(facts.authored.sessions);
}

const BLOCK_WEEKS = 8;
const PHASES = new Set(['health', 'ramp1', 'ramp2', 'growth', 'reduction']);

/** The phase of every week of block `blockNumber` (1-based), 8 entries. */
export function authoredBlockPhases(facts, blockNumber) {
  const a = facts?.authored;
  const runPhases = a?.run?.phases;
  if (Array.isArray(runPhases) && runPhases.length === BLOCK_WEEKS && runPhases.every((p) => PHASES.has(p))
    && Number(a?.run?.block) === Number(blockNumber)) {
    return [...runPhases];
  }
  const list = Number(blockNumber) > 1 ? a?.blocks?.later : a?.blocks?.first;
  return Array.isArray(list) && list.length ? [...list] : [];
}

/**
 * The block a mesocycle is of this plan, 1-based: the run's record for that
 * mesocycle, else the run's current block, else 1 (a plan that has not
 * started a block yet serves block 1).
 */
export function authoredBlockNumber(facts, mesocycleId) {
  const run = facts?.authored?.run;
  const recorded = mesocycleId != null ? Number(run?.blocks?.[mesocycleId]) : NaN;
  if (Number.isInteger(recorded) && recorded >= 1) return recorded;
  const current = Number(run?.block);
  return Number.isInteger(current) && current >= 1 ? current : 1;
}

/**
 * The phase served in block week `weekIndex` (1-based). The recovery week
 * (mesocycle_weeks.is_deload, the block's planned week or an early reduction
 * the coach applied) is the reduction phase; a working week serves its own
 * phase, clamped to the block's last working week, never the reduction.
 */
export function authoredPhaseOf(facts, { blockNumber = 1, weekIndex, isDeload = false } = {}) {
  if (isDeload === true) return 'reduction';
  const phases = authoredBlockPhases(facts, blockNumber);
  const working = phases.filter((p) => p !== 'reduction');
  if (!working.length) return null;
  const i = Number.isInteger(weekIndex) && weekIndex >= 1 ? weekIndex : 1;
  const phase = phases[i - 1];
  return phase && phase !== 'reduction' ? phase : working[working.length - 1];
}

/**
 * The sets a slot is served in `phase`: the authored ladder's, plus any
 * raise lane B applied (Growth only), never above the slot's cap, less any
 * pull-back trim a check-in applied in this block (working weeks only, spec
 * D3), never below the slot's Health sets. The reduction week is always the
 * Reduction column as written.
 */
export function authoredSlotSets(facts, slot, phase) {
  const base = Number(slot?.sets?.[phase]);
  if (!Number.isFinite(base) || base < 1) return null;
  const raise = phase === 'growth' ? Number(facts?.authored?.raises?.[slot.key]) : 0;
  let total = base + (Number.isFinite(raise) && raise > 0 ? Math.round(raise) : 0);
  const cap = Number(slot?.cap);
  if (Number.isFinite(cap) && cap >= 1) total = Math.min(total, Math.max(cap, base));
  if (phase !== 'reduction') {
    const trim = Number(facts?.authored?.trims?.[slot.key]);
    if (Number.isFinite(trim) && trim > 0) {
      const health = Number(slot?.sets?.health);
      const floor = Number.isFinite(health) && health >= 1 ? Math.min(health, total) : 1;
      total = Math.max(floor, total - Math.round(trim));
    }
  }
  return total;
}

/** Every slot of the plan, in session order, with its session. */
function slotsOf(facts) {
  const out = [];
  for (const session of facts?.authored?.sessions ?? []) {
    for (const slot of Array.isArray(session?.exercises) ? session.exercises : []) out.push({ session, slot });
  }
  return out;
}

/**
 * Each app muscle's direct sets in every week of block `blockNumber` (8
 * entries): the planned_muscle_volume rows and facts.weeklyTargets (B3).
 */
export function authoredWeeklyTargets(facts, blockNumber = 1) {
  const phases = authoredBlockPhases(facts, blockNumber);
  const out = {};
  for (const { slot } of slotsOf(facts)) {
    const m = slot.appMuscle || appMuscleOf(slot.muscle);
    if (!m) continue;
    if (!out[m]) out[m] = new Array(phases.length).fill(0);
    phases.forEach((phase, i) => { out[m][i] += authoredSlotSets(facts, slot, phase) || 0; });
  }
  return out;
}

/** The same, per authored muscle (lats and upper back apart), for lane B's ceilings. */
export function authoredWeeklyByMuscle(facts, blockNumber = 1) {
  const phases = authoredBlockPhases(facts, blockNumber);
  const out = {};
  for (const { slot } of slotsOf(facts)) {
    if (!slot.muscle) continue;
    if (!out[slot.muscle]) out[slot.muscle] = new Array(phases.length).fill(0);
    phases.forEach((phase, i) => { out[slot.muscle][i] += authoredSlotSets(facts, slot, phase) || 0; });
  }
  return out;
}

/** The block's week RIR ladder (A6: each phase's compound lower bound). */
export function authoredRirLadder(facts, blockNumber = 1) {
  const phases = facts?.authored?.phases ?? {};
  return authoredBlockPhases(facts, blockNumber).map((p) => {
    const v = Number(phases?.[p]?.weekRir);
    return Number.isFinite(v) ? v : 2;
  });
}

/** The RIR range [lo, hi] a slot's kind works at in `phase` (A6). */
export function authoredRirRange(facts, kind, phase) {
  const r = facts?.authored?.phases?.[phase]?.[kind === 'isolation' ? 'isolation' : 'compound'];
  return Array.isArray(r) && r.length === 2 ? [...r] : null;
}

/**
 * The plain words for a slot's target effort in a phase (A6). The Growth
 * isolation line adds the document's one allowance: the last set may go to
 * failure.
 */
export function authoredEffortText(facts, kind, phase) {
  const r = authoredRirRange(facts, kind, phase);
  if (!r) return null;
  const [lo, hi] = r;
  const span = lo === hi ? `${lo}` : `${lo} to ${hi}`;
  const reps = lo === 1 && hi === 1 ? 'rep' : 'reps';
  if (phase === 'growth' && kind === 'isolation') {
    return `Stop ${span} ${reps} short. The last set may go to failure.`;
  }
  return `Stop ${span} ${reps} before you could not do another.`;
}

/**
 * C1: what an authored plan serves in a block week for today's rows. Each
 * row is matched to its slot by routine exercise id, else by exercise id
 * (the main exercise or a listed substitution) within the routine, in order.
 * A matched row is served the slot's sets for the week's phase, unless the
 * person typed a count for it (facts.typed wins, as today); a row with no
 * slot (added by hand later) is left to the caller. `rir` carries each
 * matched exercise's RIR range low end for the phase.
 *
 * @param {object} args
 * @param {object} args.facts
 * @param {string} args.routineId
 * @param {?string} [args.mesocycleId]  the week's block, for the block number
 * @param {number} args.weekIndex       the block week, 1-based
 * @param {boolean} [args.isDeload]     the week is the reduction week
 * @param {Array<{exerciseId: ?string, slotId: ?string}>} args.exercises
 * @returns {{ sets: Object<string, number>, rir: Object<string, number>, phase: ?string,
 *            slots: Object<string, string> }}  by exercise id; slots maps an
 *            exercise id to its slot key
 */
export function authoredServedWeek({
  facts, routineId, mesocycleId = null, weekIndex, isDeload = false, exercises, caps = null,
}) {
  const out = { sets: {}, rir: {}, phase: null, slots: {} };
  if (!isAuthoredFacts(facts) || !routineId) return out;
  const session = facts.authored.sessions.find((s) => s && s.routineId === routineId);
  if (!session) return out;
  const blockNumber = authoredBlockNumber(facts, mesocycleId);
  const phase = authoredPhaseOf(facts, { blockNumber, weekIndex, isDeload });
  if (!phase) return out;
  out.phase = phase;
  const list = Array.isArray(session.exercises) ? session.exercises : [];
  const typed = facts.typed != null && typeof facts.typed === 'object' && !Array.isArray(facts.typed) ? facts.typed : {};
  const rows = Array.isArray(exercises) ? exercises : [];
  // Lane B (lead ruling on the capability lane): a muscle the reintroduction
  // ramp is bringing back is served min(ladder, ramp level, typed if typed).
  const capped = authoredCappedSlotSets(facts, phase, caps);
  const taken = new Set();
  const match = new Map();
  rows.forEach((row, i) => {
    if (row?.slotId == null) return;
    const j = list.findIndex((x, k) => !taken.has(k) && x.routineExerciseId != null && x.routineExerciseId === row.slotId);
    if (j >= 0) { taken.add(j); match.set(i, j); }
  });
  const fits = (slot, exerciseId) => slot.exerciseId === exerciseId
    || (Array.isArray(slot.subs) && slot.subs.some((s) => s?.exerciseId === exerciseId));
  rows.forEach((row, i) => {
    if (match.has(i) || !row?.exerciseId) return;
    // A row whose routine exercise id is another slot's is not this one's.
    if (row.slotId != null && list.some((x) => x.routineExerciseId === row.slotId)) return;
    const j = list.findIndex((x, k) => !taken.has(k) && fits(x, row.exerciseId));
    if (j >= 0) { taken.add(j); match.set(i, j); }
  });
  for (const [i, j] of match) {
    const row = rows[i];
    const slot = list[j];
    if (!row.exerciseId) continue;
    out.slots[row.exerciseId] = slot.key;
    const t = row.slotId != null ? typed[row.slotId] : undefined;
    if (typeof t === 'number' && Number.isFinite(t) && t >= 1) out.sets[row.exerciseId] = t;
    else {
      const sets = authoredSlotSets(facts, slot, phase);
      if (sets != null) out.sets[row.exerciseId] = sets;
    }
    if (capped.has(slot.key) && out.sets[row.exerciseId] != null) {
      out.sets[row.exerciseId] = Math.min(out.sets[row.exerciseId], capped.get(slot.key));
    }
    const r = authoredRirRange(facts, slot.kind, phase);
    if (r) out.rir[row.exerciseId] = r[0];
  }
  // Spec H8: the optional trial, when the person added it to its own session
  // in a week of its phase, is served its written sets at its written effort
  // (2 sets, 2 or more reps in reserve). Never served unless added.
  const optional = authoredOptionalFor(facts, { routineId, phase });
  rows.forEach((row, i) => {
    if (match.has(i) || !row?.exerciseId) return;
    const o = optional.find((x) => x.exerciseId === row.exerciseId);
    if (!o) return;
    const t = row.slotId != null ? typed[row.slotId] : undefined;
    out.sets[row.exerciseId] = typeof t === 'number' && Number.isFinite(t) && t >= 1 ? t : o.sets;
    if (Number.isFinite(o.rirMin)) out.rir[row.exerciseId] = o.rirMin;
  });
  return out;
}

/**
 * Lane B (lead ruling: the capability lane on an authored plan): each slot's
 * sets in `phase` when an app muscle's week is capped (the reintroduction
 * ramp's level, `caps` app muscle -> direct sets a week). Over the cap, one
 * set at a time comes off the muscle's slot with the most sets (ties: the
 * last in plan order), never below 1 a slot. Only capped muscles' slots are
 * returned; an empty map when nothing is capped.
 *
 * @returns {Map<string, number>} slot key -> capped sets
 */
export function authoredCappedSlotSets(facts, phase, caps) {
  const out = new Map();
  if (!isAuthoredFacts(facts) || !phase || caps == null || typeof caps !== 'object') return out;
  const all = slotsOf(facts);
  for (const [muscle, rawCap] of Object.entries(caps)) {
    const cap = Number(rawCap);
    if (!Number.isFinite(cap) || cap < 0) continue;
    const mine = all.filter(({ slot }) => (slot.appMuscle || appMuscleOf(slot.muscle)) === muscle)
      .map(({ slot }) => ({ key: slot.key, n: authoredSlotSets(facts, slot, phase) || 0 }));
    if (!mine.length) continue;
    let total = mine.reduce((a, x) => a + x.n, 0);
    while (total > cap) {
      let best = -1;
      mine.forEach((x, i) => { if (x.n > 1 && (best < 0 || x.n >= mine[best].n)) best = i; });
      if (best < 0) break;
      mine[best].n -= 1;
      total -= 1;
    }
    for (const x of mine) out.set(x.key, x.n);
  }
  return out;
}

/**
 * Spec H8: the optional exercises the plan offers in this session in this
 * phase, through its own add list (marked optional, never served by
 * default): each { key, exerciseId, name, sets, rirMin }. Empty for a plan
 * that is not authored, another session, or another phase.
 */
export function authoredOptionalFor(facts, { routineId, phase } = {}) {
  if (!isAuthoredFacts(facts) || !routineId || !phase) return [];
  const session = facts.authored.sessions.find((s) => s && s.routineId === routineId);
  if (!session) return [];
  return (Array.isArray(facts.authored.optional) ? facts.authored.optional : [])
    .filter((o) => o?.exerciseId && o.phase === phase && (o.session == null || o.session === session.key))
    .map((o) => ({
      key: o.key, exerciseId: o.exerciseId, name: o.name, sets: Number(o.sets) || 2, rirMin: Number(o.rirMin),
    }));
}

// Spec H9: the plain nouns a session's exercises are called by, in the order
// they first appear, for the plan screen's weekly effort line.
const EFFORT_NOUNS = [
  [/pulldown|pullover/i, 'pulldowns'],
  [/row/i, 'rows'],
  [/squat|leg press/i, 'squats'],
  [/press/i, 'presses'],
  [/lateral raise/i, 'raises'],
  [/calf raise/i, 'calf raises'],
  [/curl/i, 'curls'],
  [/extension|pushdown/i, 'extensions'],
  [/fly|crossover|pec deck/i, 'flies'],
  [/crunch/i, 'crunches'],
];

function nounsOf(slots) {
  const out = [];
  for (const x of slots) {
    const hit = EFFORT_NOUNS.find(([re]) => re.test(String(x?.name ?? '')));
    if (hit && !out.includes(hit[1])) out.push(hit[1]);
  }
  return out;
}

const joinAnd = (list) => (list.length <= 1 ? list.join('')
  : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);

const spanOf = (r) => (r[0] === r[1] ? `${r[0]}` : `${r[0]} to ${r[1]}`);

/**
 * Spec H9 (A6): the session plan screen's one line with this week's target
 * effort, e.g. "This week: stop 1 to 2 reps short on pulldowns and rows; 0
 * to 1 on raises, flies, curls and crunches." Null for a plan that is not
 * authored or a routine that is not one of its sessions.
 */
export function authoredWeekEffortLine(facts, { routineId, phase } = {}) {
  if (!isAuthoredFacts(facts) || !routineId || !phase) return null;
  const session = facts.authored.sessions.find((s) => s && s.routineId === routineId);
  if (!session) return null;
  const list = Array.isArray(session.exercises) ? session.exercises : [];
  const c = authoredRirRange(facts, 'compound', phase);
  const i = authoredRirRange(facts, 'isolation', phase);
  if (!c || !i) return null;
  const compound = nounsOf(list.filter((x) => x.kind !== 'isolation'));
  const isolation = nounsOf(list.filter((x) => x.kind === 'isolation'));
  const parts = [];
  if (compound.length) parts.push(`stop ${spanOf(c)} reps short on ${joinAnd(compound)}`);
  if (isolation.length) {
    parts.push(compound.length
      ? `${spanOf(i)} on ${joinAnd(isolation)}`
      : `stop ${spanOf(i)} reps short on ${joinAnd(isolation)}`);
  }
  if (!parts.length) return null;
  const last = phase === 'growth' ? ' The last set of an isolation exercise may go to failure.' : '';
  return `This week: ${parts.join('; ')}.${last}`;
}

// ── F1: the closed exercise list ─────────────────────────────────────────

/** Every exercise id the plan may ever hold: main exercises, listed substitutions and the optional trial. */
export function authoredClosedIds(facts) {
  const out = new Set();
  if (!isAuthoredFacts(facts)) return out;
  for (const { slot } of slotsOf(facts)) {
    if (slot.exerciseId) out.add(slot.exerciseId);
    for (const s of Array.isArray(slot.subs) ? slot.subs : []) if (s?.exerciseId) out.add(s.exerciseId);
  }
  for (const o of Array.isArray(facts.authored.optional) ? facts.authored.optional : []) {
    if (o?.exerciseId) out.add(o.exerciseId);
  }
  return out;
}

/**
 * F1: the exercises that may stand in for `exerciseId` on this plan: every
 * slot it is the main exercise or a listed substitution of offers that
 * slot's main exercise and its listed substitutions (so a substitution can
 * always go back), never itself. `routineId` narrows to that session's
 * slots. An exercise in no slot (added by hand) may only be replaced from the
 * whole closed list. Null for a plan that is not authored (no restriction).
 *
 * @returns {?Set<string>}
 */
export function authoredSwapOptions(facts, exerciseId, { routineId = null, muscle } = {}) {
  if (!isAuthoredFacts(facts)) return null;
  const out = new Set();
  let inSlot = false;
  for (const { session, slot } of slotsOf(facts)) {
    if (routineId != null && session.routineId !== routineId) continue;
    const members = [slot.exerciseId, ...(Array.isArray(slot.subs) ? slot.subs.map((s) => s?.exerciseId) : [])].filter(Boolean);
    if (!members.includes(exerciseId)) continue;
    inSlot = true;
    for (const id of members) out.add(id);
  }
  if (!inSlot && routineId != null) return authoredSwapOptions(facts, exerciseId, { muscle });
  if (!inSlot && muscle !== undefined) {
    // Review fix 4: an exercise in no slot (added by hand) is offered only the
    // listed options of slots that train its muscle; none when no slot does.
    const app = muscle ? appMuscleOf(muscle) : null;
    const same = new Set();
    for (const { slot } of slotsOf(facts)) {
      if (!app || (slot.appMuscle || appMuscleOf(slot.muscle)) !== app) continue;
      for (const id of [slot.exerciseId, ...(Array.isArray(slot.subs) ? slot.subs.map((x) => x?.exerciseId) : [])]) {
        if (id) same.add(id);
      }
    }
    same.delete(exerciseId);
    return same;
  }
  const result = inSlot ? out : authoredClosedIds(facts);
  result.delete(exerciseId);
  return result;
}

/**
 * Review fix 4: whether a programme row's stored facts say it is an authored
 * plan. 'authored', 'other' (no facts, or facts of another kind) or 'unknown'
 * (the row could not be read, or its text cannot be parsed and does not name
 * the authored kind). A caller offers no swap options on 'authored' without
 * readable facts and on 'unknown' (fail closed).
 *
 * @param {?object} row  the programme row (camelCase) or null when none
 * @param {boolean} [readOk]  false when reading the row failed
 * @returns {'authored'|'other'|'unknown'}
 */
export function authoredPlanState(row, readOk = true) {
  if (!readOk) return 'unknown';
  if (row == null) return 'other';
  const raw = row.planFacts ?? row.plan_facts;
  if (raw == null || raw === '') return 'other';
  if (typeof raw === 'object') return raw?.kind === AUTHORED_KIND ? 'authored' : 'other';
  try {
    const parsed = JSON.parse(raw);
    return parsed?.kind === AUTHORED_KIND ? 'authored' : 'other';
  } catch (_) {
    return /"kind"\s*:\s*"authored"/.test(String(raw)) ? 'authored' : 'unknown';
  }
}

/**
 * F1: the substitute-scope predicate for an authored plan, in the shape
 * capability/effective.bestEligibleSubstitute calls it (candidate, original):
 * a candidate is in scope only when it is one of the original's listed
 * options. Null for a plan that is not authored.
 */
export function authoredSubstituteFilter(facts) {
  if (!isAuthoredFacts(facts)) return null;
  const closed = authoredClosedIds(facts);
  return (candidate, original) => {
    const id = candidate?.id;
    if (!id) return false;
    if (original?.id == null) return closed.has(id);
    const options = authoredSwapOptions(facts, original.id, { muscle: original.primaryMuscle ?? null });
    return !!options && options.has(id);
  };
}

/**
 * The most sets this plan ever serves an exercise in a slot (C1). Null when
 * the exercise is in no slot.
 */
export function authoredCapFor(facts, { routineExerciseId = null, exerciseId = null, routineId = null } = {}) {
  for (const { session, slot } of slotsOf(facts)) {
    if (routineId != null && session.routineId !== routineId) continue;
    if (routineExerciseId != null && slot.routineExerciseId === routineExerciseId) return slot.cap ?? null;
  }
  if (exerciseId == null) return null;
  for (const { session, slot } of slotsOf(facts)) {
    if (routineId != null && session.routineId !== routineId) continue;
    if (slot.exerciseId === exerciseId) return slot.cap ?? null;
  }
  return null;
}

/**
 * D219 design 4.11 for an authored plan (C1): the limits the session's own +1
 * stays inside, from the authored week rather than the house caps: the
 * slot's cap, the plan's session caps (else the house's), the muscle's week
 * as served, and its weekly ceiling (recoverySafeMax). Keyed by exercise id
 * in the shape computeSessionAdjustments reads; null when the routine is not
 * one of the plan's sessions.
 *
 * @param {object} args
 * @param {object} args.facts
 * @param {string} args.routineId
 * @param {?string} [args.mesocycleId]
 * @param {number} args.weekIndex
 * @param {boolean} [args.isDeload]
 * @param {Array<{routineExercise: object, exercise: object}>} args.exercises  today's rows
 * @param {{directCap: number, fractionalCap: number}} args.houseCaps
 */
export function authoredPlanLimits({
  facts, routineId, mesocycleId = null, weekIndex, isDeload = false, exercises, houseCaps, caps = null,
}) {
  if (!isAuthoredFacts(facts) || !routineId) return null;
  const session = facts.authored.sessions.find((s) => s && s.routineId === routineId);
  if (!session) return null;
  const blockNumber = authoredBlockNumber(facts, mesocycleId);
  const phase = authoredPhaseOf(facts, { blockNumber, weekIndex, isDeload });
  if (!phase) return null;
  const rows = (Array.isArray(exercises) ? exercises : []).map((e) => ({
    exerciseId: e?.exercise?.id ?? null, slotId: e?.routineExercise?.id ?? null,
  }));
  const today = authoredServedWeek({ facts, routineId, mesocycleId, weekIndex, isDeload, exercises: rows, caps });
  const slotByKey = new Map(session.exercises.map((x) => [x.key, x]));
  const sessionDirect = {};
  // The same sets per ENGINE muscle (lats and upper back apart), so the plan's
  // per-session ceiling (lats 7, side delts 7) binds a +1 on one of them.
  const sessionEngine = {};
  for (const [exerciseId, key] of Object.entries(today.slots)) {
    const sl = slotByKey.get(key);
    const m = sl?.appMuscle;
    if (m) sessionDirect[m] = (sessionDirect[m] || 0) + (today.sets[exerciseId] || 0);
    if (sl?.muscle) sessionEngine[sl.muscle] = (sessionEngine[sl.muscle] || 0) + (today.sets[exerciseId] || 0);
  }
  const week = {};
  for (const { slot } of slotsOf(facts)) {
    const m = slot.appMuscle || appMuscleOf(slot.muscle);
    week[m] = (week[m] || 0) + (authoredSlotSets(facts, slot, phase) || 0);
  }
  const capOf = (m, which, fallback) => {
    const v = facts.sessionCaps?.[m]?.[which];
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  const out = {};
  for (const [exerciseId, key] of Object.entries(today.slots)) {
    const slot = slotByKey.get(key);
    const m = slot?.appMuscle;
    if (!slot || !m) continue;
    const rampCap = caps != null ? Number(caps[m]) : NaN;
    const safe = Number(facts.recoverySafeMax?.[m]);
    // A muscle the reintroduction ramp holds never climbs past the ramp's level.
    const top = Number.isFinite(rampCap) ? Math.min(Number.isFinite(safe) ? safe : rampCap, rampCap) : safe;
    // Room left under the plan's per-session ceiling for this slot's ENGINE
    // muscle; the app-muscle caps are tightened to it, never loosened.
    const ceiling = Number(facts.authored?.ceilings?.perSession?.[slot.muscle]);
    const engineRoom = Number.isFinite(ceiling) ? ceiling - (sessionEngine[slot.muscle] || 0) : Infinity;
    const tighten = (cap) => Math.min(cap, (sessionDirect[m] || 0) + engineRoom);
    out[exerciseId] = {
      cap: Number.isFinite(slot.cap) ? slot.cap : 0,
      sessionDirect: sessionDirect[m] || 0,
      sessionDirectCap: tighten(capOf(m, 'direct', houseCaps?.directCap ?? 0)),
      sessionFractional: sessionDirect[m] || 0,
      sessionFractionalCap: tighten(capOf(m, 'fractional', houseCaps?.fractionalCap ?? 0)),
      weekFractional: Number.isFinite(rampCap) ? Math.min(week[m] || 0, rampCap) : (week[m] || 0),
      weekTop: Number.isFinite(top) ? top : (week[m] || 0),
    };
  }
  return out;
}

/**
 * The LIBRARY_PLANS entry for an authored definition (A1): the seed reads
 * name, description, tags, difficulty and workouts as for every library
 * plan; each exercise is stored with Ramp 1's sets (the plan starts at Ramp
 * 1, D227 addendum), its range, rest and notes. `authored` carries the
 * definition so the seed writes the plan's facts.
 */
export function authoredLibraryEntry(def) {
  return {
    name: def.name,
    description: def.description,
    tags: def.tags,
    difficulty: def.difficulty,
    authored: def,
    workouts: def.sessions.map((s) => ({
      name: s.name,
      exercises: s.exercises.map((e) => ({
        name: e.name,
        sets: e.sets.ramp1,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
        rest: e.rest,
        notes: e.notes,
      })),
    })),
  };
}
