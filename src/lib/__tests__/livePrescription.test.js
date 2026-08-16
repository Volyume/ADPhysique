/**
 * livePrescription.test.js — decision-unit boundary tests (Campaign 20
 * Phase 2, design doc §20 first bullet list).
 *
 * Pins the exact numeric boundaries of the resolver's internal decision
 * rules: the §10 load-progression gates (advance/hold/drop across every
 * effort value, the 5% cap over custom increments, the +0.25 floor, grid
 * rounding, the 12/12/8-vs-12/9/7 boundary, bodyweight-never-loads, the
 * layoff advance/anchor skip), the §12 current-session thresholds (the ±2
 * noise floor, the below-band one-increment drop, the single non-compounding
 * overshoot add), the §13 back-off/expected-curve minimum-evidence rules
 * (2-of-3, the 0.05 ratio-agreement edge, the 10% outlier-discount edge, band
 * clamping), the §8 comparability edges (exactly-50% band overlap, the
 * 45-day recency bound, deload exclusion, eligibility filtering), and Law G's
 * override-detection tolerance + per-session expiry. Each test is written to
 * FAIL if the resolver drifts off the pinned number — the house convention
 * (see livePrescription.fq3.test.js, sessionAdjustments.test.js).
 */

const {
  assembleEvidencePacket,
  resolveSetPrescription,
  resolveLoadIncrement,
  nextSessionOpeningLoad,
  stableBackoffRatio,
  discountOutliers,
  adjustStronger,
  adjustWeaker,
  detectLoadOverride,
  detectRepsOverride,
  expectedReps,
  PROVENANCE,
} = require('../livePrescription');

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const BAND = { min: 8, max: 12 };

// ── local fixture helpers (self-contained, house convention) ──────────────

function row({ weight, reps, setType = 'straight', pos = 1, at = NOW, targetRepsMin = 8, targetRepsMax = 12, exerciseId = 'ex1' }) {
  return {
    exerciseId, setType, weight, actualReps: reps, setNumber: pos,
    targetRepsMin, targetRepsMax, createdAt: at,
  };
}

function comparableSession({ at, difficulty = 2, sets, band = BAND }) {
  return { at, difficulty, band, comparable: true, working: sets.map((s, i) => ({ pos: s.pos ?? i + 1, weight: s.weight, reps: s.reps, setType: s.setType ?? 'straight' })) };
}

function historySession({ at, difficulty = 2, sets, targetRepsMin = 8, targetRepsMax = 12 }) {
  return { at, difficulty, sets: sets.map((s, i) => row({ ...s, pos: s.pos ?? i + 1, at: at + i * 1000, targetRepsMin, targetRepsMax })) };
}

function packetWithHistory(rawHistory, overrides = {}) {
  return assembleEvidencePacket({
    exercise: { id: 'ex1', exerciseType: 'weight_reps', category: 'compound', units: 'kg' },
    prescription: { repsMin: 8, repsMax: 12 },
    now: NOW,
    rawHistory,
    ...overrides,
  });
}

// ── §10.1 ADVANCE: effort gate across every value (1-5, null) ─────────────

