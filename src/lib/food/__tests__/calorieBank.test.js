/**
 * Calorie banking (CB-1) invariant tests — written to fail.
 * Source: docs/ultimate-audit-2026-06-13/pass4-blueprint-calorie-banking.md
 * (VERIFICATION: sum-delta===0; no day < floor; big day <= band max; capped;
 *  refuses below the meaningful minimum; deterministic).
 */
import {
  planCalorieBank, deltaSum, bankedDeltaForDay, applyBankToTarget,
  sexFloorKcal, safeDayFloorKcal, displayBankedDelta, maxApplicableBumpKcal,
  MIN_BANK_DELTA_KCAL, MAX_BANK_DELTA_KCAL,
} from '../calorieBank';

const week = (kcal) => ({
  mon: kcal, tue: kcal, wed: kcal, thu: kcal, fri: kcal, sat: kcal, sun: kcal,
});

describe('planCalorieBank — success shape', () => {
  test('bumps the big day and spreads the cut, weekly total unchanged', () => {
    const r = planCalorieBank({
      perDayBaseKcal: week(2600), bigDayKey: 'sat',
      requestedBumpKcal: 240, floorKcal: 1500, bandMaxKcal: 2860,
    });
    expect(r.ok).toBe(true);
    expect(r.appliedBumpKcal).toBe(240);
    expect(r.perDayDeltaKcal.sat).toBe(240);
    // 240 spread over 6 others = -40 each
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sun'].forEach((k) => {
      expect(r.perDayDeltaKcal[k]).toBe(-40);
    });
    expect(deltaSum(r.perDayDeltaKcal)).toBe(0);
  });

  test('uneven splits still sum to exactly zero (integer kcal)', () => {
    const r = planCalorieBank({
      perDayBaseKcal: week(2600), bigDayKey: 'sat',
      requestedBumpKcal: 251, floorKcal: 1500, bandMaxKcal: 2860,
    });
    expect(r.ok).toBe(true);
    expect(r.appliedBumpKcal).toBe(251);
    expect(deltaSum(r.perDayDeltaKcal)).toBe(0); // the load-bearing invariant
    // big day delta is exactly the negation of the others' total
    const othersTotal = Object.entries(r.perDayDeltaKcal)
      .filter(([k]) => k !== 'sat').reduce((a, [, v]) => a + v, 0);
    expect(r.perDayDeltaKcal.sat).toBe(-othersTotal);
  });
});

describe('planCalorieBank — caps to the band max', () => {
  test('an over-bump is capped at room-to-band-max on the big day', () => {
    const r = planCalorieBank({
      perDayBaseKcal: week(2600), bigDayKey: 'sat',
      requestedBumpKcal: 100000, floorKcal: 1500, bandMaxKcal: 2860,
    });
    expect(r.ok).toBe(true);
    // room up = 2860 - 2600 = 260, below MAX_BANK_DELTA (500), so band binds
    expect(r.appliedBumpKcal).toBe(260);
    expect(2600 + r.perDayDeltaKcal.sat).toBeLessThanOrEqual(2860);
  });

  test('never exceeds MAX_BANK_DELTA_KCAL even with huge room', () => {
    const r = planCalorieBank({
      perDayBaseKcal: week(4000), bigDayKey: 'sat',
      requestedBumpKcal: 100000, floorKcal: 1500, bandMaxKcal: 9000,
    });
    expect(r.ok).toBe(true);
    expect(r.appliedBumpKcal).toBe(MAX_BANK_DELTA_KCAL);
  });
});

describe('maxApplicableBumpKcal — the UI ceiling matches what plan applies', () => {
  test('equals the bump planCalorieBank applies for an over-large request (band binds)', () => {
    const args = { perDayBaseKcal: week(2600), bigDayKey: 'sat', floorKcal: 1500, bandMaxKcal: 2860 };
    expect(maxApplicableBumpKcal(args)).toBe(260); // room up = 2860 - 2600
    const r = planCalorieBank({ ...args, requestedBumpKcal: 100000 });
    expect(maxApplicableBumpKcal(args)).toBe(r.appliedBumpKcal);
  });

  test('binds to MAX_BANK_DELTA_KCAL when there is huge room', () => {
    expect(maxApplicableBumpKcal({
      perDayBaseKcal: week(4000), bigDayKey: 'sat', floorKcal: 1500, bandMaxKcal: 9000,
    })).toBe(MAX_BANK_DELTA_KCAL);
  });

  test('binds to the floor spread when that is the tightest constraint', () => {
    // others have only 20 kcal of room each -> 6 * 20 = 120 total spread.
    expect(maxApplicableBumpKcal({
      perDayBaseKcal: week(1520), bigDayKey: 'sat', floorKcal: 1500, bandMaxKcal: 9000,
    })).toBe(120);
  });

  test('returns 0 when no meaningful bump is possible (plan would refuse)', () => {
    // room up = 2630 - 2600 = 30, below MIN_BANK_DELTA_KCAL.
    expect(maxApplicableBumpKcal({
      perDayBaseKcal: week(2600), bigDayKey: 'sat', floorKcal: 1500, bandMaxKcal: 2630,
    })).toBe(0);
  });

  test('returns 0 on invalid input rather than throwing', () => {
    expect(maxApplicableBumpKcal({})).toBe(0);
    expect(maxApplicableBumpKcal({ perDayBaseKcal: week(2600), bigDayKey: 'nope', floorKcal: 1500, bandMaxKcal: 2860 })).toBe(0);
  });
});

