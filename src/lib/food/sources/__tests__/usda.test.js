/**
 * AC-12 (codex-adversarial-audit-triage-2026-07-12.md): the USDA API key
 * must be read via STATIC `process.env.EXPO_PUBLIC_...` dot-access.
 *
 * babel-preset-expo / Metro only inline EXPO_PUBLIC_* vars at build time
 * when the access is a static dot path; a computed lookup
 * (`process.env[name]`) is never inlined, so in a release bundle it
 * resolves to undefined and USDA silently never runs. Jest has a real
 * process.env, so a behavioural test against `_apiKey()` cannot tell the
 * two forms apart -- both "work" under Jest even though only the static
 * form survives a release build. This suite pins the fix at the source
 * level (the only way to catch a regression back to computed access)
 * plus a behavioural check that the key is still read correctly.
 */
import fs from 'fs';
import path from 'path';
import { searchUsda, lookupUsdaById, lookupBarcodeUsda } from '../usda';

const SOURCE = fs.readFileSync(
  path.join(__dirname, '../usda.js'),
  'utf8',
);

describe('AC-12: USDA key read via static dot-access', () => {
  test('the key is read via process.env.EXPO_PUBLIC_USDA_API_KEY (static dot-access)', () => {
    expect(SOURCE).toMatch(/process\.env\.EXPO_PUBLIC_USDA_API_KEY/);
  });

  test('no computed process.env[...] lookup remains for the USDA key', () => {
    expect(SOURCE).not.toMatch(/process\.env\[[^\]]*USDA[^\]]*\]/);
  });

  describe('behavioural: functions short-circuit without the key', () => {
    const realEnv = process.env.EXPO_PUBLIC_USDA_API_KEY;
    afterEach(() => {
      if (realEnv === undefined) delete process.env.EXPO_PUBLIC_USDA_API_KEY;
      else process.env.EXPO_PUBLIC_USDA_API_KEY = realEnv;
    });

    test('searchUsda returns [] with no key set, and never calls fetch', async () => {
      delete process.env.EXPO_PUBLIC_USDA_API_KEY;
      const realFetch = global.fetch;
      global.fetch = jest.fn();
      await expect(searchUsda('chicken breast')).resolves.toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
      global.fetch = realFetch;
    });

    test('lookupUsdaById and lookupBarcodeUsda return null with no key set', async () => {
      delete process.env.EXPO_PUBLIC_USDA_API_KEY;
      await expect(lookupUsdaById('123')).resolves.toBeNull();
      await expect(lookupBarcodeUsda('012345678905')).resolves.toBeNull();
    });

    test('searchUsda issues a request with the key in the X-Api-Key header once set', async () => {
      process.env.EXPO_PUBLIC_USDA_API_KEY = 'test-key-123';
      const realFetch = global.fetch;
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ foods: [] }),
      }));
      await searchUsda('chicken breast');
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [, opts] = global.fetch.mock.calls[0];
      expect(opts.headers['X-Api-Key']).toBe('test-key-123');
      global.fetch = realFetch;
    });
  });
});
