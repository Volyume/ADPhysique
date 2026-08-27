/**
 * nativeSafe.js
 *
 * Shared primitives for values crossing the JavaScript to native boundary.
 *
 * WHY THIS EXISTS. VOLYUME-1K was a hard iOS crash, EXC_BREAKPOINT on a
 * background dispatch queue, with no error screen and no incident code,
 * because an Invalid Date reached expo-notifications and Swift's Int(Double)
 * traps on NaN. JavaScript tolerates NaN, Infinity and Invalid Date happily
 * and carries them a long way before anything notices; Swift, Kotlin and C++
 * do not. Every such boundary is therefore a place where a value we shrugged
 * at becomes a process kill that no try/catch, ErrorBoundary or ScreenBoundary
 * can contain.
 *
 * WHAT THIS IS NOT. It is deliberately not one big validate() that every call
 * site pipes through. That would hide the domain rule, which is the part worth
 * reading: a rest timer's duration, a photo's date and a chart's bar height are
 * not interchangeable just because all three are numbers. These are narrow,
 * named primitives; the caller still states its own range, its own fallback and
 * its own decision about what to do when a value is refused.
 *
 * THE ONE RULE WORTH REMEMBERING. Number.isFinite is not sufficient on its own
 * for anything date-shaped. Number.isFinite(1e300) is true, and new Date(1e300)
 * is an Invalid Date whose getTime() is NaN. Several guards in this codebase
 * checked only isFinite and were still reaching native with an Invalid Date.
 */

/** Widest instant a JS Date can represent (ECMA-262 time-clip range). */
export const MAX_TIME_VALUE = 8.64e15;

/**
 * A finite number, or the fallback.
 *
 * Rejects NaN, Infinity, -Infinity, null, undefined, objects and numeric
 * strings. Strings are refused deliberately: a string arriving here means a
 * parse happened somewhere it should not have, and silently coercing it hides
 * that.
 */
export function safeFiniteNumber(value, fallback = null) {
  return (typeof value === 'number' && Number.isFinite(value)) ? value : fallback;
}

/**
 * An epoch-millisecond instant that a JS Date can actually represent, or null.
 *
 * Use this for ANY timestamp handed to native: notification triggers, Live
 * Activity end times, date pickers, widget snapshots. `null` means "do not send
 * this to native", never "send zero".
 */
export function safeEpochMs(value) {
  const n = safeFiniteNumber(value);
  if (n === null) return null;
  return Math.abs(n) <= MAX_TIME_VALUE ? n : null;
}

/**
 * A Date that is guaranteed valid, or null.
 *
 * Accepts a Date, epoch ms, or an ISO string. The returned Date is safe to hand
 * to a native picker or a trigger; null means the caller must not.
 */
export function safeDate(value) {
  if (value instanceof Date) return safeEpochMs(value.getTime()) === null ? null : value;
  if (typeof value === 'string') {
    // Only an unambiguous ISO-8601 date or date-time is accepted. Date.parse is
    // far looser than it looks: Date.parse('42') yields a real instant (year
    // 2042 in V8), so a loose string that meant nothing of the kind would sail
    // through and become a stored timestamp. Anything else is a parse that
    // should have happened explicitly at the call site.
    if (!/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(value)) {
      return null;
    }
    const ms = safeEpochMs(Date.parse(value));
    return ms === null ? null : new Date(ms);
  }
  const ms = safeEpochMs(value);
  return ms === null ? null : new Date(ms);
}

/**
 * A strictly positive, finite dimension, or the fallback.
 *
 * Negative and zero dimensions are refused as well as non-finite ones: a
 * zero-width layout is legal in JS and an allocation failure in native
 * image/graphics code, and a negative one is a crash in most of it.
 */
export function safePositiveDimension(value, fallback = null, { max = 1e6 } = {}) {
  const n = safeFiniteNumber(value);
  if (n === null || n <= 0 || n > max) return fallback;
  return n;
}

/**
 * An integer inside an inclusive range, or the fallback.
 *
 * Bounds matter at the Android boundary in particular, where a JS number wider
 * than a Java int or long does not narrow, it throws.
 */
export function safeIntInRange(value, min, max, fallback = null) {
  const n = safeFiniteNumber(value);
  if (n === null) return fallback;
  const i = Math.trunc(n);
  return (i >= min && i <= max) ? i : fallback;
}

/** A value from a known set, or the fallback. Native enums do not forgive. */
export function safeEnum(value, allowed, fallback = null) {
  return Array.isArray(allowed) && allowed.includes(value) ? value : fallback;
}

/**
 * A duration in milliseconds that a timer can actually accept, or null.
 *
 * Zero and negative durations are refused: they fire immediately or throw
 * depending on the platform, and neither is what a caller asking for a timer
 * meant.
 */
export function safeDurationMs(value, { max = 24 * 60 * 60 * 1000 } = {}) {
  const n = safeFiniteNumber(value);
  if (n === null || n <= 0 || n > max) return null;
  return n;
}
