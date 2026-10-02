/**
 * volumeBandLabels.js: the ONE display map from the engine's volume status to
 * the word a person reads (register D214 addendum 9, census 0.24 and W4).
 *
 * `getVolumeStatus` (algorithms.js, the deterministic engine, never edited
 * here) returns a status key with a label of its own ("Below target", "Good
 * range", "Getting close"). No surface prints those labels any more: the Volume
 * heatmap's rows and the Workout Summary's badges and tooltip say the same five
 * words, so one band is one word on every screen. This map is keyed by the
 * status value and is the only place those five words are written for the two
 * screens that read a status; the figure's own legend (BodyDiagramHeatmap.js)
 * names the same words and volumeBandLabels.test.js holds the two equal.
 *
 * Also here: the one way a muscle's range is put into words, so the heatmap
 * rows and the Workout Summary lines never disagree about it.
 *
 * Pure. No React, no I/O.
 */

export const VOLUME_BAND_LABELS = Object.freeze({
  below: 'Under the range',
  minimum: 'Just enough',
  optimal: 'In range',
  near_mrv: 'Near the limit',
  over_mrv: 'Too much',
});

/**
 * The display word for an engine status. `fallback` is returned for a status
 * the map has no word for (the engine's 'unknown', a muscle with no range).
 *
 * @param {string} status  a `getVolumeStatus().status` value
 * @param {string} [fallback]
 * @returns {string}
 */
export function volumeBandLabel(status, fallback = '') {
  return Object.prototype.hasOwnProperty.call(VOLUME_BAND_LABELS, status)
    ? VOLUME_BAND_LABELS[status]
    : fallback;
}

/**
 * A muscle's weekly range in words: "6 to 22", or "up to 14" for a muscle whose
 * range has no lower bound (a range that starts at 0 never reads "0 to 14").
 * The range means one thing on every surface (D214 addendum 1): from the fewest
 * weekly sets that still help the muscle grow to the most it can recover from.
 *
 * @param {number} mev  the fewest weekly sets that still help it grow
 * @param {number} mrv  the most weekly sets it can recover from
 * @returns {string}
 */
export function volumeRangeText(mev, mrv) {
  return (Number(mev) || 0) > 0 ? `${mev} to ${mrv}` : `up to ${mrv}`;
}
