/**
 * campaign8.manualIntent.test.js — Work 3 (RA6-6).
 *
 * Explicit manual intent is recorded, never inferred from the number.
 */
const { isManualEdit, mergeLandmarkPrecedence } = require('../effectiveLandmarks');

const research = { chest: { mv: 4, mev: 6, mav: 14, mrv: 22 } };

describe('explicit manual intent (RA6-6)', () => {
  test('a deliberate save AT the research value counts as the user\'s own setting', () => {
    const entry = { mev: 6, mav: 14, mrv: 22, explicit: true };
    expect(isManualEdit(entry, research.chest)).toBe(true);
    const { source, table } = mergeLandmarkPrecedence({ manual: { chest: entry }, research });
    expect(source.chest).toBe('manual');
    expect(table.chest).toMatchObject({ mev: 6, mav: 14, mrv: 22 });
  });

  test('an untouched legacy default is still NOT intent (the Stage 6 blocker stays closed)', () => {
    const entry = { mev: 6, mav: 14, mrv: 22 }; // no flag: legacy blob
    expect(isManualEdit(entry, research.chest)).toBe(false);
    expect(mergeLandmarkPrecedence({ manual: { chest: entry }, research }).source.chest).toBe('research');
  });

  test('a changed value is intent with or without the flag (legacy behaviour intact)', () => {
    expect(isManualEdit({ mev: 8, mav: 14, mrv: 22 }, research.chest)).toBe(true);
    expect(isManualEdit({ mev: 8, mav: 14, mrv: 22, explicit: true }, research.chest)).toBe(true);
  });

  test('explicit intent outranks the adapted layer, and still teaches nothing', () => {
    const { source } = mergeLandmarkPrecedence({
      manual: { chest: { mev: 6, mav: 14, mrv: 22, explicit: true } },
      adapted: { chest: { mev: 7, mav: 15, mrv: 23, isAdapted: true } },
      research,
    });
    expect(source.chest).toBe('manual'); // manual wins
  });

  test('intent is never inferred from the number alone', () => {
    // Same numbers, opposite verdicts - only the recorded flag differs.
    const withFlag = { mev: 6, mav: 14, mrv: 22, explicit: true };
    const without = { mev: 6, mav: 14, mrv: 22 };
    expect(isManualEdit(withFlag, research.chest)).not.toBe(isManualEdit(without, research.chest));
  });
});

describe('the editor records intent only for muscles it actually touched', () => {
  const SRC = require('fs').readFileSync(require('path').resolve(__dirname, '../../screens/VolumeHeatmapScreen.js'), 'utf8');

  test('opening the editor and saving does not mark every muscle manual', () => {
    // The save keeps a muscle only when it differs, was touched, or was
    // already explicit - never the whole table.
    expect(SRC).toMatch(/if \(differs \|\| touched \|\| wasExplicit\)/);
    expect(SRC).toMatch(/touchedMusclesRef\.current\.add\(muscle\)/);
  });

  test('reset clears recorded intent', () => {
    expect(SRC).toMatch(/touchedMusclesRef\.current = new Set\(\); \/\/ C8 RA6-6: reset clears intent/);
  });

  // Review D4: an abandoned edit is not intent. Without this, typing into
  // a muscle then cancelling, then saving a DIFFERENT muscle later in the
  // same visit, stamped the abandoned one as an explicit manual override -
  // permanent, suppression-proof, and it disables adaptive learning for
  // that muscle.
  test('cancel discards both the typed values and the recorded intent', () => {
    const cancel = SRC.slice(SRC.indexOf("title=\"Cancel\""), SRC.indexOf("title=\"Save\""));
    expect(cancel).toMatch(/touchedMusclesRef\.current = new Set\(\);/);
    expect(cancel).toMatch(/setEditValues\(buildEditValues\(customLandmarks\)\)/);
    expect(cancel).toMatch(/setEditing\(false\)/);
  });
});
