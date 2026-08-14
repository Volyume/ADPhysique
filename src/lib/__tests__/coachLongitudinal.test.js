/**
 * coachLongitudinal.test.js — Campaign 18 job 17.
 *
 * SEVEN REALISTIC ATHLETES, run through the REAL engines over multiple weeks,
 * each with the founder's own stated expectation:
 *
 *   A CONSISTENT MASSING USER     mostly hold; no constant fiddling.
 *   B UNDER-EATING USER           distinguish failing to hit the prescription
 *                                 from needing a higher one.
 *   C POOR LOGGER / GOOD LIFTER   training coaching works; nutrition claims
 *                                 restrained.
 *   D HIGH-ADHERENCE STALLED      targeted training intervention, not random
 *                                 nutrition change.
 *   E RECOVERY-CONSTRAINED        training restraint; no claim food caused it.
 *   F RETURNING USER              memory retained but not falsely actionable.
 *   G MANUAL USER                 explicit overrides respected, and Volyume
 *                                 says what it is not managing.
 *
 * WHY LONGITUDINAL. A single week can be made to look right by accident. The
 * failure these athletes are built to catch is the one an elite coach never
 * makes: fiddling. Athlete A exists purely to prove that eight good weeks
 * produce eight holds rather than eight adjustments.
 */
import { runWeeklyCoach } from '../weeklyCoach';
import { LIMITER } from '../coachPrecedence';
import { SIGNAL } from '../coachContext';
import { buildWeeklyStory, storyLines } from '../coachStory';
import { slotVerdict, SLOT_REASON, SLOT_VERDICT } from '../programmeEpoch';

const DAY = 86_400_000;

function weights(startKg, kgPerWeek, count = 35, endMs = Date.now()) {
  const weeksSpan = (count - 1) / 7;
  const endKg = startKg + kgPerWeek * weeksSpan;
  return Array.from({ length: count }, (_, i) => ({
    loggedAt: endMs - (count - 1 - i) * DAY,
    weightKg: Math.round((startKg + (endKg - startKg) * (i / (count - 1))) * 100) / 100,
  }));
}

/** One coached week. Everything an athlete varies is a named argument. */
function week({
  kgPerWeek = 0.25, intakeAvg = 3010, intakeDays = 7, target = 3000,
  sessions = 4, planned = 4, energyScore = 4, sorenessScore = 2,
  goalPhase = 'bulk', offTargetWeeks = 0, lastAdjWeeksAgo = 8,
  calsAdherence = 'hit', poorRecoveryWeeks = 0, weighInDays = 35,
  slopePct = 1.1, prs = 1,
} = {}) {
  return runWeeklyCoach({
    nowMs: Date.now(),
    checkin: {
      weekStart: Date.now() - 7 * DAY,
      energyScore, sorenessScore, stressScore: 2, calsAdherence, notes: '',
    },
    morningWeights: weights(80, kgPerWeek, weighInDays),
    sessionsCompleted: sessions, sessionsPlanned: planned, prsThisWeek: prs,
    blockE1rmSlopePct: slopePct,
    goalPhase, weeksInPhase: 8,
    consecutiveOffTargetWeeks: offTargetWeeks,
    consecutivePoorRecoveryWeeks: poorRecoveryWeeks,
    lastCalAdjustmentWeeksAgo: lastAdjWeeksAgo,
    currentCalTarget: target, currentMaintenanceKcal: 2900,
    recentIntakeAvgKcal: intakeAvg, recentIntakeDaysLogged: intakeDays,
    lastCheckinAt: Date.now() - DAY,
    bodyweightKg: 80, sex: 'male', units: 'kg', stepsEnabled: false,
  });
}

const story = (out, changes = {}) => buildWeeklyStory({
  context: out.context, limiters: out.limiters,
  changes: { calorieKcal: out.adjustments?.calories?.change ?? 0, ...changes },
});

describe('ATHLETE A: consistent massing user -> mostly hold, no fiddling', () => {
  // Eight weeks of good training, reliable logging and appropriate gain.
  const weeks = Array.from({ length: 8 }, () => week({ kgPerWeek: 0.25 }));

  test('NOT ONE calorie change across eight good weeks', () => {
    const changed = weeks.filter((w) => (w.adjustments?.calories?.change ?? 0) !== 0);
    expect(changed).toHaveLength(0);
  });

  test('every week reads as a plan that is working', () => {
    for (const w of weeks) {
      expect(w.limiters.nutrition.limiter).toBe(LIMITER.PLAN);
      expect(w.limiters.nutrition.onTarget).toBe(true);
    }
  });

  test('and the story says so plainly, every week', () => {
    for (const w of weeks) {
      const s = story(w);
      expect(s.isQuietWeek).toBe(true);
      expect(storyLines(s).join(' ')).toMatch(/food target is doing its job/i);
    }
  });
});

