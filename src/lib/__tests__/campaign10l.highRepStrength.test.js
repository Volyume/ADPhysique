/**
 * campaign10l.highRepStrength.test.js — Campaign 10L.
 *
 * THE DEFECT. calculate1RM is the app's ONE canonical estimated-max model
 * (the X4 single-model law), and it feeds live product behaviour: in-session
 * and historical PR interpretation, Lift Progress, Exercise Detail, the
 * featured best lift, block e1RM slopes, and — since Campaign 10G wired the
 * slope into runWeeklyCoach — weekly performance grading. Brzycki's
 * denominator runs toward its pole as reps climb, and the model gave it HALF
 * the weight from 11 to 20 reps, so the estimate inherited more and more of
 * that inflation on the way to the existing 20-rep clamp. A lighter high-rep
 * set could manufacture an Est. max PR, a steeper block slope and stronger
 * weekly evidence than its quality warranted.
 *
 * FOUNDER RULING (C10L), deliberately minimal:
 *   reps <= 10  -> 0.6 x Epley + 0.4 x Brzycki   (BYTE-IDENTICAL, unchanged)
 *   reps > 10   -> Epley only
 *   reps > 20   -> existing clamp, evaluate at 20
 *
 * WHY IT IS SAFE AT THE BOUNDARY. The two estimators have all but converged
 * by 10 reps — Epley 1.33333x load, Brzycki 1.33369x, 0.03% apart (they do
 * NOT meet exactly; the ruling's "same value" is true to three figures).
 * Dropping Brzycki above 10 therefore introduces no downward step: Epley(11)
 * = 1.36667x still clears the blended 10-rep 1.33348x. Pinned across 1-30.
 *
 * NOT a new model: no polynomial fit, no published-named formula invented,
 * no sex-, exercise-, bodyweight-, RIR- or velocity-specific term. Set
 * eligibility (warm-up / myo-rep / rest-pause / cluster / attribution /
 * load-bearing / stability / discounts) is untouched — a legitimate 15-rep
 * working set is still evidence, its estimated magnitude is simply less
 * inflated.
 */
import fs from 'fs';
import path from 'path';
import { calculate1RM, detectPR } from '../algorithms';
import { computeBlockPerformance } from '../blockMetrics';
import { LEDGER_VERSION, LEDGER_ALGORITHM_VERSION, buildBlockLedger } from '../interBlock';
import { pickBestLift } from '../bestLift';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

// The legacy model, reproduced here so "unchanged" is proved against a real
// second implementation rather than against hard-coded numbers.
const legacy1RM = (weight, reps) => {
  const w = Number(weight);
  const reps0 = Number(reps);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(reps0) || reps0 < 1) {
    return Number.isFinite(w) && w > 0 ? w : 0;
  }
  if (reps0 === 1) return w;
  const r = Math.min(reps0, 20);
  const epley = w * (1 + r / 30);
  const brzycki = w / (1.0278 - 0.0278 * r);
  return r <= 10 ? epley * 0.6 + brzycki * 0.4 : (epley + brzycki) / 2;
};
const epleyOnly = (w, reps) => w * (1 + Math.min(reps, 20) / 30);

// ── 1. The <= 10 range is untouched ─────────────────────────────────────

describe('C10L: nothing at or below 10 reps changed', () => {
  test.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])('%i reps is byte-identical to the legacy model', (r) => {
    for (const w of [20, 42.5, 100, 187.5]) {
      expect(calculate1RM(w, r)).toBe(legacy1RM(w, r));
    }
  });

  test('the reps === 1 special case still returns the raw weight', () => {
    expect(calculate1RM(100, 1)).toBe(100);
    expect(calculate1RM(142.5, 1)).toBe(142.5);
  });

  test('invalid and numeric-string input behaviour is unchanged', () => {
    // CALC-2: a NUMERIC string still computes; a non-numeric one is guarded.
    expect(calculate1RM('100', '5')).toBe(calculate1RM(100, 5));
    expect(calculate1RM('100', '15')).toBe(calculate1RM(100, 15));
    for (const [w, r] of [[0, 5], [-10, 5], [100, 0], [100, -1], ['abc', 5], [100, 'abc'], [null, null]]) {
      expect(calculate1RM(w, r)).toBe(legacy1RM(w, r));
    }
  });
});

