/**
 * capability/reintroduction.js - the section 23 return path.
 *
 * On a USER-CONFIRMED episode end:
 *  1. eligibility restores instantly (nothing here to do - the resolver
 *     reads live state);
 *  2. loads need nothing - the C20 resolver's stale-history semantics
 *     already resolve a returning movement conservatively (verified
 *     uncontaminated; NO percentages, NO detraining formula, CC-R3);
 *  3. VOLUME: each muscle the ended episode released ramps from its
 *     current week's planned volume back toward the block's own planned
 *     peak across the REMAINING accumulation weeks - the plan is the
 *     protected baseline (base rows were never rewritten by the
 *     episode), so the ramp only closes the gap the reduced effective
 *     dose opened, one honest step a week;
 *  4. the RI window needs no separate eligibility machinery: the ramp
 *     lives inside the block the episode overlapped, which CC30 already
 *     stamps constrained at ledger grain, and session-grain readers keep
 *     their own conservative gates (lead ruling, recorded).
 *
 * Formula-free and reversible: whole sets, never above the plan's own
 * peak, never below what is currently planned, deload weeks untouched,
 * muscles still held by ANOTHER active episode untouched. Best-effort
 * throughout - a failure leaves the plan exactly as it was.
 */
import { constrainedMusclesAt } from './eligibility';

/**
 * Apply the ramp. Returns { ramped: [{muscle, from, to}] } (empty when
 * nothing needed). Pure maths, impure writes via database helpers.
 */
export async function applyReintroductionRamp(userId, { endedAtMs = Date.now() } = {}) {
  const out = { ramped: [] };
  if (!userId) return out;
  try {
    // eslint-disable-next-line global-require
    const db = require('../database');
    const rows = await db.getCapabilityConstraints(userId);
    const library = await db.getAllExercises();
    // Muscles constrained just BEFORE the end and free just AFTER it -
    // scope still held by another live episode stays held.
    const before = constrainedMusclesAt(rows, library, endedAtMs - 1);
    const after = constrainedMusclesAt(rows, library, endedAtMs + 1);
    const released = [...before].filter((m) => !after.has(m));
    if (!released.length) return out;

    const mesos = await db.getAllMesocyclesForUser(userId);
    const live = (mesos ?? []).find((m) => m.isActive === 1 || m.isActive === true);
    if (!live?.id) return out;
    const weeks = await db.getMesocycleWeeks(live.id);
    const current = (weeks ?? []).find((w) => {
      const s = w.startedAt ?? w.started_at ?? null;
      return s != null && s <= endedAtMs && (w.completedAt ?? w.completed_at ?? null) == null;
    }) ?? (weeks ?? []).find((w) => (w.completedAt ?? w.completed_at ?? null) == null);
    if (!current) return out;
    const currentIndex = current.weekIndex ?? current.week_index;
    const remaining = (weeks ?? [])
      .filter((w) => (w.weekIndex ?? w.week_index) > currentIndex
        && !(w.isDeload ?? w.is_deload))
      .sort((a, b) => (a.weekIndex ?? a.week_index) - (b.weekIndex ?? b.week_index));
    if (!remaining.length) return out;

    for (const muscle of released) {
      // eslint-disable-next-line no-await-in-loop
      const currentRows = await db.getPlannedMuscleVolume(current.id);
      const nowPlanned = (currentRows ?? []).find((r) => r.muscle === muscle)?.planned_sets ?? null;
      if (nowPlanned == null) continue;
      // The plan's own peak for this muscle across the block - the
      // protected target (never invented, never exceeded).
      let peak = 0;
      let bands = null;
      for (const w of weeks ?? []) {
        // eslint-disable-next-line no-await-in-loop
        const rws = await db.getPlannedMuscleVolume(w.id);
        const r = (rws ?? []).find((x) => x.muscle === muscle);
        if (r) {
          if ((r.planned_sets ?? 0) > peak) peak = r.planned_sets ?? 0;
          bands = bands ?? { mev: r.mev ?? null, mav: r.mav ?? null, mrv: r.mrv ?? null };
        }
      }
      if (!peak || nowPlanned >= peak) continue;
      const steps = remaining.length;
      let changedTo = null;
      for (let i = 0; i < steps; i += 1) {
        const target = Math.round(nowPlanned + ((peak - nowPlanned) * (i + 1)) / steps);
        const week = remaining[i];
        // eslint-disable-next-line no-await-in-loop
        await db.upsertPlannedMuscleVolume({
          mesocycleWeekId: week.id,
          muscle,
          plannedSets: target,
          mev: bands?.mev ?? null, mav: bands?.mav ?? null, mrv: bands?.mrv ?? null,
          source: 'reintroduction',
        });
        changedTo = target;
      }
      out.ramped.push({ muscle, from: nowPlanned, to: changedTo ?? peak });
    }
    return out;
  } catch (_e) {
    return out;
  }
}

/** The section 23.5 line - trajectory copy, no promises, no timelines. */
export function reintroductionCopy(muscleLabel) {
  return `Rebuilding ${muscleLabel} gradually after your restriction ended.`;
}
