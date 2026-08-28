/**
 * CC33 D112 R6 (injury/disability audit W4, 2026-08-28) - closes the
 * stale-comment finding (FINDINGS.md roll-up row "Stale migration
 * comments"; UNVERIFIED 1 in S2-T2-LIVE-TRACE.md, CLOSED: migrations 145,
 * 146, 147, 148, 149 and 151 are APPLIED per supabase/README.md's
 * 2026-08-21 entry, but this file's header still said "founder-gated,
 * NOT applied"). Comment-only fix; this pins the corrected wording so it
 * cannot silently drift back to the stale claim.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'capabilityConstraints.js'), 'utf8');

describe('capabilityConstraints.js header no longer claims migration 145 is unapplied', () => {
  test('the stale "founder-gated" / "until migration 145 is applied" claim is gone', () => {
    expect(SRC).not.toMatch(/Fails soft \(queued retry\) until migration 145 is\s*\n?\s*\* applied - founder-gated\./);
  });

  test('the header now records migration 145 as applied, with the record it cites', () => {
    expect(SRC).toMatch(/Migration 145 is APPLIED \(2026-08-21/);
    expect(SRC).toContain('supabase/README.md');
  });
});
