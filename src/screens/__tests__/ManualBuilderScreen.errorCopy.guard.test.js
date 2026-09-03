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

  // D139 (lead programme ruling): handleCreatePlan no longer writes the
  // programme row (that moved to ensureProgramme, called from the Save
  // handlers below), so it does no I/O and carries no catch block of its
  // own any more. Its old "Couldn't create your plan, try again" copy
  // moved with the write: ensureProgramme's failure has no dedicated toast
  // of its own now -- it throws, and is caught by whichever Save handler
  // called it, reusing that handler's own existing catch/toast pinned
  // below (handleSaveAndActivate/handleSaveDraft), so a create-on-save
  // failure was never left unhandled.
  test('handleCreatePlan is synchronous and carries no create-plan catch block', () => {
    const fn = src.slice(
      src.indexOf('function handleCreatePlan'),
      src.indexOf('function handleCreatePlan') + 700,
    );
    expect(fn).not.toMatch(/^\s*async function handleCreatePlan/m);
    expect(fn).not.toContain('try {');
    expect(fn).not.toContain("logError('ManualBuilderScreen.handleCreatePlan'");
  });

  test('ensureProgramme creates the deferred programme row on first save, not on page 1', () => {
    expect(src).toMatch(/async function ensureProgramme\(\)\s*\{/);
    expect(src).toMatch(/if \(programmeId\) return programmeId;/);
    expect(src).toContain('const prog = await createProgramme(user.id, planName.trim()');
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
