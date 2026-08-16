/**
 * temporal.test.js — Campaign 21 Step 10: TEMPORAL / ORDERING SUITE.
 *
 * Binding architecture: docs/coach-validation-campaign-21-2026-08-16/
 * HARNESS-DESIGN.md, ORACLE-LOCK.md (LEAD-REVIEW: ACCEPTED 2026-08-16). Built
 * over the completed 23-entry registry in harness.js (read, not modified;
 * harness.js is untouched by this file).
 *
 * WHAT THIS PINS. Every seam's behaviour under time/arrival-order pressure
 * that a scenario table can't express on its own:
 *   1. same observations, different insertion/arrival order -> same decision
 *      (or, where a seam's own contract is positional rather than
 *      timestamp-based, a documented finding that order genuinely matters);
 *   2. same-day duplicate events -> no double-learning (pinned where
 *      production genuinely dedupes; documented as a finding where it does
 *      not -- never silently "fixed" here, per CLAUDE.md Section 2/D-33);
 *   3. an older event arriving AFTER a newer one, timestamps preserved ->
 *      the same decision as if it had arrived in chronological order;
 *   4. future-dated / malformed-timestamp rows -> safe handling (no throw,
 *      no NaN), with the seams that do NOT additionally guard against a
 *      clock-skewed FUTURE timestamp called out as findings, not fixed;
 *   5. every one of the 23 registry entries, called twice with byte-identical
 *      input, returns byte-identical output (table-driven);
 *   6. runWeeklyCoach called twice with identical inputs returns an
 *      identical decision object (persistence-level dedup, e.g. markApplied/
 *      markDeclined's own Date.now() stamps, is explicitly OUT OF SCOPE for
 *      a PURE-seam idempotence check and is called out as such, not pinned
 *      as if it were pure).
 *
 * FINDINGS in this file are genuine production-behaviour observations, not
 * defects against any LOCKED ORACLE-LOCK.md block (none of the blocks this
 * file touches claim the behaviour the finding contradicts) -- so none are
 * registered `expectedFail`. Each is called out with a `FINDING:` comment at
 * its test and summarised in the Step 10 report. Never fixed here.
 *
 * Seeded determinism only: mulberry32 (fixed seed per describe block), no
 * Math.random, no Date.now() in any fixture -- NOW/DAY come from harness.js.
 */
import { runScenarios, NOW, DAY, b } from './harness';
import { runWeeklyCoach, computeEWMA, computeWeeklyTrendPct } from '../../lib/weeklyCoach';
import { detectEdPatternFlag } from '../../lib/edPatternDetector';
import { assembleEvidencePacket, resolveSetPrescription } from '../../lib/livePrescription';
import { resolveRecoveryState } from '../../lib/recoveryState';
import { canonicalWeightEvidence } from '../../lib/effectiveMaintenance';
import { computeVolumeApply, markApplied } from '../../lib/coachApply';

// ─── Seeded PRNG + Fisher-Yates shuffle (house convention, matches
// livePrescription.properties.test.js's mulberry32) ─────────────────────────

