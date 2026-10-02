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
  const between = (from, to) => SRC.slice(SRC.indexOf(from), SRC.indexOf(to, SRC.indexOf(from)));

  // RE-ANCHORED D214 (Progress elevation, plan section 7.4 item 7; register
  // D214 ruling 5): the editor now seeds each field with the band IN FORCE
  // (plan, adjusted, profile or research), so a muscle that differs from the
  // RESEARCH table is no longer evidence of an edit, and the old "differs from
  // research" clause would have written every plan-banded muscle as manual
  // (the Stage 6 blocker). The save compares against the SEEDED value, and an
  // untouched muscle is never written.
  test('opening the editor and saving does not mark every muscle manual', () => {
    const save = between('async function saveLandmarks', '// C14 job 7 (RA6-6): a muscle is Volyume-managed');
    expect(save).toMatch(/const changedFromSeed = !!seeded/);
    expect(save).toMatch(/if \(touched \|\| changedFromSeed\)/);
    expect(SRC).toMatch(/touchedMusclesRef\.current\.add\(muscle\)/);
    // The research table is never the comparison any more.
    expect(save).not.toMatch(/entry\.mev !== research|research\.mev|const differs/);
  });

  test('reset clears recorded intent', () => {
    const reset = between('function resetToVolyumeTargets', '// ScrollView + per-row offsets');
    expect(reset).toMatch(/touchedMusclesRef\.current = new Set\(\);/);
  });

  // Review D4: an abandoned edit is not intent. Without this, typing into
  // a muscle then cancelling, then saving a DIFFERENT muscle later in the
  // same visit, stamped the abandoned one as an explicit manual override -
  // permanent, suppression-proof, and it disables adaptive learning for
  // that muscle. (RE-ANCHORED D214: cancel is cancelEditing(); the typed
  // values are discarded by re-seeding on the next open, not by a rebuild.)
  test('cancel discards both the typed values and the recorded intent', () => {
    const cancel = between('function cancelEditing', 'async function saveLandmarks');
    expect(cancel).toMatch(/touchedMusclesRef\.current = new Set\(\);/);
    expect(cancel).toMatch(/setEditing\(false\)/);
    const open = between('function openEditor', 'function cancelEditing');
    expect(open).toMatch(/touchedMusclesRef\.current = new Set\(\);/);
    expect(open).toMatch(/editSeedRef\.current = seed;/);
  });
});
