const fs = require('fs');
const path = require('path');

const EDGE = fs.readFileSync(path.resolve(__dirname, '../../../supabase/functions/partner-cheer/index.ts'), 'utf8');
const MIGRATION = fs.readFileSync(path.resolve(__dirname, '../../../supabase/migrate_155_partner_cheer_server_date.sql'), 'utf8');

describe('partner cheer daily rate boundary', () => {
  test('the Edge Function never derives sent_on from request JSON', () => {
    expect(EDGE).toMatch(/const sentOn = new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/);
    expect(EDGE).not.toMatch(/body\.sentOn/);
    expect(EDGE).toMatch(/valid pairId is required/);
  });

  test('direct authenticated inserts are restricted to the same server day', () => {
    expect(MIGRATION).toMatch(/FOR INSERT TO authenticated/);
    expect(MIGRATION).toMatch(/sent_on = \(now\(\) AT TIME ZONE 'UTC'\)::date/);
    expect(MIGRATION).toMatch(/auth\.uid\(\) = sender_id/);
    expect(MIGRATION).toMatch(/p\.status = 'active'/);
  });
});

