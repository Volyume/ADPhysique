/**
 * COMP-015 — computeSessionAdjustments golden-table + matrix tests.
 *
 * Pins every cell of the R0–R6 rule matrix, the caps/clamps, the muscle-name
 * map, and the revert-memory derivation. The fuzz invariants live alongside the
 * other engines in engine-invariants.test.js.
 *
 * B2 — readiness-informed session tweaks (second half of this file). Pins the
 * fixed rule table and its HARD INVARIANT, written to fail if it is ever
 * broken: for EVERY readiness input and plan shape, the adjusted targets are
 * <= the plan's targets (sets and load), 'sharp'/'average' never change
 * targets at all, the rules are deterministic (no Date.now, no randomness),
 * and the why copy never references body weight or food (ED rule).
 */
import fs from 'fs';
import path from 'path';
import { computeSessionAdjustments, buildSessionAdjustmentInput } from '../algorithms';
import {
  CHECKIN_MUSCLE_MAP,
  SESSION_REASON_CODES as RC,
  SESSION_SHOWN_CODES,
} from '../whyThisTemplates';
import {
  READINESS_RULES,
  getReadinessTweak,
  applyReadinessToSets,
  applyReadinessToLoad,
  applyReadinessToTargets,
} from '../sessionAdjustments';

// sessionAdjustments.js also exports the COMP-015 IO orchestrator, which pulls
// in the SQLite layer. The B2 functions under test are pure; stub the IO deps.
jest.mock('../database', () => ({}));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

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

// ── B2: readiness-informed session tweaks (downward-only rule table) ─────────

// Deterministic PRNG (same construction as engine-invariants.test.js) so the
// downward-only fuzz run is reproducible across CI.
function mulberry32(seed) {
  let a = seed;
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260702);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const rint = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const rfloat = (min, max) => rng() * (max - min) + min;

// Every string anywhere in the rule table (whys, acknowledgements, variants).
function collectStrings(obj, out = []) {
  if (typeof obj === 'string') { out.push(obj); return out; }
  if (obj && typeof obj === 'object') {
    for (const v of Object.values(obj)) collectStrings(v, out);
  }
  return out;
}

describe('B2 READINESS_RULES — the fixed rule table', () => {
  test('covers exactly the three intent-sheet answers', () => {
    expect(Object.keys(READINESS_RULES).sort()).toEqual(['average', 'below_par', 'sharp']);
  });

  test('every rule is downward-only: setDelta <= 0 and loadFactor <= 1', () => {
    for (const [intent, rule] of Object.entries(READINESS_RULES)) {
      expect(rule.setDelta).toBeLessThanOrEqual(0);
      expect(rule.loadFactor).toBeLessThanOrEqual(1);
      expect(rule.loadFactor).toBeGreaterThan(0);
      expect(Number.isFinite(rule.setDelta)).toBe(true);
      expect(Number.isFinite(rule.loadFactor)).toBe(true);
      expect(Object.isFrozen(rule)).toBe(true);
      if (intent !== 'below_par') {
        // only poor readiness ever tweaks anything
        expect(rule.setDelta).toBe(0);
        expect(rule.loadFactor).toBe(1);
      }
    }
    expect(Object.isFrozen(READINESS_RULES)).toBe(true);
  });

  test('below_par: one set fewer and a 5 per cent load trim, with written whys', () => {
    const r = READINESS_RULES.below_par;
    expect(r.setDelta).toBe(-1);
    expect(r.loadFactor).toBe(0.95);
    expect(r.whySets.sleep).toBe('Rough night: one set fewer on each lift today keeps quality up.');
    expect(typeof r.whySets.energy).toBe('string');
    expect(typeof r.whySets.default).toBe('string');
    expect(typeof r.whyLoad).toBe('string');
  });

  test('sharp: acknowledgement only, never a target change', () => {
    const r = READINESS_RULES.sharp;
    expect(r.setDelta).toBe(0);
    expect(r.loadFactor).toBe(1);
    expect(typeof r.acknowledgement).toBe('string');
  });

  test('average: silent — no reduction, no acknowledgement', () => {
    const r = READINESS_RULES.average;
    expect(r.setDelta).toBe(0);
    expect(r.loadFactor).toBe(1);
    expect(r.acknowledgement).toBeUndefined();
    expect(r.whySets).toBeUndefined();
  });

  test('ED rule: no why copy references body weight or food', () => {
    for (const s of collectStrings(READINESS_RULES)) {
      expect(s).not.toMatch(/\b(weight|weights|weigh|kg|lbs?|food|meal|calorie|calories|kcal|eat|eats|eating|diet)\b/i);
    }
  });

  test('voice: no em dash in any user-facing copy', () => {
    for (const s of collectStrings(READINESS_RULES)) {
      expect(s).not.toContain('—');
    }
  });
});

