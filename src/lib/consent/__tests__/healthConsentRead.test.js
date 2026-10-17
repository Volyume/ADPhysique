/**
 * B2 (final audit 2026-10-17): the shared Article 9 consent read that both
 * the sign-in resolution and its re-resolution of an unresolved consent use
 * (src/lib/consent/healthConsentRead.js).
 *
 * Pins, against the real function, what it must NEVER do:
 *   - grant consent from anything but the post-grant cache or a cloud row
 *     that says health_data_consent === true;
 *   - turn a failure (no client, a cloud error, a throw) into anything but
 *     'unresolved' (the caller keeps null: the gate stays closed);
 *   - turn a failure into 'not_granted' (that would send a person who
 *     already consented back into the un-skippable gate, A2-014);
 *   - write the cache on anything but a cloud grant.
 */
import { readHealthConsentStatus, healthConsentCacheKey } from '../healthConsentRead';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: jest.fn(async (k) => (map.has(k) ? map.get(k) : null)),
    setItem: jest.fn(async (k, v) => { map.set(k, v); }),
  };
}

function cloudReturning(result) {
  const maybeSingle = jest.fn(async () => result);
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  return { client: { from }, from, select, eq, maybeSingle };
}

const UID = 'user-1';

describe('readHealthConsentStatus: cache first, then cloud', () => {
  test('the cache key is the one the consent screen and withdrawal use', () => {
    expect(healthConsentCacheKey(UID)).toBe('@volyume_health_consent_user-1');
  });

  test("a cached 'true' grants without a cloud read", async () => {
    const storage = memoryStorage({ [healthConsentCacheKey(UID)]: 'true' });
    const cloud = cloudReturning({ data: null, error: null });
    const res = await readHealthConsentStatus({ client: cloud.client, userId: UID, storage });
    expect(res.status).toBe('granted');
    expect(res.source).toBe('cache');
    expect(cloud.from).not.toHaveBeenCalled();
  });

  test('a cloud grant grants and writes the cache', async () => {
    const storage = memoryStorage();
    const cloud = cloudReturning({ data: { health_data_consent: true }, error: null });
    const res = await readHealthConsentStatus({ client: cloud.client, userId: UID, storage });
    expect(res.status).toBe('granted');
    expect(cloud.eq).toHaveBeenCalledWith('id', UID);
    expect(storage.map.get(healthConsentCacheKey(UID))).toBe('true');
  });

  test('a cloud row without consent is not_granted and never writes the cache', async () => {
    for (const data of [{ health_data_consent: false }, { health_data_consent: null }, null]) {
      const storage = memoryStorage();
      const res = await readHealthConsentStatus({
        client: cloudReturning({ data, error: null }).client, userId: UID, storage,
      });
      expect(res.status).toBe('not_granted');
      expect(storage.setItem).not.toHaveBeenCalled();
    }
  });

  test("a truthy but non-true cloud value is never read as a grant", async () => {
    const res = await readHealthConsentStatus({
      client: cloudReturning({ data: { health_data_consent: 'true' }, error: null }).client,
      userId: UID,
      storage: memoryStorage(),
    });
    expect(res.status).toBe('not_granted');
  });
});

describe('readHealthConsentStatus: fails CLOSED, never to false', () => {
  test('a cloud error is unresolved and writes nothing', async () => {
    const storage = memoryStorage();
    const res = await readHealthConsentStatus({
      client: cloudReturning({ data: { health_data_consent: true }, error: { message: 'offline' } }).client,
      userId: UID,
      storage,
    });
    expect(res.status).toBe('unresolved');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('a thrown cloud read is unresolved and carries the error for logging', async () => {
    const boom = new Error('network down');
    const client = { from: () => { throw boom; } };
    const res = await readHealthConsentStatus({ client, userId: UID, storage: memoryStorage() });
    expect(res.status).toBe('unresolved');
    expect(res.thrown).toBe(boom);
  });

  test('no client and no cache is unresolved, not a grant and not a refusal', async () => {
    const res = await readHealthConsentStatus({ client: null, userId: UID, storage: memoryStorage() });
    expect(res.status).toBe('unresolved');
  });

  test('a failing cache read falls through to the cloud, never to a grant', async () => {
    const storage = { getItem: jest.fn(async () => { throw new Error('storage'); }), setItem: jest.fn() };
    const res = await readHealthConsentStatus({
      client: cloudReturning({ data: null, error: { message: 'offline' } }).client, userId: UID, storage,
    });
    expect(res.status).toBe('unresolved');
  });

  test('no user id is unresolved', async () => {
    const res = await readHealthConsentStatus({ client: cloudReturning({}).client, userId: null, storage: memoryStorage() });
    expect(res.status).toBe('unresolved');
  });
});
