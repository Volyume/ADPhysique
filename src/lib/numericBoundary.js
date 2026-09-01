// Epoch zero is retained for legacy/test fixtures and explicit sentinel rows;
// negative and post-2100 values are outside every app data contract.
export const MIN_PERSISTED_EPOCH_MS = 0;
export const MAX_PERSISTED_EPOCH_MS = Date.UTC(2100, 0, 1);

export function isStrictNumberInRange(value, min, max, { integer = false } = {}) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Math.abs(value) <= Number.MAX_SAFE_INTEGER
    && (!integer || Number.isInteger(value))
    && value >= min
    && value <= max;
}

export function isPersistedEpochMs(value, { nullable = false } = {}) {
  if (value == null) return nullable;
  return isStrictNumberInRange(value, MIN_PERSISTED_EPOCH_MS, MAX_PERSISTED_EPOCH_MS, { integer: true });
}

export function parseCloudEpochMs(value, { fallback, nullable = false } = {}) {
  if (value == null) return nullable ? null : fallback;
  let parsed = null;
  if (typeof value === 'number') parsed = value;
  // Supabase timestamps are ISO-8601 instants. Date.parse also accepts
  // surprising numeric/date-like strings (for example "0" as a year), so
  // require the wire shape before allowing its result near SQLite.
  else if (typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value.trim())) {
    parsed = Date.parse(value);
  }
  return isPersistedEpochMs(parsed, { nullable: false }) ? parsed : undefined;
}

export function isLocalDayKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function isBoundedString(value, maxLength = 500, { nullable = false } = {}) {
  if (value == null) return nullable;
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}
