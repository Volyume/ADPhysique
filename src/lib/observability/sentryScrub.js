/**
 * Sentry event + breadcrumb scrubber.
 *
 * Locked in PRIVACY_CONSENT_LOCKED.md lines 178-191:
 *
 *   Before any event leaves the device, the Sentry `beforeSend` hook
 *   removes:
 *
 *   - All numeric fields named `weight*`, `kcal*`, `protein*`, `carbs*`,
 *     `fat*`, `fibre*`, `bf_pct`, `body_fat*`, `ffm*`, `fm*`
 *   - All string fields containing `weight_log`, `food_entries`,
 *     `custom_foods`, `body_composition_log`
 *   - All photo file paths and binary payloads
 *   - All `ed_pattern_flags` references and signals_json
 *
 * Quarterly audit (also locked): a CI test asserts the scrub rules
 * still match the schema. If a new field is added that matches a
 * sensitive pattern, the audit fails until the scrub list is updated.
 *
 * This module is the single source of truth. `src/lib/sentry.js`
 * imports `scrubEvent` and `scrubBreadcrumb` from here. Tests in
 * `src/lib/__tests__/sentryScrub.test.js` cover every locked pattern.
 *
 * Performance: scrubbing runs in Sentry's `beforeSend` hook, which
 * fires once per event (rare). Recursion bounded to depth 6 so a
 * pathological circular ref can't hang the hook.
 */

const MAX_DEPTH = 6;
const REDACTED = '[redacted]';

// ────────────────────────────────────────────────────────────────────
// Locked sensitive-key patterns
// Numeric fields whose name matches any of these regexes get redacted.
// ────────────────────────────────────────────────────────────────────

export const SENSITIVE_KEY_PATTERNS = Object.freeze([
  // Body composition + measurements
  /^weight/i,
  /^body[._-]?weight/i,
  /^bf[._-]?pct$/i,
  /^body[._-]?fat/i,
  /^ffm/i,
  /^fm[._-]?kg/i,
  /^height/i,

  // Macros (covers _g, _100g, _serving, _value, _target variants)
  /^kcal/i,
  /^protein/i,
  /^carbs?/i,
  /^carbohydrates?/i,
  /^fat[._-]?g$/i,
  /^fat[._-]?100g$/i,
  /^fat[._-]?value$/i,
  /^fat[._-]?serving$/i,
  /^fat[._-]?target$/i,
  /^fibre/i,
  /^fiber/i,
  /^sodium/i,
  /^sugar/i,
  /^quantity[._-]?g/i,        // food_entries.quantity_g, dietary intake
  /^serving[._-]?g/i,         // foods.serving_g

  // PII identifiers
  /^email$/i,
  /^firstName$/i,
  /^first[._-]?name$/i,
  /^lastName$/i,
  /^last[._-]?name$/i,
  /^fullName$/i,
  /^full[._-]?name$/i,
  /^dateOfBirth$/i,
  /^date[._-]?of[._-]?birth$/i,
  /^birthDate$/i,
  /^birth[._-]?date$/i,
  /^dob$/i,
  /^phone/i,
  /^address/i,

  // Body measurements (existing locked list)
  /^waist/i,
  /^chest/i,
  /^hips?/i,
  /^thigh/i,
  /^quads?$/i,
  /^ham/i,
  /^hamstring/i,
  /^calf/i,
  /^calves$/i,
  /^arm[._-]?cm$/i,
  /^arms$/i,
  /^shoulders?/i,
  /^forearm/i,

  // ED-pattern surface, entire payload is sensitive
  /^signals[._-]?json$/i,
  /^signals$/i,
  /^ed[._-]?pattern/i,
]);

// ────────────────────────────────────────────────────────────────────
// Sensitive value patterns
// Strings whose VALUE contains any of these substrings get redacted.
// Catches free-text breadcrumbs and SQL fragments that name protected
// tables.
// ────────────────────────────────────────────────────────────────────

