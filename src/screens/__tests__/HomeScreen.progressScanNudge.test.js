/**
 * HomeScreen check-in nudge: optional progress-scan subline
 * (`.volyume-audit/progress-scan-coach-worldclass/integration-plan.md` §8).
 *
 * The existing "Your weekly check-in is ready" nudge (Pro, one-time) gains
 * one optional subline, fail-closed via usePhotoSuppression(). Nothing else
 * about the nudge (its Pro gating, dismiss behaviour, or the one-banner
 * priority chain) changes.
 *
 * This screen has no existing test file and cannot safely be `require`'d in
 * this Jest environment (heavy transitive imports, no mock scaffold set up
 * for this file -- see CoachOutputScreen's own test family for the same
 * constraint). Source-guard style, matching the established convention.
 *
 * Pins:
 *  1. usePhotoSuppression is imported and called once, keyed to the user id,
 *     fail-closed default (the hook itself defaults `suppressed = true`).
 *  2. The subline sits inside the existing showCoachingNudge card, gated on
 *     `!photoScanSuppressed`, after the existing body copy, before the
 *     "Open check-in" button -- an addition, not a replacement.
 *  3. Nothing else in the nudge card (title, body, dismiss, navigation
 *     target) changed.
 */
const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../HomeScreen.js'), 'utf8');

describe('HomeScreen check-in nudge scan subline', () => {
  test('imports and calls usePhotoSuppression, keyed to the user id', () => {
    expect(SCREEN).toMatch(/import usePhotoSuppression from '\.\.\/hooks\/usePhotoSuppression';/);
    expect(SCREEN).toMatch(/const photoScanSuppressed = usePhotoSuppression\(user\?\.id\);/);
  });

  test('the subline is gated on !photoScanSuppressed and sits inside the existing nudge card', () => {
    const cardStart = SCREEN.indexOf('{showCoachingNudge && (');
    expect(cardStart).toBeGreaterThan(-1);
    const cardBlock = SCREEN.slice(cardStart, cardStart + 1600);
    expect(cardBlock).toMatch(/Your weekly check-in is ready/);
    expect(cardBlock).toMatch(/It's your check-in day\. See how your week went and what to adjust\./);
    // Subline appears after the existing body text, before the CTA button.
    const bodyIdx = cardBlock.indexOf("It's your check-in day");
    const sublineIdx = cardBlock.indexOf('!photoScanSuppressed');
    const ctaIdx = cardBlock.indexOf('Open check-in');
    expect(sublineIdx).toBeGreaterThan(bodyIdx);
    expect(sublineIdx).toBeLessThan(ctaIdx);
    expect(cardBlock).toMatch(/\{!photoScanSuppressed && \(\s*\n\s*<Text style=\{styles\.coachingNudgeScanSubline\}>/);
    expect(cardBlock).toMatch(/If you like, add a progress scan first for extra visual context\. Skipping it is fine\./);
  });

  test('the nudge dismiss and navigation target are untouched', () => {
    expect(SCREEN).toMatch(/onPress=\{dismissCoachingNudge\}/);
    expect(SCREEN).toMatch(/navigation\.navigate\('ProfileTab', \{ screen: 'WeeklyCheckIn', initial: false \}\);/);
  });

  test('the subline style exists and uses theme tokens, not hard-coded values', () => {
    expect(SCREEN).toMatch(/coachingNudgeScanSubline: \{\s*\n\s*\.\.\.type\.captionTight, color: colors\.textMuted,\s*\n\s*\},/);
  });
});
