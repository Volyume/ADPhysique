/**
 * COMP-015 — computeSessionAdjustments golden-table + matrix tests.
 *
 * Pins every cell of the R0–R6 rule matrix, the caps/clamps, the muscle-name
 * map, and the revert-memory derivation. The fuzz invariants live alongside the
 * other engines in engine-invariants.test.js.
 */
import { computeSessionAdjustments, buildSessionAdjustmentInput } from '../algorithms';
import {
  CHECKIN_MUSCLE_MAP,
  SESSION_REASON_CODES as RC,
  SESSION_SHOWN_CODES,
} from '../whyThisTemplates';

const NOW = Date.UTC(2026, 5, 11, 12, 0, 0); // Thu 11 Jun 2026, 12:00 UTC
const DAY = 86_400_000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekdayOf = (ts) => WEEKDAYS[new Date(ts).getUTCDay()];

// chest landmarks: mev 6, mav 14, mrv 22 (matches VOLUME_LANDMARKS)
const CHEST_LK = { chest: { mev: 6, mav: 14, mrv: 22 } };

function build(overrides = {}) {
  return {
    todaysExercises: [{ exerciseId: 'ex1', primaryMuscle: 'chest', plannedSets: 4 }],
    muscleSignals: {
      chest: {
        lastTrainedAt: NOW - 1 * DAY, // 24h ago, within 72h
        lastFeedback: { pump: 3, joint: 0, performance: 2 },
        checkinSore: false,
        checkinAt: NOW - 1 * DAY,
        presessionSoreness: 1,
        displayName: 'Chest',
      },
    },
    weeklyContext: {
      doneThisWeekByMuscle: { chest: 4 },
      landmarks: CHEST_LK,
      weeklySignal: 'hold',
      safetyHold: false,
      isDeload: false,
      weekStartMs: NOW - 3 * DAY,
    },
    recentSessionEvents: [],
    now: NOW,
    presessionIntent: null,
    ...overrides,
  };
}

const onlyFor = (out, muscle) => out.find(o => o.muscle === muscle);

describe('computeSessionAdjustments — R0 deload', () => {
  test('isDeload silences the engine entirely', () => {
    const out = computeSessionAdjustments(build({
      weeklyContext: { ...build().weeklyContext, isDeload: true },
      // even with a screaming-sore muscle, deload owns the session
      muscleSignals: { chest: { ...build().muscleSignals.chest, presessionSoreness: 3 } },
    }));
    expect(out).toEqual([]);
  });
});

describe('computeSessionAdjustments — R1 joint', () => {
  test('last joint >= 2 holds and is not shown', () => {
    const sig = build().muscleSignals;
    sig.chest.lastFeedback.joint = 2;
    const out = computeSessionAdjustments(build({ muscleSignals: sig }));
    const c = onlyFor(out, 'chest');
    expect(c.reasonCode).toBe(RC.HOLD_JOINT);
    expect(c.setDelta).toBe(0);
    expect(c.show).toBe(false);
    expect(c.adjustedSets).toBe(4);
  });

  test('joint suppresses an add that would otherwise fire', () => {
    const sig = build().muscleSignals;
    sig.chest.lastFeedback = { pump: 1, joint: 2, performance: 1 }; // add-worthy but jointy
    const out = computeSessionAdjustments(build({ muscleSignals: sig }));
    expect(onlyFor(out, 'chest').setDelta).toBe(0);
  });
});

