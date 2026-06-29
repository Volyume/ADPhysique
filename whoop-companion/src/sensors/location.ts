/**
 * Phone GPS tracking for outdoor workouts (WHOOP 5.0 has no GPS — the phone is
 * the source, exactly as the WHOOP app does it). Foreground tracking while the
 * activity screen is open: distance via the haversine sum of fixes, plus pace.
 */

import * as Location from 'expo-location';

export type GeoPoint = { lat: number; lng: number; ts: number; alt: number | null };
export type LocUpdate = { distanceM: number; speedMps: number | null; point: GeoPoint };

const EARTH_R = 6371000;
const MAX_JUMP_M = 250; // ignore GPS teleports between fixes

function haversine(a: GeoPoint, b: GeoPoint): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export class LocationTracker {
  private sub: Location.LocationSubscription | null = null;
  private last: GeoPoint | null = null;
  private total = 0;
  route: GeoPoint[] = [];

  async start(onUpdate: (u: LocUpdate) => void): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return false;
      this.sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 2000 },
        (loc) => {
          const p: GeoPoint = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            ts: loc.timestamp,
            alt: loc.coords.altitude ?? null,
          };
          if (this.last) {
            const d = haversine(this.last, p);
            if (d < MAX_JUMP_M) this.total += d;
          }
          this.last = p;
          this.route.push(p);
          onUpdate({ distanceM: this.total, speedMps: loc.coords.speed ?? null, point: p });
        },
      );
      return true;
    } catch {
      return false;
    }
  }

  stop(): { distanceM: number; route: GeoPoint[] } {
    this.sub?.remove();
    this.sub = null;
    return { distanceM: this.total, route: this.route };
  }

  get distanceM(): number {
    return this.total;
  }
}

/** Format metres as km (or m under 1 km). */
export function formatDistance(m: number | null): string {
  if (m == null) return '—';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

/** Pace in min/km from distance (m) and elapsed (s). */
export function formatPace(distanceM: number, elapsedSec: number): string {
  if (distanceM < 20 || elapsedSec < 5) return '—';
  const secPerKm = elapsedSec / (distanceM / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}