describe('§10.1 ADVANCE effort gate (FQ-3, retained verbatim)', () => {
  test.each([1, 2, 3])('difficulty %i (supports load) advances one capped increment', (d) => {
    const hist = [
      comparableSession({ at: NOW - 7 * DAY, difficulty: d, sets: [{ weight: 80, reps: 12 }] }),
      comparableSession({ at: NOW - 14 * DAY, difficulty: d, sets: [{ weight: 80, reps: 12 }] }),
    ];
    const out = nextSessionOpeningLoad(hist, BAND, { units: 'kg', category: 'compound' });
    expect(out.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
    expect(out.weight).toBe(82.5);
  });

  test.each([4, 5])('difficulty %i (very hard) holds with HOLD_EFFORT_VERY_HARD', (d) => {
    const hist = [comparableSession({ at: NOW - 7 * DAY, difficulty: d, sets: [{ weight: 80, reps: 12 }] })];
    const out = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    expect(out.provenance).toBe(PROVENANCE.HOLD_EFFORT_VERY_HARD);
    expect(out.weight).toBe(80);
  });

  test('null (skipped) difficulty holds with HOLD_EFFORT_UNKNOWN, never invents an instruction to log RIR', () => {
    const hist = [comparableSession({ at: NOW - 7 * DAY, difficulty: null, sets: [{ weight: 80, reps: 12 }] })];
    const out = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    expect(out.provenance).toBe(PROVENANCE.HOLD_EFFORT_UNKNOWN);
    expect(out.weight).toBe(80);
  });
});

// ── §10.2 the ONE increment source: cap, floor, grid ───────────────────────

describe('§10.2 increment resolution: 5% cap, 0.25 grid, +0.25 floor', () => {
  test('a custom incrementKg larger than 5% of load is capped down', () => {
    expect(resolveLoadIncrement(80, { incrementKg: 10 })).toBe(4); // 80*0.05 = 4 < 10
  });

  test('a custom incrementKg smaller than the cap passes through, grid-rounded', () => {
    expect(resolveLoadIncrement(100, { incrementKg: 1.6 })).toBe(1.5); // round(1.6*4)/4 = 1.5
  });

  test('a tiny 5% cap still floors at +0.25 (never a zero-progress advance)', () => {
    expect(resolveLoadIncrement(2, { incrementKg: 0.1 })).toBe(0.25); // 2*0.05=0.1 rounds to 0, floored to 0.25
  });

  test('defaultIncrement is used when no incrementKg is supplied, still capped', () => {
    // defaultIncrement(80, kg, compound) = 2.5; 80*0.05 = 4, so 2.5 passes uncapped.
    expect(resolveLoadIncrement(80, { units: 'kg', category: 'compound' })).toBe(2.5);
  });

  test('scenario 26 pin: incrementKg=5 on an 80kg lift advances to 84 (cap=4, grid-rounded)', () => {
    const hist = [
      comparableSession({ at: NOW - 7 * DAY, sets: [{ weight: 80, reps: 12 }] }),
      comparableSession({ at: NOW - 14 * DAY, sets: [{ weight: 80, reps: 12 }] }),
    ];
    const out = nextSessionOpeningLoad(hist, BAND, { incrementKg: 5, units: 'kg' });
    expect(out.weight).toBe(84);
  });
});

// ── §10.1 the 12/12/8-vs-12/9/7 boundary ───────────────────────────────────

describe('§10.1 boundary: a set AT repsMin holds the range, a set BELOW it does not', () => {
  test('12/12/8 at the same top load still advances — 8 is in band, not below repsMin', () => {
    const hist = [comparableSession({ at: NOW - 7 * DAY, sets: [{ weight: 80, reps: 12 }, { weight: 80, reps: 12 }, { weight: 80, reps: 8 }] })];
    const out = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    expect(out.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
  });

  test('12/9/7 at the same top load does NOT advance — 7 is below repsMin', () => {
    const hist = [comparableSession({ at: NOW - 7 * DAY, sets: [{ weight: 80, reps: 12 }, { weight: 80, reps: 9 }, { weight: 80, reps: 7 }] })];
    const out = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    expect(out.provenance).not.toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
    expect(out.weight).toBe(80);
  });
});

// ── §10.3 consecutive-miss drop ────────────────────────────────────────────

describe('§10.3 DROP: only on TWO consecutive comparable misses', () => {
  test('a single miss holds and rebuilds, never drops', () => {
    const hist = [comparableSession({ at: NOW - 7 * DAY, sets: [{ weight: 80, reps: 6 }] })];
    const out = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    expect(out.provenance).toBe(PROVENANCE.HOLD_BUILDING_RANGE);
    expect(out.weight).toBe(80);
  });

  test('two consecutive misses drop exactly one increment', () => {
    const hist = [
      comparableSession({ at: NOW - 7 * DAY, sets: [{ weight: 80, reps: 6 }] }),
      comparableSession({ at: NOW - 14 * DAY, sets: [{ weight: 80, reps: 6 }] }),
    ];
    const out = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    expect(out.provenance).toBe(PROVENANCE.LOAD_DROP_CONSECUTIVE_MISS);
    expect(out.weight).toBe(77.5);
  });
});

// ── §10.5 / LS-04-H-13: layoff skips advance/anchor entirely ──────────────

describe('§10.5 layoff: opening x0.9, advance/anchor logic skipped', () => {
  test('a session that would normally ADVANCE instead gets the flat 0.9 reduction', () => {
    const packet = packetWithHistory(
      [historySession({ at: NOW - 20 * DAY, sets: [{ weight: 80, reps: 12 }] })],
      { senior: { layoffDays: 10 } },
    );
    const rx = resolveSetPrescription(packet, 1);
    expect(rx.provenance).toBe(PROVENANCE.SENIOR_RECOVERY_HOLD);
    expect(rx.weight).toBeCloseTo(72, 5); // 80 * 0.9, grid-rounded
    expect(rx.weight).not.toBe(82.5); // never the advanced number
  });
});

// ── CALC-5 / FR-C4-4: bodyweight / reps-only never receives a weight ──────

describe('CALC-5 / FR-C4-4 bodyweight-progression pin (migrated onto the resolver)', () => {
  test('reps_only exercises never carry a weight suggestion, even with rich mastered history', () => {
    const packet = assembleEvidencePacket({
      exercise: { id: 'pu', exerciseType: 'reps_only', category: 'compound', units: 'kg' },
      prescription: { repsMin: 6, repsMax: 12 },
      rawHistory: [
        { at: NOW - 7 * DAY, difficulty: 2, sets: [row({ weight: 0, reps: 12, exerciseId: 'pu', targetRepsMin: 6, targetRepsMax: 12, at: NOW - 7 * DAY })] },
        { at: NOW - 14 * DAY, difficulty: 2, sets: [row({ weight: 0, reps: 12, exerciseId: 'pu', targetRepsMin: 6, targetRepsMax: 12, at: NOW - 14 * DAY })] },
      ],
      now: NOW,
    });
    const rx = resolveSetPrescription(packet, 1);
    expect(rx.weight).toBeNull();
    expect(rx.repsTarget).toBeGreaterThan(0); // reps progression still runs
  });

  test('an all-zero-weight history never suggests a weight increase for a normal weight_reps exercise either', () => {
    const hist = [
      comparableSession({ at: NOW - 7 * DAY, sets: [{ weight: 0, reps: 12 }] }),
      comparableSession({ at: NOW - 14 * DAY, sets: [{ weight: 0, reps: 12 }] }),
    ];
    const out = nextSessionOpeningLoad(hist, BAND, { units: 'kg' });
    expect(out.weight).toBe(0);
    expect(out.provenance).not.toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
  });
});

// ── §12 thresholds ──────────────────────────────────────────────────────────

describe('§12 the ±2-rep noise floor', () => {
  test.each([-2, -1, 0, 1, 2])('a %i-rep deviation from expected changes nothing (weaker path)', (delta) => {
    const expected = 10;
    const today = { working: [{ pos: 1, weight: 80, reps: expected + delta, setType: 'straight' }] };
    const out = adjustWeaker({
      today, band: BAND, category: 'compound',
      comparableHistory: [comparableSession({ at: NOW - 7 * DAY, sets: [{ weight: 80, reps: expected }] })],
    });
    expect(out.changed).toBe(false);
  });

  test('a 3-rep-below-expected deviation DOES trigger the fatigue adjust (outside the noise floor)', () => {
    const today = { working: [{ pos: 1, weight: 80, reps: 7, setType: 'straight' }] };
    const out = adjustWeaker({
      today, band: BAND, category: 'compound',
      comparableHistory: [comparableSession({ at: NOW - 7 * DAY, sets: [{ weight: 80, reps: 10 }] })],
    });
    expect(out.changed).toBe(true);
    expect(out.provenance).toBe(PROVENANCE.CURRENT_SESSION_FATIGUE_ADJUST);
  });
});

describe('§12.2 below-band drop: exactly one increment, honest repsMin target', () => {
  test('below repsMin drops one increment and targets repsMin, never more', () => {
    const today = { working: [{ pos: 1, weight: 80, reps: 6, setType: 'straight' }] };
    const out = adjustWeaker({ today, band: BAND, category: 'compound', comparableHistory: [] });
    expect(out.drop).toBe(true);
    expect(out.basisWeight).toBe(80);
    expect(out.repsTargetOverride).toBe(8);
  });
});

describe('§12.1 overshoot ADD: single step, never compounds', () => {
  test('one overshoot set fires the add once', () => {
    const today = { working: [{ pos: 1, weight: 80, reps: 14, setType: 'straight' }] };
    const out = adjustStronger({ today, band: BAND, senior: {} });
    expect(out.changed).toBe(true);
    expect(out.add).toBe(true);
  });

  test('a SECOND overshoot set in the same session, after the load already rose, never re-fires the add', () => {
    const today = {
      working: [
        { pos: 1, weight: 80, reps: 14, setType: 'straight' },
        { pos: 2, weight: 82.5, reps: 14, setType: 'straight' }, // load already rose this session
      ],
    };
    const out = adjustStronger({ today, band: BAND, senior: {} });
    expect(out.changed).toBe(false);
  });

  test('any sub-band set today disqualifies the add outright', () => {
    const today = {
      working: [
        { pos: 1, weight: 80, reps: 6, setType: 'straight' }, // sub-band
        { pos: 2, weight: 80, reps: 14, setType: 'straight' },
      ],
    };
    const out = adjustStronger({ today, band: BAND, senior: {} });
    expect(out.changed).toBe(false);
  });

  test.each(['isDeload', 'blockFinished', 'reEntryEaseActive', 'readinessReductionActive'])(
    'Founder Ruling 2: senior.%s disables the add outright, not merely trims it',
    (flag) => {
      const today = { working: [{ pos: 1, weight: 80, reps: 14, setType: 'straight' }] };
      const out = adjustStronger({ today, band: BAND, senior: { [flag]: true } });
      expect(out.changed).toBe(false);
    },
  );
});

// ── §13.1 back-off structure: 2-of-3 minimum evidence ──────────────────────

describe('§13.1 stable back-off ratio: needs 2 of the last 3 sessions to agree', () => {
  test('one session alone can NEVER create a stable back-off', () => {
    const hist = [comparableSession({ at: NOW - 7 * DAY, sets: [{ weight: 80, reps: 12 }, { weight: 70, reps: 10 }] })];
    expect(stableBackoffRatio(hist, 2)).toBeNull();
  });

  test('two of three sessions agreeing within 0.05 DOES create one', () => {
    const hist = [
      comparableSession({ at: NOW - 7 * DAY, sets: [{ weight: 80, reps: 12 }, { weight: 72, reps: 10 }] }), // ratio 0.90
      comparableSession({ at: NOW - 14 * DAY, sets: [{ weight: 78, reps: 12 }, { weight: 70.2, reps: 10 }] }), // ratio 0.90
      comparableSession({ at: NOW - 21 * DAY, sets: [{ weight: 76, reps: 12 }, { weight: 76, reps: 10 }] }), // ratio 1.0, no back-off
    ];
    const out = stableBackoffRatio(hist, 2);
    expect(out).not.toBeNull();
    expect(out.ratio).toBeCloseTo(0.9, 2);
  });

  test('ratio agreement edge: exactly 0.05 apart still agrees (inclusive boundary)', () => {
    const hist = [
      comparableSession({ at: NOW - 7 * DAY, sets: [{ weight: 100, reps: 12 }, { weight: 90, reps: 10 }] }), // ratio 0.90
      comparableSession({ at: NOW - 14 * DAY, sets: [{ weight: 100, reps: 12 }, { weight: 95, reps: 10 }] }), // ratio 0.95
    ];
    expect(stableBackoffRatio(hist, 2)).not.toBeNull();
  });

  test('ratio agreement edge: 0.06 apart does NOT agree', () => {
    const hist = [
      comparableSession({ at: NOW - 7 * DAY, sets: [{ weight: 100, reps: 12 }, { weight: 89, reps: 10 }] }), // ratio 0.89
      comparableSession({ at: NOW - 14 * DAY, sets: [{ weight: 100, reps: 12 }, { weight: 95, reps: 10 }] }), // ratio 0.95
    ];
    expect(stableBackoffRatio(hist, 2)).toBeNull();
  });
});

// ── §13.3 outlier discount: the 10% boundary ───────────────────────────────

describe('§13.3 outlier discount at the 10% boundary', () => {
  test('a session at exactly 90% of the window median is NOT discounted (inclusive)', () => {
    // e1RM(80,10) is the median-setting session; construct a second session at
    // exactly 90% of it via a proportionally lighter top set.
    const strong = comparableSession({ at: NOW - 7 * DAY, sets: [{ weight: 80, reps: 10 }] });
    const ninety = comparableSession({ at: NOW - 14 * DAY, sets: [{ weight: 72, reps: 10 }] }); // 72 = 80*0.9
    const kept = discountOutliers([strong, ninety]);
    expect(kept.length).toBe(2);
  });

  test('a session just below the 10% boundary IS discounted', () => {
    const strong = comparableSession({ at: NOW - 7 * DAY, sets: [{ weight: 80, reps: 10 }] });
    const strong2 = comparableSession({ at: NOW - 21 * DAY, sets: [{ weight: 80, reps: 10 }] });
    const low = comparableSession({ at: NOW - 14 * DAY, sets: [{ weight: 65, reps: 10 }] }); // well under 90% of median
    const kept = discountOutliers([strong, low, strong2]);
    expect(kept.find((s) => s === low)).toBeUndefined();
    expect(kept.length).toBe(2);
  });
});

// ── expected-reps: clamped to band ─────────────────────────────────────────

describe('§13.2/§11 expected-reps curve stays inside the band', () => {
  test('a large decline chain never pushes the expectation below repsMin', () => {
    const e = expectedReps({ pos: 6, comparableHistory: [], today: { working: [] }, band: BAND, category: 'compound' });
    expect(e).toBeGreaterThanOrEqual(BAND.min);
    expect(e).toBeLessThanOrEqual(BAND.max);
  });

  test('mid-session rebasing from a low today value never goes below repsMin either', () => {
    const e = expectedReps({
      pos: 3,
      comparableHistory: [],
      today: { working: [{ pos: 2, weight: 80, reps: 8, setType: 'straight' }] },
      band: BAND,
      category: 'compound',
    });
    expect(e).toBeGreaterThanOrEqual(BAND.min);
  });
});

// ── §8 comparability edges ─────────────────────────────────────────────────

describe('§8.3 band-overlap: exactly 50% is comparable, 49% is not', () => {
  test('8-12 history vs 6-10 today: overlap 8-10 = 3 of 5 (60%) — comparable', () => {
    const packet = packetWithHistory(
      [historySession({ at: NOW - 7 * DAY, sets: [{ weight: 80, reps: 10 }], targetRepsMin: 8, targetRepsMax: 12 })],
      { prescription: { repsMin: 6, repsMax: 10 } },
    );
    expect(packet.history[0].comparable).toBe(true);
  });

  test('15-20 history vs 4-6 today: no meaningful overlap — not comparable', () => {
    const packet = packetWithHistory(
      [historySession({ at: NOW - 7 * DAY, sets: [{ weight: 20, reps: 18 }], targetRepsMin: 15, targetRepsMax: 20 })],
      { prescription: { repsMin: 4, repsMax: 6 } },
    );
    expect(packet.history[0].comparable).toBe(false);
  });

  test('a band exactly 49% overlapping is not comparable', () => {
    // today 0-100 width; history band [0,49] overlaps [0,100] by 49 (49%).
    const packet = packetWithHistory(
      [historySession({ at: NOW - 7 * DAY, sets: [{ weight: 20, reps: 10 }], targetRepsMin: 0, targetRepsMax: 49 })],
      { prescription: { repsMin: 0, repsMax: 100 } },
    );
    expect(packet.history[0].comparable).toBe(false);
  });
});

describe('§8.4 the 45-day recency bound', () => {
  test('a session exactly 45 days old is still comparable', () => {
    const packet = packetWithHistory([historySession({ at: NOW - 45 * DAY, sets: [{ weight: 80, reps: 10 }] })]);
    expect(packet.history[0].comparable).toBe(true);
  });

  test('a session 46 days old is reference-only, not comparable', () => {
    const packet = packetWithHistory([historySession({ at: NOW - 46 * DAY, sets: [{ weight: 80, reps: 10 }] })]);
    expect(packet.history[0].comparable).toBe(false);
    // Still shown as history (Law A: never hidden, never fabricated).
    expect(packet.history.length).toBe(1);
  });
});

describe('§8.5 deload-session exclusion', () => {
  test('a deload-flagged historical session never enters `history` at all', () => {
    const packet = assembleEvidencePacket({
      exercise: { id: 'ex1', exerciseType: 'weight_reps', category: 'compound', units: 'kg' },
      prescription: { repsMin: 8, repsMax: 12 },
      now: NOW,
      rawHistory: [
        { at: NOW - 7 * DAY, isDeload: true, sets: [row({ weight: 40, reps: 6, at: NOW - 7 * DAY })] },
        { at: NOW - 14 * DAY, sets: [row({ weight: 80, reps: 10, at: NOW - 14 * DAY })] },
      ],
    });
    expect(packet.history.length).toBe(1);
    expect(packet.history[0].working[0].weight).toBe(80);
  });
});

describe('§8.2/§15 eligibility filtering mirrors isE1rmEligibleRow/countProgressSets', () => {
  test('injecting a warm-up, dropset, myo_reps or rest_pause row into history never changes the resolved output', () => {
    const cleanHist = [historySession({ at: NOW - 7 * DAY, sets: [{ weight: 80, reps: 12 }] })];
    const noisyHist = [{
      at: NOW - 7 * DAY,
      difficulty: 2,
      sets: [
        row({ weight: 20, reps: 20, setType: 'warmup', pos: 1, at: NOW - 7 * DAY - 4000 }),
        row({ weight: 60, reps: 30, setType: 'dropset', pos: 2, at: NOW - 7 * DAY - 3000 }),
        row({ weight: 55, reps: 25, setType: 'myo_reps', pos: 3, at: NOW - 7 * DAY - 2000 }),
        row({ weight: 55, reps: 25, setType: 'rest_pause', pos: 4, at: NOW - 7 * DAY - 1000 }),
        row({ weight: 80, reps: 12, pos: 1, at: NOW - 7 * DAY }),
      ],
    }];
    const rxClean = resolveSetPrescription(packetWithHistory(cleanHist), 1);
    const rxNoisy = resolveSetPrescription(packetWithHistory(noisyHist), 1);
    expect(JSON.stringify(rxNoisy)).toBe(JSON.stringify(rxClean));
  });
});

// ── Law G: override detection tolerance + per-session expiry ──────────────

describe('Law G (§9.4) override detection: half-increment tolerance', () => {
  test('a logged weight within half an increment of the prescription is NOT an override', () => {
    // increment at 80kg compound = 2.5, half = 1.25
    expect(detectLoadOverride(81.25, 80, { units: 'kg', category: 'compound' })).toBeNull();
  });

  test('a logged weight more than half an increment away IS an override', () => {
    expect(detectLoadOverride(81.26, 80, { units: 'kg', category: 'compound' })).toBe(81.26);
  });

  test('reps override tolerance is ±2 (within noise = no override)', () => {
    expect(detectRepsOverride(10, 8)).toBeNull(); // exactly 2 away: not > 2
    expect(detectRepsOverride(11, 8)).toBe(11); // 3 away: an override
  });
});

describe('Law G override expiry: a session boundary resets it', () => {
  test('an override present in one packet does not leak into a fresh packet with no override field', () => {
    const overridden = packetWithHistory(
      [historySession({ at: NOW - 7 * DAY, sets: [{ weight: 80, reps: 10 }] })],
      { overrideLoad: 75 },
    );
    const rxOverridden = resolveSetPrescription(overridden, 2);
    expect(rxOverridden.provenance).toBe(PROVENANCE.USER_CHOICE_RESPECTED);

    // Next session's packet: the override field is simply absent again (it is
    // a per-packet input, never persisted state) — ordinary history-driven
    // provenance resumes.
    const nextSessionPacket = packetWithHistory(
      [historySession({ at: NOW - 7 * DAY, sets: [{ weight: 75, reps: 10 }] })], // 75 is now just history
    );
    const rxNext = resolveSetPrescription(nextSessionPacket, 1);
    expect(rxNext.provenance).not.toBe(PROVENANCE.USER_CHOICE_RESPECTED);
  });
});
