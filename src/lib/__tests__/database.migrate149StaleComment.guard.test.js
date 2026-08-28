/**
 * CC33 D112 R6 (injury/disability audit W4, 2026-08-28) - closes the
 * stale-comment finding (FINDINGS.md roll-up row "Stale migration
 * comments", database.js:2703; UNVERIFIED 1 in S2-T2-LIVE-TRACE.md,
 * CLOSED: migration 149 is APPLIED per supabase/README.md's 2026-08-21
 * entry, but the local migration list's comment still said "written, NOT
 * applied; founder-gated"). Comment-only fix; this pins the corrected
 * wording so it cannot silently drift back to the stale claim.
 *
 * Note for the lead / W5: a THIRD comment with the identical stale
 * "written, NOT applied; founder-gated" phrasing survives at
 * database.js's migrate_151_weight_bearing_hands.sql note (a few lines
 * below the one this test pins) - migration 151 is in the SAME
 * 2026-08-21 applied batch per supabase/README.md, so that comment is
 * equally stale. It is outside this campaign item's named scope
 * (database.js ~2699-2704 only) and this builder's file lane, so it is
 * deliberately left untouched here and flagged instead.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');

describe('database.js migrate_149 comment no longer claims "NOT applied"', () => {
  const site = SRC.indexOf('migrate_149_swap_cause_effective_choice.sql');

  test('reads the real comment (sanity)', () => {
    expect(site).toBeGreaterThan(-1);
  });

  test('the stale "(written, NOT applied; founder-gated)" claim is gone from this comment', () => {
    const nearby = SRC.slice(site, site + 200);
    expect(nearby).not.toMatch(/written, NOT applied; founder-gated/);
  });

  test('the comment now records migration 149 as applied, with the record it cites', () => {
    const nearby = SRC.slice(site, site + 200);
    expect(nearby).toMatch(/APPLIED 2026-08-21/);
    expect(nearby).toContain('supabase/README.md');
  });
});
