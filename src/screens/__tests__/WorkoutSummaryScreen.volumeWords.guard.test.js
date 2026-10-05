/**
 * WorkoutSummaryScreen: the volume rows say what the Volume heatmap says
 * (register D214 addendum 9, census W1 to W8, 0.24 and 6.1; D219 lane A5).
 *
 * The Workout Summary's per-muscle volume card and the Volume heatmap describe
 * the same bands, and they used two vocabularies and two opposite claims (D214
 * addendum 9). RE-PINNED under D219 lane A5 (design 5.3, register D219): both now
 * read the ONE judgement every surface that judges a muscle's weekly sets reads
 * (volumeJudgement.judgeWeek: the role-aware band function, the muscle's role
 * from the active plan's facts). The five engine words ("Under the range" to
 * "Too much") and the four "ranges come from" sentences about the landmark table
 * ("your own targets always win") are gone with the landmark verdict: a muscle
 * the plan raised reads inside its focus range, never "Too much". This suite pins,
 * at source level (the screen is far too large to mount, the repo's own
 * convention for it):
 *   - the badge word and the tooltip's band names come from the judgement and its
 *     shared map, with no engine call (`getVolumeStatus`) on the judging card and
 *     no warning or error colour token;
 *   - the tooltip's own lines (W1, W2) and the history reopen's first line (W3);
 *   - the retired "ranges come from" sentences and the retired control's name are
 *     gone, and the tooltip says what the plan's role does;
 *   - British English for the verb, "programmes" (W6), and no em dash.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'WorkoutSummaryScreen.js'), 'utf8');
const SECTION = SRC.slice(SRC.indexOf('musclesWorked.length > 0 && ('), SRC.indexOf('COMP-005 + D2: block-end recap'));
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

describe('the band words come from the one judgement', () => {
  test('the badge prints the judgement\'s word, from the role-aware band function', () => {
    expect(SRC).toMatch(/import \{ judgeWeek, roleFor, toneColors \} from '\.\.\/lib\/volumeJudgement';/);
    expect(SECTION).toContain('{judgement.label}</Text>');
    expect(SECTION).toContain('role: roleFor(planRoles, muscle)');
    // No engine verdict on the judging card, and no warning or error token on a band.
    expect(code(SECTION)).not.toMatch(/getVolumeStatus|buildVolumeStatusColor|volumeBandLabel\(/);
    expect(code(SECTION)).not.toMatch(/colors\.(warning|error)/);
  });

  // RE-ANCHORED 2026-10-02 (closing review S4): the colour words went, because the
  // light and colour-blind-safe themes draw other colours for the same bands.
  test('the tooltip names the bands in words and never a colour, and never "too much"', () => {
    for (const band of ['Below maintenance', 'Maintenance range', 'Normal growth range', 'Focus range', 'Beyond the studied range']) {
      expect(SECTION).toContain(`${band}: `);
    }
    expect(SECTION).not.toMatch(/\b(Green|Yellow|Red|Blue|Grey) = /);
    expect(code(SECTION)).not.toMatch(/Too much|Near the limit|too much/);
  });
});

describe('the tooltip\'s own lines (W1, W2, W3): they describe, and say what the figure is', () => {
  test('the beyond line says the research cannot say what extra sets add (no "consider doing a little less")', () => {
    expect(SECTION).toContain("'Beyond the studied range: over 42 sets, where the research cannot say what extra sets add\\n\\n'");
    expect(SECTION).not.toMatch(/consider doing a little less|next week\\n/);
  });

  test('the focus line says what a focus range is for, and the closing line says what the plan\'s role does', () => {
    expect(SECTION).toContain("'Focus range: 20 to 30 sets, for a muscle you picked to bring up in your plan\\n'");
    expect(SECTION).toContain('A muscle your plan raised reads against its focus range, and one it did not reads as above normal growth from 20 sets.');
    expect(SECTION).not.toMatch(/right at the floor|one or two more sets/);
  });

  test('a history reopen counts sets and claims no "this week"; the live card keeps its sentence', () => {
    expect(SECTION).toContain("readOnly ? 'How many sets you did for each muscle group.' : 'How much you\\'ve trained each muscle group this week.'");
  });
});

describe('the retired "ranges come from" sentences are gone with the landmark verdict', () => {
  test('nothing says the person\'s own targets win, or names a control that does not drive the verdict', () => {
    expect(SRC).not.toContain('Edit volume targets');
    expect(SECTION).not.toMatch(/your own targets always win|set your own under Volume targets|These ranges (start|come|are)/);
    expect(SECTION).not.toMatch(/on the Volume screen|set them by hand|your edits always win/);
  });

  test('the Volume heatmap still has its "Volume targets" door as the last row (the editor is unchanged)', () => {
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
  });

  test('no em dash in the volume card\'s copy', () => {
    expect(code(SECTION)).not.toContain('—');
  });
});
