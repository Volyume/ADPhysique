/**
 * personalRecovery.test.js -- the per-muscle recovery estimate learns from the
 * athlete's own lifts (register D210). Founder, 2026-09-26: "We had recovery
 * intelligence that learns people's recovery and adjusts as it goes along
 * based on performance from a start. Is that what you've used for the
 * recovery section or have you used rudimentary numbers?"
 *
 * WHAT THIS SUITE PINS, written to FAIL against the estimate as D201 built
 * it (fixed baselines that never learn), over the REAL engine (algorithms,
 * constants, muscleRecoveryModel; nothing mocked):
 *  - it starts from the research figure shaped by the recovery answer, and
 *    with no evidence the map reads exactly as before;
 *  - lifts that hold after gaps the estimate calls too short to recover
 *    shorten that muscle's estimate; lifts that dip after gaps it calls
 *    long enough lengthen it; only the muscle that showed it moves;
 *  - a steady schedule teaches nothing either way (steady partial recovery
 *    and full recovery look the same from one session to the next), so
 *    ordinary day-to-day dips never stretch anyone's estimate;
 *  - recovery weeks, sessions trained to a different RIR target, circuit
 *    and ballistic sets, sessions under an injury limit, lifts that
 *    disagree within one session and sessions outside the window never
 *    teach;
 *  - fewer than PERSONAL_MIN_EXPOSURES checks leave the start untouched,
 *    the factor stays inside its bounds, and the same history gives the
 *    same answer in any order.
 */
const {
  learnPersonalRecovery, personalDirection, isMissedSet, sameEffortTarget, PERSONAL_HISTORY_DAYS,
} = require('../personalRecovery');
const { buildMuscleRecoveryMap } = require('../muscleRecoveryModel');
const {
  PERSONAL_FACTOR_MIN, PERSONAL_FACTOR_MAX, PERSONAL_MIN_EXPOSURES, PERSONAL_WINDOW_DAYS,
  PERSONAL_BASELINE_MAX_GAP_DAYS, LOOKBACK_DAYS, RATING_FACTOR, recoveryHours,
} = require('../constants');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.UTC(2026, 8, 26, 12, 0, 0);

// Primary movers only, so each lift loads exactly one muscle.
const EXERCISES = {
  bench: { id: 'bench', primaryMuscle: 'chest', secondaryMuscles: [] },
  incline: { id: 'incline', primaryMuscle: 'chest', secondaryMuscles: [] },
  squat: { id: 'squat', primaryMuscle: 'quads', secondaryMuscles: [] },
};

/**
 * A completed one-hour session. `lifts`: [{ ex, weight, reps, sets,
 * failedFirst, targetMin, setType, evidenceClass }]; six working sets of
 * one lift is the model's reference dose, so chest's length is its 60 h
 * baseline times the factor.
 */
function session(id, startedAt, lifts, { rir = null, deload = false } = {}) {
  const sets = [];
  for (const l of lifts) {
    for (let i = 0; i < (l.sets ?? 6); i += 1) {
      sets.push({
        id: `${id}-${l.ex}-${i}`,
        exerciseId: l.ex,
        setType: l.setType ?? 'straight',
        evidenceClass: l.evidenceClass ?? null,
        weight: l.weight ?? 100,
        actualReps: l.reps ?? 8,
        targetRepsMin: l.targetMin ?? null,
        failed: l.failedFirst && i === 0 ? 1 : 0,
      });
    }
  }
  return {
    id,
    startedAt,
    endedAt: startedAt + HOUR,
    durationMinutes: 60,
    sets,
    weekRirTarget: rir,
    isFirstWeek: false,
    isDeload: deload,
    ratings: { fatigue: null, joint: null, sorenessNext: null },
  };
}

/**
 * Sessions back to back, each starting `gapHours` after the previous one
 * ENDED, the last one ending `endBeforeNow` hours before NOW. `pattern` is
 * [{ gap, lifts, opts }] in order.
 */
function schedule(prefix, pattern, endBeforeNow = 24) {
  let totalSpan = 0;
  pattern.forEach((p, i) => { totalSpan += 1 + (i === 0 ? 0 : p.gap); });
  let start = NOW - endBeforeNow * HOUR - totalSpan * HOUR;
  return pattern.map((p, i) => {
    if (i > 0) start += (1 + p.gap) * HOUR;
    return session(`${prefix}${i}`, start, p.lifts, p.opts);
  });
}

const HELD = [{ ex: 'bench', weight: 100, reps: 8 }];
const DIPPED = [{ ex: 'bench', weight: 100, reps: 6 }]; // an estimated max about 6% lower

