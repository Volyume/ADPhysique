/**
 * D112 R5 (closes audit T1-12) - every plan-generation entry reveals
 * capability effects, not just PlanUpdateScreen's dry-run preview. Source
 * guard (matches goalSetupSectionLabels.guard.test.js's own convention for
 * this screen's retry copy - no light render harness for this handler).
 */
const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'ProGoalSetupScreen.js'), 'utf8');

describe('T1-12: ProGoalSetupScreen reveals capability-blocked slots after a rebuild', () => {
  test('the existing failure toast is unchanged (goalSetupSectionLabels.guard.test.js\'s own pin)', () => {
    expect(SOURCE).toContain('Open Today and choose Start with a plan to retry');
  });

  test('a successful rebuild with capabilityBlockedCount > 0 gets its own info toast', () => {
    expect(SOURCE).toMatch(
      /\} else if \(planResult\.capabilityBlockedCount > 0\) \{\s*\n\s*\/\/ D112 R5 \(closes audit T1-12\): every generation entry reveals\s*\n\s*\/\/ capability effects\.\s*\n\s*toast\.show\(capabilityBlockedNote\(planResult\.capabilityBlockedCount\), \{ variant: 'info', duration: 5000 \}\);\s*\n\s*\}/,
    );
  });

  test('capabilityBlockedNote is a local pure helper with the exact singular/plural copy', () => {
    expect(SOURCE).toMatch(
      /function capabilityBlockedNote\(n\) \{\s*\n\s*return n === 1\s*\n\s*\? "1 movement clashed with an injury or limitation you've set, so your plan works without it\."\s*\n\s*: `\$\{n\} movements clashed with your injuries or limitations, so your plan works without them\.`;\s*\n\s*\}/,
    );
  });
});
