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
 *    every branch the Progress landing's Visual pillar can render.
 */
import { computeTrainingPillarSummary, buildVisualPillarCopy } from '../pillars';

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
    expect(summary).toEqual({ trainedCount: 0, improvedCount: 0, namedBests: [] });
  });

  test('FQ-7: a single first-ever set is a baseline, never a best', () => {
    const sets = [set(1, { weight: 100 })];
    const summary = computeTrainingPillarSummary(sets, EX_MAP, { now: NOW });
    expect(summary.trainedCount).toBe(1);
    expect(summary.improvedCount).toBe(0);
    expect(summary.namedBests).toEqual([]);
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
  });
});

describe('buildVisualPillarCopy', () => {
  test('no scan ever (state G): honest empty state with the single next action', () => {
    // Re-pinned 2026-08-17 (founder device order): the empty state names
    // the feature in the user's words ("progress photos"), not the
    // capture-flow word "scan" a brand-new user has not met yet.
    const copy = buildVisualPillarCopy({ hasScan: false, hasNote: false, packet: null, capturedAt: null });
    expect(copy.state).toBe('No photos yet');
    expect(copy.evidence).toMatch(/first progress photos/i);
  });

  test('scan exists but confidence too low for a note: distinct from "never scanned"', () => {
    const copy = buildVisualPillarCopy({ hasScan: true, hasNote: false, packet: null, capturedAt: NOW });
    expect(copy.state).not.toBe('No photos yet');
    expect(copy.evidence).toMatch(/retake/i);
  });

  test('not_comparable status: kept as a record, not evidence', () => {
    const copy = buildVisualPillarCopy({
      hasScan: true, hasNote: true, capturedAt: NOW,
      packet: { status: 'not_comparable', eligibleForAssessment: false, trendWindow: { count: 1 }, confidenceTier: 'high' },
    });
    expect(copy.state).toMatch(/not comparable/i);
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
    expect(copy.evidence).toBe('Leaner across your last 4 comparable scans, moderate confidence.');
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
    expect(copy.evidence).toBe('Fuller across your last 5 comparable scans, high confidence.');
  });

  test('not yet eligible (baseline / thin window): honest immature state with a remaining-scan count', () => {
    const copy = buildVisualPillarCopy({
      hasScan: true, hasNote: true, capturedAt: NOW,
      packet: { status: 'baseline', eligibleForAssessment: false, trendWindow: { count: 1 }, confidenceTier: 'moderate' },
    });
    expect(copy.state).toBe('Building your visual trend');
    expect(copy.evidence).toMatch(/2 more comparable scans/);
  });
});
