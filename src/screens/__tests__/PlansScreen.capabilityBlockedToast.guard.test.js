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

  test('the Pro no-plan "Start with a plan" path (~1204) toasts on success with capabilityBlockedCount, after the existing success toast', () => {
    const site = source.indexOf("toast.show('Your plan is active'");
    expect(site).toBeGreaterThan(-1);
    const block = source.slice(site, site + 550);
    expect(block).toMatch(/if \(result\.capabilityBlockedCount > 0\) \{/);
    expect(block).toMatch(/toast\.show\(capabilityBlockedNote\(result\.capabilityBlockedCount\), \{ variant: 'info', duration: 5000 \}\);/);
  });

  test('the generateAndSavePlan(user.id, userProfile) call itself is untouched (PlansScreen.hierarchy.guard.test.js\'s own pin)', () => {
    expect(source).toContain('generateAndSavePlan(user.id, userProfile)');
  });

  test('capabilityBlockedNote is a local pure helper with the exact singular/plural copy', () => {
    expect(source).toMatch(
      /function capabilityBlockedNote\(n\) \{\s*\n\s*return n === 1\s*\n\s*\? '1 movement sat outside how you train, so your plan works without it\.'\s*\n\s*: `\$\{n\} movements sat outside how you train, so your plan works without them\.`;\s*\n\s*\}/,
    );
  });
});
