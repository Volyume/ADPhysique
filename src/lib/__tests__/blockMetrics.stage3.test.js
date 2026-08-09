/**
 * blockMetrics.stage3.test.js — TEST-FIRST, Stage 3 of the adaptive
 * mesocycle build (founder order 2026-08-09; authority
 * docs/blueprint-adaptive-mesocycle-2026-08-09.md §3.1 + the founder's
 * Stage 3 spec: "performance metric — per stable exercise first; never
 * average raw e1RM across exercises; reduced weighting for new
 * exercises, changed rep ranges and post-deload rebound PRs; PR density
 * with eligible exposures as the denominator").
 *
 * Pins the pure src/lib/blockMetrics.js BEFORE it exists. It computes
 * interBlock's `performance` input for one muscle over one finished
 * block, from raw completed workout_sets rows:
 *   { e1rmSlopePct, prDensity, rawPrCount, eligibleExposures,
 *     confidence, discontinuity, doseResponse }
 *
 * Metric semantics pinned here:
 * - e1RM via the app's single mandated calculate1RM (X4 ruling), one
 *   best-e1RM point per session per exercise.
 * - A STABLE exercise has >= 3 block sessions AND appears in both the
 *   early and late halves of the accumulation phase. Slopes are fitted
 *   per exercise (least squares over days, normalised by the fitted
 *   start) and combined as a WEIGHTED MEAN OF SLOPES — raw e1RM values
 *   are never pooled across exercises.
 * - Weights: sessions x 0.5 if the exercise is new this block (absent
 *   from prior history when prior history exists) x 0.5 if its logged
 *   target rep range shifted mid-block (null targets are unknown, not a
 *   shift).
 * - confidence = weighted stable exercise-sessions / raw exercise-
 *   sessions; discontinuity = stable raw share < 0.5.
 * - PR replay per exercise against the prior-history best (first-ever
 *   lift never a PR; 1.001 margin, matching detectPR); rebound PRs
 *   (inside a supplied post-deload window) weigh 0.25.
 * - The deload week's sessions are excluded from slope, PRs and
 *   exposures (they are prescribed light).
 * - doseResponse.lateProgression needs the late accumulation half to
 *   beat the early half by >= 1% (or a late PR); lateRecoveryOk needs
 *   POSITIVE late-window feedback evidence — absent feedback is false,
 *   never assumed fine (the founder's retention rule demands evidence).
 */
import fs from 'fs';
import path from 'path';
import { computeBlockPerformance } from '../blockMetrics';
import { calculate1RM } from '../algorithms';

const DAY = 24 * 60 * 60 * 1000;
const START = new Date(2026, 0, 5).getTime(); // Monday, local
const day = (d) => START + d * DAY;

const EXERCISES = {
  bench: { id: 'bench', primaryMuscle: 'chest', secondaryMuscles: '["front_delts","triceps"]', exerciseType: 'weight' },
  incline: { id: 'incline', primaryMuscle: 'chest', secondaryMuscles: '[]', exerciseType: 'weight' },
  benchB: { id: 'benchB', primaryMuscle: 'chest', secondaryMuscles: '[]', exerciseType: 'weight' },
  curl: { id: 'curl', primaryMuscle: 'biceps', secondaryMuscles: '[]', exerciseType: 'weight' },
  dips: { id: 'dips', primaryMuscle: 'triceps', secondaryMuscles: '["chest"]', exerciseType: 'weight' },
};

let seq = 0;
// Single-rep sets so e1RM === weight exactly (calculate1RM returns the raw
// weight at reps 1), keeping every expected number exact.
const set = (exerciseId, weight, d, over = {}) => ({
  id: `s${seq++}`,
  workoutId: over.workoutId ?? `w${d}`,
  exerciseId,
  weight,
  reps: over.reps ?? 1,
  setType: over.setType ?? 'working',
  createdAt: day(d),
  targetRepsMin: over.targetRepsMin ?? null,
  targetRepsMax: over.targetRepsMax ?? null,
});

// Two sessions a week on days 0 and 3; accumulation weeks 1-4 of a 5-week
// block (week 5 is the deload week).
const SESSION_DAYS = [0, 3, 7, 10, 14, 17, 21, 24];
const linearWeight = (d, from, to) => from + ((to - from) * d) / 24;