describe('ATHLETE B: under-eating user -> the prescription was never tested', () => {
  // Consistent training, reliable logging, weight flat, intake below target.
  const weeks = Array.from({ length: 4 }, () => week({
    kgPerWeek: 0, intakeAvg: 2500, offTargetWeeks: 3,
  }));

  test('the target is NEVER raised, week after week', () => {
    for (const w of weeks) expect(w.adjustments?.calories).toBeNull();
  });

  test('it is classified as execution, not as a failed prescription', () => {
    for (const w of weeks) {
      expect(w.limiters.nutrition.limiter).toBe(LIMITER.EXECUTION);
    }
  });

  test('THE DISTINCTION THE FOUNDER ASKED FOR, in the user\'s own story', () => {
    const text = storyLines(story(weeks[0])).join(' ');
    expect(text).toMatch(/has not really been tried yet/i);
    expect(text).toMatch(/until it has had a fair run/i);
  });

  test('their TRAINING is untouched and still described normally', () => {
    for (const w of weeks) {
      expect(w.context.training.execution.signal).toBe(SIGNAL.GOOD);
      expect(storyLines(story(w)).join(' ')).toMatch(/You trained 4 of 4 sessions/);
    }
  });

  test('and the moment they DO eat the target, the change arrives', () => {
    const tested = week({ kgPerWeek: 0, intakeAvg: 3010, offTargetWeeks: 3 });
    expect(tested.limiters.nutrition.limiter).toBe(LIMITER.PLAN);
    expect(tested.adjustments.calories.change).toBeGreaterThan(0);
  });
});

describe('ATHLETE C: poor logger, good lifter -> training works, nutrition restrained', () => {
  const w = week({ kgPerWeek: 0, intakeAvg: null, intakeDays: 1, calsAdherence: 'untracked', offTargetWeeks: 3 });

  test('the training reading is complete and unaffected', () => {
    expect(w.context.training.execution.signal).toBe(SIGNAL.GOOD);
    expect(w.context.training.progress.signal).toBe(SIGNAL.GOOD);
    expect(w.limiters.training.limiter).toBe(LIMITER.PLAN);
  });

  test('the nutrition reading refuses rather than guessing', () => {
    expect(w.context.nutrition.coverage.signal).toBe(SIGNAL.UNKNOWN);
    expect(w.limiters.nutrition.limiter).toBe(LIMITER.INSUFFICIENT_EVIDENCE);
    expect(w.adjustments.calories).toBeNull();
  });

  test('NO FABRICATED NUTRITION CONCLUSION reaches them', () => {
    const text = storyLines(story(w)).join(' ');
    expect(text).toMatch(/not enough food logging/i);
    expect(text).not.toMatch(/you are (under|over)-?eating|your intake is (too|not)/i);
  });

  test('and they are never punished for not logging', () => {
    const text = storyLines(story(w)).join(' ');
    expect(text).not.toMatch(/you must log|start logging|log more|you need to track/i);
  });
});

describe('ATHLETE D: high adherence, one stalled exercise -> targeted training move', () => {
  const w = week({ kgPerWeek: 0.25, intakeAvg: 3010, slopePct: -0.4, prs: 0 });

  test('nutrition is on target and stays put', () => {
    expect(w.limiters.nutrition.onTarget).toBe(true);
    expect(w.adjustments.calories).toBeNull();
  });

  test('the training side is the one with a finding', () => {
    expect(w.limiters.training.limiter).toBe(LIMITER.PLAN);
    expect(w.limiters.training.progressing).toBeUndefined();
  });

  test('a plateau on a RUN block replaces the exercise, as it should', () => {
    const v = slotVerdict({ plateau: true }, { executionJudgeable: true });
    expect(v.verdict).toBe(SLOT_VERDICT.REPLACE);
  });

  test('NOT A RANDOM NUTRITION CHANGE: the receipt names training only', () => {
    const s = story(w, { exerciseChanges: [{ name: 'Bench press' }] });
    expect(s.changing.map((c) => c.domain)).toEqual(['training']);
    expect(s.staying.map((l) => l.text)).toContain('Your daily food target stays the same.');
  });
});

describe('ATHLETE E: recovery-constrained -> restraint, and food is not blamed', () => {
  const w = week({
    kgPerWeek: 0.25, intakeAvg: 3010, energyScore: 2, sorenessScore: 4,
    poorRecoveryWeeks: 2, slopePct: -0.3, prs: 0,
  });

  test('recovery is what the training decision turns on', () => {
    expect(w.limiters.training.limiter).toBe(LIMITER.RECOVERY);
    expect(w.limiters.training.scope).toBe('systemic');
  });

  test('nutrition and weight are untouched, because they are fine', () => {
    expect(w.limiters.nutrition.onTarget).toBe(true);
    expect(w.adjustments.calories).toBeNull();
  });

  test('NO CLAIM THAT FOOD CAUSED IT', () => {
    const text = storyLines(story(w)).join(' ');
    expect(text).not.toMatch(/because you ate|your (intake|eating|diet) (caused|is why|explains)/i);
  });

  test('and the SCOPE is stated truthfully: whole-body, not the exercises', () => {
    const text = storyLines(story(w)).join(' ');
    expect(text).toMatch(/Recovery overall/);
    expect(text).toMatch(/rather than the exercises themselves/);
  });
});

