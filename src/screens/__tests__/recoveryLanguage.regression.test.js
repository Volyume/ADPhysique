/**
 * Task 2 — recovery/freshness UI factual-language amendment.
 *
 * Regression guard (repo convention: fs.readFileSync + regex, locking a
 * founder rule at the source level). Multiple surfaces used to independently
 * infer biological recovery/readiness from elapsed time alone
 * (ReadinessCards.js, VolumeHeatmapScreen.js, the now-deleted
 * muscleRecovery.js) and label it Ready/Nearly ready/Recovering/Fresh, or a
 * recovery "window". Volyume has no biological recovery signal to back any
 * of those claims. This pins that the exact removed verdict-label code
 * shapes cannot silently come back, that both consumers route through the
 * single shared trainingRecency() authority, and that the duplicate
 * muscleRecovery.js module is gone rather than left as dead code.
 *
 * Deliberately matches the exact `label: '...'` / `return '...'`
 * object-literal shapes the old banding code produced, NOT bare English
 * words - ReadinessCards.js legitimately still says "Fresh" as one point on
 * an unrelated 1-5 self-reported soreness scale (real athlete-entered data,
 * not a time-based inference), and this file's own comments document the
 * removed terms for context. A bare-word scan would false-positive on both.
 */
const fs = require('fs');
const path = require('path');

const READINESS_CARDS = fs.readFileSync(
  path.resolve(__dirname, '../../components/ReadinessCards.js'), 'utf8',
);
const VOLUME_HEATMAP = fs.readFileSync(
  path.resolve(__dirname, '../VolumeHeatmapScreen.js'), 'utf8',
);

// The exact removed code shapes - each was a time-only readiness/freshness
// verdict, never a legitimate athlete-reported value.
const FORBIDDEN_VERDICT_PATTERNS = [
  /label: ['"]Ready['"]/,
  /label: ['"]Nearly ready['"]/,
  /label: ['"]Recovering['"]/,
  /label: ['"]Just trained['"]/,
  /label: ['"]Fresh['"]/,
  /recovery window/i,
  /recovery percentage/i,
];

describe('ReadinessCards.js carries no biological-inference readiness verdict', () => {
  for (const term of FORBIDDEN_VERDICT_PATTERNS) {
    test(`does not contain ${term}`, () => {
      expect(READINESS_CARDS).not.toMatch(term);
    });
  }

  // RE-ANCHORED under D214 (lane 2, RC-1 to RC-3): the self-report ratings
  // are still athlete-entered data and still say what they said, but they are
  // now drawn on their TRUE scales in each scale's own words: soreness 1-3
  // (fresh, mild, sore), fatigue 1-5 (fresh, mild, moderate, high,
  // exhausted), joint discomfort 0-3 (none, slight, moderate, significant).
  // The "Low / Fresh" band of the old shifted 2-4 display is gone with it.
  test('the legitimate soreness/fatigue/joint self-report scales are drawn in their own words (not what this amendment targets)', () => {
    // Confirms the guard above isn't accidentally passing because the words
    // were removed - they are real athlete-entered data and stay.
    expect(READINESS_CARDS).toMatch(/return 'fresh'/);
    expect(READINESS_CARDS).toMatch(/\['fresh', 'mild', 'moderate', 'high', 'exhausted'\]/);
    expect(READINESS_CARDS).toMatch(/'significant'/);
    expect(READINESS_CARDS).not.toMatch(/'Low \/ Fresh'/);
  });

  // The shared trainingRecency() authority now reads in the list that names
  // the muscle's recency (MuscleRecoveryList: the row's "Trained N days ago"
  // meta line and the "No session in the last 14 days" line), not in
  // ReadinessCards, whose inline Training-recency chips were replaced.
  test('reads the shared trainingRecency() authority, not an inline band', () => {
    const LIST = fs.readFileSync(path.resolve(__dirname, '../../components/MuscleRecoveryList.js'), 'utf8');
    expect(LIST).toMatch(/import \{ trainingRecency \} from '\.\.\/lib\/trainingRecency';/);
    expect(LIST).toMatch(/trainingRecency\(lastTrainedAt \?\? entry\.lastSessionEndMs, nowMs\)/);
    expect(LIST).toMatch(/trainingRecency\(freshness\?\.\[key\], nowMs\)/);
    expect(READINESS_CARDS).not.toMatch(/freshnessDisplay|buildFreshnessDisplay|Training recency/);
  });

  test('the missing-evidence-as-Ready defect is gone: no lastTrainedAt falsy check returns a positive verdict', () => {
    expect(READINESS_CARDS).not.toMatch(/if \(!lastTrainedAt\) return \{ label: 'Ready'/);
  });
});

describe('VolumeHeatmapScreen.js carries no biological-inference freshness verdict', () => {
  for (const term of FORBIDDEN_VERDICT_PATTERNS) {
    test(`does not contain ${term}`, () => {
      expect(VOLUME_HEATMAP).not.toMatch(term);
    });
  }

  test('reads the shared trainingRecency() authority, not the deleted muscleRecovery.js', () => {
    expect(VOLUME_HEATMAP).toMatch(/import \{ trainingRecency \} from '\.\.\/lib\/trainingRecency';/);
    expect(VOLUME_HEATMAP).not.toMatch(/muscleRecovery/);
    expect(VOLUME_HEATMAP).not.toMatch(/freshnessBand/);
  });
});

describe('muscleRecovery.js is deleted, not left as an unused duplicate authority', () => {
  test('the module no longer exists on disk', () => {
    const p = path.resolve(__dirname, '../../lib/muscleRecovery.js');
    expect(fs.existsSync(p)).toBe(false);
  });

  test('nothing under src imports it any more', () => {
    // Pure fs walk rather than shelling out (execSync destabilised the wider
    // Jest run in a full-suite pass, likely a worker-scheduling interaction
    // from a synchronous child_process call - no other guard test in this
    // repo spawns a subprocess, they all read files directly).
    const SRC = path.resolve(__dirname, '../../..', 'src');
    const SELF = path.resolve(__dirname, 'recoveryLanguage.regression.test.js');
    const offenders = [];
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!entry.name.endsWith('.js') || full === SELF) continue;
        // This test file's own source names the pattern being searched for,
        // in a comment above - excluded by path, not by content, so a real
        // future import elsewhere is never silently skipped.
        const contents = fs.readFileSync(full, 'utf8');
        if (/from ['"].*muscleRecovery['"]/.test(contents)) offenders.push(full);
      }
    }(SRC));
    expect(offenders).toEqual([]);
  });
});
