/**
 * blockSeed.js — the per-muscle seeding fallback resolver (Stage 6 of
 * the adaptive mesocycle build; authority
 * docs/blueprint-adaptive-mesocycle-2026-08-09.md §3.5/§3.9 + the
 * founder's Stage 6 order, verbatim fallback chain: "1 manual override
 * -> 2 valid ledger -> 3 learned band -> 4 profile-adjusted research ->
 * 5 raw research; Never silently discard a valid previous-block
 * recommendation").
 *
 * Pure and deterministic. resolveSeedRange picks ONE muscle's next-block
 * start/peak and NAMES its source, so the seeding write
 * (generateInitialPlannedVolume) and the Stage 8 explanation can never
 * disagree about where a number came from.
 *
 * Advisor button semantics (§3.5): intent 'repeat' = ledger carry-over
 * forced to a TRUE repeat (the finished block's own observed start and
 * planned peak); intent 'adjust' = the full ledger proposal.
 *
 * Suppression (§3.8/D15, calm mode OR an open ED flag, caller-ORed):
 * no upward carry-over anywhere. A ledger seed degrades to the repeat
 * numbers (a valid recommendation is used, never discarded — it just
 * cannot climb); a ledger REDUCTION passes untouched; the learned band
 * is skipped for the conservative profile/research default; a manual
 * override is the user's own explicit numbers and stands.
 */
import { ABSOLUTE_WEEKLY_SET_CEILING, deloadSharePct, deloadFloor } from './coachApply';
import { BLOCK_CLASS } from './interBlock';
import { isManualEdit } from './effectiveLandmarks';

const num = (v, fallback) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return Number.isFinite(n) ? n : fallback;
};

/**
 * @param {object} input
 * @param {{mev:number, mav:number}|null} input.manual - the user's manual
 *   landmarks entry for this muscle, when one exists.
 * @param {object|null} input.ledgerEntry - the finished block's ledger
 *   entry for this muscle (classifyMuscleBlock's shape). Valid when its
 *   proposal carries numbers and is not deferredToManual.
 * @param {{floor:number, ceiling:number, isLearned:boolean}|null}
 *   input.learnedRange - computeLearnedRange's output.
 * @param {{mev:number, mav:number}|null} input.profileAdjusted -
 *   planEngine's profile-adjusted landmarks (lowercase-normalised).
 * @param {{mev:number, mav:number}|null} input.research - the raw
 *   research table entry; also the absolute floor/ceiling anchor.
 * @param {boolean} input.suppressed - calm mode OR open ED flag.
 * @param {'repeat'|'adjust'} input.intent - the advisor button tapped.
 * @returns {{startSets:number, peakSets:number, source:'manual'|'ledger'|'learned'|'profile'|'research'}}
 */
