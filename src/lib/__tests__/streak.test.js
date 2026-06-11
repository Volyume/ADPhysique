/**
 * streak.test.js — the pure "weeks running" derivation (COMP-018).
 *
 * Locks the no-shame rules: deload weeks keep the run, a lone miss repairs,
 * a second miss in the window lapses quietly, the current week is never
 * judged, an open ED flag freezes the run and suppresses the number, and a
 * missing target drops to session-count mode.
 */
import { computeStreak } from '../streak';

// Convenience week builders (oldest-first).
const kept = (k, target = 4) => ({ weekKey: k, completed: target, target, isDeload: false, paused: false });
const missed = (k, target = 4) => ({ weekKey: k, completed: 1, target, isDeload: false, paused: false });
const deload = (k, target = 4) => ({ weekKey: k, completed: 0, target, isDeload: true, paused: false });
const current = (k, completed, target = 4) => ({ weekKey: k, completed, target, isDeload: false, paused: false, isCurrent: true });

describe('computeStreak', () => {
  test('counts consecutive kept weeks, excluding the in-progress current week', () => {
    const r = computeStreak({ weeks: [kept('w1'), kept('w2'), kept('w3'), current('w4', 1)] });
    expect(r.runLength).toBe(3);
    expect(r.current.state).toBe('in-progress');
  });

  test('a deload week keeps the run even with zero sessions', () => {
    const r = computeStreak({ weeks: [kept('w1'), deload('w2'), kept('w3'), current('w4', 0)] });
    expect(r.weeks[1].state).toBe('resting');
    expect(r.runLength).toBe(3);
  });

  test('a lone missed week between keeping weeks is repaired when the next week is kept', () => {
    const r = computeStreak({ weeks: [kept('w1'), missed('w2'), kept('w3'), current('w4', 2)] });
    expect(r.weeks[1].state).toBe('repaired');
    expect(r.runLength).toBe(3);
  });

  test('a missed week NOT followed by a kept week is not repaired and breaks the run', () => {
    // newest finished week (w3) is missed -> run stops immediately
    const r = computeStreak({ weeks: [kept('w1'), kept('w2'), missed('w3'), current('w4', 2)] });
    expect(r.weeks[2].state).toBe('missed');
    expect(r.runLength).toBe(0);
  });

  test('a second miss inside the rolling-6 window lapses quietly (only one repair)', () => {
    // w2 missed (repairable), w4 missed within 6 weeks of w2 -> w4 stays missed
    const weeks = [
      kept('w1'), missed('w2'), kept('w3'), missed('w4'), kept('w5'), current('w6', 1),
    ];
    const r = computeStreak({ weeks });
    expect(r.weeks[1].state).toBe('repaired');
    expect(r.weeks[3].state).toBe('missed');
    // run newest-back over finished weeks: w5 kept (1), w4 missed -> stop
    expect(r.runLength).toBe(1);
  });

  test('two repairs are allowed when more than 6 weeks apart', () => {
    const weeks = [
      kept('w1'), missed('w2'), kept('w3'), kept('w4'), kept('w5'), kept('w6'), kept('w7'),
      missed('w8'), kept('w9'), current('w10', 1),
    ];
    const r = computeStreak({ weeks });
    expect(r.weeks[1].state).toBe('repaired'); // index 1
    expect(r.weeks[7].state).toBe('repaired'); // index 7, >=6 after index 1
    expect(r.runLength).toBe(9);
  });

  test('open ED flag freezes every week as resting and suppresses the number', () => {
    const r = computeStreak({
      weeks: [kept('w1'), missed('w2'), kept('w3'), current('w4', 0)],
      edSuppressed: true,
    });
    expect(r.suppressed).toBe(true);
    expect(r.weeks.filter((w) => !w.isCurrent).every((w) => w.state === 'resting')).toBe(true);
    expect(r.runLength).toBe(3); // run held, not lapsed
  });

  test('no target on the current week drops to session-count mode (no run number)', () => {
    const noGoalCurrent = { weekKey: 'w4', completed: 2, target: null, isDeload: false, paused: false, isCurrent: true };
    const r = computeStreak({ weeks: [kept('w1'), kept('w2'), kept('w3'), noGoalCurrent] });
    expect(r.runLength).toBeNull();
    expect(r.current.completed).toBe(2);
  });

  test('empty input is safe', () => {
    const r = computeStreak({ weeks: [] });
    expect(r.runLength).toBeNull();
    expect(r.current).toBeNull();
    expect(r.weeks).toEqual([]);
  });

  test('a paused week keeps the run', () => {
    const paused = { weekKey: 'w2', completed: 0, target: 4, isDeload: false, paused: true };
    const r = computeStreak({ weeks: [kept('w1'), paused, kept('w3'), current('w4', 1)] });
    expect(r.weeks[1].state).toBe('paused');
    expect(r.runLength).toBe(3);
  });
});
