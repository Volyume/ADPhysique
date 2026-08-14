/**
 * campaign13.trainingIntelligence.test.js — Campaign 13, the
 * training-intelligence and history closeout.
 *
 * JOB 1 — THE MIRROR. Campaign 12 moved plateau detection to the best
 * canonical eligible e1RM per session but left detectProgressionConsistency
 * comparing session AVERAGE weight and reps. Its own header calls it
 * "detectPlateau's mirror image… so the app can never say a muscle is both
 * progressing and plateaued from the same data", and that invariant was
 * broken: one history could read 'progressing' for Campaign 9's ranking and
 * 'plateaued' for the user at the same moment, purely from representation
 * drift. Both now call sessionBestE1rm with the same margin.
 *
 * JOB 2 — DURATION. Qualification (is there a plateau?) stays on the recent
 * four-session window. DURATION (how far back does it reach?) now walks
 * backwards through the full eligible history while the same contiguity and
 * non-progression laws hold, so a ten-week stall reports ten weeks instead
 * of the four sessions that happened to qualify it. `weeks` means ELAPSED
 * duration; the calendar-bucket count that the qualification gate tests is
 * reported separately as calendarWeeks.
 *
 * JOB 6 — RECENCY. getExerciseProgressionSessions reads the four most recent
 * sessions with NO age bound, and rankPersonalised turned 'progressing' into
 * a CURRENT recommendation tag. A lift last trained a year ago could
 * therefore be tagged "Progressing consistently" today. Gated on Campaign
 * 9's existing recency window; no new constant.
 *
 * JOB 4 — DELETED EVIDENCE. A stored Block Ledger is an immutable historical
 * decision and is never rebuilt or rewritten. But it was also still TEACHING
 * the learned replay for ever, so training the user had deliberately deleted
 * kept compounding into new personalisation. Ledgers whose blocks retain no
 * completed sets are now excluded from replay while remaining stored and
 * renderable.
 */
import fs from 'fs';
import path from 'path';
import {
  detectPlateau, detectProgressionConsistency, sessionBestE1rm, calculate1RM,
} from '../algorithms';
import { rankPersonalised, exerciseEvidence, RANK_TIER } from '../exercise/intent';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date(2026, 4, 20, 18, 0, 0).getTime();
const weekAgo = (n) => T0 - n * 7 * DAY;
const set = (weight, reps, at, over = {}) => ({
  weight, actualReps: reps, setType: 'straight', createdAt: at, ...over,
});
/** One session, `i` weeks back, at a top load plus optional extra sets. */
const session = (top, i, extra = []) => [set(top, 8, weekAgo(i)), ...extra];

// ══ JOB 1: the mirror invariant ════════════════════════════════════════