describe('computeSessionAdjustments — R2 residual soreness drop', () => {
  test('pre-session Sore + trained <=72h → -1, shown, day anchor from last trained', () => {
    const sig = build().muscleSignals;
    sig.chest.presessionSoreness = 3;
    const out = computeSessionAdjustments(build({ muscleSignals: sig }));
    const c = onlyFor(out, 'chest');
    expect(c.reasonCode).toBe(RC.DROP_RESIDUAL_SORENESS);
    expect(c.setDelta).toBe(-1);
    expect(c.adjustedSets).toBe(3);
    expect(c.show).toBe(true);
    expect(c.reasonText).toBe(`Chest is still sore from ${weekdayOf(NOW - DAY)}. 1 set fewer today.`);
  });

  test('check-in soreness drives a -1 with the check-in copy variant', () => {
    const sig = build().muscleSignals;
    sig.chest.checkinSore = true;
    sig.chest.presessionSoreness = 1;
    const out = computeSessionAdjustments(build({ muscleSignals: sig }));
    const c = onlyFor(out, 'chest');
    expect(c.reasonCode).toBe(RC.DROP_RESIDUAL_SORENESS);
    expect(c.setDelta).toBe(-1);
    expect(c.reasonText).toBe('You flagged sore chest at check-in. 1 set fewer on chest today.');
  });

  test('floor: an exercise with 1 planned set never drops below 1', () => {
    const ex = [{ exerciseId: 'ex1', primaryMuscle: 'chest', plannedSets: 1 }];
    const sig = build().muscleSignals;
    sig.chest.presessionSoreness = 3;
    const out = computeSessionAdjustments(build({ todaysExercises: ex, muscleSignals: sig }));
    expect(out).toEqual([]); // clamped → silent
  });

  test('mev clamp: a drop that would push weekly below mev is suppressed', () => {
    const sig = build().muscleSignals;
    sig.chest.presessionSoreness = 3;
    // done 2 + planned 4 = 6 projected; -1 = 5 < mev 6 → silent
    const out = computeSessionAdjustments(build({
      muscleSignals: sig,
      weeklyContext: { ...build().weeklyContext, doneThisWeekByMuscle: { chest: 2 } },
    }));
    expect(out).toEqual([]);
  });
});

describe('computeSessionAdjustments — R3 stale soreness', () => {
  test('sore but last trained >72h ago → hold, not shown', () => {
    const sig = build().muscleSignals;
    sig.chest.checkinSore = true;          // fresh check-in flag
    sig.chest.lastTrainedAt = NOW - 4 * DAY; // 96h ago
    sig.chest.presessionSoreness = 1;
    const out = computeSessionAdjustments(build({ muscleSignals: sig }));
    const c = onlyFor(out, 'chest');
    expect(c.reasonCode).toBe(RC.HOLD_STALE_SORENESS);
    expect(c.setDelta).toBe(0);
    expect(c.show).toBe(false);
  });
});

describe('computeSessionAdjustments — R4 under-stimulus add', () => {
  test('recovered + strong + low pump + room → +1, shown', () => {
    const sig = build().muscleSignals;
    sig.chest.lastFeedback = { pump: 2, joint: 0, performance: 2 }; // mild pump, met
    const out = computeSessionAdjustments(build({ muscleSignals: sig }));
    const c = onlyFor(out, 'chest');
    expect(c.reasonCode).toBe(RC.ADD_UNDER_STIMULUS);
    expect(c.setDelta).toBe(1);
    expect(c.adjustedSets).toBe(5);
    expect(c.show).toBe(true);
    expect(c.reasonText).toBe('Chest recovered fast and last session was strong. 1 set added today.');
  });

  test('blocked when an add for this muscle already happened this week', () => {
    const sig = build().muscleSignals;
    sig.chest.lastFeedback = { pump: 2, joint: 0, performance: 2 };
    const out = computeSessionAdjustments(build({
      muscleSignals: sig,
      recentSessionEvents: [{ muscle: 'chest', decision: 'session_add_under_stimulus', createdAt: NOW - 2 * DAY }],
    }));
    expect(out).toEqual([]);
  });

  test('blocked when projected weekly already at/above mav', () => {
    const sig = build().muscleSignals;
    sig.chest.lastFeedback = { pump: 2, joint: 0, performance: 2 };
    const out = computeSessionAdjustments(build({
      muscleSignals: sig,
      weeklyContext: { ...build().weeklyContext, doneThisWeekByMuscle: { chest: 10 } }, // 10+4=14=mav
    }));
    expect(out).toEqual([]);
  });
});

describe('computeSessionAdjustments — R5 precedence holds', () => {
  function addReady() {
    const sig = build().muscleSignals;
    sig.chest.lastFeedback = { pump: 2, joint: 0, performance: 2 };
    return sig;
  }

  test('weekly reduce blocks the add → weekly-precedence hold, hidden unless Sharp', () => {
    const out = computeSessionAdjustments(build({
      muscleSignals: addReady(),
      weeklyContext: { ...build().weeklyContext, weeklySignal: 'reduce' },
    }));
    const c = onlyFor(out, 'chest');
    expect(c.reasonCode).toBe(RC.HOLD_WEEKLY_PRECEDENCE);
    expect(c.setDelta).toBe(0);
    expect(c.show).toBe(false);
  });

  test('same hold is shown after a Sharp pre-session answer', () => {
    const out = computeSessionAdjustments(build({
      muscleSignals: addReady(),
      weeklyContext: { ...build().weeklyContext, weeklySignal: 'reduce' },
      presessionIntent: 'sharp',
    }));
    expect(onlyFor(out, 'chest').show).toBe(true);
  });

  test('safety hold takes precedence code over weekly', () => {
    const out = computeSessionAdjustments(build({
      muscleSignals: addReady(),
      weeklyContext: { ...build().weeklyContext, weeklySignal: 'reduce', safetyHold: true },
    }));
    expect(onlyFor(out, 'chest').reasonCode).toBe(RC.HOLD_SAFETY);
  });
});

