/**
 * Audit coverage for the check-in signals that were collected but did not
 * drive weeklyCoach decisions (PIPE-001 stress, PIPE-002 joint pain,
 * PIPE-003 note flags) plus the shared adherence vocabulary helper (ALGO-004).
 *
 * These lock the new behaviour: a high-stress week can only worsen recovery,
 * a joint-pain or illness/injury week holds progression instead of pushing,
 * and the calorie-answer mapping has one definition.
 */
import {
  runWeeklyCoach,
  parseNoteFlags,
  mapCalsAdherence,
} from '../weeklyCoach';

const DAY = 86_400_000;

function weights(n = 35, startKg = 85, kgPerWeek = -0.1) {
  const out = [];
  const t0 = Date.now();
  const weeksSpan = (n - 1) / 7;
  const endKg = startKg + kgPerWeek * weeksSpan;
  for (let i = 0; i < n; i++) {
    const w = startKg + (endKg - startKg) * (i / Math.max(1, n - 1));
    out.push({ loggedAt: t0 - (n - 1 - i) * DAY, weightKg: Math.round(w * 100) / 100 });
  }
  return out;
}

// A clean "push" week: strong recovery + a PR with full session adherence, so
// the autoregulation matrix wants to add volume. Everything else neutral.
function pushInputs(checkinOverrides = {}) {
  return {
    checkin: {
      weekStart: Date.now() - 7 * DAY,
      energyScore: 5,
      sorenessScore: 1,
      stressScore: 1,
      calsAdherence: 'hit',
      trainingPerformance: 'hit',
      jointPain: false,
      notes: null,
      ...checkinOverrides,
    },
    morningWeights: weights(),
    sessionsCompleted: 4,
    sessionsPlanned: 4,
    prsThisWeek: 1,
    goalPhase: 'mod_bulk',
    weeksInPhase: 4,
    currentCalTarget: 2800,
    currentStepsTarget: 8000,
    bodyweightKg: 85,
    units: 'kg',
  };
}

describe('PIPE-001: stress feeds recovery scoring', () => {
  test('a clean week still pushes volume', () => {
    const out = runWeeklyCoach(pushInputs());
    expect(out.volumeSignal).toBeGreaterThan(0);
    expect(out.loadSignal).toBe('progress');
  });

  test('very high stress holds the same week instead of pushing', () => {
    // energy 4 / soreness 2 is a borderline push; high stress must pull it to a
    // hold rather than adding work onto a frazzled week.
    const base = pushInputs({ energyScore: 4, sorenessScore: 2, stressScore: 1 });
    const stressed = pushInputs({ energyScore: 4, sorenessScore: 2, stressScore: 5 });
    expect(runWeeklyCoach(base).volumeSignal).toBeGreaterThan(0);
    const out = runWeeklyCoach(stressed);
    expect(out.volumeSignal).toBe(0);
    expect(out.adjustments.training.signal).toBe('hold');
  });
});

describe('PIPE-002: joint pain holds progression', () => {
  test('a flagged joint-pain week caps the push and adds a caution', () => {
    const out = runWeeklyCoach(pushInputs({ jointPain: true }));
    expect(out.jointPainFlagged).toBe(true);
    expect(out.safetyHold).toBe(true);
    expect(out.volumeSignal).toBe(0);
    expect(out.adjustments.training.signal).toBe('hold');
    expect(out.adjustments.training.note.toLowerCase()).toContain('joint pain');
    expect(out.recoveryFlag).toBe('concerned');
  });

  test('it never lifts a planned reduce into a progress', () => {
    // Soreness 5 forces a deload/reduce; joint pain must not turn that into a push.
    const out = runWeeklyCoach(pushInputs({ sorenessScore: 5, jointPain: true }));
    expect(out.volumeSignal).toBeLessThanOrEqual(0);
    expect(out.loadSignal).not.toBe('progress');
  });
});

describe('PIPE-003: note flags', () => {
  test('an injury/illness note holds progression even without the joint-pain chip', () => {
    const out = runWeeklyCoach(pushInputs({ notes: 'Tweaked my knee mid-week, some pain.' }));
    expect(out.noteFlags.injury).toBe(true);
    expect(out.safetyHold).toBe(true);
    expect(out.volumeSignal).toBe(0);
  });

  test('parseNoteFlags lifts tags without false positives', () => {
    expect(parseNoteFlags('Was ill with the flu').illness).toBe(true);
    expect(parseNoteFlags('Travelled for work, hotel gym').travel).toBe(true);
    expect(parseNoteFlags('Forgot to log a couple of days').missedLogging).toBe(true);
    expect(parseNoteFlags('On my period this week').menstrual).toBe(true);
    // "will" / "skill" must not trip the illness matcher.
    expect(parseNoteFlags('Strong week, will keep at it with skill').illness).toBe(false);
    expect(parseNoteFlags('').injury).toBe(false);
    expect(parseNoteFlags(null).travel).toBe(false);
  });
});

describe('ALGO-004: one calorie-adherence vocabulary', () => {
  test('maps yes/no/untracked into the engine vocabulary', () => {
    expect(mapCalsAdherence('yes')).toBe('hit');
    expect(mapCalsAdherence('untracked')).toBe('untracked');
    expect(mapCalsAdherence(null)).toBeNull();
    // 'no' without an average stays a neutral off-target.
    expect(mapCalsAdherence('no')).toBe('no');
    // With an average + target it splits into a direction.
    expect(mapCalsAdherence('no', 1800, 2200)).toBe('under');
    expect(mapCalsAdherence('no', 2600, 2200)).toBe('over');
    // Already-engine values pass through untouched.
    expect(mapCalsAdherence('under')).toBe('under');
  });
});
