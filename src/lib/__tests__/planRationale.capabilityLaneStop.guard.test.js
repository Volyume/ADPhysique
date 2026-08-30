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
    // Review round 2 (R2-1) re-keyed both fields: the preference lane is
    // asked directly (id + family - the composite senior also consults
    // capability, whose unknown rank made it unusable for attribution),
    // and REPLACE demands a DEFINITE blocking conflict, exactly
    // blockAdvisor's gate. Unknown drives neither field - a custom
    // lift's NULL demand columns never earn "This sits outside how you
    // train." nor a preference exclusion.
    expect(gen).toContain('excluded: intentBlocked || familyAvoided,');
    // Round 18 (R18-2) re-keyed the capability pair: REPLACE takes the
    // definite BASELINE fact alone (allowance-carved via
    // baselineConflicts), and the KEEP-ranking facts are the LIVE
    // overlay (the shared removalExcusalConflicts gate) plus the
    // open-episode remainder - the old proxy let a held or declined
    // rule, which drives nothing (D120 ruling 2), veto a live baseline
    // replace and call a permanent conflict temporary.
    expect(gen).toContain('capabilityIneligible: capBaselineBlocked,');
    expect(gen).toContain('capBaselineBlocked = baselineConflicts(intentState.capability, row).some((c) => !c.unknown);');
    expect(gen).toContain('capabilityAffected = removalExcusalConflicts(episodeDefinite).length > 0;');
    expect(gen).toContain('capabilityEpisodeOpen = !capabilityAffected && episodeDefinite.length > 0;');
    // And the block-review engine keeps the SAME gates, so the two
    // cannot drift apart again (round 2's I9 finding).
    const adv = fs.readFileSync(path.join(__dirname, '..', 'blockAdvisor.js'), 'utf8');
    expect(adv).toContain('capabilityAffected = removalExcusalConflicts(episodeDefinite).length > 0;');
    expect(adv).toContain('capabilityEpisodeOpen = !capabilityAffected && episodeDefinite.length > 0;');
    expect(adv).toContain('baselineConflicts(intentState.capability, row).some((c) => !c.unknown)');
  });
});
