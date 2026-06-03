/**
 * Cardio coach engine (audit Phases 4-6, Tiers C4/K1/K2/R2). Pure.
 */
import {
  cutCardioTarget, healthCardioTarget, pausedCardioTarget,
  cardioComplianceFromLog, summariseWeekCardio, nextCardioTarget,
  cardioRecoveryFlag, MAX_CARDIO_SESSIONS,
} from '../cardioEngine';

describe('structured targets', () => {
  test('cut target is the deficit lever, 3 easy sessions', () => {
    const t = cutCardioTarget(0, 'mod_cut');
    expect(t.mode).toBe('deficit');
    expect(t.sessionsPerWeek).toBe(3);
    expect(t.intensity).toBe('low');
    expect(t.includesInterval).toBe(false);
    expect(t.note).toMatch(/your choice of activity/i);
  });

  test('long aggressive-cut stall adds an interval session', () => {
    const t = cutCardioTarget(4, 'agg_cut');
    expect(t.includesInterval).toBe(true);
    expect(t.note).toMatch(/interval/i);
  });

  test('health target never escalates and is light', () => {
    const t = healthCardioTarget();
    expect(t.mode).toBe('health');
    expect(t.sessionsPerWeek).toBeLessThanOrEqual(2);
    expect(t.note).toMatch(/heart health/i);
  });

  test('paused target is zero sessions', () => {
    expect(pausedCardioTarget('deficit').paused).toBe(true);
    expect(pausedCardioTarget('deficit').sessionsPerWeek).toBe(0);
  });
});

describe('compliance from the log', () => {
  const target = { sessionsPerWeek: 3 };
  test('hit / mostly / missed bands', () => {
    expect(cardioComplianceFromLog(3, target)).toBe('hit');
    expect(cardioComplianceFromLog(4, target)).toBe('hit');
    expect(cardioComplianceFromLog(2, target)).toBe('mostly');
    expect(cardioComplianceFromLog(1, target)).toBe('missed');
    expect(cardioComplianceFromLog(0, target)).toBe('missed');
  });
  test('a zero target is always hit', () => {
    expect(cardioComplianceFromLog(0, { sessionsPerWeek: 0 })).toBe('hit');
  });
});

describe('week summary', () => {
  test('totals sessions, minutes, kcal, high-impact', () => {
    const rows = [
      { duration_min: 30, est_kcal: 300, recovery_impact: 'low' },
      { durationMin: 20, estKcal: 250, recoveryImpact: 'high' },
      { duration_min: 25, est_kcal: 280, recovery_impact: 'high' },
    ];
    const s = summariseWeekCardio(rows);
    expect(s.sessions).toBe(3);
    expect(s.totalMinutes).toBe(75);
    expect(s.totalKcal).toBe(830);
    expect(s.highImpactSessions).toBe(2);
  });
  test('empty / non-array is safe', () => {
    expect(summariseWeekCardio(null)).toEqual({ sessions: 0, totalMinutes: 0, totalKcal: 0, highImpactSessions: 0 });
  });
});

describe('next-week adjustment', () => {
  const cur = cutCardioTarget(0, 'mod_cut'); // 3 sessions deficit

  test('poor recovery pauses regardless', () => {
    const t = nextCardioTarget({ currentTarget: cur, sessionsLogged: 3, stillOffTrendInCut: true, poorRecovery: true });
    expect(t.paused).toBe(true);
  });

  test('hit + still off-trend adds a session up to the cap', () => {
    const t = nextCardioTarget({ currentTarget: cur, sessionsLogged: 3, stillOffTrendInCut: true, poorRecovery: false });
    expect(t.sessionsPerWeek).toBe(4);
    expect(t.note).toMatch(/add one more/i);
  });

  test('never exceeds the cap', () => {
    const maxed = { ...cur, sessionsPerWeek: MAX_CARDIO_SESSIONS };
    const t = nextCardioTarget({ currentTarget: maxed, sessionsLogged: MAX_CARDIO_SESSIONS, stillOffTrendInCut: true, poorRecovery: false });
    expect(t.sessionsPerWeek).toBe(MAX_CARDIO_SESSIONS);
  });

  test('missed holds and says so', () => {
    const t = nextCardioTarget({ currentTarget: cur, sessionsLogged: 1, stillOffTrendInCut: true, poorRecovery: false });
    expect(t.sessionsPerWeek).toBe(3);
    expect(t.note).toMatch(/before adding more/i);
  });

  test('health mode never escalates', () => {
    const health = healthCardioTarget();
    const t = nextCardioTarget({ currentTarget: health, sessionsLogged: 2, stillOffTrendInCut: false, poorRecovery: false });
    expect(t.mode).toBe('health');
    expect(t.sessionsPerWeek).toBe(health.sessionsPerWeek);
  });
});

describe('recovery flag', () => {
  test('leg-day collision flags first', () => {
    expect(cardioRecoveryFlag({ legDayCollision: true })).toMatch(/leg day/i);
  });
  test('high impact + recovery sliding flags', () => {
    expect(cardioRecoveryFlag({ weekSummary: { highImpactSessions: 3 }, recoveryTrendDown: true })).toMatch(/low-impact/i);
  });
  test('lots of hard cardio flags even without a recovery slide', () => {
    expect(cardioRecoveryFlag({ weekSummary: { highImpactSessions: 4 } })).toMatch(/hard cardio/i);
  });
  test('quiet otherwise', () => {
    expect(cardioRecoveryFlag({ weekSummary: { highImpactSessions: 1 }, recoveryTrendDown: true })).toBeNull();
  });
});
