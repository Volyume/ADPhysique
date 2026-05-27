/**
 * Tests + audit for the Sentry event scrubber.
 *
 * Locked patterns in PRIVACY_CONSENT_LOCKED.md lines 178-191:
 *
 *   - All numeric fields named `weight*`, `kcal*`, `protein*`, `carbs*`,
 *     `fat*`, `fibre*`, `bf_pct`, `body_fat*`, `ffm*`, `fm*`
 *   - All string fields containing `weight_log`, `food_entries`,
 *     `custom_foods`, `body_composition_log`
 *   - All photo file paths and binary payloads
 *   - All `ed_pattern_flags` references and signals_json
 *
 * The audit test at the end of this file asserts the scrubber catches
 * every column name we currently expect to be sensitive. If you add
 * a new sensitive column to the schema, add it to AUDIT_SENSITIVE_KEYS
 * here and the test forces you to update the scrubber to cover it.
 */

import {
  scrubEvent,
  scrubBreadcrumb,
  scrubObject,
  scrubValue,
  isSensitiveKey,
  SENSITIVE_KEY_PATTERNS,
  SENSITIVE_VALUE_SUBSTRINGS,
} from '../observability/sentryScrub';

// ────────────────────────────────────────────────────────────────────
// Locked-pattern checks (one per spec line)
// ────────────────────────────────────────────────────────────────────

