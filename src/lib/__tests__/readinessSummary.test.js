/**
 * Audit S15#7 readiness aggregate: behavioural tests for buildReadinessSummary,
 * the pure composition behind Home's mesocycle chip.
 *
 * Pins what the chip must do:
 *  - say nothing without an active training block (matches the chip's
 *    existing visibility rule, unchanged by this composition);
 *  - a scheduled deload week always wins, it is the plan's own signal;
 *  - otherwise the shouldDeload training signal wins, worded distinctly
 *    from the dismissible "Recovery week suggested" banner so the two
 *    never read as the same sentence twice;
 *  - otherwise low sleep/energy or high soreness from the last session's
 *    walked-in-with facts surface (closing the loop on data that is
 *    captured but was never read back to the user anywhere);
 *  - otherwise a fatigue trend over the last two sessions (same >=3.5
 *    threshold as buildCoachBrief's own fatigue rule);
 *  - otherwise the plain block-phase read, unchanged copy from before;
 *  - deterministic for identical inputs; no score, no traffic-light words.
 */
import { buildReadinessSummary } from '../readinessSummary';

const BASE_MESO = { isDeload: false, weekIndex: 2, plannedWeeks: 4, rirTarget: 2 };

describe('buildReadinessSummary', () => {
  test('returns null with no active mesocycle week, regardless of other signals', () => {
    expect(buildReadinessSummary({
      currentMesoWeek: null,
      deloadSuggestion: { deload: true },
      fatigueHistory: [{ fatigueLevel: 5 }, { fatigueLevel: 5 }],
      lastSession: { soreness24hBefore: 3 },
    })).toBeNull();
  });

  test('a scheduled deload week outranks every other signal', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: { ...BASE_MESO, isDeload: true },
      deloadSuggestion: { deload: true },
      fatigueHistory: [{ fatigueLevel: 5 }, { fatigueLevel: 5 }],
      lastSession: { soreness24hBefore: 3, sleepQuality: 2, energyScore: 2 },
    });
    expect(result).toEqual({ tone: 'recover', line: 'Deload week, pull effort back.' });
  });

  test('the shouldDeload training signal wins over readiness facts and fatigue', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: BASE_MESO,
      deloadSuggestion: { deload: true, reasons: ['Reps trending down'] },
      fatigueHistory: [{ fatigueLevel: 5 }, { fatigueLevel: 5 }],
      lastSession: { soreness24hBefore: 3, sleepQuality: 2, energyScore: 2 },
    });
    expect(result).toEqual({ tone: 'recover', line: 'Recent training signals point towards easing off soon.' });
    // Worded distinctly from the top banner's own copy.
    expect(result.line).not.toMatch(/Recovery week suggested/i);
  });

  test('high soreness from the last session surfaces on its own', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: BASE_MESO,
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: { soreness24hBefore: 3, sleepQuality: null, energyScore: null },
    });
    expect(result).toEqual({ tone: 'caution', line: 'Last time out you were sore. Worth listening to that today.' });
  });

  test('low sleep and low energy combine with natural joining', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: BASE_MESO,
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: { soreness24hBefore: null, sleepQuality: 2, energyScore: 2 },
    });
    expect(result).toEqual({
      tone: 'caution',
      line: 'Last time out you were short on sleep and low on energy. Worth listening to that today.',
    });
  });

  test('all three readiness facts join with a comma and a final "and"', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: BASE_MESO,
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: { soreness24hBefore: 3, sleepQuality: 2, energyScore: 2 },
    });
    expect(result.line).toBe('Last time out you were sore, short on sleep and low on energy. Worth listening to that today.');
  });

  test('mid-scale readiness values (OK / Mild) do not trigger the caution read', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: BASE_MESO,
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: { soreness24hBefore: 2, sleepQuality: 3, energyScore: 3 },
    });
    expect(result.tone).toBe('go');
  });

  test('fatigue trending up over the last two sessions surfaces when readiness facts are clean', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: BASE_MESO,
      deloadSuggestion: null,
      fatigueHistory: [{ fatigueLevel: 4 }, { fatigueLevel: 3.5 }, { fatigueLevel: 1 }],
      lastSession: { soreness24hBefore: null, sleepQuality: null, energyScore: null },
    });
    expect(result).toEqual({ tone: 'caution', line: 'Fatigue has been building over your last couple of sessions.' });
  });

  test('fatigue below the 3.5 threshold falls through to the block-phase read', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: BASE_MESO,
      deloadSuggestion: null,
      fatigueHistory: [{ fatigueLevel: 3 }, { fatigueLevel: 3 }],
      lastSession: null,
    });
    expect(result.tone).toBe('go');
  });

  test('snake_case fatigue_level (raw DB shape) is tolerated like buildCoachBrief', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: BASE_MESO,
      deloadSuggestion: null,
      fatigueHistory: [{ fatigue_level: 4 }, { fatigue_level: 4 }],
      lastSession: null,
    });
    expect(result.tone).toBe('caution');
  });

  test('default block-phase read matches the chip copy shown before this change', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: BASE_MESO,
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: null,
    });
    expect(result).toEqual({ tone: 'go', line: 'Week 2 of 4 - stop 2 short of failure' });
  });

  test('default block-phase read tolerates a missing planned-weeks / rir target', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: { isDeload: false, weekIndex: 1, plannedWeeks: null, rirTarget: null },
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: null,
    });
    expect(result).toEqual({ tone: 'go', line: 'Week 1 of -' });
  });

  test('deterministic: identical inputs produce an identical result', () => {
    const input = {
      currentMesoWeek: BASE_MESO,
      deloadSuggestion: null,
      fatigueHistory: [{ fatigueLevel: 2 }],
      lastSession: { soreness24hBefore: 1, sleepQuality: 4, energyScore: 4 },
    };
    expect(buildReadinessSummary(input)).toEqual(buildReadinessSummary({ ...input }));
  });

  test('no score-like or traffic-light wording in any produced line', () => {
    const scenarios = [
      { currentMesoWeek: { ...BASE_MESO, isDeload: true }, deloadSuggestion: null, fatigueHistory: [], lastSession: null },
      { currentMesoWeek: BASE_MESO, deloadSuggestion: { deload: true }, fatigueHistory: [], lastSession: null },
      { currentMesoWeek: BASE_MESO, deloadSuggestion: null, fatigueHistory: [], lastSession: { soreness24hBefore: 3 } },
      { currentMesoWeek: BASE_MESO, deloadSuggestion: null, fatigueHistory: [{ fatigueLevel: 5 }, { fatigueLevel: 5 }], lastSession: null },
      { currentMesoWeek: BASE_MESO, deloadSuggestion: null, fatigueHistory: [], lastSession: null },
    ];
    for (const scenario of scenarios) {
      const result = buildReadinessSummary(scenario);
      expect(result.line).not.toMatch(/\d+\s*\/\s*100/);
      expect(result.line).not.toMatch(/red|amber|green light/i);
      expect(result.line).not.toMatch(/—/); // no em dash, British-English house style
    }
  });
});
