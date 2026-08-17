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
import { RECOVERY_STATE } from '../recoveryState';

const BASE_MESO = { isDeload: false, weekIndex: 2, plannedWeeks: 4, rirTarget: 2 };
// Campaign 22 Phase 2 Stage 1 (HOME-TODAY-UX-SPEC.md §8): Priority 1 now
// reads the resolved `gatedRecoveryState`, not the raw `currentMesoWeek.
// isDeload` flag (that parallel derivation is exactly the historical
// contradiction the stage closes -- see readinessSummary.js's Stage 1 note
// and src/lib/__tests__/recoveryWordingSource.test.js for the dedicated
// single-source guard). Fixtures below that need Priority 1 to fire now
// carry PLANNED_RECOVERY as an explicit gatedRecoveryState alongside the
// legacy isDeload:true field (still realistic DB shape, just no longer the
// thing this function reads for the decision).
const PLANNED_RECOVERY = { state: RECOVERY_STATE.PLANNED_BLOCK_RECOVERY, weekIndex: 2, plannedWeeks: 4, recoveryWeek: 2, weeksToRecovery: 0 };
// C6 RE6-5 (D97-25): a fixed clock, threaded as nowMs into every test
// whose fixture carries timestamps. The suite previously read
// Date.now() at fixture build AND let buildReadinessSummary default
// nowMs to a second Date.now() read; Review E observed one full-bar
// failure in four runs with an isolated pass, and a non-deterministic
// test makes "full bar green" an unreliable landing gate. Hermetic
// now, no live clock reads.
const NOW = 1770000000000;