describe('planCalorieBank — refuses unsafe / pointless requests (writes nothing)', () => {
  test('refuses when the cut would push a day below the floor', () => {
    // others at 1520, floor 1500 -> only 20 kcal of room each, *6 = 120 total,
    // but each day can only give 20 so even spread is tiny; request 600.
    const r = planCalorieBank({
      perDayBaseKcal: { ...week(1520), sat: 1700 }, bigDayKey: 'sat',
      requestedBumpKcal: 600, floorKcal: 1500, bandMaxKcal: 2000,
    });
    // maxSpread = 20 * 6 = 120 >= 50, so a *capped* bump of 120 is allowed,
    // and no day may breach: check the invariant holds on the applied plan.
    if (r.ok) {
      expect(r.appliedBumpKcal).toBeLessThanOrEqual(120);
      Object.keys(r.perDayDeltaKcal).forEach((k) => {
        const base = k === 'sat' ? 1700 : 1520;
        expect(base + r.perDayDeltaKcal[k]).toBeGreaterThanOrEqual(1500);
      });
    }
  });

  test('refuses (floor) when every other day is already at the floor', () => {
    const r = planCalorieBank({
      perDayBaseKcal: { ...week(1500), sat: 1700 }, bigDayKey: 'sat',
      requestedBumpKcal: 300, floorKcal: 1500, bandMaxKcal: 2200,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('floor');
    expect(r.perDayDeltaKcal).toEqual({});
    expect(r.appliedBumpKcal).toBe(0);
  });

  test('refuses (no_room) when the big day is already at band max', () => {
    const r = planCalorieBank({
      perDayBaseKcal: week(2600), bigDayKey: 'sat',
      requestedBumpKcal: 300, floorKcal: 1500, bandMaxKcal: 2600,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no_room');
  });

  test('refuses (too_small) a sub-minimum request', () => {
    const r = planCalorieBank({
      perDayBaseKcal: week(2600), bigDayKey: 'sat',
      requestedBumpKcal: MIN_BANK_DELTA_KCAL - 1, floorKcal: 1500, bandMaxKcal: 2860,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('too_small');
  });

  test('rejects invalid input (bad day key, <2 days, non-finite)', () => {
    expect(planCalorieBank({ perDayBaseKcal: week(2600), bigDayKey: 'nope', requestedBumpKcal: 200, floorKcal: 1500, bandMaxKcal: 2860 }).reason).toBe('invalid_input');
    expect(planCalorieBank({ perDayBaseKcal: { mon: 2600 }, bigDayKey: 'mon', requestedBumpKcal: 200, floorKcal: 1500, bandMaxKcal: 2860 }).reason).toBe('invalid_input');
    expect(planCalorieBank({ perDayBaseKcal: { mon: 2600, tue: NaN }, bigDayKey: 'mon', requestedBumpKcal: 200, floorKcal: 1500, bandMaxKcal: 2860 }).reason).toBe('invalid_input');
  });
});

describe('planCalorieBank — fuzz the safety invariants', () => {
  test('across many random feasible weeks: sum===0, no day < floor, big day <= band max', () => {
    let okCount = 0;
    for (let i = 0; i < 600; i++) {
      const floor = 1200 + Math.floor(Math.random() * 400);          // 1200..1600
      const base = floor + 200 + Math.floor(Math.random() * 1600);   // floor+200 .. +1800
      const bandMax = base + Math.floor(Math.random() * 400);        // base .. +400
      const days = 2 + Math.floor(Math.random() * 6);                // 2..7 days
      const perDay = {};
      for (let d = 0; d < days; d++) perDay[`d${d}`] = base;
      const bigDayKey = `d${Math.floor(Math.random() * days)}`;
      const requested = Math.floor(Math.random() * 1200);            // 0..1200
      const r = planCalorieBank({ perDayBaseKcal: perDay, bigDayKey, requestedBumpKcal: requested, floorKcal: floor, bandMaxKcal: bandMax });
      if (!r.ok) {
        expect(r.perDayDeltaKcal).toEqual({});
        continue;
      }
      okCount++;
      expect(deltaSum(r.perDayDeltaKcal)).toBe(0);
      Object.keys(perDay).forEach((k) => {
        const after = perDay[k] + (r.perDayDeltaKcal[k] || 0);
        expect(after).toBeGreaterThanOrEqual(floor); // NO day below the floor, ever
      });
      expect(base + r.perDayDeltaKcal[bigDayKey]).toBeLessThanOrEqual(bandMax);
      expect(r.appliedBumpKcal).toBeLessThanOrEqual(MAX_BANK_DELTA_KCAL);
    }
    expect(okCount).toBeGreaterThan(0); // the fuzzer actually exercises the success path
  });
});

describe('bankedDeltaForDay / applyBankToTarget (display helpers)', () => {
  const bank = { perDayDeltaKcal: { '2026-06-20': 240, '2026-06-19': -40 } };
  test('reads the delta for a day, 0 when absent or no bank', () => {
    expect(bankedDeltaForDay(bank, '2026-06-20')).toBe(240);
    expect(bankedDeltaForDay(bank, '2026-06-19')).toBe(-40);
    expect(bankedDeltaForDay(bank, '2026-06-18')).toBe(0);
    expect(bankedDeltaForDay(null, '2026-06-20')).toBe(0);
  });
  test('applies a delta to kcal + carbs only (protein/fat held)', () => {
    const t = { targetKcal: 2600, proteinG: 180, carbsG: 290, fatG: 75 };
    const up = applyBankToTarget(t, 240);
    expect(up.targetKcal).toBe(2840);
    expect(up.carbsG).toBe(290 + 60); // 240/4
    expect(up.proteinG).toBe(180);
    expect(up.fatG).toBe(75);
    const down = applyBankToTarget(t, -40);
    expect(down.targetKcal).toBe(2560);
    expect(down.carbsG).toBe(290 - 10);
  });
  test('no delta returns the target unchanged', () => {
    const t = { targetKcal: 2600, carbsG: 290 };
    expect(applyBankToTarget(t, 0)).toBe(t);
  });
});

describe('safeDayFloorKcal (FFM floor must bind when higher — review fix #1)', () => {
  test('sex floor is the baseline', () => {
    expect(sexFloorKcal('male')).toBe(1500);
    expect(sexFloorKcal('female')).toBe(1200);
    expect(sexFloorKcal(null)).toBe(1200);
  });
  test('uses the FFM floor when it exceeds the sex floor (heavy/lean user)', () => {
    // 100kg male @15% BF -> ~85kg FFM -> well above 1500.
    expect(safeDayFloorKcal({ sex: 'male', ffmFloorKcal: 2550 })).toBe(2550);
  });
  test('falls back to the sex floor when FFM is unknown or lower', () => {
    expect(safeDayFloorKcal({ sex: 'male', ffmFloorKcal: null })).toBe(1500);
    expect(safeDayFloorKcal({ sex: 'male', ffmFloorKcal: 1400 })).toBe(1500);
    expect(safeDayFloorKcal({ sex: 'female' })).toBe(1200);
  });
});

describe('displayBankedDelta (stale bank suppressed by carve-outs — review fix #2)', () => {
  const bank = { perDayDeltaKcal: { '2026-06-20': 240, '2026-06-19': -40 } };
  test('applies only when banking is currently available', () => {
    expect(displayBankedDelta({ bankingAvailable: true, calorieBank: bank, dayKey: '2026-06-20' })).toBe(240);
    expect(displayBankedDelta({ bankingAvailable: true, calorieBank: bank, dayKey: '2026-06-19' })).toBe(-40);
  });
  test('a persisted bank is IGNORED once a carve-out closes banking', () => {
    // e.g. an ED-pattern flag opened, or the target became floored, or a cycle started.
    expect(displayBankedDelta({ bankingAvailable: false, calorieBank: bank, dayKey: '2026-06-20' })).toBe(0);
    expect(displayBankedDelta({ bankingAvailable: false, calorieBank: bank, dayKey: '2026-06-19' })).toBe(0);
  });
});

describe('planCalorieBank — deterministic', () => {
  test('same inputs produce the same plan', () => {
    const args = { perDayBaseKcal: week(2600), bigDayKey: 'sat', requestedBumpKcal: 233, floorKcal: 1500, bandMaxKcal: 2860 };
    expect(planCalorieBank(args)).toEqual(planCalorieBank(args));
  });
});
