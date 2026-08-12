/**
 * nextBlockPreview.js — Campaign 8, Work 1 (RA6-8 / RA6-9).
 *
 * The decision surface used to describe Repeat and "Continue with
 * adjustments" as two meaningfully different paths while the
 * RECOMMENDATION between them was chosen from check-in readiness alone
 * — evidence that has nothing to do with what the adjusted block would
 * actually prescribe. Review A proved both halves of the problem:
 * a user who earned a climb in every muscle could be recommended
 * Repeat (RA6-8), and on the founder's stated normal case (retention)
 * the two options produce IDENTICAL numbers while the card still
 * implies adaptation (RA6-9).
 *
 * This module is the fix's evidence half. It is PURE: given the seed
 * ranges the adjust intent would actually use and the finished block's
 * ledger, it answers one question —
 *
 *   does choosing Adjust change anything meaningful, and what?
 *
 * The comparison is exact by construction: Repeat seeds each muscle's
 * OBSERVED start and planned peak (blockSeed.js, intent 'repeat'), and
 * those observed numbers are what buildSeedReceipt already compares the
 * resolved ranges against. So the receipt's "changed" set IS the
 * Repeat-vs-Adjust difference for ledger-sourced muscles, and this
 * module reuses its wording rather than re-deriving a second, divergent
 * notion of "different".
 *
 * Two places where the receipt alone is NOT the answer, both found by
 * the Campaign 8 review:
 *
 *  - MANUAL muscles (D2). resolveSeedRange step 1 is intent-blind, so
 *    Repeat returns the user's manual numbers too. A manual value that
 *    differs from the block's observed start is a difference between
 *    the block and the setting, never between the two buttons. Counting
 *    it as an Adjust change manufactured a difference AND credited the
 *    user's own setting to "how this block went" (the M-7 inversion).
 *
 *  - The RECOVERY week (D3). Only the adjust intent sizes `deloadSets`;
 *    a repeat leaves the writer on research MEV. Two options with the
 *    same training weeks can still differ in the recovery week, so
 *    "the same training week" cannot be claimed on start/peak alone.
 *
 * Voice rules: consequences, never internals. No MEV/MRV, no
 * classification names, no percentages (COACHING_VOICE_SYNTHESIS_LOCKED).
 */
import { buildSeedReceipt } from './blockExplain';
import { VOLUME_LANDMARKS } from './algorithms';

const num = (v) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
};

/**
 * @param {object} args
 * @param {object|null} args.ranges  resolveSeedRange output per muscle, built
 *   with intent 'adjust' (blockLedgerRunner.buildSeedRangesForNextBlock)
 * @param {object|null} args.ledger  the finished block's stored ledger
 * @param {number} [args.limit]      how many changed muscles to name
 * @returns {{
 *   meaningful: boolean,
 *   changes: Array<{label: string, direction: 'up'|'down'|'peak', detail: string}>,
 *   moreChanged: number,
 *   held: number, heldUnjudged: number, heldManual: number,
 *   climbs: number, reductions: number, peakOnly: number,
 *   recoveryWeekDiffers: boolean,
 * }|null} null when there is nothing to compare (no ledger/ranges yet).
 */