describe('computeSessionAdjustments — R6 default + cold start', () => {
  test('well-recovered but pump high / no room → no event', () => {
    const sig = build().muscleSignals;
    sig.chest.lastFeedback = { pump: 3, joint: 0, performance: 2 }; // good pump → not under-stimulus
    expect(computeSessionAdjustments(build({ muscleSignals: sig }))).toEqual([]);
  });

  test('ad-hoc exercise (no exerciseId) is silent', () => {
    const out = computeSessionAdjustments(build({
      todaysExercises: [{ exerciseId: null, primaryMuscle: 'chest', plannedSets: 4 }],
    }));
    expect(out).toEqual([]);
  });

  test('exercise with no signals for its muscle never adjusts', () => {
    const out = computeSessionAdjustments(build({ muscleSignals: {} }));
    expect(out).toEqual([]);
  });
});

describe('computeSessionAdjustments — revert memory', () => {
  test('2 reverts for a muscle this meso → engine holds that muscle', () => {
    const sig = build().muscleSignals;
    sig.chest.presessionSoreness = 3; // would otherwise drop
    const out = computeSessionAdjustments(build({
      muscleSignals: sig,
      recentSessionEvents: [
        { muscle: 'chest', decision: 'session_adjustment_reverted', createdAt: NOW - 9 * DAY },
        { muscle: 'chest', decision: 'session_adjustment_reverted', createdAt: NOW - 5 * DAY },
      ],
    }));
    const c = onlyFor(out, 'chest');
    expect(c.reasonCode).toBe(RC.HOLD_USER_PREF);
    expect(c.setDelta).toBe(0);
    expect(c.show).toBe(false);
  });
});

describe('computeSessionAdjustments — caps', () => {
  test('max 2 adjusted exercises per session; drops kept before adds', () => {
    const exercises = [
      { exerciseId: 'q', primaryMuscle: 'quads', plannedSets: 4 },
      { exerciseId: 'h', primaryMuscle: 'hamstrings', plannedSets: 4 },
      { exerciseId: 'c', primaryMuscle: 'calves', plannedSets: 4 },
    ];
    // quads + hamstrings sore (drops); calves add-ready (add). Cap keeps 2 drops.
    const muscleSignals = {
      quads: { lastTrainedAt: NOW - DAY, presessionSoreness: 3, lastFeedback: { pump: 3, joint: 0, performance: 2 } },
      hamstrings: { lastTrainedAt: NOW - DAY, presessionSoreness: 3, lastFeedback: { pump: 3, joint: 0, performance: 2 } },
      calves: { lastTrainedAt: NOW - DAY, presessionSoreness: 1, lastFeedback: { pump: 2, joint: 0, performance: 2 } },
    };
    const landmarks = {
      quads: { mev: 2, mav: 20, mrv: 24 },
      hamstrings: { mev: 2, mav: 20, mrv: 24 },
      calves: { mev: 2, mav: 20, mrv: 24 },
    };
    const out = computeSessionAdjustments(build({
      todaysExercises: exercises,
      muscleSignals,
      weeklyContext: { ...build().weeklyContext, doneThisWeekByMuscle: {}, landmarks },
    }));
    const nonzero = out.filter(o => o.setDelta !== 0);
    expect(nonzero.length).toBe(2);
    expect(nonzero.every(o => o.setDelta === -1)).toBe(true);
    // the add (calves) was trimmed
    expect(out.find(o => o.muscle === 'calves' && o.setDelta > 0)).toBeUndefined();
  });
});

