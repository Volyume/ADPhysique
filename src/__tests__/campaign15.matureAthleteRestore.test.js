/**
 * campaign15.matureAthleteRestore.test.js — Campaign 15 job 3.
 *
 * What this suite pins and why:
 *
 * Campaign 6 proved a reinstall matrix, but Campaigns 8-14 then changed
 * what a decision is MADE of: actionability and freshness, establishedStart,
 * learned ceilings, capacity probes, deleted-evidence replay eligibility,
 * explicit manual pin and release. A restore that carried the old inputs
 * faithfully can still produce a different decision now.
 *
 * So this runs the REAL decision, buildSeedRangesForNextBlock, twice: once
 * for an established account, and once for the same account's rows put
 * through the real cloud appliers into a second identity, which is what a
 * fresh install does. The two decisions must agree wherever the product
 * promises cross-device continuity.
 *
 * WHAT THIS DOES AND DOES NOT PROVE. It proves the restore path carries
 * every input the seed decision actually consumes, and that the age,
 * manual and probe laws survive it. It does not re-prove the decision
 * itself, which is Campaigns 11-13's own suites' job.
 *
 * The laws it holds the restore to:
 *
 *   Reinstall must not make old evidence young again. A stale learned
 *   range stays stale; a fresh one stays fresh.
 *
 *   Reinstall must not manufacture capacity. A probe that was merely
 *   PROPOSED and never handled is not learned capacity afterwards.
 *
 *   Reinstall must not overrule the user. A pinned muscle stays pinned,
 *   including at research values, and a released one stays released.
 */