export function resolveSeedRange({
  manual = null,
  ledgerEntry = null,
  learnedRange = null,
  profileAdjusted = null,
  research = null,
  suppressed = false,
  intent = 'adjust',
} = {}) {
  const researchMev = num(research?.mev, null);
  const clamp = (start, peak) => {
    const floor = researchMev ?? 0;
    let s = Math.round(Math.min(Math.max(num(start, floor), floor), ABSOLUTE_WEEKLY_SET_CEILING));
    let p = Math.round(Math.min(Math.max(num(peak, s), s), ABSOLUTE_WEEKLY_SET_CEILING));
    return { s, p };
  };

  // 1. Manual override: the user's explicit numbers, suppression-proof.
  // Only a REAL edit counts (Stage 6 review blocker #1): the editor used
  // to save untouched research defaults for every muscle, and treating
  // those as overrides silently disabled the whole adaptive layer.
  const manualMev = num(manual?.mev, null);
  const manualMav = num(manual?.mav, null);
  if (manualMev != null && manualMav != null && manualMev > 0 && manualMav > 0
    && isManualEdit(manual, research)) {
    const { s, p } = clamp(manualMev, Math.max(manualMav, manualMev));
    return { startSets: s, peakSets: p, source: 'manual' };
  }

  // 2. A valid ledger entry is NEVER silently discarded (founder order).
  // INSUFFICIENT_DATA is not a recommendation — the block could not be
  // judged, so the richer learned band (built from prior blocks) speaks
  // next instead of the entry's fallback numbers (founder e2e ruling:
  // a muscle with useful learned history falls back to it).
  const proposal = ledgerEntry?.proposal;
  const observed = ledgerEntry?.observed;
  const ledgerValid = proposal
    && !proposal.deferredToManual
    && ledgerEntry?.classification !== BLOCK_CLASS.INSUFFICIENT_DATA
    && num(proposal.startSets, null) != null
    && num(proposal.peakSets, null) != null;
  if (ledgerValid) {
    let start = num(proposal.startSets, 0);
    let peak = num(proposal.peakSets, start);
    const repeatStart = num(observed?.startSets, start);
    const repeatPeak = num(observed?.plannedPeak, peak);
    if (intent === 'repeat') {
      // §3.5: a true repeat — the block the user just ran, unchanged.
      start = repeatStart;
      peak = repeatPeak;
    } else if (suppressed) {
      // No upward carry: degrade to the repeat numbers where the proposal
      // climbs; keep it where it reduces.
      start = Math.min(start, repeatStart);
      peak = Math.min(peak, repeatPeak);
    }
    const { s, p } = clamp(start, peak);
    // Stage 7 (§3.4): only a ledger seed carries an achieved peak plus
    // strain evidence, so only it can size its own deload week — the
    // strain-scaled share of what the muscle actually did. Other sources
    // (and the cases below) leave the seeded deload at research MEV.
    //
    // Three gates from the Stage 7-8 review:
    // - Not under suppression (BLOCKER #2, §3.8 "no upward carry-over
    //   anywhere" on the most-protective reading, D91 ruling 11's
    //   precedent): a flagged user's recovery week stays the flat MEV
    //   week — block carry-over must never raise it.
    // - Not for a true repeat (NIT #17): "the block the user just ran,
    //   unchanged" includes its recovery week.
    // - Clamped to min(startSets, ABSOLUTE_WEEKLY_SET_CEILING)
    //   (BLOCKER #1): a recovery week can never exceed the block's own
    //   lightest training week, nor the absolute backstop.
    const achievedPeak = num(observed?.achievedPeak, null);
    const out = { startSets: s, peakSets: p, source: 'ledger' };
    if (intent !== 'repeat' && !suppressed && achievedPeak != null && achievedPeak > 0) {
      // Raw evidence value: coachApply coerces it and fails CLOSED to
      // heavy strain (the smallest dose) when unreadable (review #13).
      const strainRaw = ledgerEntry?.evidence?.find?.(
        (e) => e?.signal === 'recovery_cost_weight',
      )?.value;
      // Founder ruling (Stage 7 refinement): MEV is a productive-training
      // landmark, not a recovery-week minimum — it must never force a
      // deload UPWARD past the percentage dose. The recovery floor is
      // deloadFloor (half of research MEV, at least one set). The share
      // base is capped at the seeded peak (review #4: achieved peaks
      // carry secondary half-credit; the planned week they recover from
      // does not), keeping recovery <= start <= peak coherent.
      const dose = Math.round(
        (Math.min(achievedPeak, p) * deloadSharePct(strainRaw)) / 100,
      );
      out.deloadSets = Math.min(
        Math.max(deloadFloor(researchMev), dose),
        s,
        ABSOLUTE_WEEKLY_SET_CEILING,
      );
    }
    return out;
  }

  // 2b. C6 P-6 (D97-20, ruling (a)): repeat means the block the user just
  // ran, even when it could not be judged. Before this, an unjudgeable
  // entry (INSUFFICIENT_DATA / deferredToManual / missing numbers) fell
  // through to the learned band for a REPEAT intent too, so the button
  // promising "the same set targets as last time" delivered multi-block
  // learned volume - including to Free, whose only reachable intent is
  // repeat. The entry echoes the observed numbers even when it cannot
  // judge them (interBlock keeps them on the record); for a repeat they
  // ARE the promise, so they speak before any learned/profile/research
  // step. No deload sizing here - that stays exclusive to a judgeable
  // ledger seed, and a true repeat keeps its flat recovery week anyway.
  if (intent === 'repeat') {
    const repeatStart = num(observed?.startSets, null);
    const repeatPeak = num(observed?.plannedPeak, null);
    if (repeatStart != null && repeatStart > 0) {
      const { s, p } = clamp(repeatStart, repeatPeak ?? repeatStart);
      return { startSets: s, peakSets: p, source: 'ledger' };
    }
  }

  // 3. The learned band — skipped under suppression (its ceiling may sit
  // above the research default, and a flagged user gets the conservative
  // ramp; the band itself is memory and survives untouched).
  if (!suppressed && learnedRange?.isLearned) {
    const floor = num(learnedRange.floor, null);
    const ceiling = num(learnedRange.ceiling, null);
    if (floor != null && ceiling != null) {
      const { s, p } = clamp(floor, ceiling);
      return { startSets: s, peakSets: p, source: 'learned' };
    }
  }

  // 4. Profile-adjusted research.
  const profMev = num(profileAdjusted?.mev, null);
  const profMav = num(profileAdjusted?.mav, null);
  if (profMev != null && profMav != null) {
    const { s, p } = clamp(profMev, profMav);
    return { startSets: s, peakSets: p, source: 'profile' };
  }

  // 5. Raw research, the last resort.
  const { s, p } = clamp(num(research?.mev, 0), num(research?.mav, num(research?.mev, 0)));
  return { startSets: s, peakSets: p, source: 'research' };
}
