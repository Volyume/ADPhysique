/**
 * CC30 GATE - the section 31 six-week contamination replay (Audit E
 * section Q5 as a fixture; ARCHITECTURE sections 7, 33.4, CC-D17).
 *
 * REAL database (full init path), REAL runner, REAL engine modules. A
 * user trains a six-week block under a whole-block shoulder episode
 * (no-overhead) while training legs normally, with a standing BASELINE
 * rule active throughout. Proves the shield end to end:
 *
 *  1. the affected muscle's ledger entry is stamped
 *     eligibility:'constrained' and judged INSUFFICIENT-like with the
 *     capability signal - it judges nothing and proposes a hold;
 *  2. the unaffected muscle is stamped 'normal' and judged on its own
 *     evidence - unaffected learning still occurs;
 *  3. the BASELINE rule constrains nothing (CAP-1: baseline is the
 *     user's normal and keeps learning);
 *  4. the learned fold and seed history skip the constrained entry
 *     (teaches nothing) while the stored record keeps it (erases
 *     nothing);
 *  5. adapted-landmark history excludes the affected muscle's sessions
 *     during the episode and keeps the unaffected muscle's;
 *  6. CC-D17 restamp: a BACKDATED episode arriving after computation
 *     flips only the eligibility stamp on the frozen ledger - the
 *     classification, proposal, observed numbers and rationale stay
 *     byte-identical;
 *  7. after the episode ends, a later window marks nothing constrained -
 *     durable learning resumes.
 */
jest.mock('../dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const adapt = {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) };
    },
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../sync', () => ({ scheduleSync: () => {} }));
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    getItem: async (k) => (store.has(k) ? store.get(k) : null),
    setItem: async (k, v) => { store.set(k, String(v)); },
    removeItem: async (k) => { store.delete(k); },
  };
});

const {
  db, insertExerciseWithId, createCapabilityConstraints, endCapabilityConstraint,
  getAllMesocyclesForUser, getAdaptiveLandmarkHistory,
} = require('../database');
const { computeAndStoreBlockLedger, restampLedgerEligibility } = require('../blockLedgerRunner');
const { computeLearnedRange } = require('../learnedRange');
const { priorLedgerEntries } = require('../blockLedgerGather');
const { constrainedMusclesInWindow, REINTRODUCTION_CARRY_MS } = require('../capability/eligibility');
const { _resetCapabilityResolveCache } = require('../capability/resolve');

const USER = 'u-replay';
const DAY = 86400000;
const WEEK = 7 * DAY;
// The block: six weeks, finished ~2 weeks ago so the runner judges it.
const NOW = Date.now();
const BLOCK_START = NOW - 8 * WEEK;
const BLOCK_WEEKS = 6;
const BLOCK_END = BLOCK_START + BLOCK_WEEKS * WEEK;

const OHP = {
  name: 'Replay Overhead Press', primaryMuscle: 'front_delts', equipment: 'barbell',
  movementPattern: 'vertical_push', compoundIsolation: 'compound',
  position: 'standing', gripDemand: 'bar', overheadPosition: true, floorAccess: false,
  bilateralUpper: true, bilateralLower: false, axialLoad: true, impact: false,
  unilateralLoadable: false, balanceDemand: 'stable',
};
const SQUAT = {
  name: 'Replay Squat', primaryMuscle: 'quads', equipment: 'barbell',
  movementPattern: 'squat', compoundIsolation: 'compound',
  position: 'standing', gripDemand: 'bar', overheadPosition: false, floorAccess: false,
  bilateralUpper: true, bilateralLower: true, axialLoad: true, impact: false,
  unilateralLoadable: false, balanceDemand: 'stable',
};

let episodeId = null;

