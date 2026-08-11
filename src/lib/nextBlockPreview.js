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
 * Repeat-vs-Adjust difference; this module reuses it rather than
 * re-deriving a second, divergent notion of "different".
 *
 * Voice rules: consequences, never internals. No MEV/MRV, no
 * classification names, no percentages (COACHING_VOICE_SYNTHESIS_LOCKED).
 */
import { buildSeedReceipt } from './blockExplain';

/**
 * @param {object} args
 * @param {object|null} args.ranges  resolveSeedRange output per muscle, built
 *   with intent 'adjust' (blockLedgerRunner.buildSeedRangesForNextBlock)
 * @param {object|null} args.ledger  the finished block's stored ledger
 * @param {number} [args.limit]      how many changed muscles to name
 * @returns {{
 *   meaningful: boolean,
 *   changes: Array<{label: string, direction: 'up'|'down', detail: string}>,
 *   moreChanged: number,
 *   held: number, heldUnjudged: number, heldManual: number,
 *   climbs: number, reductions: number,
 * }|null} null when there is nothing to compare (no ledger/ranges yet).
 */
export function buildAdjustPreview({ ranges = null, ledger = null, limit = 3 } = {}) {
  if (!ranges || typeof ranges !== 'object') return null;
  const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
  if (entries.length === 0) return null;

  // The receipt compares the adjust-intent ranges against the block's
  // OBSERVED numbers, which are exactly what Repeat would seed.
  const receipt = buildSeedReceipt({ ranges, ledger, limit });

  const byMuscle = new Map(entries.filter((e) => e?.muscle).map((e) => [e.muscle, e]));
  let heldManual = 0;
  for (const [muscle, r] of Object.entries(ranges)) {
    const observed = byMuscle.get(muscle)?.observed;
    const prevStart = observed?.startSets;
    if (prevStart == null || r?.startSets == null) continue;
    const samePeak = observed?.plannedPeak == null || r?.peakSets == null
      || r.peakSets === observed.plannedPeak;
    if (r.startSets === prevStart && samePeak && r?.source === 'manual') heldManual += 1;
  }

  const changes = (receipt.changed ?? []).map((c) => ({
    label: c.label,
    direction: /up from|week 1 up/.test(c.change) ? 'up' : 'down',
    detail: c.change,
  }));
  const climbs = changes.filter((c) => c.direction === 'up').length;
  const reductions = changes.length - climbs;

  return {
    meaningful: changes.length > 0 || receipt.moreChanged > 0,
    changes,
    moreChanged: receipt.moreChanged ?? 0,
    held: receipt.held ?? 0,
    heldUnjudged: receipt.heldUnjudged ?? 0,
    heldManual,
    climbs,
    reductions,
  };
}

/**
 * The user-facing lines for the decision card. Short, concrete, one per
 * changed muscle group, in the app's existing vocabulary.
 *
 * When nothing meaningful changes this returns the HONEST equivalence
 * line rather than an invented difference (requirement C): the coach
 * says the current setup still holds up, and never implies adaptation
 * merely because the user tapped Adjust.
 */
export function adjustPreviewLines(preview) {
  if (!preview) return [];
  if (!preview.meaningful) {
    const lines = ['Your current set targets are still supported by the evidence, so there are no meaningful training changes to apply.'];
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
  const heldJudged = preview.held - preview.heldUnjudged - preview.heldManual;
  if (heldJudged > 0) {
    lines.push(`${heldJudged} other muscle group${heldJudged === 1 ? '' : 's'} stay${heldJudged === 1 ? 's' : ''} where ${heldJudged === 1 ? 'it is' : 'they are'}, because that workload keeps working.`);
  }
  if (preview.heldUnjudged > 0) {
    lines.push(`${preview.heldUnjudged} stay${preview.heldUnjudged === 1 ? 's' : ''} conservative: there wasn't enough clear evidence this block.`);
  }
  if (preview.heldManual > 0) {
    lines.push(`${preview.heldManual} ${preview.heldManual === 1 ? 'is' : 'are'} on your own settings and stay${preview.heldManual === 1 ? 's' : ''} exactly there.`);
  }
  return lines;
}
