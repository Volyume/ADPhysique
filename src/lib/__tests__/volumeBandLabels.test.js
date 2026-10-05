/**
 * volumeBandLabels: the ONE display map from a muscle's weekly-set band to the
 * words a person reads (register D214 addendum 9, census 0.24 and W4; D219
 * lane A5, design 5.3).
 *
 * RE-PINNED under D219 (design 5.3, "Too much retired"): the map used to be keyed
 * by the engine's landmark status and held five words, "Under the range", "Just
 * enough", "In range", "Near the limit" and "Too much". Those judged a number
 * against a table that knew nothing of the plan, so 27 weekly sets on a muscle
 * the person picked to bring up read as a fault. The map is now keyed by the
 * eight groups of volumeJudgement.js (a band, with the focus range split by the
 * muscle's role) and a second table names the four tones the figure, its legend
 * and the Progress strip paint. This suite pins:
 *   - the eight group words and the four tone words, frozen;
 *   - every group volumeJudgement can return has a word, driven out of the real
 *     judgement over a sweep of totals and roles (a ninth group added there
 *     fails here rather than printing nothing);
 *   - no word is one of the retired five, says "too much" or carries an em dash;
 *   - the figure's own legend names the same four tones, so a drift between the
 *     legend and the map fails here;
 *   - a group with no word falls back to what the caller passes, never to a
 *     prototype property.
 */
import fs from 'fs';
import path from 'path';
import { VOLUME_BAND_LABELS, VOLUME_TONE_LABELS, volumeBandLabel } from '../volumeBandLabels';
import { judgeWeek, GROUP_ORDER, TONE } from '../volumeJudgement';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');
/** Source with block and line comments removed: a header that names a retired word to disclaim it is not a surface. */
const codeOnly = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('the eight group words and the four tone words', () => {
  test('the group words, in the order a list reads them', () => {
    expect(VOLUME_BAND_LABELS).toEqual({
      below_maintenance: 'Below maintenance',
      maintenance: 'Maintenance range',
      between: 'Between maintenance and growth',
      normal_growth: 'Normal growth range',
      focus_range: 'Focus range',
      above_normal: 'Above normal growth',
      top_of_studied: 'Top of the studied range',
      beyond_studied: 'Beyond the studied range',
    });
    expect(Object.keys(VOLUME_BAND_LABELS)).toEqual([...GROUP_ORDER]);
    expect(Object.isFrozen(VOLUME_BAND_LABELS)).toBe(true);
  });

  test('the tone words', () => {
    expect(VOLUME_TONE_LABELS).toEqual({
      below: 'Below maintenance',
      building: 'Maintenance to growth',
      growth: 'Growth range',
      beyond: 'Beyond the studied range',
    });
    expect(Object.keys(VOLUME_TONE_LABELS).sort()).toEqual(Object.values(TONE).sort());
    expect(Object.isFrozen(VOLUME_TONE_LABELS)).toBe(true);
  });

  test('every group the real judgement can return has a word and a tone word', () => {
    const groups = new Set();
    for (const role of ['focus', 'raised', 'standard', 'maintenance']) {
      for (const sets of [0, 1, 4, 8, 14, 22, 27, 35, 50]) {
        const j = judgeWeek({ muscle: 'chest', sets, role });
        groups.add(j.group);
        expect(volumeBandLabel(j.group)).toBe(VOLUME_BAND_LABELS[j.group]);
        expect(j.label).toBe(VOLUME_BAND_LABELS[j.group]);
        expect(j.toneLabel).toBe(VOLUME_TONE_LABELS[j.tone]);
      }
    }
    expect(groups).toEqual(new Set(GROUP_ORDER));
  });

  test('none of the retired five words, and no "too much", "limit" or em dash, is on the map', () => {
    for (const text of [...Object.values(VOLUME_BAND_LABELS), ...Object.values(VOLUME_TONE_LABELS)]) {
      expect(text).not.toMatch(/Under the range|Just enough|In range|Near the limit|too much|overtrain|junk/i);
      expect(text).not.toContain('—');
    }
  });

  test('a group with no word falls back to what the caller passes, never to a prototype property', () => {
    expect(volumeBandLabel('unknown')).toBe('');
    expect(volumeBandLabel('unknown', 'No data')).toBe('No data');
    expect(volumeBandLabel('constructor', 'x')).toBe('x');
    expect(volumeBandLabel('toString')).toBe('');
    expect(volumeBandLabel(undefined, 'fallback')).toBe('fallback');
  });
});

describe("the figure's own legend names the same four tones", () => {
  test('BodyDiagramHeatmap.js reads the tone words from the map and keeps "No sets"', () => {
    const legend = read('components/BodyDiagramHeatmap.js');
    for (const tone of Object.values(TONE)) expect(legend).toContain(`VOLUME_TONE_LABELS[TONE.${tone.toUpperCase()}]`);
    expect(legend).toContain("label: 'No sets'");
  });

  test('the old engine vocabulary is on no surface that reads a band (the Volume heatmap and the Workout Summary volume rows)', () => {
    const heatmap = codeOnly(read('screens/VolumeHeatmapScreen.js'));
    for (const old of ['Below target', 'Good range', 'Getting close', 'Near the limit']) expect(heatmap).not.toContain(old);
    const summary = read('screens/WorkoutSummaryScreen.js');
    const section = codeOnly(summary.slice(summary.indexOf('musclesWorked.length > 0 && ('), summary.indexOf('COMP-005 + D2: block-end recap')));
    expect(section.length).toBeGreaterThan(2000);
    for (const old of ['Below target', 'Good range', 'Getting close', 'Near the limit']) expect(section).not.toContain(old);
  });
});