describe('B2 getReadinessTweak — intent + chips → tweak', () => {
  test('below_par picks the why variant from the readiness chips (sleep first)', () => {
    expect(getReadinessTweak('below_par', { sleepQuality: 2 }).whySets)
      .toBe(READINESS_RULES.below_par.whySets.sleep);
    expect(getReadinessTweak('below_par', { energyScore: 2 }).whySets)
      .toBe(READINESS_RULES.below_par.whySets.energy);
    expect(getReadinessTweak('below_par', {}).whySets)
      .toBe(READINESS_RULES.below_par.whySets.default);
    // deterministic tie-break: poor sleep outranks low energy
    expect(getReadinessTweak('below_par', { sleepQuality: 2, energyScore: 2 }).whySets)
      .toBe(READINESS_RULES.below_par.whySets.sleep);
  });

  test('below_par reduces; sharp acknowledges; average carries nothing', () => {
    const poor = getReadinessTweak('below_par', {});
    expect(poor.reduces).toBe(true);
    expect(poor.setDelta).toBe(-1);
    expect(poor.loadFactor).toBe(0.95);
    expect(typeof poor.whyLoad).toBe('string');

    const sharp = getReadinessTweak('sharp', {});
    expect(sharp.reduces).toBe(false);
    expect(sharp.whySets).toBeNull();
    expect(sharp.whyLoad).toBeNull();
    expect(typeof sharp.acknowledgement).toBe('string');

    const avg = getReadinessTweak('average', {});
    expect(avg.reduces).toBe(false);
    expect(avg.whySets).toBeNull();
    expect(avg.acknowledgement).toBeNull();
  });

  test('unknown / missing intents return null', () => {
    expect(getReadinessTweak(null)).toBeNull();
    expect(getReadinessTweak(undefined)).toBeNull();
    expect(getReadinessTweak('')).toBeNull();
    expect(getReadinessTweak('nonsense')).toBeNull();
  });
});

describe('B2 applyReadinessToSets — downward-only, floored at 1', () => {
  const poor = getReadinessTweak('below_par', {});

  test('below_par drops one set, never below one', () => {
    expect(applyReadinessToSets(4, poor)).toBe(3);
    expect(applyReadinessToSets(2, poor)).toBe(1);
    expect(applyReadinessToSets(1, poor)).toBe(1);
  });

  test('sharp/average/null leave the plan untouched', () => {
    expect(applyReadinessToSets(4, getReadinessTweak('sharp', {}))).toBe(4);
    expect(applyReadinessToSets(4, getReadinessTweak('average', {}))).toBe(4);
    expect(applyReadinessToSets(4, null)).toBe(4);
  });

  test('degenerate plan shapes pass through unchanged (still <= plan)', () => {
    expect(applyReadinessToSets(0, poor)).toBe(0);
    expect(applyReadinessToSets(null, poor)).toBeNull();
    expect(applyReadinessToSets(undefined, poor)).toBeUndefined();
    expect(Number.isNaN(applyReadinessToSets(NaN, poor))).toBe(true);
  });
});

describe('B2 applyReadinessToLoad — 5 per cent trim, rounded DOWN to 0.25', () => {
  const poor = getReadinessTweak('below_par', {});

  test('table-fixed trims on realistic loads', () => {
    expect(applyReadinessToLoad(100, poor)).toBe(95);
    expect(applyReadinessToLoad(102.5, poor)).toBe(97.25); // 97.375 floors to 97.25
    expect(applyReadinessToLoad(60, poor)).toBe(57);
    expect(applyReadinessToLoad(2.5, poor)).toBe(2.25);    // 2.375 floors to 2.25
  });

  test('rounding can never lift the suggestion back above plan', () => {
    for (let w = 0.25; w <= 300; w += 0.25) {
      expect(applyReadinessToLoad(w, poor)).toBeLessThanOrEqual(w);
    }
  });

  test('a load too small to trim on the 0.25 grid stays as planned', () => {
    expect(applyReadinessToLoad(0.2, poor)).toBe(0.2);
  });

  test('sharp/average/null and non-positive loads pass through unchanged', () => {
    expect(applyReadinessToLoad(100, getReadinessTweak('sharp', {}))).toBe(100);
    expect(applyReadinessToLoad(100, getReadinessTweak('average', {}))).toBe(100);
    expect(applyReadinessToLoad(100, null)).toBe(100);
    expect(applyReadinessToLoad(0, poor)).toBe(0);
    expect(applyReadinessToLoad(-20, poor)).toBe(-20);
    expect(applyReadinessToLoad(null, poor)).toBeNull();
  });
});