const risingBench = () => SESSION_DAYS.map((d) => set('bench', linearWeight(d, 100, 104), d));
const flatBench = () => SESSION_DAYS.map((d) => set('bench', 100, d));

const base = (over = {}) => ({
  muscle: 'chest',
  sets: risingBench(),
  exercisesById: EXERCISES,
  priorSets: [set('bench', 100, -30)],
  workoutsById: null,
  blockStart: START,
  blockWeeks: 5,
  reboundWindowsMs: [],
  ...over,
});

afterEach(() => { seq = 0; });

// ── Slope semantics ─────────────────────────────────────────────────────────

describe('per-exercise e1RM slope', () => {
  test('a clean linear rise reads as its exact percentage across the accumulation window', () => {
    const p = computeBlockPerformance(base());
    expect(p.e1rmSlopePct).toBeCloseTo(4, 5);
  });

  test('raw e1RM values are never pooled across exercises: a heavy flat lift and a light rising lift average their SLOPES', () => {
    // Pooled raw e1RM (100s and ~20s interleaved) would produce noise;
    // per-exercise slopes are 0% and +10%, equal exposure -> +5%.
    const p = computeBlockPerformance(base({
      sets: [
        ...flatBench(),
        ...SESSION_DAYS.map((d) => set('incline', linearWeight(d, 20, 22), d)),
      ],
      priorSets: [set('bench', 100, -30), set('incline', 20, -30)],
    }));
    expect(p.e1rmSlopePct).toBeCloseTo(5, 5);
  });

  test('deload-week sessions are excluded from the slope', () => {
    const p = computeBlockPerformance(base({
      sets: [...risingBench(), set('bench', 80, 28), set('bench', 80, 31)],
    }));
    expect(p.e1rmSlopePct).toBeCloseTo(4, 5);
  });

  test('warm-up sets and sessions outside the block window are ignored', () => {
    const p = computeBlockPerformance(base({
      sets: [
        ...risingBench(),
        set('bench', 200, 10, { setType: 'warmup' }),
        set('bench', 200, 40),  // limbo training past the block end
        set('bench', 200, -3),  // before the block
      ],
    }));
    expect(p.e1rmSlopePct).toBeCloseTo(4, 5);
    expect(p.eligibleExposures).toBe(8);
  });
});

// ── Stability, newness, rep-range shifts, discontinuity ────────────────────

describe('stable-exercise weighting', () => {
  test('an exercise appearing only in the late half is not stable: it cannot move the slope', () => {
    const p = computeBlockPerformance(base({
      sets: [
        ...flatBench(),
        // Steeply "rising" new lift, late half only (founder scenario 3).
        ...[14, 17, 21, 24].map((d, i) => set('incline', 40 + i * 4, d)),
      ],
    }));
    expect(p.e1rmSlopePct).toBeCloseTo(0, 5);
    expect(p.confidence).toBeCloseTo(8 / 12, 5);
    expect(p.discontinuity).toBe(false);
  });

  test('a NEW exercise (absent from prior history) that is otherwise stable carries half weight', () => {
    const p = computeBlockPerformance(base({
      sets: [
        ...flatBench(),
        ...SESSION_DAYS.map((d) => set('incline', linearWeight(d, 20, 22), d)),
      ],
      priorSets: [set('bench', 100, -30)], // incline never seen before
    }));
    // Weighted slopes: (0 x 8 + 10 x 4) / 12; confidence (8 + 4) / 16.
    expect(p.e1rmSlopePct).toBeCloseTo(10 / 3, 5);
    expect(p.confidence).toBeCloseTo(0.75, 5);
  });

  test('with NO prior history at all (first-ever block) nothing is discounted as new', () => {
    const p = computeBlockPerformance(base({ priorSets: [] }));
    expect(p.e1rmSlopePct).toBeCloseTo(4, 5);
    expect(p.confidence).toBeCloseTo(1, 5);
  });

  test('a mid-block rep-range shift halves the exercise weight; null targets are unknown, not a shift', () => {
    const shifted = computeBlockPerformance(base({
      sets: SESSION_DAYS.map((d) => set('bench', linearWeight(d, 100, 104), d, {
        targetRepsMin: d < 14 ? 8 : 6, targetRepsMax: d < 14 ? 12 : 10,
      })),
    }));
    expect(shifted.confidence).toBeCloseTo(0.5, 5);
    const nulls = computeBlockPerformance(base());
    expect(nulls.confidence).toBeCloseTo(1, 5);
  });

  test('a mid-block swap (A early-only, B late-only) is a discontinuity with zero confidence (founder scenario 12)', () => {
    const p = computeBlockPerformance(base({
      sets: [
        ...[0, 3, 7, 10].map((d) => set('bench', 100, d)),
        ...[14, 17, 21, 24].map((d) => set('benchB', 90, d)),
      ],
    }));
    expect(p.discontinuity).toBe(true);
    expect(p.confidence).toBeCloseTo(0, 5);
    expect(p.e1rmSlopePct).toBeCloseTo(0, 5);
  });
});

