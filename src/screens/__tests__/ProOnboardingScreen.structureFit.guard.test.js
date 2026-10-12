/**
 * ProOnboardingScreen.structureFit.guard.test.js -- D222 phase 6 (R65): the
 * onboarding fit review with the structure engine's answer.
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/23-PHASE6-INTEGRATION-SPEC.md
 * R65 ("Onboarding (no preview) uses assessScheduleFit: with the switch on it
 * returns the engine's refusal or length question in the shape its fit review
 * already renders, so the person picks before the plan is saved"). Source
 * guard (the screen is too large to mount here). What this pins and why:
 *   - a refused week is said in the engine's own words in the fit card's body
 *     (fitReview.refusal.text), not in the generic "needs a choice" copy that
 *     promises the person can still start there;
 *   - a refused week offers no "Build my plan" keep button: the engine will
 *     not build it, so keeping it would only fail at the save;
 *   - the day count a refusal names is offered whether it is more or fewer
 *     sessions (planFit.alternativeCopy words both).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ProOnboardingScreen.js'), 'utf8');
const { alternativeCopy } = require('../../lib/planFit');

test('the refusal text replaces the fit card body', () => {
  expect(SRC).toMatch(/const refusalText = typeof fitReview\.refusal\?\.text === 'string' \? fitReview\.refusal\.text : null;/);
  expect(SRC).toMatch(/const copy = refusalText\s*\? \{ \.\.\.fitCopy\(fitReview\.state, fitReview\), body: refusalText \}/);
});

test('a refused week has no keep button', () => {
  expect(SRC).toMatch(/\{refusalText \? null : \(\s*<>\s*<Text style=\{\[styles\.continueHint, live\.continueHint\]\}>\{keep\.detail\}<\/Text>\s*<Button variant="emphatic"\s*title=\{`Build my plan: \$\{keep\.label\}`\}/);
});

test('more or fewer sessions are offered, each in plain words', () => {
  expect(SRC).toMatch(/\.find\(a => a\.kind === 'more_sessions' \|\| a\.kind === 'fewer_sessions'\)/);
  const fewer = alternativeCopy({ kind: 'fewer_sessions', daysPerWeek: 4, sessionLengthMinutes: 60 });
  expect(fewer.label).toBe('4 x 60 min');
  expect(fewer.detail).not.toMatch(/—/);
  expect(fewer.detail).not.toBe(alternativeCopy({ kind: 'more_sessions', daysPerWeek: 4, sessionLengthMinutes: 60 }).detail);
});
