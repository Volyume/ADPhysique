/**
 * D146 (founder, 2026-09-04): the setup wizard points at what is missing.
 * Continue is never greyed out; a tap with a gap marks the step attempted,
 * the missing boxes take the error state with a one-line message, the first
 * gap is scrolled into view and focused where it is a text field, and the
 * line under Continue names what is still needed. Errors clear live. This
 * pins the mechanism and the one-control-family rule on the baseline step.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ProOnboardingScreen.js'), 'utf8');
const TEXT_FIELD = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'TextField.js'), 'utf8');
const DROPDOWN = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'Dropdown.js'), 'utf8');
const SEGMENTED = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'SegmentedControl.js'), 'utf8');

describe('the field primitives carry an inline error state', () => {
  test('TextField: error prop colours the border and renders FieldError', () => {
    expect(TEXT_FIELD).toMatch(/error \? \{ borderColor: t\.colors\.error \} : null/);
    expect(TEXT_FIELD).toContain('<FieldError message={error} />');
  });
  test('Dropdown: error prop colours the trigger and renders FieldError', () => {
    expect(DROPDOWN).toMatch(/error && !open \? \{ borderColor: t\.colors\.error \} : null/);
    expect(DROPDOWN).toContain('<FieldError message={error} />');
  });
  test('SegmentedControl: error prop colours the track', () => {
    expect(SEGMENTED).toMatch(/error \? \{ borderColor: t\.colors\.error \} : null/);
  });
});

describe('every gated step surfaces its gaps the same way', () => {
  test.each([
    ['advanceFrom2', 'validateStep2', "'group2'", 'setAttempted2'],
    ['advanceFrom4', 'validateStep4', "'group4'", 'setAttempted4'],
    ['advanceFrom6', 'validateStep6', "'group6'", 'setAttempted6'],
    ['advanceFrom7', 'validateStep7', "'group7'", 'setAttempted7'],
  ])('%s validates, surfaces and returns before advancing', (fn, validator, group, setter) => {
    const re = new RegExp(`function ${fn}\\(\\) \\{[\\s\\S]{0,900}?${validator}\\(\\);[\\s\\S]{0,400}?surfaceGaps\\([\\s\\S]{0,200}?${group}[\\s\\S]{0,400}?${setter}\\);\\s*return;`);
    expect(SRC).toMatch(re);
  });

  test('surfaceGaps marks attempted, gives the warning haptic, scrolls to the first gap and focuses a text field', () => {
    expect(SRC).toMatch(/function surfaceGaps\(errs, order, groupKey, focusRefs, setAttempted\) \{\s*setAttempted\(true\);\s*haptics\.error\(\);/);
    expect(SRC).toMatch(/scrollToField\(groupKey, first\);/);
    expect(SRC).toMatch(/if \(ref\?\.current\?\.focus\) setTimeout\(\(\) => ref\.current\?\.focus\?\.\(\), 260\);/);
  });

  test('Continue is never disabled by a gap on steps 2, 4 and 6', () => {
    expect(SRC).not.toMatch(/disabled=\{!canContinue\}/);
    expect(SRC).not.toMatch(/onPress=\{canContinue \? advanceFrom/);
    for (const fn of ['advanceFrom2', 'advanceFrom4', 'advanceFrom6']) {
      expect(SRC).toContain(`onPress={${fn}}`);
    }
  });

  test('the line under Continue names what is still needed, and nothing is red before the first attempt', () => {
    expect(SRC).toMatch(/return `Still needed: \$\{names\.join\(', '\)\}\.`;/);
    expect(SRC).toMatch(/const errors2 = attempted2 \? validateStep2\(\) : \{\};/);
    expect(SRC).toMatch(/const errors4 = attempted4 \? validateStep4\(\) : \{\};/);
    expect(SRC).toMatch(/const errors6 = attempted6 \? validateStep6\(\) : \{\};/);
    expect(SRC).toMatch(/const errors7 = attempted7 \? validateStep7\(\) : \{\};/);
  });

  test('the late bounce-back to the baseline step highlights the gaps on arrival', () => {
    expect(SRC).toMatch(/setAttempted2\(true\);\s*setStep\(2\);\s*appAlert\(\s*'Baseline needs checking'/);
  });

  test('the old under-button alerts for missing fields are gone', () => {
    for (const s of [
      "appAlert('Biological sex'", "appAlert('Body weight'", "appAlert('Age'", "appAlert('Height'",
      "appAlert('Complete all fields'", "appAlert('Almost there'", "appAlert('Recovery rating'",
    ]) {
      expect(SRC).not.toContain(s);
    }
  });
});

describe('the baseline step is one control family', () => {
  test('both unit pickers are the shared SegmentedControl; the hand-rolled toggle is gone', () => {
    expect(SRC).toMatch(/accessibilityLabel="Height units"/);
    expect(SRC).toMatch(/accessibilityLabel="Body weight units"/);
    expect(SRC).not.toMatch(/segmentRowSmall|segmentSmall|segmentTextSmall|fieldLabelRow/);
  });
  test('no TextField in the wizard carries the inert per-field overrides', () => {
    expect(SRC).not.toMatch(/fieldStyle=\{styles\.inputField\}/);
    expect(SRC).not.toMatch(/inputStyle=\{styles\.input\}/);
    expect(SRC).not.toMatch(/inputField: \{|inputStone|inputPounds/);
  });
  test('paired inputs share the row equally', () => {
    expect(SRC).toMatch(/pairHalf: \{ flex: 1 \}/);
    expect(SRC).not.toMatch(/flex: 2, minWidth: 120|flex: 3, minWidth: 120/);
  });
  test('a paired field shows the error border without duplicating the message', () => {
    expect((SRC.match(/error=\{errors2\.height \? ' ' : undefined\}/g) || []).length).toBe(3);
    expect((SRC.match(/<FieldError message=\{errors2\.height\} \/>/g) || []).length).toBe(1);
  });
});