describe('B2 applyReadinessToTargets — the suggested-load display layer', () => {
  const poor = getReadinessTweak('below_par', {});

  test('trims weights, marks the direction, and leaves reps alone', () => {
    const targets = [
      { weight: 100, repsMin: 8, repsMax: 12, action: 'increase' },
      { weight: 60, repsMin: 9, repsMax: 12, action: 'add_rep' },
    ];
    const out = applyReadinessToTargets(targets, poor);
    expect(out[0]).toMatchObject({ weight: 95, repsMin: 8, repsMax: 12, action: 'decrease' });
    expect(out[1]).toMatchObject({ weight: 57, repsMin: 9, repsMax: 12, action: 'decrease' });
    // input is never mutated
    expect(targets[0].weight).toBe(100);
  });

  test('deload prescriptions are never touched', () => {
    const targets = [{ weight: 40, repsMin: 5, repsMax: 5, action: 'deload', isDeload: true }];
    expect(applyReadinessToTargets(targets, poor)[0]).toBe(targets[0]);
  });

  test('a non-reducing tweak returns the same array untouched', () => {
    const targets = [{ weight: 100, repsMin: 8, repsMax: 12, action: 'maintain' }];
    expect(applyReadinessToTargets(targets, getReadinessTweak('sharp', {}))).toBe(targets);
    expect(applyReadinessToTargets(targets, null)).toBe(targets);
  });
});

describe('B2 HARD INVARIANT — downward-only fuzz over the rule table', () => {
  const intents = ['sharp', 'average', 'below_par', null, undefined, '', 'nonsense'];
  const chipVals = [null, undefined, 2, 3, 4];

  test('for EVERY readiness input and plan shape, adjusted <= plan (2000 cases)', () => {
    for (let i = 0; i < 2000; i++) {
      const intent = pick(intents);
      const chips = { sleepQuality: pick(chipVals), energyScore: pick(chipVals) };
      const tweak = getReadinessTweak(intent, chips);

      // sets: ints, floats, zero, negatives, non-numbers
      const plannedSets = pick([rint(1, 10), rint(-3, 0), rfloat(0.1, 12), null, undefined, NaN]);
      const adjSets = applyReadinessToSets(plannedSets, tweak);
      if (Number.isFinite(plannedSets)) {
        expect(adjSets).toBeLessThanOrEqual(plannedSets);
        expect(Number.isFinite(adjSets)).toBe(true);
      } else {
        expect(Object.is(adjSets, plannedSets)).toBe(true);
      }

      // load: realistic, tiny, zero, negative, non-numbers
      const plannedLoad = pick([rfloat(0.05, 2), rfloat(1, 300), rint(0, 500), 0, -rfloat(0, 50), null, NaN]);
      const adjLoad = applyReadinessToLoad(plannedLoad, tweak);
      if (Number.isFinite(plannedLoad) && plannedLoad > 0) {
        expect(adjLoad).toBeLessThanOrEqual(plannedLoad);
        expect(adjLoad).toBeGreaterThan(0);
      } else {
        expect(Object.is(adjLoad, plannedLoad)).toBe(true);
      }

      // good/neutral readiness NEVER changes a target, in any direction
      if (intent === 'sharp' || intent === 'average') {
        expect(Object.is(adjSets, plannedSets)).toBe(true);
        expect(Object.is(adjLoad, plannedLoad)).toBe(true);
      }

      // per-set targets: every weight <= plan, reps untouched
      const targets = Array.from({ length: rint(0, 4) }, () => ({
        weight: pick([rfloat(0, 250), 0, rfloat(0.05, 1)]),
        repsMin: rint(1, 15),
        repsMax: rint(5, 20),
        action: pick(['increase', 'maintain', 'add_rep', 'decrease']),
      }));
      const outTargets = applyReadinessToTargets(targets, tweak);
      expect(outTargets.length).toBe(targets.length);
      outTargets.forEach((t, j) => {
        expect(t.weight).toBeLessThanOrEqual(targets[j].weight);
        expect(t.repsMin).toBe(targets[j].repsMin);
        expect(t.repsMax).toBe(targets[j].repsMax);
      });

      // determinism: the same inputs give JSON-identical outputs on a re-run
      expect(JSON.stringify(getReadinessTweak(intent, chips))).toBe(JSON.stringify(tweak ?? null));
      expect(Object.is(applyReadinessToSets(plannedSets, tweak), adjSets)).toBe(true);
      expect(Object.is(applyReadinessToLoad(plannedLoad, tweak), adjLoad)).toBe(true);
      expect(JSON.stringify(applyReadinessToTargets(targets, tweak)))
        .toBe(JSON.stringify(outTargets));
    }
  });
});

describe('B2 source guard — the rules are deterministic by construction', () => {
  test('the B2 section of sessionAdjustments.js has no Date.now and no randomness', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'sessionAdjustments.js'), 'utf8');
    const markerIdx = src.indexOf('B2: readiness-informed session tweaks');
    expect(markerIdx).toBeGreaterThan(-1);
    const b2Section = src.slice(markerIdx);
    expect(b2Section).not.toMatch(/Date\.now/);
    expect(b2Section).not.toMatch(/Math\.random/);
    // and the whole file never reaches for randomness anywhere
    expect(src).not.toMatch(/Math\.random/);
  });
});
