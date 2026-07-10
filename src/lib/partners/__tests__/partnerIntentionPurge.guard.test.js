/**
 * partnerIntentionPurge.guard.test.js — the deletion promise for the NEW shared
 * table (D5-A: partner_weekly_intentions).
 *
 * Hard lock: any new shared partner table must be purged on unpair /
 * end_partnership AND on account deletion, exactly like partner_shared_blocks
 * (migrate_100). This pins that at source level: the cloud migration's
 * end_partnership + status->ended trigger delete the intentions; the client's
 * the local unpair and account-wipe paths clear them; and the delete-account edge function
 * sweeps them too. A future edit that drops any of these fails loudly.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const migration = read('supabase/migrate_105_partner_weekly_intention.sql');
const winCardMigration = read('supabase/migrate_107_partner_win_cards.sql');
const database = read('src/lib/database.js');
const deleteAccount = read('supabase/functions/delete-account/index.ts');

describe('migrate_105: additive table + deletion promise', () => {
  test('creates the intentions table additively (IF NOT EXISTS)', () => {
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS partner_weekly_intentions/);
    expect(migration).toMatch(/PRIMARY KEY \(pair_id, user_id, week_start\)/);
  });

  // Header contract updated 2026-07-10: cloud migrations moved to the
  // Claude-run model (founder-authorised per batch with the exact
  // "run against production" phrase; see supabase/README) and 105 was
  // applied to EU-Dublin that day. The pin now asserts the applied status
  // is recorded honestly, not that the file stays pending forever.
  test('applied remotely under founder authorisation, safe to re-run (header contract)', () => {
    expect(migration).toMatch(/Applied remotely:\s*YES \(2026-07-10/);
    expect(migration).toMatch(/founder-authorised "run against production"/);
    expect(migration).toMatch(/Safe to re-run:\s*YES/);
  });

  test('end_partnership deletes the pair intentions (explicit unpair purge)', () => {
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION end_partnership/);
    expect(migration).toMatch(/DELETE FROM partner_weekly_intentions\s+WHERE pair_id = _pair_id/);
    // Parity: it still purges the pre-existing shared rows too (100 body kept).
    expect(migration).toMatch(/DELETE FROM partner_week_signals/);
    expect(migration).toMatch(/DELETE FROM partner_cheers/);
    expect(migration).toMatch(/DELETE FROM partner_shared_blocks/);
  });

  test('a status->ended trigger purges intentions (covers delete_user_data + edge fn)', () => {
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION _partnership_ended_purge_intentions/);
    expect(migration).toMatch(/DELETE FROM partner_weekly_intentions WHERE pair_id = NEW\.id/);
    expect(migration).toMatch(/AFTER UPDATE OF status ON partnerships/);
  });
});

describe('client + edge purge paths clear intentions', () => {
  test('deleteLocalPairSharedData (unpair, and ended-on-pull) clears intentions', () => {
    const fn = database.slice(database.indexOf('export async function deleteLocalPairSharedData'));
    expect(fn).toMatch(/DELETE FROM partner_weekly_intentions WHERE pair_id = \?/);
  });

  test('wipeAllUserData partner block clears intentions', () => {
    expect(database).toMatch(/'partner_weekly_intentions'/);
  });

  test('delete-account edge function sweeps the pair intentions (account deletion)', () => {
    expect(deleteAccount).toMatch(/partner_weekly_intentions'\)\.delete\(\)\.in\('pair_id', pairIds\)/);
  });
});

describe('migrate_107: partner win cards keep the same deletion promise', () => {
  test('creates win cards as a sanitized pair-scoped table', () => {
    expect(winCardMigration).toMatch(/CREATE TABLE IF NOT EXISTS partner_win_cards/);
    expect(winCardMigration).toMatch(/card_type IN \('workout_summary', 'personal_record', 'block_milestone', 'progress_card'\)/);
  });

  test('end_partnership and status-ended trigger purge win cards', () => {
    expect(winCardMigration).toMatch(/DELETE FROM partner_win_cards\s+WHERE pair_id = _pair_id/);
    expect(winCardMigration).toMatch(/DELETE FROM partner_win_cards WHERE pair_id = NEW\.id/);
    expect(winCardMigration).toMatch(/AFTER UPDATE OF status ON partnerships/);
  });

  test('local and delete-account purge paths clear win cards', () => {
    expect(database).toMatch(/DELETE FROM partner_win_cards WHERE pair_id = \?/);
    expect(database).toMatch(/'partner_win_cards'/);
    expect(deleteAccount).toMatch(/partner_win_cards'\)\.delete\(\)\.in\('pair_id', pairIds\)/);
  });
});
