/**
 * campaign8.manualIntent.test.js — Work 3 (RA6-6).
 *
 * Explicit manual intent is recorded, never inferred from the number.
 *
 * RE-PINNED 2026-10-05 (D219, founder answer "Remove the editor"): the pure
 * predicate isManualEdit keeps its meaning and its pins here, but no stored entry
 * is read any more, so nothing it calls "manual" reaches the landmark merge, and
 * the editor that recorded intent is gone. Each changed test says so below.
 */
const { isManualEdit, mergeLandmarkPrecedence } = require('../effectiveLandmarks');

const research = { chest: { mv: 4, mev: 6, mav: 14, mrv: 22 } };

describe('explicit manual intent (RA6-6)', () => {
  test('a deliberate save AT the research value is still recorded as intent by the predicate, and no longer reaches the merge', () => {
    const entry = { mev: 6, mav: 14, mrv: 22, explicit: true };
    expect(isManualEdit(entry, research.chest)).toBe(true);
    // RE-PINNED: the merge used to report this as source 'manual'; the manual layer is retired.
    const { source, table } = mergeLandmarkPrecedence({ manual: { chest: entry }, research });
    expect(source.chest).toBe('research');
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

  test('explicit intent no longer outranks the adapted layer: the adapted numbers stand', () => {
    // RE-PINNED: this pinned "manual wins" over adapted; the manual layer is retired.
    const { source, table } = mergeLandmarkPrecedence({
      manual: { chest: { mev: 6, mav: 14, mrv: 22, explicit: true } },
      adapted: { chest: { mev: 7, mav: 15, mrv: 23, isAdapted: true } },
      research,
    });
    expect(source.chest).toBe('adapted');
    expect(table.chest).toMatchObject({ mev: 7, mav: 15, mrv: 23 });
  });

  test('intent is never inferred from the number alone', () => {
    // Same numbers, opposite verdicts - only the recorded flag differs.
    const withFlag = { mev: 6, mav: 14, mrv: 22, explicit: true };
    const without = { mev: 6, mav: 14, mrv: 22 };
    expect(isManualEdit(withFlag, research.chest)).not.toBe(isManualEdit(without, research.chest));
  });
});

// RE-PINNED 2026-10-05 (D219, founder answer "Remove the editor"): this describe pinned, from the screen's source,
// that the editor recorded intent only for muscles it touched (D214 plan 7.4 item 7, review D4). The editor is
// gone, so there is no intent to record; what is pinned instead is that none of that machinery is left.
describe('the editor that recorded intent is gone', () => {
  const SRC = require('fs').readFileSync(require('path').resolve(__dirname, '../../screens/VolumeHeatmapScreen.js'), 'utf8');

  test('no touched-muscle record, seed, save, cancel or reset is left in the Volume heatmap screen', () => {
    expect(SRC).not.toMatch(/touchedMusclesRef|editSeedRef|saveLandmarks|cancelEditing|openEditor|resetToVolyumeTargets/);
  });
});