// Chest at the reference dose is 60 h at the start. 41 h after a session it
// reads Recovering (68%); 96 h after, Recovered at every factor on the grid.
// A factor of 0.75 (45 h) would read 41 h as Recovered (91%).
function fastRecoverer(cycles = 6) {
  const pattern = [{ gap: 0, lifts: HELD }];
  for (let c = 0; c < cycles; c += 1) {
    pattern.push({ gap: 96, lifts: HELD }, { gap: 41, lifts: HELD });
  }
  return schedule('f', pattern);
}

// 58 h after a session chest reads Recovered at the start (97%) but Nearly
// recovered at 1.1 (88%); 120 h after, Recovered everywhere. Lifts dip after
// the 58 h gaps and come back after the long ones.
function slowRecoverer(cycles = 4) {
  const pattern = [{ gap: 0, lifts: HELD }];
  for (let c = 0; c < cycles; c += 1) {
    pattern.push({ gap: 120, lifts: HELD }, { gap: 58, lifts: DIPPED });
  }
  return schedule('s', pattern);
}

const learn = (sessions, extra = {}) => learnPersonalRecovery({
  sessions, exerciseById: EXERCISES, recoveryRating: 'average', nowMs: NOW, ...extra,
});

describe('the start', () => {
  test('every muscle starts at the recovery answer\'s own factor, checked against nothing', () => {
    for (const rating of ['poor', 'average', 'good']) {
      const out = learnPersonalRecovery({ sessions: [], exerciseById: EXERCISES, recoveryRating: rating, nowMs: NOW });
      expect(out.chest).toEqual({ factor: RATING_FACTOR[rating], prior: RATING_FACTOR[rating], checked: 0 });
      expect(personalDirection(out.chest)).toBe('not_yet');
    }
  });

  test('with nothing learned, the map reads exactly as it did before the learner existed', () => {
    const sessions = fastRecoverer(1);
    for (const rating of ['poor', 'average', 'good']) {
      const learned = learnPersonalRecovery({ sessions, exerciseById: EXERCISES, recoveryRating: rating, nowMs: NOW });
      expect(learned.chest.factor).toBe(RATING_FACTOR[rating]);
      const before = buildMuscleRecoveryMap({ sessions, exerciseById: EXERCISES, recoveryRating: rating, nowMs: NOW });
      const after = buildMuscleRecoveryMap({ sessions, exerciseById: EXERCISES, recoveryRating: rating, nowMs: NOW, personal: learned });
      const { personal, ...rest } = after.chest;
      expect(rest).toEqual(before.chest);
      expect(personal).toEqual(learned.chest);
    }
  });

  test('recoveryHours: a learned factor takes the recovery answer\'s place, inside its bounds', () => {
    expect(recoveryHours('chest', { personalFactor: 0.75 })).toBeCloseTo(45, 6);
    expect(recoveryHours('chest', { recoveryRating: 'poor', personalFactor: 0.75 })).toBeCloseTo(45, 6);
    expect(recoveryHours('chest', { personalFactor: 0.1 })).toBeCloseTo(60 * PERSONAL_FACTOR_MIN, 6);
    expect(recoveryHours('chest', { personalFactor: 9 })).toBeCloseTo(60 * PERSONAL_FACTOR_MAX, 6);
    // Absent reads as the recovery answer, never as zero.
    expect(recoveryHours('chest', { recoveryRating: 'poor', personalFactor: null })).toBeCloseTo(69, 6);
  });
});

