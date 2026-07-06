const fs = require('fs');
const path = require('path');

const EDGE = fs.readFileSync(
  path.resolve(__dirname, '../../../../supabase/functions/partner-cheer/index.ts'),
  'utf8',
);

describe('partner cheer edge function compatibility guards', () => {
  test('sender display name reads from the Volyume profile table', () => {
    expect(EDGE).toContain(".from('users_profile')");
    expect(EDGE).not.toContain(".from('profiles')");
  });

  test('cheer insert retries without kind while the cloud schema is rolling forward', () => {
    expect(EDGE).toContain('function isMissingKindColumn');
    expect(EDGE).toContain(".insert({ pair_id: pairId, sender_id: senderId, sent_on: sentOn, kind: ackKind })");
    expect(EDGE).toContain(".insert({ pair_id: pairId, sender_id: senderId, sent_on: sentOn })");
  });
});
