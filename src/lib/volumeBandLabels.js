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

import { WEEKLY_BANDS } from './plan/science';

export const VOLUME_BAND_LABELS = Object.freeze({
  below_maintenance: 'Too few to hold size',
  maintenance: 'Holds your size',
  between: 'Holds size, some growth',
  normal_growth: 'Usual range for growth',
  focus_range: 'Higher range for a focus',
  above_normal: 'Above the usual range',
  top_of_studied: 'Close to the upper limit',
  beyond_studied: 'More than needed',
});

// Item 14: four words that appear in NO group label above, so a word never
// means two things (a list's "Holds size, some growth" is 6 to 10 sets only; the
// legend's old tone word of the same name was 2 to 10).
export const VOLUME_TONE_LABELS = Object.freeze({
  below: 'Low',
  building: 'Steady',
  growth: 'Growing',
  beyond: 'Very high',
});

/**
 * The set ranges behind the tables, read from the one band table
 * (plan/science.js WEEKLY_BANDS) so no screen types them by hand.
 */
const B = WEEKLY_BANDS;
export const VOLUME_GROUP_RANGES = Object.freeze({
  below_maintenance: `under ${B.maintenanceFrom} sets a week`,
  maintenance: `${B.maintenanceFrom} to ${B.maintenanceTop} sets`,
  between: `${B.maintenanceTop} to ${B.normalFrom} sets`,
  normal_growth: `${B.normalFrom} to ${B.normalTop} sets`,
  focus_range: `${B.normalTop} to ${B.focusTop} sets, for a muscle you picked to bring up in your plan`,
  above_normal: `${B.normalTop} to ${B.focusTop} sets, for a muscle your plan did not raise`,
  top_of_studied: `${B.focusTop} to ${B.studiedTop} sets`,
  beyond_studied: `over ${B.studiedTop} sets`,
});

/** The eight group lines, "Label: range", in list order (the (i) behind a list). */
export function volumeGroupLines() {
  return Object.keys(VOLUME_BAND_LABELS)
    .map((g) => `${VOLUME_BAND_LABELS[g]}: ${VOLUME_GROUP_RANGES[g]}`)
    .join('\n');
}

/** The one sentence that names the four colours and what each folds. */
export function volumeToneLine() {
  const L = VOLUME_TONE_LABELS;
  return `The colours are ${L.below} (under ${B.maintenanceFrom} sets), ${L.building} (${B.maintenanceFrom} to ${B.normalFrom}), `
    + `${L.growth} (${B.normalFrom} to ${B.studiedTop}) and ${L.beyond} (over ${B.studiedTop}).`;
}

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