describe('learning from the athlete\'s lifts', () => {
  test('lifts that hold after gaps the estimate calls too short shorten that muscle\'s estimate', () => {
    const out = learn(fastRecoverer(6));
    expect(out.chest.checked).toBeGreaterThanOrEqual(PERSONAL_MIN_EXPOSURES);
    expect(out.chest.factor).toBeLessThan(1);
    expect(out.chest.factor).toBe(0.75);
    expect(personalDirection(out.chest)).toBe('sooner');
    // Only the muscle that showed it moves.
    expect(out.quads).toEqual({ factor: 1, prior: 1, checked: 0 });
  });

  test('the shorter estimate reaches the map: 41 hours after a session chest reads recovered', () => {
    // A last session 96 h after the one before, so it is the only one still
    // carrying fatigue 41 h after it ends.
    const history = fastRecoverer(6);
    const lastEnd = history[history.length - 1].endedAt;
    const fresh = session('fresh', lastEnd + 96 * HOUR, HELD);
    const sessions = history.concat(fresh);
    const later = fresh.endedAt + 41 * HOUR;
    const personal = learn(sessions, { nowMs: later });
    const plain = buildMuscleRecoveryMap({ sessions, exerciseById: EXERCISES, recoveryRating: 'average', nowMs: later });
    const adjusted = buildMuscleRecoveryMap({ sessions, exerciseById: EXERCISES, recoveryRating: 'average', nowMs: later, personal });
    expect(plain.chest.status).toBe('recovering'); // 41 of 60 hours: 68%
    expect(adjusted.chest.status).toBe('recovered'); // 41 of 45 hours: 91%
    expect(adjusted.chest.personal.factor).toBe(0.75);
  });

  test('lifts that dip after gaps the estimate calls long enough lengthen it', () => {
    const out = learn(slowRecoverer(4));
    expect(out.chest.checked).toBeGreaterThanOrEqual(PERSONAL_MIN_EXPOSURES);
    expect(out.chest.factor).toBe(1.1);
    expect(personalDirection(out.chest)).toBe('later');
  });

  test('it moves from the recovery answer\'s start, not from a fixed 1.0', () => {
    const good = learnPersonalRecovery({ sessions: slowRecoverer(4), exerciseById: EXERCISES, recoveryRating: 'good', nowMs: NOW });
    expect(good.chest.prior).toBe(RATING_FACTOR.good);
    expect(good.chest.factor).toBeGreaterThan(RATING_FACTOR.good);
  });
});

describe('what can never move it', () => {
  test('a steady schedule of held lifts at a short gap teaches nothing (it cannot tell fast from steadily tired)', () => {
    const pattern = [{ gap: 0, lifts: HELD }];
    for (let i = 0; i < 10; i += 1) pattern.push({ gap: 41, lifts: HELD });
    const out = learn(schedule('q', pattern));
    expect(out.chest.checked).toBeGreaterThanOrEqual(PERSONAL_MIN_EXPOSURES);
    expect(out.chest.factor).toBe(1);
    expect(personalDirection(out.chest)).toBe('same');
  });

  test('ordinary dips on a steady schedule never stretch the estimate', () => {
    const pattern = [{ gap: 0, lifts: HELD }];
    for (let i = 0; i < 12; i += 1) pattern.push({ gap: 72, lifts: i % 3 === 1 ? DIPPED : HELD });
    const out = learn(schedule('n', pattern));
    expect(out.chest.checked).toBeGreaterThanOrEqual(PERSONAL_MIN_EXPOSURES);
    expect(out.chest.factor).toBe(1);
  });

  test('recovery weeks teach nothing, as the session or as its baseline', () => {
    const pattern = [{ gap: 0, lifts: HELD, opts: { deload: true } }];
    for (let c = 0; c < 6; c += 1) {
      pattern.push({ gap: 96, lifts: HELD, opts: { deload: true } }, { gap: 41, lifts: HELD, opts: { deload: true } });
    }
    expect(learn(schedule('d', pattern)).chest).toEqual({ factor: 1, prior: 1, checked: 0 });
  });

  test('a baseline trained to a different RIR target is skipped: effort differs by design between block weeks', () => {
    // A real block: one chest session a week at 3, 2, 1 and 0 reps in
    // reserve, so no session has a same-target baseline within four weeks.
    const block = [3, 2, 1, 0].map((rir, i) => ({ gap: i === 0 ? 0 : 167, lifts: i === 3 ? DIPPED : HELD, opts: { rir } }));
    expect(learn(schedule('r', block)).chest).toEqual({ factor: 1, prior: 1, checked: 0 });
    // The walk back passes a different-target session for an earlier one at
    // the same target: here every other session is at RIR 1.
    const mixed = [{ gap: 0, lifts: HELD, opts: { rir: 1 } }];
    for (let c = 0; c < 6; c += 1) {
      mixed.push({ gap: 30, lifts: HELD, opts: { rir: 3 } }, { gap: 30, lifts: HELD, opts: { rir: 1 } });
    }
    const out = learn(schedule('w', mixed));
    expect(out.chest.checked).toBeGreaterThanOrEqual(PERSONAL_MIN_EXPOSURES);
    // The same weeks at one target do teach.
    const same = [{ gap: 0, lifts: HELD, opts: { rir: 2 } }];
    for (let c = 0; c < 6; c += 1) {
      same.push({ gap: 96, lifts: HELD, opts: { rir: 2 } }, { gap: 41, lifts: HELD, opts: { rir: 2 } });
    }
    expect(learn(schedule('t', same)).chest.factor).toBe(0.75);
    expect(sameEffortTarget({ weekRirTarget: null }, { weekRirTarget: null })).toBe(true);
    expect(sameEffortTarget({ weekRirTarget: 2 }, { weekRirTarget: null })).toBe(false);
    expect(sameEffortTarget({ weekRirTarget: 2 }, { weekRirTarget: '2' })).toBe(true);
  });

  test('circuit and ballistic sets carry no estimated max, so they teach nothing', () => {
    for (const evidenceClass of ['circuit', 'ballistic', 'circuit_ballistic']) {
      const lifts = [{ ex: 'bench', weight: 100, reps: 8, evidenceClass }];
      const pattern = [{ gap: 0, lifts }];
      for (let c = 0; c < 6; c += 1) pattern.push({ gap: 96, lifts }, { gap: 41, lifts });
      expect(learn(schedule(`c${evidenceClass}`, pattern)).chest.checked).toBe(0);
    }
  });

  test('a session under an injury limit for the muscle teaches that muscle nothing', () => {
    const sessions = fastRecoverer(6);
    const excluded = new Set(sessions.map((s) => `${s.id}|chest`));
    expect(learn(sessions, { excluded }).chest).toEqual({ factor: 1, prior: 1, checked: 0 });
  });

  test('two chest lifts that disagree in one session give no answer for chest', () => {
    const both = (dipIncline) => [
      { ex: 'bench', weight: 100, reps: 8, sets: 3 },
      { ex: 'incline', weight: 80, reps: dipIncline ? 6 : 8, sets: 3 },
    ];
    const pattern = [{ gap: 0, lifts: both(false) }];
    for (let c = 0; c < 6; c += 1) pattern.push({ gap: 96, lifts: both(false) }, { gap: 41, lifts: both(true) });
    const out = learn(schedule('m', pattern));
    // Only the long-gap sessions, where both lifts held, are checked.
    expect(out.chest.checked).toBe(6);
    expect(out.chest.factor).toBe(1);
  });

  test('sessions outside the window teach nothing', () => {
    const shifted = fastRecoverer(6).map((s) => ({
      ...s, startedAt: s.startedAt - (PERSONAL_WINDOW_DAYS + 30) * DAY, endedAt: s.endedAt - (PERSONAL_WINDOW_DAYS + 30) * DAY,
    }));
    expect(learn(shifted).chest).toEqual({ factor: 1, prior: 1, checked: 0 });
  });

  test('fewer than the minimum checks leave the start untouched', () => {
    const pattern = [{ gap: 0, lifts: HELD }, { gap: 96, lifts: HELD }, { gap: 41, lifts: HELD }];
    const out = learn(schedule('x', pattern));
    expect(out.chest.checked).toBeLessThan(PERSONAL_MIN_EXPOSURES);
    expect(out.chest.factor).toBe(1);
    expect(personalDirection(out.chest)).toBe('not_yet');
  });
});

