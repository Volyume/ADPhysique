/**
 * pillars.js — Campaign 23 (PROGRESS-UX-SPEC.md §8/§16/§21/§22 R2) Answer
 * Block view-model builders.
 *
 * What this suite pins and why:
 *  - computeTrainingPillarSummary's PR dedup is per-exercise-PER-DAY (§28
 *    IA-3: "a per-exercise-per-day dedup is required for any surfaced count
 *    so repeated small record events within one session cannot inflate it")
 *    -- one counted best per exercise per local day, never more, even if a
 *    session logs several progressively heavier top sets;
 *  - the FQ-7 baseline rule survives (first-ever exposure is never a best);
 *  - trainedCount/improvedCount only ever count weight_reps exercises;
 *  - buildVisualPillarCopy never invents a comparison-to-weight-trend
 *    classification (packet.assessment is deliberately not read) and covers
 *    every branch the Progress landing's Visual pillar can render;
 *  - D214 lane 3 (PR-3, PR-8): an exercise's first local DAY is its baseline
 *    (every set of it included), an exercise trained on one day only is counted
 *    apart and never in the verdict's "of M", the row's evidence is the new
 *    best on the person's heaviest exercise falling back to the most recent,
 *    and trainingPillarCopy's ladder reads "exercises" (never "lifts"), a
 *    baseline sentence instead of "0 of 0", and facts only (D204).
 *  - RE-ANCHORED D214 addendum 9 (plain-English census, founder order
 *    2026-10-02: "The app needs to be in plain British English that is
 *    understandable and makes sense to humans"): the common term wins on both
 *    rows. Training says "starting point" (not "baseline"), "personal best",
 *    "weighted exercises" (the count only reads weight-and-reps exercises) and
 *    "done more than once" (the denominator is the compared exercises); its
 *    day-zero line describes instead of telling. Progress photos says "photos",
 *    "set of photos", "comparison" (never "scan", "comparable" or
 *    "assessment") and "Looks leaner across your last 3 sets of photos (high
 *    confidence)." Every threshold, count and withhold is unchanged.
 */
import { computeTrainingPillarSummary, buildVisualPillarCopy, trainingPillarCopy } from '../pillars';
import { comparableChainCount } from '../../progressScanChain';

const SCAN_DAY_MS = 24 * 60 * 60 * 1000;