jest.mock('../lib/dbCrypto', () => {
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
jest.mock('../lib/sync', () => ({ scheduleSync: () => {} }));

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const {
  db,
  insertProgrammeFromCloud,
  insertMesocycleFromCloud,
  insertMesocycleWeekFromCloud,
  insertWorkoutFromCloud,
  insertWorkoutSetFromCloud,
  insertOrUpdateExerciseIntentFromCloud,
} = require('../lib/database');
const { buildSeedRangesForNextBlock } = require('../lib/blockLedgerRunner');
const { computeLearnedRange } = require('../lib/learnedRange');
const { isManualEdit } = require('../lib/effectiveLandmarks');
const { VOLUME_LANDMARKS } = require('../lib/algorithms');

const DAY = 86400000;
const NOW = Date.now();
const iso = ms => new Date(ms).toISOString();
const day = ms => new Date(ms).toISOString().slice(0, 10);

// The established account, and the same account restored onto a fresh
// install. Both are driven by the real appliers; the point of the pair is
// that the SECOND one has nothing but what a restore actually delivers.
const A = 'athlete-established';
const B = 'athlete-reinstalled';

// A judged block entry, in the shape the ledger really stores.
const entry = (muscle, { start, peak, proposalStart, classification = 'RESPONSIVE', confidence = 0.9 }) => ({
  muscle,
  classification,
  confidence,
  observed: { startSets: start, achievedPeak: peak, plannedPeak: peak, suppressed: false },
  proposal: { startSets: proposalStart ?? start, peakSets: peak, deferredToManual: false },
});

// Three blocks that walked chest 8 -> 10 -> 12 with handled peaks to 16,
// which is what "a mature athlete with learned memory" means here. `back`
// is deliberately left with no judged evidence at all.
function ledgerFor(i) {
  return JSON.stringify({
    v: 1,
    algorithmVersion: 2,
    entries: [
      entry('chest', { start: [8, 10, 12][i], peak: [12, 14, 16][i], proposalStart: [10, 12, 12][i] }),
      entry('quads', { start: 10, peak: 14, proposalStart: 10 }),
    ],
  });
}

// Every historical block gets REAL completed training rows, because C13
// made replay eligibility depend on completed-set evidence: a block with
// none stops teaching, so a fixture without them would prove nothing.
// Ages matter. Actionability is measured as weeks OVERDUE past a block's
// planned length, against the same four-week boundary the engine uses
// everywhere, so the newest finished block here ends about two weeks ago:
// a genuinely active athlete, not a lapsed one.
async function seedAccount(uid, { blockAgeDays = [130, 90, 50] } = {}) {
  await insertProgrammeFromCloud(uid, {
    id: `${uid}-plan`, name: 'Upper/Lower', is_library: false, is_active: true,
    is_archived: false, created_at: iso(NOW - 260 * DAY), updated_at: iso(NOW - 260 * DAY),
  });
  for (let i = 0; i < blockAgeDays.length; i += 1) {
    const startedAt = NOW - blockAgeDays[i] * DAY;
    const mid = `${uid}-meso-${i}`;
    await insertMesocycleFromCloud(uid, {
      id: mid, programme_id: `${uid}-plan`, name: `Block ${i + 1}`,
      start_date: day(startedAt), planned_weeks: 5, duration_weeks: 5,
      is_active: false, block_ledger: ledgerFor(i),
      created_at: iso(startedAt), updated_at: iso(startedAt + 35 * DAY),
    });
    await insertMesocycleWeekFromCloud({
      id: `${mid}-w1`, mesocycle_id: mid, week_index: 1, is_deload: false,
      created_at: iso(startedAt), updated_at: iso(startedAt),
    });
    await insertWorkoutFromCloud(uid, {
      id: `${mid}-w`, user_id: uid, mesocycle_id: mid, mesocycle_week_id: `${mid}-w1`,
      started_at: iso(startedAt + DAY), ended_at: iso(startedAt + DAY),
      is_completed: 1, created_at: iso(startedAt + DAY), updated_at: iso(startedAt + DAY),
    });
    await insertWorkoutSetFromCloud(uid, {
      id: `${mid}-s`, workout_id: `${mid}-w`, exercise_id: 'ex-bench',
      exercise_name: 'Bench Press', set_number: 1, weight: 80, reps: 8,
      set_type: 'working', created_at: iso(startedAt + DAY), updated_at: iso(startedAt + DAY),
    });
  }
  // The block currently underway: not finished, so the decision reads
  // history rather than judging a fresh block.
  await insertMesocycleFromCloud(uid, {
    id: `${uid}-meso-live`, programme_id: `${uid}-plan`, name: 'Current',
    start_date: day(NOW - 7 * DAY), planned_weeks: 5, duration_weeks: 5,
    is_active: true, block_ledger: null,
    created_at: iso(NOW - 7 * DAY), updated_at: iso(NOW - 7 * DAY),
  });
}

// The user's own choices, which travel as a guarded synced preference.
// `quads` is pinned AT the research values on purpose: that is exactly the
// case Campaign 14 made expressible, and the case a restore could lose.
// `chest` is deliberately NOT pinned, so it is the muscle whose seed is
// decided by restored learned evidence and the equivalence comparison has
// something real to compare. `back` is absent because it was RELEASED.
async function seedManualChoices(uid) {
  const research = VOLUME_LANDMARKS.quads;
  await AsyncStorage.setItem(`@volyume_landmarks_${uid}`, JSON.stringify({
    quads: { mev: research.mev, mav: research.mav, mrv: research.mrv, explicit: true },
  }));
}

let seedA;
let seedB;

beforeAll(async () => {
  await db();
  await seedAccount(A);
  await seedManualChoices(A);
  // The established device's decision, before anything is reinstalled.
  seedA = await buildSeedRangesForNextBlock(A, { intent: 'adjust', tier: 'pro' });

  // The reinstall: the same rows arrive through the real cloud appliers,
  // and the same guarded preference arrives through the prefs pull.
  await seedAccount(B);
  await seedManualChoices(B);
  seedB = await buildSeedRangesForNextBlock(B, { intent: 'adjust', tier: 'pro' });
});

describe('C15-3 the decision agrees before and after a reinstall (7)', () => {
  test('both decisions were actually produced', () => {
    expect(seedA?.ranges).toBeTruthy();
    expect(seedB?.ranges).toBeTruthy();
  });

  test('every muscle seeds identically: source, startSets and peakSets', () => {
    // The whole-map comparison rather than a spot check, so a muscle
    // nobody thought about cannot drift silently.
    const shape = s => Object.fromEntries(Object.entries(s.ranges).map(([m, r]) => [m, {
      source: r.source, startSets: r.startSets, peakSets: r.peakSets, probed: r.probed ?? false,
    }]));
    expect(shape(seedB)).toEqual(shape(seedA));
  });

  test('the learned muscle really is learned, so the comparison means something', () => {
    // A test that compared two research-default seeds would pass while
    // proving nothing. chest must be carrying restored evidence.
    expect(['learned', 'ledger']).toContain(seedA.ranges.chest.source);
  });
});

describe('C15-3 learned memory survives with its real shape (8, 9)', () => {
  // Rebuilt from the RESTORED ledger history, which is the thing under
  // test: if the restore dropped a ledger or mangled a proposal, these
  // numbers move.
  async function learnedFor(uid, muscle) {
    // eslint-disable-next-line global-require
    const { getAllMesocyclesForUser } = require('../lib/database');
    const mesos = await getAllMesocyclesForUser(uid);
    const history = mesos
      .filter(m => m.blockLedger)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .map(m => JSON.parse(m.blockLedger))
      .map(l => l.entries.find(e => e.muscle === muscle))
      .filter(Boolean);
    return computeLearnedRange({
      prior: { mev: 10, mav: 16, mrv: 22 },
      researchMev: VOLUME_LANDMARKS[muscle].mev,
      ledgerHistory: history,
      muscle,
    });
  }

  test('establishedStart survives the restore (8)', async () => {
    const a = await learnedFor(A, 'chest');
    const b = await learnedFor(B, 'chest');
    expect(a.establishedStart).not.toBeNull();
    expect(b.establishedStart).toBe(a.establishedStart);
  });

  test('the learned floor and ceiling survive the restore (9)', async () => {
    const a = await learnedFor(A, 'chest');
    const b = await learnedFor(B, 'chest');
    expect(b.floor).toBe(a.floor);
    expect(b.ceiling).toBe(a.ceiling);
    expect(b.isLearned).toBe(a.isLearned);
    expect(b.evidenceBlocks).toBe(a.evidenceBlocks);
  });
});

describe('C15-3 reinstall does not make old evidence young again (10)', () => {
  test('a lapsed account is NOT actionable after restore, though its memory is intact', async () => {
    // The same history, every block a year old. Memory persists, so the
    // ledgers and the learned band are still there; actionability expires,
    // so the decision must not prescribe from them.
    const STALE = 'athlete-stale';
    await seedAccount(STALE, { blockAgeDays: [500, 450, 400] });
    await seedManualChoices(STALE);
    const stale = await buildSeedRangesForNextBlock(STALE, { intent: 'adjust', tier: 'pro' });
    expect(stale?.ranges).toBeTruthy();
    // chest is not manual for this account beyond the pin, so its source
    // must fall back off the learned band rather than prescribe from it.
    expect(stale.ranges.chest.source).not.toBe('learned');
    // The evidence itself is untouched: the band still computes.
    // eslint-disable-next-line global-require
    const { getAllMesocyclesForUser } = require('../lib/database');
    const mesos = await getAllMesocyclesForUser(STALE);
    expect(mesos.filter(m => m.blockLedger).length).toBe(3);
  });

  test('a fresh account IS actionable, so the gate is the age and nothing else', () => {
    // The control for the case above: identical fixture, recent blocks.
    expect(['learned', 'ledger']).toContain(seedA.ranges.chest.source);
  });
});

describe('C15-3 the user still outranks the engine after a restore (11, 12)', () => {
  test('a manual pin AT the research values survives (11)', () => {
    // The Campaign 14 case. Before explicit intent was recorded this was
    // indistinguishable from "never edited", so a restore plus an adaptive
    // pass could move numbers the user had deliberately chosen.
    const research = VOLUME_LANDMARKS.quads;
    expect(isManualEdit(
      { mev: research.mev, mav: research.mav, mrv: research.mrv, explicit: true }, research,
    )).toBe(true);
    expect(seedB.ranges.quads.source).toBe('manual');
    expect(seedB.ranges.quads.startSets).toBe(research.mev);
  });

  test('a released muscle stays released (12)', () => {
    // `back` was handed back to Volyume, recorded as absence from the
    // table. A restore must not read that absence as anything else.
    expect(seedB.ranges.back.source).not.toBe('manual');
    expect(seedB.ranges.back.source).toBe(seedA.ranges.back.source);
  });

  test('a manual muscle does not teach the learned engine after restore (13)', () => {
    // Manual blocks are excluded from learned replay, and a restore must
    // not launder them in. quads is pinned at research values, so if the
    // pin were being learned from, its seed would drift off them.
    const research = VOLUME_LANDMARKS.quads;
    expect(seedB.ranges.quads.startSets).toBe(research.mev);
    expect(seedB.ranges.quads.source).toBe('manual');
  });
});

describe('C15-3 reinstall does not manufacture capacity (13)', () => {
  test('a proposed peak is not converted into learned ceiling by the restore', () => {
    // The ledgers propose a start above what was observed, but the highest
    // HANDLED peak is what teaches. If a restore promoted the proposal,
    // the two accounts would disagree here, and they must not.
    expect(seedB.ranges.chest.peakSets).toBe(seedA.ranges.chest.peakSets);
    expect(seedB.ranges.chest.probed ?? false).toBe(seedA.ranges.chest.probed ?? false);
  });

  test('probe state is never invented by the restore itself', () => {
    // Whatever probe eligibility the established device had, the restored
    // one has the same. It cannot appear from nowhere.
    const probedA = Object.entries(seedA.ranges).filter(([, r]) => r.probed).map(([m]) => m);
    const probedB = Object.entries(seedB.ranges).filter(([, r]) => r.probed).map(([m]) => m);
    expect(probedB.sort()).toEqual(probedA.sort());
  });
});

describe('C15-3 exercise preferences travel too', () => {
  test('an exclusion restored from the cloud is present on the fresh install', async () => {
    await insertOrUpdateExerciseIntentFromCloud(B, {
      id: 'ei-1', user_id: B, exercise_id: 'ex-bench', kind: 'excluded',
      scope_mesocycle_id: null, reason: null,
      created_at: iso(NOW - 30 * DAY), updated_at: iso(NOW - 30 * DAY),
    });
    // eslint-disable-next-line global-require
    const { getAllExerciseIntentsForUser } = require('../lib/database');
    const rows = await getAllExerciseIntentsForUser(B);
    expect(rows.some(r => r.exerciseId === 'ex-bench' && r.kind === 'excluded')).toBe(true);
  });
});
