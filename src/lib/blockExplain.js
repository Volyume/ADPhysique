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
import { BLOCK_PLANNED_WEEKS } from './mesocycle';

const num = (v, fallback) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return Number.isFinite(n) ? n : fallback;
};

const NUMBER_WORDS = Object.freeze({
  3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
});
const numberWord = (n) => NUMBER_WORDS[n] ?? String(n);

/**
 * C5-P10-01 / C5-P11-02 (D96): the one sentence every activation decision
 * point states, for free and Pro alike.
 *
 * Activating ANY plan creates a training block with a fixed effort ladder
 * and a scheduled recovery week (activatePlanWithBlock), and no first-use
 * path said so: the two strings that did were gated on being Pro WITH an
 * existing plan, or on already being past week 1. A first-time user met
 * "Week 1 of 6" days later for something they never knowingly started.
 *
 * Derived from BLOCK_PLANNED_WEEKS so it can never describe a block length
 * the writer does not create.
 */
export const BLOCK_START_SENTENCE =
  `This starts a ${numberWord(BLOCK_PLANNED_WEEKS)}-week training block: `
  + `${numberWord(BLOCK_PLANNED_WEEKS - 1)} weeks that build, then a lighter recovery week.`;

/**
 * C5-P10-08 (D96): what activation actually changes, in one sentence.
 * Pairs with BLOCK_START_SENTENCE at the same decision points: activation
 * was never described anywhere, only named by its own verb ("Set active",
 * "Make it active now"), so nothing told the user which session becomes
 * next or that Today then leads with this plan.
 */
export const ACTIVATION_MEANING_SENTENCE =
  'Today then leads with this plan, and you can still change the workouts afterwards.';

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

// FB-25 (D96): a mixed block seeds SOME muscles from the ledger and leaves
// the rest on the research/profile prior. The personalised lines used to be
// the only thing on the surface, so three confident "set by how your last
// block went" lines read as "all of this is personalised". This names the
// remainder without mislabelling it.
const RESEARCH_REMAINDER_LINE =
  'The rest still start from research-based guidance, until they have a block behind them.';

/**
 * FB-27/FB-28 (D96): how this muscle's numbers moved against the block
 * that just finished. Returns null when there is nothing to compare
 * against, so the line falls back to its previous wording unchanged.
 */
function changeAgainstPrevious(v, prevEntry) {
  if (!prevEntry) return null;
  const prevStart = num(prevEntry.startSets, null);
  const prevPeak = num(prevEntry.peakSets, null);
  if (prevStart == null && prevPeak == null) return null;
  const ds = prevStart != null && v.week1 != null ? v.week1 - prevStart : 0;
  const dp = prevPeak != null && v.peak != null ? v.peak - prevPeak : 0;
  // FB-27: keeping a dose is a judgement the coach made from the block, not
  // an absence of one, so it is stated rather than left silent.
  if (ds === 0 && dp === 0) return { magnitude: 0, suffix: ', kept where it was' };
  if (ds !== 0) {
    return {
      magnitude: Math.abs(ds) + Math.abs(dp),
      suffix: `, ${ds > 0 ? 'up' : 'down'} from ${prevStart} in week 1`,
    };
  }
  return {
    magnitude: Math.abs(dp),
    suffix: `, peak ${dp > 0 ? 'up' : 'down'} from ${prevPeak}`,
  };
}

/**
 * Up to `limit` block-start lines, personalised sources only, largest
 * peaks first. [] when nothing was personalised — no line is better
 * than a false one. The peak week is NAMED (review #8: "by the final
 * week" pointed at the recovery week the sentence then contradicted)
 * and a flat ramp is never called a climb. The muscle name takes a
 * colon, not a verb (review #18: most display names are plural).
 *
 * `previous` (FB-27/FB-28, D96) is an optional
 * { [muscle]: { startSets, peakSets } } map of what the finished block
 * actually ran. When supplied, the lines are ordered by how much each
 * muscle MOVED rather than by which has the biggest numbers (sorting by
 * peak buried the one muscle whose peak came down, because a reduction
 * sorts last by construction), retention is stated as a decision, and
 * the muscles the cap drops are counted rather than silently lost.
 * Without it, ordering and wording are exactly as they were.
 */
