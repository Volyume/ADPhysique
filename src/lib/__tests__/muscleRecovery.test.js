import {
  freshnessBand,
  recoveryWindowDays,
  RECOVERY_WINDOW_DAYS,
  DEFAULT_RECOVERY_WINDOW_DAYS,
  FRESHNESS_BANDS,
} from '../muscleRecovery';

describe('muscleRecovery — recoveryWindowDays', () => {
  it('returns the per-muscle window for known muscles', () => {
    expect(recoveryWindowDays('back')).toBe(RECOVERY_WINDOW_DAYS.back);
    expect(recoveryWindowDays('calves')).toBe(RECOVERY_WINDOW_DAYS.calves);
  });

  it('falls back to the default window for unknown / non-string keys', () => {
    expect(recoveryWindowDays('not_a_muscle')).toBe(DEFAULT_RECOVERY_WINDOW_DAYS);
    expect(recoveryWindowDays(undefined)).toBe(DEFAULT_RECOVERY_WINDOW_DAYS);
    expect(recoveryWindowDays(null)).toBe(DEFAULT_RECOVERY_WINDOW_DAYS);
  });

  it('every window is a finite positive number of days', () => {
    for (const [muscle, days] of Object.entries(RECOVERY_WINDOW_DAYS)) {
      expect(Number.isFinite(days)).toBe(true);
      expect(days).toBeGreaterThan(0);
      expect(typeof muscle).toBe('string');
    }
  });
});

describe('muscleRecovery — freshnessBand boundaries', () => {
  // back has a 3-day window: use it to pin the band boundaries exactly.
  const M = 'back';
  const W = RECOVERY_WINDOW_DAYS[M]; // 3

  it('trained today (0 days) is fatigued', () => {
    expect(freshnessBand(0, M)).toBe('fatigued');
  });

  it('negative days (clock skew) clamps to fatigued', () => {
    expect(freshnessBand(-1, M)).toBe('fatigued');
  });

  it('part-way through the window is recovering', () => {
    expect(freshnessBand(1, M)).toBe('recovering');
    expect(freshnessBand(W - 1, M)).toBe('recovering');
  });

  it('exactly at the window boundary is fresh (boundary-inclusive)', () => {
    expect(freshnessBand(W, M)).toBe('fresh');
  });

  it('beyond the window is fresh', () => {
    expect(freshnessBand(W + 5, M)).toBe('fresh');
    expect(freshnessBand(999, M)).toBe('fresh');
  });

  it('a 1-day-window muscle skips straight from fatigued to fresh', () => {
    expect(freshnessBand(0, 'calves')).toBe('fatigued');
    expect(freshnessBand(1, 'calves')).toBe('fresh');
  });

  it('only ever returns a known band or null', () => {
    for (let d = -2; d <= 10; d += 1) {
      const band = freshnessBand(d, M);
      expect(FRESHNESS_BANDS).toContain(band);
    }
  });
});

describe('muscleRecovery — null / sparse safety', () => {
  it('returns null for missing days-since (never trained)', () => {
    expect(freshnessBand(null, 'back')).toBeNull();
    expect(freshnessBand(undefined, 'back')).toBeNull();
  });

  it('returns null for non-finite days-since', () => {
    expect(freshnessBand(NaN, 'back')).toBeNull();
    expect(freshnessBand(Infinity, 'back')).toBeNull();
    expect(freshnessBand(-Infinity, 'back')).toBeNull();
  });

  it('still bands a known days-value for an unknown muscle (default window)', () => {
    // Unknown muscle must not throw; uses the default window.
    expect(freshnessBand(0, 'mystery')).toBe('fatigued');
    expect(freshnessBand(DEFAULT_RECOVERY_WINDOW_DAYS, 'mystery')).toBe('fresh');
  });

  it('is deterministic — same inputs give same output', () => {
    expect(freshnessBand(2, 'quads')).toBe(freshnessBand(2, 'quads'));
  });
});