describe('computeSessionAdjustments — determinism', () => {
  test('identical inputs produce JSON-identical output', () => {
    const a = computeSessionAdjustments(build({ muscleSignals: { chest: { ...build().muscleSignals.chest, presessionSoreness: 3 } } }));
    const b = computeSessionAdjustments(build({ muscleSignals: { chest: { ...build().muscleSignals.chest, presessionSoreness: 3 } } }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('CHECKIN_MUSCLE_MAP', () => {
  test('Shoulders fans out to the three delt heads; Core maps to abs', () => {
    expect(CHECKIN_MUSCLE_MAP.Shoulders).toEqual(['side_delts', 'rear_delts', 'front_delts']);
    expect(CHECKIN_MUSCLE_MAP.Core).toEqual(['abs']);
    expect(CHECKIN_MUSCLE_MAP.Chest).toEqual(['chest']);
  });

  test('shown codes are exactly the two visible adjustments', () => {
    expect(SESSION_SHOWN_CODES.has(RC.DROP_RESIDUAL_SORENESS)).toBe(true);
    expect(SESSION_SHOWN_CODES.has(RC.ADD_UNDER_STIMULUS)).toBe(true);
    expect(SESSION_SHOWN_CODES.has(RC.HOLD_JOINT)).toBe(false);
  });
});

describe('buildSessionAdjustmentInput — pure assembler mappings', () => {
  const exercises = [{ exerciseId: 'e', primaryMuscle: 'side_delts', plannedSets: 4 }];

  test('maps session difficulty to the adaptive performance scale', () => {
    const mk = (d) => buildSessionAdjustmentInput({
      todaysExercises: exercises,
      perMuscle: { side_delts: { lastTrainedAt: 1, sessionDifficulty: d, pump: 2, joint: 1 } },
    }).muscleSignals.side_delts.lastFeedback;
    expect(mk(1).performance).toBe(1); // very easy → exceeded
    expect(mk(3).performance).toBe(2); // moderate → met
    expect(mk(4).performance).toBe(3); // hard → struggled
    expect(mk(5).performance).toBe(4); // brutal → failed
    expect(mk(null).performance).toBe(2); // unknown → met (neutral)
    // pump/joint pass through
    expect(mk(3).pump).toBe(2);
    expect(mk(3).joint).toBe(1);
  });

  test('fans check-in sore display names out to engine keys (Shoulders → delts)', () => {
    const out = buildSessionAdjustmentInput({
      todaysExercises: [
        { exerciseId: 'a', primaryMuscle: 'rear_delts', plannedSets: 3 },
        { exerciseId: 'b', primaryMuscle: 'chest', plannedSets: 3 },
      ],
      checkin: { soreMuscles: 'Shoulders, Core', checkinAt: 123 },
    });
    expect(out.muscleSignals.rear_delts.checkinSore).toBe(true);  // from Shoulders
    expect(out.muscleSignals.chest.checkinSore).toBe(false);
    expect(out.muscleSignals.rear_delts.checkinAt).toBe(123);
  });

  test('maps coach volumeSignal to weeklySignal and carries safetyHold/deload', () => {
    const ctx = (vs, safety) => buildSessionAdjustmentInput({
      todaysExercises: exercises,
      coachOutput: { volumeSignal: vs, safetyHold: safety },
      isDeload: true,
    }).weeklyContext;
    expect(ctx(-2, false).weeklySignal).toBe('reduce');
    expect(ctx(0, false).weeklySignal).toBe('hold');
    expect(ctx(3, false).weeklySignal).toBe('push');
    expect(ctx(0, true).safetyHold).toBe(true);
    expect(ctx(0, false).isDeload).toBe(true);
  });

  test('no coach output → weeklySignal hold, safetyHold false', () => {
    const ctx = buildSessionAdjustmentInput({ todaysExercises: exercises }).weeklyContext;
    expect(ctx.weeklySignal).toBe('hold');
    expect(ctx.safetyHold).toBe(false);
  });

  test('assembled input flows through computeSessionAdjustments end to end', () => {
    const input = buildSessionAdjustmentInput({
      todaysExercises: exercises,
      perMuscle: { side_delts: { lastTrainedAt: 1000, sessionDifficulty: 5, pump: 3, joint: 0 } },
      checkin: { soreMuscles: 'Shoulders', checkinAt: 900 },
      presessionSoreness: 1,
      landmarks: { side_delts: { mev: 8, mav: 16, mrv: 26 } },
      weeklyVolumeByMuscle: { side_delts: 10 },
      now: 1000 + 24 * 3600 * 1000, // 1 day after last trained → within 72h
      weekStartMs: 0,
    });
    const out = computeSessionAdjustments(input);
    // fresh check-in flagged shoulders + trained <=72h → residual-soreness drop
    expect(out.find(o => o.muscle === 'side_delts')?.setDelta).toBe(-1);
  });
});