// ── PR replay ───────────────────────────────────────────────────────────────

describe('PR density over eligible exposures', () => {
  test('PRs replay against the prior-history best with the detectPR margin', () => {
    // Prior best 100. Linear rise: day 0 (100) is not a PR; every later
    // session beats the running best by more than 0.1% -> 7 events.
    const p = computeBlockPerformance(base());
    expect(p.rawPrCount).toBe(7);
    expect(p.eligibleExposures).toBe(8);
    expect(p.prDensity).toBeCloseTo(7 / 8, 5);
  });

  test('a first-ever exercise is never a PR (no prior best), matching the live detector', () => {
    const p = computeBlockPerformance(base({
      sets: SESSION_DAYS.map((d) => set('incline', linearWeight(d, 20, 22), d)),
      priorSets: [],
    }));
    // The first session sets the baseline; later genuine progress counts.
    expect(p.rawPrCount).toBe(7);
  });

  test('post-deload rebound PRs weigh 0.25 in the density but count raw (founder scenario 4)', () => {
    const sets = SESSION_DAYS.map((d) => set('bench', d === 0 ? 100 : 105, d));
    const p = computeBlockPerformance(base({
      sets,
      // Week 1 sits immediately after the previous block's deload week.
      reboundWindowsMs: [{ start: day(0), end: day(7) }],
    }));
    // One PR (day 3, 105 > 100.1), inside the rebound window.
    expect(p.rawPrCount).toBe(1);
    expect(p.prDensity).toBeCloseTo(0.25 / 8, 5);
  });

  test('the same PR outside a rebound window carries full weight', () => {
    const sets = SESSION_DAYS.map((d) => set('bench', d < 14 ? 100 : 105, d));
    const p = computeBlockPerformance(base({ sets }));
    expect(p.rawPrCount).toBe(1);
    expect(p.prDensity).toBeCloseTo(1 / 8, 5);
  });

  test('deload-week sessions produce no PRs and no exposures', () => {
    const p = computeBlockPerformance(base({
      sets: [...risingBench(), set('bench', 200, 28)],
    }));
    expect(p.rawPrCount).toBe(7);
    expect(p.eligibleExposures).toBe(8);
  });
});

// ── Exposure attribution ────────────────────────────────────────────────────

describe('eligible exposures', () => {
  test('a session counts once however many of the muscle\'s lifts it contains', () => {
    const p = computeBlockPerformance(base({
      sets: [
        ...flatBench(),
        ...SESSION_DAYS.map((d) => set('incline', 20, d)), // same sessions
      ],
      priorSets: [set('bench', 100, -30), set('incline', 20, -30)],
    }));
    expect(p.eligibleExposures).toBe(8);
  });

  test('only primary-role sets create an exposure: another muscle\'s lifts and secondary work do not count', () => {
    const p = computeBlockPerformance(base({
      sets: [
        ...flatBench(),
        ...SESSION_DAYS.map((d) => set('curl', 20, d)),          // biceps primary
        ...[0, 3].map((d) => set('dips', 60, d, { workoutId: `dips${d}` })), // chest secondary only
      ],
      priorSets: [set('bench', 100, -30)],
    }));
    expect(p.eligibleExposures).toBe(8);
  });
});

// ── Dose-response evidence (the founder retention rule's fuel) ─────────────

