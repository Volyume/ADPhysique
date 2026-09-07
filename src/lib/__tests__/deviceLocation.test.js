/**
 * deviceLocation.test.js (community product audit 2026-09-07,
 * `docs/community-product-audit-2026-09-07/30-IMPLEMENTATION.md` section
 * 1.2).
 *
 * What this suite pins: the stub's exact contract, so `GymPicker` can be
 * built and tested against it before the founder's location-permission
 * dependency decision lands, and so a future "arming" edit that forgets
 * one branch fails loudly here rather than at runtime.
 */

import { isAvailable, getApproximatePosition } from '../deviceLocation';

describe('deviceLocation (stub, no location API wired in)', () => {
  test('isAvailable is false', () => {
    expect(isAvailable()).toBe(false);
  });

  test('getApproximatePosition always rejects with code unavailable', async () => {
    await expect(getApproximatePosition()).rejects.toMatchObject({ code: 'unavailable' });
  });

  test('the module\'s CODE never names an expo-location API', () => {
    // A source guard, not a behavioural one: the failure mode is someone
    // wiring the real API into this file without also flipping isAvailable,
    // which the two tests above would not catch on their own. Comments are
    // stripped first (same convention as
    // `community.privacy.guard.test.js`'s `code()`): the header
    // deliberately NAMES `expo-location` as documentation of what is NOT
    // wired in, which is the opposite of a read.
    const fs = require('fs');
    const path = require('path');
    const raw = fs.readFileSync(path.join(__dirname, '../deviceLocation.js'), 'utf8');
    const source = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    for (const pattern of [
      /expo-location/i,
      /watchPositionAsync/,
      /getCurrentPositionAsync/,
      /getLastKnownPositionAsync/,
      /requestForegroundPermissionsAsync/,
      /requestBackgroundPermissionsAsync/,
    ]) {
      expect(pattern.test(source)).toBe(false);
    }
  });
});
