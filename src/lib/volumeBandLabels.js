/**
 * volumeBandLabels.js: the ONE display map from a muscle's weekly-set band to
 * the words a person reads (register D214 addendum 9 for the single map;
 * D219 lane A5, design 5.3 for the bands).
 *
 * D219 retired the five words the old engine status carried ("Under the
 * range", "Just enough", "In range", "Near the limit", "Too much"): they were
 * judged against a landmark table that ignored the plan's own intent, so 27
 * weekly sets on a muscle the person picked to bring up read as a fault. The
 * words below name the evidence bands the one band function returns
 * (src/lib/plan/bands.js; Pelland's tiers, 03-SCIENCE.md Q3b), and a muscle
 * the plan did not raise reads "Above normal growth" where a focus muscle
 * reads "Focus range". Nothing here says "too much", "near the limit",
 * "overtrained" or "junk" (D204: a screen describes), and no band below
 * "Beyond the studied range" is anything but a plain fact.
 *
 * Two tables, one meaning. `VOLUME_BAND_LABELS` names the eight GROUPS a list
 * can be sorted into (a band, with the focus range split by the muscle's role).
 * `VOLUME_TONE_LABELS` names the four TONES the figure, the legend and the
 * Progress strip paint, which fold the groups by colour. The Volume heatmap's
 * legend, the Workout Summary's badges and the check-in review read these two
 * tables only, and volumeJudgement.test.js holds them to the group and tone
 * lists.
 *
 * Pure. No React, no I/O.
 */

export const VOLUME_BAND_LABELS = Object.freeze({
  below_maintenance: 'Below maintenance',
  maintenance: 'Maintenance range',
  between: 'Between maintenance and growth',
  normal_growth: 'Normal growth range',
  focus_range: 'Focus range',
  above_normal: 'Above normal growth',
  top_of_studied: 'Top of the studied range',
  beyond_studied: 'Beyond the studied range',
});

export const VOLUME_TONE_LABELS = Object.freeze({
  below: 'Below maintenance',
  building: 'Maintenance to growth',
  growth: 'Growth range',
  beyond: 'Beyond the studied range',
});

/**
 * The display words for a group. `fallback` is returned for a group the map has
 * no word for (a muscle with no band).
 *
 * @param {string} group  a volumeJudgement GROUP value
 * @param {string} [fallback]
 * @returns {string}
 */
export function volumeBandLabel(group, fallback = '') {
  return Object.prototype.hasOwnProperty.call(VOLUME_BAND_LABELS, group)
    ? VOLUME_BAND_LABELS[group]
    : fallback;
}