describe('doseResponse', () => {
  const feedback = (days, soreness, joint) => Object.fromEntries(
    days.map((d) => [`w${d}`, { soreness24hBefore: soreness, jointDiscomfort: joint }]),
  );

  test('late half beating the early half by >= 1 percent with calm late feedback earns both flags', () => {
    const p = computeBlockPerformance(base({
      workoutsById: feedback(SESSION_DAYS, 1, 0),
    }));
    // Early peak 101.667 (day 10), late peak 104 > 102.68.
    expect(p.doseResponse).toEqual({ lateProgression: true, lateRecoveryOk: true });
  });

  test('a flat block shows no late progression', () => {
    const p = computeBlockPerformance(base({
      sets: flatBench(),
      workoutsById: feedback(SESSION_DAYS, 1, 0),
    }));
    expect(p.doseResponse.lateProgression).toBe(false);
  });

  test('sore, achy late weeks refuse lateRecoveryOk', () => {
    const p = computeBlockPerformance(base({
      workoutsById: feedback(SESSION_DAYS, 3, 3),
    }));
    expect(p.doseResponse.lateRecoveryOk).toBe(false);
  });

  test('ABSENT late feedback is not evidence of recovery: lateRecoveryOk is false, never assumed', () => {
    const p = computeBlockPerformance(base({ workoutsById: null }));
    expect(p.doseResponse.lateProgression).toBe(true);
    expect(p.doseResponse.lateRecoveryOk).toBe(false);
  });
});

// ── Degenerate inputs and purity ───────────────────────────────────────────

describe('degenerate inputs', () => {
  test('no sets at all: zeros, zero confidence, no dose-response claims', () => {
    const p = computeBlockPerformance(base({ sets: [], priorSets: [] }));
    expect(p).toEqual({
      e1rmSlopePct: 0,
      prDensity: 0,
      rawPrCount: 0,
      eligibleExposures: 0,
      confidence: 0,
      discontinuity: false,
      doseResponse: { lateProgression: false, lateRecoveryOk: false },
    });
  });

  test('a muscle absent from the block behaves like an empty block', () => {
    const p = computeBlockPerformance(base({ muscle: 'quads' }));
    expect(p.eligibleExposures).toBe(0);
    expect(p.confidence).toBe(0);
  });

  test('exercisesById accepts a Map as well as a plain object', () => {
    const asMap = new Map(Object.entries(EXERCISES).map(([k, v]) => [k, v]));
    const a = computeBlockPerformance(base());
    seq = 0;
    const b = computeBlockPerformance(base({ exercisesById: asMap }));
    expect(b).toEqual(a);
  });

  test('snake_case rows compute identically to camelCase rows', () => {
    const snake = risingBench().map((s) => ({
      id: s.id, workout_id: s.workoutId, exercise_id: s.exerciseId,
      weight: s.weight, reps: s.reps, set_type: s.setType,
      created_at: s.createdAt, target_reps_min: s.targetRepsMin, target_reps_max: s.targetRepsMax,
    }));
    seq = 0;
    const a = computeBlockPerformance(base());
    const b = computeBlockPerformance(base({ sets: snake, priorSets: [{ exercise_id: 'bench', weight: 100, reps: 1, created_at: day(-30), workout_id: 'wp', set_type: 'working' }] }));
    expect(b).toEqual(a);
  });
});

describe('purity and conventions', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'blockMetrics.js'), 'utf8');

  test('deterministic: identical input, deep-equal output', () => {
    const a = computeBlockPerformance(base());
    seq = 0;
    const b = computeBlockPerformance(base());
    expect(a).toEqual(b);
  });

  test('does not mutate its inputs', () => {
    const input = base();
    const snapshot = JSON.parse(JSON.stringify(input));
    computeBlockPerformance(input);
    expect(JSON.parse(JSON.stringify(input))).toEqual(snapshot);
  });

  test('uses the single mandated e1RM formula, no fork', () => {
    expect(SRC).toMatch(/import \{[^}]*calculate1RM[^}]*\} from '\.\/algorithms'/);
    expect(SRC).not.toMatch(/1\.0278|0\.0278|\/ 30\b/); // no inlined Epley/Brzycki
  });

  test('no clocks, no randomness, no I/O, no store, tier-blind', () => {
    expect(SRC).not.toMatch(/Date\.now|Math\.random|new Date\(/);
    expect(SRC).not.toMatch(/require\(|from '\.\/database'|AsyncStorage|useAppStore|supabase/);
    expect(SRC).not.toMatch(/tier/i);
  });

  test('single-rep fixture premise holds: calculate1RM(w, 1) === w', () => {
    expect(calculate1RM(100, 1)).toBe(100);
  });
});
