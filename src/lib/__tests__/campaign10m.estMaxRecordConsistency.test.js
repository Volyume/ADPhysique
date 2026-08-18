/**
 * campaign10m.estMaxRecordConsistency.test.js — Campaign 10M.
 *
 * WHAT THIS CAMPAIGN FOUND. The defect it was commissioned to fix DOES NOT
 * EXIST, and the report that claimed it was mine (Campaign 10L's debt note,
 * item 1). I wrote that "personal_records rows written under the old formula
 * keep their stored inflated values" after seeing record_type strings like
 * '1rm_estimate' in the code. I did not check whether the table those
 * strings imply is ever actually written. It is not:
 *
 *   - there is NO local personal_records table. database.js never creates
 *     one, and its own comments say so at two separate read sites: "the
 *     historical personal_records table was never created locally; previous
 *     SQL silently caught and returned []".
 *   - it is NOT in the sync registry, so nothing pulls rows into the client.
 *   - the only surviving references are a cloud-side legacy table in
 *     schema.sql / setup_complete.sql (which CLAUDE.md records as STALE
 *     SNAPSHOTS, not canonical) and the account-deletion RPCs that sweep it.
 *   - no client code writes, reads or caches a numeric e1RM anywhere.
 *
 * Every user-visible Est. max is already derived at read time from raw
 * completed sets through the canonical calculate1RM. The authority chain the
 * campaign asks for is the chain that already runs:
 *
 *     raw set -> calculate1RM -> current Est. max / current record
 *
 * SO WHAT THIS SUITE IS FOR. That correctness is currently a property of how
 * the code happens to be written, not something any test defends. Nothing
 * would catch a future "optimisation" that persisted a computed e1RM and
 * started serving it. These pins turn the existing architecture into a
 * contract, and they exercise the campaign's required cases against it.
 *
 * NO production behaviour is changed by Campaign 10M, because there was no
 * stale authority to remove.
 */
import fs from 'fs';
import path from 'path';
import { calculate1RM, detectPR } from '../algorithms';
import { buildRecordLine } from '../workoutRecordLine';
import { pickBestLift } from '../bestLift';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ── There is no second source of truth to be stale ──────────────────────

describe('C10M: no persisted numeric Est. max exists anywhere in the client', () => {
  test('the local schema never creates a personal_records table', () => {
    const DB = read('lib/database.js');
    expect(DB).not.toMatch(/CREATE TABLE IF NOT EXISTS personal_records/);
    expect(DB).not.toMatch(/INSERT INTO personal_records/);
    expect(DB).not.toMatch(/UPDATE personal_records/);
    expect(DB).not.toMatch(/FROM personal_records/);
  });

  test('personal_records is not a synced table, so no cloud row can land', () => {
    expect(read('lib/sync/registry.js')).not.toMatch(/personal_records/);
    expect(stripComments(read('lib/sync.js'))).not.toMatch(/personal_records/);
  });

  test('the record READ paths derive from raw sets through calculate1RM', () => {
    const DB = read('lib/database.js');
    // Year of Lifts and Block Reflection both reduce raw sets themselves.
    const occurrences = DB.match(/record_type: '1rm_estimate',\n\s*value: parseFloat\(e1rm\.toFixed\(1\)\)/g) || [];
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
    expect(DB).toMatch(/const e1rm = calculate1RM\(s\.weight \|\| 0, s\.actual_reps \|\| 0\)/);
  });

  test('Exercise Detail computes its PRs from working sets, not a stored row', () => {
    const SRC = read('screens/ExerciseDetailScreen.js');
    expect(SRC).toMatch(/const est = calculate1RM\(s\.weight, s\.actualReps\)/);
    expect(SRC).toMatch(/record_type: '1rm_estimate', value: best1RMVal/);
    expect(stripComments(SRC)).not.toMatch(/personal_records/);
  });

  test('detectPR derives the bar from raw historical sets on every call', () => {
    const ALG = read('lib/algorithms.js');
    const fn = ALG.slice(ALG.indexOf('export function detectPR'));
    // Budget widened 700 -> 3800 for D107-2: the assisted-semantics branch
    // now precedes the best1RM derivation (an assistance number never feeds
    // a 1RM estimate, so that branch returns before this code). The law is
    // unchanged: the bar is derived from raw historical sets on every call,
    // never read from a persisted number.
    expect(fn.slice(0, 3800)).toMatch(/const best1RM = historicalSets\.reduce/);
    expect(fn.slice(0, 3800)).toMatch(/calculate1RM\(s\.weight \|\| 0, s\.actualReps \|\| s\.actual_reps \|\| 0\)/);
  });
});

// ── The concrete required case: old winner ceases to be current winner ──