export function buildAdjustPreview({ ranges = null, ledger = null, limit = 3 } = {}) {
  if (!ranges || typeof ranges !== 'object') return null;
  const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
  if (entries.length === 0) return null;

  // The receipt compares the adjust-intent ranges against the block's
  // OBSERVED numbers, which are exactly what Repeat would seed.
  const receipt = buildSeedReceipt({ ranges, ledger, limit: Number.MAX_SAFE_INTEGER });

  const byMuscle = new Map(entries.filter((e) => e?.muscle).map((e) => [e.muscle, e]));

  // D2: a manual muscle is identical under BOTH intents, whatever the
  // block observed. Count it as the user's own setting, never as an
  // adjustment, and never let it reach the changed list.
  let heldManual = 0;
  // The receipt's own `held` only counts muscles whose numbers matched,
  // so only THOSE manual muscles may be subtracted from it below.
  let heldManualUnchanged = 0;
  // D3: only the adjust intent sizes the recovery week. The writer uses
  // research MEV when no deload is seeded (database.generateInitialPlannedVolume),
  // so that is precisely what a repeat delivers.
  let recoveryWeekDiffers = false;
  for (const [muscle, r] of Object.entries(ranges)) {
    const observed = byMuscle.get(muscle)?.observed;
    const prevStart = num(observed?.startSets);
    if (prevStart == null || num(r?.startSets) == null) continue;
    if (r?.source === 'manual') {
      heldManual += 1;
      const samePeak = num(observed?.plannedPeak) == null || num(r?.peakSets) == null
        || num(r.peakSets) === num(observed.plannedPeak);
      if (num(r.startSets) === prevStart && samePeak) heldManualUnchanged += 1;
      continue;
    }
    const deload = num(r?.deloadSets);
    const repeatDeload = num(VOLUME_LANDMARKS[muscle]?.mev);
    if (deload != null && repeatDeload != null && deload !== repeatDeload) recoveryWeekDiffers = true;
  }

  // The receipt was asked for its FULL changed list (it sorts by
  // magnitude); manual rows are filtered out here and the cap applied
  // afterwards, so a dropped manual row can never be double-counted in
  // the overflow.
  const changes = [];
  for (const c of receipt.changed ?? []) {
    const r = ranges[c.muscle];
    if (r?.source === 'manual') continue;
    // D7: the headline speaks about where the block STARTS, so the
    // direction is the week-1 delta. "peak" is a ceiling-only move, which
    // is neither a higher nor a lower start.
    const prevStart = num(byMuscle.get(c.muscle)?.observed?.startSets);
    const start = num(r?.startSets);
    const ds = prevStart != null && start != null ? start - prevStart : 0;
    changes.push({
      label: c.label,
      direction: ds > 0 ? 'up' : ds < 0 ? 'down' : 'peak',
      detail: c.change,
    });
  }
  const visible = changes.slice(0, Math.max(0, limit));
  const moreChanged = changes.length - visible.length;

  // Counted over EVERY change, not the visible slice: the headline
  // describes the whole block, not the three muscles that fit on screen.
  const climbs = changes.filter((c) => c.direction === 'up').length;
  const reductions = changes.filter((c) => c.direction === 'down').length;
  const peakOnly = changes.filter((c) => c.direction === 'peak').length;

  return {
    meaningful: changes.length > 0,
    changes: visible,
    moreChanged,
    held: receipt.held ?? 0,
    heldUnjudged: receipt.heldUnjudged ?? 0,
    heldManual,
    heldManualUnchanged,
    climbs,
    reductions,
    peakOnly,
    recoveryWeekDiffers,
  };
}

/**
 * The user-facing lines for the decision card. Short, concrete, one per
 * changed muscle group, in the app's existing vocabulary.
 *
 * When nothing meaningful changes this returns the HONEST equivalence
 * line rather than an invented difference (requirement C): the coach
 * says the current setup still holds up, and never implies adaptation
 * merely because the user tapped Adjust. D3: a recovery week that IS
 * sized differently gets its own plain line, so the equivalence is
 * never overstated either.
 */
export function adjustPreviewLines(preview) {
  if (!preview) return [];
  if (!preview.meaningful) {
    const lines = ['Your current set targets are still supported by the evidence, so there are no meaningful training changes to apply.'];
    if (preview.recoveryWeekDiffers) {
      lines.push('Your recovery week would be sized to the work you actually did, rather than a flat default.');
    }
    if (preview.heldUnjudged > 0) {
      lines.push(`${preview.heldUnjudged} muscle group${preview.heldUnjudged === 1 ? '' : 's'} could not be judged clearly this block, so nothing was moved on a guess.`);
    }
    if (preview.heldManual > 0) {
      lines.push(`${preview.heldManual} ${preview.heldManual === 1 ? 'is' : 'are'} on your own settings and stay${preview.heldManual === 1 ? 's' : ''} exactly there.`);
    }
    return lines;
  }

  const lines = preview.changes.map((c) => `${c.label}: ${c.detail}.`);
  if (preview.moreChanged > 0) {
    lines.push(`Plus ${preview.moreChanged} more muscle group${preview.moreChanged === 1 ? '' : 's'} adjusted the same way.`);
  }
  // Only the manual muscles the receipt itself counted as held may be
  // subtracted from its `held` total.
  const heldJudged = Math.max(0, preview.held - preview.heldUnjudged - (preview.heldManualUnchanged ?? 0));
  if (heldJudged > 0) {
    lines.push(`${heldJudged} other muscle group${heldJudged === 1 ? '' : 's'} stay${heldJudged === 1 ? 's' : ''} where ${heldJudged === 1 ? 'it is' : 'they are'}, because that workload keeps working.`);
  }
  if (preview.heldUnjudged > 0) {
    lines.push(`${preview.heldUnjudged} stay${preview.heldUnjudged === 1 ? 's' : ''} conservative: there wasn't enough clear evidence this block.`);
  }
  if (preview.heldManual > 0) {
    lines.push(`${preview.heldManual} ${preview.heldManual === 1 ? 'is' : 'are'} on your own settings and stay${preview.heldManual === 1 ? 's' : ''} exactly there.`);
  }
  if (preview.recoveryWeekDiffers) {
    lines.push('Your recovery week is sized to the work you actually did, rather than a flat default.');
  }
  return lines;
}
