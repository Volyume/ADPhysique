/**
 * EP-19/UI-08/P-07 (Codex end-user-polish audit): four catch blocks in
 * ManualBuilderScreen interpolated the raw thrown `e.message` straight into
 * the user-facing toast ("e.message || 'Could not ...'"), which can surface
 * SQL columns, undefined-property TypeErrors, or other implementation detail
 * a user should never see. Each is now a stable, calm string with the raw
 * cause logged via the existing logError instead of shown.
 *
 * Source guard rather than a render test: this screen's colocated
 * ManualBuilderScreen.test.js already mocks useToast with a fresh jest.fn()
 * per render (not captured across renders), so asserting the exact string
 * reaching the toast is far more directly verified by pinning the source
 * than by re-plumbing that mock.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'ManualBuilderScreen.js'),
  'utf8',
);

describe('ManualBuilderScreen never shows a raw exception message to the user', () => {
  test('none of the four save/create catch blocks interpolate e.message into a toast', () => {
    expect(src).not.toMatch(/toast\.show\(e\.message/);
    expect(src).not.toMatch(/toast\.show\(e\?\.message/);
  });

  test('handleCreatePlan logs the cause and shows calm, stable copy', () => {
    expect(src).toMatch(
      /logError\('ManualBuilderScreen\.handleCreatePlan', e\);\s*\n\s*toast\.show\("Couldn't create your plan, try again", \{ variant: 'error' \}\);/,
    );
  });

  test('handleSaveAndActivate logs the cause and shows calm, stable copy', () => {
    expect(src).toMatch(
      /logError\('ManualBuilderScreen\.handleSaveAndActivate', e\);\s*\n\s*toast\.show\("Couldn't save your plan, try again", \{ variant: 'error' \}\);/,
    );
  });

  test('handleSaveDraft logs the cause and shows calm, stable copy', () => {
    expect(src).toMatch(
      /logError\('ManualBuilderScreen\.handleSaveDraft', e\);\s*\n\s*toast\.show\("Couldn't save your draft, try again", \{ variant: 'error' \}\);/,
    );
  });

  test('handleSaveEdit logs the cause and shows calm, stable copy', () => {
    expect(src).toMatch(
      /logError\('ManualBuilderScreen\.handleSaveEdit', e\);\s*\n\s*toast\.show\("Couldn't save your changes, try again", \{ variant: 'error' \}\);/,
    );
  });
});
