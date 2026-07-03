/**
 * partnerNames.guard.test.js — source-level guard for the real-partner-names
 * addition (founder 2026-07-03), pinned against migrate_102 the same way other
 * founder rules are pinned (fs.readFileSync + regex regression guards).
 *
 * What it pins and why: the name that crosses between partners must be the
 * SERVER-side snapshot of the enrolment first name — first whitespace token,
 * trimmed, capped at 40 — never a client-supplied string, never a full name.
 * The mint RPC snapshots the INVITER (member_a_first_name); the redeem RPC
 * snapshots the INVITEE (member_b_first_name) and returns the inviter's name.
 * The derivation lives in SQL, so it is pinned here at source level: a later
 * edit that widens the token, lifts the cap, sources the name from the client,
 * or drops a snapshot fails loudly and must be a deliberate reviewed change.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const sql = fs.readFileSync(
  path.join(ROOT, 'supabase', 'migrate_102_partner_safety_consent.sql'),
  'utf8',
);

describe('migrate_102 partner first names (founder addition)', () => {
  test('adds the two nullable snapshot columns additively', () => {
    expect(sql).toMatch(/ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS member_a_first_name text;/);
    expect(sql).toMatch(/ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS member_b_first_name text;/);
  });

  test('derives FIRST token of the trimmed enrolment name, capped at 40, from users_profile', () => {
    // The one derivation seam both RPCs go through.
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION _partner_first_name\(_user_id uuid\)/);
    expect(sql).toMatch(/left\(split_part\(btrim\(coalesce\(p\.first_name, ''\)\), ' ', 1\), 40\)/);
    expect(sql).toMatch(/FROM users_profile p/);
    // Empty derivations collapse to NULL so the client fallback holds.
    expect(sql).toMatch(/nullif\(left\(split_part/);
  });

  test('the name source is server-side: no client-supplied name argument on either RPC', () => {
    // Neither RPC signature may accept a name parameter; the server reads the
    // profile itself (SECURITY DEFINER) rather than trusting the client.
    expect(sql).not.toMatch(/create_partner_invite\([^)]*name/i);
    expect(sql).not.toMatch(/redeem_partner_invite\([^)]*name/i);
    // The derivation helper is not directly callable by clients.
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION _partner_first_name\(uuid\) FROM authenticated;/);
  });

  test("mint snapshots the INVITER's name on both the insert and reuse paths", () => {
    expect(sql).toMatch(/member_a_first_name = _partner_first_name\(uid\)/); // reuse-update
    expect(sql).toMatch(/member_a_first_name, created_at\)/); // insert column list
  });

  test("redeem snapshots the INVITEE's name and returns the inviter's", () => {
    expect(sql).toMatch(/member_b_first_name = _partner_first_name\(uid\)/);
    expect(sql).toMatch(/RETURNS TABLE \(partnership_id uuid, partner_first_name text\)/);
    // Return-type change from 081's uuid requires the drop first (idempotent).
    expect(sql).toMatch(/DROP FUNCTION IF EXISTS redeem_partner_invite\(text\);/);
    // Legacy pending rows (minted pre-102) are backfilled at redeem.
    expect(sql).toMatch(/COALESCE\(prow\.member_a_first_name, _partner_first_name\(prow\.member_a\)\)/);
  });

  test('never snapshots anything wider than a first name (no full-name or email column)', () => {
    // Scan executable SQL only (the header comments legitimately SAY
    // "never full names, never emails" as the rule being pinned here).
    const executable = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(executable).not.toMatch(/full_name|last_name|surname|email/i);
  });
});
