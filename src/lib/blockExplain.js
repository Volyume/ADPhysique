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
import { MUSCLE_DISPLAY_NAMES } from './algorithms';

const num = (v, fallback) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return Number.isFinite(n) ? n : fallback;
};

const displayName = (key) => {
  const known = MUSCLE_DISPLAY_NAMES[String(key)];
  if (known) return known;
  const spaced = String(key ?? '').replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const SOURCE_CLAUSE = {
  seed_ledger: 'set by how your last block went',
  seed_learned: 'set by what past blocks have shown',
  seed_manual: 'your own setting',
};

/**
 * Group written planned rows into { [muscle]: { week1, peak, deload,
 * source } }. `peak` is the highest planned accumulation week.
 */
export function summariseSeededPlan(plannedRows = [], deloadWeekIndex = null) {
  const summary = {};
  for (const row of Array.isArray(plannedRows) ? plannedRows : []) {
    const muscle = row?.muscle;
    if (!muscle) continue;
    const week = num(row.week_index ?? row.weekIndex, null);
    const planned = num(row.planned_sets ?? row.plannedSets, null);
    if (week == null || planned == null) continue;
    let entry = summary[muscle];
    if (!entry) { entry = { week1: null, peak: null, deload: null, source: row.source ?? null }; summary[muscle] = entry; }
    if (week === 1) entry.week1 = planned;
    if (deloadWeekIndex != null && week === deloadWeekIndex) {
      entry.deload = planned;
    } else {
      entry.peak = entry.peak == null ? planned : Math.max(entry.peak, planned);
    }
    if (entry.source == null && row.source != null) entry.source = row.source;
  }
  return summary;
}

/**
 * Up to `limit` block-start lines, personalised sources only, largest
 * peaks first. [] when nothing was personalised — no line is better
 * than a false one.
 */
export function buildBlockStartLines({ summary = {}, limit = 3 } = {}) {
  const rows = Object.entries(summary)
    .filter(([, v]) => v && SOURCE_CLAUSE[v.source] && v.week1 != null && v.peak != null)
    .sort((a, b) => (b[1].peak ?? 0) - (a[1].peak ?? 0))
    .slice(0, Math.max(0, limit));
  return rows.map(([muscle, v]) => (
    `${displayName(muscle)} starts at ${v.week1} sets, climbing to ${v.peak} by the final week, then a recovery week (${SOURCE_CLAUSE[v.source]}).`
  ));
}

const CLASS_ORDER = {
  STRAINED: 0,
  OVERREACHED: 1,
  RESPONSIVE: 2,
  STALE: 3,
  INSUFFICIENT_DATA: 4,
};

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
      label: displayName(e.muscle),
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
 * that). The coach clause appears only for an APPLIED delta.
 */
export function buildRampPositionLine({ weekIndex = null, plannedWeeks = null, appliedDelta = null } = {}) {
  const week = num(weekIndex, null);
  const total = num(plannedWeeks, null);
  if (week == null || total == null || week < 1 || week >= total) return null;
  const peakWeek = total - 1; // the last accumulation week
  const direction = week === peakWeek
    ? 'Your recovery week is next.'
    : 'The plan climbs next week.';
  let coachBit = '';
  const delta = num(appliedDelta, null);
  if (delta != null && delta !== 0) {
    const mag = Math.abs(delta);
    const setWord = mag === 1 ? 'set' : 'sets';
    coachBit = delta > 0
      ? ` This week the coach added ${mag} ${setWord} on top.`
      : ` This week the coach pulled ${mag} ${setWord} back.`;
  }
  return `Week ${week} of ${total} in your block. ${direction}${coachBit}`;
}
