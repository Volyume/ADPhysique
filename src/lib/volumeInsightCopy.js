/**
 * Volume-insight copy — pure status→guidance text for the per-muscle volume
 * rows on the Workout Summary screen.
 *
 * Extracted from WorkoutSummaryScreen so the status→advice mapping can be
 * locked with tests. These helpers do NOT compute the volume status (that is
 * getVolumeStatus in algorithms.js, the deterministic engine); they only turn
 * an already-decided status into human British-English guidance. The contract
 * the tests hold is directional: an over- or near-ceiling row must never tell a
 * lifter to add volume, and a below/at-minimum row must never tell them to drop
 * it — a wrong-direction line could push someone to overtrain.
 */
import { VOLUME_LANDMARKS, MUSCLE_DISPLAY_NAMES } from './algorithms';

/**
 * At-a-glance insight line for a muscle row: set count, status phrase and the
 * MEV–MRV target range. Returns null for a muscle with no landmarks.
 *
 * C6 RD6-1 (D97-25): callers pass the RESOLVED landmark table (manual >
 * adapted > research) the verdict itself was computed from, so the range
 * quoted in the sentence is the range that produced the status beside
 * it. Reading frozen VOLUME_LANDMARKS here while the verdict used the
 * resolved table made the copy contradict the verdict on any adapted or
 * manual muscle ("18 sets - over your recovery limit (aim for 6-22)"
 * against a resolved ceiling of 16). Research stays the fallback so
 * every legacy caller is byte-identical.
 */
export function getVolumeInsight(muscle, sets, status, table = null) {
  const landmarks = table?.[muscle] ?? VOLUME_LANDMARKS[muscle];
  if (!landmarks) return null;
  const { mev, mrv } = landmarks;
  const n = Math.round(sets);
  const range = `${mev}–${mrv} sets/week`;
  if (status === 'optimal') return `${n} sets · on track for muscle growth (target: ${range})`;
  if (status === 'minimum') return `${n} sets · at the minimum for growth (target: ${range})`;
  if (status === 'below') return `${n} sets · below the minimum for growth (target: ${range})`;
  if (status === 'near_mrv') return `${n} sets · approaching upper limit (target: ${range})`;
  if (status === 'over_mrv') return `${n} sets · over your recovery limit (aim for ${range} next week)`;
  return `${n} sets (target: ${range})`;
}

// Longer-form "why this status" explanation surfaced behind a tap on each
// muscle row. The insight line above is at-a-glance; this body answers
// the "but why?" question with concrete next-week guidance and the
// landmark numbers for THIS muscle specifically.
export function getVolumeWhy(muscle, sets, status, table = null, source = null) {
  const landmarks = table?.[muscle] ?? VOLUME_LANDMARKS[muscle];
  if (!landmarks) return null;
  const { mev, mrv } = landmarks;
  const name = MUSCLE_DISPLAY_NAMES[muscle] || muscle;
  // C6 RD6-1 (D97-25): the closing clause tells the truth about WHICH
  // band the reader is looking at. "Targets adjust over time" was
  // attached unconditionally - true for a Pro adapted muscle, false for
  // a free user on research constants, and misleading for a manual
  // muscle whose numbers deliberately never move. Each source now gets
  // its own true sentence; unknown source keeps the research wording
  // (the conservative claim, true for every band that has not adapted).
  // Founder ruling 2026-08-23 added the plan and profile bands, so two
  // more sources exist and each needs its own true sentence: the closing
  // clause must never describe a band the reader is not looking at.
  const closing = source === 'adapted'
    ? ' Targets adjust over time as your body responds to training.'
    : source === 'manual'
      ? ' These are your own volume targets, exactly as you set them.'
      : source === 'plan'
        ? ' This target is what your plan programs for this muscle each week.'
        : source === 'profile'
          ? ' These targets are matched to your training experience, recovery, phase and age.'
          : ' These targets are research-based starting points.';
  if (status === 'optimal') {
    return `${name}'s productive range sits between ${mev} and ${mrv} sets per week, and you landed inside it. Next week, look for an extra rep on at least one exercise rather than piling on more sets.${closing}`;
  }
  if (status === 'minimum') {
    return `You're right at the floor for ${name}. ${mev} sets is enough to grow, but only just. One or two more sets across the week, or a slower lowering phase on one exercise, moves you into a stronger range.${closing}`;
  }
  if (status === 'below') {
    return `Below the ${mev}-set floor where reliable growth signals start to appear in research. Two routes next week: add a couple of sets to an existing exercise, or sneak in one extra movement that hits ${name}.${closing}`;
  }
  if (status === 'near_mrv') {
    return `Close to the recovery ceiling for ${name} (${mrv} sets per week). One more session and recovery costs start to outweigh the gains. Hold here next week. If your reps are still climbing session to session, you're managing the load well.${closing}`;
  }
  if (status === 'over_mrv') {
    return `Past the recovery ceiling for ${name} (${mrv} sets per week). Soreness, performance drops and joint aches usually follow. Drop a few sets next week to land back in the helpful range. Backing off here is how you come back stronger.${closing}`;
  }
  return null;
}
