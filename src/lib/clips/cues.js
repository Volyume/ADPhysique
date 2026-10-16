/**
 * cues - the countdown and end cues for a phone propped away from the lifter,
 * and the lens pick (D229 addendum 13, A and E; the research in
 * docs/audit/video-shares-2026-10-15/06-SET-LENGTH-AND-CUES-RESEARCH.md,
 * sections 4 and 7).
 *
 * Pure: no timers, no audio, no camera. The screen reads these and acts.
 *
 * The cadence: one cue a second at most, never a burst, so the light stays
 * far under the three flashes a second that WCAG 2.3.1 and the Ofcom guidance
 * set, and below the 3 Hz floor of the sensitive range the Epilepsy Action
 * guidance names. A torch pulse is 200 ms; no pulse at zero, so the torch is
 * off well before the first frame (the exposure settles).
 */

/** A torch or screen pulse, in milliseconds. */
export const PULSE_MS = 200;

/** The end cue after a recording that stopped by reaching its length: two
 *  pulses this far apart, and two descending pips on the same beats. */
export const END_PULSE_GAP_MS = 300;

/** The beat at the start itself (zero): sound only, the longer tone. */
export const START_SOUND = 'go';

/**
 * The seconds-remaining at which the light pulses for a countdown of
 * `leadInSeconds`: the final three, plus the countdown's own first second and
 * every multiple of five above three (20, 15, 10, 5), so a long countdown
 * says "I have started" and marks its quarters. Ascending order of time
 * remaining is not needed by the caller; the set is what matters.
 */
export function lightBeats(leadInSeconds) {
  const n = Math.max(0, Math.floor(Number(leadInSeconds) || 0));
  const beats = new Set();
  for (const s of [3, 2, 1]) if (s <= n) beats.add(s);
  for (let s = 5; s <= n; s += 5) beats.add(s);
  if (n > 3) beats.add(n);
  return beats;
}

/**
 * The cue for `secondsLeft` in a countdown of `leadInSeconds`:
 *   sound: 'three' | 'two' | 'one' | 'go' | null (the rest timer's own pips),
 *   light: true when the torch or screen pulses on this beat.
 * Zero is the start: the longer tone, and no light (the torch must be off
 * before the first frame).
 */
export function cueFor(secondsLeft, leadInSeconds) {
  const s = Math.floor(Number(secondsLeft));
  if (!Number.isFinite(s) || s < 0) return { sound: null, light: false };
  if (s === 0) return { sound: START_SOUND, light: false };
  const sound = s === 3 ? 'three' : s === 2 ? 'two' : s === 1 ? 'one' : null;
  return { sound, light: lightBeats(leadInSeconds).has(s) };
}

/**
 * The lenses the View control offers, from the names the camera reports
 * (iOS only; Android reports none). `wide` is the first name that says
 * "ultra wide" (case-insensitive); `normal` is the plain back camera: a name
 * that is exactly "Back Camera" if present, else the first back-facing name
 * that is not ultra wide, telephoto, dual, triple or a depth camera. Either
 * is null when nothing matches, and the control is only shown with both.
 */
export function pickLenses(names) {
  const list = Array.isArray(names) ? names.filter((n) => typeof n === 'string' && n.trim()) : [];
  const wide = list.find((n) => /ultra\s*wide/i.test(n)) || null;
  const exact = list.find((n) => /^back camera$/i.test(n.trim()));
  const plain = list.find((n) => !/ultra\s*wide|telephoto|dual|triple|front|true\s*depth|depth/i.test(n));
  const normal = exact || plain || null;
  return { normal, wide };
}
