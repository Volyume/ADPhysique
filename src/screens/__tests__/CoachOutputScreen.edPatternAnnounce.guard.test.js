/**
 * AY-7/D7 (design-usability-audit-2026-07-09/coverage-04-accessibility.md):
 * the ED-pattern lockout/cleared card gave no screen-reader announcement
 * when it appeared, so a TalkBack user could only learn a hold happened (or
 * lifted) by manually exploring the Coach tab. D7 approved fixing this with
 * a hard constraint: the announcement must read the already-approved
 * on-screen copy VERBATIM, no new, paraphrased, or softened ED-safety
 * wording. These are source-level pins (matching the p9Talkback.guard.test.js
 * convention) so a future edit can't silently drop the announcement or swap
 * in invented copy instead of the real ED_PATTERN_*_COPY strings.
 */
const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');
const TEMPLATES = fs.readFileSync(
  path.resolve(__dirname, '../../lib/whyThisTemplates.js'),
  'utf8',
);

describe('AY-7: ED-pattern lockout card announces itself on appearance', () => {
  test('AccessibilityInfo is imported from react-native', () => {
    expect(SCREEN).toMatch(/AccessibilityInfo/);
    expect(SCREEN).toMatch(/from 'react-native'/);
  });

  test('EdPatternLockoutBlock announces the locked copy verbatim on mount', () => {
    const fnMatch = SCREEN.match(
      /function EdPatternLockoutBlock\([\s\S]*?\n}\n/,
    );
    expect(fnMatch).toBeTruthy();
    const fn = fnMatch[0];
    // Fires from a mount effect, not from a render-time side effect.
    expect(fn).toMatch(/useEffect\(\(\) => \{[\s\S]*announceForAccessibility/);
    // Composed only from the existing exported copy object -- no inline
    // literal ED-safety strings introduced alongside it.
    expect(fn).toMatch(/ED_PATTERN_LOCKOUT_COPY\.header/);
    expect(fn).toMatch(/ED_PATTERN_LOCKOUT_COPY\.title/);
    expect(fn).toMatch(/ED_PATTERN_LOCKOUT_COPY\.body/);
    expect(fn).toMatch(/ED_PATTERN_LOCKOUT_COPY\.bodyGoalLockExtension/);
    expect(fn).toMatch(/ED_PATTERN_LOCKOUT_COPY\.bottomNote/);
    // Best-effort: never throws where no screen reader is running.
    expect(fn).toMatch(/catch \(_\)/);
  });

  test('EdPatternClearedBlock announces the cleared copy verbatim on mount', () => {
    const fnMatch = SCREEN.match(
      /function EdPatternClearedBlock\(\)[\s\S]*?\n}\n/,
    );
    expect(fnMatch).toBeTruthy();
    const fn = fnMatch[0];
    expect(fn).toMatch(/useEffect\(\(\) => \{[\s\S]*announceForAccessibility/);
    expect(fn).toMatch(/ED_PATTERN_CLEARED_COPY\.header/);
    expect(fn).toMatch(/ED_PATTERN_CLEARED_COPY\.title/);
    expect(fn).toMatch(/ED_PATTERN_CLEARED_COPY\.body/);
    expect(fn).toMatch(/catch \(_\)/);
  });

  test('neither block renders (so neither announcement fires) when no ED-pattern decision is present', () => {
    // D17/AY-7: the announcement lives entirely inside each block's own
    // mount effect, so "no announcement when neither renders" is enforced
    // by HeldDecisionsCard only ever mounting a block when its matching
    // decision is present -- pin that gating so a future refactor can't
    // start rendering (and therefore announcing) unconditionally.
    const cardMatch = SCREEN.match(
      /function HeldDecisionsCard\([\s\S]*?\n}\n/,
    );
    expect(cardMatch).toBeTruthy();
    const fn = cardMatch[0];
    expect(fn).toMatch(/\{edLockout \? <EdPatternLockoutBlock[\s\S]*?: null\}/);
    expect(fn).toMatch(/\{edCleared \? <EdPatternClearedBlock[\s\S]*?: null\}/);
  });

  test('the locked ED-safety copy itself is untouched by this change', () => {
    // AY-7 is announcement-only: no copy or logic change proposed. Pin the
    // exact founder-approved strings still stand in whyThisTemplates.js.
    expect(TEMPLATES).toMatch(/header: 'Held this week'/);
    expect(TEMPLATES).toMatch(/title: 'We\\'ve held your calorie cut'/);
    expect(TEMPLATES).toMatch(/header: 'Hold lifted'/);
    expect(TEMPLATES).toMatch(/title: 'Your numbers are looking better'/);
  });
});