// S7-2a (progress-tab audit second pass, 2026-09-25, register D200 item 7,
// report §8): a real, minimal scan chain, run through the real producer
// (comparableChainCount) -- not a hand-typed trendWindow.count -- so the
// pillar's own text is proven reachable from an actual scan history.
function chainScan(id, day) {
  return {
    id,
    status: 'complete',
    requiredPosesComplete: true,
    capturedAt: day * SCAN_DAY_MS,
    analysisStatus: 'complete',
    qualityLabel: 'good',
    signals: { physiqueAssessment: { visualLeannessScore: 66, scanConfidenceTier: 'moderate' } },
    assets: [
      { pose: 'front', lightingScore: 0.7, framingScore: 0.88, segmentationConfidence: 0.9, cameraTiltDegrees: 0 },
      { pose: 'back', lightingScore: 0.7, framingScore: 0.88, segmentationConfidence: 0.9, cameraTiltDegrees: 0 },
    ],
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-15T12:00:00Z').getTime();

function set(daysAgo, { weight = 100, reps = 5, exerciseId = 'e1', setType = 'straight', hourOffset = 0 } = {}) {
  return {
    createdAt: NOW - daysAgo * DAY_MS + hourOffset * 3600000,
    weight,
    actualReps: reps,
    exerciseId,
    setType,
  };
}

const EX_MAP = { e1: { name: 'Bench press', type: 'weight_reps' }, e2: { name: 'Squat', type: 'weight_reps' } };

describe('computeTrainingPillarSummary', () => {
  test('no sets: zero trained, zero improved, no named bests', () => {
    const summary = computeTrainingPillarSummary([], EX_MAP, { now: NOW });
    // RE-ANCHORED under D214 lane 3 (PR-3): the summary also carries the compared
    // and baseline counts and the row's featured best, all empty here.
    expect(summary).toEqual({
      trainedCount: 0, improvedCount: 0, comparedCount: 0, baselineCount: 0, namedBests: [], featuredBest: null,
    });
  });

  test('FQ-7: a single first-ever set is a baseline, never a best', () => {
    const sets = [set(1, { weight: 100 })];
    const summary = computeTrainingPillarSummary(sets, EX_MAP, { now: NOW });
    expect(summary.trainedCount).toBe(1);
    expect(summary.improvedCount).toBe(0);
    expect(summary.namedBests).toEqual([]);
    // D214 (PR-3): trained once, so nothing to compare yet.
    expect(summary.comparedCount).toBe(0);
    expect(summary.baselineCount).toBe(1);
  });

  test('a later set beating the baseline counts once, named', () => {
    const sets = [set(20, { weight: 100 }), set(1, { weight: 110 })];
    const summary = computeTrainingPillarSummary(sets, EX_MAP, { now: NOW, windowDays: 30 });
    expect(summary.improvedCount).toBe(1);
    expect(summary.namedBests).toEqual([
      { exerciseId: 'e1', exerciseName: 'Bench press', weight: 110, reps: 5, at: NOW - 1 * DAY_MS, e1rm: expect.any(Number) },
    ]);
  });

  // §28 IA-3: the exact defect this dedup fixes.
  test('per-exercise-per-day dedup: three escalating top sets in one session count as ONE best', () => {
    const sets = [
      set(20, { weight: 90 }), // baseline
      set(1, { weight: 100, hourOffset: 0 }),
      set(1, { weight: 105, hourOffset: 1 }),
      set(1, { weight: 110, hourOffset: 2 }), // same local day, three PR-beating sets
    ];
    const summary = computeTrainingPillarSummary(sets, EX_MAP, { now: NOW, windowDays: 30 });
    expect(summary.improvedCount).toBe(1);
    expect(summary.namedBests).toHaveLength(1);
    // The day's best (highest e1RM), not the first qualifying set.
    expect(summary.namedBests[0].weight).toBe(110);
  });

  test('the same exercise improving on two different days yields two named bests', () => {
    const sets = [
      set(20, { weight: 90 }),
      set(10, { weight: 100 }),
      set(1, { weight: 110 }),
    ];
    const summary = computeTrainingPillarSummary(sets, EX_MAP, { now: NOW, windowDays: 30 });
    expect(summary.namedBests).toHaveLength(2);
  });

  test('warmup/myo_reps/rest_pause sets never set or break the running max', () => {
    const sets = [
      set(20, { weight: 100 }),
      set(1, { weight: 150, setType: 'warmup' }),
      set(1, { weight: 150, setType: 'myo_reps' }),
      set(1, { weight: 150, setType: 'rest_pause' }),
    ];
    const summary = computeTrainingPillarSummary(sets, EX_MAP, { now: NOW, windowDays: 30 });
    expect(summary.improvedCount).toBe(0);
  });

  test('only weight_reps exercises are counted (distance/bodyweight excluded)', () => {
    const sets = [
      set(20, { weight: 5000, exerciseId: 'run' }),
      set(1, { weight: 6000, exerciseId: 'run' }),
    ];
    const map = { run: { name: 'Run', type: 'distance' } };
    const summary = computeTrainingPillarSummary(sets, map, { now: NOW, windowDays: 30 });
    expect(summary.trainedCount).toBe(0);
    expect(summary.improvedCount).toBe(0);
  });

  test('named bests are capped at 3, most recent first', () => {
    const sets = [set(40, { weight: 50 })];
    for (let i = 30; i >= 1; i -= 5) {
      sets.push(set(i, { weight: 50 + (31 - i) }));
    }
    const summary = computeTrainingPillarSummary(sets, EX_MAP, { now: NOW, windowDays: 45 });
    expect(summary.namedBests.length).toBeLessThanOrEqual(3);
    // strictly descending `at` (most recent first)
    for (let i = 1; i < summary.namedBests.length; i++) {
      expect(summary.namedBests[i].at).toBeLessThan(summary.namedBests[i - 1].at);
    }
  });

  test('trainedCount reflects exercises with a qualifying set in the window, independent of improvement', () => {
    // Two exercises trained this window; only one improves.
    const sets = [
      set(20, { weight: 100, exerciseId: 'e1' }),
      set(1, { weight: 90, exerciseId: 'e1' }), // trained, did not beat the baseline
      set(1, { weight: 60, exerciseId: 'e2' }), // first-ever exposure: baseline only
    ];
    const summary = computeTrainingPillarSummary(sets, EX_MAP, { now: NOW, windowDays: 30 });
    expect(summary.trainedCount).toBe(2);
    expect(summary.improvedCount).toBe(0);
    // D214 (PR-3): e1 has a second day to compare, e2 is on its first day only.
    expect(summary.comparedCount).toBe(1);
    expect(summary.baselineCount).toBe(1);
  });
});

// D214 lane 3, PR-3 (progress audit 2026-10-01): the baseline is the exercise's
// first local DAY, every set of it included, never its first set.
describe('computeTrainingPillarSummary: the first-day baseline (PR-3)', () => {
  test('the audit probe: a first-ever session ramping 60 x 8, 65 x 8, 70 x 6 is a baseline, never a new best', () => {
    const sets = [
      set(1, { weight: 60, reps: 8, hourOffset: 0 }),
      set(1, { weight: 65, reps: 8, hourOffset: 0.1 }),
      set(1, { weight: 70, reps: 6, hourOffset: 0.2 }),
    ];
    const summary = computeTrainingPillarSummary(sets, EX_MAP, { now: NOW });
    expect(summary.improvedCount).toBe(0);
    expect(summary.namedBests).toEqual([]);
    expect(summary.featuredBest).toBeNull();
    expect(summary.trainedCount).toBe(1);
    expect(summary.comparedCount).toBe(0);
    expect(summary.baselineCount).toBe(1);
  });

  test('every set of the first day sets the bar: a later day must beat the first day\'s BEST, not its first set', () => {
    const sets = [
      set(10, { weight: 100, reps: 5, hourOffset: 0 }),
      set(10, { weight: 110, reps: 5, hourOffset: 0.2 }), // same first day, heavier
      set(2, { weight: 105, reps: 5 }), // beats the first set only
    ];
    const summary = computeTrainingPillarSummary(sets, EX_MAP, { now: NOW });
    expect(summary.improvedCount).toBe(0);
    expect(summary.comparedCount).toBe(1); // a second day exists: compared, not improved
    expect(summary.baselineCount).toBe(0);
  });

  test('a first day inside the window and a later day that beats it: one exercise up, compared', () => {
    const sets = [
      set(10, { weight: 100, reps: 5 }),
      set(2, { weight: 110, reps: 5 }),
    ];
    const summary = computeTrainingPillarSummary(sets, EX_MAP, { now: NOW });
    expect(summary.improvedCount).toBe(1);
    expect(summary.comparedCount).toBe(1);
    expect(summary.baselineCount).toBe(0);
    expect(summary.namedBests[0].weight).toBe(110);
  });

  test('a baseline day before the window and a day inside it: compared, and a new best counts', () => {
    const sets = [
      set(60, { weight: 100, reps: 5 }),
      set(3, { weight: 120, reps: 5 }),
    ];
    const summary = computeTrainingPillarSummary(sets, EX_MAP, { now: NOW, windowDays: 30 });
    expect(summary.trainedCount).toBe(1);
    expect(summary.comparedCount).toBe(1);
    expect(summary.improvedCount).toBe(1);
  });

  test('exercises on their first day only are counted apart and never in the verdict denominator', () => {
    const sets = [
      set(20, { weight: 100, exerciseId: 'e1' }), set(1, { weight: 110, exerciseId: 'e1' }), // compared, up
      set(1, { weight: 80, exerciseId: 'e2' }), // first day only
    ];
    const summary = computeTrainingPillarSummary(sets, EX_MAP, { now: NOW });
    expect(summary.trainedCount).toBe(2);
    expect(summary.comparedCount).toBe(1);
    expect(summary.baselineCount).toBe(1);
    expect(summary.improvedCount).toBe(1);
  });
});

// D214 lane 3, PR-8: the row's evidence is the new best on the person's HEAVIEST
// exercise in the window, falling back to the most recent new best.
describe('computeTrainingPillarSummary: the featured best (PR-8)', () => {
  const MAP3 = {
    e1: { name: 'Curl', type: 'weight_reps' },
    e2: { name: 'Squat', type: 'weight_reps' },
    e3: { name: 'Row', type: 'weight_reps' },
  };

  test('the heaviest exercise\'s new best, not the most recent one', () => {
    const sets = [
      set(20, { weight: 140, reps: 5, exerciseId: 'e2' }), set(12, { weight: 150, reps: 5, exerciseId: 'e2' }), // heavy, earlier
      set(20, { weight: 20, reps: 8, exerciseId: 'e1' }), set(1, { weight: 22, reps: 8, exerciseId: 'e1' }), // light, most recent
    ];
    const summary = computeTrainingPillarSummary(sets, MAP3, { now: NOW });
    expect(summary.namedBests[0].exerciseId).toBe('e1'); // the most recent best is the curl
    expect(summary.featuredBest.exerciseId).toBe('e2'); // the evidence is the squat
    expect(summary.featuredBest.weight).toBe(150);
  });

  test('falls back to the most recent new best when the heaviest exercise has none', () => {
    const sets = [
      set(20, { weight: 150, reps: 5, exerciseId: 'e2' }), set(5, { weight: 140, reps: 5, exerciseId: 'e2' }), // heaviest, no new best
      set(20, { weight: 20, reps: 8, exerciseId: 'e1' }), set(1, { weight: 22, reps: 8, exerciseId: 'e1' }),
    ];
    const summary = computeTrainingPillarSummary(sets, MAP3, { now: NOW });
    expect(summary.featuredBest.exerciseId).toBe('e1');
    expect(summary.featuredBest).toBe(summary.namedBests[0]);
  });

  test('falls back when the heaviest exercise is on its first day only', () => {
    const sets = [
      set(2, { weight: 200, reps: 3, exerciseId: 'e2' }), // heaviest, baseline only
      set(20, { weight: 20, reps: 8, exerciseId: 'e1' }), set(1, { weight: 22, reps: 8, exerciseId: 'e1' }),
    ];
    const summary = computeTrainingPillarSummary(sets, MAP3, { now: NOW });
    expect(summary.featuredBest.exerciseId).toBe('e1');
  });

  test('no new best anywhere: no featured best', () => {
    const sets = [set(20, { weight: 100 }), set(1, { weight: 90 })];
    expect(computeTrainingPillarSummary(sets, EX_MAP, { now: NOW }).featuredBest).toBeNull();
  });

  test('the pick does not depend on the order the sets arrive in', () => {
    const sets = [
      set(20, { weight: 140, reps: 5, exerciseId: 'e2' }), set(12, { weight: 150, reps: 5, exerciseId: 'e2' }),
      set(20, { weight: 20, reps: 8, exerciseId: 'e1' }), set(1, { weight: 22, reps: 8, exerciseId: 'e1' }),
    ];
    const forward = computeTrainingPillarSummary(sets, MAP3, { now: NOW });
    const reversed = computeTrainingPillarSummary([...sets].reverse(), MAP3, { now: NOW });
    expect(reversed.featuredBest).toEqual(forward.featuredBest);
  });
});

// D214 lane 3: the Training row's state ladder, moved into pillars.js so the
// verdict words, the first-day baseline and "never 0 of 0" are pinned without a
// mount. Every rung describes (D204).
describe('trainingPillarCopy: the ladder', () => {
  const summary = (over = {}) => ({
    trainedCount: 4, improvedCount: 2, comparedCount: 4, baselineCount: 0, namedBests: [], featuredBest: null, ...over,
  });
  const best = { exerciseId: 'e1', exerciseName: 'Bench press', weight: 82.5, reps: 5, at: NOW, e1rm: 96 };
  const copy = (over = {}) => trainingPillarCopy({
    completedWorkoutCount: 6, summary: summary(), lastSessionAt: NOW - 3 * DAY_MS, unitsLabel: 'kg', now: NOW, ...over,
  });

  test('no completed session: a description of what starts the row, not an instruction (P1)', () => {
    expect(copy({ completedWorkoutCount: 0 })).toEqual({
      state: 'No sessions logged yet', evidence: 'Your training history starts with your first session.',
    });
    expect(copy({ completedWorkoutCount: 0 }).evidence).not.toMatch(/\b(log|start|take|add|try|keep)\b/i);
  });

  test('nothing strength-trained in the window says so and states the last session as a fact', () => {
    const none = summary({ trainedCount: 0, improvedCount: 0, comparedCount: 0 });
    // P9 (addendum 9): only weight-and-reps exercises count, so a month of
    // bodyweight or cardio work reads "weighted exercises", not "strength training".
    expect(copy({ summary: none, lastSessionAt: NOW }).state).toBe('No weighted exercises logged in the last 30 days');
    expect(copy({ summary: none, lastSessionAt: NOW }).evidence).toBe('Last session today');
    expect(copy({ summary: none, lastSessionAt: NOW - DAY_MS }).evidence).toBe('Last session yesterday');
    expect(copy({ summary: none, lastSessionAt: NOW - 12 * DAY_MS }).evidence).toBe('Last session 12 days ago');
    expect(copy({ summary: none, lastSessionAt: null }).evidence).toBeNull();
  });

  test('PR-3: only first days in the window reads a baseline sentence, never "0 of 0"', () => {
    const baseline = summary({ trainedCount: 4, improvedCount: 0, comparedCount: 0, baselineCount: 4 });
    const out = copy({ summary: baseline });
    expect(out.state).toBe('Starting point set on 4 exercises');
    expect(out.evidence).toBe('Strength changes show once an exercise has been trained on two different days.');
    expect(`${out.state} ${out.evidence}`).not.toMatch(/\bof 0\b|0 of/);
    expect(copy({ summary: summary({ trainedCount: 1, improvedCount: 0, comparedCount: 0, baselineCount: 1 }) }).state)
      .toBe('Starting point set on 1 exercise');
    // "Baseline" is gym-science vocabulary (0.12): the row never says it.
    expect(`${out.state} ${out.evidence}`).not.toMatch(/baseline/i);
  });

  test('a new best on a compared exercise: "Strength up on N of M exercises", the evidence the featured best', () => {
    const out = copy({ summary: summary({ improvedCount: 9, comparedCount: 9, trainedCount: 9, featuredBest: best }) });
    // 6.6: the denominator is the exercises done on more than one day, and the
    // sentence says so. 0.13 / 6.12: the reps in words, "a new personal best".
    expect(out.state).toBe('Strength up on 9 of 9 exercises done more than once in the last 30 days');
    expect(out.evidence).toBe('Bench press 82.5 kg for 5 reps, a new personal best.');
  });

  test('one rep is singular in the evidence, and the line has no "x 5" shorthand or "best" alone', () => {
    const one = copy({ summary: summary({ featuredBest: { ...best, reps: 1, weight: 140 } }) });
    expect(one.evidence).toBe('Bench press 140 kg for 1 rep, a new personal best.');
    const out = copy({ summary: summary({ featuredBest: best }) });
    expect(out.evidence).not.toMatch(/ x \d|, new best/);
  });

  test('the denominator is the compared exercises, and one exercise is singular', () => {
    expect(copy({ summary: summary({ trainedCount: 7, improvedCount: 3, comparedCount: 5, baselineCount: 2, featuredBest: best }) }).state)
      .toBe('Strength up on 3 of 5 exercises done more than once in the last 30 days');
    expect(copy({ summary: summary({ trainedCount: 1, improvedCount: 1, comparedCount: 1, featuredBest: best }) }).state)
      .toBe('Strength up on 1 of 1 exercise done more than once in the last 30 days');
  });

  test('the word "lift" is never the shorthand, in any rung', () => {
    const rungs = [
      copy({ completedWorkoutCount: 0 }),
      copy({ summary: summary({ trainedCount: 0, improvedCount: 0, comparedCount: 0 }) }),
      copy({ summary: summary({ improvedCount: 0, comparedCount: 0, baselineCount: 4 }) }),
      copy({ summary: summary({ featuredBest: best }) }),
      copy({ summary: summary({ improvedCount: 0 }) }),
    ];
    for (const r of rungs) expect(`${r.state} ${r.evidence}`).not.toMatch(/\blifts?\b/i);
  });

  test('compared but none up: "holding steady" with the last session as a fact, no instruction', () => {
    const out = copy({ summary: summary({ improvedCount: 0 }), lastSessionAt: NOW - 2 * DAY_MS });
    // RE-ANCHORED D214 addendum 6 (lane 3 review N3): no "holding steady" claim.
    // RE-ANCHORED addendum 9 (0.13): "personal bests", the common term.
    expect(out.state).toBe('No new personal bests in the last 30 days');
    expect(out.evidence).toBe('Last session 2 days ago');
    expect(`${out.state} ${out.evidence}`).not.toMatch(/keep|build|should|try|aim|consider/i);
  });

  test('the evidence follows the person\'s units', () => {
    const lbs = copy({ unitsLabel: 'lbs', summary: summary({ featuredBest: { ...best, weight: 185 } }) });
    expect(lbs.evidence).toBe('Bench press 185 lbs for 5 reps, a new personal best.');
  });

  test('the window is a rolling 30 days, never a month (S6-4)', () => {
    const out = copy({ summary: summary({ featuredBest: best }) });
    expect(out.state).not.toMatch(/month/i);
  });
});

describe('buildVisualPillarCopy', () => {
  test('no scan ever (state G): honest empty state with the single next action', () => {
    // Re-pinned 2026-08-17 (founder device order): the empty state names
    // the feature in the user's words ("progress photos"), not the
    // capture-flow word "scan" a brand-new user has not met yet.
    const copy = buildVisualPillarCopy({ hasScan: false, hasNote: false, packet: null, capturedAt: null });
    expect(copy.state).toBe('No photos yet');
    // RE-ANCHORED addendum 9 (P2, D204): a description of what starts the row.
    expect(copy.evidence).toBe('Your photo comparison starts with your first set of progress photos.');
    expect(copy.evidence).not.toMatch(/\b(take|start tracking)\b/i);
  });

  test('scan exists but confidence too low for a note: distinct from "never scanned"', () => {
    const copy = buildVisualPillarCopy({ hasScan: true, hasNote: false, packet: null, capturedAt: NOW });
    // RE-ANCHORED addendum 9 (0.11, P3): photos, never "scan"; the line says
    // what happened to the set and no longer tells the person to retake it.
    expect(copy.state).toBe('Latest photos were not clear enough');
    expect(copy.evidence).toBe('They could not be compared with your earlier photos.');
    expect(copy.evidence).not.toMatch(/retake/i);
  });

  test('not_comparable status: kept as a record, not evidence', () => {
    const copy = buildVisualPillarCopy({
      hasScan: true, hasNote: true, capturedAt: NOW,
      packet: { status: 'not_comparable', eligibleForAssessment: false, trendWindow: { count: 1 }, confidenceTier: 'high' },
    });
    // RE-ANCHORED addendum 9 (0.11): "Latest set of photos could not be compared".
    expect(copy.state).toBe('Latest set of photos could not be compared');
    expect(copy.state).not.toMatch(/comparable|scan/i);
  });

  // RE-PINNED (lead amendment, Stage 2 review): the earlier draft anchored
  // "since <month>" to the LATEST scan's capture date, but the change is
  // since the comparison BASELINE, whose date the bounded summary does not
  // carry — naming the wrong endpoint is false precision (§25 copy law).
  // The claim now anchors to the comparable-scan count, which IS known.
  test('eligible + leaner direction: states the count and the confidence tier, never a date it cannot know, never a weight-trend comparison', () => {
    const copy = buildVisualPillarCopy({
      hasScan: true, hasNote: true, capturedAt: new Date('2026-06-01T00:00:00Z').getTime(),
      packet: {
        status: 'valid', eligibleForAssessment: true, confidenceTier: 'moderate',
        trendWindow: { count: 4, direction: 'down', comparableOnly: true },
        assessment: 'supports', // deliberately ignored by the copy builder
      },
    });
    expect(copy.state).toBe('Visible change');
    // RE-ANCHORED addendum 9 (0.11): "sets of photos", the confidence in brackets.
    expect(copy.evidence).toBe('Looks leaner across your last 4 sets of photos (moderate confidence).');
    expect(copy.state).not.toMatch(/since/i);
  });

  test('eligible + softer direction + high confidence', () => {
    const copy = buildVisualPillarCopy({
      hasScan: true, hasNote: true, capturedAt: NOW,
      packet: {
        status: 'valid', eligibleForAssessment: true, confidenceTier: 'high',
        trendWindow: { count: 5, direction: 'up', comparableOnly: true },
      },
    });
    expect(copy.evidence).toBe('Looks fuller across your last 5 sets of photos (high confidence).');
  });

  test('any other direction reads "steady", and no wording carries "scan", "comparable" or "assessment" (0.11)', () => {
    const steady = buildVisualPillarCopy({
      hasScan: true, hasNote: true, capturedAt: NOW,
      packet: {
        status: 'valid', eligibleForAssessment: true, confidenceTier: 'high',
        trendWindow: { count: 3, direction: 'flat', comparableOnly: true },
      },
    });
    expect(steady.evidence).toBe('Looks steady across your last 3 sets of photos (high confidence).');
    const every = [
      buildVisualPillarCopy({ hasScan: false, hasNote: false, packet: null, capturedAt: null }),
      buildVisualPillarCopy({ hasScan: true, hasNote: false, packet: null, capturedAt: NOW }),
      buildVisualPillarCopy({ hasScan: true, hasNote: true, capturedAt: NOW, packet: { status: 'not_comparable' } }),
      steady,
      buildVisualPillarCopy({ hasScan: true, hasNote: true, capturedAt: NOW, packet: { status: 'baseline', eligibleForAssessment: false, trendWindow: { count: 1 } } }),
      buildVisualPillarCopy({ hasScan: true, hasNote: true, capturedAt: NOW, packet: { status: 'baseline', eligibleForAssessment: false, trendWindow: { count: 2 } } }),
      buildVisualPillarCopy({ hasScan: true, hasNote: true, capturedAt: NOW, packet: { status: 'baseline', eligibleForAssessment: false, trendWindow: { count: 3 } } }),
    ];
    for (const r of every) expect(`${r.state} ${r.evidence}`).not.toMatch(/\bscans?\b|comparable|assessment|visual trend/i);
  });

  // S7-2a: the "across your last N comparable scans" line, previously
  // unreachable forever (scanComparability's per-pair pose count could
  // never clear the evidence chain's >= 3 gate), is now reachable after
  // three REAL comparable scans through the real producer.
  test('reachable after three real comparable scans: the evidence line names the real count', () => {
    const chain = [chainScan('c0', 0), chainScan('c1', 8), chainScan('c2', 16), chainScan('c3', 24)];
    const realCount = comparableChainCount(chain);
    expect(realCount).toBe(3);
    const copy = buildVisualPillarCopy({
      hasScan: true, hasNote: true, capturedAt: NOW,
      packet: {
        status: 'valid', eligibleForAssessment: true, confidenceTier: 'moderate',
        trendWindow: { count: realCount, direction: 'down', comparableOnly: true },
      },
    });
    expect(copy.state).toBe('Visible change');
    expect(copy.evidence).toBe('Looks leaner across your last 3 sets of photos (moderate confidence).');
  });

  test('not yet eligible (baseline / thin window): honest immature state with a remaining-scan count', () => {
    const copy = buildVisualPillarCopy({
      hasScan: true, hasNote: true, capturedAt: NOW,
      packet: { status: 'baseline', eligibleForAssessment: false, trendWindow: { count: 1 }, confidenceTier: 'moderate' },
    });
    // RE-ANCHORED addendum 9 (0.11): "Building your photo comparison" and a
    // denominator in the common words. One set left takes the singular, and the
    // mature-but-not-eligible case ends with the same words.
    expect(copy.state).toBe('Building your photo comparison');
    expect(copy.evidence).toBe('2 more sets of matching photos until your first comparison.');
    const oneLeft = buildVisualPillarCopy({
      hasScan: true, hasNote: true, capturedAt: NOW,
      packet: { status: 'baseline', eligibleForAssessment: false, trendWindow: { count: 2 }, confidenceTier: 'moderate' },
    });
    expect(oneLeft.evidence).toBe('1 more set of matching photos until your first comparison.');
    const none = buildVisualPillarCopy({
      hasScan: true, hasNote: true, capturedAt: NOW,
      packet: { status: 'baseline', eligibleForAssessment: false, trendWindow: { count: 3 }, confidenceTier: 'moderate' },
    });
    expect(none.evidence).toBe('Your next set of matching photos will complete your first comparison.');
  });
});

// D214 addendum 6 (lane 3 review 5): a tie on the heaviest exercise goes to the
// lower exercise id whatever the input order, so the pick never depends on data
// order.
describe('featuredBest tie-break', () => {
  const DAY = 86400000;
  const NOW = Date.UTC(2026, 9, 1, 12);
  const map = { b: { id: 'b', name: 'Bench', type: 'weight_reps' }, a: { id: 'a', name: 'Squat', type: 'weight_reps' } };
  const rows = [
    { exerciseId: 'b', weight: 100, actualReps: 5, createdAt: NOW - 20 * DAY },
    { exerciseId: 'b', weight: 105, actualReps: 5, createdAt: NOW - 2 * DAY },
    { exerciseId: 'a', weight: 100, actualReps: 5, createdAt: NOW - 19 * DAY },
    { exerciseId: 'a', weight: 105, actualReps: 5, createdAt: NOW - 3 * DAY },
  ];
  test('equal heaviest estimates: the lower id is featured in every input order', () => {
    const a = computeTrainingPillarSummary(rows, map, { now: NOW });
    const b = computeTrainingPillarSummary(rows.slice().reverse(), map, { now: NOW });
    expect(a.featuredBest.exerciseId).toBe('a');
    expect(b.featuredBest.exerciseId).toBe('a');
  });
});
