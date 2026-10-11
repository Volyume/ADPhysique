/**
 * Audit S15#7: behavioural tests for buildReadinessSummary, the pure line
 * behind Today's block chip.
 *
 * RE-ANCHORED D224 (founder order 2026-10-11, on Today: "Remove the recovery
 * data from today. I don't want it there full stop."). Pins what the chip
 * must do now:
 *  - say nothing without an active training block;
 *  - a planned recovery week (the plan's own calendar, read from the resolved
 *    state, never the raw isDeload flag) states the calendar fact;
 *  - NO recovery reading ever reaches the chip: not the shouldDeload training
 *    signal, not the last session's soreness, sleep or energy, not the
 *    fatigue trend, not the "recovering more slowly" adjustment. Each of
 *    those, alone or together, leaves the plain block line;
 *  - no session logged yet reads the zero-history line;
 *  - deterministic for identical inputs; no score, no traffic-light words,
 *    no em dash.
 */
import { buildReadinessSummary } from '../readinessSummary';
import { RECOVERY_STATE } from '../recoveryState';

const BASE_MESO = { isDeload: false, weekIndex: 2, plannedWeeks: 4, rirTarget: 2 };
const PLANNED_RECOVERY = { state: RECOVERY_STATE.PLANNED_BLOCK_RECOVERY, weekIndex: 2, plannedWeeks: 4, recoveryWeek: 2, weeksToRecovery: 0 };
const ADAPTIVE = { state: RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT };
// A fixed clock (C6 RE6-5): hermetic, no live clock reads.
const NOW = 1770000000000;
const RECENT = { startedAt: NOW - 86400000 };

describe('buildReadinessSummary', () => {
  test('returns null with no active mesocycle week', () => {
    expect(buildReadinessSummary({ currentMesoWeek: null, lastSession: RECENT, nowMs: NOW })).toBeNull();
  });

  test('a planned recovery week states the calendar fact', () => {
    expect(buildReadinessSummary({
      currentMesoWeek: { ...BASE_MESO, isDeload: true }, gatedRecoveryState: PLANNED_RECOVERY, lastSession: RECENT, nowMs: NOW,
    })).toEqual({ tone: 'recover', line: 'Recovery week, lighter sessions.' });
    // C6 RB6-3: after a gap the week is only on the calendar.
    expect(buildReadinessSummary({
      currentMesoWeek: { ...BASE_MESO, isDeload: true }, gatedRecoveryState: PLANNED_RECOVERY, lastSession: { startedAt: NOW - 40 * 86400000 }, nowMs: NOW,
    })).toEqual({ tone: 'recover', line: 'Recovery week on the calendar. Pick up whenever suits you.' });
  });

  test('D224: no recovery reading reaches the chip, alone or together', () => {
    const readings = {
      deloadSuggestion: { deload: true },
      fatigueHistory: [{ fatigueLevel: 5, startedAt: NOW - 2 * 86400000 }, { fatigueLevel: 5, startedAt: NOW - 4 * 86400000 }],
    };
    const sore = { ...RECENT, soreness24hBefore: 3, sleepQuality: 2, energyScore: 2 };
    for (const input of [
      { currentMesoWeek: BASE_MESO, lastSession: sore, nowMs: NOW },
      { currentMesoWeek: BASE_MESO, lastSession: RECENT, nowMs: NOW, ...readings },
      { currentMesoWeek: BASE_MESO, gatedRecoveryState: ADAPTIVE, lastSession: sore, nowMs: NOW, ...readings },
    ]) {
      expect(buildReadinessSummary(input)).toEqual({ tone: 'go', line: 'On track for this block.' });
    }
  });

  test('no last session at all reads as the zero-history line, not the default', () => {
    expect(buildReadinessSummary({ currentMesoWeek: BASE_MESO, lastSession: null, nowMs: NOW }))
      .toEqual({ tone: 'go', line: 'See how this block works.' });
  });

  test('the default line tolerates a missing rir target', () => {
    expect(buildReadinessSummary({
      currentMesoWeek: { isDeload: false, weekIndex: 1, plannedWeeks: null, rirTarget: null }, lastSession: RECENT, nowMs: NOW,
    })).toEqual({ tone: 'go', line: 'On track for this block.' });
  });

  test('deterministic: identical inputs produce an identical result', () => {
    const input = { currentMesoWeek: BASE_MESO, lastSession: RECENT, nowMs: NOW };
    expect(buildReadinessSummary(input)).toEqual(buildReadinessSummary({ ...input }));
  });

  test('no reading words, no score-like or traffic-light wording, no em dash', () => {
    const scenarios = [
      { currentMesoWeek: { ...BASE_MESO, isDeload: true }, gatedRecoveryState: PLANNED_RECOVERY, lastSession: RECENT, nowMs: NOW },
      { currentMesoWeek: BASE_MESO, lastSession: null, nowMs: NOW },
      { currentMesoWeek: BASE_MESO, gatedRecoveryState: ADAPTIVE, lastSession: RECENT, nowMs: NOW },
    ];
    for (const scenario of scenarios) {
      const { line } = buildReadinessSummary(scenario);
      expect(line).not.toMatch(/\d+\s*\/\s*100/);
      expect(line).not.toMatch(/red|amber|green light/i);
      expect(line).not.toMatch(/sore|sleep|energy|fatigue|recovering/i);
      expect(line).not.toMatch(/—/);
    }
  });
});
