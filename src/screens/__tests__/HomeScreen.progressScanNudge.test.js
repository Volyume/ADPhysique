/**
 * HomeScreen check-in nudge, Campaign 22 Phase 2 Stage 1 re-pin.
 *
 * RETIRED BY THIS STAGE: the standalone "Your weekly check-in is ready"
 * nudge card (with its optional progress-scan subline,
 * `.volyume-audit/progress-scan-coach-worldclass/integration-plan.md` §8)
 * no longer renders at the bottom of Home. HOME-TODAY-UX-SPEC.md §15 copy
 * contract item 5 collapses it to ONE sentence in the unified Today line
 * (rank 4 of the arbiter): "Your weekly check-in is ready." The scan
 * subline is explicitly dropped -- "the scan invitation lives on the
 * check-in screen it belongs to" -- so usePhotoSuppression is no longer
 * imported or read by HomeScreen at all.
 *
 * This screen has no existing full-mount test and cannot safely be
 * `require`'d in this Jest environment (heavy transitive imports, no mock
 * scaffold set up for this file -- see CoachOutputScreen's own test family
 * for the same constraint). Source-guard style, matching the established
 * convention.
 *
 * Pins:
 *  1. usePhotoSuppression and its scan-subline copy are gone from Home.
 *  2. The old standalone nudge card markup (title/body/scan-subline/
 *     dedicated dismiss cross) is gone.
 *  3. The check-in fact feeding the arbiter carries the ONE-sentence copy,
 *     the exact original dismiss handler (dismissCoachingNudge) and the
 *     exact original navigation target, unchanged.
 */
const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../HomeScreen.js'), 'utf8');

describe('HomeScreen check-in nudge -> Today line rank 4 (Campaign 22 Phase 2 Stage 1)', () => {
  test('usePhotoSuppression is no longer imported or called', () => {
    expect(SCREEN).not.toMatch(/^import usePhotoSuppression/m);
    expect(SCREEN).not.toMatch(/usePhotoSuppression\(user\?\.id\)/);
    expect(SCREEN).not.toMatch(/const photoScanSuppressed =/);
    expect(SCREEN).not.toMatch(/\{!photoScanSuppressed &&/);
    expect(SCREEN).not.toMatch(/add a progress scan first/i);
  });

  test('the old standalone nudge card markup is gone', () => {
    expect(SCREEN).not.toMatch(/showCoachingNudge && \(\s*\n\s*<View style=\{\[styles\.coachingNudge/);
    expect(SCREEN).not.toMatch(/It's your check-in day\. See how your week went and what to adjust\./);
  });

  test('the checkIn fact carries the one-sentence copy contract (spec §15 item 5)', () => {
    expect(SCREEN).toMatch(/checkIn: \{\s*\n\s*eligible: showCoachingNudge,/);
  });

  test('the nudge dismiss and navigation target are untouched', () => {
    expect(SCREEN).toMatch(/onDismiss: dismissCoachingNudge,/);
    expect(SCREEN).toMatch(/navigation\.navigate\('ProfileTab', \{ screen: 'WeeklyCheckIn', initial: false \}\);/);
  });

  test('the arbiter itself owns the exact copy string, not HomeScreen', () => {
    const ARBITER = fs.readFileSync(
      path.resolve(__dirname, '../../lib/home/todayLineArbiter.js'), 'utf8',
    );
    expect(ARBITER).toContain("text: 'Your weekly check-in is ready.'");
    // The occupant TEXT itself (what actually renders) never mentions the
    // scan invitation, even though the module's own explanatory comments
    // discuss why it was dropped (checked directly against the resolver's
    // output rather than the whole file, so this cannot false-positive on
    // that commentary).
    // eslint-disable-next-line global-require
    const { resolveTodayLine } = require('../../lib/home/todayLineArbiter');
    const result = resolveTodayLine({ checkIn: { eligible: true, onPress: () => {}, onDismiss: () => {} } });
    expect(result.text).not.toMatch(/scan/i);
  });
});
