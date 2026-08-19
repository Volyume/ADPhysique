/**
 * 2026-07-11: pins the exercise-picker first-open fix
 * (docs/TASKBOARD.md, "IN FLIGHT - exercise picker first-open fix", D33).
 *
 * Diagnosed root cause: on the FIRST open of a session, a freshly created
 * Android Modal window races FlashList's native measurement handshake
 * (the same class of race the SafeAreaProvider comment in
 * ExercisePickerModal.js already documents for insets) -- the list commits
 * a ~zero-height first native paint, clipping the results, the
 * ListEmptyComponent, the create-custom footer AND the browse-filter chip
 * rows into a blank gap. Second and later opens self-heal because Android
 * remounts the modal's child tree each open, so the native setup is
 * already warm. Pre-campaign root: FlashList adoption 68f0462 (E8,
 * 2026-07-02).
 *
 * Fix (lead-ruled): a `modalShown` state, initially false, flips true only
 * from the Modal's onShow (fires after native presentation on both
 * platforms) and resets to false when `visible` goes false. The FlashList
 * and the showBrowseFilters chip block only render once modalShown is
 * true, so the first layout pass always lands against an already-presented
 * window.
 *
 * This is a SOURCE-LEVEL pin only, so a later edit cannot silently strip
 * the gate back out without failing a test. It is NOT a runtime
 * regression test: Jest cannot exercise the actual native race (FlashList
 * is mocked to FlatList via __mocks__/shopify-flash-list.js, and RN's
 * Modal test-renderer does not model a real onShow timing gap against a
 * native window). The runtime fix is verified on a physical Android device
 * only -- see the device checklist attached to this fix's task report.
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'ExercisePickerModal.js'), 'utf8');

describe('ExercisePickerModal first-open native-race gate', () => {
  test('modalShown state exists, starts false', () => {
    expect(source).toMatch(/const \[modalShown, setModalShown\] = useState\(false\)/);
  });

  test('modalShown is set true only from the Modal onShow', () => {
    expect(source).toMatch(/onShow=\{\(\) => setModalShown\(true\)\}/);
    // Should not be flipped true anywhere else in the file.
    expect(source.match(/setModalShown\(true\)/g) || []).toHaveLength(1);
  });

  test('modalShown resets when the modal closes', () => {
    expect(source).toMatch(/if \(!visible\) \{/);
    expect(source).toMatch(/setModalShown\(false\);\s*\n\s*return;/);
  });

  test('the FlashList mount is gated on modalShown', () => {
    // 2026-08-19: the regex used to require <FlashList to be the immediate
    // next line after the gate. It now sits inside a flex:1 wrapper (see the
    // pickerListWrap test below), so the shape is asserted as "the gate opens,
    // and the FlashList is what it guards" rather than by adjacency. The gate
    // itself is unchanged; only what it wraps gained a parent.
    expect(source).toMatch(/\{modalShown \? \([\s\S]{0,200}?<FlashList/);
  });

  test('the FlashList has a flex parent, so its height never depends on timing', () => {
    // THE actual fix for the blank first-open picker (founder report
    // 2026-08-19, reproduced on BOTH platforms, not Android-only as the
    // 2026-07-11 diagnosis above assumed).
    //
    // The gate pinned above is a TIMING mitigation: it delays WHEN the list
    // mounts but never tells it how tall it is. The FlashList had no style and
    // no flex, and its parent is a Fragment, so its container height was
    // indeterminate and it fell back to its own native measurement handshake
    // to discover one - the very race the gate was trying to dodge. That is
    // why the bug survived the gate and still presented as a blank gap with
    // the results, empty state and create-custom footer clipped out.
    //
    // A flex:1 wrapper is laid out by Yoga on the first pass, so the list is
    // handed a definite height before it measures anything. Deterministic
    // rather than timed. If this wrapper is ever removed, the blank picker
    // comes back and no amount of onShow gating will save it.
    expect(source).toMatch(/<View style=\{styles\.pickerListWrap\}>\s*\n\s*<FlashList/);
    expect(source).toMatch(/pickerListWrap:\s*\{\s*flex:\s*1\s*\}/);
  });

  test('the showBrowseFilters chip block is gated on modalShown too', () => {
    expect(source).toMatch(/\{modalShown && showBrowseFilters \? \(/);
  });
});
