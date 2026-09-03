/**
 * ManualBuilderScreen.discardConfirm.guard.test.js -- D139 (lead programme
 * ruling): the manual builder must not write an empty programme before a
 * single exercise exists. Page 1 -> page 2 no longer writes (see
 * ManualBuilderScreen.errorCopy.guard.test.js's ensureProgramme pin), so
 * there is no row to clean up on an abandoned page 2 any more -- but a
 * person who HAS added exercises still deserves a confirm before hardware
 * back / header back / swipe-back throws that work away silently.
 *
 * Source-level pin (repo convention: fs.readFileSync + regex), matching the
 * existing house pattern for exactly this problem
 * (HowYouTrainAddScreen.wizard.guard.test.js's
 * "navigation.addListener('beforeRemove'" + appAlert pin) rather than
 * driving react-test-renderer through a real React Navigation
 * beforeRemove event, which the test harness does not model.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'ManualBuilderScreen.js'), 'utf8');

describe('page 2 (create mode) confirms before discarding unsaved exercises', () => {
  test('a beforeRemove listener intercepts navigation away from page 2', () => {
    expect(src).toContain("navigation.addListener('beforeRemove'");
  });

  test('it is gated on create mode + page 2, and skips the confirm when nothing was added', () => {
    const idx = src.indexOf("navigation.addListener('beforeRemove'");
    const block = src.slice(Math.max(0, idx - 500), idx + 700);
    expect(block).toContain('if (isEditMode || page !== 2) return undefined;');
    expect(block).toContain('const hasWork = days.some(d => d.exercises.length > 0);');
    expect(block).toContain('if (!hasWork) return;');
    expect(block).toContain('e.preventDefault();');
  });

  test('the house appAlert confirm is used, with a Keep editing / Discard choice', () => {
    expect(src).toContain(
      "appAlert('Discard this plan?', 'The workouts you added here will not be saved.'",
    );
    expect(src).toContain("{ text: 'Keep editing', style: 'cancel' }");
    expect(src).toContain("{ text: 'Discard', style: 'destructive'");
    expect(src).toContain('navigation.dispatch(e.data.action)');
  });

  test('edit mode is unchanged: no discard confirm was added for it', () => {
    // The gate itself (isEditMode || page !== 2) is the pin: edit mode
    // short-circuits before the listener is ever registered.
    const idx = src.indexOf("navigation.addListener('beforeRemove'");
    const guardLine = src.slice(Math.max(0, idx - 500), idx);
    expect(guardLine).toContain('if (isEditMode || page !== 2) return undefined;');
  });
});