describe('bounds and determinism', () => {
  test('however strong the evidence, the factor stays inside its bounds', () => {
    const fast = learn(fastRecoverer(12));
    expect(fast.chest.factor).toBeGreaterThanOrEqual(PERSONAL_FACTOR_MIN);
    const slow = learn(slowRecoverer(10));
    expect(slow.chest.factor).toBeLessThanOrEqual(PERSONAL_FACTOR_MAX);
  });

  test('the same history gives the same answer, whatever order it arrives in', () => {
    const sessions = fastRecoverer(6).concat(schedule('z', [{ gap: 0, lifts: [{ ex: 'squat' }] }, { gap: 80, lifts: [{ ex: 'squat' }] }]));
    const a = learn(sessions);
    const b = learn(sessions.slice().reverse());
    const c = learn(sessions);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });

  test('the loader reads far enough back for everything the learner uses', () => {
    expect(PERSONAL_HISTORY_DAYS).toBe(PERSONAL_WINDOW_DAYS + PERSONAL_BASELINE_MAX_GAP_DAYS + LOOKBACK_DAYS);
  });
});

describe('what counts as a missed set', () => {
  test('a failed set, or fewer reps than the bottom of the target; an unrecorded target or rep count is not a miss', () => {
    expect(isMissedSet({ failed: 1 })).toBe(true);
    expect(isMissedSet({ targetRepsMin: 8, actualReps: 6 })).toBe(true);
    expect(isMissedSet({ targetRepsMin: 8, actualReps: 8 })).toBe(false);
    expect(isMissedSet({ targetRepsMin: null, actualReps: 6 })).toBe(false);
    expect(isMissedSet({ targetRepsMin: 8, actualReps: null })).toBe(false);
  });
});
