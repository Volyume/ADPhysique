/**
 * blockExplain.js — the explanation layer's pure copy builders (Stage 8
 * of the adaptive mesocycle build; authority
 * docs/blueprint-adaptive-mesocycle-2026-08-09.md §3.6 + the founder's
 * Stage 8 order: "Never claim an adjustment has been learned or applied
 * unless the underlying plan actually contains it").
 *
 * Honesty by construction:
 * - The block-start summary derives from the WRITTEN
 *   planned_muscle_volume rows — the plan as it actually exists — never
 *   from the seed map that was merely requested, so a skipped insert can
 *   never be narrated as applied.
 * - Block-start lines speak only for the personalised sources
 *   (seed_ledger / seed_learned / seed_manual); a template or
 *   research/profile ramp earns no "learned" claim.
 * - The block-end rows reuse each ledger entry's rationale VERBATIM: it
 *   was delta-composed from the final clamped numbers (Stage 2 review
 *   remediation), so it already agrees with the proposal it shipped with.
 * - The longer-recovery line renders only when the ledger proposed it,
 *   and always as the user's call — nothing here automates anything.
 * - The ramp line claims a coach adjustment only when an APPLIED delta
 *   is passed in (output.appliedAdjustments.training), never from the
 *   suggestion alone.
 *
 * Voice: British, calm, plain, no em dash
 * (COACHING_VOICE_SYNTHESIS_LOCKED).
 */
import { muscleDisplayName } from './algorithms';

const num = (v, fallback) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return Number.isFinite(n) ? n : fallback;
};

const SOURCE_CLAUSE = Object.freeze({
  seed_ledger: 'set by how your last block went',
  seed_learned: 'set by what past blocks have shown',
  seed_manual: 'your own setting',
});

// D93 (Campaign 2, Phase 7): the honest not-personalised-yet state. The
// sources that may claim "profile and research" - anything else (legacy
// null, coach) proves nothing and stays silent.
const RESEARCH_SOURCES = new Set(['template', 'seed_profile', 'seed_research']);
const RESEARCH_START_LINE =
  'Not enough personal history yet, so this block starts from research-based guidance. As blocks finish, each muscle\'s starting point comes from how it actually responded.';

/**
 * Group written planned rows into { [muscle]: { week1, peak, peakWeek,
 * deload, source } }. `peak` is the highest planned accumulation week
 * and `peakWeek` the first week index that reaches it.
 *
 * Two honesty rules from the Stage 7-8 review:
 * - The source is the WEEK 1 row's source, explicitly (review #9): the
 *   first-row-seen source made the line's presence depend on SQL row
 *   order, and any later coach apply rewrote one week to 'coach'.
 * - Only rows still carrying that same source count towards the peak
 *   (review #10): a week the coach has since raised belongs to the
 *   coach's story, not the seed's.
 */
export function summariseSeededPlan(plannedRows = [], deloadWeekIndex = null) {
  const grouped = {};
  for (const row of Array.isArray(plannedRows) ? plannedRows : []) {
    const muscle = row?.muscle;
    if (!muscle) continue;
    const week = num(row.week_index ?? row.weekIndex, null);
    const planned = num(row.planned_sets ?? row.plannedSets, null);
    if (week == null || planned == null) continue;
    (grouped[muscle] = grouped[muscle] || []).push({ week, planned, source: row.source ?? null });
  }
  const summary = {};
  for (const [muscle, rows] of Object.entries(grouped)) {
    rows.sort((a, b) => a.week - b.week);
    const week1Row = rows.find((r) => r.week === 1) ?? null;
    const source = week1Row?.source ?? null;
    const entry = { week1: week1Row?.planned ?? null, peak: null, peakWeek: null, deload: null, source };
    for (const r of rows) {
      if (deloadWeekIndex != null && r.week === deloadWeekIndex) {
        entry.deload = r.planned;
        continue;
      }
      if (r.source !== source) continue;
      if (entry.peak == null || r.planned > entry.peak) {
        entry.peak = r.planned;
        entry.peakWeek = r.week;
      }
    }
    summary[muscle] = entry;
  }
  return summary;
}

/**
 * Up to `limit` block-start lines, personalised sources only, largest
 * peaks first. [] when nothing was personalised — no line is better
 * than a false one. The peak week is NAMED (review #8: "by the final
 * week" pointed at the recovery week the sentence then contradicted)
 * and a flat ramp is never called a climb. The muscle name takes a
 * colon, not a verb (review #18: most display names are plural).
 */
