/**
 * CP-10 stage 5 (docs/ux-world-class-audit-2026-07-09/
 * CP-10-restart-free-theming-plan.md, "Stage 5 -- Retire the reload
 * prompt"): the gate for this stage is "once Stage 3+4 cover every screen a
 * toggle's dependency set touches". Batches F and G (`3adf551`, `4947509`)
 * closed that gate -- every screen (Stage 3) and Skia/chart consumer (Stage
 * 4) is now live-themed via useTheme(), so all four toggles that used to
 * call promptRestartForA11y (Appearance, larger text, higher contrast,
 * colour-blind safe palette) apply immediately, same as reduce motion
 * always has.
 *
 * This is a source-level regression guard, not a render test: it reads the
 * real SettingsDisplayScreen.js and asserts, by regex, that the prompt
 * function and its plumbing (appAlert, Updates.reloadAsync) are gone from
 * this file, that none of the four toggle handlers reference it any more,
 * and that the user-facing note is the new honest "applies straight away"
 * copy rather than the old "needs Volyume to reopen" / "you'll be prompted
 * to reload" copy. Runtime mounting of this screen (including these same
 * four Switch/Chip handlers) is already covered generically by
 * src/__tests__/screen-mount.test.js; this suite exists to lock the
 * "prompts removed" contract itself so a future edit cannot silently
 * reintroduce a reload prompt without this test failing.
 */
import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'SettingsDisplayScreen.js'),
  'utf8',
);

describe('CP-10 stage 5: SettingsDisplayScreen no longer prompts for a restart', () => {
  test('promptRestartForA11y is gone entirely -- no definition, no call sites', () => {
    expect(SOURCE).not.toMatch(/promptRestartForA11y/);
  });

  test('the reload plumbing it used (appAlert, expo-updates) is gone with it', () => {
    expect(SOURCE).not.toMatch(/appAlert/);
    expect(SOURCE).not.toMatch(/expo-updates/);
    expect(SOURCE).not.toMatch(/Updates\.reloadAsync/);
  });

  test('none of the four toggles call a restart prompt after persisting', () => {
    // Each of these four handlers awaits setAccessibilityPref and, before
    // this stage, immediately followed it with promptRestartForA11y(...).
    // Assert each await line is no longer followed by that call within the
    // next couple of lines (a cheap, readable proxy for "handler ends after
    // the persist, nothing else").
    const handlers = [
      /await setAccessibilityPref\('theme', opt\.value\);\s*\n\s*\}\}/,
      /await setAccessibilityPref\('largerText', v\);\s*\n\s*\}\}/,
      /await setAccessibilityPref\('higherContrast', v\);\s*\n\s*\}\}/,
      /await setAccessibilityPref\('colorBlindSafe', v\);\s*\n\s*\}\}/,
    ];
    for (const re of handlers) {
      expect(SOURCE).toMatch(re);
    }
  });

  test('the old "needs to reopen / prompted to reload" note copy is gone', () => {
    expect(SOURCE).not.toMatch(/needs to reopen/);
    expect(SOURCE).not.toMatch(/prompted to reload/i);
    expect(SOURCE).not.toMatch(/need Volyume to reopen/);
  });

  test('the new note tells the honest, calm, restart-free story', () => {
    expect(SOURCE).toMatch(
      /All these settings apply straight away\. There is no need to restart or reopen Volyume\./,
    );
    // British English, calm voice, no em dash, no exclamation (project style
    // rules, CLAUDE.md section 3) -- checked on the note's own line so an
    // unrelated em dash/exclamation elsewhere in the file (there is none
    // today) would not false-fail this guard.
    const noteLine = SOURCE.split('\n').find(l => l.includes('apply straight away'));
    expect(noteLine).toBeTruthy();
    expect(noteLine).not.toMatch(/—/);
    expect(noteLine).not.toMatch(/!/);
  });
});
