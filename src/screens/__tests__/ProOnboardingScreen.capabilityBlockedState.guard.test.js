/**
 * D112 R5 (closes audit T1-12/T1-13) - ProOnboardingScreen has no light
 * render harness for its final-step generation outcome (see the same
 * rationale in ProOnboardingScreen.polish.guard.test.js: source-level
 * regression guards, not a full mount). This pins the exact fixed source.
 *
 * Pins:
 *  - T1-13: a TOTAL capability block ('plan_blocked_by_exclusions' with
 *    blockedByCapability) gets the honest graded alert (title, three
 *    actions), never the generic "didn't finish" retry-loop copy.
 *  - The generic failure copy is UNCHANGED and still reachable for every
 *    other failure reason (including a plan_blocked_by_exclusions caused
 *    purely by the preference lane, not capability) - the exact string
 *    ProOnboardingScreen.polish.guard.test.js already pins.
 *  - T1-12: a successful generation with capabilityBlockedCount > 0 gets
 *    its own alert, independent of the existing `partial` (equipment)
 *    alert - both can fire, never conflated.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'ProOnboardingScreen.js'), 'utf8');

describe('T1-13: the graded total-block state', () => {
  test('gated on plan_blocked_by_exclusions AND blockedByCapability specifically', () => {
    expect(SOURCE).toMatch(
      /if \(planResult\.error === 'plan_blocked_by_exclusions' && planResult\.blockedByCapability\) \{/,
    );
  });

  test('the honest title/copy, never "safe to perform" or a condition name (CAP-18)', () => {
    expect(SOURCE).toContain('Volyume could not build a full plan inside how you train.');
    expect(SOURCE).not.toMatch(/safe to perform/i);
  });

  test('three actions in the given order: Open How you train, a plain hold, Try again', () => {
    const site = SOURCE.indexOf("if (planResult.error === 'plan_blocked_by_exclusions' && planResult.blockedByCapability) {");
    // The outer else (the ORIGINAL generic-alert fallback) is found by its
    // own unique D88 comment, not by the first "} else {" textually - the
    // retry action's own nested if/else (retryResult.ok) sits INSIDE this
    // block and would otherwise be found first.
    const end = SOURCE.indexOf('// D88: the caught error is logged just above, never shown.', site);
    expect(end).toBeGreaterThan(site);
    const block = SOURCE.slice(site, end);
    const openIdx = block.indexOf("text: 'Open How you train'");
    // Round 11 (R11-3): the dismiss says 'Got it' - 'Not now' is the
    // capability lane's decline word and this cancel writes nothing.
    const dismissIdx = block.indexOf("text: 'Got it'");
    const tryAgainIdx = block.indexOf("text: 'Try again'");
    expect(openIdx).toBeGreaterThan(-1);
    expect(dismissIdx).toBeGreaterThan(openIdx);
    expect(tryAgainIdx).toBeGreaterThan(dismissIdx);
    // "Open How you train" navigates; the hold is a plain cancel dismiss
    // (no browse-plans action - first run has no library route from this
    // screen, matching FreeStarterScreen's own fromFirstRun precedent).
    expect(block).toMatch(/onPress: \(\) => navigation\.navigate\('HowYouTrain'\)/);
    expect(block).toMatch(/\{ text: 'Got it', style: 'cancel' \}/);
    expect(block).not.toMatch(/Browse plans/);
    expect(block).not.toContain("text: 'Not now'");
  });

  test('Try again re-runs the SAME capability pre-flight before retrying generation - never a silent fail-open', () => {
    const site = SOURCE.indexOf("text: 'Try again'");
    const end = SOURCE.indexOf('},\n              ],', site);
    const block = SOURCE.slice(site, end);
    expect(block).toMatch(/await capabilityPreflight\(user\.id\)/);
    expect(block).toMatch(/offerCapabilityPreflightChoice\(/);
    expect(block).toMatch(/if \(!retryGoAhead\) return;/);
    expect(block).toMatch(/await generateAndSavePlan\(user\.id, planProfile\)/);
  });

  test('a non-capability plan_blocked_by_exclusions (or any other failure) still gets the ORIGINAL generic copy, unchanged', () => {
    // The exact string ProOnboardingScreen.polish.guard.test.js already
    // pins - this addition must never remove or alter it.
    expect(SOURCE).toContain('Open Today and choose "Start with a plan" to retry.');
    const genericCount = (SOURCE.match(/'Your profile is saved, but your training plan did not generate\. Open Today and choose "Start with a plan" to retry\.'/g) ?? []).length;
    // Once for the retry's own failure copy, once for the else branch
    // (non-capability failures) - never fewer than the pre-existing one.
    expect(genericCount).toBeGreaterThanOrEqual(1);
  });
});

describe('T1-12: every generation entry reveals capability effects', () => {
  test('a successful generation with capabilityBlockedCount > 0 gets its own alert, independent of `partial`', () => {
    const site = SOURCE.indexOf('if (planResult.partial) {');
    expect(site).toBeGreaterThan(-1);
    const block = SOURCE.slice(site, site + 900);
    expect(block).toMatch(/appAlert\('Plan ready', planShortfallNote\(planResult\.missedCount\)\);/);
    expect(block).toMatch(/if \(planResult\.capabilityBlockedCount > 0\) \{/);
    expect(block).toMatch(/appAlert\('Plan ready', capabilityBlockedNote\(planResult\.capabilityBlockedCount\)\);/);
  });

  test('capabilityBlockedNote is a local pure helper with the exact singular/plural copy', () => {
    expect(SOURCE).toMatch(
      /function capabilityBlockedNote\(n\) \{\s*\n\s*return n === 1\s*\n\s*\? '1 movement sat outside how you train, so your plan works without it\.'\s*\n\s*: `\$\{n\} movements sat outside how you train, so your plan works without them\.`;\s*\n\s*\}/,
    );
  });
});