describe('buildReadinessSummary', () => {
  test('returns null with no active mesocycle week, regardless of other signals', () => {
    expect(buildReadinessSummary({
      currentMesoWeek: null,
      deloadSuggestion: { deload: true },
      fatigueHistory: [{ fatigueLevel: 5, startedAt: NOW - 2 * 86400000 }, { fatigueLevel: 5, startedAt: NOW - 4 * 86400000 }], nowMs: NOW, // D97-25 RB6-4 re-anchor + RE6-5 hermetic clock
      lastSession: { soreness24hBefore: 3 },
    })).toBeNull();
  });

  // RE-PINNED (Campaign 22 Phase 2 Stage 1): was `currentMesoWeek: {
  // ...BASE_MESO, isDeload: true }` alone. Priority 1 now decides off
  // gatedRecoveryState, so the fixture must carry it for this scenario to
  // still exercise the branch under test; the assertion and its meaning are
  // unchanged (a scheduled deload week still outranks every other signal).
  test('a scheduled deload week outranks every other signal', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: { ...BASE_MESO, isDeload: true },
      gatedRecoveryState: PLANNED_RECOVERY,
      deloadSuggestion: { deload: true },
      fatigueHistory: [{ fatigueLevel: 5, startedAt: NOW - 2 * 86400000 }, { fatigueLevel: 5, startedAt: NOW - 4 * 86400000 }], nowMs: NOW, // D97-25 RB6-4 re-anchor + RE6-5 hermetic clock
      lastSession: { startedAt: NOW, soreness24hBefore: 3, sleepQuality: 2, energyScore: 2 },
    });
    expect(result).toEqual({ tone: 'recover', line: 'Recovery week, pull effort back.' });
  });

  test('the shouldDeload training signal wins over readiness facts and fatigue', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: BASE_MESO,
      deloadSuggestion: { deload: true, reasons: ['Reps trending down'] },
      fatigueHistory: [{ fatigueLevel: 5, startedAt: NOW - 2 * 86400000 }, { fatigueLevel: 5, startedAt: NOW - 4 * 86400000 }], nowMs: NOW, // D97-25 RB6-4 re-anchor + RE6-5 hermetic clock
      lastSession: { startedAt: NOW, soreness24hBefore: 3, sleepQuality: 2, energyScore: 2 },
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
      lastSession: { startedAt: NOW, soreness24hBefore: 3, sleepQuality: null, energyScore: null },
      nowMs: NOW,
    });
    expect(result).toEqual({ tone: 'caution', line: 'Last time out you were sore. Worth listening to that today.' });
  });

  test('low sleep and low energy combine with natural joining', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: BASE_MESO,
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: { startedAt: NOW, soreness24hBefore: null, sleepQuality: 2, energyScore: 2 },
      nowMs: NOW,
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
      lastSession: { startedAt: NOW, soreness24hBefore: 3, sleepQuality: 2, energyScore: 2 },
      nowMs: NOW,
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
      fatigueHistory: [{ fatigueLevel: 4, startedAt: NOW - 1 * 86400000 }, { fatigueLevel: 3.5, startedAt: NOW - 3 * 86400000 }, { fatigueLevel: 1, startedAt: NOW - 5 * 86400000 }], // D97-25 RB6-4 re-anchor + RE6-5 hermetic clock
      lastSession: { soreness24hBefore: null, sleepQuality: null, energyScore: null },
      nowMs: NOW,
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
      fatigueHistory: [{ fatigue_level: 4, started_at: NOW - 2 * 86400000 }, { fatigue_level: 4, started_at: NOW - 4 * 86400000 }], nowMs: NOW, // D97-25 RB6-4 re-anchor + RE6-5 hermetic clock
      lastSession: null,
    });
    expect(result.tone).toBe('caution');
  });

  // RE-PINNED (Campaign 22 Phase 2 Stage 2, HOME-TODAY-UX-SPEC.md §7/§15
  // item 4/§17 R3: "the hero shows a SINGLE counter"). C5-P12-02's own fix
  // (quoted below, superseded) added the "Block week 2 of 4" noun here to
  // disambiguate it from the eyebrow's "Day 1 of 2" -- which fixed that
  // confusion but left two "N of M" counters on the hero, the exact
  // hero-eyebrow-pair §7 later classifies as NOISE. The block-week figure
  // moves to the block-shape sheet this same chip opens on tap; the eyebrow
  // keeps the surviving position counter. Original C5-P12-02 rationale: "the
  // hero renders this chip two lines below the plan eyebrow's 'Day 1 of 2',
  // and neither counter carried a noun, so the two positions read as two
  // different mental models of the same plan." Tone and priority order are
  // unchanged; only Priority 5's line lost its counter.
  test('default block-phase read carries no counter of its own', () => {
    // RE-PINNED AGAIN (founder device order 2026-08-17): "Stop N short of
    // failure" was an effort instruction with no function on Today and
    // nothing to do with the block details the chip opens. The default is
    // the block fact for every input now; the week's shape (including its
    // effort target) stays in the block-shape sheet.
    const result = buildReadinessSummary({
      currentMesoWeek: BASE_MESO,
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: null,
    });
    expect(result).toEqual({ tone: 'go', line: 'On track for this block.' });
  });

  test('default block-phase read tolerates a missing rir target', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: { isDeload: false, weekIndex: 1, plannedWeeks: null, rirTarget: null },
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: null,
    });
    expect(result).toEqual({ tone: 'go', line: 'On track for this block.' });
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

  // RE-PINNED (Campaign 22 Phase 2 Stage 1): the first scenario's isDeload
  // fixture needs gatedRecoveryState too, for the same reason as above, so
  // it still exercises the Priority 1 branch this check means to cover.
  test('no score-like or traffic-light wording in any produced line', () => {
    const scenarios = [
      { currentMesoWeek: { ...BASE_MESO, isDeload: true }, gatedRecoveryState: PLANNED_RECOVERY, deloadSuggestion: null, fatigueHistory: [], lastSession: null },
      { currentMesoWeek: BASE_MESO, deloadSuggestion: { deload: true }, fatigueHistory: [], lastSession: null },
      { currentMesoWeek: BASE_MESO, deloadSuggestion: null, fatigueHistory: [], lastSession: { startedAt: NOW, soreness24hBefore: 3 }, nowMs: NOW },
      { currentMesoWeek: BASE_MESO, deloadSuggestion: null, fatigueHistory: [{ fatigueLevel: 5, startedAt: NOW - 2 * 86400000 }, { fatigueLevel: 5, startedAt: NOW - 4 * 86400000 }], lastSession: null, nowMs: NOW },
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

describe('C6 R-6 (D97-22): the caution is bounded to a recent session', () => {
  const { buildReadinessSummary } = require('../readinessSummary');
  const BASE = { weekType: 'accumulation', weekIndex: 2, isDeload: false };

  test('a months-old sore session is not narrated as current state', () => {
    const nowMs = Date.now();
    const result = buildReadinessSummary({
      currentMesoWeek: BASE,
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: { startedAt: nowMs - 180 * 86400000, soreness24hBefore: 3, sleepQuality: 2, energyScore: 2 },
      nowMs,
    });
    expect(result?.line ?? '').not.toMatch(/Last time out/);
  });

  test('an undated session cannot prove recency and is treated as stale', () => {
    const result = buildReadinessSummary({
      currentMesoWeek: BASE,
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: { soreness24hBefore: 3, sleepQuality: null, energyScore: null },
    });
    expect(result?.line ?? '').not.toMatch(/Last time out/);
  });

  test('a session inside 14 days still cautions exactly as before', () => {
    const nowMs = Date.now();
    const result = buildReadinessSummary({
      currentMesoWeek: BASE,
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: { startedAt: nowMs - 3 * 86400000, soreness24hBefore: 3, sleepQuality: null, energyScore: null },
      nowMs,
    });
    expect(result).toEqual({ tone: 'caution', line: 'Last time out you were sore. Worth listening to that today.' });
  });
});

describe('C6 RB6-4 (D97-25): the fatigue trend is bounded to recent sessions', () => {
  const { buildReadinessSummary } = require('../readinessSummary');
  const BASE = { weekType: 'accumulation', weekIndex: 2, isDeload: false };

  test('months-old rated sessions never claim fatigue is building', () => {
    const nowMs = Date.now();
    const r = buildReadinessSummary({
      currentMesoWeek: BASE, deloadSuggestion: null, lastSession: null,
      fatigueHistory: [
        { fatigueLevel: 5, startedAt: nowMs - 180 * 86400000 },
        { fatigueLevel: 5, startedAt: nowMs - 181 * 86400000 },
      ],
      nowMs,
    });
    expect(r?.line ?? '').not.toMatch(/Fatigue has been building/);
  });
});
