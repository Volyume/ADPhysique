import { generateUUID, secureRandomBytes } from '../uuid';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateUUID', () => {
  test('produces a v4-shaped id (version 4, variant 8-b)', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateUUID()).toMatch(V4);
    }
  });

  test('ids are unique across many calls', () => {
    const seen = new Set();
    for (let i = 0; i < 5000; i++) seen.add(generateUUID());
    expect(seen.size).toBe(5000);
  });

  test('a prefix char replaces the first character only, keeping the shape', () => {
    const id = generateUUID('q');
    expect(id[0]).toBe('q');
    expect(id).toHaveLength(36);
    // The rest after the prefix is still hex + the v4 dashes/markers.
    expect(id.slice(1)).toMatch(/^[0-9a-f]{7}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('the q-prefixed queue id matches the format the inline copy produced', () => {
    // The old syncQueue uid() built 'qxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.
    expect(generateUUID('q')).toMatch(/^q[0-9a-f]{7}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('secureRandomBytes', () => {
  test('returns a Uint8Array of the requested length with byte-range values', () => {
    const bytes = secureRandomBytes(16);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes).toHaveLength(16);
    for (const b of bytes) {
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(255);
    }
  });
});

describe('generateUUID CSPRNG wiring (A2-020)', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('expo-crypto');
  });

  test('uses expo-crypto getRandomValues when the native source is available', () => {
    jest.isolateModules(() => {
      const fill = jest.fn((arr) => {
        for (let i = 0; i < arr.length; i += 1) arr[i] = i; // deterministic, in range
        return arr;
      });
      jest.doMock('expo-crypto', () => ({ getRandomValues: fill }));
      // eslint-disable-next-line global-require
      const { generateUUID: gen } = require('../uuid');
      const id = gen();
      expect(fill).toHaveBeenCalled();
      expect(id).toMatch(V4);
      // bytes 0..15 with the version/variant bits forced gives a stable id.
      expect(id).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
    });
  });

  test('falls back to a valid v4 id when getRandomValues is missing', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-crypto', () => ({})); // no getRandomValues export
      // eslint-disable-next-line global-require
      const { generateUUID: gen } = require('../uuid');
      for (let i = 0; i < 100; i += 1) expect(gen()).toMatch(V4);
    });
  });

  test('falls back when getRandomValues throws (native module not linked)', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-crypto', () => ({
        getRandomValues: () => { throw new Error('native module not linked'); },
      }));
      // eslint-disable-next-line global-require
      const { generateUUID: gen } = require('../uuid');
      expect(gen()).toMatch(V4);
      expect(gen('q')).toMatch(/^q[0-9a-f]{7}-/);
    });
  });
});
