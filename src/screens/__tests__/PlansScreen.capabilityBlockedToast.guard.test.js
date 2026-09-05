/**
 * D112 R5 (closes audit T1-12) - every plan-generation entry reveals
 * capability effects, not just PlanUpdateScreen's dry-run preview. Source
 * guard, same convention as PlansScreen.hierarchy.guard.test.js (which
 * already pins the generateAndSavePlan(user.id, userProfile) call this
 * addition sits beside, unchanged).
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'PlansScreen.js'), 'utf8');

describe('T1-12: PlansScreen reveals capability-blocked slots after generation', () => {
  test('the reviewed-adjust / next-block refine path (~614) toasts on success with capabilityBlockedCount', () => {
    expect(source).toMatch(
      /toast\.show\('Your next block started with your current workouts', \{ variant: 'warning' \}\);\s*\n\s*\} else if \(result\.capabilityBlockedCount > 0\) \{\s*\n\s*\/\/ D112 R5 \(closes audit T1-12\): every generation entry reveals\s*\n\s*\/\/ capability effects\.\s*\n\s*toast\.show\(capabilityBlockedNote\(result\.capabilityBlockedCount\), \{ variant: 'info', duration: 5000 \}\);\s*\n\s*\}/,
    );
  });

  // RE-ANCHORED (D139, programme creation masterpass, 2026-09-03): the
  // no-plan "Start with a plan" CTA now previews before it generates
  // (lib/startWithPlan.js), same two-step shape as HomeScreen's own no-plan
  // CTA. The success toast this test used to anchor on ("Your plan is
  // active") is retired to match that sibling surface (the sheet closing on
  // confirm is the visible feedback); the capability-blocked disclosure
  // this test protects moved with it, into handleConfirmStartWithPlan.
  test('the no-plan "Start with a plan" preview\'s commit step toasts capabilityBlockedCount on success', () => {
    const site = source.indexOf('async function handleConfirmStartWithPlan()');
    expect(site).toBeGreaterThan(-1);
    const block = source.slice(site, source.indexOf('async function handleRestartPlan'));
    expect(block).toContain('commitStartWithPlan(user.id, userProfile)');
    expect(block).toMatch(/if \(result\.capabilityBlockedCount > 0\) \{/);
    expect(block).toMatch(/toast\.show\(capabilityBlockedNote\(result\.capabilityBlockedCount\), \{ variant: 'info', duration: 5000 \}\);/);
  });

  test('the no-plan path runs through the shared prepare/commit helper (D139), not a direct call; the reviewed-adjust generateAndSavePlan(user.id, userProfile, {...}) call is untouched', () => {
    expect(source).toContain("prepareStartWithPlan(user.id, userProfile, { mode: 'first' })");
    expect(source).toContain('commitStartWithPlan(user.id, userProfile)');
    expect(source).toMatch(/generateAndSavePlan\(user\.id, userProfile, \{/);
  });

  test('capabilityBlockedNote is a local pure helper with the exact singular/plural copy', () => {
    expect(source).toMatch(
      /function capabilityBlockedNote\(n\) \{\s*\n\s*return n === 1\s*\n\s*\? "1 movement clashed with an injury or limitation you've set, so your plan works without it\."\s*\n\s*: `\$\{n\} movements clashed with your injuries or limitations, so your plan works without them\.`;\s*\n\s*\}/,
    );
  });
});
