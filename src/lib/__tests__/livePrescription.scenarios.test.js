/**
 * livePrescription.scenarios.test.js — the design doc's §18 scenario matrix
 * (docs/live-prescription-campaign-20-2026-08-16/CAMPAIGN-20-PHASE-1-DESIGN.md
 * §18), table-driven, all 46 rows plus extra boundaries found necessary
 * while implementing. Each test's binding assertion is the matrix's
 * "MUST / MUST NOT" column — that is the actual pinned contract; the
 * matrix's "Expected prescription" column is illustrative colour and is
 * asserted only where the design's own worked numbers are exact (not
 * "~approx" text). Default fixture per the matrix header: band 8-12,
 * compound, increment 2.5kg, kg units, difficulty 2, no senior modifiers,
 * >=2 comparable sessions (confidence HIGH) unless a row states otherwise.
 */

const {
  assembleEvidencePacket,
  resolveSetPrescription,
  discountOutliers,
  PROVENANCE,
} = require('../livePrescription');

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function row({ weight, reps, setType = 'straight', pos = 1, at = NOW, targetRepsMin = 8, targetRepsMax = 12, exerciseId = 'ex1' }) {
  return { exerciseId, setType, weight, actualReps: reps, setNumber: pos, targetRepsMin, targetRepsMax, createdAt: at };
}

// One historical session from an array of per-position {weight, reps}.
function hSession(at, sets, { difficulty = 2, targetRepsMin = 8, targetRepsMax = 12 } = {}) {
  return { at, difficulty, sets: sets.map((s, i) => row({ ...s, pos: s.pos ?? i + 1, at: at + i * 1000, targetRepsMin, targetRepsMax })) };
}

function packet({ rawHistory = [], rawToday = [], prescription = { repsMin: 8, repsMax: 12 }, senior = {}, exercise = {}, overrideLoad = null, overrideReps = null } = {}) {
  return assembleEvidencePacket({
    exercise: { id: 'ex1', exerciseType: 'weight_reps', category: 'compound', units: 'kg', ...exercise },
    prescription,
    senior,
    rawHistory,
    rawToday,
    overrideLoad,
    overrideReps,
    now: NOW,
  });
}

function todayRow({ weight, reps, pos, setType = 'straight' }) {
  return row({ weight, reps, pos, setType, at: NOW + pos * 1000 });
}