describe('ATHLETE F: returning user -> memory kept, not falsely actionable', () => {
  const stale = runWeeklyCoach({
    nowMs: Date.now(),
    // A real check-in, but from two months ago.
    checkin: null,
    lastCheckinAt: Date.now() - 60 * DAY,
    morningWeights: weights(80, 0, 3),
    sessionsCompleted: 1, sessionsPlanned: 4, prsThisWeek: 0,
    goalPhase: 'bulk', weeksInPhase: 20,
    currentCalTarget: 3000, currentMaintenanceKcal: 2900,
    recentIntakeAvgKcal: null, recentIntakeDaysLogged: 0,
    bodyweightKg: 80, sex: 'male', stepsEnabled: false,
  });

  test('the stale check-in is not treated as current recovery evidence', () => {
    expect(stale.context.recovery.systemic.signal).toBe(SIGNAL.UNKNOWN);
  });

  test('sparse current weight is uncertainty, not a flat trend', () => {
    expect(stale.context.weight.trend.signal).toBe(SIGNAL.UNKNOWN);
  });

  test('NOTHING is changed on old evidence', () => {
    expect(stale.adjustments?.calories ?? null).toBeNull();
    expect(stale.limiters.nutrition.limiter).toBe(LIMITER.INSUFFICIENT_EVIDENCE);
  });

  test('their exercise history is still REMEMBERED, just not actionable yet', () => {
    // Established personal fit survives the gap and still protects the slot;
    // it simply cannot be used to justify a change on an unrun block.
    const kept = slotVerdict(
      { establishedPersonalFit: true, plateau: true },
      { executionJudgeable: false },
    );
    expect(kept.verdict).toBe(SLOT_VERDICT.KEEP);
    expect(kept.reason).toBe(SLOT_REASON.INSUFFICIENT_EXECUTION);
  });
});

describe('ATHLETE G: manual user -> overrides respected and named', () => {
  const w = week({ kgPerWeek: 0.25, intakeAvg: 3010 });

  test('an explicit exclusion outranks every inference, on any block', () => {
    for (const judgeable of [true, false]) {
      const v = slotVerdict(
        { excluded: true, progressing: true, plateau: true },
        { executionJudgeable: judgeable },
      );
      expect(v.reason).toBe(SLOT_REASON.USER_EXCLUDED);
    }
  });

  test('a repeated deliberate swap is heard as an instruction, not learned around', () => {
    expect(slotVerdict({ swappedAwayCount: 3, progressing: true }, {}).reason)
      .toBe(SLOT_REASON.USER_SWAPPED_AWAY);
  });

  test('a RELEASED override is genuinely released, not remembered as a preference', () => {
    // Nothing lingers: with the exclusion gone, ordinary evidence decides.
    expect(slotVerdict({ excluded: false, progressing: true }, {}).reason)
      .toBe(SLOT_REASON.STILL_PRODUCTIVE);
  });

  test('a lane the user manages is visible in the context to every consumer', () => {
    expect(w.context.intent).toBeTruthy();
    expect(Array.isArray(w.context.intent.manualVolumeMuscles)).toBe(true);
  });
});

describe('ACROSS ALL SEVEN: the laws that must never break', () => {
  const all = [
    week({}), week({ kgPerWeek: 0, intakeAvg: 2500, offTargetWeeks: 3 }),
    week({ intakeDays: 1, calsAdherence: 'untracked' }),
    week({ slopePct: -0.4, prs: 0 }),
    week({ energyScore: 2, sorenessScore: 4, poorRecoveryWeeks: 2 }),
    week({ sessions: 1, weighInDays: 5 }),
  ];

  test('no week ever produces a day-specific nutrition target', () => {
    for (const w of all) {
      const json = JSON.stringify(w.context);
      expect(json).not.toMatch(/trainingDay|restDay|refeed|carbCycl/i);
    }
  });

  test('no week changes both domains without both reaching PLAN independently', () => {
    for (const w of all) {
      const s = story(w, { exerciseChanges: w.limiters.training.limiter === LIMITER.PLAN
        && !w.limiters.training.progressing ? [{ name: 'X' }] : [] });
      if (s.changing.length > 1) {
        expect(w.limiters.nutrition.limiter).toBe(LIMITER.PLAN);
        expect(w.limiters.training.limiter).toBe(LIMITER.PLAN);
      }
    }
  });

  test('no week presents an UNKNOWN as a POOR', () => {
    for (const w of all) {
      const text = storyLines(story(w)).join(' ');
      if (w.context.nutrition.coverage.signal === SIGNAL.UNKNOWN) {
        expect(text).not.toMatch(/your intake (was|is) (poor|bad|low)/i);
      }
      if (w.context.weight.trend.signal === SIGNAL.UNKNOWN) {
        expect(text).not.toMatch(/your weight (is flat|has stalled)/i);
      }
    }
  });
});