export const SENSITIVE_VALUE_SUBSTRINGS = Object.freeze([
  'weight_log',
  'food_entries',
  'custom_foods',
  'body_composition_log',
  'daily_intake_rollups',
  'ed_pattern_flags',
  'health_data_consent',
  'progress_photo_meta',
  'progress_scan_sessions',
  'progress_scan_assets',
  'progress_photos/',
]);

// ────────────────────────────────────────────────────────────────────
// Photo paths + binary payloads
// ────────────────────────────────────────────────────────────────────

const PHOTO_PATH_RE = /\b(file:\/\/|content:\/\/|\/storage\/|\/data\/user)[\w./%@\-:?#&=]*\.(jpe?g|png|webp|heic|heif|gif)\b/i;
const BASE64_IMAGE_RE = /^data:image\/[a-z]+;base64,/i;

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

/**
 * Decide whether a given key should be redacted based on the locked
 * patterns. Exported so the audit test can drive it directly.
 */
export function isSensitiveKey(key) {
  if (typeof key !== 'string' || !key) return false;
  return SENSITIVE_KEY_PATTERNS.some(re => re.test(key));
}

/**
 * Scrub a value:
 *   - Strings: redact if they match a photo path / base64 image, or
 *     embed a sensitive table name.
 *   - Numbers/booleans/null: pass through (nullable: redact happens
 *     at the key level via isSensitiveKey).
 *   - Objects/arrays: recurse, redact sensitive keys, scrub values.
 */
export function scrubValue(value, depth = 0) {
  if (value == null) return value;
  if (depth > MAX_DEPTH) return REDACTED;
  if (typeof value === 'string') return _scrubString(value);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(v => scrubValue(v, depth + 1));
  return scrubObject(value, depth);
}

export function scrubObject(obj, depth = 0) {
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  if (depth > MAX_DEPTH) return { [REDACTED]: true };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isSensitiveKey(k)) {
      out[k] = v == null ? null : REDACTED;
    } else {
      out[k] = scrubValue(v, depth + 1);
    }
  }
  return out;
}

function _scrubString(s) {
  if (typeof s !== 'string') return s;
  if (BASE64_IMAGE_RE.test(s)) return REDACTED;
  if (PHOTO_PATH_RE.test(s)) return REDACTED;
  // Sensitive table name embedded in the string. The whole string is
  // suspect (it likely carries row data or SQL), so redact wholesale.
  for (const needle of SENSITIVE_VALUE_SUBSTRINGS) {
    if (s.indexOf(needle) !== -1) return REDACTED;
  }
  return s;
}

/**
 * Sentry `beforeSend` entry point. Mutates the event in place AND
 * returns it (Sentry expects the returned value). Wrapped in
 * try/catch by the caller so a scrubber bug can never block an
 * outbound event entirely.
 */
export function scrubEvent(event) {
  if (!event || typeof event !== 'object') return event;

  if (event.extra) event.extra = scrubObject(event.extra);
  if (event.contexts) event.contexts = scrubObject(event.contexts);
  if (event.tags) event.tags = scrubObject(event.tags);
  if (event.request?.data) event.request.data = scrubObject(event.request.data);

  // User identity: keep `id` only (low-risk opaque uuid). Drop email,
  // username, ip, anything else Sentry attached automatically.
  if (event.user) {
    event.user = event.user.id ? { id: event.user.id } : {};
  }

  // Message + exception values are free-text; scan them for sensitive
  // substrings (table names) and redact if found.
  if (typeof event.message === 'string') {
    event.message = _scrubString(event.message);
  }
  if (event.exception?.values && Array.isArray(event.exception.values)) {
    event.exception.values = event.exception.values.map(v => ({
      ...v,
      value: typeof v?.value === 'string' ? _scrubString(v.value) : v?.value,
    }));
  }

  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  }

  return event;
}

/**
 * Sentry `beforeBreadcrumb` entry point. Same contract as scrubEvent.
 */
export function scrubBreadcrumb(crumb) {
  if (!crumb || typeof crumb !== 'object') return crumb;
  const out = { ...crumb };
  if (crumb.data) out.data = scrubObject(crumb.data);
  if (typeof crumb.message === 'string') out.message = _scrubString(crumb.message);
  return out;
}
