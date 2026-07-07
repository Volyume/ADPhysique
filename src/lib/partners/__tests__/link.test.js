/**
 * NEW-002 invite link build/parse — round-trips deep links, universal links and
 * bare manual-entry codes; rejects malformed input.
 */
import {
  isValidInviteCode, buildInviteLinks, parseInviteCode, inviteShareMessage,
} from '../link';

describe('isValidInviteCode', () => {
  test('accepts 8+ hex/alnum', () => expect(isValidInviteCode('A1B2C3D4')).toBe(true));
  test('lowercase normalised', () => expect(isValidInviteCode('a1b2c3d4e5')).toBe(true));
  test('rejects too short', () => expect(isValidInviteCode('ABC123')).toBe(false));
  test('rejects symbols', () => expect(isValidInviteCode('A1B2-C3D4')).toBe(false));
  test('rejects non-string', () => expect(isValidInviteCode(null)).toBe(false));
});

describe('buildInviteLinks', () => {
  test('builds deep + web links, upper-cased', () => {
    expect(buildInviteLinks('a1b2c3d4e5')).toEqual({
      code: 'A1B2C3D4E5',
      deepLink: 'volyume://partner/A1B2C3D4E5',
      webLink: 'https://volyume.app/partner/A1B2C3D4E5',
    });
  });
});

describe('parseInviteCode', () => {
  test('from a deep link', () =>
    expect(parseInviteCode('volyume://partner/A1B2C3D4E5')).toBe('A1B2C3D4E5'));
  test('from a universal link', () =>
    expect(parseInviteCode('https://volyume.app/partner/A1B2C3D4E5')).toBe('A1B2C3D4E5'));
  test('from a universal link with trailing query', () =>
    expect(parseInviteCode('https://volyume.app/partner/A1B2C3D4E5?utm=x')).toBe('A1B2C3D4E5'));
  test('from a bare typed code (lowercase, padded)', () =>
    expect(parseInviteCode('  a1b2c3d4  ')).toBe('A1B2C3D4'));
  test('rejects a malformed code', () =>
    expect(parseInviteCode('volyume://partner/short')).toBeNull());
  test('rejects an unrelated link', () =>
    expect(parseInviteCode('https://example.com/x')).toBeNull());
  test('rejects empty', () => expect(parseInviteCode('')).toBeNull());
  // Load-bearing: OAuth callback links must NOT be parsed as invite codes, or
  // App.js would misroute auth deep links to the Partner screen instead of the
  // session exchange (handlePartnerDeepLink runs before handleAuthDeepLink).
  test('rejects the OAuth PKCE callback link', () =>
    expect(parseInviteCode('volyume://?code=abc123def456')).toBeNull());
  test('rejects the OAuth implicit-token callback link', () =>
    expect(parseInviteCode('volyume://#access_token=abc123def456&refresh_token=x')).toBeNull());
});

describe('inviteShareMessage', () => {
  test('includes the web link and the tellable line', () => {
    const msg = inviteShareMessage({ webLink: 'https://volyume.app/partner/ABCD1234' });
    expect(msg).toContain('https://volyume.app/partner/ABCD1234');
    expect(msg).toContain('one daily cheer');
    expect(msg).toContain('any win I choose to send');
    expect(msg).toContain('No food, photos, body metrics or feed');
  });
});
