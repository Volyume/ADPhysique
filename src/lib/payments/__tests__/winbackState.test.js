/**
 * winbackState tests (COMP-025-A §4c/§4d).
 *
 * Covers the two single-shot guarantees (one win-back per episode; one per
 * 180 days across episodes), episode idempotency, the stated-return timing,
 * and the safe defaults.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getEpisode, openEpisode, markReasonCaptured, markWinbackLaid, getLastFiredAt,
  clearEpisode, setStatedReturn, getStatedReturn,
  shouldShowPostLapseSheet, markLapseSheetShown,
  winbackFireDate, canLayWinback,
  WINBACK_FLOOR_MS, DEFAULT_WINBACK_DELAY_DAYS, STATED_RETURN_DELAY_DAYS,
} from '../winbackState';

const DAY_MS = 86400000;

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('winbackFireDate (pure)', () => {
  test('defaults to +30 days from lapse', () => {
    const lapse = 1_000_000_000_000;
    expect(winbackFireDate(lapse).getTime()).toBe(lapse + DEFAULT_WINBACK_DELAY_DAYS * DAY_MS);
  });

  test('honours a stated return window', () => {
    const lapse = 1_000_000_000_000;
    expect(winbackFireDate(lapse, 'in_a_month').getTime()).toBe(lapse + 30 * DAY_MS);
    expect(winbackFireDate(lapse, 'two_three_months').getTime()).toBe(lapse + 75 * DAY_MS);
    expect(winbackFireDate(lapse, 'not_sure').getTime()).toBe(lapse + 60 * DAY_MS);
  });

  test('unknown stated return falls back to the default', () => {
    const lapse = 1_000_000_000_000;
    expect(winbackFireDate(lapse, 'garbage').getTime()).toBe(lapse + 30 * DAY_MS);
  });
});

describe('canLayWinback (pure)', () => {
  const episode = { lapseAt: 0, reasonCaptured: false, winbackLaid: false };

  test('false with no episode', () => {
    expect(canLayWinback({ episode: null, lastFiredAt: null })).toBe(false);
  });

  test('false once the episode win-back is laid', () => {
    expect(canLayWinback({ episode: { ...episode, winbackLaid: true }, lastFiredAt: null })).toBe(false);
  });

  test('false inside the 180-day cross-episode floor', () => {
    const now = 10 * WINBACK_FLOOR_MS;
    expect(canLayWinback({ episode, lastFiredAt: now - (WINBACK_FLOOR_MS - DAY_MS), now })).toBe(false);
  });

  test('true once the floor has cleared', () => {
    const now = 10 * WINBACK_FLOOR_MS;
    expect(canLayWinback({ episode, lastFiredAt: now - (WINBACK_FLOOR_MS + DAY_MS), now })).toBe(true);
  });

  test('true with an open episode and no prior fire', () => {
    expect(canLayWinback({ episode, lastFiredAt: null })).toBe(true);
  });
});

describe('episode lifecycle', () => {
  test('openEpisode creates once and is idempotent on a re-detected lapse', async () => {
    const first = await openEpisode(5000);
    expect(first.opened).toBe(true);
    expect(first.episode.lapseAt).toBe(5000);

    const second = await openEpisode(9999);
    expect(second.opened).toBe(false);
    expect(second.episode.lapseAt).toBe(5000); // preserved, not overwritten
  });

  test('markReasonCaptured flips the episode flag', async () => {
    await openEpisode(1);
    await markReasonCaptured();
    expect((await getEpisode()).reasonCaptured).toBe(true);
  });

  test('markWinbackLaid sets the episode flag AND the cross-episode floor', async () => {
    await openEpisode(1);
    await markWinbackLaid(777);
    expect((await getEpisode()).winbackLaid).toBe(true);
    expect(await getLastFiredAt()).toBe(777);
  });

  test('clearEpisode wipes the episode + stated return but keeps the 180-day floor', async () => {
    await openEpisode(1);
    await setStatedReturn('in_a_month');
    await markWinbackLaid(777);
    await clearEpisode();
    expect(await getEpisode()).toBeNull();
    expect(await getStatedReturn()).toBeNull();
    expect(await getLastFiredAt()).toBe(777); // floor survives across episodes
  });

  test('end-to-end single-shot: a second episode within 180 days cannot lay', async () => {
    await openEpisode(1);
    await markWinbackLaid(1000);
    await clearEpisode();
    // New churn shortly after.
    const { episode } = await openEpisode(2000);
    const lastFired = await getLastFiredAt();
    expect(canLayWinback({ episode, lastFiredAt: lastFired, now: 1000 + DAY_MS })).toBe(false);
    // ...but allowed once the floor clears.
    expect(canLayWinback({ episode, lastFiredAt: lastFired, now: 1000 + WINBACK_FLOOR_MS + DAY_MS })).toBe(true);
  });
});

describe('post-lapse sheet (one-time per episode)', () => {
  test('not shown with no episode', async () => {
    expect(await shouldShowPostLapseSheet()).toBe(false);
  });

  test('shown once, then suppressed after markLapseSheetShown', async () => {
    await openEpisode(1);
    expect(await shouldShowPostLapseSheet()).toBe(true);
    await markLapseSheetShown();
    expect(await shouldShowPostLapseSheet()).toBe(false);
    expect((await getEpisode()).lapseSheetShown).toBe(true);
  });
});

describe('stated return', () => {
  test('round-trips a valid key', async () => {
    await setStatedReturn('two_three_months');
    expect(await getStatedReturn()).toBe('two_three_months');
  });

  test('rejects an invalid key (writes nothing)', async () => {
    await setStatedReturn('nope');
    expect(await getStatedReturn()).toBeNull();
  });

  test('every stated-return key has a delay mapping', () => {
    for (const k of Object.keys(STATED_RETURN_DELAY_DAYS)) {
      expect(typeof STATED_RETURN_DELAY_DAYS[k]).toBe('number');
    }
  });
});
