/**
 * trackFirst — emit an activation-funnel event at most once per (user, event),
 * durably across app runs (E7.2).
 *
 * Backed by AsyncStorage, which is device-local — the same scope a SQLite flag
 * would have, but with no schema migration. The server keeps raw rows, so a
 * dashboard derives the true first-ever per user as min(occurred_at); a rare
 * duplicate (e.g. a transient storage read failure, or a reinstall) is
 * therefore harmless, which is why the failure path deliberately emits rather
 * than swallow: a missing baseline data point is worse than a dedupable
 * duplicate. Never throws.
 *
 * Payloads stay counts/flags/small enums only, per the standing telemetry rule
 * (no food or training content, no weight, no steps).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
// Route through the engineTelemetry shim (not telemetry/index): it is the
// track() path every emitter uses and that test suites already mock, so
// trackFirst inherits the same no-op under test rather than dragging the real
// transport (and its recordEngineTelemetry DB call) into food/store suites.
import { track } from '../engineTelemetry';
import { logError } from '../errorLog';

const keyFor = (userId, event) => `@volyume_tfirst_${userId}_${event}`;

export async function trackFirst(userId, event, payload = null) {
  if (!userId || !event) return;
  const key = keyFor(userId, event);
  try {
    const seen = await AsyncStorage.getItem(key);
    if (seen) return;
    await AsyncStorage.setItem(key, String(Date.now()));
  } catch (e) {
    // Fall through to emit: a dropped baseline point is worse than a
    // dedupable duplicate (the server takes the earliest per user).
    logError('telemetry.trackFirst', e, { event });
  }
  track(userId, event, payload);
}