beforeAll(async () => {
  await db();
  const d = await db();
  await insertExerciseWithId('rp-ohp', { ...OHP, isCustom: false });
  await insertExerciseWithId('rp-squat', { ...SQUAT, isCustom: false });

  // The finished six-week mesocycle with per-week planned volume for both
  // muscles (front_delts 8, quads 12 per accumulation week).
  await d.runAsync(
    `INSERT INTO mesocycles (id, user_id, name, start_date, duration_weeks, planned_weeks,
       deload_week, is_active, created_at, updated_at)
     VALUES ('meso1', ?, 'Replay block', ?, ?, ?, ?, 0, ?, ?)`,
    [USER, new Date(BLOCK_START).toISOString(), BLOCK_WEEKS, BLOCK_WEEKS, BLOCK_WEEKS, BLOCK_START, BLOCK_START],
  );
  for (let w = 1; w <= BLOCK_WEEKS; w += 1) {
    await d.runAsync(
      `INSERT INTO mesocycle_weeks (id, mesocycle_id, week_index, is_deload, rir_target, created_at)
       VALUES (?, 'meso1', ?, ?, 2, ?)`,
      [`mw${w}`, w, w === BLOCK_WEEKS ? 1 : 0, BLOCK_START],
    );
    for (const [muscle, sets] of [['front_delts', 8], ['quads', 12]]) {
      await d.runAsync(
        `INSERT INTO planned_muscle_volume (id, mesocycle_week_id, muscle, planned_sets,
           mev, mav, mrv, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, 4, 10, 16, 'template', ?, ?)`,
        [`pmv${w}${muscle}`, `mw${w}`, muscle, sets, BLOCK_START, BLOCK_START],
      );
    }
  }

  // Six weeks of training: two sessions a week, both muscles, full
  // feedback (pump/soreness), rising reps so quads can be judged.
  let n = 0;
  for (let w = 0; w < BLOCK_WEEKS; w += 1) {
    for (const dayOffset of [1, 4]) {
      n += 1;
      const at = BLOCK_START + w * WEEK + dayOffset * DAY;
      const wid = `rw${n}`;
      await d.runAsync(
        `INSERT INTO workouts (id, user_id, mesocycle_id, started_at, is_completed,
           overall_pump, soreness_24h_before, joint_discomfort, created_at, updated_at)
         VALUES (?, ?, 'meso1', ?, 1, 3, 1, 0, ?, ?)`,
        [wid, USER, at, at, at],
      );
      for (const [exId, sets] of [['rp-ohp', 4], ['rp-squat', 6]]) {
        for (let s = 0; s < sets; s += 1) {
          await d.runAsync(
            `INSERT INTO workout_sets (id, user_id, workout_id, exercise_id, set_number,
               set_type, target_reps_min, actual_reps, weight, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'straight', 8, ?, ?, ?, ?)`,
            [`rs${n}-${exId}-${s}`, USER, wid, exId, s + 1, 8 + w, 100 + w * 2, at + s, at + s],
          );
        }
      }
    }
  }

  // The whole-block shoulder episode (no overhead), plus a standing
  // BASELINE rule active throughout (the user's normal - CAP-1).
  const ids = await createCapabilityConstraints(USER, [{
    role: 'episode', source: 'self', ruleKind: 'demand', ruleValue: 'overhead_position',
    startsAt: BLOCK_START - DAY, episodeGroupId: 'g-replay',
  }], { nowMs: BLOCK_START - DAY });
  episodeId = ids[0];
  await createCapabilityConstraints(USER, [{
    role: 'baseline', source: 'self', ruleKind: 'demand', ruleValue: 'standing',
    startsAt: BLOCK_START - 10 * DAY,
  }], { nowMs: BLOCK_START - 10 * DAY });
  _resetCapabilityResolveCache();
});

