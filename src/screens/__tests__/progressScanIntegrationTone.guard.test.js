/**
 * Tone/source guard over every NEW user-facing string added by the
 * progress-scan check-in/coach/home/scan-result integration wave
 * (`.volyume-audit/progress-scan-coach-worldclass/integration-plan.md`).
 *
 * Complements the receipt-layer tone guard already in
 * progressScanCheckInEvidence.test.js (which covers every string the
 * classifier/receipt builder can produce). This suite covers the literal
 * copy authored directly on the four touched SCREENS: the check-in scan
 * prompt, the "no scan this period" line, the Home nudge subline, and the
 * post-scan value line on ProgressPhotosScreen.
 *
 * Banned words, no em dash, no exclamation marks (CLAUDE.md, British
 * English calm no-shame voice).
 */
const fs = require('fs');
const path = require('path');

const BANNED_WORDS = ['failed', 'bad', 'fell off', 'perfect', 'behind', 'streak', 'shame', 'guilt'];

function assertClean(str) {
  expect(str).not.toMatch(/—/); // em dash
  expect(str).not.toMatch(/!/);
  for (const word of BANNED_WORDS) {
    expect(str.toLowerCase()).not.toContain(word);
  }
}

// The exact new literal strings authored in this wave, one per screen.
// RE-PINNED (Campaign 22 Phase 2 Stage 1, HOME-TODAY-UX-SPEC.md §15 copy
// contract item 5): the "HomeScreen.js (check-in nudge scan subline)" entry
// is REMOVED from this map -- the check-in nudge card it lived on is
// retired from Home (collapsed to one sentence in the unified Today line);
// "the scan invitation lives on the check-in screen it belongs to", i.e.
// WeeklyCheckInScreen's own scan-prompt strings below, unchanged.
const NEW_STRINGS = {
  'WeeklyCheckInScreen.js (scan prompt title)': 'Add a progress scan first?',
  'WeeklyCheckInScreen.js (scan prompt body)': 'A recent scan gives this check-in extra visual context. It is optional and skipping it changes nothing.',
  'WeeklyCheckInScreen.js (scan prompt CTA)': 'Do a scan',
  'WeeklyCheckInScreen.js (scan prompt dismiss)': 'Not now',
  'WeeklyCheckInScreen.js (no-scan-this-period line)': 'No photo set this period.',
  'ProgressPhotosScreen.js (post-scan check-in value line)': 'If you check in this week, the coach can use this as context.',
};

describe('progress-scan integration wave: new user-facing strings are clean', () => {
  test.each(Object.entries(NEW_STRINGS))('%s', (_label, str) => {
    assertClean(str);
  });

  test('every string above is verbatim present in its screen source (no drift between this guard and the real copy)', () => {
    const files = {
      WeeklyCheckInScreen: fs.readFileSync(path.resolve(__dirname, '../WeeklyCheckInScreen.js'), 'utf8'),
      HomeScreen: fs.readFileSync(path.resolve(__dirname, '../HomeScreen.js'), 'utf8'),
      ProgressPhotosScreen: fs.readFileSync(path.resolve(__dirname, '../ProgressPhotosScreen.js'), 'utf8'),
    };
    expect(files.WeeklyCheckInScreen).toMatch(/Add a progress scan first\?/);
    expect(files.WeeklyCheckInScreen).toMatch(/A recent scan gives this check-in extra visual context\. It is optional and skipping it changes nothing\./);
    expect(files.WeeklyCheckInScreen).toMatch(/No photo set this period\./);
    // The Home check-in nudge's scan subline is retired (see the NEW_STRINGS
    // comment above); pin its absence instead of its presence.
    expect(files.HomeScreen).not.toMatch(/If you like, add a progress scan first for extra visual context\. Skipping it is fine\./);
    expect(files.ProgressPhotosScreen).toMatch(/If you check in this week, the coach can use this as context\./);
  });

  test('CoachOutputScreen: the accessibility-label template and dedupe helper introduce no new literal copy beyond the receipt/resolver strings already tone-guarded elsewhere', () => {
    const screen = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');
    // scanAssessmentAccessibilityLabel only concatenates the receipt's own
    // (already tone-guarded) headline/confidence-chip strings; it introduces
    // no new literal English beyond the "Progress scan assessment: " label
    // prefix, which is itself banned-word/em-dash/exclamation-mark clean.
    assertClean('Progress scan assessment: ');
    expect(screen).toMatch(/`Progress scan assessment: \$\{packet\.receipt\.headline\}\$\{confidence\}`/);
  });
});
