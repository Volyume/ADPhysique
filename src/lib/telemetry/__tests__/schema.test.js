/**
 * The telemetry catalogue's own rules (growth brief 2026-10-19). Pins:
 *  - every event is named, grouped and described, once;
 *  - numbers only ever leave the device as bucket labels, with the edges as
 *    documented, and anything that is not a non-negative number is no bucket;
 *  - a payload keeps only declared fields with valid values: no free text, no
 *    raw numbers, nothing the schema was not told about;
 *  - only performance, failure and lifecycle events may leave before Article
 *    9 consent (founder decision 4: consent cannot be bypassed);
 *  - no field is named like a health value or a person's identity.
 */
import {
  BUCKETS, toBucket, EVENT_SCHEMAS, SCHEMA_BY_NAME, SIGNALS, LEGACY_PRE_CONSENT,
  allowedBeforeConsent, sanitisePayload,
} from '../schema';

describe('catalogue shape', () => {
  it('every event has a unique snake_case name, an area, a known signal and a description', () => {
    const names = EVENT_SCHEMAS.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
    EVENT_SCHEMAS.forEach((e) => {
      expect(e.name).toMatch(/^[a-z][a-z0-9_]+$/);
      expect(typeof e.area).toBe('string');
      expect(SIGNALS).toContain(e.signal);
      expect(e.description.length).toBeGreaterThan(10);
      expect(SCHEMA_BY_NAME[e.name]).toBe(e);
    });
  });

  it('no field is named like a health value or an identity', () => {
    const banned = /weight|kcal|calor|body|food_name|name$|email|text|note|query$|handle|phone|address/i;
    EVENT_SCHEMAS.forEach((e) => {
      Object.keys(e.fields).forEach((f) => expect({ event: e.name, field: f, bad: banned.test(f) })
        .toEqual({ event: e.name, field: f, bad: false }));
    });
  });
});

describe('buckets', () => {
  it.each([
    ['ms', 249, '<250ms'], ['ms', 250, '250-500ms'], ['ms', 999, '500ms-1s'], ['ms', 10000, '10s+'],
    ['minutes', 0.5, '<1m'], ['minutes', 1, '1-5m'], ['minutes', 89.9, '60-90m'], ['minutes', 90, '90m+'],
    ['count', 0, '0'], ['count', 1, '1'], ['count', 3, '2-3'], ['count', 4, '4-6'], ['count', 10, '7-10'], ['count', 11, '11+'],
    ['dwell', 2999, '<3s'], ['dwell', 3000, '3-30s'], ['dwell', 600000, '10m+'],
    ['age', 0, '<1h'], ['age', 6, '6-24h'], ['age', 71, '1-3d'], ['age', 72, '3d+'],
  ])('%s %p is %s', (kind, n, label) => {
    expect(toBucket(kind, n)).toBe(label);
    expect(BUCKETS[kind].values).toContain(label);
  });

  it.each([[-1], [NaN], [Infinity], ['abc'], [null], [undefined], [''], [true]])('%p is no bucket', (n) => {
    Object.keys(BUCKETS).forEach((k) => expect(toBucket(k, n)).toBeNull());
  });

  it('an unknown kind is no bucket', () => {
    expect(toBucket('kg', 80)).toBeNull();
  });
});

describe('sanitisePayload', () => {
  it('keeps declared, valid fields and lists the rest', () => {
    const { payload, dropped } = sanitisePayload('workout_discarded', { sets: '2-3', duration: '5-15m', note: 'felt awful', sets_raw: 3 });
    expect(payload).toEqual({ sets: '2-3', duration: '5-15m' });
    expect(dropped.sort()).toEqual(['note', 'sets_raw']);
  });

  it('refuses a raw number where a bucket is declared', () => {
    expect(sanitisePayload('workout_discarded', { sets: 3 }).payload).toEqual({});
  });

  it('refuses an enum value it does not know', () => {
    expect(sanitisePayload('exercise_swapped', { scope: 'forever', cause: 'choice' }).payload).toEqual({ cause: 'choice' });
  });

  it('route fields take a route name only, never free text', () => {
    expect(sanitisePayload('screen_viewed', { screen: 'Home', from_screen: 'Diary' }).payload).toEqual({ screen: 'Home', from_screen: 'Diary' });
    ['home', 'My diary', 'Diary!', 'A'.repeat(50), 42].forEach((bad) => {
      expect(sanitisePayload('screen_viewed', { screen: bad }).payload).toEqual({});
    });
  });

  it('int fields hold whole numbers in range', () => {
    expect(sanitisePayload('checkin_abandoned', { step_reached: 3 }).payload).toEqual({ step_reached: 3 });
    [13, -1, 2.5, '3'].forEach((bad) => expect(sanitisePayload('checkin_abandoned', { step_reached: bad }).payload).toEqual({}));
  });

  it('bool fields hold booleans only', () => {
    expect(sanitisePayload('checkin_completed', { first: 'yes' }).payload).toEqual({});
    expect(sanitisePayload('checkin_completed', { first: false }).payload).toEqual({ first: false });
  });

  it('an event from before the catalogue passes through unchanged', () => {
    expect(sanitisePayload('workout_completed', { x: 1 })).toEqual({ payload: { x: 1 }, dropped: [] });
  });
});

describe('before consent', () => {
  it('only performance, failure and lifecycle events may leave before consent', () => {
    const pre = EVENT_SCHEMAS.filter((e) => e.preConsent).map((e) => e.name).sort();
    expect(pre).toEqual(['error_shown', 'screen_ready', 'screen_viewed', 'session_ended', 'setup_stage_stalled']);
    pre.forEach((n) => expect(allowedBeforeConsent(n)).toBe(true));
    LEGACY_PRE_CONSENT.forEach((n) => expect(allowedBeforeConsent(n)).toBe(true));
  });

  it.each(['food_search_empty', 'checkin_completed', 'workout_session_summary', 'archetype_chosen',
    'coach_recommendation_dismissed', 'exit_reason_given', 'workout_completed', 'some_unknown_event'])(
    '%s waits for consent', (n) => expect(allowedBeforeConsent(n)).toBe(false));
});
