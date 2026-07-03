/**
 * Source guard for the Surface 4 locked copy on GoalLockConsentScreen
 * (COACHING_VOICE_SYNTHESIS_LOCKED.md:360-395).
 *
 * Wave A B1 (2026-07-03): the shipped screen had silently dropped two
 * load-bearing sentences from the founder-locked spec — the numeric
 * threshold mechanism on the advanced option and the closing reassurance
 * that the absolute safety floor survives either choice. This guard pins
 * both (plus the at-risk-users context line) at source level so the copy
 * can never drift from the locked doc again without failing here.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'GoalLockConsentScreen.js'),
  'utf8',
);

describe('GoalLockConsentScreen carries the locked Surface 4 copy', () => {
  test('the advanced option states the threshold mechanism in user copy', () => {
    expect(SRC).toMatch(/Raise the safety threshold from 2\s+signals to 3\./);
  });

  test('the closing line promises the absolute safety floor survives either choice', () => {
    expect(SRC).toMatch(
      /Either choice keeps the absolute safety floor \(eating\s+below the minimum lean-mass energy threshold\) in place\./,
    );
  });

  test('the at-risk-users context paragraph is present', () => {
    expect(SRC).toMatch(
      /These checks are there for the at-risk users that\s+calorie-tracking apps have historically harmed\./,
    );
  });

  test('the standard option never reads as recommended (locked rejection note)', () => {
    // The locked doc rejects "recommended" framing on either option.
    expect(SRC).not.toMatch(/[Rr]ecommended/);
  });
});