describe('isSensitiveKey (locked patterns)', () => {
  test.each([
    'weight',
    'weightKg',
    'weight_kg',
    'bodyWeight',
    'body_weight',
    'bodyWeightKg',
  ])('weight* family: %s is sensitive', (k) => {
    expect(isSensitiveKey(k)).toBe(true);
  });

  test.each([
    'kcal',
    'kcal_100g',
    'kcal_target',
    'kcal_serving',
    'kcalAdjustment',
  ])('kcal* family: %s is sensitive', (k) => {
    expect(isSensitiveKey(k)).toBe(true);
  });

  test.each([
    'protein',
    'protein_g',
    'protein_100g',
    'proteinG',
    'proteins_100g',
  ])('protein* family: %s is sensitive', (k) => {
    expect(isSensitiveKey(k)).toBe(true);
  });

  test.each([
    'carbs',
    'carbs_g',
    'carbs_100g',
    'carbsG',
    'carbohydrates_100g',
  ])('carbs/carbohydrates family: %s is sensitive', (k) => {
    expect(isSensitiveKey(k)).toBe(true);
  });

  test.each([
    'fat_g',
    'fat_100g',
    'fat_value',
    'fat_target',
  ])('fat* family: %s is sensitive', (k) => {
    expect(isSensitiveKey(k)).toBe(true);
  });

  test.each([
    'fibre_g',
    'fibre_100g',
    'fiber_g',
    'fiber_100g',
  ])('fibre/fiber family: %s is sensitive', (k) => {
    expect(isSensitiveKey(k)).toBe(true);
  });

  test('bf_pct is sensitive', () => {
    expect(isSensitiveKey('bf_pct')).toBe(true);
  });

  test.each([
    'body_fat',
    'body_fat_percent',
    'bodyFatPercent',
  ])('body_fat* family: %s is sensitive', (k) => {
    expect(isSensitiveKey(k)).toBe(true);
  });

  test.each([
    'ffm',
    'ffm_kg',
    'ffm_floor_kcal',
  ])('ffm* family: %s is sensitive', (k) => {
    expect(isSensitiveKey(k)).toBe(true);
  });

  test('fm_kg is sensitive', () => {
    expect(isSensitiveKey('fm_kg')).toBe(true);
  });

  test.each([
    'signals',
    'signals_json',
    'ed_pattern_flags',
    'edPatternSignals',
  ])('ed-pattern family: %s is sensitive', (k) => {
    expect(isSensitiveKey(k)).toBe(true);
  });

  test.each([
    'email',
    'firstName',
    'lastName',
    'dateOfBirth',
    'date_of_birth',
    'phone',
    'phoneNumber',
    'address',
  ])('PII identifier: %s is sensitive', (k) => {
    expect(isSensitiveKey(k)).toBe(true);
  });

  test.each([
    'reps',
    'rir',
    'sessionId',
    'tier',
    'goalPhase',
    'app_version',
  ])('non-sensitive operational key: %s is NOT sensitive', (k) => {
    expect(isSensitiveKey(k)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────
// Object scrubbing
// ────────────────────────────────────────────────────────────────────

describe('scrubObject', () => {
  test('redacts top-level sensitive keys', () => {
    const r = scrubObject({
      email: 'a@b.com',
      tier: 'pro',
      weight_kg: 75.4,
      kcal_target: 2200,
      sessionId: 'abc',
    });
    expect(r.email).toBe('[redacted]');
    expect(r.weight_kg).toBe('[redacted]');
    expect(r.kcal_target).toBe('[redacted]');
    expect(r.tier).toBe('pro');
    expect(r.sessionId).toBe('abc');
  });

  test('recurses into nested objects', () => {
    const r = scrubObject({
      profile: {
        weightKg: 80,
        firstName: 'Allan',
        goalPhase: 'cut',
      },
    });
    expect(r.profile.weightKg).toBe('[redacted]');
    expect(r.profile.firstName).toBe('[redacted]');
    expect(r.profile.goalPhase).toBe('cut');
  });

  test('recurses into arrays', () => {
    const r = scrubObject({
      entries: [
        { food: 'oats', kcal: 380, protein_g: 13 },
        { food: 'milk', kcal: 60, protein_g: 3 },
      ],
    });
    expect(r.entries[0].food).toBe('oats');
    expect(r.entries[0].kcal).toBe('[redacted]');
    expect(r.entries[0].protein_g).toBe('[redacted]');
  });

  test('null values pass through as null (not redacted as string)', () => {
    const r = scrubObject({ weight_kg: null, kcal: null });
    expect(r.weight_kg).toBeNull();
    expect(r.kcal).toBeNull();
  });

  test('bounds recursion depth (no infinite loop on circular refs)', () => {
    const a = {};
    a.self = a;
    // Should not throw nor hang.
    expect(() => scrubObject(a)).not.toThrow();
  });
});

// ────────────────────────────────────────────────────────────────────
// String value scrubbing
// ────────────────────────────────────────────────────────────────────

describe('string-value scrubbing', () => {
  test.each(SENSITIVE_VALUE_SUBSTRINGS)(
    'string containing %s is redacted',
    (needle) => {
      const r = scrubValue(`SELECT * FROM ${needle} WHERE user_id = X`);
      expect(r).toBe('[redacted]');
    },
  );

  test('clean string passes through', () => {
    expect(scrubValue('normal log line')).toBe('normal log line');
  });

  test('photo file:// URI is redacted', () => {
    expect(scrubValue('file:///data/user/0/app.volyume/cache/photo123.jpg')).toBe('[redacted]');
  });

  test('photo content:// URI is redacted', () => {
    expect(scrubValue('content://media/external/images/media/123')).toBe('content://media/external/images/media/123');
    // Note: scheme alone doesn't match; needs the .ext. This is by
    // design, we don't want to redact every content URI, only ones
    // we can confirm are images.
    expect(scrubValue('content://com.app/files/img.heic')).toBe('[redacted]');
  });

  test('base64-encoded image data is redacted', () => {
    expect(scrubValue('data:image/png;base64,iVBORw0KGgoAAAA…')).toBe('[redacted]');
  });

  test('numbers pass through (only keys can redact a numeric value)', () => {
    expect(scrubValue(75.4)).toBe(75.4);
    expect(scrubValue(0)).toBe(0);
  });

  test('booleans pass through', () => {
    expect(scrubValue(true)).toBe(true);
    expect(scrubValue(false)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────
// Sentry event shape
// ────────────────────────────────────────────────────────────────────

describe('scrubEvent', () => {
  test('redacts extra, contexts, tags', () => {
    const event = {
      extra: { weight_kg: 80, scope: 'CoachOutput' },
      contexts: { profile: { kcal_target: 2200 } },
      tags: { tier: 'pro', email: 'a@b.com' },
    };
    const r = scrubEvent(event);
    expect(r.extra.weight_kg).toBe('[redacted]');
    expect(r.extra.scope).toBe('CoachOutput');
    expect(r.contexts.profile.kcal_target).toBe('[redacted]');
    expect(r.tags.tier).toBe('pro');
    expect(r.tags.email).toBe('[redacted]');
  });

  test('user identity keeps only id', () => {
    const event = {
      user: { id: 'abc-123', email: 'a@b.com', username: 'allan', ip: '1.2.3.4' },
    };
    const r = scrubEvent(event);
    expect(r.user).toEqual({ id: 'abc-123' });
  });

  test('user with no id becomes empty object', () => {
    const event = { user: { email: 'a@b.com' } };
    const r = scrubEvent(event);
    expect(r.user).toEqual({});
  });

  test('breadcrumbs nested in event are also scrubbed', () => {
    const event = {
      breadcrumbs: [
        { message: 'SELECT * FROM food_entries', data: { weight_kg: 70 } },
        { message: 'OK', data: { sessionId: 'xyz' } },
      ],
    };
    const r = scrubEvent(event);
    expect(r.breadcrumbs[0].message).toBe('[redacted]');
    expect(r.breadcrumbs[0].data.weight_kg).toBe('[redacted]');
    expect(r.breadcrumbs[1].message).toBe('OK');
    expect(r.breadcrumbs[1].data.sessionId).toBe('xyz');
  });

  test('exception value scrubbed for sensitive table names', () => {
    const event = {
      exception: {
        values: [
          { type: 'Error', value: 'duplicate key on food_entries.id' },
        ],
      },
    };
    const r = scrubEvent(event);
    expect(r.exception.values[0].value).toBe('[redacted]');
    expect(r.exception.values[0].type).toBe('Error');
  });

  test('non-object event returned unchanged', () => {
    expect(scrubEvent(null)).toBeNull();
    expect(scrubEvent(undefined)).toBeUndefined();
  });
});

describe('scrubBreadcrumb', () => {
  test('redacts sensitive data keys', () => {
    const r = scrubBreadcrumb({
      message: 'sync complete',
      data: { kcal: 2200, sessionId: 'abc' },
    });
    expect(r.data.kcal).toBe('[redacted]');
    expect(r.data.sessionId).toBe('abc');
  });

  test('redacts message containing sensitive table name', () => {
    const r = scrubBreadcrumb({
      message: 'UPDATE custom_foods SET name = X',
      data: null,
    });
    expect(r.message).toBe('[redacted]');
  });
});

// ────────────────────────────────────────────────────────────────────
// Schema audit (quarterly per locked spec)
// ────────────────────────────────────────────────────────────────────
// If a new sensitive column lands in the DB, add it here. The test
// forces the scrub patterns to keep up with the schema.

const AUDIT_SENSITIVE_KEYS = [
  // food_entries
  'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fibre_g', 'quantity_g',
  // foods / custom_foods
  'kcal_100g', 'protein_100g', 'carbs_100g', 'fat_100g', 'fibre_100g',
  'sodium_100g', 'sugar_100g',
  // morning_weights / body_composition_log
  'weight_kg', 'body_fat_pct', 'ffm_kg', 'fm_kg',
  // nutrition_targets
  'kcal_target', 'protein_g_target',
  // engine / ed-pattern
  'signals_json', 'ed_pattern_flags',
  // user_body_profile
  'bodyFatPercent', 'body_fat_percent',
  // users_profile PII
  'email', 'firstName', 'lastName', 'dateOfBirth', 'phone',
];

describe('schema audit: every locked-sensitive column must match a scrub pattern', () => {
  test.each(AUDIT_SENSITIVE_KEYS)('%s is caught by the scrub pattern set', (key) => {
    if (!isSensitiveKey(key)) {
      throw new Error(
        `[scrub audit] Column "${key}" lands in the database but is NOT redacted by SENSITIVE_KEY_PATTERNS in src/lib/observability/sentryScrub.js. Add a pattern that matches it, or remove this key from AUDIT_SENSITIVE_KEYS if you genuinely intend it to ship to Sentry unredacted.`,
      );
    }
    expect(isSensitiveKey(key)).toBe(true);
  });

  test('patterns export is immutable', () => {
    expect(Object.isFrozen(SENSITIVE_KEY_PATTERNS)).toBe(true);
    expect(Object.isFrozen(SENSITIVE_VALUE_SUBSTRINGS)).toBe(true);
  });
});