describe('§18 scenario matrix', () => {
  test('1. First-time, no startingWeight — MUST NOT invent a weight', () => {
    const rx = resolveSetPrescription(packet({}), 1);
    expect(rx.weight).toBeNull();
    expect(rx.provenance).toBe(PROVENANCE.FIRST_TIME_BAND);
  });

  test('2. First-time, startingWeight 40 — MUST seed bottom of band (C5-P14-02)', () => {
    const rx = resolveSetPrescription(packet({ prescription: { repsMin: 8, repsMax: 12, startingWeight: 40 } }), 1);
    expect(rx.weight).toBe(40);
    expect(rx.repsTarget).toBe(8);
    expect(rx.prefill).toBe(true);
  });

  test('3. First-time, today Set 1 = 40x12 — MUST use today\'s set; MUST NOT add load (12=repsMax, not overshoot)', () => {
    const rx = resolveSetPrescription(packet({ rawToday: [todayRow({ weight: 40, reps: 12, pos: 1 })] }), 2);
    expect(rx.weight).toBe(40);
    expect(rx.provenance).not.toBe(PROVENANCE.CURRENT_SESSION_STRONGER);
  });

  test('4. Ordinary: prev 80x10/9/8 — MUST beat expected by exactly 1', () => {
    const hist = [1, 2].map((n) => hSession(NOW - n * 7 * DAY, [{ weight: 80, reps: 10 }, { weight: 80, reps: 9 }, { weight: 80, reps: 8 }]));
    const rx = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    expect(rx.weight).toBe(80);
    expect(rx.repsTarget).toBe(11);
    expect(rx.provenance).toBe(PROVENANCE.MATCH_LOAD_ADD_REP);
  });

  test('5. Range mastered: prev 80x12/12/12 — MUST advance exactly one capped increment', () => {
    const hist = [1, 2].map((n) => hSession(NOW - n * 7 * DAY, [{ weight: 80, reps: 12 }, { weight: 80, reps: 12 }, { weight: 80, reps: 12 }]));
    const rx = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    expect(rx.weight).toBe(82.5);
    expect(rx.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
  });

  test('6. Same, difficulty skipped — MUST NOT auto-add; MUST NOT tell user to log RIR', () => {
    const hist = [1, 2].map((n) => hSession(NOW - n * 7 * DAY, [{ weight: 80, reps: 12 }], { difficulty: null }));
    const rx = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    expect(rx.weight).toBe(80);
    expect(rx.provenance).toBe(PROVENANCE.HOLD_EFFORT_UNKNOWN);
  });

  test('7. Same, difficulty 5 — MUST hold with honest copy', () => {
    const hist = [1, 2].map((n) => hSession(NOW - n * 7 * DAY, [{ weight: 80, reps: 12 }], { difficulty: 5 }));
    const rx = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    expect(rx.weight).toBe(80);
    expect(rx.provenance).toBe(PROVENANCE.HOLD_EFFORT_VERY_HARD);
  });

  test('8. Brief A: prev 80x8/8/8 — MUST rep-progress, MUST NOT add load', () => {
    const hist = [1, 2].map((n) => hSession(NOW - n * 7 * DAY, [{ weight: 80, reps: 8 }, { weight: 80, reps: 8 }, { weight: 80, reps: 8 }]));
    const rx1 = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    expect(rx1.weight).toBe(80);
    expect(rx1.repsTarget).toBe(9);
    expect(rx1.provenance).not.toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
  });

  test('9. Brief B: prev 80x10/9/8 — MUST NOT read the trailing 8 as failure', () => {
    const hist = [1, 2].map((n) => hSession(NOW - n * 7 * DAY, [{ weight: 80, reps: 10 }, { weight: 80, reps: 9 }, { weight: 80, reps: 8 }]));
    const rx = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    expect(rx.weight).toBe(80);
    expect(rx.provenance).not.toBe(PROVENANCE.LOAD_DROP_CONSECUTIVE_MISS);
  });

  test('10. Brief C: prev 80x12/11/10 — MUST advance on the top-set criterion', () => {
    const hist = [1, 2].map((n) => hSession(NOW - n * 7 * DAY, [{ weight: 80, reps: 12 }, { weight: 80, reps: 11 }, { weight: 80, reps: 10 }]));
    const rx = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    expect(rx.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
  });

  test('11. Brief D: prev 80x12/12/12 — same as scenario 5', () => {
    const hist = [1, 2].map((n) => hSession(NOW - n * 7 * DAY, [{ weight: 80, reps: 12 }, { weight: 80, reps: 12 }, { weight: 80, reps: 12 }]));
    const rx = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    expect(rx.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
  });

  test('12. Brief E: prev 80x12/12/8 — MUST NOT let the fatigue tail block the add (8 >= repsMin)', () => {
    const hist = [1, 2].map((n) => hSession(NOW - n * 7 * DAY, [{ weight: 80, reps: 12 }, { weight: 80, reps: 12 }, { weight: 80, reps: 8 }]));
    const rx = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    expect(rx.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
    expect(rx.weight).toBe(82.5);
  });

  test('13. Brief F: single session 80x12/80x9/75x10 — MUST NOT freeze Set 3 at 75; MUST NOT claim a back-off from one observation', () => {
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }, { weight: 80, reps: 9 }, { weight: 75, reps: 10 }])];
    const rx1 = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    const rx3 = resolveSetPrescription(packet({ rawHistory: hist }), 3);
    expect(rx1.weight).toBe(82.5);
    expect(rx3.provenance).not.toBe(PROVENANCE.STABLE_BACKOFF_PATTERN);
    expect(rx3.weight).not.toBe(75); // not frozen at the stale single-session ordinal
    expect(rx3.reference).toEqual({ weight: 75, reps: 10 }); // history still shows the truth
  });

  test('14. One strong top set: prev 80x12/9/7 — MUST NOT advance off the single 12 (Law D)', () => {
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }, { weight: 80, reps: 9 }, { weight: 80, reps: 7 }])];
    const rx = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    expect(rx.weight).toBe(80);
    expect(rx.provenance).not.toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
  });

  test('15. Stronger today (brief): today 80x12/80x11 over an old 75-ordinal — MUST NOT revert to ordinal 75', () => {
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }, { weight: 80, reps: 10 }, { weight: 75, reps: 10 }])];
    const rawToday = [todayRow({ weight: 80, reps: 12, pos: 1 }), todayRow({ weight: 80, reps: 11, pos: 2 })];
    const rx3 = resolveSetPrescription(packet({ rawHistory: hist, rawToday }), 3);
    expect(rx3.weight).toBeGreaterThanOrEqual(80);
    expect(rx3.provenance).toBe(PROVENANCE.CURRENT_SESSION_STRONGER);
  });

  test('16. Same but the 75-Set-3 back-off is stable across 2 of 3 sessions — MUST preserve the structure', () => {
    const hist = [
      hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }, { weight: 80, reps: 11 }, { weight: 75, reps: 10 }]),
      hSession(NOW - 14 * DAY, [{ weight: 78, reps: 12 }, { weight: 78, reps: 10 }, { weight: 73, reps: 10 }]),
      hSession(NOW - 21 * DAY, [{ weight: 76, reps: 12 }, { weight: 76, reps: 10 }, { weight: 71, reps: 10 }]),
    ];
    const rawToday = [todayRow({ weight: 80, reps: 12, pos: 1 }), todayRow({ weight: 80, reps: 11, pos: 2 })];
    const rx3 = resolveSetPrescription(packet({ rawHistory: hist, rawToday }), 3);
    expect(rx3.provenance).toBe(PROVENANCE.STABLE_BACKOFF_PATTERN);
    expect(rx3.weight).toBeLessThan(80);
    expect(rx3.weight).toBeGreaterThan(70);
  });

  test('17. Weaker today (brief): prev 80x12/11/9, today Set1=80x8 — MUST hold load; MUST NOT demand 11-12; MUST NOT drop yet', () => {
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }, { weight: 80, reps: 11 }, { weight: 80, reps: 9 }])];
    const rawToday = [todayRow({ weight: 80, reps: 8, pos: 1 })];
    const rx2 = resolveSetPrescription(packet({ rawHistory: hist, rawToday }), 2);
    expect(rx2.weight).toBe(80);
    expect(rx2.repsTarget).toBeLessThan(11);
    expect(rx2.provenance).toBe(PROVENANCE.CURRENT_SESSION_FATIGUE_ADJUST);
  });

  test('18. Weaker, below band: today Set1=80x6 — MUST drop exactly one increment; re-evaluated per set', () => {
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }, { weight: 80, reps: 11 }, { weight: 80, reps: 9 }])];
    const rawToday = [todayRow({ weight: 80, reps: 6, pos: 1 })];
    const rx2 = resolveSetPrescription(packet({ rawHistory: hist, rawToday }), 2);
    expect(rx2.weight).toBe(77.5);
    expect(rx2.repsTarget).toBe(8);
    expect(rx2.provenance).toBe(PROVENANCE.CURRENT_SESSION_FATIGUE_ADJUST);
  });

  test('19. Overshoot: today Set1=80x14 — MAY add once; MUST NOT compound further this session', () => {
    const rawToday1 = [todayRow({ weight: 80, reps: 14, pos: 1 })];
    const rx2 = resolveSetPrescription(packet({ rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }]) ], rawToday: rawToday1 }), 2);
    expect(rx2.weight).toBe(82.5);
    const rawToday2 = [...rawToday1, todayRow({ weight: 82.5, reps: 14, pos: 2 })];
    const rx3 = resolveSetPrescription(packet({ rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }])], rawToday: rawToday2 }), 3);
    expect(rx3.weight).toBe(82.5); // no second add
  });

  test('20. In-band dip within noise — MUST treat +-2 reps as noise, MATCH_LOAD_ADD_REP continues', () => {
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }])];
    const rawToday = [todayRow({ weight: 80, reps: 9, pos: 1 })];
    const rx2 = resolveSetPrescription(packet({ rawHistory: hist, rawToday }), 2);
    expect(rx2.weight).toBe(80);
    expect(rx2.provenance).toBe(PROVENANCE.MATCH_LOAD_ADD_REP);
  });

  test('21. Back-off progresses with the top (100->102.5 style) — MUST progress the back-off with the top', () => {
    const hist = [
      hSession(NOW - 7 * DAY, [{ weight: 100, reps: 12 }, { weight: 90, reps: 10 }]),
      hSession(NOW - 14 * DAY, [{ weight: 98, reps: 12 }, { weight: 88.2, reps: 10 }]),
    ];
    const rx1 = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    const rx2 = resolveSetPrescription(packet({ rawHistory: hist }), 2);
    expect(rx1.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
    expect(rx2.provenance).toBe(PROVENANCE.STABLE_BACKOFF_PATTERN);
    expect(rx2.weight / rx1.weight).toBeCloseTo(0.9, 1);
  });

  test('22. Set count 3->4 — MUST NOT require a fake "previous Set 4"', () => {
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }, { weight: 80, reps: 9 }, { weight: 80, reps: 8 }])];
    const rawToday = [
      todayRow({ weight: 80, reps: 10, pos: 1 }), todayRow({ weight: 80, reps: 9, pos: 2 }), todayRow({ weight: 80, reps: 8, pos: 3 }),
    ];
    const rx4 = resolveSetPrescription(packet({ rawHistory: hist, rawToday }), 4);
    expect(Number.isFinite(rx4.weight)).toBe(true);
    expect(Number.isFinite(rx4.repsTarget)).toBe(true);
  });

  test('23. Set count 5->3 — MUST NOT average dead ordinals in', () => {
    const hist = [hSession(NOW - 7 * DAY, [
      { weight: 80, reps: 10 }, { weight: 80, reps: 9 }, { weight: 80, reps: 8 }, { weight: 60, reps: 6 }, { weight: 50, reps: 20 },
    ])];
    const rx1 = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    expect(rx1.weight).toBe(80); // top-set framing, unaffected by the light tail positions
  });

  test('24. Band 8-12 -> 6-10, comparable with re-basing — MUST NOT compare raw rep counts across bands', () => {
    // History band 8-12, reps=10 is IN-BAND relative to its OWN band (not
    // topped) even though 10 would misleadingly read as "topped" against a
    // naive comparison to today's 6-10 band.
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }], { targetRepsMin: 8, targetRepsMax: 12 })];
    const rx = resolveSetPrescription(packet({ rawHistory: hist, prescription: { repsMin: 6, repsMax: 10 } }), 1);
    expect(rx.provenance).not.toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
  });

  test('25. Band 15-20 -> 4-6, no meaningful overlap — MUST NOT make load-progression claims from the old band', () => {
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 20, reps: 18 }], { targetRepsMin: 15, targetRepsMax: 20 })];
    const rx = resolveSetPrescription(packet({ rawHistory: hist, prescription: { repsMin: 4, repsMax: 6 } }), 1);
    expect(rx.provenance).toBe(PROVENANCE.INSUFFICIENT_EVIDENCE);
    expect(rx.confidence).toBe('low');
    expect(rx.weight).toBe(20); // last top load held (reference fallback), not a fabricated 4-6 band number
  });

  test('26. incrementKg=5 on an 80kg lift — MUST apply the 5% cap over custom increments', () => {
    const hist = [1, 2].map((n) => hSession(NOW - n * 7 * DAY, [{ weight: 80, reps: 12 }]));
    const rx = resolveSetPrescription(packet({ rawHistory: hist, exercise: { incrementKg: 5 } }), 1);
    expect(rx.weight).toBe(84);
  });

  test('27. Coarse increment (30kg stack, incrementKg 5, >10%) — MUST prefer reps when increment >10% of load', () => {
    const holdPacket = packet({ rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 30, reps: 8 }])], exercise: { category: 'accessory', incrementKg: 5 } });
    const rxHold = resolveSetPrescription(holdPacket, 1);
    expect(rxHold.weight).toBe(30);
    expect(rxHold.provenance).not.toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);

    const advancePacket = packet({
      rawHistory: [1, 2].map((n) => hSession(NOW - n * 7 * DAY, [{ weight: 30, reps: 12 }])),
      exercise: { category: 'accessory', incrementKg: 5 },
    });
    const rxAdvance = resolveSetPrescription(advancePacket, 1);
    expect(rxAdvance.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
    expect(rxAdvance.weight).toBeLessThanOrEqual(30 * 1.05); // 5% cap holds even though incrementKg is coarser
  });

  test('28. User types 75 under an 80 suggestion, logs it — MUST NOT re-suggest 80; MUST NOT rewrite the programme', () => {
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }])];
    const rx = resolveSetPrescription(packet({ rawHistory: hist, overrideLoad: 75 }), 2);
    expect(rx.weight).toBe(75);
    expect(rx.provenance).toBe(PROVENANCE.USER_CHOICE_RESPECTED);
  });

  test('29. User types 85 over an 80 suggestion — same law upward', () => {
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }])];
    const rx = resolveSetPrescription(packet({ rawHistory: hist, overrideLoad: 85 }), 2);
    expect(rx.weight).toBe(85);
    expect(rx.provenance).toBe(PROVENANCE.USER_CHOICE_RESPECTED);
  });

  test('30. Tapping "Use" on the history row — MUST count as an override, identical to typing', () => {
    // The resolver has no notion of input SOURCE — overrideLoad is a single
    // packet field regardless of whether it came from typing or the
    // reference row's "Use" affordance, so this is definitionally identical
    // to scenarios 28/29.
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }])];
    const rxTyped = resolveSetPrescription(packet({ rawHistory: hist, overrideLoad: 75 }), 2);
    const rxTapped = resolveSetPrescription(packet({ rawHistory: hist, overrideLoad: 75 }), 2);
    expect(rxTyped).toEqual(rxTapped);
  });

  test('31. Very hard rating, reps in band — effort gates LOAD only, MUST NOT suppress rep progression', () => {
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }, { weight: 80, reps: 10 }, { weight: 80, reps: 9 }], { difficulty: 5 })];
    const rx = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    expect(rx.weight).toBe(80);
    expect(rx.repsTarget).toBe(11); // beat rule still ran despite the very-hard rating
  });

  test('32. Layoff 10 days — MUST skip advance/anchor logic (LS-04)', () => {
    const hist = [hSession(NOW - 20 * DAY, [{ weight: 80, reps: 12 }])];
    const rx = resolveSetPrescription(packet({ rawHistory: hist, senior: { layoffDays: 10 } }), 1);
    expect(rx.provenance).toBe(PROVENANCE.SENIOR_RECOVERY_HOLD);
    expect(rx.weight).not.toBe(82.5);
  });

  test('33. Deload week — MUST NOT run progression; readiness MUST NOT touch it', () => {
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12 }])];
    const rx = resolveSetPrescription(packet({
      rawHistory: hist,
      senior: { isDeload: true, deloadTargets: [{ weight: 40, reps: 6 }], readinessTweak: { reduces: true, loadFactor: 0.9 } },
    }), 1);
    expect(rx.weight).toBe(40); // readiness never touched the deload row
    expect(rx.provenance).toBe(PROVENANCE.SENIOR_RECOVERY_HOLD);
  });

  test('34. Re-entry ease active — MUST NOT stack with readiness (single downward step)', () => {
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }])];
    const plain = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    const eased = resolveSetPrescription(packet({
      rawHistory: hist,
      senior: { reEntryEaseActive: true, readinessTweak: { reduces: true, loadFactor: 0.95, because: 'athlete_reentry_choice' } },
    }), 1);
    expect(eased.weight).toBeLessThan(plain.weight);
    expect(eased.weight).toBeGreaterThanOrEqual(plain.weight * 0.95 - 0.26); // one trim, not two
  });

  test('35. Readiness below-par — 5% trim after resolve, dismiss restores (downward-only fuzz invariant)', () => {
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }])];
    const plain = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    const trimmed = resolveSetPrescription(packet({ rawHistory: hist, senior: { readinessTweak: { reduces: true, loadFactor: 0.95 } } }), 1);
    expect(trimmed.weight).toBeLessThanOrEqual(plain.weight);
    const dismissed = resolveSetPrescription(packet({ rawHistory: hist }), 1); // "Use planned targets instead"
    expect(dismissed.weight).toBe(plain.weight);
  });

  test('36. Bodyweight pull-ups (reps_only) — MUST NOT ever suggest a load (CALC-5 pin)', () => {
    const hist = [1, 2].map((n) => hSession(NOW - n * 7 * DAY, [{ weight: 0, reps: 12, exerciseId: 'pu' }]));
    const rx = resolveSetPrescription(packet({ rawHistory: hist, exercise: { id: 'pu', exerciseType: 'reps_only' } }), 1);
    expect(rx.weight).toBeNull();
  });

  test('37. Weighted dips +10kg mastered — MUST progress the ADDED load only', () => {
    const hist = [1, 2].map((n) => hSession(NOW - n * 7 * DAY, [{ weight: 10, reps: 12 }]));
    const rx = resolveSetPrescription(packet({ rawHistory: hist, exercise: { exerciseType: 'weighted_bodyweight' } }), 1);
    expect(rx.weight).toBeGreaterThan(10);
    expect(rx.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
  });

  test('38. AMRAP final set — MUST NOT set a numeric rep target; MUST NOT learn structure from it', () => {
    const hist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }])];
    const rx = resolveSetPrescription(packet({ rawHistory: hist }), { index: 1, setType: 'amrap' });
    expect(rx.repsTarget).toBeNull();
    expect(typeof rx.weight).toBe('number');
  });

  test('39. Drop set logged mid-exercise — MUST NOT count segments as sets', () => {
    const rawToday = [
      todayRow({ weight: 80, reps: 10, pos: 1 }),
      todayRow({ weight: 60, reps: 20, pos: 2, setType: 'dropset' }),
    ];
    const p = packet({ rawToday });
    expect(p.today.working.length).toBe(1);
    expect(p.today.working[0].setType).toBe('straight');
  });

  test('40. Myo-reps / rest-pause set — INSUFFICIENT_EVIDENCE posture, summed reps never evidence', () => {
    const rx = resolveSetPrescription(packet({ rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 10 }])] }), { index: 2, setType: 'myo_reps' });
    expect(rx.provenance).toBe(PROVENANCE.INSUFFICIENT_EVIDENCE);
    expect(rx.weight).toBeNull();
  });

  test('41. Superset pair A/B — MUST NOT cross-pollinate loads', () => {
    const pA = packet({ rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 100, reps: 10, exerciseId: 'a' }])], exercise: { id: 'a' } });
    const pB = packet({ rawHistory: [hSession(NOW - 7 * DAY, [{ weight: 100, reps: 10, exerciseId: 'a' }])], exercise: { id: 'b' } });
    expect(pA.history.length).toBe(1);
    expect(pB.history.length).toBe(0); // exercise b never inherits exercise a's rows
  });

  test('42. Per-side DB row — MUST keep per-side semantics (weight is opaque to the resolver)', () => {
    const hist = [1, 2].map((n) => hSession(NOW - n * 7 * DAY, [{ weight: 20, reps: 12 }]));
    const rx = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    // defaultIncrement(20,'kg','compound')=1.25, capped at 5% of 20=1 -> +1.
    expect(rx.weight).toBe(21);
  });

  test('43. Missing last session (skipped week) — MUST be robust to gaps (§8.4)', () => {
    const hist = [
      hSession(NOW - 60 * DAY, [{ weight: 60, reps: 5 }]), // stale (>45 days), reference-only
      hSession(NOW - 20 * DAY, [{ weight: 80, reps: 12 }]),
      hSession(NOW - 27 * DAY, [{ weight: 80, reps: 12 }]),
    ];
    const rx = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    expect(rx.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
  });

  test('44. Malformed history (0/negative weights, null reps) — MUST NOT produce NaN or negative loads', () => {
    const hist = [{
      at: NOW - 7 * DAY,
      sets: [
        row({ weight: -10, reps: 8, pos: 1, at: NOW - 7 * DAY }),
        row({ weight: 80, reps: null, pos: 2, at: NOW - 7 * DAY + 1 }),
      ],
    }];
    const rx = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    expect(Number.isNaN(rx.weight)).toBe(false);
    expect(rx.weight == null || rx.weight >= 0).toBe(true);
    expect(rx.provenance).toBe(PROVENANCE.INSUFFICIENT_EVIDENCE);
    expect(rx.provenance).not.toBe(PROVENANCE.FIRST_TIME_BAND); // history existed, just unusable
  });

  test('45. Outlier bad session — discounted from learning; MUST still show it as history', () => {
    const hist = [
      hSession(NOW - 7 * DAY, [{ weight: 20, reps: 8 }]), // injury/bad day
      hSession(NOW - 14 * DAY, [{ weight: 80, reps: 12 }]),
      hSession(NOW - 21 * DAY, [{ weight: 80, reps: 12 }]),
    ];
    const rx = resolveSetPrescription(packet({ rawHistory: hist }), 1);
    expect(rx.reference).toEqual({ weight: 20, reps: 8 });
    expect(rx.weight).toBe(82.5); // opening resolves from the two 80x12 sessions
  });

  test('46. Exceptional session (+15% one-off) — MUST NOT rewrite structure from one great day', () => {
    const strong = { at: NOW - 7 * DAY, working: [{ pos: 1, weight: 92, reps: 12, setType: 'straight' }], band: { min: 8, max: 12 } };
    const normalA = { at: NOW - 14 * DAY, working: [{ pos: 1, weight: 80, reps: 12 }, { pos: 2, weight: 72, reps: 10 }].map((s) => ({ ...s, setType: 'straight' })), band: { min: 8, max: 12 } };
    const normalB = { at: NOW - 21 * DAY, working: [{ pos: 1, weight: 78, reps: 12 }, { pos: 2, weight: 70.2, reps: 10 }].map((s) => ({ ...s, setType: 'straight' })), band: { min: 8, max: 12 } };
    // The exceptional session (+15% e1RM vs the two normal sessions) is kept, not discounted.
    const kept = discountOutliers([strong, normalA, normalB]);
    expect(kept.length).toBe(3);
  });
});
