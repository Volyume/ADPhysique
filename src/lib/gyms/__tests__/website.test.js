/**
 * website.test.js (community product audit 2026-09-07, founder brief
 * "COMMUNITY ONBOARDING — SLICK 'WHERE DO YOU TRAIN?' GYM FINDER").
 *
 * Pins `officialWebsite()`'s two gates: operator-confirmed (a settled
 * `verification_status`, or an operator-named source), and a clean host
 * (not an aggregator or social domain from the founder's denylist).
 * Either gate failing means the action is omitted entirely - the
 * function returns null, never a placeholder string.
 */

import { officialWebsite } from '../website';

const VERIFIED = { verification_status: 'verified', website: 'https://www.puregym.com/gyms/motherwell/' };

describe('operator-confirmed + clean host: shows', () => {
  test('verified with a clean host returns the trimmed website', () => {
    expect(officialWebsite(VERIFIED)).toBe('https://www.puregym.com/gyms/motherwell/');
  });

  test('user_submitted_verified (a second confirmation landed) counts as confirmed', () => {
    expect(officialWebsite({
      verification_status: 'user_submitted_verified', website: 'https://theironroom.co.uk',
    })).toBe('https://theironroom.co.uk');
  });

  test('moderator_verified counts as confirmed', () => {
    expect(officialWebsite({
      verification_status: 'moderator_verified', website: 'http://www.davidlloyd.co.uk',
    })).toBe('http://www.davidlloyd.co.uk');
  });

  test('an operator-named source counts as confirmed even when unverified', () => {
    expect(officialWebsite({
      verification_status: 'unverified',
      source_names: ['Operator feed'],
      website: 'https://www.thegymgroup.com',
    })).toBe('https://www.thegymgroup.com');
  });

  test('trims surrounding whitespace on the stored website', () => {
    expect(officialWebsite({ ...VERIFIED, website: '  https://www.puregym.com  ' }))
      .toBe('https://www.puregym.com');
  });
});

describe('not operator-confirmed: hides', () => {
  test('unverified, no operator source', () => {
    expect(officialWebsite({ verification_status: 'unverified', website: 'https://www.puregym.com' })).toBeNull();
  });

  test('user_submitted_pending (one confirmation only)', () => {
    expect(officialWebsite({
      verification_status: 'user_submitted_pending', website: 'https://www.puregym.com',
    })).toBeNull();
  });

  test('rejected', () => {
    expect(officialWebsite({ verification_status: 'rejected', website: 'https://www.puregym.com' })).toBeNull();
  });

  test('no verification_status at all', () => {
    expect(officialWebsite({ website: 'https://www.puregym.com' })).toBeNull();
  });
});

describe('aggregator or social host: hides even when confirmed', () => {
  const cases = [
    'https://www.google.com/maps/place/puregym',
    'https://www.facebook.com/puregymuk',
    'https://www.instagram.com/puregym',
    'https://www.yell.com/biz/puregym-motherwell',
    'https://www.yelp.com/biz/puregym-motherwell',
    'https://www.tripadvisor.co.uk/Attraction_Review-puregym',
    'https://www.hussle.com/gyms/puregym-motherwell',
    'https://www.classpass.com/studios/puregym-motherwell',
    'https://www.bing.com/maps?q=puregym',
    'https://www.tiktok.com/@puregym',
    'https://x.com/puregym',
    'https://twitter.com/puregym',
    'https://maps.apple.com/?q=puregym',
  ];
  test.each(cases)('%s is never shown', (website) => {
    expect(officialWebsite({ verification_status: 'verified', website })).toBeNull();
  });

  test('a subdomain of a denied host is caught too', () => {
    expect(officialWebsite({
      verification_status: 'verified', website: 'https://business.facebook.com/puregym',
    })).toBeNull();
  });

  test('apple.com NOT under /maps is not denied by the apple.com/maps rule', () => {
    expect(officialWebsite({
      verification_status: 'verified', website: 'https://apps.apple.com/gb/app/puregym',
    })).toBe('https://apps.apple.com/gb/app/puregym');
  });

  test('a short domain that merely contains the letters "x.com" is not wrongly denied', () => {
    expect(officialWebsite({
      verification_status: 'verified', website: 'https://www.apexfitness.com',
    })).toBe('https://www.apexfitness.com');
  });
});

describe('missing or malformed website: hides', () => {
  test('no website at all', () => {
    expect(officialWebsite({ verification_status: 'verified', website: null })).toBeNull();
  });

  test('an empty string', () => {
    expect(officialWebsite({ verification_status: 'verified', website: '   ' })).toBeNull();
  });

  test('not a URL at all', () => {
    expect(officialWebsite({ verification_status: 'verified', website: 'puregym motherwell' })).toBeNull();
  });

  test('a non-http(s) scheme', () => {
    expect(officialWebsite({ verification_status: 'verified', website: 'ftp://puregym.com' })).toBeNull();
  });

  test('a null venue', () => {
    expect(officialWebsite(null)).toBeNull();
  });
});
