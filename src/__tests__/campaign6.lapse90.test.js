/**
 * campaign6.lapse90.test.js — Phase 51 of the Campaign 6 order: the
 * permanent 90-day lapse E2E. An established Pro user leaves and
 * returns; every surface's behaviour is asserted against the real
 * modules at the real gap.
 *
 * The order's assertions: no fake current week; no automatic block
 * transition; no invented recovery state; no shame; no fake
 * recent-history wording; old history remains available; D91-25 is NOT
 * silently implemented; the stale-capacity risk is documented (D97-3),
 * not guessed away.
 */
import fs from 'fs';
import path from 'path';
import { getBlockStatus, BLOCK_PLANNED_WEEKS } from '../lib/mesocycle';
import { classifyMuscleBlock, BLOCK_CLASS } from '../lib/interBlock';
import { computeLearnedRange } from '../lib/learnedRange';
import { buildRampPositionLine } from '../lib/blockExplain';
import { runWeeklyCoach } from '../lib/weeklyCoach';
import { deriveTrainingPerformance } from '../lib/checkinDerive';

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const DAY = 86400000;
const NOW = Date.UTC(2026, 7, 10, 9, 0);
const GAP_90 = 90 * DAY;

describe('LAPSE E2E: the block lifecycle stays truthful at +90 days', () => {
  test('a block left mid-accumulation is completed_awaiting_decision, never a fake current week', () => {
    // Left in week 2; returns 90 days after the block started.
    const start = NOW - GAP_90;
    const s = getBlockStatus(start, BLOCK_PLANNED_WEEKS, NOW);
    expect(s.status).toBe('completed_awaiting_decision');
    expect(s.awaitingDecision).toBe(true);
    // The overdue count is honest, not wrapped into a phantom week 3 of 6.
    expect(s.weeksOverdue).toBeGreaterThanOrEqual(6);
  });

  test('a completed block stays completed for ever; nothing transitions on its own', () => {
    const start = NOW - 200 * DAY;
    const s = getBlockStatus(start, BLOCK_PLANNED_WEEKS, NOW);
    expect(s.status).toBe('completed_awaiting_decision');
    // The ONLY mesocycle INSERT in the tree is explicit user activation
    // (verified by the plan-lifecycle audit, P9-15); pinned structurally:
    const db = read('lib/database.js');
    expect((db.match(/INSERT INTO mesocycles/g) || []).length).toBe(1);
  });

  test('the ramp line refuses a week that never happened', () => {
    expect(buildRampPositionLine({
      weekIndex: 14, plannedWeeks: BLOCK_PLANNED_WEEKS,
      thisWeekSets: 30, nextWeekSets: 33,
    })).toBeNull();
  });
});

