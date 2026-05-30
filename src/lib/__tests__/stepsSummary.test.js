import { summariseWeekSteps, DEFAULT_MIN_DAYS } from '../stepsSummary';

describe('summariseWeekSteps', () => {
  test('empty or missing input', () => {
    expect(summariseWeekSteps([])).toEqual({ daysLogged: 0, avgSteps: null, registered: false });
    expect(summariseWeekSteps(null)).toEqual({ daysLogged: 0, avgSteps: null, registered: false });
    expect(summariseWeekSteps(undefined)).toEqual({ daysLogged: 0, avgSteps: null, registered: false });
  });

  test('default threshold is four days', () => {
    expect(DEFAULT_MIN_DAYS).toBe(4);
  });

  test('below the threshold: average computed but not registered', () => {
    const rows = [{ steps: 8000 }, { steps: 10000 }, { steps: 9000 }];
    const s = summariseWeekSteps(rows);
    expect(s.daysLogged).toBe(3);
    expect(s.avgSteps).toBe(9000);
    expect(s.registered).toBe(false);
  });

  test('at the threshold: registered', () => {
    const rows = [{ steps: 8000 }, { steps: 8000 }, { steps: 8000 }, { steps: 8000 }];
    const s = summariseWeekSteps(rows);
    expect(s.daysLogged).toBe(4);
    expect(s.avgSteps).toBe(8000);
    expect(s.registered).toBe(true);
  });

  test('a full week averages and rounds', () => {
    const rows = [
      { steps: 7000 }, { steps: 8000 }, { steps: 9000 }, { steps: 10000 },
      { steps: 11000 }, { steps: 6500 }, { steps: 8200 },
    ];
    const s = summariseWeekSteps(rows);
    expect(s.daysLogged).toBe(7);
    // (7000+8000+9000+10000+11000+6500+8200)/7 = 8528.57 -> 8529
    expect(s.avgSteps).toBe(8529);
    expect(s.registered).toBe(true);
  });

  test('zero and missing step rows do not count as logged days', () => {
    const rows = [
      { steps: 9000 }, { steps: 0 }, { steps: null }, { steps: 11000 },
      { source: 'manual' }, { steps: 10000 },
    ];
    const s = summariseWeekSteps(rows);
    // only 9000, 11000, 10000 count
    expect(s.daysLogged).toBe(3);
    expect(s.avgSteps).toBe(10000);
    expect(s.registered).toBe(false);
  });

  test('respects a custom minDays', () => {
    const rows = [{ steps: 8000 }, { steps: 8000 }];
    expect(summariseWeekSteps(rows, 2).registered).toBe(true);
    expect(summariseWeekSteps(rows, 3).registered).toBe(false);
  });

  test('coerces string step values', () => {
    const rows = [{ steps: '8000' }, { steps: '9000' }, { steps: '7000' }, { steps: '10000' }];
    const s = summariseWeekSteps(rows);
    expect(s.daysLogged).toBe(4);
    expect(s.avgSteps).toBe(8500);
    expect(s.registered).toBe(true);
  });
});