export function buildBlockStartLines({ summary = {}, limit = 3 } = {}) {
  const personalised = Object.entries(summary)
    .filter(([, v]) => v && SOURCE_CLAUSE[v.source] && v.week1 != null && v.peak != null);
  // D93 (Campaign 2, Phase 7): a fully research/profile-seeded block used
  // to render NOTHING here. Silence was right for a learned claim, but the
  // honest state deserves its own line: not personalised YET, and why.
  // Emitted only when every written entry carries a known research-family
  // source - an unknown/legacy source still earns silence, because we
  // cannot prove where it came from.
  if (personalised.length === 0) {
    // Review B finding 9: judge EVERY entry, not just those with a usable
    // week-1 row - a personalised source whose week-1 row is missing must
    // still block the research claim, because part of this block was not
    // research-seeded.
    const entries = Object.values(summary).filter(Boolean);
    const allResearch = entries.some((v) => v.week1 != null)
      && entries.every((v) => RESEARCH_SOURCES.has(v.source));
    return allResearch ? [RESEARCH_START_LINE] : [];
  }
  const rows = personalised
    .sort((a, b) => (b[1].peak ?? 0) - (a[1].peak ?? 0))
    .slice(0, Math.max(0, limit));
  return rows.map(([muscle, v]) => {
    const clause = SOURCE_CLAUSE[v.source];
    if (v.peak > v.week1 && v.peakWeek != null) {
      return `${muscleDisplayName(muscle)}: ${v.week1} sets in week 1, building to ${v.peak} by week ${v.peakWeek}, then a recovery week (${clause}).`;
    }
    return `${muscleDisplayName(muscle)}: ${v.week1} sets a week, held steady, then a recovery week (${clause}).`;
  });
}

const CLASS_ORDER = Object.freeze({
  STRAINED: 0,
  OVERREACHED: 1,
  RESPONSIVE: 2,
  STALE: 3,
  INSUFFICIENT_DATA: 4,
});

/**
 * The block-end story: one row per ledger entry, ordered by what needs
 * attention, each carrying its entry's rationale verbatim.
 */
export function buildLedgerReflectionRows(ledger) {
  const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
  return entries
    .filter((e) => e && e.muscle && typeof e.rationale === 'string')
    .map((e) => ({
      muscle: e.muscle,
      label: muscleDisplayName(e.muscle),
      classification: e.classification ?? null,
      rationale: e.rationale,
    }))
    .sort((a, b) => (CLASS_ORDER[a.classification] ?? 9) - (CLASS_ORDER[b.classification] ?? 9));
}

/**
 * The user-confirmed longer-recovery proposal (§3.4 / founder Stage 7:
 * "7 days normal; longer only on multiple persistent signals,
 * user-confirmed"). Null unless the ledger proposed it.
 */
export function recoveryProposalLine(ledger) {
  if (num(ledger?.proposedRecoveryDays, 7) !== 10) return null;
  return 'Several strain signals ran together this block, so a longer recovery of about 10 days is suggested before the next one starts. Your call.';
}

/**
 * The weekly decision's ramp position (§3.6). Null without block
 * context or during the recovery week itself (the deload copy owns
 * that).
 *
 * Honesty rules (Stage 7-8 review #6/#7):
 * - The climb claim derives from the WRITTEN plan: it renders only when
 *   next week's planned total genuinely exceeds this week's, and names
 *   the magnitude (§3.6). A flat or reduced next week, or missing
 *   totals, earns no direction claim; only "your recovery week is
 *   next" stays structural (the deload week is always the last).
 * - The coach clause requires an applied delta AND at least one row
 *   actually changed — computeVolumeApply can return zero changes when
 *   every muscle already sits at MRV.
 */
export function buildRampPositionLine({
  weekIndex = null, plannedWeeks = null, appliedDelta = null,
  musclesChanged = null, thisWeekSets = null, nextWeekSets = null,
} = {}) {
  const week = num(weekIndex, null);
  const total = num(plannedWeeks, null);
  if (week == null || total == null || week < 1 || week >= total) return null;
  const peakWeek = total - 1; // the last accumulation week
  let direction = '';
  if (week === peakWeek) {
    direction = ' Your recovery week is next.';
  } else {
    const thisS = num(thisWeekSets, null);
    const nextS = num(nextWeekSets, null);
    if (thisS != null && nextS != null && nextS > thisS) {
      const climb = nextS - thisS;
      direction = ` The planned climb adds ${climb} ${climb === 1 ? 'set' : 'sets'} next week.`;
    }
  }
  let coachBit = '';
  const delta = num(appliedDelta, null);
  if (delta != null && delta !== 0 && num(musclesChanged, 0) > 0) {
    const mag = Math.abs(delta);
    const setWord = mag === 1 ? 'set' : 'sets';
    coachBit = delta > 0
      ? ` This week the coach added ${mag} ${setWord} on top.`
      : ` This week the coach pulled ${mag} ${setWord} back.`;
  }
  return `Week ${week} of ${total} in your block.${direction}${coachBit}`;
}
