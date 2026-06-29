/**
 * Background GPS for live workouts — the WHOOP-parity path.
 *
 * WHOOP collects GPS on the PHONE (the strap has none) via a foreground service
 * typed `connectedDevice|location` (confirmed in its AndroidManifest), so a walk
 * or run keeps tracking distance/route with the phone pocketed and the screen
 * off. We replicate that with expo-location's background updates + foreground
 * service (Android) and the `location` background mode (iOS).
 *
 * The TaskManager task runs in the app's JS runtime, which the foreground
 * service keeps alive for the duration of the activity. Distance/route are
 * accumulated in module-level state and pushed to a listener registered by the
 * caller; if the OS ever tears the runtime down mid-activity the foreground
 * service is specifically there to prevent that.
 *
 * Falls back to a foreground-only watch (sensors/location) when background
 * permission isn't granted, so recording still works — just not pocketed.
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { GeoPoint, LocUpdate, haversine, LocationTracker } from './location';

const TASK_NAME = 'volyume-pulse-location';
const MAX_JUMP_M = 250; // ignore GPS teleports between fixes

// Module-level accumulators for the active background activity.
let last: GeoPoint | null = null;
let total = 0;
let route: GeoPoint[] = [];
let listener: ((u: LocUpdate) => void) | null = null;
let fallback: LocationTracker | null = null;

function ingest(loc: Location.LocationObject): void {
  const p: GeoPoint = {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    ts: loc.timestamp,
    alt: loc.coords.altitude ?? null,
  };
  if (last) {
    const d = haversine(last, p);
    if (d < MAX_JUMP_M) total += d;
  }
  last = p;
  route.push(p);
  listener?.({ distanceM: total, speedMps: loc.coords.speed ?? null, point: p });
}

// Define the background task once, at module load (required by TaskManager).
TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) return;
  const locs = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  if (!locs) return;
  for (const loc of locs) ingest(loc);
});

/** Start GPS for the active workout. Returns true if any tracking began. */
export async function startBgLocation(onUpdate: (u: LocUpdate) => void): Promise<boolean> {
  listener = onUpdate;
  last = null;
  total = 0;
  route = [];

  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;

  // Try the background foreground-service path first (pocketed / screen-off).
  let bg = { status: fg.status } as { status: Location.PermissionStatus };
  try {
    bg = await Location.requestBackgroundPermissionsAsync();
  } catch {
    // Some devices reject the background request outright — fall back below.
  }

  if (bg.status === 'granted') {
    try {
      const already = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
      if (already) await Location.stopLocationUpdatesAsync(TASK_NAME).catch(() => {});
      await Location.startLocationUpdatesAsync(TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 2000,
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.Fitness,
        foregroundService: {
          notificationTitle: 'VOLYUME Pulse — recording',
          notificationBody: 'Tracking your route, pace and heart rate',
          notificationColor: '#F59E0B',
        },
      });
      return true;
    } catch {
      // Fall through to foreground-only.
    }
  }

  // Foreground-only fallback (no persistent service): still records while open.
  fallback = new LocationTracker();
  return fallback.start(onUpdate);
}

/** Stop GPS and return the total distance + route for the finished activity. */
export async function stopBgLocation(): Promise<{ distanceM: number; route: GeoPoint[] }> {
  if (fallback) {
    const r = fallback.stop();
    fallback = null;
    listener = null;
    return r;
  }
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (registered) await Location.stopLocationUpdatesAsync(TASK_NAME);
  } catch {
    // Already stopped.
  }
  const result = { distanceM: total, route };
  listener = null;
  last = null;
  return result;
}
