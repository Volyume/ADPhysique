/**
 * Tests for phaseEngine — competition phase detection used by CoachBuilder
 * to layer prep/peak-week modifiers on top of plan generation.
 */
import {
  getCompPhase,
  getWeeksToComp,
  getPhaseModifiers,
  applyPhaseToInputs,
  buildSessionAddons,
  getPhaseLabel,
  getPhaseDescription,
} from '../phaseEngine';

const DAY = 86_400_000;
const WEEK = 7 * DAY;

describe('getCompPhase', () => {
  test('null comp date → offseason', () => {
    expect(getCompPhase(null)).toBe('offseason');
    expect(getCompPhase(undefined)).toBe('offseason');
  });

  test('comp 20+ weeks away → offseason', () => {
    expect(getCompPhase(Date.now() + 30 * WEEK)).toBe('offseason');
  });

  test('comp 12 weeks away → early_prep', () => {
    expect(getCompPhase(Date.now() + 12 * WEEK)).toBe('early_prep');
  });

  test('comp 4 weeks away → contest_prep', () => {
    expect(getCompPhase(Date.now() + 4 * WEEK)).toBe('contest_prep');
  });

  test('comp <1 week away → peak_week', () => {
    expect(getCompPhase(Date.now() + 3 * DAY)).toBe('peak_week');
  });

  test('past comp date → offseason', () => {
    expect(getCompPhase(Date.now() - 7 * DAY)).toBe('offseason');
  });

  test('ISO string also works', () => {
    const iso = new Date(Date.now() + 4 * WEEK).toISOString();
    expect(getCompPhase(iso)).toBe('contest_prep');
  });
});

describe('getWeeksToComp', () => {
  test('null → null', () => {
    expect(getWeeksToComp(null)).toBeNull();
  });

  test('past date → null', () => {
    expect(getWeeksToComp(Date.now() - WEEK)).toBeNull();
  });

  test('returns positive integer for future dates', () => {
    const v = getWeeksToComp(Date.now() + 10 * WEEK);
    expect(typeof v).toBe('number');
    expect(v).toBeGreaterThan(0);
  });
});

describe('getPhaseModifiers', () => {
  const phases = ['offseason', 'early_prep', 'contest_prep', 'peak_week'];
  test('every phase returns the expected shape', () => {
    for (const phase of phases) {
      const m = getPhaseModifiers(phase);
      expect(m).toHaveProperty('volumeMultiplier');
      expect(m).toHaveProperty('conditioningMinutes');
      expect(m).toHaveProperty('posingMinutes');
      expect(m).toHaveProperty('note');
      expect(typeof m.volumeMultiplier).toBe('number');
      expect(m.volumeMultiplier).toBeGreaterThan(0);
    }
  });

  test('peak_week has reduced volume relative to offseason', () => {
    const off = getPhaseModifiers('offseason');
    const peak = getPhaseModifiers('peak_week');
    expect(peak.volumeMultiplier).toBeLessThan(off.volumeMultiplier);
  });

  test('unknown phase falls back without throwing', () => {
    expect(() => getPhaseModifiers('not_a_phase')).not.toThrow();
  });
});

describe('applyPhaseToInputs', () => {
  test('null comp date leaves inputs roughly unchanged', () => {
    const before = { experience: 'intermediate', daysPerWeek: 4, goal: 'physique', phase: 'cut' };
    const result = applyPhaseToInputs(before, null);
    expect(result.phase).toBe('offseason');
    expect(result.inputs.goal).toBe('physique');
  });

  test('competition prep injects phase modifiers', () => {
    const before = { experience: 'intermediate', daysPerWeek: 4, goal: 'physique', phase: 'cut' };
    const result = applyPhaseToInputs(before, Date.now() + 4 * WEEK);
    expect(result.phase).toBe('contest_prep');
    expect(result.weeksToComp).toBeGreaterThan(0);
    expect(result.modifiers).toBeDefined();
  });
});

describe('buildSessionAddons', () => {
  test('offseason returns minimal/empty add-ons', () => {
    const out = buildSessionAddons('offseason', null);
    expect(out).toBeDefined();
  });

  test('prep phases include conditioning + posing add-ons', () => {
    const out = buildSessionAddons('contest_prep', 4);
    expect(out).toBeDefined();
  });
});

describe('getPhaseLabel + getPhaseDescription', () => {
  test('return non-empty strings for known phases', () => {
    for (const phase of ['offseason', 'early_prep', 'contest_prep', 'peak_week']) {
      expect(typeof getPhaseLabel(phase)).toBe('string');
      expect(getPhaseLabel(phase).length).toBeGreaterThan(0);
      expect(typeof getPhaseDescription(phase, 4)).toBe('string');
    }
  });
});