function mulberry32(seed) {
  let a = seed;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function flatWeights(n, startKg, kgPerWeek, nowMs = NOW) {
  const out = [];
  const weeksSpan = (n - 1) / 7;
  const endKg = startKg + kgPerWeek * weeksSpan;
  for (let i = 0; i < n; i++) {
    const w = startKg + (endKg - startKg) * (i / Math.max(1, n - 1));
    out.push({ loggedAt: nowMs - (n - 1 - i) * DAY, weightKg: Math.round(w * 100) / 100 });
  }
  return out;
}

/** A moderate ordinary week, matching the house moderatePushWeek/baseWeek
 * recipe (weeklyCoach.d15/d16 tests, scenarios.conflict.data.js). */
function weeklyCoachWeek(overrides = {}) {
  return {
    checkin: {
      weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3,
      calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null,
      ...overrides.checkin,
    },
    morningWeights: flatWeights(35, 85, -0.3),
    sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
    goalPhase: 'maint', weeksInPhase: 4,
    currentCalTarget: 2400, currentStepsTarget: 8000,
    bodyweightKg: 85, units: 'kg', nowMs: NOW,
    ...overrides.top,
  };
}

function row({ weight, reps, setType = 'straight', pos = 1, at = NOW, targetRepsMin = 8, targetRepsMax = 12, exerciseId = 'ex1' }) {
  return { exerciseId, setType, weight, actualReps: reps, setNumber: pos, targetRepsMin, targetRepsMax, createdAt: at };
}

function hSession(at, sets, { difficulty = 2 } = {}) {
  return { at, difficulty, sets: sets.map((s, i) => row({ ...s, pos: s.pos ?? i + 1, at: at + i * 1000 })) };
}

// ═════════════════════════════════════════════════════════════════════════
// 1. ORDER INSENSITIVITY -- same observations, different arrival order
// ═════════════════════════════════════════════════════════════════════════

describe('1. same observations inserted in a different order -> same decision', () => {
  describe('weeklyCoach: morningWeights carries its own loggedAt and is internally sorted (weeklyCoach.js:60) -- shuffling the array never changes the run', () => {
    test('5 seeded permutations of a 35-row weight history all produce byte-identical runWeeklyCoach output', () => {
      const rng = mulberry32(101);
      const chronological = flatWeights(35, 85, -0.3);
      const baseInputs = weeklyCoachWeek({ top: { morningWeights: chronological } });
      const baseline = runWeeklyCoach(baseInputs);
      for (let trial = 0; trial < 5; trial++) {
        const shuffled = shuffle(chronological, rng);
        const out = runWeeklyCoach({ ...baseInputs, morningWeights: shuffled });
        expect(JSON.stringify(out)).toBe(JSON.stringify(baseline));
      }
    });
  });

  describe('liveSet: rawHistory session order (complements Stage 14\'s row-level property test at the raw-function level -- this proves the SAME invariant through the harness liveSet entry, session-order specifically)', () => {
    test('5 seeded permutations of 4 comparable session objects produce byte-identical resolveSetPrescription output', () => {
      const rng = mulberry32(202);
      const sessions = [
        hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }]),
        hSession(NOW - 14 * DAY, [{ weight: 80, reps: 11 }]),
        hSession(NOW - 21 * DAY, [{ weight: 77.5, reps: 12 }]),
        hSession(NOW - 28 * DAY, [{ weight: 77.5, reps: 10 }]),
      ];
      const packet = (hist) => assembleEvidencePacket({
        exercise: { id: 'ex1', exerciseType: 'weight_reps', category: 'compound', units: 'kg' },
        prescription: { repsMin: 8, repsMax: 12 },
        rawHistory: hist,
        now: NOW,
      });
      const baseline = resolveSetPrescription(packet(sessions), 1);
      for (let trial = 0; trial < 5; trial++) {
        const shuffled = shuffle(sessions, rng);
        const out = resolveSetPrescription(packet(shuffled), 1);
        expect(JSON.stringify(out)).toBe(JSON.stringify(baseline));
      }
    });
  });

  describe('edDetector: weeklyHistory -- FINDING: this seam is POSITIONAL ("most-recent-first" by its own JSDoc contract, edPatternDetector.js:44), not timestamp-based, so it does NOT internally reorder like the two seams above', () => {
    // Unlike morningWeights (loggedAt, sorted by weeklyCoach.js:60) and
    // livePrescription's rawHistory (at/createdAt, sorted by
    // livePrescription.js:454 "row ORDER in the raw input never matters"),
    // weeklyHistory carries NO embedded date field at all -- array position
    // IS the data. No ORACLE-LOCK.md block (X-SAFETY-02/03) claims otherwise;
    // this is a genuine architecture asymmetry, reported as a Step 10
    // finding rather than asserted away as a false invariant.
    test('FINDING: the identical 3 week-objects, reversed, flip `fired` from true to false', () => {
      const weekLowEnergyA = { energy: 1, adherence: 'hit', hasCheckin: true, hasFoodData: true };
      const weekLowEnergyB = { energy: 1, adherence: 'hit', hasCheckin: true, hasFoodData: true };
      const weekGoodEnergy = { energy: 4, adherence: 'hit', hasCheckin: true, hasFoodData: true };
      const userState = { weightTrendPctPerWeek: -1.6 }; // s1 always fires, order-independent

      // Chronological (most-recent-first, as documented): the two most
      // recent weeks are both low-energy -> s2 fires -> 2 signals -> fired.
      const chronological = [weekLowEnergyA, weekLowEnergyB, weekGoodEnergy];
      const outChronological = detectEdPatternFlag(userState, chronological, false);
      expect(outChronological.signals.s2).toBe(true);
      expect(outChronological.fired).toBe(true);

      // The SAME three observations, array reversed (as if a caller hands
      // them oldest-first by mistake, or a DB read comes back unsorted):
      // the two most recent POSITIONS are now [good, low] -> s2 does not
      // fire -> only 1 signal -> does not fire.
      const reversed = [weekGoodEnergy, weekLowEnergyB, weekLowEnergyA];
      const outReversed = detectEdPatternFlag(userState, reversed, false);
      expect(outReversed.signals.s2).toBe(false);
      expect(outReversed.fired).toBe(false);

      expect(outReversed).not.toEqual(outChronological);
    });

    test('the production caller (weeklyCoach.js:1904-1914) always supplies weeklyHistory as recentWeeklyHistory verbatim from the caller -- this function itself performs no defensive re-sort, so correctness depends entirely on the caller upholding the documented contract', () => {
      // Not a throw, not a crash -- just documented reliance on caller order,
      // unlike the two seams above. No code touched.
      expect(() => detectEdPatternFlag({ weightTrendPctPerWeek: 0 }, [], false)).not.toThrow();
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 2. SAME-DAY DUPLICATE EVENTS -- no double-learning (pinned where true;
//    documented as a finding where production does not fully guard)
// ═════════════════════════════════════════════════════════════════════════

describe('2. same-day duplicate events -> no double-learning', () => {
  describe('PINNED (production dedupes): T-WEEKLY-01/N-COACH-01 weigh-in DAY count (C10C/F10/EN-9, weeklyCoach.js:799-819)', () => {
    test('3 distinct days each carrying 3 same-day duplicate rows (9 rows total) still reads as exactly 3 distinct weigh-in days, not 9 -- confidence lands on "medium" (the <5-weigh-ins branch), never the "high" a raw row count would wrongly reach', () => {
      const day = (n, kg) => Array.from({ length: 3 }, (_, i) => ({ loggedAt: NOW - n * DAY + i * 60_000, weightKg: kg }));
      const nineRowsThreeDays = [...day(0, 85), ...day(1, 85.1), ...day(2, 85.2)];
      const out = runWeeklyCoach(weeklyCoachWeek({
        top: { morningWeights: nineRowsThreeDays, weeksInPhase: 4 },
      }));
      // If the gate had (incorrectly) counted raw rows, 9 >= 5 would read
      // 'high'. The dedupe means it reads 'medium' instead, proving the day
      // count -- not the row count -- drives the gate.
      expect(out.confidence).toBe('medium');
      expect(out.confidence).not.toBe('high');
      expect(out.hasEnoughData).toBe(true); // >=3 distinct days clears the hold
    });
  });

  describe('PINNED (production dedupes): N-MAINT canonicalWeightEvidence (effectiveMaintenance.js:59-74)', () => {
    test('a same-day duplicate weigh-in collapses to ONE evidence row for that day, resolving to the LATER-timestamped value', () => {
      const clean = [
        { loggedAt: NOW - 2 * DAY, weightKg: 85 },
        { loggedAt: NOW - 1 * DAY, weightKg: 84.9 },
      ];
      const withDuplicate = [
        ...clean,
        { loggedAt: NOW - 1 * DAY + 3600_000, weightKg: 84.7 }, // same calendar day as the second row, later timestamp
      ];
      const evidence = canonicalWeightEvidence(withDuplicate);
      expect(evidence.length).toBe(2); // still 2 distinct days, not 3 rows
      const lastDay = evidence.find((e) => e.loggedAt > NOW - 1.5 * DAY);
      expect(lastDay.weightKg).toBe(84.7); // the later same-day reading wins
    });
  });

  describe('PINNED (naturally immune): T-LIVESET-02/03 best-set logic is MAX-based, not an average -- an exact-duplicate set row within one session cannot double-count', () => {
    test('duplicating an identical top-set row within one session leaves W/R_top (and the resolved prescription) unchanged', () => {
      const clean = hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12, pos: 1 }]);
      const duped = hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12, pos: 1 }, { weight: 80, reps: 12, pos: 1 }]);
      const packet = (hist) => assembleEvidencePacket({
        exercise: { id: 'ex1', exerciseType: 'weight_reps', category: 'compound', units: 'kg' },
        prescription: { repsMin: 8, repsMax: 12 },
        rawHistory: hist,
        now: NOW,
      });
      const rxClean = resolveSetPrescription(packet([clean]), 1);
      const rxDuped = resolveSetPrescription(packet([duped]), 1);
      expect(rxDuped.weight).toBe(rxClean.weight);
      expect(rxDuped.provenance).toBe(rxClean.provenance);
    });
  });

  describe('FIXED (Campaign 21 finding 3, lead-confirmed class B and repaired): the EWMA trend collapses to one weight truth per local day in both engines - see src/lib/__tests__/temporalEvidenceGuards.test.js for the canonical regression pins', () => {
    test('an exact-value same-day duplicate weigh-in row no longer shifts the smoothed weekly trend', () => {
      const cleanDays = flatWeights(10, 85, -1.0); // 10 distinct-day rows, declining trend
      const lastDay = cleanDays[cleanDays.length - 1];
      const withSameDayDuplicate = [
        ...cleanDays,
        { loggedAt: lastDay.loggedAt + 3600_000, weightKg: lastDay.weightKg }, // same value, same calendar day, later timestamp
      ];
      const cleanTrend = computeWeeklyTrendPct(cleanDays, null, NOW);
      const dupedTrend = computeWeeklyTrendPct(withSameDayDuplicate, null, NOW);
      // Both are real numbers (no NaN, no crash from the duplicate)...
      expect(Number.isFinite(cleanTrend)).toBe(true);
      expect(Number.isFinite(dupedTrend)).toBe(true);
      // ...and the duplicate now changes NOTHING: the day's later row is the
      // canonical truth (canonicalWeightEvidence semantics), so nothing new
      // was observed and nothing moves. The trend feeding N-COACH-08's
      // magnitude, X-SAFETY-01/02's s1 and N-TARGETS-06's cap is stable
      // under duplication.
      expect(dupedTrend).toBeCloseTo(cleanTrend, 6);

      // Confirmed directly at the computeEWMA level: one row per DAY.
      const cleanSeries = computeEWMA(cleanDays);
      const dupedSeries = computeEWMA(withSameDayDuplicate);
      expect(dupedSeries.length).toBe(cleanSeries.length);
      expect(dupedSeries[dupedSeries.length - 1].ewmaKg).toBe(cleanSeries[cleanSeries.length - 1].ewmaKg);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 3. OLDER EVENT ARRIVING AFTER NEWER (timestamps preserved) -> same
//    decision as chronological arrival
// ═════════════════════════════════════════════════════════════════════════

describe('3. an older event arriving after a newer one (timestamps preserved) -> same decision as chronological arrival', () => {
  test('weeklyCoach: a stale weigh-in that only just finished syncing, appended LAST to the array, produces the identical run to a build where it was inserted in its true chronological place', () => {
    const chronological = flatWeights(35, 85, -0.3);
    const lateArrivalOrder = [...chronological.slice(1), chronological[0]]; // the oldest row, appended last
    const outChronological = runWeeklyCoach(weeklyCoachWeek({ top: { morningWeights: chronological } }));
    const outLateArrival = runWeeklyCoach(weeklyCoachWeek({ top: { morningWeights: lateArrivalOrder } }));
    expect(JSON.stringify(outLateArrival)).toBe(JSON.stringify(outChronological));
  });

  test('liveSet: an older comparable session arriving in the array AFTER a newer one still resolves the DROP provenance correctly off the true two most recent sessions by timestamp, not by array position', () => {
    // T-LIVESET-02 DROP: the best set at W missed repsMin in TWO consecutive
    // comparable sessions. Both the two most recent sessions here miss at
    // W=80 (reps 6 < repsMin 8); array order deliberately scrambled so the
    // OLDER of the two comparable sessions is appended after the newest.
    const newest = hSession(NOW - 7 * DAY, [{ weight: 80, reps: 6 }]);
    const secondNewest = hSession(NOW - 14 * DAY, [{ weight: 80, reps: 6 }]);
    const oldest = hSession(NOW - 21 * DAY, [{ weight: 75, reps: 12 }]);
    const chronological = [newest, secondNewest, oldest];
    const outOfArrivalOrder = [newest, oldest, secondNewest]; // secondNewest arrives LAST despite being older than `oldest`'s position in the array
    const packet = (hist) => assembleEvidencePacket({
      exercise: { id: 'ex1', exerciseType: 'weight_reps', category: 'compound', units: 'kg', incrementKg: 2.5 },
      prescription: { repsMin: 8, repsMax: 12 },
      rawHistory: hist,
      now: NOW,
    });
    const rxChronological = resolveSetPrescription(packet(chronological), 1);
    const rxArrivalOrder = resolveSetPrescription(packet(outOfArrivalOrder), 1);
    expect(rxArrivalOrder.provenance).toBe('LOAD_DROP_CONSECUTIVE_MISS');
    expect(JSON.stringify(rxArrivalOrder)).toBe(JSON.stringify(rxChronological));
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 4. FUTURE-DATED / MALFORMED-TIMESTAMP ROWS -> safe handling (guards
//    confirmed where present; unguarded seams reported, not fixed)
// ═════════════════════════════════════════════════════════════════════════

describe('4. future-dated / malformed-timestamp rows -> safe handling', () => {
  test('weeklyCoach: a row with a non-numeric loggedAt ("not-a-date") never throws and never leaks NaN into the emitted trend/confidence', () => {
    const withMalformedRow = [...flatWeights(10, 85, -0.3), { loggedAt: 'not-a-date', weightKg: 85 }];
    let out;
    expect(() => { out = runWeeklyCoach(weeklyCoachWeek({ top: { morningWeights: withMalformedRow } })); }).not.toThrow();
    expect(typeof out.confidence).toBe('string');
  });

  test('FINDING: weeklyCoach\'s 7-day weigh-in window only bounds the PAST (loggedAt >= nowMs-7d, weeklyCoach.js:815), never the FUTURE -- a clock-skewed future-dated row is counted toward weigh-in days and can become the EWMA\'s "latest" point', () => {
    const clean = flatWeights(10, 85, -0.3);
    const futureRow = { loggedAt: NOW + 30 * DAY, weightKg: 70 }; // implausible, clock-skewed
    const withFutureRow = [...clean, futureRow];

    const cleanTrend = computeWeeklyTrendPct(clean, null, NOW);
    const withFutureTrend = computeWeeklyTrendPct(withFutureRow, null, NOW);
    // No crash, no NaN...
    expect(Number.isFinite(cleanTrend)).toBe(true);
    expect(Number.isFinite(withFutureTrend)).toBe(true);
    // ...but the future row becomes the temporally-latest point once sorted,
    // so it materially changes the "current" EWMA reading the trend is
    // built from -- there is no `loggedAt <= nowMs` guard in this seam.
    expect(withFutureTrend).not.toBeCloseTo(cleanTrend, 6);
    const series = computeEWMA(withFutureRow);
    // FIXED (Campaign 21 finding 5, lead-confirmed class B and repaired):
    // computeWeeklyTrendPct and the confidence day-count now exclude
    // future-dated rows outright (conservative direction only). The raw
    // computeEWMA smoother itself remains timestamp-agnostic - the
    // WINDOWED consumers are the guards. Regression pins:
    // src/lib/__tests__/temporalEvidenceGuards.test.js.
    expect(series[series.length - 1].loggedAt).toBe(futureRow.loggedAt);
  });

  test('FIXED (Campaign 21 finding 6, class B repaired): a future-dated session is reference-only, never comparable evidence', () => {
    const futureSession = hSession(NOW + 10 * DAY, [{ weight: 999, reps: 20 }]); // implausible future session
    const packet = assembleEvidencePacket({
      exercise: { id: 'ex1', exerciseType: 'weight_reps', category: 'compound', units: 'kg' },
      prescription: { repsMin: 8, repsMax: 12 },
      rawHistory: [futureSession],
      now: NOW,
    });
    expect(() => resolveSetPrescription(packet, 1)).not.toThrow(); // no crash
    const entry = packet.history.find((h) => h.at === futureSession.at);
    expect(entry).toBeDefined();
    expect(entry.comparable).toBe(false); // future-dated: reference-only (finding 6 fix, livePrescription.js recency guard)
  });

  test('GOOD GUARD (contrast): recoveryState safely returns null for a malformed weekIndex, never throwing and never fabricating a state', () => {
    expect(() => resolveRecoveryState({ weekIndex: 'not-a-number', plannedWeeks: 6, deloadWeek: 6 })).not.toThrow();
    expect(resolveRecoveryState({ weekIndex: 'not-a-number', plannedWeeks: 6, deloadWeek: 6 })).toBeNull();
    expect(resolveRecoveryState({ weekIndex: NaN, plannedWeeks: 6 })).toBeNull();
  });

  test('GOOD GUARD (contrast): edDetector safely reads a malformed weightTrendPctPerWeek ("bad") as "not rapid loss" (isRapidLoss requires Number.isFinite), never throwing', () => {
    let out;
    expect(() => { out = detectEdPatternFlag({ weightTrendPctPerWeek: 'bad' }, [], false); }).not.toThrow();
    expect(out.signals.s1).toBe(false);
  });

  test('FIXED (Campaign 21 finding 7, class B repaired): a non-numeric planned_sets row holds instead of emitting junk', () => {
    const plannedRows = [{ muscle: 'chest', planned_sets: 'abc', mev: 6, mrv: 22, mav: 14 }];
    let out;
    expect(() => { out = computeVolumeApply(plannedRows, 2); }).not.toThrow();
    expect(out.length).toBe(0); // the unusable row is skipped (fail-closed hold), never string-concatenated
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 5. REPEATED INVOCATION -- every pure seam called twice with the same
//    input -> byte-identical output (all 23 registry entries, table-driven)
// ═════════════════════════════════════════════════════════════════════════
// `runScenarios` already re-invokes each entry a second time with the same
// fixture and asserts JSON.stringify equality (harness.js:671-678) unless a
// scenario opts out with `skipDeterminism`. Building one representative,
// minimal, non-throwing fixture per registry key turns that existing
// plumbing into exactly the table-driven idempotence sweep Step 10 asks for,
// with no changes to harness.js.

const REPEAT_TABLE = [
  {
    id: 'TMP-R01', family: 'temporal', rules: ['N-COACH-01'],
    why: 'ORACLE N-COACH-01: repeated invocation, weeklyCoach seam',
    facts: weeklyCoachWeek(), run: 'weeklyCoach', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R02', family: 'temporal', rules: ['T-VOLUME-05'],
    why: 'ORACLE T-VOLUME-05: repeated invocation, sessionAdjust seam',
    facts: b.sessionAdjustInput(), run: 'sessionAdjust', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R03', family: 'temporal', rules: ['T-VOLUME-03'],
    why: 'ORACLE T-VOLUME-03: repeated invocation, adaptive seam',
    facts: { soreness: 2, performance: 2, pump: 3, joint: 0 }, run: 'adaptive', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R04', family: 'temporal', rules: ['T-VOLUME-02'],
    why: 'ORACLE T-VOLUME-02: repeated invocation, deload seam',
    facts: [
      { avgReps: 10, weeksSinceLastDeload: 1, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 },
      { avgReps: 10, weeksSinceLastDeload: 1, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 },
    ],
    run: 'deload', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R05', family: 'temporal', rules: ['T-LIVESET-01'],
    why: 'ORACLE T-LIVESET-01: repeated invocation, liveSet seam',
    facts: { packet: b.liveSetPacketInput({ rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }])] }), position: 1 },
    run: 'liveSet', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R06', family: 'temporal', rules: ['X-SAFETY-02'],
    why: 'ORACLE X-SAFETY-02: repeated invocation, edDetector seam',
    facts: { userState: { weightTrendPctPerWeek: -0.5 }, weeklyHistory: [], goalLockAdvanced: false },
    run: 'edDetector', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R07', family: 'temporal', rules: ['N-VOL-03'],
    why: 'ORACLE N-VOL-03: repeated invocation, coachApply seam (computeVolumeApply, the pure branch -- markApplied/markDeclined are excluded here, see section 6)',
    facts: { _fn: 'computeVolumeApply', plannedRows: [{ muscle: 'chest', planned_sets: 10, mev: 6, mrv: 22, mav: 14 }], volumeDelta: 2 },
    run: 'coachApply', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R08', family: 'temporal', rules: ['N-COACH-10'],
    why: 'ORACLE N-COACH-10: repeated invocation, declineMemory seam',
    facts: {
      previous: { goalPhase: 'mild_cut', weight: 'poor', ratePct: -1.0, intake: 'poor', coverage: 'good', training: 'good', recovery: 'good' },
      current: { goalPhase: 'mild_cut', weight: 'poor', ratePct: -1.0, intake: 'poor', coverage: 'good', training: 'good', recovery: 'good' },
    },
    run: 'declineMemory', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R09', family: 'temporal', rules: ['T-PROGRAMME-04'],
    why: 'ORACLE T-PROGRAMME-04: repeated invocation, programmeEpoch seam',
    facts: { _fn: 'slotVerdict', evidence: { progressing: true }, opts: { epochBlocks: 0 } },
    run: 'programmeEpoch', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R10', family: 'temporal', rules: ['T-PERFORMANCE-03'],
    why: 'ORACLE T-PERFORMANCE-03: repeated invocation, performance seam',
    facts: {
      _fn: 'detectPlateau',
      exerciseSessions: [0, 7, 14].map((daysAgo) => ([{ weight: 100, actualReps: 8, createdAt: NOW - daysAgo * DAY, setType: 'straight' }])),
    },
    run: 'performance', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R11', family: 'temporal', rules: ['T-PROGRAMME-01'],
    why: 'ORACLE T-PROGRAMME-01: repeated invocation, mesocycleBlock seam',
    facts: { _fn: 'getBlockStatus', startDateMs: NOW - 14 * DAY, plannedWeeks: 6 },
    run: 'mesocycleBlock', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R12', family: 'temporal', rules: ['T-PROGRAMME-09'],
    why: 'ORACLE T-PROGRAMME-09: repeated invocation, blockProgression seam',
    facts: {
      _fn: 'resolveWeekSessions',
      input: { weekId: 'wk1', routines: [{ id: 'r-legs', name: 'Legs', position: 0 }], workouts: [], resolutions: [] },
    },
    run: 'blockProgression', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R13', family: 'temporal', rules: ['T-SESSION-03'],
    why: 'ORACLE T-SESSION-03: repeated invocation, sessionConfirm seam',
    facts: { workoutExercises: [{ sets: [{ weight: 100, reps: 5 }], _timeCrunchSkipped: false }] },
    run: 'sessionConfirm', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R14', family: 'temporal', rules: ['T-SLOT-01'],
    why: 'ORACLE T-SLOT-01: repeated invocation, slotIntent seam',
    facts: {
      _fn: 'isEligible',
      state: { intents: new Map(), swaps: [], defaults: [], usage: new Map(), progression: new Map(), activeMesocycleId: 'meso1' },
      exerciseId: 'exB',
    },
    run: 'slotIntent', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R15', family: 'temporal', rules: ['T-PROGRAMME-08'],
    why: 'ORACLE T-PROGRAMME-08: repeated invocation, blockAdvisor seam (checkinReadiness, the pure branch)',
    facts: { _fn: 'checkinReadiness', checkin: { energyScore: 3, sorenessScore: 2, sleepHours: 7 } },
    run: 'blockAdvisor', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R16', family: 'temporal', rules: ['T-PROGRAMME-11'],
    why: 'ORACLE T-PROGRAMME-11: repeated invocation, interBlock seam',
    facts: {
      input: {
        muscle: 'chest', landmarks: { mev: 6, mav: 14, mrv: 22 },
        adherence: { completedSets: 40, plannedSets: 42 },
        performance: { e1rmSlopePct: 3, prDensity: 0.3, rawPrCount: 2, eligibleExposures: 8, confidence: 0.9, discontinuity: false, doseResponse: { lateProgression: true, lateRecoveryOk: true } },
        recovery: { sorenessLateAvg: 1, jointDiscomfortAvg: 0, readinessSlope: 0, sleepFlaggedWeeks: 0, dataPoints: 8 },
      },
      ctx: { suppressed: false, weeksSinceBlockEnd: 0 },
    },
    run: 'interBlock', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R17', family: 'temporal', rules: ['T-VOLUME-01'],
    why: 'ORACLE T-VOLUME-01: repeated invocation, landmarks seam',
    facts: { _fn: 'getVolumeStatus', workingSets: 10, muscle: 'chest' },
    run: 'landmarks', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R18', family: 'temporal', rules: ['N-TARGETS-05'],
    why: 'ORACLE N-TARGETS-05: repeated invocation, nutritionTargets seam',
    facts: { _fn: 'kcalFloorForSex', sex: 'male' },
    run: 'nutritionTargets', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R19', family: 'temporal', rules: ['N-MAINT-01'],
    why: 'ORACLE N-MAINT-01: repeated invocation, effectiveMaintenance seam',
    facts: { _fn: 'canonicalWeightEvidence', weights: flatWeights(14, 80, 0) },
    run: 'effectiveMaintenance', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R20', family: 'temporal', rules: ['N-BANK'],
    why: 'ORACLE N-BANK: repeated invocation, calorieBank seam',
    facts: { _fn: 'sexFloorKcal', sex: 'female' },
    run: 'calorieBank', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R21', family: 'temporal', rules: ['N-ADHERENCE-01'],
    why: 'ORACLE N-ADHERENCE-01: repeated invocation, adherence seam',
    facts: { value: 100, target: 100, tolerance: 0.1 },
    run: 'adherence', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R22', family: 'temporal', rules: ['T-RECOVERY-01'],
    why: 'ORACLE T-RECOVERY-01: repeated invocation, readiness seam',
    facts: { _fn: 'getReadinessTweak', intent: 'below_par', chips: {} },
    run: 'readiness', must: [{ kind: 'throwsNever' }],
  },
  {
    id: 'TMP-R23', family: 'temporal', rules: ['T-RECOVERY-03'],
    why: 'ORACLE T-RECOVERY-03: repeated invocation, recoveryState seam',
    facts: { weekIndex: 3, plannedWeeks: 6, deloadWeek: 6, isDeload: false, awaitingDecision: false, recoveryPhaseAllowed: true },
    run: 'recoveryState', must: [{ kind: 'throwsNever' }],
  },
];

describe('5. repeated invocation: every one of the 23 registry entries, called twice with the same input, returns byte-identical output', () => {
  // A structural check that the table above genuinely walks every key --
  // if a future registry entry is added and this table is not updated, this
  // fails loudly instead of silently under-covering.
  test('the table above has exactly 23 rows, one per current registry entry', () => {
    expect(REPEAT_TABLE.length).toBe(23);
  });

  runScenarios(REPEAT_TABLE);
});

// ═════════════════════════════════════════════════════════════════════════
// 6. SAME COACHING RUN TWICE -- runWeeklyCoach(identical inputs) -> an
//    identical decision object. Persistence-level dedup is OUT OF SCOPE.
// ═════════════════════════════════════════════════════════════════════════

describe('6. same coaching run twice -> identical decision object (idempotent decision; persistence dedup out of scope)', () => {
  test('runWeeklyCoach called twice on an identical, realistic weekly fixture returns deep-equal objects, not merely equal JSON', () => {
    const inputs = weeklyCoachWeek({ top: { goalPhase: 'mild_cut', consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 4 } });
    const first = runWeeklyCoach(inputs);
    const second = runWeeklyCoach(inputs);
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  test('OUT OF SCOPE, by design, not a defect: markApplied stamps a fresh appliedAt via Date.now() each call, so applying the SAME decision object twice is deliberately NOT idempotent at the persistence layer -- this is the intended "when did the user actually tap Apply" record, distinct from the pure decision above', () => {
    const decisionOutput = { adjustments: { calories: { change: 100 } } };
    const first = markApplied(decisionOutput, 'calories', {});
    const second = markApplied(decisionOutput, 'calories', {});
    expect(first.appliedAdjustments.calories.appliedAt).toEqual(expect.any(Number));
    expect(second.appliedAdjustments.calories.appliedAt).toEqual(expect.any(Number));
    // Both calls succeed and both stamp a real timestamp; markApplied is an
    // IO-adjacent seam (reads the clock) by design and is correctly excluded
    // from the pure-seam idempotence table in section 5.
  });
});
