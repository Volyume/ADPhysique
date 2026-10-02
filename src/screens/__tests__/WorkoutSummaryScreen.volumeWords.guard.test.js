/**
 * WorkoutSummaryScreen: the volume rows say what the Volume heatmap says
 * (register D214 addendum 9, census W1 to W8, 0.24 and 6.1).
 *
 * The Workout Summary's per-muscle volume card and the Volume heatmap describe
 * the same five bands, and they used two vocabularies and two opposite claims:
 * badges in the engine's own words (Good range, Getting close, Below target), a
 * colour tooltip that told the athlete to "consider doing a little less next
 * week" and called the floor "the floor", an over-limit line that promised
 * soreness and joint aches where the heatmap's legend says "not dangerous", a
 * history reopen that said "this week" over a past week, and four sentences
 * naming a control, "Edit volume targets on the Volume screen", that no longer
 * exists under that name. This suite pins, at source level (the screen is far
 * too large to mount, the repo's own convention for it):
 *   - the badge word and the tooltip's band names come from the ONE shared map,
 *     and the destructure `const { label, status } = getVolumeStatus(...)` stays
 *     byte-identical (campaign5.firstUse.test.js pins it; the label is only the
 *     fallback for a status with no word);
 *   - the tooltip's own lines (W1, W2) and the history reopen's first line (W3);
 *   - the four ranges-come-from sentences, verbatim from the census (6.1), each
 *     naming where the control is and never telling anyone to use it;
 *   - British English for the verb, "programmes" (W6), and no em dash.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'WorkoutSummaryScreen.js'), 'utf8');
const SECTION = SRC.slice(SRC.indexOf('musclesWorked.length > 0 && ('), SRC.indexOf('COMP-005 + D2: block-end recap'));
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

describe('the band words come from the one shared map', () => {
  test('the badge prints the mapped word, with the engine\'s label only as the fallback', () => {
    expect(SRC).toMatch(/import \{ volumeBandLabel \} from '\.\.\/lib\/volumeBandLabels';/);
    expect(SECTION).toContain('{volumeBandLabel(status, label)}</Text>');
    // The engine call is untouched, byte for byte (campaign5.firstUse.test.js pins the same line).
    expect(SECTION).toContain('const { label, status } = getVolumeStatus(data.workingSets, muscle, landmarkResolution?.table);');
  });

  // RE-ANCHORED 2026-10-02 (closing review S4): the colour words went, because the
  // light and colour-blind-safe themes draw other colours for the same bands.
  test('the tooltip names the five bands through the map and never a colour', () => {
    for (const key of ['optimal', 'near_mrv', 'over_mrv', 'minimum', 'below']) {
      expect(SECTION).toContain(`\`\${volumeBandLabel('${key}')}: `);
    }
    expect(SECTION).not.toMatch(/\b(Green|Yellow|Red|Blue|Grey) = /);
  });
});

describe('the tooltip\'s own lines (W1, W2, W3): they describe, and say what the figure is', () => {
  test('Red: past the most sets the muscle can recover from in a week (no "consider doing a little less")', () => {
    expect(SECTION).toContain("${volumeBandLabel('over_mrv')}: past the most sets the muscle can recover from in a week\\n");
    expect(SECTION).not.toMatch(/consider doing a little less|next week\\n/);
  });

  test('Blue: at the bottom of the range, enough to grow but only just (no "the floor")', () => {
    expect(SECTION).toContain("${volumeBandLabel('minimum')}: at the bottom of the range, enough to grow but only just\\n");
    expect(SECTION).not.toMatch(/right at the floor|one or two more sets/);
  });

  test('a history reopen counts sets and claims no "this week"; the live card keeps its sentence', () => {
    expect(SECTION).toContain("readOnly ? 'How many sets you did for each muscle group.' : 'How much you\\'ve trained each muscle group this week.'");
  });
});

describe('the four "ranges come from" sentences name where the control is (W5, census 6.1, verbatim)', () => {
  const CONTROL = 'You can set your own under Volume targets, the last row of the Volume heatmap';
  const SENTENCES = [
    `These ranges start from your plan and your profile and, for muscles with enough logged data, have adjusted to your own response. ${CONTROL}; your own targets always win.`,
    `These ranges come from what your plan programmes each week, inside the range your experience, recovery, phase and age support. ${CONTROL}; your own targets always win.`,
    'These ranges are matched to your training experience, recovery, phase and age. Once a plan programmes a muscle they follow what it aims at, and you can set your own under Volume targets, the last row of the Volume heatmap.',
    'These ranges are research-based starting points. Once you have finished blocks behind you they adjust from how those went, and you can set your own under Volume targets, the last row of the Volume heatmap.',
  ];

  test('each sentence is in the source exactly as ruled', () => {
    for (const sentence of SENTENCES) expect(SECTION).toContain(`return '${sentence}';`);
  });

  test('no sentence names the retired control, and none tells anyone to use it', () => {
    expect(SRC).not.toContain('Edit volume targets');
    expect(SECTION).not.toMatch(/on the Volume screen|set them by hand|your edits always win/);
  });

  test('the control is where the sentences say: the heatmap\'s last row is "Volume targets"', () => {
    const heatmap = fs.readFileSync(path.resolve(__dirname, '..', 'VolumeHeatmapScreen.js'), 'utf8');
    expect(heatmap).toContain('label="Volume targets"');
    // Nothing follows the door inside the scroll content: it is the last row.
    const door = heatmap.indexOf('label="Volume targets"');
    expect(heatmap.slice(door, heatmap.indexOf('</ScrollView>', door))).not.toMatch(/<(NavRow|Card|Text)\b[^>]*>\s*[A-Z]/);
  });
});

describe('British English and the house rules', () => {
  test('"programmes" for the verb: no "programs" in the volume card', () => {
    expect(code(SECTION)).not.toMatch(/\bprograms\b/);
    expect(SECTION).toContain('what your plan programmes each week');
  });

  test('no em dash in the volume card\'s copy', () => {
    expect(code(SECTION)).not.toContain('—');
  });
});