export function buildBlockStartLines({ summary = {}, limit = 3, previous = null } = {}) {
  const prev = previous && typeof previous === 'object' ? previous : null;
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
  const changes = new Map(
    personalised.map(([muscle, v]) => [muscle, changeAgainstPrevious(v, prev?.[muscle])]),
  );
  const ordered = personalised.slice().sort((a, b) => {
    const ma = changes.get(a[0])?.magnitude ?? null;
    const mb = changes.get(b[0])?.magnitude ?? null;
    // FB-28: whatever moved most leads; unchanged entries fall to the back.
    // With no comparison available the original peak ordering stands.
    if (ma != null && mb != null && ma !== mb) return mb - ma;
    return (b[1].peak ?? 0) - (a[1].peak ?? 0);
  });
  const rows = ordered.slice(0, Math.max(0, limit));
  const lines = rows.map(([muscle, v]) => {
    const clause = SOURCE_CLAUSE[v.source];
    const move = changes.get(muscle)?.suffix ?? '';
    if (v.peak > v.week1 && v.peakWeek != null) {
      return `${muscleDisplayName(muscle)}: ${v.week1} sets in week 1, building to ${v.peak} by week ${v.peakWeek}, then a recovery week (${clause}${move}).`;
    }
    return `${muscleDisplayName(muscle)}: ${v.week1} sets a week, held steady, then a recovery week (${clause}${move}).`;
  });
  // FB-28: the cap is real, so say how much it hid. Only stated when the
  // comparison ran, since that is what makes the ordering meaningful.
  const dropped = ordered.length - rows.length;
  if (prev && dropped > 0) {
    lines.push(`Plus ${dropped} more muscle group${dropped === 1 ? '' : 's'}, set the same way.`);
  }
  // FB-25: name the research-seeded remainder beside the personalised lines.
  const anyResearch = Object.values(summary)
    .some((v) => v && RESEARCH_SOURCES.has(v.source) && v.week1 != null);
  if (anyResearch) lines.push(RESEARCH_REMAINDER_LINE);
  return lines;
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
 * FB-24 (D96): the receipt for a "Continue with adjustments" transition.
 *
 * Confirming the next block used to end in silence: the decision card
 * vanished, the Train tab showed "Week 1 of 6", and the only explanation
 * lived behind a Home chip and carried no comparison at all. This composes
 * that comparison from data already in hand at the moment of the write —
 * the resolved seed ranges plus the finished block's stored ledger — so no
 * new computation and no new query is involved.
 *
 * `changed` rows carry the ledger's own delta-composed rationale verbatim
 * (the Stage 2 remediation makes it agree with the numbers by
 * construction). `held` counts the muscles the coach deliberately kept
 * where they were, which on a first transition is nearly all of them.
 *
 * @param {object} args
 * @param {object|null} args.ranges  resolveSeedRange output, per muscle
 * @param {object|null} args.ledger  the finished block's stored ledger
 * @param {number} args.limit        max rows returned
 */
export function buildSeedReceipt({ ranges = null, ledger = null, limit = 4 } = {}) {
  const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
  const byMuscle = new Map(entries.filter((e) => e?.muscle).map((e) => [e.muscle, e]));
  const changed = [];
  let held = 0;
  // RA-2 (D96, Review A): a hold from INSUFFICIENT_DATA is not a judgement.
  // With null session ratings now the default (C5-P17-01/02), a first block
  // can end with every muscle unjudged, and "Keeping a dose that worked"
  // asserted exactly the verdict the ledger had just declined to give.
  let heldUnjudged = 0;
  for (const [muscle, r] of Object.entries(ranges && typeof ranges === 'object' ? ranges : {})) {
    const observed = byMuscle.get(muscle)?.observed;
    const prevStart = num(observed?.startSets, null);
    const prevPeak = num(observed?.plannedPeak, null);
    const start = num(r?.startSets, null);
    const peak = num(r?.peakSets, null);
    // No previous numbers means this muscle had no judged block behind it,
    // so there is no change to claim either way.
    if (prevStart == null || start == null) continue;
    const ds = start - prevStart;
    const dp = prevPeak != null && peak != null ? peak - prevPeak : 0;
    if (ds === 0 && dp === 0) {
      held += 1;
      if (byMuscle.get(muscle)?.classification === 'INSUFFICIENT_DATA') heldUnjudged += 1;
      continue;
    }
    const bits = [];
    if (ds !== 0) bits.push(`week 1 ${ds > 0 ? 'up' : 'down'} from ${prevStart} to ${start} sets`);
    if (dp !== 0) bits.push(`peak ${dp > 0 ? 'up' : 'down'} from ${prevPeak} to ${peak} sets`);
    changed.push({
      muscle,
      label: muscleDisplayName(muscle),
      change: bits.join(', '),
      rationale: typeof byMuscle.get(muscle)?.rationale === 'string'
        ? byMuscle.get(muscle).rationale
        : null,
      magnitude: Math.abs(ds) + Math.abs(dp),
    });
  }
  changed.sort((a, b) => b.magnitude - a.magnitude);
  const capped = changed.slice(0, Math.max(0, limit));
  // FB-27: retention is a decision, so it gets said out loud - but only for
  // muscles the ledger actually judged. RA-2: an INSUFFICIENT_DATA hold gets
  // the honest sentence instead, and a mixed receipt states both.
  const heldJudged = held - heldUnjudged;
  const groupNoun = (n) => `muscle group${n === 1 ? '' : 's'}`;
  const stayedVerb = (n) => (n === 1 ? 'it was' : 'they were');
  let heldLine = null;
  if (held > 0) {
    const parts = [];
    if (heldJudged > 0) {
      parts.push(`${heldJudged} other ${groupNoun(heldJudged)} stayed where ${stayedVerb(heldJudged)}. Keeping a dose that worked is a decision too.`);
    }
    if (heldUnjudged > 0) {
      parts.push(`${heldUnjudged} ${heldJudged > 0 ? 'more ' : 'other '}${groupNoun(heldUnjudged)} stayed where ${stayedVerb(heldUnjudged)}: this block did not log enough recovery feedback to judge ${heldUnjudged === 1 ? 'it' : 'them'}, so nothing was moved on a guess.`);
    }
    heldLine = parts.join(' ');
  }
  return {
    changed: capped,
    moreChanged: Math.max(0, changed.length - capped.length),
    held,
    heldUnjudged,
    heldLine,
  };
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
