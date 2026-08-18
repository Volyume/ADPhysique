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
  // Re-pinned 2026-08-18 (founder device order, locked doc amended in the
  // same commit): the same two load-bearing facts, now in plain English -
  // the advanced option must still state the concrete mechanism (three
  // warning signs instead of two) and the closing line must still promise
  // the un-movable floor. The MECHANISM is unchanged; only the words are.
  test('the advanced option states the threshold mechanism in user copy', () => {
    expect(SRC).toMatch(/Wait for three warning signs instead of two before pausing my cut\./);
  });

  test('the closing line promises the absolute safety floor survives either choice', () => {
    expect(SRC).toMatch(
      /Whichever you choose, one limit never moves: Volyume will never coach you below the minimum amount of food your body needs\./,
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