describe('LAPSE E2E: stale evidence cannot climb, and D91-25 stays unimplemented', () => {
  const responsive = {
    muscle: 'chest', landmarks: { mev: 8, mav: 16, mrv: 22 }, researchMev: 8,
    previousStart: 12, plannedPeak: 18, achievedPeak: 19,
    adherence: { plannedSets: 60, completedSets: 55 },
    performance: {
      e1rmSlopePct: 3, prDensity: 0.2, rawPrCount: 2, eligibleExposures: 10,
      confidence: 0.9, discontinuity: false,
      doseResponse: { lateProgression: true, lateRecoveryOk: true },
    },
    recovery: {
      sorenessLateAvg: 2, jointDiscomfortAvg: 1, readinessSlope: 0,
      sleepFlaggedWeeks: 0, deloadFlagFired: false, deloadFlagMidBlock: false,
      dataPoints: 8,
    },
  };

  test('a ledger judged at the 13-week gap withholds every climb and records why', () => {
    const e = classifyMuscleBlock(responsive, { suppressed: false, weeksSinceBlockEnd: 13 });
    expect(e.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(e.proposal.startSets).toBe(12); // the earned +1 held
    expect(e.evidence).toContainEqual({ signal: 'evidence_weeks_old', value: 13 });
  });

  test('the learned range is byte-identical before and after the gap: no decay was invented', () => {
    const history = [
      { muscle: 'chest', classification: BLOCK_CLASS.RESPONSIVE, confidence: 0.9,
        proposal: { deferredToManual: false },
        observed: { startSets: 12, achievedPeak: 19, plannedPeak: 18, suppressed: false } },
    ];
    const args = { prior: { mev: 8, mav: 16, mrv: 22 }, researchMev: 8, ledgerHistory: history, muscle: 'chest' };
    // computeLearnedRange takes no clock: the 90-day gap cannot change it.
    expect(computeLearnedRange(args)).toEqual(computeLearnedRange(args));
    expect(read('lib/learnedRange.js')).not.toMatch(/nowMs|Date\.now/);
  });
});

describe('LAPSE E2E: the coach answers conservatively, with no shame and no fake recency', () => {
  test('the first weekly run after the gap proposes no confident change', () => {
    // Re-anchored under D97-25 RB6-5 (Review B, test integrity): the old
    // fixture stamped weigh-ins with createdAt - a field the engine
    // ignores (it reads loggedAt) - so gap and no-gap runs were
    // byte-identical and the assertion read a confidence field that does
    // not exist on trend. The fixture now genuinely exercises the gap
    // (21 pre-gap daily rows on loggedAt) and asserts the REAL protective
    // outcome: the clock-anchored weigh-in gate (R-1) holds the run.
    const preGap = [];
    for (let i = 0; i < 21; i += 1) {
      preGap.push({ weightKg: 80 + i * 0.02, loggedAt: NOW - GAP_90 - (21 - i) * DAY });
    }
    const out = runWeeklyCoach({
      nowMs: NOW,
      checkin: { energyScore: 3, sorenessScore: 3, calsAdherence: 'in_range', sleepHours: 7, notes: '' },
      morningWeights: preGap,
      sessionsCompleted: 1, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'lean_gain', weeksInPhase: 14,
      currentCalTarget: 2800, bodyweightKg: 80.4, units: 'kg', scoffPositive: false,
    });
    expect(out.hasEnoughData).toBe(false);
    expect(out.confidence).toBe('data_hold');
    expect(out.adjustments?.calories ?? null).toBeNull();
    // And nothing about the stale series is narrated as current.
    expect(out.trend?.deltaLabel).not.toMatch(/this week/);

    // The falsifiability proof the old fixture lacked: the SAME series
    // ending now (no gap) must coach, so the hold above is genuinely the
    // gap's doing.
    const noGap = runWeeklyCoach({
      nowMs: NOW,
      checkin: { energyScore: 3, sorenessScore: 3, calsAdherence: 'in_range', sleepHours: 7, notes: '' },
      morningWeights: preGap.map((w, i) => ({ ...w, loggedAt: NOW - (21 - i) * DAY })),
      sessionsCompleted: 1, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'lean_gain', weeksInPhase: 14,
      currentCalTarget: 2800, bodyweightKg: 80.4, units: 'kg', scoffPositive: false,
    });
    expect(noGap.confidence).not.toBe('data_hold');
  });

  test('the comparative training verdicts are refused: the calendar prior week is empty', () => {
    // "a bit below your usual" would be shame from a gap; hasPriorWeek is
    // false because last week's volume is genuinely zero.
    expect(deriveTrainingPerformance({
      completed: 2, planned: 4, prs: 0, volDeltaPct: null, hasPriorWeek: false,
    })).not.toBe('struggled');
    expect(deriveTrainingPerformance({
      completed: 1, planned: 4, prs: 0, volDeltaPct: null, hasPriorWeek: false,
    })).toBeNull();
  });

  test('no return surface says "welcome back" with a false continuity claim, and no shame copy exists', () => {
    for (const f of ['screens/HomeScreen.js', 'lib/streak.js', 'lib/payments/winbackState.js']) {
      const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(src).not.toMatch(/pick up exactly where you left off/i);
      expect(src).not.toMatch(/we've forgotten everything/i);
      expect(src).not.toMatch(/you (broke|lost) your (streak|progress)/i);
      expect(src).not.toMatch(/don't give up now/i);
    }
  });

  test('old history remains available: nothing deletes evidence on a lapse', () => {
    // No code path prunes workouts, ledgers or weights by age.
    const db = read('lib/database.js');
    expect(db).not.toMatch(/DELETE FROM workouts WHERE[^\n]*created_at </);
    expect(db).not.toMatch(/DELETE FROM morning_weights WHERE[^\n]*logged_at </);
    expect(db).not.toMatch(/UPDATE mesocycles SET block_ledger = NULL/i);
  });
});

describe('LAPSE E2E: the documented protections hold at the session level', () => {
  test('the 14-day gates from D97-4/5/8/10 are all present (absence is never evidence)', () => {
    expect(read('lib/algorithms.js')).toMatch(/feedbackRecent &&/);
    expect(read('screens/CoachOutputScreen.js')).toMatch(/isAdjacent/);
    expect(read('lib/blockAdvisor.js')).toMatch(/latestIsCurrent \? detectSignals\(checkins\) : \[\]/);
    expect(read('screens/CoachOutputScreen.js')).toMatch(/liveWeek - outWeek > 7 \* 86400000\) return;/);
  });

  test('the stale-capacity risk stays a DOCUMENTED founder question, not a silent fix', () => {
    // D97-3: no age input was added to resolveSeedRange, and the register
    // carries the asymmetry to the founder triage.
    expect(read('lib/blockSeed.js')).not.toMatch(/weeksSince|ageWeeks|staleAfter|nowMs/);
    const register = fs.readFileSync(
      path.join(__dirname, '..', '..', 'docs', 'long-term-audit-2026-08-11', 'D97-RULINGS.md'), 'utf8',
    );
    expect(register).toMatch(/D97-3 .*stored-ledger/i);
  });
});
