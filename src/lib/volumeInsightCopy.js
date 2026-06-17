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
 */
export function getVolumeInsight(muscle, sets, status) {
  const landmarks = VOLUME_LANDMARKS[muscle];
  if (!landmarks) return null;
  const { mev, mrv } = landmarks;
  const n = Math.round(sets);
  const range = `${mev}–${mrv} sets/week`;
  if (status === 'optimal') return `${n} sets · on track for hypertrophy (target: ${range})`;
  if (status === 'minimum') return `${n} sets · at minimum effective volume (target: ${range})`;
  if (status === 'below') return `${n} sets · below minimum effective volume (target: ${range})`;
  if (status === 'near_mrv') return `${n} sets · approaching upper limit (target: ${range})`;
  if (status === 'over_mrv') return `${n} sets · over your recovery limit (aim for ${range} next week)`;
  return `${n} sets (target: ${range})`;
}

// Longer-form "why this status" explanation surfaced behind a tap on each
// muscle row. The insight line above is at-a-glance; this body answers
// the "but why?" question with concrete next-week guidance and the
// landmark numbers for THIS muscle specifically.
export function getVolumeWhy(muscle, sets, status) {
  const landmarks = VOLUME_LANDMARKS[muscle];
  if (!landmarks) return null;
  const { mev, mrv } = landmarks;
  const name = MUSCLE_DISPLAY_NAMES[muscle] || muscle;
  const closing = ' Targets adjust over time as your body responds to training.';
  if (status === 'optimal') {
    return `${name}'s productive range sits between ${mev} and ${mrv} sets per week, and you landed inside it. Next week, look for an extra rep on at least one exercise rather than piling on more sets.${closing}`;
  }
  if (status === 'minimum') {
    return `You're right at the floor for ${name}. ${mev} sets is enough to grow, but only just. One or two more sets across the week, or a slower eccentric on one exercise, moves you into a stronger range.${closing}`;
  }
  if (status === 'below') {
    return `Below the ${mev}-set floor where reliable growth signals start to appear in research. Two routes next week: add a couple of sets to an existing exercise, or sneak in one extra movement that hits ${name}.${closing}`;
  }
  if (status === 'near_mrv') {
    return `Close to the recovery ceiling for ${name} (${mrv} sets per week). One more session and recovery costs start to outweigh the gains. Hold here next week. If your reps are still climbing session to session, you're managing the load well.${closing}`;
  }
  if (status === 'over_mrv') {
    return `Past the recovery ceiling for ${name} (${mrv} sets per week). Soreness, performance drops and joint chatter usually follow. Drop a few sets next week to land back in the green band. Backing off here is how you come back stronger.${closing}`;
  }
  return null;
}
