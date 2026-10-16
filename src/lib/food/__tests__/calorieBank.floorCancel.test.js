/**
 * calorieBank.floorCancel.test.js (food audit 2026-10-16, founder rulings).
 *
 * What this suite pins, and why:
 *  - "Cancel the bank": planCalorieBank checks the safe floor only when a bank
 *    is planned. When the daily target later drops (a coach adjustment or a
 *    manual change), a stored bank could SHOW a day below the floor. Now
 *    bankBreachesFloor detects it, displayBankedDelta refuses to show any of
 *    the bank while it breaches, and the Diary cancels it with a calm line.
 *  - "Today onwards only": bankableDays keeps today and the days after it, so
 *    a new bank never moves a day already gone.
 * Every case runs the REAL module. Written to fail on the pre-audit code
 * (displayBankedDelta ignored the current target; neither helper existed).
 */
const fs = require('fs');
const path = require('path');
const {
  bankBreachesFloor, displayBankedDelta, bankableDays, planCalorieBank,
} = require('../calorieBank');

const WEEK = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'];

// A bank planned at 2,000 kcal against a 1,500 floor: Saturday +300, the
// other six days -50 each.
const plan = () => {
  const perDayBaseKcal = Object.fromEntries(WEEK.map((d) => [d, 2000]));
  const res = planCalorieBank({ perDayBaseKcal, bigDayKey: '2026-10-17', requestedBumpKcal: 300, floorKcal: 1500, bandMaxKcal: 2400 });
  expect(res.ok).toBe(true);
  return { weekStartKey: WEEK[0], bigDayKey: '2026-10-17', perDayDeltaKcal: res.perDayDeltaKcal, appliedAt: 1 };
};

describe('bankBreachesFloor', () => {
  test('no breach at the target the bank was planned against', () => {
    expect(bankBreachesFloor({ calorieBank: plan(), baseTargetKcal: 2000, floorKcal: 1500 })).toBe(false);
  });

  test('a lower target that puts a cut day under the floor is a breach', () => {
    // 1,540 - 50 = 1,490, under 1,500.
    expect(bankBreachesFloor({ calorieBank: plan(), baseTargetKcal: 1540, floorKcal: 1500 })).toBe(true);
  });

  test('exactly at the floor is not a breach', () => {
    expect(bankBreachesFloor({ calorieBank: plan(), baseTargetKcal: 1550, floorKcal: 1500 })).toBe(false);
  });

  test('a raised floor (an FFM floor read later) is a breach too', () => {
    expect(bankBreachesFloor({ calorieBank: plan(), baseTargetKcal: 2000, floorKcal: 1980 })).toBe(true);
  });

  test('no bank, or inputs that cannot be judged, read as no breach', () => {
    expect(bankBreachesFloor({ calorieBank: null, baseTargetKcal: 1000, floorKcal: 1500 })).toBe(false);
    expect(bankBreachesFloor({ calorieBank: plan(), baseTargetKcal: null, floorKcal: 1500 })).toBe(false);
    expect(bankBreachesFloor({ calorieBank: plan(), baseTargetKcal: 2000, floorKcal: undefined })).toBe(false);
    expect(bankBreachesFloor()).toBe(false);
  });
});

describe('displayBankedDelta never shows a day below the floor', () => {
  test('within the floor the bank shows as before', () => {
    const bank = plan();
    expect(displayBankedDelta({ bankingAvailable: true, calorieBank: bank, dayKey: '2026-10-17', baseTargetKcal: 2000, floorKcal: 1500 })).toBe(300);
    expect(displayBankedDelta({ bankingAvailable: true, calorieBank: bank, dayKey: '2026-10-13', baseTargetKcal: 2000, floorKcal: 1500 })).toBe(-50);
  });

  test('once the target drops so any day breaches, NO day shows the bank (not even the bigger day)', () => {
    const bank = plan();
    for (const d of WEEK) {
      expect(displayBankedDelta({ bankingAvailable: true, calorieBank: bank, dayKey: d, baseTargetKcal: 1540, floorKcal: 1500 })).toBe(0);
    }
  });

  test('banking closed still shows nothing, whatever the target', () => {
    expect(displayBankedDelta({ bankingAvailable: false, calorieBank: plan(), dayKey: '2026-10-17', baseTargetKcal: 2000, floorKcal: 1500 })).toBe(0);
  });
});

describe('bankableDays: today onwards only', () => {
  test('mid-week keeps today and the days after it', () => {
    expect(bankableDays(WEEK, '2026-10-16')).toEqual(['2026-10-16', '2026-10-17', '2026-10-18']);
  });
  test('Monday keeps the whole week; Sunday keeps one day; a past week keeps none; a future week keeps all', () => {
    expect(bankableDays(WEEK, '2026-10-12')).toEqual(WEEK);
    expect(bankableDays(WEEK, '2026-10-18')).toEqual(['2026-10-18']);
    expect(bankableDays(WEEK, '2026-10-19')).toEqual([]);
    expect(bankableDays(WEEK, '2026-10-01')).toEqual(WEEK);
  });
  test('bad input gives no days, never a throw', () => {
    expect(bankableDays(null, '2026-10-16')).toEqual([]);
    expect(bankableDays(WEEK, null)).toEqual([]);
  });
});

describe('the Diary wiring (source guard)', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'screens', 'DiaryScreen.js'), 'utf8');

  test('the displayed delta is checked against the CURRENT target and floor', () => {
    expect(SRC).toMatch(/displayBankedDelta\(\{\s*bankingAvailable, calorieBank, dayKey: selectedDate,\s*baseTargetKcal: targets\?\.targetKcal \?\? null, floorKcal,\s*\}\)/);
  });

  test('a breaching bank is cancelled: the planned food is restored, the bank cleared, a calm line shown, once per bank', () => {
    const effect = SRC.slice(SRC.indexOf('const bankCancelRef = useRef(null);'));
    const body = effect.slice(0, effect.indexOf('}, [calorieBank, userId'));
    expect(body).toMatch(/bankBreachesFloor\(\{ calorieBank, baseTargetKcal: targets\?\.targetKcal, floorKcal \}\)/);
    expect(body).toMatch(/bankCancelRef\.current === key\) return;/);
    expect(body.indexOf('restoreUnbankedPlannedFood')).toBeLessThan(body.indexOf('setCalorieBank(null)'));
    expect(body).toMatch(/Your higher-calorie day has been cancelled because your daily target changed\. Every day is back to the same target\./);
    expect(body).toMatch(/logError\('DiaryScreen\.cancelBankBelowFloor'/);
  });

  test('the sheet is given today onwards only, with the bigger day defaulting into that set', () => {
    expect(SRC).toMatch(/bankableDays\(weekDates, todayKey\)/);
    expect(SRC).toMatch(/weekDates=\{bankDays\}/);
    expect(SRC).toMatch(/weekStartKey=\{weekDates\[0\]\}/);
    expect(SRC).toMatch(/defaultBigDay=\{bankDefaultDay\}/);
    expect(SRC).toMatch(/bankDays\.includes\(selectedDate\) \? selectedDate : \(bankDays\[0\] \?\? selectedDate\)/);
  });
});