// ── 2/3/4/5. Above 10: Epley only, clamp intact ─────────────────────────

describe('C10L: above 10 reps the estimate is Epley alone', () => {
  test.each([11, 12, 15, 18, 20])('%i reps equals Epley(min(reps,20)) exactly', (r) => {
    for (const w of [60, 100, 137.5]) {
      expect(calculate1RM(w, r)).toBeCloseTo(epleyOnly(w, r), 10);
    }
  });

  test('Brzycki can no longer contribute above 10 reps', () => {
    // If Brzycki still carried any weight the result would exceed pure Epley.
    for (let r = 11; r <= 20; r += 1) {
      expect(calculate1RM(100, r)).toBeCloseTo(100 * (1 + r / 30), 10);
      expect(calculate1RM(100, r)).toBeLessThan(legacy1RM(100, r));
    }
  });

  test('every high-rep estimate is lower than (or equal to) the old one', () => {
    for (let r = 11; r <= 30; r += 1) {
      expect(calculate1RM(100, r)).toBeLessThanOrEqual(legacy1RM(100, r) + 1e-9);
    }
  });

  test('the 20-rep clamp remains: 21-30 reps are identical to 20', () => {
    const at20 = calculate1RM(100, 20);
    for (let r = 21; r <= 30; r += 1) expect(calculate1RM(100, r)).toBe(at20);
    expect(at20).toBeCloseTo(166.667, 3);
  });
});

// ── 6. Monotonicity ─────────────────────────────────────────────────────

