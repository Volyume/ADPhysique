/**
 * CC33 rounds 13-15 (J2) - ONE guard for the lane's enumerated touch
 * targets, after three rounds each found another sub-48 control on a
 * capability surface with no pin behind the previous round's fix
 * (round 13 tokenised TrainingConsiderations' four 44s, round 14 the
 * picker's createNewBtn and "Allow again", round 15 the picker's
 * show-anyway/set-aside toggles - the only route to what the user's
 * rules removed, at ~39dp effective).
 *
 * Two assertions per surface, per the styling law
 * (docs/rules/styling.md: every interactive element >=48dp effective;
 * off-scale literals are drift):
 *  1. each ENUMERATED interactive style carries minHeight: spacing.xxxl;
 *  2. the file introduces no NEW sub-48 numeric minHeight (a numeric
 *     minHeight >= 48 is compliant-but-off-scale and is allowed only if
 *     it already exists - the allowlist below names today's two, so a
 *     new one fails loudly).
 *
 * Coverage is by enumeration, stated on the J2 row - a control not
 * listed here is not guarded by this file.
 */
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

// Per style: [name, exact count of `styles.<name>` APPLICATION sites].
// Round 18 (I6): the round-17 guard pinned style DEFINITIONS only -
// deleting `style={styles.actionBtn}` from a button while leaving the
// style block passed it. Definitions inside StyleSheet.create read
// `name: {`; applications read `styles.name` - so an exact count of the
// latter pins that every enumerated floor actually reaches its
// control, and a deleted (or duplicated) application fails loudly.
const ENUMERATED = [
  ['components/ExercisePickerModal.js', [['pickerAllowAgainBtn', 1], ['createNewBtn', 1], ['showExcludedRow', 2], ['createSaveBtn', 1]]],
  ['screens/TrainingConsiderationsScreen.js', [['search', 1], ['row', 1], ['card', 2], ['backRow', 1]]],
  // Round 17 (J2): the install-conflict sheet's three sm buttons were
  // ~34dp effective (padding-sized, no hitSlop - invisible to the
  // numeric-minHeight strays check, stated on the row). Round 18: the
  // md primary ("Done"/"Finish later") was ~46dp - the fourth button on
  // the same sheet, missed by the same round that floored the other
  // three.
  ['components/ExerciseConflictSheet.js', [['actionBtn', 3], ['doneBtn', 1]]],
];

// Numeric minHeights that pre-date this guard and sit at or above 48:
// compliant, off-scale, tolerated - at their EXACT current count, so a
// copied duplicate of an allowlisted value fails as loudly as a new
// number (round 16: the value-only allowlist would have passed any
// number of copied 54s).
const OFF_SCALE_ALLOWED = {
  'components/ExercisePickerModal.js': { 'minHeight: 54': 1 },
  'screens/TrainingConsiderationsScreen.js': {},
  'components/ExerciseConflictSheet.js': {},
};

describe('J2: the lane\'s enumerated touch targets sit on the 48 token', () => {
  test.each(ENUMERATED)('%s', (rel, styleNames) => {
    const src = read(rel);
    for (const [name, applications] of styleNames) {
      // A style can be defined twice (static sheet + live-theme
      // override, e.g. createNewBtn); the geometry lives in whichever
      // block carries minHeight, so at least one must be on the token.
      const sites = [];
      let at = src.indexOf(`${name}: {`);
      while (at !== -1) { sites.push(at); at = src.indexOf(`${name}: {`, at + 1); }
      expect({ file: rel, style: name, found: sites.length > 0 }).toEqual({ file: rel, style: name, found: true });
      const onToken = sites.some((site) => src.slice(site, src.indexOf('},', site)).includes('minHeight: spacing.xxxl'));
      expect({ file: rel, style: name, onToken }).toEqual({ file: rel, style: name, onToken: true });
      // Round 18 (I6): the floor must REACH its controls - exact
      // application count, so a dropped `style={styles.X}` fails.
      const applied = (src.match(new RegExp(`styles\\.${name}\\b`, 'g')) ?? []).length;
      expect({ file: rel, style: name, applied }).toEqual({ file: rel, style: name, applied: applications });
    }
    const numeric = src.match(/minHeight: \d+/g) ?? [];
    const allowed = OFF_SCALE_ALLOWED[rel] ?? {};
    const counts = {};
    for (const m of numeric) counts[m] = (counts[m] || 0) + 1;
    expect({ file: rel, counts }).toEqual({ file: rel, counts: allowed });
  });
});
