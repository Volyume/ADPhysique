import {
  CATEGORY,
  CHANNEL,
  CATEGORY_CHANNELS,
  isPushCategory,
  categoryForDataType,
} from '../notifications/categories';

describe('CATEGORY enum + channel map are consistent', () => {
  test('every category has an entry in CATEGORY_CHANNELS', () => {
    const missing = Object.values(CATEGORY).filter((c) => !CATEGORY_CHANNELS[c]);
    expect(missing).toEqual([]);
  });

  test('every channel entry uses known channels', () => {
    const known = new Set(Object.values(CHANNEL));
    for (const [cat, channels] of Object.entries(CATEGORY_CHANNELS)) {
      for (const ch of channels) {
        expect(known.has(ch)).toBe(true);
      }
      expect(channels.length).toBeGreaterThan(0);
      // Avoid an unused-variable lint complaint without affecting the assertion semantics.
      expect(cat).toEqual(expect.any(String));
    }
  });
});

describe('isPushCategory', () => {
  test('returns true for push categories', () => {
    expect(isPushCategory(CATEGORY.DAILY_CHECKIN_REMINDER)).toBe(true);
    expect(isPushCategory(CATEGORY.WEEKLY_CHECKIN_REMINDER)).toBe(true);
    expect(isPushCategory(CATEGORY.CASCADE_GATE)).toBe(true);
    expect(isPushCategory(CATEGORY.MORNING_WEIGHT)).toBe(true);
  });

  test('returns false for in-app-only categories per locked policy', () => {
    // ED-pattern and FFM-floor and sync error are in-app-only by
    // policy. Push for those is the harm pattern.
    expect(isPushCategory(CATEGORY.ED_PATTERN_LOCKOUT)).toBe(false);
    expect(isPushCategory(CATEGORY.FFM_FLOOR_HOLD)).toBe(false);
    expect(isPushCategory(CATEGORY.SYNC_ERROR)).toBe(false);
  });

  test('returns false for email-only categories', () => {
    expect(isPushCategory(CATEGORY.COACH_TRIAL_ENDING)).toBe(false);
  });

  test('returns false for unknown categories', () => {
    expect(isPushCategory('made_up_category')).toBe(false);
  });
});

describe('categoryForDataType', () => {
  test('maps the runtime data.type strings used in scheduler.js', () => {
    expect(categoryForDataType('morning_weight')).toBe(CATEGORY.MORNING_WEIGHT);
    expect(categoryForDataType('weekly_checkin')).toBe(CATEGORY.WEEKLY_CHECKIN_REMINDER);
    expect(categoryForDataType('training_reminder')).toBe(CATEGORY.TRAINING_REMINDER);
    expect(categoryForDataType('year_of_lifts_unlock')).toBe(CATEGORY.YEAR_OF_LIFTS_UNLOCK);
  });

  test('returns null for unknown data.type values', () => {
    expect(categoryForDataType('something_unknown')).toBe(null);
    expect(categoryForDataType(null)).toBe(null);
    expect(categoryForDataType(undefined)).toBe(null);
  });
});
