/**
 * homeReload.test: when Home re-reads on returning to the foreground.
 *
 * Written to FAIL on the old screen, which had no foreground check at all: a
 * phone left overnight came back to yesterday's weigh-in and never asked for
 * today's (founder report "not refresh right or not take the weight or ask
 * for it"). Pins: a changed local day reloads, data older than five minutes
 * reloads, fresh same-day data does not, and a never-loaded screen does not
 * (the focus effect owns the first load).
 */
import { shouldReloadHomeOnResume, RELOAD_AFTER_MS } from '../homeReload';

const T0 = new Date(2026, 9, 16, 22, 0).getTime();

describe('shouldReloadHomeOnResume', () => {
  test('the local day changed overnight: reload', () => {
    expect(shouldReloadHomeOnResume({
      loadedDayKey: '2026-10-16', lastLoadAt: T0, todayKey: '2026-10-17', now: T0 + 1000,
    })).toBe(true);
  });
  test('same day, more than five minutes old: reload', () => {
    expect(shouldReloadHomeOnResume({
      loadedDayKey: '2026-10-16', lastLoadAt: T0, todayKey: '2026-10-16', now: T0 + RELOAD_AFTER_MS + 1,
    })).toBe(true);
  });
  test('same day, fresh: no reload', () => {
    expect(shouldReloadHomeOnResume({
      loadedDayKey: '2026-10-16', lastLoadAt: T0, todayKey: '2026-10-16', now: T0 + RELOAD_AFTER_MS - 1,
    })).toBe(false);
  });
  test('never loaded: no reload from here', () => {
    expect(shouldReloadHomeOnResume({
      loadedDayKey: null, lastLoadAt: null, todayKey: '2026-10-17', now: T0,
    })).toBe(false);
  });
});