describe('C10M: the current record is whatever the CURRENT model ranks first', () => {
  // A GENUINE rank flip needs different rep counts, because at equal reps
  // both models are monotone in load and can never disagree on order.
  //   A: 90 kg x 12 -> legacy 127.82 ("~128"), current 126.00 (>10, changed)
  //   B: 101 kg x 8 -> 126.92 under BOTH (<=10, untouched by 10L)
  // Legacy ranks A first; the current model ranks B first.
  const A = { weight: 90, actualReps: 12 };
  const B = { weight: 101, actualReps: 8 };
  const legacy = (w, r) => {
    const R = Math.min(r, 20);
    const e = w * (1 + R / 30);
    const b = w / (1.0278 - 0.0278 * R);
    return R <= 10 ? e * 0.6 + b * 0.4 : (e + b) / 2;
  };

  test('A used to out-rank B and no longer does', () => {
    expect(legacy(90, 12)).toBeCloseTo(127.82, 1);   // the old ~128
    expect(calculate1RM(90, 12)).toBeCloseTo(126.0, 6);
    expect(calculate1RM(101, 8)).toBeCloseTo(legacy(101, 8), 10); // <=10: unchanged
    // The order really does flip between the two models.
    expect(legacy(A.weight, A.actualReps)).toBeGreaterThan(legacy(B.weight, B.actualReps));
    expect(calculate1RM(B.weight, B.actualReps)).toBeGreaterThan(calculate1RM(A.weight, A.actualReps));
  });

  test('every derivation over the same raw history agrees on B', () => {
    const history = [A, B];
    // 1. The all-time best, the way Exercise Detail computes it.
    const best = history.reduce((acc, s) => {
      const est = calculate1RM(s.weight, s.actualReps);
      return est > acc.est ? { est, set: s } : acc;
    }, { est: 0, set: null });
    expect(best.set).toBe(B);
    expect(best.est).toBeCloseTo(126.92, 2);

    // 2. The featured best lift.
    const sets = [
      { exerciseId: 'a', exerciseName: 'Set A', weight: A.weight, reps: A.actualReps },
      { exerciseId: 'b', exerciseName: 'Set B', weight: B.weight, reps: B.actualReps },
    ];
    expect(pickBestLift(sets, new Map()).exerciseName).toBe('Set B');

    // 3. The live record line's bar to beat: re-logging A is no longer a
    //    record, because B now holds the current Est. max.
    const line = buildRecordLine({
      historySets: history, units: 'kg', exerciseType: 'weight_reps',
      weight: 90, reps: 12,
    });
    expect(line.isRecord).toBe(false);
  });
});

// ── A stale legacy number cannot block a legitimate new PR ──────────────

describe('C10M: nothing can hold an artificially high bar against a new PR', () => {
  // The campaign's stated case: a legacy stored value of 155.3, the same raw
  // set reading 148.5 today, and a new set at 151.
  const RAW_OLD = { weight: 99, actualReps: 15 };   // legacy 155.3, current 148.5
  const NEW_SET = { weight: 100.67, actualReps: 15 }; // current ~151.0

  test('the old set reads 148.5 today, not its legacy 155.3', () => {
    const legacy = (99 * (1 + 15 / 30) + 99 / (1.0278 - 0.0278 * 15)) / 2;
    expect(legacy).toBeCloseTo(155.29, 1);
    expect(calculate1RM(99, 15)).toBeCloseTo(148.5, 6);
  });

  test('the new set clears the bar because the bar is recomputed, not remembered', () => {
    expect(calculate1RM(NEW_SET.weight, NEW_SET.actualReps)).toBeCloseTo(151.0, 1);
    const pr = detectPR(NEW_SET, [RAW_OLD]).find((p) => p.type === '1rm_estimate');
    expect(pr).not.toBeNull();
    expect(pr.previousValue).toBeCloseTo(148.5, 6); // the RAW-derived bar
    // Had the legacy 155.3 survived as authority, 151 would have been refused.
    expect(pr.value).toBeLessThan(155.29);
  });
});

// ── Raw-fact record types are untouched ─────────────────────────────────

describe('C10M: heaviest_weight and most_reps are raw facts and unchanged', () => {
  const HISTORY = [
    { weight: 120, actualReps: 3 },
    { weight: 90, actualReps: 12 },
    { weight: 100, actualReps: 15 },
  ];

  test('the heaviest set is the heaviest set, whatever the estimator says', () => {
    const heaviest = HISTORY.reduce((h, s) => (!h || s.weight > h.weight ? s : h), null);
    expect(heaviest.weight).toBe(120);
    const pr = detectPR({ weight: 125, actualReps: 3 }, HISTORY).find((p) => p.type === 'heaviest_weight');
    expect(pr).not.toBeNull();
    expect(pr.value).toBe(125);
  });

  test('most reps AT A WEIGHT is a raw count, not an estimate', () => {
    // The type is most_reps_at_weight and it needs a prior set at the same
    // load: 100 kg x 15 exists, so 100 kg x 16 beats it on reps alone.
    const pr = detectPR({ weight: 100, actualReps: 16 }, HISTORY)
      .find((p) => p.type === 'most_reps_at_weight');
    expect(pr ?? null).not.toBeNull();
    expect(pr.value).toBe(16);          // the metric is reps
    expect(pr.previousValue).toBe(15);
  });

  test('a rep record does not depend on calculate1RM at all', () => {
    // 90 kg x 13 estimates 129.0, well under the history's 150.0 bar (set by
    // 100 kg x 15), so NO Est. max PR fires - yet the rep record at 90 kg
    // still does, because it counts reps rather than estimating anything.
    const types = detectPR({ weight: 90, actualReps: 13 }, HISTORY).map((p) => p.type);
    expect(calculate1RM(90, 13)).toBeLessThan(calculate1RM(100, 15));
    expect(types).toContain('most_reps_at_weight');
    expect(types).not.toContain('1rm_estimate');
  });
});