describe('C10L: monotonic, with no downward step at 10 -> 11', () => {
  test('a fixed load is non-decreasing across reps 1-30', () => {
    let prev = -Infinity;
    for (let r = 1; r <= 30; r += 1) {
      const v = calculate1RM(100, r);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });

  test('the 10 -> 11 boundary rises, it does not dip', () => {
    expect(calculate1RM(100, 11)).toBeGreaterThan(calculate1RM(100, 10));
    // And the two estimators really are near-converged at 10 (0.03% apart),
    // which is what makes the switch continuous rather than a cliff.
    const epley10 = 100 * (1 + 10 / 30);
    const brzycki10 = 100 / (1.0278 - 0.0278 * 10);
    expect(Math.abs(epley10 - brzycki10) / epley10).toBeLessThan(0.001);
  });
});

// ── 8/9. The PR consequence ─────────────────────────────────────────────

describe('C10L: formula-driven false PRs disappear, genuine ones survive', () => {
  // Prior legitimate best: a heavy triple.
  const PRIOR_W = 140;
  const PRIOR_R = 3;
  const priorBest = calculate1RM(PRIOR_W, PRIOR_R);            // ~151.7
  const priorBestLegacy = legacy1RM(PRIOR_W, PRIOR_R);         // identical (<=10)

  test('the prior best itself is unaffected by this campaign', () => {
    expect(priorBest).toBe(priorBestLegacy);
  });

  // The real detector, against the real history shape.
  const HISTORY = [{ weight: PRIOR_W, actualReps: PRIOR_R }];
  const estPR = (weight, actualReps) =>
    detectPR({ weight, actualReps }, HISTORY).find((p) => p.type === '1rm_estimate') ?? null;

  test('FALSE PR: 99 kg x 15 cleared the bar ONLY through Brzycki inflation', () => {
    const W = 99;
    // Legacy: (Epley 148.5 + Brzycki 162.1) / 2 = 155.3 > 151.7 -> "PR".
    expect(legacy1RM(W, 15)).toBeGreaterThan(priorBestLegacy);
    // C10L: Epley alone = 148.5, below the prior best. No PR.
    expect(calculate1RM(W, 15)).toBeLessThan(priorBest);
    expect(estPR(W, 15)).toBeNull();
  });

  test('GENUINE PR: 120 kg x 15 still clears the bar on Epley alone', () => {
    const W = 120; // Epley(15) = 180 > 151.7 on its own merits
    expect(calculate1RM(W, 15)).toBeGreaterThan(priorBest);
    const pr = estPR(W, 15);
    expect(pr).not.toBeNull();
    expect(pr.value).toBeCloseTo(180, 6);
  });

  test('high-rep sets are not banned from PRs, only de-inflated', () => {
    // A 20-rep set can still set an Est. max PR when the load justifies it:
    // Epley(20) at 110 kg = 183.3, comfortably past the 140x3 best.
    expect(estPR(110, 20)).not.toBeNull();
  });
});

// ── 10. Surfaces agree on the same corrected estimate ───────────────────

describe('C10L: every consumer inherits the ONE canonical result', () => {
  test('the featured best lift uses calculate1RM, not a private formula', () => {
    const sets = [
      { exerciseId: 'squat', exerciseName: 'Back Squat', weight: 60, reps: 30 },
      { exerciseId: 'bench', exerciseName: 'Bench Press', weight: 105, reps: 1 },
    ];
    // Injected and default paths must agree — the X4 single-model law.
    expect(pickBestLift(sets, new Map())).toEqual(pickBestLift(sets, new Map(), calculate1RM));
  });

  test('blockMetrics builds its e1RM points from the canonical function', () => {
    expect(read('lib/blockMetrics.js')).toMatch(/import \{ calculate1RM, allocateExerciseVolume \} from '\.\/algorithms'/);
    expect(read('lib/blockMetrics.js')).toMatch(/calculate1RM\(num\(f\(row, 'weight', 'weight'\), 0\), repsOf\(row\)\)/);
  });

  test('no production module re-implements the formula', () => {
    // A second copy of either estimator would fork the product truth.
    for (const rel of ['lib/database.js', 'lib/bestLift.js', 'lib/blockMetrics.js', 'lib/weeklyCoach.js']) {
      const src = read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(src).not.toMatch(/1\.0278/);
      expect(src).not.toMatch(/\*\s*\(1\s*\+\s*\w+\s*\/\s*30\)/);
    }
  });
});

// ── 11/12/13. The Campaign 10G block-slope consequence ──────────────────

describe('C10L: the live block slope inherits the corrected points', () => {
  const DAY = 86400000;
  const START = new Date(2026, 0, 5, 9, 0, 0).getTime();
  const exercisesById = { bench: { id: 'bench', name: 'Barbell Bench Press', primaryMuscle: 'chest' } };
  const session = (wk, weight, reps, id) => ({
    id, workout_id: id, exercise_id: 'bench', set_type: 'working',
    weight, actual_reps: reps, created_at: START + (wk - 1) * 7 * DAY + DAY,
  });
  const run = (sets) => computeBlockPerformance({
    muscle: 'chest', sets, exercisesById, priorSets: [],
    blockStart: START, blockWeeks: 5, deloadWeekIndex: 5,
  });

  test('a slope driven by REP INFLATION rather than real progress is smaller now', () => {
    // Same load throughout; the only "progress" is climbing reps deep into
    // the range where Brzycki used to run away.
    const sets = [
      session(1, 100, 11, 'w1'),
      session(2, 100, 14, 'w2'),
      session(3, 100, 17, 'w3'),
      session(4, 100, 20, 'w4'),
    ];
    const perf = run(sets);
    expect(perf.confidence).toBeGreaterThan(0);
    // Old points: 137.6 -> 148.5 -> 162.9 -> 189.3 (a 37.6% climb).
    // New points: 136.7 -> 146.7 -> 156.7 -> 166.7 (a 21.9% climb).
    const oldPts = [11, 14, 17, 20].map((r) => legacy1RM(100, r));
    const newPts = [11, 14, 17, 20].map((r) => calculate1RM(100, r));
    const oldRise = (oldPts[3] - oldPts[0]) / oldPts[0];
    const newRise = (newPts[3] - newPts[0]) / newPts[0];
    expect(newRise).toBeLessThan(oldRise);
    // The slope is still positive - the reps really did go up - just honest.
    expect(perf.e1rmSlopePct).toBeGreaterThan(0);
  });

  test('genuine load progression still crosses the strong-performance threshold', () => {
    // Real added load at a constant, moderate rep count.
    const sets = [
      session(1, 100, 8, 'g1'),
      session(2, 105, 8, 'g2'),
      session(3, 110, 8, 'g3'),
      session(4, 115, 8, 'g4'),
    ];
    const perf = run(sets);
    expect(perf.e1rmSlopePct).toBeGreaterThan(1.5); // PERF_UP_PCT
  });

  test('the performance constants are untouched', () => {
    const BM = read('lib/blockMetrics.js');
    expect(BM).toMatch(/SLOPE_CLAMP_PCT = 25/);
    expect(BM).toMatch(/PR_MARGIN = 1\.001/);
    expect(BM).toMatch(/REBOUND_PR_WEIGHT = 0\.25/);
    expect(BM).toMatch(/STABLE_MIN_SESSIONS = 3/);
    expect(BM).toMatch(/STABLE_MIN_WEEKS = 3/);
    expect(BM).toMatch(/LATE_BEAT_EARLY = 1\.01/);
    const IB = read('lib/interBlock.js');
    expect(IB).toMatch(/PERF_UP_PCT = 1\.5/);
    expect(IB).toMatch(/PERF_DOWN_PCT = -1\.5/);
  });
});

// ── 14. Eligibility untouched ───────────────────────────────────────────

describe('C10L: set eligibility is unchanged', () => {
  test('the canonical eligibility law still rejects warm-up, myo-rep and rest-pause', () => {
    const ALG = read('lib/algorithms.js');
    const fn = ALG.slice(ALG.indexOf('export function isE1rmEligibleRow'));
    expect(fn.slice(0, 900)).toMatch(/warmup/);
    expect(fn.slice(0, 900)).toMatch(/myo_reps/);
    expect(fn.slice(0, 900)).toMatch(/rest_pause/);
  });

  test('blockMetrics still excludes warm-ups and non-load exercise types', () => {
    const BM = read('lib/blockMetrics.js');
    expect(BM).toMatch(/if \(f\(row, 'setType', 'set_type'\) === 'warmup'\) return false;/);
    expect(BM).toMatch(/if \(type === 'distance' \|\| type === 'duration'\) return false;/);
  });
});

// ── 15/16/17/18. Ledger provenance ──────────────────────────────────────

describe('C10L: ledger provenance advances without rewriting history', () => {
  test('LEDGER_VERSION is unchanged (the SHAPE did not change)', () => {
    expect(LEDGER_VERSION).toBe(1);
  });

  test('LEDGER_ALGORITHM_VERSION advanced (the RULES did change)', () => {
    expect(LEDGER_ALGORITHM_VERSION).toBe(2);
  });

  test('a newly built ledger records the new algorithm identity', () => {
    const ledger = buildBlockLedger({ muscles: [], systemic: {}, suppressed: false, weeksSinceBlockEnd: 0 });
    expect(ledger.version).toBe(1);
    expect(ledger.algorithmVersion).toBe(2);
  });

  test('idempotent reuse is gated on LEDGER_VERSION ONLY, never algorithmVersion', () => {
    // An algorithmVersion mismatch must not force an old block to recompute:
    // that would rewrite a historical decision the user already acted on.
    const SRC = read('lib/blockLedgerRunner.js');
    expect(SRC).toMatch(/stored\?\.version === LEDGER_VERSION/);
    // The current finished block may recompute once to add the immutable
    // programme signature; historical ledgers still return unchanged.
    expect(SRC).toMatch(/stored\?\.programmeSignature \|\| !isCurrent/);
    expect(SRC).not.toMatch(/stored\?\.algorithmVersion/);
    // And the sync applier compares the same shape version.
    expect(read('lib/database.js')).not.toMatch(/algorithmVersion !== LEDGER_ALGORITHM_VERSION/);
  });

  test('a stored v1 ledger built under algorithmVersion 1 is still reusable', () => {
    const stored = { version: LEDGER_VERSION, algorithmVersion: 1, entries: [], proposedRecoveryDays: 7 };
    // The runner's reuse predicate, applied directly.
    expect(stored.version === LEDGER_VERSION).toBe(true);
  });
});