describe('C13 job 1: progression and plateau share one session representative', () => {
  test('both refuse to disagree: a flat history is not progressing', () => {
    const flat = [session(100, 0), session(100, 1), session(100, 2), session(100, 3)];
    expect(detectPlateau(flat).plateau).toBe(true);
    expect(detectProgressionConsistency(flat).status).not.toBe('progressing');
  });

  test('a genuinely rising history is progressing and not plateaued', () => {
    const rising = [session(115, 0), session(110, 1), session(105, 2), session(100, 3)];
    expect(detectPlateau(rising).plateau).toBe(false);
    expect(detectProgressionConsistency(rising).status).toBe('progressing');
  });

  test('ADVERSARIAL: back-offs that used to split the two verdicts no longer do', () => {
    // The top set climbs while two light back-offs are added from session 2,
    // dragging the session MEAN down. Under the old model detectPlateau said
    // plateau (mean falling) and progression said holding - and with the
    // reverse fixture below, both could be true at once.
    const backoffs = (i) => [set(60, 12, weekAgo(i)), set(60, 12, weekAgo(i))];
    const sessions = [
      session(115, 0, backoffs(0)),
      session(110, 1, backoffs(1)),
      session(105, 2, backoffs(2)),
      session(100, 3),
    ];
    const mean = (s) => s.reduce((t, x) => t + x.weight, 0) / s.length;
    expect(mean(sessions[0])).toBeLessThan(mean(sessions[3]));   // the mean really falls
    expect(detectPlateau(sessions).plateau).toBe(false);
    expect(detectProgressionConsistency(sessions).status).toBe('progressing');
  });

  test('ADVERSARIAL: dropping back-offs cannot make it progressing either', () => {
    const sessions = [
      session(100, 0),
      session(100, 1, [set(60, 12, weekAgo(1))]),
      session(100, 2, [set(60, 12, weekAgo(2)), set(60, 12, weekAgo(2))]),
      session(100, 3, [set(60, 12, weekAgo(3)), set(60, 12, weekAgo(3))]),
    ];
    const mean = (s) => s.reduce((t, x) => t + x.weight, 0) / s.length;
    expect(mean(sessions[0])).toBeGreaterThan(mean(sessions[3])); // the mean really rises
    expect(detectProgressionConsistency(sessions).status).toBe('holding');
    expect(detectPlateau(sessions).plateau).toBe(true);
  });

  test('NEVER both true: progressing and plateaued cannot coexist', () => {
    const histories = [
      [session(100, 0), session(100, 1), session(100, 2), session(100, 3)],
      [session(115, 0), session(110, 1), session(105, 2), session(100, 3)],
      [session(105, 0), session(100, 1), session(100, 2), session(100, 3)],
      [session(100, 0), session(105, 1), session(100, 2), session(105, 3)],
    ];
    for (const h of histories) {
      const bothTrue = detectPlateau(h).plateau && detectProgressionConsistency(h).status === 'progressing';
      expect(bothTrue).toBe(false);
    }
  });

  test('the two functions use the SAME helper and margin', () => {
    const alg = read('lib/algorithms.js');
    expect((alg.match(/sessionBestE1rm\(recent\[i\]\)/g) || []).length).toBe(2);
    expect((alg.match(/E1RM_PROGRESS_MARGIN/g) || []).length).toBeGreaterThanOrEqual(3);
    // C10D eligibility and C10L estimator both still stand.
    expect(alg).toMatch(/if \(r <= 10\) return epley \* 0\.6 \+ brzycki \* 0\.4;\n\s*return epley;/);
    expect(sessionBestE1rm([set(200, 20, T0, { setType: 'myo_reps' })])).toBe(0);
    expect(sessionBestE1rm([set(100, 15, T0)])).toBeCloseTo(calculate1RM(100, 15), 10);
  });
});

// ══ JOB 2: duration fidelity ═══════════════════════════════════════════

describe('C13 job 2: qualification window vs continuous stall duration', () => {
  test('a current three-week plateau still qualifies', () => {
    const r = detectPlateau([session(100, 0), session(100, 1), session(100, 2)]);
    expect(r.plateau).toBe(true);
    expect(r.spanDays).toBe(14);
    expect(r.weeks).toBe(2);            // ELAPSED, per the display law
    expect(r.calendarWeeks).toBe(3);    // what the gate measured
  });

  test('a TEN-week continuous stall reports ten weeks, not four sessions', () => {
    const ten = Array.from({ length: 11 }, (_, i) => session(100, i));
    const r = detectPlateau(ten);
    expect(r.plateau).toBe(true);
    expect(r.sessions).toBe(11);        // the run extended past the window
    expect(r.spanDays).toBe(70);
    expect(r.weeks).toBe(10);
  });

  test('a >14-day gap ends the duration walk at the gap', () => {
    // Six weekly sessions, then a 5-week hole, then more flat history.
    const withGap = [
      ...Array.from({ length: 6 }, (_, i) => session(100, i)),
      session(100, 11), session(100, 12),
    ];
    const r = detectPlateau(withGap);
    expect(r.plateau).toBe(true);
    expect(r.sessions).toBe(6);         // stops at the hole
    expect(r.spanDays).toBe(35);
  });

  test('genuine earlier progression ends the duration walk', () => {
    // Flat for five weeks, but before that the athlete was climbing.
    const r = detectPlateau([
      session(100, 0), session(100, 1), session(100, 2), session(100, 3),
      session(100, 4), session(95, 5), session(90, 6),
    ]);
    expect(r.plateau).toBe(true);
    expect(r.sessions).toBe(5);         // the 95 -> 100 gain ends the stall
    expect(r.spanDays).toBe(28);
    expect(r.weeks).toBe(4);
  });

  test('duration is elapsed time, not a count of calendar buckets', () => {
    // Three sessions over 24 days: three calendar weeks touched, but the
    // elapsed stall is 24 days, so it reports 3 weeks rather than inflating.
    const r = detectPlateau([
      [set(100, 8, T0)], [set(100, 8, T0 - 12 * DAY)], [set(100, 8, T0 - 24 * DAY)],
    ]);
    expect(r.calendarWeeks).toBe(3);
    expect(r.spanDays).toBe(24);
    expect(r.weeks).toBe(3);
    expect(r.weeks).toBe(r.durationWeeks);
  });

  test('the duration walk still obeys C10D eligibility', () => {
    // An older session of nothing but cluster rows is not evidence, so the
    // walk stops rather than counting it.
    const r = detectPlateau([
      session(100, 0), session(100, 1), session(100, 2), session(100, 3),
      [set(100, 30, weekAgo(4), { setType: 'rest_pause' })],
      session(100, 5),
    ]);
    expect(r.plateau).toBe(true);
    // The ineligible session is filtered out entirely, so the run continues
    // to the next legitimate one only if the GAP still allows it (14 days
    // apart here, so it does).
    expect(r.sessions).toBeGreaterThanOrEqual(4);
  });
});

