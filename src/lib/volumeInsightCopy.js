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
import { volumeBandLabel, volumeRangeText } from './volumeBandLabels';

/**
 * At-a-glance insight line for a muscle row: set count, the band's word and the
 * weekly range, "12 sets · In range: 6 to 22 sets a week". Returns null for a
 * muscle with no landmarks.
 *
 * D214 addendum 9 (census 0.24, W4, W8): the band word is the Volume heatmap's
 * own (Under the range, Just enough, In range, Near the limit, Too much, read
 * from the one shared map, volumeBandLabels.js), and the range is "the range",
 * never "target: 6 to 22 sets/week". A muscle whose range has no lower bound
 * reads "up to 14 sets a week", never "0 to 14", as the heatmap's rows do.
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
  const count = `${n} ${n === 1 ? 'set' : 'sets'}`;
  const range = `${volumeRangeText(mev, mrv)} sets a week`;
  const band = volumeBandLabel(status);
  return band ? `${count} · ${band}: ${range}` : `${count} · ${range}`;
}

// Longer-form "why this status" explanation surfaced behind a tap on each
// muscle row. The insight line above is at-a-glance; this body answers
// the "but why?" question with what the band means and the landmark
// numbers for THIS muscle specifically. D204 addendum 3 (lead ruling,
// 2026-09-26): it describes, never instructs; the next-week advice it
// used to carry ("drop a few sets", "hold here", "add a couple of sets")
// is the plan's job, not a panel's.
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
    ? ' These targets have been adjusted from how your earlier blocks went.'
    : source === 'manual'
      ? ' These are your own volume targets, exactly as you set them.'
      : source === 'plan'
        ? ' This target is what your plan programmes for this muscle each week.'
        : source === 'profile'
          ? ' These targets are matched to your training experience, recovery, phase and age.'
          : ' These targets are research-based starting points.';
  if (status === 'optimal') {
    return `${name}'s range is ${mev} to ${mrv} sets a week, and you landed inside it. Inside the range, progress comes mostly from reps and weight going up, not from more sets.${closing}`;
  }
  if (status === 'minimum') {
    return `You're right at the minimum for ${name}. ${mev} sets a week is enough to grow, but only just: the range runs from here up to ${mrv}.${closing}`;
  }
  if (status === 'below') {
    return `Below ${mev} sets a week, the point where research starts to show reliable growth for ${name}.${closing}`;
  }
  if (status === 'near_mrv') {
    return `Close to the most weekly sets ${name} can recover from (${mrv} sets a week). Past this, recovery costs start to outweigh the gains. Reps still climbing from session to session are a sign the load is being handled well.${closing}`;
  }
  if (status === 'over_mrv') {
    // D214 addendum 9 (census W7): the one reading on both screens. The Volume
    // heatmap's legend says "Too much" means past the point of extra benefit, not
    // dangerous; this line used to claim soreness, performance drops and joint
    // aches "usually follow", the opposite claim for the same band. It names no
    // figure, so it cannot disagree with the band beside it (the insight line on
    // the same row quotes the range).
    return `Past the most sets this muscle can recover from in a week: more sets now add fatigue, not growth.${closing}`;
  }
  return null;
}
