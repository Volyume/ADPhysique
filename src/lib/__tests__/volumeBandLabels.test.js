/**
 * volumeBandLabels: the ONE display map from the engine's volume status to the
 * word a person reads (register D214 addendum 9, census 0.24 and W4).
 *
 * `getVolumeStatus` (algorithms.js) returns a status key with a label of its
 * own, "Below target", "Good range", "Getting close". Two screens showed a band
 * in two vocabularies: the Volume heatmap said Under the range, Just enough, In
 * range, Near the limit, Too much, and the Workout Summary's badges said the
 * engine's three older words plus a colour tooltip in a third. The engine is on
 * the do-not-touch list, so the words are mapped at the display site through
 * ONE map keyed by the status value. This suite pins:
 *   - the five words, and that every status the engine can return has one (the
 *     real statuses are driven out of getVolumeStatus, so a sixth status added
 *     to the engine fails here rather than printing the engine's own label);
 *   - the engine's return values are untouched (this lane never edits them);
 *   - the figure's own legend names the same five words, so a drift between the
 *     legend and the map fails here;
 *   - the range is put into words one way: "6 to 22", and "up to 14" for a
 *     muscle with no lower bound, never "0 to 14".
 */
import fs from 'fs';
import path from 'path';
import { VOLUME_BAND_LABELS, volumeBandLabel, volumeRangeText } from '../volumeBandLabels';
import { getVolumeStatus } from '../algorithms';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

describe('the five words, keyed by the engine\'s status value', () => {
  test('Under the range, Just enough, In range, Near the limit, Too much', () => {
    expect(VOLUME_BAND_LABELS).toEqual({
      below: 'Under the range',
      minimum: 'Just enough',
      optimal: 'In range',
      near_mrv: 'Near the limit',
      over_mrv: 'Too much',
    });
    expect(Object.isFrozen(VOLUME_BAND_LABELS)).toBe(true);
  });

  test('every status getVolumeStatus can return has a word, drawn from the real engine', () => {
    const statuses = [
      getVolumeStatus(0, 'chest').status, // below
      getVolumeStatus(3, 'chest').status, // below
      getVolumeStatus(7, 'chest').status, // minimum
      getVolumeStatus(12, 'chest').status, // optimal
      getVolumeStatus(20, 'chest').status, // near_mrv
      getVolumeStatus(30, 'chest').status, // over_mrv
    ];
    expect(new Set(statuses)).toEqual(new Set(['below', 'minimum', 'optimal', 'near_mrv', 'over_mrv']));
    for (const status of statuses) expect(volumeBandLabel(status)).toBe(VOLUME_BAND_LABELS[status]);
  });

  test('the engine\'s own labels are not the words a person reads (and the engine is unchanged)', () => {
    expect(getVolumeStatus(3, 'chest').label).toBe('Below target');
    expect(getVolumeStatus(12, 'chest').label).toBe('Good range');
    expect(getVolumeStatus(20, 'chest').label).toBe('Getting close');
    expect(getVolumeStatus(7, 'chest').label).toBe('Just enough');
    expect(getVolumeStatus(30, 'chest').label).toBe('Too much');
    for (const [status, set] of [['below', 3], ['optimal', 12], ['near_mrv', 20]]) {
      expect(volumeBandLabel(status)).not.toBe(getVolumeStatus(set, 'chest').label);
    }
  });

  test('a status with no word falls back to what the caller passes, never to a prototype property', () => {
    const unknown = getVolumeStatus(5, 'not_a_muscle');
    expect(unknown.status).toBe('unknown');
    expect(volumeBandLabel(unknown.status, unknown.label)).toBe('No data');
    expect(volumeBandLabel('unknown')).toBe('');
    expect(volumeBandLabel('constructor', 'x')).toBe('x');
    expect(volumeBandLabel('toString')).toBe('');
    expect(volumeBandLabel(undefined, 'fallback')).toBe('fallback');
  });
});

describe('the figure\'s own legend names the same five words', () => {
  test('BodyDiagramHeatmap.js: every word of the map is a legend label, and the legend keeps "No sets"', () => {
    const legend = read('components/BodyDiagramHeatmap.js');
    for (const word of Object.values(VOLUME_BAND_LABELS)) expect(legend).toContain(`label: '${word}'`);
    expect(legend).toContain("label: 'No sets'");
  });

  test('the old vocabulary is on no surface that reads a status (the Volume heatmap and the Workout Summary volume rows)', () => {
    const heatmap = read('screens/VolumeHeatmapScreen.js');
    for (const old of ['Below target', 'Good range', 'Getting close']) expect(heatmap).not.toContain(old);
    const summary = read('screens/WorkoutSummaryScreen.js');
    const section = summary.slice(summary.indexOf('musclesWorked.length > 0 && ('), summary.indexOf('COMP-005 + D2: block-end recap'));
    expect(section.length).toBeGreaterThan(2000);
    for (const old of ['Below target', 'Good range', 'Getting close']) expect(section).not.toContain(old);
  });
});

describe('the range, in words, one way (D214 addendum 1: the range means one thing on every surface)', () => {
  test('"6 to 22", and "up to 14" for a muscle with no lower bound, never "0 to 14"', () => {
    expect(volumeRangeText(6, 22)).toBe('6 to 22');
    expect(volumeRangeText(0, 14)).toBe('up to 14');
    expect(volumeRangeText('0', '14')).toBe('up to 14');
    expect(volumeRangeText(undefined, 14)).toBe('up to 14');
    expect(volumeRangeText(1, 14)).toBe('1 to 14');
  });
});
