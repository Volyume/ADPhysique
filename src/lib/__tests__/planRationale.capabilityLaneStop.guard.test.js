/**
 * CC33 D112 R6 (injury/disability audit, 2026-08-28) - T1-08, closed at
 * the root the same day the W4B builder STOPPED on it.
 *
 * History this suite carries: planAutoGen's buildSlotEvidence collapsed
 * two distinct causes into one boolean -
 *   excluded: intentBlocked || (!senior && !capabilityAffected)
 * - so a BASELINE capability conflict (senior fails, capabilityAffected
 * is episode-only) reached programmeEpoch as the same `excluded` a
 * genuine preference sets, earned SLOT_REASON.USER_EXCLUDED, and
 * planRationale told the user "You asked not to be suggested this."
 * about a rule that means "I cannot do this". The W4B builder traced
 * exactly that and STOPPED (the fix needed planAutoGen + programmeEpoch,
 * outside its lane) with this suite pinning the gap; the lead then
 * landed the root fix, and per the original pin's own instruction the
 * suite converted from documenting the gap to holding the fix.
 *
 * The chain now: planAutoGen asks capability directly
 * (capabilityIneligible, baseline-only - episodes keep CAPABILITY_HOLD),
 * programmeEpoch replaces with SLOT_REASON.CAPABILITY_EXCLUDED ranked
 * after the episode KEEP, and planRationale speaks the capability
 * lane's own words. The preference line is untouched for genuine
 * preferences.
 */
const { SLOT_REASON, slotVerdict, SLOT_VERDICT } = require('../programmeEpoch');
const { explainReason } = require('../planRationale');

describe('T1-08 closed: capability exclusions carry their own reason and words', () => {
  test('USER_EXCLUDED still renders the genuine-preference copy, unchanged', () => {
    expect(explainReason(SLOT_REASON.USER_EXCLUDED)).toBe('You asked not to be suggested this.');
  });

  test('CAPABILITY_EXCLUDED exists, replaces, and never wears the preference words', () => {
    expect(SLOT_REASON.CAPABILITY_EXCLUDED).toBe('capability_excluded');
    const copy = explainReason(SLOT_REASON.CAPABILITY_EXCLUDED);
    expect(copy).toBe('This sits outside how you train.');
    expect(copy).not.toContain('asked not to be suggested');
  });

  test('the verdict engine routes each lane to its own reason', () => {
    // Preference: excluded alone -> USER_EXCLUDED (unchanged).
    expect(slotVerdict({ excluded: true }, {})).toEqual(
      { verdict: SLOT_VERDICT.REPLACE, reason: SLOT_REASON.USER_EXCLUDED },
    );
    // Baseline capability: its own reason, never the preference one.
    expect(slotVerdict({ capabilityIneligible: true }, {})).toEqual(
      { verdict: SLOT_VERDICT.REPLACE, reason: SLOT_REASON.CAPABILITY_EXCLUDED },
    );
    // Episode outranks: temporary is an overlay, the document keeps it.
    expect(slotVerdict({ capabilityAffected: true, capabilityIneligible: true }, {})).toEqual(
      { verdict: SLOT_VERDICT.KEEP, reason: SLOT_REASON.CAPABILITY_HOLD },
    );
  });

  test('CAPABILITY_HOLD keeps its own distinct copy - the episode keep is a different case', () => {
    expect(explainReason(SLOT_REASON.CAPABILITY_HOLD)).toBe(
      'This sits outside how you train while your temporary change lasts, so it is kept as it is rather than judged.',
    );
  });

  test('the evidence split is pinned at source: capability never rides the preference boolean', () => {
    const fs = require('fs');
    const path = require('path');
    const gen = fs.readFileSync(path.join(__dirname, '..', 'planAutoGen.js'), 'utf8');
    expect(gen).toContain('excluded: intentBlocked || (!senior && capEligible && !capabilityAffected),');
    expect(gen).toContain('capabilityIneligible: !capEligible && !capabilityAffected,');
  });
});
