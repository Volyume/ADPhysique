/**
 * OFF write-back queue tests.
 *
 * Mocks AsyncStorage + fetch. Verifies the consent gate, the queue
 * behaviour, retry+drop semantics, and that consent-off drops the
 * queue rather than holding it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getConsent, setConsent, queueContribution, flushQueue,
} from '../food/writeback';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k) => Promise.resolve(store.has(k) ? store.get(k) : null)),
      setItem: jest.fn((k, v) => { store.set(k, v); return Promise.resolve(); }),
      removeItem: jest.fn((k) => { store.delete(k); return Promise.resolve(); }),
      __reset: () => store.clear(),
    },
  };
});

// trackEvent in engineTelemetry tries to write to SQLite. Stub it.
jest.mock('../engineTelemetry', () => ({
  track: jest.fn(() => Promise.resolve(null)),
}));

beforeEach(() => {
  AsyncStorage.__reset();
  global.fetch = undefined;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('OFF write-back consent', () => {
  test('defaults to off', async () => {
    expect(await getConsent()).toBe(false);
  });
  test('persists when set', async () => {
    await setConsent(true);
    expect(await getConsent()).toBe(true);
    await setConsent(false);
    expect(await getConsent()).toBe(false);
  });
});

describe('queueContribution gating', () => {
  test('no-ops when consent is off', async () => {
    await queueContribution('user-1', { barcode: '123', name: 'X' });
    const raw = await AsyncStorage.getItem('@volyume_off_writeback_queue_v1');
    expect(raw).toBeNull();
  });
  test('no-ops when barcode is missing', async () => {
    await setConsent(true);
    await queueContribution('user-1', { name: 'X' });
    const raw = await AsyncStorage.getItem('@volyume_off_writeback_queue_v1');
    expect(raw).toBeNull();
  });
  test('queues when consent + barcode present', async () => {
    await setConsent(true);
    await queueContribution('user-1', { barcode: '123', name: 'X', kcal100g: 200 });
    const raw = await AsyncStorage.getItem('@volyume_off_writeback_queue_v1');
    const arr = JSON.parse(raw);
    expect(arr).toHaveLength(1);
    expect(arr[0].contribution.barcode).toBe('123');
    expect(arr[0].attempts).toBe(0);
  });
});

describe('flushQueue', () => {
  test('drops queue when consent flipped off', async () => {
    await setConsent(true);
    await queueContribution('u', { barcode: '1', name: 'A' });
    await setConsent(false);
    await flushQueue();
    const raw = await AsyncStorage.getItem('@volyume_off_writeback_queue_v1');
    const arr = raw ? JSON.parse(raw) : [];
    expect(arr).toHaveLength(0);
  });

  test('removes successfully-posted items', async () => {
    await setConsent(true);
    await queueContribution('u', { barcode: '1', name: 'A', kcal100g: 200 });
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    await flushQueue();
    expect(global.fetch).toHaveBeenCalled();
    const arr = JSON.parse(await AsyncStorage.getItem('@volyume_off_writeback_queue_v1'));
    expect(arr).toHaveLength(0);
  });

  test('retains items on failure and increments attempts', async () => {
    await setConsent(true);
    await queueContribution('u', { barcode: '1', name: 'A' });
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    await flushQueue();
    const arr = JSON.parse(await AsyncStorage.getItem('@volyume_off_writeback_queue_v1'));
    expect(arr).toHaveLength(1);
    expect(arr[0].attempts).toBe(1);
  });

  test('drops items that exceed MAX_RETRIES', async () => {
    await setConsent(true);
    await queueContribution('u', { barcode: '1', name: 'A' });
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    // Three failing flushes -> attempts go 0->1->2->3 -> dropped.
    await flushQueue();
    await flushQueue();
    await flushQueue();
    const arr = JSON.parse(await AsyncStorage.getItem('@volyume_off_writeback_queue_v1'));
    expect(arr).toHaveLength(0);
  });
});