// ── Edit / delete / reinstall ───────────────────────────────────────────

describe('C10M: derived records follow the raw history, always', () => {
  const A = { weight: 90.7, actualReps: 12 };  // 126.98, the winner
  const B = { weight: 90, actualReps: 12 };    // 126.00

  const bestOf = (history) => history.reduce((acc, s) => {
    const est = calculate1RM(s.weight, s.actualReps);
    return est > acc.est ? { est, set: s } : acc;
  }, { est: 0, set: null });

  test('DELETING the winning set demotes the record to the next best', () => {
    expect(bestOf([A, B]).set).toBe(A);
    expect(bestOf([B]).set).toBe(B);             // A removed
    expect(bestOf([B]).est).toBeCloseTo(126.0, 6);
    // Nothing resurrects A: there is no cache to resurrect it from.
  });

  test('EDITING the winning set down recomputes rather than remembering', () => {
    const edited = { weight: 80, actualReps: 12 };
    expect(bestOf([edited, B]).set).toBe(B);
  });

  test('an empty history yields no ESTIMATE record rather than a remembered one', () => {
    expect(bestOf([]).set).toBeNull();
    // detectPR's own `best1RM > 0` guard: a first-ever lift is a starting
    // point, not an Est. max PR. (It IS a first heaviest weight, which is a
    // raw fact and none of this campaign's business.)
    const types = detectPR({ weight: 100, actualReps: 5 }, []).map((p) => p.type);
    expect(types).not.toContain('1rm_estimate');
  });

  test('reinstall/sync cannot reassert a stale number: none is transported', () => {
    // The raw sets sync (through the legacy sync.js path); no derived e1RM
    // does. If personal_records ever enters either transport this fails,
    // which is the point.
    expect(read('lib/sync/registry.js')).not.toMatch(/personal_records/);
    expect(stripComments(read('lib/sync.js'))).not.toMatch(/personal_records/);
  });
});

// ── History and ledgers are not rewritten ───────────────────────────────

describe('C10M: nothing historical was rewritten', () => {
  test('no bulk record/history rewrite was introduced', () => {
    const DB = stripComments(read('lib/database.js'));
    expect(DB).not.toMatch(/UPDATE workout_sets SET weight/);
    expect(DB).not.toMatch(/UPDATE personal_records/);
  });

  test('the Block Ledger contract from 10L still holds', () => {
    // eslint-disable-next-line global-require
    const { LEDGER_VERSION, LEDGER_ALGORITHM_VERSION } = require('../interBlock');
    expect(LEDGER_VERSION).toBe(1);
    expect(LEDGER_ALGORITHM_VERSION).toBe(2);
    // Reuse remains gated on the SHAPE version only. A current block can
    // backfill its programme signature once; historical decisions do not move.
    const runner = read('lib/blockLedgerRunner.js');
    expect(runner).toMatch(/stored\?\.version === LEDGER_VERSION/);
    expect(runner).toMatch(/stored\?\.programmeSignature \|\| !isCurrent/);
    expect(runner).not.toMatch(/stored\?\.algorithmVersion/);
  });

  test('Block Reflection derives its Est. max numbers from the block\'s raw sets', () => {
    const DB = read('lib/database.js');
    const fn = DB.slice(DB.indexOf('const blockBestByExercise = new Map();'));
    expect(fn.slice(0, 600)).toMatch(/calculate1RM\(s\.weight \|\| 0, s\.actual_reps \|\| 0\)/);
  });
});

// ── 10L regression ──────────────────────────────────────────────────────

describe('C10M: the Campaign 10L model is untouched', () => {
  test('the formula rule is exactly as 10L left it', () => {
    const ALG = read('lib/algorithms.js');
    expect(ALG).toMatch(/if \(r <= 10\) return epley \* 0\.6 \+ brzycki \* 0\.4;\n\s*return epley;/);
    expect(ALG).toMatch(/const r = Math\.min\(reps0, 20\);/);
  });

  test('representative values still match 10L', () => {
    expect(calculate1RM(100, 10)).toBeCloseTo(133.348, 3);
    expect(calculate1RM(100, 12)).toBeCloseTo(140, 6);
    expect(calculate1RM(100, 15)).toBeCloseTo(150, 6);
    expect(calculate1RM(100, 20)).toBeCloseTo(166.667, 3);
    expect(calculate1RM(100, 30)).toBe(calculate1RM(100, 20));
  });
});