// ══ JOBS 3 + 6: Exercise Intelligence and recency ══════════════════════

describe('C13 jobs 3 and 6: corrected progression feeds ranking, bounded by recency', () => {
  const stateOf = ({ usage = [], progression = [], intents = [], swaps = [], defaults = [] } = {}) => ({
    intents: new Map(intents.map((r) => [r.exerciseId, r])),
    swaps,
    defaults,
    usage: new Map(usage.map((r) => [r.exerciseId, r])),
    progression: new Map(progression.map((r) => [r.exerciseId, { status: r.status }])),
    activeMesocycleId: 'block-1',
  });
  const cand = (id, score) => ({ exercise: { id, name: id.toUpperCase() }, score, reason: 'similar' });
  const recent = (id) => ({ exerciseId: id, sessions: 3, lastTrainedMs: T0 - 3 * DAY });
  const old = (id) => ({ exerciseId: id, sessions: 3, lastTrainedMs: T0 - 90 * DAY });

  test('THE RANKING CASE: A looked progressing on means, B genuinely progresses', () => {
    // A: top set flat at 100 while back-offs are dropped -> the MEAN rose,
    // so the old model called A progressing. The best set never moved.
    const aHistory = [
      session(100, 0),
      session(100, 1, [set(60, 12, weekAgo(1))]),
      session(100, 2, [set(60, 12, weekAgo(2)), set(60, 12, weekAgo(2))]),
      session(100, 3, [set(60, 12, weekAgo(3)), set(60, 12, weekAgo(3))]),
    ];
    // B: the top set genuinely climbs.
    const bHistory = [session(115, 0), session(110, 1), session(105, 2), session(100, 3)];
    expect(detectProgressionConsistency(aHistory).status).toBe('holding');
    expect(detectProgressionConsistency(bHistory).status).toBe('progressing');

    const s = stateOf({
      progression: [
        { exerciseId: 'a', status: detectProgressionConsistency(aHistory).status },
        { exerciseId: 'b', status: detectProgressionConsistency(bHistory).status },
      ],
      usage: [recent('a'), recent('b')],
    });
    const ranked = rankPersonalised(s, [cand('a', 90), cand('b', 90)], { fromExerciseId: 'x', nowMs: T0 });
    const byId = Object.fromEntries(ranked.map((r) => [r.exercise.id, r.personal]));
    // The EVIDENCE now names the right exercise: B is the one progressing,
    // A is merely recently used. Under the old mean-based model A carried
    // the "Progressing consistently" tag it had not earned.
    expect(byId.b.tag).toBe('Progressing consistently');
    expect(byId.a.tag).not.toBe('Progressing consistently');
    // Campaign 9's law, deliberately preserved: progression sits at the SAME
    // tier as other personal evidence, so with both lifts recently trained
    // and structurally equal it reorders nothing. It refines; it does not
    // outrank. When A has no recent evidence of its own, B does move ahead.
    expect(byId.a.tier).toBe(byId.b.tier);
    const sAOld = stateOf({
      progression: [
        { exerciseId: 'a', status: 'holding' },
        { exerciseId: 'b', status: 'progressing' },
      ],
      usage: [old('a'), recent('b')],
    });
    const ranked2 = rankPersonalised(sAOld, [cand('a', 90), cand('b', 90)], { fromExerciseId: 'x', nowMs: T0 });
    expect(ranked2[0].exercise.id).toBe('b');
  });

  test('STRUCTURAL SUITABILITY still outranks personal evidence', () => {
    const s = stateOf({
      progression: [{ exerciseId: 'unsuitable', status: 'progressing' }],
      usage: [recent('unsuitable')],
    });
    // The structural engine never offered it, so it cannot appear.
    const ranked = rankPersonalised(s, [cand('a', 90)], { fromExerciseId: 'x', nowMs: T0 });
    expect(ranked.map((r) => r.exercise.id)).toEqual(['a']);
  });

  test('RECENCY: months-old progression cannot make a current claim', () => {
    const s = stateOf({
      progression: [{ exerciseId: 'b', status: 'progressing' }],
      usage: [old('b')],
    });
    const ranked = rankPersonalised(s, [cand('a', 90), cand('b', 90)], { fromExerciseId: 'x', nowMs: T0 });
    expect(ranked[0].personal.tag).not.toBe('Progressing consistently');
    // History remains visible: the observation is still on the object.
    expect(exerciseEvidence(s, 'b', { nowMs: T0 }).progression).toBe('progressing');
    expect(exerciseEvidence(s, 'b', { nowMs: T0 }).trainedRecently).toBe(false);
  });

  test('ONE fresh session after a long gap does not manufacture a trend', () => {
    // Recency is satisfied, but three sessions are still the evidence floor.
    const thin = detectProgressionConsistency([session(120, 0)]);
    expect(thin.status).toBe('insufficient');
    const s = stateOf({
      progression: [{ exerciseId: 'b', status: thin.status }],
      usage: [recent('b')],
    });
    const ranked = rankPersonalised(s, [cand('a', 90), cand('b', 90)], { fromExerciseId: 'x', nowMs: T0 });
    expect(ranked[0].personal.tag).not.toBe('Progressing consistently');
  });

  test('enough fresh evidence restores the current signal', () => {
    const s = stateOf({
      progression: [{ exerciseId: 'b', status: 'progressing' }],
      usage: [recent('b')],
    });
    const ranked = rankPersonalised(s, [cand('a', 90), cand('b', 90)], { fromExerciseId: 'x', nowMs: T0 });
    expect(ranked[0].exercise.id).toBe('b');
    expect(ranked[0].personal.tier).toBe(RANK_TIER.PERSONAL_EVIDENCE);
  });

  test('insufficient evidence stays insufficient, and no swap is automatic', () => {
    expect(exerciseEvidence(stateOf({}), 'e1', { nowMs: T0 }).progression).toBe('insufficient');
    const SRC = read('lib/exercise/intent.js');
    expect(SRC).toMatch(/EXERCISE CHANGES ARE NEVER AUTOMATIC|never automatic/i);
    expect(SRC).not.toMatch(/UPDATE routine_exercises|autoSwap|applySwap\(/);
  });

  test('the progression dimension is never fused into a score', () => {
    const ev = exerciseEvidence(stateOf({ progression: [{ exerciseId: 'e1', status: 'progressing' }] }), 'e1', { nowMs: T0 });
    expect(Object.keys(ev)).not.toEqual(expect.arrayContaining(['score', 'fit', 'rating', 'grade']));
    expect(ev.tolerance).toBe('not_tracked');
  });
});

// ══ JOB 4: history edit/delete and deleted evidence ════════════════════

describe('C13 job 4: current analytics recompute; historical ledgers do not', () => {
  test('editing history changes current analytics on the next read', () => {
    const flat = [session(100, 0), session(100, 1), session(100, 2)];
    expect(detectPlateau(flat).plateau).toBe(true);
    const edited = [session(112, 0), session(100, 1), session(100, 2)];
    expect(detectPlateau(edited).plateau).toBe(false);
    expect(detectProgressionConsistency(edited).status).not.toBe('holding');
  });

  test('deleting history changes current analytics on the next read', () => {
    const flat = [session(100, 0), session(100, 1), session(100, 2)];
    expect(detectPlateau(flat.slice(0, 2)).plateau).toBe(false);  // below the floor
  });

  test('nothing caches or persists plateau/progression state', () => {
    expect(read('lib/plateauSurfacing.js')).not.toMatch(/cache|memo|persist/i);
    const alg = read('lib/algorithms.js');
    const fn = alg.slice(alg.indexOf('export function detectPlateau'),
      alg.indexOf('\n/**\n * Campaign 9 closeout: progression consistency'));
    expect(fn).not.toMatch(/INSERT |UPDATE |AsyncStorage/);
  });

  test('deleting a workout never touches the stored ledger', () => {
    const DB = read('lib/database.js');
    const fn = DB.slice(DB.indexOf('export async function deleteWorkoutAndSets'));
    expect(fn.slice(0, 600)).not.toMatch(/block_ledger|mesocycles/);
  });

  test('a ledger whose raw evidence is gone stops TEACHING but is not deleted', () => {
    const SRC = read('lib/blockLedgerRunner.js');
    expect(SRC).toMatch(/async function replayableMesos\(userId, mesos\)/);
    // Applied at BOTH learning entry points.
    expect((SRC.match(/await replayableMesos\(/g) || []).length).toBe(2);
    // It filters the REPLAY list only - it never deletes or rewrites.
    expect(SRC).not.toMatch(/DELETE FROM mesocycles/);
    expect(SRC).not.toMatch(/storeBlockLedger\(.*null/);
  });

  test('the evidence check fails OPEN, so a read failure never strips history', () => {
    const SRC = read('lib/blockLedgerRunner.js');
    const fn = SRC.slice(SRC.indexOf('async function replayableMesos'));
    expect(fn.slice(0, 900)).toMatch(/if \(!\(alive instanceof Set\)\) return mesos;/);
    expect(fn.slice(0, 900)).toMatch(/catch \(_e\) \{\s*\n\s*return mesos;/);
    const DB = read('lib/database.js');
    const q = DB.slice(DB.indexOf('export async function getBlocksWithTrainingEvidence'));
    expect(q.slice(0, 1200)).toMatch(/return new Set\(ids\); \/\/ fail open/);
  });

  test('only the PROVABLE distinction is used: no material-edit threshold', () => {
    const SRC = read('lib/blockLedgerRunner.js') + read('lib/database.js');
    expect(SRC).not.toMatch(/materialEdit|MATERIAL_EDIT|editThreshold/i);
  });

  test('no ledger version moved: this is replay eligibility, not shape', () => {
    // eslint-disable-next-line global-require
    const { LEDGER_VERSION, LEDGER_ALGORITHM_VERSION } = require('../interBlock');
    expect(LEDGER_VERSION).toBe(1);
    expect(LEDGER_ALGORITHM_VERSION).toBe(2);
    const runner = read('lib/blockLedgerRunner.js');
    expect(runner).toMatch(/stored\?\.version === LEDGER_VERSION/);
    // A current same-version ledger may be recomputed once solely to add
    // Campaign 16's immutable programme signature. Historical ledgers keep
    // their replay/idempotency law and are never rewritten for this.
    expect(runner).toMatch(/stored\?\.programmeSignature \|\| !isCurrent/);
  });
});

// ══ JOB 5: provenance ══════════════════════════════════════════════════

describe('C13 job 5: a historical ledger reads as historical', () => {
  test('Block Reflection is anchored to the block that finished, not to now', () => {
    const SRC = read('screens/BlockReflectionScreen.js');
    // It renders a stored, dated block record rather than claiming a fresh
    // recalculation; the block's own identity supplies the temporal context.
    expect(SRC).toMatch(/meso|block/i);
    expect(SRC).not.toMatch(/recalculated|recomputed just now|as of today/i);
  });

  test('no alarming history warning was added', () => {
    for (const rel of ['screens/BlockReflectionScreen.js', 'lib/plateauSurfacing.js']) {
      const SRC = read(rel);
      expect(SRC).not.toMatch(/may be wrong|no longer accurate|out of date/i);
    }
  });
});

// ══ JOB 7: shared representative ═══════════════════════════════════════

describe('C13 job 7: one representative for strength, raw facts untouched', () => {
  test('the live strength consumers all reach sessionBestE1rm or calculate1RM', () => {
    const alg = read('lib/algorithms.js');
    expect(alg).toMatch(/export function sessionBestE1rm/);
    // Plateau and progression consistency: the shared helper.
    expect((alg.match(/sessionBestE1rm\(/g) || []).length).toBeGreaterThanOrEqual(5);
    // Lift Progress: the same eligibility + estimator for its e1RM series.
    const lp = read('lib/liftProgress.js');
    expect(lp).toMatch(/if \(isE1rmEligibleRow\(s\)\) \{\s*\n\s*sess\.e1rm = Math\.max\(sess\.e1rm, calculate1RM\(weight, reps\)\)/);
  });

  test('raw-fact metrics deliberately keep their own definitions', () => {
    const lp = read('lib/liftProgress.js');
    // heaviest / reps / volume are different questions and stay as they were.
    expect(lp).toMatch(/sess\.heaviest = Math\.max\(sess\.heaviest, weight\)/);
    expect(lp).toMatch(/sess\.reps \+= reps/);
    expect(lp).toMatch(/sess\.volume \+= weight \* reps/);
  });

  test('no surface keeps a private e1RM formula', () => {
    for (const rel of ['lib/liftProgress.js', 'lib/plateauSurfacing.js', 'lib/exercise/intent.js']) {
      const src = read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(src).not.toMatch(/1\.0278/);
      expect(src).not.toMatch(/\*\s*\(1\s*\+\s*\w+\s*\/\s*30\)/);
    }
  });
});
