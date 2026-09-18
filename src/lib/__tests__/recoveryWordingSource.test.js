/**
 * Campaign 22 Phase 2 Stage 1 — the recovery-wording single-source guard
 * (HOME-TODAY-UX-SPEC.md §8, "the measured copy contradiction fix").
 *
 * THE DEFECT: during an adaptive recovery reduction, readinessSummary.js's
 * chip and recoveryState.js's card/hero-eyebrow could disagree in the same
 * render, because the chip derived its recovery-tone line from the raw
 * `currentMesoWeek.isDeload` flag while the card derived from the GATED,
 * position-aware resolved state (`resolveRecoveryState()`'s output). Those
 * two can differ (a block whose calendar has reached the deload row but
 * still owes an outstanding accumulation session gates back to
 * NORMAL_ACCUMULATION; the raw flag does not know that).
 *
 * THE FIX (smallest change, wording source only, no threshold/engine
 * changes): readinessSummary.js now takes the SAME resolved state as an
 * input (`gatedRecoveryState`) and never reads isDeload for the decision.
 * This file pins that at two levels: a source-level guard (the parallel
 * derivation cannot silently return), and behavioural cases proving the chip
 * and the card agree at every recovery state, including the exact
 * historical disagreement scenario.
 */
import fs from 'fs';
import path from 'path';
import { buildReadinessSummary } from '../readinessSummary';
import { recoveryStateCard, RECOVERY_STATE } from '../recoveryState';

describe('recovery wording — single source of truth (spec §8)', () => {
  it('source-level: readinessSummary.js never reads currentMesoWeek.isDeload for its recovery-tone decision', () => {
    const src = fs.readFileSync(path.join(__dirname, '../readinessSummary.js'), 'utf8');
    // The old parallel derivation (the actual branch condition, not just any
    // mention of the flag in a comment explaining why it was removed).
    expect(src).not.toMatch(/if\s*\(\s*currentMesoWeek\.isDeload\s*\)/);
    // The resolved-state gate this fix replaced it with must still be there.
    expect(src).toMatch(/isLighterTrainingState\(gatedRecoveryState\)/);
  });

  it('behavioural: at the adaptive-recovery state, the chip never claims "Recovery week" and the card agrees training is only "lighter for now"', () => {
    const gatedRecoveryState = {
      state: RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT,
      weekIndex: 2, plannedWeeks: 6, recoveryWeek: 6, weeksToRecovery: 4,
    };
    const chip = buildReadinessSummary({
      // The raw DB flag can be true here (set by the adaptive apply path),
      // and used to be what Priority 1 read directly. It is now inert to
      // this decision -- the resolved state is the only input that matters.
      currentMesoWeek: { isDeload: true, weekIndex: 2, plannedWeeks: 6, rirTarget: 2 },
      gatedRecoveryState,
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: null,
    });
    const card = recoveryStateCard(gatedRecoveryState);
    expect(chip.tone).toBe('recover');
    expect(chip.line).not.toMatch(/^Recovery week/);
    expect(card).not.toBeNull();
    expect(card.title).not.toBe('Recovery week');
  });

  it('behavioural: at the planned block recovery state, both surfaces call it "Recovery week"', () => {
    const gatedRecoveryState = {
      state: RECOVERY_STATE.PLANNED_BLOCK_RECOVERY,
      weekIndex: 6, plannedWeeks: 6, recoveryWeek: 6, weeksToRecovery: 0,
    };
    const chip = buildReadinessSummary({
      currentMesoWeek: { isDeload: true, weekIndex: 6, plannedWeeks: 6, rirTarget: 2 },
      gatedRecoveryState,
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: { startedAt: Date.now(), soreness24hBefore: null, sleepQuality: null, energyScore: null },
    });
    const card = recoveryStateCard(gatedRecoveryState);
    expect(chip.line).toMatch(/^Recovery week/);
    expect(card.title).toBe('Recovery week');
  });

  it('behavioural: the historical contradiction cannot recur — a gated-back state (accumulation work outstanding) never lets the chip claim recovery while the card correctly renders nothing', () => {
    const gatedRecoveryState = {
      state: RECOVERY_STATE.NORMAL_ACCUMULATION,
      because: 'accumulation_work_outstanding',
      weekIndex: 6, plannedWeeks: 6, recoveryWeek: 6, weeksToRecovery: 0,
    };
    const chip = buildReadinessSummary({
      // Exactly the disagreement class §8 names: the raw flag says the
      // calendar reached the deload row, the gated state says the athlete
      // still owes accumulation work.
      currentMesoWeek: { isDeload: true, weekIndex: 6, plannedWeeks: 6, rirTarget: 2 },
      gatedRecoveryState,
      deloadSuggestion: null,
      fatigueHistory: [],
      lastSession: null,
    });
    const card = recoveryStateCard(gatedRecoveryState);
    expect(chip.line).not.toMatch(/^Recovery week/);
    expect(card).toBeNull();
  });
});