describe('the six-week constrained block cannot become the durable baseline', () => {
  let ledger = null;

  test('the ledger stamps the affected muscle constrained and judges nothing from it', async () => {
    ledger = await computeAndStoreBlockLedger(USER, 'meso1', { force: true, tier: 'pro' });
    expect(ledger).toBeTruthy();
    const delts = ledger.entries.find((e) => e.muscle === 'front_delts');
    expect(delts.eligibility).toBe('constrained');
    expect(delts.classification).toBe('INSUFFICIENT_DATA');
    expect(delts.evidence).toContainEqual({ signal: 'insufficient', value: 'capability' });
    expect(delts.rationale).toContain('temporary change');
  });

  test('the unaffected muscle is judged normally, and the baseline rule constrained nothing', async () => {
    const quads = ledger.entries.find((e) => e.muscle === 'quads');
    expect(quads.eligibility).toBe('normal');
    // The standing BASELINE rule matches BOTH fixture lifts; if baseline
    // rules leaked into scope, quads would be constrained too.
    expect(quads.classification).not.toBe('INSUFFICIENT_DATA');
  });

  test('the constrained entry teaches nothing: fold and seed history skip it, the record keeps it', async () => {
    const mesos = await getAllMesocyclesForUser(USER);
    const history = priorLedgerEntries(mesos, NOW, 'front_delts');
    expect(history).toHaveLength(0); // skipped as evidence...
    const stored = JSON.parse(mesos.find((m) => m.id === 'meso1').blockLedger);
    expect(stored.entries.find((e) => e.muscle === 'front_delts')).toBeTruthy(); // ...never erased
    expect(stored.capabilityWatermark).toBeGreaterThan(0);

    const learned = computeLearnedRange({
      prior: { mev: 4, mav: 10, mrv: 16 }, researchMev: 4,
      ledgerHistory: [stored.entries.find((e) => e.muscle === 'front_delts')],
      muscle: 'front_delts',
    });
    expect(learned.evidenceBlocks).toBe(0);

    // The unaffected muscle's entry IS evidence.
    expect(priorLedgerEntries(mesos, NOW, 'quads')).toHaveLength(1);
  });

  test('adapted-landmark history excludes the affected sessions and keeps the unaffected ones', async () => {
    const history = await getAdaptiveLandmarkHistory(USER);
    expect(history.some((e) => e.muscle === 'front_delts')).toBe(false);
    expect(history.filter((e) => e.muscle === 'quads').length).toBeGreaterThanOrEqual(3);
  });

  test('CC-D17 restamp: a backdated episode flips ONLY the eligibility stamp on a frozen ledger', async () => {
    // Freeze the current record, then a backdated quads-affecting episode
    // arrives (late sync). The restamp must mark quads constrained while
    // every judgement byte stays identical.
    const before = JSON.parse((await getAllMesocyclesForUser(USER)).find((m) => m.id === 'meso1').blockLedger);
    await createCapabilityConstraints(USER, [{
      role: 'episode', source: 'self', ruleKind: 'demand', ruleValue: 'axial_load',
      startsAt: BLOCK_START + WEEK, endsAt: BLOCK_START + 3 * WEEK, episodeGroupId: 'g-backdated',
    }], { nowMs: NOW });
    _resetCapabilityResolveCache();
    const { restamped } = await restampLedgerEligibility(USER);
    expect(restamped).toBe(1);
    const after = JSON.parse((await getAllMesocyclesForUser(USER)).find((m) => m.id === 'meso1').blockLedger);
    const quadsAfter = after.entries.find((e) => e.muscle === 'quads');
    expect(quadsAfter.eligibility).toBe('constrained');
    const quadsBefore = before.entries.find((e) => e.muscle === 'quads');
    for (const field of ['classification', 'confidence', 'observed', 'proposal', 'rationale', 'evidence']) {
      expect(quadsAfter[field]).toEqual(quadsBefore[field]);
    }
    expect(after.capabilityWatermark).toBeGreaterThanOrEqual(before.capabilityWatermark);
  });

  test('after the episodes end, learning resumes once the return carry passes - never as the durable baseline', async () => {
    await endCapabilityConstraint(USER, episodeId, 'user_ended', { nowMs: BLOCK_END + DAY });
    // The backdated axial episode carried only a PLANNED end; an episode
    // past its planned end but unconfirmed still applies (fail safe,
    // section 5.1), so it is CONFIRMED ended here too.
    const all = await require('../database').getCapabilityConstraints(USER);
    const axial = all.find((r) => r.role === 'episode' && r.ruleValue === 'axial_load');
    await endCapabilityConstraint(USER, axial.id, 'user_ended', { nowMs: BLOCK_END + DAY });
    _resetCapabilityResolveCache();
    const rows = await require('../database').getCapabilityConstraints(USER);
    const library = [{ id: 'rp-ohp', ...OHP }, { id: 'rp-squat', ...SQUAT }];
    // CC33 W2 (D112 §23.4 residual, audit T2-25): a window beginning
    // INSIDE the two-week reintroduction carry still stamps the released
    // muscles - the first sessions back are rebuilding capacity, and a
    // block boundary must not launder them into learning evidence.
    const inCarry = constrainedMusclesInWindow(rows, library, BLOCK_END + 2 * DAY, BLOCK_END + 2 * WEEK);
    expect(inCarry.size).toBeGreaterThan(0);
    // The suite's original law stands one carry later: the episodes can
    // never become the durable baseline. Beyond the carry, nothing is
    // constrained and durable learning resumes.
    const afterCarry = constrainedMusclesInWindow(
      rows, library,
      BLOCK_END + DAY + REINTRODUCTION_CARRY_MS + DAY,
      BLOCK_END + DAY + REINTRODUCTION_CARRY_MS + 2 * WEEK,
    );
    expect(afterCarry.size).toBe(0);
  });
});
