/**
 * trendInBand.js -- D226 review fix: whether a week's weight trend was truly
 * inside its phase's band. `trend.onTarget` is the coach's DECISION read (a
 * gain-phase settling week or a gain inside the allowed ceiling counts as on
 * target, so calories are not trimmed); what the person is TOLD ("spot on",
 * "Nth week running at the right rate", share cards, the outcome verdicts)
 * reads the band itself. Outputs saved before `inBand` existed fall back to
 * `onTarget`, which then meant the same thing.
 */
export function trendInBand(trend) {
  if (typeof trend?.inBand === 'boolean') return trend.inBand;
  return trend?.onTarget === true;
}
